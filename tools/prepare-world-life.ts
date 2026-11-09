import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

/*
 * Prepares the world's moving life and scenery from two owner-supplied packs
 * (2026-11):
 *
 *   node --import tsx tools/prepare-world-life.ts <rework art/landscape dir> <desert set dir>
 *
 * 1. The earlier world rework's landscape art: a galleon in four views, a
 *    taxi and a tram (two views each, the tram also with its doors open), a
 *    tram platform, a cliff waterfall with its pool (four frames) and
 *    painted trees. Vehicles become eight-view sets in art/sprites/dir8/
 *    (missing views are mirrors: a car seen from the left is the mirror of
 *    one seen from the right); scenery goes to art/supplied/.
 * 2. The desert set's caravan guide: eight turnaround views → dir8/guide.
 *
 * Eight-view order: S, SE, E, NE, N, NW, W, SW (the screen heading).
 */
const [land, desert] = process.argv.slice(2);
const tmp = fs.mkdtempSync('/tmp/world-life-');
type Img = { data: Buffer; width: number; height: number };
async function load(file: string, flip = false): Promise<Img> {
  let s = sharp(file).ensureAlpha();
  if (flip) s = s.flop();
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
/** Bottom-centre of the opaque pixels (where the figure meets the ground). */
function foot(img: Img, base = 0.03): [number, number] {
  let bottom = 0;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
      if (img.data[(y * img.width + x) * 4 + 3] > 40) bottom = y;
  const row = bottom - Math.round(img.height * base);
  let sx = 0,
    n = 0;
  for (let y = Math.max(0, row - 4); y <= bottom; y++)
    for (let x = 0; x < img.width; x++)
      if (img.data[(y * img.width + x) * 4 + 3] > 40) {
        sx += x;
        n++;
      }
  return [Math.round(n ? sx / n : img.width / 2), row];
}
/** Eight views side by side with the feet pinned; returns the sidecar. */
async function strip(views: Img[], out: string, height: number, extra = {}) {
  const feet = views.map((v) => foot(v));
  const left = Math.max(...feet.map((f) => f[0])),
    right = Math.max(...views.map((v, i) => v.width - feet[i][0])),
    up = Math.max(...feet.map((f) => f[1])),
    down = Math.max(...views.map((v, i) => v.height - feet[i][1]));
  const FW = left + right + 6,
    FH = up + down + 6,
    at: [number, number] = [left + 3, up + 3];
  await sharp({
    create: {
      width: FW * views.length,
      height: FH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      views.map((v, i) => ({
        input: v.data,
        raw: { width: v.width, height: v.height, channels: 4 as const },
        left: i * FW + at[0] - feet[i][0],
        top: at[1] - feet[i][1],
      })),
    )
    .png()
    .toFile(`${out}.png`);
  const tallest = Math.max(...views.map((v) => v.height));
  return {
    frame: [FW, FH],
    foot: at,
    density: +(tallest / height).toFixed(3),
    ...extra,
  };
}
fs.mkdirSync('art/sprites/dir8', { recursive: true });
const save = (id: string, meta: object) =>
  fs.writeFileSync(
    `art/sprites/dir8/${id}.json`,
    JSON.stringify(meta, null, 2) + '\n',
  );
/* ── Galleon: four views, eight headings ── */
{
  const v = {
    SE: await load(`${land}/sailship-SE.png`),
    SW: await load(`${land}/sailship-SW.png`),
    NE: await load(`${land}/sailship-NE.png`),
    NW: await load(`${land}/sailship-NW.png`),
  };
  // S, SE, E, NE, N, NW, W, SW
  const views = [v.SW, v.SE, v.SE, v.NE, v.NE, v.NW, v.NW, v.SW];
  save(
    'ship',
    await strip(views, 'art/sprites/dir8/ship', 140, { shadow: false }),
  );
}
/* ── Taxi and tram: two views each, the other two mirrored ── */
for (const [id, files, height] of [
  ['taxi', { NE: 'taxi-NE', SW: 'taxi-SW' }, 42],
  ['tram', { NE: 'tram-NE-closed', SW: 'tram-SW-closed' }, 100],
  ['tram-open', { NE: 'tram-NE-open', SW: 'tram-SW-open' }, 100],
] as [string, { NE: string; SW: string }, number][]) {
  const NE = await load(`${land}/${files.NE}.png`),
    SW = await load(`${land}/${files.SW}.png`),
    NW = await load(`${land}/${files.NE}.png`, true),
    SE = await load(`${land}/${files.SW}.png`, true);
  const views = [SW, SE, SE, NE, NE, NW, NW, SW];
  save(
    id,
    await strip(views, `art/sprites/dir8/${id}`, height, {
      shadow: [height * 0.75, height * 0.2],
      ...(id === 'tram' ? { actions: { vehicle_stop: 'tram-open' } } : {}),
    }),
  );
}
/* ── Caravan guide: the desert set's turnaround row ── */
{
  const sheet = `${desert}/desert-guide-camels-and-rider.png`;
  const boxes = [
    [75, 19, 94, 231],
    [292, 18, 79, 234],
    [498, 18, 64, 234],
    [686, 19, 77, 232],
    [868, 21, 89, 230],
    [1066, 16, 75, 235],
    [1241, 18, 69, 234],
    [1406, 19, 84, 232],
  ];
  // Sheet order: front, front-right, right, back-right, back, back-left,
  // left, front-left = S, SE, E, NE, N, NW, W, SW.
  const views: Img[] = [];
  for (const [i, b] of boxes.entries()) {
    const out = `${tmp}/g${i}.png`;
    execFileSync('node', [
      '--import',
      'tsx',
      'tools/prepare-landmark.ts',
      sheet,
      out,
      String(b[0] - 5),
      String(Math.max(0, b[1] - 5)),
      String(b[2] + 10),
      String(b[3] + 10),
      'largest',
    ]);
    views.push(await load(out));
  }
  save(
    'guide',
    await strip(views, 'art/sprites/dir8/guide', 56, { shadow: [20, 6] }),
  );
}
/* ── Scenery: waterfall with its pool, painted trees, tram platform ── */
const index = JSON.parse(fs.readFileSync('art/supplied/index.json', 'utf8'));
const meta = JSON.parse(fs.readFileSync(`${land}/index.json`, 'utf8'));
const SCENERY: Record<string, { density: number; replaces?: string }> = {
  'land-waterfall': { density: 1.4 },
  'land-oak': { density: 2 },
  'land-pine': { density: 2 },
  'land-cherry': { density: 2 },
  'land-oak-young': { density: 2 },
  'land-pine-young': { density: 2 },
  'land-cherry-young': { density: 2 },
  // A natural waterfall makes no sense in the Bangladesh park (it had no
  // stream to come from or go to): a stand of trees takes its place.
  'land-forest-stand': { density: 2, replaces: 'm-waterfall' },
  'land-snag': { density: 2 },
  'land-tram-platform': { density: 2 },
};
for (const [id, opt] of Object.entries(SCENERY)) {
  const m = meta[id],
    files: string[] = m.frames ?? [m.file];
  const out: string[] = [];
  for (const f of files) {
    const name = `supplied/${f.split('/').pop()}`;
    fs.copyFileSync(`${land}/${f.split('/').pop()}`, `art/${name}`);
    out.push(name);
  }
  index[id] = {
    file: out[0],
    ...(out.length > 1 ? { frames: out, period: (m.period ?? 12) * 2 } : {}),
    anchor: m.anchor,
    density: opt.density,
    ...(opt.replaces ? { replaces: opt.replaces } : {}),
    source:
      'Owner-supplied world rework export (2026-11), art/landscape, copied by tools/prepare-world-life.ts',
  };
  console.log(id, out.length);
}
fs.writeFileSync(
  'art/supplied/index.json',
  JSON.stringify(index, null, 2) + '\n',
);
