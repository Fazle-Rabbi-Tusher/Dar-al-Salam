import type { Character, Step } from './schema';
import type { Point } from './iso';
import type { InfrastructureModel, Vertex3 } from './infrastructure';
import { MeshBuilder } from './laboratory';
import { TILE_SIDE } from './planet';
import { sampleStep } from './script';

/** Tile coordinates are shared by the room, players, wickets, hoops and balls. */
export const SPORTS = {
  cricket: { tile: [70.5, 99.5] as Point, footprint: [23.5, 24] as Point },
  basketball: { tile: [68, 35.4] as Point, footprint: [12.2, 8.8] as Point },
  boxing: { tile: [78, 47] as Point, footprint: [6, 6] as Point },
  mma: { tile: [64, 47] as Point, footprint: [6, 6] as Point },
  striker: [78.65, 111.5] as Point,
  nonStriker: [85.15, 110.55] as Point,
  bowler: [88.3, 111.5] as Point,
  release: [86.15, 111.5] as Point,
  fielder: [78.2, 116.8] as Point,
  shooter: [74.5, 39.8] as Point,
  rim: [78.7, 39.8] as Point,
  rimHeight: 70,
  courtHeight: 2,
  cricketHeight: 1.2,
} as const;
export const SPORTS_PLAYERS = [
  'hashim-amla',
  'tamim-iqbal',
  'usman-khawaja',
  'mashrafe-mortaza',
  'hakeem-olajuwon',
] as const;
export const isSportsPlayer = (id: string) =>
  SPORTS_PLAYERS.some((s) => s === id);
const mod = (n: number, d: number) => ((n % d) + d) % d;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const blend = (a: Point, b: Point, t: number): Point => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
];
const at = (
  from: number,
  to: number,
  action: Step['action'],
  p: Point,
  facing: Step['facing'] = 'SE',
  z = 1.2,
): Step => ({ from, to, action, at: p, facing, z });
const go = (
  from: number,
  to: number,
  action: Step['action'],
  path: Point[],
  z = 1.2,
): Step => ({ from, to, action, path, z, easing: 'smoothstep' });

/** A practice routine, not a claim to reproduce a particular recorded match. */
export function sportsScript(id: string): Step[] | null {
  const a = SPORTS.striker,
    b = SPORTS.nonStriker;
  if (id === 'hashim-amla' || id === 'tamim-iqbal') {
    const first = id === 'hashim-amla';
    const p = first ? a : b,
      q = first ? b : a;
    const lane = first ? 110.8 : 112.2;
    return [
      at(0, 76, 'bat', p),
      go(76, 116, 'walk', [p, [p[0], lane], [q[0], lane], q]),
      at(116, 196, 'bat', q),
      go(196, 236, 'walk', [q, [q[0], lane], [p[0], lane], p]),
      at(236, 240, 'bat', p),
    ];
  }
  if (id === 'mashrafe-mortaza')
    return [0, 120].flatMap((offset) => [
      at(offset, offset + 8, 'bowl', SPORTS.bowler, 'NW'),
      go(offset + 8, offset + 34, 'bowl', [SPORTS.bowler, SPORTS.release]),
      at(offset + 34, offset + 46, 'bowl', SPORTS.release, 'NW'),
      go(offset + 46, offset + 54, 'bowl', [SPORTS.release, [85.8, 111.5]]),
      go(offset + 54, offset + 100, 'bowl', [[85.8, 111.5], SPORTS.bowler]),
      at(offset + 100, offset + 120, 'bowl', SPORTS.bowler, 'NW'),
    ]);
  if (id === 'usman-khawaja')
    return [0, 120].flatMap((offset) => [
      at(offset, offset + 96, 'catch', SPORTS.fielder, 'NE'),
      at(offset + 96, offset + 108, 'catch', SPORTS.fielder, 'SE'),
      at(offset + 108, offset + 120, 'catch', SPORTS.fielder, 'NE'),
    ]);
  if (id === 'hakeem-olajuwon')
    return [
      at(0, 33, 'shoot', SPORTS.shooter, 'SE', 2),
      go(33, 51, 'dribble', [SPORTS.shooter, [78, 40.2]], 2),
      go(51, 72, 'dribble', [[78, 40.2], SPORTS.shooter], 2),
      go(72, 91, 'dribble', [SPORTS.shooter, [77.8, 39.8]], 2),
      at(91, 96, 'dunk', [77.8, 39.8], 'SE', 2),
      at(96, 113, 'dunk', [77.8, 39.8], 'SE', 2),
      go(
        113,
        150,
        'dribble',
        [
          [77.8, 39.8],
          [73, 39.8],
        ],
        2,
      ),
      go(
        150,
        201,
        'dribble',
        [
          [73, 39.8],
          [77.8, 39.8],
        ],
        2,
      ),
      at(201, 206, 'dunk', [77.8, 39.8], 'SE', 2),
      at(206, 223, 'dunk', [77.8, 39.8], 'SE', 2),
      go(223, 240, 'dribble', [[77.8, 39.8], SPORTS.shooter], 2),
    ];
  return null;
}
/** Six DRAWN poses are sampled by contact phase rather than looping independently. */
export function sportsPose(id: string, frame: number): number {
  const t = mod(frame, 120);
  if (id === 'mashrafe-mortaza')
    return t < 8
      ? 5
      : t < 31
        ? Math.floor(t / 3) % 2 === 0
          ? 0
          : 5
        : t < 37
          ? 1
          : t < 44
            ? 2
            : t < 47
              ? 3
              : t < 56
                ? 4
                : t < 100
                  ? Math.floor(t / 3) % 2 === 0
                    ? 0
                    : 5
                  : 5;
  if (id === 'usman-khawaja')
    return t < 80 ? 0 : t < 88 ? 1 : t < 96 ? 2 : t < 100 ? 3 : t < 104 ? 4 : 5;
  if (id === 'hashim-amla' || id === 'tamim-iqbal') {
    const striking = frame < 120 === (id === 'hashim-amla');
    if (!striking) return 0;
    return t < 45 ? 0 : t < 52 ? 1 : t < 59 ? 2 : t < 63 ? 3 : t < 71 ? 4 : 5;
  }
  const f = mod(frame, 240);
  if (f < 62)
    return f < 8 ? 0 : f < 13 ? 1 : f < 17 ? 2 : f < 21 ? 3 : f < 33 ? 4 : 5;
  const jump = f < 170 ? 96 : 206;
  const j = f - jump;
  if (j >= -5 && j < 0) return 1;
  if (j >= 0 && j < 3) return 2;
  if (j >= 3 && j < 7) return 3;
  if (j >= 7 && j < 11) return 4;
  if (j >= 11 && j < 17) return 5;
  return Math.floor(f / 3) % 2 === 0 ? 0 : 5;
}
/** Gravity in the same world-pixel units as the court (about 24 px/metre). */
export const SPORTS_GRAVITY = 235.2;
export function basketballLift(frame: number) {
  const f = mod(frame, 240);
  const takeoff = f >= 206 ? 206 : f >= 96 ? 96 : 12;
  const duration = takeoff === 12 ? 0.6 : 0.8;
  const t = (f - takeoff) / 12;
  return t >= 0 && t <= duration
    ? Math.max(0, (SPORTS_GRAVITY * t * (duration - t)) / 2)
    : 0;
}
export type BallState = { tile: Point; height: number; phase: string };
export function basketballPlayerTile(frame: number): Point {
  const f = mod(frame, 240),
    s = sportsScript('hakeem-olajuwon')!.find((s) => f >= s.from && f < s.to)!;
  return sampleStep(s, (f - s.from) / (s.to - s.from)).tile;
}
/** An analytic ballistic arc connects two contact points with constant gravity. */
export function ballistic(
  a: BallState,
  b: BallState,
  tick: number,
  from: number,
  to: number,
  gravity = SPORTS_GRAVITY,
): BallState {
  const t = clamp((tick - from) / (to - from));
  const duration = (to - from) / 12;
  return {
    tile: blend(a.tile, b.tile, t),
    height:
      lerp(a.height, b.height, t) +
      (gravity * duration * duration * t * (1 - t)) / 2,
    phase: a.phase,
  };
}
const ball = (tile: Point, height: number, phase: string): BallState => ({
  tile,
  height,
  phase,
});
export function cricketBall(frame: number): BallState {
  const t = mod(frame, 120),
    S = SPORTS;
  const hand: Point = [S.bowler[0] - 0.05, S.bowler[1] - 0.12];
  if (t < 44) {
    const run = clamp((t - 8) / 26),
      p = blend(S.bowler, S.release, run);
    return ball(
      [p[0] - 0.1, p[1] - 0.12],
      t < 34 ? 24 : lerp(24, 53, clamp((t - 34) / 10)),
      'held',
    );
  }
  const release = ball([S.release[0] - 0.1, 111.38], 53, 'delivery');
  const bounce = ball([81, 111.5], 2.1, 'bounce');
  const contact = ball([79.12, 111.5], 14, 'contact');
  const field = ball([78.2, 116.8], 10, 'field');
  if (t < 54) return ballistic(release, bounce, t, 44, 54, 70);
  if (t < 60) return ballistic(bounce, contact, t, 54, 60, 70);
  if (t < 88)
    return ballistic({ ...contact, phase: 'struck' }, field, t, 60, 88, 55);
  if (t < 100)
    return ball(field.tile, t < 96 ? 10 : lerp(10, 40, (t - 96) / 4), 'gather');
  if (t < 116)
    return ballistic(
      ball(field.tile, 40, 'return'),
      ball(hand, 24, 'return'),
      t,
      100,
      116,
      75,
    );
  return ball(hand, 24, 'held');
}
export function basketballBall(frame: number, playerTile: Point): BallState {
  const f = mod(frame, 240),
    S = SPORTS;
  const hand = [playerTile[0] + 0.28, playerTile[1]] as Point;
  const release = ball(
    [S.shooter[0] + 0.28, S.shooter[1]],
    62 + basketballLift(17),
    'shot',
  );
  const rim = ball(S.rim, S.rimHeight + 2, 'basket');
  if (f < 17)
    return ball(
      hand,
      lerp(27, 62, clamp(f / 17)) + basketballLift(f),
      'gather',
    );
  if (f < 30) return ballistic(release, rim, f, 17, 30);
  if (f < 39)
    return ballistic(
      { ...rim, phase: 'through-net' },
      ball(S.rim, 6, 'bounce'),
      f,
      30,
      39,
    );
  // Hakeem chases the rebound and catches it; the ball never returns by itself.
  const pickup = ball([78.4, 40.1], 6, 'rebound');
  if (f < 49) return ballistic(ball(S.rim, 6, 'bounce'), pickup, f, 39, 49);
  if (f < 52) {
    const p = basketballPlayerTile(52);
    return ballistic(
      pickup,
      ball([p[0] + 0.28, p[1]], 27, 'gather'),
      f,
      49,
      52,
    );
  }
  for (const start of [96, 206]) {
    if (f >= start - 5 && f < start + 17) {
      const t = f - start;
      if (t < 4)
        return ball(
          blend(hand, S.rim, clamp((t + 5) / 9)),
          lerp(27, S.rimHeight + 4, clamp((t + 5) / 9)),
          'dunk-gather',
        );
      if (t < 7)
        return ball(
          S.rim,
          lerp(S.rimHeight + 4, S.rimHeight - 8, (t - 4) / 3),
          'dunk',
        );
      // Continue the downward release velocity, bounce on the actual court,
      // then gather at the hip. Both flight segments have negative acceleration.
      const impact =
        start +
        7 +
        (12 * (-48 + Math.sqrt(48 ** 2 + 2 * SPORTS_GRAVITY * (62 - 6)))) /
          SPORTS_GRAVITY;
      const floor = ball([S.rim[0] - 0.18, S.rim[1]], 6, 'dunk-bounce');
      return f < impact
        ? ballistic(ball(S.rim, 62, 'dunk-drop'), floor, f, start + 7, impact)
        : ballistic(floor, ball(hand, 27, 'gather'), f, impact, start + 17);
    }
  }
  // Downward acceleration on each half; the floor impact reverses velocity.
  // Whole bounces end at the next gather, keeping the 240-frame seam continuous.
  const [a, b] = f < 91 ? [52, 91] : f < 201 ? [113, 201] : [223, 240];
  const q = mod(((f - a) / (b - a)) * Math.max(1, Math.round((b - a) / 10)), 1);
  const h = q < 0.5 ? 27 - 21 * (q * 2) ** 2 : 6 + 21 * (1 - (q * 2 - 2) ** 2);
  return ball(hand, h, 'dribble');
}
export function sportsKind(type: string) {
  return /^sports-(cricket-stadium|basketball-court|boxing-ring|mma-octagon)$/.test(
    type,
  )
    ? type.slice(7)
    : null;
}
const C = {
  cream: '#e6dcc0',
  stone: '#aa9574',
  teal: '#237b79',
  navy: '#153e50',
  gold: '#be9b58',
  white: '#f0ecda',
  red: '#bb4c43',
  blue: '#367c9e',
  dark: '#283840',
  grass: '#578546',
  lightGrass: '#699550',
};
function ellipse(
  m: MeshBuilder,
  x: number,
  y: number,
  z: number,
  rx: number,
  rz: number,
  color: string,
  n = 64,
) {
  m.face(
    Array.from(
      { length: n },
      (_, i) =>
        [
          x + Math.cos((i * Math.PI * 2) / n) * rx,
          y,
          z + Math.sin((i * Math.PI * 2) / n) * rz,
        ] as Vertex3,
    ),
    color,
  );
}
function ellipseLine(
  m: MeshBuilder,
  y: number,
  rx: number,
  rz: number,
  color: string,
  width = 0.7,
  n = 64,
) {
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n,
      b = ((i + 1) * Math.PI * 2) / n;
    m.beam(
      [Math.cos(a) * rx, y, Math.sin(a) * rz],
      [Math.cos(b) * rx, y, Math.sin(b) * rz],
      width,
      color,
    );
  }
}
function hoop(
  m: MeshBuilder,
  x: number,
  z: number,
  sign: number,
  floor: number,
  time?: number,
) {
  const y = SPORTS.rimHeight,
    post = x + sign * 19;
  if (time === undefined) {
    m.box(post, floor + 4, z, 18, 8, 22, C.navy);
    m.beam([post, floor + 6, z], [post, y + 10, z], 3, C.dark);
    m.beam([post, y + 10, z], [x + sign * 7, y + 17, z], 2.5, C.cream);
    m.opacity = 0.16;
    m.box(x + sign * 9, y + 12, z, 1.7, 29, 43, '#92c2c8');
    m.opacity = 1;
    // Backboard frame, inner target square, mounting bracket and breakaway rim.
    for (const zz of [-22, 22])
      m.beam(
        [x + sign * 9, y - 2, z + zz],
        [x + sign * 9, y + 27, z + zz],
        1.2,
        C.white,
      );
    for (const yy of [y - 2, y + 27])
      m.beam(
        [x + sign * 9, yy, z - 22],
        [x + sign * 9, yy, z + 22],
        1.2,
        C.white,
      );
    for (const zz of [-8, 8])
      m.beam(
        [x + sign * 8, y + 1, z + zz],
        [x + sign * 8, y + 13, z + zz],
        0.8,
        C.white,
      );
    m.beam(
      [x + sign * 8, y + 13, z - 8],
      [x + sign * 8, y + 13, z + 8],
      0.8,
      C.white,
    );
    m.beam([x + sign * 9, y, z], [x, y, z], 1.4, C.red);
  }
  const f = mod(time ?? 0, 240),
    impact =
      sign === 1
        ? [30, 100, 210].reduce(
            (v, t) =>
              v +
              (f >= t && f < t + 10 ? Math.sin(((f - t) * Math.PI) / 10) : 0),
            0,
          )
        : 0;
  if (time !== undefined || sign === -1) {
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        b = ((i + 1) * Math.PI) / 8;
      m.beam(
        [x + 6 * Math.cos(a), y, z + 6 * Math.sin(a)],
        [x + 6 * Math.cos(b), y, z + 6 * Math.sin(b)],
        0.9,
        C.red,
      );
      const bottom: Vertex3 = [
        x + (4 + impact) * Math.cos(b),
        y - 11 - impact * 3,
        z + (4 + impact) * Math.sin(b),
      ];
      m.beam(
        [x + 6 * Math.cos(a), y - 0.5, z + 6 * Math.sin(a)],
        bottom,
        0.34,
        C.white,
      );
      m.beam(
        [x + 6 * Math.cos(b), y - 0.5, z + 6 * Math.sin(b)],
        [
          x + (4 + impact) * Math.cos(a),
          y - 11 - impact * 3,
          z + (4 + impact) * Math.sin(a),
        ],
        0.34,
        C.white,
      );
    }
  }
}
function scoreboard(
  m: MeshBuilder,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
) {
  m.box(x, y, z, w, h, 3, C.navy);
  m.box(x, y + h / 2 + 1, z, w + 3, 2, 5, C.gold);
  for (const dx of [-w * 0.36, w * 0.36])
    m.box(x + dx, y / 2, z, 2, y, 2, C.stone);
}
function seats(
  m: MeshBuilder,
  x: number,
  y: number,
  z: number,
  rot = false,
  color = C.teal,
) {
  m.box(x, y, z, rot ? 6 : 9, 2, rot ? 9 : 6, color);
  m.box(
    x + (rot ? 3 : 0),
    y + 4,
    z + (rot ? 0 : 3),
    rot ? 1.5 : 9,
    7,
    rot ? 9 : 1.5,
    color,
  );
}
/** All arena surfaces are real volumes, not a single billboard floor image. */
export function sportsModel(
  type: string,
  fp: Point,
): InfrastructureModel | null {
  const kind = sportsKind(type);
  if (!kind) return null;
  const m = new MeshBuilder(),
    w = fp[0] * TILE_SIDE,
    d = fp[1] * TILE_SIDE;
  if (kind === 'cricket-stadium') {
    m.box(0, -1.6, 0, w, 3.2, d, C.cream);
    ellipse(m, 0, 1.2, 0, w * 0.405, d * 0.405, C.grass);
    // Mown strips follow one coherent oval, with a visible rope boundary.
    for (let j = -6; j <= 6; j++) {
      const z = j * d * 0.056,
        rz = d * 0.404,
        rx = w * 0.404;
      const x = Math.sqrt(Math.max(0, 1 - (z / rz) ** 2)) * rx;
      m.face(
        [
          [-x, 1.23, z - 8],
          [-x, 1.23, z + 8],
          [x, 1.23, z + 8],
          [x, 1.23, z - 8],
        ],
        j % 2 ? C.grass : C.lightGrass,
      );
    }
    ellipseLine(m, 1.6, w * 0.383, d * 0.383, C.white, 1.2);
    ellipseLine(m, 1.55, w * 0.26, d * 0.26, '#b5bf8d', 0.45);
    // Square, dry central wicket; two bowling creases and three stumps per end.
    const cx =
      ((78.9 + 85.5) / 2 - (SPORTS.cricket.tile[0] + fp[0] / 2)) * TILE_SIDE;
    const cz = (111.5 - (SPORTS.cricket.tile[1] + fp[1] / 2)) * TILE_SIDE;
    m.box(cx, 1.35, cz, 7.4 * TILE_SIDE, 0.3, 1.3 * TILE_SIDE, '#c6b68a');
    for (const tx of [78.9, 85.5]) {
      const x = (tx - (SPORTS.cricket.tile[0] + fp[0] / 2)) * TILE_SIDE;
      m.beam([x, 1.6, cz - 19], [x, 1.6, cz + 19], 0.8, C.white);
      const inside = tx < 82 ? 1 : -1;
      m.beam(
        [x + inside * 6, 1.6, cz - 19],
        [x + inside * 6, 1.6, cz + 19],
        0.8,
        C.white,
      );
      for (const zz of [-19, 19])
        m.beam(
          [x, 1.6, cz + zz],
          [x + inside * 12, 1.6, cz + zz],
          0.7,
          C.white,
        );
      for (const zz of [-2, 0, 2])
        m.box(x, 10.5, cz + zz, 0.6, 18, 0.6, C.cream);
      m.beam([x, 19.6, cz - 2.5], [x, 19.6, cz + 2.5], 0.6, C.gold);
    }
    // Four terraces, individual seats, aisles, roofs, vomitories and railings.
    for (let k = 0; k < 4; k++) {
      const axis = k % 2,
        sign = k < 2 ? 1 : -1;
      for (let r = 0; r < 3; r++) {
        const edge = (axis ? d : w) * (0.425 + r * 0.023) * sign;
        m.box(
          axis ? 0 : edge,
          3 + r * 5,
          axis ? edge : 0,
          axis ? w * 0.68 : 11,
          6 + r * 10,
          axis ? 11 : d * 0.68,
          C.stone,
        );
        for (let i = -13; i <= 13; i++)
          if (i % 7 !== 0)
            seats(
              m,
              axis ? i * 12 : edge,
              8 + r * 10,
              axis ? edge : i * 12,
              !axis,
              (i + r) % 4 === 0 ? C.cream : C.teal,
            );
      }
      const edge = (axis ? d : w) * 0.475 * sign;
      m.box(
        axis ? 0 : edge,
        51,
        axis ? edge : 0,
        axis ? w * 0.72 : 30,
        3,
        axis ? 30 : d * 0.72,
        C.cream,
      );
      m.box(
        axis ? 0 : edge,
        53,
        axis ? edge : 0,
        axis ? w * 0.72 : 28,
        1,
        axis ? 28 : d * 0.72,
        C.teal,
      );
      for (const s of [-1, 1])
        m.box(
          axis ? s * w * 0.3 : edge,
          26,
          axis ? edge : s * d * 0.3,
          3,
          50,
          3,
          C.gold,
        );
    }
    scoreboard(m, 0, 49, -d * 0.437, 84, 29);
    // Sight screens are beyond the boundary, aligned to the pitch.
    for (const sign of [-1, 1])
      m.box(sign * w * 0.406, 13, cz, 2, 24, 48, C.white);
    for (const x of [-w * 0.43, w * 0.43])
      for (const z of [-d * 0.43, d * 0.43]) {
        m.box(x, 46, z, 2.3, 92, 2.3, C.dark);
        m.box(x, 92, z, 24, 11, 4, C.dark);
        for (let i = -2; i <= 2; i++)
          for (const dy of [-3, 3])
            m.box(x + i * 4, 92 + dy, z + 2.3, 3, 3, 1, '#ffe5a6');
      }
    // Entrance pavilion carries modern Islamic geometric lattice, no generated lettering.
    m.box(-w * 0.475, 14, 0, 16, 28, 46, C.cream);
    m.box(-w * 0.48, 17, 0, 17, 24, 24, C.navy);
    for (let i = -2; i <= 2; i++)
      m.beam([-w * 0.492, 5, i * 5], [-w * 0.492, 29, i * 5 + 12], 0.9, C.gold);
  } else if (kind === 'basketball-court') {
    m.box(0, 0, 0, w, 4, d, C.navy);
    m.box(0, 2.02, 0, w - 21, 0.1, d - 35, '#bc9664');
    // Alternating narrow maple planks with staggered end joints.
    for (let z = -d / 2 + 20, k = 0; z < d / 2 - 18; z += 6, k++) {
      m.box(0, 2.1, z, w - 23, 0.08, 5.4, k % 3 === 0 ? '#cba875' : '#bc9664');
      for (let x = -w / 2 + 20 + (k % 2) * 34; x < w / 2 - 12; x += 68)
        m.box(x, 2.2, z, 0.4, 0.05, 5.4, '#a27b50');
    }
    const x0 = -w / 2 + 27,
      x1 = w / 2 - 27,
      z0 = -d / 2 + 22,
      z1 = d / 2 - 22;
    for (const x of [x0, x1]) m.beam([x, 2.4, z0], [x, 2.4, z1], 1, C.white);
    for (const z of [z0, z1]) m.beam([x0, 2.4, z], [x1, 2.4, z], 1, C.white);
    m.beam([0, 2.4, z0], [0, 2.4, z1], 0.9, C.white);
    ellipseLine(m, 2.4, 19, 19, C.white, 0.9, 32);
    for (const sign of [-1, 1]) {
      const x = sign * (w / 2 - 34);
      m.box(x - sign * 21, 2.3, 0, 43, 0.08, 48, C.teal);
      for (const z of [-24, 24])
        m.beam([x, 2.5, z], [x - sign * 43, 2.5, z], 1, C.white);
      m.beam([x - sign * 43, 2.5, -24], [x - sign * 43, 2.5, 24], 1, C.white);
      for (let i = 0; i < 32; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 32,
          b = a + Math.PI / 32;
        m.beam(
          [x - sign * Math.cos(a) * 66, 2.5, Math.sin(a) * 66],
          [x - sign * Math.cos(b) * 66, 2.5, Math.sin(b) * 66],
          0.8,
          C.white,
        );
      }
      // The exact rim tile also drives shot/dunk contact and the net animation.
      const hx =
        sign === 1
          ? (SPORTS.rim[0] - (SPORTS.basketball.tile[0] + fp[0] / 2)) *
            TILE_SIDE
          : -(SPORTS.rim[0] - (SPORTS.basketball.tile[0] + fp[0] / 2)) *
            TILE_SIDE;
      const hz =
        (SPORTS.rim[1] - (SPORTS.basketball.tile[1] + fp[1] / 2)) * TILE_SIDE;
      hoop(m, hx, hz, sign, 2);
    }
    for (let x = -75; x <= 75; x += 13)
      seats(m, x, 6, -d / 2 + 8, false, x < 0 ? C.red : C.blue);
    scoreboard(m, 0, 27, -d / 2 + 4, 46, 17);
    for (const x of [-w / 2 + 8, w / 2 - 8])
      for (const z of [-d / 2 + 8, d / 2 - 8]) {
        m.box(x, 42, z, 2, 84, 2, C.dark);
        m.box(x, 84, z, 16, 5, 7, C.cream);
      }
  } else if (kind === 'boxing-ring') {
    const h = 8,
      r = w / 2 - 8;
    m.box(0, h / 2, 0, w, h, d, C.navy);
    m.box(0, h - 0.3, 0, w - 3, 1, d - 3, '#a9bbc4');
    m.box(0, h + 0.3, 0, 40, 0.15, 23, C.teal);
    for (const x of [-r, r])
      for (const z of [-r, r]) {
        const c = x * z > 0 ? C.red : C.blue;
        m.box(x, h + 30, z, 3, 60, 3, C.dark);
        m.box(x, h + 37, z, 5, 34, 5, c);
        for (const yy of [14, 27, 40, 53]) {
          m.box(x * 0.94, h + yy, z * 0.94, 5, 3, 5, c);
          m.beam([x, h + yy, z], [x * 0.94, h + yy, z * 0.94], 1, C.dark);
        }
      }
    // Four ropes, visible separation, corner turnbuckles and rope spacers.
    for (const yy of [14, 27, 40, 53])
      for (const sign of [-1, 1]) {
        m.beam(
          [-r, h + yy, sign * r],
          [r, h + yy, sign * r],
          1.15,
          yy === 53 ? C.red : C.white,
        );
        m.beam(
          [sign * r, h + yy, -r],
          [sign * r, h + yy, r],
          1.15,
          yy === 14 ? C.blue : C.white,
        );
      }
    for (const q of [-0.5, 0, 0.5])
      for (const sign of [-1, 1]) {
        m.beam(
          [q * r, h + 14, sign * r],
          [q * r, h + 53, sign * r],
          0.55,
          C.dark,
        );
        m.beam(
          [sign * r, h + 14, q * r],
          [sign * r, h + 53, q * r],
          0.55,
          C.dark,
        );
      }
    for (let i = 0; i < 3; i++)
      m.box(
        0,
        (i + 1) * 1.4,
        d / 2 + 13 - i * 5,
        22,
        (i + 1) * 2.8,
        7,
        C.stone,
      );
    for (const x of [-r + 8, r - 8]) {
      seats(m, x, h + 3, r - 8, false, x < 0 ? C.red : C.blue);
      m.ring(x, h + 1, r - 17, 2.2, 4, C.white);
    }
  } else {
    const h = 4,
      r = w / 2 - 4;
    const corners = Array.from({ length: 8 }, (_, i) => {
      const a = ((i + 0.5) * Math.PI) / 4;
      return [
        (Math.cos(a) * r) / Math.cos(Math.PI / 8),
        (Math.sin(a) * r) / Math.cos(Math.PI / 8),
      ] as Point;
    });
    m.face(
      corners.map(([x, z]) => [x, h, z]),
      '#b1bdc0',
    );
    for (let i = 0; i < 8; i++) {
      const a = corners[i],
        b = corners[(i + 1) % 8];
      m.face(
        [
          [a[0], 0, a[1]],
          [a[0], h, a[1]],
          [b[0], h, b[1]],
          [b[0], 0, b[1]],
        ],
        C.navy,
      );
      m.box(a[0], h + 33, a[1], 3.5, 66, 3.5, i % 3 === 0 ? C.blue : C.dark);
      m.beam([a[0], h + 66, a[1]], [b[0], h + 66, b[1]], 2.2, C.dark);
      m.beam([a[0], h + 1, a[1]], [b[0], h + 1, b[1]], 1.8, C.dark);
      // Actual open diamond chain links; no opaque rectangle in front of faces.
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]),
        n = Math.ceil(len / 6);
      for (let j = 0; j < n; j++)
        for (let k = 0; k < 9; k++) {
          const t0 = j / n,
            t1 = (j + 0.5) / n,
            t2 = (j + 1) / n;
          const p0 = blend(a, b, t0),
            p1 = blend(a, b, t1),
            p2 = blend(a, b, t2);
          const y = h + 2 + k * 7;
          m.beam([p0[0], y, p0[1]], [p1[0], y + 3.5, p1[1]], 0.26, '#596b70');
          m.beam([p1[0], y + 3.5, p1[1]], [p2[0], y, p2[1]], 0.26, '#596b70');
          m.beam(
            [p0[0], y + 7, p0[1]],
            [p1[0], y + 3.5, p1[1]],
            0.26,
            '#596b70',
          );
          m.beam(
            [p1[0], y + 3.5, p1[1]],
            [p2[0], y + 7, p2[1]],
            0.26,
            '#596b70',
          );
        }
      if (i === 1) {
        const left = blend(a, b, 0.22),
          right = blend(a, b, 0.78);
        for (const p of [left, right])
          m.beam([p[0], h + 2, p[1]], [p[0], h + 62, p[1]], 1.4, C.dark);
        m.beam(
          [left[0], h + 62, left[1]],
          [right[0], h + 62, right[1]],
          1.4,
          C.dark,
        );
        m.box(right[0], h + 30, right[1], 3, 4, 3, C.gold);
        for (const y of [12, 55])
          m.box(left[0], h + y, left[1], 3, 4, 3, C.stone);
      }
    }
    ellipseLine(m, h + 0.15, r * 0.65, r * 0.65, C.white, 0.6, 8);
    m.box(0, h + 0.2, 0, 33, 0.2, 20, C.teal);
    for (let i = 0; i < 2; i++)
      m.box(0, i + 1, d / 2 + 9 - i * 5, 22, (i + 1) * 2, 7, C.stone);
  }
  return m.model(kind);
}
function pixelBall(
  m: MeshBuilder,
  p: Vertex3,
  r: number,
  color: string,
  basketball = false,
  time = 0,
) {
  // Faceted sphere with a seam that rotates as the ball travels.
  const segments = 12,
    rings = 6;
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < segments; i++) {
      const point = (a: number, b: number): Vertex3 => [
        p[0] + r * Math.sin(a) * Math.cos(b),
        p[1] + r * Math.cos(a),
        p[2] + r * Math.sin(a) * Math.sin(b),
      ];
      const a = (j * Math.PI) / rings,
        b = ((j + 1) * Math.PI) / rings,
        c = (i * Math.PI * 2) / segments + time * 0.12,
        d = ((i + 1) * Math.PI * 2) / segments + time * 0.12;
      const surface =
        j === 0
          ? [point(a, c), point(b, c), point(b, d)]
          : j === rings - 1
            ? [point(a, c), point(b, c), point(a, d)]
            : [point(a, c), point(b, c), point(b, d), point(a, d)];
      m.face(
        surface,
        basketball && (i % 6 === 0 || j === 3) ? '#674631' : color,
      );
    }
}
const digits = [
  '1110111',
  '0010010',
  '1011101',
  '1011011',
  '0111010',
  '1101011',
  '1101111',
  '1010010',
  '1111111',
  '1111011',
];
function digit(
  m: MeshBuilder,
  n: number,
  x: number,
  y: number,
  z: number,
  s = 1,
) {
  const bits = digits[mod(Math.floor(n), 10)];
  const segs = [
    [0, 4, 4, 1],
    [-2, 2, 1, 3],
    [2, 2, 1, 3],
    [0, 0, 4, 1],
    [-2, -2, 1, 3],
    [2, -2, 1, 3],
    [0, -4, 4, 1],
  ];
  segs.forEach(([dx, dy, w, h], i) =>
    m.box(
      x + dx * s,
      y + dy * s,
      z,
      w * s,
      h * s,
      0.35,
      bits[i] === '1' ? '#ffe7a8' : '#294b54',
    ),
  );
}
/** Fixed topology, so moving balls/nets update existing GPU buffers on the shared clock. */
export function sportsActivityModel(
  type: string,
  fp: Point,
  time: number,
): InfrastructureModel | null {
  const kind = sportsKind(type);
  if (kind !== 'cricket-stadium' && kind !== 'basketball-court') return null;
  const m = new MeshBuilder(),
    S = kind === 'cricket-stadium' ? SPORTS.cricket : SPORTS.basketball;
  const centre: Point = [S.tile[0] + fp[0] / 2, S.tile[1] + fp[1] / 2];
  const f = mod(time, 240);
  const player = basketballPlayerTile(time);
  const state =
    kind === 'cricket-stadium'
      ? cricketBall(time)
      : basketballBall(time, player);
  const p: Vertex3 = [
    (state.tile[0] - centre[0]) * TILE_SIDE,
    state.height,
    (state.tile[1] - centre[1]) * TILE_SIDE,
  ];
  pixelBall(
    m,
    p,
    kind === 'cricket-stadium' ? 1.5 : 4,
    kind === 'cricket-stadium' ? '#d9e0d3' : '#cf7e3b',
    kind === 'basketball-court',
    time,
  );
  // The ground shadow follows the ball, while never moving through the floor.
  m.opacity = 0.2;
  ellipse(
    m,
    p[0],
    kind === 'cricket-stadium' ? 1.5 : 2.65,
    p[2],
    kind === 'cricket-stadium' ? 2 : 4,
    kind === 'cricket-stadium' ? 2 : 4,
    '#173c36',
    12,
  );
  m.opacity = 1;
  if (kind === 'basketball-court') {
    hoop(
      m,
      (SPORTS.rim[0] - centre[0]) * TILE_SIDE,
      (SPORTS.rim[1] - centre[1]) * TILE_SIDE,
      1,
      2,
      time,
    );
    const score = f < 30 ? 0 : f < 100 ? 2 : f < 210 ? 4 : 6;
    digit(m, score, -8, 27, (-fp[1] * TILE_SIDE) / 2 + 5.8, 1.1);
    digit(
      m,
      24 - Math.floor(f / 10),
      9,
      27,
      (-fp[1] * TILE_SIDE) / 2 + 5.8,
      1.1,
    );
  } else {
    digit(
      m,
      f < 116 ? 0 : f < 236 ? 1 : 2,
      -18,
      49,
      -fp[1] * TILE_SIDE * 0.437 + 2,
      1.7,
    );
    digit(m, Math.floor(f / 120), 0, 49, -fp[1] * TILE_SIDE * 0.437 + 2, 1.7);
    digit(
      m,
      mod(Math.floor(f / 60), 2),
      18,
      49,
      -fp[1] * TILE_SIDE * 0.437 + 2,
      1.7,
    );
  }
  return m.model(`${kind}-activity`);
}

/** Preserve authored identity/research/approval; only replace the requested routine. */
export function updateSportsCharacter(c: Character): Character {
  const script = sportsScript(c.id);
  return script ? { ...c, loop: 240, script } : c;
}
