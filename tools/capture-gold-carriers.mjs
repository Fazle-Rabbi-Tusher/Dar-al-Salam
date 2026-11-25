import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const out = 'web/public/models/gold-carriers';
const frames = '.playwright/gold-carrier-frames';
await fs.mkdir(frames, { recursive: true });
await fs.mkdir(out + '/sprites', { recursive: true });
const names = [
  'overhead-gold-bearer',
  'bowl-gold-bearer',
  'chest-porter-rust',
  'chest-porter-indigo',
  'banner-attendant',
  'elder-recipient',
  'paired-chest-carriers',
];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 960, height: 840 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(
    process.env.CARRIER_PREVIEW || 'http://127.0.0.1:8140/index.html',
  );
  await page.waitForFunction(() => !!window.__goldCarriers?.model, null, {
    timeout: 60000,
  });
  await page.addStyleTag({
    content:
      'header,aside,.timeline,#status{display:none!important}main{height:100vh!important}',
  });
  await page.evaluate(() => {
    const v = window.__goldCarriers;
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
  async function load(name) {
    await page.evaluate(async (name) => {
      const v = window.__goldCarriers;
      await v.loadModel(name);
      v.pause();
      v.setTime(3);
      v.angle(name === 'gold-handover-pair' ? 'front' : 'isometric');
    }, name);
  }
  const composites = [];
  for (const [index, name] of names.entries()) {
    await load(name);
    const modelHeight = await page.evaluate(
      () => window.__goldCarriers.size[1],
    );
    for (const angle of ['front', 'rear', 'left', 'isometric']) {
      const image = await page.evaluate((angle) => {
        const v = window.__goldCarriers;
        const background = v.scene.background,
          floor = v.scene.getObjectByName('studio-floor');
        v.scene.background = null;
        floor.visible = false;
        v.renderer.setClearColor(0, 0);
        v.angle(angle);
        v.renderer.render(v.scene, v.camera);
        const data = v.renderer.domElement.toDataURL('image/png');
        v.scene.background = background;
        floor.visible = true;
        return data;
      }, angle);
      const buffer = Buffer.from(image.split(',')[1], 'base64');
      const png = await sharp(buffer)
        .trim({ background: '#00000000', threshold: 0 })
        .resize({ height: 512, kernel: 'nearest' })
        .extend({
          top: 12,
          bottom: 12,
          left: 12,
          right: 12,
          background: '#00000000',
        })
        .png()
        .toBuffer();
      await fs.writeFile(`${out}/sprites/${name}-${angle}.png`, png);
      if (angle === 'front' && index < 6) {
        const resized = await sharp(png)
          .resize({ height: Math.round(modelHeight * 170), kernel: 'nearest' })
          .toBuffer();
        const { width } = await sharp(resized).metadata();
        composites.push({
          input: resized,
          left: index * 260 + Math.floor((260 - width) / 2),
          top: 500 - Math.round(modelHeight * 170),
        });
      }
    }
    console.log('Captured four real 3D directions:', name);
  }
  await sharp({
    create: { width: 1560, height: 520, channels: 4, background: '#24271f' },
  })
    .composite(composites)
    .png()
    .toFile(out + '/character-lineup.png');
  const clips = [
    ['overhead-gold-bearer', 96, 2],
    ['gold-handover-pair', 96, 0.1],
    ['paired-chest-carriers', 96, 2],
    ['banner-attendant', 72, 2],
    ['elder-recipient', 48, 0],
    ['gold-carriers-ensemble', 72, 2],
  ];
  let count = 0;
  for (const [name, length, start] of clips) {
    await load(name);
    for (let i = 0; i < length; i++) {
      const jpg = await page.evaluate(
        ({ seconds, i, length }) => {
          const v = window.__goldCarriers;
          v.component.setTime(seconds);
          if (window.__captureView === undefined || i === 0)
            window.__captureView = {
              target: v.controls.target.clone(),
              offset: v.camera.position.clone().sub(v.controls.target),
            };
          const pose = window.__captureView;
          const a = (i / (length - 1) - 0.5) * 0.42;
          v.camera.position
            .copy(pose.target)
            .add(pose.offset.clone().applyAxisAngle({ x: 0, y: 1, z: 0 }, a));
          v.controls.update();
          v.renderer.render(v.scene, v.camera);
          return v.renderer.domElement.toDataURL('image/jpeg', 0.9);
        },
        { seconds: start + i / 24, i, length },
      );
      await fs.writeFile(
        `${frames}/${String(count++).padStart(4, '0')}.jpg`,
        Buffer.from(jpg.split(',')[1], 'base64'),
      );
    }
    console.log('Captured animated model:', name);
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  await fs.writeFile(
    frames + '/proof.json',
    JSON.stringify(
      {
        videoFrames: count,
        fps: 24,
        seconds: 20,
        source: 'Actual articulated GLBs in the local Three.js renderer',
        directions: 28,
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
    '-c:v',
    'libx264',
    '-crf',
    '23',
    '-maxrate',
    '3M',
    '-bufsize',
    '6M',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    out + '/gold-carriers-animation.mp4',
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
    out + '/gold-carriers-animation.mp4',
    '-filter_complex',
    'fps=12,scale=320:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    '-loop',
    '0',
    out + '/gold-carriers-animation.gif',
  ],
  { stdio: 'inherit' },
);
console.log('Encoded the 20-second 3D character tour.');
