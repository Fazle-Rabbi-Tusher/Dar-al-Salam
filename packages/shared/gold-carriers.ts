import type { Vertex3, Face3 } from './infrastructure';
import type { HumanPose, RigNode, Quaternion } from './royal-caravan';
import { MeshBuilder } from './laboratory';
import { cargoPropFaces } from './gold-cargo';

type V = Vertex3;
export const CARRIER_IDS = [
  'overhead-gold-bearer',
  'bowl-gold-bearer',
  'chest-porter-rust',
  'chest-porter-indigo',
  'banner-attendant',
  'elder-recipient',
] as const;
export type CarrierId = (typeof CARRIER_IDS)[number];
type RoutePose = {
  point: V;
  heading: number;
  travel: number;
  walk: number;
  t: number;
};
export type CarrierRole = 'overhead' | 'bearer' | 'pair' | 'banner';
export type CarrierRoute = (frame: number, role: CarrierRole) => RoutePose;
type MakeHuman = (pose: HumanPose) => RigNode;
const TAU = Math.PI * 2;
const add = (a: V, b: V): V => a.map((v, i) => v + b[i]) as V;
const sub = (a: V, b: V): V => a.map((v, i) => v - b[i]) as V;
const mix = (a: V, b: V, t: number): V =>
  a.map((v, i) => v + (b[i] - v) * t) as V;
const ease = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
const turn = (v: V, a: number): V => [
  v[0] * Math.cos(a) + v[2] * Math.sin(a),
  v[1],
  v[2] * Math.cos(a) - v[0] * Math.sin(a),
];
const yaw = (a: number): Quaternion => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const node = (
  name: string,
  faces?: Face3[],
  position: V = [0, 0, 0],
  children: RigNode[] = [],
  rotation: Quaternion = [0, 0, 0, 1],
): RigNode => ({ name, faces, position, rotation, scale: [1, 1, 1], children });
const cache = new Map<string, Face3[]>();
function mesh(id: string, draw: (m: MeshBuilder) => void, gold = false) {
  if (!cache.has(id)) {
    const m = new MeshBuilder();
    draw(m);
    cache.set(
      id,
      m.faces.map((f) => (gold ? { ...f, finish: 'gold' as const } : f)),
    );
  }
  return cache.get(id)!;
}
function lathe(
  m: MeshBuilder,
  profile: [number, number][],
  color: string,
  sectors = 24,
) {
  const at = (i: number, j: number): V => [
    Math.sin((j * TAU) / sectors) * profile[i][1],
    profile[i][0],
    Math.cos((j * TAU) / sectors) * profile[i][1],
  ];
  for (let i = 0; i < profile.length - 1; i++)
    for (let j = 0; j < sectors; j++)
      m.face([at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j)], color);
}
const gold = '#cc962f';
const routes: Record<
  CarrierRole,
  { x: number; z: number; rx: number; rz: number }
> = {
  overhead: { x: -290, z: 260, rx: 35, rz: 25 },
  bearer: { x: 260, z: 255, rx: 30, rz: 20 },
  pair: { x: 30, z: 285, rx: 30, rz: 20 },
  banner: { x: -145, z: 275, rx: 25, rz: 20 },
};
const arcLengths = Object.fromEntries(
  Object.entries(routes).map(([key, r]) => {
    const lengths = [0];
    let previous = [0, 0];
    for (let i = 1; i <= 512; i++) {
      const a = (i * TAU) / 512,
        p = [r.rx * Math.sin(a), -r.rz * (1 - Math.cos(a))];
      lengths.push(
        lengths.at(-1)! + Math.hypot(p[0] - previous[0], p[1] - previous[1]),
      );
      previous = p;
    }
    return [key, lengths];
  }),
) as Record<CarrierRole, number[]>;
/** Separate clear foreground delivery lanes, outside the older guard route. */
export function carrierRouteAt(frame: number, role: CarrierRole): RoutePose {
  const t = ((frame % 240) + 240) % 240,
    u = Math.max(0, (t - 24) / 216),
    a = ease(u) * TAU,
    r = routes[role];
  const f = (a / TAU) * 512,
    i = Math.min(511, Math.floor(f)),
    part = f - i,
    lengths = arcLengths[role];
  return {
    t,
    point: [r.x + r.rx * Math.sin(a), 0, r.z - r.rz * (1 - Math.cos(a))],
    heading: Math.atan2(r.rx * Math.cos(a), -r.rz * Math.sin(a)),
    travel: lengths[i] + (lengths[i + 1] - lengths[i]) * part,
    walk: t < 24 ? 0 : Math.sin(u * Math.PI),
  };
}
function bowl() {
  return cargoPropFaces('gold-bowl');
}
function coin() {
  return mesh(
    'carrier-gift-coin',
    (m) =>
      lathe(
        m,
        [
          [0, 0.05],
          [0, 1.3],
          [0.5, 1.3],
          [0.5, 0.05],
        ],
        '#efc565',
        16,
      ),
    true,
  );
}
function chest() {
  return cargoPropFaces('treasure-chest-body');
}
function decorate(person: RigNode, index: number) {
  const body = person.children.find((n) => n.name === 'body')!;
  body.children.push(
    node(
      'woven-collar-and-sash',
      mesh('carrier-trim-' + index, (m) => {
        for (const side of [-1, 1]) {
          m.beam([side * 3.8, 26, 3], [side * 7, 17, 7.5], 0.5, '#bd8e42');
          m.beam([side * 7, 17, 7.5], [side * 7.6, 3, 7.3], 0.4, '#dfb968');
        }
        for (let y = 0; y < 4; y++)
          m.box(
            0,
            y * 0.6,
            6.8,
            17.2,
            0.35,
            0.6,
            y % 2 ? '#a67b3a' : '#d3a251',
          );
        for (const x of [-5, 0, 5])
          for (const y of [7, 11, 15])
            m.box(x, y, 7.6, 0.65, 0.65, 0.3, '#bc9149');
      }),
    ),
  );
  if (index === 5)
    person.children.push(
      node(
        'recipient-satchel',
        mesh('recipient-satchel', (m) => {
          m.box(-8, 39, 9, 8, 9, 4, '#725039');
          m.box(-8, 42, 11.2, 8, 2.3, 0.9, '#a07c50');
          m.beam([6, 61, 4], [-8, 43, 10], 0.7, '#725039');
        }),
      ),
    );
  return person;
}

/** One calm handover while the procession rests at its first stop. */
export function carrierHandover(frame: number) {
  const tick = ((frame % 240) + 240) % 240,
    p = tick / 24;
  const active = tick <= 24;
  const reach = active
    ? ease((p - 0.18) / 0.27) * (1 - ease((p - 0.55) / 0.31))
    : 0;
  return {
    tick,
    active,
    phase: p,
    reach,
    owner:
      !active || p < 0.18 || p > 0.88
        ? 'stored'
        : p < 0.5
          ? 'giver'
          : 'recipient',
  };
}

export function goldCarrierActors(
  frame: number,
  makeHuman: MakeHuman,
  route: CarrierRoute = carrierRouteAt,
): RigNode {
  const t = ((frame % 240) + 240) % 240,
    h = carrierHandover(t);
  const overhead = route(t, 'overhead'),
    bearer = route(t, 'bearer'),
    pair = route(t, 'pair'),
    banner = route(t, 'banner');
  bearer.heading -= h.active
    ? (Math.PI / 2) * ease(h.phase / 0.18) * (1 - ease((h.phase - 0.8) / 0.2))
    : 0;
  const first = route(0, 'bearer'),
    receiverAt = add(first.point, turn([-40, 0, 0], first.heading));
  const meetWorld = add(first.point, turn([-20, 58, 0], first.heading));
  const giverMeet = turn(sub(meetWorld, bearer.point), -bearer.heading);
  const receiverHeading = first.heading + Math.PI / 2;
  const receiverMeet = turn(sub(meetWorld, receiverAt), -receiverHeading);
  const pick = [-6, 51, 17] as V,
    giverRest = [-11, 44, 14] as V;
  const pickUp = h.active
    ? ease(h.phase / 0.18) * (1 - ease((h.phase - 0.55) / 0.31))
    : 0;
  const giverWrist = mix(mix(giverRest, pick, pickUp), giverMeet, h.reach);
  const receiverWrist = mix([-8, 42, 8], receiverMeet, h.reach);
  const definitions = [
    {
      id: CARRIER_IDS[0],
      root: overhead,
      color: '#3d4c65',
      headwear: 'bare' as const,
      headColor: '#231c17',
      right: [-11, 80.5, 0] as V,
      left: [11, 80.5, 0] as V,
    },
    {
      id: CARRIER_IDS[1],
      root: bearer,
      color: '#ddd1af',
      headColor: '#e2d4b5',
      right: giverWrist,
      left: [11, 44, 14] as V,
    },
    {
      id: CARRIER_IDS[2],
      root: {
        ...pair,
        point: add(pair.point, turn([-43, 0, 0], pair.heading)),
      },
      color: '#a3613e',
      headColor: '#a4512e',
      right: [10, 43, 2] as V,
      left: [10, 43, 20] as V,
    },
    {
      id: CARRIER_IDS[3],
      root: { ...pair, point: add(pair.point, turn([43, 0, 0], pair.heading)) },
      color: '#485570',
      headColor: '#414b67',
      right: [-10, 43, 20] as V,
      left: [-10, 43, 2] as V,
    },
    {
      id: CARRIER_IDS[4],
      root: banner,
      color: '#b18c4a',
      headColor: '#c29b50',
      right: [-12, 46, 12] as V,
      left: [11, 54, 7] as V,
    },
    {
      id: CARRIER_IDS[5],
      root: {
        ...first,
        point: receiverAt,
        heading: receiverHeading,
        travel: 0,
        walk: 0,
      },
      color: '#9b9174',
      headwear: 'cap' as const,
      headColor: '#d8c6a1',
      right: receiverWrist,
      left: [10, 42, 8] as V,
    },
  ];
  const people = definitions.map((d, i) =>
    decorate(
      makeHuman({
        name: d.id,
        at: d.root.point,
        yaw: d.root.heading,
        face: 6 + i,
        frame: t,
        distance: d.root.travel,
        walk: d.root.walk,
        color: d.color,
        headwear: d.headwear,
        headColor: d.headColor,
        right: d.right,
        left: d.left,
      }),
      i,
    ),
  );
  people[0].children.push(
    node(
      'balanced-head-cushion',
      mesh('head-cushion', (m) => {
        lathe(
          m,
          [
            [73.5, 0.1],
            [73.5, 4.5],
            [76.3, 4.5],
            [76.5, 0.1],
          ],
          '#6b4d31',
          20,
        );
      }),
    ),
    node('overhead-gold-bowl', bowl(), [0, 76.5, 0]),
  );
  people[1].children.push(
    node('supported-chest-gold-bowl', bowl(), [0, 43, 14]),
  );
  const carrying = node(
    'shared-chest-rig',
    undefined,
    pair.point,
    [
      node(
        'carrying-poles',
        mesh('two-shared-carrying-poles', (m) => {
          for (const z of [2, 20])
            m.beam([-35, 43, z], [35, 43, z], 1.6, '#785638');
        }),
      ),
      node('shared-treasure-chest', chest(), [0, 44, 11]),
      node(
        'chest-open-lid',
        mesh('carrier-chest-lid', (m) => {
          m.box(0, 0, 12, 43, 1.6, 24, '#654129');
          for (const x of [-20, -12, 12, 20])
            m.box(x, 0.95, 12, 1, 0.5, 24, gold);
        }),
        [0, 56, -1],
        [],
        [Math.sin(-1.05 / 2), 0, 0, Math.cos(-1.05 / 2)],
      ),
    ],
    yaw(pair.heading),
  );
  const poleWrist = definitions[4].left;
  const bannerCloth = mesh('geometric-gold-banner', (m) => {
    for (let i = 0; i < 8; i++) {
      const x0 = i * 2.5,
        x1 = x0 + 2.5;
      m.face(
        [
          [x0, 18, 0],
          [x1, 18, 0],
          [x1, 43, 0],
          [x0, 43, 0],
        ],
        i % 2 ? '#c29843' : '#d5af59',
      );
      m.beam([x0, 18, 0], [x0, 16, 0], 0.4, '#dfbc6b');
    }
    m.beam([0, 20, 0.2], [18, 40, 0.2], 0.4, '#f2d18a');
    m.beam([0, 40, 0.2], [18, 20, 0.2], 0.4, '#f2d18a');
  });
  people[4].children.push(
    node(
      'banner-pole',
      mesh('banner-pole', (m) => {
        m.beam([0, -44, 0], [0, 46, 0], 1, '#765631');
        lathe(
          m,
          [
            [46, 0.1],
            [47, 1.6],
            [49, 1.1],
            [51, 0.1],
          ],
          gold,
          12,
        );
      }),
      poleWrist,
    ),
    node(
      'banner-fabric',
      bannerCloth,
      poleWrist,
      [],
      yaw(Math.sin((t * TAU) / 80) * 0.08),
    ),
  );
  const giftPosition =
    h.owner === 'recipient'
      ? add(receiverAt, turn(add(receiverWrist, [0, 1.2, 0]), receiverHeading))
      : add(bearer.point, turn(add(giverWrist, [0, 1.2, 0]), bearer.heading));
  const gift = node('carrier-transferred-gold-coin', coin(), giftPosition);
  gift.scale = h.owner === 'stored' ? [0.001, 0.001, 0.001] : [1, 1, 1];
  return node(
    'gold-carriers-and-people',
    undefined,
    [0, 0, 0],
    [...people, carrying, gift],
  );
}
