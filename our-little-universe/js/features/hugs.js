import { h, ago, toast, celebrate } from '../core/util.js';
import { db, S, isMe, nameOf, notifyPartner } from '../core/db.js';
import { pageHead, card, empty } from '../core/ui.js';
import { AFFECTIONS } from '../core/content.js';
import { live } from '../core/widgets.js';
import { requirePartner } from './_shared.js';

export default async function hugs() {
  const root = h('div'); const stage = h('div.aff-stage');
  async function send(a) {
    if (!requirePartner()) return;
    await db.insert('affections', { from_user: S.user.id, to_user: S.partner.id, kind: a.id });
    notifyPartner('affection', `${S.profile.display_name} mengirim ${a.l.toLowerCase()} ${a.e}`, '', '#/hugs');
    const f = h('span.aff-fly', {}, a.e); stage.append(f); setTimeout(() => f.remove(), 1400); celebrate([a.e], 6);
  }
  root.append(pageHead('Peluk & Cium Virtual', 'Kirim kasih sayang kecil kapan saja. Pasanganmu menerima animasinya langsung.'),
    card('Kirim untuk ' + (S.partner?.display_name || 'pasanganmu'), h('div.aff-buttons', {}, AFFECTIONS.map(a => h('button.aff-btn', { type: 'button', onclick: () => send(a) }, h('span', {}, a.e), h('small', {}, a.l)))), stage),
    card('📜 Riwayat', live(['affections'], async () => {
      const rows = await db.list('affections', { order: ['created_at', 'desc'], limit: 50 });
      rows.filter(r => isMe(r.to_user) && !r.seen).forEach(r => db.update('affections', r.id, { seen: true }).catch(() => {}));
      if (!rows.length) return empty('🤗', 'Belum ada. Kirim pelukan pertama!');
      return h('ul.aff-log', {}, rows.map(r => { const a = AFFECTIONS.find(x => x.id === r.kind) || AFFECTIONS[2]; return h('li', {}, h('span', {}, a.e), h('div', {}, isMe(r.from_user) ? `Kamu mengirim ${a.l.toLowerCase()}` : `${nameOf(r.from_user)} mengirim ${a.l.toLowerCase()}`, h('small', {}, ' · ' + ago(r.created_at)))); }));
    })));
  return root;
}
