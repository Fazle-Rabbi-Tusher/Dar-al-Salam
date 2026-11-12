import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITY_DENSITY_OBJECTS, CITY_ROAD_DETAILS } from './city';
import { MODERN_OBJECTS } from '../modern';
import { infrastructureKind } from '../../../packages/shared/infrastructure';
import { characterSchema, roomSchema } from '../../../packages/shared/schema';
import { scriptErrors } from '../../../packages/shared/script';
const room = roomSchema.parse(
  JSON.parse(readFileSync('rooms/mosque-garden.tmj', 'utf8')),
);
const objects = room.layers.flatMap((l) =>
  l.type === 'objectgroup' ? l.objects : [],
);
const footprint = (type: string) => {
  const side = type.endsWith('-side');
  const p = MODERN_OBJECTS[side ? type.slice(0, -5) : type].footprint;
  return side ? [p[1], p[0]] : p;
};
describe('reference city streets', () => {
  it('persists every authored addition without overlapping existing solid objects', () => {
    for (const [type, x, y] of CITY_DENSITY_OBJECTS) {
      const a = objects.find((o) => o.type === type && o.x === x && o.y === y);
      expect(a, `${type} at ${x},${y}`).toBeDefined();
      expect(a!.footprint).toEqual(footprint(type));
      for (const b of objects) {
        if (a!.id === b.id || b.walkable) continue;
        const overlap =
          x < b.x + b.footprint[0] &&
          x + a!.footprint[0] > b.x &&
          y < b.y + b.footprint[1] &&
          y + a!.footprint[1] > b.y;
        expect(overlap, `${a!.id} ${type} overlaps ${b.id} ${b.type}`).toBe(
          false,
        );
      }
    }
  });
  it('puts cars on asphalt, buildings off the roads and painted markings on walkable surfaces', () => {
    const floor = room.layers.find((l) => l.name === 'floor');
    if (floor?.type !== 'tilelayer') throw Error('Missing floor');
    for (const [type, x, y] of CITY_DENSITY_OBJECTS) {
      const [w, d] = footprint(type),
        kind = infrastructureKind(type);
      if (kind === 'traffic-signal') continue;
      for (let yy = Math.floor(y); yy < y + d; yy++)
        for (let xx = Math.floor(x); xx < x + w; xx++)
          expect(
            floor.data[yy * room.width + xx] === 12,
            `${type} at ${xx},${yy}`,
          ).toBe(kind === 'electric-car');
    }
    for (const [type, x, y] of CITY_ROAD_DETAILS)
      expect(
        objects.find((o) => o.type === type && o.x === x && o.y === y)
          ?.walkable,
      ).toBe(true);
  });
  it('leaves the existing scooter route unobstructed', () => {
    const collision = room.layers.find((l) => l.name === 'collision');
    if (collision?.type !== 'tilelayer') throw Error('Missing collision');
    for (const o of objects)
      if (!o.walkable)
        for (let y = Math.floor(o.y); y < o.y + o.footprint[1]; y++)
          for (let x = Math.floor(o.x); x < o.x + o.footprint[0]; x++)
            collision.data[y * room.width + x] = 1;
    const rider = characterSchema.parse(
      JSON.parse(
        readFileSync('content/characters/zohran-mamdani.json', 'utf8'),
      ),
    );
    expect(scriptErrors(rider, room)).toEqual([]);
  });
});
