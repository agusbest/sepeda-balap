# Bike Challenge – Juara Jalanan Indonesia
Prototype Tahap 1–2 (GDD v1.0): lintasan 3D "Kampung Race 1" yang bisa dimainkan penuh.
Tahap 4: 21 tantangan edukasi (Matematika, Logika, Keselamatan, Lingkungan, Strategi) di 3 checkpoint/ronde; waktu dijeda saat menjawab, bisa dilewati atau dimatikan di Pengaturan. Reward: koin, XP, boost, 21 achievement + 4 piala.
Tahap 3: 3 lintasan (Kampung Race 1, Kampung Race 2 'Sawah Senja', Dirt Track 1), mode Championship (3 ronde, poin, Grand Champion) & Free Ride (koin tersembunyi), Track Selection, Achievement, Pengaturan.
Tahap 2: 6 jenis rintangan (lubang, ramp, genangan, jembatan sempit, tikungan tajam, kambing menyeberang), 3 sepeda + upgrade + Garage, stunt 360°, pilihan kesulitan AI.

## Menjalankan
    npm install
    npm run dev      # pengembangan
    npm run build    # hasil: dist/index.html (satu file, bisa dibuka langsung)

## Kontrol
Di udara tahan A/D untuk berputar: putaran penuh 360° = stunt + boost.
W/↑ gas · S/↓ rem · A D/←→ belok · Space lompat · Shift boost · Esc pause (tombol sentuh otomatis muncul di HP)

## Struktur modul (src/game)
GameEngine · EducationManager · tracks · Championship · AchievementManager · BikeStats · MovingObstacles · BikePhysics · CameraController · TrackManager · Scenery · CollisionManager · CoinManager ·
BoostManager · AIController · RaceManager · RewardManager · AudioManager · SaveManager · BikeModel · trackData

## Tahap berikutnya
4. Edukasi (EducationManager) di checkpoint, reward & achievement
5. Polish & testing


## Tahap 5 – Polish & Testing
- Pengaturan kualitas grafis (Otomatis / Tinggi / Rendah). Mode Otomatis menurunkan kualitas bila fps rata-rata < 38.
- Partikel (koin, debu pendaratan, cipratan air, jejak boost), suara angin sesuai kecepatan.
- Layar penuh (tombol F atau Pengaturan), petunjuk landscape di HP, petunjuk kontrol saat hitung mundur.
- Game otomatis pause saat jendela kehilangan fokus; satu frame yang error tidak mematikan game.
- Rubber band AI lebih ketat. Perbaikan: tombol gas yang ditahan tetap berlaku setelah kuis.
- Laporan pengujian: lihat `TESTING.md`.
