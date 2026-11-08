import { h, fmtDate, parseYmd } from '../core/util.js';
import { db, S, mediaImg, isMe } from '../core/db.js';
import { pageHead, card, empty } from '../core/ui.js';
import { lightbox } from './_shared.js';
import { catOf } from '../core/content.js';

/** "Pada hari ini…" — hanya dari data yang benar-benar tersimpan. */
export async function onThisDay() {
  const now = new Date(), M = now.getMonth(), D = now.getDate(), Y = now.getFullYear();
  const hit = s => { if (!s) return null; const d = String(s).length === 10 ? parseYmd(s) : new Date(s); return d.getMonth() === M && d.getDate() === D && d.getFullYear() < Y ? Y - d.getFullYear() : null; };
  const out = [];
  (await db.list('media')).forEach(m => { const y = hit(m.taken_on || m.created_at); if (y) out.push({ y, kind: 'media', m }); });
  (await db.list('memory_folders')).forEach(f => { const y = hit(f.event_date); if (y) out.push({ y, kind: 'folder', f }); });
  (await db.list('timeline_events')).forEach(t => { const y = hit(t.event_date); if (y) out.push({ y, kind: 'event', t }); });
  (await db.list('letters')).forEach(l => { if (l.is_draft) return; const y = hit(l.created_at); if (y) out.push({ y, kind: 'letter', l }); });
  (await db.list('scrapbook_pages')).forEach(p => { const y = hit(p.created_at); if (y) out.push({ y, kind: 'page', p }); });
  return out.sort((a, b) => a.y - b.y);
}

export default async function memories() {
  const root = h('div');
  const otd = await onThisDay();
  const media = (await db.list('media', { order: ['created_at', 'desc'] }));
  root.append(pageHead('Kenangan Kita', 'Semua yang sudah kalian simpan, dan yang kembali mengetuk hari ini.', h('a.btn.ghost', { href: '#/wrapped' }, '🎁 Relationship Wrapped')));
  root.append(card('🕰️ Pada hari ini…', otd.length ? h('div.otd', {}, otd.map(o => h('div.otd-item', {}, h('span.chip.on', {}, `${o.y} tahun lalu`),
    o.kind === 'media' ? h('button.thumb', { type: 'button', onclick: () => lightbox([{ path: o.m.path, kind: o.m.kind, caption: o.m.caption }]) }, mediaImg(o.m.path)) : null,
    o.kind === 'folder' ? h('a', { href: '#/folders/' + o.f.id }, '📁 ' + o.f.title) : null,
    o.kind === 'event' ? h('span', {}, '🕰️ ' + o.t.title) : null,
    o.kind === 'letter' ? h('a', { href: '#/letters' }, `${catOf(o.l.category).e} Surat: ${o.l.title || 'tanpa judul'}`) : null,
    o.kind === 'page' ? h('a', { href: '#/scrapbook' }, '📒 Halaman scrapbook') : null))) : h('p.muted', {}, 'Belum ada kenangan dari tahun-tahun sebelumnya pada tanggal ini. Terus simpan kenangan — suatu hari mereka akan kembali ♡')));
  root.append(card(`🖼️ Semua foto & video (${media.length})`, media.length ? h('div.media-grid.compact', {}, media.map((m, i) => h('figure.media', {}, h('button.media-open', { type: 'button', onclick: () => lightbox(media.map(x => ({ path: x.path, kind: x.kind, caption: x.caption, story: x.story })), i) }, m.kind === 'video' ? h('div.vid', {}, '▶') : mediaImg(m.path, { alt: m.caption || '' }))))) : empty('📷', 'Belum ada foto. Buat folder dan unggah yang pertama.', h('a.btn', { href: '#/folders' }, 'Ke Folder Kenangan'))));
  return root;
}
