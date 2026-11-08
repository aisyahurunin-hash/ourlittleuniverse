// Berbagi lokasi & baterai — jujur soal batasan browser:
//  • Lokasi hanya diperbarui SELAMA aplikasi/tab terbuka (browser web tidak boleh melacak di latar belakang).
//    Untuk pelacakan latar belakang sungguhan dibutuhkan aplikasi native / PWA terpasang dengan izin khusus.
//  • Battery Status API hanya ada di sebagian browser (Chrome/Edge Android & desktop). Safari/Firefox tidak mendukung
//    → sediakan input manual, tidak pernah menampilkan angka palsu.
import { db, S } from './db.js';

let watchId = null, lastPush = 0, battery = null, tempTimer = null;
const PUSH_EVERY = 30000;

export const geoSupported = () => 'geolocation' in navigator;
export const batterySupported = () => 'getBattery' in navigator;

export async function myShare() {
  const rows = await db.list('location_shares');
  return rows.find(r => r.user_id === S.user.id) || null;
}

async function push(pos) {
  const now = Date.now(); if (now - lastPush < PUSH_EVERY) return; lastPush = now;
  const s = await myShare();
  if (!s?.enabled) return stopLocation();
  if (s.share_until && new Date(s.share_until) <= new Date()) { await db.update('location_shares', s.id, { enabled: false }); return stopLocation(); }
  await db.upsert('location_shares', { user_id: S.user.id, enabled: true, share_until: s.share_until, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, updated_at: new Date().toISOString() }, 'couple_id,user_id');
}

/** Mulai berbagi. minutes=null → sampai dimatikan. Meminta izin browser lebih dulu. */
export async function startLocation(minutes = null) {
  if (!geoSupported()) throw new Error('Perangkat/browser ini tidak mendukung geolokasi.');
  const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, e => rej(new Error(e.code === 1 ? 'Izin lokasi ditolak. Aktifkan lewat pengaturan browser.' : 'Lokasi tidak bisa didapat.')), { enableHighAccuracy: true, timeout: 15000 }));
  const until = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null;
  await db.upsert('location_shares', { user_id: S.user.id, enabled: true, share_until: until, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, updated_at: new Date().toISOString() }, 'couple_id,user_id');
  lastPush = Date.now(); watch();
}
function watch() {
  if (watchId != null || !geoSupported()) return;
  watchId = navigator.geolocation.watchPosition(p => push(p).catch(console.warn), () => {}, { enableHighAccuracy: false, maximumAge: 20000 });
}
export function stopLocation() { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; }
export async function disableLocation() {
  stopLocation(); const s = await myShare();
  if (s) await db.update('location_shares', s.id, { enabled: false, lat: null, lng: null, accuracy: null });
}

// ----- baterai -----
async function pushBattery(b, source = 'auto') {
  await db.upsert('battery_status', { user_id: S.user.id, level: Math.round(b.level * 100), charging: !!b.charging, source, updated_at: new Date().toISOString() }, 'couple_id,user_id');
}
export async function startBattery() {
  if (!batterySupported()) throw new Error('Browser ini tidak mendukung Battery Status API. Gunakan input manual.');
  battery = await navigator.getBattery();
  const fire = () => pushBattery(battery).catch(console.warn);
  battery.addEventListener('levelchange', fire); battery.addEventListener('chargingchange', fire); fire();
  S.profile.prefs ||= {};
  await db.updateProfile({ prefs: { ...S.profile.prefs, battery: true } });
}
export async function stopBattery() { battery = null; await db.updateProfile({ prefs: { ...(S.profile.prefs || {}), battery: false } }); }
export async function manualBattery(level, charging) {
  await db.upsert('battery_status', { user_id: S.user.id, level, charging, source: 'manual', updated_at: new Date().toISOString() }, 'couple_id,user_id');
}

/** Dipanggil saat aplikasi dibuka: lanjutkan berbagi yang sebelumnya diaktifkan pengguna. */
export async function resume() {
  try {
    const s = await myShare();
    if (s?.enabled && (!s.share_until || new Date(s.share_until) > new Date())) {
      if (navigator.permissions) { const st = await navigator.permissions.query({ name: 'geolocation' }); if (st.state === 'granted') watch(); }
    }
    if (S.profile?.prefs?.battery && batterySupported()) {
      battery = await navigator.getBattery();
      const fire = () => pushBattery(battery).catch(console.warn);
      battery.addEventListener('levelchange', fire); battery.addEventListener('chargingchange', fire); fire();
    }
  } catch (e) { console.warn('resume sharing', e); }
}
export function stopAll() { stopLocation(); battery = null; clearTimeout(tempTimer); }
