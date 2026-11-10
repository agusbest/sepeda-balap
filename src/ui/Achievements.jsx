import React from 'react';
import { useGame } from '../store.js';
import Screen from './Screen.jsx';
import { ACHIEVEMENTS } from '../game/AchievementManager.js';

export default function Achievements() {
  const save = useGame((s) => s.save);
  return (
    <Screen title="🎖️ ACHIEVEMENT">
      <p className="hint center">{save.achievements.length} dari {ACHIEVEMENTS.length} terbuka · achievement +30 XP, piala +60 XP</p>
      <h3 className="sec">🏆 Piala</h3>
      <div className="ach-grid">
        {ACHIEVEMENTS.filter((a) => a.kind === 'trophy').map((a) => {
          const on = save.achievements.includes(a.id);
          return (
            <div key={a.id} className={`ach trophy ${on ? 'on' : ''}`}>
              <span className="ach-icon">{on ? a.icon : '🔒'}</span>
              <div><b>{a.title}</b><small>{a.desc}</small></div>
            </div>
          );
        })}
      </div>
      <h3 className="sec">🎖️ Pencapaian</h3>
      <div className="ach-grid">
        {ACHIEVEMENTS.filter((a) => a.kind !== 'trophy').map((a) => {
          const on = save.achievements.includes(a.id);
          return (
            <div key={a.id} className={`ach ${on ? 'on' : ''}`}>
              <span className="ach-icon">{on ? a.icon : '🔒'}</span>
              <div><b>{a.title}</b><small>{a.desc}</small></div>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
