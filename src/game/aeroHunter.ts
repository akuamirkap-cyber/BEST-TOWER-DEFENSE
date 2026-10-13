import * as THREE from 'three';
import { OUTLINE_MAT, BOX, SPH } from './voxel';

export interface AeroHunterModel {
  group: THREE.Group;
  rig: THREE.Group;
  limbs: Record<string, THREE.Group>;
  jetFlames: THREE.Object3D[];
  blasterMuzzle: THREE.Object3D;
  visor: THREE.Object3D;
}

const TOON_CACHE = new Map<number, THREE.MeshStandardMaterial>();
const toon = (color: number, rough = 0.35, glow = 0.08) => {
  const key = ((color & 0xffffff) << 8) ^ (Math.round(rough * 50) << 4) ^ Math.round(glow * 50);
  let m = TOON_CACHE.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      emissive: color,
      emissiveIntensity: glow,
    });
    TOON_CACHE.set(key, m);
  }
  return m;
};

function S(r: number, color: number, x = 0, y = 0, z = 0, o: { sx?: number; sy?: number; sz?: number; ol?: boolean; glow?: number; rough?: number } = {}) {
  const m = new THREE.Mesh(SPH, toon(color, o.rough ?? 0.35, o.glow ?? 0.08));
  m.scale.set(r * (o.sx ?? 1), r * (o.sy ?? 1), r * (o.sz ?? 1));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (o.ol !== false) {
    const h = new THREE.Mesh(SPH, OUTLINE_MAT);
    h.scale.setScalar(1.075);
    m.add(h);
  }
  return m;
}

function C(rt: number, rb: number, h: number, color: number, x = 0, y = 0, z = 0, seg = 14, o: { ol?: boolean; glow?: number; rx?: number; ry?: number; rz?: number; rough?: number } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), toon(color, o.rough ?? 0.35, o.glow ?? 0.08));
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = true;
  m.receiveShadow = true;
  if (o.ol !== false) {
    const h2 = new THREE.Mesh(m.geometry, OUTLINE_MAT);
    h2.scale.set(1.08, 1.03, 1.08);
    m.add(h2);
  }
  return m;
}

function B(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, o: { ol?: boolean; lit?: boolean; glow?: number; rx?: number; ry?: number; rz?: number; rough?: number } = {}) {
  const m = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({
    color,
    roughness: o.rough ?? 0.38,
    emissive: color,
    emissiveIntensity: o.lit ? 0.95 : o.glow ?? 0.08,
  }));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = true;
  m.receiveShadow = true;
  if (o.ol) {
    const h2 = new THREE.Mesh(BOX, OUTLINE_MAT);
    h2.scale.setScalar(1.10);
    m.add(h2);
  }
  return m;
}

function cone(r: number, h: number, color: number, x: number, y: number, z: number, seg = 10, glow = 0.2) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), toon(color, 0.3, glow));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function tor(r: number, tube: number, color: number, x = 0, y = 0, z = 0, o: { rx?: number; ry?: number; rz?: number; glow?: number; rough?: number } = {}) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 20), toon(color, o.rough ?? 0.35, o.glow ?? 0.12));
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = true;
  return m;
}

/**
 * Authentic "Destroyer" Mandalorian Helmet matching the user's reference image (Gambar 2):
 * - Top half-hemisphere Beskar dome terminating at brow line (cannot clip or bulge into face)
 * - Bold Royal Cobalt Blue center crest stripe over dome with white specular gloss streak on upper-left
 * - Dark horizontal dividing brow ridge
 * - Glossy pitch-black T-Visor with downward-tapered vertical stem
 * - Two crisp parallel diagonal white glossy glare slashes across the dark visor
 * - Royal Cobalt Blue angled cheek plates flanking the visor with deep navy inner chamfer bevels
 * - Light silver Beskar jawline and chin guard wrapping the bottom of the cheeks
 * - Symmetrical Royal Blue vertical ear stalks with sharp golden/yellow needle spikes pointing straight up
 * - Flared rear neck guard plate
 */
export function makeMandalorianHelmet(scale = 1): THREE.Group {
  const helmet = new THREE.Group();
  helmet.name = 'mandalorianHelmet';

  const beskar = 0xd1d7e0;
  const beskarLight = 0xf1f5f9;
  const outlineCol = 0x121620;
  const mandoBlue = 0x1d4ed8;
  const mandoBlueDark = 0x172554;
  const visorBlack = 0x10141d;
  const goldTip = 0xf59e0b;
  const goldTipLight = 0xfde047;

  // 1. Sleek Top Dome (True hemisphere terminating at brow line, cannot clip through face)
  const domeGeo = new THREE.SphereGeometry(0.40, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const dome = new THREE.Mesh(domeGeo, toon(beskar, 0.4));
  dome.position.set(0, 0.08, 0);
  const domeOl = new THREE.Mesh(domeGeo, OUTLINE_MAT);
  domeOl.scale.setScalar(1.075);
  dome.add(domeOl);
  helmet.add(dome);

  // 2. Bold Royal Cobalt Blue Center Mohawk Stripe (From Crown Apex down to Brow)
  // Arched band over top dome
  helmet.add(B(0.16, 0.04, 0.54, mandoBlue, 0, 0.42, -0.02, { ol: false }));
  // Front crest block running down to meet the brow
  helmet.add(B(0.16, 0.22, 0.12, mandoBlue, 0, 0.32, 0.23, { rx: 0.22, ol: false }));
  // Rear spine down back of dome
  helmet.add(B(0.16, 0.26, 0.04, mandoBlue, 0, 0.22, -0.36, { ol: false }));

  // --- WHITE SPECULAR HIGHLIGHT on top-left of the blue stripe (Matches Gambar 2!) ---
  helmet.add(B(0.045, 0.10, 0.04, 0xffffff, -0.045, 0.36, 0.25, { rx: 0.22, rz: 0.14, lit: true }));

  // 3. Horizontal Brow Ridge (Dividing Line across the forehead)
  helmet.add(B(0.48, 0.04, 0.12, outlineCol, 0, 0.09, 0.24));
  helmet.add(B(0.46, 0.03, 0.10, beskarLight, 0, 0.115, 0.25));

  // 4. Iconic Mandalorian T-Visor (Pitch-black charcoal with tapered vertical stem)
  // A. Horizontal Eye Visor (ear to ear below brow)
  helmet.add(B(0.42, 0.085, 0.10, visorBlack, 0, 0.04, 0.25, { ol: true }));

  // B. Tapered Vertical Visor Stem (Wider at nose, narrows into downward wedge)
  // Upper nose section
  helmet.add(B(0.12, 0.08, 0.10, visorBlack, 0, -0.03, 0.25));
  // Mid stem
  helmet.add(B(0.08, 0.10, 0.10, visorBlack, 0, -0.11, 0.23));
  // Lower stem / wedge point
  helmet.add(B(0.045, 0.10, 0.10, visorBlack, 0, -0.19, 0.21));

  // C. Two Diagonal White Gloss Visor Glare Slashes (Matches Gambar 2!)
  // Long diagonal glare slash across visor glass
  helmet.add(B(0.02, 0.26, 0.03, 0xffffff, 0.025, -0.05, 0.31, { rz: 0.62, rx: 0.18, lit: true }));
  // Shorter parallel diagonal glare slash
  helmet.add(B(0.016, 0.14, 0.03, 0xffffff, -0.06, 0.01, 0.31, { rz: 0.62, rx: 0.18, lit: true }));

  // 5. Royal Cobalt Blue Cheek Plates (Mandibular Chamfer Panels)
  for (const sd of [-1, 1]) {
    // Upper blue cheek plate right beneath horizontal visor
    helmet.add(B(0.14, 0.10, 0.10, mandoBlue, sd * 0.18, 0.035, 0.25, { ol: true }));

    // Lower angled blue cheek plate hugging the tapered vertical stem
    helmet.add(B(0.13, 0.18, 0.10, mandoBlue, sd * 0.16, -0.08, 0.23, {
      rx: 0.18,
      ry: sd * 0.25,
      rz: sd * -0.12,
      ol: true,
    }));

    // Inner deep navy chamfer shadow bevel along vertical stem
    helmet.add(B(0.05, 0.18, 0.08, mandoBlueDark, sd * 0.105, -0.07, 0.27, {
      rx: 0.16,
      ry: sd * 0.18,
      ol: false,
    }));

    // Outer angled blue mandibular wing
    helmet.add(B(0.09, 0.20, 0.09, mandoBlue, sd * 0.24, -0.06, 0.20, {
      rx: 0.14,
      ry: sd * 0.35,
      ol: true,
    }));
  }

  // 6. Silver Beskar Jaw & Tapered Chin Guard (Framing bottom of cheeks)
  for (const sd of [-1, 1]) {
    // Outer silver jaw contour
    helmet.add(B(0.08, 0.24, 0.10, beskar, sd * 0.32, -0.06, 0.17, {
      rx: 0.14,
      ry: sd * 0.34,
      ol: true,
    }));

    // Angled lower jaw leading into chin
    helmet.add(B(0.12, 0.10, 0.10, beskar, sd * 0.15, -0.21, 0.21, {
      rx: 0.25,
      ry: sd * 0.22,
      ol: true,
    }));
  }

  // Central tapered flat chin plate
  helmet.add(B(0.18, 0.08, 0.11, beskar, 0, -0.24, 0.21, { rx: 0.25, ol: true }));
  helmet.add(B(0.14, 0.025, 0.06, outlineCol, 0, -0.27, 0.21, { rx: 0.25 }));

  // 7. Symmetrical Royal Blue Ear Stalks with Golden Needle Spikes (Matches Gambar 2!)
  for (const sd of [-1, 1]) {
    const earGroup = new THREE.Group();
    earGroup.position.set(sd * 0.42, 0.04, 0.02);

    // Blue vertical stalk
    earGroup.add(B(0.065, 0.32, 0.12, mandoBlue, 0, 0, 0, { ol: true }));
    // Rear dark rib
    earGroup.add(B(0.045, 0.30, 0.04, outlineCol, 0, 0, -0.05));
    // Center com disc
    earGroup.add(C(0.04, 0.04, 0.02, beskar, sd * 0.035, 0.01, 0, 10, { rz: Math.PI / 2 }));

    // Golden ear cap base
    earGroup.add(B(0.068, 0.05, 0.10, goldTip, 0, 0.19, 0, { ol: false }));
    // Sharp golden cone spike pointing straight up!
    earGroup.add(cone(0.028, 0.16, goldTip, 0, 0.28, 0, 6, 0.4));
    // Pointy bright gold needle spire tip
    earGroup.add(cone(0.013, 0.08, goldTipLight, 0, 0.37, 0, 5, 0.7));

    // Bottom golden accent trim band
    earGroup.add(B(0.068, 0.03, 0.10, goldTip, 0, -0.15, 0));

    helmet.add(earGroup);
  }

  // 8. Flared Rear Neck Guard
  helmet.add(B(0.44, 0.18, 0.12, beskar, 0, -0.08, -0.26, { rx: -0.22, ol: true }));
  helmet.add(B(0.38, 0.04, 0.05, outlineCol, 0, -0.16, -0.28));

  if (scale !== 1) {
    helmet.scale.setScalar(scale);
  }

  return helmet;
}

/**
 * Creates the original "Aero Hunter" space bounty hunter character model.
 * Specially updated to user brief:
 * - Authentic "Destroyer" Mandalorian helmet matching reference image
 * - Huge chunky dual-rocket jetpack with flared booster bells and massive dynamic burst flames
 * - Chubby heroic chibi body with Beskar silver plating and warm leather belt
 * - Heavy plasma blaster carbine with visible hollow muzzle hole
 */
export function makeAeroHunter(tint = 0x38bdf8, accent = 0xd97706): AeroHunterModel {
  // --- High-contrast, iconic Beskar & Astronaut palette ---
  const beskar = 0xe2e8f0;       // shining polished Beskar silver-steel
  const beskarLight = 0xf8fafc;  // high-specular chrome highlight
  const beskarTrim = 0x94a3b8;   // brushed titanium trim
  const flightSuit = 0x334155;   // tactical deep slate-blue undersuit
  const leather = 0x78350f;      // rich warm leather belt & straps
  const darkCape = 0x1e293b;     // textured graphite combat half-cape
  const bronze = accent;         // cyber-bronze / gold trim (0xd97706)
  const cyanCore = tint;         // luminous cyan plasma energy (0x38bdf8)

  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);

  const limbs: Record<string, THREE.Group> = {};
  const jetFlames: THREE.Object3D[] = [];

  // ==================== LEGS (Chubby Beskar Armored Boots) ====================
  const mkLeg = (sd: number) => {
    const leg = new THREE.Group();
    leg.position.set(sd * 0.17, 0.30, 0);

    // Dark flightsuit thigh
    leg.add(C(0.10, 0.09, 0.18, flightSuit, 0, -0.06, 0, 12, { ol: true }));
    // Segmented Beskar silver thigh armor plate
    leg.add(B(0.13, 0.12, 0.06, beskar, 0, -0.05, 0.08, { ol: false }));

    // Reinforced bronze/gold knee guard
    leg.add(B(0.15, 0.09, 0.10, bronze, 0, -0.14, 0.07, { ol: true }));
    leg.add(B(0.04, 0.03, 0.04, beskarLight, 0, -0.14, 0.12, { ol: false }));

    // Gleaming silver greave
    leg.add(C(0.10, 0.11, 0.18, beskar, 0, -0.23, 0, 12, { ol: true }));
    leg.add(B(0.08, 0.14, 0.04, beskarLight, 0, -0.23, 0.09, { ol: false }));

    // Armored combat boot with bronze toe cap
    leg.add(B(0.17, 0.10, 0.24, flightSuit, 0, -0.33, 0.05, { ol: true }));
    leg.add(B(0.14, 0.07, 0.08, bronze, 0, -0.33, 0.14, { ol: false }));

    // Heel micro-thruster nozzle
    leg.add(C(0.05, 0.04, 0.07, bronze, 0, -0.31, -0.09, 10, { ol: false }));

    return leg;
  };

  const legL = mkLeg(-1);
  const legR = mkLeg(1);
  rig.add(legL);
  rig.add(legR);
  limbs.legL = legL;
  limbs.legR = legR;

  // ==================== BODY (Chubby Segmented Beskar Cuirass) ====================
  const body = new THREE.Group();
  body.position.y = 0.58;
  rig.add(body);
  limbs.body = body;

  // Tactical slate undersuit (chubby rounded belly & chest)
  body.add(S(0.35, flightSuit, 0, 0.02, 0, { sx: 1.18, sy: 0.98, sz: 1.05, ol: true }));

  // Segmented Beskar silver cuirass (chest armor plates)
  for (const sd of [-1, 1]) {
    body.add(B(0.20, 0.16, 0.10, beskar, sd * 0.12, 0.11, 0.22, { ry: sd * 0.12, ol: true }));
    body.add(B(0.16, 0.12, 0.04, beskarLight, sd * 0.12, 0.11, 0.26, { ry: sd * 0.12, ol: false }));
  }

  // Central Beskar diamond collar emblem connecting the chest plates
  const diamondMat = new THREE.MeshStandardMaterial({ color: bronze, roughness: 0.3, emissive: bronze, emissiveIntensity: 0.2 });
  const diamond = new THREE.Mesh(BOX, diamondMat);
  diamond.scale.set(0.10, 0.10, 0.06);
  diamond.rotation.z = Math.PI / 4;
  diamond.position.set(0, 0.13, 0.26);
  body.add(diamond);

  // Glowing cyan arc reactor power core
  const coreMat = new THREE.MeshStandardMaterial({
    color: cyanCore,
    roughness: 0.1,
    emissive: cyanCore,
    emissiveIntensity: 1.6,
  });
  const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 16), coreMat);
  coreMesh.rotation.x = Math.PI / 2;
  coreMesh.position.set(0, 0.13, 0.28);
  body.add(coreMesh);

  // Segmented abdominal Beskar ab-plate
  body.add(B(0.34, 0.12, 0.10, beskar, 0, -0.04, 0.24, { ol: true }));
  body.add(B(0.26, 0.08, 0.04, beskarLight, 0, -0.04, 0.28, { ol: false }));

  // Heavy brown leather utility belt with gleaming silver buckle
  body.add(C(0.36, 0.36, 0.09, leather, 0, -0.16, 0, 18, { ol: true }));
  body.add(B(0.14, 0.11, 0.06, beskarLight, 0, -0.16, 0.36, { ol: true }));
  body.add(B(0.08, 0.06, 0.04, bronze, 0, -0.16, 0.38, { ol: false }));
  // Tactical ammo pouches
  for (const sd of [-1, 1]) {
    body.add(B(0.10, 0.09, 0.07, leather, sd * 0.25, -0.16, 0.27, { ol: false }));
    body.add(C(0.025, 0.025, 0.08, bronze, sd * 0.34, -0.16, 0.16, 8, { rx: Math.PI / 2 }));
    body.add(C(0.025, 0.025, 0.08, bronze, sd * 0.36, -0.16, 0.08, 8, { rx: Math.PI / 2 }));
  }

  // Combat half-cape draped over left shoulder
  const cape = new THREE.Group();
  cape.position.set(-0.20, 0.16, -0.08);
  cape.add(B(0.22, 0.40, 0.04, darkCape, 0, -0.18, 0, { rx: 0.14, rz: 0.12 }));
  cape.add(B(0.20, 0.05, 0.045, bronze, 0, 0.02, 0));
  body.add(cape);
  limbs.cape = cape;

  // ==================== ENLARGED HEAVY ROCKET JETPACK ====================
  // Significantly enlarged & beefed up per user request ("tolong jetpacknya besarin")!
  const jetpack = new THREE.Group();
  jetpack.name = 'jetpack';
  jetpack.position.set(0, 0.08, -0.28);
  body.add(jetpack);
  limbs.jetpack = jetpack;

  // Heavy Beskar jetpack main housing chassis (wider, chunkier, deeper)
  jetpack.add(B(0.54, 0.46, 0.22, beskar, 0, 0.04, 0, { ol: true }));
  jetpack.add(B(0.36, 0.34, 0.08, beskarTrim, 0, 0.05, -0.11, { ol: false }));

  // Glowing hyperdrive cyan core reactor cell on center back
  const jetCell = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.20, 0.06), coreMat);
  jetCell.position.set(0, 0.04, -0.14);
  jetpack.add(jetCell);

  // Twin upper exhaust heat dissipation vents
  for (const sd of [-1, 1]) {
    jetpack.add(B(0.12, 0.04, 0.14, bronze, sd * 0.16, 0.27, -0.02, { rx: -0.2, ol: false }));
    jetpack.add(B(0.08, 0.02, 0.10, cyanCore, sd * 0.16, 0.28, -0.02, { lit: true }));
  }

  // Center rocket missile launcher pod (iconic heavy rocket missile with bronze warhead & fins)
  const centerRocket = new THREE.Group();
  centerRocket.position.set(0, 0.22, -0.04);
  centerRocket.add(C(0.08, 0.09, 0.46, beskarLight, 0, 0, 0, 14, { ol: true }));
  centerRocket.add(cone(0.095, 0.22, bronze, 0, 0.28, 0, 12, 0.35));
  // 4 Stabilizer fins on missile tip
  for (let f = 0; f < 4; f++) {
    const fin = B(0.02, 0.10, 0.08, bronze, 0, 0.16, 0);
    fin.rotation.y = (f * Math.PI) / 2;
    centerRocket.add(fin);
  }
  jetpack.add(centerRocket);

  // Twin Giant Rocket Booster Turbines (Left & Right - Massive & Flared)
  const mkThruster = (sd: number) => {
    const thruster = new THREE.Group();
    thruster.position.set(sd * 0.30, 0.02, 0);

    // Thick polished Beskar rocket turbine cylinder (radius 0.14, height 0.48)
    thruster.add(C(0.13, 0.14, 0.48, beskar, 0, 0.08, 0, 16, { ol: true }));
    thruster.add(B(0.04, 0.38, 0.04, beskarLight, sd * 0.14, 0.08, 0, { ol: false }));

    // Top aerodynamic bronze air-intake dome & grille
    thruster.add(S(0.13, bronze, 0, 0.33, 0, { sy: 0.7, ol: false }));
    thruster.add(C(0.10, 0.10, 0.04, cyanCore, 0, 0.38, 0, 12, { glow: 1.2 }));

    // Heavy flared rocket exhaust bell nozzle (wide diameter for dramatic burst flames!)
    thruster.add(C(0.14, 0.18, 0.16, 0x1e293b, 0, -0.20, 0, 16, { ol: true }));
    thruster.add(tor(0.17, 0.03, bronze, 0, -0.18, 0, { rx: Math.PI / 2 }));

    // Glowing superheated orange combustion chamber throat ring inside the nozzle
    thruster.add(tor(0.12, 0.024, 0xf97316, 0, -0.23, 0, { rx: Math.PI / 2, glow: 1.5 }));

    // Dynamic 3D Triple-Layer Rocket Flame Plumes
    const flameGroup = new THREE.Group();
    flameGroup.position.set(0, -0.26, 0);

    // Layer 1: Huge outer billowing plasma fire plume (amber/orange)
    const flameOuter = cone(0.16, 0.58, 0xf97316, 0, -0.28, 0, 14, 1.5);
    flameOuter.rotation.x = Math.PI;
    flameGroup.add(flameOuter);

    // Layer 2: Intense middle hot-combustion core (bright yellow/gold)
    const flameMid = cone(0.11, 0.44, 0xfbbf24, 0, -0.21, 0, 12, 1.8);
    flameMid.rotation.x = Math.PI;
    flameGroup.add(flameMid);

    // Layer 3: Ultra-hot central plasma laser core (vivid cyan/white)
    const flameInner = cone(0.065, 0.32, 0x38bdf8, 0, -0.15, 0, 10, 2.2);
    flameInner.rotation.x = Math.PI;
    flameGroup.add(flameInner);

    thruster.add(flameGroup);
    jetFlames.push(flameGroup);

    return thruster;
  };

  jetpack.add(mkThruster(-1));
  jetpack.add(mkThruster(1));

  // ==================== AUTHENTIC "DESTROYER" MANDALORIAN BESKAR HELMET ====================
  // Designed exactly per user's reference image ("Destroyer" Mandalorian helmet):
  // - Smooth silver/grey Beskar dome with rounded contour
  // - Bold Royal Cobalt Blue center stripe from crown apex to brow with glossy white shine streak
  // - Crisp dark horizontal brow ridge framing the visor opening
  // - Glossy pitch-black T-Visor with tapered vertical stem and two diagonal glossy glare slashes
  // - Vibrant Royal Cobalt Blue angled cheek plates flanking the visor with deep navy chamfer bevels
  // - Sleek angled Beskar jaw & chin guard framing the bottom of the cheeks
  // - Symmetrical Royal Blue vertical ear stalks with sharp golden/yellow needle spikes pointing straight up
  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.02);
  body.add(head);
  limbs.head = head;

  // Airtight neck sealing collar ring
  head.add(tor(0.31, 0.035, bronze, 0, -0.25, 0, { rx: Math.PI / 2 }));
  head.add(C(0.30, 0.32, 0.08, flightSuit, 0, -0.25, 0, 16, { ol: true }));

  // Attach authentic Destroyer Mandalorian helmet
  const helmet = makeMandalorianHelmet();
  head.add(helmet);

  // ==================== LEFT ARM (Beskar Gauntlet & Stabilizer) ====================
  const armL = new THREE.Group();
  armL.position.set(0.48, 0.14, 0);
  body.add(armL);
  limbs.armL = armL;

  // Gleaming Beskar shoulder pauldron
  armL.add(S(0.17, beskar, 0, 0.06, 0, { sx: 1.15, sy: 0.95, sz: 1.15, ol: true }));
  armL.add(B(0.18, 0.05, 0.18, bronze, 0, 0.11, 0));
  // Flightsuit bicep
  armL.add(C(0.09, 0.085, 0.18, flightSuit, 0, -0.07, 0, 12, { ol: true }));
  // Tactical Beskar gauntlet with whistler bird missile tubes
  armL.add(B(0.14, 0.16, 0.13, beskar, 0, -0.22, 0.03, { ol: true }));
  armL.add(C(0.02, 0.02, 0.10, bronze, -0.03, -0.16, 0.10, 8, { rx: Math.PI / 2 }));
  armL.add(C(0.02, 0.02, 0.10, bronze, 0.03, -0.16, 0.10, 8, { rx: Math.PI / 2 }));
  // Glowing blue wrist communicator display
  const wristDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.03), coreMat);
  wristDisplay.position.set(0, -0.21, 0.10);
  armL.add(wristDisplay);
  // Armored glove fist
  armL.add(S(0.085, leather, 0, -0.34, 0.03, { ol: true }));

  // ==================== RIGHT ARM & PLASMA CARBINE ====================
  const armR = new THREE.Group();
  armR.position.set(-0.48, 0.14, 0);
  body.add(armR);
  limbs.armR = armR;

  // Gleaming Beskar shoulder pauldron
  armR.add(S(0.17, beskar, 0, 0.06, 0, { sx: 1.15, sy: 0.95, sz: 1.15, ol: true }));
  armR.add(B(0.18, 0.05, 0.18, bronze, 0, 0.11, 0));
  // Flightsuit bicep
  armR.add(C(0.09, 0.085, 0.18, flightSuit, 0, -0.07, 0, 12, { ol: true }));
  // Forearm & combat grip
  armR.add(C(0.085, 0.085, 0.18, beskar, 0, -0.22, 0, 12, { ol: true }));

  // ---------- Heavy Plasma Blaster Carbine ----------
  const blaster = new THREE.Group();
  blaster.name = 'blaster';
  blaster.position.set(0, -0.28, 0.16);
  blaster.rotation.x = Math.PI / 2; // point forward along +Z
  armR.add(blaster);
  limbs.blaster = blaster;

  // Polished receiver body
  blaster.add(B(0.12, 0.14, 0.44, 0x1e293b, 0, 0.02, 0, { ol: true }));
  blaster.add(B(0.09, 0.06, 0.22, beskarLight, 0, 0.08, -0.08, { ol: false }));
  // Ergonomic combat grip
  blaster.add(B(0.08, 0.16, 0.09, leather, 0, -0.11, -0.08, { rx: -0.2, ol: true }));

  // Barrel cylinder (polished Beskar heat shroud)
  blaster.add(C(0.07, 0.07, 0.36, beskarTrim, 0, 0.03, 0.30, 14, { rx: Math.PI / 2, ol: true }));
  // Glowing cyan plasma charging rings along barrel
  for (let k = 0; k < 3; k++) {
    const pRing = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 6, 16), coreMat);
    pRing.position.set(0, 0.03, 0.20 + k * 0.10);
    blaster.add(pRing);
  }
  // Muzzle brake outer sleeve
  blaster.add(C(0.065, 0.07, 0.14, bronze, 0, 0.03, 0.52, 14, { rx: Math.PI / 2, ol: true }));

  // Visible Hollow Barrel Bore / Hole ("LUBANG SENAPAN"):
  const boreMat = new THREE.MeshStandardMaterial({
    color: 0x050508,
    roughness: 0.9,
    emissive: 0x020204,
  });
  const boreHole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 14), boreMat);
  boreHole.rotation.x = Math.PI / 2;
  boreHole.position.set(0, 0.03, 0.58);
  blaster.add(boreHole);

  // Glowing cyan muzzle ring rim right at the barrel opening
  const muzzleRim = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.012, 6, 16), coreMat);
  muzzleRim.position.set(0, 0.03, 0.60);
  blaster.add(muzzleRim);

  // Holographic targeting sight on top of receiver
  blaster.add(B(0.05, 0.06, 0.12, bronze, 0, 0.12, 0.02, { ol: false }));
  const sightDot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), coreMat);
  sightDot.position.set(0, 0.13, 0.07);
  blaster.add(sightDot);

  // Muzzle output point (for laser projectile spawn)
  const blasterMuzzle = new THREE.Object3D();
  blasterMuzzle.name = 'muzzle';
  blasterMuzzle.position.set(0, 0.03, 0.61);
  blaster.add(blasterMuzzle);

  return {
    group,
    rig,
    limbs,
    jetFlames,
    blasterMuzzle,
    visor: helmet,
  };
}

/**
 * Poses the Aero Hunter in flight:
 * - Natural jetpack hover dynamics (smooth bobbing, feet hanging relaxed, body forward tilt)
 * - Jetpack flames pulsating & dramatically flaring upon burst boost
 * - Right arm and blaster dynamically aiming towards target
 * - Left arm stabilizer pose
 */
export function poseAeroHunter(
  limbs: Record<string, THREE.Group>,
  rig: THREE.Group,
  jetFlames: THREE.Object3D[],
  state: 'launch' | 'hover' | 'burst' | 'shoot' | 'down',
  speedK: number,
  burstActive: boolean,
  aimPitch: number,
  time: number
) {
  // Rig forward tilt during flight
  const tilt = state === 'down' ? 1.4 : burstActive ? 0.52 : 0.16 + speedK * 0.24;
  rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, tilt, 0.2);

  // Hover leg dynamics (dangling back like a flying jetpack commando with natural knee flex)
  const legBob = Math.sin(time * 3) * 0.06;
  if (limbs.legL && limbs.legR) {
    limbs.legL.rotation.x = 0.40 + legBob + speedK * 0.30;
    limbs.legR.rotation.x = 0.50 - legBob + speedK * 0.30;
    limbs.legL.rotation.z = -0.10;
    limbs.legR.rotation.z = 0.10;
  }

  // Arm & Blaster Aiming
  if (limbs.armR) {
    const baseArmX = -0.52 + (aimPitch || 0) * 0.95;
    limbs.armR.rotation.x = THREE.MathUtils.lerp(limbs.armR.rotation.x, baseArmX, 0.3);
    limbs.armR.rotation.y = 0.08;
    limbs.armR.rotation.z = -0.12;
  }

  if (limbs.armL) {
    limbs.armL.rotation.x = -0.28 + Math.sin(time * 2.5) * 0.08;
    limbs.armL.rotation.y = -0.14;
    limbs.armL.rotation.z = 0.24;
  }

  // Jetpack Thruster Flame Scaling & Flare Burst:
  // When burstActive is true, expand flame plumes dramatically (up to 3.2x height and 2.4x width!)
  const flamePulse = Math.sin(time * 32) * 0.25;
  const flameScaleY = burstActive ? 3.2 : state === 'launch' ? 2.6 : 1.25 + flamePulse;
  const flameScaleXZ = burstActive ? 2.2 : state === 'launch' ? 1.7 : 1.1 + flamePulse * 0.4;

  for (const f of jetFlames) {
    f.scale.set(flameScaleXZ, flameScaleY, flameScaleXZ);
  }

  // Head looks forward and tracks aim pitch
  if (limbs.head) {
    limbs.head.rotation.x = (aimPitch || 0) * 0.5;
  }
}
