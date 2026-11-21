import { readJson, writeJson } from './build/io';
import { roomSchema, characterSchema } from '../packages/shared/schema';
import {
  upgradePodcastRoom,
  upgradePodcastCharacters,
} from './placeholder/scenes/podcast-upgrade';

const room = roomSchema.parse(await readJson('rooms/mosque-garden.tmj'));
upgradePodcastRoom(room);
await writeJson('rooms/mosque-garden.tmj', room);
const omar = characterSchema.parse(
  await readJson('content/characters/omar-suleiman.json'),
);
for (const c of upgradePodcastCharacters([omar]))
  await writeJson(`content/characters/${c.id}.json`, c);
console.log(
  'Updated the goal mouths and podcast studio, with both seated performances.',
);
