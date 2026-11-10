// TrackManager: geometri lintasan (garis tengah, tikungan) + mesh jalan, rintangan, gerbang.
import * as THREE from 'three';
import { RAMP, POTHOLE_R, PUDDLE_RX, PUDDLE_RZ } from './trackData.js';
import { ROAD_HALF, WALL_X } from './constants.js';

export function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}
export function canvasTexture(canvas, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 8;
  return t;
}
function noise(ctx, w, h, count, colors, size = 2) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}

export class TrackManager {
  constructor(def) {
    this.def = def;
    this.bridges = [];
    const pts = def.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    this.length = this.curve.getLength();
    const n = Math.floor(this.length);
    this.n = n;
    this.step = this.length / n;
    this.pos = []; this.tan = []; this.right = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const p = this.curve.getPointAt(u);
      const t = this.curve.getTangentAt(u).setY(0).normalize();
      this.pos.push(p); this.tan.push(t);
      this.right.push(new THREE.Vector3(-t.z, 0, t.x));
    }
    // Kelengkungan (kappa > 0 = belok kanan), dihaluskan
    const raw = [];
    for (let i = 0; i <= n; i++) {
      const a = this.tan[Math.max(0, i - 1)], b = this.tan[Math.min(n, i + 1)];
      raw.push(((b.x - a.x) * this.right[i].x + (b.z - a.z) * this.right[i].z) / (2 * this.step));
    }
    this.kappa = raw.map((_, i) => {
      let sum = 0, c = 0;
      for (let j = Math.max(0, i - 6); j <= Math.min(n, i + 6); j++) { sum += raw[j]; c++; }
      return sum / c;
    });
    // Zona tikungan tajam (|kappa| besar), digabung bila berdekatan
    this.sharpTurns = [];
    let cur = null;
    for (let i = 0; i <= n; i++) {
      const s0 = i * this.step;
      if (Math.abs(this.kappa[i]) > 0.018) {
        if (cur && s0 - cur.s1 < 25) cur.s1 = s0;
        else { cur = { s0, s1: s0, dir: Math.sign(this.kappa[i]) }; this.sharpTurns.push(cur); }
      }
    }
    this.sharpTurns = this.sharpTurns.filter((z) => z.s1 - z.s0 > 5);
    this.startS = def.startS;
    this.finishS = this.length - 40;
    this._f = { pos: new THREE.Vector3(), tan: new THREE.Vector3(), right: new THREE.Vector3(), kappa: 0, slope: 0 };
    this.computeHeights(); // profil tanjakan/turunan (dihitung ulang setelah jembatan diketahui)
  }

  bridgeAt(s, pad = 0) { return this.bridges.find((b) => s >= b.s0 - pad && s <= b.s1 + pad) || null; }

  sample(s, out = this._f) {
    const t = THREE.MathUtils.clamp(s / this.step, 0, this.n - 0.0001);
    const i = Math.floor(t), f = t - i;
    out.pos.lerpVectors(this.pos[i], this.pos[i + 1], f);
    out.tan.lerpVectors(this.tan[i], this.tan[i + 1], f).normalize();
    out.right.set(-out.tan.z, 0, out.tan.x);
    out.kappa = this.kappa[i] * (1 - f) + this.kappa[i + 1] * f;
    out.slope = this.slope[i] * (1 - f) + this.slope[i + 1] * f; // + = menanjak
    return out;
  }

  world(s, x, y, out) {
    const f = this.sample(s);
    out.copy(f.pos).addScaledVector(f.right, x);
    out.y = f.pos.y + y;
    return out;
  }

  distToRoad(x, z) {
    let best = 1e12;
    for (let i = 0; i <= this.n; i += 2) {
      const p = this.pos[i];
      const dx = p.x - x, dz = p.z - z;
      const d = dx * dx + dz * dz;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  // ---------- Mesh ----------
  ribbon(offL, offR, y, vScale, material, skipBridges = true) {
    const n = this.n;
    const positions = new Float32Array((n + 1) * 2 * 3);
    const normals = new Float32Array((n + 1) * 2 * 3);
    const uvs = new Float32Array((n + 1) * 2 * 2);
    for (let i = 0; i <= n; i++) {
      const p = this.pos[i], r = this.right[i];
      const k = i * 6;
      positions[k] = p.x + r.x * offL; positions[k + 1] = p.y + y; positions[k + 2] = p.z + r.z * offL;
      positions[k + 3] = p.x + r.x * offR; positions[k + 4] = p.y + y; positions[k + 5] = p.z + r.z * offR;
      normals[k + 1] = 1; normals[k + 4] = 1;
      const u = i * 4, v = (i * this.step) / vScale;
      uvs[u] = 0; uvs[u + 1] = v; uvs[u + 2] = 1; uvs[u + 3] = v;
    }
    const idx = [];
    for (let i = 0; i < n; i++) {
      if (skipBridges && this.bridges.some((br) => (i + 1) * this.step > br.s0 && i * this.step < br.s1)) continue;
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, material);
    m.receiveShadow = true;
    return m;
  }

  buildRoad(scene, theme) {
    this.computeHeights(); // jembatan sudah ditentukan -> lembah rata di sekitar jembatan
    const dirtRoad = theme.road === 'dirt';
    const asphalt = canvasTexture(makeCanvas(256, 256, (ctx, w, h) => {
      if (dirtRoad) {
        ctx.fillStyle = '#9b6f40'; ctx.fillRect(0, 0, w, h);
        noise(ctx, w, h, 3200, ['#a87c4a', '#8a6038', '#b58a56', '#7c5530'], 2);
        ctx.fillStyle = 'rgba(70,45,25,.35)';                         // bekas roda
        ctx.fillRect(w * 0.28, 0, 14, h); ctx.fillRect(w * 0.64, 0, 14, h);
        ctx.fillStyle = 'rgba(210,170,110,.35)'; ctx.fillRect(w * 0.46, 0, 10, h);
        return;
      }
      ctx.fillStyle = '#4d525b'; ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, 2500, ['#5a606a', '#43474f', '#666c76'], 2);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(7, 0, 7, h); ctx.fillRect(w - 14, 0, 7, h);       // garis tepi
      ctx.fillStyle = '#ffd21f';
      ctx.fillRect(w / 2 - 4, 0, 8, h / 2);                          // garis tengah putus-putus
    }));
    const road = this.ribbon(-ROAD_HALF, ROAD_HALF, 0.03, 8, new THREE.MeshLambertMaterial({
      map: asphalt, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    scene.add(road);

    const dirt = canvasTexture(makeCanvas(128, 128, (ctx, w, h) => {
      ctx.fillStyle = theme.shoulder; ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, 900, ['#8e7048', '#b99a6c', '#7d6240'], 2);
    }), 1, 1);
    const shoulderMat = new THREE.MeshLambertMaterial({ map: dirt, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    scene.add(this.ribbon(-ROAD_HALF - 2.2, -ROAD_HALF + 0.05, 0.015, 4, shoulderMat));
    scene.add(this.ribbon(ROAD_HALF - 0.05, ROAD_HALF + 2.2, 0.015, 4, shoulderMat));

    // Tanah/rumput dasar
    const grass = canvasTexture(makeCanvas(128, 128, (ctx, w, h) => {
      ctx.fillStyle = theme.ground.base; ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, 1400, theme.ground.noise, 2);
    }), 500, 500);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ map: grass }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.12, -500);
    ground.receiveShadow = true;
    scene.add(ground);
    this.buildTerrain(scene, theme);
  }

  // ---------- Garis start / finish & gerbang ----------
  stripe(s, kind) {
    const tex = canvasTexture(makeCanvas(256, 64, (ctx, w, h) => {
      if (kind === 'finish') {
        const cs = 16;
        for (let y = 0; y < h / cs; y++) for (let x = 0; x < w / cs; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#111' : '#fff'; ctx.fillRect(x * cs, y * cs, cs, cs);
        }
      } else { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2 - 0.6, 1.6), new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    const f = this.sample(s);
    m.position.copy(f.pos).setY(f.pos.y + 0.06);
    // rebahkan di jalan lalu putar mengikuti arah lintasan dan kemiringannya
    m.rotation.set(-Math.PI / 2, 0, 0);
    const wrap = new THREE.Group();
    wrap.position.copy(m.position); m.position.set(0, 0, 0);
    wrap.rotation.set(-Math.atan(f.slope), Math.atan2(f.tan.x, f.tan.z), 0, 'YXZ');
    wrap.add(m);
    return wrap;
  }

  arch(s, text, c1, c2, textColor = '#fff') {
    const g = new THREE.Group();
    const f = this.sample(s);
    const half = WALL_X + 0.4;
    const postMat = new THREE.MeshLambertMaterial({ color: c1 });
    for (const sd of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.8, 0.7), postMat);
      post.position.set(sd * half, 2.8, 0); post.castShadow = true; g.add(post);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), new THREE.MeshLambertMaterial({ color: c2 }));
      base.position.set(sd * half, -0.1, 0); g.add(base);
    }
    const tex = canvasTexture(makeCanvas(1024, 128, (ctx, w, h) => {
      const grd = ctx.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, '#' + new THREE.Color(c1).getHexString());
      grd.addColorStop(1, '#' + new THREE.Color(c2).getHexString());
      ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffd21f'; ctx.fillRect(0, 0, w, 8); ctx.fillRect(0, h - 8, w, 8);
      ctx.fillStyle = textColor; ctx.font = '900 84px "Trebuchet MS", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2 + 4);
    }));
    const banner = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 0.7, 1.7, 0.25), [
      new THREE.MeshLambertMaterial({ color: c1 }), new THREE.MeshLambertMaterial({ color: c1 }),
      new THREE.MeshLambertMaterial({ color: c1 }), new THREE.MeshLambertMaterial({ color: c1 }),
      new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshBasicMaterial({ map: tex }),
    ]);
    banner.position.set(0, 5.6, 0); banner.castShadow = true;
    g.add(banner);
    g.position.copy(f.pos);
    g.rotation.y = Math.atan2(f.tan.x, f.tan.z);
    return g;
  }

  // ---------- Rintangan ----------
  buildObstacles(scene, obstacles) {
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x1f1a17, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x6d5a44, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const puddleMat = new THREE.MeshPhongMaterial({ color: 0x5fb4ee, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });

    // Ramp: prisma segitiga (panjang searah +Z, naik ke ujung)
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(RAMP.len, RAMP.h); shape.lineTo(RAMP.len, 0); shape.lineTo(0, 0);
    const rampGeo = new THREE.ExtrudeGeometry(shape, { depth: RAMP.w, bevelEnabled: false });
    rampGeo.rotateY(-Math.PI / 2);
    rampGeo.translate(RAMP.w / 2, 0, 0);
    const rampMat = new THREE.MeshLambertMaterial({ color: 0xd98a3d });
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xffd21f });

    for (const o of obstacles) {
      const f = this.sample(o.s);
      const yaw = Math.atan2(f.tan.x, f.tan.z);
      const tilt = -Math.atan(f.slope);
      const p = new THREE.Vector3().copy(f.pos).addScaledVector(f.right, o.x);
      // grup rata dengan permukaan jalan (ikut kemiringan), objek di dalamnya digambar mendatar
      const place = (y) => { const grp = new THREE.Group(); grp.position.set(p.x, p.y + y, p.z); grp.rotation.set(tilt, yaw, 0, 'YXZ'); scene.add(grp); return grp; };
      if (o.t === 'pothole') {
        const rim = new THREE.Mesh(new THREE.CircleGeometry(POTHOLE_R * 1.25, 20), rimMat);
        const hole = new THREE.Mesh(new THREE.CircleGeometry(POTHOLE_R * 0.95, 20), holeMat);
        rim.rotation.x = -Math.PI / 2; hole.rotation.x = -Math.PI / 2; hole.position.y = 0.005;
        place(0.05).add(rim, hole);
      } else if (o.t === 'puddle') {
        const pd = new THREE.Mesh(new THREE.CircleGeometry(1, 24), puddleMat);
        pd.rotation.x = -Math.PI / 2;
        pd.scale.set(PUDDLE_RZ * 1.05, PUDDLE_RX * 1.05, 1); // elips memanjang searah jalan
        place(0.052).add(pd);
      } else if (o.t === 'ramp') {
        const r = new THREE.Mesh(rampGeo, rampMat);
        r.castShadow = true; r.receiveShadow = true;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(RAMP.w, 0.08, 0.5), stripeMat);
        strip.position.set(0, RAMP.h - 0.02, RAMP.len - 0.3);
        place(0.03).add(r, strip);
      }
    }
  }
}

// ---------- Tambahan Tahap 2: jembatan sempit & rambu tikungan ----------
TrackManager.prototype.buildBridges = function buildBridges(scene) {
  const waterTex = canvasTexture(makeCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4aa8e0'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(Math.random() * w, Math.random() * h, 14 + Math.random() * 18, 2); }
  }));
  const waterMat = new THREE.MeshPhongMaterial({ map: waterTex, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.92 });
  const plankTex = canvasTexture(makeCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#b07a43'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { ctx.fillStyle = '#7d5128'; ctx.fillRect(0, y, w, 2); }
    for (let i = 0; i < 160; i++) { ctx.fillStyle = 'rgba(90,50,20,.25)'; ctx.fillRect(Math.random() * w, Math.random() * h, 10, 1); }
  }));
  const deckMat = new THREE.MeshLambertMaterial({ map: plankTex });
  const railMat = new THREE.MeshLambertMaterial({ color: 0xd9b36a });
  const f = { pos: new THREE.Vector3(), tan: new THREE.Vector3(), right: new THREE.Vector3(), kappa: 0 };

  for (const b of this.bridges) {
    // air sungai: pita lebar di sepanjang jembatan
    const water = new THREE.Mesh(new THREE.BufferGeometry(), waterMat);
    const i0 = Math.floor(b.s0 / this.step), i1 = Math.ceil(b.s1 / this.step);
    const pos = [], uv = [], idx = [];
    for (let i = i0; i <= i1; i++) {
      const p = this.pos[i], r = this.right[i];
      pos.push(p.x - r.x * 26, p.y - 0.02, p.z - r.z * 26, p.x + r.x * 26, p.y - 0.02, p.z + r.z * 26);
      uv.push(0, i * this.step / 10, 5, i * this.step / 10);
    }
    for (let i = 0; i < i1 - i0; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    water.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    water.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    water.geometry.setIndex(idx); water.geometry.computeVertexNormals();
    scene.add(water);

    // dek papan
    const len = b.s1 - b.s0, mid = (b.s0 + b.s1) / 2;
    const g = new THREE.Group();
    const fr = this.sample(mid, f);
    g.position.copy(fr.pos); g.rotation.y = Math.atan2(fr.tan.x, fr.tan.z);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(b.half * 2 + 0.5, 0.3, len + 2), deckMat);
    deck.position.y = -0.12; deck.receiveShadow = true; deck.castShadow = true;
    deckMat.map.repeat.set(1, len / 3);
    g.add(deck);
    for (const sd of [-1, 1]) {
      for (const h of [0.3]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, len + 2), railMat);
        rail.position.set(sd * (b.half + 0.15), h, 0); rail.castShadow = true; g.add(rail);
      }
      for (let z = -len / 2; z <= len / 2 + 0.1; z += 4) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), railMat);
        post.position.set(sd * (b.half + 0.15), 0.25, z); post.castShadow = true; g.add(post);
      }
    }
    scene.add(g);
    // rambu peringatan sebelum jembatan
    scene.add(this.signBoard(b.s0 - 28, 'JEMBATAN SEMPIT', '#ffd21f', '#111'));
  }
};

TrackManager.prototype.signBoard = function signBoard(s, text, bg, fg, side = 1) {
  const tex = canvasTexture(makeCanvas(512, 192, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg; ctx.lineWidth = 12; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = fg; ctx.font = '900 62px "Trebuchet MS", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚠', w / 2, 56);
    ctx.font = '900 46px "Trebuchet MS", Arial, sans-serif';
    ctx.fillText(text, w / 2, 134);
  }));
  const g = new THREE.Group();
  const f = this.sample(s);
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.05, 0.08), [
    new THREE.MeshLambertMaterial({ color: 0x555555 }), new THREE.MeshLambertMaterial({ color: 0x555555 }),
    new THREE.MeshLambertMaterial({ color: 0x555555 }), new THREE.MeshLambertMaterial({ color: 0x555555 }),
    new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshLambertMaterial({ color: 0xcccccc }),
  ]);
  board.position.y = 2.2; board.castShadow = true;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), new THREE.MeshLambertMaterial({ color: 0x777777 }));
  post.position.y = 1.2;
  g.add(board, post);
  g.position.copy(f.pos).addScaledVector(f.right, side * (WALL_X + 1.3));
  g.position.y = this.groundAt(s, WALL_X + 1.3);
  g.rotation.y = Math.atan2(-f.tan.x, -f.tan.z) + side * -0.25; // menghadap pengendara yang datang
  return g;
};

TrackManager.prototype.buildSharpTurnSigns = function buildSharpTurnSigns(scene) {
  const chev = (dir) => canvasTexture(makeCanvas(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffd21f'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const ox of [-34, 34]) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + ox - dir * 22, 24); ctx.lineTo(w / 2 + ox + dir * 22, h / 2); ctx.lineTo(w / 2 + ox - dir * 22, h - 24);
      ctx.stroke();
    }
  }));
  const f = { pos: new THREE.Vector3(), tan: new THREE.Vector3(), right: new THREE.Vector3(), kappa: 0 };
  for (const z of this.sharpTurns) {
    const tex = chev(z.dir);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const back = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const outer = -z.dir; // sisi luar tikungan
    for (let s = z.s0 - 6; s <= z.s1 + 4; s += 7) {
      this.sample(s, f);
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 0.08), [back, back, back, back, mat, back]);
      b.position.y = 1.7; b.castShadow = true;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), back); post.position.y = 0.9;
      g.add(b, post);
      g.position.copy(f.pos).addScaledVector(f.right, outer * (WALL_X + 1.1));
      g.position.y = this.groundAt(s, WALL_X + 1.1);
      // menghadap ke tengah jalan, agak condong ke arah datangnya pengendara
      const toCenter = new THREE.Vector3().copy(f.right).multiplyScalar(-outer).addScaledVector(f.tan, -0.55).normalize();
      g.rotation.y = Math.atan2(toCenter.x, toCenter.z);
      scene.add(g);
    }
    scene.add(this.signBoard(z.s0 - 30, 'TIKUNGAN TAJAM', '#ffd21f', '#111', 1));
  }
};

// ================= Tahap 6: tanjakan, turunan & medan bukit =================
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Interpolasi PCHIP: halus, tanpa overshoot (bukit tidak "menembus" di bawah 0 / melebihi puncaknya)
function pchip(xs, ys) {
  const n = xs.length, h = [], del = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; del[i] = (ys[i + 1] - ys[i]) / h[i]; }
  for (let i = 1; i < n - 1; i++) {
    if (del[i - 1] * del[i] > 0) { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / del[i - 1] + w2 / del[i]); }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}

// Profil ketinggian jalan H[i] dari def.hills = [[pecahan panjang, tinggi m], ...]
TrackManager.prototype.computeHeights = function computeHeights() {
  const n = this.n, step = this.step, L = this.length, hills = this.def.hills;
  const H = new Float32Array(n + 1);
  if (hills && hills.length > 1) {
    const f = pchip(hills.map((a) => a[0] * L), hills.map((a) => a[1]));
    for (let i = 0; i <= n; i++) H[i] = Math.max(0, f(i * step));
  }
  const bs = this.bridges || [];
  const distToBridge = (s) => { let d = 1e9; for (const b of bs) d = Math.min(d, s < b.s0 ? b.s0 - s : s > b.s1 ? s - b.s1 : 0); return d; };
  if (bs.length) for (let i = 0; i <= n; i++) if (distToBridge(i * step) <= 6) H[i] = 0; // jembatan = dasar lembah
  // batasi kemiringan maksimum (kerucut Lipschitz): tanjakan tak pernah lebih curam dari maxGrade
  const M = (this.def.maxGrade ?? 0.085) * step;
  for (let i = 1; i <= n; i++) H[i] = Math.min(H[i], H[i - 1] + M);
  for (let i = n - 1; i >= 0; i--) H[i] = Math.min(H[i], H[i + 1] + M);
  // haluskan sudut-sudutnya
  for (let pass = 0; pass < 2; pass++) {
    const src = Float32Array.from(H);
    for (let i = 0; i <= n; i++) {
      let sum = 0, c = 0;
      for (let j = Math.max(0, i - 8); j <= Math.min(n, i + 8); j++) { sum += src[j]; c++; }
      H[i] = sum / c;
    }
  }
  if (bs.length) for (let i = 0; i <= n; i++) H[i] *= sstep(0, 14, distToBridge(i * step)); // lantai jembatan tepat rata
  this.H = H;
  this.slope = new Float32Array(n + 1);
  let hmax = 0, gmax = 0;
  for (let i = 0; i <= n; i++) {
    const a = Math.max(0, i - 3), b = Math.min(n, i + 3);
    this.slope[i] = (H[b] - H[a]) / ((b - a) * step);
    this.pos[i].y = H[i];
    hmax = Math.max(hmax, H[i]); gmax = Math.max(gmax, Math.abs(this.slope[i]));
  }
  this.hmax = hmax; this.gradeMax = gmax;
  this._grid = null;
};

// Tinggi permukaan tanah pada jarak samping d dari garis tengah jalan (bukit mengecil menjauhi jalan)
TrackManager.prototype.terrainY = function terrainY(d, Hn, sl) {
  const Wf = 20 + 2.2 * Hn;
  const t = Math.min(1, Math.max(0, (d - 6.6) / Wf));
  const fall = 1 - t * t * (3 - 2 * t);
  const dep = (0.08 + Math.min(0.42, Math.abs(sl) * 8)) * (1 - sstep(6.6, 11, d)); // sedikit di bawah jalan agar tak menembus
  return Math.max(-0.06, Hn * fall - dep);
};

TrackManager.prototype.groundAt = function groundAt(s, d) {
  const i = Math.min(this.n, Math.max(0, Math.round(s / this.step)));
  return this.terrainY(d, this.H[i], this.slope[i]);
};

const GC = 16;
const gkey = (cx, cz) => (cx + 1024) * 2048 + (cz + 1024);
TrackManager.prototype._ensureIndex = function _ensureIndex() {
  if (this._grid) return;
  const g = new Map();
  for (let i = 0; i <= this.n; i++) {
    const p = this.pos[i], k = gkey(Math.floor(p.x / GC), Math.floor(p.z / GC));
    let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(i);
  }
  this._grid = g;
};

// titik jalan terdekat (pencarian cincin per sel, berhenti dini)
TrackManager.prototype.nearest = function nearest(x, z, maxD = 110) {
  this._ensureIndex();
  const cx = Math.floor(x / GC), cz = Math.floor(z / GC), maxR = Math.ceil(maxD / GC);
  let best = 1e18, bi = -1;
  for (let r = 0; r <= maxR; r++) {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const a = this._grid.get(gkey(cx + dx, cz + dz)); if (!a) continue;
      for (const i of a) { const p = this.pos[i], ex = p.x - x, ez = p.z - z, d = ex * ex + ez * ez; if (d < best) { best = d; bi = i; } }
    }
    if (bi >= 0 && Math.sqrt(best) <= r * GC) break;
  }
  return bi < 0 ? null : { d: Math.sqrt(best), i: bi };
};

TrackManager.prototype.groundY = function groundY(x, z) {
  const q = this.nearest(x, z, 110);
  return q ? this.terrainY(q.d, this.H[q.i], this.slope[q.i]) : -0.06;
};

// Medan: jaring segitiga yang hanya menutupi koridor di sekitar jalan
TrackManager.prototype.buildTerrain = function buildTerrain(scene, theme) {
  if (!(this.hmax > 0.3)) return; // lintasan datar: tanah rata seperti sebelumnya
  this._ensureIndex();
  const G = 4, Dcut = 6.6 + 20 + 2.2 * this.hmax + 6;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const p of this.pos) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  x0 = Math.floor((x0 - Dcut) / G) * G; z0 = Math.floor((z0 - Dcut) / G) * G;
  const nx = Math.ceil((x1 + Dcut - x0) / G) + 1, nz = Math.ceil((z1 + Dcut - z0) / G) + 1;
  // sel kasar dekat jalan (untuk melewati area kosong dengan cepat)
  const rm = Math.ceil(Dcut / GC), near = new Set();
  for (const k of this._grid.keys()) {
    const cz = (k % 2048) - 1024, cx = Math.floor(k / 2048) - 1024;
    for (let dx = -rm; dx <= rm; dx++) for (let dz = -rm; dz <= rm; dz++) near.add(gkey(cx + dx, cz + dz));
  }
  const hv = new Float32Array(nx * nz).fill(-0.06), tint = new Float32Array(nx * nz), active = new Uint8Array(nx * nz);
  for (let gx = 0; gx < nx; gx++) for (let gz = 0; gz < nz; gz++) {
    const x = x0 + gx * G, z = z0 + gz * G;
    if (!near.has(gkey(Math.floor(x / GC), Math.floor(z / GC)))) continue;
    const q = this.nearest(x, z, Dcut); if (!q) continue;
    const id = gx * nz + gz, Hn = this.H[q.i];
    const y = this.terrainY(q.d, Hn, this.slope[q.i]);
    hv[id] = y; active[id] = 1;
    tint[id] = sstep(2, 26, y); // makin tinggi makin berbatu
  }
  const vid = new Int32Array(nx * nz).fill(-1);
  const pos = [], uv = [], col = [], idx = [];
  const rock = new THREE.Color(theme.road === 'dirt' ? 0xb59a72 : 0xa89a80);
  const vert = (gx, gz) => {
    const id = gx * nz + gz;
    if (vid[id] < 0) {
      vid[id] = pos.length / 3;
      const x = x0 + gx * G, z = z0 + gz * G;
      pos.push(x, hv[id], z); uv.push(x / 10, z / 10);
      const k = tint[id] * 0.55;
      col.push(1 + (rock.r - 1) * k, 1 + (rock.g - 1) * k, 1 + (rock.b - 1) * k);
    }
    return vid[id];
  };
  for (let gx = 0; gx < nx - 1; gx++) for (let gz = 0; gz < nz - 1; gz++) {
    if (!(active[gx * nz + gz] || active[(gx + 1) * nz + gz] || active[gx * nz + gz + 1] || active[(gx + 1) * nz + gz + 1])) continue;
    const a = vert(gx, gz), b = vert(gx + 1, gz), c = vert(gx, gz + 1), d = vert(gx + 1, gz + 1);
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const tex = canvasTexture(makeCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = theme.ground.base; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 1400, theme.ground.noise, 2);
  }), 1, 1);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, vertexColors: true }));
  mesh.receiveShadow = true;
  scene.add(mesh);
  this.terrainMesh = mesh;
};

// Rambu tanjakan / turunan di awal bagian yang curam
TrackManager.prototype.buildSlopeSigns = function buildSlopeSigns(scene) {
  let i = 0; const n = this.n;
  while (i < n) {
    const sg = Math.abs(this.slope[i]) > 0.045 ? Math.sign(this.slope[i]) : 0;
    if (!sg) { i++; continue; }
    let j = i; while (j < n && Math.sign(this.slope[j]) === sg && Math.abs(this.slope[j]) > 0.035) j++;
    const s0 = i * this.step;
    if ((j - i) * this.step > 35 && s0 > 60) {
      scene.add(this.signBoard(s0 - 30, sg > 0 ? 'TANJAKAN' : 'TURUNAN CURAM', sg > 0 ? '#ffd21f' : '#ff9a3c', '#111', sg > 0 ? -1 : 1));
    }
    i = j + 20;
  }
};
