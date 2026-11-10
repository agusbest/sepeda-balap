import React, { useEffect, useState } from 'react';
import { useGame, bridge } from '../store.js';

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const ordinal = ['', '1', '2', '3', '4', '5'];

function TouchBtn({ name, label, cls }) {
  const on = (down) => (e) => { e.preventDefault(); bridge.engine?.touch(name, down); };
  return (
    <button className={`tbtn ${cls || ''}`} onPointerDown={on(true)} onPointerUp={on(false)} onPointerCancel={on(false)} onPointerLeave={on(false)} onContextMenu={(e) => e.preventDefault()}>
      {label}
    </button>
  );
}

export default function Hud() {
  const h = useGame((s) => s.hud);
  const muted = useGame((s) => s.save.settings.muted);
  const [toast, setToast] = useState(null);
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  useEffect(() => {
    if (!h.toast) return;
    setToast(h.toast);
    const t = setTimeout(() => setToast((cur) => (cur && cur.id === h.toast.id ? null : cur)), 1800);
    return () => clearTimeout(t);
  }, [h.toast?.id]);

  const pct = Math.round(h.progress * 100);

  return (
    <div className="hud">
      <div className="hud-top">
        {h.free ? (
          <div className="pos-badge free"><small>FREE RIDE</small><b>{h.laps}</b><span>putaran</span></div>
        ) : (
          <div className="pos-badge">
            <small>POSISI</small>
            <b>{ordinal[h.pos] || h.pos}</b><span>/{h.total}</span>
          </div>
        )}
        <div className="timer-badge">
          <small>{h.free ? 'LATIHAN' : 'WAKTU'}</small>
          <b>{fmt(h.time)}</b>
        </div>
        <div className="side-badges">
          <div className="coin-badge">🪙 <b>{h.coins}</b><span>/{h.coinsTotal}</span></div>
          <button className="icon-btn" onClick={() => bridge.engine?.setMuted(!muted)} title="Suara">{muted ? '🔇' : '🔊'}</button>
          <button className="icon-btn" onClick={() => bridge.engine?.setPaused(true)} title="Pause (Esc)">⏸</button>
        </div>
      </div>

      <div className="mission">
        {h.free ? `${h.trackName} · cari koin tersembunyi di pinggir jalan` : `${h.trackName} · Misi ⭐⭐⭐: ${h.mission} koin & finish 3 besar`}
      </div>

      {!h.free && <div className="progress">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
        {h.racers.map((r) => (
          <i key={r.id} className={r.id === 'player' ? 'dot me' : 'dot'} style={{ left: `${r.p * 100}%`, background: hex(r.color) }} />
        ))}
        <span className="flag">🏁</span>
      </div>}

      <div className="hud-bottom">
        <div className="speedo"><b>{Math.round(h.speed * 3.6)}</b><small>km/j</small></div>
        {Math.abs(h.grade) > 0.02 && <div className={`grade ${h.grade > 0 ? 'up' : 'down'}`}>{h.grade > 0 ? '⛰ Tanjakan' : '⬇ Turunan'} {Math.round(Math.abs(h.grade) * 100)}%</div>}
        <div className={`boost ${h.boosting ? 'on' : ''}`}>
          <div className="boost-fill" style={{ width: `${h.boost}%` }} />
          <span>BOOST (Shift)</span>
        </div>
      </div>

      {h.state === 'countdown' && (
        <div className="ctl-hint">{isTouch ? 'Tahan GAS · ◀ ▶ belok · ⤒ lompat (di udara = putar 360°) · ⚡ boost · REM' : 'W/↑ gas · A D / ← → belok · SPASI lompat (di udara = putar 360°) · SHIFT boost · S rem'}</div>
      )}
      {h.countdown && <div className={`countdown ${h.countdown === 'GO!' ? 'go' : ''}`} key={h.countdown}>{h.countdown}</div>}
      {toast && <div className={`toast ${toast.kind}`} key={toast.id}>{toast.text}</div>}

      {isTouch && (
        <div className="touch">
          <div className="touch-left">
            <TouchBtn name="left" label="◀" />
            <TouchBtn name="right" label="▶" />
          </div>
          <div className="touch-right">
            <TouchBtn name="boost" label="⚡" cls="boost-b" />
            <TouchBtn name="jump" label="⤒" cls="jump-b" />
            <TouchBtn name="brake" label="REM" cls="brake-b" />
            <TouchBtn name="gas" label="GAS" cls="gas-b" />
          </div>
        </div>
      )}

      {h.paused && (
        <div className="overlay">
          <div className="panel">
            <h2>⏸ Pause</h2>
            <button className="btn btn-primary" onClick={() => bridge.engine?.setPaused(false)}>Lanjut</button>
            {h.free
              ? <button className="btn" onClick={() => bridge.engine?.endFreeRide()}>Selesai &amp; Ambil Koin</button>
              : <button className="btn" onClick={() => bridge.engine?.startRace({ mode: 'champ' })}>Ulangi Balapan</button>}
            <button className="btn btn-ghost" onClick={() => bridge.engine?.backToMenu()}>Menu Utama</button>
          </div>
        </div>
      )}
    </div>
  );
}
