import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const output = 'web/public/scenes/mansa-gold-procession';
const frames = '.playwright/gold-procession-capture';
await fs.mkdir(frames, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const errors = [],
  visited = new Set();
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1300 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(
    process.env.PROCESSION_PREVIEW || 'http://127.0.0.1:8130/index.html',
  );
  await page.waitForFunction(() => !!window.__procession, null, {
    timeout: 30000,
  });
  await page.evaluate(() => window.__procession.pause());
  for (let i = 0; i < 480; i++) {
    const result = await page.evaluate((frame) => {
      const player = window.__procession,
        state = player.setFrame(frame);
      return {
        pose: state.pose,
        jpg: player.canvas.toDataURL('image/jpeg', 0.93),
      };
    }, i / 2);
    visited.add(result.pose);
    await fs.writeFile(
      `${frames}/${String(i).padStart(4, '0')}.jpg`,
      Buffer.from(result.jpg.split(',')[1], 'base64'),
    );
    if (i === 0) {
      const png = await page.evaluate(() =>
        window.__procession.canvas.toDataURL('image/png'),
      );
      await fs.writeFile(
        output + '/poster.png',
        Buffer.from(png.split(',')[1], 'base64'),
      );
    }
    if (i % 120 === 119) console.log(`Captured ${i + 1}/480 frames.`);
  }
  if (errors.length || visited.size !== 12)
    throw Error(JSON.stringify({ errors, poses: [...visited] }));
} finally {
  await browser.close();
}
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-v',
    'error',
    '-framerate',
    '24',
    '-i',
    frames + '/%04d.jpg',
    '-frames:v',
    '480',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '23',
    '-maxrate',
    '4M',
    '-bufsize',
    '8M',
    '-refs',
    '8',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    output + '/mansa-gold-procession-animation.mp4',
  ],
  { stdio: 'inherit' },
);
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-v',
    'error',
    '-i',
    output + '/mansa-gold-procession-animation.mp4',
    '-filter_complex',
    'fps=12,scale=256:256:flags=neighbor,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    '-loop',
    '0',
    output + '/mansa-gold-procession-animation.gif',
  ],
  { stdio: 'inherit' },
);
await fs.writeFile(
  frames + '/capture.json',
  JSON.stringify(
    {
      videoFrames: 480,
      fps: 24,
      duration: 20,
      drawnPoses: visited.size,
      simulationTicks: 240,
      errors,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Captured the complete 20-second loop, with all twelve drawn poses.',
);
