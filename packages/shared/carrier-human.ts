import maps from './generated/gold-carrier-faces.json' with { type: 'json' };
import type { Vertex3 } from './infrastructure';
import type { HumanPose, Quaternion, RigFace, RigNode } from './royal-caravan';

type V = Vertex3;
type Helpers = {
  plantedStep(
    distance: number,
    phase?: number,
  ): { forward: number; lift: number };
  elbowFor(shoulder: V, wrist: V, bend: V, upper?: number, lower?: number): V;
};
const TAU = Math.PI * 2;
const cache = new Map<string, RigFace[]>();
const clothAverages = maps.map(
  (map) =>
    map.cloth.pixels.reduce(
      (sum, c) =>
        sum +
        [1, 3, 5].reduce((n, i) => n + parseInt(c.slice(i, i + 2), 16), 0) / 3,
      0,
    ) / map.cloth.pixels.length,
);
const sub = (a: V, b: V): V => a.map((n, i) => n - b[i]) as V;
const mul = (a: V, s: number): V => a.map((n) => n * s) as V;
const unit = (v: V): V => mul(v, 1 / (Math.hypot(...v) || 1));
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const yaw = (a: number): Quaternion => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const pitch = (a: number): Quaternion => [
  Math.sin(a / 2),
  0,
  0,
  Math.cos(a / 2),
];
const aim = (v: V): Quaternion => {
  const n = unit(v),
    c = cross([0, 1, 0], n),
    w = 1 + n[1],
    d = Math.hypot(...c, w);
  return d < 1e-6 ? [1, 0, 0, 0] : [c[0] / d, c[1] / d, c[2] / d, w / d];
};
const N = (
  name: string,
  faces?: RigFace[],
  position: V = [0, 0, 0],
  rotation: Quaternion = [0, 0, 0, 1],
  children: RigNode[] = [],
  scale: V = [1, 1, 1],
): RigNode => ({ name, faces, position, rotation, children, scale });
function geometry(key: string, build: (out: RigFace[]) => void) {
  if (!cache.has(key)) {
    const out: RigFace[] = [];
    build(out);
    cache.set(key, out);
  }
  return cache.get(key)!;
}
function tex(index: number, u: number, v: number, face = false) {
  const map = face ? maps[index] : maps[index].cloth;
  const x = face ? clamp(u) : ((u % 1) + 1) % 1,
    y = face ? clamp(v) : ((v % 1) + 1) % 1;
  const color =
    map.pixels[
      Math.min(map.height - 1, Math.floor(y * map.height)) * map.width +
        Math.min(map.width - 1, Math.floor(x * map.width))
    ];
  if (face) return color;
  const base = [
    '#39485f',
    '#d8cdb0',
    '#9c6242',
    '#49546d',
    '#ad8b4e',
    '#9c9278',
  ][index];
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const average = clothAverages[index];
  const gain = Math.max(
    0.87,
    Math.min(1.13, 1 + ((rgb[0] + rgb[1] + rgb[2]) / 3 / average - 1) * 0.25),
  );
  return (
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.min(255, Math.round(parseInt(base.slice(i, i + 2), 16) * gain))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
function surface(
  out: RigFace[],
  at: (u: number, v: number) => V,
  nu: number,
  nv: number,
  color: (u: number, v: number) => string,
  finish: 'linen' | 'skin' | 'hair' | 'face' = 'linen',
  texture?: string,
  uv?: (u: number, v: number) => [number, number],
) {
  const positions: V[][] = [],
    normals: V[][] = [];
  for (let j = 0; j <= nv; j++) {
    const row: V[] = [],
      normal: V[] = [];
    for (let i = 0; i <= nu; i++) {
      const u = i / nu,
        v = j / nv,
        e = 0.0001;
      row.push(at(u, v));
      normal.push(
        unit(
          cross(
            sub(at(u + e, v), at(u - e, v)),
            sub(at(u, v + e), at(u, v - e)),
          ),
        ),
      );
    }
    positions.push(row);
    normals.push(normal);
  }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++)
      out.push({
        points: [
          positions[j][i],
          positions[j][i + 1],
          positions[j + 1][i + 1],
          positions[j + 1][i],
        ],
        normals: [
          normals[j][i],
          normals[j][i + 1],
          normals[j + 1][i + 1],
          normals[j + 1][i],
        ],
        color: color((i + 0.5) / nu, (j + 0.5) / nv),
        finish,
        texture,
        uv: uv
          ? [
              uv(i / nu, j / nv),
              uv((i + 1) / nu, j / nv),
              uv((i + 1) / nu, (j + 1) / nv),
              uv(i / nu, (j + 1) / nv),
            ]
          : undefined,
      });
}
function sphere(
  out: RigFace[],
  center: V,
  r: V,
  color: string,
  finish: 'skin' | 'hair' | 'linen' = 'skin',
  nu = 24,
  nv = 14,
) {
  surface(
    out,
    (u, v) => {
      const a = u * TAU,
        b = (v - 0.5) * Math.PI;
      return [
        center[0] + r[0] * Math.sin(a) * Math.cos(b),
        center[1] + r[1] * Math.sin(b),
        center[2] + r[2] * Math.cos(a) * Math.cos(b),
      ];
    },
    nu,
    nv,
    () => color,
    finish,
  );
}
type Profile = [number, number, number][];
function fabric(
  out: RigFace[],
  index: number,
  profile: Profile,
  fold = 0.25,
  nu = 48,
  nv = 32,
  solid?: string,
) {
  surface(
    out,
    (u, v) => {
      const f = clamp(v) * (profile.length - 1),
        i = Math.min(profile.length - 2, Math.floor(f)),
        k = f - i;
      const [y, rx, rz] = profile[i].map((b, axis) => {
        const a = profile[Math.max(0, i - 1)][axis],
          c = profile[i + 1][axis],
          d = profile[Math.min(profile.length - 1, i + 2)][axis];
        return (
          0.5 *
          (2 * b +
            (-a + c) * k +
            (2 * a - 5 * b + 4 * c - d) * k * k +
            (-a + 3 * b - 3 * c + d) * k * k * k)
        );
      });
      const a = u * TAU,
        d =
          fold *
          (Math.sin(a * 13 + v * 0.8) + 0.35 * Math.sin(a * 23 - v * 1.7)) *
          (0.6 + 0.4 * Math.sin(v * Math.PI));
      return [Math.sin(a) * (rx + d), y, Math.cos(a) * (rz + d * 0.75)];
    },
    nu,
    nv,
    (u, v) => solid || tex(index, u * 3, v * 3),
    solid ? 'skin' : 'linen',
    solid ? undefined : 'carrier-linen-' + index,
    solid ? undefined : (u, v) => [u * 2, v * 2],
  );
}
function head(index: number) {
  return geometry('carrier-anatomical-head-' + index, (out) => {
    const skin = maps[index].skin,
      hair = index === 5 ? '#77736c' : '#201b17';
    for (const side of [-1, 1])
      sphere(
        out,
        [side * 5.1, 0.2, -0.2],
        [0.75, 1.65, 1.05],
        skin,
        'skin',
        16,
        10,
      );
    const eye = [0.31, 0.27, 0.24, 0.21, 0.22, 0.34][index],
      nose = [0.52, 0.48, 0.45, 0.42, 0.44, 0.52][index],
      mouth = [0.68, 0.65, 0.62, 0.58, 0.59, 0.66][index];
    surface(
      out,
      (u, v) => {
        const t = 1 - v,
          a = (u - 0.5) * TAU;
        const fu = 0.08 + (0.84 * (Math.sin(a) + 1)) / 2;
        const rx =
          t < 0.2
            ? 4.2 + t * 5
            : t < 0.55
              ? 5.2 - (t - 0.2) * 0.8
              : t < 0.9
                ? 4.92 - (t - 0.55) * 4.8
                : 3.24 - (t - 0.9) * 8;
        const rz = t < 0.5 ? 4.35 : 4.35 - (t - 0.5) * 2.6;
        const g = (x: number, y: number, sx: number, sy: number) =>
          Math.exp(-(((fu - x) / sx) ** 2) - ((t - y) / sy) ** 2);
        const details =
          Math.max(0, Math.cos(a)) *
          (1.15 * g(0.5, nose, 0.09, 0.085) +
            0.45 * g(0.5, nose - 0.1, 0.055, 0.12) -
            0.22 * g(0.27, eye, 0.13, 0.07) -
            0.22 * g(0.73, eye, 0.13, 0.07) +
            0.16 * g(0.18, nose, 0.16, 0.13) +
            0.16 * g(0.82, nose, 0.16, 0.13) +
            0.2 * g(0.5, mouth, 0.21, 0.055));
        return [
          Math.sin(a) * rx,
          6.7 - t * 14,
          Math.cos(a) * rz - 0.2 + details,
        ];
      },
      64,
      48,
      (u, v) => {
        const a = (u - 0.5) * TAU,
          t = 1 - v,
          blend = Math.min(1, Math.max(0, -Math.cos(a)) * 3),
          b = blend * blend * (3 - 2 * blend);
        const fu = 0.08 + (0.84 * (Math.sin(a) + 1)) / 2;
        // Extend an actual cheek sample across the rear scalp. Reusing the
        // portrait's vertical edge had projected its cap/beard bands there.
        const backU = 0.2;
        const backV = 0.5;
        return tex(
          index,
          fu * (1 - b) + backU * b,
          t * (1 - b) + backV * b,
          true,
        );
      },
      'face',
      'carrier-face-' + index,
      (u, v) => {
        const a = (u - 0.5) * TAU,
          t = 1 - v,
          blend = Math.min(1, Math.max(0, -Math.cos(a)) * 3),
          b = blend * blend * (3 - 2 * blend);
        return [
          (0.08 + (0.84 * (Math.sin(a) + 1)) / 2) * (1 - b) + 0.2 * b,
          t * (1 - b) + 0.5 * b,
        ];
      },
    );
    if (index === 0) {
      sphere(out, [0, 6.2, -0.8], [5.3, 2, 4.3], hair, 'hair');
      for (let i = 0; i < 48; i++) {
        const a = i * 2.399963,
          r = Math.sqrt(i / 48) * 4.8;
        sphere(
          out,
          [Math.sin(a) * r, 7.1 - r * 0.11, Math.cos(a) * r - 0.8],
          [0.65, 0.7, 0.65],
          i % 3 ? '#201b17' : '#33281e',
          'hair',
          6,
          4,
        );
      }
    } else if (index === 5) {
      fabric(
        out,
        index,
        [
          [4.7, 5.6, 4.7],
          [7, 5.4, 4.7],
          [8.3, 3.9, 3.5],
          [8.6, 0.1, 0.1],
        ],
        0.08,
        48,
        14,
        '#d2c5a4',
      );
    } else {
      const cloth = ['', '#d6c9ac', '#a45b37', '#485069', '#ba934e'][index];
      sphere(out, [0, 6.5, -0.5], [5.9, 3.5, 5.1], cloth, 'linen', 40, 22);
      for (let k = 0; k < 5; k++)
        surface(
          out,
          (u, v) => {
            const a = u * TAU,
              r = 5.7 - k * 0.1 + 0.16 * Math.sin(v * Math.PI);
            return [
              Math.sin(a) * r,
              4.5 + k * 0.85 + Math.sin(a + k * 0.18) * 1.3 + (v - 0.5) * 1.1,
              Math.cos(a) * (4.9 - k * 0.06) - 0.5,
            ];
          },
          48,
          5,
          (u, v) => {
            const sample = tex(index, u * 2, v + k * 0.2);
            return index === 1 ? sample : cloth;
          },
        );
      surface(
        out,
        (u, v) => {
          const a = 0.85 + (TAU - 1.7) * u,
            fold = 0.15 * Math.sin(a * 13 + v * 3);
          return [
            Math.sin(a) * (5.6 + fold),
            -12 + v * 18,
            Math.cos(a) * (4.7 + fold) - 0.7,
          ];
        },
        40,
        24,
        () => cloth,
      );
    }
  });
}
function sleeve(index: number, length: number, r: number, skin = false) {
  return geometry(`carrier-sleeve-${index}-${length}-${r}-${skin}`, (out) => {
    fabric(
      out,
      index,
      [
        [0, r * 0.8, r * 0.8],
        [length * 0.2, r, r * 0.95],
        [length * 0.6, r * 0.88, r * 0.85],
        [length, r * 0.7, r * 0.7],
      ],
      skin ? 0.06 : 0.15,
      28,
      16,
      skin ? maps[index].skin : undefined,
    );
  });
}
function hand(index: number) {
  return geometry('carrier-natural-hand-' + index, (out) => {
    const skin = maps[index].skin;
    sphere(out, [0, 0.7, 0], [1.5, 1.8, 0.8], skin, 'skin', 18, 12);
    for (let i = 0; i < 4; i++) {
      const x = -1.05 + i * 0.7,
        len = 1.9 - Math.abs(1.5 - i) * 0.16;
      sphere(
        out,
        [x, 2.4, 0.25],
        [0.32, len * 0.55, 0.34],
        skin,
        'skin',
        10,
        8,
      );
      sphere(out, [x, 3.2, 0.75], [0.29, 0.55, 0.36], skin, 'skin', 8, 6);
    }
    sphere(out, [-1.5, 1, 0.5], [0.5, 0.85, 0.47], skin, 'skin', 10, 8);
  });
}
function shoe() {
  return geometry('carrier-leather-sandal', (out) => {
    sphere(out, [0, 1.1, 2.5], [2.8, 1.2, 5], '#69482e', 'skin', 24, 12);
    sphere(out, [0, 1.8, 1], [2.5, 0.9, 3.3], '#8c6541', 'skin', 20, 10);
  });
}
/** Detailed curved heads, woven garment samples, cloth folds and smooth anatomy. */
export function carrierHuman(p: HumanPose, helpers: Helpers): RigNode {
  const index = p.face - 6,
    phase = (p.distance / 45) * TAU,
    bob = Math.abs(Math.sin(phase)) * p.walk * 0.3;
  const body = N('body', undefined, [0, 36 + bob, 0], pitch(-p.walk * 0.015), [
    N(
      'tunic',
      geometry('carrier-tunic-' + index, (out) =>
        fabric(
          out,
          index,
          [
            [-1, 8.1, 5.9],
            [9, 9, 6.7],
            [20, 10.8, 7],
            [25, 9.6, 6.1],
            [28, 3.5, 3.3],
          ],
          0.23,
          48,
          28,
        ),
      ),
    ),
    N(
      'neck',
      geometry('carrier-neck-' + index, (out) =>
        sphere(out, [0, 28.6, 0], [2.7, 4, 2.6], maps[index].skin),
      ),
    ),
    N(
      'head',
      head(index),
      [0, 32, 0.4],
      yaw(Math.sin((p.frame * TAU) / 120) * 0.018),
      [],
      [0.74, 0.74, 0.74],
    ),
  ]);
  const children = [
    body,
    N(
      'skirt',
      geometry('carrier-skirt-' + index, (out) =>
        fabric(
          out,
          index,
          [
            [4, 11.5, 7.8],
            [12, 11.1, 8.1],
            [25, 9.3, 6.7],
            [38, 8.1, 5.9],
          ],
          0.42,
          56,
          28,
        ),
      ),
      [0, 0, 0],
      pitch(Math.sin(phase) * p.walk * 0.025),
    ),
  ];
  for (const side of [-1, 1]) {
    const gait = helpers.plantedStep(p.distance, side === 1 ? 0.5 : 0),
      ankle: V = [side * 5.1, gait.lift * p.walk, gait.forward * p.walk],
      knee: V = [side * 5, 19, ankle[2] * 0.48],
      pelvis: V = [side * 5.5, 36, 0];
    for (const [name, from, to, r] of [
      [`leg-${side}-upper`, pelvis, knee, 3.1],
      [`leg-${side}-lower`, knee, ankle, 2.5],
    ] as [string, V, V, number][])
      children.push(
        N(
          name,
          sleeve(index, 18, r),
          from,
          aim(sub(to, from)),
          [],
          [1, Math.hypot(...sub(to, from)) / 18, 1],
        ),
      );
    children.push(N(`shoe-${side}`, shoe(), ankle));
  }
  for (const [name, side, wrist] of [
    ['right-arm', -1, p.right!],
    ['left-arm', 1, p.left!],
  ] as [string, number, V][]) {
    const shoulder: V = [side * 10.6, 60, 0],
      elbow = helpers.elbowFor(
        shoulder,
        wrist,
        [side * 0.7, -0.4, -1],
        15.5,
        15.5,
      );
    const upper = sub(elbow, shoulder),
      lower = sub(wrist, elbow);
    children.push(
      N(name, undefined, [0, 0, 0], undefined, [
        N(
          name + '-upper',
          sleeve(index, 15.5, index === 0 ? 3.2 : 3.5, index === 0),
          shoulder,
          aim(upper),
          [],
          [1, Math.hypot(...upper) / 15.5, 1],
        ),
        N(
          name + '-forearm',
          sleeve(index, 15.5, 2.7, index === 0),
          elbow,
          aim(lower),
          [],
          [1, Math.hypot(...lower) / 15.5, 1],
        ),
        N(name + '-hand', hand(index), wrist, pitch(Math.PI / 2)),
      ]),
    );
  }
  return N(p.name, undefined, p.at, yaw(p.yaw), children);
}
