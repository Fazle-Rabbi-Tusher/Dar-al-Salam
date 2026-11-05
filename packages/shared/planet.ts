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
  radiusTiles: 44,
  /** Tile point that sits at latitude 0, longitude 0. */
  centre: [50, 30] as Point,
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
 * The rest of the planet, beyond the mapped quarter: grass, lakes and a ring
 * road. Shared by the ground shader and the build (which plants trees), so
 * decorations never stand in water or on the road.
 */
export const WILD = {
  /** Lakes as (latitude, longitude, angular radius), in radians. */
  lakes: [
    [0.35, 2.4, 0.22],
    [-0.55, -2.2, 0.28],
    [0.95, -1.6, 0.18],
    [-0.2, 3.05, 0.16],
  ] as [number, number, number][],
  /** The ring road is the great circle 90° from the quarter's centre. */
  roadHalfWidth: 0.022,
};
/** Angular distance (radians) between two unit vectors. */
export function arc(a: Vec3, b: Vec3) {
  return Math.acos(
    Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])),
  );
}
export function wildAt(p: Vec3): 'lake' | 'shore' | 'road' | 'grass' {
  if (Math.abs(p[2]) < WILD.roadHalfWidth) return 'road';
  for (const [lat, lon, r] of WILD.lakes) {
    const d = arc(p, fromLatLon(lat, lon));
    if (d < r) return 'lake';
    if (d < r + 0.035) return 'shore';
  }
  return 'grass';
}
