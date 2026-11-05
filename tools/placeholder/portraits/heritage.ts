import type { Face, PortraitDef } from './core';

/*
 * Golden-age scholars. No photographs exist: looks follow traditional
 * portraits, statues, stamps and banknotes, and are kept distinct from one
 * another (beard shape and colour, age, brows, nose, turban colour and wrap).
 *
 * Painting is in 2× head space (see core.ts): the face is turned toward the
 * viewer's right, brows on rows 8–9, eyes 12–13, nose tip at x 20–21 on rows
 * 14–15, mouth 18–19. Light comes from the top left.
 */
type Pt = [number, number];
const INK = '#3B322E',
  EYE_WHITE = '#E6E4DE',
  EYE_DIM = '#C9C3B8',
  TEETH = '#EFE3C6',
  MOUTH = '#704C36';

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const pick = (tones: string[], v: number, steps: number[]) => {
  for (let i = 0; i < steps.length; i++) if (v > steps[i]) return tones[i];
  return tones[tones.length - 1];
};

/* ───────────── turban ───────────── */
type Turban = {
  /** Sheen, light, mid, shadow, deep fold. */
  tones: string[];
  /** Height of each wound band in px, and its tilt across the dome. */
  band: number;
  tilt: number;
  /** Small cap (kulah) showing at the crown. */
  cap?: string[];
  /** Tail hanging behind the ear: own tones (default the turban's). */
  tail?: string[];
};
function paintTurban(f: Face, t: Turban) {
  const T = t.tones,
    tail = t.tail ?? T;
  for (let y = -12; y < 32; y++)
    for (let x = -8; x < 32; x++) {
      if (f.region(x, y) !== 'hat') continue;
      // The tail falls behind the ear (SE: left edge; NE: the back, centre).
      const isTail = f.away ? y >= 6 && x >= 10 && x <= 18 : y >= 6 && x < 6;
      if (isTail) {
        // Vertical folds; lit on the left, darker where it meets the face.
        const edge = f.away ? x - 12 : x;
        let v = 0.55 - (y - 6) * 0.025 + (f.away ? 0 : -edge * 0.07);
        if ((edge + Math.floor(y / 5)) % 3 === 2) v -= 0.3;
        if (!f.has(x, y + 1)) v -= 0.25;
        f.px(x, y, pick(tail, v, [0.62, 0.38, 0.1, -0.2]));
        continue;
      }
      // Dome: wound bands running across, lit from the top left.
      const dx = (x + 0.5 - 11) / 13,
        dy = (y + 0.5 + 1) / 8,
        dz = Math.sqrt(Math.max(0.05, 1 - dx * dx - dy * dy));
      let v = (-0.52 * dx - 0.6 * dy + 0.6 * dz) / Math.hypot(dx, dy, dz);
      // Wraps cross: alternate bands lean the other way.
      const row = Math.floor((y + 12) / t.band),
        lean = (row % 2 ? -1 : 1) * (f.away ? -1 : 1) * t.tilt,
        b = y + (x - 11) * lean + 0.012 * (x - 11) ** 2;
      const k = (((b % t.band) + t.band) % t.band) / t.band;
      // Each band is rounded: light on top, a fold line at its bottom.
      v += k < 0.34 ? 0.12 : k > 0.75 ? -0.32 : 0;
      // Brim across the forehead sits a little forward and in shade below.
      if (y >= 4) v -= 0.12;
      if (!f.has(x + 1, y) || !f.has(x, y + 1)) v -= 0.2;
      v += (hash(x, y) - 0.5) * 0.05;
      f.px(x, y, pick(T, v, [0.78, 0.48, 0.18, -0.12]));
    }
  if (t.cap)
    // The cap's top shows through the crown of the wrap.
    for (let y = -10; y <= -6; y++)
      for (let x = 8; x <= 14; x++) {
        if (f.region(x, y) !== 'hat') continue;
        if (y === -6 && (x < 9 || x > 13)) continue;
        f.px(x, y, x < 10 ? t.cap[0] : x > 12 ? t.cap[2] : t.cap[1]);
      }
}

/* ───────────── face ───────────── */
type Scholar = {
  /** Highlight, light, mid, shadow, deep. */
  skin: string[];
  /** Beard and hair: sheen, light, mid, dark, deepest. */
  beard: string[];
  /** Grey strands mixed in (salt and pepper). */
  grey?: string[];
  greyAmount?: number;
  /** Where the beard grows. */
  beardShape: 'full' | 'trim' | 'short' | 'long' | 'broad';
  /** Row where the cheek beard starts (higher = less cheek). */
  cheekTop: number;
  brows: 'heavy' | 'medium' | 'arched' | 'low';
  browColour: string;
  eyes: 'intense' | 'calm' | 'kind' | 'hooded';
  nose: 'straight' | 'aquiline' | 'long' | 'broad';
  /** 0 young … 3 old. */
  age: 0 | 1 | 2 | 3;
  cheeks: 'full' | 'hollow';
  lip: string;
  turban: Turban;
  /** Hair seen under the turban at the back. */
  hair: string[];
};
/** Skin of the face with the planes of a 3/4 face lit from the top left. */
function paintSkin(f: Face, s: Scholar) {
  const T = s.skin;
  for (let y = 4; y < 30; y++)
    for (let x = 4; x < 26; x++) {
      if (!f.has(x, y) || f.region(x, y) === 'hat') continue;
      // Side plane (toward the ear) and front plane; the far side beyond
      // the nose turns away.
      let v = 0.55;
      if (x <= 7) v = 0.3;
      if (x >= 18 && y >= 8 && y <= 13) v = 0.25;
      if (y === 6) v -= 0.35; // cast shadow under the turban
      if (y === 7 && x <= 9) v -= 0.2;
      if (y >= 20) v -= 0.35; // under the jaw
      if (x >= 10 && x <= 14 && y >= 6 && y <= 8) v += 0.25; // forehead sheen
      if (x >= 9 && x <= 11 && y >= 14 && y <= 15) v += 0.2; // cheekbone
      if (s.cheeks === 'hollow' && x >= 9 && x <= 12 && y >= 16 && y <= 18)
        v -= 0.3;
      f.px(x, y, pick(T, v, [0.75, 0.45, 0.2, -0.05]));
    }
}
function browRow(f: Face, s: Scholar) {
  const c = s.browColour,
    det = f.eyes === 'determined' || s.brows === 'low';
  // Near brow over the eye, far brow beyond the bridge; one row, with an
  // arch pixel above (heavy brows get a second row).
  const near: Pt[] = det
    ? [
        [7, 10],
        [8, 9],
        [9, 9],
        [10, 10],
        [11, 10],
      ]
    : s.brows === 'arched'
      ? [
          [7, 10],
          [8, 9],
          [9, 9],
          [10, 9],
          [11, 10],
        ]
      : [
          [7, 10],
          [8, 9],
          [9, 9],
          [10, 9],
          [11, 9],
        ];
  for (const [x, y] of near) f.px(x, y, c);
  if (s.brows === 'heavy')
    for (const [x, y] of near.slice(1, 4)) f.px(x, y + 1, c);
  const far: Pt[] = det
    ? [
        [15, 10],
        [16, 10],
        [17, 9],
      ]
    : [
        [15, 9],
        [16, 9],
        [17, 9],
        [18, 10],
      ];
  for (const [x, y] of far) f.px(x, y, c);
  if (s.brows === 'heavy') f.px(16, 10, c);
}
function eyePair(f: Face, s: Scholar) {
  const T = s.skin,
    iris = '#563B2C';
  // Lid crease under the brow (deeper with age or an intent look).
  if (s.age >= 2 || s.eyes === 'intense')
    f.pts(
      [
        [9, 11],
        [10, 11],
        [16, 11],
      ],
      T[2],
    );
  const hooded = s.eyes === 'hooded' || s.age >= 3;
  switch (f.eyes) {
    case 'open':
    case 'determined': {
      f.pts(
        [
          [8, 12],
          [9, 12],
          [10, 12],
          [11, 12],
        ],
        INK,
      );
      f.px(8, 13, hooded ? T[2] : EYE_DIM);
      f.px(9, 13, EYE_WHITE);
      f.px(10, 13, s.eyes === 'kind' ? iris : INK);
      f.px(11, 13, s.eyes === 'intense' ? INK : iris);
      if (hooded) f.px(9, 12, T[3]);
      f.pts(
        [
          [16, 12],
          [17, 12],
        ],
        INK,
      );
      f.px(16, 13, INK);
      f.px(17, 13, EYE_DIM);
      // Lower lid.
      f.pts(
        [
          [9, 14],
          [10, 14],
        ],
        T[2],
      );
      break;
    }
    case 'happy':
      f.pts(
        [
          [8, 13],
          [9, 12],
          [10, 12],
          [11, 13],
          [16, 12],
          [17, 13],
        ],
        INK,
      );
      f.pts(
        [
          [9, 13],
          [10, 13],
        ],
        T[2],
      );
      f.pts(
        [
          [9, 14],
          [10, 14],
        ],
        T[0],
      );
      break;
    case 'down':
      f.pts(
        [
          [8, 12],
          [9, 12],
          [10, 12],
          [11, 12],
          [16, 12],
          [17, 12],
        ],
        T[2],
      );
      f.pts(
        [
          [8, 13],
          [9, 13],
          [10, 13],
          [11, 13],
          [16, 13],
          [17, 13],
        ],
        INK,
      );
      break;
    case 'closed':
    case 'blink':
      f.pts(
        [
          [8, 12],
          [9, 12],
          [10, 12],
          [11, 12],
          [16, 12],
        ],
        T[2],
      );
      f.pts(
        [
          [8, 13],
          [9, 13],
          [10, 13],
          [16, 13],
          [17, 13],
        ],
        INK,
      );
      break;
  }
}
function nose(f: Face, s: Scholar) {
  const T = s.skin;
  // Bridge catches the light; the far cheek is in the nose's shadow.
  f.pts(
    [
      [14, 11],
      [15, 12],
      [16, 13],
    ],
    T[0],
  );
  f.pts(
    [
      [18, 12],
      [18, 13],
    ],
    T[3],
  );
  f.px(20, 14, T[0]);
  f.px(19, 14, T[1]);
  f.px(21, 15, T[2]);
  // Wing of the nostril and the shadow under the tip.
  f.pts(
    [
      [17, 15],
      [18, 15],
    ],
    T[3],
  );
  f.px(19, 15, T[4]);
  f.px(16, 14, T[2]);
  if (s.nose === 'aquiline') {
    // A bump on the bridge and a tip that turns down.
    f.pts(
      [
        [17, 12],
        [17, 11],
      ],
      T[0],
    );
    f.px(20, 15, T[3]);
    f.px(16, 15, T[3]);
  }
  if (s.nose === 'long') {
    f.px(15, 14, T[2]);
    f.px(20, 15, T[2]);
  }
  if (s.nose === 'broad') {
    f.pts(
      [
        [16, 15],
        [15, 15],
      ],
      T[3],
    );
  }
}
function lines(f: Face, s: Scholar) {
  const T = s.skin;
  if (s.age >= 1) f.pts([[12, 15]], T[2]);
  if (s.age >= 2) {
    // Forehead lines and crow's feet.
    f.pts(
      [
        [10, 7],
        [11, 7],
        [12, 7],
        [13, 7],
      ],
      T[2],
    );
    f.pts(
      [
        [7, 12],
        [7, 13],
      ],
      T[3],
    );
    f.px(13, 16, T[3]);
  }
  if (s.age >= 3) {
    f.pts(
      [
        [9, 15],
        [10, 15],
        [12, 16],
      ],
      T[3],
    );
  }
}
/** Mask of beard pixels for a shape (the rest of the silhouette is skin). */
function beardMask(f: Face, s: Scholar) {
  const m = new Set<string>();
  for (let y = 8; y < 32; y++)
    for (let x = 4; x < 26; x++) {
      if (!f.has(x, y)) continue;
      const r = f.region(x, y);
      if (r === 'hat' || (r === 'hair' && y < 10)) continue;
      // Sideburn and cheek line, then everything below the mouth.
      let on = false;
      if (x <= 7 && y >= s.cheekTop - 2) on = true;
      if (y >= s.cheekTop && x <= 12 - Math.max(0, s.cheekTop + 4 - y)) on = true;
      if (y >= 16 && y <= 17 && x >= 14) on = true; // moustache
      if (y >= 18 && (x <= 12 || x >= 18)) on = true;
      if (y >= 20) on = true;
      if (s.beardShape === 'short' && y >= 14 && y < 18 && x <= 9) on = y >= 16;
      if (s.beardShape === 'trim' && y < 16 && x > 7) on = false;
      // Only where the 1× head has beard or chin: keep the jaw in skin above it.
      if (on && r === 'skin' && y < 16 && x > 9) on = false;
      if (on) m.add(`${x},${y}`);
    }
  return m;
}
function paintBeard(f: Face, s: Scholar) {
  const B = s.beard,
    mask = beardMask(f, s);
  const has = (x: number, y: number) => mask.has(`${x},${y}`);
  for (const key of mask) {
    const [x, y] = key.split(',').map(Number);
    // Volume: lit on the upper left, darker below and to the right.
    let v = 0.45 - (y - 16) * 0.03 - (x - 10) * 0.025;
    // Strands: vertical streaks that wave a little.
    const strand = (x + Math.floor((y + (x % 3)) / 4)) % 3;
    v += strand === 0 ? 0.18 : strand === 2 ? -0.18 : 0;
    if (s.beardShape === 'long' || s.beardShape === 'broad')
      v += Math.sin(y * 0.8 + x * 0.3) * 0.08;
    if (!has(x, y + 1) && !f.has(x, y + 1)) v -= 0.15;
    if (!has(x - 1, y) && f.has(x - 1, y)) v += 0.1; // soft edge on the cheek
    v += (hash(x, y) - 0.5) * 0.18;
    let c = pick(B, v, [0.78, 0.5, 0.25, -0.05]);
    if (s.grey && hash(x * 7, Math.floor(y / 3)) < (s.greyAmount ?? 0.3))
      c = s.grey[Math.min(s.grey.length - 1, B.indexOf(c) <= 1 ? 0 : 1)];
    f.px(x, y, c);
  }
  // Cheek edge: a few hairs over the skin so the line is not hard.
  for (const key of mask) {
    const [x, y] = key.split(',').map(Number);
    if (!has(x + 1, y) && f.region(x + 1, y) !== 'hat' && y < 18 && hash(x, y) > 0.5)
      f.px(x + 1, y, B[3]);
  }
}
function mouth(f: Face, s: Scholar) {
  const T = s.skin,
    lip = s.lip;
  // The mouth sits in the beard: lips stay visible.
  const set = (x: number, y: number, c: string) => f.px(x, y, c);
  switch (f.mouth) {
    case 'smile':
      set(13, 18, INK);
      for (const x of [14, 15, 16]) set(x, 19, MOUTH);
      set(17, 18, INK);
      for (const x of [14, 15, 16]) set(x, 18, T[2]);
      for (const x of [14, 15]) set(x, 20, lip);
      break;
    case 'grin':
      set(13, 18, INK);
      for (const x of [14, 15, 16]) set(x, 18, TEETH);
      set(17, 18, INK);
      for (const x of [14, 15, 16]) set(x, 19, INK);
      for (const x of [14, 15]) set(x, 20, lip);
      break;
    case 'open':
      for (const x of [14, 15, 16]) set(x, 18, lip);
      set(14, 19, INK);
      set(15, 19, TEETH);
      set(16, 19, INK);
      for (const x of [14, 15, 16]) set(x, 20, INK);
      set(15, 21, lip);
      break;
    case 'shout':
      for (const x of [13, 14, 15, 16]) set(x, 18, TEETH);
      for (const x of [13, 14, 15, 16]) set(x, 19, INK);
      for (const x of [14, 15]) set(x, 20, INK);
      break;
    case 'o':
      set(15, 19, INK);
      set(15, 20, INK);
      set(14, 19, lip);
      set(16, 19, lip);
      break;
    case 'calm':
      for (const x of [14, 15, 16]) set(x, 18, T[2]);
      for (const x of [14, 15, 16]) set(x, 19, MOUTH);
      set(15, 20, lip);
      break;
    case 'flat':
      for (const x of [13, 14, 15, 16]) set(x, 19, MOUTH);
      set(14, 20, lip);
      break;
  }
}
/** Back of the head (NE): hair under the turban, the ear and the nape. */
function paintBack(f: Face, s: Scholar) {
  const T = s.skin,
    H = s.hair;
  for (let y = 4; y < 30; y++)
    for (let x = -4; x < 26; x++) {
      if (!f.has(x, y)) continue;
      const r = f.region(x, y);
      if (r === 'hat') continue;
      if (r === 'skin') {
        let v = 0.4 - (y >= 20 ? 0.35 : 0) - (x >= 20 ? 0.2 : 0);
        if (x === 19 && y >= 11 && y <= 14) v -= 0.3; // ear fold
        f.px(x, y, pick(T, v, [0.75, 0.45, 0.2, -0.05]));
      } else {
        // Hair (r 'hair') and the beard's edge (r 'beard').
        let v = 0.3 - (y - 6) * 0.03 - x * 0.01;
        v += ((x + Math.floor(y / 3)) % 3 === 0 ? 0.15 : 0) + (hash(x, y) - 0.5) * 0.2;
        if (y === 6 || y === 7) v -= 0.25; // shadow under the turban
        let c = pick(H, v, [0.7, 0.4, 0.15, -0.1]);
        if (r === 'beard') c = pick(s.beard, v, [0.7, 0.4, 0.15, -0.1]);
        f.px(x, y, c);
      }
    }
}
function scholar(s: Scholar): PortraitDef {
  return {
    paint: (f) => {
      if (f.away) {
        paintBack(f, s);
        paintTurban(f, s.turban);
        return;
      }
      paintSkin(f, s);
      paintBeard(f, s);
      lines(f, s);
      browRow(f, s);
      eyePair(f, s);
      nose(f, s);
      mouth(f, s);
      paintTurban(f, s.turban);
    },
  };
}

/* ───────────── colours ───────────── */
const SKIN = {
  1: ['#F7EBD0', '#F0D4B0', '#D6B28C', '#B28C6B', '#A78059'],
  2: ['#F0D4B0', '#E5BF92', '#CAA077', '#A78059', '#976A49'],
  3: ['#E5BF92', '#D7AC7D', '#BA8D63', '#976A49', '#845C43'],
  4: ['#D7AC7D', '#C5966C', '#A67954', '#845C43', '#785237'],
};
const BLACK = ['#80766B', '#65564B', '#493C35', '#3B322E', '#2E2B34'];
const DARK_BROWN = ['#8C6A52', '#664A39', '#563B2C', '#49352A', '#3B322E'];
const GREY = ['#E6E8E1', '#D7DCD2', '#B5C3BA', '#8B9D96', '#6C7176'];
const SILVER = ['#FBFAF4', '#E6E8E1', '#D7DCD2', '#B9C0BE', '#9AA3A6'];
const WHITE_LINEN = ['#FBFAF4', '#F5EEDB', '#EDE6CE', '#CCC4AA', '#B39E74'];
const COOL_WHITE = ['#FBFBF7', '#EEF0EC', '#DADFDC', '#B9C0BE', '#9AA3A6'];
const IVORY = ['#F7EBD0', '#EFE3C6', '#E4D5B9', '#C8B99C', '#A9A296'];
const WOOL = ['#F5EEDB', '#EDE6CE', '#D7BB8D', '#B69872', '#8E7255'];

/* ───────────── Fatima al-Fihri (khimar: face only) ───────────── */
const fatima: PortraitDef = {
  paint: (f) => {
    const T = SKIN[3],
      C = ['#FBFAF4', '#F5EEDB', '#EDE6CE', '#D7BB8D', '#B69872'];
    // The face opening: rows of the normal face, widened by a row each way
    // so brow and eye pixels count as face.
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
    const rows = [...spans.keys()],
      top = Math.min(...rows),
      bottom = Math.max(...rows);
    const face = (x: number, y: number) => {
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
      if (y === top || y === bottom) [lo, hi] = spans.get(y) ?? [lo, hi];
      return x >= lo && x <= hi;
    };
    for (let y = -12; y < 34; y++)
      for (let x = -8; x < 32; x++) {
        if (!f.has(x, y)) continue;
        if (face(x, y)) {
          let v = 0.55;
          if (x <= 9) v = 0.32;
          if (x >= 18 && y >= 8 && y <= 13) v = 0.25;
          if (y >= bottom - 1) v -= 0.3;
          if (x >= 10 && x <= 14 && y >= top && y <= 7) v += 0.25;
          if (x >= 9 && x <= 11 && y >= 14 && y <= 15) v += 0.2;
          // The scarf's edge shades the top of the face.
          if (!face(x, y - 1) || !face(x - 1, y)) v -= 0.25;
          f.px(x, y, pick(T, v, [0.75, 0.45, 0.2, -0.05]));
          continue;
        }
        // Cloth: lit top left; a folded hem around the face, light on its
        // upper side and shaded below; soft folds under the chin.
        const dx = (x + 0.5 - 9) / 18,
          dy = (y + 0.5 - 2) / 18;
        let v = 0.62 - dx * 0.45 - dy * 0.4;
        const hem =
          !f.away &&
          (face(x + 1, y) || face(x - 1, y) || face(x, y + 1) || face(x, y - 1));
        if (hem) v += y < 12 ? 0.25 : -0.35;
        if (y > bottom && y <= bottom + 4) v += Math.sin(x * 0.9 + y) * 0.16;
        if (!f.has(x, y + 1) || !f.has(x + 1, y)) v -= 0.22;
        v += (hash(x, y) - 0.5) * 0.04;
        f.px(x, y, pick(C, v, [0.8, 0.5, 0.15, -0.2]));
      }
    if (f.away) return;
    // Soft brows, eyes with lashes, a small nose and a gentle mouth.
    const brow = '#664A39';
    f.pts(
      [
        [8, 10],
        [9, 9],
        [10, 9],
        [11, 10],
        [15, 10],
        [16, 9],
        [17, 10],
      ],
      brow,
    );
    eyePair(f, { skin: T, eyes: 'kind', age: 0 } as Scholar);
    if (f.eyes === 'open') f.px(8, 12, '#49352A');
    f.pts(
      [
        [15, 12],
        [16, 13],
      ],
      T[0],
    );
    f.px(18, 13, T[3]);
    f.pts(
      [
        [17, 15],
        [18, 15],
      ],
      T[3],
    );
    f.px(10, 15, '#DAA084');
    f.px(11, 15, T[0]);
    mouth(f, { skin: T, lip: '#C87865' } as Scholar);
  },
};

export const HERITAGE: Record<string, PortraitDef> = {
  // Iranian portraits: a broad full dark beard, calm gaze, large white turban.
  'ibn-sina': scholar({
    skin: SKIN[1],
    beard: BLACK,
    beardShape: 'full',
    cheekTop: 12,
    brows: 'medium',
    browColour: '#3B322E',
    eyes: 'calm',
    nose: 'straight',
    age: 1,
    cheeks: 'full',
    lip: '#A8644C',
    hair: BLACK,
    turban: { tones: WHITE_LINEN, band: 3, tilt: 0.25 },
  }),
  // Soviet stamp: a neat short beard, hooked nose, turban round a dark cap.
  'al-khwarizmi': scholar({
    skin: SKIN[4],
    beard: BLACK,
    beardShape: 'trim',
    cheekTop: 16,
    brows: 'arched',
    browColour: '#2E2B34',
    eyes: 'kind',
    nose: 'aquiline',
    age: 1,
    cheeks: 'hollow',
    lip: '#A65D4F',
    hair: BLACK,
    turban: {
      tones: IVORY,
      band: 4,
      tilt: -0.2,
      cap: ['#548A9B', '#377082', '#225C69'],
    },
  }),
  'fatima-al-fihri': fatima,
  // Iraqi banknote: thick full beard, heavy brows and an intent gaze.
  'ibn-al-haytham': scholar({
    skin: SKIN[3],
    beard: BLACK,
    beardShape: 'broad',
    cheekTop: 12,
    brows: 'heavy',
    browColour: '#2E2B34',
    eyes: 'intense',
    nose: 'long',
    age: 2,
    cheeks: 'full',
    lip: '#A8644C',
    hair: BLACK,
    turban: { tones: COOL_WHITE, band: 2.5, tilt: 0.12 },
  }),
  // Córdoba statue, in later life: a rounded beard going grey, kind eyes.
  'al-zahrawi': scholar({
    skin: SKIN[2],
    beard: DARK_BROWN,
    grey: ['#D7DCD2', '#A9A296'],
    greyAmount: 0.38,
    beardShape: 'full',
    cheekTop: 14,
    brows: 'medium',
    browColour: '#49352A',
    eyes: 'kind',
    nose: 'straight',
    age: 2,
    cheeks: 'full',
    lip: '#A8644C',
    hair: DARK_BROWN,
    turban: { tones: WOOL, band: 3, tilt: 0.3 },
  }),
  // No portrait survives: a younger engineer with a short black beard and a
  // cream working turban wound flat and wide.
  'al-jazari': scholar({
    skin: SKIN[4],
    beard: BLACK,
    beardShape: 'short',
    cheekTop: 16,
    brows: 'low',
    browColour: '#2E2B34',
    eyes: 'intense',
    nose: 'broad',
    age: 0,
    cheeks: 'full',
    lip: '#A65D4F',
    hair: BLACK,
    turban: { tones: WOOL, band: 3.5, tilt: -0.3 },
  }),
  // Stamps: an old man with a long white beard and a full white turban.
  'al-biruni': scholar({
    skin: SKIN[3],
    beard: SILVER,
    beardShape: 'long',
    cheekTop: 12,
    brows: 'arched',
    browColour: '#B9C0BE',
    eyes: 'hooded',
    nose: 'aquiline',
    age: 3,
    cheeks: 'hollow',
    lip: '#A8644C',
    hair: SILVER,
    turban: { tones: WHITE_LINEN, band: 2, tilt: 0.18 },
  }),
  // Tunis statue: a lean face, black beard of middle length, stern brows.
  'ibn-khaldun': scholar({
    skin: SKIN[3],
    beard: BLACK,
    grey: ['#80766B', '#8B9D96'],
    greyAmount: 0.12,
    beardShape: 'trim',
    cheekTop: 15,
    brows: 'low',
    browColour: '#2E2B34',
    eyes: 'calm',
    nose: 'long',
    age: 2,
    cheeks: 'hollow',
    lip: '#A8644C',
    hair: BLACK,
    turban: { tones: WHITE_LINEN, band: 4.5, tilt: 0.05, tail: WOOL },
  }),
  // Córdoba statue: a broad grey beard, thoughtful brows, a cream turban.
  'ibn-rushd': scholar({
    skin: SKIN[2],
    beard: GREY,
    beardShape: 'broad',
    cheekTop: 13,
    brows: 'heavy',
    browColour: '#8B9D96',
    eyes: 'calm',
    nose: 'straight',
    age: 2,
    cheeks: 'full',
    lip: '#A8644C',
    hair: GREY,
    turban: { tones: WOOL, band: 3, tilt: -0.15 },
  }),
};
