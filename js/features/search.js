import { h, fmtDate, debounce } from '../core/util.js';
import { db, S, isMe, mediaImg } from '../core/db.js';
import { pageHead, empty, chip } from '../core/ui.js';

const TYPES = [['all', 'Semua'], ['media', '🖼️ Foto/Video'], ['folders', '📁 Folder'], ['scrapbook', '📒 Scrapbook'], ['letters', '💌 Surat'], ['timeline', '🕰️ Linimasa'], ['notes', '📝 Catatan'], ['places', '📍 Tempat']];

export default async function search() {
  const root = h('div'); const out = h('div.results'); let q = '', type = 'all', from = '', to = '';
  const input = h('input', { type: 'search', placeholder: 'Cari kenangan, surat, catatan, tempat…', 'aria-label': 'Cari', oninput: debounce(e => { q = e.target.value.trim().toLowerCase(); run(); }, 250) });
  const df = h('input', { type: 'date', 'aria-label': 'Dari tanggal', onchange: e => { from = e.target.value; run(); } }), dt = h('input', { type: 'date', 'aria-label': 'Sampai tanggal', onchange: e => { to = e.target.value; run(); } });
  const chips = h('div.chips', {}, TYPES.map(([id, l]) => h('button.chip' + (id === type ? '.on' : ''), { type: 'button', onclick: e => { type = id; chips.querySelectorAll('.chip').forEach(c => c.classList.remove('on')); e.currentTarget.classList.add('on'); run(); } }, l)));
  const ok = (text, date) => { if (q && !text.toLowerCase().includes(q)) return false; const d = (date || '').slice(0, 10); if (from && d < from) return false; if (to && d > to) return false; return true; };
  async function run() {
    if (!q && !from && !to) return out.replaceChildren(h('p.muted', {}, 'Ketik kata kunci atau pilih rentang tanggal.'));
    const R = [], want = t => type === 'all' || type === t;
    if (want('media')) (await db.list('media')).filter(m => ok(`${m.caption || ''} ${m.story || ''}`, m.taken_on || m.created_at)).forEach(m => R.push({ ic: '🖼️', t: m.caption || (m.kind === 'video' ? 'Video' : 'Foto'), d: m.taken_on || m.created_at, href: '#/folders/' + m.folder_id, path: m.path }));
    if (want('folders')) (await db.list('memory_folders')).filter(f => ok(`${f.title} ${f.description || ''} ${f.location || ''}`, f.event_date || f.created_at)).forEach(f => R.push({ ic: '📁', t: f.title, s: f.location, d: f.event_date || f.created_at, href: '#/folders/' + f.id }));
    if (want('scrapbook')) (await db.list('scrapbooks')).filter(b => ok(b.title, b.created_at)).forEach(b => R.push({ ic: '📒', t: b.title, d: b.created_at, href: '#/scrapbook/' + b.id }));
    if (want('letters')) (await db.list('letters')).filter(l => !l.is_draft || isMe(l.from_user)).filter(l => ok(`${l.title || ''} ${l.body || ''}`, l.created_at)).forEach(l => R.push({ ic: '💌', t: l.title || 'Surat tanpa judul', d: l.created_at, href: '#/letters' }));
    if (want('timeline')) (await db.list('timeline_events')).filter(e => ok(`${e.title} ${e.description || ''} ${e.location || ''}`, e.event_date)).forEach(e => R.push({ ic: '🕰️', t: e.title, s: e.location, d: e.event_date, href: '#/timeline' }));
    if (want('notes')) (await db.list('notes')).filter(n => ok(`${n.title} ${n.body || ''} ${(n.checklist || []).map(c => c.t).join(' ')}`, n.created_at)).forEach(n => R.push({ ic: '📝', t: n.title, d: n.created_at, href: '#/notes' }));
    if (want('places')) (await db.list('places')).filter(p => ok(`${p.name} ${p.description || ''}`, p.visited_on || p.created_at)).forEach(p => R.push({ ic: '📍', t: p.name, d: p.visited_on || p.created_at, href: '#/map' }));
    R.sort((a, b) => String(b.d).localeCompare(String(a.d)));
    out.replaceChildren(...(R.length ? [h('small.muted', {}, `${R.length} hasil`), h('ul.result-list', {}, R.slice(0, 80).map(r => h('li', {}, h('a', { href: r.href }, r.path ? h('span.thumb.sm', {}, mediaImg(r.path)) : h('span', {}, r.ic), h('div', {}, h('b', {}, r.t), h('small', {}, [r.s, r.d ? fmtDate(r.d) : ''].filter(Boolean).join(' · ')))))))] : [empty('🔍', 'Tidak ada hasil.')]));
  }
  root.append(pageHead('Cari Kenangan', 'Cari di foto, folder, scrapbook, surat, linimasa, catatan, dan tempat.'), input, chips, h('div.date-range', {}, h('label', {}, 'Dari ', df), h('label', {}, 'Sampai ', dt)), out); run(); return root;
}
