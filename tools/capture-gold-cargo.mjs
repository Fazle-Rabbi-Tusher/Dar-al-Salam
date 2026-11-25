import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const out = 'web/public/models/gold-cargo';
const frames = '.playwright/gold-cargo-frames';
await fs.mkdir(frames, { recursive: true });
await fs.mkdir(out + '/sprites', { recursive: true });
const manifest = JSON.parse(await fs.readFile(out + '/manifest.json', 'utf8'));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const errors = [];
let directions = 0;
try {
  const page = await browser.newPage({
    viewport: { width: 960, height: 720 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(
    process.env.CARGO_PREVIEW ||
      'http://127.0.0.1:8150/index.html?model=elephant-loaded',
  );
  await page.waitForFunction(() => !!window.__goldCargo?.model, null, {
    timeout: 120000,
  });
  await page.addStyleTag({
    content:
      'header,aside,.timeline,#status{display:none!important}main{height:100vh!important}',
  });
  await page.evaluate(() => {
    const v = window.__goldCargo;
    v.pause();
    v.renderer.setAnimationLoop(null);
    v.controls.enableDamping = false;
    v.scene.traverse((o) => {
      if (o.isLight && o.shadow) {
        o.shadow.map?.dispose();
        o.shadow.map = null;
        o.shadow.mapSize.set(512, 512);
      }
    });
    window.dispatchEvent(new Event('resize'));
  });
  async function load(name, mode = 'Rest') {
    await page.evaluate(
      async ({ name, mode }) => {
        const v = window.__goldCargo;
        await v.loadModel(name);
        if (v.component.modes.length) v.component.setMode(mode);
        v.pause();
        v.setTime(0);
        v.angle('isometric');
      },
      { name, mode },
    );
  }
  for (const { id } of manifest.models) {
    await load(id);
    const detailed = [
      'elephant-loaded',
      'camel-loaded',
      'howdah',
      'treasury-collection',
    ].includes(id);
    for (const angle of detailed
      ? ['front', 'rear', 'left', 'isometric']
      : ['isometric']) {
      const encoded = await page.evaluate((angle) => {
        const v = window.__goldCargo;
        v.scene.background = null;
        v.scene.getObjectByName('studio-floor').visible = false;
        v.renderer.setClearColor(0, 0);
        v.angle(angle);
        return v.renderer.domElement.toDataURL('image/png');
      }, angle);
      const png = await sharp(Buffer.from(encoded.split(',')[1], 'base64'))
        .trim({ background: '#00000000', threshold: 0 })
        .resize({ height: detailed ? 512 : 288, kernel: 'nearest' })
        .extend({
          top: 12,
          bottom: 12,
          left: 12,
          right: 12,
          background: '#00000000',
        })
        .png()
        .toBuffer();
      await fs.writeFile(`${out}/sprites/${id}-${angle}.png`, png);
      directions++;
    }
    console.log('Captured real 3D views:', id);
  }
  await load('procession-scene');
  await page.evaluate(() => {
    const v = window.__goldCargo;
    v.scene.background = null;
    v.scene.getObjectByName('studio-floor').visible = true;
    v.renderer.setClearColor('#24271f', 1);
    v.setTime(1);
    v.angle('isometric');
  });
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  const poster = await page.evaluate(() =>
    window.__goldCargo.renderer.domElement.toDataURL('image/png'),
  );
  await fs.writeFile(
    out + '/gold-cargo-scene.png',
    Buffer.from(poster.split(',')[1], 'base64'),
  );
  await page.setViewportSize({ width: 960, height: 720 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  // Six seconds of the moving loaded elephant, four of the camel, four
  // orbiting the treasury, then six of the giving stop. All are real meshes.
  const clips = [
    ['elephant-loaded', 144, 'Walk', 0],
    ['camel-loaded', 96, 'Walk', 1],
    ['treasury-collection', 96, 'Rest', 0],
    ['procession-scene', 144, 'Rest', 0.1],
  ];
  let count = 0;
  for (const [name, length, mode, start] of clips) {
    await load(name, mode);
    await page.evaluate(() => {
      const v = window.__goldCargo;
      v.scene.getObjectByName('studio-floor').visible = true;
      v.renderer.setClearColor('#24271f', 1);
      v.angle('isometric');
      window.__captureOffset = v.camera.position.clone().sub(v.controls.target);
    });
    for (let i = 0; i < length; i++) {
      const jpg = await page.evaluate(
        ({ t, i, length }) => {
          const v = window.__goldCargo;
          // Advance before positioning the orbit: setTime follows root motion.
          v.setTime(t, false);
          const a = (i / (length - 1) - 0.5) * 0.7;
          v.camera.position
            .copy(v.controls.target)
            .add(
              window.__captureOffset
                .clone()
                .applyAxisAngle({ x: 0, y: 1, z: 0 }, a),
            );
          v.controls.update();
          v.renderer.render(v.scene, v.camera);
          return v.renderer.domElement.toDataURL('image/jpeg', 0.9);
        },
        { t: start + i / 24, i, length },
      );
      await fs.writeFile(
        `${frames}/${String(count++).padStart(4, '0')}.jpg`,
        Buffer.from(jpg.split(',')[1], 'base64'),
      );
    }
    console.log('Captured actual animation:', name);
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  await fs.writeFile(
    out + '/capture-proof.json',
    JSON.stringify(
      {
        frames: count,
        fps: 24,
        seconds: 20,
        directions,
        source:
          'Actual articulated GLBs recorded in the local Three.js renderer',
        errors,
      },
      null,
      2,
    ) + '\n',
  );
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
    '-vf',
    'scale=768:576:flags=neighbor',
    '-c:v',
    'libx264',
    '-crf',
    '25',
    '-maxrate',
    '1.2M',
    '-bufsize',
    '2.4M',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    out + '/gold-cargo-animation.mp4',
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
    out + '/gold-cargo-animation.mp4',
    '-filter_complex',
    'fps=12,scale=256:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    '-loop',
    '0',
    out + '/gold-cargo-animation.gif',
  ],
  { stdio: 'inherit' },
);
for (const file of ['gold-cargo-animation.mp4', 'gold-cargo-animation.gif'])
  execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', out + '/' + file, '-f', 'null', '-'],
    { stdio: 'inherit' },
  );
console.log('Encoded and decoded both complete 20-second previews.');
