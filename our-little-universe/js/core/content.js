// Bank konten statis (pertanyaan, game, mood, dll). Bukan data pengguna.
export const MOODS = [
  { id: 'happy', e: '😊', l: 'Bahagia' }, { id: 'excited', e: '🤩', l: 'Semangat' },
  { id: 'tired', e: '😴', l: 'Capek' }, { id: 'sad', e: '😢', l: 'Sedih' },
  { id: 'stressed', e: '😵‍💫', l: 'Stres' }, { id: 'lonely', e: '🥺', l: 'Kesepian' },
  { id: 'missing', e: '💭', l: 'Kangen kamu' }, { id: 'hug', e: '🫂', l: 'Butuh pelukan' }
];
export const moodOf = id => MOODS.find(m => m.id === id) || { e: '🌙', l: '—' };
export const SUPPORT_REPLIES = ['Aku di sini ya 🤍', 'Peluk jauh ✨', 'Kamu hebat, istirahat dulu ya', 'Nanti kita cerita bareng', 'Aku sayang kamu 💗', 'Mau aku telepon?'];

export const AFFECTIONS = [
  { id: 'hug', e: '🤗', l: 'Peluk' }, { id: 'kiss', e: '😘', l: 'Cium' }, { id: 'heart', e: '💗', l: 'Hati' },
  { id: 'flower', e: '🌸', l: 'Bunga' }, { id: 'cuddle', e: '🧸', l: 'Dekap' }
];

export const LETTER_CATS = [
  { id: 'free', l: 'Surat biasa', e: '💌' },
  { id: 'sad', l: 'Buka saat kamu sedih', e: '🌧️' }, { id: 'tired', l: 'Buka saat kamu capek', e: '😴' },
  { id: 'miss', l: 'Buka saat kamu kangen aku', e: '💭' }, { id: 'motivation', l: 'Buka saat butuh semangat', e: '🔥' },
  { id: 'happy', l: 'Buka saat kamu bahagia', e: '🌞' }, { id: 'lonely', l: 'Buka saat kamu kesepian', e: '🥺' },
  { id: 'hug', l: 'Buka saat butuh pelukan', e: '🫂' }, { id: 'sleepless', l: 'Buka saat tidak bisa tidur', e: '🌙' },
  { id: 'anniversary', l: 'Buka di anniversary kita', e: '🎀' }, { id: 'birthday', l: 'Buka di ulang tahunmu', e: '🎂' },
  { id: 'achievement', l: 'Buka saat kamu berhasil', e: '🏆' }, { id: 'meet', l: 'Buka saat kita ketemu lagi', e: '🚉' }
];
export const catOf = id => LETTER_CATS.find(c => c.id === id) || LETTER_CATS[0];
export const PAPERS = [['pink', 'Pink'], ['cream', 'Krem'], ['lavender', 'Lavender'], ['lined', 'Bergaris'], ['floral', 'Bunga']];
export const ENVELOPES = [['rose', '🌹 Rose'], ['peach', '🍑 Peach'], ['mint', '🍃 Mint'], ['sky', '☁️ Sky'], ['lilac', '🔮 Lilac']];

export const QUESTIONS = [
  'Apa momen favoritmu bersamaku?', 'Apa yang ingin kamu lakukan bersama kita?', 'Apa yang bikin kamu merasa dicintai?',
  'Satu hal yang kamu hargai dari aku?', 'Seperti apa kencan impianmu?', 'Apa yang pertama kali kamu pikirkan saat melihatku?',
  'Lagu apa yang mengingatkanmu padaku?', 'Apa kebiasaan kecilku yang kamu suka?', 'Di mana kamu ingin kita tinggal suatu hari nanti?',
  'Apa mimpi yang ingin kamu kejar, dan bagaimana aku bisa membantu?', 'Kapan terakhir kali kamu merasa sangat bangga padaku?',
  'Makanan apa yang ingin kamu masak bareng aku?', 'Apa hal paling lucu yang pernah kita alami?', 'Apa yang kamu pelajari dari hubungan kita?',
  'Hari biasa seperti apa yang terasa sempurna bersamaku?', 'Apa yang bikin kamu tenang saat sedang cemas?', 'Tempat mana yang ingin kamu kunjungi bersamaku?',
  'Apa yang kamu harapkan dari kita 5 tahun lagi?', 'Apa satu hal yang ingin kamu bilang tapi belum sempat?', 'Film apa yang ingin kamu tonton bersamaku lagi?',
  'Apa yang membuatmu jatuh hati padaku?', 'Bagaimana cara terbaik untuk menghiburmu?', 'Apa tradisi kecil yang ingin kita punya?',
  'Apa kenangan masa kecilmu yang ingin kamu bagi?', 'Hadiah terbaik yang pernah kamu terima, dan kenapa?', 'Apa yang kamu syukuri hari ini?',
  'Apa arti "rumah" bagimu?', 'Kalau kita punya satu hari bebas, kita ngapain?', 'Apa tantangan terbesar yang sudah kita lewati?',
  'Apa kata yang menggambarkan kita?', 'Apa yang ingin kamu coba untuk pertama kalinya bersamaku?', 'Apa hal sederhana yang bikin harimu lebih baik?',
  'Apa yang kamu rindukan dariku saat kita berjauhan?', 'Siapa kita di mata sahabat-sahabatmu?', 'Apa panggilan sayang favoritmu?',
  'Apa yang ingin kamu ucapkan terima kasih padaku?', 'Apa kejutan kecil yang ingin kamu terima?', 'Apa nilai terpenting dalam hubungan kita?',
  'Kalau hubungan kita jadi judul lagu, apa judulnya?', 'Apa yang membuatmu tertawa paling keras bersamaku?'
];
export const questionFor = (d = new Date()) => {
  const n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return QUESTIONS[n % QUESTIONS.length];
};

export const KNOW_ME = [
  { q: 'Minuman favorit', o: ['Kopi', 'Teh', 'Boba', 'Air putih'] }, { q: 'Liburan ideal', o: ['Pantai', 'Gunung', 'Kota', 'Di rumah'] },
  { q: 'Sarapan favorit', o: ['Nasi', 'Roti', 'Sereal', 'Skip sarapan'] }, { q: 'Cuaca favorit', o: ['Hujan', 'Cerah', 'Mendung', 'Berangin'] },
  { q: 'Waktu favorit dalam sehari', o: ['Pagi', 'Siang', 'Sore', 'Malam'] }, { q: 'Hewan favorit', o: ['Kucing', 'Anjing', 'Kelinci', 'Lainnya'] },
  { q: 'Saat marah biasanya', o: ['Diam', 'Ngomel', 'Menangis', 'Menghindar'] }, { q: 'Hadiah ideal', o: ['Barang', 'Pengalaman', 'Surat tulisan tangan', 'Makanan'] },
  { q: 'Genre film', o: ['Romantis', 'Komedi', 'Horor', 'Animasi'] }, { q: 'Cara bilang sayang', o: ['Kata-kata', 'Sentuhan', 'Hadiah', 'Waktu bersama'] },
  { q: 'Akhir pekan ideal', o: ['Rebahan', 'Jalan-jalan', 'Masak bareng', 'Main game'] }, { q: 'Camilan favorit', o: ['Manis', 'Asin', 'Pedas', 'Buah'] }
];
export const WHO_LIKELY = [
  'Siapa yang lebih mungkin ketiduran saat nonton film?', 'Siapa yang lebih mungkin lupa jalan padahal sudah pernah ke sana?',
  'Siapa yang lebih mungkin menangis nonton film sedih?', 'Siapa yang lebih mungkin minta maaf duluan?',
  'Siapa yang lebih mungkin bangun lebih pagi?', 'Siapa yang lebih mungkin beli sesuatu yang tidak direncanakan?',
  'Siapa yang lebih mungkin salah tingkah duluan?', 'Siapa yang lebih mungkin telat saat janjian?',
  'Siapa yang lebih mungkin nyanyi di kamar mandi?', 'Siapa yang lebih mungkin menyimpan semua tiket dan kenangan?',
  'Siapa yang lebih mungkin membuat kejutan?', 'Siapa yang lebih mungkin kehabisan baterai HP?',
  'Siapa yang lebih mungkin kalah debat tapi tetap ngotot?', 'Siapa yang lebih mungkin memasak untuk yang lain?',
  'Siapa yang lebih mungkin mengirim pesan duluan setiap hari?'
];
export const THIS_OR_THAT = [
  ['Pantai', 'Gunung'], ['Kopi', 'Teh'], ['Pagi', 'Malam'], ['Film di rumah', 'Bioskop'], ['Hujan', 'Cerah'],
  ['Kucing', 'Anjing'], ['Manis', 'Asin'], ['Pesan teks', 'Telepon'], ['Es krim', 'Kue'], ['Musim hujan', 'Musim kemarau'],
  ['Jalan-jalan', 'Rebahan'], ['Surat', 'Voice note'], ['Kejutan', 'Direncanakan'], ['Masak sendiri', 'Pesan antar'], ['Foto', 'Video']
];
export const WOULD_YOU_RATHER = [
  ['Liburan ke Jepang', 'Liburan ke Eropa'], ['Tinggal di dekat pantai', 'Tinggal di dekat gunung'], ['Bisa baca pikiran pasangan', 'Bisa terbang bersama pasangan'],
  ['Makan makanan favorit selamanya', 'Mencoba makanan baru tiap hari'], ['Kencan di rumah tiap minggu', 'Kencan di luar sebulan sekali'],
  ['Tidak pernah bertengkar', 'Selalu baikan dengan cepat'], ['Punya kucing 5 ekor', 'Punya kelinci 5 ekor'], ['Kado mahal', 'Surat tulisan tangan'],
  ['Menonton sunrise bersama', 'Menonton sunset bersama'], ['Road trip tanpa rencana', 'Liburan dengan itinerary detail'],
  ['Selalu telat tapi menyenangkan', 'Selalu tepat waktu tapi kaku'], ['Pindah ke kota baru bareng', 'Tinggal di kota yang sama selamanya'],
  ['Masak bareng tiap malam', 'Makan di restoran tiap malam'], ['Hidup tanpa musik', 'Hidup tanpa film'], ['Piknik di taman', 'Staycation di hotel']
];
export const TRUTHS = [
  'Apa hal pertama yang kamu perhatikan dariku?', 'Apa kebiasaanku yang diam-diam kamu tiru?', 'Kapan kamu sadar kamu suka padaku?',
  'Apa hal paling manis yang pernah kamu lakukan untukku tapi aku tidak tahu?', 'Apa yang paling kamu takutkan dalam hubungan kita?',
  'Apa kenangan kita yang paling sering kamu putar ulang?', 'Apa satu hal yang ingin kamu ubah dari kebiasaan kita?'
];
export const DARES = [
  'Kirim voice note berisi 3 hal yang kamu suka dariku.', 'Tulis puisi 4 baris tentang kita.', 'Tirukan caraku tertawa.',
  'Kirim foto selfie dengan ekspresi paling konyol.', 'Nyanyikan satu lagu favoritmu untukku.', 'Ceritakan kenangan pertama kita dengan gaya dongeng.',
  'Rencanakan kencan berikutnya lengkap dengan tanggalnya.'
];

export const PET_KINDS = [
  { id: 'cat', e: '🐱', l: 'Kucing' }, { id: 'bunny', e: '🐰', l: 'Kelinci' },
  { id: 'bear', e: '🐻', l: 'Beruang' }, { id: 'chick', e: '🐥', l: 'Anak ayam' }
];
export const PET_ACCESSORIES = [
  { id: 'bow', e: '🎀', l: 'Pita', need: 3 }, { id: 'crown', e: '👑', l: 'Mahkota', need: 15 },
  { id: 'flower', e: '🌸', l: 'Bunga', need: 8 }, { id: 'glasses', e: '🕶️', l: 'Kacamata', need: 25 },
  { id: 'star', e: '⭐', l: 'Bintang', need: 40 }
];

export const PLACE_CATS = [['favorite', '💗 Favorit'], ['food', '🍜 Makan'], ['trip', '🧳 Jalan-jalan'], ['date', '🌹 Kencan'], ['other', '📍 Lainnya']];
export const SPECIAL_KINDS = [['anniversary', '💍 Anniversary'], ['birthday', '🎂 Ulang tahun'], ['first_meet', '👀 Pertama bertemu'], ['first_date', '🌹 Kencan pertama'], ['event', '🎉 Acara penting'], ['custom', '✨ Lainnya']];
export const STICKERS = ['💗', '🎀', '🌸', '✨', '⭐', '🧸', '🍓', '🍒', '🦋', '🌷', '💌', '🕊️', '🫧', '🍰', '🐰', '🐱', '🌙', '☁️', '🔮', '💿', '📼', '🎞️'];
