import React from 'react';
import { useGame, bridge } from '../store.js';
import { EDU_REWARD } from '../game/EducationManager.js';

const LETTERS = ['A', 'B', 'C'];
// Emoji di awal soal (rambu) ditampilkan besar
const split = (t) => { const m = t.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/su); return m ? [m[1], m[2]] : [null, t]; };

export default function Quiz() {
  const q = useGame((s) => s.quiz);
  if (!q) return null;
  const answered = q.chosen != null;
  const [sign, text] = split(q.text);

  return (
    <div className="overlay quiz">
      <div className="panel quiz-panel">
        <div className="quiz-head">
          <span className="chip">{q.icon} {q.label}</span>
          <span className="chip alt">Zona Aman · {q.index}/{q.total}</span>
        </div>
        <small className="paused-note">⏸ Waktu balapan dijeda selama kamu menjawab</small>
        {sign && <div className="sign">{sign}</div>}
        <p className="q-text">{text}</p>

        <div className="q-options">
          {q.options.map((o, i) => {
            let cls = 'q-opt';
            if (answered) cls += i === q.correct ? ' right' : i === q.chosen ? ' wrong' : ' dim';
            return (
              <button key={i} className={cls} disabled={answered} onClick={() => bridge.engine?.answerQuiz(i)}>
                <b>{LETTERS[i]}</b><span>{o}</span><kbd>{i + 1}</kbd>
              </button>
            );
          })}
        </div>

        {answered ? (
          <>
            <div className={`feedback ${q.ok ? 'ok' : 'no'}`}>
              <b>{q.ok ? `Benar! 🎉 +${EDU_REWARD.boost}% boost, +${EDU_REWARD.coins} koin di akhir` : 'Belum tepat, tidak apa-apa! 💪'}</b>
              <span>{q.explain}</span>
            </div>
            <button className="btn btn-primary" onClick={() => bridge.engine?.closeQuiz()}>Lanjut balapan ▶</button>
          </>
        ) : (
          <div className="q-foot">
            <small>Jawab benar: +{EDU_REWARD.boost}% boost, +{EDU_REWARD.coins} koin, +{EDU_REWARD.xp} XP</small>
            <button className="btn btn-ghost btn-sm" onClick={() => bridge.engine?.skipQuiz()}>Lewati</button>
          </div>
        )}
      </div>
    </div>
  );
}
