import { h, ymd, toast, pad } from '../core/util.js';
import { db, S, isMe, nameOf, notifyPartner } from '../core/db.js';
import { pageHead, card } from '../core/ui.js';
import { MOODS, moodOf, SUPPORT_REPLIES } from '../core/content.js';
import { live, MONTHS, DOW, avatar } from '../core/widgets.js';

export default async function mood() {
  const root = h('div'); const today = ymd(); let sel = null; let cur = new Date(); cur.setDate(1);
  root.append(pageHead('Apa Kabarmu Hari Ini?', 'Check-in singkat supaya pasanganmu tahu bagaimana perasaanmu.'));
  root.append(live(['mood_checkins'], async () => {
    const rows = await db.list('mood_checkins', { order: ['day', 'desc'] });
    const mine = rows.find(r => isMe(r.user_id) && r.day === today), theirs = rows.find(r => !isMe(r.user_id) && r.day === today);
    sel ||= mine?.mood || null;
    const note = h('input', { type: 'text', maxlength: 200, placeholder: 'Catatan singkat (opsional)', value: mine?.note || '' });
    const picker = h('div.mood-picker', {}, MOODS.map(m => h('button.mood-btn' + (m.id === sel ? '.on' : ''), { type: 'button', 'aria-pressed': m.id === sel, onclick: e => { sel = m.id; picker.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); } }, h('span', {}, m.e), h('small', {}, m.l))));
    const save = h('button.btn', { type: 'button', onclick: async () => {
      if (!sel) return toast('Pilih mood dulu', 'err');
      await db.upsert('mood_checkins', { user_id: S.user.id, day: today, mood: sel, note: note.value || null }, 'couple_id,user_id,day');
      notifyPartner('mood', `${S.profile.display_name} merasa ${moodOf(sel).l.toLowerCase()} ${moodOf(sel).e}`, note.value || '', '#/mood'); toast('Tersimpan ♡');
    } }, mine ? 'Perbarui' : 'Simpan');
    const them = card('💞 ' + (S.partner?.display_name || 'Pasanganmu'), theirs ? [h('p.big', {}, `${moodOf(theirs.mood).e} ${moodOf(theirs.mood).l}`), theirs.note ? h('p', {}, `“${theirs.note}”`) : null,
      theirs.reply ? h('p.muted', {}, 'Balasanmu: ' + theirs.reply) : h('div.chips', {}, SUPPORT_REPLIES.map(r => h('button.chip', { type: 'button', onclick: async () => { await db.update('mood_checkins', theirs.id, { reply: r }); notifyPartner('reply', 'Balasan untuk moodmu', r, '#/mood'); toast('Terkirim'); } }, r)))] : h('p.muted', {}, 'Belum check-in hari ini.'));
    const mineReply = mine?.reply ? h('p.muted', {}, `${S.partner?.display_name || 'Pasangan'} membalas: ${mine.reply}`) : null;

    // kalender mood
    const cal = h('div'); const drawCal = () => {
      const first = (cur.getDay() + 6) % 7, dim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate(); const cells = DOW.map(d => h('i.dow', {}, d));
      for (let i = 0; i < first; i++) cells.push(h('i'));
      for (let d = 1; d <= dim; d++) { const key = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(d)}`; const day = rows.filter(r => r.day === key);
        cells.push(h('i.day', { title: day.map(r => `${nameOf(r.user_id)}: ${moodOf(r.mood).l}${r.note ? ' — ' + r.note : ''}`).join('\n') }, h('small', {}, d), h('span', {}, day.map(r => moodOf(r.mood).e).join('')))); }
      cal.replaceChildren(h('div.cal-head', {}, h('button', { type: 'button', onclick: () => { cur.setMonth(cur.getMonth() - 1); drawCal(); } }, '‹'), h('b', {}, `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`), h('button', { type: 'button', onclick: () => { cur.setMonth(cur.getMonth() + 1); drawCal(); } }, '›')), h('div.cal-grid.mood-cal', {}, cells));
    }; drawCal();
    return [h('div.two-col', {}, card('🌤️ Kamu', picker, note, save, mineReply), them), card('🗓️ Kalender mood', cal)];
  }));
  return root;
}
