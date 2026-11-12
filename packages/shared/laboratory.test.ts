import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  laboratoryState,
  laboratoryModel,
  laboratoryActivityModel,
  draftingPoint,
  BLUEPRINT_STROKES,
} from './laboratory';
import { roomSchema, characterSchema } from './schema';
import { scriptErrors } from './script';
const types = ['m-chemistry-bench', 'm-biology-bench', 'm-drafting-table'];
const shape = (type: string) =>
  type.includes('drafting')
    ? ([2, 1.5] as [number, number])
    : ([3, 1.5] as [number, number]);
describe('working laboratories', () => {
  it('follows the shared preparation, dispense, reaction and recording sequence', () => {
    expect([0, 48, 84, 168, 216].map((f) => laboratoryState(f).phase)).toEqual([
      'prepare',
      'dispense',
      'react',
      'record',
      'reset',
    ]);
    expect(laboratoryState(60).dispense).toBeGreaterThan(0.9);
    expect(laboratoryState(60).reaction).toBe(0);
    expect(laboratoryState(120).reaction).toBe(1);
    expect(laboratoryState(240)).toEqual(laboratoryState(0));
  });
  it('keeps the static supports fixed while working parts change with stable buffer topology', () => {
    for (const type of types) {
      const fp = shape(type),
        fixed = laboratoryModel(type, fp),
        initial = laboratoryActivityModel(type, fp, 0)!;
      const counts = initial.faces.map((f) => f.points.length);
      for (const frame of [
        0, 47, 48, 60, 84, 110, 143.9, 144, 168, 192, 216, 239.9, 240,
      ]) {
        const model = laboratoryActivityModel(type, fp, frame)!;
        expect(model.faces.map((f) => f.points.length)).toEqual(counts);
        expect(
          model.faces.flatMap((f) => f.points.flat()).every(Number.isFinite),
        ).toBe(true);
        expect(laboratoryModel(type, fp)).toEqual(fixed);
      }
      expect(laboratoryActivityModel(type, fp, 120)).not.toEqual(initial);
      expect(laboratoryActivityModel(type, fp, 240)).toEqual(initial);
    }
  });
  it('shows reaction bubbles only after dispensing and changes the indicator colour', () => {
    const before = laboratoryActivityModel('m-chemistry-bench', [3, 1.5], 60)!;
    const active = laboratoryActivityModel('m-chemistry-bench', [3, 1.5], 120)!;
    const bubbles = (m: typeof active) =>
      m.faces.filter((f) => f.color === '#b9e5e1' && (f.opacity ?? 1) > 0.01);
    expect(bubbles(before)).toHaveLength(0);
    expect(bubbles(active).length).toBeGreaterThan(0);
    expect(active.faces[0].color).not.toBe(before.faces[0].color);
  });
  it('draws a plan progressively and keeps the pen on its inclined drafting surface', () => {
    const model = (f: number) =>
      laboratoryActivityModel('m-drafting-table', [2, 1.5], f)!;
    const strokes = (f: number) =>
      model(f).faces.filter(
        (x) => x.color === '#e2eee3' && (x.opacity ?? 1) > 0.01,
      ).length;
    expect(strokes(0)).toBe(0);
    expect(strokes(60)).toBeGreaterThan(0);
    expect(strokes(145)).toBeGreaterThan(strokes(60));
    for (let f = 0; f < 240; f += 0.25) {
      const [x, y, z] = draftingPoint(f, [2, 1.5]);
      expect(Math.abs(x)).toBeLessThan(23);
      expect(Math.abs(z)).toBeLessThan(16);
      expect(y).toBeGreaterThanOrEqual(34 - (z / (1.5 * 22.627)) * 16);
    }
    for (let i = 1; i < BLUEPRINT_STROKES.length; i++) {
      const f = (i * 144) / BLUEPRINT_STROKES.length,
        a = draftingPoint(f - 0.00001, [2, 1.5]),
        b = draftingPoint(f + 0.00001, [2, 1.5]);
      expect(Math.hypot(...a.map((v, j) => v - b[j]))).toBeLessThan(0.01);
    }
  });
  it('keeps native staff routines contiguous, on their seats or bench sides and on the same reaction clock', () => {
    const staff = (
      JSON.parse(
        fs.readFileSync('content/ambient/laboratories.json', 'utf8'),
      ) as unknown[]
    ).map((c: unknown) => characterSchema.parse(c));
    const room = roomSchema.parse(
      JSON.parse(fs.readFileSync('rooms/mosque-garden.tmj', 'utf8')),
    );
    expect(staff).toHaveLength(7);
    for (const c of staff) {
      expect(c.loop).toBe(240);
      expect(scriptErrors(c, room)).toEqual([]);
      expect(
        c.script.every(
          (s) =>
            s.at &&
            s.at[0] === c.script[0].at![0] &&
            s.at[1] === c.script[0].at![1],
        ),
      ).toBe(true);
    }
    const mixer = staff.find((c) => c.id === 'lab-chemistry-operator-1')!;
    expect(mixer.script.find((s) => s.action === 'pour')).toMatchObject({
      from: 48,
      to: 84,
    });
  });
});
