// GameEngine: menyatukan semua modul – loop utama, input, render
import * as THREE from "three";
import { RIVALS, DEFAULT_DIFFICULTY } from "./constants.js";
import {
  buildObstacles,
  buildCoins,
  buildHiddenCoins,
  generateContent,
} from "./trackData.js";
import { TRACKS } from "./tracks.js";
import {
  applyRound,
  standings as champStandings,
  newChampionship,
  CHAMP_TRACKS,
  GRAND_CHAMPION_REWARD,
} from "./Championship.js";
import { evaluateAchievements } from "./AchievementManager.js";
import { EducationManager, EDU_REWARD } from "./EducationManager.js";
import { computeStats, BIKE_DEFS } from "./BikeStats.js";
import { MovingObstacles } from "./MovingObstacles.js";
import { TrackManager } from "./TrackManager.js";
import { buildScenery, buildSky, applySkyTheme } from "./Scenery.js";
import { createBike, makeNameTag } from "./BikeModel.js";
import { BikePhysics } from "./BikePhysics.js";
import { CollisionManager } from "./CollisionManager.js";
import { CoinManager } from "./CoinManager.js";
import { BoostManager } from "./BoostManager.js";
import { AIController } from "./AIController.js";
import { RaceManager } from "./RaceManager.js";
import { CameraController } from "./CameraController.js";
import { AudioManager } from "./AudioManager.js";
import { Particles } from "./Particles.js";
import { RewardManager } from "./RewardManager.js";
import { useGame, emptyHud, getPlayerName } from "../store.js";

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "Escape",
]);

export class GameEngine {
  constructor(container) {
    this.container = container;
    this.mode = "menu"; // menu | race
    this.paused = false;
    this.clock = 0;
    this.hudTimer = 0;
    this.orbitAngle = 0.6;
    this.toastId = 0;
    this.toastMsg = null;
    this.resultTimer = null;
    this.held = new Set();
    this.input = {
      keys: new Set(),
      touch: {
        gas: false,
        brake: false,
        left: false,
        right: false,
        boost: false,
      },
      jumpQueued: false,
    };

    // --- renderer & scene ---
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.quality = "high";
    this.fpsAcc = 0;
    this.fpsN = 0;
    this.fpsWarm = 0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cssText =
      "display:block;width:100%;height:100%;touch-action:none;";

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xdff2ff, 90, 520);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.3, 1800);

    // --- dunia ---
    this._tmp = new THREE.Vector3();
    this.audio = new AudioManager();
    this.sky = buildSky(this.scene, TRACKS["kampung-1"].theme);

    // --- cahaya ---
    this.hemi = new THREE.HemisphereLight(0xdcefff, 0x7a9a55, 1.15);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 2.3);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -28;
    sc.right = 28;
    sc.top = 28;
    sc.bottom = -28;
    sc.near = 1;
    sc.far = 220;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);
    this.sunOffset = [55, 85, 40];

    // --- pemain, lawan, lintasan ---
    this.stats = computeStats("starter", {});
    this.bike = new BikePhysics(this.stats);
    this.boost = new BoostManager();
    this.particles = new Particles(this.scene);
    this.refreshPlayer();
    this.ai = new AIController(this.scene, RIVALS);
    this.raceMode = "champ"; // champ | free
    this.edu = new EducationManager();
    this.quizOpen = false;
    this.currentQuiz = null;
    this.loadTrack("kampung-1");

    this._tmp = new THREE.Vector3();
    this.resize = this.resize.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onVis = () => {
      if (
        document.hidden &&
        this.mode === "race" &&
        this.race.state !== "finished"
      )
        this.setPaused(true);
    };
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("visibilitychange", this.onVis);
    this.onBlur = () => {
      if (this.mode === "race" && this.race.state === "racing")
        this.setPaused(true);
    };
    window.addEventListener("blur", this.onBlur);
    this.resize();
    this.setQuality(useGame.getState().save.settings.quality ?? "auto");

    this.placeOnGrid();
    this.syncModels(0);
    this.audio.setMuted(useGame.getState().save.settings.muted);

    this.last = performance.now();
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  // ---------------- kualitas grafis ----------------
  // 'auto' mulai dari tinggi lalu turun ke rendah bila fps rata-rata < 38; 'high' / 'low' dikunci.
  setQuality(mode) {
    this.qualityMode = mode;
    this.applyQuality(mode === "low" ? "low" : "high");
    this.fpsAcc = 0;
    this.fpsN = 0;
    this.fpsWarm = 0;
  }

  applyQuality(q) {
    this.quality = q;
    const low = q === "low";
    this.renderer.setPixelRatio(
      low ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.shadowMap.enabled = !low;
    this.sun.castShadow = !low;
    this.particles.setEnabled(true);
    this.scene.traverse((o) => {
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => {
          m.needsUpdate = true;
        });
      }
    });
    this.resize();
  }

  watchFps(dt) {
    if (
      this.qualityMode !== "auto" ||
      this.quality === "low" ||
      this.mode !== "race" ||
      this.paused ||
      this.quizOpen
    ) {
      this.fpsAcc = 0;
      this.fpsN = 0;
      return;
    }
    this.fpsWarm += dt;
    if (this.fpsWarm < 3) return; // abaikan 3 dtk pertama (kompilasi shader)
    this.fpsAcc += dt;
    this.fpsN++;
    if (this.fpsAcc >= 4) {
      const fps = this.fpsN / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsN = 0;
      if (fps < 38) {
        this.applyQuality("low");
        this.toast("Grafis diturunkan otomatis agar lancar", "info");
      }
    }
  }

  // Layar penuh (menyembunyikan address bar). Harus dipanggil dari sentuhan/klik pemain.
  // Di Android Chrome juga mengunci layar ke landscape. iPhone Safari tidak mendukung API ini (pakai "Tambah ke Layar Utama").
  enterFullscreen() {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement || !el.requestFullscreen) return;
      const r = el.requestFullscreen({ navigationUI: "hide" });
      Promise.resolve(r)
        .then(() => screen.orientation?.lock?.("landscape"))
        .catch(() => {});
    } catch (e) {
      /* diabaikan */
    }
  }

  toggleFullscreen() {
    try {
      if (!document.fullscreenElement) this.enterFullscreen();
      else {
        document.exitFullscreen?.();
        screen.orientation?.unlock?.();
      }
    } catch (e) {
      /* diabaikan */
    }
  }

  // ---------------- lintasan ----------------
  disposeGroup(g) {
    g.traverse((n) => {
      if (n.geometry) n.geometry.dispose();
      const mats = Array.isArray(n.material)
        ? n.material
        : n.material
          ? [n.material]
          : [];
      mats.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    });
  }

  loadTrack(id) {
    const def = TRACKS[id];
    if (!def || (this.trackId === id && this.track)) return;
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
      this.disposeGroup(this.worldGroup);
    }
    const g = (this.worldGroup = new THREE.Group());
    this.scene.add(g);
    this.trackId = id;
    this.trackDef = def;
    const th = def.theme;

    const track = (this.track = new TrackManager(def));
    const content = def.content ?? generateContent(track, def.gen);
    track.bridges = content.bridges;
    track.buildRoad(g, th);
    this.world = buildScenery(g, track, th, def.seed);
    this.obstacles = buildObstacles(content.obstacles, track.finishS);
    track.buildObstacles(g, this.obstacles);
    track.buildBridges(g);
    track.buildSharpTurnSigns(g);
    track.buildSlopeSigns(g);
    this.moving = new MovingObstacles(g, track, content.goats);
    this.collision = new CollisionManager(
      this.obstacles,
      this.moving.goats,
      track,
    );
    this.aiObstacles = [...this.obstacles, ...this.moving.goats];
    this.warned = new Set();
    this.coinDefs = buildCoins(this.obstacles, track.finishS, track.bridges);
    this.hiddenDefs = buildHiddenCoins(track, track.bridges, def.seed);
    this.coins = null;
    this.coinsFree = null;
    this.rebuildCoins(false);

    g.add(
      track.stripe(track.startS, "start"),
      track.stripe(track.finishS, "finish"),
    );
    g.add(track.arch(track.startS, "START", 0x1e6bff, 0x0d3fa8));
    g.add(track.arch(track.finishS, "FINISH", 0xff8a1f, 0xc2410c));
    this.race = new RaceManager(track);
    this.race.checkpoints.forEach((cs, i) =>
      g.add(track.arch(cs, `CHECKPOINT ${i + 1}`, 0x1a9c5b, 0x0d6b3d)),
    );

    // tema: langit, kabut, cahaya
    applySkyTheme(this.sky, th);
    this.scene.fog.color.set(th.fog);
    this.scene.fog.near = th.fogRange[0];
    this.scene.fog.far = th.fogRange[1];
    this.hemi.color.set(th.hemi.sky);
    this.hemi.groundColor.set(th.hemi.ground);
    this.hemi.intensity = th.hemi.intensity;
    this.sun.color.set(th.sun.color);
    this.sun.intensity = th.sun.intensity;
    this.sunOffset = th.sun.offset;

    if (this.camCtl) this.camCtl.track = track;
    else this.camCtl = new CameraController(this.camera, track);
    this.placeOnGrid();
    this.syncModels(0);
  }

  rebuildCoins(free) {
    if (this.coins && this.coinsFree === free) return;
    if (this.coins) {
      this.worldGroup.remove(this.coins.group);
      this.disposeGroup(this.coins.group);
    }
    this.coins = new CoinManager(
      this.worldGroup,
      this.track,
      free
        ? [...this.coinDefs, ...this.hiddenDefs].sort((a, b) => a.s - b.s)
        : this.coinDefs,
    );
    this.coinsFree = free;
  }

  // ---------------- sepeda pemain ----------------
  setPlayerName(name) {
    useGame.getState().updateSave((s) => {
      s.playerName = name;
      return s;
    });
    this.refreshPlayer(); // label nama di atas sepeda ikut diperbarui
  }

  refreshPlayer() {
    const save = useGame.getState().save;
    const id = BIKE_DEFS[save.selectedBike] ? save.selectedBike : "starter";
    if (this.player) this.scene.remove(this.player.root);
    this.player = createBike(BIKE_DEFS[id].look);
    const tag = makeNameTag(getPlayerName(), "#ffd21f");
    tag.position.set(0, 2.35, 0);
    tag.visible = this.mode !== "garage";
    this.player.root.add(tag);
    this.scene.add(this.player.root);
    this.stats = computeStats(id, save.upgrades);
    this.bike.stats = this.stats;
    this.bikeId = id;
    if (this.ai) this.syncModels(0);
  }

  openGarage() {
    this.mode = "garage";
    this.player.root.traverse((n) => {
      if (n.isSprite) n.visible = false;
    });
    this.ai.rivals.forEach((r) => {
      r.model.root.visible = false;
    });
    useGame.getState().setScreen("garage");
  }
  closeGarage() {
    this.mode = "menu";
    this.ai.rivals.forEach((r) => {
      r.model.root.visible = true;
    });
    useGame.getState().setScreen("menu");
  }

  // ---------------- input ----------------
  onKeyDown(e) {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return; // sedang mengetik nama
    this.held.add(e.code); // tombol fisik yang sedang ditekan (tetap dilacak saat kuis terbuka)
    if (this.quizOpen) {
      // kuis terbuka: tombol 1-3 menjawab, Enter/Space melanjutkan
      if (e.repeat) return;
      const n = {
        Digit1: 0,
        Digit2: 1,
        Digit3: 2,
        Numpad1: 0,
        Numpad2: 1,
        Numpad3: 2,
      }[e.code];
      if (n !== undefined) this.answerQuiz(n);
      else if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        if (this.currentQuiz?.chosen != null) this.closeQuiz();
      }
      return;
    }
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === "KeyF") {
      this.toggleFullscreen();
      return;
    }
    this.input.keys.add(e.code);
    if (e.code === "Space") this.input.jumpQueued = true;
    if (
      e.code === "Escape" &&
      this.mode === "race" &&
      this.race.state !== "finished"
    )
      this.setPaused(!this.paused);
  }
  onKeyUp(e) {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    this.held.delete(e.code);
    this.input.keys.delete(e.code);
  }
  touch(name, down) {
    if (name === "jump") {
      if (down) this.input.jumpQueued = true;
      return;
    }
    this.input.touch[name] = down;
  }
  readControls() {
    const k = this.input.keys,
      t = this.input.touch;
    const left = k.has("KeyA") || k.has("ArrowLeft") || t.left;
    const right = k.has("KeyD") || k.has("ArrowRight") || t.right;
    const c = {
      gas: k.has("KeyW") || k.has("ArrowUp") || t.gas,
      brake: k.has("KeyS") || k.has("ArrowDown") || t.brake,
      steer: (right ? 1 : 0) - (left ? 1 : 0),
      jumpPressed: this.input.jumpQueued,
      boost: k.has("ShiftLeft") || k.has("ShiftRight") || t.boost,
    };
    this.input.jumpQueued = false;
    return c;
  }

  // ---------------- alur permainan ----------------
  placeOnGrid() {
    const s0 = this.track.startS - 2.5;
    this.bike.reset(s0, 0);
    this.ai.reset(
      s0,
      RIVALS.map((r) => r.lane),
    );
    this.boost.reset();
    this.coins.reset();
    this.collision.reset();
    this.moving.reset();
    this.moving.update(0);
    this.warned.clear();
    this.race.reset();
  }

  startRace({ mode = "champ", trackId } = {}) {
    this.audio.unlock();
    clearTimeout(this.resultTimer);
    if (trackId) this.loadTrack(trackId);
    this.raceMode = mode;
    const free = mode === "free";
    this.rebuildCoins(free);
    this.ai.rivals.forEach((r) => {
      r.model.root.visible = !free;
    });
    this.refreshPlayer();
    this.placeOnGrid();
    this.race.begin();
    this.edu.reset();
    this.quizOpen = false;
    this.currentQuiz = null;
    useGame.getState().setQuiz(null);
    if (free) this.race.countdown = 0.9;
    this.laps = 1;
    this.mode = "race";
    this.paused = false;
    this.syncModels(0);
    this.camCtl.snap(this.bike);
    useGame.getState().setResult(null);
    useGame.getState().setScreen("race");
    this.toastMsg = null;
    this.syncHud(true);
  }

  // ---------------- tantangan edukasi ----------------
  openQuiz() {
    const R = this.race,
      P = this.bike;
    const ctx = {
      coins: this.coins.collected,
      progress: P.s - this.track.startS,
      length: this.track.finishS - this.track.startS,
      cpTimes: R.cpTimes,
    };
    const q = this.edu.next(ctx, useGame.getState().save.eduSeen);
    this.currentQuiz = {
      ...q,
      index: this.edu.asked + 1,
      total: R.checkpoints.length,
      chosen: null,
    };
    this.quizOpen = true;
    this.input.keys.clear();
    this.input.jumpQueued = false;
    Object.keys(this.input.touch).forEach((k) => {
      this.input.touch[k] = false;
    });
    this.audio.checkpoint();
    useGame.getState().setQuiz(this.currentQuiz);
  }

  answerQuiz(i) {
    const q = this.currentQuiz;
    if (!q || q.chosen != null) return;
    const ok = this.edu.record(q, i);
    const R = this.race;
    R.edu = {
      asked: this.edu.asked,
      correct: this.edu.correct,
      skipped: this.edu.skipped,
      coins: this.edu.coins,
    };
    this.currentQuiz = { ...q, chosen: i, ok };
    if (ok) {
      this.boost.add(EDU_REWARD.boost);
      this.audio.win();
    } else this.audio.bump();
    useGame.getState().updateSave((s) => {
      s.eduSeen = [...s.eduSeen.filter((x) => x !== q.id), q.id].slice(-30);
      s.stats.eduTotal++;
      if (ok) s.stats.eduCorrect++;
      if (ok)
        s.stats.eduCat = {
          ...(s.stats.eduCat || {}),
          [q.cat]: (s.stats.eduCat?.[q.cat] ?? 0) + 1,
        };
      return s;
    });
    useGame.getState().setQuiz(this.currentQuiz);
  }

  skipQuiz() {
    if (!this.currentQuiz || this.currentQuiz.chosen != null) return;
    this.edu.skipped++;
    this.edu.asked++;
    this.race.edu = {
      asked: this.edu.asked,
      correct: this.edu.correct,
      skipped: this.edu.skipped,
      coins: this.edu.coins,
    };
    this.closeQuiz();
  }

  closeQuiz() {
    this.quizOpen = false;
    this.currentQuiz = null;
    this.held.forEach((c) => {
      if (GAME_KEYS.has(c) && c !== "Escape" && c !== "Space")
        this.input.keys.add(c);
    }); // gas yang masih ditahan tetap berlaku
    useGame.getState().setQuiz(null);
    this.last = performance.now();
    if (this.race.state === "racing")
      this.toast(
        this.race.edu.correct
          ? "Lanjut balapan! Boost bertambah"
          : "Lanjut balapan!",
        "good",
      );
  }

  startChampionshipRound() {
    useGame.getState().updateSave((s) => {
      if (!s.championship) s.championship = newChampionship();
      return s;
    });
    const champ = useGame.getState().save.championship;
    if (champ.done) return;
    this.startRace({ mode: "champ", trackId: CHAMP_TRACKS[champ.round] });
  }

  // Free Ride: selesai, koin yang dikumpulkan masuk ke dompet
  endFreeRide() {
    if (this.mode !== "race" || this.raceMode !== "free") return;
    const R = this.race,
      got = this.coins.collected;
    let unlocked = [];
    useGame.getState().updateSave((s) => {
      const ec = R.edu.correct * 5;
      s.coins += got + ec;
      s.xp += R.edu.correct * 15;
      s.stats.coins += got;
      s.stats.freeCoins += got;
      unlocked = evaluateAchievements(s);
      return s;
    });
    this.paused = false;
    useGame
      .getState()
      .setResult({
        free: true,
        edu: {
          asked: R.edu.asked,
          correct: R.edu.correct,
          coins: R.edu.correct * 5,
        },
        coins: got,
        coinsTotal: this.coins.total,
        time: R.time,
        laps: this.laps,
        trackName: this.trackDef.name,
        achievements: unlocked,
      });
    useGame.getState().setScreen("result");
  }

  backToMenu() {
    clearTimeout(this.resultTimer);
    this.mode = "menu";
    this.paused = false;
    this.ai.rivals.forEach((r) => {
      r.model.root.visible = true;
    });
    this.placeOnGrid();
    this.syncModels(0);
    useGame.getState().setScreen("menu");
    useGame.getState().setHud(emptyHud);
  }

  setPaused(p) {
    this.paused = p;
    this.syncHud(true);
  }

  toast(text, kind = "info") {
    this.toastMsg = { id: ++this.toastId, text, kind };
  }

  setMuted(m) {
    this.audio.setMuted(m);
    useGame.getState().updateSave((s) => {
      s.settings.muted = m;
      return s;
    });
  }

  // ---------------- simulasi ----------------
  stepRace(dt) {
    const R = this.race,
      P = this.bike;
    const events = [];

    if (R.state === "countdown") {
      R.countdown -= dt;
      const n = Math.ceil(R.countdown - 0.6);
      if (n !== R.lastCount && n >= 1 && n <= 3) {
        this.audio.beep();
        R.lastCount = n;
      }
      if (R.countdown <= 0.6) {
        R.state = "racing";
        R.time = 0;
        R.goUntil = this.clock + 1.0;
        this.audio.go();
      }
    }

    let ctl = {
      gas: false,
      brake: false,
      steer: 0,
      jumpPressed: false,
      boost: false,
    };
    if (R.state === "racing") ctl = this.readControls();
    else if (R.state === "finished") ctl.brake = true;
    else this.input.jumpQueued = false;

    const b = this.boost.update(dt, ctl.boost, ctl.brake);
    ctl.boost = b.active;
    if (b.started) this.audio.boost();

    P.update(dt, ctl, this.track, this.collision, events);
    this.collision.update(P, events, R.elapsed);

    const got = this.coins.collect(P);
    if (got) {
      this.boost.add(5 * got);
      this.audio.coin();
      this.particles.coin(this.player.root.position);
    }
    if (b.active && R.state === "racing")
      this.particles.boostTrail(this.player.root.position);

    for (const ev of events) {
      switch (ev.type) {
        case "jump":
        case "launch":
          this.audio.jump();
          break;
        case "land":
          this.audio.land();
          this.particles.dust(this.player.root.position);
          if (Math.abs(ev.spin) >= 5.6) {
            R.tricks++;
            this.boost.add(25);
            this.audio.win();
            this.toast(`STUNT 360°! +Boost (${R.tricks}x)`, "good");
          } else if (Math.abs(ev.spin) > 1.3) {
            P.speed *= 0.8;
            this.toast("Mendarat miring! Selesaikan putaran penuh", "bad");
            this.camCtl.shake = 0.5;
          } else if (ev.airTime > 0.45) {
            this.boost.add(12);
            this.toast("Pendaratan mulus! +Boost", "good");
            this.camCtl.shake = Math.max(this.camCtl.shake, 0.2);
          }
          break;
        case "pothole":
          R.hits++;
          this.audio.bump();
          this.camCtl.shake = 0.9;
          this.toast("Aduh, lubang! Lompat lain kali", "bad");
          break;
        case "puddle":
          this.audio.splash();
          this.particles.splash(this.player.root.position);
          this.toast("Genangan! Jalan jadi licin", "bad");
          break;
        case "fall":
          R.hits++;
          this.audio.splash();
          this.particles.splash(this.player.root.position);
          this.camCtl.shake = 0.5;
          this.toast("Jatuh ke sungai! Tetap di tengah jembatan", "bad");
          break;
        case "goat":
          R.hits++;
          this.audio.bump();
          this.camCtl.shake = 0.8;
          this.toast("Awas kambing! Hindari atau lompati", "bad");
          break;
        case "wall":
          R.hits++;
          this.audio.bump();
          this.camCtl.shake = 0.6;
          this.toast("Awas pagar!", "bad");
          break;
      }
    }

    const active = R.state === "racing" || R.state === "finished";
    if (active) this.moving.update(R.elapsed);
    if (R.state === "racing") R.time += dt;
    if (active) R.elapsed += dt;
    if (active && this.raceMode !== "free")
      this.ai.update(
        dt,
        this.track,
        this.aiObstacles,
        P.s,
        R.elapsed,
        useGame.getState().save.settings.difficulty ?? DEFAULT_DIFFICULTY,
      );
    else if (R.state === "countdown")
      this.ai.rivals.forEach((r) => {
        r.speed = 0;
      });

    // peringatan zona berbahaya
    if (R.state === "racing") {
      for (const z of this.track.sharpTurns)
        if (P.s > z.s0 - 25 && P.s < z.s1 && !this.warned.has(z)) {
          this.warned.add(z);
          this.toast("Tikungan tajam! Kurangi gas & belok", "bad");
        }
      for (const b of this.track.bridges)
        if (P.s > b.s0 - 22 && P.s < b.s1 && !this.warned.has(b)) {
          this.warned.add(b);
          this.toast("Jembatan sempit! Tetap di tengah", "bad");
        }
    }

    // checkpoint
    if (
      R.state === "racing" &&
      R.cpPassed < R.checkpoints.length &&
      P.s >= R.checkpoints[R.cpPassed]
    ) {
      R.cpPassed++;
      this.audio.checkpoint();
      R.cpTimes.push(R.time);
      this.toast(
        `Checkpoint ${R.cpPassed}/${R.checkpoints.length} – ${R.time.toFixed(1)} dtk`,
        "good",
      );
      if (
        useGame.getState().save.settings.edu !== false &&
        (this.raceMode !== "free" || this.laps === 1)
      )
        this.openQuiz();
    }

    // Free Ride: lewat garis finish = putaran baru (tanpa akhir)
    if (
      this.raceMode === "free" &&
      R.state === "racing" &&
      P.s >= this.track.finishS
    ) {
      this.laps++;
      P.s = this.track.startS - 2.5;
      R.cpPassed = 0;
      this.collision.reset();
      this.warned.clear();
      this.audio.checkpoint();
      this.toast(`Putaran ${this.laps}! Cari koin yang tersembunyi`, "good");
    }

    // finish
    if (
      this.raceMode !== "free" &&
      R.state === "racing" &&
      P.s >= this.track.finishS
    ) {
      R.finishTime = R.time;
      const rank = R.ranking(P, this.ai.rivals);
      R.state = "finished";
      R.position = rank.findIndex((e) => e.id === "player") + 1;
      this.audio.finish();
      this.toast(`FINISH! Posisi ${R.position}`, "good");
      this.resultTimer = setTimeout(() => this.showResult(), 2600);
    }
  }

  showResult() {
    const R = this.race;
    if (
      this.mode !== "race" ||
      R.state !== "finished" ||
      this.raceMode === "free" ||
      R.resultShown
    )
      return;
    R.resultShown = true;
    const coinsTotal = this.coins.total;
    const rw = RewardManager.compute({
      position: R.position,
      coins: this.coins.collected,
      coinsTotal,
      tricks: R.tricks,
      edu: R.edu,
    });
    const order = R.finalOrder(this.bike, this.ai.rivals);
    const standings = order.map((e) => ({
      id: e.id,
      name: e.name,
      time: e.time,
      estimated: e.estimated,
    }));
    const trackId = this.trackId;
    let record = false,
      prevLevel = 1,
      level = 1,
      champInfo = null,
      unlocked = [],
      nextUnlock = null;
    useGame.getState().updateSave((s) => {
      prevLevel = s.level;
      s.coins += rw.coinsEarned;
      s.xp += rw.xp;
      const st = s.stats;
      st.races++;
      if (R.position === 1) st.wins++;
      if (R.position <= 3) st.podiums++;
      st.coins += this.coins.collected;
      st.tricks += R.tricks;
      const best = s.bestTimes[trackId];
      if (!best || R.finishTime < best) {
        s.bestTimes[trackId] = R.finishTime;
        record = true;
      }
      s.bestStars[trackId] = Math.max(s.bestStars[trackId] ?? 0, rw.stars);

      // Championship: poin & ronde berikutnya
      const champ = s.championship;
      if (champ && !champ.done && CHAMP_TRACKS[champ.round] === trackId) {
        const before = champ.round;
        applyRound(
          champ,
          trackId,
          order.map((e) => e.id),
        );
        const next = CHAMP_TRACKS[before + 1];
        if (next && !s.unlockedTracks.includes(next)) {
          s.unlockedTracks.push(next);
          nextUnlock = next;
        }
        champInfo = {
          round: before + 1,
          total: CHAMP_TRACKS.length,
          done: champ.done,
          standings: champStandings(champ),
          pointsGained:
            order.findIndex((e) => e.id === "player") >= 0
              ? [10, 7, 5, 3, 1][R.position - 1]
              : 0,
        };
        if (champ.done) {
          const rank =
            champInfo.standings.findIndex((e) => e.id === "player") + 1;
          champInfo.rank = rank;
          champInfo.champion = rank === 1;
          const reward = GRAND_CHAMPION_REWARD[rank] ?? 20;
          champInfo.reward = reward;
          s.coins += reward;
          if (rank === 1) st.champs++;
        }
      }
      unlocked = evaluateAchievements(s, {
        hits: R.hits,
        position: R.position,
        eduPerfect: rw.eduPerfect,
      });
      s.level = Math.floor(s.xp / 200) + 1;
      level = s.level;
      return s;
    });
    this.audio.win();
    useGame.getState().setResult({
      position: R.position,
      time: R.finishTime,
      coins: this.coins.collected,
      coinsTotal,
      trackName: this.trackDef.name,
      missionCoins: RewardManager.missionCoins(coinsTotal),
      ...rw,
      record,
      levelUp: level > prevLevel,
      level,
      standings,
      champ: champInfo,
      achievements: unlocked,
      nextUnlock,
      edu: {
        asked: rw.eduAsked,
        correct: rw.eduCorrect,
        coins: rw.eduCoins,
        xp: rw.eduXp,
        perfect: rw.eduPerfect,
      },
    });
    useGame.getState().setScreen("result");
  }

  syncModels(dt) {
    const P = this.bike,
      t = this.track,
      tmp = this._tmp;
    const f = t.sample(P.s);
    const yaw =
      Math.atan2(f.tan.x, f.tan.z) -
      Math.atan2(P.vx, Math.max(P.speed, 4)) * 0.9;
    t.world(P.s, P.x, P.y + 0.03, tmp);
    this.player.root.position.copy(tmp);
    this.player.root.rotation.y = yaw + P.spin;
    this.player.root.rotation.x = -Math.atan(f.slope) * (P.grounded ? 1 : 0.5); // sepeda mengikuti kemiringan jalan
    this.player.update(dt, P.speed, P.steerVis, !P.grounded && P.y > 0.3);
    this.ai.sync(t, dt);
  }

  syncHud(force = false) {
    const R = this.race,
      P = this.bike;
    const rank = R.ranking(P, this.ai.rivals);
    const span = this.track.finishS - this.track.startS;
    const pr = (s) => Math.max(0, Math.min(1, (s - this.track.startS) / span));
    let cd = "";
    if (R.state === "countdown")
      cd = String(Math.max(1, Math.ceil(R.countdown - 0.6)));
    else if (R.state === "racing" && this.clock < R.goUntil) cd = "GO!";
    useGame.getState().setHud({
      state: R.state,
      countdown: cd,
      paused: this.paused,
      pos: rank.findIndex((e) => e.id === "player") + 1,
      total: rank.length,
      time: R.time,
      progress: pr(P.s),
      racers: [
        { id: "player", color: 0xffd21f, p: pr(P.s) },
        ...this.ai.rivals.map((r) => ({
          id: r.def.id,
          color: r.def.color,
          p: pr(r.s),
        })),
      ],
      coins: this.coins.collected,
      coinsTotal: this.coins.total,
      mission: RewardManager.missionCoins(this.coins.total),
      boost: this.boost.value,
      boosting: this.boost.active,
      speed: P.speed,
      grade: P.grade ?? 0,
      toast: this.toastMsg,
      cp: R.cpPassed,
      quizOpen: this.quizOpen,
      free: this.raceMode === "free",
      laps: this.laps ?? 1,
      trackName: this.trackDef.name,
      round: useGame.getState().save.championship?.round ?? 0,
      rounds: CHAMP_TRACKS.length,
    });
  }

  // ---------------- loop ----------------
  tick(now) {
    this.raf = requestAnimationFrame((n) => this.tick(n));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.clock += dt;

    try {
      this.frame(dt);
    } catch (err) {
      // satu frame yang gagal tidak boleh mematikan seluruh game
      this.errCount = (this.errCount ?? 0) + 1;
      if (this.errCount < 4) console.error("frame error", err);
      if (this.errCount === 3 && this.mode === "race") this.backToMenu();
    }
    this.renderer.render(this.scene, this.camera);
  }

  frame(dt) {
    this.coins.animate(this.clock, dt);
    this.particles.update(dt);
    this.world.clouds.forEach((c) => {
      c.position.x += dt * 1.5;
      if (c.position.x > 800) c.position.x = -800;
    });

    if (this.mode === "menu") {
      this.orbitAngle += dt * 0.25;
      const f = this.track.sample(this.track.startS);
      this.camCtl.orbit(
        dt,
        this.player.root.position,
        this.orbitAngle,
        5.4,
        1.2,
        -0.1,
      ); // sepeda tampil di bagian atas, kartu di bawah
      this.moving.update(this.clock);
      this.syncModels(dt * 0.2);
    } else if (this.mode === "garage") {
      this.orbitAngle += dt * 0.5;
      this.camCtl.orbit(
        dt,
        this.player.root.position,
        this.orbitAngle,
        3.8,
        1.3,
        0.3,
      );
      this.syncModels(dt * 2);
    } else if (!this.paused && !this.quizOpen) {
      this.stepRace(dt);
      this.syncModels(dt);
      this.camCtl.follow(dt, this.bike, this.boost.active);
      this.hudTimer += dt;
      if (this.hudTimer > 0.05) {
        this.hudTimer = 0;
        this.syncHud();
      }
      this.watchFps(dt);
    }
    this.audio.windLevel(
      this.mode === "race" &&
        !this.paused &&
        !this.quizOpen &&
        this.race.state !== "countdown"
        ? Math.min(1, this.bike.speed / 22)
        : 0,
    );

    // matahari mengikuti pemain agar bayangan tajam
    const pp = this.player.root.position;
    this.sun.target.position.copy(pp);
    this.sun.position.set(
      pp.x + this.sunOffset[0],
      pp.y + this.sunOffset[1],
      pp.z + this.sunOffset[2],
    );
    this.sky.position.copy(this.camera.position);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth,
      h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.resultTimer);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("blur", this.onBlur);
    this.particles.dispose();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("visibilitychange", this.onVis);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
