import * as THREE from 'three';
import { SPH, RING, DISC, OUTLINE_MAT } from './voxel';

/**
 * "Pulau Kristal" – the world of this game.
 *  - ONE continuous terrain mesh (no tiles): rolling grass, a soft sandy road with wobbly natural edges,
 *    a rounded grass lip that rolls over into striped cliff layers and a tapered rock underside
 *  - thousands of wind-swaying grass tufts + flowers + pebbles, fireflies drifting in the air
 *  - round, outlined, puffy trees (round / blossom / pine / lollipop / glowing mushroom) that sway
 *  - glowing crystals growing from the ground and out of the cliffs (this game's signature)
 *  - every level is a different biome (meadow, autumn, frost, candy, twilight crystal forest)
 */
export type TreeKind = 'round' | 'pine' | 'blossom' | 'lolly' | 'mushroom';
export interface Biome {
  name: string;
  grass: [number, number, number]; lip: number; rim: number;
  sand: [number, number]; lane: number; pebble: number[]; stone: number; moss?: number;
  strata: number[]; topsoil: number; rock: number;
  leaf: number[]; pine: number[]; blossom: number[]; candy: number[]; cap: number[]; trunk: number; fruit: number[];
  trees: [TreeKind, number][];
  flowers: number[]; crystal: number[];
  skyTop: number; skyBot: number; fog: number; cloud: number; fly: number; snow?: boolean;
}
export const BIOMES: Biome[] = [
  { name: 'Padang Ceria', grass: [0x46b84a, 0x69d24c, 0x9aea63], lip: 0x3d9d40, rim: 0x2f8f3a, sand: [0xf2dea8, 0xdcc388], lane: 0xc9ac6b, pebble: [0xcdb98a, 0xb9a77c, 0xe8ddc0, 0x9aa3ad], stone: 0xa4adba, moss: 0x5fc25a,
    strata: [0xa4703f, 0xc08a50, 0x8a5a33, 0xb27d46], topsoil: 0x7d4f2d, rock: 0x6a5870,
    leaf: [0x3fb05c, 0x58c76e, 0x34a05a], pine: [0x2f9a62, 0x3fb273], blossom: [0xff8fb4, 0xffc2d6, 0xff6fa0], candy: [0xff6fa8, 0x7ee0ff], cap: [0xff6a5c, 0xffb347], trunk: 0x8a5a3c, fruit: [0xff5a5a, 0xffd23f],
    trees: [['round', 0.62], ['blossom', 0.38]], flowers: [0xff7aa8, 0xffd23f, 0xffffff, 0x8ec5ff], crystal: [0x4fe0ff, 0xff7ad9, 0xb48cff],
    skyTop: 0x5fbcff, skyBot: 0xd2f0ff, fog: 0xc4e8ff, cloud: 0xffffff, fly: 0xfff6a8 },
  { name: 'Musim Gugur', grass: [0x93b53a, 0xb9cc42, 0xdddb55], lip: 0x7f9d2d, rim: 0x6f8a28, sand: [0xe9c996, 0xd2aa70], lane: 0xb98a52, pebble: [0xc9a56e, 0xb08a58, 0xe5d3a8, 0x9a9087], stone: 0xa89a8a, moss: 0x9ab53a,
    strata: [0x93613a, 0xb07a44, 0x7b4f2e, 0xa56f3c], topsoil: 0x70452a, rock: 0x5e4658,
    leaf: [0xf2711c, 0xe84e2b, 0xfbbf24, 0xd9791f], pine: [0x2f8450, 0x3a9a5f], blossom: [0xf97316, 0xfbbf24], candy: [0xff9a3c, 0xffd84d], cap: [0xff7a30, 0xc2410c], trunk: 0x6b4423, fruit: [0xffd23f, 0xff8a3c],
    trees: [['round', 0.72], ['pine', 0.28]], flowers: [0xffa63d, 0xff6b4a, 0xffe08a, 0xc084fc], crystal: [0xffb347, 0xff6b81, 0x7ee7ff],
    skyTop: 0x72b6f2, skyBot: 0xffe6c8, fog: 0xf0dfc8, cloud: 0xfff4e6, fly: 0xffc878 },
  { name: 'Salju Ceria', grass: [0xb9e9e2, 0xd6f6f1, 0xf3fffd], lip: 0x94d2cd, rim: 0x7fbfc4, sand: [0xd0e1ef, 0xb7cadd], lane: 0xa0b8d0, pebble: [0x9fb4c8, 0xc9d7e4, 0xffffff, 0x8aa0b8], stone: 0xb9c8dc,
    strata: [0xb8c7d8, 0xa0b2c8, 0xcad7e5, 0x8c9fb8], topsoil: 0x9aaec6, rock: 0x56668a,
    leaf: [0xa9ddf5, 0xcdeeff, 0x8fd0ee], pine: [0x2f8f6b, 0x3da67d, 0x287b5d], blossom: [0xbfe3ff, 0xe6f4ff], candy: [0x7ee0ff, 0xc2a6ff], cap: [0x7ee0ff, 0xc2a6ff], trunk: 0x6b4b3a, fruit: [0xffffff, 0xbfe3ff],
    trees: [['pine', 0.75], ['round', 0.25]], flowers: [0x8fd3ff, 0xffffff, 0xc3b5ff, 0xffd1f0], crystal: [0x7be8ff, 0xc2a6ff, 0xffffff],
    skyTop: 0x7cc2ff, skyBot: 0xeaf7ff, fog: 0xdff1ff, cloud: 0xffffff, fly: 0xd8f6ff, snow: true },
  { name: 'Negeri Permen', grass: [0x84e3b4, 0xa3f2c6, 0xc8ffdc], lip: 0xff9fcb, rim: 0xff86bd, sand: [0xf4b873, 0xdb9650], lane: 0xc67d3a, pebble: [0xff8fb8, 0xffffff, 0xffe066, 0x9ee7ff], stone: 0xf0a8c8,
    strata: [0xc4813f, 0x8f5731, 0xe9a864, 0x6f4026], topsoil: 0xffb6d9, rock: 0x57304c,
    leaf: [0xff9fcb, 0xffc2dc], pine: [0x7ee0b0, 0x9df0c2], blossom: [0xff8fc0, 0xffc2dc, 0xffffff], candy: [0xff6fa8, 0x7ee0ff, 0xffd84d, 0xb58cff], cap: [0xff6fa8, 0x7ee0ff, 0xffd84d], trunk: 0xc98a5a, fruit: [0xff6fa8, 0xffffff, 0xffd84d],
    trees: [['lolly', 0.78], ['blossom', 0.22]], flowers: [0xff7aa8, 0xffffff, 0xffe066, 0xb58cff], crystal: [0xff7ad9, 0x7ee7ff, 0xffe066],
    skyTop: 0x9db9ff, skyBot: 0xffd3ee, fog: 0xf6d4ef, cloud: 0xfff0fa, fly: 0xfff0a0 },
  { name: 'Hutan Kristal', grass: [0x2fb39c, 0x4fd2b0, 0x88f0c6], lip: 0x2a9088, rim: 0x23807f, sand: [0xdacdf3, 0xbcaae3], lane: 0xa592d4, pebble: [0x9a8cc9, 0xcbbcf0, 0x7ee7ff, 0xffffff], stone: 0x9d92c4,
    strata: [0x7d65b3, 0x6c54a1, 0x907ac7, 0x5b4691], topsoil: 0x5c4b8c, rock: 0x2f2a58,
    leaf: [0xb690ff, 0xd3b8ff], pine: [0x45c8ac, 0x66dcc0], blossom: [0xc4a1ff, 0xff9bd5, 0xe3d0ff], candy: [0xc4a1ff, 0xff9bd5], cap: [0xa66bff, 0xff7ad9, 0x45d6c4, 0xffb54a], trunk: 0x5a4380, fruit: [0x7ee7ff, 0xff9bd5],
    trees: [['mushroom', 0.62], ['blossom', 0.38]], flowers: [0x7ee7ff, 0xff9bd5, 0xfff0a0, 0xc4a1ff], crystal: [0x5ff0ff, 0xff6fd8, 0xaa80ff],
    skyTop: 0x5d6df2, skyBot: 0xf6b4e2, fog: 0xc9b6ef, cloud: 0xf4e6ff, fly: 0xb6fff0 },
];

// ---------- math / noise ----------
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ss = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(x: number, y: number, s: number) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function vnoise(x: number, y: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, s: number, oct = 3) {
  let a = 0.5, f = 1, sum = 0;
  for (let i = 0; i < oct; i++) { sum += a * vnoise(x * f, y * f, s + i * 17); f *= 2.03; a *= 0.5; }
  return sum / (1 - Math.pow(0.5, oct));
}
function smin(a: number, b: number, k: number) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }

// ---------- merged "vertex-colour" meshes (a whole tree = 2 draw calls) ----------
const LOWSPH = new THREE.SphereGeometry(1, 8, 6);
const CONE = new THREE.ConeGeometry(1, 1, 14);
const OCT = new THREE.OctahedronGeometry(1, 0);
const cylG = (rt: number, rb: number, h: number, seg = 10) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.userData.ref = Math.max(rt, rb); return g; };
const torG = (R: number, t: number) => { const g = new THREE.TorusGeometry(R, t, 6, 22); g.userData.ref = R + t; return g; };
const VC_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
const GLOW_VC = new THREE.MeshBasicMaterial({ vertexColors: true });
const OLT = 0.03;

interface Part { geo: THREE.BufferGeometry; m: THREE.Matrix4; mo: THREE.Matrix4; c: THREE.Color; ol: boolean }
class MB {
  parts: Part[] = [];
  add(geo: THREE.BufferGeometry, color: number | THREE.Color, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, ol = true) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
    const ref = (geo.userData.ref as number | undefined) ?? (sx + sz) / 2;
    const f = Math.min(1.7, 1 + OLT / Math.max(0.02, ref));
    this.parts.push({ geo, m: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)), mo: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx * f, sy * f, sz * f)), c: color instanceof THREE.Color ? color : new THREE.Color(color), ol });
    return this;
  }
  build() { return { geo: merge(this.parts.map(p => ({ geo: p.geo, m: p.m, c: p.c })), true), ol: merge(this.parts.filter(p => p.ol).map(p => ({ geo: p.geo, m: p.mo })), false) }; }
  buildPlain() { return merge(this.parts.map(p => ({ geo: p.geo, m: p.m, c: p.c })), true); }
}
function merge(items: { geo: THREE.BufferGeometry; m: THREE.Matrix4; c?: THREE.Color }[], attrs: boolean) {
  let vc = 0, ic = 0;
  for (const it of items) { vc += it.geo.attributes.position.count; ic += it.geo.index ? it.geo.index.count : it.geo.attributes.position.count; }
  const pos = new Float32Array(vc * 3), nor = attrs ? new Float32Array(vc * 3) : null, col = attrs ? new Float32Array(vc * 3) : null, idx = new Uint32Array(ic);
  const nm = new THREE.Matrix3(), v = new THREE.Vector3(); let vo = 0, io = 0;
  for (const it of items) {
    const g = it.geo, pa = g.attributes.position, na = g.attributes.normal; nm.getNormalMatrix(it.m);
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(it.m); pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
      if (attrs && nor && col && na && it.c) {
        v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z;
        col[(vo + i) * 3] = it.c.r; col[(vo + i) * 3 + 1] = it.c.g; col[(vo + i) * 3 + 2] = it.c.b;
      }
    }
    const n = g.index ? g.index.count : pa.count;
    for (let k = 0; k < n; k++) idx[io + k] = (g.index ? g.index.getX(k) : k) + vo;
    vo += pa.count; io += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (nor && col) { out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// ---------- canvas textures ----------
function hexCss(n: number) { return '#' + n.toString(16).padStart(6, '0'); }
export function makeSkyTexture(top: number, bot: number) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, hexCss(top)); gr.addColorStop(1, hexCss(bot)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function swirlTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#3b1d8a'; g.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 4; k++) {
    g.strokeStyle = ['#c4a1ff', '#7ee7ff', '#ff9bd5', '#ffffff'][k]; g.lineWidth = 7 - k; g.lineCap = 'round'; g.beginPath();
    for (let a = 0; a < 11; a += 0.1) { const r = 3 + a * 5.2; const ang = a + k * 1.57; const x = 64 + Math.cos(ang) * r, y = 64 + Math.sin(ang) * r; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
  }
  const rg = g.createRadialGradient(64, 64, 20, 64, 64, 64); rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.2, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(20,0,60,0.9)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- wind (grass / flowers sway in the vertex shader) ----------
function windMat(m: THREE.MeshStandardMaterial, amp: number, timeU: { value: number }, flatUp = false) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = timeU; sh.uniforms.uAmp = { value: amp };
    // grass blades are double-sided: three.js flips the normal on the back face, which made half of every tuft look dark.
    // Force the normal to "up" (exactly like the flat floor) so tufts are lit with the SAME light as the ground.
    if (flatUp) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );');
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uAmp;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 ip = vec3(0.0);
#endif
  float wph = ip.x * 0.7 + ip.z * 0.55;
  float sw = sin(uTime * 2.1 + wph) * 0.55 + sin(uTime * 3.7 + wph * 1.9) * 0.2 + sin(uTime * 0.9 + ip.x * 0.18 + ip.z * 0.12) * 0.5;
  float wgt = position.y * position.y;
  transformed.x += sw * 0.30 * uAmp * wgt;
  transformed.z += sw * 0.14 * uAmp * wgt;`);
  };
  m.customProgramCacheKey = () => 'wind' + (flatUp ? 'U' : '');
  return m;
}
function tuftGeo() {
  const P: number[] = [], C: number[] = [], N: number[] = [], I: number[] = [];
  for (let b = 0; b < 6; b++) {
    const a = (b / 6) * Math.PI * 2 + b * 0.7, r = b === 0 ? 0 : 0.28 + (b % 2) * 0.1, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    const yaw = a + (b % 2 ? 0.6 : -0.6) * 1.2, h = 0.75 + (((b * 37) % 10) / 10) * 0.5, w = 0.15, lean = 0.28 + (b % 3) * 0.1, cs = Math.cos(yaw), sn = Math.sin(yaw);
    const pts: [number, number, number][] = [[-w, 0, 0], [w, 0, 0], [-w * 0.62, h * 0.5, lean * 0.25], [w * 0.62, h * 0.5, lean * 0.25], [0, h, lean]];
    const base = P.length / 3;
    // no baked darker-at-the-root gradient: every blade shows exactly the colour it is given (= the floor's grass colour)
    pts.forEach((p, k) => { P.push(cx + p[0] * cs + p[2] * sn, p[1], cz - p[0] * sn + p[2] * cs); C.push(1, 1, 1); N.push(0, 1, 0); void k; });
    I.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I);
  return g;
}
function flowerGeo(petal: number) {
  const mb = new MB();
  mb.add(cylG(0.022, 0.03, 1, 5), 0x3f9a3f, 0, 0.5, 0, 1, 1, 1, 0, 0, 0, false);
  mb.add(LOWSPH, 0x4fb24a, 0.1, 0.3, 0, 0.12, 0.04, 0.07, 0, 0, 0.5, false);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; mb.add(LOWSPH, petal, Math.cos(a) * 0.17, 1.0, Math.sin(a) * 0.17, 0.13, 0.06, 0.13, 0, 0, 0, false); }
  mb.add(LOWSPH, 0xffd54a, 0, 1.03, 0, 0.1, 0.08, 0.1, 0, 0, 0, false);
  return mb.buildPlain();
}

// ---------- trees & props ----------
interface Built { geo: THREE.BufferGeometry; ol: THREE.BufferGeometry }
interface Proto { trunk: Built; canopy: Built; glow?: THREE.BufferGeometry; pivotY: number }
const jit = (hex: number, rng: () => number, amt = 0.07) => new THREE.Color(hex).offsetHSL((rng() - 0.5) * 0.02, 0, (rng() - 0.5) * amt);
const lighter = (hex: number, d = 0.1) => new THREE.Color(hex).offsetHSL(0, 0, d);

/** bakes soft lighting into the vertex colours: lighter on top and on the sunny side, darker underneath – puffy canopies read as round volumes */
function bakeShade(geo: THREE.BufferGeometry, y0: number, y1: number, strength = 0.26) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color as THREE.BufferAttribute | undefined; if (!col || !nor) return;
  for (let i = 0; i < pos.count; i++) {
    const h = clamp((pos.getY(i) - y0) / Math.max(0.001, y1 - y0), 0, 1);
    const nd = nor.getX(i) * 0.42 + nor.getY(i) * 0.78 + nor.getZ(i) * 0.46; // how much the surface faces the sun
    const k = clamp(1 + strength * ((h - 0.5) * 1.2 + nd * 0.7), 0.6, 1.35);
    col.setXYZ(i, Math.min(1.15, col.getX(i) * k), Math.min(1.15, col.getY(i) * k), Math.min(1.15, col.getZ(i) * k));
  }
  col.needsUpdate = true;
}
/** Broadleaf tree: flared roots, a leaning stem with two branches reaching into the crown and a cute knot; a cloud-like canopy of two lobe rings,
 *  a crown, light-catching highlights, little leaf sprigs, a shaded underside and (optional) fruit – sun-lit top, shaded bottom. */
function roundTree(rng: () => number, leaf: number[], trunk: number, fruit: number[]): Proto {
  const tr = new MB(), ca = new MB();
  const bark = new THREE.Color(trunk), barkD = bark.clone().offsetHSL(0, 0, -0.09), barkL = bark.clone().offsetHSL(0, 0, 0.06);
  tr.add(cylG(0.15, 0.24, 0.3), bark, 0, 0.15, 0, 1);
  tr.add(cylG(0.115, 0.15, 0.4), barkL, 0.015, 0.45, 0, 1, 1, 1, 0, 0, -0.05);
  tr.add(cylG(0.095, 0.115, 0.4), bark, 0.05, 0.8, 0, 1, 1, 1, 0, 0, -0.1);
  for (let k = 0; k < 4; k++) { const a = k * 1.6 + rng() * 0.6; tr.add(SPH, bark, Math.cos(a) * 0.22, 0.05, Math.sin(a) * 0.22, 0.12, 0.075, 0.12); }
  for (const sd of [-1, 1]) tr.add(cylG(0.04, 0.075, 0.34), bark, 0.06 + sd * 0.12, 0.98, 0, 1, 1, 1, 0, 0, -sd * 0.7);
  tr.add(SPH, barkD, 0.02, 0.44, 0.13, 0.06, 0.09, 0.03, 0, 0, 0, false); // knot
  // canopy (pivot = 0.92 above the ground)
  ca.add(SPH, jit(leaf[0], rng), 0, 0.5, 0, 0.6, 0.5, 0.58);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + rng() * 0.3, sz = 0.34 + rng() * 0.08; ca.add(SPH, jit(leaf[(i + 1) % leaf.length], rng), Math.cos(a) * 0.46, 0.24 + rng() * 0.1, Math.sin(a) * 0.46, sz, sz * 0.88, sz); }
  for (let i = 0; i < 4; i++) { const a = ((i + 0.5) / 4) * Math.PI * 2 + rng() * 0.3, sz = 0.3 + rng() * 0.05; ca.add(SPH, jit(leaf[(i + 2) % leaf.length], rng), Math.cos(a) * 0.3, 0.66 + rng() * 0.05, Math.sin(a) * 0.3, sz, sz * 0.9, sz); }
  ca.add(SPH, jit(leaf[2 % leaf.length], rng), 0.02, 0.98, 0, 0.33);
  ca.add(SPH, jit(leaf[1 % leaf.length], rng), 0.17, 0.9, 0.1, 0.22); ca.add(SPH, jit(leaf[0], rng), -0.15, 0.92, -0.1, 0.22);
  ca.add(SPH, new THREE.Color(leaf[0]).multiplyScalar(0.7), 0, 0.02, 0, 0.5, 0.1, 0.5, 0, 0, 0, false); // dark underside anchors the volume
  for (let k = 0; k < 5; k++) { const a = rng() * 6.28; ca.add(LOWSPH, lighter(leaf[0], 0.14), Math.cos(a) * (0.18 + rng() * 0.28), 0.96 + rng() * 0.12, Math.sin(a) * (0.18 + rng() * 0.28), 0.15, 0.07, 0.15, 0, 0, 0, false); }
  for (let k = 0; k < 10; k++) { // leaf sprigs
    const th = rng() * 6.28, ph = 0.1 + rng() * 1.2, r = 0.64;
    ca.add(LOWSPH, lighter(leaf[k % leaf.length], 0.1), Math.cos(th) * Math.cos(ph) * r, 0.5 + Math.sin(ph) * r * 0.8, Math.sin(th) * Math.cos(ph) * r, 0.11, 0.045, 0.16, rng() * 0.8, th, rng() * 0.8, false);
  }
  for (let k = 0; k < 7; k++) {
    const th = rng() * 6.28, ph = 0.05 + rng() * 0.95, r = 0.62;
    ca.add(LOWSPH, fruit[k % fruit.length], Math.cos(th) * Math.cos(ph) * r, 0.5 + Math.sin(ph) * r * 0.8, Math.sin(th) * Math.cos(ph) * r, 0.065, 0.065, 0.065, 0, 0, 0, false);
  }
  const canopy = ca.build(); bakeShade(canopy.geo, -0.1, 1.3, 0.3);
  return { trunk: tr.build(), canopy, pivotY: 0.92 };
}
/** Conifer: four stacked tiers with scalloped skirts, snow caps + colourful baubles in the frost biome, a golden star on top. */
function pineTree(rng: () => number, leaf: number[], trunk: number, snow: boolean): Proto {
  const tr = new MB(), ca = new MB(); const py = 0.3;
  const bark = new THREE.Color(trunk);
  tr.add(cylG(0.1, 0.17, 0.5), bark, 0, 0.25, 0, 1);
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + rng(); tr.add(SPH, bark, Math.cos(a) * 0.2, 0.04, Math.sin(a) * 0.2, 0.1, 0.06, 0.1); }
  const tiers: [number, number, number][] = [[0.7, 0.58, 0.0], [0.58, 0.54, 0.3], [0.46, 0.5, 0.58], [0.34, 0.46, 0.84]];
  const bauble = [0xff5a5a, 0x5ac8ff, 0xffd84d, 0xc084fc];
  tiers.forEach(([r, h, y], i) => {
    ca.add(CONE, jit(leaf[i % leaf.length], rng, 0.05), 0, y + h / 2, 0, r, h, r);
    const m = 10; for (let k = 0; k < m; k++) { const a = (k / m) * Math.PI * 2 + i * 0.5, sz = 0.125 + 0.025 * (k % 2); ca.add(SPH, jit(leaf[(i + k) % leaf.length], rng, 0.05), Math.cos(a) * r * 0.9, y + 0.05, Math.sin(a) * r * 0.9, sz, sz * 0.8, sz, 0, 0, 0, false); }
    if (snow) {
      ca.add(CONE, 0xffffff, 0, y + h * 0.66, 0, r * 0.58, h * 0.58, r * 0.58, 0, 0, 0, false);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + rng(); ca.add(LOWSPH, 0xffffff, Math.cos(a) * r * 0.84, y + 0.1, Math.sin(a) * r * 0.84, 0.11, 0.07, 0.11, 0, 0, 0, false); }
      for (let k = 0; k < 2; k++) { const a = rng() * 6.28; ca.add(LOWSPH, bauble[(i + k) % 4], Math.cos(a) * r * 0.66, y + h * 0.28, Math.sin(a) * r * 0.66, 0.06, 0.06, 0.06, 0, 0, 0, false); }
    }
  });
  ca.add(OCT, 0xffd84d, 0, 1.36, 0, 0.1, 0.15, 0.1, 0, 0.5, 0, false);
  const canopy = ca.build(); bakeShade(canopy.geo, -0.05, 1.3, 0.3);
  return { trunk: tr.build(), canopy, pivotY: py };
}
/** Lollipop tree: a striped stick with a ribbon bow, and a swirly candy head with crossing stripes, sprinkles and a glossy highlight. */
function lollyTree(rng: () => number, candy: number[], fruit: number[]): Proto {
  const tr = new MB(), ca = new MB();
  const C = candy[Math.floor(rng() * candy.length)], ribbon = candy[(candy.indexOf(C) + 1) % candy.length];
  for (let k = 0; k < 5; k++) tr.add(cylG(0.055, 0.055, 0.2, 10), k % 2 ? 0xff7aa8 : 0xffffff, 0, 0.1 + k * 0.2, 0, 1);
  tr.add(SPH, 0xffffff, 0, 0.04, 0, 0.13, 0.07, 0.13);
  tr.add(SPH, ribbon, -0.09, 0.62, 0.05, 0.09, 0.06, 0.05, 0, 0, 0.5, false); tr.add(SPH, ribbon, 0.09, 0.62, 0.05, 0.09, 0.06, 0.05, 0, 0, -0.5, false); tr.add(SPH, lighter(ribbon, 0.1), 0, 0.62, 0.06, 0.05, 0.05, 0.05, 0, 0, 0, false);
  ca.add(SPH, C, 0, 0.44, 0, 0.5, 0.48, 0.5);
  for (const [rx, rz] of [[1.15, 0.4], [-0.7, -0.5], [0.15, 1.1], [1.5, -0.2]] as [number, number][]) ca.add(torG(0.5, 0.036), 0xffffff, 0, 0.44, 0, 1, 1, 1, rx, 0.6, rz, false); // swirl stripes
  for (let k = 0; k < 14; k++) { const th = rng() * 6.28, ph = (rng() - 0.3) * 1.5, r = 0.5; ca.add(LOWSPH, fruit[k % fruit.length], Math.cos(th) * Math.cos(ph) * r, 0.44 + Math.sin(ph) * r * 0.96, Math.sin(th) * Math.cos(ph) * r, 0.03, 0.03, 0.07, ph, th, 0, false); } // sprinkles
  ca.add(LOWSPH, 0xffffff, -0.17, 0.74, 0.2, 0.11, 0.06, 0.07, 0.3, 0.4, 0.5, false); // glossy highlight
  const canopy = ca.build(); bakeShade(canopy.geo, -0.1, 1.0, 0.22);
  return { trunk: tr.build(), canopy, pivotY: 0.92 };
}
/** Fairy-house mushroom: a fat cream stalk with a round door and a skirt ring, a glowing window, a wide frilly cap with glowing spots and baby mushrooms at the roots. */
function mushroomTree(rng: () => number, caps: number[]): Proto {
  const tr = new MB(), ca = new MB(), gl = new MB(); const py = 0.6;
  const C = caps[Math.floor(rng() * caps.length)]; const capD = new THREE.Color(C).multiplyScalar(0.72);
  tr.add(cylG(0.17, 0.24, 0.66), 0xfff1d6, 0, 0.33, 0, 1);
  tr.add(SPH, 0xfff1d6, 0, 0.04, 0, 0.28, 0.1, 0.28);
  tr.add(torG(0.2, 0.032), new THREE.Color(0xf4d9b0), 0, 0.5, 0, 1, 1, 1, Math.PI / 2, 0, 0, false); // skirt ring
  tr.add(SPH, 0x8a5a2b, 0, 0.2, 0.22, 0.085, 0.125, 0.04, 0, 0, 0, false); tr.add(SPH, 0xfbbf24, 0.045, 0.2, 0.255, 0.014, 0.014, 0.014, 0, 0, 0, false); // round door + knob
  for (const [x, z, s] of [[0.3, 0.12, 0.7], [-0.27, -0.1, 0.55]] as [number, number, number][]) { tr.add(cylG(0.04 * s, 0.055 * s, 0.2 * s, 8), 0xfff1d6, x, 0.1 * s, z, 1, 1, 1, 0, 0, 0, false); tr.add(SPH, C, x, 0.22 * s, z, 0.14 * s, 0.09 * s, 0.14 * s); } // baby mushrooms
  ca.add(SPH, C, 0, 0.16, 0, 0.72, 0.52, 0.72);
  ca.add(cylG(0.64, 0.5, 0.09, 18), capD, 0, -0.07, 0, 1, 1, 1, 0, 0, 0, false); // gill disc
  ca.add(torG(0.62, 0.05), capD, 0, -0.04, 0, 1, 1, 1, Math.PI / 2, 0, 0, false); // frilly lip
  const capShade = ca.build(); bakeShade(capShade.geo, -0.1, 0.62, 0.22);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + rng(), e = 0.3 + rng() * 0.75, s = k % 3 === 0 ? 1.3 : 1;
    gl.add(LOWSPH, 0xfff7e0, Math.cos(a) * Math.cos(e) * 0.55, 0.16 + Math.sin(e) * 0.52 * 0.95, Math.sin(a) * Math.cos(e) * 0.55, 0.09 * s, 0.05 * s, 0.09 * s, 0, 0, 0, false);
  }
  gl.add(LOWSPH, 0xffe9a0, 0, -0.14, 0.205, 0.07, 0.07, 0.03, 0, 0, 0, false); // the window glows
  return { trunk: tr.build(), canopy: capShade, glow: gl.buildPlain(), pivotY: py };
}
function staticGroup(b: Built, glow?: THREE.BufferGeometry) {
  const g = new THREE.Group(); const m = new THREE.Mesh(b.geo, VC_MAT); m.castShadow = true; g.add(m); g.add(new THREE.Mesh(b.ol, OUTLINE_MAT));
  if (glow) g.add(new THREE.Mesh(glow, GLOW_VC)); return g;
}
function boulderMB(rng: () => number, stone: number, moss?: number) {
  const mb = new MB(); const r = rng();
  mb.add(SPH, jit(stone, rng), 0, 0.17, 0, 0.42 + r * 0.12, 0.28 + r * 0.08, 0.37 + r * 0.1, 0, rng() * 3, 0);
  mb.add(SPH, jit(stone, rng, 0.1), 0.27, 0.1, 0.1, 0.24, 0.17, 0.22); mb.add(SPH, jit(stone, rng, 0.1), -0.25, 0.09, -0.1, 0.2, 0.15, 0.2);
  if (moss) { mb.add(SPH, moss, 0.02, 0.31, 0, 0.3, 0.1, 0.26, 0, 0, 0, false); mb.add(LOWSPH, lighter(moss, 0.1), 0.2, 0.34, 0.05, 0.1, 0.05, 0.1, 0, 0, 0, false); }
  for (let k = 0; k < 3; k++) { const a = rng() * 6.28; mb.add(LOWSPH, jit(stone, rng, 0.12), Math.cos(a) * 0.5, 0.04, Math.sin(a) * 0.5, 0.07, 0.05, 0.07, 0, 0, 0, false); }
  return mb;
}
function bushMB(rng: () => number, leaf: number[], fruit: number[]) {
  const mb = new MB();
  mb.add(SPH, jit(leaf[0], rng), 0, 0.2, 0, 0.3, 0.24, 0.28); mb.add(SPH, jit(leaf[1 % leaf.length], rng), 0.24, 0.16, 0.06, 0.22, 0.19, 0.2); mb.add(SPH, jit(leaf[0], rng), -0.22, 0.15, -0.05, 0.21, 0.18, 0.2); mb.add(SPH, jit(leaf[2 % leaf.length], rng), 0.02, 0.3, -0.12, 0.2, 0.17, 0.2);
  for (let k = 0; k < 6; k++) { const a = rng() * 6.28, e = 0.2 + rng() * 0.9; mb.add(LOWSPH, fruit[k % fruit.length], Math.cos(a) * Math.cos(e) * 0.32, 0.2 + Math.sin(e) * 0.24, Math.sin(a) * Math.cos(e) * 0.32, 0.05, 0.05, 0.05, 0, 0, 0, false); }
  return mb;
}
function mushroomsMB(rng: () => number, caps: number[]) {
  const mb = new MB();
  const n = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.28 + rng(), d = i === 0 ? 0 : 0.2, s = i === 0 ? 1 : 0.62 + rng() * 0.2, x = Math.cos(a) * d, z = Math.sin(a) * d, C = caps[Math.floor(rng() * caps.length)];
    mb.add(cylG(0.05 * s, 0.07 * s, 0.22 * s, 8), 0xfff1d6, x, 0.11 * s, z, 1, 1, 1, 0, 0, 0, false);
    mb.add(SPH, C, x, 0.24 * s, z, 0.2 * s, 0.13 * s, 0.2 * s);
    for (let k = 0; k < 3; k++) { const t = rng() * 6.28; mb.add(LOWSPH, 0xffffff, x + Math.cos(t) * 0.1 * s, 0.3 * s, z + Math.sin(t) * 0.1 * s, 0.03 * s, 0.02 * s, 0.03 * s, 0, 0, 0, false); }
  }
  return mb;
}

// ---------- the world ----------
export interface WorldOpts {
  W: number; H: number; level: number; biome: number; waypoints: THREE.Vector3[];
  tiles: ('grass' | 'path' | 'blocked')[]; tileCarved: boolean[]; tileX: (c: number) => number; tileZ: (r: number) => number;
}
export interface World {
  group: THREE.Group; biome: Biome; tileCenter: THREE.Vector3[]; pads: THREE.Group;
  crystal: THREE.Mesh; light: THREE.PointLight;
  heightAt(x: number, z: number): number;
  setGrassHole(x: number, z: number, r: number, hidden: boolean): void;
  update(t: number): void; dispose(): void;
}
interface Fld { h: number; s: number; sandMix: number; col: THREE.Color; sand: THREE.Color }
interface InstSet { mesh: THREE.InstancedMesh; xs: Float32Array; zs: Float32Array; base: Float32Array; n: number }
interface CrystalEntry { p: THREE.Vector3; q: THREE.Quaternion; sx: number; sy: number; ci: number }

export function buildWorld(o: WorldOpts): World {
  const { W, H } = o;
  const B = BIOMES[o.biome % BIOMES.length];
  const seed = (o.level * 7 + o.biome * 131 + 11) | 0;
  const rng = mulberry32(seed * 977 + 13);
  const dis: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(d: T) => { dis.push(d); return d; };
  const group = new THREE.Group();
  const wp = o.waypoints; const first = wp[1], end = wp[wp.length - 1];
  const hw = 0.75;
  const timeU = { value: 0 };

  // ----- path distance field -----
  const segs: number[][] = []; for (let i = 0; i < wp.length - 1; i++) segs.push([wp[i].x, wp[i].z, wp[i + 1].x, wp[i + 1].z]);
  const pathDist = (x: number, z: number) => {
    let m = 1e9;
    for (const s of segs) { const dx = s[2] - s[0], dz = s[3] - s[1], t = clamp(((x - s[0]) * dx + (z - s[1]) * dz) / (dx * dx + dz * dz), 0, 1); const d = Math.hypot(s[0] + dx * t - x, s[1] + dz * t - z); if (d < m) m = d; }
    return m;
  };
  const wobble = (x: number, z: number) => (vnoise(x * 2.4, z * 2.4, seed + 5) - 0.5) * 0.3 + (vnoise(x * 7.1, z * 7.1, seed + 9) - 0.5) * 0.1;

  // ----- island outline: rounded rectangle + bumps at the gate and the crystal + organic noise -----
  const hx = W / 2 + 0.75, hz = H / 2 + 0.75, rr = 2.4;
  const sC = { x: wp[0].x + 0.55, z: wp[0].z, r: 1.45 }, eC = { x: end.x + 0.25, z: end.z, r: 1.65 };
  const sdIsland = (x: number, z: number) => {
    const qx = Math.abs(x) - (hx - rr), qz = Math.abs(z) - (hz - rr);
    let d = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - rr;
    d = smin(smin(d, Math.hypot(x - sC.x, z - sC.z) - sC.r, 0.9), Math.hypot(x - eC.x, z - eC.z) - eC.r, 0.9);
    return d + (fbm(x * 0.38 + 3.1, z * 0.38 - 1.7, seed + 21, 3) - 0.5) * 1.1 + (vnoise(x * 1.3, z * 1.3, seed + 23) - 0.5) * 0.28;
  };
  const project = (x: number, z: number): [number, number] => {
    let px = x, pz = z;
    for (let k = 0; k < 3; k++) {
      const s = sdIsland(px, pz), e = 0.03, gx = (sdIsland(px + e, pz) - sdIsland(px - e, pz)) / (2 * e), gz = (sdIsland(px, pz + e) - sdIsland(px, pz - e)) / (2 * e), gl = Math.hypot(gx, gz) || 1;
      px -= (s * gx) / gl; pz -= (s * gz) / gl;
    }
    return [px, pz];
  };

  // ----- ground field: height + colour (grass / lip / sand) -----
  const cG = B.grass.map(h => new THREE.Color(h)), cRim = new THREE.Color(B.rim);
  const cS = B.sand.map(h => new THREE.Color(h)), cLane = new THREE.Color(B.lane);
  const cStrata = B.strata.map(h => new THREE.Color(h)), cTop = new THREE.Color(B.topsoil), cRock = new THREE.Color(B.rock);
  const mkFld = (): Fld => ({ h: 0, s: 0, sandMix: 0, col: new THREE.Color(), sand: new THREE.Color() });
  const field = (x: number, z: number, f: Fld) => {
    const d = pathDist(x, z), s = d + wobble(x, z) - hw; f.s = s;
    const hg = 0.015 + fbm(x * 0.28, z * 0.28, seed + 1, 2) * 0.07;
    const inPath = 1 - ss(-0.12, 0.14, s), lip = ss(-0.02, 0.07, s) * (1 - ss(0.07, 0.26, s));
    f.h = hg + (-0.05 - hg) * inPath + lip * 0.03;
    f.col.copy(cG[1]); // ONE flat grass green everywhere: the floor and every blade of grass share exactly this colour
    const sn = fbm(x * 1.7, z * 1.7, seed + 4, 2);
    f.sand.copy(cS[0]).lerp(cS[1], ss(0.35, 0.7, sn));
    f.sand.lerp(cLane, (1 - ss(0, 0.34, d)) * (0.22 + 0.35 * vnoise(x * 3.2, z * 3.2, seed + 6)));
    f.sand.multiplyScalar(1 - ss(-0.24, -0.03, s) * (1 - ss(-0.03, 0.03, s)) * 0.1);
    f.sandMix = 1 - ss(-0.045, 0.045, s);
    f.col.lerp(f.sand, f.sandMix);
  };
  const rimShade = (c: THREE.Color, u: number) => { c.lerp(cRim, u * 0.55); c.multiplyScalar(1 - u * 0.12); };
  const tmpC = new THREE.Color();
  const DEPTH = 5.4, D = 2.4, GS = 0.14;
  const cliff = (depth: number, qx: number, qz: number, f: Fld, out: THREE.Color) => {
    const n = fbm(qx * 0.7 + qz * 0.5, depth * 1.3, seed + 11, 2), len = cStrata.length;
    out.copy(f.col); rimShade(out, 1);
    const band = depth * 1.5 + (n - 0.5), bi = Math.floor(band), fr = band - bi;
    tmpC.copy(cStrata[((bi % len) + len) % len]).lerp(cStrata[(((bi + 1) % len) + len) % len], ss(0.86, 1, fr));
    tmpC.lerp(cRock, ss(1.0, DEPTH * 0.9, depth) * 0.9); tmpC.multiplyScalar(0.82 + 0.3 * n);
    out.lerp(cTop, ss(0.05, 0.22, depth)); out.lerp(tmpC, ss(0.2, 0.45, depth));
    const sm = f.sandMix * (1 - ss(0.2, 0.6, depth)); if (sm > 0) out.lerp(f.sand, sm * 0.95);
  };
  const hf = mkFld(); const heightAt = (x: number, z: number) => { field(x, z, hf); return hf.h; };

  // ----- ONE terrain mesh: grass top rolls over the rim into a tapered cliff -----
  const bx = Math.max(hx, Math.abs(sC.x) + sC.r, Math.abs(eC.x) + eC.r) + 0.7 + D, bz = hz + 0.7 + D;
  const nx = Math.ceil((2 * bx) / GS) + 1, nz = Math.ceil((2 * bz) / GS) + 1;
  const pos = new Float32Array(nx * nz * 3), colArr = new Float32Array(nx * nz * 3), idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  const f = mkFld(), c2 = new THREE.Color();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = -bx + i * GS, z = -bz + j * GS, k = j * nx + i, sI = sdIsland(x, z);
    let px = x, py = 0, pz = z;
    if (sI <= 0) {
      field(x, z, f); const u = ss(-0.85, 0, sI); py = f.h - u * u * 0.34; c2.copy(f.col); rimShade(c2, u);
    } else if (sI < D) {
      const q = project(x, z); field(q[0], q[1], f); const t = sI / D, depth = DEPTH * (1 - Math.pow(1 - t, 1.7)), rho = Math.pow(1 - t, 0.7);
      px = q[0] * rho; pz = q[1] * rho; py = f.h - 0.34 - depth; cliff(depth, q[0], q[1], f, c2);
    } else { px = 0; pz = 0; py = -0.3 - DEPTH; c2.copy(cRock).multiplyScalar(0.8); }
    pos[k * 3] = px; pos[k * 3 + 1] = py; pos[k * 3 + 2] = pz; colArr[k * 3] = c2.r; colArr[k * 3 + 1] = c2.g; colArr[k * 3 + 2] = c2.b;
  }
  let ii = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx[ii++] = a; idx[ii++] = c; idx[ii++] = b; idx[ii++] = b; idx[ii++] = c; idx[ii++] = d; }
  const tGeo = track(new THREE.BufferGeometry());
  tGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3)); tGeo.setIndex(new THREE.BufferAttribute(idx, 1)); tGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(tGeo, track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }))); terrain.receiveShadow = true; group.add(terrain);

  // ----- cell centres (towers snap here; cells next to the road shrink a bit) -----
  const isPathCell = (c: number, r: number) => c >= 0 && c < W && r >= 0 && r < H && o.tiles[r * W + c] === 'path';
  const tileCenter: THREE.Vector3[] = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    let x = o.tileX(c), z = o.tileZ(r);
    if (o.tiles[r * W + c] !== 'path') { if (isPathCell(c - 1, r)) x += 0.125; if (isPathCell(c + 1, r)) x -= 0.125; if (isPathCell(c, r - 1)) z += 0.125; if (isPathCell(c, r + 1)) z -= 0.125; }
    tileCenter.push(new THREE.Vector3(x, heightAt(x, z), z));
  }

  // ----- props: trees, boulders, bushes, mushrooms, crystals -----
  const protoCache = new Map<string, Proto[]>();
  const protos = (kind: TreeKind) => {
    let a = protoCache.get(kind);
    if (!a) {
      a = []; const n = 3;
      for (let i = 0; i < n; i++) {
        const p = kind === 'round' ? roundTree(rng, B.leaf, B.trunk, B.fruit) : kind === 'blossom' ? roundTree(rng, B.blossom, new THREE.Color(B.trunk).offsetHSL(0, 0, -0.05).getHex(), [0xffffff, 0xffe066])
          : kind === 'pine' ? pineTree(rng, B.pine, B.trunk, !!B.snow) : kind === 'lolly' ? lollyTree(rng, B.candy, B.fruit) : mushroomTree(rng, B.cap);
        for (const g of [p.trunk.geo, p.trunk.ol, p.canopy.geo, p.canopy.ol]) track(g); if (p.glow) track(p.glow);
        a.push(p);
      }
      protoCache.set(kind, a);
    }
    return a;
  };
  const sway: { piv: THREE.Object3D; ph: number; amp: number }[] = [];
  const crystals: CrystalEntry[] = []; const glows: { p: THREE.Vector3; ci: number }[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const placeAt = (obj: THREE.Object3D, x: number, z: number, yaw: number, s: number) => { obj.position.set(x, heightAt(x, z) - 0.02, z); obj.rotation.y = yaw; obj.scale.setScalar(s); group.add(obj); };
  const addTree = (kind: TreeKind, x: number, z: number) => {
    const p = protos(kind)[Math.floor(rng() * 3)]; const g = new THREE.Group();
    const tm = new THREE.Mesh(p.trunk.geo, VC_MAT); tm.castShadow = true; g.add(tm); g.add(new THREE.Mesh(p.trunk.ol, OUTLINE_MAT));
    const piv = new THREE.Group(); piv.position.y = p.pivotY; g.add(piv);
    const cm = new THREE.Mesh(p.canopy.geo, VC_MAT); cm.castShadow = true; piv.add(cm); piv.add(new THREE.Mesh(p.canopy.ol, OUTLINE_MAT)); if (p.glow) piv.add(new THREE.Mesh(p.glow, GLOW_VC));
    sway.push({ piv, ph: rng() * 6.28, amp: 0.022 + rng() * 0.02 });
    placeAt(g, x, z, rng() * 6.28, (kind === 'mushroom' ? 0.78 : 0.74) + rng() * 0.26);
  };
  const addStatic = (mb: MB, x: number, z: number, s: number) => { const b = mb.build(); track(b.geo); track(b.ol); placeAt(staticGroup(b), x, z, rng() * 6.28, s); };
  const addCrystal = (x: number, z: number, s: number) => {
    const n = 3 + Math.floor(rng() * 3), ci = Math.floor(rng() * B.crystal.length), y0 = heightAt(x, z);
    for (let i = 0; i < n; i++) {
      const a = rng() * 6.28, d = i === 0 ? 0 : 0.12 + rng() * 0.14, tilt = i === 0 ? 0 : 0.25 + rng() * 0.35, sy = (0.36 + rng() * 0.3) * s, sx = (0.14 + rng() * 0.07) * s;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt));
      crystals.push({ p: new THREE.Vector3(x + Math.cos(a) * d, y0 + sy * 0.75, z + Math.sin(a) * d), q, sx, sy, ci: i % 3 === 2 ? (ci + 1) % B.crystal.length : ci });
    }
    glows.push({ p: new THREE.Vector3(x, y0 + 0.3, z), ci });
  };
  const addDecor = (kind: 'tree' | 'boulder' | 'bush' | 'shroom' | 'crystal', x: number, z: number) => {
    if (kind === 'tree') { let r = rng() * B.trees.reduce((a, t) => a + t[1], 0), tk = B.trees[0][0]; for (const [k, w] of B.trees) { if ((r -= w) <= 0) { tk = k; break; } } addTree(tk, x, z); }
    else if (kind === 'boulder') addStatic(boulderMB(rng, B.stone, B.moss), x, z, 0.8 + rng() * 0.45);
    else if (kind === 'bush') addStatic(bushMB(rng, B.leaf, B.fruit), x, z, 0.85 + rng() * 0.4);
    else if (kind === 'shroom') addStatic(mushroomsMB(rng, B.cap), x, z, 0.9 + rng() * 0.5);
    else addCrystal(x, z, 0.85 + rng() * 0.45);
  };
  const pick = (w: [string, number][]) => { let r = rng() * w.reduce((a, t) => a + t[1], 0); for (const [k, v] of w) { if ((r -= v) <= 0) return k; } return w[0][0]; };
  type DK = 'tree' | 'boulder' | 'bush' | 'shroom' | 'crystal';
  // blocked cells (these are the tiles you can't build on) – trees stay out of the 3 southern rows so they never hide towers
  const cand: number[] = []; for (let i = 0; i < W * H; i++) if (o.tiles[i] === 'grass' && !o.tileCarved[i]) cand.push(i);
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  const placed: { x: number; z: number }[] = [];
  for (const i of cand.slice(0, 16)) {
    o.tiles[i] = 'blocked'; const c = i % W, r = (i / W) | 0, cx = o.tileX(c) + (rng() - 0.5) * 0.3, cz = o.tileZ(r) + (rng() - 0.5) * 0.3;
    const south = cz > 2.2;
    const k = pick(south ? [['boulder', 0.35], ['bush', 0.25], ['shroom', 0.15], ['crystal', 0.25]] : [['tree', 0.56], ['boulder', 0.16], ['bush', 0.1], ['shroom', 0.08], ['crystal', 0.1]]) as DK;
    addDecor(k, cx, cz); placed.push({ x: cx, z: cz });
  }
  // rim props outside the playfield make the island feel lived-in
  let rimN = 0;
  for (let a = 0; a < 700 && rimN < 26; a++) {
    const x = (rng() - 0.5) * 2 * (hx + 1.2), z = (rng() - 0.5) * 2 * (hz + 0.4);
    if (Math.abs(x) < W / 2 + 0.05 && Math.abs(z) < H / 2 + 0.05) continue;
    if (sdIsland(x, z) > -0.55 || pathDist(x, z) < hw + 0.85) continue;
    if (Math.hypot(x - first.x, z - first.z) < 1.9 || Math.hypot(x - end.x, z - end.z) < 1.9) continue;
    if (placed.some(p => Math.hypot(p.x - x, p.z - z) < 0.95)) continue;
    const lowOnly = z > 1.5;
    const k = pick(lowOnly ? [['boulder', 0.3], ['bush', 0.3], ['shroom', 0.2], ['crystal', 0.2]] : [['tree', 0.55], ['boulder', 0.12], ['bush', 0.13], ['shroom', 0.08], ['crystal', 0.12]]) as DK;
    addDecor(k, x, z); placed.push({ x, z }); rimN++;
  }

  // ----- grass tufts (wind) -----
  const instSets: InstSet[] = [];
  const mkInst = (mesh: THREE.InstancedMesh, xs: number[], zs: number[]) => {
    mesh.count = xs.length; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    instSets.push({ mesh, xs: Float32Array.from(xs), zs: Float32Array.from(zs), base: (mesh.instanceMatrix.array as Float32Array).slice(0, xs.length * 16), n: xs.length }); group.add(mesh);
  };
  {
    const MAX = 3600; const geo = track(tuftGeo());
    const mat = track(windMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }), 1, timeU, true));
    const im = new THREE.InstancedMesh(geo, mat, MAX); im.receiveShadow = true; im.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3(), col = new THREE.Color();
    const xs: number[] = [], zs: number[] = []; const fl = mkFld();
    const addTuft = (x: number, z: number) => {
      if (xs.length >= MAX) return;
      field(x, z, fl); const s = 0.2 + rng() * 0.18, k = xs.length;
      e.set((rng() - 0.5) * 0.25, rng() * 6.28, (rng() - 0.5) * 0.25); q.setFromEuler(e); pv.set(x, fl.h - 0.01, z); sv.set(s * (0.85 + rng() * 0.5), s * (0.9 + rng() * 0.5), s * (0.85 + rng() * 0.5));
      im.setMatrixAt(k, m4.compose(pv, q, sv));
      // exactly the floor colour at this spot (only a barely-visible lightness wobble so it doesn't look painted on)
      col.copy(fl.col).offsetHSL(0, 0, (rng() - 0.5) * 0.02);
      im.setColorAt(k, col); xs.push(x); zs.push(z);
    };
    for (let a = 0; a < 7500 && xs.length < 3000; a++) {
      const x = (rng() - 0.5) * 2 * (hx + 1.4), z = (rng() - 0.5) * 2 * (hz + 0.8);
      if (sdIsland(x, z) > -0.3) continue; const s = pathDist(x, z) + wobble(x, z) - hw; if (s < 0.02) continue;
      const clump = fbm(x * 0.5, z * 0.5, seed + 31, 2); if (rng() > (s < 0.4 ? 0.9 : 0.22 + 0.78 * ss(0.3, 0.7, clump))) continue;
      addTuft(x, z);
    }
    // soft, natural grass fringe along both sides of the road (so the edge is never a hard line)
    for (const sg of segs) {
      const dx = sg[2] - sg[0], dz = sg[3] - sg[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
      for (let t = 0; t < L; t += 0.1) for (const side of [-1, 1]) {
        const off = hw + (rng() - 0.55) * 0.3, x = sg[0] + ux * t - uz * off * side, z = sg[1] + uz * t + ux * off * side;
        if (sdIsland(x, z) > -0.25 || pathDist(x, z) < hw - 0.1 || rng() < 0.35) continue; addTuft(x, z);
      }
    }
    mkInst(im, xs, zs);
  }
  // ----- flowers -----
  for (let ci = 0; ci < B.flowers.length; ci++) {
    const geo = track(flowerGeo(B.flowers[ci])); const mat = track(windMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), 0.55, timeU));
    const im = new THREE.InstancedMesh(geo, mat, 80); im.frustumCulled = false; const xs: number[] = [], zs: number[] = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
    for (let cl = 0; cl < 4; cl++) {
      let cx = 0, cz = 0, ok = false;
      for (let a = 0; a < 40 && !ok; a++) { cx = (rng() - 0.5) * 2 * hx; cz = (rng() - 0.5) * 2 * hz; ok = sdIsland(cx, cz) < -0.8 && pathDist(cx, cz) > hw + 0.5; }
      if (!ok) continue;
      const n = 4 + Math.floor(rng() * 4);
      for (let k = 0; k < n && xs.length < 80; k++) {
        const x = cx + (rng() - 0.5) * 1.1, z = cz + (rng() - 0.5) * 1.1; if (sdIsland(x, z) > -0.5 || pathDist(x, z) < hw + 0.3) continue;
        const s = 0.32 + rng() * 0.2; q.setFromAxisAngle(up, rng() * 6.28); pv.set(x, heightAt(x, z) - 0.01, z); sv.set(s, s * (0.9 + rng() * 0.3), s);
        im.setMatrixAt(xs.length, m4.compose(pv, q, sv)); xs.push(x); zs.push(z);
      }
    }
    mkInst(im, xs, zs);
  }
  // ----- pebbles along the road -----
  {
    const MAXP = 190, im = new THREE.InstancedMesh(LOWSPH, track(new THREE.MeshStandardMaterial({ roughness: 0.9 })), MAXP); im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3(), col = new THREE.Color(); let n = 0;
    for (let a = 0; a < 1200 && n < MAXP; a++) {
      const sg = segs[Math.floor(rng() * segs.length)], t = rng(), side = rng() < 0.5 ? -1 : 1, dx = sg[2] - sg[0], dz = sg[3] - sg[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
      const off = rng() < 0.7 ? hw - 0.04 - rng() * 0.32 : hw + 0.05 + rng() * 0.12, x = sg[0] + dx * t - uz * off * side, z = sg[1] + dz * t + ux * off * side;
      if (sdIsland(x, z) > -0.3 || pathDist(x, z) < hw - 0.4) continue;
      const s = 0.035 + rng() * 0.06; q.setFromAxisAngle(up, rng() * 6.28); pv.set(x, heightAt(x, z) + s * 0.25, z); sv.set(s * 1.2, s * 0.6, s);
      im.setMatrixAt(n, m4.compose(pv, q, sv)); col.setHex(B.pebble[Math.floor(rng() * B.pebble.length)]); im.setColorAt(n, col); n++;
    }
    im.count = n; group.add(im);
  }
  // (no crystals on the cliff / underside of the island – only the ones standing on the grass above remain)
  // instanced crystal meshes (shared pulsing materials) + dark outline hulls
  const crysMats = B.crystal.map(c => track(new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8, roughness: 0.25 })));
  for (let ci = 0; ci < B.crystal.length; ci++) {
    const list = crystals.filter(c => c.ci === ci); if (!list.length) continue;
    const im = new THREE.InstancedMesh(OCT, crysMats[ci], list.length), hull = new THREE.InstancedMesh(OCT, OUTLINE_MAT, list.length), m4 = new THREE.Matrix4(), sv = new THREE.Vector3();
    im.castShadow = true; im.frustumCulled = false; hull.frustumCulled = false;
    list.forEach((c, i) => { im.setMatrixAt(i, m4.compose(c.p, c.q, sv.set(c.sx, c.sy, c.sx))); hull.setMatrixAt(i, m4.compose(c.p, c.q, sv.set(c.sx * 1.22 + 0.02, c.sy * 1.1 + 0.02, c.sx * 1.22 + 0.02))); });
    group.add(im, hull);
  }
  const glowTex = track(glowTexture()); const sprites: { s: THREE.Sprite; ph: number }[] = [];
  for (const g of glows) {
    const s = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTex, color: B.crystal[g.ci], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 })));
    s.position.copy(g.p); s.scale.setScalar(1.7); group.add(s); sprites.push({ s, ph: rng() * 6.28 });
  }

  // ----- build-spot hints: soft rings (NOT a grid – just little "pads" showing where a tower fits) -----
  const pads = new THREE.Group(); group.add(pads);
  const padMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false }));
  {
    const spots: THREE.Vector3[] = []; for (let i = 0; i < W * H; i++) if (o.tiles[i] === 'grass') spots.push(tileCenter[i]);
    const rings = new THREE.InstancedMesh(RING, padMat, Math.max(1, spots.length)), dots = new THREE.InstancedMesh(DISC, padMat, Math.max(1, spots.length));
    const m4 = new THREE.Matrix4(), pv = new THREE.Vector3(), q = new THREE.Quaternion(), sv = new THREE.Vector3();
    spots.forEach((p, i) => { pv.set(p.x, p.y + 0.045, p.z); rings.setMatrixAt(i, m4.compose(pv, q, sv.set(0.32, 1, 0.32))); dots.setMatrixAt(i, m4.compose(pv, q, sv.set(0.075, 1, 0.075))); });
    rings.count = dots.count = spots.length; rings.frustumCulled = dots.frustumCulled = false; pads.add(rings, dots);
  }

  // ----- clouds, floating rocks, fireflies -----
  const cloudMat = track(new THREE.MeshStandardMaterial({ color: B.cloud, roughness: 1, emissive: B.cloud, emissiveIntensity: 0.35 }));
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(), n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) { const s = 0.7 + rng() * 0.8, m = new THREE.Mesh(SPH, cloudMat); m.scale.set(s * 1.25, s * 0.75, s); m.position.set(k * 0.9 - n * 0.4, rng() * 0.3, (rng() - 0.5) * 0.5); g.add(m); }
    g.position.set((rng() - 0.5) * 46, -4.8 - rng() * 4.5, (rng() - 0.5) * 30); g.userData.cloud = true; g.userData.speed = 0.2 + rng() * 0.3; group.add(g);
  }
  const rocks: { m: THREE.Group; y0: number; ph: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const mb = boulderMB(rng, B.strata[i % B.strata.length], undefined), b = mb.build(); track(b.geo); track(b.ol); const g = staticGroup(b); g.scale.setScalar(0.5 + rng() * 0.5);
    const side = rng() < 0.5 ? -1 : 1; g.position.set(side * (8 + rng() * 4), -3.6 - rng() * 3.2, (rng() - 0.3) * 9); g.rotation.set(rng(), rng() * 6, rng()); group.add(g); rocks.push({ m: g, y0: g.position.y, ph: rng() * 6.28 });
  }
  const FLY = 34, flyMat = track(new THREE.MeshBasicMaterial({ color: B.fly })), haloMat = track(new THREE.MeshBasicMaterial({ color: B.fly, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  const flies = new THREE.InstancedMesh(LOWSPH, flyMat, FLY), halos = new THREE.InstancedMesh(LOWSPH, haloMat, FLY); flies.frustumCulled = halos.frustumCulled = false; group.add(flies, halos);
  const fb: { x: number; y: number; z: number; ph: number }[] = [];
  for (let i = 0; i < FLY; i++) { let x = 0, z = 0; for (let a = 0; a < 20; a++) { x = (rng() - 0.5) * 2 * hx; z = (rng() - 0.5) * 2 * hz; if (sdIsland(x, z) < -0.8) break; } fb.push({ x, y: 0.5 + rng() * 1.4, z, ph: rng() * 6.28 }); }

  // ----- leaves / petals / snowflakes / sprinkles drifting down (the colours depend on the biome) -----
  const FALL = 46;
  const fallCols = B.snow ? [0xffffff, 0xe4f6ff, 0xc9ecff] : B.name === 'Negeri Permen' ? B.candy.concat([0xffffff]) : B.name === 'Musim Gugur' ? B.leaf : B.name === 'Hutan Kristal' ? B.crystal : B.blossom.concat(B.leaf);
  const fallers = new THREE.InstancedMesh(LOWSPH, track(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), FALL); fallers.frustumCulled = false; group.add(fallers);
  const fl: { x: number; z: number; ph: number; sp: number; sz: number; dr: number }[] = []; const fcol = new THREE.Color();
  for (let i = 0; i < FALL; i++) { fl.push({ x: (rng() - 0.5) * 2 * hx, z: (rng() - 0.5) * 2 * hz, ph: rng() * 6.28, sp: B.snow ? 0.35 + rng() * 0.3 : 0.45 + rng() * 0.4, sz: B.snow ? 0.03 + rng() * 0.025 : 0.05 + rng() * 0.04, dr: 0.4 + rng() * 0.7 }); fcol.setHex(fallCols[i % fallCols.length]); fallers.setColorAt(i, fcol); }
  const fEu = new THREE.Euler(), fQ = new THREE.Quaternion();

  // ----- spawn gate: stone arch with a swirling portal -----
  const stoneMat = track(new THREE.MeshStandardMaterial({ color: 0xb4bccd, roughness: 0.85 })), runeMat = track(new THREE.MeshStandardMaterial({ color: B.crystal[0], emissive: B.crystal[0], emissiveIntensity: 1, roughness: 0.3 }));
  const gate = new THREE.Group(); gate.position.set(first.x - 0.35, heightAt(first.x - 0.35, first.z) - 0.02, first.z); gate.scale.setScalar(0.85); group.add(gate);
  const olMesh = (geo: THREE.BufferGeometry, k: number, p: THREE.Vector3, rot?: THREE.Euler) => { const m = new THREE.Mesh(geo, OUTLINE_MAT); m.scale.setScalar(k); m.position.copy(p); if (rot) m.rotation.copy(rot); gate.add(m); };
  const pillarG = track(new THREE.CylinderGeometry(0.17, 0.21, 1.3, 12)), capG = track(new THREE.SphereGeometry(0.23, 12, 10));
  for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(pillarG, stoneMat); p.position.set(0, 0.65, sz * 0.92); p.castShadow = true; gate.add(p); olMesh(pillarG, 1.1, p.position);
    const c = new THREE.Mesh(capG, stoneMat); c.position.set(0, 1.36, sz * 0.92); c.castShadow = true; gate.add(c); olMesh(capG, 1.1, c.position);
    const r = new THREE.Mesh(LOWSPH, runeMat); r.scale.setScalar(0.07); r.position.set(0.19, 0.75, sz * 0.92); gate.add(r);
  }
  const archG = track(new THREE.TorusGeometry(0.92, 0.1, 8, 24, Math.PI)); const arch = new THREE.Mesh(archG, stoneMat); arch.position.y = 1.3; arch.rotation.y = Math.PI / 2; arch.castShadow = true; gate.add(arch); olMesh(archG, 1.12, arch.position, arch.rotation);
  const swTex = track(swirlTexture()); const portalPivot = new THREE.Group(); portalPivot.position.y = 1.18; portalPivot.rotation.y = Math.PI / 2; gate.add(portalPivot);
  const portalG = track(new THREE.CircleGeometry(0.98, 28)); const portal = new THREE.Mesh(portalG, track(new THREE.MeshBasicMaterial({ map: swTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }))); portalPivot.add(portal);

  // ----- the castle keep at the finish: ONE big gem floating on top + FOUR gems, one on each side of the tower -----
  const base = new THREE.Group(); base.position.set(end.x, heightAt(end.x, end.z) - 0.02, end.z); base.scale.setScalar(0.8); group.add(base);
  const unitBox = track(new THREE.BoxGeometry(1, 1, 1));
  const wallMat = track(new THREE.MeshStandardMaterial({ color: 0xece6fa, roughness: 0.85 }));
  const bandMat = track(new THREE.MeshStandardMaterial({ color: 0xbdb0e0, roughness: 0.85 }));
  const goldMat = track(new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.35, roughness: 0.35 }));
  const doorMat = track(new THREE.MeshStandardMaterial({ color: 0x4a2f6b, roughness: 0.7 }));
  const winMat = track(new THREE.MeshBasicMaterial({ color: 0xfff0a8 }));
  const keepPart = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, ol = 1.07) => {
    const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; base.add(me);
    const o2 = new THREE.Mesh(g, OUTLINE_MAT); o2.position.set(x, y, z); o2.scale.set(ol, 1.03, ol); base.add(o2); return me;
  };
  const keepCyl = (rt: number, rb: number, h: number) => track(new THREE.CylinderGeometry(rt, rb, h, 22));
  keepPart(keepCyl(0.86, 0.96, 0.2), bandMat, 0, 0.1, 0);       // foundation
  keepPart(keepCyl(0.55, 0.66, 1.3), wallMat, 0, 0.85, 0);      // tower body
  keepPart(keepCyl(0.72, 0.6, 0.22), bandMat, 0, 1.61, 0);      // parapet ring
  for (const [R, y] of [[0.655, 0.5], [0.585, 1.2]] as [number, number][]) { const t2 = new THREE.Mesh(track(new THREE.TorusGeometry(R, 0.04, 6, 28)), goldMat); t2.rotation.x = Math.PI / 2; t2.position.y = y; base.add(t2); }
  const rune = new THREE.Mesh(track(new THREE.TorusGeometry(0.9, 0.03, 6, 32)), runeMat); rune.rotation.x = Math.PI / 2; rune.position.y = 0.21; base.add(rune);
  const merlonG = track(new THREE.BoxGeometry(0.22, 0.22, 0.17));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, px = Math.sin(a) * 0.66, pz = Math.cos(a) * 0.66;
    const mr = new THREE.Mesh(merlonG, wallMat); mr.position.set(px, 1.83, pz); mr.rotation.y = a; mr.castShadow = true; base.add(mr);
    const mo = new THREE.Mesh(merlonG, OUTLINE_MAT); mo.position.copy(mr.position); mo.rotation.y = a; mo.scale.setScalar(1.14); base.add(mo);
  }
  const roofFloor = new THREE.Mesh(track(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 22)), bandMat); roofFloor.position.y = 1.73; base.add(roofFloor);
  keepPart(keepCyl(0.2, 0.27, 0.16), goldMat, 0, 1.83, 0, 1.1);  // pedestal under the big gem
  // arched door facing WEST – the road arrives from the west, so the orcs walk straight into the door
  const door = new THREE.Group(); door.rotation.y = -Math.PI / 2; base.add(door);
  const dBox = new THREE.Mesh(unitBox, doorMat); dBox.scale.set(0.34, 0.4, 0.12); dBox.position.set(0, 0.42, 0.62); door.add(dBox);
  const dTop = new THREE.Mesh(SPH, doorMat); dTop.scale.set(0.17, 0.17, 0.06); dTop.position.set(0, 0.62, 0.62); door.add(dTop);
  const dStep = new THREE.Mesh(unitBox, goldMat); dStep.scale.set(0.46, 0.05, 0.14); dStep.position.set(0, 0.215, 0.66); door.add(dStep);
  const dKnob = new THREE.Mesh(SPH, goldMat); dKnob.scale.setScalar(0.03); dKnob.position.set(0.09, 0.42, 0.69); door.add(dKnob);
  // glowing little windows on the diagonals
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, wx = Math.sin(a) * 0.605, wz = Math.cos(a) * 0.605;
    const w = new THREE.Mesh(unitBox, winMat); w.scale.set(0.12, 0.2, 0.05); w.position.set(wx, 0.95, wz); w.rotation.y = a; base.add(w);
    const wt = new THREE.Mesh(SPH, winMat); wt.scale.set(0.06, 0.06, 0.03); wt.position.set(wx, 1.05, wz); wt.rotation.y = a; base.add(wt);
  }
  // FOUR gems, one on each side of the tower (north / east / south / west), each in a gold cradle with a soft glow
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, side = new THREE.Group(); side.rotation.y = a; base.add(side);
    const holder = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.065, 0.26, 10)), goldMat); holder.rotation.x = Math.PI / 2; holder.position.set(0, 1.04, 0.66); side.add(holder);
    const cup = new THREE.Mesh(track(new THREE.TorusGeometry(0.12, 0.03, 6, 16)), goldMat); cup.rotation.x = Math.PI / 2; cup.position.set(0, 0.92, 0.8); side.add(cup);
    const gem = new THREE.Mesh(OCT, crysMats[k % crysMats.length]); gem.scale.set(0.2, 0.34, 0.2); gem.position.set(0, 1.1, 0.8); gem.castShadow = true; side.add(gem);
    const gh = new THREE.Mesh(OCT, OUTLINE_MAT); gh.scale.set(0.25, 0.38, 0.25); gh.position.copy(gem.position); side.add(gh);
    const sp = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTex, color: B.crystal[k % B.crystal.length], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 })));
    sp.position.set(Math.sin(a) * 0.8, 1.1, Math.cos(a) * 0.8); sp.scale.setScalar(0.9); base.add(sp); sprites.push({ s: sp, ph: k * 1.7 });
  }
  // little flag on the battlements
  const flagPole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6)), bandMat); flagPole.position.set(-0.42, 2.12, -0.42); base.add(flagPole);
  const flag = new THREE.Group(); flag.position.set(-0.42, 2.38, -0.42);
  const flagCloth = new THREE.Mesh(unitBox, goldMat); flagCloth.scale.set(0.34, 0.2, 0.03); flagCloth.position.x = 0.18; flag.add(flagCloth); base.add(flag);
  // the ONE big gem floating in the middle on top
  const crystal = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.5)), track(new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0x9b5cff, emissiveIntensity: 0.9, roughness: 0.3 })));
  crystal.scale.set(0.9, 1.45, 0.9); crystal.position.y = 2.68; crystal.userData.y0 = 2.68; crystal.castShadow = true; base.add(crystal);
  const cOl = new THREE.Mesh(crystal.geometry, OUTLINE_MAT); cOl.scale.setScalar(1.1); crystal.add(cOl);
  const topGlow = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTex, color: 0xc084fc, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 })));
  topGlow.position.y = 2.68; topGlow.scale.setScalar(2.2); base.add(topGlow); sprites.push({ s: topGlow, ph: 0.5 });
  const light = new THREE.PointLight(0xa855f7, 2.5, 5); light.position.y = 2.7; base.add(light);
  const shards: THREE.Mesh[] = []; for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(OCT, crysMats[i % crysMats.length]); s.scale.set(0.06, 0.12, 0.06); base.add(s); shards.push(s); }

  // ----- per-frame animation (real time, independent of the 2x/4x game speed) -----
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  const update = (t: number) => {
    timeU.value = t;
    for (const s of sway) { s.piv.rotation.z = Math.sin(t * 1.3 + s.ph) * s.amp; s.piv.rotation.x = Math.cos(t * 1.1 + s.ph * 1.7) * s.amp * 0.7; s.piv.scale.y = 1 + Math.sin(t * 2.1 + s.ph) * 0.012; }
    crysMats.forEach((m, i) => { m.emissiveIntensity = 0.75 + Math.sin(t * 2 + i * 2) * 0.25; });
    for (const s of sprites) (s.s.material as THREE.SpriteMaterial).opacity = 0.42 + Math.sin(t * 1.8 + s.ph) * 0.18;
    for (let i = 0; i < FLY; i++) {
      const b = fb[i], x = b.x + Math.sin(t * 0.5 + b.ph) * 0.6, y = b.y + Math.sin(t * 0.8 + b.ph * 2) * 0.25, z = b.z + Math.cos(t * 0.45 + b.ph) * 0.6, k = 0.035 * (0.5 + 0.5 * Math.max(0, Math.sin(t * 2.6 + b.ph * 5)) + 0.2);
      pv.set(x, y, z); flies.setMatrixAt(i, m4.compose(pv, q0, sv.setScalar(k))); halos.setMatrixAt(i, m4.compose(pv, q0, sv.setScalar(k * 4.5)));
    }
    flies.instanceMatrix.needsUpdate = true; halos.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < FALL; i++) { // falling leaves / petals / snow: swaying + tumbling drift, shrinking at both ends so nothing pops in or out
      const f = fl[i], u = (t * f.sp * 0.28 + f.ph) % 1, fade = Math.min(1, u * 6, (1 - u) * 6);
      pv.set(f.x + Math.sin(t * f.dr + f.ph) * 0.55 + u * 0.6, 3.4 * (1 - u) + 0.04, f.z + Math.cos(t * f.dr * 0.8 + f.ph) * 0.4);
      fEu.set(t * 1.4 + f.ph, t * 0.9 + f.ph * 2, Math.sin(t * 2 + f.ph) * 0.8); fQ.setFromEuler(fEu);
      const sz = f.sz * fade; fallers.setMatrixAt(i, m4.compose(pv, fQ, B.snow ? sv.set(sz, sz, sz) : sv.set(sz * 1.6, sz * 0.3, sz)));
    }
    fallers.instanceMatrix.needsUpdate = true;
    for (const r of rocks) { r.m.position.y = r.y0 + Math.sin(t * 0.7 + r.ph) * 0.18; r.m.rotation.y += 0.002; }
    flag.rotation.y = Math.sin(t * 3) * 0.3; portal.rotation.z = t * 1.1; portalPivot.scale.setScalar(1 + Math.sin(t * 2.4) * 0.025);
    runeMat.emissiveIntensity = 0.8 + Math.sin(t * 2.2) * 0.3; padMat.opacity = 0.32 + Math.sin(t * 2) * 0.1;
    shards.forEach((s, i) => { const a = t * 1.1 + (i * Math.PI) / 2; s.position.set(Math.cos(a) * 0.78, 2.68 + Math.sin(t * 2 + i) * 0.14, Math.sin(a) * 0.78); s.rotation.y = a * 2; });
  };

  return {
    group, biome: B, tileCenter, pads, crystal, light, heightAt, update,
    setGrassHole(x, z, r, hidden) {
      for (const st of instSets) {
        const arr = st.mesh.instanceMatrix.array as Float32Array; let ch = false;
        for (let i = 0; i < st.n; i++) {
          const dx = st.xs[i] - x, dz = st.zs[i] - z; if (dx * dx + dz * dz >= r * r) continue; ch = true;
          if (hidden) { for (const e of [0, 1, 2, 4, 5, 6, 8, 9, 10]) arr[i * 16 + e] = 0; } else arr.set(st.base.subarray(i * 16, i * 16 + 16), i * 16);
        }
        if (ch) st.mesh.instanceMatrix.needsUpdate = true;
      }
    },
    dispose() { group.parent?.remove(group); for (const d of dis) d.dispose(); for (const st of instSets) st.mesh.dispose(); },
  };
}
