// Aturan konten lintasan: rintangan, koin, generator otomatis untuk lintasan baru
import { GRAVITY } from './constants.js';

export const CHECKPOINT_FRACTIONS = [0.25, 0.5, 0.75];

export const RAMP = { w: 3.6, len: 5, h: 1.2 };
export const POTHOLE_R = 1.05;
export const PUDDLE_RX = 2.3; // sepanjang lintasan
export const PUDDLE_RZ = 1.7; // melintang

export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Rumus lompatan dari ujung ramp (dipakai fisika & penempatan koin)
export const launchVy = (slope, speed) => slope * speed * 1.15 + 4.5 * Math.min(1, speed / 10);

export function buildObstacles(list, finishS) {
  return list.filter((o) => o.s < finishS - 25).map((o) => ({ ...o, hit: false }));
}

const inBridge = (bridges, s, pad = 0) => bridges.some((b) => s >= b.s0 - pad && s <= b.s1 + pad);

// Koin: garis & gelombang di jalan + busur koin di atas ramp (harus melompat untuk mengambilnya)
export function buildCoins(obstacles, finishS, bridges = []) {
  const coins = [];
  const line = (s, n, gap, x) => { for (let i = 0; i < n; i++) coins.push({ s: s + i * gap, x, h: 0 }); };
  const wave = (s, n, gap, amp) => { for (let i = 0; i < n; i++) coins.push({ s: s + i * gap, x: Math.sin(i * 0.95) * amp, h: 0 }); };
  const patterns = [
    (s) => line(s, 5, 3, 0),
    (s) => wave(s, 7, 3, 2.3),
    (s) => line(s, 5, 3, -2.3),
    (s) => line(s, 5, 3, 2.3),
    (s) => wave(s, 6, 3, 1.8),
  ];
  let k = 0;
  for (let s = 55; s < finishS - 60; s += 85) patterns[k++ % patterns.length](s);

  const clear = (c) => !obstacles.some((o) => {
    if (o.t === 'ramp') return c.s > o.s - 2 && c.s < o.s + 8 && Math.abs(c.x - o.x) < 3;
    return Math.abs(c.s - o.s) < 3 && Math.abs(c.x - o.x) < 2.2;
  });
  const out = coins.filter((c) => clear(c) && !(inBridge(bridges, c.s, 3) && Math.abs(c.x) > 1.3));
  for (const b of bridges) for (let i = 0; i < 5; i++) out.push({ s: b.s0 + 6 + i * 6, x: 0, h: 0 });

  for (const o of obstacles.filter((q) => q.t === 'ramp')) {
    const slope = RAMP.h / RAMP.len;
    const vy = launchVy(slope, 15);
    for (const t of [0.12, 0.27, 0.42, 0.57, 0.7]) {
      const h = RAMP.h + vy * t - 0.5 * GRAVITY * t * t;
      out.push({ s: o.s + RAMP.len + 15 * t, x: o.x, h: Math.max(0.2, h) });
    }
  }
  return out.sort((a, b) => a.s - b.s);
}

// Koin tersembunyi (Free Ride): di pinggir jalan / rumput, perlu dicari
export function buildHiddenCoins(track, bridges, seed) {
  const rnd = mulberry32(seed + 99);
  const out = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const s = track.startS + 25 + ((track.finishS - track.startS - 50) * (i + rnd() * 0.6)) / n;
    if (inBridge(bridges, s, 6)) continue;
    const side = i % 2 ? 1 : -1;
    out.push({ s, x: side * (4.9 + rnd() * 0.9), h: 0, hidden: true });
    if (i % 4 === 0) out.push({ s: s + 3, x: side * (5.1 + rnd() * 0.5), h: 0, hidden: true });
  }
  return out;
}

// Generator konten otomatis: rintangan di bagian lurus, jembatan di bagian paling lurus, kambing di sela-sela
export function generateContent(track, gen) {
  const rnd = mulberry32(gen.seed);
  const L = track.finishS;
  const kap = (s) => Math.abs(track.sample(s).kappa);
  const maxKap = (a, b) => { let m = 0; for (let s = a; s <= b; s += 3) m = Math.max(m, kap(s)); return m; };
  const nearSharp = (s, pad) => track.sharpTurns.some((z) => s > z.s0 - pad && s < z.s1 + pad);

  const bridges = [];
  for (const f of gen.bridges ?? []) {
    const target = f * L;
    let best = null;
    for (let d = 0; d <= 140; d += 4) {
      for (const sg of [1, -1]) {
        const s0 = target + sg * d;
        if (s0 < 160 || s0 + 40 > L - 80) continue;
        if (bridges.some((b) => Math.abs(b.s0 - s0) < 100)) continue;
        if (maxKap(s0 - 25, s0 + 46) < 0.009) { best = s0; break; }
      }
      if (best) break;
    }
    if (best) bridges.push({ s0: Math.round(best), s1: Math.round(best) + 36, half: 1.9 });
  }

  const obstacles = [];
  const weights = gen.weights ?? { pothole: 3, puddle: 2, ramp: 2 };
  const bag = Object.entries(weights).flatMap(([t, w]) => Array(w).fill(t));
  let s = gen.start ?? 100;
  while (s < L - 50) {
    s += gen.gapMin + rnd() * (gen.gapMax - gen.gapMin);
    if (inBridge(bridges, s, 30) || nearSharp(s, 14) || kap(s) > 0.012) continue;
    const t = bag[(rnd() * bag.length) | 0];
    if (t === 'ramp') {
      if (maxKap(s - 8, s + 24) > 0.008 || nearSharp(s, 30)) continue;
      obstacles.push({ t, s: Math.round(s), x: +((rnd() - 0.5) * 3).toFixed(1) });
      s += 14;
    } else if (t === 'puddle') {
      obstacles.push({ t, s: Math.round(s), x: +((rnd() - 0.5) * 3.6).toFixed(1) });
    } else {
      const x = +((rnd() - 0.5) * 4.4).toFixed(1);
      obstacles.push({ t, s: Math.round(s), x });
      if (rnd() < 0.45) obstacles.push({ t, s: Math.round(s) + 3, x: +(-x * 0.8).toFixed(1) });
    }
  }

  const goats = [];
  const count = gen.goats ?? 6;
  for (let i = 0; i < count; i++) {
    const target = ((i + 0.5) / count) * L;
    for (let d = 0; d <= 60; d += 5) {
      const cand = [target + d, target - d].find((c) => c > 130 && c < L - 70
        && !inBridge(bridges, c, 16) && !nearSharp(c, 16) && kap(c) < 0.012
        && !obstacles.some((o) => Math.abs(o.s - c) < (o.t === 'ramp' ? 30 : 14))
        && !goats.some((g) => Math.abs(g.s - c) < 60));
      if (cand) { goats.push({ s: Math.round(cand), amp: 3 + rnd() * 0.3, w: 0.85 + rnd() * 0.25, phase: rnd() * 6 }); break; }
    }
  }
  return { obstacles, bridges, goats };
}

export const TRACK1_CONTENT = {
  obstacles: [
  { t: 'pothole', s: 110, x: -1.8 },
  { t: 'pothole', s: 114, x: 1.6 },
  { t: 'puddle', s: 160, x: 0.5 },
  { t: 'ramp', s: 215, x: 0 },
  { t: 'pothole', s: 280, x: 0 },
  { t: 'puddle', s: 315, x: -1.5 },
  { t: 'pothole', s: 345, x: 2 },
  { t: 'pothole', s: 348, x: -0.6 },
  { t: 'ramp', s: 400, x: -1.2 },
  { t: 'puddle', s: 450, x: 1.2 },
  { t: 'pothole', s: 480, x: -2 },
  { t: 'ramp', s: 530, x: 1.2 },
  { t: 'pothole', s: 615, x: 1.5 },
  { t: 'pothole', s: 618, x: -1.8 },
  { t: 'ramp', s: 670, x: 0 },
  { t: 'pothole', s: 730, x: -1 },
  { t: 'puddle', s: 760, x: -0.8 },
  { t: 'ramp', s: 840, x: 0 },
  { t: 'ramp', s: 1010, x: -1 },
  { t: 'puddle', s: 1050, x: 0 },
  { t: 'pothole', s: 1085, x: 1 },
  { t: 'ramp', s: 1185, x: 0 },
  { t: 'pothole', s: 1215, x: -1.5 },
  { t: 'puddle', s: 1255, x: -0.5 },
  { t: 'pothole', s: 1275, x: 1 },
  ],
  bridges: [
  { s0: 558, s1: 596, half: 1.9 },
  { s0: 778, s1: 814, half: 1.9 },
  ],
  goats: [
  { s: 150, amp: 3.0, w: 0.9, phase: 0 },
  { s: 250, amp: 3.2, w: 1.0, phase: 2 },
  { s: 370, amp: 3.0, w: 0.85, phase: 4 },
  { s: 500, amp: 3.2, w: 1.0, phase: 1 },
  { s: 640, amp: 3.0, w: 0.9, phase: 3 },
  { s: 745, amp: 3.2, w: 1.05, phase: 5 },
  { s: 1120, amp: 3.0, w: 0.9, phase: 2.5 },
  { s: 1230, amp: 3.2, w: 1.0, phase: 0.5 },
  ],
};
export const TRACK1_POINTS = [
  [0, 20], [0, 0], [0, -110], [-28, -210], [-75, -300], [-70, -400], [-20, -480],
  [45, -550], [58, -650], [20, -745], [-10, -800], [-75, -820], [-120, -880],
  [-115, -980], [-60, -1050], [-40, -1160],
];
