// 7 game pasangan. Skor & riwayat disimpan di game_sessions (milik masing-masing pemain).
import { h, toast, ymd, fmtDate, parseYmd, pick, formModal, ago, celebrate } from '../core/util.js';
import { db, S, isMe, nameOf, mediaImg, notifyPartner } from '../core/db.js';
import { pageHead, card, empty, tabs } from '../core/ui.js';
import { KNOW_ME, WHO_LIKELY, THIS_OR_THAT, WOULD_YOU_RATHER, TRUTHS, DARES } from '../core/content.js';
import { live, MONTHS } from '../core/widgets.js';
import { requirePartner } from './_shared.js';

const GAMES = [['know', '🧠', 'How Well Do You Know Me?', 'Tebak pilihan pasanganmu'], ['who', '👀', 'Who Is More Likely To?', 'Siapa yang paling mungkin…'], ['this', '⚖️', 'This or That', 'Pilih salah satu — cocok nggak?'],
  ['trivia', '🎓', 'Couple Trivia', 'Kapan momen itu terjadi? (dari linimasamu)'], ['memory', '🖼️', 'Guess the Memory', 'Tebak kapan foto ini diambil'], ['tod', '🎭', 'Truth or Dare', 'Kartu jujur atau tantangan'], ['rather', '🤔', 'Would You Rather?', 'Pilih yang lebih kamu mau']];

const rows = () => db.list('game_sessions', { order: ['updated_at', 'desc'] });
const mineOf = (all, game, round = 'main') => all.find(r => isMe(r.user_id) && r.game === game && r.round === round);
const theirs = (all, game, round = 'main') => all.find(r => !isMe(r.user_id) && r.game === game && r.round === round);
const save = (game, data, score = null, round = 'main') => db.upsert('game_sessions', { user_id: S.user.id, game, round, data, score, updated_at: new Date().toISOString() }, 'couple_id,user_id,game,round');
const radio = (name, opts, val, on) => h('div.opts', {}, opts.map((o, i) => h('label.opt' + (val === i ? '.on' : ''), {}, h('input', { type: 'radio', name, checked: val === i, onchange: () => on(i) }), h('span', {}, o))));

export default async function games([id]) {
  const root = h('div');
  if (!id) {
    root.append(pageHead('Game Pasangan', 'Main berdua — skor dan riwayat tersimpan.'), h('div.game-grid', {}, GAMES.map(([g, e, t, d]) => h('a.game-card', { href: '#/games/' + g }, h('span.big', {}, e), h('b', {}, t), h('small', {}, d)))),
      card('🏅 Riwayat & skor', live(['game_sessions'], async () => {
        const all = await rows(); const sc = all.filter(r => r.score != null);
        if (!sc.length) return h('p.muted', {}, 'Belum ada skor. Coba Couple Trivia atau Guess the Memory.');
        return h('ul.history-list', {}, sc.slice(0, 12).map(r => h('li', {}, h('b', {}, GAMES.find(g => g[0] === r.game)?.[2] || r.game), ` — ${nameOf(r.user_id)}: ${r.score} poin `, h('small', {}, ago(r.updated_at)))));
      })));
    return root;
  }
  const meta = GAMES.find(g => g[0] === id); if (!meta) return empty('🫥', 'Game tidak ditemukan.', h('a.btn', { href: '#/games' }, 'Kembali'));
  root.append(pageHead(`${meta[1]} ${meta[2]}`, meta[3], h('a.btn.ghost', { href: '#/games' }, '← Semua game')));
  const body = h('div'); root.append(body);
  const impl = { know, who: () => statements('who', WHO_LIKELY), this: () => pairs('this', THIS_OR_THAT), rather: () => pairs('rather', WOULD_YOU_RATHER), trivia, memory, tod }[id];
  body.append(live(['game_sessions', 'media', 'timeline_events', 'memory_folders'], impl)); return root;
}

// ---------- A. How well do you know me ----------
async function know() {
  if (!requirePartner()) return empty('🧠', 'Game ini butuh dua pemain.');
  const all = await rows(), me = mineOf(all, 'know'), them = theirs(all, 'know'); const d = me?.data || { a: {}, g: {} };
  const done = r => r && Object.keys(r.data.a || {}).length === KNOW_ME.length && Object.keys(r.data.g || {}).length === KNOW_ME.length;
  const form = h('div.quiz', {}, KNOW_ME.map((q, i) => h('div.q-block', {}, h('b', {}, `${i + 1}. ${q.q}`), h('small', {}, 'Jawabanku:'), radio('a' + i, q.o, d.a[i], v => { d.a[i] = v; }), h('small', {}, `Tebakanku untuk ${S.partner.display_name}:`), radio('g' + i, q.o, d.g[i], v => { d.g[i] = v; }))));
  const out = [h('p.muted', {}, 'Isi jawabanmu dan tebakanmu untuk pasangan. Skor muncul setelah kalian berdua selesai.'), form, h('button.btn', { type: 'button', onclick: async () => {
    const full = Object.keys(d.a).length === KNOW_ME.length && Object.keys(d.g).length === KNOW_ME.length; if (!full) return toast('Lengkapi semua pilihan dulu.', 'err');
    await save('know', d); notifyPartner('game', `${S.profile.display_name} sudah main “How Well Do You Know Me?”`, '', '#/games/know'); toast('Tersimpan ♡');
  } }, me ? 'Perbarui jawaban' : 'Kirim')];
  if (done(me) && done(them)) {
    const score = r1 => KNOW_ME.reduce((n, _, i) => n + (r1.data.g[i] === (r1 === me ? them : me).data.a[i] ? 1 : 0), 0);
    out.unshift(card('🎉 Hasil', h('p.big', {}, `${S.profile.display_name}: ${score(me)}/${KNOW_ME.length} · ${S.partner.display_name}: ${score(them)}/${KNOW_ME.length}`),
      h('ul', {}, KNOW_ME.map((q, i) => h('li', {}, `${q.q}: kamu menebak “${q.o[me.data.g[i]]}”, jawaban dia “${q.o[them.data.a[i]]}” ${me.data.g[i] === them.data.a[i] ? '✅' : '❌'}`)))));
    if (me.score !== score(me)) save('know', d, score(me));
  } else if (done(me)) out.unshift(h('p.demo-note', {}, `Menunggu ${S.partner.display_name} menyelesaikan…`));
  return out;
}

// ---------- B. Who is more likely ----------
async function statements(game, list) {
  if (!requirePartner()) return empty('👀', 'Game ini butuh dua pemain.');
  const all = await rows(), me = mineOf(all, game), them = theirs(all, game); const d = me?.data || { p: {} };
  const full = r => r && Object.keys(r.data.p || {}).length === list.length;
  const form = list.map((q, i) => h('div.q-block', {}, h('b', {}, q), radio('w' + i, ['Aku', S.partner.display_name], d.p[i], v => { d.p[i] = v; })));
  const out = [...form, h('button.btn', { type: 'button', onclick: async () => { if (Object.keys(d.p).length < list.length) return toast('Jawab semua dulu.', 'err'); await save(game, d); notifyPartner('game', `${S.profile.display_name} sudah memilih di “Who Is More Likely”`, '', '#/games/who'); toast('Tersimpan'); } }, me ? 'Perbarui' : 'Kirim')];
  if (full(me) && full(them)) { const agree = list.filter((_, i) => me.data.p[i] !== them.data.p[i]).length; out.unshift(card('🎉 Hasil', h('p.big', {}, `Sepakat di ${agree} dari ${list.length} pertanyaan`), h('ul', {}, list.map((q, i) => { const same = me.data.p[i] !== them.data.p[i]; return h('li', {}, `${q} → kamu: ${me.data.p[i] === 0 ? 'aku' : S.partner.display_name}; dia: ${them.data.p[i] === 0 ? 'aku' : S.profile.display_name} ${same ? '✅' : '🤭'}`); })))); }
  else if (full(me)) out.unshift(h('p.demo-note', {}, `Menunggu ${S.partner.display_name}…`));
  return out;
}

// ---------- C & G. This or That / Would you rather ----------
async function pairs(game, list) {
  if (!requirePartner()) return empty('⚖️', 'Game ini butuh dua pemain.');
  const all = await rows(), me = mineOf(all, game), them = theirs(all, game); const d = me?.data || { p: {} };
  const full = r => r && Object.keys(r.data.p || {}).length === list.length;
  const out = [...list.map((q, i) => h('div.q-block', {}, radio(game + i, q, d.p[i], v => { d.p[i] = v; }))), h('button.btn', { type: 'button', onclick: async () => { if (Object.keys(d.p).length < list.length) return toast('Pilih semua dulu.', 'err'); await save(game, d); notifyPartner('game', `${S.profile.display_name} sudah memilih`, '', '#/games/' + game); toast('Tersimpan'); } }, me ? 'Perbarui' : 'Kirim')];
  if (full(me) && full(them)) { const same = list.filter((_, i) => me.data.p[i] === them.data.p[i]).length; const pct = Math.round(same / list.length * 100); out.unshift(card('🎉 Kecocokan', h('p.big', {}, `${pct}% cocok (${same}/${list.length})`), h('ul', {}, list.map((q, i) => h('li', {}, `${q[me.data.p[i]]} · ${q[them.data.p[i]]} ${me.data.p[i] === them.data.p[i] ? '💞' : '↔️'}`))))); if (me.score !== pct) save(game, d, pct); }
  else if (full(me)) out.unshift(h('p.demo-note', {}, `Menunggu ${S.partner.display_name}…`));
  return out;
}

// ---------- D. Couple trivia (dari linimasa & folder) ----------
const fmtMY = d => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
function dateOptions(real) { const set = new Map([[fmtMY(real), true]]); let guard = 0; while (set.size < 4 && guard++ < 40) { const d = new Date(real.getFullYear(), real.getMonth() + Math.floor((Math.random() - .5) * 24), 1); set.set(fmtMY(d), false); } return [...set.keys()].sort(() => Math.random() - .5); }
async function trivia() {
  const ev = [...(await db.list('timeline_events')).map(e => ({ q: `Kapan “${e.title}” terjadi?`, d: parseYmd(e.event_date) })), ...(await db.list('memory_folders')).filter(f => f.event_date).map(f => ({ q: `Kapan momen “${f.title}” berlangsung?`, d: parseYmd(f.event_date) }))];
  if (ev.length < 3) return empty('🎓', 'Trivia dibuat dari data kalian sendiri. Tambahkan minimal 3 peristiwa di Linimasa atau folder bertanggal.', h('a.btn', { href: '#/timeline' }, 'Ke Linimasa'));
  return quiz('trivia', ev.sort(() => Math.random() - .5).slice(0, 5).map(e => ({ q: e.q, correct: fmtMY(e.d), opts: dateOptions(e.d) })));
}
// ---------- E. Guess the memory ----------
async function memory() {
  const folders = await db.list('memory_folders'); const media = (await db.list('media')).filter(m => m.kind === 'photo' && m.taken_on);
  const items = media.sort(() => Math.random() - .5).slice(0, 5).map(m => ({ img: m.path, correct: fmtMY(parseYmd(m.taken_on)), opts: dateOptions(parseYmd(m.taken_on)), q: 'Kapan foto ini diambil?' }));
  if (items.length < 1) return empty('🖼️', 'Butuh foto yang punya tanggal (folder bertanggal). Unggah foto ke folder yang diberi tanggal.', h('a.btn', { href: '#/folders' }, 'Ke Folder'));
  return quiz('memory', items);
}
function quiz(game, items) {
  let i = 0, score = 0; const box = h('div.quiz-play');
  const step = () => {
    if (i >= items.length) { save(game, { total: items.length }, score, 'p' + Date.now()); celebrate(); return box.replaceChildren(h('p.big', {}, `Skor: ${score}/${items.length} 🎉`), h('a.btn', { href: '#/games/' + game, onclick: () => setTimeout(() => location.reload(), 10) }, 'Main lagi')); }
    const it = items[i];
    box.replaceChildren(h('small', {}, `Soal ${i + 1}/${items.length}`), it.img ? h('div.q-photo', {}, mediaImg(it.img)) : null, h('h3', {}, it.q), h('div.opts', {}, it.opts.map(o => h('button.btn.ghost.opt-btn', { type: 'button', onclick: e => { const ok = o === it.correct; if (ok) score++; e.currentTarget.classList.add(ok ? 'right' : 'wrong'); box.querySelectorAll('button').forEach(b => { b.disabled = true; if (b.textContent === it.correct) b.classList.add('right'); }); setTimeout(() => { i++; step(); }, 1100); } }, o))));
  }; step(); return box;
}

// ---------- F. Truth or dare ----------
async function tod() {
  const custom = (await db.list('game_sessions')).filter(r => r.game === 'tod_custom'); const box = h('div.tod'); const card_ = h('div.tod-card', {}, 'Pilih Truth atau Dare');
  const draw = type => { const pool = [...(type === 'truth' ? TRUTHS : DARES), ...custom.filter(c => c.data.type === type).map(c => c.data.text)]; card_.textContent = (type === 'truth' ? '🫣 Truth: ' : '🔥 Dare: ') + pick(pool); card_.classList.remove('flip'); void card_.offsetWidth; card_.classList.add('flip'); };
  box.append(card_, h('div.row-actions', {}, h('button.btn', { type: 'button', onclick: () => draw('truth') }, 'Truth'), h('button.btn', { type: 'button', onclick: () => draw('dare') }, 'Dare'), h('button.btn.ghost', { type: 'button', onclick: async () => {
    const v = await formModal({ title: 'Kartu buatan sendiri', fields: [{ name: 'type', label: 'Jenis', type: 'select', options: [['truth', 'Truth'], ['dare', 'Dare']] }, { name: 'text', label: 'Isi kartu (sopan & saling menghargai ♡)', required: true }] }); if (!v) return;
    await save('tod_custom', { type: v.type, text: v.text }, null, 'c' + Date.now()); } }, '＋ Kartu sendiri')),
    custom.length ? h('details', {}, h('summary', {}, `Kartu buatan kalian (${custom.length})`), h('ul', {}, custom.map(c => h('li', {}, `${c.data.type === 'truth' ? 'Truth' : 'Dare'}: ${c.data.text} `, isMe(c.user_id) ? h('button.btn.sm.ghost', { type: 'button', onclick: () => db.remove('game_sessions', c.id) }, '🗑') : null)))) : null);
  return box;
}
