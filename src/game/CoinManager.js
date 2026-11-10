// CoinManager: koin emas yang berputar
import * as THREE from 'three';

export class CoinManager {
  constructor(scene, track, coinDefs) {
    this.coins = [];
    const geo = new THREE.CylinderGeometry(0.46, 0.46, 0.09, 18).rotateX(Math.PI / 2);
    const rimGeo = new THREE.TorusGeometry(0.44, 0.045, 6, 18);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffc928, emissive: 0x7a4f00 });
    const rimMat = new THREE.MeshLambertMaterial({ color: 0xffe27a, emissive: 0x6a5200 });
    this.group = new THREE.Group();
    const p = new THREE.Vector3();
    for (const d of coinDefs) {
      const m = new THREE.Group();
      m.add(new THREE.Mesh(geo, mat), new THREE.Mesh(rimGeo, rimMat));
      track.world(d.s, d.x, 0, p);
      m.position.set(p.x, p.y + d.h + 0.85, p.z);
      m.rotation.y = Math.atan2(track.sample(d.s).tan.x, track.sample(d.s).tan.z);
      m.userData.baseY = m.position.y;
      m.userData.yaw = m.rotation.y;
      this.group.add(m);
      this.coins.push({ ...d, mesh: m, taken: false, pop: 0 });
    }
    scene.add(this.group);
    this.collected = 0;
    this.total = this.coins.length;
  }

  reset() {
    this.collected = 0;
    this.coins.forEach((c) => { c.taken = false; c.pop = 0; c.mesh.visible = true; c.mesh.scale.setScalar(1); });
  }

  animate(t, dt) {
    for (const c of this.coins) {
      if (c.taken) {
        if (c.pop > 0) {
          c.pop -= dt * 4;
          c.mesh.visible = c.pop > 0;
          c.mesh.scale.setScalar(1 + (1 - Math.max(0, c.pop)) * 1.2);
          c.mesh.position.y += dt * 3;
        }
        continue;
      }
      c.mesh.rotation.y = c.mesh.userData.yaw + t * 3.2;
      c.mesh.position.y = c.mesh.userData.baseY + Math.sin(t * 3 + c.s) * 0.08;
    }
  }

  // Cek tabrakan koin (jarak 3D di ruang lintasan). Mengembalikan jumlah koin yang baru diambil.
  collect(bike) {
    let n = 0;
    const cy = bike.y + 0.85;
    for (const c of this.coins) {
      if (c.taken) continue;
      const ds = c.s - bike.s;
      if (ds > 2 || ds < -2) continue;
      const dx = c.x - bike.x, dy = c.h + 0.85 - cy;
      if (ds * ds + dx * dx + dy * dy < 1.6 * 1.6) {
        c.taken = true; c.pop = 1; n++;
      }
    }
    this.collected += n;
    return n;
  }
}
