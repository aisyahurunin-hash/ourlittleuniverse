// ============================================================
// KONFIGURASI — isi dua nilai ini dengan proyek Supabase kamu.
// (Project Settings > API). Anon key memang aman dipakai di browser
// karena semua akses dijaga oleh Row Level Security (supabase/schema.sql).
//
// Kosong  => aplikasi berjalan dalam MODE DEMO LOKAL (data hanya ada di
//            browser ini, TIDAK tersinkron antar perangkat/akun).
// Terisi  => MODE ONLINE: akun, database, storage, realtime sungguhan.
// ============================================================
export const SUPABASE_URL = '';       // contoh: https://abcdxyz.supabase.co
export const SUPABASE_ANON_KEY = '';  // contoh: eyJhbGciOi...

// Opsional: kunci tile peta. Default memakai OpenStreetMap (gratis, tanpa kunci).
export const MAP_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
