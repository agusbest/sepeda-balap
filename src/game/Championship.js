// Championship: 3 ronde (satu per lintasan), poin kejuaraan, Grand Champion
import { RIVALS } from "./constants.js";
import { TRACK_ORDER } from "./tracks.js";
import { getPlayerName } from "../store.js";

export const CHAMP_TRACKS = TRACK_ORDER;
export const POINTS = [10, 7, 5, 3, 1];
export const racers = () => [
  { id: "player", name: getPlayerName() },
  ...RIVALS.map((r) => ({ id: r.id, name: r.name, color: r.color })),
];

export function newChampionship() {
  const points = {};
  const positions = {};
  racers().forEach((r) => {
    points[r.id] = 0;
    positions[r.id] = [];
  });
  return {
    round: 0,
    points,
    positions,
    history: [],
    done: false,
    champion: null,
  };
}

// Save lama bisa tidak punya entri untuk pembalap yang id-nya diganti/ditambah; lengkapi agar tidak crash.
export function ensureRacers(champ) {
  champ.points = champ.points || {};
  champ.positions = champ.positions || {};
  racers().forEach((r) => {
    champ.points[r.id] ??= 0;
    champ.positions[r.id] ??= [];
  });
  return champ;
}

// order: array id pembalap dari juara 1 sampai 5
export function applyRound(champ, trackId, order) {
  ensureRacers(champ);
  champ.history = champ.history || [];
  order.forEach((id, i) => {
    champ.points[id] = (champ.points[id] ?? 0) + (POINTS[i] ?? 0);
    (champ.positions[id] ??= []).push(i + 1);
  });
  champ.history.push({ track: trackId, order });
  champ.round += 1;
  if (champ.round >= CHAMP_TRACKS.length) {
    champ.done = true;
    champ.champion = standings(champ)[0].id;
  }
  return champ;
}

// Urutan klasemen: poin terbanyak, lalu jumlah juara 1, lalu posisi terakhir
export function standings(champ) {
  ensureRacers(champ);
  return racers()
    .map((r) => ({
      ...r,
      points: champ.points[r.id],
      wins: champ.positions[r.id].filter((p) => p === 1).length,
      last: champ.positions[r.id].at(-1) ?? 9,
    }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.last - b.last);
}

export const GRAND_CHAMPION_REWARD = { 1: 150, 2: 100, 3: 60 };
