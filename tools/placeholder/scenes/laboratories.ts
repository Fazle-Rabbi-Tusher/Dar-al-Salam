import {
  characterSchema,
  type Character,
  type Look,
} from '../../../packages/shared/schema';
import type { Point } from '../../../packages/shared/iso';
// Drawn body/hand frames come from the existing composited character library.
function look(female: boolean, coat: boolean, index: number): Look {
  return {
    base: female ? 'adult-woman' : 'adult-man',
    garment: coat ? 'lab-coat' : 'shirt-trousers',
    headwear: female ? 'hijab' : 'none',
    prop: 'none',
    colours: {
      skin: `skin-${[4, 6, 3, 5, 4, 2, 5][index]}`,
      hair: 'hair-black',
      garmentPrimary: coat ? 'lab-white' : ['navy', 'sky', 'olive'][index % 3],
      garmentSecondary: 'navy',
      headwear: ['navy', 'rose', 'sky'][index % 3],
      prop: 'sky',
    },
  };
}
const positions: Point[] = [
  [42.7, 12.5],
  [47.7, 12.5],
  [41.8, 17.3],
  [46.8, 17.3],
  [26.1, 12.1],
  [26.1, 16.6],
  [34, 14.6],
];
export const LAB_STOOLS = positions.slice(2).map(([x, y], index) => ({
  type: 'm-lab-stool',
  x: x - (index >= 2 ? 0.75 : 0.3),
  y: y - (index >= 2 ? 0.4 : 0.3),
  footprint: [0.65, 0.65] as Point,
  walkable: false,
  z: 0,
}));
export function laboratoryStaff(): Character[] {
  return positions.map((at, index) => {
    const base = {
      kind: 'person',
      district: 'modern-quarter',
      depiction: 'full',
      aliases: [],
      loop: 240,
      look: look(index % 2 === 0, index < 4, index),
    };
    if (index < 2)
      return characterSchema.parse({
        ...base,
        id: `lab-chemistry-operator-${index + 1}`,
        role: 'Scientist mixing reagent and watching the reaction',
        script: [
          {
            from: 0,
            to: 48,
            action: 'idle',
            at,
            facing: 'NE',
            prop: 'clipboard',
          },
          { from: 48, to: 84, action: 'pour', at, facing: 'NE', prop: 'flask' },
          {
            from: 84,
            to: 168,
            action: 'talk',
            at,
            facing: 'NE',
            prop: 'tablet',
          },
          {
            from: 168,
            to: 240,
            action: 'idle',
            at,
            facing: 'NE',
            prop: 'clipboard',
          },
        ],
      });
    if (index < 4)
      return characterSchema.parse({
        ...base,
        id: `lab-biology-researcher-${index - 1}`,
        role: 'Biologist preparing samples and recording microscope observations',
        script: [
          { from: 0, to: 144, action: 'write', at, facing: 'NE', prop: 'none' },
          {
            from: 144,
            to: 216,
            action: 'write',
            at,
            facing: 'NE',
            prop: 'pen',
          },
          { from: 216, to: 240, action: 'sit', at, facing: 'NE', prop: 'none' },
        ],
      });
    if (index < 6)
      return characterSchema.parse({
        ...base,
        id: `lab-architect-drafter-${index - 3}`,
        role: 'Architect drawing a floor plan and reviewing the blueprint',
        script: [
          { from: 0, to: 144, action: 'write', at, facing: 'NE', prop: 'pen' },
          {
            from: 144,
            to: 216,
            action: 'sit',
            at,
            facing: 'NE',
            prop: 'blueprint',
          },
          {
            from: 216,
            to: 240,
            action: 'write',
            at,
            facing: 'NE',
            prop: 'pen',
          },
        ],
      });
    return characterSchema.parse({
      ...base,
      id: 'lab-architect-cad',
      role: 'Architect working on the CAD model',
      script: [{ from: 0, to: 240, action: 'write', at, facing: 'NE' }],
    });
  });
}
