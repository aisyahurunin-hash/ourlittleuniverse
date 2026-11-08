import { h, modal, resizeImage, toast, validateFile } from '../core/util.js';
import { db, S, mediaImg, mediaUrl } from '../core/db.js';

/** Unggah gambar (diperkecil) atau video ke storage privat pasangan. Mengembalikan path. */
export async function uploadMedia(file, folder = 'misc') {
  validateFile(file);
  const f = file.type.startsWith('image/') ? await resizeImage(file) : file;
  return db.upload(f, folder);
}
export async function uploadMany(files, folder, each) {
  const out = []; let i = 0;
  for (const f of files) {
    i++; try { const path = await uploadMedia(f, folder); out.push(await each(path, f)); toast(`Mengunggah ${i}/${files.length}…`); }
    catch (e) { toast(`${f.name}: ${e.message}`, 'err'); }
  }
  return out;
}

/** Lightbox sederhana dengan panah. items: [{path, kind, caption}] */
export function lightbox(items, start = 0) {
  let i = start; const stage = h('div.lb-stage'); const cap = h('p.lb-cap');
  const show = async () => {
    const it = items[i]; stage.replaceChildren(h('span.muted', {}, 'Memuat…'));
    const url = await mediaUrl(it.path).catch(() => null);
    if (!url) return stage.replaceChildren(h('span.muted', {}, 'File tidak tersedia'));
    stage.replaceChildren(it.kind === 'video' ? h('video', { src: url, controls: true, autoplay: true, playsinline: true }) : h('img', { src: url, alt: it.caption || '' }));
    cap.textContent = [it.caption, it.story].filter(Boolean).join(' — ');
  };
  const body = h('div.lightbox', {}, h('button.lb-nav.prev', { type: 'button', 'aria-label': 'Sebelumnya', onclick: () => { i = (i - 1 + items.length) % items.length; show(); } }, '‹'), stage,
    h('button.lb-nav.next', { type: 'button', 'aria-label': 'Berikutnya', onclick: () => { i = (i + 1) % items.length; show(); } }, '›'), cap);
  modal({ title: `${items.length} item`, body, wide: true }); show();
}

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Disalin ♡'); } catch { prompt('Salin manual:', t); }
}
export const partnerName = () => S.partner?.display_name || 'pasanganmu';
export function requirePartner() {
  if (!S.partner) { toast('Pasanganmu belum bergabung. Bagikan kode undangan dari Beranda.', 'err'); return false; }
  return true;
}
