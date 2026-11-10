// BikePhysics: arcade physics dalam "ruang lintasan" (s = jarak sepanjang jalan, x = posisi samping, y = tinggi)
import { ROAD_HALF, WALL_X, GRAVITY } from './constants.js';
import { launchVy } from './trackData.js';

export class BikePhysics {
  constructor(stats) {
    this.stats = stats;
    this.reset(0, 0);
  }

  reset(s, x) {
    Object.assign(this, {
      s, x, y: 0, vx: 0, vy: 0, speed: 0,
      grounded: true, onRamp: false, rampSlope: 0,
      inPuddle: false, boosting: false, onGrass: false, grade: 0,
      steerVis: 0, wallCd: 0, airTime: 0, fallT: 0, onBridge: false, spin: 0, spinDone: false,
    });
  }

  // c = { gas, brake, steer(-1..1), jumpPressed, boost }
  update(dt, c, track, collision, events) {
    const st = this.stats;
    const f = track.sample(this.s);

    // jatuh ke sungai: kontrol mati sebentar, lalu kembali ke tengah jembatan
    if (this.fallT > 0) {
      this.fallT -= dt;
      this.speed = Math.max(0, this.speed - 22 * dt);
      this.s += this.speed * dt * 0.4; this.vx = 0;
      this.y = -1.1 * Math.min(1, (1.3 - this.fallT) / 0.3);
      this.grounded = false; this.spin = 0;
      if (this.fallT <= 0) { this.y = 0; this.x = 0; this.speed = 2.5; this.grounded = true; this.vy = 0; }
      return;
    }

    this.onGrass = Math.abs(this.x) > ROAD_HALF + 0.4;
    let maxSpeed = st.maxSpeed;
    let accel = st.accel;
    if (this.onGrass) maxSpeed *= st.grass ?? 0.55;
    if (this.inPuddle) maxSpeed *= 0.62;
    this.boosting = !!c.boost;
    if (this.boosting) { maxSpeed += 6; accel += 12; }
    // tanjakan memperlambat & menurunkan kecepatan puncak; turunan mempercepat (slope + = naik)
    const slope = this.grounded ? f.slope : 0;
    if (slope > 0) { maxSpeed *= 1 - Math.min(0.2, slope * 1.7); accel *= 1 - Math.min(0.35, slope * 3); }
    else if (slope < 0) maxSpeed *= 1 + Math.min(0.25, -slope * 2.4);
    this.grade = slope;

    // --- gerak maju ---
    if (c.brake) this.speed -= 18 * dt;
    else if (c.gas) {
      if (this.speed < maxSpeed) this.speed = Math.min(maxSpeed, this.speed + accel * (1 - 0.55 * this.speed / maxSpeed) * dt);
      else this.speed = Math.max(maxSpeed, this.speed - 7 * dt);
    } else this.speed -= 2.4 * dt;
    if (this.speed > maxSpeed && !this.boosting) this.speed = Math.max(maxSpeed, this.speed - 7 * dt);
    if (this.inPuddle && this.speed > maxSpeed) this.speed -= 12 * dt;
    this.speed -= slope * 30 * dt; // gaya berat sepanjang jalan
    this.speed = Math.max(0, this.speed);

    // --- gerak samping (kemudi + gaya sentrifugal di tikungan) ---
    const grip = this.grounded ? 1 : 0.5;
    const maxLat = 6.4 * (0.3 + 0.7 * Math.min(1, this.speed / 6)) * st.handling * grip * (this.inPuddle ? 0.55 : 1);
    const cf = this.onBridge ? 0.25 : 1;
    const centrifugal = (this.grounded ? (f.kappa * this.speed * this.speed * 0.85) / st.handling : f.kappa * this.speed * this.speed * 0.3) * cf;
    const target = c.steer * maxLat - centrifugal;
    this.vx += (target - this.vx) * Math.min(1, dt * (this.grounded ? 8 : 2.2));
    this.x += this.vx * dt;
    this.s += this.speed * dt;
    this.steerVis += (c.steer - this.steerVis) * Math.min(1, dt * 10);

    // --- pagar bambu ---
    this.wallCd -= dt;
    const lim = WALL_X - 0.35;
    if (Math.abs(this.x) > lim) {
      this.x = Math.sign(this.x) * lim;
      if (this.wallCd <= 0 && (Math.abs(this.vx) > 1.2 || this.speed > 4)) {
        this.speed *= 0.72; this.wallCd = 0.6; events.push({ type: 'wall' });
      }
      this.vx = -this.vx * 0.25;
    }

    // --- vertikal: lompat / ramp / mendarat ---
    const g = collision.groundAt(this.s, this.x);
    if (this.grounded) {
      if (c.jumpPressed) {
        this.vy = st.jump + (this.onRamp ? launchVy(this.rampSlope, this.speed) * 0.6 : 0);
        this.grounded = false; this.airTime = 0;
        events.push({ type: 'jump' });
      } else if (g.onRamp) {
        this.y = g.h; this.onRamp = true; this.rampSlope = g.slope;
      } else {
        if (this.onRamp) { // lepas landas dari ujung ramp
          this.vy = launchVy(this.rampSlope, this.speed);
          this.grounded = false; this.airTime = 0;
          events.push({ type: 'launch' });
        } else this.y = 0;
        this.onRamp = false;
      }
    }
    if (!this.grounded) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      this.airTime += dt;
      if (this.y > 0.5 && c.steer !== 0 && c.trick !== false) this.spin += c.steer * dt * 10;
      if (this.y <= g.h && this.vy <= 0) {
        this.y = g.h; this.grounded = true;
        this.onRamp = g.onRamp; this.rampSlope = g.slope;
        events.push({ type: 'land', airTime: this.airTime, spin: this.spin });
        this.spin = 0;
        this.vy = 0;
      }
    }
  }
}
