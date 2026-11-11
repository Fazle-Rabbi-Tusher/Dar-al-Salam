/*
 * Where the grand mosque (tools/mosque-hall/grand-mosque.mjs) stands in the
 * world, shared by the tools that render it (tools/prepare-mosque-hall.ts)
 * and fill it with the congregation (tools/prepare-prayer.ts).
 *
 * The hall is 59 × 28 m (X across the qibla wall, X −22 to 37; Z from the
 * qibla wall at −2.5 back to 25.5). On this small planet a building must
 * stay compact, so the ground is drawn at 0.35 tiles to the metre (about
 * 21 × 10 tiles, the whole plaza) and heights are stretched so the 8 m
 * pillars stand well above our people.
 */
/** Tile under the model's origin (the imam's place), so the hall's centre
 * (X 7.5, Z 11.5) falls at tile (28.5, 113.5). */
export const HALL: [number, number] = [25.875, 109.475];
/** Tiles per model metre on the ground. */
export const S = 0.35;
/** Vertical stretch of the model (pillars ~130 world px, walls ~195). */
export const KV = 2.37;
/** The tile under a model ground point (X across, Z towards the entrance). */
export const tileOf = (X: number, Z: number): [number, number] => [
  +(HALL[0] + S * X).toFixed(3),
  +(HALL[1] + S * Z).toFixed(3),
];
