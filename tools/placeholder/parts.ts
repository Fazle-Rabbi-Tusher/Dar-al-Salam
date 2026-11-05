import fs from 'node:fs/promises';
import { Pixels, blit } from '../../packages/shared/pixels';
import { ACTIONS, type Action } from '../../packages/shared/schema';
import { canvasFor } from '../../packages/shared/canvas';
import { png, writeJson } from '../build/io';
import type { Aseprite } from '../../packages/shared/compositor';

/*
 * Procedural placeholder paper-doll parts on a 48×72 canvas (foot anchor 24,68).
 * Chibi style: a big 22×20 head on a short body, ~49 px tall in all. Every part
 * is drawn from one shared pose skeleton so any garment, headwear and prop fits
 * any adult base; children are scaled by the compositor. Only reserved key
 * colours and fixed palette colours are used. Faces are stylised cartoon faces
 * (eyes with a highlight, brows, mouth) whose expression follows the action.
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
type Pose = {
  /** Original (pre-chibi) head top-left; only used to find the neck direction. */
  head: P;
  /** Chibi head centre and the top-left of its 22×20 box. */
  headC: P;
  box: P;
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
const mk = (p: Pixels) => new Mask(p.width, p.height);
const lerp = (a: P, b: P, t: number): P => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
const add = (a: P, dx: number, dy: number): P => [a[0] + dx, a[1] + dy];

/* ───────────── chibi skeleton ───────────── */
const AX = 24,
  AY = 68,
  SX = 0.9,
  SY = 0.7,
  HEAD_RX = 11,
  HEAD_RY = 10;
/** Squash a full-size skeleton point toward the foot anchor. */
const T = (p: P): P => [AX + (p[0] - AX) * SX, AY - (AY - p[1]) * SY];
/** Squash an authoring y coordinate the same way. */
const Y = (y: number) => AY - (AY - y) * SY;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/**
 * Body points move toward the anchor; raised hands are lifted extra so they
 * clear the big head; the head sits on the neck direction above the chest.
 */
function chibify(q0: Pose): Pose {
  const arms = q0.arms.map((arm) => {
    const s0 = arm[0],
      s1 = T(s0);
    const map = (pt: P): P => {
      if (pt[1] >= s0[1]) return T(pt);
      const w = clamp((s0[1] - pt[1]) / 8, 0, 1);
      return [
        s1[0] + (pt[0] - s0[0]) * SX * (1 + w),
        s1[1] - (s0[1] - pt[1]) * SY * (1 + 1.3 * w),
      ];
    };
    return [s1, map(arm[1]), map(arm[2])] as Limb;
  }) as [Limb, Limb];
  const q: Pose = {
    ...q0,
    chest: T(q0.chest),
    hip: T(q0.hip),
    arms,
    legs: q0.legs.map((l) => l.map(T)) as [Limb, Limb],
  };
  const h0: P = [q0.head[0] + 5, q0.head[1] + 5.5],
    h1 = T(h0);
  let dx = h1[0] - q.chest[0],
    dy = h1[1] - q.chest[1];
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const reach = 1 / Math.hypot(dx / HEAD_RX, dy / HEAD_RY);
  const hc: P = [
    q.chest[0] + dx * (3.2 + reach),
    q.chest[1] + dy * (3.2 + reach),
  ];
  if (q.mode === 'prostrate') {
    // Forehead on the floor.
    const fy = q.away ? -0.5 : 0.12;
    hc[0] = h1[0] - 2;
    hc[1] = Y(66 + (h0[0] - 24) * fy) - HEAD_RY + 1;
  }
  hc[0] = clamp(hc[0], HEAD_RX + 1, 47 - HEAD_RX);
  hc[1] = clamp(hc[1], HEAD_RY + 1, 57.5);
  q.headC = hc;
  q.box = [Math.round(hc[0] - HEAD_RX), Math.round(hc[1] - HEAD_RY)];
  return q;
}
/** One skeleton for every part, so all layers line up frame by frame. */
function pose(action: Action, facing: 'SE' | 'NE', f: number): Pose {
  return chibify(rawPose(action, facing, f));
}
/** Full-size pose authoring; chibify() turns it into the chibi skeleton. */
function rawPose(action: Action, facing: 'SE' | 'NE', f: number): Pose {
  const away = facing === 'NE',
    fy = away ? -0.5 : 0.5,
    hx = away ? 0 : 1;
  const standing = (b: number): Pose => ({
    head: [19 + hx, 14 + b],
    headC: [0, 0],
    box: [0, 0],
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

/* ───────────── faces ───────────── */
type Eyes = 'open' | 'happy' | 'down' | 'closed' | 'blink' | 'determined';
type Mouth = 'smile' | 'open' | 'flat' | 'shout' | 'o' | 'calm';
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
        mouth: f % 2 ? 'open' : 'smile',
      };
    case 'cheer':
    case 'celebrate':
      return { eyes: 'happy', mouth: f % 2 ? 'smile' : 'open' };
    case 'arms-out':
    case 'hand-on-heart':
      return { eyes: 'happy', mouth: f >= 2 ? 'open' : 'smile' };
    case 'belt-pose':
      return {
        eyes: f === 3 ? 'happy' : 'open',
        mouth: f >= 2 ? 'open' : 'smile',
      };
    case 'read':
      return { eyes: 'down', mouth: f === 3 ? 'o' : 'smile' };
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
      return { eyes: 'open', mouth: f % 2 ? 'open' : 'smile', brows: 'raised' };
    default:
      return { eyes: 'open', mouth: 'smile' };
  }
}
const FACE = {
  eye: '#3B322E',
  shine: '#FBFAF4',
  mouth: '#A65D4F',
  inner: '#704C36',
  tongue: '#D07A8D',
  blush: '#EBAAB6',
};
/**
 * Cartoon face on the SE (3/4 right) side of a head box at (x0, y0): two big
 * eyes with a white highlight, brows, a mouth and a touch of blush.
 */
function features(p: Pixels, q: Pose, x0: number, y0: number, beard = false) {
  const { eyes, mouth, brows } = expression(q.action, q.frame),
    fc = x0 + 13,
    ey = y0 + 10,
    brow = K.hair[2];
  for (const [i, ex] of [fc - 5, fc + 2].entries()) {
    const inner = i === 0 ? 1 : -1;
    switch (eyes) {
      case 'open':
        p.rect(ex, ey, 3, 4, FACE.eye);
        p.pixel(ex, ey, FACE.shine);
        p.pixel(ex + 2, ey + 3, FACE.shine);
        break;
      case 'determined':
        p.rect(ex, ey + 1, 3, 3, FACE.eye);
        p.pixel(i ? ex + 2 : ex, ey + 1, FACE.shine);
        break;
      case 'happy':
        p.pixel(ex, ey + 2, FACE.eye);
        p.pixel(ex + 1, ey + 1, FACE.eye);
        p.pixel(ex + 2, ey + 2, FACE.eye);
        break;
      case 'closed':
        p.pixel(ex, ey + 2, FACE.eye);
        p.pixel(ex + 1, ey + 3, FACE.eye);
        p.pixel(ex + 2, ey + 2, FACE.eye);
        break;
      case 'blink':
        p.rect(ex, ey + 2, 3, 1, FACE.eye);
        break;
      case 'down':
        p.rect(ex, ey + 2, 3, 2, FACE.eye);
        p.rect(ex, ey + 1, 3, 1, K.skin[2]);
        break;
    }
    // Brows: angled down toward the nose when determined.
    if (eyes === 'determined') {
      p.pixel(ex + (inner > 0 ? 0 : 2), ey - 2, brow);
      p.pixel(ex + 1, ey - 1, brow);
      p.pixel(ex + (inner > 0 ? 2 : 0), ey, brow);
    } else if (brows === 'raised') {
      // Lively, arched brows lifted off the eyes.
      p.rect(ex, ey - 3, 3, 1, brow);
      p.pixel(ex + 1, ey - 4, brow);
    } else p.rect(ex, ey - 2, 3, 1, brow);
  }
  if (eyes !== 'determined') {
    p.rect(fc - 7, ey + 5, 2, 1, FACE.blush);
    p.rect(fc + 5, ey + 5, 2, 1, FACE.blush);
  }
  const mx = fc - 1,
    my = y0 + 16;
  if (beard) {
    // Keep the mouth readable through the beard.
    p.rect(mx - 2, my - 1, 7, 3, K.skin[1]);
  }
  switch (mouth) {
    case 'smile':
      p.pixel(mx - 1, my, FACE.mouth);
      p.rect(mx, my + 1, 2, 1, FACE.mouth);
      p.pixel(mx + 2, my, FACE.mouth);
      break;
    case 'open':
      p.rect(mx - 1, my, 4, 2, FACE.inner);
      p.rect(mx, my + 1, 2, 1, FACE.tongue);
      break;
    case 'shout':
      p.rect(mx - 1, my - 1, 4, 3, FACE.inner);
      p.rect(mx, my + 1, 2, 1, FACE.tongue);
      break;
    case 'o':
      p.rect(mx, my, 2, 2, FACE.inner);
      break;
    case 'flat':
      p.rect(mx - 1, my + 1, 4, 1, FACE.mouth);
      break;
    case 'calm':
      p.rect(mx, my + 1, 2, 1, FACE.mouth);
      break;
  }
}
/* ───────────── bases ───────────── */
function headMask(p: Pixels, q: Pose) {
  const [x0, y0] = q.box;
  return mk(p)
    .ellipse(x0 + 11, y0 + 10, 11, 10)
    .rect(x0 + 1, y0 + 3, 20, 13);
}
/** Clear body-layer pixels that would cover the head (arms are drawn after). */
function clearHead(p: Pixels, q: Pose) {
  const m = headMask(p, q),
    [x0, y0] = q.box;
  m.rect(x0 + 3, y0 + 18, 16, 4);
  for (let i = 0; i < m.data.length; i++) if (m.data[i]) p.data[i * 4 + 3] = 0;
}
function drawHead(p: Pixels, q: Pose, id: string) {
  const [x0, y0] = q.box,
    head = headMask(p, q);
  paint(p, head, K.skin, { light: 0, dark: 1, top: false });
  const inHead = (m: Mask) => {
    for (let i = 0; i < m.data.length; i++) if (!head.data[i]) m.data[i] = 0;
    return m;
  };
  const top = (rows: number) =>
    inHead(mk(p).rect(x0 - 2, y0 - 2, 26, rows + 2));
  let hair = mk(p);
  const beard = mk(p);
  if (q.away) {
    // Back of the head: hair over most of it, a strip of nape below.
    switch (id) {
      case 'adult-man-shaved':
      case 'adult-man-shaved-beard':
        hair = top(4);
        break;
      case 'adult-man-short':
        hair = top(12);
        break;
      case 'adult-man-swept-beard':
        hair = top(16).ellipse(x0 + 11, y0 + 1, 10, 4);
        break;
      case 'adult-woman-loose':
        // Thick loose hair falling past the shoulders.
        hair = top(22).rect(x0 - 1, y0 + 12, 24, 12).ellipse(x0 + 11, y0 + 2, 12, 5);
        break;
      case 'adult-man-goatee':
        hair.ellipse(x0 + 11, y0 + 1, 8, 4);
        p.rect(x0 + 6, y0 - 1, 9, 1, F.gold);
        break;
      case 'elder':
        hair = inHead(mk(p).rect(x0 - 1, y0 + 5, 24, 11));
        hair.rect(x0 + 5, y0 + 1, 12, 2);
        break;
      case 'adult-man-curly':
        hair.ellipse(x0 + 11, y0 + 7, 14.5, 11);
        break;
      default:
        hair = top(id === 'child' ? 14 : 16);
    }
    if (id === 'adult-woman')
      hair = top(20)
        .disc(x0 + 11, y0 + 1, 5)
        .rect(x0 + 2, y0 + 14, 18, 6);
  } else {
    // 3/4 view toward the right: hair at the top and back (left), face right.
    switch (id) {
      case 'adult-woman':
        hair = top(6)
          .rect(x0, y0 + 3, 5, 15)
          .rect(x0 + 19, y0 + 4, 3, 9)
          .disc(x0 + 2, y0 + 2.5, 4)
          .poly([
            [x0 + 4, y0 + 5],
            [x0 + 16, y0 + 5],
            [x0 + 8, y0 + 8.5],
          ]);
        break;
      case 'child':
        hair = top(8)
          .rect(x0, y0 + 3, 5, 10)
          .rect(x0 + 19, y0 + 4, 3, 7);
        break;
      case 'elder':
        hair = inHead(mk(p).rect(x0, y0 + 4, 5, 10))
          .rect(x0 + 19, y0 + 5, 3, 5)
          .rect(x0 + 4, y0, 13, 2);
        beard
          .rect(x0 + 5, y0 + 15, 17, 5)
          .rect(x0 + 7, y0 + 19, 13, 3)
          .rect(x0 + 10, y0 + 22, 7, 2)
          .rect(x0 + 19, y0 + 10, 3, 6);
        break;
      case 'adult-man-beard':
        hair = top(5).rect(x0, y0 + 3, 5, 9);
        beard
          .rect(x0 + 4, y0 + 15, 18, 5)
          .rect(x0 + 7, y0 + 19, 13, 3)
          .rect(x0 + 19, y0 + 9, 3, 7)
          .rect(x0 + 4, y0 + 8, 3, 8);
        break;
      case 'adult-man-clean':
        hair = top(6)
          .rect(x0, y0 + 3, 5, 10)
          .ellipse(x0 + 14, y0 + 1, 8, 3.6);
        break;
      case 'adult-man-curly':
        hair.ellipse(x0 + 9, y0 + 7, 15, 11.5);
        hair.minus(mk(p).ellipse(x0 + 14, y0 + 13, 8.5, 8));
        beard
          .rect(x0 + 5, y0 + 15, 17, 5)
          .rect(x0 + 8, y0 + 19, 12, 3)
          .rect(x0 + 19, y0 + 9, 3, 7);
        break;
      case 'adult-man-goatee':
        hair.ellipse(x0 + 12, y0 + 1, 8.5, 4);
        beard.rect(x0 + 10, y0 + 18, 5, 3).rect(x0 + 11, y0 + 21, 3, 1);
        break;
      case 'adult-man-shaved':
        hair = top(3).rect(x0, y0 + 3, 4, 3);
        break;
      case 'adult-man-shaved-beard':
        // Close-shaved head with a full, thick beard.
        hair = top(3).rect(x0, y0 + 3, 4, 3);
        beard
          .rect(x0 + 4, y0 + 14, 18, 6)
          .rect(x0 + 7, y0 + 19, 13, 3)
          .rect(x0 + 19, y0 + 8, 3, 8)
          .rect(x0 + 4, y0 + 8, 3, 8);
        break;
      case 'adult-man-short':
        // Close-cropped hair, clean-shaven.
        hair = top(5).rect(x0, y0 + 3, 4, 8).rect(x0 + 19, y0 + 4, 2, 4);
        break;
      case 'adult-man-swept-beard':
        // Thick dark hair swept up and back, with a full trimmed beard.
        hair = top(7)
          .rect(x0, y0 + 3, 5, 9)
          .ellipse(x0 + 13, y0 + 0.5, 10, 4.2);
        beard
          .rect(x0 + 4, y0 + 15, 18, 5)
          .rect(x0 + 7, y0 + 19, 13, 3)
          .rect(x0 + 19, y0 + 9, 3, 7)
          .rect(x0 + 4, y0 + 9, 3, 7);
        break;
      case 'adult-woman-loose':
        // Thick, voluminous hair worn loose to the shoulders; no bun.
        hair = top(6)
          .ellipse(x0 + 11, y0 + 1.5, 13, 5)
          .rect(x0 - 2, y0 + 2, 7, 22)
          .rect(x0 + 19, y0 + 3, 4, 16)
          .poly([
            [x0 + 4, y0 + 5],
            [x0 + 17, y0 + 5],
            [x0 + 7, y0 + 9],
          ]);
        break;
      default:
        // adult-man: short neat hair and a short beard.
        hair = top(6)
          .rect(x0, y0 + 3, 5, 11)
          .rect(x0 + 12, y0 + 5, 4, 1);
        beard
          .rect(x0 + 5, y0 + 17, 17, 3)
          .rect(x0 + 8, y0 + 19, 11, 2)
          .rect(x0 + 19, y0 + 11, 3, 6)
          .rect(x0 + 5, y0 + 11, 2, 6);
    }
    if (beard.data.some(Boolean)) {
      inHead(beard);
      if (
        id === 'elder' ||
        id === 'adult-man-beard' ||
        id === 'adult-man-curly' ||
        id === 'adult-man-shaved-beard' ||
        id === 'adult-man-swept-beard'
      )
        beard.rect(x0 + 8, y0 + 19, 11, id === 'elder' ? 5 : 3);
      if (id === 'adult-man-goatee')
        beard.rect(x0 + 10, y0 + 18, 5, 3).rect(x0 + 11, y0 + 21, 3, 1);
    }
    // Ear peeking out under short hair.
    if (!['adult-woman', 'adult-woman-loose', 'adult-man-curly'].includes(id))
      p.rect(x0 + 5, y0 + 10, 2, 3, K.skin[2]);
  }
  paint(p, hair, K.hair, { light: 1, dark: 1 });
  paint(p, beard, K.hair, { light: 0, dark: 1, top: false });
  if (id === 'adult-man-curly')
    for (let j = 0; j < p.height; j++)
      for (let i = 0; i < p.width; i++)
        if (hair.has(i, j) && (i * 3 + j * 5) % 7 === 0)
          p.pixel(i, j, K.hair[0]);
  if (id === 'adult-man-goatee' && !q.away)
    p.rect(x0 + 7, y0 - 2, 10, 1, F.gold);
  if (!q.away) features(p, q, x0, y0, beard.data.some(Boolean));
}
function chairUnder(p: Pixels, q: Pose) {
  // A simple stool under chair-seated poses, so desk workers never float.
  const [x, y] = q.hip;
  p.rect(x - 1, y + 4, 2, 64 - y - 4, F.steel[2]);
  p.rect(x - 5, 64, 10, 1, F.steel[2]);
  p.rect(x - 5, 65, 2, 1, F.ink);
  p.rect(x + 3, 65, 2, 1, F.ink);
  paint(p, mk(p).ellipse(x + 1, y + 3, 7, 2.2), F.steel, { dark: 2 });
}
function drawBase(p: Pixels, id: string, q: Pose) {
  if (q.mode === 'chair') chairUnder(p, q);
  const under = mk(p);
  under.capsule(q.chest, q.hip, 5.5);
  for (const leg of q.legs)
    under.capsule(leg[0], leg[1], 2.4).capsule(leg[1], leg[2], 2.2);
  paint(p, under, F.charcoal);
  for (const arm of q.arms) {
    const m = mk(p).capsule(arm[0], arm[1], 2.1).capsule(arm[1], arm[2], 1.9);
    paint(p, m, F.charcoal, { dark: 1 });
  }
  shoes(p, q);
  hands(p, q);
  drawHead(p, q, id);
}
function shoes(p: Pixels, q: Pose) {
  for (const leg of q.legs) {
    const [x, y] = leg[2];
    const m = mk(p);
    if (q.mode === 'prostrate' || q.mode === 'kneel' || q.mode === 'floor')
      m.ellipse(x, y, 2.6, 1.8);
    else m.ellipse(x + (q.away ? 0.5 : 1), y + 1, 3.6, 2.1);
    paint(p, m, [F.charcoal[1], F.ink, F.ink], { light: 1, dark: 1 });
  }
}
function hands(p: Pixels, q: Pose) {
  for (const arm of q.arms) {
    const m = mk(p).disc(arm[2][0], arm[2][1] + 0.5, 2.5);
    if (q.action === 'celebrate' && arm === q.arms[1])
      m.rect(arm[2][0] - 0.5, arm[2][1] - 5, 2, 4); // raised index finger
    if (q.action === 'speech' && arm === q.arms[1])
      m.capsule(arm[2], add(arm[2], 2.5, -3.5), 0.9); // pointing finger
    paint(p, m, K.skin, { dark: 1, light: 0, top: false });
  }
}

/* ───────────── garments ───────────── */
function torso(p: Pixels, q: Pose, ramp: string[], r = 5.6) {
  const m = mk(p).capsule(q.chest, q.hip, r);
  paint(p, m, ramp);
  return m;
}
function sleeves(
  p: Pixels,
  q: Pose,
  ramp: string[],
  o: { wide?: boolean; short?: string[] } = {},
) {
  clearHead(p, q);
  for (const arm of q.arms) {
    const m = mk(p).capsule(arm[0], arm[1], 2.4);
    if (!o.short) m.capsule(arm[1], arm[2], 2.1, o.wide ? 3.2 : 2.1);
    paint(p, m, ramp, { dark: 1 });
    if (o.short) {
      const f = mk(p).capsule(lerp(arm[1], arm[0], 0.1), arm[2], 1.9);
      paint(p, f, o.short, { dark: 1 });
    }
    // Cuff line.
    const c = lerp(arm[1], arm[2], 0.78);
    if (!o.short) p.pixel(c[0], c[1], ramp[2]);
  }
  hands(p, q);
}
function trousers(p: Pixels, q: Pose, ramp: string[]) {
  const m = mk(p);
  for (const leg of q.legs)
    m.capsule(leg[0], leg[1], 2.6).capsule(
      leg[1],
      lerp(leg[1], leg[2], 0.9),
      2.3,
    );
  if (q.mode === 'floor') m.ellipse(24, 63.5, 10, 3);
  paint(p, m, ramp);
  return m;
}
/** Long garment from the hips to the ankles, following any posture. */
function robe(
  p: Pixels,
  q: Pose,
  ramp: string[],
  o: { flare?: number; hem?: number } = {},
) {
  const flare = o.flare ?? 3,
    m = mk(p);
  const [l, r] = q.legs;
  if (q.mode === 'stand') {
    const hem = Y(o.hem ?? 63),
      xs = [l[2][0], r[2][0]];
    m.poly([
      [q.hip[0] - 5.6, q.hip[1] - 2],
      [q.hip[0] + 5.6, q.hip[1] - 2],
      [Math.max(...xs) + 2.5 + flare * 0.5, hem],
      [Math.min(...xs) - 2.5 - flare * 0.5, hem],
    ]);
    m.rect(
      Math.min(...xs) - 2 - flare * 0.5,
      hem - 1,
      Math.abs(xs[1] - xs[0]) + 4 + flare,
      1,
    );
  } else if (q.mode === 'floor') {
    m.ellipse(24, 62.5, 11, 4).rect(q.hip[0] - 5.6, q.hip[1] - 4, 11.2, 6);
  } else {
    for (const leg of [l, r])
      m.capsule(leg[0], leg[1], 3.4).capsule(
        leg[1],
        lerp(leg[1], leg[2], 0.75),
        3.0,
      );
    m.poly([
      [q.hip[0] - 5, q.hip[1] - 3],
      [q.hip[0] + 5, q.hip[1] - 3],
      l[1],
      r[1],
    ]);
    if (q.mode === 'chair')
      m.poly([l[1], r[1], add(r[2], 2.5, -2), add(l[2], -2.5, -2)]);
  }
  paint(p, m, ramp, { light: 2, dark: 3 });
  // Vertical folds.
  if (q.mode === 'stand')
    for (const dx of [-2, 2]) {
      for (let y = q.hip[1] + 3; y < Y(o.hem ?? 63) - 1; y++)
        if (y % 4 !== 0)
          p.pixel(q.hip[0] + dx + (y - q.hip[1]) * dx * 0.06, y, ramp[2]);
    }
  return m;
}
function hemTrim(p: Pixels, m: Mask, ramp: string[], rows = 1) {
  for (let x = 0; x < m.width; x++) {
    let bottom = -1;
    for (let y = m.height - 1; y >= 0; y--)
      if (m.has(x, y)) {
        bottom = y;
        break;
      }
    if (bottom > 54)
      for (let k = 1; k <= rows; k++)
        p.pixel(x, bottom - k, ramp[(x + k) % 2 ? 1 : 0]);
  }
}
function belt(p: Pixels, q: Pose, c: string[], h = 2) {
  if (q.mode === 'bow' || q.mode === 'prostrate') return;
  const y = Math.round(q.hip[1] - 1);
  for (let x = Math.round(q.hip[0] - 5.5); x < q.hip[0] + 5.5; x++)
    for (let k = 0; k < h; k++) p.pixel(x, y + k, k ? c[2] : c[1]);
}
function frontLine(
  p: Pixels,
  q: Pose,
  c: string,
  from: number,
  to: number,
  dx = 0,
) {
  if (q.away || q.mode === 'bow' || q.mode === 'prostrate') return;
  for (let y = from; y < to; y++) p.pixel(q.chest[0] + 1 + dx, y, c);
}
function drawGarment(p: Pixels, id: string, q: Pose) {
  const C = K.cloth,
    S = K.sash,
    top = Math.round(q.chest[1] - 4),
    upright = q.mode !== 'bow' && q.mode !== 'prostrate';
  const neck = (c: string) => {
    if (!q.away && upright) {
      p.rect(q.chest[0] - 1, top, 4, 1, c);
      p.pixel(q.chest[0], top + 1, c);
      p.pixel(q.chest[0] + 1, top + 1, c);
    }
  };
  switch (id) {
    case 'thobe': {
      robe(p, q, C, { flare: 2 });
      torso(p, q, C);
      neck(C[2]);
      frontLine(p, q, C[2], top + 2, top + 10);
      if (!q.away && upright)
        for (let y = top + 3; y < top + 10; y += 3)
          p.pixel(q.chest[0] + 2, y, C[0]);
      sleeves(p, q, C);
      break;
    }
    case 'jubba': {
      robe(p, q, S, { flare: 2 });
      torso(p, q, S);
      const coat = robe(p, q, C, { flare: 3, hem: 62 });
      void coat;
      const t = torso(p, q, C);
      void t;
      if (!q.away && upright) {
        p.rect(q.chest[0] - 1, top, 4, 12, S[1]);
        p.rect(q.chest[0] + 2, top, 1, 12, C[2]);
        if (q.mode === 'stand') p.rect(q.chest[0] - 1, q.hip[1], 4, 14, S[1]);
      }
      sleeves(p, q, C);
      break;
    }
    case 'qaba': {
      robe(p, q, C, { flare: 2 });
      torso(p, q, C);
      if (!q.away && upright)
        for (let k = 0; k < 9; k++)
          p.pixel(q.chest[0] - 3 + k * 0.7, top + 1 + k, C[2]);
      belt(p, q, S, 3);
      if (q.mode === 'stand' && !q.away)
        p.rect(q.hip[0] + 2, q.hip[1] + 1, 2, 7, S[2]);
      sleeves(p, q, C);
      break;
    }
    case 'kaftan': {
      const r = robe(p, q, C, { flare: 3 });
      hemTrim(p, r, S, 2);
      torso(p, q, C);
      if (!q.away && upright) {
        for (let k = 0; k < 6; k++) {
          p.pixel(q.chest[0] - 2 + k * 0.5, top + k, S[0]);
          p.pixel(q.chest[0] + 3 - k * 0.5, top + k, S[0]);
        }
        frontLine(p, q, S[1], top + 6, top + 16);
      }
      sleeves(p, q, C);
      for (const arm of q.arms) {
        const c = lerp(arm[1], arm[2], 0.72);
        p.rect(c[0] - 2, c[1], 4, 1, S[0]);
      }
      break;
    }
    case 'abaya': {
      const r = robe(p, q, C, { flare: 5, hem: 64 });
      torso(p, q, C, 6);
      sleeves(p, q, C, { wide: true });
      if (!q.away && upright)
        frontLine(p, q, S[1], top + 1, q.mode === 'stand' ? Y(63) : top + 11);
      for (const arm of q.arms) {
        const c = lerp(arm[1], arm[2], 0.75);
        p.rect(c[0] - 2.5, c[1], 5, 1, S[1]);
      }
      hemTrim(p, r, S, 1);
      break;
    }
    case 'panjabi-lungi': {
      const lungi = robe(p, q, S, { flare: 1 });
      for (let y = 0; y < p.height; y++)
        for (let x = 0; x < p.width; x++)
          if (lungi.has(x, y) && (x % 4 === 0 || y % 4 === 0))
            p.pixel(x, y, S[2]);
      torso(p, q, C);
      if (q.mode === 'stand') {
        const m = mk(p).poly([
          [q.hip[0] - 5.6, q.hip[1] - 2],
          [q.hip[0] + 5.6, q.hip[1] - 2],
          [q.hip[0] + 7, Y(54)],
          [q.hip[0] - 7, Y(54)],
        ]);
        paint(p, m, C, { light: 2, dark: 2 });
      }
      neck(C[2]);
      frontLine(p, q, C[2], top + 2, top + 9);
      sleeves(p, q, C);
      break;
    }
    case 'boubou': {
      robe(p, q, C, { flare: 6, hem: 64 });
      const cape = mk(p).capsule(q.chest, q.hip, 7.5);
      for (const arm of q.arms) cape.capsule(arm[0], arm[2], 3.6);
      paint(p, cape, C, { light: 2, dark: 2 });
      clearHead(p, q);
      if (!q.away && upright) {
        p.rect(q.chest[0] - 2, top + 3, 6, 6, S[1]);
        p.rect(q.chest[0] - 1, top + 4, 4, 4, S[0]);
        p.rect(q.chest[0], top + 5, 2, 2, S[2]);
      }
      hands(p, q);
      break;
    }
    case 'baju-kurung': {
      const skirt = robe(p, q, S, { flare: 3 });
      for (let x = 0; x < p.width; x++)
        for (let y = Math.round(Y(56)); y < p.height; y++)
          if (skirt.has(x, y) && y % 4 === 0) p.pixel(x, y, S[0]);
      torso(p, q, C);
      if (q.mode === 'stand') {
        const m = mk(p).poly([
          [q.hip[0] - 5.6, q.hip[1] - 2],
          [q.hip[0] + 5.6, q.hip[1] - 2],
          [q.hip[0] + 7.5, Y(56)],
          [q.hip[0] - 7.5, Y(56)],
        ]);
        paint(p, m, C, { light: 2, dark: 2 });
      }
      neck(C[2]);
      sleeves(p, q, C);
      break;
    }
    case 'hui-robe': {
      robe(p, q, C, { flare: 2 });
      torso(p, q, C);
      if (!q.away && upright) {
        for (let k = 0; k < 7; k++)
          p.pixel(q.chest[0] - 1 + k, top + 1 + k * 0.5, C[2]);
        for (let y = top + 4; y < top + 21; y += 3)
          p.rect(q.chest[0] + 4, y, 2, 1, S[1]);
      }
      sleeves(p, q, C);
      break;
    }
    case 'scholar-robe': {
      robe(p, q, C, { flare: 2 });
      torso(p, q, C);
      const cloak = mk(p);
      for (const arm of q.arms)
        cloak.capsule(arm[0], lerp(arm[0], arm[1], 0.8), 3.4);
      if (upright) {
        cloak.rect(q.chest[0] - 7, top, 3, 16).rect(q.chest[0] + 4, top, 3, 16);
        if (q.mode === 'stand')
          cloak.poly([
            [q.chest[0] - 7.5, top + 14],
            [q.chest[0] - 4, top + 14],
            [q.chest[0] - 5, Y(61)],
            [q.chest[0] - 10, Y(61)],
          ]);
      }
      paint(p, cloak, S, { dark: 2 });
      sleeves(p, q, C, { wide: true });
      break;
    }
    case 'apron': {
      trousers(p, q, F.charcoal);
      torso(p, q, C);
      sleeves(p, q, C);
      if (!q.away && upright) {
        const m = mk(p).rect(q.chest[0] - 4, top + 3, 9, 7);
        if (q.mode === 'stand')
          m.poly([
            [q.hip[0] - 5, q.hip[1] - 2],
            [q.hip[0] + 6, q.hip[1] - 2],
            [q.hip[0] + 6.5, Y(58)],
            [q.hip[0] - 5.5, Y(58)],
          ]);
        paint(p, m, S, { light: 1, dark: 1 });
        p.rect(q.chest[0] - 1, q.hip[1] + 3, 4, 3, S[2]);
        p.pixel(q.chest[0] - 4, top + 2, S[2]);
        p.pixel(q.chest[0] + 4, top + 2, S[2]);
      }
      if (q.away) belt(p, q, S, 1);
      break;
    }
    case 'shirt-trousers': {
      trousers(p, q, S);
      torso(p, q, C);
      belt(p, q, F.charcoal);
      neck(C[0]);
      if (!q.away && upright) {
        p.pixel(q.chest[0] - 2, top, C[0]);
        p.pixel(q.chest[0] + 3, top, C[0]);
        for (let y = top + 3; y < q.hip[1] - 1; y += 3)
          p.pixel(q.chest[0] + 1, y, C[2]);
        p.rect(q.chest[0] - 4, top + 4, 3, 1, C[2]);
      }
      sleeves(p, q, C);
      break;
    }
    case 'suit': {
      trousers(p, q, C);
      const jacket = mk(p).capsule(q.chest, add(q.hip, 0, 2), 5.8);
      paint(p, jacket, C);
      if (!q.away && upright) {
        p.poly(
          [
            [q.chest[0] - 1.5, top - 0.5],
            [q.chest[0] + 3.5, top - 0.5],
            [q.chest[0] + 1, top + 9],
          ],
          F.white,
        );
        p.rect(q.chest[0], top + 1, 2, 7, S[1]);
        p.pixel(q.chest[0], top + 1, S[0]);
        for (let k = 0; k < 9; k++) {
          p.pixel(q.chest[0] - 2 + k * 0.3, top + k, C[2]);
          p.pixel(q.chest[0] + 4 - k * 0.3, top + k, C[2]);
        }
        p.pixel(q.chest[0] + 1, top + 11, C[2]);
        p.pixel(q.chest[0] + 1, top + 14, C[2]);
        p.rect(q.chest[0] - 4, top + 3, 2, 1, F.white);
      }
      sleeves(p, q, C);
      break;
    }
    case 'blazer-open': {
      // Smart-casual: dark blazer over a white open-collar shirt, no tie.
      trousers(p, q, S);
      const jacket = mk(p).capsule(q.chest, add(q.hip, 0, 2), 5.8);
      paint(p, jacket, C);
      if (!q.away && upright) {
        p.poly(
          [
            [q.chest[0] - 2, top - 0.5],
            [q.chest[0] + 4, top - 0.5],
            [q.chest[0] + 1, top + 8],
          ],
          F.white,
        );
        // Open collar points and a hint of the neck.
        p.pixel(q.chest[0] - 2, top + 1, F.white);
        p.pixel(q.chest[0] + 4, top + 1, F.white);
        p.rect(q.chest[0], top, 2, 2, K.skin[1]);
        p.pixel(q.chest[0], top + 2, K.skin[2]);
        for (let k = 0; k < 9; k++) {
          p.pixel(q.chest[0] - 3 + k * 0.35, top + k, C[2]);
          p.pixel(q.chest[0] + 5 - k * 0.35, top + k, C[2]);
        }
        p.pixel(q.chest[0] + 1, top + 10, C[2]);
        p.pixel(q.chest[0] + 1, top + 13, C[2]);
        // Pocket square.
        p.rect(q.chest[0] - 5, top + 4, 2, 1, F.white);
      }
      sleeves(p, q, C);
      break;
    }
    case 'lab-coat': {
      trousers(p, q, S);
      torso(p, q, S);
      if (q.mode === 'stand') {
        const coat = mk(p).poly([
          [q.hip[0] - 5.8, q.chest[1]],
          [q.hip[0] + 5.8, q.chest[1]],
          [q.hip[0] + 7.5, Y(57)],
          [q.hip[0] - 7.5, Y(57)],
        ]);
        paint(p, coat, C, { light: 2, dark: 2 });
      } else if (q.mode === 'chair') robe(p, q, C, { flare: 1 });
      const t = mk(p).capsule(q.chest, q.hip, 5.9);
      paint(p, t, C);
      if (!q.away && upright) {
        p.rect(q.chest[0] - 1, top, 4, q.mode === 'stand' ? 19 : 11, S[1]);
        p.rect(q.chest[0] - 1, top, 1, q.mode === 'stand' ? 19 : 11, S[0]);
        for (let k = 0; k < 5; k++) {
          p.pixel(q.chest[0] - 2 + k * 0.2, top + k, C[2]);
          p.pixel(q.chest[0] + 3 - k * 0.2, top + k, C[2]);
        }
        p.rect(q.chest[0] - 5, top + 5, 3, 1, C[2]);
        p.pixel(q.chest[0] - 4, top + 4, F.screen);
        if (q.mode === 'stand') {
          p.rect(q.chest[0] - 6, q.hip[1] + 3, 4, 1, C[2]);
          p.rect(q.chest[0] + 4, q.hip[1] + 3, 4, 1, C[2]);
        }
      }
      sleeves(p, q, C);
      break;
    }
    case 'scrubs': {
      trousers(p, q, C);
      torso(p, q, C);
      if (!q.away && upright) {
        for (let k = 0; k < 5; k++) {
          p.pixel(q.chest[0] - 2 + k * 0.5, top + k, S[1]);
          p.pixel(q.chest[0] + 3 - k * 0.5, top + k, S[1]);
        }
        p.rect(q.chest[0] - 1, top, 3, 3, S[1]);
        p.rect(q.chest[0] - 5, top + 6, 3, 3, C[2]);
        p.rect(q.chest[0] - 5, top + 6, 3, 1, C[0]);
      }
      sleeves(p, q, C, { short: S });
      break;
    }
    case 'hoodie-jeans': {
      const jeans = trousers(p, q, S);
      for (let y = 0; y < p.height; y++)
        for (let x = 0; x < p.width; x++)
          if (jeans.has(x, y) && (x + y) % 5 === 0 && y > 54)
            p.pixel(x, y, S[0]);
      torso(p, q, C, 6);
      if (upright) {
        const hood = mk(p).ellipse(
          q.chest[0] + (q.away ? 0 : -2),
          top - 1,
          5,
          2.4,
        );
        paint(p, hood, C, { dark: 1 });
      }
      if (!q.away && upright) {
        p.rect(q.chest[0] - 3, q.hip[1] - 5, 8, 4, C[2]);
        p.rect(q.chest[0] - 2, q.hip[1] - 5, 6, 1, C[1]);
        p.rect(q.chest[0], top + 1, 1, 4, F.white);
        p.rect(q.chest[0] + 2, top + 1, 1, 3, F.white);
        p.rect(q.hip[0] - 5, q.hip[1] - 1, 11, 1, C[2]);
      }
      sleeves(p, q, C);
      break;
    }
    case 'long-dress': {
      const r = robe(p, q, C, { flare: 4, hem: 64 });
      for (let y = 0; y < p.height; y++)
        for (let x = 0; x < p.width; x++)
          if (r.has(x, y) && y > 52 && (x + Math.floor(y / 3)) % 5 === 0)
            p.pixel(x, y, C[0]);
      torso(p, q, C, 5.8);
      belt(p, q, S, 2);
      neck(C[2]);
      sleeves(p, q, C);
      break;
    }
    case 'football-kit':
    case 'football-kit-captain':
    case 'football-kit-long':
    case 'football-kit-sleeved': {
      const long = id === 'football-kit-long',
        sleeved = id === 'football-kit-sleeved',
        shortsR = long ? S : C,
        socksR = long ? S : C;
      // Shorts to the knee and long socks: knees stay covered.
      const shorts = mk(p);
      for (const leg of q.legs)
        shorts.capsule(leg[0], lerp(leg[0], leg[1], 1.05), 3);
      if (q.mode === 'floor') shorts.ellipse(24, 63, 10, 3);
      paint(p, shorts, shortsR);
      if (q.mode !== 'floor')
        for (const leg of q.legs) {
          const socks = mk(p).capsule(
            lerp(leg[1], leg[2], 0.1),
            lerp(leg[1], leg[2], 0.92),
            2.3,
          );
          paint(p, socks, socksR, { dark: 1 });
          const band = lerp(leg[1], leg[2], 0.2);
          p.rect(band[0] - 2, band[1], 4, 1, long ? C[1] : S[1]);
        }
      torso(p, q, C, 5.9);
      if (upright) {
        if (!q.away) {
          // Polo collar with trim and a short placket.
          p.rect(q.chest[0] - 3, top - 1, 7, 2, C[0]);
          p.rect(q.chest[0] - 3, top + 1, 2, 1, S[1]);
          p.rect(q.chest[0] + 2, top + 1, 2, 1, S[1]);
          p.rect(q.chest[0], top, 1, 5, S[2]);
          p.pixel(q.chest[0] + 1, top + 3, C[2]);
        } else p.rect(q.chest[0] - 3, top - 1, 7, 2, S[1]);
        for (let y = Math.round(q.chest[1]); y < q.hip[1]; y += 4)
          p.pixel(q.chest[0] - 3 + ((y / 4) % 2), y, C[0]);
      }
      if (long) sleeves(p, q, S);
      else if (sleeved) {
        sleeves(p, q, C);
        for (const arm of q.arms) {
          const c = lerp(arm[1], arm[2], 0.7);
          p.rect(c[0] - 2, c[1], 4, 1, S[1]);
        }
      } else {
        sleeves(p, q, C, { short: K.skin });
        for (const arm of q.arms) {
          const c = lerp(arm[0], arm[1], 0.85);
          p.rect(c[0] - 2, c[1], 4, 1, S[1]);
        }
      }
      if (id === 'football-kit-captain') {
        const arm = q.arms[0],
          c = lerp(arm[0], arm[1], 0.45);
        p.rect(c[0] - 2.5, c[1] - 1, 5, 3, F.screen);
        p.rect(c[0] - 2.5, c[1], 5, 1, F.white);
      }
      break;
    }
    case 'fight-kit': {
      // Rash guard and knee-length fight shorts over grappling spats.
      const shorts = mk(p);
      for (const leg of q.legs)
        shorts.capsule(leg[0], lerp(leg[0], leg[1], 1.08), 3.1);
      if (q.mode === 'floor') shorts.ellipse(24, 63, 10, 3);
      paint(p, shorts, S);
      for (const leg of q.legs) {
        const c = lerp(leg[0], leg[1], 0.55);
        p.rect(c[0] - 2.5, c[1], 1, 4, C[1]);
      }
      torso(p, q, C, 5.9);
      if (upright && !q.away) {
        p.rect(q.chest[0] - 2, top, 5, 1, S[1]);
        for (let y = top + 3; y < q.hip[1] - 1; y += 3)
          p.pixel(q.chest[0] + 3, y, S[1]);
      }
      sleeves(p, q, C);
      break;
    }
    case 'boxing-kit': {
      // Sleeveless vest and knee-length trunks with a dark waistband.
      const trunks = mk(p);
      for (const leg of q.legs)
        trunks.capsule(leg[0], lerp(leg[0], leg[1], 1.05), 3.3);
      if (q.mode === 'floor') trunks.ellipse(24, 63, 10, 3);
      paint(p, trunks, S, { light: 2 });
      if (q.mode === 'stand')
        for (const [i, leg] of q.legs.entries()) {
          const c = lerp(leg[0], leg[1], 0.45);
          p.rect(c[0] + (i ? 2.5 : -3), c[1] - 2, 1, 5, F.ink);
        }
      torso(p, q, C, 5.7);
      belt(p, q, [F.ink, F.ink, F.outline], 3);
      clearHead(p, q);
      for (const arm of q.arms) {
        const m = mk(p).capsule(arm[0], arm[1], 2.3).capsule(arm[1], arm[2], 2);
        paint(p, m, K.skin, { dark: 1 });
      }
      hands(p, q);
      break;
    }
    case 'hi-vis': {
      trousers(p, q, S);
      torso(p, q, C, 6);
      sleeves(p, q, C);
      if (upright) {
        const y1 = Math.round(q.chest[1] + 3),
          y2 = Math.round(q.hip[1] - 2);
        for (const y of [y1, y2])
          p.rect(q.chest[0] - 5.5, y, 11, 2, F.steel[0]);
        for (const arm of q.arms) {
          const c = lerp(arm[1], arm[2], 0.4);
          p.rect(c[0] - 2, c[1], 4, 1, F.steel[0]);
        }
        if (!q.away) p.rect(q.chest[0], top, 1, y2 - top, C[2]);
      }
      break;
    }
    default:
      throw Error(`No placeholder art for garment ${id}`);
  }
}

/* ───────────── headwear ───────────── */
/** Re-paint the face inside a scarf opening (headwear covers the base head). */
function faceOpening(p: Pixels, q: Pose, opening: Mask) {
  const [x0, y0] = q.box;
  paint(p, opening, K.skin, { light: 0, dark: 1, top: false });
  features(p, q, x0, y0);
}
function drawHeadwear(p: Pixels, id: string, q: Pose) {
  const [x0, y0] = q.box,
    cx = x0 + 11,
    H = K.hat,
    upright = q.mode !== 'bow' && q.mode !== 'prostrate';
  /** A dome over the top of the head, cut off below row `bottom`. */
  const dome = (ry: number, bottom: number, rx = 12, dy = 0) => {
    const m = mk(p).ellipse(cx, y0 + bottom + dy, rx, ry);
    for (let j = y0 + bottom + 1; j < p.height; j++)
      for (let i = 0; i < p.width; i++) m.data[j * p.width + i] = 0;
    return m;
  };
  switch (id) {
    case 'kufi': {
      const m = dome(8, 6);
      paint(p, m, H, { dark: 2 });
      p.rect(x0, y0 + 5, 22, 2, H[2]);
      for (let i = 0; i < 6; i++) p.pixel(x0 + 2 + i * 3.5, y0 + 2, H[0]);
      break;
    }
    case 'taqiyah': {
      const m = dome(9.5, 6);
      paint(p, m, H, { dark: 2 });
      for (let j = y0 - 3; j < y0 + 6; j += 2)
        for (let i = x0; i < x0 + 22; i += 2)
          if (m.has(i + (j % 4 ? 1 : 0), j))
            p.pixel(i + (j % 4 ? 1 : 0), j, H[0]);
      p.rect(x0, y0 + 5, 22, 2, H[2]);
      break;
    }
    case 'hui-cap': {
      const m = mk(p)
        .rect(x0 - 1, y0 - 1, 24, 8)
        .rect(x0, y0 - 2, 22, 1);
      paint(p, m, H, { dark: 2 });
      p.rect(x0, y0 - 2, 22, 1, H[0]);
      break;
    }
    case 'songkok': {
      const m = mk(p).rect(x0, y0 - 5, 22, 12);
      paint(p, m, H, { dark: 2 });
      p.rect(x0 + 1, y0 - 5, 20, 1, H[0]);
      p.rect(x0, y0 + 5, 22, 1, H[2]);
      break;
    }
    case 'imamah': {
      // Turban: wide, rounded wraps with a tail at the back.
      const m = dome(9, 7, 13.5, -1);
      paint(p, m, H, { dark: 2 });
      for (let k = 0; k < 4; k++)
        for (let i = 0; i < 20; i++)
          p.pixel(x0 + 1 + i, y0 - 4 + k * 3 + i * 0.28, H[2]);
      p.rect(x0 + 5, y0 - 2, 11, 1, H[0]);
      if (upright) {
        const tail = mk(p).rect(q.away ? x0 + 9 : x0 - 1, y0 + 6, 4, 12);
        paint(p, tail, H, { dark: 1 });
      }
      break;
    }
    case 'hijab':
    case 'khimar': {
      // A rounded scarf hugging the head and hair, draping over the shoulders.
      const long = id === 'khimar',
        m = headMask(p, q).grow(3);
      if (upright) {
        const bottom = long ? q.hip[1] + 2 : q.chest[1] + 2,
          w = long ? 9.5 : 8.5;
        m.poly([
          [x0 + 1, y0 + 13],
          [x0 + 21, y0 + 13],
          [q.chest[0] + w, bottom],
          [q.chest[0] - w, bottom],
        ])
          .disc(q.chest[0] - w + 2, bottom - 2, 2.5)
          .disc(q.chest[0] + w - 2, bottom - 2, 2.5);
      } else m.capsule([cx, y0 + 9], [cx - 3, y0 + 15], 10);
      paint(p, m, H, { light: 2, dark: 2 });
      if (upright)
        for (const dx of [-3, 3]) {
          const fx = Math.round(q.chest[0] + dx);
          for (
            let j = Math.round(y0 + 22);
            j < q.chest[1] + (long ? 6 : 1);
            j++
          )
            if (m.has(fx, j)) p.pixel(fx, j, H[2]);
        }
      if (!q.away) {
        const opening = mk(p).ellipse(x0 + 13.5, y0 + 12.5, 7.5, 7.5);
        faceOpening(p, q, opening);
        // Scarf edge framing the face.
        for (let a = 0; a < 48; a++) {
          const t = (a / 48) * Math.PI * 2;
          const ix = Math.floor(x0 + 13.5 + Math.cos(t) * 8),
            iy = Math.floor(y0 + 12.5 + Math.sin(t) * 8);
          if (m.has(ix, iy) && !opening.has(ix, iy)) p.pixel(ix, iy, H[2]);
        }
      }
      break;
    }
    case 'headwrap': {
      // Wrapped scarf tied high: covers hair and ears, face fully visible.
      const m = dome(10, 7, 13, 0).rect(x0 - 1, y0 + 3, 7, 12);
      if (q.away) m.rect(x0 - 1, y0, 24, 17);
      else m.rect(x0 + 19, y0 + 4, 4, 7);
      for (let j = 0; j < p.height; j++)
        for (let i = 0; i < p.width; i++)
          if (m.has(i, j) && !headMask(p, q).grow(2.5).has(i, j))
            m.data[j * p.width + i] = 0;
      m.disc(x0 + 2, y0 + 1, 3.2);
      paint(p, m, H, { dark: 2 });
      for (let k = 0; k < 2; k++)
        for (let i = 0; i < 15; i++)
          p.pixel(x0 + 5 + i, y0 + 1 + k * 3 - i * 0.25, H[2]);
      if (!q.away) {
        const opening = headMask(p, q);
        opening.minus(m);
        for (let j = 0; j < y0 + 7; j++)
          for (let i = 0; i < p.width; i++) opening.data[j * p.width + i] = 0;
        faceOpening(p, q, opening);
      }
      break;
    }
    case 'cap': {
      const m = dome(8, 6);
      paint(p, m, H, { dark: 2 });
      p.rect(x0, y0 + 5, 22, 1, H[2]);
      if (q.away) p.rect(x0 + 15, y0 + 1, 8, 2, H[2]);
      else {
        p.rect(x0 + 15, y0 + 5, 10, 2, H[2]);
        p.rect(x0 + 16, y0 + 5, 8, 1, H[1]);
      }
      p.rect(cx - 1, y0 - 3, 2, 1, H[0]);
      break;
    }
    case 'hard-hat': {
      const m = dome(9, 5, 11.5).rect(x0 - 3, y0 + 4, 28, 2);
      paint(p, m, H, { dark: 2 });
      p.rect(cx - 1, y0 - 4, 3, 9, H[0]);
      p.rect(x0 - 3, y0 + 5, 28, 1, H[2]);
      break;
    }
    case 'scrub-cap': {
      const m = dome(8, 7);
      if (q.away) m.rect(cx - 3, y0 + 6, 6, 4);
      else m.rect(x0 - 2, y0 + 6, 3, 4);
      paint(p, m, H, { dark: 2 });
      for (let i = 0; i < 6; i++)
        p.pixel(x0 + 2 + i * 3.5, y0 + 1 + (i % 2) * 2, H[0]);
      break;
    }
    case 'papakha': {
      // Tall, fluffy sheepskin hat.
      const m = dome(9, 6, 12.5, -1);
      for (let i = 0; i < 7; i++)
        m.disc(x0 + 1 + i * 3.3, y0 - 6.5 + Math.abs(i - 3) * 0.7, 2);
      paint(p, m, H, { light: 2, dark: 2 });
      for (let j = y0 - 10; j < y0 + 6; j++)
        for (let i = x0 - 3; i < x0 + 25; i++)
          if (m.has(i, j) && (i * 5 + j * 3) % 5 === 0)
            p.pixel(i, j, (i + j) % 3 ? H[0] : H[2]);
      p.rect(x0, y0 + 4, 22, 1, H[2]);
      break;
    }
    default:
      throw Error(`No placeholder art for headwear ${id}`);
  }
}

/* ───────────── props ───────────── */
function drawProp(p: Pixels, id: string, q: Pose) {
  const R = K.prop,
    hand = q.arms[1][2],
    other = q.arms[0][2],
    [hx, hy] = hand,
    both = lerp(hand, other, 0.5),
    f = q.frame,
    a = q.action,
    box = (x: number, y: number, w: number, h: number, ramp = R) =>
      paint(p, mk(p).rect(x, y, w, h), ramp, { dark: 1 });
  switch (id) {
    case 'book': {
      if (a === 'read' || a === 'pray') {
        // Open book held up in both hands; a page turns on the last frame.
        const [cx, cy] = both;
        box(cx - 7, cy - 4, 14, 7);
        p.rect(cx - 6, cy - 6, 6, 7, F.white);
        p.rect(cx, cy - 6, 6, 7, F.cream);
        p.rect(cx, cy - 6, 1, 7, F.steel[1]);
        for (let k = 0; k < 3; k++) {
          p.rect(cx - 5, cy - 4 + k * 2, 4, 1, F.steel[0]);
          p.rect(cx + 2, cy - 4 + k * 2, 3, 1, F.steel[0]);
        }
        if (f === 3)
          p.poly(
            [
              [cx, cy - 6],
              [cx + 4, cy - 10],
              [cx + 5, cy - 5],
              [cx + 1, cy],
            ],
            F.white,
          );
      } else {
        box(hx - 1, hy - 7, 5, 8);
        p.rect(hx, hy - 6, 3, 1, R[0]);
        p.rect(hx + 3, hy - 6, 1, 6, F.cream);
      }
      break;
    }
    case 'scroll': {
      p.rect(hx - 1, hy - 7, 3, 9, F.cream);
      p.rect(hx - 2, hy - 8, 5, 2, R[1]);
      p.rect(hx - 2, hy + 1, 5, 2, R[2]);
      break;
    }
    case 'astrolabe': {
      const m = mk(p).disc(hx + 1, hy - 3, 3.5);
      paint(p, m, R);
      p.rect(hx - 1, hy - 3, 5, 1, R[2]);
      p.pixel(hx + 1, hy - 3, F.white);
      break;
    }
    case 'water-skin':
    case 'water-jug': {
      const [cx, cy] = a === 'carry' ? both : [hx + 2, hy - 1];
      const tilt = a === 'pour' ? Math.min(3, f) : 0;
      const m =
        id === 'water-jug'
          ? mk(p)
              .rect(cx - 3, cy - 9 + tilt, 7, 10)
              .rect(cx - 1, cy - 11 + tilt, 3, 2)
          : mk(p)
              .ellipse(cx, cy - 3, 3.5, 5)
              .rect(cx - 1, cy - 9, 2, 2);
      paint(p, m, R, { light: 1, dark: 2 });
      if (id === 'water-jug') p.rect(cx - 2, cy - 7 + tilt, 1, 6, F.waterLight);
      if (a === 'pour' && f > 1) {
        p.rect(cx + 4, cy - 6 + tilt, 1, 8 + (f % 3), F.water);
        p.pixel(cx + 4, cy + 3 + (f % 3), F.waterLight);
      }
      break;
    }
    case 'basket':
    case 'bread':
    case 'tray':
    case 'meal-box': {
      const [cx, cy] = a === 'carry' || a === 'pour' ? both : [hx, hy];
      if (id === 'basket') {
        const m = mk(p).rect(cx - 5, cy - 4, 10, 6);
        paint(p, m, R);
        for (let i = 0; i < 5; i++) p.pixel(cx - 4 + i * 2, cy - 2, R[2]);
        p.rect(cx - 4, cy - 6, 2, 2, F.gold);
        p.rect(cx + 1, cy - 6, 3, 2, '#C87865');
      } else if (id === 'bread') {
        const m = mk(p).ellipse(cx, cy - 2, 5, 2.5);
        paint(p, m, ['#EAC577', '#D8AD57', '#AF853E']);
        for (let i = 0; i < 3; i++) p.pixel(cx - 2 + i * 2, cy - 3, '#AF853E');
      } else if (id === 'tray') {
        p.rect(cx - 6, cy - 1, 12, 2, R[1]);
        p.rect(cx - 6, cy, 12, 1, R[2]);
        p.rect(cx - 4, cy - 4, 3, 3, F.white);
        p.rect(cx + 1, cy - 3, 3, 2, '#C87865');
      } else {
        box(cx - 5, cy - 6, 10, 7);
        p.rect(cx - 5, cy - 6, 10, 2, R[0]);
        p.rect(cx - 1, cy - 6, 2, 7, F.white);
      }
      break;
    }
    case 'scale': {
      p.rect(hx, hy - 9, 1, 9, R[2]);
      p.rect(hx - 5, hy - 9, 11, 1, R[1]);
      p.rect(hx - 6, hy - 6, 4, 2, R[0]);
      p.rect(hx + 3, hy - 6, 4, 2, R[0]);
      break;
    }
    case 'broom': {
      const top: P = add(other, -3, -9),
        bottom: P = [hx + 4, 64];
      const m = mk(p).capsule(top, bottom, 0.8);
      paint(p, m, R, { dark: 1, light: 0 });
      const b = mk(p).poly([
        [bottom[0] - 2, bottom[1] - 4],
        [bottom[0] + 2, bottom[1] - 4],
        [bottom[0] + 5, bottom[1] + 2],
        [bottom[0] - 4, bottom[1] + 2],
      ]);
      paint(p, b, ['#EAC577', '#D8AD57', '#AF853E']);
      break;
    }
    case 'pen': {
      p.rect(hx + 1, hy - 4 - (f % 2), 1, 5, R[1]);
      p.pixel(hx + 1, hy - 5 - (f % 2), R[0]);
      if (a === 'write') {
        p.rect(hx - 6, hy + 1, 9, 3, F.white);
        p.rect(hx - 6, hy + 3, 9, 1, F.cream);
      }
      break;
    }
    case 'laptop': {
      if (a === 'write' || a === 'sit' || a === 'read' || a === 'teach') {
        const [cx, cy] = both;
        p.poly(
          [
            [cx - 6, cy + 1],
            [cx + 5, cy + 1],
            [cx + 7, cy + 3],
            [cx - 4, cy + 3],
          ],
          R[1],
        );
        box(cx - 5, cy - 8, 9, 9, [R[1], R[2], R[2]]);
        p.rect(cx - 4, cy - 7, 7, 7, F.screen);
        p.rect(cx - 3, cy - 6, 3, 1, F.glow);
        p.rect(cx - 3, cy - 4, 5, 1, F.water);
        p.rect(cx - 3, cy - 2, 2, 1, F.gold);
      } else {
        box(hx - 4, hy - 9, 3, 11);
        p.rect(hx - 3, hy - 9, 1, 11, F.steel[0]);
      }
      break;
    }
    case 'tablet':
    case 'phone': {
      const big = id === 'tablet';
      box(hx - (big ? 3 : 1), hy - (big ? 8 : 5), big ? 7 : 3, big ? 9 : 5);
      p.rect(
        hx - (big ? 2 : 0),
        hy - (big ? 7 : 4),
        big ? 5 : 1,
        big ? 6 : 3,
        F.screen,
      );
      if (big) p.rect(hx - 1, hy - 5, 3, 1, F.glow);
      break;
    }
    case 'coffee': {
      box(hx - 1, hy - 5, 4, 5);
      p.rect(hx - 1, hy - 6, 4, 1, F.white);
      p.rect(hx - 1, hy - 3, 4, 1, F.cream);
      if (f % 2 === 0) p.pixel(hx + 1, hy - 8, F.steel[0]);
      break;
    }
    case 'flask': {
      const [cx, cy] = [hx + 1, hy - 1];
      const m = mk(p).poly([
        [cx - 1, cy - 9],
        [cx + 2, cy - 9],
        [cx + 2, cy - 6],
        [cx + 5, cy + 1],
        [cx - 4, cy + 1],
        [cx - 1, cy - 6],
      ]);
      paint(p, m, F.steel, { light: 1, dark: 1 });
      const liquid = mk(p).poly([
        [cx - 2.5, cy - 2],
        [cx + 3.5, cy - 2],
        [cx + 4.5, cy + 0.5],
        [cx - 3.5, cy + 0.5],
      ]);
      paint(p, liquid, R, { dark: 1 });
      if (a === 'pour' && f > 1) p.rect(cx + 3, cy - 9, 1, 3 + (f % 3), R[0]);
      break;
    }
    case 'stethoscope': {
      if (q.mode === 'bow' || q.mode === 'prostrate') break;
      const [cx, cy] = q.chest;
      const m = mk(p)
        .capsule([cx - 4, cy - 4], [cx - 3, cy + 4], 0.6)
        .capsule([cx + 4.5, cy - 4], [cx + 3.5, cy + 2], 0.6)
        .capsule([cx - 3, cy + 4], [cx + 1, cy + 7], 0.6);
      paint(p, m, R, { light: 0, dark: 0, top: false });
      p.rect(cx + 1, cy + 6, 3, 3, F.steel[1]);
      p.pixel(cx + 1, cy + 6, F.steel[0]);
      break;
    }
    case 'clipboard': {
      box(hx - 3, hy - 9, 7, 10);
      p.rect(hx - 2, hy - 7, 5, 7, F.white);
      p.rect(hx - 1, hy - 10, 3, 2, F.steel[2]);
      for (let k = 0; k < 3; k++)
        p.rect(hx - 1, hy - 6 + k * 2, 3, 1, F.steel[1]);
      break;
    }
    case 'blueprint': {
      const m = mk(p).capsule([hx - 5, hy - 9], [hx + 3, hy + 1], 1.6);
      paint(p, m, R, { dark: 1 });
      p.rect(hx + 2, hy, 2, 2, F.white);
      break;
    }
    case 'cane': {
      const m = mk(p).capsule([hx + 1, hy], [hx + 3, 66], 0.7);
      paint(p, m, R, { light: 0, dark: 0, top: false });
      p.rect(hx - 1, hy - 1, 3, 1, R[0]);
      break;
    }
    case 'football': {
      const foot = q.legs[1][2],
        held = a === 'carry' || a === 'read' || a === 'teach';
      const [cx, cy] = held ? both : [foot[0] + 4, foot[1] - 0.5];
      const m = mk(p).disc(cx, cy, 2.8);
      paint(p, m, [F.white, F.cream, F.steel[1]], { dark: 1 });
      p.rect(cx - 0.5, cy - 0.5, 2, 2, R[2]);
      p.pixel(cx - 2, cy + 1, R[2]);
      p.pixel(cx + 1, cy - 2, R[2]);
      break;
    }
    case 'wrist-tape': {
      for (const arm of q.arms) {
        const w = lerp(arm[1], arm[2], 0.75);
        if (arm === q.arms[1] || a === 'cheer')
          paint(
            p,
            mk(p).rect(w[0] - 2, w[1] - 1, 4, 3),
            [F.white, F.white, F.cream],
            { dark: 1, light: 0 },
          );
      }
      break;
    }
    case 'mma-gloves':
    case 'boxing-gloves': {
      const big = id === 'boxing-gloves';
      for (const arm of q.arms) {
        const [gx, gy] = arm[2];
        const m = mk(p).disc(gx, gy + 0.5, big ? 3.8 : 2.9);
        paint(p, m, R, { dark: 1 });
        const cuff = lerp(arm[1], arm[2], 0.72);
        p.rect(cuff[0] - 2, cuff[1], 4, big ? 2 : 1, big ? F.white : R[0]);
        if (!big) p.pixel(gx + 1, gy + 1, K.skin[1]);
      }
      break;
    }
    case 'title-belt': {
      if (q.mode === 'bow' || q.mode === 'prostrate') break;
      const [bx, by] = q.hip;
      p.rect(bx - 6.5, by - 2, 13, 4, F.ink);
      const plate = mk(p).poly([
        [bx - 4, by - 4],
        [bx + 4, by - 4],
        [bx + 5.5, by - 1],
        [bx + 4, by + 3],
        [bx - 4, by + 3],
        [bx - 5.5, by - 1],
      ]);
      if (!q.away) {
        paint(p, plate, ['#EAC577', '#D8AD57', '#AF853E'], { light: 2 });
        p.rect(bx - 2, by - 2, 4, 3, '#AF853E');
        p.pixel(bx - 3, by - 3, F.white);
        p.pixel(bx + 3, by + 1, R[0]);
      }
      break;
    }
    case 'scooter': {
      // Kick scooter: steel deck and stem, dark wheels, T-handlebar.
      const wheel = (x: number, y: number) => {
        paint(p, mk(p).disc(x, y, 2.3), [F.charcoal[1], F.ink, F.ink], {
          light: 0,
          dark: 1,
        });
        p.pixel(x - 0.5 + (f % 2), y - 0.5, F.steel[1]);
      };
      if (a === 'ride') {
        // One stem only, at the front; a long low deck between two wheels.
        const feet = q.legs.map((l) => l[2]),
          deckY = Math.round(Math.max(...feet.map((v) => v[1])) + 1.6),
          back = Math.round(Math.min(...feet.map((v) => v[0])) - 8),
          barX = Math.round(Math.max(hx, other[0]) + 0.5),
          barY = Math.round(Math.min(hy, other[1]) - 0.5),
          front = barX + 5;
        paint(
          p,
          mk(p).rect(back, deckY, front - back + 1, 2),
          [R[0], R[1], R[2]],
          { light: 1, dark: 1 },
        );
        // Tiny rear fender over the back wheel.
        p.rect(back - 1, deckY - 1, 3, 1, R[2]);
        const stem = mk(p).capsule([front, deckY + 1], [barX + 1, barY], 0.9);
        paint(p, stem, F.steel, { light: 0, dark: 1, top: false });
        p.rect(barX - 2, barY - 1, 6, 2, R[1]);
        p.rect(barX - 3, barY - 1, 2, 2, F.ink);
        p.rect(barX + 4, barY - 1, 2, 2, F.ink);
        wheel(back + 1, deckY + 2.5);
        wheel(front, deckY + 2.5);
      } else {
        // Parked: one stem leaning back from the front wheel, well clear of
        // the person (screen-left).
        const back = 1,
          front = 11,
          deckY = 64;
        paint(
          p,
          mk(p).rect(back, deckY, front - back + 1, 2),
          [R[0], R[1], R[2]],
          {
            light: 1,
            dark: 1,
          },
        );
        p.rect(back - 1, deckY - 1, 3, 1, R[2]);
        const stem = mk(p).capsule([front, deckY + 1], [front - 3, 47], 0.9);
        paint(p, stem, F.steel, { light: 0, dark: 1, top: false });
        p.rect(front - 6, 46, 6, 2, R[1]);
        p.rect(front - 7, 46, 2, 2, F.ink);
        p.rect(front, 46, 2, 2, F.ink);
        wheel(back + 1, deckY + 2.5);
        wheel(front, deckY + 2.5);
      }
      break;
    }
    case 'shopping-bag': {
      const [cx, cy] = a === 'carry' ? both : [hx, hy + 5];
      box(cx - 3, cy - 2, 7, 8);
      p.rect(cx - 2, cy - 4, 1, 2, R[2]);
      p.rect(cx + 2, cy - 4, 1, 2, R[2]);
      p.rect(cx - 2, cy - 1, 2, 2, '#75966B');
      p.rect(cx + 1, cy - 2, 2, 2, '#C87865');
      break;
    }
    default:
      throw Error(`No placeholder art for prop ${id}`);
  }
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
function drawPart(
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
