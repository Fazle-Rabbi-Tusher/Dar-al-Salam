import { useEffect, useRef, useState } from 'react';
import {
  ACTIONS,
  type Action,
  type Facing,
  type Look,
} from '../../../packages/shared/schema';
import {
  browserComposite,
  importAseprite,
  trimFrame,
  type Part,
  type Palette,
} from '../../../packages/shared/compositor';
import type { PixelImage } from '../../../packages/shared/pixels';
import { ANIMALS, canvasFor } from '../../../packages/shared/canvas';
import { useT } from './store';
import { Icon } from './Icon';
import wardrobe from '../../../content/wardrobe.json';
/** Bases that are not people: no garments, and their own set of actions. */
const NON_PEOPLE: string[] = ['cat', 'bird', 'ball', 'ambulance', ...ANIMALS];
const actionPrefix = (base: string) =>
  base === 'ambulance'
    ? 'vehicle_'
    : (ANIMALS as readonly string[]).includes(base)
      ? 'animal_'
      : base + '_';
const initial: Look = {
  base: 'adult-woman',
  garment: 'lab-coat',
  headwear: 'hijab',
  prop: 'flask',
  colours: {
    skin: 'skin-4',
    hair: 'hair-black',
    garmentPrimary: 'lab-white',
    garmentSecondary: 'navy',
    headwear: 'emerald',
    prop: 'sky',
  },
};
async function browserImage(url: string): Promise<PixelImage> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return {
    width: img.width,
    height: img.height,
    data: new Uint8Array(ctx.getImageData(0, 0, img.width, img.height).data),
  };
}
export function Lab() {
  const t = useT(),
    [look, setLook] = useState(initial),
    [parts, setParts] = useState<Record<string, Part>>({}),
    [palette, setPalette] = useState<Palette | null>(null),
    [action, setAction] = useState<Action>('idle'),
    [facing, setFacing] = useState<Facing>('SE'),
    [zoom, setZoom] = useState(4),
    [playing, setPlaying] = useState(true),
    [frame, setFrame] = useState(0),
    [anchor, setAnchor] = useState(true),
    [bounds, setBounds] = useState(false),
    [mask, setMask] = useState(false),
    [floor, setFloor] = useState(false),
    [copied, setCopied] = useState(false),
    [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const files: string[] = await fetch('/world/parts/index.json').then((r) =>
        r.json(),
      );
      const entries = await Promise.all(
        files.map(async (file) => {
          const json = await fetch('/world/parts/' + file).then((r) =>
            r.json(),
          );
          const id = file.split('/').pop()!.replace('.json', '');
          const image = await browserImage(
            '/world/parts/' +
              file.slice(0, file.lastIndexOf('/') + 1) +
              json.meta.image,
          );
          return [id, importAseprite(id, json, image)] as const;
        }),
      );
      const p = await fetch('/world/palette.json').then((r) => r.json());
      if (!cancelled) {
        setParts(Object.fromEntries(entries));
        setPalette(p);
      }
    })().catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % 240), 1000 / 12);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (!palette || !canvas.current || !parts[look.base]) return;
    const ctx = canvas.current.getContext('2d')!;
    try {
      const image = browserComposite(
        // Prop sheets omit prayer frames: hands are free during prayer.
        action === 'pray' ? { ...look, prop: 'none' } : look,
        action,
        facing,
        Math.floor(((frame % 60) / 60) * ACTIONS[action]),
        parts,
        palette,
        ctx,
      );
      const tr = trimFrame(image, parts[look.base].anchor);
      if (mask) {
        const data = ctx.getImageData(0, 0, image.width, image.height);
        for (let i = 0; i < data.data.length; i += 4)
          if (data.data[i + 3]) {
            data.data[i] = 216;
            data.data[i + 1] = 173;
            data.data[i + 2] = 87;
            data.data[i + 3] = 200;
          }
        ctx.putImageData(data, 0, 0);
      }
      if (bounds) {
        ctx.strokeStyle = '#c87865';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          tr.bounds.x + parts[look.base].anchor[0] + 0.5,
          tr.bounds.y + parts[look.base].anchor[1] + 0.5,
          tr.bounds.width - 1,
          tr.bounds.height - 1,
        );
      }
      if (anchor) {
        const [x, y] = parts[look.base].anchor;
        ctx.fillStyle = '#e73f56';
        ctx.fillRect(x - 2, y, 5, 1);
        ctx.fillRect(x, y - 2, 1, 5);
      }
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }, [look, action, facing, frame, parts, palette, anchor, bounds, mask]);
  const field = (
    key: 'base' | 'garment' | 'headwear' | 'prop',
    values: string[],
  ) => (
    <label>
      {t(key)}
      <select
        disabled={
          NON_PEOPLE.includes(look.base)
            ? key !== 'base'
            : false
        }
        value={look[key]}
        onChange={(e) => {
          const val = e.target.value;
          if (
            key === 'base' &&
            NON_PEOPLE.includes(val)
          ) {
            setLook({
              ...look,
              base: val,
              garment: 'none',
              headwear: 'none',
              prop: 'none',
            });
            setAction(
              Object.keys(ACTIONS).find((a) =>
                a.startsWith(actionPrefix(val)),
              ) as Action,
            );
          } else {
            setLook(
              key === 'base' &&
                NON_PEOPLE.includes(look.base)
                ? { ...initial, base: val, colours: look.colours }
                : { ...look, [key]: val },
            );
            if (
              key === 'base' &&
              NON_PEOPLE.includes(look.base)
            )
              setAction('idle');
          }
        }}
      >
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  const animal = NON_PEOPLE.includes(look.base);
  return (
    <main className="document lab-page">
      <a className="back-link" href="/">
        ← {t('back')}
      </a>
      <div className="eyebrow">{t('dev')}</div>
      <h1>{t('lab')}</h1>
      <p className="lede">{t('labText')}</p>
      <div className="lab-grid">
        <section className="lab-controls">
          {field('base', [
            'adult-man',
            'adult-woman',
            'child',
            'adult-man-beard',
            'adult-man-clean',
            'adult-man-curly',
            'adult-man-goatee',
            'adult-man-shaved',
            'adult-man-short',
            'adult-man-shaved-beard',
            'adult-man-swept-beard',
            'adult-woman-loose',
            'elder',
            'cat',
            'bird',
            'ball',
            ...ANIMALS,
          ])}
          {field('garment', [
            'none',
            ...wardrobe['mosque-garden'].garments.filter((v) => v !== 'none'),
          ])}
          {field('headwear', wardrobe['mosque-garden'].headwear)}
          {field('prop', [
            'none',
            ...Object.keys(parts).filter((id) =>
              [
                'book',
                'scroll',
                'astrolabe',
                'water-skin',
                'basket',
                'bread',
                'scale',
                'broom',
                'pen',
                'tray',
                'laptop',
                'tablet',
                'phone',
                'coffee',
                'flask',
                'stethoscope',
                'clipboard',
                'blueprint',
                'meal-box',
                'water-jug',
                'cane',
                'shopping-bag',
                'football',
                'wrist-tape',
              ].includes(id),
            ),
          ])}
          {palette &&
            Object.keys(palette.keys).map((slot) => (
              <label key={slot}>
                {t(slot as 'skin')}
                <select
                  value={look.colours[slot]}
                  onChange={(e) =>
                    setLook({
                      ...look,
                      colours: { ...look.colours, [slot]: e.target.value },
                    })
                  }
                >
                  {Object.keys(palette.ramps).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            ))}
        </section>
        <section className="lab-preview">
          <div className={`checkerboard ${floor ? 'floor-preview' : ''}`}>
            <canvas
              ref={canvas}
              width={canvasFor(look.base).width}
              height={canvasFor(look.base).height}
              style={{
                width: canvasFor(look.base).width * zoom,
                height: canvasFor(look.base).height * zoom,
              }}
            />
          </div>
          <div className="lab-row">
            <label>
              {t('action')}
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as Action)}
              >
                {Object.keys(ACTIONS)
                  .filter((a) =>
                    animal
                      ? a.startsWith(actionPrefix(look.base))
                      : !/^(cat|bird|ball|vehicle|animal)_/.test(a),
                  )
                  .map((a) => (
                    <option key={a}>{a}</option>
                  ))}
              </select>
            </label>
            <label>
              {t('facing')}
              <select
                value={facing}
                onChange={(e) => setFacing(e.target.value as Facing)}
              >
                {['SE', 'SW', 'NE', 'NW'].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <label>
              ×
              <select
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              >
                {[1, 2, 4, 8].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="lab-row">
            <button className="primary" onClick={() => setPlaying(!playing)}>
              <Icon name={playing ? 'pause' : 'play'} />
              {playing ? t('pause') : t('play')}
            </button>
            <button
              className="outline-button"
              onClick={() => {
                setPlaying(false);
                setFrame((f) => f + Math.ceil(60 / ACTIONS[action]));
              }}
            >
              {t('step')}
            </button>
            <span>{frame % 60} / 60</span>
          </div>
          <div className="lab-row lab-checks">
            {(
              [
                ['anchor', anchor, setAnchor],
                ['bounds', bounds, setBounds],
                ['mask', mask, setMask],
                ['floor', floor, setFloor],
              ] as const
            ).map(([key, value, fn]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => fn(e.target.checked)}
                />
                {t(key)}
              </label>
            ))}
          </div>
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
      <button
        className="outline-button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(JSON.stringify(look, null, 2));
            setCopied(true);
          } catch {
            setError(t('copyError'));
          }
        }}
      >
        <Icon name="copy" />
        {copied ? t('copied') : t('copy')}
      </button>
      <pre>{JSON.stringify(look, null, 2)}</pre>
    </main>
  );
}
