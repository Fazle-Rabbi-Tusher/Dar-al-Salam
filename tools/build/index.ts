import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { MaxRectsPacker, Rectangle } from 'maxrects-packer';
import { loadContent, validateCharacter } from './validate';
import { readJson, writeJson, loadParts, image, png, files } from './io';
import { compose, trimFrame } from '../../packages/shared/compositor';
import {
  Pixels,
  blit,
  crop,
  paletteErrors,
  type PixelImage,
} from '../../packages/shared/pixels';
import {
  ACTIONS,
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
import { stripDepth } from '../../packages/shared/slicing';
import type { ObjectArt } from '../placeholder/objects';
const out = 'public-build';
const hash = (d: Uint8Array | string) =>
  createHash('sha256').update(d).digest('hex');
async function build() {
  const prod = process.argv.includes('--prod');
  const content = await loadContent(),
    parts = await loadParts();
  const { characters, room, keys, ramps, palette } = content;
  const warnings = characters.flatMap((c) =>
    validateCharacter(c, content.rules, room, parts, content.wardrobe, prod),
  );
  const allowed = new Set(palette),
    sourceAllowed = new Set([...palette, ...Object.values(keys).flat()]);
  for (const p of await files('art', '.png')) {
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
  function register(img: PixelImage, anchor: [number, number]) {
    const t = trimFrame(img, anchor),
      key =
        'f-' +
        hash(
          Buffer.concat([
            Buffer.from(t.image.data),
            Buffer.from(JSON.stringify([t.image.width, t.anchor])),
          ]),
        ).slice(0, 24);
    if (!images.has(key)) {
      const errors = paletteErrors(t.image, allowed);
      if (errors.length)
        throw Error(`Baked frame: palette violation ${errors.slice(0, 4)}`);
      images.set(key, t.image);
      metas[key] = {
        anchor: t.anchor,
        bounds: t.bounds,
        hitMask: Buffer.from(t.mask).toString('base64'),
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
      const facings: Facing[] = s.path
        ? [
            ...new Set(
              s.path.slice(1).map((p, i) => facingFromSegment(s.path![i], p)),
            ),
          ]
        : [s.facing!];
      for (const facing of facings) {
        const key = `${s.action}_${facing}`;
        if (frames[key]) continue;
        frames[key] = [];
        for (let f = 0; f < ACTIONS[s.action]; f++) {
          const img = compose(
            c.look,
            s.action,
            facing,
            f,
            parts,
            {
              keys,
              ramps,
              outline: '#493C35',
              shadow: '#493C35',
            },
            !lifted,
          );
          frames[key].push(register(img, parts[c.look.base].anchor));
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
      minX = Math.min(minX, state.position[0] + b.x);
      minY = Math.min(minY, state.position[1] + b.y);
      maxX = Math.max(maxX, state.position[0] + b.x + b.width);
      maxY = Math.max(maxY, state.position[1] + b.y + b.height);
    }
    baked.push({
      ...c,
      frames,
      shadowFrame,
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
        sortables.push({
          frame: names[0],
          x: wx,
          y: wy,
          depth: stripDepth(
            [o.x, o.y],
            o.footprint,
            x + width / 2 - art.anchor[0],
          ),
          objectId: o.id,
          tile: [o.x, o.y],
          footprint: o.footprint,
          ...(names.length > 1 ? { animation: names } : {}),
        });
      }
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
  floor.rect(0, 0, 4096, 4096, '#D9D1BA');
  const tiles = await Promise.all(
    Array.from({ length: 6 }, (_, i) => image(`art/tiles/tile-${i + 1}.png`)),
  );
  const layer = room.layers.find((l) => l.name === 'floor');
  if (layer?.type === 'tilelayer')
    for (let y = 0; y < room.height; y++)
      for (let x = 0; x < room.width; x++) {
        const [wx, wy] = worldFromTile(x, y);
        blit(floor, tiles[layer.data[y * room.width + x] - 1], wx - 16, wy);
      }
  const chunks: Manifest['chunks'] = [];
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const url = `chunk-${x}-${y}.webp`;
      await sharp(Buffer.from(floor.data), {
        raw: { width: 4096, height: 4096, channels: 4 },
      })
        .extract({ left: x * 1024, top: y * 1024, width: 1024, height: 1024 })
        .webp({ lossless: true })
        .toFile(`${out}/${url}`);
      chunks.push({ x: x * 1024, y: y * 1024, url });
    }
  const full = new Pixels(4096, 4096);
  full.data.set(floor.data);
  const items = [
    ...sortables.map((s) => ({
      name: s.frame,
      x: s.x,
      y: s.y,
      depth: s.depth,
    })),
    ...baked
      .filter((c) => c.shadowFrame)
      .map((c) => {
        const s = characterState(c, 0),
          p = worldFromTile(...s.tile);
        return {
          name: c.shadowFrame!,
          x: p[0],
          y: p[1],
          depth: depth(...s.tile) - 1,
        };
      }),
    ...baked.map((c) => {
      const s = characterState(c, 0);
      return {
        name: c.frames[`${s.action}_${s.facing}`][s.index],
        x: s.position[0],
        y: s.position[1],
        depth: depth(...s.tile),
      };
    }),
  ].sort((a, b) => a.depth - b.depth);
  for (const i of items) {
    const m = metas[i.name];
    blit(
      full,
      images.get(i.name)!,
      Math.round(i.x - m.anchor[0]),
      Math.round(i.y - m.anchor[1]),
    );
  }
  const lod: Manifest['lod'] = [];
  for (const scale of [0.5, 0.25, 0.125]) {
    const size = 4096 * scale;
    const data = await sharp(Buffer.from(full.data), {
      raw: { width: 4096, height: 4096, channels: 4 },
    })
      .resize(size, size, { kernel: 'nearest' })
      .raw()
      .toBuffer();
    const tiles: Manifest['lod'][number]['tiles'] = [];
    for (let y = 0; y < size; y += 1024)
      for (let x = 0; x < size; x += 1024) {
        const url = `lod-${scale}-${x}-${y}.webp`;
        await sharp(data, { raw: { width: size, height: size, channels: 4 } })
          .extract({
            left: x,
            top: y,
            width: Math.min(1024, size - x),
            height: Math.min(1024, size - y),
          })
          .webp({ lossless: true })
          .toFile(`${out}/${url}`);
        tiles.push({ x: x / scale, y: y / scale, url });
      }
    lod.push({ scale, tiles });
  }
  await fs.mkdir(`${out}/i18n`, { recursive: true });
  const i18n: Record<string, string> = {};
  for (const f of await files('content/i18n', '.json')) {
    await fs.copyFile(f, `${out}/i18n/${path.basename(f)}`);
    i18n[path.basename(f, '.json')] = `i18n/${path.basename(f)}`;
  }
  const manifest: Manifest = {
    width: 4096,
    height: 4096,
    chunkSize: 1024,
    chunks,
    lod,
    atlases: atlasUrls,
    sortables,
    characters: baked,
    i18n,
    room,
    buildHash: hash(JSON.stringify({ baked, sortables, metas, palette })).slice(
      0,
      16,
    ),
  };
  await writeJson(`${out}/world.json`, manifest);
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
