// TEMA 4 — Pink Coquette: scrapbook/diary romantis. Sidebar pita + kartu kertas; di ponsel jadi bottom-nav + laci menu.
import { h, fmtDate } from '../core/util.js';
import { S } from '../core/db.js';
import { avatar, daysTogether } from '../core/widgets.js';
import { GROUPS } from '../core/nav.js';

export default {
  id: 'coquette', name: 'Pink Coquette', blurb: 'Diary & scrapbook romantis: pita, renda, kertas krem, huruf serif + tulisan tangan.',
  swatch: ['#f8c8dc', '#fff4ec', '#d9a1b0', '#c9b6e4'],
  font: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Dancing+Script:wght@500;700&family=Nunito:wght@400;600;700&display=swap',
  primary: ['home', 'memories', 'letters', 'chat', 'settings'],
  vocab: {}, icons: { home: '🎀', memories: '🌸', folders: '🗂️', scrapbook: '📖', photobooth: '🎞️', timeline: '🕊️', letters: '💌', chat: '🫧', daily: '🍒', mood: '🌷', hugs: '🧸', games: '🎲', pet: '🐰', bucket: '🍓', playlist: '💿', capsule: '🔮', calendar: '📅', countdown: '🕰️', notes: '🪶', wrapped: '🎁', map: '🗺️', where: '📍', search: '🔎', notifications: '🔔', settings: '🧵' },

  mount(root, api) {
    const me = S.profile, p = S.partner, n = daysTogether();
    const outlet = h('div.c-outlet'); const head = h('h1.c-pagetitle', {}, '');
    const unread = h('span.c-badge', { hidden: true }, '');
    api.watchUnread(c => { unread.textContent = c; unread.hidden = !c; });

    const side = h('aside.c-side', {}, h('div.c-brand', {}, h('div.c-bow', {}, '🎀'), h('h1', {}, S.couple.name), h('p.script', {}, p ? `${me.display_name} & ${p.display_name}` : me.display_name)),
      h('div.c-count', {}, h('b', {}, n != null ? n.toLocaleString('id-ID') : '—'), h('small', {}, 'hari bersama')),
      h('nav.c-nav', { 'aria-label': 'Navigasi utama' }, GROUPS.map(g => h('div.c-grp', {}, h('h5', {}, g.label), api.items.filter(i => i.g === g.id).map(i => h('a', { href: api.href(i.id), data: { id: i.id } }, h('span', {}, i.ic), i.label, i.id === 'notifications' ? unread : null))))),
      h('div.c-foot', {}, h('button.btn.sm.ghost', { type: 'button', onclick: api.pickTheme }, '🎨 Tema'), h('button.btn.sm.ghost', { type: 'button', onclick: api.logout }, 'Keluar')));

    const top = h('header.c-top', {}, h('button.c-burger', { type: 'button', 'aria-label': 'Menu', onclick: api.more }, '☰'), h('div', {}, h('small', {}, fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })), head),
      h('div.c-top-r', {}, h('a.c-icon', { href: api.href('search'), 'aria-label': 'Cari' }, '🔎'), h('a.c-icon', { href: api.href('notifications'), 'aria-label': 'Notifikasi' }, '🔔', unread), h('a', { href: api.href('settings'), 'aria-label': 'Profil' }, avatar(me, 38))));

    const bottom = h('nav.c-bottom', { 'aria-label': 'Navigasi bawah' }, api.items.filter(i => ['home', 'folders', 'letters', 'chat'].includes(i.id)).map(i => h('a', { href: api.href(i.id), data: { id: i.id } }, h('span', {}, i.ic), h('small', {}, i.label))), h('button', { type: 'button', onclick: api.more }, h('span', {}, '✨'), h('small', {}, 'Menu')));

    root.replaceChildren(h('div.c-wrap', {}, side, h('div.c-main', {}, top, outlet), bottom, h('div.c-petals', { 'aria-hidden': 'true' }, Array.from({ length: 8 }, () => h('i', {}, '🌸')))));
    return { outlet, setActive(id, label) { root.querySelectorAll('[data-id]').forEach(a => a.classList.toggle('on', a.dataset.id === id)); head.textContent = label; } };
  }
};
