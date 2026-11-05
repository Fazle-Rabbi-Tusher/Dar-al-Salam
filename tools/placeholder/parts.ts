import fs from 'node:fs/promises';
import { Pixels, blit, hexAt } from '../../packages/shared/pixels';
import { ACTIONS, type Action } from '../../packages/shared/schema';
import { canvasFor } from '../../packages/shared/canvas';
import { png, writeJson } from '../build/io';
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
];
const K = {
  skin: ['#FF00FF', '#CC00CC', '#990099'],
  hair: ['#00FFFF', '#00CCCC', '#009999'],
  cloth: ['#FFFF00', '#CCCC00', '#999900'],
  sash: ['#00FF00', '#00CC00', '#009900'],
  hat: ['#FF8000', '#CC6600', '#994C00'],
  prop: ['#0080FF', '#0066CC', '#004C99'],
};
// Fixed palette colours (all present in world-palette.json).
const F = {
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
type Turn = 'up' | 'down' | 'back';
type Pose = {
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

class Mask {
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

const mk = (p: { width: number; height: number }) => new Mask(p.width, p.height);
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
const colourAt = (p: Pixels, x: number, y: number) =>
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
function castShadow(p: Pixels, m: Mask, dx = 1, dy = 1, onto: Mask | null = null) {
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
      ? [Math.round(q.headC[0] - HEAD_W / 2), Math.round(q.headC[1] - HEAD_H / 2)]
      : [Math.round(q.headC[0]), Math.round(q.headC[1])];
  return q;
}
/** Small per-action corrections after the mapping (contacts with the floor). */
function fixPose(q: Pose) {
  const fy = q.away ? -0.5 : 0.12;
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
function pose(action: Action, facing: 'SE' | 'NE', f: number): Pose {
  return realistic(rawPose(action, facing, f));
}
SHADES.push(K.skin, K.hair, K.cloth, K.sash, K.hat, K.prop, F.charcoal, F.steel);
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
      const s = walkLegs(q, 5);
      q.arms[0][2] = add(q.arms[0][2], -s * 1.2, -Math.abs(s) * 0.3);
      q.arms[0][1] = add(q.arms[0][1], -s * 0.5, 0);
      q.arms[1][2] = add(q.arms[1][2], s * 1.2, -Math.abs(s) * 0.3);
      q.arms[1][1] = add(q.arms[1][1], s * 0.5, 0);
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
const HS = { w: 22, h: 26, ox: 6, oy: 6 };
type Template = string[];
function cells(t: Template, ch = '#'): P[] {
  const out: P[] = [];
  t.forEach((row, j) => {
    for (let i = 0; i < row.length; i++)
      if (ch.includes(row[i])) out.push([i - 3, j - 3]);
  });
  return out;
}
/** Mask in head space from template cells. */
function tmask(t: Template, ch = '#') {
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
const SKULL_SE: Template = [
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
const SKULL_NE: Template = [
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
type Hair = {
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
const HAIR: Record<string, Hair> = {
  'adult-man': {
    style: 'straight',
    se: [
      '.................',
      '.................',
      '.....######......',
      '....########.....',
      '...##########....',
      '...#######.......',
      '...#####.........',
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
      '...######........',
      '...####..........',
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
      '...######........',
      '...####..........',
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
      '...#######.......',
      '...####..........',
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
type Eyes = 'open' | 'happy' | 'down' | 'closed' | 'blink' | 'determined';
type Mouth = 'smile' | 'open' | 'flat' | 'shout' | 'o' | 'calm' | 'grin';
/** Expression by action and frame, so viewers can read what people do. */
function expression(
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
  white: '#F5EEDB',
  mouth: '#704C36',
  inner: '#3B322E',
  teeth: '#F5EEDB',
};
const SK = K.skin;
/** Skin of the bare head, lit from the top left, with facial planes. */
function paintSkull(hs: Pixels, away: boolean) {
  const skull = tmask(away ? SKULL_NE : SKULL_SE);
  shade(hs, skull, SK, { r: 3.2, hi: 0.78, lo: 0.12 });
  if (away) {
    // Right ear and the edge of the jaw.
    hp(hs, 9, 5, SK[1]);
    hp(hs, 10, 5, SK[1]);
    hp(hs, 10, 6, SK[2]);
    hp(hs, 9, 6, SK[2]);
    hp(hs, 9, 7, SK[1]);
    for (let y = 8; y <= 10; y++) hp(hs, 1 + (y - 8), y, SK[2]);
    return skull;
  }
  // Eye sockets in soft shadow, a lit nose bridge and cheekbone.
  hp(hs, 4, 5, SK[1]);
  hp(hs, 5, 5, SK[1]);
  hp(hs, 8, 5, SK[1]);
  hp(hs, 7, 4, SK[0]);
  hp(hs, 7, 5, SK[0]);
  hp(hs, 7, 6, SK[0]);
  hp(hs, 8, 7, SK[2]); // nostril
  hp(hs, 9, 7, SK[1]);
  hp(hs, 10, 7, SK[1]);
  hp(hs, 8, 8, SK[1]);
  hp(hs, 9, 8, SK[1]);
  hp(hs, 5, 7, SK[0]); // cheekbone
  hp(hs, 6, 7, SK[0]);
  // Jaw shadow and the far cheek.
  for (const [x, y] of [
    [1, 8],
    [2, 9],
    [3, 10],
    [9, 6],
    [9, 9],
    [8, 10],
  ] as P[])
    hp(hs, x, y, SK[2]);
  hp(hs, 4, 10, SK[1]);
  // Ear.
  hp(hs, 2, 5, SK[1]);
  hp(hs, 2, 6, SK[1]);
  hp(hs, 3, 6, SK[2]);
  hp(hs, 2, 7, SK[2]);
  hp(hs, 1, 6, SK[1]);
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
        // Tight curls: lit dots with dark gaps between them.
        const k = (x * 3 + y * 5 + (y % 2) * 2) % 6;
        if (k === 0 && c !== H[2]) hs.pixel(x, y, H[0]);
        else if (k === 3) hs.pixel(x, y, H[2]);
      } else if (style === 'buzz') {
        // Close crop: skin shows through a fine stipple.
        if ((x + y) % 2) hs.pixel(x, y, H[2]);
      } else if (beard) {
        // Beard: vertical strands, dark at the edges.
        if (x % 2 && c === H[1]) hs.pixel(x, y, H[2]);
        if (!m.has(x, y + 1) && x % 2 === 0) hs.pixel(x, y, H[1]);
      } else if (c === H[1]) {
        // Combed strands running back over the head.
        if ((x * 2 + y) % 5 === 0) hs.pixel(x, y, H[0]);
        else if ((x + y * 2) % 7 === 0) hs.pixel(x, y, H[2]);
      }
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
    hp(hs, 3, by, B);
    hp(hs, 4, by, B);
    hp(hs, 5, by, B);
    hp(hs, 8, by, B);
    hp(hs, 9, by, B);
    if (brows === 'raised') hp(hs, 4, 2, B);
  }
  // Eyes: lid line on row 5, the eye itself on row 6.
  const lid = (x: number) => hp(hs, x, 5, FACE.lid);
  switch (eyes) {
    case 'open':
    case 'determined':
      lid(4);
      lid(5);
      lid(8);
      hp(hs, 4, 6, FACE.white);
      hp(hs, 5, 6, FACE.eye);
      hp(hs, 8, 6, FACE.eye);
      hp(hs, 4, 7, SK[1]);
      break;
    case 'happy':
      lid(4);
      lid(5);
      lid(8);
      hp(hs, 4, 6, SK[1]);
      hp(hs, 5, 6, FACE.eye);
      hp(hs, 8, 6, SK[1]);
      hp(hs, 4, 7, SK[0]);
      hp(hs, 5, 7, SK[0]);
      break;
    case 'down':
      hp(hs, 4, 5, SK[1]);
      hp(hs, 5, 5, SK[1]);
      hp(hs, 4, 6, FACE.lid);
      hp(hs, 5, 6, FACE.lid);
      hp(hs, 8, 6, FACE.lid);
      break;
    case 'closed':
    case 'blink':
      hp(hs, 4, 5, SK[0]);
      hp(hs, 5, 5, SK[1]);
      hp(hs, 4, 6, FACE.lid);
      hp(hs, 5, 6, FACE.lid);
      hp(hs, 8, 6, FACE.lid);
      hp(hs, 3, 6, SK[1]);
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
function headSprite(id: string, q: Pose) {
  const hs = new Pixels(HS.w, HS.h);
  paintSkull(hs, q.away);
  const { beard } = paintHair(hs, id, q.away);
  if (!q.away) features(hs, q, !!beard);
  return hs;
}
/** Head space → canvas transform for the pose's head turn. */
function headXY(q: Pose, x: number, y: number): P {
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
const upright = (q: Pose) => q.mode !== 'bow' && q.mode !== 'prostrate';
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
const farFront = (q: Pose) =>
  FAR_FRONT.has(q.action) && !(q.action === 'pray' && !upright(q));
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
    side(0, 5.5 + w, q.hip),
    side(0, 4.9 + w, waist),
    side(0, 6 + w, q.chest),
    side(3, 6.4 + w, q.chest),
    side(4.3, 4.2 + w * 0.5, q.chest),
    side(4.9, o.neck ?? 2.3, q.chest),
  ] as [P, P][];
  const m = mk(p).poly([...rows.map((r) => r[0]), ...rows.reverse().map((r) => r[1])]);
  for (const arm of q.arms) m.disc(arm[0][0], arm[0][1], 2.3 + w * 0.5);
  return m;
}
function armMask(p: Pixels, q: Pose, i: number, o: { r?: number; to?: number } = {}) {
  const [s, e, h] = q.arms[i],
    r = o.r ?? 0,
    wrist = lerp(e, h, o.to ?? 0.8);
  return mk(p)
    .capsule(s, e, 2.2 + r, 1.9 + r)
    .capsule(e, wrist, 1.9 + r, 1.5 + r);
}
function legMask(p: Pixels, q: Pose, i: number, o: { r?: number; to?: number } = {}) {
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
    t: P = n[0] > 0.3 || (Math.abs(n[0]) <= 0.3 && n[1] < 0) ? n : [-n[0], -n[1]],
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
  const foot = mk(p).rect(x - 5, AY - 2, 11, 1).rect(x - 5, AY - 1, 2, 1).rect(x + 4, AY - 1, 2, 1);
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
    const fore = mk(p).capsule(q.arms[fi][1], lerp(q.arms[fi][1], q.arms[fi][2], 0.8), 1.9, 1.5);
    shade(p, fore, U, { r: 2 });
    contour(p, fore);
    drawHand(p, q, fi);
  }
  const na = armMask(p, q, ni);
  shade(p, na, U, { r: 2 });
  contour(p, na);
  drawHand(p, q, ni);
  placeHead(p, q, headSprite(id, q));
}

/* STUBS */
function drawGarment(p: Pixels, id: string, q: Pose) {
  void id;
  const t = torsoMask(p, q);
  shade(p, t, K.cloth, { r: 3 });
  clearHead(p, q);
}
function drawHeadwear(p: Pixels, id: string, q: Pose) {
  void p;
  void id;
  void q;
}
function drawProp(p: Pixels, id: string, q: Pose) {
  void p;
  void id;
  void q;
}
/* ───────────── animals ───────────── */
function drawCat(p: Pixels, action: Action, face: string, f: number) {
  const C = K.cloth,
    away = face === 'NE';
  if (action === 'cat_sleep') {
    const breathe = f >= 2 ? 1 : 0;
    const body = mk(p).ellipse(16, 18 - breathe * 0.5, 9, 4 + breathe * 0.5);
    paint(p, body, C, { light: 2, dark: 2 });
    const head = mk(p).ellipse(22, 17.5, 5, 4);
    paint(p, head, C);
    // Sleeping: closed eyes.
    p.rect(20, 18, 2, 1, F.ink);
    p.rect(24, 18, 2, 1, F.ink);
    p.poly(
      [
        [18, 15],
        [19, 10.5],
        [22, 14],
      ],
      C[2],
    );
    p.poly(
      [
        [23, 14],
        [25.5, 10.5],
        [26.5, 15],
      ],
      C[2],
    );
    const tail = mk(p).capsule([8, 19], [14, 21], 1.3);
    paint(p, tail, C, { dark: 1 });
    for (let i = 0; i < 4; i++) p.rect(11 + i * 3, 15, 1, 3, C[2]);
    return;
  }
  const walking = action === 'cat_walk',
    bob = walking ? f % 2 : 0,
    hy = away ? 8 : 10;
  const body = mk(p).ellipse(15, 14 + bob, 7.5, 3.8);
  paint(p, body, C, { light: 2, dark: 2 });
  for (let i = 0; i < 4; i++) p.rect(11 + i * 2.5, 11 + bob, 1, 3, C[2]);
  const legs = walking
    ? [0, 2, -2, 0, 2, -2].map((v, i) => v * (i < 3 ? 1 : -1))
    : [0, 0, 0, 0, 0, 0];
  for (const [i, x] of [9, 12, 18, 21].entries()) {
    const d = walking ? legs[(f + i) % 6] * 0.5 : 0;
    paint(p, mk(p).rect(x + d, 16 + bob, 2, 5 - bob), C, { light: 0, dark: 1 });
  }
  const head = mk(p).ellipse(23, hy + 1.5 + bob, 5, 4.5);
  paint(p, head, C);
  if (!away) {
    // Big round eyes with a highlight, and a tiny nose.
    for (const ex of [21, 25]) {
      p.rect(ex, hy + bob, 2, 2, F.ink);
      p.pixel(ex, hy + bob, '#FBFAF4');
    }
    p.pixel(24, hy + 3 + bob, '#D07A8D');
  }
  p.poly(
    [
      [19.5, hy - 1 + bob],
      [20.5, hy - 5 + bob],
      [23, hy - 1 + bob],
    ],
    C[1],
  );
  p.poly(
    [
      [23.5, hy - 1 + bob],
      [26, hy - 5 + bob],
      [27, hy + bob],
    ],
    C[2],
  );

  const sway = action === 'cat_idle' ? [0, 1, 2, 1][f] : f % 2;
  const tail = mk(p).capsule([8, 13 + bob], [4 - sway * 0.5, 6 + sway], 1.2);
  paint(p, tail, C, { dark: 1 });
}
function drawBird(p: Pixels, action: Action, face: string, f: number) {
  const C = K.cloth,
    R = K.prop;
  const flying = action === 'bird_fly',
    peck = action === 'bird_peck' && f === 3;
  const by = flying ? 9 : 13;
  const body = mk(p).ellipse(9, by, 4.5, 3);
  paint(p, body, C, { dark: 1 });
  p.poly(
    [
      [4, by],
      [1, by - 2 + (flying ? 0 : 1)],
      [2, by + 2],
    ],
    C[2],
  );
  const hx = peck ? 14 : 13,
    hy = peck ? by + 2 : by - 3;
  paint(p, mk(p).disc(hx, hy, 2.8), C, { light: 0, dark: 1 });
  p.rect(hx + 2, hy, 3, 2, R[0]);
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
        [2, by - 2 - up],
        [9, by],
      ],
      C[0],
    );
    p.poly(
      [
        [9, by - 1],
        [13, by - 3 - up],
        [12, by + 1],
      ],
      C[2],
    );
  } else {
    p.poly(
      [
        [6, by - 1],
        [12, by - 1],
        [9, by + 1],
      ],
      C[2],
    );
    p.rect(8, by + 3, 1, 3, R[1]);
    p.rect(11, by + 3, 1, 3, R[1]);
  }
}

function drawBall(p: Pixels, action: Action, f: number) {
  const m = mk(p).disc(6, 8, 3.3);
  paint(p, m, [F.white, F.cream, F.steel[1]], { dark: 1 });
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
  if (category === 'props' && action !== 'pray') drawProp(p, id, q);
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
              : Object.keys(ACTIONS).filter(
                  (a) =>
                    !a.startsWith('cat_') &&
                    !a.startsWith('bird_') &&
                    !a.startsWith('ball_'),
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
