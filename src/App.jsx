import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine.js';
import { useGame, bridge } from './store.js';
import Menu from './ui/Menu.jsx';
import Hud from './ui/Hud.jsx';
import Result from './ui/Result.jsx';
import Garage from './ui/Garage.jsx';
import TrackSelect from './ui/TrackSelect.jsx';
import Championship from './ui/Championship.jsx';
import Achievements from './ui/Achievements.jsx';
import Settings from './ui/Settings.jsx';
import Quiz from './ui/Quiz.jsx';

export default function App() {
  const mount = useRef(null);
  const screen = useGame((s) => s.screen);
  const [error, setError] = useState(null);
  const [hideRotate, setHideRotate] = useState(false);

  useEffect(() => {
    let engine;
    try {
      engine = new GameEngine(mount.current);
      bridge.engine = engine;
      window.__game = engine; // memudahkan debugging / pengujian
    } catch (e) {
      console.error(e);
      setError(e.message || String(e));
    }
    return () => { engine?.dispose(); bridge.engine = null; };
  }, []);

  if (error) {
    return (
      <div className="fatal">
        <h1>Ups, game tidak bisa dimulai</h1>
        <p>Browser kamu mungkin belum mendukung WebGL. Coba Chrome, Edge, atau Firefox versi terbaru.</p>
        <code>{error}</code>
      </div>
    );
  }

  return (
    <div className="root">
      <div className="viewport" ref={mount} />
      {screen === 'menu' && <Menu />}
      {screen === 'race' && <Hud />}
      {screen === 'garage' && <Garage />}
      {screen === 'tracks' && <TrackSelect />}
      {screen === 'championship' && <Championship />}
      {screen === 'achievements' && <Achievements />}
      {screen === 'settings' && <Settings />}
      {screen === 'result' && <Result />}
      {screen === 'race' && <Quiz />}
      {!hideRotate && (
        <div className="rotate-hint" onClick={() => setHideRotate(true)}>
          <div>📱↻<br />Putar HP ke mode landscape<br />agar balapan lebih nyaman<br /><button className="btn btn-sm" onClick={() => setHideRotate(true)}>Tetap main portrait</button></div>
        </div>
      )}
    </div>
  );
}
