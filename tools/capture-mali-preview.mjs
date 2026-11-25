import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

// Record actual articulated GLBs and the native planet renderer. Requires Vite.
const base = process.env.PREVIEW_BASE || 'http://localhost:5173';
const out = '.playwright/mali-capture';
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
  shots = [];
page.on('pageerror', (e) => errors.push(e.message));
let index = 0;
async function record(name, frames, update) {
  for (let i = 0; i < frames; i++) {
    await update(i);
    const file = `${out}/${String(index++).padStart(4, '0')}.jpg`;
    // Capture the already-rendered GLB canvas directly. A browser compositor
    // screenshot waits for additional WebGL frames on software-rendered hosts.
    const canvas = await page.evaluate(
      () =>
        window.__maliViewer?.renderer.domElement.toDataURL(
          'image/jpeg',
          0.88,
        ) ?? null,
    );
    if (canvas)
      await fs.writeFile(file, Buffer.from(canvas.split(',')[1], 'base64'));
    else await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
    if (i === (name.endsWith('3d-standing') ? 0 : Math.min(24, frames - 1)))
      await fs.copyFile(file, `docs/previews/${name}.jpg`);
  }
  shots.push({ name, frames });
  console.log(`Captured ${name}: ${frames} rendered frames.`);
}
async function load(name) {
  await page.evaluate(async (name) => {
    const v = window.__maliViewer;
    v.pause();
    v.renderer.setAnimationLoop(null);
    await v.loadModel(name);
    window.__maliViewer.pause();
    window.__maliViewer.controls.enableDamping = false;
    window.__maliViewer.scene.traverse((o) => {
      if (o.isLight && o.shadow) {
        o.shadow.map?.dispose();
        o.shadow.map = null;
        o.shadow.mapSize.set(512, 512);
      }
    });
  }, name);
}
try {
  await page.goto(`${base}/models/mali-caravan/index.html`);
  await page.waitForFunction(() => !!window.__maliViewer, null, {
    timeout: 60000,
  });
  await page.addStyleTag({
    content:
      'header,.panel,.timeline,.status{display:none!important}main{height:100vh!important}',
  });
  await load('mansa-musa-standing');
  await page.evaluate(() => {
    const v = window.__maliViewer;
    v.setTime(0);
    v.portrait();
  });
  await record('mansa-musa-reference-closeup', 24, async (i) => {
    await page.evaluate((t) => window.__maliViewer.setTime(t), i / 24);
  });
  await page.evaluate(() => {
    const v = window.__maliViewer;
    v.angle('front');
    v.orbit = {
      target: v.controls.target.clone(),
      radius: v.camera.position.distanceTo(v.controls.target),
    };
  });
  await record('mansa-musa-3d-standing', 72, async (i) => {
    await page.evaluate((i) => {
      const v = window.__maliViewer,
        a = (i / 72) * Math.PI * 2;
      v.setTime(i / 24);
      v.camera.position.set(
        v.orbit.target.x + Math.sin(a) * v.orbit.radius * 0.96,
        v.orbit.target.y + v.orbit.radius * 0.28,
        v.orbit.target.z + Math.cos(a) * v.orbit.radius * 0.96,
      );
      v.controls.update();
      v.renderer.render(v.scene, v.camera);
    }, i);
  });
  await load('mali-gold-caravan');
  await record('mansa-musa-gold-handover', 108, async (i) => {
    const station = Math.floor(i / 36),
      time = [0.25, 5.58, 10.92][station] + (i % 36) / 24;
    await page.evaluate((t) => window.__maliViewer.setTime(t), time);
  });
  await page.evaluate(() => {
    const v = window.__maliViewer;
    v.setTime(6.2);
    v.overview();
  });
  await record('mansa-musa-army-overview', 36, async (i) => {
    await page.evaluate((t) => window.__maliViewer.setTime(t), 6.2 + i / 24);
  });
  await page.goto(`${base}/`);
  await page
    .locator('.loading-screen')
    .waitFor({ state: 'detached', timeout: 60000 });
  if (await page.locator('.intro-dismiss').count())
    await page.locator('.intro-dismiss').click();
  await page.getByRole('button', { name: 'Mansa Musa', exact: true }).click();
  await page.waitForFunction(() => !window.__darEngine.flight);
  await page.evaluate(async (root) => {
    const { worldFromTile } = await import(
      `/@fs${root}/packages/shared/iso.ts`
    );
    const { rulerTile } = await import(
      `/@fs${root}/packages/shared/royal-caravan.ts`
    );
    const e = window.__darEngine,
      [x, y] = worldFromTile(...rulerTile(76));
    e.flyTo({ x, y: y - 36, zoom: 2.25 }, 500);
  }, process.cwd());
  await page.waitForFunction(() => !window.__darEngine.flight);
  await page.evaluate(() => window.__darEngine.app.ticker.stop());
  await record('mansa-musa-native-world', 48, async (i) => {
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
      64 + i / 2,
    );
  });
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
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    'docs/previews/mansa-musa-3d-caravan.mp4',
  ],
  { stdio: 'inherit' },
);
await fs.writeFile(
  `${out}/capture.json`,
  JSON.stringify(
    {
      fps: 24,
      simulationTicksPerSecond: 12,
      frames: index,
      shots,
      errors,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Preview bytes:',
  (await fs.stat('docs/previews/mansa-musa-3d-caravan.mp4')).size,
);
