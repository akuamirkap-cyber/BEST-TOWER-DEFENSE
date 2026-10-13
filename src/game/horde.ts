import * as THREE from 'three';
import { updateFace, flickerFlame } from './voxel';
import { poseOrc } from './orcs';
import type { OrcKind } from './orcs';
import { isElite, poseElite, poseDread, setBowDraw } from './elites';
import { BIOMES, buildTreeMesh, buildBoulder, tuftGeo, flowerGeo } from './world';
import type { Biome } from './world';

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
const CAP: Record<string, number> = { normal: 9, baby: 3, fast: 3, tank: 3, berserker: 3, legion: 4, captain: 1, dread: 2, archer: 3, gunner: 2, cannoneer: 2, jumper: 2, shaman: 2, boss: 1, log: 1, balloon: 2, dragon: 2, ninja: 2, bomber: 2, magnet: 2, frost: 2, rider: 2, punk: 2, shield: 2, toxic: 2, bat: 2, troll: 2, gargantuar: 2, imp: 2, bungee: 2, miner: 2 };
const DIV: Record<string, number> = { normal: 5, legion: 2 };
const MAX_FIGS = 36;
const CHEER = new Set(['normal', 'fast', 'baby', 'tank', 'berserker', 'captain', 'legion', 'boss', 'shaman', 'ninja', 'bomber', 'magnet', 'frost', 'rider', 'punk', 'shield', 'toxic', 'troll', 'gargantuar', 'imp', 'miner']);
const BOTH_ARMS = new Set(['normal', 'fast', 'baby', 'tank', 'berserker', 'ninja', 'punk', 'imp', 'miner']);

/** where each role stands: x = distance behind the front line (negative = further back, positive = out in front), z = sideways spread */
interface Zone { x: [number, number]; z: [number, number]; flank?: boolean; y?: number }
const ZONES: Record<string, Zone> = {
  log: { x: [0.9, 1.6], z: [1.8, 3.4], flank: true },
  bomber: { x: [0.4, 1.4], z: [0.8, 3.4], flank: true },
  miner: { x: [0.2, 1.1], z: [0.6, 3.2], flank: true },
  ninja: { x: [-0.4, 0.7], z: [0.8, 3.8] },
  punk: { x: [-0.3, 0.8], z: [0.6, 3.8] },
  baby: { x: [-0.2, 1.0], z: [0, 4.2] },
  imp: { x: [-0.2, 0.9], z: [0.4, 3.8] },
  fast: { x: [-0.6, 0.4], z: [0, 4.2] },
  shield: { x: [-0.6, 0.4], z: [1.0, 3.0] },
  dread: { x: [-0.3, -1.0], z: [2.3, 3.5], flank: true },
  gargantuar: { x: [-1.0, -2.4], z: [1.8, 3.8], flank: true },
  captain: { x: [-0.4, -0.7], z: [0, 0.5] },
  legion: { x: [-1.6, -3.4], z: [0, 1.5] },
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
  bungee: { x: [-1.6, -4.2], z: [1.4, 3.6], flank: true, y: 1.45 },
  bat: { x: [-2.0, -5.0], z: [1.8, 4.0], flank: true, y: 1.35 },
  balloon: { x: [-3.8, -6.2], z: [1.6, 3.9], flank: true, y: 1.6 },
  dragon: { x: [-2.4, -5.4], z: [2.6, 4.4], flank: true, y: 1.65 },
};

interface Fig {
  type: string; model: PreviewModel; root: THREE.Group; shadow: THREE.Mesh; ring: THREE.Mesh;
  r: number; fly: boolean; seed: number; headY0: number;
  tx: number; tz: number; x: number; z: number; y: number; yaw: number;
}

function fadeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, '#fff');
  gr.addColorStop(0.82, '#fff');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export class HordeView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 0.1, 140);
  private figs: Fig[] = [];
  private raf = 0; private last = performance.now(); private t = 0;
  private w = 0; private placedAspect = -1;
  private selected: string | null = null;
  private center = new THREE.Vector3(-2, 0.62, 0); private pts: THREE.Vector3[] = [];
  private camAz = 0.55; private camEl = 0.32; private baseDist = 9; private dist = 9; private orbit = 0;
  private userZoom = 1.0;
  private dragging = false; private moved = false; private downX = 0; private downY = 0; private lastX = 0;
  private activePointers = new Map<number, { x: number; y: number }>();
  private initialPinchDist = 0;
  private initialZoom = 1.0;
  private ray = new THREE.Raycaster(); private tmp = new THREE.Vector3();
  private shadowGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  private shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
  private ringGeo = new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2);
  private ringMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  private hemi: THREE.HemisphereLight;
  private key: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private scenery: THREE.Group | null = null; private flags: THREE.Object3D[] = [];
  private treeSways: { piv: THREE.Object3D; amp: number; ph: number }[] = [];
  private dust: THREE.Points; private dustBase: Float32Array;
  private fade: THREE.Texture;
  private ground: THREE.Mesh | null = null;
  private poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 1, 8); private boxGeo = new THREE.BoxGeometry(1, 1, 1); private sphGeo = new THREE.SphereGeometry(1, 10, 8);
  private poleMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 });
  private flagMat = new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.6, emissive: 0x4c1d95, emissiveIntensity: 0.25, side: THREE.DoubleSide });
  private sigilMat = new THREE.MeshStandardMaterial({ color: 0x7ed957, roughness: 0.6, emissive: 0x3f8f2a, emissiveIntensity: 0.3 });
  private whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private biome: Biome;
  private seed: number;
  private disposables: { dispose(): void }[] = [];

  constructor(private canvas: HTMLCanvasElement, build: BuildFn, entries: HordeEntry[], private level: number, private onPick: (type: string | null) => void) {
    const biomeIdx = ((this.level - 1) % BIOMES.length + BIOMES.length) % BIOMES.length;
    this.biome = BIOMES[biomeIdx];
    this.seed = (this.level * 7 + biomeIdx * 131 + 11) | 0;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;

    // Daylight lighting: bright sun + vibrant sky hemisphere reflection
    this.hemi = new THREE.HemisphereLight(this.biome.skyTop, this.biome.grass[1], 1.45);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xfffaec, 2.8); this.scene.add(this.key, this.key.target);
    this.rim = new THREE.DirectionalLight(this.biome.skyBot, 1.1); this.scene.add(this.rim, this.rim.target);
    this.scene.fog = new THREE.Fog(this.biome.fog, 24, 55);

    // Alpha map for outer ground boundary
    this.fade = fadeTex();

    // Sunny floating particles (dandelion, pollen, light breeze dust)
    const prng = mulberry32(this.seed * 31 + 5);
    const N = 65; const pos = new Float32Array(N * 3); this.dustBase = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { this.dustBase[i * 3] = (prng() - 0.5) * 24 - 2; this.dustBase[i * 3 + 1] = prng() * 5; this.dustBase[i * 3 + 2] = (prng() - 0.5) * 16; }
    pos.set(this.dustBase);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dustCol = this.biome.snow ? 0xffffff : (this.biome.fly ?? 0xfff6a8);
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: dustCol, size: 0.09, transparent: true, opacity: 0.65, depthWrite: false, sizeAttenuation: true })); this.dust.frustumCulled = false; this.scene.add(this.dust);

    // How many figures to show
    const reps = entries.map(e => ({ type: e.type, n: Math.min(CAP[e.type] ?? 3, Math.max(1, Math.ceil(e.count / (DIV[e.type] ?? 3)))) }));
    let total = reps.reduce((a, r) => a + r.n, 0); const normal = reps.find(r => r.type === 'normal');
    while (total > MAX_FIGS && normal && normal.n > 4) { normal.n--; total--; }
    let guard = 0; while (total > MAX_FIGS && guard++ < 40) { const big = reps.slice().sort((a, b) => b.n - a.n)[0]; if (!big || big.n <= 1) break; big.n--; total--; }

    const srand = mulberry32(this.seed * 977 + 13);
    for (const r of reps) for (let i = 0; i < r.n; i++) {
      let model: PreviewModel; try { model = build(r.type); } catch { continue; }
      const root = new THREE.Group(); root.add(model.group); root.userData.etype = r.type; this.scene.add(root);
      const fly = model.flying; const size = model.size;
      const rad = fly ? (r.type === 'dragon' ? 1.15 : r.type === 'balloon' ? 1.2 : 0.9) : r.type === 'log' ? 0.85 : 0.28 + size * 0.42;
      const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat); shadow.scale.setScalar(rad * (fly ? 0.95 : 1.2)); shadow.renderOrder = -1; this.scene.add(shadow);
      const ring = new THREE.Mesh(this.ringGeo, this.ringMat); ring.scale.setScalar(rad * 2.1); ring.renderOrder = -1; ring.visible = false; this.scene.add(ring);
      this.figs.push({ type: r.type, model, root, shadow, ring, r: rad, fly, seed: srand() * 50, headY0: model.limbs.head ? model.limbs.head.position.y : 0, tx: 0, tz: 0, x: 0, z: 0, y: 0, yaw: 0 });
    }

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
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
  private place(aspect: number) {
    const k = clamp((aspect - 0.6) / 1.0, 0, 1);
    const dk = lerp(0.68, 1.0, k), lk = lerp(1.05, 1.12, k);
    this.camAz = lerp(0.42, 0.88, k);
    this.camEl = lerp(0.38, 0.28, k); // engaging ground view looking directly at standing troops
    const yaw0 = Math.PI / 2 - 0.32 * this.camAz;
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
      for (const f of figs) { f.x += (f.tx - f.x) * 0.03; f.z += (f.tz - f.z) * 0.03; }
    }
    this.pts = []; const box = new THREE.Box3(); let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const f of figs) {
      f.root.position.set(f.x, f.y, f.z); f.root.rotation.y = f.yaw; f.shadow.position.set(f.x, 0.02, f.z); f.ring.position.set(f.x, 0.03, f.z);
      f.root.updateMatrixWorld(true); box.setFromObject(f.root);
      // Bound framing around ground troops with reasonable height allowance so flyers do not push camera far away
      const topY = f.fly ? 1.6 : Math.min(1.85, box.max.y);
      for (const cx of [box.min.x, box.max.x])
        for (const cy of [Math.min(0, box.min.y), topY])
          for (const cz of [box.min.z, box.max.z])
            this.pts.push(new THREE.Vector3(cx, cy, cz));
      if (!f.fly) { minX = Math.min(minX, f.x - f.r); maxX = Math.max(maxX, f.x + f.r); minZ = Math.min(minZ, f.z - f.r); maxZ = Math.max(maxZ, f.z + f.r); }
    }
    if (!figs.length) { minX = -4; maxX = 0; minZ = -3; maxZ = 3; }
    const midX = (minX + maxX) / 2;
    const midZ = (minZ + maxZ) / 2;
    this.center.set(midX, 0.62, midZ);
    this.buildScenery(minX, maxX, minZ, maxZ);
  }

  /** Central flat staging lapangan (troop muster field), surrounded by rolling green grass terrain */
  private buildTerrain(cx: number, cz: number, rx: number, rz: number): (x: number, z: number) => number {
    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground.geometry.dispose();
      (this.ground.material as THREE.Material).dispose();
      this.ground = null;
    }
    const B = this.biome;

    // Inside the lapangan (d <= 0.95): flat staging surface (y = 0).
    // Surrounding: rolling grass hills forming an arena around the clearing.
    const elevationAt = (x: number, z: number) => {
      const dx = (x - cx) / rx, dz = (z - cz) / rz;
      const d = Math.hypot(dx, dz);
      if (d <= 0.95) return 0;
      const t = clamp((d - 0.95) / 1.5, 0, 1);
      const w = t * t * (3 - 2 * t);
      const hill = 0.58 + 0.35 * Math.sin(x * 0.22 + 1.4) * Math.cos(z * 0.2) + 0.2 * Math.cos((x - z) * 0.24);
      const rearFactor = x < cx ? 1.4 : 0.75;
      return w * hill * rearFactor;
    };

    const S = 28;
    const seg = 64;
    const nx = seg + 1, nz = seg + 1;
    const pos = new Float32Array(nx * nz * 3);
    const col = new Float32Array(nx * nz * 3);
    const uvs = new Float32Array(nx * nz * 2);
    const idx = new Uint32Array(seg * seg * 6);

    const cSand0 = new THREE.Color(B.sand[0]);
    const cSand1 = new THREE.Color(B.sand[1]);
    const cLane = new THREE.Color(B.lane);
    const cEarth = new THREE.Color(0x6b533b);
    const cGrass0 = new THREE.Color(B.grass[0]);
    const cGrass1 = new THREE.Color(B.grass[1]);
    const cGrass2 = new THREE.Color(B.grass[2]);

    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const u = i / seg, v = j / seg;
        const x = cx - S + u * 2 * S;
        const z = cz - S + v * 2 * S;
        const y = elevationAt(x, z);

        pos[k * 3] = x;
        pos[k * 3 + 1] = y;
        pos[k * 3 + 2] = z;

        uvs[k * 2] = u;
        uvs[k * 2 + 1] = v;

        const dx = (x - cx) / rx, dz = (z - cz) / rz;
        const d = Math.hypot(dx, dz);
        const noise = (Math.sin(x * 1.7) * Math.cos(z * 1.5) + 1) * 0.5;

        // Lapangan: assembly ground dirt, trodden soil, and sand
        const cLap = cEarth.clone().lerp(cSand0, 0.45).lerp(cSand1, noise * 0.35);
        cLap.lerp(cLane, (Math.sin(x * 3.1 + z * 2.7) + 1) * 0.1);

        // Rumput terain: lush biome grass with natural multi-tone variations
        const cGrass = cGrass1.clone().lerp(cGrass0, noise * 0.4).lerp(cGrass2, (Math.cos(x * 2.3) + 1) * 0.15);

        // Smooth transition from the trodden field into the surrounding grass
        const tGrass = clamp((d - 0.88) / 0.35, 0, 1);
        const blend = tGrass * tGrass * (3 - 2 * tGrass);
        const finalCol = cLap.clone().lerp(cGrass, blend);

        col[k * 3] = finalCol.r;
        col[k * 3 + 1] = finalCol.g;
        col[k * 3 + 2] = finalCol.b;
      }
    }

    let ii = 0;
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        idx[ii++] = a; idx[ii++] = c; idx[ii++] = b;
        idx[ii++] = b; idx[ii++] = c; idx[ii++] = d;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      transparent: true,
      alphaMap: this.fade,
      depthWrite: true,
    });

    this.ground = new THREE.Mesh(geo, mat);
    this.ground.renderOrder = -3;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    return elevationAt;
  }

  /** Scenery: muster banners behind the army, 3D voxel trees ringing the lapangan, tufts, flowers, boulders */
  private buildScenery(minX: number, maxX: number, minZ: number, maxZ: number) {
    if (this.scenery) this.scene.remove(this.scenery);
    const g = new THREE.Group(); this.scenery = g; this.scene.add(g);
    this.flags = []; this.treeSways = [];
    for (const d of this.disposables) d.dispose();
    this.disposables = [];

    const side = Math.max(Math.abs(minZ), Math.abs(maxZ)) + 1.5;
    const rear = minX - 2.2;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const rx = Math.max(4.4, (maxX - minX) * 0.52 + 1.2);
    const rz = Math.max(4.0, (maxZ - minZ) * 0.52 + 1.2);

    const elevationAt = this.buildTerrain(cx, cz, rx, rz);

    // War banners on carved wooden poles behind the rear line
    for (const z of [-0.75 * side, 0, 0.75 * side]) {
      const by = elevationAt(rear, z);
      const pole = new THREE.Mesh(this.poleGeo, this.poleMat); pole.scale.set(1, 3.6, 1); pole.position.set(rear, by + 1.8, z); g.add(pole);
      const flag = new THREE.Group(); flag.position.set(rear, by + 3.0, z); g.add(flag); this.flags.push(flag);
      const cloth = new THREE.Mesh(this.boxGeo, this.flagMat); cloth.scale.set(1.15, 0.85, 0.05); cloth.position.x = 0.62; flag.add(cloth);
      const face = new THREE.Mesh(this.sphGeo, this.sigilMat); face.scale.set(0.27, 0.27, 0.06); face.position.set(0.62, 0, 0.04); flag.add(face);
      for (const ex of [-0.09, 0.09]) { const eye = new THREE.Mesh(this.sphGeo, this.whiteMat); eye.scale.set(0.055, 0.055, 0.03); eye.position.set(0.62 + ex, 0.04, 0.09); flag.add(eye); }
      const top = new THREE.Mesh(this.sphGeo, this.whiteMat); top.scale.setScalar(0.09); top.position.set(rear, by + 3.65, z); g.add(top);
    }

    // 3D Voxel trees ringing the lapangan on the surrounding grass terrain
    const B = this.biome;
    const treeRng = mulberry32(this.level * 41 + 17);
    const treeSpots: [number, number, number][] = [
      // Rear hill line (directly framing the background behind the army):
      [minX - 3.2, cz - 3.4, 1.2],
      [minX - 3.8, cz - 0.8, 1.25],
      [minX - 3.3, cz + 1.9, 1.15],
      [minX - 4.2, cz + 3.9, 1.25],
      [minX - 5.4, cz - 4.6, 1.2],
      [minX - 6.0, cz - 1.9, 1.3],
      [minX - 5.8, cz + 1.3, 1.25],
      [minX - 6.4, cz + 4.8, 1.15],
      [minX - 7.5, cz - 3.2, 1.1],
      [minX - 8.2, cz + 2.5, 1.2],
      // North flank (+z grass hills):
      [cx - 2.0, maxZ + 2.4, 1.15],
      [cx + 0.6, maxZ + 3.4, 1.1],
      [cx + 3.0, maxZ + 2.8, 1.0],
      [cx + 5.2, maxZ + 3.8, 1.05],
      [minX - 1.5, maxZ + 5.4, 1.2],
      // South flank (-z grass hills):
      [cx - 1.8, minZ - 2.5, 1.15],
      [cx + 0.8, minZ - 3.4, 1.1],
      [cx + 3.2, minZ - 2.9, 1.0],
      [cx + 5.4, minZ - 3.9, 1.05],
      [minX - 1.4, minZ - 5.2, 1.2],
    ];

    treeSpots.forEach(([tx, tz, s]) => {
      let r = treeRng() * B.trees.reduce((acc, t) => acc + t[1], 0);
      let kind = B.trees[0][0];
      for (const [k, w] of B.trees) {
        if ((r -= w) <= 0) { kind = k; break; }
      }
      const tree = buildTreeMesh(kind, B, treeRng);
      const ty = elevationAt(tx, tz);
      tree.group.position.set(tx, ty, tz);
      tree.group.rotation.y = treeRng() * 6.28;
      tree.group.scale.setScalar(s * (0.88 + treeRng() * 0.28));
      g.add(tree.group);
      this.treeSways.push({ piv: tree.piv, amp: tree.amp, ph: tree.ph });
    });

    // Tufts of grass on the surrounding hills
    const tuftG = tuftGeo();
    this.disposables.push(tuftG);
    const tuftMat = new THREE.MeshStandardMaterial({ color: B.grass[1], roughness: 0.95, side: THREE.DoubleSide });
    this.disposables.push(tuftMat);
    for (let i = 0; i < 32; i++) {
      const ang = treeRng() * 6.28;
      const dist = 1.05 + treeRng() * 0.8;
      const gx = cx + Math.cos(ang) * rx * dist;
      const gz = cz + Math.sin(ang) * rz * dist;
      const gy = elevationAt(gx, gz);
      const tm = new THREE.Mesh(tuftG, tuftMat);
      tm.position.set(gx, gy, gz);
      tm.scale.setScalar(0.25 + treeRng() * 0.18);
      tm.rotation.y = treeRng() * 6.28;
      g.add(tm);
    }

    // Biome flowers
    if (B.flowers && B.flowers.length > 0) {
      for (let i = 0; i < 22; i++) {
        const fc = B.flowers[i % B.flowers.length];
        const flG = flowerGeo(fc);
        this.disposables.push(flG);
        const flMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
        this.disposables.push(flMat);
        const ang = treeRng() * 6.28;
        const dist = 1.08 + treeRng() * 0.75;
        const fx = cx + Math.cos(ang) * rx * dist;
        const fz = cz + Math.sin(ang) * rz * dist;
        const fy = elevationAt(fx, fz);
        const fm = new THREE.Mesh(flG, flMat);
        fm.position.set(fx, fy, fz);
        fm.scale.setScalar(0.3 + treeRng() * 0.2);
        fm.rotation.y = treeRng() * 6.28;
        g.add(fm);
      }
    }

    // Boulders
    for (let i = 0; i < 7; i++) {
      const ang = treeRng() * 6.28;
      const dist = 1.15 + treeRng() * 0.7;
      const bx = cx + Math.cos(ang) * rx * dist;
      const bz = cz + Math.sin(ang) * rz * dist;
      const by = elevationAt(bx, bz);
      const bObj = buildBoulder(B.stone, B.moss, treeRng);
      bObj.group.position.set(bx, by, bz);
      bObj.group.scale.setScalar(0.55 + treeRng() * 0.35);
      bObj.group.rotation.y = treeRng() * 6.28;
      g.add(bObj.group);
      this.disposables.push(bObj.geo, bObj.ol);
    }
  }

  // ---------- camera ----------
  private dirOut(az: number, el: number) { return new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)); }
  /** distance at which figures fit inside the camera frame */
  private fitFor(az: number, el: number) {
    const out = this.dirOut(az, el); const f = out.clone().negate(); const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(); const up = new THREE.Vector3().crossVectors(right, f).normalize();
    const tv = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2); const th = tv * this.camera.aspect; let dist = 4;
    for (const p of this.pts) { const r = this.tmp.copy(p).sub(this.center); dist = Math.max(dist, Math.abs(r.dot(right)) / th - r.dot(f), Math.abs(r.dot(up)) / tv - r.dot(f)); }
    return dist;
  }
  private fit() {
    const rawDist = Math.max(
      this.fitFor(this.camAz - 0.4, this.camEl),
      this.fitFor(this.camAz, this.camEl),
      this.fitFor(this.camAz + 0.4, this.camEl)
    );
    // Zoom in noticeably closer so troops appear large and detailed
    this.baseDist = rawDist * 0.64;
    this.dist = this.baseDist * this.userZoom;
  }

  // ---------- interaction ----------
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.userZoom = clamp(this.userZoom * (1 + e.deltaY * 0.0012), 0.45, 1.4);
    this.fit();
  };

  private onDown = (e: PointerEvent) => {
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.activePointers.size === 1) {
      this.downX = e.clientX; this.downY = e.clientY; this.lastX = e.clientX; this.moved = false; this.dragging = true;
      try { this.canvas.setPointerCapture(e.pointerId); } catch { /* not supported */ }
    } else if (this.activePointers.size === 2) {
      this.dragging = false;
      const pts = Array.from(this.activePointers.values());
      this.initialPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.initialZoom = this.userZoom;
    }
  };

  private onMove = (e: PointerEvent) => {
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (this.activePointers.size === 2 && this.initialPinchDist > 5) {
      const pts = Array.from(this.activePointers.values());
      const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = curDist / this.initialPinchDist;
      this.userZoom = clamp(this.initialZoom / Math.max(0.2, ratio), 0.45, 1.4);
      this.fit();
      return;
    }
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX; this.lastX = e.clientX;
    if (Math.abs(e.clientX - this.downX) + Math.abs(e.clientY - this.downY) > 8) this.moved = true;
    if (this.moved) this.orbit = clamp(this.orbit - dx * 0.006, -0.65, 0.65);
  };

  private onUp = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    if (!this.dragging) return;
    this.dragging = false;
    if (!this.moved) this.onPick(this.pick(e.clientX, e.clientY));
  };

  private onCancel = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    this.dragging = false;
  };

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
    const az = this.camAz + this.orbit + Math.sin(t * 0.25) * 0.035, el = this.camEl + Math.sin(t * 0.19) * 0.012;
    this.camera.position.copy(this.center).addScaledVector(this.dirOut(az, el), this.dist); this.camera.lookAt(this.center);
    this.key.position.copy(this.camera.position).add(this.tmp.set(5, 10, 4)); this.key.target.position.copy(this.center);
    this.rim.position.set(this.center.x - 9, 7, this.center.z - 6); this.rim.target.position.copy(this.center);
    for (const f of this.figs) this.animFig(f, t, dt);
    this.flags.forEach((fl, i) => { fl.rotation.y = Math.sin(t * 2.2 + i) * 0.28; fl.rotation.z = Math.sin(t * 1.6 + i * 2) * 0.05; });
    this.ringMat.opacity = 0.65 + Math.sin(t * 6) * 0.25;
    this.treeSways.forEach(s => {
      s.piv.rotation.z = Math.sin(t * 1.8 + s.ph) * s.amp;
      s.piv.rotation.x = Math.cos(t * 1.3 + s.ph) * (s.amp * 0.65);
    });
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
      if (type === 'rider' && L.mount) { L.mount.position.y = 0.72 + Math.sin(tt * 2.5) * 0.02; }
      if (type === 'bat') {
        if (L.wingL && L.wingR) {
          const flap = Math.sin(tt * 4.2) * 0.35;
          L.wingL.rotation.y = 0.25 + flap;
          L.wingR.rotation.y = -0.25 - flap;
          L.wingL.rotation.z = Math.sin(tt * 4.2) * 0.18;
          L.wingR.rotation.z = -Math.sin(tt * 4.2) * 0.18;
        }
      }
      if (type === 'gargantuar') {
        if (L.impRider) {
          L.impRider.position.y = 0.22 * 1.42 + Math.abs(Math.sin(tt * 2.2)) * 0.04;
          L.impRider.rotation.y = Math.sin(tt * 1.4) * 0.2;
        }
      }
    }
    if (L.face) updateFace(L.face, dt, t, { lookX: Math.sin(tt * 0.5) * 0.8, lookY: Math.sin(tt * 0.33) * 0.2, focus: sel ? 0.6 : 0.3, squint: cheer > 0.35 ? 1 : 0, worry: 0 });
    if (L.face2) updateFace(L.face2, dt, t, { lookX: Math.sin(tt * 0.5) * 0.8, lookY: 0, focus: 0.3, squint: 0, worry: 0 });
    const hop = sel ? Math.abs(Math.sin(t * 5 + f.seed)) * 0.18 : 0; const cheerHop = cheer > 0 ? Math.abs(Math.sin(t * 13 + f.seed)) * 0.1 * cheer : 0;
    f.root.position.y = yy + hop + cheerHop;
    f.ring.visible = sel; if (sel) f.ring.scale.setScalar(f.r * 2.1 * (1 + Math.sin(t * 6 + f.seed) * 0.06));
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onCancel);
    c.removeEventListener('wheel', this.onWheel);
    for (const d of [this.shadowGeo, this.shadowMat, this.ringGeo, this.ringMat, this.fade, this.poleGeo, this.boxGeo, this.sphGeo, this.poleMat, this.flagMat, this.sigilMat, this.whiteMat, this.dust.geometry]) d.dispose();
    if (this.ground) { this.ground.geometry.dispose(); (this.ground.material as THREE.Material).dispose(); }
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
  }
}
