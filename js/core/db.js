// Lapisan data: satu API, dua backend.
//  - Supabase (online, sungguhan)   -> jika js/config.js terisi
//  - Demo lokal (localStorage+IDB)  -> jika kosong. HANYA untuk mencoba tampilan; tidak tersinkron antar perangkat.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { uid, validateFile } from './util.js';

export const isLive = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const S = { mode: isLive ? 'supabase' : 'local', user: null, profile: null, couple: null, partner: null, members: [], ready: false };
export const bus = new EventTarget();
const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));
export const on = (type, fn) => { const f = e => fn(e.detail); bus.addEventListener(type, f); return () => bus.removeEventListener(type, f); };

const NO_COUPLE = new Set(['profiles', 'couples', 'couple_members']);

// ============================================================
// SUPABASE
// ============================================================
let sb = null;
async function client() {
  if (sb) return sb;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') emit('recovery'); });
  return sb;
}
const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

const remote = {
  async init() {
    const c = await client();
    const { data } = await c.auth.getSession();
    if (!data.session) return null;
    S.user = { id: data.session.user.id, email: data.session.user.email };
    await remote.loadAll();
    return S.user;
  },
  async loadAll() {
    const c = await client();
    let p = (await c.from('profiles').select('*').eq('id', S.user.id).maybeSingle()).data;
    if (!p) { p = unwrap(await c.from('profiles').insert({ id: S.user.id, display_name: S.user.email.split('@')[0] }).select().single()); }
    S.profile = p;
    const mem = unwrap(await c.from('couple_members').select('couple_id,user_id'));
    if (mem.length) {
      S.couple = unwrap(await c.from('couples').select('*').eq('id', mem[0].couple_id).single());
      S.members = unwrap(await c.from('profiles').select('*').in('id', mem.map(m => m.user_id)));
      S.partner = S.members.find(m => m.id !== S.user.id) || null;
    } else { S.couple = null; S.members = [p]; S.partner = null; }
  },
  async signUp(email, password, name) {
    const c = await client();
    const d = unwrap(await c.auth.signUp({ email, password, options: { data: { name } } }));
    if (!d.session) return { needsConfirm: true };
    await remote.init(); return {};
  },
  async signIn(email, password) { const c = await client(); unwrap(await c.auth.signInWithPassword({ email, password })); await remote.init(); },
  async signOut() { const c = await client(); await c.auth.signOut(); },
  async reset(email) { const c = await client(); unwrap(await c.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })); },
  async updatePassword(pw) { const c = await client(); unwrap(await c.auth.updateUser({ password: pw })); },
  async createCouple(name, anniversary) { const c = await client(); unwrap(await c.rpc('create_couple', { p_name: name, p_anniversary: anniversary || null })); await remote.loadAll(); },
  async joinCouple(code) { const c = await client(); unwrap(await c.rpc('join_couple', { p_code: code })); await remote.loadAll(); },
  async deleteCouple() { const c = await client(); unwrap(await c.rpc('delete_couple_space')); await remote.loadAll(); },
  async deleteMyData() { const c = await client(); unwrap(await c.rpc('delete_my_data')); await c.auth.signOut(); },
  async updateProfile(patch) { const c = await client(); S.profile = unwrap(await c.from('profiles').update(patch).eq('id', S.user.id).select().single()); await remote.loadAll(); },
  async updateCouple(patch) { const c = await client(); S.couple = unwrap(await c.from('couples').update(patch).eq('id', S.couple.id).select().single()); },
  async list(t, o = {}) {
    const c = await client(); let q = c.from(t).select('*');
    if (!NO_COUPLE.has(t) && S.couple) q = q.eq('couple_id', S.couple.id);
    for (const [k, v] of Object.entries(o.eq || {})) q = q.eq(k, v);
    if (o.order) q = q.order(o.order[0], { ascending: o.order[1] !== 'desc' });
    if (o.limit) q = q.limit(o.limit);
    return unwrap(await q);
  },
  async insert(t, row) { const c = await client(); return unwrap(await c.from(t).insert(NO_COUPLE.has(t) ? row : { couple_id: S.couple.id, ...row }).select().single()); },
  async update(t, id, patch) { const c = await client(); return unwrap(await c.from(t).update(patch).eq('id', id).select().single()); },
  async upsert(t, row, conflict) { const c = await client(); return unwrap(await c.from(t).upsert({ couple_id: S.couple.id, ...row }, { onConflict: conflict }).select().single()); },
  async remove(t, id) { const c = await client(); unwrap(await c.from(t).delete().eq('id', id)); },
  async upload(file, folder = 'misc') {
    validateFile(file);
    const c = await client();
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${S.couple.id}/${folder}/${uid()}.${ext}`;
    const { error } = await c.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    return path;
  },
  async removeFile(path) { const c = await client(); await c.storage.from('media').remove([path]); },
  async signedUrl(path) { const c = await client(); const { data, error } = await c.storage.from('media').createSignedUrl(path, 3600); if (error) throw new Error(error.message); return data.signedUrl; },
  async capsuleIndex() { const c = await client(); return unwrap(await c.from('capsule_index').select('*').order('open_at')); },
  subscribe() {
    client().then(c => {
      const ch = c.channel('couple-' + S.couple.id);
      ch.on('postgres_changes', { event: '*', schema: 'public', filter: `couple_id=eq.${S.couple.id}` }, p => emit('change', { table: p.table, type: p.eventType, row: p.new }));
      ch.subscribe();
    });
  }
};

// ============================================================
// DEMO LOKAL
// ============================================================
const LS = 'ols_demo_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || null; } catch { return null; } };
const blank = () => ({ users: {}, profiles: {}, couples: {}, members: [], rows: {}, me: null });
let L = load() || blank();
const save = () => localStorage.setItem(LS, JSON.stringify(L));
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const tbl = t => (L.rows[t] ||= []);
const myCouple = () => L.members.find(m => m.user_id === L.me)?.couple_id || null;

const idb = () => new Promise((res, rej) => { const r = indexedDB.open('ols_files', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idbPut = async (k, v) => { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction('f', 'readwrite'); t.objectStore('f').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); };
const idbGet = async k => { const d = await idb(); return new Promise((res, rej) => { const r = d.transaction('f').objectStore('f').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); };
const idbDel = async k => { const d = await idb(); return new Promise(res => { const t = d.transaction('f', 'readwrite'); t.objectStore('f').delete(k); t.oncomplete = res; }); };

const localLoadAll = () => {
  const p = L.profiles[L.me]; const cid = myCouple();
  S.profile = p; S.user = { id: L.me, email: L.users[L.me].email };
  if (cid) {
    S.couple = L.couples[cid];
    const ids = L.members.filter(m => m.couple_id === cid).map(m => m.user_id);
    S.members = ids.map(i => L.profiles[i]); S.partner = S.members.find(m => m.id !== L.me) || null;
  } else { S.couple = null; S.partner = null; S.members = [p]; }
};
const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: 8 }, () => A[Math.floor(Math.random() * A.length)]).join(''); };
const mkUser = async (email, pw, name) => {
  if (Object.values(L.users).some(u => u.email === email)) throw new Error('Email sudah terdaftar');
  const id = uid(); L.users[id] = { id, email, pw: await sha(pw) };
  L.profiles[id] = { id, display_name: name || email.split('@')[0], avatar_path: null, birthday: null, theme: 'kawaii', prefs: {}, created_at: new Date().toISOString() };
  return id;
};

const local = {
  async init() { L = load() || blank(); if (!L.me || !L.users[L.me]) return null; localLoadAll(); return S.user; },
  async signUp(email, pw, name) { const id = await mkUser(email, pw, name); L.me = id; save(); localLoadAll(); return {}; },
  async signIn(email, pw) {
    const u = Object.values(L.users).find(x => x.email === email);
    if (!u || u.pw !== await sha(pw)) throw new Error('Email atau kata sandi salah');
    L.me = u.id; save(); localLoadAll();
  },
  async signOut() { L.me = null; save(); },
  async reset(email) { if (!Object.values(L.users).some(u => u.email === email)) throw new Error('Email tidak ditemukan'); L._reset = email; save(); emit('recovery'); },
  async updatePassword(pw) { const u = Object.values(L.users).find(x => x.email === L._reset) || L.users[L.me]; u.pw = await sha(pw); delete L._reset; save(); },
  async createCouple(name, anniversary) {
    if (myCouple()) throw new Error('Kamu sudah tergabung di sebuah pasangan');
    const id = uid();
    L.couples[id] = { id, name: name || 'Our Little Universe', anniversary: anniversary || null, cover_path: null, description: '', theme: S.profile?.theme || 'kawaii', favorite_color: '#ff9ec7', invite_code: newCode(), created_by: L.me, created_at: new Date().toISOString() };
    L.members.push({ couple_id: id, user_id: L.me }); save(); localLoadAll();
  },
  async joinCouple(code) {
    if (myCouple()) throw new Error('Kamu sudah tergabung di sebuah pasangan');
    const c = Object.values(L.couples).find(x => x.invite_code === String(code).trim().toUpperCase());
    if (!c) throw new Error('Kode undangan tidak ditemukan');
    if (L.members.filter(m => m.couple_id === c.id).length >= 2) throw new Error('Ruang ini sudah berisi dua orang');
    L.members.push({ couple_id: c.id, user_id: L.me });
    L.members.filter(m => m.couple_id === c.id && m.user_id !== L.me).forEach(m => tbl('notifications').push({ id: uid(), couple_id: c.id, to_user: m.user_id, kind: 'joined', title: 'Pasanganmu bergabung ♡', body: 'Universe kalian sekarang lengkap!', read: false, created_at: new Date().toISOString() }));
    save(); localLoadAll();
  },
  async deleteCouple() {
    const cid = myCouple(); if (!cid) return;
    delete L.couples[cid]; L.members = L.members.filter(m => m.couple_id !== cid);
    for (const t of Object.keys(L.rows)) L.rows[t] = L.rows[t].filter(r => r.couple_id !== cid);
    save(); localLoadAll();
  },
  async deleteMyData() { L.members = L.members.filter(m => m.user_id !== L.me); delete L.profiles[L.me]; delete L.users[L.me]; L.me = null; save(); },
  async updateProfile(patch) { Object.assign(L.profiles[L.me], patch); save(); localLoadAll(); },
  async updateCouple(patch) { Object.assign(L.couples[myCouple()], patch); save(); localLoadAll(); },
  async list(t, o = {}) {
    let rows = tbl(t).filter(r => !S.couple || r.couple_id === S.couple.id);
    for (const [k, v] of Object.entries(o.eq || {})) rows = rows.filter(r => r[k] === v);
    // meniru RLS yang penting
    if (t === 'letters') rows = rows.filter(r => r.from_user === L.me || (r.to_user === L.me && !r.is_draft && (!r.unlock_at || new Date(r.unlock_at) <= new Date())));
    if (t === 'time_capsules') rows = rows.filter(r => new Date(r.open_at) <= new Date() || r.created_by === L.me);
    if (t === 'notifications') rows = rows.filter(r => r.to_user === L.me);
    if (t === 'affections') rows = rows.filter(r => r.to_user === L.me || r.from_user === L.me);
    if (t === 'location_shares') rows = rows.filter(r => r.user_id === L.me || (r.enabled && (!r.share_until || new Date(r.share_until) > new Date())));
    if (t === 'question_answers') { const mine = new Set(rows.filter(r => r.user_id === L.me).map(r => r.day)); rows = rows.filter(r => r.user_id === L.me || mine.has(r.day)); }
    if (o.order) { const [k, d] = o.order; rows = [...rows].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (d === 'desc' ? -1 : 1)); }
    if (o.limit) rows = rows.slice(0, o.limit);
    return structuredClone(rows);
  },
  async insert(t, row) {
    const r = { id: uid(), ...(NO_COUPLE.has(t) ? {} : { couple_id: S.couple.id }), created_by: L.me, created_at: new Date().toISOString(), ...row };
    tbl(t).push(r); save(); emit('change', { table: t, type: 'INSERT', row: r }); return structuredClone(r);
  },
  async update(t, id, patch) { const r = tbl(t).find(x => x.id === id); if (!r) throw new Error('Data tidak ditemukan'); Object.assign(r, patch); save(); emit('change', { table: t, type: 'UPDATE', row: r }); return structuredClone(r); },
  async upsert(t, row, conflict) {
    const keys = conflict.split(',').map(s => s.trim()); const full = { couple_id: S.couple.id, ...row };
    const ex = tbl(t).find(r => keys.every(k => r[k] === full[k]));
    return ex ? local.update(t, ex.id, row) : local.insert(t, row);
  },
  async remove(t, id) { L.rows[t] = tbl(t).filter(x => x.id !== id); save(); emit('change', { table: t, type: 'DELETE' }); },
  async upload(file, folder = 'misc') { validateFile(file); const path = `${S.couple.id}/${folder}/${uid()}-${file.name}`; await idbPut(path, file); return path; },
  async removeFile(path) { await idbDel(path); },
  async signedUrl(path) { const f = await idbGet(path); if (!f) throw new Error('File tidak ada'); return URL.createObjectURL(f); },
  async capsuleIndex() { return structuredClone(tbl('time_capsules').filter(r => r.couple_id === S.couple.id).map(({ id, couple_id, created_by, title, open_at, created_at }) => ({ id, couple_id, created_by, title, open_at, created_at }))).sort((a, b) => a.open_at > b.open_at ? 1 : -1); },
  subscribe() { window.addEventListener('storage', e => { if (e.key === LS) { L = load() || blank(); if (L.me) localLoadAll(); emit('change', { table: '*', type: 'SYNC' }); } }); },
  // khusus demo
  async addDemoPartner() {
    const cid = myCouple(); if (!cid) throw new Error('Buat pasangan dulu');
    if (L.members.filter(m => m.couple_id === cid).length >= 2) throw new Error('Sudah ada pasangan');
    const id = await mkUser(`demo-${Date.now()}@demo.local`, 'demo1234', 'Pasangan (demo)');
    L.members.push({ couple_id: cid, user_id: id }); save(); localLoadAll();
  },
  async switchUser() { const other = S.partner; if (!other) throw new Error('Belum ada pasangan'); L.me = other.id; save(); localLoadAll(); }
};

const be = isLive ? remote : local;

// ============================================================
// API publik
// ============================================================
export const db = {
  init: async () => { const u = await be.init(); S.ready = true; return u; },
  signUp: be.signUp, signIn: be.signIn, signOut: async () => { await be.signOut(); S.user = S.profile = S.couple = S.partner = null; S.members = []; },
  reset: be.reset, updatePassword: be.updatePassword,
  createCouple: be.createCouple, joinCouple: be.joinCouple, deleteCouple: be.deleteCouple, deleteMyData: be.deleteMyData,
  updateProfile: be.updateProfile, updateCouple: be.updateCouple,
  list: be.list,
  insert: async (t, row) => { const r = await be.insert(t, row); if (isLive) emit('change', { table: t, type: 'INSERT', row: r }); return r; },
  update: async (t, id, p) => { const r = await be.update(t, id, p); if (isLive) emit('change', { table: t, type: 'UPDATE', row: r }); return r; },
  upsert: async (t, row, c) => { const r = await be.upsert(t, row, c); if (isLive) emit('change', { table: t, type: 'UPSERT', row: r }); return r; },
  remove: async (t, id) => { await be.remove(t, id); if (isLive) emit('change', { table: t, type: 'DELETE' }); },
  upload: be.upload, removeFile: be.removeFile, capsuleIndex: be.capsuleIndex,
  subscribe: be.subscribe,
  demo: isLive ? null : { addPartner: local.addDemoPartner, switchUser: local.switchUser }
};

// ---------- media (URL bertanda tangan, di-cache) ----------
const urlCache = new Map();
export async function mediaUrl(path) {
  if (!path) return '';
  const c = urlCache.get(path);
  if (c && c.exp > Date.now()) return c.url;
  const url = await be.signedUrl(path);
  urlCache.set(path, { url, exp: Date.now() + (isLive ? 3000 : 3600) * 1000 });
  return url;
}
/** <img> yang otomatis memuat dari storage privat */
export function mediaImg(path, attrs = {}) {
  const img = document.createElement('img'); img.alt = attrs.alt || ''; img.loading = 'lazy';
  Object.entries(attrs).forEach(([k, v]) => k === 'class' ? (img.className = v) : img.setAttribute(k, v));
  if (path) mediaUrl(path).then(u => { img.src = u; }).catch(() => { img.classList.add('broken'); });
  return img;
}

// ---------- notifikasi ke pasangan ----------
export async function notifyPartner(kind, title, body = '', link = '') {
  if (!S.partner || !S.couple) return;
  try { await db.insert('notifications', { to_user: S.partner.id, kind, title, body, link, read: false }); } catch (e) { console.warn('notif gagal', e); }
}

export function start() { if (S.couple) db.subscribe(); }
export const nameOf = id => (S.members.find(m => m.id === id)?.display_name) || 'Seseorang';
export const isMe = id => id === S.user?.id;
