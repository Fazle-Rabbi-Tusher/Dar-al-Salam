/*
 * Nature pass placements inside the mapped quarter: [type, x, y, z?].
 * Objects are drawn in tools/placeholder/modern.ts (Nature pass section).
 * Trees and rocks on the rest of the planet are planted by the build.
 *
 * Every spot is open grass off all character paths, and no tall piece
 * stands where it would hide someone behind it. Flowers and pebbles are
 * floor art (walkable, baked into the ground).
 */
export const NATURE_OBJECTS: [string, number, number, number?][] = [
  /* ── Bangladesh lawn (x 64–94, y 95–110): a waterfall glade ── */
  // The waterfall stands at the back of the lawn, its pool facing south,
  // with pines and an oak behind it and a flower meadow at its foot.
  ['m-waterfall', 72, 96],
  ['m-oak', 69, 96],
  ['m-pine', 71, 95],
  ['m-birch', 78, 95],
  ['m-pine', 79, 97],
  ['m-tree', 81, 99],
  ['m-rock', 78, 98],
  ['m-bush', 71, 99],
  ['m-bush', 77, 100],
  ['m-flowers', 70, 100],
  ['m-flowers', 72, 100],
  ['m-flowers', 73, 100],
  ['m-rocks-small', 74, 100],
  ['m-flowers', 75, 100],
  ['m-flowers', 76, 100],
  // Trees dotted over the open lawn.
  ['m-cherry', 70, 104],
  ['m-pine', 68, 109],
  ['m-cherry', 83, 104],
  ['m-oak', 86, 106],
  ['m-birch', 93, 105],
  ['m-tree', 91, 108],
  ['m-bush', 88, 109],
  ['m-flowers', 89, 109],
  ['m-flowers', 84, 108],
  ['m-flowers', 85, 108],

  /* ── Park round the fountain (x 24–35, y 24–37) ── */
  ['m-bush', 27, 24],
  ['m-flowers', 26, 25],
  ['m-flowers', 28, 25],
  ['m-bush', 33, 24],
  ['m-flowers', 32, 25],
  ['m-cherry', 27, 36],
  ['m-bush', 25, 34],
  ['m-flowers', 26, 35],
  ['m-flowers', 28, 35],
  ['m-flowers', 26, 37],
  ['m-flowers', 28, 37],

  /* ── Garden (x 39–55, y 41–55) ── */
  ['m-birch', 42, 41],
  ['m-oak', 45, 41],
  ['m-flowers', 40, 41],
  ['m-flowers', 41, 41],
  ['m-flowers', 47, 41],
  ['m-flowers', 48, 41],
  ['m-flowers', 39, 44],
  ['m-flowers', 40, 44],
  ['m-flowers', 41, 44],
  ['m-bush', 50, 45],
  ['m-cherry', 53, 45],
  ['m-pine', 55, 49],
  ['m-pine', 55, 52],
  ['m-tree', 47, 54],
  ['m-flowers', 48, 55],
  ['m-flowers', 49, 55],
  ['m-bush', 50, 55],
  ['m-rock', 42, 55],
  ['m-rocks-small', 43, 54],
];
