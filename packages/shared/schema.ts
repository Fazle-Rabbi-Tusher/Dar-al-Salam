import { z } from 'zod';
export const ACTIONS = {
  idle: 4,
  walk: 6,
  talk: 4,
  sit: 2,
  read: 4,
  write: 4,
  carry: 6,
  pour: 6,
  sweep: 6,
  wave: 4,
  teach: 4,
  pray: 8,
  celebrate: 4,
  cheer: 4,
  'cross-arms': 4,
  kick: 4,
  dive: 4,
  slide: 4,
  'arms-out': 4,
  'hand-on-heart': 4,
  guard: 4,
  punch: 4,
  'belt-pose': 4,
  taunt: 4,
  lie: 2,
  ride: 4,
  speech: 4,
  /** Prostration held still (sujood after a goal); flagged for panel review. */
  sujood: 2,
  /** Cricket cover drive. */
  bat: 4,
  cat_idle: 4,
  cat_walk: 6,
  cat_sleep: 4,
  bird_fly: 6,
  bird_peck: 4,
  ball_roll: 4,
  ball_still: 1,
  vehicle_drive: 2,
  /** Animals (camel, donkey, goat, gazelle, fish): stand, walk or swim, graze. */
  animal_idle: 4,
  animal_walk: 6,
  animal_graze: 4,
  animal_rest: 4,
  vehicle_sail: 2,
  vehicle_stop: 2,
} as const;
export type Action = keyof typeof ACTIONS;
export const facingSchema = z.enum(['SE', 'SW', 'NE', 'NW']);
export type Facing = z.infer<typeof facingSchema>;
export const pointSchema = z.tuple([z.number(), z.number()]);
export const lookSchema = z.object({
  base: z.string(),
  garment: z.string(),
  headwear: z.string(),
  prop: z.string(),
  colours: z.record(z.string()),
});
export type Look = z.infer<typeof lookSchema>;
export const stepSchema = z
  .object({
    from: z.number().int().nonnegative(),
    to: z.number().int().positive(),
    action: z.enum(Object.keys(ACTIONS) as [Action, ...Action[]]),
    at: pointSchema.optional(),
    facing: facingSchema.optional(),
    path: z.array(pointSchema).min(2).optional(),
    z: z.union([z.number(), z.array(z.number())]).optional(),
    /** Prop held during this step only (e.g. a trophy or keys changing hands). */
    prop: z.string().optional(),
  })
  .refine(
    (s) =>
      Boolean(s.at && s.facing && !s.path) ||
      Boolean(s.path && !s.at && !s.facing),
    'Use at + facing OR a path',
  );
export type Step = z.infer<typeof stepSchema>;
const linksSchema = z
  .array(
    z.object({
      label: z.string(),
      url: z.string().url().startsWith('https://'),
    }),
  )
  .optional();
export const characterSchema = z.object({
  id: z.string().min(1),
  kind: z
    .enum(['person', 'cat', 'bird', 'ball', 'vehicle', 'animal'])
    .default('person'),
  name: z.record(z.string()).optional(),
  aliases: z.array(z.string()).default([]),
  years: z.string().optional(),
  place: z.string().optional(),
  district: z.string().default('mosque-garden'),
  depiction: z.enum(['full', 'back']).default('full'),
  look: lookSchema,
  loop: z.union([z.literal(60), z.literal(120), z.literal(240)]),
  script: z.array(stepSchema).min(1),
  pairWith: z.string().optional(),
  /** Id of a figure this one leads on a rope (a guide leading a camel). */
  leads: z.string().optional(),
  bio: z.record(z.string()).optional(),
  story: z.record(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  /** Short, unreviewed quick facts shown on the card until research is done. */
  summary: z.record(z.string()).optional(),
  /** Further reading opened in a new tab (never fetched by the app). */
  links: linksSchema,
  panelApproved: z.boolean().optional(),
  variant: z.object({ fromTemplate: z.string(), seed: z.number() }).optional(),
  /** Short description of what an ambient person is doing (hover label). */
  role: z.string().optional(),
});
export type Character = z.infer<typeof characterSchema>;
/**
 * A clickable building with its own story card (supplied art under
 * art/landmarks). It may stand anywhere on the planet, outside the quarter.
 */
export const landmarkSchema = z.object({
  id: z.string().min(1),
  name: z.record(z.string()),
  years: z.string().optional(),
  place: z.string().optional(),
  /** Ground point in planet tile coordinates (front centre of the base). */
  tile: pointSchema,
  /** Key in art/landmarks/index.json. */
  art: z.string(),
  bio: z.record(z.string()).optional(),
  story: z.record(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  summary: z.record(z.string()).optional(),
  links: linksSchema,
  panelApproved: z.boolean().optional(),
});
export type Landmark = z.infer<typeof landmarkSchema>;
/**
 * A scene shown as one group, as on Floor796: clicking any of its people or
 * props opens the lead's story card with the whole scene in view, lit up
 * together under one caption (hovering alone changes nothing).
 */
export const sceneSchema = z.object({
  id: z.string().min(1),
  /** Caption over the highlighted group, per language. */
  title: z.record(z.string()),
  /** Named character whose card a click opens. */
  lead: z.string(),
  /** Every character in the scene, the lead included. */
  members: z.array(z.string()).min(1),
  /** Room object types that belong to the scene, inside `area`. */
  props: z.array(z.string()).default([]),
  /** Tile rectangle [[x0, y0], [x1, y1]] holding the scene's props. */
  area: z.tuple([pointSchema, pointSchema]),
});
export type Scene = z.infer<typeof sceneSchema>;
export const objectSchema = z.object({
  id: z.number(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  footprint: pointSchema,
  walkable: z.boolean(),
  z: z.number().default(0),
});
export const roomSchema = z.object({
  type: z.literal('map'),
  orientation: z.literal('isometric'),
  tilewidth: z.literal(32),
  tileheight: z.literal(16),
  width: z.number(),
  height: z.number(),
  layers: z.array(
    z.union([
      z.object({
        name: z.string(),
        type: z.literal('tilelayer'),
        data: z.array(z.number().int()),
      }),
      z.object({
        name: z.string(),
        type: z.literal('objectgroup'),
        objects: z.array(objectSchema),
      }),
    ]),
  ),
});
export type Room = z.infer<typeof roomSchema>;
export type RoomObject = z.infer<typeof objectSchema>;
const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});
export const frameMetaSchema = z.object({
  frame: z.object({
    x: z.number().int(),
    y: z.number().int(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  }),
  anchor: pointSchema,
  bounds: rectSchema,
  hitMask: z.string(),
  /** Sprite pixels per world pixel (2 for named characters' sharp heads). */
  density: z.number().int().positive().optional(),
  /** A supplied still sprite the engine animates (packages/shared/motion.ts). */
  still: z.boolean().optional(),
  /** Supplied animation strip frame: world ticks per frame (motion.ts). */
  tempo: z.number().int().positive().optional(),
});
export type FrameMeta = z.infer<typeof frameMetaSchema>;
export const bakedCharacterSchema = characterSchema.extend({
  frames: z.record(z.array(z.string()).min(1)),
  loopBounds: rectSchema,
  interactive: z.boolean(),
  needsPanelReview: z.boolean(),
  shadowFrame: z.string().optional(),
  /** Frame keys the engine draws flipped left-right (mirrored at runtime). */
  mirror: z.array(z.string()).optional(),
  /** Close-up of the sharp head for the story card (named characters). */
  portrait: z.string().optional(),
  /** Smooth illustrated portrait for the story card, when one is drawn. */
  illustration: z.string().optional(),
  /** Owner-supplied pictures of the person at work, shown on the card. */
  gallery: z.array(z.string()).optional(),
  /**
   * Eight turnaround views (S, SE, E, NE, N, NW, W, SW on screen) per action
   * ('*' for the rest), each a list of frames: the engine shows the view
   * matching the way the figure heads and steps through its frames.
   */
  dir8: z.record(z.array(z.array(z.string()).min(1)).length(8)).optional(),
  /** Scene this figure belongs to (content/scenes): highlighted together. */
  scene: z.string().optional(),
});
export type BakedCharacter = z.infer<typeof bakedCharacterSchema>;
export const sortableSchema = z.object({
  frame: z.string(),
  x: z.number(),
  y: z.number(),
  depth: z.number(),
  objectId: z.number(),
  tile: pointSchema,
  footprint: pointSchema,
  animation: z.array(z.string()).optional(),
  /** Frames per animation cycle (default 60), so a scene can sync to the loop. */
  period: z.number().int().positive().optional(),
  /** Tile point where this sprite touches the ground (front boundary for strips). */
  ground: pointSchema,
  /** Pixel in the frame that sits on the ground point. */
  pivot: pointSchema,
  /** Height above the ground in world px (raised platforms). */
  lift: z.number().default(0),
  /** Landmark id: clicking this sprite opens that landmark's card. */
  landmark: z.string().optional(),
  /** Scene this prop belongs to (content/scenes): highlighted with its people. */
  scene: z.string().optional(),
});
export type Sortable = z.infer<typeof sortableSchema>;
export const manifestSchema = z.object({
  width: z.literal(4096),
  height: z.literal(4096),
  /** Top-down floor of the mapped quarter in tile space, wrapped onto the planet. */
  ground: z.object({
    url: z.string(),
    texelsPerTile: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  atlases: z.array(z.string()),
  sortables: z.array(sortableSchema),
  characters: z.array(bakedCharacterSchema),
  landmarks: z
    .array(
      landmarkSchema.extend({
        /** Smaller copy of the art for the card header. */
        illustration: z.string().optional(),
      }),
    )
    .default([]),
  scenes: z.array(sceneSchema).default([]),
  i18n: z.record(z.string()),
  buildHash: z.string(),
  room: roomSchema,
});
export type Manifest = z.infer<typeof manifestSchema>;
