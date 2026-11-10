// AchievementManager: daftar pencapaian, trophy (piala), dan pengecekan
import { BIKE_ORDER } from './BikeStats.js';
import { TRACK_ORDER } from './tracks.js';

const cat = (s, k) => s.stats.eduCat?.[k] ?? 0;
export const ACHIEVEMENTS = [
  { id: 'first-finish', icon: '🏁', title: 'Finish Pertama', desc: 'Selesaikan satu balapan.', check: (s) => s.stats.races >= 1 },
  { id: 'juara-kampung', icon: '🏆', title: 'Juara Jalanan', desc: 'Menangkan satu balapan.', check: (s) => s.stats.wins >= 1 },
  { id: 'podium-3', icon: '🥉', title: 'Langganan Podium', desc: 'Finish 3 besar sebanyak 3 kali.', check: (s) => s.stats.podiums >= 3 },
  { id: 'tiga-bintang', icon: '🌟', title: 'Tiga Bintang', desc: 'Raih 3 bintang di sebuah lintasan.', check: (s) => Object.values(s.bestStars).some((v) => v >= 3) },
  { id: 'kolektor-koin', icon: '🪙', title: 'Kolektor Koin', desc: 'Kumpulkan 200 koin dari balapan.', check: (s) => s.stats.coins >= 200 },
  { id: 'raja-stunt', icon: '🤸', title: 'Raja Stunt', desc: 'Lakukan 5 stunt 360°.', check: (s) => s.stats.tricks >= 5 },
  { id: 'pembalap-bersih', icon: '✨', title: 'Pembalap Bersih', desc: 'Finish tanpa menabrak apa pun.', check: (s, c) => !!c && c.hits === 0 },
  { id: 'sepeda-lengkap', icon: '🚲', title: 'Koleksi Sepeda', desc: 'Miliki semua jenis sepeda di Garage.', check: (s) => s.bikes.length >= BIKE_ORDER.length },
  { id: 'upgrade-max', icon: '🔧', title: 'Mekanik Handal', desc: 'Upgrade satu atribut sampai MAX.', check: (s) => Object.values(s.upgrades).some((u) => Object.values(u).some((v) => v >= 3)) },
  { id: 'pemburu-koin', icon: '🔍', title: 'Pemburu Koin Tersembunyi', desc: 'Ambil 20 koin dalam Free Ride.', check: (s) => s.stats.freeCoins >= 20 },
  { id: 'murid-pintar', icon: '🎓', title: 'Murid Pintar', desc: 'Jawab 5 tantangan edukasi dengan benar.', check: (s) => s.stats.eduCorrect >= 5 },
  { id: 'pelajar-sempurna', icon: '💯', title: 'Pelajar Sempurna', desc: 'Jawab semua tantangan dalam satu balapan dengan benar.', check: (s, c) => !!c?.eduPerfect },
  { id: 'ahli-matematika', icon: '🧮', title: 'Ahli Hitung', desc: 'Benar 5 soal Matematika.', check: (s) => cat(s, 'matematika') >= 5 },
  { id: 'ahli-keselamatan', icon: '🚦', title: 'Duta Keselamatan', desc: 'Benar 5 soal Keselamatan.', check: (s) => cat(s, 'keselamatan') >= 5 },
  { id: 'pecinta-lingkungan', icon: '🌱', title: 'Pecinta Lingkungan', desc: 'Benar 3 soal Lingkungan.', check: (s) => cat(s, 'lingkungan') >= 3 },
  { id: 'ahli-strategi', icon: '⚡', title: 'Ahli Strategi', desc: 'Benar 3 soal Strategi.', check: (s) => cat(s, 'strategi') >= 3 },
  { id: 'grand-champion', icon: '👑', title: 'Grand Champion', desc: 'Juara umum Championship.', check: (s) => s.stats.champs >= 1 },

  // ---- Trophy (piala) ----
  { id: 'piala-kampung', kind: 'trophy', icon: '🏆', title: 'Piala Juara Kampung', desc: 'Jadi Grand Champion Championship.', check: (s) => s.stats.champs >= 1 },
  { id: 'piala-cerdas', kind: 'trophy', icon: '🥇', title: 'Piala Pembalap Cerdas', desc: 'Jawab 10 tantangan edukasi dengan benar.', check: (s) => s.stats.eduCorrect >= 10 },
  { id: 'piala-podium', kind: 'trophy', icon: '🏅', title: 'Piala Podium', desc: 'Finish 3 besar sebanyak 10 kali.', check: (s) => s.stats.podiums >= 10 },
  { id: 'piala-bintang', kind: 'trophy', icon: '🌠', title: 'Piala Bintang Sempurna', desc: 'Raih 3 bintang di semua lintasan.', check: (s) => TRACK_ORDER.every((t) => (s.bestStars[t] ?? 0) >= 3) },
];

// Mengembalikan daftar achievement yang baru terbuka; mengubah save (achievements, xp, level)
export function evaluateAchievements(save, ctx = null) {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements.includes(a.id)) continue;
    if (a.check(save, ctx)) { save.achievements.push(a.id); unlocked.push(a); save.xp += a.kind === 'trophy' ? 60 : 30; }
  }
  save.level = Math.floor(save.xp / 200) + 1;
  return unlocked;
}
