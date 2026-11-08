import kawaii from './kawaii.js';
import manifest from './manifest.js';
import messenger from './messenger.js';
import coquette from './coquette.js';

export const THEMES = { kawaii, manifest, messenger, coquette };
export const THEME_LIST = Object.values(THEMES);
export const DEFAULT_THEME = 'kawaii';
export const getTheme = id => THEMES[id] || THEMES[DEFAULT_THEME];

/** muat font tema sekali saja */
const loaded = new Set();
export function loadFont(t) {
  if (!t.font || loaded.has(t.id)) return; loaded.add(t.id);
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = t.font; document.head.append(l);
}
