import { roomSchema, type Character } from '../packages/shared/schema';
import {
  upgradeSportsCharacters,
  upgradeSportsRoom,
} from './placeholder/scenes/sports-upgrade';
import { DARK_ROOM } from '../packages/shared/dark-room';
import { files, readJson, writeJson } from './build/io';

const room = roomSchema.parse(await readJson('rooms/mosque-garden.tmj'));
const removed = upgradeSportsRoom(room);
await writeJson('rooms/mosque-garden.tmj', room);
for (const file of await files('content/characters', '.json')) {
  const c = (await readJson(file)) as Character;
  const updated = upgradeSportsCharacters([c])[0];
  if (JSON.stringify(updated) !== JSON.stringify(c))
    await writeJson(file, updated);
}
for (const file of await files('content/ambient', '.json')) {
  const cs = (await readJson(file)) as Character[];
  const updated = upgradeSportsCharacters(cs);
  if (JSON.stringify(updated) !== JSON.stringify(cs))
    await writeJson(file, updated);
}
const scene = await readJson('content/scenes/dark-room.json');
scene.area = [
  [41, 24],
  [53, 38],
];
await writeJson('content/scenes/dark-room.json', scene);
for (const side of ['SE', 'NE']) {
  const file = `art/sprites/anim/ibn-al-haytham__write_${side}.json`;
  const meta = await readJson(file);
  meta.density = Number(((17 * 0.23) / DARK_ROOM.scale).toFixed(6));
  await writeJson(file, meta);
}
console.log(
  `Updated sports arenas and dark room; removed ${removed.size} obsolete objects. Original artwork preserved.`,
);
