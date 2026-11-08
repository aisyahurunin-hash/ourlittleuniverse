// TEMA 2 — Manifest Y2K Pink: portal MSN-era. Bar atas ikon + pemutar, "ruang" tengah bergantung papan judul,
// HP pink di kanan, counter digital & dock di bawah. Halaman Surat punya varian "Kantor Pos".
import { h } from '../core/util.js';
import { S } from '../core/db.js';
import { avatar, daysTogether, digitCounter, radio, phoneScreen, onlineList, activity, live } from '../core/widgets.js';
import { db } from '../core/db.js';
import { moodOf } from '../core/content.js';

const bubble = (title, ...body) => h('section.m-box', {}, h('h4', {}, title), ...body);

export default {
  id: 'manifest', name: 'Manifest Y2K Pink', blurb: 'Portal pink 2005: bar ikon, ruang dengan lampu, HP pink, counter digital, Kantor Pos untuk surat.',
  swatch: ['#ff4f9a', '#ff9fc9', '#3b1e5a', '#fff0f6'],
  font: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Quicksand:wght@500;600;700&family=Caveat:wght@500;700&display=swap',
  primary: ['home', 'memories', 'letters', 'chat', 'playlist', 'games', 'timeline', 'folders'],
  vocab: { home: 'Ana Sayfa', memories: 'Galeri', folders: 'Albüm', letters: 'Postane', chat: 'Mesaj', playlist: 'Müzik', games: 'Oyun', timeline: 'Günlük', pet: 'Evcil', mood: 'Ruh Hali', daily: 'Soru', wrapped: 'Özet', capsule: 'Kapsül', bucket: 'Hayaller', where: 'Neredesin?' },
  icons: { home: '🏡', memories: '📷', folders: '🗂️', scrapbook: '🎀', photobooth: '📸', timeline: '📖', letters: '💌', chat: '📱', daily: '💭', mood: '💖', hugs: '🫶', games: '🎮', pet: '🐾', bucket: '🌟', playlist: '🎶', capsule: '🔮', calendar: '🗓️', countdown: '⏳', notes: '✏️', wrapped: '🛍️', map: '🌆', where: '📍', search: '🔍', notifications: '🔔', settings: '⚙️' },

  mount(root, api) {
    const me = S.profile, n = daysTogether();
    const unread = h('span.m-badge', { hidden: true }, '');
    api.watchUnread(c => { unread.textContent = c; unread.hidden = !c; });
    const sign = h('h2.m-sign', {}, '');
    const outlet = h('div.m-paper');
    const icons = h('nav.m-icons', { 'aria-label': 'Navigasi utama' }, api.primary().map(i => h('a', { href: api.href(i.id), data: { id: i.id } }, h('span.ic', {}, i.ic), h('small', {}, i.label))));

    const diary = live(['mood_checkins', 'notes'], async () => {
      const moods = await db.list('mood_checkins', { order: ['day', 'desc'], limit: 8 });
      return S.members.map(m => { const md = moods.find(x => x.user_id === m.id); return h('div.m-diary', {}, h('b', {}, `${m.display_name}'in Günlüğü`), h('p', {}, md ? `${moodOf(md.mood).e} ${md.note || moodOf(md.mood).l}` : 'Belum check-in hari ini.')); });
    });

    root.replaceChildren(h('div.m-wrap', {},
      h('header.m-top', {}, h('div.m-logo', {}, h('h1', {}, S.couple.name), h('small', {}, 'bukan sekadar mimpi, ini milik kita')), icons,
        h('div.m-player', {}, h('b', {}, '♪ Şu an çalıyor'), radio())),
      h('div.m-stage', {}, h('div.m-lights', { 'aria-hidden': 'true' }, Array.from({ length: 14 }, () => h('i'))),
        h('aside.m-left', {}, bubble(`hoş geldin! ${me.display_name}`, h('p', {}, 'Dunia kecil kalian dibuka. Selamat bernostalgia ♡'), h('button.btn.sm', { type: 'button', onclick: api.pickTheme }, '🎨 Ganti tema')),
          bubble('HABERLER', activity(4)), bubble('GÜNLÜK', diary)),
        h('main.m-center', {}, sign, outlet),
        h('aside.m-right', {}, h('div.m-phone', {}, h('div.m-ph-top', {}, h('i'), h('b', {}, 'MESAJ')), h('div.m-ph-screen', {}, phoneScreen()),
          h('div.m-ph-keys', {}, h('a.btn.sm', { href: api.href('chat') }, 'Balas'), h('a.btn.sm.ghost', { href: api.href('letters') }, 'Surat')), h('div.m-ph-pad', { 'aria-hidden': 'true' }, Array.from({ length: 12 }, (_, i) => h('i', {}, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'][i])))),
          bubble('ÇEVRİMİÇİ ÜYELER', onlineList()))),
      h('footer.m-bottom', {}, h('div.m-count', {}, digitCounter(n ?? 0, 7), h('small', {}, 'hari kita bersama ♡')),
        h('div.m-dock', {}, [['theme', '🎨', 'Tema'], ['search', '🔍', 'Cari'], ['notifications', '🔔', 'Notifikasi'], ['settings', '⚙️', 'Pengaturan']].map(([id, ic, l]) => id === 'theme' ? h('button.dock', { type: 'button', onclick: api.pickTheme }, h('span', {}, ic), l) : h('a.dock', { href: api.href(id) }, h('span', {}, ic), l, id === 'notifications' ? unread : null)),
          h('button.dock', { type: 'button', onclick: api.more }, h('span', {}, '➕'), 'Semua'), h('button.dock', { type: 'button', onclick: api.logout }, h('span', {}, '🚪'), 'Keluar')))));

    return { outlet, setActive(id, label, ic) { root.querySelectorAll('[data-id]').forEach(a => a.classList.toggle('on', a.dataset.id === id)); sign.textContent = `${ic || ''} ${label.toUpperCase()}`; } };
  },

  // Varian halaman: halaman ini punya layout berbeda hanya di tema ini
  pages: { letters: 'post-office' }
};
