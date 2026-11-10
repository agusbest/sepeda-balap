// Penyimpanan progres lokal (LocalStorage)
const KEY = 'bikechallenge.save.v1';

const DEFAULT = {
  coins: 0,
  xp: 0,
  level: 1,
  bikes: ['starter'],
  selectedBike: 'starter',
  upgrades: {},
  unlockedTracks: ['kampung-1'],
  achievements: [],
  bestTimes: {},
  bestStars: {},
  stats: { races: 0, wins: 0, podiums: 0, coins: 0, tricks: 0, freeCoins: 0, champs: 0, eduCorrect: 0, eduTotal: 0, eduCat: {} },
  playerName: '',
  championship: null,
  settings: { muted: false, difficulty: 'normal', edu: true },
  eduSeen: [],
};

export const SaveManager = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT);
      const data = JSON.parse(raw);
      return { ...structuredClone(DEFAULT), ...data, settings: { ...DEFAULT.settings, ...(data.settings || {}) }, stats: { ...DEFAULT.stats, ...(data.stats || {}) } };
    } catch {
      return structuredClone(DEFAULT);
    }
  },
  save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage penuh / diblokir */ }
  },
  levelFromXp: (xp) => Math.floor(xp / 200) + 1,
};
