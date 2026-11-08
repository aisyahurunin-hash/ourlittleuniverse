// "Kamu di mana?" — lokasi live + baterai. Semua nilai berasal dari perangkat; tidak ada data karangan.
import { h, toast, ago, fmtDateTime, confirmBox } from '../core/util.js';
import { db, S, isMe, on as onChange } from '../core/db.js';
import { pageHead, card } from '../core/ui.js';
import { live } from '../core/widgets.js';
import { loadLeaflet, makeMap, pin } from '../core/leaflet.js';
import * as sh from '../core/sharing.js';

export default async function where() {
  const root = h('div'); root.append(pageHead('Kamu di Mana?', 'Berbagi lokasi & baterai — selalu atas izinmu, bisa dimatikan kapan saja.'));
  root.append(h('p.demo-note', {}, 'ℹ️ Browser web hanya memperbarui lokasi selama aplikasi ini terbuka. Pelacakan di latar belakang butuh aplikasi native/PWA dengan izin khusus, dan tidak diklaim di sini.'));

  // ---------- kontrol lokasiku ----------
  const ctrl = live(['location_shares'], async () => {
    const me = await sh.myShare(); const active = me?.enabled && (!me.share_until || new Date(me.share_until) > new Date());
    const run = fn => async () => { try { await fn(); } catch (e) { toast(e.message, 'err'); } };
    return [h('p', {}, active ? `✅ Lokasimu sedang dibagikan${me.share_until ? ' sampai ' + fmtDateTime(me.share_until) : ' (sampai kamu matikan)'}.` : '⏸️ Lokasimu tidak dibagikan.'),
      !sh.geoSupported() ? h('p.muted', {}, 'Perangkat ini tidak mendukung geolokasi.') : h('div.row-actions', {}, active ? h('button.btn', { type: 'button', onclick: run(async () => { await sh.disableLocation(); toast('Berbagi lokasi dimatikan'); }) }, '⏹ Berhenti berbagi') : [
        h('button.btn', { type: 'button', onclick: run(async () => { await sh.startLocation(null); toast('Lokasi dibagikan'); }) }, '📍 Bagikan terus'), h('button.btn.ghost', { type: 'button', onclick: run(async () => { await sh.startLocation(60); toast('Dibagikan 1 jam'); }) }, '⏱ 1 jam'), h('button.btn.ghost', { type: 'button', onclick: run(async () => { await sh.startLocation(240); toast('Dibagikan 4 jam'); }) }, '⏱ 4 jam')]),
      h('small.muted', {}, 'Browser akan meminta izin lokasi saat pertama kali.')];
  });

  // ---------- peta pasangan ----------
  const mapEl = h('div.map-box'); const info = h('p.muted', {}, 'Memuat…'); let L, M, mk;
  async function paint() {
    if (!S.partner) return info.textContent = 'Menunggu pasanganmu bergabung.';
    const r = (await db.list('location_shares')).find(x => x.user_id === S.partner.id);
    if (!r || !r.enabled || r.lat == null) { mk?.remove(); mk = null; return info.textContent = `${S.partner.display_name} tidak sedang membagikan lokasi.`; }
    info.textContent = `📍 Lokasi ${S.partner.display_name} · diperbarui ${ago(r.updated_at)} (${fmtDateTime(r.updated_at)})${r.accuracy ? ` · akurasi ±${Math.round(r.accuracy)} m` : ''}`;
    if (M) { const ll = [r.lat, r.lng]; mk ? mk.setLatLng(ll) : (mk = L.marker(ll, { icon: pin(L, '💗') }).addTo(M).bindPopup(S.partner.display_name)); M.setView(ll, 15); }
  }
  try { L = await loadLeaflet(); M = makeMap(L, mapEl); } catch (e) { mapEl.replaceWith(h('p.demo-note', {}, e.message)); }
  const off = onChange('change', d => { if (!root.isConnected) return off(); if (!d?.table || ['location_shares', '*'].includes(d.table)) paint(); });
  const timer = setInterval(() => { if (!root.isConnected) return clearInterval(timer); paint(); }, 20000);
  paint();

  // ---------- baterai ----------
  const lvl = h('input', { type: 'range', min: 1, max: 100, value: 50, 'aria-label': 'Persentase baterai' }); const lv = h('b', {}, '50%'); lvl.oninput = () => lv.textContent = lvl.value + '%';
  const chg = h('input', { type: 'checkbox' });
  const bat = live(['battery_status', 'profiles'], async () => {
    const rows = await db.list('battery_status'); const mine = rows.find(r => isMe(r.user_id)), theirs = rows.find(r => !isMe(r.user_id)); const auto = !!S.profile.prefs?.battery;
    const fmt = (n, r) => r && r.level != null ? h('p', {}, `🔋 ${n}: `, h('b', {}, r.level + '%'), r.charging ? ' ⚡ mengisi' : '', h('small', {}, ` · ${ago(r.updated_at)}${r.source === 'manual' ? ' · diisi manual' : ''}`)) : h('p.muted', {}, `🔋 ${n}: belum dibagikan`);
    return [fmt(S.partner?.display_name || 'Pasangan', theirs), fmt('Kamu', mine),
      sh.batterySupported() ? h('div.row-actions', {}, auto ? h('button.btn.ghost', { type: 'button', onclick: async () => { await sh.stopBattery(); toast('Berbagi baterai otomatis dimatikan'); } }, '⏹ Matikan otomatis') : h('button.btn', { type: 'button', onclick: async () => { try { await sh.startBattery(); toast('Baterai dibagikan otomatis'); } catch (e) { toast(e.message, 'err'); } } }, '🔋 Bagikan otomatis'))
        : h('p.demo-note', {}, 'Browser ini tidak mendukung Battery Status API (umum di Safari/Firefox). Gunakan input manual di bawah — kami tidak menampilkan angka tebakan.')];
  });
  root.append(card('📡 Lokasiku', ctrl), card('🗺️ Lokasi pasangan', info, mapEl), card('🔋 Baterai', bat, h('div.battery-manual', {}, h('h4', {}, 'Input manual'), h('label.field', {}, h('span', {}, 'Baterai saat ini ', lv), lvl), h('label.field.check', {}, chg, h('span', {}, 'Sedang mengisi')), h('button.btn.sm', { type: 'button', onclick: async () => { await sh.manualBattery(+lvl.value, chg.checked); toast('Tersimpan'); } }, 'Bagikan angka ini'))));
  return root;
}
