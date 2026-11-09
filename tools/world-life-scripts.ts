import fs from 'node:fs';
import {
  RAIL,
  WILD,
  landField,
  massawaDryness,
  tileToPlanet,
} from '../packages/shared/planet';
import { STATIONS } from '../packages/shared/world-life';
import type { Point } from '../packages/shared/iso';

/*
 * Writes content/ambient/world-life.json: the train, taxis and ships, each
 * a deterministic script on the 240-frame (20 s) loop.
 *
 *   node --import tsx tools/world-life-scripts.ts
 *
 * - Train: waits at a station with its doors open, closes them, speeds up,
 *   runs, slows and stops at the other station, then returns.
 * - Taxis: drive the ring road's west stretch in the right-hand lane, wait
 *   at the end, turn round and drive back in the other lane; two taxis run
 *   half a loop apart so they meet in opposite lanes.
 * - Ships: sail slow loops on open water (checked: every point of every
 *   route is at least a few tiles out to sea).
 */
const LOOP = 240;
type Step = Record<string, unknown>;
const look = (base: string, colour = 'khaki') => ({
  base,
  garment: 'none',
  headwear: 'none',
  prop: 'none',
  colours: {
    skin: 'skin-5',
    hair: 'hair-brown',
    garmentPrimary: colour,
    garmentSecondary: 'wool-cream',
    headwear: 'white-linen',
    prop: 'madder-red',
  },
});
const character = (id: string, base: string, role: string, script: Step[]) => ({
  id,
  kind: 'vehicle',
  aliases: [],
  district: 'mosque-garden',
  depiction: 'full',
  look: look(base),
  loop: LOOP,
  script,
  role,
});
const lerp = (a: Point, b: Point, t: number): Point => [
  +(a[0] + (b[0] - a[0]) * t).toFixed(2),
  +(a[1] + (b[1] - a[1]) * t).toFixed(2),
];
/** Steps covering `from`…`to` frames that ease in and out along a–b. */
function eased(a: Point, b: Point, from: number, to: number): Step[] {
  // Fractions of the distance for each quarter of the time: slow, fast, fast, slow.
  const marks = [0, 0.08, 0.5, 0.92, 1],
    times = [0, 0.22, 0.5, 0.78, 1];
  const out: Step[] = [];
  for (let i = 0; i < 4; i++) {
    const f0 = Math.round(from + (to - from) * times[i]),
      f1 = Math.round(from + (to - from) * times[i + 1]);
    out.push({
      from: f0,
      to: f1,
      action: 'vehicle_drive',
      path: [lerp(a, b, marks[i]), lerp(a, b, marks[i + 1])],
    });
  }
  return out;
}
const at = (
  from: number,
  to: number,
  action: string,
  tile: Point,
  facing: string,
) => ({
  from,
  to,
  action,
  at: tile,
  facing,
});
/* ── Train ── */
const [A, B] = STATIONS;
const train = character(
  'amb-world-train',
  'tram',
  'A train between the stations',
  [
    at(0, 36, 'vehicle_stop', A, 'NW'),
    ...eased(A, B, 36, 120),
    at(120, 156, 'vehicle_stop', B, 'SE'),
    ...eased(B, A, 156, 240),
  ],
);
/* ── Taxis on the ring road's west stretch ── */
function roadCentre(y: number): Point {
  // The ring road is the planet's equator (p.z = 0): find where it crosses
  // this row of tiles, west of the quarter.
  let best: Point = [0, y],
    bestZ = Infinity;
  for (let x = -70; x <= -20; x += 0.02) {
    const z = Math.abs(tileToPlanet(x, y)[2]);
    if (z < bestZ) {
      bestZ = z;
      best = [+x.toFixed(2), y];
    }
  }
  return best;
}
const centre: Point[] = [];
for (let y = -4; y <= 50; y += 3) centre.push(roadCentre(y));
for (const p of centre)
  if (massawaDryness(tileToPlanet(...p), p) > 0)
    throw Error(`road at ${p} is in the desert`);
/** The lane `side` tiles to the right of travel along the centreline. */
function lane(points: Point[], side: number): Point[] {
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)],
      b = points[Math.min(points.length - 1, i + 1)],
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      len = Math.hypot(dx, dy) || 1;
    // Right of the heading in tile space (+x right-down, +y left-down).
    return [
      +(p[0] - (dy / len) * side).toFixed(2),
      +(p[1] + (dx / len) * side).toFixed(2),
    ];
  });
}
const south = lane(centre, 0.55),
  north = lane([...centre].reverse(), 0.55);
const taxiScript = (start: number): Step[] => {
  // Drive south, wait, turn round across the road, drive north, wait,
  // turn round again.
  const plan: [number, string, Point[] | Point, string?][] = [
    [96, 'vehicle_drive', south],
    [12, 'vehicle_stop', south[south.length - 1], 'SW'],
    [12, 'vehicle_drive', [south[south.length - 1], north[0]]],
    [96, 'vehicle_drive', north],
    [12, 'vehicle_stop', north[north.length - 1], 'NE'],
    [12, 'vehicle_drive', [north[north.length - 1], south[0]]],
  ];
  let t = 0;
  const steps: Step[] = [];
  for (const [d, action, where, facing] of plan) {
    steps.push(
      typeof where[0] === 'number'
        ? at(t, t + d, action, where as Point, facing!)
        : { from: t, to: t + d, action, path: where },
    );
    t += d;
  }
  // Shift the whole loop so this taxi starts `start` frames in.
  if (!start) return steps;
  const out: Step[] = [];
  for (const s of steps) {
    const f = ((s.from as number) + LOOP - start) % LOOP,
      e = f + ((s.to as number) - (s.from as number));
    if (e <= LOOP) out.push({ ...s, from: f, to: e });
    else if ('path' in s) {
      // Split a moving step that wraps round the loop's end.
      const path = s.path as Point[],
        k = (LOOP - f) / (e - f);
      const mid = lerp(path[0], path[path.length - 1], k);
      out.push({ ...s, from: f, to: LOOP, path: [path[0], mid] });
      out.push({
        ...s,
        from: 0,
        to: e - LOOP,
        path: [mid, path[path.length - 1]],
      });
    } else {
      out.push({ ...s, from: f, to: LOOP });
      out.push({ ...s, from: 0, to: e - LOOP });
    }
  }
  return out.sort((a, b) => (a.from as number) - (b.from as number));
};
const taxis = [0, 120].map((start, i) =>
  character(
    `amb-world-taxi-${i}`,
    'taxi',
    'A taxi on the ring road',
    taxiScript(start),
  ),
);
/* ── Ships ── */
function sea(p: Point) {
  return landField(tileToPlanet(...p), p) < -WILD.shallows - 1;
}
function oval(c: Point, rx: number, ry: number, n = 12): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([
      +(c[0] + Math.cos(a) * rx).toFixed(2),
      +(c[1] + Math.sin(a) * ry).toFixed(2),
    ]);
  }
  return pts;
}
const routes: [string, Point, number, number][] = [
  // The strait east of the quarter.
  ['amb-world-ship-strait', [124, 80], 2.5, 14],
  // Open sea west of the ring road.
  ['amb-world-ship-west', [-82, 0], 6, 16],
  // Open sea south of the Bangladesh block.
  ['amb-world-ship-south', [55, 165], 16, 5],
];
const ships = routes.map(([id, c, rx, ry]) => {
  const path = oval(c, rx, ry);
  for (let i = 0; i < path.length - 1; i++)
    for (let k = 0; k <= 10; k++) {
      const p = lerp(path[i], path[i + 1], k / 10);
      if (!sea(p)) throw Error(`${id}: not open water at ${p}`);
    }
  return character(id, 'ship', 'A sailing ship', [
    { from: 0, to: LOOP, action: 'vehicle_sail', path },
  ]);
});
void RAIL;
fs.writeFileSync(
  'content/ambient/world-life.json',
  JSON.stringify([train, ...taxis, ...ships], null, 2) + '\n',
);
console.log('road', centre[0], '→', centre[centre.length - 1]);
