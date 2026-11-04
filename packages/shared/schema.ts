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
  cat_idle: 4,
  cat_walk: 6,
  cat_sleep: 4,
  bird_fly: 6,
  bird_peck: 4,
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
  })
  .refine(
    (s) =>
      Boolean(s.at && s.facing && !s.path) ||
      Boolean(s.path && !s.at && !s.facing),
    'Use at + facing OR a path',
  );
export type Step = z.infer<typeof stepSchema>;
export const characterSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['person', 'cat', 'bird']).default('person'),
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
  bio: z.record(z.string()).optional(),
  story: z.record(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  panelApproved: z.boolean().optional(),
  variant: z.object({ fromTemplate: z.string(), seed: z.number() }).optional(),
});
export type Character = z.infer<typeof characterSchema>;
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
export type FrameMeta = {
  frame: { x: number; y: number; w: number; h: number };
  anchor: [number, number];
  bounds: { x: number; y: number; width: number; height: number };
  hitMask: string;
};
export type BakedCharacter = Character & {
  frames: Record<string, string[]>;
  loopBounds: { x: number; y: number; width: number; height: number };
  interactive: boolean;
  needsPanelReview: boolean;
  shadowFrame?: string;
};
export type Sortable = {
  frame: string;
  x: number;
  y: number;
  depth: number;
  objectId: number;
  tile: [number, number];
  footprint: [number, number];
  animation?: string[];
};
export type Manifest = {
  width: number;
  height: number;
  chunkSize: number;
  chunks: { x: number; y: number; url: string }[];
  lod: { scale: number; tiles: { x: number; y: number; url: string }[] }[];
  atlases: string[];
  sortables: Sortable[];
  characters: BakedCharacter[];
  i18n: Record<string, string>;
  buildHash: string;
  room: Room;
};
