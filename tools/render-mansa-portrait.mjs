import fs from 'node:fs/promises';
import sharp from 'sharp';
import { chromium } from '@playwright/test';

// Render the actual exported model as the transparent card artwork.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1000 },
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(
    (process.env.PREVIEW_BASE || 'http://localhost:5173') +
      '/models/mali-caravan/index.html',
  );
  await page.waitForFunction(() => !!window.__maliViewer, null, {
    timeout: 90000,
  });
  const png = await page.evaluate(async () => {
    const v = window.__maliViewer;
    v.pause();
    v.renderer.setAnimationLoop(null);
    await v.loadModel('mansa-musa-standing');
    const w = window.__maliViewer;
    w.pause();
    w.controls.enableDamping = false;
    w.setTime(0);
    w.angle('front');
    w.scene.background = null;
    w.scene.fog = null;
    w.floor.visible = false;
    w.renderer.setClearColor(0x000000, 0);
    w.renderer.setSize(700, 1050, false);
    w.camera.aspect = 700 / 1050;
    w.camera.updateProjectionMatrix();
    w.renderer.render(w.scene, w.camera);
    return w.renderer.domElement.toDataURL('image/png');
  });
  if (errors.length) throw Error(errors.join('\n'));
  const bytes = Buffer.from(png.split(',')[1], 'base64');
  await sharp(bytes)
    .trim({ threshold: 0 })
    .resize({ height: 480, kernel: 'nearest' })
    .extend({ top: 12, bottom: 12, left: 18, right: 18, background: '#0000' })
    .png()
    .toFile('art/illustrations/mansa-musa.png');
  await sharp(bytes)
    .trim({ threshold: 0 })
    .resize({ height: 300, kernel: 'nearest' })
    .png()
    .toFile('art/sprites/mansa-musa.png');
  await fs.mkdir('docs/previews', { recursive: true });
  await sharp(bytes)
    .trim({ threshold: 0 })
    .png()
    .toFile('docs/previews/mansa-musa-reference-front.png');
  console.log('Rendered transparent ruler portrait from the reference-v2 GLB.');
} finally {
  await browser.close();
}
