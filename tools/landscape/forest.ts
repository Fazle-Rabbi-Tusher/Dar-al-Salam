import {
  arc,
  mapDistance,
  PLANET,
  wildAt,
  wildPlantings,
  type Planting,
  type Vec3,
} from '../../packages/shared/planet';
import { inWoodlandVillage } from './scene';

export type ForestStratum = 'canopy' | 'trunks' | 'undergrowth' | 'other';
export type ForestPlanting = Planting & {
  /** A composition choice, resolved by the asset loader before generic biome art. */
  art?: string;
  stratum: ForestStratum;
};

/**
 * Large, continuous stands with irregular sunny clearings. The field lives on
 * the sphere so a grove never acquires a seam at the edge of tile projection.
 * A high value denotes the sheltered, old-growth centre of a stand.
 */
export function forestGroveAt([x, y, z]: Vec3): number {
  return Math.max(
    0,
    Math.min(
      1,
      0.52 +
        0.26 * Math.sin(x * 12.4 + y * 5.7 - z * 4.1 + 1.3) +
        0.17 * Math.sin(-x * 5.2 + y * 16.3 + z * 7.9) +
        0.08 * Math.sin(x * 31.7 + y * 13.1 - z * 9.4),
    ),
  );
}

const distance = (a: Planting, b: Planting) =>
  arc(a.p, b.p) * PLANET.radiusTiles;

/** The village already has an authored perimeter; broad crowns need a buffer. */
function outsideVillage(w: Planting) {
  const [x, y] = w.tile;
  return (
    !inWoodlandVillage(w.tile) && Math.hypot((x - 28) / 15, (y + 6) / 11) >= 1
  );
}

function treeArt(w: Planting, grove: number) {
  // Young trees define edges and retain light between the ancient trunks.
  if (w.kind === 'meadow-tree' || grove < 0.47 || mapDistance(w.tile) < 10)
    return w.pick < 0.6 ? 'land-oak-young' : 'land-pine-young';
  const [x, y, z] = w.p;
  const conifers = Math.sin(x * 6.1 - y * 4.7 + z * 8.3) > 0.1;
  if (w.pick > 0.9) return 'land-snag';
  if (grove > 0.62 && w.pick < 0.28) return 'land-forest-stand';
  return conifers ? 'land-pine' : 'land-oak';
}

function crownRadius(art: string, grove: number) {
  if (art === 'land-forest-stand') return 4.9;
  if (art === 'land-snag') return 2.8;
  if (art.endsWith('-young')) return 2.6;
  // Canopies overlap slightly in the deep forest, while margins remain airy.
  return grove > 0.67 ? 3.6 : 4.2;
}

/**
 * Compose the dense biome sampler into readable forest scenery. The sampler's
 * original density remains useful for biome tests; billboard composition has
 * its own crown spacing because a single broad asset covers several tiles.
 *
 * Large trunks, occasional paired stands and deadwood provide the silhouette.
 * Fern/log patches occupy gaps beneath them, with open ground through each
 * clearing. All choices are deterministic and independent of camera or time.
 * Character land and the village clearing are never changed.
 */
export function composeForest(
  plantings: readonly Planting[] = wildPlantings(),
): ForestPlanting[] {
  const canopy: { w: ForestPlanting; radius: number }[] = [];
  const undergrowth: ForestPlanting[] = [];
  const other: ForestPlanting[] = [];
  const candidates = plantings
    .filter(
      (w) =>
        (w.kind === 'forest-tree' || w.kind === 'meadow-tree') &&
        mapDistance(w.tile) >= 5 &&
        outsideVillage(w),
    )
    .map((w) => ({ w, grove: forestGroveAt(w.p) }))
    .filter(({ w, grove }) => w.kind === 'meadow-tree' || grove > 0.3)
    // Place the old-growth anchors first. A stable numeric tie-break keeps the
    // result identical if the caller supplies the same sites in another order.
    .sort(
      (a, b) =>
        b.grove - a.grove ||
        a.w.pick - b.w.pick ||
        a.w.tile[0] - b.w.tile[0] ||
        a.w.tile[1] - b.w.tile[1],
    );

  for (const { w, grove } of candidates) {
    const art = treeArt(w, grove);
    const radius = crownRadius(art, grove);
    if (canopy.some((c) => distance(c.w, w) < c.radius + radius)) continue;
    canopy.push({
      w: {
        ...w,
        art,
        stratum:
          art === 'land-snag' || art === 'land-forest-stand'
            ? 'trunks'
            : 'canopy',
      },
      radius,
    });
  }

  // A sparse ground layer uses the suppressed sites rather than filling every
  // square metre with another small tree. Small clearing centres stay empty.
  const groundCandidates = plantings
    .filter(
      (w) =>
        (w.kind === 'forest-tree' || w.kind === 'bush') &&
        mapDistance(w.tile) >= 4 &&
        outsideVillage(w),
    )
    .sort((a, b) => a.pick - b.pick || a.tile[0] - b.tile[0]);
  for (const w of groundCandidates) {
    const forest = wildAt(w.p, w.tile) === 'forest';
    const grove = forestGroveAt(w.p);
    if (forest && grove < 0.25) continue;
    if (w.pick > (forest ? 0.35 : 0.55)) continue;
    if (canopy.some((c) => distance(c.w, w) < 2.4)) continue;
    if (undergrowth.some((u) => distance(u, w) < 4.4)) continue;
    undergrowth.push({
      ...w,
      kind: 'bush',
      art: 'land-garden',
      stratum: 'undergrowth',
    });
  }

  for (const w of plantings) {
    if (!outsideVillage(w)) continue;
    if (['forest-tree', 'meadow-tree', 'bush'].includes(w.kind)) continue;
    other.push({
      ...w,
      ...(w.kind === 'waterfall' ? { art: 'land-waterfall' } : {}),
      stratum: 'other',
    });
  }
  return [...canopy.map(({ w }) => w), ...undergrowth, ...other];
}
