// Model 3D low-poly: pembalap cilik berhelm di atas sepeda BMX (dibuat dari primitif Three.js)
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
const tubeGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const taperGeo = new THREE.CylinderGeometry(1, 0.74, 1, 10);   // lebar di ujung atas (b), mengecil ke bawah (a)
const ballGeo = new THREE.SphereGeometry(1, 14, 10);
const SKINS = [0xc68a5a, 0xa8714a, 0x8d5a3a, 0xd9a577, 0xb5794f];
const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

function between(mesh, a, b, r) {
  _d.subVectors(b, a);
  const len = _d.length();
  mesh.position.copy(a).addScaledVector(_d, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, _d.normalize());
  mesh.scale.set(r, len, r);
}

export function makeNameTag(text, color = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(10,20,50,0.72)';
  ctx.beginPath(); ctx.roundRect(8, 8, 240, 48, 24); ctx.fill();
  ctx.fillStyle = color; ctx.font = '800 34px "Trebuchet MS", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, fog: false }));
  sp.scale.set(1.5, 0.375, 1);
  sp.renderOrder = 20;
  return sp;
}

export function createBike(o = {}) {
  const root = new THREE.Group();
  root.rotation.order = 'YXZ'; // putar arah dulu, lalu miring mengikuti tanjakan // posisi + arah (yaw)
  const rig = new THREE.Group();  // kemiringan (lean)
  root.add(rig);

  const frameMat = lam(o.frame ?? 0xff8a1f);
  const dark = lam(0x1b1b22), chrome = lam(0xd5dbe5);
  const skin = lam(0xc68a5a), jersey = lam(o.jersey ?? 0x1e6bff), shorts = lam(0x1c2a4a);
  const helmetMat = lam(o.helmet ?? 0x1e6bff), white = lam(0xffffff), shoe = lam(0xffd21f);

  const add = (m, parent = rig) => { m.castShadow = true; parent.add(m); return m; };
  const tube = (a, b, r, mat, parent = rig) => { const m = new THREE.Mesh(tubeGeo, mat); between(m, a, b, r); return add(m, parent); };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // --- rangka ---
  const bb = V(0, 0.36, -0.08), seat = V(0, 0.76, -0.24), head = V(0, 0.82, 0.38);
  const ws = o.ws ?? 1;                        // skala roda (sepeda lipat lebih kecil)
  const axleY = 0.03 + 0.3 * ws;
  const rearAx = V(0, axleY, -0.56);
  tube(bb, seat, 0.025, frameMat);
  tube(head, seat.clone().setY(0.74), 0.025, frameMat);
  tube(head.clone().setY(0.78), bb, 0.03, frameMat);
  tube(bb, rearAx, 0.02, frameMat);
  tube(seat, rearAx, 0.02, frameMat);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.24), dark)).position.set(0, 0.8, -0.26);

  // --- roda ---
  const makeWheel = () => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.3 - (o.tire ?? 0.05) * 0.2, o.tire ?? 0.05, 8, 22).rotateY(Math.PI / 2), dark);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.012, 6, 22).rotateY(Math.PI / 2), chrome);
    w.add(tire, rim);
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.5, 0.012), chrome);
      sp.rotation.x = (i / 3) * Math.PI; w.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), frameMat); w.add(hub);
    w.scale.setScalar(ws);
    w.traverse((n) => { if (n.isMesh) n.castShadow = true; });
    return w;
  };
  const wheelR = makeWheel(); wheelR.position.copy(rearAx); rig.add(wheelR);

  // --- garpu depan + setang (berputar saat belok) ---
  const steer = new THREE.Group();
  steer.position.copy(head); rig.add(steer);
  const frontAx = V(0, axleY - head.y, 0.17);
  tube(V(0, 0, 0), frontAx, 0.022, chrome, steer);
  const wheelF = makeWheel(); wheelF.position.copy(frontAx); steer.add(wheelF);
  // setang menurut jenis: 'bmx' (lebar + plat nomor), 'flat' (MTB), 'drop' (balap), 'upright' (ontel/lipat)
  const bars = o.bars ?? 'bmx';
  let gripLocal = V(0.26, 0.2, -0.04);
  if (bars === 'drop') {
    tube(V(0, 0, 0), V(0, 0.16, -0.05), 0.02, dark, steer);
    for (const sx of [-1, 1]) {
      tube(V(sx * 0.19, 0.16, -0.05), V(sx * 0.19, 0.16, 0.08), 0.02, dark, steer);
      tube(V(sx * 0.19, 0.16, 0.08), V(sx * 0.19, 0.07, 0.14), 0.02, dark, steer);
    }
    tube(V(-0.19, 0.16, -0.05), V(0.19, 0.16, -0.05), 0.022, dark, steer);
    gripLocal = V(0.19, 0.12, 0.1);
  } else if (bars === 'upright') {
    const top = o.stemH ?? 0.34;
    tube(V(0, 0, 0), V(0, top, -0.08), 0.02, chrome, steer);
    tube(V(-0.3, top, -0.14), V(0.3, top, -0.14), 0.022, chrome, steer);
    for (const sx of [-1, 1]) tube(V(sx * 0.3, top, -0.14), V(sx * 0.25, top - 0.02, -0.3), 0.02, chrome, steer);
    gripLocal = V(0.25, top - 0.02, -0.3);
  } else {
    tube(V(0, 0, 0), V(0, 0.2, -0.04), 0.02, dark, steer);
    const half = bars === 'flat' ? 0.27 : 0.3;
    tube(V(-half, 0.2, -0.04), V(half, 0.2, -0.04), 0.022, dark, steer);
    gripLocal = V(half - 0.04, 0.2, -0.04);
  }
  if (o.plate ?? bars === 'bmx') {
    const plate = add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.02), white), steer);
    plate.position.set(0, 0.22, 0.02);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.025), lam(o.frame ?? 0xff8a1f)), steer).position.set(0, 0.22, 0.032);
  }
  if (o.fork) { // suspensi depan (MTB): tabung tebal di atas garpu
    tube(V(0, -0.02, 0), V(0, -0.27, 0.08), 0.042, dark, steer);
  }
  if (o.basket) { // keranjang rotan di depan (ontel)
    const wicker = lam(0x9a7440), rim = lam(0x6f5026);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.24), wicker), steer).position.set(0, -0.11, 0.2);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.025, 0.27), rim), steer).position.set(0, -0.03, 0.2);
  }
  if (o.rack) { // bagasi belakang
    add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.32), dark)).position.set(0, axleY + 0.34, -0.6);
    tube(V(0, axleY + 0.34, -0.5), V(0, 0.74, -0.26), 0.012, dark);
  }
  if (o.hinge) { // engsel sepeda lipat
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), chrome); h.position.set(0, 0.8, 0.07); add(h);
  }

  // --- pedal ---
  const crank = new THREE.Group(); crank.position.copy(bb); rig.add(crank);

  // --- pembalap (proporsi remaja, tungkai & lengan dua ruas dengan lutut/siku) ---
  const skinC = o.skin ?? SKINS[0];
  const skinM = lam(skinC), sockM = lam(0xf4f4f4), gloveM = lam(0x23252b), glassM = new THREE.MeshLambertMaterial({ color: 0x141c28 });
  const shoeM = lam(o.shoe ?? 0xf2f2f2), soleM = lam(0x1d1d22), shortsM = lam(0x14161c);
  const sleeveM = lam(o.jersey ?? 0x1e6bff);
  const ball = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = rig) => {
    const m = new THREE.Mesh(ballGeo, mat); m.scale.set(r * sx, r * sy, r * sz); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  };
  const seg = (mat) => { const m = new THREE.Mesh(taperGeo, mat); m.castShadow = true; rig.add(m); return m; };

  const hip = V(0, 0.86, -0.22), shoulder = V(0, 1.31, 0.1);
  // badan: lebih lebar di bahu, ramping di pinggang
  const torso = new THREE.Mesh(taperGeo, jersey); between(torso, hip, shoulder, 0.15); torso.scale.x *= 1.18; torso.scale.z *= 0.78; torso.castShadow = true; rig.add(torso);
  ball(0.13, jersey, 0, 1.2, 0.04, 1.2, 0.9, 0.8);          // dada / perut sedikit membulat
  const bib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), lam(o.jerseyAlt ?? 0xffffff)); bib.position.set(0, 1.12, -0.095); bib.rotation.x = 0.88; rig.add(bib); // garis jersey di punggung
  ball(0.17, shortsM, 0, 0.86, -0.22, 1.15, 0.85, 1.1);       // celana pendek + area duduk
  ball(0.075, sleeveM, -0.17, 1.3, 0.1); ball(0.075, sleeveM, 0.17, 1.3, 0.1);  // bahu
  // leher + kepala (lonjong, ada telinga & hidung), kacamata, helm aero
  const neck = new THREE.Mesh(taperGeo, skinM); between(neck, V(0, 1.4, 0.15), V(0, 1.48, 0.2), 0.05); rig.add(neck);
  ball(0.112, skinM, 0, 1.57, 0.21, 1, 1.12, 1.04);
  ball(0.022, skinM, -0.112, 1.56, 0.2, 0.6, 1.4, 1); ball(0.022, skinM, 0.112, 1.56, 0.2, 0.6, 1.4, 1);   // telinga
  ball(0.024, skinM, 0, 1.54, 0.318, 1, 1.1, 1.2);                                                          // hidung
  const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.05, 0.045), glassM); glasses.position.set(0, 1.585, 0.305); rig.add(glasses);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.13), glassM); arm.position.set(sx * 0.103, 1.585, 0.24); rig.add(arm); }
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 11, 0, Math.PI * 2, 0, Math.PI * 0.6), helmetMat);
  helmet.scale.set(1, 0.98, 1.28); helmet.position.set(0, 1.585, 0.15); helmet.rotation.x = 0.16; helmet.castShadow = true; rig.add(helmet);
  for (const vx of [-0.055, 0, 0.055]) { const vent = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.12), glassM); vent.position.set(vx, 1.722, 0.15); vent.rotation.x = 0.14; rig.add(vent); }
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.016, 0.07), helmetMat); brim.position.set(0, 1.652, 0.3); brim.rotation.x = -0.25; rig.add(brim);
  for (const sx of [-1, 1]) { // tali dagu
    const st = new THREE.Mesh(tubeGeo, glassM); between(st, V(sx * 0.105, 1.55, 0.17), V(sx * 0.04, 1.47, 0.27), 0.007); rig.add(st);
  }

  const legs = [], arms = [];
  for (const sx of [-1, 1]) {
    const thigh = seg(shortsM), shin = seg(skinM), sock = seg(sockM);
    const knee = ball(0.058, skinM, 0, 0, 0);
    const foot = new THREE.Group(); rig.add(foot);
    const shoeBody = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.06, 0.23), shoeM); shoeBody.position.set(0, 0, 0.05); shoeBody.castShadow = true; foot.add(shoeBody);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.24), soleM); sole.position.set(0, -0.04, 0.05); foot.add(sole);
    legs.push({ thigh, shin, sock, knee, foot, side: sx });
    const upper = seg(sleeveM), fore = seg(skinM);
    const elbow = ball(0.045, skinM, 0, 0, 0);
    const hand = ball(0.056, gloveM, 0, 0, 0, 1, 0.9, 1.1);
    arms.push({ upper, fore, elbow, hand, side: sx });
  }

  // --- animasi ---
  let crankAngle = 0, wheelAngle = 0;
  const hipL = new THREE.Vector3(), pedal = new THREE.Vector3(), sh = new THREE.Vector3(), grip = new THREE.Vector3(), mid = new THREE.Vector3(), hint = new THREE.Vector3();
  const _a = new THREE.Vector3(), _p = new THREE.Vector3();
  // IK dua ruas: titik sendi antara pangkal A dan ujung B (panjang l1, l2), menekuk ke arah 'hint'
  function joint(A, B, l1, l2, hintDir, out) {
    _a.subVectors(B, A);
    const d = Math.min(Math.max(_a.length(), 0.05), l1 + l2 - 0.002);
    _a.normalize();
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(l1 * l1 - x * x, 0));
    _p.copy(hintDir).addScaledVector(_a, -hintDir.dot(_a)).normalize();
    return out.copy(A).addScaledVector(_a, x).addScaledVector(_p, h);
  }

  let bob = 0;
  function update(dt, speed, steerInput, airborne) {
    wheelAngle += (speed * dt) / 0.34;
    wheelR.rotation.x = wheelAngle; wheelF.rotation.x = wheelAngle;
    if (!airborne) crankAngle += speed * dt * 1.5;
    steer.rotation.y = -steerInput * 0.3;
    rig.rotation.z = steerInput * 0.2 * Math.min(1, speed / 6);

    for (const lg of legs) {
      const a = crankAngle + (lg.side > 0 ? Math.PI : 0);
      pedal.set(lg.side * 0.2, bb.y + Math.sin(a) * 0.17, bb.z + Math.cos(a) * 0.17);
      hipL.set(lg.side * 0.1, hip.y + 0.02, hip.z);
      hint.set(lg.side * 0.18, 0.1, 1);                                  // lutut menekuk ke depan, sedikit keluar
      joint(hipL, pedal, 0.38, 0.37, hint, mid);
      between(lg.thigh, mid, hipL, 0.078);
      between(lg.shin, pedal, mid, 0.062); lg.shin.scale.x = lg.shin.scale.z = 0.062;
      _a.copy(pedal).lerp(mid, 0.18); between(lg.sock, pedal, _a, 0.05);  // kaus kaki di atas pergelangan
      lg.knee.position.copy(mid);
      lg.foot.position.copy(pedal).add(_p.set(0, -0.015, 0.03));
      lg.foot.rotation.x = -0.08 + Math.sin(a) * 0.1;                      // telapak mengikuti putaran pedal
    }
    for (const ar of arms) {
      sh.set(ar.side * 0.17, shoulder.y - 0.02, shoulder.z);
      steer.localToWorld(grip.set(ar.side * gripLocal.x, gripLocal.y, gripLocal.z)); rig.worldToLocal(grip);
      hint.set(ar.side * 0.9, -0.5, -0.2);                               // siku keluar dan ke bawah
      joint(sh, grip, 0.28, 0.27, hint, mid);
      between(ar.upper, mid, sh, 0.058);
      between(ar.fore, grip, mid, 0.044); ar.fore.scale.x = ar.fore.scale.z = 0.044;
      ar.elbow.position.copy(mid);
      ar.hand.position.copy(grip);
    }
  }
  update(0, 0, 0, false);

  return { root, rig, update };
}
