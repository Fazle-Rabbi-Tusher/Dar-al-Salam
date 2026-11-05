import { useCallback, useEffect, useRef, useState } from 'react';
import { Engine } from '../engine/Engine';
import type { BakedCharacter, Manifest } from '../../../packages/shared/schema';
import {
  PHONE_WIDTH,
  PHONE_ZOOM,
  parseUrl,
  serialiseUrl,
  type Camera,
} from '../../../packages/shared/url';
import { tileFromWorld, worldFromTile } from '../../../packages/shared/iso';
import { useStore, useT, type Language } from './store';
import { Icon } from './Icon';
import { Lab } from './Lab';
export function App() {
  const t = useT(),
    lang = useStore((s) => s.lang),
    setLang = useStore((s) => s.setLang),
    motion = useStore((s) => s.motion),
    setMotion = useStore((s) => s.setMotion);
  const [manifest, setManifest] = useState<Manifest | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  useEffect(() => {
    fetch('/world/world.json')
      .then((r) => {
        if (!r.ok) throw Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setManifest)
      .catch((e) => setError(String(e)));
  }, []);
  const path = location.pathname;
  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label={t('title')}>
          <span className="brand-mark">
            <Icon name="leaf" size={28} />
          </span>
          <span>
            <strong>{t('title')}</strong>
            <small>{t('tagline')}</small>
          </span>
        </a>
        <div className="header-centre">
          {(path === '/' || path.startsWith('/c/')) && (
            <span className="header-location">
              <span className="location-dot" />
              {t('room')}
            </span>
          )}
        </div>
        <nav className="header-actions">
          <div className="language-control">
            <Icon name="globe" size={17} />
            <select
              value={lang}
              aria-label={t('language')}
              onChange={(e) => setLang(e.target.value as Language)}
            >
              <option value="en">EN</option>
              <option value="ar">العربية</option>
              <option value="bn">বাংলা</option>
            </select>
          </div>
          <button
            className="motion-button"
            aria-label={motion ? t('motionOn') : t('motionOff')}
            title={motion ? t('motionOn') : t('motionOff')}
            onClick={() => setMotion(!motion)}
          >
            <Icon name={motion ? 'pause' : 'play'} size={16} />
          </button>
          <a className="about-link" href="/about">
            {t('about')} <Icon name="arrow" size={16} />
          </a>
        </nav>
      </header>
      {error ? (
        <main className="document">
          <h1>{t('error')}</h1>
          <p>{error}</p>
          <button className="primary" onClick={() => location.reload()}>
            {t('retry')}
          </button>
        </main>
      ) : path === '/about' ? (
        <About />
      ) : path === '/list' ? (
        <List
          characters={manifest?.characters.filter((c) => c.interactive) ?? []}
        />
      ) : path === '/lab' && import.meta.env.DEV ? (
        <Lab />
      ) : (
        <World manifest={manifest} />
      )}
    </div>
  );
}
function About() {
  const t = useT();
  return (
    <main className="document about-page">
      <a className="back-link" href="/">
        ← {t('back')}
      </a>
      <div className="eyebrow">{t('title')}</div>
      <h1>{t('aboutTitle')}</h1>
      <p className="lede">{t('aboutText')}</p>
      <div className="about-illustration">
        <Icon name="leaf" size={60} />
        <span>{t('tagline')}</span>
        <Icon name="book" size={60} />
      </div>
      <h2>{t('rulesTitle')}</h2>
      <ol className="rules-list">
        {(
          [
            'rule1',
            'rule2',
            'rule3',
            'rule4',
            'rule5',
            'rule6',
            'rule7',
          ] as const
        ).map((key, i) => (
          <li key={key}>
            <span>0{i + 1}</span>
            <p>{t(key)}</p>
          </li>
        ))}
      </ol>
      <p className="research-note">{t('research')}</p>
      <a className="primary" href="/list">
        {t('list')}
        <Icon name="arrow" />
      </a>
      {import.meta.env.DEV && (
        <div className="dev-links">
          <p className="eyebrow">{t('dev')}</p>
          <a href="/lab">{t('lab')} ↗</a>
          <a href="/world/review/characters.html">{t('review')} ↗</a>
          <span>{t('inspector')}</span>
        </div>
      )}
    </main>
  );
}
function List({ characters }: { characters: BakedCharacter[] }) {
  const t = useT(),
    lang = useStore((s) => s.lang);
  return (
    <main className="document">
      <a className="back-link" href="/">
        ← {t('back')}
      </a>
      <div className="eyebrow">{t('chapter')}</div>
      <h1>{t('listTitle')}</h1>
      <p className="lede">{t('listText')}</p>
      <div className="people-list">
        {characters.map((c, i) => (
          <a key={c.id} href={'/c/' + c.id}>
            <span className="person-number">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <span className="draft-badge">{t('draft')}</span>
              <h2>{c.name?.[lang] ?? c.name?.en}</h2>
              <p>
                {c.years} · {c.place}
              </p>
              <p>{c.summary?.[lang] ?? c.summary?.en ?? c.bio?.en}</p>
            </div>
            <Icon name="arrow" />
          </a>
        ))}
      </div>
    </main>
  );
}
function matches(query: string, value: string) {
  const q = query.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, ''),
    v = value.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '');
  let pos = 0;
  for (const letter of q) {
    pos = v.indexOf(letter, pos);
    if (pos === -1) return false;
    pos++;
  }
  return true;
}
function World({ manifest }: { manifest: Manifest | null }) {
  const t = useT(),
    lang = useStore((s) => s.lang),
    selected = useStore((s) => s.selected),
    select = useStore((s) => s.select),
    motion = useStore((s) => s.motion),
    camera = useStore((s) => s.camera),
    setCamera = useStore((s) => s.setCamera);
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Engine | null>(null),
    search = useRef<HTMLInputElement>(null),
    urlTimer = useRef<ReturnType<typeof setTimeout>>();
  const [progress, setProgress] = useState(0),
    [error, setError] = useState(''),
    [intro, setIntro] = useState(false),
    [query, setQuery] = useState(''),
    [focused, setFocused] = useState(false),
    [stats, setStats] = useState<{
      fps: number;
      draws: number;
      frame: number;
      visible: number;
    } | null>(null),
    [inspect, setInspect] = useState<Record<string, string | number> | null>(
      null,
    ),
    [hovered, setHovered] = useState<string | null>(null),
    // Kept out of React state: updating it on every pointer move would
    // re-render the whole page while dragging (slow on phones).
    pointer = useRef({ x: 0, y: 0 }),
    label = useRef<HTMLDivElement>(null);
  const named = manifest?.characters.filter((c) => c.interactive) ?? [],
    card = named.find((c) => c.id === selected);
  // Hovering anyone shows what they are doing; named people invite a click.
  const hoverCharacter = hovered
    ? manifest?.characters.find((c) => c.id === hovered)
    : undefined;
  const hoverLabel = hoverCharacter
    ? hoverCharacter.name
      ? {
          title: hoverCharacter.name[lang] ?? hoverCharacter.name.en,
          note: t('clickStory'),
        }
      : hoverCharacter.role
        ? { title: hoverCharacter.role, note: '' }
        : null
    : null;
  const open = useCallback(
    (id: string) => {
      select(id);
      engine.current?.focusCharacter(id);
      setIntro(false);
      setFocused(false);
      setQuery('');
      history.pushState(
        null,
        '',
        serialiseUrl(engine.current?.getCamera() ?? camera, id),
      );
    },
    [select, camera],
  );
  useEffect(() => {
    if (!host.current) return;
    let cancelled = false;
    let initialising = true;
    const initial = parseUrl(location.href);
    select(initial.id ?? null);
    const world = new Engine(host.current);
    engine.current = world;
    world.on('progress', (p) => setProgress(p));
    world.on('characterClick', (id) => {
      select(id);
      setIntro(false);
      history.pushState(null, '', serialiseUrl(world.getCamera(), id));
    });
    world.on('cameraChange', (c) => {
      setCamera(c);
      if (initialising) return;
      clearTimeout(urlTimer.current);
      urlTimer.current = setTimeout(() => {
        if (!cancelled)
          history.replaceState(
            null,
            '',
            serialiseUrl(c, useStore.getState().selected ?? undefined),
          );
      }, 300);
    });
    world.on('stats', setStats);
    world.on('characterHover', setHovered);
    world.on('inspect', setInspect);
    world.on('error', setError);
    world
      .load('/world/world.json')
      .then(() => {
        if (cancelled) return;
        initialising = false;
        world.setMotion(useStore.getState().motion);
        if (initial.id) {
          select(initial.id);
          world.focusCharacter(initial.id);
        } else
          world.flyTo(
            {
              ...initial,
              // Phones open on the whole planet unless the link sets a zoom.
              zoom:
                !initial.hasZoom &&
                Math.min(window.innerWidth, window.innerHeight) < PHONE_WIDTH
                  ? PHONE_ZOOM
                  : initial.zoom,
            },
            1,
          );
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    const pop = () => {
      const next = parseUrl(location.href);
      select(next.id ?? null);
      if (next.id) world.focusCharacter(next.id);
      else {
        world.clearSelection();
        world.flyTo(next, 300);
      }
    };
    window.addEventListener('popstate', pop);
    const keyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        search.current?.focus();
      }
      if (e.key === 'Escape') {
        setFocused(false);
        select(null);
        world.clearSelection();
      }
    };
    window.addEventListener('keydown', keyboard);
    // iOS Safari: stop pinches over the interface from zooming the whole page;
    // pinching the planet zooms the planet instead.
    const noPageZoom = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', noPageZoom);
    return () => {
      cancelled = true;
      clearTimeout(urlTimer.current);
      world.destroy();
      window.removeEventListener('popstate', pop);
      window.removeEventListener('keydown', keyboard);
      document.removeEventListener('gesturestart', noPageZoom);
    };
  }, [select, setCamera]);
  useEffect(() => {
    engine.current?.setMotion(motion);
  }, [motion]);
  const results = named.filter((c) =>
    matches(query, [...Object.values(c.name ?? {}), ...c.aliases].join(' ')),
  );
  const close = () => {
    select(null);
    engine.current?.clearSelection();
    history.replaceState(null, '', serialiseUrl(camera));
  };
  const focusArea = (x: number, y: number) => {
    const [wx, wy] = worldFromTile(x, y);
    setIntro(false);
    engine.current?.flyTo({ x: wx, y: wy, zoom: 2 }, 600);
  };
  return (
    <main className="world-page">
      <div
        className="world-host"
        ref={host}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
          if (label.current) {
            label.current.style.left = pointer.current.x + 14 + 'px';
            label.current.style.top = pointer.current.y + 14 + 'px';
          }
        }}
      />
      {hoverLabel && (
        <div
          className="hover-label"
          role="tooltip"
          ref={label}
          style={{ left: pointer.current.x + 14, top: pointer.current.y + 14 }}
        >
          <strong>{hoverLabel.title}</strong>
          {hoverLabel.note && <span>{hoverLabel.note}</span>}
        </div>
      )}
      <div className="scene-vignette" />
      <div className="world-top">
        <div className="chapter-pill">
          <span>01</span>
          {t('room')}
        </div>
        <div className="search-wrap">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              ref={search}
              aria-label={t('search')}
              placeholder={t('search')}
              value={query}
              onFocus={() => setFocused(true)}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) open(results[0].id);
              }}
            />
            <kbd>⌘ K</kbd>
            {focused && (
              <button aria-label={t('close')} onClick={() => setFocused(false)}>
                <Icon name="close" size={15} />
              </button>
            )}
          </div>
          {focused && (
            <div className="search-results">
              <p className="eyebrow">{t('results')}</p>
              {results.map((c) => (
                <button key={c.id} onClick={() => open(c.id)}>
                  <div>
                    <strong>{c.name?.[lang] ?? c.name?.en}</strong>
                    <small>
                      {c.place} · {c.years}
                    </small>
                  </div>
                  <Icon name="arrow" size={17} />
                </button>
              ))}
              {!results.length && <p>{t('noResults')}</p>}
              <p className="search-hint">{t('hint')}</p>
              <a href="/list">{t('list')} ↗</a>
            </div>
          )}
        </div>
        <div className="live-badge">
          <span className={motion ? 'live-dot' : 'paused-dot'} />
          {motion ? t('live') : t('paused')}
        </div>
      </div>
      {intro && !selected && (
        <section className="intro-card">
          <button
            className="intro-dismiss"
            aria-label={t('dismiss')}
            onClick={() => setIntro(false)}
          >
            <Icon name="close" size={15} />
          </button>
          <p className="eyebrow">
            <span className="tiny-rule" />
            {t('chapter')}
          </p>
          <h1>
            {t('introTitle')
              .split('\n')
              .map((line, i) => (
                <span key={line} className={i === 1 ? 'italic' : ''}>
                  {line}
                </span>
              ))}
          </h1>
          <p className="intro-copy">{t('introText')}</p>
          <button
            className="primary"
            onClick={() => {
              setIntro(false);
              engine.current?.flyTo({ x: 2048, y: 1972, zoom: 1.5 }, 600);
            }}
          >
            {t('explore')}
            <Icon name="arrow" size={18} />
          </button>
          <div className="intro-footer">
            <span className="mini-pixels">▦</span>
            {t('introNote')}
          </div>
        </section>
      )}
      <div className="district-tabs">
        <button onClick={() => focusArea(16, 20)}>
          <Icon name="book" size={15} />
          {t('knowledge')}
        </button>
        <button onClick={() => focusArea(39, 27)}>
          <Icon name="leaf" size={15} />
          {t('hospitality')}
        </button>
        <button onClick={() => focusArea(40, 42)}>
          <Icon name="people" size={15} />
          {t('community')}
        </button>
      </div>
      {card && (
        <aside className="story-card" aria-label={card.name?.[lang]}>
          <button
            className="card-close"
            onClick={close}
            aria-label={t('close')}
          >
            <Icon name="close" />
          </button>
          <div className="story-header">
            <span className="eyebrow">
              {t('chapter')} ·{' '}
              {String(named.indexOf(card) + 1).padStart(2, '0')}
            </span>
            <div className="portrait-decoration">
              {card.portrait ? (
                <img
                  className="portrait-face"
                  src={'/world/' + card.portrait}
                  alt=""
                  draggable={false}
                />
              ) : (
                <Icon name="book" size={32} />
              )}
              <span>{card.name?.ar}</span>
            </div>
            <span className="draft-badge">{t('draft')}</span>
            <h2>{card.name?.[lang] ?? card.name?.en}</h2>
            {lang !== 'ar' && (
              <p className="arabic-name" lang="ar" dir="rtl">
                {card.name?.ar}
              </p>
            )}
            <p className="person-meta">
              {card.years}
              <span>•</span>
              {card.place}
            </p>
          </div>
          <div className="story-body">
            {card.summary && (
              <>
                <h3>{t('quickFacts')}</h3>
                <p>{card.summary[lang] ?? card.summary.en}</p>
                <p className="summary-note">{t('summaryNote')}</p>
              </>
            )}
            {!!card.links?.length && (
              <div className="learn-links">
                {card.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('learnMore')} · {l.label} ↗
                  </a>
                ))}
              </div>
            )}
            <p className="research-note">{t('research')}</p>
            <h3>{t('story')}</h3>
            {[card.bio, card.story]
              .map((v) => v?.[lang] ?? v?.en)
              .filter((v, i, all) => v && all.indexOf(v) === i)
              .map((v) => (
                <p key={v}>{v}</p>
              ))}
            <h3>{t('sources')}</h3>
            <ol>
              {card.sources?.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ol>
            <a
              className="report-link"
              href={`mailto:review@example.invalid?subject=${encodeURIComponent('Dar al-Salam: ' + card.id)}`}
            >
              {t('report')} ↗
            </a>
          </div>
        </aside>
      )}
      <div className="world-bottom">
        <div className="explore-hint">
          <Icon name="compass" size={22} />
          <span>
            {t('drag')}
            <i /> {t('scroll')}
          </span>
          <button onClick={() => setIntro(!intro)} aria-label={t('showIntro')}>
            <Icon name="info" size={16} />
          </button>
        </div>
        <div className="zoom-controls">
          <button
            aria-label={t('zoomOut')}
            onClick={() =>
              engine.current?.setZoom(
                camera.zoom > 1
                  ? Math.ceil(camera.zoom) - 1
                  : camera.zoom * 0.8,
              )
            }
          >
            <Icon name="minus" size={18} />
          </button>
          <span>
            {Math.round(camera.zoom * 100)}
            <small>%</small>
          </span>
          <button
            aria-label={t('zoomIn')}
            onClick={() =>
              engine.current?.setZoom(
                camera.zoom >= 1
                  ? Math.floor(camera.zoom) + 1
                  : Math.min(1, camera.zoom / 0.8),
              )
            }
          >
            <Icon name="plus" size={18} />
          </button>
          <span className="control-divider" />
          <button
            aria-label={t('overview')}
            title={t('overview')}
            onClick={() => engine.current?.overview()}
          >
            <Icon name="globe" size={17} />
          </button>
          <button
            aria-label={t('reset')}
            onClick={() => {
              close();
              engine.current?.flyTo({ x: 2048, y: 1930, zoom: 2 }, 600);
            }}
          >
            <Icon name="home" size={17} />
          </button>
        </div>
        <div className="minimap-card">
          <div className="minimap-title">
            <span>{t('map')}</span>
            <Icon name="compass" size={14} />
          </div>
          {manifest && (
            <Minimap
              manifest={manifest}
              camera={camera}
              onMove={(c) => engine.current?.flyTo(c, 150)}
            />
          )}
          <div className="minimap-caption">
            <span className="map-dot" />
            {t('room')}
            <small>01 / 01</small>
          </div>
        </div>
      </div>
      <div className="build-label">{t('buildLabel')}</div>
      {inspect && (
        <aside className="inspector-panel">
          <h3>{t('inspector')}</h3>
          {Object.entries(inspect).map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              <code>{v}</code>
            </div>
          ))}
          {stats && (
            <p>
              {stats.fps} fps · {stats.visible} visible · {stats.draws} draw
              calls
            </p>
          )}
          <a href="/lab">{t('lab')} ↗</a>
        </aside>
      )}
      {progress < 1 && !error && (
        <div className="loading-screen" role="status">
          <span className="loading-leaf">
            <Icon name="leaf" size={38} />
          </span>
          <p className="eyebrow">{t('title')}</p>
          <h2>{t('loading')}</h2>
          <p>{t('loadingNote')}</p>
          <div className="progress-track">
            <div style={{ width: `${progress * 100}%` }} />
          </div>
          <small>{Math.round(progress * 100)}%</small>
        </div>
      )}
      {error && (
        <div className="world-error" role="alert">
          <h2>{t('error')}</h2>
          <p>{error}</p>
          <button className="primary" onClick={() => location.reload()}>
            {t('retry')}
          </button>
        </div>
      )}
    </main>
  );
}
function Minimap({
  manifest,
  camera,
  onMove,
}: {
  manifest: Manifest;
  camera: Camera;
  onMove: (c: Camera) => void;
}) {
  const t = useT(),
    ref = useRef<HTMLDivElement>(null);
  const { width: rw, height: rh } = manifest.room;
  // The map is the quarter's floor in tile space; the dot is the camera focus.
  const move = (e: React.PointerEvent) => {
    const box = ref.current!.querySelector('img')!.getBoundingClientRect();
    const tx = ((e.clientX - box.left) / box.width) * rw,
      ty = ((e.clientY - box.top) / box.height) * rh;
    const [x, y] = worldFromTile(tx, ty);
    onMove({ ...camera, x, y });
  };
  const [fx, fy] = tileFromWorld(camera.x, camera.y);
  const inside = fx >= 0 && fy >= 0 && fx <= rw && fy <= rh;
  return (
    <div
      className="minimap"
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={t('viewMap')}
      aria-valuemin={0}
      aria-valuemax={rw}
      aria-valuenow={Math.round(fx)}
      onKeyDown={(e) => {
        const shifts: Record<string, [number, number]> = {
          ArrowLeft: [-3, 3],
          ArrowRight: [3, -3],
          ArrowUp: [-3, -3],
          ArrowDown: [3, 3],
        };
        const d = shifts[e.key];
        if (d) {
          e.preventDefault();
          const [x, y] = worldFromTile(fx + d[0], fy + d[1]);
          onMove({ ...camera, x, y });
        }
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) move(e);
      }}
    >
      <img src={'/world/' + manifest.ground.url} alt="" draggable={false} />
      {inside && (
        <svg
          className="minimap-overlay"
          viewBox={`0 0 ${rw} ${rh}`}
          aria-hidden="true"
        >
          <circle
            cx={fx}
            cy={fy}
            r={6}
            fill="#8ca37b33"
            stroke="#2f4a3a"
            strokeWidth={0.8}
          />
          <circle cx={fx} cy={fy} r={1.2} fill="#2f4a3a" />
        </svg>
      )}
      <span className="minimap-north">N</span>
    </div>
  );
}
