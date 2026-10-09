import * as THREE from 'three';
import type { TowerType } from './engine';
import { BOX, SPH, RING, OUTLINE_MAT, makeFace, makeFlame, makeBlast } from './voxel';
import { Bolt, MINI_STYLE } from './lightning';
import { makeHeart, makeBowlingBall } from './critters';

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
  cannon: { y: 0.26, f: 0.84 }, frost: { y: 1.08, f: 0 }, blaster: { y: 1.19, f: 0.34 }, tesla: { y: 1.36, f: 0 },
  sniper: { y: 0.42, f: 1.16 }, poison: { y: 0.74, f: 0.04 }, banner: { y: 0.6, f: 0 }, flame: { y: 0.23, f: 0.8 },
  trap: { y: 0.2, f: 0 }, repair: { y: 0.6, f: 0 }, shield: { y: 0.5, f: 0 }, plasma: { y: 0.2, f: 0.88 },
  piggy: { y: 0.6, f: 0 }, wind: { y: 0.4, f: 0 }, boomer: { y: 1.0, f: 0 }, mine: { y: 0.3, f: 0 },
  cactus: { y: 0.6, f: 0.36 }, hive: { y: 0.2, f: 0.4 }, golem: { y: 0.5, f: 0 }, clock: { y: 0.5, f: 0 },
  prism: { y: 1.12, f: 0.18 }, cupid: { y: 0.42, f: 0.46, x: 0.42 }, hook: { y: 1.2, f: 0.62, x: 0.58 }, bowl: { y: 0.3, f: 0.2, x: 0.38 },
  barracks: { y: 0.5, f: 0.3 }, mind: { y: 0.8, f: 0.29 },
};

export interface TowerModel { group: THREE.Group; head: THREE.Group; muzzle?: THREE.Object3D; beam?: THREE.Mesh; beamGlow?: THREE.Mesh }

const toon = (color: number, rough = 0.5, glow = 0.1) => new THREE.MeshStandardMaterial({ color, roughness: rough, emissive: color, emissiveIntensity: glow });

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
function B(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, o: { ol?: boolean; lit?: boolean } = {}) {
  const m = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color, roughness: 0.55, emissive: color, emissiveIntensity: o.lit ? 1 : 0.08 }));
  m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
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
    // "Bolo": round blue buddy, cannon barrel as its snout, little sailor cap with a fuse
    const R = 0.38, cy = 0.4;
    head.add(S(R, def.color, 0, cy, 0));
    head.add(S(0.2, 0xe3f0ff, 0, 0.22, 0.27, { sy: 0.8, sz: 0.5, ol: false }));
    head.add(S(0.31, def.accent, 0, 0.7, -0.02, { sy: 0.55 }));
    head.add(S(0.055, 0xfbbf24, 0, 0.855, -0.02));
    for (const sd of [-1, 1]) head.add(C(0.085, 0.085, 0.12, 0xfbbf24, sd * 0.4, 0.42, 0, 10).rotateZ(Math.PI / 2));
    head.add(C(0.1, 0.13, 0.52, 0x374151, 0, 0.26, 0.5, 12).rotateX(Math.PI / 2));
    head.add(C(0.155, 0.155, 0.07, 0xfbbf24, 0, 0.26, 0.77, 12).rotateX(Math.PI / 2));
    head.add(C(0.08, 0.08, 0.02, 0x0b0b12, 0, 0.26, 0.806, 12, { ol: false }).rotateX(Math.PI / 2));
    head.add(C(0.014, 0.014, 0.16, 0x9ca3af, 0, 0.93, -0.02, 6, { ol: false }));
    const fl = makeFlame(0.09); fl.position.set(0, 1.0, -0.02); head.add(fl); flames.push(fl);
    face = makeFace({ r: 0.13, gap: 0.16, iris: 0x1d4ed8, skin: def.color, mouth: 'none', body: { R, cy, y0: 0.55 } });
    muzzle = makeBlast(0.5); muzzle.position.set(0, 0.26, 0.82); head.add(muzzle);
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
    beam = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0xe0ffff, transparent: true, opacity: 0.9 })); beam.visible = false;
    beamGlow = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0x3fc9e8, transparent: true, opacity: 0.3 })); beamGlow.visible = false;
  } else if (type === 'blaster') {
    // "Boomy": squat orange bomb-buddy wearing a belt, mortar tube as a chimney hat with a lit fuse
    const R = 0.42, cy = 0.38, sy = 0.88;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.365, 0.05, 8, 22), toon(0xfbbf24, 0.4, 0.15)); belt.rotation.x = Math.PI / 2; belt.position.y = 0.2; belt.castShadow = true; head.add(belt);
    head.add(B(0.1, 0.1, 0.04, 0xfde68a, 0, 0.2, 0.375, { lit: true }));
    const pivot = new THREE.Group(); pivot.position.set(0, 0.62, -0.14); pivot.rotation.x = 0.7; head.add(pivot);
    pivot.add(C(0.17, 0.22, 0.7, 0x2d3340, 0, 0.35, 0, 12));
    pivot.add(C(0.24, 0.24, 0.06, 0xfbbf24, 0, 0.2, 0, 12));
    pivot.add(C(0.235, 0.235, 0.09, def.accent, 0, 0.7, 0, 12, { glow: 0.3 }));
    pivot.add(C(0.15, 0.15, 0.02, 0x07070c, 0, 0.745, 0, 12, { ol: false }));
    muzzle = makeBlast(0.65, 0xfff3b0, 0xffa11f, 0xff5a1a, 'y'); muzzle.position.set(0, 0.78, 0); pivot.add(muzzle);
    head.add(C(0.02, 0.02, 0.2, 0x9ca3af, 0, 0.7, -0.34, 6, { ol: false }));
    const fl = makeFlame(0.1); fl.position.set(0, 0.8, -0.34); head.add(fl); flames.push(fl);
    face = makeFace({ r: 0.13, gap: 0.17, iris: 0x7c2d12, skin: def.color, mouth: 'grin', body: { R, cy, sy, y0: 0.5 } });
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
    // "Buzzy": a honey-coloured beehive buddy with striped bands, wings, antennae and mini bees circling it – releases a swarm of homing bees
    const R = 0.4, cy = 0.4, sy = 0.95, brown = 0x92400e;
    head.add(S(R, def.color, 0, cy, 0, { sy }));
    for (const [y, rr] of [[0.2, 0.335], [0.6, 0.34]] as [number, number][]) { const band = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.04, 8, 24), toon(brown, 0.5, 0.1)); band.rotation.x = Math.PI / 2; band.position.y = y; band.castShadow = true; head.add(band); }
    head.add(S(0.1, 0x7c2d12, 0, 0.13, 0.36, { sy: 1.1, sz: 0.4, ol: false }));
    head.add(S(0.17, def.color, 0, 0.86, 0, { sy: 0.7 }));
    for (const sd of [-1, 1]) {
      head.add(C(0.012, 0.012, 0.22, brown, sd * 0.08, 1.03, 0, 6, { ol: false }).rotateZ(-sd * 0.4)); head.add(S(0.04, 0xfde047, sd * 0.13, 1.14, 0, { glow: 0.5, ol: false }));
      const wing = S(0.2, 0xe0f2fe, sd * 0.3, 0.62, -0.28, { sx: 0.3, sy: 0.9, sz: 0.55, ol: false, glow: 0.3 }); wing.name = 'hWing' + (sd < 0 ? 0 : 1); head.add(wing);
    }
    const sting = cone(0.05, 0.14, brown, 0, 0.34, -0.46, 6); sting.rotation.x = -Math.PI / 2; head.add(sting);
    for (let i = 0; i < 3; i++) { // mini bees orbiting the hive
      const b = new THREE.Group(); b.name = 'orbit' + i; b.userData = { r: 0.62, y: 0.7, n: 3, spd: 2.2 };
      b.add(S(0.06, 0xfde047, 0, 0, 0, { sz: 1.4, ol: false })); b.add(S(0.062, brown, 0, 0, -0.02, { sz: 0.35, ol: false }));
      b.add(S(0.05, 0xe0f2fe, -0.06, 0.05, 0, { sx: 0.5, sy: 0.3, ol: false })); b.add(S(0.05, 0xe0f2fe, 0.06, 0.05, 0, { sx: 0.5, sy: 0.3, ol: false })); head.add(b);
    }
    face = makeFace({ r: 0.12, gap: 0.15, iris: brown, skin: def.color, mouth: 'smile', body: { R, cy, sy, y0: 0.46 } });
  } else if (type === 'golem') {
    // "Rocky": a mossy rock golem with crystal sprouts; it raises its fists and slams the ground – the shockwave hurts and stuns every ground orc around it
    const R = 0.42, cy = 0.46, sy = 0.92;
    head.add(S(R, def.color, 0, cy, 0, { sy, sx: 1.05 }));
    head.add(S(0.3, 0x74c870, 0, 0.84, -0.04, { sx: 1.15, sy: 0.32 }));
    for (const [x, z, h] of [[-0.12, 0.0, 0.16], [0.1, -0.08, 0.2], [0.02, 0.1, 0.13]] as [number, number, number][]) head.add(cone(0.04, h, 0x4ade80, x, 0.9, z, 5));
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
    // "Chrono": a round alarm-clock buddy with golden bells and a real ticking dial; its aura slows every enemy (ground AND air) inside its range
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
    // "Blaze": fiery imp with a flame mohawk, permanently determined eyes and a flamethrower snout
    const R = 0.37, cy = 0.38;
    head.add(S(R, def.color, 0, cy, 0));
    head.add(S(0.2, 0xfde68a, 0, 0.22, 0.27, { sy: 0.8, sz: 0.5, ol: false }));
    const tuft = makeFlame(0.42); tuft.position.set(0, 0.72, -0.02); head.add(tuft); flames.push(tuft);
    for (const sd of [-1, 1]) { const t2 = makeFlame(0.24); t2.position.set(sd * 0.15, 0.7, -0.04); head.add(t2); flames.push(t2); }
    head.add(C(0.085, 0.13, 0.42, 0x374151, 0, 0.22, 0.5, 12).rotateX(Math.PI / 2));
    head.add(C(0.16, 0.16, 0.06, 0x9a3412, 0, 0.22, 0.72, 12).rotateX(Math.PI / 2));
    const pilot = makeFlame(0.1); pilot.position.set(0, 0.3, 0.74); pilot.name = 'pilot'; head.add(pilot); flames.push(pilot);
    const tail = cone(0.1, 0.34, def.accent, 0, 0.2, -0.45); tail.rotation.x = -Math.PI / 2; head.add(tail);
    face = makeFace({ r: 0.125, gap: 0.15, iris: 0x7c2d12, skin: def.color, mouth: 'grin', bias: 0.4, body: { R, cy, y0: 0.52 } });
    muzzle = makeBlast(0.6, 0xfff3b0, 0xff9a1f, 0xff4a14); muzzle.position.set(0, 0.23, 0.78); head.add(muzzle);
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
