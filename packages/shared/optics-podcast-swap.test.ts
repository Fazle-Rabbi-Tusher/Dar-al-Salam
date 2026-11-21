import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { DARK_ROOM, darkRoomTile } from './dark-room';
import { PODCAST, podcastTile } from './podcast';
import { SUPPORTING_CAST } from './supporting-cast';
import { roomSchema, characterSchema } from './schema';
import { scriptErrors } from './script';
import { upgradePodcastRoom } from '../../tools/placeholder/scenes/podcast-upgrade';

const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const source = 'art/sprites/source/haytham-redesign';
const room = roomSchema.parse(read('rooms/mosque-garden.tmj'));
describe('complete optics and podcast scene exchange', () => {
  it('exchanges centers, keeps staff attached and updates scene bounds', () => {
    const center = darkRoomTile(2.4, 0);
    expect(center[0]).toBe(22);
    expect(center[1]).toBeCloseTo(106);
    expect(PODCAST.center[0]).toBe(47);
    expect(PODCAST.center[1]).toBeCloseTo(30.96);
    expect(read('content/scenes/dark-room.json').area).toEqual(DARK_ROOM.area);
    expect(read('content/scenes/podcast.json').area).toEqual(PODCAST.area);
    expect(
      SUPPORTING_CAST.find((c) => c.id === 'support-optics-assistant')!.at,
    ).toEqual(darkRoomTile(5.7, 1.8));
    expect(
      SUPPORTING_CAST.find((c) => c.id === 'support-podcast-operator')!.at,
    ).toEqual(podcastTile(14.3, 10.2));
    for (const id of ['ibn-al-haytham', 'omar-suleiman', 'mehdi-hasan']) {
      const c = characterSchema.parse(read(`content/characters/${id}.json`));
      expect(scriptErrors(c, room)).toEqual([]);
      expect(c.panelApproved).toBe(false);
    }
  });
  it('moves existing objects without duplicate studios or stale collision walls', () => {
    const copy = structuredClone(room),
      layer = copy.layers.find((l) => l.type === 'objectgroup')!,
      collision = copy.layers.find((l) => l.name === 'collision')!;
    if (layer.type !== 'objectgroup' || collision.type !== 'tilelayer')
      throw Error('Missing layers');
    const objects = JSON.stringify(
      layer.objects.filter((o) => !o.type.startsWith('podcast-')),
    );
    for (const o of layer.objects.filter((o) =>
      o.type.startsWith('podcast-'),
    )) {
      o.x -= 25;
      o.y += 75.04;
      if (!o.walkable)
        for (let y = Math.floor(o.y); y < o.y + o.footprint[1]; y++)
          for (let x = Math.floor(o.x); x < o.x + o.footprint[0]; x++)
            collision.data[y * copy.width + x] = 1;
    }
    upgradePodcastRoom(copy);
    expect(
      layer.objects.filter((o) => o.type === 'podcast-studio'),
    ).toHaveLength(1);
    expect(
      JSON.stringify(
        layer.objects.filter((o) => !o.type.startsWith('podcast-')),
      ),
    ).toBe(objects);
    expect(collision.data[100 * copy.width + 20]).toBe(0);
    expect(collision.data[24 * copy.width + 45]).toBe(1);
    const before = JSON.stringify(copy);
    upgradePodcastRoom(copy);
    expect(JSON.stringify(copy)).toBe(before);
  });
});
describe('redesigned scholar retains the original experiment', () => {
  it('preserves the complete source archive and exact 40-pose playback metadata', async () => {
    const inventory = read(`${source}/inventory.json`);
    for (const f of inventory.files.filter((f: { path: string }) =>
      f.path.startsWith('original/'),
    )) {
      const bytes = readFileSync(`${source}/${f.path}`);
      expect(bytes.length).toBe(f.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(f.sha256);
    }
    for (const facing of ['SE', 'NE']) {
      const name = `ibn-al-haytham__write_${facing}`,
        old = read(`${source}/original/anim/${name}.json`),
        current = read(`art/sprites/anim/${name}.json`),
        png = `art/sprites/anim/${name}.png`,
        meta = await sharp(png).metadata();
      expect(current).toEqual(old);
      expect(current.sequence).toHaveLength(40);
      expect([meta.width, meta.height]).toEqual([344 * 40, 395]);
      const drawings = new Set();
      for (let n = 0; n < 40; n++) {
        const bytes = await sharp(png)
          .extract({ left: n * 344, top: 0, width: 344, height: 395 })
          .raw()
          .toBuffer();
        drawings.add(createHash('sha256').update(bytes).digest('hex'));
        // No opaque white matte may remain in the upper outside corner.
        expect(bytes[3]).toBe(0);
      }
      expect(drawings.size).toBe(40);
    }
    const c = read('content/characters/ibn-al-haytham.json'),
      old = read(`${source}/original/character.json`);
    expect(c.loop).toBe(old.loop);
    expect(
      c.script.map(
        ({ at: _at, z: _z, ...s }: { at: number[]; z: number }) => s,
      ),
    ).toEqual(
      old.script.map(
        ({ at: _at, z: _z, ...s }: { at: number[]; z: number }) => s,
      ),
    );
    for (const key of [
      'name',
      'aliases',
      'bio',
      'story',
      'sources',
      'panelApproved',
    ])
      expect(c[key]).toEqual(old[key]);
  });
});
