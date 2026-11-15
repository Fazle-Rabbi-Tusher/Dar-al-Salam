import {
  characterSchema,
  type Character,
  type Room,
} from '../../../packages/shared/schema';
import { PODCAST, podcastScript } from '../../../packages/shared/podcast';

/** Draft public likeness; photo verification is recorded as pending in docs. */
export const MEHDI_CARD = characterSchema.parse({
  id: 'mehdi-hasan',
  kind: 'person',
  name: { en: 'Mehdi Hasan', ar: 'مهدي حسن', bn: 'মেহদি হাসান' },
  familyName: 'Hasan',
  aliases: ['Mehedi Hassan', 'Mehdi Hassan'],
  place: 'United Kingdom · United States',
  district: 'modern-quarter',
  depiction: 'full',
  look: {
    base: 'adult-man-clean',
    garment: 'suit',
    headwear: 'none',
    prop: 'none',
    colours: {
      skin: 'skin-4',
      hair: 'hair-black',
      garmentPrimary: 'navy',
      garmentSecondary: 'lab-white',
      headwear: 'white-linen',
      prop: 'cocoa',
    },
  },
  loop: 240,
  script: podcastScript('mehdi-hasan'),
  bio: {
    en: 'PLACEHOLDER — to be researched',
    ar: 'PLACEHOLDER — to be researched',
    bn: 'PLACEHOLDER — to be researched',
  },
  story: {
    en: 'PLACEHOLDER — to be researched',
    ar: 'PLACEHOLDER — to be researched',
    bn: 'PLACEHOLDER — to be researched',
  },
  sources: [
    'PLACEHOLDER source 1 — research pending',
    'PLACEHOLDER source 2 — research pending',
  ],
  summary: {
    en: 'British-American journalist and interviewer. This illustrative podcast scene and his character likeness are drafts awaiting review.',
  },
  links: [
    { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Mehdi_Hasan' },
    { label: 'Zeteo', url: 'https://zeteo.com/' },
  ],
  panelApproved: false,
});

/** Idempotent migration of the reviewed room, preserving unrelated objects. */
export function upgradePodcastRoom(room: Room) {
  const layer = room.layers.find((l) => l.type === 'objectgroup'),
    collision = room.layers.find((l) => l.name === 'collision');
  if (layer?.type !== 'objectgroup' || collision?.type !== 'tilelayer')
    throw Error('Missing room layers');
  for (const o of layer.objects)
    if (/^m-goal-(west|east)$/.test(o.type)) {
      for (let y = Math.floor(o.y); y < o.y + o.footprint[1]; y++)
        for (let x = Math.floor(o.x); x < o.x + o.footprint[0]; x++)
          collision.data[y * room.width + x] = 0;
      o.x = o.type.endsWith('west') ? 65.7 : 90.5;
      o.y = 19.2;
      o.footprint = [1.8, 7.6];
      o.walkable = true;
    }
  let id = Math.max(...layer.objects.map((o) => o.id)) + 1;
  for (const o of [
    {
      type: 'podcast-studio',
      x: PODCAST.tile[0],
      y: PODCAST.tile[1],
      footprint: PODCAST.footprint,
      walkable: true,
    },
    {
      type: 'podcast-wall',
      x: 14,
      y: 100,
      footprint: [16, 0.25],
      walkable: false,
    },
    {
      type: 'podcast-wall-side',
      x: 14,
      y: 100.25,
      footprint: [0.25, 11.75],
      walkable: false,
    },
  ] as const)
    if (!layer.objects.some((p) => p.type === o.type))
      layer.objects.push({ ...o, id: id++, footprint: [...o.footprint], z: 0 });
  for (const o of layer.objects)
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
          collision.data[y * room.width + x] = 1;
}

export function upgradePodcastCharacters(characters: Character[]) {
  const result = characters.map((c) => {
    const script = podcastScript(c.id);
    return script ? { ...c, loop: 240 as const, script } : c;
  });
  if (!result.some((c) => c.id === MEHDI_CARD.id))
    result.push(structuredClone(MEHDI_CARD));
  return result;
}
