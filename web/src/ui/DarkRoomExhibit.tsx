import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useT } from './store';

const EXHIBIT_PATH = '/exhibits/al-bayt-al-muzlim/';
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(root: Document | HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) =>
      element.tabIndex >= 0 &&
      element.getClientRects().length > 0 &&
      element.ownerDocument.defaultView?.getComputedStyle(element)
        .visibility !== 'hidden',
  );
}

/** The approved exhibit runs unchanged in its own document and renderer. */
export function DarkRoomExhibit({ onClose }: { onClose: () => void }) {
  const t = useT(),
    dialog = useRef<HTMLDialogElement>(null),
    frame = useRef<HTMLIFrameElement>(null),
    returnButton = useRef<HTMLButtonElement>(null),
    downloadLink = useRef<HTMLAnchorElement>(null),
    close = useRef(onClose),
    detachFrame = useRef<(() => void) | null>(null),
    [loaded, setLoaded] = useState(false);
  close.current = onClose;

  useLayoutEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    const opener = document.activeElement as HTMLElement | null,
      app = document.querySelector<HTMLElement>('.app'),
      wasInert = app?.inert ?? false,
      previousOverflow = document.body.style.overflow;
    if (app) app.inert = true;
    document.body.style.overflow = 'hidden';
    modal.showModal();
    returnButton.current?.focus({ preventScroll: true });
    return () => {
      detachFrame.current?.();
      detachFrame.current = null;
      if (modal.open) modal.close();
      if (app) app.inert = wasInert;
      document.body.style.overflow = previousOverflow;
      // The portal and iframe are removed on close, releasing their WebGL
      // renderer. Return to the actual opener without scrolling the world.
      const target =
        opener?.isConnected && opener !== document.body
          ? opener
          : document.querySelector<HTMLElement>('.dark-room-tab');
      target?.focus({ preventScroll: true });
    };
  }, []);

  const frameDocument = () => {
    try {
      return frame.current?.contentDocument ?? null;
    } catch {
      return null;
    }
  };

  const onFrameLoad = () => {
    detachFrame.current?.();
    detachFrame.current = null;
    const doc = frameDocument();
    if (!doc) return;
    setLoaded(true);
    // Enter the approved chamber through its own control, preserving the
    // source renderer, furniture, lighting and walking behavior unchanged.
    if (doc.querySelector('#loading.ready'))
      doc.querySelector<HTMLButtonElement>('[data-view="interior"]')?.click();

    const keyboard = (event: KeyboardEvent) => {
      // An exhibit-owned dialog or fullscreen view gets its own Escape first.
      if (doc.querySelector('dialog[open]') || doc.fullscreenElement) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      } else if (event.key === 'Tab') {
        const elements = focusableElements(doc),
          active = doc.activeElement;
        if (event.shiftKey && active === elements[0]) {
          event.preventDefault();
          downloadLink.current?.focus();
        } else if (!event.shiftKey && active === elements.at(-1)) {
          event.preventDefault();
          returnButton.current?.focus();
        }
      }
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      // Use closest rather than instanceof: the target belongs to the
      // iframe's realm, not the parent window's Element constructor.
      const anchor = (
        event.target as Element | null
      )?.closest?.<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, doc.baseURI);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
      if (url.origin !== location.origin) {
        event.preventDefault();
        window.open(url.href, '_blank', 'noopener,noreferrer');
      } else if (
        !url.hash &&
        [
          '/',
          '/index.html',
          EXHIBIT_PATH,
          EXHIBIT_PATH + 'index.html',
        ].includes(url.pathname)
      ) {
        // Home links must not embed a second Dar al-Salam inside the frame.
        event.preventDefault();
        close.current();
      }
    };
    doc.addEventListener('keydown', keyboard, true);
    doc.addEventListener('click', navigate, true);
    detachFrame.current = () => {
      doc.removeEventListener('keydown', keyboard, true);
      doc.removeEventListener('click', navigate, true);
    };
  };

  return createPortal(
    <dialog
      ref={dialog}
      className="dark-room-exhibit"
      aria-labelledby="dark-room-exhibit-title"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close.current();
        } else if (event.key === 'Tab') {
          const doc = frameDocument(),
            innerDialog = doc?.querySelector<HTMLElement>('dialog[open]'),
            elements = doc ? focusableElements(innerDialog ?? doc) : [];
          if (event.shiftKey && event.target === returnButton.current) {
            event.preventDefault();
            (elements.at(-1) ?? downloadLink.current)?.focus();
          } else if (!event.shiftKey && event.target === downloadLink.current) {
            event.preventDefault();
            (elements[0] ?? returnButton.current)?.focus();
          }
        }
      }}
    >
      <header className="dark-room-exhibit-header">
        <button
          ref={returnButton}
          type="button"
          className="dark-room-return"
          onClick={() => close.current()}
        >
          <Icon name="arrow" size={18} />
          <span>{t('returnToDar')}</span>
        </button>
        <div className="dark-room-exhibit-title">
          <span>{t('title')}</span>
          <h1 id="dark-room-exhibit-title">{t('darkRoomTitle')}</h1>
        </div>
        <a
          ref={downloadLink}
          className="dark-room-download"
          href={EXHIBIT_PATH + 'assets/al-bayt-al-muzlim-collection.zip'}
          download
          aria-label={t('downloadDarkRoom')}
          title={t('downloadDarkRoom')}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
          </svg>
          <span>{t('downloadZip')}</span>
        </a>
      </header>
      <div className="dark-room-exhibit-content">
        {!loaded && (
          <p className="dark-room-exhibit-loading" role="status">
            {t('loadingDarkRoom')}
          </p>
        )}
        <iframe
          ref={frame}
          src={EXHIBIT_PATH + 'index.html'}
          title={t('darkRoomFrameTitle')}
          allow="fullscreen"
          allowFullScreen
          onLoad={onFrameLoad}
          aria-busy={!loaded}
        />
      </div>
    </dialog>,
    document.body,
  );
}
