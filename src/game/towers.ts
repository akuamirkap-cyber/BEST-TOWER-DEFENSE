import * as THREE from 'three';
import type { TowerType } from './engine';
import { BOX, SPH, RING, OUTLINE_MAT, makeFace, makeFlame, makeBlast } from './voxel';
import { Bolt, MINI_STYLE } from './lightning';
import { makeHeart, makeBowlingBall } from './critters';
import { buildJossTower, JossTowerKind } from './jossTowers';

export interface IdleArc { bolt: Bolt; a: THREE.Vector3; b: THREE.Vector3; t: number }

/**
 * "Penjaga Kristal" — the signature look of this game:
 *  1. every tower is a chubby toon character with big glossy eyes that blink, look around and react
 *  2. stone podium with glowing runes in the tower's colour
 *  3. floating crystal shards orbit the podium = tower level (1-3)
 *  4. thick dark outline on all rounded parts, flat voxel cubes for the little details
 */

/** muzzle position in head-local space (y = height, f = forward distance) – used for projectiles / beams */
/** x = sideways offset (+ = the tower's right) for weapons held to one side (Amor's bow, Froggy's rod, Pino's ball) */
export const MUZZLE: Record<TowerType, { y: number; f: number; x?: number }> = {
  cannon: { y: 0.28, f: 0.85 }, frost: { y: 1.08, f: 0.2 }, blaster: { y: 1.19, f: 0.47 }, tesla: { y: 1.36, f: 0 },
  sniper: { y: 0.42, f: 1.16 }, poison: { y: 0.74, f: 0.04 }, banner: { y: 0.6, f: 0 }, flame: { y: 0.22, f: 0.88 },
  trap: { y: 0.2, f: 0 }, repair: { y: 0.6, f: 0 }, shield: { y: 0.5, f: 0 }, plasma: { y: 0.2, f: 0.88 },
  piggy: { y: 0.6, f: 0 }, wind: { y: 0.4, f: 0 }, boomer: { y: 1.0, f: 0 }, mine: { y: 0.3, f: 0 },
  cactus: { y: 0.6, f: 0.36 }, hive: { y: 0.5, f: 0.45 }, golem: { y: 0.5, f: 0 }, clock: { y: 0.5, f: 0 },
  prism: { y: 1.12, f: 0.18 }, cupid: { y: 0.42, f: 0.46, x: 0.42 }, hook: { y: 1.2, f: 0.62, x: 0.58 }, bowl: { y: 0.3, f: 0.2, x: 0.38 },
  barracks: { y: 0.5, f: 0.3 }, mind: { y: 0.8, f: 0.29 },
  vortex: { y: 0.72, f: 0.42 }, meteor: { y: 1.05, f: 0.2 }, orbital: { y: 0.95, f: 0.5 },
  naga: { y: 0.85, f: 0.52 }, storm: { y: 1.15, f: 0 },
  gravity: { y: 0.92, f: 0 }, tornado: { y: 0.72, f: 0.12 },
  meteor_v2: { y: 1.0, f: 0.2 }, draco_v2: { y: 0.83, f: 0.72 },
  sol: { y: 0.95, f: 0.4 }, chroma_v2: { y: 1.02, f: 0 }, frostbite_v2: { y: 1.5, f: 0 },
  catapult: { y: 1.08, f: 0.36 },
  aero: { y: 0.72, f: 0.35 },
};

export interface TowerModel { group: THREE.Group; head: THREE.Group; muzzle?: THREE.Object3D; beam?: THREE.Mesh; beamGlow?: THREE.Mesh }

const TOON_CACHE = new Map<number, THREE.MeshStandardMaterial>();
const toon = (color: number, rough = 0.5, glow = 0.1) => {
  const key = ((color & 0xffffff) << 8) ^ (Math.round(rough * 50) << 4) ^ Math.round(glow * 50);
  let m = TOON_CACHE.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, emissive: color, emissiveIntensity: glow });
    TOON_CACHE.set(key, m);
  }
  return m;
};

export function tor(r: number, tube: number, color: number, x = 0, y = 0, z = 0, o: { rx?: number; ry?: number; rz?: number; ol?: boolean; glow?: number } = {}) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 24), toon(color, 0.4, o.glow ?? 0.1));
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = true;
  return m;
}

function S(r: number, color: number, x = 0, y = 0, z = 0, o: { sx?: number; sy?: number; sz?: number; ol?: boolean; glow?: number } = {}) {
  const m = new THREE.Mesh(SPH, toon(color, 0.45, o.glow ?? 0.1));
  m.scale.set(r * (o.sx ?? 1), r * (o.sy ?? 1), r * (o.sz ?? 1)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (o.ol !== false) { const h = new THREE.Mesh(SPH, OUTLINE_MAT); h.scale.setScalar(1.075); m.add(h); }
  return m;
}
function C(rt: number, rb: number, h: number, color: number, x = 0, y = 0, z = 0, seg = 12, o: { ol?: boolean; glow?: number } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), toon(color, 0.5, o.glow ?? 0.08));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (o.ol !== false) { const h2 = new THREE.Mesh(m.geometry, OUTLINE_MAT); h2.scale.set(1.09, 1.03, 1.09); m.add(h2); }
  return m;
}
function B(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, o: { ol?: boolean; lit?: boolean; rx?: number; ry?: number; rz?: number } = {}) {
  const m = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color, roughness: 0.55, emissive: color, emissiveIntensity: o.lit ? 1 : 0.08 }));
  m.scale.set(w, h, d); m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = true; m.receiveShadow = true;
  if (o.ol) { const h2 = new THREE.Mesh(BOX, OUTLINE_MAT); h2.scale.setScalar(1.14); m.add(h2); }
  return m;
}
function cone(r: number, h: number, color: number, x: number, y: number, z: number, seg = 8) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), toon(color, 0.5, 0.12)); m.position.set(x, y, z); m.castShadow = true; return m;
}
function shard(r: number, color: number, glow = 0.9) {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(r), toon(color, 0.25, glow)); m.castShadow = true; return m;
}

let _spiral: THREE.CanvasTexture | null = null;
/** a hypnotic three-armed spiral (pink / violet, bright centre, transparent outside the circle) – used by the Hipno tower and the mark over a hallucinating orc */
export function spiralTexture() {
  if (_spiral) return _spiral;
  const N = 192; const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d')!; const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = ((x + 0.5) / N) * 2 - 1, dy = ((y + 0.5) / N) * 2 - 1, r = Math.hypot(dx, dy); const i = (y * N + x) * 4;
    if (r > 1) { img.data[i + 3] = 0; continue; }
    let tt = (Math.atan2(dy, dx) / (Math.PI * 2)) * 3 + r * 3.4; tt -= Math.floor(tt);
    const col = r < 0.07 ? [255, 255, 255] : r > 0.93 ? [40, 16, 72] : tt < 0.5 ? [244, 114, 255] : [88, 28, 135];
    img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); _spiral = new THREE.CanvasTexture(c); _spiral.colorSpace = THREE.SRGBColorSpace; return _spiral;
}

let _vortex: THREE.CanvasTexture | null = null;
/** a mesmerizing 4-armed cosmic galaxy vortex spiral texture (cyan, violet, magenta, glowing stellar core, transparent circular edge) */
export function vortexTexture() {
  if (_vortex) return _vortex;
  const N = 256; const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d')!; const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = ((x + 0.5) / N) * 2 - 1, dy = ((y + 0.5) / N) * 2 - 1, r = Math.hypot(dx, dy); const i = (y * N + x) * 4;
    if (r > 1) { img.data[i + 3] = 0; continue; }
    const ang = Math.atan2(dy, dx) + r * 5.2;
    const arm = Math.pow(Math.max(0, (Math.cos(ang * 4) + 1) * 0.5), 1.6);
    const edge = r > 0.82 ? Math.max(0, (1 - r) / 0.18) : 1;
    const alpha = Math.min(255, Math.floor((0.74 + 0.26 * arm) * edge * 255));
    if (r < 0.12) {
      img.data[i] = 245; img.data[i + 1] = 252; img.data[i + 2] = 255;
    } else if (arm > 0.42) {
      const b = (Math.sin(r * 9) + 1) * 0.5;
      img.data[i] = Math.floor(56 + b * 188); // cyan (56,189,248) to magenta (244,114,182)
      img.data[i + 1] = Math.floor(189 - b * 75);
      img.data[i + 2] = Math.floor(248 - b * 66);
    } else {
      img.data[i] = 30; img.data[i + 1] = 27; img.data[i + 2] = 75; // deep cosmic void indigo
    }
    img.data[i + 3] = alpha;
  }
  g.putImageData(img, 0, 0); _vortex = new THREE.CanvasTexture(c); _vortex.colorSpace = THREE.SRGBColorSpace; return _vortex;
}

/** V-shaped boomerang (amber with blue stripes) – used both as the prop floating above the tower and as the thrown projectile */
export function makeBoomerang(color: number, accent: number) {
  const g = new THREE.Group();
  for (const sd of [-1, 1]) {
    const arm = new THREE.Group(); arm.rotation.y = sd * 0.62;
    arm.add(B(0.56, 0.085, 0.17, color, 0.28, 0, 0, { ol: true }));
    arm.add(B(0.12, 0.09, 0.175, accent, 0.18, 0, 0)); arm.add(B(0.12, 0.09, 0.175, accent, 0.4, 0, 0));
    g.add(arm);
  }
  g.add(S(0.1, color, 0, 0, 0, { ol: true }));
  return g;
}

export function buildTowerModel(type: TowerType, level: number, def: { color: number; accent: number }): TowerModel {
  const JOSS_MAP: Partial<Record<TowerType, JossTowerKind>> = {
    gravity: 'gravity',
    tornado: 'tornado',
    meteor_v2: 'meteor',
    draco_v2: 'draco',
    sol: 'sol',
    chroma_v2: 'chroma',
    frostbite_v2: 'frostbite',
  };
  const jossKind = JOSS_MAP[type];
  if (jossKind) {
    const sz = 1 + (level - 1) * 0.12;
    const m = buildJossTower(jossKind, level);
    m.head.userData.sz = sz;
    m.head.scale.setScalar(sz);
    m.head.userData.face = m.face;
    if (m.flame) m.head.userData.flames = [m.flame];
    // The muzzle is what the engine "kicks" on every shot and fades back to zero, so it must be a THROWAWAY flash
    // (or nothing at all) – never a real body part. The joss builders return their head / sun / crystal there, which
    // made those towers lose their head the moment they first fired.
    let muzzle = m.muzzle;
    if (!muzzle || !muzzle.userData.fx) {
      const mz = MUZZLE[type];
      muzzle = makeBlast(0.55, 0xfff3b0, def.accent, def.color);
      muzzle.name = 'muzzleFlash';
      muzzle.position.set(mz.x ?? 0, mz.y, mz.f);
      m.head.add(muzzle);
    }
    return { group: m.group, head: m.head, muzzle };
  }

  const g = new THREE.Group();

  // ----- signature podium: stone + glowing rune ring -----
  g.add(C(0.5, 0.55, 0.2, 0x98a3b5, 0, 0.1, 0, 10));
  g.add(C(0.43, 0.47, 0.1, def.accent, 0, 0.25, 0, 10, { glow: 0.35 }));
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + 0.26;
    const rune = B(0.07, 0.06, 0.05, def.color, Math.cos(a) * 0.53, 0.15, Math.sin(a) * 0.53, { lit: true }); rune.rotation.y = -a + Math.PI / 2; g.add(rune);
  }
  // crystal shards = level
  const shards = new THREE.Group(); shards.name = 'shards'; shards.position.y = 0.52;
  for (let i = 0; i < level; i++) {
    const a = (i * 2 * Math.PI) / level; const s = shard(0.075, def.color); s.scale.y = 1.5; s.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); s.userData.a = a; shards.add(s);
  }
  g.add(shards);
  const glow = new THREE.Mesh(RING, new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  glow.scale.setScalar(0.5); glow.position.y = 0.31; glow.name = 'buffglow'; glow.visible = false; g.add(glow);

  const sz = 1 + (level - 1) * 0.12;
  const head = new THREE.Group(); head.position.y = 0.3; head.scale.setScalar(sz); head.userData.sz = sz;
  const flames: THREE.Object3D[] = []; head.userData.flames = flames;
  let muzzle: THREE.Object3D | undefined, beam: THREE.Mesh | undefined, beamGlow: THREE.Mesh | undefined, face: THREE.Object3D | undefined;

  if (type === 'cannon') {
    // "Bolo" (Tower Meriam): Adorable, polished naval cannon buddy with sailor cap, wooden carriage wheels & golden brass barrel
    const R = 0.38, cy = 0.42;
    head.add(S(R, def.color, 0, cy, 0));
    // Soft creamy light-blue belly patch
    head.add(S(0.22, 0xdbeafe, 0, 0.25, 0.26, { sy: 0.82, sz: 0.5, ol: false }));

    // Cute naval carriage mount: chunky wooden side cheeks with polished golden rivets & wheel hubs
    for (const sd of [-1, 1]) {
      // Wooden carriage cheek
      head.add(B(0.065, 0.2, 0.28, 0x78350f, sd * 0.37, 0.22, -0.02, { ol: true }));
      // Golden axle bolt
      head.add(S(0.048, 0xfbbf24, sd * 0.41, 0.22, -0.02, { glow: 0.3 }));
      // Cute wooden cannon wheel with golden hubcap
      const wheel = C(0.145, 0.145, 0.055, 0x92400e, sd * 0.42, 0.17, -0.02, 14, { ol: true });
      wheel.rotation.z = Math.PI / 2;
      head.add(wheel);
      head.add(S(0.055, 0xfbbf24, sd * 0.46, 0.17, -0.02, { glow: 0.3 }));
      // Cute chubby little blue hands resting on the carriage
      head.add(S(0.075, def.color, sd * 0.35, 0.28, 0.2, { ol: true }));
    }

    // Stylized, heavy cast-iron cannon barrel with golden trimmings
    // Cascabel sphere at the back of the cannon
    head.add(S(0.095, 0x0f172a, 0, 0.28, 0.14, { ol: true }));
    // Tapered gunmetal barrel
    const barrel = C(0.115, 0.155, 0.56, 0x1e293b, 0, 0.28, 0.48, 14, { ol: true });
    barrel.rotation.x = Math.PI / 2;
    head.add(barrel);
    // Golden flared muzzle ring
    const muzzleRing = C(0.175, 0.175, 0.09, 0xfbbf24, 0, 0.28, 0.76, 14, { glow: 0.25 });
    muzzleRing.rotation.x = Math.PI / 2;
    head.add(muzzleRing);
    // Golden reinforcement band in the middle
    const band = C(0.16, 0.16, 0.05, 0xfbbf24, 0, 0.28, 0.44, 14, { glow: 0.2 });
    band.rotation.x = Math.PI / 2;
    head.add(band);
    // Dark hollow interior bore
    const bore = C(0.095, 0.095, 0.02, 0x030712, 0, 0.28, 0.81, 12, { ol: false });
    bore.rotation.x = Math.PI / 2;
    head.add(bore);

    // Extra level upgrades: golden stars and extra bands
    if (level >= 2) {
      const band2 = C(0.165, 0.165, 0.04, 0xfbbf24, 0, 0.28, 0.32, 14, { glow: 0.3 });
      band2.rotation.x = Math.PI / 2;
      head.add(band2);
    }
    if (level >= 3) {
      head.add(S(0.06, 0xfde047, 0, 0.43, 0.58, { glow: 0.6 })); // Golden star crest on the barrel
    }

    // Cute sailor captain hat
    const hatBrim = C(0.32, 0.32, 0.05, 0x1e3a8a, 0, 0.73, -0.02, 16);
    head.add(hatBrim);
    head.add(S(0.28, 0xffffff, 0, 0.82, -0.02, { sy: 0.65 }));
    // Gold anchor/star badge on the front of the cap
    head.add(S(0.055, 0xfbbf24, 0, 0.78, 0.26, { glow: 0.4 }));
    head.add(B(0.07, 0.025, 0.02, 0xfbbf24, 0, 0.75, 0.265));
    // Cute curling wick fuse at the back
    head.add(C(0.015, 0.015, 0.16, 0xa8a29e, 0, 0.98, -0.05, 6, { ol: false }));
    const fl = makeFlame(0.095); fl.position.set(0, 1.06, -0.05); head.add(fl); flames.push(fl);

    // Cute expressive face with cheerful smile and blushing pink cheeks
    face = makeFace({ r: 0.135, gap: 0.17, iris: 0x2563eb, skin: def.color, mouth: 'smile', cheeks: true, brows: 0x1e3a8a, body: { R, cy, y0: 0.58 } });
    muzzle = makeBlast(0.55); muzzle.position.set(0, 0.28, 0.83); head.add(muzzle);
  } else if (type === 'frost') {
    // "Pingu": snowman with a cyan scarf, carrot nose and a spinning ice crown that fires the beam
    const R2 = 0.23, c2 = 0.66;
    head.add(S(0.31, 0xeaf9ff, 0, 0.31, 0, { sy: 0.92 }));
    head.add(S(R2, 0xf6fdff, 0, c2, 0));
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.065, 8, 18), toon(def.accent, 0.6, 0.15)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.5; scarf.castShadow = true; head.add(scarf);
    head.add(B(0.1, 0.26, 0.06, def.accent, 0.17, 0.4, 0.2).rotateZ(0.2));
    const nose = cone(0.045, 0.2, 0xfb923c, 0, c2 - 0.04, 0.3); nose.rotation.x = Math.PI / 2; head.add(nose);
    head.add(S(0.032, 0x1e293b, 0, 0.4, 0.3, { ol: false })); head.add(S(0.032, 0x1e293b, 0, 0.27, 0.3, { ol: false }));
    for (const sd of [-1, 1]) head.add(B(0.04, 0.3, 0.04, 0x7c4a1e, sd * 0.33, 0.42, 0).rotateZ(-sd * 0.9));
    const crystal = shard(0.17, def.color, 0.7); crystal.scale.set(0.8, 1.45, 0.8); crystal.position.y = 1.08; crystal.name = 'spin'; head.add(crystal);
    for (let i = 0; i < 4; i++) { const s = shard(0.06, 0xe0ffff, 0.8); s.name = 'orbit' + i; s.userData = { r: 0.3, y: 1.08, n: 4, spd: 2.2 }; head.add(s); }
    face = makeFace({ r: 0.1, gap: 0.1, iris: 0x0ea5e9, skin: 0xf6fdff, mouth: 'none', body: { R: R2, cy: c2, y0: 0.72 } });
    muzzle = makeBlast(0.48, 0xffffff, 0xbbf2f6, 0x38bdf8); muzzle.position.set(0, 1.08, 0.2); head.add(muzzle);
  } else if (type === 'blaster') {
    // "Boomy" (Tower Mortir): Super cute chubby bomb-artillery buddy with aviator goggles, utility belt & wide-bore mortar launcher
    const R = 0.42, cy = 0.38, sy = 0.92;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    // Sunny cream belly patch
    head.add(S(0.24, 0xfef08a, 0, 0.24, 0.29, { sy: 0.85, sz: 0.5, ol: false }));

    // Leather demolition utility belt with golden buckle & mini mortar cartridges
    const belt = tor(0.38, 0.045, 0x451a03, 0, 0.18, 0, { rx: Math.PI / 2 });
    head.add(belt);
    // Gold buckle
    head.add(B(0.12, 0.09, 0.04, 0xfbbf24, 0, 0.18, 0.39, { lit: true }));
    head.add(B(0.06, 0.045, 0.05, 0x27272a, 0, 0.18, 0.4));
    // Mini mortar cartridges on sides
    for (const sd of [-1, 1]) {
      const shell = C(0.045, 0.045, 0.12, 0xf97316, sd * 0.28, 0.18, 0.33, 8);
      shell.rotation.x = -0.2;
      head.add(shell);
      head.add(S(0.045, 0xfbbf24, sd * 0.28, 0.24, 0.33, { glow: 0.3 }));
      // Cute chubby hands resting proudly on its belt/hips
      head.add(S(0.08, def.color, sd * 0.38, 0.24, 0.16, { ol: true }));
    }

    // Demolition aviator goggles pushed up on forehead
    const strap = tor(0.4, 0.028, 0x451a03, 0, 0.62, 0, { rx: Math.PI / 2 });
    head.add(strap);
    for (const sd of [-1, 1]) {
      // Brass goggle rim
      const rim = C(0.1, 0.1, 0.045, 0xfbbf24, sd * 0.18, 0.64, 0.34, 12, { glow: 0.2 });
      rim.rotation.x = 0.4;
      head.add(rim);
      // Glowing sky-blue glass lens
      head.add(S(0.075, 0x38bdf8, sd * 0.18, 0.64, 0.36, { glow: 0.6, ol: false }));
    }

    // Sturdy mortar swivel base collar
    head.add(C(0.24, 0.27, 0.12, 0x27272a, 0, 0.64, -0.06, 14, { ol: true }));
    // Elevation quadrant gears & trunnion pivot bolts on sides
    for (const sd of [-1, 1]) {
      const gear = C(0.12, 0.12, 0.04, 0xd97706, sd * 0.25, 0.72, -0.06, 10, { ol: true });
      gear.rotation.z = Math.PI / 2;
      head.add(gear);
      head.add(S(0.048, 0xfbbf24, sd * 0.28, 0.72, -0.06, { glow: 0.3 }));
    }

    // Heavy wide-bore siege mortar tube angled upward at ~60° high artillery arc
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.72, -0.06);
    pivot.rotation.x = 0.85; // angled high for mortar lob
    head.add(pivot);

    // Chunky wide-bore tube
    pivot.add(C(0.22, 0.26, 0.62, 0x1f242d, 0, 0.32, 0, 14, { ol: true }));
    // Thick golden reinforced muzzle ring
    pivot.add(C(0.275, 0.275, 0.09, 0xfbbf24, 0, 0.62, 0, 14, { glow: 0.3 }));
    // Accent ring with warm glow
    pivot.add(C(0.255, 0.255, 0.06, def.accent, 0, 0.22, 0, 14, { glow: 0.35 }));
    // Deep dark interior launch bore
    pivot.add(C(0.185, 0.185, 0.03, 0x09090b, 0, 0.665, 0, 12, { ol: false }));

    // Level upgrades: reinforced banding
    if (level >= 2) {
      pivot.add(C(0.265, 0.265, 0.05, 0xfbbf24, 0, 0.44, 0, 14, { glow: 0.3 }));
    }
    if (level >= 3) {
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        pivot.add(S(0.04, 0xfde047, Math.cos(a) * 0.27, 0.52, Math.sin(a) * 0.27, { glow: 0.7 }));
      }
    }

    // Muzzle blast flash (throwaway effect scaled when firing)
    muzzle = makeBlast(0.68, 0xfff3b0, 0xffa11f, 0xff5a1a, 'y');
    muzzle.position.set(0, 0.7, 0);
    pivot.add(muzzle);

    // Curling fuse cord extending from the breech of the mortar tube
    const fuse = C(0.018, 0.018, 0.18, 0xa1a1aa, 0, 0.1, -0.22, 6, { ol: false });
    fuse.rotation.x = -0.5;
    head.add(fuse);
    const fl = makeFlame(0.11);
    fl.position.set(0, 0.19, -0.26);
    head.add(fl);
    flames.push(fl);

    // Cute mischievous grin face with blushing cheeks and dark eyebrows
    face = makeFace({ r: 0.135, gap: 0.17, iris: 0x9a3412, skin: def.color, mouth: 'grin', cheeks: true, brows: 0x7c2d12, body: { R, cy, sy, y0: 0.52 } });
  } else if (type === 'tesla') {
    // "Zappy": coil-body creature with a glowing glass bulb head, antennae and orbiting sparks
    head.add(C(0.3, 0.34, 0.24, 0x6d28d9, 0, 0.12, 0, 14));
    head.add(C(0.345, 0.345, 0.05, 0xd97706, 0, 0.27, 0, 14, { glow: 0.25 }));
    head.add(C(0.23, 0.29, 0.22, 0x7c3aed, 0, 0.41, 0, 14));
    head.add(C(0.285, 0.285, 0.05, 0xd97706, 0, 0.54, 0, 14, { glow: 0.25 }));
    const R = 0.3, cy = 0.88;
    head.add(S(R, 0xc4b5fd, 0, cy, 0, { sy: 1.05, glow: 0.35 }));
    for (const sd of [-1, 1]) {
      head.add(C(0.016, 0.016, 0.3, 0xe9d5ff, sd * 0.13, 1.2, 0, 6, { ol: false }).rotateZ(-sd * 0.35));
      const tip = S(0.055, 0xfff7ae, sd * 0.185, 1.36, 0, { glow: 1, ol: false }); tip.name = 'tip' + (sd > 0 ? 1 : 0); head.add(tip);
    }
    for (let i = 0; i < 2; i++) { const o = S(0.055, 0xfef08a, 0, 0, 0, { glow: 1, ol: false }); o.name = 'orbit' + i; o.userData = { r: 0.46, y: 0.88, n: 2, spd: 3 }; head.add(o); }
    face = makeFace({ r: 0.12, gap: 0.13, iris: 0xfacc15, skin: 0xc4b5fd, mouth: 'grin', body: { R, cy, sy: 1.05, y0: 0.9 } });
  } else if (type === 'sniper') {
    // "Hawk-eye": tall owl with giant goggled eyes and a long rifle held under its beak
    const R = 0.34, cy = 0.62, sy = 1.45;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    head.add(S(0.25, 0xd1fae5, 0, 0.47, 0.23, { sy: 1.25, sz: 0.5, ol: false }));
    for (const sd of [-1, 1]) {
      head.add(B(0.1, 0.22, 0.1, def.accent, sd * 0.2, 1.17, 0, { ol: true }).rotateZ(-sd * 0.3));
      head.add(B(0.07, 0.5, 0.32, def.accent, sd * 0.35, 0.6, -0.02, { ol: true }));
    }
    const beak = cone(0.055, 0.14, 0xfb923c, 0, 0.76, 0.33, 6); beak.rotation.x = Math.PI / 2; head.add(beak);
    head.add(C(0.045, 0.055, 1.0, 0x1f2937, 0, 0.42, 0.62, 10).rotateX(Math.PI / 2));
    head.add(B(0.15, 0.15, 0.34, 0x7c4a1e, 0, 0.42, 0.2, { ol: true }));
    head.add(C(0.06, 0.06, 0.3, 0x111827, 0, 0.53, 0.5, 10).rotateX(Math.PI / 2));
    head.add(S(0.045, 0xff3030, 0, 0.53, 0.66, { glow: 1, ol: false }));
    const f = makeFace({ r: 0.165, gap: 0.2, iris: 0xf59e0b, skin: def.color, mouth: 'none', body: { R, cy, sy, y0: 0.87 } });
    for (const sd of [-1, 1]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.028, 8, 18), toon(0x0f766e, 0.4, 0.2)); rim.position.set(sd * 0.2, 0, f.children[0].position.z + 0.03); f.add(rim); }
    face = f;
    muzzle = makeBlast(0.5, 0xccffee, 0x34d399, 0x0f9b7a); muzzle.position.set(0, 0.42, 1.14); head.add(muzzle);
  } else if (type === 'poison') {
    // "Brewy": grumpy-cute witch cauldron, bubbling lime brew, wooden spoon
    const R = 0.4, cy = 0.36, sy = 0.85;
    head.add(S(R, 0x434f63, 0, cy, 0, { sy }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.075, 10, 22), toon(0x5d6b82, 0.45, 0.1)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.62; rim.castShadow = true; head.add(rim);
    head.add(C(0.3, 0.3, 0.05, def.color, 0, 0.64, 0, 18, { glow: 0.55, ol: false }));
    for (let i = 0; i < 3; i++) { const b = S(0.07 + i * 0.02, 0xd9f99d, (i - 1) * 0.15, 0.64, (i % 2) * 0.1 - 0.05, { glow: 0.6, ol: false }); b.name = 'bubble' + i; b.userData.y0 = 0.64; head.add(b); }
    for (const sd of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 12), toon(0x5d6b82)); h.rotation.y = Math.PI / 2; h.position.set(sd * 0.43, 0.4, 0); head.add(h); }
    head.add(C(0.02, 0.02, 0.5, 0x8a5a3c, 0.12, 0.95, -0.05, 6, { ol: false }).rotateZ(-0.3));
    face = makeFace({ r: 0.12, gap: 0.16, iris: 0x84cc16, skin: 0x434f63, mouth: 'grin', body: { R, cy, sy, y0: 0.42 } });
  } else if (type === 'banner') {
    // "Kiko": red war-drum buddy carrying a waving flag, drumsticks on top
    const R = 0.34;
    head.add(C(R, R, 0.46, 0xdc2626, 0, 0.33, 0, 18));
    head.add(C(0.355, 0.355, 0.05, 0xfbbf24, 0, 0.11, 0, 18, { glow: 0.2 }));
    head.add(C(0.355, 0.355, 0.05, 0xfbbf24, 0, 0.55, 0, 18, { glow: 0.2 }));
    head.add(C(0.31, 0.31, 0.03, 0xfff7ed, 0, 0.575, 0, 18, { ol: false }));
    for (const sd of [-1, 1]) { head.add(C(0.022, 0.022, 0.3, 0xfde68a, sd * 0.1, 0.72, 0.02, 8, { ol: false }).rotateZ(-sd * 0.6)); head.add(S(0.04, 0xfbbf24, sd * 0.2, 0.84, 0.02, { ol: false })); }
    head.add(C(0.03, 0.03, 1.0, 0xe7e5e4, 0, 0.95, -0.22, 8));
    head.add(S(0.07, 0xfbbf24, 0, 1.47, -0.22, { glow: 0.4 }));
    const flag = new THREE.Group(); flag.position.set(0.03, 1.28, -0.22); flag.name = 'flag';
    for (let i = 0; i < 4; i++) flag.add(B(0.16, 0.42 - i * 0.04, 0.03, i % 2 ? 0xfbbf24 : 0xf97316, 0.12 + i * 0.16, -0.21 + i * 0.02, 0));
    flag.add(B(0.14, 0.14, 0.04, 0xfff7ed, 0.2, -0.15, 0.02)); head.add(flag);
    face = makeFace({ r: 0.12, gap: 0.14, iris: 0x7c2d12, skin: 0xdc2626, mouth: 'smile', body: { kind: 'cyl', R, cy: 0.33, y0: 0.36 } });
  } else if (type === 'plasma') {
    // "Volta": a little thundercloud buddy – puffy body, golden lightning-bolt crest, and a plasma-coil snout
    // with two prongs that crackle with tiny sparks. The plasma arc is born from the glowing orb between the prongs.
    const R = 0.36, cy = 0.42;
    head.add(S(R, 0xe6edf8, 0, cy, 0, { glow: 0.14 }));
    head.add(S(0.25, 0xd3dcee, -0.34, 0.3, 0.02)); head.add(S(0.25, 0xd3dcee, 0.34, 0.3, 0.02));
    head.add(S(0.24, 0xf1f5fb, -0.2, 0.72, -0.04, { glow: 0.14 })); head.add(S(0.21, 0xf1f5fb, 0.2, 0.7, -0.04, { glow: 0.14 }));
    head.add(S(0.3, 0x9db0cc, 0, 0.1, -0.02, { sy: 0.5 }));
    // lightning-bolt crest (extruded zig-zag)
    const sh = new THREE.Shape(); const bp: [number, number][] = [[0.04, 0.32], [0.16, 0.32], [0.07, 0.1], [0.15, 0.1], [-0.06, -0.3], [-0.01, -0.02], [-0.1, -0.02]];
    sh.moveTo(bp[0][0], bp[0][1]); for (let i = 1; i < bp.length; i++) sh.lineTo(bp[i][0], bp[i][1]); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 }); geo.translate(0, 0, -0.035);
    const horn = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.9, roughness: 0.35 }));
    const hornOl = new THREE.Mesh(geo, OUTLINE_MAT); hornOl.scale.setScalar(1.2); horn.add(hornOl);
    horn.position.set(0, 1.04, -0.03); horn.scale.setScalar(1.15); horn.name = 'boltHorn'; horn.castShadow = true; head.add(horn);
    // plasma-coil snout
    head.add(C(0.085, 0.125, 0.56, 0x475569, 0, 0.2, 0.52, 12).rotateX(Math.PI / 2));
    for (const z of [0.4, 0.54, 0.68]) { const rr = 0.135 - (z - 0.4) * 0.12; const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.028, 8, 16), toon(0xfbbf24, 0.4, 0.22)); ring.position.set(0, 0.2, z); ring.castShadow = true; head.add(ring); }
    for (const sd of [-1, 1]) head.add(B(0.035, 0.035, 0.24, 0xfbbf24, sd * 0.085, 0.2, 0.84, { lit: true }));
    const orb = new THREE.Group(); orb.name = 'plasmaOrb'; orb.position.set(0, 0.2, 0.87);
    const orbMat = (c: number, o: number) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: false });
    const o1 = new THREE.Mesh(SPH, orbMat(0xffffff, 1)); o1.scale.setScalar(0.055);
    const o2 = new THREE.Mesh(SPH, orbMat(0xfff3a0, 0.7)); o2.scale.setScalar(0.1);
    const o3 = new THREE.Mesh(SPH, orbMat(0x38bdf8, 0.28)); o3.scale.setScalar(0.17);
    orb.add(o1, o2, o3); head.add(orb);
    // idle sparks jumping between the prongs
    const ia = new Bolt(MINI_STYLE); ia.group.name = 'idleArc'; head.add(ia.group);
    const ra = new THREE.Vector3(-0.085, 0.2, 0.95), rb = new THREE.Vector3(0.085, 0.2, 0.95); ia.update(ra, rb, 1);
    head.userData.idleArc = { bolt: ia, a: ra, b: rb, t: 0 } as IdleArc;
    // little raindrops circling the cloud
    for (let i = 0; i < 3; i++) { const d = S(0.05, 0x7dd3fc, 0, 0, 0, { glow: 0.9, ol: false, sy: 1.3 }); d.name = 'orbit' + i; d.userData = { r: 0.56, y: 0.5, n: 3, spd: 1.4 }; head.add(d); }
    face = makeFace({ r: 0.125, gap: 0.15, iris: 0x2563eb, skin: 0xe6edf8, mouth: 'none', body: { R, cy, y0: 0.55 } });
  } else if (type === 'piggy') {
    // "Pinky": a chubby piggy bank – coin slot on its back and a spinning gold coin above that pops every time it pays out
    const R = 0.4, cy = 0.4, sy = 0.9, pink2 = 0xf472b6;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    head.add(S(0.22, 0xffe3ef, 0, 0.3, 0.2, { sy: 0.9, sz: 0.45, ol: false }));
    for (const sd of [-1, 1]) {
      const ear = cone(0.12, 0.24, pink2, sd * 0.26, 0.74, 0.0, 6); ear.rotation.z = -sd * 0.5; head.add(ear);
      head.add(S(0.1, pink2, sd * 0.25, 0.1, 0.22)); head.add(S(0.1, pink2, sd * 0.25, 0.1, -0.22));
    }
    head.add(S(0.15, pink2, 0, 0.3, 0.4, { sx: 1.15, sz: 0.7 }));
    for (const sd of [-1, 1]) head.add(S(0.03, 0x831843, sd * 0.05, 0.3, 0.5, { ol: false }));
    head.add(B(0.3, 0.035, 0.07, 0x831843, 0, 0.77, -0.02));
    const ptail = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12, Math.PI * 1.5), toon(pink2)); ptail.position.set(0, 0.42, -0.42); head.add(ptail);
    const coin = new THREE.Group(); coin.name = 'coin'; coin.position.set(0, 1.18, 0);
    const disc = C(0.17, 0.17, 0.045, 0xfbbf24, 0, 0, 0, 20, { glow: 0.45 }); disc.rotation.x = Math.PI / 2; coin.add(disc);
    coin.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 20), toon(0xfde68a, 0.4, 0.4)));
    coin.add(B(0.04, 0.16, 0.02, 0xb45309, 0, 0, 0.03)); head.add(coin);
    face = makeFace({ r: 0.115, gap: 0.15, iris: 0x7c2d12, skin: def.color, mouth: 'none', body: { R, cy, sy, y0: 0.5 } });
  } else if (type === 'wind') {
    // "Whirl": a puffy cloud buddy with a propeller beanie; it blows a gust that pushes every orc nearby back along the road
    const R = 0.38, cy = 0.4;
    head.add(S(R, def.color, 0, cy, 0, { glow: 0.14 }));
    head.add(S(0.2, 0xf1f4ff, 0, 0.26, 0.26, { sy: 0.8, sz: 0.5, ol: false }));
    head.add(S(0.17, 0xe0e7ff, -0.37, 0.3, 0)); head.add(S(0.17, 0xe0e7ff, 0.37, 0.3, 0));
    head.add(S(0.3, def.accent, 0, 0.72, -0.02, { sy: 0.55 }));
    head.add(C(0.02, 0.02, 0.14, 0xe7e5e4, 0, 0.9, -0.02, 6, { ol: false }));
    const rotor = new THREE.Group(); rotor.name = 'rotor'; rotor.position.set(0, 0.99, -0.02);
    for (let i = 0; i < 3; i++) { const pv = new THREE.Group(); pv.rotation.y = (i * 2 * Math.PI) / 3; pv.add(B(0.4, 0.035, 0.13, i % 2 ? 0xf472b6 : 0xfbbf24, 0.22, 0, 0, { ol: true })); rotor.add(pv); }
    rotor.add(S(0.06, 0xfde047, 0, 0.02, 0, { ol: false })); head.add(rotor);
    for (let i = 0; i < 2; i++) {
      const sw = new THREE.Group(); sw.name = 'swirl' + i; sw.position.y = i ? 0.58 : 0.34;
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.5 - i * 0.06, 0.03, 6, 22, Math.PI * 1.35), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }));
      arc.rotation.x = Math.PI / 2; sw.add(arc); head.add(sw);
    }
    face = makeFace({ r: 0.125, gap: 0.15, iris: 0x4f46e5, skin: def.color, mouth: 'grin', body: { R, cy, y0: 0.52 } });
  } else if (type === 'boomer') {
    // "Bumi": a friendly tree-stump buddy with a leaf sprout; it hurls the boomerang that floats above its head
    const R = 0.38;
    head.add(C(R - 0.02, R + 0.04, 0.52, def.color, 0, 0.26, 0, 16));
    head.add(C(R - 0.05, R - 0.05, 0.04, 0xf2d3a5, 0, 0.53, 0, 16, { ol: false }));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4; const lf = S(0.08, 0x4ade80, Math.cos(a) * 0.1, 0.6, Math.sin(a) * 0.1, { sx: 0.7, sy: 1.8, sz: 0.5 });
      lf.rotation.z = -Math.cos(a) * 0.5; lf.rotation.x = Math.sin(a) * 0.5; head.add(lf);
    }
    for (const sd of [-1, 1]) { const arm = B(0.28, 0.07, 0.07, def.accent, sd * 0.45, 0.32, 0, { ol: true }); arm.rotation.z = sd * 0.5; head.add(arm); head.add(S(0.07, 0x4ade80, sd * 0.58, 0.44, 0, { sx: 0.7, sy: 1.3 })); }
    const prop = makeBoomerang(0xf59e0b, 0x2563eb); prop.name = 'boomProp'; prop.position.set(0, 1.02, 0); prop.scale.setScalar(0.85); head.userData.prop = prop; head.add(prop);
    face = makeFace({ r: 0.12, gap: 0.15, iris: 0x365314, skin: def.color, mouth: 'smile', body: { kind: 'cyl', R: R + 0.01, cy: 0.26, y0: 0.3 } });
  } else if (type === 'mine') {
    // "Moli": a miner mole in a lamp helmet; it digs landmines onto the road that blow up under passing orcs
    head.add(S(0.52, 0x7b5a3a, 0, 0.1, 0, { sy: 0.38 }));
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; head.add(S(0.07 + 0.02 * (i % 3), 0x6b4a2e, Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5, { ol: false })); }
    const mh = new THREE.Group(); mh.name = 'moleHead'; mh.position.y = 0.2; head.add(mh);
    const R = 0.34, cy = 0.3;
    mh.add(S(R, def.color, 0, cy, 0, { sy: 1.05 }));
    mh.add(S(0.13, 0xffa6b5, 0, 0.24, 0.31, { sz: 0.8 })); mh.add(S(0.045, 0xf9739b, 0, 0.28, 0.43, { ol: false }));
    for (const sd of [-1, 1]) {
      mh.add(S(0.1, def.color, sd * 0.33, 0.08, 0.16));
      for (let k = -1; k <= 1; k++) { const cl = cone(0.022, 0.08, 0xffffff, sd * 0.33 + k * 0.045, 0.06, 0.27, 5); cl.rotation.x = Math.PI / 2; mh.add(cl); }
    }
    mh.add(S(0.3, 0xfacc15, 0, 0.58, 0, { sy: 0.6 })); mh.add(C(0.36, 0.36, 0.04, 0xf59e0b, 0, 0.5, 0, 16)); mh.add(S(0.07, 0xfff7ae, 0, 0.6, 0.29, { glow: 1, ol: false }));
    const mf = makeFace({ r: 0.1, gap: 0.13, iris: 0x4c3f5c, skin: def.color, mouth: 'none', body: { R, cy, sy: 1.05, y0: 0.36 } });
    mh.add(mf); head.userData.face = mf;
  } else if (type === 'cactus') {
    // "Spiky": a perky cactus with waving arms, a pink flower on its head and white needles – shoots needles, 3x damage to anything that flies
    const R = 0.34, cy = 0.5, sy = 1.3;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    head.add(S(0.17, 0xc8f7d2, 0, 0.36, 0.22, { sy: 1.1, sz: 0.4, ol: false }));
    for (const sd of [-1, 1]) {
      const arm = new THREE.Group(); arm.name = 'cArm' + (sd < 0 ? 0 : 1); arm.position.set(sd * 0.27, 0.46, 0);
      arm.add(C(0.075, 0.075, 0.24, def.color, sd * 0.1, 0, 0, 10).rotateZ(Math.PI / 2));
      arm.add(C(0.075, 0.075, 0.26, def.color, sd * 0.22, 0.13, 0, 10));
      arm.add(S(0.075, def.color, sd * 0.22, 0.26, 0));
      head.add(arm);
    }
    for (let k = 0; k < 16; k++) { // white needles dotted over the sides and back (never in front of the face)
      const a = k * 2.4, yy = cy - 0.38 + (k % 8) * 0.11, e = (yy - cy) / (R * sy);
      if (Math.abs(e) > 0.92) continue;
      const rad = R * Math.sqrt(1 - e * e), nx = Math.sin(a), nz = Math.cos(a); if (nz > 0.5) continue;
      const sp = cone(0.02, 0.1, 0xf8fafc, nx * rad, yy, nz * rad, 5); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, 0.25, nz).normalize()); head.add(sp);
    }
    const flower = new THREE.Group(); flower.name = 'flower'; flower.position.set(0, cy + R * sy + 0.02, 0);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; flower.add(S(0.075, 0xf9a8d4, Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1, { sy: 0.6 })); }
    flower.add(S(0.065, 0xfde047, 0, 0.02, 0, { glow: 0.5 })); head.add(flower);
    face = makeFace({ r: 0.115, gap: 0.14, iris: 0x166534, skin: def.color, mouth: 'smile', body: { R, cy, sy, y0: 0.56 } });
  } else if (type === 'hive') {
    // "Buzzy": an adorable, unmistakably bee-shaped Queen Bumblebee buddy with bold yellow & black stripes,
    // plump fuzzy abdomen, sharp black stinger, springy antennae, fluttering double wings, honey dipper, and orbiting worker bees
    const yellow = def.color;    // 0xfbbf24
    const black = 0x1c1917;     // jet black bumblebee stripe
    const fluffy = 0xfef08a;    // pale fuzzy fur

    // 1. Plump Bumblebee Thorax (fuzzy golden chest)
    head.add(S(0.34, yellow, 0, 0.46, 0.04, { sx: 1.0, sy: 0.95, sz: 1.08 }));
    // Fluffy fur ruff collar around upper thorax/neck
    head.add(tor(0.28, 0.055, fluffy, 0, 0.58, 0.12, { rx: 0.3, glow: 0.25 }));

    // 2. Iconic Striped Abdomen (Perut Belang-Belang Lebah)
    // 5 bold alternating black & yellow curved segments tapering toward the stinger
    const stripes = [
      { z: -0.12, y: 0.45, r: 0.33, col: black, sx: 0.96, sy: 0.9 },
      { z: -0.25, y: 0.42, r: 0.33, col: yellow, sx: 0.94, sy: 0.88 },
      { z: -0.38, y: 0.38, r: 0.31, col: black, sx: 0.90, sy: 0.84 },
      { z: -0.50, y: 0.33, r: 0.27, col: yellow, sx: 0.84, sy: 0.78 },
      { z: -0.61, y: 0.28, r: 0.20, col: black, sx: 0.74, sy: 0.70 },
    ];
    for (const s of stripes) {
      head.add(S(s.r, s.col, 0, s.y, s.z, { sx: s.sx, sy: s.sy, sz: 0.45 }));
    }

    // 3. Sharp Glossy Black Bee Stinger (Sengat Lebah)
    const stinger = cone(0.065, 0.22, black, 0, 0.24, -0.76, 8);
    stinger.rotation.x = -Math.PI / 2 - 0.2;
    head.add(stinger);
    // Golden warning tip at stinger point
    const stingTip = cone(0.024, 0.07, 0xfde047, 0, 0.21, -0.86, 6);
    stingTip.rotation.x = -Math.PI / 2 - 0.2;
    head.add(stingTip);

    // 4. Cute Bumblebee Head (Kepala Lebah yang Imut)
    const R = 0.30, cy = 0.56, sy = 0.96;
    head.add(S(R, yellow, 0, cy, 0.24, { sy }));

    // 5. Springy Curved Antennae with glowing golden pom-poms
    for (const sd of [-1, 1]) {
      const ant = C(0.015, 0.015, 0.24, black, sd * 0.12, 0.84, 0.28, 6, { ol: false });
      ant.rotation.z = -sd * 0.42; ant.rotation.x = 0.18;
      head.add(ant);
      // Glowing golden orb at antenna tip
      head.add(S(0.046, 0xfde047, sd * 0.18, 0.95, 0.33, { glow: 0.6, ol: false }));
    }

    // 6. Fluttering Double Bee Wings (Dua Pasang Sayap Lebah)
    for (const sd of [-1, 1]) {
      const wingGrp = new THREE.Group();
      wingGrp.name = 'hWing' + (sd < 0 ? 0 : 1);
      wingGrp.position.set(sd * 0.18, 0.66, -0.06);

      // Forewing (large translucent teardrop wing pointing up & back)
      const fw = new THREE.Mesh(
        SPH,
        new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.2, transparent: true, opacity: 0.78, emissive: 0x93c5fd, emissiveIntensity: 0.35, depthWrite: false })
      );
      fw.scale.set(0.13, 0.26, 0.02);
      fw.position.set(sd * 0.16, 0.15, -0.06);
      fw.rotation.set(-0.25, sd * 0.25, -sd * 0.45);
      fw.castShadow = true;
      wingGrp.add(fw);

      // Hindwing (smaller delicate wing underneath)
      const hw = new THREE.Mesh(
        SPH,
        new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.2, transparent: true, opacity: 0.72, emissive: 0xbae6fd, emissiveIntensity: 0.25, depthWrite: false })
      );
      hw.scale.set(0.10, 0.18, 0.018);
      hw.position.set(sd * 0.13, 0.03, -0.12);
      hw.rotation.set(-0.35, sd * 0.2, -sd * 0.55);
      wingGrp.add(hw);

      head.add(wingGrp);
    }

    // 7. Cute Bee Legs & Honey Dipper / Pollen Paws
    // Front little black paws hugging a glowing honey drop in front
    for (const sd of [-1, 1]) {
      head.add(B(0.05, 0.05, 0.12, black, sd * 0.09, 0.36, 0.28, { ol: false }));
    }
    // Golden honey drop held by front paws
    head.add(S(0.08, 0xf59e0b, 0, 0.34, 0.34, { glow: 0.4, ol: false }));

    // Back legs with bright yellow pollen baskets (kantong serbuk sari)
    for (const sd of [-1, 1]) {
      head.add(B(0.05, 0.13, 0.05, black, sd * 0.27, 0.22, -0.14, { ol: false }));
      head.add(S(0.065, 0xfacc15, sd * 0.30, 0.20, -0.12, { sx: 0.8, glow: 0.3, ol: false }));
    }

    // 8. Orbiting Mini Worker Bees
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Group(); b.name = 'orbit' + i; b.userData = { r: 0.65, y: 0.62, n: 3, spd: 2.4 };
      // Chubby yellow body + black stripes
      b.add(S(0.062, yellow, 0, 0, 0, { sx: 0.9, sy: 0.9, sz: 1.3, ol: false }));
      b.add(S(0.064, black, 0, 0, -0.02, { sx: 0.92, sy: 0.92, sz: 0.38, ol: false }));
      b.add(S(0.060, black, 0, 0, 0.04, { sx: 0.88, sy: 0.88, sz: 0.25, ol: false }));
      // Tiny stinger
      const bSting = cone(0.015, 0.05, black, 0, 0, -0.10, 5); bSting.rotation.x = -Math.PI / 2; b.add(bSting);
      // Tiny translucent wings
      b.add(S(0.055, 0xe0f2fe, -0.065, 0.045, 0, { sx: 0.45, sy: 0.2, sz: 0.7, ol: false, glow: 0.3 }));
      b.add(S(0.055, 0xe0f2fe, 0.065, 0.045, 0, { sx: 0.45, sy: 0.2, sz: 0.7, ol: false, glow: 0.3 }));
      head.add(b);
    }

    // 9. Cute smiling bumblebee face
    face = makeFace({ r: 0.12, gap: 0.155, iris: black, skin: yellow, mouth: 'smile', cheeks: true, bias: 0.18, body: { R, cy, sy, y0: 0.58 } });
    face.position.z += 0.24;
  } else if (type === 'golem') {
    // "Rocky": a rock golem with crystal sprouts; it raises its fists and slams the ground – the shockwave hurts and stuns every ground orc around it
    const R = 0.42, cy = 0.46, sy = 0.92;
    head.add(S(R, def.color, 0, cy, 0, { sy, sx: 1.05 }));
    // stone crown: subtle rock lumps carved out of the same grey stone as the body (the old green moss cap +
    // leaf sprouts are gone – they clashed with the rocky look), plus two little stone horns at the sides
    for (const [x, y, z, r, rz] of [[-0.17, 0.72, 0.02, 0.16, 0.3], [0.16, 0.75, -0.05, 0.17, -0.32], [0.0, 0.7, 0.17, 0.13, 0.05]] as [number, number, number, number, number][]) {
      const plate = S(r, def.color, x, y, z, { sy: 0.62 }); plate.rotation.z = rz; head.add(plate);
    }
    for (const sd of [-1, 1]) { const horn = cone(0.075, 0.22, 0xa8a29e, sd * 0.3, 0.72, -0.02, 5); horn.rotation.z = -sd * 0.55; head.add(horn); }
    const c1 = shard(0.1, 0x7dd3fc, 0.8); c1.scale.set(0.8, 1.7, 0.8); c1.position.set(0.2, 0.86, -0.3); c1.rotation.z = -0.3; head.add(c1);
    const c2 = shard(0.08, 0xf9a8d4, 0.8); c2.scale.set(0.8, 1.6, 0.8); c2.position.set(-0.22, 0.8, -0.32); c2.rotation.z = 0.35; head.add(c2);
    for (const sd of [-1, 1]) {
      head.add(S(0.13, def.color, sd * 0.4, 0.56, 0.0));
      const fist = new THREE.Group(); fist.name = sd < 0 ? 'fistL' : 'fistR'; fist.position.set(sd * 0.5, 0.3, 0.06);
      fist.add(S(0.18, def.color, 0, 0, 0));
      for (let k = -1; k <= 1; k++) fist.add(S(0.05, 0xe7e5e4, k * 0.07, 0.02, 0.15, { ol: false }));
      head.add(fist);
      head.add(S(0.15, def.accent, sd * 0.2, 0.08, 0.08, { sy: 0.6 }));
    }
    face = makeFace({ r: 0.125, gap: 0.165, iris: 0x0369a1, skin: def.color, mouth: 'grin', bias: 0.3, brows: 0x57534e, body: { R, cy, sy, y0: 0.52 } });
  } else if (type === 'clock') {
    // "Chrono": a round alarm-clock buddy with golden bells, ticking dial, and visible slowmo time-dilation field
    const R = 0.4, cy = 0.5;
    head.add(S(R, def.color, 0, cy, 0));
    const bells = new THREE.Group(); bells.name = 'bells'; bells.position.y = 0.94;
    for (const sd of [-1, 1]) bells.add(S(0.15, 0xfbbf24, sd * 0.2, 0, 0, { sy: 0.72, glow: 0.3 }));
    bells.add(B(0.025, 0.14, 0.025, 0x92400e, 0, 0.06, 0)); bells.add(S(0.04, 0xfbbf24, 0, 0.15, 0)); head.add(bells);
    for (const sd of [-1, 1]) head.add(S(0.14, def.accent, sd * 0.3, 0.12, 0.06, { sy: 0.6 })); // feet
    const dial = new THREE.Group(); dial.position.set(0, 0.3, 0.345);
    dial.add(C(0.17, 0.17, 0.035, 0xfffbeb, 0, 0, 0, 22, { ol: false }).rotateX(Math.PI / 2));
    dial.add(new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.026, 8, 24), toon(0xfbbf24, 0.4, 0.2)));
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; dial.add(B(0.02, 0.035, 0.012, 0x92400e, Math.sin(a) * 0.135, Math.cos(a) * 0.135, 0.02)); }
    const mh = new THREE.Group(); mh.name = 'clockMin'; mh.position.z = 0.025; mh.add(B(0.022, 0.14, 0.012, 0x7c2d12, 0, 0.065, 0)); dial.add(mh);
    const hh = new THREE.Group(); hh.name = 'clockHour'; hh.position.z = 0.03; hh.add(B(0.028, 0.09, 0.012, 0x7c2d12, 0, 0.04, 0)); dial.add(hh);
    dial.add(S(0.026, 0xfbbf24, 0, 0, 0.04, { ol: false })); head.add(dial);

    // Visible Slowmo Time-Dilation Field on the ground marking the exact slow-mo radius
    const clkField = new THREE.Group();
    clkField.name = 'clockField';
    clkField.position.set(0, -0.32, 0);
    const zoneRing = new THREE.Mesh(
      new THREE.RingGeometry(2.64, 2.72, 40),
      new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
    );
    zoneRing.rotation.x = Math.PI / 2;
    clkField.add(zoneRing);
    const zoneDisc = new THREE.Mesh(
      new THREE.CircleGeometry(2.64, 36),
      new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })
    );
    zoneDisc.rotation.x = Math.PI / 2;
    clkField.add(zoneDisc);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const isQuarter = k % 3 === 0;
      const tick = new THREE.Mesh(
        new THREE.PlaneGeometry(isQuarter ? 0.14 : 0.07, isQuarter ? 0.035 : 0.02),
        new THREE.MeshBasicMaterial({ color: isQuarter ? 0x5eead4 : 0x2dd4bf, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
      );
      tick.rotation.x = Math.PI / 2;
      tick.rotation.z = -a;
      tick.position.set(Math.sin(a) * 2.68, 0.001, Math.cos(a) * 2.68);
      clkField.add(tick);
    }
    head.add(clkField);

    face = makeFace({ r: 0.115, gap: 0.15, iris: 0x0f766e, skin: def.color, mouth: 'none', body: { R, cy, y0: 0.6 } });
  } else if (type === 'prism') {
    // "Lumi": a cheerful striped lighthouse. Its lamp fires a wide RAINBOW beam that pierces EVERY enemy standing in a line (+20% damage for each one it already passed through).
    const R = 0.34;
    head.add(C(R, R + 0.03, 0.52, 0xffffff, 0, 0.26, 0, 20));
    head.add(C(R + 0.035, R + 0.035, 0.07, def.accent, 0, 0.58, 0, 20));
    head.add(C(0.27, R, 0.3, def.color, 0, 0.77, 0, 20));
    head.add(C(0.32, 0.32, 0.06, 0xfbbf24, 0, 0.95, 0, 20, { glow: 0.3 }));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; head.add(B(0.028, 0.09, 0.028, 0xfbbf24, Math.sin(a) * 0.3, 1.02, Math.cos(a) * 0.3)); } // balcony rail
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.27, 18), new THREE.MeshStandardMaterial({ color: 0xfff7c2, roughness: 0.12, transparent: true, opacity: 0.55, emissive: 0xfde047, emissiveIntensity: 0.55, depthWrite: false }));
    glass.position.y = 1.12; head.add(glass);
    const lamp = new THREE.Group(); lamp.name = 'lampSpin'; lamp.position.y = 1.12;
    lamp.add(S(0.1, 0xfffdf0, 0, 0, 0, { glow: 1, ol: false }));
    lamp.add(B(0.2, 0.13, 0.07, 0xfde047, 0, 0, 0.13, { lit: true })); lamp.add(B(0.2, 0.13, 0.07, 0xfde047, 0, 0, -0.13, { lit: true }));
    head.add(lamp);
    head.add(cone(0.28, 0.3, def.accent, 0, 1.4, 0, 18)); head.add(S(0.05, 0xfbbf24, 0, 1.58, 0, { glow: 0.5 }));
    face = makeFace({ r: 0.125, gap: 0.15, iris: 0x1d4ed8, skin: 0xffffff, mouth: 'smile', body: { kind: 'cyl', R: R + 0.01, cy: 0.26, y0: 0.3 } });
  } else if (type === 'cupid') {
    // "Amor": a round pink cherub with a golden halo, flapping wings and a heart-tipped arrow in its bow. A hit MARKS the enemy (+40% damage from everything, +50% gold) and the mark jumps to a neighbour when it dies.
    const R = 0.36, cy = 0.44;
    head.add(S(R, def.color, 0, cy, 0));
    head.add(S(0.19, 0xffe4ee, 0, 0.32, 0.22, { sy: 0.9, sz: 0.45, ol: false }));
    for (const sd of [-1, 1]) {
      const w = new THREE.Group(); w.name = 'cWing' + (sd < 0 ? 0 : 1); w.position.set(sd * 0.3, 0.56, -0.16);
      w.add(S(0.17, 0xffffff, sd * 0.14, 0.04, 0, { sx: 1.1, sy: 0.55, sz: 0.28, glow: 0.2 }));
      w.add(S(0.12, 0xfdf2f8, sd * 0.3, 0.12, 0, { sx: 1.0, sy: 0.5, sz: 0.25, glow: 0.2 }));
      head.add(w);
    }
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 22), toon(0xfde047, 0.4, 0.5)); halo.name = 'halo'; halo.rotation.x = Math.PI / 2; halo.position.y = 0.98; head.add(halo);
    for (const [x, y, z, r] of [[-0.05, 0.82, 0.04, 0.07], [0.04, 0.86, 0.0, 0.06], [0.0, 0.8, 0.1, 0.05]] as [number, number, number, number][]) head.add(S(r, 0xf472b6, x, y, z, { ol: false }));
    head.add(S(0.075, def.color, 0.34, 0.4, 0.06)); // the hand holding the bow
    const bow = new THREE.Group(); bow.name = 'bow'; bow.position.set(0.42, 0.42, 0.06);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.032, 8, 20, Math.PI), toon(0xf59e0b, 0.5, 0.15)); arc.rotation.set(0, -Math.PI / 2, -Math.PI / 2); arc.castShadow = true; bow.add(arc); // ends up/down, belly bulging toward the target (+z)
    bow.add(C(0.006, 0.006, 0.52, 0xfff7ed, 0, 0, 0, 5, { ol: false })); // string
    const arrow = new THREE.Group(); arrow.name = 'cArrow';
    const shaft = C(0.016, 0.016, 0.5, 0xfde68a, 0, 0, 0.12, 6, { ol: false }); shaft.rotation.x = Math.PI / 2; arrow.add(shaft);
    const tipH = makeHeart(0xf472b6, 0.6); tipH.scale.setScalar(0.12); tipH.rotation.x = -Math.PI / 2; tipH.position.z = 0.4; arrow.add(tipH);
    arrow.add(B(0.1, 0.012, 0.09, 0xfbcfe8, 0, 0, -0.1));
    bow.add(arrow); head.add(bow);
    face = makeFace({ r: 0.12, gap: 0.145, iris: 0x7c3aed, skin: def.color, mouth: 'smile', body: { R, cy, y0: 0.5 } });
  } else if (type === 'hook') {
    // "Froggy": a chubby frog angler in a bucket hat with a fishing rod. Its hook snags the FRONT-MOST enemy (even flyers) and reels it far back along the road, then slams it down.
    const R = 0.4, cy = 0.38, sy = 0.82;
    head.add(S(R, def.color, 0, cy, 0, { sx: 1.08, sy }));
    head.add(S(0.22, 0xe8ffe0, 0, 0.24, 0.26, { sy: 0.8, sz: 0.45, ol: false }));
    for (const sd of [-1, 1]) { head.add(S(0.14, def.color, sd * 0.26, 0.08, 0.26, { sy: 0.55 })); head.add(S(0.15, def.color, sd * 0.32, 0.1, -0.2, { sy: 0.6 })); }
    head.add(C(0.3, 0.31, 0.2, 0xfef3c7, 0, 0.9, -0.02, 18));
    head.add(C(0.305, 0.315, 0.05, def.accent, 0, 0.82, -0.02, 18, { ol: false }));
    head.add(C(0.46, 0.46, 0.04, 0xfef3c7, 0, 0.77, 0, 24));
    const base = new THREE.Vector3(0.3, 0.42, 0.12), tip = new THREE.Vector3(0.58, 1.2, 0.62);
    const dv = tip.clone().sub(base);
    const rod = C(0.016, 0.026, dv.length(), 0x8a5a2b, 0, 0, 0, 6, { ol: false }); rod.position.copy(base).add(tip).multiplyScalar(0.5); rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.clone().normalize()); head.add(rod);
    head.add(C(0.06, 0.06, 0.05, 0xfbbf24, 0.36, 0.46, 0.12, 12).rotateZ(Math.PI / 2)); // reel
    head.add(S(0.08, def.color, 0.34, 0.42, 0.14)); // hand
    const tipO = new THREE.Object3D(); tipO.name = 'rodTip'; tipO.position.copy(tip); head.add(tipO);
    const idle = new THREE.Group(); idle.name = 'idleLine'; idle.position.copy(tip); // the line + bobber that dangle while the rod is idle
    idle.add(C(0.005, 0.005, 0.5, 0xf0f9ff, 0, -0.25, 0, 4, { ol: false }));
    idle.add(S(0.06, 0xffffff, 0, -0.55, 0)); idle.add(S(0.045, 0xfb923c, 0, -0.5, 0, { ol: false }));
    head.add(idle);
    face = makeFace({ r: 0.13, gap: 0.17, iris: 0xb45309, skin: def.color, mouth: 'smile', body: { R, cy, sy, y0: 0.44 } });
  } else if (type === 'bowl') {
    // "Pino": a bowling-pin buddy holding a glossy ball. It lobs the ball onto the ROAD, where it rolls BACK along the path bowling over every ground orc (3 or more = STRIKE!).
    const prof = new THREE.SplineCurve([[0.16, 0], [0.3, 0.1], [0.37, 0.3], [0.33, 0.52], [0.21, 0.7], [0.15, 0.84], [0.2, 0.97], [0.21, 1.07], [0.14, 1.17], [0, 1.2]].map(([x, y]) => new THREE.Vector2(x, y))).getPoints(26).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
    const pinGeo = new THREE.LatheGeometry(prof, 22);
    const pin = new THREE.Mesh(pinGeo, toon(0xfffaf0, 0.5, 0.12)); pin.castShadow = true; head.add(pin);
    const pinOl = new THREE.Mesh(pinGeo, OUTLINE_MAT); pinOl.scale.set(1.06, 1.02, 1.06); pin.add(pinOl);
    for (const [y, r] of [[0.9, 0.172], [0.99, 0.212]] as [number, number][]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 22), toon(def.accent, 0.5, 0.15)); ring.rotation.x = Math.PI / 2; ring.position.y = y; head.add(ring); }
    for (const sd of [-1, 1]) { head.add(S(0.1, 0xfffaf0, sd * 0.17, 0.05, 0.2, { sy: 0.6 })); head.add(S(0.09, 0xfffaf0, sd * 0.4, 0.42, 0.04)); }
    const ballP = makeBowlingBall(0x3b82f6); ballP.name = 'ballProp'; ballP.position.set(0.38, 0.3, 0.2); ballP.scale.setScalar(0.9); head.add(ballP);
    face = makeFace({ r: 0.125, gap: 0.16, iris: 0x1d4ed8, skin: 0xfffaf0, mouth: 'grin', body: { kind: 'cyl', R: 0.36, cy: 0.3, y0: 0.38 } });
  } else if (type === 'barracks') {
    // "Barry": a chubby little barracks tower – crenellated top, a wooden gate, a red banner and spears at its sides. The knights march out of the gate to guard the road.
    const R = 0.4;
    head.add(C(R, R + 0.05, 0.62, def.color, 0, 0.31, 0, 20));
    head.add(C(R + 0.07, R + 0.07, 0.09, def.accent, 0, 0.66, 0, 20, { glow: 0.2 }));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const m = B(0.15, 0.17, 0.11, def.color, Math.sin(a) * (R + 0.04), 0.79, Math.cos(a) * (R + 0.04), { ol: true }); m.rotation.y = a; head.add(m); }
    head.add(B(0.2, 0.26, 0.08, 0x7c4a1e, 0, 0.16, R + 0.04, { ol: true })); head.add(S(0.1, 0x7c4a1e, 0, 0.29, R + 0.04, { sy: 0.9, sz: 0.4, ol: true })); head.add(S(0.02, 0xfbbf24, 0.05, 0.17, R + 0.095, { ol: false }));
    head.add(C(0.025, 0.025, 0.7, 0xe7e5e4, 0, 0.88, -0.08, 8)); head.add(S(0.06, 0xfbbf24, 0, 1.25, -0.08, { glow: 0.4 }));
    const flag = new THREE.Group(); flag.name = 'flag'; flag.position.set(0.03, 1.14, -0.08);
    for (let i = 0; i < 4; i++) flag.add(B(0.16, 0.42 - i * 0.04, 0.03, i % 2 ? 0xfbbf24 : 0xdc2626, 0.12 + i * 0.16, -0.21 + i * 0.02, 0));
    head.add(flag);
    for (const sd of [-1, 1]) { // spears leaning against the walls
      const sp = C(0.016, 0.016, 0.9, 0x8a5a2b, sd * 0.43, 0.5, -0.05, 6, { ol: false }); sp.rotation.z = -sd * 0.16; head.add(sp);
      head.add(cone(0.035, 0.12, 0xcbd5e1, sd * 0.43 + sd * 0.07, 1.0, -0.05, 6));
    }
    face = makeFace({ r: 0.125, gap: 0.15, iris: 0x1d4ed8, skin: def.color, mouth: 'none', bias: 0.2, body: { kind: 'cyl', R, cy: 0.31, y0: 0.5 } });
  } else if (type === 'mind') {
    // "Hipno": a round violet fortune-teller in a turban with a glowing jewel. A hypnotic spiral spins behind its head and stars circle around it;
    // its psychic waves make orcs hallucinate – they turn on their own friends.
    const R = 0.36, cy = 0.4;
    head.add(S(R, def.color, 0, cy, 0));
    head.add(S(0.19, 0xefd9ff, 0, 0.3, 0.22, { sy: 0.9, sz: 0.45, ol: false }));
    head.add(S(0.3, 0xf5e9ff, 0, 0.78, -0.01, { sy: 0.62 }));
    for (let k = 0; k < 2; k++) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.29 - k * 0.05, 0.065, 8, 22), toon(k ? 0xe9d5ff : 0xd8b4fe, 0.5, 0.12)); band.rotation.set(Math.PI / 2 - 0.25, 0, k * 0.6); band.position.y = 0.7 + k * 0.1; band.castShadow = true; head.add(band); }
    const jewel = shard(0.075, 0xf0abfc, 1.0); jewel.scale.y = 1.4; jewel.position.set(0, 0.8, 0.29); jewel.name = 'spin'; head.add(jewel);
    head.add(S(0.05, 0xfbbf24, 0, 0.74, 0.27, { glow: 0.3, ol: true }));
    const plume = S(0.05, 0xf9a8d4, 0.12, 1.02, -0.05, { sy: 3, sz: 0.4 }); plume.rotation.z = -0.3; head.add(plume);
    const spiral = new THREE.Mesh(new THREE.CircleGeometry(0.58, 32), new THREE.MeshBasicMaterial({ map: spiralTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    spiral.name = 'spiral'; spiral.position.set(0, 0.78, -0.42); head.add(spiral);
    for (const sd of [-1, 1]) { head.add(S(0.12, def.accent, sd * 0.36, 0.46, 0.04, { sy: 0.7 })); head.add(S(0.075, def.color, sd * 0.42, 0.52, 0.12)); }
    for (let i = 0; i < 3; i++) { const st = shard(0.055, 0xfde047, 1.0); st.name = 'orbit' + i; st.userData = { r: 0.58, y: 0.55, n: 3, spd: 1.8 }; head.add(st); }
    face = makeFace({ r: 0.125, gap: 0.15, iris: 0xc026d3, skin: def.color, mouth: 'smile', bias: 0.15, body: { R, cy, y0: 0.46 } });
  } else if (type === 'flame') {
    // "Blaze": fiery imp with flame mohawk, twin fuel canisters on back, and an authentic flamethrower nozzle snout
    const R = 0.37, cy = 0.38;
    head.add(S(R, def.color, 0, cy, 0));
    head.add(S(0.2, 0xfde68a, 0, 0.22, 0.27, { sy: 0.8, sz: 0.5, ol: false }));
    const tuft = makeFlame(0.42); tuft.position.set(0, 0.72, -0.02); head.add(tuft); flames.push(tuft);
    for (const sd of [-1, 1]) { const t2 = makeFlame(0.24); t2.position.set(sd * 0.15, 0.7, -0.04); head.add(t2); flames.push(t2); }
    const tail = cone(0.1, 0.34, def.accent, 0, 0.2, -0.45); tail.rotation.x = -Math.PI / 2; head.add(tail);

    // Twin pressurized fuel canisters strapped to the imp's back
    const canisterCol = 0xdc2626;
    for (const sd of [-1, 1]) {
      head.add(C(0.09, 0.09, 0.36, canisterCol, sd * 0.13, 0.38, -0.36, 12, { ol: true }));
      head.add(C(0.045, 0.045, 0.06, 0xd97706, sd * 0.13, 0.57, -0.36, 8)); // brass valve cap
      head.add(B(0.03, 0.07, 0.02, 0x475569, sd * 0.13, 0.61, -0.36)); // valve tap key
    }
    // harness bracket & pressure gauge
    head.add(B(0.36, 0.06, 0.06, 0x1e293b, 0, 0.38, -0.34, { ol: true }));
    const gauge = C(0.05, 0.05, 0.025, 0xfffbeb, 0, 0.5, -0.38, 12, { ol: true });
    gauge.rotation.x = Math.PI / 2; head.add(gauge);
    head.add(B(0.012, 0.035, 0.01, 0xef4444, 0, 0.51, -0.395)); // red meter needle

    // --- Flamethrower Nozzle Assembly ("Moncong Flamethrower") ---
    // 1. Heavy receiver collar & mounting manifold
    head.add(C(0.13, 0.145, 0.14, 0x1f242d, 0, 0.22, 0.36, 14).rotateX(Math.PI / 2));
    head.add(C(0.148, 0.148, 0.04, 0xd97706, 0, 0.22, 0.42, 14, { glow: 0.2 }).rotateX(Math.PI / 2));

    // 2. Main inner flame combustion tube
    head.add(C(0.08, 0.088, 0.54, 0x1f242d, 0, 0.22, 0.62, 14).rotateX(Math.PI / 2));

    // 3. Perforated ventilated heat shroud (barrel cooling jacket)
    head.add(C(0.115, 0.115, 0.32, 0x334155, 0, 0.22, 0.57, 14, { glow: 0.06 }).rotateX(Math.PI / 2));
    // Cooling collar rings with dark metal fittings
    head.add(C(0.125, 0.125, 0.03, 0x0f172a, 0, 0.22, 0.45, 14).rotateX(Math.PI / 2));
    head.add(C(0.125, 0.125, 0.03, 0x0f172a, 0, 0.22, 0.69, 14).rotateX(Math.PI / 2));
    // Longitudinal ventilation slots/perforations along the shroud
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      const vx = Math.cos(a) * 0.116, vy = 0.22 + Math.sin(a) * 0.116;
      const vent = B(0.026, 0.026, 0.22, 0x090d16, vx, vy, 0.57);
      vent.rotation.z = a;
      head.add(vent);
    }

    // 4. Flared conical burner nozzle (moncong corong pemancar api)
    head.add(C(0.145, 0.105, 0.12, 0x1e293b, 0, 0.22, 0.77, 14).rotateX(Math.PI / 2));
    // Heavy heat-scorched brass muzzle crown ring
    head.add(C(0.155, 0.155, 0.04, 0xb45309, 0, 0.22, 0.83, 14, { glow: 0.25 }).rotateX(Math.PI / 2));
    // Inner burner cavity orifice
    head.add(C(0.085, 0.085, 0.02, 0x09090b, 0, 0.22, 0.852, 14, { ol: false }).rotateX(Math.PI / 2));
    // Scorched burner lip glow ring
    head.add(tor(0.138, 0.016, 0xf97316, 0, 0.22, 0.84, { glow: 0.45 }));

    // 5. Over-barrel pilot igniter pipe & flickering pilot light
    head.add(C(0.022, 0.022, 0.44, 0xd97706, 0, 0.335, 0.63, 8).rotateX(Math.PI / 2));
    // Igniter mounting brackets
    head.add(B(0.04, 0.09, 0.035, 0x475569, 0, 0.28, 0.49));
    head.add(B(0.04, 0.09, 0.035, 0x475569, 0, 0.28, 0.71));
    // Pilot burner cup & spark electrode
    head.add(C(0.038, 0.024, 0.06, 0x9a3412, 0, 0.335, 0.84, 8).rotateX(Math.PI / 2));
    head.add(B(0.014, 0.035, 0.014, 0xfacc15, 0, 0.365, 0.85, { lit: true }));
    const pilot = makeFlame(0.12); pilot.position.set(0, 0.365, 0.86); pilot.name = 'pilot'; head.add(pilot); flames.push(pilot);

    // 6. Fuel feeder pipe & valve tap
    head.add(C(0.026, 0.026, 0.22, 0xd97706, 0, 0.13, 0.46, 8)); // pipe from below
    const valve = C(0.048, 0.048, 0.024, 0xdc2626, 0.14, 0.22, 0.46, 8); // red valve wheel on side
    valve.rotation.z = Math.PI / 2; head.add(valve);
    head.add(B(0.024, 0.075, 0.02, 0xffffff, 0.155, 0.22, 0.46)); // valve bar

    face = makeFace({ r: 0.125, gap: 0.15, iris: 0x7c2d12, skin: def.color, mouth: 'grin', bias: 0.4, body: { R, cy, y0: 0.52 } });
    muzzle = makeBlast(0.65, 0xfff3b0, 0xff9a1f, 0xff4a14); muzzle.position.set(0, 0.22, 0.88); head.add(muzzle);
  } else if (type === 'trap') {
    // "Chompy": toothy flytrap monster – googly eyes on stalks peek between jaws; jaws slam shut on orcs
    head.add(C(0.42, 0.46, 0.08, 0x57534e, 0, 0.04, 0, 14));
    head.add(B(0.16, 0.12, 0.5, 0x44403c, 0, 0.1, 0, { ol: true }));
    const mkJaw = (sd: number) => {
      const piv = new THREE.Group(); piv.position.set(sd * 0.08, 0.14, 0); piv.name = sd < 0 ? 'jawL' : 'jawR';
      piv.add(B(0.42, 0.1, 0.64, 0xbe123c, sd * 0.21, 0, 0, { ol: true }));
      piv.add(B(0.34, 0.02, 0.54, 0xfb7185, sd * 0.2, 0.06, 0));
      for (let i = 0; i < 5; i++) { const tooth = cone(0.05, 0.17, 0xffffff, sd * 0.4, 0.13, -0.24 + i * 0.12, 5); piv.add(tooth); }
      piv.rotation.z = sd * 0.3; return piv;
    };
    head.add(mkJaw(-1), mkJaw(1));
    for (const sd of [-1, 1]) head.add(C(0.028, 0.038, 0.34, 0x65a30d, sd * 0.085, 0.31, 0, 8, { ol: false }));
    const f = makeFace({ r: 0.105, gap: 0.085, iris: 0xa21caf, skin: 0x65a30d, mouth: 'none', cheeks: false, round: true });
    f.position.set(0, 0.5, 0); face = f;
  } else if (type === 'repair') {
    // "Mender": pink handy-bot with a yellow hard hat + headlamp, red-cross belly, hammer arm and a spinning gear
    const R = 0.36, cy = 0.38, sy = 0.95;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    head.add(B(0.2, 0.075, 0.04, 0xffffff, 0, 0.25, 0.33)); head.add(B(0.075, 0.2, 0.04, 0xffffff, 0, 0.25, 0.33));
    head.add(S(0.33, 0xfacc15, 0, 0.66, 0, { sy: 0.72 }));
    head.add(C(0.4, 0.4, 0.05, 0xfacc15, 0, 0.58, 0.02, 18));
    head.add(B(0.08, 0.06, 0.52, 0xf59e0b, 0, 0.9, 0));
    head.add(B(0.15, 0.1, 0.1, 0xfffbeb, 0, 0.7, 0.3, { lit: true }));
    const arm = new THREE.Group(); arm.name = 'hammer'; arm.position.set(0.4, 0.4, 0);
    arm.add(B(0.07, 0.46, 0.07, 0x8a5a3c, 0, 0.23, 0)); arm.add(B(0.28, 0.15, 0.15, 0x9ca3af, 0, 0.5, 0, { ol: true })); arm.rotation.x = -0.8; head.add(arm);
    const gear = new THREE.Group(); gear.name = 'gear'; gear.position.set(0, 0.42, -0.37); gear.add(C(0.15, 0.15, 0.05, 0x9ca3af, 0, 0, 0, 14).rotateX(Math.PI / 2));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; gear.add(B(0.06, 0.06, 0.05, 0x9ca3af, Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0)); }
    head.add(gear);
    face = makeFace({ r: 0.115, gap: 0.15, iris: 0xbe123c, skin: def.color, mouth: 'smile', body: { R, cy, sy, y0: 0.45 } });
  } else if (type === 'vortex') {
    // "Singulo": adorable cosmic void djinn with a swirling vortex funnel base, glowing cyan celestial belly,
    // astral crescent moon horns, and a giant spinning 4-armed galactic accretion wheel (spiral) behind its head!
    const R = 0.38, cy = 0.44;

    // 1. Swirling cosmic tornado funnel pedestal base (stepped concentric rings tapering down)
    head.add(C(0.18, 0.22, 0.08, 0x1e1b4b, 0, 0.06, 0, 16, { ol: true }));
    head.add(C(0.28, 0.32, 0.09, 0x312e81, 0, 0.15, 0, 18, { ol: true }));
    head.add(tor(0.34, 0.035, 0x38bdf8, 0, 0.22, 0, { rx: Math.PI / 2, glow: 0.85 }));

    // 2. Cosmic void spherical body & glowing stellar chest
    head.add(S(R, 0x1e1b4b, 0, cy, 0, { glow: 0.25 }));
    head.add(S(0.2, 0x38bdf8, 0, 0.32, 0.23, { sy: 0.85, sz: 0.45, glow: 0.9, ol: false }));
    head.add(tor(0.36, 0.03, 0x6366f1, 0, 0.28, 0, { rx: Math.PI / 2, glow: 0.6 }));
    const starBuckle = shard(0.065, 0xfde047, 1.2);
    starBuckle.position.set(0, 0.28, 0.38);
    head.add(starBuckle);

    // 3. The Iconic Showstopper: Giant spinning 4-armed Galactic Vortex Disc behind the head
    const galaxyWheel = new THREE.Mesh(
      new THREE.CircleGeometry(0.66, 36),
      new THREE.MeshBasicMaterial({ map: vortexTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    galaxyWheel.name = 'spiral'; // Automatically animated by engine, accelerates during target lock & firing!
    galaxyWheel.position.set(0, 0.65, -0.38);
    head.add(galaxyWheel);
    // Glowing neon cyan containment torus around the galaxy wheel
    head.add(tor(0.67, 0.03, 0x38bdf8, 0, 0.65, -0.38, { glow: 0.85 }));

    // 4. Astral Crescent Moon Horns Crown & Star Forehead Gem
    for (const sd of [-1, 1]) {
      const horn = cone(0.085, 0.36, 0x6366f1, sd * 0.28, 0.72, 0, 10);
      horn.rotation.z = -sd * 0.52;
      horn.rotation.x = -0.15;
      head.add(horn);
      head.add(tor(0.08, 0.02, 0x38bdf8, sd * 0.28, 0.72, 0, { rz: -sd * 0.52, glow: 0.8 }));
    }
    const crownStar = shard(0.08, 0xfde047, 1.4);
    crownStar.position.set(0, 0.78, 0.26);
    head.add(crownStar);

    // 5. Floating astral hands / shoulder orbs on the sides
    for (const sd of [-1, 1]) {
      head.add(S(0.11, 0x312e81, sd * 0.44, 0.44, 0.06, { ol: true }));
      head.add(S(0.06, 0x38bdf8, sd * 0.44, 0.36, 0.16, { glow: 0.8, ol: false }));
    }

    // 6. Orbiting cosmic void starlight motes
    for (let i = 0; i < 3; i++) {
      const st = shard(0.06, i % 2 === 0 ? 0xfde047 : 0x38bdf8, 1.2);
      st.name = 'orbit' + i;
      st.userData = { r: 0.62, y: 0.55, n: 3, spd: 2.2 };
      head.add(st);
    }

    // 7. Clear, adorable starry character face
    face = makeFace({ r: 0.125, gap: 0.15, iris: 0x38bdf8, skin: 0x1e1b4b, mouth: 'smile', bias: 0.12, cheeks: true, body: { R, cy, y0: 0.48 } });
    muzzle = makeBlast(0.48, 0xffffff, 0x818cf8, 0x38bdf8);
    muzzle.position.set(0, 0.72, 0.42);
    head.add(muzzle);
  } else if (type === 'meteor') {
    // "Krakatoa": magnificent volcanic mountain fortress & magma golem with dark basalt rock slopes,
    // glowing lava fissures, roaring summit caldera crater, twin side chimney vents, and a massive
    // burning meteorite asteroid suspended menacingly above!
    const R = 0.44;

    // 1. Heavy Volcanic Mountain Cone (dark charcoal obsidian basalt stone)
    head.add(C(0.48, 0.36, 0.62, 0x292524, 0, 0.31, 0, 16, { ol: true }));
    // Cascading incandescent magma veins and midriff lava belt
    head.add(tor(0.43, 0.04, 0xf97316, 0, 0.22, 0, { rx: Math.PI / 2, glow: 0.95 }));
    head.add(tor(0.39, 0.03, 0xef4444, 0, 0.42, 0, { rx: Math.PI / 2, glow: 0.85 }));

    // 2. Active Volcanic Caldera Summit: Jagged basalt rim, glowing magma lake, and roaring fire plume
    head.add(C(0.38, 0.32, 0.16, 0x1c1917, 0, 0.68, 0, 14, { ol: true }));
    head.add(tor(0.34, 0.04, 0xf97316, 0, 0.76, 0, { rx: Math.PI / 2, glow: 1.1 }));
    head.add(C(0.26, 0.26, 0.03, 0xfacc15, 0, 0.74, 0, 12, { glow: 1.4 }));
    const craterFlame = makeFlame(0.46);
    craterFlame.position.set(0, 0.82, 0);
    head.add(craterFlame);
    flames.push(craterFlame);

    // 3. The Iconic Signature: Giant Flaming Meteorite Asteroid hovering right above the caldera summit!
    const meteorAsteroid = new THREE.Group();
    meteorAsteroid.position.set(0, 1.12, 0);
    // Rough faceted charcoal asteroid rock
    const rockCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.21), toon(0x1c1917, 0.8, 0.2));
    rockCore.castShadow = true;
    meteorAsteroid.add(rockCore);
    // Glowing incandescent magma seams
    const rockLava = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16), toon(0xf97316, 0.2, 1.3));
    meteorAsteroid.add(rockLava);
    // Fiery tail plume
    const metFlame = makeFlame(0.28);
    metFlame.position.set(0, 0.16, 0);
    meteorAsteroid.add(metFlame);
    flames.push(metFlame);
    head.add(meteorAsteroid);

    // 4. Twin Volcanic Basalt Chimneys / Stone Shoulders on flanks with active smoking vents
    for (const sd of [-1, 1]) {
      const vent = C(0.11, 0.14, 0.36, 0x1c1917, sd * 0.44, 0.32, 0, 8, { ol: true });
      head.add(vent);
      head.add(tor(0.12, 0.025, 0xf97316, sd * 0.44, 0.49, 0, { rx: Math.PI / 2, glow: 0.9 }));
      const ventFl = makeFlame(0.18);
      ventFl.position.set(sd * 0.44, 0.52, 0);
      head.add(ventFl);
      flames.push(ventFl);
    }

    // 5. Orbiting fiery molten rock sparks / embers
    for (let i = 0; i < 3; i++) {
      const ember = S(0.065, i % 2 === 0 ? 0xfbbf24 : 0xf97316, 0, 0, 0, { glow: 1.2, ol: true });
      ember.name = 'orbit' + i;
      ember.userData = { r: 0.6, y: 0.54, n: 3, spd: 2.0 };
      head.add(ember);
    }

    // 6. Charming Tiki/Golem Magma Face carved directly into the basalt mountain slope
    face = makeFace({ r: 0.13, gap: 0.17, iris: 0xfacc15, skin: 0x292524, mouth: 'grin', bias: 0.18, cheeks: true, body: { kind: 'cyl', R, cy: 0.38, y0: 0.44 } });
    muzzle = makeBlast(0.65, 0xfff3b0, 0xf97316, 0xef4444, 'y');
    muzzle.position.set(0, 1.05, 0.2);
    head.add(muzzle);
  } else if (type === 'orbital') {
    // "Solaris": golden observatory with giant solar focus lens atop and solar collector dish
    const R = 0.37, cy = 0.38, sy = 0.95;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    head.add(C(0.42, 0.44, 0.1, def.accent, 0, 0.62, 0, 18, { glow: 0.3 }));
    const lensPiv = new THREE.Group(); lensPiv.name = 'spin'; lensPiv.position.set(0, 0.86, 0); head.add(lensPiv);
    lensPiv.add(C(0.28, 0.28, 0.06, 0xfef08a, 0, 0, 0, 20, { glow: 0.6 }));
    lensPiv.add(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 24), toon(0xd97706, 0.4, 0.5)));
    for (let i = 0; i < 4; i++) {
      const spk = cone(0.04, 0.14, 0xf59e0b, Math.cos(i * Math.PI / 2) * 0.32, 0, Math.sin(i * Math.PI / 2) * 0.32, 6); spk.rotation.z = Math.cos(i * Math.PI / 2) * 1.5; lensPiv.add(spk);
    }
    const dish = C(0.18, 0.08, 0.15, 0xca8a04, 0, 0.38, -0.38, 12); dish.rotation.x = -1.2; head.add(dish);
    face = makeFace({ r: 0.115, gap: 0.15, iris: 0x0284c7, skin: def.color, mouth: 'smile', bias: 0.1, body: { R, cy, sy, y0: 0.4 } });
  } else if (type === 'naga') {
    // "Draco": cute fierce voxel baby wyvern / dragon with wings, horns, snout, and glowing maw
    const R = 0.36, cy = 0.38, sy = 0.95;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    // dragon snout & lower jaw
    head.add(B(0.26, 0.16, 0.28, def.color, 0, 0.32, 0.36, { ol: true }));
    head.add(B(0.22, 0.08, 0.18, 0xf97316, 0, 0.22, 0.32));
    // nostrils
    head.add(S(0.035, 0x7f1d1d, -0.06, 0.38, 0.48));
    head.add(S(0.035, 0x7f1d1d, 0.06, 0.38, 0.48));
    // horns
    for (const sd of [-1, 1]) {
      const horn = cone(0.07, 0.32, 0xfacc15, sd * 0.24, 0.68, -0.08, 6);
      horn.rotation.z = -sd * 0.45; horn.rotation.x = -0.3; head.add(horn);
      const ear = cone(0.05, 0.18, def.accent, sd * 0.34, 0.46, 0.02, 5);
      ear.rotation.z = -sd * 0.8; head.add(ear);
    }
    // dragon wings
    for (const sd of [-1, 1]) {
      const wing = new THREE.Group(); wing.name = 'dWing' + (sd === -1 ? '0' : '1');
      wing.position.set(sd * 0.36, 0.42, -0.1);
      wing.add(B(0.05, 0.28, 0.05, def.accent, 0, 0.12, 0));
      wing.add(B(0.32, 0.22, 0.03, 0xfca5a5, sd * 0.16, 0.12, 0, { ol: true }));
      wing.rotation.y = sd * 0.35; wing.rotation.z = -sd * 0.2;
      head.add(wing);
    }
    // spine ridges
    for (let i = 0; i < 3; i++) {
      const spk = cone(0.04, 0.14, 0xfacc15, 0, 0.68 - i * 0.12, -0.26 - i * 0.08, 5);
      spk.rotation.x = -0.5; head.add(spk);
    }
    face = makeFace({ r: 0.12, gap: 0.16, iris: 0xf59e0b, skin: def.color, mouth: 'smile', bias: 0.2, body: { R, cy, sy, y0: 0.4 } });
  } else if (type === 'storm') {
    // "Thorin": storm obelisk wizard with thundercloud ring, lightning obelisks and glowing core
    const R = 0.36, cy = 0.38, sy = 0.95;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    // mystic storm cloud halo ring
    const cloud = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.11, 8, 20), toon(0x334155, 0.6, 0.1));
    cloud.rotation.x = Math.PI / 2; cloud.position.set(0, 0.72, 0); head.add(cloud);
    // lightning rods on the cloud
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const rod = cone(0.04, 0.24, 0x38bdf8, Math.cos(a) * 0.36, 0.82, Math.sin(a) * 0.36, 5);
      head.add(rod);
    }
    // floating storm crystal in center that spins
    const crys = shard(0.16, 0x67e8f9, 1.2); crys.name = 'spin';
    crys.position.set(0, 0.88, 0); head.add(crys);
    // orbiting electric spark orbs
    for (let i = 0; i < 3; i++) {
      const spk = S(0.06, 0x38bdf8, 0, 0, 0, { glow: 0.9, ol: true });
      spk.name = 'orbit' + i; spk.userData = { r: 0.52, y: 0.55, n: 3, spd: 3.2 };
      head.add(spk);
    }
    face = makeFace({ r: 0.115, gap: 0.15, iris: 0x0284c7, skin: def.color, mouth: 'smile', bias: 0.05, body: { R, cy, sy, y0: 0.4 } });
  } else if (type === 'catapult') {
    // "Trebby": siege catapult operator with sturdy oak A-frame beams, iron bands, winch gears, and a pivoted boulder-hurling spoon arm!
    const R = 0.36, cy = 0.36, sy = 0.94;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    // Wooden siege base collar & iron band
    head.add(C(0.4, 0.43, 0.12, def.accent, 0, 0.14, 0, 14, { ol: true }));
    head.add(B(0.56, 0.1, 0.44, 0x475569, 0, 0.58, -0.04, { ol: true }));
    // Twin oak A-frame side uprights & spinning winch wheels
    for (const sd of [-1, 1]) {
      const post = B(0.09, 0.56, 0.14, def.accent, sd * 0.34, 0.48, -0.04, { ol: true });
      post.rotation.x = 0.12;
      head.add(post);
      const brace = B(0.07, 0.44, 0.1, 0x92400e, sd * 0.34, 0.42, -0.2, { ol: true });
      brace.rotation.x = -0.45;
      head.add(brace);
      // Winch wheel on each flank
      const wheel = new THREE.Group();
      wheel.name = sd === 1 ? 'gear' : 'gearL';
      wheel.position.set(sd * 0.42, 0.34, -0.06);
      wheel.add(tor(0.14, 0.035, 0x78350f, 0, 0, 0, { ry: Math.PI / 2 }));
      wheel.add(B(0.04, 0.26, 0.04, 0x475569, 0, 0, 0));
      wheel.add(B(0.04, 0.04, 0.26, 0x475569, 0, 0, 0));
      head.add(wheel);
    }
    // Crossbar axle at top of A-frame
    const crossbar = C(0.045, 0.045, 0.78, 0x334155, 0, 0.68, -0.02, 10, { ol: true });
    crossbar.rotation.z = Math.PI / 2;
    head.add(crossbar);
    // Pivoted Catapult Throwing Arm + Spoon + Boulder
    const catArm = new THREE.Group();
    catArm.name = 'catArm';
    catArm.position.set(0, 0.68, -0.02);
    catArm.rotation.x = -0.35;
    // Long timber throwing beam
    catArm.add(B(0.11, 0.11, 0.86, 0xb45309, 0, 0.06, -0.22, { ol: true }));
    catArm.add(B(0.13, 0.13, 0.12, 0x475569, 0, 0.06, 0.08)); // counterweight iron collar
    // Heavy spoon / bucket at the back end of the arm
    catArm.add(C(0.24, 0.16, 0.14, 0x78350f, 0, 0.12, -0.58, 12, { ol: true }));
    catArm.add(tor(0.22, 0.03, 0x475569, 0, 0.17, -0.58, { rx: Math.PI / 2 }));
    // Faceted grey boulder sitting in the spoon (hidden briefly right after firing)
    const catRock = new THREE.Group();
    catRock.name = 'catRock';
    catRock.position.set(0, 0.26, -0.58);
    const rCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19), toon(0x78716c, 0.75, 0.05));
    rCore.castShadow = true;
    const rOl = new THREE.Mesh(rCore.geometry, OUTLINE_MAT); rOl.scale.setScalar(1.1); rCore.add(rOl);
    catRock.add(rCore);
    catRock.add(S(0.09, 0xa8a29e, 0.06, 0.07, 0.05, { ol: false }));
    catArm.add(catRock);
    head.add(catArm);

    face = makeFace({ r: 0.115, gap: 0.15, iris: 0x78350f, skin: def.color, mouth: 'grin', bias: 0.18, brows: 0x78350f, body: { R, cy, sy, y0: 0.36 } });
    muzzle = makeBlast(0.45, 0xfef3c7, 0xd97706, 0xa8a29e);
    muzzle.position.set(0, 1.08, 0.36);
    head.add(muzzle);
  } else if (type === 'aero') {
    // "Istana Megah Aero Hunter": Istana Kastil Megah Pemburu Bintang (Bukan Celengan!).
    // Megah dengan 4 menara sudut beratap kubah runcing, gerbang istana berpelengkung emas,
    // dinding benteng ber-merlon (crenellation), donjon utama, serta balkon & landasan terbang istana.
    // PENTING: Istana ini menancap kokoh pada tanah benteng (g) dan TIDAK IKUT BEROTASI!
    const palace = new THREE.Group();
    palace.name = 'mandalorianPalace';
    palace.position.y = 0.3;
    g.add(palace);

    // 1. Pelataran & Fondasi Megah Istana (Polished Beskar Stone Courtyard)
    palace.add(B(0.86, 0.22, 0.86, 0xe2e8f0, 0, 0.11, 0, { ol: true }));
    palace.add(B(0.92, 0.06, 0.92, 0xd97706, 0, 0.03, 0, { ol: true })); // royal gold plinth rim
    palace.add(tor(0.42, 0.025, 0x38bdf8, 0, 0.23, 0, { rx: Math.PI / 2, glow: 0.8 })); // magic conduit ring

    // 2. 4 Menara Sudut Istana (4 Grand Royal Castle Turrets & Spires)
    const corners = [
      [-0.36, -0.36],
      [0.36, -0.36],
      [-0.36, 0.36],
      [0.36, 0.36],
    ];
    for (const [cx, cz] of corners) {
      // Menara silinder batu perak Beskar
      palace.add(C(0.13, 0.14, 0.64, 0xf1f5f9, cx, 0.32, cz, 14, { ol: true }));
      // Cincin corbel emas / perunggu di leher menara
      palace.add(tor(0.14, 0.024, 0xd97706, cx, 0.62, cz, { rx: Math.PI / 2 }));

      // Mahkota benteng / Crenellated merlons di atas menara
      palace.add(C(0.15, 0.14, 0.08, 0xe2e8f0, cx, 0.66, cz, 12, { ol: true }));
      for (let m = 0; m < 4; m++) {
        const a = (m * Math.PI) / 2;
        palace.add(B(0.06, 0.06, 0.06, 0xd97706, cx + Math.cos(a) * 0.13, 0.72, cz + Math.sin(a) * 0.13, { ol: false }));
      }

      // Atap kubah kerucut runcing istana warna biru kerajaan (Royal Blue Palace Spire Cone)
      palace.add(cone(0.15, 0.36, 0x0284c7, cx, 0.86, cz, 12));
      // Mahkota puncak menara & Kristal plasma bercahaya
      palace.add(C(0.02, 0.02, 0.12, 0xd97706, cx, 1.06, cz, 8, { ol: false }));
      // Posisi kristal tepat di puncak menara sudut
      const crys = shard(0.045, 0x67e8f9, 1.6);
      crys.position.set(cx, 1.12, cz);
      palace.add(crys);
    }

    // 3. Tembok Pertahanan Istana Ber-merlon (Curtain Walls & Ramparts)
    // Dinding kiri & kanan
    palace.add(B(0.10, 0.44, 0.60, 0xe2e8f0, -0.36, 0.22, 0, { ol: true }));
    palace.add(B(0.10, 0.44, 0.60, 0xe2e8f0, 0.36, 0.22, 0, { ol: true }));
    // Dinding belakang
    palace.add(B(0.60, 0.44, 0.10, 0xe2e8f0, 0, 0.22, -0.36, { ol: true }));

    // Merlon / gerigi benteng istana di sepanjang tembok luar
    for (let i = -2; i <= 2; i++) {
      if (Math.abs(i) <= 1) {
        palace.add(B(0.07, 0.06, 0.05, 0xd97706, -0.38, 0.47, i * 0.13));
        palace.add(B(0.07, 0.06, 0.05, 0xd97706, 0.38, 0.47, i * 0.13));
        palace.add(B(0.05, 0.06, 0.07, 0xd97706, i * 0.13, 0.47, -0.38));
      }
    }

    // 4. Gerbang Keagungan Istana (Grand Arched Royal Palace Gatehouse)
    // Gapura pelengkung megah depan
    palace.add(B(0.42, 0.48, 0.16, 0xf1f5f9, 0, 0.24, 0.36, { ol: true }));
    // Pelengkung gapura kerajaan (Arched Portal Moulding)
    palace.add(tor(0.16, 0.03, 0xd97706, 0, 0.28, 0.44, { rz: Math.PI / 2 }));
    // Lorong gerbang istana bercahaya emas & sian di dalam
    palace.add(B(0.24, 0.30, 0.12, 0x0f172a, 0, 0.15, 0.42, { ol: false }));
    // Pintu kisi-kisi jeruji emas istana (Golden Royal Portcullis Grill)
    palace.add(B(0.22, 0.03, 0.04, 0xfbbf24, 0, 0.24, 0.43, { lit: true }));
    palace.add(B(0.03, 0.26, 0.04, 0xfbbf24, -0.06, 0.13, 0.43, { lit: true }));
    palace.add(B(0.03, 0.26, 0.04, 0xfbbf24, 0.06, 0.13, 0.43, { lit: true }));
    // Karpet merah / landasan peluncuran sian bercahaya keluar dari gerbang
    palace.add(B(0.18, 0.02, 0.26, 0x38bdf8, 0, 0.02, 0.44, { lit: true }));

    // 2 Spanduk Kerajaan (Royal Heraldry Banners) berkibar di kanan & kiri gerbang
    for (const sd of [-1, 1]) {
      const banner = new THREE.Group();
      banner.position.set(sd * 0.25, 0.32, 0.44);
      banner.add(B(0.09, 0.30, 0.03, 0x0284c7, 0, -0.06, 0, { ol: true })); // royal blue cloth
      banner.add(B(0.07, 0.05, 0.035, 0xfbbf24, 0, -0.04, 0)); // golden crest embroidery
      banner.add(B(0.11, 0.03, 0.04, 0xd97706, 0, 0.09, 0)); // hanging rod
      palace.add(banner);
    }

    // Perisai lambang keagungan istana di atas pelengkung gerbang
    const shieldEmblem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), toon(0xd97706, 0.3, 0.4));
    shieldEmblem.position.set(0, 0.44, 0.44);
    palace.add(shieldEmblem);
    const shieldStar = shard(0.04, 0x38bdf8, 1.5);
    shieldStar.position.set(0, 0.44, 0.47);
    palace.add(shieldStar);

    // 5. Donjon Utama & Balkon Keagungan Istana (Central Keep & Royal Flight Balcony)
    // Menara donjon utama menjulang di tengah
    palace.add(C(0.28, 0.32, 0.48, 0xf8fafc, 0, 0.48, 0, 16, { ol: true }));
    // Jendela-jendela istana melengkung dengan cahaya hangat di dalam
    for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
      const wx = Math.sin(a) * 0.28;
      const wz = Math.cos(a) * 0.28;
      palace.add(B(0.07, 0.13, 0.05, 0xfef08a, wx, 0.52, wz, { ry: a, lit: true }));
      palace.add(B(0.08, 0.02, 0.06, 0xd97706, wx, 0.45, wz, { ry: a }));
    }

    // Balkon & Landasan Terbang Istana di Atap Donjon (Royal Palace Flight Balcony)
    palace.add(C(0.36, 0.36, 0.07, 0xe2e8f0, 0, 0.72, 0, 18, { ol: true }));
    palace.add(tor(0.35, 0.025, 0xd97706, 0, 0.75, 0, { rx: Math.PI / 2 }));

    // Balustrade / pagar hias pembatas balkon istana
    for (let b = 0; b < 8; b++) {
      const ba = (b * Math.PI) / 4;
      palace.add(B(0.04, 0.07, 0.04, 0xd97706, Math.sin(ba) * 0.33, 0.79, Math.cos(ba) * 0.33));
    }

    // Mosaik lambang surya emas landasan pendaratan di lantai balkon
    palace.add(tor(0.22, 0.02, 0x38bdf8, 0, 0.76, 0, { rx: Math.PI / 2, glow: 1.0 }));
    palace.add(B(0.18, 0.015, 0.04, 0xfbbf24, 0, 0.765, 0, { lit: true }));
    palace.add(B(0.04, 0.015, 0.18, 0xfbbf24, 0, 0.765, 0, { lit: true }));

    // 6. Paviliun Kubah Keagungan & Menara Puncak Istana (Royal Imperial Spire & Banner)
    // Tiang-tiang kanopi paviliun di belakang balkon
    for (const [px, pz] of [[-0.16, -0.16], [0.16, -0.16]]) {
      palace.add(C(0.025, 0.025, 0.28, 0xd97706, px, 0.88, pz, 8, { ol: false }));
    }
    // Kubah menara istana utama menjulang tinggi di belakang
    const highSpire = new THREE.Group();
    highSpire.position.set(0, 0.88, -0.16);
    highSpire.add(C(0.14, 0.16, 0.24, 0xf1f5f9, 0, 0, 0, 12, { ol: true }));
    highSpire.add(cone(0.16, 0.44, 0x0284c7, 0, 0.30, 0, 12)); // Atap kubah biru kerajaan utama
    highSpire.add(C(0.02, 0.02, 0.26, 0xd97706, 0, 0.58, 0, 8, { ol: false })); // Tiang bendera istana
    // Bendera pataka istana berkibar (Royal Pennant Flag)
    highSpire.add(B(0.18, 0.09, 0.02, 0xfbbf24, 0.09, 0.62, 0, { lit: true }));
    // Bintang kristal keagungan istana di puncak tertinggi
    const starCrown = shard(0.065, 0x38bdf8, 1.8);
    starCrown.position.set(0, 0.74, 0);
    highSpire.add(starCrown);
    palace.add(highSpire);
  } else {
    // "Sir Bubbo": knight with a blue helmet & red plume, three orbiting shield plates and a protective dome
    const R = 0.37, cy = 0.38, sy = 0.95;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.43, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x0c4a6e, 0.45, 0.12)); hm.position.y = 0.42; hm.scale.y = 0.95; hm.castShadow = true;
    const hull = new THREE.Mesh(hm.geometry, OUTLINE_MAT); hull.scale.setScalar(1.07); hm.add(hull); head.add(hm);
    head.add(C(0.44, 0.44, 0.05, def.accent, 0, 0.42, 0, 18, { glow: 0.3 }));
    head.add(B(0.06, 0.1, 0.5, 0xfbbf24, 0, 0.86, 0, { ol: true })); head.add(B(0.07, 0.2, 0.34, 0xef4444, 0, 0.95, -0.1, { ol: true }));
    head.add(B(0.06, 0.18, 0.05, 0x0c4a6e, 0, 0.43, 0.39));
    for (let i = 0; i < 3; i++) {
      const pl = new THREE.Group(); pl.name = 'orbit' + i; pl.userData = { r: 0.62, y: 0.5, n: 3, spd: 1.6, faceOut: true };
      pl.add(B(0.26, 0.34, 0.05, 0xbae6fd, 0, 0, 0, { ol: true })); pl.add(B(0.1, 0.1, 0.06, 0xfbbf24, 0, 0, 0, { lit: true })); head.add(pl);
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    dome.name = 'dome'; dome.position.y = -0.3; dome.scale.setScalar((2.0 + 0.3 * (level - 1)) / sz); head.add(dome);
    face = makeFace({ r: 0.11, gap: 0.15, iris: 0x0369a1, skin: def.color, mouth: 'smile', bias: 0.25, body: { R, cy, sy, y0: 0.3 } });
  }

  if (face) { head.add(face); head.userData.face = face; }
  g.add(head);
  return { group: g, head, muzzle, beam, beamGlow };
}
