import { OUTLINE, type Face, type PortraitDef } from './core';

/*
 * Fighters. Likeness from the reference photos the project owner supplied
 * (Khabib, Muhammad Ali) and well-known public appearance (the others).
 *
 * Each head is drawn by hand into the fixed 2× silhouette: a full template
 * per person for the face (SE: nose to the right, ear on the left) and the
 * back of the head (NE: right ear and jaw), then brows, eyes and mouth per
 * expression, and Khabib's papakha painted as tight sheepskin curls.
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
  /** Close-cropped scalp: light, dark, speck. */
  buzz?: string[];
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
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
type Key = Record<string, string | ((x: number, y: number) => string)>;
/** Stamp template rows: each character looks up a colour ('.' skips). */
function stamp(f: Face, x0: number, y0: number, rows: string[], key: Key) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = key[row[i]];
      if (!c) continue;
      const x = x0 + i,
        y = y0 + j;
      f.px(x, y, typeof c === 'function' ? c(x, y) : c);
    }
  });
}
const keyOf = (k: Look): Key => {
  const z = k.buzz ?? [k.hair[0], k.hair[1], k.hair[2]];
  return {
    '1': k.skin[0],
    '2': k.skin[1],
    '3': k.skin[2],
    '4': k.skin[3],
    '5': k.skin[4],
    H: k.hair[0],
    h: k.hair[1],
    d: k.hair[2],
    D: k.hair[3],
    // Beard: lit strands, mid, dark.
    g: k.hair[0],
    b: k.hair[1],
    B: k.hair[2],
    // Close-cropped scalp with fine specks.
    z: (x, y) => (hash(x, y) < 0.22 ? z[1] : z[0]),
    Z: (x, y) => (hash(x, y) < 0.3 ? z[2] : z[1]),
    k: INK,
    w: WHITE,
    i: k.iris,
    l: k.lip,
    m: k.lipLight,
    t: TEETH,
    x: DEEP,
    o: OUTLINE,
  };
};

/* ───────────── expressions (SE) ───────────── */
/** Brows: straight and level, lowered toward the nose when determined. */
function brows(f: Face, k: Look, thick: boolean) {
  const K = keyOf(k);
  if (f.eyes === 'determined') {
    stamp(f, 6, 8, ['ddh.....', '.hdDd...', '....dD..'], K);
    stamp(f, 15, 8, ['..dd', '.dD.', 'D...'], K);
    if (thick) stamp(f, 6, 7, ['dd'], K);
  } else {
    const y = f.brows === 'raised' || f.eyes === 'happy' ? 7 : 8;
    stamp(f, 6, y, [thick ? '.dddd' : '.hddh', thick ? 'd...h' : '.....'], K);
    stamp(f, 15, y, [thick ? 'hddd' : '.ddd'], K);
  }
}
function eyes(f: Face, k: Look) {
  const K = keyOf(k);
  switch (f.eyes) {
    case 'open':
      stamp(f, 8, 11, ['.kkk', 'wiik', '.33.'], K);
      stamp(f, 16, 11, ['kk', 'wk'], K);
      break;
    case 'determined':
      stamp(f, 8, 11, ['kkkk', '3wik', '.33.'], K);
      stamp(f, 16, 11, ['kk', 'ik'], K);
      break;
    case 'happy':
      stamp(f, 8, 11, ['....', '.kkk', 'k22k'], K);
      stamp(f, 16, 11, ['..', 'kk'], K);
      break;
    case 'down':
      stamp(f, 8, 11, ['.33.', 'kkkk', '.wi.'], K);
      stamp(f, 16, 11, ['33', 'kk'], K);
      break;
    case 'closed':
    case 'blink':
      stamp(f, 8, 11, ['.33.', '.33.', 'kkk.'], K);
      stamp(f, 16, 11, ['33', 'kk'], K);
      break;
  }
}
/** Mouth by expression; `around` is the colour framing it (skin or beard). */
function mouth(f: Face, k: Look, around: string, jaw: boolean) {
  const K = { ...keyOf(k), a: around };
  switch (f.mouth) {
    case 'smile':
      stamp(f, 12, 17, ['ka..ak', 'akkkka', 'aammaa'], K);
      break;
    case 'grin':
      stamp(f, 12, 17, ['kkkkkk', 'kttttk', 'akkkka', 'aammaa'], K);
      break;
    case 'flat':
    case 'calm':
      stamp(f, 12, 17, ['aaaaaa', 'akkkka', 'aamaaa'], K);
      break;
    case 'open':
    case 'o':
      stamp(f, 12, 17, ['akkkka', 'akttka', 'akxxka', 'aammaa'], K);
      break;
    case 'shout':
      // Wide open, upper teeth bared.
      stamp(
        f,
        12,
        17,
        jaw
          ? ['kllllk', 'kttttk', 'kxxxxk', 'kxxxxk', 'ammmma']
          : ['kllllk', 'kttttk', 'kxxxxk', 'ammmma'],
        K,
      );
      break;
  }
}

/* ───────────── hand-drawn heads ───────────── */
/*
 * x 0–21 from the left edge of the skull, rows from the given y. Digits are
 * skin tones 1 (highlight) – 5 (deep); H h d D hair; g b B beard (lit, mid,
 * dark); z Z close-cropped scalp; k ink; l m lips; '.' leaves the pixel.
 */
const ALI_SE = [
  '....dhHHHhhhhhd.......', // -2
  '...dhHHHHhhhhhhd......', // -1
  '..dhHHHhhhhhhhhhd.....', // 0
  '..hHHhhhhhhhhhhhhd....', // 1
  'dhhHhhhhhhhhhhhhhhdd..', // 2
  'dhhhhhhhhhhhhhhhhhhd..', // 3
  'dhhhhhhhhd2211112223..', // 4
  'dhhhhhhhd22211112223..', // 5
  'ddhhhd22222221112223..', // 6
  'ddhhd322222222222233..', // 7
  'ddd33222222222222233..', // 8
  'ddd33222222222222233..', // 9
  'ddd3433233332233333...', // 10
  'ddd4434333332223333...', // 11
  'ddd4542222222222333...', // 12
  'dd44543222222222333...', // 13
  '4444443221122222333221', // 14
  '44434432222222244443..', // 15
  '..443332222223445333..', // 16
  '..443322222233333333..', // 17
  '....4332222222222233..', // 18
  '....4433222222222333..', // 19
  '......44332222233344..', // 20
  '......54443333333445..', // 21
  '........4444444444....', // 22 (jaw dropped)
  '........5555555555....', // 23
];
const ALI_NE = [
  '....dhHHhhhhhd........', // -2
  '...dhHHhhhhhhhd.......', // -1
  '..dhHHhhhhhhhhhd......', // 0
  '..hHhhhhhhhhhhhhd.....', // 1
  'dhhhhhhhhhhhhhhhhd....', // 2
  'dhhhhhhhhhhhhhhhhhd...', // 3
  'dhhhhhhhhhhhhhhhhhdd..', // 4
  'dhhhhhhhhhhhhhhhhhdd..', // 5
  'ddhhhhhhhhhhhhhhhddd..', // 6
  'ddhhhhhhhhhhhhhhhddd..', // 7
  'dddhhhhhhhhhhhhhdddd..', // 8
  'dddhhhhhhhhhhhhddd34..', // 9
  'ddddhhhhhhhhhhhdd3443.', // 10
  'ddddhhhhhhhhhhddd3543.', // 11
  'dddddhhhhhhhhddd34543.', // 12
  '4ddddddhhhhdddd334443.', // 13
  '44ddddddddddddd3344...', // 14
  '4443333333333333444...', // 15
  '4443333333333334444...', // 16
  '..44333333333334444...', // 17
  '..44433333333344444...', // 18
  '....4443333333444.....', // 19
  '....4444444444444.....', // 20
  '......5444444445......', // 21
];
/* Close-cropped scalp with a short neat beard (Islam Makhachev). */
const ISLAM_SE = [
  '......zzzzzzzZ........', // 0
  '......zzzzzzzZ........', // 1
  '..Zzzzzzzzzzzzzz......', // 2
  '..zzzzzzzzzzzzzzZ.....', // 3
  'ZzzzzzzzzzZ2211122233.', // 4
  'ZzzzzzzzZ222111122233.', // 5
  'ZZzzzZ3222222211122233', // 6
  'ZZzzZ32222222222222233', // 7
  'ZZZZ322222222222222233', // 8
  'ZZZ3322222222222222233', // 9
  'ZZZ3433233332233333...', // 10
  'ZZZ4434333332223333...', // 11
  'ZZZ4542222222222333...', // 12
  'ZZd4543222222222333...', // 13
  '..dB443221122222333221', // 14
  '..dBB43222222224444331', // 15
  '..dBBb322222244bbbB3..', // 16
  '..dBBbb3222233bbbbbB..', // 17
  '..dBBbbb322bbbbbbbbB..', // 18
  '..dBBbbbbbbbbbbbbbbB..', // 19
  '....dBbbbbbbbbbbbbbBBB', // 20
  '....dBbbbgbbbbbbbbbBB.', // 21
  '....ddBbbbbbbbbbbbBd..', // 22
  '....ddBBbbbbbbbbBBd...', // 23
  '......dBBbbbbbbBBd....', // 24
  '......ddBBBBBBBBdd....', // 25
];
const SHAVED_NE = [
  '......zzzzzzzZ........', // 0
  '......zzzzzzzZ........', // 1
  '..zzzzzzzzzzzzzZ......', // 2
  '..zzzzzzzzzzzzzzZ.....', // 3
  'ZzzzzzzzzzzzzzzzzZ....', // 4
  'ZzzzzzzzzzzzzzzzzZZ...', // 5
  'ZZzzzzzzzzzzzzzzzZZ...', // 6
  'ZZzzzzzzzzzzzzzzzZZ...', // 7
  'ZZZzzzzzzzzzzzzzZZZ...', // 8
  'ZZZZzzzzzzzzzzzZZZZ...', // 9
  'ZZZZZzzzzzzzzzZZZ3433.', // 10
  'ZZZZZZzzzzzzzZZZ34443.', // 11
  'ZZZZZZZZZZZZZZZB35443.', // 12
  '4ZZZZZZZZZZZZZZBB4443.', // 13
  '44ZZZZZZZZZZZZZBBB3...', // 14
  '444ZZZZZZZZZZZBBBB4...', // 15
  '4443333333333BbbbB....', // 16
  '4443333333333BbbbB....', // 17
  '..44333333333BbbbB....', // 18
  '..44433333333BbbBB....', // 19
  '....444333333BbBB.....', // 20
  '....444444444BBB......', // 21
  '..........BBBB........', // 22
  '..........BBBB........', // 23
];
/* Shaved head with a thick full beard (Khamzat Chimaev). */
const KHAMZAT_SE = [
  '......zzzzzzzZ........', // 0
  '......zzzzzzzZ........', // 1
  '..Zzzzzzzzzzzzzz......', // 2
  '..zzzzzzzzzzzzzzZ.....', // 3
  'ZzzzzzzzzzZ2211122233.', // 4
  'ZzzzzzzzZ222111122233.', // 5
  'ZZzzzZ3222222211122233', // 6
  'ZZzzZ32222222222222233', // 7
  'ZZZZ322222222222222233', // 8
  'ZZZ3322222222222222233', // 9
  'ZZZ3433233332233333...', // 10
  'ZZZ4434333332223333...', // 11
  'ZZZ4542222222222333...', // 12
  'ZZd4543222222222333...', // 13
  '..dBB43221122222333221', // 14
  '..dBBb3222222224444331', // 15
  '..dBBbb3222224bbbbB3..', // 16
  '..dBBbbbb222bbbbbbbB..', // 17
  '..dBBbgbbbbbbbbbbbbB..', // 18
  '..dBBbbgbbbbbbbbbbbB..', // 19
  '....dBbbgbbbbbbbbbbBBB', // 20
  '....dBbbbgbbbbgbbbbBB.', // 21
  '....ddBbbbgbbbbbbbBd..', // 22
  '....ddBBbbbbbgbbbBBd..', // 23
  '......dBBbbbbbbBBd....', // 24
  '......ddBBBBBBBBdd....', // 25
];
/* Smooth shaved head, short beard and moustache (Kamaru Usman). */
const USMAN_SE = [
  '......2111122.........', // 0
  '......2112223.........', // 1
  '..3222111222233.......', // 2
  '..3221112222233.......', // 3
  '43322112222222223333..', // 4
  '43322222222222223333..', // 5
  '4433222222222222233333', // 6
  '4433322222222222222333', // 7
  '4443322222222222222333', // 8
  '4443322222222222222333', // 9
  '4443433233332233333...', // 10
  '4444434333332223333...', // 11
  '4444542222222222333...', // 12
  '4445543222222222333...', // 13
  '..5B443221122222333221', // 14
  '..5BB43222222224444331', // 15
  '..5BBb3222222244bbbB3.', // 16
  '..5BBb33222223bbbbbB..', // 17
  '..5BBbb3322bbbbbbbbB..', // 18
  '..5BBbbbbbbbbbbbbbbB..', // 19
  '....5BBbbbbbbbbbbbBB4.', // 20
  '....5BBBbbbbbbbbbBB44.', // 21
  '....554BBBBBBBBBB44...', // 22
  '....5544BBBBBBBB44....', // 23
  '......554444444455....', // 24
  '......555555555555....', // 25
];
const USMAN_NE = [
  '......2211111.........', // 0
  '......2221112.........', // 1
  '..33222221112223......', // 2
  '..332222222222233.....', // 3
  '43332222222222223.....', // 4
  '433322222222222333....', // 5
  '4433332222222223333...', // 6
  '4443333222222233333...', // 7
  '4443333333333333334...', // 8
  '4444333333333333344...', // 9
  '44444333333333343433..', // 10
  '444444333333334434443.', // 11
  '44444444444444B435443.', // 12
  '444444444444444B4443..', // 13
  '445444444444444BB3....', // 14
  '4454444444444BBBB4....', // 15
  '4443333333333BbbbB....', // 16
  '4443333333333BbbbB....', // 17
  '..44333333333BbbbB....', // 18
  '..44433333333BbbBB....', // 19
  '....444333333BbBB.....', // 20
  '....444444444BBB......', // 21
  '..........BBBB........', // 22
  '..........BBBB........', // 23
];
/* Short dark hair and a trimmed beard (Zabit Magomedsharipov). */
const ZABIT_SE = [
  '....dhHHhhhhd.........', // -2
  '...dhHHHhhhhhd........', // -1
  '..dhHHHhhhhhhhhd......', // 0
  '..hHHhhhhhhhhhhhd.....', // 1
  'dhhHhhhhhhhhhhhhhhd...', // 2
  'dhhhhhhhhhhhhhhhhhhd..', // 3
  'dhhhhhhhhd2211112223..', // 4
  'dhhhhhhhd22211112223..', // 5
  'ddhhhd32222221112223..', // 6
  'ddhhd322222222222233..', // 7
  'ddd33222222222222233..', // 8
  'ddd33222222222222233..', // 9
  'ddd3433233332233333...', // 10
  'ddd4434333332223333...', // 11
  'ddd4542222222222333...', // 12
  'dd4B543222222222333...', // 13
  '444BB43221122222333221', // 14
  '444BB43222222224444331', // 15
  '..dBBb322222244bbbB3..', // 16
  '..dBBbb3222233bbbbbB..', // 17
  '..dBBbbb322bbbbbbbbB..', // 18
  '..dBBbbbbbbbbbbbbbbB..', // 19
  '....dBbbbbbbbbbbbbbBB.', // 20
  '....dBbbbbbbbbbbbbbB..', // 21
  '......dBbbbbbbbbbbBd..', // 22
  '......ddBBbbbbbbBBd...', // 23
  '........dBBBBBBBBd....', // 24
  '........ddBBBBBBdd....', // 25
];
const BEARD_NE = [
  '....dhHHhhhhd.........', // -2
  '...dhHHhhhhhhd........', // -1
  '..dhHHhhhhhhhhhd......', // 0
  '..hHhhhhhhhhhhhhd.....', // 1
  'dhhhhhhhhhhhhhhhhd....', // 2
  'dhhhhhhhhhhhhhhhhhd...', // 3
  'dhhhhhhhhhhhhhhhhhdd..', // 4
  'dhhhhhhhhhhhhhhhhhdd..', // 5
  'ddhhhhhhhhhhhhhhhddd..', // 6
  'ddhhhhhhhhhhhhhhhddd..', // 7
  'dddhhhhhhhhhhhhhdddd..', // 8
  'dddhhhhhhhhhhhhddddd..', // 9
  'ddddhhhhhhhhhhhdd3433.', // 10
  'ddddhhhhhhhhhhddd3443.', // 11
  'dddddhhhhhhhhdddd3543.', // 12
  'ddddddhhhhhdddddd3443.', // 13
  'ddddddddddddddddBB3...', // 14
  'ddddddddddddddddBB....', // 15
  'ddddddddddddddddBBBB..', // 16
  'ddddddddddddddddBBBB..', // 17
  '..ddddddddddddBBBBBB..', // 18
  '..dddddddddddBBBBBBB..', // 19
  '....4443333333BBBB....', // 20
  '....4444444444BBBB....', // 21
  '..........BBBBBB......', // 22
  '..........BBBBBB......', // 23
];
/* Khabib: papakha above (painted separately); beard on the jaw and chin. */
const KHABIB_SE = [
  'dhhhhd3222222111222333', // 6
  'ddhhd32222222222222233', // 7
  'ddd332222222222222223.', // 8
  'ddd332222222222222233.', // 9
  'ddd3433233332233333...', // 10
  'ddd4434333332223333...', // 11
  'ddd4542222222222333...', // 12
  'dd4d543222222222333...', // 13
  '444B443221122222333221', // 14
  '444BB43222222224444331', // 15
  '..dBB4322222224bbbB3..', // 16
  '..dBBb322222bbbbbbbB..', // 17
  '..dBBbb3322bbbbbbbbB..', // 18
  '..dBBbbbbbbbbbbbbbbB..', // 19
  '....dBbbbbbbbbbbbbbBB.', // 20
  '....dBbbgbbbbbbbbbbB..', // 21
  '......dBbbgbbbbbbbBd..', // 22
  '......ddBBbbbbbbBBd...', // 23
  '........dBBbbbbBBd....', // 24
  '........ddBBBBBBdd....', // 25
];

/* ───────────── papakha ───────────── */
const WOOL = ['#F5EEDB', '#EDE6CE', '#D7BB8D', '#B69872', '#968255'];
/*
 * Tight sheepskin curls: each curl is a small ring, lit on its upper left
 * with a shadowed hollow and lower right, placed on a jittered grid so the
 * texture reads as fleece rather than a pattern.
 */
const CURL_SHAPES = [
  // Tone offsets around the curl centre, rows y-1..y+1, columns x-1..x+1.
  [-1, -1, 0, -1, 2, 1, 0, 1, 1],
  [0, -1, -1, -1, 2, 1, 1, 1, 0],
  [-1, -1, 1, -1, 1, 1, 0, 2, 1],
];
function papakha(f: Face) {
  const hat: [number, number][] = [];
  for (let y = -16; y < 12; y++)
    for (let x = -8; x < 30; x++)
      if (f.region(x, y) === 'hat') hat.push([x, y]);
  if (!hat.length) return;
  const body = hat.filter(([x, y]) => f.region(x, y + 2) === 'hat' || y > -11);
  const xs = body.map((p) => p[0]),
    ys = body.map((p) => p[1]),
    x0 = Math.min(...xs),
    x1 = Math.max(...xs),
    y0 = Math.min(...ys),
    y1 = Math.max(...ys);
  // Base tone: light from the top left, the fringe and right side in shade.
  const tone = new Map<string, number>();
  for (const [x, y] of hat) {
    const lx = (x - x0) / Math.max(1, x1 - x0),
      ly = (y - y0) / Math.max(1, y1 - y0),
      v = 1.15 - lx * 0.62 - ly * 0.7 + (hash(x, y) - 0.5) * 0.18;
    tone.set(`${x},${y}`, v > 0.82 ? 0 : v > 0.52 ? 1 : v > 0.2 ? 2 : 3);
  }
  // Curls.
  const off = new Map<string, number>();
  for (let gy = y0 - 2; gy <= y1 + 1; gy += 3)
    for (let gx = x0 - 2; gx <= x1 + 1; gx += 3) {
      const r = hash(gx * 1.7, gy * 2.3);
      if (r < 0.08) continue;
      const cx = gx + Math.floor(hash(gx, gy + 5) * 3),
        cy = gy + Math.floor(hash(gx + 9, gy) * 3),
        shape = CURL_SHAPES[Math.floor(r * 3) % 3];
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const k = `${cx + i},${cy + j}`;
          off.set(k, (off.get(k) ?? 0) + shape[(j + 1) * 3 + i + 1]);
        }
    }
  for (const [x, y] of hat) {
    const k = `${x},${y}`;
    // Round the box corners into a fleecy crown; tufts above stay wool.
    const inBody = y >= y0;
    const corner =
      inBody &&
      (((x <= x0 + 1 || x >= x1 - 1) && (y <= y0 + 1 || y >= y1)) ||
        ((x === x0 || x === x1) && hash(x, y * 3) < 0.35));
    if (corner && hash(x * 5, y) < 0.7) {
      f.px(x, y, OUTLINE);
      continue;
    }
    let t = tone.get(k)! + Math.max(-1, Math.min(2, off.get(k) ?? 0));
    // Fringe curls hang over the brow with dark gaps between them.
    if (inBody && y >= y1 - 1 && (x + Math.floor(y / 2)) % 3 === 0) t += 1;
    f.px(x, y, WOOL[Math.max(0, Math.min(4, t))]);
  }
}

/* ───────────── people ───────────── */
type Person = {
  k: Look;
  se: { rows: string[]; y0: number };
  ne: { rows: string[]; y0: number };
  thickBrows?: boolean;
  /** Mouth sits in a beard (lips framed by hair) or bare skin. */
  bearded: boolean;
  /** Extra pass for distinguishing details. */
  extra?: (f: Face, k: Look) => void;
};
function fighter(p: Person): PortraitDef {
  return {
    paint: (f) => {
      const { k } = p,
        K = keyOf(k);
      if (f.away) {
        stamp(f, 0, p.ne.y0, p.ne.rows, K);
      } else {
        stamp(f, 0, p.se.y0, p.se.rows, K);
        brows(f, k, p.thickBrows ?? false);
        eyes(f, k);
        mouth(f, k, p.bearded ? k.hair[1] : k.skin[2], f.has(14, 22));
      }
      papakha(f);
      p.extra?.(f, k);
    },
  };
}

export const FIGHTERS: Record<string, PortraitDef> = {
  // Khabib: shaggy cream papakha down to the brows, dark beard along the
  // jaw and chin with clear cheeks, straight dark brows.
  'khabib-nurmagomedov': fighter({
    k: {
      skin: SKIN.light,
      hair: BLACK_HAIR,
      lip: '#A8644C',
      lipLight: '#B15D46',
      iris: '#563B2C',
    },
    se: { rows: KHABIB_SE, y0: 6 },
    ne: { rows: BEARD_NE, y0: -2 },
    thickBrows: true,
    bearded: true,
  }),
  // Islam Makhachev: very short dark hair, short neat full beard, calm face.
  'islam-makhachev': fighter({
    k: {
      skin: SKIN.light,
      hair: BLACK_HAIR,
      buzz: ['#8E7255', '#65564B', '#493C35'],
      lip: '#A8644C',
      lipLight: '#B15D46',
      iris: '#563B2C',
    },
    se: { rows: ISLAM_SE, y0: 0 },
    ne: { rows: SHAVED_NE, y0: 0 },
    bearded: true,
  }),
  // Kamaru Usman: smooth shaved head, dark skin, short beard and moustache.
  'kamaru-usman': fighter({
    k: {
      skin: SKIN.dark,
      hair: BLACK_HAIR,
      lip: '#49352A',
      lipLight: '#674631',
      iris: DEEP,
    },
    se: { rows: USMAN_SE, y0: 0 },
    ne: { rows: USMAN_NE, y0: 0 },
    bearded: true,
  }),
  // Khamzat Chimaev: shaved head, thick dark full beard, intense brows.
  'khamzat-chimaev': fighter({
    k: {
      skin: SKIN.fair,
      hair: BLACK_HAIR,
      buzz: ['#D6B28C', '#B08A6E', '#8C6A52'],
      lip: '#A8644C',
      lipLight: '#C87865',
      iris: '#563B2C',
    },
    se: { rows: KHAMZAT_SE, y0: 0 },
    ne: { rows: SHAVED_NE, y0: 0 },
    thickBrows: true,
    bearded: true,
  }),
  // Zabit Magomedsharipov: short dark hair, trimmed beard, slim face.
  'zabit-magomedsharipov': fighter({
    k: {
      skin: SKIN.light,
      hair: BLACK_HAIR,
      lip: '#A8644C',
      lipLight: '#B15D46',
      iris: '#563B2C',
    },
    se: { rows: ZABIT_SE, y0: -2 },
    ne: { rows: BEARD_NE, y0: -2 },
    bearded: true,
  }),
  // Muhammad Ali: short cropped hair, clean-shaven, broad nose, full lips.
  'muhammad-ali': fighter({
    k: {
      skin: SKIN.brown,
      hair: BLACK_HAIR,
      lip: '#704C36',
      lipLight: '#A65D4F',
      iris: DEEP,
    },
    se: { rows: ALI_SE, y0: -2 },
    ne: { rows: ALI_NE, y0: -2 },
    thickBrows: true,
    bearded: false,
  }),
};
