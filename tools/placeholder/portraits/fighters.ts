import { OUTLINE, type Face, type PortraitDef } from './core';

/*
 * Fighters. Likeness from the reference photos the project owner supplied
 * (Khabib, Muhammad Ali) and well-known public appearance (the others).
 * Every head is painted by hand into the fixed 2× silhouette: lit skin
 * planes, then hair or stubble, beard, the papakha, and features chosen per
 * expression. SE frames show the face (nose to the right, ear on the left);
 * NE frames show the back of the head with the right ear and jaw.
 */
const INK = '#3B322E',
  DEEP = '#2E2B34',
  WHITE = '#E6E4DE',
  TEETH = '#F5EEDB';

type Look = {
  /** Skin: highlight, light, mid, shadow, deep. */
  skin: string[];
  /** Hair and beard: sheen, mid, dark, deepest. */
  hair: string[];
  lip: string;
  lipLight: string;
  iris: string;
};
const BLACK_HAIR = ['#65564B', '#493C35', '#3B322E', DEEP];
const SKIN = {
  fair: ['#F7EBD0', '#F0D4B0', '#D6B28C', '#B28C6B', '#8E684D'],
  light: ['#F0D4B0', '#E5BF92', '#CAA077', '#A78059', '#845C43'],
  brown: ['#B78B65', '#A97D5B', '#875E42', '#674631', '#563B2C'],
  dark: ['#8E684D', '#775540', '#593E30', '#49352A', '#3B322E'],
};

/* ───────────── helpers ───────────── */
const L = [-0.55, -0.62, 0.56];
/** Lambert term on a sphere (cx, cy, r) in head space. */
function sphere(x: number, y: number, cx: number, cy: number, r: number) {
  const dx = (x + 0.5 - cx) / r,
    dy = (y + 0.5 - cy) / r,
    q = 1 - dx * dx - dy * dy,
    dz = Math.sqrt(Math.max(0.04, q)),
    n = Math.hypot(dx, dy, dz);
  return (dx * L[0] + dy * L[1] + dz * L[2]) / n;
}
const band = (tones: string[], v: number, steps: number[]) => {
  for (let i = 0; i < steps.length; i++) if (v > steps[i]) return tones[i];
  return tones[steps.length];
};
/** Ordered 4×4 dither threshold in 0..1. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x: number, y: number) =>
  (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Stamp rows of a template: each character looks up a colour ('.' skips). */
function stamp(
  f: Face,
  x0: number,
  y0: number,
  rows: string[],
  key: Record<string, string>,
) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = key[row[i]];
      if (c) f.px(x0 + i, y0 + j, c);
    }
  });
}
const keyOf = (k: Look): Record<string, string> => ({
  '1': k.skin[0],
  '2': k.skin[1],
  '3': k.skin[2],
  '4': k.skin[3],
  '5': k.skin[4],
  H: k.hair[0],
  h: k.hair[1],
  d: k.hair[2],
  D: k.hair[3],
  k: INK,
  w: WHITE,
  i: k.iris,
  l: k.lip,
  m: k.lipLight,
  t: TEETH,
  o: OUTLINE,
});
/** Every silhouette pixel in a box, with its region. */
function each(
  f: Face,
  fn: (x: number, y: number, r: ReturnType<Face['region']>) => void,
) {
  for (let y = -14; y < 34; y++)
    for (let x = -8; x < 30; x++) if (f.has(x, y)) fn(x, y, f.region(x, y));
}

/* ───────────── skin ───────────── */
/** Smooth lit skin over every non-hat pixel (hair is painted over later). */
function skin(f: Face, k: Look) {
  each(f, (x, y, r) => {
    if (r === 'hat') return;
    let v = sphere(x, y, 9.5, 8.5, 13);
    // The face plane (in front of the ear) turns toward the viewer.
    if (!f.away && x >= 9) v += 0.1;
    if (f.away && x >= 15) v -= 0.08;
    // Under the jaw and the neck.
    if (y >= 20) v -= 0.22 + (y - 20) * 0.08;
    f.px(x, y, band(k.skin, v + (dither(x, y) - 0.5) * 0.12, [0.86, 0.5, 0.18, -0.12]));
  });
}
/** Planes of a 3/4 face: brow ridge, sockets, nose, cheekbone, ear, jaw. */
function facePlanes(f: Face, k: Look, chin = 21) {
  const K = keyOf(k);
  stamp(
    f,
    0,
    9,
    [
      '..........33....3.....', // y 9: under the brow
      '.......3333332.33.....', // y10: eye sockets
      '....33.3....3..3......', // y11
      '...3443........3......', // y12: ear
      '...3543.........3.....', // y13
      '...3443...22.....3321.', // y14: cheekbone, nose tip
      '....443..2222...44322.', // y15: under the nose
      '.....33.....2..4443...', // y16: nostril, philtrum
      '......3.........33....', // y17
      '.......3..........3...', // y18
    ],
    K,
  );
  // Nose bridge catches the light.
  stamp(f, 14, 10, ['2', '2', '1.', '.1'], K);
  // Jaw and chin.
  for (let x = 6; x <= 18; x++) if (f.region(x, chin) === 'skin') f.px(x, chin, k.skin[3]);
  for (let x = 7; x <= 16; x++)
    if (f.region(x, chin + 1) === 'skin') f.px(x, chin + 1, k.skin[4]);
}

/* ───────────── features (SE) ───────────── */
function brows(f: Face, k: Look, thick: boolean) {
  const c = k.hair[2],
    c2 = k.hair[1];
  const K = { d: c, h: c2, D: k.hair[3] };
  if (f.eyes === 'determined') {
    // Lowered and drawn toward the nose.
    stamp(f, 6, 8, ['dhh.......', '..dDd.....', '....dD....'], K);
    stamp(f, 15, 8, ['..dh', '.dd.', 'D...'], K);
    if (thick) stamp(f, 6, 7, ['hh', '..'], K);
  } else {
    const up = f.brows === 'raised' || f.eyes === 'happy' ? -1 : 0;
    stamp(f, 6, 8 + up, [thick ? '.hdddh' : '..hddh', 'd.....'], K);
    stamp(f, 15, 8 + up, [thick ? 'hddh' : '.ddh', '...'], K);
  }
}
function eyes(f: Face, k: Look) {
  const K = keyOf(k);
  switch (f.eyes) {
    case 'open':
      stamp(f, 8, 11, ['.kkk.', 'wiik3', '.33..'], K);
      stamp(f, 16, 11, ['kk', 'wk', '3.'], K);
      // Catch light on the near iris.
      break;
    case 'determined':
      // Narrowed under heavy lids.
      stamp(f, 8, 11, ['kkkkk', '3wik.', '.333.'], K);
      stamp(f, 16, 11, ['kk', 'ik', '3.'], K);
      break;
    case 'happy':
      stamp(f, 8, 11, ['.....', '.kkk.', 'k222k'], K);
      stamp(f, 16, 11, ['..', 'kk', '2.'], K);
      break;
    case 'down':
      stamp(f, 8, 11, ['.333.', 'kkkkk', '.wi..'], K);
      stamp(f, 16, 11, ['33', 'kk', '..'], K);
      break;
    case 'closed':
    case 'blink':
      stamp(f, 8, 11, ['.333.', '.333.', 'kkkk.'], K);
      stamp(f, 16, 11, ['33', '33', 'kk'], K);
      break;
  }
}
/** Mouth by expression, centred for a 3/4 face. `beard` keeps lips framed. */
function mouth(f: Face, k: Look, shoutJaw: boolean) {
  const K = keyOf(k);
  switch (f.mouth) {
    case 'smile':
      stamp(f, 12, 17, ['4....4', '.kkkk.', '..mm..'], K);
      break;
    case 'grin':
      stamp(f, 12, 17, ['k....k', 'kttttk', '.kkkk.', '..mm..'], K);
      break;
    case 'flat':
    case 'calm':
      stamp(f, 12, 17, ['......', '.kkkk.', '..mm..'], K);
      break;
    case 'open':
    case 'o':
      stamp(f, 12, 17, ['......', '.kttk.', '.kDDk.', '..mm..'], keyOf(k));
      break;
    case 'shout':
      // Wide open, upper teeth bared: the jaw drops.
      stamp(
        f,
        12,
        17,
        shoutJaw
          ? ['klllk.', 'kttttk', 'kDDDDk', 'kDDDDk', '.mmmm.']
          : ['klllk.', 'kttttk', 'kDDDDk', '.mmmm.'],
        { ...keyOf(k), D: DEEP },
      );
      break;
  }
}

/* ───────────── hair, stubble and beard ───────────── */
/** Short cropped hair: lit, with fine strands and a soft hairline. */
function cropped(f: Face, k: Look) {
  each(f, (x, y, r) => {
    if (r !== 'hair') return;
    const v = sphere(x, y, 9, 6, 12) + (hash(x, y) - 0.5) * 0.35;
    f.px(x, y, band(k.hair, v, [0.78, 0.3, -0.25]));
  });
}
/** A shaved scalp: skin with a fine dark stipple above the hairline. */
function stubbleScalp(f: Face, k: Look, line: (x: number) => number) {
  each(f, (x, y, r) => {
    if (r === 'hat' || r === 'beard' || y > line(x)) return;
    const v = sphere(x, y, 9.5, 8.5, 13);
    if (dither(x, y) < 0.42 + (v < 0.3 ? 0.18 : 0)) f.px(x, y, v > 0.55 ? k.skin[3] : k.skin[4]);
    else f.px(x, y, band(k.skin, v - 0.12, [0.9, 0.55, 0.2, -0.1]));
  });
}
type BeardOpts = {
  /** Lowest row of skin on the cheek (beard starts below this per column). */
  cheek?: (x: number) => number;
  /** Fill below the chin (beard length): rows past this become skin/neck. */
  maxY?: number;
  moustache?: boolean;
  density?: number;
};
function beard(f: Face, k: Look, o: BeardOpts = {}) {
  const maxY = o.maxY ?? 99;
  each(f, (x, y, r) => {
    if (r !== 'beard') return;
    if (!f.away && o.cheek && y < o.cheek(x)) return;
    if (y > maxY) {
      f.px(x, y, k.skin[4]);
      return;
    }
    const v = sphere(x, y, 10, 12, 12) + ((x * 3 + y * 2) % 5 === 0 ? -0.3 : 0) + (hash(x, y) - 0.5) * 0.3;
    f.px(x, y, band(k.hair, v, [0.95, 0.35, -0.3]));
    // Soft edge where the beard meets the cheek.
    const edge = !f.away && f.region(x, y - 1) === 'skin';
    if (edge && dither(x, y) < (o.density ?? 0.5)) f.px(x, y, k.skin[3]);
  });
  if (o.moustache && !f.away)
    stamp(f, 12, 16, ['.dddhh', 'd....d'], { d: k.hair[2], h: k.hair[1] });
}

/* ───────────── papakha ───────────── */
const WOOL = ['#F5EEDB', '#EDE6CE', '#D7BB8D', '#B69872', '#968255'];
/** Tall sheepskin hat: tight cream curls, round crown, shaggy edge. */
function papakha(f: Face) {
  const hat: [number, number][] = [];
  each(f, (x, y, r) => r === 'hat' && hat.push([x, y]));
  if (!hat.length) return;
  const xs = hat.map((p) => p[0]),
    ys = hat.map((p) => p[1]),
    x0 = Math.min(...xs),
    x1 = Math.max(...xs),
    y0 = Math.min(...ys),
    y1 = Math.max(...ys),
    cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2 + 1,
    rx = (x1 - x0) / 2 + 0.5,
    ry = (y1 - y0) / 2 + 0.5;
  for (const [x, y] of hat) {
    // Round off the box into a dome with a shaggy outline.
    const ex = (x + 0.5 - cx) / rx,
      ey = (y + 0.5 - cy) / ry,
      d = ex * ex + ey * ey * (y < cy ? 1.15 : 0.7);
    if (d > 1.02 + (hash(x, y) - 0.5) * 0.22) {
      f.px(x, y, OUTLINE);
      continue;
    }
    // Curls: small lit crescents on a 3×3 cell grid, offset per row.
    const ox = (Math.floor((y - y0) / 3) % 2) * 1.5,
      u = ((x - x0 + ox) % 3 + 3) % 3,
      w = (y - y0) % 3;
    let v = sphere(x, y, cx - 3, cy - 3, Math.max(rx, ry) * 1.3);
    if (u === 0 && w === 0) v += 0.25;
    else if (u === 2 || w === 2) v -= 0.3;
    v += (hash(x, y) - 0.5) * 0.3;
    // Curls spill over the forehead: the lower rows read darker.
    if (y >= y1 - 1) v -= 0.25;
    f.px(x, y, band(WOOL, v, [0.75, 0.38, 0.02, -0.35]));
  }
}

/* ───────────── back of the head (NE) ───────────── */
function earBack(f: Face, k: Look) {
  const K = keyOf(k);
  stamp(f, 17, 10, ['.33', '3443', '3543', '.44', '..3'], K);
}

/* ───────────── hand-drawn faces ───────────── */
/*
 * Full SE heads drawn pixel by pixel (x 0–21 from the left edge, y from the
 * top of the skull). Digits are skin tones 1 (highlight) – 5 (deep); H h d D
 * hair; b B beard; k ink; w eye white; i iris; l m lips; t teeth.
 */
const ALI_SE = [
  '....dhHHHhhhhhd.......', // -2
  '...dhHHHHhhhhhhd......', // -1
  '..dhHHHhhhhhhhhhd.....', // 0
  '..hHHhhhhhhhhhhhhd....', // 1
  'dhhHhhhhhhhhhhhhhhdd..', // 2
  'dhhhhhhhhhhhhhhhhhhd..', // 3
  'dhhhhhhhhd2221112223..', // 4
  'dhhhhhhhd22221112223..', // 5
  'ddhhhd22222222212223..', // 6
  'ddhhd322222222222233..', // 7
  'ddd33222222222222233..', // 8
  'ddd33222222222222233..', // 9
  'ddd3433223322223333...', // 10
  'ddd4434333332233333...', // 11
  'ddd4542222222222333...', // 12
  'ddd4543222222222333...', // 13
  'ddd4443221122222333221', // 14
  'ddd3443222222224443321', // 15
  '..443333222222444333..', // 16
  '..444333322222222333..', // 17
  '....4433332222222233..', // 18
  '....4443333222222233..', // 19
  '......44433333333344..', // 20
  '......54444444444445..', // 21
  '........4444444444....', // 22 (jaw dropped)
  '........5555555555....', // 23
];
function face(f: Face, k: Look, rows: string[], y0: number) {
  stamp(f, 0, y0, rows, keyOf(k));
}

/* ───────────── people ───────────── */
type Person = {
  k: Look;
  base: 'shaved-beard' | 'beard' | 'short';
  thickBrows?: boolean;
  beard?: BeardOpts;
  /** Extra pass for distinguishing details. */
  extra?: (f: Face, k: Look) => void;
};
function fighter(p: Person): PortraitDef {
  return {
    paint: (f) => {
      const { k } = p;
      skin(f, k);
      if (p.base === 'shaved-beard')
        stubbleScalp(f, k, (x) => (f.away ? 9 - (x > 12 ? 2 : 0) : x >= 10 ? 4 : 7 + (x < 4 ? 2 : 0)));
      else cropped(f, k);
      if (f.away) {
        earBack(f, k);
        beard(f, k, p.beard);
        papakha(f);
        p.extra?.(f, k);
        return;
      }
      if (p.base === 'short') face(f, p.k, ALI_SE, -2);
      else facePlanes(f, k);
      beard(f, k, p.beard);
      brows(f, k, p.thickBrows ?? false);
      eyes(f, k);
      mouth(f, k, f.has(14, 22) && p.base === 'short');
      papakha(f);
      p.extra?.(f, k);
    },
  };
}

export const FIGHTERS: Record<string, PortraitDef> = {
  // Khabib: shaggy cream papakha down to the brows, dark beard along the
  // jaw and chin with clear cheeks, deep-set eyes under straight dark brows.
  'khabib-nurmagomedov': fighter({
    k: { skin: SKIN.light, hair: BLACK_HAIR, lip: '#A8644C', lipLight: '#C08A5A', iris: '#563B2C' },
    base: 'beard',
    thickBrows: true,
    beard: { cheek: (x) => (x < 8 ? 12 : 15), moustache: true, density: 0.6 },
  }),
  // Islam Makhachev: very short dark hair, short neat full beard, calm face.
  'islam-makhachev': fighter({
    k: { skin: SKIN.light, hair: BLACK_HAIR, lip: '#A8644C', lipLight: '#C08A5A', iris: '#563B2C' },
    base: 'shaved-beard',
    beard: { cheek: (x) => (x < 8 ? 14 : 16), maxY: 23, moustache: true },
  }),
  // Kamaru Usman: shaved head, dark skin, short beard and moustache.
  'kamaru-usman': fighter({
    k: { skin: SKIN.dark, hair: BLACK_HAIR, lip: '#49352A', lipLight: '#674631', iris: DEEP },
    base: 'shaved-beard',
    beard: { cheek: (x) => (x < 8 ? 15 : 17), maxY: 22, moustache: true, density: 0.3 },
  }),
  // Khamzat Chimaev: shaved head, thick dark full beard, intense brows.
  'khamzat-chimaev': fighter({
    k: { skin: SKIN.fair, hair: BLACK_HAIR, lip: '#A8644C', lipLight: '#C87865', iris: '#563B2C' },
    base: 'shaved-beard',
    thickBrows: true,
    beard: { cheek: (x) => (x < 8 ? 12 : 14), moustache: true, density: 0.7 },
  }),
  // Zabit Magomedsharipov: short dark hair, trimmed beard, slim face.
  'zabit-magomedsharipov': fighter({
    k: { skin: SKIN.light, hair: BLACK_HAIR, lip: '#A8644C', lipLight: '#C08A5A', iris: '#563B2C' },
    base: 'beard',
    beard: { cheek: (x) => (x < 8 ? 14 : 17), maxY: 23, moustache: true, density: 0.4 },
  }),
  // Muhammad Ali: short cropped hair, clean-shaven, broad nose, full lips.
  'muhammad-ali': fighter({
    k: { skin: SKIN.brown, hair: BLACK_HAIR, lip: '#704C36', lipLight: '#A65D4F', iris: DEEP },
    base: 'short',
    thickBrows: true,
  }),
};
