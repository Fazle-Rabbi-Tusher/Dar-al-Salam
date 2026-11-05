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
type Skin = { w: string; s: string; m: string; k: string; K: string; lip: string; lipD: string };
const SKIN: Record<string, Skin> = {
  'skin-2': {
    w: '#F0D4B0',
    s: '#E5BF92',
    m: '#CAA077',
    k: '#A78059',
    K: '#845C43',
    lip: '#C87865',
    lipD: '#A65D4F',
  },
  'skin-3': {
    w: '#E5BF92',
    s: '#D7AC7D',
    m: '#BA8D63',
    k: '#976A49',
    K: '#785237',
    lip: '#B15D46',
    lipD: '#86392C',
  },
  'skin-4': {
    w: '#D7AC7D',
    s: '#C5966C',
    m: '#A67954',
    k: '#845C43',
    K: '#674631',
    lip: '#A8644C',
    lipD: '#86392C',
  },
  'skin-5': {
    w: '#C5966C',
    s: '#B78B65',
    m: '#976E4C',
    k: '#785237',
    K: '#593E30',
    lip: '#A65D4F',
    lipD: '#62352B',
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
  hairFill(f, beard, (x, y) => f.region(x, y) === 'beard', (x, y) => (hash(x, y, 5) - 0.5) * 0.5);
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
function dither(f: Face, m: (x: number, y: number) => boolean, a: string, b: string) {
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
      hairFill(f, BLACK, (x, y) => y <= 7, (x, y) => (hash(x, y) - 0.5) * 0.35);
      dither(f, (x, y) => y >= 8 && y <= 9, BLACK[1], t.K);
      dither(f, (x, y) => y >= 10 && y <= 11, t.K, t.k);
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
    f.pts([[7, 6], [8, 6], [9, 6]], t.k); // hairline at the temple
    // Beard: full and dense, cut high on the cheek, with a sideburn.
    const beard = (x: number, y: number) =>
      y >= 16 ||
      (y >= 15 && x >= 7 && x <= 12) ||
      (y >= 13 && x >= 7 && x <= 10) ||
      (y >= 10 && x >= 8 && x <= 9);
    hairFill(f, BLACK, beard, beardTex);
    f.pts([[11, 14], [12, 15]], t.k); // soft beard edge
    brows(f, INK, 'heavy', t.m);
    eyes(f, t, { iris: '#49352A', lid: INK, deep: true });
    // Lips inside the beard: the moustache hides the upper lip.
    const m = f.mouth;
    if (m === 'smile' || m === 'flat' || m === 'calm') {
      f.pts([[14, 18], [15, 18], [16, 18], [17, 18]], t.lipD);
      f.pts([[15, 19], [16, 19]], t.lip);
    } else mouth(f, t, { line: INK, lower: t.lip, upper: BLACK[2] });
  },
};

export const FOOTBALL_PUBLIC: Record<string, PortraitDef> = {
  'karim-benzema': benzema,
};
