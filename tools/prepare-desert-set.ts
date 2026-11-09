import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import sharp from 'sharp';

/*
 * Cuts the owner's multi-angle desert set (2026-11, "desert multi-angle
 * pixel art") into art: isometric three-quarter views drawn with real
 * volume, so pieces read as solid objects on the planet rather than flat
 * side views.
 *
 *   node --import tsx tools/prepare-desert-set.ts <folder of the set>
 *
 * - Buildings and props (fortress, tent, well, market stall, date palms,
 *   dead tree, rocks): every view becomes its own supplied piece
 *   (art/supplied/<id>-<view>.png), so each placement can show a different
 *   side, as if the object were turned.
 * - The bare camel's eight turnaround views become art/sprites/dir8/camel
 *   (one strip, views in screen directions S, SE, E, NE, N, NW, W, SW), which
 *   the engine picks from as a camel walks and turns.
 * - The historic building's view 0 becomes the Mosque of the Companions.
 *
 * The guide, the riders and the reciter are people and are not cut here
 * (Massawa shows no people; the reciter belongs to another scene).
 */
const [dir] = process.argv.slice(2);
const SET = {
  props: `${dir}/desert-buildings-and-props.png`,
  camels: `${dir}/desert-guide-camels-and-rider.png`,
  building: `${dir}/historic-building-8-views.png`,
};
const tmp = fs.mkdtempSync('/tmp/desert-set-');
let n = 0;
async function cut(sheet: string, box: number[], edits: string[] = []) {
  const file = `${tmp}/c${n++}.png`;
  execFileSync('node', [
    '--import',
    'tsx',
    'tools/prepare-landmark.ts',
    sheet,
    file,
    ...box.map(String),
    ...edits,
  ]);
  return file;
}
/** Ground point: the middle of the lowest opaque rows (raised by `base`). */
async function groundPoint(file: string, base = 0.04) {
  const { data, info } = await sharp(file)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bottom = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 0) bottom = y;
  const row = bottom - Math.round(info.height * base);
  let sx = 0,
    c = 0;
  for (let y = Math.max(0, row - 6); y <= bottom; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 0) {
        sx += x;
        c++;
      }
  return {
    anchor: [Math.round(c ? sx / c : info.width / 2), row] as [number, number],
    width: info.width,
    height: info.height,
  };
}
const index: Record<string, unknown> = JSON.parse(
  fs.readFileSync('art/supplied/index.json', 'utf8'),
);
/* ── Buildings and props: four views each, world height in px ── */
type Piece = {
  id: string;
  boxes: number[][];
  height: number;
  base?: number;
};
const pad = (x: number, y: number, w: number, h: number, p = 6) => {
  const x0 = Math.max(0, x - p),
    y0 = Math.max(0, y - p);
  return [x0, y0, x + w + p - x0, y + h + p - y0];
};
const PIECES: Piece[] = [
  {
    id: 'sup-fort',
    height: 120,
    base: 0.06,
    boxes: [
      pad(27, 5, 318, 223),
      pad(382, 4, 303, 227),
      pad(730, 4, 296, 226),
      pad(1075, 6, 311, 223),
    ],
  },
  {
    id: 'sup-tent2',
    height: 64,
    base: 0.08,
    boxes: [
      pad(30, 240, 319, 185),
      pad(379, 234, 300, 189),
      pad(724, 244, 295, 181),
      pad(1057, 241, 314, 182),
    ],
  },
  {
    id: 'sup-well2',
    height: 50,
    base: 0.08,
    boxes: [
      pad(64, 428, 209, 204),
      pad(420, 426, 206, 201),
      pad(771, 428, 216, 200),
      pad(1130, 426, 201, 206),
    ],
  },
  {
    id: 'sup-stall2',
    height: 54,
    base: 0.06,
    boxes: [
      pad(50, 642, 239, 194),
      pad(413, 641, 237, 194),
      pad(745, 643, 237, 190),
      pad(1108, 642, 241, 196),
    ],
  },
  {
    id: 'sup-datepalm',
    height: 112,
    base: 0.08,
    boxes: [pad(54, 841, 242, 272)],
  },
  {
    id: 'sup-datepalms',
    height: 100,
    base: 0.08,
    boxes: [pad(391, 873, 255, 225)],
  },
  {
    id: 'sup-deadtree2',
    height: 84,
    base: 0.08,
    boxes: [pad(728, 853, 277, 256)],
  },
  {
    id: 'sup-rocks2',
    height: 46,
    base: 0.1,
    boxes: [pad(1053, 890, 333, 204)],
  },
];
for (const p of PIECES)
  for (const [v, box] of p.boxes.entries()) {
    const id = p.boxes.length > 1 ? `${p.id}-${v}` : p.id,
      out = `art/supplied/${id}.png`;
    fs.copyFileSync(await cut(SET.props, box, ['largest']), out);
    const g = await groundPoint(out, p.base);
    index[id] = {
      file: `supplied/${id}.png`,
      anchor: g.anchor,
      density: +(g.height / p.height).toFixed(3),
      source:
        'Owner-supplied multi-angle desert set (2026-11), cut by tools/prepare-desert-set.ts',
    };
    console.log(id, g.width, g.height);
  }
/* ── Terrain tiles: dunes, the oasis and rock mesas, without their block
   sides, edges dissolved into the sand ── */
{
  const terrain = `${dir}/desert-terrain-multiple-views.png`;
  const rows: [string, number, number[][]][] = [
    [
      'sup-dunes',
      70,
      [
        [20, 15, 338, 219],
        [383, 21, 332, 213],
        [736, 22, 331, 212],
        [1094, 20, 333, 214],
      ],
    ],
    [
      'sup-oasis',
      110,
      [
        [19, 242, 337, 271],
        [383, 242, 332, 271],
        [736, 246, 333, 267],
        [1094, 244, 333, 269],
      ],
    ],
    [
      'sup-mesa',
      86,
      [
        [18, 519, 341, 242],
        [379, 524, 337, 236],
        [737, 527, 333, 233],
        [1094, 524, 337, 236],
      ],
    ],
  ];
  for (const [base, height, boxes] of rows)
    for (const [v, b] of boxes.entries()) {
      const id = `${base}-${v}`,
        out = `art/supplied/${id}.png`;
      fs.copyFileSync(
        await cut(terrain, pad(b[0], b[1], b[2], b[3]), [
          'largest',
          'wall=40',
          'fade=10',
          // The oasis pool's dark water is part of the art.
          ...(base === 'sup-oasis' ? ['keepholes'] : []),
        ]),
        out,
      );
      // The ground point is the middle of the tile's top surface.
      const g = await groundPoint(out, 0.22);
      index[id] = {
        file: `supplied/${id}.png`,
        anchor: g.anchor,
        density: +(g.height / height).toFixed(3),
        source:
          'Owner-supplied multi-angle desert set (2026-11): terrain tile top without its block sides, cut by tools/prepare-desert-set.ts',
      };
      console.log(id, g.width, g.height);
    }
}
/* ── The mosque: view 0 of the historic building ── */
{
  const out = 'art/landmarks/mosque-of-the-companions.png';
  fs.copyFileSync(
    await cut(SET.building, pad(23, 43, 398, 322, 8), ['largest', 'keepholes']),
    out,
  );
  const g = await groundPoint(out, 0.03);
  const landmarks = JSON.parse(
    fs.readFileSync('art/landmarks/index.json', 'utf8'),
  );
  landmarks['mosque-of-the-companions'] = {
    file: 'landmarks/mosque-of-the-companions.png',
    anchor: g.anchor,
    // About as wide on the planet as before (207 world px).
    density: +(g.width / 200).toFixed(3),
    source:
      'Owner-supplied multi-angle desert set (2026-11): view 0 of the historic stair-and-arch building, cut by tools/prepare-desert-set.ts (its dome carries a plain knob)',
  };
  fs.writeFileSync(
    'art/landmarks/index.json',
    JSON.stringify(landmarks, null, 2) + '\n',
  );
  console.log('mosque', g.width, g.height);
}
/* ── Camel: eight turnaround views → one strip, feet pinned ── */
{
  // Sheet order, left to right: front, front-right, right, back-right, back,
  // back-left, left, front-left = facing S, SE, E, NE, N, NW, W, SW on screen.
  const boxes = [
    [80, 287, 81, 221],
    [251, 287, 136, 221],
    [429, 296, 195, 211],
    [665, 294, 127, 214],
    [876, 292, 75, 216],
    [1031, 293, 112, 214],
    [1193, 301, 156, 206],
    [1378, 292, 126, 216],
  ];
  const frames = [];
  for (const b of boxes) {
    const f = await cut(SET.camels, pad(b[0], b[1], b[2], b[3], 5), [
      'largest',
    ]);
    const g = await groundPoint(f, 0.02);
    frames.push({ f, ...g });
  }
  const left = Math.max(...frames.map((f) => f.anchor[0])),
    right = Math.max(...frames.map((f) => f.width - f.anchor[0])),
    up = Math.max(...frames.map((f) => f.anchor[1])),
    down = Math.max(...frames.map((f) => f.height - f.anchor[1]));
  const FW = left + right + 8,
    FH = up + down + 8,
    foot: [number, number] = [left + 4, up + 4];
  fs.mkdirSync('art/sprites/dir8', { recursive: true });
  await sharp({
    create: {
      width: FW * 8,
      height: FH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      frames.map((f, i) => ({
        input: f.f,
        left: i * FW + foot[0] - f.anchor[0],
        top: foot[1] - f.anchor[1],
      })),
    )
    .png()
    .toFile('art/sprites/dir8/camel.png');
  const height = Math.max(...frames.map((f) => f.height));
  fs.writeFileSync(
    'art/sprites/dir8/camel.json',
    JSON.stringify(
      {
        frame: [FW, FH],
        foot,
        // A camel stands about 76 world px tall at the head (people are about 56).
        density: +(height / 76).toFixed(3),
        views: ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'],
      },
      null,
      2,
    ) + '\n',
  );
  console.log('camel strip', FW, FH);
}
fs.writeFileSync(
  'art/supplied/index.json',
  JSON.stringify(index, null, 2) + '\n',
);
