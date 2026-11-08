# Our Little Universe ♡

Ruang digital privat untuk dua orang: kenangan, folder foto, scrapbook, photobooth, surat, chat, game, peliharaan, peta, dan banyak lagi.
Aplikasi web statis (HTML + ES Modules, **tanpa build step**) dengan backend **Supabase** (Auth, PostgreSQL + RLS, Storage privat, Realtime).

## 4 tema yang benar-benar berbeda

Tema bukan sekadar ganti warna. Tiap tema punya **shell/struktur sendiri**, label & ikon sendiri, komponen yang ditata ulang, dan sebagian halaman punya varian layout.

| Tema | Struktur | Varian halaman |
|---|---|---|
| **Kawaii Retro Paradise** | banner langit-kota pixel, tab, 3 kolom (navigasi │ konten │ aktivitas, mini chat, radio, kalender), panel berjendela yang bisa diciutkan | – |
| **Manifest Y2K Pink** | bar ikon + pemutar, "ruang" dengan lampu, papan judul menggantung, HP pink, counter digital, dock | Surat → **Kantor Pos** |
| **Pixel Messenger** | semua fitur di dalam satu jendela MSN (title bar, toolbar, daftar kontak, status bar) di atas latar holografik | Chat → **bubble MSN** |
| **Pink Coquette** | sidebar pita + kartu kertas berbingkai renda, bottom-nav di ponsel | – |

Ganti tema: **Pengaturan → Tampilan** atau tombol 🎨 di tiap shell. Pilihan tersimpan di akunmu.

Menambah tema baru: buat `js/themes/<id>.js` (objek dengan `mount(root, api)`, `primary`, `icons`, `vocab`), daftarkan di `js/themes/index.js`, dan tambah `css/theme-<id>.css` (semua selector diawali `body[data-theme="<id>"]`).

## Animasi UI
- **Tombol**: efek ripple dari titik sentuh + tombol "tertekan" (`js/core/fx.js`, `.pressing`, `:active`).
- **Kartu**: terangkat saat di-hover, mengecil + memantul saat ditekan.
- **Loading**: skeleton shimmer (`.sk`, `skeleton()` di `js/core/ui.js`) menggantikan spinner — dipakai di loading halaman, widget, dan placeholder foto.
- Semua dimatikan otomatis jika perangkat memakai *reduced motion*.

## Menjalankan

### Mode demo lokal (tanpa akun apa pun)
```bash
cd our-little-universe
python3 -m http.server 8080      # atau: npx serve .
# buka http://localhost:8080
```
`js/config.js` kosong ⇒ **MODE DEMO LOKAL**: data hanya di browser ini (localStorage + IndexedDB), **tidak tersinkron antar perangkat**. Berguna untuk mencoba semua tampilan dan alur. Di *Pengaturan → Alat mode demo* kamu bisa menambah akun pasangan demo dan berganti akun untuk menguji fitur dua arah.

### Mode online (sungguhan)
1. Buat proyek di https://supabase.com.
2. **SQL Editor** → tempel & jalankan seluruh isi `supabase/schema.sql` (tabel, RLS, bucket privat `media`, RPC, realtime).
3. **Authentication → URL Configuration**: isi *Site URL* dengan alamat situs kamu (dan `http://localhost:8080` untuk lokal). Atur email konfirmasi sesuai selera.
4. **Project Settings → API**: salin *Project URL* dan *anon key* ke `js/config.js` (lihat `.env.example`). Anon key aman di browser karena akses dijaga RLS.
5. Jalankan seperti biasa; daftar dua akun, satu membuat universe, satu bergabung dengan kode/tautan undangan.

### Deploy
Situs statis — unggah folder ini ke Netlify, Vercel, Cloudflare Pages, GitHub Pages, atau hosting statis mana pun. **Wajib HTTPS** (kamera, lokasi, dan service worker membutuhkannya). Tambahkan domain produksi ke *Site URL / Redirect URLs* Supabase.

## Arsitektur singkat
```
index.html            cangkang + muat CSS semua tema
css/base.css          komponen bersama + animasi (ripple, hover kartu, skeleton)
css/theme-*.css       skin & struktur per tema
js/app.js             boot, auth, onboarding pasangan, router (#/rute), pergantian tema
js/core/db.js         satu API data, dua backend (Supabase / demo lokal)
js/core/*.js          util, widget bersama, sharing lokasi/baterai, prefs, fx
js/themes/*.js        shell tiap tema
js/features/*.js      25 halaman fitur (dimuat lazy)
supabase/schema.sql   skema + RLS + storage + RPC + realtime
```

## Keamanan & privasi
- Semua tabel punya `couple_id`; **RLS** memastikan hanya anggota pasangan yang bisa membaca/menulis. Menyembunyikan tombol di UI *bukan* mekanisme keamanan.
- Satu akun hanya bisa ada di satu pasangan (`couple_members.user_id` unik); ruang maksimal 2 orang (dicek di RPC `join_couple`).
- Foto/video di bucket **privat**; ditampilkan lewat *signed URL* berumur 1 jam. Batas 50 MB dan hanya tipe gambar/video yang diizinkan (divalidasi di klien **dan** di bucket).
- Surat terjadwal dan kapsul waktu **dikunci di server** (kebijakan RLS memakai `unlock_at` / `open_at`), bukan hanya di UI.
- Jawaban pertanyaan harian pasangan baru terbaca setelah kamu menjawab hari yang sama (RLS).
- Lokasi pasangan hanya terbaca saat `enabled` dan belum melewati `share_until` (RLS).
- Tautan musik hanya menerima `http/https`. Teks pengguna dirender sebagai text node (bukan `innerHTML`).
- Ekspor data (JSON) dan hapus ruang pasangan / data saya tersedia di Pengaturan.

## Batasan yang jujur (baca ini)
- **Belum diuji terhadap proyek Supabase sungguhan.** Di lingkungan pembuatan, jaringan keluar dibatasi, jadi semua halaman diuji lewat Chrome headless dalam **mode demo lokal** (semua 25 halaman × 4 tema termuat tanpa error; tata letak ponsel tanpa overflow). Jalur Supabase ditulis mengikuti API resmi, tetapi jalankan alur dua-akun sendiri setelah setup (daftar → buat → gabung → unggah foto → kirim surat) dan laporkan bila ada yang aneh.
- **Lokasi live** hanya diperbarui saat aplikasi/tab terbuka. Browser web tidak boleh melacak di latar belakang; itu butuh aplikasi native atau PWA dengan izin khusus. Aplikasi tidak berpura-pura bisa.
- **Baterai** memakai Battery Status API yang hanya ada di sebagian browser (Chrome/Edge). Jika tidak didukung, tersedia input manual yang diberi label "diisi manual". Tidak ada angka karangan.
- **Notifikasi push** saat aplikasi tertutup butuh Web Push (service worker `push` + kunci VAPID + server/Edge Function pengirim). Yang ada sekarang: notifikasi dalam aplikasi realtime + notifikasi browser saat tab terbuka dengan izin.
- Surat terjadwal tidak terlihat sama sekali oleh penerima sampai terbuka (konsekuensi penguncian RLS). Surat "Buka saat…" tanpa jadwal tampak tersegel dan dibuka atas pilihan penerima.
- Menghapus baris `auth.users` sepenuhnya memerlukan *service role*. "Hapus data saya" menghapus profil & keanggotaan; untuk menghapus akun login buat Edge Function kecil yang memanggil `auth.admin.deleteUser`.
- Peta memakai Leaflet + tile OpenStreetMap dari CDN. Untuk produksi trafik tinggi, gunakan penyedia tile berkunci sendiri (`MAP_TILES` di `js/config.js`).
- Game *Couple Trivia* & *Guess the Memory* hanya muncul bila ada cukup data bertanggal (linimasa / folder bertanggal / foto) — tidak ada soal palsu.
- Export PDF scrapbook memakai dialog cetak browser ("Simpan sebagai PDF").
