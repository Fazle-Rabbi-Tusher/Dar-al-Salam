import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { characterState } from './script';
import { characterSchema } from './schema';
import { landField, tileToPlanet, wildPlantings } from './planet';
import {
  createShipRoute,
  evaluateWorldLife,
  HARBOR_SHIP_ANCHOR,
  shipState,
  signalState,
  taxiState,
  tramState,
} from './world-life';

const distance = (a: number[], b: number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('district world life', () => {
  it('evaluates the same scene independently of history and wraps the master loop exactly', () => {
    for (const f of [-480, -1, 0, 13.5, 71, 120, 239, 555]) {
      const state = evaluateWorldLife(f);
      evaluateWorldLife(f + 97);
      expect(evaluateWorldLife(f)).toEqual(state);
      expect(evaluateWorldLife(f + 240)).toEqual(state);
    }
  });
  it('stops the tram before opening doors, reverses only at terminals and never teleports', () => {
    const visited = new Set<number>();
    for (let frame = 0; frame < 240; frame++) {
      const state = tramState(frame),
        next = tramState(frame + 1);
      expect(state.speed).toBeLessThanOrEqual(0.25);
      expect(distance(state.tile, next.tile)).toBeLessThanOrEqual(0.25);
      if (state.doorsOpen) {
        expect(state.phase).toBe('platform');
        expect(state.tile).toEqual([-11, 74]);
        expect(state.speed).toBe(0);
      }
      if (state.facing !== next.facing) {
        expect(state.phase).toBe('terminal');
        expect(next.speed).toBe(0);
      }
      visited.add(state.tile[1]);
    }
    expect(visited.has(68)).toBe(true);
    expect(visited.has(80)).toBe(true);
    expect(tramState(10).doors).toBe(1);
    expect(tramState(24).doors).toBe(0);
    expect(tramState(130).doors).toBe(1);
  });
  it('keeps all three ship courses offshore, closed, and slow enough for a harbor', () => {
    const anchors = wildPlantings()
      .filter((p) => p.kind === 'ship')
      .map((p) => p.tile);
    expect(anchors).toHaveLength(3);
    for (const [i, anchor] of anchors.entries()) {
      const route = createShipRoute(anchor, i * 0.7);
      expect(shipState(0, route)).toEqual(shipState(240, route));
      for (let frame = 0; frame < 240; frame += 0.5) {
        const ship = shipState(frame, route);
        expect(landField(tileToPlanet(...ship.tile), ship.tile)).toBeLessThan(
          -1,
        );
        expect(ship.speed).toBeLessThan(0.1);
        expect(
          distance(ship.tile, shipState(frame + 0.5, route).tile),
        ).toBeLessThan(0.05);
        expect(ship.wakeStrength).toBeGreaterThan(0);
      }
    }
    expect(() => createShipRoute([48, 62])).toThrow(/offshore/);
    expect(distance(shipState(0).tile, HARBOR_SHIP_ANCHOR)).toBeGreaterThan(1);
    expect(shipState(30).roll).not.toBe(shipState(0).roll);
  });
  it('never gives pedestrians and road traffic right of way together and preserves clearance', () => {
    for (let frame = 0; frame < 240; frame++) {
      const signal = signalState(frame);
      expect(signal.trafficAllowed && signal.walkAllowed).toBe(false);
      if (signal.walkAllowed || signal.pedestrians === 'clearance')
        expect(signal.vehicle).toBe('red');
      if (signal.vehicle === 'amber') expect(signal.walkAllowed).toBe(false);
    }
    expect(signalState(70).phaseName).toBe('all-red');
    expect(signalState(75).vehicle).toBe('green');
    expect(signalState(210).phaseName).toBe('all-red');
    expect(signalState(220).walkAllowed).toBe(true);
  });
  it('waits the taxi at its stop line, crosses only clear of pedestrians and respects the speed cap', () => {
    for (let frame = 0; frame < 240; frame++) {
      const taxi = taxiState(frame),
        next = taxiState(frame + 1);
      expect(taxi.speed).toBeLessThanOrEqual(0.25 + 1e-12);
      expect(distance(taxi.tile, next.tile)).toBeLessThanOrEqual(0.25 + 1e-12);
      if (frame >= 36 && frame < 72) {
        expect(taxi.phase).toBe('waiting');
        expect(taxi.tile).toEqual([23, 77.3]);
        expect(taxi.speed).toBe(0);
      }
      if (Math.abs(taxi.tile[0] - 24.5) < 1) {
        expect(signalState(frame).walkAllowed).toBe(false);
        expect(signalState(frame).vehicle).toBe('green');
      }
    }
    expect(taxiState(0)).toEqual(taxiState(240));
  });
  it('keeps the original scooter rider on traffic green and in a separate lane', async () => {
    const actor = characterSchema.parse(
      JSON.parse(
        await fs.readFile('content/characters/zohran-mamdani.json', 'utf8'),
      ),
    );
    for (let f = 0; f < 240; f++) {
      const scooter = characterState(actor, f),
        taxi = taxiState(f);
      // The original rider crosses westbound on the north lane; do not alter him.
      if (Math.abs(scooter.tile[0] - 24.5) < 1 && scooter.tile[1] === 76.5)
        expect(signalState(f).vehicle).toBe('green');
      expect(distance(taxi.tile, scooter.tile)).toBeGreaterThan(0.7);
    }
  });
});
