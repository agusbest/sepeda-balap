// RaceManager: status balapan (countdown/racing/finished), checkpoint, posisi
import { CHECKPOINT_FRACTIONS } from './trackData.js';
import { getPlayerName } from '../store.js';

export class RaceManager {
  constructor(track) {
    this.track = track;
    this.checkpoints = CHECKPOINT_FRACTIONS.map((f) => track.startS + f * (track.finishS - track.startS));
    this.reset();
  }

  reset() {
    this.state = 'idle'; // idle | countdown | racing | finished
    this.time = 0;
    this.elapsed = 0; // jam balapan yang tetap berjalan setelah pemain finish (untuk waktu lawan)
    this.countdown = 0;
    this.lastCount = 99;
    this.goUntil = 0;
    this.cpPassed = 0;
    this.tricks = 0;
    this.hits = 0;
    this.cpTimes = [];
    this.edu = { asked: 0, correct: 0, skipped: 0, coins: 0 };
    this.resultShown = false;
    this.finishTime = 0;
    this.position = 0;
    this.finishedAtWall = 0;
  }

  begin() {
    this.reset();
    this.state = 'countdown';
    this.countdown = 3.6;
  }

  // Urutan: yang sudah finish (menurut waktu), lalu yang belum menurut jarak tempuh
  ranking(player, rivals) {
    const entries = [
      { id: 'player', name: getPlayerName(), s: player.s, finished: this.state === 'finished', time: this.finishTime },
      ...rivals.map((r) => ({ id: r.def.id, name: r.def.name, s: r.s, finished: r.finished, time: r.finishTime, color: r.def.color })),
    ];
    entries.sort((a, b) => {
      if (a.finished && b.finished) return a.time - b.time;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.s - a.s;
    });
    return entries;
  }

  // Urutan akhir: lawan yang belum finish diperkirakan dari sisa jarak (waktu ~)
  finalOrder(player, rivals) {
    const est = (r) => (r.finished ? r.finishTime : this.elapsed + (this.track.finishS - r.s) / Math.max(r.speed, 9));
    const entries = [
      { id: 'player', name: getPlayerName(), time: this.finishTime, estimated: false },
      ...rivals.map((r) => ({ id: r.def.id, name: r.def.name, time: est(r), estimated: !r.finished })),
    ];
    return entries.sort((a, b) => a.time - b.time);
  }
}
