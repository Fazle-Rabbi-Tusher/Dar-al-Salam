import type { PortraitDef } from './core';
import { FOOTBALL_PUBLIC } from './football-public';
import { FIGHTERS } from './fighters';
import { HERITAGE } from './heritage';
import { TODAY } from './today';
import { BANGLADESH_MORE } from './bangladesh-more';

/*
 * Sharp heads for every named character, keyed by character id. Ambient
 * people keep normal heads. Each group lives in its own file.
 */
export const PORTRAITS: Record<string, PortraitDef> = {
  ...FOOTBALL_PUBLIC,
  ...FIGHTERS,
  ...HERITAGE,
  ...TODAY,
  ...BANGLADESH_MORE,
};
export const PORTRAIT_COLOURS = [
  ...new Set(Object.values(PORTRAITS).flatMap((d) => d.colours ?? [])),
];
