import * as THREE from 'three';
import { makeFace, OUTLINE_MAT } from './voxel';
import { M, S, cap, cone, cyl, tor, box, orcArm } from './orcs';

/**
 * The little knights of the Barracks tower: round, chubby, cute – with the same glossy blinking eyes as the towers,
 * a steel helmet with a red plume, a round shield and a spear that they thrust at the orcs.
 * Model faces +z; `rig` holds everything (so a spear lunge can slide the whole body forward without moving the soldier itself).
 */
type Limbs = Record<string, THREE.Group>;
export interface KnightModel { group: THREE.Group; rig: THREE.Group; limbs: Limbs; face: THREE.Object3D }
export type KnightPhase = 'idle' | 'windup' | 'thrust' | 'recover';

const DOME = new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2);
function dome(mat: THREE.Material, rx: number, ry: number, rz: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(DOME, mat); m.scale.set(rx, ry, rz); m.position.set(x, y, z); m.castShadow = true;
  const h = new THREE.Mesh(DOME, OUTLINE_MAT); h.scale.setScalar(1 + 0.02 / ((rx + ry + rz) / 3)); m.add(h);
  return m;
}

export function makeKnight(tint: number, plumeColor: number): KnightModel {
  const skinC = 0xffd9b8;
  const skin = M(skinC, 0.1, 0.5), steel = M(0xcfd8e6, 0.15, 0.3), blue = M(tint, 0.14, 0.45), gold = M(0xfbbf24, 0.3, 0.3);
  const plume = M(plumeColor, 0.18, 0.5), dark = M(0x3b2f2f), wood = M(0x8a5a2b);
  const group = new THREE.Group(); const rig = new THREE.Group(); group.add(rig);

  // legs: steel greaves + round dark boots
  const mkLeg = (sd: number) => {
    const l = new THREE.Group(); l.position.set(sd * 0.13, 0.3, 0);
    l.add(cap(0.08, 0.1, steel, 0, -0.14, 0, { cast: true, ol: true }));
    l.add(S(1, dark, 0, -0.27, 0.06, { sx: 0.11, sy: 0.075, sz: 0.16, ol: true }));
    return l;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  // body: blue tabard over a steel breastplate, golden belt, round shield on the left
  const body = new THREE.Group(); body.position.y = 0.55;
  body.add(S(0.27, blue, 0, 0, 0, { sy: 0.95, sz: 0.9, cast: true, ol: true }));
  body.add(S(0.22, steel, 0, 0.03, 0.13, { sz: 0.58, ol: true }));
  body.add(S(0.05, gold, 0, 0.05, 0.27, { sz: 0.5 }));
  body.add(tor(0.255, 0.028, gold, 0, -0.12, 0, { rx: Math.PI / 2 }));
  body.add(cyl(0.24, 0.33, 0.16, blue, 0, -0.2, 0, { ol: true, cast: true }));
  const shield = new THREE.Group(); shield.position.set(-0.27, 0.0, 0.2); shield.rotation.y = 0.35; body.add(shield);
  shield.add(cyl(0.2, 0.2, 0.05, plume, 0, 0, 0, { rx: Math.PI / 2, ol: true, cast: true, seg: 20 }));
  shield.add(tor(0.2, 0.03, steel, 0, 0, 0.03, {})); shield.add(S(0.06, gold, 0, 0, 0.05, { sz: 0.6, ol: true }));
  shield.add(box(0.34, 0.05, 0.02, gold, 0, 0, 0.04)); shield.add(box(0.05, 0.34, 0.02, gold, 0, 0, 0.04));

  // arms
  const armL = orcArm(skin), armR = orcArm(skin); armL.position.set(-0.31, 0.7, 0); armR.position.set(0.31, 0.7, 0);

  // head: peach face with big tower-style eyes, steel helmet with a red plume and a golden brim
  const head = new THREE.Group(); head.position.y = 1.0;
  head.add(S(0.34, skin, 0, 0, 0, { sx: 1.05, cast: true, ol: true }));
  const face = makeFace({ r: 0.1, gap: 0.135, iris: 0x3b82f6, skin: skinC, mouth: 'smile', cheeks: true, body: { R: 0.35, cy: 0, sy: 1, y0: 0 } });
  head.add(face);
  head.add(S(0.04, M(0xf2b894), 0, -0.07, 0.34, { sx: 1.2, sy: 0.9, sz: 0.9 }));
  head.add(dome(steel, 0.385, 0.33, 0.385, 0, 0.17, 0)); head.add(tor(0.37, 0.03, gold, 0, 0.17, 0, { rx: Math.PI / 2 }));
  for (const sd of [-1, 1]) head.add(box(0.05, 0.16, 0.18, steel, sd * 0.35, 0.03, 0.0, { ol: true }));
  head.add(cap(0.06, 0.38, plume, 0, 0.5, -0.12, { rx: Math.PI / 2, ol: true })); head.add(cone(0.055, 0.16, plume, 0, 0.47, 0.1, {})); head.add(S(0.05, gold, 0, 0.5, 0.0, {}));

  // spear: wooden shaft, steel head, golden collar, small red pennant
  const spear = new THREE.Group(); spear.position.set(0, -0.3, 0.04); spear.rotation.x = 1.25; armR.add(spear);
  spear.add(cap(0.025, 1.15, wood, 0, 0.55, 0, { ol: true, cast: true })); spear.add(cone(0.05, 0.2, steel, 0, 1.15, 0, { ol: true }));
  spear.add(S(0.04, gold, 0, 1.08, 0, {})); spear.add(box(0.18, 0.1, 0.015, plume, 0.1, 0.98, 0, {}));

  rig.add(legL, legR, body, armL, armR, head);
  return { group, rig, limbs: { legL, legR, body, armL, armR, head, spear, shield, face }, face };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const e1 = (x: number) => x * x * (3 - 2 * x);

/** guard stance -> wind-up (spear drawn back) -> fast thrust with a lunge forward -> recover; legs swing while walking */
export function poseKnight(L: Limbs, rig: THREE.Group, ph: number, moving: boolean, phase: KnightPhase, k: number, time: number) {
  let ta = -1.0, sa = 1.25, lunge = 0;
  if (phase === 'windup') { const s = e1(k); ta = lerp(-1.0, -0.3, s); sa = lerp(1.25, 1.85, s); lunge = -0.06 * s; }
  else if (phase === 'thrust') { const s = k * k; ta = lerp(-0.3, -1.45, s); sa = lerp(1.85, 0.1, s); lunge = lerp(-0.06, 0.3, s); }
  else if (phase === 'recover') { const s = e1(k); ta = lerp(-1.45, -1.0, s); sa = lerp(0.1, 1.25, s); lunge = lerp(0.3, 0, s); }
  else ta = -1.0 + Math.sin(time * 1.6) * 0.04;
  L.armR.rotation.set(ta, 0, 0.1); L.spear.rotation.x = sa; rig.position.z = lunge;
  const sw = moving ? Math.sin(ph) * 0.8 : Math.sin(time * 1.3) * 0.04;
  L.legL.rotation.x = sw; L.legR.rotation.x = -sw;
  L.armL.rotation.set(-0.6 + (moving ? -Math.sin(ph) * 0.3 : Math.sin(time * 1.5) * 0.03), 0, -0.25);
  L.body.rotation.z = moving ? Math.sin(ph) * 0.05 : 0; L.body.scale.y = 1 + Math.sin(time * 2.2) * 0.02;
  L.head.rotation.z = moving ? Math.sin(ph * 0.5) * 0.06 : Math.sin(time * 0.9) * 0.03; L.head.rotation.x = phase === 'thrust' ? 0.1 : 0;
}
