import { h, formModal, confirmBox, toast, toLocalInput, fmtDateTime, ymd, celebrate } from '../core/util.js';
import { db, mediaImg, notifyPartner } from '../core/db.js';
import { pageHead, card, empty } from '../core/ui.js';
import { uploadMedia } from './_shared.js';

const FIELDS = [{ name: 'title', label: 'Judul', required: true, placeholder: 'Ketemu lagi!' }, { name: 'target_at', label: 'Tanggal & jam bertemu', type: 'datetime-local', required: true }, { name: 'message', label: 'Pesan pribadi', type: 'textarea', rows: 2 }, { name: 'cover', label: 'Foto sampul', type: 'file', accept: 'image/*' }];

export default async function countdown() {
  const root = h('div'); const list = h('div.cd-list'); let timer;
  async function add(c) {
    const v = await formModal({ title: c ? 'Ubah hitung mundur' : 'Hitung mundur baru', fields: FIELDS, initial: c ? { ...c, target_at: toLocalInput(c.target_at) } : {} }); if (!v) return;
    try {
      const row = { title: v.title, target_at: new Date(v.target_at).toISOString(), message: v.message || null }; if (v.cover) row.cover_path = await uploadMedia(v.cover, 'countdown');
      if (c) await db.update('countdowns', c.id, row); else { await db.insert('countdowns', row); notifyPartner('countdown', `Hitung mundur baru: ${v.title}`, '', '#/countdown'); }
      draw();
    } catch (e) { toast(e.message, 'err'); }
  }
  async function draw() {
    clearInterval(timer);
    let rows = await db.list('countdowns', { order: ['target_at', 'asc'] });
    // Tanggal tiba → simpan sebagai kenangan di linimasa, lalu arsipkan
    for (const c of rows.filter(r => !r.archived && new Date(r.target_at) <= new Date())) {
      await db.insert('timeline_events', { title: c.title, event_date: ymd(new Date(c.target_at)), description: c.message || 'Hitung mundur telah tiba 🎉', photo_path: c.cover_path || null });
      await db.update('countdowns', c.id, { archived: true }); celebrate(['🎉', '💗', '✨']); toast(`🎉 “${c.title}” tiba! Tersimpan di Linimasa.`);
    }
    rows = await db.list('countdowns', { order: ['target_at', 'asc'] });
    const act = rows.filter(r => !r.archived);
    if (!rows.length) return list.replaceChildren(empty('⏰', 'Belum ada hitung mundur. Cocok untuk LDR!', h('button.btn', { type: 'button', onclick: () => add() }, '＋ Buat')));
    const cells = [];
    list.replaceChildren(...act.map(c => { const num = {}; const box = h('div.cd', {}, [['d', 'hari'], ['h', 'jam'], ['m', 'menit'], ['s', 'detik']].map(([k, l]) => h('div', {}, num[k] = h('b', {}, '0'), h('small', {}, l)))); cells.push([c, num]);
      return card(null, c.cover_path ? h('div.cd-cover', {}, mediaImg(c.cover_path)) : null, h('h3', {}, c.title), h('small', {}, fmtDateTime(c.target_at)), box, c.message ? h('p.script', {}, c.message) : null, h('div.row-actions', {}, h('button.btn.sm.ghost', { type: 'button', onclick: () => add(c) }, 'Ubah'), h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (await confirmBox('Hapus hitung mundur?', 'Hapus')) { await db.remove('countdowns', c.id); draw(); } } }, '🗑'))); }),
      rows.filter(r => r.archived).length ? card('✅ Sudah terlewati', h('ul', {}, rows.filter(r => r.archived).map(r => h('li', {}, `${r.title} — ${fmtDateTime(r.target_at)}`)))) : null);
    const tick = () => cells.forEach(([c, n]) => { let s = Math.max(0, Math.floor((new Date(c.target_at) - Date.now()) / 1000)); n.d.textContent = Math.floor(s / 86400); s %= 86400; n.h.textContent = Math.floor(s / 3600); s %= 3600; n.m.textContent = Math.floor(s / 60); n.s.textContent = s % 60; if (new Date(c.target_at) <= Date.now() && root.isConnected) { clearInterval(timer); draw(); } });
    tick(); timer = setInterval(() => { if (!root.isConnected) return clearInterval(timer); tick(); }, 1000);
  }
  root.append(pageHead('Hitung Mundur Bertemu', 'Detik demi detik menuju hari kalian bertemu lagi.', h('button.btn', { type: 'button', onclick: () => add() }, '＋ Hitung mundur')), list);
  await draw(); return root;
}
