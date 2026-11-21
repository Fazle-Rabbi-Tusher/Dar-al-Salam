import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  SUPPORTING_CAST,
  supportingCharacters,
  supportingPose,
} from './supporting-cast';
import { roomSchema, characterSchema } from './schema';
import { characterState, scriptErrors, sampleStep, pathLength } from './script';
import { DARK_ROOM } from './dark-room';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const room = roomSchema.parse(read('rooms/mosque-garden.tmj'));
describe('sparse, purposeful supporting cast', () => {
  it('adds one or two people per new section, retaining existing lab staff and listeners', () => {
    const cast = supportingCharacters(),
      saved = read('content/ambient/supporting-cast.json').map((c: unknown) =>
        characterSchema.parse(c),
      );
    expect(cast).toEqual(saved);
    expect(cast).toHaveLength(17);
    expect(new Set(cast.map((c) => c.id)).size).toBe(17);
    const sections = new Map<string, number>();
    for (const r of SUPPORTING_CAST)
      sections.set(r.section, (sections.get(r.section) ?? 0) + 1);
    expect([...sections.values()].every((n) => n <= 2)).toBe(true);
    expect([...sections.keys()]).toEqual(
      expect.arrayContaining([
        'knowledge',
        'hospital',
        'hospitality',
        'community',
        'city',
        'dark-room',
        'podcast',
        'football',
        'cricket',
        'basketball',
        'boxing',
        'mma',
        'massawa',
        'school',
      ]),
    );
    expect(read('content/ambient/laboratories.json')).toHaveLength(7);
    expect(read('content/ambient/menk-speech.json')).toHaveLength(8);
    for (const c of cast) {
      expect(c.name).toBeUndefined();
      expect(c.panelApproved).not.toBe(true);
      expect(c.role!.length).toBeGreaterThan(35);
      expect(c.strip).toMatch(/^support-/);
    }
  });
  it('keeps soles and routes off blocked tiles, clear of fixtures and the dark chamber projection', () => {
    const collision = room.layers.find((l) => l.name === 'collision');
    if (collision?.type !== 'tilelayer') throw Error('Missing collision');
    const objects = room.layers.flatMap((l) =>
      l.type === 'objectgroup' ? l.objects : [],
    );
    for (const c of supportingCharacters()) {
      expect(scriptErrors(c, room), c.id).toEqual([]);
      expect(characterState(c, 240)).toEqual(characterState(c, 0));
      for (const s of c.script) {
        const n = Math.max(1, Math.ceil(s.path ? pathLength(s.path) * 24 : 1));
        for (let i = 0; i <= n; i++) {
          const [x, y] = sampleStep(s, i / n).tile;
          if (x < 0 || y < 0 || x >= room.width || y >= room.height) continue;
          expect(
            collision.data[Math.floor(y) * room.width + Math.floor(x)],
            `${c.id} ${x},${y}`,
          ).toBe(0);
          expect(
            objects.filter(
              (o) =>
                !o.walkable &&
                x >= o.x &&
                x < o.x + o.footprint[0] &&
                y >= o.y &&
                y < o.y + o.footprint[1],
            ),
            c.id,
          ).toEqual([]);
        }
      }
    }
    const assistant = supportingCharacters().find(
        (c) => c.id === 'support-optics-assistant',
      )!,
      p = assistant.script[0].at!,
      local = [
        (DARK_ROOM.origin[1] - p[1]) / DARK_ROOM.scale,
        (p[0] - DARK_ROOM.origin[0]) / DARK_ROOM.scale,
      ];
    expect(local[0]).toBeCloseTo(5.7);
    expect(local[1]).toBeCloseTo(1.8);
    // Outside the bench (x≤4.64), the adjustable screen (x≥6.48,z≤.34),
    // storage (x≥6.65,z≥3.7), and the optical axis at z=-1.4.
    expect(local[0]).toBeGreaterThan(5.1);
    expect(local[0]).toBeLessThan(6.2);
    expect(local[1]).toBeGreaterThan(1.2);
  });
  it('uses quiet independent gestures, a real walking route and a complete watering cycle', () => {
    const cast = supportingCharacters();
    for (const c of cast) {
      const poses = new Set<number>();
      for (let f = 0; f < 240; f++) {
        const s = characterState(c, f);
        poses.add(supportingPose(c.id, s.action, f)!);
      }
      expect([...poses].sort(), c.id).toEqual([0, 1, 2, 3, 4, 5]);
      expect(supportingPose(c.id, c.script[0].action, 240)).toBe(
        supportingPose(c.id, c.script[0].action, 0),
      );
    }
    const coach = (id: string) =>
      Array.from({ length: 240 }, (_, f) => supportingPose(id, 'talk', f));
    expect(coach('support-boxing-corner')).not.toEqual(
      coach('support-mma-corner'),
    );
    const p = cast.find((c) => c.id === 'support-city-pedestrian')!;
    expect(characterState(p, 0).tile).not.toEqual(characterState(p, 60).tile);
    expect(characterState(p, 60).action).toBe('idle');
    expect(supportingPose('support-garden-caretaker', 'pour', 72)).toBe(0);
    expect(supportingPose('support-garden-caretaker', 'pour', 119)).toBe(5);
  });
  it('retains all front/rear artwork with complete transparent cells and smaller children', async () => {
    const cast = supportingCharacters(),
      models = [...new Set(cast.map((c) => c.strip!))];
    expect(models).toHaveLength(12);
    for (const model of models) {
      const actions = new Set(
        cast
          .filter((c) => c.strip === model)
          .flatMap((c) => c.script.map((s) => s.action)),
      );
      for (const action of actions)
        for (const view of ['SE', 'NE']) {
          const base = `art/sprites/anim/${model}__${action}_${view}`,
            meta = read(base + '.json'),
            { data, info } = await sharp(base + '.png')
              .ensureAlpha()
              .raw()
              .toBuffer({ resolveWithObject: true });
          expect(info.height).toBe(336);
          expect(info.width % 224).toBe(0);
          expect(meta.foot).toEqual([112, 320]);
          expect(meta.density).toBe(4);
          const expected =
            action === 'idle' && /gardener|pedestrian/.test(model) ? 1 : 6;
          expect(info.width / 224).toBe(expected);
          expect(meta.sequence).toHaveLength(expected);
          for (let col = 0; col < expected; col++) {
            const ys: number[] = [];
            for (let y = 0; y < 336; y++)
              for (let x = 0; x < 224; x++)
                if (data[(y * info.width + col * 224 + x) * 4 + 3] > 170) {
                  ys.push(y);
                  break;
                }
            expect(Math.max(...ys)).toBe(319);
            const height = Math.max(...ys) - Math.min(...ys) + 1;
            expect(height).toBeGreaterThan(
              model.includes('school-') ? 172 : 247,
            );
            expect(height).toBeLessThan(model.includes('school-') ? 200 : 295);
            expect(data[(335 * info.width + col * 224) * 4 + 3]).toBe(0);
          }
        }
    }
  });
});
