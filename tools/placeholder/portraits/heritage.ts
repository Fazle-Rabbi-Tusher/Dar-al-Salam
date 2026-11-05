import type { PortraitDef } from './core';
import { portrait } from './face';

/*
 * Golden-age scholars. No photographs exist: looks follow traditional
 * portraits, statues and stamps, and are kept distinct from one another.
 */
export const HERITAGE: Record<string, PortraitDef> = {
  'ibn-sina': portrait({ beardStyle: 'full', age: 1, hatTexture: 'wrap' }),
  'al-khwarizmi': portrait({ beardStyle: 'full', age: 1, hatTexture: 'wrap' }),
  'fatima-al-fihri': portrait({ brow: 'thin', hatTexture: 'cloth' }),
  'ibn-al-haytham': portrait({
    beardStyle: 'full',
    age: 1,
    hatTexture: 'wrap',
  }),
  'al-zahrawi': portrait({ beardStyle: 'full', age: 1, hatTexture: 'wrap' }),
  'al-jazari': portrait({ beardStyle: 'full', hatTexture: 'wrap' }),
  'al-biruni': portrait({ beardStyle: 'full', age: 2, hatTexture: 'wrap' }),
  'ibn-khaldun': portrait({ beardStyle: 'full', age: 1, hatTexture: 'wrap' }),
  'ibn-rushd': portrait({ beardStyle: 'full', age: 2, hatTexture: 'wrap' }),
};
