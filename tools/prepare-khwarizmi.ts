import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import sharp from 'sharp';

/*
 * Al-Khwārizmī from the owner's large character sheet (2026-11, the third
 * sheet): the turnaround's front (holding a scroll) and back views, the
 * standing reading pose and the gesturing pose become his sprite and
 * animation strips (224×336 frames, feet at 112,320, a slow breath); the
 * whole front figure is his card picture; and the scenes not yet in his
 * gallery join it (gallery 14 onward). Gallery 0–13 came from the earlier
 * sheets (git history). The telescope (invented c. 1608) is left out.
 *
 *   node --import tsx tools/prepare-khwarizmi.ts <character sheet.png>
 */
const [sheet] = process.argv.slice(2);
const tmp = fs.mkdtempSync('/tmp/khwarizmi-');
function cut(name: string, box: number[], edits: string[]) {
  const out = `${tmp}/${name}.png`;
  execFileSync('node', [
    '--import',
    'tsx',
    'tools/prepare-landmark.ts',
    sheet,
    out,
    ...box.map(String),
    ...edits,
  ]);
  return out;
}
const FIG = ['tol=10', 'nofringe', 'keepholes', 'largest'];
/**
 * Clear the sheet's dark ground trapped between his feet, below the robe's
 * hem: grey-black pixels (close to the backdrop, unsaturated) in the lowest
 * sixth of the figure. `keepholes` keeps the robe's dark patterns, so the
 * gap between his legs is cleared here instead.
 */
async function clearGround(file: string) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let top = info.height,
    bottom = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3]) {
        top = Math.min(top, y);
        bottom = y;
      }
  for (let y = Math.floor(bottom - (bottom - top) / 6); y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4,
        [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const near = Math.abs(r - 15) + Math.abs(g - 17) + Math.abs(b - 21),
        sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (near < 45 && sat < 18) data[i + 3] = 0;
    }
  await sharp(data, { raw: info })
    .png()
    .toFile(file + '.clean.png');
  return file + '.clean.png';
}
const front = await clearGround(cut('front', [18, 10, 180, 352], FIG)),
  back = await clearGround(cut('back', [498, 10, 165, 352], FIG)),
  read = await clearGround(cut('read', [10, 362, 185, 330], FIG)),
  talk = await clearGround(cut('talk', [365, 695, 200, 310], FIG));
const FW = 224,
  FH = 336,
  FOOT = 320,
  HEIGHT = 292;
/** Four frames of a slow breath (the figure stretches by up to 1.2%). */
async function breathing(file: string) {
  const body = await sharp(file)
    .trim({ threshold: 0 })
    .resize({ height: HEIGHT, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const w = (await sharp(body).metadata()).width!;
  const frames: Buffer[] = [];
  for (const k of [0, 0.006, 0.012, 0.006]) {
    const h = Math.round(HEIGHT * (1 + k));
    const f = await sharp(body)
      .resize({ width: w, height: h, fit: 'fill' })
      .png()
      .toBuffer();
    frames.push(
      await sharp({
        create: {
          width: FW,
          height: FH,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([
          { input: f, left: Math.round(FW / 2 - w / 2), top: FOOT - h },
        ])
        .png()
        .toBuffer(),
    );
  }
  return sharp({
    create: {
      width: FW * 4,
      height: FH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frames.map((input, i) => ({ input, left: i * FW, top: 0 })))
    .png()
    .toBuffer();
}
fs.copyFileSync(front, 'art/sprites/al-khwarizmi.png');
fs.copyFileSync(back, 'art/sprites/al-khwarizmi-back.png');
const backStrip = await breathing(back);
fs.writeFileSync(
  'art/sprites/anim/al-khwarizmi__idle_SE.png',
  await breathing(front),
);
fs.writeFileSync(
  'art/sprites/anim/al-khwarizmi__read_SE.png',
  await breathing(read),
);
fs.writeFileSync(
  'art/sprites/anim/al-khwarizmi__talk_SE.png',
  await breathing(talk),
);
for (const action of ['idle', 'read', 'talk'])
  fs.writeFileSync(
    `art/sprites/anim/al-khwarizmi__${action}_NE.png`,
    backStrip,
  );
// Card picture: his whole standing figure, turban to sandals (owner's
// request: the close-up face showed only half of him).
await sharp(front)
  .trim({ threshold: 0 })
  .extend({
    top: 10,
    bottom: 8,
    left: 14,
    right: 14,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile('art/illustrations/al-khwarizmi.png');
/*
 * Gallery: scenes not yet in it — seated reading, compasses at the table,
 * walking with scrolls, the cane, holding the astrolabe, seated in thought
 * and carrying books — each squared on the sheet's dark ground.
 */
/** [left, top, width, height, ...patches]: patches (x, y, w, h within the
 * box) cover bits of the neighbouring figures with the dark ground. */
const scenes = [
  [195, 365, 200, 325, 180, 140, 20, 60],
  [878, 365, 232, 325, 0, 0, 40, 170],
  [10, 695, 182, 312],
  [192, 695, 165, 312],
  [562, 695, 168, 312, 150, 150, 18, 162],
  [728, 695, 182, 312, 0, 0, 22, 120, 160, 200, 22, 112],
  [1100, 695, 140, 312, 100, 0, 40, 60, 128, 120, 12, 192, 0, 250, 14, 62],
];
let n = 14;
for (const [l, t, w, h, ...patches] of scenes) {
  const side = Math.max(w, h),
    covers = [];
  for (let k = 0; k < patches.length; k += 4)
    covers.push({
      input: {
        create: {
          width: patches[k + 2],
          height: patches[k + 3],
          channels: 3 as const,
          background: { r: 15, g: 17, b: 21 },
        },
      },
      left: patches[k],
      top: patches[k + 1],
    });
  const piece = await sharp(
    await sharp(sheet)
      .extract({ left: l, top: t, width: w, height: h })
      .png()
      .toBuffer(),
  )
    .composite(covers)
    .png()
    .toBuffer();
  const square = await sharp({
    create: {
      width: side,
      height: side,
      channels: 3,
      background: { r: 15, g: 17, b: 21 },
    },
  })
    .composite([
      { input: piece, left: Math.round((side - w) / 2), top: side - h },
    ])
    .png()
    .toBuffer();
  await sharp(square)
    .resize({ width: 300 })
    .png({ palette: true, quality: 92 })
    .toFile(`art/gallery/al-khwarizmi/${n++}.png`);
}
console.log('done');
