import { useEffect, useRef } from 'react';
import { useT } from './store';

export function CharacterStudy({ onClose }: { onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    t = useT();
  useEffect(() => {
    const element = dialog.current!,
      previous = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="character-study"
      aria-labelledby="character-study-title"
      onCancel={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.stopPropagation();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="character-study-inner">
        <header>
          <span className="character-study-eyebrow">{t('characterStudy')}</span>
          <button onClick={onClose} aria-label={t('closeCharacterStudy')}>
            ×
          </button>
        </header>
        <h2 id="character-study-title">{t('mansaStudyTitle')}</h2>
        <figure>
          <img
            src="/models/mali-caravan/character-study.png"
            alt={t('mansaStudyAlt')}
            width={1536}
            height={1024}
          />
          <figcaption>{t('characterStudyReference')}</figcaption>
        </figure>
        <a
          className="character-study-model"
          href="/models/mali-caravan/index.html"
        >
          {t('exploreCharacterModel')} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </dialog>
  );
}
