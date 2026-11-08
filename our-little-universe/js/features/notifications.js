import { h, ago, toast } from '../core/util.js';
import { db } from '../core/db.js';
import { pageHead, empty } from '../core/ui.js';
import { live } from '../core/widgets.js';

const IC = { letter: '💌', letter_read: '👀', folder: '📁', photos: '📸', daily: '❓', mood: '🌤️', reply: '💬', affection: '🤗', bucket: '✅', capsule: '⏳', joined: '💞', message: '💬', game: '🎮', pet: '🐾', song: '🎵', place: '📍', timeline: '🕰️', scrapbook: '📒', countdown: '⏰' };

export default async function notifications() {
  const root = h('div');
  const perm = 'Notification' in window ? h('button.btn.sm.ghost', { type: 'button', onclick: async () => { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Notifikasi browser aktif (muncul saat aplikasi terbuka di latar)' : 'Izin tidak diberikan'); } }, '🔔 Izinkan notifikasi browser') : null;
  root.append(pageHead('Notifikasi', 'Semua kabar dari pasanganmu.', [perm, h('button.btn.sm', { type: 'button', onclick: async () => { for (const n of (await db.list('notifications')).filter(x => !x.read)) await db.update('notifications', n.id, { read: true }); } }, '✓ Tandai semua dibaca')]),
    h('p.muted.small', {}, 'Catatan: notifikasi push saat aplikasi benar-benar tertutup membutuhkan Web Push (service worker + server VAPID). Lihat README untuk cara menambahkannya.'),
    live(['notifications'], async () => {
      const rows = await db.list('notifications', { order: ['created_at', 'desc'], limit: 100 });
      if (!rows.length) return empty('🔔', 'Belum ada notifikasi.');
      return h('ul.notif-list', {}, rows.map(n => h('li' + (n.read ? '' : '.unread'), {}, h('span', {}, IC[n.kind] || '✨'), h('a', { href: n.link || '#/notifications', onclick: () => !n.read && db.update('notifications', n.id, { read: true }) }, h('b', {}, n.title), n.body ? h('small', {}, n.body) : null, h('small.muted', {}, ago(n.created_at))), h('button.btn.sm.ghost', { type: 'button', 'aria-label': 'Hapus', onclick: () => db.remove('notifications', n.id) }, '✕'))));
    }));
  return root;
}
