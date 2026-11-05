import type { Face, PortraitDef } from './core';

/*
 * Footballers and public figures. Likeness from the reference photos the
 * project owner supplied (see DECISIONS.md, "Sharp heads"). Each head is
 * painted by hand-placed rules on the 2× head grid: skin planes lit from the
 * top left, then the person's own hair, beard, brows, eyes, nose and mouth.
 *
 * SE layout (2× head space): forehead y 0–7, brows y 8–9, lashes y 11, eyes
 * y 12, nose tip x 20–21 y 14–15, mouth line y 18, chin y 20–21; the near
 * eye sits at x 10–12, the far eye at x 17–18, the ear at x 4–7, y 10–15.
 */
type P = [number, number];
const INK = '#3B322E',
  WHITE = '#E6E4DE',
  TEETH = '#EDE6CE';

/** Skin tones: highlight, light, mid, shadow, deep. */
type Skin = {
  w: string;
  s: string;
  m: string;
  k: string;
  K: string;
  lip: string;
  lipD: string;
};
const SKIN: Record<string, Skin> = {
  'skin-2': {
    w: '#F0D4B0',
    s: '#E5BF92',
    m: '#CAA077',
    k: '#A78059',
    K: '#845C43',
    lip: '#DAA084',
    lipD: '#A96E51',
  },
  'skin-3': {
    w: '#E5BF92',
    s: '#D7AC7D',
    m: '#BA8D63',
    k: '#976A49',
    K: '#785237',
    lip: '#C08A5A',
    lipD: '#845C43',
  },
  'skin-4': {
    w: '#D7AC7D',
    s: '#C5966C',
    m: '#A67954',
    k: '#845C43',
    K: '#674631',
    lip: '#A96E51',
    lipD: '#674631',
  },
  'skin-5': {
    w: '#C5966C',
    s: '#B78B65',
    m: '#976E4C',
    k: '#785237',
    K: '#593E30',
    lip: '#A8644C',
    lipD: '#593E30',
  },
  'skin-7': {
    w: '#A97D5B',
    s: '#8E684D',
    m: '#704C36',
    k: '#563B2C',
    K: '#49352A',
    lip: '#85493A',
    lipD: '#3B322E',
  },
};
/** Black hair: sheen, light, mid, dark. */
const BLACK = ['#65564B', '#493C35', '#3B322E', '#3B322E'];

const hash = (x: number, y: number, s = 0) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

/* ───────────── skin planes ───────────── */
/** Light a bare SE head: front of the face lit, side and jaw in shade. */
function skinSE(f: Face, t: Skin, keep: (x: number, y: number) => boolean) {
  for (let y = -12; y < 32; y++)
    for (let x = -8; x < 30; x++) {
      if (!f.has(x, y) || !keep(x, y)) continue;
      let c = t.s;
      if (x < 8) c = y < 7 ? t.s : t.m; // side of the head
      if (x >= 11 && x <= 16 && y >= 1 && y <= 5) c = t.w; // forehead
      if (y >= 16 && x < 10) c = t.m; // jaw side
      if (y >= 19 && x < 9) c = t.k;
      if (y >= 21) c = x < 12 ? t.k : t.m; // under the chin
      if (x >= 19 && y >= 6 && y <= 13) c = t.m; // far side past the brow
      f.px(x, y, c);
    }
  const pts = (list: P[], c: string) =>
    list.forEach(([x, y]) => f.has(x, y) && keep(x, y) && f.px(x, y, c));
  // Brow ridge and eye sockets.
  pts(
    [
      [9, 10],
      [10, 10],
      [11, 10],
      [12, 10],
      [13, 11],
      [16, 10],
      [17, 10],
      [18, 10],
    ],
    t.m,
  );
  // Nose: lit bridge, shaded wing, nostril and the shadow under it.
  pts(
    [
      [15, 11],
      [15, 12],
      [16, 13],
      [19, 14],
    ],
    t.w,
  );
  pts(
    [
      [16, 14],
      [17, 15],
      [16, 16],
      [17, 16],
      [18, 16],
      [21, 15],
    ],
    t.k,
  );
  pts([[18, 15]], t.K);
  // Cheekbone light and the hollow below it.
  pts(
    [
      [10, 14],
      [11, 14],
      [12, 14],
      [11, 13],
    ],
    t.w,
  );
  pts(
    [
      [9, 16],
      [9, 17],
      [10, 17],
    ],
    t.m,
  );
  // Ear.
  pts(
    [
      [5, 10],
      [6, 10],
      [4, 11],
      [4, 12],
      [4, 13],
      [5, 14],
    ],
    t.s,
  );
  pts(
    [
      [5, 11],
      [6, 11],
      [5, 12],
      [5, 13],
      [6, 14],
      [6, 15],
      [7, 12],
    ],
    t.k,
  );
  pts(
    [
      [6, 12],
      [6, 13],
    ],
    t.K,
  );
}
/** Light the back of the head (NE): nape and ear on the right. */
function skinNE(f: Face, t: Skin, keep: (x: number, y: number) => boolean) {
  for (let y = -12; y < 32; y++)
    for (let x = -8; x < 30; x++) {
      if (!f.has(x, y) || !keep(x, y)) continue;
      let c = x < 9 ? t.s : t.m;
      if (y > 17) c = x < 9 ? t.m : t.k;
      f.px(x, y, c);
    }
  for (const [x, y, c] of [
    [19, 10, t.s],
    [20, 10, t.m],
    [20, 11, t.m],
    [19, 11, t.k],
    [19, 12, t.K],
    [20, 12, t.k],
    [20, 13, t.m],
    [19, 13, t.k],
    [19, 14, t.k],
    [18, 13, t.k],
  ] as [number, number, string][])
    if (f.has(x, y) && keep(x, y)) f.px(x, y, c);
}
/** A back view by region: hair and beard textured, skin lit. */
function backHead(
  f: Face,
  t: Skin,
  hair: string[],
  tex: (x: number, y: number) => number,
  beard: string[] = hair,
) {
  skinNE(f, t, (x, y) => f.region(x, y) === 'skin');
  hairFill(f, hair, (x, y) => f.region(x, y) === 'hair', tex);
  hairFill(
    f,
    beard,
    (x, y) => f.region(x, y) === 'beard',
    (x, y) => (hash(x, y, 5) - 0.5) * 0.5,
  );
}

/* ───────────── features ───────────── */
type Brow = 'thin' | 'medium' | 'thick' | 'heavy';
function brows(f: Face, colour: string, kind: Brow, light: string) {
  const up = f.brows === 'raised' ? -1 : 0,
    det = f.eyes === 'determined';
  // Near brow from the nose outward, far brow foreshortened.
  const near: P[] = det
    ? [
        [8, 8],
        [9, 8],
        [10, 9],
        [11, 9],
        [12, 10],
      ]
    : [
        [8, 9],
        [9, 8],
        [10, 8],
        [11, 8],
        [12, 9],
      ];
  const far: P[] = det
    ? [
        [16, 10],
        [17, 9],
        [18, 9],
      ]
    : [
        [16, 9],
        [17, 8],
        [18, 8],
      ];
  for (const [x, y] of [...near, ...far]) f.px(x, y + up, colour);
  if (kind === 'thick' || kind === 'heavy')
    for (const [x, y] of [
      [9, 9],
      [10, 9],
      [11, 9],
      [17, 9],
    ] as P[])
      if (!det) f.px(x, y + up, colour);
  if (kind === 'heavy') {
    f.px(13, 10 + up, colour);
    f.px(7, 9 + up, colour);
  }
  if (kind === 'thin') {
    f.px(8, 9 + up, light);
    f.px(12, 9 + up, light);
  }
}
type EyeOpts = { iris: string; lid: string; deep?: boolean; large?: boolean };
function eyes(f: Face, t: Skin, o: EyeOpts) {
  const e = f.eyes;
  if (e === 'open' || e === 'determined') {
    // Upper lash line, white, iris looking toward the nose side, lower lid.
    f.pts(
      [
        [10, 11],
        [11, 11],
        [12, 11],
      ],
      o.lid,
    );
    f.px(9, 12, o.deep ? t.k : t.m);
    f.px(10, 12, o.large ? WHITE : WHITE);
    f.px(11, 12, o.iris);
    f.px(12, 12, INK);
    f.px(13, 12, t.k);
    if (o.large) {
      f.px(9, 11, t.k);
      f.px(10, 13, WHITE);
      f.px(11, 13, o.iris);
      f.px(12, 13, t.k);
    } else
      f.pts(
        [
          [10, 13],
          [11, 13],
        ],
        t.m,
      );
    if (o.deep || e === 'determined') {
      f.pts(
        [
          [9, 11],
          [13, 11],
        ],
        t.k,
      );
      f.px(10, 12, e === 'determined' ? t.k : WHITE);
    }
    // Far eye.
    f.pts(
      [
        [17, 11],
        [18, 11],
      ],
      o.lid,
    );
    f.px(17, 12, INK);
    f.px(18, 12, o.large ? WHITE : t.k);
    if (o.large) f.px(17, 13, o.iris);
  } else if (e === 'happy') {
    // Smiling eyes: a curved lid over a slit, cheeks pushed up.
    f.pts(
      [
        [10, 12],
        [11, 11],
        [12, 11],
        [13, 12],
        [17, 11],
        [18, 12],
      ],
      o.lid,
    );
    f.pts(
      [
        [11, 12],
        [12, 12],
      ],
      INK,
    );
    f.pts(
      [
        [10, 13],
        [11, 13],
        [12, 13],
        [17, 13],
      ],
      t.w,
    );
  } else if (e === 'down') {
    f.pts(
      [
        [10, 12],
        [11, 12],
        [12, 12],
        [17, 12],
        [18, 12],
      ],
      o.lid,
    );
    f.px(11, 13, o.iris);
  } else {
    // Closed / blink.
    f.pts(
      [
        [10, 11],
        [11, 11],
        [12, 11],
        [17, 11],
      ],
      t.m,
    );
    f.pts(
      [
        [10, 12],
        [11, 12],
        [12, 12],
        [17, 12],
        [18, 12],
      ],
      o.lid,
    );
  }
}
type MouthOpts = { line: string; lower: string; upper: string };
function mouth(f: Face, t: Skin, o: MouthOpts) {
  switch (f.mouth) {
    case 'smile':
      f.pts(
        [
          [14, 18],
          [15, 18],
          [16, 18],
          [17, 18],
          [18, 17],
        ],
        o.line,
      );
      f.px(13, 17, t.k);
      f.pts(
        [
          [15, 19],
          [16, 19],
        ],
        o.lower,
      );
      break;
    case 'grin':
      f.pts(
        [
          [14, 17],
          [15, 17],
          [16, 17],
          [17, 17],
        ],
        o.upper,
      );
      f.pts(
        [
          [13, 17],
          [18, 17],
          [13, 18],
          [18, 18],
        ],
        INK,
      );
      f.pts(
        [
          [14, 18],
          [15, 18],
          [16, 18],
          [17, 18],
        ],
        TEETH,
      );
      f.pts(
        [
          [14, 19],
          [15, 19],
          [16, 19],
          [17, 19],
        ],
        o.lower,
      );
      break;
    case 'shout':
      f.pts(
        [
          [14, 17],
          [15, 17],
          [16, 17],
          [17, 17],
        ],
        o.upper,
      );
      f.pts(
        [
          [14, 18],
          [15, 18],
          [16, 18],
          [17, 18],
        ],
        TEETH,
      );
      f.pts(
        [
          [13, 18],
          [18, 18],
          [13, 19],
          [14, 19],
          [15, 19],
          [16, 19],
          [17, 19],
          [14, 20],
          [15, 20],
          [16, 20],
        ],
        INK,
      );
      f.pts(
        [
          [15, 21],
          [16, 21],
        ],
        o.lower,
      );
      break;
    case 'open':
      f.pts(
        [
          [14, 17],
          [15, 17],
          [16, 17],
        ],
        o.upper,
      );
      f.pts(
        [
          [15, 18],
          [16, 18],
        ],
        TEETH,
      );
      f.pts(
        [
          [14, 18],
          [17, 18],
          [15, 19],
          [16, 19],
        ],
        INK,
      );
      f.pts(
        [
          [15, 20],
          [16, 20],
        ],
        o.lower,
      );
      break;
    case 'flat':
      f.pts(
        [
          [14, 18],
          [15, 18],
          [16, 18],
          [17, 18],
        ],
        o.line,
      );
      f.px(15, 19, o.lower);
      break;
    case 'calm':
      f.pts(
        [
          [15, 18],
          [16, 18],
          [17, 18],
        ],
        o.line,
      );
      break;
    case 'o':
      f.pts(
        [
          [16, 18],
          [16, 19],
        ],
        INK,
      );
      break;
  }
}

/* ───────────── hair and beard ───────────── */
/** Every silhouette pixel the face does not claim gets hair. */
function hairFill(
  f: Face,
  tones: string[],
  isHair: (x: number, y: number) => boolean,
  texture: (x: number, y: number) => number,
) {
  for (let y = -14; y < 34; y++)
    for (let x = -10; x < 32; x++) {
      if (!f.has(x, y) || !isHair(x, y)) continue;
      // Lit from the top left: higher and further left is lighter.
      let v = 1.4 - (y + 6) * 0.06 - x * 0.035 + texture(x, y);
      const edge = !f.has(x + 1, y) || !f.has(x, y + 1);
      if (edge) v -= 0.35;
      f.px(x, y, tones[v > 1.15 ? 0 : v > 0.7 ? 1 : v > 0.25 ? 2 : 3]);
    }
}
const rows = (spec: Record<number, [number, number][]>) => {
  return (x: number, y: number) =>
    (spec[y] ?? []).some(([a, b]) => x >= a && x <= b);
};

/* ───────────── people ───────────── */
/** Checker dither between two colours over a mask. */
function dither(
  f: Face,
  m: (x: number, y: number) => boolean,
  a: string,
  b: string,
) {
  for (let y = -14; y < 34; y++)
    for (let x = -10; x < 32; x++)
      if (f.has(x, y) && m(x, y)) f.px(x, y, (x + y) % 2 ? a : b);
}
/** Karim Benzema: close fade, dense full black beard high on the cheeks,
 * heavy straight brows over deep-set eyes, strong straight nose. */
const benzema: PortraitDef = {
  paint(f) {
    const t = SKIN['skin-3'];
    const beardTex = (x: number, y: number) =>
      (hash(x, y, 3) - 0.5) * 0.45 + ((x * 2 + y) % 5 === 0 ? 0.4 : 0);
    if (f.away) {
      skinNE(f, t, () => true);
      // Short crop over the crown, fading to skin at the nape.
      hairFill(
        f,
        BLACK,
        (x, y) => y <= 10,
        (x, y) => (hash(x, y) - 0.5) * 0.35,
      );
      dither(f, (x, y) => y >= 11 && y <= 12 && x < 18, BLACK[1], t.K);
      dither(f, (x, y) => y >= 13 && y <= 14 && x < 18, t.K, t.k);
      hairFill(f, BLACK, (x, y) => y >= 13 && x >= 16, beardTex);
      return;
    }
    skinSE(f, t, () => true);
    // Short crop on top; the fade runs down the side to the ear.
    hairFill(
      f,
      BLACK,
      (x, y) => y <= 3 || (y <= 5 && x <= 9),
      (x, y) => (hash(x, y) - 0.5) * 0.3,
    );
    dither(f, (x, y) => y >= 6 && y <= 7 && x <= 5, BLACK[1], t.K);
    dither(f, (x, y) => y >= 8 && y <= 9 && x <= 3, t.K, t.k);
    f.pts(
      [
        [7, 6],
        [8, 6],
        [9, 6],
      ],
      t.k,
    ); // hairline at the temple
    // Beard: full and dense, cut high on the cheek, with a sideburn.
    const beard = (x: number, y: number) =>
      y >= 16 ||
      (y >= 15 && x >= 7 && x <= 12) ||
      (y >= 13 && x >= 7 && x <= 10) ||
      (y >= 10 && x >= 8 && x <= 9);
    hairFill(f, BLACK, beard, beardTex);
    f.pts(
      [
        [11, 14],
        [12, 15],
      ],
      t.k,
    ); // soft beard edge
    brows(f, INK, 'heavy', t.m);
    eyes(f, t, { iris: '#49352A', lid: INK, deep: true });
    // Lips inside the beard: the moustache hides the upper lip.
    const m = f.mouth;
    if (m === 'smile' || m === 'flat' || m === 'calm') {
      f.pts(
        [
          [14, 18],
          [15, 18],
          [16, 18],
          [17, 18],
        ],
        INK,
      );
      f.pts(
        [
          [15, 19],
          [16, 19],
        ],
        '#A8644C',
      );
    } else mouth(f, t, { line: INK, lower: '#A8644C', upper: BLACK[2] });
  },
};

/** Short-hair strands combed back with a soft wave. */
const swept = (x: number, y: number) =>
  Math.sin((x * 0.8 - y * 0.6) * 1.6) * 0.2 + (hash(x, y) - 0.5) * 0.2;
/** Tight curls: ringlets in staggered rows, a lit crescent on each. */
const curls = (x: number, y: number) => {
  const Y = y + 40,
    r = Math.floor(Y / 3),
    X = x + 40 + (r % 2) * 2 + (hash(r, 3) > 0.5 ? 1 : 0),
    cx = Math.floor(X / 3),
    u = X % 3,
    v = Y % 3,
    j = hash(cx, r) - 0.5;
  if ((u === 1 && v === 0) || (u === 0 && v === 1)) return 0.5 + j * 0.2;
  if ((u === 2 && v === 2) || (u === 2 && v === 1 && j > 0)) return -0.6;
  return j * 0.25;
};
const short = (x: number, y: number) => (hash(x, y, 7) - 0.5) * 0.45;

/** Mesut Özil: swept-up dark hair with short sides, clean-shaven, large
 * expressive eyes under straight brows, long straight nose, light skin. */
const ozil: PortraitDef = {
  paint(f) {
    const t = SKIN['skin-2'];
    if (f.away) {
      backHead(f, t, BLACK, swept);
      // Short at the back: fades out above the nape.
      dither(
        f,
        (x, y) => y >= 14 && y <= 15 && f.region(x, y) === 'hair',
        BLACK[1],
        t.K,
      );
      skinNE(f, t, (x, y) => y >= 16 && f.region(x, y) === 'hair');
      return;
    }
    skinSE(f, t, () => true);
    const hair = (x: number, y: number) =>
      y <= 3 || (y <= 5 && x <= 9) || (y <= 7 && x <= 5) || (y <= 13 && x <= 3);
    hairFill(f, BLACK, hair, swept);
    // Quiff: lit strands lifting at the front, a fringe edge at the hairline.
    f.pts(
      [
        [11, -3],
        [12, -3],
        [13, -2],
        [14, -2],
        [15, -1],
        [16, 0],
      ],
      BLACK[0],
    );
    f.pts(
      [
        [10, 4],
        [11, 4],
        [12, 4],
      ],
      BLACK[1],
    );
    dither(f, (x, y) => x <= 3 && y >= 11 && y <= 13, BLACK[1], t.K);
    brows(f, INK, 'thick', t.m);
    eyes(f, t, { iris: '#49352A', lid: INK, large: true });
    f.px(9, 11, t.m);
    mouth(f, t, { line: t.lipD, lower: t.m, upper: t.lipD });
    // Strong nose and a light shadow of stubble on the jaw and chin.
    f.pts(
      [
        [15, 13],
        [15, 14],
        [16, 15],
      ],
      t.k,
    );
    f.pts(
      [
        [9, 19],
        [10, 20],
        [12, 21],
        [8, 18],
        [13, 21],
        [11, 20],
      ],
      t.k,
    );
  },
};

/** Mohamed Salah: big curly hair, full black beard, thick brows, a wide
 * warm smile with teeth. */
const salah: PortraitDef = {
  paint(f) {
    const t = SKIN['skin-5'];
    if (f.away) {
      backHead(f, t, BLACK, curls);
      return;
    }
    skinSE(f, t, () => true);
    hairFill(f, BLACK, (x, y) => f.region(x, y) === 'hair', curls);
    // A few loose curls falling on the forehead.
    f.pts(
      [
        [16, 4],
        [17, 5],
        [12, 6],
        [13, 6],
        [11, 7],
      ],
      BLACK[1],
    );
    f.pts(
      [
        [17, 4],
        [13, 7],
      ],
      BLACK[2],
    );
    const beard = (x: number, y: number) =>
      f.region(x, y) === 'beard' || (y >= 16 && x <= 13) || y >= 20;
    hairFill(f, BLACK, beard, (x, y) => curls(x, y) * 0.6);
    f.pts(
      [
        [10, 13],
        [11, 14],
        [12, 15],
      ],
      t.k,
    ); // beard edge on the cheek
    f.pts(
      [
        [12, 13],
        [13, 14],
        [14, 13],
      ],
      t.w,
    ); // cheekbone
    brows(f, INK, 'thick', t.m);
    eyes(f, t, { iris: '#49352A', lid: INK });
    // Smile lines and lips inside the beard.
    if (f.eyes === 'happy')
      f.pts(
        [
          [9, 14],
          [10, 15],
        ],
        t.m,
      );
    const m = f.mouth;
    if (m === 'smile') {
      f.pts(
        [
          [14, 18],
          [15, 18],
          [16, 18],
          [17, 18],
          [18, 17],
        ],
        INK,
      );
      f.pts(
        [
          [15, 19],
          [16, 19],
        ],
        t.lip,
      );
    } else mouth(f, t, { line: INK, lower: t.lip, upper: BLACK[2] });
  },
};

/** Sadio Mané: close-cropped hair with a bleached streak along the side,
 * short beard on the chin and lip, broad nose and full lips. */
const GOLD = ['#EAC577', '#D8AD57', '#AF853E'];
const mane: PortraitDef = {
  paint(f) {
    const t = SKIN['skin-7'];
    // Bleached streak along the side of the head, above the ear.
    const streak = (x: number, y: number) => {
      if (x < 0 || x > 10) return -1;
      const yc = 1.5 + (10 - x) * 0.5;
      const d = y - Math.round(yc);
      return d === -1 ? 0 : d === 0 ? 1 : d === 1 && x > 3 ? 2 : -1;
    };
    if (f.away) {
      backHead(f, t, BLACK, short);
      // The streak runs back over the crown.
      for (let x = 0; x <= 8; x++) {
        const y = Math.round(3 + x * 0.45);
        f.px(x, y, GOLD[1]);
        f.px(x, y - 1, GOLD[0]);
        f.px(x, y + 1, GOLD[2]);
      }
      dither(f, (x, y) => y >= 13 && f.region(x, y) === 'hair', BLACK[1], t.K);
      return;
    }
    skinSE(f, t, () => true);
    const hair = (x: number, y: number) =>
      y <= 3 ||
      (y <= 5 && x <= 9) ||
      (y <= 7 && x <= 5) ||
      (y <= 13 && x <= 3) ||
      (y <= 15 && x <= 1);
    hairFill(f, BLACK, hair, short);
    // Shaved sides under the streak.
    dither(
      f,
      (x, y) => hair(x, y) && y >= 4 && (y >= 7 || x <= 3),
      BLACK[1],
      t.K,
    );
    for (let x = 0; x <= 17; x++)
      for (let y = -2; y <= 8; y++) {
        const k = streak(x, y);
        if (k >= 0 && f.has(x, y) && hair(x, y)) f.px(x, y, GOLD[k]);
      }
    // Short beard: moustache, chin and a line along the jaw.
    const beard = (x: number, y: number) =>
      f.region(x, y) === 'beard' ||
      (y >= 19 && x >= 8 && x <= 11) ||
      (y >= 17 && y <= 18 && x >= 6 && x <= 8);
    for (let y = 12; y < 30; y++)
      for (let x = 0; x < 26; x++)
        if (f.has(x, y) && beard(x, y))
          f.px(x, y, y === 16 ? t.k : (x + y) % 3 ? BLACK[1] : t.K);
    brows(f, INK, 'medium', t.m);
    eyes(f, t, { iris: INK, lid: INK });
    // Broad nose.
    f.pts(
      [
        [15, 15],
        [16, 16],
      ],
      t.k,
    );
    f.pts(
      [
        [17, 15],
        [18, 15],
      ],
      t.K,
    );
    mouth(f, t, { line: INK, lower: t.lip, upper: t.lipD });
  },
};

/** N'Golo Kanté: shaved head, clean-shaven, round cheeks, broad nose and
 * a big gentle smile with a gap in his front teeth. */
const kante: PortraitDef = {
  paint(f) {
    const t = SKIN['skin-7'];
    if (f.away) {
      skinNE(f, t, () => true);
      // Close stubble over the scalp, sheen on the crown.
      for (let y = -4; y <= 15; y++)
        for (let x = -2; x <= 20; x++)
          if (f.has(x, y) && !(x >= 18 && y >= 9))
            f.px(x, y, hash(x, y, 13) < 0.3 ? t.K : t.k);
      f.pts(
        [
          [6, 1],
          [7, 1],
          [8, 0],
          [9, 0],
          [5, 2],
        ],
        t.m,
      );
      return;
    }
    skinSE(f, t, () => true);
    // Very short hair: a fine dark stubble over the scalp, sheen on top.
    for (let y = -4; y <= 11; y++)
      for (let x = -2; x <= 20; x++)
        if (f.has(x, y) && (y <= 4 || (y <= 7 && x <= 7) || x <= 3))
          f.px(x, y, hash(x, y, 13) < 0.3 ? t.K : t.k);
    f.pts(
      [
        [9, 0],
        [10, 0],
        [11, 1],
        [8, 1],
        [12, 1],
      ],
      t.m,
    );
    f.pts(
      [
        [10, 1],
        [11, 0],
      ],
      t.s,
    );
    brows(f, INK, 'thin', t.m);
    eyes(f, t, { iris: INK, lid: INK });
    // Round cheeks catch the light.
    f.pts(
      [
        [10, 15],
        [11, 15],
        [12, 16],
      ],
      t.s,
    );
    // Broad nose.
    f.pts(
      [
        [15, 15],
        [16, 16],
      ],
      t.k,
    );
    f.pts(
      [
        [17, 15],
        [18, 15],
      ],
      t.K,
    );
    if (f.mouth === 'smile') {
      // His smile shows the front teeth with a small gap.
      f.pts(
        [
          [13, 17],
          [18, 17],
          [13, 18],
          [18, 18],
        ],
        INK,
      );
      f.pts(
        [
          [14, 18],
          [16, 18],
          [17, 18],
        ],
        TEETH,
      );
      f.px(15, 18, '#C8B99C');
      f.pts(
        [
          [14, 17],
          [15, 17],
          [16, 17],
          [17, 17],
        ],
        t.lipD,
      );
      f.pts(
        [
          [14, 19],
          [15, 19],
          [16, 19],
          [17, 19],
        ],
        t.lip,
      );
    } else mouth(f, t, { line: INK, lower: t.lip, upper: t.lipD });
  },
};

/** Zohran Mamdani: thick black hair swept back with volume, a full,
 * neatly trimmed black beard, thick brows and a broad smile. */
const mamdani: PortraitDef = {
  paint(f) {
    const t = SKIN['skin-4'];
    if (f.away) {
      backHead(f, t, BLACK, swept);
      return;
    }
    skinSE(f, t, () => true);
    const hair = (x: number, y: number) =>
      y <= 3 || (y <= 5 && x <= 9) || (y <= 7 && x <= 5) || (y <= 15 && x <= 3);
    hairFill(f, BLACK, hair, swept);
    // Swept-back volume: lit strands along the top, a wave at the front.
    f.pts(
      [
        [10, -3],
        [11, -3],
        [12, -4],
        [13, -4],
        [14, -3],
        [16, -2],
        [17, -1],
      ],
      BLACK[0],
    );
    f.pts(
      [
        [17, 2],
        [18, 3],
        [16, 3],
      ],
      BLACK[1],
    );
    const beard = (x: number, y: number) =>
      f.region(x, y) === 'beard' || y >= 20;
    hairFill(f, BLACK, beard, (x, y) => (hash(x, y, 9) - 0.5) * 0.4);
    f.pts(
      [
        [10, 13],
        [11, 14],
        [12, 14],
        [13, 15],
      ],
      t.k,
    ); // trimmed cheek line
    brows(f, INK, 'thick', t.m);
    eyes(f, t, { iris: '#49352A', lid: INK });
    if (f.eyes === 'happy')
      f.pts(
        [
          [8, 12],
          [9, 13],
        ],
        t.k,
      ); // crow's feet
    const m = f.mouth;
    if (m === 'smile') {
      // A wide smile showing a line of teeth.
      f.pts(
        [
          [13, 17],
          [18, 17],
          [13, 18],
          [18, 18],
        ],
        INK,
      );
      f.pts(
        [
          [14, 18],
          [15, 18],
          [16, 18],
          [17, 18],
        ],
        TEETH,
      );
      f.pts(
        [
          [15, 19],
          [16, 19],
        ],
        t.lip,
      );
    } else mouth(f, t, { line: INK, lower: t.lip, upper: BLACK[2] });
  },
};

/** Abdul El-Sayed: short dark hair with a neat side part, a short trimmed
 * beard, thick dark brows and a confident smile. */
const elSayed: PortraitDef = {
  paint(f) {
    const t = SKIN['skin-3'];
    // A short, neatly edged beard: jaw, chin, moustache and sideburns.
    const stubble = (x: number, y: number) =>
      f.has(x, y) &&
      (y >= 19 ||
        (y >= 16 && (x <= 13 || x >= 18)) ||
        (y >= 15 && x >= 7 && x <= 11) ||
        (y >= 11 && x >= 7 && x <= 9));
    if (f.away) {
      backHead(f, t, BLACK, short);
      dither(f, (x, y) => y >= 13 && f.region(x, y) === 'hair', BLACK[1], t.K);
      return;
    }
    skinSE(f, t, () => true);
    const hair = (x: number, y: number) =>
      y <= 3 || (y <= 5 && x <= 9) || (y <= 7 && x <= 5) || (y <= 15 && x <= 3);
    hairFill(f, BLACK, hair, swept);
    // Side part and a lift at the front.
    f.pts(
      [
        [6, -1],
        [7, 0],
        [8, 0],
      ],
      t.k,
    );
    f.pts(
      [
        [13, -2],
        [14, -2],
        [15, -1],
        [16, 0],
      ],
      BLACK[0],
    );
    dither(f, (x, y) => x <= 3 && y >= 11 && y <= 15, BLACK[1], t.K);
    // Short beard: dense dark stubble with skin showing through.
    for (let y = 10; y < 30; y++)
      for (let x = 0; x < 26; x++)
        if (f.has(x, y) && stubble(x, y))
          f.px(
            x,
            y,
            !f.has(x, y - 1) || !stubble(x, y - 1) || !stubble(x - 1, y)
              ? t.k
              : hash(x, y, 11) < 0.12
                ? t.K
                : BLACK[1],
          );
    f.pts(
      [
        [14, 16],
        [15, 16],
        [16, 16],
        [17, 17],
        [18, 17],
        [13, 17],
      ],
      BLACK[2],
    ); // moustache
    brows(f, INK, 'thick', t.m);
    eyes(f, t, { iris: '#49352A', lid: INK });
    mouth(f, t, { line: INK, lower: t.lip, upper: INK });
  },
};

export const FOOTBALL_PUBLIC: Record<string, PortraitDef> = {
  'karim-benzema': benzema,
  'mesut-ozil': ozil,
  'mohamed-salah': salah,
  'sadio-mane': mane,
  'ngolo-kante': kante,
  'zohran-mamdani': mamdani,
  'abdul-el-sayed': elSayed,
};
