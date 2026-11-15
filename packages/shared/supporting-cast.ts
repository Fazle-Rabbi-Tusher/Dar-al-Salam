import {
  characterSchema,
  type Action,
  type Character,
  type Facing,
  type Step,
} from './schema';
import { darkRoomTile, DARK_ROOM } from './dark-room';
import { PODCAST } from './podcast';
import { TILE_SIDE } from './planet';
import type { Point } from './iso';

export type SupportingRole = {
  id: string;
  model: string;
  section: string;
  role: string;
  at: Point;
  facing: Facing;
  action: Action;
  z?: number;
  child?: boolean;
};
/** A deliberately small, authored cast. Existing laboratory staff and Menk's
 * listeners already populate their sections, so they are not duplicated. */
export const SUPPORTING_CAST: SupportingRole[] = [
  {
    id: 'support-knowledge-student',
    model: 'student',
    section: 'knowledge',
    role: 'A student studying a book beside the mathematics workshop',
    at: [14.5, 46.3],
    facing: 'NW',
    action: 'read',
  },
  {
    id: 'support-hospital-nurse',
    model: 'nurse',
    section: 'hospital',
    role: 'A nurse checking a clinical tablet beside the treatment beds',
    at: [12.1, 28.5],
    facing: 'NW',
    action: 'write',
  },
  {
    id: 'support-hospital-visitor',
    model: 'student',
    section: 'hospital',
    role: 'A visitor reading quietly beside the waiting area',
    at: [17.1, 30.7],
    facing: 'NE',
    action: 'read',
  },
  {
    id: 'support-garden-caretaker',
    model: 'gardener',
    section: 'hospitality',
    role: 'A caretaker watering the garden flowers',
    at: [28.4, 26.4],
    facing: 'NE',
    action: 'pour',
  },
  {
    id: 'support-community-host',
    model: 'host',
    section: 'community',
    role: 'A café host offering refreshments beside the coffee cart',
    at: [31.4, 43.3],
    facing: 'SW',
    action: 'carry',
  },
  {
    id: 'support-city-bookseller',
    model: 'bookseller',
    section: 'city',
    role: 'A bookseller arranging books at the street shop',
    at: [17.9, 75.3],
    facing: 'SW',
    action: 'talk',
  },
  {
    id: 'support-city-pedestrian',
    model: 'pedestrian',
    section: 'city',
    role: 'A neighbour walking along the pavement and pausing at the shops',
    at: [27.2, 75.2],
    facing: 'SE',
    action: 'walk',
  },
  {
    id: 'support-optics-assistant',
    model: 'student',
    section: 'dark-room',
    role: 'An optics assistant checking notes beside the experimental bench',
    at: darkRoomTile(5.7, 1.8),
    facing: 'SW',
    action: 'read',
    z: 0.23 * DARK_ROOM.scale * TILE_SIDE,
  },
  {
    id: 'support-podcast-operator',
    model: 'technician',
    section: 'podcast',
    role: 'A production technician monitoring the podcast recording',
    at: PODCAST.operator,
    facing: 'NE',
    action: 'write',
    z: PODCAST.floor,
  },
  {
    id: 'support-football-official',
    model: 'referee',
    section: 'football',
    role: 'An assistant referee watching the touchline with a lowered flag',
    at: [77.2, 31.5],
    facing: 'NE',
    action: 'idle',
  },
  {
    id: 'support-cricket-umpire',
    model: 'umpire',
    section: 'cricket',
    role: 'An umpire watching the delivery from behind the bowler’s wicket',
    at: [86.8, 112.8],
    facing: 'NW',
    action: 'idle',
    z: 1.2,
  },
  {
    id: 'support-basketball-coach',
    model: 'coach',
    section: 'basketball',
    role: 'A basketball coach encouraging the player from outside the court',
    at: [67.1, 41.7],
    facing: 'SE',
    action: 'talk',
  },
  {
    id: 'support-boxing-corner',
    model: 'coach',
    section: 'boxing',
    role: 'A cornerman waiting outside the boxing ring with a towel and water',
    at: [84.8, 52.5],
    facing: 'NW',
    action: 'talk',
  },
  {
    id: 'support-mma-corner',
    model: 'coach',
    section: 'mma',
    role: 'An MMA coach watching from outside the cage',
    at: [70.8, 51.8],
    facing: 'NW',
    action: 'talk',
  },
  {
    id: 'support-massawa-host',
    model: 'host',
    section: 'massawa',
    role: 'An anonymous market host offering refreshments beside a stall',
    at: [-1.3, 123.7],
    facing: 'SW',
    action: 'carry',
  },
  {
    id: 'support-school-boy',
    model: 'school-boy',
    section: 'school',
    role: 'A schoolboy reading while listening to his teacher',
    at: [52.2, 101.5],
    facing: 'SW',
    action: 'read',
    child: true,
  },
  {
    id: 'support-school-girl',
    model: 'school-girl',
    section: 'school',
    role: 'A schoolgirl studying her book beside her classmate',
    at: [53.7, 101.5],
    facing: 'SW',
    action: 'read',
    child: true,
  },
];
const roles = new Map(
  SUPPORTING_CAST.map((r, i) => [r.id, { ...r, phase: i * 11 }]),
);

export function supportingScript(r: SupportingRole): Step[] {
  const stay = (from: number, to: number, action: Action): Step => ({
    from,
    to,
    action,
    at: r.at,
    facing: r.facing,
    z: r.z ?? 0,
  });
  if (r.model === 'pedestrian') {
    const end: Point = [30.8, 75.2];
    return [
      {
        from: 0,
        to: 60,
        action: 'walk',
        path: [r.at, end],
        easing: 'smoothstep',
      },
      { from: 60, to: 120, action: 'idle', at: end, facing: 'SE' },
      {
        from: 120,
        to: 180,
        action: 'walk',
        path: [end, r.at],
        easing: 'smoothstep',
      },
      stay(180, 240, 'idle'),
    ];
  }
  if (r.model === 'gardener')
    return [stay(0, 72, 'idle'), stay(72, 120, 'pour'), stay(120, 240, 'idle')];
  return [stay(0, 240, r.action)];
}

/** Natural quiet holds, a short blink/gesture and independent authored phase;
 * no synchronized crowd bobbing or wall-clock/random animation. */
export function supportingPose(
  id: string,
  action: Action,
  frame: number,
): number | undefined {
  const role = roles.get(id);
  if (!role) return undefined;
  if (role.model === 'pedestrian')
    return action === 'walk' ? Math.floor(frame / 2) % 6 : 0;
  if (role.model === 'gardener')
    return action === 'pour' ? Math.floor((frame - 72) / 4) % 6 : 0;
  const t = (((frame + role.phase) % 120) + 120) % 120;
  return t < 102
    ? 0
    : t < 106
      ? 1
      : t < 110
        ? 2
        : t < 112
          ? 3
          : t < 116
            ? 4
            : 5;
}

export function supportingCharacters(): Character[] {
  return SUPPORTING_CAST.map((r) =>
    characterSchema.parse({
      id: r.id,
      kind: 'person',
      aliases: [],
      district: 'modern-quarter',
      depiction: 'full',
      role: r.role,
      strip: `support-${r.model}`,
      loop: 240,
      script: supportingScript(r),
      look: {
        base: r.child
          ? 'child'
          : r.model === 'nurse' || r.model === 'bookseller'
            ? 'adult-woman'
            : 'adult-man-clean',
        garment:
          r.model === 'nurse'
            ? 'scrubs'
            : r.model === 'bookseller' || r.model === 'school-girl'
              ? 'long-dress'
              : 'shirt-trousers',
        headwear: ['nurse', 'bookseller', 'school-girl'].includes(r.model)
          ? 'hijab'
          : r.model === 'umpire'
            ? 'cap'
            : 'none',
        prop: 'none',
        colours: {
          skin:
            r.model === 'nurse' || r.model === 'coach' ? 'skin-6' : 'skin-3',
          hair: 'hair-black',
          garmentPrimary: 'navy',
          garmentSecondary: 'white-linen',
          headwear: 'navy',
          prop: 'cocoa',
        },
      },
    }),
  );
}
