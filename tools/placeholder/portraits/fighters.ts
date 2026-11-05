import type { PortraitDef } from './core';
import { portrait } from './face';

/* Fighters. Likeness from the reference photos the project owner supplied. */
export const FIGHTERS: Record<string, PortraitDef> = {
  'khabib-nurmagomedov': portrait({
    beardStyle: 'full',
    brow: 'thick',
    hatTexture: 'fur',
  }),
  'islam-makhachev': portrait({ hairStyle: 'buzz', beardStyle: 'trim' }),
  'kamaru-usman': portrait({
    hairStyle: 'buzz',
    beardStyle: 'trim',
    nose: 'broad',
    lips: 'full',
  }),
  'khamzat-chimaev': portrait({
    hairStyle: 'buzz',
    beardStyle: 'full',
    brow: 'thick',
  }),
  'zabit-magomedsharipov': portrait({ beardStyle: 'trim', brow: 'medium' }),
  'muhammad-ali': portrait({ hairStyle: 'buzz', nose: 'broad', lips: 'full' }),
};
