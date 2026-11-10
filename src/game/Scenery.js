// Scenery: suasana kampung & sawah Indonesia (pohon kelapa, rumah, sawah, bendera, gunung, awan, langit)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeCanvas, canvasTexture } from './TrackManager.js';
import { ROAD_HALF, WALL_X } from './constants.js';

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const mx = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'XYZ') =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, order)), new THREE.Vector3(sx, sy, sz));

function mergeParts(parts) {
  const geos = parts.map((p) => {
    let g = p.g.clone();
    if (p.m) g.applyMatrix4(p.m);
    if (g.index) g = g.toNonIndexed();
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const c = new THREE.Color(p.color);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    return g;
  });
  return mergeGeometries(geos);
}

function instanced(geo, mat, matrices, castShadow = false) {
  const im = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((m, i) => im.setMatrixAt(i, m));
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = castShadow;
  im.frustumCulled = false;
  return im;
}

const vcMat = () => new THREE.MeshLambertMaterial({ vertexColors: true });

export function buildSky(scene, theme) {
  const geo = new THREE.SphereGeometry(1300, 24, 16);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  const sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -10;
  scene.add(sky);

  // matahari
  const sun = new THREE.Mesh(new THREE.CircleGeometry(60, 24), new THREE.MeshBasicMaterial({ color: 0xfff6cf, fog: false, depthWrite: false }));
  sky.add(sun);
  sky.userData.sun = sun;
  applySkyTheme(sky, theme);
  return sky;
}

export function applySkyTheme(sky, theme) {
  const top = new THREE.Color(theme.sky.top), mid = new THREE.Color(theme.sky.mid), hor = new THREE.Color(theme.sky.hor);
  const geo = sky.geometry, pos = geo.attributes.position, col = geo.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 1300;
    const c = y > 0 ? (y < 0.35 ? hor.clone().lerp(mid, y / 0.35) : mid.clone().lerp(top, (y - 0.35) / 0.65)) : hor.clone();
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
  const sun = sky.userData.sun;
  sun.position.set(...theme.sun.disc); sun.lookAt(0, 0, 0);
}

export function buildScenery(scene, track, theme, seed = 7) {
  const rnd = mulberry32(seed);
  const R = (a, b) => a + rnd() * (b - a);
  const L = track.length;
  const frame = { pos: new THREE.Vector3(), tan: new THREE.Vector3(), right: new THREE.Vector3(), kappa: 0 };

  const place = (minOff, maxOff, minRoadDist, s0 = 0, s1 = L) => {
    for (let tries = 0; tries < 12; tries++) {
      const s = R(s0, s1);
      const side = rnd() < 0.5 ? -1 : 1;
      const f = track.sample(s, frame);
      const off = R(minOff, maxOff);
      const x = f.pos.x + f.right.x * off * side, z = f.pos.z + f.right.z * off * side;
      if (track.distToRoad(x, z) >= minRoadDist) return { x, z, s, side, roadX: f.pos.x, roadZ: f.pos.z };
    }
    return null;
  };

  // tinggi tanah (bukit) di sebuah titik & seberapa rata area di sekitarnya
  const gy = (x, z) => track.groundY(x, z);
  const spread = (x, z, r) => {
    const a = [gy(x, z), gy(x + r, z), gy(x - r, z), gy(x, z + r), gy(x, z - r)];
    return [Math.min(...a), Math.max(...a)];
  };

  // ---------- Rumah kampung ----------
  const houses = [];
  const wallGeo = mergeParts([{ g: new THREE.BoxGeometry(6, 3, 5), color: 0xffffff, m: mx(0, 1.5, 0) }]);
  const detailGeo = mergeParts([
    { g: new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4), color: 0xb9502f, m: mx(0, 3.9, 0, 0, 0, 0, 4.7, 1.8, 4.0) },
    { g: new THREE.BoxGeometry(1.1, 2, 0.15), color: 0x5b3a22, m: mx(0, 1.0, 2.5) },
    { g: new THREE.BoxGeometry(1.2, 1.0, 0.12), color: 0x9fd8f5, m: mx(-1.9, 1.7, 2.5) },
    { g: new THREE.BoxGeometry(1.2, 1.0, 0.12), color: 0x9fd8f5, m: mx(1.9, 1.7, 2.5) },
    { g: new THREE.BoxGeometry(6.4, 0.25, 1.4), color: 0x8c6a45, m: mx(0, 2.7, 3.1) }, // teras
  ]);
  const wallM = [], detM = [], wallColors = [];
  const pastel = [0xfff0c9, 0xffd9d9, 0xd9f2dd, 0xd9e8ff, 0xfff2a8, 0xf0e1ff];
  for (let i = 0; i < 90 && houses.length < theme.houses; i++) {
    const p = place(15, 26, 12);
    if (!p || houses.some((h) => Math.hypot(h.x - p.x, h.z - p.z) < 16)) continue;
    const sp = spread(p.x, p.z, 4.5);
    if (sp[1] - sp[0] > 0.9) continue; // rumah hanya di tanah yang cukup rata
    p.y = sp[0] - 0.1;
    houses.push(p);
    const yaw = Math.atan2(p.roadX - p.x, p.roadZ - p.z);
    const sc = R(0.9, 1.15);
    const m = mx(p.x, p.y, p.z, 0, yaw, 0, sc, sc, sc);
    wallM.push(m); detM.push(m);
    wallColors.push(new THREE.Color(pastel[(rnd() * pastel.length) | 0]));
  }
  const wallMesh = instanced(wallGeo, vcMat(), wallM, false);
  wallColors.forEach((c, i) => wallMesh.setColorAt(i, c));
  wallMesh.instanceColor.needsUpdate = true;
  scene.add(wallMesh, instanced(detailGeo, vcMat(), detM, false));

  // ---------- Pohon kelapa ----------
  const palmParts = [{ g: new THREE.CylinderGeometry(0.16, 0.27, 7, 6), color: 0x8a6a45, m: mx(0, 3.5, 0) }];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const g = new THREE.BoxGeometry(0.75, 0.06, 3.4); g.translate(0, 0, 1.7);
    palmParts.push({ g, color: i % 2 ? 0x2f9a45 : 0x3aa84f, m: mx(0, 7, 0, 0.5, a, 0, 1, 1, 1, 'YXZ') });
  }
  for (let i = 0; i < 3; i++) palmParts.push({ g: new THREE.SphereGeometry(0.2, 6, 5), color: 0x6b4a2b, m: mx(Math.cos(i * 2.1) * 0.3, 6.7, Math.sin(i * 2.1) * 0.3) });
  const palmGeo = mergeParts(palmParts);
  const palmM = [];
  for (let i = 0; i < 700 && palmM.length < theme.palms; i++) {
    const p = place(WALL_X + 2.5, 55, WALL_X + 2);
    if (!p || houses.some((h) => Math.hypot(h.x - p.x, h.z - p.z) < 7)) continue;
    const sc = R(0.8, 1.4);
    palmM.push(mx(p.x, gy(p.x, p.z) - 0.1, p.z, R(-0.06, 0.06), R(0, 6.28), R(-0.06, 0.06), sc, sc, sc));
  }
  scene.add(instanced(palmGeo, vcMat(), palmM, false));

  // Semak / pisang kecil di dekat jalan
  const bushGeo = mergeParts([
    { g: new THREE.SphereGeometry(0.9, 7, 5), color: 0x3f9e3b, m: mx(0, 0.6, 0, 0, 0, 0, 1.2, 0.8, 1.2) },
    { g: new THREE.SphereGeometry(0.6, 7, 5), color: 0x57b84a, m: mx(0.7, 0.5, 0.3) },
  ]);
  const bushM = [];
  for (let i = 0; i < 400 && bushM.length < theme.bushes; i++) {
    const p = place(WALL_X + 1.2, 14, WALL_X + 0.8);
    if (!p || houses.some((h) => Math.hypot(h.x - p.x, h.z - p.z) < 6)) continue;
    const sc = R(0.7, 1.4);
    bushM.push(mx(p.x, gy(p.x, p.z) - 0.05, p.z, 0, R(0, 6.28), 0, sc, sc, sc));
  }
  scene.add(instanced(bushGeo, vcMat(), bushM, false));

  // ---------- Sawah ----------
  const ricePatterns = theme.rice.map((c) => canvasTexture(makeCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = c[0]; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { ctx.fillStyle = c[1]; ctx.fillRect(0, y, w, 3); ctx.fillStyle = c[2]; ctx.fillRect(0, y + 4, w, 1); }
  }), 8, 10));
  const fieldPlaced = [];
  for (let i = 0; i < 160 && fieldPlaced.length < theme.fields; i++) {
    const p = place(24, 90, 20);
    if (!p || fieldPlaced.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 48) || houses.some((h) => Math.hypot(h.x - p.x, h.z - p.z) < 22)) continue;
    if (spread(p.x, p.z, 26)[1] > 0.25) continue; // sawah hanya di dataran rendah
    fieldPlaced.push(p);
    const w = R(30, 44), d = R(40, 60);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: ricePatterns[(rnd() * 3) | 0] }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = R(0, Math.PI);
    m.position.set(p.x, -0.03 + fieldPlaced.length * 0.002, p.z);
    m.receiveShadow = true;
    scene.add(m);
    // pematang sawah (tepi tanah)
    const bund = new THREE.Mesh(new THREE.PlaneGeometry(w + 1.6, d + 1.6), new THREE.MeshLambertMaterial({ color: 0x9c8452 }));
    bund.rotation.x = -Math.PI / 2; bund.rotation.z = m.rotation.z;
    bund.position.set(p.x, -0.05 + fieldPlaced.length * 0.002, p.z);
    scene.add(bund);
  }

  // ---------- Pagar bambu ----------
  const railGeo = new THREE.BoxGeometry(0.09, 0.09, 4.05);
  const postGeo = new THREE.BoxGeometry(0.16, 1.15, 0.16);
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0xd2ab62 });
  const rails = [], posts = [];
  const q = new THREE.Quaternion(), pp = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (let s = 4; s < L - 4; s += 4) {
    const f = track.sample(s + 2, frame);
    const yaw = Math.atan2(f.tan.x, f.tan.z);
    const qr = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan(f.slope), yaw, 0, 'YXZ')); // palang ikut miring
    q.setFromEuler(new THREE.Euler(0, yaw, 0));
    for (const side of [-1, 1]) {
      pp.copy(f.pos).addScaledVector(f.right, side * (WALL_X + 0.05));
      const ey = track.groundAt(s + 2, WALL_X + 0.05);
      for (const h of [0.45, 0.9]) rails.push(new THREE.Matrix4().compose(new THREE.Vector3(pp.x, ey + h + 0.05, pp.z), qr, one));
      const f2 = track.sample(s, frame);
      const p2 = new THREE.Vector3().copy(f2.pos).addScaledVector(f2.right, side * (WALL_X + 0.05));
      posts.push(new THREE.Matrix4().compose(new THREE.Vector3(p2.x, track.groundAt(s, WALL_X + 0.05) + 0.57, p2.z), q, one));
    }
  }
  scene.add(instanced(railGeo, fenceMat, rails, false), instanced(postGeo, fenceMat, posts, false));

  // ---------- Umbul-umbul merah putih ----------
  const flagGeo = mergeParts([
    { g: new THREE.CylinderGeometry(0.05, 0.07, 6.5, 6), color: 0xb08a4a, m: mx(0, 3.25, 0) },
    { g: new THREE.BoxGeometry(0.06, 1.5, 0.75), color: 0xe5242b, m: mx(0, 5.6, 0.4) },
    { g: new THREE.BoxGeometry(0.06, 1.5, 0.75), color: 0xffffff, m: mx(0, 4.1, 0.4) },
  ]);
  const flagM = [];
  for (let s = 40; s < L - 30; s += 26) {
    const f = track.sample(s, frame);
    const side = ((s / 26) | 0) % 2 ? 1 : -1;
    const p = new THREE.Vector3().copy(f.pos).addScaledVector(f.right, side * (WALL_X + 1.6));
    flagM.push(mx(p.x, track.groundAt(s, WALL_X + 1.6), p.z, 0, Math.atan2(f.tan.x, f.tan.z) + (side > 0 ? Math.PI / 2 : -Math.PI / 2)));
  }
  if (theme.flags) scene.add(instanced(flagGeo, vcMat(), flagM, false));

  // ---------- Gunung & bukit di kejauhan ----------
  const mtnCenter = new THREE.Vector3(0, 0, -520);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + R(-0.1, 0.1);
    const dist = R(650, 950);
    const h = R(120, 300), r = h * R(1.0, 1.5);
    const far = dist > 800;
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), new THREE.MeshLambertMaterial({ color: far ? theme.mountains[1] : theme.mountains[0], flatShading: true }));
    m.position.set(mtnCenter.x + Math.cos(a) * dist, h / 2 - 2, mtnCenter.z + Math.sin(a) * dist);
    scene.add(m);
  }

  // ---------- Awan ----------
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
  const clouds = [];
  for (let i = 0; i < 22; i++) {
    const g = new THREE.Group();
    for (let j = 0; j < 5; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(R(14, 26), 8, 6), cloudMat);
      s.position.set(j * 18 - 36 + R(-6, 6), R(-4, 6), R(-8, 8)); s.scale.y = 0.55;
      g.add(s);
    }
    g.position.set(R(-700, 700), R(150, 260), R(-1300, 200));
    scene.add(g);
    clouds.push(g);
  }
  return { clouds };
}
