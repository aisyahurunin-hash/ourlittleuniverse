// Daftar fitur + grup navigasi. Tema boleh menimpa label/ikon (vocab/icons).
export const GROUPS = [
  { id: 'kita', label: 'Kita' }, { id: 'rasa', label: 'Rasa & Pesan' }, { id: 'seru', label: 'Seru-seruan' },
  { id: 'waktu', label: 'Waktu & Rencana' }, { id: 'dunia', label: 'Dunia' }, { id: 'akun', label: 'Akun' }
];

export const FEATURES = [
  { id: 'home', g: 'kita', label: 'Beranda', ic: '🏠' },
  { id: 'memories', g: 'kita', label: 'Kenangan Kita', ic: '📸' },
  { id: 'folders', g: 'kita', label: 'Folder Kenangan', ic: '📁' },
  { id: 'scrapbook', g: 'kita', label: 'Scrapbook', ic: '📒' },
  { id: 'photobooth', g: 'kita', label: 'Photobooth', ic: '📷' },
  { id: 'timeline', g: 'kita', label: 'Linimasa', ic: '🕰️' },
  { id: 'letters', g: 'rasa', label: 'Surat Cinta', ic: '💌' },
  { id: 'chat', g: 'rasa', label: 'Obrolan', ic: '💬' },
  { id: 'daily', g: 'rasa', label: 'Pertanyaan Harian', ic: '❓' },
  { id: 'mood', g: 'rasa', label: 'Apa Kabarmu?', ic: '🌤️' },
  { id: 'hugs', g: 'rasa', label: 'Peluk & Cium', ic: '🤗' },
  { id: 'games', g: 'seru', label: 'Game Pasangan', ic: '🎮' },
  { id: 'pet', g: 'seru', label: 'Peliharaan Kita', ic: '🐱' },
  { id: 'bucket', g: 'seru', label: 'Bucket List', ic: '✅' },
  { id: 'playlist', g: 'seru', label: 'Playlist', ic: '🎵' },
  { id: 'capsule', g: 'waktu', label: 'Kapsul Waktu', ic: '⏳' },
  { id: 'calendar', g: 'waktu', label: 'Kalender', ic: '📅' },
  { id: 'countdown', g: 'waktu', label: 'Hitung Mundur', ic: '⏰' },
  { id: 'notes', g: 'waktu', label: 'Catatan', ic: '📝' },
  { id: 'wrapped', g: 'waktu', label: 'Wrapped', ic: '🎁' },
  { id: 'map', g: 'dunia', label: 'Peta Kita', ic: '🗺️' },
  { id: 'where', g: 'dunia', label: 'Kamu di Mana?', ic: '📍' },
  { id: 'search', g: 'akun', label: 'Cari', ic: '🔍' },
  { id: 'notifications', g: 'akun', label: 'Notifikasi', ic: '🔔' },
  { id: 'settings', g: 'akun', label: 'Pengaturan', ic: '⚙️' }
];

/** Terapkan vocab + ikon tema pada daftar fitur */
export function itemsFor(theme) {
  return FEATURES.map(f => ({ ...f, label: theme.vocab?.[f.id] || f.label, ic: theme.icons?.[f.id] || f.ic }));
}
