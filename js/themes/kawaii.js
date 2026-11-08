// TEMA 1 — Kawaii Retro Paradise: portal/forum pixel ala web 2000-an.
// Struktur: strip atas → banner langit kota → tab → 3 kolom (kiri/tengah/kanan) dengan panel berjendela.
import { h } from '../core/util.js';
import { S } from '../core/db.js';
import { avatar, togetherLong, daysTogether, miniChat, radio, miniCalendar, activity } from '../core/widgets.js';
import { GROUPS } from '../core/nav.js';

const panel = (title, ...body) => {
  const b = h('div.k-pbody', {}, body);
  return h('section.k-panel', {}, h('div.k-ptitle', {}, h('span', {}, title), h('button.k-min', { type: 'button', 'aria-label': 'Ciutkan panel', onclick: e => { b.hidden = !b.hidden; e.currentTarget.textContent = b.hidden ? '+' : '–'; } }, '–')), b);
};

export default {
  id: 'kawaii', name: 'Kawaii Retro Paradise', blurb: 'Portal pixel ala forum jadul: tab, tiga kolom, radio, mini chat, kalender.',
  swatch: ['#c8b6ff', '#ffb5dc', '#8fd8ff', '#fff6fb'],
  font: 'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;600;700&family=Silkscreen:wght@400;700&family=DotGothic16&display=swap',
  primary: ['home', 'folders', 'timeline', 'letters', 'chat', 'games', 'playlist', 'map', 'settings'],
  vocab: { home: 'Inicio', memories: 'Galeri', folders: 'Album', letters: 'Surat', chat: 'Chat', games: 'Arcade', pet: 'Tamagotchi', playlist: 'Musik', capsule: 'Kapsul', bucket: 'Misi', wrapped: 'Rekap', where: 'Radar', mood: 'Mood', daily: 'Kuis Harian', hugs: 'Peluk', countdown: 'Timer', timeline: 'Sejarah' },
  icons: { home: '🏠', memories: '🖼️', folders: '💾', scrapbook: '📔', photobooth: '📸', timeline: '📼', letters: '💌', chat: '💬', daily: '🎲', mood: '🍥', hugs: '🧸', games: '🕹️', pet: '🐣', bucket: '⭐', playlist: '🎧', capsule: '💿', calendar: '📆', countdown: '⏲️', notes: '🗒️', wrapped: '🎀', map: '🗾', where: '📡', search: '🔎', notifications: '🔔', settings: '🛠️' },

  mount(root, api) {
    const me = S.profile, p = S.partner, n = daysTogether();
    const tabs = h('nav.k-tabs', { 'aria-label': 'Navigasi utama' }, api.primary().map(i => h('a.k-tab', { href: api.href(i.id), data: { id: i.id } }, h('span', {}, i.ic), i.label)), h('button.k-tab', { type: 'button', onclick: api.more }, h('span', {}, '➕'), 'Lainnya'));
    const navList = h('ul.k-nav', {}, GROUPS.map(g => [h('li.grp', {}, g.label), api.items.filter(i => i.g === g.id).map(i => h('li', {}, h('a', { href: api.href(i.id), data: { id: i.id } }, h('span', {}, i.ic), i.label)))]));
    const title = h('span.k-wtitle', {}, '');
    const outlet = h('div.k-outlet');
    const unread = h('span.k-unread', {}, '');
    api.watchUnread(c => { unread.textContent = c ? `🔔 ${c}` : ''; });

    root.replaceChildren(h('div.k-wrap', {},
      h('div.k-top', {}, h('span', {}, `Bienvenid@, ${me.display_name}! ☆ Pojok retro kita di internet`), h('span', {}, unread, ` 💗 ${S.members.length} di sini · Chiptune Time`)),
      h('header.k-banner', {}, h('div.k-sky', {}, h('i.moon'), h('i.star.s1'), h('i.star.s2'), h('i.star.s3'), h('div.k-city')),
        h('div.k-title', {}, h('h1', {}, S.couple.name), h('p', {}, 'retro ✦ kawaii ✦ community')),
        h('div.k-note', {}, h('div.k-note-bar', {}, h('span', {}, '✉'), h('b', {}, 'status'), h('span', {}, '▢ ✕')), h('p', {}, S.couple.description || `bersama ${togetherLong()} ♡`)),
        h('div.k-mascots', {}, avatar(me, 54), p ? avatar(p, 54) : h('span.avatar.ghost', { style: { width: '54px', height: '54px' } }, '?'))),
      tabs,
      h('div.k-cols', {},
        h('aside.k-left', {}, panel('Bienvenida', h('div.k-hello', {}, avatar(me, 64), h('div', {}, h('b', {}, `Halo, ${me.display_name}!`), h('small', {}, p ? `bersama ${p.display_name}` : 'menunggu pasangan…'))),
          h('p.k-big', {}, n != null ? `${n} hari` : '—'), h('small', {}, 'kita sudah bersama'),
          h('div.k-links', {}, h('a', { href: api.href('settings') }, '[ Pengaturan ]'), h('button.linklike', { type: 'button', onclick: api.logout }, '[ Keluar ]'))),
          panel('Navigasi', navList),
          panel('Tema', h('p.small', {}, 'Ganti tampilan kapan saja.'), h('button.btn.sm', { type: 'button', onclick: api.pickTheme }, '🎨 Pilih tema'))),
        h('main.k-main', {}, h('div.k-window', {}, h('div.k-wbar', {}, title, h('span.k-wdots', { 'aria-hidden': 'true' }, '▢ ✕')), outlet)),
        h('aside.k-right', {}, panel('Aktivitas terbaru', activity(5)), panel('Mini Chat', miniChat(5)), panel('Radio Kita', radio()), panel('Kalender', miniCalendar())))));

    return { outlet, setActive(id, label) { root.querySelectorAll('[data-id]').forEach(a => a.classList.toggle('on', a.dataset.id === id)); title.textContent = `✦ ${label} ✦`; } };
  }
};
