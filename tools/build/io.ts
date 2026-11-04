import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  importAseprite,
  type Part,
  type Aseprite,
} from '../../packages/shared/compositor';
import type { PixelImage } from '../../packages/shared/pixels';
export const readJson = async (p: string) =>
  JSON.parse(await fs.readFile(p, 'utf8'));
export async function writeJson(p: string, v: unknown) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(v, null, 2) + '\n');
}
export async function png(p: string, img: PixelImage) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await sharp(Buffer.from(img.data), {
    raw: { width: img.width, height: img.height, channels: 4 },
  })
    .png()
    .toFile(p);
}
export async function image(p: string): Promise<PixelImage> {
  const { data, info } = await sharp(p)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8Array(data) };
}
export async function files(dir: string, extension: string): Promise<string[]> {
  const out: string[] = [];
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...(await files(p, extension)));
    else if (p.endsWith(extension)) out.push(p);
  }
  return out.sort();
}
export async function loadParts() {
  const parts: Record<string, Part> = {};
  for (const p of await files('art/parts', '.json')) {
    const json: Aseprite = await readJson(p);
    const id = path.basename(p, '.json');
    parts[id] = importAseprite(
      id,
      json,
      await image(path.join(path.dirname(p), json.meta.image)),
    );
  }
  return parts;
}
