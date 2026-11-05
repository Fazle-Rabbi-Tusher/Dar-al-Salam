import type { PortraitDef } from './core';
import { portrait } from './face';

/* Famous Muslims of Bangladesh, Malala Yousafzai, Ibn Battuta and Hakeem Olajuwon. */
export const BANGLADESH_MORE: Record<string, PortraitDef> = {
  'kazi-nazrul-islam': portrait({ hairStyle: 'curly', brow: 'thick' }),
  'begum-rokeya': portrait({ brow: 'thin', hatTexture: 'cloth' }),
  'malala-yousafzai': portrait({ brow: 'medium', hatTexture: 'cloth' }),
  'mashrafe-mortaza': portrait({ beardStyle: 'trim', brow: 'thick' }),
  'tamim-iqbal': portrait({ beardStyle: 'trim', smileLines: true }),
  'ibn-battuta': portrait({ beardStyle: 'full', hatTexture: 'wrap' }),
  'hakeem-olajuwon': portrait({
    hairStyle: 'buzz',
    nose: 'broad',
    lips: 'full',
  }),
};
