import * as THREE from 'three';
import { OUTLINE_MAT } from './voxel';

const SPH = new THREE.SphereGeometry(1, 10, 8);
const BOXG = new THREE.BoxGeometry(1, 1, 1);
const NEEDLE_SHAFT = new THREE.CylinderGeometry(0.014, 0.014, 0.34, 5);
const NEEDLE_TIP = new THREE.ConeGeometry(0.035, 0.1, 5);
const NEEDLE_GLOW = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6);
const STING = new THREE.ConeGeometry(0.02, 0.06, 5);
const mm = (c: number, e = 0.15) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, emissive: c, emissiveIntensity: e });
const YEL = mm(0xfde047, 0.3), BRN = mm(0x92400e, 0.1), WHITE = mm(0xffffff, 0.3);
const WING = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.3, transparent: true, opacity: 0.85, emissive: 0xe0f2fe, emissiveIntensity: 0.3, depthWrite: false });
const NEEDLE_M = new THREE.MeshBasicMaterial({ color: 0xf0fdf4 }), TIP_M = new THREE.MeshBasicMaterial({ color: 0xf9a8d4 });
const GLOW_M = new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.45, depthWrite: false });

/** a chubby little bee (yellow body, brown stripes, flapping wings) – faces +z */
export function makeBee() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(SPH, YEL); body.scale.set(0.085, 0.085, 0.12); g.add(body);
  for (const z of [-0.04, 0.04]) { const s = new THREE.Mesh(SPH, BRN); s.scale.set(0.088, 0.088, 0.022); s.position.z = z; g.add(s); }
  const st = new THREE.Mesh(STING, BRN); st.rotation.x = -Math.PI / 2; st.position.z = -0.14; g.add(st);
  for (const sd of [-1, 1]) {
    const w = new THREE.Mesh(SPH, WING); w.name = sd < 0 ? 'wingL' : 'wingR'; w.scale.set(0.09, 0.012, 0.06); w.position.set(sd * 0.06, 0.08, 0); g.add(w);
    const e = new THREE.Mesh(SPH, WHITE); e.scale.setScalar(0.028); e.position.set(sd * 0.036, 0.03, 0.098); g.add(e);
    const pu = new THREE.Mesh(SPH, BRN); pu.scale.setScalar(0.014); pu.position.set(sd * 0.036, 0.03, 0.122); g.add(pu);
  }
  return g;
}

/** a white cactus needle with a pink tip and a soft green glow – flies along +z */
export function makeNeedle() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(NEEDLE_SHAFT, NEEDLE_M); shaft.rotation.x = Math.PI / 2; g.add(shaft);
  const tip = new THREE.Mesh(NEEDLE_TIP, TIP_M); tip.rotation.x = Math.PI / 2; tip.position.z = 0.2; g.add(tip);
  const glow = new THREE.Mesh(NEEDLE_GLOW, GLOW_M); glow.rotation.x = Math.PI / 2; g.add(glow);
  return g;
}

// ---------- hearts (Amor) ----------
function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.35, -0.55, -0.1, -0.55, 0.2);
  s.bezierCurveTo(-0.55, 0.5, -0.2, 0.62, 0, 0.35);
  s.bezierCurveTo(0.2, 0.62, 0.55, 0.5, 0.55, 0.2);
  s.bezierCurveTo(0.55, -0.1, 0.15, -0.35, 0, -0.5);
  return s;
}
const HEART_GEO = (() => {
  const g = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.28, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.07, bevelSegments: 2, curveSegments: 14 });
  g.center(); return g;
})();

/** a glossy puffy heart (about 1.2 units wide – scale it down). Flat face looks along +z, the point is at -y. */
export function makeHeart(color = 0xf472b6, glow = 0.55) {
  const m = new THREE.Mesh(HEART_GEO, new THREE.MeshStandardMaterial({ color, roughness: 0.35, emissive: color, emissiveIntensity: glow }));
  m.castShadow = true;
  const ol = new THREE.Mesh(HEART_GEO, OUTLINE_MAT); ol.scale.setScalar(1.12); m.add(ol);
  return m;
}

/** a cupid arrow with a heart for a tip – flies along +z */
export function makeHeartArrow() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), mm(0xfde68a, 0.3)); shaft.rotation.x = Math.PI / 2; g.add(shaft);
  const tip = makeHeart(0xf472b6, 0.8); tip.scale.setScalar(0.17); tip.rotation.x = -Math.PI / 2; tip.position.z = 0.3; g.add(tip); // point of the heart leads
  for (const sd of [-1, 1]) { const f = new THREE.Mesh(BOXG, mm(0xfbcfe8, 0.3)); f.scale.set(0.09, 0.012, 0.12); f.position.set(sd * 0.04, 0, -0.2); f.rotation.z = sd * 0.5; g.add(f); }
  const glow = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0xf9a8d4, transparent: true, opacity: 0.35, depthWrite: false })); glow.scale.set(0.12, 0.12, 0.3); g.add(glow);
  return g;
}

/** a glossy bowling ball with finger holes and two white stripes (so you can see it spin) */
export function makeBowlingBall(color = 0x3b82f6) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(SPH, new THREE.MeshStandardMaterial({ color, roughness: 0.18, emissive: color, emissiveIntensity: 0.2 })); ball.scale.setScalar(0.2); ball.castShadow = true; g.add(ball);
  const ol = new THREE.Mesh(SPH, OUTLINE_MAT); ol.scale.setScalar(0.215); g.add(ol);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 6, 24), WHITE); ring1.rotation.x = Math.PI / 2; g.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 6, 24), WHITE); g.add(ring2);
  for (const [x, y, z] of [[0.25, 0.9, 0.35], [-0.25, 0.9, 0.35], [0, 0.82, -0.3]]) {
    const h = new THREE.Mesh(SPH, mm(0x1e3a8a, 0.1)); h.scale.setScalar(0.034); h.position.set(x, y, z).normalize().multiplyScalar(0.196); g.add(h);
  }
  return g;
}

/** a little steel fish hook (J shape with an eye and a barb) */
export function makeHook() {
  const g = new THREE.Group(); const steel = mm(0xe2e8f0, 0.35);
  const curve = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 14, Math.PI * 1.35), steel); curve.rotation.z = Math.PI; g.add(curve);
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 6), steel); shank.position.set(-0.09, 0.11, 0); g.add(shank);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 5, 10), steel); eye.position.set(-0.09, 0.26, 0); g.add(eye);
  const barb = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 5), steel); barb.position.set(0.041, 0.08, 0); barb.rotation.z = 1.1; g.add(barb);
  g.scale.setScalar(1.3);
  return g;
}
