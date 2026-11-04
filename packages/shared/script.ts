import {
  ACTIONS,
  type Character,
  type Facing,
  type Step,
  type Room,
} from './schema';
import { frameMap } from './clock';
import { type Point, worldFromTile } from './iso';
export function facingFromSegment(a: Point, b: Point): Facing {
  const dx = b[0] - a[0] - (b[1] - a[1]),
    dy = b[0] - a[0] + (b[1] - a[1]);
  return dy >= 0 ? (dx >= 0 ? 'SE' : 'SW') : dx >= 0 ? 'NE' : 'NW';
}
export function pathLength(p: Point[]) {
  return p
    .slice(1)
    .reduce((n, v, i) => n + Math.hypot(v[0] - p[i][0], v[1] - p[i][1]), 0);
}
export function endpoints(s: Step): [Point, Point] {
  return s.path ? [s.path[0], s.path[s.path.length - 1]] : [s.at!, s.at!];
}
export function sampleStep(s: Step, t: number) {
  if (!s.path)
    return {
      tile: s.at!,
      facing: s.facing!,
      z: typeof s.z === 'number' ? s.z : 0,
    };
  let d = Math.max(0, Math.min(1, t)) * pathLength(s.path);
  for (let i = 1; i < s.path.length; i++) {
    const a = s.path[i - 1],
      b = s.path[i],
      len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= len || i === s.path.length - 1) {
      const q = len ? d / len : 0;
      const zs = s.z;
      return {
        tile: [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q] as Point,
        facing: facingFromSegment(a, b),
        z: Array.isArray(zs)
          ? (zs[i - 1] ?? 0) + ((zs[i] ?? 0) - (zs[i - 1] ?? 0)) * q
          : (zs ?? 0),
      };
    }
    d -= len;
  }
  throw Error('Empty path');
}
export function characterState(c: Character, global: number) {
  const frame = global % c.loop;
  const stepIndex = c.script.findIndex((s) => frame >= s.from && frame < s.to);
  const step = c.script[stepIndex];
  const pos = sampleStep(step, (frame - step.from) / (step.to - step.from));
  return {
    ...pos,
    position: worldFromTile(...pos.tile, pos.z),
    action: step.action,
    index: frameMap(frame, 60, ACTIONS[step.action]),
    stepIndex,
  };
}
export function scriptErrors(c: Character, room?: Room) {
  const errors: string[] = [];
  let last = 0;
  const collision = room?.layers.find(
    (l) => l.name === 'collision' && l.type === 'tilelayer',
  );
  for (const [i, s] of c.script.entries()) {
    if (s.from !== last || s.to <= s.from)
      errors.push(`step ${i}: gap/overlap at frame ${last}`);
    last = s.to;
    const end = endpoints(s)[1],
      next = endpoints(c.script[(i + 1) % c.script.length])[0];
    if (Math.hypot(end[0] - next[0], end[1] - next[1]) > 0.001)
      errors.push(`step ${i}: continuity failure`);
    if (c.depiction === 'back') {
      const facings = s.path
        ? s.path.slice(1).map((p, j) => facingFromSegment(s.path![j], p))
        : [s.facing];
      if (facings.some((f) => f === 'SE' || f === 'SW'))
        errors.push(`step ${i}: back depiction must face NE/NW`);
    }
    if (s.path) {
      const len = pathLength(s.path);
      if (
        ['walk', 'carry', 'cat_walk'].includes(s.action) &&
        len / (s.to - s.from) > 0.25
      )
        errors.push(`step ${i}: speed exceeds 1 tile / 4 frames`);
      if (
        room &&
        collision?.type === 'tilelayer' &&
        c.kind !== 'bird' &&
        c.kind !== 'ball'
      ) {
        for (let j = 0; j <= Math.ceil(len * 16); j++) {
          const p = sampleStep(s, j / Math.max(1, Math.ceil(len * 16))).tile,
            x = Math.floor(p[0]),
            y = Math.floor(p[1]);
          if (
            x < 0 ||
            y < 0 ||
            x >= room.width ||
            y >= room.height ||
            collision.data[y * room.width + x]
          ) {
            errors.push(`step ${i}: blocked tile ${x},${y}`);
            break;
          }
        }
      }
    }
  }
  if (last !== c.loop) errors.push(`script must cover 0…${c.loop}`);
  return errors;
}
