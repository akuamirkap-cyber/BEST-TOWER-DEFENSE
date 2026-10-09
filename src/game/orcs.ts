import * as THREE from 'three';
import { BOX, SPH, OUTLINE_MAT, makeFace, makeFlame, makeBlast } from './voxel';

/**
 * Cute round orcs (Bloons-monkey style): giant head, pear-shaped body, stubby capsule limbs,
 * thick dark outline, big floppy ears, little tusks – and the SAME glossy blinking eyes as the towers.
 * No red eyes anywhere: every orc has its own warm/cool iris colour.
 */
export type OrcKind = 'normal' | 'fast' | 'tank' | 'shaman' | 'berserker' | 'boss' | 'baby' | 'gunner' | 'jumper' | 'cannoneer' | 'ninja' | 'bomber' | 'magnet' | 'frost' | 'rider' | 'fatty' | 'punk' | 'shield' | 'toxic' | 'bat' | 'troll';
type Limbs = Record<string, THREE.Group>;
interface Def { skin: number; cloth: number }
export interface OrcBuild { parts: THREE.Object3D[]; limbs: Limbs; skinMats: THREE.MeshStandardMaterial[]; hpY: number }

const OL = 0.02; // outline thickness in model units
const EAR = 1.07; // ear tilt (rad) – pointing out and up
const Y = new THREE.Vector3(0, 1, 0);

// ---------- caches ----------
const MATS = new Map<string, THREE.MeshStandardMaterial>();
export function M(color: number, glow = 0.08, rough = 0.55) {
  const k = color + '|' + glow + '|' + rough; let m = MATS.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: rough, emissive: color, emissiveIntensity: glow }); MATS.set(k, m); }
  return m;
}
/** per-enemy skin material (tinted when hit / slowed / poisoned, so it must not be shared) */
export function newSkin(color: number) { return new THREE.MeshStandardMaterial({ color, roughness: 0.55, emissive: color, emissiveIntensity: 0.08 }); }
const GLASS = new THREE.MeshStandardMaterial({ color: 0x9fe3ff, roughness: 0.1, transparent: true, opacity: 0.4, emissive: 0x38bdf8, emissiveIntensity: 0.25, depthWrite: false });
const GEOS = new Map<string, THREE.BufferGeometry>();
function G<T extends THREE.BufferGeometry>(key: string, make: () => T): T { let g = GEOS.get(key); if (!g) { g = make(); GEOS.set(key, g); } return g as T; }
const shade = (hex: number, dl: number) => new THREE.Color(hex).offsetHSL(0, 0, dl).getHex();

// ---------- mesh helpers (all rounded, all outlined) ----------
interface O { sx?: number; sy?: number; sz?: number; rx?: number; ry?: number; rz?: number; cast?: boolean; ol?: boolean; seg?: number }
function fin(m: THREE.Mesh, x: number, y: number, z: number, o: O) { m.position.set(x, y, z); m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0); m.castShadow = !!o.cast; return m; }
const sc = (m: THREE.Mesh, o: O) => { if (o.sx !== undefined || o.sy !== undefined || o.sz !== undefined) m.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1); };
function hull(m: THREE.Mesh, kr: number, kh: number) { const h = new THREE.Mesh(m.geometry, OUTLINE_MAT); h.scale.set(kr, kh, kr); m.add(h); }

export function S(r: number, mat: THREE.Material, x = 0, y = 0, z = 0, o: O = {}) {
  const m = new THREE.Mesh(SPH, mat); const sx = o.sx ?? 1, sy = o.sy ?? 1, sz = o.sz ?? 1;
  m.scale.set(r * sx, r * sy, r * sz); fin(m, x, y, z, o);
  if (o.ol) { const k = 1 + OL / ((r * (sx + sy + sz)) / 3); hull(m, k, k); }
  return m;
}
export function cap(r: number, len: number, mat: THREE.Material, x = 0, y = 0, z = 0, o: O = {}) {
  const m = new THREE.Mesh(G(`cap${r}|${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10)), mat); fin(m, x, y, z, o); sc(m, o);
  if (o.ol) hull(m, 1 + OL / r, 1 + (OL * 2) / (len + 2 * r));
  return m;
}
export function cyl(rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, o: O = {}) {
  const seg = o.seg ?? 14;
  const m = new THREE.Mesh(G(`cyl${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat); fin(m, x, y, z, o); sc(m, o);
  if (o.ol) hull(m, 1 + OL / Math.max(rt, rb), 1 + (OL * 2) / h);
  return m;
}
/** cone with its BASE at the origin and the tip pointing up (+y) */
export function cone(r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, o: O = {}) {
  const m = new THREE.Mesh(G(`cone${r}|${h}`, () => new THREE.ConeGeometry(r, h, 10).translate(0, h / 2, 0)), mat); fin(m, x, y, z, o); sc(m, o);
  if (o.ol) hull(m, 1 + OL / r, 1 + OL / h);
  return m;
}
/** torus – lies flat (ring around a vertical axis) when rx = PI/2 */
export function tor(R: number, t: number, mat: THREE.Material, x = 0, y = 0, z = 0, o: O = {}) {
  const m = new THREE.Mesh(G(`tor${R}|${t}`, () => new THREE.TorusGeometry(R, t, 8, 22)), mat); fin(m, x, y, z, o); sc(m, o); return m;
}
export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, o: O = {}) {
  const m = new THREE.Mesh(BOX, mat); m.scale.set(w, h, d); fin(m, x, y, z, o);
  if (o.ol) { const k = 1 + OL / ((w + h + d) / 3); hull(m, k, k); }
  return m;
}
function domeMesh(mat: THREE.Material, rx: number, ry: number, rz: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(G('dome', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat);
  m.scale.set(rx, ry, rz); m.position.set(x, y, z); m.castShadow = true;
  const k = 1 + OL / ((rx + ry + rz) / 3); hull(m, k, k); return m;
}

// ---------- per-kind proportions ----------
interface Cfg { legH: number; bodyS: number; bodyY: number; headS: number; headY: number; armX: number; armY: number; eye: number; gap: number; iris: number; bias: number; ears: number; tusk: number; brows?: number; mouth: 'grin' | 'none'; hpY: number }
const N: Cfg = { legH: 0.34, bodyS: 1, bodyY: 0.58, headS: 1, headY: 1.06, armX: 0.3, armY: 0.72, eye: 0.125, gap: 0.175, iris: 0x7c4a1e, bias: 0, ears: 1, tusk: 1, brows: 0x35692c, mouth: 'grin', hpY: 1.95 };
const CFG: Record<OrcKind, Cfg> = {
  normal: N,
  fast: { ...N, bodyS: 0.85, bodyY: 0.56, headS: 0.95, headY: 1.0, armX: 0.27, armY: 0.69, eye: 0.135, iris: 0x0ea5e9, ears: 1.6, tusk: 0.7, brows: 0x4d7c0f, hpY: 1.85 },
  tank: { ...N, bodyS: 1.3, bodyY: 0.66, headY: 1.17, armX: 0.42, armY: 0.82, eye: 0.118, iris: 0x92400e, bias: 0.3, ears: 0.9, tusk: 1.2, brows: 0x1f3d19, hpY: 2.25 },
  shaman: { ...N, legH: 0.3, bodyS: 0.95, bodyY: 0.55, headY: 1.02, armX: 0.29, armY: 0.68, eye: 0.13, iris: 0x8b5cf6, ears: 1.2, tusk: 0.8, brows: 0x2f6f5c, hpY: 2.05 },
  berserker: { ...N, bodyS: 1.1, bodyY: 0.62, headY: 1.1, armX: 0.34, armY: 0.76, eye: 0.12, iris: 0xf59e0b, bias: 0.55, ears: 1.1, tusk: 1.3, brows: 0x5b2a0a, hpY: 2.1 },
  boss: { ...N, legH: 0.36, bodyS: 1.3, bodyY: 0.68, headS: 1.1, headY: 1.22, armX: 0.43, armY: 0.84, eye: 0.12, iris: 0xfbbf24, bias: 0.4, ears: 1.1, tusk: 1.6, brows: 0x1c1917, hpY: 2.5 },
  baby: { ...N, legH: 0.26, bodyS: 0.82, bodyY: 0.46, headS: 1.35, headY: 1.1, armX: 0.24, armY: 0.6, eye: 0.155, gap: 0.18, iris: 0x38bdf8, ears: 0.8, tusk: 0, brows: undefined, mouth: 'none', hpY: 2.25 },
  gunner: { ...N, iris: 0x22c55e, brows: 0x365314 },
  jumper: { ...N, iris: 0x0ea5e9, brows: 0x365314 },
  cannoneer: { ...N, bodyS: 1.05, bodyY: 0.6, headY: 1.08, armX: 0.31, armY: 0.74, iris: 0xf59e0b, brows: 0x1e3d19 },
  ninja: { ...N, bodyS: 0.88, bodyY: 0.55, headS: 0.95, headY: 0.98, armX: 0.28, armY: 0.68, eye: 0.12, iris: 0xef4444, bias: 0.4, ears: 0.9, tusk: 0.6, brows: 0x0f172a, hpY: 1.9 },
  bomber: { ...N, bodyS: 0.92, bodyY: 0.54, headS: 1.05, headY: 1.04, armX: 0.29, armY: 0.68, eye: 0.14, iris: 0xf97316, bias: 0.55, ears: 1.2, tusk: 0.8, brows: 0x7c2d12, hpY: 2.0 },
  magnet: { ...N, bodyS: 1.28, bodyY: 0.65, headY: 1.15, armX: 0.42, armY: 0.8, eye: 0.118, iris: 0x3b82f6, bias: 0.35, ears: 0.9, tusk: 1.3, brows: 0x1e293b, hpY: 2.25 },
  frost: { ...N, legH: 0.3, bodyS: 0.95, bodyY: 0.55, headY: 1.02, armX: 0.29, armY: 0.68, eye: 0.13, iris: 0x06b6d4, ears: 1.1, tusk: 0.7, brows: 0x0e7490, hpY: 2.05 },
  rider: { ...N, bodyS: 1.25, bodyY: 0.75, headY: 1.3, armX: 0.4, armY: 0.92, eye: 0.12, iris: 0xeab308, bias: 0.3, ears: 1.0, tusk: 1.4, brows: 0x334155, hpY: 2.45 },
  fatty: { ...N, legH: 0.32, bodyS: 1.45, bodyY: 0.68, headS: 1.15, headY: 1.22, armX: 0.46, armY: 0.82, eye: 0.12, iris: 0xb45309, bias: 0.3, ears: 1.1, tusk: 1.3, brows: 0x451a03, hpY: 2.45 },
  punk: { ...N, bodyS: 0.94, bodyY: 0.58, headS: 1.0, headY: 1.06, armX: 0.3, armY: 0.72, eye: 0.13, iris: 0xdc2626, bias: 0.5, ears: 1.3, tusk: 1.1, brows: 0x991b1b, hpY: 2.15 },
  shield: { ...N, bodyS: 1.24, bodyY: 0.64, headY: 1.14, armX: 0.42, armY: 0.8, eye: 0.118, iris: 0x64748b, bias: 0.25, ears: 0.9, tusk: 1.1, brows: 0x1e293b, hpY: 2.25 },
  toxic: { ...N, bodyS: 0.96, bodyY: 0.57, headY: 1.05, armX: 0.3, armY: 0.72, eye: 0.13, iris: 0x16a34a, bias: 0.45, ears: 1.0, tusk: 0.8, brows: 0x14532d, hpY: 2.05 },
  bat: { ...N, bodyS: 0.86, bodyY: 0.54, headS: 0.95, headY: 1.0, armX: 0.27, armY: 0.67, eye: 0.135, iris: 0x9333ea, bias: 0.5, ears: 1.6, tusk: 1.4, brows: 0x581c87, hpY: 2.05 },
  troll: { ...N, legH: 0.38, bodyS: 1.38, bodyY: 0.72, headS: 1.1, headY: 1.26, armX: 0.45, armY: 0.86, eye: 0.12, iris: 0x15803d, bias: 0.35, ears: 1.2, tusk: 1.5, brows: 0x064e3b, hpY: 2.5 },
};

// ---------- head: big round head, floppy ears, tower-style glossy eyes ----------
function orcHead(kind: OrcKind, def: Def, skinMat: THREE.MeshStandardMaterial, mats: THREE.MeshStandardMaterial[], c: Cfg, hat = true) {
  const head = new THREE.Group();
  head.add(S(0.42, skinMat, 0, 0, 0, { sx: 1.1, sy: 0.96, sz: 1.02, cast: true, ol: true }));
  const inner = M(shade(def.skin, 0.22));
  const mkEar = (sd: number) => {
    const p = new THREE.Group(); p.position.set(sd * 0.44, 0.08, -0.03); p.rotation.z = -sd * EAR;
    p.add(cone(0.13, 0.36 * c.ears, skinMat, 0, 0, 0, { sz: 0.42, ol: true }));
    p.add(cone(0.075, 0.27 * c.ears, inner, 0, 0.02, 0.03, { sz: 0.4 }));
    head.add(p); return p;
  };
  const earL = mkEar(-1), earR = mkEar(1);

  const face = makeFace({ r: c.eye, gap: c.gap, iris: c.iris, skin: def.skin, mouth: c.mouth, cheeks: true, bias: c.bias, brows: c.brows, body: { R: 0.43, cy: 0, sy: 0.96, y0: 0.02 } });
  head.add(face);
  const eyes = face.userData.eyes as { eye: THREE.Group; lid: THREE.Mesh }[];
  mats.push(eyes[0].lid.material as THREE.MeshStandardMaterial);
  head.add(S(0.045, M(shade(def.skin, -0.12)), 0, -0.1, 0.425, { sx: 1.3, sy: 0.9, sz: 0.9 }));
  if (c.tusk > 0) for (const sd of [-1, 1]) head.add(cone(0.045 * c.tusk, 0.13 * c.tusk, M(0xfff7e0), sd * 0.13, -0.215, 0.335, { rz: -sd * 0.12 }));

  if (hat) {
    const gold = M(0xfbbf24, 0.25, 0.3), steel = M(0x9aa4b5, 0.1, 0.35);
    switch (kind) {
      case 'normal': // one cute curl of hair
        for (const [x, h] of [[-0.07, 0.16], [0, 0.23], [0.07, 0.16]] as [number, number][]) head.add(cone(0.045, h, M(0x3b2f2f), x, 0.37, 0.03, { rz: -x * 2.2 }));
        break;
      case 'fast': // goblin: sweatband with a knot + orange tuft + huge ears
        head.add(tor(0.325, 0.04, M(def.cloth, 0.12), 0, 0.3, 0, { rx: Math.PI / 2 }));
        head.add(S(0.06, M(def.cloth, 0.12), 0, 0.3, -0.33));
        for (const sd of [-1, 1]) head.add(box(0.05, 0.16, 0.02, M(def.cloth), sd * 0.05, 0.2, -0.37, { rz: sd * 0.4 }));
        head.add(cone(0.05, 0.18, M(0xf97316), 0, 0.38, 0.03));
        break;
      case 'tank': // heavy helmet with ivory horns
        head.add(domeMesh(steel, 0.44, 0.34, 0.42, 0, 0.27, 0));
        head.add(tor(0.435, 0.04, steel, 0, 0.27, 0, { rx: Math.PI / 2 }));
        for (const sd of [-1, 1]) { head.add(cone(0.075, 0.3, M(0xfff7e0), sd * 0.37, 0.34, 0, { rz: -sd * 0.85, ol: true })); head.add(S(0.04, gold, sd * 0.3, 0.45, 0.2)); }
        break;
      case 'shaman': // fluffy fur band + three magic feathers
        head.add(tor(0.335, 0.07, M(0xf8fafc, 0.15), 0, 0.3, 0, { rx: Math.PI / 2 }));
        [[-0.12, 0x2dd4bf, 0.25], [0, 0xfacc15, 0], [0.12, 0xa78bfa, -0.25]].forEach(([x, col, rz]) => head.add(S(0.07, M(col, 0.2), x, 0.52, -0.1, { sy: 3.2, sz: 0.45, rz })));
        break;
      case 'berserker': // mohawk + dark headband
        head.add(tor(0.33, 0.035, M(0x1f2937), 0, 0.3, 0, { rx: Math.PI / 2 }));
        [[-0.2, 0.2], [-0.1, 0.27], [0, 0.31], [0.1, 0.27], [0.2, 0.2]].forEach(([z, h]) => head.add(cone(0.06, h, M(0xf97316, 0.15), 0, 0.37, z)));
        break;
      case 'boss': // golden crown with blue gems
        head.add(cyl(0.34, 0.36, 0.14, gold, 0, 0.35, 0, { seg: 16, ol: true, cast: true }));
        for (let i = 0; i < 7; i++) { const a = (i * Math.PI * 2) / 7; head.add(cone(0.06, 0.2, gold, Math.sin(a) * 0.33, 0.41, Math.cos(a) * 0.33)); }
        head.add(S(0.05, M(0x38bdf8, 0.9), 0, 0.35, 0.36)); head.add(S(0.04, M(0xa78bfa, 0.9), -0.16, 0.35, 0.32)); head.add(S(0.04, M(0x34d399, 0.9), 0.16, 0.35, 0.32));
        for (const sd of [-1, 1]) head.add(tor(0.05, 0.015, gold, sd * 0.47, -0.04, 0, { ry: Math.PI / 2 }));
        break;
      case 'baby': { // one curl + pacifier
        head.add(S(0.07, M(0xf97316, 0.15), 0, 0.42, 0.05)); head.add(S(0.05, M(0xf97316, 0.15), 0.05, 0.5, 0.05)); head.add(S(0.035, M(0xf97316, 0.15), 0.1, 0.54, 0.05));
        head.add(S(0.06, M(0xf9a8d4, 0.2), 0, -0.2, 0.425, { sy: 0.85, sz: 0.4, ol: true })); head.add(tor(0.05, 0.014, M(0xfde047, 0.2), 0, -0.2, 0.47, {}));
        break;
      }
      case 'gunner': { // soldier helmet + glass monocle on one eye
        head.add(domeMesh(M(0x5f7352, 0.1, 0.4), 0.44, 0.34, 0.42, 0, 0.27, 0));
        head.add(tor(0.435, 0.035, M(0x3f4a33), 0, 0.27, 0, { rx: Math.PI / 2 }));
        const er = eyes[1].eye.position; const r = c.eye;
        face.add(tor(r * 1.2, r * 0.13, gold, er.x, er.y, er.z + r * 0.7, {}));
        face.add(S(r * 1.1, GLASS, er.x, er.y, er.z + r * 0.75, { sz: 0.12 }));
        break;
      }
      case 'jumper': // yellow flight helmet with goggles pushed up
        head.add(domeMesh(M(0xfacc15, 0.12, 0.4), 0.44, 0.34, 0.42, 0, 0.27, 0));
        head.add(tor(0.435, 0.035, M(0x1f2937), 0, 0.27, 0, { rx: Math.PI / 2 }));
        for (const sd of [-1, 1]) { head.add(tor(0.085, 0.025, M(0x1f2937), sd * 0.14, 0.43, 0.35, {})); head.add(cyl(0.075, 0.075, 0.05, M(0x38bdf8, 0.6), sd * 0.14, 0.43, 0.355, { rx: Math.PI / 2, seg: 14 })); }
        break;
      case 'cannoneer': // navy sailor cap with gold trim
        head.add(domeMesh(M(0x1e293b, 0.1, 0.4), 0.44, 0.3, 0.42, 0, 0.27, 0));
        head.add(cyl(0.47, 0.47, 0.035, M(0x111827), 0, 0.27, 0, { seg: 22 }));
        head.add(tor(0.435, 0.022, gold, 0, 0.32, 0, { rx: Math.PI / 2 }));
        head.add(S(0.04, gold, 0, 0.57, 0));
        break;
      case 'ninja': // black mask + crimson ninja headband
        head.add(tor(0.33, 0.04, M(0xd9433b), 0, 0.3, 0, { rx: Math.PI / 2 }));
        for (const sd of [-1, 1]) head.add(box(0.06, 0.24, 0.02, M(0xd9433b), sd * 0.05, 0.18, -0.38, { rz: sd * 0.35 }));
        head.add(S(0.24, M(0x0f172a), 0, -0.16, 0.32, { sx: 1.15, sy: 0.8, sz: 0.88, ol: true }));
        break;
      case 'bomber': { // crazed look + lit fuse on head
        head.add(tor(0.33, 0.035, M(0xdc2626), 0, 0.3, 0, { rx: Math.PI / 2 }));
        head.add(cyl(0.03, 0.03, 0.22, M(0xfafafa), 0, 0.46, 0, { seg: 8 }));
        const fl = makeFlame(0.22); fl.position.set(0, 0.6, 0); head.add(fl);
        break;
      }
      case 'magnet': // steel plate dome + glowing blue power core
        head.add(domeMesh(steel, 0.44, 0.34, 0.42, 0, 0.27, 0));
        head.add(tor(0.435, 0.035, steel, 0, 0.27, 0, { rx: Math.PI / 2 }));
        head.add(S(0.07, M(0x3b82f6, 0.8), 0, 0.36, 0.35, { ol: true }));
        break;
      case 'frost': // translucent ice crystal horns + frosted hood
        head.add(tor(0.34, 0.055, M(0xcffafe, 0.3), 0, 0.3, 0, { rx: Math.PI / 2 }));
        for (const sd of [-1, 1]) head.add(cone(0.065, 0.3, M(0x38bdf8, 0.85), sd * 0.26, 0.42, 0, { rz: -sd * 0.45, ol: true }));
        break;
      case 'rider': // heavy horned warlord helmet
        head.add(domeMesh(M(0x475569), 0.45, 0.35, 0.43, 0, 0.27, 0));
        head.add(tor(0.44, 0.035, gold, 0, 0.27, 0, { rx: Math.PI / 2 }));
        for (const sd of [-1, 1]) head.add(cone(0.08, 0.34, M(0xf1f5f9), sd * 0.38, 0.38, 0, { rz: -sd * 0.8, ol: true }));
        break;
      case 'fatty': // tribal leather skull band with beast teeth & big cheeks
        head.add(tor(0.35, 0.045, M(0x78350f), 0, 0.3, 0, { rx: Math.PI / 2 }));
        for (let i = -2; i <= 2; i++) head.add(cone(0.035, 0.12, M(0xfff7ed), i * 0.1, 0.36, 0.34, { rx: 0.2, ol: true }));
        head.add(S(0.12, skinMat, -0.22, -0.15, 0.24, { sx: 1.2, sy: 0.8 }));
        head.add(S(0.12, skinMat, 0.22, -0.15, 0.24, { sx: 1.2, sy: 0.8 }));
        break;
      case 'punk': { // tall spiky crimson-red punk mohawk + studded ear piercings
        const punkRed = M(0xef4444, 0.3);
        const punkDark = M(0xb91c1c, 0.2);
        [[-0.24, 0.22], [-0.16, 0.3], [-0.08, 0.36], [0, 0.4], [0.08, 0.36], [0.16, 0.3], [0.24, 0.22]].forEach(([z, h], idx) => {
          head.add(cone(0.065, h, idx % 2 === 0 ? punkRed : punkDark, 0, 0.38, z, { ol: true }));
        });
        // leather choker with silver spikes
        head.add(tor(0.32, 0.035, M(0x18181b), 0, -0.28, 0, { rx: Math.PI / 2 }));
        for (let a = 0; a < 5; a++) {
          const ang = -0.8 + a * 0.4;
          head.add(cone(0.025, 0.08, steel, Math.sin(ang) * 0.33, -0.28, Math.cos(ang) * 0.33, { rx: Math.PI / 2 - 0.2 }));
        }
        // gold punk piercing rings on ears
        head.add(tor(0.04, 0.012, gold, -0.42, 0.15, 0, { ry: Math.PI / 2 }));
        head.add(tor(0.04, 0.012, gold, 0.42, 0.15, 0, { ry: Math.PI / 2 }));
        break;
      }
      case 'shield': // heavy iron kettle helmet with eye slit visor
        head.add(domeMesh(steel, 0.46, 0.36, 0.44, 0, 0.27, 0));
        head.add(cyl(0.5, 0.5, 0.05, steel, 0, 0.24, 0, { seg: 18, ol: true }));
        head.add(box(0.34, 0.05, 0.06, M(0x0f172a), 0, 0.15, 0.38, { ol: true }));
        break;
      case 'toxic': // chemical protection respirator & glowing green safety goggles
        head.add(tor(0.33, 0.035, M(0x14532d), 0, 0.3, 0, { rx: Math.PI / 2 }));
        for (const sd of [-1, 1]) {
          head.add(tor(0.08, 0.02, M(0x1e293b), sd * 0.13, 0.05, 0.41, {}));
          head.add(cyl(0.07, 0.07, 0.03, M(0x22c55e, 0.8), sd * 0.13, 0.05, 0.42, { rx: Math.PI / 2, seg: 12 }));
        }
        head.add(cyl(0.1, 0.12, 0.16, M(0x334155), 0, -0.2, 0.36, { rx: -0.3, seg: 12, ol: true }));
        break;
      case 'bat': // sleek bat cowl, long pointed bat ears & white fangs
        head.add(tor(0.33, 0.035, M(0x2e1065), 0, 0.3, 0, { rx: Math.PI / 2 }));
        for (const sd of [-1, 1]) {
          head.add(cone(0.08, 0.38, M(0x3b0764), sd * 0.28, 0.42, 0.05, { rz: -sd * 0.3, ol: true }));
          head.add(cone(0.035, 0.16, M(0xffffff), sd * 0.16, -0.26, 0.36, { rx: 0.1 }));
        }
        break;
      case 'troll': // moss clumps, rocky horns & overgrown leafy crown
        for (const sd of [-1, 1]) head.add(cone(0.085, 0.28, M(0x3f3f46), sd * 0.32, 0.36, 0, { rz: -sd * 0.6, ol: true }));
        head.add(S(0.14, M(0x15803d, 0.2), 0, 0.42, 0, { sx: 1.8, sy: 0.6, sz: 1.2 }));
        head.add(S(0.09, M(0x22c55e, 0.2), 0.15, 0.44, 0.1, { sx: 1.1, sy: 0.7 }));
        break;
    }
  }
  return { head, face, earL, earR };
}

/** the balloon pilot: normal orc head + leather aviator cap with goggles */
export function pilotHead(def: Def, skinMat: THREE.MeshStandardMaterial, mats: THREE.MeshStandardMaterial[]) {
  const c: Cfg = { ...CFG.normal, iris: 0x0ea5e9, tusk: 0.8 };
  const h = orcHead('normal', def, skinMat, mats, c, false);
  const leather = M(0x8a5a2b, 0.1, 0.5);
  h.head.add(domeMesh(leather, 0.44, 0.34, 0.42, 0, 0.27, 0));
  h.head.add(tor(0.435, 0.035, M(0x5b3a1e), 0, 0.27, 0, { rx: Math.PI / 2 }));
  for (const sd of [-1, 1]) {
    h.head.add(box(0.06, 0.2, 0.22, leather, sd * 0.4, 0.14, -0.02, { ol: true }));
    h.head.add(tor(0.085, 0.025, M(0x1f2937), sd * 0.14, 0.43, 0.35, {}));
    h.head.add(cyl(0.075, 0.075, 0.05, M(0x7dd3fc, 0.6), sd * 0.14, 0.43, 0.355, { rx: Math.PI / 2, seg: 14 }));
  }
  return h;
}
/** chubby capsule arm (pivot = shoulder) */
export function orcArm(skinMat: THREE.Material) {
  const a = new THREE.Group();
  a.add(cap(0.085, 0.11, skinMat, 0, -0.14, 0, { cast: true, ol: true }));
  a.add(S(0.105, skinMat, 0, -0.3, 0.01, { ol: true }));
  return a;
}

// ---------- weapons (chunky, rounded; grip at the origin, pointing up) ----------
type WeaponKind = 'club' | 'dagger' | 'axe' | 'hammer' | 'staff' | 'twin' | 'rifle' | 'torch' | 'greatstaff' | 'flamespear' | 'vial';
function makeWeapon(kind: WeaponKind) {
  const g = new THREE.Group(); const wood = M(0x8a5a2b), steel = M(0xcbd5e1, 0.12, 0.3), gold = M(0xfbbf24, 0.2, 0.35);
  if (kind === 'club') {
    g.add(cap(0.045, 0.34, wood, 0, 0.2, 0, { ol: true, cast: true })); g.add(S(0.15, M(0x7c4a1e), 0, 0.5, 0, { ol: true, cast: true }));
    for (const d of [[1, 0.3, 0], [-1, 0.3, 0], [0, 0.3, 1], [0, 0.3, -1], [0, 1, 0]]) {
      const v = new THREE.Vector3(d[0], d[1], d[2]).normalize(); const sp = cone(0.045, 0.11, steel, v.x * 0.13, 0.5 + v.y * 0.13, v.z * 0.13);
      sp.quaternion.setFromUnitVectors(Y, v); g.add(sp);
    }
  } else if (kind === 'greatstaff') { // giant heavy staff with carved stone head and spikes
    g.add(cap(0.06, 1.05, M(0x5c3a1a), 0, 0.55, 0, { ol: true, cast: true }));
    g.add(tor(0.15, 0.035, gold, 0, 0.95, 0, { rx: Math.PI / 2 }));
    g.add(cyl(0.24, 0.2, 0.42, M(0x52525b), 0, 1.15, 0, { seg: 10, ol: true, cast: true }));
    for (let a = 0; a < 6; a++) {
      const ang = (a * Math.PI * 2) / 6;
      g.add(cone(0.05, 0.18, steel, Math.sin(ang) * 0.22, 1.15, Math.cos(ang) * 0.22, { rx: Math.cos(ang) * 1.5, rz: -Math.sin(ang) * 1.5 }));
    }
    g.add(S(0.12, M(0xd97706, 0.4), 0, 1.38, 0, { ol: true }));
  } else if (kind === 'flamespear') { // punk flaming spear with barbed blade and lively fire
    g.add(cap(0.038, 1.1, M(0x27272a), 0, 0.6, 0, { ol: true, cast: true }));
    g.add(cyl(0.06, 0.04, 0.15, gold, 0, 1.15, 0, { seg: 8 }));
    g.add(cone(0.08, 0.36, steel, 0, 1.35, 0, { sz: 0.4, ol: true, cast: true }));
    g.add(cone(0.045, 0.18, steel, -0.09, 1.25, 0, { rz: 0.5 }));
    g.add(cone(0.045, 0.18, steel, 0.09, 1.25, 0, { rz: -0.5 }));
    const fl = makeFlame(0.36); fl.position.set(0, 1.45, 0); g.add(fl);
  } else if (kind === 'vial') { // chemical glass flask with bubbling poison
    g.add(cap(0.035, 0.15, M(0x52525b), 0, 0.12, 0, { ol: true }));
    g.add(S(0.14, M(0x22c55e, 0.8), 0, 0.32, 0, { ol: true }));
    g.add(cyl(0.06, 0.06, 0.12, M(0x334155), 0, 0.44, 0, { seg: 10 }));
    g.add(tor(0.07, 0.02, M(0xa3e635, 0.5), 0, 0.32, 0, { rx: Math.PI / 2 }));
  } else if (kind === 'dagger') {
    g.add(cap(0.03, 0.06, M(0x5b3a1e), 0, 0.07, 0, { ol: true })); g.add(box(0.17, 0.035, 0.06, gold, 0, 0.15, 0));
    g.add(box(0.085, 0.28, 0.03, steel, 0, 0.3, 0, { ol: true })); g.add(cone(0.06, 0.12, steel, 0, 0.44, 0, { sz: 0.5 }));
  } else if (kind === 'axe') {
    g.add(cap(0.05, 0.5, wood, 0, 0.3, 0, { ol: true, cast: true }));
    g.add(S(0.21, M(0xb8c1cc, 0.12, 0.3), 0, 0.62, 0.13, { sx: 0.18, sy: 1, sz: 1.1, ol: true, cast: true })); g.add(S(0.06, gold, 0, 0.8, 0));
  } else if (kind === 'hammer') {
    g.add(cap(0.06, 0.62, M(0x3b2f2f), 0, 0.38, 0, { ol: true, cast: true }));
    g.add(cyl(0.2, 0.2, 0.56, M(0x6b7280, 0.1, 0.35), 0, 0.85, 0, { rz: Math.PI / 2, ol: true, cast: true }));
    for (const sd of [-1, 1]) g.add(cyl(0.21, 0.21, 0.07, gold, sd * 0.2, 0.85, 0, { rz: Math.PI / 2 }));
  } else if (kind === 'staff') {
    g.add(cap(0.04, 0.9, M(0x6b4428), 0, 0.5, 0, { ol: true, cast: true }));
    g.add(S(0.14, M(0x60a5fa, 0.95), 0, 1.1, 0, { ol: true })); g.add(tor(0.13, 0.025, gold, 0, 1.0, 0, { rx: Math.PI / 2 }));
    g.add(cone(0.04, 0.16, M(0x2dd4bf, 0.3), -0.1, 1.0, 0, { rz: 0.8 })); g.add(cone(0.04, 0.16, M(0xfacc15, 0.3), 0.1, 1.0, 0, { rz: -0.8 }));
  } else if (kind === 'twin') {
    g.add(cap(0.035, 0.08, M(0x5b3a1e), 0, 0.09, 0, { ol: true })); g.add(box(0.16, 0.035, 0.07, gold, 0, 0.18, 0));
    g.add(box(0.06, 0.3, 0.2, steel, 0, 0.35, 0.06, { ol: true })); g.add(S(0.1, steel, 0, 0.5, 0.06, { sx: 0.3, sy: 0.9 }));
  } else if (kind === 'rifle') { // held across the belly, pointing +z
    g.add(cap(0.045, 0.7, M(0x374151), 0, 0, 0.3, { rx: Math.PI / 2, ol: true, cast: true })); g.add(S(0.1, wood, 0, -0.03, -0.16, { sy: 0.8, sz: 1.7, ol: true }));
    g.add(cyl(0.05, 0.05, 0.22, M(0x1f2937), 0, 0.1, 0.12, { rx: Math.PI / 2, seg: 10, ol: true })); g.add(S(0.035, M(0x38bdf8, 0.9), 0, 0.1, 0.25));
    g.add(cyl(0.065, 0.065, 0.07, gold, 0, 0, 0.72, { rx: Math.PI / 2, seg: 10 }));
  } else { // torch
    g.add(cap(0.04, 0.28, M(0x6b4428), 0, 0.2, 0, { ol: true })); g.add(cyl(0.09, 0.06, 0.12, M(0x3b2f2f), 0, 0.46, 0, { seg: 10, ol: true }));
    const f = makeFlame(0.3); f.position.set(0, 0.52, 0); g.add(f);
  }
  return g;
}

// ---------- wheeled cannon towed by the cannoneer (structure/names kept for the firing logic in engine.ts) ----------
function buildCannon() {
  const cannon = new THREE.Group(); cannon.name = 'cannon'; cannon.position.set(0, 0, -0.95); cannon.rotation.y = Math.PI;
  const wood = M(0x8a5a2b), dark = M(0x2f3a4a, 0.1, 0.4), gold = M(0xfbbf24, 0.2, 0.35);
  cannon.add(box(0.42, 0.14, 0.8, wood, 0, 0.34, 0.05, { ol: true, cast: true }));
  for (const sd of [-1, 1]) { cannon.add(cyl(0.27, 0.27, 0.08, M(0x7c4a1e), sd * 0.3, 0.27, 0, { rz: Math.PI / 2, ol: true, cast: true })); cannon.add(cyl(0.1, 0.1, 0.1, gold, sd * 0.3, 0.27, 0, { rz: Math.PI / 2, seg: 10 })); }
  const pivot = new THREE.Group(); pivot.name = 'barrelPivot'; pivot.position.set(0, 0.52, 0); pivot.rotation.x = 1.15; cannon.add(pivot);
  pivot.add(cyl(0.15, 0.2, 0.8, dark, 0, 0.4, 0, { ol: true, cast: true })); pivot.add(S(0.21, dark, 0, 0, 0, { ol: true }));
  pivot.add(cyl(0.2, 0.2, 0.06, gold, 0, 0.25, 0)); pivot.add(cyl(0.19, 0.19, 0.08, M(0x4b5563), 0, 0.8, 0)); pivot.add(cyl(0.12, 0.12, 0.02, M(0x050508), 0, 0.845, 0));
  const blast = makeBlast(0.8, 0xfff3b0, 0xffa11f, 0xff5a1a, 'y'); blast.name = 'cmuzzle'; blast.position.set(0, 0.86, 0); pivot.add(blast);
  cannon.add(cyl(0.02, 0.02, 0.22, M(0x9ca3af), 0, 0.83, -0.12, { seg: 6 }));
  const spark = makeFlame(0.12); spark.name = 'spark'; spark.position.set(0, 0.94, -0.12); spark.scale.setScalar(0.001); cannon.add(spark);
  cannon.add(box(0.06, 0.06, 0.55, M(0x3b2f2f), 0, 0.3, -0.5));
  return cannon;
}

// ---------- the orc ----------
export function buildOrc(kind: OrcKind, def: Def): OrcBuild {
  const c = CFG[kind]; const bs = c.bodyS;
  const skinMat = newSkin(def.skin); const skinMats = [skinMat];
  const cloth = M(def.cloth, 0.1), brown = M(0x5b3a1e), gold = M(0xfbbf24, 0.25, 0.3), steel = M(0x9aa4b5, 0.1, 0.35), white = M(0xffffff, 0.15);
  const limbs: Limbs = {};

  // legs: stubby capsules + round dark boots
  const mkLeg = (sd: number) => {
    const l = new THREE.Group(); l.position.set(sd * 0.15 * bs, c.legH, 0);
    const total = c.legH - 0.05, r = 0.085;
    l.add(cap(r, total - 2 * r, skinMat, 0, -total / 2, 0, { cast: true, ol: true }));
    l.add(S(1, M(0x4a3222), 0, -c.legH + 0.06, 0.06, { sx: 0.12, sy: 0.075, sz: 0.17, ol: true }));
    return l;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  // body: pear shape, light belly, skirt / belt
  const body = new THREE.Group(); body.position.y = c.bodyY;
  body.add(S(0.3 * bs, skinMat, 0, 0, 0, { sy: 0.92, sz: 0.88, cast: true, ol: true }));
  body.add(S(0.2 * bs, M(shade(def.skin, 0.2)), 0, -0.04 * bs, 0.2 * bs, { sy: 1.1, sz: 0.45 }));
  if (kind === 'baby') { // big puffy diaper with pink tapes and gold safety pins
    body.add(S(0.34 * bs, white, 0, -0.14 * bs, 0, { sy: 0.62, sz: 0.95, ol: true, cast: true }));
    for (const sd of [-1, 1]) {
      body.add(box(0.16 * bs, 0.05, 0.05, M(0xf9a8d4, 0.2), sd * 0.2 * bs, -0.03 * bs, 0.22 * bs, { rz: -sd * 0.25 }));
      body.add(S(0.035, gold, sd * 0.27 * bs, -0.05 * bs, 0.2 * bs)); body.add(box(0.1, 0.018, 0.018, gold, sd * 0.2 * bs, -0.05 * bs, 0.22 * bs, {}));
    }
  } else if (kind === 'shaman') { // long blue robe with gold hem and a medallion
    body.add(cyl(0.23 * bs, 0.4 * bs, 0.5, cloth, 0, -0.17, 0, { ol: true, cast: true }));
    body.add(tor(0.395 * bs, 0.03, gold, 0, -0.41, 0, { rx: Math.PI / 2 }));
    body.add(tor(0.2, 0.014, gold, 0, 0.17, 0.06, { rx: 1.15 })); body.add(S(0.065, gold, 0, 0.07, 0.265, { sz: 0.5, ol: true }));
  } else {
    body.add(cyl(0.25 * bs, 0.34 * bs, 0.2 * bs, cloth, 0, -0.2 * bs, 0, { ol: true, cast: true }));
    body.add(tor(0.265 * bs, 0.03, brown, 0, -0.1 * bs, 0, { rx: Math.PI / 2 }));
    body.add(box(0.09 * bs, 0.08 * bs, 0.04, gold, 0, -0.1 * bs, 0.275 * bs, { ol: true }));
  }
  if (kind === 'tank') { // armour plate + round pauldrons
    body.add(S(0.22 * bs, steel, 0, 0.05 * bs, 0.17 * bs, { sy: 1.1, sz: 0.5, ol: true }));
    for (const sd of [-1, 1]) { body.add(S(0.16 * bs, steel, sd * 0.3 * bs, 0.2 * bs, 0, { ol: true, cast: true })); body.add(S(0.04, gold, sd * 0.3 * bs, 0.31 * bs, 0.02)); }
  } else if (kind === 'boss') { // purple cape, fluffy white shoulder pads, big gold buckle
    body.add(box(0.78 * bs, 0.8 * bs, 0.07, M(0x7c3aed, 0.12), 0, -0.02, -0.3 * bs, { rx: 0.12, ol: true, cast: true }));
    body.add(box(0.7 * bs, 0.05, 0.08, gold, 0, -0.4 * bs, -0.31 * bs, { rx: 0.12 }));
    for (const sd of [-1, 1]) body.add(S(0.17 * bs, M(0xf8fafc, 0.15), sd * 0.3 * bs, 0.2 * bs, 0, { ol: true, cast: true }));
    body.add(S(0.09 * bs, gold, 0, -0.1 * bs, 0.28 * bs, { sz: 0.4, ol: true }));
  } else if (kind === 'berserker') { // bandolier across the chest
    body.add(box(0.1, 0.62 * bs, 0.04, brown, 0, 0.05, 0.255 * bs, { rz: 0.7, ol: true }));
    for (let i = 0; i < 3; i++) body.add(cyl(0.025, 0.025, 0.07, gold, (i - 1) * 0.1 * bs, 0.05 - (i - 1) * 0.1 * bs, 0.29 * bs, { seg: 8 }));
  } else if (kind === 'gunner') { // ammo bandolier + khaki vest straps
    body.add(box(0.1, 0.62, 0.04, brown, 0, 0.05, 0.255, { rz: -0.7, ol: true }));
    for (let i = 0; i < 3; i++) body.add(cyl(0.025, 0.025, 0.07, gold, (i - 1) * 0.1, 0.05 + (i - 1) * 0.1, 0.29, { seg: 8 }));
  } else if (kind === 'jumper') { // harness straps
    for (const sd of [-1, 1]) body.add(box(0.07, 0.5, 0.03, M(0x1f2937), sd * 0.14, 0.04, 0.265, { ol: true }));
  } else if (kind === 'cannoneer') { // gold buttons
    for (let i = 0; i < 2; i++) body.add(S(0.035, gold, 0, 0.12 - i * 0.12, 0.27, { sz: 0.5 }));
  } else if (kind === 'ninja') { // ninja sash + red trailing scarves
    body.add(tor(0.27 * bs, 0.035, M(0xd9433b), 0, -0.1 * bs, 0, { rx: Math.PI / 2 }));
    for (const sd of [-1, 1]) body.add(box(0.08, 0.34, 0.02, M(0xd9433b), sd * 0.08, -0.05, -0.28 * bs, { rx: 0.35, rz: sd * 0.2 }));
  } else if (kind === 'bomber') { // 3 red sticks of dynamite strapped to the chest
    for (let i = -1; i <= 1; i++) {
      body.add(cyl(0.038, 0.038, 0.24, M(0xef4444), i * 0.09 * bs, 0, 0.27 * bs, { ol: true }));
      body.add(S(0.02, gold, i * 0.09 * bs, 0.13, 0.27 * bs));
    }
  } else if (kind === 'magnet') { // steel chestplate + horseshoe magnet on back
    body.add(S(0.24 * bs, steel, 0, 0.06 * bs, 0.18 * bs, { sy: 1.1, sz: 0.5, ol: true }));
    const mag = new THREE.Group(); mag.position.set(0, 0.14 * bs, -0.32 * bs);
    mag.add(box(0.46 * bs, 0.12 * bs, 0.1 * bs, steel, 0, 0.14 * bs, 0, { ol: true }));
    mag.add(box(0.12 * bs, 0.32 * bs, 0.1 * bs, M(0xef4444), -0.17 * bs, -0.04 * bs, 0, { ol: true }));
    mag.add(box(0.12 * bs, 0.32 * bs, 0.1 * bs, M(0x3b82f6), 0.17 * bs, -0.04 * bs, 0, { ol: true }));
    body.add(mag);
  } else if (kind === 'frost') { // frost robe with icy hem
    body.add(cyl(0.24 * bs, 0.41 * bs, 0.52, M(0x0284c7, 0.15), 0, -0.17, 0, { ol: true, cast: true }));
    body.add(tor(0.41 * bs, 0.03, M(0xbae6fd), 0, -0.41, 0, { rx: Math.PI / 2 }));
  } else if (kind === 'fatty') { // giant potbelly, wide skull buckle belt
    body.add(S(0.38 * bs, skinMat, 0, -0.04 * bs, 0.24 * bs, { sx: 1.25, sy: 1.1, sz: 1.15, ol: true, cast: true }));
    body.add(cyl(0.36 * bs, 0.46 * bs, 0.24 * bs, cloth, 0, -0.22 * bs, 0, { ol: true, cast: true }));
    body.add(tor(0.42 * bs, 0.045, brown, 0, -0.12 * bs, 0, { rx: Math.PI / 2 }));
    body.add(S(0.12 * bs, gold, 0, -0.12 * bs, 0.38 * bs, { ol: true }));
  } else if (kind === 'punk') { // spiked dark vest, silver studs
    body.add(cyl(0.26 * bs, 0.35 * bs, 0.26 * bs, M(0x18181b), 0, -0.15 * bs, 0, { ol: true, cast: true }));
    for (const sd of [-1, 1]) {
      body.add(cone(0.04 * bs, 0.12 * bs, steel, sd * 0.28 * bs, 0.18 * bs, 0, { rz: -sd * 0.5 }));
      body.add(cone(0.04 * bs, 0.12 * bs, steel, sd * 0.28 * bs, 0.12 * bs, 0.1 * bs, { rz: -sd * 0.5 }));
    }
  } else if (kind === 'shield') { // heavy steel body armor
    body.add(S(0.25 * bs, steel, 0, 0.04 * bs, 0.18 * bs, { sy: 1.1, sz: 0.5, ol: true }));
    for (const sd of [-1, 1]) body.add(S(0.18 * bs, steel, sd * 0.32 * bs, 0.2 * bs, 0, { ol: true, cast: true }));
  } else if (kind === 'toxic') { // glass canister backpack with glowing toxic goo
    const tank = new THREE.Group(); tank.position.set(0, 0.08 * bs, -0.32 * bs);
    tank.add(cyl(0.16 * bs, 0.16 * bs, 0.45 * bs, M(0x15803d, 0.6), 0, 0, 0, { ol: true, cast: true }));
    tank.add(cyl(0.13 * bs, 0.13 * bs, 0.38 * bs, M(0x4ade80, 0.9), 0, 0, 0, {}));
    tank.add(tor(0.16 * bs, 0.02 * bs, steel, 0, 0.14 * bs, 0, { rx: Math.PI / 2 }));
    tank.add(tor(0.16 * bs, 0.02 * bs, steel, 0, -0.14 * bs, 0, { rx: Math.PI / 2 }));
    body.add(tank);
  } else if (kind === 'bat') { // bat wings on back
    const mkWing = (sd: number) => {
      const w = new THREE.Group(); w.position.set(sd * 0.2 * bs, 0.12 * bs, -0.22 * bs);
      w.add(cap(0.035 * bs, 0.4 * bs, M(0x1e1b4b), sd * 0.2 * bs, 0.15 * bs, 0, { rz: -sd * 0.8, ol: true }));
      w.add(box(0.42 * bs, 0.32 * bs, 0.02 * bs, M(0x312e81, 0.15), sd * 0.22 * bs, 0.05 * bs, 0, { rz: -sd * 0.4, ol: true }));
      return w;
    };
    const wingL = mkWing(-1), wingR = mkWing(1);
    body.add(wingL, wingR);
    limbs.wingL = wingL; limbs.wingR = wingR;
  } else if (kind === 'troll') { // moss and crag boulders on back
    body.add(S(0.24 * bs, M(0x27272a), -0.2 * bs, 0.2 * bs, -0.18 * bs, { ol: true, cast: true }));
    body.add(S(0.28 * bs, M(0x166534, 0.2), 0.16 * bs, 0.22 * bs, -0.16 * bs, { ol: true, cast: true }));
    body.add(S(0.2 * bs, M(0x15803d, 0.3), 0, 0.28 * bs, -0.12 * bs, { ol: true }));
  }

  // arms + head
  const armL = orcArm(skinMat), armR = orcArm(skinMat);
  armL.position.set(-c.armX, c.armY, 0); armR.position.set(c.armX, c.armY, 0);
  const hd = orcHead(kind, def, skinMat, skinMats, c);
  hd.head.position.y = c.headY; hd.head.scale.setScalar(c.headS);

  const parts: THREE.Object3D[] = [legL, legR, body, armL, armR, hd.head];
  Object.assign(limbs, { legL, legR, body, armL, armR, head: hd.head, face: hd.face, earL: hd.earL, earR: hd.earR });

  // rider mount
  if (kind === 'rider') {
    const mount = new THREE.Group(); mount.name = 'mount'; mount.position.set(0, -0.14, 0.05);
    mount.add(box(0.66 * bs, 0.48 * bs, 1.15 * bs, M(0x64748b, 0.1, 0.5), 0, 0, 0, { ol: true, cast: true }));
    mount.add(box(0.42 * bs, 0.42 * bs, 0.45 * bs, M(0x475569, 0.1, 0.4), 0, 0.06 * bs, 0.65 * bs, { ol: true }));
    mount.add(cone(0.12 * bs, 0.42 * bs, gold, 0, 0.25 * bs, 0.8 * bs, { rx: 0.65, ol: true }));
    for (const sx of [-1, 1]) for (const sz of [-0.35, 0.35]) mount.add(cap(0.1 * bs, 0.26 * bs, M(0x334155), sx * 0.28 * bs, -0.32 * bs, sz * bs, { ol: true }));
    parts.push(mount); limbs.mount = mount;
  }

  // weapons: held in the hands so they swing with the arms; thrown apart as their own pieces when the orc dies
  const hold = (arm: THREE.Group, kindW: WeaponKind) => { const w = makeWeapon(kindW); w.position.set(0, -0.29, 0.04); w.rotation.x = 1.15; arm.add(w); parts.push(w); return w; };
  switch (kind) {
    case 'normal': hold(armR, 'club'); break;
    case 'fast': hold(armR, 'dagger'); break;
    case 'tank': hold(armR, 'axe'); break;
    case 'boss': hold(armR, 'hammer').scale.setScalar(1.15); break;
    case 'shaman': hold(armR, 'staff'); break;
    case 'berserker': hold(armR, 'twin'); hold(armL, 'twin'); break;
    case 'gunner': { const r = makeWeapon('rifle'); r.position.set(0, c.bodyY + 0.04, 0.3); parts.push(r); break; }
    case 'jumper': { // rocket jet-pack (flames only show while flying)
      const pack = new THREE.Group(); pack.position.set(0, c.bodyY + 0.06, -0.4); const jet = new THREE.Group(); jet.visible = false; pack.add(jet);
      for (const sd of [-1, 1]) {
        pack.add(cap(0.1, 0.28, M(0x64748b, 0.1, 0.4), sd * 0.14, 0, 0, { ol: true, cast: true })); pack.add(cyl(0.1, 0.1, 0.06, M(0xfacc15), sd * 0.14, 0.26, 0, { seg: 12 }));
        pack.add(cyl(0.05, 0.09, 0.1, M(0x1f2937), sd * 0.14, -0.33, 0, { seg: 10 }));
        const f = makeFlame(0.28); f.position.set(sd * 0.14, -0.38, 0); f.rotation.x = Math.PI; jet.add(f);
      }
      parts.push(pack); limbs.jet = jet; break;
    }
    case 'cannoneer': {
      const torch = makeWeapon('torch'); torch.position.set(0.45, 0.5, 0.15); torch.rotation.x = -0.4; torch.name = 'torch';
      const cannon = buildCannon(); parts.push(torch, cannon); limbs.torch = torch; limbs.cannon = cannon; break;
    }
    case 'ninja': hold(armR, 'dagger'); hold(armL, 'dagger'); break;
    case 'bomber': hold(armR, 'torch'); break;
    case 'magnet': hold(armR, 'hammer'); break;
    case 'frost': hold(armR, 'staff'); break;
    case 'rider': hold(armR, 'axe'); break;
    case 'fatty': hold(armR, 'greatstaff'); break;
    case 'punk': hold(armR, 'flamespear'); break;
    case 'shield': {
      hold(armR, 'axe');
      // tower shield held on left arm
      const tShield = new THREE.Group(); tShield.position.set(0, -0.25, 0.18);
      tShield.add(box(0.55 * bs, 0.85 * bs, 0.06 * bs, steel, 0, 0, 0, { ol: true, cast: true }));
      tShield.add(tor(0.18 * bs, 0.03 * bs, gold, 0, 0, 0.04 * bs, {}));
      tShield.add(cone(0.06 * bs, 0.16 * bs, steel, 0, 0, 0.06 * bs, { rx: Math.PI / 2 }));
      armL.add(tShield); parts.push(tShield);
      break;
    }
    case 'toxic': hold(armR, 'vial'); break;
    case 'bat': break;
    case 'troll': break;
    case 'baby': break;
  }
  return { parts, limbs, skinMats, hpY: c.hpY };
}

/** the log: a plain rolling log with iron bands, rivets and wood grain. It has NO face – when it is destroyed, 5 orcs step out of it. */
export function buildLog(def: Def): OrcBuild {
  const bark = newSkin(def.skin); const skinMats = [bark];
  const wood = M(0xd4a574), dk = M(0x5c3a1a), gold = M(0xfbbf24, 0.2, 0.35);
  const body = new THREE.Group(); body.name = 'roll'; body.position.y = 0.55;
  body.add(cyl(0.5, 0.5, 1.5, bark, 0, 0, 0, { rz: Math.PI / 2, seg: 16, ol: true, cast: true }));
  for (const sd of [-1, 1]) {
    body.add(cyl(0.52, 0.52, 0.12, M(def.cloth), sd * 0.4, 0, 0, { rz: Math.PI / 2, seg: 16 }));
    body.add(cyl(0.3, 0.3, 0.04, wood, sd * 0.76, 0, 0, { rz: Math.PI / 2, seg: 16 })); body.add(tor(0.14, 0.02, dk, sd * 0.785, 0, 0, { ry: Math.PI / 2 }));
  }
  // wood grain: long dark lines running ALONG the log (no knots or dots on the side that could read as eyes / a nose)
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.3; body.add(box(1.3, 0.03, 0.07, dk, 0, Math.sin(a) * 0.5, Math.cos(a) * 0.5, { rx: Math.PI / 2 - a })); }
  // a plain, solid log – NO face: iron bands with rivets near both ends, growth rings on the cut ends, a coil of rope and a little leafy sprout
  const iron = M(0x6b7280, 0.15, 0.4), rope = M(0xc9a66b, 0.1, 0.8), leaf = M(0x4ade80, 0.2, 0.5);
  for (const sd of [-1, 1]) {
    body.add(tor(0.505, 0.045, iron, sd * 0.64, 0, 0, { ry: Math.PI / 2 }));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; body.add(S(0.03, gold, sd * 0.64, Math.sin(a) * 0.55, Math.cos(a) * 0.55, { ol: false })); }
    for (const k of [0.1, 0.2, 0.3]) body.add(tor(k, 0.012, dk, sd * 0.785, 0, 0, { ry: Math.PI / 2 }));
  }
  body.add(cap(0.02, 0.18, dk, 0.1, 0.56, 0.08, { rz: -0.4 })); body.add(S(0.07, leaf, 0.2, 0.7, 0.1, { sx: 1.4, sy: 0.5 })); body.add(S(0.06, leaf, 0.0, 0.68, 0.12, { sx: 1.3, sy: 0.5, rz: 0.5 }));
  body.add(tor(0.17, 0.03, rope, -0.12, 0.5, 0.2, { rx: Math.PI / 2 - 0.5 }));
  const limbs: Limbs = { roll: body, head: new THREE.Group(), armL: new THREE.Group(), armR: new THREE.Group(), legL: new THREE.Group(), legR: new THREE.Group() };
  return { parts: [body], limbs, skinMats, hpY: 1.5 };
}

/** walking animation: waddle, hop-bounce, swinging arms, flapping ears (per-kind arm poses) */
export function poseOrc(kind: OrcKind, L: Limbs, ph: number) {
  const baby = kind === 'baby'; const sw = Math.sin(ph) * (baby ? 1.1 : 0.7);
  L.legL.rotation.x = sw; L.legR.rotation.x = -sw;
  L.armL.rotation.set(-sw * 0.8, 0, -0.12); L.armR.rotation.set(-0.6 + Math.sin(ph * 0.5) * 0.25, 0, 0.12);
  L.head.rotation.z = Math.sin(ph * 0.5) * 0.08; L.head.rotation.x = Math.sin(ph * 2) * 0.05;
  L.body.rotation.z = Math.sin(ph) * 0.05;
  L.earL.rotation.z = EAR + Math.sin(ph * 2) * 0.14; L.earR.rotation.z = -EAR - Math.sin(ph * 2 + 1) * 0.14;
  switch (kind) {
    case 'gunner': L.armL.rotation.set(-1.15, 0, 0.7); L.armR.rotation.set(-1.25 + Math.sin(ph) * 0.03, 0, -0.7); break;
    case 'cannoneer': L.armR.rotation.set(-0.7, 0, 0.45); break;
    case 'shaman': L.armR.rotation.set(-0.35 + Math.sin(ph * 0.5) * 0.08, 0, 0.12); break;
    case 'berserker': L.armL.rotation.set(-0.6 + Math.sin(ph * 0.5 + 1) * 0.25, 0, -0.12); break;
    case 'ninja': L.armL.rotation.set(-1.0, 0, 0.4); L.armR.rotation.set(-1.0, 0, -0.4); break;
    case 'bomber': L.armR.rotation.set(-1.6 + Math.sin(ph) * 0.2, 0, 0.2); break;
    case 'frost': L.armR.rotation.set(-0.45 + Math.sin(ph * 0.5) * 0.1, 0, 0.15); break;
    case 'rider': if (L.mount) L.mount.position.y = -0.14 + Math.sin(ph * 2) * 0.025; break;
    case 'fatty': L.armR.rotation.set(-0.8 + Math.sin(ph * 0.5) * 0.25, 0, 0.2); break;
    case 'punk': L.armR.rotation.set(-1.25 + Math.sin(ph) * 0.35, 0, -0.2); break;
    case 'shield': L.armL.rotation.set(-0.85, 0, 0.45); break;
    case 'toxic': L.armR.rotation.set(-0.9 + Math.sin(ph * 0.6) * 0.2, 0, 0.1); break;
    case 'bat':
      if (L.wingL && L.wingR) {
        const flap = Math.sin(ph * 5.5) * 0.48;
        L.wingL.rotation.y = 0.3 + flap;
        L.wingR.rotation.y = -0.3 - flap;
      }
      break;
    case 'troll':
      L.armL.rotation.set(-sw * 0.9, 0, -0.2);
      L.armR.rotation.set(sw * 0.9, 0, 0.2);
      break;
    case 'boss': L.armL.rotation.x *= 0.7; break;
    default: break;
  }
}
