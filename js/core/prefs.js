// Personalisasi per-orang: warna aksen, font, latar. Disimpan di profiles.prefs (bukan hanya localStorage).
import { S } from './db.js';

export const FONTS = { default: 'Bawaan tema', rounded: 'Bulat manis', serif: 'Serif romantis', mono: 'Mesin tik' };
const STACK = { rounded: '"Quicksand","Nunito",system-ui,sans-serif', serif: '"Cormorant Garamond",Georgia,serif', mono: '"VT323","Courier New",monospace' };
export const BGS = { default: 'Bawaan tema', dots: 'Titik-titik', hearts: 'Hati', stars: 'Bintang', plain: 'Polos' };

export function applyPrefs() {
  const p = S.profile?.prefs || {}, r = document.documentElement.style;
  p.accent ? r.setProperty('--accent-user', p.accent) : r.removeProperty('--accent-user');
  p.font && STACK[p.font] ? r.setProperty('--font-user', STACK[p.font]) : r.removeProperty('--font-user');
  document.body.dataset.bg = p.bg || 'default';
}
