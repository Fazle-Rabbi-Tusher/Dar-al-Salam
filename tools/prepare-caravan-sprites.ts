import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import {
  CARAVAN,
  caravanActors,
  caravanModel,
  rigMatrices,
} from '../packages/shared/royal-caravan';
import { TILE_SIDE } from '../packages/shared/planet';
import type { Face3 } from '../packages/shared/infrastructure';

/*
 * Mansa Musa's caravan in the world's pixel-art style (owner's request,
 * 2026-11: "make Mansa Musa's things like the other existing art style and
 * place them on the desert").
 *
 * The caravan's own articulated rig (packages/shared/royal-caravan.ts:
 * the mounted ruler, twelve guards, four loaded camels, the handover
 * stewards and recipients, the gold carriers and the waiting elephant) is
 * rendered tick by tick, each actor alone, in the world's 2:1 isometric view
 * (tools/caravan/render.html). Every actor keeps its exact gait, heading and
 * gestures over the 240-tick loop.
 *
 * Realistic desert look (owner's request, 2026-11-26: "it should look ultra
 * realistic and it should blend with the desert"): physically based light
 * (a warm afternoon sun from the world's upper left, a desert sky and sunlit
 * sand for fill and gold reflections), materials per finish, smooth normals,
 * sand dust on hems and hooves, soft self-shadowing and a translucent cast
 * shadow on the sand. Renders are supersampled 2× and averaged down; the
 * full colour range is kept. Pack camels and the elephant are drawn at the
 * world's scale. Repeated poses are merged, and the build adds the outline
 * every strip gets. The actor walks the same route as before, in the open
 * desert west of Massawa (CARAVAN.center), stepping to its sampled place
 * each tick.
 *
 * Still pieces (the three handover stalls, the treasury and the travel
 * equipment) become supplied sprites planted with Massawa's desert pieces.
 *
 *   node --import tsx tools/prepare-caravan-sprites.ts [workdir]
 *   CARAVAN_PREVIEW=1 …  renders tick 0 only, to <workdir>/preview.png
 *
 * Writes art/sprites/anim/caravan-*, mansa-musa__ride_*, art/supplied/caravan-*,
 * content/ambient/caravan.json, Mansa Musa's script and supplied index entries.
 */
const D = 3; // sprite px per world px; one model unit is one world px
const TICKS = 240;
const vendor = path.resolve('web/public/models/mali-caravan/vendor');
const R2 = Math.SQRT1_2,
  COS30 = Math.cos(Math.PI / 6);
/** Screen offset (sprite px, y down) of a model point in the isometric view. */
const screen = (p: number[]) => [
  (p[0] - p[2]) * R2 * D,
  ((p[0] + p[2]) * R2 * 0.5 - p[1] * COS30) * D,
];
/** Renders are supersampled this much, then averaged down to the sprite. */
const SS = 2;
/** The sun (tools/caravan/render.html): upper left, about 58° high. */
const SUN = (() => {
  const v = [-R2 * 0.46 + R2 * 0.22, 0.86, R2 * 0.46 + R2 * 0.22],
    l = Math.hypot(...v);
  return v.map((c) => c / l);
})();
/** Where a point's shadow falls on the sand. */
const shadowOf = (p: number[]) => {
  const k = Math.max(0, p[1]) / SUN[1];
  return [p[0] - SUN[0] * k, 0, p[2] - SUN[2] * k];
};
/**
 * Animals at the world's scale: the rig's pack camels stood 3.7 m tall
 * beside 1.75 m people (and twice the world's own camels), its elephant
 * over 5 m. Each is drawn smaller about its own feet.
 */
const SCALE = (a: string) =>
  a.startsWith('pack-camel') ? 0.76 : a.includes('elephant') ? 0.88 : 1;
const tileOf = (x: number, z: number): [number, number] => [
  +(CARAVAN.center[0] + x / TILE_SIDE).toFixed(3),
  +(CARAVAN.center[1] + z / TILE_SIDE).toFixed(3),
];

/* ── The rig's joints and actors ── */
const GROUPS = new Set(['gold-carriers-and-people', 'elephant-and-gold-cargo']);
/** Small loose things passed between hands: drawn with whoever is nearest. */
const LOOSE =
  /^(gift-coin|gold-pouch|carrier-transferred-gold-coin|shared-chest-rig)/;
const actorOf = (jointPath: string) => {
  const p = jointPath.split('/');
  const name = GROUPS.has(p[2]) ? p[3] : p[2];
  // The ruler rides: horse and rider are one figure.
  return name === 'royal-horse' ? 'mansa-musa' : name;
};
const rootPath = (actor: string, sample: Map<string, unknown>) => {
  if (actor === 'mansa-musa') return '/mali-gold-caravan/royal-horse';
  if (sample.has(`/mali-gold-caravan/${actor}`))
    return `/mali-gold-caravan/${actor}`;
  for (const g of GROUPS)
    if (sample.has(`/mali-gold-caravan/${g}/${actor}`))
      return `/mali-gold-caravan/${g}/${actor}`;
  throw Error(`No root for ${actor}`);
};
const first = rigMatrices(caravanActors(0));
const joints = [...first].filter(([, v]) => v.node.faces?.length);
const actorNames = [...new Set(joints.map(([k]) => actorOf(k)))];
const loose = actorNames.filter((a) => LOOSE.test(a));
const actors = actorNames.filter((a) => !LOOSE.test(a));
console.log(`${joints.length} joints, ${actors.length} actors`);

/* ── Geometry upload: one triangle list per joint, in its own frame ── */
const tmp =
  process.argv[2] ?? fs.mkdtempSync(path.join(os.tmpdir(), 'caravan-'));
fs.mkdirSync(`${tmp}/data`, { recursive: true });
const hex = (c: string) =>
  [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
const finishOf = (f: Face3 & { finish?: string }) => [
  f.finish === 'gold'
    ? 0.24
    : f.finish === 'face' || f.finish === 'skin'
      ? 0.56
      : 0.88,
  f.finish === 'gold' ? 0.92 : f.finish === 'brocade' ? 0.16 : 0,
  f.finish ? 1 : 0,
];
/**
 * Triangle lists for faces (fans), with supplied normals, or else smooth
 * ones: faces meeting at a corner share their averaged normal unless they
 * fold sharply (a real edge), so hides and wood read rounded, not faceted.
 */
function triangles(
  faces: (Face3 & { finish?: string; normals?: number[][] })[],
) {
  const pos: number[] = [],
    nor: number[] = [],
    col: number[] = [],
    fin: number[] = [];
  const flatOf = (f: Face3) => {
    const [a, b, c] = f.points,
      u = b.map((v, i) => v - a[i]),
      w = c.map((v, i) => v - a[i]),
      n = [
        u[1] * w[2] - u[2] * w[1],
        u[2] * w[0] - u[0] * w[2],
        u[0] * w[1] - u[1] * w[0],
      ];
    return n; // area-weighted
  };
  const key = (p: number[]) => p.map((v) => Math.round(v * 200)).join(',');
  const shared = new Map<string, number[][]>();
  for (const f of faces) {
    if (f.normals) continue;
    const n = flatOf(f);
    for (const p of f.points) {
      const k = key(p);
      if (!shared.has(k)) shared.set(k, []);
      shared.get(k)!.push(n);
    }
  }
  const unit = (n: number[]) => {
    const l = Math.hypot(...n) || 1;
    return n.map((v) => v / l);
  };
  for (const f of faces) {
    const flat = unit(flatOf(f)),
      colour = hex(f.color),
      finish = finishOf(f);
    const smooth = (p: number[]) => {
      const sum = [0, 0, 0];
      for (const n of shared.get(key(p)) ?? []) {
        const u = unit(n);
        // Only neighbours within ~50° of this face round it off.
        if (u[0] * flat[0] + u[1] * flat[1] + u[2] * flat[2] > 0.64)
          for (let i = 0; i < 3; i++) sum[i] += n[i];
      }
      return Math.hypot(...sum) ? unit(sum) : flat;
    };
    for (let i = 1; i < f.points.length - 1; i++)
      for (const k of [0, i, i + 1]) {
        pos.push(...f.points[k]);
        nor.push(...(f.normals?.[k] ?? smooth(f.points[k])));
        col.push(...colour);
        fin.push(...finish);
      }
  }
  return { pos, nor, col, fin };
}
{
  const chunks: Float32Array[] = [];
  let offset = 0;
  const meta = joints.map(([, v]) => {
    const t = triangles(v.node.faces as never);
    const entry = {
      count: t.pos.length / 3,
      position: 0,
      normal: 0,
      color: 0,
      finish: 0,
    };
    for (const key of ['position', 'normal', 'color', 'finish'] as const) {
      const data = new Float32Array(
        key === 'position'
          ? t.pos
          : key === 'normal'
            ? t.nor
            : key === 'color'
              ? t.col
              : t.fin,
      );
      entry[key] = offset;
      offset += data.length;
      chunks.push(data);
    }
    return entry;
  });
  const out = fs.createWriteStream(`${tmp}/data/joints.bin`);
  for (const c of chunks)
    out.write(Buffer.from(c.buffer, c.byteOffset, c.byteLength));
  await new Promise((r) => out.end(r));
  fs.writeFileSync(
    `${tmp}/data/joints.json`,
    JSON.stringify({ density: D, joints: meta }),
  );
}
/** Each joint's corners in its own frame, for screen bounds. */
const corners = joints.map(([, v]) => {
  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  for (const f of v.node.faces!)
    for (const p of f.points)
      for (let i = 0; i < 3; i++) {
        lo[i] = Math.min(lo[i], p[i]);
        hi[i] = Math.max(hi[i], p[i]);
      }
  const out: number[][] = [];
  for (const x of [lo[0], hi[0]])
    for (const y of [lo[1], hi[1]])
      for (const z of [lo[2], hi[2]]) out.push([x, y, z]);
  return out;
});
const transform = (m: Float32Array, p: number[]) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];

/* ── Every tick: joint matrices, roots, who holds the loose things, bounds ── */
type Tick = {
  matrices: string;
  roots: Record<string, number[]>;
  members: Record<string, number[]>;
  /** This tick's own screen box per actor (relative to its root, sprite px). */
  tight: Record<string, number[]>;
};
const ticks: Tick[] = [];
const bounds = new Map(actors.map((a) => [a, [0, 0, 0, 0]]));
for (let t = 0; t < TICKS; t++) {
  const m = rigMatrices(caravanActors(t)),
    all = new Float32Array(joints.length * 16);
  joints.forEach(([k], i) => all.set(m.get(k)!.matrix, i * 16));
  const roots: Record<string, number[]> = {};
  for (const a of actors)
    roots[a] = [...m.get(rootPath(a, m))!.matrix.slice(12, 15)];
  const members: Record<string, number[]> = Object.fromEntries(
    actors.map((a) => [a, []]),
  );
  joints.forEach(([k], i) => {
    let a = actorOf(k);
    if (LOOSE.test(a)) {
      // With whoever is nearest (a coin in a hand, a chest between porters).
      const p = transform(all.subarray(i * 16, i * 16 + 16), [0, 0, 0]);
      a = actors
        .filter((b) => !/treasury|equipment|elephant|camel/.test(b))
        .reduce((best, b) =>
          Math.hypot(roots[b][0] - p[0], roots[b][2] - p[2]) <
          Math.hypot(roots[best][0] - p[0], roots[best][2] - p[2])
            ? b
            : best,
        );
    }
    members[a].push(i);
  });
  const tight: Record<string, number[]> = {};
  for (const a of actors) {
    const root = roots[a],
      r = screen(root),
      k = SCALE(a),
      b = (tight[a] = [Infinity, Infinity, -Infinity, -Infinity]);
    for (const i of members[a])
      for (const c of corners[i]) {
        const w = transform(all.subarray(i * 16, i * 16 + 16), c),
          scaled = [
            root[0] + (w[0] - root[0]) * k,
            w[1] * k,
            root[2] + (w[2] - root[2]) * k,
          ];
        // The figure and the shadow it casts on the sand.
        for (const p of [scaled, shadowOf(scaled)]) {
          const s = screen(p);
          b[0] = Math.min(b[0], s[0] - r[0]);
          b[1] = Math.min(b[1], s[1] - r[1]);
          b[2] = Math.max(b[2], s[0] - r[0]);
          b[3] = Math.max(b[3], s[1] - r[1]);
        }
      }
  }
  for (const a of actors) {
    const b = bounds.get(a)!,
      own = tight[a];
    for (let i = 0; i < 4; i++)
      b[i] = i < 2 ? Math.min(b[i], own[i]) : Math.max(b[i], own[i]);
  }
  ticks.push({
    matrices: Buffer.from(all.buffer).toString('base64'),
    roots,
    members,
    tight,
  });
}
void loose;
/**
 * Figures drawn alike share their poses: guards of one colour (every third
 * guard), and the four pack camels. Everyone else is their own design.
 */
const designOf = (a: string) => {
  const guard = /^guard-(\d+)$/.exec(a);
  if (guard) return `guard-${(+guard[1] - 1) % 3}`;
  return a.startsWith('pack-camel') ? 'pack-camel' : a;
};
/** How many poses each design may keep (the atlas budget). */
const BUDGET = (design: string) =>
  design === 'mansa-musa'
    ? 48
    : design === 'pack-camel'
      ? 40
      : design.startsWith('guard') || design.includes('elephant')
        ? 32
        : 20;
const designBounds = new Map<string, number[]>();
for (const a of actors) {
  const b = bounds.get(a)!,
    d = designBounds.get(designOf(a)) ?? [0, 0, 0, 0];
  designBounds.set(designOf(a), [
    Math.min(d[0], b[0]),
    Math.min(d[1], b[1]),
    Math.max(d[2], b[2]),
    Math.max(d[3], b[3]),
  ]);
}
/** Frame size and foot point per actor (its design's): the foot centred. */
const frames = new Map(
  actors.map((a) => {
    const [x0, y0, x1, y1] = designBounds.get(designOf(a))!,
      half = Math.ceil(Math.max(-x0, x1)) + 3,
      top = Math.ceil(-y0) + 3,
      bottom = Math.ceil(y1) + 3;
    return [a, { W: half * 2, H: top + bottom, fx: half, fy: top }];
  }),
);

/* ── Render ── */
const roots: Record<string, string> = {
  three: vendor,
  render: path.resolve('tools/caravan'),
  data: `${tmp}/data`,
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
    'content-type': file.endsWith('.html')
      ? 'text/html'
      : file.endsWith('.js')
        ? 'text/javascript'
        : 'application/octet-stream',
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
await page.goto(`http://127.0.0.1:${port}/render/render.html`);
await page.waitForFunction('window.READY === true', null, { timeout: 600000 });
type Raw = { data: Buffer; W: number; H: number };
const shots = new Map<string, Raw[]>(actors.map((a) => [a, []]));
/**
 * The supersampled render averaged down to the sprite. The figure stays
 * solid (the build outlines solid pixels); its cast shadow stays a light,
 * translucent wash that the build leaves unoutlined (alpha at most 90).
 */
const decode = async (url: string, W: number, H: number): Promise<Raw> => {
  const { data } = await sharp(Buffer.from(url.split(',')[1], 'base64'))
    .ensureAlpha()
    .resize(W, H, { kernel: 'mitchell' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4)
    if (data[i] >= 112) data[i] = 255;
    else if (data[i] < 6) data[i] = data[i - 1] = data[i - 2] = data[i - 3] = 0;
    else {
      // Shadow on sand: a warm umber, deepest under the figure.
      [data[i - 3], data[i - 2], data[i - 1]] = [59, 36, 18];
      data[i] = Math.min(data[i], 90);
    }
  return { data, W, H };
};
// Renders are cached in the work folder: a rerun only redoes the merging.
const cache = (a: string, t: number) => `${tmp}/shots/${a}/${t}.png`;
for (const a of actors) fs.mkdirSync(`${tmp}/shots/${a}`, { recursive: true });
const cacheKey = JSON.stringify(['realistic-4-roam', SS, [...frames]]);
const cached =
  fs.existsSync(`${tmp}/shots/key.json`) &&
  fs.readFileSync(`${tmp}/shots/key.json`, 'utf8') === cacheKey &&
  actors.every((a) => fs.existsSync(cache(a, TICKS - 1)));
for (const [t, tick] of ticks.entries()) {
  if (!cached)
    await page.evaluate(
      (b64) => (window as unknown as { pose(s: string): void }).pose(b64),
      tick.matrices,
    );
  for (const a of actors) {
    const f = frames.get(a)!;
    if (cached) {
      const { data } = await sharp(cache(a, t))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      shots.get(a)!.push({ data, W: f.W, H: f.H });
      continue;
    }
    // Only this tick's own box is rendered (a roaming figure's frame holds
    // every heading it takes), then placed in the frame at its foot point.
    const [x0, y0, x1, y1] = tick.tight[a],
      left = Math.max(0, Math.floor(f.fx + x0) - 2),
      top = Math.max(0, Math.floor(f.fy + y0) - 2),
      w = Math.min(f.W, Math.ceil(f.fx + x1) + 2) - left,
      h = Math.min(f.H, Math.ceil(f.fy + y1) + 2) - top;
    const url = (await page.evaluate(
      (arg) => (window as unknown as { shoot(a: unknown): string }).shoot(arg),
      {
        joints: tick.members[a],
        root: tick.roots[a],
        W: w,
        H: h,
        fx: f.fx - left,
        fy: f.fy - top,
        ss: SS,
        scale: SCALE(a),
      },
    )) as string;
    const part = await decode(url, w, h),
      raw: Raw = { data: Buffer.alloc(f.W * f.H * 4), W: f.W, H: f.H };
    for (let y = 0; y < h; y++)
      part.data.copy(
        raw.data,
        ((top + y) * f.W + left) * 4,
        y * w * 4,
        (y + 1) * w * 4,
      );
    await sharp(raw.data, { raw: { width: f.W, height: f.H, channels: 4 } })
      .png()
      .toFile(cache(a, t));
    shots.get(a)!.push(raw);
  }
  if (t % 40 === 0) console.log(`tick ${t}${cached ? ' (cached)' : ''}`);
  // CARAVAN_PREVIEW=1: tick 0 only, every figure on sand, then stop.
  if (process.env.CARAVAN_PREVIEW) {
    const list = actors.map((a) => ({ a, img: shots.get(a)![0] })),
      width = list.reduce((s, { img }) => s + img.W, 0),
      height = Math.max(...list.map(({ img }) => img.H));
    let x = 0;
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 214, g: 164, b: 104, alpha: 1 },
      },
    })
      .composite(
        list.map(({ img }) => {
          const left = x;
          x += img.W;
          return {
            input: img.data,
            raw: { width: img.W, height: img.H, channels: 4 as const },
            left,
            top: height - img.H,
          };
        }),
      )
      .png()
      .toFile(`${tmp}/preview.png`);
    console.log(`Preview: ${tmp}/preview.png`);
    await browser.close();
    server.close();
    process.exit(0);
  }
}
fs.writeFileSync(`${tmp}/shots/key.json`, cacheKey);

/* ── Dropped gold: coins falling where the caravan passes, then glinting ── */
/*
 * Owner's request (2026-11-26): "donating shining gold and dropping shining,
 * blinking gold wherever they walk past". The bearers, the pack camels'
 * baskets and the ruler's hand let a few coins fall as they walk. Each drop
 * is its own small figure on the sand: the coins fall and tumble from the
 * height they left, bounce, rest and twinkle, then flash once and are gone
 * (a passer-by's share). Coins are the rig's own gold-coin mesh, lit like
 * the rest; the twinkle is a small four-pointed glint on the brightest
 * spot. Everything is fixed per tick on the 240-tick loop.
 */
const LIFE = 96;
const DROPPERS: Record<
  string,
  { period: number; offset: number; height: number }
> = {
  'overhead-gold-bearer': { period: 34, offset: 5, height: 78 },
  'bowl-gold-bearer': { period: 30, offset: 17, height: 52 },
  'chest-porter-rust': { period: 38, offset: 9, height: 44 },
  'mansa-musa': { period: 26, offset: 3, height: 68 },
  'pack-camel-1': { period: 44, offset: 11, height: 46 },
  'pack-camel-2': { period: 44, offset: 33, height: 46 },
  'pack-camel-3': { period: 44, offset: 22, height: 46 },
  'pack-camel-4': { period: 44, offset: 0, height: 46 },
};
type Drop = { tick: number; at: number[]; height: number; variant: number };
const drops: Drop[] = [];
for (const [a, d] of Object.entries(DROPPERS)) {
  if (!actors.includes(a)) throw Error(`No dropper ${a}`);
  for (let t = 0; t < TICKS; t++) {
    if ((t + d.offset) % d.period) continue;
    const p = ticks[t].roots[a],
      q = ticks[(t + 1) % TICKS].roots[a],
      v = [q[0] - p[0], q[2] - p[2]],
      speed = Math.hypot(...v);
    // Only while walking: nothing falls at the handovers.
    if (speed < 1.2) continue;
    const back = v.map((c) => c / speed),
      side = drops.length % 2 ? 7 : -7;
    drops.push({
      tick: t,
      at: [
        p[0] - back[0] * 12 + back[1] * side,
        0,
        p[2] - back[1] * 12 - back[0] * side,
      ],
      height: d.height * (a.startsWith('pack-camel') ? SCALE(a) : 1),
      variant: drops.length % 4,
    });
  }
}
/** Small 4×4 column-major matrices for the coins. */
const mat = {
  mul(a: number[], b: number[]) {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
  },
  t: (x: number, y: number, z: number) => [
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    x,
    y,
    z,
    1,
  ],
  rx: (a: number) => [
    1,
    0,
    0,
    0,
    0,
    Math.cos(a),
    Math.sin(a),
    0,
    0,
    -Math.sin(a),
    Math.cos(a),
    0,
    0,
    0,
    0,
    1,
  ],
  ry: (a: number) => [
    Math.cos(a),
    0,
    -Math.sin(a),
    0,
    0,
    1,
    0,
    0,
    Math.sin(a),
    0,
    Math.cos(a),
    0,
    0,
    0,
    0,
    1,
  ],
  s: (k: number) => [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1],
};
const coinJoints = [1, 2, 3].map((i) => {
  const j = joints.findIndex(([k]) => k.endsWith(`/gift-coin-${i}`));
  if (j < 0) throw Error('No gift coin joint');
  return j;
});
/** Three coins per drop, four arrangements: offset, rest yaw and tilt. */
const PILES = [
  [
    [0, 0, 0, 0.2, 0],
    [4.6, 0, 1.8, 1.3, 0.18],
    [-2.2, 0.9, 3.4, 2.4, 0.3],
  ],
  [
    [0, 0, 0, 1.1, 0.05],
    [-4.2, 0, -1.2, 0.4, 0],
    [1.4, 0.9, -3.6, 2.9, 0.26],
  ],
  [
    [0, 0, 0, 2.0, 0],
    [3.4, 0, -3.1, 0.7, 0.1],
    [-3.8, 0, 2.6, 1.9, 0.05],
  ],
  [
    [0, 0.9, 0, 0.6, 0.22],
    [2.6, 0, 3.0, 2.2, 0],
    [-3.4, 0, -1.6, 1.4, 0.12],
  ],
];
const COIN = 1.35; // the rig's coin, a little larger so it reads on the sand
/** Coin matrices for a pile at `root`, `fall` model units up, tumbling by `spin`. */
function pile(root: number[], variant: number, fall: number, spin: number) {
  return PILES[variant].map(([dx, dy, dz, yawA, tilt], i) =>
    mat.mul(
      mat.t(
        root[0] + dx * (1 + fall / 30),
        0.62 * COIN + dy + fall * (1 - i * 0.12),
        root[2] + dz * (1 + fall / 30),
      ),
      mat.mul(
        mat.ry(yawA + spin * (1 + i * 0.4)),
        mat.mul(
          mat.rx(-Math.PI / 2 + tilt + spin * (1.6 - i * 0.3)),
          mat.s(COIN),
        ),
      ),
    ),
  );
}
const DW = 180,
  DH = 300,
  DFX = 70,
  DFY = 280;
/** Renders one pile state to a frame (foot at DFX, DFY). */
async function shootPile(variant: number, fall: number, spin: number) {
  const root = [0, 0, 0],
    m = pile(root, variant, fall, spin);
  for (const [i, j] of coinJoints.entries())
    await page.evaluate(
      ([index, matrix]) =>
        (window as unknown as { place(i: number, m: number[]): void }).place(
          index as number,
          matrix as number[],
        ),
      [j, m[i]],
    );
  const url = (await page.evaluate(
    (arg) => (window as unknown as { shoot(a: unknown): string }).shoot(arg),
    { joints: coinJoints, root, W: DW, H: DH, fx: DFX, fy: DFY, ss: SS },
  )) as string;
  return decode(url, DW, DH);
}
/** A four-pointed glint on the pile's brightest pixel. */
function glint(img: Raw, size: number) {
  const out = { ...img, data: Buffer.from(img.data) };
  let best = -1,
    bx = DFX,
    by = DFY;
  for (let y = 0; y < DH; y++)
    for (let x = 0; x < DW; x++) {
      const i = (y * DW + x) * 4;
      if (out.data[i + 3] < 255) continue;
      const l = out.data[i] + out.data[i + 1] + out.data[i + 2];
      if (l > best) {
        best = l;
        bx = x;
        by = y;
      }
    }
  const put = (x: number, y: number, c: number[]) => {
    if (x < 0 || y < 0 || x >= DW || y >= DH) return;
    out.data.set([...c, 255], (y * DW + x) * 4);
  };
  const core = [255, 255, 246],
    warm = [255, 240, 170],
    gold = [247, 206, 92];
  for (let k = -size; k <= size; k++) {
    const c = Math.abs(k) <= 1 ? core : Math.abs(k) <= size / 2 ? warm : gold;
    put(bx + k, by, c);
    put(bx, by + k, c);
  }
  if (size >= 4)
    for (const [dx, dy] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ])
      put(bx + dx, by + dy, warm);
  return out;
}
const empty: Raw = { data: Buffer.alloc(DW * DH * 4), W: DW, H: DH };
/** Frames per (variant, height): fall ×4, bounce, rest, small and big glint. */
const pileFrames = new Map<string, Raw[]>();
for (const d of drops) {
  const key = `${d.variant}-${Math.round(d.height)}`;
  if (pileFrames.has(key)) continue;
  const frames: Raw[] = [];
  for (let k = 0; k < 4; k++)
    frames.push(
      await shootPile(d.variant, d.height * (1 - (k / 4) ** 2), (4 - k) * 0.9),
    );
  frames.push(await shootPile(d.variant, 3, 0.25));
  const rest = await shootPile(d.variant, 0, 0);
  frames.push(rest, glint(rest, 3), glint(rest, 6));
  pileFrames.set(key, frames);
}
console.log(`Gold drops: ${drops.length}, ${pileFrames.size} piles.`);

/* ── The still stalls: three handover tables and their awnings ── */
const market = caravanModel('mali-gold-caravan')!.faces.filter((f) => {
  const c = [0, 1, 2].map(
    (i) => f.points.reduce((s, p) => s + p[i], 0) / f.points.length,
  );
  // The stalls, not the plot's flat ground marks.
  return c[1] > 0.5 && c[2] > 110 && c[2] < 200 && Math.abs(c[0]) < 230;
});
const stallParts: { id: string; faces: Face3[]; at: number[] }[] = [];
for (const [i, x] of CARAVAN.stops.entries()) {
  const mine = market.filter((f) => Math.abs(f.points[0][0] - x - 16) < 70);
  const cz = (f: Face3) =>
    f.points.reduce((s, p) => s + p[2], 0) / f.points.length;
  stallParts.push(
    {
      id: `caravan-stall-${i + 1}`,
      faces: mine.filter((f) => cz(f) < 158),
      at: [x + 47, 0, 156],
    },
    {
      id: `caravan-awning-${i + 1}`,
      faces: mine.filter((f) => cz(f) >= 158),
      at: [x, 0, 185],
    },
  );
}
await page.evaluate(() => 0);
await browser.close();
server.close();

/* ── Merge repeated poses; reduce colours ── */
function difference(a: Raw, b: Raw) {
  let n = 0,
    solid = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const sa = a.data[i + 3] > 0,
      sb = b.data[i + 3] > 0;
    if (sa || sb) solid++;
    if (sa !== sb) n++;
    else if (
      sa &&
      Math.abs(a.data[i] - b.data[i]) +
        Math.abs(a.data[i + 1] - b.data[i + 1]) +
        Math.abs(a.data[i + 2] - b.data[i + 2]) >
        60
    )
      n++;
  }
  return solid ? n / solid : 0;
}
const THRESHOLD = 0.02;
const ACTION = (a: string) =>
  a === 'mansa-musa'
    ? 'ride'
    : /camel|elephant/.test(a)
      ? 'animal_walk'
      : 'walk';
const idOf = (a: string) => (a === 'mansa-musa' ? a : `caravan-${a}`);
const still = actors.filter((a) =>
  /foreground-treasury|travel-equipment/.test(a),
);
const moving = actors.filter((a) => !still.includes(a));
for (const old of fs.readdirSync('art/sprites/anim'))
  if (old.startsWith('caravan-') || old.startsWith('mansa-musa__'))
    fs.rmSync(`art/sprites/anim/${old}`);
let uniqueTotal = 0;
const ambient: unknown[] = [];
/*
 * Each design keeps at most BUDGET poses: the most different frames over the
 * whole loop (farthest-point picks), and every tick shows the nearest one.
 * Frames closer than THRESHOLD to a kept pose are not worth another.
 */
const chosen = new Map<string, { reps: Raw[]; seq: Map<string, number[]> }>();
for (const design of new Set(moving.map(designOf))) {
  const members = moving.filter((a) => designOf(a) === design),
    pool = members.flatMap((a) => shots.get(a)!.map((img) => ({ a, img }))),
    reps: Raw[] = [pool[0].img],
    near = pool.map((p) => difference(p.img, reps[0])),
    owner = pool.map(() => 0);
  while (reps.length < BUDGET(design)) {
    let far = 0;
    near.forEach((d, i) => {
      if (d > near[far]) far = i;
    });
    if (near[far] < THRESHOLD) break;
    reps.push(pool[far].img);
    pool.forEach((p, i) => {
      const d = difference(p.img, pool[far].img);
      if (d < near[i]) {
        near[i] = d;
        owner[i] = reps.length - 1;
      }
    });
  }
  const seq = new Map(members.map((a) => [a, [] as number[]]));
  pool.forEach((p, i) => seq.get(p.a)!.push(owner[i]));
  chosen.set(design, { reps, seq });
  uniqueTotal += reps.length;
  console.log(
    `${design}: ${reps.length} poses for ${members.length} figure(s)`,
  );
}
for (const a of moving) {
  const { reps, seq } = chosen.get(designOf(a))!,
    sequence = seq.get(a)!;
  const { W, H, fx, fy } = frames.get(a)!;
  const strip = await sharp({
    create: {
      width: W * reps.length,
      height: H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      reps.map((r, i) => ({
        input: r.data,
        raw: { width: W, height: H, channels: 4 as const },
        left: i * W,
        top: 0,
      })),
    )
    .png({ compressionLevel: 9 })
    .toBuffer();
  const base = `art/sprites/anim/${idOf(a)}__${ACTION(a)}`;
  const meta =
    JSON.stringify({
      frame: [W, H],
      foot: [fx, fy],
      density: D,
      tempo: 1,
      sequence,
    }) + '\n';
  for (const view of ['SE', 'NE']) {
    fs.writeFileSync(`${base}_${view}.png`, strip);
    fs.writeFileSync(`${base}_${view}.json`, meta);
  }
  // Its place every tick: standing still it waits, walking it steps along
  // a short path to its next place. It always holds the SE facing, so the
  // engine never turns or mirrors the heading baked into its poses.
  type Step = {
    from: number;
    to: number;
    action: string;
    at?: [number, number];
    path?: [number, number][];
    facing: 'SE';
  };
  const script: Step[] = [],
    place = (t: number) => {
      const r = ticks[t % TICKS].roots[a];
      return tileOf(r[0], r[2]);
    };
  for (let t = 0; t < TICKS; t++) {
    const p = place(t),
      q = place(t + 1),
      last = script.at(-1);
    if (p[0] === q[0] && p[1] === q[1]) {
      if (last?.at && last.at[0] === p[0] && last.at[1] === p[1])
        last.to = t + 1;
      else
        script.push({
          from: t,
          to: t + 1,
          action: ACTION(a),
          at: p,
          facing: 'SE',
        });
    } else
      script.push({
        from: t,
        to: t + 1,
        action: ACTION(a),
        path: [p, q],
        facing: 'SE',
      });
  }
  if (a === 'mansa-musa') {
    const file = 'content/characters/mansa-musa.json',
      card = JSON.parse(fs.readFileSync(file, 'utf8'));
    delete card.nativeModel;
    card.loop = TICKS;
    card.script = script;
    fs.writeFileSync(file, JSON.stringify(card, null, 2) + '\n');
  } else {
    const animal = /camel|elephant/.test(a);
    ambient.push({
      id: idOf(a),
      kind: animal ? 'animal' : 'person',
      aliases: [],
      district: 'maghreb',
      depiction: 'full',
      look: animal
        ? {
            base: 'camel',
            garment: 'none',
            headwear: 'none',
            prop: 'none',
            colours: {
              skin: 'skin-5',
              hair: 'hair-brown',
              garmentPrimary: 'khaki',
              garmentSecondary: 'wool-cream',
              headwear: 'white-linen',
              prop: 'madder-red',
            },
          }
        : {
            base: 'adult-man-beard',
            garment: 'boubou',
            headwear: 'imamah',
            prop: 'none',
            colours: {
              skin: 'skin-8',
              hair: 'hair-black',
              garmentPrimary: 'white-linen',
              garmentSecondary: 'madder-red',
              headwear: 'white-linen',
              prop: 'brass',
            },
          },
      loop: TICKS,
      script,
      role: ROLE(a),
    });
  }
}
function ROLE(a: string) {
  if (a.startsWith('guard'))
    return 'A guard of Mansa Musa’s caravan, lance and shield in hand';
  if (a.startsWith('pack-camel'))
    return 'A pack camel of the caravan, loaded with gold';
  if (a.includes('elephant'))
    return 'The caravan’s elephant, waiting under its loaded howdah';
  if (a.startsWith('gold-steward'))
    return 'A steward of the caravan handing out gold';
  if (a.includes('recipient'))
    return 'A townsperson receiving a share of the gold';
  return 'A bearer of the caravan’s gold';
}
// The dropped gold: one small figure per drop, all sharing the pile frames.
for (const [n, d] of drops.entries()) {
  const frames = [
      empty,
      ...pileFrames.get(`${d.variant}-${Math.round(d.height)}`)!,
    ],
    // 0 empty; 1–4 falling; 5 bounce; 6 rest; 7 small glint; 8 big glint.
    sequence = Array.from({ length: TICKS }, (_, t) => {
      const age = (t - d.tick + TICKS) % TICKS;
      if (age >= LIFE) return 0;
      if (age < 4) return 1 + age;
      if (age === 4) return 5;
      if (age === LIFE - 3) return 8; // a last flash, then gone
      if (age >= LIFE - 2) return age === LIFE - 2 ? 7 : 0;
      const twinkle = (age + n * 5) % 13;
      return twinkle === 0 ? 7 : twinkle === 1 ? 8 : twinkle === 2 ? 7 : 6;
    });
  const id = `caravan-gold-drop-${n + 1}`,
    strip = await sharp({
      create: {
        width: DW * frames.length,
        height: DH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(
        frames.map((r, i) => ({
          input: r.data,
          raw: { width: DW, height: DH, channels: 4 as const },
          left: i * DW,
          top: 0,
        })),
      )
      .png({ compressionLevel: 9 })
      .toBuffer();
  const meta =
    JSON.stringify({
      frame: [DW, DH],
      foot: [DFX, DFY],
      density: D,
      tempo: 1,
      outline: false,
      sequence,
    }) + '\n';
  for (const view of ['SE', 'NE']) {
    fs.writeFileSync(`art/sprites/anim/${id}__ball_still_${view}.png`, strip);
    fs.writeFileSync(`art/sprites/anim/${id}__ball_still_${view}.json`, meta);
  }
  ambient.push({
    id,
    kind: 'ball',
    aliases: [],
    district: 'maghreb',
    depiction: 'full',
    look: {
      base: 'ball',
      garment: 'none',
      headwear: 'none',
      prop: 'none',
      colours: {
        skin: 'skin-5',
        hair: 'hair-brown',
        garmentPrimary: 'brass',
        garmentSecondary: 'brass',
        headwear: 'brass',
        prop: 'brass',
      },
    },
    loop: TICKS,
    script: [
      {
        from: 0,
        to: TICKS,
        action: 'ball_still',
        at: tileOf(d.at[0], d.at[2]),
        facing: 'SE',
      },
    ],
    role: 'Gold the caravan let fall on the sand, glinting until someone gathers it',
  });
}
fs.writeFileSync(
  'content/ambient/caravan.json',
  JSON.stringify(ambient, null, 2) + '\n',
);

/* ── Still pieces: supplied sprites (stalls, treasury, equipment) ── */
const index = JSON.parse(fs.readFileSync('art/supplied/index.json', 'utf8'));
for (const k of Object.keys(index))
  if (k.startsWith('sup-caravan-')) delete index[k];
for (const f of fs.readdirSync('art/supplied'))
  if (f.startsWith('caravan-')) fs.rmSync(`art/supplied/${f}`);
const planted: [string, number, number][] = [];
async function plant(id: string, img: Raw, foot: number[], at: number[]) {
  await sharp(img.data, { raw: { width: img.W, height: img.H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(`art/supplied/${id}.png`);
  index[`sup-${id}`] = {
    file: `supplied/${id}.png`,
    anchor: foot,
    density: D,
    source:
      'Mansa Musa’s caravan rig (packages/shared/royal-caravan.ts), rendered by tools/prepare-caravan-sprites.ts',
  };
  planted.push([`sup-${id}`, ...tileOf(at[0], at[2])]);
}
for (const a of still) {
  const { fx, fy } = frames.get(a)!;
  await plant(`caravan-${a}`, shots.get(a)![0], [fx, fy], ticks[0].roots[a]);
}
// The stalls: rendered with the same page, from their own faces.
{
  const b2 = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: [
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
    ],
  });
  for (const part of stallParts) {
    const t = triangles(part.faces as never);
    const data = [t.pos, t.nor, t.col, t.fin].map((a) => new Float32Array(a));
    let off = 0;
    const entry = {
      count: t.pos.length / 3,
      position: 0,
      normal: 0,
      color: 0,
      finish: 0,
    };
    (['position', 'normal', 'color', 'finish'] as const).forEach((k, i) => {
      entry[k] = off;
      off += data[i].length;
    });
    fs.mkdirSync(`${tmp}/stall/data`, { recursive: true });
    const out = Buffer.concat(data.map((d) => Buffer.from(d.buffer)));
    fs.writeFileSync(`${tmp}/stall/data/joints.bin`, out);
    fs.writeFileSync(
      `${tmp}/stall/data/joints.json`,
      JSON.stringify({ density: D, joints: [entry] }),
    );
    roots.data = `${tmp}/stall/data`;
    let lo = [Infinity, Infinity],
      hi = [-Infinity, -Infinity];
    const r = screen(part.at);
    for (const f of part.faces)
      for (const p of f.points.flatMap((q) => [q, shadowOf(q)])) {
        const s = screen(p);
        lo = [Math.min(lo[0], s[0] - r[0]), Math.min(lo[1], s[1] - r[1])];
        hi = [Math.max(hi[0], s[0] - r[0]), Math.max(hi[1], s[1] - r[1])];
      }
    const fx = Math.ceil(-lo[0]) + 3,
      fy = Math.ceil(-lo[1]) + 3,
      W = fx + Math.ceil(hi[0]) + 3,
      H = fy + Math.ceil(hi[1]) + 3;
    const srv = http.createServer(server.listeners('request')[0] as never);
    await new Promise<void>((res) => srv.listen(0, '127.0.0.1', res));
    const p2 = await b2.newPage();
    await p2.goto(
      `http://127.0.0.1:${(srv.address() as { port: number }).port}/render/render.html`,
    );
    await p2.waitForFunction('window.READY === true', null, {
      timeout: 120000,
    });
    const identity = Buffer.from(
      new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]).buffer,
    ).toString('base64');
    await p2.evaluate(
      (b64) => (window as unknown as { pose(s: string): void }).pose(b64),
      identity,
    );
    const url = (await p2.evaluate(
      (arg) => (window as unknown as { shoot(a: unknown): string }).shoot(arg),
      { joints: [0], root: part.at, W, H, fx, fy, ss: SS },
    )) as string;
    await p2.close();
    srv.close();
    await plant(part.id, await decode(url, W, H), [fx, fy], part.at);
  }
  await b2.close();
}
fs.writeFileSync(
  'art/supplied/index.json',
  JSON.stringify(index, null, 2) + '\n',
);
fs.writeFileSync(
  'art/supplied/caravan.json',
  JSON.stringify(planted, null, 2) + '\n',
);
console.log(
  `Caravan: ${moving.length} figures, ${uniqueTotal} poses; ${planted.length} still pieces; centre ${CARAVAN.center}.`,
);
