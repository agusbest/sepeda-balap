import React from 'react';
import { useGame, bridge } from '../store.js';

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const titles = { 1: 'JUARA 1! 🏆', 2: 'Juara 2! 🥈', 3: 'Juara 3! 🥉' };

function Edu({ edu }) {
  if (!edu || !edu.asked) return null;
  return (
    <div className="edu-line">
      🎓 Tantangan edukasi: <b>{edu.correct}/{edu.asked}</b> benar
      {edu.coins ? <> · +{edu.coins} 🪙</> : null}{edu.xp ? <> · +{edu.xp} XP</> : null}
      {edu.perfect ? ' · 💯 Sempurna!' : ''}
    </div>
  );
}

function Achievements({ list }) {
  if (!list?.length) return null;
  return <div className="new-ach">{list.map((a) => <div key={a.id}>{a.kind === 'trophy' ? '🏆 Piala baru' : '🎖️ Achievement'}: <b>{a.icon} {a.title}</b> +{a.kind === 'trophy' ? 60 : 30} XP</div>)}</div>;
}

export default function Result() {
  const r = useGame((s) => s.result);
  const setScreen = useGame((s) => s.setScreen);
  if (!r) return null;
  const toMenu = () => bridge.engine?.backToMenu();

  if (r.free) {
    return (
      <div className="overlay result">
        <div className="panel big">
          <h2>Free Ride selesai</h2>
          <div className="stats">
            <div><small>Lintasan</small><b style={{ fontSize: 13 }}>{r.trackName}</b></div>
            <div><small>Putaran</small><b>{r.laps}</b></div>
            <div><small>Waktu</small><b>{fmt(r.time)}</b></div>
            <div><small>Koin</small><b>+{r.coins} 🪙</b></div>
          </div>
          <div className="mission-line">Ditemukan {r.coins} dari {r.coinsTotal} koin (termasuk koin tersembunyi).</div>
          <Edu edu={r.edu} />
          <Achievements list={r.achievements} />
          <div className="row">
            <button className="btn btn-primary" onClick={() => { toMenu(); setScreen('tracks'); }}>Free Ride Lagi</button>
            <button className="btn btn-ghost" onClick={toMenu}>Menu</button>
          </div>
        </div>
      </div>
    );
  }

  const c = r.champ;
  return (
    <div className="overlay result">
      <div className="panel big">
        <small className="track-tag">{r.trackName}{c ? ` · Ronde ${c.round}/${c.total}` : ''}</small>
        <h2>{titles[r.position] || `Posisi ${r.position}`}</h2>
        <div className="stars">
          {[1, 2, 3].map((i) => <span key={i} className={i <= r.stars ? 'star on' : 'star'} style={{ animationDelay: `${i * 0.25}s` }}>★</span>)}
        </div>
        {r.record && <div className="record">⚡ Rekor waktu baru!</div>}

        <div className="stats">
          <div><small>Waktu</small><b>{fmt(r.time)}</b></div>
          <div><small>Koin</small><b>{r.coins}/{r.coinsTotal}</b></div>
          <div><small>Hadiah</small><b>+{r.coinsEarned} 🪙</b></div>
          <div><small>XP</small><b>+{r.xp}</b></div>
        </div>
        <div className="mission-line">
          {r.mission ? '✅' : '⬜'} Misi tambahan: kumpulkan {r.missionCoins} koin (dapat {r.coins}) ·{' '}
          {r.position <= 3 ? '✅' : '⬜'} Finish 3 besar
        </div>
        {r.tricks > 0 && <div className="record">🤸 Stunt 360° x{r.tricks} (+{r.tricks * 3} koin)</div>}
        <Edu edu={r.edu} />
        {r.levelUp && <div className="record">🎉 Naik ke Level {r.level}!</div>}
        {r.nextUnlock && <div className="record">🔓 Lintasan baru terbuka untuk Free Ride!</div>}
        <Achievements list={r.achievements} />

        {c ? (
          <>
            <h4 className="sub">Klasemen Championship {c.done ? '(akhir)' : ''}</h4>
            <ol className="standings">
              {c.standings.map((e, i) => (
                <li key={e.id} className={e.id === 'player' ? 'me' : ''}><span>{i + 1}</span> {e.name} <em>{e.points} poin</em></li>
              ))}
            </ol>
            {c.done && <div className="record">{c.champion ? '👑 GRAND CHAMPION!' : `Peringkat akhir ${c.rank}`} · bonus +{c.reward} 🪙</div>}
          </>
        ) : null}

        <ol className="standings">
          {r.standings.map((e, i) => (
            <li key={e.id} className={e.id === 'player' ? 'me' : ''}>
              <span>{i + 1}</span> {e.name} <em>{e.estimated ? '~' : ''}{fmt(e.time)}</em>
            </li>
          ))}
        </ol>

        <div className="row">
          <button className="btn btn-primary" onClick={() => { toMenu(); setScreen('championship'); }}>{c ? (c.done ? 'Ke Championship' : 'Lanjut') : 'Menu'}</button>
          <button className="btn btn-ghost" onClick={toMenu}>Menu Utama</button>
        </div>
      </div>
    </div>
  );
}
