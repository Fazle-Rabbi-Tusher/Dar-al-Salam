import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { S, tileOf } from './mosque-hall/layout';

/*
 * The congregational prayer led by Yasser al-Dosari, from the owner's
 * prayer-library pack (2026-11), inside the owner's 3D mosque on the Baitul
 * Mukarram plaza (tools/prepare-mosque-hall.ts). Owner's brief: everyone,
 * imam included, faces the qibla wall and its mihrab, which is the far NE
 * wall, so all are seen from behind (depiction back, facing NE):
 *   - the pack's voxel key poses (rendered from its 3D component), from the
 *     back three-quarter view, with a cross-fade frame at every change;
 *   - the imam's detailed back view (his turnaround) whenever he stands.
 *
 * Each person gets one 240-tick 'pray' strip (80 steps of 3 ticks): unique
 * poses stored once, with a `sequence` listing which pose plays at each
 * step. Adults follow the imam half a second late; children later, glancing
 * sideways before they copy. The prayer is time-compressed to one rak'ah,
 * then the tashahhud and taslim, to fit the 20-second loop.
 *
 *   node --import tsx tools/prepare-prayer.ts <extracted prayer-library folder>
 */
const [pack] = process.argv.slice(2);
if (!pack) throw Error('Usage: prepare-prayer.ts <prayer-library folder>');
const tmp = fs.mkdtempSync('/tmp/prayer-');

type Img = { w: number; h: number; d: Uint8ClampedArray };
const blank = (w: number, h: number): Img => ({
  w,
  h,
  d: new Uint8ClampedArray(w * h * 4),
});
async function load(file: string | Buffer): Promise<Img> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, d: new Uint8ClampedArray(data) };
}
const toSharp = (im: Img) =>
  sharp(Buffer.from(im.d.buffer), {
    raw: { width: im.w, height: im.h, channels: 4 },
  });
function bbox(im: Img) {
  let x0 = im.w,
    y0 = im.h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < im.h; y++)
    for (let x = 0; x < im.w; x++)
      if (im.d[(y * im.w + x) * 4 + 3] > 96) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function paste(dst: Img, src: Img, ox: number, oy: number) {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const tx = x + ox,
        ty = y + oy,
        s = (y * src.w + x) * 4;
      if (tx < 0 || ty < 0 || tx >= dst.w || ty >= dst.h || !src.d[s + 3])
        continue;
      const t = (ty * dst.w + tx) * 4;
      for (let k = 0; k < 4; k++) dst.d[t + k] = src.d[s + k];
    }
}
/** Cross-fade: half of each pose (premultiplied, so edges stay clean). */
function blend(a: Img, b: Img): Img {
  const out = blank(a.w, a.h);
  for (let i = 0; i < a.d.length; i += 4) {
    const aa = a.d[i + 3] / 255,
      ba = b.d[i + 3] / 255,
      al = (aa + ba) / 2;
    if (!al) continue;
    for (let k = 0; k < 3; k++)
      out.d[i + k] = (a.d[i + k] * aa + b.d[i + k] * ba) / 2 / al;
    out.d[i + 3] = al * 255;
  }
  return out;
}
const same = (a: Img, b: Img) => a.d.every((v, i) => v === b.d[i]);

/* ── The voxel key poses: one fixed camera, so feet stay put across poses ── */
const CROP = { left: 64, top: 80, width: 176, height: 240 },
  UP = 1.4, // the voxel adult (206 px) becomes 288 px: 72 world px at density 4
  FW = Math.round(CROP.width * UP),
  FH = Math.round(CROP.height * UP),
  DENSITY = 4;
const voxelCache = new Map<string, Img>();
/** The pack's view of a figure facing up-right on screen (NE), from behind. */
const BACK = '135';
async function voxel(id: string, pose: string, dir = '045') {
  const key = `${id}/${pose}-${dir}`;
  if (!voxelCache.has(key))
    voxelCache.set(
      key,
      await load(
        await sharp(path.join(pack, `characters/${id}/${pose}-${dir}.webp`))
          .extract(CROP)
          .resize(FW, FH, { kernel: 'nearest' })
          .png()
          .toBuffer(),
      ),
    );
  return voxelCache.get(key)!;
}

/* ── Detailed art: cut from its pale backdrop, turned to face SE ── */
async function detailed(rel: string, mirror: boolean): Promise<Img> {
  const src = path.join(pack, 'artwork', rel),
    png = path.join(tmp, rel.replace(/[/.]/g, '_') + '.png');
  const raw = await load(src);
  let cut: Img;
  let clear = 0;
  for (let i = 3; i < raw.d.length; i += 4) if (!raw.d[i]) clear++;
  // The women's crops come cut out (some fully clear pixels). The others sit
  // on a pale backdrop, saved almost (not fully) opaque: cut those from a
  // flat copy, so the cutter sees the backdrop colour.
  const precut = clear > raw.w * raw.h * 0.01;
  if (!precut) await sharp(src).removeAlpha().png().toFile(png);
  if (precut) {
    // The women's crops are already cut out but saved half see-through:
    // make the figure solid and drop the soft matte.
    cut = raw;
    for (let i = 3; i < cut.d.length; i += 4)
      cut.d[i] = cut.d[i] > 128 ? 255 : 0;
  } else {
    const out = png + '.cut.png';
    execFileSync('node', [
      '--import',
      'tsx',
      'tools/prepare-landmark.ts',
      png,
      out,
      '0',
      '0',
      String(raw.w),
      String(raw.h),
      'tol=7',
      'keepholes',
      'largest',
    ]);
    cut = await load(out);
    // Peel the pale fringe the backdrop leaves round the outline: near-white
    // pixels touching the outside, a few passes deep.
    for (let pass = 0; pass < 3; pass++) {
      const peel: number[] = [];
      for (let y = 0; y < cut.h; y++)
        for (let x = 0; x < cut.w; x++) {
          const i = (y * cut.w + x) * 4;
          if (!cut.d[i + 3]) continue;
          const pale = Math.min(cut.d[i], cut.d[i + 1], cut.d[i + 2]) > 226;
          if (!pale) continue;
          const out = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([dx, dy]) => {
            const nx = x + dx,
              ny = y + dy;
            return (
              nx < 0 ||
              ny < 0 ||
              nx >= cut.w ||
              ny >= cut.h ||
              !cut.d[(ny * cut.w + nx) * 4 + 3]
            );
          });
          if (out) peel.push(i);
        }
      for (const i of peel) cut.d[i + 3] = 0;
    }
  }
  const b = bbox(cut);
  let s = toSharp(cut).extract({
    left: b.x0,
    top: b.y0,
    width: b.w,
    height: b.h,
  });
  if (mirror) s = s.flop();
  return load(await s.png().toBuffer());
}
/**
 * Fit a detailed pose onto the matching voxel pose's outline, standing on
 * the same floor line: upright poses centred, low poses (bowing, prostrate,
 * sitting) from the back, where the feet are.
 */
async function fitted(art: Img, onto: Img, upright: boolean): Promise<Img> {
  const v = bbox(onto),
    scale = Math.min(v.w / art.w, v.h / art.h) * (upright ? 1 : 1),
    w = Math.max(1, Math.round(art.w * (upright ? v.h / art.h : scale))),
    h = Math.max(1, Math.round(art.h * (upright ? v.h / art.h : scale))),
    resized = await load(
      await toSharp(art).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer(),
    ),
    frame = blank(FW, FH),
    x = upright ? Math.round((v.x0 + v.x1) / 2 - w / 2) : v.x0,
    y = v.y1 + 1 - h;
  // Lanczos leaves faint halos; keep pixels solid or empty.
  for (let i = 3; i < resized.d.length; i += 4)
    resized.d[i] = resized.d[i] > 110 ? 255 : 0;
  paste(frame, resized, x, y);
  return frame;
}
/** A breath for long, still standing: up to 0.8% taller. */
async function breath(im: Img): Promise<Img> {
  const b = bbox(im),
    body = await load(
      await toSharp(im)
        .extract({ left: b.x0, top: b.y0, width: b.w, height: b.h })
        .resize(b.w, Math.round(b.h * 1.008), { kernel: 'nearest' })
        .png()
        .toBuffer(),
    ),
    frame = blank(FW, FH);
  paste(frame, body, b.x0, b.y1 + 1 - body.h);
  return frame;
}

/* ── The prayer, in ticks of the 240-tick loop (the imam's timing) ── */
type Pose =
  | 'takbir'
  | 'qiyam'
  | 'ruku'
  | 'itidal'
  | 'kneel'
  | 'sujood'
  | 'jalsa'
  | 'tashahhud'
  | 'salam-right'
  | 'salam-left'
  | 'stand';
const TIMELINE: [number, number, Pose][] = [
  [0, 12, 'takbir'], // Allahu akbar: hands raised to the ears
  [12, 72, 'qiyam'], // standing, right hand over left: al-Fatihah
  [72, 96, 'ruku'], // bowing, back flat, hands on the knees
  [96, 114, 'itidal'], // standing up straight again
  [114, 117, 'kneel'], // going down
  [117, 138, 'sujood'], // first prostration
  [138, 150, 'jalsa'], // sitting between the two prostrations
  [150, 174, 'sujood'], // second prostration
  [174, 204, 'tashahhud'], // sitting, the index finger raised
  [204, 213, 'salam-right'], // as-salamu alaykum, to the right
  [213, 222, 'salam-left'], // and to the left
  [222, 228, 'kneel'], // rising
  [228, 240, 'stand'], // standing, ready to begin again
];
const poseAt = (t: number): Pose => {
  const u = ((t % 240) + 240) % 240;
  return TIMELINE.find(([a, b]) => u >= a && u < b)![2];
};
const VOXEL_POSE: Record<Pose, string> = {
  takbir: 'takbir',
  qiyam: 'recitation',
  ruku: 'ruku',
  itidal: 'stand',
  kneel: 'kneeling',
  sujood: 'sujood',
  jalsa: 'sitting',
  tashahhud: 'tashahhud',
  'salam-right': 'salam-right',
  'salam-left': 'salam-left',
  stand: 'stand',
};
const UPRIGHT = new Set<Pose>(['takbir', 'qiyam', 'itidal', 'stand']);

type Role = 'imam' | 'adult' | 'child';
type Person = {
  id: string;
  role: Role;
  /** Ticks behind the imam. */
  delay: number;
  /** Detailed art from behind, for standing (the imam's turnaround). */
  art: { back?: string };
  /** Children look sideways before copying each move. */
  glances?: boolean;
  /** The toddler: tugs at his father's thawb while the rows stand. */
  tug?: boolean;
};

async function stripFor(p: Person) {
  const det: Partial<Record<Pose, Img>> = {};
  // Everyone faces the qibla wall and mihrab (NE), seen from behind: the
  // pack's voxel poses from the back three-quarter view. Only the imam has
  // detailed art from behind (his turnaround), used whenever he stands.
  if (p.art.back) {
    const back = await detailed(p.art.back, false);
    for (const pose of ['qiyam', 'itidal', 'stand'] as Pose[])
      det[pose] = await fitted(
        back,
        await voxel(p.id, 'recitation', BACK),
        true,
      );
  }
  const frameOf = async (pose: Pose) =>
    det[pose] ?? (await voxel(p.id, VOXEL_POSE[pose], BACK));
  const qiyamBreath = det.qiyam ? await breath(det.qiyam) : null;
  // A glance: the standing body turned a little to look (voxel side view).
  const glance = await voxel(p.id, 'recitation', '090');
  // The tug: bending toward his father's hem, reaching (turned to the side).
  const reach = await voxel(p.id, 'ruku', '090'),
    pull = await voxel(p.id, 'recitation', '090');

  const steps: Img[] = [];
  let prev: Img | null = null,
    prevPose: Pose | null = null;
  for (let k = 0; k < 80; k++) {
    const t = k * 3 + 1,
      pose = poseAt(t - p.delay),
      // Pose the rows were in a moment before (children watch them).
      adults = poseAt(t - 6);
    let img = await frameOf(pose);
    if (pose === 'qiyam' && qiyamBreath && Math.floor(k / 2) % 2)
      img = qiyamBreath;
    if (
      p.glances &&
      UPRIGHT.has(pose) &&
      UPRIGHT.has(adults) &&
      adults !== pose
    )
      // The adults have moved on: look across before copying.
      img = glance;
    if (p.tug && t - p.delay >= 99 && t - p.delay < 111)
      img = Math.floor(k / 2) % 2 ? pull : reach;
    if (prev && prevPose !== pose && !same(prev, img) && pose !== 'qiyam')
      // Smooth hand-over to the new pose (and between the art styles).
      steps.push(blend(prev, img));
    else steps.push(img);
    prev = img;
    prevPose = pose;
  }
  // Unique poses once, and the order they play in.
  const unique: Img[] = [],
    sequence = steps.map((s) => {
      let i = unique.findIndex((u) => same(u, s));
      if (i < 0) i = unique.push(s) - 1;
      return i;
    });
  const strip = blank(FW * unique.length, FH);
  unique.forEach((u, i) => paste(strip, u, i * FW, 0));
  const base = `art/sprites/anim/${p.id}__pray_NE`;
  await toSharp(strip)
    .png({ palette: true, colours: 256, dither: 0.4, effort: 8 })
    .toFile(`${base}.png`);
  // Feet: the middle of the voxel figure's soles, standing.
  const st = await voxel(p.id, 'stand'),
    sb = bbox(st);
  let sx = 0,
    n = 0;
  for (let y = sb.y1 - 4; y <= sb.y1; y++)
    for (let x = 0; x < FW; x++)
      if (st.d[(y * FW + x) * 4 + 3] > 96) {
        sx += x;
        n++;
      }
  fs.writeFileSync(
    `${base}.json`,
    JSON.stringify({
      frame: [FW, FH],
      foot: [Math.round(sx / n), sb.y1],
      density: DENSITY,
      sequence,
    }) + '\n',
  );
  return unique.length;
}

/* ── Who prays where (tiles); everyone faces the qibla, SE ── */
/*
 * Inside the grand mosque (tools/mosque-hall/grand-mosque.mjs and
 * layout.ts), in the model's metres: the qibla wall is the far NE wall
 * (Z −2.5) with the mihrab at X 0. The original small congregation (owner's
 * brief), compact in the middle of the vast hall: the imam at X 0, Z 0;
 * two rows of six men from X −6 to +6 at Z 2 and 4.4; the walnut screen at
 * Z 5.9; two rows of six women beyond it.
 */
export const IMAM = tileOf(0, 0); // on his own mat, before the mihrab
const ROW_X = [-6, -3.6, -1.2, 1.2, 3.6, 6];
const MEN_Z = [2, 4.4],
  WOMEN_Z = [7.2, 9.6];
const pad = (n: number) => String(n).padStart(2, '0');
type Placed = Person & { at: [number, number]; label: string; strip?: string };
const people: Placed[] = [
  {
    id: 'yasser-al-dosari',
    role: 'imam',
    delay: 0,
    art: { back: 'yasser-al-dosari/yasser-turnaround-03.webp' },
    at: IMAM,
    label: '',
  },
];
for (let r = 0; r < 2; r++)
  ROW_X.forEach((x, i) => {
    const n = r * 6 + i + 1;
    people.push(
      {
        id: `prayer-man-${pad(n)}`,
        role: 'adult',
        delay: 6,
        art: {},
        at: tileOf(x, MEN_Z[r]),
        label: 'A worshipper in the men’s rows',
      },
      {
        id: `prayer-woman-${pad(n)}`,
        role: 'adult',
        delay: 6,
        art: {},
        at: tileOf(x, WOMEN_Z[r]),
        label: 'A worshipper in the women’s rows',
      },
    );
  });
people.push(
  {
    // At the end of the front row, beside his father.
    id: 'prayer-toddler',
    role: 'child',
    delay: 18,
    art: {},
    glances: true,
    tug: true,
    at: tileOf(8.2, MEN_Z[0]),
    label: 'A toddler beside his father, tugging at his thawb',
  },
  {
    // At the other end of the front row, copying a moment late.
    id: 'bead-child',
    role: 'child',
    delay: 12,
    art: {},
    glances: true,
    at: tileOf(-8.2, MEN_Z[0]),
    label: 'A boy copying the grown-ups, a moment late',
  },
  {
    // Beside her mother, just past the screen.
    id: 'partition-girl',
    role: 'child',
    delay: 12,
    art: {},
    glances: true,
    at: tileOf(-8.2, WOMEN_Z[0]),
    label: 'A girl praying beside her mother',
  },
);

// Strips: the imam, the children and each of the 24 designs, once (the
// rows play their design's strip).
const designs: Person[] = [
  ...people.filter((p) => p.role !== 'adult'),
  ...['man', 'woman'].flatMap((k) =>
    [...Array(12).keys()].map((i) => ({
      id: `prayer-${k}-${pad(i + 1)}`,
      role: 'adult' as Role,
      delay: 6,
      art: {},
    })),
  ),
];
for (const p of designs) {
  const n = await stripFor(p);
  console.log(`${p.id}: ${n} poses`);
}

/* ── The two children playing tag round the back pillar (eight views) ── */
/** A pillar out in the empty hall, where two children play tag. */
export const PILLAR = tileOf(-10, 12);
const VIEWS = ['000', '045', '090', '135', '180', '225', '270', '315']; // S, SE, E, NE, N, NW, W, SW
for (const id of ['aisle-child-a', 'aisle-child-b']) {
  const views = await Promise.all(VIEWS.map((d) => voxel(id, 'stand', d))),
    sheet = blank(FW * 8, FH);
  views.forEach((v, i) => paste(sheet, v, i * FW, 0));
  await toSharp(sheet).png().toFile(`art/sprites/dir8/${id}.png`);
  const b = bbox(views[0]);
  fs.writeFileSync(
    `art/sprites/dir8/${id}.json`,
    JSON.stringify(
      {
        frame: [FW, FH],
        foot: [Math.round((b.x0 + b.x1) / 2), b.y1],
        density: DENSITY,
        shadow: [10, 4],
        steps: 0.3,
      },
      null,
      2,
    ) + '\n',
  );
}
const circle = (phase: number): [number, number][] =>
  [...Array(25).keys()].map((i) => {
    // Two quiet laps a loop, round the pillar.
    const a = phase + (i / 24) * Math.PI * 4;
    // An oval round the pillar, out in the open floor.
    return [
      +(PILLAR[0] + S * Math.cos(a) * 1.9).toFixed(3),
      +(PILLAR[1] + S * Math.sin(a) * 1.2).toFixed(3),
    ];
  });

/* ── Content: the congregation (ambient) and the tag game ── */
const lookFor = (p: (typeof people)[number]) => {
  const woman = p.id.includes('woman') || p.id === 'partition-girl',
    child = p.role === 'child';
  return {
    base: child ? 'child' : woman ? 'adult-woman' : 'adult-man-beard',
    garment: woman ? 'abaya' : 'thobe',
    headwear: woman ? 'hijab' : 'kufi',
    prop: 'none',
    colours: {
      skin: 'skin-3',
      hair: 'hair-black',
      garmentPrimary: woman ? 'indigo' : 'white-linen',
      garmentSecondary: 'white-linen',
      headwear: woman ? 'indigo' : 'white-linen',
      prop: 'cocoa',
    },
  };
};
const ambient: unknown[] = people
  .filter((p) => p.role !== 'imam')
  .map((p) => ({
    id: p.id,
    kind: 'person',
    aliases: [],
    district: 'modern-quarter',
    // Seen from behind, facing the qibla wall (NE) like everyone else.
    depiction: 'back',
    role: p.label,
    ...(p.strip ? { strip: p.strip } : {}),
    look: lookFor(p),
    loop: 240,
    script: [{ from: 0, to: 240, action: 'pray', at: p.at, facing: 'NE' }],
  }));
for (const [i, id] of ['aisle-child-a', 'aisle-child-b'].entries())
  ambient.push({
    id,
    kind: 'person',
    aliases: [],
    district: 'modern-quarter',
    depiction: 'full',
    role: 'Two children tiptoeing round a column in a quiet game of tag',
    look: {
      base: id,
      garment: 'none',
      headwear: 'none',
      prop: 'none',
      colours: {
        skin: 'skin-3',
        hair: 'hair-black',
        garmentPrimary: 'white-linen',
        garmentSecondary: 'white-linen',
        headwear: 'white-linen',
        prop: 'cocoa',
      },
    },
    loop: 240,
    script: [{ from: 0, to: 240, action: 'walk', path: circle(i * Math.PI) }],
  });
fs.writeFileSync(
  'content/ambient/prayer.json',
  JSON.stringify(ambient, null, 2) + '\n',
);
// The scene (click anyone: Yasser's card, the whole prayer lit up).
const sceneFile = 'content/scenes/congregational-prayer.json',
  scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
scene.members = [
  'yasser-al-dosari',
  ...(ambient as { id: string }[]).map((a) => a.id),
];
fs.writeFileSync(sceneFile, JSON.stringify(scene, null, 2) + '\n');

/* ── Yasser's story card: his standing figure, and his poses at prayer ── */
const front = await detailed(
  'yasser-al-dosari/yasser-prayer-poses-00.webp',
  false,
);
await toSharp(front)
  .resize({ height: 480, kernel: 'lanczos3' })
  .extend({
    top: 14,
    bottom: 10,
    left: 18,
    right: 18,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile('art/illustrations/yasser-al-dosari.png');
fs.mkdirSync('art/gallery/yasser-al-dosari', { recursive: true });
for (let n = 0; n < 8; n++)
  await sharp(
    path.join(pack, `artwork/yasser-al-dosari/yasser-prayer-poses-0${n}.webp`),
  )
    .flatten({ background: '#faf9f6' })
    .resize({ width: 300 })
    .png({ palette: true, quality: 92 })
    .toFile(`art/gallery/yasser-al-dosari/${n}.png`);
console.log(
  'Prayer scene: strips, tag game, ambient file and card art written.',
);
