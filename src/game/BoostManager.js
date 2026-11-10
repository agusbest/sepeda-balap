// BoostManager: bar boost terisi dari koin & pendaratan mulus; habis saat dipakai
export class BoostManager {
  constructor() { this.reset(); }
  reset() { this.value = 40; this.active = false; }
  add(v) { this.value = Math.min(100, this.value + v); }
  // wantBoost: tombol ditekan. Mengembalikan true jika boost aktif frame ini.
  update(dt, wantBoost, braking) {
    const was = this.active;
    this.active = wantBoost && !braking && this.value > 0;
    if (this.active) this.value = Math.max(0, this.value - 24 * dt);
    else this.value = Math.min(100, this.value + 1.5 * dt);
    return { active: this.active, started: this.active && !was };
  }
}
