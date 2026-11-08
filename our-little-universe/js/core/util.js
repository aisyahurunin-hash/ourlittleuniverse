// Util kecil: DOM helper, tanggal, modal, form, gambar
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** h('div.card#x', {onclick, style:{}}, child, ...) */
export function h(tag, props = {}, ...kids) {
  const m = tag.match(/^([a-zA-Z0-9-]*)((?:[.#][\w-]+)*)$/) || [];
  const el = document.createElement(m[1] || 'div');
  (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, n) => { t === '.' ? el.classList.add(n) : (el.id = n); });
  if (props && (props.nodeType || typeof props === 'string' || Array.isArray(props))) { kids.unshift(props); props = {}; }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') v.split(' ').filter(Boolean).forEach(c => el.classList.add(c));
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden') el[k] = !!v;
    else if (k === 'data') Object.entries(v).forEach(([dk, dv]) => (el.dataset[dk] = dv));
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = k => {
    if (k == null || k === false) return;
    if (Array.isArray(k)) return k.forEach(add);
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  };
  kids.forEach(add);
  return el;
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export function debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---------- tanggal ----------
export const pad = n => String(n).padStart(2, '0');
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtDate = (d, o = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  d ? new Date(typeof d === 'string' && d.length === 10 ? parseYmd(d) : d).toLocaleDateString('id-ID', o) : '';
export const fmtTime = d => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
export const fmtDateTime = d => d ? `${fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' })} ${fmtTime(d)}` : '';
export function ago(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return Math.floor(s / 60) + ' mnt lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  if (s < 86400 * 7) return Math.floor(s / 86400) + ' hari lalu';
  return fmtDate(d, { day: 'numeric', month: 'short' });
}
export function daysBetween(a, b = new Date()) {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()), B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((B - A) / 86400000);
}
export function ymdBetween(start, end = new Date()) {
  let y = end.getFullYear() - start.getFullYear(), m = end.getMonth() - start.getMonth(), d = end.getDate() - start.getDate();
  if (d < 0) { m--; d += new Date(end.getFullYear(), end.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { years: y, months: m, days: d };
}
/** tanggal berikutnya dari tanggal berulang tahunan */
export function nextAnnual(dateStr, from = new Date()) {
  const d = parseYmd(dateStr);
  let n = new Date(from.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (n < today) n = new Date(from.getFullYear() + 1, d.getMonth(), d.getDate());
  return n;
}
export const toLocalInput = d => { d = new Date(d); return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// ---------- UI ----------
export function toast(msg, kind = 'ok') {
  let box = $('#toasts');
  if (!box) { box = h('div#toasts', { 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div.toast.' + kind, {}, msg);
  box.append(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
}

export function modal({ title, body, actions = [], wide = false, onClose } = {}) {
  const back = h('div.modal-back');
  const box = h('div.modal' + (wide ? '.wide' : ''), { role: 'dialog', 'aria-modal': 'true' },
    h('div.modal-head', {}, h('h3', {}, title || ''), h('button.x', { type: 'button', 'aria-label': 'Tutup', onclick: () => close() }, '✕')),
    h('div.modal-body', {}, body),
    actions.length ? h('div.modal-foot', {}, actions) : null);
  back.append(box);
  back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  function close(v) { document.removeEventListener('keydown', onKey); back.remove(); onClose && onClose(v); }
  document.body.append(back);
  return { close, el: box };
}

export const confirmBox = (msg, okLabel = 'Ya') => new Promise(res => {
  const m = modal({
    title: 'Konfirmasi', body: h('p', {}, msg), onClose: v => res(!!v),
    actions: [h('button.btn.ghost', { onclick: () => m.close(false) }, 'Batal'), h('button.btn', { onclick: () => m.close(true) }, okLabel)]
  });
});

/** Form modal. fields: [{name,label,type,options,required,placeholder,hint}] -> Promise<values|null> */
export function formModal({ title, fields, initial = {}, submit = 'Simpan', wide = false }) {
  return new Promise(res => {
    const inputs = {};
    const rows = fields.map(f => {
      let inp;
      const v = initial[f.name] ?? f.default ?? '';
      if (f.type === 'textarea') inp = h('textarea', { rows: f.rows || 4, placeholder: f.placeholder || '', value: v });
      else if (f.type === 'select') inp = h('select', {}, f.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return h('option', { value: val, selected: String(val) === String(v) }, lab); }));
      else if (f.type === 'checkbox') inp = h('input', { type: 'checkbox', checked: !!v });
      else if (f.type === 'file') inp = h('input', { type: 'file', accept: f.accept || 'image/*', multiple: !!f.multiple });
      else inp = h('input', { type: f.type || 'text', placeholder: f.placeholder || '', value: v, min: f.min, max: f.max, step: f.step });
      if (f.required && f.type !== 'checkbox') inp.required = true;
      inputs[f.name] = { inp, f };
      return h('label.field' + (f.type === 'checkbox' ? '.check' : ''), {}, f.type === 'checkbox' ? [inp, h('span', {}, f.label)] : [h('span', {}, f.label), inp], f.hint ? h('small', {}, f.hint) : null);
    });
    const form = h('form.form', { onsubmit: e => { e.preventDefault(); const out = {}; for (const [k, { inp, f }] of Object.entries(inputs)) { out[k] = f.type === 'checkbox' ? inp.checked : f.type === 'file' ? (f.multiple ? [...inp.files] : inp.files[0] || null) : f.type === 'number' ? (inp.value === '' ? null : Number(inp.value)) : inp.value.trim(); } m.close(out); } },
      rows, h('div.modal-foot', {}, h('button.btn.ghost', { type: 'button', onclick: () => m.close(null) }, 'Batal'), h('button.btn', { type: 'submit' }, submit)));
    const m = modal({ title, body: form, wide, onClose: v => res(v || null) });
    setTimeout(() => form.querySelector('input,textarea,select')?.focus(), 30);
  });
}

// ---------- gambar ----------
export function resizeImage(file, max = 1800, quality = 0.86) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return resolve(file);
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(url); b ? resolve(new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })) : resolve(file); }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibaca')); };
    img.src = url;
  });
}

export const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
export const MAX_UPLOAD = 50 * 1024 * 1024;
export function validateFile(f) {
  if (!ALLOWED_MEDIA.includes(f.type)) throw new Error(`Tipe file tidak didukung: ${f.name}`);
  if (f.size > MAX_UPLOAD) throw new Error(`${f.name} melebihi 50 MB`);
}

export function download(name, blobOrText, type = 'application/json') {
  const b = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type });
  const a = h('a', { href: URL.createObjectURL(b), download: name }); document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Hati/kembang api kecil saat milestone */
export function celebrate(emoji = ['💖', '✨', '🎀', '🌸'], n = 18) {
  if (reducedMotion()) return;
  for (let i = 0; i < n; i++) {
    const s = h('span.confetti', { style: { left: Math.random() * 100 + 'vw', animationDelay: Math.random() * .5 + 's', fontSize: 14 + Math.random() * 20 + 'px' } }, pick(emoji));
    document.body.append(s); setTimeout(() => s.remove(), 3200);
  }
}
