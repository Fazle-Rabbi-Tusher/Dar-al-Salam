import { nearest, type Face, type PortraitDef } from './core';

/*
 * Famous Muslims of Bangladesh (Kazi Nazrul Islam, Begum Rokeya, Mashrafe
 * Mortaza, Tamim Iqbal), Malala Yousafzai, Ibn Battuta and Hakeem Olajuwon.
 * No photos were supplied: likeness follows well-known public appearance
 * (Ibn Battuta has no portrait, so he is a plausible, distinct traveller).
 * The painter is the hand-tuned 3/4 face from today.ts (copied, so the
 * groups stay independent); feature rows on the 2× grid:
 *   brows y 8–9 · eyes y 12–13 · nose tip x 19–21 y 14–15 · mouth y 18–19.
 */
const INK = '#3B322E',
  WHITE = '#E6E4DE',
  WHITE_DIM = '#D7DCD2',
  TEETH = '#F5EEDB',
  MOUTH = '#62352B';
type P = [number, number];

/* ───────────── colours ───────────── */
/** Six skin tones: highlight, light, light-mid, mid, shadow, deep. */
const SKIN: Record<string, string[]> = {
  'skin-1': ['#F7EBD0', '#F0D4B0', '#E0B98A', '#D6B28C', '#B28C6B', '#976A49'],
  'skin-2': ['#F0D4B0', '#E5BF92', '#D7AC7D', '#CAA077', '#A78059', '#845C43'],
  'skin-3': ['#E5BF92', '#D7AC7D', '#CAA077', '#BA8D63', '#976A49', '#785237'],
  'skin-4': ['#D7AC7D', '#C5966C', '#B78B65', '#A67954', '#845C43', '#674631'],
  'skin-5': ['#C5966C', '#B78B65', '#A97D5B', '#976E4C', '#785237', '#563B2C'],
  'skin-8': ['#8E684D', '#775540', '#704C36', '#593E30', '#49352A', '#3B322E'],
};
const LIPS = ['#DAA084', '#C87865', '#C9704E', '#A8644C', '#A65D4F', '#86392C'];
/** Hair tones: sheen, light, mid, dark, deepest. */
const HAIR = {
  black: ['#80766B', '#65564B', '#493C35', '#3B322E', '#2E2B34'],
  grey: ['#E6E8E1', '#D7DCD2', '#B5C3BA', '#8B9D96', '#6C7176'],
  white: ['#FBFAF4', '#F5EEDB', '#EDE6CE', '#CCC4AA', '#A9A296'],
  // Dark beard greying at the chin.
  salt: ['#B5C3BA', '#8B9D96', '#65564B', '#493C35', '#3B322E'],
};

/* ───────────── small helpers ───────────── */
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function each(f: Face, fn: (x: number, y: number) => void) {
  for (let y = -16; y < 44; y++) for (let x = -14; x < 34; x++) fn(x, y);
}
/** Paint a pixel only where the normal head had one of these regions. */
function on(f: Face, regions: string[], x: number, y: number, c: string) {
  if (regions.includes(f.region(x, y))) f.px(x, y, c);
}
const isSkinLike = (f: Face, x: number, y: number, shaven: boolean) => {
  const r = f.region(x, y);
  return r === 'skin' || (shaven && r === 'beard');
};

/* ───────────── face (SE) ───────────── */
/** Tone index (0 highlight … 5 deep) on the 3/4 face, lit from the top left. */
function toneAt(x: number, y: number) {
  let t = 1;
  if (x <= 8) t = 2;
  if (x <= 4) t = 3;
  // Forehead highlight.
  if (((x - 12) / 4.2) ** 2 + ((y - 4.5) / 2.4) ** 2 <= 1) t = 0;
  // The far temple turns away from the light.
  if (x >= 19 && y <= 11) t = 3;
  if (x === 18 && y >= 5 && y <= 11) t = 2;
  // Eye sockets under the brow ridge.
  if (y >= 10 && y <= 11 && x >= 8 && x <= 11) t = 2;
  if (y >= 10 && y <= 11 && x >= 15 && x <= 18) t = 3;
  if (y === 14 && x >= 9 && x <= 11) t = 2;
  // Nose: lit bridge, side plane, highlight on the tip, shadow beneath.
  if (x >= 13 && x <= 14 && y >= 10 && y <= 13) t = x === 14 && y <= 12 ? 0 : 1;
  if (x === 15 && y >= 12 && y <= 14) t = 2;
  if (y === 14 && x >= 16 && x <= 18) t = 1;
  if (y === 14 && (x === 19 || x === 20)) t = 0;
  if (y === 15 && x >= 15 && x <= 21) t = x === 15 ? 3 : x >= 20 ? 2 : 1;
  if (y === 16 && x >= 15 && x <= 19) t = x === 16 || x === 17 ? 5 : 4;
  // Cheekbone highlight and the cheek turning to the jaw.
  if (y >= 14 && y <= 15 && x >= 9 && x <= 12) t = y === 14 && x >= 10 ? 0 : 1;
  if (y >= 16 && y <= 19 && x <= 9) t = x <= 7 ? 3 : 2;
  if (y >= 16 && y <= 18 && (x === 12 || x === 13)) t = 2;
  // Upper lip and the shadow under the lower lip.
  if (y === 17 && x >= 14 && x <= 18) t = x === 15 ? 2 : 1;
  if (y === 20 && x >= 14 && x <= 16) t = 2;
  // Chin and the underside of the jaw.
  if (y >= 20 && y <= 21 && x >= 10 && x <= 13) t = y === 20 ? 1 : 2;
  if (y >= 20 && x <= 9) t = 4;
  if (y === 21 && x >= 14) t = 3;
  if (y >= 22) t = y === 22 ? 4 : 5;
  return t;
}
function paintSkin(f: Face, T: string[], shaven: boolean) {
  each(f, (x, y) => {
    if (isSkinLike(f, x, y, shaven)) f.px(x, y, T[toneAt(x, y)]);
  });
  // Ear: rim, bowl and lobe.
  const ear: [number, number, number][] = [
    [5, 10, 2],
    [6, 10, 2],
    [4, 11, 2],
    [5, 11, 3],
    [6, 11, 4],
    [7, 11, 3],
    [4, 12, 2],
    [5, 12, 4],
    [6, 12, 5],
    [7, 12, 3],
    [4, 13, 2],
    [5, 13, 3],
    [6, 13, 4],
    [7, 13, 2],
    [5, 14, 2],
    [6, 14, 3],
    [5, 15, 3],
    [6, 15, 2],
  ];
  for (const [x, y, k] of ear)
    if (isSkinLike(f, x, y, shaven)) f.px(x, y, T[k]);
}
type Spec = {
  skin: string;
  brow: 'thin' | 'medium' | 'thick';
  browColour: string;
  iris?: string;
  lash?: string;
  /** 0 young … 2 older (lines under the eyes, forehead, smile folds). */
  age?: 0 | 1 | 2;
  glasses?: { frame: string; lens?: string; lower?: string };
  /** Lips colour override (e.g. Zaha Hadid's lipstick). */
  lip?: string;
  /** Full lips: a fuller lower lip. */
  fullLips?: boolean;
  /** A wide, warm smile with cheek folds. */
  bigSmile?: boolean;
  /** Eye make-up: a heavier, longer upper lash line. */
  liner?: boolean;
  /** Moustache colours (top of the upper lip). */
  moustache?: string[];
};
function brows(f: Face, s: Spec) {
  const c = s.browColour,
    happy = f.eyes === 'happy',
    up = f.brows === 'raised' || happy ? -1 : 0;
  const near: P[] = [
    [8, 8],
    [9, 8],
    [10, 8],
    [6, 9],
    [7, 9],
    [11, 9],
  ];
  const far: P[] = [
    [16, 8],
    [17, 8],
    [18, 9],
  ];
  if (s.brow !== 'thin') {
    near.push([8, 9], [9, 9], [10, 9]);
    far.push([17, 9], [19, 9]);
  }
  if (s.brow === 'thick') {
    near.push([7, 8], [11, 8]);
    far.push([18, 8]);
  }
  for (const [x, y] of [...near, ...far])
    if (f.region(x, y + up) !== 'hat') f.px(x, y + up, c);
}
function eyes(f: Face, s: Spec, T: string[]) {
  const lash = s.lash ?? INK,
    iris = s.iris ?? '#563B2C';
  const px = (x: number, y: number, c: string) => {
    if (f.region(x, y) !== 'hat') f.px(x, y, c);
  };
  switch (f.eyes) {
    case 'open':
    case 'determined':
      // Near eye: lash line, white, iris and pupil looking ahead.
      px(8, 12, T[4]);
      for (const x of [9, 10, 11]) px(x, 12, lash);
      px(8, 13, WHITE_DIM);
      px(9, 13, WHITE);
      px(10, 13, iris);
      px(11, 13, INK);
      if (s.liner) px(7, 12, lash);
      // Lower lid.
      px(9, 14, T[3]);
      px(10, 14, T[3]);
      // Far eye, foreshortened beside the nose.
      px(16, 12, lash);
      px(17, 12, lash);
      px(16, 13, WHITE_DIM);
      px(17, 13, INK);
      break;
    case 'happy':
      // Smiling eyes: curved lids, cheeks raised.
      px(8, 13, lash);
      for (const x of [9, 10]) px(x, 12, lash);
      px(11, 13, lash);
      px(9, 13, T[3]);
      px(10, 13, T[3]);
      px(9, 14, T[1]);
      px(10, 14, T[1]);
      px(16, 13, lash);
      px(17, 12, lash);
      break;
    case 'down':
      for (const x of [8, 9, 10, 11]) px(x, 13, lash);
      px(9, 12, T[3]);
      px(10, 12, T[3]);
      px(10, 14, iris);
      px(16, 13, lash);
      px(17, 13, lash);
      break;
    case 'closed':
    case 'blink':
      for (const x of [8, 9, 10, 11]) px(x, 13, lash);
      px(9, 12, T[3]);
      px(10, 12, T[3]);
      px(16, 13, lash);
      px(17, 13, lash);
      break;
  }
}
function ageLines(f: Face, s: Spec, T: string[]) {
  const age = s.age ?? 0,
    px = (x: number, y: number, c: string) => {
      if (f.region(x, y) === 'skin') f.px(x, y, c);
    };
  if (age >= 1) {
    px(9, 15, T[3]);
    px(11, 15, T[2]);
    px(13, 17, T[3]);
  }
  if (age >= 2) {
    for (const x of [10, 11, 12, 13, 14]) px(x, 6, T[2]);
    for (const x of [11, 12, 13]) px(x, 4, T[2]);
    px(7, 12, T[4]);
    px(12, 18, T[3]);
  }
}
function mouth(f: Face, s: Spec, T: string[]) {
  const lip = s.lip ?? nearest(T[4], LIPS),
    lipLight = s.lip ?? T[3];
  // Lips show through beards and moustaches.
  const px = (x: number, y: number, c: string) => {
    if (f.has(x, y) && f.region(x, y) !== 'hat') f.px(x, y, c);
  };
  const m = s.bigSmile && f.mouth === 'smile' ? 'grin' : f.mouth;
  switch (m) {
    case 'smile':
      px(13, 18, T[4]);
      for (const x of [14, 15, 16]) px(x, 19, MOUTH);
      px(17, 18, MOUTH);
      px(14, 18, lipLight);
      px(15, 18, lipLight);
      px(15, 20, s.fullLips ? lip : T[2]);
      px(16, 20, s.fullLips ? lip : T[2]);
      break;
    case 'grin':
      px(13, 18, MOUTH);
      for (const x of [14, 15, 16, 17]) px(x, 19, TEETH);
      px(18, 18, MOUTH);
      px(13, 19, MOUTH);
      px(18, 19, MOUTH);
      for (const x of [14, 15, 16, 17]) px(x, 18, lipLight);
      for (const x of [14, 15, 16]) px(x, 20, lip);
      px(17, 20, MOUTH);
      if (s.bigSmile || s.age) {
        px(12, 17, T[3]);
        px(12, 18, T[3]);
      }
      break;
    case 'open':
      for (const x of [14, 15, 16]) px(x, 18, lipLight);
      for (const x of [14, 15, 16]) px(x, 19, TEETH);
      px(13, 19, MOUTH);
      px(17, 19, MOUTH);
      for (const x of [14, 15, 16]) px(x, 20, MOUTH);
      px(15, 21, lip);
      break;
    case 'shout':
      for (const x of [13, 14, 15, 16, 17]) px(x, 19, TEETH);
      for (const x of [13, 14, 15, 16, 17]) px(x, 20, MOUTH);
      for (const x of [14, 15, 16]) px(x, 21, MOUTH);
      break;
    case 'o':
      px(15, 19, MOUTH);
      px(15, 20, MOUTH);
      px(14, 19, lip);
      px(16, 19, lip);
      break;
    case 'calm':
      for (const x of [14, 15, 16]) px(x, 19, lip);
      px(15, 20, T[2]);
      break;
    default:
      for (const x of [14, 15, 16, 17]) px(x, 19, MOUTH);
      px(15, 20, T[2]);
  }
}
function glasses(f: Face, g: NonNullable<Spec['glasses']>) {
  const px = (x: number, y: number, c: string) => {
    if (f.has(x, y) && f.region(x, y) !== 'hat') f.px(x, y, c);
  };
  const low = g.lower ?? g.frame;
  // Near lens rim around the eye, bridge, far lens and the arm to the ear.
  for (const x of [8, 9, 10, 11, 12]) px(x, 11, g.frame);
  for (const x of [8, 9, 10, 11, 12]) px(x, 14, low);
  px(7, 12, g.frame);
  px(7, 13, g.frame);
  px(12, 12, g.frame);
  px(12, 13, g.frame);
  px(13, 12, g.frame);
  px(14, 12, g.frame);
  for (const x of [15, 16, 17, 18]) px(x, 11, g.frame);
  for (const x of [15, 16, 17]) px(x, 14, low);
  px(18, 12, g.frame);
  px(18, 13, g.frame);
  px(6, 12, g.frame);
  px(5, 12, g.frame);
  if (g.lens) {
    px(9, 11, g.lens);
    px(16, 11, g.lens);
  }
}

/* ───────────── hair, beard, headwear ───────────── */
/** Light on the hair mass (top left lit, right and lower edge dark). */
function hairLight(f: Face, x: number, y: number) {
  const dx = (x - 9) / 12,
    dy = (y - 4) / 12;
  let v = 0.55 - dx * 0.55 - dy * 0.6;
  const edge =
    !f.has(x + 1, y) ||
    !f.has(x, y + 1) ||
    !f.has(x - 1, y) ||
    !f.has(x, y - 1);
  if (edge) v -= 0.25;
  return v;
}
const band = (H: string[], v: number) =>
  v > 0.85 ? H[0] : v > 0.45 ? H[1] : v > 0.05 ? H[2] : v > -0.35 ? H[3] : H[4];
type HairStyle = 'neat' | 'swept' | 'long';
function paintHair(f: Face, H: string[], style: HairStyle, bias = 0) {
  each(f, (x, y) => {
    if (f.region(x, y) !== 'hair') return;
    let v = hairLight(f, x, y) + bias;
    const n = hash(x, y) - 0.5;
    if (style === 'swept') {
      // Combed back from the forehead: long strands sloping to the crown.
      v += Math.sin(x * 0.7 + y * 1.6) * 0.22 + n * 0.18;
    } else if (style === 'long') {
      // Long hair falls in vertical waves.
      v += Math.sin(x * 1.3 + Math.sin(y * 0.35) * 1.4) * 0.22 + n * 0.12;
    } else {
      v += ((x + y * 2) % 5 === 0 ? -0.25 : 0) + n * 0.15;
    }
    f.px(x, y, band(H, v));
  });
}
type BeardStyle = 'full' | 'trim' | 'long';
function paintBeard(
  f: Face,
  B: string[],
  style: BeardStyle,
  T: string[],
  bias = 0,
) {
  each(f, (x, y) => {
    if (f.region(x, y) !== 'beard') return;
    let v = hairLight(f, x, y + 3) + 0.4 + bias;
    const n = hash(x * 3, y) - 0.5;
    // Vertical strands; longer beards show more of them.
    v += (x % 2 ? -0.12 : 0.08) + n * (style === 'trim' ? 0.15 : 0.3);
    if (style === 'long' && y > 20) v += 0.1;
    // Darker in the hollow under the lower lip.
    if (y >= 20 && y <= 21 && x >= 13 && x <= 16) v -= 0.3;
    let c = band(B, v);
    // Where the beard meets the cheek it thins into stubble.
    const cheek =
      f.region(x, y - 1) === 'skin' || f.region(x - 1, y) === 'skin';
    if (cheek && style !== 'long' && hash(x, y * 2) > 0.45) c = T[4];
    f.px(x, y, c);
  });
}
/** Hair-like texture over a cloth region (cap knit or turban folds). */
function paintHat(
  f: Face,
  C: string[],
  kind: 'knit' | 'wrap' | 'cloth' | 'keep',
) {
  if (kind === 'keep') return;
  each(f, (x, y) => {
    if (f.region(x, y) !== 'hat') return;
    let v = hairLight(f, x, y) + 0.25;
    const n = hash(x, y) - 0.5;
    if (kind === 'knit') {
      // Fine knitted rows; the rim at the bottom edge sits in shadow.
      v += (y % 2 ? -0.18 : 0.08) + n * 0.08;
      if (!f.has(x, y + 1) || f.region(x, y + 1) !== 'hat') v -= 0.35;
    } else if (kind === 'wrap') {
      // Turban: bands of cloth wound diagonally, each with a lit edge.
      v -= 0.2;
      const k = (y * 2 - x + 64) % 7;
      v += k === 0 ? -0.6 : k === 1 ? 0.35 : k === 2 ? 0.1 : 0;
      v += n * 0.06;
    } else v += n * 0.08;
    f.px(x, y, band(C, v));
  });
}

/* ───────────── back of the head (NE) ───────────── */
function paintBack(
  f: Face,
  T: string[],
  H: string[],
  style: HairStyle,
  bias = 0,
) {
  each(f, (x, y) => {
    if (f.region(x, y) !== 'skin') return;
    let t = y >= 18 ? 4 : x >= 16 ? 3 : 2;
    if (y < 18 && x < 10) t = 2;
    f.px(x, y, T[t]);
  });
  // Ear on the right side.
  for (const [x, y, k] of [
    [18, 11, 2],
    [19, 11, 3],
    [18, 12, 3],
    [19, 12, 4],
    [18, 13, 2],
    [19, 13, 3],
    [18, 14, 3],
  ] as [number, number, number][])
    if (f.region(x, y) === 'skin') f.px(x, y, T[k]);
  paintHair(f, H, style, bias);
}

/* ───────────── a person ───────────── */
type Person = Spec & {
  hair: string[];
  /** Shift the hair and beard shading (dark hair reads dark). */
  bias?: number;
  hairStyle: HairStyle;
  beard?: { tones: string[]; style: BeardStyle };
  /** Paint the beard region as shaved skin. */
  shaven?: boolean;
  hat?: { tones: string[]; kind: 'knit' | 'wrap' | 'cloth' | 'keep' };
  /** Extra pass for distinctive details. */
  after?: (f: Face, T: string[]) => void;
};
function person(p: Person): PortraitDef {
  return {
    paint: (f) => {
      const T = SKIN[p.skin];
      if (f.away) {
        paintBack(f, T, p.hair, p.hairStyle, p.bias);
        if (p.beard) paintBeard(f, p.beard.tones, p.beard.style, T, p.bias);
        else if (p.shaven) each(f, (x, y) => on(f, ['beard'], x, y, T[3]));
        if (p.hat) paintHat(f, p.hat.tones, p.hat.kind);
        return;
      }
      paintSkin(f, T, Boolean(p.shaven));
      paintHair(f, p.hair, p.hairStyle, p.bias);
      if (p.beard) paintBeard(f, p.beard.tones, p.beard.style, T, p.bias);
      if (p.moustache)
        for (const [x, y, k] of [
          [14, 17, 2],
          [15, 17, 2],
          [16, 17, 2],
          [17, 17, 3],
          [13, 18, 3],
          [18, 18, 3],
        ] as [number, number, number][])
          if (f.has(x, y)) f.px(x, y, p.moustache[k]);
      ageLines(f, p, T);
      brows(f, p);
      eyes(f, p, T);
      mouth(f, p, T);
      if (p.glasses) glasses(f, p.glasses);
      if (p.hat) paintHat(f, p.hat.tones, p.hat.kind);
      p.after?.(f, T);
    },
  };
}

/** Five cloth tones (sheen … deepest) from a three-shade ramp. */
const ROSE_DEEP = '#A4536A';
const P_ = (pts: P[], f: Face, c: string, regions = ['skin', 'beard']) => {
  for (const [x, y] of pts) if (regions.includes(f.region(x, y))) f.px(x, y, c);
};

/* ───────────── scarf framing the face (hijab, sari over the head) ───────────── */
type Scarfed = Spec & {
  cloth: string[];
  after?: (f: Face, T: string[]) => void;
};
/** The face opening as an oval spanning the normal face's skin rows. */
function faceOpening(f: Face) {
  const spans = new Map<number, [number, number]>();
  for (let y = -6; y < 30; y++) {
    let lo = 99,
      hi = -99;
    for (let x = -8; x < 32; x++)
      if (f.region(x, y) === 'skin') {
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
    if (hi >= lo) spans.set(y, [lo, hi]);
  }
  if (!spans.size) return () => false;
  const rows = [...spans.keys()],
    top = Math.min(...rows),
    bottom = Math.max(...rows),
    lo0 = Math.min(...[...spans.values()].map((r) => r[0])),
    hi0 = Math.max(...[...spans.values()].map((r) => r[1]));
  return (x: number, y: number) => {
    if (f.away || y < top || y > bottom || !f.has(x, y)) return false;
    let lo = 99,
      hi = -99;
    for (const d of [-1, 0, 1]) {
      const r = spans.get(y + d);
      if (r) {
        lo = Math.min(lo, r[0]);
        hi = Math.max(hi, r[1]);
      }
    }
    const ex = (x + 0.5 - (lo0 + hi0 + 1) / 2) / ((hi0 - lo0 + 1) / 2),
      ey = (y + 0.5 - (top + bottom + 1) / 2) / ((bottom - top + 1) / 2);
    return x >= lo && x <= hi && ex * ex + ey * ey <= 1.18;
  };
}
function scarfed(p: Scarfed): PortraitDef {
  return {
    paint: (f) => {
      const T = SKIN[p.skin],
        C = p.cloth,
        face = faceOpening(f);
      each(f, (x, y) => {
        if (!f.has(x, y)) return;
        if (face(x, y)) {
          let t = toneAt(x, y);
          // The scarf's edge shades the rim of the face.
          if (!face(x, y - 1) || !face(x - 1, y)) t = Math.max(t, 2);
          f.px(x, y, T[t]);
          return;
        }
        // Cloth lit from the top left; a folded hem around the face.
        const dx = (x + 0.5 - 9) / 18,
          dy = (y + 0.5 - 2) / 18;
        let v = 0.62 - dx * 0.45 - dy * 0.4;
        const hem =
          !f.away &&
          (face(x + 1, y) ||
            face(x - 1, y) ||
            face(x, y + 1) ||
            face(x, y - 1));
        if (hem) v += y < 12 ? 0.25 : -0.35;
        if (y > 20) v += Math.sin(x * 0.9 + y) * 0.16;
        if (!f.has(x, y + 1) || !f.has(x + 1, y)) v -= 0.22;
        v += (hash(x, y) - 0.5) * 0.05;
        f.px(x, y, band(C, v));
      });
      if (f.away) return;
      // Features only inside the opening.
      const g: Face = {
        ...f,
        region: (x, y) => (face(x, y) ? 'skin' : 'hat'),
        px: (x, y, c) => {
          if (face(Math.floor(x), Math.floor(y))) f.px(x, y, c);
        },
      };
      g.pts = (pts, c) => pts.forEach(([x, y]) => g.px(x, y, c));
      ageLines(g, p, T);
      brows(g, p);
      eyes(g, p, T);
      // Nose: lit bridge and a soft shadow under the tip.
      g.pts(
        [
          [17, 15],
          [18, 15],
        ],
        T[4],
      );
      g.px(19, 14, T[0]);
      mouth(g, p, T);
      p.after?.(g, T);
    },
  };
}

export const BANGLADESH_MORE: Record<string, PortraitDef> = {
  // Neat grey hair, clean-shaven, a warm smile.
  'muhammad-yunus': person({
    bias: 0,
    skin: 'skin-4',
    hair: HAIR.grey,
    hairStyle: 'neat',
    shaven: true,
    brow: 'medium',
    browColour: '#8B9D96',
    age: 2,
    bigSmile: true,
  }),
  // Clean-shaven, long dark wavy hair, large expressive eyes.
  'kazi-nazrul-islam': person({
    bias: -0.15,
    skin: 'skin-3',
    hair: HAIR.black,
    hairStyle: 'long',
    shaven: true,
    brow: 'thick',
    browColour: '#2E2B34',
    after: (f, T) => {
      if (f.away) return;
      // Bigger, brighter eyes: a lifted upper lid and a lit iris.
      if (f.eyes === 'open' || f.eyes === 'determined') {
        P_([[8, 12]], f, T[3]);
        P_([[9, 13]], f, '#E6E4DE');
        P_([[10, 12]], f, '#3B322E');
        P_([[17, 13]], f, '#3B322E');
      }
      // A wavy lock falling on the forehead.
      for (const [x, y] of [
        [10, 3],
        [11, 4],
        [11, 5],
        [12, 4],
      ] as P[])
        if (f.has(x, y) && f.region(x, y) !== 'hat') f.px(x, y, HAIR.black[2]);
    },
  }),
  // Round, gentle face; a white sari drawn over the head.
  'begum-rokeya': scarfed({
    skin: 'skin-4',
    brow: 'medium',
    browColour: '#3B322E',
    age: 1,
    cloth: ['#FBFAF4', '#F5EEDB', '#EDE6CE', '#CCC4AA', '#B39E74'],
  }),
  // Young; a rose dupatta over the hair, a warm smile and dark eyes.
  'malala-yousafzai': scarfed({
    skin: 'skin-3',
    brow: 'medium',
    browColour: '#3B322E',
    iris: '#3B322E',
    bigSmile: true,
    cloth: ['#EBAAB6', '#EE8FB0', '#D07A8D', '#C2607F', ROSE_DEEP],
  }),
  // Short dark hair, a short beard.
  'mashrafe-mortaza': person({
    bias: -0.3,
    skin: 'skin-5',
    hair: HAIR.black,
    hairStyle: 'neat',
    beard: { tones: HAIR.black, style: 'trim' },
    brow: 'thick',
    browColour: '#2E2B34',
    bigSmile: true,
    after: (f, T) => {
      if (f.away) return;
      // A short beard: the cheeks above the jawline stay mostly bare.
      each(f, (x, y) => {
        if (
          f.region(x, y) === 'beard' &&
          y <= 16 &&
          x >= 8 &&
          hash(x, y) > 0.35
        )
          f.px(x, y, T[3]);
      });
    },
  }),
  // Short dark hair, a full, neatly trimmed beard.
  'tamim-iqbal': person({
    bias: -0.35,
    skin: 'skin-4',
    hair: HAIR.black,
    hairStyle: 'swept',
    beard: { tones: HAIR.black, style: 'trim' },
    brow: 'thick',
    browColour: '#2E2B34',
    after: (f, T) => {
      if (f.away) return;
      // Sharp, neat beard line on the cheek.
      each(f, (x, y) => {
        if (f.region(x, y) === 'beard' && y <= 14 && x >= 9) f.px(x, y, T[2]);
      });
    },
  }),
  // Very dark skin, short hair, light moustache and goatee, broad smile.
  'hakeem-olajuwon': person({
    bias: -0.2,
    skin: 'skin-8',
    hair: HAIR.black,
    hairStyle: 'neat',
    brow: 'medium',
    browColour: '#2E2B34',
    iris: '#2E2B34',
    fullLips: true,
    bigSmile: true,
    moustache: HAIR.black,
    after: (f) => {
      if (f.away) return;
      // Goatee on the chin.
      P_(
        [
          [14, 21],
          [15, 21],
          [16, 21],
          [15, 22],
          [14, 22],
        ],
        f,
        '#2E2B34',
        ['skin'],
      );
    },
  }),
};
