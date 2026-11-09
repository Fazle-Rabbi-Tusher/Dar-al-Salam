import type { Point } from './iso';

export type DistrictMood =
  'night-city' | 'rain-street' | 'blossom' | 'coast' | 'day';
export type District = {
  id: Exclude<DistrictMood, 'day'>;
  centre: Point;
  radius: Point;
  zoom: number;
  shape?: 'rectangle';
};
/** Shared by art placement, the renderer and destination navigation. */
export const DISTRICTS: readonly District[] = [
  { id: 'rain-street', centre: [-11, 74], radius: [14, 25], zoom: 2.1 },
  { id: 'blossom', centre: [65, -8], radius: [18, 12], zoom: 1.7 },
  {
    id: 'night-city',
    centre: [30, 77.5],
    radius: [27, 14.5],
    zoom: 1.4,
    shape: 'rectangle',
  },
  { id: 'coast', centre: [109, 100], radius: [22, 25], zoom: 1.3 },
];
export function inDistrict(tile: Point, district: District, padding = 0) {
  const dx =
    Math.abs(tile[0] - district.centre[0]) / (district.radius[0] + padding);
  const dy =
    Math.abs(tile[1] - district.centre[1]) / (district.radius[1] + padding);
  return district.shape === 'rectangle'
    ? Math.max(dx, dy) <= 1
    : dx * dx + dy * dy <= 1;
}
export function districtAt(tile: Point): DistrictMood {
  return DISTRICTS.find((district) => inDistrict(tile, district))?.id ?? 'day';
}
