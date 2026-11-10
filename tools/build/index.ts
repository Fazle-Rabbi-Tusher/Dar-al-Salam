import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { MaxRectsPacker, Rectangle } from 'maxrects-packer';
import { loadContent, validateCharacter, validateLandmark } from './validate';
import {
  readJson,
  writeJson,
  loadParts,
  loadHeads,
  image,
  png,
  files,
} from './io';
import {
  HEAD_DENSITY,
  compose,
  composeWithHead,
  trimFrame,
} from '../../packages/shared/compositor';
import {
  Pixels,
  blit,
  crop,
  paletteErrors,
  type PixelImage,
} from '../../packages/shared/pixels';
import {
  ACTIONS,
  manifestSchema,
  type Manifest,
  type BakedCharacter,
  type FrameMeta,
  type Sortable,
  type Facing,
} from '../../packages/shared/schema';
import {
  frameKey,
  characterState,
  facingFromSegment,
} from '../../packages/shared/script';
import { worldFromTile, depth } from '../../packages/shared/iso';
import { stripTempo } from '../../packages/shared/motion';
import { generateSky } from './sky';
import { stripDepth, stripGround } from '../../packages/shared/slicing';
import {
  WILD,
  massawaTown,
  MASSAWA,
  wildPlantings,
  type Planting,
} from '../../packages/shared/planet';
import { MASSAWA_OBJECTS } from '../../packages/shared/massawa';
import { WORLD_OBJECTS } from '../../packages/shared/world-life';
import type { ObjectArt } from '../placeholder/objects';
const out = 'public-build';
/** Flat walkable art (carpets, rugs) is baked into chunk backgrounds. */
const bakedIntoFloor = (type: string, art: ObjectArt) =>
  Boolean(art.floor) || type === 'carpet' || type === 'detail-rug';
const hash = (d: Uint8Array | string) =>
  createHash('sha256').update(d).digest('hex');
async function build() {
  const prod = process.argv.includes('--prod');
  const content = await loadContent(),
    parts = await loadParts(),
    heads = await loadHeads();
  const { characters, room, keys, ramps, palette } = content;
  const warnings = characters.flatMap((c) =>
    validateCharacter(c, content.rules, room, parts, content.wardrobe, prod),
  );
  for (const l of content.landmarks) validateLandmark(l, content.rules, prod);
  const allowed = new Set(palette),
    sourceAllowed = new Set([...palette, ...Object.values(keys).flat()]);
  for (const p of await files('art', '.png')) {
    // Illustrated portraits and supplied full-body sprites are not limited
    // to the pixel-art palette.
    if (
      p.startsWith('art/illustrations/') ||
      p.startsWith('art/sprites/') ||
      p.startsWith('art/landmarks/') ||
      p.startsWith('art/supplied/') ||
      p.startsWith('art/gallery/')
    )
      continue;
    const errors = paletteErrors(
      await image(p),
      p.startsWith('art/parts') ? sourceAllowed : allowed,
    );
    if (errors.length)
      throw Error(
        `${p}: palette violation at ${errors.slice(0, 8).join('; ')}`,
      );
  }
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  const images = new Map<string, PixelImage>(),
    metas: Record<string, Omit<FrameMeta, 'frame'>> = {};
  function register(
    img: PixelImage,
    anchor: [number, number],
    density = 1,
    anyColour = false,
    still = false,
    tempo = 0,
  ) {
    const t = trimFrame(img, anchor),
      key =
        'f-' +
        hash(
          Buffer.concat([
            Buffer.from(t.image.data),
            Buffer.from(
              JSON.stringify([t.image.width, t.anchor, density, still, tempo]),
            ),
          ]),
        ).slice(0, 24);
    if (!images.has(key)) {
      const errors = anyColour ? [] : paletteErrors(t.image, allowed);
      if (errors.length)
        throw Error(`Baked frame: palette violation ${errors.slice(0, 4)}`);
      images.set(key, t.image);
      // Bounds stay in world px; anchor and hit mask are in sprite px.
      const b = t.bounds;
      metas[key] = {
        anchor: t.anchor,
        bounds: {
          x: b.x / density,
          y: b.y / density,
          width: b.width / density,
          height: b.height / density,
        },
        hitMask: Buffer.from(t.mask).toString('base64'),
        ...(density > 1 ? { density } : {}),
        ...(still ? { still } : {}),
        ...(tempo ? { tempo } : {}),
      };
    }
    return key;
  }
  /*
   * Supplied character art (art/sprites/<id>.png): a full-body isometric
   * sprite facing down-left (SW) on a transparent background, plus an
   * optional back view (art/sprites/<id>-back.png, facing up-left, NW). Each
   * is drawn at four sprite pixels per world pixel, scaled to adult height,
   * with the usual outline. The floor shadow is a separate sprite, so the
   * engine can animate the still (packages/shared/motion.ts) without
   * touching the design. Mirrors give the right-facing views.
   */
  const SPRITE_DENSITY = 4;
  /** Poses a standing still cannot show: the drawn character plays these. */
  const DRAWN_ACTIONS = new Set([
    'sujood',
    'pray',
    'sit',
    'read',
    'write',
    'teach',
    'lie',
    'dive',
    'slide',
    'ride',
  ]);
  async function spriteImage(file: string) {
    const D = SPRITE_DENSITY,
      spec = { width: 56 * D, height: 84 * D, foot: [28 * D, 80 * D] },
      { data, info } = await sharp(file)
        .trim()
        .resize({ height: 66 * D, kernel: 'lanczos3' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const body = new Pixels(info.width, info.height);
    body.data.set(data);
    const out = new Pixels(spec.width, spec.height),
      x0 = Math.round(spec.foot[0] - info.width / 2),
      y0 = spec.foot[1] - info.height;
    // A two-pixel outline around the figure, like the drawn characters.
    const solid = (x: number, y: number) =>
      x >= 0 &&
      y >= 0 &&
      x < info.width &&
      y < info.height &&
      body.data[(y * info.width + x) * 4 + 3] > 96;
    for (let y = -2; y < info.height + 2; y++)
      for (let x = -2; x < info.width + 2; x++)
        if (
          !solid(x, y) &&
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [2, 0],
            [-2, 0],
            [0, 2],
            [0, -2],
          ].some(([dx, dy]) => solid(x + dx, y + dy))
        )
          out.pixel(x0 + x, y0 + y, '#493C35');
    blit(out, body, x0, y0);
    return { image: out, anchor: spec.foot as [number, number] };
  }
  async function characterSprite(id: string) {
    const exists = async (f: string) =>
      fs.access(f).then(
        () => true,
        () => false,
      );
    if (!(await exists(`art/sprites/${id}.png`))) return null;
    const front = await spriteImage(`art/sprites/${id}.png`),
      back = (await exists(`art/sprites/${id}-back.png`))
        ? await spriteImage(`art/sprites/${id}-back.png`)
        : null;
    // Without a back view the camera always sees the front, turned the way
    // the character is heading (left or right).
    // Right-facing views are the same images flipped by the engine.
    const views: Record<
      Facing,
      { image: PixelImage; anchor: [number, number]; flip: boolean }
    > = {
      SW: { ...front, flip: false },
      SE: { ...front, flip: true },
      NW: { ...(back ?? front), flip: false },
      NE: { ...(back ?? front), flip: true },
    };
    return views;
  }
  /*
   * Supplied animation strips: art/sprites/anim/<id>__<action>[@prop]_<SE|NE>.png,
   * frames of 224×336 at four sprite pixels per world pixel, feet at 112,320
   * (prepared from the owner's strips: background removed, feet pinned).
   * A sidecar <same name>.json may give another frame size, foot point and
   * density (Massawa's camels). SW and NW are mirrors of SE and NE.
   */
  async function stripFrames(id: string, key: string, facing: Facing) {
    const view = facing === 'SE' || facing === 'SW' ? 'SE' : 'NE',
      base = `art/sprites/anim/${id}__${key}_${view}`,
      file = `${base}.png`;
    try {
      await fs.access(file);
    } catch {
      return null;
    }
    const meta: {
      frame: [number, number];
      foot: [number, number];
      density: number;
      /**
       * Play order over the strip's unique poses (the prayer congregation):
       * the strip holds each pose once, and this lists one per step.
       */
      sequence?: number[];
    } = await readJson(`${base}.json`).catch(() => ({
      frame: [224, 336],
      foot: [112, 320],
      density: SPRITE_DENSITY,
    }));
    const strip = await image(file),
      FW = meta.frame[0],
      out: { image: PixelImage; anchor: [number, number] }[] = [];
    for (let x = 0; x + FW <= strip.width; x += FW)
      out.push({
        image: outlined(crop(strip, x, 0, FW, strip.height)),
        anchor: meta.foot,
      });
    // Left-facing views reuse these frames, flipped by the engine.
    return {
      frames: meta.sequence ? meta.sequence.map((i) => out[i]) : out,
      flip: facing === 'SW' || facing === 'NW',
      density: meta.density,
    };
  }
  /*
   * Eight-view animals: art/sprites/dir8/<base>.png holds one turnaround
   * (views S, SE, E, NE, N, NW, W, SW) with a sidecar JSON (frame size, foot
   * point, density). Coats vary by the look's garmentPrimary colour.
   */
  const COATS: Record<string, { brightness: number; saturation: number }> = {
    cocoa: { brightness: 0.72, saturation: 0.85 },
    'wool-cream': { brightness: 1.15, saturation: 0.6 },
    'hair-brown': { brightness: 0.85, saturation: 1 },
  };
  type Dir8Meta = {
    frame: [number, number];
    foot: [number, number];
    density: number;
    /** Floor shadow size in world px, or false (ships sit on the water). */
    shadow?: [number, number] | false;
    /** Other strips for particular actions (the tram's open doors). */
    actions?: Record<string, string>;
    /** Walking steps for this figure: the moving share of its height. */
    steps?: number;
  };
  /** Walking actions get generated steps (legs and hems move). */
  const STEPPING = new Set(['animal_walk', 'walk']);
  /*
   * A step of a walk, made from a still view without redrawing it: the
   * legs (or a robe's hem) below the body swing about the hips. Seen from
   * the side or three-quarter, the front and back legs scissor; seen from
   * the front or back, one side's foot lifts, then the other's.
   */
  function stepped(
    img: PixelImage,
    view: number,
    phase: number,
    legs: number,
  ): PixelImage {
    let top = img.height,
      bottom = 0,
      left = img.width,
      right = 0;
    for (let y = 0; y < img.height; y++)
      for (let x = 0; x < img.width; x++)
        if (img.data[(y * img.width + x) * 4 + 3] > 40) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
    const out = new Pixels(img.width, img.height);
    out.data.set(img.data);
    const hip = Math.round(bottom - (bottom - top) * legs),
      mid = (left + right) / 2,
      s = Math.sin(phase * Math.PI * 2),
      endOn = view === 0 || view === 4,
      swing = Math.max(2, (right - left) * (endOn ? 0.035 : 0.07)),
      lift = Math.max(2, (bottom - top) * 0.025);
    for (let y = hip; y <= bottom; y++)
      for (let x = 0; x < img.width; x++)
        out.data[(y * img.width + x) * 4 + 3] = 0;
    // Back group first, so the front legs are drawn over them.
    for (const front of [false, true])
      for (let y = hip; y <= bottom; y++) {
        const t = (y - hip) / Math.max(1, bottom - hip);
        for (let x = left; x <= right; x++) {
          const i = (y * img.width + x) * 4;
          if (img.data[i + 3] <= 40) continue;
          if (x >= mid !== front) continue;
          const sign = front ? 1 : -1;
          let tx = x,
            ty = y;
          if (endOn) ty = y - Math.round(lift * t * Math.max(0, sign * s));
          else tx = x + Math.round(swing * t * s * sign);
          if (tx < 0 || tx >= img.width || ty < 0) continue;
          out.data.set(img.data.subarray(i, i + 4), (ty * img.width + tx) * 4);
        }
      }
    return out;
  }
  const dir8Cache = new Map<string, Record<string, string[][]> | null>();
  const dir8Meta = new Map<string, Dir8Meta | null>();
  async function dir8MetaFor(base: string) {
    if (!dir8Meta.has(base))
      dir8Meta.set(
        base,
        await readJson(`art/sprites/dir8/${base}.json`).catch(() => null),
      );
    return dir8Meta.get(base)!;
  }
  /**
   * The eight views of a figure for each action it uses ('*' covers the
   * rest): stills for standing, generated steps for walking, the strip an
   * action names (the tram's open doors). Views run S, SE, E, NE, N, NW, W, SW.
   */
  async function dir8Views(base: string, coat: string, actions: string[]) {
    const key = `${base}/${coat}/${[...new Set(actions)].sort()}`;
    if (dir8Cache.has(key)) return dir8Cache.get(key)!;
    const meta = await dir8MetaFor(base);
    let sets: Record<string, string[][]> | null = null;
    if (meta) {
      sets = {};
      const tint = base === 'camel' ? COATS[coat] : undefined;
      const stripOf = async (file: string) => {
        let img = sharp(`art/sprites/dir8/${file}.png`);
        if (tint) img = img.modulate(tint);
        const { data, info } = await img
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const strip: PixelImage = {
          width: info.width,
          height: info.height,
          data: new Uint8Array(data),
        };
        return [...Array(8).keys()].map((v) =>
          crop(strip, v * meta.frame[0], 0, meta.frame[0], strip.height),
        );
      };
      const views = await stripOf(base);
      const reg = (img: PixelImage) =>
        register(outlined(img), meta.foot, meta.density, true, true);
      sets['*'] = views.map((v) => [reg(v)]);
      for (const action of new Set(actions)) {
        if (meta.actions?.[action]) {
          const other = await stripOf(meta.actions[action]);
          sets[action] = other.map((v) => [reg(v)]);
        } else if (
          STEPPING.has(action) &&
          (base === 'camel' || base === 'guide' || meta.steps)
        )
          // Camels' legs are long (the lower 45%); a robe moves at the hem.
          sets[action] = views.map((v, i) =>
            [0, 1, 2, 3].map((f) =>
              reg(
                stepped(
                  v,
                  i,
                  f / 4,
                  meta.steps ?? (base === 'camel' ? 0.45 : 0.16),
                ),
              ),
            ),
          );
      }
    }
    dir8Cache.set(key, sets);
    return sets;
  }
  /** The same two-pixel outline as the sprites and drawn characters. */
  function outlined(img: PixelImage) {
    const out = new Pixels(img.width, img.height),
      solid = (x: number, y: number) =>
        x >= 0 &&
        y >= 0 &&
        x < img.width &&
        y < img.height &&
        img.data[(y * img.width + x) * 4 + 3] > 96;
    for (let y = 0; y < img.height; y++)
      for (let x = 0; x < img.width; x++)
        if (
          !solid(x, y) &&
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [2, 0],
            [-2, 0],
            [0, 2],
            [0, -2],
          ].some(([dx, dy]) => solid(x + dx, y + dy))
        )
          out.pixel(x, y, '#493C35');
    blit(out, img);
    return out;
  }
  // Scenes (content/scenes): which figures and props light up together.
  const sceneOfMember = new Map<string, string>();
  for (const sc of content.scenes)
    for (const m of sc.members) sceneOfMember.set(m, sc.id);
  const sceneOfProp = (type: string, [x, y]: [number, number]) =>
    content.scenes.find(
      (sc) =>
        sc.props.includes(type) &&
        x >= sc.area[0][0] &&
        x <= sc.area[1][0] &&
        y >= sc.area[0][1] &&
        y <= sc.area[1][1],
    )?.id;
  const baked: BakedCharacter[] = [];
  let bakedCount = 0;
  for (const c of characters) {
    const lifted =
      c.kind === 'bird' ||
      c.script.some((s) =>
        Array.isArray(s.z) ? s.z.some((z) => z !== 0) : Boolean(s.z),
      );
    const sprite = await characterSprite(c.id),
      d8 = await dir8Views(
        c.look.base,
        c.look.colours.garmentPrimary,
        c.script.map((s) => s.action),
      ),
      d8meta = d8 ? await dir8MetaFor(c.look.base) : null;
    // Sprite characters (and anyone lifted off the floor) get a separate
    // floor shadow; their drawn frames are baked without one.
    const unshadowed = lifted || Boolean(sprite);
    let shadowFrame: string | undefined;
    if (d8) {
      // Each eight-view figure's own floor shadow (none for ships at sea).
      const size = d8meta?.shadow ?? [36, 10];
      if (size) {
        const [w, h] = size.map((v) => Math.max(4, Math.round(v)));
        const shadow = new Pixels(w + 2, h + 2);
        shadow.ellipse(w / 2 + 1, h / 2 + 1, w / 2, h / 2, [73, 60, 53, 89]);
        shadowFrame = register(shadow, [w / 2 + 1, h / 2 + 1]);
      }
    } else if (sprite) {
      const shadow = new Pixels(20, 8);
      shadow.ellipse(10, 4, 8, 2.5, [73, 60, 53, 89]);
      shadowFrame = register(shadow, [10, 4]);
    } else if (lifted) {
      const shadow = new Pixels(16, 8);
      shadow.ellipse(8, 4, 6, 2, [73, 60, 53, 89]);
      shadowFrame = register(shadow, [8, 4]);
    }
    const frames: Record<string, string[]> = {},
      mirror: string[] = [];
    for (const s of c.script) {
      // On the planet the camera decides which side of a character is seen,
      // so every facing is baked (back-only characters get NE/NW only).
      const facings: Facing[] =
        c.depiction === 'back' ? ['NE', 'NW'] : ['SE', 'SW', 'NE', 'NW'];
      void facingFromSegment;
      for (const facing of facings) {
        const key = frameKey(s.action, s.prop, facing),
          look = s.prop ? { ...c.look, prop: s.prop } : c.look;
        if (frames[key]) continue;
        frames[key] = [];
        if (d8) {
          // The engine picks among the eight views; these are fallbacks.
          const v = (d8[s.action] ?? d8['*'])[
            { SE: 1, NE: 3, NW: 5, SW: 7 }[facing]
          ][0];
          for (let f = 0; f < ACTIONS[s.action]; f++) frames[key].push(v);
          bakedCount += ACTIONS[s.action];
          continue;
        }
        const strip = await stripFrames(
          c.id,
          `${s.action}${s.prop ? '@' + s.prop : ''}`,
          facing,
        );
        if (strip) {
          // Every supplied pose plays, at the action's tempo (an eight-pose
          // reading strip is not cut down to the four-pose default).
          const n = strip.frames.length,
            tempo = stripTempo(s.action);
          if (strip.flip) mirror.push(key);
          for (let f = 0; f < n; f++) {
            const fr = strip.frames[f];
            frames[key].push(
              register(fr.image, fr.anchor, strip.density, true, false, tempo),
            );
          }
          bakedCount += n;
          continue;
        }
        if (sprite && !s.prop && !DRAWN_ACTIONS.has(s.action)) {
          if (sprite[facing].flip) mirror.push(key);
          const v = sprite[facing],
            name = register(v.image, v.anchor, SPRITE_DENSITY, true, true);
          for (let f = 0; f < ACTIONS[s.action]; f++) frames[key].push(name);
          bakedCount += ACTIONS[s.action];
          continue;
        }
        for (let f = 0; f < ACTIONS[s.action]; f++) {
          const pal = {
            keys,
            ramps,
            outline: '#493C35',
            shadow: '#493C35',
          };
          const head = heads[c.id],
            anchor = parts[look.base].anchor;
          if (head) {
            const { image: img, overhang } = composeWithHead(
              look,
              s.action,
              facing,
              f,
              parts,
              pal,
              head,
              !unshadowed,
            );
            if (overhang)
              throw Error(
                `${c.id}: sharp head ${s.action}/${facing}/${f} reaches ${overhang} px outside the body; regenerate art/heads after changing a look`,
              );
            frames[key].push(
              register(
                img,
                [anchor[0] * HEAD_DENSITY, anchor[1] * HEAD_DENSITY],
                HEAD_DENSITY,
              ),
            );
          } else
            frames[key].push(
              register(
                compose(look, s.action, facing, f, parts, pal, !unshadowed),
                anchor,
              ),
            );
          bakedCount++;
        }
      }
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (let f = 0; f < c.loop; f++) {
      const state = characterState(c, f),
        fk = frameKey(
          state.action,
          c.script[state.stepIndex].prop,
          state.facing,
        ),
        mb = metas[frames[fk][state.index]].bounds,
        b = mirror.includes(fk) ? { ...mb, x: -(mb.x + mb.width) } : mb;
      if (shadowFrame) {
        const p = worldFromTile(...state.tile),
          sb = metas[shadowFrame].bounds;
        minX = Math.min(minX, p[0] + sb.x);
        minY = Math.min(minY, p[1] + sb.y);
        maxX = Math.max(maxX, p[0] + sb.x + sb.width);
        maxY = Math.max(maxY, p[1] + sb.y + sb.height);
      }
      minX = Math.min(minX, state.position[0] + b.x);
      minY = Math.min(minY, state.position[1] + b.y);
      maxX = Math.max(maxX, state.position[0] + b.x + b.width);
      maxY = Math.max(maxY, state.position[1] + b.y + b.height);
    }
    let portrait: string | undefined;
    if (heads[c.id]) {
      // Story-card close-up: head and shoulders from the idle pose.
      const { image: full } = composeWithHead(
        c.look,
        'idle',
        'SE',
        0,
        parts,
        { keys, ramps, outline: '#493C35', shadow: '#493C35' },
        heads[c.id],
        false,
      );
      let top = full.height;
      for (let i = 0; i < full.data.length; i += 4)
        if (full.data[i + 3]) {
          top = Math.floor(i / 4 / full.width);
          break;
        }
      const ax = parts[c.look.base].anchor[0] * HEAD_DENSITY,
        bust = new Pixels(52, 60);
      blit(bust, crop(full, ax - 26, Math.max(0, top - 4), 52, 60));
      portrait = `portraits/${c.id}.png`;
      await png(`${out}/${portrait}`, bust);
    }
    let illustration: string | undefined;
    for (const ext of ['png', 'svg']) {
      try {
        await fs.access(`art/illustrations/${c.id}.${ext}`);
      } catch {
        continue;
      }
      illustration = `illustrations/${c.id}.${ext}`;
      await fs.mkdir(`${out}/illustrations`, { recursive: true });
      await fs.copyFile(`art/${illustration}`, `${out}/${illustration}`);
      break;
    }
    if (!illustration && sprite) {
      // (Uses the supplied front view.)
      // Head-and-shoulders card portrait cropped from the supplied sprite.
      const src = `art/sprites/${c.id}.png`,
        meta = await sharp(src).trim().toBuffer({ resolveWithObject: true });
      const w = meta.info.width,
        h = Math.round(Math.min(meta.info.height, w * 1.1));
      illustration = `illustrations/${c.id}.png`;
      await fs.mkdir(`${out}/illustrations`, { recursive: true });
      await sharp(meta.data)
        .extract({ left: 0, top: 0, width: w, height: h })
        .resize({ width: 280 })
        .png({ palette: true, quality: 90 })
        .toFile(`${out}/${illustration}`);
    }
    // Owner-supplied pictures of the person at work (art/gallery/<id>/).
    const gallery = (
      await fs.readdir(`art/gallery/${c.id}`).catch(() => [] as string[])
    )
      .filter((f) => f.endsWith('.png'))
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((f) => `gallery/${c.id}/${f}`);
    if (gallery.length) {
      await fs.mkdir(`${out}/gallery/${c.id}`, { recursive: true });
      for (const g of gallery) await fs.copyFile(`art/${g}`, `${out}/${g}`);
    }
    baked.push({
      ...c,
      ...(gallery.length ? { gallery } : {}),
      frames,
      ...(mirror.length ? { mirror } : {}),
      ...(d8 ? { dir8: d8 } : {}),
      shadowFrame,
      ...(illustration ? { illustration } : {}),
      ...(portrait ? { portrait } : {}),
      interactive: Boolean(c.name),
      ...(sceneOfMember.has(c.id) ? { scene: sceneOfMember.get(c.id) } : {}),
      needsPanelReview: c.script.some(
        (s) => s.action === 'pray' || s.action === 'sujood',
      ),
      loopBounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    });
  }
  const objectArt: Record<string, ObjectArt> = await readJson(
    'art/objects/index.json',
  );
  // Pieces cut from the owner's packs (art/supplied): detailed art drawn at
  // its own density, optionally animated, optionally replacing an object.
  const suppliedArt: Record<
    string,
    {
      file: string;
      anchor: [number, number];
      density: number;
      frames?: string[];
      period?: number;
      replaces?: string;
    }
  > = await readJson('art/supplied/index.json');
  const replacing = new Map(
    Object.entries(suppliedArt)
      .filter(([, a]) => a.replaces)
      .map(([id, a]) => [a.replaces!, id]),
  );
  const replaced: [string, number, number][] = [];
  const sortables: Sortable[] = [];
  const objectLayer = room.layers.find((l) => l.type === 'objectgroup');
  if (objectLayer?.type === 'objectgroup')
    for (const o of objectLayer.objects) {
      // Supplied art placed in the room (art/supplied): planted like
      // Massawa's pieces, standing on the footprint's centre.
      if (!objectArt[o.type] && suppliedArt[o.type]) {
        replaced.push([
          o.type,
          o.x + o.footprint[0] / 2,
          o.y + o.footprint[1] / 2,
        ]);
        continue;
      }
      const art = objectArt[o.type];
      if (!art) throw Error(`Unknown room object ${o.type}`);
      if (o.walkable && bakedIntoFloor(o.type, art)) continue;
      // Supplied art that replaces this object (art/supplied `replaces`)
      // stands on the footprint's centre instead (planted below).
      if (replacing.has(o.type)) {
        replaced.push([
          replacing.get(o.type)!,
          o.x + o.footprint[0] / 2,
          o.y + o.footprint[1] / 2,
        ]);
        continue;
      }
      const frames = await Promise.all(
        (art.frames ?? [art.file]).map((f) => image(`art/${f}`)),
      );
      const [wx, wy] = worldFromTile(o.x, o.y, o.z);
      const multi = o.footprint[0] > 1 || o.footprint[1] > 1;
      for (let x = 0; x < art.width; x += multi ? 16 : art.width) {
        const width = Math.min(multi ? 16 : art.width, art.width - x);
        const slices = frames.map((f) => crop(f, x, 0, width, f.height));
        if (!slices[0].data.some((v, i) => i % 4 === 3 && v > 0)) continue;
        const names = slices.map((s) =>
          register(s, [art.anchor[0] - x, art.anchor[1]]),
        );
        const column = x + width / 2 - art.anchor[0],
          ground = stripGround([o.x, o.y], o.footprint, column),
          base = worldFromTile(o.x, o.y),
          at = worldFromTile(...ground),
          m = metas[names[0]];
        sortables.push({
          frame: names[0],
          x: wx,
          y: wy,
          depth: stripDepth([o.x, o.y], o.footprint, column),
          objectId: o.id,
          tile: [o.x, o.y],
          footprint: o.footprint,
          ground,
          ...(sceneOfProp(o.type, [o.x, o.y])
            ? { scene: sceneOfProp(o.type, [o.x, o.y]) }
            : {}),
          // Frame pixel resting on the ground point, so strips follow the curve.
          pivot: [m.anchor[0] + at[0] - base[0], m.anchor[1] + at[1] - base[1]],
          lift: o.z,
          ...(names.length > 1 ? { animation: names } : {}),
          ...(names.length > 1 && art.period ? { period: art.period } : {}),
        });
      }
    }
  // The rest of the planet: forests, meadows, beaches, rocky hills with
  // waterfalls and ships at sea (packages/shared/planet.ts, wildPlantings).
  if (room.width !== WILD.map[0] || room.height !== WILD.map[1])
    throw Error(
      `WILD.map (${WILD.map}) must match the room (${room.width}×${room.height})`,
    );
  // Art per planting kind, in order of preference; ids missing from the
  // object index fall back to the next, so the build never fails.
  const wildArt: Record<Planting['kind'], string[][]> = {
    // Painted, volumetric trees from the owner's pack (land-*) mixed with
    // the drawn ones, so woods vary in age and kind.
    'forest-tree': [
      [
        'land-pine',
        'm-oak',
        'land-oak',
        'm-pine',
        'land-forest-stand',
        'land-pine-young',
        'm-birch',
        'land-oak-young',
        'land-pine',
        'land-snag',
      ],
      ['cypress', 'm-tree', 'cypress', 'detail-olive', 'm-tree', 'm-tree'],
    ],
    'meadow-tree': [
      [
        'land-oak-young',
        'm-cherry',
        'land-cherry-young',
        'm-oak',
        'land-cherry',
      ],
      ['m-tree', 'detail-olive', 'm-tree', 'cypress'],
    ],
    bush: [['m-bush'], []],
    palm: [['m-palm'], ['palm']],
    'beach-rock': [['m-beach-rocks', 'm-rock'], ['palm']],
    boulder: [['m-rock'], ['cypress']],
    // A cliff with the falls and the pool at its foot (owner's pack).
    waterfall: [['land-waterfall'], ['m-waterfall']],
    ship: [['m-ship'], []],
    // Massawa's dry coast: never a lush tree in the desert.
    acacia: [['msw-acacia'], []],
    'doum-palm': [['sup-datepalm', 'sup-datepalms'], ['m-palm']],
    // Pieces cut from the owner's desert sheet (art/supplied).
    dune: [['sup-dunes-0', 'sup-dunes-1', 'sup-dunes-2', 'sup-dunes-3'], []],
    'desert-rock': [
      ['sup-rocks2', 'sup-mesa-0', 'sup-rocks2', 'sup-mesa-2', 'sup-rocks2'],
      [],
    ],
    'desert-shrub': [
      [
        'sup-shrub-a',
        'sup-shrub-b',
        'sup-shrub-c',
        'sup-tuft-a',
        'sup-tuft-b',
        'sup-shrub-b',
        'sup-tuft-a',
        'sup-deadtree2',
      ],
      [],
    ],
  };
  const wildFrames = new Map<
    string,
    { names: string[]; period?: number } | null
  >();
  const wildFrame = async (type: string) => {
    if (wildFrames.has(type)) return wildFrames.get(type)!;
    const art = objectArt[type],
      sup = suppliedArt[type];
    let entry: { names: string[]; period?: number } | null = null;
    if (sup && sup.frames) {
      // Animated supplied art (the waterfall's falling water).
      const names: string[] = [];
      for (const f of sup.frames)
        names.push(
          register(await image(`art/${f}`), sup.anchor, sup.density, true),
        );
      entry = { names, period: sup.period ?? 24 };
    } else if (sup) {
      const img = await image(`art/${sup.file}`);
      // Palms sway in the wind: the crown leans, the base stays put.
      const sway = /datepalm/.test(type) ? 6 : 1;
      const names: string[] = [];
      for (let f = 0; f < sway; f++)
        names.push(
          register(
            sway > 1 ? swayed(img, sup.anchor[1], f / sway, sup.density) : img,
            sup.anchor,
            sup.density,
            true,
          ),
        );
      entry = { names, ...(sway > 1 ? { period: 48 } : {}) };
    } else if (art && !bakedIntoFloor(type, art)) {
      const files = art.frames ?? [art.file],
        names: string[] = [];
      for (const f of files)
        names.push(
          register(await image(`art/${f}`), art.anchor as [number, number]),
        );
      entry = { names, ...(art.period ? { period: art.period } : {}) };
    }
    wildFrames.set(type, entry);
    return entry;
  };
  /** A frame of a gentle sway: rows shift more the higher they are. */
  function swayed(
    img: PixelImage,
    groundRow: number,
    t: number,
    density: number,
  ): PixelImage {
    const out = new Pixels(img.width, img.height),
      reach = 2.2 * density,
      s = Math.sin(t * Math.PI * 2);
    for (let y = 0; y < img.height; y++) {
      const h = Math.max(0, (groundRow - y) / groundRow),
        dx = Math.round(s * reach * h * h);
      for (let x = 0; x < img.width; x++) {
        const sx = x - dx;
        if (sx < 0 || sx >= img.width) continue;
        const i = (y * img.width + sx) * 4,
          o = (y * img.width + x) * 4;
        out.data.set(img.data.subarray(i, i + 4), o);
      }
    }
    return out;
  }
  const wildCounts: Record<string, number> = {};
  for (const [i, w] of wildPlantings().entries()) {
    // Massawa's town is laid out by hand (packages/shared/massawa.ts), and
    // nothing wild lands on a hand-placed piece round it.
    if (massawaTown(w.tile) < MASSAWA.town.radius + 1) continue;
    if (
      MASSAWA_OBJECTS.some(
        ([, x, y]) => Math.hypot(w.tile[0] - x, w.tile[1] - y) < 3,
      )
    )
      continue;
    let chosen: { names: string[]; period?: number } | null = null;
    for (const options of wildArt[w.kind]) {
      if (!options.length) continue;
      chosen = await wildFrame(
        options[Math.floor(w.pick * options.length) % options.length],
      );
      if (!chosen)
        for (const o of options) if ((chosen = await wildFrame(o))) break;
      if (chosen) break;
    }
    if (!chosen) continue;
    wildCounts[w.kind] = (wildCounts[w.kind] ?? 0) + 1;
    const frame = chosen.names[0],
      m = metas[frame],
      [wx, wy] = worldFromTile(...w.tile);
    sortables.push({
      frame,
      x: wx,
      y: wy,
      depth: depth(...w.tile),
      objectId: -1 - i,
      tile: w.tile,
      footprint: [1, 1],
      ground: w.tile,
      pivot: [m.anchor[0], m.anchor[1]],
      lift: 0,
      ...(chosen.names.length > 1 ? { animation: chosen.names } : {}),
      ...(chosen.names.length > 1 && chosen.period
        ? { period: chosen.period }
        : {}),
    });
  }
  if (process.env.DAR_WILD_LOG)
    console.log('Wild plantings:', JSON.stringify(wildCounts));
  // Massawa's town, boats and palms, outside the mapped quarter: sorted like
  // wild plantings (one ground point each, no collision, not in the floor).
  for (const [i, [type, x, y]] of [
    ...MASSAWA_OBJECTS,
    ...WORLD_OBJECTS,
    ...replaced,
  ].entries()) {
    const chosen = await wildFrame(type);
    if (!chosen) throw Error(`Massawa: unknown object ${type}`);
    const frame = chosen.names[0],
      tile: [number, number] = [x, y],
      [wx, wy] = worldFromTile(x, y);
    const scene = sceneOfProp(type, tile);
    sortables.push({
      frame,
      x: wx,
      y: wy,
      depth: depth(x, y),
      objectId: -500000 - i,
      tile,
      footprint: [1, 1],
      ground: tile,
      pivot: [...metas[frame].anchor],
      lift: 0,
      ...(scene ? { scene } : {}),
      ...(chosen.names.length > 1 ? { animation: chosen.names } : {}),
      ...(chosen.names.length > 1 && chosen.period
        ? { period: chosen.period }
        : {}),
    });
  }
  // Landmarks: supplied, detailed building art (art/landmarks) with a card.
  const landmarkArt: Record<
    string,
    { file: string; anchor: [number, number]; density: number }
  > = await readJson('art/landmarks/index.json');
  const landmarks: Manifest['landmarks'] = [];
  for (const [i, l] of content.landmarks.entries()) {
    const art = landmarkArt[l.art];
    if (!art) throw Error(`${l.id}: unknown landmark art ${l.art}`);
    const frame = register(
        await image(`art/${art.file}`),
        art.anchor,
        art.density,
        true,
      ),
      [wx, wy] = worldFromTile(...l.tile);
    sortables.push({
      frame,
      x: wx,
      y: wy,
      depth: depth(...l.tile),
      objectId: -900000 - i,
      tile: l.tile,
      footprint: [1, 1],
      ground: l.tile,
      pivot: [...metas[frame].anchor],
      lift: 0,
      landmark: l.id,
    });
    const illustration = `illustrations/landmark-${l.id}.png`;
    await fs.mkdir(`${out}/illustrations`, { recursive: true });
    await sharp(`art/${art.file}`)
      .resize({ width: 280 })
      .png({ palette: true, quality: 90 })
      .toFile(`${out}/${illustration}`);
    landmarks.push({ ...l, illustration });
  }
  // Pixel art packs into sharp (nearest-filtered) atlases; the detailed,
  // high-density frames (sharp heads, supplied sprites) into smooth ones that
  // the engine filters linearly with mipmaps, so they never look crunchy.
  const newPacker = () =>
    new MaxRectsPacker<Rectangle>(2048, 2048, 2, {
      smart: true,
      pot: true,
      square: false,
      allowRotation: false,
      border: 2,
    });
  const packer = newPacker(),
    smoothPacker = newPacker();
  for (const [id, im] of images)
    ((metas[id].density ?? 1) > 1 ? smoothPacker : packer).add(
      im.width + 2,
      im.height + 2,
      { id },
    );
  const atlasUrls: string[] = [];
  const bins = [
    ...packer.bins.map((bin) => ({ bin, smooth: false })),
    ...smoothPacker.bins.map((bin) => ({ bin, smooth: true })),
  ];
  for (const [i, { bin, smooth }] of bins.entries()) {
    const atlas = new Pixels(bin.width, bin.height),
      frames: Record<
        string,
        FrameMeta & {
          rotated: false;
          trimmed: false;
          spriteSourceSize: { x: number; y: number; w: number; h: number };
          sourceSize: { w: number; h: number };
        }
      > = {};
    for (const r of bin.rects) {
      const id = r.data.id,
        im = images.get(id)!;
      for (let y = -1; y <= im.height; y++)
        for (let x = -1; x <= im.width; x++) {
          const sx = Math.max(0, Math.min(im.width - 1, x)),
            sy = Math.max(0, Math.min(im.height - 1, y));
          atlas.pixel(
            r.x + 1 + x,
            r.y + 1 + y,
            Array.from(
              im.data.slice(
                (sy * im.width + sx) * 4,
                (sy * im.width + sx) * 4 + 4,
              ),
            ),
          );
        }
      frames[id] = {
        ...metas[id],
        frame: { x: r.x + 1, y: r.y + 1, w: im.width, h: im.height },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: im.width, h: im.height },
        sourceSize: { w: im.width, h: im.height },
      };
    }
    // Smooth (high-density) art compresses far better as WebP; pixel art
    // stays lossless PNG so its palette is exact.
    const file = `atlas-${i}.${smooth ? 'webp' : 'png'}`;
    if (smooth)
      await sharp(Buffer.from(atlas.data), {
        raw: { width: atlas.width, height: atlas.height, channels: 4 },
      })
        .webp({ quality: 90, alphaQuality: 100, effort: 5 })
        .toFile(`${out}/${file}`);
    else await png(`${out}/${file}`, atlas);
    await writeJson(`${out}/atlas-${i}.json`, {
      frames,
      meta: {
        app: 'Dar al-Salam',
        version: '1.0',
        image: file,
        format: 'RGBA8888',
        size: { w: bin.width, h: bin.height },
        scale: '1',
        smooth,
      },
    });
    atlasUrls.push(`atlas-${i}.json`);
  }
  const floor = new Pixels(4096, 4096);
  floor.rect(0, 0, 4096, 4096, '#D7DCD2');
  const tileCount = (await files('art/tiles', '.png')).length;
  const tiles = await Promise.all(
    Array.from({ length: tileCount }, (_, i) =>
      image(`art/tiles/tile-${i + 1}.png`),
    ),
  );
  const layer = room.layers.find((l) => l.name === 'floor');
  if (layer?.type === 'tilelayer')
    for (let y = 0; y < room.height; y++)
      for (let x = 0; x < room.width; x++) {
        const [wx, wy] = worldFromTile(x, y),
          tile = tiles[layer.data[y * room.width + x] - 1];
        if (!tile)
          throw Error(`floor tile ${layer.data[y * room.width + x]} missing`);
        blit(floor, tile, wx - 16, wy);
      }
  if (objectLayer?.type === 'objectgroup')
    for (const o of objectLayer.objects) {
      const art = objectArt[o.type];
      if (!art || !o.walkable || !bakedIntoFloor(o.type, art)) continue;
      const im = await image(`art/${art.file}`),
        p = worldFromTile(o.x, o.y, o.z);
      blit(
        floor,
        im,
        Math.round(p[0] - art.anchor[0]),
        Math.round(p[1] - art.anchor[1]),
      );
    }
  // Top-down floor in tile space: each texel samples the isometric floor art
  // at the matching tile point. The planet shader wraps this onto the sphere.
  const T = 16,
    gw = room.width * T,
    gh = room.height * T,
    groundImage = new Pixels(gw, gh);
  for (let j = 0; j < gh; j++)
    for (let i = 0; i < gw; i++) {
      const [wx, wy] = worldFromTile((i + 0.5) / T, (j + 0.5) / T),
        k = (Math.floor(wy) * 4096 + Math.floor(wx)) * 4;
      groundImage.data.set(floor.data.subarray(k, k + 4), (j * gw + i) * 4);
      groundImage.data[(j * gw + i) * 4 + 3] = 255;
    }
  await sharp(Buffer.from(groundImage.data), {
    raw: { width: gw, height: gh, channels: 4 },
  })
    .webp({ lossless: true })
    .toFile(`${out}/ground.webp`);
  const ground: Manifest['ground'] = {
    url: 'ground.webp',
    texelsPerTile: T,
    width: gw,
    height: gh,
  };
  // The painted sky behind the planet (tools/build/sky.ts).
  await generateSky(`${out}/sky.webp`);
  await fs.mkdir(`${out}/i18n`, { recursive: true });
  const i18n: Record<string, string> = {};
  for (const f of await files('content/i18n', '.json')) {
    await fs.copyFile(f, `${out}/i18n/${path.basename(f)}`);
    i18n[path.basename(f, '.json')] = `i18n/${path.basename(f)}`;
  }
  const manifest: Manifest = {
    width: 4096,
    height: 4096,
    ground,
    atlases: atlasUrls,
    sortables,
    characters: baked,
    landmarks,
    scenes: content.scenes,
    i18n,
    room,
    buildHash: hash(
      JSON.stringify({
        baked,
        landmarks,
        sortables,
        metas,
        palette,
        room,
        tiles: tiles.map((t) => hash(t.data)),
      }),
    ).slice(0, 16),
  };
  await writeJson(`${out}/world.json`, manifestSchema.parse(manifest));
  await fs.cp('art/parts', `${out}/parts`, { recursive: true });
  await writeJson(
    `${out}/parts/index.json`,
    await files('art/parts', '.json').then((p) =>
      p.map((f) => f.replace('art/parts/', '')),
    ),
  );
  await writeJson(`${out}/palette.json`, {
    keys,
    ramps,
    outline: '#493C35',
    shadow: '#493C35',
  });
  await fs.mkdir(`${out}/review`, { recursive: true });
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]!,
    );
  const sections = [],
    reviewed = new Set<string>();
  for (const c of baked) {
    const figures = [];
    for (const [action, names] of Object.entries(c.frames)) {
      const frames = [];
      for (let i = 0; i < names.length; i++) {
        // One file per unique frame (sprites repeat the same still).
        const url = `${names[i]}.webp`;
        if (!reviewed.has(url)) {
          reviewed.add(url);
          const im = images.get(names[i])!;
          await sharp(Buffer.from(im.data), {
            raw: { width: im.width, height: im.height, channels: 4 },
          })
            .webp({ lossless: true, effort: 4 })
            .toFile(`${out}/review/${url}`);
        }
        frames.push(`<img src="${url}" alt="${escape(action)} frame ${i}">`);
      }
      figures.push(
        `<figure><figcaption>${escape(action)}</figcaption>${frames.join('')}</figure>`,
      );
    }
    sections.push(
      `<section><h2>${escape(c.name?.en ?? c.id)} ${c.panelApproved ? '' : '— DRAFT'}</h2><p>needsPanelReview: ${c.needsPanelReview}</p>${figures.join('')}</section>`,
    );
  }
  await fs.writeFile(
    `${out}/review/characters.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Dar al-Salam · Character review</title><style>body{font:16px system-ui;background:#f2ecd9;color:#493c35;padding:32px}section{border-top:1px solid #b69872;padding:20px}figure{display:inline-block;margin:12px}img{image-rendering:pixelated;height:160px;margin:8px;vertical-align:bottom;background:#ded6c0}</style><h1>Character contact sheet — unapproved prototype</h1><p>All sacred-content and historical review is pending. No sample card is approved.</p>${sections.join('')}</html>`,
  );
  await fs.rm('web/public/world', { recursive: true, force: true });
  await fs.cp(out, 'web/public/world', { recursive: true });
  const outputFiles = await files(out, '');
  let bytes = 0;
  for (const f of outputFiles) bytes += (await fs.stat(f)).size;
  console.log(
    `${prod ? 'Production' : 'Development'} assets: ${baked.length} characters, ${bakedCount} frames baked → ${images.size} unique; ${bins.length} atlas(es) ${bins
      .map(({ bin: b }) => b)
      .map((b) => `${b.width}×${b.height}`)
      .join(
        ', ',
      )}; ${(bytes / 1024 / 1024).toFixed(2)} MB; ${warnings.length} warnings.\nReview: public-build/review/characters.html`,
  );
  for (const w of warnings) console.warn(w);
}
build().catch((e) => {
  console.error(`Asset build failed: ${e.message}`);
  process.exitCode = 1;
});
