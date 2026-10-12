import * as THREE from 'three';
import { BOX, SPH, OUTLINE_MAT, makeFace, makeFlame, makeBlast } from './voxel';

export type JossTowerKind = 'cannon' | 'gravity' | 'tornado' | 'meteor' | 'midas' | 'draco' | 'sol' | 'chroma' | 'frostbite';

export interface JossTowerModel {
  group: THREE.Group;
  head: THREE.Group;
  face: THREE.Object3D;
  /** anchor the tower fires from. NOTE: only objects made by makeBlast() (userData.fx) are used as the muzzle
   *  flash – anything else is ignored by Game.buildTowerMesh and replaced by a fresh flash, because the engine
   *  scales the muzzle down to zero after every shot. */
  muzzle: THREE.Object3D;
  flame: THREE.Object3D;
}

// ---------- shared materials / geometry (exact from tower-defense-joss) ----------
const MATS = new Map<string, THREE.MeshStandardMaterial>();
export function M(color: number, glow = 0.08, rough = 0.55) {
  const k = color + '|' + glow + '|' + rough;
  let m = MATS.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, emissive: color, emissiveIntensity: glow });
    MATS.set(k, m);
  }
  return m;
}

const GEO = new Map<string, THREE.BufferGeometry>();
function G<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = GEO.get(key);
  if (!g) { g = make(); GEO.set(key, g); }
  return g as T;
}

const OL = 0.022; // outline thickness
function hull(m: THREE.Mesh, kr: number, kh: number) {
  const o = new THREE.Mesh(m.geometry, OUTLINE_MAT);
  o.scale.set(kr, kh, kr);
  m.add(o);
}

interface O {
  sx?: number; sy?: number; sz?: number;
  rx?: number; ry?: number; rz?: number;
  ol?: boolean; cast?: boolean; seg?: number;
}

function fin<T extends THREE.Mesh>(m: T, x: number, y: number, z: number, o: O): T {
  m.position.set(x, y, z);
  m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  m.castShadow = !!o.cast;
  return m;
}

function sc(m: THREE.Mesh, o: O) {
  if (o.sx !== undefined || o.sy !== undefined || o.sz !== undefined) {
    m.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  }
}

/** sphere, optional outline */
export function S(r: number, mat: THREE.Material, x = 0, y = 0, z = 0, o: O = {}) {
  const m = new THREE.Mesh(SPH, mat);
  const sx = o.sx ?? 1, sy = o.sy ?? 1, sz = o.sz ?? 1;
  m.scale.set(r * sx, r * sy, r * sz);
  fin(m, x, y, z, o);
  if (o.ol) {
    const k = 1 + OL / ((r * (sx + sy + sz)) / 3);
    hull(m, k, k);
  }
  return m;
}

/** cylinder (capsule-ish body parts), optional outline */
export function C(rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 12, ol = true) {
  const m = new THREE.Mesh(G(`cyl${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat);
  fin(m, x, y, z, {});
  m.castShadow = true;
  if (ol) hull(m, 1 + OL / Math.max(rt, rb), 1 + (OL * 2) / h);
  return m;
}

/** cone whose BASE is at the origin and whose tip points up (+y) */
export function cone(r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, o: O = {}) {
  const m = new THREE.Mesh(G(`cone${r}|${h}`, () => new THREE.ConeGeometry(r, h, 10).translate(0, h / 2, 0)), mat);
  fin(m, x, y, z, o);
  sc(m, o);
  m.castShadow = !!o.cast;
  if (o.ol) hull(m, 1 + OL / r, 1 + OL / h);
  return m;
}

export function tor(R: number, t: number, mat: THREE.Material, x = 0, y = 0, z = 0, o: O = {}) {
  const m = new THREE.Mesh(G(`tor${R}|${t}`, () => new THREE.TorusGeometry(R, t, 8, 22)), mat);
  fin(m, x, y, z, o);
  sc(m, o);
  return m;
}

/** small cube details: belts, buckles, runes, tufts */
export function B(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, o: O = {}) {
  const m = new THREE.Mesh(BOX, mat);
  m.scale.set(w, h, d);
  fin(m, x, y, z, o);
  if (o.ol) {
    const k = 1 + OL / ((w + h + d) / 3);
    hull(m, k, k);
  }
  return m;
}

function podium(level: number, accent: number) {
  const g = new THREE.Group();
  const stone = M(0x98a3b5, 0.1, 0.75), acc = M(accent, 0.35), glow = M(0xffffff, 1);
  g.add(C(0.5, 0.55, 0.22, stone, 0, 0.11, 0, 12, true));
  g.add(C(0.43, 0.47, 0.1, acc, 0, 0.26, 0, 12, true));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    const r = B(0.07, 0.06, 0.05, glow, Math.cos(a) * 0.53, 0.15, Math.sin(a) * 0.53);
    r.rotation.y = -a + Math.PI / 2;
    g.add(r);
  }
  const shards = new THREE.Group();
  shards.name = 'shards';
  shards.position.y = 0.52;
  g.add(shards);
  for (let i = 0; i < level; i++) {
    const a = (i * Math.PI * 2) / Math.max(1, level);
    const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), M(0xffffff, 0.9, 0.3));
    sh.scale.y = 1.5;
    sh.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6);
    shards.add(sh);
  }
  return g;
}

function eyesOn(host: THREE.Group, R: number, cy: number, y0: number, iris: number, skin: number, mouth: 'none' | 'grin' | 'smile' = 'grin', brows?: number) {
  const f = makeFace({ r: 0.125, gap: 0.155, iris, skin, mouth, cheeks: true, brows, body: { R, cy, sy: 1, y0 } });
  host.add(f);
  return f;
}

/** 🔵 Bolo / Cannon – chubby cannon buddy standing on a stone podium */
function buildCannon(level: number): JossTowerModel {
  const group = new THREE.Group();
  const stone = M(0x98a3b5, 0.1, 0.75), accent = M(0x2b5fd9, 0.35), blue = M(0x4f8cff), blueDark = M(0x2b5fd9), gold = M(0xfbbf24, 0.3, 0.3);
  const dark = M(0x1f2937, 0.05);

  // stone podium with glowing runes
  group.add(C(0.5, 0.55, 0.22, stone, 0, 0.11, 0, 12, true));
  group.add(C(0.43, 0.47, 0.1, accent, 0, 0.26, 0, 12, true));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    const rune = B(0.07, 0.06, 0.05, M(0x4f8cff, 1), Math.cos(a) * 0.53, 0.15, Math.sin(a) * 0.53);
    rune.rotation.y = -a + Math.PI / 2;
    group.add(rune);
  }
  // level shards orbiting the podium
  const shards = new THREE.Group();
  shards.name = 'shards';
  shards.position.y = 0.52;
  group.add(shards);
  for (let i = 0; i < level; i++) {
    const a = (i * Math.PI * 2) / Math.max(1, level);
    const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), M(0x4f8cff, 0.9, 0.3));
    sh.scale.y = 1.5;
    sh.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6);
    shards.add(sh);
  }

  // the cannon buddy
  const head = new THREE.Group();
  head.position.y = 0.3;
  group.add(head);
  head.add(S(0.38, blue, 0, 0.35, 0, { cast: true, ol: true }));
  head.add(S(0.22, M(0x9ec5ff), 0, 0.16, 0.26, { sy: 0.8, sz: 0.5, ol: false }));
  // sailor cap with a lit fuse
  head.add(S(0.33, blueDark, 0, 0.6, -0.02, { sy: 0.55, ol: true }));
  head.add(S(0.055, gold, 0, 0.75, -0.02, { ol: true }));
  head.add(C(0.014, 0.014, 0.16, M(0x9ca3af, 0.1), 0, 0.83, -0.02, 6, false));
  const flame = makeFlame(0.09);
  flame.position.set(0, 0.9, -0.02);
  head.add(flame);
  // barrel + muzzle ring + bore
  const b1 = C(0.1, 0.13, 0.52, dark, 0, 0.26, 0.42, 12, true);
  b1.rotateX(Math.PI / 2);
  head.add(b1);
  const b2 = C(0.155, 0.155, 0.07, gold, 0, 0.26, 0.7, 12, true);
  b2.rotateX(Math.PI / 2);
  head.add(b2);
  const b3 = C(0.08, 0.08, 0.02, M(0x0b0b12, 0.02), 0, 0.26, 0.74, 12, false);
  b3.rotateX(Math.PI / 2);
  head.add(b3);
  // little side knobs (shoulders) + star muzzle flash
  for (const sd of [-1, 1]) {
    const k = C(0.085, 0.085, 0.12, gold, sd * 0.4, 0.42, 0, 10, true);
    k.rotateZ(Math.PI / 2);
    head.add(k);
  }
  const muzzle = makeBlast(0.5);
  muzzle.position.set(0, 0.26, 0.86);
  head.add(muzzle);
  // cute face on the upper front
  const face = makeFace({ r: 0.13, gap: 0.16, iris: 0x1d4ed8, skin: 0x4f8cff, mouth: 'none', cheeks: true, body: { R: 0.38, cy: 0.35, sy: 1, y0: 0.42 } });
  head.add(face);

  return { group, head, face, muzzle, flame };
}

/** 🕳️ Gav – a floating gravity orb with a swirl ring and orbiting rocks */
function buildGravity(level: number): JossTowerModel {
  const group = podium(level, 0x6d28d9);
  const head = new THREE.Group();
  head.position.y = 0.3;
  group.add(head);
  const dark = M(0x2b1a4a, 0.15, 0.4), purple = M(0x6d28d9, 0.4), ring = M(0xc4b5fd, 1);
  head.add(C(0.3, 0.36, 0.24, dark, 0, 0.12, 0, 12, true));
  head.add(tor(0.34, 0.04, ring, 0, 0.14, 0, { rx: Math.PI / 2 }));
  const orbG = new THREE.Group();
  orbG.position.y = 0.92;
  head.add(orbG);
  orbG.add(S(0.34, purple, 0, 0, 0, { ol: true, cast: true }));
  const face = eyesOn(orbG, 0.34, 0, 0.02, 0xc4b5fd, 0x6d28d9, 'smile', 0x4c1d95);
  orbG.add(S(0.1, M(0xc4b5fd, 1), 0, 0.32, 0, { ol: true }));
  const swirl = new THREE.Group();
  swirl.name = 'swirl';
  head.add(swirl);
  for (let i = 0; i < 2; i++) {
    const r = tor(0.5 + i * 0.12, 0.035, ring, 0, 0.86, 0, { rx: Math.PI / 2 - 0.4 + i * 0.25 });
    swirl.add(r);
  }
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(SPH, M(0x8b8fa8, 0.2, 0.6));
    r.name = 'orbit' + i;
    r.scale.setScalar(0.1);
    r.userData = { r: 0.62, y: 0.9, n: 4, spd: 1.6 };
    head.add(r);
    const h = new THREE.Mesh(SPH, OUTLINE_MAT);
    h.scale.setScalar(1.12);
    r.add(h);
  }
  return { group, head, face, muzzle: orbG, flame: new THREE.Group() };
}

/** 🌪️ Twisty – a smiling cloud with a spinning propeller and a wind funnel */
function buildTornado(level: number): JossTowerModel {
  const group = podium(level, 0x0ea5e9);
  const head = new THREE.Group();
  head.position.y = 0.3;
  group.add(head);
  const cloud = M(0xf0f9ff, 0.18, 0.85), funnel = M(0x38bdf8, 0.25, 0.5), wood = M(0xfbbf24, 0.3, 0.3);
  const cloudG = new THREE.Group();
  cloudG.position.y = 0.72;
  head.add(cloudG);
  cloudG.add(S(0.3, cloud, 0, 0, 0, { ol: true, cast: true }));
  cloudG.add(S(0.22, cloud, -0.3, 0.08, 0, { ol: true, cast: true }));
  cloudG.add(S(0.22, cloud, 0.3, 0.08, 0, { ol: true, cast: true }));
  cloudG.add(S(0.18, cloud, 0, 0.2, -0.15, { ol: true }));
  const face = eyesOn(cloudG, 0.3, 0, 0.02, 0x0ea5e9, 0xf0f9ff, 'grin', 0x0369a1);
  // wind funnel (two stacked cones) that spins
  const funnelG = new THREE.Group();
  funnelG.name = 'funnel';
  funnelG.position.y = 0.32;
  head.add(funnelG);
  funnelG.add(C(0.26, 0.42, 0.3, funnel, 0, 0, 0, 12, true));
  funnelG.add(C(0.1, 0.26, 0.3, M(0x7dd3fc, 0.3), 0, -0.28, 0, 12, true));
  // propeller on top
  const rotor = new THREE.Group();
  rotor.name = 'rotor';
  rotor.position.y = 1.28;
  head.add(rotor);
  rotor.add(C(0.04, 0.04, 0.14, wood, 0, 0, 0, 8, true));
  for (let i = 0; i < 3; i++) {
    const g2 = new THREE.Group();
    g2.rotation.y = (i * 2 * Math.PI) / 3;
    g2.add(B(0.34, 0.05, 0.12, wood, 0.18, 0, 0, { ol: true }));
    rotor.add(g2);
  }
  rotor.add(S(0.08, wood, 0, 0, 0, { ol: true }));
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    head.add(S(0.07, M(0xbae6fd, 0.6), Math.sin(a) * 0.42, 0.5, Math.cos(a) * 0.42, { ol: true }));
  }
  return { group, head, face, muzzle: cloudG, flame: new THREE.Group() };
}

/** 🌠 Comet – a stone lookout with a glowing crystal and a telescope aimed at the sky */
function buildMeteor(level: number): JossTowerModel {
  const group = podium(level, 0xdc2626);
  const head = new THREE.Group();
  head.position.y = 0.3;
  group.add(head);
  const stone = M(0x8b8fa8, 0.12, 0.7), stoneD = M(0x6b7280, 0.1, 0.7), gold = M(0xfbbf24, 0.35, 0.3), ember = M(0xff7a3c, 0.8, 0.35);
  head.add(C(0.36, 0.42, 0.5, stone, 0, 0.25, 0, 12, true));
  head.add(C(0.4, 0.4, 0.1, stoneD, 0, 0.52, 0, 12, true));
  const face = eyesOn(head, 0.36, 0.25, 0.34, 0xdc2626, 0x8b8fa8, 'grin', 0x4b5563);
  const crystal = new THREE.Group();
  crystal.name = 'spin';
  crystal.position.y = 1.0;
  head.add(crystal);
  const c1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), M(0xffb37a, 1, 0.2));
  c1.scale.y = 1.5;
  const c1h = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), OUTLINE_MAT);
  c1h.scale.set(1.12, 1.62, 1.12);
  c1.add(c1h);
  crystal.add(c1);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57;
    const s2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), M(0xffd166, 1, 0.2));
    s2.position.set(Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3);
    crystal.add(s2);
  }
  // telescope
  const scope = new THREE.Group();
  scope.position.set(0, 0.55, 0.25);
  scope.rotation.x = -0.55;
  head.add(scope);
  const sc1 = C(0.08, 0.1, 0.55, gold, 0, 0, 0, 10, true);
  sc1.rotateX(Math.PI / 2);
  scope.add(sc1);
  const sc2 = C(0.13, 0.13, 0.08, M(0xb45309, 0.15), 0, 0, 0.28, 10, true);
  sc2.rotateX(Math.PI / 2);
  scope.add(sc2);
  scope.add(S(0.08, ember, 0, 0, 0.34, { ol: true }));
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    head.add(S(0.05, M(0xffd166, 1), Math.sin(a) * 0.45, 0.35 + i * 0.1, Math.cos(a) * 0.45, { ol: true }));
  }
  return { group, head, face, muzzle: crystal, flame: new THREE.Group() };
}

/** 💰 Midas – a golden cauldron of liquid gold with a wand, turning weak orcs into coins */
function buildMidas(level: number): JossTowerModel {
  const group = podium(level, 0xb45309);
  const head = new THREE.Group();
  head.position.y = 0.3;
  group.add(head);
  const gold = M(0xfbbf24, 0.35, 0.3), goldD = M(0xb45309, 0.2, 0.4), white = M(0xfff7ed, 0.15, 0.85);
  head.add(C(0.36, 0.3, 0.5, goldD, 0, 0.25, 0, 14, true));
  head.add(C(0.36, 0.36, 0.08, gold, 0, 0.52, 0, 14, true));
  const surface = new THREE.Mesh(new THREE.CircleGeometry(0.32, 18), M(0xffe066, 1, 0.2));
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.54;
  surface.name = 'liquid';
  head.add(surface);
  for (let i = 0; i < 3; i++) {
    const b = S(0.07, white, Math.sin(i * 2.1) * 0.16, 0.56, Math.cos(i * 2.1) * 0.16, { ol: true });
    b.name = 'bubble' + i;
    head.add(b);
  }
  for (const sd of [-1, 1]) {
    head.add(tor(0.09, 0.03, gold, sd * 0.36, 0.28, 0, { rz: (sd * Math.PI) / 2 }));
  }
  const face = eyesOn(head, 0.36, 0.25, 0.34, 0xb45309, 0xfbbf24, 'smile', 0x7c2d12);
  const wand = new THREE.Group();
  wand.position.set(0, 0.45, 0.42);
  head.add(wand);
  const w1 = C(0.03, 0.03, 0.5, M(0x6b4423, 0.1, 0.6), 0, 0, 0.2, 8, true);
  w1.rotateX(Math.PI / 2);
  wand.add(w1);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), M(0xffe066, 1, 0.2));
  star.position.z = 0.46;
  star.name = 'wandStar';
  const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), OUTLINE_MAT);
  sh.scale.setScalar(1.12);
  star.add(sh);
  wand.add(star);
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14), gold);
  coin.name = 'coin';
  coin.position.set(0, 1.05, 0);
  coin.rotation.x = Math.PI / 2;
  const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14), OUTLINE_MAT);
  ch.scale.setScalar(1.1);
  coin.add(ch);
  head.add(coin);
  return { group, head, face, muzzle: wand, flame: new THREE.Group() };
}

/** 🐉 Draco – a plump RED dragon perched on its tower */
function buildDraco(level: number): JossTowerModel {
  const group = podium(level, 0xb91c1c);
  const head = new THREE.Group();
  head.position.y = 0.3;
  group.add(head);
  const red = M(0xef4444, 0.3, 0.45), redD = M(0xb91c1c, 0.22, 0.5), belly = M(0xfca5a5, 0.18), gold = M(0xfbbf24, 0.35, 0.3), dark = M(0x7f1d1d, 0.1, 0.55), cream = M(0xfff7e0);
  // plump body
  head.add(S(0.46, red, 0, 0.46, -0.04, { sy: 0.98, sz: 1.12, cast: true, ol: true }));
  head.add(S(0.32, belly, 0, 0.38, 0.24, { sy: 0.92, sz: 0.62 }));
  // curled tail with a golden spade tip
  const tail = new THREE.Group();
  tail.position.set(0, 0.32, -0.5);
  head.add(tail);
  tail.add(S(0.22, red, 0, 0, -0.16, { sz: 1.15, cast: true, ol: true }));
  tail.add(S(0.155, red, 0, 0.06, -0.52, { sz: 1.15, ol: true }));
  tail.add(S(0.11, red, 0, 0.16, -0.76, { ol: true }));
  tail.add(cone(0.15, 0.32, gold, 0, 0.18, -0.92, { rx: -Math.PI / 2, sz: 0.45, ol: true }));
  // golden back spikes
  for (let i = 0; i < 3; i++) head.add(cone(0.065, 0.17, gold, 0, 0.84 + i * 0.03, -0.28 + i * 0.26, { ol: true }));
  // wings: red bone fingers with a cream membrane
  for (const sd of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(sd * 0.4, 0.62, -0.2);
    w.rotation.z = -sd * 0.32;
    head.add(w);
    w.add(S(0.32, redD, sd * 0.12, 0.14, 0, { sx: 1.15, sy: 0.72, sz: 0.3, ol: true, cast: true }));
    for (let k = 0; k < 3; k++) {
      w.add(S(0.13, cream, sd * (0.26 + k * 0.1), 0.12 - k * 0.07, -0.02, { sx: 1.05, sy: 0.72, sz: 0.26, ol: true }));
    }
    const tip = cone(0.055, 0.18, gold, sd * 0.52, 0.42, 0, { ol: true });
    tip.rotation.z = -sd * 1.25;
    w.add(tip);
  }
  // neck + big cute head
  head.add(S(0.22, red, 0, 0.76, 0.18, { sy: 1.15, sz: 1.15, ol: true }));
  const hd = new THREE.Group();
  hd.position.set(0, 1.02, 0.3);
  head.add(hd);
  hd.add(S(0.31, red, 0, 0, 0, { sx: 1.08, sy: 0.98, sz: 1.15, cast: true, ol: true }));
  hd.add(S(0.19, belly, 0, -0.13, 0.32, { sy: 0.85, sz: 0.7, ol: true })); // snout
  for (const sd of [-1, 1]) {
    const hn = cone(0.075, 0.28, gold, sd * 0.21, 0.22, -0.12, { ol: true });
    hn.rotation.z = -sd * 0.45;
    hd.add(hn);
    hd.add(S(0.035, dark, sd * 0.11, -0.15, 0.4, {}));
    const tooth = cone(0.032, 0.09, cream, sd * 0.09, -0.19, 0.38, { rx: Math.PI });
    hd.add(tooth);
  }
  const face = makeFace({ r: 0.13, gap: 0.155, iris: 0x7f1d1d, skin: 0xef4444, mouth: 'grin', cheeks: true, brows: 0x7f1d1d, body: { R: 0.32, cy: 0, sy: 0.98, y0: 0.03 } });
  hd.add(face);
  return { group, head, face, muzzle: hd, flame: new THREE.Group() };
}

/** 🌻 Sol (Matahari V2) – an adorable sunflower with a smiling sun face, a crown of conical petals encircling the rim (bunga matahari), and lush green leaves */
function buildSol(level: number): JossTowerModel {
  const group = podium(level, 0xd97706);
  const head = new THREE.Group();
  head.position.y = 0.3;
  group.add(head);

  const sun = M(0xfbbf24, 0.45, 0.3);       // warm sunflower golden yellow
  const sunD = M(0xd97706, 0.35, 0.4);      // rich amber orange
  const sunLight = M(0xfde047, 0.5, 0.25);  // bright lemon petal
  const glow = M(0xfde68a, 1, 0.2);
  const stemMat = M(0x65a30d, 0.2, 0.55);   // vibrant sunflower green
  const leafMat = M(0x4d7c0f, 0.2, 0.5);

  // 1. Sunflower Stem & Pedestal Collar
  head.add(C(0.14, 0.18, 0.38, stemMat, 0, 0.34, 0, 10, true));
  head.add(S(0.24, sunD, 0, 0.18, 0, { sy: 0.5, ol: true }));

  // 2. Cute Green Sunflower Leaves sprouting to the left and right
  const leafL = new THREE.Group();
  leafL.position.set(-0.28, 0.46, 0);
  leafL.rotation.set(0.12, 0.25, -0.32);
  leafL.add(B(0.24, 0.04, 0.16, leafMat, -0.06, 0, 0, { ol: true }));
  head.add(leafL);

  const leafR = new THREE.Group();
  leafR.position.set(0.28, 0.46, 0);
  leafR.rotation.set(0.12, -0.25, 0.32);
  leafR.add(B(0.24, 0.04, 0.16, leafMat, 0.06, 0, 0, { ol: true }));
  head.add(leafR);

  // 3. Flower Head (center disk + smiling face + petal crown)
  const orb = new THREE.Group();
  orb.position.y = 0.95;
  head.add(orb);

  // Center sunflower disc (warm golden sun sphere, slightly flattened along z for a flower disk)
  orb.add(S(0.36, sun, 0, 0, 0, { sz: 0.85, ol: true, cast: true }));

  // Outer flower sepal / calyx disc behind the head
  const calyx = C(0.33, 0.37, 0.08, stemMat, 0, 0, -0.16, 16, true);
  calyx.rotation.x = Math.PI / 2;
  orb.add(calyx);

  // Golden ring framing the seed disc
  const discRim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.024, 8, 28), sunD);
  discRim.position.z = 0.02;
  orb.add(discRim);

  // 4. Petals (Kerucut-kerucut melingkari sisi kepala, BUKAN di sisi depan!)
  // Cones form a radiant sunflower corona radiating outward around the rim in X-Y plane
  const rays = new THREE.Group();
  rays.name = 'spin';
  orb.add(rays);

  const NUM_PETALS = 16;
  for (let i = 0; i < NUM_PETALS; i++) {
    const a = (i / NUM_PETALS) * Math.PI * 2;
    // Layer 1: Outer primary sunflower petals (alternating yellow and warm amber)
    const pet1 = cone(0.08, 0.28, i % 2 ? sunD : sun, 0, 0, 0, { ol: true });
    // Direction vector points radially outward around the rim, flared slightly backward (-z) so it never clips front face
    const dir1 = new THREE.Vector3(Math.cos(a), Math.sin(a), -0.06).normalize();
    pet1.position.set(Math.cos(a) * 0.34, Math.sin(a) * 0.34, -0.06);
    pet1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir1);
    rays.add(pet1);

    // Layer 2: Inner layered golden petals offset by half an angle step for a dense, lush sunflower bloom
    const a2 = a + (Math.PI / NUM_PETALS);
    const pet2 = cone(0.062, 0.20, sunLight, 0, 0, 0, { ol: true });
    const dir2 = new THREE.Vector3(Math.cos(a2), Math.sin(a2), -0.03).normalize();
    pet2.position.set(Math.cos(a2) * 0.35, Math.sin(a2) * 0.35, -0.02);
    pet2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir2);
    rays.add(pet2);
  }

  // 5. Divine warm golden halo ring behind the flower petals
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.025, 8, 36), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.75, depthWrite: false }));
  halo.position.set(0, 0, -0.12);
  halo.name = 'halo';
  orb.add(halo);

  // 6. Sparkling orbiting sun motes
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), glow);
    s.name = 'orbit' + i;
    s.userData = { r: 0.88, y: 0.95, n: 3, spd: 1.1, yIsWorld: true, off: 0.3 };
    head.add(s);
  }

  // 7. Cheerful Smiling Face on the front (+Z) – completely unobstructed!
  const face = makeFace({ r: 0.125, gap: 0.155, iris: 0xb45309, skin: 0xfbbf24, mouth: 'grin', cheeks: true, brows: 0x92400e, body: { R: 0.36, cy: 0, sy: 1, y0: 0.03 } });
  orb.add(face);

  return { group, head, face, muzzle: orb, flame: new THREE.Group() };
}

/** 💎 Chroma – a beautiful PINK crystal that spins above its pedestal */
function buildChroma(level: number): JossTowerModel {
  const group = podium(level, 0xdb2777);
  const head = new THREE.Group();
  head.position.y = 0.3;
  group.add(head);
  const pinkD = M(0x9d174d, 0.3, 0.4), pinkL = M(0xf9a8d4, 0.35, 0.35), glow = M(0xfbcfe8, 1, 0.2), gold = M(0xfbbf24, 0.35, 0.3);
  head.add(S(0.3, pinkD, 0, 0.26, 0, { sy: 0.5, ol: true }));
  const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 20), gold);
  cradle.rotation.x = Math.PI / 2;
  cradle.position.y = 0.52;
  head.add(cradle);
  const prism = new THREE.Group();
  prism.name = 'spin';
  prism.position.y = 1.02;
  head.add(prism);
  const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), M(0xf472b6, 0.55, 0.25));
  c.scale.y = 1.55;
  prism.add(c);
  const ch = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), OUTLINE_MAT);
  ch.scale.set(1.12, 1.73, 1.12);
  c.add(ch);
  const c2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.19), pinkL);
  c2.position.y = 0.42;
  prism.add(c2);
  const c2h = new THREE.Mesh(new THREE.OctahedronGeometry(0.19), OUTLINE_MAT);
  c2h.scale.setScalar(1.18);
  c2.add(c2h);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094;
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), glow);
    s.position.set(Math.cos(a) * 0.58, Math.sin(a * 1.4) * 0.2, Math.sin(a) * 0.58);
    const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), OUTLINE_MAT);
    sh.scale.setScalar(1.15);
    s.add(sh);
    prism.add(s);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 26), new THREE.MeshBasicMaterial({ color: 0xfbcfe8, transparent: true, opacity: 0.75, depthWrite: false }));
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.02;
  halo.name = 'halo';
  head.add(halo);
  const face = makeFace({ r: 0.115, gap: 0.145, iris: 0x9d174d, skin: 0xf472b6, mouth: 'grin', cheeks: true, body: { R: 0.34, cy: 1.02, sy: 1.55, y0: 1.02 } });
  head.add(face);
  return { group, head, face, muzzle: prism, flame: new THREE.Group() };
}

/** ❄️ Frostbite – a faceted ice keep with a snow-capped roof, icicles and glacier pinnacle */
function buildFrostbite(level: number): JossTowerModel {
  const group = podium(level, 0x0284c7);
  const head = new THREE.Group();
  head.position.y = 0.3;
  group.add(head);
  const ice = M(0x7dd3fc, 0.5, 0.3), iceD = M(0x0284c7, 0.3, 0.4), white = M(0xf0f9ff, 0.2), gold = M(0xfbbf24, 0.35, 0.3), glow = M(0xe0f2fe, 1, 0.25);
  head.add(C(0.36, 0.44, 0.66, iceD, 0, 0.33, 0, 6, true));
  head.add(C(0.38, 0.38, 0.08, ice, 0, 0.66, 0, 6, true));
  for (const [y, r] of [[0.52, 0.37], [0.22, 0.4]] as [number, number][]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.028, 8, 22), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    head.add(ring);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const vein = B(0.045, 0.5, 0.02, glow, Math.sin(a) * 0.375, 0.36, Math.cos(a) * 0.375);
    vein.rotation.y = a;
    head.add(vein);
    const rune = B(0.1, 0.16, 0.03, glow, Math.sin(a) * 0.38, 0.42, Math.cos(a) * 0.38);
    rune.rotation.y = a;
    head.add(rune);
  }
  // snow-capped roof with drips and hanging icicles
  head.add(C(0.4, 0.34, 0.16, white, 0, 0.74, 0, 6, true));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    head.add(S(0.075, white, Math.sin(a) * 0.38, 0.66, Math.cos(a) * 0.38, { sy: 1.1, sz: 0.9, ol: true }));
    head.add(S(0.05, white, Math.sin(a) * 0.2, 0.76, Math.cos(a) * 0.2, { sy: 0.8, ol: true }));
    const ic = cone(0.055, 0.24, ice, Math.sin(a) * 0.36, 0.62, Math.cos(a) * 0.36, { ol: true });
    ic.rotation.x = Math.PI;
    head.add(ic);
    const ic2 = cone(0.038, 0.15, white, Math.sin(a + 0.5) * 0.33, 0.6, Math.cos(a + 0.5) * 0.33, { ol: true });
    ic2.rotation.x = Math.PI;
    head.add(ic2);
  }
  // soft mist pooling at the base
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    head.add(S(0.13, glow, Math.sin(a) * 0.5, 0.12 + (i % 2) * 0.06, Math.cos(a) * 0.5, { sy: 0.5, sz: 0.9, ol: false }));
  }
  // the glacier pinnacle
  const spire = new THREE.Group();
  spire.position.y = 0.82;
  head.add(spire);
  const iceL = M(0xbae6fd, 0.45, 0.25);
  const main = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), iceL);
  main.scale.set(0.62, 1.35, 0.62);
  main.position.y = 0.46;
  spire.add(main);
  const mainOl = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), OUTLINE_MAT);
  mainOl.scale.set(0.68, 1.44, 0.68);
  mainOl.position.y = 0.46;
  spire.add(mainOl);
  for (const [x, z, h, r] of [[-0.26, 0.1, 0.62, 0.2], [0.28, -0.13, 0.52, 0.18], [0.05, 0.3, 0.42, 0.15], [-0.14, -0.28, 0.36, 0.13]] as [number, number, number, number][]) {
    const s2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), iceL);
    s2.scale.set(r / 0.3, h / 0.3, r / 0.3);
    s2.position.set(x, h / 2 - 0.04, z);
    spire.add(s2);
    const s2h = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), OUTLINE_MAT);
    s2h.scale.set((r + 0.014) / 0.3, (h + 0.03) / 0.3, (r + 0.014) / 0.3);
    s2h.position.copy(s2.position);
    spire.add(s2h);
  }
  const ring = new THREE.Group();
  ring.name = 'spin';
  ring.position.y = 0.72;
  head.add(ring);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), glow);
    c.position.set(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62);
    c.rotation.set(a, a * 2, 0);
    const ch = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), OUTLINE_MAT);
    ch.scale.setScalar(1.16);
    c.add(ch);
    ring.add(c);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.022, 8, 26), new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.6, depthWrite: false }));
  halo.rotation.x = Math.PI / 2;
  halo.name = 'halo';
  halo.position.y = 0.72;
  head.add(halo);
  const snowField = new THREE.Group();
  snowField.name = 'snowField';
  head.add(snowField);
  for (let i = 0; i < 11; i++) {
    const fl = S(0.032 + (i % 3) * 0.012, white, Math.sin(i * 2.1) * 0.62, 0.2 + ((i * 0.37) % 1) * 1.3, Math.cos(i * 1.7) * 0.62, { ol: false });
    snowField.add(fl);
  }
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), glow);
    s.name = 'orbit' + i;
    s.userData = { r: 0.62, y: 1.12, n: 3, spd: 1.5 };
    head.add(s);
    const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), OUTLINE_MAT);
    sh.scale.setScalar(1.18);
    s.add(sh);
  }
  for (const sd of [-1, 1]) {
    head.add(S(0.16, white, sd * 0.36, 0.46, 0.2, { sx: 1.2, sy: 0.7, sz: 1.1, ol: true }));
  }
  const face = makeFace({ r: 0.115, gap: 0.14, iris: 0x0369a1, skin: 0x7dd3fc, mouth: 'smile', cheeks: true, body: { kind: 'cyl', R: 0.36, cy: 0.33, y0: 0.4 } });
  head.add(face);
  return { group, head, face, muzzle: spire, flame: new THREE.Group() };
}

export function buildJossTower(kind: JossTowerKind, level: number): JossTowerModel {
  switch (kind) {
    case 'cannon': return buildCannon(level);
    case 'gravity': return buildGravity(level);
    case 'tornado': return buildTornado(level);
    case 'meteor': return buildMeteor(level);
    case 'midas': return buildMidas(level);
    case 'draco': return buildDraco(level);
    case 'sol': return buildSol(level);
    case 'chroma': return buildChroma(level);
    case 'frostbite': return buildFrostbite(level);
  }
}
