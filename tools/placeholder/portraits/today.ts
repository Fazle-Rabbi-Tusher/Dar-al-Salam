import { nearest, type Face, type PortraitDef } from './core';

/*
 * Today's Islamic scholars and modern scientists and architects. Likeness
 * from their well-known public appearance; no photos were supplied.
 *
 * These heads use a hand-tuned painter: a fixed tone map for the 3/4 face
 * (planes lit from the top left) rather than noisy lighting, and features
 * placed pixel by pixel on the 2× grid of the normal head:
 *   brows y 8–9 · eyes y 12–13 (near x 8–11, far x 16–17)
 *   nose bridge x 13–14, tip x 19–21 y 14–15 · mouth x 14–17 y 18–19
 *   chin y 20–21 · ear x 4–7 y 10–15.
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
const CLOTH = {
  white: ['#FBFAF4', '#F5EEDB', '#EDE6CE', '#CCC4AA', '#A9A296'],
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

export const TODAY: Record<string, PortraitDef> = {
  // Dark full beard greying at the chin, white kufi, a warm smile.
  'mufti-ismail-menk': person({
    // From the owner's photo: fair skin, thick straight brows, almond eyes, a
    // trimmed moustache and a very full, curly black beard; gentle closed smile.
    bias: -0.3,
    skin: 'skin-2',
    hair: HAIR.black,
    hairStyle: 'neat',
    beard: { tones: HAIR.black, style: 'full' },
    brow: 'thick',
    browColour: '#2E2B34',
    hat: { tones: CLOTH.white, kind: 'keep' },
    after: (f, T) => {
      if (f.away) return;
      // The beard starts below the cheekbone: clear cheeks around the eyes.
      for (let y = 9; y <= 15; y++)
        for (let x = 6; x <= 20; x++)
          if (f.region(x, y) === 'beard')
            f.px(x, y, y >= 15 && x < 10 ? T[3] : x < 9 ? T[2] : T[1]);
      // Almond eyes under thick straight brows.
      for (const [x, y, c] of [
        [8, 12, '#2E2B34'],
        [9, 12, '#2E2B34'],
        [10, 12, '#2E2B34'],
        [11, 12, '#2E2B34'],
        [8, 13, '#D7DCD2'],
        [9, 13, '#3B322E'],
        [10, 13, '#3B322E'],
        [11, 13, '#E6E4DE'],
        [9, 14, T[2]],
        [10, 14, T[2]],
        [16, 12, '#2E2B34'],
        [17, 12, '#2E2B34'],
        [16, 13, '#3B322E'],
        [17, 13, '#E6E4DE'],
        [7, 9, '#2E2B34'],
        [8, 9, '#2E2B34'],
        [9, 9, '#2E2B34'],
        [10, 9, '#2E2B34'],
        [11, 10, '#2E2B34'],
        [8, 8, '#2E2B34'],
        [9, 8, '#2E2B34'],
        [15, 9, '#2E2B34'],
        [16, 9, '#2E2B34'],
        [17, 9, '#2E2B34'],
      ] as [number, number, string][])
        if (
          f.has(x, y) &&
          f.region(x, y) !== 'hat' &&
          !(f.eyes !== 'open' && y >= 12 && y <= 14)
        )
          f.px(x, y, c);
      // Tight curls through the beard: dark gaps and lit crescents.
      for (let y = 12; y < 34; y++)
        for (let x = 0; x < 26; x++) {
          if (f.region(x, y) !== 'beard' || y <= 15) continue;
          const k = (x * 3 + y * 5 + (y % 2) * 2) % 7;
          if (k === 0) f.px(x, y, '#65564B');
          else if (k === 3 || k === 5) f.px(x, y, '#2E2B34');
        }
    },
  }),
  // Grey-white beard, white turban, light skin and thin glasses.
  'hamza-yusuf': person({
    skin: 'skin-1',
    hair: HAIR.grey,
    hairStyle: 'neat',
    beard: { tones: HAIR.grey, style: 'full' },
    brow: 'medium',
    browColour: '#8B9D96',
    iris: '#548A9B',
    lash: '#65564B',
    age: 2,
    glasses: { frame: '#9AA3A6' },
    hat: { tones: CLOTH.white, kind: 'keep' },
  }),
  // Short neat black hair and a full, trimmed black beard.
  'omar-suleiman': person({
    bias: -0.3,
    skin: 'skin-3',
    hair: HAIR.black,
    hairStyle: 'neat',
    beard: { tones: HAIR.black, style: 'trim' },
    brow: 'thick',
    browColour: '#2E2B34',
  }),
  // White turban and white-grey beard; a calm, gentle face.
  'habib-umar-bin-hafiz': person({
    skin: 'skin-4',
    hair: HAIR.white,
    hairStyle: 'neat',
    beard: { tones: HAIR.white, style: 'long' },
    brow: 'medium',
    browColour: '#A9A296',
    liner: true,
    age: 2,
    hat: { tones: CLOTH.white, kind: 'keep' },
  }),
  // Grey hair swept back, clean-shaven, a broad smile.
  'ahmed-zewail': person({
    skin: 'skin-4',
    hair: HAIR.grey,
    hairStyle: 'swept',
    brow: 'medium',
    browColour: '#65564B',
    age: 2,
    bigSmile: true,
  }),
  // Grey hair, glasses, clean-shaven.
  'aziz-sancar': person({
    skin: 'skin-3',
    hair: HAIR.grey,
    hairStyle: 'neat',
    brow: 'medium',
    browColour: '#8B9D96',
    age: 2,
    glasses: { frame: '#62676E' },
  }),
  // Dark hair swept back, dark-rimmed glasses, clean-shaven (1970s).
  'fazlur-rahman-khan': person({
    bias: -0.3,
    skin: 'skin-5',
    hair: HAIR.black,
    hairStyle: 'swept',
    brow: 'thick',
    browColour: '#2E2B34',
    age: 1,
    glasses: { frame: INK, lower: '#65564B' },
  }),
  // Long dark hair, strong brows, bold eyes and lips.
  'zaha-hadid': person({
    bias: -0.3,
    skin: 'skin-3',
    hair: HAIR.black,
    hairStyle: 'long',
    brow: 'thick',
    browColour: '#2E2B34',
    liner: true,
    fullLips: true,
    lip: '#A65D4F',
  }),
};
