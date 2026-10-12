import * as THREE from 'three';
import { BIOMES } from './world';
import { ENEMY_DEFS, TOWER_DEFS } from './engine';
import type { TowerType } from './engine';
import { buildTowerModel } from './towers';
import { buildOrc, poseOrc, M, S, cap, cyl, cone, tor, box, newSkin, orcArm } from './orcs';
import type { OrcKind } from './orcs';
import { buildElite, poseElite, isElite } from './elites';
import type { EliteKind } from './elites';
import { SPH, BOX, OUTLINE_MAT, makeFace, makeFlame } from './voxel';

/**
 * Menu artwork – every pixel is rendered from the game's OWN 3D assets:
 *   backdrop : cinematic 16:9 hero shot of the Voxel Kingdom — turquoise river canyon & waterfall,
 *              floating voxel islands, grand stone Castle Keep with royal blue crown banner & red skull flag,
 *              winding torch-lit road with marching orcs, and lush stepped voxel cliffs.
 *   hero     : foreground green Legionnaire Orc mascot (red-crested helmet, spear, wooden skull shield) on cliff outcrop.
 *   airship  : red pirate/orc blimp airship with white skull emblem, rear propeller, and wooden gondola.
 *   brute    : foreground horned Viking Orc champion with broadsword & battle staff.
 */
export interface MenuArt {
  backdrop: string;
  hero: string;
  brute: string;
  airship: string;
  dragon: string;
  ready: boolean;
}

export type MenuArtKey = 'hero' | 'brute' | 'airship' | 'dragon';

const ART: MenuArt = { backdrop: '', hero: '', brute: '', airship: '', dragon: '', ready: false };
let pending: Promise<MenuArt> | null = null;

export function loadMenuArt(): Promise<MenuArt> {
  if (ART.ready) return Promise.resolve(ART);
  if (!pending) pending = new Promise<MenuArt>(resolve => {
    const run = () => {
      try { renderAll(); } catch (err) { console.error(err); }
      resolve(ART);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(run, 20));
    else setTimeout(run, 20);
  });
  return pending;
}

function disposeTree(root: THREE.Object3D) {
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[];
      (Array.isArray(mat) ? mat : [mat]).forEach(x => x?.dispose?.());
    }
  });
}

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rich cerulean-to-sky-blue canvas backdrop with diagonal sunbeams and soft fluffy horizon clouds */
function makeHeroSkyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d')!;

  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#1877f2');
  gr.addColorStop(0.32, '#3ba1ff');
  gr.addColorStop(0.68, '#8be0ff');
  gr.addColorStop(1, '#dff7ff');
  g.fillStyle = gr;
  g.fillRect(0, 0, 1024, 512);

  // subtle diagonal sun rays radiating from upper center-right
  g.save();
  g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 9; i++) {
    const x0 = 540 + (i - 4) * 95;
    const w = 36 + (i % 3) * 22;
    const rayGrad = g.createLinearGradient(x0, 0, x0 - 180, 420);
    rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    rayGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.08)');
    rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = rayGrad;
    g.beginPath();
    g.moveTo(x0, 0);
    g.lineTo(x0 + w, 0);
    g.lineTo(x0 - 220 + w * 2.2, 512);
    g.lineTo(x0 - 220, 512);
    g.closePath();
    g.fill();
  }
  g.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Builds a blocky stepped voxel cliff block with lush green grass cap and brown/stone strata */
function buildVoxelCliff(w: number, h: number, d: number, rng: () => number, grassHex = 0x5cd63b, dirtHex = 0x9c6635, rockHex = 0x6f687a) {
  const g = new THREE.Group();
  const grassM = new THREE.MeshStandardMaterial({ color: grassHex, roughness: 0.85 });
  const grassRimM = new THREE.MeshStandardMaterial({ color: 0x3eb027, roughness: 0.88 });
  const dirtM = new THREE.MeshStandardMaterial({ color: dirtHex, roughness: 0.95 });
  const dirtDarkM = new THREE.MeshStandardMaterial({ color: 0x7a4c24, roughness: 0.98 });
  const rockM = new THREE.MeshStandardMaterial({ color: rockHex, roughness: 0.95 });

  // Top grass slab
  const capH = 0.42;
  const top = new THREE.Mesh(BOX, grassM);
  top.scale.set(w, capH, d);
  top.position.y = -capH / 2;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  // Overhanging grass blocks along front/sides
  const steps = Math.max(3, Math.floor(w * 1.4));
  for (let i = 0; i < steps; i++) {
    const bw = (w / steps) * (0.85 + rng() * 0.35);
    const bh = 0.25 + rng() * 0.28;
    const bd = 0.35 + rng() * 0.3;
    const lip = new THREE.Mesh(BOX, i % 2 === 0 ? grassM : grassRimM);
    lip.scale.set(bw, bh, bd);
    lip.position.set(-w / 2 + (i + 0.5) * (w / steps), -capH - bh * 0.35, d / 2 - bd * 0.25);
    lip.castShadow = true;
    lip.receiveShadow = true;
    g.add(lip);
  }

  // Stepped dirt & rock body underneath
  const bodyM = new THREE.Mesh(BOX, dirtM);
  bodyM.scale.set(w * 0.94, h * 0.55, d * 0.94);
  bodyM.position.y = -capH - (h * 0.55) / 2;
  bodyM.castShadow = true;
  bodyM.receiveShadow = true;
  g.add(bodyM);

  const lowerM = new THREE.Mesh(BOX, dirtDarkM);
  lowerM.scale.set(w * 0.82, h * 0.45, d * 0.82);
  lowerM.position.y = -capH - h * 0.55 - (h * 0.45) / 2;
  lowerM.castShadow = true;
  lowerM.receiveShadow = true;
  g.add(lowerM);

  // Blocky voxel rock outcrops on the cliff face
  for (let k = 0; k < 6; k++) {
    const rw = 0.5 + rng() * 0.8, rh = 0.5 + rng() * 0.9, rd = 0.4 + rng() * 0.5;
    const rk = new THREE.Mesh(BOX, k % 2 ? rockM : dirtDarkM);
    rk.scale.set(rw, rh, rd);
    rk.position.set((rng() - 0.5) * w * 0.78, -capH - 0.5 - rng() * (h * 0.7), d * 0.42);
    rk.castShadow = true;
    rk.receiveShadow = true;
    g.add(rk);
  }
  return g;
}

/** Blocky voxel tree (stacked green cubes on a wooden trunk, matching the reference illustration) */
function buildVoxelTree(rng: () => number, scale = 1) {
  const g = new THREE.Group();
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x7c4d25, roughness: 0.9 });
  const leaf1 = new THREE.MeshStandardMaterial({ color: 0x5ce038, roughness: 0.8 });
  const leaf2 = new THREE.MeshStandardMaterial({ color: 0x3bb524, roughness: 0.85 });
  const leaf3 = new THREE.MeshStandardMaterial({ color: 0x84f24e, roughness: 0.78 });

  const trunk = new THREE.Mesh(BOX, trunkM);
  trunk.scale.set(0.32, 0.85, 0.32);
  trunk.position.y = 0.425;
  trunk.castShadow = true;
  g.add(trunk);

  const b1 = new THREE.Mesh(BOX, leaf2);
  b1.scale.set(1.25, 0.72, 1.25);
  b1.position.y = 1.05;
  b1.castShadow = true;
  b1.receiveShadow = true;
  g.add(b1);

  const b2 = new THREE.Mesh(BOX, leaf1);
  b2.scale.set(1.02, 0.68, 1.02);
  b2.position.set((rng() - 0.5) * 0.08, 1.62, (rng() - 0.5) * 0.08);
  b2.castShadow = true;
  b2.receiveShadow = true;
  g.add(b2);

  const b3 = new THREE.Mesh(BOX, leaf3);
  b3.scale.set(0.68, 0.48, 0.68);
  b3.position.set(0, 2.08, 0);
  b3.castShadow = true;
  g.add(b3);

  g.scale.setScalar(scale);
  return g;
}

/** Floating sky island with blocky voxel grass, tapered rocky underside, and tiny voxel trees */
function buildFloatingVoxelIsland(rng: () => number, scale = 1) {
  const g = new THREE.Group();
  const cliff = buildVoxelCliff(2.2, 1.6, 2.0, rng);
  g.add(cliff);

  const bot = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: 0x8a5830, roughness: 0.95 }));
  bot.scale.set(1.1, 0.8, 1.0);
  bot.position.y = -2.1;
  g.add(bot);

  const tip = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.98 }));
  tip.scale.set(0.55, 0.65, 0.55);
  tip.position.y = -2.65;
  g.add(tip);

  const t1 = buildVoxelTree(rng, 0.55);
  t1.position.set(-0.35, 0, 0.1);
  g.add(t1);
  if (rng() > 0.35) {
    const t2 = buildVoxelTree(rng, 0.4);
    t2.position.set(0.45, 0, -0.2);
    g.add(t2);
  }
  g.scale.setScalar(scale);
  return g;
}

/** Standing medieval torch with wooden post, dark iron brazier, and bright flickering flame */
function buildTorch(scale = 1) {
  const g = new THREE.Group();
  const wood = M(0x6b4219, 0.05, 0.85);
  const iron = M(0x27272a, 0.08, 0.45);
  const gold = M(0xf59e0b, 0.25, 0.35);

  g.add(cyl(0.065, 0.08, 0.9, wood, 0, 0.45, 0, { ol: true, cast: true }));
  g.add(cyl(0.16, 0.09, 0.18, iron, 0, 0.92, 0, { ol: true, cast: true }));
  g.add(tor(0.14, 0.025, gold, 0, 0.98, 0, { rx: Math.PI / 2 }));
  const fl = makeFlame(0.42);
  fl.position.y = 0.98;
  g.add(fl);
  g.scale.setScalar(scale);
  return g;
}

/** The grand stone Castle Keep on the right hill (crenellated stone tower, arched gate, blue crown banner, red skull banner, top red flag) */
function buildCastleKeep() {
  const g = new THREE.Group();
  const stoneLight = new THREE.MeshStandardMaterial({ color: 0xe5e0d8, roughness: 0.82 });
  const stoneMid = new THREE.MeshStandardMaterial({ color: 0xc8c2b8, roughness: 0.86 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x9b958b, roughness: 0.9 });
  const gateDark = new THREE.MeshStandardMaterial({ color: 0x1e2433, roughness: 0.95 });
  const blueBanner = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6, emissive: 0x1e3a8a, emissiveIntensity: 0.15 });
  const redBanner = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6, emissive: 0x991b1b, emissiveIntensity: 0.15 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.35, emissive: 0xf59e0b, emissiveIntensity: 0.25 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4219, roughness: 0.85 });

  // Lower base plinth
  const base = new THREE.Mesh(BOX, stoneMid);
  base.scale.set(3.4, 1.3, 3.0);
  base.position.y = 0.65;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  // Main tower shaft
  const shaft = new THREE.Mesh(BOX, stoneLight);
  shaft.scale.set(2.9, 3.6, 2.6);
  shaft.position.y = 2.8;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  g.add(shaft);

  // Stone brick accents on corners
  for (const sx of [-1, 1]) {
    for (let y = 0.6; y < 4.2; y += 0.65) {
      const quoins = new THREE.Mesh(BOX, stoneDark);
      quoins.scale.set(0.32, 0.34, 2.68);
      quoins.position.set(sx * 1.36, y, 0);
      g.add(quoins);
    }
  }

  // Overhanging upper parapet cornice
  const cornice = new THREE.Mesh(BOX, stoneMid);
  cornice.scale.set(3.45, 0.48, 3.1);
  cornice.position.y = 4.75;
  cornice.castShadow = true;
  g.add(cornice);

  // Battlement merlons around the top
  for (let i = -2; i <= 2; i++) {
    const mFront = new THREE.Mesh(BOX, stoneLight);
    mFront.scale.set(0.46, 0.52, 0.42);
    mFront.position.set(i * 0.68, 5.22, 1.32);
    mFront.castShadow = true;
    g.add(mFront);

    const mBack = mFront.clone();
    mBack.position.z = -1.32;
    g.add(mBack);
  }

  // Arched dark doorway at bottom front
  const doorRect = new THREE.Mesh(BOX, gateDark);
  doorRect.scale.set(1.05, 1.25, 0.35);
  doorRect.position.set(0.18, 0.62, 1.42);
  g.add(doorRect);
  const doorArch = new THREE.Mesh(SPH, gateDark);
  doorArch.scale.set(0.525, 0.52, 0.2);
  doorArch.position.set(0.18, 1.22, 1.42);
  g.add(doorArch);

  // Stone archway rim around the door
  const archRim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.14, 8, 18, Math.PI), stoneDark);
  archRim.position.set(0.18, 1.2, 1.48);
  g.add(archRim);

  // Royal BLUE banner with gold trim & crown on the front wall
  const bannerGroup = new THREE.Group();
  bannerGroup.position.set(0.05, 3.35, 1.36);
  g.add(bannerGroup);

  const bCloth = new THREE.Mesh(BOX, blueBanner);
  bCloth.scale.set(1.18, 1.55, 0.08);
  bCloth.castShadow = true;
  bannerGroup.add(bCloth);

  // Pointed bottom V of blue banner
  const bTip = new THREE.Mesh(new THREE.ConeGeometry(0.84, 0.65, 4), blueBanner);
  bTip.rotation.x = Math.PI;
  bTip.rotation.y = Math.PI / 4;
  bTip.scale.set(1, 1, 0.08);
  bTip.position.y = -1.08;
  bannerGroup.add(bTip);

  // Gold border & crown icon on blue banner
  for (const sx of [-1, 1]) {
    const trim = new THREE.Mesh(BOX, goldMat);
    trim.scale.set(0.08, 1.55, 0.1);
    trim.position.x = sx * 0.55;
    bannerGroup.add(trim);
  }
  const crownBase = new THREE.Mesh(BOX, goldMat);
  crownBase.scale.set(0.56, 0.22, 0.12);
  crownBase.position.set(0, -0.08, 0.04);
  bannerGroup.add(crownBase);
  for (const cx of [-0.2, 0, 0.2]) {
    const cSpike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 4), goldMat);
    cSpike.position.set(cx, 0.14, 0.04);
    bannerGroup.add(cSpike);
  }

  // RED skull banner hanging on wooden pole to the left of the castle gate
  const redStand = new THREE.Group();
  redStand.position.set(-1.35, 1.85, 1.65);
  g.add(redStand);
  const poleV = new THREE.Mesh(BOX, woodMat);
  poleV.scale.set(0.14, 2.2, 0.14);
  poleV.position.y = 0.2;
  redStand.add(poleV);
  const poleH = new THREE.Mesh(BOX, woodMat);
  poleH.scale.set(1.1, 0.12, 0.12);
  poleH.position.y = 1.15;
  redStand.add(poleH);
  const rCloth = new THREE.Mesh(BOX, redBanner);
  rCloth.scale.set(0.88, 1.15, 0.06);
  rCloth.position.set(0, 0.48, 0.04);
  redStand.add(rCloth);
  const rSkull = new THREE.Mesh(SPH, goldMat);
  rSkull.scale.set(0.24, 0.26, 0.08);
  rSkull.position.set(0, 0.56, 0.08);
  redStand.add(rSkull);

  // Tall flagpole on top of the castle flying a waving RED flag
  const roofPole = new THREE.Mesh(BOX, woodMat);
  roofPole.scale.set(0.1, 1.65, 0.1);
  roofPole.position.set(-0.65, 6.1, 0.4);
  g.add(roofPole);
  const roofBall = new THREE.Mesh(SPH, goldMat);
  roofBall.scale.setScalar(0.14);
  roofBall.position.set(-0.65, 6.95, 0.4);
  g.add(roofBall);
  const roofFlag = new THREE.Mesh(BOX, redBanner);
  roofFlag.scale.set(0.95, 0.52, 0.06);
  roofFlag.position.set(-1.15, 6.58, 0.4);
  g.add(roofFlag);

  return g;
}

/**
 * Builds the Hero Mascot on the left cliff:
 * Green Goblin/Orc Legionnaire with steel-and-gold helmet, tall crimson mohawk crest,
 * wide open battle grin with white fangs, raised spear in right hand, and round wooden skull shield in left hand!
 */
function buildHeroMascot(): { group: THREE.Group; size: number } {
  const root = new THREE.Group();
  const skinColor = 0x5ec92b;
  const skinMat = newSkin(skinColor);
  const darkSkin = M(0x3a8c18, 0.05, 0.65);
  const steel = M(0x8c9bb0, 0.15, 0.35);
  const gold = M(0xfbbf24, 0.28, 0.32);
  const red = M(0xdc2626, 0.18, 0.48);
  const leather = M(0x7c431e, 0.06, 0.7);
  const darkLeather = M(0x4a2610, 0.04, 0.8);
  const wood = M(0x9a5b25, 0.08, 0.68);
  const bone = M(0xfffbeb, 0.18, 0.4);

  // Voxel grassy cliff pedestal under the hero's feet
  const cliff = new THREE.Group();
  cliff.position.set(0, -0.02, 0);
  const grassTop = new THREE.Mesh(BOX, M(0x64dc35, 0.08, 0.8));
  grassTop.scale.set(1.85, 0.32, 1.45);
  grassTop.position.set(0, -0.16, 0);
  grassTop.castShadow = true;
  grassTop.receiveShadow = true;
  cliff.add(grassTop);
  const grassLip1 = new THREE.Mesh(BOX, M(0x48b823, 0.06, 0.85));
  grassLip1.scale.set(1.55, 0.26, 1.25);
  grassLip1.position.set(-0.08, -0.34, 0.12);
  cliff.add(grassLip1);
  const rockBase = new THREE.Mesh(BOX, M(0x9a6232, 0.04, 0.92));
  rockBase.scale.set(1.62, 0.55, 1.2);
  rockBase.position.set(0, -0.62, -0.04);
  cliff.add(rockBase);
  const rockSub = new THREE.Mesh(BOX, M(0x784922, 0.03, 0.95));
  rockSub.scale.set(1.28, 0.45, 0.95);
  rockSub.position.set(0.06, -0.98, -0.06);
  cliff.add(rockSub);
  root.add(cliff);

  // Stubby legs & boots
  for (const sd of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sd * 0.22, 0.34, 0);
    leg.rotation.z = -sd * 0.08;
    leg.add(cap(0.115, 0.18, skinMat, 0, -0.1, 0, { cast: true, ol: true }));
    leg.add(S(1, darkLeather, 0, -0.27, 0.06, { sx: 0.16, sy: 0.1, sz: 0.22, ol: true }));
    leg.add(tor(0.12, 0.024, gold, 0, -0.18, 0, { rx: Math.PI / 2 }));
    root.add(leg);
  }

  // Torso with leather harness, gold buckle, white tunic trim & brown/red skirt
  const body = new THREE.Group();
  body.position.y = 0.64;
  body.add(S(0.36, skinMat, 0, 0, 0, { sx: 1.08, sy: 0.95, sz: 0.92, cast: true, ol: true }));
  // White under-tunic & leather belt skirt
  body.add(cyl(0.31, 0.4, 0.22, bone, 0, -0.22, 0, { ol: true, cast: true }));
  body.add(cyl(0.32, 0.39, 0.16, leather, 0, -0.18, 0, { ol: true, cast: true }));
  body.add(tor(0.35, 0.042, darkLeather, 0, -0.14, 0, { rx: Math.PI / 2 }));
  body.add(box(0.16, 0.12, 0.06, gold, 0, -0.14, 0.34, { ol: true }));
  // Cross chest leather strap
  body.add(box(0.11, 0.56, 0.05, leather, -0.04, 0.05, 0.31, { rz: -0.62, ol: true }));
  body.add(box(0.11, 0.56, 0.05, leather, 0.04, 0.05, 0.31, { rz: 0.62, ol: true }));
  root.add(body);

  // Big expressive Goblin/Orc Head
  const head = new THREE.Group();
  head.position.set(0, 1.24, 0.04);
  head.rotation.set(0.04, 0.18, -0.04);
  head.add(S(0.48, skinMat, 0, 0, 0, { sx: 1.15, sy: 0.96, sz: 1.02, cast: true, ol: true }));

  // Big pointy floppy ears
  for (const sd of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sd * 0.5, 0.05, -0.02);
    ear.rotation.z = -sd * 1.18;
    ear.add(cone(0.15, 0.46, skinMat, 0, 0, 0, { sz: 0.45, ol: true }));
    ear.add(cone(0.09, 0.34, M(0x86efac), 0, 0.03, 0.03, { sz: 0.42 }));
    head.add(ear);
  }

  // Glossy eyes & thick brows
  const face = makeFace({
    r: 0.135,
    gap: 0.195,
    iris: 0x3b2314,
    skin: skinColor,
    mouth: 'none',
    cheeks: false,
    brows: 0x265314,
    bias: 0.25,
    body: { R: 0.49, cy: 0, sy: 0.96, y0: 0.05 },
  });
  head.add(face);
  // Upward-looking cheerful pupils
  const eyeRefs = face.userData.eyes as { pupil: THREE.Group }[];
  eyeRefs.forEach(e => { e.pupil.position.set(0.02, 0.015, 0.1); });

  // Wide open cheerful battle mouth with tongue & 4 white teeth/fangs (matching image.png!)
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.14, 0.44);
  const mouthCav = new THREE.Mesh(SPH, M(0x58131d, 0.05, 0.7));
  mouthCav.scale.set(0.24, 0.16, 0.1);
  mouthGroup.add(mouthCav);
  const mouthRim = new THREE.Mesh(SPH, OUTLINE_MAT);
  mouthRim.scale.set(0.26, 0.18, 0.11);
  mouthGroup.add(mouthRim);
  const tongue = new THREE.Mesh(SPH, M(0xf43f5e, 0.15, 0.5));
  tongue.scale.set(0.15, 0.08, 0.09);
  tongue.position.set(0, -0.05, 0.03);
  mouthGroup.add(tongue);
  // Upper & lower teeth/fangs
  for (const sd of [-1, 1]) {
    mouthGroup.add(cone(0.042, 0.1, bone, sd * 0.11, -0.12, 0.04, { rz: -sd * 0.08 }));
    mouthGroup.add(box(0.055, 0.045, 0.04, bone, sd * 0.06, 0.1, 0.04));
  }
  head.add(mouthGroup);

  // Cute button nose
  head.add(S(0.052, darkSkin, 0, -0.02, 0.49, { sx: 1.35, sy: 0.85, sz: 0.85 }));

  // Roman/Legion steel helmet with gold brow plate & tall RED mohawk crest
  const helm = new THREE.Group();
  helm.position.y = 0.24;
  const domeG = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const helmDome = new THREE.Mesh(domeG, steel);
  helmDome.scale.set(0.52, 0.36, 0.49);
  helmDome.castShadow = true;
  const helmOl = new THREE.Mesh(domeG, OUTLINE_MAT);
  helmOl.scale.setScalar(1.05);
  helmDome.add(helmOl);
  helm.add(helmDome);
  // Rim band + gold forehead plate
  helm.add(box(0.96, 0.11, 0.88, steel, 0, 0.02, 0, { ol: true }));
  helm.add(box(0.42, 0.18, 0.12, gold, 0, 0.06, 0.45, { ol: true }));
  helm.add(box(0.22, 0.08, 0.14, M(0xd97706), 0, 0.06, 0.47));
  // Tall red brush plume
  helm.add(box(0.18, 0.12, 0.54, gold, 0, 0.35, -0.04, { ol: true }));
  helm.add(box(0.22, 0.38, 0.62, red, 0, 0.56, -0.04, { ol: true, cast: true }));
  head.add(helm);
  root.add(head);

  // RIGHT ARM (viewer's left): raised proudly holding a tall spear!
  const armR = orcArm(skinMat);
  armR.scale.setScalar(1.18);
  armR.position.set(-0.42, 0.82, 0.06);
  armR.rotation.set(-0.45, 0.15, 0.75);
  armR.add(tor(0.1, 0.028, darkLeather, 0, -0.22, 0, { rx: Math.PI / 2 }));
  const spear = new THREE.Group();
  spear.position.set(-0.04, -0.28, 0.06);
  spear.rotation.set(0.38, 0, -0.52);
  spear.add(cyl(0.042, 0.045, 1.95, wood, 0, 0.35, 0, { ol: true, cast: true }));
  spear.add(cyl(0.058, 0.058, 0.12, steel, 0, 1.28, 0, { ol: true }));
  spear.add(cone(0.13, 0.42, M(0xdbe4f0, 0.2, 0.25), 0, 1.34, 0, { sz: 0.48, ol: true, cast: true }));
  armR.add(spear);
  root.add(armR);

  // LEFT ARM (viewer's right): holding the round wooden shield with white SKULL emblem!
  const armL = orcArm(skinMat);
  armL.scale.setScalar(1.15);
  armL.position.set(0.4, 0.78, 0.08);
  armL.rotation.set(-0.35, -0.25, -0.35);
  const shield = new THREE.Group();
  shield.position.set(0.16, -0.12, 0.24);
  shield.rotation.set(-0.08, -0.38, 0.05);
  // Wooden shield disc + rim
  shield.add(cyl(0.46, 0.46, 0.09, wood, 0, 0, 0, { rx: Math.PI / 2, seg: 24, ol: true, cast: true }));
  shield.add(tor(0.44, 0.048, M(0x783f12), 0, 0, 0.03, {}));
  // White skull emblem on the shield face
  shield.add(S(0.19, bone, 0, 0.05, 0.06, { sx: 1.05, sy: 1.0, sz: 0.35, ol: true }));
  shield.add(box(0.18, 0.12, 0.07, bone, 0, -0.11, 0.05, { ol: true }));
  for (const sx of [-1, 1]) {
    shield.add(S(0.052, M(0x27150a), sx * 0.075, 0.06, 0.11, { sz: 0.5 }));
  }
  for (const tx of [-0.05, 0, 0.05]) {
    shield.add(box(0.022, 0.055, 0.03, M(0x27150a), tx, -0.14, 0.09));
  }
  armL.add(shield);
  root.add(armL);

  return { group: root, size: 1 };
}

/**
 * Builds the Red Pirate/Orc Blimp Airship in the upper-left sky:
 * Horizontal red-and-cream envelope, white skull emblem on the side, rear 4-blade propeller,
 * and suspended wooden ship gondola underneath!
 */
function buildMenuAirship(): { group: THREE.Group; size: number } {
  const root = new THREE.Group();
  const red = M(0xef4444, 0.14, 0.5);
  const darkRed = M(0xb91c1c, 0.1, 0.55);
  const cream = M(0xfff7ed, 0.18, 0.5);
  const wood = M(0x9a5b25, 0.08, 0.7);
  const darkWood = M(0x6b3e18, 0.05, 0.8);
  const steel = M(0x94a3b8, 0.18, 0.35);
  const gold = M(0xfbbf24, 0.25, 0.35);

  // Blimp envelope (oriented along X axis, flying toward the right/center, widened horizontally)
  const env = new THREE.Group();
  env.position.y = 1.65;
  env.scale.setScalar(2.0);
  env.add(S(0.95, red, 0, 0, 0, { sx: 1.65, sy: 0.9, sz: 1.42, ol: true, cast: true }));
  // Cream nose cap & tail stripe
  env.add(S(0.55, cream, 1.18, 0, 0, { sx: 0.85, sy: 0.7, sz: 1.1, ol: true }));
  env.add(cyl(0.72, 0.54, 0.32, cream, -1.05, 0, 0, { rz: Math.PI / 2, seg: 20, ol: true }));
  env.add(S(0.14, gold, 1.62, 0, 0, { ol: true }));

  // White skull emblem on the side of the red envelope
  const skull = new THREE.Group();
  skull.position.set(0.22, 0.04, 1.25);
  skull.rotation.y = 0.12;
  skull.add(S(0.28, cream, 0, 0.06, 0, { sx: 1.05, sy: 1.0, sz: 0.28, ol: true }));
  skull.add(box(0.26, 0.16, 0.08, cream, 0, -0.16, 0, { ol: true }));
  for (const sx of [-1, 1]) {
    skull.add(S(0.075, darkRed, sx * 0.1, 0.06, 0.07, { sz: 0.4 }));
  }
  env.add(skull);

  // Rear propeller & tail fins at x = -1.55
  const propHub = new THREE.Group();
  propHub.position.set(-1.58, 0.06, 0);
  propHub.add(cyl(0.14, 0.18, 0.28, steel, 0, 0, 0, { rz: Math.PI / 2, ol: true }));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    const blade = box(0.08, 0.68, 0.18, steel, -0.08, Math.cos(a) * 0.38, Math.sin(a) * 0.38, { rx: a, ol: true });
    propHub.add(blade);
  }
  env.add(propHub);

  // Top & side tail fins
  env.add(box(0.48, 0.42, 0.08, darkRed, -1.22, 0.62, 0, { rz: 0.35, ol: true }));
  root.add(env);

  // Suspension ropes connecting envelope to wooden ship gondola
  for (const rx of [-0.75, 0, 0.75]) {
    for (const rz of [-0.48, 0.48]) {
      root.add(box(0.042, 1.35, 0.042, darkWood, rx, 0.45, rz, { rz: rx * -0.18 }));
    }
  }

  // Wooden ship gondola underneath
  const hull = new THREE.Group();
  hull.position.set(0, -0.25, 0);
  hull.add(box(1.75, 0.42, 0.76, wood, 0, 0, 0, { ol: true, cast: true }));
  hull.add(box(1.92, 0.12, 0.84, darkWood, 0, 0.22, 0, { ol: true }));
  hull.add(box(1.45, 0.22, 0.62, darkWood, 0, -0.26, 0, { ol: true }));
  // Porthole windows & side cannons/shields
  for (const px of [-0.48, 0, 0.48]) {
    hull.add(S(0.08, gold, px, 0.02, 0.4, { sz: 0.4, ol: true }));
  }
  root.add(hull);

  root.rotation.set(0.08, -0.32, -0.08);
  return { group: root, size: 1 };
}

/**
 * Builds the Foreground Horned Orc Warrior on the right cliff:
 * Iron helmet with big curved white horns, red/teal armor, open battle grin with fangs,
 * holding a broadsword and wooden battle staff!
 */
function buildRightChampion(): { group: THREE.Group; size: number } {
  const root = new THREE.Group();
  const def = ENEMY_DEFS.tank;
  const b = buildOrc('tank', def);
  poseOrc('tank', b.limbs, 0.8);
  const g = new THREE.Group();
  g.add(...b.parts);

  // Add a heroic steel broadsword in left hand and battle staff in right hand
  const steel = M(0xdbe4f0, 0.18, 0.3);
  const darkSteel = M(0x475569, 0.1, 0.4);
  const wood = M(0x7c431e, 0.06, 0.75);
  const gold = M(0xfbbf24, 0.25, 0.35);

  const sword = new THREE.Group();
  sword.position.set(0, -0.26, 0.08);
  sword.rotation.set(1.1, 0, -0.2);
  sword.add(cap(0.045, 0.16, wood, 0, 0.08, 0, { ol: true }));
  sword.add(box(0.36, 0.07, 0.1, darkSteel, 0, 0.2, 0, { ol: true }));
  sword.add(box(0.18, 0.62, 0.05, steel, 0, 0.54, 0, { ol: true, cast: true }));
  sword.add(cone(0.09, 0.2, steel, 0, 0.85, 0, { sz: 0.5, ol: true }));
  b.limbs.armL.add(sword);
  b.limbs.armL.rotation.set(-0.65, -0.2, -0.35);

  const staff = new THREE.Group();
  staff.position.set(0, -0.22, 0.06);
  staff.rotation.set(0.45, 0, 0.15);
  staff.add(cyl(0.045, 0.05, 1.55, wood, 0, 0.35, 0, { ol: true, cast: true }));
  staff.add(S(0.085, gold, 0, 1.15, 0, { ol: true }));
  b.limbs.armR.add(staff);
  b.limbs.armR.rotation.set(-0.45, 0.15, 0.25);

  // Open mouth with fangs
  const face = b.limbs.head.getObjectByName('face');
  if (face?.userData?.open) {
    face.userData.open.visible = true;
    if (face.userData.smile) face.userData.smile.visible = false;
  }

  g.rotation.y = -0.28;
  root.add(g);
  return { group: root, size: 1.15 };
}

function renderAll() {
  const rng = seeded(2026);
  const B = BIOMES[0];
  const RW = 1920, RH = 1080;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(RW, RH, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const sky = makeHeroSkyTexture();
  scene.background = sky;
  scene.fog = new THREE.FogExp2(0x9ee0ff, 0.0055);

  // Warm golden sunlight + sky hemisphere fill + rim light
  scene.add(new THREE.HemisphereLight(0xe0f4ff, 0x68c149, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4d6, 2.5);
  sun.position.set(-22, 36, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -28; sc.right = 28; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 120;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x88d4ff, 0.9);
  rim.position.set(18, 14, -20);
  scene.add(rim);

  // ---- 1. Puffy white 3D clouds across the sky & horizon
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, emissive: 0xdff4ff, emissiveIntensity: 0.32 });
  const cloudSpots: [number, number, number, number][] = [
    [-22, 6.5, -28, 2.4],
    [-12, 8.2, -32, 2.0],
    [14, 9.0, -34, 2.5],
    [24, 6.2, -26, 2.1],
    [-28, 1.5, -24, 1.9],
    [0, 2.2, -36, 2.6],
  ];
  cloudSpots.forEach(([cx, cy, cz, cs]) => {
    const cg = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(SPH, cloudMat);
      const r = (0.85 + rng() * 0.65) * cs;
      m.scale.set(r * 1.35, r * 0.78, r * 0.9);
      m.position.set((k - 2) * cs * 0.75, Math.sin(k * 1.3) * 0.35 * cs, (rng() - 0.5) * 0.5);
      cg.add(m);
    }
    cg.position.set(cx, cy, cz);
    scene.add(cg);
  });

  // ---- 2. Floating Voxel Islands in the sky (upper-left, mid-left, upper-right)
  const floatSpots: [number, number, number, number][] = [
    [-7.5, 6.6, -16, 0.72],
    [-8.2, 1.2, -18, 0.58],
    [13.8, 5.4, -19, 0.78],
    [-14.5, 3.8, -22, 0.65],
  ];
  floatSpots.forEach(([fx, fy, fz, fs]) => {
    const fi = buildFloatingVoxelIsland(rng, fs);
    fi.position.set(fx, fy, fz);
    fi.rotation.y = rng() * 1.2;
    scene.add(fi);
  });

  // ---- 3. Turquoise River Canyon & Voxel Waterfall in center-right
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1ca3ec, roughness: 0.25, metalness: 0.1, emissive: 0x0284c7, emissiveIntensity: 0.22 });
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xe0f7ff, transparent: true, opacity: 0.88 });
  const waterPlane = new THREE.Mesh(BOX, waterMat);
  waterPlane.scale.set(36, 0.4, 28);
  waterPlane.position.set(0, -4.4, -8);
  waterPlane.receiveShadow = true;
  scene.add(waterPlane);

  // Water ripples
  for (let i = 0; i < 14; i++) {
    const rp = new THREE.Mesh(BOX, foamMat);
    rp.scale.set(1.2 + rng() * 2.2, 0.05, 0.18 + rng() * 0.15);
    rp.position.set(-4 + (rng() - 0.5) * 10, -4.18, -12 + rng() * 12);
    scene.add(rp);
  }

  // Right Foreground Cliff Waterfall (cascading from the right island ledge into the river)
  const wfGroup = new THREE.Group();
  wfGroup.position.set(4.6, -2.3, 1.8);
  wfGroup.rotation.y = -0.35;
  scene.add(wfGroup);
  for (let s = 0; s < 5; s++) {
    const stream = new THREE.Mesh(BOX, s % 2 === 0 ? foamMat : waterMat);
    stream.scale.set(0.38, 4.2, 0.32);
    stream.position.set((s - 2) * 0.34, -0.6, 0);
    wfGroup.add(stream);
  }
  for (let m = 0; m < 9; m++) {
    const mist = new THREE.Mesh(SPH, foamMat);
    const ms = 0.25 + rng() * 0.32;
    mist.scale.setScalar(ms);
    mist.position.set((rng() - 0.5) * 2.0, -2.2 + rng() * 0.5, 0.25 + rng() * 0.4);
    wfGroup.add(mist);
  }

  // ---- 4. Left Side Stepped Voxel Hills, Trees & Campfire
  const leftHillBack = buildVoxelCliff(8.5, 4.2, 7.0, rng);
  leftHillBack.position.set(-10.5, -0.4, -7.5);
  leftHillBack.rotation.y = 0.22;
  scene.add(leftHillBack);

  const leftHillMid = buildVoxelCliff(6.2, 3.6, 5.5, rng);
  leftHillMid.position.set(-7.6, -1.6, -2.8);
  leftHillMid.rotation.y = 0.15;
  scene.add(leftHillMid);

  // Campfire on the left mid-terrace
  const campfire = makeFlame(0.65);
  campfire.position.set(-5.8, -1.55, -1.2);
  scene.add(campfire);

  // Left foreground cliff base (under the hero mascot)
  const leftForeCliff = buildVoxelCliff(6.5, 4.0, 5.2, rng);
  leftForeCliff.position.set(-6.4, -2.3, 2.6);
  leftForeCliff.rotation.y = 0.28;
  scene.add(leftForeCliff);

  // Left side voxel trees
  for (const [tx, ty, tz, ts] of [
    [-12.2, -0.4, -5.8, 1.35],
    [-9.8, -0.4, -6.4, 1.1],
    [-8.8, -1.6, -2.2, 0.95],
    [-5.2, -1.6, -2.4, 0.85],
  ] as const) {
    const tr = buildVoxelTree(rng, ts);
    tr.position.set(tx, ty, tz);
    scene.add(tr);
  }

  // ---- 5. Right Side Island, Castle Keep, Winding Torch Road & Marching Orcs
  const rightUpperHill = buildVoxelCliff(11.0, 5.2, 9.5, rng);
  rightUpperHill.position.set(8.6, 0.6, -8.8);
  rightUpperHill.rotation.y = -0.18;
  scene.add(rightUpperHill);

  const rightMidTerrace = buildVoxelCliff(8.5, 4.4, 7.2, rng);
  rightMidTerrace.position.set(6.8, -0.8, -3.2);
  rightMidTerrace.rotation.y = -0.12;
  scene.add(rightMidTerrace);

  const rightForeCliff = buildVoxelCliff(7.8, 4.5, 6.2, rng);
  rightForeCliff.position.set(6.2, -1.8, 2.2);
  rightForeCliff.rotation.y = -0.08;
  scene.add(rightForeCliff);

  // Castle Keep perched on the right upper hill
  const castle = buildCastleKeep();
  castle.position.set(7.2, 0.55, -7.2);
  castle.rotation.y = -0.28;
  castle.scale.setScalar(1.05);
  scene.add(castle);

  // Sandy stepped road winding from the castle door down to the right foreground cliff
  const roadMat = new THREE.MeshStandardMaterial({ color: 0xe7c888, roughness: 0.9 });
  const roadRimMat = new THREE.MeshStandardMaterial({ color: 0xc8a35c, roughness: 0.92 });
  const roadPoints: [number, number, number, number][] = [
    [7.2, 0.58, -5.2, 2.2],
    [7.5, 0.15, -3.6, 2.3],
    [7.4, -0.35, -2.0, 2.4],
    [6.9, -0.78, -0.5, 2.5],
    [6.4, -1.35, 1.0, 2.6],
    [6.0, -1.76, 2.4, 2.8],
  ];
  roadPoints.forEach(([rx, ry, rz, rw], idx) => {
    const slab = new THREE.Mesh(BOX, idx % 2 === 0 ? roadMat : roadRimMat);
    slab.scale.set(rw, 0.24, 1.85);
    slab.position.set(rx, ry, rz);
    slab.rotation.y = -0.22;
    slab.receiveShadow = true;
    scene.add(slab);
  });

  // Glowing torches lining both sides of the castle road
  const torchSpots: [number, number, number, number][] = [
    [5.6, 0.55, -5.0, 0.85],
    [8.7, 0.55, -4.6, 0.85],
    [5.2, -0.8, -1.2, 0.92],
    [8.5, -0.8, -0.8, 0.92],
    [4.4, -1.8, 1.8, 1.05],
  ];
  torchSpots.forEach(([tx, ty, tz, ts]) => {
    const t = buildTorch(ts);
    t.position.set(tx, ty, tz);
    scene.add(t);
  });

  // Voxel trees around the castle & right hills
  for (const [tx, ty, tz, ts] of [
    [11.2, 0.6, -6.5, 1.25],
    [9.8, -0.8, -2.2, 1.15],
    [11.5, -0.8, -0.5, 1.3],
    [9.2, -1.8, 1.5, 1.05],
    [4.2, 0.6, -6.8, 0.95],
  ] as const) {
    const tr = buildVoxelTree(rng, ts);
    tr.position.set(tx, ty, tz);
    scene.add(tr);
  }

  // Defending towers tucked on the mid-terrace
  const towerSpots: [TowerType, number, number, number][] = [
    ['cannon', 4.6, -0.8, -2.6],
    ['sniper', 9.2, 0.6, -5.4],
  ];
  towerSpots.forEach(([tt, tx, ty, tz]) => {
    if (!TOWER_DEFS[tt]) return;
    const tm = buildTowerModel(tt, 2, TOWER_DEFS[tt]);
    tm.group.position.set(tx, ty, tz);
    tm.group.scale.setScalar(0.78);
    scene.add(tm.group);
  });

  // Marching Orc Squad descending the castle road
  const squad: [OrcKind | EliteKind, number, number, number, number, number][] = [
    ['normal', 7.3, 0.7, -4.8, -0.25, 0.72],
    ['shield', 7.7, 0.25, -3.2, -0.18, 0.78],
    ['berserker', 7.1, -0.68, -0.8, -0.22, 0.85],
    ['tank', 5.3, -1.75, 1.9, 0.15, 0.92],
    ['fast', 6.1, -1.75, 2.3, -0.1, 0.82],
  ];
  squad.forEach(([kind, ox, oy, oz, rotY, sc], i) => {
    const def = ENEMY_DEFS[kind];
    const b = isElite(kind) ? buildElite(kind as EliteKind, def) : buildOrc(kind as OrcKind, def);
    const og = new THREE.Group();
    og.add(...b.parts);
    if (isElite(kind)) poseElite(kind as EliteKind, b.limbs, i * 1.4 + 0.5, 0.8);
    else poseOrc(kind as OrcKind, b.limbs, i * 1.4 + 0.5);
    og.scale.setScalar(def.size * sc);
    og.position.set(ox, oy, oz);
    og.rotation.y = rotY;
    scene.add(og);
  });

  // Camera framing the full panoramic valley
  const cam = new THREE.PerspectiveCamera(34, RW / RH, 0.5, 250);
  cam.position.set(0, 1.35, 13.5);
  cam.lookAt(new THREE.Vector3(0, 0.45, -4));
  cam.updateMatrixWorld(true);

  renderer.render(scene, cam);
  ART.backdrop = renderer.domElement.toDataURL('image/jpeg', 0.92);

  // ---- Transparent high-res 3D props rendered from the game's models
  ART.hero = renderGroupProp(renderer, 720, () => buildHeroMascot(), new THREE.Vector3(0, 0.18, 1), 28);
  ART.airship = renderGroupProp(renderer, 600, () => buildMenuAirship(), new THREE.Vector3(0.1, 0.12, 1), 28);
  ART.brute = renderGroupProp(renderer, 640, () => buildRightChampion(), new THREE.Vector3(-0.08, 0.2, 1), 28);
  ART.dragon = ART.airship;

  disposeTree(scene);
  sky.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  ART.ready = true;
  void B;
}

function renderGroupProp(
  renderer: THREE.WebGLRenderer,
  sizePx: number,
  make: () => { group: THREE.Group; size: number },
  camDir: THREE.Vector3,
  fov = 28
): string {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7cb8ff, 1.25));
  const key = new THREE.DirectionalLight(0xfff5dc, 2.55);
  key.position.set(3.5, 5.5, 5.0);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9be0ff, 1.1);
  fill.position.set(-4, 3, 2);
  scene.add(fill);

  const { group, size } = make();
  group.scale.setScalar(size);
  scene.add(group);
  group.updateMatrixWorld(true);

  const box3 = new THREE.Box3().setFromObject(group);
  const c = box3.getCenter(new THREE.Vector3());
  const sz = box3.getSize(new THREE.Vector3());
  const radius = Math.max(sz.y * 0.54, Math.max(sz.x, sz.z) * 0.56);
  const cam = new THREE.PerspectiveCamera(fov, 1, 0.1, 60);
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  cam.position.copy(c).addScaledVector(camDir.clone().normalize(), dist * 1.06);
  cam.lookAt(c);

  renderer.setSize(sizePx, sizePx, false);
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  disposeTree(scene);
  return url;
}
