/*
 * Where the owner's 3D mosque stands in the world, shared by the tools that
 * render it (tools/prepare-mosque-hall.ts) and fill it with the
 * congregation (tools/prepare-prayer.ts).
 *
 * The model is 16 × 22 m (X across, Z from the qibla wall at −11 to the
 * entrance at +11). On this small planet a building must stay compact, so
 * the ground is drawn at half a tile to the metre (8.4 × 11.4 tiles) and
 * heights are stretched so the columns stand well above our people.
 */
/** Tile under the hall's centre (the model's origin). */
export const HALL: [number, number] = [29.6, 113.4];
/** Tiles per model metre on the ground. */
export const S = 0.5;
/** Vertical stretch of the model (columns ~90 world px, walls ~150). */
export const KV = 1.84;
/** Model z of the walnut screen between the men's and women's rows. */
export const SCREEN_Z = 0.3;
/** The tile under a model ground point (X across, Z towards the entrance). */
export const tileOf = (X: number, Z: number): [number, number] => [
  +(HALL[0] + S * X).toFixed(3),
  +(HALL[1] + S * Z).toFixed(3),
];
