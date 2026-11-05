import { describe, it, expect } from 'vitest';
import { worldFromTile, tileFromWorld, depth, screenToWorld } from './iso';
import { globalFrame, frameMap } from './clock';
import { normalise, forbiddenName } from './rules';
import rules from '../../content/rules/never-depict.json';
import { characterSchema, type Character } from './schema';
import { characterState, facingFromSegment, scriptErrors } from './script';
import { parseUrl, serialiseUrl } from './url';
import { LRU, SpatialGrid, visibleChunks } from './spatial';
import { maskHit } from './compositor';
import cards from '../../content/ambient/mosque-garden.json';
const make = (): Character =>
  characterSchema.parse({
    id: 'test',
    look: {
      base: 'adult-man',
      garment: 'thobe',
      headwear: 'kufi',
      prop: 'none',
      colours: {},
    },
    loop: 60,
    script: [
      {
        from: 0,
        to: 60,
        action: 'walk',
        path: [
          [1, 1],
          [4, 1],
          [1, 1],
        ],
      },
    ],
  });
describe('isometric coordinate spaces', () => {
  it.each([
    [0, 0],
    [32, 32],
    [1.25, 61.75],
    [-5, 12],
  ])('round-trips %j %j', (tx, ty) => {
    const [x, y] = tileFromWorld(...worldFromTile(tx, ty));
    expect(x).toBeCloseTo(tx);
    expect(y).toBeCloseTo(ty);
  });
  it('has known 32×16 tile points and screen height', () => {
    expect(worldFromTile(1, 0)).toEqual([2064, 1468]);
    expect(worldFromTile(0, 1)).toEqual([2032, 1468]);
    expect(worldFromTile(0, 0, 20)).toEqual([2048, 1440]);
    expect(screenToWorld(16, 8, { x: 0, y: 0, zoom: 2 })).toEqual([8, 4]);
  });
});
describe('content identities', () => {
  it.each([
    'Musa',
    'musa',
    'Mūsā',
    'al-Musa',
    'Abu Bakr',
    'Aisha',
    'Muhammad',
    'Maryam',
    'Shu’ayb',
    'Dhul-Kifl',
  ])('blocks %s', (name) => expect(forbiddenName(name, rules)).toBe(true));
  it.each([
    'Umar ibn Abd al-Aziz',
    'Ibn Sina',
    'Fatima al-Fihri',
    'Musab',
    'Muhammad ibn Musa al-Khwarizmi',
  ])('allows %s', (name) => expect(forbiddenName(name, rules)).toBe(false));
  it('requires the exact scholar exception', () =>
    expect(
      forbiddenName('Muhammad ibn Musa al-Khwarizmi', {
        ...rules,
        allowlist: [],
      }),
    ).toBe(true));
  it('does not mistake a patronymic for a prophet', () =>
    expect(forbiddenName('Scholar ibn Musa', rules)).toBe(false));
  it('normalises apostrophes, accents and leading articles', () => {
    expect(normalise('  el-Mūsā ')).toBe('musa');
    expect(normalise("Shu'ayb")).toBe('shuayb');
  });
});
describe('clock and deterministic scripts', () => {
  it('wraps all loop lengths and repeats at 20 seconds', () => {
    expect(globalFrame(20)).toBe(0);
    expect(globalFrame(19.99)).toBe(239);
    for (const n of [60, 120, 240]) expect(frameMap(n, n, 6)).toBe(0);
    for (const raw of cards) {
      const c = characterSchema.parse(raw);
      expect(characterState(c, 0)).toEqual(characterState(c, 240));
    }
  });
  it('interpolates by polyline length', () => {
    const c = make();
    expect(characterState(c, 15).tile).toEqual([2.5, 1]);
    expect(characterState(c, 30).tile).toEqual([4, 1]);
  });
  it.each([
    [[0, 0], [1, 0], 'SE'],
    [[0, 0], [0, 1], 'SW'],
    [[0, 0], [0, -1], 'NE'],
    [[0, 0], [-1, 0], 'NW'],
    [[0, 0], [1, 1], 'SE'],
    [[0, 0], [-1, -1], 'NE'],
  ] as const)('derives facing %j → %j', (a, b, f) =>
    expect(facingFromSegment([...a], [...b])).toBe(f),
  );
  it('rejects a back-facing character turning toward the viewer', () => {
    const c = make();
    c.depiction = 'back';
    expect(scriptErrors(c)).toContain('step 0: back depiction must face NE/NW');
  });
  it('detects coverage, continuity and speed violations', () => {
    const c = make();
    c.script[0].from = 1;
    c.script[0].to = 50;
    c.script[0].path = [
      [0, 0],
      [40, 0],
    ];
    const e = scriptErrors(c).join(' ');
    expect(e).toContain('gap/overlap');
    expect(e).toContain('continuity');
    expect(e).toContain('speed');
    expect(e).toContain('cover');
  });
  it('detects blocked intermediate path tiles', () => {
    const c = make();
    const room = {
      type: 'map',
      orientation: 'isometric',
      tilewidth: 32,
      tileheight: 16,
      width: 6,
      height: 6,
      layers: [
        {
          type: 'tilelayer',
          name: 'collision',
          data: Array.from({ length: 36 }, (_, i) => (i === 8 ? 1 : 0)),
        },
      ],
    } as const;
    expect(scriptErrors(c, structuredClone(room) as never).join(' ')).toContain(
      'blocked tile 2,1',
    );
  });
  it('schema rejects invalid depictions and loops', () => {
    expect(() =>
      characterSchema.parse({ ...make(), depiction: 'front' }),
    ).toThrow();
    expect(() => characterSchema.parse({ ...make(), loop: 90 })).toThrow();
  });
});
describe('depth and spatial queries', () => {
  it('sorts either side of a wall/fountain strip and breaks diagonal ties', () => {
    expect(depth(3, 4)).toBeLessThan(depth(4, 4));
    expect(depth(5, 4)).toBeGreaterThan(depth(4, 4));
    expect(depth(4, 3)).toBeGreaterThan(depth(3, 4));
  });
  it('culls characters by their entire loop bounds across chunks', () => {
    const grid = new SpatialGrid<string>();
    grid.insert('walker', { x: 1000, y: 100, width: 150, height: 20 });
    expect(grid.query({ x: 1025, y: 100, width: 10, height: 10 })).toContain(
      'walker',
    );
    expect(
      grid.query({ x: 3000, y: 100, width: 10, height: 10 }),
    ).not.toContain('walker');
  });
  it('computes visible chunks at arbitrary zoom rects', () => {
    expect(
      visibleChunks({ x: 1025, y: 1025, width: 100, height: 100 }, 0),
    ).toEqual(['1,1']);
    expect(
      visibleChunks({ x: 1025, y: 1025, width: 100, height: 100 }, 1),
    ).toHaveLength(9);
  });
  it('LRU refreshes reads and disposes evicted textures', () => {
    const disposed: string[] = [];
    const cache = new LRU<number, string>(2, (v) => disposed.push(v));
    cache.set(1, 'a');
    cache.set(2, 'b');
    cache.get(1);
    cache.set(3, 'c');
    expect(cache.get(2)).toBeUndefined();
    expect(disposed).toEqual(['b']);
    cache.clear();
    expect(disposed).toHaveLength(3);
  });
});
describe('pixel masks and URLs', () => {
  it('ignores transparent pixels, outside bounds and tests camera transforms', () => {
    const mask = new Uint8Array([0b00000110]);
    expect(maskHit(mask, 2, 2, 0, 0)).toBe(false);
    expect(maskHit(mask, 2, 2, 1, 0)).toBe(true);
    expect(maskHit(mask, 2, 2, 2, 0)).toBe(false);
    expect(maskHit(mask, 2, 2, -1, 0)).toBe(false);
    const p = screenToWorld(2, 0, { x: 0, y: 0, zoom: 2 });
    expect(maskHit(mask, 2, 2, ...p)).toBe(true);
  });
  it('round-trips camera deep links and clamps malformed values', () => {
    const c = { x: 2000, y: 1950, zoom: 2 };
    expect(parseUrl(serialiseUrl(c, 'ibn-sina'))).toEqual({
      ...c,
      id: 'ibn-sina',
      hasZoom: true,
    });
    expect(parseUrl('/?x=nope&z=999').x).toBe(2048);
    expect(parseUrl('/?z=-2').zoom).toBe(0.05);
    expect(parseUrl('/?z=-2').hasZoom).toBe(true);
    expect(parseUrl('/c/ibn-sina').hasZoom).toBe(false);
  });
});

describe('object slicing', () => {
  it('uses the footprint front boundary for fountain and wall columns', async () => {
    const { stripDepth } = await import('./slicing');
    expect(stripDepth([10, 10], [2, 2], 0)).toBe(depth(12, 12));
    expect(stripDepth([10, 10], [2, 2], -32)).toBe(depth(10, 12));
    expect(stripDepth([10, 10], [2, 2], 32)).toBe(depth(12, 10));
    expect(depth(11, 10)).toBeLessThan(stripDepth([10, 10], [4, 1], 16));
    expect(depth(15, 12)).toBeGreaterThan(stripDepth([10, 10], [4, 1], 16));
  });
});
