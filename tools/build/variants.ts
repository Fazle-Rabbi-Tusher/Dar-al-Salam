import type { Look } from '../../packages/shared/schema';
// Build time only. The resolved look is serialized into world.json.
export function variantLook(template: string, seed: number): Look {
  if (template !== 'worshipper')
    throw Error(`Unknown wardrobe template ${template}`);
  let state = seed;
  const next = () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    base: 'adult-man',
    garment: ['thobe', 'jubba', 'qaba'][Math.floor(next() * 3)],
    headwear: ['kufi', 'imamah', 'taqiyah'][Math.floor(next() * 3)],
    prop: 'none',
    colours: {
      skin: `skin-${1 + Math.floor(next() * 8)}`,
      hair: 'hair-black',
      garmentPrimary: ['wool-cream', 'indigo', 'olive', 'white-linen'][
        Math.floor(next() * 4)
      ],
      garmentSecondary: 'white-linen',
      headwear: 'white-linen',
      prop: 'brass',
    },
  };
}
