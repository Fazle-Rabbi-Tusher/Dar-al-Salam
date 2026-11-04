import { create } from 'zustand';
import type { Camera } from '../../../packages/shared/url';
import en from '../../../content/i18n/en.json';
import ar from '../../../content/i18n/ar.json';
import bn from '../../../content/i18n/bn.json';
export type Language = 'en' | 'ar' | 'bn';
export const translations = { en, ar, bn };
type State = {
  lang: Language;
  motion: boolean;
  selected: string | null;
  camera: Camera;
  setLang: (lang: Language) => void;
  setMotion: (motion: boolean) => void;
  select: (selected: string | null) => void;
  setCamera: (camera: Camera) => void;
};
export const useStore = create<State>((set) => ({
  lang: (localStorage.getItem('dar-language') as Language) || 'en',
  motion: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  selected: null,
  camera: { x: 2048, y: 1950, zoom: 1 },
  setLang: (lang) => {
    localStorage.setItem('dar-language', lang);
    set({ lang });
  },
  setMotion: (motion) => set({ motion }),
  select: (selected) => set({ selected }),
  setCamera: (camera) => set({ camera }),
}));
export function useT() {
  const lang = useStore((s) => s.lang);
  return (key: keyof typeof en) => (translations[lang] ?? en)[key];
}
