import { h, toast, formModal, confirmBox, download, ymd, modal } from '../core/util.js';
import { db, S, isLive } from '../core/db.js';
import { pageHead, card } from '../core/ui.js';
import { avatar } from '../core/widgets.js';
import { THEME_LIST } from '../themes/index.js';
import { FONTS, BGS, applyPrefs } from '../core/prefs.js';
import { setTheme } from '../app.js';
import { uploadMedia, copyText } from './_shared.js';
import * as sharing from '../core/sharing.js';

const EXPORT_TABLES = ['memory_folders', 'media', 'scrapbooks', 'scrapbook_pages', 'letters', 'question_answers', 'mood_checkins', 'affections', 'bucket_items', 'timeline_events', 'playlist_songs', 'game_sessions', 'pets', 'special_dates', 'notes', 'places', 'countdowns', 'messages', 'notifications'];

export default async function settings() {
  const root = h('div'); const reload = () => import('../app.js').then(() => location.reload());
  const run = fn => async e => { try { await fn(e); } catch (er) { toast(er.message, 'err'); } };
  root.append(pageHead('Pengaturan', 'Profil, universe kalian, tampilan, privasi, dan data.'));

  // ---------- profil ----------
  root.append(card('👤 Profilku', h('div.profile-row', {}, avatar(S.profile, 72), h('div', {}, h('b', {}, S.profile.display_name), h('small', {}, S.user.email))),
    h('div.row-actions', {}, h('button.btn', { type: 'button', onclick: run(async () => {
      const v = await formModal({ title: 'Ubah profil', fields: [{ name: 'display_name', label: 'Nama', required: true }, { name: 'birthday', label: 'Ulang tahun', type: 'date' }, { name: 'avatar', label: 'Foto profil', type: 'file', accept: 'image/*' }], initial: S.profile }); if (!v) return;
      const patch = { display_name: v.display_name, birthday: v.birthday || null }; if (v.avatar) patch.avatar_path = await uploadMedia(v.avatar, 'avatars'); await db.updateProfile(patch); toast('Profil diperbarui'); location.reload();
    }) }, 'Ubah profil'), h('button.btn.ghost', { type: 'button', onclick: run(async () => {
      const v = await formModal({ title: 'Ganti kata sandi', fields: [{ name: 'pw', label: 'Kata sandi baru (min. 8 karakter)', type: 'password', required: true }] }); if (!v) return; if (v.pw.length < 8) throw new Error('Minimal 8 karakter'); await db.updatePassword(v.pw); toast('Kata sandi diganti');
    }) }, 'Ganti kata sandi'))));

  // ---------- universe ----------
  const c = S.couple;
  root.append(card('🌌 Universe kita', h('p', {}, h('b', {}, c.name), c.anniversary ? ` · sejak ${c.anniversary}` : ' · tanggal anniversary belum diatur'),
    h('div.invite', {}, h('small', {}, 'Kode undangan:'), h('code', {}, c.invite_code), h('button.btn.sm.ghost', { type: 'button', onclick: () => copyText(c.invite_code) }, 'Salin')),
    h('p.muted.small', {}, S.partner ? `Terhubung dengan ${S.partner.display_name}.` : 'Menunggu pasangan bergabung (ruang ini maksimal 2 orang).'),
    h('div.row-actions', {}, h('button.btn', { type: 'button', onclick: run(async () => {
      const v = await formModal({ title: 'Ubah universe', fields: [{ name: 'name', label: 'Nama pasangan/universe', required: true }, { name: 'anniversary', label: 'Anniversary', type: 'date' }, { name: 'description', label: 'Deskripsi hubungan', type: 'textarea', rows: 3 }, { name: 'favorite_color', label: 'Warna favorit', type: 'color' }, { name: 'cover', label: 'Foto sampul', type: 'file', accept: 'image/*' }], initial: { ...c, favorite_color: c.favorite_color || '#ff9ec7' } }); if (!v) return;
      const patch = { name: v.name, anniversary: v.anniversary || null, description: v.description || null, favorite_color: v.favorite_color }; if (v.cover) patch.cover_path = await uploadMedia(v.cover, 'covers'); await db.updateCouple(patch); toast('Tersimpan'); location.reload();
    }) }, 'Ubah detail'))));

  // ---------- tampilan ----------
  const pr = S.profile.prefs || {}; const savePref = async patch => { await db.updateProfile({ prefs: { ...(S.profile.prefs || {}), ...patch } }); applyPrefs(); };
  const cur = document.body.dataset.theme;
  root.append(card('🎨 Tampilan', h('p.muted.small', {}, 'Tema mengubah struktur halaman, bukan hanya warna. Pilihan ini tersimpan di akunmu.'),
    h('div.theme-grid', {}, THEME_LIST.map(t => h('button.theme-card' + (t.id === cur ? '.on' : ''), { type: 'button', onclick: () => setTheme(t.id) }, h('div.swatches', {}, t.swatch.map(col => h('i', { style: { background: col } }))), h('b', {}, t.name), h('small', {}, t.blurb)))),
    h('div.two-col', {}, h('label.field', {}, h('span', {}, 'Warna aksen'), h('input', { type: 'color', value: pr.accent || '#ff8fb8', onchange: e => savePref({ accent: e.target.value }) }), h('button.btn.sm.ghost', { type: 'button', onclick: () => savePref({ accent: null }).then(() => location.reload()) }, 'Reset')),
      h('label.field', {}, h('span', {}, 'Font'), h('select', { onchange: e => savePref({ font: e.target.value === 'default' ? null : e.target.value }) }, Object.entries(FONTS).map(([k, l]) => h('option', { value: k, selected: (pr.font || 'default') === k }, l)))),
      h('label.field', {}, h('span', {}, 'Latar & dekorasi'), h('select', { onchange: e => savePref({ bg: e.target.value }) }, Object.entries(BGS).map(([k, l]) => h('option', { value: k, selected: (pr.bg || 'default') === k }, l)))),
      h('label.field.check', {}, h('input', { type: 'checkbox', checked: pr.sparkles !== false, onchange: e => savePref({ sparkles: e.target.checked }).then(() => (document.body.dataset.fx = e.target.checked ? 'on' : 'off')) }), h('span', {}, 'Hati & kilau melayang')))));

  // ---------- privasi ----------
  root.append(card('🔐 Privasi & izin', h('ul.plain', {}, h('li', {}, 'Foto & video disimpan di storage privat — dibuka lewat tautan bertanda tangan yang kedaluwarsa, bukan URL publik.'), h('li', {}, 'Lokasi hanya dibagikan jika kamu menyalakannya di “Kamu di Mana?”, dan bisa dihentikan kapan saja.'), h('li', {}, 'Surat terjadwal & kapsul waktu dikunci di sisi server (RLS) sampai tanggalnya.')),
    h('div.row-actions', {}, h('a.btn.ghost', { href: '#/where' }, 'Atur lokasi & baterai'), 'Notification' in window ? h('button.btn.ghost', { type: 'button', onclick: async () => toast((await Notification.requestPermission()) === 'granted' ? 'Notifikasi diizinkan' : 'Notifikasi tidak diizinkan') }, 'Izin notifikasi') : null)));

  // ---------- data ----------
  root.append(card('📦 Data & akun', h('div.row-actions', {},
    h('button.btn', { type: 'button', onclick: run(async () => {
      const out = { exported_at: new Date().toISOString(), profile: S.profile, couple: S.couple, partner: S.partner && { id: S.partner.id, display_name: S.partner.display_name } };
      for (const t of EXPORT_TABLES) out[t] = await db.list(t); download(`our-little-universe-${ymd()}.json`, JSON.stringify(out, null, 2)); toast('Data diekspor (file media tidak ikut; path-nya tercantum).');
    }) }, '⬇️ Ekspor data (JSON)'),
    h('button.btn.ghost', { type: 'button', onclick: run(async () => { if (!await confirmBox('Hapus SELURUH universe ini beserta semua foto, surat, dan data untuk kalian berdua? Tidak bisa dibatalkan.', 'Hapus semuanya')) return; sharing.stopAll(); await db.deleteCouple(); location.hash = ''; location.reload(); }) }, '🗑 Hapus ruang pasangan'),
    h('button.btn.ghost', { type: 'button', onclick: run(async () => { if (!await confirmBox('Keluar dari pasangan dan hapus profilmu? Data bersama tetap ada untuk pasanganmu.', 'Hapus data saya')) return; sharing.stopAll(); await db.deleteMyData(); location.hash = ''; location.reload(); }) }, '🧹 Hapus data saya')),
    h('p.muted.small', {}, isLive ? 'Menghapus akun login (auth.users) sepenuhnya memerlukan service role — lihat README (Edge Function opsional).' : 'Mode demo: semua data hanya di browser ini.')));

  // ---------- demo ----------
  if (db.demo) root.append(card('🧪 Alat mode demo', h('p.muted.small', {}, 'Hanya untuk mencoba fitur dua arah di satu browser.'), h('div.row-actions', {},
    !S.partner ? h('button.btn', { type: 'button', onclick: run(async () => { await db.demo.addPartner(); toast('Akun pasangan demo dibuat'); location.reload(); }) }, '＋ Tambah akun pasangan demo') : h('button.btn', { type: 'button', onclick: run(async () => { await db.demo.switchUser(); toast('Berpindah ke akun pasangan'); location.reload(); }) }, '🔁 Ganti ke akun pasangan'))));
  return root;
}
