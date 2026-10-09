import * as THREE from 'three';
import { BOX, SPH, OUTLINE_MAT, makeFace } from './voxel';
import { M, S, cap, cyl, cone, tor, box, newSkin, orcArm } from './orcs';
import type { OrcBuild } from './orcs';

/**
 * Elite orcs (same cute round style + same glossy tower-style eyes as the other orcs):
 *  - archer   : green-hooded orc with a quiver; draws a real bow (the string bends, the arrow is nocked) and lobs arrows at towers
 *  - dread    : "Ksatria Kelam" – a bulky black knight: horned helmet with a dark visor, glowing GREEN eyes, glowing horn tips, a grille mouth,
 *               spiked pauldrons, a green gem and a huge sword; every slash destroys a tower
 *  - captain  : red-and-gold war chief with a plumed helmet, a cape and a flapping banner; his war cry makes nearby orcs faster
 *  - legion   : elite soldier with a steel helmet + crimson plume, a round shield and a spear; marches in formation behind the captain
 *  - boss     : "Raja Orc" – a big, regal orc king: jewelled crown, white fur collar, red royal robe, gold pauldrons, purple ermine cape, a goatee and a golden war hammer
 */
export type EliteKind = 'archer' | 'dread' | 'captain' | 'legion' | 'boss';
export const isElite = (t: string): t is EliteKind => t === 'archer' || t === 'dread' || t === 'captain' || t === 'legion' || t === 'boss';
type Limbs = Record<string, THREE.Group>;
interface Def { skin: number; cloth: number }

const EAR = 1.07;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const shade = (hex: number, dl: number) => new THREE.Color(hex).offsetHSL(0, 0, dl).getHex();
const DOME = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);

function dome(mat: THREE.Material, rx: number, ry: number, rz: number, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(DOME, mat); m.scale.set(rx, ry, rz); m.position.set(x, y, z); m.castShadow = true;
  const h = new THREE.Mesh(DOME, OUTLINE_MAT); const k = 1 + 0.02 / ((rx + ry + rz) / 3); h.scale.setScalar(k); m.add(h);
  return m;
}

// ---------- shared pieces ----------
function legs(skinMat: THREE.Material, legH: number, spread: number, thick: number, boot: THREE.Material, ring?: THREE.Material) {
  const mk = (sd: number) => {
    const l = new THREE.Group(); l.position.set(sd * spread, legH, 0); const total = legH - 0.05;
    l.add(cap(thick, total - 2 * thick, skinMat, 0, -total / 2, 0, { cast: true, ol: true }));
    l.add(S(1, boot, 0, -legH + 0.06, 0.06, { sx: thick * 1.45, sy: 0.08, sz: thick * 2.0, ol: true }));
    if (ring) l.add(tor(thick * 1.05, 0.022, ring, 0, -legH + 0.2, 0, { rx: Math.PI / 2 }));
    return l;
  };
  return [mk(-1), mk(1)] as const;
}

interface HeadOpts { eye: number; gap: number; iris: number; bias?: number; brows?: number; tusk?: number; ears?: number }
/** standard cute orc head: big round skull, floppy ears, glossy tower-style eyes, nose and tusks */
function eliteHead(def: Def, skinMat: THREE.MeshStandardMaterial, mats: THREE.MeshStandardMaterial[], o: HeadOpts) {
  const head = new THREE.Group();
  head.add(S(0.42, skinMat, 0, 0, 0, { sx: 1.1, sy: 0.96, sz: 1.02, cast: true, ol: true }));
  const inner = M(shade(def.skin, 0.22)); const ears = o.ears ?? 1;
  const mkEar = (sd: number) => {
    const p = new THREE.Group(); p.position.set(sd * 0.44, 0.08, -0.03); p.rotation.z = -sd * EAR;
    p.add(cone(0.13, 0.36 * ears, skinMat, 0, 0, 0, { sz: 0.42, ol: true })); p.add(cone(0.075, 0.27 * ears, inner, 0, 0.02, 0.03, { sz: 0.4 })); head.add(p); return p;
  };
  const earL = mkEar(-1), earR = mkEar(1);
  const face = makeFace({ r: o.eye, gap: o.gap, iris: o.iris, skin: def.skin, mouth: 'grin', cheeks: true, bias: o.bias ?? 0, brows: o.brows, body: { R: 0.43, cy: 0, sy: 0.96, y0: 0.02 } });
  head.add(face);
  mats.push((face.userData.eyes as { lid: THREE.Mesh }[])[0].lid.material as THREE.MeshStandardMaterial);
  head.add(S(0.045, M(shade(def.skin, -0.12)), 0, -0.1, 0.425, { sx: 1.3, sy: 0.9, sz: 0.9 }));
  const tk = o.tusk ?? 1; if (tk > 0) for (const sd of [-1, 1]) head.add(cone(0.045 * tk, 0.13 * tk, M(0xfff7e0), sd * 0.13, -0.215, 0.335, { rz: -sd * 0.12 }));
  return { head, face, earL, earR };
}

/** turns the tower-style eyes into glowing ones: bright emissive sclera, a dark slit pupil, an additive halo and glowing brows */
function glowEyes(face: THREE.Object3D, color: number, irisDark: number) {
  const u = face.userData as { r: number; eyes: { eye: THREE.Group; pupil: THREE.Group }[]; brows?: { m: THREE.Mesh }[] };
  const ball = u.eyes[0].eye.children[0] as THREE.Mesh; const bm = ball.material as THREE.MeshStandardMaterial;
  bm.color.setHex(color); bm.emissive.setHex(color); bm.emissiveIntensity = 1.6; bm.roughness = 0.35;
  const im = (u.eyes[0].pupil.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial; im.color.setHex(irisDark); im.emissive.setHex(irisDark); im.emissiveIntensity = 0.25;
  const halo = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const e of u.eyes) {
    (e.pupil.children[1] as THREE.Mesh).scale.x *= 0.5; // slit pupil
    const h = new THREE.Mesh(SPH, halo); h.scale.setScalar(u.r * 1.9); h.position.z = u.r * 0.15; e.eye.add(h);
  }
  if (u.brows) for (const b of u.brows) { const bmat = b.m.material as THREE.MeshStandardMaterial; bmat.emissive.setHex(color); bmat.emissiveIntensity = 0.9; }
}

/** curved bull-horn made of tapering segments that bend up and then back inwards; the last two segments can be a different (glowing) material */
function horn(sd: number, mat: THREE.Material, len = 0.38, r0 = 0.08, out = 0.85, tip?: THREE.Material) {
  const g = new THREE.Group(); const n = 4; const seg = len / n; let x = 0, y = 0, a = out;
  for (let i = 0; i < n; i++) {
    const rBot = r0 * (1 - i / n) + 0.012, rTop = r0 * (1 - (i + 1) / n) + 0.012;
    g.add(cyl(rTop, rBot, seg * 1.2, tip && i >= n - 2 ? tip : mat, x + sd * Math.sin(a) * seg * 0.5, y + Math.cos(a) * seg * 0.5, 0, { rz: -sd * a, seg: 8, ol: true }));
    x += sd * Math.sin(a) * seg; y += Math.cos(a) * seg; a -= 0.3;
  }
  g.add(S(0.022, tip ?? mat, x, y, 0, { ol: false }));
  return g;
}

// ---------- arrow + bow ----------
const A_WOOD = M(0xd9b98a, 0.1, 0.5), A_TIP = M(0xcbd5e1, 0.2, 0.3), A_F1 = M(0xfffaf0, 0.2), A_F2 = M(0xf97316, 0.25);
const SHAFT = new THREE.CylinderGeometry(0.014, 0.014, 1, 5), TIPG = new THREE.ConeGeometry(0.04, 0.12, 6);
/** an arrow lying along +z: wooden shaft, steel head, three fletchings */
export function makeArrow(len = 0.62) {
  const g = new THREE.Group();
  const sh = new THREE.Mesh(SHAFT, A_WOOD); sh.rotation.x = Math.PI / 2; sh.scale.set(1, len, 1); sh.position.z = len / 2; g.add(sh);
  const tip = new THREE.Mesh(TIPG, A_TIP); tip.rotation.x = Math.PI / 2; tip.position.z = len + 0.04; g.add(tip);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(BOX, i === 0 ? A_F2 : A_F1); f.scale.set(0.1, 0.012, 0.13); f.position.z = 0.07; f.rotation.z = (i * Math.PI) / 3; g.add(f); }
  return g;
}
/** a fat curved bow: the grip is at the origin, the limbs run along ±y and the belly bulges toward +z; the string bends when drawn */
function makeBow() {
  const R = 0.3; const g = new THREE.Group(); const wood = M(0x9a5b25, 0.1, 0.45); const gold = M(0xfbbf24, 0.25, 0.3);
  const arcG = new THREE.TorusGeometry(R, 0.03, 8, 20, Math.PI);
  const arc = new THREE.Mesh(arcG, wood); arc.rotation.set(0, -Math.PI / 2, -Math.PI / 2); arc.position.z = -R; arc.castShadow = true;
  arc.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 8, 20, Math.PI), OUTLINE_MAT)); g.add(arc);
  g.add(S(0.045, M(0x3b2f2f), 0, 0, 0, { sz: 1.4, ol: true }));
  for (const sd of [-1, 1]) g.add(S(0.04, gold, 0, sd * R, -R, { ol: true }));
  const strMat = new THREE.MeshBasicMaterial({ color: 0xfff7e6 });
  const a = new THREE.Mesh(BOX, strMat), b = new THREE.Mesh(BOX, strMat); g.add(a, b);
  const arrow = makeArrow(); g.add(arrow);
  g.userData = { R, a, b, arrow };
  setBowDraw(g, 0, false);
  return g;
}
/** d = 0 (rest) … 1 (fully drawn): bends the string into a V and slides the nocked arrow back with it */
export function setBowDraw(bow: THREE.Object3D, d: number, nocked: boolean) {
  const u = bow.userData as { R: number; a: THREE.Mesh; b: THREE.Mesh; arrow: THREE.Object3D };
  const R = u.R; const nz = -R - 0.3 * d; const N = new THREE.Vector3(0, 0, nz); const Z = new THREE.Vector3(0, 0, 1);
  for (const [m, y] of [[u.a, R], [u.b, -R]] as [THREE.Mesh, number][]) {
    const P = new THREE.Vector3(0, y, -R); const dir = N.clone().sub(P); const len = Math.max(0.001, dir.length());
    m.position.copy(P).add(N).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Z, dir.normalize()); m.scale.set(0.012, 0.012, len);
  }
  u.arrow.visible = nocked; u.arrow.position.z = nz;
}

// ---------- weapons ----------
function greatsword() {
  const g = new THREE.Group(); const blade = M(0x2a2a36, 0.1, 0.3), edge = M(0x5dff8c, 1.3, 0.3), dark = M(0x1a1a22, 0.05, 0.5);
  g.add(cap(0.045, 0.2, dark, 0, 0.12, 0, { ol: true })); g.add(S(0.07, edge, 0, 0, 0, {}));
  g.add(box(0.46, 0.07, 0.1, dark, 0, 0.27, 0, { ol: true }));
  for (const sd of [-1, 1]) g.add(cone(0.05, 0.14, edge, sd * 0.27, 0.27, 0, { rz: -sd * Math.PI / 2 }));
  g.add(box(0.2, 0.95, 0.06, blade, 0, 0.78, 0, { ol: true, cast: true })); g.add(cone(0.1, 0.18, blade, 0, 1.255, 0, { sz: 0.6, ol: true }));
  g.add(box(0.045, 0.85, 0.075, edge, 0, 0.78, 0));
  for (const sd of [-1, 1]) g.add(box(0.016, 0.9, 0.07, edge, sd * 0.1, 0.78, 0));
  return g;
}
function longsword() {
  const g = new THREE.Group(); const steel = M(0xdfe6f0, 0.15, 0.3), gold = M(0xfbbf24, 0.3, 0.3), brown = M(0x5b3a1e);
  g.add(cap(0.04, 0.12, brown, 0, 0.1, 0, { ol: true })); g.add(S(0.055, gold, 0, 0, 0, { ol: true }));
  g.add(box(0.32, 0.055, 0.08, gold, 0, 0.2, 0, { ol: true }));
  g.add(box(0.12, 0.6, 0.035, steel, 0, 0.52, 0, { ol: true, cast: true })); g.add(cone(0.065, 0.14, steel, 0, 0.82, 0, { sz: 0.5, ol: true }));
  return g;
}

// ---------- ARCHER ----------
function buildArcher(def: Def): OrcBuild {
  const skinMat = newSkin(def.skin); const skinMats = [skinMat];
  const leather = M(0x7a4a22), hood = M(def.cloth, 0.1), hoodD = M(shade(def.cloth, -0.1), 0.08), gold = M(0xfbbf24, 0.25, 0.3);
  const bs = 0.88; const limbs: Limbs = {};
  const [legL, legR] = legs(skinMat, 0.3, 0.14 * bs, 0.08, M(0x4a3222));
  const body = new THREE.Group(); body.position.y = 0.55;
  body.add(S(0.3 * bs, skinMat, 0, 0, 0, { sy: 0.92, sz: 0.88, cast: true, ol: true }));
  body.add(S(0.2 * bs, M(shade(def.skin, 0.2)), 0, -0.04 * bs, 0.2 * bs, { sy: 1.1, sz: 0.45 }));
  body.add(cyl(0.25 * bs, 0.34 * bs, 0.2 * bs, hood, 0, -0.2 * bs, 0, { ol: true, cast: true }));
  body.add(tor(0.265 * bs, 0.03, leather, 0, -0.1 * bs, 0, { rx: Math.PI / 2 }));
  body.add(box(0.1, 0.62 * bs, 0.04, leather, 0, 0.05, 0.255 * bs, { rz: 0.7, ol: true })); // quiver strap
  const quiver = new THREE.Group(); quiver.position.set(0.12, 0.08, -0.3 * bs); quiver.rotation.set(0.1, 0, -0.35);
  quiver.add(cyl(0.085, 0.07, 0.42, leather, 0, 0, 0, { ol: true, cast: true, seg: 10 })); quiver.add(tor(0.085, 0.02, gold, 0, 0.2, 0, { rx: Math.PI / 2 }));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; quiver.add(cyl(0.012, 0.012, 0.22, A_WOOD, Math.cos(a) * 0.035, 0.3, Math.sin(a) * 0.035, { seg: 5 })); quiver.add(cone(0.03, 0.07, i % 2 ? A_F1 : A_F2, Math.cos(a) * 0.035, 0.4, Math.sin(a) * 0.035, { ol: false })); }
  body.add(quiver);
  const hd = eliteHead(def, skinMat, skinMats, { eye: 0.13, gap: 0.175, iris: 0x16a34a, brows: 0x365314, tusk: 0.8, ears: 1.2 });
  const head = hd.head; head.position.y = 1.02; head.scale.setScalar(0.95);
  head.add(dome(hood, 0.46, 0.38, 0.45, 0, 0.18, -0.02)); head.add(tor(0.4, 0.04, hoodD, 0, 0.17, 0, { rx: Math.PI / 2 }));
  head.add(cone(0.2, 0.42, hood, 0, 0.12, -0.38, { rx: -2.0, ol: true }));
  head.add(S(0.05, A_F1, 0.3, 0.55, -0.05, { sy: 3.2, sz: 0.4, rz: -0.5 })); head.add(S(0.04, A_F2, 0.37, 0.7, -0.05, { sy: 1.6, sz: 0.4, rz: -0.5 }));
  const armL = orcArm(skinMat), armR = orcArm(skinMat); armL.position.set(-0.28, 0.7, 0); armR.position.set(0.28, 0.7, 0);
  const bow = makeBow(); bow.position.set(0, -0.3, 0.02); bow.rotation.x = Math.PI / 2; armL.add(bow);
  Object.assign(limbs, { legL, legR, body, armL, armR, head, face: hd.face, earL: hd.earL, earR: hd.earR, bow });
  return { parts: [legL, legR, body, armL, armR, head, bow], limbs, skinMats, hpY: 1.85 };
}

// ---------- DREAD KNIGHT (bulky black armour, glowing green) ----------
function buildDread(def: Def): OrcBuild {
  const skinMat = newSkin(def.skin); const skinMats = [skinMat];
  const plate = M(0x2c2c3a, 0.1, 0.34), plateL = M(0x474760, 0.14, 0.3), dark = M(0x08080d, 0.03, 0.5), trim = M(0x16a34a, 0.6, 0.35), glow = M(0x5dff8c, 1.4, 0.3);
  const bs = 1.3; const limbs: Limbs = {};
  const [legL, legR] = legs(skinMat, 0.3, 0.19 * bs, 0.125, plateL, trim);

  // body: a barrel chest of black plate, a lighter front plate with a glowing green gem and chevrons, belt, flared skirt, tattered cape
  const body = new THREE.Group(); body.position.y = 0.58;
  body.add(S(0.3 * bs, skinMat, 0, 0, 0, { sy: 0.95, sz: 0.9, cast: true, ol: true }));
  body.add(S(0.36 * bs, plate, 0, 0.05, 0.03, { sx: 1.08, sy: 0.92, sz: 0.82, cast: true, ol: true }));
  body.add(S(0.2 * bs, plateL, 0, 0.0, 0.26 * bs, { sx: 1.05, sy: 0.95, sz: 0.5, ol: true }));
  body.add(S(0.085, glow, 0, 0.08, 0.47, { sz: 0.55 })); body.add(tor(0.105, 0.02, trim, 0, 0.08, 0.475, {}));
  for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) body.add(box(0.2, 0.035, 0.03, trim, sd * 0.1, -0.1 - i * 0.08, 0.46, { rz: -sd * 0.5 }));
  body.add(tor(0.34 * bs, 0.045, dark, 0, -0.2 * bs, 0, { rx: Math.PI / 2 })); body.add(S(0.065, glow, 0, -0.2 * bs, 0.4 * bs, { sz: 0.5 }));
  body.add(cyl(0.3 * bs, 0.44 * bs, 0.2, plate, 0, -0.3, 0, { ol: true, cast: true })); body.add(tor(0.44 * bs, 0.028, trim, 0, -0.4, 0, { rx: Math.PI / 2 }));
  for (const sd of [-1, 1]) { // big round pauldrons with a glowing ring and three green spikes
    const x = sd * 0.5; body.add(S(0.25, plate, x, 0.3, 0, { ol: true, cast: true })); body.add(tor(0.23, 0.02, glow, x, 0.3, 0, { ry: Math.PI / 2 }));
    for (let i = 0; i < 3; i++) { const ang = sd * (0.3 + 0.45 * i); body.add(cone(0.055, 0.2, trim, x + Math.sin(ang) * 0.23, 0.3 + Math.cos(ang) * 0.23, 0, { rz: -ang, ol: true })); }
  }
  body.add(box(0.8 * bs, 0.85, 0.05, dark, 0, -0.02, -0.36 * bs, { rx: 0.1, ol: true, cast: true })); body.add(box(0.8 * bs, 0.05, 0.06, trim, 0, -0.45, -0.37 * bs, { rx: 0.1 }));

  const armL = orcArm(skinMat), armR = orcArm(skinMat);
  armL.scale.setScalar(1.25); armR.scale.setScalar(1.25); armL.position.set(-0.52, 0.84, 0); armR.position.set(0.52, 0.84, 0);

  // head: black horned helmet, a dark visor slot with glowing green eyes, a glowing grille instead of a mouth, glowing horn tips and a crest
  const head = new THREE.Group(); head.position.y = 1.22; head.scale.setScalar(1.18);
  head.add(S(0.43, skinMat, 0, 0, 0, { sx: 1.1, sy: 0.98, sz: 1.02, cast: true, ol: true }));
  head.add(S(0.3, dark, 0, -0.01, 0.34, { sx: 1.3, sy: 0.6, sz: 0.28 }));
  head.add(S(0.16, dark, 0, -0.2, 0.34, { sx: 1.5, sy: 0.6, sz: 0.3 }));
  for (let i = -2; i <= 2; i++) head.add(box(0.022, 0.1, 0.03, glow, i * 0.055, -0.2, 0.395, {}));
  head.add(box(0.07, 0.14, 0.5, plate, 0, 0.44, -0.02, { ol: true })); head.add(box(0.03, 0.05, 0.44, glow, 0, 0.52, -0.02, {}));
  head.add(tor(0.4, 0.03, trim, 0, 0.24, 0, { rx: Math.PI / 2 }));
  for (const sd of [-1, 1]) {
    const h = horn(sd, plate, 0.5, 0.1, 0.9, glow); h.position.set(sd * 0.36, 0.2, 0.0); head.add(h);
    head.add(cone(0.045, 0.14, trim, sd * 0.4, -0.12, 0.2, { rz: -sd * 1.2 })); // cheek spikes
  }
  const face = makeFace({ r: 0.125, gap: 0.17, iris: 0x14532d, skin: def.skin, mouth: 'none', cheeks: false, bias: 0.9, brows: 0x16a34a, body: { R: 0.43, cy: 0, sy: 0.98, y0: 0.03 } });
  head.add(face); glowEyes(face, 0x66ff8f, 0x14532d);
  skinMats.push((face.userData.eyes as { lid: THREE.Mesh }[])[0].lid.material as THREE.MeshStandardMaterial);
  const sword = greatsword(); sword.position.set(0, -0.3, 0.04); sword.rotation.x = 2.7; armR.add(sword);
  Object.assign(limbs, { legL, legR, body, armL, armR, head, face, sword });
  return { parts: [legL, legR, body, armL, armR, head, sword], limbs, skinMats, hpY: 2.6 };
}

// ---------- WAR CAPTAIN ----------
function buildCaptain(def: Def): OrcBuild {
  const skinMat = newSkin(def.skin); const skinMats = [skinMat];
  const steel = M(0xb7c0cf, 0.12, 0.33), red = M(0xb91c1c, 0.14, 0.5), redD = M(0x7f1d1d, 0.1, 0.5), gold = M(0xfbbf24, 0.3, 0.3), dark = M(0x1f2937, 0.05, 0.5);
  const bs = 1.22; const limbs: Limbs = {};
  const [legL, legR] = legs(skinMat, 0.34, 0.15 * bs, 0.1, M(0x3b2a1a), gold);
  const body = new THREE.Group(); body.position.y = 0.6;
  body.add(S(0.3 * bs, skinMat, 0, 0, 0, { sy: 0.92, sz: 0.88, cast: true, ol: true }));
  body.add(S(0.27 * bs, red, 0, 0.02, 0.18 * bs, { sy: 1.05, sz: 0.62, ol: true }));
  body.add(S(0.09 * bs, gold, 0, 0.06, 0.35 * bs, { sz: 0.45, ol: true }));
  for (const sd of [-1, 1]) body.add(box(0.18, 0.035, 0.03, gold, sd * 0.1, -0.06, 0.36, { rz: -sd * 0.5 }));
  body.add(tor(0.3 * bs, 0.04, gold, 0, -0.17 * bs, 0, { rx: Math.PI / 2 }));
  body.add(cyl(0.26 * bs, 0.38 * bs, 0.2, red, 0, -0.26, 0, { ol: true, cast: true })); body.add(tor(0.38 * bs, 0.026, gold, 0, -0.35, 0, { rx: Math.PI / 2 }));
  for (const sd of [-1, 1]) { body.add(S(0.17 * bs, steel, sd * 0.38 * bs, 0.2 * bs, 0, { ol: true, cast: true })); body.add(tor(0.15 * bs, 0.022, gold, sd * 0.38 * bs, 0.2 * bs, 0, { rx: Math.PI / 2 })); }
  body.add(box(0.8 * bs, 0.8 * bs, 0.06, redD, 0, -0.04, -0.3 * bs, { rx: 0.12, ol: true, cast: true })); // cape
  const banner = new THREE.Group(); banner.position.set(-0.2 * bs, 0.05, -0.38 * bs); body.add(banner);
  banner.add(cap(0.028, 1.45, M(0xe7e5e4, 0.1, 0.4), 0, 0.85, 0, { ol: true, cast: true })); banner.add(S(0.06, gold, 0, 1.64, 0, { ol: true }));
  const flag = new THREE.Group(); flag.position.set(0, 1.45, 0); banner.add(flag);
  flag.add(box(0.5, 0.36, 0.03, red, 0.27, 0, 0, { ol: true, cast: true }));
  flag.add(box(0.5, 0.04, 0.035, gold, 0.27, 0.16, 0)); flag.add(box(0.5, 0.04, 0.035, gold, 0.27, -0.16, 0));
  flag.add(S(0.075, M(0xfffaf0, 0.2), 0.27, 0.0, 0.025, { sz: 0.4 })); flag.add(S(0.016, dark, 0.245, 0.01, 0.05, {})); flag.add(S(0.016, dark, 0.295, 0.01, 0.05, {}));
  const hd = eliteHead(def, skinMat, skinMats, { eye: 0.125, gap: 0.175, iris: 0xf59e0b, brows: 0x1f3d19, tusk: 1.3, ears: 0.9, bias: 0.3 });
  const head = hd.head; head.position.y = 1.15; head.scale.setScalar(1.08);
  head.add(dome(steel, 0.45, 0.34, 0.43, 0, 0.26, 0)); head.add(tor(0.43, 0.04, gold, 0, 0.26, 0, { rx: Math.PI / 2 }));
  head.add(box(0.07, 0.2, 0.06, steel, 0, 0.1, 0.42, { ol: true })); // nose guard
  for (const sd of [-1, 1]) head.add(box(0.07, 0.24, 0.26, steel, sd * 0.4, 0.06, 0.05, { ol: true })); // cheek plates
  head.add(cap(0.075, 0.55, red, 0, 0.62, -0.12, { rx: 1.25, ol: true })); head.add(S(0.1, red, 0, 0.66, 0.1, { ol: true })); head.add(cone(0.06, 0.2, red, 0, 0.6, 0.12, {}));
  const armL = orcArm(skinMat), armR = orcArm(skinMat); armL.position.set(-0.4, 0.82, 0); armR.position.set(0.4, 0.82, 0);
  const sword = longsword(); sword.position.set(0, -0.3, 0.04); sword.rotation.x = 1.15; armR.add(sword);
  Object.assign(limbs, { legL, legR, body, armL, armR, head, face: hd.face, earL: hd.earL, earR: hd.earR, flag, sword });
  return { parts: [legL, legR, body, armL, armR, head, sword], limbs, skinMats, hpY: 2.5 };
}

// ---------- LEGION SOLDIER ----------
function buildLegion(def: Def): OrcBuild {
  const skinMat = newSkin(def.skin); const skinMats = [skinMat];
  const steel = M(0xaab4c6, 0.12, 0.35), red = M(0xb91c1c, 0.14, 0.5), gold = M(0xfbbf24, 0.3, 0.3), wood = M(0x8a5a2b), blue = M(def.cloth, 0.1, 0.45);
  const bs = 1.08; const limbs: Limbs = {};
  const [legL, legR] = legs(skinMat, 0.33, 0.15 * bs, 0.09, M(0x3b2a1a), steel);
  const body = new THREE.Group(); body.position.y = 0.58;
  body.add(S(0.3 * bs, skinMat, 0, 0, 0, { sy: 0.92, sz: 0.88, cast: true, ol: true }));
  body.add(S(0.27 * bs, steel, 0, 0.02, 0.17 * bs, { sy: 1.0, sz: 0.62, ol: true }));
  for (const y of [0.12, 0.0, -0.1]) body.add(tor(0.27 * bs, 0.022, blue, 0, y * bs, 0.02, { rx: Math.PI / 2 })); // segmented plates
  body.add(cyl(0.25 * bs, 0.35 * bs, 0.2 * bs, red, 0, -0.2 * bs, 0, { ol: true, cast: true })); body.add(tor(0.3 * bs, 0.03, M(0x3b2a1a), 0, -0.1 * bs, 0, { rx: Math.PI / 2 }));
  for (const sd of [-1, 1]) body.add(S(0.14 * bs, steel, sd * 0.34 * bs, 0.2 * bs, 0, { ol: true, cast: true }));
  const shield = new THREE.Group(); shield.position.set(-0.34 * bs, 0.0, 0.3 * bs); shield.rotation.set(0, 0.3, 0); body.add(shield);
  shield.add(cyl(0.3, 0.3, 0.07, red, 0, 0, 0, { rx: Math.PI / 2, ol: true, cast: true, seg: 22 })); shield.add(tor(0.3, 0.035, steel, 0, 0, 0.035, {}));
  shield.add(S(0.1, gold, 0, 0, 0.07, { sz: 0.6, ol: true })); shield.add(box(0.5, 0.06, 0.02, gold, 0, 0, 0.05)); shield.add(box(0.06, 0.5, 0.02, gold, 0, 0, 0.05));
  const hd = eliteHead(def, skinMat, skinMats, { eye: 0.125, gap: 0.175, iris: 0x0ea5e9, brows: 0x365314, tusk: 0.9 });
  const head = hd.head; head.position.y = 1.08; head.scale.setScalar(1.0);
  head.add(dome(steel, 0.45, 0.34, 0.43, 0, 0.26, 0)); head.add(tor(0.43, 0.035, gold, 0, 0.26, 0, { rx: Math.PI / 2 }));
  head.add(box(0.06, 0.18, 0.05, steel, 0, 0.1, 0.42, { ol: true }));
  for (const sd of [-1, 1]) head.add(box(0.06, 0.2, 0.22, steel, sd * 0.4, 0.06, 0.05, { ol: true }));
  head.add(cap(0.07, 0.5, red, 0, 0.58, -0.15, { rx: Math.PI / 2, ol: true })); head.add(cone(0.06, 0.2, red, 0, 0.55, 0.12, {}));
  const armL = orcArm(skinMat), armR = orcArm(skinMat); armL.position.set(-0.32, 0.76, 0); armR.position.set(0.32, 0.76, 0);
  const spear = new THREE.Group(); spear.position.set(0, -0.3, 0.04); spear.rotation.x = 0.35; armR.add(spear);
  spear.add(cap(0.03, 1.2, wood, 0, 0.55, 0, { ol: true, cast: true })); spear.add(cone(0.06, 0.22, steel, 0, 1.2, 0, { ol: true })); spear.add(S(0.05, red, 0, 1.12, 0, {}));
  Object.assign(limbs, { legL, legR, body, armL, armR, head, face: hd.face, earL: hd.earL, earR: hd.earR, shield, spear });
  return { parts: [legL, legR, body, armL, armR, head, spear], limbs, skinMats, hpY: 2.15 };
}

// ---------- RAJA ORC (the king) ----------
function buildKing(def: Def): OrcBuild {
  const skinMat = newSkin(def.skin); const skinMats = [skinMat];
  const gold = M(0xfbbf24, 0.35, 0.28), goldD = M(0xd97706, 0.25, 0.32), robe = M(0xb91c1c, 0.14, 0.5), purple = M(0x6d28d9, 0.14, 0.5), fur = M(0xfaf5ee, 0.18, 0.9);
  const dark = M(0x2a1a0a, 0.05, 0.6), blue = M(0x38bdf8, 0.9, 0.3), ruby = M(0xf43f5e, 0.8, 0.3), wood = M(0x6b4423, 0.08, 0.6);
  const bs = 1.38; const limbs: Limbs = {};
  const [legL, legR] = legs(skinMat, 0.32, 0.16 * bs, 0.11, goldD, gold); // golden boots + anklets

  // body: red royal tunic with a golden medallion and belt, flared skirt with a fur hem, a fat white fur collar, gold pauldrons, a purple ermine cape
  const body = new THREE.Group(); body.position.y = 0.62;
  body.add(S(0.3 * bs, skinMat, 0, 0, 0, { sy: 0.95, sz: 0.9, cast: true, ol: true }));
  body.add(S(0.28 * bs, robe, 0, 0, 0.12 * bs, { sx: 1.05, sy: 0.98, sz: 0.78, cast: true, ol: true }));
  body.add(S(0.1, gold, 0, 0.05, 0.47, { sz: 0.4, ol: true })); body.add(S(0.05, blue, 0, 0.05, 0.495, { sz: 0.5 }));
  body.add(tor(0.3 * bs, 0.04, gold, 0, -0.16 * bs, 0.02, { rx: Math.PI / 2 }));
  body.add(S(0.09, gold, 0, -0.22, 0.42, { sz: 0.4, ol: true })); body.add(S(0.04, ruby, 0, -0.22, 0.45, { sz: 0.5 }));
  body.add(cyl(0.27 * bs, 0.42 * bs, 0.22, robe, 0, -0.3, 0, { ol: true, cast: true })); body.add(tor(0.41 * bs, 0.06, fur, 0, -0.38, 0, { rx: Math.PI / 2 }));
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; body.add(S(0.1 * bs, fur, Math.sin(a) * 0.3 * bs, 0.3 * bs, Math.cos(a) * 0.26 * bs, { sy: 0.8, ol: true })); }
  for (const sd of [-1, 1]) {
    body.add(S(0.2 * bs, gold, sd * 0.4 * bs, 0.2 * bs, 0, { ol: true, cast: true })); body.add(S(0.15 * bs, fur, sd * 0.4 * bs, 0.3 * bs, 0, { sy: 0.6, ol: true }));
    body.add(cone(0.05, 0.16, gold, sd * 0.4 * bs, 0.36 * bs, 0, { ol: true }));
  }
  body.add(box(0.78 * bs, 0.8 * bs, 0.07, purple, 0, -0.02, -0.3 * bs, { rx: 0.12, ol: true, cast: true }));
  body.add(box(0.8 * bs, 0.09, 0.09, fur, 0, -0.5, -0.31 * bs, { rx: 0.12 }));
  for (let i = 0; i < 5; i++) body.add(S(0.02, dark, (i - 2) * 0.15 * bs, -0.5, -0.31 * bs - 0.05, {}));

  const armL = orcArm(skinMat), armR = orcArm(skinMat);
  for (const a of [armL, armR]) { a.scale.setScalar(1.2); a.add(tor(0.105, 0.03, gold, 0, -0.2, 0, { rx: Math.PI / 2 })); } // gold bracers
  armL.position.set(-0.56, 0.9, 0); armR.position.set(0.56, 0.9, 0);

  // head: a regal orc – amber eyes under thick brows, big tusks, a goatee, golden earrings and a tall jewelled crown
  const hd = eliteHead(def, skinMat, skinMats, { eye: 0.13, gap: 0.18, iris: 0xfbbf24, brows: 0x2a1a0a, tusk: 1.9, ears: 0.85, bias: 0.45 });
  const head = hd.head; head.position.y = 1.2; head.scale.setScalar(1.14);
  head.add(cyl(0.32, 0.36, 0.14, gold, 0, 0.38, 0, { seg: 16, ol: true, cast: true }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    head.add(cone(0.075, 0.26, gold, Math.sin(a) * 0.31, 0.44, Math.cos(a) * 0.31, { ol: true }));
    head.add(S(0.035, i % 2 ? ruby : blue, Math.sin(a) * 0.31, 0.72, Math.cos(a) * 0.31, {}));
  }
  head.add(cone(0.09, 0.32, gold, 0, 0.46, 0, { ol: true })); head.add(S(0.045, ruby, 0, 0.8, 0, {}));
  for (const k of [-1, 0, 1]) head.add(S(0.045, k === 0 ? ruby : blue, k * 0.14, 0.38, Math.sqrt(0.1156 - (k * 0.14) * (k * 0.14)) + 0.01, {}));
  for (const sd of [-1, 1]) head.add(tor(0.05, 0.015, gold, sd * 0.5, 0.0, 0, { ry: Math.PI / 2 }));
  head.add(S(0.09, dark, 0, -0.36, 0.3, { sx: 1.2, sy: 1.2, sz: 0.6, ol: true })); // goatee

  // golden royal war hammer with gems
  const weapon = new THREE.Group();
  weapon.add(cap(0.055, 0.75, wood, 0, 0.45, 0, { ol: true, cast: true }));
  weapon.add(cyl(0.2, 0.2, 0.52, gold, 0, 0.95, 0, { rz: Math.PI / 2, ol: true, cast: true }));
  for (const sd of [-1, 1]) { weapon.add(cyl(0.215, 0.215, 0.07, goldD, sd * 0.2, 0.95, 0, { rz: Math.PI / 2 })); weapon.add(S(0.075, sd > 0 ? ruby : blue, sd * 0.3, 0.95, 0, { ol: true })); }
  weapon.add(cone(0.07, 0.18, gold, 0, 1.15, 0, { ol: true }));
  weapon.position.set(0, -0.29, 0.04); weapon.rotation.x = 1.15; weapon.scale.setScalar(1.1); armR.add(weapon);

  Object.assign(limbs, { legL, legR, body, armL, armR, head, face: hd.face, earL: hd.earL, earR: hd.earR, weapon });
  return { parts: [legL, legR, body, armL, armR, head, weapon], limbs, skinMats, hpY: 2.6 };
}

export function buildElite(kind: EliteKind, def: Def): OrcBuild {
  switch (kind) {
    case 'archer': return buildArcher(def);
    case 'dread': return buildDread(def);
    case 'captain': return buildCaptain(def);
    case 'boss': return buildKing(def);
    default: return buildLegion(def);
  }
}

// ---------- animation ----------
/** walking pose: waddle, swinging arms, flapping ears, waving banner */
export function poseElite(kind: EliteKind, L: Limbs, ph: number, time: number) {
  const sw = Math.sin(ph) * (kind === 'dread' ? 0.5 : kind === 'boss' ? 0.45 : 0.65);
  L.legL.rotation.x = sw; L.legR.rotation.x = -sw;
  L.head.rotation.z = Math.sin(ph * 0.5) * 0.06; L.head.rotation.x = Math.sin(ph * 2) * 0.04;
  L.body.rotation.z = Math.sin(ph) * 0.04; L.body.rotation.x = 0;
  if (L.earL) { L.earL.rotation.z = EAR + Math.sin(ph * 2) * 0.12; L.earR.rotation.z = -EAR - Math.sin(ph * 2 + 1) * 0.12; }
  if (L.flag) { L.flag.rotation.y = Math.sin(time * 5 + ph * 0.1) * 0.22; L.flag.rotation.z = Math.sin(time * 3.1) * 0.05; }
  switch (kind) {
    case 'archer': L.armL.rotation.set(-1.25, 0, 0.2); L.armR.rotation.set(-0.5 + Math.sin(ph * 0.5) * 0.2, 0, 0.12); break;
    case 'dread': L.armR.rotation.set(-2.0 + Math.sin(ph * 0.5) * 0.07, 0, 0.12); L.armL.rotation.set(-sw * 0.6, 0, -0.15); break;
    case 'captain': L.armR.rotation.set(-1.1 + Math.sin(ph * 0.5) * 0.1, 0, 0.12); L.armL.rotation.set(-sw * 0.8, 0, -0.12); break;
    case 'boss': L.armR.rotation.set(-0.9 + Math.sin(ph * 0.5) * 0.08, 0, 0.12); L.armL.rotation.set(-sw * 0.5, 0, -0.12); break;
    default: L.armR.rotation.set(-0.5 + Math.sin(ph * 0.5) * 0.1, 0, 0.12); L.armL.rotation.set(-0.9, 0, -0.5); break;
  }
}
/** the Dread Knight's attack: wind-up (sword over the head, leaning back) -> a fast overhead chop -> rest, then the sword rises again */
export function poseDread(L: Limbs, phase: string, k: number) {
  const e1 = (x: number) => x * x * (3 - 2 * x);
  let th = -2.0, lean = 0;
  if (phase === 'wind') { const t = e1(clamp(k)); th = -2.0 - 1.1 * t; lean = -0.28 * t; }
  else if (phase === 'swing') { const s = clamp(k) * clamp(k); th = -3.1 + 2.7 * s; lean = -0.28 + 0.66 * s; }
  else if (phase === 'rest') { const t = e1(clamp(k)); th = -0.4 - 1.6 * t; lean = 0.38 * (1 - t); }
  L.armR.rotation.set(th, 0, 0.1); L.armL.rotation.set(th * 0.55, 0, -0.25);
  L.body.rotation.x = lean; L.head.rotation.x = lean * 0.5;
}
