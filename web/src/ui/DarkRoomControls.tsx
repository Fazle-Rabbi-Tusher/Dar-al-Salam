import { useEffect, useRef, useState } from 'react';
import {
  DARK_ROOM_DEFAULTS,
  type DarkRoomExperiment,
  type DarkRoomOptions,
  type DarkRoomView,
} from '../../../packages/shared/dark-room';
import { Icon } from './Icon';
import { useT } from './store';

type Props = {
  onClose(): void;
  onView(view: DarkRoomView): void;
  onChange(options: Partial<DarkRoomOptions>): void;
  onClock(running: boolean): void;
  onExperiment(options: DarkRoomExperiment): void;
  getState(): { options: DarkRoomOptions; clockRunning: boolean } | undefined;
};
/** An ordinary part of the main world's UI. It never owns a canvas, captures
 * the viewport, makes the world inert or changes to an exhibit-only route. */
export function DarkRoomControls(props: Props) {
  const t = useT(),
    latest = useRef(props);
  latest.current = props;
  const initial = useRef(props.getState()),
    [options, setOptions] = useState(
      initial.current?.options ?? DARK_ROOM_DEFAULTS,
    ),
    [view, setView] = useState<DarkRoomView>('room'),
    [playing, setPlaying] = useState(initial.current?.clockRunning ?? false),
    [experiment, setExperiment] = useState<DarkRoomExperiment>({
      kind: 'none',
    }),
    pending = useRef<Partial<DarkRoomOptions>>({}),
    timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (Object.keys(pending.current).length)
        latest.current.onChange(pending.current);
    },
    [],
  );
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const state = latest.current.getState();
      if (state) setOptions(state.options);
    }, 200);
    return () => clearInterval(interval);
  }, [playing]);
  const change = (patch: Partial<DarkRoomOptions>) => {
    setOptions((o) => ({ ...o, ...patch }));
    Object.assign(pending.current, patch);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      latest.current.onChange(pending.current);
      pending.current = {};
    }, 120);
  };
  const flush = () => {
    clearTimeout(timer.current);
    if (Object.keys(pending.current).length) props.onChange(pending.current);
    pending.current = {};
  };
  const focus = (next: DarkRoomView) => {
    if (!['mirrors', 'tubes', 'astronomy'].includes(next))
      setExperiment({ kind: 'none' });
    setView(next);
    props.onView(next);
  };
  const demo = (patch: DarkRoomExperiment) => {
    setExperiment(patch);
    props.onExperiment(patch);
  };
  return (
    <aside className="dark-room-controls" aria-label={t('darkRoomTitle')}>
      <header>
        <div>
          <span>{t('darkRoomInWorld')}</span>
          <h2>{t('darkRoomTitle')}</h2>
        </div>
        <button
          className="dark-room-controls-close"
          aria-label={t('closeDarkRoomControls')}
          onClick={props.onClose}
        >
          <Icon name="close" size={16} />
        </button>
      </header>
      <div
        className="dark-room-views"
        role="group"
        aria-label={t('darkRoomViews')}
      >
        {(['room', 'courtyard', 'site'] as const).map((key, i) => (
          <button
            key={key}
            aria-pressed={view === key}
            onClick={() => focus(key)}
          >
            {t(
              (['darkRoomChamber', 'darkRoomCourt', 'darkRoomSite'] as const)[
                i
              ],
            )}
          </button>
        ))}
      </div>
      <label className="dark-room-station">
        {t('darkRoomStation')}
        <select
          value={view}
          onChange={(e) => {
            const next = e.target.value as DarkRoomView;
            focus(next);
            if (next === 'mirrors')
              demo({ kind: 'mirror', mirrorId: 'mirror-plane', angle: 15 });
            else if (next === 'tubes') demo({ kind: 'tube', tubeAngle: 22 });
            else if (next === 'astronomy')
              demo({ kind: 'astronomy', altitude: 34.2, sunAltitude: 60 });
            else demo({ kind: 'none' });
          }}
        >
          {(
            [
              'room',
              'courtyard',
              'site',
              'aperture',
              'screen',
              'bench',
              'lectern',
              'mirrors',
              'tubes',
              'astronomy',
              'waterclock',
            ] as const
          ).map((key, i) => (
            <option key={key} value={key}>
              {t(
                (
                  [
                    'darkRoomChamber',
                    'darkRoomCourt',
                    'darkRoomSite',
                    'darkRoomAperture',
                    'darkRoomScreen',
                    'darkRoomBench',
                    'darkRoomLectern',
                    'darkRoomMirrors',
                    'darkRoomTubes',
                    'darkRoomAstronomy',
                    'darkRoomClock',
                  ] as const
                )[i],
              )}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>{t('darkRoomOptics')}</summary>
        {(['aperture', 'screenDistance', 'exposure'] as const).map((key, i) => (
          <label className="dark-room-range" key={key}>
            <span>
              {t(
                (
                  [
                    'darkRoomAperture',
                    'darkRoomScreenDistance',
                    'darkRoomExposure',
                  ] as const
                )[i],
              )}
              <output>{Math.round(options[key] * 100)}%</output>
            </span>
            <input
              type="range"
              aria-label={t(
                (
                  [
                    'darkRoomAperture',
                    'darkRoomScreenDistance',
                    'darkRoomExposure',
                  ] as const
                )[i],
              )}
              min="0"
              max="100"
              value={Math.round(options[key] * 100)}
              onChange={(e) => change({ [key]: Number(e.target.value) / 100 })}
            />
          </label>
        ))}
        <div className="dark-room-toggles">
          {(['cutaway', 'sunlight', 'rays'] as const).map((key, i) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => change({ [key]: e.target.checked })}
              />
              {t(
                (
                  [
                    'darkRoomCutaway',
                    'darkRoomSunlight',
                    'darkRoomRays',
                  ] as const
                )[i],
              )}
            </label>
          ))}
        </div>
      </details>
      {experiment.kind === 'mirror' && (
        <div className="dark-room-experiment">
          <label>
            {t('darkRoomMirrors')}
            <select
              value={experiment.mirrorId}
              onChange={(e) =>
                demo({ ...experiment, mirrorId: e.target.value })
              }
            >
              {[
                'plane',
                'spherical-convex',
                'spherical-concave',
                'cylindrical-convex',
                'cylindrical-concave',
                'conical-convex',
                'conical-concave',
              ].map((id, i) => (
                <option key={id} value={'mirror-' + id}>
                  {t(
                    (
                      [
                        'mirrorPlane',
                        'mirrorSphereConvex',
                        'mirrorSphereConcave',
                        'mirrorCylinderConvex',
                        'mirrorCylinderConcave',
                        'mirrorConeConvex',
                        'mirrorConeConcave',
                      ] as const
                    )[i],
                  )}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('darkRoomBeamAngle')}
            <input
              type="range"
              min="-25"
              max="25"
              value={experiment.angle ?? 15}
              onChange={(e) =>
                demo({ ...experiment, angle: Number(e.target.value) })
              }
            />
          </label>
        </div>
      )}
      {experiment.kind === 'tube' && (
        <label className="dark-room-range">
          {t('darkRoomTubeAngle')}
          <input
            type="range"
            min="8"
            max="36"
            value={experiment.tubeAngle ?? 22}
            onChange={(e) =>
              demo({ ...experiment, tubeAngle: Number(e.target.value) })
            }
          />
        </label>
      )}
      {experiment.kind === 'astronomy' && (
        <div className="dark-room-experiment">
          <label>
            {t('darkRoomAltitude')}
            <input
              type="range"
              aria-label={t('darkRoomClock')}
              min="0"
              max="90"
              value={experiment.altitude ?? 34.2}
              onChange={(e) =>
                demo({ ...experiment, altitude: Number(e.target.value) })
              }
            />
          </label>
          <label>
            {t('darkRoomSunAngle')}
            <input
              type="range"
              min="40"
              max="80"
              value={experiment.sunAltitude ?? 60}
              onChange={(e) =>
                demo({ ...experiment, sunAltitude: Number(e.target.value) })
              }
            />
          </label>
        </div>
      )}
      {view === 'waterclock' && (
        <div className="dark-room-clock">
          <label className="dark-room-range">
            <span>
              {t('darkRoomClock')}
              <output>{options.clockHour.toFixed(1)} / 24 h</output>
            </span>
            <input
              type="range"
              min="0"
              max="24"
              step=".1"
              value={options.clockHour}
              onChange={(e) => {
                setPlaying(false);
                props.onClock(false);
                change({ clockHour: Number(e.target.value) });
              }}
            />
          </label>
          <button
            aria-pressed={playing}
            onClick={() => {
              flush();
              const next = !playing;
              setPlaying(next);
              props.onClock(next);
            }}
          >
            {t(playing ? 'pauseClock' : 'runClock')}
          </button>
        </div>
      )}
      <a
        className="dark-room-source-download"
        href="/exhibits/al-bayt-al-muzlim/assets/al-bayt-al-muzlim-collection.zip"
        download
      >
        {t('downloadDarkRoom')} <Icon name="arrow" size={12} />
      </a>
    </aside>
  );
}
