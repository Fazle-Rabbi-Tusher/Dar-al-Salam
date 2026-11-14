import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DARK_ROOM,
  DARK_ROOM_DEFAULTS,
  darkRoomCamera,
  darkRoomTile,
} from './dark-room';
import { tileFromWorld } from './iso';
import { parseUrl, serialiseUrl } from './url';

describe('approved dark room in the native world', () => {
  it('uses one uniform transform for the architecture, instruments and camera', () => {
    expect(darkRoomTile(0, 0)).toEqual(DARK_ROOM.origin);
    const a = darkRoomTile(1, 0),
      b = darkRoomTile(0, 1);
    expect(a[1] - DARK_ROOM.origin[1]).toBeCloseTo(-DARK_ROOM.scale);
    expect(b[0] - DARK_ROOM.origin[0]).toBeCloseTo(DARK_ROOM.scale);
    const camera = darkRoomCamera(7.44, -1.4, 10);
    expect(tileFromWorld(camera.x, camera.y)[0]).toBeCloseTo(
      darkRoomTile(7.44, -1.4)[0],
    );
    expect(tileFromWorld(camera.x, camera.y)[1]).toBeCloseTo(
      darkRoomTile(7.44, -1.4)[1],
    );
    expect(parseUrl(serialiseUrl(camera)).zoom).toBe(10);
  });
  it('places the original scholar animation beside the approved bench, on the floor and off the optical axis', () => {
    const c = JSON.parse(
        readFileSync('content/characters/ibn-al-haytham.json', 'utf8'),
      ),
      s = c.script[0],
      x = (DARK_ROOM.origin[1] - s.at[1]) / DARK_ROOM.scale,
      z = (s.at[0] - DARK_ROOM.origin[0]) / DARK_ROOM.scale;
    expect(x).toBeCloseTo(2.45);
    expect(z).toBeCloseTo(1.25);
    expect(s.z).toBeCloseTo((0.23 * DARK_ROOM.scale * 32) / Math.SQRT2, 1);
    expect(z).toBeLessThan(2.05); // unobstructed access behind the optical bench
    expect(Math.abs(z + 1.4)).toBeGreaterThan(2); // pinhole-to-screen cone stays clear
    for (const side of ['SE', 'NE']) {
      const a = JSON.parse(
        readFileSync(
          `art/sprites/anim/ibn-al-haytham__write_${side}.json`,
          'utf8',
        ),
      );
      expect(a.sequence).toHaveLength(40);
      expect(a.foot).toEqual([138, 299]);
    }
    expect(c.panelApproved).toBe(false);
    expect(DARK_ROOM_DEFAULTS.cutaway).toBe(true);
  });
});
