/*
 * City pass placements inside the mapped quarter: [type, x, y, z?].
 * Objects are drawn in tools/placeholder/modern.ts (City pass section).
 *
 * New York (x 4–56, y 63–90). Streets stay clear: rows 63–64, 76–77, 89–90
 * and columns 4–5, 22–23, 40–41, 55–56. Kerbs are rows 62, 65, 75, 78, 88,
 * 91 and columns 3, 6, 21, 24, 39, 42, 54, 57.
 */
type Placement = [string, number, number, number?];

/**
 * A run of utility poles 6 tiles apart. Along a row the wires run along x;
 * along a column the mirrored -side poles carry them along y. The first and
 * last poles close the run so no wire hangs loose.
 */
function poleRun(axis: 'x' | 'y', fixed: number, from: number, count: number) {
  const side = axis === 'y' ? '-side' : '';
  return Array.from({ length: count }, (_, i): Placement => {
    const id =
      i === 0
        ? 'm-utility-pole-start'
        : i === count - 1
          ? 'm-utility-pole-end'
          : 'm-utility-pole';
    const t = from + i * 6;
    return axis === 'x' ? [id + side, t, fixed] : [id + side, fixed, t];
  });
}

export const CITY_OBJECTS: Placement[] = [
  // Downtown skyline (block C at the back, block F in front).
  ['m-tower-tall', 46.8, 66.2],
  ['m-broadcast-tower', 51, 66.6],
  ['m-tower-slim', 50, 79.6],
  // A second slim tower beside the art-deco skyscraper (block A).
  ['m-tower-slim-b', 8, 67],
  // Power lines along the south kerbs of each row of blocks and down the
  // west avenue.
  ...poleRun('x', 75, 8, 8),
  ...poleRun('x', 88, 8, 8),
  ...poleRun('y', 21, 67, 4),
  // Cherry trees along the front sidewalk.
  ['m-street-cherry', 9, 91],
  ['m-street-cherry', 15, 91],
  ['m-street-cherry', 27, 91],
  ['m-street-cherry', 33, 91],
  ['m-street-cherry', 45, 91],
  ['m-street-cherry', 51, 91],
  // Shop houses with awnings, facing the kerbs.
  ['m-awning-shop-c', 11, 73],
  ['m-awning-shop', 13, 73],
  ['m-awning-shop-b', 9, 86],
  ['m-awning-shop-c', 11, 86],
  ['m-awning-shop-b', 48, 86],
  ['m-awning-shop', 50, 86],
  ['m-awning-shop-c', 52, 86],
  // Glowing vending machines on the kerbs.
  ['m-vending', 11, 75],
  ['m-vending', 35, 75],
  ['m-vending', 47, 75],
  ['m-vending', 17, 88],
  ['m-vending-side', 21, 82],
  ['m-vending-side', 54, 70],
  // Warm street lamps on the corners.
  ['m-city-lamp', 6, 75],
  ['m-city-lamp', 42, 75],
  ['m-city-lamp', 24, 88],
  ['m-city-lamp', 54, 88],
];
