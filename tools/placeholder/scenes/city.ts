/*
 * City pass placements inside the mapped quarter: [type, x, y, z?].
 * Objects are drawn in tools/placeholder/modern.ts (City pass section).
 *
 * New York (x 4–56, y 63–90). Streets stay clear: rows 63–64, 76–77, 89–90
 * and columns 4–5, 22–23, 40–41, 55–56. Kerbs are rows 62, 65, 75, 78, 88,
 * 91 and columns 3, 6, 21, 24, 39, 42, 54, 57.
 */
type Placement = [string, number, number, number?];

/** Infill uses existing block interiors. Cars occupy inner lanes, leaving the
 * Mamdani scooter loop on y63.5/y76.5 and x22.5/x40.5 unobstructed. */
export const CITY_DENSITY_OBJECTS: Placement[] = [
  ['m-skyscraper-glass', 16.5, 66.2],
  ['m-brick-building', 10.8, 69.5],
  ['m-awning-shop-b', 6.5, 69.6],
  ['m-awning-shop-b', 7, 73.6],
  ['m-awning-shop-c', 15.2, 73.6],
  ['m-awning-shop', 17.3, 73.6],
  ['m-awning-shop-b', 19.4, 69.9],
  ['m-skyscraper-glass', 34.2, 66.2],
  ['m-brick-building-side', 37.3, 68.1],
  ['m-awning-shop-c', 25, 70.2],
  ['m-awning-shop-b', 34.3, 71.3],
  ['m-brick-building', 43, 69.9],
  ['m-brick-building', 49, 70],
  ['m-awning-shop-b', 47.2, 73.5],
  ['m-skyscraper-glass', 6.5, 82],
  ['m-brick-building', 10.8, 82.3],
  ['m-tower-slim-b', 16.5, 82.4],
  ['m-awning-shop', 13.2, 84.6],
  ['m-awning-shop-b', 15.3, 86.2],
  ['m-awning-shop-c', 17.4, 86.2],
  ['m-awning-shop', 19.5, 83.8],
  ['m-skyscraper-glass', 46.5, 79],
  ['m-brick-building', 42.7, 82.2],
  ['m-skyscraper-glass', 48.2, 82.5],
  ['m-tower-slim-b', 52, 82.6],
  ['m-awning-shop-c', 46, 85.1],
  // Red, blue, silver, charcoal and ochre cars, with occasional roof-lit taxis.
  ...[11.5, 16.5, 26, 31, 36, 48.5, 52].map((x): Placement => [
    'm-taxi',
    x,
    64,
  ]),
  ...[8, 12, 17, 26, 30.5, 35.5, 43, 51.5].map((x): Placement => [
    'm-taxi',
    x,
    77,
  ]),
  ...[6.5, 14, 18, 26, 34, 43, 48, 52].map((x): Placement => ['m-taxi', x, 90]),
  ...[66.6, 71, 83.5, 87].map((y): Placement => ['m-taxi-side', 4, y]),
  ...[67, 71.5].map((y): Placement => ['m-taxi-side', 23, y]),
  ...[67, 72, 80, 85].map((y): Placement => ['m-taxi-side', 41, y]),
  ...[73, 80, 84.5, 88].map((y): Placement => ['m-taxi-side', 56, y]),
  // Paired traffic signals stand on pavement at the avenue intersections.
  ...[6, 24, 42, 54].flatMap((x): Placement[] => [
    ['m-traffic-signal', x, 65.2],
    ['m-traffic-signal', x, 78.2],
    ['m-traffic-signal-side', x === 24 ? 25.3 : x === 54 ? 53.5 : x, 88.2],
  ]),
];

/** Painted details are walkable; they never become collision obstacles. */
export const CITY_ROAD_DETAILS: Placement[] = [
  ...[63.94, 76.94, 89.94].flatMap((y) =>
    [9, 13, 17, 27, 31, 35, 45, 49, 52].map((x): Placement => [
      'm-road-dashes',
      x,
      y,
    ]),
  ),
  ...[4.94, 22.94, 40.94, 55.94].flatMap((x) =>
    [67, 71, 80, 84].map((y): Placement => ['m-road-dashes-side', x, y]),
  ),
  ['m-crosswalk', 24.5, 63],
  ['m-crosswalk', 42, 63],
  ['m-crosswalk', 6, 76],
  ['m-crosswalk', 42, 76],
  ['m-crosswalk', 6, 89],
  ['m-crosswalk', 24.5, 89],
];

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
  ...CITY_DENSITY_OBJECTS,
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
