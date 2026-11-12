/*
 * Where the grand mosque (tools/mosque-hall/grand-mosque.mjs) stands in the
 * world, shared by the tools that render it (tools/prepare-mosque-hall.ts)
 * and fill it with the congregation (tools/prepare-prayer.ts).
 *
 * The hall is 32 × 40 m (X across the qibla wall, −16 to 16; Z from the
 * qibla wall at −2.5 back to 37.5), 12 m high. On this small planet the
 * ground is drawn at 0.4 tiles to the metre (12.8 × 16 tiles, the whole
 * plaza) and heights are stretched so the walls tower over our people.
 */
/** Tile under the model's origin (the imam's place); the hall's centre
 * (X 0, Z 17.5) falls at tile (28.5, 113.5). */
export const HALL: [number, number] = [28.5, 106.5];
/** Tiles per model metre on the ground. */
export const S = 0.4;
/** Vertical stretch of the model (walls ~250 world px, pillars ~200). */
export const KV = 2.65;
/** The tile under a model ground point (X across, Z towards the entrance). */
export const tileOf = (X: number, Z: number): [number, number] => [
  +(HALL[0] + S * X).toFixed(3),
  +(HALL[1] + S * Z).toFixed(3),
];
