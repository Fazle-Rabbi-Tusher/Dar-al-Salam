import fs from 'node:fs/promises';
import { Pixels, blit } from '../../packages/shared/pixels';
import { ACTIONS, type Action } from '../../packages/shared/schema';
import { canvasFor } from '../../packages/shared/canvas';
import { png, writeJson } from '../build/io';
import type { Aseprite } from '../../packages/shared/compositor';

/*
 * Procedural placeholder paper-doll parts on a 48×72 canvas (foot anchor 24,68).
 * People are ~54 px tall. Every part is drawn from one shared pose skeleton so
 * any garment, headwear and prop fits any adult base; children are scaled by
 * the compositor. Only reserved key colours and fixed palette colours are used.
 * Faces stay featureless: flat skin with at most three shade pixels.
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
  'football-kit',
  'football-kit-captain',
  'football-kit-long',
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
  head: P;
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

/** One skeleton for every part, so all layers line up frame by frame. */
function pose(action: Action, facing: 'SE' | 'NE', f: number): Pose {
  const away = facing === 'NE',
    fy = away ? -0.5 : 0.5,
    hx = away ? 0 : 1;
  const standing = (b: number): Pose => ({
    head: [19 + hx, 14 + b],
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
      const s = walkLegs(q, 4);
      q.arms[0][2] = add(q.arms[0][2], -s * 0.7, 0);
      q.arms[0][1] = add(q.arms[0][1], -s * 0.3, 0);
      q.arms[1][2] = add(q.arms[1][2], s * 0.7, 0);
      q.arms[1][1] = add(q.arms[1][1], s * 0.3, 0);
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
      q.arms[0][1] = [18, 52];
      q.arms[0][2] = [21.5, 54];
      q.arms[1][1] = [30, 52];
      q.arms[1][2] = [27.5, 54 - (f === 3 ? 2 : 0)];
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

/* ───────────── bases ───────────── */
function drawHead(p: Pixels, q: Pose, id: string) {
  const [x, y] = q.head.map(Math.round) as P,
    head = mk(p)
      .rect(x, y + 1, 10, 9)
      .rect(x + 1, y, 8, 11);
  paint(p, head, K.skin, { light: 0, dark: 0, top: false });
  // Neck shadow under the chin (not part of the face).
  if (q.mode !== 'bow' && q.mode !== 'prostrate')
    p.rect(x + 3, y + 11, 4, 2, K.skin[2]);
  const hair = mk(p);
  if (q.away) {
    hair.rect(x, y, 10, 9).rect(x + 1, y - 1, 8, 1);
    if (id === 'adult-woman')
      hair.rect(x + 1, y + 8, 8, 3).disc(x + 5, y + 1, 3);
  } else {
    hair
      .rect(x + 1, y - 1, 8, 1)
      .rect(x, y, 10, 3)
      .rect(x, y, 3, 7);
    if (id === 'adult-woman')
      hair.rect(x - 1, y + 2, 3, 9).disc(x + 1, y + 1, 3);
    if (id === 'adult-man-clean')
      hair.rect(x + 1, y - 2, 8, 1).rect(x + 4, y - 3, 5, 1);
    if (id === 'adult-man-beard')
      hair
        .rect(x + 2, y + 7, 8, 4)
        .rect(x + 3, y + 11, 6, 2)
        .rect(x + 4, y + 13, 4, 1);
    if (id === 'adult-man' || id === 'elder')
      hair
        .rect(x + 3, y + 8, 7, id === 'elder' ? 3 : 2)
        .rect(x + 8, y + 6, 2, 3);
    if (id === 'elder') hair.rect(x + 4, y + 11, 5, 2);
    // Face: at most three shade pixels for direction.
    p.pixel(x + 9, y + 5, K.skin[2]);
    p.pixel(x + 9, y + 6, K.skin[2]);
  }
  paint(p, hair, K.hair, { light: 1, dark: 1 });
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
      m.ellipse(x, y, 2.2, 1.6);
    else m.ellipse(x + (q.away ? 0.5 : 1), y + 1.2, 3, 1.7);
    paint(p, m, [F.charcoal[1], F.ink, F.ink], { light: 1, dark: 1 });
  }
}
function hands(p: Pixels, q: Pose) {
  for (const arm of q.arms) {
    const m = mk(p).disc(arm[2][0], arm[2][1] + 0.5, 1.9);
    if (q.action === 'celebrate' && arm === q.arms[1])
      m.rect(arm[2][0] - 0.5, arm[2][1] - 4, 1, 3); // raised index finger
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
    const hem = (o.hem ?? 63) + (q.walking ? 0 : 0),
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
      for (let y = q.hip[1] + 4; y < (o.hem ?? 63) - 1; y++)
        if (y % 5 !== 0)
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
    if (bottom > 50)
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
        p.rect(q.chest[0] - 1, top, 4, 16, S[1]);
        p.rect(q.chest[0] + 2, top, 1, 16, C[2]);
        if (q.mode === 'stand') p.rect(q.chest[0] - 1, q.hip[1], 4, 20, S[1]);
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
        frontLine(p, q, S[1], top + 1, q.mode === 'stand' ? 63 : top + 16);
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
          [q.hip[0] + 7, 54],
          [q.hip[0] - 7, 54],
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
      if (!q.away && upright) {
        p.rect(q.chest[0] - 2, top + 1, 6, 6, S[1]);
        p.rect(q.chest[0] - 1, top + 2, 4, 4, S[0]);
        p.rect(q.chest[0], top + 3, 2, 2, S[2]);
      }
      hands(p, q);
      break;
    }
    case 'baju-kurung': {
      const skirt = robe(p, q, S, { flare: 3 });
      for (let x = 0; x < p.width; x++)
        for (let y = 56; y < p.height; y++)
          if (skirt.has(x, y) && y % 6 === 0) p.pixel(x, y, S[0]);
      torso(p, q, C);
      if (q.mode === 'stand') {
        const m = mk(p).poly([
          [q.hip[0] - 5.6, q.hip[1] - 2],
          [q.hip[0] + 5.6, q.hip[1] - 2],
          [q.hip[0] + 7.5, 56],
          [q.hip[0] - 7.5, 56],
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
        for (let y = top + 5; y < top + 30; y += 4)
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
        cloak.rect(q.chest[0] - 7, top, 3, 22).rect(q.chest[0] + 4, top, 3, 22);
        if (q.mode === 'stand')
          cloak.poly([
            [q.chest[0] - 7.5, top + 20],
            [q.chest[0] - 4, top + 20],
            [q.chest[0] - 5, 61],
            [q.chest[0] - 10, 61],
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
        const m = mk(p).rect(q.chest[0] - 4, top + 5, 9, 9);
        if (q.mode === 'stand')
          m.poly([
            [q.hip[0] - 5, q.hip[1] - 2],
            [q.hip[0] + 6, q.hip[1] - 2],
            [q.hip[0] + 6.5, 58],
            [q.hip[0] - 5.5, 58],
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
    case 'lab-coat': {
      trousers(p, q, S);
      torso(p, q, S);
      if (q.mode === 'stand') {
        const coat = mk(p).poly([
          [q.hip[0] - 5.8, q.chest[1]],
          [q.hip[0] + 5.8, q.chest[1]],
          [q.hip[0] + 7.5, 57],
          [q.hip[0] - 7.5, 57],
        ]);
        paint(p, coat, C, { light: 2, dark: 2 });
      } else if (q.mode === 'chair') robe(p, q, C, { flare: 1 });
      const t = mk(p).capsule(q.chest, q.hip, 5.9);
      paint(p, t, C);
      if (!q.away && upright) {
        p.rect(q.chest[0] - 1, top, 4, q.mode === 'stand' ? 25 : 14, S[1]);
        p.rect(q.chest[0] - 1, top, 1, q.mode === 'stand' ? 25 : 14, S[0]);
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
          if (jeans.has(x, y) && (x + y) % 7 === 0 && y > 50)
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
          if (r.has(x, y) && y > 46 && (x + Math.floor(y / 3)) % 6 === 0)
            p.pixel(x, y, C[0]);
      torso(p, q, C, 5.8);
      belt(p, q, S, 2);
      neck(C[2]);
      sleeves(p, q, C);
      break;
    }
    case 'football-kit':
    case 'football-kit-captain':
    case 'football-kit-long': {
      const long = id === 'football-kit-long',
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
      else {
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
function face(p: Pixels, x: number, y: number) {
  const m = mk(p)
    .rect(x + 3, y + 3, 6, 7)
    .rect(x + 4, y + 10, 4, 1);
  paint(p, m, K.skin, { light: 0, dark: 0, top: false });
  p.pixel(x + 8, y + 6, K.skin[2]);
  p.pixel(x + 8, y + 7, K.skin[2]);
}
function drawHeadwear(p: Pixels, id: string, q: Pose) {
  const [x, y] = q.head.map(Math.round) as P,
    H = K.hat,
    upright = q.mode !== 'bow' && q.mode !== 'prostrate';
  const cap = (h: number, w = 12) => {
    const m = mk(p)
      .rect(x + (10 - w) / 2, y - 2, w, h)
      .rect(x + (10 - w) / 2 + 1, y - 3, w - 2, 1);
    paint(p, m, H, { dark: 2 });
    return m;
  };
  switch (id) {
    case 'kufi': {
      cap(5);
      for (let i = 0; i < 5; i++) p.pixel(x + 1 + i * 2, y + 1, H[0]);
      break;
    }
    case 'taqiyah': {
      cap(6);
      for (let i = 0; i < 5; i++) {
        p.pixel(x + i * 2, y, H[2]);
        p.pixel(x + 1 + i * 2, y - 2, H[0]);
      }
      break;
    }
    case 'hui-cap': {
      const m = mk(p).rect(x - 1, y - 3, 12, 6);
      paint(p, m, H, { dark: 2 });
      p.rect(x - 1, y - 3, 12, 1, H[0]);
      break;
    }
    case 'songkok': {
      const m = mk(p).rect(x - 1, y - 5, 12, 8);
      paint(p, m, H, { dark: 2 });
      p.rect(x, y - 5, 10, 1, H[0]);
      p.rect(x - 1, y + 1, 12, 1, H[2]);
      break;
    }
    case 'imamah': {
      const m = mk(p)
        .ellipse(x + 5, y, 7, 4.5)
        .rect(x - 1, y, 12, 4);
      paint(p, m, H, { dark: 2 });
      for (let i = 0; i < 4; i++)
        for (let k = 0; k < 9; k++)
          p.pixel(x - 1 + k + i * 1, y - 3 + i * 2 + k * 0.25, H[2]);
      p.rect(x + 1, y - 4, 7, 1, H[0]);
      const tail = mk(p).rect(q.away ? x + 4 : x - 1, y + 3, 3, 10);
      if (upright) paint(p, tail, H, { dark: 1 });
      break;
    }
    case 'hijab':
    case 'khimar': {
      const long = id === 'khimar',
        m = mk(p).ellipse(x + 5, y + 4, 7, 7.5);
      if (upright) {
        const bottom = long ? q.hip[1] - 1 : q.chest[1] + 2;
        m.poly([
          [x - 1, y + 6],
          [x + 11, y + 6],
          [q.chest[0] + (long ? 9 : 7.5), bottom],
          [q.chest[0] - (long ? 9 : 7.5), bottom],
        ]);
      } else m.capsule([x + 5, y + 4], [x + 2, y + 10], 6);
      paint(p, m, H, { light: 2, dark: 2 });
      if (!q.away && upright) {
        face(p, x, y);
        for (let k = 0; k < 4; k++) p.pixel(x + 2, y + 3 + k * 2, H[2]);
        p.rect(x + 2, y + 11, 8, 1, H[2]);
      } else if (!q.away) face(p, x, y);
      if (upright)
        for (let k = 0; k < 6; k++)
          p.pixel(q.chest[0] - 4 + k * 2, q.chest[1] + (long ? 6 : 1), H[2]);
      break;
    }
    case 'headwrap': {
      const m = mk(p)
        .ellipse(x + 4, y - 1, 7, 5)
        .rect(x - 1, y, 12, 6)
        .rect(x - 1, y + 5, 4, 7);
      paint(p, m, H, { dark: 2 });
      for (let k = 0; k < 8; k++) p.pixel(x + k, y - 3 + (k % 3), H[2]);
      if (!q.away) face(p, x, y);
      break;
    }
    case 'cap': {
      cap(5, 11);
      const dir = q.away ? -1 : 1,
        bx = q.away ? x - 3 : x + 8;
      p.rect(bx, y + 2, 5, 2, H[2]);
      p.rect(bx + (dir > 0 ? 0 : 1), y + 2, 4, 1, H[1]);
      p.pixel(x + 5, y - 3, H[0]);
      break;
    }
    case 'hard-hat': {
      const m = mk(p)
        .ellipse(x + 5, y, 6.5, 4.5)
        .rect(x - 3, y + 1, 16, 2);
      paint(p, m, H, { dark: 2 });
      p.rect(x + 4, y - 4, 2, 4, H[0]);
      p.rect(x - 3, y + 2, 16, 1, H[2]);
      break;
    }
    case 'scrub-cap': {
      const m = mk(p)
        .ellipse(x + 5, y + 1, 6.5, 4)
        .rect(x - 1, y + 1, 12, 3);
      if (q.away) m.rect(x + 3, y + 4, 4, 3);
      paint(p, m, H, { dark: 2 });
      for (let i = 0; i < 4; i++) p.pixel(x + 1 + i * 3, y - 1 + (i % 2), H[0]);
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
        const [cx, cy] = both;
        box(cx - 5, cy - 4, 10, 6);
        p.rect(cx - 4, cy - 5, 4, 5, F.white);
        p.rect(cx + 0, cy - 5, 4, 5, F.cream);
        if (f === 3) p.rect(cx - 1, cy - 8, 3, 4, F.white);
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
    const head = mk(p).ellipse(22, 18, 4, 3);
    paint(p, head, C);
    p.poly(
      [
        [19, 16],
        [20, 13],
        [22, 16],
      ],
      C[1],
    );
    p.poly(
      [
        [23, 16],
        [25, 13],
        [26, 16],
      ],
      C[1],
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
  const head = mk(p).disc(23, hy + 1 + bob, 4);
  paint(p, head, C);
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
  if (!away) p.pixel(26, hy + 2 + bob, '#C87865');
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
  paint(p, mk(p).disc(hx, hy, 2.3), C, { light: 0, dark: 1 });
  p.rect(hx + 2, hy, 2, 1, R[0]);
  p.pixel(face === 'NE' ? hx - 1 : hx + 1, hy - 1, C[2]);
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
