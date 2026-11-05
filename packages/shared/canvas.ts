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
} satisfies Record<string, CanvasSpec>;
export function canvasFor(base: string): CanvasSpec {
  return base === 'cat'
    ? CANVAS.cat
    : base === 'bird'
      ? CANVAS.bird
      : base === 'ball'
        ? CANVAS.ball
        : CANVAS.person;
}
/** Children reuse adult garments, scaled around the foot anchor. */
export const CHILD_SCALE = 0.72;
