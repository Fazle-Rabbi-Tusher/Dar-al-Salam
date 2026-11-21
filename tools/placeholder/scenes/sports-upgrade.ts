import type {
  Character,
  Room,
  RoomObject,
} from '../../../packages/shared/schema';
import { SPORTS, updateSportsCharacter } from '../../../packages/shared/sports';
import { DARK_ROOM, darkRoomTile } from '../../../packages/shared/dark-room';
import { TILE_SIDE } from '../../../packages/shared/planet';

const arenas: [
  string,
  { tile: [number, number]; footprint: [number, number] },
][] = [
  ['sports-cricket-stadium', SPORTS.cricket],
  ['sports-basketball-court', SPORTS.basketball],
  ['sports-boxing-ring', SPORTS.boxing],
  ['sports-mma-octagon', SPORTS.mma],
];
const intersects = (
  o: RoomObject,
  tile: [number, number],
  fp: [number, number],
) =>
  o.x < tile[0] + fp[0] &&
  o.x + o.footprint[0] > tile[0] &&
  o.y < tile[1] + fp[1] &&
  o.y + o.footprint[1] > tile[1];

/** Idempotent migration of the reviewed room; never regenerates unrelated art/layout. */
export function upgradeSportsRoom(room: Room) {
  const layer = room.layers.find((l) => l.type === 'objectgroup');
  if (layer?.type !== 'objectgroup') throw Error('Missing world object layer');
  const removed = new Set<number>();
  const keep = layer.objects.filter((o) => {
    if (o.type.startsWith('sports-')) return true;
    const kitchen =
      o.x >= 39 &&
      o.x <= 56 &&
      o.y >= 24 &&
      o.y < 38 &&
      /^m-(kitchen-counter|fridge|food-shelf|dining-table|water-cooler)$/.test(
        o.type,
      );
    const obsolete =
      o.type.startsWith('sup-dr-') ||
      /^m-(ambulance-centre|hospital-stand|basketball-court|hoop|cricket-pitch|cricket-stumps|octagon-mat|cage-.+|ring-base|ring-ropes.*|ring-steps|corner-stool)$/.test(
        o.type,
      ) ||
      (o.y > 110 && /^m-presentation-(stage|backdrop)$/.test(o.type));
    const sportsPlot =
      intersects(o, SPORTS.cricket.tile, SPORTS.cricket.footprint) ||
      intersects(o, SPORTS.basketball.tile, SPORTS.basketball.footprint);
    if (kitchen || obsolete || sportsPlot) {
      removed.add(o.id);
      return false;
    }
    return true;
  });
  let id = Math.max(...layer.objects.map((o) => o.id)) + 1;
  for (const [type, s] of arenas)
    if (!keep.some((o) => o.type === type))
      keep.push({
        id: id++,
        type,
        x: s.tile[0],
        y: s.tile[1],
        footprint: s.footprint,
        walkable: true,
        z: 0,
      });
  const retired = layer.objects.filter((o) => removed.has(o.id));
  layer.objects = keep;
  for (const l of room.layers)
    if (l.type === 'tilelayer') {
      if (l.name === 'collision') {
        // Removed supports must not leave invisible walls. Explicit old plots
        // also handle rerunning a partially completed migration. Retained
        // solids are restored below, preserving neighboring collisions.
        for (const o of retired)
          for (
            let y = Math.max(0, Math.floor(o.y));
            y < Math.min(room.height, o.y + o.footprint[1]);
            y++
          )
            for (
              let x = Math.max(0, Math.floor(o.x));
              x < Math.min(room.width, o.x + o.footprint[0]);
              x++
            )
              l.data[y * room.width + x] = 0;
        for (let y = 0; y < room.height; y++)
          for (let x = 0; x < room.width; x++) {
            const inArena = arenas.some(
              ([, s]) =>
                x >= Math.floor(s.tile[0] - 1) &&
                x < s.tile[0] + s.footprint[0] + 1 &&
                y >= Math.floor(s.tile[1] - 1) &&
                y < s.tile[1] + s.footprint[1] + 1,
            );
            const inKitchen = x >= 39 && x <= 56 && y >= 24 && y < 38;
            const inOldRoom = x >= 14 && x < 27 && y >= 96 && y < 123;
            const inOldStand = x >= 93 && x < 96 && y >= 17 && y < 20;
            const inOldPodium = x >= 63 && x < 69 && y >= 113 && y < 116;
            if (inArena || inKitchen || inOldRoom || inOldStand || inOldPodium)
              l.data[y * room.width + x] = 0;
          }
        for (const o of keep)
          if (!o.walkable)
            for (
              let y = Math.max(0, Math.floor(o.y));
              y < Math.min(room.height, o.y + o.footprint[1]);
              y++
            )
              for (
                let x = Math.max(0, Math.floor(o.x));
                x < Math.min(room.width, o.x + o.footprint[0]);
                x++
              )
                l.data[y * room.width + x] = 1;
      }
      if (l.name === 'floor')
        for (let y = 0; y < room.height; y++)
          for (let x = 0; x < room.width; x++) {
            if (x >= 39 && x <= 56 && y >= 24 && y < 38)
              l.data[y * room.width + x] = 8;
            if (x >= 70 && x <= 94 && y >= 99 && y < 124)
              l.data[y * room.width + x] = 7;
            if (x >= 68 && x < 81 && y >= 35 && y < 45)
              l.data[y * room.width + x] = 8;
          }
    }
  return removed;
}
export const removedSportsAmbient = (c: Character) =>
  ['amb-stadium-ambulance', 'amb-cricket-amla-ball'].includes(c.id) ||
  /^amb-(cook|diner|kitchen)/.test(c.id);
export function upgradeSportsCharacters(characters: Character[]) {
  const kept = characters.filter((c) => !removedSportsAmbient(c));
  for (let i = 0; i < kept.length; i++) {
    let c = updateSportsCharacter(kept[i]);
    if (c.id === 'hakim-ziyech')
      c = { ...c, script: c.script.map((s) => ({ ...s, at: [85, 29.8] })) };
    if (c.id === 'ibn-al-haytham')
      c = {
        ...c,
        script: [
          {
            from: 0,
            to: 120,
            action: 'write',
            at: darkRoomTile(2.45, 1.25),
            facing: 'SE',
            z: 0.23 * DARK_ROOM.scale * TILE_SIDE,
          },
        ],
      };
    if (
      c.pairWith &&
      characters.some((p) => p.id === c.pairWith && removedSportsAmbient(p))
    )
      delete c.pairWith;
    kept[i] = c;
  }
  return kept;
}
