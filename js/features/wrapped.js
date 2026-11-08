// Relationship Wrapped — angka dihitung dari data yang benar-benar tersimpan.
import { h, download, daysBetween, parseYmd, celebrate } from '../core/util.js';
import { db, S, mediaImg } from '../core/db.js';
import { pageHead, empty } from '../core/ui.js';
import { MONTHS } from '../core/widgets.js';

const inYear = (d, y) => d && new Date(String(d).length === 10 ? parseYmd(d) : d).getFullYear() === y;

export async function stats(year) {
  const [media, folders, letters, bucket, events, places, pages, notes] = await Promise.all(['media', 'memory_folders', 'letters', 'bucket_items', 'timeline_events', 'places', 'scrapbook_pages', 'notes'].map(t => db.list(t)));
  const m = media.filter(x => inYear(x.created_at, year)), f = folders.filter(x => inYear(x.created_at, year)), l = letters.filter(x => !x.is_draft && inYear(x.created_at, year));
  const b = bucket.filter(x => x.done && inYear(x.done_at, year)), e = events.filter(x => inYear(x.event_date, year)), pl = places.filter(x => inYear(x.visited_on, year));
  const months = Array(12).fill(0); const bump = d => { if (d) months[new Date(String(d).length === 10 ? parseYmd(d) : d).getMonth()]++; };
  m.forEach(x => bump(x.taken_on || x.created_at)); l.forEach(x => bump(x.created_at)); e.forEach(x => bump(x.event_date)); f.forEach(x => bump(x.event_date || x.created_at)); b.forEach(x => bump(x.done_at));
  const best = Math.max(...months); const memories = m.length + f.length + e.length + pages.filter(x => inYear(x.created_at, year)).length + notes.filter(x => inYear(x.created_at, year)).length;
  const top = f.map(x => ({ x, n: media.filter(mm => mm.folder_id === x.id).length })).sort((a, c) => c.n - a.n).slice(0, 3);
  return { days: S.couple.anniversary ? daysBetween(parseYmd(S.couple.anniversary)) : null, photos: m.filter(x => x.kind === 'photo').length, videos: m.filter(x => x.kind === 'video').length, memories, folders: f.length, letters: l.length, bucket: b.length, bestMonth: best > 0 ? MONTHS[months.indexOf(best)] : null, bestCount: best, places: pl, topFolders: top, events: e };
}

export default async function wrapped() {
  const root = h('div'); const thisY = new Date().getFullYear(); let year = thisY, i = 0; const stage = h('div.wrap-stage');
  const yearSel = h('select', { 'aria-label': 'Tahun', onchange: e => { year = +e.target.value; load(); } }, [thisY, thisY - 1, thisY - 2].map(y => h('option', { value: y }, y)));
  let slides = [];
  const big = (e, n, l, sub) => h('div.wslide', {}, h('span.big', {}, e), h('div.wnum', {}, n), h('p', {}, l), sub ? h('small', {}, sub) : null);
  async function load() {
    const s = await stats(year); i = 0; const total = s.memories + s.letters + s.bucket;
    if (!total && s.days == null) { stage.replaceChildren(empty('🎁', `Belum ada data di ${year}. Simpan kenangan dulu, lalu Wrapped akan terisi.`)); return; }
    slides = [
      h('div.wslide.intro', {}, h('span.big', {}, '🎁'), h('h2', {}, `Wrapped ${year}`), h('p', {}, `${S.profile.display_name}${S.partner ? ' & ' + S.partner.display_name : ''}`), h('small', {}, 'Ketuk “Berikutnya” untuk melihat tahun kalian ♡')),
      s.days != null ? big('💞', s.days.toLocaleString('id-ID'), 'hari bersama sampai hari ini') : big('💞', '—', 'Atur tanggal anniversary di Pengaturan untuk melihat jumlah hari'),
      big('📸', s.photos, 'foto diunggah', s.videos ? `+ ${s.videos} video` : null), big('🗂️', s.memories, 'kenangan tersimpan', `${s.folders} folder baru`),
      big('💌', s.letters, 'surat saling dikirim'), big('✅', s.bucket, 'impian bucket list tercapai'),
      s.bestMonth ? big('🌙', s.bestMonth, 'bulan paling berkesan', `${s.bestCount} aktivitas tercatat`) : big('🌙', '—', 'Belum cukup data untuk bulan terbaik'),
      h('div.wslide', {}, h('span.big', {}, '📍'), h('p', {}, s.places.length ? 'Tempat yang kalian simpan tahun ini' : 'Belum ada tempat yang disimpan tahun ini'), s.places.length ? h('ul', {}, s.places.slice(0, 5).map(p => h('li', {}, p.name))) : h('small', {}, 'Hanya menampilkan tempat yang kamu simpan sendiri di Peta Kita.')),
      h('div.wslide', {}, h('span.big', {}, '💗'), h('p', {}, 'Momen favorit'), s.topFolders.length ? h('ul', {}, s.topFolders.map(t => h('li', {}, `${t.x.title} (${t.n} file)`))) : h('small', {}, 'Belum ada folder tahun ini.'))
    ];
    draw(s);
  }
  function draw(s) {
    stage.replaceChildren(h('div.wrap-card', {}, slides[i]), h('div.wrap-dots', {}, slides.map((_, k) => h('i' + (k === i ? '.on' : '')))),
      h('div.row-actions', {}, h('button.btn.ghost', { type: 'button', disabled: i === 0, onclick: () => { i--; draw(s); } }, '‹ Kembali'), i < slides.length - 1 ? h('button.btn', { type: 'button', onclick: () => { i++; draw(s); if (i === slides.length - 1) celebrate(); } }, 'Berikutnya ›') : h('button.btn', { type: 'button', onclick: () => png(s) }, '⬇️ Unduh ringkasan (privat)')));
  }
  function png(s) {
    const c = document.createElement('canvas'); c.width = 900; c.height = 1200; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 900, 1200); g.addColorStop(0, '#ffd9e6'); g.addColorStop(1, '#e8d9ff'); x.fillStyle = g; x.fillRect(0, 0, 900, 1200);
    x.textAlign = 'center'; x.fillStyle = '#a8456f'; x.font = 'bold 64px Georgia, serif'; x.fillText(`Wrapped ${year}`, 450, 140); x.font = '36px Georgia'; x.fillText(`${S.profile.display_name}${S.partner ? ' & ' + S.partner.display_name : ''}`, 450, 200);
    const lines = [[s.days != null ? s.days.toLocaleString('id-ID') : '—', 'hari bersama'], [s.photos, 'foto'], [s.memories, 'kenangan tersimpan'], [s.letters, 'surat'], [s.bucket, 'impian tercapai'], [s.bestMonth || '—', 'bulan paling berkesan']];
    lines.forEach(([n, l], k) => { const y = 320 + k * 140; x.fillStyle = '#7a2f55'; x.font = 'bold 72px Georgia'; x.fillText(String(n), 450, y); x.font = '30px Georgia'; x.fillStyle = '#a8456f'; x.fillText(l, 450, y + 44); });
    x.font = '26px Georgia'; x.fillText('Our Little Universe ♡', 450, 1150); c.toBlob(b => download(`wrapped-${year}.png`, b), 'image/png');
  }
  root.append(pageHead('Relationship Wrapped', 'Rekap tahun kalian — hanya dari data yang benar-benar kalian simpan.', yearSel), stage); await load(); return root;
}
