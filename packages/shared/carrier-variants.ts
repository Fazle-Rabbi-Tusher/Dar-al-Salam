import { human, node, rotate, yaw, type RigNode } from './royal-caravan';
import type { Vertex3 } from './infrastructure';
import {
  carrierHandover,
  carrierRouteAt,
  goldCarrierActors,
  type CarrierRoute,
} from './gold-carriers';

function normalized(
  name: string,
  nodes: RigNode[],
  origin: Vertex3,
  angle: number,
) {
  const inverse = yaw(-angle),
    position = rotate(origin.map((n) => -n) as Vertex3, inverse);
  return node(name, undefined, position, inverse, nodes);
}
export function carrierVariant(name: string, frame: number): RigNode {
  const route: CarrierRoute =
    name === 'gold-handover-pair'
      ? (f, role) => ({ ...carrierRouteAt(0, role), t: f, walk: 0, travel: 0 })
      : carrierRouteAt;
  const root = goldCarrierActors(frame, human, route);
  if (name === 'gold-carriers-ensemble') return root;
  if (name === 'gold-handover-pair') {
    const first = carrierRouteAt(0, 'bearer');
    return normalized(
      name,
      root.children.filter((n) =>
        [
          'bowl-gold-bearer',
          'elder-recipient',
          'carrier-transferred-gold-coin',
        ].includes(n.name),
      ),
      first.point,
      first.heading,
    );
  }
  if (name === 'paired-chest-carriers') {
    const load = root.children.find((n) => n.name === 'shared-chest-rig')!;
    const pose = carrierRouteAt(frame, 'pair');
    return normalized(
      name,
      root.children.filter((n) =>
        [
          'chest-porter-rust',
          'chest-porter-indigo',
          'shared-chest-rig',
        ].includes(n.name),
      ),
      load.position,
      pose.heading,
    );
  }
  const person = root.children.find((n) => n.name === name);
  if (!person) throw Error('Unknown carrier model: ' + name);
  const angle = 2 * Math.atan2(person.rotation[1], person.rotation[3]);
  const children = [person];
  if (name === 'bowl-gold-bearer' || name === 'elder-recipient') {
    const gift = root.children.find(
      (n) => n.name === 'carrier-transferred-gold-coin',
    )!;
    const owner = carrierHandover(frame).owner;
    if (owner !== (name === 'bowl-gold-bearer' ? 'giver' : 'recipient'))
      gift.scale = [0.001, 0.001, 0.001];
    children.push(gift);
  }
  return normalized(name + '-walk-and-carry', children, person.position, angle);
}
