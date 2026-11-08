import type { PortraitDef } from './core';
import { portrait } from './face';

/*
 * New stadium cards from the scene bible (batch 1b). Default likeness traits
 * until the owner supplies full-body sprites (art/sprites/README.md).
 */
export const STADIUM: Record<string, PortraitDef> = {
  'frederic-kanoute': portrait({
    hairStyle: 'buzz',
    beardStyle: 'trim',
    nose: 'broad',
    lips: 'full',
  }),
  'hakim-ziyech': portrait({ hairStyle: 'swept', beardStyle: 'trim' }),
  'yassine-bounou': portrait({ hairStyle: 'straight', beardStyle: 'full' }),
  'sofiane-boufal': portrait({ hairStyle: 'curly', beardStyle: 'trim' }),
  // Cricket ground.
  'usman-khawaja': portrait({ hairStyle: 'straight', beardStyle: 'trim' }),
  'hashim-amla': portrait({
    hairStyle: 'buzz',
    beardStyle: 'full',
    brow: 'thick',
  }),
};
