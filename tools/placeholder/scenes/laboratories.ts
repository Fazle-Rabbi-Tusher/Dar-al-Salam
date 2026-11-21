import type { Point } from '../../../packages/shared/iso';
// The laboratories' stools (their staff were removed, 2026-11).
const positions: Point[] = [
  [42.7, 12.5],
  [47.7, 12.5],
  [41.8, 17.3],
  [46.8, 17.3],
  [26.1, 12.1],
  [26.1, 16.6],
  [34, 14.6],
];
export const LAB_STOOLS = positions.slice(2).map(([x, y], index) => ({
  type: 'm-lab-stool',
  x: x - (index >= 2 ? 0.75 : 0.3),
  y: y - (index >= 2 ? 0.4 : 0.3),
  footprint: [0.65, 0.65] as Point,
  walkable: false,
  z: 0,
}));
