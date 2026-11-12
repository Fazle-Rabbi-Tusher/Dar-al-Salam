import fs from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { CANVAS } from '../../packages/shared/canvas';
import sharp from 'sharp';
import { loadContent, validateCharacter, validateLandmark } from './validate';
import { loadParts, loadHeads, image } from './io';
import {
  compose,
  composeWithHead,
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
const {
  width: PW,
  height: PH,
  anchor: [AX, AY],
} = CANVAS.person;
describe('real content validation', () => {
  it('validates every example with every ambient scenario', async () => {
    const files = await fs.readdir('content/characters');
    let ambient = 0;
    for (const f of await fs.readdir('content/ambient'))
      ambient += JSON.parse(
        await fs.readFile(`content/ambient/${f}`, 'utf8'),
      ).length;
    expect(content.characters).toHaveLength(files.length + ambient);
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
    expect(img.data[((AY - 1) * PW + AX - 8) * 4 + 3]).toBe(89);
    const at = (x: number, y: number) =>
      Array.from(img.data.slice((y * PW + x) * 4, (y * PW + x) * 4 + 4));
    expect(at(AX, 2)).toEqual([0, 0, 0, 0]);
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
        sourceSize: { w: PW, h: PH },
        duration: 83,
        userData: 'layerBias=5',
      })),
      meta: {
        image: 'fixture.png',
        frameTags: [{ name: 'idle_se', from: 0, to: 3 }],
        slices: [
          { name: 'foot', keys: [{ bounds: { x: AX, y: AY, w: 1, h: 1 } }] },
        ],
      },
    };
    const part = importAseprite('fixture', json, sheet);
    expect(part.anchor).toEqual([AX, AY]);
    expect(part.frames.idle_SE_0.layerBias).toBe(5);
    expect(part.frames.idle_SE_0.data[(30 * PW + 22) * 4 + 3]).toBe(255);
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
    expect(im.width).toBe(PW * 16);
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
  const adult = trimFrame(compose(c.look, 'idle', 'SE', 0, parts, p), [AX, AY]);
  const child = trimFrame(
    compose({ ...c.look, base: 'child' }, 'idle', 'SE', 0, parts, p),
    [AX, AY],
  );
  expect(child.image.height).toBeLessThan(adult.image.height - 10);
  const lifted = compose(c.look, 'idle', 'SE', 0, parts, p, false);
  expect(lifted.data[((AY - 1) * PW + AX - 8) * 4 + 3]).toBe(0);
});

describe('larger, modern characters', () => {
  const palette = () => ({
    keys: content.keys,
    ramps: content.ramps,
    outline: '#493C35',
    shadow: '#493C35',
  });
  it('draws full-height adults on the person canvas', () => {
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
    expect([img.width, img.height]).toEqual([PW, PH]);
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

describe('scholars and scene roles', () => {
  const scholars = [
    'ibn-al-haytham',
    'al-zahrawi',
    'al-jazari',
    'al-biruni',
    'mufti-ismail-menk',
    'hamza-yusuf',
    'omar-suleiman',
    'habib-umar-bin-hafiz',
    'ahmed-zewail',
  ];
  it('adds the scholars as unapproved drafts under exact approved names', async () => {
    const { forbiddenName } = await import('../../packages/shared/rules');
    for (const id of scholars) {
      const c = content.characters.find((c) => c.id === id)!;
      expect(c.panelApproved).toBe(false);
      expect(c.depiction).toBe('full');
      expect(c.bio?.en).toBe('PLACEHOLDER — to be researched');
      expect(forbiddenName(c.name!.en, content.rules)).toBe(false);
      for (const a of c.aliases)
        expect(forbiddenName(a, content.rules)).toBe(false);
    }
    // Approval covers the exact full names only, not the given names.
    for (const n of ['Ismail', 'Hamza Ahmed', 'Yusuf Menk', 'Ahmed Rahman'])
      expect(forbiddenName(n, content.rules)).toBe(true);
  });
  it('keeps only the ambient people that named scenes need', () => {
    const people = content.characters.filter(
      (c) => !c.name && c.kind === 'person',
    );
    // Only scene roles (named scenes' partners); the scene bible adds a few per scene.
    expect(people.length).toBeLessThanOrEqual(90);
    for (const c of people) expect(c.role).toBeTruthy();
    const ids = new Set(content.characters.map((c) => c.id));
    for (const c of content.characters)
      if (c.pairWith) expect(ids.has(c.pairWith)).toBe(true);
  });
});

describe('sharp heads', () => {
  it('gives every named person a 2× head that fits the body exactly', async () => {
    const heads = await loadHeads(),
      pal = {
        keys: content.keys,
        ramps: content.ramps,
        outline: '#493C35',
        shadow: '#493C35',
      },
      allowed = new Set(content.palette);
    const named = content.characters.filter(
      (c) => c.name && c.kind === 'person',
    );
    expect(named.length).toBeGreaterThanOrEqual(30);
    for (const c of named) {
      expect(heads[c.id], c.id).toBeDefined();
      for (const action of new Set(c.script.map((s) => s.action)))
        for (const facing of ['SE', 'NW'] as const) {
          const { image: img, overhang } = composeWithHead(
            c.look,
            action,
            facing,
            0,
            parts,
            pal,
            heads[c.id],
          );
          expect(overhang, `${c.id} ${action} ${facing}`).toBe(0);
          expect([img.width, img.height]).toEqual([PW * 2, PH * 2]);
          expect(paletteErrors(img, allowed)).toEqual([]);
          // Away from the head the frame is the normal frame, doubled.
          const base = compose(c.look, action, facing, 0, parts, pal),
            head = resolveFrame(heads[c.id], action, facing, 0);
          for (let y = 0; y < PH; y += 2)
            for (let x = 0; x < PW; x += 2) {
              const hx = head.mirror ? PW * 2 - 1 - x * 2 : x * 2;
              if (head.frame.data[(y * 2 * PW * 2 + hx) * 4 + 3]) continue;
              expect(hexAt(img, (y * 2 * img.width + x * 2) * 4)).toBe(
                hexAt(base, (y * PW + x) * 4),
              );
            }
        }
    }
    // Checks every named person's every action: it grows with the cast.
  }, 20000);
});

describe('Bangladesh block', () => {
  it('places the school and the new people; the dark room stands on the west lawn', async () => {
    const { forbiddenName } = await import('../../packages/shared/rules');
    const objects = content.room.layers.find((l) => l.type === 'objectgroup');
    const types = new Set(
      objects?.type === 'objectgroup' ? objects.objects.map((o) => o.type) : [],
    );
    // The owner removed Baitul Mukarram, Ibn Battuta and the prayer hall
    // (2026-11): only the dark room and the corner trees stand on the west
    // lawn now.
    for (const t of ['m-baitul-mukarram', 'm-bm-gate', 'm-bm-arcade'])
      expect(types.has(t), t).toBe(false);
    if (objects?.type === 'objectgroup')
      for (const o of objects.objects)
        if (o.x > 2 && o.x < 39 && o.y > 95 && o.y < 120)
          expect(o.type).toMatch(/^(m-tree|sup-dr-)/);
    for (const id of ['ibn-battuta', 'yasser-al-dosari'])
      expect(content.characters.some((c) => c.id === id)).toBe(false);
    for (const t of [
      'm-bd-school',
      'm-bd-flag',
      'm-shapla-pond',
      'm-rickshaw',
      'm-cricket-pitch',
    ])
      expect(types.has(t), t).toBe(true);
    for (const id of [
      'kazi-nazrul-islam',
      'begum-rokeya',
      'mashrafe-mortaza',
      'tamim-iqbal',
      'malala-yousafzai',
      'hakeem-olajuwon',
    ]) {
      const c = content.characters.find((c) => c.id === id)!;
      expect(c.panelApproved).toBe(false);
      expect(forbiddenName(c.name!.en, content.rules)).toBe(false);
    }
    // Background people were removed (only main characters remain).
    expect(
      content.characters.some((c) => c.id.startsWith('amb-bd-pupil')),
    ).toBe(false);
  });
});

describe('scene bible: stadium (batch 1a)', () => {
  it('plays the new beats for Salah, Mané and Kanté on the master loop', async () => {
    const { characterState, frameKey } =
      await import('../../packages/shared/script');
    const byId = (id: string) => content.characters.find((c) => c.id === id)!;
    for (const id of ['mohamed-salah', 'sadio-mane']) {
      const c = byId(id);
      expect(c.loop).toBe(240);
      expect(c.script.some((s) => s.action === 'sujood')).toBe(true);
      expect(characterState(c, 0)).toEqual(characterState(c, 240));
      expect(c.panelApproved).toBe(false);
    }
    const kante = byId('ngolo-kante');
    expect(kante.script.some((s) => s.prop === 'trophy')).toBe(true);
    expect(frameKey('carry', 'trophy', 'SE')).toBe('carry@trophy_SE');
    expect(frameKey('idle', undefined, 'NW')).toBe('idle_NW');
    const ambulance = byId('amb-stadium-ambulance');
    expect(ambulance.kind).toBe('vehicle');
    expect(characterState(ambulance, 120).tile[0]).toBeGreaterThan(
      characterState(ambulance, 0).tile[0],
    );
  });
  it('draws no named Elneny (his first name is denylisted)', () => {
    expect(content.characters.some((c) => /elneny/i.test(c.id))).toBe(false);
  });
});

describe('scene bible: stadium (batch 1b)', () => {
  it('adds Kanouté, Ziyech, Bounou and Boufal as unapproved drafts', async () => {
    const { forbiddenName } = await import('../../packages/shared/rules');
    const { characterState } = await import('../../packages/shared/script');
    for (const id of [
      'frederic-kanoute',
      'hakim-ziyech',
      'yassine-bounou',
      'sofiane-boufal',
    ]) {
      const c = content.characters.find((c) => c.id === id)!;
      expect(c.panelApproved).toBe(false);
      expect(c.bio?.en).toBe('PLACEHOLDER — to be researched');
      expect(forbiddenName(c.name!.en, content.rules)).toBe(false);
      expect(c.links?.length).toBeGreaterThanOrEqual(2);
      expect(c.loop).toBe(240);
      expect(characterState(c, 0)).toEqual(characterState(c, 240));
    }
    // Bono replaces the unnamed west keeper.
    expect(content.characters.some((c) => c.id === 'amb-keeper-west')).toBe(
      false,
    );
  });
  it('syncs the mosque door lights to the master loop', async () => {
    const index = JSON.parse(
      await fs.readFile('art/objects/index.json', 'utf8'),
    );
    expect(index['m-mosque-door'].period).toBe(240);
    expect(index['m-mosque-door'].frames).toHaveLength(2);
  });
});

describe('scene bible: cricket ground', () => {
  it('adds Khawaja and Amla as unapproved drafts; Rizwan waits for approval', async () => {
    const { forbiddenName } = await import('../../packages/shared/rules');
    const { characterState } = await import('../../packages/shared/script');
    for (const id of ['usman-khawaja', 'hashim-amla']) {
      const c = content.characters.find((c) => c.id === id)!;
      expect(c.panelApproved).toBe(false);
      expect(c.bio?.en).toBe('PLACEHOLDER — to be researched');
      expect(forbiddenName(c.name!.en, content.rules)).toBe(false);
      expect(characterState(c, 0)).toEqual(characterState(c, 240));
    }
    expect(forbiddenName('Mohammad Rizwan', content.rules)).toBe(true);
    expect(content.characters.some((c) => /rizwan/.test(c.id))).toBe(false);
    // Khawaja steps off the stage and comes back up.
    const k = content.characters.find((c) => c.id === 'usman-khawaja')!;
    expect(characterState(k, 100).z).toBe(0);
    expect(characterState(k, 180).z).toBe(10);
  });
});

describe('main characters only, with supplied animation strips', () => {
  it('keeps no background people: only named characters, balls, vehicles and animals', () => {
    // The owner asked for exceptions (2026-11): Massawa's caravan guide and
    // the eight seated listeners at Mufti Menk's talk.
    const allowed = new Set(['amb-msw-guide']);
    for (const c of content.characters)
      if (!c.name && !allowed.has(c.id) && !/^menk-speech-listener-/.test(c.id))
        expect(c.kind, c.id).not.toBe('person');
    const listeners = content.characters.filter((c) =>
      c.id.startsWith('menk-speech-listener-'),
    );
    expect(listeners).toHaveLength(8);
    for (const c of listeners) {
      // Seen from behind, seated, facing the speaker (back views: NE/NW only).
      expect(c.depiction, c.id).toBe('back');
      for (const s of c.script) {
        expect(s.action, c.id).toBe('sit');
        expect(s.path, c.id).toBeUndefined();
        expect(['NE', 'NW'], c.id).toContain(s.facing);
      }
    }
    const ids = new Set(content.characters.map((c) => c.id));
    for (const c of content.characters)
      if (c.pairWith) expect(ids.has(c.pairWith), c.id).toBe(true);
  });
  it('has a prepared strip, both views, for every action of every sprite character', async () => {
    const strips = new Set(await fs.readdir('art/sprites/anim'));
    const sprites = new Set(await fs.readdir('art/sprites'));
    for (const c of content.characters) {
      if (!c.name || !sprites.has(`${c.id}.png`)) continue;
      for (const s of c.script) {
        const key = `${c.id}__${s.action}${s.prop ? '@' + s.prop : ''}`;
        expect(strips.has(`${key}_SE.png`), key).toBe(true);
        expect(strips.has(`${key}_NE.png`), key).toBe(true);
      }
    }
  });
  it('prepared strips are 224×336 frames with transparent backgrounds', async () => {
    for (const f of [
      'mohamed-salah__walk_NE.png',
      'mufti-ismail-menk__talk_SE.png',
    ]) {
      const m = await sharp(`art/sprites/anim/${f}`).metadata();
      expect(m.height).toBe(336);
      expect(m.width % 224).toBe(0);
      expect(m.hasAlpha).toBe(true);
    }
  });
});

describe('the dark room', () => {
  it('stands Ibn al-Haytham at his bench inside Al-Bayt al-Muzlim', async () => {
    const placed: { type: string; at: [number, number] }[] = JSON.parse(
      await fs.readFile('art/supplied/dark-room.json', 'utf8'),
    );
    const index = JSON.parse(
      await fs.readFile('art/supplied/index.json', 'utf8'),
    );
    // Its walls, screen, shelves, beam and furniture as separate pieces.
    const kinds = new Set(placed.map((p) => p.type.split('-')[2]));
    for (const k of ['back', 'right', 'screen', 'shelves', 'rays', 'lectern'])
      expect(kinds).toContain(k);
    for (const p of placed) expect(index[p.type]).toBeTruthy();
    const xs = placed.map((p) => p.at[0]),
      ys = placed.map((p) => p.at[1]);
    const him = content.characters.find((c) => c.id === 'ibn-al-haytham')!;
    expect(him.panelApproved).not.toBe(true);
    for (const step of him.script) {
      expect(step.at![0]).toBeGreaterThan(Math.min(...xs) + 1);
      expect(step.at![0]).toBeLessThan(Math.max(...xs) - 1);
      expect(step.at![1]).toBeGreaterThan(Math.min(...ys) + 1);
      expect(step.at![1]).toBeLessThan(Math.max(...ys) - 1);
    }
    const scene = content.scenes.find((s) => s.id === 'dark-room')!;
    expect(scene.lead).toBe('ibn-al-haytham');
    expect(scene.props).toEqual(['sup-dr-*']);
  });
});

describe('landmarks', () => {
  it('loads the Mosque of the Companions as an unapproved draft card', () => {
    const l = content.landmarks.find(
      (l) => l.id === 'mosque-of-the-companions',
    )!;
    expect(l).toBeTruthy();
    expect(l.panelApproved).toBe(false);
    expect(l.links?.[0].url).toMatch(/^https:\/\/en\.wikipedia\.org\//);
    // Story and sources stay placeholders until researched (AGENTS.md).
    expect(l.story?.en).toMatch(/^PLACEHOLDER/);
    expect(() => validateLandmark(l, content.rules, false)).not.toThrow();
  });
  it('refuses unapproved landmark cards in production', () => {
    for (const l of content.landmarks)
      expect(() => validateLandmark(l, content.rules, true)).toThrow(
        /panelApproved/,
      );
  });
  it('runs landmark names through the never-depict rules', () => {
    const l = content.landmarks[0];
    expect(() =>
      validateLandmark(
        { ...l, name: { ...l.name, en: 'Abu Bakr' } },
        content.rules,
        false,
      ),
    ).toThrow(/never-depict/);
  });
  it('has supplied art with an anchor inside the image', async () => {
    const index = JSON.parse(
      await fs.readFile('art/landmarks/index.json', 'utf8'),
    );
    for (const l of content.landmarks) {
      const art = index[l.art];
      expect(art).toBeTruthy();
      const meta = await sharp(`art/${art.file}`).metadata();
      expect(meta.hasAlpha).toBe(true);
      expect(art.anchor[0]).toBeLessThan(meta.width!);
      expect(art.anchor[1]).toBeLessThan(meta.height!);
      expect(art.density).toBeGreaterThan(1);
    }
  });
});
