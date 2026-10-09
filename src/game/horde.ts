import * as THREE from 'three';
import { updateFace, flickerFlame, makeFlame } from './voxel';
import { poseOrc } from './orcs';
import type { OrcKind } from './orcs';
import { isElite, poseElite, poseDread, setBowDraw } from './elites';

/**
 * "Gerombolan": a live 3D scene of the orc horde of the coming level, gathered at dusk and getting ready for battle.
 *  - every enemy type of the level appears with real 3D models (same cute orcs as in the game), facing the towers (to the right)
 *  - formation = role zones (scouts out front, war captain + legion in the centre, tanks / dread knights on the flanks, the main mass,
 *    archers + gunners + shaman at the back, the king at the rear; balloons and dragons hovering above), then a "relaxation" pass
 *    pushes overlapping orcs apart -> tidy ranks that are NOT stiff
 *  - idle life: breathing, looking around, ear flaps, blinking, cheering with raised weapons, archers drawing bows, dread knights
 *    practising a chop, the captain's banner flying, wings flapping, torches flickering, dust drifting
 *  - tap an orc to select its type (it hops and gets a gold ring); drag sideways to look around
 */
type Limbs = Record<string, THREE.Group>;
export interface PreviewModel { group: THREE.Group; limbs: Limbs; size: number; flying: boolean }
export interface HordeEntry { type: string; count: number }
export type BuildFn = (type: string) => PreviewModel;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** how many figures to show of each type (the real counts are shown as ×N on the chips) */
const CAP: Record<string, number> = { normal: 9, baby: 3, fast: 3, tank: 3, berserker: 3, legion: 4, captain: 1, dread: 2, archer: 3, gunner: 2, cannoneer: 2, jumper: 2, shaman: 2, boss: 1, log: 1, balloon: 2, dragon: 2, ninja: 2, bomber: 2, magnet: 2, frost: 2, rider: 2, fatty: 2, punk: 2, shield: 2, toxic: 2, bat: 2, troll: 2 };
const DIV: Record<string, number> = { normal: 5, legion: 2 };
const MAX_FIGS = 36;
const CHEER = new Set(['normal', 'fast', 'baby', 'tank', 'berserker', 'captain', 'legion', 'boss', 'shaman', 'ninja', 'bomber', 'magnet', 'frost', 'rider', 'fatty', 'punk', 'shield', 'toxic', 'troll']);
const BOTH_ARMS = new Set(['normal', 'fast', 'baby', 'tank', 'berserker', 'ninja', 'punk']);

/** where each role stands: x = distance behind the front line (negative = further back, positive = out in front), z = sideways spread */
interface Zone { x: [number, number]; z: [number, number]; flank?: boolean; y?: number }
const ZONES: Record<string, Zone> = {
  log: { x: [0.9, 1.6], z: [1.8, 3.4], flank: true },
  bomber: { x: [0.4, 1.4], z: [0.8, 3.4], flank: true },
  ninja: { x: [-0.4, 0.7], z: [0.8, 3.8] },
  punk: { x: [-0.3, 0.8], z: [0.6, 3.8] },
  baby: { x: [-0.2, 1.0], z: [0, 4.2] },
  fast: { x: [-0.6, 0.4], z: [0, 4.2] },
  shield: { x: [-0.6, 0.4], z: [1.0, 3.0] },
  dread: { x: [-0.3, -1.0], z: [2.3, 3.5], flank: true },
  captain: { x: [-0.4, -0.7], z: [0, 0.5] },
  legion: { x: [-1.6, -3.4], z: [0, 1.5] },
  fatty: { x: [-1.2, -2.6], z: [1.2, 3.4], flank: true },
  troll: { x: [-1.5, -3.2], z: [2.0, 4.2], flank: true },
  rider: { x: [-1.3, -2.8], z: [1.5, 3.6], flank: true },
  magnet: { x: [-1.0, -2.2], z: [1.3, 3.2], flank: true },
  tank: { x: [-0.8, -1.8], z: [1.3, 3.6], flank: true },
  berserker: { x: [-1.0, -2.0], z: [2.2, 4.1], flank: true },
  normal: { x: [-1.8, -4.8], z: [0, 4.0] },
  toxic: { x: [-2.5, -4.5], z: [0.5, 3.2] },
  gunner: { x: [-3.8, -5.4], z: [0, 3.2] },
  jumper: { x: [-3.6, -5.2], z: [2.0, 3.8], flank: true },
  archer: { x: [-4.8, -6.2], z: [0, 3.4] },
  frost: { x: [-4.2, -5.6], z: [0.6, 2.4], flank: true },
  cannoneer: { x: [-4.6, -6.0], z: [1.3, 3.5], flank: true },
  shaman: { x: [-4.4, -5.8], z: [0.3, 1.8], flank: true },
  boss: { x: [-7.2, -7.2], z: [0, 0] },
  bat: { x: [-2.0, -5.0], z: [1.8, 4.0], flank: true, y: 1.35 },
  balloon: { x: [-3.8, -6.2], z: [1.6, 3.9], flank: true, y: 1.45 },
  dragon: { x: [-2.4, -5.4], z: [2.6, 4.4], flank: true, y: 1.65 },
};

interface Fig {
  type: string; model: PreviewModel; root: THREE.Group; shadow: THREE.Mesh; ring: THREE.Mesh;
  r: number; fly: boolean; seed: number; headY0: number;
  tx: number; tz: number; x: number; z: number; y: number; yaw: number;
}

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** alpha map for the ground: opaque in the middle, fading to nothing at the rim (a soft "stage" instead of a hard disc) */
function fadeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}

export class HordeView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 140);
  private figs: Fig[] = [];
  private raf = 0; private last = performance.now(); private t = 0;
  private w = 0; private placedAspect = -1;
  private selected: string | null = null;
  private center = new THREE.Vector3(-2, 1, 0); private pts: THREE.Vector3[] = [];
  private camAz = 0.6; private camEl = 0.5; private dist = 14; private orbit = 0;
  private dragging = false; private moved = false; private downX = 0; private downY = 0; private lastX = 0;
  private ray = new THREE.Raycaster(); private tmp = new THREE.Vector3();
  private shadowGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  private shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
  private ringGeo = new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2);
  private ringMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  private key: THREE.DirectionalLight; private rim: THREE.DirectionalLight; private torchLights: THREE.PointLight[] = [];
  private scenery: THREE.Group | null = null; private flames: THREE.Object3D[] = []; private flags: THREE.Object3D[] = [];
  private dust: THREE.Points; private dustBase: Float32Array;
  private glow: THREE.Sprite; private glowTexture: THREE.Texture; private fade: THREE.Texture;
  private ground: THREE.Mesh;
  private poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 1, 8); private boxGeo = new THREE.BoxGeometry(1, 1, 1); private sphGeo = new THREE.SphereGeometry(1, 10, 8); private coneGeo = new THREE.ConeGeometry(1, 1, 8);
  private poleMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 });
  private flagMat = new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.6, emissive: 0x4c1d95, emissiveIntensity: 0.25, side: THREE.DoubleSide });
  private sigilMat = new THREE.MeshStandardMaterial({ color: 0x7ed957, roughness: 0.6, emissive: 0x3f8f2a, emissiveIntensity: 0.3 });
  private whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private rockMat = new THREE.MeshStandardMaterial({ color: 0x7b708a, roughness: 0.95 });
  private haloMat: THREE.SpriteMaterial;

  constructor(private canvas: HTMLCanvasElement, build: BuildFn, entries: HordeEntry[], private seed: number, private onPick: (type: string | null) => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.12;

    // lights: a "head-light" that follows the camera (faces are always lit) + a violet rim from behind + warm torch lights
    this.scene.add(new THREE.HemisphereLight(0xd8c8ff, 0x4a3524, 1.0));
    this.key = new THREE.DirectionalLight(0xfff0d6, 2.3); this.scene.add(this.key, this.key.target);
    this.rim = new THREE.DirectionalLight(0x9a7bff, 1.1); this.scene.add(this.rim, this.rim.target);
    for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xff9a3c, 1.8, 7); this.scene.add(l); this.torchLights.push(l); }

    // ground: a soft-edged dusty parade ground with a few darker / lighter patches
    this.fade = fadeTex();
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(26, 56).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 1, transparent: true, alphaMap: this.fade, depthWrite: false }));
    this.ground.renderOrder = -3; this.scene.add(this.ground);
    const prng = mulberry32(seed * 31 + 5);
    for (let i = 0; i < 16; i++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: prng() < 0.5 ? 0x5a4a38 : 0x7d6a52, roughness: 1, transparent: true, opacity: 0.5, depthWrite: false }));
      const a = prng() * 6.28, rr = 2 + prng() * 12; p.position.set(Math.cos(a) * rr - 2, 0.01, Math.sin(a) * rr * 0.8); p.scale.set(1 + prng() * 2.4, 1, 0.8 + prng() * 1.8); p.rotation.y = prng() * 3; p.renderOrder = -2; this.scene.add(p);
    }
    // violet glow of the portal the orcs come through (far behind the army)
    this.glowTexture = glowTex(); this.haloMat = new THREE.SpriteMaterial({ map: this.glowTexture, color: 0xa855f7, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 });
    this.glow = new THREE.Sprite(this.haloMat); this.glow.scale.setScalar(16); this.glow.position.set(-16, 3, 0); this.scene.add(this.glow);
    // drifting dust motes
    const N = 70; const pos = new Float32Array(N * 3); this.dustBase = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { this.dustBase[i * 3] = (prng() - 0.5) * 24 - 2; this.dustBase[i * 3 + 1] = prng() * 5; this.dustBase[i * 3 + 2] = (prng() - 0.5) * 16; }
    pos.set(this.dustBase);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.07, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true })); this.dust.frustumCulled = false; this.scene.add(this.dust);

    // how many of each type to show
    const reps = entries.map(e => ({ type: e.type, n: Math.min(CAP[e.type] ?? 3, Math.max(1, Math.ceil(e.count / (DIV[e.type] ?? 3)))) }));
    let total = reps.reduce((a, r) => a + r.n, 0); const normal = reps.find(r => r.type === 'normal');
    while (total > MAX_FIGS && normal && normal.n > 4) { normal.n--; total--; }
    let guard = 0; while (total > MAX_FIGS && guard++ < 40) { const big = reps.slice().sort((a, b) => b.n - a.n)[0]; if (!big || big.n <= 1) break; big.n--; total--; }

    const srand = mulberry32(seed * 977 + 13);
    for (const r of reps) for (let i = 0; i < r.n; i++) {
      let model: PreviewModel; try { model = build(r.type); } catch { continue; }
      const root = new THREE.Group(); root.add(model.group); root.userData.etype = r.type; this.scene.add(root);
      const fly = model.flying; const size = model.size;
      const rad = fly ? (r.type === 'dragon' ? 1.15 : 0.9) : r.type === 'log' ? 0.85 : 0.28 + size * 0.42;
      const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat); shadow.scale.setScalar(rad * (fly ? 1.0 : 1.25)); shadow.renderOrder = -1; this.scene.add(shadow);
      const ring = new THREE.Mesh(this.ringGeo, this.ringMat); ring.scale.setScalar(rad * 2.1); ring.renderOrder = -1; ring.visible = false; this.scene.add(ring);
      this.figs.push({ type: r.type, model, root, shadow, ring, r: rad, fly, seed: srand() * 50, headY0: model.limbs.head ? model.limbs.head.position.y : 0, tx: 0, tz: 0, x: 0, z: 0, y: 0, yaw: 0 });
    }

    canvas.addEventListener('pointerdown', this.onDown); canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp); canvas.addEventListener('pointercancel', this.onCancel);
    this.loop();
  }

  setSelected(type: string | null) { this.selected = type; }

  resize(w: number, h: number) {
    if (w < 2 || h < 2) return;
    this.w = w; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const aspect = w / h;
    if (this.placedAspect < 0 || Math.abs(aspect - this.placedAspect) > 0.3) { this.place(aspect); this.placedAspect = aspect; }
    this.fit();
  }

  // ---------- formation ----------
  /** role zones -> gentle random offsets -> repulsion until nobody overlaps -> tidy but natural ranks. The shape adapts to the panel: compact for tall panels, wide for wide ones. */
  private place(aspect: number) {
    const k = clamp((aspect - 0.6) / 1.0, 0, 1); // 0 = tall panel, 1 = wide panel
    const dk = lerp(0.62, 1.0, k), lk = lerp(1.05, 1.12, k);
    this.camAz = lerp(0.38, 0.98, k); this.camEl = lerp(0.66, 0.42, k);
    const yaw0 = Math.PI / 2 - 0.35 * this.camAz; // facing the towers (+x), turned a little toward the camera so the faces show
    const rng = mulberry32(this.seed * 131 + 7); const flank = new Map<string, number>(); const figs = this.figs;
    for (const f of figs) {
      const z = ZONES[f.type] ?? ZONES.normal; const x = lerp(z.x[0], z.x[1], rng()); let zz: number;
      if (z.flank) { const c = flank.get(f.type) ?? 0; flank.set(f.type, c + 1); zz = (c % 2 === 0 ? 1 : -1) * lerp(z.z[0], z.z[1], rng()); }
      else zz = (rng() * 2 - 1) * z.z[1];
      f.tx = x * dk; f.tz = zz * lk; f.x = f.tx; f.z = f.tz; f.y = z.y ?? 0; f.yaw = yaw0 + (rng() - 0.5) * 0.55;
    }
    for (let it = 0; it < 80; it++) {
      for (let i = 0; i < figs.length; i++) for (let j = i + 1; j < figs.length; j++) {
        const a = figs[i], b = figs[j]; if (a.fly !== b.fly) continue;
        let dx = a.x - b.x, dz = a.z - b.z; let d = Math.hypot(dx, dz); const min = (a.r + b.r) * 0.92; if (d >= min) continue;
        if (d < 1e-4) { dx = rng() - 0.5; dz = rng() - 0.5; d = Math.hypot(dx, dz) || 1; }
        const push = ((min - d) * 0.5) / d; a.x += dx * push; a.z += dz * push; b.x -= dx * push; b.z -= dz * push;
      }
      for (const f of figs) { f.x += (f.tx - f.x) * 0.03; f.z += (f.tz - f.z) * 0.03; } // a soft pull keeps every role near its zone
    }
    this.pts = []; const box = new THREE.Box3(); let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const f of figs) {
      f.root.position.set(f.x, f.y, f.z); f.root.rotation.y = f.yaw; f.shadow.position.set(f.x, 0.02, f.z); f.ring.position.set(f.x, 0.03, f.z);
      f.root.updateMatrixWorld(true); box.setFromObject(f.root);
      for (const cx of [box.min.x, box.max.x]) for (const cy of [box.min.y, box.max.y]) for (const cz of [box.min.z, box.max.z]) this.pts.push(new THREE.Vector3(cx, cy, cz));
      if (!f.fly) { minX = Math.min(minX, f.x - f.r); maxX = Math.max(maxX, f.x + f.r); minZ = Math.min(minZ, f.z - f.r); maxZ = Math.max(maxZ, f.z + f.r); }
    }
    if (!figs.length) { minX = -4; maxX = 0; minZ = -3; maxZ = 3; }
    const bb = new THREE.Box3().setFromPoints(this.pts.length ? this.pts : [new THREE.Vector3()]);
    this.center.set((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2);
    this.buildScenery(minX, maxX, minZ, maxZ);
  }

  /** war-camp scenery around the army: banners behind, torches at the sides, rocks around */
  private buildScenery(minX: number, maxX: number, minZ: number, maxZ: number) {
    if (this.scenery) this.scene.remove(this.scenery);
    const g = new THREE.Group(); this.scenery = g; this.scene.add(g); this.flames = []; this.flags = [];
    const side = Math.max(Math.abs(minZ), Math.abs(maxZ)) + 1.5; const rear = minX - 2.4; const front = maxX + 1.2;
    for (const z of [-0.85 * side, 0, 0.85 * side]) { // purple banners with the orc sigil
      const pole = new THREE.Mesh(this.poleGeo, this.poleMat); pole.scale.set(1, 3.6, 1); pole.position.set(rear, 1.8, z); g.add(pole);
      const flag = new THREE.Group(); flag.position.set(rear, 3.0, z); g.add(flag); this.flags.push(flag);
      const cloth = new THREE.Mesh(this.boxGeo, this.flagMat); cloth.scale.set(1.15, 0.85, 0.05); cloth.position.x = 0.62; flag.add(cloth);
      const face = new THREE.Mesh(this.sphGeo, this.sigilMat); face.scale.set(0.27, 0.27, 0.06); face.position.set(0.62, 0, 0.04); flag.add(face);
      for (const ex of [-0.09, 0.09]) { const eye = new THREE.Mesh(this.sphGeo, this.whiteMat); eye.scale.set(0.055, 0.055, 0.03); eye.position.set(0.62 + ex, 0.04, 0.09); flag.add(eye); }
      const top = new THREE.Mesh(this.sphGeo, this.whiteMat); top.scale.setScalar(0.09); top.position.set(rear, 3.65, z); g.add(top);
    }
    const torchSpots: [number, number][] = [[front, -side], [front, side], [rear + 2.2, -side], [rear + 2.2, side]];
    torchSpots.forEach(([x, z], i) => { // torches with a flame and a halo
      const pole = new THREE.Mesh(this.poleGeo, this.poleMat); pole.scale.set(1, 1.7, 1); pole.position.set(x, 0.85, z); g.add(pole);
      const bowl = new THREE.Mesh(this.coneGeo, this.poleMat); bowl.scale.set(0.2, 0.22, 0.2); bowl.rotation.x = Math.PI; bowl.position.set(x, 1.8, z); g.add(bowl);
      const fl = makeFlame(0.42); fl.position.set(x, 1.86, z); g.add(fl); this.flames.push(fl);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTexture, color: 0xffa24a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 })); halo.scale.setScalar(1.9); halo.position.set(x, 2.1, z); g.add(halo);
      if (i < this.torchLights.length) this.torchLights[i].position.set(x, 2.2, z);
    });
    const rng = mulberry32(this.seed * 17 + 3);
    for (let i = 0; i < 10; i++) { // rocks
      const a = rng() * 6.28; const rr = Math.max(side + 1.5, 6.5) + rng() * 4.5; const rock = new THREE.Mesh(this.sphGeo, this.rockMat);
      rock.scale.set(0.35 + rng() * 0.5, 0.25 + rng() * 0.3, 0.3 + rng() * 0.45); rock.position.set((minX + maxX) / 2 + Math.cos(a) * rr * 1.25, 0.12, Math.sin(a) * rr * 0.75); rock.rotation.y = rng() * 3; g.add(rock);
    }
    this.glow.position.set(rear - 6, 3.2, 0);
  }

  // ---------- camera ----------
  private dirOut(az: number, el: number) { return new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)); }
  /** the camera distance at which every figure (incl. flyers) is inside the frame for a given viewing angle */
  private fitFor(az: number, el: number) {
    const out = this.dirOut(az, el); const f = out.clone().negate(); const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(); const up = new THREE.Vector3().crossVectors(right, f).normalize();
    const tv = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2); const th = tv * this.camera.aspect; let dist = 4;
    for (const p of this.pts) { const r = this.tmp.copy(p).sub(this.center); dist = Math.max(dist, Math.abs(r.dot(right)) / th - r.dot(f), Math.abs(r.dot(up)) / tv - r.dot(f)); }
    return dist;
  }
  private fit() { this.dist = Math.max(this.fitFor(this.camAz - 0.5, this.camEl), this.fitFor(this.camAz, this.camEl), this.fitFor(this.camAz + 0.5, this.camEl)) * 1.07; }

  // ---------- interaction ----------
  private onDown = (e: PointerEvent) => { this.downX = e.clientX; this.downY = e.clientY; this.lastX = e.clientX; this.moved = false; this.dragging = true; try { this.canvas.setPointerCapture(e.pointerId); } catch { /* not supported */ } };
  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return; const dx = e.clientX - this.lastX; this.lastX = e.clientX;
    if (Math.abs(e.clientX - this.downX) + Math.abs(e.clientY - this.downY) > 8) this.moved = true;
    if (this.moved) this.orbit = clamp(this.orbit - dx * 0.006, -0.5, 0.5);
  };
  private onUp = (e: PointerEvent) => { if (!this.dragging) return; this.dragging = false; if (!this.moved) this.onPick(this.pick(e.clientX, e.clientY)); };
  private onCancel = () => { this.dragging = false; };
  private pick(cx: number, cy: number): string | null {
    const rect = this.canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return null;
    this.ray.setFromCamera(new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1), this.camera);
    const hits = this.ray.intersectObjects(this.figs.map(f => f.root), true);
    for (const h of hits) { let o: THREE.Object3D | null = h.object; while (o && !o.userData.etype) o = o.parent; if (o) return o.userData.etype as string; }
    return null;
  }

  // ---------- life ----------
  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now(); const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    if (this.w < 2) return;
    this.update(dt); this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number) {
    const t = this.t;
    const az = this.camAz + this.orbit + Math.sin(t * 0.25) * 0.045, el = this.camEl + Math.sin(t * 0.19) * 0.012;
    this.camera.position.copy(this.center).addScaledVector(this.dirOut(az, el), this.dist); this.camera.lookAt(this.center);
    this.key.position.copy(this.camera.position).add(this.tmp.set(0, 4, 0)); this.key.target.position.copy(this.center);
    this.rim.position.set(this.center.x - 9, 7, this.center.z - 5); this.rim.target.position.copy(this.center);
    for (const f of this.figs) this.animFig(f, t, dt);
    this.flames.forEach((fl, i) => flickerFlame(fl, t + i * 1.7)); this.torchLights.forEach((l, i) => { l.intensity = 1.7 + Math.sin(t * 9 + i * 2) * 0.35; });
    this.flags.forEach((fl, i) => { fl.rotation.y = Math.sin(t * 2.2 + i) * 0.28; fl.rotation.z = Math.sin(t * 1.6 + i * 2) * 0.05; });
    this.haloMat.opacity = 0.5 + Math.sin(t * 1.4) * 0.12;
    this.ringMat.opacity = 0.65 + Math.sin(t * 6) * 0.25;
    const arr = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < arr.count; i++) { arr.setXYZ(i, this.dustBase[i * 3] + Math.sin(t * 0.3 + i) * 0.5, (this.dustBase[i * 3 + 1] + t * 0.12 + i * 0.07) % 5, this.dustBase[i * 3 + 2] + Math.cos(t * 0.25 + i * 1.3) * 0.5); }
    arr.needsUpdate = true;
  }

  /** the idle behaviour of one figure: starts from the exact pose functions the game uses (zero stride) and adds "ready for battle" life on top */
  private animFig(f: Fig, t: number, dt: number) {
    const L = f.model.limbs; const type = f.type; const tt = t + f.seed; const sel = this.selected === type; let cheer = 0; let yy = f.y;
    if (type === 'log') {
      if (L.roll) L.roll.rotation.x = Math.sin(tt * 0.9) * 0.08;
    } else if (type === 'balloon') {
      yy = f.y + Math.sin(tt * 1.4) * 0.18;
      if (L.balloon) { L.balloon.rotation.z = Math.sin(tt * 1.1) * 0.04; const b = L.balloon.getObjectByName('burner'); if (b) flickerFlame(b, tt, 1.1); }
      if (L.gun) L.gun.rotation.y = Math.sin(tt * 0.5) * 0.4;
    } else if (type === 'dragon') {
      yy = f.y + Math.sin(tt * 2) * 0.15;
      const fl = Math.sin(tt * 6) * 0.55; if (L.wingL) L.wingL.rotation.z = fl; if (L.wingR) L.wingR.rotation.z = -fl;
      if (L.tail) L.tail.rotation.y = Math.sin(tt * 2.2) * 0.35; if (L.head) L.head.rotation.x = Math.sin(tt * 1.6) * 0.1;
    } else {
      if (isElite(type)) poseElite(type, L, 0, tt); else poseOrc(type as OrcKind, L, 0);
      if (L.body) L.body.scale.y = 1 + Math.sin(tt * 2.3) * 0.025;                                     // breathing
      if (L.head) { L.head.position.y = f.headY0 + Math.sin(tt * 2.3) * 0.012; L.head.rotation.y = Math.sin(tt * 0.55) * 0.3; } // looking around
      L.legL.rotation.x = Math.sin(tt * 1.1) * 0.05; L.legR.rotation.x = -Math.sin(tt * 1.1) * 0.05;  // shifting weight
      if (L.earL && L.earR) { const d = Math.sin(tt * 2.6) * 0.07; L.earL.rotation.z += d; L.earR.rotation.z -= d; }
      if (CHEER.has(type)) { // every ~9 seconds the orc raises its weapon and roars
        const c = (tt * 0.11) % 1, w = 0.16; cheer = c < w ? Math.sin((c / w) * Math.PI) : 0;
        if (cheer > 0) {
          L.armR.rotation.x = lerp(L.armR.rotation.x, -2.7, cheer); L.armR.rotation.z = 0.15 + Math.sin(t * 16) * 0.18 * cheer;
          if (BOTH_ARMS.has(type)) { L.armL.rotation.x = lerp(L.armL.rotation.x, -2.5, cheer); L.armL.rotation.z = -0.15 - Math.sin(t * 16 + 1) * 0.18 * cheer; }
        }
      }
      if (type === 'archer') { // draws the bow, lets go, nocks the next arrow
        const c = (tt * 0.26) % 1; let d = 0, nock = false, aim = false;
        if (c < 0.6) { aim = true; d = Math.min(1, c / 0.5); nock = true; } else if (c < 0.7) aim = true; else nock = c > 0.85;
        if (aim) { L.armL.rotation.set(-1.55, 0, 0.05); L.armR.rotation.set(-1.5 - d * 0.15, 0, 0.5 + d * 0.3); }
        if (L.bow) setBowDraw(L.bow, d, nock);
      }
      if (type === 'dread') { // practises its overhead chop now and then
        const c = (tt * 0.13) % 1;
        if (c < 0.09) poseDread(L, 'wind', c / 0.09); else if (c < 0.11) poseDread(L, 'swing', (c - 0.09) / 0.02); else if (c < 0.2) poseDread(L, 'rest', (c - 0.11) / 0.09);
      }
      if (type === 'cannoneer' && L.torch) { const tf = L.torch.getObjectByName('flame'); if (tf) flickerFlame(tf, tt); }
      if (type === 'bomber' && L.head) { const hf = L.head.getObjectByName('flame'); if (hf) flickerFlame(hf, tt); }
      if (type === 'rider' && L.mount) { L.mount.position.y = -0.14 + Math.sin(tt * 2.5) * 0.02; }
    }
    if (L.face) updateFace(L.face, dt, t, { lookX: Math.sin(tt * 0.5) * 0.8, lookY: Math.sin(tt * 0.33) * 0.2, focus: sel ? 0.6 : 0.3, squint: cheer > 0.35 ? 1 : 0, worry: 0 });
    if (L.face2) updateFace(L.face2, dt, t, { lookX: Math.sin(tt * 0.5) * 0.8, lookY: 0, focus: 0.3, squint: 0, worry: 0 });
    const hop = sel ? Math.abs(Math.sin(t * 5 + f.seed)) * 0.18 : 0; const cheerHop = cheer > 0 ? Math.abs(Math.sin(t * 13 + f.seed)) * 0.1 * cheer : 0;
    f.root.position.y = yy + hop + cheerHop;
    f.ring.visible = sel; if (sel) f.ring.scale.setScalar(f.r * 2.1 * (1 + Math.sin(t * 6 + f.seed) * 0.06));
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    const c = this.canvas; c.removeEventListener('pointerdown', this.onDown); c.removeEventListener('pointermove', this.onMove); c.removeEventListener('pointerup', this.onUp); c.removeEventListener('pointercancel', this.onCancel);
    for (const d of [this.shadowGeo, this.shadowMat, this.ringGeo, this.ringMat, this.glowTexture, this.fade, this.poleGeo, this.boxGeo, this.sphGeo, this.coneGeo, this.poleMat, this.flagMat, this.sigilMat, this.whiteMat, this.rockMat, this.haloMat, this.dust.geometry, this.ground.geometry]) d.dispose();
    this.renderer.dispose();
  }
}
