import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CARAVAN,
  caravanActors,
  caravanState,
  handoverState,
  mansaActor,
  plantedStep,
  rigMatrices,
  rulerTile,
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
    expect(c.nativeModel).toBe('mali-ruler');
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
    for (const [index, start] of [0, 64, 128].entries()) {
      const t = start + 12,
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
      const switchAt = start + 24 * 0.53,
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
        expect(n.position[2]).toBeGreaterThan(-250);
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
});
