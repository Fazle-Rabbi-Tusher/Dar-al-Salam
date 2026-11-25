import maps from './generated/gold-cargo-materials.json' with { type: 'json' };
import type { Vertex3 } from './infrastructure';
import type { RigFace, RigNode, Quaternion } from './royal-caravan';

type V = Vertex3;
export type CargoMaterial =
  | 'elephant'
  | 'wicker'
  | 'brocade'
  | 'wood'
  | 'gold'
  | 'rope'
  | 'ivory'
  | 'leather'
  | 'camel'
  | 'eye';
export type CargoFace = RigFace & { cargoMaterial: CargoMaterial };
export const CARGO_PROPS = [
  'gold-bowl',
  'gold-basket',
  'lidded-basket',
  'treasure-chest',
  'coin-hoard',
  'gold-ingots',
  'gold-urn',
  'gold-ewer',
  'gold-pouches',
  'rolled-carpets',
  'water-skins',
  'rope-coils',
  'jewelry-tray',
  'howdah',
] as const;
export type CargoProp = (typeof CARGO_PROPS)[number];
const TAU = Math.PI * 2;
const add = (a: V, b: V): V => a.map((v, i) => v + b[i]) as V;
const sub = (a: V, b: V): V => a.map((v, i) => v - b[i]) as V;
const mul = (a: V, s: number): V => a.map((v) => v * s) as V;
const unit = (a: V): V => {
  const l = Math.hypot(...a);
  return l < 1e-10 ? [0, 1, 0] : mul(a, 1 / l);
};
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const mix = (a: V, b: V, t: number): V =>
  a.map((v, i) => v + (b[i] - v) * t) as V;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
const pitch = (a: number): Quaternion => [
  Math.sin(a / 2),
  0,
  0,
  Math.cos(a / 2),
];
const yaw = (a: number): Quaternion => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const roll = (a: number): Quaternion => [
  0,
  0,
  Math.sin(a / 2),
  Math.cos(a / 2),
];
const aim = (v: V): Quaternion => {
  const n = unit(v),
    c = cross([0, 1, 0], n),
    w = 1 + n[1],
    d = Math.hypot(...c, w);
  return d < 1e-9 ? [1, 0, 0, 0] : [c[0] / d, c[1] / d, c[2] / d, w / d];
};
export const cargoNode = (
  name: string,
  faces?: CargoFace[],
  at: V = [0, 0, 0],
  children: RigNode[] = [],
  rotation: Quaternion = [0, 0, 0, 1],
  scale: V = [1, 1, 1],
): RigNode => ({ name, faces, position: at, children, rotation, scale });
const cache = new Map<string, CargoFace[]>();
function mesh(id: string, build: (out: CargoFace[]) => void) {
  if (!cache.has(id)) {
    const out: CargoFace[] = [];
    build(out);
    cache.set(id, out);
  }
  return cache.get(id)!;
}
const bases: Partial<Record<CargoMaterial, string>> = {
  elephant: '#777970',
  ivory: '#d9caa8',
  leather: '#614329',
  camel: '#b38a58',
  eye: '#171613',
};
function tint(c: string, n: number) {
  return (
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.max(
          0,
          Math.min(255, Math.round(parseInt(c.slice(i, i + 2), 16) * n)),
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
function sample(material: CargoMaterial, u: number, v: number): string {
  const map =
    maps[
      material === 'camel'
        ? 'rope'
        : material === 'ivory' || material === 'leather' || material === 'eye'
          ? 'wood'
          : material
    ];
  const x = Math.floor((((u % 1) + 1) % 1) * map.width),
    y = Math.floor((((v % 1) + 1) % 1) * map.height),
    color = map.pixels[y * map.width + x];
  if (!bases[material]) return color;
  const light =
    [1, 3, 5].reduce((n, i) => n + parseInt(color.slice(i, i + 2), 16), 0) / 3;
  if (material === 'ivory')
    return tint(bases.ivory!, 0.98 + Math.min(1, light / 180) * 0.04);
  return tint(
    bases[material]!,
    material === 'eye' ? 1 : 0.86 + Math.min(1, light / 180) * 0.28,
  );
}
function face(
  out: CargoFace[],
  points: V[],
  material: CargoMaterial,
  color?: string,
  normals?: V[],
) {
  out.push({
    points,
    color: color || sample(material, 0.3, 0.4),
    cargoMaterial: material,
    finish:
      material === 'gold'
        ? 'gold'
        : material === 'elephant' || material === 'camel'
          ? 'skin'
          : 'linen',
    normals,
  });
}
function surface(
  out: CargoFace[],
  at: (u: number, v: number) => V,
  nu: number,
  nv: number,
  material: CargoMaterial,
  uv = (u: number, v: number): [number, number] => [u, v],
) {
  const grid: V[][] = [],
    normals: V[][] = [];
  for (let j = 0; j <= nv; j++) {
    const row: V[] = [],
      nr: V[] = [];
    for (let i = 0; i <= nu; i++) {
      const u = i / nu,
        v = j / nv,
        e = 0.0001;
      row.push(at(u, v));
      nr.push(
        unit(
          cross(
            sub(at(u + e, v), at(u - e, v)),
            sub(at(u, v + e), at(u, v - e)),
          ),
        ),
      );
    }
    grid.push(row);
    normals.push(nr);
  }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++)
      face(
        out,
        [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]],
        material,
        sample(material, ...uv((i + 0.5) / nu, (j + 0.5) / nv)),
        [
          normals[j][i],
          normals[j][i + 1],
          normals[j + 1][i + 1],
          normals[j + 1][i],
        ],
      );
}
function sphere(
  out: CargoFace[],
  center: V,
  r: V,
  material: CargoMaterial,
  nu = 28,
  nv = 18,
  wrinkle = 0,
) {
  surface(
    out,
    (u, v) => {
      const a = u * TAU,
        b = (v - 0.5) * Math.PI,
        d =
          1 +
          wrinkle *
            (Math.sin(a * 19 + v * 11) + 0.35 * Math.sin(a * 43 - v * 29));
      return [
        center[0] + r[0] * Math.sin(a) * Math.cos(b) * d,
        center[1] + r[1] * Math.sin(b),
        center[2] + r[2] * Math.cos(a) * Math.cos(b) * d,
      ];
    },
    nu,
    nv,
    material,
    (u, v) => [u * 3, v * 2],
  );
}
function lathe(
  out: CargoFace[],
  profile: [number, number][],
  material: CargoMaterial,
  nu = 40,
  stretch = 1,
) {
  surface(
    out,
    (u, v) => {
      const f = clamp(v) * (profile.length - 1),
        i = Math.min(profile.length - 2, Math.floor(f)),
        k = f - i;
      const y = profile[i][0] + (profile[i + 1][0] - profile[i][0]) * k,
        r = profile[i][1] + (profile[i + 1][1] - profile[i][1]) * k;
      return [Math.sin(u * TAU) * r, y, Math.cos(u * TAU) * r * stretch];
    },
    nu,
    (profile.length - 1) * 2,
    material,
    (u, v) => [u * 3, v * 2],
  );
}
function sweep(
  out: CargoFace[],
  points: V[],
  radius: number | ((t: number) => number),
  material: CargoMaterial,
  sectors = 8,
) {
  surface(
    out,
    (u, v) => {
      const f = clamp(v) * (points.length - 1),
        i = Math.min(points.length - 2, Math.floor(f)),
        k = f - i,
        c = mix(points[i], points[i + 1], k);
      const t = unit(
          sub(
            points[Math.min(points.length - 1, i + 2)],
            points[Math.max(0, i - 1)],
          ),
        ),
        a = unit(cross(t, Math.abs(t[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0])),
        b = unit(cross(t, a)),
        r = typeof radius === 'number' ? radius : radius(v);
      return add(
        c,
        add(mul(a, Math.cos(u * TAU) * r), mul(b, Math.sin(u * TAU) * r)),
      );
    },
    sectors,
    (points.length - 1) * 2,
    material,
    (u, v) => [u * 2, v * 4],
  );
}
function ring(
  out: CargoFace[],
  center: V,
  rx: number,
  rz: number,
  tube: number,
  material: CargoMaterial,
  segments = 40,
) {
  sweep(
    out,
    Array.from({ length: segments + 1 }, (_, i): V => [
      center[0] + Math.sin((i * TAU) / segments) * rx,
      center[1],
      center[2] + Math.cos((i * TAU) / segments) * rz,
    ]),
    tube,
    material,
    6,
  );
}
function box(
  out: CargoFace[],
  c: V,
  size: V,
  material: CargoMaterial,
  nu = 6,
  nv = 4,
) {
  const [x, y, z] = c,
    [w, h, d] = size;
  const sides: [V, V, V][] = [
    [
      [x - w / 2, y - h / 2, z + d / 2],
      [w, 0, 0],
      [0, h, 0],
    ],
    [
      [x + w / 2, y - h / 2, z - d / 2],
      [-w, 0, 0],
      [0, h, 0],
    ],
    [
      [x - w / 2, y - h / 2, z - d / 2],
      [0, 0, d],
      [0, h, 0],
    ],
    [
      [x + w / 2, y - h / 2, z + d / 2],
      [0, 0, -d],
      [0, h, 0],
    ],
    [
      [x - w / 2, y + h / 2, z + d / 2],
      [w, 0, 0],
      [0, 0, -d],
    ],
    [
      [x - w / 2, y - h / 2, z - d / 2],
      [w, 0, 0],
      [0, 0, d],
    ],
  ];
  for (const [p, a, b] of sides)
    surface(
      out,
      (u, v) => add(p, add(mul(a, u), mul(b, v))),
      nu,
      nv,
      material,
      (u, v) => [u * 2, v],
    );
}
function coins(
  out: CargoFace[],
  count: number,
  radius: number,
  y: number,
  ellipse = 1,
) {
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963,
      r = Math.sqrt((i + 0.3) / count) * radius,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r * ellipse,
      h = y + Math.max(0, 1 - r / radius) * 3 + (i % 3) * 0.2;
    const points = Array.from({ length: 13 }, (_, j): V => [
      x + Math.sin((j * TAU) / 12) * 1.15,
      h,
      z + Math.cos((j * TAU) / 12) * 1.15,
    ]);
    face(out, points, 'gold', i % 4 ? '#d8a741' : '#e9bd62');
    for (let j = 0; j < 12; j++)
      face(
        out,
        [
          points[j],
          points[j + 1],
          add(points[j + 1], [0, -0.55, 0]),
          add(points[j], [0, -0.55, 0]),
        ],
        'gold',
        '#a97b28',
      );
    if (i % 4 === 0) ring(out, [x, h + 0.06, z], 0.72, 0.72, 0.08, 'gold', 12);
  }
}
function vessel(out: CargoFace[], kind: 'urn' | 'ewer') {
  lathe(
    out,
    [
      [0, 0.1],
      [0, 4],
      [1, 4.3],
      [2, 3.2],
      [5, 5.8],
      [11, 6.7],
      [15, 4.9],
      [17, 2.7],
      [20, 2.3],
      [20.6, 3.2],
      [21.5, 3.3],
    ],
    'gold',
    40,
  );
  for (const y of [2, 13.5, 18.8])
    ring(
      out,
      [0, y, 0],
      y === 13.5 ? 5.8 : y === 2 ? 3.6 : 2.6,
      y === 13.5 ? 5.8 : y === 2 ? 3.6 : 2.6,
      0.22,
      'gold',
    );
  lathe(
    out,
    [
      [21, 3.1],
      [22, 3.7],
      [23, 2.9],
      [24.5, 0.1],
    ],
    'gold',
    24,
  );
  sphere(out, [0, 25, 0], [0.65, 0.8, 0.65], 'gold', 12, 8);
  for (const s of [-1, 1])
    sweep(
      out,
      [
        [s * 4.5, 15, 0],
        [s * 8.5, 16, 0],
        [s * 10, 12, 0],
        [s * 8, 8, 0],
        [s * 5.7, 7, 0],
      ],
      0.6,
      'gold',
      8,
    );
  if (kind === 'ewer')
    sweep(
      out,
      [
        [0, 8, 5],
        [0, 10, 10],
        [0, 16, 13],
        [0, 20, 14],
      ],
      (t) => 1.5 - t * 0.7,
      'gold',
      12,
    );
}
function basket(out: CargoFace[], lid = false) {
  lathe(
    out,
    [
      [0, 0.1],
      [0, 10],
      [2, 11],
      [9, 13],
      [19, 15.5],
      [22, 16],
      [22, 15.2],
      [3, 10],
      [3, 0.1],
    ],
    'wicker',
    48,
    1.15,
  );
  for (let i = 0; i < 32; i++) {
    const a = (i * TAU) / 32;
    const p = Array.from({ length: 9 }, (_, j): V => {
      const y = (j / 8) * 22,
        r = 10.5 + y * 0.25 + 0.2 * Math.sin(j * Math.PI);
      return [Math.sin(a) * r, y, Math.cos(a) * r * 1.15];
    });
    sweep(out, p, 0.19, 'rope', 5);
  }
  for (const y of [2, 5, 8, 11, 14, 17, 20, 22])
    ring(
      out,
      [0, y, 0],
      10.5 + y * 0.25,
      (10.5 + y * 0.25) * 1.15,
      y === 22 ? 0.7 : 0.22,
      'wicker',
    );
  for (const s of [-1, 1])
    sweep(
      out,
      [
        [s * 15, 18, -5],
        [s * 18, 24, -4],
        [s * 18.5, 28, 0],
        [s * 18, 24, 4],
        [s * 15, 18, 5],
      ],
      0.7,
      'rope',
      8,
    );
  if (lid) {
    lathe(
      out,
      [
        [22, 16.6],
        [23.6, 15],
        [25, 8],
        [25.5, 0.1],
      ],
      'wicker',
      40,
      1.15,
    );
    sphere(out, [0, 26.5, 0], [1.4, 1, 1.5], 'rope', 12, 8);
  } else coins(out, 72, 13.4, 21, 1.13);
}
export function cargoPropFaces(id: string): CargoFace[] {
  return mesh('cargo-prop-' + id, (out) => {
    if (id === 'gold-bowl') {
      lathe(
        out,
        [
          [0, 0.1],
          [0, 4],
          [1, 6],
          [3, 10],
          [6, 13],
          [7, 13.4],
          [7.6, 12.7],
          [6, 12.1],
          [3, 9.2],
          [1.4, 4.4],
          [1.4, 0.1],
        ],
        'gold',
        64,
      );
      for (const y of [1, 6.8, 7.5])
        ring(out, [0, y, 0], y < 2 ? 6 : 13, y < 2 ? 6 : 13, 0.18, 'gold');
      for (let i = 0; i < 32; i++) {
        const a = (i * TAU) / 32;
        sweep(
          out,
          [
            [Math.sin(a) * 8, 2.2, Math.cos(a) * 8],
            [Math.sin(a) * 12.2, 6, Math.cos(a) * 12.2],
          ],
          0.12,
          'gold',
          5,
        );
      }
      coins(out, 80, 11.5, 7.4);
    } else if (id === 'gold-basket' || id === 'lidded-basket')
      basket(out, id === 'lidded-basket');
    else if (id === 'treasure-chest-body') {
      box(out, [0, 6, 0], [43, 12, 24], 'wood', 16, 6);
      for (const z of [-12.1, 12.1]) {
        for (const x of [-20, -12, 12, 20])
          box(out, [x, 6, z], [1, 12.8, 0.7], 'gold', 2, 5);
        for (const y of [0.8, 11.8])
          box(out, [0, y, z], [44, 1, 1], 'gold', 18, 2);
      }
      for (const x of [-21.7, 21.7])
        for (const z of [-11, 11])
          box(out, [x, 6, z], [1.2, 12.6, 1.5], 'gold', 2, 6);
      box(out, [0, 6, 12.8], [4, 5, 1.4], 'gold', 4, 5);
      ring(out, [0, 5.7, 14], 1.1, 1.1, 0.24, 'gold', 16);
      for (const x of [-17, -8, 0, 8, 17])
        for (const z of [-12.8, 12.8])
          for (const y of [2, 10])
            sphere(out, [x, y, z], [0.3, 0.3, 0.2], 'gold', 8, 4);
      coins(out, 100, 18, 13, 0.51);
      for (const x of [-21.9, 21.9])
        sweep(
          out,
          [
            [x, 5, -3],
            [x * 1.07, 3, 0],
            [x, 5, 3],
          ],
          0.5,
          'gold',
          8,
        );
    } else if (id === 'chest-lid') {
      box(out, [0, 0, 12], [43, 1.5, 24], 'wood', 16, 9);
      for (const x of [-20, -12, 12, 20])
        box(out, [x, 0.9, 12], [1.1, 0.6, 24.5], 'gold', 2, 12);
      for (const z of [0, 24])
        box(out, [0, 0.9, z], [44, 0.6, 1.1], 'gold', 20, 2);
      for (const x of [-14, 14]) box(out, [x, -0.8, 0], [3.5, 1.7, 2], 'gold');
    } else if (id === 'coin-hoard') {
      coins(out, 180, 24, 1, 0.7);
      for (let i = 0; i < 9; i++)
        box(
          out,
          [Math.sin(i * 4.3) * 12, 2 + (i % 3), Math.cos(i * 6.7) * 8],
          [6, 2.2, 3.2],
          'gold',
          4,
          2,
        );
    } else if (id === 'gold-ingots') {
      for (let level = 0; level < 3; level++)
        for (let i = 0; i < 5 - level; i++)
          for (let j = 0; j < 2; j++) {
            const x = (i - (4 - level) / 2) * 7,
              z = (j - 0.5) * 5,
              y = 1.5 + level * 2.8;
            box(out, [x, y, z], [6.5, 2.7, 4.3], 'gold', 5, 3);
            box(out, [x, y + 1.4, z], [2, 0.12, 1], 'gold', 3, 2);
          }
    } else if (id === 'gold-urn' || id === 'gold-ewer')
      vessel(out, id === 'gold-urn' ? 'urn' : 'ewer');
    else if (id === 'gold-pouches') {
      for (const [i, x] of [-8, 3, 10].entries()) {
        sphere(out, [x, 4, 0], [5 + (i % 2), 4.3, 4], 'rope', 24, 16);
        ring(out, [x, 7.8, 0], 1.8, 1.8, 0.45, 'leather', 20);
        sweep(
          out,
          [
            [x - 2, 8, 0],
            [x - 1, 11, 0],
            [x + 2, 11, 0],
            [x + 2, 8, 0],
          ],
          0.3,
          'rope',
        );
      }
    } else if (id === 'rolled-carpets') {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 9;
        sphere(out, [x, 4, 0], [4, 4, 15], 'brocade', 32, 16);
        for (const z of [-8, 8])
          sweep(
            out,
            Array.from({ length: 25 }, (_, j): V => {
              const a = (j * TAU) / 24;
              return [x + Math.sin(a) * 4.2, 4 + Math.cos(a) * 4.2, z];
            }),
            0.4,
            'rope',
          );
      }
    } else if (id === 'water-skins') {
      for (const x of [-6, 6]) {
        sphere(out, [x, 7, 0], [5.1, 7, 3.6], 'leather', 24, 16);
        sweep(
          out,
          [
            [x, 13, 0],
            [x, 17, 0],
          ],
          1.5,
          'leather',
        );
        sweep(
          out,
          [
            [x - 4, 10, 0],
            [x - 5, 18, 0],
            [x + 5, 18, 0],
            [x + 4, 10, 0],
          ],
          0.35,
          'rope',
        );
      }
    } else if (id === 'jewelry-tray') {
      box(out, [0, 0.8, 0], [25, 1.6, 17], 'wood', 10, 7);
      box(out, [0, 1.7, 0], [23, 0.5, 15], 'brocade', 12, 8);
      for (const z of [-8, 8]) box(out, [0, 2, z], [25, 0.7, 0.7], 'gold');
      for (const x of [-12, 12]) box(out, [x, 2, 0], [0.7, 0.7, 17], 'gold');
      for (let j = 0; j < 2; j++) {
        const center: V = [j ? -5 : 4, 2.1, 0];
        ring(out, center, j ? 4 : 5, j ? 5 : 4, 0.2, 'gold', 32);
        for (let i = 0; i < 24; i++) {
          const a = (i * TAU) / 24;
          sphere(
            out,
            [
              center[0] + Math.sin(a) * (j ? 4 : 5),
              2.2,
              Math.cos(a) * (j ? 5 : 4),
            ],
            [0.35, 0.35, 0.35],
            'gold',
            8,
            5,
          );
        }
      }
      for (const x of [-8, 0, 8])
        ring(out, [x, 2.3, 5.5], 1.3, 1.3, 0.28, 'gold', 20);
    } else if (id === 'rope-coils') {
      for (let i = 0; i < 6; i++)
        ring(
          out,
          [0, 1 + i * 0.65, 0],
          6 + i * 0.18,
          6 + i * 0.18,
          0.45,
          'rope',
          40,
        );
      sweep(
        out,
        [
          [6, 3, 0],
          [10, 1, 3],
          [13, 0.8, 7],
          [17, 0.8, 6],
        ],
        0.4,
        'rope',
      );
    }
  });
}
export function cargoPropRig(id: CargoProp): RigNode {
  if (id === 'howdah') return howdah();
  if (id === 'treasure-chest')
    return cargoNode(
      id,
      undefined,
      [0, 0, 0],
      [
        cargoNode('treasure-chest-body', cargoPropFaces('treasure-chest-body')),
        cargoNode(
          'chest-lid',
          cargoPropFaces('chest-lid'),
          [0, 12, -12],
          [],
          pitch(-1.05),
        ),
      ],
    );
  return cargoNode(id, cargoPropFaces(id));
}
function blanket(out: CargoFace[]) {
  surface(
    out,
    (u, v) => {
      const x = (u - 0.5) * 96,
        y = 35 - Math.max(0, Math.abs(x) - 27) * 2.65 + 0.3 * Math.sin(u * 20);
      return [x, y, -52 + v * 75];
    },
    48,
    28,
    'brocade',
    (u, v) => [u * 1.5, v * 2],
  );
  for (const side of [-1, 1])
    for (let i = 0; i < 16; i++) {
      const z = -50 + i * 4.7;
      sweep(
        out,
        [
          [side * 47, -19, z],
          [side * 47, -24, z],
        ],
        0.25,
        'gold',
        5,
      );
      sphere(out, [side * 47, -25, z], [0.6, 1.1, 0.6], 'gold', 8, 6);
    }
}
function howdah(): RigNode {
  const lower = mesh('ornate-howdah-frame', (out) => {
    box(out, [0, 1, -15], [56, 3.5, 68], 'wood', 18, 10);
    box(out, [0, 3.2, -15], [58, 1, 70], 'gold', 24, 12);
    box(out, [0, 6, -15], [43, 4, 53], 'brocade', 16, 12);
    sphere(out, [0, 9, -34], [17, 4, 7], 'brocade', 28, 16);
    sphere(out, [-17, 9, -12], [4, 5, 15], 'brocade', 24, 16);
    for (const x of [-26, 26])
      for (const z of [-47, 17]) {
        sweep(
          out,
          [
            [x, 3, z],
            [x, 57, z],
          ],
          0.8,
          'gold',
          12,
        );
        for (const y of [6, 25, 45, 55])
          sphere(out, [x, y, z], [1.5, 1.5, 1.5], 'gold', 12, 8);
      }
    for (const side of [-1, 1]) {
      const x = side * 27;
      box(out, [x, 15.5, -15], [1.1, 15, 64], 'gold', 10, 12);
      for (const y of [8, 23])
        sweep(
          out,
          [
            [x, y, -47],
            [x, y, 17],
          ],
          0.6,
          'gold',
          8,
        );
      for (let z = -44; z < 16; z += 5) {
        sweep(
          out,
          [
            [x, 9, z],
            [x, 22, z + 5],
          ],
          0.2,
          'gold',
          5,
        );
        sweep(
          out,
          [
            [x, 22, z],
            [x, 9, z + 5],
          ],
          0.2,
          'gold',
          5,
        );
      }
      for (const center of [-30, -1]) {
        for (const s of [-1, 1])
          sweep(
            out,
            [
              [x, 25, center + s * 11],
              [x, 45, center + s * 11],
            ],
            0.7,
            'gold',
            8,
          );
        const arch = Array.from({ length: 17 }, (_, i): V => {
          const u = i / 16;
          return [x, 45 + 8 * (1 - Math.abs(u * 2 - 1)), center - 11 + 22 * u];
        });
        sweep(out, arch, 0.7, 'gold', 8);
        for (let i = 0; i < arch.length - 1; i++) {
          const a = arch[i],
            b = arch[i + 1];
          face(
            out,
            [a, b, [x, 57, b[2]], [x, 57, a[2]]],
            'gold',
            sample('gold', i / 16, 0.25),
          );
        }
        sphere(out, [x, 54.5, center], [0.9, 1.2, 1.2], 'gold', 12, 8);
      }
    }
    for (const z of [-47, 17]) {
      box(out, [0, 15, z], [54, 14, 1.1], 'gold', 18, 8);
      for (const y of [8, 23])
        sweep(
          out,
          [
            [-27, y, z],
            [27, y, z],
          ],
          0.6,
          'gold',
          8,
        );
      for (let x = -24; x < 24; x += 5) {
        sweep(
          out,
          [
            [x, 9, z],
            [x + 5, 22, z],
          ],
          0.2,
          'gold',
          5,
        );
        sweep(
          out,
          [
            [x, 22, z],
            [x + 5, 9, z],
          ],
          0.2,
          'gold',
          5,
        );
      }
    }
  });
  const roof = mesh('octagonal-howdah-canopy', (out) => {
    const perimeter = Array.from({ length: 9 }, (_, i): V => [
      Math.sin((i * TAU) / 8) * 35,
      57,
      Math.cos((i * TAU) / 8) * 44 - 15,
    ]);
    for (let i = 0; i < 8; i++) {
      const a = perimeter[i],
        b = perimeter[i + 1];
      surface(
        out,
        (u, v) => mix(mix(a, b, u), [0, 74, -15], v),
        8,
        7,
        'gold',
        (u, v) => [u, v],
      );
      sweep(out, [a, b], 0.7, 'gold', 8);
      sweep(out, [a, [0, 74, -15]], 0.35, 'gold', 6);
      for (let j = 0; j < 6; j++) {
        const p = mix(a, b, j / 6);
        sweep(out, [p, add(p, [0, -5, 0])], 0.18, 'gold', 5);
        sphere(out, add(p, [0, -5.5, 0]), [0.5, 0.7, 0.5], 'gold', 8, 5);
      }
    }
    sweep(
      out,
      [
        [0, 74, -15],
        [0, 82, -15],
      ],
      0.5,
      'gold',
      10,
    );
    sphere(out, [0, 78, -15], [2, 2, 2], 'gold', 16, 10);
  });
  return cargoNode(
    'golden-howdah',
    undefined,
    [0, 0, 0],
    [
      cargoNode('carved-seating-platform', lower),
      cargoNode('canopy-and-fringe', roof),
    ],
  );
}

export type CargoPose = {
  at: V;
  heading: number;
  distance: number;
  walk: number;
};
const elephantStride = 55,
  elephantCircuit = elephantStride * 10,
  elephantRadius = elephantCircuit / TAU;
function circleAt(distance: number, radius = elephantRadius) {
  const a = distance / radius;
  return {
    at: [radius * (1 - Math.cos(a)), 0, radius * Math.sin(a)] as V,
    heading: a,
  };
}
const turn = (p: V, a: number): V => [
  p[0] * Math.cos(a) + p[2] * Math.sin(a),
  p[1],
  p[2] * Math.cos(a) - p[0] * Math.sin(a),
];
/** True planted world-space elephant feet, including the turning route. */
export function elephantFoot(
  distance: number,
  phase: number,
  side: number,
  fore: number,
): V {
  const u = (((distance / elephantStride + phase) % 1) + 1) % 1,
    start = distance - u * elephantStride;
  const contact = (d: number) => {
    const p = circleAt(d);
    return add(
      p.at,
      turn([side * 26, 0, fore * 42 + elephantStride * 0.3], p.heading),
    );
  };
  let world: V;
  if (u < 0.6) world = contact(start);
  else {
    const k = (u - 0.6) / 0.4;
    world = mix(contact(start), contact(start + elephantStride), ease(k));
    world[1] = Math.sin(k * Math.PI) * 8;
  }
  const now = circleAt(distance);
  return turn(sub(world, now.at), -now.heading);
}
function elephantEar(side: number): CargoFace[] {
  return mesh('sculpted-elephant-ear-' + side, (out) => {
    const outline: V[] = [
      [0, 10, 0],
      [12, 29, -2],
      [31, 24, -4],
      [43, 6, -5],
      [42, -12, -4],
      [31, -35, -2],
      [16, -40, 0],
      [3, -20, 1],
    ].map((p) => [p[0] * side, p[1], p[2]] as V);
    const center: V = [side * 20, -6, -4];
    for (const back of [false, true])
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i],
          b = outline[(i + 1) % outline.length];
        surface(
          out,
          (u, v) => {
            const p = mix(center, mix(a, b, u), v);
            p[2] +=
              (back ? -1 : 1) * (0.7 + Math.sin(v * Math.PI) * 1.2) +
              Math.sin(u * 9 + v * 6) * 0.3;
            return p;
          },
          6,
          7,
          'elephant',
          (u, v) => [u + i * 0.2, v],
        );
      }
    sweep(out, [...outline, outline[0]], 0.6, 'elephant', 6);
  });
}
function elephantLoad(): RigNode {
  const loads: RigNode[] = [
    cargoNode('woven-saddle-cloth', mesh('elephant-draped-blanket', blanket)),
    cargoNode('howdah-mount', undefined, [0, 35, 0], [howdah()]),
  ];
  for (const side of [-1, 1])
    loads.push(
      cargoNode(
        `elephant-pannier-${side}`,
        cargoPropFaces('gold-basket'),
        [side * 52, -31, -14],
        [],
        undefined,
        [1.05, 1.2, 1.22],
      ),
    );
  loads.push(
    cargoNode(
      'balanced-cargo-ropes',
      mesh('elephant-load-ropes', (out) => {
        for (const z of [-34, 12]) {
          sweep(
            out,
            [
              [-64, -5, z],
              [-43, 16, z],
              [-25, 36, z],
              [0, 38, z],
              [25, 36, z],
              [43, 16, z],
              [64, -5, z],
            ],
            0.7,
            'rope',
            8,
          );
          sweep(
            out,
            [
              [-41, 5, z],
              [-32, -29, z],
              [0, -39, z],
              [32, -29, z],
              [41, 5, z],
            ],
            1,
            'leather',
            8,
          );
          for (const s of [-1, 1]) {
            box(out, [s * 45, 8, z], [3, 4, 1.4], 'gold');
            sphere(out, [s * 46, -18, z], [1.1, 1.3, 1.1], 'gold', 12, 8);
          }
        }
      }),
    ),
  );
  return cargoNode('elephant-supported-load', undefined, [0, 0, 0], loads);
}
export function cargoElephant(
  frame: number,
  options: { rest?: boolean; at?: V; heading?: number } = {},
): RigNode {
  const t = ((frame % 240) + 240) % 240,
    p = t / 240,
    a = p * TAU,
    distance = p * elephantCircuit;
  const route = options.rest
    ? {
        at: options.at || ([-300, 0, -140] as V),
        heading: options.heading ?? 0.2,
      }
    : circleAt(distance);
  const bob = options.rest
    ? Math.sin(a * 2) * 0.18
    : Math.abs(Math.sin(a * 10)) * 1.05;
  const spine = cargoNode(
    'elephant-spine',
    undefined,
    [0, 110 + bob, 0],
    [],
    pitch(Math.sin(a * 10) * 0.004),
  );
  spine.children.push(
    cargoNode(
      'elephant-anatomy',
      mesh('elephant-anatomy', (out) => {
        sphere(out, [0, 0, 0], [42, 35, 64], 'elephant', 56, 32, 0.004);
        for (const side of [-1, 1]) {
          sphere(
            out,
            [side * 24, -9, 39],
            [18, 27, 23],
            'elephant',
            28,
            20,
            0.005,
          );
          sphere(
            out,
            [side * 24, -6, -40],
            [19, 27, 24],
            'elephant',
            28,
            20,
            0.005,
          );
        }
      }),
    ),
    elephantLoad(),
  );
  const head = cargoNode(
    'elephant-head',
    undefined,
    [0, 12, 61],
    [],
    yaw(Math.sin(a * 2) * 0.022),
  );
  head.children.push(
    cargoNode(
      'head-and-cheeks',
      mesh('elephant-head-volume', (out) => {
        sphere(out, [0, 0, 0], [25, 30, 28], 'elephant', 48, 28, 0.005);
        sphere(out, [0, 9, 12], [19, 21, 18], 'elephant', 36, 24, 0.004);
        for (const side of [-1, 1]) {
          sphere(out, [side * 22, 11, 9], [2.7, 2.6, 3.2], 'elephant', 16, 12);
          sphere(
            out,
            [side * 23.7, 11.4, 10],
            [0.85, 1.05, 1.1],
            'eye',
            14,
            10,
          );
          sweep(
            out,
            [
              [side * 19, 14, 10],
              [side * 22, 15, 9],
              [side * 25, 13, 8],
            ],
            0.65,
            'elephant',
            7,
          );
        }
      }),
    ),
  );
  for (const side of [-1, 1]) {
    head.children.push(
      cargoNode(
        'ear-' + side,
        elephantEar(side),
        [side * 19, 11, -4],
        [],
        yaw(side * (0.12 + Math.sin(a * 2 + side * 0.5) * 0.06)),
      ),
    );
    head.children.push(
      cargoNode(
        'ivory-tusk-' + side,
        mesh('elephant-tusk-' + side, (out) => {
          surface(
            out,
            (u, v) => {
              const center: V = [
                side * (11 + 7 * v),
                -9 - 38 * v + 19 * v * v,
                23 + 54 * v,
              ];
              const tangent = unit([side * 7, -38 + 38 * v, 54]),
                a = unit(cross(tangent, [0, 1, 0])),
                b = unit(cross(tangent, a));
              const radius = 3.4 * Math.max(0, 1 - v) ** 0.7 + 0.08;
              return add(
                center,
                add(
                  mul(a, Math.cos(u * TAU) * radius),
                  mul(b, Math.sin(u * TAU) * radius),
                ),
              );
            },
            24,
            40,
            'ivory',
          );
        }),
      ),
    );
  }
  head.children.push(
    cargoNode(
      'gold-forehead-harness',
      mesh('elephant-head-harness', (out) => {
        for (const y of [13, 17])
          sweep(
            out,
            [
              [-24, y, 12],
              [-16, y + 5, 24],
              [0, y + 7, 28],
              [16, y + 5, 24],
              [24, y, 12],
            ],
            0.6,
            'gold',
            8,
          );
        for (const side of [-1, 1])
          sweep(
            out,
            [
              [side * 22, 15, 11],
              [side * 17, 0, 25],
              [side * 11, -11, 25],
            ],
            0.8,
            'leather',
            8,
          );
        sphere(out, [0, 14, 30], [3.5, 4, 0.8], 'gold', 24, 16);
        for (let i = -3; i <= 3; i++) {
          sphere(
            out,
            [i * 3.5, 11 - Math.abs(i) * 0.5, 27.8],
            [0.8, 0.9, 0.6],
            'gold',
            12,
            8,
          );
        }
      }),
    ),
  );
  const original: V[] = [
    [0, -5, 25],
    [0, -21, 30],
    [0, -39, 35],
    [0, -58, 42],
    [0, -77, 52],
    [0, -91, 66],
    [0, -89, 80],
    [0, -77, 86],
  ];
  const radius = [10, 8.7, 7.2, 5.7, 4.3, 3.2, 2.2, 1.5];
  const paths = original.map((point, i): V => [
    point[0] + Math.sin(a * 2 + i * 0.25) * i * 0.3,
    point[1] + Math.sin(a * 2 + i * 0.2) * i * 0.22,
    point[2],
  ]);
  for (let i = 0; i < paths.length - 1; i++) {
    const delta = sub(paths[i + 1], paths[i]),
      length = Math.hypot(...sub(original[i + 1], original[i]));
    head.children.push(
      cargoNode(
        'trunk-segment-' + i,
        mesh('elephant-trunk-segment-' + i, (out) => {
          const profile = Array.from(
            { length: 13 },
            (_, j): [number, number] => {
              const u = j / 12;
              return [
                u * length,
                (radius[i] + (radius[i + 1] - radius[i]) * u) *
                  (1 + 0.025 * Math.sin(j * Math.PI)),
              ];
            },
          );
          lathe(out, profile, 'elephant', 24);
        }),
        paths[i],
        [],
        aim(delta),
        [1, Math.hypot(...delta) / length, 1],
      ),
    );
    if (i > 0)
      head.children.push(
        cargoNode(
          'trunk-joint-' + i,
          mesh('elephant-trunk-joint-' + i, (out) =>
            sphere(
              out,
              [0, 0, 0],
              [radius[i] * 1.02, radius[i] * 1.02, radius[i] * 1.02],
              'elephant',
              16,
              12,
            ),
          ),
          paths[i],
        ),
      );
  }
  head.children.push(
    cargoNode(
      'trunk-fingertips',
      mesh('elephant-trunk-fingers', (out) => {
        for (const s of [-1, 1])
          sphere(out, [s * 0.9, 0.7, 0], [0.7, 1.8, 0.7], 'elephant', 12, 8);
        sphere(out, [0, 0, -0.5], [0.6, 0.8, 0.45], 'eye', 12, 8);
      }),
      paths.at(-1)!,
    ),
  );
  spine.children.push(head);
  const tail = cargoNode(
    'elephant-tail',
    mesh('elephant-tail', (out) => {
      sweep(
        out,
        [
          [0, 0, 0],
          [0, -9, -12],
          [0, -25, -22],
          [0, -40, -28],
        ],
        (u) => 1.6 - u * 0.7,
        'elephant',
        10,
      );
      sphere(out, [0, -42, -28], [2.3, 5, 2.2], 'leather', 16, 12);
    }),
    [0, 8, -61],
    [],
    roll(Math.sin(a * 2) * 0.08),
  );
  spine.children.push(tail);
  const children: RigNode[] = [spine];
  for (const side of [-1, 1])
    for (const fore of [-1, 1]) {
      const phase = (side === 1 ? 0.5 : 0) + (fore === 1 ? 0.25 : 0);
      const foot: V = options.rest
        ? [side * 26, 0, fore * 42]
        : elephantFoot(distance, phase, side, fore);
      const hip: V = [side * 26, 93 + bob, fore * 42],
        knee: V = [
          side * 26,
          46 + bob * 0.5,
          fore * 42 + (foot[2] - fore * 42) * 0.48 + fore * 2,
        ];
      for (const [part, from, to, ra, rb] of [
        ['upper', hip, knee, 10.5, 8.4],
        ['lower', knee, foot, 8.4, 7.3],
      ] as [string, V, V, number, number][]) {
        const delta = sub(to, from),
          len = 50;
        children.push(
          cargoNode(
            `elephant-leg-${side}-${fore}-${part}`,
            mesh(`elephant-limb-${ra}-${rb}`, (out) =>
              lathe(
                out,
                [
                  [0, ra],
                  [12, ra * 0.96],
                  [38, rb * 1.03],
                  [50, rb],
                ],
                'elephant',
                28,
              ),
            ),
            from,
            [],
            aim(delta),
            [1, Math.hypot(...delta) / len, 1],
          ),
        );
      }
      children.push(
        cargoNode(
          `elephant-foot-${side}-${fore}`,
          mesh('elephant-foot', (out) => {
            sphere(out, [0, 4, 1], [9, 4.1, 10.5], 'elephant', 28, 16, 0.006);
            for (let i = 0; i < 4; i++) {
              const q = (i - 1.5) * 0.42;
              sphere(
                out,
                [Math.sin(q) * 7.8, 2.5, Math.cos(q) * 9],
                [1.9, 1.9, 0.65],
                'ivory',
                12,
                8,
              );
            }
          }),
          foot,
        ),
      );
    }
  return cargoNode(
    'loaded-elephant',
    undefined,
    route.at,
    children,
    yaw(route.heading),
  );
}

export function camelFoot(
  distance: number,
  phase: number,
  side: number,
  fore: number,
): V {
  const stride = 58,
    radius = (stride * 8) / TAU,
    u = (((distance / stride + phase) % 1) + 1) % 1,
    start = distance - u * stride;
  const contact = (d: number) => {
    const p = circleAt(d, radius);
    return add(
      p.at,
      turn([side * 10.5, 0, fore * 24 + stride * 0.3], p.heading),
    );
  };
  let world: V;
  if (u < 0.6) world = contact(start);
  else {
    const k = (u - 0.6) / 0.4;
    world = mix(contact(start), contact(start + stride), ease(k));
    world[1] = Math.sin(k * Math.PI) * 7;
  }
  const now = circleAt(distance, radius);
  return turn(sub(world, now.at), -now.heading);
}
export function cargoCamel(frame: number, pose?: CargoPose): RigNode {
  const t = ((frame % 240) + 240) % 240,
    p = t / 240;
  const state = pose || {
    ...circleAt(p * 58 * 8, (58 * 8) / TAU),
    distance: p * 58 * 8,
    walk: 1,
  };
  const stride = (state.distance / 58) * TAU,
    bob = Math.abs(Math.sin(stride)) * state.walk * 0.55;
  const spine = cargoNode('camel-spine', undefined, [0, 80 + bob, 0], []);
  spine.children.push(
    cargoNode(
      'dromedary-anatomy',
      mesh('cargo-camel-anatomy', (out) => {
        sphere(out, [0, 0, 0], [18, 21, 34], 'camel', 40, 24, 0.004);
        sphere(out, [0, 22, -5], [13, 19, 20], 'camel', 32, 22, 0.005);
        sweep(
          out,
          [
            [0, 3, 25],
            [0, 17, 36],
            [0, 36, 42],
            [0, 46, 52],
          ],
          (u) => 12.5 - u * 6.3,
          'camel',
          20,
        );
        sphere(out, [0, 48, 59], [7, 9, 13], 'camel', 28, 18, 0.005);
        sphere(out, [0, 44, 71], [6, 6, 11], 'camel', 24, 16);
        for (const side of [-1, 1]) {
          sphere(out, [side * 5.7, 57, 54], [1.6, 4.6, 1.6], 'camel', 16, 12);
          sphere(out, [side * 6.4, 50, 62], [0.8, 0.8, 0.6], 'eye', 12, 8);
          sphere(out, [side * 4, 46, 79], [1.1, 0.8, 0.6], 'eye', 12, 8);
        }
        sweep(
          out,
          [
            [-4, 41, 80],
            [0, 40.5, 81],
            [4, 41, 80],
          ],
          0.18,
          'leather',
          6,
        );
      }),
    ),
  );
  const load = cargoNode('camel-supported-load', undefined, [0, 0, 0], []);
  load.children.push(
    cargoNode(
      'camel-saddle-rug',
      mesh('camel-saddle-rug', (out) => {
        surface(
          out,
          (u, v) => {
            const x = (u - 0.5) * 58,
              z = -28 + v * 52,
              y =
                23 +
                18 * Math.sqrt(Math.max(0, 1 - ((z + 5) / 24) ** 2)) -
                Math.max(0, Math.abs(x) - 7) * 2.1;
            return [x, y, z];
          },
          40,
          28,
          'brocade',
          (u, v) => [u * 2, v * 2],
        );
        for (const s of [-1, 1])
          for (let j = 0; j < 12; j++) {
            const z = -25 + j * 4;
            sweep(
              out,
              [
                [s * 28, -16, z],
                [s * 28, -21, z],
              ],
              0.18,
              'gold',
              5,
            );
          }
      }),
    ),
  );
  for (const side of [-1, 1])
    load.children.push(
      cargoNode(
        'camel-gold-basket-' + side,
        cargoPropFaces('gold-basket'),
        [side * 29, -22, -8],
        [],
        undefined,
        [0.7, 0.95, 0.85],
      ),
    );
  load.children.push(
    cargoNode(
      'camel-knotted-load-straps',
      mesh('camel-straps-and-buckles', (out) => {
        for (const z of [-20, 9]) {
          sweep(
            out,
            [
              [-37, 1, z],
              [-24, 17, z],
              [-8, 40, z],
              [8, 40, z],
              [24, 17, z],
              [37, 1, z],
            ],
            0.55,
            'rope',
            8,
          );
          sweep(
            out,
            [
              [-18, 6, z],
              [-15, -22, z],
              [0, -25, z],
              [15, -22, z],
              [18, 6, z],
            ],
            0.8,
            'leather',
            8,
          );
          for (const s of [-1, 1])
            box(out, [s * 22, 13, z], [3, 4, 1.2], 'gold');
        }
        sweep(
          out,
          [
            [-7, 51, 70],
            [-7, 42, 78],
            [0, 39, 82],
            [7, 42, 78],
            [7, 51, 70],
          ],
          0.55,
          'leather',
          8,
        );
        sweep(
          out,
          [
            [-7, 51, 63],
            [0, 55, 69],
            [7, 51, 63],
          ],
          0.4,
          'rope',
          8,
        );
        sphere(out, [0, 36, 78], [1, 1.3, 1], 'gold', 12, 8);
      }),
    ),
  );
  spine.children.push(load);
  spine.children.push(
    cargoNode(
      'camel-tail',
      mesh('camel-tail', (out) => {
        sweep(
          out,
          [
            [0, 0, 0],
            [0, -14, -8],
            [0, -28, -10],
          ],
          0.8,
          'camel',
          8,
        );
        sphere(out, [0, -29, -10], [1.8, 3, 1.8], 'leather', 14, 10);
      }),
      [0, 0, -33],
      [],
      roll(Math.sin(p * TAU * 2) * 0.08),
    ),
  );
  const children: RigNode[] = [spine];
  for (const side of [-1, 1])
    for (const fore of [-1, 1]) {
      const phase = (side === 1 ? 0.5 : 0) + (fore === 1 ? 0.08 : 0),
        u = (((state.distance / 58 + phase) % 1) + 1) % 1;
      const forward =
          u < 0.6 ? 17.4 - 58 * u : -17.4 + 34.8 * ease((u - 0.6) / 0.4),
        lift = u < 0.6 ? 0 : Math.sin(((u - 0.6) / 0.4) * Math.PI) * 7;
      const foot: V = pose
          ? [side * 10.5, lift * state.walk, fore * 24 + forward * state.walk]
          : camelFoot(state.distance, phase, side, fore),
        hip: V = [side * 11, 73 + bob, fore * 24],
        knee: V = [
          side * 11,
          36,
          fore * 24 + (foot[2] - fore * 24) * 0.45 + fore * 2,
        ];
      for (const [part, from, to, r0, r1] of [
        ['upper', hip, knee, 4.5, 3],
        ['lower', knee, foot, 2.8, 2.1],
      ] as [string, V, V, number, number][]) {
        const delta = sub(to, from);
        children.push(
          cargoNode(
            `camel-leg-${side}-${fore}-${part}`,
            mesh(`cargo-camel-leg-${r0}`, (out) =>
              lathe(
                out,
                [
                  [0, r0],
                  [15, r0 * 0.85],
                  [38, r1],
                ],
                'camel',
                20,
              ),
            ),
            from,
            [],
            aim(delta),
            [1, Math.hypot(...delta) / 38, 1],
          ),
        );
      }
      children.push(
        cargoNode(
          `camel-hoof-${side}-${fore}`,
          mesh('camel-soft-hoof', (out) => {
            for (const s of [-1, 1])
              sphere(
                out,
                [s * 1.2, 1.5, 2],
                [1.6, 1.6, 3.8],
                'leather',
                16,
                10,
              );
          }),
          foot,
        ),
      );
    }
  return cargoNode(
    'loaded-camel',
    undefined,
    state.at,
    children,
    yaw(state.heading),
  );
}

export function treasuryCollection(): RigNode {
  const children: RigNode[] = [];
  const place = (id: CargoProp, at: V, scale = 1, angle = 0) => {
    const n = cargoPropRig(id);
    n.name = id + '-' + children.length;
    n.position = at;
    n.rotation = yaw(angle);
    n.scale = [scale, scale, scale];
    children.push(n);
  };
  place('treasure-chest', [-25, 0, 0]);
  place('treasure-chest', [-25, 0, -32], 0.78, 0.04);
  place('gold-basket', [24, 0, 0], 0.85);
  place('gold-urn', [-53, 0, 4], 0.8);
  place('gold-ewer', [-42, 0, 10], 0.68);
  place('gold-ingots', [-16, 0, 23], 0.8);
  place('coin-hoard', [4, 0, 22], 0.8);
  place('gold-pouches', [46, 0, 17], 0.8);
  place('lidded-basket', [50, 0, -13], 0.62);
  place('rope-coils', [-51, 0, -15], 0.7);
  place('jewelry-tray', [24, 0, -30], 0.9);
  return cargoNode('treasury-collection', undefined, [0, 0, 0], children);
}
export function nativeCargoActors(frame: number): RigNode {
  const left = treasuryCollection();
  left.name = 'foreground-treasury';
  left.position = [-200, 0, 322];
  left.scale = [0.8, 0.8, 0.65];
  const right = cargoNode(
    'travel-equipment',
    undefined,
    [180, 0, 320],
    [
      cargoNode('rolled-rugs', cargoPropFaces('rolled-carpets')),
      cargoNode('water-skins', cargoPropFaces('water-skins'), [26, 0, 0]),
      cargoNode('gold-urn', cargoPropFaces('gold-urn'), [-24, 0, 0]),
    ],
  );
  return cargoNode(
    'elephant-and-gold-cargo',
    undefined,
    [0, 0, 0],
    [cargoElephant(frame, { rest: true }), left, right],
  );
}
