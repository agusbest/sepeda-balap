import React, { useEffect, useState } from 'react';
import { useGame, bridge } from '../store.js';
import Screen from './Screen.jsx';
import { TRACKS, TRACK_ORDER } from '../game/tracks.js';

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const GRADS = { 'kampung-1': 'linear-gradient(135deg,#7cc95a,#2f7fe8)', 'kampung-2': 'linear-gradient(135deg,#ffb25c,#8a4fb0)', 'dirt-1': 'linear-gradient(135deg,#c79a5a,#7a5230)' };

export default function TrackSelect() {
  const save = useGame((s) => s.save);
  const [sel, setSel] = useState('kampung-1');
  const def = TRACKS[sel];
  useEffect(() => { bridge.engine?.loadTrack(sel); }, [sel]);
  const best = save.bestTimes[sel], stars = save.bestStars[sel] ?? 0;

  return (
    <Screen title="🚴 FREE RIDE · Pilih Lintasan">
      <div className="cards">
        {TRACK_ORDER.map((id) => {
          const t = TRACKS[id]; const locked = !save.unlockedTracks.includes(id);
          return (
            <button key={id} disabled={locked} className={`track-card ${sel === id ? 'active' : ''}`} onClick={() => setSel(id)}>
              <div className="thumb" style={{ background: GRADS[id] }}><span>{locked ? '🔒' : t.emoji}</span></div>
              <b>{t.name}</b>
              <small>{t.world} · {t.sub}</small>
              <small>{locked ? 'Selesaikan ronde sebelumnya di Championship' : `${'★'.repeat(save.bestStars[id] ?? 0)}${'☆'.repeat(3 - (save.bestStars[id] ?? 0))}`}</small>
            </button>
          );
        })}
      </div>
      <div className="detail">
        <h3>{def.name} · {def.sub}</h3>
        <p>{def.desc}</p>
        {def.climb && <p>⛰️ {def.climb}</p>}
        <p>🔍 Free Ride: tanpa lawan dan tanpa tekanan waktu. Cari koin tersembunyi di pinggir jalan, latihan lompat &amp; stunt. Setiap lewat garis finish = putaran baru.</p>
        {best ? <p>Rekor balapan: <b>{fmt(best)}</b> · {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</p> : null}
        <button className="btn btn-primary" onClick={() => bridge.engine?.startRace({ mode: 'free', trackId: sel })}>▶ MULAI FREE RIDE</button>
      </div>
    </Screen>
  );
}
