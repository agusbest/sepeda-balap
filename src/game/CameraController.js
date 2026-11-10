// CameraController: kamera third-person mengikuti pemain sepanjang lintasan
import * as THREE from 'three';

export class CameraController {
  constructor(camera, track) {
    this.camera = camera;
    this.track = track;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.shake = 0;
    this._p = new THREE.Vector3();
    this._l = new THREE.Vector3();
    this.fov = 62;
  }

  snap(bike) {
    this.compute(bike, 0);
    this.pos.copy(this._p); this.look.copy(this._l);
  }

  compute(bike, speedRatio) {
    const t = this.track;
    t.world(bike.s - 6.8, bike.x * 0.7, 3.1 + bike.y * 0.55, this._p);
    t.world(bike.s + 6, bike.x * 0.9, 1.15 + bike.y * 0.75, this._l);
  }

  follow(dt, bike, boosting) {
    this.compute(bike);
    const k = 1 - Math.exp(-dt * 7);
    this.pos.lerp(this._p, k);
    this.look.lerp(this._l, 1 - Math.exp(-dt * 10));
    const speedRatio = Math.min(1.4, bike.speed / 16);
    const targetFov = 60 + speedRatio * 12 + (boosting ? 8 : 0);
    this.fov += (targetFov - this.fov) * Math.min(1, dt * 4);
    this.apply(dt);
  }

  orbit(dt, center, angle, r = 9, h = 3.0, lookY = 1.0) {
    this.pos.set(center.x + Math.cos(angle) * r, h, center.z + Math.sin(angle) * r);
    this.look.set(center.x, lookY, center.z);
    this.fov = 55;
    this.apply(dt);
  }

  apply(dt) {
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.camera.position.copy(this.pos);
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.5;
    }
    this.camera.lookAt(this.look);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
  }
}
