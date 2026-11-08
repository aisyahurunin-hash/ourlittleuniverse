// Scrapbook digital: halaman dengan elemen yang bisa digeser (teks, stiker, foto), disimpan di database & dikerjakan berdua.
import { h, formModal, confirmBox, toast, ymd, fmtDate } from '../core/util.js';
import { db, S, mediaImg, notifyPartner, on } from '../core/db.js';
import { pageHead, card, empty, tabs } from '../core/ui.js';
import { STICKERS } from '../core/content.js';
import { uploadMedia } from './_shared.js';

const BGS = [['cream', 'Krem'], ['pink', 'Pink'], ['lavender', 'Lavender'], ['kraft', 'Kertas kraft'], ['grid', 'Kotak-kotak'], ['floral', 'Bunga']];
const LAYOUTS = [['free', 'Bebas'], ['polaroids', '3 Polaroid'], ['hero', 'Foto besar + cerita']];

export default async function scrapbook([id, mode]) { return id ? editor(id, mode === 'preview') : list(); }

async function list() {
  const root = h('div'); const body = h('div');
  async function create() {
    const v = await formModal({ title: 'Scrapbook baru', fields: [{ name: 'title', label: 'Judul buku', required: true, placeholder: 'Liburan Bali 2026' }] }); if (!v) return;
    const b = await db.insert('scrapbooks', { title: v.title }); await db.insert('scrapbook_pages', { scrapbook_id: b.id, page_no: 1, data: [], bg: 'cream', is_draft: true });
    notifyPartner('scrapbook', `Scrapbook baru: ${v.title}`, '', '#/scrapbook/' + b.id); location.hash = '#/scrapbook/' + b.id;
  }
  const draw = async () => {
    const [bs, ps] = await Promise.all([db.list('scrapbooks', { order: ['created_at', 'desc'] }), db.list('scrapbook_pages')]);
    if (!bs.length) return body.replaceChildren(empty('📒', 'Belum ada scrapbook.', h('button.btn', { type: 'button', onclick: create }, '＋ Buat scrapbook')));
    body.replaceChildren(h('div.book-grid', {}, bs.map(b => h('a.book', { href: '#/scrapbook/' + b.id }, h('div.book-cover', {}, h('span', {}, '📒'), h('b', {}, b.title)), h('small', {}, `${ps.filter(p => p.scrapbook_id === b.id).length} halaman`)))));
  };
  root.append(pageHead('Scrapbook', 'Buku kenangan buatan tangan — dikerjakan berdua.', h('button.btn', { type: 'button', onclick: create }, '＋ Buku baru')), body); await draw(); return root;
}

async function editor(bookId, preview) {
  const book = (await db.list('scrapbooks')).find(b => b.id === bookId);
  if (!book) return empty('🫥', 'Buku tidak ditemukan.', h('a.btn', { href: '#/scrapbook' }, 'Kembali'));
  let pages = (await db.list('scrapbook_pages', { eq: { scrapbook_id: bookId }, order: ['page_no', 'asc'] })); let idx = 0; let dirty = false;
  const root = h('div.sb'); const stage = h('div.sb-stage'); const side = h('div.sb-side');

  const pageEl = p => {
    const el = h('div.sb-page.bg-' + (p.bg || 'cream'), { data: { id: p.id } });
    (p.data || []).forEach((it, i) => el.append(itemEl(p, it, i)));
    return el;
  };
  function itemEl(p, it, i) {
    const el = h('div.sb-item.t-' + it.type, { style: { left: it.x + '%', top: it.y + '%', width: (it.w || 24) + '%', transform: `rotate(${it.r || 0}deg)`, fontSize: (it.size || 18) + 'px' } });
    if (it.type === 'text') el.append(h('span.script', {}, it.text)); else if (it.type === 'sticker') el.append(it.text); else if (it.type === 'photo') { el.classList.add('polaroid'); el.append(mediaImg(it.path), it.caption ? h('small', {}, it.caption) : null); }
    if (!preview) {
      el.classList.add('movable'); el.tabIndex = 0;
      el.addEventListener('pointerdown', e => {
        if (e.target.closest('.sb-ctl')) return; e.preventDefault(); const r = el.parentElement.getBoundingClientRect(); const sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y; el.setPointerCapture(e.pointerId); el.classList.add('drag');
        const mv = ev => { it.x = Math.max(0, Math.min(90, ox + (ev.clientX - sx) / r.width * 100)); it.y = Math.max(0, Math.min(92, oy + (ev.clientY - sy) / r.height * 100)); el.style.left = it.x + '%'; el.style.top = it.y + '%'; dirty = true; };
        const up = () => { el.classList.remove('drag'); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); };
        el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
      });
      el.append(h('span.sb-ctl', {}, h('button', { type: 'button', title: 'Putar', onclick: () => { it.r = ((it.r || 0) + 8) % 360; dirty = true; redraw(); } }, '↻'), h('button', { type: 'button', title: 'Besar', onclick: () => { it.w = Math.min(70, (it.w || 24) + 4); it.size = (it.size || 18) + 3; dirty = true; redraw(); } }, '＋'), h('button', { type: 'button', title: 'Kecil', onclick: () => { it.w = Math.max(8, (it.w || 24) - 4); it.size = Math.max(10, (it.size || 18) - 3); dirty = true; redraw(); } }, '－'), h('button', { type: 'button', title: 'Hapus', onclick: () => { p.data.splice(i, 1); dirty = true; redraw(); } }, '✕')));
    }
    return el;
  }
  const cur = () => pages[idx];
  function redraw() {
    const p = cur(); stage.replaceChildren(h('div.sb-book', {}, h('div.sb-flip', {}, pageEl(p))), h('div.sb-nav', {}, h('button.btn.sm.ghost', { type: 'button', disabled: idx === 0, onclick: () => go(idx - 1) }, '‹ Sebelumnya'), h('span', {}, `Halaman ${idx + 1} / ${pages.length}`), h('button.btn.sm.ghost', { type: 'button', disabled: idx === pages.length - 1, onclick: () => go(idx + 1) }, 'Berikutnya ›')));
  }
  async function go(n) { await save(true); const dir = n > idx ? 'next' : 'prev'; idx = n; redraw(); const f = stage.querySelector('.sb-flip'); f.classList.add('turn-' + dir); }
  async function save(silent) {
    if (!dirty) return; const p = cur(); await db.update('scrapbook_pages', p.id, { data: p.data, bg: p.bg, is_draft: p.is_draft, updated_at: new Date().toISOString() }); dirty = false; if (!silent) toast('Halaman tersimpan ♡');
  }
  const add = it => { const p = cur(); p.data = [...(p.data || []), { x: 25 + Math.random() * 30, y: 15 + Math.random() * 40, w: 24, r: Math.round((Math.random() - .5) * 12), size: 22, ...it }]; dirty = true; redraw(); };

  if (preview) {
    root.append(pageHead(book.title, 'Pratinjau', [h('a.btn.ghost', { href: '#/scrapbook/' + bookId }, '← Edit'), h('button.btn', { type: 'button', onclick: () => print() }, '🖨️ Cetak / Simpan PDF')]));
    root.append(h('div.sb-print', {}, pages.map(p => h('div.sb-sheet', {}, pageEl(p)))), h('p.muted.small.no-print', {}, 'Di dialog cetak pilih “Simpan sebagai PDF” untuk mengekspor.'));
    return root;
  }

  const bgSel = h('select', { 'aria-label': 'Latar', onchange: e => { cur().bg = e.target.value; dirty = true; redraw(); } }, BGS.map(([v, l]) => h('option', { value: v }, l)));
  const photoIn = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async e => { const f = e.target.files[0]; if (!f) return; try { const path = await uploadMedia(f, 'scrapbook'); add({ type: 'photo', path, w: 34, caption: '' }); } catch (er) { toast(er.message, 'err'); } e.target.value = ''; } });
  const unsub = on('change', async d => { if (!root.isConnected) return unsub(); if (d?.table === 'scrapbook_pages' && !dirty && d.type !== 'INSERT') { pages = await db.list('scrapbook_pages', { eq: { scrapbook_id: bookId }, order: ['page_no', 'asc'] }); idx = Math.min(idx, pages.length - 1); redraw(); } });

  side.append(
    card('Tambah elemen', h('div.sb-tools', {}, h('button.btn.sm', { type: 'button', onclick: async () => { const v = await formModal({ title: 'Teks', fields: [{ name: 'text', label: 'Tulisan / cerita', type: 'textarea', rows: 3, required: true }] }); if (v) add({ type: 'text', text: v.text, w: 34, size: 20 }); } }, '✍️ Teks'),
      h('button.btn.sm', { type: 'button', onclick: () => photoIn.click() }, '🖼️ Foto'), h('button.btn.sm', { type: 'button', onclick: async () => { const v = await formModal({ title: 'Tanggal & lokasi', fields: [{ name: 'date', label: 'Tanggal', type: 'date', default: ymd() }, { name: 'loc', label: 'Lokasi' }] }); if (v) add({ type: 'text', text: `${fmtDate(v.date)}${v.loc ? ' · 📍' + v.loc : ''}`, w: 40, size: 16 }); } }, '📅 Tanggal')), photoIn),
    card('Stiker & pita', h('div.sticker-row', {}, STICKERS.map(s => h('button', { type: 'button', 'aria-label': 'Stiker ' + s, onclick: () => add({ type: 'sticker', text: s, w: 12, size: 36 }) }, s)))),
    card('Halaman', h('label.field', {}, h('span', {}, 'Latar'), bgSel),
      h('label.field', {}, h('span', {}, 'Tata letak cepat'), h('select', { onchange: e => { const v = e.target.value; e.target.value = 'free'; if (v === 'polaroids') { [[8, 12], [36, 30], [62, 12]].forEach(([x, y], i) => add({ type: 'text', text: '📷 foto ' + (i + 1), x, y, w: 28, size: 16 })); toast('Ganti teks placeholder dengan foto lewat tombol Foto.'); } if (v === 'hero') { add({ type: 'text', text: 'Judul momen kita', x: 8, y: 6, w: 70, size: 26 }); add({ type: 'text', text: 'Ceritakan di sini…', x: 8, y: 72, w: 80, size: 18 }); } } }, LAYOUTS.map(([v, l]) => h('option', { value: v }, l)))),
      h('div.row-actions', {}, h('button.btn.sm', { type: 'button', onclick: async () => { cur().is_draft = false; dirty = true; await save(); notifyPartner('scrapbook', `Halaman scrapbook diperbarui: ${book.title}`, '', '#/scrapbook/' + bookId); } }, '💾 Simpan'), h('button.btn.sm.ghost', { type: 'button', onclick: async () => { cur().is_draft = true; dirty = true; await save(); toast('Disimpan sebagai draf'); } }, 'Draf'))),
    card('Buku', h('div.row-actions', {}, h('button.btn.sm', { type: 'button', onclick: async () => { await save(true); const p = await db.insert('scrapbook_pages', { scrapbook_id: bookId, page_no: pages.length + 1, data: [], bg: 'cream', is_draft: true }); pages.push(p); idx = pages.length - 1; redraw(); } }, '＋ Halaman'),
      h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (pages.length < 2) return toast('Buku minimal punya 1 halaman', 'err'); if (!await confirmBox('Hapus halaman ini?', 'Hapus')) return; await db.remove('scrapbook_pages', cur().id); pages.splice(idx, 1); idx = Math.max(0, idx - 1); dirty = false; redraw(); } }, '🗑 Halaman'),
      h('a.btn.sm.ghost', { href: '#/scrapbook/' + bookId + '/preview', onclick: () => save(true) }, '👁 Pratinjau / PDF'),
      h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (!await confirmBox('Hapus seluruh buku?', 'Hapus')) return; await db.remove('scrapbooks', bookId); location.hash = '#/scrapbook'; } }, '🗑 Buku'))));
  root.append(pageHead(book.title, 'Seret elemen untuk menata. Perubahan tersinkron ke pasanganmu.', [h('a.btn.ghost', { href: '#/scrapbook' }, '← Semua buku')]), h('div.sb-layout', {}, stage, side));
  bgSel.value = cur().bg || 'cream'; redraw();
  window.addEventListener('beforeunload', () => { if (dirty) save(true); });
  return root;
}
