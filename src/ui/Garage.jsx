import React from 'react';
import { useGame, bridge } from '../store.js';
import { BIKE_DEFS, BIKE_ORDER, UPGRADES, UPGRADE_KEYS, MAX_UPGRADE, upgradeCost, computeStats, ratings } from '../game/BikeStats.js';

const BARS = [['speed', 'Speed'], ['accel', 'Accel'], ['handling', 'Handling'], ['jump', 'Jump']];

export default function Garage() {
  const save = useGame((s) => s.save);
  const update = useGame((s) => s.updateSave);
  const sel = save.selectedBike;
  const refresh = () => bridge.engine?.refreshPlayer();

  const buy = (id) => {
    const price = BIKE_DEFS[id].price;
    if (save.coins < price) return;
    update((s) => { s.coins -= price; s.bikes.push(id); s.selectedBike = id; return s; });
    refresh();
  };
  const choose = (id) => { update((s) => { s.selectedBike = id; return s; }); refresh(); };
  const upgrade = (key) => {
    const lvl = save.upgrades[sel]?.[key] ?? 0;
    const cost = upgradeCost(lvl);
    if (lvl >= MAX_UPGRADE || save.coins < cost) return;
    update((s) => { s.coins -= cost; s.upgrades[sel] = { ...(s.upgrades[sel] || {}), [key]: lvl + 1 }; return s; });
    refresh();
  };

  return (
    <div className="garage">
      <div className="garage-head">
        <button className="btn btn-ghost" onClick={() => bridge.engine?.closeGarage()}>← Kembali</button>
        <h2>🔧 GARAGE</h2>
        <div className="coin-badge">🪙 <b>{save.coins}</b></div>
      </div>

      <div className="garage-body">
        <div className="bike-list">
          {BIKE_ORDER.map((id) => {
            const d = BIKE_DEFS[id];
            const owned = save.bikes.includes(id);
            const r = ratings(computeStats(id, save.upgrades));
            return (
              <div key={id} className={`bike-card ${sel === id ? 'active' : ''}`}>
                <div className="bike-title"><b>{d.name}</b><span style={{ background: '#' + d.look.frame.toString(16).padStart(6, '0') }} /></div>
                <p>{d.desc}</p>
                {BARS.map(([k, label]) => (
                  <div className="bar-row" key={k}><small>{label}</small><div className="bar"><i style={{ width: `${r[k]}%` }} /></div></div>
                ))}
                {owned
                  ? <button className="btn btn-sm" disabled={sel === id} onClick={() => choose(id)}>{sel === id ? '✔ Dipakai' : 'Pakai'}</button>
                  : <button className="btn btn-sm btn-primary" disabled={save.coins < d.price} onClick={() => buy(id)}>Beli 🪙 {d.price}</button>}
              </div>
            );
          })}
        </div>

        <div className="upgrade-panel">
          <h3>Upgrade · {BIKE_DEFS[sel].name}</h3>
          {UPGRADE_KEYS.map((k) => {
            const lvl = save.upgrades[sel]?.[k] ?? 0;
            const cost = upgradeCost(lvl);
            return (
              <div className="up-row" key={k}>
                <span className="up-name">{UPGRADES[k].icon} {UPGRADES[k].label}</span>
                <span className="pips">{Array.from({ length: MAX_UPGRADE }, (_, i) => <i key={i} className={i < lvl ? 'on' : ''} />)}</span>
                <button className="btn btn-sm" disabled={lvl >= MAX_UPGRADE || save.coins < cost} onClick={() => upgrade(k)}>
                  {lvl >= MAX_UPGRADE ? 'MAX' : `+ 🪙 ${cost}`}
                </button>
              </div>
            );
          })}
          <p className="hint">Koin didapat dari balapan. Upgrade tidak memakai uang sungguhan.</p>
        </div>
      </div>
    </div>
  );
}
