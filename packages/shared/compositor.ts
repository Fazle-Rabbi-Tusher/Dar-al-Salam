import { ACTIONS, type Action, type Facing, type Look } from './schema';
import { Pixels, blit, crop, hexAt, rgb, type PixelImage } from './pixels';
import { CHILD_SCALE, VEHICLES, canvasFor } from './canvas';
export type PartFrame = PixelImage & { layerBias: number };
export type Part = {
  id: string;
  frames: Record<string, PartFrame>;
  anchor: [number, number];
};
export type Palette = {
  keys: Record<string, string[]>;
  ramps: Record<string, string[]>;
  outline: string;
  shadow: string;
};
export type Aseprite = {
  frames: {
    filename: string;
    frame: { x: number; y: number; w: number; h: number };
    spriteSourceSize: { x: number; y: number; w: number; h: number };
    sourceSize: { w: number; h: number };
    duration: number;
    userData?: string;
  }[];
  meta: {
    image: string;
    frameTags: { name: string; from: number; to: number }[];
    slices: {
      name: string;
      keys: {
        bounds: { x: number; y: number; w: number; h: number };
        pivot?: { x: number; y: number };
      }[];
    }[];
  };
};
export function importAseprite(
  id: string,
  json: Aseprite,
  sheet: PixelImage,
  expected: [number, number] = canvasFor(id).anchor,
): Part {
  const frames: Part['frames'] = {};
  const foot = json.meta.slices.find((s) => s.name === 'foot')?.keys[0];
  if (!foot) throw Error(`${id}: missing foot slice`);
  const anchor: [number, number] = [
    foot.bounds.x + (foot.pivot?.x ?? 0),
    foot.bounds.y + (foot.pivot?.y ?? 0),
  ];
  for (const tag of json.meta.frameTags) {
    const [action, facing] = tag.name.split(/_(?=[^_]+$)/);
    if (!(action in ACTIONS) || !['se', 'ne', 'sw', 'nw'].includes(facing))
      throw Error(`${id}: invalid tag ${tag.name}`);
    if (tag.to - tag.from + 1 !== ACTIONS[action as Action])
      throw Error(`${id}: wrong frame count for ${tag.name}`);
    for (let i = tag.from; i <= tag.to; i++) {
      const f = json.frames[i],
        r = f.frame,
        s = f.spriteSourceSize;
      const canvas = new Pixels(f.sourceSize.w, f.sourceSize.h);
      blit(canvas, crop(sheet, r.x, r.y, r.w, r.h), s.x, s.y);
      if (anchor[0] !== expected[0] || anchor[1] !== expected[1])
        throw Error(`${id}: incorrect foot anchor`);
      frames[`${action}_${facing.toUpperCase()}_${i - tag.from}`] = {
        ...canvas,
        layerBias: Number(f.userData?.match(/layerBias=(-?\d+)/)?.[1] ?? 0),
      };
    }
  }
  return { id, frames, anchor };
}
export function resolveFrame(
  part: Part,
  action: Action,
  facing: Facing,
  index: number,
) {
  const exact = part.frames[`${action}_${facing}_${index}`];
  if (exact) return { frame: exact, mirror: false };
  const source = facing === 'SW' ? 'SE' : facing === 'NW' ? 'NE' : facing;
  const frame = part.frames[`${action}_${source}_${index}`];
  if (!frame) throw Error(`${part.id}: missing ${action}/${facing}/${index}`);
  return { frame, mirror: facing === 'SW' || facing === 'NW' };
}
export function compose(
  look: Look,
  action: Action,
  facing: Facing,
  index: number,
  parts: Record<string, Part>,
  palette: Palette,
  includeShadow = true,
) {
  const base = parts[look.base];
  if (!base) throw Error(`Unknown base ${look.base}`);
  const sample = resolveFrame(base, action, facing, index).frame;
  const dst = new Pixels(sample.width, sample.height);
  const order =
    facing === 'NE' || facing === 'NW'
      ? ['prop', 'base', 'garment', 'headwear']
      : ['base', 'garment', 'headwear', 'prop'];
  const layers = order
    .map((slot, i) => {
      const id = look[slot as 'base' | 'garment' | 'headwear' | 'prop'];
      if (id === 'none') return null;
      const part = parts[id];
      if (!part) throw Error(`Unknown part ${id}`);
      const f = resolveFrame(part, action, facing, index);
      return { ...f, slot, order: i + f.frame.layerBias };
    })
    .filter((v) => v !== null)
    .sort((a, b) => a.order - b.order);
  for (const layer of layers) blit(dst, layer.frame, 0, 0, layer.mirror);
  if (look.base === 'child') {
    // Children wear the same garment sheets, scaled around the foot anchor.
    const [ax, ay] = base.anchor,
      scaled = new Pixels(dst.width, dst.height);
    for (let y = 0; y < dst.height; y++)
      for (let x = 0; x < dst.width; x++) {
        const sx = Math.round((x - ax) / CHILD_SCALE + ax),
          sy = Math.round((y - ay) / CHILD_SCALE + ay);
        if (sx >= 0 && sy >= 0 && sx < dst.width && sy < dst.height) {
          const i = (sy * dst.width + sx) * 4;
          scaled.data.set(dst.data.slice(i, i + 4), (y * dst.width + x) * 4);
        }
      }
    dst.data.set(scaled.data);
  }
  const remap = new Map<string, string>();
  for (const [slot, keys] of Object.entries(palette.keys)) {
    const ramp = palette.ramps[look.colours[slot]];
    if (!ramp)
      throw Error(`Unknown colour ramp ${slot}: ${look.colours[slot]}`);
    keys.forEach((k, i) => remap.set(k, ramp[Math.min(i, ramp.length - 1)]));
  }
  for (let i = 0; i < dst.data.length; i += 4) {
    if (!dst.data[i + 3]) continue;
    const colour = remap.get(hexAt(dst, i));
    if (colour) dst.data.set(rgb(colour), i);
  }
  const outlined = new Pixels(dst.width, dst.height);
  for (let y = 0; y < dst.height; y++)
    for (let x = 0; x < dst.width; x++)
      if (dst.data[(y * dst.width + x) * 4 + 3])
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ])
          outlined.pixel(x + dx, y + dy, palette.outline);
  blit(outlined, dst);
  const result = new Pixels(dst.width, dst.height);
  const [ax, ay] = base.anchor;
  if (
    includeShadow &&
    look.base !== 'bird' &&
    look.base !== 'ball' &&
    !VEHICLES.includes(look.base)
  )
    result.ellipse(ax, ay - 1, look.base === 'cat' ? 7 : 8, 2.5, [
      ...rgb(palette.shadow).slice(0, 3),
      89,
    ]);
  blit(result, outlined);
  return result;
}
/** Sprite pixels per world pixel in sharp heads (see art/heads). */
export const HEAD_DENSITY = 2;
/**
 * A named character with a sharp head: the normal frame doubled, then the
 * head sheet (drawn at twice the density) over it. Returns the frame and the
 * number of head pixels that fell outside the normal silhouette.
 */
export function composeWithHead(
  look: Look,
  action: Action,
  facing: Facing,
  index: number,
  parts: Record<string, Part>,
  palette: Palette,
  head: Part,
  includeShadow = true,
) {
  const base = compose(
      look,
      action,
      facing,
      index,
      parts,
      palette,
      includeShadow,
    ),
    d = HEAD_DENSITY,
    out = new Pixels(base.width * d, base.height * d);
  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++) {
      const k = (Math.floor(y / d) * base.width + Math.floor(x / d)) * 4;
      out.data.set(base.data.subarray(k, k + 4), (y * out.width + x) * 4);
    }
  const f = resolveFrame(head, action, facing, index);
  let overhang = 0;
  for (let y = 0; y < f.frame.height; y++)
    for (let x = 0; x < f.frame.width; x++) {
      const sx = f.mirror ? f.frame.width - 1 - x : x;
      if (!f.frame.data[(y * f.frame.width + sx) * 4 + 3]) continue;
      if (!out.data[(y * out.width + x) * 4 + 3]) overhang++;
    }
  blit(out, f.frame, 0, 0, f.mirror);
  return { image: out, overhang };
}
export function trimFrame(img: PixelImage, anchor: [number, number]) {
  let x = img.width,
    y = img.height,
    r = 0,
    b = 0;
  for (let j = 0; j < img.height; j++)
    for (let i = 0; i < img.width; i++)
      if (img.data[(j * img.width + i) * 4 + 3]) {
        x = Math.min(x, i);
        y = Math.min(y, j);
        r = Math.max(r, i + 1);
        b = Math.max(b, j + 1);
      }
  if (!r) {
    x = 0;
    y = 0;
    r = 1;
    b = 1;
  }
  const image = crop(img, x, y, r - x, b - y);
  const mask = new Uint8Array(Math.ceil((image.width * image.height) / 8));
  for (let i = 0; i < image.width * image.height; i++)
    if (image.data[i * 4 + 3]) mask[i >> 3] |= 1 << (i % 8);
  return {
    image,
    anchor: [anchor[0] - x, anchor[1] - y] as [number, number],
    bounds: { x: x - anchor[0], y: y - anchor[1], width: r - x, height: b - y },
    mask,
  };
}
export function maskHit(
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
) {
  x = Math.floor(x);
  y = Math.floor(y);
  return (
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    Boolean(mask[(y * width + x) >> 3] & (1 << ((y * width + x) % 8)))
  );
}
export function browserComposite(
  look: Look,
  action: Action,
  facing: Facing,
  index: number,
  parts: Record<string, Part>,
  palette: Palette,
  ctx: CanvasRenderingContext2D,
) {
  const image = compose(look, action, facing, index, parts, palette);
  const pixels = ctx.createImageData(image.width, image.height);
  pixels.data.set(image.data);
  ctx.putImageData(pixels, 0, 0);
  return image;
}
