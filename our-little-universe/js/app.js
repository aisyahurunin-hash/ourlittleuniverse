// Boot, auth, onboarding pasangan, router, pergantian tema.
import { h, $, toast, modal, confirmBox, formModal, celebrate, esc, fmtDate } from './core/util.js';
import { db, S, on, isLive, nameOf, isMe } from './core/db.js';
import { FEATURES, GROUPS, itemsFor } from './core/nav.js';
import { THEMES, THEME_LIST, getTheme, loadFont, DEFAULT_THEME } from './themes/index.js';
import { spinner } from './core/ui.js';
import { AFFECTIONS } from './core/content.js';
import * as sharing from './core/sharing.js';
import { initFx } from './core/fx.js';
import { applyPrefs } from './core/prefs.js';

const root = $('#app');
let shell = null, theme = getTheme(localStorage.getItem('ols_theme') || DEFAULT_THEME);
const unreadCbs = new Set();

// ---------- tema ----------
function applyTheme(id) {
  theme = getTheme(id); document.body.dataset.theme = theme.id; loadFont(theme);
  localStorage.setItem('ols_theme', theme.id);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme.swatch[0]);
}
async function setTheme(id) {
  applyTheme(id);
  if (S.user) { try { await db.updateProfile({ theme: id }); } catch (e) { console.warn(e); } }
  if (S.couple) { mountShell(); } else { route(); }
}
function pickTheme() {
  const grid = h('div.theme-grid', {}, THEME_LIST.map(t => h('button.theme-card' + (t.id === theme.id ? '.on' : ''), { type: 'button', onclick: () => { m.close(); setTheme(t.id); } },
    h('div.swatches', {}, t.swatch.map(c => h('i', { style: { background: c } }))), h('b', {}, t.name), h('small', {}, t.blurb))));
  const m = modal({ title: '🎨 Pilih tema — struktur & tampilan berubah total', body: grid, wide: true });
}
export const themeApi = { pickTheme, setTheme, get current() { return theme; } };

// ---------- notifikasi masuk ----------
async function unreadCount() { if (!S.couple) return 0; try { return (await db.list('notifications', { eq: { read: false } })).length; } catch { return 0; } }
async function pushUnread() { const n = await unreadCount(); unreadCbs.forEach(cb => cb(n)); }
function watchUnread(cb) { unreadCbs.add(cb); unreadCount().then(cb); }
function showAffection(kind, from) {
  const a = AFFECTIONS.find(x => x.id === kind) || AFFECTIONS[2];
  const ov = h('div.aff-pop', { role: 'status' }, h('div.aff-e', {}, a.e), h('p', {}, `${from} mengirim ${a.l.toLowerCase()} untukmu`));
  document.body.append(ov); celebrate([a.e, '💗', '✨'], 14); setTimeout(() => ov.remove(), 3600);
}
function listenIncoming() {
  on('change', async d => {
    if (!S.user) return;
    if (d?.table === 'notifications') {
      pushUnread();
      const r = d.row;
      if (d.type === 'INSERT' && r && r.to_user === S.user.id) {
        toast(`🔔 ${r.title}`);
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification(r.title, { body: r.body || '' });
      }
    }
    if (d?.table === 'affections' && d.type === 'INSERT' && d.row && d.row.to_user === S.user.id) showAffection(d.row.kind, nameOf(d.row.from_user));
    if (d?.table === '*') pushUnread();
  });
}
// Kapsul & surat terjadwal yang baru terbuka
async function announceUnlocks() {
  const seen = k => localStorage.getItem('ols_seen_' + k), mark = k => localStorage.setItem('ols_seen_' + k, '1');
  try {
    const caps = await db.capsuleIndex();
    caps.filter(c => new Date(c.open_at) <= new Date() && !seen('cap' + c.id)).forEach(c => { mark('cap' + c.id); toast(`⏳ Kapsul waktu “${c.title}” sudah terbuka!`); celebrate(); });
    (await db.list('letters')).filter(l => isMe(l.to_user) && l.unlock_at && new Date(l.unlock_at) <= new Date() && !l.opened_at && !seen('let' + l.id)).forEach(l => { mark('let' + l.id); toast('💌 Ada surat terjadwal yang baru terbuka!'); });
  } catch (e) { console.warn(e); }
}

// ---------- layar auth ----------
function authScreen(view = 'login') {
  document.body.dataset.theme = theme.id; loadFont(theme);
  const err = h('p.form-err', { role: 'alert' }, '');
  const email = h('input', { type: 'email', required: true, autocomplete: 'email', placeholder: 'email@kamu.com' });
  const pw = h('input', { type: 'password', required: true, minlength: 8, autocomplete: view === 'signup' ? 'new-password' : 'current-password', placeholder: 'minimal 8 karakter' });
  const name = h('input', { type: 'text', required: true, maxlength: 40, placeholder: 'Nama panggilanmu' });
  const titles = { login: 'Masuk ke universe kalian', signup: 'Buat akun', forgot: 'Lupa kata sandi', recovery: 'Kata sandi baru' };
  const submit = async e => {
    e.preventDefault(); err.textContent = ''; const btn = e.submitter; btn.disabled = true;
    try {
      if (view === 'login') { await db.signIn(email.value.trim(), pw.value); await afterAuth(); }
      else if (view === 'signup') { const r = await db.signUp(email.value.trim(), pw.value, name.value.trim()); if (r.needsConfirm) { err.className = 'form-ok'; err.textContent = 'Cek emailmu untuk konfirmasi, lalu masuk.'; } else await afterAuth(); }
      else if (view === 'forgot') { await db.reset(email.value.trim()); err.className = 'form-ok'; err.textContent = isLive ? 'Tautan reset dikirim ke emailmu.' : 'Mode demo: lanjut membuat kata sandi baru.'; }
      else if (view === 'recovery') { await db.updatePassword(pw.value); toast('Kata sandi diperbarui ♡'); authScreen('login'); }
    } catch (ex) { err.className = 'form-err'; err.textContent = ex.message; } finally { btn.disabled = false; }
  };
  const link = (v, t) => h('button.linklike', { type: 'button', onclick: () => authScreen(v) }, t);
  root.replaceChildren(h('div.auth-screen', {},
    h('div.auth-hero', {}, h('div.auth-logo', {}, '💗'), h('h1', {}, 'Our Little Universe'), h('p', {}, 'Dua orang, satu semesta kecil.')),
    h('form.card.auth-card', { onsubmit: submit }, h('h3.card-title', {}, titles[view]),
      !isLive ? h('p.demo-note', {}, '🧪 MODE DEMO LOKAL — data hanya tersimpan di browser ini dan tidak tersinkron antar perangkat. Isi js/config.js untuk mode online.') : null,
      view === 'signup' ? h('label.field', {}, h('span', {}, 'Nama'), name) : null,
      view !== 'recovery' ? h('label.field', {}, h('span', {}, 'Email'), email) : null,
      view !== 'forgot' ? h('label.field', {}, h('span', {}, view === 'recovery' ? 'Kata sandi baru' : 'Kata sandi'), pw) : null,
      err, h('button.btn.block', { type: 'submit' }, { login: 'Masuk', signup: 'Daftar', forgot: 'Kirim tautan reset', recovery: 'Simpan' }[view]),
      h('div.auth-links', {}, view !== 'login' ? link('login', 'Sudah punya akun? Masuk') : [link('signup', 'Buat akun baru'), ' · ', link('forgot', 'Lupa kata sandi?')])),
    h('div.auth-themes', {}, h('small', {}, 'Tampilan: '), THEME_LIST.map(t => h('button.chip' + (t.id === theme.id ? '.on' : ''), { type: 'button', onclick: () => { applyTheme(t.id); authScreen(view); } }, t.name)))));
}

// ---------- onboarding pasangan ----------
function onboarding() {
  document.body.dataset.theme = theme.id;
  const pending = sessionStorage.getItem('ols_join') || '';
  const err = h('p.form-err', { role: 'alert' }, '');
  const code = h('input', { type: 'text', maxlength: 12, placeholder: 'KODE UNDANGAN', value: pending, style: { textTransform: 'uppercase', letterSpacing: '.2em', textAlign: 'center' } });
  const cname = h('input', { type: 'text', maxlength: 60, placeholder: 'Nama universe (mis. Kita Berdua)', value: 'Our Little Universe' });
  const ann = h('input', { type: 'date' });
  const run = async fn => { err.textContent = ''; try { await fn(); sessionStorage.removeItem('ols_join'); await enter(); } catch (e) { err.textContent = e.message; } };
  root.replaceChildren(h('div.auth-screen', {},
    h('div.auth-hero', {}, h('div.auth-logo', {}, '🌌'), h('h1', {}, `Halo, ${S.profile.display_name}!`), h('p', {}, 'Satu akun hanya bisa berada di satu universe. Mulai dari sini:')),
    h('div.onb', {},
      h('section.card', {}, h('h3.card-title', {}, '✨ Buat universe baru'), h('label.field', {}, h('span', {}, 'Nama'), cname), h('label.field', {}, h('span', {}, 'Tanggal jadian / anniversary'), ann),
        h('button.btn.block', { type: 'button', onclick: () => run(() => db.createCouple(cname.value.trim(), ann.value)) }, 'Buat & dapatkan kode undangan')),
      h('section.card', {}, h('h3.card-title', {}, '💌 Gabung dengan kode'), h('label.field', {}, h('span', {}, 'Kode dari pasanganmu'), code),
        h('button.btn.block', { type: 'button', onclick: () => run(() => db.joinCouple(code.value)) }, 'Gabung')), err),
    h('p.center', {}, h('button.linklike', { type: 'button', onclick: logout }, 'Keluar'))));
}

async function logout() { if (await confirmBox('Keluar dari akun ini?', 'Keluar')) { sharing.stopAll(); await db.signOut(); location.hash = ''; authScreen('login'); } }

// ---------- shell + router ----------
function makeApi() {
  const items = itemsFor(theme);
  return {
    items, primary: () => theme.primary.map(id => items.find(i => i.id === id)).filter(Boolean),
    href: id => '#/' + id, more: openMore, logout, pickTheme, watchUnread
  };
}
function openMore() {
  const items = itemsFor(theme);
  const body = h('div.more-sheet', {}, GROUPS.map(g => h('div.more-grp', {}, h('h5', {}, g.label), h('div.more-grid', {}, items.filter(i => i.g === g.id).map(i => h('a.more-item', { href: '#/' + i.id, onclick: () => m.close() }, h('span', {}, i.ic), i.label))))),
    h('div.more-foot', {}, h('button.btn.ghost', { type: 'button', onclick: () => { m.close(); pickTheme(); } }, '🎨 Ganti tema'), h('button.btn.ghost', { type: 'button', onclick: () => { m.close(); logout(); } }, 'Keluar')));
  const m = modal({ title: '✨ Semua fitur', body, wide: true });
}
function mountShell() { shell = theme.mount(root, makeApi()); route(); }

let routeToken = 0;
async function route() {
  if (!S.user) return;
  if (!S.couple) return onboarding();
  if (!shell) return mountShell();
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const id = FEATURES.some(f => f.id === parts[0]) ? parts[0] : 'home';
  const feat = itemsFor(theme).find(f => f.id === id);
  shell.setActive(id, feat.label, feat.ic);
  const my = ++routeToken;
  shell.outlet.replaceChildren(spinner());
  try {
    const mod = await import(`./features/${id}.js`);
    const variant = mod.variants?.[theme.pages?.[id]];
    const node = await (variant || mod.default)(parts.slice(1), { theme });
    if (my !== routeToken) return;
    shell.outlet.replaceChildren(node);
    shell.outlet.classList.remove('page-in'); void shell.outlet.offsetWidth; shell.outlet.classList.add('page-in');
    window.scrollTo({ top: 0 });
  } catch (e) {
    console.error(e);
    if (my === routeToken) shell.outlet.replaceChildren(h('div.card', {}, h('h3.card-title', {}, 'Ups'), h('p', {}, 'Halaman ini gagal dimuat: ' + e.message)));
  }
}

async function enter() {
  if (!S.user) return authScreen('login');
  const t = S.profile?.theme; if (t && THEMES[t]) applyTheme(t);
  applyPrefs();
  if (!S.couple) return onboarding();
  db.subscribe(); sharing.resume(); announceUnlocks(); pushUnread();
  shell = null; mountShell();
}
async function afterAuth() {
  const j = sessionStorage.getItem('ols_join');
  await enter();
  if (j && !S.couple) { /* onboarding sudah berisi kode */ }
}

// ---------- boot ----------
async function boot() {
  const m = location.hash.match(/^#\/join\/([A-Za-z0-9]+)/);
  if (m) { sessionStorage.setItem('ols_join', m[1].toUpperCase()); location.hash = ''; }
  applyTheme(theme.id); initFx();
  root.replaceChildren(spinner('Membuka semesta…'));
  listenIncoming();
  on('recovery', () => authScreen('recovery'));
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.couple) { pushUnread(); announceUnlocks(); } });
  try { await db.init(); } catch (e) { console.error(e); toast('Gagal terhubung: ' + e.message, 'err'); }
  if (S.user) await enter(); else authScreen('login');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
boot();
export { setTheme, pickTheme, applyTheme };
