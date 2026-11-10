import React, { useState } from 'react';
import { useGame, bridge } from '../store.js';
import Screen from './Screen.jsx';
import { SaveManager } from '../game/SaveManager.js';
import NameDialog from './NameDialog.jsx';

const LEVELS = [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']];
const QUALITY = [['auto', 'Otomatis'], ['high', 'Tinggi'], ['low', 'Rendah']];

export default function Settings() {
  const save = useGame((s) => s.save);
  const update = useGame((s) => s.updateSave);
  const [confirm, setConfirm] = useState(false);
  const [editName, setEditName] = useState(false);
  const diff = save.settings.difficulty ?? 'normal';
  const quality = save.settings.quality ?? 'auto';

  const reset = () => {
    if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 4000); return; }
    localStorage.removeItem('bikechallenge.save.v1');
    const fresh = SaveManager.load();
    useGame.setState({ save: fresh });
    bridge.engine?.refreshPlayer();
    setConfirm(false);
  };

  return (
    <Screen title="⚙️ PENGATURAN">
      {editName && <NameDialog initial={save.playerName} onCancel={() => setEditName(false)} onSave={(n) => { bridge.engine?.setPlayerName(n); setEditName(false); }} />}
      <div className="settings">
        <div className="set-row"><span>👤 Nama pemain</span>
          <button className="btn btn-sm" onClick={() => setEditName(true)}>{save.playerName || 'Isi nama'} ✎</button>
        </div>
        <div className="set-row"><span>🔊 Suara</span>
          <button className={`seg wide ${!save.settings.muted ? 'on' : ''}`} onClick={() => bridge.engine?.setMuted(!save.settings.muted)}>{save.settings.muted ? 'Mati' : 'Hidup'}</button>
        </div>
        <div className="set-row"><span>🤖 Kesulitan lawan AI</span>
          <div className="diff">
            {LEVELS.map(([k, l]) => (
              <button key={k} className={`seg ${diff === k ? 'on' : ''}`} onClick={() => update((s) => { s.settings.difficulty = k; return s; })}>{l}</button>
            ))}
          </div>
        </div>
        <div className="set-row"><span>🖥️ Kualitas grafis</span>
          <div className="diff">
            {QUALITY.map(([k, l]) => (
              <button key={k} className={`seg ${quality === k ? 'on' : ''}`} onClick={() => { update((s) => { s.settings.quality = k; return s; }); bridge.engine?.setQuality(k); }}>{l}</button>
            ))}
          </div>
        </div>
        <div className="set-row"><span>⛶ Layar penuh (tombol F)</span>
          <button className="btn btn-sm" onClick={() => bridge.engine?.toggleFullscreen()}>Layar penuh</button>
        </div>
        <div className="set-row"><span>🎓 Tantangan edukasi di checkpoint</span>
          <button className={`seg wide ${save.settings.edu !== false ? 'on' : ''}`} onClick={() => update((s) => { s.settings.edu = s.settings.edu === false; return s; })}>{save.settings.edu !== false ? 'Hidup' : 'Mati'}</button>
        </div>
        <div className="set-row"><span>🗑️ Hapus semua progres</span>
          <button className={`btn btn-sm ${confirm ? 'danger' : ''}`} onClick={reset}>{confirm ? 'Klik lagi untuk yakin' : 'Reset'}</button>
        </div>
        <p className="hint">Progres tersimpan otomatis di browser ini (LocalStorage). Di HP, kontrol sentuh muncul otomatis saat balapan. Putar HP ke mode landscape. Mode grafis Otomatis menurunkan kualitas bila fps rendah.</p>
      </div>
    </Screen>
  );
}
