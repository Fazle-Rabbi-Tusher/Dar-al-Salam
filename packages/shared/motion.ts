import type { Action } from './schema';

/*
 * Motion for supplied still sprites. The art is never redrawn: the engine
 * moves the whole figure a little (breathing, a walking bob, a hop, a lean)
 * so it reads as alive while keeping the artist's design exactly. Driven by
 * the 12 fps world frame only, so it is deterministic and loops cleanly.
 */
export type Motion = {
  /** Lift above the floor, world px. */
  lift: number;
  /** Scale about the feet. */
  sx: number;
  sy: number;
  /** Lean, radians; positive leans toward the way the figure faces. */
  lean: number;
};
const STILL: Motion = { lift: 0, sx: 1, sy: 1, lean: 0 };
const TAU = Math.PI * 2;
const phase = (frame: number, period: number) =>
  (((frame % period) + period) % period) / period;

const WALK = new Set<Action>(['walk', 'carry', 'sweep']);
const HOP = new Set<Action>(['cheer', 'celebrate', 'arms-out', 'taunt']);
const STRIKE = new Set<Action>(['kick', 'punch', 'bat']);
const TALK = new Set<Action>(['talk', 'speech', 'wave']);

export function motionFor(action: Action, frame: number): Motion {
  if (WALK.has(action)) {
    // Two steps a second: a bob on each step and a small side-to-side sway.
    const t = phase(frame, 12);
    return {
      lift: Math.abs(Math.sin(t * TAU)) * 1.2,
      sx: 1,
      sy: 1,
      lean: 0.035 + Math.sin(t * TAU) * 0.03,
    };
  }
  if (HOP.has(action)) {
    // A happy hop every two seconds, squashing a little on landing.
    const t = phase(frame, 24),
      up = t < 0.5 ? Math.sin(t * 2 * Math.PI) : 0;
    const land = t >= 0.5 && t < 0.6 ? 1 : 0;
    return {
      lift: up * 4,
      sx: 1 + land * 0.03,
      sy: 1 - land * 0.04 + up * 0.02,
      lean: 0,
    };
  }
  if (STRIKE.has(action)) {
    // A quick lunge forward and back.
    const t = phase(frame, 12),
      k = t < 0.3 ? t / 0.3 : Math.max(0, 1 - (t - 0.3) / 0.4);
    return { lift: 0, sx: 1, sy: 1 - k * 0.02, lean: k * 0.12 };
  }
  if (action === 'guard') {
    // Bouncing lightly on the toes.
    const t = phase(frame, 8);
    return {
      lift: Math.abs(Math.sin(t * TAU)) * 0.8,
      sx: 1,
      sy: 1,
      lean: 0.02,
    };
  }
  // Calm poses breathe; talking adds a slow nod.
  const t = phase(frame, 48),
    breath = Math.sin(t * TAU);
  if (TALK.has(action))
    return {
      lift: 0,
      sx: 1,
      sy: 1 + breath * 0.012,
      lean: Math.sin(phase(frame, 24) * TAU) * 0.02,
    };
  return { ...STILL, sy: 1 + breath * 0.012 };
}
