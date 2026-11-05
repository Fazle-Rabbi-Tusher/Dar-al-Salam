import type { PortraitDef } from './core';
import { portrait } from './face';

/*
 * Today's Islamic scholars and modern scientists and architects. Likeness
 * from well-known public appearance (and photos where supplied).
 */
export const TODAY: Record<string, PortraitDef> = {
  'mufti-ismail-menk': portrait({ beardStyle: 'full', hatTexture: 'knit' }),
  'hamza-yusuf': portrait({ beardStyle: 'full', age: 2, hatTexture: 'wrap' }),
  'omar-suleiman': portrait({
    hairStyle: 'straight',
    beardStyle: 'full',
    brow: 'thick',
  }),
  'habib-umar-bin-hafiz': portrait({
    beardStyle: 'full',
    age: 2,
    hatTexture: 'wrap',
  }),
  'ahmed-zewail': portrait({ hairStyle: 'swept', age: 2, smileLines: true }),
  'aziz-sancar': portrait({
    hairStyle: 'straight',
    age: 2,
    glasses: '#62676E',
  }),
  'fazlur-rahman-khan': portrait({
    hairStyle: 'swept',
    age: 1,
    glasses: '#3B322E',
  }),
  'zaha-hadid': portrait({
    hairStyle: 'straight',
    brow: 'thick',
    nose: 'large',
    lips: 'full',
  }),
};
