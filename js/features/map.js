// Peta tempat yang pernah dikunjungi bersama (terpisah dari lokasi live).
import { h, formModal, confirmBox, toast, fmtDate, ymd } from '../core/util.js';
import { db, mediaImg, notifyPartner, on as onChange } from '../core/db.js';
import { pageHead, card, empty, chip } from '../core/ui.js';
import { PLACE_CATS } from '../core/content.js';
import { loadLeaflet, makeMap, pin } from '../core/leaflet.js';
import { uploadMedia } from './_shared.js';

export default async function map() {
  const root = h('div'); const mapEl = h('div.map-box', { role: 'application', 'aria-label': 'Peta tempat kita' }); const list = h('div.places'); let cat = 'all', clicked = null, tmp = null, L, M, layer;
  root.append(pageHead('Peta Kita', 'Tempat-tempat yang pernah kalian kunjungi bersama. Klik peta untuk menaruh pin, lalu simpan.', h('button.btn', { type: 'button', onclick: () => add() }, '＋ Tempat')),
    h('div.chips', {}, [['all', 'Semua'], ...PLACE_CATS].map(([id, l]) => h('button.chip' + (id === cat ? '.on' : ''), { type: 'button', onclick: e => { cat = id; root.querySelectorAll('.chips .chip').forEach(c => c.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); } }, l))), mapEl, list);

  async function add(p) {
    const v = await formModal({ title: p ? 'Ubah tempat' : 'Tempat baru', fields: [{ name: 'name', label: 'Nama tempat', required: true }, { name: 'visited_on', label: 'Tanggal', type: 'date', default: ymd() }, { name: 'category', label: 'Kategori', type: 'select', options: PLACE_CATS },
      { name: 'lat', label: 'Latitude', type: 'number', step: 'any', required: true, hint: 'Terisi otomatis jika kamu klik peta.' }, { name: 'lng', label: 'Longitude', type: 'number', step: 'any', required: true }, { name: 'description', label: 'Cerita singkat', type: 'textarea', rows: 2 }, { name: 'photo', label: 'Foto', type: 'file', accept: 'image/*' }],
      initial: p || { lat: clicked?.lat, lng: clicked?.lng, category: 'favorite', visited_on: ymd() } }); if (!v) return;
    if (v.lat < -90 || v.lat > 90 || v.lng < -180 || v.lng > 180) return toast('Koordinat tidak valid.', 'err');
    try { const row = { name: v.name, visited_on: v.visited_on || null, category: v.category, lat: v.lat, lng: v.lng, description: v.description || null }; if (v.photo) row.photo_path = await uploadMedia(v.photo, 'places');
      if (p) await db.update('places', p.id, row); else { await db.insert('places', row); notifyPartner('place', `Tempat baru di peta: ${v.name}`, '', '#/map'); } clicked = null; tmp?.remove(); draw(); } catch (e) { toast(e.message, 'err'); }
  }
  async function draw() {
    const all = await db.list('places', { order: ['visited_on', 'desc'] }); const rows = all.filter(p => cat === 'all' || p.category === cat);
    if (M) { layer.clearLayers(); rows.filter(p => p.lat != null).forEach(p => L.marker([p.lat, p.lng], { icon: pin(L, (PLACE_CATS.find(c => c[0] === p.category) || ['', '📍'])[1].split(' ')[0]) }).addTo(layer).bindPopup(`<b>${p.name.replace(/</g, '&lt;')}</b><br>${p.visited_on ? fmtDate(p.visited_on) : ''}`)); const pts = rows.filter(p => p.lat != null).map(p => [p.lat, p.lng]); if (pts.length) M.fitBounds(pts, { padding: [40, 40], maxZoom: 13 }); }
    list.replaceChildren(...(rows.length ? rows.map(p => card(null, h('div.place', {}, p.photo_path ? h('div.place-photo', {}, mediaImg(p.photo_path)) : null, h('div', {}, h('h3', {}, p.name), h('small', {}, [p.visited_on ? fmtDate(p.visited_on) : '', (PLACE_CATS.find(c => c[0] === p.category) || [])[1]].filter(Boolean).join(' · ')), p.description ? h('p', {}, p.description) : null, h('div.row-actions', {}, p.lat != null ? h('button.btn.sm.ghost', { type: 'button', onclick: () => { M?.setView([p.lat, p.lng], 15); mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 'Lihat di peta') : null, h('button.btn.sm.ghost', { type: 'button', onclick: () => add(p) }, 'Ubah'), h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (await confirmBox('Hapus tempat ini?', 'Hapus')) { await db.remove('places', p.id); draw(); } } }, '🗑')))))) : [empty('🗺️', 'Belum ada tempat tersimpan.')]));
  }
  try { L = await loadLeaflet(); M = makeMap(L, mapEl); layer = L.layerGroup().addTo(M);
    M.on('click', e => { clicked = { lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }; tmp?.remove(); tmp = L.marker(e.latlng, { icon: pin(L, '✨') }).addTo(M).bindPopup('Pin baru — tekan “＋ Tempat” untuk menyimpan').openPopup(); });
  } catch (e) { mapEl.replaceWith(h('p.demo-note', {}, '🗺️ ' + e.message + ' Daftar tempat tetap bisa dipakai.')); }
  await draw(); return root;
}
