// Memuat Leaflet (peta) dari CDN hanya saat dibutuhkan.
import { MAP_TILES } from '../config.js';
let p = null;
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return p ||= new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.append(css);
    const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = () => res(window.L); s.onerror = () => { p = null; rej(new Error('Peta gagal dimuat (cek koneksi internet).')); }; document.head.append(s);
  });
}
export function makeMap(L, el, center = [-2.5, 118], zoom = 4) {
  const m = L.map(el, { zoomControl: true }).setView(center, zoom);
  L.tileLayer(MAP_TILES, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
  setTimeout(() => m.invalidateSize(), 200); return m;
}
export const pin = (L, emoji = '📍') => L.divIcon({ className: 'emoji-pin', html: `<span>${emoji}</span>`, iconSize: [34, 34], iconAnchor: [17, 30] });
