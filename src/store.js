import { create } from 'zustand';
import { SaveManager } from './game/SaveManager.js';

export const bridge = { engine: null };

// Nama pemain dari save; 'Kamu' bila belum diisi
export const getPlayerName = () => useGame.getState().save.playerName || 'Kamu';

export const emptyHud = {
  state: 'idle', countdown: '', pos: 1, total: 5, time: 0, progress: 0, racers: [],
  coins: 0, coinsTotal: 0, mission: 0, boost: 0, boosting: false, speed: 0, grade: 0, paused: false,
  toast: null, standings: [],
};

export const useGame = create((set, get) => ({
  screen: 'menu', // menu | race | result
  hud: emptyHud,
  result: null,
  quiz: null,
  save: SaveManager.load(),
  setScreen: (screen) => set({ screen }),
  setHud: (hud) => set({ hud }),
  setResult: (result) => set({ result }),
  setQuiz: (quiz) => set({ quiz }),
  updateSave: (fn) => {
    const next = fn(structuredClone(get().save));
    SaveManager.save(next);
    set({ save: next });
  },
}));
