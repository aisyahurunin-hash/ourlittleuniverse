import { h, fmtDate, formModal, confirmBox, toast, ymd, celebrate } from '../core/util.js';
import { db, mediaImg, notifyPartner, nameOf } from '../core/db.js';
import { pageHead, card, empty } from '../core/ui.js';
import { live } from '../core/widgets.js';
import { uploadMedia } from './_shared.js';

const IDEAS = ['Nonton sunrise bareng', 'Masak bareng', 'Ke pantai', 'Foto di photobooth', 'Jalan-jalan ke kota baru', 'Merayakan anniversary'];

export default async function bucket() {
  const root = h('div');
  async function add(title = '') {
    const v = await formModal({ title: 'Impian baru', fields: [{ name: 'title', label: 'Apa yang ingin dilakukan?', required: true }, { name: 'description', label: 'Deskripsi', type: 'textarea', rows: 3 }, { name: 'target_date', label: 'Target tanggal', type: 'date' }], initial: { title } }); if (!v) return;
    await db.insert('bucket_items', { title: v.title, description: v.description || null, target_date: v.target_date || null, done: false });
    notifyPartner('bucket', `Impian baru: ${v.title}`, '', '#/bucket');
  }
  async function complete(it) {
    const v = await formModal({ title: 'Tercapai! 🎉', fields: [{ name: 'done_at', label: 'Tanggal', type: 'date', default: ymd() }, { name: 'note', label: 'Catatan', type: 'textarea', rows: 3 }, { name: 'proof', label: 'Foto bukti (opsional)', type: 'file', accept: 'image/*' }], initial: { done_at: ymd() }, submit: 'Tandai selesai' }); if (!v) return;
    try { const patch = { done: true, done_at: v.done_at || ymd(), note: v.note || null }; if (v.proof) patch.proof_path = await uploadMedia(v.proof, 'bucket'); await db.update('bucket_items', it.id, patch); celebrate(); notifyPartner('bucket', `Tercapai: ${it.title} 🎉`, '', '#/bucket'); } catch (e) { toast(e.message, 'err'); }
  }
  root.append(pageHead('Bucket List Kita', 'Hal-hal yang ingin kalian alami bersama.', h('button.btn', { type: 'button', onclick: () => add() }, '＋ Impian')),
    live(['bucket_items'], async () => {
      const rows = await db.list('bucket_items', { order: ['created_at', 'desc'] }); const done = rows.filter(r => r.done), todo = rows.filter(r => !r.done);
      const pct = rows.length ? Math.round(done.length / rows.length * 100) : 0;
      if (!rows.length) return empty('✅', 'Belum ada impian.', h('div.chips', {}, IDEAS.map(t => h('button.chip', { type: 'button', onclick: () => add(t) }, '＋ ' + t))));
      return [card('Progres', h('div.progress', { role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: { width: pct + '%' } })), h('small', {}, `${done.length} dari ${rows.length} tercapai (${pct}%)`)),
        card('🌱 Yang ingin dilakukan', todo.length ? h('ul.todo', {}, todo.map(r => h('li', {}, h('button.check', { type: 'button', 'aria-label': 'Tandai selesai', onclick: () => complete(r) }, '○'), h('div', {}, h('b', {}, r.title), r.description ? h('p', {}, r.description) : null, h('small', {}, [r.target_date ? '🎯 ' + fmtDate(r.target_date) : '', 'ditambah ' + nameOf(r.created_by)].filter(Boolean).join(' · '))), h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (await confirmBox('Hapus impian ini?', 'Hapus')) db.remove('bucket_items', r.id); } }, '🗑')))) : h('p.muted', {}, 'Semua tercapai! 🎉')),
        card('🏆 Timeline tercapai', done.length ? h('ol.timeline.compact', {}, [...done].sort((a, b) => (b.done_at || '').localeCompare(a.done_at || '')).map(r => h('li.tl-item', {}, h('div.tl-dot', {}, '✓'), h('div.tl-card', {}, h('time', {}, fmtDate(r.done_at)), h('h3', {}, r.title), r.proof_path ? h('div.tl-photo', {}, mediaImg(r.proof_path)) : null, r.note ? h('p', {}, r.note) : null)))) : h('p.muted', {}, 'Belum ada yang tercapai.'))];
    }));
  return root;
}
