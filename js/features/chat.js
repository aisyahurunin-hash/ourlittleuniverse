import { h, fmtTime, toast } from '../core/util.js';
import { db, S, isMe, nameOf, notifyPartner } from '../core/db.js';
import { pageHead, empty } from '../core/ui.js';
import { chat, live, avatar } from '../core/widgets.js';
import { requirePartner } from './_shared.js';

const EMOJI = ['💗', '😊', '😂', '🥺', '😘', '🫶', '✨', '🌸', '🍓', '🎀', '😴', '🤗'];

export default async function chatPage() { return build('default'); }
// Tema Pixel Messenger memakai tampilan jendela MSN
export const variants = { msn: () => build('msn') };

async function build(layout) {
  const root = h('div.chat.layout-' + layout);
  const log = live(['messages'], async () => {
    const ms = await chat.list();
    if (!ms.length) return empty('💬', `Belum ada pesan. Sapa ${S.partner?.display_name || 'pasanganmu'} duluan!`);
    const rows = ms.map(m => layout === 'msn'
      ? h('div.msn-row' + (isMe(m.from_user) ? '.me' : ''), {}, avatar(S.members.find(x => x.id === m.from_user), 34, 'sq'), h('div', {}, h('b.msn-name', {}, `${nameOf(m.from_user)} [${fmtTime(m.created_at)}]:`), h('div.bubble', {}, m.body)))
      : h('div.msg' + (isMe(m.from_user) ? '.me' : ''), {}, h('div.bubble', {}, m.body), h('small', {}, fmtTime(m.created_at))));
    queueMicrotask(() => { const sc = root.querySelector('.chat-scroll'); if (sc) sc.scrollTop = sc.scrollHeight; });
    return rows;
  });
  const scroll = h('div.chat-scroll', {}, log);
  const input = h('textarea', { rows: 2, placeholder: 'Ketik pesan… (Enter untuk kirim)', maxlength: 500, 'aria-label': 'Pesan', onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } } });
  async function send() { const v = input.value; if (!v.trim()) return; input.value = ''; try { await chat.send(v); } catch (e) { toast(e.message, 'err'); input.value = v; } }
  const emo = h('div.emoji-row', { hidden: true }, EMOJI.map(e => h('button', { type: 'button', onclick: () => { input.value += e; input.focus(); } }, e)));
  const sendAff = async (kind, label) => { if (!requirePartner()) return; await db.insert('affections', { from_user: S.user.id, to_user: S.partner.id, kind }); notifyPartner('affection', `${S.profile.display_name} mengirim ${label}`, '', '#/hugs'); toast(`${label} terkirim ♡`); };

  if (layout === 'msn') {
    root.append(h('div.msn-tools', {}, [['👋', 'Invite', () => (location.hash = '#/home')], ['📂', 'Files', () => (location.hash = '#/folders')], ['📷', 'Webcam', () => (location.hash = '#/photobooth')], ['💗', 'Love', () => sendAff('heart', 'hati')]].map(([e, l, f]) => h('button.msn-tool', { type: 'button', onclick: f }, h('span', {}, e), l))),
      scroll, h('div.msn-compose', {}, input, h('div.msn-btns', {}, h('button.btn', { type: 'button', onclick: send }, 'Send'), h('button.btn.ghost', { type: 'button', 'aria-label': 'Emoji', onclick: () => (emo.hidden = !emo.hidden) }, '☺'))), emo);
  } else {
    root.append(pageHead('Obrolan', 'Pesan privat hanya untuk berdua.'), scroll, h('div.chat-compose', {}, input, h('button.btn', { type: 'button', onclick: send }, 'Kirim'), h('button.btn.ghost', { type: 'button', 'aria-label': 'Emoji', onclick: () => (emo.hidden = !emo.hidden) }, '☺')), emo);
  }
  return root;
}
