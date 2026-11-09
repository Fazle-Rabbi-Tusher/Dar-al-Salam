import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import sharp from 'sharp';

/*
 * Al-Khwārizmī from the owner's character sheet (2026-11): full-body front
 * (holding his book), pointing and back views become his sprite and
 * animation strips (224×336 frames, feet at 112,320, a slow breath); his
 * astrolabe and celestial globe become lab pieces; the close-up portrait is
 * his card picture; and the desk and kneeling scenes join his gallery.
 * People-free props only; the telescope (invented c. 1608) is left out.
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
const front = cut('front', [12, 518, 214, 342], FIG),
  point = cut('point', [674, 518, 238, 342], ['erase=172,262,237,341', ...FIG]),
  back = cut('back', [487, 518, 174, 342], FIG);
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
  'art/sprites/anim/al-khwarizmi__talk_SE.png',
  await breathing(point),
);
fs.writeFileSync('art/sprites/anim/al-khwarizmi__idle_NE.png', backStrip);
fs.writeFileSync('art/sprites/anim/al-khwarizmi__talk_NE.png', backStrip);
// Card picture: the close-up portrait.
await sharp(sheet)
  .extract({ left: 10, top: 12, width: 198, height: 194 })
  .resize({ width: 280 })
  .png()
  .toFile('art/illustrations/al-khwarizmi.png');
// Gallery: the desk scenes and the kneeling scene, after the first eight.
const scenes = [
  [10, 222, 340, 282],
  [356, 222, 328, 282],
  [690, 222, 270, 282],
  [966, 222, 272, 282],
  [1244, 222, 282, 282],
  [934, 518, 302, 342],
];
let n = 8;
for (const [l, t, w, h] of scenes)
  await sharp(sheet)
    .extract({ left: l, top: t, width: w, height: h })
    .resize({ width: 300 })
    .png({ palette: true, quality: 92 })
    .toFile(`art/gallery/al-khwarizmi/${n++}.png`);
// Instruments for the lab: the astrolabe and the celestial globe.
const index = JSON.parse(fs.readFileSync('art/supplied/index.json', 'utf8'));
for (const [id, box, edits, height] of [
  ['sup-astrolabe', [1205, 878, 72, 112], ['tol=12'], 40],
  [
    'sup-globe',
    [1272, 888, 58, 116],
    ['erase=56,0,57,115', 'tol=12', 'keepholes'],
    38,
  ],
] as [string, number[], string[], number][]) {
  const file = `art/supplied/${id}.png`;
  fs.copyFileSync(cut(id, box, edits), file);
  const { data, info } = await sharp(file)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bottom = 0,
    sx = 0,
    c = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3]) bottom = y;
  for (let y = bottom - 4; y <= bottom; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3]) {
        sx += x;
        c++;
      }
  index[id] = {
    file: `supplied/${id}.png`,
    anchor: [Math.round(sx / c), bottom],
    density: +(info.height / height).toFixed(3),
    source:
      'Owner-supplied Al-Khwārizmī character sheet (2026-11), cut by tools/prepare-khwarizmi.ts',
  };
}
fs.writeFileSync(
  'art/supplied/index.json',
  JSON.stringify(index, null, 2) + '\n',
);
console.log('done');
