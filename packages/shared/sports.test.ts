import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { characterSchema, roomSchema } from './schema';
import { characterState, scriptErrors } from './script';
import {
  SPORTS,
  SPORTS_PLAYERS,
  SPORTS_GRAVITY,
  basketballBall,
  basketballLift,
  ballistic,
  cricketBall,
  sportsActivityModel,
  sportsModel,
  sportsPose,
} from './sports';
import { upgradeSportsRoom } from '../../tools/placeholder/scenes/sports-upgrade';
import { DARK_ROOM, darkRoomTile } from './dark-room';
import { TILE_SIDE } from './planet';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const room = roomSchema.parse(read('rooms/mosque-garden.tmj'));
describe('sports district and enlarged optical chamber', () => {
  it('removes the medical strip and kitchen, without duplicating arenas on another upgrade', () => {
    const copy = structuredClone(room),
      objects = copy.layers.find((l) => l.type === 'objectgroup');
    if (objects?.type !== 'objectgroup') throw Error('Missing objects');
    expect(
      objects.objects.filter((o) => o.type.startsWith('sports-')),
    ).toHaveLength(4);
    expect(
      objects.objects.some((o) =>
        /ambulance-centre|hospital-stand|kitchen-counter|dining-table|sup-dr-/.test(
          o.type,
        ),
      ),
    ).toBe(false);
    const before = JSON.stringify(copy);
    const collision = copy.layers.find((l) => l.name === 'collision');
    if (collision?.type !== 'tilelayer') throw Error('Missing collision');
    for (const [x, y] of [
      [94, 18],
      [65, 114],
      [77, 46],
      [63, 48],
    ])
      expect(collision.data[y * copy.width + x]).toBe(0);
    upgradeSportsRoom(copy);
    expect(JSON.stringify(copy)).toBe(before);
    expect(
      read('content/ambient/mosque-garden.json').some((c: { id: string }) =>
        /stadium-ambulance|amla-ball/.test(c.id),
      ),
    ).toBe(false);
    expect(DARK_ROOM.scale).toBe(0.85);
    expect(darkRoomTile(2.45, 1.25)).toEqual([48.0625, 30.9175]);
    const meta = read('art/sprites/anim/ibn-al-haytham__write_SE.json');
    expect(meta.density).toBeCloseTo((17 * 0.23) / 0.85);
    expect(0.23 * DARK_ROOM.scale * TILE_SIDE).toBeGreaterThan(4);
  });
  it('keeps all five named athletes on their surfaces with continuous collision-free routines and draft identity', () => {
    for (const id of SPORTS_PLAYERS) {
      const c = characterSchema.parse(read(`content/characters/${id}.json`));
      expect(scriptErrors(c, room), id).toEqual([]);
      expect(c.panelApproved, id).toBe(false);
      const arena =
        id === 'hakeem-olajuwon' ? SPORTS.basketball : SPORTS.cricket;
      for (let t = 0; t < 240; t += 0.5) {
        const s = characterState(c, t);
        expect(s.tile[0]).toBeGreaterThan(arena.tile[0]);
        expect(s.tile[0]).toBeLessThan(arena.tile[0] + arena.footprint[0]);
        expect(s.tile[1]).toBeGreaterThan(arena.tile[1]);
        expect(s.tile[1]).toBeLessThan(arena.tile[1] + arena.footprint[1]);
      }
      for (const action of new Set(c.script.map((s) => s.action)))
        for (const side of ['SE', 'NE']) {
          const strip = read(`art/sprites/anim/${id}__${action}_${side}.json`);
          expect(strip.sequence).toHaveLength(6);
          expect(strip.foot).toEqual([112, 320]);
        }
    }
  });
});
describe('deterministic ball contact and gravity', () => {
  it('uses constant gravity and contact endpoints rather than a floating linear ball', () => {
    const a = { tile: [0, 0] as [number, number], height: 62, phase: 'shot' },
      b = { tile: [4, 0] as [number, number], height: 70, phase: 'rim' };
    const sample = (t: number) => ballistic(a, b, t, 0, 12).height;
    expect(sample(0)).toBe(62);
    expect(sample(12)).toBe(70);
    expect(sample(6)).toBeGreaterThan(90);
    expect(sample(5) - 2 * sample(6) + sample(7)).toBeCloseTo(
      -SPORTS_GRAVITY / 144,
    );
    expect(basketballLift(12)).toBe(0);
    expect(basketballLift(17)).toBeGreaterThan(0);
    expect(basketballLift(106)).toBe(0);
    expect(sportsPose('mashrafe-mortaza', 44)).toBe(3);
    expect(sportsPose('hashim-amla', 60)).toBe(3);
    expect(sportsPose('tamim-iqbal', 180)).toBe(3);
  });
  it('coordinates bowling, ground bounce, bat strike, gather and return, with loop closure', () => {
    expect(cricketBall(44).phase).toBe('delivery');
    expect(cricketBall(54).height).toBeCloseTo(2.1);
    expect(cricketBall(60).phase).toBe('struck');
    expect(cricketBall(88).tile).toEqual(SPORTS.fielder);
    expect(cricketBall(100).phase).toBe('return');
    expect(cricketBall(120)).toEqual(cricketBall(0));
    for (let t = 0; t < 240; t += 0.1) {
      const p = cricketBall(t);
      expect(p.height).toBeGreaterThanOrEqual(1.2);
      expect(Number.isFinite(p.tile[0] + p.height)).toBe(true);
    }
    const c = characterSchema.parse(
      read('content/characters/hakeem-olajuwon.json'),
    );
    expect(basketballBall(30, characterState(c, 30).tile).tile).toEqual(
      SPORTS.rim,
    );
    for (const t of [100, 210])
      expect(basketballBall(t, characterState(c, t).tile).tile).toEqual(
        SPORTS.rim,
      );
    expect(basketballBall(240, characterState(c, 240).tile)).toEqual(
      basketballBall(0, characterState(c, 0).tile),
    );
    for (let t = 0; t < 240; t += 0.1)
      expect(
        basketballBall(t, characterState(c, t).tile).height,
      ).toBeGreaterThanOrEqual(6);
  });
});
describe('rotatable arena volumes', () => {
  it('builds eight cage sides, open links and four boxing rope levels with dimensional fixtures', () => {
    const mma = sportsModel('sports-mma-octagon', SPORTS.mma.footprint)!;
    const mat = mma.faces[0];
    expect(mat.points).toHaveLength(8);
    expect(new Set(mat.points.map((p) => p[1]))).toEqual(new Set([4]));
    expect(mma.faces.length).toBeGreaterThan(5000);
    expect(mma.height).toBeGreaterThan(40);
    const ring = sportsModel('sports-boxing-ring', SPORTS.boxing.footprint)!;
    for (const y of [22, 35, 48, 61])
      expect(
        ring.faces.some((f) => f.points.some((p) => Math.abs(p[1] - y) < 1)),
      ).toBe(true);
  });
  it('keeps dynamic meshes fixed in topology throughout both 240-frame routines', () => {
    for (const [type, s] of [
      ['sports-basketball-court', SPORTS.basketball],
      ['sports-cricket-stadium', SPORTS.cricket],
    ] as const) {
      const base = sportsModel(type, s.footprint)!;
      expect(base.faces.length).toBeGreaterThan(500);
      expect(base.height).toBeGreaterThan(70);
      const first = sportsActivityModel(type, s.footprint, 0)!;
      for (const t of [17, 30, 60, 88, 100, 116, 180, 210, 239.9]) {
        const current = sportsActivityModel(type, s.footprint, t)!;
        expect(current.faces.length).toBe(first.faces.length);
        expect(current.faces.map((f) => f.points.length)).toEqual(
          first.faces.map((f) => f.points.length),
        );
        expect(
          current.faces.flatMap((f) => f.points.flat()).every(Number.isFinite),
        ).toBe(true);
      }
    }
  });
});
