import fs from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { loadContent, validateCharacter } from './validate';
import { loadParts, image } from './io';
import {
  compose,
  browserComposite,
  importAseprite,
  resolveFrame,
  trimFrame,
  maskHit,
  type Part,
  type Aseprite,
} from '../../packages/shared/compositor';
import {
  Pixels,
  blit,
  hexAt,
  paletteErrors,
} from '../../packages/shared/pixels';
import { characterSchema, type Character } from '../../packages/shared/schema';
let content: Awaited<ReturnType<typeof loadContent>>,
  parts: Record<string, Part>;
beforeAll(async () => {
  content = await loadContent();
  parts = await loadParts();
});
describe('real content validation', () => {
  it('validates every example with every ambient scenario', async () => {
    const files = await fs.readdir('content/characters');
    const ambient = JSON.parse(
      await fs.readFile('content/ambient/mosque-garden.json', 'utf8'),
    );
    expect(content.characters).toHaveLength(files.length + ambient.length);
    for (const c of content.characters)
      expect(
        validateCharacter(
          c,
          content.rules,
          content.room,
          parts,
          content.wardrobe,
          false,
        ),
      ).toEqual([]);
  });
  it('refuses unapproved production cards', () => {
    for (const c of content.characters.filter((c) => c.name))
      expect(() =>
        validateCharacter(
          c,
          content.rules,
          content.room,
          parts,
          content.wardrobe,
          true,
        ),
      ).toThrow(/panelApproved/);
  });
  it.each(['Musa', 'Abu Bakr'])(
    'rejects prohibited named AND ambient entries: %s',
    (name) => {
      for (const named of [true, false]) {
        const c: Character = {
          ...content.characters[0],
          id: name,
          name: named ? { en: name } : undefined,
        };
        expect(() =>
          validateCharacter(
            c,
            content.rules,
            content.room,
            parts,
            content.wardrobe,
            false,
          ),
        ).toThrow(/never-depict/);
      }
    },
  );
  it('rejects back depictions and missing parts', () => {
    const c = structuredClone(content.characters[0]);
    c.depiction = 'back';
    expect(() =>
      validateCharacter(
        c,
        content.rules,
        content.room,
        parts,
        content.wardrobe,
        false,
      ),
    ).toThrow(/back depiction/);
    c.depiction = 'full';
    c.look.prop = 'missing';
    expect(() =>
      validateCharacter(
        c,
        content.rules,
        content.room,
        parts,
        content.wardrobe,
        false,
      ),
    ).toThrow(/Unknown part/);
  });
  it('enforces sources and wardrobe in prod; warns only in dev', () => {
    const c = structuredClone(content.characters[0]);
    c.panelApproved = true;
    c.sources = ['one'];
    expect(() =>
      validateCharacter(
        c,
        content.rules,
        content.room,
        parts,
        content.wardrobe,
        false,
      ),
    ).toThrow(/two sources/);
    c.sources = ['one', 'two'];
    c.look.garment = 'qaba';
    c.district = 'unknown';
    expect(
      validateCharacter(
        c,
        content.rules,
        content.room,
        parts,
        content.wardrobe,
        false,
      ),
    ).toHaveLength(1);
    expect(() =>
      validateCharacter(
        c,
        content.rules,
        content.room,
        parts,
        content.wardrobe,
        true,
      ),
    ).toThrow(/Wardrobe/);
  });
  it('requires stationary or moving steps, not both', () => {
    const c = structuredClone(content.characters[0]);
    c.script[0].path = [
      [1, 1],
      [2, 1],
    ];
    expect(() => characterSchema.parse(c)).toThrow();
  });
});
describe('compositor and importer', () => {
  it('prioritises explicit SW frames and mirrors NW', () => {
    expect(resolveFrame(parts.book, 'write', 'SW', 0).mirror).toBe(false);
    expect(resolveFrame(parts.book, 'read', 'SW', 0).mirror).toBe(true);
    expect(resolveFrame(parts['adult-man'], 'walk', 'NW', 0).mirror).toBe(true);
  });
  it('composites every key shade using only the locked palette', () => {
    const c = content.characters[0];
    const img = compose(c.look, 'write', 'SE', 0, parts, {
      keys: content.keys,
      ramps: content.ramps,
      outline: '#493C35',
      shadow: '#493C35',
    });
    expect(paletteErrors(img, new Set(content.palette))).toEqual([]);
    expect([...img.data].some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    for (let i = 0; i < img.data.length; i += 4)
      if (img.data[i + 3])
        expect(Object.values(content.keys).flat()).not.toContain(hexAt(img, i));
  });
  it('keeps shadow beneath the body at 35% alpha and an outer brown outline', () => {
    const c = content.characters[0];
    const img = compose(c.look, 'idle', 'SE', 0, parts, {
      keys: content.keys,
      ramps: content.ramps,
      outline: '#493C35',
      shadow: '#493C35',
    });
    expect(img.data[(67 * 48 + 16) * 4 + 3]).toBe(89);
    const at = (x: number, y: number) =>
      Array.from(img.data.slice((y * 48 + x) * 4, (y * 48 + x) * 4 + 4));
    expect(at(24, 2)).toEqual([0, 0, 0, 0]);
    expect(
      Array.from(img.data).filter((v, i) => i % 4 === 3 && v === 255).length,
    ).toBeGreaterThan(100);
  });
  it('trim bounds, anchors and compact masks preserve placement', () => {
    const img = new Pixels(32, 48);
    img.rect(13, 20, 6, 24, '#493C35');
    const tr = trimFrame(img, [16, 44]);
    expect(tr.anchor).toEqual([3, 24]);
    expect(tr.bounds).toEqual({ x: -3, y: -24, width: 6, height: 24 });
    expect(maskHit(tr.mask, 6, 24, 3, 10)).toBe(true);
  });
  it('browser canvas adapter and Node raw/sharp adapter produce identical pixels', async () => {
    for (const c of content.characters.slice(0, 3)) {
      let drawn: Uint8Array | undefined;
      const mock = {
        createImageData: (w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: (p: ImageData) => {
          drawn = new Uint8Array(p.data);
        },
      } as unknown as CanvasRenderingContext2D;
      const palette = {
        keys: content.keys,
        ramps: content.ramps,
        outline: '#493C35',
        shadow: '#493C35',
      };
      const node = compose(c.look, 'idle', 'SE', 0, parts, palette);
      browserComposite(c.look, 'idle', 'SE', 0, parts, palette, mock);
      const encoded = await sharp(Buffer.from(node.data), {
        raw: { width: node.width, height: node.height, channels: 4 },
      })
        .png()
        .toBuffer();
      const decoded = await sharp(encoded).raw().toBuffer();
      expect(drawn).toEqual(new Uint8Array(decoded));
    }
  });
  it('accepts trimmed Aseprite JSON-array sheets with tags, foot slice and layerBias', () => {
    const sheet = new Pixels(8, 2);
    sheet.rect(0, 0, 8, 2, '#493C35');
    const json: Aseprite = {
      frames: Array.from({ length: 4 }, (_, i) => ({
        filename: `idle_${i}`,
        frame: { x: i * 2, y: 0, w: 2, h: 2 },
        spriteSourceSize: { x: 22, y: 30, w: 2, h: 2 },
        sourceSize: { w: 48, h: 72 },
        duration: 83,
        userData: 'layerBias=5',
      })),
      meta: {
        image: 'fixture.png',
        frameTags: [{ name: 'idle_se', from: 0, to: 3 }],
        slices: [
          { name: 'foot', keys: [{ bounds: { x: 24, y: 68, w: 1, h: 1 } }] },
        ],
      },
    };
    const part = importAseprite('fixture', json, sheet);
    expect(part.anchor).toEqual([24, 68]);
    expect(part.frames.idle_SE_0.layerBias).toBe(5);
    expect(part.frames.idle_SE_0.data[(30 * 48 + 22) * 4 + 3]).toBe(255);
    expect(() =>
      importAseprite(
        'fixture',
        {
          ...json,
          meta: {
            ...json.meta,
            frameTags: [{ name: 'idle_se', from: 0, to: 2 }],
          },
        },
        sheet,
      ),
    ).toThrow(/frame count/);
  });
  it('alpha blitting honours layer order and explicit mirroring', () => {
    const a = new Pixels(3, 1),
      b = new Pixels(3, 1);
    a.pixel(0, 0, '#493C35');
    b.pixel(2, 0, '#D7BB8D');
    blit(a, b, 0, 0, true);
    expect(hexAt(a, 0)).toBe('#D7BB8D');
  });
  it('loads real Aseprite-format source sheets without conversion at runtime', async () => {
    const im = await image('art/parts/bases/adult-man.png');
    expect(im.width).toBe(48 * 16);
    expect(Object.keys(parts['adult-man'].frames).length).toBeGreaterThan(100);
  });
});

describe('paper doll layering and seeded looks', () => {
  it('changes prop occlusion by facing and honours layer bias', () => {
    const key = content.keys;
    const look = {
      base: 'base',
      garment: 'garment',
      headwear: 'hat',
      prop: 'prop',
      colours: {
        skin: 'skin-4',
        hair: 'hair-black',
        garmentPrimary: 'indigo',
        garmentSecondary: 'olive',
        headwear: 'white-linen',
        prop: 'brass',
      },
    };
    const fake: Record<string, Part> = {};
    for (const [id, colour] of [
      ['base', key.skin[1]],
      ['garment', key.garmentPrimary[1]],
      ['hat', key.headwear[1]],
      ['prop', key.prop[1]],
    ]) {
      const p = new Pixels(32, 48);
      p.pixel(16, 25, colour);
      fake[id] = {
        id,
        anchor: [16, 44],
        frames: {
          idle_SE_0: { ...p, layerBias: 0 },
          idle_NE_0: { ...p, layerBias: 0 },
        },
      };
    }
    const pal = {
      keys: key,
      ramps: content.ramps,
      outline: '#493C35',
      shadow: '#493C35',
    };
    expect(
      hexAt(compose(look, 'idle', 'SE', 0, fake, pal), (25 * 32 + 16) * 4),
    ).toBe(content.ramps.brass[1]);
    expect(
      hexAt(compose(look, 'idle', 'NE', 0, fake, pal), (25 * 32 + 16) * 4),
    ).toBe(content.ramps['white-linen'][1]);
    fake.prop.frames.idle_NE_0.layerBias = 10;
    expect(
      hexAt(compose(look, 'idle', 'NE', 0, fake, pal), (25 * 32 + 16) * 4),
    ).toBe(content.ramps.brass[1]);
  });
  it('resolves reproducible build-only wardrobe variants', async () => {
    const { variantLook } = await import('./variants');
    expect(variantLook('worshipper', 7)).toEqual(variantLook('worshipper', 7));
    expect(variantLook('worshipper', 8)).not.toEqual(
      variantLook('worshipper', 7),
    );
    expect(() => variantLook('unknown', 7)).toThrow();
  });
});

it('keeps child clothes proportional and elevated shadows on the floor', () => {
  const c = content.characters[0],
    p = {
      keys: content.keys,
      ramps: content.ramps,
      outline: '#493C35',
      shadow: '#493C35',
    };
  const adult = trimFrame(compose(c.look, 'idle', 'SE', 0, parts, p), [24, 68]);
  const child = trimFrame(
    compose({ ...c.look, base: 'child' }, 'idle', 'SE', 0, parts, p),
    [24, 68],
  );
  expect(child.image.height).toBeLessThan(adult.image.height - 10);
  const lifted = compose(c.look, 'idle', 'SE', 0, parts, p, false);
  expect(lifted.data[(67 * 48 + 16) * 4 + 3]).toBe(0);
});

describe('larger, modern characters', () => {
  const palette = () => ({
    keys: content.keys,
    ramps: content.ramps,
    outline: '#493C35',
    shadow: '#493C35',
  });
  it('draws adults about 54 px tall on a 48×72 canvas', () => {
    const look = {
      base: 'adult-woman',
      garment: 'lab-coat',
      headwear: 'hijab',
      prop: 'flask',
      colours: {
        skin: 'skin-4',
        hair: 'hair-black',
        garmentPrimary: 'lab-white',
        garmentSecondary: 'navy',
        headwear: 'emerald',
        prop: 'sky',
      },
    };
    const img = compose(look, 'idle', 'SE', 0, parts, palette());
    expect([img.width, img.height]).toEqual([48, 72]);
    const t = trimFrame(img, parts['adult-woman'].anchor);
    expect(t.bounds.height).toBeGreaterThanOrEqual(52);
    expect(paletteErrors(img, new Set(content.palette))).toEqual([]);
  });
  it('bakes every modern garment, headwear and prop with only palette colours', () => {
    for (const [slot, ids] of [
      ['garment', ['suit', 'scrubs', 'hoodie-jeans', 'long-dress', 'hi-vis']],
      ['headwear', ['cap', 'hard-hat', 'scrub-cap', 'headwrap']],
      ['prop', ['laptop', 'stethoscope', 'meal-box', 'cane', 'clipboard']],
    ] as const)
      for (const id of ids) {
        const look = { ...content.characters[0].look, [slot]: id };
        const img = compose(look, 'walk', 'NE', 2, parts, palette());
        expect(paletteErrors(img, new Set(content.palette))).toEqual([]);
      }
  });
  it('keeps the modern named cards as unapproved placeholders', () => {
    const ids = [
      'fazlur-rahman-khan',
      'zaha-hadid',
      'aziz-sancar',
      'karim-benzema',
      'mesut-ozil',
      'mohamed-salah',
      'sadio-mane',
      'ngolo-kante',
      'khabib-nurmagomedov',
      'islam-makhachev',
      'kamaru-usman',
      'zabit-magomedsharipov',
      'khamzat-chimaev',
      'muhammad-ali',
      'zohran-mamdani',
      'abdul-el-sayed',
    ];
    for (const id of ids) {
      const c = content.characters.find((c) => c.id === id)!;
      expect(c.panelApproved).toBe(false);
      expect(c.bio?.en).toBe('PLACEHOLDER — to be researched');
      expect(() =>
        validateCharacter(
          c,
          content.rules,
          content.room,
          parts,
          content.wardrobe,
          true,
        ),
      ).toThrow(/panelApproved/);
    }
  });
});

describe('football stadium', () => {
  it('stages the chip-and-stop goal on the 240-frame master loop', async () => {
    const { characterState } = await import('../../packages/shared/script');
    const ball = content.characters.find((c) => c.id === 'amb-ozil-ball')!;
    const ozil = content.characters.find((c) => c.id === 'mesut-ozil')!;
    expect(ball.kind).toBe('ball');
    expect(ball.loop).toBe(240);
    // 2–4 s: the ball is chipped high over the goalkeeper.
    expect(characterState(ball, 36).z).toBeGreaterThan(25);
    // 12–15 s: Özil rolls it in; the ball rests inside the goal mouth.
    expect(characterState(ozil, 150).action).toBe('kick');
    expect(characterState(ball, 190).tile[0]).toBeGreaterThan(90.5);
    // The whole scene repeats exactly.
    for (const c of [ball, ozil])
      expect(characterState(c, 0)).toEqual(characterState(c, 240));
  });
  it('gives Benzema his three gestures and keeps the card a draft', () => {
    const c = content.characters.find((c) => c.id === 'karim-benzema')!;
    expect(c.script.map((s) => s.action)).toEqual([
      'celebrate',
      'cheer',
      'cross-arms',
    ]);
    expect(c.panelApproved).toBe(false);
  });
});

describe('transliterated denylisted names', () => {
  it('blocks spelling variants of Muhammad unless the exact full name is allowlisted', async () => {
    const { forbiddenName } = await import('../../packages/shared/rules');
    const rules = content.rules;
    for (const n of ['Mohamed', 'Mohammed Ali', 'Mohamad', 'Ahmed'])
      expect(forbiddenName(n, rules)).toBe(true);
    expect(forbiddenName('Mohamed Salah', rules)).toBe(false);
    expect(forbiddenName('mohamed-salah', rules)).toBe(false);
    expect(
      forbiddenName('Mohamed Salah', {
        ...rules,
        allowlist: rules.allowlist.filter((a) => a !== 'Mohamed Salah'),
      }),
    ).toBe(true);
    expect(forbiddenName('Sadio Mané', rules)).toBe(false);
    expect(forbiddenName('Muhammad Ali', rules)).toBe(false);
    expect(forbiddenName('Belal Muhammad', rules)).toBe(true);
    expect(forbiddenName('Khabib Nurmagomedov', rules)).toBe(false);
  });
});

describe('card info and links', () => {
  it('gives every named card quick facts and an https Wikipedia link', () => {
    const named = content.characters.filter((c) => c.name);
    expect(named.length).toBeGreaterThanOrEqual(11);
    for (const c of named) {
      expect(c.summary?.en?.length).toBeGreaterThan(40);
      expect(c.links?.[0].url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
      expect(c.bio?.en).toBe('PLACEHOLDER — to be researched');
    }
  });
});
