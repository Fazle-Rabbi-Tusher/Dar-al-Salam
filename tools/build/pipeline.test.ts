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
  it('validates all 43 examples with every ambient scenario', () => {
    expect(content.characters).toHaveLength(43);
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
    expect(img.data[(44 * 32 + 11) * 4 + 3]).toBe(89);
    const at = (x: number, y: number) =>
      Array.from(img.data.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4));
    expect(at(16, 5)).toEqual([0, 0, 0, 0]);
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
        spriteSourceSize: { x: 14, y: 20, w: 2, h: 2 },
        sourceSize: { w: 32, h: 48 },
        duration: 83,
        userData: 'layerBias=5',
      })),
      meta: {
        image: 'fixture.png',
        frameTags: [{ name: 'idle_se', from: 0, to: 3 }],
        slices: [
          { name: 'foot', keys: [{ bounds: { x: 16, y: 44, w: 1, h: 1 } }] },
        ],
      },
    };
    const part = importAseprite('fixture', json, sheet);
    expect(part.anchor).toEqual([16, 44]);
    expect(part.frames.idle_SE_0.layerBias).toBe(5);
    expect(part.frames.idle_SE_0.data[(20 * 32 + 14) * 4 + 3]).toBe(255);
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
    expect(im.width).toBe(512);
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
  const adult = trimFrame(compose(c.look, 'idle', 'SE', 0, parts, p), [16, 44]);
  const child = trimFrame(
    compose({ ...c.look, base: 'child' }, 'idle', 'SE', 0, parts, p),
    [16, 44],
  );
  expect(child.image.height).toBeLessThan(adult.image.height - 6);
  const lifted = compose(c.look, 'idle', 'SE', 0, parts, p, false);
  expect(lifted.data[(44 * 32 + 11) * 4 + 3]).toBe(0);
});
