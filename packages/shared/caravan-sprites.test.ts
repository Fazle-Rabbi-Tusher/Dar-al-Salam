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
describe("Mansa Musa's caravan as pixel-art sprites in the desert", () => {
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
});
