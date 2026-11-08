// Photobooth: kamera sungguhan (getUserMedia). Butuh HTTPS atau localhost + izin kamera dari pengguna.
import { h, toast, download, ymd, fmtDate, sleep, formModal } from '../core/util.js';
import { db, S, notifyPartner } from '../core/db.js';
import { pageHead, card } from '../core/ui.js';
import { STICKERS } from '../core/content.js';
import { uploadMedia } from './_shared.js';

const TEMPLATES = {
  coquette: { name: 'Pink Coquette', bg: '#ffd9e6', border: '#f2a7c3', ink: '#a8456f', deco: '🎀', font: '"Dancing Script", cursive', radius: 24 },
  film: { name: 'Vintage Film', bg: '#1d1b1a', border: '#3a3532', ink: '#f2e6cf', deco: '🎞️', font: '"Courier New", monospace', radius: 4, perf: true },
  polaroid: { name: 'Polaroid', bg: '#fffdf8', border: '#e8e1d4', ink: '#5b4a3a', deco: '📷', font: '"Caveat", cursive', radius: 6 },
  classic: { name: 'Classic Photostrip', bg: '#ffffff', border: '#222222', ink: '#222222', deco: '★', font: 'Georgia, serif', radius: 0 },
  letter: { name: 'Love Letter', bg: '#fff1e6', border: '#e3a1a1', ink: '#9b3d4f', deco: '💌', font: '"Dancing Script", cursive', radius: 14 },
  korean: { name: 'Korean Style', bg: '#f6e8ff', border: '#cdb4ff', ink: '#6c4bb5', deco: '🫧', font: '"Quicksand", sans-serif', radius: 18 }
};
const FILTERS = { none: 'Asli', bw: 'Hitam-putih', sepia: 'Sepia', pink: 'Pink', vivid: 'Cerah', soft: 'Lembut' };

function applyFilter(ctx, w, hh, f) {
  if (f === 'none') return; const im = ctx.getImageData(0, 0, w, hh), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]; const l = .3 * r + .59 * g + .11 * b;
    if (f === 'bw') r = g = b = l;
    else if (f === 'sepia') { r = Math.min(255, l * 1.2 + 40); g = Math.min(255, l * 1.0 + 20); b = l * .8; }
    else if (f === 'pink') { r = Math.min(255, r * 1.05 + 22); g = g * .95 + 6; b = Math.min(255, b * 1.05 + 28); }
    else if (f === 'vivid') { r = Math.min(255, l + (r - l) * 1.5); g = Math.min(255, l + (g - l) * 1.5); b = Math.min(255, l + (b - l) * 1.5); }
    else if (f === 'soft') { r = r * .85 + 38; g = g * .85 + 34; b = b * .85 + 38; }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(im, 0, 0);
}
const CSS_FILTER = { none: '', bw: 'grayscale(1)', sepia: 'sepia(.8)', pink: 'sepia(.3) hue-rotate(300deg) saturate(1.4)', vivid: 'saturate(1.6)', soft: 'brightness(1.08) contrast(.9)' };

export default async function photobooth() {
  const root = h('div.booth'); const st = { shots: 3, tpl: 'coquette', filter: 'none', count: 3, caption: '', stamp: true, stickers: new Set(['💗', '✨']), stream: null };
  const video = h('video', { autoplay: true, playsinline: true, muted: true }); const overlay = h('div.booth-count', {}, ''); const flash = h('div.booth-flash');
  const status = h('p.muted', {}, 'Kamera belum aktif. Tekan “Nyalakan kamera” — browser akan meminta izinmu.');
  const result = h('div.booth-result'); const shotBtn = h('button.btn', { type: 'button', disabled: true, onclick: run }, '📸 Mulai foto');
  const camBtn = h('button.btn', { type: 'button', onclick: startCam }, '🎥 Nyalakan kamera');

  async function startCam() {
    if (!navigator.mediaDevices?.getUserMedia) return toast('Browser/konteks ini tidak mendukung kamera (butuh HTTPS atau localhost).', 'err');
    try { st.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }); video.srcObject = st.stream; await video.play(); shotBtn.disabled = false; camBtn.textContent = '🔄 Kamera aktif'; status.textContent = 'Kamera siap. Atur template & filter, lalu mulai.'; }
    catch (e) { toast(e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan lewat pengaturan situs di browser.' : 'Kamera tidak tersedia: ' + e.message, 'err'); }
  }
  const stopCam = () => { st.stream?.getTracks().forEach(t => t.stop()); st.stream = null; };
  const obs = new MutationObserver(() => { if (!root.isConnected) { stopCam(); obs.disconnect(); } }); setTimeout(() => obs.observe(document.body, { childList: true, subtree: true }), 500);

  function grab() {
    const c = document.createElement('canvas'); const vw = video.videoWidth || 640, vh = video.videoHeight || 480; const tw = 800, th = 600; c.width = tw; c.height = th; const x = c.getContext('2d');
    const k = Math.max(tw / vw, th / vh); const sw = tw / k, sh = th / k; x.translate(tw, 0); x.scale(-1, 1); x.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, tw, th); x.setTransform(1, 0, 0, 1, 0, 0);
    applyFilter(x, tw, th, st.filter); return c;
  }
  async function run() {
    shotBtn.disabled = true; result.replaceChildren(); const shots = [];
    for (let i = 0; i < st.shots; i++) {
      for (let s = st.count; s > 0; s--) { overlay.textContent = s; overlay.classList.add('on'); await sleep(900); }
      overlay.classList.remove('on'); flash.classList.add('on'); shots.push(grab()); await sleep(180); flash.classList.remove('on'); status.textContent = `Foto ${i + 1}/${st.shots} ✓`; await sleep(500);
    }
    compose(shots); shotBtn.disabled = false;
  }
  function compose(shots) {
    const T = TEMPLATES[st.tpl], pad = 36, pw = 520, ph = 390, gap = 22, foot = 150, W = pw + pad * 2, H = pad + shots.length * (ph + gap) + foot - gap + 20;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = T.bg; x.fillRect(0, 0, W, H); x.strokeStyle = T.border; x.lineWidth = 8; x.strokeRect(6, 6, W - 12, H - 12);
    shots.forEach((s, i) => { const y = pad + i * (ph + gap); x.save(); x.beginPath(); if (x.roundRect) x.roundRect(pad, y, pw, ph, T.radius); else x.rect(pad, y, pw, ph); x.clip(); x.drawImage(s, pad, y, pw, ph); x.restore();
      x.strokeStyle = T.border; x.lineWidth = 4; x.beginPath(); if (x.roundRect) x.roundRect(pad, y, pw, ph, T.radius); else x.rect(pad, y, pw, ph); x.stroke();
      if (T.perf) { x.fillStyle = '#f2e6cf'; for (let k = 0; k < ph; k += 30) { x.fillRect(10, y + k + 6, 12, 16); x.fillRect(W - 22, y + k + 6, 12, 16); } }
      [...st.stickers].forEach((e, n) => { x.font = '44px serif'; const px = pad + 10 + ((n * 211 + i * 97) % (pw - 70)), py = y + 50 + ((n * 83 + i * 131) % (ph - 70)); x.fillText(e, px, py); }); });
    const fy = H - foot + 14; x.fillStyle = T.ink; x.textAlign = 'center'; x.font = `34px ${T.font}`; x.fillText(`${T.deco} ${st.caption || S.couple.name} ${T.deco}`, W / 2, fy + 40, W - 60);
    if (st.stamp) { x.font = `22px ${T.font}`; x.fillText(fmtDate(new Date()), W / 2, fy + 82); }
    x.font = `18px ${T.font}`; x.globalAlpha = .7; x.fillText(`${S.profile.display_name}${S.partner ? ' & ' + S.partner.display_name : ''}`, W / 2, fy + 112); x.globalAlpha = 1;
    c.toBlob(async blob => {
      const url = URL.createObjectURL(blob); status.textContent = 'Selesai! Simpan atau unduh hasilnya.';
      result.replaceChildren(h('img.booth-strip', { src: url, alt: 'Hasil photobooth' }), h('div.row-actions', {},
        h('button.btn', { type: 'button', onclick: () => download(`photobooth-${ymd()}.png`, blob) }, '⬇️ Unduh'), h('button.btn', { type: 'button', onclick: () => saveToFolder(blob) }, '📁 Simpan ke Folder Kenangan'), h('button.btn.ghost', { type: 'button', onclick: () => result.replaceChildren() }, 'Ulangi')));
    }, 'image/png');
  }
  async function saveToFolder(blob) {
    const fs = await db.list('memory_folders', { order: ['created_at', 'desc'] });
    const v = await formModal({ title: 'Simpan ke folder', fields: [{ name: 'folder', label: 'Folder', type: 'select', options: [['__new', '＋ Folder baru “Photobooth”'], ...fs.map(f => [f.id, f.title])] }], submit: 'Simpan' }); if (!v) return;
    try {
      let fid = v.folder; if (fid === '__new') fid = (await db.insert('memory_folders', { title: 'Photobooth', event_date: ymd(), description: 'Hasil photobooth kita' })).id;
      const path = await uploadMedia(new File([blob], `photobooth-${Date.now()}.png`, { type: 'image/png' }), 'folders/' + fid);
      await db.insert('media', { folder_id: fid, kind: 'photo', path, caption: st.caption || 'Photobooth', taken_on: ymd() });
      notifyPartner('photos', 'Foto photobooth baru', '', '#/folders/' + fid); toast('Tersimpan di Folder Kenangan ♡');
    } catch (e) { toast(e.message, 'err'); }
  }

  const sel = (opts, cur, on) => h('select', { onchange: e => on(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: String(v) === String(cur) }, l)));
  root.append(pageHead('Photobooth', 'Foto berdua langsung dari kameramu — tanpa unggah ke mana pun sampai kamu menyimpannya.'),
    h('div.booth-layout', {}, h('div.booth-cam', {}, h('div.booth-screen', {}, video, overlay, flash), status, h('div.row-actions', {}, camBtn, shotBtn)),
      card('Pengaturan', h('label.field', {}, h('span', {}, 'Jumlah foto'), sel([[2, '2 foto'], [3, '3 foto'], [4, '4 foto']], st.shots, v => st.shots = +v)),
        h('label.field', {}, h('span', {}, 'Template'), sel(Object.entries(TEMPLATES).map(([k, t]) => [k, t.name]), st.tpl, v => st.tpl = v)),
        h('label.field', {}, h('span', {}, 'Filter'), sel(Object.entries(FILTERS), st.filter, v => { st.filter = v; video.style.filter = CSS_FILTER[v]; })),
        h('label.field', {}, h('span', {}, 'Hitung mundur (detik)'), sel([[2, '2'], [3, '3'], [5, '5']], st.count, v => st.count = +v)),
        h('label.field', {}, h('span', {}, 'Caption'), h('input', { type: 'text', maxlength: 40, placeholder: S.couple.name, oninput: e => st.caption = e.target.value })),
        h('label.field.check', {}, h('input', { type: 'checkbox', checked: true, onchange: e => st.stamp = e.target.checked }), h('span', {}, 'Cap tanggal')),
        h('div.sticker-row', {}, STICKERS.slice(0, 12).map(s => h('button.on', { type: 'button', 'aria-pressed': st.stickers.has(s), onclick: e => { st.stickers.has(s) ? st.stickers.delete(s) : st.stickers.add(s); e.currentTarget.classList.toggle('on'); } }, s))))), result);
  video.style.transform = 'scaleX(-1)';
  return root;
}
