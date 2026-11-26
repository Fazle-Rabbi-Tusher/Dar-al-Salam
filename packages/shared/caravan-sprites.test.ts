import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARAVAN, inCaravanPlot } from './royal-caravan';
import { MASSAWA_OBJECTS } from './massawa';
import { tileToPlanet, wildAt } from './planet';
import { characterSchema, type Character } from './schema';

const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const cast: Character[] = [
  characterSchema.parse(json('content/characters/mansa-musa.json')),
  ...json('content/ambient/caravan.json').map((c: unknown) =>
    characterSchema.parse(c),
  ),
];
describe("Mansa Musa's caravan as realistic sprites roaming the desert", () => {
  it('walks the open desert west of Massawa, inside its own cleared ground', () => {
    expect(cast.length).toBeGreaterThan(25);
    for (const c of cast) {
      expect(c.loop, c.id).toBe(240);
      expect(c.script[0].from).toBe(0);
      expect(c.script.at(-1)!.to).toBe(240);
      for (const s of c.script) {
        // Baked with its true heading: the engine never turns or mirrors it.
        expect(s.facing, c.id).toBe('SE');
        // Steps one tick at a time while it moves.
        if (s.path) expect(s.to - s.from, c.id).toBe(1);
        for (const p of s.path ?? [s.at!])
          expect(inCaravanPlot(p, 0), c.id).toBe(true);
      }
    }
    // Every figure's every place is on the desert's sand (the elephant waits
    // at its western edge, by the beach).
    for (const c of cast)
      for (const s of c.script)
        for (const t of s.path ?? [s.at!])
          expect(['desert', 'beach'], `${c.id} ${t}`).toContain(
            wildAt(tileToPlanet(...t), t),
          );
    expect(wildAt(tileToPlanet(...CARAVAN.center), CARAVAN.center)).toBe(
      'desert',
    );
  });
  it('plays one strip per figure, a pose every tick, in both views', () => {
    for (const c of cast) {
      const action = c.script[0].action;
      for (const view of ['SE', 'NE']) {
        const base = `art/sprites/anim/${c.id}__${action}_${view}`;
        expect(existsSync(`${base}.png`), base).toBe(true);
        const meta = json(`${base}.json`);
        expect(meta.tempo).toBe(1);
        expect(meta.sequence).toHaveLength(240);
        expect(meta.density).toBe(3);
      }
    }
    expect(
      characterSchema.parse(json('content/characters/mansa-musa.json'))
        .panelApproved,
    ).toBe(false);
  });
  it('clears desert pieces from its route, keeping only its own stalls and stores', () => {
    const places = cast.flatMap((c) =>
      c.script.flatMap((s) => s.path ?? [s.at!]),
    );
    for (const [id, x, y] of MASSAWA_OBJECTS) {
      if (id.startsWith('sup-caravan-')) continue;
      const nearest = Math.min(
        ...places.map((p) => Math.hypot(p[0] - x, p[1] - y)),
      );
      expect(nearest, `${id} at ${x},${y}`).toBeGreaterThan(2.5);
    }
    expect(
      MASSAWA_OBJECTS.filter(([id]) => id.startsWith('sup-caravan-stall')),
    ).toHaveLength(3);
    for (const [id, x, y] of MASSAWA_OBJECTS.filter(([id]) =>
      id.startsWith('sup-caravan-'),
    ))
      expect(inCaravanPlot([x, y], 0), id).toBe(true);
  });
  it('roams the open desert, well beyond the market lane', () => {
    const tiles = (id: string) =>
      cast.find((c) => c.id === id)!.script.flatMap((s) => s.path ?? [s.at!]);
    const ruler = tiles('mansa-musa'),
      span = (i: number) =>
        Math.max(...ruler.map((p) => p[i])) -
        Math.min(...ruler.map((p) => p[i]));
    // About 18 tiles across and 8 deep, against the old 10 by 7.
    expect(span(0)).toBeGreaterThan(16);
    expect(span(1)).toBeGreaterThan(7.5);
    // The elephant walks its own circuit now, and the bearers loop wide.
    for (const id of [
      'caravan-loaded-elephant',
      'caravan-overhead-gold-bearer',
    ]) {
      const t = tiles(id),
        far = Math.max(
          ...t.map((p) => Math.hypot(p[0] - t[0][0], p[1] - t[0][1])),
        );
      expect(far, id).toBeGreaterThan(4);
    }
  });
  it('drops shining gold where it walks: coins fall, glint, then are gathered', () => {
    const drops = cast.filter((c) => c.id.startsWith('caravan-gold-drop-'));
    expect(drops.length).toBeGreaterThanOrEqual(15);
    const walkers = cast.filter((c) => !c.id.startsWith('caravan-gold-drop-'));
    for (const d of drops) {
      expect(d.kind).toBe('ball');
      expect(d.script).toHaveLength(1);
      const at = d.script[0].at!;
      // Under someone's route: a bearer, a camel or the ruler passed here.
      const near = Math.min(
        ...walkers.flatMap((c) =>
          c.script.flatMap((s) =>
            (s.path ?? [s.at!]).map((p) =>
              Math.hypot(p[0] - at[0], p[1] - at[1]),
            ),
          ),
        ),
      );
      expect(near, d.id).toBeLessThan(1.5);
      const meta = json(`art/sprites/anim/${d.id}__ball_still_SE.json`);
      expect(meta.outline).toBe(false);
      const seq: number[] = meta.sequence;
      // Absent for part of the loop, falls (1–4), rests and twinkles (7, 8).
      expect(seq.filter((f) => f === 0).length).toBeGreaterThan(60);
      for (const f of [1, 2, 3, 4, 6, 7, 8]) expect(seq).toContain(f);
      const first = seq.indexOf(1);
      expect(seq.slice(first, first + 4)).toEqual([1, 2, 3, 4]);
    }
    // Several glint on the sand at any moment.
    for (let t = 0; t < 240; t += 20) {
      const shown = drops.filter(
        (d) =>
          json(`art/sprites/anim/${d.id}__ball_still_SE.json`).sequence[t] > 0,
      );
      expect(shown.length, `tick ${t}`).toBeGreaterThanOrEqual(5);
    }
  });
});
