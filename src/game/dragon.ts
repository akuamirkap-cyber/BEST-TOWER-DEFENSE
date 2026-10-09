import * as THREE from 'three';
import { makeFace } from './voxel';
import { M, S, cap, cone, box, newSkin, orcArm, pilotHead } from './orcs';

export interface DragonBuild { parts: THREE.Object3D[]; limbs: Record<string, THREE.Group>; skinMats: THREE.MeshStandardMaterial[]; hpY: number }

const WING_EDGE = new THREE.LineBasicMaterial({ color: 0x1b1030 });
const UP = new THREE.Vector3(0, 1, 0);

/**
 * A real bat-style wing, drawn flat in the XZ plane (u = outward, v = backward):
 * leading edge from the shoulder out to the wrist, three finger bones that fan out from the wrist,
 * and a membrane between them whose trailing edge is scalloped (curved inwards between the finger tips).
 */
function wingMembrane(sd: number) {
  const X = (u: number) => sd * u;
  const sh = new THREE.Shape();
  sh.moveTo(X(0), 0.05); sh.lineTo(X(0.3), 0.0); sh.lineTo(X(0.55), 0.0); sh.lineTo(X(1.22), -0.08); // shoulder -> wrist -> outer tip
  sh.quadraticCurveTo(X(0.9), 0.2, X(1.08), 0.5);   // scallop to the second tip
  sh.quadraticCurveTo(X(0.74), 0.38, X(0.66), 0.7); // scallop to the third tip
  sh.quadraticCurveTo(X(0.3), 0.42, X(0.08), 0.55); // scallop back to the body
  sh.lineTo(X(0), 0.05);
  const geo = new THREE.ShapeGeometry(sh, 12); geo.rotateX(-Math.PI / 2); // (x, y) -> (x, 0, -y): v points backwards
  const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(sh.getPoints(16).map(p => new THREE.Vector3(p.x, 0.012, -p.y))), WING_EDGE);
  return { geo, edge };
}

/**
 * Orc Dragon Rider: a cute round dragon (big glossy tower-style eyes, little horns, gold spikes, real bat wings)
 * with a goggled orc rider on its back. The dragon flies along the road and roasts towers with a stream of fire.
 * Every top-level piece is a separate "part" so the whole thing falls apart when it dies.
 */
export function buildDragon(def: { skin: number; cloth: number }): DragonBuild {
  const skin = newSkin(def.skin); const skinMats: THREE.MeshStandardMaterial[] = [skin];
  const gold = M(0xfbbf24, 0.25, 0.3), ivory = M(0xfff7e0), belly = M(0xffe6b0, 0.15), dark = M(0x2a1a3a, 0.05, 0.5);
  const membrane = new THREE.MeshStandardMaterial({ color: def.cloth, roughness: 0.5, emissive: def.cloth, emissiveIntensity: 0.18, side: THREE.DoubleSide });

  // ---------- body ----------
  const body = new THREE.Group();
  body.add(S(0.5, skin, 0, 0, 0, { sx: 0.95, sy: 0.85, sz: 1.22, cast: true, ol: true }));
  body.add(S(0.4, belly, 0, -0.14, 0.12, { sx: 0.8, sy: 0.6, sz: 1.0 }));
  for (const [z, y] of [[-0.5, 0.22], [-0.32, 0.34], [0.5, 0.22]] as [number, number][]) body.add(cone(0.1, 0.22, gold, 0, y, z, { ol: true }));

  // ---------- head (same glossy eyes as the towers; open mouth shows while breathing fire) ----------
  const head = new THREE.Group(); head.position.set(0, 0.3, 0.72);
  head.add(S(0.36, skin, 0, 0, 0, { sx: 1.05, sy: 0.95, cast: true, ol: true }));
  head.add(S(0.2, skin, 0, -0.1, 0.3, { sy: 0.78, sz: 0.9, ol: true }));
  for (const sd of [-1, 1]) {
    head.add(S(0.035, dark, sd * 0.07, -0.05, 0.49, {}));
    head.add(cone(0.07, 0.28, ivory, sd * 0.2, 0.26, -0.04, { rz: -sd * 0.45, ol: true }));
    head.add(cone(0.06, 0.18, gold, sd * 0.33, 0.04, -0.1, { rz: -sd * 1.25 }));
  }
  const mouthOpen = S(0.1, M(0x5b0f26), 0, -0.15, 0.44, { sy: 0.6, sz: 0.5 }); mouthOpen.name = 'mouthOpen'; mouthOpen.visible = false; head.add(mouthOpen);
  const mouth = new THREE.Object3D(); mouth.name = 'mouth'; mouth.position.set(0, -0.14, 0.52); head.add(mouth); // where the flame starts
  const face = makeFace({ r: 0.125, gap: 0.16, iris: 0xf59e0b, skin: def.skin, mouth: 'none', cheeks: true, brows: 0x7a2e12, body: { R: 0.37, cy: 0, sy: 0.95, y0: 0.07 } });
  head.add(face); skinMats.push((face.userData.eyes as { lid: THREE.Mesh }[])[0].lid.material as THREE.MeshStandardMaterial);

  // ---------- wings: bat wings with an arm bone, a golden wrist joint, three finger bones, claws and a scalloped membrane ----------
  const mkWing = (sd: number) => {
    const w = new THREE.Group(); w.position.set(sd * 0.38, 0.26, -0.06);           // the flapping hinge (shoulder)
    const inner = new THREE.Group(); inner.rotation.z = sd * 0.12; w.add(inner);   // slight upward tilt of the whole wing
    const { geo, edge } = wingMembrane(sd);
    const mem = new THREE.Mesh(geo, membrane); mem.castShadow = true; inner.add(mem); inner.add(edge);
    const P = (u: number, v: number) => new THREE.Vector3(sd * u, 0.02, -v);
    const bone = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
      const d = b.clone().sub(a); const len = d.length();
      const m = cap(r, Math.max(0.01, len - 2 * r), skin, 0, 0, 0, { cast: true, ol: true });
      m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); inner.add(m);
    };
    const S0 = P(0, 0.05), W = P(0.55, 0), T1 = P(1.22, -0.08), T2 = P(1.08, 0.5), T3 = P(0.66, 0.7);
    bone(S0, W, 0.055); bone(W, T1, 0.035); bone(W, T2, 0.03); bone(W, T3, 0.026);
    inner.add(S(0.075, gold, W.x, W.y, W.z, { ol: true }));
    for (const T of [T1, T2, T3]) { const c = cone(0.04, 0.14, ivory, T.x, T.y, T.z, { ol: true }); c.quaternion.setFromUnitVectors(UP, T.clone().sub(W).normalize()); inner.add(c); }
    const thumb = cone(0.045, 0.16, ivory, W.x, W.y + 0.02, W.z + 0.04, {}); thumb.rotation.x = Math.PI / 2; inner.add(thumb);
    return w;
  };
  const wingL = mkWing(-1), wingR = mkWing(1);

  // ---------- tail + legs ----------
  const tail = new THREE.Group(); tail.position.set(0, -0.04, -0.62);
  tail.add(S(0.26, skin, 0, 0, -0.18, { sz: 1.2, cast: true, ol: true }));
  tail.add(S(0.18, skin, 0, 0.02, -0.5, { sz: 1.2, ol: true }));
  tail.add(S(0.12, skin, 0, 0.06, -0.78, { ol: true }));
  tail.add(cone(0.14, 0.3, gold, 0, 0.06, -0.8, { rx: -Math.PI / 2, sz: 0.45, ol: true }));
  const legs = new THREE.Group();
  for (const [x, z] of [[-0.24, 0.3], [0.24, 0.3], [-0.22, -0.25], [0.22, -0.25]] as [number, number][]) {
    legs.add(S(0.12, skin, x, -0.4, z, { sy: 0.9, ol: true }));
    for (let k = -1; k <= 1; k++) legs.add(cone(0.025, 0.07, ivory, x + k * 0.05, -0.47, z + 0.1, { rx: 1.5 }));
  }

  // ---------- the orc rider: saddle, round body, aviator cap + goggles, arms holding the reins, little banner ----------
  const rSkin = M(0x6abe4a, 0.08, 0.55), rCloth = M(0x2563eb, 0.1, 0.5);
  const rider = new THREE.Group(); rider.position.set(0, 0.4, -0.02);
  rider.add(S(0.3, M(0x7c4a1e, 0.05, 0.6), 0, 0, 0, { sy: 0.35, sz: 1.15, ol: true }));
  rider.add(S(0.2, rCloth, 0, 0.2, 0, { sy: 1.1, cast: true, ol: true }));
  const ph = pilotHead({ skin: 0x6abe4a, cloth: 0x2563eb }, rSkin, []);
  ph.head.position.set(0, 0.58, 0.02); ph.head.scale.setScalar(0.62); rider.add(ph.head);
  for (const sd of [-1, 1]) {
    const a = orcArm(rSkin); a.position.set(sd * 0.2, 0.34, 0.05); a.rotation.set(-1.15, 0, sd * 0.2); rider.add(a);
    rider.add(S(0.09, rSkin, sd * 0.3, -0.06, 0.1, { ol: true }));
  }
  rider.add(cap(0.02, 0.6, M(0x6b4423, 0.05, 0.6), 0.24, 0.5, -0.26, {}));
  rider.add(box(0.3, 0.16, 0.02, M(0xfbbf24, 0.25, 0.3), 0.4, 0.74, -0.26, {}));

  const limbs: Record<string, THREE.Group> = {
    head, wingL, wingR, tail, body, face, face2: ph.face,
    armL: new THREE.Group(), armR: new THREE.Group(), legL: new THREE.Group(), legR: new THREE.Group(),
  };
  return { parts: [body, head, wingL, wingR, tail, legs, rider], limbs, skinMats, hpY: 1.7 };
}
