// Widget bersama yang dipakai shell tema & beranda. Semua data nyata dari db.
import { h, fmtDate, fmtTime, ago, daysBetween, parseYmd, ymd, pad, ymdBetween, nextAnnual, toast } from './util.js';
import { db, S, on, mediaImg, mediaUrl, nameOf, isMe, notifyPartner } from './db.js';
import { moodOf } from './content.js';

export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/** Render ulang otomatis saat tabel tertentu berubah (realtime / aksi lokal). */
export function live(tables, render) {
  const box = h('div.live', {}, h('div.sk.sk-line'), h('div.sk.sk-line.short'));
  const run = async () => {
    try { const n = await render(); box.replaceChildren(...[].concat(n).filter(Boolean)); }
    catch (e) { console.error(e); box.replaceChildren(h('p.muted', '⚠️ ' + e.message)); }
  };
  run();
  const off = on('change', d => {
    if (box.isConnected) box.__att = true; else if (box.__att) return off();
    if (tables === '*' || !d?.table || d.table === '*' || tables.includes(d.table)) run();
  });
  return box;
}

export function avatar(p, size = 48, cls = '') {
  const box = h('span.avatar' + (cls ? '.' + cls : ''), { style: { width: size + 'px', height: size + 'px', fontSize: size * .42 + 'px' } });
  if (p?.avatar_path) box.append(mediaImg(p.avatar_path, { alt: p.display_name || '' }));
  else box.append((p?.display_name || '♡').trim().charAt(0).toUpperCase());
  return box;
}

export const daysTogether = () => S.couple?.anniversary ? Math.max(0, daysBetween(parseYmd(S.couple.anniversary))) : null;
export function togetherLong() {
  if (!S.couple?.anniversary) return 'Atur tanggal anniversary di Pengaturan';
  const { years, months, days } = ymdBetween(parseYmd(S.couple.anniversary));
  return [years && `${years} tahun`, months && `${months} bulan`, `${days} hari`].filter(Boolean).join(' ');
}
export function digitCounter(n, len = 6) {
  const s = String(n ?? 0).padStart(len, '0');
  return h('span.digits', {}, [...s].map(c => h('b', {}, c)));
}

// ---------- obrolan ----------
export const chat = {
  list: () => db.list('messages', { order: ['created_at', 'asc'] }),
  async send(body) {
    body = body.trim(); if (!body) return;
    await db.insert('messages', { from_user: S.user.id, body });
    notifyPartner('message', `${S.profile.display_name}: pesan baru`, body.slice(0, 80), '#/chat');
  }
};

export function miniChat(max = 5) {
  const log = live(['messages'], async () => {
    const all = (await chat.list()).slice(-max);
    if (!all.length) return h('p.muted.small', {}, 'Belum ada obrolan. Sapa dulu yuk ♡');
    return all.map(m => h('div.mc-line' + (isMe(m.from_user) ? '.me' : ''), {}, h('b', {}, nameOf(m.from_user) + ': '), m.body));
  });
  const inp = h('input', { type: 'text', placeholder: 'Tulis pesan…', maxlength: 500, 'aria-label': 'Pesan' });
  const form = h('form.mc-form', { onsubmit: async e => { e.preventDefault(); const v = inp.value; inp.value = ''; try { await chat.send(v); } catch (er) { toast(er.message, 'err'); } } }, inp, h('button.btn.sm', { type: 'submit' }, 'Kirim'));
  return h('div.mini-chat', {}, log, form);
}

// ---------- radio (playlist bersama) ----------
export function radio() {
  return live(['playlist_songs'], async () => {
    const songs = await db.list('playlist_songs', { order: ['created_at', 'desc'] });
    const fav = songs.filter(s => s.favorite); const s = (fav.length ? fav : songs)[Math.floor(Date.now() / 3600000) % Math.max(1, (fav.length ? fav : songs).length)];
    if (!s) return h('p.muted.small', {}, 'Belum ada lagu. Tambahkan di Playlist ♪');
    return h('div.radio', {}, h('div.eq', {}, h('i'), h('i'), h('i'), h('i')), h('div.song', {}, h('b', {}, s.title), h('small', {}, s.artist || '')),
      s.url ? h('a.btn.sm', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, '▶ Putar') : h('a.btn.sm.ghost', { href: '#/playlist' }, 'Playlist'));
  });
}

// ---------- kalender ----------
export async function specialEvents(year) {
  const out = []; const rows = await db.list('special_dates');
  const add = (title, dateStr, kind, yearly = true) => {
    if (!dateStr) return; const d = parseYmd(dateStr);
    if (yearly) out.push({ date: new Date(year, d.getMonth(), d.getDate()), title, kind, base: d });
    else if (d.getFullYear() === year) out.push({ date: d, title, kind, base: d });
  };
  if (S.couple?.anniversary) add('Anniversary kita 💍', S.couple.anniversary, 'anniversary');
  S.members.forEach(m => m.birthday && add(`Ulang tahun ${m.display_name} 🎂`, m.birthday, 'birthday'));
  rows.forEach(r => add(r.title, r.date, r.kind, r.yearly));
  const cds = await db.list('countdowns');
  cds.filter(c => !c.archived).forEach(c => { const d = new Date(c.target_at); if (d.getFullYear() === year) out.push({ date: d, title: c.title + ' ⏰', kind: 'countdown', base: d }); });
  return out;
}

export function miniCalendar() {
  let cur = new Date(); cur.setDate(1);
  const box = h('div.mini-cal');
  const draw = async () => {
    const ev = await specialEvents(cur.getFullYear()).catch(() => []);
    const first = (cur.getDay() + 6) % 7; const dim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    const today = new Date(); const cells = [];
    DOW.forEach(d => cells.push(h('i.dow', {}, d.charAt(0))));
    for (let i = 0; i < first; i++) cells.push(h('i'));
    for (let d = 1; d <= dim; d++) {
      const hit = ev.filter(e => e.date.getMonth() === cur.getMonth() && e.date.getDate() === d);
      const isT = today.getFullYear() === cur.getFullYear() && today.getMonth() === cur.getMonth() && today.getDate() === d;
      cells.push(h('i.day' + (isT ? '.today' : '') + (hit.length ? '.hit' : ''), { title: hit.map(e => e.title).join(', ') }, d));
    }
    box.replaceChildren(
      h('div.cal-head', {}, h('button', { type: 'button', 'aria-label': 'Bulan sebelumnya', onclick: () => { cur.setMonth(cur.getMonth() - 1); draw(); } }, '‹'), h('b', {}, `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`), h('button', { type: 'button', 'aria-label': 'Bulan berikutnya', onclick: () => { cur.setMonth(cur.getMonth() + 1); draw(); } }, '›')),
      h('div.cal-grid', {}, cells));
  };
  draw();
  const off = on('change', d => { if (!box.isConnected) return box.__att ? off() : 0; box.__att = true; if (!d?.table || ['special_dates', 'countdowns', '*'].includes(d.table)) draw(); });
  return box;
}

// ---------- aktivitas terbaru ----------
export function activity(n = 6) {
  return live('*', async () => {
    const T = [['memory_folders', '📁', r => `Folder “${r.title}”`], ['timeline_events', '🕰️', r => `Linimasa: ${r.title}`], ['notes', '📝', r => `Catatan: ${r.title}`],
      ['bucket_items', '✅', r => `${r.done ? 'Tercapai' : 'Bucket list'}: ${r.title}`], ['places', '📍', r => `Tempat: ${r.name}`], ['playlist_songs', '🎵', r => `Lagu: ${r.title}`], ['media', '🖼️', r => 'Foto/video baru']];
    const all = [];
    for (const [t, ic, f] of T) (await db.list(t, { order: ['created_at', 'desc'], limit: 4 })).forEach(r => all.push({ ic, text: f(r), at: r.created_at, by: r.created_by }));
    (await db.list('letters', { order: ['created_at', 'desc'], limit: 4 })).filter(l => isMe(l.to_user) && !l.is_draft).forEach(l => all.push({ ic: '💌', text: 'Surat dari ' + nameOf(l.from_user), at: l.created_at, by: l.from_user }));
    all.sort((a, b) => new Date(b.at) - new Date(a.at));
    if (!all.length) return h('p.muted.small', {}, 'Belum ada aktivitas. Mulai simpan kenangan pertama ♡');
    return h('ul.activity', {}, all.slice(0, n).map(a => h('li', {}, h('span', {}, a.ic), h('div', {}, h('b', {}, a.text), h('small', {}, `${a.by ? nameOf(a.by) + ' · ' : ''}${ago(a.at)}`)))));
  });
}

// ---------- daftar anggota + mood + baterai ----------
export function onlineList() {
  return live(['mood_checkins', 'battery_status'], async () => {
    const moods = await db.list('mood_checkins', { order: ['day', 'desc'], limit: 10 });
    const bats = await db.list('battery_status');
    return h('ul.members', {}, S.members.map(m => {
      const md = moods.find(x => x.user_id === m.id); const b = bats.find(x => x.user_id === m.id);
      return h('li', {}, avatar(m, 30), h('div', {}, h('b', {}, isMe(m.id) ? `${m.display_name} (kamu)` : m.display_name),
        h('small', {}, [md ? `${moodOf(md.mood).e} ${moodOf(md.mood).l}` : 'Belum check-in', b && b.level != null ? ` · 🔋${b.level}%${b.charging ? '⚡' : ''}` : ''].join(''))));
    }));
  });
}

// ---------- widget "HP" (tema manifest) ----------
export function phoneScreen() {
  return live(['messages', 'mood_checkins'], async () => {
    const msgs = await chat.list(); const last = [...msgs].reverse().find(m => !isMe(m.from_user)) || msgs[msgs.length - 1];
    return h('div.phone-msg', {}, last
      ? [h('div.who', {}, avatar(S.members.find(m => m.id === last.from_user), 34), h('b', {}, nameOf(last.from_user))), h('p', {}, last.body), h('small', {}, `${fmtDate(last.created_at, { day: 'numeric', month: 'short' })} ${fmtTime(last.created_at)}`)]
      : [h('p.muted', {}, 'Belum ada pesan. Tekan “Balas” untuk menyapa ♡')]);
  });
}

export function nextSpecial() {
  return specialEvents(new Date().getFullYear()).then(async a => {
    const b = await specialEvents(new Date().getFullYear() + 1).catch(() => []);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [...a, ...b].filter(e => e.date >= today).sort((x, y) => x.date - y.date)[0] || null;
  });
}
