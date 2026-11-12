import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { KV, S, tileOf } from './mosque-hall/layout';

/*
 * The owner's 3D mosque (mosque-six-angle-final, 2026-11) in the world: its
 * three.js model rendered in the world's own isometric projection, piece by
 * piece with the whole hall's lighting and shadows (tools/mosque-hall/
 * render.html), so people can stand between its columns and arches.
 *
 *   node --import tsx tools/prepare-mosque-hall.ts <extracted mosque-model folder>
 *
 * The hall is the grand version of that model (tools/mosque-hall/
 * grand-mosque.mjs, the owner's double-size brief); scale and place:
 * tools/mosque-hall/layout.ts. Cut away for the view, as in the pack: no
 * roof, and only the two far walls. The qibla wall with its mihrab is the
 * far NE wall.
 *
 * Writes art/supplied/prayer-hall/*.png, their art/supplied/index.json
 * entries and art/supplied/prayer-hall.json: where each piece stands.
 */
const [pack] = process.argv.slice(2);
if (!pack) throw Error('Usage: prepare-mosque-hall.ts <mosque-model folder>');
const D = 2;

/* ── Render every piece in a headless browser ── */
const roots: Record<string, string> = {
  pack: path.resolve(pack),
  render: path.resolve('tools/mosque-hall'),
};
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.png': 'image/png',
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
type P2 = [number, number];
type Info = {
  W: number;
  H: number;
  PX: number;
  pieces: string[];
  /** The hall's plan (tools/mosque-hall/grand-mosque.mjs LAYOUT). */
  layout: {
    x0: number;
    x1: number;
    z0: number;
    z1: number;
    columns: P2[];
    arches: P2[];
    ribs: number[];
    lanterns: [number, number, number][];
    windowH: number;
    plants: P2[];
    partition: { z: number; x0: number; x1: number };
    westWindows: number[];
    qiblaWindows: number[];
  };
};
const info = (await page.evaluate(
  '({ W: RESULT.W, H: RESULT.H, PX: RESULT.PX, pieces: RESULT.pieces, layout: RESULT.layout })',
)) as Info;
const L = info.layout;
const renders = new Map<string, Buffer>();
for (const k of info.pieces.filter((k) => k !== 'shafts')) {
  const url = (await page.evaluate(
    `RESULT.render(${JSON.stringify(k)})`,
  )) as string;
  renders.set(k, Buffer.from(url.split(',')[1], 'base64'));
}
// The projection of the floor plane is affine: pixel = o + X·u + Z·w.
const [o, u, w] = (await page.evaluate(
  '[RESULT.toPx(0,0,0), RESULT.toPx(1,0,0), RESULT.toPx(0,0,1)]',
)) as [number, number][];
await browser.close();
server.close();
const ground = (X: number, Z: number): [number, number] => [
  o[0] + X * (u[0] - o[0]) + Z * (w[0] - o[0]),
  o[1] + X * (u[1] - o[1]) + Z * (w[1] - o[1]),
];
/** Pixel of a model point at height Y metres (stretched like the render). */
const at = (X: number, Y: number, Z: number): [number, number] => {
  const [x, y] = ground(X, Z);
  return [x, y - Y * KV * Math.cos(Math.PI / 6) * info.PX];
};

/* ── Soft golden sun shafts from the windows to the floor ── */
async function shafts() {
  const { W, H } = info,
    layer = new Float32Array(W * H);
  const sun = [14, -20, 6]; // the render's sun shines from (-14, 20, -6)
  // Through the side (west) wall's windows, where the low sun stands.
  const windows: [number, number, number][][] = L.westWindows.map((z) => [
    [L.x0 + 0.05, 1.8, z - 0.95],
    [L.x0 + 0.05, 1.8, z + 0.95],
    [L.x0 + 0.05, L.windowH, z + 0.95],
    [L.x0 + 0.05, L.windowH, z - 0.95],
  ]);
  for (const win of windows) {
    const lit = win.map(([X, Y, Z]) => {
      const t = (Y * KV) / -sun[1];
      return [X + sun[0] * t, 0.02, Z + sun[2] * t] as [number, number, number];
    });
    const pts = [...win, ...lit].map(([X, Y, Z]) => at(X, Y, Z));
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length,
      cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    pts.sort(
      (a, b) =>
        Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx),
    );
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><polygon fill="white" points="${pts.map((p) => p.join(',')).join(' ')}"/></svg>`;
    const { data } = await sharp(Buffer.from(svg))
      .blur(6)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const top = Math.min(...pts.map((p) => p[1])),
      bottom = Math.max(...pts.map((p) => p[1]));
    for (let y = 0; y < H; y++) {
      // Brightest at the window, fading towards the floor.
      const fade =
        Math.min(1, Math.max(0, 1 - (y - top) / (bottom - top))) * 0.65 + 0.35;
      for (let x = 0; x < W; x++) {
        const i = y * W + x,
          a = (data[i * (data.length / (W * H))] / 255) * fade;
        if (a > layer[i]) layer[i] = a;
      }
    }
  }
  const rgba = Buffer.alloc(info.W * info.H * 4);
  for (let i = 0; i < layer.length; i++) {
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 214;
    rgba[i * 4 + 2] = 140;
    rgba[i * 4 + 3] = Math.min(255, Math.round(layer[i] * 120));
  }
  return sharp(rgba, { raw: { width: info.W, height: info.H, channels: 4 } })
    .png()
    .toBuffer();
}
renders.set('shafts', await shafts());

/* ── Each piece: where it stands on the floor ── */
type Base =
  | { point: [number, number] }
  | { path: [number, number][] }
  | { landing: true };
function baseOf(k: string): Base {
  // The floor is baked into the ground texture (at its far corner). The
  // planet is strongly curved this far from the quarter's centre, so every
  // tall piece is cut into narrow strips, each standing on its own floor
  // point: the walls along their foot, the sun shafts where they land.
  if (k === 'floor') return { point: [L.x0 - 0.45, L.z0 - 0.45] };
  if (k === 'walls')
    return {
      path: [
        [L.x0, L.z1],
        [L.x0, L.z0],
        [L.x1, L.z0],
      ],
    };
  if (k === 'shafts') return { landing: true };
  if (k === 'partition')
    return {
      path: [
        [L.partition.x0, L.partition.z],
        [L.partition.x1, L.partition.z],
      ],
    };
  const n = +k.slice(k.lastIndexOf('-') + 1);
  if (k.startsWith('column-')) return { point: L.columns[n] };
  if (k.startsWith('plant-')) return { point: L.plants[n] };
  if (k.startsWith('lantern-'))
    return { point: [L.lanterns[n][0], L.lanterns[n][1]] };
  if (k.startsWith('arch-')) {
    const [x, z] = L.arches[n];
    return {
      path: [
        [x, z - 2.5],
        [x, z + 2.5],
      ],
    };
  }
  if (k.startsWith('rib-')) {
    const z = +k.slice(4) / 10;
    return {
      path: [
        [-10, z],
        [10, z],
      ],
    };
  }
  throw Error(`No base for ${k}`);
}
const OUT = 'art/supplied/prayer-hall';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const index = JSON.parse(fs.readFileSync('art/supplied/index.json', 'utf8'));
for (const key of Object.keys(index))
  if (key.startsWith('sup-ph-')) delete index[key];
const placed: { type: string; at: [number, number]; blocks: boolean }[] = [];
const SOURCE =
  "Owner's 3D mosque model (mosque-six-angle-final, 2026-11), rendered by tools/prepare-mosque-hall.ts";
async function emit(
  name: string,
  img: sharp.Sharp,
  left: number,
  top: number,
  foot: [number, number],
  X: number,
  Z: number,
  blocks = false,
  floor = false,
) {
  const file = `${OUT}/${name}.png`;
  await img.png().toFile(file);
  index[`sup-ph-${name}`] = {
    file: `supplied/prayer-hall/${name}.png`,
    anchor: [Math.round(foot[0] - left), Math.round(foot[1] - top)],
    density: D,
    ...(floor ? { floor: true } : {}),
    source: SOURCE,
  };
  placed.push({ type: `sup-ph-${name}`, at: tileOf(X, Z), blocks });
}
const STRIP = 32, // render px: 16 world px, like the build's wall slices
  OVERLAP = 3;
/** The point of a floor polyline whose image lies under pixel column x. */
function onPath(path: [number, number][], x: number): [number, number] {
  let best: [number, number] = path[0],
    gap = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [ground(...path[i - 1]), ground(...path[i])],
      t = Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0] || 1))),
      px = a[0] + (b[0] - a[0]) * t,
      d = Math.abs(px - x);
    if (d < gap) {
      gap = d;
      best = [
        path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t,
        path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t,
      ];
    }
  }
  return best;
}
/** The floor point under pixel (x, y), kept inside the hall. */
function landing(x: number, y: number): [number, number] {
  const du = [u[0] - o[0], u[1] - o[1]],
    dw = [w[0] - o[0], w[1] - o[1]],
    det = du[0] * dw[1] - dw[0] * du[1],
    rx = x - o[0],
    ry = y - o[1],
    X = (rx * dw[1] - dw[0] * ry) / det,
    Z = (du[0] * ry - rx * du[1]) / det;
  return [
    Math.min(L.x1 - 0.2, Math.max(L.x0 + 0.2, X)),
    Math.min(L.z1 - 0.2, Math.max(L.z0 + 0.2, Z)),
  ];
}
for (const [k, png] of renders) {
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
  const base = baseOf(k);
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
      ground(X, Z),
      X,
      Z,
      // Nothing blocks: no one walks into the hall's pieces, and the
      // children's game of tag circles a column.
      false,
      k === 'floor',
    );
    continue;
  }
  // Long pieces: vertical strips, each standing on the point of the base
  // line under its middle, so figures sort in front of or behind each part.
  // The tall walls and the light use narrower strips still: each strip
  // stands rigidly on the curved ground, so narrow ones keep the joins
  // between neighbours to a pixel.
  const strip = k === 'walls' || k === 'shafts' ? STRIP / 2 : STRIP;
  for (let sx = x0, n = 0; sx <= x1; sx += strip, n++) {
    const w = Math.min(strip, x1 - sx + 1),
      mid = sx + w / 2;
    let top = -1,
      bottom = -1;
    for (let y = y0; y <= y1; y++)
      for (let x = sx; x < sx + w; x++)
        if (data[(y * im.width + x) * 4 + 3]) {
          if (top < 0) top = y;
          bottom = y;
          break;
        }
    if (top < 0) continue;
    const [X, Z] =
      'path' in base ? onPath(base.path, mid) : landing(mid, bottom);
    await emit(
      `${k}-${n}`,
      // Each strip overlaps its neighbours by a few pixels, so the slightly
      // different tilt of neighbouring strips never opens a gap.
      sharp(png).extract({
        left: Math.max(0, sx - OVERLAP),
        top,
        width: Math.min(im.width, sx + w + OVERLAP) - Math.max(0, sx - OVERLAP),
        height: bottom - top + 1,
      }),
      Math.max(0, sx - OVERLAP),
      top,
      ground(X, Z),
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
  'art/supplied/prayer-hall.json',
  JSON.stringify(placed, null, 2) + '\n',
);
console.log(
  `Prayer hall: ${placed.length} pieces from ${renders.size} renders.`,
);
