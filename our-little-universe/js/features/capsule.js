import { h, formModal, confirmBox, toast, toLocalInput, fmtDateTime, celebrate } from '../core/util.js';
import { db, S, isMe, nameOf, mediaImg, notifyPartner } from '../core/db.js';
import { pageHead, card, empty } from '../core/ui.js';
import { uploadMany } from './_shared.js';
import { live } from '../core/widgets.js';

export default async function capsule() {
  const root = h('div');
  async function create() {
    const min = toLocalInput(new Date(Date.now() + 3600000));
    const v = await formModal({ title: 'Kapsul waktu baru', wide: true, fields: [
      { name: 'title', label: 'Nama kapsul', required: true }, { name: 'open_at', label: 'Baru bisa dibuka pada', type: 'datetime-local', required: true, min },
      { name: 'letter', label: 'Surat untuk masa depan', type: 'textarea' }, { name: 'predictions', label: 'Prediksi', type: 'textarea', rows: 2 },
      { name: 'wishes', label: 'Harapan', type: 'textarea', rows: 2 }, { name: 'promises', label: 'Janji', type: 'textarea', rows: 2 }, { name: 'photos', label: 'Foto', type: 'file', accept: 'image/*', multiple: true }], submit: 'Kunci kapsul 🔒' });
    if (!v) return;
    if (new Date(v.open_at) <= new Date()) return toast('Tanggal buka harus di masa depan.', 'err');
    try {
      const photos = await uploadMany(v.photos || [], 'capsules', p => p);
      await db.insert('time_capsules', { title: v.title, open_at: new Date(v.open_at).toISOString(), content: { letter: v.letter, predictions: v.predictions, wishes: v.wishes, promises: v.promises, photos } });
      notifyPartner('capsule', `Kapsul waktu baru: ${v.title}`, `Terbuka ${fmtDateTime(v.open_at)}`, '#/capsule'); toast('Kapsul terkunci 🔒'); celebrate(['⏳', '✨']);
    } catch (e) { toast(e.message, 'err'); }
  }
  async function view(id) {
    const c = (await db.list('time_capsules')).find(x => x.id === id); if (!c) return toast('Belum bisa dibuka.', 'err');
    const k = c.content || {};
    const m = (await import('../core/util.js')).modal({ title: '⏳ ' + c.title, wide: true, body: h('div.capsule-open', {}, [['💌 Surat', k.letter], ['🔮 Prediksi', k.predictions], ['🌠 Harapan', k.wishes], ['🤝 Janji', k.promises]].filter(x => x[1]).map(([t, x]) => h('section', {}, h('h4', {}, t), h('p', {}, x))), k.photos?.length ? h('div.thumbs', {}, k.photos.map(p => h('div.thumb', {}, mediaImg(p)))) : null) }); celebrate();
  }
  root.append(pageHead('Kapsul Waktu', 'Simpan pesan hari ini untuk dibuka di masa depan. Terkunci sungguhan sampai tanggalnya tiba.', h('button.btn', { type: 'button', onclick: create }, '＋ Kapsul')),
    live(['time_capsules'], async () => {
      const rows = await db.capsuleIndex(); if (!rows.length) return empty('⏳', 'Belum ada kapsul waktu.');
      return h('div.capsule-grid', {}, rows.map(c => { const open = new Date(c.open_at) <= new Date(); const diff = Math.ceil((new Date(c.open_at) - Date.now()) / 86400000);
        return h('article.capsule' + (open ? '.open' : ''), {}, h('div.cap-ic', {}, open ? '🎁' : '🔒'), h('h3', {}, c.title), h('small', {}, `dibuat ${nameOf(c.created_by)} · ${open ? 'terbuka sejak ' : 'terbuka '}${fmtDateTime(c.open_at)}`),
          open ? h('button.btn.sm', { type: 'button', onclick: () => view(c.id) }, 'Buka isinya') : h('p.big', {}, `${diff} hari lagi`),
          isMe(c.created_by) && !open ? h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (await confirmBox('Hapus kapsul ini?', 'Hapus')) db.remove('time_capsules', c.id); } }, 'Hapus') : null); }));
    }));
  return root;
}
