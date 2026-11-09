import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import sharp from 'sharp';

/*
 * Cuts the owner's desert and camel sheets (2026-11) into supplied object
 * art for Massawa: art/supplied/<id>.png plus art/supplied/index.json
 * (anchor at the base, density from a target height in world px). People on
 * the sheets are never cut (Massawa shows no people). Run once per sheet:
 *
 *   node --import tsx tools/prepare-supplied.ts <desert-sheet.png> <camel-sheet.png>
 */
const [desert, camels] = process.argv.slice(2);
type Cut = {
  id: string;
  sheet: string;
  box: [number, number, number, number];
  /** Height in world px (people are about 56). */
  height: number;
  edits?: string[];
  /** Where the ground point sits, as a fraction of the height from the bottom. */
  base?: number;
};
const D = desert,
  C = camels;
const cuts: Cut[] = [
  // Golden dunes: flat mounds whose ground point is their middle.
  {
    id: 'sup-dune-a',
    sheet: D,
    box: [20, 481, 315, 95],
    height: 60,
    base: 0.35,
    edits: ['largest', 'modulate=1.1,0.82,0'],
  },
  {
    id: 'sup-dune-b',
    sheet: D,
    box: [252, 494, 257, 103],
    height: 66,
    base: 0.35,
    edits: ['largest', 'modulate=1.1,0.82,0'],
  },
  {
    id: 'sup-dune-c',
    sheet: D,
    box: [20, 550, 286, 122],
    height: 76,
    base: 0.35,
    edits: ['largest', 'modulate=1.1,0.82,0'],
  },
  {
    id: 'sup-dune-d',
    sheet: D,
    box: [297, 576, 250, 96],
    height: 60,
    base: 0.35,
    edits: ['largest', 'modulate=1.1,0.82,0'],
  },
  // Sandstone outcrops.
  {
    id: 'sup-rocks-a',
    sheet: D,
    box: [526, 482, 193, 104],
    height: 58,
    edits: ['largest'],
  },
  {
    id: 'sup-rocks-b',
    sheet: D,
    box: [721, 500, 104, 64],
    height: 34,
    edits: ['largest'],
  },
  {
    id: 'sup-rocks-c',
    sheet: D,
    box: [827, 499, 101, 69],
    height: 36,
    edits: ['largest'],
  },
  {
    id: 'sup-rocks-d',
    sheet: D,
    box: [550, 590, 128, 92],
    height: 52,
    edits: ['largest'],
  },
  {
    id: 'sup-rocks-e',
    sheet: D,
    box: [656, 591, 64, 73],
    height: 42,
    edits: ['largest'],
  },
  {
    id: 'sup-rocks-f',
    sheet: D,
    box: [750, 568, 87, 54],
    height: 26,
    edits: ['largest'],
  },
  {
    id: 'sup-spire',
    sheet: D,
    box: [894, 576, 36, 94],
    height: 54,
    edits: ['largest'],
  },
  // Date palms, shrubs and a dead tree.
  {
    id: 'sup-palm-a',
    sheet: D,
    box: [942, 484, 96, 158],
    height: 124,
    edits: ['erase=72,100,95,157'],
  },
  { id: 'sup-palm-b', sheet: D, box: [1030, 486, 38, 102], height: 96 },
  { id: 'sup-palm-c', sheet: D, box: [1096, 488, 60, 128], height: 112 },
  { id: 'sup-palm-d', sheet: D, box: [1151, 516, 55, 106], height: 92 },
  {
    id: 'sup-shrub-a',
    sheet: D,
    box: [1214, 487, 67, 65],
    height: 30,
    edits: ['largest'],
  },
  {
    id: 'sup-shrub-b',
    sheet: D,
    box: [1207, 559, 84, 67],
    height: 32,
    edits: ['largest'],
  },
  {
    id: 'sup-shrub-c',
    sheet: D,
    box: [1105, 618, 75, 60],
    height: 26,
    edits: ['largest'],
  },
  {
    id: 'sup-tuft-a',
    sheet: D,
    box: [1012, 587, 58, 45],
    height: 18,
    edits: ['largest'],
  },
  {
    id: 'sup-tuft-b',
    sheet: D,
    box: [1026, 637, 72, 43],
    height: 16,
    edits: ['largest'],
  },
  {
    id: 'sup-deadtree',
    sheet: D,
    box: [1279, 491, 105, 136],
    height: 84,
    edits: ['largest'],
  },
  // Camp and market pieces.
  { id: 'sup-tent', sheet: D, box: [888, 694, 213, 137], height: 62 },
  {
    id: 'sup-well',
    sheet: D,
    box: [1096, 698, 128, 135],
    height: 58,
    edits: ['largest'],
  },
  {
    id: 'sup-canopy',
    sheet: D,
    box: [1381, 693, 142, 125],
    height: 56,
    edits: ['largest'],
  },
  { id: 'sup-jars', sheet: D, box: [1266, 790, 76, 52], height: 16 },
  {
    id: 'sup-crates',
    sheet: D,
    box: [1349, 797, 66, 50],
    height: 18,
    edits: ['largest'],
  },
  // Camels (standing): three-quarter front, side and back, with coat variants.
  {
    id: 'sup-camel-front',
    sheet: C,
    box: [712, 25, 322, 340],
    height: 60,
    edits: ['largest'],
  },
  {
    id: 'sup-camel-side',
    sheet: C,
    box: [1003, 30, 300, 330],
    height: 60,
    edits: ['largest'],
  },
  {
    id: 'sup-camel-back',
    sheet: C,
    box: [1290, 28, 112, 336],
    height: 60,
    edits: ['largest'],
  },
  {
    id: 'sup-camel-side-dark',
    sheet: C,
    box: [1003, 30, 300, 330],
    height: 58,
    edits: ['largest', 'flip', 'modulate=0.7,0.85,0'],
  },
  {
    id: 'sup-camel-front-pale',
    sheet: C,
    box: [712, 25, 322, 340],
    height: 57,
    edits: ['largest', 'flip', 'modulate=1.18,0.6,0'],
  },
];
const index: Record<string, unknown> = JSON.parse(
  fs.existsSync('art/supplied/index.json')
    ? fs.readFileSync('art/supplied/index.json', 'utf8')
    : '{}',
);
for (const c of cuts) {
  const file = `art/supplied/${c.id}.png`;
  execFileSync('node', [
    '--import',
    'tsx',
    'tools/prepare-landmark.ts',
    c.sheet,
    file,
    ...c.box.map(String),
    ...(c.edits ?? []),
  ]);
  const { data, info } = await sharp(file)
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Ground point: the middle of the lowest opaque rows (feet, trunk, base).
  let bottom = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 0) bottom = y;
  const row = bottom - Math.round(info.height * (c.base ?? 0.04));
  let sx = 0,
    n = 0;
  for (let y = Math.max(0, row - 6); y <= bottom; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 0) {
        sx += x;
        n++;
      }
  const density = +(info.height / c.height).toFixed(3);
  index[c.id] = {
    file: `supplied/${c.id}.png`,
    anchor: [Math.round(n ? sx / n : info.width / 2), row],
    density,
    source:
      'Owner-supplied desert/camel sheets (2026-11), cut by tools/prepare-supplied.ts',
  };
  console.log(c.id, info.width, info.height, 'density', density);
}
fs.writeFileSync(
  'art/supplied/index.json',
  JSON.stringify(index, null, 2) + '\n',
);
