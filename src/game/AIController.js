// AIController: pembalap lawan berbasis waypoint (garis tengah lintasan) + penghindaran rintangan
import * as THREE from 'three';
import { DIFFICULTY } from './constants.js';
import { RAMP } from './trackData.js';
import { createBike, makeNameTag } from './BikeModel.js';

export class Rival {
  constructor(def, scene) {
    this.def = def;
    this.model = createBike({ frame: def.color, helmet: def.color, jersey: def.color === 0xe53935 ? 0xffffff : def.color, skin: def.skin ?? [0xa8714a, 0xd9a577, 0x8d5a3a, 0xb5794f][(def.name?.length ?? 0) % 4] });
    const tag = makeNameTag(def.name);
    tag.position.set(0, 2.35, 0);
    this.model.root.add(tag);
    scene.add(this.model.root);
    this.reset(0, 0);
  }

  reset(s, x) {
    Object.assign(this, { s, x, speed: 0, finished: false, finishTime: 0, boostT: 4 + Math.random() * 4, boostLeft: 0 });
  }

  update(dt, track, obstacles, playerS, raceTime, difficulty = 'normal') {
    const d = this.def;
    const diff = DIFFICULTY[difficulty] ?? 1;
    const f = track.sample(this.s);
    const straightness = 1 - Math.min(1, Math.abs(f.kappa) / 0.018);
    let target = (d.corner + (d.straight - d.corner) * straightness) * diff;

    const sl = f.slope; // tanjakan memperlambat, turunan mempercepat (sama seperti pemain)
    target *= sl > 0 ? 1 - Math.min(0.2, sl * 1.7) : 1 + Math.min(0.22, -sl * 2.2);

    const gap = this.s - playerS; // rubber banding ringan agar balapan tetap seru
    if (gap > 40) target *= 0.92; else if (gap < -40) target *= 1.07;

    if (d.boost) {
      this.boostT -= dt;
      if (this.boostT <= 0) { this.boostT = 8 + Math.random() * 4; this.boostLeft = 2; }
      if (this.boostLeft > 0) { this.boostLeft -= dt; target += 3.5; }
    }
    if (this.finished) target = Math.max(0, this.speed - 5 * dt);
    const dv = target - this.speed;
    this.speed += Math.max(-9 * dt, Math.min(5.8 * dt, dv));

    // penghindaran rintangan: cari yang ada di depan & di jalur
    let tx = d.lane;
    for (const o of obstacles) {
      if (o.s < this.s + 1 || o.s > this.s + 18) continue;
      if (o.t === 'goat' && o.s < this.s + 11 && Math.abs(o.x - this.x) < 2.2) this.speed = Math.max(this.speed - 10 * dt, target * 0.6);
      const half = o.t === 'ramp' ? RAMP.w / 2 + 0.5 : o.t === 'puddle' ? 2.0 : 1.5;
      if (Math.abs(this.x - o.x) < half + 0.7 || Math.abs(tx - o.x) < half) {
        let cand = o.x + (this.x >= o.x ? 1 : -1) * (half + 0.9);
        if (Math.abs(cand) > 3.3) cand = o.x - Math.sign(cand) * (half + 0.9);
        tx = Math.max(-3.3, Math.min(3.3, cand));
        break;
      }
    }
    if (track.bridgeAt(this.s + 8) || track.bridgeAt(this.s)) tx = Math.max(-1.0, Math.min(1.0, tx)); // jembatan sempit: tetap di tengah
    const maxStep = 3.6 * dt;
    this.x += Math.max(-maxStep, Math.min(maxStep, tx - this.x));
    this.s += this.speed * dt;

    if (!this.finished && this.s >= track.finishS) { this.finished = true; this.finishTime = raceTime; }
    this.s = Math.min(this.s, track.length - 4);
  }

  sync(track, dt, tmp) {
    const f = track.sample(this.s);
    const yaw = Math.atan2(f.tan.x, f.tan.z);
    track.world(this.s, this.x, 0.03, tmp);
    this.model.root.position.copy(tmp);
    this.model.root.rotation.y = yaw;
    this.model.root.rotation.x = -Math.atan(f.slope);
    this.model.update(dt, this.speed, 0, false);
  }
}

export class AIController {
  constructor(scene, defs) { this.rivals = defs.map((d) => new Rival(d, scene)); }
  reset(startS, lanes) { this.rivals.forEach((r, i) => r.reset(startS - 0.5 * i, lanes[i])); }
  update(dt, track, obstacles, playerS, raceTime, difficulty) { this.rivals.forEach((r) => r.update(dt, track, obstacles, playerS, raceTime, difficulty)); }
  sync(track, dt) { const tmp = new THREE.Vector3(); this.rivals.forEach((r) => r.sync(track, dt, tmp)); }
}
