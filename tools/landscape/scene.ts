import {
  mapDistance,
  tileToPlanet,
  wildAt,
} from '../../packages/shared/planet';
import type { Point } from '../../packages/shared/iso';

/** Existing room scenery changes appearance only; collision and scripts stay authored. */
export const LANDSCAPE_REPLACEMENTS: Record<string, string> = {
  'm-tree': 'land-oak-young',
  'm-oak': 'land-oak',
  'm-pine': 'land-pine-young',
  'm-cherry': 'land-cherry-young',
  'm-waterfall': 'land-waterfall',
  'm-bush': 'land-garden',
  'm-ship': 'land-sailship',
  'm-broadcast-tower': 'land-city-skyline',
};
export type LandscapeDecoration = { art: string; tile: Point };
export const inWoodlandVillage = ([x, y]: Point) =>
  Math.hypot((x - 28) / 13, (y + 6) / 9) < 1;
/** A village clearing beyond the original character map, surrounded by gardens.
 * Keep all additions off the authored map and away from water. No randomness,
 * wall clock, room mutation, or character changes are involved in placement.
 */
export function landscapeDecorations(): LandscapeDecoration[] {
  const out: LandscapeDecoration[] = [];
  const place = (art: string, tile: Point) => {
    const biome = wildAt(tileToPlanet(...tile), tile);
    if (mapDistance(tile) < 2 || !['meadow', 'forest'].includes(biome)) return;
    out.push({ art, tile });
  };
  const cottages: Point[] = [
    [22, -10],
    [29, -12],
    [34, -7],
    [22, -3],
    [33, -3],
  ];
  for (const tile of cottages) {
    place('land-cottage', tile);
    place('land-garden', [tile[0] - 1.7, tile[1] + 1.4]);
    place('land-garden', [tile[0] + 2.1, tile[1] + 0.7]);
  }
  // A loose perimeter of layered trees; the centre stays open for the plaza.
  for (let i = 0; i < 26; i++) {
    const a = (i * Math.PI * 2) / 26;
    const foreground = Math.cos(a) * 13 + Math.sin(a) * 10 > 0;
    place(
      i % 5 === 0
        ? 'land-snag'
        : i % 2
          ? foreground
            ? 'land-pine-young'
            : 'land-pine'
          : foreground
            ? 'land-oak-young'
            : 'land-oak',
      [28 + Math.cos(a) * 13, -7 + Math.sin(a) * 10],
    );
  }
  for (let i = 0; i < 50; i++) {
    const a = i * 2.399963,
      r = 9 + (i % 6) * 0.7;
    place('land-garden', [28 + Math.cos(a) * r, -7 + Math.sin(a) * r]);
  }
  return out;
}
