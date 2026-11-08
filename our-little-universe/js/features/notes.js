import { h, modal, confirmBox, toast, ago } from '../core/util.js';
import { db, nameOf } from '../core/db.js';
import { pageHead, empty } from '../core/ui.js';
import { live } from '../core/widgets.js';

export default async function notes() {
  const root = h('div');
  function editor(n) {
    const d = { title: n?.title || '', body: n?.body || '', pinned: !!n?.pinned, checklist: structuredClone(n?.checklist || []) };
    const list = h('ul.check-edit'); const draw = () => list.replaceChildren(...d.checklist.map((c, i) => h('li', {}, h('input', { type: 'checkbox', checked: c.done, onchange: e => c.done = e.target.checked }), h('input', { type: 'text', value: c.t, oninput: e => c.t = e.target.value }), h('button', { type: 'button', 'aria-label': 'Hapus item', onclick: () => { d.checklist.splice(i, 1); draw(); } }, '✕'))));
    draw();
    const body = h('form.form', { onsubmit: async e => { e.preventDefault(); if (!d.title.trim()) return toast('Beri judul dulu', 'err'); const row = { title: d.title.trim(), body: d.body, pinned: d.pinned, checklist: d.checklist.filter(c => c.t.trim()), updated_at: new Date().toISOString() }; if (n) await db.update('notes', n.id, row); else await db.insert('notes', row); m.close(); } },
      h('label.field', {}, h('span', {}, 'Judul'), h('input', { type: 'text', value: d.title, required: true, oninput: e => d.title = e.target.value })),
      h('label.field', {}, h('span', {}, 'Catatan'), h('textarea', { rows: 5, value: d.body, oninput: e => d.body = e.target.value })),
      h('div.field', {}, h('span', {}, 'Checklist'), list, h('button.btn.sm.ghost', { type: 'button', onclick: () => { d.checklist.push({ t: '', done: false }); draw(); list.lastChild?.querySelector('input[type=text]')?.focus(); } }, '＋ Item')),
      h('label.field.check', {}, h('input', { type: 'checkbox', checked: d.pinned, onchange: e => d.pinned = e.target.checked }), h('span', {}, '📌 Sematkan')),
      h('div.modal-foot', {}, h('button.btn.ghost', { type: 'button', onclick: () => m.close() }, 'Batal'), h('button.btn', { type: 'submit' }, 'Simpan')));
    const m = modal({ title: n ? 'Ubah catatan' : 'Catatan baru', body });
  }
  root.append(pageHead('Catatan Bersama', 'Rencana kencan, trip, hadiah — apa saja.', h('button.btn', { type: 'button', onclick: () => editor() }, '＋ Catatan')),
    live(['notes'], async () => {
      const rows = (await db.list('notes', { order: ['updated_at', 'desc'] })).sort((a, b) => Number(b.pinned) - Number(a.pinned));
      if (!rows.length) return empty('📝', 'Belum ada catatan.');
      return h('div.notes-grid', {}, rows.map(n => h('article.note' + (n.pinned ? '.pinned' : ''), {}, n.pinned ? h('span.pin', {}, '📌') : null, h('h3', {}, n.title), n.body ? h('p', {}, n.body) : null,
        n.checklist?.length ? h('ul.checklist', {}, n.checklist.map((c, i) => h('li', {}, h('label', {}, h('input', { type: 'checkbox', checked: c.done, onchange: e => { const cl = structuredClone(n.checklist); cl[i].done = e.target.checked; db.update('notes', n.id, { checklist: cl, updated_at: new Date().toISOString() }); } }), h('span' + (c.done ? '.done' : ''), {}, c.t))))) : null,
        h('footer', {}, h('small', {}, `${nameOf(n.created_by)} · ${ago(n.updated_at || n.created_at)}`), h('span', {}, h('button.btn.sm.ghost', { type: 'button', onclick: () => editor(n) }, 'Ubah'), h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (await confirmBox('Hapus catatan ini?', 'Hapus')) db.remove('notes', n.id); } }, '🗑'))))));
    }));
  return root;
}
