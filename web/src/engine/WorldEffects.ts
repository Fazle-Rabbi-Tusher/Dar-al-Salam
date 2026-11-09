import { Container, Graphics } from 'pixi.js';
import { MASTER_LOOP } from '../../../packages/shared/clock';
import type { DistrictMood } from '../../../packages/shared/districts';
import type { Point } from '../../../packages/shared/iso';
import {
  projectTile,
  tileToPlanet,
  wildAt,
  type Frame,
  type Projected,
} from '../../../packages/shared/planet';
import {
  signalState,
  tramState,
  windState,
} from '../../../packages/shared/world-life';

export type WakeSource = {
  tile: Point;
  velocity: Point;
  speed: number;
};
export type WorldEffectsView = {
  frame: number;
  projection: Frame;
  zoom: number;
  width: number;
  height: number;
  mood: DistrictMood;
  ships?: readonly WakeSource[];
};

const COTTAGES: readonly Point[] = [
  [22, -10],
  [29, -12],
  [34, -7],
  [22, -3],
  [33, -3],
];
const CITY_SIGNALS: readonly Point[] = [
  [26, 75],
  [28, 78],
];
const FLOCKS: readonly {
  centre: Point;
  lift: number;
  count: number;
  phase: number;
}[] = [
  { centre: [28, -7], lift: 142, count: 3, phase: 0.3 },
  { centre: [86.4, -33.4], lift: 164, count: 4, phase: 1.7 },
  { centre: [115, 103], lift: 126, count: 4, phase: 3.1 },
];
const TAU = Math.PI * 2;
const cycle = (frame: number) =>
  ((frame % MASTER_LOOP) + MASTER_LOOP) % MASTER_LOOP;

/** The same analytic breeze can sway the parent renderer's foliage and sails. */
export function windSample(frame: number, tile: Point = [0, 0]) {
  const t = cycle(frame) / MASTER_LOOP;
  const phase = tile[0] * 0.073 + tile[1] * 0.051;
  const wind = windState(frame);
  return (
    (wind.sway / 0.012) * 0.8 + Math.sin(t * TAU * 2 + phase) * wind.gust * 0.2
  );
}

/**
 * Small environmental details, projected from actual ground locations. All
 * motion follows the world frame: pause freezes smoke, birds, beacons and
 * wakes along with the original characters. One Graphics layer batches the
 * effects; no filters, timers, random calls or independent animation loops.
 */
export class WorldEffects {
  readonly container = new Container();
  private readonly graphics = new Graphics();

  constructor() {
    this.container.eventMode = 'none';
    this.container.addChild(this.graphics);
  }

  update(view: WorldEffectsView) {
    const g = this.graphics;
    g.clear();
    this.container.visible = view.zoom > 0.42;
    if (!this.container.visible) return;
    const frame = cycle(view.frame);
    this.drawWakes(view, frame);
    this.drawCatenary(view);
    this.drawHearths(view, frame);
    this.drawSignals(view, frame);
    this.drawBeacons(view, frame);
    if (view.mood !== 'night-city' && view.mood !== 'rain-street')
      this.drawBirds(view, frame);
  }

  destroy() {
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }

  private point(view: WorldEffectsView, tile: Point, lift = 0) {
    const p = projectTile(view.projection, tile, lift);
    if (
      p.depth < 0.025 ||
      p.x < -100 ||
      p.y < -100 ||
      p.x > view.width + 100 ||
      p.y > view.height + 100
    )
      return null;
    return p;
  }

  private local(p: Projected, x: number, y: number, zoom: number): Point {
    const c = Math.cos(p.rotation),
      s = Math.sin(p.rotation);
    return [
      Math.round(p.x + (x * c - y * s) * zoom),
      Math.round(p.y + (x * s + y * c) * zoom),
    ];
  }

  private rect(
    p: Projected,
    x: number,
    y: number,
    w: number,
    h: number,
    zoom: number,
    color: number,
    alpha = 1,
  ) {
    const corners = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ] as Point[];
    this.graphics
      .poly(corners.flatMap((q) => this.local(p, q[0], q[1], zoom)))
      .fill({ color, alpha });
  }

  private drawHearths(view: WorldEffectsView, frame: number) {
    const g = this.graphics;
    for (const [i, cottage] of COTTAGES.entries()) {
      // Three occupied hearths, rather than every house puffing in unison.
      if (i % 2) continue;
      const chimney: Point = [cottage[0] + 0.24, cottage[1] - 0.05];
      const roof = this.point(view, chimney, 75);
      if (!roof) continue;
      this.rect(roof, -2.5, -9, 5, 10, view.zoom, 0x535c59);
      this.rect(roof, -3.5, -10, 7, 2, view.zoom, 0x898c78);
      this.rect(roof, -1.5, -9, 3, 1, view.zoom, 0x252e31);
      for (let j = 0; j < 4; j++) {
        const age = cycle(frame + i * 31 + j * 60) / MASTER_LOOP;
        const breeze = windSample(frame, cottage);
        const p = this.point(
          view,
          [chimney[0] + age * 0.28, chimney[1] - age * 0.15],
          85 + age * 38,
        );
        if (!p) continue;
        const alpha = Math.sin(age * Math.PI) * (1 - age * 0.45) * 0.23;
        const drift = (age * age * 13 + breeze * age * 4) * view.zoom;
        const size = (2.7 + age * 5.1) * view.zoom;
        const x = Math.round(p.x + drift),
          y = Math.round(p.y);
        // Stepped translucent clumps preserve the landscape's pixel scale.
        g.rect(x - size * 0.7, y - size * 0.5, size * 1.4, size).fill({
          color: 0xd7d6bb,
          alpha,
        });
        g.rect(x - size * 0.4, y - size * 0.75, size, size * 1.3).fill({
          color: 0xdce4d1,
          alpha: alpha * 0.7,
        });
      }
    }
  }

  /** Fixed supply infrastructure stays behind when the tram leaves its stop.
   * The shallow span follows the same planet projection as the track and car. */
  private drawCatenary(view: WorldEffectsView) {
    const g = this.graphics;
    for (const y of [68, 80]) {
      const base = this.point(view, [-12.1, y]);
      const top = this.point(view, [-12.1, y], 157);
      const contact = this.point(view, [-11, y], 148);
      if (!base || !top || !contact) continue;
      g.moveTo(base.x, base.y)
        .lineTo(top.x, top.y)
        .stroke({ color: 0x263c42, width: Math.max(1, view.zoom * 1.6) });
      g.moveTo(top.x, top.y)
        .lineTo(contact.x, contact.y)
        .stroke({ color: 0x5a7375, width: Math.max(1, view.zoom) });
      g.circle(contact.x, contact.y, Math.max(0.7, view.zoom * 0.7)).fill({
        color: 0x879a94,
      });
    }
    let started = false;
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const p = this.point(
        view,
        [-11, 68 + t * 12],
        148 - Math.sin(t * Math.PI) * 1.4,
      );
      if (!p) {
        started = false;
        continue;
      }
      if (started) g.lineTo(p.x, p.y);
      else {
        g.moveTo(p.x, p.y);
        started = true;
      }
    }
    g.stroke({
      color: 0x354e57,
      width: Math.max(0.8, view.zoom * 0.7),
      alpha: 0.92,
    });
  }

  private drawSignals(view: WorldEffectsView, frame: number) {
    const g = this.graphics;
    const signal = signalState(frame);
    for (const tile of CITY_SIGNALS) {
      const foot = this.point(view, tile),
        head = this.point(view, tile, 43);
      if (!foot || !head) continue;
      g.moveTo(foot.x, foot.y)
        .lineTo(head.x, head.y + 3 * view.zoom)
        .stroke({ color: 0x1d3036, width: Math.max(1, 2 * view.zoom) });
      this.rect(head, -4, -10, 8, 22, view.zoom, 0x14242c);
      this.rect(head, -5, -11, 10, 2, view.zoom, 0x60706b);
      const lights = [
        { state: 'red', y: -6.4, color: 0xf16a52 },
        { state: 'amber', y: 0, color: 0xf9ca5e },
        { state: 'green', y: 6.4, color: 0x8bd8af },
      ];
      for (const light of lights) {
        const [x, y] = this.local(head, 0, light.y, view.zoom);
        const lit = signal.vehicle === light.state;
        g.circle(x, y, 2.15 * view.zoom).fill({
          color: light.color,
          alpha: lit ? 0.96 : 0.12,
        });
        if (lit)
          g.circle(x, y, 3.7 * view.zoom).fill({
            color: light.color,
            alpha: 0.12,
          });
      }
      const crossing = this.point(view, [tile[0] + 0.08, tile[1] + 0.04], 25);
      if (crossing) {
        this.rect(crossing, -4, -3, 8, 6, view.zoom, 0x172b31);
        const clearance = signal.pedestrians === 'clearance';
        const alpha = clearance && frame % 12 >= 6 ? 0.25 : 0.96;
        this.rect(
          crossing,
          -2.5,
          -1.5,
          5,
          3,
          view.zoom,
          signal.walkAllowed ? 0xb4e6c0 : clearance ? 0xf0c86a : 0xec8266,
          alpha,
        );
      }
    }

    // A platform indicator reports boarding at the actual stopped tram, rather
    // than borrowing the independent road-intersection pedestrian cycle.
    const tram = tramState(frame);
    const lamp = this.point(view, [-13.2, 74.1], 31);
    const base = this.point(view, [-13.2, 74.1]);
    if (lamp && base) {
      g.moveTo(base.x, base.y)
        .lineTo(lamp.x, lamp.y)
        .stroke({ color: 0x263e42, width: Math.max(1, 1.4 * view.zoom) });
      this.rect(lamp, -3.5, -3, 7, 6, view.zoom, 0x1a2d32);
      const boarding =
        tram.phase === 'platform' && tram.doorsOpen && tram.speed < 0.001;
      const color = boarding
        ? 0x9ce3b3
        : tram.brakeLights
          ? 0xf5c975
          : 0xb9765b;
      this.rect(lamp, -2, -1.5, 4, 3, view.zoom, color);
    }
  }

  private drawBeacons(view: WorldEffectsView, frame: number) {
    if (view.mood !== 'night-city') return;
    const g = this.graphics;
    const beacons: { tile: Point; lift: number; offset: number }[] = [
      { tile: [48.3, 67.7], lift: 330, offset: 0 },
      { tile: [51, 80.6], lift: 255, offset: 12 },
      { tile: [14.5, 67.7], lift: 286, offset: 24 },
    ];
    for (const beacon of beacons) {
      const p = this.point(view, beacon.tile, beacon.lift);
      if (!p) continue;
      const phase = (frame + beacon.offset) % 48;
      const alpha = phase < 12 ? 0.92 : 0.27;
      g.circle(p.x, p.y, Math.max(1, 1.5 * view.zoom)).fill({
        color: 0xf07263,
        alpha,
      });
      if (phase < 12)
        g.circle(p.x, p.y, 3.5 * view.zoom).fill({
          color: 0xf38c78,
          alpha: 0.09,
        });
    }
  }

  private drawBirds(view: WorldEffectsView, frame: number) {
    const g = this.graphics;
    const t = (frame / MASTER_LOOP) * TAU;
    const wind = windState(frame);
    for (const [index, flock] of FLOCKS.entries())
      for (let i = 0; i < flock.count; i++) {
        const a = t + flock.phase - i * 0.075;
        const tile: Point = [
          flock.centre[0] + Math.cos(a) * (6.5 + index) + (wind.x - 0.7) * 2,
          flock.centre[1] +
            Math.sin(a) * (3.1 + index * 0.5) +
            (wind.y - 0.16) * 2,
        ];
        const lift = flock.lift + Math.sin(a * 2 + i) * 5 + i * 1.8;
        const p = this.point(view, tile, lift);
        if (!p) continue;
        const wing = Math.sin((frame / 12) * TAU + i * 1.7) * 2.1;
        const span = (3.3 + (i % 2) * 0.4) * view.zoom;
        const y = Math.round(p.y),
          x = Math.round(p.x);
        const color = index === 2 ? 0xd8e7de : 0x203f43;
        g.moveTo(x - span, y - wing * view.zoom)
          .lineTo(x, y)
          .lineTo(x + span, y - wing * view.zoom)
          .stroke({ color, width: Math.max(1, view.zoom * 0.85), alpha: 0.85 });
      }
  }

  private drawWakes(view: WorldEffectsView, frame: number) {
    const g = this.graphics;
    for (const ship of view.ships ?? []) {
      if (ship.speed < 0.002) continue;
      const length = Math.hypot(...ship.velocity);
      if (length < 1e-7) continue;
      const direction: Point = [
        ship.velocity[0] / length,
        ship.velocity[1] / length,
      ];
      const normal: Point = [-direction[1], direction[0]];
      for (const side of [-1, 1]) {
        let started = false;
        for (let j = 0; j <= 9; j++) {
          const trail = 1.4 + j * 0.36;
          const width = 0.24 + j * 0.07;
          const tile: Point = [
            ship.tile[0] - direction[0] * trail + normal[0] * side * width,
            ship.tile[1] - direction[1] * trail + normal[1] * side * width,
          ];
          const biome = wildAt(tileToPlanet(...tile), tile);
          if (biome !== 'sea' && biome !== 'shallows') {
            started = false;
            continue;
          }
          const p = this.point(view, tile, 0.3);
          if (!p) {
            started = false;
            continue;
          }
          if (started) g.lineTo(p.x, p.y);
          else {
            g.moveTo(p.x, p.y);
            started = true;
          }
        }
        g.stroke({
          color: 0xd8f5e9,
          width: Math.max(1, view.zoom * 1.15),
          alpha: 0.32,
        });
      }
      for (let i = 0; i < 7; i++) {
        const age = ((frame + i * 31) % 60) / 60;
        const back = 1.7 + age * 3.2;
        const jitter = Math.sin(i * 2.9 + age * TAU) * 0.12;
        const tile: Point = [
          ship.tile[0] - direction[0] * back + normal[0] * jitter,
          ship.tile[1] - direction[1] * back + normal[1] * jitter,
        ];
        if (!['sea', 'shallows'].includes(wildAt(tileToPlanet(...tile), tile)))
          continue;
        const p = this.point(view, tile, 0.4);
        if (!p) continue;
        const size = (0.9 + age * 0.8) * view.zoom;
        g.rect(p.x - size, p.y, size * 2, Math.max(1, view.zoom)).fill({
          color: 0xeaf8e5,
          alpha: (1 - age) * 0.36,
        });
      }
    }
  }
}
