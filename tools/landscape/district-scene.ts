import type { Point } from '../../packages/shared/iso';
import { DISTRICTS, inDistrict } from '../../packages/shared/districts';
import {
  mapDistance,
  tileToPlanet,
  wildAt,
} from '../../packages/shared/planet';
import type { LandscapeDecoration } from './scene';

/** These two authored streets replace wilderness planting, never character land. */
export const inDistrictClearing = (tile: Point) =>
  DISTRICTS.some(
    (d) =>
      (d.id === 'rain-street' || d.id === 'blossom') &&
      inDistrict(tile, d, 1.5),
  );

export function districtDecorations(): LandscapeDecoration[] {
  const out: LandscapeDecoration[] = [];
  const place = (art: string, tile: Point, water = false) => {
    const biome = wildAt(tileToPlanet(...tile), tile);
    if (mapDistance(tile) < 2) return;
    const wet = biome === 'sea' || biome === 'shallows';
    if (water !== wet) return;
    out.push({ art, tile });
  };
  // Small, legible blocks around a narrow dusk lane, off the original map.
  for (const tile of [
    [54, -13],
    [63, -14],
    [73, -13],
    [55, -4],
    [74, -4],
  ] as Point[])
    place('land-blossom-block', tile);
  for (const tile of [
    [57, -11],
    [68, -11],
    [76, -11],
  ] as Point[])
    place('m-utility-pole', tile);
  for (const tile of [
    [59, -5],
    [69, -5],
    [78, -5],
  ] as Point[])
    place('land-garden', tile);

  // A rainy tram street, rows of illuminated shops and overhead utilities.
  place('land-tram-platform', [-9.8, 72]);
  place('land-tram', [-11, 74]);
  place('m-tram-stop', [-18, 80]);
  for (const tile of [
    [-19, 59],
    [-19, 67],
    [-19, 75],
    [-19, 83],
    [-6, 60],
    [-6, 67],
    [-6, 83],
  ] as Point[])
    place('m-neon-shop', tile);
  for (const tile of [
    [-20, 63],
    [-20, 73],
    [-20, 84],
    [-5, 62],
    [-5, 80],
  ] as Point[])
    place('m-utility-pole', tile);
  for (const tile of [
    [-17, 61],
    [-17, 71],
    [-17, 82],
  ] as Point[])
    place('m-city-lamp', tile);
  // A few taller silhouettes form an urban backdrop behind the tram street.
  place('m-tower-slim', [-19, 55]);
  place('m-tower-slim-b', [-5, 55]);

  // A harbor headland and a proper offshore ship; keep the water genuinely free.
  for (const tile of [
    [102, 96],
    [104, 108],
  ] as Point[])
    place('land-coastal-cliff', tile);
  // The shared biome sampler already anchors the harbor ship at [119.85,98.84].
  // Its m-ship art is replaced with land-sailship, avoiding overlapping boats.
  return out;
}
