import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Pixels, blit, hexAt, rgb } from '../../../packages/shared/pixels';
import {
  ACTIONS,
  type Action,
  type Character,
} from '../../../packages/shared/schema';
import { canvasFor } from '../../../packages/shared/canvas';
import type { Aseprite } from '../../../packages/shared/compositor';
import { png, writeJson } from '../../build/io';
import {
  HAIR,
  HS,
  K,
  SKULL_NE,
  SKULL_SE,
  colourAt,
  drawPart,
  expression,
  headSprite,
  headXY,
  headwearSprite,
  pose,
  tmask,
  type Eyes,
  type Mouth,
  type Pose,
} from '../parts';

/*
 * Sharp heads for named characters. The body stays at world resolution; the
 * head is drawn at twice the density (2×2 sprite pixels per world pixel) so
 * faces can be recognised. Each head fills exactly the silhouette of the
 * character's normal head (base hair + headwear), so the body's outline,
 * collars and props line up; only the inside gains detail.
 *
 * Coordinates: painters work in "head space at 2×". (0, 0) is the top-left
 * of the bare skull box; the skull spans about x 0–21, y 0–21. Hair and
 * headwear reach above (negative y) and beards below. SE frames show the
 * face turned toward the viewer's right (nose tip near x 20, y 14); NE frames
 * show the back of the head.
 */
export const DENSITY = 2;
const W = HS.w * DENSITY,
  H = HS.h * DENSITY,
  OX = HS.ox * DENSITY,
  OY = HS.oy * DENSITY;
export const OUTLINE = '#493C35';

export type Region = 'skin' | 'hair' | 'beard' | 'hat' | 'none';
export type Face = {
  /** The pose of this frame (action, frame index, head turn, away). */
  q: Pose;
  away: boolean;
  action: Action;
  frame: number;
  eyes: Eyes;
  mouth: Mouth;
  brows?: 'raised';
  look: Character['look'];
  /** Ramps of the character's colour slots (light → dark). */
  ramp: (slot: keyof Character['look']['colours']) => string[];
  /** Inside the head silhouette. */
  has: (x: number, y: number) => boolean;
  /** Which part of the normal head this pixel came from. */
  region: (x: number, y: number) => Region;
  get: (x: number, y: number) => string | null;
  /** Paint inside the silhouette (outside it is ignored). */
  px: (x: number, y: number, c: string) => void;
  /** Paint a list of points. */
  pts: (points: [number, number][], c: string) => void;
  rect: (x: number, y: number, w: number, h: number, c: string) => void;
  /** Rows of a template: each character maps through `key` to a colour. */
  stamp: (
    x: number,
    y: number,
    rows: string[],
    key: Record<string, string>,
  ) => void;
  /** Bounds of a region (inclusive), or null when absent. */
  bounds: (
    r: Region,
  ) => { x0: number; y0: number; x1: number; y1: number } | null;
};
export type Painter = (f: Face) => void;
export type PortraitDef = {
  paint: Painter;
  /** Extra world-palette colours this portrait needs. */
  colours?: string[];
};

/* ───────────── generation ───────────── */
const SKIN = new Set(K.skin),
  HAIRK = new Set(K.hair),
  HAT = new Set(K.hat);
/** Scale2x (EPX): doubles pixel art while rounding diagonal steps. */
function scale2x(src: Pixels) {
  const out = new Pixels(src.width * 2, src.height * 2);
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= src.width || y >= src.height
      ? ''
      : src.data[(y * src.width + x) * 4 + 3]
        ? hexAt(src, (y * src.width + x) * 4)
        : '';
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const p = at(x, y);
      if (!p) continue;
      const a = at(x, y - 1),
        b = at(x + 1, y),
        c = at(x - 1, y),
        d = at(x, y + 1);
      let e0 = p,
        e1 = p,
        e2 = p,
        e3 = p;
      if (c === a && c !== d && a !== b && c) e0 = a;
      if (a === b && a !== c && b !== d && a) e1 = b;
      if (d === c && d !== b && c !== a && d) e2 = c;
      if (b === d && b !== a && d !== c && b) e3 = d;
      out.pixel(x * 2, y * 2, e0);
      out.pixel(x * 2 + 1, y * 2, e1);
      out.pixel(x * 2, y * 2 + 1, e2);
      out.pixel(x * 2 + 1, y * 2 + 1, e3);
    }
  return out;
}
type Built = {
  img: Pixels;
  sil: Uint8Array;
  region: Uint8Array;
};
const REGIONS: Region[] = ['none', 'skin', 'hair', 'beard', 'hat'];
/** The normal (1×) head of a look in this pose, its silhouette and regions. */
function normalHead(
  look: Character['look'],
  q: Pose,
  facing: 'SE' | 'NE',
  recolour: (c: string) => string,
): Built {
  const head = headSprite(look.base, q),
    scratch = new Pixels(canvasFor('person').width, canvasFor('person').height),
    hw =
      look.headwear === 'none'
        ? null
        : headwearSprite(scratch, look.headwear, q);
  const garment =
    look.garment === 'none'
      ? null
      : drawPart(look.garment, 'garments', q.action, facing, q.frame);
  const prop =
    look.prop === 'none' || q.action === 'pray' || facing === 'NE'
      ? null
      : drawPart(look.prop, 'props', q.action, facing, q.frame);
  const hair = HAIR[look.base] ?? HAIR['adult-man'],
    hairM = tmask(q.away ? hair.ne : hair.se),
    beardT = hair[q.away ? 'beardNE' : 'beard'],
    beardM = beardT ? tmask(beardT) : null,
    skull = tmask(q.away ? SKULL_NE : SKULL_SE);
  const one = new Pixels(HS.w, HS.h),
    sil1 = new Uint8Array(HS.w * HS.h),
    reg1 = new Uint8Array(HS.w * HS.h);
  const covered = (img: Pixels | null, x: number, y: number) => {
    if (!img) return false;
    const [cx, cy] = headXY(q, x - HS.ox, y - HS.oy);
    return colourAt(img, cx, cy) !== null;
  };
  for (let y = 0; y < HS.h; y++)
    for (let x = 0; x < HS.w; x++) {
      const hwc = hw ? colourAt(hw, x, y) : null,
        hc = colourAt(head, x, y);
      let c: string | null = null,
        r: Region = 'none';
      if (hwc) {
        c = hwc;
        // Faces framed by a scarf: skin and facial features inside the skull.
        r =
          SKIN.has(hwc) || (!HAT.has(hwc) && !HAIRK.has(hwc) && skull.has(x, y))
            ? 'skin'
            : 'hat';
      } else if (hc && !covered(garment, x, y)) {
        c = hc;
        r = beardM?.has(x, y)
          ? 'beard'
          : hairM.has(x, y) || HAIRK.has(hc)
            ? skull.has(x, y) && SKIN.has(hc)
              ? 'skin'
              : 'hair'
            : 'skin';
      }
      if (!c || covered(prop, x, y)) continue;
      // Hat colours inside a scarf opening are the face; keep them as hat.
      if (r === 'skin' && HAT.has(c)) r = 'hat';
      one.pixel(x, y, recolour(c));
      sil1[y * HS.w + x] = 1;
      reg1[y * HS.w + x] = REGIONS.indexOf(r);
    }
  const img = scale2x(one),
    sil = new Uint8Array(W * H),
    region = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = (y >> 1) * HS.w + (x >> 1);
      sil[y * W + x] = sil1[k];
      region[y * W + x] = reg1[k];
    }
  return { img, sil, region };
}
/** Head space (2×) → 2× canvas pixel, following the pose's head turn. */
function toCanvas(q: Pose, u: number, v: number): [number, number] {
  const bx = (u >> 1) - HS.ox,
    by = (v >> 1) - HS.oy,
    a = u & 1,
    b = v & 1;
  const [X, Y] = headXY(q, bx, by);
  const [sa, sb] =
    q.turn === 'up' ? [a, b] : q.turn === 'down' ? [1 - b, a] : [1 - b, 1 - a];
  return [X * DENSITY + sa, Y * DENSITY + sb];
}
export function renderHead(
  def: PortraitDef,
  look: Character['look'],
  action: Action,
  facing: 'SE' | 'NE',
  frame: number,
  ramps: Record<string, string[]>,
  keys: Record<string, string[]>,
) {
  const q = pose(action, facing, frame);
  const remap = new Map<string, string>();
  for (const [slot, ks] of Object.entries(keys)) {
    const r = ramps[look.colours[slot as keyof typeof look.colours]];
    if (r) ks.forEach((k, i) => remap.set(k, r[Math.min(i, r.length - 1)]));
  }
  const recolour = (c: string) => remap.get(c) ?? c;
  const built = normalHead(look, q, facing, recolour);
  const { img, sil, region } = built;
  const inside = (x: number, y: number) => {
    const u = x + OX,
      v = y + OY;
    return u >= 0 && v >= 0 && u < W && v < H && sil[v * W + u] === 1;
  };
  const ex = expression(action, frame);
  const face: Face = {
    q,
    away: q.away,
    action,
    frame,
    eyes: ex.eyes,
    mouth: ex.mouth,
    brows: ex.brows,
    look,
    ramp: (slot) => ramps[look.colours[slot]] ?? [],
    has: inside,
    region: (x, y) =>
      inside(x, y) ? REGIONS[region[(y + OY) * W + x + OX]] : 'none',
    get: (x, y) => (inside(x, y) ? colourAt(img, x + OX, y + OY) : null),
    px: (x, y, c) => {
      if (inside(Math.floor(x), Math.floor(y))) img.pixel(x + OX, y + OY, c);
    },
    pts: (points, c) => points.forEach(([x, y]) => face.px(x, y, c)),
    rect: (x, y, w, h, c) => {
      for (let j = y; j < y + h; j++)
        for (let i = x; i < x + w; i++) face.px(i, j, c);
    },
    stamp: (x, y, rows, key) =>
      rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          const c = key[row[i]];
          if (c) face.px(x + i, y + j, c);
        }
      }),
    bounds: (r) => {
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      const want = REGIONS.indexOf(r);
      for (let v = 0; v < H; v++)
        for (let u = 0; u < W; u++)
          if (sil[v * W + u] && region[v * W + u] === want) {
            x0 = Math.min(x0, u - OX);
            y0 = Math.min(y0, v - OY);
            x1 = Math.max(x1, u - OX);
            y1 = Math.max(y1, v - OY);
          }
      return x0 === Infinity ? null : { x0, y0, x1, y1 };
    },
  };
  def.paint(face);
  // Exactly fill the silhouette; Scale2x corner cuts become outline.
  const spec = canvasFor('person'),
    out = new Pixels(spec.width * DENSITY, spec.height * DENSITY);
  for (let v = 0; v < H; v++)
    for (let u = 0; u < W; u++) {
      if (!sil[v * W + u]) continue;
      const c = colourAt(img, u, v) ?? OUTLINE,
        [x, y] = toCanvas(q, u, v);
      out.pixel(x, y, c);
    }
  return out;
}

/** Write art/heads/<id>.png/.json for every named character with a portrait. */
export async function generatePortraits(
  cards: Character[],
  defs: Record<string, PortraitDef>,
  ramps: Record<string, string[]>,
  keys: Record<string, string[]>,
  overwrite: boolean,
) {
  const spec = canvasFor('person'),
    w = spec.width * DENSITY,
    h = spec.height * DENSITY,
    anchor = [spec.anchor[0] * DENSITY, spec.anchor[1] * DENSITY];
  let written = 0;
  for (const c of cards) {
    const def = defs[c.id];
    if (!def || c.kind !== 'person') continue;
    const path = `art/heads/${c.id}`;
    try {
      await fs.access(`${path}.json`);
      if (!overwrite) continue;
    } catch {
      /* Only seed absent heads; preserve artist replacements. */
    }
    // Every scripted action, plus idle for the story card.
    const actions = [
      ...new Set<Action>(['idle', ...c.script.map((s) => s.action)]),
    ];
    const facings: ('SE' | 'NE')[] =
      c.depiction === 'back' ? ['NE'] : ['SE', 'NE'];
    const frames: Aseprite['frames'] = [],
      tags: Aseprite['meta']['frameTags'] = [],
      cells: { img: Pixels; x: number; y: number; w: number; h: number }[] = [],
      seen = new Map<string, number>();
    let cursorX = 0,
      cursorY = 0,
      rowH = 0;
    const SHEET_W = 1024;
    for (const action of actions)
      for (const facing of facings) {
        const start = frames.length;
        for (let i = 0; i < ACTIONS[action]; i++) {
          const full = renderHead(def, c.look, action, facing, i, ramps, keys);
          // Trim to the opaque box.
          let x0 = w,
            y0 = h,
            x1 = -1,
            y1 = -1;
          for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++)
              if (full.data[(y * w + x) * 4 + 3]) {
                x0 = Math.min(x0, x);
                y0 = Math.min(y0, y);
                x1 = Math.max(x1, x);
                y1 = Math.max(y1, y);
              }
          if (x1 < 0) throw Error(`${c.id}: empty head ${action}/${facing}`);
          const tw = x1 - x0 + 1,
            th = y1 - y0 + 1,
            cell = new Pixels(tw, th);
          for (let y = 0; y < th; y++)
            cell.data.set(
              full.data.slice(
                ((y + y0) * w + x0) * 4,
                ((y + y0) * w + x0 + tw) * 4,
              ),
              y * tw * 4,
            );
          const key = createHash('sha1')
            .update(cell.data)
            .update(`${tw}`)
            .digest('hex');
          let index = seen.get(key);
          if (index === undefined) {
            if (cursorX + tw > SHEET_W) {
              cursorX = 0;
              cursorY += rowH;
              rowH = 0;
            }
            index = cells.length;
            cells.push({ img: cell, x: cursorX, y: cursorY, w: tw, h: th });
            seen.set(key, index);
            cursorX += tw;
            rowH = Math.max(rowH, th);
          }
          const at = cells[index];
          frames.push({
            filename: `${action}_${facing}_${i}`,
            frame: { x: at.x, y: at.y, w: tw, h: th },
            spriteSourceSize: { x: x0, y: y0, w: tw, h: th },
            sourceSize: { w, h },
            duration: 83,
          });
        }
        tags.push({
          name: `${action}_${facing.toLowerCase()}`,
          from: start,
          to: frames.length - 1,
        });
      }
    const sheet = new Pixels(
      Math.max(1, ...cells.map((k) => k.x + k.w)),
      cursorY + rowH,
    );
    for (const k of cells) blit(sheet, k.img, k.x, k.y);
    await png(`${path}.png`, sheet);
    await writeJson(`${path}.json`, {
      frames,
      meta: {
        image: `${c.id}.png`,
        size: { w: sheet.width, h: sheet.height },
        density: DENSITY,
        frameTags: tags,
        slices: [
          {
            name: 'foot',
            keys: [
              {
                frame: 0,
                bounds: { x: anchor[0], y: anchor[1], w: 1, h: 1 },
              },
            ],
          },
        ],
      },
    });
    written++;
  }
  return written;
}

/* ───────────── shared painting helpers ───────────── */
/** Mix toward another palette colour by picking whichever is nearer. */
export function nearest(c: string, choices: string[]) {
  const [r, g, b] = rgb(c);
  let best = choices[0],
    d = Infinity;
  for (const k of choices) {
    const [r2, g2, b2] = rgb(k),
      e = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (e < d) {
      d = e;
      best = k;
    }
  }
  return best;
}
