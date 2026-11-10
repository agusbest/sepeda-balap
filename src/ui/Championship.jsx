import React, { useEffect } from 'react';
import { useGame, bridge } from '../store.js';
import Screen from './Screen.jsx';
import { TRACKS } from '../game/tracks.js';
import { CHAMP_TRACKS, POINTS, standings, newChampionship } from '../game/Championship.js';

export default function Championship() {
  const save = useGame((s) => s.save);
  const update = useGame((s) => s.updateSave);
  const champ = save.championship ?? newChampionship();
  const rows = standings(champ);
  const round = Math.min(champ.round, CHAMP_TRACKS.length - 1);

  useEffect(() => { bridge.engine?.loadTrack(CHAMP_TRACKS[round]); }, [round]);

  const reset = () => update((s) => { s.championship = newChampionship(); return s; });
  const playerRank = rows.findIndex((r) => r.id === 'player') + 1;

  return (
    <Screen title="🏆 CHAMPIONSHIP · Juara Jalanan">
      <div className="champ">
        <div className="panel-card">
          <h3>Ronde</h3>
          {CHAMP_TRACKS.map((id, i) => {
            const t = TRACKS[id]; const done = i < champ.round; const cur = i === champ.round && !champ.done;
            const pos = champ.positions.player[i];
            return (
              <div key={id} className={`round ${cur ? 'cur' : ''} ${done ? 'done' : ''}`}>
                <span className="rn">{i + 1}</span>
                <div><b>{t.emoji} {t.name}</b><small>{t.sub}</small></div>
                <em>{done ? `Posisi ${pos}` : cur ? '▶ berikutnya' : '🔒'}</em>
              </div>
            );
          })}
          <p className="hint">Poin tiap ronde: {POINTS.join(' · ')}. Juara umum = poin terbanyak setelah 3 ronde.</p>
        </div>

        <div className="panel-card">
          <h3>Klasemen</h3>
          <ol className="standings">
            {rows.map((r, i) => (
              <li key={r.id} className={r.id === 'player' ? 'me' : ''}><span>{i + 1}</span> {r.name} <em>{r.points} poin</em></li>
            ))}
          </ol>
          {champ.done ? (
            <div className="champ-end">
              <div className="trophy">{playerRank === 1 ? '👑 GRAND CHAMPION!' : `Kejuaraan selesai · peringkat ${playerRank}`}</div>
              <button className="btn btn-primary" onClick={reset}>Kejuaraan Baru</button>
            </div>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => bridge.engine?.startChampionshipRound()}>
                ▶ {champ.round === 0 ? 'MULAI' : 'LANJUT'} RONDE {champ.round + 1}
              </button>
              {champ.round > 0 && <button className="btn btn-ghost btn-sm" onClick={reset}>Ulang dari awal</button>}
            </>
          )}
        </div>
      </div>
    </Screen>
  );
}
