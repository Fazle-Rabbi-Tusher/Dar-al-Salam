import type { Point } from './iso';
import type { Step } from './schema';
import type { InfrastructureModel, Vertex3 } from './infrastructure';
import { MeshBuilder } from './laboratory';
import { TILE_SIDE } from './planet';

const PODCAST_TILE: Point = [39, 24.96];
/** All furniture, performers, staff and cameras travel with the studio. */
export const podcastTile = (x: number, y: number): Point => [
  +(PODCAST_TILE[0] + x).toFixed(4),
  +(PODCAST_TILE[1] + y).toFixed(4),
];
export const PODCAST = {
  tile: PODCAST_TILE,
  center: podcastTile(8, 6),
  footprint: [16, 12] as Point,
  omar: podcastTile(5.15, 6.4),
  mehdi: podcastTile(8.4, 3.15),
  seats: [podcastTile(4.5, 6.4), podcastTile(8.4, 2.5)] as Point[],
  table: podcastTile(7.6, 5.6),
  cameras: [
    podcastTile(10.5, 10.2),
    podcastTile(14.7, 5.7),
    podcastTile(3, 10.3),
  ],
  monitor: podcastTile(14.3, 9),
  operator: podcastTile(14.3, 10.2),
  floor: 1.8,
  area: [podcastTile(-0.5, -0.5), podcastTile(16.5, 12.5)] as [Point, Point],
};
const TAU = Math.PI * 2;
const C = {
  wood: '#986849',
  oak: '#b58c60',
  edge: '#cda474',
  teal: '#276461',
  fabric: '#315656',
  dark: '#273332',
  black: '#1d2529',
  bronze: '#c4a46c',
  white: '#efe8d3',
  light: '#ffe4ac',
  green: '#5d8256',
  rug: '#315f58',
};
export function podcastKind(type: string) {
  return type === 'podcast-studio'
    ? 'podcast-studio'
    : /^podcast-wall(-side)?$/.test(type)
      ? 'facade'
      : null;
}
export function podcastState(frame: number) {
  const t = ((frame % 240) + 240) % 240;
  return {
    t,
    omar: t < 84 || t >= 216,
    mehdi: t >= 108 && t < 192,
    breath: 0.5 + 0.5 * Math.sin((t * TAU) / 48),
  };
}
export function podcastScript(id: string): Step[] | null {
  if (!['omar-suleiman', 'mehdi-hasan'].includes(id)) return null;
  const omar = id === 'omar-suleiman',
    at = omar ? PODCAST.omar : PODCAST.mehdi,
    facing = omar ? 'SE' : 'SW';
  return [
    [0, 84, omar],
    [84, 108, false],
    [108, 192, !omar],
    [192, 216, false],
    [216, 240, omar],
  ].map(([from, to, talk]) => ({
    from: Number(from),
    to: Number(to),
    action: talk ? 'podcast-talk' : 'podcast-listen',
    at,
    facing,
    z: PODCAST.floor,
  }));
}
/** Mouth/hand poses rise and settle inside each speaker's turn; listening
 * nods and blinks stay restrained, with stable feet and hips. */
export function podcastPose(id: string, frame: number) {
  const s = podcastState(frame),
    talk = id === 'omar-suleiman' ? s.omar : s.mehdi;
  if (!talk)
    return [0, 0, 1, 0, 0, 2, 3, 0, 4, 0, 5, 0][Math.floor(s.t / 5) % 12];
  const start = s.t >= 216 ? 216 : s.t >= 108 ? 108 : 0,
    end = start === 216 ? 240 : start + 84;
  const local = s.t - start;
  if (local < 4 || end - s.t < 4) return 0;
  return [0, 1, 2, 2, 3, 2, 4, 5][Math.floor(local / 4) % 8];
}
const coords = (tile: Point, fp: Point, p: Point): Point => [
  (p[0] - tile[0] - fp[0] / 2) * TILE_SIDE,
  (p[1] - tile[1] - fp[1] / 2) * TILE_SIDE,
];
function transform(
  m: MeshBuilder,
  local: MeshBuilder,
  x: number,
  y: number,
  z: number,
  angle: number,
) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  for (const f of local.faces)
    m.faces.push({
      ...f,
      points: f.points.map(([a, b, d]) => [
        x + a * c + d * s,
        y + b,
        z - a * s + d * c,
      ]),
    });
}
function chair(m: MeshBuilder, x: number, z: number, angle: number) {
  const a = new MeshBuilder();
  // Local chair faces +X: hip sits behind the planted soles.
  for (const xx of [-9, 8])
    for (const zz of [-9, 9]) a.beam([xx, 2, zz], [xx, 17, zz], 2.1, C.oak);
  a.box(0, 17.4, 0, 27, 7, 26, C.teal);
  a.box(-11, 34, 0, 6, 33, 27, C.teal);
  a.box(-7.8, 35, 0, 2, 26, 22, C.fabric);
  for (const zz of [-14, 14]) {
    a.box(0, 25, zz, 28, 7, 5, C.teal);
    a.box(0, 29, zz, 28, 1.4, 5, C.edge);
  }
  for (let zz = -9; zz <= 9; zz += 6)
    a.box(-6.5, 34, zz, 0.4, 23, 0.4, '#426d65');
  transform(m, a, x, PODCAST.floor, z, angle);
}
function microphone(m: MeshBuilder, base: Vertex3, target: Vertex3) {
  const a: Vertex3 = [base[0], base[1] + 13, base[2]],
    b: Vertex3 = [
      (base[0] + target[0]) * 0.5,
      Math.max(base[1] + 20, target[1] + 7),
      (base[2] + target[2]) * 0.5,
    ];
  m.box(base[0], base[1], base[2], 5, 3, 5, C.black);
  for (const [p, q] of [
    [base, a],
    [a, b],
    [b, target],
  ] as [Vertex3, Vertex3][]) {
    m.beam(p, q, 1.3, C.black);
    m.beam([p[0] + 1, p[1], p[2]], [q[0] + 1, q[1], q[2]], 0.45, C.bronze);
  }
  for (const p of [a, b]) m.box(p[0], p[1], p[2], 3, 3, 3, C.dark);
  const head: Vertex3 = [target[0], target[1] - 2.6, target[2]];
  m.beam(target, head, 4, C.black);
  m.box(target[0], target[1] + 0.5, target[2], 4.7, 3.5, 4.7, '#343d3c');
  for (let j = 0; j < 3; j++)
    m.box(target[0], target[1] - 2 - j, target[2], 4.6, 0.35, 4.6, C.bronze);
  // Deliberate cable follows the boom and is taped down across the rug.
  for (const [p, q] of [
    [head, b],
    [b, a],
    [a, base],
  ] as [Vertex3, Vertex3][])
    m.beam(
      [p[0] + 1.1, p[1] - 1, p[2]],
      [q[0] + 1.1, q[1] - 1, q[2]],
      0.35,
      '#111b1c',
    );
}
function camera(
  m: MeshBuilder,
  x: number,
  z: number,
  target: Point,
  time?: number,
  phase = 0,
) {
  if (time === undefined) {
    for (let i = 0; i < 3; i++) {
      const a = (i * TAU) / 3;
      m.beam(
        [x + Math.cos(a) * 12, 2, z + Math.sin(a) * 12],
        [x, 41, z],
        1.8,
        C.dark,
      );
      m.box(
        x + Math.cos(a) * 12,
        1.4,
        z + Math.sin(a) * 12,
        4,
        2.8,
        4,
        C.black,
      );
    }
    m.beam([x, 19, z], [x, 49, z], 2.3, C.black);
    m.box(x, 48, z, 8, 4, 8, C.dark);
  } else {
    const a = new MeshBuilder(),
      yaw =
        Math.atan2(target[0] - x, target[1] - z) +
        Math.sin((time / 240) * TAU + phase) * 0.022;
    a.box(0, 3, 0, 13, 10, 10, C.black);
    a.box(-8, 4, 0, 3, 6, 9, C.dark);
    a.box(0, 10, 0, 9, 3, 3, C.black);
    a.box(0, 3, 8, 7, 7, 8, C.dark);
    a.face(
      Array.from(
        { length: 12 },
        (_, i) =>
          [
            Math.cos((i * TAU) / 12) * 3.3,
            3 + Math.sin((i * TAU) / 12) * 3.3,
            12.1,
          ] as Vertex3,
      ),
      '#435f6e',
    );
    a.box(-8, 4, -0.8, 0.5, 3.8, 5, '#7faca3');
    a.box(
      5,
      6,
      5,
      1.5,
      1.5,
      1.2,
      podcastState(time).t % 24 < 18 ? '#df5b49' : '#71382e',
    );
    a.beam([0, 0, -2], [8, -5, -12], 1, C.black);
    transform(m, a, x, 50, z, yaw);
  }
}
function softbox(m: MeshBuilder, x: number, z: number, target: Point) {
  for (let i = 0; i < 3; i++) {
    const a = (i * TAU) / 3;
    m.beam(
      [x + Math.cos(a) * 11, 2, z + Math.sin(a) * 11],
      [x, 36, z],
      1.3,
      C.black,
    );
  }
  m.box(x, 45, z, 1.8, 88, 1.8, C.dark);
  const a = new MeshBuilder();
  a.box(0, 0, 0, 29, 22, 5, C.black);
  a.box(0, 0, 3, 26, 19, 0.5, C.light);
  for (const xx of [-13, 13]) a.box(xx, 0, 3.5, 0.7, 20, 0.7, C.bronze);
  transform(m, a, x, 85, z, Math.atan2(target[0] - x, target[1] - z));
}
function wall(m: MeshBuilder, w: number, d: number, side: boolean) {
  const a = new MeshBuilder(),
    length = side ? d : w;
  a.box(0, 39, 0, length, 78, 4, C.dark);
  for (let x = -length / 2 + 3; x < length / 2; x += 5)
    a.box(x, 39, 2.5, 2.1, 76, 1.3, C.wood);
  for (const x of [-length * 0.29, 0, length * 0.29]) {
    a.box(x, 37, 4, Math.min(55, length * 0.24), 54, 3, C.fabric);
    for (let i = -2; i <= 2; i++)
      a.beam([x - 20 + i * 6, 12, 6], [x + 20 + i * 6, 62, 6], 0.5, '#527b6c');
  }
  a.box(0, 76, 3, length, 2, 5, C.bronze);
  a.box(0, 72, 5, length - 6, 1.1, 1.2, C.light);
  transform(m, a, 0, 0, 0, side ? Math.PI / 2 : 0);
}
export function podcastModel(
  type: string,
  fp: Point,
): InfrastructureModel | null {
  const kind = podcastKind(type);
  if (!kind) return null;
  const m = new MeshBuilder(),
    w = fp[0] * TILE_SIDE,
    d = fp[1] * TILE_SIDE;
  if (kind === 'facade') {
    wall(m, w, d, type.endsWith('-side'));
    return m.model('facade');
  }
  const at = (p: Point) => coords(PODCAST.tile, fp, p);
  m.box(0, 0.6, 0, w, 2.4, d, C.dark);
  for (let z = -d / 2 + 3, k = 0; z < d / 2; z += 6, k++) {
    m.box(0, 1.86, z, w - 3, 0.12, 5.6, k % 3 === 0 ? C.oak : C.wood);
    for (let x = -w / 2 + 4 + (k % 2) * 25; x < w / 2 - 2; x += 50)
      m.box(x, 1.96, z, 0.4, 0.12, 5.5, '#674b38');
  }
  m.box(-12, 2.05, -2, w * 0.68, 0.2, d * 0.64, C.rug);
  for (const s of [-1, 1]) {
    m.box(-12, 2.19, s * d * 0.32 - 2, w * 0.68, 0.1, 1.2, C.bronze);
    m.box(-12 + s * w * 0.34, 2.19, -2, 1.2, 0.1, d * 0.64, C.bronze);
  }
  for (let x = -w * 0.3; x < w * 0.3; x += 22)
    for (let z = -d * 0.26; z < d * 0.27; z += 22) {
      m.beam([x - 3, 2.25, z], [x, 2.25, z + 3], 0.3, '#5e8170');
      m.beam([x, 2.25, z + 3], [x + 3, 2.25, z], 0.3, '#5e8170');
      m.beam([x + 3, 2.25, z], [x, 2.25, z - 3], 0.3, '#5e8170');
      m.beam([x, 2.25, z - 3], [x - 3, 2.25, z], 0.3, '#5e8170');
    }
  PODCAST.seats.forEach((p, i) => {
    const [x, z] = at(p);
    chair(m, x, z, i === 0 ? 0 : -Math.PI / 2);
  });
  const [tx, tz] = at(PODCAST.table);
  m.box(tx, 13, tz, 10, 24, 10, C.dark);
  m.box(tx, 2.7, tz, 30, 2, 24, C.dark);
  m.ring(tx, 26, tz, 34, 2.7, C.wood);
  m.ring(tx, 28.7, tz, 34, 0.5, C.edge);
  PODCAST.seats.forEach((p, i) => {
    const [x, z] = at(p),
      target: Vertex3 = i === 0 ? [x + 9, 45, z] : [x, 45, z + 9];
    microphone(m, [tx + (i === 0 ? -13 : 13), 29, tz - 7], target);
  });
  m.box(tx, 30.5, tz + 8, 17, 3, 10, C.black);
  for (let i = 0; i < 4; i++) {
    m.ring(tx - 6 + i * 4, 32, tz + 9, 1.1, 1.5, C.bronze);
    m.box(tx - 6 + i * 4, 32, tz + 4, 1, 1.2, 1, C.white);
  }
  for (const dx of [-21, 21]) {
    m.ring(tx + dx, 29.3, tz + 8, 3, 5.3, C.white);
    m.ring(tx + dx, 34.6, tz + 8, 2.2, 0.2, '#61412c');
  }
  const cameras = PODCAST.cameras.map(at);
  cameras.forEach(([x, z], i) =>
    camera(m, x, z, i === 1 ? at(PODCAST.seats[0]) : at(PODCAST.seats[1])),
  );
  for (const p of [podcastTile(2, 2), podcastTile(13.2, 1.8)] as Point[]) {
    const [x, z] = at(p);
    softbox(m, x, z, [tx, tz]);
  }
  // Monitor cart, acoustic side tables and a fixed cable route to the recorder.
  const [mx, mz] = at(PODCAST.monitor);
  for (const z of [-8, 8])
    m.beam([mx - 11, 3, mz + z], [mx + 11, 3, mz + z], 2, C.black);
  for (const x of [-10, 10]) m.box(mx + x, 16, mz, 2, 28, 15, C.dark);
  m.box(mx, 31, mz, 27, 3, 20, C.wood);
  m.box(mx, 46, mz - 3, 25, 23, 3, C.black);
  m.box(mx, 46, mz - 0.9, 22, 19, 0.4, '#344f55');
  const cable: Vertex3[] = [
    [tx, 29, tz + 11],
    [tx, 3, tz + 11],
    [tx + 26, 2.2, tz + 26],
    [mx, 2.2, mz + 7],
    [mx, 31, mz + 7],
  ];
  for (let i = 1; i < cable.length; i++)
    m.beam(cable[i - 1], cable[i], 0.8, C.black);
  for (const p of [podcastTile(1.8, 10.6), podcastTile(14.4, 1.2)] as Point[]) {
    const [x, z] = at(p);
    m.ring(x, 2, z, 8, 12, C.bronze, 10);
    for (let i = 0; i < 10; i++) {
      const a = (i * TAU) / 10;
      m.beam(
        [x, 13, z],
        [x + Math.cos(a) * 13, 34 + (i % 3) * 4, z + Math.sin(a) * 13],
        2.2,
        C.green,
      );
    }
  }
  return m.model(kind);
}
export function podcastActivityModel(
  type: string,
  fp: Point,
  frame: number,
): InfrastructureModel | null {
  if (type !== 'podcast-studio') return null;
  const m = new MeshBuilder(),
    state = podcastState(frame),
    at = (p: Point) => coords(PODCAST.tile, fp, p);
  frame = state.t;
  const [tx, tz] = at(PODCAST.table),
    [mx, mz] = at(PODCAST.monitor);
  for (const [i, p] of PODCAST.cameras.entries()) {
    const [x, z] = at(p);
    camera(
      m,
      x,
      z,
      i === 1 ? at(PODCAST.seats[0]) : at(PODCAST.seats[1]),
      frame,
      i,
    );
  }
  for (let channel = 0; channel < 2; channel++)
    for (let i = 0; i < 8; i++) {
      const active = channel === 0 ? state.omar : state.mehdi,
        level = active
          ? 3 +
            Math.floor((0.5 + 0.5 * Math.sin(frame * 0.7 + channel * 1.3)) * 5)
          : 1;
      const color = i < level ? (i < 6 ? '#88b68b' : '#e5b86d') : '#2b443c';
      m.box(tx - 5 + channel * 9, 32.2, tz + 2 - i * 0.63, 3, 0.35, 0.4, color);
      m.box(mx - 8 + channel * 15, 38 + i * 1.9, mz + 1, 5, 1.3, 0.5, color);
    }
  // Two individually timed confidence screens on the production monitor.
  for (let i = 0; i < 18; i++) {
    const h =
      0.8 +
      Math.abs(Math.sin(frame * 0.4 + i * 0.8)) *
        (state.omar || state.mehdi ? 3.5 : 0.5);
    m.box(mx - 9 + i, 51, mz - 0.5, 0.6, h, 0.25, '#91b8a1');
  }
  return m.model('podcast-activity');
}
