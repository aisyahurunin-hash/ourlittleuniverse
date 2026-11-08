import { h, fmtDate, formModal, confirmBox, toast, ymd } from '../core/util.js';
import { db, mediaImg, notifyPartner, nameOf } from '../core/db.js';
import { pageHead, empty } from '../core/ui.js';
import { uploadMedia } from './_shared.js';

const IDEAS = ['Percakapan pertama', 'Pertama bertemu', 'Kencan pertama', 'Resmi jadian', 'Trip pertama', 'Anniversary pertama'];
const FIELDS = [{ name: 'title', label: 'Judul peristiwa', required: true }, { name: 'event_date', label: 'Tanggal', type: 'date', required: true }, { name: 'location', label: 'Lokasi' }, { name: 'description', label: 'Cerita', type: 'textarea' }, { name: 'photo', label: 'Foto', type: 'file', accept: 'image/*' }];

export default async function timeline() {
  const root = h('div'); const list = h('ol.timeline');
  async function add(title = '', ev) {
    const v = await formModal({ title: ev ? 'Ubah peristiwa' : 'Peristiwa baru', fields: FIELDS, initial: ev || { title, event_date: ymd() } }); if (!v) return;
    try {
      const patch = { title: v.title, event_date: v.event_date, location: v.location || null, description: v.description || null };
      if (v.photo) patch.photo_path = await uploadMedia(v.photo, 'timeline');
      if (ev) await db.update('timeline_events', ev.id, patch); else { await db.insert('timeline_events', patch); notifyPartner('timeline', `Linimasa baru: ${v.title}`, '', '#/timeline'); }
      draw();
    } catch (e) { toast(e.message, 'err'); }
  }
  async function draw() {
    const rows = (await db.list('timeline_events', { order: ['event_date', 'asc'] }));
    if (!rows.length) return list.replaceChildren(empty('🕰️', 'Linimasa masih kosong. Mulai dari momen paling awal kalian.', h('div.chips', {}, IDEAS.map(t => h('button.chip', { type: 'button', onclick: () => add(t) }, '＋ ' + t)))));
    list.replaceChildren(...rows.map(r => h('li.tl-item', {}, h('div.tl-dot', {}, '♡'), h('div.tl-card', {}, h('time', {}, fmtDate(r.event_date)), h('h3', {}, r.title), r.location ? h('small', {}, '📍 ' + r.location) : null, r.photo_path ? h('div.tl-photo', {}, mediaImg(r.photo_path, { alt: r.title })) : null, r.description ? h('p', {}, r.description) : null,
      h('div.row-actions', {}, h('small.muted', {}, 'oleh ' + nameOf(r.created_by)), h('button.btn.sm.ghost', { type: 'button', onclick: () => add('', r) }, 'Ubah'), h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (await confirmBox('Hapus peristiwa ini?', 'Hapus')) { await db.remove('timeline_events', r.id); draw(); } } }, 'Hapus'))))));
  }
  root.append(pageHead('Linimasa Kita', 'Perjalanan kalian, berurutan dari awal.', h('button.btn', { type: 'button', onclick: () => add() }, '＋ Peristiwa')), list);
  await draw(); return root;
}
