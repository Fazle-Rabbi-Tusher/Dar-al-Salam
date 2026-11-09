import type { Facing } from './schema';
import { tileFromWorld, worldFromTile, type Point } from './iso';

/*
 * The world is a small planet. Tile space (the room map, scripts and
 * collision) is wrapped onto a sphere with an azimuthal equidistant
 * projection centred on the quarter, so distances from the centre are kept
 * and paths stay continuous. The camera always keeps planet north up and
 * looks at the focus point from 30° above its horizon — the same angle as the
 * isometric art — so sprites read correctly wherever they are on the globe.
 */
export type Vec3 = [number, number, number];
/** Length of one tile side on the ground, in world px (32 px iso diamond). */
export const TILE_SIDE = 32 / Math.SQRT2;
export const PLANET = {
  /** Planet radius in tiles: small enough to curve, large enough not to squash the map. */
  radiusTiles: 64,
  /** Tile point that sits at latitude 0, longitude 0 (the middle of the 96×124 map). */
  centre: [48, 62] as Point,
  /** Angle between the focus point's normal and the view direction (60° = iso). */
  pitch: (60 * Math.PI) / 180,
  /** Billboards lean toward screen-up by this much of their camera-facing part. */
  lean: 0.5,
};
export const RADIUS_PX = PLANET.radiusTiles * TILE_SIDE;

/** Tile coordinates → unit vector on the planet (x east, y north, z out at the centre). */
export function tileToPlanet(tx: number, ty: number): Vec3 {
  const dx = tx - PLANET.centre[0],
    dy = ty - PLANET.centre[1];
  const east = (dx - dy) / Math.SQRT2,
    north = -(dx + dy) / Math.SQRT2;
  const d = Math.hypot(east, north);
  if (d < 1e-9) return [0, 0, 1];
  const theta = d / PLANET.radiusTiles,
    s = Math.sin(theta) / d;
  return [east * s, north * s, Math.cos(theta)];
}
/** Unit vector on the planet → tile coordinates (the inverse of tileToPlanet). */
export function planetToTile(p: Vec3): Point {
  const theta = Math.acos(Math.max(-1, Math.min(1, p[2]))),
    s = Math.hypot(p[0], p[1]);
  if (s < 1e-9) return [...PLANET.centre];
  const k = (theta * PLANET.radiusTiles) / s,
    east = p[0] * k,
    north = p[1] * k;
  return [
    PLANET.centre[0] + (east - north) / Math.SQRT2,
    PLANET.centre[1] + (-east - north) / Math.SQRT2,
  ];
}
export function latLon(p: Vec3): { lat: number; lon: number } {
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, p[1]))),
    lon: Math.atan2(p[0], p[2]),
  };
}
export function fromLatLon(lat: number, lon: number): Vec3 {
  return [
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  ];
}

/** Rotation taking planet space to camera space (x right, y up, z toward the viewer). */
export function cameraMatrix(lat: number, lon: number, pitch = PLANET.pitch) {
  const a = lat - pitch,
    ca = Math.cos(a),
    sa = Math.sin(a),
    cb = Math.cos(-lon),
    sb = Math.sin(-lon);
  // Rx(a) · Ry(b), row-major.
  return [cb, 0, sb, sa * sb, ca, -sa * cb, -ca * sb, sa, ca * cb] as const;
}
export type Matrix = ReturnType<typeof cameraMatrix>;
export function apply(m: Matrix, p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
    m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
    m[6] * p[0] + m[7] * p[1] + m[8] * p[2],
  ];
}
export function applyInverse(m: Matrix, p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[3] * p[1] + m[6] * p[2],
    m[1] * p[0] + m[4] * p[1] + m[7] * p[2],
    m[2] * p[0] + m[5] * p[1] + m[8] * p[2],
  ];
}

export type View = {
  lat: number;
  lon: number;
  zoom: number;
  width: number;
  height: number;
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Zoom at which the whole planet fits the viewport. */
export function fitZoom(width: number, height: number) {
  return (0.86 * Math.min(width, height)) / (2 * RADIUS_PX);
}
/** Screen geometry for a view: matrix, radius and planet centre in px. */
export function frame(view: View) {
  const radius = RADIUS_PX * view.zoom,
    fit = fitZoom(view.width, view.height),
    // Zoomed out the whole disc is centred; zoomed in the focus point is.
    k = smooth(fit * 1.05, fit * 2.6, view.zoom);
  return {
    matrix: cameraMatrix(view.lat, view.lon),
    radius,
    cx: view.width / 2,
    cy: view.height / 2 + radius * Math.sin(PLANET.pitch) * k,
  };
}
export type Frame = ReturnType<typeof frame>;
export type Projected = {
  x: number;
  y: number;
  /** Camera-space z of the ground point: larger is nearer the viewer. */
  depth: number;
  /** Screen rotation (radians, clockwise) that stands a billboard on the surface. */
  rotation: number;
  normal: Vec3;
};
/** Project a planet point (lifted `lift` world px along its normal) to the screen. */
export function project(f: Frame, p: Vec3, lift = 0): Projected {
  const n = apply(f.matrix, p),
    r = f.radius * (1 + lift / RADIUS_PX);
  let rotation = Math.atan2(n[0], n[1] + PLANET.lean * n[2]);
  if (Math.abs(rotation) < 0.012) rotation = 0;
  return {
    x: f.cx + n[0] * r,
    y: f.cy - n[1] * r,
    depth: n[2] + n[0] * 1e-4,
    rotation,
    normal: n,
  };
}
export function projectTile(f: Frame, tile: Point, lift = 0) {
  return project(f, tileToPlanet(...tile), lift);
}
/** Screen px → planet point under it, or null off the disc. */
export function unproject(f: Frame, x: number, y: number): Vec3 | null {
  const nx = (x - f.cx) / f.radius,
    ny = -(y - f.cy) / f.radius,
    q = 1 - nx * nx - ny * ny;
  if (q < 0) return null;
  return applyInverse(f.matrix, [nx, ny, Math.sqrt(q)]);
}

/** Tile-space direction for each baked facing (matches the isometric art). */
export const FACING_DIRECTION: Record<Facing, Point> = {
  SE: [1, 0],
  SW: [0, 1],
  NW: [-1, 0],
  NE: [0, -1],
};
/**
 * Choose which baked facing to show for a character walking/looking along a
 * tile-space direction, as seen from the current camera. Characters with a
 * `back` depiction are only ever shown from behind.
 */
export function screenFacing(
  f: Frame,
  tile: Point,
  direction: Point,
  rotation: number,
  backOnly = false,
): Facing {
  const p = tileToPlanet(...tile),
    len = Math.hypot(...direction) || 1,
    e = 0.05 / len,
    q = tileToPlanet(tile[0] + direction[0] * e, tile[1] + direction[1] * e);
  const t = apply(f.matrix, [q[0] - p[0], q[1] - p[1], q[2] - p[2]]);
  const right = t[0] * Math.cos(rotation) - t[1] * Math.sin(rotation);
  const front = t[2] > 0 && !backOnly;
  return front ? (right > 0 ? 'SE' : 'SW') : right > 0 ? 'NE' : 'NW';
}

/** Camera focus in iso world px (URL / minimap form) ↔ latitude and longitude. */
export function focusFromWorld(x: number, y: number) {
  return latLon(tileToPlanet(...tileFromWorld(x, y)));
}
export function worldFromFocus(lat: number, lon: number): Point {
  return worldFromTile(...planetToTile(fromLatLon(lat, lon)));
}

/*
 * The rest of the planet, beyond the mapped quarter: a peaceful landscape of
 * meadows, forests and rocky hills, sandy beaches and the open sea, with a
 * few islands on the far side and the old ring road where it crosses land.
 * Everything is a deterministic function of the planet point (sums of sine
 * waves), shared by the ground shader (WILD_GLSL, compiled from the same
 * constants) and the build, which plants trees, rocks, waterfalls and ships
 * only where the biome allows, so nothing ever stands in the water.
 */
type Wave = [number, number, number, number, number, number];
const wave = (
  ax: number,
  ay: number,
  az: number,
  freq: number,
  phase: number,
  amp = 1,
): Wave => {
  const l = Math.hypot(ax, ay, az);
  return [ax / l, ay / l, az / l, freq, phase, amp];
};
export const WILD = {
  /** The mapped quarter's size in tiles (must match the room). */
  map: [96, 124] as Point,
  /** The ring road is the great circle 90° from the quarter's centre. */
  roadHalfWidth: 0.022,
  coast: {
    /** Shore distance (tiles beyond the map's edge) on the near, seaward side. */
    near: 15,
    /** …and across the mainland (forests and hills), opposite it. */
    far: 60,
    /** The sea never comes closer than this to the map (tiles). */
    minimum: 12,
    /**
     * Azimuth (radians, east = 0, north = π/2) of the mainland's middle.
     * The camera looks north, so the forests rise on the northern horizon
     * and the sea opens out to the south and the sides, where it is seen.
     */
    mainland: 1.57,
    /** How far coves and headlands push the shore in or out (tiles). */
    coves: 7,
  },
  /** Land field bands (tiles): sand up to `beach`, turquoise to `shallows`. */
  beach: 2.6,
  shallows: 4.5,
  waves: {
    coves: [
      wave(0.3, 0.9, 0.2, 13, 0.4),
      wave(-0.8, 0.4, 0.4, 19, 1.9, 0.6),
      wave(0.5, -0.6, 0.6, 29, 4.1, 0.4),
      wave(-0.2, -0.3, 0.9, 41, 2.6, 0.25),
    ],
    islands: [
      wave(0.6, 0.2, -0.8, 5.3, 0.9),
      wave(-0.4, 0.7, -0.6, 8.9, 2.2, 0.7),
      wave(0.2, -0.9, -0.4, 13.7, 5.0, 0.45),
      wave(-0.7, -0.2, 0.7, 21.1, 3.3, 0.3),
    ],
    forest: [
      wave(0.7, 0.6, 0.4, 9.7, 1.1),
      wave(-0.5, 0.2, 0.8, 15.3, 3.7, 0.7),
      wave(0.1, -0.8, 0.6, 23.9, 0.2, 0.45),
      wave(0.9, -0.3, -0.3, 37.1, 4.4, 0.3),
    ],
    rock: [
      wave(-0.6, -0.7, 0.4, 7.1, 2.9),
      wave(0.8, -0.1, 0.6, 12.9, 0.7, 0.6),
      wave(0.2, 0.9, -0.4, 19.7, 5.3, 0.4),
      wave(-0.3, 0.4, 0.9, 31.3, 1.4, 0.25),
    ],
  },
  /** Inland biome thresholds on the forest and rock fields ([-1, 1]). */
  forestAbove: -0.12,
  rockAbove: 0.32,
  /** Islands rise where the island field exceeds this, far from the coast. */
  islandAbove: 0.52,
};
/*
 * Old Massawa (Red Sea port, the Mosque of the Companions): an island town
 * about 30 tiles south of the quarter, a coral-stone causeway to the
 * mainland, on a dry coast of sand and thorn scrub. Tile coordinates, outside
 * the mapped rooms. Nothing here is a room: its art is planted by the build.
 */
export const MASSAWA = {
  island: { centre: [72, 157] as Point, radius: 8.5 },
  causeway: {
    from: [69.5, 150] as Point,
    to: [69.5, 139] as Point,
    halfWidth: 0.75,
  },
  /**
   * The dry Red Sea coast: sand desert in the middle, thorn scrub round it,
   * fading back to meadow before the mapped quarter.
   */
  arid: { centre: [66, 140] as Point, radius: 34, desert: 14, fromMap: 2 },
  /** Limestone flagstones round the Mosque of the Companions on the island. */
  plaza: { centre: [75.5, 157] as Point, radius: 3.6 },
  /** The ring road is not drawn within this disc (tiles). */
  calm: { centre: [70, 150] as Point, radius: 17 },
};
function segmentDistance(t: Point, a: Point, b: Point) {
  const vx = b[0] - a[0],
    vy = b[1] - a[1],
    k = Math.max(
      0,
      Math.min(
        1,
        ((t[0] - a[0]) * vx + (t[1] - a[1]) * vy) / (vx * vx + vy * vy),
      ),
    );
  return Math.hypot(t[0] - a[0] - vx * k, t[1] - a[1] - vy * k);
}
export const massawaIsland = (tile: Point) =>
  Math.hypot(
    tile[0] - MASSAWA.island.centre[0],
    tile[1] - MASSAWA.island.centre[1],
  );
export const causewayDistance = (tile: Point) =>
  segmentDistance(tile, MASSAWA.causeway.from, MASSAWA.causeway.to);
/**
 * How deep into Massawa's dry coast a point is (tiles): above
 * `arid.desert` is sand desert, above 0 thorn scrub, below 0 green land.
 */
export const massawaAridness = (p: Vec3, tile: Point) => {
  const a = MASSAWA.arid;
  return (
    Math.min(
      a.radius - Math.hypot(tile[0] - a.centre[0], tile[1] - a.centre[1]),
      (mapDistance(tile) - a.fromMap) * 2,
    ) +
    waveField(p, WILD.waves.coves) * 3
  );
};
export const inFlats = (p: Vec3, tile: Point) =>
  massawaAridness(p, tile) > MASSAWA.arid.desert;
export const inPlaza = (tile: Point) =>
  Math.hypot(
    tile[0] - MASSAWA.plaza.centre[0],
    tile[1] - MASSAWA.plaza.centre[1],
  ) < MASSAWA.plaza.radius;
const inCalm = (tile: Point) =>
  Math.hypot(
    tile[0] - MASSAWA.calm.centre[0],
    tile[1] - MASSAWA.calm.centre[1],
  ) < MASSAWA.calm.radius;
export type Biome =
  | 'sea'
  | 'shallows'
  | 'beach'
  | 'meadow'
  | 'forest'
  | 'rock'
  | 'road'
  | 'desert'
  | 'scrub'
  | 'plaza'
  | 'causeway';
/** A smooth field in [-1, 1]: a weighted sum of sine waves over the sphere. */
export function waveField(p: Vec3, waves: Wave[]) {
  let sum = 0,
    weight = 0;
  for (const [ax, ay, az, f, ph, amp] of waves) {
    sum += amp * Math.sin((p[0] * ax + p[1] * ay + p[2] * az) * f + ph);
    weight += amp;
  }
  return sum / weight;
}
/** Distance in tiles from a tile point to the mapped rectangle (0 inside). */
export function mapDistance(tile: Point) {
  const [w, h] = WILD.map,
    dx = Math.max(0, -tile[0], tile[0] - w),
    dy = Math.max(0, -tile[1], tile[1] - h);
  return Math.hypot(dx, dy);
}
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Shore distance (tiles beyond the map) in the direction of p. */
export function shoreDistance(p: Vec3) {
  const c = WILD.coast,
    toward = 0.5 + 0.5 * Math.cos(Math.atan2(p[1], p[0]) - c.mainland),
    r = c.near + (c.far - c.near) * smoothstep(0.15, 0.85, toward);
  return Math.max(c.minimum, r + c.coves * waveField(p, WILD.waves.coves));
}
/**
 * Signed land field in tiles: positive inland (how far from the water),
 * negative offshore (how far out to sea).
 */
export function landField(p: Vec3, tile: Point = planetToTile(p)) {
  const d = mapDistance(tile),
    coast = shoreDistance(p) - d,
    island =
      d > shoreDistance(p) + 12
        ? (waveField(p, WILD.waves.islands) - WILD.islandAbove) * 70
        : -Infinity;
  // Massawa: the island and its causeway.
  const town =
      MASSAWA.island.radius -
      massawaIsland(tile) +
      waveField(p, WILD.waves.coves) * 1.2,
    causeway = (MASSAWA.causeway.halfWidth - causewayDistance(tile)) * 2.4;
  return Math.max(coast, island, town, causeway);
}
export function wildAt(p: Vec3, tile: Point = planetToTile(p)): Biome {
  const land = landField(p, tile);
  if (land < -WILD.shallows) return 'sea';
  if (land < 0) return 'shallows';
  if (
    causewayDistance(tile) <= MASSAWA.causeway.halfWidth &&
    massawaIsland(tile) > MASSAWA.island.radius - 1.5
  )
    return 'causeway';
  if (massawaIsland(tile) < MASSAWA.island.radius + 1.2) {
    if (land < 1) return 'beach';
    return inPlaza(tile) ? 'plaza' : 'desert';
  }
  const arid = massawaAridness(p, tile);
  if (arid > MASSAWA.arid.desert && land >= WILD.beach) return 'desert';
  if (Math.abs(p[2]) < WILD.roadHalfWidth && land > 0.5 && !inCalm(tile))
    return 'road';
  if (land < WILD.beach) return 'beach';
  const d = mapDistance(tile);
  if (land > 10 && d > 6 && waveField(p, WILD.waves.rock) > WILD.rockAbove)
    return 'rock';
  if (arid > 0) return 'scrub';
  if (d > 4 && waveField(p, WILD.waves.forest) > WILD.forestAbove)
    return 'forest';
  return 'meadow';
}
/** Angular distance (radians) between two unit vectors. */
export function arc(a: Vec3, b: Vec3) {
  return Math.acos(
    Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])),
  );
}

/* GLSL twins of the fields above, compiled from the same constants. */
const g = (n: number) => n.toFixed(6);
const glslField = (name: string, waves: Wave[]) => {
  const weight = waves.reduce((n, w) => n + w[5], 0);
  return `float ${name}(vec3 p) {
  return (${waves
    .map(
      ([ax, ay, az, f, ph, amp]) =>
        `${g(amp)} * sin(dot(p, vec3(${g(ax)}, ${g(ay)}, ${g(az)})) * ${g(f)} + ${g(ph)})`,
    )
    .join(' +\n    ')}) / ${g(weight)};
}`;
};
export const WILD_GLSL = `
${glslField('coveField', WILD.waves.coves)}
${glslField('islandField', WILD.waves.islands)}
${glslField('forestField', WILD.waves.forest)}
${glslField('rockField', WILD.waves.rock)}
float mapDistance(vec2 tile) {
  vec2 o = max(vec2(0.0), max(-tile, tile - vec2(${g(WILD.map[0])}, ${g(WILD.map[1])})));
  return length(o);
}
float shoreDistance(vec3 p) {
  float toward = 0.5 + 0.5 * cos(atan(p.y, p.x) - (${g(WILD.coast.mainland)}));
  float r = ${g(WILD.coast.near)} + ${g(WILD.coast.far - WILD.coast.near)} * smoothstep(0.15, 0.85, toward);
  return max(${g(WILD.coast.minimum)}, r + ${g(WILD.coast.coves)} * coveField(p));
}
const vec2 MASSAWA_ISLAND = vec2(${g(MASSAWA.island.centre[0])}, ${g(MASSAWA.island.centre[1])});
const vec2 CAUSEWAY_A = vec2(${g(MASSAWA.causeway.from[0])}, ${g(MASSAWA.causeway.from[1])});
const vec2 CAUSEWAY_B = vec2(${g(MASSAWA.causeway.to[0])}, ${g(MASSAWA.causeway.to[1])});
const vec2 CALM = vec2(${g(MASSAWA.calm.centre[0])}, ${g(MASSAWA.calm.centre[1])});
float massawaIsland(vec2 tile) { return length(tile - MASSAWA_ISLAND); }
float causewayDistance(vec2 tile) {
  vec2 v = CAUSEWAY_B - CAUSEWAY_A;
  float k = clamp(dot(tile - CAUSEWAY_A, v) / dot(v, v), 0.0, 1.0);
  return length(tile - CAUSEWAY_A - v * k);
}
const vec2 ARID_CENTRE = vec2(${g(MASSAWA.arid.centre[0])}, ${g(MASSAWA.arid.centre[1])});
const vec2 PLAZA_CENTRE = vec2(${g(MASSAWA.plaza.centre[0])}, ${g(MASSAWA.plaza.centre[1])});
float massawaAridness(vec3 p, vec2 tile) {
  return min(${g(MASSAWA.arid.radius)} - length(tile - ARID_CENTRE),
      (mapDistance(tile) - ${g(MASSAWA.arid.fromMap)}) * 2.0) +
    coveField(p) * 3.0;
}
bool inFlats(vec3 p, vec2 tile) {
  return massawaAridness(p, tile) > ${g(MASSAWA.arid.desert)};
}
bool inPlaza(vec2 tile) { return length(tile - PLAZA_CENTRE) < ${g(MASSAWA.plaza.radius)}; }
bool inCalm(vec2 tile) { return length(tile - CALM) < ${g(MASSAWA.calm.radius)}; }
float landField(vec3 p, vec2 tile) {
  float d = mapDistance(tile), shore = shoreDistance(p);
  float land = shore - d;
  if (d > shore + 12.0) land = max(land, (islandField(p) - ${g(WILD.islandAbove)}) * 70.0);
  land = max(land, ${g(MASSAWA.island.radius)} - massawaIsland(tile) + coveField(p) * 1.2);
  land = max(land, (${g(MASSAWA.causeway.halfWidth)} - causewayDistance(tile)) * 2.4);
  return land;
}`;

/** A planted decoration on the wild planet (the build chooses the art). */
export type Planting = {
  kind:
    | 'forest-tree'
    | 'meadow-tree'
    | 'bush'
    | 'palm'
    | 'beach-rock'
    | 'boulder'
    | 'waterfall'
    | 'ship'
    | 'acacia'
    | 'doum-palm';
  p: Vec3;
  tile: Point;
  /** Deterministic per-planting value in [0, 1) for choosing art. */
  pick: number;
};
const fract = (x: number) => x - Math.floor(x);
const hash1 = (i: number, k: number) =>
  fract(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
/**
 * Where to plant trees, rocks, waterfalls and ships: a dense Fibonacci
 * lattice over the sphere, thinned per biome. Pure and deterministic.
 */
export function wildPlantings(count = 16000): Planting[] {
  const out: Planting[] = [],
    golden = Math.PI * (3 - Math.sqrt(5));
  const rockSpots: Planting[] = [],
    seaSpots: Planting[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2,
      r = Math.sqrt(1 - y * y),
      a = golden * i,
      j = 0.6 / Math.sqrt(count);
    const q: Vec3 = [
        Math.cos(a) * r + (hash1(i, 1) - 0.5) * j,
        y + (hash1(i, 2) - 0.5) * j,
        Math.sin(a) * r + (hash1(i, 3) - 0.5) * j,
      ],
      ql = Math.hypot(...q),
      p: Vec3 = [q[0] / ql, q[1] / ql, q[2] / ql];
    // The poles pinch the camera; keep them clear.
    if (Math.abs(p[1]) > 0.93) continue;
    const tile = planetToTile(p),
      d = mapDistance(tile);
    if (d < 2) continue;
    const land = landField(p, tile),
      biome = wildAt(p, tile),
      roll = hash1(i, 4),
      pick = hash1(i, 5),
      at = (kind: Planting['kind']) => out.push({ kind, p, tile, pick });
    if (biome === 'forest' && land > 3.4) {
      if (roll < 0.86) at('forest-tree');
      else if (roll < 0.94) at('bush');
    } else if (biome === 'meadow' && land > 3.4) {
      if (roll < 0.1) at('meadow-tree');
      else if (roll < 0.17) at('bush');
    } else if (biome === 'beach') {
      if (land > 0.8 && land < 2.3 && roll < 0.45) at('palm');
      else if (land > 0.25 && land < 1.4 && roll > 0.9) at('beach-rock');
    } else if (biome === 'rock' && land > 11) {
      if (roll < 0.28) at('boulder');
      else if (roll > 0.95)
        rockSpots.push({ kind: 'waterfall', p, tile, pick });
    } else if (biome === 'scrub') {
      // Thorn scrub: a few flat-topped acacias and doum palms.
      if (roll < 0.13) at('acacia');
      else if (roll < 0.19) at('doum-palm');
    } else if (biome === 'sea' && land < -7 && land > -13 && roll > 0.97)
      seaSpots.push({ kind: 'ship', p, tile, pick });
  }
  // A few waterfalls and ships, spread apart, nearest to the quarter first.
  const spread = (spots: Planting[], n: number, gap: number) => {
    spots.sort((a, b) => mapDistance(a.tile) - mapDistance(b.tile));
    const chosen: Planting[] = [];
    for (const s of spots)
      if (chosen.length < n && chosen.every((c) => arc(c.p, s.p) > gap))
        chosen.push(s);
    return chosen;
  };
  out.push(...spread(rockSpots, 4, 0.3), ...spread(seaSpots, 3, 0.45));
  return out;
}
