import fs from 'node:fs';
import { z } from 'zod';
import { variantLook } from './variants';
import {
  characterSchema,
  landmarkSchema,
  roomSchema,
  sceneSchema,
  type Character,
  type Landmark,
  type Room,
  type Scene,
} from '../../packages/shared/schema';
import { forbiddenName, type Rules } from '../../packages/shared/rules';
import { scriptErrors } from '../../packages/shared/script';
import { resolveFrame, type Part } from '../../packages/shared/compositor';
import { ACTIONS } from '../../packages/shared/schema';
import { readJson, files } from './io';
export type Wardrobe = Record<
  string,
  { region: string; era: string; garments: string[]; headwear: string[] }
>;
/** Landmark cards follow the same card rules as named characters. */
export function validateLandmark(l: Landmark, rules: Rules, prod: boolean) {
  const errors: string[] = [];
  // Buildings are not depictions, but their names still pass the denylist so
  // a card can never be used to name a prohibited person.
  for (const name of [l.id, ...Object.values(l.name)])
    if (forbiddenName(name, rules))
      errors.push(`never-depict rule rejects landmark name/id: ${name}`);
  if ((l.sources?.length ?? 0) < 2)
    errors.push('Landmark cards need at least two sources');
  if (prod && l.panelApproved !== true)
    errors.push(
      'panelApproved must be true in production; advisory review is required',
    );
  if (errors.length) throw Error(`${l.id}: ${errors.join('; ')}`);
}
export function validateCharacter(
  c: Character,
  rules: Rules,
  room: Room,
  parts: Record<string, Part>,
  wardrobe: Wardrobe,
  prod: boolean,
) {
  const errors: string[] = [],
    warnings: string[] = [];
  for (const name of [c.id, ...Object.values(c.name ?? {}), ...c.aliases])
    if (forbiddenName(name, rules))
      errors.push(`never-depict rule rejects name/alias/id: ${name}`);
  if (c.name) {
    if ((c.sources?.length ?? 0) < 2)
      errors.push('Named cards need at least two sources');
    if (prod && c.panelApproved !== true)
      errors.push(
        'panelApproved must be true in production; advisory review is required',
      );
  }
  errors.push(...scriptErrors(c, room));
  const w = wardrobe[c.district];
  if (
    !w ||
    !w.garments.includes(c.look.garment) ||
    !w.headwear.includes(c.look.headwear)
  )
    (prod ? errors : warnings).push(`Wardrobe invalid for ${c.district}`);
  for (const step of c.script) {
    if (['bowl', 'catch', 'shoot', 'dunk', 'dribble'].includes(step.action)) {
      for (const view of ['SE', 'NE'])
        if (
          !fs.existsSync(
            `art/sprites/anim/${c.strip ?? c.id}__${step.action}_${view}.png`,
          )
        )
          errors.push(`Missing authored sports strip ${step.action}/${view}`);
    }
    const facings = step.path
      ? (['SE', 'SW', 'NE', 'NW'] as const)
      : [step.facing!];
    for (const id of [
      c.look.base,
      c.look.garment,
      c.look.headwear,
      c.look.prop,
    ])
      // Figures with an eight-view sheet (art/sprites/dir8) need no parts.
      if (
        id !== 'none' &&
        !(id === c.look.base && fs.existsSync(`art/sprites/dir8/${id}.json`))
      ) {
        if (!parts[id]) {
          errors.push(`Unknown part ${id}`);
          continue;
        }
        for (const f of facings)
          for (let i = 0; i < ACTIONS[step.action]; i++)
            try {
              resolveFrame(parts[id], step.action, f, i);
            } catch (e) {
              errors.push(String(e));
            }
      }
  }
  if (errors.length)
    throw Error(`${c.id}:\n  ${[...new Set(errors)].join('\n  ')}`);
  return warnings.map((w) => `${c.id}: ${w}`);
}
export async function loadContent() {
  const colour = z.string().regex(/^#[A-Fa-f0-9]{6}$/);
  const keys = z
    .record(z.array(colour).min(2))
    .parse(await readJson('content/palettes/key-colours.json'));
  const ramps = z
    .record(z.array(colour).min(2))
    .parse(await readJson('content/palettes/ramps.json'));
  const palette = z
    .array(colour)
    .parse(await readJson('content/palettes/world-palette.json'));
  const rules = z
    .object({
      comment: z.string(),
      denylist: z.array(z.string()),
      allowlist: z.array(z.string()),
    })
    .parse(await readJson('content/rules/never-depict.json'));
  const wardrobe = z
    .record(
      z.object({
        region: z.string(),
        era: z.string(),
        garments: z.array(z.string()),
        headwear: z.array(z.string()),
      }),
    )
    .parse(await readJson('content/wardrobe.json'));
  const characters: Character[] = [];
  for (const p of await files('content/characters', '.json')) {
    const card = characterSchema.parse(await readJson(p));
    if (!card.name) throw Error(`${p}: named cards require a translated name`);
    characters.push(card);
  }
  for (const p of await files('content/ambient', '.json'))
    characters.push(
      ...z.array(characterSchema).parse(
        (
          (await readJson(p)) as {
            look?: unknown;
            variant?: { fromTemplate: string; seed: number };
          }[]
        ).map((c) =>
          c.look
            ? c
            : {
                ...c,
                look: c.variant
                  ? variantLook(c.variant.fromTemplate, c.variant.seed)
                  : undefined,
              },
        ),
      ),
    );
  const room = roomSchema.parse(await readJson('rooms/mosque-garden.tmj'));
  for (const l of room.layers)
    if (l.type === 'tilelayer' && l.data.length !== room.width * room.height)
      throw Error(`${l.name}: wrong tile layer length`);
  const collision = room.layers.find((l) => l.name === 'collision');
  const objects = room.layers.find((l) => l.type === 'objectgroup');
  if (collision?.type === 'tilelayer' && objects?.type === 'objectgroup')
    for (const o of objects.objects)
      if (!o.walkable)
        for (let y = Math.floor(o.y); y < o.y + o.footprint[1]; y++)
          for (let x = Math.floor(o.x); x < o.x + o.footprint[0]; x++)
            collision.data[y * room.width + x] = 1;
  const ids = new Set<string>();
  for (const c of characters) {
    if (ids.has(c.id)) throw Error(`Duplicate id ${c.id}`);
    ids.add(c.id);
  }
  for (const c of characters)
    if (c.pairWith && !ids.has(c.pairWith))
      throw Error(`${c.id}: missing pair ${c.pairWith}`);
  for (const c of characters)
    if (c.leads && !ids.has(c.leads))
      throw Error(`${c.id}: leads a missing figure ${c.leads}`);
  for (const p of await files('content/i18n', '.json'))
    z.record(z.string()).parse(await readJson(p));
  const landmarks: Landmark[] = [];
  for (const p of await files('content/landmarks', '.json')) {
    const l = landmarkSchema.parse(await readJson(p));
    if (ids.has(l.id)) throw Error(`Duplicate id ${l.id}`);
    ids.add(l.id);
    landmarks.push(l);
  }
  // Scenes (Floor796-style groups): every member and the lead must exist,
  // and the lead must be a named character with a card to open.
  const scenes: Scene[] = [];
  for (const p of await files('content/scenes', '.json').catch(() => [])) {
    const sc = sceneSchema.parse(await readJson(p));
    for (const m of [sc.lead, ...sc.members])
      if (!characters.some((c) => c.id === m))
        throw Error(`Scene ${sc.id}: unknown member ${m}`);
    if (!characters.find((c) => c.id === sc.lead)?.name)
      throw Error(`Scene ${sc.id}: lead ${sc.lead} has no card`);
    if (!sc.members.includes(sc.lead))
      throw Error(`Scene ${sc.id}: the lead must be a member`);
    scenes.push(sc);
  }
  return {
    keys,
    ramps,
    palette,
    rules,
    wardrobe,
    characters,
    room,
    landmarks,
    scenes,
  };
}
