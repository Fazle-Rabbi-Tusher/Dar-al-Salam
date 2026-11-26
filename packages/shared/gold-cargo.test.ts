import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  CARGO_PROPS,
  cargoElephant,
  cargoCamel,
  cargoPropRig,
  nativeCargoActors,
  type CargoFace,
} from './gold-cargo';
import {
  rigMatrices,
  caravanTile,
  CARAVAN,
  caravanModel,
} from './royal-caravan';
import { forbiddenName } from './rules';

const origin = (m: Float32Array) => [m[12], m[13], m[14]];
const transform = (m: Float32Array, p: number[]) =>
  [0, 1, 2].map(
    (i) => m[i] * p[0] + m[i + 4] * p[1] + m[i + 8] * p[2] + m[i + 12],
  );
const distance = (a: number[], b: number[]) =>
  Math.hypot(...a.map((v, i) => v - b[i]));
describe('the loaded elephant and detailed gold cargo', () => {
  it('keeps anonymous assets, original material artwork and all seventeen model exports intact', () => {
    const rules = JSON.parse(
      readFileSync('content/rules/never-depict.json', 'utf8'),
    );
    for (const id of [...CARGO_PROPS, 'elephant-loaded', 'camel-loaded'])
      expect(forbiddenName(id.replaceAll('-', ' '), rules)).toBe(false);
    const source = 'art/sprites/source/gold-cargo/',
      inventory = JSON.parse(readFileSync(source + 'inventory.json', 'utf8'));
    expect(
      createHash('sha256')
        .update(readFileSync(source + inventory.file))
        .digest('hex'),
    ).toBe(inventory.sha256);
    const folder = 'web/public/models/gold-cargo/',
      manifest = JSON.parse(readFileSync(folder + 'manifest.json', 'utf8'));
    expect(manifest.models).toHaveLength(17);
    expect(manifest.people).toHaveLength(10);
    for (const m of manifest.models) {
      const bytes = readFileSync(folder + m.file);
      expect(bytes.length).toBe(m.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(m.sha256);
      const json = JSON.parse(
        bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
      );
      expect(json.asset.version).toBe('2.0');
      expect(json.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
      if (m.id.endsWith('-loaded'))
        expect(m.animations).toEqual(['Walk', 'Rest']);
    }
  });
  it('closes both animal loops with stable cached geometry and finite joint transforms', () => {
    for (const build of [cargoElephant, cargoCamel]) {
      const initial = rigMatrices(build(0));
      for (const t of [12, 36.5, 80, 140, 201.5, 239.99, 240]) {
        const next = rigMatrices(build(t));
        expect([...next.keys()]).toEqual([...initial.keys()]);
        for (const [key, value] of next) {
          expect([...value.matrix].every(Number.isFinite)).toBe(true);
          expect(value.node.faces).toBe(initial.get(key)!.node.faces);
          if (t === 240) expect(value.matrix).toEqual(initial.get(key)!.matrix);
        }
      }
    }
  });
  it('plants support feet in world space while the walking animal turns', () => {
    for (const [build, prefix, cycles, offset] of [
      [cargoElephant, 'elephant-foot-', 10, 0.25],
      [cargoCamel, 'camel-hoof-', 8, 0.08],
    ] as const) {
      let verified = 0;
      for (let t = 2; t < 238; t += 9) {
        const before = rigMatrices(build(t)),
          after = rigMatrices(build(t + 0.05));
        const feet = [...before].filter(([key]) =>
          key.split('/').at(-1)!.startsWith(prefix),
        );
        expect(feet).toHaveLength(4);
        expect(Math.min(...feet.map(([, v]) => v.matrix[13]))).toBeCloseTo(
          0,
          5,
        );
        for (const [key, value] of feet) {
          const name = key.split('/').at(-1)!;
          const match = name.slice(prefix.length).match(/^(-?1)-(-?1)$/)!;
          const phase =
              (Number(match[1]) === 1 ? 0.5 : 0) +
              (Number(match[2]) === 1 ? offset : 0),
            u = ((((t / 240) * cycles + phase) % 1) + 1) % 1;
          if (u > 0.05 && u < 0.5) {
            expect(
              distance(origin(value.matrix), origin(after.get(key)!.matrix)),
            ).toBeLessThan(0.001);
            verified++;
          }
        }
      }
      expect(verified).toBeGreaterThan(10);
    }
  });
  it('keeps paired panniers and the howdah attached to the moving spine', () => {
    for (const t of [0, 28.5, 70, 140, 201.5]) {
      const entries = [...rigMatrices(cargoElephant(t))];
      const find = (suffix: string) =>
        entries.find(([key]) => key.endsWith(suffix))![1].matrix;
      const spine = find('/elephant-spine');
      expect(
        distance(origin(find('/howdah-mount')), transform(spine, [0, 35, 0])),
      ).toBeLessThan(0.001);
      for (const side of [-1, 1])
        expect(
          distance(
            origin(find('/elephant-pannier-' + side)),
            transform(spine, [side * 52, -31, -14]),
          ),
        ).toBeLessThan(0.001);
    }
  });
  it('models the small visible details as solid, finite surfaces with separate materials', () => {
    const used = new Set<string>();
    let faces = 0;
    for (const id of CARGO_PROPS) {
      const model = rigMatrices(cargoPropRig(id));
      for (const item of model.values())
        for (const f of (item.node.faces || []) as CargoFace[]) {
          faces++;
          used.add(f.cargoMaterial);
          expect(f.points.every((p) => p.every(Number.isFinite))).toBe(true);
        }
    }
    expect(faces).toBeGreaterThan(10000);
    for (const material of [
      'gold',
      'wicker',
      'wood',
      'rope',
      'brocade',
      'leather',
    ])
      expect(used.has(material)).toBe(true);
  });
  it('fits the cleared plot, covers the canopy in culling bounds and keeps the roaming elephant supported', () => {
    const model = rigMatrices(nativeCargoActors(0));
    let top = 0;
    const min = [Infinity, Infinity],
      max = [-Infinity, -Infinity];
    for (const item of model.values())
      for (const f of item.node.faces || [])
        for (const p of f.points) {
          const world = transform(item.matrix, p);
          top = Math.max(top, world[1]);
          const tile = caravanTile(world[0], world[2]);
          for (let i = 0; i < 2; i++) {
            min[i] = Math.min(min[i], tile[i]);
            max[i] = Math.max(max[i], tile[i]);
          }
        }
    expect(top).toBeGreaterThan(220);
    expect(caravanModel('mali-gold-caravan')!.height).toBeGreaterThan(top);
    for (let i = 0; i < 2; i++) {
      expect(min[i]).toBeGreaterThanOrEqual(CARAVAN.tile[i]);
      expect(max[i]).toBeLessThanOrEqual(
        CARAVAN.tile[i] + CARAVAN.footprint[i],
      );
    }
    const feet = [...model].filter(([key]) =>
      key.split('/').at(-1)!.startsWith('elephant-foot-'),
    );
    expect(feet).toHaveLength(4);
    // It walks its own circuit now: at every tick most feet stay planted.
    for (let t = 0; t < 240; t += 3) {
      const grounded = [...rigMatrices(nativeCargoActors(t))].filter(
        ([key, v]) =>
          key.split('/').at(-1)!.startsWith('elephant-foot-') &&
          v.matrix[13] === 0,
      );
      expect(grounded.length, `tick ${t}`).toBeGreaterThanOrEqual(2);
    }
  }, 20000);
});
