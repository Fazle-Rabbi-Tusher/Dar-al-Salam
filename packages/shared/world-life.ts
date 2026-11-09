import { MASTER_LOOP } from './clock';
import type { Point } from './iso';
import type { Facing } from './schema';
import { landField, tileToPlanet } from './planet';

/** All district life reads the existing world tick; no timers or random state. */
export const lifeFrame = (frame: number) =>
  ((frame % MASTER_LOOP) + MASTER_LOOP) % MASTER_LOOP;
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const smooth = (t: number) => t * t * (3 - 2 * t);
const TAU = Math.PI * 2;
export const TRAM_PLATFORM: Point = [-11, 74];
export const TRAM_TERMINALS = [
  [-11, 68],
  [-11, 80],
] as const;
export type TramService =
  | 'boarding'
  | 'doors-closing'
  | 'approaching'
  | 'departing'
  | 'in-service'
  | 'changing-cab';
export type TramState = {
  tile: Point;
  velocity: Point;
  /** Tiles per world tick, capped below the existing 0.25-tile speed rule. */
  speed: number;
  facing: 'NE' | 'SW';
  phase: 'platform' | 'travel' | 'terminal';
  service: TramService;
  doors: number;
  doorsOpen: boolean;
  headlights: boolean;
  brakeLights: boolean;
  bell: boolean;
};
const legs = [
  { from: 24, to: 66, a: 74, b: 68 },
  { from: 78, to: 120, a: 68, b: 74 },
  { from: 144, to: 186, a: 74, b: 80 },
  { from: 198, to: 240, a: 80, b: 74 },
] as const;
/** A two-cab tram visits the centre platform in both directions, brakes to a
 * full stop, boards only at that platform, and changes cab at the terminals. */
export function tramState(frame: number): TramState {
  const f = lifeFrame(frame);
  const leg = legs.find((l) => f >= l.from && f < l.to);
  if (leg) {
    const t = (f - leg.from) / (leg.to - leg.from);
    const dy = ((leg.b - leg.a) * 6 * t * (1 - t)) / (leg.to - leg.from);
    return {
      tile: [-11, leg.a + (leg.b - leg.a) * smooth(t)],
      velocity: [0, dy],
      speed: Math.abs(dy),
      facing: leg.b > leg.a ? 'SW' : 'NE',
      phase: 'travel',
      service: t < 0.22 ? 'departing' : t > 0.72 ? 'approaching' : 'in-service',
      doors: 0,
      doorsOpen: false,
      headlights: true,
      brakeLights: t > 0.5,
      bell: t < 0.08,
    };
  }
  const atPlatform = f < 24 || (f >= 120 && f < 144);
  const local = atPlatform ? f % 120 : f < 78 ? f - 66 : f - 186;
  // Leave a short settling interval, then open, board and close before moving.
  const doors = atPlatform
    ? Math.min(smooth(clamp((local - 2) / 4)), smooth(clamp((24 - local) / 6)))
    : 0;
  const facing = atPlatform
    ? f < 24
      ? 'NE'
      : 'SW'
    : f < 78
      ? local < 6
        ? 'NE'
        : 'SW'
      : local < 6
        ? 'SW'
        : 'NE';
  return {
    tile: [-11, atPlatform ? 74 : f < 78 ? 68 : 80],
    velocity: [0, 0],
    speed: 0,
    facing,
    phase: atPlatform ? 'platform' : 'terminal',
    service: atPlatform
      ? local >= 18
        ? 'doors-closing'
        : 'boarding'
      : 'changing-cab',
    doors,
    doorsOpen: doors > 0.01,
    headlights: true,
    brakeLights: true,
    bell: false,
  };
}

export type SignalState = {
  vehicle: 'green' | 'amber' | 'red';
  pedestrians: 'walk' | 'clearance' | 'wait';
  trafficAllowed: boolean;
  walkAllowed: boolean;
  phaseName:
    | 'traffic'
    | 'traffic-clearing'
    | 'all-red'
    | 'pedestrians'
    | 'pedestrian-clearing';
};
/** City road crossings have explicit all-red clearance on either side of walk.
 * The tram platform lamps are separate and follow tramState().doors/braking. */
export function signalState(frame: number): SignalState {
  // Offset the pedestrian window away from the preserved scooter route, which
  // crosses this junction around frames 138–150. Vehicles are green 72–192.
  const f = lifeFrame(frame + 120);
  if (f < 72 || f >= 192)
    return {
      vehicle: 'green',
      pedestrians: 'wait',
      trafficAllowed: true,
      walkAllowed: false,
      phaseName: 'traffic',
    };
  if (f < 84)
    return {
      vehicle: 'amber',
      pedestrians: 'wait',
      trafficAllowed: false,
      walkAllowed: false,
      phaseName: 'traffic-clearing',
    };
  if (f < 96 || f >= 180)
    return {
      vehicle: 'red',
      pedestrians: 'wait',
      trafficAllowed: false,
      walkAllowed: false,
      phaseName: 'all-red',
    };
  if (f < 156)
    return {
      vehicle: 'red',
      pedestrians: 'walk',
      trafficAllowed: false,
      walkAllowed: true,
      phaseName: 'pedestrians',
    };
  return {
    vehicle: 'red',
    pedestrians: 'clearance',
    trafficAllowed: false,
    walkAllowed: false,
    phaseName: 'pedestrian-clearing',
  };
}

export type ShipRoute = { centre: Point; radius: Point; phase: number };
export const HARBOR_SHIP_ANCHOR: Point = [119.853534544978, 98.8383597954201];
/** The entire hull route stays a tile offshore. Shrink a proposed oval before
 * use rather than clipping the ship to land or letting it jump across a cove. */
export function createShipRoute(
  anchor: Point = HARBOR_SHIP_ANCHOR,
  phase = 0,
): ShipRoute {
  if (landField(tileToPlanet(...anchor), anchor) >= -1)
    throw Error('Ship anchor must be at least one tile offshore');
  let scale = 1;
  for (let attempt = 0; attempt < 14; attempt++) {
    const radius: Point = [3.4 * scale, 1.9 * scale];
    const safe = Array.from({ length: 96 }, (_, i) => {
      const t = (i / 96) * TAU;
      const tile: Point = [
        anchor[0] + Math.cos(t) * radius[0],
        anchor[1] + Math.sin(t) * radius[1],
      ];
      return landField(tileToPlanet(...tile), tile) < -1;
    }).every(Boolean);
    if (safe) return { centre: [...anchor], radius, phase };
    scale *= 0.72;
  }
  throw Error('No safe offshore ship route around this anchor');
}
export type ShipState = {
  tile: Point;
  velocity: Point;
  speed: number;
  heading: number;
  facing: Facing;
  bob: number;
  roll: number;
  wake: number;
  wakeStrength: number;
  sail: number;
  phase: 'sailing';
};
export const HARBOR_SHIP_ROUTE = createShipRoute();
/** Position follows a closed navigable course. Small heave/roll and sail/wake
 * responses share its speed and the same repeating wind, instead of jitter. */
export function shipState(
  frame: number,
  route: ShipRoute = HARBOR_SHIP_ROUTE,
): ShipState {
  const t = (lifeFrame(frame) / MASTER_LOOP) * TAU + route.phase;
  const velocity: Point = [
    (-Math.sin(t) * route.radius[0] * TAU) / MASTER_LOOP,
    (Math.cos(t) * route.radius[1] * TAU) / MASTER_LOOP,
  ];
  const speed = Math.hypot(...velocity);
  const facing: Facing =
    Math.abs(velocity[0]) > Math.abs(velocity[1])
      ? velocity[0] > 0
        ? 'SE'
        : 'NW'
      : velocity[1] > 0
        ? 'SW'
        : 'NE';
  const wakeStrength = clamp(speed / 0.1);
  return {
    tile: [
      route.centre[0] + Math.cos(t) * route.radius[0],
      route.centre[1] + Math.sin(t) * route.radius[1],
    ],
    velocity,
    speed,
    heading: Math.atan2(velocity[1], velocity[0]),
    facing,
    bob: Math.sin(t * 4) * 1.1 + Math.sin(t * 7) * 0.3,
    roll: Math.sin(t * 4 + 0.8) * 0.012,
    wake: wakeStrength,
    wakeStrength,
    sail: 1 + Math.sin(t * 3 + 0.4) * 0.025,
    phase: 'sailing',
  };
}

export function windState(frame: number) {
  const t = (lifeFrame(frame) / MASTER_LOOP) * TAU;
  return {
    x: 0.7 + Math.sin(t) * 0.12,
    y: 0.16 + Math.cos(t) * 0.04,
    gust: 0.6 + Math.sin(t * 2 + 0.4) * 0.24,
    sway: Math.sin(t * 2) * 0.012,
  };
}
export function villageState(frame: number) {
  const f = lifeFrame(frame),
    t = (f / MASTER_LOOP) * TAU;
  return {
    smokePhase: (f % 80) / 80,
    laundrySway: Math.sin(t * 2 + 0.5) * 0.025,
    windowGlow: 0.84 + Math.sin(t * 3) * 0.055,
    wind: windState(f),
  };
}
export function evaluateWorldLife(frame: number) {
  const f = lifeFrame(frame);
  return {
    frame: f,
    tram: tramState(f),
    signals: signalState(f),
    taxi: taxiState(f),
    ship: shipState(f),
    wind: windState(f),
    village: villageState(f),
  };
}

export type TaxiState = {
  tile: Point;
  velocity: Point;
  speed: number;
  facing: Facing;
  phase: 'approaching' | 'waiting' | 'driving' | 'turning' | 'idle';
  brakeLights: boolean;
  headlights: boolean;
  indicator: 'left' | 'right' | 'off';
};
const taxiLegs = [
  { from: 0, to: 36, a: [18, 77.3], b: [23, 77.3], phase: 'approaching' },
  { from: 72, to: 132, a: [23, 77.3], b: [33, 77.3], phase: 'driving' },
  { from: 132, to: 138, a: [33, 77.3], b: [33, 76.4], phase: 'turning' },
  { from: 138, to: 228, a: [33, 76.4], b: [18, 76.4], phase: 'driving' },
  { from: 228, to: 234, a: [18, 76.4], b: [18, 77.3], phase: 'turning' },
] as const;
/** One closed two-lane city route. Its red-light wait ends at the same green
 * as signalState(). The opposing lane avoids the preserved scooter rider;
 * westbound the taxi follows that rider at a lower maximum speed. */
export function taxiState(frame: number): TaxiState {
  const f = lifeFrame(frame);
  const leg = taxiLegs.find((l) => f >= l.from && f < l.to);
  if (!leg)
    return {
      tile: f < 72 ? [23, 77.3] : [18, 77.3],
      velocity: [0, 0],
      speed: 0,
      facing: 'SE',
      phase: f < 72 ? 'waiting' : 'idle',
      brakeLights: true,
      headlights: true,
      indicator: 'off',
    };
  const t = (f - leg.from) / (leg.to - leg.from),
    q = smooth(t);
  const derivative = (6 * t * (1 - t)) / (leg.to - leg.from);
  const dx = leg.b[0] - leg.a[0],
    dy = leg.b[1] - leg.a[1];
  const velocity: Point = [dx * derivative, dy * derivative];
  const facing: Facing =
    Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'SE' : 'NW') : dy > 0 ? 'SW' : 'NE';
  return {
    tile: [leg.a[0] + dx * q, leg.a[1] + dy * q],
    velocity,
    speed: Math.hypot(...velocity),
    facing,
    phase: leg.phase,
    brakeLights:
      t > 0.5 && (leg.phase === 'approaching' || leg.phase === 'turning'),
    headlights: true,
    indicator: leg.phase === 'turning' ? 'left' : 'off',
  };
}
