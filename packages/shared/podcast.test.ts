import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { characterSchema, roomSchema } from './schema';
import { characterState, scriptErrors } from './script';
import {
  PODCAST,
  podcastActivityModel,
  podcastModel,
  podcastPose,
  podcastState,
} from './podcast';
import { sportsModel, SPORTS } from './sports';
import { TILE_SIDE } from './planet';
import {
  upgradePodcastRoom,
  upgradePodcastCharacters,
} from '../../tools/placeholder/scenes/podcast-upgrade';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const room = roomSchema.parse(read('rooms/mosque-garden.tmj'));
describe('seated podcast performance', () => {
  it('preserves identities, fixed soles and a closed conversation with exclusive turns', () => {
    for (const id of ['omar-suleiman', 'mehdi-hasan']) {
      const c = characterSchema.parse(read(`content/characters/${id}.json`));
      expect(scriptErrors(c, room)).toEqual([]);
      expect(c.panelApproved).toBe(false);
      expect(c.bio?.en).toBe('PLACEHOLDER — to be researched');
      expect(characterState(c, 240)).toEqual(characterState(c, 0));
      const poses = new Set<number>();
      for (let t = 0; t < 240; t++) {
        const s = characterState(c, t),
          p = podcastState(t);
        expect(s.tile).toEqual(
          id === 'omar-suleiman' ? PODCAST.omar : PODCAST.mehdi,
        );
        expect(s.z).toBe(PODCAST.floor);
        expect(s.action).toBe(
          (id === 'omar-suleiman' ? p.omar : p.mehdi)
            ? 'podcast-talk'
            : 'podcast-listen',
        );
        expect(p.omar && p.mehdi).toBe(false);
        poses.add(podcastPose(id, t));
      }
      expect([...poses].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });
  it('retains complete distinct drawings in both front and rear views', async () => {
    for (const id of ['omar-suleiman', 'mehdi-hasan'])
      for (const action of ['podcast-talk', 'podcast-listen'])
        for (const view of ['SE', 'NE']) {
          const base = `art/sprites/anim/${id}__${action}_${view}`,
            meta = read(base + '.json'),
            img = await sharp(base + '.png').metadata(),
            frames = [];
          expect([img.width, img.height, meta.density]).toEqual([1344, 336, 4]);
          expect(meta.foot).toEqual([112, 320]);
          expect(meta.sequence).toEqual([0, 1, 2, 3, 4, 5]);
          for (let col = 0; col < 6; col++) {
            const pixels = await sharp(base + '.png')
              .extract({ left: col * 224, top: 0, width: 224, height: 336 })
              .raw()
              .toBuffer();
            frames.push(pixels.toString('base64'));
            const occupied: number[] = [];
            for (let y = 0; y < 336; y++)
              if (
                Array.from(
                  { length: 224 },
                  (_, x) => pixels[(y * 224 + x) * 4 + 3],
                ).some((a) => a > 170)
              )
                occupied.push(y);
            expect(
              occupied.at(-1)! - occupied[0],
              `${base}/${col}: complete adult seated body`,
            ).toBeGreaterThan(165);
            // A detached pair of shoes above the next head was caused by
            // cutting unequal source rows into equal quarters.
            expect(
              occupied.every((y, i) => i === 0 || y - occupied[i - 1] <= 3),
              `${base}/${col}: no detached row fragments`,
            ).toBe(true);
          }
          expect(new Set(frames).size).toBeGreaterThanOrEqual(
            action.endsWith('talk') ? 5 : 3,
          );
        }
  });
  it('models the complete set and fixed tripods separately from moving heads and meters', () => {
    const studio = podcastModel('podcast-studio', PODCAST.footprint)!;
    expect(studio.faces.length).toBeGreaterThan(1000);
    expect(studio.height).toBeGreaterThan(85);
    const first = podcastActivityModel('podcast-studio', PODCAST.footprint, 0)!;
    const signature = first.faces.map((f) => f.points.length);
    for (const t of [1.5, 24, 84, 130, 192, 239.5, 240]) {
      const next = podcastActivityModel(
        'podcast-studio',
        PODCAST.footprint,
        t,
      )!;
      expect(next.faces.map((f) => f.points.length)).toEqual(signature);
      expect(
        next.faces.flatMap((f) => f.points.flat()).every(Number.isFinite),
      ).toBe(true);
    }
    expect(
      podcastActivityModel('podcast-studio', PODCAST.footprint, 130),
    ).not.toEqual(first);
    expect(
      podcastActivityModel('podcast-studio', PODCAST.footprint, 240),
    ).toEqual(first);
    const copy = structuredClone(room),
      before = JSON.stringify(copy);
    upgradePodcastRoom(copy);
    expect(JSON.stringify(copy)).toBe(before);
    const cards = [
      characterSchema.parse(read('content/characters/omar-suleiman.json')),
    ];
    const upgraded = upgradePodcastCharacters(cards);
    expect(upgradePodcastCharacters(upgraded)).toEqual(upgraded);
    expect(upgraded.filter((c) => c.id === 'mehdi-hasan')).toHaveLength(1);
  });
});

describe('dimensional football goals and living turf', () => {
  it('gives both goals a wide mouth across the goal line, roof and rear net depth', () => {
    const objects = room.layers.flatMap((l) =>
      l.type === 'objectgroup' ? l.objects : [],
    );
    const goals = objects.filter((o) => /^m-goal-(west|east)$/.test(o.type));
    expect(goals).toHaveLength(2);
    for (const o of goals) {
      const model = sportsModel(o.type, o.footprint)!,
        points = model.faces.flatMap((f) => f.points),
        span = (axis: number) =>
          Math.max(...points.map((p) => p[axis])) -
          Math.min(...points.map((p) => p[axis]));
      expect(model.kind).toBe('football-goal');
      expect(span(2)).toBeGreaterThan(150);
      expect(span(2)).toBeGreaterThan(span(0) * 3);
      expect(span(0)).toBeGreaterThan(30);
      expect(model.height).toBeGreaterThan(60);
      expect(model.faces.length).toBeGreaterThan(1000);
      expect(o.walkable).toBe(true);
      const goalLine = o.type.endsWith('west') ? o.x + o.footprint[0] : o.x;
      expect(goalLine).toBeCloseTo(o.type.endsWith('west') ? 67.5 : 90.5);
    }
  });
  it('uses an authored grass material with low blades and exactly clipped oval boundaries', () => {
    for (const [type, fp] of [
      ['m-pitch', [24, 16]],
      ['sports-cricket-stadium', SPORTS.cricket.footprint],
    ] as const) {
      const model = sportsModel(type, [...fp])!,
        turf = model.faces.filter((f) => f.material === 'turf');
      expect(turf.length).toBeGreaterThan(50);
      for (const face of turf) {
        const [a, b, c] = face.points,
          nx = b[0] - a[0],
          nz = b[2] - a[2],
          cx = c[0] - a[0],
          cz = c[2] - a[2];
        expect(nz * cx - nx * cz).toBeGreaterThanOrEqual(0);
        if (type.includes('cricket'))
          for (const [x, , z] of face.points)
            expect(
              (x / (fp[0] * TILE_SIDE * 0.405)) ** 2 +
                (z / (fp[1] * TILE_SIDE * 0.405)) ** 2,
            ).toBeLessThanOrEqual(1.000001);
      }
      expect(
        model.faces.filter(
          (f) => f.points.length === 3 && f.points.every((p) => p[1] < 2.1),
        ).length,
      ).toBeGreaterThan(1000);
    }
  });
});
