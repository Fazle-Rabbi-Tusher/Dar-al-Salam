import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';

// Capture the native scene, including both alpha passes, every original mesh,
// authored support poses and deterministic world time. Requires the dev server.
const out = '.playwright/support-capture';
await fs.mkdir(out, { recursive: true });
await fs.mkdir('docs/previews', { recursive: true });
const shots = [
  { button: 'Football', name: 'clean-character-edges', start: 12, count: 72 },
  {
    button: 'Cricket',
    name: 'supporting-cricket-umpire',
    start: 36,
    count: 72,
  },
  { tile: [29, 26.5, 2.6], name: 'supporting-garden', start: 72, count: 72 },
  { button: 'Labs', name: 'clean-lab-characters', start: 48, count: 72 },
  {
    button: 'Podcast',
    name: 'supporting-podcast-operator',
    start: 100,
    count: 96,
  },
  { tile: [52.8, 102, 2.8], name: 'supporting-school', start: 60, count: 72 },
  {
    button: 'The dark room',
    name: 'supporting-optics-assistant',
    start: 24,
    count: 72,
  },
  { tile: [24, 75.5, 1.6], name: 'supporting-city', start: 0, count: 96 },
  { button: 'Boxing & MMA', name: 'supporting-coaches', start: 70, count: 72 },
  { button: 'Massawa', name: 'supporting-market', start: 80, count: 72 },
];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  reducedMotion: 'reduce',
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let index = 0;
try {
  await page.goto('http://localhost:5173/');
  await page
    .locator('.loading-screen')
    .waitFor({ state: 'detached', timeout: 60000 });
  if (await page.locator('.intro-dismiss').count())
    await page.locator('.intro-dismiss').click();
  for (const shot of shots) {
    if (shot.button)
      await page
        .getByRole('button', { name: shot.button, exact: true })
        .click();
    else
      await page.evaluate(([x, y, zoom]) => {
        window.__darEngine.flyTo(
          { x: 2048 + (x - y) * 16, y: 1460 + (x + y) * 8, zoom },
          600,
        );
      }, shot.tile);
    await page.waitForFunction(() => !window.__darEngine.flight);
    // Camera flights and simulation are paused during deterministic capture.
    // Close station controls for the wide chamber view, without changing art.
    await page.addStyleTag({
      content: '.dark-room-controls{visibility:hidden}',
    });
    for (let i = 0; i < shot.count; i++) {
      await page.evaluate(
        (t) => {
          const e = window.__darEngine;
          e.motion = false;
          e.elapsed = t / 12;
          e.frame = Math.floor(t);
          e.lastFrame = e.frame;
          e.dirty = false;
          e.update();
          for (const b of e.buildings) e.infrastructure.animate(b, t);
          e.app.render();
        },
        (shot.start + i / 2) % 240,
      );
      const path = `${out}/${String(index++).padStart(4, '0')}.jpg`;
      await page.screenshot({ path, type: 'jpeg', quality: 87 });
      if (i === 24) await fs.copyFile(path, `docs/previews/${shot.name}.jpg`);
    }
    console.log(`Captured ${shot.name}: ${shot.count} native frames.`);
  }
  if (errors.length) throw Error(errors.join('\n'));
} finally {
  await browser.close();
}
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    '24',
    '-i',
    `${out}/%04d.jpg`,
    '-frames:v',
    String(index),
    '-vf',
    'scale=1104:-2',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '24',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    'docs/previews/clean-characters-and-supporting-cast.mp4',
  ],
  { stdio: 'inherit' },
);
console.log(
  'Preview bytes:',
  (await fs.stat('docs/previews/clean-characters-and-supporting-cast.mp4'))
    .size,
);
