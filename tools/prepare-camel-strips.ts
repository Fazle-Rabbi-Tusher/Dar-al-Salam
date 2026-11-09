import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import sharp from 'sharp';

/*
 * Animation strips for Massawa's walking camels, from the owner's camel
 * sheet (2026-11): the four walking frames (walk, seen from the side), the
 * standing side view (idle) and the back view (walking or standing away).
 * Each strip has a sidecar JSON with its frame size, foot point and density,
 * since camels do not fit the people's 224×336 frames.
 *
 *   node --import tsx tools/prepare-camel-strips.ts <camel-sheet.png>
 */
const [sheet] = process.argv.slice(2);
const tmp = fs.mkdtempSync('/tmp/camel-');
/** World height of a camel (people are about 56 world px). */
const HEIGHT = 60;
type Frame = { box: [number, number, number, number]; edits: string[] };
const WALK: Frame[] = [945, 1085, 1225, 1365].map((x, i) => ({
  box: [x, 412, i === 3 ? 155 : 150, 132],
  edits: ['floor=128', 'largest'],
}));
const SIDE: Frame = { box: [1003, 30, 300, 330], edits: ['largest'] };
const BACK: Frame = { box: [1290, 28, 112, 336], edits: ['largest'] };
async function cut(f: Frame, extra: string[], i: number) {
  const file = `${tmp}/f${i}.png`;
  execFileSync('node', [
    '--import',
    'tsx',
    'tools/prepare-landmark.ts',
    sheet,
    file,
    ...f.box.map(String),
    ...f.edits,
    ...extra,
  ]);
  return sharp(file).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
}
/** Lay frames side by side, the body's middle and the feet pinned. */
async function strip(frames: Frame[], extra: string[], out: string) {
  const imgs = [];
  for (const [i, f] of frames.entries()) imgs.push(await cut(f, extra, i));
  const density = +(
    Math.max(...imgs.map((m) => m.info.height)) / HEIGHT
  ).toFixed(3);
  const centre = imgs.map(({ data, info }) => {
    // Body centre: opaque pixels in the upper 55% (hump and barrel).
    let sx = 0,
      n = 0;
    for (let y = 0; y < info.height * 0.55; y++)
      for (let x = 0; x < info.width; x++)
        if (data[(y * info.width + x) * 4 + 3] > 0) {
          sx += x;
          n++;
        }
    return sx / n;
  });
  const left = Math.max(...centre.map((c) => c)),
    right = Math.max(...imgs.map((m, i) => m.info.width - centre[i]));
  const FW = Math.ceil(left + right) + 8,
    FH = Math.max(...imgs.map((m) => m.info.height)) + 8,
    foot: [number, number] = [Math.round(left) + 4, FH - 4];
  const composites = imgs.map(({ data, info }, i) => ({
    input: data,
    raw: { width: info.width, height: info.height, channels: 4 as const },
    left: i * FW + Math.round(foot[0] - centre[i]),
    top: FH - 4 - info.height,
  }));
  await sharp({
    create: {
      width: FW * imgs.length,
      height: FH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(`${out}.png`);
  fs.writeFileSync(
    `${out}.json`,
    JSON.stringify({ frame: [FW, FH], foot, density }, null, 2) + '\n',
  );
  console.log(out, FW, FH, density);
}
fs.mkdirSync('art/sprites/anim', { recursive: true });
// Two caravan camels: the sheet's sandy coat and a darker one. The sheet
// faces left, so SE (facing right) is flipped; the engine mirrors SW.
for (const [id, coat] of [
  ['amb-msw-camel-0', []],
  ['amb-msw-camel-1', ['modulate=0.72,0.85,0']],
] as [string, string[]][]) {
  const base = `art/sprites/anim/${id}__`;
  await strip(WALK, ['flip', ...coat], `${base}animal_walk_SE`);
  await strip([SIDE], ['flip', ...coat], `${base}animal_idle_SE`);
  await strip([BACK], coat, `${base}animal_walk_NE`);
  await strip([BACK], coat, `${base}animal_idle_NE`);
}
