import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { MaxRectsPacker, Rectangle } from 'maxrects-packer';
import { loadContent, validateCharacter } from './validate';
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
  characterState,
  facingFromSegment,
} from '../../packages/shared/script';
import { worldFromTile, depth } from '../../packages/shared/iso';
import { stripDepth, stripGround } from '../../packages/shared/slicing';
import {
  PLANET,
  planetToTile,
  wildAt,
  type Vec3,
} from '../../packages/shared/planet';
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
  const allowed = new Set(palette),
    sourceAllowed = new Set([...palette, ...Object.values(keys).flat()]);
  for (const p of await files('art', '.png')) {
    // Illustrated story-card portraits are not pixel art.
    if (p.startsWith('art/illustrations/')) continue;
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
  function register(img: PixelImage, anchor: [number, number], density = 1) {
    const t = trimFrame(img, anchor),
      key =
        'f-' +
        hash(
          Buffer.concat([
            Buffer.from(t.image.data),
            Buffer.from(JSON.stringify([t.image.width, t.anchor, density])),
          ]),
        ).slice(0, 24);
    if (!images.has(key)) {
      const errors = paletteErrors(t.image, allowed);
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
      };
    }
    return key;
  }
  const baked: BakedCharacter[] = [];
  let bakedCount = 0;
  for (const c of characters) {
    const lifted =
      c.kind === 'bird' ||
      c.script.some((s) =>
        Array.isArray(s.z) ? s.z.some((z) => z !== 0) : Boolean(s.z),
      );
    let shadowFrame: string | undefined;
    if (lifted) {
      const shadow = new Pixels(16, 8);
      shadow.ellipse(8, 4, 6, 2, [73, 60, 53, 89]);
      shadowFrame = register(shadow, [8, 4]);
    }
    const frames: Record<string, string[]> = {};
    for (const s of c.script) {
      // On the planet the camera decides which side of a character is seen,
      // so every facing is baked (back-only characters get NE/NW only).
      const facings: Facing[] =
        c.depiction === 'back' ? ['NE', 'NW'] : ['SE', 'SW', 'NE', 'NW'];
      void facingFromSegment;
      for (const facing of facings) {
        const key = `${s.action}_${facing}`;
        if (frames[key]) continue;
        frames[key] = [];
        for (let f = 0; f < ACTIONS[s.action]; f++) {
          const pal = {
            keys,
            ramps,
            outline: '#493C35',
            shadow: '#493C35',
          };
          const head = heads[c.id],
            anchor = parts[c.look.base].anchor;
          if (head) {
            const { image: img, overhang } = composeWithHead(
              c.look,
              s.action,
              facing,
              f,
              parts,
              pal,
              head,
              !lifted,
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
                compose(c.look, s.action, facing, f, parts, pal, !lifted),
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
        m = metas[frames[`${state.action}_${state.facing}`][state.index]],
        b = m.bounds;
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
    baked.push({
      ...c,
      frames,
      shadowFrame,
      ...(illustration ? { illustration } : {}),
      ...(portrait ? { portrait } : {}),
      interactive: Boolean(c.name),
      needsPanelReview: c.script.some((s) => s.action === 'pray'),
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
        });
      }
    }
  // Trees and planters across the rest of the planet, on a Fibonacci lattice.
  const wild = [
    'm-tree',
    'palm',
    'cypress',
    'detail-olive',
    'm-tree',
    'm-tree',
  ];
  const wildFrames = new Map<string, string>();
  for (const type of wild) {
    const art = objectArt[type];
    wildFrames.set(
      type,
      register(await image(`art/${art.file}`), art.anchor as [number, number]),
    );
  }
  const count = 900,
    golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2,
      r = Math.sqrt(1 - y * y),
      a = golden * i;
    // Seeded jitter breaks up the lattice rows (build time only).
    const j1 = Math.sin(i * 12.9898) * 43758.5453,
      j2 = Math.sin(i * 78.233) * 12345.6789,
      jx = (j1 - Math.floor(j1) - 0.5) * 0.09,
      jy = (j2 - Math.floor(j2) - 0.5) * 0.09;
    const q: Vec3 = [Math.cos(a) * r + jx, y + jy, Math.sin(a) * r - jx * 0.5],
      ql = Math.hypot(...q),
      p: Vec3 = [q[0] / ql, q[1] / ql, q[2] / ql];
    // Keep clear of the mapped rooms (out to the far corners, plus a margin).
    const reach =
      Math.hypot(
        Math.max(PLANET.centre[0], room.width - PLANET.centre[0]),
        Math.max(PLANET.centre[1], room.height - PLANET.centre[1]),
      ) * 0.86;
    if (Math.acos(p[2]) * PLANET.radiusTiles < reach) continue;
    if (wildAt(p) !== 'grass' || Math.abs(p[1]) > 0.93) continue;
    const tile = planetToTile(p),
      inside =
        tile[0] > -3 &&
        tile[1] > -3 &&
        tile[0] < room.width + 3 &&
        tile[1] < room.height + 3;
    if (inside || (i * 7919) % 5 === 0) continue;
    const type = wild[(i * 31 + 7) % wild.length],
      frame = wildFrames.get(type)!,
      m = metas[frame];
    const [wx, wy] = worldFromTile(...tile);
    sortables.push({
      frame,
      x: wx,
      y: wy,
      depth: depth(...tile),
      objectId: -1 - i,
      tile,
      footprint: [1, 1],
      ground: tile,
      pivot: [m.anchor[0], m.anchor[1]],
      lift: 0,
    });
  }
  const packer = new MaxRectsPacker<Rectangle>(2048, 2048, 2, {
    smart: true,
    pot: true,
    square: false,
    allowRotation: false,
    border: 2,
  });
  for (const [id, im] of images)
    packer.add(im.width + 2, im.height + 2, { id });
  const atlasUrls: string[] = [];
  for (const [i, bin] of packer.bins.entries()) {
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
    await png(`${out}/atlas-${i}.png`, atlas);
    await writeJson(`${out}/atlas-${i}.json`, {
      frames,
      meta: {
        app: 'Dar al-Salam',
        version: '1.0',
        image: `atlas-${i}.png`,
        format: 'RGBA8888',
        size: { w: bin.width, h: bin.height },
        scale: '1',
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
    i18n,
    room,
    buildHash: hash(
      JSON.stringify({
        baked,
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
  const sections = [];
  for (const c of baked) {
    const figures = [];
    for (const [action, names] of Object.entries(c.frames)) {
      const frames = [];
      for (let i = 0; i < names.length; i++) {
        const url = `${c.id}-${action}-${i}.png`;
        await png(`${out}/review/${url}`, images.get(names[i])!);
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
    `${prod ? 'Production' : 'Development'} assets: ${baked.length} characters, ${bakedCount} frames baked → ${images.size} unique; ${packer.bins.length} atlas(es) ${packer.bins.map((b) => `${b.width}×${b.height}`).join(', ')}; ${(bytes / 1024 / 1024).toFixed(2)} MB; ${warnings.length} warnings.\nReview: public-build/review/characters.html`,
  );
  for (const w of warnings) console.warn(w);
}
build().catch((e) => {
  console.error(`Asset build failed: ${e.message}`);
  process.exitCode = 1;
});
