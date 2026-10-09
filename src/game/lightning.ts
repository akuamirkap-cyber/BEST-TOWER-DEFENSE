import * as THREE from 'three';
import { BOX, SPH } from './voxel';

/**
 * Real lightning: a jagged, branching, flickering arc (NOT a projectile).
 *  - midpoint-displacement path from the emitter to the target, thinner at both ends
 *  - 4 stacked layers: dark outline → colored glow → bright mid → white-hot core (readable on the bright sky)
 *  - small side branches that fork off the main arc
 *  - glowing "plasma balls" where the arc leaves the emitter and where it strikes
 * Call reseed() ~20x/second for the crackling flicker, update(a,b) every frame so the arc stays attached.
 */
export interface BoltStyle { edge: number; glow: number; mid: number; core: number; width: number; jag: number; levels: number; branches: number }

export const PLASMA_STYLE: BoltStyle = { edge: 0x1e3a8a, glow: 0x38bdf8, mid: 0xfff3a0, core: 0xffffff, width: 0.06, jag: 0.6, levels: 4, branches: 2 };
export const TESLA_STYLE: BoltStyle = { edge: 0x3b0f78, glow: 0xa855f7, mid: 0xf0d9ff, core: 0xffffff, width: 0.055, jag: 0.55, levels: 3, branches: 2 };
export const MINI_STYLE: BoltStyle = { edge: 0x1e3a8a, glow: 0x38bdf8, mid: 0xfff3a0, core: 0xffffff, width: 0.016, jag: 0.9, levels: 2, branches: 0 };

const Z = new THREE.Vector3(0, 0, 1);
const _dir = new THREE.Vector3(), _tmp = new THREE.Vector3(), _seg = new THREE.Vector3();

const flatMat = (color: number, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false });
const rnd = (v: THREE.Vector3) => v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);

function makePath(a: THREE.Vector3, b: THREE.Vector3, levels: number, jag: number, seeds: THREE.Vector3[], dir: THREE.Vector3, len: number) {
  let pts = [a.clone(), b.clone()]; let disp = len * jag * 0.2; let si = 0;
  for (let l = 0; l < levels; l++) {
    const next: THREE.Vector3[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const m = pts[i].clone().add(pts[i + 1]).multiplyScalar(0.5);
      const s = seeds[si++];
      _tmp.copy(s).addScaledVector(dir, -s.dot(dir)); // keep the kink perpendicular to the beam
      m.addScaledVector(_tmp, disp);
      next.push(m, pts[i + 1]);
    }
    pts = next; disp *= 0.55;
  }
  return pts;
}

interface Branch { idx: number; side: THREE.Vector3; len: number; seeds: THREE.Vector3[] }

export class Bolt {
  group = new THREE.Group();
  width = 1;
  private nMain: number;
  private seeds: THREE.Vector3[] = [];
  private br: Branch[] = [];
  private main: THREE.Mesh[][] = [];
  private brMesh: THREE.Mesh[][][] = [];
  private ends: THREE.Mesh[] = [];
  // 0 edge, 1 glow, 2 mid, 3 core, 4 end-outer, 5 end-inner
  private mats: THREE.MeshBasicMaterial[];
  private base = [0.55, 0.5, 0.95, 1, 0.42, 0.95];

  constructor(public style: BoltStyle) {
    this.nMain = 1 << style.levels;
    this.mats = [flatMat(style.edge, this.base[0]), flatMat(style.glow, this.base[1]), flatMat(style.mid, this.base[2]), flatMat(style.core, this.base[3]), flatMat(style.glow, this.base[4]), flatMat(style.core, this.base[5])];
    for (let i = 0; i < this.nMain - 1; i++) this.seeds.push(new THREE.Vector3());
    for (let L = 0; L < 4; L++) { const arr: THREE.Mesh[] = []; for (let i = 0; i < this.nMain; i++) arr.push(this.seg(this.mats[L], 20 + L)); this.main.push(arr); }
    for (let j = 0; j < style.branches; j++) {
      this.br.push({ idx: 1, side: new THREE.Vector3(), len: 0.2, seeds: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] });
      const layers: THREE.Mesh[][] = [];
      for (const L of [0, 2, 3]) { const arr: THREE.Mesh[] = []; for (let i = 0; i < 4; i++) arr.push(this.seg(this.mats[L], 20 + L)); layers.push(arr); }
      this.brMesh.push(layers);
    }
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(SPH, i % 2 === 0 ? this.mats[4] : this.mats[5]); m.frustumCulled = false; m.renderOrder = 24 + (i % 2); this.group.add(m); this.ends.push(m); }
    this.reseed();
  }

  private seg(mat: THREE.Material, order: number) {
    const m = new THREE.Mesh(BOX, mat); m.frustumCulled = false; m.renderOrder = order; this.group.add(m); return m;
  }

  /** new random crackle pattern */
  reseed() {
    for (const s of this.seeds) rnd(s);
    for (const b of this.br) { b.idx = 1 + Math.floor(Math.random() * (this.nMain - 2)); rnd(b.side); b.len = 0.16 + Math.random() * 0.18; for (const s of b.seeds) rnd(s); }
  }

  private place(meshes: THREE.Mesh[], pts: THREE.Vector3[], width: number) {
    const n = meshes.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[i + 1], m = meshes[i];
      _seg.subVectors(p1, p0); const l = _seg.length() || 1e-4; _seg.divideScalar(l);
      m.position.addVectors(p0, p1).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Z, _seg);
      const tp = 0.5 + 0.5 * Math.sin((Math.PI * (i + 0.5)) / n); // thinner at both ends
      m.scale.set(width * tp, width * tp, l + width * 0.6);
    }
  }

  update(a: THREE.Vector3, b: THREE.Vector3, k = 1) {
    const len = a.distanceTo(b); if (len < 1e-3) return;
    _dir.subVectors(b, a).divideScalar(len);
    const W = this.style.width * this.width * k;
    const pts = makePath(a, b, this.style.levels, this.style.jag, this.seeds, _dir, len);
    this.place(this.main[0], pts, W * 3.4); this.place(this.main[1], pts, W * 2.4); this.place(this.main[2], pts, W * 1.4); this.place(this.main[3], pts, W * 0.65);
    for (let j = 0; j < this.br.length; j++) {
      const br = this.br[j]; const start = pts[Math.min(br.idx, pts.length - 2)];
      _tmp.copy(br.side).addScaledVector(_dir, -br.side.dot(_dir)); if (_tmp.lengthSq() < 1e-4) _tmp.set(0, 1, 0); _tmp.normalize();
      const bdir = _dir.clone().multiplyScalar(0.5).addScaledVector(_tmp, 0.85).normalize();
      const bl = len * br.len; const end = start.clone().addScaledVector(bdir, bl);
      const bp = makePath(start, end, 2, this.style.jag * 1.1, br.seeds, bdir, bl);
      this.place(this.brMesh[j][0], bp, W * 2.4); this.place(this.brMesh[j][1], bp, W * 1.0); this.place(this.brMesh[j][2], bp, W * 0.45);
    }
    const f = 0.8 + Math.random() * 0.45;
    this.ends[0].position.copy(a); this.ends[1].position.copy(a); this.ends[2].position.copy(b); this.ends[3].position.copy(b);
    this.ends[0].scale.setScalar(W * 5.5 * f); this.ends[1].scale.setScalar(W * 2.4 * f); this.ends[2].scale.setScalar(W * 8 * f); this.ends[3].scale.setScalar(W * 3.4 * f);
  }

  setOpacity(o: number) { for (let i = 0; i < this.mats.length; i++) this.mats[i].opacity = this.base[i] * o; }
  dispose() { this.group.parent?.remove(this.group); for (const m of this.mats) m.dispose(); }
}
