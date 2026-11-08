// TEMA 3 — Pixel Messenger: seluruh aplikasi hidup di dalam jendela chat ala MSN lama.
// Struktur: latar holografik → jendela (title bar, toolbar ikon, daftar kontak | panel isi, status bar).
// Halaman Obrolan punya varian "bubble chat" bergaya MSN.
import { h } from '../core/util.js';
import { S, on, db, isMe } from '../core/db.js';
import { avatar, live } from '../core/widgets.js';
import { GROUPS } from '../core/nav.js';
import { moodOf } from '../core/content.js';

export default {
  id: 'messenger', name: 'Pixel Messenger', blurb: 'Seluruh aplikasi jadi jendela chat MSN: toolbar ikon, daftar kontak, status “sedang mengetik”.',
  swatch: ['#a9c7ff', '#ffb8e0', '#fdf0ff', '#2a4fb0'],
  font: 'https://fonts.googleapis.com/css2?family=VT323&family=Pixelify+Sans:wght@400;600&family=Silkscreen:wght@400;700&display=swap',
  primary: ['home', 'chat', 'letters', 'folders', 'photobooth', 'hugs', 'games'],
  vocab: { home: 'Kontak', memories: 'File', folders: 'Files', letters: 'Mail', chat: 'Chat', photobooth: 'Webcam', hugs: 'Love', games: 'Games', timeline: 'Riwayat', pet: 'Buddy', mood: 'Status', daily: 'Quiz', where: 'Lokasi', playlist: 'Musik' },
  icons: { home: '🧑‍🤝‍🧑', memories: '🗃️', folders: '📂', scrapbook: '📒', photobooth: '📷', timeline: '🧾', letters: '✉️', chat: '💬', daily: '❔', mood: '🙂', hugs: '💗', games: '👾', pet: '🐾', bucket: '☑️', playlist: '💿', capsule: '⌛', calendar: '🗓️', countdown: '⏱️', notes: '📌', wrapped: '🎁', map: '🧭', where: '📍', search: '🔍', notifications: '🔔', settings: '🔧' },

  mount(root, api) {
    const me = S.profile, p = S.partner;
    const body = h('div.x-body', {}); const outlet = h('div.x-pane');
    const title = h('span.x-wtitle', {}, `${p ? p.display_name : S.couple.name} <3`);
    const unread = h('span.x-badge', { hidden: true }, '');
    api.watchUnread(c => { unread.textContent = c; unread.hidden = !c; });
    let wide = false;
    const win = h('div.x-window', {});

    const toolbar = h('nav.x-toolbar', { 'aria-label': 'Navigasi utama' }, api.primary().map(i => h('a.x-tool', { href: api.href(i.id), data: { id: i.id } }, h('span', {}, i.ic), i.label)),
      h('button.x-tool', { type: 'button', onclick: api.more }, h('span', {}, '➕'), 'Lainnya'));

    const buddies = h('aside.x-buddies', {}, h('div.x-grp', {}, '▾ Kontak (' + S.members.length + ')'),
      live(['mood_checkins', 'battery_status'], async () => {
        const moods = await db.list('mood_checkins', { order: ['day', 'desc'], limit: 10 }), bats = await db.list('battery_status');
        return h('ul.x-contacts', {}, [p, me].filter(Boolean).map(m => { const md = moods.find(x => x.user_id === m.id), b = bats.find(x => x.user_id === m.id);
          return h('li', {}, avatar(m, 32), h('div', {}, h('b', {}, m.display_name + (isMe(m.id) ? ' (aku)' : '')), h('small', {}, `${md ? moodOf(md.mood).e + ' ' + (md.note || moodOf(md.mood).l) : '— belum ada status'}${b?.level != null ? ' · 🔋' + b.level + '%' : ''}`))); })); }),
      GROUPS.map(g => h('details.x-menu', { open: g.id === 'kita' || g.id === 'rasa' }, h('summary', {}, g.label), h('ul', {}, api.items.filter(i => i.g === g.id).map(i => h('li', {}, h('a', { href: api.href(i.id), data: { id: i.id } }, h('span', {}, i.ic), i.label)))))),
      h('div.x-foot', {}, h('button.btn.sm', { type: 'button', onclick: api.pickTheme }, '🎨 Tema'), h('button.btn.sm.ghost', { type: 'button', onclick: api.logout }, 'Keluar')));

    const status = h('footer.x-status', {}, live(['mood_checkins', 'messages'], async () => {
      if (!p) return h('span', {}, 'Menunggu pasanganmu bergabung…');
      const msgs = await db.list('messages', { order: ['created_at', 'desc'], limit: 1 });
      const last = msgs[0]; const recent = last && !isMe(last.from_user) && Date.now() - new Date(last.created_at) < 60000;
      return h('span', {}, recent ? `${p.display_name} baru saja mengirim pesan…` : `${p.display_name} sedang tidak mengetik.`);
    }), unread);

    body.append(buddies, outlet);
    win.append(
      h('div.x-titlebar', {}, h('span.x-ico', {}, '🌼'), title, h('span.x-wbtns', {},
        h('button', { type: 'button', 'aria-label': 'Ciutkan jendela', onclick: () => { body.hidden = !body.hidden; toolbar.hidden = body.hidden; } }, '▁'),
        h('button', { type: 'button', 'aria-label': 'Lebar / sempit', onclick: () => { wide = !wide; win.classList.toggle('wide', wide); } }, '▢'),
        h('button', { type: 'button', 'aria-label': 'Ke beranda', onclick: () => { location.hash = api.href('home'); } }, '✕'))),
      toolbar, body, status);
    root.replaceChildren(h('div.x-desk', {}, win,
      h('div.x-deco', { 'aria-hidden': 'true' }, h('span.phone', {}, '📱'), h('span.pc', {}, '🖥️'), h('span.sp.a', {}, '✦'), h('span.sp.b', {}, '✧'), h('span.sticker', {}, S.couple.name))));

    return { outlet, setActive(id) { root.querySelectorAll('[data-id]').forEach(a => a.classList.toggle('on', a.dataset.id === id)); } };
  },
  pages: { chat: 'msn' }
};
