import React, { useState, useRef, useEffect } from 'react';

// Hanya huruf, angka, spasi, titik, strip, garis bawah; maksimal 12 karakter
export const cleanName = (v) => v.replace(/[^\p{L}\p{N} _.-]/gu, '').replace(/\s+/g, ' ').slice(0, 12);

export default function NameDialog({ initial = '', first = false, onSave, onCancel }) {
  const [v, setV] = useState(initial);
  const ref = useRef(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 150); return () => clearTimeout(t); }, []);
  const name = v.trim();
  const submit = (e) => { e?.preventDefault(); if (name) onSave(name); };
  return (
    <div className="overlay name-overlay" onClick={first ? undefined : onCancel}>
      <form className="panel name-panel" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{first ? '👋 Halo, Pembalap!' : '✏️ Ganti Nama'}</h2>
        <p className="name-hint">{first ? 'Siapa namamu? Nama ini tampil di atas sepedamu dan di papan hasil.' : 'Nama baru akan tampil di sepeda dan papan hasil.'}</p>
        <input
          ref={ref} className="name-input" value={v} maxLength={12} placeholder="Nama pembalap"
          autoComplete="off" autoCapitalize="words" spellCheck={false} enterKeyHint="done"
          onChange={(e) => setV(cleanName(e.target.value))}
          onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}
        />
        <div className="name-count">{v.length}/12</div>
        <button type="submit" className="btn btn-primary" disabled={!name}>{first ? 'MULAI!' : 'SIMPAN'}</button>
        {!first && <button type="button" className="btn btn-ghost" onClick={onCancel}>Batal</button>}
      </form>
    </div>
  );
}
