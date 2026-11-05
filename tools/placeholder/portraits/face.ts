import { nearest, type Face, type Painter, type PortraitDef } from './core';
import type { Eyes, Mouth } from '../parts';

/*
 * The default sharp-head painter: a lit 3/4 face with eyes, brows, nose,
 * lips, ear and jaw at twice the density, plus hair, beard and headwear
 * textures. Characters set traits for their likeness and may add a custom
 * pass (`after`) for distinctive details. All colours are world-palette
 * colours.
 */
const SKIN_RAMPS: string[][] = [
  ['#F7EBD0', '#F5EEDB', '#EFE3C6'],
  ['#F0D4B0', '#D6B28C', '#B28C6B'],
  ['#E5BF92', '#CAA077', '#A78059'],
  ['#D7AC7D', '#BA8D63', '#976A49'],
  ['#C5966C', '#A67954', '#845C43'],
  ['#B78B65', '#976E4C', '#785237'],
  ['#A97D5B', '#875E42', '#674631'],
  ['#8E684D', '#704C36', '#563B2C'],
  ['#775540', '#593E30', '#49352A'],
  ['#593E30', '#49352A', '#3B322E'],
];
/** Five skin tones (highlight → deep shadow) around a skin ramp. */
export function skinTones(ramp: string[]) {
  const i = Math.max(
    1,
    SKIN_RAMPS.findIndex((r) => r[0] === ramp[0]),
  );
  const r = SKIN_RAMPS[i] ?? SKIN_RAMPS[3],
    up = SKIN_RAMPS[i - 1],
    down = SKIN_RAMPS[i + 1] ?? SKIN_RAMPS[9];
  return [up[0], r[0], r[1], r[2], down[2]];
}
const HAIR_UP: Record<string, string> = {
  '#65564B': '#80766B',
  '#8E684D': '#A97D5B',
  '#D7DCD2': '#E6E8E1',
  '#F5EEDB': '#FBFAF4',
};
/** Four hair tones (sheen → deepest) from a hair ramp. */
export function hairTones(ramp: string[]) {
  return [HAIR_UP[ramp[0]] ?? ramp[0], ramp[0], ramp[1], ramp[2]];
}
/** Hair tones for shading: sheen is rare, most of the hair is the mid tone. */
const HAIR_STEPS = [1.1, 0.82, 0.1];
const LIPS = [
  '#E0916A',
  '#DAA084',
  '#C87865',
  '#C9704E',
  '#A8644C',
  '#A65D4F',
  '#86392C',
  '#62352B',
  '#704C36',
  '#563B2C',
];
const INK = '#3B322E',
  WHITE = '#E6E4DE',
  TEETH = '#F5EEDB';

export type Traits = {
  /** Five skin tones; default from the look's skin ramp. */
  skin?: string[];
  /** Four hair tones; default from the look's hair ramp. */
  hair?: string[];
  /** Beard tones if different from the hair (e.g. greying). */
  beard?: string[];
  hairStyle?: 'straight' | 'swept' | 'curly' | 'coily' | 'buzz' | 'bald';
  beardStyle?: 'full' | 'trim' | 'stubble';
  brow?: 'thin' | 'medium' | 'thick';
  /** Iris colour. */
  iris?: string;
  /** Heavier upper lids (also reads as a calmer, older face). */
  lids?: 'normal' | 'heavy';
  nose?: 'small' | 'medium' | 'large' | 'broad';
  lips?: 'thin' | 'medium' | 'full';
  /** 0 young, 1 lines under the eyes, 2 forehead and smile lines. */
  age?: 0 | 1 | 2;
  /** Glasses frame colour. */
  glasses?: string;
  /** Dimples / cheek creases when smiling. */
  smileLines?: boolean;
  /** Moustache over the upper lip even when the beard is light. */
  moustache?: boolean;
  /** Repaint headwear with shading (default keeps the smoothed 1× art). */
  hatTexture?: 'cloth' | 'fur' | 'knit' | 'wrap';
  /** Extra pass after the default painting. */
  after?: Painter;
  /** Pass instead of the default back-of-head painting. */
  back?: Painter;
};

/* ───────────── lighting ───────────── */
const L = [-0.52, -0.6, 0.6];
/** Lambert term on an ellipsoid head centred in the skull box. */
function lit(x: number, y: number, cx = 10.5, cy = 10.5, rx = 11, ry = 12) {
  const dx = (x + 0.5 - cx) / rx,
    dy = (y + 0.5 - cy) / ry,
    q = 1 - dx * dx - dy * dy,
    dz = Math.sqrt(Math.max(0.05, q));
  const n = Math.hypot(dx, dy, dz);
  return (dx * L[0] + dy * L[1] + dz * L[2]) / n;
}
const pick = (tones: string[], v: number, steps: number[]) => {
  for (let i = 0; i < steps.length; i++) if (v > steps[i]) return tones[i];
  return tones[tones.length - 1];
};

/* ───────────── face (SE) ───────────── */
function shadeSkin(f: Face, T: string[]) {
  for (let y = -12; y < 40; y++)
    for (let x = -12; x < 32; x++) {
      if (f.region(x, y) !== 'skin') continue;
      // The face plane (right of the ear) faces the viewer and the light.
      let v = lit(x, y, 12.5, 10, 12, 13) + (x > 8 ? 0.12 : -0.1);
      if (y >= 21) v -= 0.3;
      if (y >= 23) v -= 0.4;
      f.px(x, y, pick(T, v, [1.08, 0.42, 0.08, -0.3]));
    }
  // Planes of the face: brow ridge, cheekbone, nose bridge and jawline.
  const soft = (pts: [number, number][], c: string) =>
    pts.forEach(([x, y]) => f.region(x, y) === 'skin' && f.px(x, y, c));
  soft(
    [
      [13, 10],
      [14, 11],
      [14, 12],
      [15, 12],
      [15, 13],
    ],
    T[1],
  );
  soft(
    [
      [9, 15],
      [10, 15],
      [11, 15],
      [10, 16],
      [8, 16],
    ],
    T[1],
  );
  soft(
    [
      [17, 7],
      [18, 7],
      [16, 6],
    ],
    T[0],
  );
  // Soft shadow where the cheek turns toward the ear.
  soft(
    [
      [7, 17],
      [8, 18],
    ],
    T[2],
  );
}
function ear(f: Face, T: string[]) {
  const e: [number, number, number][] = [
    [5, 10, 2],
    [6, 10, 2],
    [4, 11, 2],
    [5, 11, 3],
    [6, 11, 2],
    [4, 12, 2],
    [5, 12, 4],
    [6, 12, 3],
    [4, 13, 2],
    [5, 13, 3],
    [6, 13, 3],
    [5, 14, 2],
    [6, 14, 3],
    [6, 15, 3],
    [7, 12, 3],
    [7, 13, 3],
  ];
  for (const [x, y, k] of e) if (f.region(x, y) === 'skin') f.px(x, y, T[k]);
}
function brows(f: Face, t: Traits, colour: string) {
  const raised = f.brows === 'raised' ? -1 : 0,
    det = f.eyes === 'determined';
  const thick = t.brow === 'thick' ? 2 : t.brow === 'thin' ? 0 : 1;
  // Near brow: a slight arch from the nose outward.
  const near: [number, number][] = det
    ? [
        [7, 8],
        [8, 8],
        [9, 9],
        [10, 9],
        [11, 10],
      ]
    : [
        [7, 9],
        [8, 8],
        [9, 8],
        [10, 8],
        [11, 9],
      ];
  const far: [number, number][] = det
    ? [
        [15, 10],
        [16, 9],
        [17, 8],
      ]
    : [
        [15, 9],
        [16, 8],
        [17, 8],
      ];
  for (const [x, y] of [...near, ...far]) {
    f.px(x, y + raised, colour);
    if (thick >= 1 && x > 7 && x < 10) f.px(x, y + raised - 1, colour);
    if (thick >= 2 && x > 6) f.px(x, y + raised - 1, colour);
  }
}
function eyes(f: Face, t: Traits, T: string[]) {
  const iris = t.iris ?? '#563B2C',
    e: Eyes = f.eyes,
    heavy = t.lids === 'heavy';
  // Socket shadow between brow and eye.
  for (const [x, y] of [
    [8, 11],
    [9, 11],
    [10, 11],
    [16, 11],
  ] as [number, number][])
    f.px(x, y, T[2]);
  const lid = INK;
  switch (e) {
    case 'open':
    case 'determined': {
      const top = e === 'determined' || heavy;
      f.pts(
        [
          [8, 12],
          [9, 12],
          [10, 12],
          [11, 12],
        ],
        lid,
      );
      f.px(8, 13, WHITE);
      f.px(9, 13, iris);
      f.px(10, 13, INK);
      f.px(11, 13, WHITE);
      if (!top) f.px(9, 12, lid);
      if (top) {
        f.px(9, 13, INK);
        f.px(11, 13, T[2]);
      }
      // Lower lid and the far eye.
      f.pts(
        [
          [9, 14],
          [10, 14],
        ],
        T[2],
      );
      f.pts(
        [
          [16, 12],
          [17, 12],
        ],
        lid,
      );
      f.px(16, 13, INK);
      f.px(17, 13, e === 'determined' ? T[2] : WHITE);
      // Catch light.
      if (!top) f.px(10, 12, iris === INK ? '#65564B' : iris);
      break;
    }
    case 'happy':
      f.pts(
        [
          [8, 13],
          [9, 12],
          [10, 12],
          [11, 13],
          [16, 13],
          [17, 12],
        ],
        lid,
      );
      f.pts(
        [
          [9, 14],
          [10, 14],
          [9, 15],
        ],
        T[1],
      );
      break;
    case 'down':
      f.pts(
        [
          [8, 13],
          [9, 13],
          [10, 13],
          [11, 13],
          [16, 13],
          [17, 13],
        ],
        lid,
      );
      f.pts(
        [
          [9, 12],
          [10, 12],
          [16, 12],
        ],
        T[2],
      );
      f.px(10, 14, iris);
      break;
    case 'closed':
    case 'blink':
      f.pts(
        [
          [8, 13],
          [9, 13],
          [10, 13],
          [11, 13],
          [16, 13],
          [17, 13],
        ],
        lid,
      );
      f.pts(
        [
          [9, 12],
          [10, 12],
        ],
        T[2],
      );
      break;
  }
}
function nose(f: Face, t: Traits, T: string[]) {
  const n = t.nose ?? 'medium';
  // Shadow side of the bridge and the wing, light on the tip.
  f.pts(
    [
      [15, 14],
      [16, 15],
      [16, 16],
    ],
    T[3],
  );
  if (n === 'large' || n === 'broad')
    f.pts(
      [
        [15, 15],
        [15, 16],
      ],
      T[3],
    );
  f.pts(
    [
      [17, 17],
      [18, 17],
      ...(n === 'broad' ? ([[16, 17]] as [number, number][]) : []),
    ],
    T[3],
  );
  f.px(19, 16, T[4]);
  f.pts(
    [
      [19, 14],
      [20, 15],
    ],
    T[0],
  );
  if (n === 'small') f.px(16, 16, T[2]);
}
function mouth(f: Face, t: Traits, T: string[], bearded: boolean) {
  const m: Mouth = f.mouth,
    lip = nearest(T[3], LIPS),
    dark = INK,
    full = t.lips === 'full',
    y = 19;
  const lipPx = (x: number, yy: number, c: string) => {
    // Lips show through a beard.
    if (f.has(x, yy)) f.px(x, yy, c);
  };
  if (bearded) for (let x = 13; x <= 17; x++) lipPx(x, y + 1, lip);
  switch (m) {
    case 'smile':
      lipPx(12, y - 1, T[3]);
      for (const x of [13, 14, 15, 16]) lipPx(x, y, dark);
      lipPx(17, y - 1, dark);
      for (const x of [14, 15]) lipPx(x, y + 1, full ? lip : T[2]);
      if (t.smileLines) {
        lipPx(12, y - 2, T[3]);
        lipPx(11, y - 1, T[3]);
      }
      break;
    case 'grin':
      lipPx(12, y - 1, dark);
      for (const x of [13, 14, 15, 16]) lipPx(x, y, TEETH);
      lipPx(17, y - 1, dark);
      for (const x of [13, 14, 15, 16]) lipPx(x, y + 1, dark);
      lipPx(12, y, dark);
      lipPx(17, y, dark);
      if (t.smileLines) {
        lipPx(11, y - 2, T[3]);
        lipPx(11, y - 1, T[3]);
      }
      break;
    case 'calm':
      for (const x of [14, 15, 16]) lipPx(x, y, nearest(T[4], LIPS));
      lipPx(15, y + 1, full ? lip : T[2]);
      break;
    case 'flat':
      for (const x of [13, 14, 15, 16]) lipPx(x, y, dark);
      lipPx(14, y + 1, T[2]);
      break;
    case 'o':
      lipPx(15, y, dark);
      lipPx(15, y + 1, dark);
      lipPx(14, y, lip);
      lipPx(16, y, lip);
      break;
    case 'open':
      for (const x of [14, 15, 16]) lipPx(x, y, TEETH);
      for (const x of [14, 15, 16]) lipPx(x, y + 1, dark);
      lipPx(13, y, dark);
      lipPx(17, y, dark);
      lipPx(15, y + 2, lip);
      break;
    case 'shout':
      for (const x of [13, 14, 15, 16]) lipPx(x, y, TEETH);
      for (const x of [13, 14, 15, 16]) lipPx(x, y + 1, dark);
      for (const x of [14, 15]) lipPx(x, y + 2, dark);
      lipPx(12, y, dark);
      lipPx(17, y, dark);
      break;
  }
}
function wrinkles(f: Face, t: Traits, T: string[]) {
  const age = t.age ?? 0;
  if (age >= 1) {
    f.px(11, 15, T[2]);
    f.px(12, 14, T[2]);
  }
  if (age >= 2) {
    for (const x of [10, 11, 12, 13, 14]) f.px(x, 5, T[2]);
    for (const x of [12, 13, 14]) f.px(x, 3, T[2]);
    f.px(12, 17, T[3]);
    f.px(12, 18, T[3]);
  }
}
function glasses(f: Face, colour: string) {
  f.pts(
    [
      [7, 11],
      [8, 11],
      [9, 11],
      [10, 11],
      [11, 11],
      [12, 11],
      [7, 12],
      [12, 12],
      [7, 13],
      [12, 13],
      [7, 14],
      [8, 14],
      [9, 14],
      [10, 14],
      [11, 14],
      [12, 14],
      [13, 12],
      [14, 12],
      [15, 11],
      [16, 11],
      [17, 11],
      [18, 11],
      [15, 14],
      [16, 14],
      [17, 14],
      [18, 12],
      [18, 13],
      [6, 12],
      [5, 12],
    ],
    colour,
  );
}

/* ───────────── hair, beard and headwear ───────────── */
function shadeRegion(
  f: Face,
  r: 'hair' | 'beard' | 'hat',
  tones: string[],
  texture: (x: number, y: number, v: number) => number,
  steps = [0.62, 0.28, -0.08],
) {
  for (let y = -16; y < 44; y++)
    for (let x = -14; x < 34; x++) {
      if (f.region(x, y) !== r) continue;
      const v = lit(x, y, 10.5, 9) + texture(x, y, lit(x, y, 10.5, 9));
      // Edges against the outline read a shade darker.
      const edge =
        !f.has(x + 1, y) || !f.has(x, y + 1) || !f.has(x - 1, y) ? -0.2 : 0;
      f.px(x, y, pick(tones, v + edge, steps));
    }
}
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function hairTexture(style: Traits['hairStyle'], away: boolean) {
  return (x: number, y: number) => {
    const h = hash(x, y);
    switch (style) {
      case 'curly':
        // Clumped ringlets: lit crescents on dark gaps.
        return (((x * 2 + y * 3) % 5) - 2) * 0.12 + (h - 0.5) * 0.25;
      case 'coily':
        return ((x + y) % 3 === 0 ? -0.25 : 0.05) + (h - 0.5) * 0.3;
      case 'buzz':
        return (h - 0.5) * 0.4;
      case 'swept': {
        // Strands combed back: soft diagonal bands broken by noise.
        const band = Math.sin((x * 0.9 + (away ? y : -y) * 0.55) * 1.7);
        return band * 0.14 + (h - 0.5) * 0.16;
      }
      default:
        return ((x - y * 2) % 5 === 0 ? -0.2 : 0.04) + (h - 0.5) * 0.12;
    }
  };
}
function paintHair(f: Face, t: Traits, H: string[]) {
  if (t.hairStyle === 'bald') return;
  shadeRegion(f, 'hair', H, hairTexture(t.hairStyle, f.away), HAIR_STEPS);
}
function paintBeard(f: Face, t: Traits, B: string[], T: string[]) {
  const style = t.beardStyle ?? 'full';
  shadeRegion(
    f,
    'beard',
    B,
    (x, y) =>
      (style === 'full' ? ((x * 3 + y) % 4 === 0 ? -0.25 : 0.05) : 0) +
      (hash(x, y) - 0.5) * 0.3,
    HAIR_STEPS,
  );
  // Soft edge where the beard meets the cheek, and stubble over the skin.
  for (let y = 8; y < 30; y++)
    for (let x = 0; x < 24; x++) {
      if (f.region(x, y) !== 'beard') continue;
      const nearSkin =
        f.region(x, y - 1) === 'skin' || f.region(x - 1, y) === 'skin';
      if (nearSkin && hash(x, y) > (style === 'stubble' ? 0.2 : 0.55))
        f.px(x, y, T[3]);
      if (style === 'stubble' && hash(y, x) > 0.45) f.px(x, y, T[3]);
    }
}
function paintHat(f: Face, t: Traits) {
  const tones = f.ramp('headwear');
  if (!t.hatTexture || !tones.length) return;
  const T = [tones[0], tones[0], tones[1], tones[2]];
  shadeRegion(f, 'hat', T, (x, y) => {
    const h = hash(x, y);
    switch (t.hatTexture) {
      case 'fur':
        return (h - 0.5) * 0.9 + (((x + y * 2) % 3) - 1) * 0.12;
      case 'knit':
        return (x % 2 ? -0.12 : 0.1) + (h - 0.5) * 0.1;
      case 'wrap':
        // Folds of cloth wound around the head.
        return ((y * 2 + x) % 6 < 2 ? -0.25 : 0.08) + (h - 0.5) * 0.08;
      default:
        return (h - 0.5) * 0.12;
    }
  });
}

/* ───────────── back of the head (NE) ───────────── */
function paintBack(f: Face, t: Traits, T: string[], H: string[]) {
  for (let y = -12; y < 40; y++)
    for (let x = -12; x < 32; x++)
      if (f.region(x, y) === 'skin') {
        const v = lit(x, y) - (y > 18 ? 0.3 : 0);
        f.px(x, y, pick(T, v, [0.8, 0.5, 0.2, -0.1]));
      }
  // Ear on the right side.
  for (const [x, y, k] of [
    [18, 11, 2],
    [19, 11, 2],
    [19, 12, 3],
    [18, 12, 3],
    [19, 13, 2],
    [18, 13, 3],
    [18, 14, 3],
  ] as [number, number, number][])
    if (f.region(x, y) === 'skin') f.px(x, y, T[k]);
  paintHair(f, t, H);
}

/** A sharp head from likeness traits. */
export function portrait(t: Traits): PortraitDef {
  return {
    paint: (f) => {
      const T = t.skin ?? skinTones(f.ramp('skin')),
        H = t.hair ?? hairTones(f.ramp('hair')),
        B = t.beard ?? H;
      if (f.away) {
        (t.back ?? ((g: Face) => paintBack(g, t, T, H)))(f);
        paintBeard(f, t, B, T);
        paintHat(f, t);
        t.after?.(f);
        return;
      }
      shadeSkin(f, T);
      ear(f, T);
      paintHair(f, t, H);
      // Features never paint over headwear (a scarf framing the face).
      const g: Face = {
        ...f,
        px: (x, y, c) => {
          if (f.region(x, y) !== 'hat') f.px(x, y, c);
        },
      };
      g.pts = (points, c) => points.forEach(([x, y]) => g.px(x, y, c));
      const bearded = f.bounds('beard') !== null;
      if (bearded) paintBeard(f, t, B, T);
      if (t.moustache) for (const x of [13, 14, 15, 16, 17]) f.px(x, 18, B[2]);
      wrinkles(g, t, T);
      brows(g, t, H[3] === INK ? INK : H[3]);
      eyes(g, t, T);
      nose(g, t, T);
      mouth(g, t, T, bearded);
      if (t.glasses) glasses(g, t.glasses);
      paintHat(f, t);
      t.after?.(f);
    },
  };
}
