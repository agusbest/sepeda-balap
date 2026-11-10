// EducationManager: tantangan edukasi terintegrasi (muncul di checkpoint, bukan saat bermanuver cepat)
// Kategori sesuai GDD: Matematika, Logika, Keselamatan, Lingkungan, Strategi.

export const CATEGORIES = {
  matematika: { label: 'Matematika', icon: '🧮' },
  logika: { label: 'Logika', icon: '🧩' },
  keselamatan: { label: 'Keselamatan', icon: '🚦' },
  lingkungan: { label: 'Lingkungan', icon: '🌱' },
  strategi: { label: 'Strategi', icon: '⚡' },
};

export const EDU_REWARD = { boost: 25, coins: 5, xp: 15, perfectCoins: 10 };

const S = (text, right, wrong, explain) => () => ({ text, options: [right, ...wrong], explain });

// Setiap soal: id, cat, ok(ctx) opsional, build(ctx) -> { text, options: [benar, salah...], explain }
export const BANK = [
  // ---------- Matematika: menghitung koin & waktu tempuh ----------
  { id: 'm-koin', cat: 'matematika', build: (c) => ({
    text: `Kamu sudah mengumpulkan ${c.coins} koin. Di depan ada 2 baris koin, tiap baris 5 koin. Jika semuanya diambil, berapa total koinmu?`,
    options: [`${c.coins + 10}`, `${c.coins + 5}`, `${c.coins + 7}`], explain: `2 baris × 5 koin = 10 koin. ${c.coins} + 10 = ${c.coins + 10}.` }) },
  { id: 'm-waktu', cat: 'matematika', ok: (c) => c.cpTimes.length >= 2, build: (c) => {
    const a = Math.round(c.cpTimes[0]), b = Math.max(a + 1, Math.round(c.cpTimes[1])), d = b - a;
    return { text: `Kamu mencapai checkpoint 1 di detik ke-${a} dan checkpoint 2 di detik ke-${b}. Berapa detik waktu tempuh di antara keduanya?`,
      options: [`${d} detik`, `${d + 4} detik`, `${a + b} detik`], explain: `Waktu tempuh = ${b} − ${a} = ${d} detik.` };
  } },
  { id: 'm-sisa', cat: 'matematika', build: (c) => {
    const L = Math.round(c.length / 10) * 10, S0 = Math.round(c.progress / 10) * 10, rest = Math.max(50, L - S0);
    return { text: `Lintasan sepanjang ${L} meter. Kamu sudah menempuh ${S0} meter. Berapa meter sisa jarak menuju finish?`,
      options: [`${rest} meter`, `${rest + 100} meter`, `${Math.abs(rest - 100) || rest + 200} meter`], explain: `${L} − ${S0} = ${rest} meter.` };
  } },
  { id: 'm-laju', cat: 'matematika', build: S('Setiap 10 detik kamu mengumpulkan 3 koin. Berapa koin yang kamu dapat dalam 30 detik?', '9 koin', ['6 koin', '13 koin'], '30 detik = 3 × 10 detik, jadi 3 × 3 = 9 koin.') },
  { id: 'm-boost', cat: 'matematika', build: S('Setiap koin menambah 5% bar boost. Jika kamu mengambil 6 koin, berapa persen boost yang bertambah?', '30%', ['11%', '35%'], '6 × 5% = 30%.') },

  // ---------- Logika: memilih rute & pola ----------
  { id: 'l-pola', cat: 'logika', build: S('Koin tersusun membentuk pola: 2, 4, 8, 16, … Angka berikutnya adalah?', '32', ['24', '20'], 'Tiap angka dikali 2: 16 × 2 = 32.') },
  { id: 'l-ramp', cat: 'logika', build: S('Ramp muncul setiap 100 meter. Ramp pertama ada di meter 200. Di meter berapa ramp ketiga?', 'Meter 400', ['Meter 300', 'Meter 500'], 'Ramp 1: 200, ramp 2: 300, ramp 3: 400.') },
  { id: 'l-rute', cat: 'logika', build: S('Jalur A lurus tapi penuh lubang dan genangan. Jalur B sedikit lebih panjang tapi mulus. Agar tidak melambat dan aman, kamu pilih…', 'Jalur B', ['Jalur A', 'Sama saja'], 'Jalur mulus menjaga kecepatan, jadi sering lebih cepat meski lebih panjang sedikit.') },
  { id: 'l-urut', cat: 'logika', build: S('Bimo lebih cepat dari Raka. Raka lebih cepat dari Jodi. Siapa yang paling lambat di antara ketiganya?', 'Jodi', ['Bimo', 'Raka'], 'Urutan cepat → lambat: Bimo, Raka, Jodi.') },

  // ---------- Keselamatan: rambu & perlengkapan ----------
  { id: 'k-stop', cat: 'keselamatan', build: S('🛑 Rambu ini berarti…', 'Berhenti sepenuhnya, lalu lihat kanan-kiri', ['Boleh jalan terus', 'Tempat parkir sepeda'], 'Rambu STOP artinya berhenti dulu dan pastikan aman sebelum jalan.') },
  { id: 'k-sekolah', cat: 'keselamatan', build: S('🚸 Rambu ini dipasang dekat sekolah. Apa yang harus kamu lakukan?', 'Pelan dan waspada anak menyeberang', ['Ngebut agar cepat lewat', 'Membunyikan bel keras-keras'], 'Dekat sekolah banyak anak menyeberang, jadi kurangi kecepatan.') },
  { id: 'k-helm', cat: 'keselamatan', build: S('Mengapa pembalap sepeda wajib memakai helm?', 'Melindungi kepala saat terjatuh', ['Supaya terlihat keren saja', 'Supaya sepeda lebih cepat'], 'Helm menyerap benturan sehingga kepala lebih aman.') },
  { id: 'k-lajur', cat: 'keselamatan', build: S('Di jalan raya Indonesia, pesepeda sebaiknya berjalan di sisi…', 'Kiri jalan', ['Kanan jalan', 'Tengah jalan'], 'Indonesia memakai lajur kiri, jadi pesepeda berada di sisi kiri.') },
  { id: 'k-tikungan', cat: 'keselamatan', build: S('⚠️ Rambu segitiga kuning bertuliskan "Tikungan Tajam" artinya…', 'Kurangi kecepatan sebelum masuk tikungan', ['Tambah kecepatan', 'Berhenti di tengah jalan'], 'Tikungan tajam butuh kecepatan rendah agar tidak keluar jalur.') },

  // ---------- Lingkungan: jalur ramah lingkungan ----------
  { id: 'e-kendaraan', cat: 'lingkungan', build: S('Kendaraan manakah yang paling ramah lingkungan?', 'Sepeda', ['Motor', 'Mobil'], 'Sepeda tidak mengeluarkan asap dan menyehatkan badan.') },
  { id: 'e-botol', cat: 'lingkungan', build: S('Kamu menemukan botol plastik di pinggir jalur sawah. Sebaiknya…', 'Dibuang ke tempat sampah', ['Dilempar ke sawah', 'Dibiarkan saja'], 'Sampah plastik sulit terurai dan bisa merusak tanah petani.') },
  { id: 'e-pohon', cat: 'lingkungan', build: S('Pohon kelapa dan pohon lainnya membantu lingkungan karena…', 'Menghasilkan oksigen dan menyerap CO₂', ['Membuat jalan licin', 'Menambah asap'], 'Pohon menyerap karbon dioksida dan melepas oksigen.') },
  { id: 'e-jalur', cat: 'lingkungan', build: S('Mana jalur yang ramah lingkungan saat balapan di kampung?', 'Tetap di jalan, tidak menginjak padi petani', ['Memotong lewat tengah sawah', 'Membuang bungkus makanan di parit'], 'Menjaga tanaman dan kebersihan membantu petani dan alam.') },

  // ---------- Strategi: mengatur boost ----------
  { id: 's-kapan', cat: 'strategi', build: S('Bar boost-mu terisi 40%. Kapan waktu terbaik memakainya?', 'Di jalur lurus tanpa rintangan', ['Di tikungan tajam', 'Di jembatan sempit'], 'Boost paling aman dan efektif di jalur lurus.') },
  { id: 's-tikungan', cat: 'strategi', build: S('Mengapa boost sebaiknya tidak dipakai saat tikungan tajam?', 'Sepeda sulit dikendalikan dan bisa keluar jalur', ['Boost tidak berfungsi', 'Koin jadi hilang'], 'Kecepatan tinggi di tikungan membuat sepeda terdorong keluar.') },
  { id: 's-isi', cat: 'strategi', build: S('Kamu ingin boost penuh sebelum jalur lurus panjang. Cara mengisinya?', 'Ambil koin dan mendarat mulus setelah melompat', ['Menabrak pagar', 'Berhenti di tempat'], 'Koin dan pendaratan mulus menambah bar boost.') },
];

const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export class EducationManager {
  constructor() { this.reset(); }
  reset() { this.cats = []; this.asked = 0; this.correct = 0; this.skipped = 0; this.coins = 0; this.answered = []; }

  // Pilih soal berikutnya: prioritaskan kategori yang belum muncul di balapan ini & soal yang belum pernah dilihat
  next(ctx, seen = []) {
    const pool = BANK.filter((q) => !q.ok || q.ok(ctx));
    let fresh = pool.filter((q) => !seen.includes(q.id));
    if (!fresh.length) fresh = pool; // semua sudah pernah → ulang
    let cand = fresh.filter((q) => !this.cats.includes(q.cat));
    if (!cand.length) cand = fresh;
    const def = cand[Math.floor(Math.random() * cand.length)];
    const built = def.build(ctx);
    const tagged = built.options.map((o, i) => ({ o, right: i === 0 }));
    const opts = shuffle(tagged);
    this.cats.push(def.cat);
    return {
      id: def.id, cat: def.cat, ...CATEGORIES[def.cat],
      text: built.text, options: opts.map((x) => x.o), correct: opts.findIndex((x) => x.right), explain: built.explain,
    };
  }

  record(q, chosen) {
    const ok = chosen === q.correct;
    this.asked++;
    if (ok) { this.correct++; this.coins += EDU_REWARD.coins; }
    this.answered.push({ id: q.id, cat: q.cat, ok });
    return ok;
  }
}
