import { readJson, writeJson } from './build/io';
import { roomSchema, characterSchema } from '../packages/shared/schema';
import { DARK_ROOM, darkRoomTile } from '../packages/shared/dark-room';
import { PODCAST, podcastScript } from '../packages/shared/podcast';
import { TILE_SIDE } from '../packages/shared/planet';
import { upgradePodcastRoom } from './placeholder/scenes/podcast-upgrade';

// Move the existing authored scenes, keeping object IDs, equipment, performers,
// animation durations and all unrelated room objects/content untouched.
const room = roomSchema.parse(await readJson('rooms/mosque-garden.tmj'));
upgradePodcastRoom(room);
await writeJson('rooms/mosque-garden.tmj', room);
for (const id of ['ibn-al-haytham', 'omar-suleiman', 'mehdi-hasan']) {
  const file = `content/characters/${id}.json`,
    c = characterSchema.parse(await readJson(file));
  if (id === 'ibn-al-haytham')
    c.script = c.script.map((s) => ({
      ...s,
      at: darkRoomTile(2.45, 1.25),
      z: 0.23 * DARK_ROOM.scale * TILE_SIDE,
    }));
  else c.script = podcastScript(id)!;
  await writeJson(file, c);
}
for (const [id, area] of [
  ['dark-room', DARK_ROOM.area],
  ['podcast', PODCAST.area],
] as const) {
  const file = `content/scenes/${id}.json`,
    scene = await readJson(file);
  await writeJson(file, { ...scene, area });
}
console.log(
  'Swapped the complete optical chamber and podcast studio, scene bounds and navigation anchors.',
);
