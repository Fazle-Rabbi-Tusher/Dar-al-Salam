import type { Point } from './iso';
import type { Face3, InfrastructureModel, Vertex3 } from './infrastructure';
import { MeshBuilder } from './laboratory';
import { TILE_SIDE } from './planet';
import faces from './generated/mali-faces.json' with { type: 'json' };
import cloth from './generated/mali-cloth.json' with { type: 'json' };
import { realisticMansa } from './mansa-reference';
import { goldCarrierActors } from './gold-carriers';
import { carrierHuman } from './carrier-human';
import { cargoCamel, nativeCargoActors } from './gold-cargo';

export type Quaternion = [number, number, number, number];
export type RoyalFinish =
  'face' | 'skin' | 'linen' | 'brocade' | 'velvet' | 'gold' | 'hair';
export type RigFace = Face3 & {
  uv?: Point[];
  normals?: Vertex3[];
  finish?: RoyalFinish;
};
export type RigNode = {
  name: string;
  position: Vertex3;
  rotation: Quaternion;
  scale: Vertex3;
  faces?: RigFace[];
  children: RigNode[];
};
/**
 * The caravan's ground: the open desert west of Massawa (owner's request,
 * 2026-11: "place them on the desert"), between the coast and the town.
 * `tile`/`footprint` bound every actor, stall and roaming loop (2026-11-26:
 * "they should roam around the desert"); nothing wild grows there.
 */
export const CARAVAN = {
  tile: [-54, 76] as Point,
  footprint: [35, 45] as Point,
  center: [-36, 100] as Point,
  stops: [-115, 0, 115],
  guards: 12,
  camels: 4,
};
export const caravanTile = (x: number, z: number): Point => [
  CARAVAN.center[0] + x / TILE_SIDE,
  CARAVAN.center[1] + z / TILE_SIDE,
];
export const inCaravanPlot = ([x, y]: Point, margin = 2) =>
  x >= CARAVAN.tile[0] - margin &&
  x <= CARAVAN.tile[0] + CARAVAN.footprint[0] + margin &&
  y >= CARAVAN.tile[1] - margin &&
  y <= CARAVAN.tile[1] + CARAVAN.footprint[1] + margin;
const TAU = Math.PI * 2;
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const add = (a: Vertex3, b: Vertex3): Vertex3 =>
  a.map((v, i) => v + b[i]) as Vertex3;
const sub = (a: Vertex3, b: Vertex3): Vertex3 =>
  a.map((v, i) => v - b[i]) as Vertex3;
const mul = (a: Vertex3, s: number): Vertex3 => a.map((v) => v * s) as Vertex3;
const dot = (a: Vertex3, b: Vertex3) => a.reduce((n, v, i) => n + v * b[i], 0);
const unit = (v: Vertex3): Vertex3 => mul(v, 1 / (Math.hypot(...v) || 1));
const cross = (a: Vertex3, b: Vertex3): Vertex3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const mix = (a: Vertex3, b: Vertex3, t: number): Vertex3 =>
  a.map((v, i) => v + (b[i] - v) * t) as Vertex3;
export const yaw = (a: number): Quaternion => [
  0,
  Math.sin(a / 2),
  0,
  Math.cos(a / 2),
];
const pitch = (a: number): Quaternion => [
  Math.sin(a / 2),
  0,
  0,
  Math.cos(a / 2),
];
export function rotate(v: Vertex3, q: Quaternion): Vertex3 {
  const a: Vertex3 = [q[0], q[1], q[2]],
    t = mul(cross(a, v), 2);
  return add(v, add(mul(t, q[3]), cross(a, t)));
}
const qmul = (a: Quaternion, b: Quaternion): Quaternion => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const aim = (v: Vertex3): Quaternion => {
  const n = unit(v),
    c = cross([0, 1, 0], n),
    w = 1 + n[1],
    d = Math.hypot(...c, w);
  return d < 1e-6 ? [1, 0, 0, 0] : [c[0] / d, c[1] / d, c[2] / d, w / d];
};
const C = {
  gold: '#d9a12e',
  goldLight: '#f0c25a',
  goldDark: '#996019',
  red: '#8f2529',
  cream: '#e9dcc2',
  skin: '#8d5735',
  leather: '#583622',
  black: '#262323',
  sand: '#c6a06a',
  wood: '#62432b',
  indigo: '#34475d',
};
const tint = (hex: string, f: number) =>
  '#' +
  [1, 3, 5]
    .map((i) =>
      Math.round(clamp(parseInt(hex.slice(i, i + 2), 16) * f, 0, 255))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const memo = new Map<string, Face3[]>();
function geometry(key: string, build: (m: MeshBuilder) => void) {
  let result = memo.get(key);
  if (!result) {
    const m = new MeshBuilder();
    build(m);
    result = m.faces;
    memo.set(key, result);
  }
  return result;
}
export function node(
  name: string,
  mesh?: Face3[],
  position: Vertex3 = [0, 0, 0],
  rotation: Quaternion = [0, 0, 0, 1],
  children: RigNode[] = [],
  scale: Vertex3 = [1, 1, 1],
): RigNode {
  return { name, position, rotation, children, scale, faces: mesh };
}

function ellipsoid(
  m: MeshBuilder,
  center: Vertex3,
  r: Vertex3,
  color: string,
  rings = 7,
  segments = 12,
  keep?: (p: Vertex3) => boolean,
) {
  const point = (i: number, j: number): Vertex3 => {
    const a = -Math.PI / 2 + (Math.PI * i) / rings,
      b = (j * TAU) / segments;
    return [
      center[0] + r[0] * Math.cos(a) * Math.sin(b),
      center[1] + r[1] * Math.sin(a),
      center[2] + r[2] * Math.cos(a) * Math.cos(b),
    ];
  };
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < segments; j++) {
      const p = [
        point(i, j),
        point(i + 1, j),
        point(i + 1, j + 1),
        point(i, j + 1),
      ];
      if (keep && !keep(mul(p.reduce(add, [0, 0, 0]), 0.25))) continue;
      m.face(
        [...p].reverse(),
        tint(color, 0.94 + ((i * 7 + j * 3) % 8) * 0.016),
      );
    }
}
function lathe(
  m: MeshBuilder,
  profile: [number, number, number][],
  color: string,
  sectors = 16,
  start = 0,
  end = TAU,
  fold = 0,
) {
  const p = (i: number, j: number): Vertex3 => {
    const [y, rx, rz] = profile[i],
      a = start + ((end - start) * j) / sectors,
      f = 1 + Math.cos(j * Math.PI) * fold;
    return [Math.sin(a) * rx * f, y, Math.cos(a) * rz * f];
  };
  for (let i = 0; i < profile.length - 1; i++)
    for (let j = 0; j < sectors; j++) {
      const patch =
          color === '#d5b26c'
            ? cloth.gold
            : color === C.red
              ? cloth.crimson
              : null,
        corners = [p(i, j), p(i, j + 1), p(i + 1, j + 1), p(i + 1, j)],
        n = patch ? 4 : 1,
        at = (u: number, v: number) =>
          mix(
            mix(corners[0], corners[1], u),
            mix(corners[3], corners[2], u),
            v,
          );
      for (let yy = 0; yy < n; yy++)
        for (let xx = 0; xx < n; xx++) {
          const point = at((xx + 0.5) / n, (yy + 0.5) / n),
            tx = patch
              ? Math.floor(((j + (xx + 0.5) / n) / sectors) * patch.width * 3) %
                patch.width
              : 0,
            ty = patch
              ? ((Math.floor(point[1] * 2) % patch.height) + patch.height) %
                patch.height
              : 0,
            sample = patch ? patch.pixels[ty * patch.width + tx] : color;
          m.face(
            [
              at(xx / n, yy / n),
              at((xx + 1) / n, yy / n),
              at((xx + 1) / n, (yy + 1) / n),
              at(xx / n, (yy + 1) / n),
            ],
            tint(sample, 0.93 + (j % 3) * 0.04),
          );
        }
    }
}
function torus(
  m: MeshBuilder,
  y: number,
  radius: number,
  tube: number,
  color: string,
  rx = 1,
  rz = 1,
) {
  for (let j = 0; j < 20; j++)
    for (let i = 0; i < 4; i++) {
      const p = (a: number, b: number): Vertex3 => [
        (radius + Math.cos(b) * tube) * Math.sin(a) * rx,
        y + Math.sin(b) * tube,
        (radius + Math.cos(b) * tube) * Math.cos(a) * rz,
      ];
      m.face(
        [
          p((j * TAU) / 20, (i * TAU) / 4),
          p(((j + 1) * TAU) / 20, (i * TAU) / 4),
          p(((j + 1) * TAU) / 20, ((i + 1) * TAU) / 4),
          p((j * TAU) / 20, ((i + 1) * TAU) / 4),
        ],
        color,
      );
    }
}
function headMesh(face: number, royal: boolean, woman: boolean) {
  return geometry(`head-${face}-${royal}-${woman}`, (m) => {
    const art = faces[face],
      stride = royal ? 1 : 2;
    ellipsoid(m, [0, 0, -2], [5.3, 6.5, 3.4], art.skin);
    if (face !== 1 && !woman)
      ellipsoid(
        m,
        [0, -3.8, -1.5],
        [4.4, 3.1, 2.8],
        face === 4 ? '#8d8580' : '#292321',
      );
    // Color samples come from the generated artwork, projected on a curved
    // face with real cheek/jaw/nose depth, never a camera-facing billboard.
    const p = (x: number, y: number): Vertex3 => {
      const nx = (x / art.width) * 2 - 1,
        ny = (y / art.height) * 2 - 1;
      return [
        nx * 5.2,
        -ny * 6.5,
        1.6 +
          2.7 * Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny * 0.43)) +
          1.4 * Math.exp(-(nx * nx * 42 + (ny - 0.04) ** 2 * 46)),
      ];
    };
    for (let y = 0; y < art.height; y += stride)
      for (let x = 0; x < art.width; x += stride) {
        const nx = ((x + stride / 2) / art.width) * 2 - 1,
          ny = ((y + stride / 2) / art.height) * 2 - 1;
        if ((nx * nx) / 0.95 ** 2 + (ny * ny) / 1.02 ** 2 > 1) continue;
        m.face(
          [
            p(x, y),
            p(x, y + stride),
            p(x + stride, y + stride),
            p(x + stride, y),
          ],
          art.pixels[y * art.width + x],
        );
      }
    const cloth = royal
      ? C.cream
      : woman
        ? '#ddd0b0'
        : face % 2
          ? C.indigo
          : '#c8b290';
    if (woman) {
      ellipsoid(
        m,
        [0, 0.9, -2.3],
        [7.2, 10.1, 5.6],
        cloth,
        9,
        16,
        (p) => p[2] < 0.5 || p[1] > 6.1,
      );
      ellipsoid(m, [0, -9.6, -1.2], [8.6, 4.2, 5.5], cloth);
    } else {
      ellipsoid(m, [0, 7.3, -1.4], [7, 3.5, 6], cloth);
      for (let i = 0; i < 5; i++)
        torus(
          m,
          5.5 + i * 0.83,
          5.75 - i * 0.15,
          0.7,
          tint(cloth, 0.9 + i * 0.025),
          1.05,
          0.9,
        );
      for (const s of [-1, 1]) {
        m.beam([s * 5.5, 5, -1], [s * 5.4, -8, -0.6], 2.5, cloth);
        m.beam([s * 5.4, -8, -0.6], [s * 3.5, -13, 2.2], 2.8, cloth);
      }
      if (royal) {
        for (let i = 0; i < 3; i++)
          torus(
            m,
            -9.5 - i * 0.9,
            5.7 + i * 0.4,
            1.25,
            tint(cloth, 1 - i * 0.04),
            1,
            0.8,
          );
        lathe(
          m,
          [
            [10, 6, 5.3],
            [12.1, 6.7, 6],
          ],
          C.gold,
          20,
        );
        for (let j = 0; j < 10; j++) {
          const a = (j * TAU) / 10,
            x = Math.sin(a) * 6.4,
            z = Math.cos(a) * 5.9;
          m.face(
            [
              [x - 1.3, 11.7, z],
              [x, 16 + (j % 2) * 1.1, z],
              [x + 1.3, 11.7, z],
            ],
            C.goldLight,
          );
          ellipsoid(
            m,
            [x, 12.8, z + 0.25],
            [0.65, 0.9, 0.5],
            j % 2 ? '#3a7a78' : C.goldLight,
            4,
            6,
          );
        }
        torus(m, 10.5, 6.1, 0.55, C.goldLight, 1, 0.9);
      }
    }
  });
}
function limbMesh(color: string, radius: number, length: number, cuff = false) {
  return geometry(`limb-${color}-${radius}-${length}-${cuff}`, (m) => {
    lathe(
      m,
      [
        [0, radius * 0.78, radius * 0.85],
        [length * 0.2, radius, radius],
        [length * 0.8, radius * 0.83, radius * 0.85],
        [length, radius * 0.63, radius * 0.7],
      ],
      color,
      10,
      0,
      TAU,
      0.07,
    );
    if (cuff)
      lathe(
        m,
        [
          [length - 2, radius * 0.77, radius * 0.82],
          [length - 0.5, radius * 0.77, radius * 0.82],
        ],
        tint(color, 1.2),
        10,
      );
  });
}
function handMesh(skin: string) {
  return geometry('hand-' + skin, (m) => {
    ellipsoid(m, [0, 0.8, 0], [2, 1.8, 1.05], skin, 5, 8);
    for (let i = 0; i < 4; i++)
      m.beam(
        [-1.35 + i * 0.87, 1.6, 0],
        [-1.35 + i * 0.87, 3.6 - Math.abs(1.5 - i) * 0.25, 0.75],
        0.65,
        tint(skin, 1.03),
      );
    m.beam([-1.5, 0.9, 0.1], [-2.5, 2, 0.9], 0.9, skin);
  });
}
export function elbowFor(
  shoulder: Vertex3,
  wrist: Vertex3,
  bend: Vertex3,
  upper = 14.5,
  lower = 14.5,
): Vertex3 {
  const delta = sub(wrist, shoulder),
    d = clamp(Math.hypot(...delta), 0.01, upper + lower - 0.001),
    dir = unit(delta),
    a = (upper * upper - lower * lower + d * d) / (2 * d),
    perpendicular = unit(sub(bend, mul(dir, dot(bend, dir))));
  return add(
    shoulder,
    add(
      mul(dir, a),
      mul(perpendicular, Math.sqrt(Math.max(0, upper * upper - a * a))),
    ),
  );
}
function arm(
  name: string,
  shoulder: Vertex3,
  wrist: Vertex3,
  s: number,
  color: string,
  skin: string,
  royal: boolean,
): RigNode {
  const elbow = elbowFor(shoulder, wrist, [s * 0.8, -0.4, -1]),
    u = sub(elbow, shoulder),
    l = sub(wrist, elbow);
  return node(name, undefined, [0, 0, 0], undefined, [
    node(
      name + '-upper',
      limbMesh(color, royal ? 4.2 : 3.4, 14.5),
      shoulder,
      aim(u),
      [],
      [1, Math.hypot(...u) / 14.5, 1],
    ),
    node(
      name + '-forearm',
      limbMesh(color, royal ? 3.7 : 2.8, 14.5, true),
      elbow,
      aim(l),
      [],
      [1, Math.hypot(...l) / 14.5, 1],
    ),
    node(name + '-hand', handMesh(skin), wrist, pitch(Math.PI / 2)),
  ]);
}
const shoe = (color: string) =>
  geometry('shoe-' + color, (m) => {
    ellipsoid(m, [0, 1.4, 2.5], [2.5, 1.7, 5.6], color, 4, 10);
    m.box(0, 0.25, 2, 5.1, 0.5, 10.5, '#382b24');
  });
/** Ground speed is canceled through the stance half of each stride. */
export function plantedStep(
  distance: number,
  phase = 0,
  stride = 45,
  lift = 6,
) {
  const u = (((distance / stride + phase) % 1) + 1) % 1;
  if (u < 0.6) return { forward: stride * 0.3 - stride * u, lift: 0 };
  const swing = (u - 0.6) / 0.4;
  return {
    forward: -stride * 0.3 + stride * 0.6 * ease(swing),
    lift: Math.sin(swing * Math.PI) * lift,
  };
}
export type HumanPose = {
  name: string;
  at: Vertex3;
  yaw: number;
  face: number;
  royal?: boolean;
  woman?: boolean;
  mounted?: boolean;
  frame: number;
  walk: number;
  distance: number;
  right?: Vertex3;
  left?: Vertex3;
  guard?: boolean;
  flag?: boolean;
  color?: string;
  staffHand?: 'right' | 'left';
  headwear?: 'turban' | 'bare' | 'cap';
  headColor?: string;
};
export function human(p: HumanPose): RigNode {
  if (p.royal) return realisticMansa(p, { plantedStep, elbowFor });
  if (p.face >= 6) return carrierHuman(p, { plantedStep, elbowFor });
  const royal = !!p.royal,
    color = p.color ?? (royal ? '#d5b26c' : p.woman ? '#45685d' : C.cream),
    skin = faces[p.face].skin,
    hip = p.mounted ? 50 : 36,
    stride = (p.distance / 45) * TAU,
    bob = Math.abs(Math.sin(stride)) * p.walk * 0.65,
    body = node('body', undefined, [0, hip + bob, 0], pitch(p.walk * -0.025));
  body.children.push(
    node(
      'tunic',
      geometry('tunic-' + color + royal, (m) => {
        lathe(
          m,
          [
            [-2, 8, 6],
            [10, 9.5, 7],
            [21, 12, 7.3],
            [25, 10.2, 6],
            [27, 4, 3.7],
          ],
          color,
          16,
          0,
          TAU,
          0.035,
        );
        m.box(0, 2, 6.3, 16.5, 2.2, 1.6, royal ? C.gold : C.leather);
        if (royal) {
          for (let i = 0; i < 4; i++) {
            const points: Vertex3[] = [];
            for (let j = 0; j <= 16; j++) {
              const a = (j * Math.PI) / 16;
              points.push([
                Math.cos(a) * (7.5 + i * 0.7),
                23 - Math.sin(a) * (3.6 + i * 2.2),
                7.3,
              ]);
            }
            for (let j = 1; j < points.length; j++)
              m.beam(
                points[j - 1],
                points[j],
                0.8,
                i % 2 ? C.goldLight : C.gold,
              );
          }
          for (let y = 6; y < 24; y += 3)
            for (const x of [-5, 0, 5])
              m.box(x, y, 7.6, 0.9, 1.1, 0.45, C.goldLight);
        }
      }),
    ),
  );
  const cloak = geometry(`cloak-${royal}-${color}`, (m) => {
    lathe(
      m,
      [
        [25, 12.4, 8],
        [19, 13, 8.5],
        [0, 13.5, 10],
        [-19, 16, 11],
        [-30, 17, 12],
      ],
      royal ? C.red : tint(color, 0.85),
      20,
      Math.PI / 2.1,
      Math.PI * 1.525,
      0.07,
    );
    if (royal) {
      for (const s of [-1, 1])
        m.beam([s * 12.1, 24, 3], [s * 15, -29, 3], 1.3, C.gold);
      lathe(
        m,
        [
          [-29, 17.4, 12.1],
          [-27.5, 17.4, 12.1],
        ],
        C.goldLight,
        20,
        Math.PI / 2.1,
        Math.PI * 1.525,
      );
    }
  });
  if (royal || p.woman)
    body.children.push(
      node(
        'mantle',
        cloak,
        [0, 0, -1],
        pitch(Math.sin((p.frame * TAU) / 80) * 0.012 + p.walk * 0.025),
      ),
    );
  body.children.push(
    node(
      'head',
      headMesh(p.face, royal, !!p.woman),
      [0, 32, 0.4],
      qmul(
        yaw(royal ? Math.sin((p.frame * TAU) / 120) * 0.05 : 0),
        pitch(Math.sin((p.frame * TAU) / 80) * 0.025),
      ),
      [],
      [0.74, 0.74, 0.74],
    ),
  );
  const children = [body];
  if (!p.mounted)
    children.push(
      node(
        'skirt',
        geometry('skirt-' + color + royal, (m) => {
          lathe(
            m,
            [
              [4, 12, 8],
              [10, 12.2, 8.2],
              [24, 10, 7.3],
              [38, 8.3, 6],
            ],
            color,
            20,
            0,
            TAU,
            0.07,
          );
          if (royal) {
            lathe(
              m,
              [
                [5, 12.4, 8.3],
                [6.5, 12.4, 8.3],
              ],
              C.gold,
              20,
            );
            for (const x of [-5, 0, 5])
              m.beam([x, 7, 8.8], [x, 35, 6.4], 0.6, C.goldLight);
          }
        }),
        [0, 0, 0],
        pitch(p.walk * Math.sin(stride) * 0.035),
      ),
    );
  for (const s of [-1, 1]) {
    const swing = Math.sin(stride + (s === 1 ? Math.PI : 0)),
      gait = plantedStep(p.distance, s === 1 ? 0.5 : 0),
      z = p.mounted ? 3 : gait.forward * p.walk,
      ankle: Vertex3 = p.mounted
        ? [s * 13, 20, 3]
        : [s * 5.1, gait.lift * p.walk, z],
      knee: Vertex3 = p.mounted
        ? [s * 13, 35, 9]
        : [s * 5, 19 + Math.max(0, swing) * 1.5 * p.walk, z * 0.48],
      pelvis: Vertex3 = [s * 5.5, hip, 0];
    children.push(
      node(
        `leg-${s}-upper`,
        limbMesh(color, 3.6, 18),
        pelvis,
        aim(sub(knee, pelvis)),
        [],
        [1, Math.hypot(...sub(knee, pelvis)) / 18, 1],
      ),
      node(
        `leg-${s}-lower`,
        limbMesh(color, 2.7, 18),
        knee,
        aim(sub(ankle, knee)),
        [],
        [1, Math.hypot(...sub(ankle, knee)) / 18, 1],
      ),
      node(`shoe-${s}`, shoe(C.leather), ankle),
    );
  }
  const right = p.right ?? [-10, hip + 8, 7 + Math.sin(stride) * 4 * p.walk],
    left = p.left ?? [10, hip + 9, 7 - Math.sin(stride) * 4 * p.walk];
  children.push(
    arm('right-arm', [-11, hip + 24, 0], right, -1, color, skin, royal),
    arm('left-arm', [11, hip + 24, 0], left, 1, color, skin, royal),
  );
  if (royal)
    children.push(
      node(
        'scepter',
        geometry('royal-scepter', (m) => {
          lathe(
            m,
            [
              [-36, 0.8, 0.8],
              [30, 0.8, 0.8],
            ],
            C.goldLight,
            10,
          );
          for (const y of [-34, 24, 27]) torus(m, y, 1.1, 0.6, C.gold);
          ellipsoid(m, [0, 32.5, 0], [4.2, 4.2, 1.6], C.gold, 7, 14);
          for (let j = 0; j < 6; j++)
            ellipsoid(
              m,
              [
                Math.sin((j * TAU) / 6) * 2.7,
                32.5 + Math.cos((j * TAU) / 6) * 2.7,
                1.5,
              ],
              [0.55, 0.55, 0.5],
              C.goldLight,
              4,
              6,
            );
        }),
        left,
      ),
    );
  if (p.guard)
    children.push(
      node(
        'lance',
        geometry('guard-lance', (m) => {
          m.beam([0, -42, 0], [0, 38, 0], 1, C.wood);
          m.face(
            [
              [-2, 37, 0],
              [0, 47, 0],
              [2, 37, 0],
            ],
            '#afb2a9',
          );
          m.face(
            [
              [0, 37, -1],
              [0, 47, 0],
              [0, 37, 1],
            ],
            '#727f7b',
          );
        }),
        left,
      ),
      node(
        'buckler',
        geometry('leather-buckler', (m) => {
          ellipsoid(m, [0, 0, 0], [8.5, 9, 1.4], C.leather, 6, 14);
          ellipsoid(m, [0, 0, 1.4], [1.9, 1.9, 1.1], C.goldDark);
        }),
        add(right, [0, -3, 3]),
      ),
    );
  return node(p.name, undefined, p.at, yaw(p.yaw), children);
}

/*
 * The twenty-second route. Three calm handovers on the market lane (STOPS),
 * two short walks between them, then a long roam through the open desert
 * (owner's request, 2026-11-26: "they should roam around the desert"): out
 * east, round the dunes to the north and back down the western sand to the
 * first stop. The roam is a smooth spline walked at an even, brisk pace
 * (about 2 m/s, with gentle starts and stops); everyone behind follows the
 * same ground.
 */
export const STOPS = [0, 46, 92];
export const STAY = 20;
const LANE = 26,
  ROAM_FROM = STOPS[2] + STAY;
/**
 * The desert roam: out east from the last stop, a wide turn north, a long
 * gently bowed sweep west across the open sand, then round and back east
 * into the first stop. Arcs and short straights only, so every bend is wide
 * enough for the guards' double file (radius 85 or more).
 */
const ROAM = { corner: 85, side: 10, bow: (25 * Math.PI) / 180 };
let roamCache: { points: [number, number][]; lengths: number[] } | undefined;
function roamPath() {
  if (roamCache) return roamCache;
  const points: [number, number][] = [[115, 20]];
  let x = 115,
    z = 20,
    phi = 0; // heading in the x–z plane; 0 is east (+x), −π/2 is north (−z)
  const line = (length: number) => {
    for (let i = 1; i <= 16; i++)
      points.push([
        x + (Math.cos(phi) * length * i) / 16,
        z + (Math.sin(phi) * length * i) / 16,
      ]);
    x += Math.cos(phi) * length;
    z += Math.sin(phi) * length;
  };
  const arc = (radius: number, turn: number) => {
    // Turning toward −z (anticlockwise on the map) about a centre on the left.
    const cx = x + Math.sin(phi) * radius,
      cz = z - Math.cos(phi) * radius,
      steps = Math.max(8, Math.ceil(Math.abs(turn) * 24));
    for (let i = 1; i <= steps; i++) {
      const f = phi + (turn * i) / steps;
      points.push([cx - Math.sin(f) * radius, cz + Math.cos(f) * radius]);
    }
    phi += turn;
    x = points.at(-1)![0];
    z = points.at(-1)![1];
  };
  const { corner, side, bow } = ROAM;
  arc(corner, -Math.PI / 2);
  line(side);
  arc(corner, -(Math.PI / 2 - bow));
  // The bowed sweep west, centred on the lane's middle.
  arc(x / Math.sin(bow), -2 * bow);
  arc(corner, -(Math.PI / 2 - bow));
  line(side);
  arc(corner, -Math.PI / 2);
  points[points.length - 1] = [-115, 20];
  const lengths = [0];
  for (let i = 1; i < points.length; i++)
    lengths.push(
      lengths[i - 1] +
        Math.hypot(
          points[i][0] - points[i - 1][0],
          points[i][1] - points[i - 1][1],
        ),
    );
  return (roamCache = { points, lengths });
}
/** Distance along the roam, from 0 to 1, walked at an even pace with soft ends. */
function pace(u: number, ramp = 0.14) {
  const v = 1 / (1 - ramp);
  if (u < ramp) return { s: (v * u * u) / (2 * ramp), speed: u / ramp };
  if (u > 1 - ramp)
    return { s: 1 - (v * (1 - u) ** 2) / (2 * ramp), speed: (1 - u) / ramp };
  return { s: v * (u - ramp / 2), speed: 1 };
}
export function caravanState(frame: number) {
  const t = ((frame % 240) + 240) % 240;
  let x = CARAVAN.stops[0],
    z = 20,
    heading = Math.PI / 2,
    travel = 0,
    walk = 0,
    station = 0,
    progress = t / STAY;
  if (t >= STOPS[0] + STAY && t < STOPS[1]) {
    const u = (t - STOPS[0] - STAY) / LANE,
      k = ease(u);
    x = -115 + 115 * k;
    travel = 115 * k;
    walk = Math.sin(Math.PI * u);
    station = -1;
  } else if (t >= STOPS[1] && t < STOPS[1] + STAY) {
    x = 0;
    station = 1;
    progress = (t - STOPS[1]) / STAY;
    travel = 115;
  } else if (t >= STOPS[1] + STAY && t < STOPS[2]) {
    const u = (t - STOPS[1] - STAY) / LANE,
      k = ease(u);
    x = 115 * k;
    travel = 115 + 115 * k;
    walk = Math.sin(Math.PI * u);
    station = -1;
  } else if (t >= STOPS[2] && t < ROAM_FROM) {
    x = 115;
    station = 2;
    progress = (t - STOPS[2]) / STAY;
    travel = 230;
  } else if (t >= ROAM_FROM) {
    const { points, lengths } = roamPath(),
      total = lengths.at(-1)!,
      { s, speed } = pace((t - ROAM_FROM) / (240 - ROAM_FROM)),
      d = s * total;
    let lo = 0,
      hi = lengths.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid] <= d) lo = mid;
      else hi = mid;
    }
    const part = (d - lengths[lo]) / Math.max(1e-9, lengths[hi] - lengths[lo]),
      [a, b] = [points[lo], points[hi]];
    x = a[0] + (b[0] - a[0]) * part;
    z = a[1] + (b[1] - a[1]) * part;
    heading = Math.atan2(b[0] - a[0], b[1] - a[1]);
    travel = 230 + d;
    walk = speed;
    station = -1;
  }
  return {
    t,
    point: [x, 0, z] as Vertex3,
    heading,
    travel,
    walk,
    station,
    progress: clamp(progress),
    giving: station >= 0,
    gifts: STOPS.filter((start) => t >= start + STAY / 2).length,
  };
}
/** Length of the desert roam (model units). */
export const roamLength = () => roamPath().lengths.at(-1)!;
export function rulerTile(frame: number): Point {
  const p = caravanState(frame).point;
  return caravanTile(p[0], p[2]);
}
let routeCache: { tick: number; distance: number }[] | undefined;
function processionRoute() {
  if (!routeCache) {
    routeCache = [{ tick: 0, distance: 0 }];
    let last = caravanState(0).point,
      distance = 0;
    for (let i = 1; i <= 2400; i++) {
      const tick = i / 10,
        p = caravanState(tick).point;
      distance += Math.hypot(...sub(p, last));
      routeCache.push({ tick, distance });
      last = p;
    }
  }
  return routeCache;
}
/** Followers advance along the travelled path, not around a rotating rigid
 * formation. This keeps rear ranks and cargo clear of the waiting audience. */
export function followerState(frame: number, behind: number, lateral = 0) {
  const s = caravanState(frame),
    route = processionRoute(),
    index = Math.floor(s.t * 10),
    traveled =
      route[index].distance +
      (route[index + 1].distance - route[index].distance) * (s.t * 10 - index),
    total = route.at(-1)!.distance,
    distance = (((traveled - behind) % total) + total) % total;
  let lo = 0,
    hi = route.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (route[mid].distance <= distance) lo = mid;
    else hi = mid;
  }
  const part =
      (distance - route[lo].distance) /
      Math.max(1e-9, route[hi].distance - route[lo].distance),
    at = caravanState(
      route[lo].tick + (route[hi].tick - route[lo].tick) * part,
    );
  return {
    ...s,
    point: add(at.point, rotate([lateral, 0, 0], yaw(at.heading))),
    heading: at.heading,
    travel: traveled - behind,
  };
}
export function handoverState(frame: number, index: number) {
  const s = caravanState(frame),
    local = (s.t - STOPS[index]) / STAY,
    active = local >= 0 && local <= 1,
    p = clamp(local),
    contact: Vertex3 = [CARAVAN.stops[index], 59, 45];
  return {
    active,
    phase: p,
    contact,
    owner:
      p < 0.18 || !active
        ? 'pouch'
        : p < 0.53
          ? 'giver'
          : p < 0.86
            ? 'recipient'
            : 'stored',
    reach: ease((p - 0.18) / 0.3) * (1 - ease((p - 0.6) / 0.3)),
  };
}
const inverse = (world: Vertex3, at: Vertex3, angle: number) =>
  rotate(sub(world, at), yaw(-angle));
function coinMesh() {
  return geometry('blank-gold-coin', (m) => {
    ellipsoid(m, [0, 0, 0], [2.1, 2.1, 0.45], C.gold, 6, 14);
    ellipsoid(m, [0, 0, 0.4], [1.5, 1.5, 0.15], C.goldLight, 5, 12);
  });
}

function horse(pose: ReturnType<typeof caravanState>): RigNode {
  const color = '#35302a',
    phase = (pose.travel / 42) * TAU,
    children: RigNode[] = [];
  children.push(
    node(
      'horse-body',
      geometry('black-horse-body', (m) => {
        ellipsoid(m, [0, 36, 0], [12, 14, 25], color, 8, 16);
        ellipsoid(m, [0, 42, 21], [8.4, 15, 9], color);
        ellipsoid(m, [0, 57, 31], [6, 12, 7], color);
        ellipsoid(m, [0, 65, 36], [5.4, 8, 12], color);
        ellipsoid(m, [0, 60.4, 43], [5.2, 4.4, 5], '#443a30');
        for (const s of [-1, 1]) {
          ellipsoid(m, [s * 3.2, 75.5, 34], [1.8, 5, 1.6], color, 5, 8);
          ellipsoid(m, [s * 5.05, 67, 38], [0.9, 0.9, 0.7], '#14191b', 4, 6);
          m.beam([s * 5.8, 68, 38], [s * 5.8, 58, 45], 0.7, C.gold);
        }
        for (let j = 0; j < 8; j++)
          ellipsoid(
            m,
            [0, 62 - j * 2.2, 28 - j * 0.5],
            [1.9, 3.2, 3.2],
            '#211f20',
            4,
            8,
          );
        m.box(0, 49, -1, 25, 3, 24, C.red);
        for (const s of [-1, 1]) {
          m.box(s * 12.8, 42, -1, 1.4, 17, 23, C.red);
          for (let i = -8; i <= 8; i += 4)
            m.box(s * 13.6, 37, i, 0.7, 2, 2, C.goldLight);
        }
        m.box(0, 51.2, -3, 19, 3.3, 17, C.leather);
        m.beam([-6, 49, 25], [-5, 65, 35], 0.7, C.goldDark);
        m.beam([6, 49, 25], [5, 65, 35], 0.7, C.goldDark);
      }),
    ),
  );
  for (const s of [-1, 1])
    for (const fore of [-1, 1]) {
      const a = phase + (s * fore === 1 ? 0 : Math.PI),
        gait = plantedStep(pose.travel, s * fore === 1 ? 0 : 0.5, 42, 6),
        swing = Math.sin(a) * pose.walk,
        hip: Vertex3 = [s * 7.4, 34, fore * 17],
        knee: Vertex3 = [s * 7.7, 18, fore * 17 + swing * 6],
        foot: Vertex3 = [
          s * 7.8,
          0.2 + gait.lift * pose.walk,
          fore * 17 + gait.forward * pose.walk,
        ];
      children.push(
        node(
          `horse-${s}-${fore}-upper`,
          limbMesh(color, 3.1, 18),
          hip,
          aim(sub(knee, hip)),
          [],
          [1, Math.hypot(...sub(knee, hip)) / 18, 1],
        ),
        node(
          `horse-${s}-${fore}-lower`,
          limbMesh('#463d32', 1.7, 18),
          knee,
          aim(sub(foot, knee)),
          [],
          [1, Math.hypot(...sub(foot, knee)) / 18, 1],
        ),
        node(
          `horse-${s}-${fore}-hoof`,
          geometry('horse-hoof', (m) =>
            m.box(0, 1.2, 0, 4.6, 2.8, 5.8, '#1d2020'),
          ),
          foot,
        ),
      );
    }
  children.push(
    node(
      'horse-tail',
      geometry('horse-tail', (m) => {
        m.beam([0, 38, -23], [0, 14, -32], 2.7, '#201f20');
        for (const s of [-1, 1])
          m.beam([0, 29, -27], [s * 2, 7, -34], 1.2, '#25211f');
      }),
      [0, 0, 0],
      yaw(Math.sin((pose.t * TAU) / 80) * 0.06),
    ),
  );
  return node(
    'royal-horse',
    undefined,
    pose.point,
    yaw(pose.heading),
    children,
  );
}
function camel(
  name: string,
  local: Vertex3,
  pose: ReturnType<typeof caravanState>,
  phase: number,
): RigNode {
  const animal = cargoCamel(pose.t, {
    at: add(pose.point, rotate(local, yaw(pose.heading))),
    heading: pose.heading,
    distance: pose.travel + (phase / TAU) * 58,
    walk: pose.walk,
  });
  animal.name = name;
  return animal;
}

export function mansaActor(frame: number, mounted = false): RigNode {
  const s = caravanState(frame),
    active = s.giving ? handoverState(frame, s.station) : null,
    at: Vertex3 = mounted ? s.point : [0, 0, 0],
    angle = mounted ? s.heading : 0,
    contact: Vertex3 = mounted
      ? inverse(active?.contact ?? [0, 59, 0], at, angle)
      : [-25, 52, 8],
    hip = mounted ? 50 : 36,
    rest: Vertex3 = [-17, hip + 17, 10],
    right = mix(rest, contact, active?.reach ?? 0),
    hipHand: Vertex3 = [13, hip + 9, 8],
    otherStaff: Vertex3 = [17, hip + 17, 8],
    progress = active?.phase ?? 1;
  // At rest the staff is in his right hand, exactly as in the owner's portrait.
  // Both hands meet before the left takes it during the original gold gesture.
  let left = hipHand,
    staffHand: 'right' | 'left' = 'right';
  if (active && progress < 0.18)
    left = mix(hipHand, rest, ease(progress / 0.18));
  else if (active && progress < 0.9) {
    left = mix(rest, otherStaff, ease((progress - 0.18) / 0.12));
    staffHand = 'left';
  } else if (active && progress < 0.96) {
    left = mix(otherStaff, rest, ease((progress - 0.9) / 0.06));
    staffHand = 'left';
  } else if (active) left = mix(rest, hipHand, ease((progress - 0.96) / 0.04));
  return human({
    name: 'mansa-musa',
    at,
    yaw: angle,
    face: 0,
    royal: true,
    mounted,
    frame: s.t,
    walk: mounted ? 0 : s.walk,
    distance: s.travel,
    right,
    left,
    staffHand,
  });
}
export function caravanActors(frame: number): RigNode {
  const s = caravanState(frame),
    children: RigNode[] = [horse(s), mansaActor(frame, true)];
  for (let i = 0; i < CARAVAN.guards; i++) {
    const side = i % 2 ? 1 : -1,
      rank = Math.floor(i / 2),
      trail = followerState(frame, 43 + rank * 38, side * 26),
      at = trail.point;
    children.push(
      human({
        name: `guard-${i + 1}`,
        at,
        yaw: trail.heading,
        face: i % 3 ? 1 : 2,
        guard: true,
        frame: s.t,
        walk: s.walk,
        distance: trail.travel + (i % 2) * 22,
        left: [11, 47, 5],
        color: i % 3 === 0 ? '#985642' : i % 3 === 1 ? '#d0b98e' : '#44536a',
      }),
    );
  }
  for (let i = 0; i < 4; i++)
    children.push(
      camel(
        `pack-camel-${i + 1}`,
        [0, 0, 0],
        followerState(frame, 290 + i * 100),
        (i % 2) * Math.PI,
      ),
    );
  for (let station = 0; station < 3; station++) {
    const h = handoverState(frame, station),
      x = CARAVAN.stops[station],
      approach = h.active
        ? ease(h.phase / 0.3) * (1 - ease((h.phase - 0.76) / 0.24))
        : 0,
      at: Vertex3 = [x, 0, 124 - 52 * approach],
      angle = Math.PI,
      target = inverse(h.contact, at, angle),
      right = mix([-9, 47, 9], target, h.reach);
    children.push(
      human({
        name: `recipient-${station + 1}`,
        at,
        yaw: angle,
        face: station === 1 ? 5 : 4,
        woman: station === 1,
        frame: s.t,
        walk: h.active
          ? h.phase < 0.3
            ? Math.sin((h.phase / 0.3) * Math.PI)
            : h.phase > 0.76
              ? Math.sin(((h.phase - 0.76) / 0.24) * Math.PI)
              : 0
          : 0,
        distance: 52 * approach,
        right,
        color: station === 1 ? '#45685d' : '#b5a180',
      }),
    );
    const pulse =
        ease((h.phase - 0.1) / 0.3) * (1 - ease((h.phase - 0.58) / 0.32)),
      stewardAt: Vertex3 = [x + 35, 0, 165],
      receiverAt: Vertex3 = [x + 75, 0, 165],
      meet: Vertex3 = [x + 55, 52, 165];
    children.push(
      human({
        name: `gold-steward-${station + 1}`,
        at: stewardAt,
        yaw: Math.PI / 2,
        face: 3,
        frame: s.t,
        walk: 0,
        distance: 0,
        right: mix(
          [-9, 47, 9],
          inverse(meet, stewardAt, Math.PI / 2),
          h.active ? pulse : 0,
        ),
        color: '#c8a366',
      }),
    );
    children.push(
      human({
        name: `market-recipient-${station + 1}`,
        at: receiverAt,
        yaw: -Math.PI / 2,
        face: station === 0 ? 5 : 1,
        woman: station === 0,
        frame: s.t,
        walk: 0,
        distance: 0,
        left: mix(
          [9, 47, 9],
          inverse(meet, receiverAt, -Math.PI / 2),
          h.active ? pulse : 0,
        ),
        color: station === 0 ? '#8e6558' : '#d6c5a0',
      }),
    );
    const kingRest: Vertex3 = [-17, 67, 10],
      giverHand = add(
        s.point,
        rotate(
          mix(kingRest, inverse(h.contact, s.point, s.heading), h.reach),
          yaw(s.heading),
        ),
      ),
      receiverHand = add(at, rotate(right, yaw(angle))),
      own = h.owner,
      coinAt: Vertex3 =
        own === 'giver'
          ? add(giverHand, [0, 2, 0])
          : own === 'recipient'
            ? add(receiverHand, [0, 2, 0])
            : [x, 41, 80];
    children.push(
      node(
        `gift-coin-${station + 1}`,
        coinMesh(),
        coinAt,
        yaw(Math.PI / 2),
        [],
        [
          own === 'giver' || own === 'recipient' ? 1 : 0.001,
          own === 'giver' || own === 'recipient' ? 1 : 0.001,
          1,
        ],
      ),
    );
    const bagAt =
      h.phase < 0.53
        ? add(
            stewardAt,
            rotate(
              mix(
                [-9, 47, 9],
                inverse(meet, stewardAt, Math.PI / 2),
                h.active ? pulse : 0,
              ),
              yaw(Math.PI / 2),
            ),
          )
        : add(
            receiverAt,
            rotate(
              mix(
                [9, 47, 9],
                inverse(meet, receiverAt, -Math.PI / 2),
                h.active ? pulse : 0,
              ),
              yaw(-Math.PI / 2),
            ),
          );
    children.push(
      node(
        `gold-pouch-${station + 1}`,
        geometry('tied-gold-pouch', (m) => {
          ellipsoid(m, [0, -2.4, 0], [3.3, 4, 2.6], '#bd9150', 6, 10);
          torus(m, 0.8, 1.3, 0.4, C.goldDark);
        }),
        bagAt,
      ),
    );
  }
  children.push(goldCarrierActors(frame, human), nativeCargoActors(frame));
  return node('mali-gold-caravan', undefined, undefined, undefined, children);
}

export function flattenRig(root: RigNode): Face3[] {
  const out: Face3[] = [];
  const visit = (
    n: RigNode,
    position: Vertex3,
    rotation: Quaternion,
    scale: Vertex3,
  ) => {
    const q = qmul(rotation, n.rotation),
      s = scale.map((v, i) => v * n.scale[i]) as Vertex3,
      p = add(
        position,
        rotate(n.position.map((v, i) => v * scale[i]) as Vertex3, rotation),
      );
    for (const f of n.faces ?? [])
      out.push({
        ...f,
        points: f.points.map((v) =>
          add(p, rotate(v.map((a, i) => a * s[i]) as Vertex3, q)),
        ),
      });
    for (const c of n.children) visit(c, p, q, s);
  };
  visit(root, [0, 0, 0], [0, 0, 0, 1], [1, 1, 1]);
  return out;
}
/** Joint matrices for GPU animation and the portable GLB exporter. */
export function rigMatrices(root: RigNode) {
  const result = new Map<string, { node: RigNode; matrix: Float32Array }>();
  const visit = (
    n: RigNode,
    parent: string,
    position: Vertex3,
    rotation: Quaternion,
    scale: Vertex3,
  ) => {
    const path = parent + '/' + n.name,
      q = qmul(rotation, n.rotation),
      s = scale.map((v, i) => v * n.scale[i]) as Vertex3,
      p = add(
        position,
        rotate(n.position.map((v, i) => v * scale[i]) as Vertex3, rotation),
      ),
      x = rotate([s[0], 0, 0], q),
      y = rotate([0, s[1], 0], q),
      z = rotate([0, 0, s[2]], q);
    result.set(path, {
      node: n,
      matrix: new Float32Array([...x, 0, ...y, 0, ...z, 0, ...p, 1]),
    });
    for (const child of n.children) visit(child, path, p, q, s);
  };
  visit(root, '', [0, 0, 0], [0, 0, 0, 1], [1, 1, 1]);
  return result;
}
export function caravanKind(type: string) {
  return type === 'mali-gold-caravan' ? 'gold-caravan' : null;
}
export function caravanModel(type: string): InfrastructureModel | null {
  if (!caravanKind(type)) return null;
  const mesh = geometry('caravan-market-static', (m) => {
    // Low sand apron, not a raised display box. Native world terrain continues
    // around its edge; the route and every actor have one common floor level.
    m.box(0, -0.4, 0, 790, 0.6, 700, C.sand);
    for (let x = -370; x <= 370; x += 18)
      for (let z = -335; z <= 335; z += 22) {
        if (Math.abs(z - 20) < 34 || Math.abs(z + 90) < 30) continue;
        const a = Math.sin(x * 0.047 + z * 0.031);
        m.beam(
          [x, 0.02, z],
          [x + 9, 0.02, z + 2.5],
          0.3,
          a > 0 ? '#d2b17d' : '#b59160',
        );
      }
    for (const [i, x] of [-270, 0, 270].entries()) {
      const stone = ['#af8055', '#c19465', '#c5a274'][i],
        z = -299;
      m.box(x, 36, z, 120, 72, 66, stone);
      m.box(x, 76, z, 125, 8, 72, tint(stone, 0.92));
      m.box(x, 20, z + 33.2, 28, 40, 0.6, '#4d3e31');
      ellipsoid(m, [x, 40, z + 33.6], [14, 12, 0.9], '#4d3e31', 5, 10);
      for (const side of [-1, 1])
        m.box(x + side * 40, 52, z + 33.8, 10, 18, 1, '#584737');
      for (let j = -2; j <= 2; j++) m.box(x + j * 24, 85, z, 7, 15, 70, stone);
      for (let j = 0; j < 9; j++)
        m.beam(
          [x - 58 + j * 14, 65, z - 34],
          [x - 58 + j * 14, 65, z + 42],
          1.8,
          C.wood,
        );
    }
    for (const x of CARAVAN.stops) {
      m.box(x + 47, 29, 141, 59, 3, 30, C.wood);
      for (const a of [-24, 24])
        for (const b of [-10, 10])
          m.box(x + 47 + a, 14, 141 + b, 3, 28, 3, C.wood);
      for (const a of [-12, 13]) {
        ellipsoid(m, [x + 47 + a, 33, 140], [9, 3.2, 8], C.goldDark, 4, 12);
        for (let j = 0; j < 8; j++)
          m.box(
            x + 47 + a + Math.sin(j * 2.4) * 5,
            35 + (j % 2),
            140 + Math.cos(j * 2.4) * 4,
            2.7,
            1.1,
            2.7,
            j % 2 ? C.gold : C.goldLight,
          );
      }
      for (const side of [-1, 1]) {
        m.box(x + side * 42, 45, 183, 4, 90, 4, C.wood);
        m.beam([x - 45, 91, 183], [x + 45, 91, 183], 3, C.wood);
      }
      m.face(
        [
          [x - 45, 93, 185],
          [x + 45, 93, 185],
          [x + 45, 95, 161],
          [x - 45, 95, 161],
        ],
        '#98513a',
      );
    }
    for (const x of [-330, 340]) {
      m.box(x, 23, 185, 38, 45, 42, '#ad8354');
      for (let i = 0; i < 5; i++)
        m.box(x - 14 + i * 7, 47, 185, 4, 6, 40, C.goldDark);
      m.beam([x, 45, 185], [x, 118, 185], 2, C.wood);
      m.face(
        [
          [x, 117, 185],
          [x + 29, 111, 185],
          [x + 27, 85, 185],
          [x, 89, 185],
        ],
        '#526746',
      );
    }
  });
  return { kind: 'gold-caravan', faces: mesh, height: 250 };
}
export function caravanActivityModel(
  type: string,
  frame: number,
): InfrastructureModel | null {
  if (!caravanKind(type)) return null;
  return {
    kind: 'gold-caravan-actors',
    faces: flattenRig(caravanActors(frame)),
    height: 250,
  };
}
