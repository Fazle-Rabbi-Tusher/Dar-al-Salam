import { describe, expect, it } from 'vitest';
import { DISTRICTS, districtAt } from '../../packages/shared/districts';
import {
  mapDistance,
  tileToPlanet,
  wildAt,
} from '../../packages/shared/planet';
import { readJson, image } from '../build/io';
import { districtDecorations, inDistrictClearing } from './district-scene';
import type { ObjectArt } from '../placeholder/objects';

describe('city and coastal districts', () => {
  it('shares exact camera destinations with local mood masks', () => {
    for (const district of DISTRICTS)
      expect(districtAt(district.centre)).toBe(district.id);
    expect(districtAt([24, 24])).toBe('day');
    expect(inDistrictClearing([-12, 72])).toBe(true);
    expect(inDistrictClearing([65, -8])).toBe(true);
    expect(inDistrictClearing([24, 24])).toBe(false);
  });
  it('places reproducible streets and coastal cliffs off character land and dry', async () => {
    const placed = districtDecorations();
    expect(placed).toEqual(districtDecorations());
    expect(placed.filter((p) => p.art === 'land-tram')).toHaveLength(1);
    expect(placed.filter((p) => p.art === 'land-blossom-block')).toHaveLength(
      5,
    );
    const index: Record<string, ObjectArt> = {
      ...(await readJson('art/objects/index.json')),
      ...(await readJson('art/landscape/index.json')),
    };
    for (const { art, tile } of placed) {
      expect(mapDistance(tile)).toBeGreaterThanOrEqual(2);
      expect(['sea', 'shallows']).not.toContain(
        wildAt(tileToPlanet(...tile), tile),
      );
      expect(index[art], art).toBeDefined();
      const png = await image(`art/${index[art].file}`);
      expect([png.width, png.height], art).toEqual([
        index[art].width,
        index[art].height,
      ]);
    }
  });
});

describe('living district assets', () => {
  it('separates the moving tram from its platform and ships complete directional poses', async () => {
    const index: Record<string, ObjectArt> = await readJson(
      'art/landscape/index.json',
    );
    expect(index['land-tram'].life?.kind).toBe('tram');
    expect(index['land-tram'].file).not.toBe(index['land-tram-platform'].file);
    expect(Object.keys(index['land-tram'].life!.views!).sort()).toEqual([
      'NE-closed',
      'NE-open',
      'SW-closed',
      'SW-open',
    ]);
    expect(Object.keys(index['land-sailship'].life!.views!).sort()).toEqual([
      'NE',
      'NW',
      'SE',
      'SW',
    ]);
    for (const type of ['land-tram', 'land-taxi', 'land-sailship']) {
      const asset = index[type];
      for (const file of Object.values(asset.life!.views!)) {
        const pose = await image(`art/${file}`);
        expect([pose.width, pose.height]).toEqual([asset.width, asset.height]);
        // Padding around poses prevents wheel, rigging and pantograph clipping.
        const edgeAlpha: number[] = [];
        for (let x = 0; x < pose.width; x++)
          edgeAlpha.push(
            pose.data[x * 4 + 3],
            pose.data[((pose.height - 1) * pose.width + x) * 4 + 3],
          );
        expect(edgeAlpha.every((a) => a === 0)).toBe(true);
      }
    }
    const closed = await image(
      `art/${index['land-tram'].life!.views!['SW-closed']}`,
    );
    const open = await image(
      `art/${index['land-tram'].life!.views!['SW-open']}`,
    );
    expect(open.data).not.toEqual(closed.data);
  });
  it('keeps the new taxi out of every authored blocking footprint', async () => {
    const { taxiState } = await import('../../packages/shared/world-life');
    const room = await readJson('rooms/mosque-garden.tmj');
    const objects = room.layers.find(
      (l: { type: string }) => l.type === 'objectgroup',
    ).objects;
    for (let f = 0; f < 240; f++) {
      const [x, y] = taxiState(f).tile;
      for (const o of objects.filter((o: { walkable: boolean }) => !o.walkable))
        expect(
          x >= o.x &&
            y >= o.y &&
            x < o.x + o.footprint[0] &&
            y < o.y + o.footprint[1],
          `frame${f}:${o.type}`,
        ).toBe(false);
    }
  });
});
