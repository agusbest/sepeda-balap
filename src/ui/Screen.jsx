import React from 'react';
import { useGame, bridge } from '../store.js';

// Kerangka layar menu: tombol kembali + judul + dompet
export default function Screen({ title, back = 'menu', onBack, children }) {
  const coins = useGame((s) => s.save.coins);
  const setScreen = useGame((s) => s.setScreen);
  return (
    <div className="screen">
      <div className="screen-head">
        <button className="btn btn-ghost" onClick={() => (onBack ? onBack() : setScreen(back))}>← Kembali</button>
        <h2>{title}</h2>
        <div className="coin-badge">🪙 <b>{coins}</b></div>
      </div>
      <div className="screen-body">{children}</div>
    </div>
  );
}
export { bridge };
