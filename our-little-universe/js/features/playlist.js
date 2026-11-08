import { h, formModal, confirmBox, toast } from '../core/util.js';
import { db, notifyPartner, nameOf } from '../core/db.js';
import { pageHead, card, empty } from '../core/ui.js';
import { live } from '../core/widgets.js';

const safeUrl = u => { try { const x = new URL(u); return ['http:', 'https:'].includes(x.protocol) ? x.href : null; } catch { return null; } };

export default async function playlist() {
  const root = h('div');
  async function add(song) {
    const lists = [...new Set((await db.list('playlist_songs')).map(s => s.playlist))];
    const v = await formModal({ title: song ? 'Ubah lagu' : 'Tambah lagu', fields: [
      { name: 'title', label: 'Judul lagu', required: true }, { name: 'artist', label: 'Artis' },
      { name: 'url', label: 'Tautan musik (Spotify / YouTube / dll)', type: 'url', placeholder: 'https://…', hint: 'Kami hanya menyimpan tautan resmi — tidak mengunggah file musik.' },
      { name: 'playlist', label: 'Playlist', default: lists[0] || 'Favorit Kita', placeholder: 'Nama playlist' },
      { name: 'note', label: 'Catatan pribadi', type: 'textarea', rows: 2 }, { name: 'memory', label: 'Terkait kenangan apa?' }, { name: 'favorite', label: 'Favorit hubungan kita 💗', type: 'checkbox' }], initial: song || { playlist: lists[0] || 'Favorit Kita' } });
    if (!v) return;
    if (v.url && !safeUrl(v.url)) return toast('Tautan harus diawali http:// atau https://', 'err');
    const row = { title: v.title, artist: v.artist || null, url: v.url ? safeUrl(v.url) : null, playlist: v.playlist || 'Favorit Kita', note: v.note || null, memory: v.memory || null, favorite: v.favorite };
    if (song) await db.update('playlist_songs', song.id, row); else { await db.insert('playlist_songs', row); notifyPartner('song', `Lagu baru: ${v.title}`, v.artist || '', '#/playlist'); }
  }
  root.append(pageHead('Playlist Bersama', 'Lagu-lagu yang menyimpan cerita kalian.', h('button.btn', { type: 'button', onclick: () => add() }, '＋ Lagu')),
    live(['playlist_songs'], async () => {
      const rows = await db.list('playlist_songs', { order: ['created_at', 'desc'] });
      if (!rows.length) return empty('🎵', 'Belum ada lagu. Tambahkan lagu pertama kalian.');
      const groups = [...new Set(rows.map(r => r.playlist))];
      return groups.map(g => card('🎶 ' + g, h('ul.songs', {}, rows.filter(r => r.playlist === g).map(s => h('li.song', {}, h('button.fav' + (s.favorite ? '.on' : ''), { type: 'button', 'aria-label': 'Favorit', onclick: () => db.update('playlist_songs', s.id, { favorite: !s.favorite }) }, s.favorite ? '💗' : '🤍'),
        h('div', {}, h('b', {}, s.title), h('small', {}, [s.artist, 'oleh ' + nameOf(s.created_by)].filter(Boolean).join(' · ')), s.memory ? h('p.small', {}, '🎞️ ' + s.memory) : null, s.note ? h('p.small', {}, '“' + s.note + '”') : null),
        s.url ? h('a.btn.sm', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, '▶ Putar') : null,
        h('button.btn.sm.ghost', { type: 'button', onclick: () => add(s) }, '✎'), h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (await confirmBox('Hapus lagu ini?', 'Hapus')) db.remove('playlist_songs', s.id); } }, '🗑'))))));
    }));
  return root;
}
