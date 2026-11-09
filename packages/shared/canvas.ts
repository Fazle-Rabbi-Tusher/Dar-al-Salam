/** Sprite canvas sizes and foot anchors shared by art, importer, compositor and Lab. */
export type CanvasSpec = {
  width: number;
  height: number;
  anchor: [number, number];
};
export const CANVAS = {
  person: { width: 56, height: 84, anchor: [28, 80] },
  cat: { width: 32, height: 24, anchor: [16, 22] },
  bird: { width: 20, height: 20, anchor: [10, 19] },
  ball: { width: 12, height: 12, anchor: [6, 11] },
  vehicle: { width: 72, height: 56, anchor: [36, 50] },
  camel: { width: 64, height: 64, anchor: [32, 60] },
  donkey: { width: 48, height: 44, anchor: [24, 40] },
  goat: { width: 36, height: 32, anchor: [18, 29] },
  gazelle: { width: 44, height: 44, anchor: [22, 40] },
  pelican: { width: 32, height: 32, anchor: [16, 29] },
} satisfies Record<string, CanvasSpec>;
/** Vehicle bases (drawn on the vehicle canvas). */
export const VEHICLES = ['ambulance'];
/** Animal bases (Massawa): each has its own canvas. */
export const ANIMALS = [
  'camel',
  'donkey',
  'goat',
  'gazelle',
  'pelican',
] as const;
export function canvasFor(base: string): CanvasSpec {
  return base === 'cat'
    ? CANVAS.cat
    : base === 'bird'
      ? CANVAS.bird
      : base === 'ball'
        ? CANVAS.ball
        : VEHICLES.includes(base)
          ? CANVAS.vehicle
          : (ANIMALS as readonly string[]).includes(base)
            ? CANVAS[base as (typeof ANIMALS)[number]]
            : CANVAS.person;
}
/** Children reuse adult garments, scaled around the foot anchor. */
export const CHILD_SCALE = 0.72;
