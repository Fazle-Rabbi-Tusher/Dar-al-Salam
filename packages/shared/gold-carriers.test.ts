import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  CARRIER_IDS,
  carrierHandover,
  goldCarrierActors,
} from './gold-carriers';
import {
  CARAVAN,
  caravanTile,
  human,
  caravanActors,
  rigMatrices,
} from './royal-caravan';
import { forbiddenName } from './rules';

const rig = (t: number) => goldCarrierActors(t, human);
const point = (m: Float32Array, p: number[] = [0, 0, 0]) =>
  [0, 1, 2].map(
    (i) => m[i] * p[0] + m[i + 4] * p[1] + m[i + 8] * p[2] + m[i + 12],
  );
const distance = (a: number[], b: number[]) =>
  Math.hypot(...a.map((v, i) => v - b[i]));

describe('the six people and gold carriers', () => {
  it('keeps anonymous identities and actual mesh topology stable on a closed 20-second loop', () => {
    const rules = JSON.parse(
      readFileSync('content/rules/never-depict.json', 'utf8'),
    );
    for (const id of CARRIER_IDS)
      expect(forbiddenName(id.replaceAll('-', ' '), rules)).toBe(false);
    const initial = rigMatrices(rig(0));
    expect(
      rig(0).children.filter((n) =>
        CARRIER_IDS.includes(n.name as (typeof CARRIER_IDS)[number]),
      ),
    ).toHaveLength(6);
    for (const t of [12, 36.5, 64, 115.5, 180, 205, 239.5, 240]) {
      const next = rigMatrices(rig(t));
      expect([...next.keys()]).toEqual([...initial.keys()]);
      for (const [key, value] of next) {
        expect([...value.matrix].every(Number.isFinite)).toBe(true);
        expect(value.node.faces).toBe(initial.get(key)!.node.faces);
        if (t === 240) expect(value.matrix).toEqual(initial.get(key)!.matrix);
      }
    }
  });
  it('keeps all four porter hands on the same two carrying poles throughout motion', () => {
    for (const t of [0, 12, 36.5, 76, 115.5, 170, 205, 239.5]) {
      const matrices = rigMatrices(rig(t));
      const find = (suffix: string) =>
        [...matrices].find(([key]) => key.endsWith(suffix))![1].matrix;
      const load = find('/shared-chest-rig');
      for (const [id, arm, x, z] of [
        ['chest-porter-rust', 'right', -33, 2],
        ['chest-porter-rust', 'left', -33, 20],
        ['chest-porter-indigo', 'right', 33, 20],
        ['chest-porter-indigo', 'left', 33, 2],
      ] as [string, string, number, number][]) {
        const wrist = find(`/${id}/${arm}-arm/${arm}-arm-hand`);
        expect(distance(point(wrist), point(load, [x, 43, z]))).toBeLessThan(
          0.001,
        );
      }
    }
  });
  it('wraps the sampled facial surface around the head instead of placing a front mask over a plain skull', () => {
    for (const person of rig(0).children.filter((n) =>
      CARRIER_IDS.includes(n.name as (typeof CARRIER_IDS)[number]),
    )) {
      const head = person.children
        .find((n) => n.name === 'body')!
        .children.find((n) => n.name === 'head')!;
      const points = head
        .faces!.filter((f) => f.finish === 'face')
        .flatMap((f) => f.points);
      expect(Math.min(...points.map((p) => p[2]))).toBeLessThan(-2);
      expect(Math.max(...points.map((p) => p[2]))).toBeGreaterThan(4);
      expect(points.every((p) => p.every(Number.isFinite))).toBe(true);
    }
  });
  it('transfers one coin between meeting right hands, then stores it', () => {
    const matrices = rigMatrices(rig(12));
    const find = (suffix: string) =>
      [...matrices].find(([key]) => key.endsWith(suffix))![1].matrix;
    expect(
      distance(
        point(find('/bowl-gold-bearer/right-arm/right-arm-hand')),
        point(find('/elder-recipient/right-arm/right-arm-hand')),
      ),
    ).toBeLessThan(0.001);
    const gift = (t: number) =>
      point(
        [...rigMatrices(rig(t))].find(([key]) =>
          key.endsWith('/carrier-transferred-gold-coin'),
        )![1].matrix,
      );
    expect(distance(gift(12 - 0.00001), gift(12 + 0.00001))).toBeLessThan(
      0.001,
    );
    expect(carrierHandover(11.9).owner).toBe('giver');
    expect(carrierHandover(12).owner).toBe('recipient');
    expect(carrierHandover(22).owner).toBe('stored');
  });
  it('keeps a supporting foot planted and stays inside the existing caravan plot', () => {
    for (let t = 0; t < 240; t += 2)
      for (const person of rig(t).children.filter((n) =>
        CARRIER_IDS.includes(n.name as (typeof CARRIER_IDS)[number]),
      )) {
        const feet = person.children.filter((n) => n.name.startsWith('shoe-'));
        expect(Math.min(...feet.map((n) => n.position[1]))).toBe(0);
        const tile = caravanTile(person.position[0], person.position[2]);
        expect(tile[0]).toBeGreaterThan(CARAVAN.tile[0]);
        expect(tile[0]).toBeLessThan(CARAVAN.tile[0] + CARAVAN.footprint[0]);
        expect(tile[1]).toBeGreaterThan(CARAVAN.tile[1]);
        expect(tile[1]).toBeLessThan(CARAVAN.tile[1] + CARAVAN.footprint[1]);
      }
  });
  it('exports nine self-contained animated GLBs with matching integrity records', () => {
    const folder = 'web/public/models/gold-carriers/';
    const manifest = JSON.parse(readFileSync(folder + 'manifest.json', 'utf8'));
    expect(manifest.people).toBe(6);
    expect(manifest.models).toHaveLength(9);
    for (const model of manifest.models) {
      const bytes = readFileSync(folder + model.file);
      expect(bytes.length).toBe(model.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        model.sha256,
      );
      expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
      const json = JSON.parse(
        bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
      );
      expect(json.asset.version).toBe('2.0');
      expect(json.animations).toHaveLength(1);
      expect(json.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
      expect(json.meshes.length).toBeGreaterThan(0);
      for (const mesh of json.meshes)
        for (const primitive of mesh.primitives) {
          expect(primitive.attributes).toHaveProperty('POSITION');
          expect(primitive.attributes).toHaveProperty('NORMAL');
          expect(primitive.attributes).toHaveProperty('COLOR_0');
        }
      expect(model.animationTracks).toBeGreaterThan(5);
    }
  });
  it('keeps the delivery lanes clear of other people and market supports', () => {
    for (let t = 0; t < 240; t += 2) {
      const root = caravanActors(t),
        group = root.children.find(
          (n) => n.name === 'gold-carriers-and-people',
        )!;
      const people = group.children.filter((n) =>
        CARRIER_IDS.includes(n.name as (typeof CARRIER_IDS)[number]),
      );
      const original = root.children.filter((n) =>
        n.children.some((c) => c.name === 'body'),
      );
      for (const person of people) {
        for (const other of [...original, ...people])
          if (other !== person)
            expect(
              Math.hypot(
                person.position[0] - other.position[0],
                person.position[2] - other.position[2],
              ),
            ).toBeGreaterThan(28);
        for (const x of [-115, 0, 115])
          for (const side of [-1, 1])
            expect(
              Math.hypot(
                person.position[0] - (x + side * 42),
                person.position[2] - 183,
              ),
            ).toBeGreaterThan(18);
      }
    }
  });
});
