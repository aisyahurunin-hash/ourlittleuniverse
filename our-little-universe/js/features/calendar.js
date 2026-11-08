import { h, fmtDate, formModal, confirmBox, toast, ymd, daysBetween } from '../core/util.js';
import { db, S } from '../core/db.js';
import { pageHead, card, empty } from '../core/ui.js';
import { live, specialEvents, MONTHS, DOW } from '../core/widgets.js';
import { SPECIAL_KINDS } from '../core/content.js';

let saved = null;
export default async function calendar() {
  const root = h('div'); const cur = saved ||= (() => { const d = new Date(); d.setDate(1); return d; })();
  async function add(r) {
    const v = await formModal({ title: r ? 'Ubah tanggal' : 'Tanggal spesial baru', fields: [{ name: 'title', label: 'Judul', required: true }, { name: 'date', label: 'Tanggal', type: 'date', required: true }, { name: 'kind', label: 'Jenis', type: 'select', options: SPECIAL_KINDS }, { name: 'yearly', label: 'Ulangi setiap tahun', type: 'checkbox', default: true }], initial: r || { yearly: true, kind: 'custom', date: ymd() } }); if (!v) return;
    if (r) await db.update('special_dates', r.id, v); else await db.insert('special_dates', v);
  }
  const notifBtn = 'Notification' in window ? h('button.btn.sm.ghost', { type: 'button', onclick: async () => { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Pengingat browser aktif (saat aplikasi terbuka)' : 'Izin notifikasi tidak diberikan'); } }, '🔔 Aktifkan pengingat browser') : null;
  root.append(pageHead('Kalender Spesial', 'Anniversary, ulang tahun, dan tanggal penting lainnya.', [notifBtn, h('button.btn', { type: 'button', onclick: () => add() }, '＋ Tanggal')]),
    live(['special_dates', 'countdowns'], async () => {
      const ev = await specialEvents(cur.getFullYear()); const rows = await db.list('special_dates', { order: ['date', 'asc'] });
      const first = (cur.getDay() + 6) % 7, dim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate(); const cells = DOW.map(d => h('i.dow', {}, d)); const today = new Date();
      for (let i = 0; i < first; i++) cells.push(h('i'));
      for (let d = 1; d <= dim; d++) { const hit = ev.filter(e => e.date.getMonth() === cur.getMonth() && e.date.getDate() === d); cells.push(h('i.day' + (hit.length ? '.hit' : '') + (today.getFullYear() === cur.getFullYear() && today.getMonth() === cur.getMonth() && today.getDate() === d ? '.today' : ''), {}, h('small', {}, d), hit.map(e => h('span.ev', {}, e.title)))); }
      const up = [...ev, ...(await specialEvents(cur.getFullYear() + 1))].filter(e => e.date >= new Date(new Date().setHours(0, 0, 0, 0))).sort((a, b) => a.date - b.date).slice(0, 6);
      return [card('', h('div.cal-head', {}, h('button', { type: 'button', 'aria-label': 'Sebelumnya', onclick: () => { cur.setMonth(cur.getMonth() - 1); calendar().then(n => root.replaceWith(n)); } }, '‹'), h('b', {}, `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`), h('button', { type: 'button', 'aria-label': 'Berikutnya', onclick: () => { cur.setMonth(cur.getMonth() + 1); calendar().then(n => root.replaceWith(n)); } }, '›')), h('div.cal-grid.big', {}, cells)),
        card('⏭️ Akan datang', up.length ? h('ul.upcoming', {}, up.map(e => h('li', {}, h('b', {}, e.title), h('small', {}, ` ${fmtDate(e.date)} · ${daysBetween(new Date(), e.date) === 0 ? 'hari ini 🎊' : daysBetween(new Date(), e.date) + ' hari lagi'}`)))) : h('p.muted', {}, 'Tidak ada tanggal mendatang.')),
        card('📋 Tanggal yang kamu simpan', rows.length ? h('ul.upcoming', {}, rows.map(r => h('li', {}, h('span', {}, `${(SPECIAL_KINDS.find(k => k[0] === r.kind) || ['', '✨'])[1].split(' ')[0]} `), h('b', {}, r.title), h('small', {}, ` ${fmtDate(r.date)}${r.yearly ? ' · tiap tahun' : ''}`), h('button.btn.sm.ghost', { type: 'button', onclick: () => add(r) }, '✎'), h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (await confirmBox('Hapus?', 'Hapus')) db.remove('special_dates', r.id); } }, '🗑'))) ) : h('p.muted', {}, 'Anniversary & ulang tahun dari profil sudah otomatis muncul. Tambah tanggal lain di sini.'))];
    }));
  return root;
}
