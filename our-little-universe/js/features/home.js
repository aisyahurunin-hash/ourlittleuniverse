import { h, fmtDate, toast, formModal, ymd, ago, daysBetween, parseYmd } from '../core/util.js';
import { db, S, mediaImg, isMe, nameOf } from '../core/db.js';
import { pageHead, card, empty } from '../core/ui.js';
import { avatar, daysTogether, togetherLong, live, activity, nextSpecial, specialEvents } from '../core/widgets.js';
import { moodOf, questionFor, catOf } from '../core/content.js';
import { copyText } from './_shared.js';

const WIDGETS = [['status', 'Baterai & lokasi'], ['question', 'Pertanyaan harian'], ['mood', 'Mood hari ini'], ['memories', 'Kenangan terbaru'], ['upcoming', 'Tanggal spesial'], ['letters', 'Surat terbaru'], ['activity', 'Aktivitas terbaru']];
const wOn = id => S.profile.prefs?.widgets?.[id] !== false;

const MESSAGES = ['Setiap hari bersamamu adalah halaman favoritku.', 'Terima kasih sudah jadi rumah paling hangat.', 'Hari ini juga, aku memilih kamu lagi.', 'Kita pelan-pelan, tapi pasti.'];

export default async function home() {
  const root = h('div.home');
  // undangan bila pasangan belum bergabung
  if (!S.partner) {
    const link = `${location.origin}${location.pathname}#/join/${S.couple.invite_code}`;
    root.append(card('💌 Ajak pasanganmu', h('p', {}, 'Bagikan kode atau tautan ini. Setelah pasanganmu bergabung, kalian berbagi satu universe privat.'),
      h('div.invite', {}, h('code', {}, S.couple.invite_code), h('button.btn.sm', { type: 'button', onclick: () => copyText(S.couple.invite_code) }, 'Salin kode'), h('button.btn.sm.ghost', { type: 'button', onclick: () => copyText(link) }, 'Salin tautan')),
      !('serviceWorker' in navigator) ? null : null,
      S.mode === 'local' ? h('div', {}, h('p.demo-note', {}, '🧪 Mode demo: kamu bisa menambah “akun pasangan demo” di Pengaturan untuk mencoba fitur dua arah.')) : null));
  }

  const n = daysTogether();
  root.append(h('section.hero', {}, S.couple.cover_path ? h('div.hero-cover', {}, mediaImg(S.couple.cover_path, { alt: 'Cover' })) : null,
    h('div.hero-in', {}, h('div.hero-av', {}, avatar(S.profile, 72), h('span.heart', {}, '💗'), S.partner ? avatar(S.partner, 72) : h('span.avatar.ghost', { style: { width: '72px', height: '72px' } }, '?')),
      h('h2', {}, S.partner ? `${S.profile.display_name} & ${S.partner.display_name}` : S.couple.name),
      n != null ? h('p.big-count', {}, h('b', {}, n.toLocaleString('id-ID')), ' hari bersama') : h('p', {}, 'Atur tanggal anniversary di Pengaturan agar penghitung hari muncul.'),
      n != null ? h('p.sub', {}, `Tepatnya ${togetherLong()}`) : null,
      h('p.script', {}, MESSAGES[(n || 0) % MESSAGES.length]))));

  const grid = h('div.widgets');
  root.append(h('div.row-end', {}, h('button.btn.sm.ghost', { type: 'button', onclick: customize }, '🧩 Atur widget')), grid);

  async function customize() {
    const f = await formModal({ title: 'Widget beranda', fields: WIDGETS.map(([id, l]) => ({ name: id, label: l, type: 'checkbox' })), initial: Object.fromEntries(WIDGETS.map(([id]) => [id, wOn(id)])) });
    if (!f) return;
    await db.updateProfile({ prefs: { ...(S.profile.prefs || {}), widgets: f } }); toast('Tersimpan'); location.reload();
  }

  const today = ymd();
  if (wOn('question')) grid.append(card('❓ Pertanyaan hari ini', live(['question_answers'], async () => {
    const a = await db.list('question_answers', { eq: { day: today } });
    const mine = a.find(x => isMe(x.user_id)), theirs = a.find(x => !isMe(x.user_id));
    return [h('p.q', {}, questionFor()), h('small.muted', {}, `${mine ? '✅ kamu sudah menjawab' : '⌛ kamu belum menjawab'} · ${theirs ? '✅' : '⌛'} ${S.partner?.display_name || 'pasangan'}`), h('a.btn.sm', { href: '#/daily' }, mine ? 'Lihat jawaban' : 'Jawab sekarang')];
  })));
  if (wOn('mood')) grid.append(card('🌤️ Mood hari ini', live(['mood_checkins'], async () => {
    const m = await db.list('mood_checkins', { eq: { day: today } });
    return [h('div.mood-pair', {}, S.members.map(p => { const x = m.find(r => r.user_id === p.id); return h('div.mood-one', {}, avatar(p, 36), h('span.big', {}, x ? moodOf(x.mood).e : '·'), h('small', {}, x ? (x.note || moodOf(x.mood).l) : 'belum check-in')); })), h('a.btn.sm', { href: '#/mood' }, 'Check-in')];
  })));
  if (wOn('status')) grid.append(card('📍 Baterai & lokasi', live(['battery_status', 'location_shares'], async () => {
    if (!S.partner) return h('p.muted', {}, 'Tersedia setelah pasanganmu bergabung.');
    const b = (await db.list('battery_status')).find(x => x.user_id === S.partner.id);
    const l = (await db.list('location_shares')).find(x => x.user_id === S.partner.id);
    return [h('p', {}, b && b.level != null ? `🔋 ${S.partner.display_name}: ${b.level}%${b.charging ? ' ⚡ mengisi' : ''} · ${ago(b.updated_at)}${b.source === 'manual' ? ' (manual)' : ''}` : '🔋 Baterai belum dibagikan.'),
      h('p', {}, l?.enabled && l.lat != null ? `📍 Lokasi dibagikan · ${ago(l.updated_at)}` : '📍 Lokasi tidak dibagikan.'), h('a.btn.sm', { href: '#/where' }, 'Buka')];
  })));
  if (wOn('upcoming')) grid.append(card('🎉 Tanggal spesial', live(['special_dates', 'countdowns'], async () => {
    const a = [...await specialEvents(new Date().getFullYear()), ...await specialEvents(new Date().getFullYear() + 1)].filter(e => e.date >= new Date(new Date().setHours(0, 0, 0, 0))).sort((x, y) => x.date - y.date).slice(0, 3);
    if (!a.length) return [h('p.muted', {}, 'Belum ada tanggal.'), h('a.btn.sm', { href: '#/calendar' }, 'Tambah')];
    return a.map(e => h('p', {}, h('b', {}, e.title), h('br'), h('small', {}, `${fmtDate(e.date)} · ${daysBetween(new Date(), e.date) === 0 ? 'hari ini! 🎊' : daysBetween(new Date(), e.date) + ' hari lagi'}`)));
  })));
  if (wOn('letters')) grid.append(card('💌 Surat untukmu', live(['letters'], async () => {
    const l = (await db.list('letters', { order: ['created_at', 'desc'] })).filter(x => isMe(x.to_user) && !x.is_draft).slice(0, 3);
    if (!l.length) return [h('p.muted', {}, 'Belum ada surat masuk.'), h('a.btn.sm', { href: '#/letters' }, 'Tulis surat')];
    return [l.map(x => h('p', {}, `${catOf(x.category).e} `, h('b', {}, x.title || 'Tanpa judul'), x.opened_at ? '' : h('span.new', {}, ' baru'), h('br'), h('small', {}, `dari ${nameOf(x.from_user)} · ${ago(x.created_at)}`))), h('a.btn.sm', { href: '#/letters' }, 'Buka kotak surat')];
  })));
  if (wOn('memories')) grid.append(card('📸 Kenangan terbaru', live(['media'], async () => {
    const m = (await db.list('media', { order: ['created_at', 'desc'], limit: 6 })).filter(x => x.kind === 'photo');
    if (!m.length) return [h('p.muted', {}, 'Belum ada foto.'), h('a.btn.sm', { href: '#/folders' }, 'Buat folder')];
    return [h('div.thumbs', {}, m.map(x => h('a.thumb', { href: '#/folders/' + x.folder_id }, mediaImg(x.path)))), h('a.btn.sm', { href: '#/memories' }, 'Lihat semua')];
  })));
  if (wOn('activity')) grid.append(card('✨ Aktivitas terbaru', activity(6)));
  return root;
}
