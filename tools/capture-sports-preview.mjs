import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

// Capture the real native world renderer by deterministic half-tick stepping.
// This is not a sprite-sheet slideshow. A running dev server is required.
const out = '.playwright/sports-capture';
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
try {
  await page.goto('http://localhost:5173/');
  await page
    .locator('.loading-screen')
    .waitFor({ state: 'detached', timeout: 60000 });
  const basketballOnly = process.argv.includes('--basketball');
  let frame = basketballOnly ? 240 : 0;
  for (const [button, name, start] of [
    ['Cricket', 'cricket-stadium', 24],
    ['Basketball', 'basketball-court', 0],
  ]) {
    if (basketballOnly && button === 'Cricket') continue;
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.waitForFunction(
      () => window.__darEngine && !window.__darEngine.flight,
    );
    for (let i = 0; i < 240; i++) {
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
      await page.screenshot({
        path: `${out}/${String(frame++).padStart(4, '0')}.jpg`,
        type: 'jpeg',
        quality: 86,
      });
      if (i === 72)
        await sharp(`${out}/${String(frame - 1).padStart(4, '0')}.jpg`)
          .jpeg({ quality: 88 })
          .toFile(`docs/previews/${name}.jpg`);
    }
    console.log(`Captured ${name}, 240 native frames.`);
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
    '-vf',
    'scale=1104:-2',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '25',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    'docs/previews/sports-world-preview.mp4',
  ],
  { stdio: 'inherit' },
);
console.log(
  'Native sports preview:',
  (await fs.stat('docs/previews/sports-world-preview.mp4')).size,
  'bytes',
);
