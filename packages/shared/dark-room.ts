import { worldFromTile, type Point } from './iso';

/** The approved compound keeps its existing place in the quarter. Geometry,
 * furnishings and camera targets all use this single, uniform transform. */
export const DARK_ROOM = { origin: [21, 103.4] as Point, scale: 0.23 };
export function darkRoomTile(x: number, z: number): Point {
  return [
    DARK_ROOM.origin[0] + z * DARK_ROOM.scale,
    DARK_ROOM.origin[1] - x * DARK_ROOM.scale,
  ];
}
export function darkRoomCamera(x: number, z: number, zoom: number) {
  const [wx, wy] = worldFromTile(...darkRoomTile(x, z));
  return { x: wx, y: wy, zoom };
}
export type DarkRoomView =
  | 'room'
  | 'courtyard'
  | 'site'
  | 'aperture'
  | 'screen'
  | 'bench'
  | 'lectern'
  | 'mirrors'
  | 'tubes'
  | 'astronomy'
  | 'waterclock';
export type DarkRoomOptions = {
  cutaway: boolean;
  sunlight: boolean;
  rays: boolean;
  aperture: number;
  screenDistance: number;
  exposure: number;
  clockHour: number;
};
export type DarkRoomExperiment = {
  kind: 'mirror' | 'tube' | 'astronomy' | 'none';
  mirrorId?: string;
  angle?: number;
  tubeAngle?: number;
  altitude?: number;
  sunAltitude?: number;
};
export const DARK_ROOM_DEFAULTS: DarkRoomOptions = {
  cutaway: true,
  sunlight: true,
  rays: true,
  aperture: 0.35,
  screenDistance: 0.5,
  exposure: 0.78,
  clockHour: 6,
};
