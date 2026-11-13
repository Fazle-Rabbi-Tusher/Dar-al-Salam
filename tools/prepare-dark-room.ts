import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

/*
 * Render the owner's complete Al-Bayt al-Muzlim exterior into the native world
 * plot, exposing the chamber interior within the complete surrounding neighborhood.
 * Usage: node --import tsx tools/prepare-dark-room.ts <collection> <three vendor>
 * Writes the supplied sprite inventory and updates only this landmark's room objects.
 */
const [collection, three] = process.argv.slice(2);
if (!collection || !three)
  throw Error(
    'Usage: prepare-dark-room.ts <collection folder> <three vendor folder>',
  );
/** Fit the complete neighborhood inside the existing lawn, without stretching heights. */
export const S = 0.23,
  KV = 1,
  D = 4;
/** The original chamber origin keeps the scholar's existing position indoors. */
export const ROOM: [number, number] = [21.0, 103.4];
/** Tile under a room point. The room is turned so its open sides face the
 * viewer: room +Z runs along the world's +x, room +X along the world's −y. */
export const tileOf = (X: number, Z: number): [number, number] => [
  +(ROOM[0] + S * Z).toFixed(3),
  +(ROOM[1] - S * X).toFixed(3),
];

const roots: Record<string, string> = {
  room: path.resolve(collection),
  three: path.resolve(three),
  render: path.resolve('tools/dark-room'),
};
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.glb': 'model/gltf-binary',
};
const server = http.createServer((req, res) => {
  const [, root, ...rest] = decodeURI(req.url!.split('?')[0]).split('/');
  const base = roots[root],
    file = base && path.resolve(base, ...rest);
  if (!file || !file.startsWith(base) || !fs.existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const port = (server.address() as { port: number }).port;
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page:', e.message));
await page.goto(
  `http://127.0.0.1:${port}/render/render.html?s=${S}&kv=${KV}&D=${D}`,
);
await page.waitForFunction('window.READY === true', null, { timeout: 300000 });
const info = (await page.evaluate(
  '({ W: RESULT.W, H: RESULT.H, pieces: RESULT.pieces, boxes: RESULT.boxes })',
)) as {
  W: number;
  H: number;
  pieces: string[];
  /** Each piece's footprint in room units: [x0, z0, x1, z1]. */
  boxes: Record<string, [number, number, number, number]>;
};
const renders = new Map<string, Buffer>();
for (const k of info.pieces) {
  const url = (await page.evaluate(
    `RESULT.render(${JSON.stringify(k)})`,
  )) as string;
  renders.set(k, Buffer.from(url.split(',')[1], 'base64'));
}
// The floor plane's projection is affine: pixel = o + X·u + Z·w.
const [o, u, w] = (await page.evaluate(
  '[RESULT.toPx(0,0,0), RESULT.toPx(1,0,0), RESULT.toPx(0,0,1)]',
)) as [number, number][];
await browser.close();
server.close();
const ground = (X: number, Z: number): [number, number] => [
  o[0] + X * (u[0] - o[0]) + Z * (w[0] - o[0]),
  o[1] + X * (u[1] - o[1]) + Z * (w[1] - o[1]),
];

/* ── Where each piece stands (room units) ── */
type P2 = [number, number];
type Base = { point: P2 } | { path: P2[] };
const BASES: Record<string, Base> = {
  floor: { point: [10.0, -6.0] },
};
/*
 * The complete exterior stands on the near edges of its footprint:
 * the viewer looks from room +Z and −X, so each image strip
 * sorts by the nearest ground under it.
 */
const nearEdge = ([x0, z0, x1, z1]: [
  number,
  number,
  number,
  number,
]): Base => ({
  path: [
    [x1, z1],
    [x0, z1],
    [x0, z0],
  ],
});
const OUT = 'art/supplied/dark-room';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const index = JSON.parse(fs.readFileSync('art/supplied/index.json', 'utf8'));
for (const key of Object.keys(index))
  if (key.startsWith('sup-dr-')) delete index[key];
const placed: { type: string; at: P2 }[] = [];
const SOURCE =
  "Owner's Al-Bayt al-Muzlim collection (2026-11), cutaway GLB rendered by tools/prepare-dark-room.ts";
async function emit(
  name: string,
  img: sharp.Sharp,
  left: number,
  top: number,
  X: number,
  Z: number,
  floor = false,
) {
  await img.png().toFile(`${OUT}/${name}.png`);
  const foot = ground(X, Z);
  index[`sup-dr-${name}`] = {
    file: `supplied/dark-room/${name}.png`,
    anchor: [Math.round(foot[0] - left), Math.round(foot[1] - top)],
    density: D,
    ...(floor ? { floor: true } : {}),
    source: SOURCE,
  };
  placed.push({ type: `sup-dr-${name}`, at: tileOf(X, Z) });
}
/** The point of a floor polyline whose image lies under pixel column x. */
function onPath(line: P2[], x: number): P2 {
  let best: P2 = line[0],
    gap = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [ground(...line[i - 1]), ground(...line[i])],
      t = Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0] || 1))),
      d = Math.abs(a[0] + (b[0] - a[0]) * t - x);
    if (d < gap) {
      gap = d;
      best = [
        line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t,
        line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t,
      ];
    }
  }
  return best;
}
// Tall pieces stand in narrow, slightly overlapping strips, each on its own
// floor point: the ground is curved this far from the quarter's centre.
const STRIP = 16,
  OVERLAP = 3;
for (const [k, png] of renders) {
  const base = BASES[k] ?? (info.boxes[k] && nearEdge(info.boxes[k]));
  if (!base) throw Error(`No base for ${k}`);
  const { data, info: im } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let x0 = im.width,
    y0 = im.height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < im.height; y++)
    for (let x = 0; x < im.width; x++)
      if (data[(y * im.width + x) * 4 + 3]) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) continue;
  if ('point' in base) {
    const [X, Z] = base.point;
    await emit(
      k,
      sharp(png).extract({
        left: x0,
        top: y0,
        width: x1 - x0 + 1,
        height: y1 - y0 + 1,
      }),
      x0,
      y0,
      X,
      Z,
      k === 'floor',
    );
    continue;
  }
  for (let sx = x0, n = 0; sx <= x1; sx += STRIP, n++) {
    const wd = Math.min(STRIP, x1 - sx + 1);
    let top = -1,
      bottom = -1;
    for (let y = y0; y <= y1; y++)
      for (let x = sx; x < sx + wd; x++)
        if (data[(y * im.width + x) * 4 + 3]) {
          if (top < 0) top = y;
          bottom = y;
          break;
        }
    if (top < 0) continue;
    const [X, Z] = onPath(base.path, sx + wd / 2),
      left = Math.max(0, sx - OVERLAP);
    await emit(
      `${k}-${n}`,
      sharp(png).extract({
        left,
        top,
        width: Math.min(im.width, sx + wd + OVERLAP) - left,
        height: bottom - top + 1,
      }),
      left,
      top,
      X,
      Z,
    );
  }
}
fs.writeFileSync(
  'art/supplied/index.json',
  JSON.stringify(index, null, 2) + '\n',
);
fs.writeFileSync(
  'art/supplied/dark-room.json',
  JSON.stringify(placed, null, 2) + '\n',
);
// Update only this landmark in the authored world. Regenerating the whole
// placeholder quarter would also replace unrelated hand-edited placements.
const roomFile = 'rooms/mosque-garden.tmj';
const world = JSON.parse(fs.readFileSync(roomFile, 'utf8'));
const layer = world.layers.find(
  (l: { type: string }) => l.type === 'objectgroup',
);
const first = layer.objects.findIndex((o: { type: string }) =>
  o.type.startsWith('sup-dr-'),
);
if (first < 0) throw Error('Dark-room plot is missing from the world');
const previous = layer.objects.filter((o: { type: string }) =>
  o.type.startsWith('sup-dr-'),
);
let nextId = Math.max(...layer.objects.map((o: { id: number }) => o.id)) + 1;
const replacements = placed.map((piece, i) => ({
  ...previous[0],
  id: previous[i]?.id ?? nextId++,
  type: piece.type,
  x: piece.at[0],
  y: piece.at[1],
}));
layer.objects = layer.objects.filter(
  (o: { type: string }) => !o.type.startsWith('sup-dr-'),
);
layer.objects.splice(first, 0, ...replacements);
if ('nextobjectid' in world) world.nextobjectid = nextId;
fs.writeFileSync(roomFile, JSON.stringify(world, null, 2) + '\n');
console.log(`Dark room: ${placed.length} pieces from ${renders.size} renders.`);
