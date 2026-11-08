import { describe, expect, it } from 'vitest';
import {
  PLANET,
  RADIUS_PX,
  focusFromWorld,
  frame,
  latLon,
  planetToTile,
  projectTile,
  screenFacing,
  tileToPlanet,
  unproject,
  worldFromFocus,
  WILD,
  WILD_GLSL,
  landField,
  mapDistance,
  wildAt,
  wildPlantings,
  type View,
} from './planet';
import { worldFromTile } from './iso';

const view = (tile: [number, number], zoom = 2): View => ({
  ...latLon(tileToPlanet(...tile)),
  zoom,
  width: 1440,
  height: 1000,
});

describe('planet projection', () => {
  it('round-trips tiles through the sphere, including far from the map', () => {
    for (const t of [
      [48, 47],
      [0, 0],
      [96, 64],
      [12.5, 47.25],
      [140, -20],
    ] as [number, number][]) {
      const back = planetToTile(tileToPlanet(...t));
      expect(back[0]).toBeCloseTo(t[0], 6);
      expect(back[1]).toBeCloseTo(t[1], 6);
    }
  });
  it('keeps distances from the centre (azimuthal equidistant)', () => {
    const p = tileToPlanet(PLANET.centre[0] + 10, PLANET.centre[1]);
    expect(Math.acos(p[2]) * PLANET.radiusTiles).toBeCloseTo(10, 6);
  });
  it('places the focus at the screen centre when zoomed in', () => {
    const f = frame(view([30, 30], 3));
    const p = projectTile(f, [30, 30]);
    expect(p.x).toBeCloseTo(720, 3);
    expect(p.y).toBeCloseTo(500, 3);
    expect(p.rotation).toBe(0);
  });
  it('matches the isometric diamond at the focus and keeps north up', () => {
    // Exact at the projection centre; elsewhere the map stretches a little.
    const [cx, cy] = PLANET.centre;
    const f = frame(view([cx, cy], 1));
    const o = projectTile(f, [cx, cy]),
      east = projectTile(f, [cx + 0.01, cy]),
      south = projectTile(f, [cx, cy + 0.01]);
    const iso = (a: [number, number], b: [number, number]) => [
      (worldFromTile(...b)[0] - worldFromTile(...a)[0]) / 0.01,
      (worldFromTile(...b)[1] - worldFromTile(...a)[1]) / 0.01,
    ];
    const se = iso([30, 30], [30.01, 30]),
      sw = iso([30, 30], [30, 30.01]);
    expect((east.x - o.x) / 0.01).toBeCloseTo(se[0], 0);
    expect((east.y - o.y) / 0.01).toBeCloseTo(se[1], 0);
    expect((south.x - o.x) / 0.01).toBeCloseTo(sw[0], 0);
    expect((south.y - o.y) / 0.01).toBeCloseTo(sw[1], 0);
  });
  it('tilts billboards outward toward the horizon and sorts nearer points later', () => {
    const f = frame(view([30, 30], 1));
    const east = projectTile(f, [40, 20]),
      west = projectTile(f, [20, 40]);
    expect(east.rotation).toBeGreaterThan(0.05);
    expect(west.rotation).toBeLessThan(-0.05);
    expect(projectTile(f, [31, 31]).depth).toBeGreaterThan(
      projectTile(f, [29, 29]).depth,
    );
  });
  it('unprojects a screen point back onto the same planet point', () => {
    const f = frame(view([30, 30], 2));
    const p = projectTile(f, [33, 28]);
    const q = unproject(f, p.x, p.y)!;
    const t = planetToTile(q);
    expect(t[0]).toBeCloseTo(33, 4);
    expect(t[1]).toBeCloseTo(28, 4);
    expect(unproject(f, -5000, -5000)).toBeNull();
  });
  it('chooses baked facings from the camera, and back characters stay back', () => {
    const f = frame(view([30, 30], 2));
    const at: [number, number] = [30, 30];
    expect(screenFacing(f, at, [1, 0], 0)).toBe('SE');
    expect(screenFacing(f, at, [0, 1], 0)).toBe('SW');
    expect(screenFacing(f, at, [-1, 0], 0)).toBe('NW');
    expect(screenFacing(f, at, [0, -1], 0)).toBe('NE');
    expect(screenFacing(f, at, [1, 0], 0, true)).toBe('NE');
    expect(screenFacing(f, at, [0, 1], 0, true)).toBe('NW');
  });
  it('converts URL world px to a focus and back', () => {
    const [x, y] = worldFromTile(25, 40);
    const { lat, lon } = focusFromWorld(x, y);
    const back = worldFromFocus(lat, lon);
    expect(back[0]).toBeCloseTo(x, 4);
    expect(back[1]).toBeCloseTo(y, 4);
    expect(RADIUS_PX).toBeGreaterThan(900);
  });
});

describe('wild landscape', () => {
  const lattice = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const y = 1 - ((i + 0.5) / n) * 2,
        r = Math.sqrt(1 - y * y),
        a = Math.PI * (3 - Math.sqrt(5)) * i;
      return [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number];
    });
  it('is a deterministic function of the planet point', () => {
    for (const p of lattice(500)) {
      expect(wildAt(p)).toBe(wildAt([...p]));
      expect(landField(p)).toBe(landField([...p]));
    }
    expect(wildPlantings()).toEqual(wildPlantings());
  });
  it('has sea, beaches, meadows, forests and rocky hills', () => {
    const seen = new Set(lattice(20000).map((p) => wildAt(p)));
    for (const b of ['sea', 'shallows', 'beach', 'meadow', 'forest', 'rock'])
      expect(seen.has(b as never), b).toBe(true);
  });
  it('keeps the sea at least ten tiles from the mapped quarter', () => {
    for (const p of lattice(40000)) {
      const t = planetToTile(p),
        d = mapDistance(t);
      if (d === 0) continue;
      const b = wildAt(p, t);
      if (b === 'sea' || b === 'shallows') expect(d).toBeGreaterThan(10);
    }
    expect(WILD.coast.minimum).toBeGreaterThanOrEqual(10);
  });
  it('plants nothing in the water except ships, and nothing on the map', () => {
    const plantings = wildPlantings();
    expect(plantings.length).toBeGreaterThan(1500);
    expect(plantings.length).toBeLessThan(2500);
    for (const w of plantings) {
      expect(mapDistance(w.tile)).toBeGreaterThan(1.5);
      const b = wildAt(w.p, w.tile);
      if (w.kind === 'ship') expect(b).toBe('sea');
      else expect(['sea', 'shallows']).not.toContain(b);
      if (w.kind === 'palm' || w.kind === 'beach-rock') expect(b).toBe('beach');
    }
    const kinds = new Set(plantings.map((w) => w.kind));
    for (const k of ['forest-tree', 'palm', 'boulder', 'waterfall', 'ship'])
      expect(kinds.has(k as never), k).toBe(true);
  });
  it('compiles the same fields for the shader', () => {
    for (const fn of [
      'coveField',
      'islandField',
      'forestField',
      'rockField',
      'landField',
    ])
      expect(WILD_GLSL).toContain(`float ${fn}(`);
  });
});
