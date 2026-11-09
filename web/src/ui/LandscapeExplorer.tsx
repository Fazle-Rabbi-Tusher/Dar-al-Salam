import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  arc,
  landField,
  mapDistance,
  PLANET,
  wildPlantings,
} from '../../../packages/shared/planet';
import type { Point } from '../../../packages/shared/iso';
import {
  DISTRICTS,
  type DistrictMood,
} from '../../../packages/shared/districts';
import { composeForest, forestGroveAt } from '../../../tools/landscape/forest';
import { Icon } from './Icon';
import { useStore } from './store';

const copy = {
  en: {
    title: 'Explore landscapes',
    note: 'A little further, a different world.',
    forest: 'Ancient woods',
    waterfall: 'Mossy falls',
    coast: 'Coastal harbor',
    village: 'Woodland village',
    'night-city': 'Night skyline',
    'rain-street': 'Rainy tram street',
    blossom: 'Blossom lane',
  },
  ar: {
    title: 'استكشف المناظر الطبيعية',
    note: 'عالَم آخر على بُعد خطوات.',
    forest: 'الغابة العتيقة',
    waterfall: 'الشلالات الخضراء',
    coast: 'الميناء الساحلي',
    village: 'قرية الغابة',
    'night-city': 'أفق المدينة ليلاً',
    'rain-street': 'شارع الترام الماطر',
    blossom: 'درب الأزهار',
  },
  bn: {
    title: 'প্রকৃতি ঘুরে দেখুন',
    note: 'একটু দূরেই অন্য এক পৃথিবী।',
    forest: 'প্রাচীন বন',
    waterfall: 'সবুজ ঝরনা',
    coast: 'সমুদ্রবন্দর',
    village: 'বনের গ্রাম',
    'night-city': 'রাতের নগরী',
    'rain-street': 'বৃষ্টিভেজা ট্রামের রাস্তা',
    blossom: 'ফুলের গলি',
  },
};

export function landscapeLabel(id: string, lang: keyof typeof copy) {
  const labels = copy[lang] ?? copy.en;
  return id in labels ? labels[id as keyof typeof labels] : undefined;
}

export function LandscapeExplorer({
  onVisit,
}: {
  onVisit: (tile: Point, zoom?: number) => void;
}) {
  const lang = useStore((s) => s.lang),
    text = copy[lang] ?? copy.en,
    [expanded, setExpanded] = useState(false),
    panelId = useId(),
    host = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const destinations = useMemo(() => {
    // Use the same deterministic placements as the asset build, so a route
    // always arrives at scenery rather than at an approximate biome centre.
    const plants = wildPlantings().sort(
      (a, b) => mapDistance(a.tile) - mapDistance(b.tile),
    );
    // Mature stands are spaced by the composition pass. A raw biome sample
    // can be suppressed or replaced by a small edge tree, so route to an
    // actual old-growth cluster well clear of the character quarter and coast.
    const mature = composeForest(plants).filter(
      (p) =>
        p.kind === 'forest-tree' &&
        ['land-forest-stand', 'land-pine', 'land-oak'].includes(p.art ?? ''),
    );
    const grove = mature
      .filter(
        (p) =>
          mapDistance(p.tile) >= 24 &&
          Math.abs(p.p[1]) < 0.8 &&
          landField(p.p, p.tile) > 20,
      )
      .map((p) => ({
        p,
        neighbours: mature.filter(
          (q) => arc(p.p, q.p) * PLANET.radiusTiles < 22,
        ).length,
      }))
      .sort(
        (a, b) =>
          b.neighbours - a.neighbours ||
          forestGroveAt(b.p.p) - forestGroveAt(a.p.p) ||
          mapDistance(a.p.tile) - mapDistance(b.p.tile),
      )[0]?.p;
    const point = (
      kind: 'forest-tree' | 'waterfall' | 'palm',
      fallback: Point,
    ) => plants.find((p) => p.kind === kind)?.tile ?? fallback;
    const district = (id: Exclude<DistrictMood, 'day'>) => {
      const value = DISTRICTS.find((entry) => entry.id === id);
      if (!value) throw Error(`Unknown landscape district: ${id}`);
      return { tile: value.centre, zoom: value.zoom };
    };
    return [
      { id: 'night-city', icon: 'globe', ...district('night-city') },
      { id: 'rain-street', icon: 'compass', ...district('rain-street') },
      { id: 'blossom', icon: 'leaf', ...district('blossom') },
      {
        id: 'forest',
        icon: 'leaf',
        tile: grove?.tile ?? ([86.4372, -33.3737] as Point),
        zoom: 2,
      },
      {
        id: 'waterfall',
        icon: 'compass',
        tile: point('waterfall', [-7, 32]),
        zoom: undefined,
      },
      {
        id: 'coast',
        icon: 'globe',
        ...district('coast'),
      },
      { id: 'village', icon: 'home', tile: [28, -7] as Point, zoom: 2.2 },
    ] as const;
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!host.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [expanded]);
  return (
    <div
      className="landscape-explorer"
      ref={host}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          setExpanded(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        className="landscape-trigger"
        ref={trigger}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(!expanded)}
      >
        <Icon name="compass" size={17} />
        <span>{text.title}</span>
        <Icon name="chevron" size={14} />
      </button>
      {expanded && (
        <nav className="landscape-menu" id={panelId} aria-label={text.title}>
          <p>{text.note}</p>
          {destinations.map((place, i) => (
            <button
              key={place.id}
              onClick={() => {
                onVisit(place.tile, place.zoom);
                setExpanded(false);
                trigger.current?.focus();
              }}
            >
              <span className={`landscape-medallion landscape-${place.id}`}>
                <Icon name={place.icon} size={19} />
              </span>
              <span>{text[place.id]}</span>
              <small>0{i + 1}</small>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
