import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { infrastructureKind, infrastructureModel } from './infrastructure';
import type { Point } from './iso';
const room = JSON.parse(readFileSync('rooms/mosque-garden.tmj', 'utf8')) as {
  layers: {
    type: string;
    objects?: { id: number; type: string; footprint: Point }[];
  }[];
};
const objects = room.layers.flatMap((l) => l.objects ?? []);
describe('modern Muslim-world infrastructure geometry', () => {
  it('models every infrastructure source deterministically, with real height, side faces and finite vertices', () => {
    for (const o of objects) {
      const kind = infrastructureKind(o.type),
        model = infrastructureModel(o.type, o.footprint);
      if (!kind) {
        expect(model).toBeNull();
        continue;
      }
      expect(model?.faces.length, o.type).toBeGreaterThan(6);
      expect(model?.height, o.type).toBeGreaterThan(0);
      expect(model).toEqual(infrastructureModel(o.type, o.footprint));
      expect(
        model!.faces.flatMap((f) => f.points.flat()).every(Number.isFinite),
        o.type,
      ).toBe(true);
      const xs = model!.faces.flatMap((f) => f.points.map((p) => p[0])),
        zs = model!.faces.flatMap((f) => f.points.map((p) => p[2]));
      expect(Math.max(...xs) - Math.min(...xs), o.type).toBeGreaterThan(0);
      expect(Math.max(...zs) - Math.min(...zs), o.type).toBeGreaterThan(0);
    }
  });
  it('preserves supplied character art, natural landscaping and painted sports floors', () => {
    for (const type of [
      'm-tree',
      'm-pine',
      'm-waterfall',
      'm-pitch',
      'm-crosswalk',
      'khwarizmi-desk',
      'menk-recording-camera',
      'bowl',
      'feeder',
    ])
      expect(infrastructureModel(type, [2, 2])).toBeNull();
  });
  it('rotates side walls without shared vertex corruption or long stray faces', () => {
    const a = infrastructureModel('m-whitewall', [8, 0.35])!,
      b = infrastructureModel('m-whitewall-side', [0.35, 8])!;
    expect(a.faces.length).toBe(b.faces.length);
    for (let i = 0; i < a.faces.length; i++)
      for (let j = 0; j < a.faces[i].points.length; j++) {
        const p = a.faces[i].points[j],
          q = b.faces[i].points[j];
        expect(q[0]).toBeCloseTo(-p[2], 6);
        expect(q[1]).toBeCloseTo(p[1], 6);
        expect(q[2]).toBeCloseTo(p[0], 6);
      }
  });
  it('gives key services their own recognizable volumes instead of generic sprite planes', () => {
    const types = [
      'm-tower-tall',
      'm-brownstone',
      'm-bd-school',
      'm-baitul-mukarram',
      'm-awning-shop',
      'm-bus-shelter',
      'm-solar-panel',
      'm-lab-bench',
      'm-hospital-bed',
      'm-server-rack',
    ];
    const models = types.map((t) => infrastructureModel(t, [3, 2])!);
    expect(new Set(models.map((m) => m.kind)).size).toBeGreaterThanOrEqual(9);
    expect(models[0].height).toBeGreaterThan(models[1].height);
    expect(models[1].height).toBeGreaterThan(100);
    expect(models.every((m) => m.faces.length > 20)).toBe(true);
  });
  it('keeps car proportions aligned to their lanes and carries their details through a quarter turn', () => {
    const car = infrastructureModel('m-taxi', [2, 1], 420)!,
      side = infrastructureModel('m-taxi-side', [1, 2], 420)!;
    expect(car.height).toBeLessThan(25);
    expect(car.faces.some((f) => f.color === '#d95243')).toBe(true);
    expect(car.faces.some((f) => f.color === '#fff1bd')).toBe(true);
    for (let i = 0; i < car.faces.length; i++)
      for (let j = 0; j < car.faces[i].points.length; j++) {
        const a = car.faces[i].points[j],
          b = side.faces[i].points[j];
        expect(b).toEqual([-a[2], a[1], a[0]]);
      }
    const points = car.faces.flatMap((f) => f.points);
    const span = (axis: number) =>
      Math.max(...points.map((p) => p[axis])) -
      Math.min(...points.map((p) => p[axis]));
    expect(span(0)).toBeGreaterThan(span(2) * 1.7);
  });
  it('uses reproducible instance palettes and four readable clock faces', () => {
    const paints = new Set(
      Array.from(
        { length: 6 },
        (_, seed) =>
          infrastructureModel('m-taxi', [2, 1], seed)!.faces[0].color,
      ),
    );
    expect(paints.size).toBe(6);
    const a = infrastructureModel('m-skyscraper-glass', [3, 3], 7)!;
    expect(a).toEqual(infrastructureModel('m-skyscraper-glass', [3, 3], 7));
    expect(a.height).not.toBe(
      infrastructureModel('m-skyscraper-glass', [3, 3], 8)!.height,
    );
    const clock = infrastructureModel('m-tower-tall', [3, 3])!;
    expect(
      clock.faces.filter(
        (f) => f.points.length === 16 && f.color === '#f5f0df',
      ),
    ).toHaveLength(4);
    expect(clock.height).toBeGreaterThan(450);
  });
});
