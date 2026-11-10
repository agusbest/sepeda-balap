// MovingObstacles: kambing yang menyeberang jalan bolak-balik
import * as THREE from 'three';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

function createGoat() {
  const g = new THREE.Group();
  const body = lam(0xf3efe4), dark = lam(0x4a3a2a), horn = lam(0xd9c9a0), pink = lam(0xf0a8a0);
  const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  add(new THREE.BoxGeometry(0.55, 0.55, 1.0), body, 0, 0.78, 0);
  const head = new THREE.Group(); head.position.set(0, 1.12, 0.55); g.add(head);
  add(new THREE.BoxGeometry(0.34, 0.34, 0.4), body, 0, 0, 0.05, head);
  add(new THREE.BoxGeometry(0.2, 0.16, 0.14), pink, 0, -0.08, 0.28, head);
  for (const sx of [-1, 1]) {
    add(new THREE.ConeGeometry(0.05, 0.3, 5), horn, sx * 0.1, 0.26, -0.02, head).rotation.z = -sx * 0.3;
    add(new THREE.BoxGeometry(0.2, 0.06, 0.12), body, sx * 0.24, 0.1, 0, head).rotation.z = sx * -0.4;
    add(new THREE.SphereGeometry(0.03, 5, 5), dark, sx * 0.1, 0.05, 0.25, head);
  }
  add(new THREE.BoxGeometry(0.1, 0.22, 0.08), body, 0, 0.98, -0.52); // ekor
  const legs = [];
  for (const [x, z] of [[-0.18, 0.35], [0.18, 0.35], [-0.18, -0.35], [0.18, -0.35]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.5, z); g.add(pivot);
    add(new THREE.BoxGeometry(0.1, 0.5, 0.1), dark, 0, -0.25, 0, pivot);
    legs.push(pivot);
  }
  g.userData.legs = legs;
  return g;
}

export class MovingObstacles {
  constructor(scene, track, defs) {
    this.track = track;
    this.goats = defs.map((d) => ({ ...d, t: 'goat', x: 0, hitCd: 0, mesh: createGoat(), vx: 0 }));
    this.goats.forEach((g) => scene.add(g.mesh));
    this._p = new THREE.Vector3();
    this.update(0);
  }

  reset() { this.goats.forEach((g) => { g.hitCd = 0; }); }

  update(t) {
    for (const g of this.goats) {
      g.x = g.amp * Math.sin(g.w * t + g.phase);
      g.vx = g.amp * g.w * Math.cos(g.w * t + g.phase);
      const f = this.track.sample(g.s);
      this.track.world(g.s, g.x, 0.03, this._p);
      g.mesh.position.copy(this._p);
      const dir = Math.sign(g.vx) || 1; // menghadap arah berjalan (searah vektor 'kanan' jalan)
      g.mesh.rotation.y = Math.atan2(f.right.x * dir, f.right.z * dir);
      const sw = Math.sin(t * 9 + g.phase) * 0.5;
      g.mesh.userData.legs.forEach((l, i) => { l.rotation.x = i % 2 ? sw : -sw; });
      g.mesh.position.y += Math.abs(Math.sin(t * 9 + g.phase)) * 0.04;
    }
  }
}
