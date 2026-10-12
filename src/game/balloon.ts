import * as THREE from 'three';
import { mkBox, mkCyl, mkSphere, makeFlame } from './voxel';
import { M, S, newSkin, orcArm, pilotHead } from './orcs';

export interface BalloonBuild {
  /** added to the enemy group */
  parts: THREE.Object3D[];
  /** thrown apart (as separate pieces) when the balloon dies */
  debris: THREE.Object3D[];
  limbs: Record<string, THREE.Group>;
  skinMats: THREE.MeshStandardMaterial[];
  hpY: number;
}

const PANELS = 10;
const PANEL_COLORS = [0xef4444, 0xfff7ed, 0xef4444, 0xfde047];

/** balloon envelope width scale (2.0x lebar ke samping) */
const BAL_W_SCALE = 2.0;
/** balloon envelope height scale (tetap kompak, tidak ditinggikan) */
const BAL_H_SCALE = 1.35;
/** height of the balloon centre above the basket – keeps the skirt at y ≈ 1.95 above the pilot's head */
const BAL_Y = 1.95 + 1.05 * BAL_H_SCALE;

/** teardrop silhouette of a wide, plump hot-air balloon (radius x width scale, height x height scale) */
function profile() {
  const ctrl = [
    [0.34, -1.0],
    [0.46, -0.8],
    [0.74, -0.42],
    [0.96, -0.02],
    [1.03, 0.4],
    [0.99, 0.8],
    [0.82, 1.15],
    [0.52, 1.42],
    [0.18, 1.58],
    [0.0, 1.62],
  ].map(([x, y]) => new THREE.Vector2(x * BAL_W_SCALE, y * BAL_H_SCALE));
  return new THREE.SplineCurve(ctrl).getPoints(30).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
}

function rope(a: THREE.Vector3, b: THREE.Vector3) {
  const len = a.distanceTo(b);
  const m = mkBox(0.028, 0.028, len, 0x6b4219);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize());
  m.castShadow = false;
  m.userData.light = true;
  return m;
}

/** a five-pointed golden star badge (a plain emblem – no face on the balloon) */
function starGeometry() {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.26 : 0.62;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: 0.1,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    bevelSegments: 1,
  });
  g.center();
  return g;
}

/**
 * Orc hot-air balloon: wide chubby gore envelope, golden star badge,
 * wide ropes, wicker basket with sandbags + gas tank, a cute goggled pilot orc and a swiveling rifle.
 */
export function buildBalloon(def: { skin: number; cloth: number }): BalloonBuild {
  const debris: THREE.Object3D[] = [];
  const skinMat = newSkin(def.skin);
  const skinMats: THREE.MeshStandardMaterial[] = [skinMat];

  // ---------- wicker basket ----------
  const basket = new THREE.Group();
  basket.name = 'basket';
  basket.add(mkBox(0.72, 0.46, 0.72, 0xb4783a, 0, 0.23, 0));
  for (const y of [0.1, 0.24, 0.38]) basket.add(mkBox(0.745, 0.05, 0.745, 0x8a5524, 0, y, 0));
  basket.add(mkBox(0.82, 0.09, 0.82, 0x6b4219, 0, 0.5, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) basket.add(mkBox(0.07, 0.64, 0.07, 0x6b4219, sx * 0.35, 0.32, sz * 0.35));
  for (const sx of [-1, 1]) {
    const bag = mkSphere(0.1, 0xd6c18a, sx * 0.46, 0.2, 0.12);
    bag.scale.y = 1.25;
    basket.add(bag);
    basket.add(mkBox(0.035, 0.1, 0.035, 0x6b4219, sx * 0.46, 0.34, 0.12));
  }
  basket.add(mkCyl(0.1, 0.1, 0.34, 0xdc2626, -0.2, 0.62, -0.2, 10));
  basket.add(mkCyl(0.04, 0.05, 0.06, 0x9ca3af, -0.2, 0.82, -0.2, 8));
  // pilot's round body in a coloured jacket (peeks out of the basket)
  basket.add(S(0.27, M(def.cloth, 0.1), 0, 0.68, -0.02, { sy: 0.9, ol: true, cast: true }));

  // ---------- rifle on a swivel (cyan scope light – no red) ----------
  const gun = new THREE.Group();
  gun.name = 'gun';
  gun.position.set(0, 0.66, 0.38);
  gun.add(mkCyl(0.045, 0.055, 0.95, 0x1f2937, 0, 0, 0.32, 10).rotateX(Math.PI / 2));
  gun.add(mkBox(0.14, 0.16, 0.34, 0x374151, 0, 0, -0.05));
  gun.add(mkBox(0.08, 0.18, 0.08, 0x111827, 0, -0.15, -0.02));
  gun.add(mkBox(0.1, 0.1, 0.22, 0x6b4219, 0, -0.03, -0.3));
  gun.add(mkCyl(0.05, 0.05, 0.22, 0x0f172a, 0, 0.12, 0.1, 8).rotateX(Math.PI / 2));
  gun.add(mkBox(0.05, 0.05, 0.04, 0x38bdf8, 0, 0.12, 0.23, 0x0ea5e9));
  gun.add(mkCyl(0.065, 0.065, 0.07, 0xfbbf24, 0, 0, 0.8, 10).rotateX(Math.PI / 2));
  basket.add(gun);

  // ---------- pilot orc: round head, aviator cap, tower-style eyes ----------
  const ph = pilotHead(def, skinMat, skinMats);
  const head = ph.head;
  head.position.set(0, 1.0, -0.04);
  head.scale.setScalar(0.85);

  const armL = orcArm(skinMat);
  armL.position.set(-0.3, 0.76, 0.1);
  armL.rotation.x = -1.2;
  const armR = orcArm(skinMat);
  armR.position.set(0.3, 0.76, 0.1);
  armR.rotation.x = -1.2;

  // ---------- envelope (10 separate gore panels, wide & chubby) ----------
  const bal = new THREE.Group();
  bal.name = 'balloon';
  bal.position.y = BAL_Y;
  const prof = profile();
  const dphi = (Math.PI * 2) / PANELS;
  for (let i = 0; i < PANELS; i++) {
    const c = PANEL_COLORS[i % 4];
    const m = new THREE.Mesh(
      new THREE.LatheGeometry(prof, 4, i * dphi, dphi),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, side: THREE.DoubleSide, emissive: c, emissiveIntensity: 0.1 })
    );
    m.castShadow = true;
    m.userData.az = i * dphi + dphi / 2;
    m.userData.light = true;
    bal.add(m);
    debris.push(m);
  }
  // a golden star badge on the front belly
  const star = new THREE.Mesh(
    starGeometry(),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.45, roughness: 0.35 })
  );
  star.position.set(0, 0.4 * BAL_H_SCALE, 1.02 * BAL_W_SCALE);
  star.castShadow = true;
  star.userData.light = true;
  bal.add(star);
  debris.push(star);

  // skirt, burner, pennant
  const skirt = mkCyl(0.36 * BAL_W_SCALE, 0.32 * BAL_W_SCALE, 0.1 * BAL_H_SCALE, 0x7f1d1d, 0, -1.04 * BAL_H_SCALE, 0, 14);
  skirt.userData.light = true;
  bal.add(skirt);
  debris.push(skirt);
  bal.add(mkCyl(0.12 * BAL_W_SCALE, 0.14 * BAL_W_SCALE, 0.1 * BAL_H_SCALE, 0x374151, 0, -1.18 * BAL_H_SCALE, 0, 8));
  const burner = makeFlame(0.42 * BAL_H_SCALE);
  burner.name = 'burner';
  burner.position.set(0, -1.26 * BAL_H_SCALE, 0);
  bal.add(burner);

  const pennant = new THREE.Group();
  pennant.userData.light = true;
  pennant.add(mkCyl(0.032, 0.032, 0.48 * BAL_H_SCALE, 0xe7e5e4, 0, 1.82 * BAL_H_SCALE, 0, 6));
  pennant.add(mkBox(0.65, 0.24 * BAL_H_SCALE, 0.03, 0xef4444, 0.35, 1.94 * BAL_H_SCALE, 0));
  bal.add(pennant);
  debris.push(pennant);

  // ---------- ropes: from basket corners up to the wide skirt of the envelope ----------
  const ropes: THREE.Object3D[] = [];
  const top = BAL_Y - 1.05 * BAL_H_SCALE;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      ropes.push(
        rope(
          new THREE.Vector3(sx * 0.35, 0.55, sz * 0.35),
          new THREE.Vector3(sx * 0.25 * BAL_W_SCALE, top, sz * 0.25 * BAL_W_SCALE)
        )
      );
    }
  }

  const parts: THREE.Object3D[] = [basket, head, armL, armR, bal, ...ropes];
  debris.unshift(basket, head, armL, armR);
  debris.push(...ropes);
  return {
    parts,
    debris,
    skinMats,
    limbs: { head, armL, armR, legL: new THREE.Group(), legR: new THREE.Group(), balloon: bal, gun, face: ph.face },
    hpY: BAL_Y + 1.85 * BAL_H_SCALE,
  };
}
