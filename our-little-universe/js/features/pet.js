// Peliharaan virtual bersama. Rasa lapar/senang menurun seiring waktu (dihitung dari updated_at), bukan angka palsu.
import { h, toast, formModal, clamp, celebrate, ago } from '../core/util.js';
import { db, S, nameOf, notifyPartner } from '../core/db.js';
import { pageHead, card } from '../core/ui.js';
import { PET_KINDS, PET_ACCESSORIES } from '../core/content.js';
import { live } from '../core/widgets.js';

const DECAY = { hunger: 2.2, happiness: 1.6, affection: 1.2 }; // poin per jam
const current = p => { const hrs = (Date.now() - new Date(p.updated_at || p.created_at)) / 3600000; return Object.fromEntries(Object.entries(DECAY).map(([k, v]) => [k, clamp(Math.round(p[k] - v * hrs), 0, 100)])); };
const bar = (l, v) => h('div.stat', {}, h('small', {}, `${l} ${v}%`), h('div.progress', {}, h('i', { style: { width: v + '%' } })));

export default async function pet() {
  const root = h('div'); root.append(pageHead('Peliharaan Kita', 'Rawat bareng. Kalau lama tidak diurus, dia akan kangen.'));
  root.append(live(['pets'], async () => {
    const p = (await db.list('pets'))[0];
    if (!p) return card('🥚 Pilih peliharaan', h('div.pet-pick', {}, PET_KINDS.map(k => h('button.pet-opt', { type: 'button', onclick: async () => { const v = await formModal({ title: `Beri nama ${k.l}`, fields: [{ name: 'name', label: 'Nama', required: true }] }); if (!v) return; await db.insert('pets', { name: v.name, kind: k.id, hunger: 80, happiness: 80, affection: 80, unlocked: [], care_count: 0, log: [], updated_at: new Date().toISOString() }); celebrate(['🥚', '✨']); } }, h('span.big', {}, k.e), k.l))));
    const k = PET_KINDS.find(x => x.id === p.kind) || PET_KINDS[0], cur = current(p), acc = PET_ACCESSORIES.find(a => a.id === p.accessory);
    const mood = Math.min(cur.hunger, cur.happiness, cur.affection) < 30 ? '🥺' : Math.min(cur.hunger, cur.happiness, cur.affection) > 70 ? '😻' : '🙂';
    async function act(kind, label, delta, em) {
      const next = { hunger: cur.hunger, happiness: cur.happiness, affection: cur.affection, ...Object.fromEntries(Object.entries(delta).map(([a, v]) => [a, clamp(cur[a] + v, 0, 100)])) };
      const count = (p.care_count || 0) + 1; const unlocked = PET_ACCESSORIES.filter(a => count >= a.need).map(a => a.id);
      const log = [{ by: S.user.id, act: label, at: new Date().toISOString() }, ...(p.log || [])].slice(0, 20);
      await db.update('pets', p.id, { ...next, care_count: count, unlocked, log, updated_at: new Date().toISOString() });
      const newly = unlocked.filter(u => !(p.unlocked || []).includes(u)); if (newly.length) { toast(`🎁 Aksesori baru: ${PET_ACCESSORIES.find(a => a.id === newly[0]).l}!`); celebrate(); }
      notifyPartner('pet', `${S.profile.display_name} ${label} ${p.name} ${em}`, '', '#/pet');
    }
    return h('div.pet-wrap', {}, card(null, h('div.pet-stage', {}, h('div.pet.mood-' + mood, {}, h('span.pet-body', {}, k.e), acc ? h('span.pet-acc', {}, acc.e) : null), h('span.pet-mood', {}, mood)), h('h3', {}, p.name), h('small', {}, `${k.l} · dirawat ${p.care_count || 0}×`),
      bar('Kenyang', cur.hunger), bar('Senang', cur.happiness), bar('Kasih sayang', cur.affection),
      h('div.row-actions', {}, h('button.btn', { type: 'button', onclick: () => act('feed', 'memberi makan', { hunger: 30, happiness: 4 }, '🍓') }, '🍓 Beri makan'), h('button.btn', { type: 'button', onclick: () => act('play', 'bermain dengan', { happiness: 25, hunger: -6 }, '🎾') }, '🎾 Main'), h('button.btn', { type: 'button', onclick: () => act('pet', 'mengelus', { affection: 25, happiness: 6 }, '💗') }, '💗 Elus'))),
      card('👗 Aksesori', h('div.acc-row', {}, h('button.chip' + (!p.accessory ? '.on' : ''), { type: 'button', onclick: () => db.update('pets', p.id, { accessory: null }) }, 'Polos'), PET_ACCESSORIES.map(a => { const ok = (p.unlocked || []).includes(a.id); return h('button.chip' + (p.accessory === a.id ? '.on' : ''), { type: 'button', disabled: !ok, title: ok ? '' : `Terbuka setelah ${a.need}× perawatan`, onclick: () => db.update('pets', p.id, { accessory: a.id }) }, ok ? `${a.e} ${a.l}` : `🔒 ${a.l} (${a.need}×)`); }))),
      card('📜 Perawatan terakhir', (p.log || []).length ? h('ul', {}, p.log.slice(0, 6).map(l => h('li', {}, `${nameOf(l.by)} ${l.act} ${p.name} · ${ago(l.at)}`))) : h('p.muted', {}, 'Belum ada.')));
  }));
  return root;
}
