// Data sepeda, upgrade, dan perhitungan statistik (Speed, Acceleration, Handling, Jump)
export const BIKE_DEFS = {
  starter: {
    id: 'starter', name: 'Starter BMX', price: 0, desc: 'Sepeda pertama yang seimbang.',
    base: { speed: 16, accel: 6.8, handling: 1.0, jump: 8.4 }, grass: 0.55,
    look: { frame: 0xff8a1f, helmet: 0x1e6bff, jersey: 0x1e6bff, tire: 0.05 },
  },
  dirt: {
    id: 'dirt', name: 'Dirt BMX', price: 150, desc: 'Ban besar, kuat di tanah dan lompatan tinggi.',
    base: { speed: 16.6, accel: 7.4, handling: 1.12, jump: 9.4 }, grass: 0.78,
    look: { frame: 0x2e9e4f, helmet: 0x1e6bff, jersey: 0xffd21f, tire: 0.08 },
  },
  mountain: {
    id: 'mountain', name: 'Mountain Bike', price: 320, desc: 'Cepat dan mantap, tetap melaju di rumput.',
    base: { speed: 17.4, accel: 7.9, handling: 1.08, jump: 8.8 }, grass: 0.9,
    look: { frame: 0x8e3fd1, helmet: 0xff8a1f, jersey: 0xff8a1f, tire: 0.065 },
  },
  ontel: {
    id: 'ontel', name: 'Sepeda Ontel', price: 100, desc: 'Klasik berkeranjang. Lambat, tapi stabil dan mudah dikendalikan.',
    base: { speed: 14.8, accel: 6.2, handling: 1.28, jump: 6.9 }, grass: 0.62,
    look: { frame: 0x2b2b30, helmet: 0xd9a21b, jersey: 0xd9a21b, tire: 0.05, bars: 'upright', basket: true, rack: true },
  },
  lipat: {
    id: 'lipat', name: 'Sepeda Lipat', price: 220, desc: 'Roda kecil, akselerasi cepat dan lincah di tikungan.',
    base: { speed: 15.6, accel: 8.6, handling: 1.24, jump: 7.8 }, grass: 0.5,
    look: { frame: 0x17b3a6, helmet: 0xffffff, jersey: 0x17b3a6, tire: 0.045, ws: 0.82, bars: 'upright', stemH: 0.3, hinge: true },
  },
  road: {
    id: 'road', name: 'Road Bike', price: 480, desc: 'Ban tipis dan setang balap. Paling kencang di jalan aspal, lemah di rumput.',
    base: { speed: 18.0, accel: 7.2, handling: 0.96, jump: 7.4 }, grass: 0.4,
    look: { frame: 0xe53935, helmet: 0xffffff, jersey: 0xe53935, tire: 0.03, bars: 'drop' },
  },
  polygon: {
    id: 'polygon', name: 'Polygon', price: 650, desc: 'Sepeda gunung andalan: suspensi depan, kuat di semua medan.',
    base: { speed: 17.8, accel: 8.4, handling: 1.16, jump: 9.0 }, grass: 0.88,
    look: { frame: 0x30343b, helmet: 0xff7a1a, jersey: 0xff7a1a, tire: 0.075, bars: 'flat', fork: true, plate: false },
  },
};
export const BIKE_ORDER = ['starter', 'ontel', 'dirt', 'lipat', 'mountain', 'road', 'polygon'];

export const UPGRADES = {
  speed: { label: 'Speed', icon: '🚀', per: 0.035 },
  accel: { label: 'Acceleration', icon: '⚡', per: 0.06 },
  handling: { label: 'Handling', icon: '🎯', per: 0.06 },
  jump: { label: 'Jump', icon: '🦘', per: 0.05 },
};
export const UPGRADE_KEYS = Object.keys(UPGRADES);
export const MAX_UPGRADE = 3;
export const upgradeCost = (level) => [40, 80, 140][level] ?? 0;

export function computeStats(id, upgrades) {
  const d = BIKE_DEFS[id] ?? BIKE_DEFS.starter;
  const u = upgrades?.[d.id] ?? {};
  const m = (k) => 1 + (u[k] || 0) * UPGRADES[k].per;
  return {
    id: d.id, name: d.name,
    maxSpeed: d.base.speed * m('speed'), accel: d.base.accel * m('accel'),
    handling: d.base.handling * m('handling'), jump: d.base.jump * m('jump'), grass: d.grass,
  };
}

// Persentase untuk bar tampilan (0–100)
export function ratings(stats) {
  const c = (v) => Math.max(0, Math.min(100, v));
  return {
    speed: c(((stats.maxSpeed - 14) / 6) * 100),
    accel: c(((stats.accel - 5.5) / 4.5) * 100),
    handling: c(((stats.handling - 0.8) / 0.6) * 100),
    jump: c(((stats.jump - 7) / 4) * 100),
  };
}
