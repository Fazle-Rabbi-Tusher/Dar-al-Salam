import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';

// Native render capture: all conversation turns, with the same simulation,
// meshes, authored poses and fractional equipment motion used by the website.
const out = '.playwright/podcast-capture';
await fs.mkdir(out, { recursive: true });
await fs.mkdir('docs/previews', { recursive: true });
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
  for (const [button, name, start, count] of [
    ['Cricket', 'cricket-turf', 36, 96],
    ['Football', 'football-goals', 20, 72],
    ['Podcast', 'podcast-studio', 0, 480],
  ]) {
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.waitForFunction(
      () => window.__darEngine && !window.__darEngine.flight,
    );
    for (let i = 0; i < count; i++) {
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
        (start + i / 2) % 240,
      );
      const path = `${out}/${String(index++).padStart(4, '0')}.jpg`;
      await page.screenshot({ path, type: 'jpeg', quality: 87 });
      if (i === 24) await fs.copyFile(path, `docs/previews/${name}.jpg`);
      if (button === 'Podcast' && i === 260)
        await fs.copyFile(path, 'docs/previews/podcast-mehdi-speaking.jpg');
    }
    console.log(`Captured ${name}: ${count} native frames.`);
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
    'docs/previews/stadiums-and-podcast-preview.mp4',
  ],
  { stdio: 'inherit' },
);
console.log(
  'Preview bytes:',
  (await fs.stat('docs/previews/stadiums-and-podcast-preview.mp4')).size,
);
