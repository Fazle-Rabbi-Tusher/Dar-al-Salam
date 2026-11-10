import { portrait } from './face';
import type { PortraitDef } from './core';

/*
 * The congregational prayer (Baitul Mukarram plaza hall). Yasser al-Dosari,
 * after the owner's prayer-library pack: a dark, neat beard, rimless-looking
 * thin glasses and a calm, concentrated face. His white ghutra comes from
 * his look.
 */
export const PRAYER: Record<string, PortraitDef> = {
  'yasser-al-dosari': portrait({
    hairStyle: 'straight',
    beardStyle: 'full',
    brow: 'medium',
    lids: 'heavy',
    nose: 'medium',
    lips: 'medium',
    age: 0,
    glasses: '#5E6668',
    moustache: true,
    hatTexture: 'cloth',
  }),
};
