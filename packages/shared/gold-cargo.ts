import maps from './generated/gold-cargo-materials.json' with { type: 'json' };
import refinedMaps from './generated/gold-cargo-refined.json' with { type: 'json' };
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
  | 'horse'
  | 'gold-cloth'
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
  elephant: '#77736b',
  ivory: '#d9caa8',
  leather: '#614329',
  camel: '#b38a58',
  horse: '#302b26',
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
  const fine = refinedMaps as Record<
    string,
    { width: number; height: number; pixels: string[] }
  >;
  const map =
    fine[
      material === 'horse'
        ? 'camel'
        : material === 'gold-cloth'
          ? 'gold'
          : material
    ] ||
    maps[
      material === 'ivory' || material === 'eye'
        ? 'wood'
        : (material as keyof typeof maps)
    ];
  const x = Math.floor((((u % 1) + 1) % 1) * map.width),
    y = Math.floor((((v % 1) + 1) % 1) * map.height),
    color = map.pixels[y * map.width + x];
  if (!bases[material] || material === 'camel') return color;
  const light =
    [1, 3, 5].reduce((n, i) => n + parseInt(color.slice(i, i + 2), 16), 0) / 3;
  if (material === 'ivory')
    return tint(bases.ivory!, 0.98 + Math.min(1, light / 180) * 0.04);
  return tint(
    bases[material]!,
    material === 'eye' ? 1 : 0.94 + Math.min(1, light / 180) * 0.12,
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
        : material === 'gold-cloth'
          ? 'brocade'
          : material === 'elephant' ||
              material === 'camel' ||
              material === 'horse' ||
              material === 'eye'
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
    for (let i = 0; i < nu; i++) {
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
      out[out.length - 1].uv = [
        uv(i / nu, j / nv),
        uv((i + 1) / nu, j / nv),
        uv((i + 1) / nu, (j + 1) / nv),
        uv(i / nu, (j + 1) / nv),
      ];
    }
}

/** Smooth anatomical sections; one continuous surface rather than intersecting blocks. */
function spline(profile: number[][], t: number): number[] {
  const f = clamp(t) * (profile.length - 1),
    i = Math.min(profile.length - 2, Math.floor(f)),
    k = f - i;
  return profile[i].map((_, axis) => {
    const a = profile[Math.max(0, i - 1)][axis],
      b = profile[i][axis],
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
}
function torso(
  out: CargoFace[],
  profile: number[][],
  material: CargoMaterial,
  nu = 72,
  nv = 56,
) {
  surface(
    out,
    (u, v) => {
      const [z, y, width, depth] = spline(profile, v),
        a = u * TAU;
      return [
        -Math.sin(a) * Math.max(0, width),
        y + Math.cos(a) * Math.max(0, depth),
        z,
      ];
    },
    nu,
    nv,
    material,
    (u, v) => [u * 2, v * 2],
  );
}
function neckTube(
  out: CargoFace[],
  profile: number[][],
  material: CargoMaterial,
  nu = 40,
  nv = 44,
) {
  surface(
    out,
    (u, v) => {
      const [y, z, width, depth] = spline(profile, v),
        before = spline(profile, v - 0.001),
        after = spline(profile, v + 0.001),
        tangent = unit([0, after[0] - before[0], after[1] - before[1]]),
        across: V = [1, 0, 0],
        around = unit(cross(tangent, across)),
        a = u * TAU;
      return add(
        [0, y, z],
        add(mul(across, Math.cos(a) * width), mul(around, Math.sin(a) * depth)),
      );
    },
    nu,
    nv,
    material,
    (u, v) => [u * 2, v * 2],
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
      const [y, radius] = spline(profile, v),
        r = Math.max(0, radius);
      return [Math.sin(u * TAU) * r, y, Math.cos(u * TAU) * r * stretch];
    },
    nu,
    (profile.length - 1) * 3,
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
      const c = spline(points, v) as V;
      const t = unit(
          sub(spline(points, v + 0.001) as V, spline(points, v - 0.001) as V),
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
    Math.max(12, (points.length - 1) * 3),
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
  const cabin = mesh('enclosed-royal-palanquin', (out) => {
    box(out, [0, 1, -15], [57, 4, 70], 'wood', 18, 10);
    box(out, [0, 4, -15], [60, 2, 73], 'gold', 24, 12);
    box(out, [0, 7, -15], [46, 4, 57], 'brocade', 20, 16);
    sphere(out, [0, 11, -35], [18, 4, 7], 'brocade', 32, 20);
    // Four substantial walls. Curved arched openings reveal crimson curtains
    // and filigree grilles instead of the former open gazebo silhouette.
    const wall = (side: number, front: boolean) => {
      const span = front ? 52 : 64,
        centers = front ? [0] : [-16, 16];
      const point = (x: number, y: number): V =>
        front ? [x, y, side === 1 ? 18 : -48] : [side * 27, y, -15 + x];
      const open = (x: number, y: number) =>
        centers.some((c) => {
          const t = Math.abs((x - c) / 10);
          return t < 1 && y > 23 && y < 43 + 7 * Math.sqrt(1 - t * t);
        });
      for (let i = 0; i < 64; i++)
        for (let j = 0; j < 48; j++) {
          const x0 = -span / 2 + (i * span) / 64,
            x1 = x0 + span / 64,
            y0 = 8 + j,
            y1 = y0 + 1;
          if (open((x0 + x1) / 2, (y0 + y1) / 2)) continue;
          face(
            out,
            [point(x0, y0), point(x1, y0), point(x1, y1), point(x0, y1)],
            'gold',
            sample('gold', i / 64, j / 48),
          );
          out[out.length - 1].uv = [
            [i / 64, j / 48],
            [(i + 1) / 64, j / 48],
            [(i + 1) / 64, (j + 1) / 48],
            [i / 64, (j + 1) / 48],
          ];
        }
      for (const c of centers) {
        const arch: V[] = [point(c - 10, 23), point(c - 10, 43)];
        for (let k = 0; k <= 32; k++) {
          const a = Math.PI - (k / 32) * Math.PI;
          arch.push(point(c + 10 * Math.cos(a), 43 + 7 * Math.sin(a)));
        }
        arch.push(point(c + 10, 23));
        sweep(out, arch, 0.65, 'gold', 10);
        for (const dx of [-7, -3.5, 0, 3.5, 7]) {
          const top = 43 + 7 * Math.sqrt(1 - (dx / 10) ** 2);
          sweep(
            out,
            [point(c + dx, 24), point(c + dx, top - 0.5)],
            0.2,
            'gold',
            7,
          );
        }
        for (const y of [28, 34, 40, 46]) {
          const half = y > 43 ? 10 * Math.sqrt(1 - ((y - 43) / 7) ** 2) : 10;
          sweep(out, [point(c - half, y), point(c + half, y)], 0.2, 'gold', 7);
        }
        // The fabric is set behind the real opening, with deep vertical folds.
        surface(
          out,
          (u, v) => {
            const p = point(c + (u - 0.5) * 20, 23 + v * 27);
            if (front) p[2] -= side * (1.6 + Math.sin(u * Math.PI * 8) * 0.3);
            else p[0] -= side * (1.6 + Math.sin(u * Math.PI * 8) * 0.3);
            return p;
          },
          28,
          28,
          'brocade',
          (u, v) => [u, v],
        );
      }
    };
    for (const side of [-1, 1]) {
      wall(side, false);
      wall(side, true);
    }
    for (const x of [-27, 27])
      for (const z of [-48, 18]) {
        sweep(
          out,
          [
            [x, 5, z],
            [x, 57, z],
          ],
          1.1,
          'gold',
          12,
        );
        for (const y of [8, 22, 51, 56])
          sphere(out, [x, y, z], [1.5, 1.4, 1.5], 'gold', 14, 10);
      }
    box(out, [0, 56, -15], [59, 3, 73], 'gold', 24, 16);
    for (const side of [-1, 1])
      for (let i = 0; i < 18; i++) {
        const z = -46 + i * 3.7;
        sweep(
          out,
          [
            [side * 28, 6, z],
            [side * 28, 1.5, z],
          ],
          0.17,
          'gold',
          6,
        );
        sphere(out, [side * 28, 0.8, z], [0.45, 0.7, 0.45], 'gold', 10, 6);
      }
  });
  const roof = mesh('domed-golden-howdah-roof', (out) => {
    const corners: V[] = [
      [-32, 58, -54],
      [32, 58, -54],
      [32, 58, 24],
      [-32, 58, 24],
      [-32, 58, -54],
    ];
    for (let i = 0; i < 4; i++) {
      const a = corners[i],
        b = corners[i + 1];
      surface(
        out,
        (u, v) => {
          const p = mix(a, b, u),
            k = 1 - v * 0.45;
          return [
            p[0] * k,
            58 + Math.sin((v * Math.PI) / 2) * 10,
            -15 + (p[2] + 15) * k,
          ];
        },
        32,
        20,
        'gold',
        (u, v) => [u * 1.5, v],
      );
      sweep(out, [a, b], 0.65, 'gold', 10);
    }
    const first = out.length;
    lathe(
      out,
      [
        [67, 13],
        [69, 14.3],
        [73, 12.5],
        [77, 8],
        [79, 2],
        [80, 0.4],
      ],
      'gold',
      64,
      1.2,
    );
    for (const f of out.slice(first))
      f.points = f.points.map((p) => [p[0], p[1], p[2] - 15]);
    sweep(
      out,
      [
        [0, 79, -15],
        [0, 88, -15],
      ],
      0.55,
      'gold',
      10,
    );
    sphere(out, [0, 84, -15], [1.5, 1.5, 1.5], 'gold', 20, 14);
    for (const x of [-28, 28])
      for (const z of [-49, 19]) {
        sweep(
          out,
          [
            [x, 58, z],
            [x, 68, z],
          ],
          0.5,
          'gold',
          10,
        );
        sphere(out, [x, 64, z], [1.3, 1.7, 1.3], 'gold', 16, 12);
      }
  });
  const standard = cargoNode(
    'elephant-royal-standard',
    undefined,
    [-31, 0, -46],
    [
      cargoNode(
        'standard-pole',
        mesh('elephant-standard-pole', (out) => {
          sweep(
            out,
            [
              [0, 3, 0],
              [0, 112, 0],
            ],
            0.65,
            'gold',
            12,
          );
          sphere(out, [0, 113, 0], [1.1, 1.5, 1.1], 'gold', 20, 12);
          sweep(
            out,
            [
              [0, 114, 0],
              [0, 118, 0],
            ],
            0.25,
            'gold',
            8,
          );
        }),
      ),
      cargoNode(
        'standard-cloth',
        mesh('elephant-standard-cloth', (out) => {
          surface(
            out,
            (u, v) => [
              -u * 34,
              108 - v * 52 - u * 3,
              Math.sin(u * 9 + v * 1.4) * u * 1.4,
            ],
            48,
            56,
            'gold-cloth',
            (u, v) => [u, v],
          );
          for (const y of [56, 108])
            sweep(
              out,
              [
                [0, y, 0],
                [-17, y - 1.5, 1],
                [-34, y - 3, 0.5],
              ],
              0.16,
              'gold',
              6,
            );
        }),
      ),
    ],
  );
  return cargoNode(
    'golden-howdah',
    undefined,
    [0, 0, 0],
    [
      cargoNode('enclosed-arched-cabin', cabin),
      cargoNode('domed-pavilion-roof', roof),
      standard,
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
    // A continuous, gently cupped ear. One UV chart avoids the old radial
    // triangle seams and its corrugated, rigid fan silhouette.
    const outline = [
      [1, 10],
      [8, 18],
      [19, 15],
      [25, 2],
      [23, -14],
      [15, -27],
      [6, -25],
      [1, -12],
      [1, 10],
    ];
    const center: V = [side * 11, -5, -2];
    for (const back of [false, true]) {
      const start = out.length;
      surface(
        out,
        (u, v) => {
          const [x, y] = spline(outline, u);
          const bulge = Math.sin(v * Math.PI) ** 2 * 2.3;
          const localX = 11 + (x - 11) * v;
          return [
            center[0] + (x * side - center[0]) * v,
            center[1] + (y - center[1]) * v,
            -2 -
              bulge -
              (localX / 30) ** 2 * 4 +
              (back ? -0.55 : 0.55) +
              Math.sin(u * TAU * 9) * v ** 3 * 0.35,
          ];
        },
        88,
        24,
        'elephant',
        (u, v) => {
          const [x, y] = spline(outline, u);
          return [0.5 + ((x - 11) * v) / 28, 0.5 + ((y + 5) * v) / 48];
        },
      );
      for (const f of out.slice(start)) {
        f.normals = f.normals!.map((n) =>
          Math.abs(n[2]) < 0.15
            ? ([0, 0, back ? -1 : 1] as V)
            : n[2] * (back ? -1 : 1) < 0
              ? mul(n, -1)
              : n,
        );
        const geometric = cross(
          sub(f.points[1], f.points[0]),
          sub(f.points[2], f.points[0]),
        );
        if (
          geometric.reduce((sum, v, i) => sum + v * f.normals![1][i], 0) < 0
        ) {
          f.points.reverse();
          f.normals.reverse();
          f.uv?.reverse();
        }
      }
    }
    const rim = Array.from({ length: 97 }, (_, i): V => {
      const [x, y] = spline(outline, i / 96);
      return [x * side, y, -2 - (x / 30) ** 2 * 4];
    });
    sweep(out, rim, 0.35, 'elephant', 6);
  });
}
function elephantLoad(frame: number): RigNode {
  const pavilion = howdah();
  pavilion.children
    .find((n) => n.name === 'elephant-royal-standard')!
    .children.find((n) => n.name === 'standard-cloth')!.rotation = yaw(
    Math.sin((frame / 240) * TAU * 2) * 0.035,
  );
  const loads: RigNode[] = [
    cargoNode('woven-saddle-cloth', mesh('elephant-draped-blanket', blanket)),
    cargoNode('howdah-mount', undefined, [0, 35, 0], [pavilion]),
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
        torso(
          out,
          [
            [-68, -1, 0, 0],
            [-58, -1, 29, 27],
            [-38, 0, 42, 34],
            [-12, -2, 43, 35],
            [16, -1, 40, 34],
            [39, 2, 37, 33],
            [56, 2, 24, 25],
            [64, 0, 0, 0],
          ],
          'elephant',
        );
        // Broad scapulae and haunches blend into the upper legs.
        for (const side of [-1, 1]) {
          sphere(
            out,
            [side * 25, -8, 38],
            [19, 27, 24],
            'elephant',
            40,
            28,
            0.001,
          );
          sphere(
            out,
            [side * 25, -9, -39],
            [21, 26, 25],
            'elephant',
            40,
            28,
            0.001,
          );
        }
      }),
    ),
    elephantLoad(t),
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
        surface(
          out,
          (u, v) => {
            const [y, rx, rz, cz] = spline(
              [
                [-30, 5, 6, 17],
                [-23, 15, 15, 9],
                [-9, 23, 22, 1],
                [10, 25, 24, -1],
                [25, 21, 20, -4],
                [36, 12, 11, -5],
                [40, 0, 0, -5],
              ],
              v,
            );
            const a = u * TAU;
            return [
              Math.sin(a) * Math.max(0, rx),
              y,
              cz + Math.cos(a) * Math.max(0, rz),
            ];
          },
          72,
          64,
          'elephant',
          (u, v) => [u * 2, 1 - v],
        );
        for (const side of [-1, 1]) {
          sphere(
            out,
            [side * 22.8, 9, 9.4],
            [1.9, 1.6, 2.1],
            'elephant',
            24,
            16,
          );
          sphere(
            out,
            [side * 24, 9.2, 10.4],
            [0.72, 0.68, 0.86],
            'eye',
            20,
            16,
          );
          sweep(
            out,
            [
              [side * 20.2, 11.3, 12],
              [side * 23, 12, 10],
              [side * 25, 10.5, 8],
            ],
            0.62,
            'elephant',
            10,
          );
          sweep(
            out,
            [
              [side * 21.3, 7.5, 11],
              [side * 23.1, 7.6, 10.5],
              [side * 24.6, 8.2, 8.5],
            ],
            0.32,
            'elephant',
            8,
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
        [side * 20, 9, -8],
        [],
        yaw(side * (0.22 + Math.sin(a * 2 + side * 0.5) * 0.035)),
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
                side * (11 + 14 * v * v),
                -9 - 50 * v + 38 * v * v,
                23 + 36 * v,
              ];
              const tangent = unit([side * 28 * v, -50 + 76 * v, 36]),
                a = unit(cross(tangent, [0, 1, 0])),
                b = unit(cross(tangent, a));
              const radius = 3.8 * Math.max(0, 1 - v) ** 0.65 + 0.08;
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
      'gold-forehead-caparison',
      mesh('reference-gold-forehead-cloth', (out) => {
        const profile = [
          [25, 8, 18],
          [13, 14, 27],
          [-3, 13, 36.5],
          [-17, 8, 40],
          [-31, 4.3, 44],
          [-43, 1.5, 46],
        ];
        surface(
          out,
          (u, v) => {
            const [y, width, z] = spline(profile, v);
            return [(u - 0.5) * width * 2, y, z + Math.sin(u * Math.PI) * 1.5];
          },
          40,
          56,
          'gold-cloth',
          (u, v) => [u, v * 1.3],
        );
        for (const side of [-1, 1]) {
          const edge = Array.from({ length: 49 }, (_, i): V => {
            const [y, w, z] = spline(profile, i / 48);
            return [side * w, y, z + 0.1];
          });
          sweep(out, edge, 0.28, 'gold', 8);
          sweep(
            out,
            [
              [side * 21, 21, 6],
              [side * 23, 10, 10],
              [side * 20, -5, 19],
              [side * 11, -14, 26],
            ],
            0.55,
            'leather',
            10,
          );
          for (let i = 0; i < 8; i++) {
            const [y, w, z] = spline(profile, i / 9);
            sphere(
              out,
              [side * w, y, z + 0.2],
              [0.45, 0.55, 0.3],
              'gold',
              10,
              6,
            );
          }
        }
        for (let i = -2; i <= 2; i++) {
          sweep(
            out,
            [
              [i * 2, -25, 41],
              [i * 2, -30 - Math.abs(i) * 0.7, 42.5],
            ],
            0.16,
            'gold',
            7,
          );
          sphere(
            out,
            [i * 2, -31 - Math.abs(i) * 0.7, 42.7],
            [0.5, 0.8, 0.4],
            'gold',
            12,
            8,
          );
        }
        sphere(out, [0, 11, 27], [2.4, 3.2, 0.5], 'gold', 28, 20);
      }),
    ),
  );
  const original: V[] = [
    [0, -5, 25],
    [0, -23, 30],
    [0, -43, 34],
    [0, -64, 37],
    [0, -85, 41],
    [1, -105, 48],
    [2, -112, 57],
    [3, -106, 63],
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
          fore * 42 + (foot[2] - fore * 42) * 0.48 + (fore === 1 ? 2 : -7),
        ];
      for (const [part, from, to, ra, rb] of [
        ['upper', hip, knee, fore === 1 ? 17 : 19, 10.2],
        ['lower', knee, foot, 10.2, 11.8],
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
                  [8, ra * 1.02],
                  [22, ra * 0.85],
                  [38, rb * 1.02],
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
            lathe(
              out,
              [
                [0, 7.5],
                [0.6, 11.3],
                [3, 12.1],
                [7, 11.7],
                [12, 10.5],
              ],
              'elephant',
              40,
              1.15,
            );
            for (let i = 0; i < 4; i++) {
              const q = (i - 1.5) * 0.42;
              sphere(
                out,
                [Math.sin(q) * 10.3, 2.7, Math.cos(q) * 12.4],
                [1.5, 1.5, 0.42],
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
  const spine = cargoNode('camel-spine', undefined, [0, 76 + bob, 0], []);
  spine.children.push(
    cargoNode(
      'dromedary-anatomy',
      mesh('cargo-camel-anatomy', (out) => {
        torso(
          out,
          [
            [-46, 1, 0, 0],
            [-36, 0, 17, 21],
            [-18, -2, 23, 24],
            [6, -1, 23, 24],
            [25, 1, 21, 23],
            [38, 3, 13, 17],
            [43, 5, 0, 0],
          ],
          'camel',
          64,
          52,
        );
        sphere(out, [0, 21, -7], [15, 20, 22], 'camel', 48, 32, 0.001);
        neckTube(
          out,
          [
            [4, 26, 14, 15],
            [12, 36, 12, 13],
            [23, 38, 9, 11],
            [35, 42, 7, 8.5],
            [43, 53, 6, 7],
          ],
          'camel',
        );
        // Cheeks, long upper muzzle, split upper lip, nostrils and heavy lids.
        sphere(out, [0, 45, 60], [7.2, 8.2, 13.8], 'camel', 40, 28, 0.001);
        sphere(out, [0, 40.7, 72.8], [5.9, 5.8, 10.2], 'camel', 36, 24);
        for (const side of [-1, 1]) {
          sphere(out, [side * 2.5, 39.2, 80.5], [3, 2, 3], 'camel', 24, 16);
          sphere(out, [side * 5.6, 53.2, 53], [2.2, 4.2, 1.7], 'camel', 24, 16);
          sphere(out, [side * 6.3, 46.8, 62], [0.72, 0.65, 0.5], 'eye', 20, 14);
          sweep(
            out,
            [
              [side * 5, 48, 63.2],
              [side * 6.4, 48.2, 61.6],
              [side * 7.1, 47.3, 60.5],
            ],
            0.34,
            'camel',
            8,
          );
          sphere(out, [side * 3.7, 42.3, 80], [0.8, 0.48, 0.42], 'eye', 16, 10);
        }
        sweep(
          out,
          [
            [-4.4, 37.8, 80],
            [0, 37.2, 82.5],
            [4.4, 37.8, 80],
          ],
          0.13,
          'leather',
          8,
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
            [-5.5, 45, 72],
            [-5.8, 40.5, 78],
            [0, 39, 82],
            [5.8, 40.5, 78],
            [5.5, 45, 72],
          ],
          0.55,
          'leather',
          8,
        );
        sweep(
          out,
          [
            [-5.5, 47.5, 61],
            [0, 50.5, 66],
            [5.5, 47.5, 61],
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
        hip: V = [side * 11, 71 + bob, fore * 24],
        knee: V = [
          side * 11,
          36,
          fore * 24 + (foot[2] - fore * 24) * 0.45 + fore * 2,
        ];
      for (const [part, from, to, r0, r1] of [
        ['upper', hip, knee, fore === 1 ? 6 : 7.8, 3.4],
        ['lower', knee, foot, 3.4, 2.6],
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
              sphere(out, [s * 1.2, 1.5, 2], [1.9, 1.5, 4.6], 'camel', 16, 10);
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

/** An adult royal horse with a deep barrel, withers, muscular quarters and tapered joints. */
export function cargoHorse(pose: CargoPose & { t: number }): RigNode {
  const body = cargoNode(
    'horse-body',
    mesh('royal-horse-anatomy-v2', (out) => {
      torso(
        out,
        [
          [-39, 44, 0, 0],
          [-31, 44, 12, 14],
          [-19, 44, 17, 18],
          [2, 44, 18, 19],
          [21, 46, 15, 19],
          [32, 48, 10, 14],
          [37, 49, 0, 0],
        ],
        'horse',
        64,
        52,
      );
      for (const s of [-1, 1]) {
        sphere(out, [s * 10.5, 42, -24], [9, 14, 13], 'horse', 36, 26);
        sphere(out, [s * 9, 43, 23], [8.5, 15, 12], 'horse', 36, 26);
      }
      neckTube(
        out,
        [
          [52, 24, 10, 14],
          [62, 27, 8, 13],
          [73, 33, 6.3, 9],
          [79, 38, 5.8, 6],
        ],
        'horse',
      );
      sphere(out, [0, 77.5, 42], [6.6, 9.2, 10.5], 'horse', 40, 28);
      neckTube(
        out,
        [
          [78, 43, 5.8, 7],
          [74.5, 51, 5.3, 5.7],
          [69.7, 57, 4.8, 4],
        ],
        'horse',
        36,
        28,
      );
      sphere(out, [0, 69.4, 57.5], [5.2, 4.2, 5.7], 'horse', 36, 24);
      for (const s of [-1, 1]) {
        sphere(out, [s * 3.6, 88, 37], [1.5, 5.1, 1.8], 'horse', 28, 22);
        sphere(out, [s * 5.8, 80, 43], [0.82, 0.8, 0.65], 'eye', 20, 14);
        sphere(out, [s * 4.6, 71.1, 59.3], [0.85, 0.8, 0.45], 'eye', 20, 14);
        sweep(
          out,
          [
            [s * 5, 81.5, 44.8],
            [s * 6.2, 81.4, 43],
            [s * 6.6, 80.5, 41.5],
          ],
          0.4,
          'horse',
          8,
        );
      }
      sweep(
        out,
        [
          [-4.5, 67.3, 59],
          [0, 66.7, 61],
          [4.5, 67.3, 59],
        ],
        0.13,
        'eye',
        8,
      );
      for (let i = 0; i < 18; i++) {
        const u = i / 17;
        sweep(
          out,
          [
            [0, 81 - u * 23, 32 - u * 6],
            [-1.2, 82 - u * 23, 28 - u * 6],
            [-2.1, 79 - u * 23, 25 - u * 6],
          ],
          0.65,
          'horse',
          7,
        );
      }
    }),
  );
  const cloth = cargoNode(
    'royal-horse-saddlecloth',
    mesh('royal-horse-saddlecloth-v2', (out) => {
      surface(
        out,
        (u, v) => {
          const a = (u - 0.5) * Math.PI * 1.25;
          return [
            Math.sin(a) * 18,
            43 + Math.cos(a) * 21 + Math.sin(v * Math.PI) * 0.15,
            -16 + v * 33,
          ];
        },
        56,
        40,
        'brocade',
        (u, v) => [u, v],
      );
      for (const side of [-1, 1])
        for (let i = 0; i < 10; i++)
          sweep(
            out,
            [
              [side * 17.2, 35, -14 + i * 3.3],
              [side * 17.5, 32, -14 + i * 3.3],
            ],
            0.16,
            'gold',
            6,
          );
      box(out, [0, 62.2, -1], [19, 3, 19], 'leather', 16, 12);
      for (const side of [-1, 1]) {
        sweep(
          out,
          [
            [side * 6, 80, 43],
            [side * 5.5, 71, 59],
            [side * 3, 68, 60],
          ],
          0.42,
          'leather',
          8,
        );
        sweep(
          out,
          [
            [side * 5, 72, 59],
            [side * 7, 71, 52],
            [side * 8, 65, 32],
            [side * 7, 70, 7],
          ],
          0.25,
          'rope',
          8,
        );
        sweep(
          out,
          [
            [side * 12, 59, 22],
            [side * 15, 45, 29],
            [side * 7, 37, 35],
            [0, 35, 36],
          ],
          0.55,
          'leather',
          8,
        );
        sphere(out, [side * 8, 38, 35], [1, 1.1, 0.5], 'gold', 16, 12);
      }
    }),
  );
  const children: RigNode[] = [body, cloth];
  for (const side of [-1, 1])
    for (const fore of [-1, 1]) {
      const phase = side * fore === 1 ? 0 : 0.5,
        u = (((pose.distance / 42 + phase) % 1) + 1) % 1,
        k = ease((u - 0.6) / 0.4),
        forward = u < 0.6 ? 12.6 - 42 * u : -12.6 + 25.2 * k,
        lift = u < 0.6 ? 0 : Math.sin(((u - 0.6) / 0.4) * Math.PI) * 7;
      const foot: V = [
          side * 9,
          lift * pose.walk,
          fore * 23 + forward * pose.walk,
        ],
        hip: V = [side * 10, 45, fore * 23],
        knee: V = [
          side * 10,
          24,
          fore * 23 + (foot[2] - fore * 23) * 0.45 + (fore === 1 ? 1 : -5),
        ];
      for (const [part, from, to, ra, rb] of [
        ['upper', hip, knee, fore === 1 ? 5.8 : 7.3, 2.8],
        ['lower', knee, foot, 2.8, 2.4],
      ] as [string, V, V, number, number][]) {
        const delta = sub(to, from);
        children.push(
          cargoNode(
            `horse-${side}-${fore}-${part}`,
            mesh(`horse-limb-${ra}-${rb}`, (out) => {
              lathe(
                out,
                [
                  [0, ra],
                  [5, ra * 1.02],
                  [13, ra * 0.7],
                  [20, rb * 1.06],
                  [24, rb],
                ],
                'horse',
                32,
              );
            }),
            from,
            [],
            aim(delta),
            [1, Math.hypot(...delta) / 24, 1],
          ),
        );
      }
      children.push(
        cargoNode(
          `horse-${side}-${fore}-hoof`,
          mesh('natural-horse-hoof', (out) => {
            lathe(
              out,
              [
                [0, 2.4],
                [0.4, 3.1],
                [3, 2.8],
                [4, 2.2],
              ],
              'leather',
              28,
              1.32,
            );
          }),
          foot,
        ),
      );
    }
  children.push(
    cargoNode(
      'horse-tail',
      mesh('flowing-horse-tail-v2', (out) => {
        sweep(
          out,
          [
            [0, 0, 0],
            [0, -9, -8],
            [0, -20, -12],
            [0, -34, -14],
          ],
          (u) => 2.4 - u * 0.9,
          'horse',
          16,
        );
        for (const s of [-1, 1])
          sweep(
            out,
            [
              [s, -10, -8],
              [s * 2, -25, -12],
              [s * 2, -38, -16],
            ],
            (u) => 1.1 - u * 0.8,
            'horse',
            8,
          );
      }),
      [0, 48, -34],
      [],
      yaw(Math.sin((pose.t / 240) * TAU * 2) * 0.08),
    ),
  );
  return cargoNode(
    'royal-horse',
    undefined,
    pose.at,
    children,
    yaw(pose.heading),
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
