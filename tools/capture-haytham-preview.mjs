import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

// Capture authored animation inside the main renderer. Requires pnpm dev.
const out = '.playwright/haytham-capture';
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
const errors = [],
  visited = new Set(),
  shots = [];
page.on('pageerror', (e) => errors.push(e.message));
let index = 0;
try {
  await page.goto('http://localhost:5173/');
  await page
    .locator('.loading-screen')
    .waitFor({ state: 'detached', timeout: 60000 });
  if (await page.locator('.intro-dismiss').count())
    await page.locator('.intro-dismiss').click();
  for (const shot of [
    {
      button: 'The dark room',
      name: 'haytham-redesigned-optics',
      count: 240,
      close: true,
    },
    { button: 'The dark room', name: 'haytham-relocated-dark-room', count: 96 },
    { button: 'Podcast', name: 'podcast-beside-community', count: 480 },
  ]) {
    await page.getByRole('button', { name: shot.button, exact: true }).click();
    await page.waitForFunction(() => !window.__darEngine.flight);
    if (shot.close) {
      await page.locator('.dark-room-station select').selectOption('bench');
      await page.waitForFunction(() => !window.__darEngine.flight);
      await page.evaluate(() => {
        const e = window.__darEngine,
          c = e.getCamera();
        e.flyTo({ ...c, y: c.y - 26, zoom: 4.4 }, 600);
      });
      await page.waitForFunction(() => !window.__darEngine.flight);
    }
    await page.addStyleTag({
      content: '.dark-room-controls{visibility:hidden}',
    });
    for (let i = 0; i < shot.count; i++) {
      const pose = await page.evaluate((t) => {
        const e = window.__darEngine;
        e.motion = false;
        e.elapsed = t / 12;
        e.frame = Math.floor(t);
        e.lastFrame = e.frame;
        e.dirty = false;
        e.darkRoom.animate(e.frame);
        e.update();
        for (const b of e.buildings) e.infrastructure.animate(b, t);
        e.app.render();
        return e.live.get('ibn-al-haytham')?.frame;
      }, i / 2);
      if (shot.close) visited.add(pose);
      const file = `${out}/${String(index++).padStart(4, '0')}.jpg`;
      await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
      if (i === 36) await fs.copyFile(file, `docs/previews/${shot.name}.jpg`);
    }
    shots.push({
      name: shot.name,
      videoFrames: shot.count,
      camera: await page.evaluate(() => window.__darEngine.getCamera()),
    });
    console.log(`Captured ${shot.name}: ${shot.count} native frames.`);
  }
  if (errors.length) throw Error(errors.join('\n'));
  if (visited.size !== 40)
    throw Error(
      `Native renderer reached ${visited.size} scholar poses, expected 40.`,
    );
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
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    'docs/previews/haytham-redesign-and-scene-swap.mp4',
  ],
  { stdio: 'inherit' },
);
await fs.writeFile(
  `${out}/capture.json`,
  JSON.stringify(
    {
      fps: 24,
      worldTickRate: 12,
      scholarPoses: visited.size,
      frames: index,
      shots,
      errors,
    },
    null,
    2,
  ),
);
console.log(
  'Verified all 40 poses in the native renderer; preview bytes:',
  (await fs.stat('docs/previews/haytham-redesign-and-scene-swap.mp4')).size,
);
