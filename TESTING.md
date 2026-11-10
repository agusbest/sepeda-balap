# TESTING – Bike Challenge (Tahap 5)

Pengujian otomatis memakai Playwright + Chrome headless (WebGL software), sehingga angka fps tidak mewakili perangkat asli.
Skrip uji ada di folder `test/` pada paket sumber (jika disertakan) dan dapat dijalankan ulang setelah `npm run build`.

## Kriteria penerimaan MVP (GDD) vs hasil

| Kriteria | Hasil | Cara uji |
|---|---|---|
| Game berjalan di browser | Lulus | `dist/index.html` dibuka langsung (file://), tanpa server |
| Sepeda bisa dikontrol | Lulus | Keyboard (WASD/panah/Spasi/Shift) dan sentuh (emulasi HP) |
| Kamera mengikuti pemain | Lulus | Tangkapan layar tiap lintasan |
| Tabrakan, rintangan, koin | Lulus | Lubang, genangan, jembatan, kambing, pagar, ramp, koin tersentuh |
| AI mengikuti lintasan | Lulus | 4 lawan selesai di semua lintasan, tanpa keluar jalur |
| Start/finish & hasil | Lulus | Hitung mundur, garis finish, layar hasil, bintang, koin, XP |
| Championship & Free Ride | Lulus | Alur UI penuh: 3 ronde, Grand Champion, Free Ride, pengambilan koin |
| Edukasi berfungsi | Lulus | Kuis di 3 checkpoint, balapan membeku saat kuis, hadiah benar/salah/lewati |
| Progres tersimpan | Lulus | LocalStorage (`bikechallenge.save.v1`), bertahan setelah reload |
| Kontrol desktop & mobile | Lulus | Emulasi sentuh: gas, belok, lompat, multi-touch, petunjuk landscape |
| Tanpa bug kritis | Lulus | Lihat uji beban di bawah |

## Uji beban (fuzz/soak)
3 lintasan × 4 strategi input (tahan gas, acak, lompat+boost, rem) = 12 simulasi sampai 330 detik:
tidak ada NaN, posisi di luar batas, pemain tersangkut, maupun error konsol; semua lawan menyelesaikan lomba.
Pergantian lintasan 9 kali: jumlah geometri/tekstur tidak naik terus (tidak ada kebocoran).

## Bug yang ditemukan dan diperbaiki pada Tahap 5
- Tombol gas yang masih ditahan terhapus saat kuis checkpoint muncul, sehingga sepeda diam setelah kuis ditutup. Sekarang tombol yang masih ditahan berlaku lagi.

## Catatan keseimbangan (diketahui)
- Strategi lompat + boost terus-menerus (kecepatan 22 m/dtk) mengalahkan AI di Normal. Rubber band AI diperketat (±40 m, ×0.92 / ×1.07) tetapi pemain yang sangat terampil tetap bisa menang; gunakan Hard untuk tantangan lebih.
- Tombol sentuh yang masih ditahan saat kuis harus disentuh ulang setelah kuis ditutup.

## Belum diuji
- Perangkat HP/GPU sungguhan (hanya emulasi); fps nyata, suara di Safari iOS, dan ukuran layar yang sangat kecil.
- Browser selain Chrome (Firefox/Safari).
