// Efek partikel ringan: satu THREE.Points dengan kolam partikel tetap (tanpa alokasi saat balapan).
import * as THREE from 'three';

const MAX = 220;

export class Particles {
  constructor(scene) {
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX).fill(1);
    this.base = new Float32Array(MAX * 3);
    this.next = 0;
    this.enabled = true;
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -999;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.34, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = geo;
    this.mat = mat;
  }

  setEnabled(v) { this.enabled = v; if (!v) this.clear(); }

  clear() { this.life.fill(0); for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -999; this.geo.attributes.position.needsUpdate = true; }

  emit(p, n, color, speed = 2, up = 2, life = 0.6, spread = 0.3) {
    if (!this.enabled) return;
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.next; this.next = (this.next + 1) % MAX;
      this.pos[i * 3] = p.x + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 1] = p.y + 0.1;
      this.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * spread;
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      this.vel[i * 3] = Math.cos(a) * s; this.vel[i * 3 + 1] = up * (0.5 + Math.random() * 0.8); this.vel[i * 3 + 2] = Math.sin(a) * s;
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      this.life[i] = this.maxLife[i] = life * (0.7 + Math.random() * 0.5);
    }
  }

  coin(p) { this.emit(p, 10, 0xffd21f, 2.4, 3.2, 0.55, 0.2); }
  dust(p) { this.emit(p, 12, 0xcdb48a, 2.2, 1.2, 0.7, 0.6); }
  splash(p) { this.emit(p, 14, 0x8fd3ff, 2.6, 3.6, 0.65, 0.5); }
  boostTrail(p) { this.emit(p, 2, 0xff9b2f, 0.8, 0.4, 0.4, 0.25); }

  update(dt) {
    if (!this.enabled) return;
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.vel[i * 3 + 1] -= 9 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    if (any) this.geo.attributes.position.needsUpdate = true;
  }

  dispose() { this.points.removeFromParent(); this.geo.dispose(); this.mat.dispose(); }
}
