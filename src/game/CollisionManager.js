// CollisionManager: ketinggian tanah (ramp), lubang, genangan air
import { RAMP, POTHOLE_R, PUDDLE_RX, PUDDLE_RZ } from './trackData.js';

export class CollisionManager {
  constructor(obstacles, goats = [], track = null) {
    this.track = track;
    this.obstacles = obstacles;
    this.goats = goats;
    this.ramps = obstacles.filter((o) => o.t === 'ramp');
    this.holes = obstacles.filter((o) => o.t === 'pothole');
    this.puddles = obstacles.filter((o) => o.t === 'puddle');
    this._g = { h: 0, slope: 0, onRamp: false };
  }

  reset() { this.obstacles.forEach((o) => { o.hit = false; }); }

  groundAt(s, x) {
    const g = this._g;
    g.h = 0; g.slope = 0; g.onRamp = false;
    for (const r of this.ramps) {
      if (s >= r.s && s <= r.s + RAMP.len && Math.abs(x - r.x) <= RAMP.w / 2) {
        g.h = ((s - r.s) / RAMP.len) * RAMP.h; g.slope = RAMP.h / RAMP.len; g.onRamp = true;
        break;
      }
    }
    return g;
  }

  update(bike, events, now = 0) {
    bike.inPuddle = false;
    const br = this.track?.bridgeAt(bike.s);
    bike.onBridge = !!br;
    if (br && bike.fallT <= 0 && bike.y < 0.3 && Math.abs(bike.x) > br.half - 0.15) {
      bike.fallT = 1.3;
      events.push({ type: 'fall' });
    }
    for (const g of this.goats) {
      if (now < g.hitCd || bike.y > 0.75 || bike.fallT > 0) continue;
      const ds = bike.s - g.s, dx = bike.x - g.x;
      if (ds * ds + dx * dx < 1.15 * 1.15) {
        g.hitCd = now + 1.3;
        bike.speed *= 0.4; bike.vy = 3.4; bike.grounded = false; bike.airTime = 0;
        bike.vx += Math.sign(dx || 1) * 2.5;
        events.push({ type: 'goat' });
      }
    }
    for (const p of this.puddles) {
      const ds = (bike.s - p.s) / PUDDLE_RX, dx = (bike.x - p.x) / PUDDLE_RZ;
      if (bike.grounded && ds * ds + dx * dx < 1) {
        bike.inPuddle = true;
        if (!p.hit) {
          p.hit = true;
          bike.vx += (Math.random() < 0.5 ? -1 : 1) * 2.8;
          events.push({ type: 'puddle' });
        }
      }
    }
    for (const h of this.holes) {
      if (h.hit || bike.y > 0.4) continue;
      const ds = bike.s - h.s, dx = bike.x - h.x;
      if (ds * ds + dx * dx < (POTHOLE_R + 0.3) ** 2) {
        h.hit = true;
        bike.speed *= 0.45; bike.vy = 4.2; bike.grounded = false; bike.airTime = 0;
        events.push({ type: 'pothole' });
      }
    }
  }
}
