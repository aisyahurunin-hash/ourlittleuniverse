import { h, ymd, fmtDate, toast, debounce, celebrate } from '../core/util.js';
import { db, S, isMe, nameOf, notifyPartner } from '../core/db.js';
import { pageHead, card, empty } from '../core/ui.js';
import { questionFor } from '../core/content.js';
import { live } from '../core/widgets.js';

export default async function daily() {
  const root = h('div'); const today = ymd(); let q = '';
  root.append(pageHead('Pertanyaan Harian', 'Satu pertanyaan baru setiap hari. Jawaban pasangan terbuka setelah kamu menjawab.'));
  root.append(live(['question_answers'], async () => {
    const rows = await db.list('question_answers', { order: ['day', 'desc'] });
    const mine = rows.find(r => isMe(r.user_id) && r.day === today), theirs = rows.find(r => !isMe(r.user_id) && r.day === today);
    const ta = h('textarea', { rows: 4, placeholder: 'Tulis jawabanmu…', maxlength: 1000, value: mine?.answer || '' });
    const todayCard = card('✨ Hari ini · ' + fmtDate(new Date()), h('p.q.big', {}, questionFor()), ta,
      h('button.btn', { type: 'button', onclick: async () => {
        if (!ta.value.trim()) return toast('Tulis jawabanmu dulu ♡', 'err');
        await db.upsert('question_answers', { user_id: S.user.id, day: today, question: questionFor(), answer: ta.value.trim() }, 'couple_id,user_id,day');
        notifyPartner('daily', `${S.profile.display_name} sudah menjawab pertanyaan hari ini`, '', '#/daily'); toast('Jawaban tersimpan'); celebrate(['💗'], 6);
      } }, mine ? 'Perbarui jawaban' : 'Kirim jawaban'),
      h('div.answers', {}, h('div.ans', {}, h('b', {}, 'Kamu'), h('p', {}, mine ? mine.answer : '—')),
        h('div.ans', {}, h('b', {}, S.partner?.display_name || 'Pasangan'), h('p', {}, !mine ? '🔒 Jawab dulu untuk melihat jawabannya.' : theirs ? theirs.answer : '⌛ Belum menjawab.'))));
    const days = [...new Set(rows.map(r => r.day))].filter(d => d !== today);
    const hist = h('div.history', {});
    const drawHist = () => hist.replaceChildren(...days.map(d => {
      const a = rows.filter(r => r.day === d); const qq = a[0].question;
      if (q && !(qq + a.map(x => x.answer).join(' ')).toLowerCase().includes(q)) return null;
      return h('div.hist-item', {}, h('small', {}, fmtDate(d)), h('b', {}, qq), a.map(x => h('p', {}, h('i', {}, nameOf(x.user_id) + ': '), x.answer)));
    }), !days.length ? h('p.muted', {}, 'Riwayat akan muncul di sini.') : null);
    drawHist();
    return [todayCard, card('📚 Riwayat pertanyaan', h('input', { type: 'search', placeholder: 'Cari di riwayat…', 'aria-label': 'Cari riwayat', oninput: debounce(e => { q = e.target.value.toLowerCase(); drawHist(); }, 200) }), hist)];
  }));
  return root;
}
