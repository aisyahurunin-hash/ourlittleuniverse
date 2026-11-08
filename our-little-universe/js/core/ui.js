// Komponen UI kecil yang dipakai semua fitur; tampilannya ditentukan CSS tiap tema.
import { h } from './util.js';
import { mediaImg } from './db.js';

export const pageHead = (title, sub, actions) =>
  h('header.page-head', {}, h('div.ph-text', {}, h('h2', {}, title), sub ? h('p.sub', {}, sub) : null), actions ? h('div.actions', {}, actions) : null);

export const card = (title, ...body) => h('section.card', {}, title ? h('h3.card-title', {}, title) : null, h('div.card-body', {}, body));
export const empty = (emoji, text, action) => h('div.empty', {}, h('div.big', {}, emoji), h('p', {}, text), action || null);
export const chip = (label, active, onclick) => h('button.chip' + (active ? '.on' : ''), { type: 'button', onclick }, label);
export const tabs = (items, current, onPick) => h('div.tabs', { role: 'tablist' }, items.map(([id, label]) => h('button.tab' + (id === current ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': id === current, onclick: () => onPick(id) }, label)));
/** Skeleton shimmer: pengganti spinner. Bentuknya meniru kartu/judul/baris yang akan muncul. */
export const skeleton = (lines = 3, cards = 3) => h('div.skeleton-wrap', { 'aria-busy': 'true', 'aria-label': 'Memuat' },
  h('div.sk.sk-title'), Array.from({ length: lines }, (_, i) => h('div.sk.sk-line' + (i === lines - 1 ? '.short' : ''))),
  cards ? h('div.sk-row', {}, Array.from({ length: cards }, () => h('div.sk.sk-card'))) : null);
export const spinner = (t) => h('div.loading', {}, skeleton(), t ? h('small.sk-caption', {}, t) : null);
export const photo = (path, cls = '', alt = '') => h('div.photo' + (cls ? '.' + cls : ''), {}, mediaImg(path, { alt }));
export const btn = (label, onclick, cls = '') => h('button.btn' + (cls ? '.' + cls : ''), { type: 'button', onclick }, label);
