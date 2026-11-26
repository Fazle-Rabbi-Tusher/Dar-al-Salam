import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  STOPS,
  STAY,
  CARAVAN,
  caravanActors,
  caravanState,
  handoverState,
  mansaActor,
  plantedStep,
  rigMatrices,
  rulerTile,
  type RoyalFinish,
} from './royal-caravan';
import { forbiddenName } from './rules';
import { characterSchema, roomSchema } from './schema';
import { scriptErrors } from './script';
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const xyz = (m: Float32Array) => [...m.slice(12, 15)];
describe('articulated Mansa Musa and his procession', () => {
  it('keeps the requested ruler distinct from the protected given name and keeps his card a draft', () => {
    const rules = json('content/rules/never-depict.json'),
      c = characterSchema.parse(json('content/characters/mansa-musa.json'));
    expect(forbiddenName('Mansa Musa', rules)).toBe(false);
    for (const name of [
      'Musa',
      'al-Musa',
      'Mūsā',
      'Musa Scholar',
      'Muhammad',
      'Maryam',
    ])
      expect(forbiddenName(name, rules)).toBe(true);
    expect(c.panelApproved).toBe(false);
    expect(c.bio?.en).toBe('PLACEHOLDER — to be researched');
    // A pixel-art sprite in the desert now, not the native rig (2026-11).
    expect(c.nativeModel).toBeUndefined();
    expect(
      scriptErrors(c, roomSchema.parse(json('rooms/mosque-garden.tmj'))),
    ).toEqual([]);
  });
  it('closes the route without a teleport and keeps all rig channels finite and stable', () => {
    expect(caravanState(240)).toEqual(caravanState(0));
    const a = caravanState(239.999).point,
      b = caravanState(0).point;
    expect(Math.hypot(...a.map((v, i) => v - b[i]))).toBeLessThan(0.001);
    const initial = rigMatrices(caravanActors(0)),
      paths = [...initial.keys()];
    for (const t of [
      0.5, 12, 24, 48.5, 76, 115.5, 140, 169, 196, 225, 239.999, 240,
    ]) {
      const pose = rigMatrices(caravanActors(t));
      expect([...pose.keys()]).toEqual(paths);
      for (const value of pose.values())
        expect([...value.matrix].every(Number.isFinite)).toBe(true);
      if (t === 240)
        for (const [key, value] of pose)
          expect(value.matrix).toEqual(initial.get(key)!.matrix);
    }
    expect(
      caravanActors(0).children.filter((n) => n.name.startsWith('guard-')),
    ).toHaveLength(CARAVAN.guards);
    expect(
      caravanActors(0).children.filter((n) => n.name.startsWith('pack-camel-')),
    ).toHaveLength(CARAVAN.camels);
  });
  it('transfers one coin at actual hand contact, with no ownership jump', () => {
    for (const [index, start] of STOPS.entries()) {
      const t = start + STAY / 2,
        pose = rigMatrices(caravanActors(t)),
        find = (suffix: string) =>
          [...pose].find(([key]) => key.endsWith(suffix))![1].matrix;
      const giver = xyz(find('/mansa-musa/right-arm/right-arm-hand')),
        receiver = xyz(
          find(`/recipient-${index + 1}/right-arm/right-arm-hand`),
        ),
        contact = handoverState(t, index).contact;
      giver.forEach((v, i) => expect(v).toBeCloseTo(contact[i], 5));
      receiver.forEach((v, i) => expect(v).toBeCloseTo(contact[i], 5));
      const switchAt = start + STAY * 0.53,
        before = rigMatrices(caravanActors(switchAt - 0.0001)),
        after = rigMatrices(caravanActors(switchAt + 0.0001)),
        key = `/mali-gold-caravan/gift-coin-${index + 1}`;
      expect(
        Math.hypot(
          ...xyz(before.get(key)!.matrix).map(
            (v, i) => v - xyz(after.get(key)!.matrix)[i],
          ),
        ),
      ).toBeLessThan(0.001);
      expect(handoverState(switchAt - 0.0001, index).owner).toBe('giver');
      expect(handoverState(switchAt + 0.0001, index).owner).toBe('recipient');
    }
  });
  it('plants stance feet at fixed ground positions and clears the market structures', () => {
    const ground = (distance: number) =>
      distance + plantedStep(distance).forward;
    expect(ground(5)).toBeCloseTo(ground(6));
    expect(plantedStep(5).lift).toBe(0);
    expect(plantedStep(35).lift).toBeGreaterThan(0);
    for (let t = 0; t < 240; t += 4)
      for (const n of caravanActors(t).children.filter((n) =>
        /^(guard-|pack-camel-|mansa-musa$)/.test(n.name),
      )) {
        expect(Math.abs(n.position[0])).toBeLessThan(390);
        // The roam's northern leg runs to about z = −230 (guards ±26 beside it).
        expect(n.position[2]).toBeGreaterThan(-260);
        expect(n.position[2]).toBeLessThan(100);
        for (const x of [-270, 0, 270])
          expect(
            Math.abs(n.position[0] - x) < 70 &&
              Math.abs(n.position[2] + 299) < 45,
          ).toBe(false);
      }
    expect(rulerTile(0)[0]).toBeLessThan(0);
  });
  it('exports real volumetric meshes and node animation, with source checksums', () => {
    const standing = rigMatrices(mansaActor(12));
    const head = [...standing].find(([key]) => key.endsWith('/head'))![1].node;
    expect(head.faces!.length).toBeGreaterThan(1000);
    const z = head.faces!.flatMap((f) => f.points.map((p) => p[2]));
    expect(Math.max(...z) - Math.min(...z)).toBeGreaterThan(10);
    for (const record of json('web/public/models/mali-caravan/manifest.json')
      .files) {
      const data = readFileSync(
        'web/public/models/mali-caravan/' + record.file,
      );
      expect(data.readUInt32LE(0)).toBe(0x46546c67);
      expect(data.readUInt32LE(4)).toBe(2);
      expect(data.readUInt32LE(8)).toBe(data.length);
      expect(createHash('sha256').update(data).digest('hex')).toBe(
        record.sha256,
      );
      const length = data.readUInt32LE(12),
        gltf = JSON.parse(data.subarray(20, 20 + length).toString());
      expect(gltf.nodes.length).toBeGreaterThan(20);
      expect(gltf.animations[0].channels.length).toBeGreaterThan(10);
      expect(gltf.meshes.length).toBeGreaterThan(10);
    }
  });
  it('wears the reference turban, single medallion, ivory robe and red mantle, with the staff in the reference hand', () => {
    const pose = rigMatrices(mansaActor(0)),
      entries = [...pose];
    expect(entries.some(([key]) => key.endsWith('/wrapped-linen-turban'))).toBe(
      true,
    );
    expect(
      entries.filter(([key]) => key.endsWith('/single-brow-medallion')),
    ).toHaveLength(1);
    const finish = new Set(
      entries.flatMap(([, v]) => v.node.faces?.map((f) => f.finish) ?? []),
    );
    for (const required of ['face', 'linen', 'brocade', 'velvet', 'gold'])
      expect(finish.has(required as RoyalFinish)).toBe(true);
    const find = (suffix: string) =>
      xyz(entries.find(([key]) => key.endsWith(suffix))![1].matrix);
    expect(find('/scepter')).toEqual(find('/right-arm/right-arm-hand'));
    const passed = rigMatrices(mansaActor(6));
    const hand = xyz(
      [...passed].find(([key]) => key.endsWith('/left-arm/left-arm-hand'))![1]
        .matrix,
    );
    expect(
      xyz([...passed].find(([key]) => key.endsWith('/scepter'))![1].matrix),
    ).toEqual(hand);
  });
  it('embeds reference texture images and separate physical gold in the reusable models', () => {
    const data = readFileSync(
      'web/public/models/mali-caravan/mansa-musa-standing.glb',
    );
    const length = data.readUInt32LE(12),
      gltf = JSON.parse(data.subarray(20, 20 + length).toString());
    expect(gltf.images).toHaveLength(5);
    expect(
      gltf.materials.find((m: { name: string }) => m.name === 'mansa:gold')
        .pbrMetallicRoughness.metallicFactor,
    ).toBeGreaterThan(0.8);
    for (const image of gltf.images) {
      expect(image.mimeType).toBe('image/png');
      const view = gltf.bufferViews[image.bufferView],
        offset = 28 + length + view.byteOffset;
      expect(data.subarray(offset, offset + 4).toString('hex')).toBe(
        '89504e47',
      );
      expect(view.byteLength).toBeGreaterThan(10000);
    }
    expect(
      gltf.meshes.some(
        (m: { primitives: { attributes: { TEXCOORD_0?: number } }[] }) =>
          m.primitives.some((p) => p.attributes.TEXCOORD_0 !== undefined),
      ),
    ).toBe(true);
    expect(gltf.samplers[0].magFilter).toBe(9728);
  });
  it('delivers all eight pixel-art directions without changing visible crop pixels', async () => {
    const folder = 'web/public/models/mali-caravan/',
      index = json(folder + 'angles/manifest.json');
    expect(index.views.map((v: { angle: string }) => v.angle)).toEqual([
      'front',
      'front-left',
      'left',
      'rear-left',
      'rear',
      'rear-right',
      'right',
      'front-right',
    ]);
    const canonical = (bytes: Buffer) => {
      for (let i = 0; i < bytes.length; i += 4)
        if (bytes[i + 3] === 0) bytes.fill(0, i, i + 3);
      return bytes;
    };
    for (const [i, view] of index.views.entries()) {
      const original = canonical(
        await sharp(folder + 'character-study.png')
          .extract({
            left: (i % 4) * 384,
            top: Math.floor(i / 4) * 512,
            width: 384,
            height: 512,
          })
          .ensureAlpha()
          .raw()
          .toBuffer(),
      );
      const decoded = canonical(
        await sharp(folder + 'angles/' + view.file)
          .ensureAlpha()
          .raw()
          .toBuffer(),
      );
      expect(original.equals(decoded)).toBe(true);
      expect(createHash('sha256').update(decoded).digest('hex')).toBe(
        view.decodedPixelsSha256,
      );
    }
  });
});
