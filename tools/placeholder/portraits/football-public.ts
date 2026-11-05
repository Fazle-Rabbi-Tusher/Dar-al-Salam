import type { PortraitDef } from './core';
import { portrait } from './face';

/*
 * Footballers and public figures. Likeness from the reference photos the
 * project owner supplied (see DECISIONS.md, "Sharp heads").
 */
export const FOOTBALL_PUBLIC: Record<string, PortraitDef> = {
  'karim-benzema': portrait({
    hairStyle: 'swept',
    beardStyle: 'full',
    brow: 'thick',
    nose: 'large',
    lids: 'heavy',
  }),
  'mesut-ozil': portrait({ hairStyle: 'swept', brow: 'medium', nose: 'large' }),
  'mohamed-salah': portrait({
    hairStyle: 'curly',
    beardStyle: 'full',
    brow: 'thick',
    smileLines: true,
  }),
  'sadio-mane': portrait({
    hairStyle: 'buzz',
    beardStyle: 'trim',
    nose: 'broad',
    lips: 'full',
    smileLines: true,
  }),
  'ngolo-kante': portrait({
    hairStyle: 'buzz',
    nose: 'broad',
    lips: 'full',
    smileLines: true,
  }),
  'zohran-mamdani': portrait({
    hairStyle: 'swept',
    beardStyle: 'full',
    brow: 'thick',
    smileLines: true,
  }),
  'abdul-el-sayed': portrait({
    hairStyle: 'swept',
    beardStyle: 'trim',
    brow: 'thick',
    smileLines: true,
  }),
};
