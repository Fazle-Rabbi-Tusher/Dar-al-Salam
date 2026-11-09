import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { readJson } from '../build/io';
import {
  mapDistance,
  tileToPlanet,
  wildAt,
} from '../../packages/shared/planet';
import {
  LANDSCAPE_REPLACEMENTS,
  landscapeDecorations,
  inWoodlandVillage,
} from './scene';
import type { ObjectArt } from '../placeholder/objects';

describe('landscape asset integration', () => {
  it('ships transparent, correctly anchored props and distinct waterfall frames', async () => {
    const assets: Record<string, ObjectArt> = await readJson(
      'art/landscape/index.json',
    );
    for (const id of Object.values(LANDSCAPE_REPLACEMENTS))
      expect(assets[id]).toBeDefined();
    for (const asset of Object.values(assets)) {
      const png = sharp(`art/${asset.file}`);
      const meta = await png.metadata();
      expect([meta.width, meta.height]).toEqual([asset.width, asset.height]);
      expect(meta.hasAlpha).toBe(true);
      const alpha = (await png.stats()).channels[3];
      expect(alpha.min).toBe(0);
      expect(alpha.max).toBe(255);
      expect(asset.anchor[0]).toBeGreaterThan(0);
      expect(asset.anchor[1]).toBeLessThan(asset.height);
    }
    const water = assets['land-waterfall'];
    expect(water.period).toBe(12);
    expect(water.frames).toHaveLength(4);
    const frames = await Promise.all(
      water.frames!.map((file) => sharp(`art/${file}`).raw().toBuffer()),
    );
    expect(frames[0].equals(frames[1])).toBe(false);
  });
  it('places a repeatable five-cottage village off character paths and out of the sea', () => {
    const placements = landscapeDecorations();
    expect(placements).toEqual(landscapeDecorations());
    expect(placements.filter((p) => p.art === 'land-cottage')).toHaveLength(5);
    for (const { tile } of placements) {
      expect(mapDistance(tile)).toBeGreaterThanOrEqual(2);
      expect(['meadow', 'forest']).toContain(
        wildAt(tileToPlanet(...tile), tile),
      );
    }
    expect(inWoodlandVillage([28, -6])).toBe(true);
    expect(inWoodlandVillage([48, 62])).toBe(false);
  });
});

describe('atmospheric woodland composition', () => {
  it('keeps coastal landmarks while opening clearings between ancient tree stands', async () => {
    const { composeForest } = await import('./forest');
    const { wildPlantings } = await import('../../packages/shared/planet');
    const source = wildPlantings();
    const placed = composeForest(source);
    expect(placed).toEqual(composeForest(source));
    expect(placed.length).toBeLessThan(source.length / 2);
    expect(placed.some((p) => p.art === 'land-snag')).toBe(true);
    expect(placed.some((p) => p.art === 'land-forest-stand')).toBe(true);
    for (const kind of ['waterfall', 'ship', 'palm'])
      expect(placed.filter((p) => p.kind === kind).map((p) => p.tile)).toEqual(
        source.filter((p) => p.kind === kind).map((p) => p.tile),
      );
    expect(placed.every((p) => !inWoodlandVillage(p.tile))).toBe(true);
  });
  it('bakes pale distant layers without moving or changing sprite silhouettes', async () => {
    const { forestHaze } = await import('./atmosphere');
    const { image } = await import('../build/io');
    const oak = await image('art/landscape/oak.png');
    for (const layer of ['middle', 'far'] as const) {
      const fog = forestHaze(oak, layer);
      expect([fog.width, fog.height]).toEqual([oak.width, oak.height]);
      expect(fog.data).not.toEqual(oak.data);
      for (let i = 3; i < oak.data.length; i += 4)
        expect(fog.data[i]).toBe(oak.data[i]);
    }
  });
});
