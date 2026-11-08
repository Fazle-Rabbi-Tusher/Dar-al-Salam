import fs from 'node:fs/promises';
import { Pixels, blit, hexAt } from '../../packages/shared/pixels';
import { ACTIONS, type Action } from '../../packages/shared/schema';
import { canvasFor } from '../../packages/shared/canvas';
import { png, writeJson } from '../build/io';
import { isoCanvas } from './iso-draw';
import type { Aseprite } from '../../packages/shared/compositor';

/*
 * Procedural placeholder paper-doll parts on a 56×84 canvas (foot anchor 28,80).
 * Realistic proportions: a 10×11 head on a ~64 px adult (about six heads),
 * with elbows, knees, hands with a thumb and soled shoes. Every part is drawn
 * from one shared pose skeleton so any garment, headwear and prop fits any
 * adult base; children are scaled by the compositor. Shapes are lit from the
 * top left with a distance-field shader, then given folds, seams and contact
 * shadows. Only reserved key colours and fixed palette colours are used. Faces
 * are small stylised faces (eyes with a lid line, brows, nose and mouth) whose
 * expression follows the action; NE frames show the back of the head.
 */
export const bases = [
  'adult-man',
  'adult-woman',
  'child',
  'elder',
  'cat',
  'bird',
  'adult-man-beard',
  'adult-man-clean',
  'adult-man-curly',
  'adult-man-goatee',
  'adult-man-shaved',
  'adult-man-short',
  'adult-man-shaved-beard',
  'adult-man-swept-beard',
  'adult-woman-loose',
  'ball',
  'ambulance',
];
export const garments = [
  'thobe',
  'jubba',
  'qaba',
  'kaftan',
  'abaya',
  'panjabi-lungi',
  'boubou',
  'baju-kurung',
  'hui-robe',
  'scholar-robe',
  'apron',
  'shirt-trousers',
  'shirt-trousers-sponsor',
  'suit',
  'lab-coat',
  'scrubs',
  'hoodie-jeans',
  'long-dress',
  'hi-vis',
  'blazer-open',
  'football-kit',
  'football-kit-captain',
  'football-kit-long',
  'football-kit-sleeved',
  'football-kit-sponsor',
  'fight-kit',
  'boxing-kit',
];
export const headwear = [
  'imamah',
  'kufi',
  'taqiyah',
  'hijab',
  'khimar',
  'songkok',
  'hui-cap',
  'cap',
  'hard-hat',
  'scrub-cap',
  'headwrap',
  'papakha',
  'ghutra',
];
export const props = [
  'book',
  'scroll',
  'astrolabe',
  'water-skin',
  'basket',
  'bread',
  'scale',
  'broom',
  'pen',
  'tray',
  'laptop',
  'tablet',
  'phone',
  'coffee',
  'flask',
  'stethoscope',
  'clipboard',
  'blueprint',
  'meal-box',
  'water-jug',
  'cane',
  'shopping-bag',
  'football',
  'wrist-tape',
  'mma-gloves',
  'boxing-gloves',
  'title-belt',
  'scooter',
  'cricket-bat',
  'trophy',
  'keys',
  'envelope',
  'keeper-gloves',
  'bottle',
];
export const K = {
  skin: ['#FF00FF', '#CC00CC', '#990099'],
  hair: ['#00FFFF', '#00CCCC', '#009999'],
  cloth: ['#FFFF00', '#CCCC00', '#999900'],
  sash: ['#00FF00', '#00CC00', '#009900'],
  hat: ['#FF8000', '#CC6600', '#994C00'],
  prop: ['#0080FF', '#0066CC', '#004C99'],
};
// Fixed palette colours (all present in world-palette.json).
export const F = {
  ink: '#3B322E',
  outline: '#493C35',
  charcoal: ['#80766B', '#65564B', '#493C35'],
  white: '#F5EEDB',
  cream: '#EDE6CE',
  steel: ['#D7DCD2', '#B5C3BA', '#8B9D96'],
  water: '#79B6B2',
  waterLight: '#A3CFBE',
  screen: '#225C69',
  glow: '#A3CFBE',
  gold: '#D8AD57',
};
type P = [number, number];
type Limb = [P, P, P];
type Mode = 'stand' | 'chair' | 'floor' | 'bow' | 'prostrate' | 'kneel';
/** Head orientation: upright, crown forward with the face down, or face up. */
export type Turn = 'up' | 'down' | 'back';
export type Pose = {
  /** Authoring head top-left (before the realistic mapping). */
  head: P;
  /** Head centre on the canvas and the top-left of its 10×11 box. */
  headC: P;
  box: P;
  turn: Turn;
  /** Base of the neck, between the shoulders. */
  neck: P;
  chest: P;
  hip: P;
  arms: [Limb, Limb];
  legs: [Limb, Limb];
  mode: Mode;
  away: boolean;
  walking: boolean;
  frame: number;
  action: Action;
};

export class Mask {
  data: Uint8Array;
  constructor(
    public width: number,
    public height: number,
  ) {
    this.data = new Uint8Array(width * height);
  }
  has(x: number, y: number) {
    return (
      x >= 0 &&
      y >= 0 &&
      x < this.width &&
      y < this.height &&
      this.data[y * this.width + x] === 1
    );
  }
  set(x: number, y: number) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height)
      this.data[y * this.width + x] = 1;
  }
  rect(x: number, y: number, w: number, h: number) {
    for (let j = Math.round(y); j < Math.round(y + h); j++)
      for (let i = Math.round(x); i < Math.round(x + w); i++) this.set(i, j);
    return this;
  }
  disc(cx: number, cy: number, r: number) {
    for (let j = Math.floor(cy - r - 1); j <= cy + r + 1; j++)
      for (let i = Math.floor(cx - r - 1); i <= cx + r + 1; i++)
        if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) this.set(i, j);
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number) {
    for (let j = Math.floor(cy - ry - 1); j <= cy + ry + 1; j++)
      for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++)
        if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1)
          this.set(i, j);
    return this;
  }
  capsule(a: P, b: P, r: number, r2 = r) {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      this.disc(
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        r + (r2 - r) * t,
      );
    }
    return this;
  }
  poly(points: P[]) {
    const ys = points.map((p) => p[1]),
      xs = points.map((p) => p[0]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++)
      for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
        let inside = false;
        const px = x + 0.5,
          py = y + 0.5;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i],
            b = points[j];
          if (
            a[1] > py !== b[1] > py &&
            px < ((b[0] - a[0]) * (py - a[1])) / (b[1] - a[1]) + a[0]
          )
            inside = !inside;
        }
        if (inside) this.set(x, y);
      }
    return this;
  }
  /** Dilate by a disc of radius r (round silhouettes around a shape). */
  grow(r: number) {
    const src = this.data.slice();
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++)
        if (src[y * this.width + x]) this.disc(x + 0.5, y + 0.5, r);
    return this;
  }
  minus(other: Mask) {
    for (let i = 0; i < this.data.length; i++)
      if (other.data[i]) this.data[i] = 0;
    return this;
  }
}
/** Paint a mask with a 3-shade ramp: top-left light, right/bottom dark. */
function paint(
  p: Pixels,
  m: Mask,
  ramp: string[],
  o: { light?: number; dark?: number; top?: boolean } = {},
) {
  const light = o.light ?? 1,
    dark = o.dark ?? 2,
    top = o.top ?? true;
  for (let y = 0; y < m.height; y++) {
    let x = 0;
    while (x < m.width) {
      if (!m.has(x, y)) {
        x++;
        continue;
      }
      let end = x;
      while (m.has(end, y)) end++;
      const len = end - x;
      for (let i = x; i < end; i++) {
        let c = ramp[1];
        if (len >= 3 && i >= end - dark) c = ramp[2];
        else if (len >= 5 && i < x + light) c = ramp[0];
        else if (top && !m.has(i, y - 1) && len >= 3) c = ramp[0];
        if (!m.has(i, y + 1) && len >= 2) c = ramp[2];
        p.pixel(i, y, c);
      }
      x = end;
    }
  }
}

const mk = (p: { width: number; height: number }) =>
  new Mask(p.width, p.height);
const lerp = (a: P, b: P, t: number): P => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
const add = (a: P, dx: number, dy: number): P => [a[0] + dx, a[1] + dy];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const norm = (a: P, b: P): P => {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
};
function bbox(m: Mask) {
  let x0 = m.width,
    y0 = m.height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++)
      if (m.data[y * m.width + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}
function copyMask(m: Mask) {
  const c = new Mask(m.width, m.height);
  c.data.set(m.data);
  return c;
}
function union(...ms: Mask[]) {
  const c = copyMask(ms[0]);
  for (const m of ms.slice(1))
    for (let i = 0; i < c.data.length; i++) if (m.data[i]) c.data[i] = 1;
  return c;
}
function intersect(a: Mask, b: Mask) {
  const c = copyMask(a);
  for (let i = 0; i < c.data.length; i++) if (!b.data[i]) c.data[i] = 0;
  return c;
}
const opaque = (p: Pixels, x: number, y: number) =>
  x >= 0 &&
  y >= 0 &&
  x < p.width &&
  y < p.height &&
  p.data[(y * p.width + x) * 4 + 3] > 0;
export const colourAt = (p: Pixels, x: number, y: number) =>
  opaque(p, x, y) ? hexAt(p, (y * p.width + x) * 4) : null;

/* ───────────── lighting ───────────── */
// Light from the top left, slightly in front.
const LIGHT = [-0.5, -0.58, 0.64];
/**
 * Shade a mask as a soft rounded form: a distance field gives each pixel a
 * surface normal; the lit band sits one pixel inside the top-left edge and the
 * shadow side falls on the right and bottom. `r` is how far the roundness
 * reaches into the shape (small for flat cloth, larger for limbs and heads).
 */
function shade(
  p: Pixels,
  m: Mask,
  ramp: string[],
  o: { r?: number; hi?: number; lo?: number; light?: number[] } = {},
) {
  const bb = bbox(m);
  if (!bb) return;
  const R = o.r ?? 2.4,
    hi = o.hi ?? 0.8,
    lo = o.lo ?? 0.22,
    L = o.light ?? LIGHT;
  const x0 = bb.x0 - 1,
    y0 = bb.y0 - 1,
    w = bb.x1 - bb.x0 + 3,
    h = bb.y1 - bb.y0 + 3;
  const d = new Float32Array(w * h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) d[j * w + i] = m.has(x0 + i, y0 + j) ? 1e6 : 0;
  const D = Math.SQRT2;
  const at = (i: number, j: number) =>
    i < 0 || j < 0 || i >= w || j >= h ? 0 : d[j * w + i];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (!d[k]) continue;
      d[k] = Math.min(
        d[k],
        at(i - 1, j) + 1,
        at(i, j - 1) + 1,
        at(i - 1, j - 1) + D,
        at(i + 1, j - 1) + D,
      );
    }
  for (let j = h - 1; j >= 0; j--)
    for (let i = w - 1; i >= 0; i--) {
      const k = j * w + i;
      if (!d[k]) continue;
      d[k] = Math.min(
        d[k],
        at(i + 1, j) + 1,
        at(i, j + 1) + 1,
        at(i + 1, j + 1) + D,
        at(i - 1, j + 1) + D,
      );
    }
  for (let j = 1; j < h - 1; j++)
    for (let i = 1; i < w - 1; i++) {
      const dv = d[j * w + i];
      if (!dv) continue;
      const gx =
          at(i + 1, j) -
          at(i - 1, j) +
          0.5 * (at(i + 1, j - 1) - at(i - 1, j - 1)) +
          0.5 * (at(i + 1, j + 1) - at(i - 1, j + 1)),
        gy =
          at(i, j + 1) -
          at(i, j - 1) +
          0.5 * (at(i - 1, j + 1) - at(i - 1, j - 1)) +
          0.5 * (at(i + 1, j + 1) - at(i + 1, j - 1)),
        len = Math.hypot(gx, gy);
      const s = clamp(1 - (dv - 1) / R, 0, 1),
        nx = len ? (-gx / len) * s : 0,
        ny = len ? (-gy / len) * s : 0,
        nz = Math.sqrt(Math.max(0, 1 - s * s)),
        I = nx * L[0] + ny * L[1] + nz * L[2];
      p.pixel(x0 + i, y0 + j, I > hi ? ramp[0] : I < lo ? ramp[2] : ramp[1]);
    }
}
/** Flat fill in one colour. */
function fill(p: Pixels, m: Mask, c: string) {
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++) if (m.has(x, y)) p.pixel(x, y, c);
}
const SHADES: string[][] = [];
function darker(c: string, n = 1) {
  for (const r of SHADES) {
    const i = r.indexOf(c);
    if (i >= 0) return r[Math.min(r.length - 1, i + n)];
  }
  return c;
}
function lighter(c: string) {
  for (const r of SHADES) {
    const i = r.indexOf(c);
    if (i >= 0) return r[Math.max(0, i - 1)];
  }
  return c;
}
/** Darken an already painted pixel one step along its own ramp. */
function dim(p: Pixels, x: number, y: number, n = 1) {
  const c = colourAt(p, Math.floor(x), Math.floor(y));
  if (c) p.pixel(x, y, darker(c, n));
}
function brighten(p: Pixels, x: number, y: number) {
  const c = colourAt(p, Math.floor(x), Math.floor(y));
  if (c) p.pixel(x, y, lighter(c));
}
/**
 * Contour: darken the edge of a freshly painted shape wherever it lies over
 * other painted pixels, so overlapping forms (an arm over the torso) separate.
 */
function contour(p: Pixels, m: Mask, under: Mask | null = null, n = 1) {
  const edge: P[] = [];
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++) {
      if (!m.has(x, y)) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        if (
          !m.has(x + dx, y + dy) &&
          (under ? under.has(x + dx, y + dy) : opaque(p, x + dx, y + dy))
        ) {
          edge.push([x, y]);
          break;
        }
    }
  for (const [x, y] of edge) dim(p, x, y, n);
}
/** Soft cast shadow: darken pixels just below/right of a shape. */
function castShadow(
  p: Pixels,
  m: Mask,
  dx = 1,
  dy = 1,
  onto: Mask | null = null,
) {
  const pts: P[] = [];
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++)
      if (
        m.has(x, y) &&
        !m.has(x + dx, y + dy) &&
        (onto ? onto.has(x + dx, y + dy) : opaque(p, x + dx, y + dy))
      )
        pts.push([x + dx, y + dy]);
  for (const [x, y] of pts) dim(p, x, y);
}
/** A crease line inside a mask: dark pixels with a lit pixel above-left. */
function crease(p: Pixels, m: Mask, pts: P[], highlight = true) {
  for (let k = 0; k < pts.length - 1; k++) {
    const [a, b] = [pts[k], pts[k + 1]],
      n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let i = 0; i <= n; i++) {
      const x = Math.floor(a[0] + ((b[0] - a[0]) * i) / n),
        y = Math.floor(a[1] + ((b[1] - a[1]) * i) / n);
      if (!m.has(x, y)) continue;
      dim(p, x, y);
      if (highlight && m.has(x - 1, y) && !(i % 2)) brighten(p, x - 1, y);
    }
  }
}

/* ───────────── realistic skeleton ───────────── */
const AX = 28,
  AY = 80,
  /** Row of the foot centres when standing (soles end on row 79). */
  GROUND = 78;
/** Authoring y (feet at 65) → canvas y, used only to place the hips. */
function ymap(y: number) {
  const pts: P[] = [
    [14, 16],
    [28, 30.5],
    [41, 45],
    [45, 48],
    [65, GROUND],
    [68, AY],
  ];
  if (y <= pts[0][0]) return pts[0][1] + (y - pts[0][0]) * 1.04;
  for (let i = 1; i < pts.length; i++)
    if (y <= pts[i][0]) {
      const [a, b] = [pts[i - 1], pts[i]];
      return a[1] + ((y - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
    }
  return AY + (y - 68) * 0.67;
}
const HEAD_W = 10,
  HEAD_H = 11;
/**
 * Turn the authored pose into adult proportions. Each segment keeps its
 * authored direction but gets a realistic length: long legs, longer arms, a
 * modest head on a short neck. Poses standing or kneeling on the ground are
 * then dropped so the lowest foot lands on the floor line.
 */
function realistic(q0: Pose): Pose {
  const X = (x: number) => AX + (x - 24) * 1.15;
  const rel = (a0: P, b0: P, a1: P, sx: number, sy = sx): P => [
    a1[0] + (b0[0] - a0[0]) * sx,
    a1[1] + (b0[1] - a0[1]) * sy,
  ];
  const hip: P = [X(q0.hip[0]), ymap(q0.hip[1])];
  const chest = rel(q0.hip, q0.chest, hip, 1.15, 1.1);
  const arms = q0.arms.map((a) => {
    const s = rel(q0.chest, a[0], chest, 1.15, 1.1),
      e = rel(a[0], a[1], s, 1.3),
      h = rel(a[1], a[2], e, 1.3);
    return [s, e, h] as Limb;
  }) as [Limb, Limb];
  const legs = q0.legs.map((l) => {
    const t = rel(q0.hip, l[0], hip, 1.15, 0.75),
      k = rel(l[0], l[1], t, 1.5),
      f = rel(l[1], l[2], k, 1.5);
    return [t, k, f] as Limb;
  }) as [Limb, Limb];
  const h0: P = [q0.head[0] + 5, q0.head[1] + 5.5];
  const headC = rel(q0.chest, h0, chest, 1.1, 1.06);
  const q: Pose = { ...q0, hip, chest, arms, legs, headC };
  // Drop grounded poses onto the floor line.
  const footA = Math.max(...q0.legs.map((l) => l[2][1]));
  if (footA >= 62) {
    const dy = GROUND + (footA - 65) - Math.max(...legs.map((l) => l[2][1]));
    const move = (pt: P) => {
      pt[1] += dy;
    };
    [q.hip, q.chest, q.headC].forEach(move);
    for (const l of [...q.arms, ...q.legs]) l.forEach(move);
  }
  q.turn =
    q.action === 'lie'
      ? 'back'
      : q.mode === 'prostrate' || (q.action === 'pray' && q.mode === 'bow')
        ? 'down'
        : 'up';
  const dir = norm(q.chest, q.headC);
  q.neck = add(q.chest, dir[0] * 4.6, dir[1] * 4.6);
  fixPose(q);
  q.headC[0] = clamp(q.headC[0], 6.5, 49.5);
  q.headC[1] = clamp(q.headC[1], 6.5, 76);
  q.box =
    q.turn === 'up'
      ? [
          Math.round(q.headC[0] - HEAD_W / 2),
          Math.round(q.headC[1] - HEAD_H / 2),
        ]
      : [Math.round(q.headC[0]), Math.round(q.headC[1])];
  return q;
}
/** Small per-action corrections after the mapping (contacts with the floor). */
function fixPose(q: Pose) {
  const fy = q.away ? -0.5 : 0.12;
  // Leave room for tall hats when the head is turned forward.
  if (q.turn === 'down') q.headC[0] = Math.min(q.headC[0], 44);
  if (q.mode === 'prostrate') {
    // Palms flat on the floor either side of the head.
    for (const arm of q.arms) {
      const h = arm[2];
      h[1] = GROUND - 0.5 + (h[0] - AX) * fy * 0.9;
      arm[1] = add(lerp(arm[0], h, 0.5), 1.2, -0.8);
    }
  }
}
/** One skeleton for every part, so all layers line up frame by frame. */
export function pose(action: Action, facing: 'SE' | 'NE', f: number): Pose {
  return realistic(rawPose(action, facing, f));
}
SHADES.push(
  K.skin,
  K.hair,
  K.cloth,
  K.sash,
  K.hat,
  K.prop,
  F.charcoal,
  F.steel,
);
/** Pose authoring (feet at y 65); realistic() maps it to the canvas. */
function rawPose(action: Action, facing: 'SE' | 'NE', f: number): Pose {
  const away = facing === 'NE',
    fy = away ? -0.5 : 0.5,
    hx = away ? 0 : 1;
  const standing = (b: number): Pose => ({
    head: [19 + hx, 14 + b],
    headC: [0, 0],
    box: [0, 0],
    turn: 'up',
    neck: [0, 0],
    chest: [24, 31 + b],
    hip: [24, 41 + b],
    arms: [
      [
        [18.5, 28 + b],
        [17.5, 36 + b],
        [17.5, 43 + b],
      ],
      [
        [29.5, 28 + b],
        [30.5, 36 + b],
        [30.5, 43 + b],
      ],
    ],
    legs: [
      [
        [21.5, 45 + b],
        [21.5, 55],
        [21.5, 65],
      ],
      [
        [26.5, 45 + b],
        [26.5, 55],
        [26.5, 65],
      ],
    ],
    mode: 'stand',
    away,
    walking: false,
    frame: f,
    action,
  });
  const chair = (b: number): Pose => {
    const q = standing(9 + b),
      kx = 6,
      ky = away ? -2 : 2;
    q.mode = 'chair';
    q.legs = [
      [
        [21.5, 54 + b],
        [21.5 + kx, 54 + ky + b],
        [21.5 + kx, away ? 62 : 65],
      ],
      [
        [26.5, 54 + b],
        [26.5 + kx, 54 + ky + b],
        [26.5 + kx, away ? 62 : 65],
      ],
    ];
    q.arms[0][2] = [24, 49 + b];
    q.arms[0][1] = [18, 44 + b];
    q.arms[1][2] = [30, 49 + b];
    q.arms[1][1] = [31, 44 + b];
    return q;
  };
  const floor = (b: number): Pose => {
    const q = standing(18 + b);
    q.mode = 'floor';
    q.legs = [
      [
        [21, 62],
        [15.5, 64],
        [25, 66],
      ],
      [
        [27, 62],
        [32.5, 64],
        [23, 66],
      ],
    ];
    q.arms[0][1] = [17.5, 54 + b];
    q.arms[0][2] = [19, 60];
    q.arms[1][1] = [30.5, 54 + b];
    q.arms[1][2] = [29, 60];
    return q;
  };
  const walkLegs = (q: Pose, stride: number) => {
    const s = Math.round(Math.sin((f / 6) * Math.PI * 2) * stride),
      lift = (i: number) =>
        Math.cos((f / 6) * Math.PI * 2) * (i ? -1 : 1) > 0.3 ? 1 : 0;
    q.legs.forEach((leg, i) => {
      const d = i ? -s : s;
      leg[2] = [leg[2][0] + d, 65 + d * fy * 0.4 - lift(i)];
      leg[1] = [leg[1][0] + d * 0.5 + 0.5, 55 + d * fy * 0.2 - lift(i)];
    });
    q.walking = true;
    return s;
  };
  let q: Pose;
  switch (action) {
    case 'idle': {
      q = standing(f >= 2 ? 1 : 0);
      if (f === 3) q.arms[1][2] = add(q.arms[1][2], 0.5, -1);
      break;
    }
    case 'walk': {
      const b = f % 3 === 0 ? 0 : 1;
      q = standing(b);
      const s = walkLegs(q, 4);
      q.arms[0][2] = add(q.arms[0][2], -s * 0.6, -Math.abs(s) * 0.25);
      q.arms[0][1] = add(q.arms[0][1], -s * 0.25, 0);
      q.arms[1][2] = add(q.arms[1][2], s * 0.6, -Math.abs(s) * 0.25);
      q.arms[1][1] = add(q.arms[1][1], s * 0.25, 0);
      break;
    }
    case 'carry': {
      const b = f % 3 === 0 ? 0 : 1;
      q = standing(b);
      walkLegs(q, 3);
      q.arms[0][1] = [18.5, 35 + b];
      q.arms[0][2] = [22, 38 + b];
      q.arms[1][1] = [31, 35 + b];
      q.arms[1][2] = [29, 38 + b];
      break;
    }
    case 'talk': {
      q = standing(f % 2);
      const hand: P[] = [
        [33, 34],
        [34.5, 31],
        [33.5, 33],
        [34, 30.5],
      ];
      q.arms[1][1] = [32, 37 + (f % 2)];
      q.arms[1][2] = add(hand[f], 0, f % 2);
      q.head = add(q.head, f === 1 || f === 2 ? 1 : 0, 0);
      break;
    }
    case 'wave': {
      q = standing(0);
      q.arms[1][1] = [33, 25];
      q.arms[1][2] = [
        [34, 16],
        [37, 17],
        [35, 15.5],
        [37.5, 17],
      ][f] as P;
      break;
    }
    case 'celebrate': {
      // Running celebration, index finger pointed to the sky.
      q = standing(f % 2);
      q.head = add(q.head, 1, 0);
      q.chest = add(q.chest, 0.5, 0);
      q.arms[1][1] = [33.5, 22 + (f % 2)];
      q.arms[1][2] = [
        [35, 14],
        [35.5, 12.5],
        [35, 14.5],
        [36, 12],
      ][f] as P;
      q.arms[0][1] = [17, 36];
      q.arms[0][2] = [20, 43 + (f % 2)];
      const s = [1, 0, -1, 0][f];
      q.legs[0][2] = [21.5 + s * 2, 65];
      q.legs[1][2] = [26.5 - s * 2, 65 - Math.abs(s)];
      q.legs[1][1] = [27 - s, 55 - Math.abs(s)];
      break;
    }
    case 'ride': {
      // Standing on a kick scooter: one foot behind the other on a long low
      // deck, leaning in, both hands reaching forward to the handlebar.
      const b = [0, 1, 1, 0][f];
      q = standing(b);
      q.head = add(q.head, 2, 1);
      q.chest = add(q.chest, 1.5, 0.5);
      q.legs = [
        [
          [21.5, 45 + b],
          [20.5, 54],
          [18.5, 61.5],
        ],
        [
          [26.5, 45 + b],
          [27.5, 54],
          [28, 61.5],
        ],
      ];
      q.arms[0][1] = [25, 36 + b];
      q.arms[0][2] = [34.5, 40 + b];
      q.arms[1][1] = [33, 35 + b];
      q.arms[1][2] = [36.5, 40 + b];
      break;
    }
    case 'speech': {
      // Rally speech: pointing out and up at the crowd, other hand open at
      // the chest.
      const b = f % 2;
      q = standing(b);
      q.head = add(q.head, f === 1 || f === 2 ? 1 : 0, 0);
      q.arms[1][1] = [34, 27 + b];
      q.arms[1][2] = (
        [
          [38, 19],
          [39.5, 21],
          [38.5, 18],
          [40, 20.5],
        ] as P[]
      )[f];
      q.arms[0][1] = [19, 37 + b];
      q.arms[0][2] = [24.5, 34 + b];
      break;
    }
    case 'bat': {
      // A cover drive: stance with the bat up behind, front foot forward as
      // the bat comes down, through the ball low, then a high follow-through.
      q = standing(0);
      const hands: [P, P, P, P][] = [
        // [front elbow, front hand, back elbow, back hand]
        [
          [29, 30],
          [25, 24],
          [22, 32],
          [26, 25],
        ],
        [
          [28, 31],
          [32, 34],
          [24, 34],
          [31, 34],
        ],
        [
          [31, 40],
          [35, 46],
          [27, 40],
          [34, 45],
        ],
        [
          [32, 30],
          [35, 22],
          [27, 30],
          [34, 23],
        ],
      ];
      const [fe, fh, be, bh] = hands[f];
      q.arms[1][1] = fe;
      q.arms[1][2] = fh;
      q.arms[0][1] = be;
      q.arms[0][2] = bh;
      if (f >= 1) {
        // Front (right in SE) leg strides toward the ball, back leg braced.
        q.legs[1] = [
          [26.5, 45],
          [31, 54],
          [33.5, 64],
        ];
        q.legs[0] = [
          [21.5, 45],
          [20, 55],
          [18, 64.5],
        ];
        q.head = add(q.head, f === 2 ? 2 : 1, f === 2 ? 1 : 0);
      }
      break;
    }
    case 'cheer': {
      // Arms flung wide, chest out.
      q = standing(f >= 2 ? 1 : 0);
      const lift = [0, -1, -2, -1][f];
      q.arms[0][1] = [13, 30 + lift * 0.5];
      q.arms[0][2] = [7, 26 + lift];
      q.arms[1][1] = [35, 30 + lift * 0.5];
      q.arms[1][2] = [41, 26 + lift];
      break;
    }
    case 'cross-arms': {
      // Standing tall with folded arms.
      const b = f >= 2 ? 1 : 0;
      q = standing(b);
      q.arms[0][1] = [17.5, 36 + b];
      q.arms[0][2] = [28.5, 34 + b];
      q.arms[1][1] = [30.5, 36 + b];
      q.arms[1][2] = [20, 35 + b];
      break;
    }
    case 'guard': {
      // Fighting stance: fists up by the chin, knees soft, bouncing.
      const b = f % 2;
      q = standing(1 + b);
      q.legs[0][2] = [19.5, 65];
      q.legs[1][2] = [28.5, 64];
      q.legs[0][1] = [20.5, 55];
      q.legs[1][1] = [28, 55];
      q.arms[0][1] = [19, 36 + b];
      q.arms[0][2] = [24.5, 29 + b];
      q.arms[1][1] = [32, 35 + b];
      q.arms[1][2] = [30.5, 28.5 + b + (f === 2 ? 1 : 0)];
      break;
    }
    case 'punch': {
      // Jab from the guard: the lead hand snaps out and back.
      q = standing(1);
      q.legs[0][2] = [19.5, 65];
      q.legs[1][2] = [28.5, 64];
      q.arms[0][1] = [19, 36];
      q.arms[0][2] = [24.5, 29];
      const reach = [0, 5, 9, 4][f];
      q.arms[1][1] = [32 + reach * 0.5, 31];
      q.arms[1][2] = [31 + reach, 28.5];
      q.head = add(q.head, f === 2 ? 1 : 0, 0);
      break;
    }
    case 'belt-pose': {
      // Champion's pose: hands on the title belt at the hips.
      const b = f >= 2 ? 1 : 0;
      q = standing(b);
      q.legs[0][2] = [20.5, 65];
      q.legs[1][2] = [27.5, 65];
      q.arms[0][1] = [15, 37 + b];
      q.arms[0][2] = [18.5, 44 + b];
      q.arms[1][1] = [33, 37 + b];
      q.arms[1][2] = [29.5, 44 + b];
      break;
    }
    case 'taunt': {
      // Standing over a fallen opponent: leaning in, fist cocked.
      const b = f % 2;
      q = standing(1);
      q.head = add(q.head, 2, 2 + b);
      q.chest = add(q.chest, 1.5, 1.5);
      q.legs[0][2] = [19, 65];
      q.legs[1][2] = [29.5, 65];
      q.arms[0][1] = [16, 38];
      q.arms[0][2] = [21, 33 - b];
      q.arms[1][1] = [33, 37];
      q.arms[1][2] = [33.5, 45 + b];
      break;
    }
    case 'lie': {
      // Lying on the back on the canvas.
      q = standing(0);
      q.mode = 'bow';
      const y = 61;
      q.hip = [21, y + 1];
      q.chest = [30, y];
      q.head = [33, y - 9 + f];
      q.arms = [
        [
          [29, y - 3],
          [34, y - 6],
          [39, y - 8],
        ],
        [
          [31, y + 1],
          [36, y + 2],
          [40, y + 1],
        ],
      ];
      q.legs = [
        [
          [20, y + 2],
          [14, y + 2],
          [8, y + 3],
        ],
        [
          [21, y + 3],
          [15, y + 5],
          [9.5, y + 5],
        ],
      ];
      break;
    }
    case 'arms-out': {
      // Standing still, arms held straight out, chest proud.
      const b = f >= 2 ? 1 : 0;
      q = standing(b);
      q.legs[0][2] = [20.5, 65];
      q.legs[1][2] = [27.5, 65];
      q.arms[0][1] = [12, 29 + b];
      q.arms[0][2] = [5.5, 28.5 + b];
      q.arms[1][1] = [36, 29 + b];
      q.arms[1][2] = [42.5, 28.5 + b];
      break;
    }
    case 'hand-on-heart': {
      const b = f >= 2 ? 1 : 0;
      q = standing(b);
      q.arms[1][1] = [31, 37 + b];
      q.arms[1][2] = [26, 32 + b + (f === 3 ? 1 : 0)];
      q.arms[0][2] = add(q.arms[0][2], -1, 0);
      break;
    }
    case 'kick': {
      q = standing(f === 1 ? 1 : 0);
      const leg: Limb[] = [
        [
          [26.5, 45],
          [24, 55],
          [20, 61],
        ],
        [
          [26.5, 45],
          [29, 56],
          [32.5, 63],
        ],
        [
          [26.5, 45],
          [31, 52],
          [36, 55],
        ],
        [
          [26.5, 45],
          [27.5, 55],
          [28.5, 64],
        ],
      ];
      q.legs[1] = leg[f];
      q.legs[0] = [
        [21.5, 45],
        [22, 55],
        [23, 65],
      ];
      q.arms[0][1] = [14, 33];
      q.arms[0][2] = [11, 37 - (f === 2 ? 2 : 0)];
      q.arms[1][1] = [32, 35];
      q.arms[1][2] = [34.5, 40];
      if (f === 1 || f === 2) q.head = add(q.head, -1, 0);
      break;
    }
    case 'dive': {
      // Goalkeeper launching low across the goal mouth.
      if (f === 0) {
        q = standing(4);
        q.legs.forEach((l) => (l[1] = add(l[1], 2, -2)));
        q.arms[0][1] = [24, 31];
        q.arms[0][2] = [31, 32];
        q.arms[1][1] = [33, 31];
        q.arms[1][2] = [37, 31];
        break;
      }
      const ground = f === 1 ? 0 : 1,
        y = away ? 44 + ground * 10 : 50 + ground * 10;
      q = standing(0);
      q.mode = 'bow';
      q.hip = [18, y + 2];
      q.chest = [28, y];
      q.head = [31, y - 7 + (f === 3 ? 1 : 0)];
      q.arms = [
        [
          [27, y - 3],
          [34, y - 4],
          [41, y - 5 + (f === 3 ? 1 : 0)],
        ],
        [
          [29, y - 1],
          [35, y + 1],
          [41.5, y + 2],
        ],
      ];
      q.legs = [
        [
          [17, y + 3],
          [11.5, y + 4],
          [6, y + 5],
        ],
        [
          [19, y + 4],
          [13, y + 6],
          [7.5, y + 7],
        ],
      ];
      break;
    }
    case 'slide': {
      // Sliding tackle: leaning back, lead leg skimming the grass.
      const d = f % 2;
      q = standing(0);
      q.mode = 'kneel';
      q.chest = [19 + d, 52];
      q.hip = [22 + d, 59];
      q.head = [13 + d, 34];
      q.legs = [
        [
          [21 + d, 61],
          [16.5 + d, 63],
          [23 + d, 66],
        ],
        [
          [23 + d, 61],
          [29.5 + d, 63],
          [36 + d, 64.5],
        ],
      ];
      q.arms = [
        [
          [15 + d, 49],
          [13 + d, 56],
          [12.5 + d, 62],
        ],
        [
          [23 + d, 48],
          [28 + d, 45],
          [31 + d, 41 + d],
        ],
      ];
      break;
    }
    case 'pour': {
      q = standing(f >= 3 ? 1 : 0);
      const tilt = [0, 1, 2, 3, 2, 1][f];
      q.arms[1][1] = [32, 34];
      q.arms[1][2] = [34 + tilt * 0.5, 34 - tilt];
      q.arms[0][1] = [19, 36];
      q.arms[0][2] = [25, 38];
      break;
    }
    case 'sweep': {
      q = standing(f % 3 === 1 ? 1 : 0);
      const s = [-3, -1.5, 0.5, 2.5, 0.5, -1.5][f];
      q.chest = add(q.chest, 1, 1);
      q.head = add(q.head, 1, 1);
      q.arms[0][1] = [21, 33];
      q.arms[0][2] = [26 + s * 0.4, 35];
      q.arms[1][1] = [31, 37];
      q.arms[1][2] = [30 + s, 44];
      break;
    }
    case 'sit': {
      q = chair(f);
      break;
    }
    case 'write': {
      q = chair(f >= 2 ? 1 : 0);
      q.arms[1][1] = [32, 44];
      q.arms[1][2] = [34 + [0, 1, 2, 1][f], 47 - (f % 2)];
      q.arms[0][2] = [29, 48];
      break;
    }
    case 'read': {
      q = floor(f >= 2 ? 1 : 0);
      q.arms[0][1] = [17.5, 53];
      q.arms[0][2] = [20.5, 51];
      q.arms[1][1] = [30.5, 53];
      q.arms[1][2] = [27.5, 51 - (f === 3 ? 2 : 0)];
      break;
    }
    case 'teach': {
      q = floor(f % 2);
      const hand: P[] = [
        [33, 49],
        [35, 46],
        [34, 48],
        [35.5, 45],
      ];
      q.arms[1][1] = [32, 52];
      q.arms[1][2] = hand[f];
      break;
    }
    case 'sujood': {
      // The prostration of the prayer held still; the back rises a little
      // with each breath.
      q = rawPose('pray', facing, 4);
      q.action = 'sujood';
      q.frame = f;
      if (f === 1) {
        q.chest = [q.chest[0], q.chest[1] - 0.6];
        q.hip = [q.hip[0], q.hip[1] - 0.3];
      }
      break;
    }
    case 'pray': {
      // Facing the viewer, forward lean is kept shallow so poses stay on the canvas.
      const fy = away ? -0.5 : 0.12;
      const posture = Math.floor(f / 2);
      if (posture === 0) {
        // Standing: hands folded on the chest.
        q = standing(f % 2 ? 0 : 0);
        q.arms[0][1] = [18.5, 36];
        q.arms[0][2] = [23, 35];
        q.arms[1][1] = [30, 36];
        q.arms[1][2] = [25.5, 35];
      } else if (posture === 1) {
        // Bowing: back level, hands on knees.
        q = standing(0);
        q.mode = 'bow';
        q.hip = [22, 44];
        q.chest = [33, 44 + 11 * fy * 0.6];
        q.head = [35, 38 + 11 * fy * 0.6];
        q.legs = [
          [
            [20.5, 46],
            [21, 56],
            [21, 65],
          ],
          [
            [24.5, 46],
            [25.5, 56],
            [25.5, 65],
          ],
        ];
        q.arms = [
          [
            [30, 42 + 8 * fy],
            [27, 50],
            [23.5, 55],
          ],
          [
            [32, 43 + 8 * fy],
            [29, 51],
            [26.5, 55],
          ],
        ];
      } else if (posture === 2) {
        // Prostration: knees, hands and forehead on the floor.
        const ground = (x: number) => 66 + (x - 24) * fy;
        q = standing(0);
        q.mode = 'prostrate';
        q.hip = [21, ground(21) - 12];
        q.chest = [30, ground(30) - 7];
        q.head = [33, ground(37) - 8];
        q.legs = [
          [
            [19.5, ground(19.5) - 11],
            [26, ground(26) - 1.5],
            [13.5, ground(13.5) - 1],
          ],
          [
            [22.5, ground(22.5) - 11],
            [28, ground(28) - 1.5],
            [15.5, ground(15.5) - 1],
          ],
        ];
        q.arms = [
          [
            [28, ground(28) - 11],
            [31, ground(31) - 5],
            [33.5, ground(33.5) - 1],
          ],
          [
            [31, ground(31) - 10],
            [36, ground(36) - 5],
            [40, ground(40) - 1],
          ],
        ];
      } else {
        // Sitting on the heels.
        q = standing(14);
        q.mode = 'kneel';
        q.head = [18 + hx, 28];
        q.chest = [23, 45];
        q.hip = [22, 54];
        q.legs = [
          [
            [20, 58],
            [28, 63 + fy],
            [16, 66],
          ],
          [
            [24, 58],
            [31, 63 + fy],
            [19, 66],
          ],
        ];
        q.arms = [
          [
            [18, 42],
            [20, 51],
            [26, 57],
          ],
          [
            [28, 42],
            [30, 50],
            [30, 57],
          ],
        ];
      }
      break;
    }
    default:
      q = standing(0);
  }
  return q;
}

/* ───────────── heads ───────────── */
/*
 * Heads are drawn in a small head space (the 10×11 head box plus margins for
 * hair, beards and hats), then placed on the canvas upright or turned for
 * bowing and lying poses. Templates are written in head-box coordinates: each
 * string starts at x = -3 and the first row is y = -3.
 */
export const HS = { w: 22, h: 26, ox: 6, oy: 6 };
export type Template = string[];
function cells(t: Template, ch = '#'): P[] {
  const out: P[] = [];
  t.forEach((row, j) => {
    for (let i = 0; i < row.length; i++)
      if (ch.includes(row[i])) out.push([i - 3, j - 3]);
  });
  return out;
}
/** Mask in head space from template cells. */
export function tmask(t: Template, ch = '#') {
  const m = new Mask(HS.w, HS.h);
  for (const [x, y] of cells(t, ch)) m.set(x + HS.ox, y + HS.oy);
  return m;
}
const hp = (hs: Pixels, x: number, y: number, c: string) =>
  hs.pixel(x + HS.ox, y + HS.oy, c);
const hmk = () => new Mask(HS.w, HS.h);
/** Head-box rectangle / ellipse helpers in head space. */
const hrect = (m: Mask, x: number, y: number, w: number, h: number) =>
  m.rect(x + HS.ox, y + HS.oy, w, h);
const hell = (m: Mask, cx: number, cy: number, rx: number, ry: number) =>
  m.ellipse(cx + HS.ox, cy + HS.oy, rx, ry);

// Bare head silhouettes: 3/4 view toward the right, and the back of the head.
export const SKULL_SE: Template = [
  '.................',
  '.................',
  '.................',
  '......####.......',
  '....########.....',
  '...##########....',
  '...##########....',
  '...##########....',
  '...#########.....',
  '...##########....',
  '....##########...',
  '....#########....',
  '.....########....',
  '......######.....',
];
export const SKULL_NE: Template = [
  '.................',
  '.................',
  '.................',
  '......####.......',
  '....########.....',
  '...##########....',
  '...##########....',
  '...##########....',
  '...##########....',
  '...##########....',
  '...##########....',
  '...##########....',
  '....########.....',
  '.....######......',
];
export type Hair = {
  se: Template;
  ne: Template;
  beard?: Template;
  /** Beard edge seen from behind (on the right cheek). */
  beardNE?: Template;
  style: 'straight' | 'curly' | 'buzz' | 'none';
  /** Bleached tips (on top). */
  tips?: boolean;
};
const SHORT_NE: Template = [
  '.................',
  '.................',
  '.....######......',
  '....########.....',
  '...##########....',
  '...##########....',
  '...##########....',
  '...##########....',
  '...#########.....',
  '...########......',
  '...########......',
  '...########......',
  '....######.......',
];
const BEARD_SHORT: Template = [
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.......#.........',
  '......###........',
  '.....####.###....',
  '.....####...#....',
  '......#######....',
  '.......#####.....',
];
const BEARD_FULL: Template = [
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '......##.........',
  '......###........',
  '....#####.###....',
  '....#####...#....',
  '.....########....',
  '......#######....',
  '.......#####.....',
];
const BEARD_NE_SHORT: Template = [
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '.................',
  '...........#.....',
  '...........##....',
  '..........###....',
  '.........###.....',
];
export const HAIR: Record<string, Hair> = {
  'adult-man': {
    style: 'straight',
    se: [
      '.................',
      '.................',
      '.....######......',
      '....########.....',
      '...##########....',
      '...#####.........',
      '...###...........',
      '...##..#.........',
      '...##..#.........',
      '...##............',
      '...##............',
      '....#............',
    ],
    ne: SHORT_NE,
    beard: BEARD_SHORT,
    beardNE: BEARD_NE_SHORT,
  },
  'adult-man-short': {
    style: 'straight',
    se: [
      '.................',
      '.................',
      '.....######......',
      '....########.....',
      '...##########....',
      '...#####.........',
      '...###...........',
      '...##..#.........',
      '...##............',
      '...##............',
      '...##............',
    ],
    ne: SHORT_NE,
  },
  child: {
    style: 'straight',
    se: [
      '.................',
      '.................',
      '.....######......',
      '....########.....',
      '...##########....',
      '...#########.....',
      '...#####.........',
      '...##..#.........',
      '...##............',
      '...##............',
      '...##............',
    ],
    ne: SHORT_NE,
  },
  'adult-man-beard': {
    style: 'straight',
    se: [
      '.................',
      '.................',
      '.....#####.......',
      '....########.....',
      '...##########....',
      '...#####.........',
      '...###...........',
      '...##..#.........',
      '...##..#.........',
      '...##..#.........',
      '...##............',
    ],
    ne: SHORT_NE,
    beard: BEARD_FULL,
    beardNE: BEARD_NE_SHORT,
  },
  'adult-man-swept-beard': {
    style: 'straight',
    se: [
      '.................',
      '.......#####.....',
      '.....#########...',
      '....#########....',
      '...##########....',
      '...#####.........',
      '...###...........',
      '...##..#.........',
      '...##..#.........',
      '...##............',
      '...##............',
    ],
    ne: [
      '.................',
      '.......#####.....',
      '.....#########...',
      '....#########....',
      '...##########....',
      '...##########....',
      '...##########....',
      '...##########....',
      '...#########.....',
      '...########......',
      '...########......',
      '...########......',
      '....######.......',
    ],
    beard: BEARD_SHORT,
    beardNE: BEARD_NE_SHORT,
  },
  'adult-man-clean': {
    style: 'straight',
    se: [
      '.................',
      '.......#####.....',
      '.....#########...',
      '....#########....',
      '...##########....',
      '...#####.........',
      '...###...........',
      '...##..#.........',
      '...##............',
      '...##............',
      '...##............',
    ],
    ne: [
      '.................',
      '.......#####.....',
      '.....#########...',
      '....#########....',
      '...##########....',
      '...##########....',
      '...##########....',
      '...##########....',
      '...#########.....',
      '...########......',
      '...########......',
      '...#######.......',
      '....#####........',
    ],
  },
  'adult-man-curly': {
    style: 'curly',
    se: [
      '....######.......',
      '..##########.....',
      '.#############...',
      '.##############..',
      '.##############..',
      '.##########......',
      '.#######.........',
      '.######..........',
      '.######..........',
      '.#####...........',
      '..####...........',
      '...##............',
    ],
    ne: [
      '....######.......',
      '..##########.....',
      '.##############..',
      '.##############..',
      '.##############..',
      '.##############..',
      '.##############..',
      '.#############...',
      '.############....',
      '..##########.....',
      '..#########......',
      '...#######.......',
      '....#####........',
    ],
    beard: BEARD_FULL,
    beardNE: BEARD_NE_SHORT,
  },
  'adult-man-goatee': {
    style: 'straight',
    tips: true,
    se: [
      '.................',
      '.................',
      '.....######......',
      '....########.....',
      '...##########....',
      '...#####.........',
      '...###...........',
      '...##............',
      '...##............',
      '...##............',
      '...#.............',
    ],
    ne: SHORT_NE,
    beard: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '..........###....',
      '.................',
      '........####.....',
      '.........##......',
    ],
  },
  'adult-man-shaved': {
    style: 'buzz',
    se: [
      '.................',
      '.................',
      '.................',
      '......####.......',
      '....#######......',
      '...######........',
      '...####..........',
      '...##............',
      '...##............',
      '...#.............',
    ],
    ne: [
      '.................',
      '.................',
      '.................',
      '......####.......',
      '....########.....',
      '...##########....',
      '...##########....',
      '...#########.....',
      '...########......',
      '...#######.......',
      '....#####........',
    ],
  },
  'adult-man-shaved-beard': {
    style: 'buzz',
    se: [
      '.................',
      '.................',
      '.................',
      '......####.......',
      '....#######......',
      '...######........',
      '...####..........',
      '...##............',
      '...##............',
      '...#.............',
    ],
    ne: [
      '.................',
      '.................',
      '.................',
      '......####.......',
      '....########.....',
      '...##########....',
      '...##########....',
      '...#########.....',
      '...########......',
      '...#######.......',
      '....#####........',
    ],
    beard: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.......#.........',
      '......###........',
      '....#####.###....',
      '....#####...#....',
      '.....#########...',
      '.....########....',
      '......######.....',
      '.......####......',
    ],
    beardNE: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '...........#.....',
      '...........##....',
      '..........###....',
      '..........###....',
      '.........###.....',
      '........###......',
    ],
  },
  elder: {
    style: 'straight',
    se: [
      '.................',
      '.................',
      '.................',
      '.................',
      '...###...........',
      '...####..........',
      '...####..........',
      '...##..#.........',
      '...##..#.........',
      '...##............',
      '...##............',
      '....#............',
    ],
    ne: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '...#........#....',
      '...##########....',
      '...##########....',
      '...#########.....',
      '...########......',
      '...########......',
      '....######.......',
    ],
    beard: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '......##.........',
      '......###........',
      '....#####.####...',
      '....#####...##...',
      '.....########....',
      '.....#########...',
      '......#######....',
      '.......######....',
      '........####.....',
      '.........##......',
    ],
    beardNE: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '...........#.....',
      '...........##....',
      '..........###....',
      '.........####....',
      '........####.....',
      '........###......',
    ],
  },
  'adult-woman': {
    style: 'straight',
    se: [
      '.................',
      '.................',
      '.....######......',
      '..##########.....',
      '.############....',
      '.#########.......',
      '..######.........',
      '...#####.........',
      '...####..........',
      '...####..........',
      '...####..........',
      '...###...........',
      '....#............',
    ],
    ne: [
      '.................',
      '.................',
      '.....######......',
      '....########.....',
      '...##########....',
      '...##########....',
      '...##########....',
      '...##########....',
      '...##########....',
      '...#########.....',
      '...########......',
      '....######.......',
      '....######.......',
      '.....####........',
    ],
  },
  'adult-woman-loose': {
    style: 'straight',
    se: [
      '.................',
      '....######.......',
      '..##########.....',
      '.#############...',
      '.#############...',
      '.########...##...',
      '.######.....##...',
      '.#####.......#...',
      '.#####.......#...',
      '.#####.......#...',
      '.#####...........',
      '.######..........',
      '.######..........',
      '.#######.........',
      '.#######.........',
      '..######.........',
      '..#####..........',
      '...###...........',
    ],
    ne: [
      '.................',
      '....######.......',
      '..##########.....',
      '.############....',
      '.#############...',
      '.#############...',
      '.#############...',
      '.#############...',
      '.#############...',
      '.#############...',
      '.############....',
      '.############....',
      '.############....',
      '..###########....',
      '..##########.....',
      '...########......',
      '....#####........',
    ],
  },
};
export type Eyes =
  'open' | 'happy' | 'down' | 'closed' | 'blink' | 'determined';
export type Mouth = 'smile' | 'open' | 'flat' | 'shout' | 'o' | 'calm' | 'grin';
/** Expression by action and frame, so viewers can read what people do. */
export function expression(
  a: Action,
  f: number,
): { eyes: Eyes; mouth: Mouth; brows?: 'raised' } {
  switch (a) {
    case 'idle':
      return { eyes: f === 3 ? 'blink' : 'open', mouth: 'smile' };
    case 'talk':
    case 'teach':
      return { eyes: 'open', mouth: f % 2 ? 'open' : 'smile' };
    case 'wave':
      return {
        eyes: f % 2 ? 'happy' : 'open',
        mouth: f % 2 ? 'grin' : 'smile',
      };
    case 'cheer':
    case 'celebrate':
      return { eyes: 'happy', mouth: f % 2 ? 'grin' : 'shout' };
    case 'arms-out':
    case 'hand-on-heart':
      return { eyes: 'happy', mouth: f >= 2 ? 'open' : 'grin' };
    case 'belt-pose':
      return {
        eyes: f === 3 ? 'happy' : 'open',
        mouth: f >= 2 ? 'grin' : 'smile',
      };
    case 'read':
      return { eyes: 'down', mouth: f === 3 ? 'o' : 'calm' };
    case 'write':
      return { eyes: 'down', mouth: 'flat' };
    case 'pray':
    case 'sujood':
      return { eyes: 'closed', mouth: 'calm' };
    case 'guard':
      return { eyes: 'determined', mouth: 'flat' };
    case 'punch':
    case 'kick':
      return {
        eyes: 'determined',
        mouth: f === 1 || f === 2 ? 'shout' : 'flat',
      };
    case 'slide':
    case 'dive':
      return { eyes: 'determined', mouth: 'shout' };
    case 'taunt':
      return { eyes: 'determined', mouth: 'shout' };
    case 'bat':
      return { eyes: 'determined', mouth: 'flat' };
    case 'lie':
      return { eyes: 'closed', mouth: 'o' };
    case 'sweep':
    case 'pour':
      return { eyes: f === 2 ? 'happy' : 'open', mouth: 'smile' };
    case 'sit':
      return { eyes: f === 1 ? 'blink' : 'open', mouth: 'smile' };
    case 'cross-arms':
      return { eyes: 'open', mouth: 'flat' };
    case 'ride':
      return { eyes: f === 2 ? 'happy' : 'open', mouth: 'smile' };
    case 'speech':
      return { eyes: 'open', mouth: f % 2 ? 'open' : 'grin', brows: 'raised' };
    default:
      return { eyes: 'open', mouth: 'smile' };
  }
}
const FACE = {
  eye: '#3B322E',
  lid: '#3B322E',
  white: '#D7DCD2',
  mouth: '#704C36',
  inner: '#3B322E',
  teeth: '#F5EEDB',
};
const SK = K.skin;
// Hand-shaded skin tones for the bare head (L light, S mid, D shadow).
const TONE_SE: Template = [
  '.................',
  '.................',
  '.................',
  '......SLLS.......',
  '....SSLLLLLS.....',
  '...SSSLLLLLLS....',
  '...SSSLLLLLLS....',
  '...SSSLLLLLLS....',
  '...SSSLSSLLS.....',
  '...SSSLLLLLLS....',
  '....SSLLLLLLLS...',
  '....DSLLLLDDS....',
  '.....DSLLLLLS....',
  '......DDSSSD.....',
];
const TONE_NE: Template = [
  '.................',
  '.................',
  '.................',
  '......SLLS.......',
  '....SSLLLLSS.....',
  '...SSSLLLLLSS....',
  '...SSSSSSSSSS....',
  '...SSSSSSSSSS....',
  '...SSSSSSSSSS....',
  '...SSSSSSSSSS....',
  '...SSSSSSSSSS....',
  '...DSSSSSSSSS....',
  '....DSSSSSSD.....',
  '.....DSSSSD......',
];
/** Skin of the bare head: lit from above and in front so the face reads. */
function paintSkull(hs: Pixels, away: boolean) {
  const skull = tmask(away ? SKULL_NE : SKULL_SE),
    tone = away ? TONE_NE : TONE_SE;
  for (const [k, c] of [
    ['L', SK[0]],
    ['S', SK[1]],
    ['D', SK[2]],
  ] as [string, string][])
    for (const [x, y] of cells(tone, k)) hp(hs, x, y, c);
  const ear: [number, number, string][] = away
    ? [
        [9, 5, SK[1]],
        [10, 5, SK[1]],
        [10, 6, SK[2]],
        [9, 6, SK[2]],
        [9, 7, SK[1]],
      ]
    : [
        [2, 5, SK[1]],
        [3, 5, SK[1]],
        [2, 6, SK[1]],
        [3, 6, SK[2]],
        [2, 7, SK[2]],
        [3, 7, SK[1]],
      ];
  for (const [x, y, c] of ear) hp(hs, x, y, c);
  return skull;
}
/** Hair and beard strands: lit streaks and dark partings in a mask. */
function texture(hs: Pixels, m: Mask, style: Hair['style'], beard = false) {
  const H = K.hair;
  for (let y = 0; y < HS.h; y++)
    for (let x = 0; x < HS.w; x++) {
      if (!m.has(x, y)) continue;
      const c = colourAt(hs, x, y);
      if (style === 'curly') {
        // Tight curls: small lit arcs with dark gaps between them.
        const k = (x * 3 + y * 5 + (y % 2) * 2) % 7;
        if (k === 0 && c === H[1]) hs.pixel(x, y, H[0]);
        else if (k === 4 && c !== H[0]) hs.pixel(x, y, H[2]);
      } else if (style === 'buzz') {
        // Close crop: the scalp a shade darker with a fine stubble.
        dim(hs, x, y);
        if ((x * 13 + y * 29 + ((x * y) % 3)) % 7 === 0 || !m.has(x, y - 1))
          hs.pixel(x, y, H[2]);
      } else if (beard) {
        // Beard: short vertical strands, lit tips along the edge.
        if ((x + y * 3) % 4 === 0 && c === H[1]) hs.pixel(x, y, H[2]);
        if (!m.has(x, y + 1) && x % 2 === 0) hs.pixel(x, y, H[1]);
      } else if (c === H[0]) {
        // Break the sheen into combed strands.
        if ((x - y) % 3 === 0) hs.pixel(x, y, H[1]);
      } else if (c === H[1] && (x + 2 * y) % 9 === 0) hs.pixel(x, y, H[2]);
    }
}
function paintHair(hs: Pixels, id: string, away: boolean) {
  const spec = HAIR[id] ?? HAIR['adult-man'],
    H = K.hair;
  const m = tmask(away ? spec.ne : spec.se);
  if (spec.style === 'buzz') {
    // Skin stays visible; the stipple sits over the scalp.
    texture(hs, m, 'buzz');
  } else {
    shade(hs, m, H, { r: 2.6, hi: 0.72, lo: 0.2 });
    texture(hs, m, spec.style);
    if (!away && spec.style === 'straight') {
      // Fine hairline at the forehead and temple.
      for (let y = 0; y < HS.h; y++)
        for (let x = 0; x < HS.w; x++)
          if (m.has(x, y) && !m.has(x + 1, y) && !m.has(x, y + 1))
            hs.pixel(x, y, H[2]);
    }
  }
  if (spec.tips)
    for (const [x, y] of cells(away ? spec.ne : spec.se).filter(
      ([, y]) => y <= -1,
    ))
      if ((x + y) % 2 === 0) hp(hs, x, y, F.gold);
  const beard = spec[away ? 'beardNE' : 'beard'];
  let bm: Mask | null = null;
  if (beard) {
    bm = tmask(beard);
    shade(hs, bm, H, { r: 2, hi: 0.86, lo: 0.3 });
    texture(hs, bm, spec.style === 'curly' ? 'curly' : 'straight', true);
  }
  return { hair: m, beard: bm };
}
/** Brows, eyes, nose and mouth on the SE (3/4 right) face. */
function features(hs: Pixels, q: Pose, beard: boolean) {
  const { eyes, mouth, brows } = expression(q.action, q.frame),
    B = K.hair[2];
  // Brows.
  const by = brows === 'raised' ? 3 : 4;
  if (eyes === 'determined') {
    hp(hs, 3, 4, B);
    hp(hs, 4, 4, B);
    hp(hs, 5, 5, B);
    hp(hs, 8, 5, B);
    hp(hs, 9, 4, B);
  } else {
    hp(hs, 3, by, K.hair[1]);
    hp(hs, 4, by, B);
    hp(hs, 5, by, B);
    hp(hs, 8, by, B);
    hp(hs, 9, by, K.hair[1]);
    if (brows === 'raised') hp(hs, 4, 2, B);
  }
  // Eyes on row 6 under a shaded socket; a lash pixel over each iris.
  switch (eyes) {
    case 'open':
    case 'determined':
      hp(hs, 4, 6, FACE.white);
      hp(hs, 5, 6, FACE.eye);
      hp(hs, 8, 6, FACE.eye);
      if (eyes === 'determined') {
        hp(hs, 4, 5, FACE.lid);
        hp(hs, 5, 5, FACE.lid);
      }
      break;
    case 'happy':
      hp(hs, 4, 6, FACE.lid);
      hp(hs, 5, 6, FACE.eye);
      hp(hs, 8, 6, FACE.lid);
      hp(hs, 4, 7, SK[0]);
      hp(hs, 5, 7, SK[0]);
      break;
    case 'down':
      hp(hs, 4, 5, SK[2]);
      hp(hs, 5, 5, SK[2]);
      hp(hs, 4, 6, FACE.lid);
      hp(hs, 5, 6, FACE.eye);
      hp(hs, 8, 6, FACE.lid);
      break;
    case 'closed':
    case 'blink':
      hp(hs, 4, 5, SK[1]);
      hp(hs, 5, 5, SK[1]);
      hp(hs, 4, 6, SK[2]);
      hp(hs, 5, 6, FACE.lid);
      hp(hs, 8, 6, FACE.lid);
      break;
  }
  // Mouth on row 9; an open mouth drops the jaw a pixel.
  const lip = SK[2];
  if (beard) for (let x = 6; x <= 8; x++) hp(hs, x, 9, SK[1]);
  switch (mouth) {
    case 'smile':
      hp(hs, 6, 8, lip);
      hp(hs, 7, 9, FACE.mouth);
      hp(hs, 8, 9, FACE.mouth);
      break;
    case 'grin':
      hp(hs, 6, 8, lip);
      hp(hs, 6, 9, FACE.mouth);
      hp(hs, 7, 9, FACE.teeth);
      hp(hs, 8, 9, FACE.teeth);
      hp(hs, 9, 9, FACE.mouth);
      break;
    case 'calm':
      hp(hs, 7, 9, lip);
      hp(hs, 8, 9, FACE.mouth);
      break;
    case 'flat':
      hp(hs, 6, 9, FACE.mouth);
      hp(hs, 7, 9, FACE.mouth);
      hp(hs, 8, 9, FACE.mouth);
      break;
    case 'o':
      hp(hs, 7, 9, FACE.inner);
      hp(hs, 7, 10, lip);
      break;
    case 'open':
      hp(hs, 7, 9, FACE.teeth);
      hp(hs, 8, 9, FACE.inner);
      hp(hs, 7, 10, FACE.inner);
      hp(hs, 8, 10, lip);
      if (!beard) for (let x = 4; x <= 7; x++) hp(hs, x, 11, SK[2]);
      break;
    case 'shout':
      hp(hs, 6, 9, FACE.inner);
      hp(hs, 7, 9, FACE.teeth);
      hp(hs, 8, 9, FACE.teeth);
      hp(hs, 6, 10, FACE.inner);
      hp(hs, 7, 10, FACE.inner);
      hp(hs, 8, 10, FACE.inner);
      if (!beard) for (let x = 4; x <= 8; x++) hp(hs, x, 11, SK[2]);
      break;
  }
}
/** The whole base head (skin, hair, beard, face) in head space. */
export function headSprite(id: string, q: Pose) {
  const hs = new Pixels(HS.w, HS.h);
  paintSkull(hs, q.away);
  const { beard } = paintHair(hs, id, q.away);
  if (!q.away) features(hs, q, !!beard);
  return hs;
}
/** Head space → canvas transform for the pose's head turn. */
export function headXY(q: Pose, x: number, y: number): P {
  // x, y in head-box coordinates.
  if (q.turn === 'up') return [q.box[0] + x, q.box[1] + y];
  const [cx, cy] = q.box;
  // Turned 90°: the crown points to the screen right.
  return q.turn === 'down'
    ? [cx + (5 - y), cy + (x - 5)]
    : [cx + (5 - y), cy - (x - 5)];
}
/** Blit a head-space sprite onto the canvas. */
function placeHead(p: Pixels, q: Pose, hs: Pixels) {
  for (let j = 0; j < HS.h; j++)
    for (let i = 0; i < HS.w; i++) {
      const c = colourAt(hs, i, j);
      if (!c) continue;
      const [x, y] = headXY(q, i - HS.ox, j - HS.oy);
      p.pixel(x, y, c);
    }
}
/** Canvas mask of a head-space mask. */
function headMaskOn(p: Pixels, q: Pose, m: Mask) {
  const out = mk(p);
  for (let j = 0; j < HS.h; j++)
    for (let i = 0; i < HS.w; i++)
      if (m.has(i, j)) {
        const [x, y] = headXY(q, i - HS.ox, j - HS.oy);
        out.set(x, y);
      }
  return out;
}
/** The bare head silhouette on the canvas. */
function skullMask(p: Pixels, q: Pose) {
  return headMaskOn(p, q, tmask(q.away ? SKULL_NE : SKULL_SE));
}
/** Clear body-layer pixels that would cover the head and throat. */
function clearHead(p: Pixels, q: Pose) {
  const m = tmask(q.away ? SKULL_NE : SKULL_SE).grow(0.6);
  hrect(m, 2, 9, 8, 4);
  const c = headMaskOn(p, q, m);
  for (let i = 0; i < c.data.length; i++) if (c.data[i]) p.data[i * 4 + 3] = 0;
}

/* ───────────── body ───────────── */
/** Index of the arm/leg nearer the viewer (the character's right in SE). */
const nearI = (q: Pose) => (q.away ? 1 : 0);
const farI = (q: Pose) => (q.away ? 0 : 1);
export const upright = (q: Pose) => q.mode !== 'bow' && q.mode !== 'prostrate';
/** Actions where the far forearm and hand come round in front of the body. */
const FAR_FRONT = new Set<Action>([
  'carry',
  'cross-arms',
  'guard',
  'punch',
  'read',
  'teach',
  'write',
  'sit',
  'ride',
  'pour',
  'sweep',
  'hand-on-heart',
  'pray',
  'belt-pose',
  'taunt',
]);
const frontPose = (q: Pose) =>
  FAR_FRONT.has(q.action) && !(q.action === 'pray' && !upright(q));
/** Seen from the front, the far forearm comes round in front of the body. */
const farFront = (q: Pose) => !q.away && frontPose(q);
/** Seen from behind, hands working in front of the body are hidden by it. */
const handsHidden = (q: Pose) => q.away && frontPose(q);
/** Spine frame: u runs up the back, v to the screen right when upright. */
function spine(q: Pose) {
  const u = norm(q.hip, q.chest),
    v: P = [-u[1], u[0]];
  const at = (base: P, du: number, dv: number): P => [
    base[0] + u[0] * du + v[0] * dv,
    base[1] + u[1] * du + v[1] * dv,
  ];
  return { u, v, at };
}
/**
 * Torso silhouette from the hips to the base of the neck: broad shoulders,
 * a narrower waist, with rounded shoulder caps. `w` widens it for loose
 * clothing, `drop` extends it below the hips (jackets and tunics).
 */
function torsoMask(
  p: Pixels,
  q: Pose,
  o: { w?: number; drop?: number; neck?: number } = {},
) {
  const { at } = spine(q),
    w = o.w ?? 0,
    drop = o.drop ?? 0;
  const waist = lerp(q.hip, q.chest, 0.42),
    side = (du: number, hw: number, base: P) => [
      at(base, du, -hw),
      at(base, du, hw),
    ];
  const rows: [P, P][] = [
    side(-1.8 - drop, 5.4 + w + drop * 0.25, q.hip),
    side(0, 5.3 + w, q.hip),
    side(0, 4.5 + w, waist),
    side(0, 5.6 + w, q.chest),
    side(2.8, 6.2 + w, q.chest),
    side(4, 4.4 + w * 0.5, q.chest),
    side(4.8, o.neck ?? 2.3, q.chest),
  ] as [P, P][];
  const m = mk(p).poly([
    ...rows.map((r) => r[0]),
    ...rows.reverse().map((r) => r[1]),
  ]);
  for (const arm of q.arms) {
    const c = lerp(arm[0], arm[1], 0.12);
    m.disc(c[0], c[1], 2 + w * 0.5);
  }
  return m;
}
function armMask(
  p: Pixels,
  q: Pose,
  i: number,
  o: { r?: number; to?: number } = {},
) {
  const [s, e, h] = q.arms[i],
    r = o.r ?? 0,
    wrist = lerp(e, h, o.to ?? 0.8);
  return mk(p)
    .capsule(lerp(s, e, 0.08), e, 1.9 + r, 1.6 + r)
    .capsule(e, wrist, 1.65 + r, 1.3 + r);
}
function legMask(
  p: Pixels,
  q: Pose,
  i: number,
  o: { r?: number; to?: number } = {},
) {
  const [t, k, f] = q.legs[i],
    r = o.r ?? 0,
    ankle = lerp(k, ankleOf(q, i), o.to ?? 1);
  const m = mk(p)
    .capsule(t, k, 2.9 + r, 2.2 + r)
    .capsule(k, ankle, 2.2 + r, 1.4 + r);
  // Calf: a little fuller behind the shin.
  const back = q.away ? 0.4 : -0.4,
    c = lerp(k, ankle, 0.3);
  m.disc(c[0] + back, c[1], 2.3 + r);
  void f;
  return m;
}
/** Ankle: just above the foot centre when standing, at the foot otherwise. */
function ankleOf(q: Pose, i: number): P {
  const f = q.legs[i][2];
  return q.mode === 'floor' || q.mode === 'kneel' || q.mode === 'prostrate'
    ? f
    : [f[0], f[1] - 1.6];
}
type HandKind = 'relaxed' | 'open' | 'fist' | 'point' | 'hold' | 'flat';
function handKind(q: Pose, i: number): HandKind {
  const a = q.action,
    front = i === 1;
  switch (a) {
    case 'guard':
    case 'punch':
    case 'taunt':
      return 'fist';
    case 'celebrate':
    case 'speech':
      return front ? 'point' : a === 'speech' ? 'open' : 'fist';
    case 'wave':
    case 'talk':
    case 'teach':
      return front ? 'open' : 'relaxed';
    case 'cheer':
    case 'arms-out':
      return 'open';
    case 'pray':
      return upright(q) ? 'hold' : 'flat';
    case 'sujood':
      return 'flat';
    case 'bat':
    case 'carry':
    case 'read':
    case 'pour':
    case 'sweep':
    case 'write':
    case 'ride':
    case 'belt-pose':
    case 'cross-arms':
    case 'hand-on-heart':
      return 'hold';
    default:
      return 'relaxed';
  }
}
/** A hand with a thumb, shaped by what it is doing. */
function handMask(p: Pixels, q: Pose, i: number) {
  const [, e, h] = q.arms[i],
    d = norm(e, h),
    n: P = [-d[1], d[0]],
    t: P =
      n[0] > 0.3 || (Math.abs(n[0]) <= 0.3 && n[1] < 0) ? n : [-n[0], -n[1]],
    kind = handKind(q, i),
    m = mk(p);
  const at = (a: number, b: number): P => [
    h[0] + d[0] * a + t[0] * b,
    h[1] + d[1] * a + t[1] * b,
  ];
  switch (kind) {
    case 'fist':
      m.disc(h[0], h[1], 1.9);
      break;
    case 'point': {
      m.disc(h[0], h[1], 1.7);
      const dir: P = q.action === 'celebrate' ? [0.15, -1] : norm(e, h);
      m.capsule(h, [h[0] + dir[0] * 3.6, h[1] + dir[1] * 3.6], 0.6);
      break;
    }
    case 'open':
      m.capsule(at(-0.7, 0), at(1.6, 0), 1.5);
      m.capsule(at(1.2, -0.5), at(2.8, -0.6), 0.9);
      m.disc(...at(0.2, 1.6), 0.8);
      break;
    case 'flat':
      m.capsule(at(-0.6, 0), at(1.6, 0), 1.3);
      break;
    case 'hold':
      m.capsule(at(-0.5, 0), at(0.9, 0), 1.6);
      m.disc(...at(0.4, 1.3), 0.8);
      break;
    default:
      m.capsule(at(-0.7, 0), at(1.3, -0.2), 1.4);
      m.capsule(at(1.2, -0.3), at(2.2, -0.4), 0.9);
      m.disc(...at(0.1, 1.4), 0.7);
  }
  return m;
}
function drawHand(p: Pixels, q: Pose, i: number) {
  const m = handMask(p, q, i);
  shade(p, m, K.skin, { r: 1.6, hi: 0.74, lo: 0.1 });
  contour(p, m);
  const kind = handKind(q, i),
    h = q.arms[i][2];
  if (kind === 'fist') {
    // Knuckles and the thumb across the fingers.
    const d = norm(q.arms[i][1], h);
    p.pixel(h[0] + d[0] * 1.2, h[1] + d[1] * 1.2, K.skin[2]);
    p.pixel(h[0] - 0.5, h[1] + 0.5, K.skin[0]);
  }
}
function drawHands(p: Pixels, q: Pose, which: number[] = [0, 1]) {
  for (const i of which) drawHand(p, q, i);
}
/** Shoes with a sole, pointing the way the person faces. */
function shoeMask(p: Pixels, q: Pose, i: number) {
  const [fx, fy] = q.legs[i][2],
    m = mk(p);
  if (q.mode === 'floor' || q.mode === 'kneel' || q.mode === 'prostrate') {
    m.ellipse(fx, fy, 2.6, 1.6);
    return { m, sole: null as Mask | null };
  }
  if (q.away) {
    m.ellipse(fx + 0.6, fy + 0.4, 2.3, 1.7).rect(fx - 1, fy - 1.5, 3, 2);
    m.rect(fx + 1, fy - 1, 2, 1);
  } else {
    m.ellipse(fx + 1.3, fy + 0.5, 3.2, 1.6)
      .rect(fx - 1.5, fy - 0.5, 3.5, 2)
      .rect(fx - 1, fy - 1.5, 3, 1);
  }
  const sole = mk(p);
  for (let x = 0; x < p.width; x++)
    for (let y = p.height - 1; y >= 0; y--)
      if (m.has(x, y)) {
        sole.set(x, y);
        break;
      }
  return { m, sole };
}
const SHOE = [F.charcoal[1], F.charcoal[2], F.ink];
function drawShoes(p: Pixels, q: Pose, which = [farI(q), nearI(q)]) {
  for (const i of which) {
    const { m, sole } = shoeMask(p, q, i);
    shade(p, m, SHOE, { r: 1.6, hi: 0.7, lo: 0.25 });
    contour(p, m);
    if (sole) fill(p, sole, F.ink);
    // Toe-cap shine.
    const [fx, fy] = q.legs[i][2];
    if (q.mode !== 'floor' && q.mode !== 'kneel' && q.mode !== 'prostrate')
      p.pixel(fx + (q.away ? 1 : 2.5), fy - (q.away ? 0.5 : 0), F.charcoal[0]);
  }
}
/** The neck from the top of the torso up under the jaw. */
function drawNeck(p: Pixels, q: Pose) {
  const top = headXY(q, q.away ? 5 : 4, 9.5),
    m = mk(p).capsule(q.neck, top, 2.2, 2);
  shade(p, m, K.skin, { r: 2, hi: 0.85, lo: 0.3 });
  // Shadow under the jaw.
  if (q.turn === 'up') {
    const jaw = skullMask(p, q);
    castShadow(p, jaw, 0, 1, m);
    castShadow(p, jaw, 0, 2, m);
  }
}
function stool(p: Pixels, q: Pose) {
  // A simple stool under chair-seated poses, so desk workers never float.
  const [x] = q.hip,
    top = Math.round(q.hip[1] + 2.5);
  const post = mk(p).rect(x - 0.5, top + 1, 2, AY - top - 2);
  shade(p, post, F.steel, { r: 1 });
  const foot = mk(p)
    .rect(x - 5, AY - 2, 11, 1)
    .rect(x - 5, AY - 1, 2, 1)
    .rect(x + 4, AY - 1, 2, 1);
  fill(p, foot, F.charcoal[2]);
  const seat = mk(p).ellipse(x + 1, top + 0.5, 7, 2);
  shade(p, seat, F.charcoal, { r: 1.5 });
}
function drawBase(p: Pixels, id: string, q: Pose) {
  if (q.mode === 'chair') stool(p, q);
  const U = F.charcoal,
    fi = farI(q),
    ni = nearI(q);
  // A plain dark undersuit; garments cover it.
  const fa = armMask(p, q, fi);
  shade(p, fa, U, { r: 2 });
  if (!farFront(q)) drawHand(p, q, fi);
  if (handsHidden(q)) {
    const na = armMask(p, q, ni);
    shade(p, na, U, { r: 2 });
    drawHand(p, q, ni);
  }
  for (const i of [fi, ni]) {
    const l = legMask(p, q, i);
    shade(p, l, U, { r: 2.2 });
    contour(p, l);
  }
  drawShoes(p, q);
  const t = torsoMask(p, q);
  shade(p, t, U, { r: 3 });
  drawNeck(p, q);
  if (farFront(q)) {
    const fore = mk(p).capsule(
      q.arms[fi][1],
      lerp(q.arms[fi][1], q.arms[fi][2], 0.8),
      1.9,
      1.5,
    );
    shade(p, fore, U, { r: 2 });
    contour(p, fore);
    drawHand(p, q, fi);
  }
  if (handsHidden(q)) {
    // Upper arm over the back; forearm and hand were drawn behind the body.
    const up = mk(p).capsule(
      lerp(q.arms[ni][0], q.arms[ni][1], 0.08),
      q.arms[ni][1],
      1.9,
      1.6,
    );
    shade(p, up, U, { r: 2 });
    contour(p, up);
  } else {
    const na = armMask(p, q, ni);
    shade(p, na, U, { r: 2 });
    contour(p, na);
    drawHand(p, q, ni);
  }
  placeHead(p, q, headSprite(id, q));
}

/* ───────────── garments ───────────── */
type Part = 'all' | 'upper' | 'fore';
/** Cloth over one arm: long (to the wrist), wide-cuffed or short-sleeved. */
function sleeve(
  p: Pixels,
  q: Pose,
  i: number,
  ramp: string[],
  part: Part = 'all',
  o: {
    wide?: number;
    short?: number;
    skin?: string[];
    cuff?: string;
    r?: number;
  } = {},
) {
  const [s, e, h] = q.arms[i],
    r = o.r ?? 0.35,
    wrist = lerp(e, h, 0.78);
  if (o.short !== undefined) {
    // Bare (or under-sleeved) forearm first, then the short sleeve.
    if (part !== 'upper') {
      const fore = mk(p)
        .capsule(lerp(s, e, o.short), e, 1.7, 1.6)
        .capsule(e, lerp(e, h, 0.8), 1.6, 1.3);
      shade(p, fore, o.skin ?? K.skin, { r: 1.8, hi: 0.78, lo: 0.2 });
      contour(p, fore);
    }
    if (part === 'fore') return;
    const m = mk(p).capsule(lerp(s, e, -0.05), lerp(s, e, o.short), 2.4, 2.25);
    shade(p, m, ramp, { r: 2 });
    contour(p, m);
    const hem = lerp(s, e, o.short - 0.06);
    p.pixel(hem[0] - 1, hem[1], ramp[2]);
    p.pixel(hem[0], hem[1], ramp[2]);
    p.pixel(hem[0] + 1, hem[1], ramp[2]);
    return;
  }
  const m = mk(p);
  if (part !== 'fore') m.capsule(lerp(s, e, 0.05), e, 1.9 + r, 1.65 + r);
  if (part !== 'upper') m.capsule(e, wrist, 1.7 + r, 1.35 + r + (o.wide ?? 0));
  shade(p, m, ramp, { r: 2 });
  contour(p, m);
  if (part !== 'upper') {
    // Elbow fold and a cuff seam.
    const d = norm(s, e),
      bend = (e[0] - s[0]) * (h[1] - e[1]) - (e[1] - s[1]) * (h[0] - e[0]);
    if (Math.abs(bend) > 6)
      p.pixel(e[0] - d[1] * 0.8, e[1] + d[0] * 0.8, ramp[2]);
    const c = lerp(e, h, 0.66 + (o.wide ? 0.04 : 0)),
      n = norm(e, h),
      w = 1.6 + (o.wide ?? 0) * 0.6;
    for (let k = -w; k <= w; k += 0.7)
      p.pixel(c[0] - n[1] * k, c[1] + n[0] * k, o.cuff ?? ramp[2]);
  }
}
/** Torso cloth with an underarm shadow and a few soft folds. */
function bodice(
  p: Pixels,
  q: Pose,
  ramp: string[],
  o: { w?: number; drop?: number; neck?: number } = {},
) {
  const m = torsoMask(p, q, {
    w: 0.35 + (o.w ?? 0),
    drop: o.drop,
    neck: o.neck,
  });
  shade(p, m, ramp, { r: 3, hi: 0.8, lo: 0.2 });
  if (upright(q)) {
    const { at } = spine(q),
      fi = farI(q);
    // Shadow under the far arm and folds pulling from the near armpit.
    const side = fi === 1 ? 1 : -1;
    for (let k = 0; k < 4; k++)
      dim(p, ...at(q.chest, 1.5 - k * 1.2, side * 5.2));
    const ni = nearI(q),
      nside = ni === 1 ? 1 : -1;
    crease(p, m, [at(q.chest, 1, nside * 4.5), at(q.chest, -4, nside * 2.4)]);
    crease(p, m, [at(q.hip, 1.6, -3), at(q.hip, 2.4, -1.2)], false);
  }
  return m;
}
/** One trouser leg, with a knee crease and a break over the shoe. */
function trouserLeg(
  p: Pixels,
  q: Pose,
  i: number,
  ramp: string[],
  o: { r?: number; to?: number } = {},
) {
  const m = legMask(p, q, i, { r: o.r ?? 0.35, to: o.to });
  shade(p, m, ramp, { r: 2.2 });
  contour(p, m);
  const [t, k] = q.legs[i],
    a = ankleOf(q, i);
  if (q.mode === 'stand' || q.mode === 'bow') {
    // Front crease and the fold at the knee.
    crease(p, m, [lerp(t, k, 0.3), lerp(t, k, 0.85)], false);
    p.pixel(k[0] + (q.away ? -1 : 1), k[1], ramp[2]);
    p.pixel(a[0] - 1, a[1] - 1, ramp[2]);
  } else crease(p, m, [lerp(t, k, 0.4), k], false);
  return m;
}
function trousers(
  p: Pixels,
  q: Pose,
  ramp: string[],
  o: { r?: number; to?: number } = {},
) {
  const m = mk(p);
  for (const i of [farI(q), nearI(q)]) {
    const l = trouserLeg(p, q, i, ramp, o);
    m.data.set(union(m, l).data);
  }
  // Seat and crotch fill between the legs.
  const seat = mk(p).capsule(q.legs[0][0], q.legs[1][0], 2.9 + (o.r ?? 0.35));
  shade(p, seat, ramp, { r: 2 });
  return union(m, seat);
}
/** Long garment from the hips to the ankles, following any posture. */
function skirt(
  p: Pixels,
  q: Pose,
  ramp: string[],
  o: { flare?: number; hem?: number; top?: number } = {},
) {
  const flare = o.flare ?? 2,
    hemUp = o.hem ?? 1.5,
    m = mk(p);
  const [l, r] = q.legs,
    { at } = spine(q);
  const top = o.top ?? 0;
  if (q.mode === 'stand' || q.mode === 'bow') {
    const hem = Math.max(l[2][1], r[2][1]) - hemUp,
      xs = [l[2][0], r[2][0]],
      hipL = at(q.hip, 1 + top, -5.6),
      hipR = at(q.hip, 1 + top, 5.6);
    const lo = Math.min(...xs) - 2.6 - flare,
      hi = Math.max(...xs) + 2.6 + flare;
    m.poly([
      hipL,
      hipR,
      [Math.max(hipR[0] + 1, hi - 0.5), hem - 6],
      [hi, hem],
      [lo, hem],
      [Math.min(hipL[0] - 1, lo + 0.5), hem - 6],
    ]);
    m.rect(lo + 0.5, hem, hi - lo - 0.5, 1);
    // Knees show through on a stride.
    for (const leg of [l, r]) m.capsule(leg[0], leg[1], 3.2);
  } else {
    for (const leg of [l, r]) {
      m.capsule(leg[0], leg[1], 3.5, 3.4);
      if (q.mode !== 'floor')
        m.capsule(
          leg[1],
          lerp(
            leg[1],
            ankleOf(q, q.legs.indexOf(leg)),
            q.mode === 'chair' ? 0.86 : 0.8,
          ),
          3.3,
          3,
        );
    }
    m.poly([at(q.hip, 1.5 + top, -5.6), at(q.hip, 1.5 + top, 5.6), r[1], l[1]]);
    if (q.mode === 'chair') {
      // Drape from the knees toward the shins.
      const al = ankleOf(q, 0),
        ar = ankleOf(q, 1);
      m.poly([
        l[1],
        r[1],
        add(lerp(r[1], ar, 0.85), 2.5 + flare * 0.3, 0),
        add(lerp(l[1], al, 0.85), -2.5 - flare * 0.3, 0),
      ]);
    }
    if (q.mode === 'floor') {
      // Cloth pooled over the crossed legs.
      const lo = Math.min(l[1][0], r[1][0]),
        hi = Math.max(l[1][0], r[1][0]);
      m.ellipse((lo + hi) / 2, l[1][1] + 0.5, (hi - lo) / 2 + 2.5, 3.4);
    }
  }
  shade(p, m, ramp, { r: 3.4, hi: 0.82, lo: 0.18 });
  contour(p, m);
  if (q.mode === 'stand') {
    // Folds falling from the hips and between the legs.
    const hem = Math.max(l[2][1], r[2][1]) - hemUp;
    for (const [i, leg] of [l, r].entries()) {
      const x0 = leg[0][0] + (i ? 2 : -2),
        x1 = leg[2][0] + (i ? 2.5 + flare * 0.5 : -2.5 - flare * 0.5);
      crease(
        p,
        m,
        [
          [x0, q.hip[1] + 6],
          [x1, hem - 1],
        ],
        i === 0,
      );
    }
    crease(p, m, [lerp(l[1], r[1], 0.5), [lerp(l[2], r[2], 0.5)[0], hem - 1]]);
  } else if (q.mode === 'chair' || q.mode === 'kneel') {
    for (const leg of [l, r])
      crease(
        p,
        m,
        [lerp(leg[0], leg[1], 0.3), lerp(leg[0], leg[1], 0.9)],
        false,
      );
  }
  return m;
}
/** A hem band of trim colour along the bottom edge of a mask. */
function hemTrim(p: Pixels, m: Mask, ramp: string[], rows = 1) {
  for (let x = 0; x < m.width; x++) {
    let bottom = -1;
    for (let y = m.height - 1; y >= 0; y--)
      if (m.has(x, y)) {
        bottom = y;
        break;
      }
    if (bottom > 58)
      for (let k = 0; k < rows; k++)
        if (m.has(x, bottom - k))
          p.pixel(
            x,
            bottom - k,
            ramp[k === rows - 1 ? 1 : (x + k) % 3 ? 0 : 1],
          );
  }
}
function belt(p: Pixels, q: Pose, c: string[], h = 2, buckle?: string) {
  if (!upright(q)) return;
  const { at } = spine(q),
    y0 = 0.6;
  for (let k = 0; k < h; k++)
    for (let s = -5.7; s <= 5.7; s += 0.5) {
      const [x, y] = at(q.hip, y0 - k, s);
      p.pixel(x, y, k === h - 1 ? c[2] : c[1]);
    }
  if (buckle && !q.away) {
    const [x, y] = at(q.hip, y0, 1);
    p.rect(x, y - h + 1, 2, h, buckle);
  }
}
/** A vertical placket line (with buttons) down the front of the torso. */
function placket(
  p: Pixels,
  q: Pose,
  c: string,
  from: number,
  to: number,
  buttons?: string,
  dx = 1.2,
) {
  if (q.away || !upright(q)) return;
  const { at } = spine(q);
  for (let d = from; d >= to; d -= 0.5) {
    const [x, y] = at(q.chest, d, dx);
    p.pixel(x, y, c);
  }
  if (buttons)
    for (let d = from - 1.5; d >= to; d -= 3) {
      const [x, y] = at(q.chest, d, dx + 0.8);
      p.pixel(x, y, buttons);
    }
}
type Collar = 'band' | 'shirt' | 'crew' | 'v' | 'polo' | 'round';
/** Collars and necklines at the base of the neck. */
function collar(p: Pixels, q: Pose, kind: Collar, c: string[], inner?: string) {
  if (!upright(q)) return;
  const { at } = spine(q),
    n = q.neck;
  if (q.away) {
    // Back of the collar.
    for (let s = -2.6; s <= 2.6; s += 0.5)
      p.pixel(
        ...at(n, -0.2, s),
        kind === 'v' || kind === 'round' ? c[1] : c[0],
      );
    if (kind === 'shirt' || kind === 'polo' || kind === 'band')
      for (let s = -2.6; s <= 2.6; s += 0.5) p.pixel(...at(n, -1.2, s), c[2]);
    return;
  }
  switch (kind) {
    case 'band':
      for (let s = -2.4; s <= 2.6; s += 0.5) {
        p.pixel(...at(n, 0.4, s), c[0]);
        p.pixel(...at(n, -0.6, s), c[1]);
      }
      p.pixel(...at(n, -0.6, 2.6), c[2]);
      break;
    case 'shirt':
    case 'polo': {
      // Two collar points meeting at the throat.
      for (const sd of [-1, 1]) {
        p.pixel(...at(n, 0.3, sd * 2.4), c[0]);
        p.pixel(...at(n, -0.6, sd * 2.2), c[0]);
        p.pixel(...at(n, -1.4, sd * 1.3), c[0]);
        p.pixel(...at(n, -2, sd * 0.6), c[1]);
      }
      p.pixel(...at(n, -1.2, 0.4), inner ?? c[2]);
      p.pixel(...at(n, -2.2, 0.4), c[2]);
      break;
    }
    case 'crew':
      for (let s = -2.4; s <= 2.6; s += 0.5)
        p.pixel(...at(n, -0.5 + Math.abs(s) * 0.12, s), c[2]);
      break;
    case 'round':
      for (let s = -2.6; s <= 2.8; s += 0.5)
        p.pixel(...at(n, -0.8 + Math.abs(s) * 0.25, s), c[2]);
      break;
    case 'v':
      for (let k = 0; k <= 3; k += 0.5) {
        p.pixel(...at(n, -k, -2.2 + k * 0.7), c[2]);
        p.pixel(...at(n, -k, 2.6 - k * 0.7), c[2]);
      }
      for (let k = 0.5; k <= 2.5; k += 0.5)
        for (let s = -2 + k * 0.7; s <= 2.4 - k * 0.7; s += 0.5)
          p.pixel(...at(n, -k, s), inner ?? K.skin[1]);
      break;
  }
}
/**
 * Dress the figure: far sleeve behind the body, then the lower garment and
 * the torso, then the near sleeve and the hands over everything. Far forearms
 * that come round in front (carrying, praying, guarding) go on top.
 */
function wear(
  p: Pixels,
  q: Pose,
  g: {
    sleeve: (i: number, part: Part) => void;
    lower?: () => void;
    torso: () => Mask;
    details?: (t: Mask) => void;
    over?: () => void;
  },
) {
  const fi = farI(q),
    ni = nearI(q),
    ff = farFront(q);
  const hidden = handsHidden(q);
  g.sleeve(fi, ff ? 'upper' : 'all');
  if (!ff) drawHand(p, q, fi);
  if (hidden) {
    g.sleeve(ni, 'all');
    drawHand(p, q, ni);
  }
  g.lower?.();
  const t = g.torso();
  g.details?.(t);
  clearHead(p, q);
  g.over?.();
  if (ff) {
    g.sleeve(fi, 'fore');
    drawHand(p, q, fi);
  }
  const before = mk(p);
  for (let i = 0; i < before.data.length; i++)
    if (p.data[i * 4 + 3]) before.data[i] = 1;
  g.sleeve(ni, hidden ? 'upper' : 'all');
  if (hidden) return;
  // Shadow the near arm casts on the body.
  const arm = armMask(p, q, ni, { r: 0.4 });
  castShadow(p, arm, 1, 0, intersect(t, before));
  drawHand(p, q, ni);
}
function drawGarment(p: Pixels, id: string, q: Pose) {
  const C = K.cloth,
    S = K.sash,
    up = upright(q),
    front = up && !q.away,
    { at } = spine(q);
  const long =
    (ramp: string[], o: Parameters<typeof sleeve>[5] = {}) =>
    (i: number, part: Part) =>
      sleeve(p, q, i, ramp, part, o);
  switch (id) {
    case 'thobe': {
      wear(p, q, {
        sleeve: long(C),
        lower: () => skirt(p, q, C, { flare: 1.5 }),
        torso: () => bodice(p, q, C),
        details: () => {
          collar(p, q, 'band', C);
          placket(p, q, C[2], 3.4, -2, C[0]);
          // Chest pocket.
          if (front) {
            const [x, y] = at(q.chest, 1.4, 3.2);
            p.rect(x - 1, y, 3, 1, C[2]);
          }
        },
      });
      break;
    }
    case 'jubba': {
      wear(p, q, {
        sleeve: long(C, { wide: 0.5 }),
        lower: () => {
          skirt(p, q, S, { flare: 1 });
          const coat = skirt(p, q, C, { flare: 2.5, hem: 2.5 });
          if (q.mode === 'stand' && !q.away) {
            // Open front shows the robe beneath.
            const m = mk(p).poly([
              at(q.hip, 1, -0.8),
              at(q.hip, 1, 2.4),
              [q.hip[0] + 3.4, coat.height],
              [q.hip[0] - 1.4, coat.height],
            ]);
            const inner = intersect(m, coat);
            shade(p, inner, S, { r: 2 });
            contour(p, inner);
          }
        },
        torso: () => bodice(p, q, C, { w: 0.4 }),
        details: () => {
          if (!front) return;
          const m = mk(p).poly([
            at(q.neck, 0.4, -1.4),
            at(q.neck, 0.4, 2.2),
            at(q.hip, 1, 2.4),
            at(q.hip, 1, -0.8),
          ]);
          shade(p, m, S, { r: 1.5 });
          contour(p, m);
          collar(p, q, 'band', S);
          placket(p, q, S[2], 2.4, -6, S[0], 0.8);
        },
      });
      break;
    }
    case 'qaba': {
      wear(p, q, {
        sleeve: long(C),
        lower: () => {
          const m = skirt(p, q, C, { flare: 1.5 });
          if (q.mode === 'stand' && !q.away)
            crease(
              p,
              m,
              [at(q.hip, -1, 2.6), [at(q.hip, -1, 2.6)[0] + 1, m.height]],
              false,
            );
        },
        torso: () => bodice(p, q, C),
        details: () => {
          if (front) {
            // Wrapped front: a diagonal edge from the neck to the far hip.
            for (let k = 0; k <= 1; k += 0.08) {
              const pt = lerp(at(q.neck, 0, -2), at(q.hip, 1.5, 3.4), k);
              p.pixel(pt[0], pt[1], C[2]);
              p.pixel(pt[0] - 1, pt[1], C[0]);
            }
          }
          collar(p, q, 'band', C);
          belt(p, q, S, 2);
          if (front) {
            const [x, y] = at(q.hip, 0, 2.6);
            p.rect(x, y + 1, 1, 4, S[2]);
            p.rect(x + 1, y + 1, 1, 3, S[1]);
          }
        },
      });
      break;
    }
    case 'kaftan': {
      wear(p, q, {
        sleeve: long(C, { cuff: S[0] }),
        lower: () => {
          const r = skirt(p, q, C, { flare: 2 });
          hemTrim(p, r, S, 2);
        },
        torso: () => bodice(p, q, C),
        details: () => {
          if (!front) return collar(p, q, 'round', C);
          // Embroidered neckline and front.
          for (let k = 0; k <= 3.5; k += 0.5) {
            p.pixel(...at(q.neck, -k, -2.2 + k * 0.6), S[0]);
            p.pixel(...at(q.neck, -k, 2.6 - k * 0.6), S[0]);
          }
          placket(p, q, S[1], -0.5, -8, S[0], 0.8);
        },
      });
      break;
    }
    case 'abaya': {
      wear(p, q, {
        sleeve: long(C, { wide: 1, cuff: S[1] }),
        lower: () => {
          const r = skirt(p, q, C, { flare: 3.2, hem: 0.5 });
          hemTrim(p, r, S, 1);
          if (q.mode === 'stand' && !q.away) {
            const [x] = at(q.hip, 0, 1);
            for (let y = Math.round(q.hip[1]); y < r.height; y++)
              if (r.has(Math.round(x), y)) p.pixel(x, y, S[1]);
          }
        },
        torso: () => bodice(p, q, C, { w: 0.6 }),
        details: () => {
          collar(p, q, 'round', C);
          placket(p, q, S[1], 3.6, -6, undefined, 1);
        },
      });
      break;
    }
    case 'panjabi-lungi': {
      wear(p, q, {
        sleeve: long(C),
        lower: () => {
          const lungi = skirt(p, q, S, { flare: 0.8 });
          // Checked weave.
          for (let y = 0; y < p.height; y++)
            for (let x = 0; x < p.width; x++)
              if (lungi.has(x, y) && (x % 4 === 0 || y % 4 === 0)) dim(p, x, y);
          if (q.mode === 'stand') {
            // Knee-length tunic over the lungi.
            const tun = mk(p).poly([
              at(q.hip, 1.5, -5.6),
              at(q.hip, 1.5, 5.6),
              [q.hip[0] + 7, q.legs[0][1][1] - 1],
              [q.hip[0] - 7, q.legs[0][1][1] - 1],
            ]);
            shade(p, tun, C, { r: 2.6 });
            contour(p, tun);
            if (!q.away)
              crease(
                p,
                tun,
                [at(q.hip, -2, 1), [q.hip[0] + 2, q.legs[0][1][1] - 2]],
                false,
              );
          }
        },
        torso: () => bodice(p, q, C),
        details: () => {
          collar(p, q, 'band', C);
          placket(p, q, C[2], 3.4, -3, C[0]);
        },
      });
      break;
    }
    case 'boubou': {
      // Grand boubou: one sweeping robe that hangs from the shoulders to the
      // wrists, with an embroidered chest panel.
      skirt(p, q, C, { flare: 4, hem: 0.5 });
      const cape = torsoMask(p, q, { w: 1.6, drop: 3 });
      for (const arm of q.arms)
        cape.capsule(arm[0], lerp(arm[1], arm[2], 0.75), 3.6, 3.4);
      if (q.mode === 'stand')
        for (const arm of q.arms)
          cape.poly([
            arm[0],
            lerp(arm[1], arm[2], 0.75),
            [q.hip[0] + (arm[2][0] - q.hip[0]) * 0.8, q.hip[1] + 6],
            [q.hip[0], q.hip[1] + 6],
          ]);
      shade(p, cape, C, { r: 3, hi: 0.82, lo: 0.18 });
      contour(p, cape);
      if (q.mode === 'stand')
        for (const arm of q.arms)
          crease(p, cape, [
            lerp(arm[0], arm[1], 0.6),
            [
              lerp(arm[0], arm[1], 0.6)[0] +
                (arm[0][0] < q.chest[0] ? 1.5 : -1.5),
              q.hip[1] + 4,
            ],
          ]);
      clearHead(p, q);
      if (front) {
        const [x, y] = at(q.chest, 2.6, 0.4);
        p.rect(x - 2.5, y, 6, 7, S[1]);
        p.rect(x - 1.5, y + 1, 4, 5, S[0]);
        p.rect(x - 0.5, y + 2, 2, 3, S[2]);
        p.pixel(x + 0.5, y + 6, S[2]);
        collar(p, q, 'round', C);
      }
      drawHands(p, q);
      break;
    }
    case 'baju-kurung': {
      wear(p, q, {
        sleeve: long(C),
        lower: () => {
          const sk = skirt(p, q, S, { flare: 1.8 });
          for (let y = 0; y < p.height; y++)
            for (let x = 0; x < p.width; x++)
              if (sk.has(x, y) && y > q.hip[1] + 8 && (x * 2 + y) % 6 === 0)
                p.pixel(x, y, S[0]);
          if (q.mode === 'stand') {
            const tun = mk(p).poly([
              at(q.hip, 1.5, -5.6),
              at(q.hip, 1.5, 5.6),
              [q.hip[0] + 7.5, q.legs[0][1][1] + 1],
              [q.hip[0] - 7.5, q.legs[0][1][1] + 1],
            ]);
            shade(p, tun, C, { r: 2.6 });
            contour(p, tun);
            crease(p, tun, [
              [q.hip[0] - 3, q.hip[1] + 2],
              [q.hip[0] - 5, q.legs[0][1][1]],
            ]);
          }
        },
        torso: () => bodice(p, q, C, { w: 0.3 }),
        details: () => collar(p, q, 'round', C),
      });
      break;
    }
    case 'hui-robe': {
      wear(p, q, {
        sleeve: long(C),
        lower: () => skirt(p, q, C, { flare: 1.5 }),
        torso: () => bodice(p, q, C),
        details: () => {
          collar(p, q, 'band', C);
          if (!front) return;
          // Side-fastening front with frog buttons.
          for (let k = 0; k <= 4; k += 0.5)
            p.pixel(...at(q.neck, -0.6 - k * 0.4, 0.5 + k), C[2]);
          for (let d = 2.4; d >= -8; d -= 2.6) {
            const [x, y] = at(q.chest, d, 4.3);
            p.rect(x - 1, y, 2, 1, S[1]);
          }
        },
      });
      break;
    }
    case 'scholar-robe': {
      wear(p, q, {
        sleeve: long(C, { wide: 0.8 }),
        lower: () => skirt(p, q, C, { flare: 1.5 }),
        torso: () => bodice(p, q, C),
        details: () => collar(p, q, 'band', C),
        over: () => {
          // An open mantle over both shoulders, falling to the knees.
          const cloak = mk(p);
          for (const arm of q.arms)
            cloak.capsule(arm[0], lerp(arm[0], arm[1], 0.75), 2.9);
          if (up) {
            cloak.poly([
              at(q.neck, 0.5, -3),
              at(q.neck, 0.5, -1.8),
              at(q.hip, 0, -2.5),
              at(q.hip, 0, -6.6),
            ]);
            cloak.poly([
              at(q.neck, 0.5, 2.2),
              at(q.neck, 0.5, 3.4),
              at(q.hip, 0, 6.6),
              at(q.hip, 0, 3),
            ]);
            if (q.mode === 'stand') {
              cloak.poly([
                at(q.hip, 0, -6.6),
                at(q.hip, 0, -2.5),
                [q.hip[0] - 3, q.legs[0][1][1] + 2],
                [q.hip[0] - 8.5, q.legs[0][1][1] + 2],
              ]);
              cloak.poly([
                at(q.hip, 0, 3),
                at(q.hip, 0, 6.6),
                [q.hip[0] + 8.5, q.legs[0][1][1] + 2],
                [q.hip[0] + 3.5, q.legs[0][1][1] + 2],
              ]);
            }
          }
          shade(p, cloak, S, { r: 2.4 });
          contour(p, cloak);
          clearHead(p, q);
        },
      });
      break;
    }
    case 'apron': {
      wear(p, q, {
        sleeve: long(C),
        lower: () => trousers(p, q, F.charcoal),
        torso: () => bodice(p, q, C),
        details: () => {
          collar(p, q, 'shirt', C);
          if (!front) return belt(p, q, S, 1);
          const m = mk(p).poly([
            at(q.chest, 2.6, -3.6),
            at(q.chest, 2.6, 3.8),
            at(q.hip, 0.5, 4.6),
            at(q.hip, 0.5, -4.4),
          ]);
          if (q.mode === 'stand')
            m.poly([
              at(q.hip, 0.5, -4.8),
              at(q.hip, 0.5, 5),
              [q.hip[0] + 6, q.legs[0][1][1] + 1],
              [q.hip[0] - 5.6, q.legs[0][1][1] + 1],
            ]);
          shade(p, m, S, { r: 2 });
          contour(p, m);
          // Neck strap, waist tie and a pocket.
          p.pixel(...at(q.neck, -0.5, -2.2), S[2]);
          p.pixel(...at(q.neck, -0.5, 2.6), S[2]);
          const [x, y] = at(q.hip, -2, 0);
          p.rect(x - 1.5, y, 4, 3, S[2]);
          p.rect(x - 1.5, y, 4, 1, S[0]);
        },
      });
      break;
    }
    case 'shirt-trousers':
    case 'shirt-trousers-sponsor': {
      // The sponsor variant is a cricket kit: shirt and trousers match, and a
      // plain block across the chest (garmentSecondary) stands in for a logo.
      const sponsor = id === 'shirt-trousers-sponsor';
      wear(p, q, {
        sleeve: long(C),
        lower: () => trousers(p, q, sponsor ? C : S),
        torso: () => bodice(p, q, C),
        details: () => {
          collar(p, q, 'shirt', C);
          placket(p, q, C[2], 2.8, -9.5, C[0]);
          belt(p, q, F.charcoal, 2, F.steel[1]);
          if (sponsor && front) {
            const block = mk(p).poly([
              at(q.chest, -0.6, -4.6),
              at(q.chest, -0.6, 4.6),
              at(q.chest, -5.4, 4.6),
              at(q.chest, -5.4, -4.6),
            ]);
            shade(p, block, S, { r: 1.4, hi: 0.8, lo: 0.3 });
          } else if (front) {
            const [x, y] = at(q.chest, 1.6, -3.6);
            p.rect(x, y, 3, 1, C[2]);
          }
        },
      });
      break;
    }
    case 'suit':
    case 'blazer-open': {
      const tie = id === 'suit',
        legs = tie ? C : S;
      wear(p, q, {
        sleeve: long(C, { cuff: C[2] }),
        lower: () => trousers(p, q, legs),
        torso: () => bodice(p, q, C, { drop: 2.5, w: 0.2 }),
        details: () => {
          if (!front) return collar(p, q, 'shirt', C);
          // White shirt in the open V of the jacket, then lapels.
          const v = mk(p).poly([
            at(q.neck, 0.6, -2.2),
            at(q.neck, 0.6, 2.8),
            at(q.chest, tie ? -3.8 : -3, 1.3),
          ]);
          fill(p, v, F.white);
          for (const [x, y] of [
            at(q.neck, -2.6, 1.9),
            at(q.neck, -1.4, 2.4),
          ] as P[])
            p.pixel(x, y, F.cream);
          if (tie) {
            const t = mk(p).poly([
              at(q.neck, 0, 0.6),
              at(q.neck, 0, 1.8),
              at(q.chest, -2.6, 1.9),
              at(q.chest, -3.6, 1.2),
              at(q.chest, -2.6, 0.5),
            ]);
            shade(p, t, S, { r: 1 });
            p.pixel(...at(q.neck, -0.3, 1.2), S[0]);
          } else {
            // Open collar: a hint of the neck and the collar points.
            p.pixel(...at(q.neck, -0.4, 0.9), K.skin[1]);
            p.pixel(...at(q.neck, -0.4, 1.5), K.skin[1]);
            p.pixel(...at(q.neck, -1.2, 1.2), K.skin[2]);
            p.pixel(...at(q.neck, 0.3, -2), F.white);
            p.pixel(...at(q.neck, 0.3, 3), F.white);
          }
          // Lapels: a lit edge and a dark roll line.
          for (let k = 0; k <= 1; k += 0.1) {
            const a = lerp(
                at(q.neck, 0.4, -2.6),
                at(q.chest, tie ? -3.8 : -3, 1.1),
                k,
              ),
              b = lerp(
                at(q.neck, 0.4, 3.2),
                at(q.chest, tie ? -3.8 : -3, 1.5),
                k,
              );
            p.pixel(a[0] - 1, a[1], C[0]);
            p.pixel(a[0], a[1], C[2]);
            p.pixel(b[0] + 1, b[1], C[2]);
          }
          // Buttons, front edge and pockets.
          const [bx, by] = at(q.chest, -5, 1.4);
          p.pixel(bx, by, C[2]);
          p.pixel(bx, by + 2.5, C[2]);
          for (let d = -6; d >= -10.5; d -= 0.5)
            p.pixel(...at(q.chest, d, 1.4 - (d + 6) * 0.25), C[2]);
          const [px, py] = at(q.chest, -8, -3.6);
          p.rect(px - 1, py, 3, 1, C[2]);
          const [qx, qy] = at(q.chest, -8, 4.2);
          p.rect(qx - 1, qy, 3, 1, C[2]);
          if (!tie) {
            const [sx, sy] = at(q.chest, 1.5, -3.8);
            p.rect(sx, sy, 2, 1, F.white);
          }
        },
      });
      break;
    }
    case 'lab-coat': {
      wear(p, q, {
        sleeve: long(C, { cuff: C[2] }),
        lower: () => {
          trousers(p, q, S);
          if (q.mode === 'stand') {
            // Coat skirts to the knee, open at the front.
            const kneeY = Math.max(q.legs[0][1][1], q.legs[1][1][1]) + 1.5;
            const m = mk(p).poly([
              at(q.hip, 3, -5.8),
              at(q.hip, 3, 5.8),
              [q.hip[0] + 7.2, kneeY],
              [q.hip[0] - 7.2, kneeY],
            ]);
            shade(p, m, C, { r: 2.4, hi: 0.78, lo: 0.2 });
            contour(p, m);
            if (!q.away) {
              const gap = mk(p).poly([
                at(q.hip, 1, 0.6),
                at(q.hip, 1, 2),
                [q.hip[0] + 3.4, kneeY],
                [q.hip[0] + 0.4, kneeY],
              ]);
              const inner = intersect(gap, m);
              shade(p, inner, S, { r: 1.5 });
              for (const sd of [-4.4, 4.6]) {
                const [x, y] = at(q.hip, -2.2, sd);
                p.rect(x - 1, y, 3, 1, C[2]);
              }
            }
            crease(p, m, [at(q.hip, -2, -4), [q.hip[0] - 6, kneeY - 1]], false);
          } else if (q.mode === 'chair') skirt(p, q, C, { flare: 0.5 });
        },
        torso: () => bodice(p, q, C, { w: 0.3 }),
        details: () => {
          if (!front) return collar(p, q, 'shirt', C);
          // Shirt and tie at the throat, lapels, breast pocket with a pen.
          const v = mk(p).poly([
            at(q.neck, 0.6, -1.6),
            at(q.neck, 0.6, 2.2),
            at(q.chest, -1.6, 0.8),
          ]);
          shade(p, v, S, { r: 1 });
          for (let k = 0; k <= 1; k += 0.1) {
            const a = lerp(at(q.neck, 0.4, -2.2), at(q.chest, -1.6, 0.6), k),
              b = lerp(at(q.neck, 0.4, 2.8), at(q.chest, -1.6, 1), k);
            p.pixel(a[0], a[1], C[2]);
            p.pixel(b[0] + 1, b[1], C[2]);
          }
          placket(p, q, C[2], -2, -10, undefined, 1.4);
          const [x, y] = at(q.chest, 1.4, -3.4);
          p.rect(x - 1, y, 3, 1, C[2]);
          p.pixel(x, y - 1, F.screen);
        },
      });
      break;
    }
    case 'scrubs': {
      wear(p, q, {
        sleeve: (i, part) => {
          sleeve(p, q, i, S, part, { r: 0.1 });
          if (part !== 'fore')
            sleeve(p, q, i, C, 'upper', { short: 0.55, skin: S });
        },
        lower: () => trousers(p, q, C, { r: 0.6 }),
        torso: () => bodice(p, q, C, { drop: 2.2, w: 0.3 }),
        details: () => {
          collar(p, q, 'v', C, S[1]);
          if (front) {
            const [x, y] = at(q.chest, 1, -3.8);
            p.rect(x - 1, y, 3, 3, C[2]);
            p.rect(x - 1, y, 3, 1, C[0]);
          }
        },
      });
      break;
    }
    case 'hoodie-jeans': {
      wear(p, q, {
        sleeve: long(C, { r: 0.6, cuff: C[2] }),
        lower: () => {
          const jeans = trousers(p, q, S);
          for (let y = 0; y < p.height; y++)
            for (let x = 0; x < p.width; x++)
              if (jeans.has(x, y) && (x + y) % 5 === 0 && y > q.hip[1] + 4)
                brighten(p, x, y);
        },
        torso: () => bodice(p, q, C, { drop: 2.4, w: 0.6 }),
        details: () => {
          if (!up) return;
          // Hood bunched at the back of the neck, pocket and drawstrings.
          const hood = mk(p).ellipse(
            ...at(q.neck, 0.6, q.away ? 0 : -1.8),
            3.8,
            1.8,
          );
          shade(p, hood, C, { r: 1.5 });
          contour(p, hood);
          if (!q.away) {
            const pk = mk(p).poly([
              at(q.hip, 3.5, -3),
              at(q.hip, 3.5, 3.6),
              at(q.hip, 0.6, 4.2),
              at(q.hip, 0.6, -3.6),
            ]);
            contour(p, pk, null);
            fill(p, mk(p).rect(...at(q.hip, 3.4, -2.6), 6, 1), C[2]);
            p.rect(...at(q.neck, -0.6, 0.2), 1, 3, F.white);
            p.rect(...at(q.neck, -0.6, 2), 1, 2, F.white);
          }
          const [x, y] = at(q.hip, -1.2, -5.6);
          p.rect(x, y, 12, 1, C[2]);
        },
      });
      break;
    }
    case 'long-dress': {
      wear(p, q, {
        sleeve: long(C),
        lower: () => {
          const r = skirt(p, q, C, { flare: 2.6, hem: 0.5 });
          for (let y = 0; y < p.height; y++)
            for (let x = 0; x < p.width; x++)
              if (
                r.has(x, y) &&
                y > q.hip[1] + 6 &&
                (x + Math.floor(y / 3)) % 6 === 0 &&
                colourAt(p, x, y) === C[1]
              )
                p.pixel(x, y, C[0]);
        },
        torso: () => bodice(p, q, C, { w: 0.2 }),
        details: () => {
          collar(p, q, 'round', C);
          belt(p, q, S, 2);
        },
      });
      break;
    }
    case 'hi-vis': {
      wear(p, q, {
        sleeve: (i, part) => {
          sleeve(p, q, i, C, part, { r: 0.5 });
          if (part === 'upper') return;
          const [, e, h] = q.arms[i],
            c = lerp(e, h, 0.3),
            n = norm(e, h);
          for (let k = -1.8; k <= 1.8; k += 0.6)
            p.pixel(c[0] - n[1] * k, c[1] + n[0] * k, F.steel[0]);
        },
        lower: () => trousers(p, q, S),
        torso: () => bodice(p, q, C, { w: 0.6, drop: 1.5 }),
        details: (t) => {
          collar(p, q, 'shirt', C);
          if (!up) return;
          for (const d of [-1.5, -8])
            for (let s = -6.5; s <= 6.5; s += 0.5) {
              const [x, y] = at(q.chest, d, s);
              if (t.has(Math.floor(x), Math.floor(y))) {
                p.pixel(x, y, F.steel[0]);
                p.pixel(x, y + 1, F.steel[1]);
              }
            }
          placket(p, q, C[2], 3, -10.5, undefined, 0.8);
        },
      });
      break;
    }
    case 'football-kit':
    case 'football-kit-captain':
    case 'football-kit-long':
    case 'football-kit-sleeved':
    case 'football-kit-sponsor': {
      const lng = id === 'football-kit-long',
        sleeved = id === 'football-kit-sleeved',
        shortsR = lng ? S : C,
        socksR = lng ? S : C;
      wear(p, q, {
        sleeve: (i, part) => {
          if (lng) sleeve(p, q, i, S, part, { cuff: C[1] });
          else if (sleeved) sleeve(p, q, i, C, part, { cuff: S[1] });
          else {
            sleeve(p, q, i, C, part, { short: 0.62 });
            if (part !== 'fore') {
              const c = lerp(q.arms[i][0], q.arms[i][1], 0.55);
              p.rect(c[0] - 2, c[1], 4, 1, S[1]);
            }
          }
          if (id === 'football-kit-captain' && i === 0 && part !== 'fore') {
            const c = lerp(q.arms[0][0], q.arms[0][1], 0.35);
            p.rect(c[0] - 2, c[1] - 1, 4, 2, F.screen);
            p.rect(c[0] - 2, c[1] - 1, 4, 1, F.white);
          }
        },
        lower: () => {
          // Long socks to the knee, shorts over the knee: knees stay covered.
          if (q.mode !== 'floor')
            for (const i of [farI(q), nearI(q)]) {
              const [, k] = q.legs[i],
                a = ankleOf(q, i),
                sock = mk(p).capsule(lerp(k, a, -0.05), a, 2.3, 1.5);
              shade(p, sock, socksR, { r: 1.8 });
              contour(p, sock);
              const band = lerp(k, a, 0.15);
              p.rect(band[0] - 2, band[1], 4, 1, lng ? C[1] : S[1]);
            }
          const shorts = mk(p);
          for (const leg of q.legs)
            shorts.capsule(leg[0], lerp(leg[0], leg[1], 1.08), 3.3, 2.7);
          shorts.capsule(q.legs[0][0], q.legs[1][0], 3.2);
          shade(p, shorts, shortsR, { r: 2.2 });
          contour(p, shorts);
          for (const [i, leg] of q.legs.entries()) {
            const h = lerp(leg[0], leg[1], 1.02);
            p.rect(h[0] - 2.5, h[1] + (i ? 0 : 0), 5, 1, lng ? C[2] : S[1]);
          }
          if (q.mode === 'stand')
            crease(
              p,
              shorts,
              [
                lerp(q.legs[0][0], q.legs[1][0], 0.5),
                add(lerp(q.legs[0][0], q.legs[1][0], 0.5), 0, 5),
              ],
              false,
            );
        },
        torso: () => bodice(p, q, C, { drop: 2.6, w: 0.3 }),
        details: () => {
          if (!up) return;
          collar(p, q, sleeved || lng ? 'crew' : 'polo', [C[0], S[1], S[2]]);
          if (id === 'football-kit-sponsor' && !q.away) {
            // A plain colour block across the chest stands in for a sponsor.
            const block = mk(p).poly([
              at(q.chest, -0.8, -5),
              at(q.chest, -0.8, 5),
              at(q.chest, -6.2, 5),
              at(q.chest, -6.2, -5),
            ]);
            shade(p, block, S, { r: 1.4, hi: 0.8, lo: 0.3 });
          }
          if (!q.away && id !== 'football-kit-sponsor')
            for (let s = -4.5; s <= 4.5; s += 3)
              p.pixel(...at(q.chest, -1.5, s), C[0]);
        },
      });
      break;
    }
    case 'fight-kit': {
      wear(p, q, {
        sleeve: long(C, { r: 0.15, cuff: S[1] }),
        lower: () => {
          const shorts = mk(p);
          for (const leg of q.legs)
            shorts.capsule(leg[0], lerp(leg[0], leg[1], 1.1), 3.4, 2.8);
          shorts.capsule(q.legs[0][0], q.legs[1][0], 3.3);
          shade(p, shorts, S, { r: 2.2 });
          contour(p, shorts);
          for (const leg of q.legs) {
            const c = lerp(leg[0], leg[1], 0.55);
            p.rect(c[0] - 2.5, c[1] - 1, 1, 4, C[1]);
            p.rect(...add(lerp(leg[0], leg[1], 1.08), -2.5, 0), 5, 1, S[2]);
          }
        },
        torso: () => bodice(p, q, C, { drop: 1.5 }),
        details: () => {
          // Fighters are barefoot.
          for (const i of [farI(q), nearI(q)]) {
            const { m } = shoeMask(p, q, i);
            shade(p, m, K.skin, { r: 1.4, hi: 0.74, lo: 0.2 });
            const [fx, fy] = q.legs[i][2];
            if (q.mode === 'stand' && !q.away)
              for (const dx of [2.5, 3.5]) p.pixel(fx + dx, fy, K.skin[2]);
          }
          collar(p, q, 'crew', C);
          if (front)
            for (let d = 1; d > -9; d -= 3)
              p.pixel(...at(q.chest, d, 4.4), S[1]);
        },
      });
      break;
    }
    case 'boxing-kit': {
      // Sleeveless vest and knee-length trunks with a dark waistband.
      wear(p, q, {
        sleeve: (i, part) => {
          const [s, e, h] = q.arms[i],
            m = mk(p);
          if (part !== 'fore') m.capsule(lerp(s, e, 0.05), e, 1.95, 1.6);
          if (part !== 'upper') m.capsule(e, lerp(e, h, 0.8), 1.6, 1.3);
          shade(p, m, K.skin, { r: 2, hi: 0.78, lo: 0.2 });
          contour(p, m);
        },
        lower: () => {
          const trunks = mk(p);
          for (const leg of q.legs)
            trunks.capsule(leg[0], lerp(leg[0], leg[1], 1.06), 3.6, 3);
          trunks.capsule(q.legs[0][0], q.legs[1][0], 3.5);
          shade(p, trunks, S, { r: 2.4, hi: 0.76 });
          contour(p, trunks);
          if (q.mode === 'stand')
            for (const [i, leg] of q.legs.entries()) {
              const c = lerp(leg[0], leg[1], 0.45);
              p.rect(c[0] + (i ? 2.4 : -3), c[1] - 3, 1, 7, F.white);
            }
        },
        torso: () => bodice(p, q, C, { w: -0.3 }),
        details: () => {
          belt(p, q, [F.ink, F.ink, F.outline], 3);
          if (!up) return;
          // Vest armholes show the shoulders.
          for (const arm of q.arms) {
            const m = mk(p).disc(arm[0][0], arm[0][1] + 0.5, 1.9);
            shade(p, m, K.skin, { r: 1.5 });
          }
          collar(p, q, 'round', C);
        },
      });
      break;
    }
    default:
      throw Error(`No placeholder art for garment ${id}`);
  }
}

/* ───────────── headwear ───────────── */
/** The bare face (no hair) for scarf openings. */
function faceSprite(q: Pose) {
  const hs = new Pixels(HS.w, HS.h);
  paintSkull(hs, q.away);
  if (!q.away) features(hs, q, false);
  return hs;
}
/** Copy the pixels of `src` inside mask `m` into `dst` (both head space). */
function copyIn(dst: Pixels, src: Pixels, m: Mask) {
  for (let j = 0; j < HS.h; j++)
    for (let i = 0; i < HS.w; i++) {
      const c = m.has(i, j) ? colourAt(src, i, j) : null;
      if (c) dst.pixel(i, j, c);
    }
}
/** Cap shape over the skull: the skull above row `bottom`, puffed out by `grow`. */
function capMask(away: boolean, bottom: number, grow = 0.8) {
  // Over the skull and the volume of short hair on top.
  const m = tmask(away ? SKULL_NE : SKULL_SE).grow(grow);
  hell(m, 4.5, 2.2, 5.4 + grow * 0.5, 4.4 + grow * 0.3);
  for (let j = bottom + 1 + HS.oy; j < HS.h; j++)
    for (let i = 0; i < HS.w; i++) m.data[j * HS.w + i] = 0;
  return m;
}
/** Headwear in head space (drapes over the body are painted onto `p`). */
export function headwearSprite(p: Pixels, id: string, q: Pose) {
  const H = K.hat,
    hs = new Pixels(HS.w, HS.h),
    away = q.away,
    up = upright(q) && q.turn === 'up';
  const band = (y: number, c: string, x0 = -1, x1 = 10) => {
    for (let x = x0; x <= x1; x++)
      if (colourAt(hs, x + HS.ox, y + HS.oy)) hp(hs, x, y, c);
  };
  switch (id) {
    case 'kufi': {
      const m = capMask(away, 2, 0.9);
      shade(hs, m, H, { r: 2.4, hi: 0.76 });
      // Knitted rows.
      for (let y = -2; y <= 1; y += 2)
        for (let x = -1; x <= 10; x++)
          if (m.has(x + HS.ox, y + HS.oy) && (x + y) % 3 === 0)
            hp(hs, x, y, H[0]);
      band(2, H[2]);
      break;
    }
    case 'taqiyah': {
      const m = capMask(away, 2, 1.2);
      shade(hs, m, H, { r: 2.4, hi: 0.76 });
      // Open-work crochet: a grid of small holes.
      for (let y = -2; y <= 1; y++)
        for (let x = -1; x <= 10; x++)
          if (
            m.has(x + HS.ox, y + HS.oy) &&
            (x + (y % 2 ? 1 : 0)) % 2 === 0 &&
            y % 2 === 0
          )
            hp(hs, x, y, H[2]);
      band(2, H[1]);
      band(1, H[0], 0, 9);
      break;
    }
    case 'hui-cap': {
      // Flat-topped round cap.
      const m = hmk();
      hrect(m, -1, -2, 12, 5);
      shade(hs, m, H, { r: 1.8, hi: 0.72 });
      band(-2, H[0], 0, 9);
      band(2, H[2]);
      break;
    }
    case 'songkok': {
      // Tall oval velvet cap, flat on top.
      const m = hmk();
      hrect(m, -0.5, -4, 11, 7);
      hrect(m, 0.5, -4.6, 9, 1);
      shade(hs, m, H, { r: 2, hi: 0.74 });
      band(-4, H[0], 1, 8);
      band(2, H[2]);
      // Velvet sheen.
      for (let y = -3; y <= 1; y++) hp(hs, 1, y, H[0]);
      break;
    }
    case 'imamah': {
      // Turban: wide rounded wraps with a tail at the back.
      const m = hmk();
      hell(m, 4.6, 0.4, 6.4, 4.8);
      hrect(m, -1.4, 0, 12, 3.2);
      for (let j = 3.6 + HS.oy; j < HS.h; j++)
        for (let i = 0; i < HS.w; i++) m.data[Math.floor(j) * HS.w + i] = 0;
      shade(hs, m, H, { r: 3, hi: 0.76, lo: 0.2 });
      // Wraps: diagonal folds across the turban.
      for (let k = 0; k < 4; k++)
        for (let x = -1; x <= 10; x++) {
          const y = Math.floor(-3 + k * 1.7 + (away ? -x : x) * 0.28);
          if (m.has(x + HS.ox, y + HS.oy)) hp(hs, x, y, H[2]);
          if (m.has(x + HS.ox, y - 1 + HS.oy) && x % 2) hp(hs, x, y - 1, H[0]);
        }
      if (up) {
        const tail = hmk();
        hrect(tail, away ? 6 : 0, 2, 3, 9);
        shade(hs, tail, H, { r: 1.4 });
        hp(hs, away ? 7 : 1, 10, H[2]);
      }
      break;
    }
    case 'hijab':
    case 'khimar': {
      // A scarf hugging the head, framing the face, wrapped under the chin.
      const long = id === 'khimar',
        skull = tmask(away ? SKULL_NE : SKULL_SE),
        m = copyMask(skull).grow(1.4);
      hell(m, 4.6, 11, 5.6, 3.4);
      // Wide enough to hide any hair style worn underneath.
      for (const b of ['adult-woman', 'adult-woman-loose', 'child'])
        m.data.set(union(m, tmask(HAIR[b][away ? 'ne' : 'se']).grow(0.8)).data);
      const opening = hmk();
      if (!away) hell(opening, 6.6, 5.6, 3.3, 4.6);
      m.minus(opening);
      shade(hs, m, H, { r: 2.6, hi: 0.8, lo: 0.2 });
      if (!away) {
        // Folded edge framing the face and a fold falling under the chin.
        const ring = copyMask(opening).grow(1);
        ring.minus(opening);
        for (let j = 0; j < HS.h; j++)
          for (let i = 0; i < HS.w; i++)
            if (ring.has(i, j) && m.has(i, j))
              hs.pixel(i, j, j < 4 + HS.oy ? H[0] : H[1]);
        hp(hs, 3, 11, H[2]);
        hp(hs, 4, 12, H[2]);
        copyIn(hs, faceSprite(q), intersect(opening, skull));
      } else {
        for (let y = 2; y <= 11; y++) hp(hs, 3 + (y % 3 ? 0 : 1), y, H[2]);
      }
      if (up) {
        // Drape over the shoulders and chest (khimar: to the waist).
        const { at } = spine(q);
        const end = long ? q.hip : lerp(q.chest, q.hip, 0.15),
          w = long ? 8.2 : 7.4;
        const d = mk(p).poly([
          at(q.neck, 1.6, -3.6),
          at(q.neck, 1.6, 3.6),
          at(q.chest, 2.6, w),
          at(end, long ? 1 : 0, w - 0.6),
          at(end, long ? 0 : -1, 0.5),
          at(end, long ? 1 : 0, -w + 0.6),
          at(q.chest, 2.6, -w),
        ]);
        for (const arm of q.arms) d.disc(...lerp(arm[0], arm[1], 0.15), 2.8);
        shade(p, d, H, { r: 2.6, hi: 0.82, lo: 0.18 });
        contour(p, d);
        for (const s of [-3, 2.4, long ? 5.5 : 0]) {
          if (!s) continue;
          crease(p, d, [at(q.neck, -1, s * 0.6), at(end, long ? 2 : 0.5, s)]);
        }
      }
      break;
    }
    case 'ghutra': {
      // A plain white head cloth (shemagh/ghutra) over a cap: it frames the
      // face and beard and falls behind the ears onto the shoulders.
      const skull = tmask(away ? SKULL_NE : SKULL_SE),
        m = copyMask(skull).grow(1.5);
      hell(m, 4.6, 1.5, 6.2, 4);
      hrect(m, away ? -1 : -2, 3, away ? 13 : 6, 12);
      const opening = hmk();
      if (!away) {
        hell(opening, 6.6, 7.4, 4.4, 4.4);
        hrect(opening, 3, 7, 9, 8);
      }
      m.minus(opening);
      shade(hs, m, H, { r: 2.6, hi: 0.84, lo: 0.2 });
      if (!away) {
        // Folded edge over the brow and along the cheek.
        const ring = copyMask(opening).grow(1);
        ring.minus(opening);
        for (let j = 0; j < HS.h; j++)
          for (let i = 0; i < HS.w; i++)
            if (ring.has(i, j) && m.has(i, j))
              hs.pixel(i, j, j < 4 + HS.oy ? H[0] : H[1]);
        for (let y = 6; y <= 14; y++) hp(hs, 0 + (y % 4 ? 0 : 1), y, H[2]);
      } else for (let y = 3; y <= 14; y++) hp(hs, 4 + (y % 3 ? 0 : 1), y, H[2]);
      if (up) {
        // Ends falling over the shoulders and down the back.
        const { at } = spine(q);
        const end = lerp(q.chest, q.hip, 0.1);
        const d = mk(p).poly([
          at(q.neck, 1.8, -4),
          at(q.neck, 1.8, 4),
          at(q.chest, 2.6, 7.6),
          at(end, 0, 7.2),
          at(end, 0, -7.2),
          at(q.chest, 2.6, -7.6),
        ]);
        // Leave the chest open in front so the beard and thobe show.
        if (!away)
          d.minus(
            mk(p).poly([
              at(q.neck, 3, -3.2),
              at(q.neck, 3, 3.2),
              at(end, 3, 3.6),
              at(end, 3, -3.6),
            ]),
          );
        shade(p, d, H, { r: 2.6, hi: 0.82, lo: 0.18 });
        contour(p, d);
      }
      break;
    }
    case 'headwrap': {
      // Wrapped scarf tied high: covers the hair and ears, face fully visible.
      const m = capMask(away, away ? 9 : 3, 1.2);
      hell(m, away ? 5.5 : 3.2, 0.2, 6.4, 4.4);
      if (!away) {
        hrect(m, -1.4, 3, 5, 6.5);
        hell(m, 0.8, 8.8, 2.4, 1.8);
      } else hrect(m, -1.2, 3, 12, 6);
      // Knot on top.
      hell(m, away ? 4 : 5.5, -3.6, 2, 1.4);
      shade(hs, m, H, { r: 2.6, hi: 0.78 });
      // Wrapped folds.
      for (let k = 0; k < 3; k++)
        for (let x = -1; x <= 10; x++) {
          const y = Math.floor(-2 + k * 2 + (away ? x : -x) * 0.3 + 1.5);
          if (m.has(x + HS.ox, y + HS.oy) && m.has(x + HS.ox, y + 1 + HS.oy))
            hp(hs, x, y, H[2]);
        }
      hp(hs, away ? 4 : 5, -4, H[0]);
      if (!away) {
        // Keep the face clear below the wrap's front edge.
        const face = intersect(
          tmask(SKULL_SE),
          (() => {
            const f = hmk();
            hrect(f, 3.5, 3, 8, 9);
            return f;
          })(),
        );
        copyIn(hs, faceSprite(q), face);
      }
      break;
    }
    case 'cap': {
      const m = capMask(away, 2, 0.9);
      shade(hs, m, H, { r: 2.4, hi: 0.74 });
      band(2, H[2]);
      const brim = hmk();
      if (away) hrect(brim, 8, 0, 3, 1);
      else {
        hrect(brim, 7, 2, 5, 1.2);
        hrect(brim, 8, 3, 4, 0.8);
      }
      shade(hs, brim, H, { r: 1 });
      if (!away) hp(hs, 8, 3, H[2]);
      hp(hs, 4, -2, H[0]);
      hp(hs, 4, -1, H[2]);
      break;
    }
    case 'hard-hat': {
      const m = capMask(away, 2, 1.4);
      hrect(m, -2, 2, 14, 1.4);
      shade(hs, m, H, { r: 2.6, hi: 0.74 });
      for (let y = -3; y <= 2; y++) {
        hp(hs, 4, y, H[0]);
        hp(hs, 5, y, H[1]);
      }
      band(3, H[2], -2, 11);
      break;
    }
    case 'scrub-cap': {
      const m = capMask(away, away ? 6 : 3, 0.9);
      if (!away) hrect(m, -1, 3, 3, 4);
      shade(hs, m, H, { r: 2.4, hi: 0.76 });
      // Ties at the back.
      hp(hs, away ? 4 : -1, away ? 7 : 6, H[2]);
      hp(hs, away ? 5 : -2, away ? 8 : 7, H[2]);
      for (let x = 0; x <= 9; x += 3) hp(hs, x, -1 + (x % 2), H[0]);
      break;
    }
    case 'papakha': {
      // Tall sheepskin hat: a wide fur drum with a domed crown, curly fleece.
      const m = hmk();
      hrect(m, -1.3, -3.8, 12.6, 6.5);
      hell(m, 5, -3.8, 6.3, 1.7);
      for (const [x, y] of [
        [-1.3, -2],
        [11.3, -1.5],
        [-1.4, 0.8],
        [11.4, 1.2],
        [1.5, -5.4],
        [7.5, -5.3],
      ] as P[])
        hell(m, x, y, 0.8, 0.8);
      shade(hs, m, H, { r: 3, hi: 0.72, lo: 0.2 });
      for (let j = 0; j < HS.h; j++)
        for (let i = 0; i < HS.w; i++) {
          if (!m.has(i, j)) continue;
          const h = (i * 37 + j * 61 + ((i * j) % 7) * 13) % 11,
            c = colourAt(hs, i, j);
          // Fleece curls: lit tufts and dark hollows.
          if (h === 0 || h === 5) hs.pixel(i, j, c === H[2] ? H[1] : H[0]);
          else if (h === 3 && c !== H[0]) hs.pixel(i, j, H[2]);
        }
      band(2, H[2], -1, 10);
      break;
    }
    default:
      throw Error(`No placeholder art for headwear ${id}`);
  }
  return hs;
}
function drawHeadwear(p: Pixels, id: string, q: Pose) {
  placeHead(p, q, headwearSprite(p, id, q));
}

/* ───────────── props ───────────── */
const BRASS = ['#EAC577', '#D8AD57', '#AF853E'];
function drawProp(p: Pixels, id: string, q: Pose) {
  const R = K.prop,
    hand = q.arms[1][2],
    other = q.arms[0][2],
    [hx, hy] = hand,
    both = lerp(hand, other, 0.5),
    f = q.frame,
    a = q.action,
    seated = q.mode === 'chair' || q.mode === 'floor',
    solid = (m: Mask, ramp = R, r = 1.6) => {
      shade(p, m, ramp, { r, hi: 0.76, lo: 0.22 });
      contour(p, m);
      return m;
    },
    box = (x: number, y: number, w: number, h: number, ramp = R) =>
      solid(mk(p).rect(x, y, w, h), ramp, 1.2);
  switch (id) {
    case 'book': {
      if (a === 'read' || a === 'pray') {
        // Open book held in both hands; a page turns on the last frame.
        const [cx, cy] = both;
        box(cx - 7, cy - 2, 14, 4);
        p.rect(cx - 6, cy - 5, 6, 6, F.white);
        p.rect(cx, cy - 5, 6, 6, F.cream);
        p.rect(cx - 1, cy - 5, 1, 6, F.steel[1]);
        p.rect(cx, cy - 5, 1, 6, F.steel[0]);
        for (let k = 0; k < 3; k++) {
          p.rect(cx - 5, cy - 4 + k * 2, 4, 1, F.steel[0]);
          p.rect(cx + 2, cy - 4 + k * 2, 3, 1, F.steel[0]);
        }
        if (f === 3)
          p.poly(
            [
              [cx, cy - 5],
              [cx + 4, cy - 9],
              [cx + 5, cy - 4],
              [cx + 1, cy],
            ],
            F.white,
          );
      } else {
        box(hx - 1.5, hy - 8, 5, 8);
        p.rect(hx - 0.5, hy - 8, 1, 8, R[0]);
        p.rect(hx + 3, hy - 7, 1, 6, F.cream);
      }
      break;
    }
    case 'scroll': {
      p.rect(hx - 1, hy - 8, 3, 10, F.cream);
      p.rect(hx + 1, hy - 8, 1, 10, F.steel[0]);
      solid(mk(p).rect(hx - 2, hy - 9.5, 5, 2), R, 1);
      solid(mk(p).rect(hx - 2, hy + 1.5, 5, 2), R, 1);
      break;
    }
    case 'astrolabe': {
      const m = mk(p).disc(hx + 1, hy - 4, 4);
      solid(m, BRASS, 2);
      const r = mk(p).disc(hx + 1, hy - 4, 2.6);
      contour(p, r, m);
      p.rect(hx - 2, hy - 4, 7, 1, BRASS[2]);
      p.pixel(hx + 1, hy - 4, F.white);
      p.rect(hx, hy - 9, 2, 1, BRASS[1]);
      break;
    }
    case 'water-skin':
    case 'water-jug': {
      const [cx, cy] = a === 'carry' ? both : [hx + 2.5, hy - 1];
      const tilt = a === 'pour' ? Math.min(3, f) : 0;
      if (id === 'water-jug') {
        const m = mk(p)
          .ellipse(cx, cy - 4 + tilt, 4, 5)
          .rect(cx - 1.5, cy - 11 + tilt, 3, 3);
        solid(m, R, 2.4);
        // Handle and spout.
        const h = mk(p)
          .ellipse(cx - 4.5, cy - 5 + tilt, 1.6, 2.6)
          .minus(mk(p).ellipse(cx - 4.5, cy - 5 + tilt, 0.6, 1.5));
        solid(h, R, 1);
        p.rect(cx + 1.5, cy - 11 + tilt, 2, 1, R[1]);
        p.rect(cx - 2, cy - 7 + tilt, 1, 5, F.waterLight);
      } else {
        const m = mk(p)
          .ellipse(cx, cy - 3, 4, 5.5)
          .rect(cx - 1, cy - 10, 2, 2);
        solid(m, R, 2.4);
        p.rect(cx - 1.5, cy - 11, 3, 1, R[2]);
      }
      if (a === 'pour' && f > 1) {
        p.rect(cx + 4, cy - 9 + tilt, 1, 10 + (f % 3), F.water);
        p.pixel(cx + 4, cy + 1 + (f % 3), F.waterLight);
        p.pixel(cx + 3, cy + 2 + (f % 3), F.water);
      }
      break;
    }
    case 'basket':
    case 'bread':
    case 'tray':
    case 'meal-box': {
      const [cx, cy] = a === 'carry' || a === 'pour' ? both : [hx, hy];
      if (id === 'basket') {
        const m = mk(p).poly([
          [cx - 6.5, cy - 4],
          [cx + 6.5, cy - 4],
          [cx + 5, cy + 3],
          [cx - 5, cy + 3],
        ]);
        solid(m, R, 2);
        for (let y = cy - 3; y < cy + 3; y += 2)
          for (let x = cx - 5; x < cx + 6; x += 2)
            p.pixel(x + ((y - cy) % 4 ? 1 : 0), y, R[2]);
        p.rect(cx - 6, cy - 4, 13, 1, R[0]);
        paint(p, mk(p).disc(cx - 3, cy - 5, 1.8), BRASS);
        paint(p, mk(p).disc(cx + 1, cy - 5.5, 2), [
          '#DAA084',
          '#C87865',
          '#A65D4F',
        ]);
        paint(p, mk(p).disc(cx + 4, cy - 5, 1.5), [
          '#A3B086',
          '#75966B',
          '#487359',
        ]);
      } else if (id === 'bread') {
        const m = mk(p).ellipse(cx, cy - 2.5, 6, 2.8);
        shade(p, m, BRASS, { r: 2 });
        contour(p, m);
        for (let i = 0; i < 3; i++)
          p.rect(cx - 3 + i * 2.5, cy - 4, 1, 2, BRASS[2]);
      } else if (id === 'tray') {
        solid(mk(p).rect(cx - 7, cy - 1, 14, 2), R, 1);
        p.rect(cx - 7, cy - 1, 14, 1, R[0]);
        solid(
          mk(p).rect(cx - 5, cy - 4, 3, 3),
          [F.white, F.cream, F.steel[1]],
          1,
        );
        solid(
          mk(p).rect(cx - 1, cy - 4, 3, 3),
          [F.white, F.cream, F.steel[1]],
          1,
        );
        paint(p, mk(p).ellipse(cx + 4.5, cy - 2.5, 2, 1.5), [
          '#DAA084',
          '#C87865',
          '#A65D4F',
        ]);
      } else {
        box(cx - 6, cy - 7, 12, 8);
        p.rect(cx - 6, cy - 7, 12, 2, R[0]);
        p.rect(cx - 1, cy - 7, 2, 8, F.white);
        p.rect(cx - 6, cy - 5, 12, 1, R[2]);
      }
      break;
    }
    case 'scale': {
      p.rect(hx, hy - 11, 1, 11, R[2]);
      p.rect(hx - 6, hy - 11, 13, 1, R[1]);
      p.pixel(hx, hy - 12, R[0]);
      for (const dx of [-6, 6]) {
        p.rect(hx + dx, hy - 10, 1, 3, F.steel[2]);
        solid(mk(p).ellipse(hx + dx + 0.5, hy - 6.5, 2.6, 1), BRASS, 1);
      }
      break;
    }
    case 'broom': {
      const top: P = add(other, -4, -11),
        bottom: P = [hx + 5, AY - 3];
      solid(mk(p).capsule(top, bottom, 0.9), R, 1);
      const b = mk(p).poly([
        [bottom[0] - 2, bottom[1] - 5],
        [bottom[0] + 2.5, bottom[1] - 5],
        [bottom[0] + 6, bottom[1] + 2.5],
        [bottom[0] - 5, bottom[1] + 2.5],
      ]);
      shade(p, b, BRASS, { r: 2 });
      contour(p, b);
      for (let x = Math.round(bottom[0] - 4); x < bottom[0] + 6; x += 2)
        p.rect(x, bottom[1] - 1, 1, 3, BRASS[2]);
      p.rect(bottom[0] - 2, bottom[1] - 4, 5, 1, R[2]);
      break;
    }
    case 'pen': {
      p.rect(hx + 1, hy - 5 - (f % 2), 1, 6, R[1]);
      p.pixel(hx + 1, hy - 6 - (f % 2), R[0]);
      p.pixel(hx + 1, hy + 1 - (f % 2), F.ink);
      if (a === 'write') {
        p.rect(hx - 8, hy + 1, 11, 3, F.white);
        p.rect(hx - 8, hy + 3, 11, 1, F.cream);
        for (let k = 0; k < 2; k++)
          p.rect(hx - 7, hy + 1 + k, 6 - k * 2, 1, F.steel[0]);
      }
      break;
    }
    case 'laptop': {
      if (
        seated ||
        a === 'write' ||
        a === 'sit' ||
        a === 'read' ||
        a === 'teach'
      ) {
        const [cx, cy] = both;
        p.poly(
          [
            [cx - 7, cy + 1],
            [cx + 6, cy + 1],
            [cx + 8, cy + 4],
            [cx - 5, cy + 4],
          ],
          R[1],
        );
        p.rect(cx - 5, cy + 3, 13, 1, R[2]);
        box(cx - 6, cy - 9, 11, 10, [R[1], R[2], R[2]]);
        p.rect(cx - 5, cy - 8, 9, 8, F.screen);
        p.rect(cx - 4, cy - 7, 4, 1, F.glow);
        p.rect(cx - 4, cy - 5, 6, 1, F.water);
        p.rect(cx - 4, cy - 3, 3, 1, F.gold);
      } else {
        box(hx - 5, hy - 10, 3, 13);
        p.rect(hx - 4, hy - 10, 1, 13, F.steel[0]);
      }
      break;
    }
    case 'tablet':
    case 'phone': {
      const big = id === 'tablet';
      box(hx - (big ? 4 : 1.5), hy - (big ? 9 : 6), big ? 8 : 3, big ? 10 : 6);
      p.rect(
        hx - (big ? 3 : 0.5),
        hy - (big ? 8 : 5),
        big ? 6 : 1,
        big ? 8 : 4,
        F.screen,
      );
      if (big) {
        p.rect(hx - 2, hy - 6, 4, 1, F.glow);
        p.rect(hx - 2, hy - 4, 3, 1, F.water);
      } else p.pixel(hx - 0.5, hy - 5, F.glow);
      break;
    }
    case 'coffee': {
      const m = mk(p).rect(hx - 1.5, hy - 6, 4, 6);
      solid(m, R, 1.2);
      p.rect(hx - 1.5, hy - 7, 4, 1, F.white);
      p.rect(hx - 1.5, hy - 4, 4, 1, F.cream);
      p.rect(hx + 2.5, hy - 5, 1, 2, R[2]);
      if (f % 2 === 0) {
        p.pixel(hx, hy - 9, F.steel[0]);
        p.pixel(hx + 1, hy - 11, F.steel[0]);
      } else p.pixel(hx + 1, hy - 10, F.steel[0]);
      break;
    }
    case 'flask': {
      const [cx, cy] = [hx + 1, hy - 1];
      const m = mk(p).poly([
        [cx - 1, cy - 11],
        [cx + 2, cy - 11],
        [cx + 2, cy - 7],
        [cx + 6, cy + 1],
        [cx - 5, cy + 1],
        [cx - 1, cy - 7],
      ]);
      solid(m, F.steel, 1.6);
      const liquid = intersect(mk(p).rect(cx - 6, cy - 3, 13, 4), m);
      shade(p, liquid, R, { r: 1.2 });
      p.rect(cx - 1.5, cy - 12, 4, 1, F.steel[2]);
      p.pixel(cx - 2, cy - 1, F.white);
      if (a === 'pour' && f > 1) p.rect(cx + 3, cy - 12, 1, 3 + (f % 3), R[0]);
      break;
    }
    case 'stethoscope': {
      if (!upright(q) || q.away) break;
      const { at } = spine(q),
        n = q.neck;
      const pts: P[] = [
        at(n, 0.2, -3),
        at(q.chest, 0, -3.8),
        at(q.chest, -2.6, -2.6),
        at(q.chest, -3.6, 0.2),
        at(q.chest, -2.4, 2.6),
        at(q.chest, 0, 3.6),
        at(n, 0.2, 3.4),
      ];
      const m = mk(p);
      for (let k = 0; k < pts.length - 1; k++)
        m.capsule(pts[k], pts[k + 1], 0.5);
      fill(p, m, R[1]);
      const tube = mk(p).capsule(
        at(q.chest, -3.4, 0.4),
        at(q.chest, -7, 1.2),
        0.5,
      );
      fill(p, tube, R[2]);
      const [x, y] = at(q.chest, -7.6, 1.2);
      solid(mk(p).disc(x, y, 1.4), F.steel, 1);
      break;
    }
    case 'clipboard': {
      box(hx - 4, hy - 11, 8, 11);
      p.rect(hx - 3, hy - 9, 6, 8, F.white);
      p.rect(hx - 1, hy - 12, 3, 2, F.steel[2]);
      for (let k = 0; k < 3; k++)
        p.rect(hx - 2, hy - 7 + k * 2, 4 - (k % 2), 1, F.steel[1]);
      break;
    }
    case 'blueprint': {
      solid(mk(p).capsule([hx - 6, hy - 11], [hx + 4, hy + 2], 1.8), R, 1.5);
      p.rect(hx + 3, hy + 1, 2, 2, F.white);
      p.pixel(hx - 6, hy - 11, F.white);
      break;
    }
    case 'trophy': {
      // A generic golden cup: bowl, two handles, stem and a plain base.
      const lift =
        a === 'cheer' || a === 'celebrate' || a === 'arms-out' || a === 'wave';
      const [cx, cy] =
        a === 'carry' || a === 'read' || a === 'teach' || seated
          ? [both[0], both[1] - 1]
          : lift
            ? [hx, hy - 1]
            : [hx + 1, hy];
      const G = BRASS,
        top = cy - 15;
      const bowl = mk(p).poly([
        [cx - 4.5, top],
        [cx + 5.5, top],
        [cx + 4.5, top + 5],
        [cx + 1.5, top + 8],
        [cx - 0.5, top + 8],
        [cx - 3.5, top + 5],
      ]);
      solid(bowl, G, 2);
      for (const [x0, dir] of [
        [cx - 4.5, -1],
        [cx + 5.5, 1],
      ] as [number, number][]) {
        p.pixel(x0 + dir, top + 1, G[1]);
        p.pixel(x0 + dir * 2, top + 2, G[2]);
        p.pixel(x0 + dir * 2, top + 3, G[2]);
        p.pixel(x0 + dir, top + 4, G[1]);
      }
      p.rect(cx - 3.5, top, 9, 1, G[0]);
      p.rect(cx, top + 8, 1, 3, G[1]);
      p.rect(cx + 1, top + 8, 1, 3, G[2]);
      const base = mk(p).rect(cx - 3, top + 11, 7, 3);
      solid(base, [F.charcoal[0], F.charcoal[1], F.ink], 1);
      p.rect(cx - 3, top + 12, 7, 1, G[1]);
      p.pixel(cx - 2.5, top + 1, F.white);
      break;
    }
    case 'keys': {
      // A small ring of keys hanging from the fingers.
      const [kx, ky] = [hx + 0.5, hy + 1];
      const ring = mk(p).disc(kx, ky, 1.9);
      ring.minus(mk(p).disc(kx, ky, 0.9));
      solid(ring, F.steel, 1);
      for (const [dx, len, c] of [
        [-1.5, 4, BRASS[1]],
        [0.5, 5, F.steel[1]],
        [2, 3.5, BRASS[2]],
      ] as [number, number, string][]) {
        p.rect(kx + dx, ky + 1.5, 1, len, c);
        p.rect(kx + dx - 0.5, ky + 1.5 + len - 1, 2, 1, c);
      }
      break;
    }
    case 'envelope': {
      // A plain cream envelope held flat in the hand.
      const [ex, ey] =
        a === 'carry' ? [both[0] - 4, both[1] - 4] : [hx - 3, hy - 5];
      const env = mk(p).rect(ex, ey, 8, 5);
      solid(env, [F.white, F.cream, F.steel[1]], 1);
      p.pixel(ex + 1, ey + 1, F.steel[0]);
      p.pixel(ex + 2, ey + 2, F.steel[0]);
      p.pixel(ex + 3, ey + 3, F.steel[1]);
      p.pixel(ex + 4, ey + 3, F.steel[1]);
      p.pixel(ex + 5, ey + 2, F.steel[0]);
      p.pixel(ex + 6, ey + 1, F.steel[0]);
      break;
    }
    case 'keeper-gloves': {
      // Big padded goalkeeper gloves: a wide palm with a flat finger block.
      for (const arm of q.arms) {
        const [gx, gy] = arm[2],
          d = norm(arm[1], arm[2]),
          n: P = [-d[1], d[0]];
        const m = mk(p)
          .disc(gx + d[0] * 0.8, gy + d[1] * 0.8, 3.4)
          .capsule(
            [gx + d[0] * 2.2 - n[0] * 1.6, gy + d[1] * 2.2 - n[1] * 1.6],
            [gx + d[0] * 2.2 + n[0] * 1.6, gy + d[1] * 2.2 + n[1] * 1.6],
            2.6,
          );
        solid(m, R, 2.4);
        const cuff = lerp(arm[1], arm[2], 0.68);
        for (let k = -2.5; k <= 2.5; k += 0.5)
          p.pixel(cuff[0] + n[0] * k, cuff[1] + n[1] * k, F.white);
        p.pixel(gx + d[0] * 3.4, gy + d[1] * 3.4, F.white);
      }
      break;
    }
    case 'cricket-bat': {
      // Grip in the hand, the blade carried on along the forearm: hanging by
      // the leg at rest, raised high when celebrating.
      const elbow = q.arms[1][1],
        [dx, dy] = norm(elbow, hand),
        at = (t: number): P => [hx + dx * t, hy + dy * t];
      solid(
        mk(p).capsule(at(-1), at(4), 0.8),
        [F.charcoal[0], F.charcoal[1], F.ink],
        1,
      );
      const blade = mk(p).capsule(at(4.5), at(15), 1.5, 1.8);
      solid(blade, R, 1.4);
      const [ex, ey] = at(15);
      p.pixel(ex, ey, R[2]);
      break;
    }
    case 'bottle': {
      // A plain dark-green bottle (no label): shaken overhead when
      // celebrating, otherwise held at the side, neck up.
      const up = a === 'cheer' || a === 'celebrate' || a === 'arms-out',
        shake = up ? [0, 1.2, -1.2, 0.6][f % 4] : 0,
        g = ['#45A272', '#2F6E4F', '#1F4F38'],
        base: P = up ? [hx + shake, hy - 1] : [hx + 0.5, hy + 2.5],
        top: P = up ? [hx + shake * 1.8, hy - 9] : [hx + 0.5, hy - 4.5];
      const body = mk(p).capsule(
        lerp(base, top, 0.05),
        lerp(base, top, 0.62),
        1.9,
        1.9,
      );
      solid(body, g, 1.4);
      const neck = mk(p).capsule(lerp(base, top, 0.66), top, 0.8, 0.7);
      solid(neck, g, 1);
      p.rect(top[0] - 0.5, top[1] - 1, 2, 1, F.steel[0]);
      // A highlight down the glass.
      const [lx, ly] = lerp(base, top, 0.25);
      p.rect(lx - 1, ly - 2, 1, 3, '#7FC7AE');
      break;
    }
    case 'cane': {
      solid(mk(p).capsule([hx + 1, hy], [hx + 3.5, AY - 1], 0.8), R, 1);
      solid(mk(p).capsule([hx - 2, hy - 1], [hx + 1.5, hy - 1], 0.8), R, 1);
      p.rect(hx + 2.5, AY - 1, 2, 1, F.ink);
      break;
    }
    case 'football': {
      const foot = q.legs[1][2],
        held = a === 'carry' || a === 'read' || a === 'teach';
      const [cx, cy] = held ? both : [foot[0] + 5.5, foot[1] - 0.5];
      const m = mk(p).disc(cx, cy, 3.2);
      shade(p, m, [F.white, F.cream, F.steel[1]], { r: 2.4, hi: 0.7 });
      contour(p, m);
      p.rect(cx - 0.5, cy - 0.5, 2, 2, R[2]);
      p.pixel(cx - 2, cy + 1, R[2]);
      p.pixel(cx + 2, cy - 2, R[2]);
      p.pixel(cx - 1, cy - 2.5, R[1]);
      break;
    }
    case 'wrist-tape': {
      for (const arm of q.arms) {
        const w = lerp(arm[1], arm[2], 0.74);
        if (arm === q.arms[1] || a === 'cheer')
          solid(mk(p).disc(w[0], w[1], 1.7), [F.white, F.white, F.cream], 1);
      }
      break;
    }
    case 'mma-gloves':
    case 'boxing-gloves': {
      const big = id === 'boxing-gloves';
      for (const arm of q.arms) {
        const [gx, gy] = arm[2],
          d = norm(arm[1], arm[2]);
        const m = mk(p).disc(gx + d[0] * 0.6, gy + d[1] * 0.6, big ? 3.3 : 2.2);
        if (big) m.disc(gx - d[0] * 1.2, gy - d[1] * 1.2, 2.6);
        solid(m, R, big ? 2.4 : 1.4);
        const cuff = lerp(arm[1], arm[2], 0.7),
          n: P = [-d[1], d[0]];
        for (let k = -2; k <= 2; k += 0.5)
          p.pixel(cuff[0] + n[0] * k, cuff[1] + n[1] * k, big ? F.white : R[0]);
        if (!big) {
          // Open fingers of the grappling glove.
          p.pixel(gx + d[0] * 2.2, gy + d[1] * 2.2, K.skin[1]);
          p.pixel(gx + d[0] * 2.2 + n[0], gy + d[1] * 2.2 + n[1], K.skin[2]);
        } else p.pixel(gx - 1, gy - 1.5, R[0]);
      }
      break;
    }
    case 'title-belt': {
      if (!upright(q)) break;
      const { at } = spine(q);
      const strap = mk(p);
      for (let s = -6.2; s <= 6.2; s += 0.5)
        strap.disc(...at(q.hip, 0.5, s), 1.5);
      shade(p, strap, [F.charcoal[1], F.ink, F.ink], { r: 1 });
      if (!q.away) {
        const [bx, by] = at(q.hip, 0.5, 0.8);
        const plate = mk(p).poly([
          [bx - 4.5, by - 4],
          [bx + 4.5, by - 4],
          [bx + 6, by],
          [bx + 4.5, by + 3.5],
          [bx - 4.5, by + 3.5],
          [bx - 6, by],
        ]);
        shade(p, plate, BRASS, { r: 2.4, hi: 0.7 });
        contour(p, plate);
        const inner = mk(p).disc(bx, by, 2.2);
        shade(p, inner, [BRASS[1], BRASS[2], BRASS[2]], { r: 1 });
        p.pixel(bx - 1, by - 1, F.white);
        p.pixel(bx - 4, by - 2, F.white);
        p.pixel(bx + 4, by + 1, R[0]);
        p.pixel(bx - 4, by + 1, R[0]);
      }
      break;
    }
    case 'scooter': {
      // Kick scooter: steel deck and stem, dark wheels, T-handlebar.
      const wheel = (x: number, y: number) => {
        shade(p, mk(p).disc(x, y, 2.6), [F.charcoal[1], F.ink, F.ink], {
          r: 1.6,
        });
        p.pixel(x - 0.5, y - 0.5, F.steel[1]);
        p.pixel(x - 0.5 + (f % 2 ? 1 : -1), y + (f % 2 ? -1 : 0.5), F.steel[2]);
      };
      const draw = (
        back: number,
        front: number,
        deckY: number,
        barX: number,
        barY: number,
      ) => {
        solid(mk(p).rect(back, deckY, front - back + 1, 2), R, 1);
        p.rect(back, deckY, front - back + 1, 1, R[0]);
        p.rect(back - 1, deckY - 1, 3, 1, R[2]);
        const stem = mk(p).capsule([front, deckY + 1], [barX + 0.5, barY], 0.9);
        shade(p, stem, F.steel, { r: 1 });
        contour(p, stem);
        p.rect(barX - 3, barY - 1, 7, 2, R[1]);
        p.rect(barX - 4, barY - 1, 2, 2, F.ink);
        p.rect(barX + 4, barY - 1, 2, 2, F.ink);
        wheel(back + 1, deckY + 3);
        wheel(front + 0.5, deckY + 3);
      };
      if (a === 'ride') {
        // One stem at the front; a long low deck between two wheels.
        const feet = q.legs.map((l) => l[2]),
          deckY = Math.round(Math.max(...feet.map((v) => v[1])) + 1.4),
          back = Math.round(Math.min(...feet.map((v) => v[0])) - 9),
          barX = Math.round(Math.max(hx, other[0]) + 0.5),
          barY = Math.round(Math.min(hy, other[1]) - 0.5);
        draw(back, barX + 6, deckY, barX, barY);
      } else {
        // Parked, well clear of the person (screen-left).
        draw(1, 13, AY - 4, 9, 56);
      }
      break;
    }
    case 'shopping-bag': {
      const [cx, cy] = a === 'carry' ? both : [hx, hy + 6];
      box(cx - 4, cy - 2, 9, 9);
      p.rect(cx - 2, cy - 4, 1, 2, R[2]);
      p.rect(cx + 2, cy - 4, 1, 2, R[2]);
      p.rect(cx - 2, cy - 5, 5, 1, R[2]);
      paint(p, mk(p).rect(cx - 2, cy - 3, 3, 2), [
        '#A3B086',
        '#75966B',
        '#487359',
      ]);
      paint(p, mk(p).rect(cx + 1, cy - 3, 3, 2), [
        '#DAA084',
        '#C87865',
        '#A65D4F',
      ]);
      break;
    }
    default:
      throw Error(`No placeholder art for prop ${id}`);
  }
}

/* ───────────── animals ───────────── */
function drawCat(p: Pixels, action: Action, face: string, f: number) {
  const C = K.cloth,
    away = face === 'NE',
    fur = (m: Mask, r = 2.4) => {
      shade(p, m, C, { r, hi: 0.78, lo: 0.2 });
      contour(p, m);
    };
  if (action === 'cat_sleep') {
    // Curled up asleep, tail wrapped round, breathing slowly.
    const breathe = f >= 2 ? 1 : 0;
    const body = mk(p).ellipse(
      15,
      18.5 - breathe * 0.5,
      9,
      3.8 + breathe * 0.5,
    );
    body.ellipse(10, 18, 4.5, 3.4);
    fur(body, 3);
    for (let i = 0; i < 4; i++)
      crease(
        p,
        body,
        [
          [10 + i * 3, 15.5],
          [11 + i * 3, 18],
        ],
        false,
      );
    const tail = mk(p)
      .capsule([7, 20.5], [16, 21.5], 1.3)
      .capsule([16, 21.5], [21, 20.5], 1.2);
    fur(tail, 1.2);
    const head = mk(p).ellipse(22.5, 18, 4, 3.3);
    fur(head, 2);
    for (const [x0, x1] of [
      [19.5, 21.5],
      [23.5, 25.5],
    ]) {
      p.poly(
        [
          [x0, 16],
          [(x0 + x1) / 2 - 0.5, 12.5],
          [x1, 15.5],
        ],
        C[1],
      );
      p.pixel((x0 + x1) / 2 - 0.5, 14.5, '#D07A8D');
    }
    // Closed eyes and a pink nose.
    p.rect(21, 18, 2, 1, F.ink);
    p.rect(24, 18, 1, 1, F.ink);
    p.pixel(25.5, 19.5, '#D07A8D');
    return;
  }
  const walking = action === 'cat_walk',
    bob = walking ? f % 2 : 0;
  // Legs (far pair first, darker), with paws.
  const swing = (i: number) =>
    walking ? [0, 1.5, 2, 0.5, -1, -1.5][(f + i * 3) % 6] : 0;
  const leg = (x: number, i: number, back: boolean) => {
    const top: P = [x, 14 + bob],
      paw: P = [x + swing(i), 21];
    const m = mk(p).capsule(top, paw, back ? 1.4 : 1.1, 0.9);
    if (back) m.ellipse(x + 1, 14.5 + bob, 2.6, 3);
    return m;
  };
  for (const [x, i, back] of [
    [11.5, 1, true],
    [20, 3, false],
  ] as [number, number, boolean][]) {
    const m = leg(x, i, back);
    shade(p, m, [C[1], C[2], C[2]], { r: 1.2 });
    contour(p, m);
  }
  const body = mk(p).ellipse(15.5, 14 + bob, 7.6, 3.5);
  body.ellipse(20, 13.5 + bob, 3.4, 3.4);
  fur(body, 3);
  // Tabby stripes across the back.
  for (let i = 0; i < 4; i++)
    crease(
      p,
      body,
      [
        [11 + i * 2.6, 10.8 + bob],
        [11.5 + i * 2.6, 13 + bob],
      ],
      false,
    );
  for (const [x, i, back] of [
    [9.5, 0, true],
    [18.5, 2, false],
  ] as [number, number, boolean][]) {
    const m = leg(x, i, back);
    fur(m, 1.4);
    p.pixel(x + swing(i) + 0.5, 21, C[0]);
  }
  const hy = (away ? 8 : 9.5) + bob;
  const head = mk(p).ellipse(23.5, hy + 1.5, 4.2, 3.6);
  if (!away) head.ellipse(26.2, hy + 2.6, 2, 1.6); // muzzle
  fur(head, 2.2);
  // Ears with pink insides.
  for (const [x0, x1, c] of [
    [20, 22.5, C[1]],
    [23.5, 26.5, C[2]],
  ] as [number, number, string][]) {
    p.poly(
      [
        [x0, hy - 0.5],
        [(x0 + x1) / 2, hy - 4.5],
        [x1, hy],
      ],
      c,
    );
    if (!away) p.pixel((x0 + x1) / 2, hy - 1.5, '#D07A8D');
  }
  if (!away) {
    // Almond eyes with a slit pupil, a pink nose and whiskers.
    for (const ex of [23, 26]) {
      p.rect(ex, hy + 1, 2, 1, F.gold);
      p.pixel(ex + 1, hy + 1, F.ink);
    }
    p.pixel(27.5, hy + 2.5, '#D07A8D');
    p.pixel(28, hy + 3.5, F.ink);
    p.rect(28.5, hy + 2.5, 2, 1, F.steel[0]);
  }
  const sway = action === 'cat_idle' ? [0, 1, 2, 1][f] : f % 2;
  const tail = mk(p)
    .capsule([8.5, 13 + bob], [5.5, 10 + sway * 0.5], 1.3, 1.1)
    .capsule([5.5, 10 + sway * 0.5], [4.5 - sway * 0.5, 4.5 + sway], 1.1, 1);
  fur(tail, 1.2);
}
function drawBird(p: Pixels, action: Action, face: string, f: number) {
  const C = K.cloth,
    R = K.prop;
  const flying = action === 'bird_fly',
    peck = action === 'bird_peck' && f === 3;
  const by = flying ? 9 : 13;
  const feathers = (m: Mask, r = 1.8) => {
    shade(p, m, C, { r, hi: 0.76, lo: 0.22 });
    contour(p, m);
  };
  // Tail feathers.
  const tail = mk(p).poly([
    [5, by - 0.5],
    [0.5, by - 1.5 + (flying ? 0 : 1)],
    [1, by + 1.5],
    [5, by + 1.5],
  ]);
  feathers(tail, 1);
  p.rect(1, by, 3, 1, C[2]);
  const body = mk(p).ellipse(9, by, 4.6, 3.1);
  feathers(body, 2.4);
  // Pale breast.
  for (let x = 9; x <= 12; x++) p.pixel(x, by + 1.5, C[0]);
  const hx = peck ? 14 : 13,
    hy = peck ? by + 2 : by - 3;
  const head = mk(p).disc(hx, hy, 2.6);
  feathers(head, 1.6);
  p.rect(hx + 2, hy, 3, 1, R[0]);
  p.pixel(hx + 2, hy + 1, R[1]);
  p.pixel(hx + 4, hy + 1, R[2]);
  if (face !== 'NE') {
    p.pixel(hx + 1, hy - 1, F.ink);
    p.pixel(hx + 1, hy - 2, '#FBFAF4');
  }
  if (flying) {
    const up = [0, 3, 5, 3, 0, -2][f];
    p.poly(
      [
        [6, by - 1],
        [1.5, by - 2.5 - up],
        [4, by - 2 - up * 0.6],
        [10, by],
      ],
      C[1],
    );
    p.poly(
      [
        [9, by - 1],
        [14, by - 3.5 - up],
        [12.5, by + 1],
      ],
      C[2],
    );
    for (let k = 0; k < 3; k++)
      p.pixel(3 + k * 2, by - 2 - up * (0.8 - k * 0.25), C[2]);
  } else {
    // Folded wing with feather edges, thin legs.
    const wing = mk(p).poly([
      [5.5, by - 1.5],
      [11.5, by - 1.5],
      [10, by + 1.5],
      [4.5, by + 1],
    ]);
    shade(p, wing, [C[1], C[2], C[2]], { r: 1 });
    for (let x = 6; x <= 10; x += 2) p.pixel(x, by + 1, C[0]);
    p.rect(8, by + 3, 1, 3, R[1]);
    p.rect(11, by + 3, 1, 3, R[1]);
    p.rect(7, by + 5, 3, 1, R[2]);
    p.rect(10, by + 5, 3, 1, R[2]);
  }
}

/** A white emergency van in iso; blue roof lights alternate between frames. */
function drawAmbulance(p: Pixels, face: string, f: number) {
  const along = face === 'NE' ? 'y' : 'x',
    L = 1.8,
    W = 0.9,
    c = along === 'x' ? isoCanvas(72, 56, 29, 33) : isoCanvas(72, 56, 43, 33);
  const [w, d] = along === 'x' ? [L, W] : [W, L];
  const body = {
    top: '#FBFBF7',
    front: '#EEF0EC',
    side: '#DADFDC',
    edge: '#B9C0BE',
  };
  // Shadow under the van.
  c.top(-0.1, -0.05, w + 0.2, d + 0.15, 0, '#B5C3BA');
  c.box(0, 0, w, d, 22, body);
  // Red side stripe on both visible faces.
  c.faceX(0, d + 0.001, w, 8, 3, '#E05A4F');
  c.faceX(0, d + 0.002, w, 8, 1, '#B23A35');
  c.faceY(w + 0.001, 0, d, 8, 3, '#C93A3A');
  // Windows: the cab glass where the van points, side windows elsewhere.
  if (along === 'x') {
    c.faceY(w + 0.002, 0.1, d - 0.2, 13, 7, '#2A2E33');
    c.faceY(w + 0.003, 0.12, 0.25, 15, 4, '#548FBD');
    c.faceX(1.2, d + 0.003, 0.45, 13, 6, '#36557A');
    c.faceX(0.2, d + 0.003, 0.7, 12, 7, '#DADFDC');
    c.faceX(0.22, d + 0.004, 0.33, 12, 7, '#B9C0BE');
  } else {
    c.faceX(0.1, d + 0.003, w - 0.2, 11, 8, '#DADFDC');
    c.faceX(0.12, d + 0.004, 0.33, 11, 8, '#B9C0BE');
    c.faceX(0.47, d + 0.004, 0.33, 11, 8, '#B9C0BE');
    c.faceY(w + 0.002, 0.15, 0.5, 13, 6, '#36557A');
  }
  // Wheels along the visible long side.
  const wheels: [number, number][] =
    along === 'x'
      ? [
          [0.35, d],
          [1.45, d],
        ]
      : [
          [w, 0.35],
          [w, 1.45],
        ];
  for (const [x, y] of wheels) {
    const [wx, wy] = c.at(x, y, 2);
    c.p.ellipse(wx, wy, 3.4, 3.4, '#2A2E33');
    c.p.ellipse(wx, wy, 1.6, 1.6, '#8E9796');
  }
  // Roof light bar: blue lamps take turns to flash.
  const [lx, ly] =
    along === 'x' ? c.at(w - 0.35, d / 2, 23) : c.at(w / 2, 0.35, 23);
  c.p.rect(lx - 5, ly - 1, 11, 3, '#5E6668');
  c.p.rect(lx - 4, ly - 2, 4, 2, f ? '#2A57A0' : '#9FD0E3');
  c.p.rect(lx + 1, ly - 2, 4, 2, f ? '#9FD0E3' : '#2A57A0');
  if (f === 0) c.p.pixel(lx - 3, ly - 3, '#CDE9F2');
  else c.p.pixel(lx + 2, ly - 3, '#CDE9F2');
  blit(p, c.p);
}
function drawBall(p: Pixels, action: Action, f: number) {
  const m = mk(p).disc(6, 8, 3.3);
  shade(p, m, [F.white, F.cream, F.steel[1]], { r: 2.4, hi: 0.7 });
  const spin = action === 'ball_roll' ? f : 0;
  const patches: P[] = [
    [5, 6],
    [7, 8],
    [5, 9],
    [7, 6],
  ];
  p.rect(5 + (spin % 2), 7, 2, 2, K.prop[2]);
  const [a, b] = patches[spin];
  p.pixel(a + 1, b - 1, K.prop[1]);
}
export function drawPart(
  id: string,
  category: string,
  action: Action,
  face: 'SE' | 'NE' | 'SW',
  f: number,
): Pixels {
  const spec = canvasFor(id),
    p = new Pixels(spec.width, spec.height);
  if (id === 'cat') {
    drawCat(p, action, face, f);
    return p;
  }
  if (id === 'bird') {
    drawBird(p, action, face, f);
    return p;
  }
  if (id === 'ball') {
    drawBall(p, action, f);
    return p;
  }
  if (id === 'ambulance') {
    drawAmbulance(p, face, f);
    return p;
  }
  if (face === 'SW') {
    // Explicit SW frames (pour/write): drawn from the SE pose, then mirrored here
    // in the source so the compositor's explicit-frame path is exercised.
    const se = drawPart(id, category, action, 'SE', f),
      out = new Pixels(se.width, se.height);
    blit(out, se, 0, 0, true);
    return out;
  }
  const q = pose(action, face, f);
  if (category === 'bases') drawBase(p, id, q);
  if (category === 'garments') drawGarment(p, id, q);
  if (category === 'headwear') drawHeadwear(p, id, q);
  // Hands are free during prayer: props are not drawn for it.
  if (category === 'props' && action !== 'pray' && action !== 'sujood')
    drawProp(p, id, q);
  return p;
}
export async function generateParts(overwrite = false) {
  for (const [category, ids] of Object.entries({
    bases,
    garments,
    headwear,
    props,
  })) {
    for (const id of ids) {
      try {
        await fs.access(`art/parts/${category}/${id}.json`);
        if (!overwrite) continue;
      } catch {
        /* Only seed absent parts; preserve artist replacements. */
      }
      const actions = (
        id === 'cat'
          ? ['cat_idle', 'cat_walk', 'cat_sleep']
          : id === 'bird'
            ? ['bird_fly', 'bird_peck']
            : id === 'ball'
              ? ['ball_roll', 'ball_still']
              : id === 'ambulance'
                ? ['vehicle_drive']
                : Object.keys(ACTIONS).filter(
                    (a) =>
                      !a.startsWith('cat_') &&
                      !a.startsWith('bird_') &&
                      !a.startsWith('ball_') &&
                      !a.startsWith('vehicle_'),
                  )
      ) as Action[];
      const frames: Aseprite['frames'] = [],
        tags: Aseprite['meta']['frameTags'] = [];
      const images: Pixels[] = [];
      const spec = canvasFor(id),
        w = spec.width,
        h = spec.height;
      for (const action of actions)
        for (const facing of [
          'SE',
          'NE',
          ...(['pour', 'write'].includes(action) ? ['SW'] : []),
        ] as ('SE' | 'NE' | 'SW')[]) {
          const start = frames.length;
          for (let i = 0; i < ACTIONS[action]; i++) {
            images.push(drawPart(id, category, action, facing, i));
            frames.push({
              filename: `${action}_${facing}_${i}`,
              frame: {
                x: (frames.length % 16) * w,
                y: Math.floor(frames.length / 16) * h,
                w,
                h,
              },
              spriteSourceSize: { x: 0, y: 0, w, h },
              sourceSize: { w, h },
              duration: 83,
            });
          }
          tags.push({
            name: `${action}_${facing.toLowerCase()}`,
            from: start,
            to: frames.length - 1,
          });
        }
      const sheet = new Pixels(w * 16, Math.ceil(images.length / 16) * h);
      images.forEach((im, i) =>
        blit(sheet, im, (i % 16) * w, Math.floor(i / 16) * h),
      );
      const anchor = spec.anchor;
      await png(`art/parts/${category}/${id}.png`, sheet);
      await writeJson(`art/parts/${category}/${id}.json`, {
        frames,
        meta: {
          image: `${id}.png`,
          size: { w: sheet.width, h: sheet.height },
          frameTags: tags,
          slices: [
            {
              name: 'foot',
              keys: [
                {
                  frame: 0,
                  bounds: { x: anchor[0], y: anchor[1], w: 1, h: 1 },
                },
              ],
            },
          ],
        },
      });
    }
  }
}
