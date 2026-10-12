import * as THREE from 'three';
import { BIOMES, buildWorld, makeSkyTexture } from './world';
import { buildTowerModel } from './towers';
import { ENEMY_DEFS, TOWER_DEFS } from './engine';
import type { TowerType } from './engine';
import { buildOrc, poseOrc } from './orcs';
import type { OrcKind } from './orcs';
import { buildElite, poseElite, isElite } from './elites';
import type { EliteKind } from './elites';
import { buildBalloon } from './balloon';
import { buildDragon } from './dragon';
import { SPH, OUTLINE_MAT } from './voxel';

/**
 * Menu artwork – every pixel is rendered from the game's OWN 3D assets, so the main menu always matches the game:
 *   backdrop : a cinematic hero shot of a real "Pulau Kristal" (the same world builder the levels use) with the
 *              castle keep, the spawn gate, defending towers and an orc army marching up the road
 *   props    : transparent renders of the mascots used as floating/dynamic pieces on top of the backdrop
 *              (captain orc = the hero, balloon = the airship, boss dragon = the flyer)
 * The render happens once, lazily, after the menu is already on screen (see MenuArt/menuArt below).
 */
export interface MenuArt {
  backdrop: string;
  hero: string;
  brute: string;
  airship: string;
  dragon: string;
  /** little green orc used as the avatar in the player chip */
  avatar: string;
  ready: boolean;
}

export type MenuArtKey = 'hero' | 'brute' | 'airship' | 'dragon' | 'avatar';

const ART: MenuArt = { backdrop: '', hero: '', brute: '', airship: '', dragon: '', avatar: '', ready: false };
let pending: Promise<MenuArt> | null = null;

/** Renders the menu art once and caches it. Safe to call from several components (the work is de-duplicated). */
export function loadMenuArt(): Promise<MenuArt> {
  if (ART.ready) return Promise.resolve(ART);
  if (!pending) pending = new Promise<MenuArt>(resolve => {
    // give the menu a frame (or two) to paint before we start the heavy render work
    const run = () => { try { renderAll(); } catch { /* the UI falls back to plain gradients + portraits */ } resolve(ART); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(run, 30)); else setTimeout(run, 30);
  });
  return pending;
}

// ---------------------------------------------------------------- island layout (menu-only)
const MW = 18, MH = 12;
const mTileX = (c: number) => c - MW / 2 + 0.5;
const mTileZ = (r: number) => r - MH / 2 + 0.5;
/** the road: enters at the left, loops through the middle and ends at the castle on the right */
const MENU_ROAD: [number, number][] = [[0, 8], [3, 8], [3, 3], [8, 3], [8, 9], [13, 9], [13, 5], [15, 5]];

interface Placed { x: number; z: number; dir: number; s: number }

function menuWorld() {
  const tiles = new Array<'grass' | 'path' | 'blocked'>(MW * MH).fill('grass');
  for (let i = 0; i < MENU_ROAD.length - 1; i++) {
    const [c0, r0] = MENU_ROAD[i], [c1, r1] = MENU_ROAD[i + 1];
    const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0); let c = c0, r = r0;
    while (true) { tiles[r * MW + c] = 'path'; if (c === c1 && r === r1) break; c += dc; r += dr; }
  }
  const tileCarved = new Array<boolean>(MW * MH).fill(false);
  for (let r = 0; r < MH; r++) for (let c = 0; c < MW; c++) {
    const i = r * MW + c; if (tiles[i] === 'path') continue;
    const isP = (cc: number, rr: number) => cc >= 0 && cc < MW && rr >= 0 && rr < MH && tiles[rr * MW + cc] === 'path';
    tileCarved[i] = isP(c - 1, r) || isP(c + 1, r) || isP(c, r - 1) || isP(c, r + 1);
  }
  const wp = MENU_ROAD.map(([c, r]) => new THREE.Vector3(mTileX(c), 0, mTileZ(r)));
  wp.unshift(wp[0].clone().add(new THREE.Vector3(-1.2, 0, 0)));
  const world = buildWorld({ W: MW, H: MH, level: 1, biome: 0, waypoints: wp, tiles, tileCarved, tileX: mTileX, tileZ: mTileZ });
  return { world, wp, tiles };
}

/** positions along the road (s = distance from the gate) with the facing direction */
function roadSamples(wp: THREE.Vector3[]): { at: (s: number) => Placed; len: number } {
  const cum = [0];
  for (let i = 1; i < wp.length; i++) cum.push(cum[i - 1] + wp[i].distanceTo(wp[i - 1]));
  const len = cum[cum.length - 1];
  const at = (s: number): Placed => {
    const t = THREE.MathUtils.clamp(s, 0, len);
    for (let i = 1; i < wp.length; i++) if (t <= cum[i]) {
      const k = (t - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      const p = wp[i - 1].clone().lerp(wp[i], k); const d = wp[i].clone().sub(wp[i - 1]);
      return { x: p.x, z: p.z, dir: Math.atan2(d.x, d.z), s: t };
    }
    const last = wp[wp.length - 1], prev = wp[wp.length - 2];
    return { x: last.x, z: last.z, dir: Math.atan2(last.x - prev.x, last.z - prev.z), s: t };
  };
  return { at, len };
}

// ---------------------------------------------------------------- helpers
/** a red/blue pennant on a pole (the game's castle carries one - the menu flies four of them) */
function pennant(color: number) {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xbdb0e0, roughness: 0.85 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.86, 6), poleMat);
  pole.position.y = 0.43; pole.castShadow = true; g.add(pole);
  const flagMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.16, roughness: 0.7, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.03), flagMat);
  cloth.position.set(0.21, 0.72, 0); cloth.castShadow = true; g.add(cloth);
  const oc = new THREE.Mesh(cloth.geometry, OUTLINE_MAT); oc.position.copy(cloth.position); oc.scale.set(1.07, 1.14, 1.7); g.add(oc);
  return g;
}

/** a lit torch: in the hero shot the road is lined with them */
function torch() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0xb9b3c9, roughness: 0.9 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.062, 0.6, 8), stone);
  pole.position.y = 0.3; pole.castShadow = true; g.add(pole);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.07, 0.1, 10), stone);
  bowl.position.y = 0.64; g.add(bowl);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.24, 8), new THREE.MeshBasicMaterial({ color: 0xffc46b }));
  flame.position.y = 0.82; g.add(flame);
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 8), new THREE.MeshBasicMaterial({ color: 0xfff4cc }));
  core.position.y = 0.8; g.add(core);
  const halo = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(0.34); halo.position.y = 0.8; g.add(halo);
  return g;
}

/** a small floating voxel island for the sky (same palette as the world) */
function floatingIsland(rng: () => number, biome: typeof BIOMES[number]) {
  const g = new THREE.Group();
  const grass = new THREE.MeshStandardMaterial({ color: biome.grass[1], roughness: 0.95 });
  const dirt = new THREE.MeshStandardMaterial({ color: biome.strata[0], roughness: 1 });
  const rock = new THREE.MeshStandardMaterial({ color: biome.rock, roughness: 1 });
  const w = 1.5 + rng() * 1.6, h = 0.34, d = 1.3 + rng() * 1.4;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), grass); top.receiveShadow = true; top.castShadow = true; g.add(top);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.34, d * 0.86), dirt); mid.position.y = -0.33; mid.castShadow = true; g.add(mid);
  const bot = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, d) * 0.46, 1.1 + rng() * 0.9, 5), rock); bot.position.y = -1.0; bot.rotation.x = Math.PI; bot.castShadow = true; g.add(bot);
  for (const m of [top, mid]) { const o = new THREE.Mesh(m.geometry, OUTLINE_MAT); o.scale.set(1.03, 1.12, 1.03); m.add(o); }
  for (let i = 0; i < 2; i++) { // a couple of tiny trees
    const th = 0.22 + rng() * 0.16, tx = (rng() - 0.5) * (w - 0.5), tz = (rng() - 0.5) * (d - 0.5);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, th, 6), new THREE.MeshStandardMaterial({ color: biome.trunk, roughness: 0.9 }));
    trunk.position.set(tx, h / 2 + th / 2, tz); trunk.castShadow = true; g.add(trunk);
    const leaf = new THREE.Mesh(SPH, new THREE.MeshStandardMaterial({ color: biome.leaf[Math.floor(rng() * biome.leaf.length)], roughness: 0.85 }));
    leaf.scale.set(0.22, 0.2, 0.22); leaf.position.set(tx, h / 2 + th + 0.14, tz); leaf.castShadow = true; g.add(leaf);
  }
  return g;
}

/** soft puffy cloud cluster (the world's own clouds are reused for the sky, this adds extra depth) */
function cloudCluster(rng: () => number, color: number, glow = 0.28) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, emissive: color, emissiveIntensity: glow });
  const n = 3 + Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) {
    const s = 0.8 + rng() * 0.9; const m = new THREE.Mesh(SPH, mat);
    m.scale.set(s * 1.3, s * 0.8, s); m.position.set(k * 0.95 - n * 0.42, rng() * 0.35, (rng() - 0.5) * 0.6); g.add(m);
  }
  return g;
}

function disposeTree(root: THREE.Object3D) {
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[]; (Array.isArray(mat) ? mat : [mat]).forEach(x => x?.dispose?.()); }
  });
}

// ---------------------------------------------------------------- the render
function renderAll() {
  const rng = seeded(1337);
  const B = BIOMES[0]; // "Padang Ceria" – the bright blue-sky meadow of level 1 (matches the reference mood)
  const RW = 1600, RH = 900;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(RW, RH, false); renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.24;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const sky = makeSkyTexture(0x2f8fe6, 0xd8f0ff); // deeper blue overhead than the gameplay sky: the menu wants a saturated backdrop
  scene.background = sky;
  scene.fog = new THREE.Fog(B.fog, 78, 190); // the island sits ~46 units away: keep the air clear, only the far clouds haze out

  // ---- lights: warm sun + blue sky bounce + a rim light from behind
  scene.add(new THREE.HemisphereLight(0xdff2ff, 0x8bbf6a, 1.05));
  const sun = new THREE.DirectionalLight(0xfff0cf, 2.4);
  sun.position.set(-26, 40, 30); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -18; sc.right = 18; sc.top = 15; sc.bottom = -15; sc.near = 1; sc.far = 130; sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0012; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xa9d8ff, 0.8); rim.position.set(14, 12, -30); scene.add(rim);

  // ---- the island (a real level world, biome "Padang Ceria")
  const { world, wp } = menuWorld();
  scene.add(world.group);
  const road = roadSamples(wp);
  world.pads.visible = false; // the white build-spot hints belong to gameplay, not to a hero shot

  // move the world's own cloud clusters up into the sky and push them far behind the island
  let cloudIdx = 0;
  world.group.children.forEach(ch => {
    if (!ch.userData.cloud) return;
    const k = cloudIdx++;
    ch.position.set(-72 + (k % 5) * 36 + rng() * 6, -3 - (k % 3) * 5 - rng() * 3, -36 - (k % 3) * 15 - rng() * 10);
    ch.scale.setScalar(1.6 + rng() * 1.2);
    ch.userData.speed = 0; // frozen: this is a still
  });
  // a deep sea of clouds far below the island: it fills the horizon the camera is looking down towards
  for (let i = 0; i < 12; i++) {
    const c = cloudCluster(rng, B.cloud, 0.62); const s = 1.5 + rng() * 1.6;
    c.scale.setScalar(s); c.position.set(-92 + rng() * 184, -9 - rng() * 16, -72 - rng() * 58); scene.add(c);
  }
  // clouds high in the frame (just under the horizon line the camera is aimed at)
  for (let i = 0; i < 5; i++) {
    const c = cloudCluster(rng, B.cloud); const s = 1.1 + rng() * 1.1;
    c.scale.setScalar(s);
    c.position.set(-24 + rng() * 48, 1 + rng() * 5, -26 - rng() * 20);
    scene.add(c);
  }
  // a busy cloud band across the horizon (the key art is packed with clouds)
  for (let i = 0; i < 12; i++) {
    const c = cloudCluster(rng, B.cloud, 0.5); const s = 1.3 + rng() * 1.7;
    c.scale.setScalar(s);
    c.position.set(-96 + i * 16 + rng() * 10, 1 + rng() * 8, -58 - rng() * 30);
    scene.add(c);
  }
  // small mid-distance clouds: they nestle around the island's sides and give the shot depth
  for (let i = 0; i < 8; i++) {
    const c = cloudCluster(rng, B.cloud, 0.55); const s = 0.85 + rng() * 0.8;
    const side = i % 2 === 0 ? -1 : 1;
    c.scale.setScalar(s);
    c.position.set(side * (26 + rng() * 44), -10 - rng() * 8, -34 - rng() * 30);
    scene.add(c);
  }
  // foreground framing islands: big brothers of the sky rocks, parked at the lower left/right corners of the shot
  for (const [fx, fy, fz, fs] of [[-21, 1.5, -32, 1.5], [22, 0.5, -36, 1.35], [-17, -1.5, -20, 1.15], [18, -2.5, -22, 1.05]] as const) {
    const f = floatingIsland(rng, B);
    f.scale.setScalar(fs);
    f.position.set(fx, fy, fz);
    f.rotation.y = rng() * 6.28;
    scene.add(f);
  }
  // floating voxel islands drifting far out in the sky (like the little floating rocks of the game's backgrounds)
  for (const [fx, fy, fz, fs] of [[-31, 11, -42, 1.5], [-40, 4, -48, 1.2], [35, 12, -46, 1.4], [43, 5, -52, 1.15]] as const) {
    const f = floatingIsland(rng, B);
    f.scale.setScalar(fs);
    f.position.set(fx, fy, fz);
    f.rotation.y = rng() * 6.28;
    scene.add(f);
  }

  // ---- orc army marching up the road (posted statically, in a lively mid-stride pose)
  const army: OrcKind[] = ['bomber', 'normal', 'fast', 'tank', 'punk', 'shield', 'fatty', 'berserker', 'toxic', 'normal', 'fast', 'tank'];
  army.forEach((kind, i) => {
    const s = road.len * (0.12 + (i / army.length) * 0.62);
    const p = road.at(s);
    const def = ENEMY_DEFS[kind];
    const b = isElite(kind) ? buildElite(kind as EliteKind, def) : buildOrc(kind, def);
    const g = new THREE.Group(); g.add(...b.parts);
    const ph = i * 1.7 + 0.6;
    if (isElite(kind)) poseElite(kind as EliteKind, b.limbs, ph, 0.7); else poseOrc(kind, b.limbs, ph);
    g.scale.setScalar(def.size * 1.06);
    const ox = Math.cos(p.dir) * ((i % 3) - 1) * 0.34, oz = -Math.sin(p.dir) * ((i % 3) - 1) * 0.34;
    g.position.set(p.x + ox, world.heightAt(p.x + ox, p.z + oz), p.z + oz);
    g.rotation.y = p.dir;
    scene.add(g);
  });
  // the war chief brings up the rear (with his banner up)
  {
    const p = road.at(road.len * 0.06); const def = ENEMY_DEFS.captain;
    const b = buildElite('captain', def); const g = new THREE.Group(); g.add(...b.parts);
    poseElite('captain', b.limbs, 1.2, 0.9); g.scale.setScalar(def.size * 1.08);
    g.position.set(p.x, world.heightAt(p.x, p.z), p.z); g.rotation.y = p.dir; scene.add(g);
  }
  // a boss orc storming in the middle of the pack
  {
    const p = road.at(road.len * 0.52); const def = ENEMY_DEFS.fatty;
    const b = buildOrc('fatty', def); const g = new THREE.Group(); g.add(...b.parts);
    poseOrc('fatty', b.limbs, 2.4); g.scale.setScalar(def.size * 1.12);
    g.position.set(p.x, world.heightAt(p.x, p.z), p.z); g.rotation.y = p.dir + 0.25; scene.add(g);
  }

  // ---- defending towers along the roadside grass (the game's own models)
  const towerSpots: { type: TowerType; s: number; side: number; level: number }[] = [
    { type: 'sniper', s: 0.10, side: -1, level: 2 },
    { type: 'cannon_v2', s: 0.22, side: 1, level: 1 },
    { type: 'tesla', s: 0.36, side: -1, level: 1 },
    { type: 'barracks', s: 0.47, side: 1, level: 1 },
    { type: 'frostbite_v2', s: 0.58, side: -1, level: 1 },
    { type: 'draco_v2', s: 0.70, side: 1, level: 1 },
    { type: 'sol', s: 0.80, side: -1, level: 1 },
  ];
  towerSpots.forEach(ts => {
    const p = road.at(road.len * ts.s);
    const nx = Math.cos(p.dir) * ts.side, nz = -Math.sin(p.dir) * ts.side;
    const tx = p.x + nx * 1.55, tz = p.z + nz * 1.55;
    const m = buildTowerModel(ts.type, ts.level, TOWER_DEFS[ts.type]);
    m.group.position.set(tx, world.heightAt(tx, tz) - 0.02, tz);
    m.group.scale.setScalar(0.86);
    m.head.rotation.y = p.dir + Math.PI / 2 + (rng() - 0.5) * 0.5; // they all look at the road
    scene.add(m.group);
  });

  // ---- the castle is THE landmark of the shot: enlarge it, fly pennants, hang royal banners
  {
    let keep: THREE.Object3D | null = null;
    world.group.children.forEach(ch => {
      if (keep) return;
      ch.traverse(o => {
        const m = o as THREE.Mesh; const mat = m.material as THREE.MeshStandardMaterial | undefined;
        if (m.isMesh && mat && mat.color && mat.color.getHex() === 0xc084fc) keep = ch;
      });
    });
    if (keep) {
      const k = keep as THREE.Object3D;
      k.scale.multiplyScalar(1.02);
      for (const [px, pz] of [[0.44, 0.44], [-0.44, 0.44], [0.44, -0.44], [-0.44, -0.44]] as [number, number][]) {
        const pe = pennant(0xe23b3b); pe.position.set(px, 1.9, pz); k.add(pe);
      }
      const bannerMat = new THREE.MeshStandardMaterial({ color: 0x2f5fd0, roughness: 0.75, side: THREE.DoubleSide });
      const crestMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.35, roughness: 0.35 });
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const hang = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.04), bannerMat);
        hang.position.set(Math.sin(a) * 0.69, 1.42, Math.cos(a) * 0.69);
        hang.rotation.y = a; hang.castShadow = true; k.add(hang);
        const ob = new THREE.Mesh(hang.geometry, OUTLINE_MAT); ob.position.copy(hang.position); ob.rotation.y = a; ob.scale.set(1.08, 1.05, 1.6); k.add(ob);
        const crest = new THREE.Mesh(SPH, crestMat);
        crest.scale.set(0.1, 0.1, 0.03); crest.position.set(Math.sin(a) * 0.72, 1.5, Math.cos(a) * 0.72); crest.rotation.y = a; k.add(crest);
      }
    }
  }

  // ---- torches line the road, so the village reads as lit and alive
  for (let i = 0; i < 9; i++) {
    const p = road.at(road.len * (0.06 + i * 0.1));
    const side = i % 2 === 0 ? -1 : 1;
    const nx = Math.cos(p.dir) * side, nz = -Math.sin(p.dir) * side;
    const tx = p.x + nx * 1.35, tz = p.z + nz * 1.35;
    const t = torch(); t.position.set(tx, world.heightAt(tx, tz), tz); scene.add(t);
  }

  // ---- camera: a low hero angle, castle on the right, gate on the left
  const cam = new THREE.PerspectiveCamera(24, RW / RH, 0.5, 400);
  const look = new THREE.Vector3(0.75, 2.5, -0.2); // pans the keep into the right third, clear of the button column
  cam.position.copy(look).addScaledVector(new THREE.Vector3(-0.07, 0.38, 0.925).normalize(), 37);
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
  sun.target = new THREE.Object3D(); sun.target.position.copy(look); scene.add(sun.target);
  sun.position.copy(look).add(new THREE.Vector3(-22, 34, 26));

  renderer.render(scene, cam);
  ART.backdrop = renderer.domElement.toDataURL('image/jpeg', 0.9);

  // ---- transparent props for the floating pieces of the menu
  ART.hero = renderProp(renderer, () => {
    const def = ENEMY_DEFS.captain; const b = buildElite('captain', def);
    poseElite('captain', b.limbs, 1.1, 0.8);
    return { parts: b.parts, size: def.size };
  });
  ART.brute = renderProp(renderer, () => {
    const def = ENEMY_DEFS.fatty; const b = buildOrc('fatty', def);
    poseOrc('fatty', b.limbs, 1.9);
    return { parts: b.parts, size: def.size };
  });
  ART.airship = renderProp(renderer, () => {
    const def = ENEMY_DEFS.balloon; const b = buildBalloon(def);
    return { parts: b.parts, size: def.size };
  });
  ART.dragon = renderProp(renderer, () => {
    const def = ENEMY_DEFS.dragon; const b = buildDragon(def);
    return { parts: b.parts, size: def.size };
  });
  ART.avatar = renderProp(renderer, () => {
    const def = ENEMY_DEFS.fast; const b = buildOrc('fast', def);
    poseOrc('fast', b.limbs, 0.7);
    return { parts: b.parts, size: def.size };
  });

  // ---- cleanup: the art is a set of bitmaps now, nothing stays in the scene graph
  disposeTree(scene);
  sky.dispose();
  renderer.dispose(); renderer.forceContextLoss();
  ART.ready = true;
}

/** renders one model centred on a transparent background */
function renderProp(renderer: THREE.WebGLRenderer, make: () => { parts: THREE.Object3D[]; size: number }): string {
  const SIZE = 512;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8ea4bb, 1.15));
  const key = new THREE.DirectionalLight(0xfff3dc, 2.4); key.position.set(3.5, 5, 4.5); scene.add(key);
  const rimL = new THREE.DirectionalLight(0x9bd0ff, 1.0); rimL.position.set(-4, 2.5, -3.5); scene.add(rimL);

  const { parts, size } = make();
  const g = new THREE.Group(); g.add(...parts); g.scale.setScalar(size);
  g.rotation.y = 0.42;
  scene.add(g);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g);
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const radius = Math.max(sz.y * 0.56, Math.max(sz.x, sz.z) * 0.6);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  cam.position.copy(c).addScaledVector(new THREE.Vector3(0, 0.34, 1).normalize(), dist);
  cam.lookAt(c);

  renderer.setSize(SIZE, SIZE, false); renderer.setClearColor(0x000000, 0);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  disposeTree(scene);
  return url;
}

// ---------------------------------------------------------------- tiny deterministic rng
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
