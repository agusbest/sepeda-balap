# Update: layar penuh + perbaikan menu portrait

Hanya 6 perubahan kecil. Nama game dan nama lain yang sudah kamu ubah TIDAK tertimpa.

## 1. `public/` (folder baru di root proyek, sejajar dengan `src/`)
Salin 3 file: `manifest.webmanifest`, `icon-192.png`, `icon-512.png`.
Nama aplikasi ada di `manifest.webmanifest` (`name`, `short_name`): ganti sesuai nama game-mu.
Ikon boleh diganti gambarmu sendiri (ukuran dan nama file sama).

## 2. `index.html`: tambahkan 6 baris ini tepat SEBELUM tag `<title>`
```html
    <meta name="theme-color" content="#0a1634" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="manifest.webmanifest" />
    <link rel="apple-touch-icon" href="icon-192.png" />
```

## 3. `src/styles.css`: tempel isi `styles-tambahan.css` di baris paling akhir

## 4. `src/game/GameEngine.js`: ganti method `toggleFullscreen()` (cari kata itu) dengan:
```js
  // Layar penuh (menyembunyikan address bar). Harus dipanggil dari sentuhan/klik pemain.
  // Di Android Chrome juga mengunci layar ke landscape. iPhone Safari tidak mendukung API ini (pakai "Tambah ke Layar Utama").
  enterFullscreen() {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement || !el.requestFullscreen) return;
      const r = el.requestFullscreen({ navigationUI: 'hide' });
      Promise.resolve(r).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
    } catch (e) { /* diabaikan */ }
  }

  toggleFullscreen() {
    try {
      if (!document.fullscreenElement) this.enterFullscreen();
      else { document.exitFullscreen?.(); screen.orientation?.unlock?.(); }
    } catch (e) { /* diabaikan */ }
  }
```

## 5. `src/ui/Menu.jsx`
a) Di bawah baris `const champ = save.championship;` tambahkan:
```jsx
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
  // di HP: masuk layar penuh otomatis saat pemain menekan tombol main (butuh sentuhan pemain)
  const goFull = () => { if (isTouch && !standalone) bridge.engine?.enterFullscreen(); };
```
b) Tombol Championship: `onClick={() => setScreen('championship')}` menjadi
`onClick={() => { goFull(); setScreen('championship'); }}`

c) Tombol Free Ride: `onClick={() => setScreen('tracks')}` menjadi
`onClick={() => { goFull(); setScreen('tracks'); }}`

d) Tepat setelah `<div className="menu">` tambahkan baris:
```jsx
      {!standalone && <button className="fs-btn" aria-label="Layar penuh" onClick={() => bridge.engine?.toggleFullscreen()}>⛶</button>}
```

## 6. Build dan upload
Jalankan `npm run build`, lalu upload ISI folder `dist` ke Netlify (tab Deploys, kotak drop).
Sekarang ada 4 file: `index.html`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`.
Seret folder `dist`-nya, bukan hanya `index.html`.

## Cara pakai di HP
- Android Chrome: tekan tombol Championship atau Free Ride, otomatis layar penuh dan landscape. Tombol ⛶ di pojok kanan atas menu juga bisa dipakai.
- iPhone (Safari tidak bisa layar penuh dari web): menu Bagikan, lalu "Tambah ke Layar Utama", dan buka dari ikon itu. Tanpa address bar.
- Android juga bisa: menu ⋮, lalu "Tambahkan ke layar utama" atau "Instal aplikasi".
