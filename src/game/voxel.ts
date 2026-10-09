import * as THREE from 'three';

// ---------- shared geometry ----------
export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const SPH = new THREE.SphereGeometry(1, 18, 14);
export const RING = new THREE.RingGeometry(0.8, 1, 48); RING.rotateX(-Math.PI / 2);
export const DISC = new THREE.CircleGeometry(1, 24); DISC.rotateX(-Math.PI / 2);
const LID_GEO = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const FLAME_GEO = new THREE.ConeGeometry(0.5, 1, 6).translate(0, 0.5, 0);

/** Dark inverted-hull material: gives toon characters their signature thick outline. */
export const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x1b1030, side: THREE.BackSide });

// ---------- basic builders ----------
export function mat(color: number, emissive = 0, rough = 0.8) { return new THREE.MeshStandardMaterial({ color, roughness: rough, emissive, emissiveIntensity: 0.7 }); }
export function mkBox(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, emissive = 0) {
  const m = new THREE.Mesh(BOX, mat(color, emissive)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
export function mkCyl(rt: number, rb: number, h: number, color: number, x = 0, y = 0, z = 0, seg = 8, emissive = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, emissive)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
export function mkSphere(r: number, color: number, x = 0, y = 0, z = 0, emissive = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(color, emissive, 0.5)); m.position.set(x, y, z); m.castShadow = true; return m;
}

// ---------- fire ----------
/** A proper layered flame (red → orange → yellow cones + side tongues). Flicker it with flickerFlame(). */
export function makeFlame(size = 1) {
  const g = new THREE.Group(); g.name = 'flame';
  const layers: [number, number, number, number][] = [[0.95, 1.25, 0xff4a14, 0.92], [0.66, 1.0, 0xff9a1f, 0.95], [0.36, 0.68, 0xffe27a, 1]];
  layers.forEach(([r, h, c, o], i) => {
    const m = new THREE.Mesh(FLAME_GEO, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false }));
    m.scale.set(r * size, h * size, r * size); m.userData.base = [r * size, h * size]; m.userData.i = i; m.rotation.y = i * 0.7; g.add(m);
  });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(FLAME_GEO, new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.9, depthWrite: false }));
    m.scale.set(0.32 * size, 0.7 * size, 0.32 * size); m.position.set(s * 0.3 * size, 0, 0); m.rotation.z = -s * 0.35;
    m.userData.base = [0.32 * size, 0.7 * size]; m.userData.i = s > 0 ? 4 : 3; g.add(m);
  }
  return g;
}
export function flickerFlame(g: THREE.Object3D, t: number, k = 1) {
  for (const c of g.children) {
    const b = c.userData.base as [number, number] | undefined; if (!b) continue; const i = c.userData.i as number;
    const w = 1 + Math.sin(t * 23 + i * 2.3) * 0.1 + Math.sin(t * 37 + i * 1.1) * 0.06;
    const h = 1 + Math.sin(t * 17 + i * 1.7) * 0.2 + Math.sin(t * 41 + i * 0.6) * 0.1;
    c.scale.set(b[0] * w * k, b[1] * h * k, b[0] * w * k);
  }
}

/** Star-burst muzzle flash. Hidden at scale 0; the game "kicks" it by setting a uniform scale and decays it. */
export function makeBlast(size = 1, core = 0xfff3b0, mid = 0xffa11f, outer = 0xff5a1a, dir: 'y' | 'z' = 'z') {
  const root = new THREE.Group(); const g = new THREE.Group(); root.add(g);
  const bm = (c: number) => new THREE.MeshBasicMaterial({ color: c });
  const c0 = new THREE.Mesh(SPH, bm(core)); c0.scale.setScalar(0.2 * size); g.add(c0);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Group(); p.rotation.y = (i / n) * Math.PI * 2;
    const sp = new THREE.Mesh(FLAME_GEO, bm(i % 2 ? mid : outer)); sp.rotation.x = i === 0 ? 0 : 0.6;
    sp.scale.set(0.17 * size, (i === 0 ? 1.15 : 0.62 + 0.18 * (i % 3)) * size, 0.17 * size); p.add(sp); g.add(p);
  }
  const shell = new THREE.Mesh(FLAME_GEO, new THREE.MeshBasicMaterial({ color: mid, transparent: true, opacity: 0.55, depthWrite: false }));
  shell.scale.set(0.55 * size, 0.95 * size, 0.55 * size); g.add(shell);
  if (dir === 'z') g.rotation.x = Math.PI / 2;
  root.scale.setScalar(0);
  return root;
}

// ---------- cartoon face ----------
export interface FaceBody { kind?: 'sphere' | 'cyl'; R: number; cy: number; sy?: number; y0: number }
export interface FaceOpts { r?: number; gap?: number; iris?: number; skin: number; mouth?: 'smile' | 'grin' | 'none'; mouthY?: number; cheeks?: boolean; round?: boolean; bias?: number; body?: FaceBody; brows?: number }
interface EyeRef { eye: THREE.Group; pupil: THREE.Group; pivot: THREE.Group; lid: THREE.Mesh; side: number }

/** Big glossy eyes (outlined sclera, iris, pupil, 2 highlights, eyelids), cheeks, mouth and a sweat drop. */
export function makeFace(o: FaceOpts): THREE.Group {
  const r = o.r ?? 0.12, gap = o.gap ?? 0.15; const g = new THREE.Group(); g.name = 'face';
  const b = o.body;
  const surf = (x: number, y: number) => {
    if (!b) return 0;
    const dy = b.kind === 'cyl' ? 0 : (b.y0 + y - b.cy) / (b.sy ?? 1); const v = b.R * b.R - x * x - dy * dy;
    return v > 0 ? Math.sqrt(v) : 0;
  };
  const z0 = b ? surf(0, 0) : 0; g.position.set(0, b ? b.y0 : 0, z0);
  const sz = (x: number, y: number) => surf(x, y) - z0;

  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18, emissive: 0xffffff, emissiveIntensity: 0.3 });
  const irisC = o.iris ?? 0x3b82f6;
  const irisM = new THREE.MeshStandardMaterial({ color: irisC, roughness: 0.3, emissive: irisC, emissiveIntensity: 0.4 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x120a1f, roughness: 0.25 });
  const hlM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lidM = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.5, emissive: o.skin, emissiveIntensity: 0.1 });
  const zs = o.round ? 0.95 : 0.72; const eyes: EyeRef[] = [];

  for (const side of [-1, 1]) {
    const x = side * gap; const eye = new THREE.Group(); eye.position.set(x, 0, sz(x, 0) - r * 0.1);
    const ball = new THREE.Mesh(SPH, white); ball.scale.set(r, r * 1.12, r * zs); eye.add(ball);
    const rim = new THREE.Mesh(SPH, OUTLINE_MAT); rim.scale.set(r * 1.11, r * 1.23, r * zs * 1.06); eye.add(rim);
    const pupil = new THREE.Group(); pupil.position.z = r * zs * 0.72;
    const iris = new THREE.Mesh(SPH, irisM); iris.scale.set(r * 0.68, r * 0.76, r * 0.26); pupil.add(iris);
    const dark = new THREE.Mesh(SPH, darkM); dark.scale.set(r * 0.42, r * 0.48, r * 0.24); dark.position.z = r * 0.1; pupil.add(dark);
    const h1 = new THREE.Mesh(SPH, hlM); h1.scale.setScalar(r * 0.21); h1.position.set(r * 0.2, r * 0.27, r * 0.3); pupil.add(h1);
    const h2 = new THREE.Mesh(SPH, hlM); h2.scale.setScalar(r * 0.09); h2.position.set(-r * 0.23, -r * 0.2, r * 0.28); pupil.add(h2);
    eye.add(pupil);
    const pivot = new THREE.Group(); const lid = new THREE.Mesh(LID_GEO, lidM); lid.scale.set(r * 1.14, r * 1.24, r * zs * 1.14); lid.rotation.x = -Math.PI / 2; pivot.add(lid); eye.add(pivot);
    eyes.push({ eye, pupil, pivot, lid, side }); g.add(eye);
  }

  if (o.cheeks !== false) {
    const cm = new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.7, depthWrite: false });
    for (const side of [-1, 1]) {
      const x = side * (gap + r * 0.95), y = -r * 0.95; const c = new THREE.Mesh(SPH, cm);
      c.scale.set(r * 0.5, r * 0.3, r * 0.5); c.position.set(x, y, sz(x, y) - r * 0.5); g.add(c);
    }
  }

  // chunky cartoon eyebrows (optional) – they tilt/raise with the mood so the orc can look angry, worried or surprised
  const brows: { m: THREE.Mesh; side: number; y0: number }[] = [];
  if (o.brows !== undefined) {
    const bm = new THREE.MeshStandardMaterial({ color: o.brows, roughness: 0.6 });
    for (const side of [-1, 1]) {
      const x = side * gap, y = r * 1.5; const m = new THREE.Mesh(SPH, bm);
      m.scale.set(r * 1.05, r * 0.22, r * 0.3); m.position.set(x, y, sz(x, y) - r * 0.02); g.add(m); brows.push({ m, side, y0: y });
    }
  }

  let smile: THREE.Mesh | undefined, open: THREE.Mesh | undefined;
  if (o.mouth && o.mouth !== 'none') {
    const my = -(o.mouthY ?? r * 1.6); const mm = new THREE.MeshStandardMaterial({ color: 0x3b1020, roughness: 0.6 });
    smile = new THREE.Mesh(new THREE.TorusGeometry(r * 0.42, r * 0.09, 6, 14, Math.PI), mm); smile.rotation.z = Math.PI; smile.position.set(0, my + r * 0.3, sz(0, my) + r * 0.03); g.add(smile);
    if (o.mouth === 'grin') {
      open = new THREE.Mesh(SPH, new THREE.MeshStandardMaterial({ color: 0x5b0f26, roughness: 0.5 })); open.scale.set(r * 0.32, r * 0.42, r * 0.22);
      open.position.set(0, my, sz(0, my) - r * 0.02); open.visible = false; g.add(open);
    }
  }

  const sweat = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0x7dd3fc })); sweat.scale.set(r * 0.26, r * 0.4, r * 0.2);
  const sx = gap + r * 1.5; sweat.position.set(sx, r * 1.2, sz(sx, r * 1.2) + r * 0.2); sweat.userData.y0 = r * 1.2; sweat.visible = false; g.add(sweat);

  g.userData = { r, bias: o.bias ?? 0, eyes, smile, open, sweat, brows, blinkT: 0.8 + Math.random() * 3, blinkP: 0 };
  return g;
}

export interface FaceMood { lookX: number; lookY: number; focus: number; squint: number; worry: number }
export function updateFace(face: THREE.Object3D, dt: number, time: number, m: FaceMood) {
  const u = face.userData as { r: number; bias: number; eyes: EyeRef[]; smile?: THREE.Mesh; open?: THREE.Mesh; sweat: THREE.Mesh; brows?: { m: THREE.Mesh; side: number; y0: number }[]; blinkT: number; blinkP: number };
  if (!u.eyes) return;
  u.blinkT -= dt;
  if (u.blinkT <= 0 && u.blinkP <= 0) { u.blinkP = 0.001; u.blinkT = Math.random() < 0.22 ? 0.28 : 2 + Math.random() * 3.2; }
  let blink = 0;
  if (u.blinkP > 0) { u.blinkP += dt / 0.17; if (u.blinkP >= 1) u.blinkP = 0; else blink = Math.sin(u.blinkP * Math.PI); }
  const foc = m.focus + u.bias;
  const close = Math.min(1, Math.max(blink, m.squint * 0.8, foc * 0.3, m.worry * 0.18));
  const tilt = foc * 0.38 + m.squint * 0.3 - m.worry * 0.55;
  const a = -Math.PI / 2 + close * Math.PI; const r = u.r;
  const shake = m.worry * Math.sin(time * 38) * r * 0.06;
  for (const e of u.eyes) {
    e.lid.rotation.x = a; e.pivot.rotation.z = e.side * tilt;
    e.pupil.position.x = m.lookX * r * 0.34 + shake; e.pupil.position.y = m.lookY * r * 0.3;
  }
  if (u.brows) for (const b of u.brows) {
    b.m.rotation.z = b.side * (foc * 0.6 + m.squint * 0.2 - m.worry * 0.55);
    b.m.position.y = b.y0 + (m.worry * 0.3 - foc * 0.18 + m.squint * 0.12) * r;
  }
  const shout = m.squint > 0.35;
  if (u.open) { u.open.visible = shout; if (u.smile) u.smile.visible = !shout; }
  if (u.sweat) {
    u.sweat.visible = m.worry > 0.5;
    if (u.sweat.visible) { const p = (time * 1.1) % 1; u.sweat.position.y = (u.sweat.userData.y0 as number) - p * r * 1.3; u.sweat.scale.set(r * 0.26 * (1 - p * 0.5), r * 0.4 * (1 - p * 0.5), r * 0.2); }
  }
}
