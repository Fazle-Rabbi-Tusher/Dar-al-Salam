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
      p.startsWith('art/supplied/')
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
      frames: out,
      flip: facing === 'SW' || facing === 'NW',
      density: meta.density,
    };
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
  const baked: BakedCharacter[] = [];
  let bakedCount = 0;
  for (const c of characters) {
    const lifted =
      c.kind === 'bird' ||
      c.script.some((s) =>
        Array.isArray(s.z) ? s.z.some((z) => z !== 0) : Boolean(s.z),
      );
    const sprite = await characterSprite(c.id);
    // Sprite characters (and anyone lifted off the floor) get a separate
    // floor shadow; their drawn frames are baked without one.
    const unshadowed = lifted || Boolean(sprite);
    let shadowFrame: string | undefined;
    if (sprite) {
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
        const strip = await stripFrames(
          c.id,
          `${s.action}${s.prop ? '@' + s.prop : ''}`,
          facing,
        );
        if (strip) {
          const n = ACTIONS[s.action],
            tempo = stripTempo(s.action);
          if (strip.flip) mirror.push(key);
          for (let f = 0; f < n; f++) {
            const fr = strip.frames[Math.floor((f * strip.frames.length) / n)];
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
    baked.push({
      ...c,
      frames,
      ...(mirror.length ? { mirror } : {}),
      shadowFrame,
      ...(illustration ? { illustration } : {}),
      ...(portrait ? { portrait } : {}),
      interactive: Boolean(c.name),
      needsPanelReview: c.script.some(
        (s) => s.action === 'pray' || s.action === 'sujood',
      ),
      loopBounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    });
  }
  const objectArt: Record<string, ObjectArt> = await readJson(
    'art/objects/index.json',
  );
  const sortables: Sortable[] = [];
  const objectLayer = room.layers.find((l) => l.type === 'objectgroup');
  if (objectLayer?.type === 'objectgroup')
    for (const o of objectLayer.objects) {
      const art = objectArt[o.type];
      if (!art) throw Error(`Unknown room object ${o.type}`);
      if (o.walkable && bakedIntoFloor(o.type, art)) continue;
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
    'forest-tree': [
      ['m-pine', 'm-oak', 'm-pine', 'm-birch', 'm-oak', 'm-tree'],
      ['cypress', 'm-tree', 'cypress', 'detail-olive', 'm-tree', 'm-tree'],
    ],
    'meadow-tree': [
      ['m-oak', 'm-cherry', 'm-tree', 'm-birch'],
      ['m-tree', 'detail-olive', 'm-tree', 'cypress'],
    ],
    bush: [['m-bush'], []],
    palm: [['m-palm'], ['palm']],
    'beach-rock': [['m-beach-rocks', 'm-rock'], ['palm']],
    boulder: [['m-rock'], ['cypress']],
    waterfall: [['m-waterfall'], []],
    ship: [['m-ship'], []],
    // Massawa's dry coast: never a lush tree in the desert.
    acacia: [['msw-acacia'], []],
    'doum-palm': [['msw-palm'], ['m-palm']],
  };
  const wildFrames = new Map<
    string,
    { names: string[]; period?: number } | null
  >();
  const wildFrame = async (type: string) => {
    if (wildFrames.has(type)) return wildFrames.get(type)!;
    const art = objectArt[type];
    let entry: { names: string[]; period?: number } | null = null;
    if (art && !bakedIntoFloor(type, art)) {
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
  const wildCounts: Record<string, number> = {};
  for (const [i, w] of wildPlantings().entries()) {
    // Massawa's town is laid out by hand (packages/shared/massawa.ts).
    if (massawaTown(w.tile) < MASSAWA.town.radius + 1) continue;
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
  // Pieces cut from the owner's desert and camel sheets (art/supplied) are
  // detailed art drawn at their own density, like the landmarks.
  const suppliedArt: Record<
    string,
    { file: string; anchor: [number, number]; density: number }
  > = await readJson('art/supplied/index.json');
  const supplied = new Map<string, { names: string[]; period?: number }>();
  for (const [i, [type, x, y]] of MASSAWA_OBJECTS.entries()) {
    const sup = suppliedArt[type];
    if (sup && !supplied.has(type))
      supplied.set(type, {
        names: [
          register(
            await image(`art/${sup.file}`),
            sup.anchor,
            sup.density,
            true,
          ),
        ],
      });
    const chosen = supplied.get(type) ?? (await wildFrame(type));
    if (!chosen) throw Error(`Massawa: unknown object ${type}`);
    const frame = chosen.names[0],
      tile: [number, number] = [x, y],
      [wx, wy] = worldFromTile(x, y);
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
      if (!o.walkable || !bakedIntoFloor(o.type, art)) continue;
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
