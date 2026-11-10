import React, { useState } from "react";
import { useGame, bridge } from "../store.js";
import { BIKE_DEFS } from "../game/BikeStats.js";
import { ACHIEVEMENTS } from "../game/AchievementManager.js";
import { CHAMP_TRACKS } from "../game/Championship.js";
import Help from "./Help.jsx";
import NameDialog from "./NameDialog.jsx";

export default function Menu() {
  const save = useGame((s) => s.save);
  const setScreen = useGame((s) => s.setScreen);
  const champ = save.championship;
  const [help, setHelp] = useState(false);
  const [editName, setEditName] = useState(false);
  const needName = !save.playerName; // pertama kali main: wajib isi nama
  const isTouch =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone);
  // di HP: masuk layar penuh otomatis saat pemain menekan tombol main (butuh sentuhan pemain)
  const goFull = () => {
    if (isTouch && !standalone) bridge.engine?.enterFullscreen();
  };
  const champLabel = !champ
    ? "Belum dimulai"
    : champ.done
      ? "Selesai"
      : `Ronde ${champ.round + 1}/${CHAMP_TRACKS.length}`;

  return (
    <div className="menu">
      {(needName || editName) && (
        <NameDialog
          first={needName}
          initial={save.playerName}
          onCancel={() => setEditName(false)}
          onSave={(n) => {
            bridge.engine?.setPlayerName(n);
            setEditName(false);
          }}
        />
      )}
      {help && <Help onClose={() => setHelp(false)} touchFirst={isTouch} />}
      {!standalone && (
        <button
          className="fs-btn"
          aria-label="Layar penuh"
          onClick={() => bridge.engine?.toggleFullscreen()}
        >
          ⛶
        </button>
      )}
      <div className="menu-card">
        <div className="logo">
          <span className="logo-top">BIKE</span>
          <span className="logo-main">RACING INDONESIA</span>
          {/* <span className="logo-sub">Juara Jalanan Indonesia</span> */}
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            goFull();
            setScreen("championship");
          }}
        >
          <button className="hello" onClick={() => setEditName(true)}>
            👤 {save.playerName || "Pemain"} ✎
          </button>
          🏆 CHAMPIONSHIP <small>{champLabel}</small>
        </button>
        <button
          className="btn btn-big"
          onClick={() => {
            goFull();
            setScreen("tracks");
          }}
        >
          🚴 FREE RIDE <small>jelajah &amp; cari koin</small>
        </button>
        <div className="menu-row">
          <button className="btn" onClick={() => bridge.engine?.openGarage()}>
            🔧 Garage<small>{BIKE_DEFS[save.selectedBike]?.name}</small>
          </button>
          <button className="btn" onClick={() => setScreen("achievements")}>
            🎖️ Achievement
            <small>
              {save.achievements.length}/{ACHIEVEMENTS.length}
            </small>
          </button>
          <button className="btn" onClick={() => setScreen("settings")}>
            ⚙️ Pengaturan
          </button>
        </div>
        <button
          className="btn btn-ghost help-btn"
          onClick={() => setHelp(true)}
        >
          ❓ Cara Main <small>kontrol: gas, rem, lompat, boost</small>
        </button>
        <div className="version">v1.0 · MVP</div>
        <div className="wallet">
          🪙 {save.coins} &nbsp;·&nbsp; ⭐ Level {save.level} &nbsp;·&nbsp; XP{" "}
          {save.xp}
        </div>

        <div className="controls">
          <div>
            <kbd>W</kbd>/<kbd>↑</kbd> Gas
          </div>
          <div>
            <kbd>S</kbd>/<kbd>↓</kbd> Rem
          </div>
          <div>
            <kbd>A</kbd>
            <kbd>D</kbd>/<kbd>←</kbd>
            <kbd>→</kbd> Belok
          </div>
          <div>
            <kbd>Space</kbd> Lompat
          </div>
          <div>
            <kbd>Shift</kbd> Boost
          </div>
          <div>
            <kbd>Esc</kbd> Pause
          </div>
        </div>
        <p className="tip">
          Tips: di udara tahan A/D untuk berputar. Putaran penuh 360° = stunt +
          boost!
        </p>
      </div>
    </div>
  );
}
