import React from 'react';

// Panduan kontrol: bagian sentuh (HP) dan keyboard (komputer), plus tips bermain.
export default function Help({ onClose, touchFirst }) {
  const touch = (
    <section key="t" className="help-sec">
      <h3>📱 Kontrol sentuh (HP)</h3>
      <ul>
        <li><b className="chip g">GAS</b> tahan untuk melaju</li>
        <li><b className="chip r">REM</b> tahan untuk mengerem</li>
        <li><b className="chip">◀ ▶</b> belok kiri / kanan (kiri bawah)</li>
        <li><b className="chip b">⤒</b> lompat. Di udara, tahan ◀ atau ▶ untuk berputar</li>
        <li><b className="chip o">⚡</b> boost: kecepatan ekstra selama bar boost masih ada</li>
      </ul>
    </section>
  );
  const kb = (
    <section key="k" className="help-sec">
      <h3>⌨️ Kontrol keyboard</h3>
      <ul>
        <li><kbd>W</kbd>/<kbd>↑</kbd> gas · <kbd>S</kbd>/<kbd>↓</kbd> rem</li>
        <li><kbd>A</kbd><kbd>D</kbd>/<kbd>←</kbd><kbd>→</kbd> belok</li>
        <li><kbd>Space</kbd> lompat (di udara tahan A/D untuk berputar)</li>
        <li><kbd>Shift</kbd> boost · <kbd>Esc</kbd> pause · <kbd>F</kbd> layar penuh</li>
      </ul>
    </section>
  );
  return (
    <div className="overlay help-overlay" onClick={onClose}>
      <div className="panel big help-panel" onClick={(e) => e.stopPropagation()}>
        <h2>❓ Cara Main</h2>
        {touchFirst ? [touch, kb] : [kb, touch]}
        <section className="help-sec">
          <h3>💡 Tips</h3>
          <ul>
            <li>Kumpulkan 🪙 koin dan jaga bar boost tetap terisi.</li>
            <li>Lompati lubang, genangan, dan kambing. Tetap di tengah jembatan.</li>
            <li>Putaran penuh 360° di udara = stunt + boost.</li>
            <li>Jawab tantangan di checkpoint untuk bonus boost dan koin.</li>
          </ul>
        </section>
        <button className="btn btn-primary" onClick={onClose}>Mengerti!</button>
      </div>
    </div>
  );
}
