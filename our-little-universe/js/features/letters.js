import { h, fmtDate, fmtDateTime, toast, confirmBox, modal, toLocalInput, sleep, celebrate, ago } from '../core/util.js';
import { db, S, mediaImg, notifyPartner, isMe, nameOf } from '../core/db.js';
import { pageHead, empty, tabs, card } from '../core/ui.js';
import { LETTER_CATS, catOf, PAPERS, ENVELOPES, STICKERS } from '../core/content.js';
import { uploadMedia, requirePartner } from './_shared.js';
import { live } from '../core/widgets.js';

export default async function letters(params) { return render('default', params); }
// Tema Manifest memakai tata letak "Kantor Pos"
export const variants = { 'post-office': params => render('post', params) };

async function render(layout, params = []) {
  const root = h('div.letters.layout-' + layout); let tab = params[0] === 'write' ? 'write' : 'inbox'; let editing = null;
  const body = h('div.letters-body');
  const go = t => { tab = t; draw(); };
  const head = () => pageHead(layout === 'post' ? 'Kantor Pos Kita' : 'Surat Cinta', 'Tulis, jadwalkan, dan simpan surat untuk pasanganmu.',
    h('button.btn', { type: 'button', onclick: () => { editing = null; go('write'); } }, '✍️ Tulis surat'));
  const tabBar = () => tabs([['inbox', '📥 Masuk'], ['sent', '📤 Terkirim'], ['drafts', '📝 Draf'], ['fav', '⭐ Favorit'], ['write', '✍️ Tulis']], tab, go);
  const draw = async () => {
    root.replaceChildren(head(), tabBar(), body);
    if (tab === 'write') return body.replaceChildren(composer());
    body.replaceChildren(live(['letters'], () => list(tab)));
  };

  // ---------- daftar ----------
  async function list(kind) {
    const all = await db.list('letters', { order: ['created_at', 'desc'] });
    let rows = kind === 'inbox' ? all.filter(l => isMe(l.to_user) && !l.is_draft) : kind === 'sent' ? all.filter(l => isMe(l.from_user) && !l.is_draft) : kind === 'drafts' ? all.filter(l => isMe(l.from_user) && l.is_draft) : all.filter(l => l.favorite && !l.is_draft);
    if (!rows.length) return empty({ inbox: '📭', sent: '📤', drafts: '📝', fav: '⭐' }[kind], { inbox: 'Belum ada surat masuk.', sent: 'Belum ada surat terkirim.', drafts: 'Tidak ada draf.', fav: 'Belum ada surat favorit.' }[kind]);
    if (kind === 'inbox') { // kelompokkan "Buka saat…"
      const cats = LETTER_CATS.filter(c => c.id !== 'free');
      const sealed = rows.filter(l => l.category !== 'free');
      return [h('div.env-grid', {}, rows.map(l => envelope(l, kind))), sealed.length ? h('small.muted', {}, `${sealed.length} surat “Buka saat…” — buka hanya saat kamu membutuhkannya ♡`) : null];
    }
    return h('div.env-grid', {}, rows.map(l => envelope(l, kind)));
  }
  function envelope(l, kind) {
    const c = catOf(l.category); const mineSent = isMe(l.from_user);
    const status = l.is_draft ? 'draf' : mineSent ? (l.unlock_at && new Date(l.unlock_at) > new Date() ? `🔒 terbuka ${fmtDateTime(l.unlock_at)}` : l.opened_at ? '✓ sudah dibaca' : 'belum dibuka') : (l.opened_at ? 'sudah dibuka' : '✨ baru');
    return h('button.envelope.env-' + (l.envelope || 'rose') + (l.opened_at ? '.opened' : ''), { type: 'button', onclick: () => l.is_draft ? (editing = l, go('write')) : openLetter(l) },
      h('span.env-flap', {}), h('span.env-seal', {}, c.e), h('div.env-info', {}, h('b', {}, l.title || 'Tanpa judul'), h('small', {}, c.id === 'free' ? '' : c.l), h('small', {}, `${mineSent ? 'untuk ' + nameOf(l.to_user) : 'dari ' + nameOf(l.from_user)} · ${ago(l.created_at)}`), h('em', {}, status)));
  }

  // ---------- membuka surat (animasi amplop) ----------
  async function openLetter(l) {
    const recipient = isMe(l.to_user);
    const paper = h('article.paper.paper-' + (l.template || 'pink'), { hidden: true }, h('h3', {}, l.title || 'Untukmu'), l.photo_path ? h('div.letter-photo', {}, mediaImg(l.photo_path)) : null,
      h('div.letter-text', {}, l.body), l.stickers ? h('div.letter-stickers', {}, l.stickers) : null, h('footer.script', {}, `— ${nameOf(l.from_user)}, ${fmtDate(l.created_at)}`));
    const anim = h('div.env-anim.env-' + (l.envelope || 'rose'), {}, h('div.ea-back'), h('div.ea-letter'), h('div.ea-front'), h('div.ea-flap'), h('div.ea-seal', {}, catOf(l.category).e));
    const fav = h('button.btn.sm.ghost', { type: 'button', onclick: async e => { l.favorite = !l.favorite; await db.update('letters', l.id, { favorite: l.favorite }); e.currentTarget.textContent = l.favorite ? '⭐ Favorit' : '☆ Jadikan favorit'; } }, l.favorite ? '⭐ Favorit' : '☆ Jadikan favorit');
    const m = modal({ title: l.title || 'Surat', body: h('div.letter-view', {}, anim, paper, h('div.row-actions', {}, fav, !isMe(l.from_user) ? null : h('button.btn.sm.ghost', { type: 'button', onclick: async () => { if (await confirmBox('Hapus surat ini?', 'Hapus')) { await db.remove('letters', l.id); m.close(); } } }, 'Hapus'))), wide: true });
    setTimeout(() => anim.classList.add('open'), 150);
    await sleep(1500); anim.hidden = true; paper.hidden = false; celebrate(['💗', '✨'], 8);
    if (recipient && !l.opened_at) { await db.update('letters', l.id, { opened_at: new Date().toISOString() }); notifyPartner('letter_read', `${S.profile.display_name} membaca suratmu 💌`, l.title || '', '#/letters'); }
  }

  // ---------- penulis surat ----------
  function composer() {
    if (!requirePartner()) return empty('💌', 'Surat bisa ditulis setelah pasanganmu bergabung.', h('a.btn', { href: '#/home' }, 'Ke beranda'));
    const e = editing || {};
    const d = { title: e.title || '', body: e.body || '', category: e.category || 'free', template: e.template || 'pink', envelope: e.envelope || 'rose', stickers: e.stickers || '', schedule: e.unlock_at ? 'date' : 'now', unlock_at: e.unlock_at ? toLocalInput(e.unlock_at) : '', photo: null };
    const title = h('input', { type: 'text', placeholder: 'Judul surat', value: d.title, maxlength: 80, oninput: ev => d.title = ev.target.value });
    const text = h('textarea.paper-input', { rows: 12, placeholder: `Sayangku ${S.partner.display_name}, …`, value: d.body, oninput: ev => d.body = ev.target.value, 'aria-label': 'Isi surat' });
    const sheet = h('div.paper.paper-' + d.template, {}, text); const stk = h('div.letter-stickers', {}, d.stickers);
    const cat = h('select', { onchange: ev => d.category = ev.target.value }, LETTER_CATS.map(c => h('option', { value: c.id, selected: c.id === d.category }, `${c.e} ${c.l}`)));
    const dt = h('input', { type: 'datetime-local', value: d.unlock_at, hidden: d.schedule !== 'date', onchange: ev => d.unlock_at = ev.target.value });
    const sch = h('select', { onchange: ev => { d.schedule = ev.target.value; dt.hidden = d.schedule !== 'date'; } }, [['now', 'Kirim sekarang'], ['date', 'Jadwalkan — terkunci sampai tanggal']].map(([v, l]) => h('option', { value: v, selected: v === d.schedule }, l)));
    const paperPick = h('div.swatch-row', {}, PAPERS.map(([id, l]) => h('button.swatch.sw-paper-' + id + (id === d.template ? '.on' : ''), { type: 'button', title: l, 'aria-label': 'Kertas ' + l, onclick: ev => { d.template = id; sheet.className = 'paper paper-' + id; paperPick.querySelectorAll('.swatch').forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on'); } }, l)));
    const envPick = h('div.swatch-row', {}, ENVELOPES.map(([id, l]) => h('button.swatch.sw-env-' + id + (id === d.envelope ? '.on' : ''), { type: 'button', title: l, 'aria-label': 'Amplop ' + l, onclick: ev => { d.envelope = id; envPick.querySelectorAll('.swatch').forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on'); } }, l)));
    const stickers = h('div.sticker-row', {}, STICKERS.slice(0, 12).map(s => h('button', { type: 'button', 'aria-label': 'Stiker ' + s, onclick: () => { d.stickers += s; stk.textContent = d.stickers; } }, s)), h('button', { type: 'button', title: 'Hapus stiker', onclick: () => { d.stickers = ''; stk.textContent = ''; } }, '⌫'));
    const photo = h('input', { type: 'file', accept: 'image/*', onchange: ev => d.photo = ev.target.files[0] || null });

    async function save(send) {
      if (!d.body.trim()) return toast('Isi suratnya dulu ya ♡', 'err');
      if (send && d.schedule === 'date' && (!d.unlock_at || new Date(d.unlock_at) <= new Date())) return toast('Pilih tanggal pembukaan di masa depan.', 'err');
      try {
        const row = { to_user: S.partner.id, title: d.title || null, body: d.body, template: d.template, envelope: d.envelope, category: d.category, stickers: d.stickers || null, unlock_at: d.schedule === 'date' ? new Date(d.unlock_at).toISOString() : null, is_draft: !send };
        if (d.photo) row.photo_path = await uploadMedia(d.photo, 'letters');
        if (e.id) await db.update('letters', e.id, row); else await db.insert('letters', { from_user: S.user.id, ...row });
        if (send && !row.unlock_at) notifyPartner('letter', 'Ada surat baru untukmu 💌', d.title || '', '#/letters');
        toast(send ? (row.unlock_at ? 'Surat dijadwalkan 🔒' : 'Surat terkirim 💌') : 'Draf tersimpan'); editing = null; go(send ? 'sent' : 'drafts'); if (send) celebrate(['💌', '💗']);
      } catch (er) { toast(er.message, 'err'); }
    }
    const actions = h('div.row-actions', {}, h('button.btn.ghost', { type: 'button', onclick: () => save(false) }, '📝 Simpan draf'), h('button.btn', { type: 'button', onclick: () => save(true) }, layout === 'post' ? '📮 Kirim surat' : '💌 Kirim'));
    const fields = h('div.letter-fields', {}, h('label.field', {}, h('span', {}, 'Judul'), title), h('label.field', {}, h('span', {}, 'Jenis surat'), cat), h('label.field', {}, h('span', {}, 'Waktu'), sch, dt), h('label.field', {}, h('span', {}, 'Foto (opsional)'), photo));
    if (layout === 'post') {
      return h('div.post-office', {}, h('aside.po-people', {}, h('h4', {}, 'Kepada siapa?'), h('div.po-person.on', {}, h('span', {}, '💌'), h('b', {}, S.partner.display_name))),
        h('div.po-desk', {}, h('div.po-board', {}, h('b', {}, 'Tulis dari hati ♡'), h('small', {}, 'Setiap surat akan dibalas dengan senyum.')), fields, sheet, stk, stickers),
        h('aside.po-pick', {}, h('h4', {}, 'Pilih kertas'), paperPick, h('h4', {}, 'Pilih amplop'), envPick, actions));
    }
    return h('div.composer', {}, fields, sheet, stk, stickers, h('div.pick-pair', {}, h('div', {}, h('h5', {}, 'Kertas'), paperPick), h('div', {}, h('h5', {}, 'Amplop'), envPick)), actions);
  }

  await draw(); return root;
}
