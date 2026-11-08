import { h, fmtDate, formModal, confirmBox, toast, debounce, celebrate } from '../core/util.js';
import { db, S, mediaImg, notifyPartner, nameOf } from '../core/db.js';
import { pageHead, card, empty } from '../core/ui.js';
import { uploadMedia, uploadMany, lightbox } from './_shared.js';

const FIELDS = [
  { name: 'title', label: 'Nama folder', required: true, placeholder: 'mis. Kencan Pertama' },
  { name: 'event_date', label: 'Tanggal', type: 'date' }, { name: 'location', label: 'Lokasi' },
  { name: 'description', label: 'Deskripsi', type: 'textarea', rows: 3 },
  { name: 'cover', label: 'Foto sampul (opsional)', type: 'file', accept: 'image/*' }
];

export default async function folders([id]) { return id ? detail(id) : list(); }

async function list() {
  const root = h('div'); let q = '', sort = 'date_desc';
  const body = h('div');
  const draw = async () => {
    const [fs, media] = await Promise.all([db.list('memory_folders'), db.list('media')]);
    let rows = fs.filter(f => !q || [f.title, f.description, f.location].join(' ').toLowerCase().includes(q));
    const cmp = { date_desc: (a, b) => (b.event_date || b.created_at).localeCompare(a.event_date || a.created_at), date_asc: (a, b) => (a.event_date || a.created_at).localeCompare(b.event_date || b.created_at), name: (a, b) => a.title.localeCompare(b.title) }[sort];
    rows.sort(cmp);
    if (!rows.length) return body.replaceChildren(empty('📁', fs.length ? 'Tidak ada folder yang cocok.' : 'Belum ada folder. Satu folder = satu momen spesial.', h('button.btn', { type: 'button', onclick: create }, '＋ Buat folder pertama')));
    body.replaceChildren(h('div.folder-grid', {}, rows.map(f => {
      const ms = media.filter(m => m.folder_id === f.id); const cover = f.cover_path || ms.find(m => m.kind === 'photo')?.path;
      return h('a.folder', { href: '#/folders/' + f.id }, h('div.folder-cover', {}, cover ? mediaImg(cover, { alt: f.title }) : h('span.folder-ic', {}, '📁')), h('div.folder-info', {}, h('b', {}, f.title), h('small', {}, [f.event_date ? fmtDate(f.event_date) : '', f.location, `${ms.length} file`].filter(Boolean).join(' · '))));
    })));
  };
  async function create() {
    const v = await formModal({ title: 'Folder kenangan baru', fields: FIELDS }); if (!v) return;
    try {
      const cover_path = v.cover ? await uploadMedia(v.cover, 'covers') : null;
      const f = await db.insert('memory_folders', { title: v.title, event_date: v.event_date || null, location: v.location || null, description: v.description || null, cover_path });
      notifyPartner('folder', `Folder baru: ${v.title}`, '', '#/folders/' + f.id); toast('Folder dibuat ♡'); location.hash = '#/folders/' + f.id;
    } catch (e) { toast(e.message, 'err'); }
  }
  root.append(pageHead('Folder Kenangan', 'Satu folder untuk satu momen — isinya bisa puluhan foto.', h('button.btn', { type: 'button', onclick: create }, '＋ Folder baru')),
    h('div.toolbar', {}, h('input', { type: 'search', placeholder: 'Cari folder…', 'aria-label': 'Cari folder', oninput: debounce(e => { q = e.target.value.toLowerCase(); draw(); }, 200) }),
      h('select', { 'aria-label': 'Urutkan', onchange: e => { sort = e.target.value; draw(); } }, [['date_desc', 'Terbaru'], ['date_asc', 'Terlama'], ['name', 'Nama A–Z']].map(([v, l]) => h('option', { value: v }, l)))), body);
  await draw(); return root;
}

async function detail(id) {
  const f = (await db.list('memory_folders')).find(x => x.id === id);
  if (!f) return empty('🫥', 'Folder tidak ditemukan.', h('a.btn', { href: '#/folders' }, 'Kembali'));
  const root = h('div'); const gallery = h('div.media-grid');
  const load = async () => {
    const ms = (await db.list('media', { eq: { folder_id: id }, order: ['sort', 'asc'] }));
    if (!ms.length) return gallery.replaceChildren(empty('🖼️', 'Folder masih kosong. Unggah foto atau video pertama.'));
    const items = ms.map(m => ({ path: m.path, kind: m.kind, caption: m.caption, story: m.story }));
    gallery.replaceChildren(...ms.map((m, i) => h('figure.media', {},
      h('button.media-open', { type: 'button', 'aria-label': 'Buka', onclick: () => lightbox(items, i) }, m.kind === 'video' ? h('div.vid', {}, '▶', mediaImg(null)) : mediaImg(m.path, { alt: m.caption || '' })),
      h('figcaption', {}, m.caption || h('i.muted', {}, 'tanpa caption')),
      h('div.media-actions', {},
        h('button', { type: 'button', title: 'Geser ke kiri', disabled: i === 0, onclick: () => swap(ms, i, i - 1) }, '←'), h('button', { type: 'button', title: 'Geser ke kanan', disabled: i === ms.length - 1, onclick: () => swap(ms, i, i + 1) }, '→'),
        h('button', { type: 'button', title: 'Caption & cerita', onclick: () => edit(m) }, '✎'), m.kind === 'photo' ? h('button', { type: 'button', title: 'Jadikan sampul', onclick: async () => { await db.update('memory_folders', id, { cover_path: m.path }); toast('Sampul diganti'); } }, '★') : null,
        h('button', { type: 'button', title: 'Hapus', onclick: () => del(m) }, '🗑')))));
  };
  async function swap(ms, a, b) { const A = ms[a], B = ms[b]; const sa = A.sort || a, sb = B.sort || b; await db.update('media', A.id, { sort: sb === sa ? b : sb }); await db.update('media', B.id, { sort: sa === sb ? a : sa }); load(); }
  async function edit(m) { const v = await formModal({ title: 'Caption & cerita', fields: [{ name: 'caption', label: 'Caption' }, { name: 'story', label: 'Cerita', type: 'textarea' }], initial: m }); if (!v) return; await db.update('media', m.id, v); load(); }
  async function del(m) { if (!await confirmBox('Hapus file ini dari folder?', 'Hapus')) return; await db.remove('media', m.id); db.removeFile(m.path).catch(() => {}); load(); }
  async function upload(files) {
    if (!files.length) return; const existing = (await db.list('media', { eq: { folder_id: id } })).length;
    const out = await uploadMany(files, 'folders/' + id, (path, file) => db.insert('media', { folder_id: id, kind: file.type.startsWith('video/') ? 'video' : 'photo', path, sort: existing, taken_on: f.event_date, caption: '' }));
    if (out.length) { toast(`${out.length} file tersimpan ♡`); notifyPartner('photos', `${out.length} file baru di “${f.title}”`, '', '#/folders/' + id); celebrate(['📸', '💗'], 8); }
    load();
  }
  async function editFolder() {
    const v = await formModal({ title: 'Ubah folder', fields: FIELDS, initial: f }); if (!v) return;
    const patch = { title: v.title, event_date: v.event_date || null, location: v.location || null, description: v.description || null };
    if (v.cover) patch.cover_path = await uploadMedia(v.cover, 'covers'); await db.update('memory_folders', id, patch); location.reload();
  }
  async function delFolder() {
    if (!await confirmBox(`Hapus folder “${f.title}” beserta semua isinya?`, 'Hapus')) return;
    for (const m of await db.list('media', { eq: { folder_id: id } })) { db.removeFile(m.path).catch(() => {}); } await db.remove('memory_folders', id); location.hash = '#/folders';
  }
  const fileIn = h('input', { type: 'file', multiple: true, accept: 'image/*,video/mp4,video/webm,video/quicktime', hidden: true, onchange: e => upload([...e.target.files]) });
  root.append(pageHead(f.title, [f.event_date ? fmtDate(f.event_date) : '', f.location ? '📍 ' + f.location : ''].filter(Boolean).join(' · ') || 'Folder kenangan',
    [h('a.btn.ghost', { href: '#/folders' }, '← Semua folder'), h('button.btn', { type: 'button', onclick: () => fileIn.click() }, '＋ Foto/Video'), h('button.btn.ghost', { type: 'button', onclick: editFolder }, 'Ubah'), h('button.btn.ghost', { type: 'button', onclick: delFolder }, 'Hapus')]),
    f.description ? h('p.folder-desc', {}, f.description) : null, fileIn, gallery);
  await load(); return root;
}
