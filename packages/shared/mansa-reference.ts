import maps from './generated/mansa-reference.json' with { type: 'json' };
import type {
  HumanPose,
  Quaternion,
  RigFace,
  RigNode,
  RoyalFinish,
} from './royal-caravan';
import type { Vertex3 } from './infrastructure';
import type { Point } from './iso';

// Owner's 25 November correction: realistic anatomy and the exact white/red
// portrait costume. Facial color is sampled generated art, not a painted face.
const TAU = Math.PI * 2;
const cache = new Map<string, RigFace[]>();
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const add = (a: Vertex3, b: Vertex3): Vertex3 =>
  a.map((v, i) => v + b[i]) as Vertex3;
const sub = (a: Vertex3, b: Vertex3): Vertex3 =>
  a.map((v, i) => v - b[i]) as Vertex3;
const mul = (a: Vertex3, s: number): Vertex3 => a.map((v) => v * s) as Vertex3;
const cross = (a: Vertex3, b: Vertex3): Vertex3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (v: Vertex3): Vertex3 => mul(v, 1 / (Math.hypot(...v) || 1));
const pitch = (a: number): Quaternion => [
  Math.sin(a / 2),
  0,
  0,
  Math.cos(a / 2),
];
const yaw = (a: number): Quaternion => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const aim = (v: Vertex3): Quaternion => {
  const n = unit(v),
    c = cross([0, 1, 0], n),
    w = 1 + n[1],
    d = Math.hypot(...c, w);
  return d < 1e-6 ? [1, 0, 0, 0] : [c[0] / d, c[1] / d, c[2] / d, w / d];
};
const N = (
  name: string,
  faces?: RigFace[],
  position: Vertex3 = [0, 0, 0],
  rotation: Quaternion = [0, 0, 0, 1],
  children: RigNode[] = [],
  scale: Vertex3 = [1, 1, 1],
): RigNode => ({ name, faces, position, rotation, children, scale });
function geometry(key: string, build: (faces: RigFace[]) => void) {
  if (!cache.has(key)) {
    const faces: RigFace[] = [];
    build(faces);
    cache.set(key, faces);
  }
  return cache.get(key)!;
}
function sample(finish: RoyalFinish, u: number, v: number): string {
  if (finish === 'skin') return '#855037';
  if (finish === 'hair') return '#181413';
  const art = maps[finish];
  const x = finish === 'face' ? clamp(u) : ((u % 1) + 1) % 1;
  const y = finish === 'face' ? clamp(v) : ((v % 1) + 1) % 1;
  return art.pixels[
    Math.min(art.height - 1, Math.floor(y * art.height)) * art.width +
      Math.min(art.width - 1, Math.floor(x * art.width))
  ];
}
/** Smooth, shared vertex normals and explicit texture coordinates on a curved
 * surface. Native rendering samples the same image; GLBs embed the full map. */
function surface(
  out: RigFace[],
  at: (u: number, v: number) => Vertex3,
  nu: number,
  nv: number,
  finish: RoyalFinish,
  uv: (u: number, v: number) => Point = (u, v) => [u, v],
  color?: string,
  keep?: (u: number, v: number) => boolean,
) {
  const positions: Vertex3[][] = [],
    normals: Vertex3[][] = [];
  for (let j = 0; j <= nv; j++) {
    const row: Vertex3[] = [],
      nr: Vertex3[] = [];
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
    positions.push(row);
    normals.push(nr);
  }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const u = (i + 0.5) / nu,
        v = (j + 0.5) / nv;
      if (keep && !keep(u, v)) continue;
      const tex = uv(u, v);
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
        color: color ?? sample(finish, ...tex),
        finish,
        uv: ['skin', 'hair'].includes(finish)
          ? undefined
          : [
              uv(i / nu, j / nv),
              uv((i + 1) / nu, j / nv),
              uv((i + 1) / nu, (j + 1) / nv),
              uv(i / nu, (j + 1) / nv),
            ],
      });
    }
}
function sphere(
  out: RigFace[],
  center: Vertex3,
  radius: Vertex3,
  finish: RoyalFinish,
  color?: string,
  segments = 32,
  rings = 18,
  keep?: (p: Vertex3) => boolean,
) {
  const at = (u: number, v: number): Vertex3 => {
    const a = u * TAU,
      b = (v - 0.5) * Math.PI;
    return [
      center[0] + radius[0] * Math.sin(a) * Math.cos(b),
      center[1] + radius[1] * Math.sin(b),
      center[2] + radius[2] * Math.cos(a) * Math.cos(b),
    ];
  };
  surface(
    out,
    at,
    segments,
    rings,
    finish,
    (u, v) => [u * 2, 1 - v],
    color,
    keep ? (u, v) => keep(at(u, v)) : undefined,
  );
}
function sweep(
  out: RigFace[],
  path: Vertex3[],
  radius: number | ((t: number) => number),
  finish: RoyalFinish,
  color?: string,
  segments = 8,
) {
  const at = (u: number, v: number): Vertex3 => {
    const f = clamp(v) * (path.length - 1),
      i = Math.min(path.length - 2, Math.floor(f)),
      k = f - i;
    const c = add(path[i], mul(sub(path[i + 1], path[i]), k)),
      t = unit(
        sub(path[Math.min(path.length - 1, i + 2)], path[Math.max(0, i - 1)]),
      );
    const a = unit(cross(t, Math.abs(t[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0])),
      b = unit(cross(t, a)),
      r = typeof radius === 'number' ? radius : radius(v);
    return add(
      c,
      add(mul(a, Math.cos(u * TAU) * r), mul(b, Math.sin(u * TAU) * r)),
    );
  };
  surface(
    out,
    at,
    segments,
    path.length - 1,
    finish,
    (u, v) => [u, v * 4],
    color,
  );
}
function ring(
  out: RigFace[],
  center: Vertex3,
  radius: number,
  tube: number,
  finish: RoyalFinish,
  axes: Vertex3 = [1, 1, 0],
) {
  const points = Array.from({ length: 65 }, (_, i): Vertex3 => [
    center[0] + Math.cos((i * TAU) / 64) * radius * axes[0],
    center[1] + Math.sin((i * TAU) / 64) * radius * axes[1],
    center[2] + Math.sin((i * TAU) / 64) * radius * axes[2],
  ]);
  sweep(out, points, tube, finish);
}
type Profile = [number, number, number][];
function profileAt(profile: Profile, v: number) {
  const f = clamp(v) * (profile.length - 1),
    i = Math.min(profile.length - 2, Math.floor(f)),
    k = f - i,
    smooth = k * k * (3 - 2 * k);
  return profile[i].map(
    (n, j) => n + (profile[i + 1][j] - n) * smooth,
  ) as Vertex3;
}
function fabric(
  out: RigFace[],
  profile: Profile,
  finish: RoyalFinish,
  start = 0,
  end = TAU,
  fold = 0.28,
  sectors = 64,
  rows = 40,
) {
  surface(
    out,
    (u, v) => {
      const [y, rx, rz] = profileAt(profile, v),
        a = start + (end - start) * u;
      const f =
        fold * (Math.sin(a * 13 + v * 0.8) + 0.42 * Math.sin(a * 27 - v * 1.9));
      return [Math.sin(a) * (rx + f), y, Math.cos(a) * (rz + f * 0.72)];
    },
    sectors,
    rows,
    finish,
    (u, v) => [u * 4, 1 - v * 3],
  );
}
function head() {
  return geometry('reference-head-skin', (out) => {
    const faceY = (t: number) => 7.4 - t * 20 - Math.max(0, t - 0.58) * 4;
    sphere(
      out,
      [0, 1, -0.7],
      [6.1, 8.3, 6.2],
      'skin',
      undefined,
      48,
      28,
      (p) => p[2] < 2.9 || p[1] > 6.7,
    );
    sphere(out, [0, -8, 1.7], [4.25, 7.0, 4.1], 'hair', undefined, 48, 32);
    const widths = [
      [0, 0.75],
      [0.12, 0.95],
      [0.4, 0.96],
      [0.62, 0.88],
      [0.83, 0.62],
      [1, 0.1],
    ];
    const width = (v: number) => {
      let i = 0;
      while (i < widths.length - 2 && v > widths[i + 1][0]) i++;
      const [a, x] = widths[i],
        [b, y] = widths[i + 1];
      return x + (y - x) * clamp((v - a) / (b - a));
    };
    surface(
      out,
      (u, v) => {
        const t = 1 - v,
          nx = (u - 0.5) * 2,
          g = (cx: number, cy: number, sx: number, sy: number) =>
            Math.exp(-(((u - cx) / sx) ** 2) - ((t - cy) / sy) ** 2);
        const skull =
          2.5 + 3.45 * Math.sqrt(Math.max(0.015, 1 - (nx / 0.99) ** 2));
        const nose =
          2.6 * g(0.47, 0.405, 0.08, 0.12) +
          0.8 * g(0.47, 0.29, 0.047, 0.12) +
          0.35 * g(0.35, 0.42, 0.07, 0.045) +
          0.35 * g(0.59, 0.42, 0.07, 0.045);
        const orbital =
          -0.6 * g(0.22, 0.235, 0.13, 0.08) - 0.6 * g(0.7, 0.235, 0.13, 0.08);
        const cheeks =
          0.38 * g(0.18, 0.39, 0.15, 0.12) + 0.38 * g(0.76, 0.39, 0.15, 0.12);
        const mouth = 0.62 * g(0.47, 0.55, 0.24, 0.12);
        return [
          nx * 6.0,
          faceY(t),
          skull +
            nose +
            orbital +
            cheeks +
            mouth -
            t * 0.7 +
            Math.max(0, t - 0.5) * 5,
        ];
      },
      128,
      144,
      'face',
      (u, v) => [u, 1 - v],
      undefined,
      (u, v) => Math.abs(u - 0.5) * 2 < width(1 - v),
    );
    // Fine curled beard strands give the silhouette depth. Their color and
    // distribution follow the generated beard photograph, not a generic face.
    for (let y = 0; y < 17; y++)
      for (let x = -10; x <= 10; x++) {
        const u = 0.47 + x * 0.024,
          v = 0.64 + y * 0.019;
        if (Math.abs(x) > 10 - y * 0.32) continue;
        const c = sample('face', u, v),
          l = [1, 3, 5].reduce(
            (n, i) => n + parseInt(c.slice(i, i + 2), 16),
            0,
          );
        if (l > 225) continue;
        const nx = (u - 0.5) * 2,
          z =
            2.5 +
            3.45 * Math.sqrt(Math.max(0.015, 1 - (nx / 0.99) ** 2)) -
            v * 0.7 +
            Math.max(0, v - 0.5) * 5 +
            0.08;
        const path = Array.from({ length: 6 }, (_, i): Vertex3 => [
          nx * 6 + Math.cos(i * 1.4) * 0.085,
          faceY(v) - i * 0.045,
          z + Math.sin(i * 1.4) * 0.085,
        ]);
        sweep(out, path, 0.038, 'hair', c, 5);
      }
  });
}
function turban() {
  return geometry('reference-white-wrapped-turban', (out) => {
    sphere(out, [0, 8.6, -1.1], [7.75, 5.2, 6.65], 'linen', undefined, 64, 32);
    for (let i = 0; i < 7; i++)
      surface(
        out,
        (u, v) => {
          const a = u * TAU,
            r = 7.3 - i * 0.17 + Math.sin(v * Math.PI) * 0.15;
          return [
            Math.sin(a) * r,
            5.3 +
              i * 0.97 +
              Math.sin(a + 0.18 + i * 0.19) * 2.05 +
              (v - 0.5) * 1.65,
            Math.cos(a) * (6.35 - i * 0.12 + Math.sin(v * Math.PI) * 0.14) -
              0.7,
          ];
        },
        96,
        9,
        'linen',
        (u, v) => [u * 3, v * 0.5 + i * 0.35],
      );
    // Heavy wrapped fabric has thickness around the face and a rear fall.
    surface(
      out,
      (u, v) => {
        const y = -26 + v * 34,
          opening = 0.64 + 0.28 * v,
          a = opening + (TAU - 2 * opening) * u;
        const rx = 6.7 + Math.sin(v * Math.PI) * 0.9,
          rz = 5.7 + v * 0.55;
        const fold =
          0.16 * Math.sin(a * 13 + v * 8) + 0.1 * Math.sin(a * 22 - v * 4);
        return [Math.sin(a) * (rx + fold), y, Math.cos(a) * (rz + fold) - 0.45];
      },
      96,
      72,
      'linen',
      (u, v) => [u * 3, v * 3],
    );
    for (let i = 0; i < 5; i++) {
      const path = Array.from({ length: 49 }, (_, j): Vertex3 => {
        const a = (j * Math.PI) / 48;
        return [
          Math.cos(a) * (7.2 - i * 0.18),
          -23.3 - i * 0.45 - Math.sin(a) * 1.3,
          0.6 + Math.sin(a) * 5.6,
        ];
      });
      sweep(out, path, 0.26, 'linen', undefined, 10);
    }
  });
}
function medallion() {
  return geometry('reference-single-turban-medallion', (out) => {
    sphere(out, [0, 8.15, 6.1], [1.5, 1.5, 0.28], 'gold', undefined, 40, 18);
    ring(out, [0, 8.15, 6.4], 1.43, 0.09, 'gold');
    ring(out, [0, 8.15, 6.43], 1.15, 0.035, 'gold');
    for (let i = 0; i < 36; i++)
      sphere(
        out,
        [
          Math.cos((i * TAU) / 36) * 1.32,
          8.15 + Math.sin((i * TAU) / 36) * 1.32,
          6.43,
        ],
        [0.055, 0.055, 0.045],
        'gold',
        undefined,
        6,
        4,
      );
  });
}
function tunic() {
  return geometry('reference-ivory-layered-tunic', (out) => {
    fabric(
      out,
      [
        [-2, 8.1, 6],
        [8, 9, 6.7],
        [19, 11.1, 7.4],
        [24, 10.2, 6.7],
        [28, 4.1, 3.8],
      ],
      'linen',
      0,
      TAU,
      0.22,
      72,
      44,
    );
    for (let k = 0; k < 4; k++)
      surface(
        out,
        (u, v) => {
          const x = (u - 0.5) * 21.4,
            curve = Math.sin(u * Math.PI),
            sag = 3.5 + k * 2.8;
          return [
            x,
            25 - k * 1.1 - v * 2.0 - curve * (sag + v * 1.4),
            5.1 + curve * (3.25 + k * 0.12) + Math.sin(v * Math.PI) * 0.25,
          ];
        },
        64,
        10,
        'linen',
        (u, v) => [u * 2, v * 0.45 + k * 0.4],
      );
    // The left embroidered over-robe is visible beneath the white drape.
    fabric(
      out,
      [
        [0, 8.9, 6.7],
        [12, 10.4, 7.8],
        [24, 11.2, 7.1],
      ],
      'brocade',
      0.26,
      Math.PI * 0.83,
      0.12,
      32,
      30,
    );
  });
}
function skirt() {
  return geometry('reference-ivory-robe-skirt', (out) => {
    fabric(
      out,
      [
        [3.5, 11.4, 8.1],
        [10, 11.9, 8.4],
        [23, 9.9, 7.5],
        [38, 8.1, 6.1],
      ],
      'linen',
      0,
      TAU,
      0.43,
      80,
      52,
    );
    surface(
      out,
      (u, v) => {
        const x = (u - 0.5) * (18.6 - 4 * v),
          fold = Math.sin(u * TAU * 8 + v * 0.5) * 0.23;
        return [
          x,
          5.1 + v * 32,
          8.6 - v * 2.15 + Math.sin(u * Math.PI) * 0.6 + fold,
        ];
      },
      72,
      48,
      'linen',
      (u, v) => [u * 3, v * 4],
    );
    fabric(
      out,
      [
        [4.0, 11.7, 8.3],
        [4.3, 11.7, 8.3],
      ],
      'brocade',
      0,
      TAU,
      0.1,
      80,
      2,
    );
  });
}
function mantle() {
  return geometry('reference-asymmetric-crimson-velvet', (out) => {
    fabric(
      out,
      [
        [-31, 16.2, 11.6],
        [-19, 15.5, 11.3],
        [-3, 13.9, 10],
        [15, 12.7, 8.7],
        [25, 11.6, 7.7],
      ],
      'velvet',
      Math.PI * 0.88,
      TAU - 0.55,
      0.58,
      96,
      64,
    );
    const path = Array.from({ length: 65 }, (_, j): Vertex3 => {
      const [y, rx, rz] = profileAt(
        [
          [-31, 16.2, 11.6],
          [-19, 15.5, 11.3],
          [-3, 13.9, 10],
          [15, 12.7, 8.7],
          [25, 11.6, 7.7],
        ],
        j / 64,
      );
      const a = TAU - 0.55;
      return [Math.sin(a) * rx, y, Math.cos(a) * rz + 0.03];
    });
    sweep(out, path, 0.105, 'gold', undefined, 7);
    sphere(
      out,
      [-10.8, 24.1, 0.9],
      [4.1, 2.8, 6.7],
      'velvet',
      undefined,
      48,
      24,
    );
    for (let i = 0; i < 10; i++) {
      const p = Array.from({ length: 25 }, (_, j): Vertex3 => {
        const a = (Math.PI * j) / 24;
        return [
          -10.8 + Math.cos(a) * 4.12,
          24.1 + Math.sin(a) * 2.82,
          -4.8 + i * 1.2,
        ];
      });
      sweep(out, p, 0.055, 'gold', undefined, 5);
    }
  });
}
function jewelry() {
  return geometry('reference-eight-necklaces-five-pendants', (out) => {
    for (let i = 0; i < 8; i++) {
      const path = Array.from({ length: 129 }, (_, j): Vertex3 => {
        const a = (j * TAU) / 128;
        return [
          Math.cos(a) * (3.6 + i * 0.6),
          20.7 - Math.max(0, Math.sin(a)) * (2.5 + i * 1.7),
          4.5 + Math.sin(a) * (Math.sin(a) >= 0 ? 4.2 + i * 0.11 : 9.8),
        ];
      });
      sweep(out, path, i % 3 === 1 ? 0.18 : 0.29, 'gold', undefined, 10);
      if (i === 2 || i === 6)
        for (let j = 1; j < 32; j++) {
          const a = (j * Math.PI) / 32;
          sphere(
            out,
            [
              Math.cos(a) * (3.6 + i * 0.6),
              20.7 - Math.sin(a) * (2.5 + i * 1.7),
              4.5 + Math.sin(a) * (4.2 + i * 0.11),
            ],
            [0.34, 0.32, 0.3],
            'gold',
            undefined,
            10,
            7,
          );
        }
    }
    // Five large sculptural pendants, matching the portrait's arrangement.
    for (let i = -2; i <= 2; i++) {
      const x = i * 3.0,
        k = Math.sqrt(1 - (x / 7.8) ** 2),
        y = 20.7 - k * 14.4 - 1.5,
        z = 4.5 + k * 4.97;
      ring(out, [x, y + 1.6, z], 0.52, 0.13, 'gold');
      if (i === 0) {
        surface(
          out,
          (u, v) => {
            const a = u * TAU,
              r = (1 - v) * 1.6 + 0.12;
            return [
              x + Math.cos(a) * r,
              y - 3.7 + v * 4.2,
              z + Math.sin(a) * r * 0.62,
            ];
          },
          32,
          18,
          'gold',
        );
        ring(out, [x, y + 0.35, z + 0.9], 0.73, 0.06, 'gold');
      } else {
        const path = Array.from({ length: 25 }, (_, j): Vertex3 => {
          const t = j / 24;
          return [
            x + Math.sign(i) * Math.sin(t * Math.PI) * 0.58,
            y - t * 4.5,
            z + Math.sin(t * Math.PI) * 0.9,
          ];
        });
        sweep(out, path, (t) => 0.72 * (1 - t) + 0.06, 'gold', undefined, 14);
        for (let j = 0; j < 5; j++)
          ring(
            out,
            [x, y - j * 0.36, z],
            0.7 - j * 0.025,
            0.045,
            'gold',
            [1, 0, 1],
          );
      }
    }
  });
}
function sleeve(finish: RoyalFinish, length: number, radius: number) {
  return geometry(`reference-sleeve-${finish}-${length}-${radius}`, (out) => {
    fabric(
      out,
      [
        [0, radius * 0.8, radius * 0.8],
        [length * 0.12, radius, radius],
        [length * 0.48, radius * 0.91, radius * 0.84],
        [length * 0.82, radius * 0.8, radius * 0.78],
        [length, radius * 0.64, radius * 0.66],
      ],
      finish,
      0,
      TAU,
      0.1,
      40,
      24,
    );
    fabric(
      out,
      [
        [length - 1.3, radius * 0.71, radius * 0.73],
        [length - 0.2, radius * 0.71, radius * 0.73],
      ],
      'brocade',
      0,
      TAU,
      0.035,
      40,
      4,
    );
  });
}
function palm() {
  return geometry('reference-natural-palm', (out) => {
    sphere(out, [0, 1.1, 0], [1.65, 2.05, 0.74], 'skin', undefined, 24, 16);
    sphere(
      out,
      [-1.35, 1.05, 0.15],
      [0.65, 1.3, 0.65],
      'skin',
      undefined,
      20,
      12,
    );
  });
}
function finger(length: number, radius: number) {
  return geometry(`reference-finger-${length}-${radius}`, (out) => {
    sphere(
      out,
      [0, length * 0.5, 0],
      [radius, length * 0.53, radius * 0.88],
      'skin',
      undefined,
      14,
      10,
    );
  });
}
function hand(name: string, at: Vertex3, grip: number): RigNode {
  const children: RigNode[] = [];
  for (let i = 0; i < 5; i++) {
    const thumb = i === 4,
      len = thumb ? 1.15 : 1.35 - Math.abs(1.5 - i) * 0.14;
    const base: Vertex3 = thumb ? [-1.55, 0.8, 0.2] : [-1.2 + i * 0.8, 2.25, 0];
    children.push(
      N(
        `finger-${i}-base`,
        finger(len, thumb ? 0.44 : 0.31),
        base,
        pitch(grip * 0.7),
        [
          N(
            `finger-${i}-middle`,
            finger(len * 0.77, thumb ? 0.37 : 0.28),
            [0, len, 0],
            pitch(grip * 0.9),
            [
              N(
                `finger-${i}-tip`,
                finger(len * 0.55, thumb ? 0.32 : 0.24),
                [0, len * 0.77, 0],
                pitch(grip * 0.75),
              ),
            ],
          ),
        ],
      ),
    );
  }
  return N(name, palm(), at, pitch(Math.PI / 2), children);
}
function scepter() {
  return geometry('reference-disk-finial-gold-staff', (out) => {
    fabric(
      out,
      [
        [-53, 0.4, 0.4],
        [-51, 0.58, 0.58],
        [-49, 0.46, 0.46],
        [27, 0.49, 0.49],
        [29, 0.72, 0.72],
      ],
      'gold',
      0,
      TAU,
      0.0,
      32,
      24,
    );
    for (const y of [-51, -49, 21, 24, 27])
      ring(out, [0, y, 0], 0.65, 0.12, 'gold', [1, 0, 1]);
    sphere(out, [0, 30, 0], [2.5, 0.23, 2.5], 'gold', undefined, 40, 16);
    fabric(
      out,
      [
        [30, 0.32, 0.32],
        [31.2, 0.3, 0.3],
        [32, 0.65, 0.65],
      ],
      'gold',
      0,
      TAU,
      0,
      32,
      8,
    );
    sphere(out, [0, 35.5, 0], [3.7, 3.7, 0.36], 'gold', undefined, 48, 28);
    ring(out, [0, 35.5, 0.37], 3.52, 0.14, 'gold');
    ring(out, [0, 35.5, 0.46], 3.18, 0.055, 'gold');
    for (const [x, y] of [
      [0, 0],
      [-1.9, 0],
      [1.9, 0],
      [0, -1.9],
      [0, 1.9],
    ]) {
      sphere(
        out,
        [x, 35.5 + y, 0.52],
        [0.67, 0.67, 0.29],
        'gold',
        undefined,
        24,
        16,
      );
      ring(out, [x, 35.5 + y, 0.65], 0.64, 0.06, 'gold');
    }
  });
}
function cuff() {
  return geometry('reference-wide-gold-cuff', (out) => {
    fabric(
      out,
      [
        [0, 1.75, 1.4],
        [1.6, 1.75, 1.4],
      ],
      'gold',
      0,
      TAU,
      0,
      40,
      8,
    );
    for (const y of [0.12, 1.48])
      ring(out, [0, y, 0], 1.77, 0.075, 'gold', [1, 0, 0.8]);
  });
}
function shoe() {
  return geometry('reference-leather-and-gold-shoes', (out) => {
    sphere(out, [0, 1.0, 2.0], [2.3, 1.35, 4.5], 'brocade', undefined, 32, 16);
    sphere(out, [0, 0.25, 2.0], [2.4, 0.28, 4.6], 'skin', '#39251c', 32, 10);
  });
}
type Helpers = {
  plantedStep: (
    distance: number,
    phase?: number,
  ) => { forward: number; lift: number };
  elbowFor: (
    shoulder: Vertex3,
    wrist: Vertex3,
    bend: Vertex3,
    upper?: number,
    lower?: number,
  ) => Vertex3;
};
export function realisticMansa(p: HumanPose, helpers: Helpers): RigNode {
  const hip = p.mounted ? 62 : 36,
    phase = (p.distance / 45) * TAU,
    bob = Math.abs(Math.sin(phase)) * p.walk * 0.45;
  const body = N('body', undefined, [0, hip + bob, 0], pitch(p.walk * -0.018), [
    N('tunic', tunic()),
    N(
      'mantle',
      mantle(),
      [0, 0, -0.25],
      pitch(Math.sin((p.frame * TAU) / 80) * 0.008 + p.walk * 0.018),
    ),
    N('necklaces-and-pendants', jewelry()),
    N(
      'head',
      head(),
      [0, 32, 3.5],
      yaw(Math.sin((p.frame * TAU) / 120) * 0.035),
      [
        N('wrapped-linen-turban', turban()),
        N('single-brow-medallion', medallion()),
      ],
      [0.74, 0.74, 0.74],
    ),
  ]);
  const children: RigNode[] = [body];
  if (!p.mounted)
    children.push(
      N('skirt', skirt(), undefined, pitch(p.walk * Math.sin(phase) * 0.025)),
    );
  for (const side of [-1, 1]) {
    const gait = helpers.plantedStep(p.distance, side === 1 ? 0.5 : 0),
      z = p.mounted ? 3 : gait.forward * p.walk;
    const ankle: Vertex3 = p.mounted
      ? [side * 13, 32, 3]
      : [side * 5.1, gait.lift * p.walk, z];
    const knee: Vertex3 = p.mounted
      ? [side * 13, 47, 9]
      : [side * 5, 19, z * 0.48];
    const pelvis: Vertex3 = [side * 5.5, hip, 0];
    for (const [name, from, to, radius] of [
      [`leg-${side}-upper`, pelvis, knee, 3.2],
      [`leg-${side}-lower`, knee, ankle, 2.6],
    ] as [string, Vertex3, Vertex3, number][])
      children.push(
        N(
          name,
          sleeve('linen', 18, radius),
          from,
          aim(sub(to, from)),
          [],
          [1, Math.hypot(...sub(to, from)) / 18, 1],
        ),
      );
    children.push(N(`shoe-${side}`, shoe(), ankle));
  }
  const right = p.right ?? [-17, hip + 17, 10],
    left = p.left ?? [13, hip + 9, 8];
  for (const [name, side, wrist] of [
    ['right-arm', -1, right],
    ['left-arm', 1, left],
  ] as [string, number, Vertex3][]) {
    const shoulder: Vertex3 = [side * 10.6, hip + 24, 0];
    const elbow = helpers.elbowFor(
      shoulder,
      wrist,
      [side * 0.7, -0.4, -1],
      15.5,
      15.5,
    );
    const isStaff =
      (side === -1 && p.staffHand !== 'left') ||
      (side === 1 && p.staffHand === 'left');
    const arm = N(name, undefined, undefined, undefined, [
      N(
        name + '-upper',
        sleeve(side === -1 ? 'velvet' : 'brocade', 15.5, 3.55),
        shoulder,
        aim(sub(elbow, shoulder)),
      ),
      N(
        name + '-forearm',
        sleeve('brocade', 15.5, 2.9),
        elbow,
        aim(sub(wrist, elbow)),
        [],
        [1, Math.hypot(...sub(wrist, elbow)) / 15.5, 1],
      ),
      hand(name + '-hand', wrist, isStaff ? 1.25 : 0.23),
      N(
        name + '-gold-cuff',
        cuff(),
        add(wrist, [0, -0.6, -0.1]),
        aim(sub(wrist, elbow)),
      ),
    ]);
    children.push(arm);
  }
  children.push(N('scepter', scepter(), p.staffHand === 'left' ? left : right));
  return N(p.name, undefined, p.at, yaw(p.yaw), children);
}
