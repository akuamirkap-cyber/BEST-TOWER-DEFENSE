import * as THREE from 'three';
import { Sfx } from './sfx';
import type { MusicMode } from './sfx';
import { BOX, RING, DISC, mat, mkBox, mkSphere, makeFlame, flickerFlame, updateFace } from './voxel';
import { buildTowerModel, MUZZLE, makeBoomerang, spiralTexture } from './towers';
import { makeKnight, poseKnight } from './knights';
import { makeBee, makeNeedle, makeHeart, makeHeartArrow, makeBowlingBall, makeHook } from './critters';
import { buildElite, isElite, poseElite, poseDread, setBowDraw, makeArrow } from './elites';
import { Ragdoll } from './ragdoll';
import { buildDragon } from './dragon';
import type { IdleArc } from './towers';
import { Bolt, PLASMA_STYLE, TESLA_STYLE } from './lightning';
import type { BoltStyle } from './lightning';
import { buildBalloon } from './balloon';
import { ENEMY_INFO, slotsFor, SUGGESTED } from './roster';
import type { PreviewModel } from './horde';
import type { RosterEntry } from './roster';
import { buildWorld, makeSkyTexture, BIOMES } from './world';
import type { World } from './world';
import { buildOrc, buildLog, poseOrc } from './orcs';
import type { OrcKind } from './orcs';

export type TowerType = 'cannon' | 'frost' | 'blaster' | 'tesla' | 'sniper' | 'poison' | 'banner' | 'flame' | 'trap' | 'repair' | 'shield' | 'plasma' | 'piggy' | 'wind' | 'boomer' | 'mine' | 'cactus' | 'hive' | 'golem' | 'clock' | 'prism' | 'cupid' | 'hook' | 'bowl' | 'barracks' | 'mind' | 'vortex' | 'meteor' | 'orbital' | 'siren' | 'naga' | 'storm' | 'quake' | 'glacier';
export interface TowerDef {
  name: string; cost: number; dmg: number; range: number; rate: number;
  color: number; accent: number; desc: string; icon: string; air: boolean; ground: boolean; tag: string;
}
export const TOWER_DEFS: Record<TowerType, TowerDef> = {
  cannon: { name: 'Meriam', cost: 50, dmg: 12, range: 2.8, rate: 0.5, color: 0x4f8cff, accent: 0x2b5fd9, desc: 'Cepat, murah', icon: '🔵', air: false, ground: true, tag: 'Darat' },
  frost: { name: 'Es', cost: 70, dmg: 5, range: 2.6, rate: 0.35, color: 0x8ff0ff, accent: 0x3fc9e8, desc: 'Sinar pelambat', icon: '❄️', air: true, ground: true, tag: 'Slow' },
  blaster: { name: 'Mortir', cost: 110, dmg: 34, range: 3.6, rate: 1.6, color: 0xff8a4c, accent: 0xe8552b, desc: 'Ledakan area', icon: '💥', air: false, ground: true, tag: 'Darat·Area' },
  tesla: { name: 'Tesla', cost: 120, dmg: 14, range: 2.6, rate: 0.9, color: 0xc084fc, accent: 0x7c3aed, desc: 'Petir berantai', icon: '⚡', air: true, ground: true, tag: 'Rantai' },
  sniper: { name: 'Sniper', cost: 140, dmg: 60, range: 5.2, rate: 2.2, color: 0x34d399, accent: 0x0f766e, desc: 'Jauh, tembus armor', icon: '🎯', air: true, ground: true, tag: 'Anti-Armor' },
  poison: { name: 'Racun', cost: 90, dmg: 4, range: 3.0, rate: 1.4, color: 0xa3e635, accent: 0x4d7c0f, desc: 'Genangan racun', icon: '☠️', air: false, ground: true, tag: 'Darat·DoT' },
  banner: { name: 'Panji', cost: 100, dmg: 0, range: 1.6, rate: 1, color: 0xfbbf24, accent: 0xb45309, desc: '+25% DMG sekitar', icon: '🚩', air: false, ground: false, tag: 'Buff' },
  flame: { name: 'Api', cost: 95, dmg: 3, range: 2.0, rate: 0.08, color: 0xf97316, accent: 0x9a3412, desc: 'Semburan kerucut', icon: '🔥', air: false, ground: true, tag: 'Darat·Kerucut' },
  trap: { name: 'Perangkap', cost: 60, dmg: 45, range: 1.3, rate: 3.5, color: 0x78716c, accent: 0x44403c, desc: 'Jepit orc lewat', icon: '🪤', air: false, ground: true, tag: 'Darat·Stun' },
  repair: { name: 'Tukang', cost: 80, dmg: 0, range: 2.2, rate: 1.0, color: 0xfb7185, accent: 0x9f1239, desc: 'Perbaiki tower', icon: '🔨', air: false, ground: false, tag: 'Repair' },
  shield: { name: 'Perisai', cost: 120, dmg: 0, range: 2.0, rate: 1, color: 0x38bdf8, accent: 0x075985, desc: 'Blokir peluru orc', icon: '🛡️', air: false, ground: false, tag: 'Pelindung' },
  plasma: { name: 'Plasma', cost: 130, dmg: 3, range: 3.0, rate: 0.1, color: 0xfde047, accent: 0x2563eb, desc: 'Sambaran petir plasma', icon: '🌩️', air: true, ground: true, tag: 'Plasma·Tembus Armor' },
  piggy: { name: 'Celengan', cost: 90, dmg: 5, range: 2.4, rate: 3.6, color: 0xf9a8d4, accent: 0xbe185d, desc: 'Gaji + bunga + koin jatuh', icon: '🐷', air: false, ground: false, tag: 'Ekonomi' },
  wind: { name: 'Kincir', cost: 85, dmg: 0, range: 2.4, rate: 1, color: 0xc7d2fe, accent: 0x6366f1, desc: 'Dorong musuh mundur', icon: '🌀', air: true, ground: true, tag: 'Kontrol' },
  boomer: { name: 'Bumerang', cost: 100, dmg: 14, range: 3.2, rate: 1.5, color: 0xd9a066, accent: 0x8a5a2b, desc: 'Menembus & kembali', icon: '🪃', air: true, ground: true, tag: 'Tembus 2x' },
  mine: { name: 'Ranjau', cost: 90, dmg: 38, range: 3.0, rate: 4.5, color: 0x9d8ba7, accent: 0x4c3f5c, desc: 'Pasang ranjau di jalan', icon: '💣', air: false, ground: true, tag: 'Jebakan' },
  cactus: { name: 'Kaktus', cost: 80, dmg: 7, range: 3.0, rate: 0.35, color: 0x4ade80, accent: 0x15803d, desc: 'Jarum anti-udara', icon: '🌵', air: true, ground: true, tag: 'Udara ×3' },
  hive: { name: 'Lebah', cost: 110, dmg: 9, range: 3.2, rate: 1.5, color: 0xfbbf24, accent: 0x92400e, desc: 'Kawanan lebah', icon: '🐝', air: true, ground: true, tag: 'Kawanan' },
  golem: { name: 'Golem', cost: 100, dmg: 26, range: 1.9, rate: 2.4, color: 0xa8a29e, accent: 0x57534e, desc: 'Hentakan gempa', icon: '🪨', air: false, ground: true, tag: 'Gempa·Stun' },
  clock: { name: 'Jam', cost: 95, dmg: 0, range: 2.7, rate: 1, color: 0x2dd4bf, accent: 0x0f766e, desc: 'Perlambat area', icon: '⏳', air: true, ground: true, tag: 'Perlambat' },
  prism: { name: 'Mercusuar', cost: 140, dmg: 22, range: 3.6, rate: 1.5, color: 0x60a5fa, accent: 0x1d4ed8, desc: 'Sinar pelangi tembus lurus', icon: '🔦', air: true, ground: true, tag: 'Tembus lurus' },
  cupid: { name: 'Amor', cost: 85, dmg: 5, range: 3.1, rate: 1.0, color: 0xf9a8d4, accent: 0xdb2777, desc: 'Tandai: +40% damage', icon: '💘', air: true, ground: true, tag: 'Debuff' },
  hook: { name: 'Pancing', cost: 95, dmg: 12, range: 3.4, rate: 3.0, color: 0x86efac, accent: 0x15803d, desc: 'Tarik musuh jauh mundur', icon: '🎣', air: true, ground: true, tag: 'Tarik' },
  bowl: { name: 'Bowling', cost: 100, dmg: 28, range: 3.4, rate: 2.6, color: 0xfffaf0, accent: 0xdc2626, desc: 'Bola gelinding di jalan', icon: '🎳', air: false, ground: true, tag: 'Strike!' },
  barracks: { name: 'Barak', cost: 120, dmg: 12, range: 2.8, rate: 0.85, color: 0x93c5fd, accent: 0x2563eb, desc: 'Prajurit tombak: sodok & lempar', icon: '🏰', air: false, ground: true, tag: 'Prajurit·Mental' },
  mind: { name: 'Hipnotis', cost: 150, dmg: 0, range: 3.2, rate: 4.0, color: 0xc084fc, accent: 0x7e22ce, desc: '1 laser: orc serang temannya', icon: '🧠', air: true, ground: true, tag: 'Laser·Kendali pikiran' },
  vortex: { name: 'Vortex', cost: 135, dmg: 8, range: 3.3, rate: 3.2, color: 0x818cf8, accent: 0x4338ca, desc: 'Singularitas: sedot & remuk musuh', icon: '🌀', air: true, ground: true, tag: 'Gravitasi·Sedot' },
  meteor: { name: 'Meteor', cost: 160, dmg: 75, range: 4.2, rate: 3.4, color: 0xf87171, accent: 0xb91c1c, desc: 'Hujan meteor & kawah magma', icon: '☄️', air: false, ground: true, tag: 'Nuker·Magma' },
  orbital: { name: 'Surya', cost: 145, dmg: 16, range: 3.6, rate: 0.15, color: 0xfacc15, accent: 0xd97706, desc: 'Sinar surya: lelehkan armor', icon: '☀️', air: true, ground: true, tag: 'Lelehkan Armor' },
  siren: { name: 'Siren', cost: 125, dmg: 14, range: 3.2, rate: 2.2, color: 0x22d3ee, accent: 0x0891b2, desc: 'Gema sonik: bangkitkan klon hantu orc', icon: '🎶', air: true, ground: true, tag: 'Klon Hantu' },
  naga: { name: 'Naga Purba', cost: 155, dmg: 32, range: 4.0, rate: 2.2, color: 0xef4444, accent: 0xb91c1c, desc: 'Lidah api & retakan lahar di jalur jalan', icon: '🐉', air: true, ground: true, tag: 'Lahar Jalur' },
  storm: { name: 'Badai', cost: 145, dmg: 26, range: 3.6, rate: 2.4, color: 0x0284c7, accent: 0x38bdf8, desc: 'Tornado berjalan: angkat musuh & bisukan skill', icon: '🌪️', air: true, ground: true, tag: 'Tornado Berjalan' },
  quake: { name: 'Gempa', cost: 135, dmg: 30, range: 3.2, rate: 2.8, color: 0xb45309, accent: 0xf97316, desc: 'Pasak seismik: ikat 4 orc & 100% echo damage', icon: '⛓️', air: false, ground: true, tag: 'Ikatan Jiwa' },
  glacier: { name: 'Gletser', cost: 150, dmg: 38, range: 3.4, rate: 3.8, color: 0x06b6d4, accent: 0xe0f2fe, desc: 'Tembok es fisik penghadang jalan + shatter', icon: '🧊', air: false, ground: true, tag: 'Barikade Es' },
};
export const TOWER_HP = 20;
/** the stats of a tower at a given level (+ banner buff) – shared by the game AND the card-info screen, so both always agree */
export function towerStatsOf(type: TowerType, level: number, buff = 0) {
  const d = TOWER_DEFS[type];
  return { dmg: Math.round(d.dmg * Math.pow(1.6, level - 1) * (1 + buff)), range: d.range + 0.3 * (level - 1), rate: d.rate * Math.pow(0.9, level - 1) };
}
export const upgradeCostOf = (type: TowerType, level: number): number | null => (level >= 3 ? null : Math.round(TOWER_DEFS[type].cost * (0.9 + level * 0.5)));
/** Piggy bank: interest paid when a wave ends (a % of your gold, capped per piggy) and the bonus coins dropped by every orc that dies inside its range */
export const PIGGY = { pct: (l: number) => 0.06 + 0.03 * (l - 1), cap: (l: number) => 25 + 20 * (l - 1), bounty: (l: number) => l };

type EnemyType = 'normal' | 'fast' | 'tank' | 'shaman' | 'berserker' | 'dragon' | 'boss' | 'baby' | 'gunner' | 'jumper' | 'log' | 'balloon' | 'cannoneer' | 'archer' | 'dread' | 'captain' | 'legion' | 'ninja' | 'bomber' | 'magnet' | 'frost' | 'rider' | 'fatty' | 'punk' | 'shield' | 'toxic' | 'bat' | 'troll';
interface EnemyDef { hp: number; speed: number; reward: number; skin: number; cloth: number; size: number; weapon: 'club' | 'dagger' | 'axe' | 'hammer' | 'staff' | 'twin' | 'none' | 'rifle' | 'rocket' | 'torch'; armor: number; flying?: boolean; lives: number; label: string }
const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  normal: { hp: 30, speed: 1.25, reward: 5, skin: 0x6abe4a, cloth: 0xd9433b, size: 0.55, weapon: 'club', armor: 0, lives: 1, label: 'Orc' },
  fast: { hp: 18, speed: 2.1, reward: 6, skin: 0xa8d65c, cloth: 0xf2c94c, size: 0.42, weapon: 'dagger', armor: 0, lives: 1, label: 'Goblin' },
  tank: { hp: 95, speed: 0.85, reward: 12, skin: 0x4f9a3e, cloth: 0x7a4bd6, size: 0.78, weapon: 'axe', armor: 4, lives: 1, label: 'Tank' },
  shaman: { hp: 45, speed: 1.0, reward: 11, skin: 0x7fc8a9, cloth: 0x2563eb, size: 0.55, weapon: 'staff', armor: 0, lives: 1, label: 'Dukun' },
  berserker: { hp: 70, speed: 1.1, reward: 12, skin: 0xb5651d, cloth: 0x7f1d1d, size: 0.62, weapon: 'twin', armor: 0, lives: 1, label: 'Berserker' },
  dragon: { hp: 260, speed: 1.0, reward: 45, skin: 0xf26b3a, cloth: 0xffb02e, size: 1.0, weapon: 'none', armor: 2, flying: true, lives: 2, label: 'Naga' },
  boss: { hp: 560, speed: 0.72, reward: 80, skin: 0x3e6b35, cloth: 0x2a2a3e, size: 1.05, weapon: 'hammer', armor: 6, lives: 3, label: 'Raja Orc' },
  baby: { hp: 14, speed: 3.0, reward: 7, skin: 0x8fd96a, cloth: 0xfafafa, size: 0.38, weapon: 'none', armor: 0, lives: 1, label: 'Orc Popok' },
  gunner: { hp: 55, speed: 0.95, reward: 14, skin: 0x5fa84a, cloth: 0x374151, size: 0.58, weapon: 'rifle', armor: 0, lives: 1, label: 'Orc Sniper' },
  jumper: { hp: 40, speed: 1.1, reward: 13, skin: 0x7bc95c, cloth: 0x0ea5e9, size: 0.55, weapon: 'rocket', armor: 0, lives: 1, label: 'Orc Pelontar' },
  log: { hp: 160, speed: 0.6, reward: 10, skin: 0x8b5a2b, cloth: 0x5c3a1a, size: 0.9, weapon: 'none', armor: 3, lives: 5, label: 'Gelondongan' },
  balloon: { hp: 110, speed: 0.75, reward: 22, skin: 0x6abe4a, cloth: 0xef4444, size: 0.6, weapon: 'none', armor: 0, flying: true, lives: 2, label: 'Orc Balon' },
  cannoneer: { hp: 90, speed: 0.8, reward: 20, skin: 0x5a9e45, cloth: 0x1e293b, size: 0.62, weapon: 'torch', armor: 2, lives: 2, label: 'Orc Meriam' },
  archer: { hp: 52, speed: 1.0, reward: 15, skin: 0x77c25a, cloth: 0x2f7d4f, size: 0.56, weapon: 'none', armor: 0, lives: 1, label: 'Orc Pemanah' },
  dread: { hp: 400, speed: 0.58, reward: 60, skin: 0x262633, cloth: 0x15151f, size: 0.92, weapon: 'none', armor: 5, lives: 3, label: 'Ksatria Kelam' },
  captain: { hp: 360, speed: 0.82, reward: 55, skin: 0x5aa63f, cloth: 0xb91c1c, size: 0.9, weapon: 'none', armor: 4, lives: 2, label: 'Panglima Pasukan' },
  legion: { hp: 120, speed: 0.82, reward: 16, skin: 0x5aa63f, cloth: 0x3b4a6b, size: 0.62, weapon: 'none', armor: 3, lives: 1, label: 'Prajurit Legiun' },
  ninja: { hp: 38, speed: 2.2, reward: 16, skin: 0x4a7c59, cloth: 0x1e293b, size: 0.52, weapon: 'dagger', armor: 0, lives: 1, label: 'Orc Ninja' },
  bomber: { hp: 65, speed: 1.85, reward: 18, skin: 0x65a30d, cloth: 0xb91c1c, size: 0.56, weapon: 'torch', armor: 0, lives: 2, label: 'Orc Dinamit' },
  magnet: { hp: 175, speed: 0.76, reward: 24, skin: 0x4b7c43, cloth: 0x1e3a8a, size: 0.72, weapon: 'hammer', armor: 5, lives: 2, label: 'Orc Magnet' },
  frost: { hp: 85, speed: 0.92, reward: 22, skin: 0x6ee7b7, cloth: 0x0284c7, size: 0.58, weapon: 'staff', armor: 1, lives: 2, label: 'Dukun Es' },
  rider: { hp: 280, speed: 1.15, reward: 35, skin: 0x4d7c0f, cloth: 0x475569, size: 0.86, weapon: 'axe', armor: 6, lives: 3, label: 'Penunggang Badak' },
  fatty: { hp: 240, speed: 0.78, reward: 28, skin: 0x5a8c42, cloth: 0x9a3412, size: 0.94, weapon: 'club', armor: 4, lives: 2, label: 'Orc Gendut Tongkat' },
  punk: { hp: 82, speed: 1.68, reward: 22, skin: 0x6da440, cloth: 0x18181b, size: 0.6, weapon: 'torch', armor: 1, lives: 2, label: 'Orc Punk Berapi' },
  shield: { hp: 165, speed: 0.74, reward: 24, skin: 0x4f8a3c, cloth: 0x334155, size: 0.76, weapon: 'axe', armor: 6, lives: 2, label: 'Orc Perisai Baja' },
  toxic: { hp: 92, speed: 1.05, reward: 22, skin: 0x65a30d, cloth: 0x14532d, size: 0.62, weapon: 'none', armor: 1, lives: 2, label: 'Orc Alkemis Racun' },
  bat: { hp: 96, speed: 1.45, reward: 25, skin: 0x3b5249, cloth: 0x581c87, size: 0.66, weapon: 'none', armor: 1, flying: true, lives: 2, label: 'Orc Kelelawar' },
  troll: { hp: 290, speed: 0.75, reward: 36, skin: 0x3f6232, cloth: 0x14532d, size: 0.96, weapon: 'none', armor: 3, lives: 3, label: 'Troll Rawa' },
};
const BLOOD = 0xc0262d;

export interface SelectedTowerInfo { id: number; type: TowerType; level: number; upgradeCost: number | null; sellValue: number; dmg: number; range: string; buff: number; hp: number }
export interface GameState {
  screen: 'menu' | 'select' | 'playing' | 'levelComplete' | 'gameOver';
  /** the towers brought into this level (chosen on the "pilih tower inti" screen) and how many slots there are */
  loadout: TowerType[]; slots: number;
  level: number; wave: number; wavesPerLevel: number; lives: number; maxLives: number;
  gold: number; score: number; best: number; kills: number;
  selectedType: TowerType; selectedTower: SelectedTowerInfo | null;
  waveActive: boolean; countdown: number; enemiesLeft: number; muted: boolean; musicOn: boolean; speed: number; nextWaveInfo: string;
}
export interface FloatText { id: number; x: number; y: number; text: string; color: string }

const W = 18, H = 12, MAX_LIVES = 10;
const LAYOUTS: [number, number][][] = [
  [[0, 3], [5, 3], [5, 9], [11, 9], [11, 3], [17, 3]],
  [[0, 6], [3, 6], [3, 1], [8, 1], [8, 10], [13, 10], [13, 5], [17, 5]],
  [[0, 10], [2, 10], [2, 1], [7, 1], [7, 10], [12, 10], [12, 1], [17, 1]],
  [[0, 1], [15, 1], [15, 6], [2, 6], [2, 10], [17, 10]],
  [[0, 5], [3, 5], [3, 2], [8, 2], [8, 8], [5, 8], [5, 11], [12, 11], [12, 3], [17, 3]],
];

const tileX = (c: number) => c - W / 2 + 0.5;
const tileZ = (r: number) => r - H / 2 + 0.5;
const SPHERE_FX = new THREE.SphereGeometry(1, 14, 10);
/** gold you start a new game with (shown on the "pilih tower inti" screen and used for the first purchases) */
const START_GOLD = 400;
/** towers are drawn 20% smaller than their models (gameplay ranges are unchanged) */
const TOWER_SCALE = 0.8;

interface Enemy {
  id: number; type: EnemyType; s: number; speed: number; hp: number; maxHp: number; reward: number; armor: number; flying: boolean;
  slowT: number; flashT: number; poisonT: number; poisonDps: number; healT: number; stunT: number; shockT?: number; hurtT?: number;
  shootT: number; jumpState: 'idle' | 'flying' | 'done'; jumpT: number; jumpFrom: THREE.Vector3; jumpTo: THREE.Vector3; jumpS: number;
  cannonPhase: 'walk' | 'lighting' | 'fire'; cannonT: number; cannonTarget: Tower | null; breathTarget?: Tower | null; breathMesh?: THREE.Object3D; breathActive?: boolean;
  group: THREE.Group; parts: THREE.Object3D[]; skinMats: THREE.MeshStandardMaterial[];
  limbs: Record<string, THREE.Group>; hpFg: THREE.Mesh; hpBg: THREE.Mesh; size: number; bobOff: number; dead: boolean;
  auraT?: number; auraK?: number; lastDmg?: number; hitSrc?: THREE.Vector3;
  charmT?: number; charmMark?: THREE.Object3D; hooked?: boolean;
  lane?: number; atkT?: number; atkPhase?: 'walk' | 'aim' | 'wind' | 'swing' | 'rest'; atkTarget?: Tower | null; rallyT?: number;
  /** pushed back along the road by a knight's spear (path units / s, decays) · hop height timer · slowed because a soldier is touching it */
  knockV?: number; hopT?: number; hopH?: number; blockT?: number;
  /** mind control: hallucinating (seconds left), who it is fighting, how hard it hits, swing timer, the spiral mark above its head, turned around to face a friend behind it */
  mindT?: number; mindLv?: number; mindTarget?: Enemy; mindPow?: number; mindAtkT?: number; mindMark?: THREE.Object3D; yawFlip?: boolean;
  /** special abilities for 5 new orcs */
  stealthT?: number; stealthCd?: number; freezeCd?: number; magPulseT?: number; sirenT?: number;
  silenceT?: number; freezeT?: number; burnT?: number; burnDps?: number;
  tetherSpikeId?: number; cycloneLiftT?: number;
  slamCd?: number; spearThrowCd?: number; toxicDropCd?: number; batDrainCd?: number; trollRegenT?: number;
}
interface Tower {
  id: number; c: number; r: number; type: TowerType; level: number; cooldown: number; invested: number;
  group: THREE.Group; head: THREE.Group; recoil: number; beam?: THREE.Mesh; beamGlow?: THREE.Mesh; muzzle?: THREE.Object3D; target: Enemy | null; buff: number; pulseT: number;
  hp: number; hpBar?: THREE.Mesh; hpBarBg?: THREE.Mesh; shielded: boolean; dead?: boolean;
  arc?: Bolt; lockT?: number; lockId?: number; arcT?: number; idleYaw?: number; gaze?: Enemy | null;
  soldiers?: Soldier[]; posts?: THREE.Vector3[]; postYaw?: number[];
  frozenT?: number; iceBlock?: THREE.Mesh;
  orbitalTarget?: Enemy | null; orbitalLockT?: number; orbitalBeam?: THREE.Mesh; orbitalRings?: THREE.Mesh;
}
interface EnemyShot { pos: THREE.Vector3; vel: THREE.Vector3; target: Tower; mesh: THREE.Object3D; life: number; dmg: number; kind: 'bullet' | 'cannonball' | 'arrow'; start?: THREE.Vector3; goal?: THREE.Vector3; t?: number }
interface Projectile { kind: 'tracer' | 'mortar' | 'glob' | 'needle' | 'bee' | 'heart' | 'fireball' | 'meteor'; seed?: number; pos: THREE.Vector3; start: THREE.Vector3; t: number; target: Enemy; speed: number; dmg: number; mesh: THREE.Object3D; splash?: number; arc?: number; level: number }
interface Debris { obj: THREE.Object3D; vel: THREE.Vector3; ang: THREE.Vector3; life: number; max: number; floor: number; grav?: number }
interface ArcFx { bolt: Bolt; style: BoltStyle; a: THREE.Vector3; b: THREE.Vector3; life: number; max: number; rs: number }
interface Fx { mesh: THREE.Object3D; life: number; max: number; s0: number; s1: number; rise?: number; fixed?: boolean; uniform?: boolean }
interface Puddle { mesh: THREE.Mesh; pos: THREE.Vector3; r: number; dps: number; life: number }
interface Vortex { id: number; owner: number; pos: THREE.Vector3; s: number; r: number; dps: number; life: number; maxLife: number; mesh: THREE.Group }
interface Meteor { id: number; owner: number; start: THREE.Vector3; goal: THREE.Vector3; pos: THREE.Vector3; t: number; dmg: number; mesh: THREE.Group }
interface Ghost { id: number; mesh: THREE.Group; s: number; speed: number; dmg: number; life: number; maxLife: number; hit: Set<number> }
interface Fissure { id: number; owner: number; s0: number; s1: number; dps: number; life: number; maxLife: number; meshes: THREE.Object3D[] }
interface Cyclone { id: number; owner: number; s: number; dir: number; range: number; travelled: number; dps: number; life: number; maxLife: number; mesh: THREE.Group; level: number }
interface SeismicSpike { id: number; owner: number; pos: THREE.Vector3; s: number; tethers: number[]; life: number; maxLife: number; mesh: THREE.Group; lineMeshes: THREE.Line[] }
interface IceBarricade { id: number; owner: number; s: number; pos: THREE.Vector3; hp: number; maxHp: number; life: number; maxLife: number; mesh: THREE.Group; hpFg: THREE.Mesh; level: number }
/** a little knight of the Barracks tower */
interface Soldier {
  id: number; group: THREE.Group; rig: THREE.Group; limbs: Record<string, THREE.Group>; face: THREE.Object3D;
  state: 'spawn' | 'idle' | 'windup' | 'thrust' | 'recover' | 'down'; t: number; hp: number; maxHp: number; target: Enemy | null; cd: number; yaw: number; hit: boolean; acc: number; hurtT: number; ph: number; seed: number;
}
const KNIGHT_SCALE = 0.55;
/** Barracks balance, per tower level [Lv1, Lv2, Lv3]: Lv1 is deliberately modest (the old, humble strength); the big power only comes with upgrades */
export const BARRACKS = {
  n: [2, 3, 5],            // knights
  hp: [6, 8, 10],          // lives of each knight
  wear: [2.0, 2.4, 2.8],   // seconds of being touched by an orc to lose 1 life (bigger = tougher)
  regen: [0, 4, 3],        // seconds of calm to heal 1 life (0 = no healing)
  respawn: [5.0, 4.2, 3.6],// seconds until a fallen knight walks out of the gate again
  splash: [0, 0.5, 0.7],   // share of a poke's damage that also hits the orcs next to the victim (0 = the spear hits only one orc)
  stun: [0.2, 0.3, 0.3],   // how long the victim is stunned by a poke
};
/** Hypnosis balance, per tower level [Lv1, Lv2, Lv3]: ONE laser every 4 s at every level, but the upgrades make the madness a lot stronger */
export const MINDC = {
  dur: [4, 6, 8],          // seconds of hallucination
  pow: [1.0, 1.8, 2.5],    // strength of the victim's blows
  big: [0.5, 0.6, 0.7],    // share of the time that bosses / dragons / dread knights / captains are affected
  swing: [0, 0.4, 0.6],    // share of a blow that also hits the orcs next to the target (0 = only the target is hit)
  ext: [0, 1, 1.5],        // seconds added to the madness every time a friend is knocked out
  hit: [0.8, 0.65, 0.55],  // seconds between the victim's blows
  find: [3.4, 4.0, 4.4],   // how far the victim looks for a friend to fight
};
/** how much of a spear poke's push an enemy type gets (1 = fully flung back) */
const KNOCK_RESIST: Record<string, number> = { boss: 0.25, dread: 0.3, rider: 0.05, captain: 0.55, log: 0.5, magnet: 0.45, tank: 0.6, legion: 0.6, berserker: 0.8, cannoneer: 0.8, bomber: 0.9, ninja: 0.85, frost: 0.9, fatty: 0.35, punk: 0.8, shield: 0.2, toxic: 0.85, bat: 0.7, troll: 0.3 };
/** how hard a hallucinating orc of this type hits its friends (multiplied by the current wave strength) */
const MIND_POWER: Record<string, number> = { normal: 9, fast: 5, baby: 3, tank: 20, shaman: 6, berserker: 15, gunner: 9, archer: 8, jumper: 8, cannoneer: 13, log: 12, balloon: 6, dragon: 32, captain: 22, legion: 15, dread: 38, boss: 48, ninja: 14, bomber: 20, magnet: 18, frost: 12, rider: 28, fatty: 26, punk: 18, shield: 16, toxic: 14, bat: 16, troll: 30 };
const RINGT = new THREE.TorusGeometry(1, 0.07, 6, 28), OCT_FX = new THREE.OctahedronGeometry(1);
interface Hook { owner: number; e: Enemy; phase: 'fly' | 'pull'; t: number; mesh: THREE.Object3D; line: THREE.Mesh; pullFrom: number; pullTo: number; dur: number; dmg: number; resist: number; pull: number }
interface Roll { owner: number; mesh: THREE.Group; phase: 'fly' | 'roll'; t: number; from: THREE.Vector3; to: THREE.Vector3; s: number; travelled: number; maxDist: number; hit: Set<number>; dmg: number; strike: number; last: THREE.Vector3 }
interface Mine { id: number; owner: number; pos: THREE.Vector3; mesh: THREE.Group; arm: number; dmg: number; r: number }
interface Boom { mesh: THREE.Group; from: THREE.Vector3; dir: THREE.Vector3; side: THREE.Vector3; dist: number; u: number; hit: Set<number>; owner: number; dmg: number; back: boolean }

class Particles {
  mesh: THREE.InstancedMesh; n = 1100;
  pos: Float32Array; vel: Float32Array; life: Float32Array; maxLife: Float32Array; size: Float32Array; alive: Uint8Array; grav: Float32Array;
  dummy = new THREE.Object3D(); cursor = 0; smoke = new Uint8Array(1100);
  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), this.n);
    this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    this.pos = new Float32Array(this.n * 3); this.vel = new Float32Array(this.n * 3); this.grav = new Float32Array(this.n);
    this.life = new Float32Array(this.n); this.maxLife = new Float32Array(this.n); this.size = new Float32Array(this.n); this.alive = new Uint8Array(this.n);
    for (let i = 0; i < this.n; i++) { this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); this.mesh.setMatrixAt(i, this.dummy.matrix); this.mesh.setColorAt(i, new THREE.Color(1, 1, 1)); }
    scene.add(this.mesh);
  }
  emit(p: THREE.Vector3, color: number, count: number, speed: number, size: number, life: number, up = 2, grav = 9) {
    const col = new THREE.Color(color);
    // dark / grey ("black") particles become soft, pale, rising smoke puffs – no black soot, no oil
    const cr = (color >> 16) & 255, cg = (color >> 8) & 255, cb = color & 255;
    const smoky = Math.max(cr, cg, cb) < 0xb4 && Math.max(cr, cg, cb) - Math.min(cr, cg, cb) < 0x24;
    const SMOKE = [0xf4f6fa, 0xe6e9f0, 0xd9dde7];
    for (let k = 0; k < count; k++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.n;
      this.alive[i] = 1; this.grav[i] = grav;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      const a = Math.random() * Math.PI * 2, sp = speed * (0.4 + Math.random() * 0.8);
      this.vel[i * 3] = Math.cos(a) * sp; this.vel[i * 3 + 1] = up * (0.5 + Math.random()); this.vel[i * 3 + 2] = Math.sin(a) * sp;
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.6); this.size[i] = size * (0.6 + Math.random() * 0.8);
      if (smoky) {
        this.smoke[i] = 1; this.grav[i] = -(0.5 + Math.random() * 0.6); this.size[i] *= 1.7; this.life[i] = this.maxLife[i] = this.life[i] * 1.5;
        this.vel[i * 3 + 1] = 0.3 + Math.random() * 0.9;
        this.mesh.setColorAt(i, new THREE.Color(SMOKE[(Math.random() * SMOKE.length) | 0]));
      } else { this.smoke[i] = 0; this.mesh.setColorAt(i, col.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.15)); }
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt: number) {
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.alive[i] = 0; this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); this.mesh.setMatrixAt(i, this.dummy.matrix); continue; }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.05 && this.grav[i] > 0) { this.pos[i * 3 + 1] = 0.05; this.vel[i * 3 + 1] *= -0.4; this.vel[i * 3] *= 0.7; this.vel[i * 3 + 2] *= 0.7; }
      const t = this.life[i] / this.maxLife[i];
      this.dummy.position.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      this.dummy.rotation.set(this.life[i] * 5, this.life[i] * 3, 0);
      if (this.smoke[i]) { // smoke: drifts, slows down, puffs up bigger as it rises, then thins out
        const dr = Math.max(0, 1 - 1.5 * dt); this.vel[i * 3] *= dr; this.vel[i * 3 + 2] *= dr;
        this.dummy.scale.setScalar(this.size[i] * (0.45 + 1.1 * (1 - t)) * Math.min(1, t * 2.6));
      } else this.dummy.scale.setScalar(this.size[i] * Math.min(1, t * 2));
      this.dummy.updateMatrix(); this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class Game {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
  state: GameState; onState: (s: GameState) => void; onFloat: (f: FloatText) => void;
  levelGroup = new THREE.Group(); tiles: ('grass' | 'path' | 'blocked')[] = []; tileCenter: THREE.Vector3[] = []; tileCarved: boolean[] = [];
  towers: Tower[] = []; enemies: Enemy[] = []; projectiles: Projectile[] = []; debris: Debris[] = []; fx: Fx[] = []; puddles: Puddle[] = []; enemyShots: EnemyShot[] = [];
  arcs: ArcFx[] = []; boltPool = new Map<BoltStyle, Bolt[]>(); world?: World;
  lights: THREE.PointLight[] = []; lightIdx = 0;
  waypoints: THREE.Vector3[] = []; cum: number[] = []; pathLen = 0;
  particles: Particles; hover: THREE.Mesh; hoverRing: THREE.Mesh; selRing: THREE.Mesh;
  crystal?: THREE.Mesh; crystalLight?: THREE.PointLight;
  spawnQueue: EnemyType[] = []; spawnTimer = 0; hpMult = 1; spdMult = 1;
  shake = 0; raf = 0; lastEmit = 0; dirty = true; time = 0; nextId = 1; floatId = 1;
  selectedTowerId: number | null = null; pointerDown: { x: number; y: number } | null = null;
  ray = new THREE.Raycaster(); plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  canvas: HTMLCanvasElement; sfx = new Sfx(); clock = new THREE.Clock(); ro?: ResizeObserver;
  camTarget = new THREE.Vector3(0, 0, 2.0);

  constructor(canvas: HTMLCanvasElement, onState: (s: GameState) => void, onFloat: (f: FloatText) => void) {
    this.canvas = canvas; this.onState = onState; this.onFloat = onFloat;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa9dcff);
    this.scene.fog = new THREE.Fog(0xa9dcff, 36, 62);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x7fb069, 0.7));
    const sun = new THREE.DirectionalLight(0xfff3dc, 1.9); sun.position.set(11, 20, 9); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 60; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    this.scene.add(sun); this.scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffffff, 0, 6); l.userData.life = 0; this.scene.add(l); this.lights.push(l); }

    this.particles = new Particles(this.scene);
    // ragdoll for dead orcs; a soft puff of pale dust where a piece hits the ground hard
    this.rag = new Ragdoll(this.scene, (p, sp) => this.particles.emit(p.clone().setY(0.1), 0xd9cfb4, Math.min(4, 1 + Math.floor(sp * 0.5)), 1.0, 0.07, 0.5, 1.2));
    this.hover = new THREE.Mesh(DISC, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, depthWrite: false }));
    this.hover.scale.set(0.46, 1, 0.46); this.hover.visible = false; this.scene.add(this.hover);
    const ringGeo = new THREE.RingGeometry(0.94, 1, 64); ringGeo.rotateX(-Math.PI / 2);
    this.hoverRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); this.hoverRing.visible = false; this.scene.add(this.hoverRing);
    this.selRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); this.selRing.visible = false; this.scene.add(this.selRing);
    this.scene.add(this.levelGroup);

    const best = Number(localStorage.getItem('voxeltd_best') || 0);
    this.state = {
      screen: 'menu', level: 1, wave: 0, wavesPerLevel: 5, lives: MAX_LIVES, maxLives: MAX_LIVES, gold: START_GOLD, score: 0, best, kills: 0,
      selectedType: 'cannon', selectedTower: null, waveActive: false, countdown: 0, enemiesLeft: 0, muted: false, musicOn: true, speed: 1, nextWaveInfo: '',
      loadout: this.readLoadout(), slots: slotsFor(1),
    };
    this.buildLevel(); this.bindInput();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas.parentElement!);
    this.resize(); this.loop();
  }

  // ---------- Level ----------
  buildLevel() {
    this.scene.remove(this.levelGroup);
    for (const t of this.towers) this.removeTowerMeshes(t);
    for (const e of this.enemies) { this.scene.remove(e.group); this.dropBreath(e); }
    for (const m of this.mines) this.scene.remove(m.mesh);
    for (const b of this.booms) this.scene.remove(b.mesh);
    for (const h of this.hooks) { this.scene.remove(h.mesh); this.scene.remove(h.line); }
    for (const r of this.rolls) this.scene.remove(r.mesh);
    this.hooks = []; this.rolls = [];
    this.rag.clear();
    this.mines = []; this.booms = [];
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    for (const d of this.debris) this.scene.remove(d.obj);
    for (const f of this.fx) this.scene.remove(f.mesh);
    for (const p of this.puddles) this.scene.remove(p.mesh);
    for (const fs of this.fissures) for (const m of fs.meshes) this.scene.remove(m);
    for (const cy of this.cyclones) this.scene.remove(cy.mesh);
    for (const sp of this.spikes) { this.scene.remove(sp.mesh); for (const l of sp.lineMeshes) this.scene.remove(l); }
    for (const w of this.iceWalls) this.scene.remove(w.mesh);
    for (const sh of this.enemyShots) this.scene.remove(sh.mesh);
    for (const z of this.arcs) this.releaseBolt(z.bolt);
    this.fissures = []; this.cyclones = []; this.spikes = []; this.iceWalls = [];
    this.arcs = []; this.enemyShots = []; this.towers = []; this.enemies = []; this.projectiles = []; this.debris = []; this.fx = []; this.puddles = []; this.spawnQueue = []; this.selectedTowerId = null; this.selRing.visible = false;
    const layout = LAYOUTS[(this.state.level - 1) % LAYOUTS.length];
    this.tiles = new Array(W * H).fill('grass'); this.tileCenter = []; this.tileCarved = new Array(W * H).fill(false);
    for (let i = 0; i < layout.length - 1; i++) {
      const [c0, r0] = layout[i], [c1, r1] = layout[i + 1];
      const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
      let c = c0, r = r0;
      while (true) { this.tiles[r * W + c] = 'path'; if (c === c1 && r === r1) break; c += dc; r += dr; }
    }
    this.waypoints = layout.map(([c, r]) => new THREE.Vector3(tileX(c), 0, tileZ(r)));
    this.waypoints.unshift(this.waypoints[0].clone().add(new THREE.Vector3(-1.2, 0, 0)));
    this.cum = [0];
    for (let i = 1; i < this.waypoints.length; i++) this.cum.push(this.cum[i - 1] + this.waypoints[i].distanceTo(this.waypoints[i - 1]));
    this.pathLen = this.cum[this.cum.length - 1] - 0.62; // orcs stop at the castle door instead of walking through the tower

    // cells next to the road are a bit narrower (the road is 1.5 tiles wide) – towers there are drawn slightly smaller
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const i = r * W + c; if (this.tiles[i] === 'path') continue;
      const isP = (cc: number, rr: number) => cc >= 0 && cc < W && rr >= 0 && rr < H && this.tiles[rr * W + cc] === 'path';
      this.tileCarved[i] = isP(c - 1, r) || isP(c + 1, r) || isP(c, r - 1) || isP(c, r + 1);
    }
    // ONE continuous natural island (smooth grass, wobbly sand road, cliff, trees, wind-swaying grass) – each level has its own biome
    if (this.world) { this.world.dispose(); this.world = undefined; }
    const world = buildWorld({ W, H, level: this.state.level, biome: (this.state.level - 1) % BIOMES.length, waypoints: this.waypoints, tiles: this.tiles, tileCarved: this.tileCarved, tileX, tileZ });
    this.world = world; this.levelGroup = world.group; this.scene.add(this.levelGroup);
    this.tileCenter = world.tileCenter; this.crystal = world.crystal; this.crystalLight = world.light;
    const B = world.biome;
    if (this.scene.background instanceof THREE.Texture) this.scene.background.dispose();
    this.scene.background = makeSkyTexture(B.skyTop, B.skyBot); (this.scene.fog as THREE.Fog).color.setHex(B.fog);


  }
  posAt(s: number, out: THREE.Vector3) {
    if (s <= 0) return out.copy(this.waypoints[0]);
    for (let i = 1; i < this.waypoints.length; i++) if (s <= this.cum[i]) { const t = (s - this.cum[i - 1]) / (this.cum[i] - this.cum[i - 1]); return out.lerpVectors(this.waypoints[i - 1], this.waypoints[i], t); }
    return out.copy(this.waypoints[this.waypoints.length - 1]);
  }

  // ---------- Flow ----------
  startGame() { this.state.level = 1; this.state.gold = START_GOLD; this.state.score = 0; this.state.kills = 0; this.state.lives = MAX_LIVES; this.beginLevel(); }
  /** builds the level, then opens the "pilih tower inti" screen (the level only starts once the player confirms the line-up) */
  beginLevel() {
    const s = this.state;
    s.wave = 0; s.wavesPerLevel = Math.min(8, 5 + Math.floor((s.level - 1) / 2));
    s.waveActive = false; s.countdown = 16; s.screen = 'select'; s.selectedTower = null;
    s.slots = slotsFor(s.level); if (s.loadout.length > s.slots) s.loadout = s.loadout.slice(0, s.slots);
    this.buildLevel(); s.nextWaveInfo = this.previewWave(); this.dirty = true;
  }
  /** last used line-up, so players don't have to rebuild it from scratch every game (validated against the real tower list) */
  readLoadout(): TowerType[] {
    try {
      const raw = JSON.parse(localStorage.getItem('voxeltd_loadout') || '[]') as unknown;
      if (Array.isArray(raw)) return Array.from(new Set(raw.filter((t): t is TowerType => typeof t === 'string' && t in TOWER_DEFS))).slice(0, 10);
    } catch { /* ignore a corrupt value */ }
    return [];
  }
  toggleLoadout(t: TowerType) {
    const s = this.state; const i = s.loadout.indexOf(t);
    if (i >= 0) { s.loadout = s.loadout.filter(x => x !== t); this.sfx.click(); }
    else if (s.loadout.length < s.slots) { s.loadout = [...s.loadout, t]; this.sfx.select(); }
    else this.sfx.deny();
    this.dirty = true;
  }
  clearLoadout() { this.state.loadout = []; this.sfx.click(); this.dirty = true; }
  /** fills every slot with a balanced all-round team (damage, slow, area, anti-air, income, ...) */
  suggestLoadout() { this.state.loadout = SUGGESTED.slice(0, this.state.slots); this.sfx.upgrade(); this.dirty = true; }
  /** "MULAI!": locks the line-up in and starts the level; the tray in the game only offers these towers */
  confirmLoadout() {
    const s = this.state; if (s.screen !== 'select') return;
    if (!s.loadout.length) { this.sfx.deny(); return; }
    try { localStorage.setItem('voxeltd_loadout', JSON.stringify(s.loadout)); } catch { /* storage may be blocked */ }
    s.selectedType = s.loadout[0]; s.selectedTower = null; s.screen = 'playing'; s.countdown = 16; s.waveActive = false;
    this.sfx.build(); this.dirty = true;
    this.float('ORC DATANG DARI KIRI  ➜', this.waypoints[1].clone().setY(2.1), '#c4b5fd');
  }

  rosterCache = new Map<number, RosterEntry[]>();
  /** The horde of a level, for the preview panel: which enemy types come, about how many, and from which wave on.
   *  Waves are random, so each wave is sampled several times (counts = average, first wave = where it shows up in at least half of the samples). */
  getRoster(level: number): RosterEntry[] {
    const hit = this.rosterCache.get(level); if (hit) return hit;
    const SAMPLES = 8; const wavesOf = (L: number) => Math.min(8, 5 + Math.floor((L - 1) / 2));
    const total = new Map<EnemyType, number>(); const seen = new Map<EnemyType, number[]>(); const wpl = wavesOf(level);
    for (let w = 1; w <= wpl; w++) for (let k = 0; k < SAMPLES; k++) {
      const q = this.composeWave(level, w, w === wpl); const once = new Set<EnemyType>();
      for (const t of q) { total.set(t, (total.get(t) ?? 0) + 1); once.add(t); }
      for (const t of once) { const a = seen.get(t) ?? new Array<number>(10).fill(0); a[w]++; seen.set(t, a); }
    }
    const earlier = new Set<EnemyType>();
    for (let L = 1; L < level; L++) for (let w = 1; w <= wavesOf(L); w++) for (let k = 0; k < 3; k++) for (const t of this.composeWave(L, w, w === wavesOf(L))) earlier.add(t);
    const out: RosterEntry[] = [];
    for (const [t, sum] of total) {
      const a = seen.get(t)!; let first = 0; for (let w = 1; w <= wpl; w++) if (a[w] * 2 >= SAMPLES) { first = w; break; }
      if (!first) for (let w = 1; w <= wpl; w++) if (a[w] > 0) { first = w; break; }
      const d = ENEMY_DEFS[t]; const info = ENEMY_INFO[t];
      out.push({ type: t, name: d.label, icon: info.icon, note: info.note, bg: info.bg, count: Math.max(1, Math.round(sum / SAMPLES)), first, isNew: level > 1 && !earlier.has(t), flying: !!d.flying, armor: d.armor + Math.floor(level / 3), hp: Math.round(d.hp * Math.pow(1.4, level - 1)), boss: t === 'boss' || t === 'dread' || t === 'dragon' || t === 'troll' || t === 'fatty' });
    }
    out.sort((x, y) => x.first - y.first || x.hp - y.hp);
    this.rosterCache.set(level, out); return out;
  }
  nextLevel() { this.state.level++; this.state.gold += 90 + this.state.level * 25; this.state.lives = Math.min(MAX_LIVES, this.state.lives + 3); this.sfx.levelUp(); this.beginLevel(); }
  restart() { this.sfx.click(); this.startGame(); }
  toggleMute() { this.state.muted = !this.state.muted; this.sfx.muted = this.state.muted; this.dirty = true; }
  toggleMusic() { this.state.musicOn = !this.state.musicOn; this.sfx.setMusicOn(this.state.musicOn); this.sfx.click(); this.dirty = true; }
  /** picks the soundtrack for the situation (menu / build phase / battle / boss / victory / defeat) and the biome's key */
  syncAudio() {
    const s = this.state; let mode: MusicMode = 'calm';
    if (s.screen === 'menu' || s.screen === 'select') mode = 'menu';
    else if (s.screen === 'levelComplete') mode = 'win';
    else if (s.screen === 'gameOver') mode = 'lose';
    else if (s.waveActive) mode = this.enemies.some(e => !e.dead && e.type === 'boss') ? 'boss' : 'battle';
    this.sfx.setMusic(mode, s.screen === 'menu' ? 0 : s.level - 1); // (the select screen already plays the theme of the level it is about to start)
  }
  cycleSpeed() { this.state.speed = this.state.speed === 1 ? 2 : this.state.speed === 2 ? 4 : 1; this.sfx.click(); this.dirty = true; }
  callWave() {
    if (this.state.screen !== 'playing' || this.state.waveActive) return;
    const bonus = Math.floor(this.state.countdown * 2);
    if (bonus > 0 && this.state.wave > 0) { this.state.gold += bonus; this.float(`+${bonus} 💰 bonus`, this.waypoints[this.waypoints.length - 1], '#fde047'); }
    this.startWave();
  }
  composeWave(L: number, w: number, last: boolean) {
    const n = 7 + w * 2 + L * 2; const q: EnemyType[] = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      if (w >= 2 && r < 0.2 + L * 0.02) q.push('fast');
      else if ((w >= 3 || L >= 2) && r > 0.82 - L * 0.02) q.push('tank');
      else if (L >= 2 && w >= 2 && r > 0.7 && r < 0.78) q.push('berserker');
      else q.push('normal');
    }
    if (w >= 2) { const nb = 2 + Math.floor(w / 2) + L; for (let i = 0; i < nb; i++) q.splice(Math.floor(Math.random() * q.length), 0, 'baby'); }
    if (w >= 3 || L >= 2) { const ng = Math.min(5, 1 + Math.floor((w + L) / 3)); for (let i = 0; i < ng; i++) q.splice(Math.floor(Math.random() * q.length), 0, 'gunner'); }
    if ((w >= 3 && L >= 1) || L >= 2) { const nj = Math.min(5, Math.floor((w + L) / 3)); for (let i = 0; i < nj; i++) q.push('jumper'); }
    if (w >= 2 && (w % 2 === 0 || L >= 3)) { const nl = 1 + Math.floor(L / 3); for (let i = 0; i < nl; i++) q.unshift('log'); }
    if (w >= 3 || L >= 2) { const nc = Math.min(4, Math.floor((w + L) / 3)); for (let i = 0; i < nc; i++) q.splice(Math.floor(Math.random() * q.length), 0, 'cannoneer'); }
    if ((w >= 4 && L >= 1) || L >= 3) { const nb2 = Math.min(4, Math.floor((w + L - 2) / 3)); for (let i = 0; i < nb2; i++) q.splice(Math.floor(Math.random() * q.length), 0, 'balloon'); }
    if (w >= 2) { const na = Math.min(6, 1 + Math.floor((w + L) / 2)); for (let i = 0; i < na; i++) q.splice(Math.floor(Math.random() * q.length), 0, 'archer'); }
    if (w >= 4 || (L >= 2 && w >= 3)) { const nd = Math.min(5, 1 + Math.floor((L - 1) / 2) + (last && L >= 2 ? 1 : 0)); for (let i = 0; i < nd; i++) q.splice(Math.floor(q.length * (0.35 + Math.random() * 0.5)), 0, 'dread'); }
    if (w >= 3 && (w % 2 === 1 || L >= 2)) { const nc = 1 + Math.floor(L / 4); for (let i = 0; i < nc; i++) q.splice(Math.floor(q.length * (0.25 + Math.random() * 0.5)), 0, 'captain', 'legion', 'legion', 'legion', 'legion'); } // a war captain marches in with his 4-man squad right behind him
    if ((L >= 2 && w >= 3) || L >= 3) { const sh = 1 + Math.floor(L / 3); for (let i = 0; i < sh; i++) q.splice(Math.floor(q.length / 2) + i * 3, 0, 'shaman'); }
    if ((L >= 2 && w >= 4) || (L >= 2 && w >= 2) || w >= 4) { const dr = Math.min(6, Math.floor((L - 1) / 2) + Math.floor(w / 3)); for (let i = 0; i < dr; i++) q.push('dragon'); }
    if (w >= 2 || L >= 2) { const nn = Math.min(5, 1 + Math.floor((w + L - 1) / 3)); for (let i = 0; i < nn; i++) q.splice(Math.floor(Math.random() * q.length), 0, 'ninja'); }
    if (w >= 3 || L >= 2) { const nbm = Math.min(4, 1 + Math.floor((w + L - 2) / 3)); for (let i = 0; i < nbm; i++) q.splice(Math.floor(Math.random() * q.length), 0, 'bomber'); }
    if (w >= 3 && (w % 2 === 0 || L >= 2)) { const nmag = Math.min(3, 1 + Math.floor((w + L - 2) / 4)); for (let i = 0; i < nmag; i++) q.splice(Math.floor(q.length * 0.4), 0, 'magnet'); }
    if ((w >= 3 && L >= 1) || L >= 2) { const nfr = Math.min(3, 1 + Math.floor((w + L - 2) / 4)); for (let i = 0; i < nfr; i++) q.splice(Math.floor(q.length * 0.6), 0, 'frost'); }
    if (w >= 4 || (L >= 2 && w >= 3) || (last && L >= 2)) { const nrd = Math.min(3, 1 + Math.floor((w + L - 3) / 4)); for (let i = 0; i < nrd; i++) q.splice(Math.floor(q.length * 0.25), 0, 'rider'); }
    if (w >= 3 || L >= 2) { const nfat = Math.min(3, 1 + Math.floor((w + L - 2) / 4)); for (let i = 0; i < nfat; i++) q.splice(Math.floor(q.length * 0.3), 0, 'fatty'); }
    if (w >= 2 || L >= 2) { const npk = Math.min(4, 1 + Math.floor((w + L - 1) / 3)); for (let i = 0; i < npk; i++) q.splice(Math.floor(Math.random() * q.length), 0, 'punk'); }
    if (w >= 3 || L >= 2) { const nsh = Math.min(3, 1 + Math.floor((w + L - 2) / 4)); for (let i = 0; i < nsh; i++) q.splice(Math.floor(q.length * 0.2), 0, 'shield'); }
    if (w >= 3 || L >= 2) { const ntx = Math.min(3, 1 + Math.floor((w + L - 2) / 4)); for (let i = 0; i < ntx; i++) q.splice(Math.floor(Math.random() * q.length), 0, 'toxic'); }
    if ((w >= 4 && L >= 1) || L >= 2) { const nbt = Math.min(4, Math.floor((w + L - 2) / 3)); for (let i = 0; i < nbt; i++) q.push('bat'); }
    if (w >= 4 || (L >= 2 && w >= 3) || (last && L >= 2)) { const ntr = Math.min(3, 1 + Math.floor((w + L - 3) / 4)); for (let i = 0; i < ntr; i++) q.splice(Math.floor(q.length * 0.5), 0, 'troll'); }
    if (last) { const bosses = 1 + Math.floor((L - 1) / 2); for (let i = 0; i < bosses; i++) q.push('boss'); }
    return q;
  }
  previewWave() {
    const s = this.state; const w = s.wave + 1; if (w > s.wavesPerLevel) return '';
    const q = this.composeWave(s.level, w, w === s.wavesPerLevel); const cnt: Partial<Record<EnemyType, number>> = {};
    q.forEach(t => (cnt[t] = (cnt[t] || 0) + 1));
    const ic: Record<EnemyType, string> = { normal: '👹', fast: '👺', tank: '🛡️', shaman: '🔮', berserker: '🔥', dragon: '🐉', boss: '👑', baby: '👶', gunner: '🔫', jumper: '🚀', log: '🪵', balloon: '🎈', cannoneer: '💣', archer: '🏹', dread: '⚔️', captain: '🚩', legion: '🪖', ninja: '🥷', bomber: '🧨', magnet: '🧲', frost: '❄️', rider: '🦏', fatty: '🧌', punk: '🧑‍🎤', shield: '🛡️', toxic: '🧪', bat: '🦇', troll: '🧟' };
    return (Object.keys(cnt) as EnemyType[]).map(t => `${ic[t]}${cnt[t]}`).join(' ');
  }
  startWave() {
    const s = this.state; s.wave++; s.waveActive = true; s.countdown = 0;
    const L = s.level, w = s.wave;
    this.hpMult = (1 + 0.16 * (w - 1)) * Math.pow(1.4, L - 1); this.spdMult = Math.min(1.45, 1 + 0.05 * (L - 1));
    this.spawnQueue = this.composeWave(L, w, w === s.wavesPerLevel); this.spawnTimer = 0.3; this.sfx.wave(); this.dirty = true;
    this.float(w === s.wavesPerLevel ? 'WAVE TERAKHIR!  ➜' : 'ORC DATANG  ➜', this.waypoints[1].clone().setY(2.1), w === s.wavesPerLevel ? '#fda4af' : '#c4b5fd');
  }

  // ---------- Enemies ----------
  spawnEnemy(type: EnemyType, at = 0) {
    const def = ENEMY_DEFS[type]; const g = new THREE.Group(); const s = def.size;
    const skinMats: THREE.MeshStandardMaterial[] = [];

    let parts: THREE.Object3D[] = []; const limbs: Record<string, THREE.Group> = {}; let hpY = 1.65; let debrisParts: THREE.Object3D[] | null = null;
    if (type === 'log') {
      // rolling log with a cute plank-mask face (same glossy eyes as the towers)
      const b = buildLog(def);
      parts = b.parts; Object.assign(limbs, b.limbs); skinMats.push(...b.skinMats); g.add(...parts); hpY = b.hpY;
    } else if (type === 'balloon') {
      // striped teardrop balloon made of 10 separate gore panels (so it can burst apart), ropes, wicker basket, cute goggled pilot + rifle
      const b = buildBalloon(def);
      parts = b.parts; debrisParts = b.debris; Object.assign(limbs, b.limbs); skinMats.push(...b.skinMats); g.add(...parts); hpY = b.hpY;
    } else if (type === 'dragon') {
      // cute round dragon with an orc rider (same glossy eyes as the towers) – breathes fire on towers
      const b = buildDragon(def);
      parts = b.parts; Object.assign(limbs, b.limbs); skinMats.push(...b.skinMats); g.add(...parts); hpY = b.hpY;
    } else {
      // cute round orc (Bloons-style) with tower-style glossy eyes – see orcs.ts
      const b = isElite(type) ? buildElite(type, def) : buildOrc(type as OrcKind, def);
      parts = b.parts; Object.assign(limbs, b.limbs); skinMats.push(...b.skinMats); g.add(...parts); hpY = b.hpY;
    }
    g.scale.setScalar(s);
    const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.1), new THREE.MeshBasicMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.6 }));
    const hpFg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.1), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
    hpBg.position.y = hpY; hpFg.position.y = hpY; hpFg.position.z = 0.001; hpBg.visible = false; hpFg.visible = false;
    hpBg.quaternion.copy(this.camera.quaternion); hpFg.quaternion.copy(this.camera.quaternion);
    const hpGroup = new THREE.Group(); hpGroup.add(hpBg, hpFg); hpGroup.name = 'hp'; hpGroup.scale.setScalar(Math.max(0.6, s) / s); g.add(hpGroup);
    this.scene.add(g);
    const hp = Math.round(def.hp * this.hpMult);
    const e: Enemy = { id: this.nextId++, type, s: at, speed: def.speed * this.spdMult, hp, maxHp: hp, reward: def.reward, armor: def.armor + Math.floor(this.state.level / 3), flying: !!def.flying, slowT: 0, flashT: 0, poisonT: 0, poisonDps: 0, healT: 2, stunT: 0, shootT: 2 + Math.random() * 2, jumpState: 'idle', jumpT: 0, jumpFrom: new THREE.Vector3(), jumpTo: new THREE.Vector3(), jumpS: 0, cannonPhase: 'walk', cannonT: 0, cannonTarget: null, group: g, parts: debrisParts ?? parts, skinMats, limbs, hpFg, hpBg, size: s, bobOff: Math.random() * 6, dead: false };
    this.enemies.push(e);
    const sp = new THREE.Vector3(); this.posAt(at, sp);
    this.particles.emit(sp.setY(0.4), 0x9b5cff, 6, 1.5, 0.12, 0.5);
    if (type === 'legion') { this.legionLane = -this.legionLane; e.lane = this.legionLane * 0.36; } // soldiers march in two files either side of the road centre
    if (type === 'boss' || type === 'dragon') this.sfx.roar(type); else if (type === 'dread' || type === 'rider' || type === 'fatty' || type === 'troll') this.sfx.roar('boss'); else if (type === 'captain' || type === 'punk') this.sfx.warcry(); else this.sfx.spawn();
    return e;
  }

  // ---------- Towers ----------
  towerStats(type: TowerType, level: number, buff = 0) { return towerStatsOf(type, level, buff); }
  upgradeCost(type: TowerType, level: number) { return level >= 3 ? null : Math.round(TOWER_DEFS[type].cost * (0.9 + level * 0.5)); }
  recomputeBuffs() {
    for (const t of this.towers) {
      t.buff = 0; if (t.type === 'banner') continue;
      for (const b of this.towers) if (b.type === 'banner' && Math.abs(b.c - t.c) <= 1 && Math.abs(b.r - t.r) <= 1) t.buff += 0.25 * b.level;
      t.buff = Math.min(1, t.buff);
      const glow = t.group.getObjectByName('buffglow') as THREE.Mesh | undefined; if (glow) glow.visible = t.buff > 0;
    }
  }

  buildTowerMesh(type: TowerType, level: number) {
    const m = buildTowerModel(type, level, TOWER_DEFS[type]);
    if (m.beam) this.scene.add(m.beam); if (m.beamGlow) this.scene.add(m.beamGlow);
    const hpBarBg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.09), new THREE.MeshBasicMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.6, depthTest: false }));
    const hpBar = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.09), new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false }));
    hpBarBg.position.set(0, 2.25, 0); hpBar.position.set(0, 2.25, 0.001); hpBarBg.quaternion.copy(this.camera.quaternion); hpBar.quaternion.copy(this.camera.quaternion);
    hpBarBg.visible = hpBar.visible = false; hpBar.renderOrder = hpBarBg.renderOrder = 10; m.group.add(hpBarBg, hpBar);
    return { group: m.group, head: m.head, muzzle: m.muzzle, beam: m.beam, beamGlow: m.beamGlow, hpBar, hpBarBg };
  }
  /** world position of a tower's muzzle (follows head yaw + level scale) */
  muzzleWorld(t: Tower, out = new THREE.Vector3()) {
    const mz = MUZZLE[t.type]; const hs = (t.head.userData.sz as number) ?? 1; const a = t.head.rotation.y;
    const lx = (mz.x ?? 0) * hs; const gs = t.group.scale.x; // sideways offset: the tower's right-hand direction is (cos a, 0, -sin a); gs = the tower's current size
    return out.set(t.group.position.x + (Math.sin(a) * mz.f * hs + Math.cos(a) * lx) * gs, t.group.position.y + (0.3 + mz.y * hs) * gs, t.group.position.z + (Math.cos(a) * mz.f * hs - Math.sin(a) * lx) * gs);
  }
  kick(t: Tower, s: number) { if (t.muzzle) t.muzzle.scale.setScalar(s); }
  /** Render a small 3/4-view portrait of every tower from its real voxel model (used by the UI cards). */
  makePortraits(): Partial<Record<TowerType, string>> {
    const out: Partial<Record<TowerType, string>> = {};
    let r: THREE.WebGLRenderer | null = null;
    try {
      const size = 192;
      r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1); r.setSize(size, size, false); r.setClearColor(0x000000, 0);
      r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2));
      const key = new THREE.DirectionalLight(0xfff3dc, 2.4); key.position.set(3, 5, 4); sc.add(key);
      const rim = new THREE.DirectionalLight(0x9bd0ff, 0.9); rim.position.set(-4, 2, -3); sc.add(rim);
      const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
      for (const type of Object.keys(TOWER_DEFS) as TowerType[]) {
        const m = this.buildTowerMesh(type, 1);
        if (m.beam) this.scene.remove(m.beam); if (m.beamGlow) this.scene.remove(m.beamGlow);
        for (const n of ['dome', 'buffglow', 'idleArc']) { const o = m.group.getObjectByName(n); o?.parent?.remove(o); }
        if (m.hpBar) m.group.remove(m.hpBar); if (m.hpBarBg) m.group.remove(m.hpBarBg);
        m.group.rotation.y = 0.38; m.group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(m.group); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
        const radius = Math.max(sz.y * 0.56, Math.max(sz.x, sz.z) * 0.62);
        const dist = radius / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
        cam.position.copy(c).addScaledVector(new THREE.Vector3(0, 0.45, 1).normalize(), dist); cam.lookAt(c);
        sc.add(m.group); r.render(sc, cam); out[type] = r.domElement.toDataURL('image/png'); sc.remove(m.group);
      }
    } catch { /* UI falls back to emoji icons */ }
    finally { r?.dispose(); r?.forceContextLoss(); }
    return out;
  }
  /** Render a small portrait of every enemy type from its real 3D model (used by the horde preview on the "pilih tower inti" screen). */
  makeEnemyPortraits(): Record<string, string> {
    const out: Record<string, string> = {};
    let r: THREE.WebGLRenderer | null = null;
    try {
      const size = 160;
      r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1); r.setSize(size, size, false); r.setClearColor(0x000000, 0);
      r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2));
      const key = new THREE.DirectionalLight(0xfff3dc, 2.4); key.position.set(3, 5, 4); sc.add(key);
      const rim = new THREE.DirectionalLight(0x9bd0ff, 0.9); rim.position.set(-4, 2, -3); sc.add(rim);
      const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
      for (const type of Object.keys(ENEMY_DEFS) as EnemyType[]) {
        const def = ENEMY_DEFS[type]; let parts: THREE.Object3D[];
        if (type === 'log') parts = buildLog(def).parts;
        else if (type === 'balloon') parts = buildBalloon(def).parts;
        else if (type === 'dragon') parts = buildDragon(def).parts;
        else if (isElite(type)) parts = buildElite(type, def).parts;
        else parts = buildOrc(type as OrcKind, def).parts;
        const g = new THREE.Group(); g.add(...parts); g.rotation.y = 0.45; g.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(g); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
        const radius = Math.max(sz.y * 0.56, Math.max(sz.x, sz.z) * 0.6);
        const dist = radius / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
        cam.position.copy(c).addScaledVector(new THREE.Vector3(0, 0.3, 1).normalize(), dist); cam.lookAt(c);
        sc.add(g); r.render(sc, cam); out[type] = r.domElement.toDataURL('image/png'); sc.remove(g);
      }
    } catch { /* the UI falls back to emoji icons */ }
    finally { r?.dispose(); r?.forceContextLoss(); }
    return out;
  }
  setTowerHp(t: Tower, hp: number) {
    t.hp = Math.max(0, Math.min(TOWER_HP, hp)); const r = t.hp / TOWER_HP;
    if (t.hpBar && t.hpBarBg) { t.hpBar.visible = t.hpBarBg.visible = r < 1; t.hpBar.scale.x = Math.max(0.001, r); t.hpBar.position.x = -(1 - r) * 0.4; (t.hpBar.material as THREE.MeshBasicMaterial).color.setHex(r > 0.5 ? 0x38bdf8 : r > 0.25 ? 0xfacc15 : 0xf87171); }
  }
  hurtTower(t: Tower, pos: THREE.Vector3, dmg = 1) {
    this.setTowerHp(t, t.hp - dmg);
    this.particles.emit(pos, 0x9ca3af, 5, 1.5, 0.07, 0.4, 2); this.particles.emit(pos, 0xffe08a, 3, 1.2, 0.05, 0.25, 1, 0);
    this.sfx.hit();
    if (t.hp <= 0) this.destroyTower(t);
  }
  destroyTower(t: Tower) {
    t.dead = true; const pos = t.group.position.clone();
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
    const chunks: THREE.Object3D[] = []; t.group.traverse(o => { if ((o as THREE.Mesh).isMesh && o !== t.hpBar && o !== t.hpBarBg && o.name !== 'dome' && o.name !== 'buffglow') chunks.push(o); });
    for (const ch of chunks.slice(0, 14)) { ch.getWorldPosition(wp); ch.getWorldQuaternion(wq); ch.getWorldScale(ws); ch.parent?.remove(ch); ch.position.copy(wp); ch.quaternion.copy(wq); ch.scale.copy(ws); this.scene.add(ch); this.addDebris(ch, new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 3, (Math.random() - 0.5) * 4), 1.5 + Math.random()); }
    this.removeTowerMeshes(t); this.towers = this.towers.filter(x => x !== t); this.recomputeBuffs(); this.world?.setGrassHole(pos.x, pos.z, 0.4, false);
    this.particles.emit(pos.clone().setY(0.4), 0x6b7280, 20, 2.5, 0.12, 0.8, 3); this.particles.emit(pos.clone().setY(0.4), 0xff6a2b, 10, 2, 0.1, 0.5, 3);
    this.ring(pos.clone().setY(0.06), 0xf87171, 0.3, 1.8, 0.5); this.flash(pos.clone().setY(0.6), 0xff6a2b, 5, 5); this.shake = Math.max(this.shake, 0.3);
    this.float('TOWER HANCUR!', pos.clone().setY(1.4), '#f87171'); this.sfx.towerDown();
    if (this.selectedTowerId === t.id) this.selectTower(null); this.dirty = true;
  }
  mines: Mine[] = []; booms: Boom[] = []; hooks: Hook[] = []; rolls: Roll[] = []; curSrc: THREE.Vector3 | null = null; rag!: Ragdoll; legionLane = 1;
  fissures: Fissure[] = []; cyclones: Cyclone[] = []; spikes: SeismicSpike[] = []; iceWalls: IceBarricade[] = [];
  placeTower(c: number, r: number) {
    const s = this.state; const def = TOWER_DEFS[s.selectedType]; const center = this.tileCenter[r * W + c];
    if (s.gold < def.cost) { this.sfx.deny(); this.float('Emas kurang!', center.clone().setY(0.5), '#f87171'); return; }
    s.gold -= def.cost;
    const m = this.buildTowerMesh(s.selectedType, 1);
    m.group.position.copy(center); m.group.scale.setScalar(0.01); m.group.userData.target = (this.tileCarved[r * W + c] ? 0.86 : 1) * TOWER_SCALE; this.scene.add(m.group);
    this.world?.setGrassHole(center.x, center.z, 0.4, true); // grass makes room under the tower's podium
    this.towers.push({ id: this.nextId++, c, r, type: s.selectedType, level: 1, cooldown: s.selectedType === 'piggy' ? def.rate : 0.2, invested: def.cost, group: m.group, head: m.head, muzzle: m.muzzle, beam: m.beam, beamGlow: m.beamGlow, recoil: 0, target: null, buff: 0, pulseT: 0, hp: TOWER_HP, hpBar: m.hpBar, hpBarBg: m.hpBarBg, shielded: false });
    this.recomputeBuffs();
    this.particles.emit(center.clone().setY(0.3), 0xffffff, 14, 2.2, 0.12, 0.5, 2.5);
    this.ring(center.clone().setY(0.06), def.color, 0.3, 1.2, 0.4);
    this.sfx.build(); this.dirty = true;
  }
  removeTowerMeshes(t: Tower, keepSoldiers = false) { if (t.iceBlock) { t.group.remove(t.iceBlock); t.iceBlock = undefined; } if (!keepSoldiers) this.clearSoldiers(t); if (t.arc) { this.releaseBolt(t.arc); t.arc = undefined; } this.scene.remove(t.group); if (t.beam) this.scene.remove(t.beam); if (t.beamGlow) this.scene.remove(t.beamGlow); }
  towerAt(c: number, r: number) { return this.towers.find(t => t.c === c && t.r === r); }
  selectTower(t: Tower | null) {
    this.selectedTowerId = t ? t.id : null;
    if (t) { const st = this.towerStats(t.type, t.level); this.selRing.position.set(t.group.position.x, t.group.position.y + 0.05, t.group.position.z); this.selRing.scale.setScalar(st.range); (this.selRing.material as THREE.MeshBasicMaterial).color.setHex(TOWER_DEFS[t.type].color); this.selRing.visible = true; }
    else this.selRing.visible = false;
    this.dirty = true;
  }
  upgradeSelected() {
    const t = this.towers.find(x => x.id === this.selectedTowerId); if (!t) return;
    const cost = this.upgradeCost(t.type, t.level); if (cost == null) return;
    if (this.state.gold < cost) { this.sfx.deny(); return; }
    this.state.gold -= cost; t.invested += cost; t.level++;
    const pos = t.group.position.clone(); const tg = t.group.userData.target; this.removeTowerMeshes(t, true); // the knights keep standing while their barracks is upgraded
    const m = this.buildTowerMesh(t.type, t.level); m.group.position.copy(pos); m.group.scale.setScalar(0.6); m.group.userData.target = tg;
    m.head.rotation.y = t.head.rotation.y; // keep facing the same way after the upgrade
    t.group = m.group; t.head = m.head; t.muzzle = m.muzzle; t.beam = m.beam; t.beamGlow = m.beamGlow; t.hpBar = m.hpBar; t.hpBarBg = m.hpBarBg; this.scene.add(m.group);
    this.setTowerHp(t, TOWER_HP); this.recomputeBuffs();
    this.particles.emit(pos.clone().setY(0.6), TOWER_DEFS[t.type].color, 20, 2.5, 0.13, 0.6, 3);
    this.ring(pos.clone().setY(0.06), TOWER_DEFS[t.type].color, 0.3, 1.6, 0.5);
    this.float('UPGRADE!', pos.clone().setY(1.5), '#a5f3fc'); this.sfx.upgrade(); this.selectTower(t);
  }
  sellSelected() {
    const i = this.towers.findIndex(x => x.id === this.selectedTowerId); if (i < 0) return;
    const t = this.towers[i]; const v = Math.round(t.invested * 0.7); this.state.gold += v;
    t.dead = true; // a sold tower must stop counting as a target (a dragon kept roasting its "ghost" otherwise)
    this.removeTowerMeshes(t); this.towers.splice(i, 1); this.recomputeBuffs(); this.world?.setGrassHole(t.group.position.x, t.group.position.z, 0.4, false);
    this.particles.emit(t.group.position.clone().setY(0.4), 0xfde047, 12, 2, 0.1, 0.5);
    this.float(`+${v} 💰`, t.group.position.clone().setY(1), '#fde047'); this.sfx.coin(); this.selectTower(null);
  }
  setSelectedType(t: TowerType) { this.state.selectedType = t; this.selectTower(null); this.sfx.click(); this.dirty = true; }

  // ---------- Input ----------
  bindInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => { this.pointerDown = { x: e.clientX, y: e.clientY }; this.sfx.resume(); });
    c.addEventListener('pointerup', e => {
      if (!this.pointerDown) return;
      const dx = e.clientX - this.pointerDown.x, dy = e.clientY - this.pointerDown.y; this.pointerDown = null;
      if (dx * dx + dy * dy > 100) return; this.onTap(e.clientX, e.clientY);
    });
    c.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') this.onHover(e.clientX, e.clientY); });
    c.addEventListener('pointerleave', () => { this.hover.visible = false; this.hoverRing.visible = false; });
  }
  pick(cx: number, cy: number) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera); const p = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.plane, p)) return null;
    const c = Math.floor(p.x + W / 2), r = Math.floor(p.z + H / 2);
    if (c < 0 || c >= W || r < 0 || r >= H) return null; return { c, r };
  }
  onHover(cx: number, cy: number) {
    const t = this.pick(cx, cy);
    if (!t || this.state.screen !== 'playing' || this.tiles[t.r * W + t.c] !== 'grass' || this.towerAt(t.c, t.r)) { this.hover.visible = false; this.hoverRing.visible = false; return; }
    const def = TOWER_DEFS[this.state.selectedType]; const ok = this.state.gold >= def.cost; const ctr = this.tileCenter[t.r * W + t.c];
    const hr = this.tileCarved[t.r * W + t.c] ? 0.3 : 0.37;
    this.hover.visible = true; this.hover.position.set(ctr.x, ctr.y + 0.06, ctr.z); this.hover.scale.set(hr, 1, hr); (this.hover.material as THREE.MeshBasicMaterial).color.setHex(ok ? 0xffffff : 0xff5555);
    this.hoverRing.visible = true; this.hoverRing.position.set(ctr.x, ctr.y + 0.05, ctr.z); this.hoverRing.scale.setScalar(def.range); (this.hoverRing.material as THREE.MeshBasicMaterial).color.setHex(ok ? def.color : 0xff5555);
  }
  onTap(cx: number, cy: number) {
    if (this.state.screen !== 'playing') return;
    const t = this.pick(cx, cy); if (!t) { this.selectTower(null); return; }
    const tw = this.towerAt(t.c, t.r);
    if (tw) { this.selectTower(tw.id === this.selectedTowerId ? null : tw); this.sfx.click(); return; }
    if (this.selectedTowerId) { this.selectTower(null); return; }
    if (this.tiles[t.r * W + t.c] === 'grass') this.placeTower(t.c, t.r); else this.sfx.deny();
  }

  // ---------- FX helpers ----------
  flash(pos: THREE.Vector3, color: number, intensity: number, dist = 5) {
    const l = this.lights[this.lightIdx]; this.lightIdx = (this.lightIdx + 1) % this.lights.length;
    l.position.copy(pos); l.color.setHex(color); l.intensity = intensity; l.distance = dist; l.userData.life = 1;
  }
  ring(pos: THREE.Vector3, color: number, s0: number, s1: number, life: number, geo: THREE.BufferGeometry = RING, opacity = 0.9, rise = 0) {
    // no black "oil slick" scorch discs on the ground: a dark ring becomes a quick, pale dust ring instead
    if (Math.max((color >> 16) & 255, (color >> 8) & 255, color & 255) < 0x60) { color = 0xeee6d2; life = Math.min(life, 0.55); opacity *= 0.5; s1 = Math.max(s1, s0 * 2.2); }
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
    m.position.copy(pos); m.scale.setScalar(s0); this.scene.add(m); this.fx.push({ mesh: m, life, max: life, s0, s1, rise });
  }
  // ---------- lightning ----------
  /** Pooled bolts so flashing Tesla chains don't allocate new meshes on every shot. */
  acquireBolt(style: BoltStyle) {
    let b = this.boltPool.get(style)?.pop();
    if (!b) { b = new Bolt(style); this.scene.add(b.group); }
    b.group.visible = true; b.width = 1; b.setOpacity(1); b.reseed(); return b;
  }
  releaseBolt(b: Bolt) {
    b.group.visible = false; const arr = this.boltPool.get(b.style) ?? []; arr.push(b); this.boltPool.set(b.style, arr);
  }
  /** One-shot lightning strike that crackles (re-jags ~20x/sec) and fades out. */
  zap(a: THREE.Vector3, b: THREE.Vector3, style: BoltStyle, life = 0.3) {
    const bolt = this.acquireBolt(style); bolt.update(a, b, 1);
    this.arcs.push({ bolt, style, a: a.clone(), b: b.clone(), life, max: life, rs: 0.05 });
  }
  /** Plasma tower: a continuous arc from the emitter orb to the locked target; it fattens as the lock lasts. */
  updatePlasma(t: Tower, target: Enemy | null, dt: number) {
    if (target && target.id === t.lockId) t.lockT = (t.lockT ?? 0) + dt; else { t.lockT = 0; t.lockId = target ? target.id : -1; }
    const orb = t.head.getObjectByName('plasmaOrb');
    if (orb) { const b0 = (orb.userData.b ??= orb.scale.x) as number; orb.scale.setScalar(b0 * (target ? 1.5 + Math.random() * 0.5 : 1 + Math.sin(this.time * 5 + t.id) * 0.12)); }
    if (!target) { if (t.arc) { this.releaseBolt(t.arc); t.arc = undefined; } return; }
    if (!t.arc) t.arc = this.acquireBolt(PLASMA_STYLE);
    t.arcT = (t.arcT ?? 0) - dt; if (t.arcT <= 0) { t.arc.reseed(); t.arcT = 0.04 + Math.random() * 0.02; }
    const ramp = 1 + Math.min(0.8, ((t.lockT ?? 0) / 3) * 0.8);
    t.arc.width = 0.85 + (ramp - 1) * 0.9 + t.level * 0.1; t.arc.setOpacity(0.8 + Math.random() * 0.2);
    t.arc.update(this.muzzleWorld(t), this.enemyCenter(target), 1);
  }
  /** Layered, rising fireball (white-hot core → orange → red) with licking flame cones and embers. */
  fireball(at: THREE.Vector3, size = 1) {
    const layers: [number, number, number, number, number][] = [[0xff4a14, 0.5, 2.1, 0.55, 1.1], [0xff9a1f, 0.4, 1.6, 0.42, 1.4], [0xfff0a8, 0.25, 1.0, 0.3, 1.8]];
    for (const [c, s0, s1, life, rise] of layers) {
      const m = new THREE.Mesh(SPHERE_FX, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthWrite: false }));
      m.position.copy(at).setY(at.y + 0.45 * size); m.scale.setScalar(s0 * size); this.scene.add(m);
      this.fx.push({ mesh: m, life, max: life, s0: s0 * size, s1: s1 * size, rise: rise * size, uniform: true });
    }
    for (let i = 0; i < 4; i++) {
      const fl = makeFlame(0.9 * size); fl.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 1.1 * size, 0.05, (Math.random() - 0.5) * 1.1 * size)); fl.rotation.y = Math.random() * 6; this.scene.add(fl);
      this.fx.push({ mesh: fl, life: 0.5 + Math.random() * 0.25, max: 0.6, s0: 1, s1: 1, rise: 0.6 + Math.random() * 0.6, fixed: true });
    }
    this.particles.emit(at.clone().setY(at.y + 0.3), 0xffd166, 18, 3.8 * size, 0.12 * size, 0.6, 4);
    this.particles.emit(at.clone().setY(at.y + 0.3), 0xff6a1f, 14, 3 * size, 0.15 * size, 0.7, 3.5);
    this.particles.emit(at.clone().setY(at.y + 0.5), 0x3a3a44, 16, 1.3 * size, 0.22 * size, 1.5, 1.8, -1.2);
  }
  bolt(a: THREE.Vector3, b: THREE.Vector3, color: number, width: number, life: number, jag = 0.25) {
    const pts: THREE.Vector3[] = [a.clone()]; const n = 6;
    for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); if (jag > 0) p.add(new THREE.Vector3((Math.random() - 0.5) * jag, (Math.random() - 0.5) * jag, (Math.random() - 0.5) * jag)); pts.push(p); }
    pts.push(b.clone());
    const g = new THREE.Group();
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1]; const seg = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false }));
      seg.position.copy(p0).add(p1).multiplyScalar(0.5); seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p1.clone().sub(p0).normalize()); seg.scale.set(width, width, p0.distanceTo(p1) + width * 0.5); g.add(seg);
    }
    this.scene.add(g); this.fx.push({ mesh: g, life, max: life, s0: 1, s1: 1, fixed: true });
  }
  addDebris(obj: THREE.Object3D, vel: THREE.Vector3, life = 2.2, grav = 11) {
    const sp = grav < 11 ? 9 : 14; // light, fluttering pieces spin more gently
    this.debris.push({ obj, vel, ang: new THREE.Vector3((Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp), life, max: life, floor: 0.02, grav });
    if (this.debris.length > 160) { const d = this.debris.shift()!; this.scene.remove(d.obj); }
  }
  float(text: string, world: THREE.Vector3, color: string) {
    const v = world.clone().project(this.camera); const rect = this.canvas.getBoundingClientRect();
    this.onFloat({ id: this.floatId++, x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height, text, color });
  }
  enemyCenter(e: Enemy) {
    if (e.type === 'balloon') return e.group.position.clone().setY(e.group.position.y + e.size * 2.3);
    return e.group.position.clone().setY(e.group.position.y + e.size * (e.flying ? 0.1 : 0.7));
  }

  // ---------- Combat ----------
  damage(e: Enemy, dmg: number, opts: { slow?: boolean; hitPos?: THREE.Vector3; pierce?: boolean; silent?: boolean; noFlash?: boolean } = {}) {
    if (e.dead) return;
    let real = Math.max(1, opts.pierce ? dmg : dmg - e.armor);
    if (e.type === 'shield' && !opts.pierce) {
      real = Math.max(1, Math.round(real * 0.25));
    }
    if ((e.charmT ?? 0) > 0) real = Math.ceil(real * 1.4); // marked by Amor: +40% damage from EVERY source
    if ((e.freezeT ?? 0) > 0) real = Math.ceil(real * 1.5); // SHATTER COMBO with Glacier: +50% damage!
    e.hp -= real; if (!opts.noFlash) e.flashT = 0.08; if (opts.slow) e.slowT = 1.6; if (!opts.silent) e.hurtT = 0.22;
    if ((e.tetherSpikeId ?? 0) > 0 && !opts.silent) {
      const sp = this.spikes.find(s => s.id === e.tetherSpikeId);
      if (sp) {
        for (const tid of sp.tethers) {
          if (tid !== e.id) {
            const oe = this.enemies.find(x => x.id === tid && !x.dead);
            if (oe) {
              this.damage(oe, real, { silent: true, pierce: true });
              this.particles.emit(this.enemyCenter(oe), 0xf97316, 2, 1.2, 0.05, 0.25);
            }
          }
        }
      }
    }
    if (!opts.silent) { e.lastDmg = real; if (this.curSrc) e.hitSrc = this.curSrc.clone(); } // remembered for the death ragdoll (which way to fly, how hard)
    if (!opts.silent) { const p = opts.hitPos ?? this.enemyCenter(e); this.particles.emit(p, BLOOD, 4, 1.6, 0.07, 0.5, 2); if (e.armor > 0 && !opts.pierce && dmg - e.armor < dmg * 0.6) this.particles.emit(p, 0xffe066, 3, 2, 0.05, 0.25, 1.5, 0); }
    if (e.hp <= 0) this.kill(e);
  }
  kill(e: Enemy) {
    this.dropBreath(e);
    e.dead = true; const center = this.enemyCenter(e); const base = ENEMY_DEFS[e.type].skin;
    for (const m of e.skinMats) m.color.setHex(base);
    {
      // RAGDOLL: every part becomes its own rigid body, thrown AWAY from whatever hit it (harder for a bigger final blow),
      // inheriting the orc's walking momentum and tumbling from the torque of the hit (see ragdoll.ts)
      const fwdK = new THREE.Vector3(Math.sin(e.group.rotation.y), 0, Math.cos(e.group.rotation.y));
      let srcP: THREE.Vector3 | undefined = e.hitSrc;
      if (!srcP) { let bd = 1e9; for (const t of this.towers) { const d = t.group.position.distanceTo(e.group.position); if (d < bd) { bd = d; srcP = t.group.position; } } }
      const away = srcP ? new THREE.Vector3(e.group.position.x - srcP.x, 0, e.group.position.z - srcP.z) : fwdK.clone().multiplyScalar(-1);
      if (away.lengthSq() < 0.04) away.copy(fwdK);
      away.normalize();
      const big = e.type === 'boss' || e.type === 'dragon' || e.type === 'dread';
      const power = (big ? 4.2 : 3.1) + Math.min(3.4, ((e.lastDmg ?? 12) / Math.max(14, e.maxHp * 0.3)) * 2.6);
      const travel = e.stunT > 0 ? new THREE.Vector3() : fwdK.clone().multiplyScalar(e.speed * 0.8);
      this.rag.burst(e.group, e.parts, center, away, power, travel, (e.limbs.balloon?.rotation.y ?? 0) + e.group.rotation.y);
    }
    this.particles.emit(center, BLOOD, e.type === 'boss' ? 45 : 18, 2.6, e.size * 0.16, 0.9, 3.5);
    this.particles.emit(center, base, 10, 2, e.size * 0.14, 0.8, 3);
    this.particles.emit(center, 0xfde047, 5, 1.5, 0.1, 0.6, 3.5);
    this.ring(center.clone().setY(0.06), BLOOD, 0.2, e.size * 1.6, 0.4, DISC, 0.7);
    this.state.gold += e.reward; this.state.score += e.reward * 10 * this.state.level; this.state.kills++; this.piggyBounty(e, center);
    if ((e.charmT ?? 0) > 0) { // a marked orc pays +50% gold, and its mark jumps to the nearest unmarked neighbour
      const bonus = Math.max(2, Math.round(e.reward * 0.5)); this.state.gold += bonus;
      this.float(`💖 +${bonus}`, center.clone().setY(center.y + 1.1), '#f9a8d4'); this.particles.emit(center, 0xf9a8d4, 14, 2.4, 0.09, 0.8, 3.4);
      let nb: Enemy | null = null, nd = 2.6;
      for (const o of this.enemies) { if (o === e || o.dead || (o.charmT ?? 0) > 0) continue; const dd = o.group.position.distanceTo(e.group.position); if (dd < nd) { nd = dd; nb = o; } }
      if (nb) { this.bolt(center, this.enemyCenter(nb), 0xf9a8d4, 0.05, 0.3, 0.2); this.charm(nb, 4); }
    }
    if ((e.sirenT ?? 0) > 0) {
      const bonus = Math.max(3, Math.round(e.reward * 0.4)); this.state.gold += bonus;
      this.float(`👻 ROH BEBAS! +${bonus}`, center.clone().setY(center.y + 1.2), '#67e8f9');
      this.particles.emit(center, 0x22d3ee, 10, 2.2, 0.08, 0.7, 3);
      for (const o of this.enemies) { if (!o.dead && o !== e && o.group.position.distanceTo(center) <= 2.2) this.damage(o, Math.round(e.maxHp * 0.25), { hitPos: this.enemyCenter(o) }); }
    }
    this.float(`+${e.reward}`, center.clone().setY(center.y + 0.6), '#fde047');
    if (e.type === 'balloon') {
      // the envelope bursts: gas explosion + shockwaves + a storm of red/white/yellow fabric confetti; panels, basket and pilot fall apart
      const bp = e.group.position.clone().add(new THREE.Vector3(0, 3.3 * e.size, 0));
      this.fireball(bp, 1.2);
      this.particles.emit(bp, 0xef4444, 36, 4.6, 0.15, 1.1, 3.5, 5); this.particles.emit(bp, 0xfff7ed, 26, 4.2, 0.12, 1.1, 3.5, 5); this.particles.emit(bp, 0xfde047, 18, 3.6, 0.1, 1.0, 3.5, 5);
      this.ring(bp, 0xffffff, 0.3, 3.4, 0.35, RING, 0.9, 0.4); this.ring(bp, 0xffb347, 0.2, 2.3, 0.3, RING, 0.9, 0.1);
      this.flash(bp, 0xffa64d, 9, 8); this.shake = Math.max(this.shake, 0.45); this.float('PRAANG!', bp, '#fca5a5'); this.sfx.balloonPop();
    }
    if (e.type === 'boss' || e.type === 'dragon' || e.type === 'dread') { this.shake = 0.6; this.flash(center, e.type === 'dread' ? 0x5dff8c : 0xff5555, 6, 8); this.float(e.type === 'boss' ? 'BOSS KALAH!' : e.type === 'dragon' ? 'NAGA JATUH!' : 'KSATRIA KELAM TUMBANG!', center.clone().setY(2), '#f0abfc'); this.sfx.bossDie(); } else this.sfx.pop(e.type);
    if (e.type === 'rider') { this.shake = Math.max(this.shake, 0.4); this.float('BADAK TUMBANG! 🦏', center.clone().setY(1.8), '#e2e8f0'); }
    if (e.type === 'fatty') { this.shake = Math.max(this.shake, 0.35); this.float('SI GENDUT TUMBANG! 🧌', center.clone().setY(1.8), '#fdba74'); }
    if (e.type === 'punk') { this.particles.emit(center, 0xef4444, 14, 2.2, 0.08, 0.5, 2.5); this.float('PUNK PADAM! 🔥', center.clone().setY(1.4), '#fca5a5'); }
    if (e.type === 'toxic') {
      const at = e.group.position.clone().setY(0.1);
      this.ring(at, 0x22c55e, 0.2, 1.8, 0.6, RING, 0.85);
      this.particles.emit(at, 0x22c55e, 16, 2.0, 0.09, 0.7, 2.5);
      this.float('RACUN PECAH! 🧪', at.clone().setY(1.4), '#4ade80');
      this.sfx.whoosh();
    }
    if (e.type === 'troll') { this.shake = Math.max(this.shake, 0.35); this.float('TROLL TUMBANG! 🧟', center.clone().setY(1.8), '#86efac'); }
    this.scene.remove(e.group); this.dirty = true;
    if (e.type === 'bomber') {
      const at = e.group.position.clone().setY(0.2);
      this.fireball(at, 1.25); this.particles.emit(at, 0xef4444, 20, 3.2, 0.12, 0.8, 3.5); this.particles.emit(at, 0xfde047, 12, 2.4, 0.09, 0.6, 2.5);
      this.ring(at.clone().setY(0.06), 0xf87171, 0.2, 2.2, 0.4, RING, 0.9); this.flash(at.clone().setY(0.6), 0xff4444, 6, 6); this.shake = Math.max(this.shake, 0.3); this.sfx.boom();
      this.float('DINAMIT MELEDAK! 🧨', at.clone().setY(1.4), '#f87171');
      for (const o of [...this.enemies]) if (!o.dead && !o.flying && o !== e && o.group.position.distanceTo(at) <= 1.6) this.damage(o, 35, { pierce: true });
    }
    if (e.type === 'cannoneer') {
      const at = e.group.position.clone().addScaledVector(new THREE.Vector3(-Math.sin(e.group.rotation.y), 0, -Math.cos(e.group.rotation.y)), 0.95 * e.size).setY(0.3);
      this.fireball(at, 1.6); this.particles.emit(at, 0x5c3a1a, 16, 3.5, 0.12, 1, 4.5);
      this.ring(at.clone().setY(0.07), 0xffb347, 0.2, 3.6, 0.45, RING, 0.95); this.ring(at.clone().setY(0.04), 0x1c1917, 0.6, 1.3, 7, DISC, 0.6);
      this.flash(at.clone().setY(0.7), 0xff7a1c, 10, 7); this.shake = Math.max(this.shake, 0.45); this.sfx.boom();
      this.float('MERIAM MELEDAK!', at.clone().setY(1.8), '#fb923c');
      const dmg = Math.round(e.maxHp * 0.6);
      for (const o of [...this.enemies]) if (!o.dead && !o.flying && o.group.position.distanceTo(at) <= 1.8) this.damage(o, dmg, { pierce: true });
    }
    if (e.type === 'log') {
      this.particles.emit(center, 0x8b5a2b, 30, 3, 0.14, 1, 4); this.particles.emit(center, 0xd4a574, 15, 2, 0.1, 0.8, 3); this.shake = Math.max(this.shake, 0.3); this.sfx.crack();
      this.float('5 ORC KELUAR!', center.clone().setY(1.8), '#fbbf24');
      for (let i = 0; i < 5; i++) { const o = this.spawnEnemy('normal', Math.max(0, e.s - i * 0.35)); o.stunT = 0.4 + i * 0.1; o.hp = o.maxHp = Math.round(o.maxHp * 0.8); }
    }
  }
  leak(e: Enemy) {
    this.dropBreath(e);
    e.dead = true; this.scene.remove(e.group); const def = ENEMY_DEFS[e.type];
    this.state.lives -= def.lives; this.shake = 0.4; this.sfx.hurt(); if (this.state.lives > 0 && this.state.lives <= 3) this.sfx.warn();
    const end = this.waypoints[this.waypoints.length - 1];
    this.particles.emit(end.clone().setY(1), 0xff4d4d, 20, 3, 0.12, 0.6, 3);
    this.ring(end.clone().setY(0.08), 0xff4d4d, 0.3, 2.5, 0.5); this.flash(end.clone().setY(1), 0xff3333, 5);
    this.float(`-${def.lives} ❤️`, end.clone().setY(1.6), '#f87171');
    if (this.state.lives <= 0) { this.state.lives = 0; this.gameOver(); }
    this.dirty = true;
  }
  gameOver() {
    this.state.screen = 'gameOver'; this.state.waveActive = false;
    for (const t of this.towers) { if (t.beam) t.beam.visible = false; if (t.beamGlow) t.beamGlow.visible = false; }
    if (this.state.score > this.state.best) { this.state.best = this.state.score; localStorage.setItem('voxeltd_best', String(this.state.best)); }
    this.sfx.gameOver(); this.dirty = true;
  }

  // ---------- BARRACKS (knight soldiers) ----------
  clearSoldiers(t: Tower) { if (!t.soldiers) return; for (const s of t.soldiers) this.scene.remove(s.group); t.soldiers = undefined; t.posts = undefined; t.postYaw = undefined; }
  /** where the knights stand: on the road, around the point of the road closest to the tower, facing the way the orcs come from */
  computePosts(t: Tower, n: number) {
    const tp = t.group.position; const pp = new THREE.Vector3(), q = new THREE.Vector3(); let bs = 0.8, bd = 1e9;
    for (let s = 0.8; s < this.pathLen - 0.8; s += 0.2) { this.posAt(s, pp); const d = Math.hypot(pp.x - tp.x, pp.z - tp.z); if (d < bd) { bd = d; bs = s; } }
    const posts: THREE.Vector3[] = [], yaws: number[] = [];
    for (let i = 0; i < n; i++) {
      const s = THREE.MathUtils.clamp(bs + (i - (n - 1) / 2) * 0.8, 0.8, this.pathLen - 0.8);
      this.posAt(s, pp); this.posAt(Math.min(this.pathLen, s + 0.3), q);
      const dx = q.x - pp.x, dz = q.z - pp.z, L = Math.hypot(dx, dz) || 1; const side = (i % 2 ? 1 : -1) * 0.26;
      posts.push(new THREE.Vector3(pp.x - (dz / L) * side, 0, pp.z + (dx / L) * side));
      yaws.push(Math.atan2(-dx, -dz)); // facing back along the road = toward the orcs that are coming
    }
    t.posts = posts; t.postYaw = yaws;
  }
  spawnSoldier(t: Tower) {
    const m = makeKnight(TOWER_DEFS.barracks.accent, 0xdc2626); const g = m.group; g.scale.setScalar(0.001);
    const tp = t.group.position; const yaw = t.head.rotation.y;
    g.position.set(tp.x + Math.sin(yaw) * 0.4, tp.y, tp.z + Math.cos(yaw) * 0.4); g.rotation.y = yaw; this.scene.add(g);
    if (!t.soldiers) t.soldiers = [];
    t.soldiers.push({ id: this.nextId++, group: g, rig: m.rig, limbs: m.limbs, face: m.face, state: 'spawn', t: 0, hp: BARRACKS.hp[t.level - 1], maxHp: BARRACKS.hp[t.level - 1], target: null, cd: 0.3, yaw, hit: false, acc: 0, hurtT: 0, ph: Math.random() * 6, seed: Math.random() * 50 });
    this.particles.emit(g.position.clone().setY(tp.y + 0.3), 0xffffff, 6, 1.4, 0.07, 0.4, 2);
  }
  /** the spear lands: damage + the orc is FLUNG backwards along the road (hops and leans back). A normal orc needs 2-3 pokes to die. */
  soldierHit(t: Tower, sd: Soldier, tg: Enemy | null, st: { dmg: number }) {
    if (!tg || tg.dead) return;
    const sp = sd.group.position; const d = Math.hypot(tg.group.position.x - sp.x, tg.group.position.z - sp.z);
    if (d > 1.4) { this.sfx.click(); return; } // missed: the orc was already dragged away
    const ec = this.enemyCenter(tg); this.curSrc = sp.clone();
    // one poke never takes more than HALF of the orc's HP: an ordinary orc always needs at least 2-3 pokes, even from an upgraded barracks
    this.damage(tg, Math.min(st.dmg, Math.ceil(tg.maxHp * 0.5)), { hitPos: ec });
    const resist = KNOCK_RESIST[tg.type] ?? 1;
    tg.knockV = Math.max(tg.knockV ?? 0, 6.4 * resist); tg.hopT = 0.4; tg.hopH = 0.34; if (tg.type !== 'boss') tg.stunT = Math.max(tg.stunT, BARRACKS.stun[t.level - 1]);
    // Lv2 / Lv3 only: the spear carries on – the other ground orcs right next to the victim take 50% / 70% damage and a smaller shove (the half-HP rule still applies). Lv1 hits just one orc.
    const share = BARRACKS.splash[t.level - 1]; const vp = tg.group.position;
    for (const o of share > 0 ? [...this.enemies] : []) {
      if (o === tg || o.dead || o.flying || Math.hypot(o.group.position.x - vp.x, o.group.position.z - vp.z) > 1.0) continue;
      const oc = this.enemyCenter(o); this.damage(o, Math.min(Math.round(st.dmg * share), Math.ceil(o.maxHp * 0.5)), { hitPos: oc });
      o.knockV = Math.max(o.knockV ?? 0, 4 * (KNOCK_RESIST[o.type] ?? 1)); o.hopT = 0.35; o.hopH = 0.22;
      this.particles.emit(oc, 0xfff3b0, 3, 1.8, 0.05, 0.3, 2, 0);
    }
    this.particles.emit(ec, 0xfff3b0, 5, 2.2, 0.06, 0.35, 2.2, 0); this.ring(ec.clone().setY(ec.y - 0.1), 0xffffff, 0.1, 0.7, 0.2, RING, 0.8);
    t.recoil = Math.max(t.recoil, 0.6); this.sfx.poke();
    if (Math.random() < 0.45) this.float('TUSUK!', ec.clone().setY(ec.y + 0.8), '#bfdbfe');
  }
  /** every frame: the knights guard their posts, chase orcs that come close, thrust their spears, hold the road, get tired and fall down */
  updateBarracks(t: Tower, st: { dmg: number; rate: number; range: number }, dt: number) {
    const tp = t.group.position; const lv = t.level - 1; const want = BARRACKS.n[lv]; const R = st.range; const REACH = 1.0;
    if (!t.soldiers) t.soldiers = [];
    if (!t.posts || t.posts.length !== want) this.computePosts(t, want);
    while (t.soldiers.length < want) this.spawnSoldier(t);
    const posts = t.posts!, yaws = t.postYaw!; let seen: Enemy | null = null;
    for (let i = 0; i < t.soldiers.length; i++) {
      const sd = t.soldiers[i]; const g = sd.group, p = g.position; const post = posts[i % posts.length];
      sd.t += dt; sd.cd -= dt; sd.hurtT = Math.max(0, sd.hurtT - dt);
      const mh = BARRACKS.hp[lv]; if (sd.maxHp !== mh) { sd.hp += mh - sd.maxHp; sd.maxHp = mh; } // an upgraded barracks makes its knights sturdier on the spot
      if (sd.state === 'spawn') { const k = Math.min(1, sd.t / 0.4); g.scale.setScalar(Math.max(0.001, KNIGHT_SCALE * (1 - Math.pow(1 - k, 3)))); if (k >= 1) { sd.state = 'idle'; sd.t = 0; } }
      if (sd.state === 'down') { // fallen: lies on its back, shrinks away, then walks out of the gate again
        g.rotation.x = -Math.min(1, sd.t / 0.3) * 1.45;
        const rs = BARRACKS.respawn[lv];
        if (sd.t > rs - 0.5) g.scale.setScalar(Math.max(0.001, KNIGHT_SCALE * (1 - (sd.t - (rs - 0.5)) / 0.5)));
        if (sd.t >= rs) { sd.hp = sd.maxHp; g.rotation.x = 0; g.position.set(tp.x, tp.y, tp.z); sd.state = 'spawn'; sd.t = 0; sd.target = null; sd.acc = 0; this.particles.emit(g.position.clone().setY(tp.y + 0.3), 0xffffff, 6, 1.4, 0.07, 0.4, 2); }
        continue;
      }
      // contact: orcs touching a knight are held back (slowed); their blows wear the knight down
      let touching = 0;
      for (const e of this.enemies) {
        if (e.dead || e.flying) continue;
        if (Math.hypot(e.group.position.x - p.x, e.group.position.z - p.z) < 0.8) { e.blockT = 0.15; if ((e.knockV ?? 0) < 1 && (e.mindT ?? 0) <= 0) touching += e.type === 'boss' || e.type === 'dread' ? 2 : 1; }
      }
      if (!touching) { // resting knights slowly recover: +1 HP after 3 calm seconds
        const rg = BARRACKS.regen[lv]; sd.acc = Math.max(-rg, sd.acc - dt); // Lv1 knights do not heal at all; Lv2 / Lv3 heal 1 life after 4 / 3 calm seconds
        if (rg > 0 && sd.acc <= -rg && sd.hp < sd.maxHp) { sd.hp++; sd.acc = 0; this.particles.emit(p.clone().setY(p.y + 0.5), 0x86efac, 3, 0.8, 0.05, 0.5, 1.6, -0.5); }
      }
      if (touching) {
        sd.acc = Math.max(0, sd.acc) + touching * dt;
        if (sd.acc >= BARRACKS.wear[lv]) {
          sd.acc = 0; sd.hp--; sd.hurtT = 0.3; this.particles.emit(p.clone().setY(p.y + 0.4), 0xfde68a, 4, 1.2, 0.05, 0.3, 1.5); this.sfx.hit();
          if (sd.hp <= 0) { sd.state = 'down'; sd.t = 0; sd.target = null; this.particles.emit(p.clone().setY(p.y + 0.3), 0xe9dfc6, 8, 1.8, 0.09, 0.6, 2.2); this.float('prajurit tumbang!', p.clone().setY(p.y + 1.1), '#fca5a5'); continue; }
        }
      }
      // target: the closest ground orc inside the guard area
      let tgt = sd.target;
      if (tgt && (tgt.dead || tgt.flying || Math.hypot(tgt.group.position.x - tp.x, tgt.group.position.z - tp.z) > R + 0.8)) tgt = null;
      if (!tgt) {
        let bd = 1e9; const lim = (R + 0.4) * (R + 0.4);
        for (const e of this.enemies) {
          if (e.dead || e.flying) continue; const dx = e.group.position.x - tp.x, dz = e.group.position.z - tp.z; if (dx * dx + dz * dz > lim) continue;
          const d2 = (e.group.position.x - p.x) ** 2 + (e.group.position.z - p.z) ** 2; if (d2 < bd) { bd = d2; tgt = e; }
        }
      }
      sd.target = tgt; if (tgt && !seen) seen = tgt;
      const busy = sd.state === 'windup' || sd.state === 'thrust'; let faceYaw = yaws[i % yaws.length] ?? sd.yaw; let moving = false;
      if (tgt) {
        const dx = tgt.group.position.x - p.x, dz = tgt.group.position.z - p.z, d = Math.hypot(dx, dz) || 1; faceYaw = Math.atan2(dx, dz);
        if (!busy && d > REACH - 0.2) { const step = Math.min(d - (REACH - 0.3), 3.8 * dt); p.x += (dx / d) * step; p.z += (dz / d) * step; moving = true; }
        if (sd.state === 'idle' && sd.cd <= 0 && d <= REACH) { sd.state = 'windup'; sd.t = 0; sd.hit = false; }
      } else if (!busy) { // nothing to fight: back to the post
        const dx = post.x - p.x, dz = post.z - p.z, d = Math.hypot(dx, dz);
        if (d > 0.05) { const step = Math.min(d, 2.6 * dt); p.x += (dx / d) * step; p.z += (dz / d) * step; moving = true; faceYaw = Math.atan2(dx, dz); }
      }
      if (sd.state === 'windup' && sd.t >= 0.16) { sd.state = 'thrust'; sd.t = 0; }
      else if (sd.state === 'thrust') {
        if (!sd.hit && sd.t >= 0.05) { sd.hit = true; this.soldierHit(t, sd, tgt, st); }
        if (sd.t >= 0.1) { sd.state = 'recover'; sd.t = 0; sd.cd = Math.max(0.15, st.rate - 0.26); }
      } else if (sd.state === 'recover' && sd.t >= 0.25) { sd.state = 'idle'; sd.t = 0; }
      for (const o of t.soldiers) { // knights don't stand inside each other
        if (o === sd || o.state === 'down') continue; const dx = p.x - o.group.position.x, dz = p.z - o.group.position.z, d = Math.hypot(dx, dz);
        if (d < 0.42 && d > 1e-4) { const push = (0.42 - d) * 0.5; p.x += (dx / d) * push; p.z += (dz / d) * push; }
      }
      // facing, pose, face
      let dy = faceYaw - sd.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); sd.yaw += dy * Math.min(1, dt * 12); g.rotation.y = sd.yaw;
      if (moving) sd.ph += dt * 11;
      const bounce = sd.hurtT > 0 ? Math.sin((sd.hurtT / 0.3) * Math.PI) * 0.1 : moving ? Math.abs(Math.sin(sd.ph)) * 0.04 : 0;
      g.position.y = (this.world?.heightAt(p.x, p.z) ?? tp.y) + 0.02 + bounce; g.rotation.x = 0;
      if (sd.state !== 'spawn') g.scale.setScalar(KNIGHT_SCALE * (sd.hurtT > 0 ? 1.08 : 1));
      const phase = sd.state === 'windup' ? 'windup' : sd.state === 'thrust' ? 'thrust' : sd.state === 'recover' ? 'recover' : 'idle';
      const k = sd.state === 'windup' ? sd.t / 0.16 : sd.state === 'thrust' ? sd.t / 0.1 : sd.state === 'recover' ? sd.t / 0.25 : 0;
      poseKnight(sd.limbs, sd.rig, sd.ph, moving, phase, Math.min(1, k), this.time);
      updateFace(sd.face, dt, this.time, { lookX: Math.sin(this.time * 0.8 + sd.seed) * 0.4, lookY: 0, focus: tgt ? 0.7 : 0.15, squint: sd.hurtT > 0 || sd.state === 'thrust' ? 1 : 0, worry: sd.hp <= 1 ? 0.8 : 0 });
    }
    t.target = seen;
  }

  // ---------- MIND CONTROL ----------
  /** the mind laser: a bright violet beam with a white-hot core from the jewel to the victim (fades in ~0.45 s), glowing balls at both ends and a ring on the ground */
  mindLaser(a: THREE.Vector3, b: THREE.Vector3) {
    const d = b.clone().sub(a); const len = d.length(); if (len < 0.01) return; d.normalize();
    const g = new THREE.Group(); g.position.copy(a).add(b).multiplyScalar(0.5); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
    const layer = (color: number, w: number, k: number) => {
      const m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: k, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.material.userData.k = k; m.scale.set(w, w, len); g.add(m);
    };
    layer(0xc026d3, 0.46, 0.28); layer(0xe879f9, 0.2, 0.6); layer(0xfdf4ff, 0.08, 1);
    this.scene.add(g); this.fx.push({ mesh: g, life: 0.45, max: 0.45, s0: 1, s1: 1, fixed: true });
    const ball = (p: THREE.Vector3, s0: number, s1: number) => {
      const o = new THREE.Mesh(SPHERE_FX, new THREE.MeshBasicMaterial({ color: 0xfdf4ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
      o.position.copy(p); o.scale.setScalar(s0); this.scene.add(o); this.fx.push({ mesh: o, life: 0.4, max: 0.4, s0, s1, uniform: true });
    };
    ball(a, 0.12, 0.34); ball(b, 0.2, 0.7);
    this.ring(new THREE.Vector3(b.x, (this.world?.heightAt(b.x, b.z) ?? 0) + 0.08, b.z), 0xe879f9, 0.2, 1.3, 0.45, RING, 0.85);
  }
  /** the pink / violet psychic waves travelling from the tower's jewel to the victim */
  mindWave(a: THREE.Vector3, b: THREE.Vector3) {
    const d = b.clone().sub(a); const len = d.length(); if (len < 0.01) return; d.normalize();
    const g = new THREE.Group(); const Z = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < 7; i++) {
      const k = (i + 0.5) / 7; const m = new THREE.Mesh(RINGT, new THREE.MeshBasicMaterial({ color: i % 2 ? 0xf0abfc : 0xa855f7, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.material.userData.k = 0.9; m.position.copy(a).addScaledVector(d, len * k); m.quaternion.setFromUnitVectors(Z, d); m.scale.setScalar(0.1 + 0.5 * k); g.add(m);
    }
    this.scene.add(g); this.fx.push({ mesh: g, life: 0.5, max: 0.5, s0: 1, s1: 1, fixed: true });
  }
  makeMindMark() {
    const g = new THREE.Group(); g.name = 'mindMark';
    const disc = new THREE.Mesh(DISC, new THREE.MeshBasicMaterial({ map: spiralTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false })); disc.name = 'disc'; disc.scale.setScalar(0.34); g.add(disc);
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(OCT_FX, new THREE.MeshBasicMaterial({ color: 0xfde047 })); s.name = 'star' + i; g.add(s); }
    return g;
  }
  /** makes an enemy hallucinate: it stops, turns round and attacks its nearest friend. Big enemies (boss, dragon, dread knight, captain) only for half the time. */
  mind(e: Enemy, lv: number) {
    if (e.dead) return; const dur = MINDC.dur[lv - 1], pow = MINDC.pow[lv - 1];
    const big = e.type === 'boss' || e.type === 'dread' || e.type === 'dragon' || e.type === 'captain';
    const fresh = (e.mindT ?? 0) <= 0; e.mindT = Math.max(e.mindT ?? 0, dur * (big ? MINDC.big[lv - 1] : 1)); e.mindLv = lv; e.mindPow = pow; e.mindAtkT = 0.35; e.mindTarget = undefined;
    if (!e.mindMark) { e.mindMark = this.makeMindMark(); e.group.add(e.mindMark); }
    if (fresh) { const c = this.enemyCenter(e); this.float('🌀 BERHALUSINASI!', c.setY(c.y + 1.0), '#e879f9'); this.ring(e.group.position.clone().setY(e.group.position.y + 0.08), 0xe879f9, 0.2, 1.4, 0.5, RING, 0.8); }
  }
  /** the per-frame brain of a hallucinating orc; returns the speed multiplier for its normal walking */
  mindAI(e: Enemy, dt: number): number {
    e.mindT = (e.mindT ?? 0) - dt;
    const mk = e.mindMark;
    if (mk) { // the spiral + three orbiting stars float over its head (just above the HP bar)
      mk.scale.setScalar(0.95 / e.size); mk.position.set(0, (e.hpBg.position.y * Math.max(0.6, e.size) + 0.6) / e.size, 0);
      const d = mk.getObjectByName('disc'); if (d) d.rotation.y -= dt * 5;
      for (let i = 0; i < 3; i++) { const s = mk.getObjectByName('star' + i); if (s) { const a = this.time * 3 + i * 2.094; s.position.set(Math.cos(a) * 0.42, 0.14 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.42); s.scale.setScalar(0.06); s.rotation.y += dt * 4; } }
    }
    if (e.mindT <= 0) { if (mk) { e.group.remove(mk); e.mindMark = undefined; } e.mindTarget = undefined; e.yawFlip = false; return 1; }
    if (e.stunT > 0) return 1;
    let tg = e.mindTarget; if (tg && (tg.dead || tg === e)) tg = undefined;
    const lv = (e.mindLv ?? 1) - 1;
    if (!tg) { // the nearest friend (preferring ones that are not hallucinating themselves)
      let bd = MINDC.find[lv];
      for (const o of this.enemies) { if (o === e || o.dead) continue; const d = o.group.position.distanceTo(e.group.position) + ((o.mindT ?? 0) > 0 ? 1.0 : 0); if (d < bd) { bd = d; tg = o; } }
      e.mindTarget = tg;
    }
    if (!tg) { e.yawFlip = false; return 0.25; } // nobody to hit: it just staggers on, dizzy
    const ds = tg.s - e.s; const reach = 0.65 + (e.size + tg.size) * 0.3; e.yawFlip = ds < 0;
    if (Math.abs(ds) > reach) { e.s = Math.max(0, e.s + Math.sign(ds) * Math.min(Math.abs(ds) - reach * 0.5, 1.5 * dt)); return 0; } // walks (even backwards!) toward its friend
    e.mindAtkT = (e.mindAtkT ?? 0) - dt;
    if (e.mindAtkT <= 0) {
      e.mindAtkT = MINDC.hit[lv]; const pw = (MIND_POWER[e.type] ?? 8) * this.hpMult * (e.mindPow ?? 1);
      this.curSrc = e.group.position.clone(); const c = this.enemyCenter(tg);
      this.damage(tg, pw, { pierce: true, hitPos: c });
      // Lv2 / Lv3 only – a wild swing: other orcs right next to the victim are hit too (40% / 60%). At Lv1 only the target is hit.
      const swing = MINDC.swing[lv];
      for (const o of swing > 0 ? [...this.enemies] : []) {
        if (o === e || o === tg || o.dead || o.group.position.distanceTo(tg.group.position) > 1.2) continue;
        const oc = this.enemyCenter(o); this.damage(o, pw * swing, { pierce: true, hitPos: oc });
        o.knockV = (o.s >= e.s ? -1 : 1) * 1.8; o.hopT = 0.35; o.hopH = 0.12; this.particles.emit(oc, 0xf0abfc, 3, 1.6, 0.06, 0.3, 2, 0);
      }
      if (tg.dead) { // Lv2 / Lv3: a defeated friend keeps the madness going (+1 s / +1.5 s, max 10 s in total). At Lv1 it just stops.
        const ext = MINDC.ext[lv]; e.mindTarget = undefined;
        if (ext > 0) { e.mindT = Math.min(10, (e.mindT ?? 0) + ext); const c2 = this.enemyCenter(e); this.float(`+${ext}s`, c2.setY(c2.y + 0.8), '#f0abfc'); }
      }
      tg.knockV = (tg.s >= e.s ? -1 : 1) * 2.4; tg.hopT = 0.4; tg.hopH = 0.16; e.hopT = 0.4; e.hopH = 0.12;
      this.particles.emit(c, 0xf0abfc, 6, 2, 0.07, 0.4, 2.4, 0); this.ring(c, 0xf0abfc, 0.1, 0.8, 0.22, RING, 0.85); this.sfx.hit();
      if (Math.random() < 0.55) this.float(['DUAK!', 'BUK!', 'KAWAN?!'][Math.floor(Math.random() * 3)], c.clone().setY(c.y + 0.7), '#f0abfc');
    }
    return 0;
  }

  // ---------- PIGGY BANK ECONOMY ----------
  /** end of a wave: every piggy pays interest on the gold you are holding (6/9/12%, capped 25/45/65 each) – saving up is rewarded */
  piggyInterest() {
    const s = this.state; const snap = s.gold; let total = 0;
    for (const t of this.towers) {
      if (t.type !== 'piggy' || t.dead) continue;
      const g = Math.min(PIGGY.cap(t.level), Math.round(snap * PIGGY.pct(t.level) * (1 + t.buff)));
      if (g <= 0) continue;
      total += g; t.recoil = 1; const p = t.group.position.clone().setY(t.group.position.y + 1.9);
      this.float(`🏦 +${g}`, p, '#fde047'); this.particles.emit(p.clone().setY(p.y - 0.5), 0xfde047, 10, 1.8, 0.08, 0.7, 3.8);
    }
    if (total > 0) { s.gold += total; this.sfx.coin(); this.dirty = true; }
  }
  /** an orc dies inside a piggy's range: the piggy catches a bonus coin (+1 / +2 / +3 per piggy by level) */
  piggyBounty(e: Enemy, at: THREE.Vector3) {
    let gain = 0;
    for (const t of this.towers) {
      if (t.type !== 'piggy' || t.dead) continue;
      const r = towerStatsOf('piggy', t.level).range; const dx = t.group.position.x - e.group.position.x, dz = t.group.position.z - e.group.position.z;
      if (dx * dx + dz * dz > r * r) continue;
      gain += PIGGY.bounty(t.level); t.recoil = Math.max(t.recoil, 0.7);
    }
    if (gain <= 0) return;
    this.state.gold += gain; this.dirty = true;
    this.float(`🪙 +${gain}`, at.clone().setY(at.y + 0.15), '#fbbf24'); this.particles.emit(at, 0xfbbf24, 5, 2, 0.07, 0.5, 3.2); this.sfx.coin();
  }

  /** a ready-to-pose 3D model of any enemy type (the horde preview on the "pilih tower inti" screen) */
  buildPreviewEnemy(type: string): PreviewModel {
    const t = type as EnemyType; const def = ENEMY_DEFS[t];
    let b: { parts: THREE.Object3D[]; limbs: Record<string, THREE.Group> };
    if (t === 'log') b = buildLog(def);
    else if (t === 'balloon') b = buildBalloon(def);
    else if (t === 'dragon') b = buildDragon(def);
    else if (isElite(t)) b = buildElite(t, def);
    else b = buildOrc(t as OrcKind, def);
    const group = new THREE.Group(); group.add(...b.parts); group.scale.setScalar(def.size);
    return { group, limbs: b.limbs, size: def.size, flying: !!def.flying };
  }

  // ---------- ELITE ORCS ----------
  /** Archer: creeps forward at 30% speed while it aims at the nearest tower (drawing the bow takes 0.65s), then lobs an arrow worth 2 HP. Returns the speed multiplier. */
  archerAI(e: Enemy, dt: number): number {
    if (e.stunT > 0) { e.atkPhase = 'walk'; e.atkTarget = null; return 1; }
    const ep = e.group.position;
    let tg: Tower | null = e.atkTarget && !e.atkTarget.dead && this.towers.includes(e.atkTarget) && Math.hypot(e.atkTarget.group.position.x - ep.x, e.atkTarget.group.position.z - ep.z) <= 4.8 ? e.atkTarget : null;
    if (!tg) { let bd = 4.3; for (const t of this.towers) { const d = Math.hypot(t.group.position.x - ep.x, t.group.position.z - ep.z); if (d < bd) { bd = d; tg = t; } } }
    if (!tg) { e.atkTarget = null; e.atkPhase = 'walk'; return 1; }
    if (e.atkTarget !== tg || !e.atkPhase || e.atkPhase === 'walk') { e.atkTarget = tg; e.atkPhase = 'aim'; e.atkT = 0.65; this.sfx.bowDraw(); }
    e.atkT = (e.atkT ?? 0) - dt;
    if (e.atkPhase === 'aim' && e.atkT <= 0) { this.archerShoot(e, tg); e.atkPhase = 'rest'; e.atkT = 0.85; }
    else if (e.atkPhase === 'rest' && e.atkT <= 0) { e.atkPhase = 'aim'; e.atkT = 0.65; this.sfx.bowDraw(); }
    return 0.3;
  }
  /** the arrow leaves the nocked position of the bow and arcs to the tower (see the 'arrow' branch of the enemy-shot loop) */
  archerShoot(e: Enemy, tg: Tower) {
    e.group.updateMatrixWorld(true);
    const nock = e.limbs.bow.userData.arrow as THREE.Object3D; const from = nock.localToWorld(new THREE.Vector3(0, 0, 0.45));
    const goal = tg.group.position.clone().setY(tg.group.position.y + 0.55);
    const arrow = makeArrow(); arrow.position.copy(from); arrow.lookAt(goal); this.scene.add(arrow);
    this.enemyShots.push({ pos: from.clone(), vel: new THREE.Vector3(), target: tg, mesh: arrow, life: 4, dmg: 2, kind: 'arrow', start: from.clone(), goal, t: 0 });
    this.particles.emit(from, 0xf5deb3, 3, 1, 0.04, 0.25, 0.6, 0); this.sfx.arrowShot();
  }
  /** Dread Knight: when a tower is within reach it plants itself, winds up (0.55s) and slashes (0.14s) – the tower is DESTROYED. Every slash is a one-hit kill. */
  dreadAI(e: Enemy, dt: number): number {
    const ph = e.atkPhase ?? 'walk';
    if (e.stunT > 0) { if (ph === 'wind') { e.atkPhase = 'walk'; e.atkT = 0.35; e.atkTarget = null; } return 1; } // a stun interrupts the wind-up
    if (ph === 'walk') {
      e.atkT = (e.atkT ?? 0) - dt; if (e.atkT > 0) return 1;
      const ep = e.group.position; let best: Tower | null = null, bd = 1.8;
      for (const t of this.towers) { const d = Math.hypot(t.group.position.x - ep.x, t.group.position.z - ep.z); if (d < bd) { bd = d; best = t; } }
      if (best) { e.atkTarget = best; e.atkPhase = 'wind'; e.atkT = 0.55; this.sfx.growl(); return 0; }
      return 1;
    }
    const tg = e.atkTarget;
    if (!tg || tg.dead || !this.towers.includes(tg)) { e.atkPhase = 'walk'; e.atkT = 0.2; e.atkTarget = null; return 1; }
    e.atkT = (e.atkT ?? 0) - dt;
    if (ph === 'wind' && e.atkT <= 0) { e.atkPhase = 'swing'; e.atkT = 0.14; }
    else if (ph === 'swing' && e.atkT <= 0) { this.dreadSlash(e, tg); e.atkPhase = 'rest'; e.atkT = 0.7; }
    else if (ph === 'rest' && e.atkT <= 0) { e.atkPhase = 'walk'; e.atkT = 0.12; e.atkTarget = null; }
    return 0;
  }
  /** the slash lands: a green energy crescent sweeps through the tower, a shockwave, green sparks – and the tower collapses */
  dreadSlash(e: Enemy, tg: Tower) {
    const tp = tg.group.position.clone(); const yaw = e.group.rotation.y;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.1, 6, 24, Math.PI * 0.85), new THREE.MeshBasicMaterial({ color: 0x7dffa3, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    arc.position.set(tp.x, tp.y + 0.55, tp.z); arc.rotation.set(0, yaw + Math.PI / 2, 0.25); this.scene.add(arc);
    this.fx.push({ mesh: arc, life: 0.32, max: 0.32, s0: 0.55, s1: 1.35, uniform: true });
    this.ring(tp.clone().setY(tp.y + 0.07), 0x5dff8c, 0.3, 2.1, 0.45, RING, 0.9);
    this.particles.emit(tp.clone().setY(tp.y + 0.4), 0x5dff8c, 22, 3.4, 0.12, 0.7, 3.6); this.particles.emit(tp.clone().setY(tp.y + 0.4), 0xffffff, 8, 2.6, 0.07, 0.4, 2.8);
    this.flash(tp.clone().setY(tp.y + 0.7), 0x5dff8c, 7, 6); this.shake = Math.max(this.shake, 0.4);
    this.float('TEBAS! ⚔️', tp.clone().setY(tp.y + 1.5), '#86efac'); this.sfx.slash();
    tg.hp = 0; this.destroyTower(tg);
  }
  /** War captain: every orc near him marches 15% faster while he lives; he blows his horn now and then */
  captainAI(e: Enemy, dt: number) {
    const ep = e.group.position;
    for (const o of this.enemies) if (o !== e && !o.dead && Math.abs(o.group.position.x - ep.x) < 2.6 && Math.abs(o.group.position.z - ep.z) < 2.6) o.rallyT = 0.25;
    e.shootT -= dt;
    if (e.shootT <= 0 && e.stunT <= 0) { e.shootT = 4.5; this.ring(ep.clone().setY(ep.y + 0.06), 0xfbbf24, 0.3, 2.6, 0.8, RING, 0.55); this.particles.emit(ep.clone().setY(ep.y + 1.6), 0xfde047, 6, 1.6, 0.07, 0.6, 2.4); this.sfx.warcry(); }
  }
  /** attack poses on top of the walking pose: the archer's drawn bow, the Dread Knight's chop – and turning to face the victim */
  eliteAttackPose(e: Enemy, dt: number) {
    const L = e.limbs; const ph = e.atkPhase ?? 'walk'; const at = e.atkT ?? 0;
    if (e.type === 'archer') {
      const aim = ph === 'aim', rest = ph === 'rest'; const d = aim ? Math.min(1, Math.max(0, 1 - at / 0.65)) : 0;
      if (aim || rest) { L.armL.rotation.set(-1.55, 0, 0.05); L.armR.rotation.set(-1.5 - d * 0.15, 0, 0.5 + d * 0.3); setBowDraw(L.bow, d, aim || at < 0.45); }
      else setBowDraw(L.bow, 0, false);
    } else if (e.type === 'dread' && ph !== 'walk') {
      const k = ph === 'wind' ? 1 - at / 0.55 : ph === 'swing' ? 1 - at / 0.14 : 1 - at / 0.7; poseDread(L, ph, Math.min(1, Math.max(0, k)));
    }
    if (e.atkTarget && ph !== 'walk') {
      const tp = e.atkTarget.group.position; let d = Math.atan2(tp.x - e.group.position.x, tp.z - e.group.position.z) - e.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); e.group.rotation.y += d * Math.min(1, dt * 10);
    }
  }

  /** Moli's landmine: pops out of the road, arms after a moment, then blows up when a ground orc steps on it. */
  layMine(t: Tower, p: THREE.Vector3, dmg: number) {
    const g = new THREE.Group(); const y = this.world?.heightAt(p.x, p.z) ?? 0;
    const body = mkSphere(0.2, 0x3a3f55, 0, 0.04, 0); body.scale.y = 0.62; g.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), mat(0xfbbf24, 0xf59e0b, 0.4)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 5), mat(0x9ca3af)); sp.position.set(Math.cos(a) * 0.18, 0.1, Math.sin(a) * 0.18); sp.rotation.z = -Math.cos(a) * 0.7; sp.rotation.x = Math.sin(a) * 0.7; g.add(sp); }
    const led = mkSphere(0.055, 0xfff176, 0, 0.17, 0, 0xffd600); led.name = 'led'; g.add(led);
    g.position.set(p.x, y + 0.02, p.z); g.scale.setScalar(0.01); this.scene.add(g);
    this.particles.emit(g.position.clone().setY(y + 0.1), 0x8a6a4b, 8, 1.4, 0.07, 0.5, 2.5);
    this.mines.push({ id: this.nextId++, owner: t.id, pos: p.clone().setY(y), mesh: g, arm: 0.8, dmg, r: 1.3 }); this.sfx.click();
  }
  mineBoom(m: Mine) {
    const at = m.pos.clone(); this.scene.remove(m.mesh); this.curSrc = at;
    this.fireball(at.clone().setY(at.y + 0.05), 1.05);
    this.ring(at.clone().setY(at.y + 0.07), 0xffd166, 0.2, m.r * 2, 0.35, RING, 0.9); this.flash(at.clone().setY(at.y + 0.6), 0xff9a3c, 7, 6); this.shake = Math.max(this.shake, 0.2); this.sfx.boom();
    this.float('BOOM!', at.clone().setY(at.y + 1.2), '#fb923c');
    for (const e of [...this.enemies]) if (!e.flying && !e.dead && e.group.position.distanceTo(at) <= m.r) { this.damage(e, m.dmg, { hitPos: this.enemyCenter(e) }); if (!e.dead && e.type !== 'boss') e.stunT = Math.max(e.stunT, 0.7); }
  }
  /** Dragon's fire stream: a stretched layered flame from its mouth to the tower. 5 HP/s = a full 20-HP tower burns down in 4 s (x0.25 under a shield dome). */
  /** The dragon's fire stream: 9 puffs of fire flowing from its mouth to the tower (thin + bright-yellow at the mouth, fat + red at the tower)
   *  plus a flame that sits on the burning tower and grows as the tower loses HP. */
  makeFireStream() {
    const g = new THREE.Group(); g.name = 'fireStream'; const puffs: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(SPHERE_FX, new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9, depthWrite: false })); m.frustumCulled = false; g.add(m); puffs.push(m);
    }
    const burn = makeFlame(0.7); burn.name = 'burnFlame'; g.add(burn);
    g.userData.puffs = puffs; g.userData.burn = burn; return g;
  }
  /** removes an enemy's fire stream for good (death, leaving the map, new level) – the only place that does so */
  dropBreath(e: Enemy) {
    const fs = e.breathMesh; e.breathTarget = null; e.breathActive = false; if (!fs) return;
    this.scene.remove(fs); for (const m of (fs.userData.puffs as THREE.Mesh[] | undefined) ?? []) (m.material as THREE.Material).dispose();
    e.breathMesh = undefined;
  }
  dragonBreath(e: Enemy, tg: Tower, dt: number) {
    e.group.updateMatrixWorld(true);
    const mouth = e.limbs.head.getObjectByName('mouth'); const m0 = mouth ? mouth.getWorldPosition(new THREE.Vector3()) : e.group.position.clone();
    const tp = tg.group.position; const tgt = new THREE.Vector3(tp.x, tp.y + 0.7, tp.z);
    if (!e.breathMesh) { e.breathMesh = this.makeFireStream(); e.breathMesh.visible = false; this.scene.add(e.breathMesh); }
    const fs = e.breathMesh; const starting = !fs.visible; fs.visible = true; e.breathActive = true;
    const puffs = fs.userData.puffs as THREE.Mesh[]; const burn = fs.userData.burn as THREE.Object3D;
    const n = puffs.length; const span = tgt.clone().sub(m0); const flow = this.time * 2.6 + e.bobOff;
    for (let i = 0; i < n; i++) {
      const u = (flow + i / n) % 1; const m = puffs[i]; const wob = Math.sin(flow * 5 + i * 1.7) * 0.07 * u;
      m.position.set(m0.x + span.x * u + wob, m0.y + span.y * u + Math.abs(wob) * 0.6 + Math.sin(u * Math.PI) * 0.12, m0.z + span.z * u - wob);
      m.scale.setScalar(0.07 + 0.3 * u * (0.85 + 0.3 * Math.sin(flow * 9 + i)));
      const pm = m.material as THREE.MeshBasicMaterial; pm.color.setHSL(0.14 - 0.12 * u, 1, 0.66 - 0.12 * u); pm.opacity = 0.95 * (1 - 0.5 * u * u);
    }
    const lost = 1 - tg.hp / TOWER_HP; burn.position.set(tp.x, tp.y + 0.35, tp.z); flickerFlame(burn, this.time * 1.4 + e.bobOff, 0.7 + 0.9 * lost);
    if (starting) { this.float('TERBAKAR!', tgt.clone().setY(tgt.y + 0.9), '#fb923c'); this.flash(m0, 0xffa64d, 4, 4); }
    for (let i = 0; i < 3; i++) { const k = Math.random(); const p = tgt.clone().lerp(m0, k).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)); this.particles.emit(p, k < 0.5 ? 0xff7a1a : 0xffd166, 1, 0.5, 0.1 + (1 - k) * 0.12, 0.35, 1.2, -2); }
    this.particles.emit(tgt.clone().setY(tgt.y + 0.25), 0xff6a1f, 2, 1.2, 0.13, 0.5, 2.5, -1);
    if (Math.random() < 0.2) this.flash(tgt, 0xff7a2a, 3.5, 3);
    let shield: Tower | null = null;
    for (const s2 of this.towers) if (s2.type === 'shield' && s2 !== tg && s2.group.position.distanceTo(tp) <= 2.0 + 0.3 * (s2.level - 1)) { shield = s2; break; }
    if (shield) shield.recoil = 1;
    tg.recoil = Math.max(tg.recoil, 0.6);
    this.setTowerHp(tg, tg.hp - 5 * dt * (shield ? 0.25 : 1));
    this.sfx.breath();
    if (tg.hp <= 0.001) { this.destroyTower(tg); e.breathTarget = null; this.stopBreath(e); }
  }
  stopBreath(e: Enemy) { if (e.breathMesh) e.breathMesh.visible = false; }

  /** Yaw toward the nearest bit of road – what a tower watches when nothing is happening. */
  roadYaw(p: THREE.Vector3) {
    let best = 1e9, bx = p.x, bz = p.z + 1;
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const a = this.waypoints[i], b = this.waypoints[i + 1]; const dx = b.x - a.x, dz = b.z - a.z; const L2 = dx * dx + dz * dz || 1;
      const k = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L2)); const x = a.x + dx * k, z = a.z + dz * k;
      const d = (x - p.x) * (x - p.x) + (z - p.z) * (z - p.z); if (d < best) { best = d; bx = x; bz = z; }
    }
    return Math.atan2(bx - p.x, bz - p.z);
  }
  /** EVERY tower (shooters and supports alike) keeps its head and eyes on whatever walks or flies past: its target, else the nearest enemy of ANY kind, else the road. */
  gazeTower(t: Tower, dt: number) {
    const tp = t.group.position;
    // quiet: the camera is in the south, so look only PART of the way toward the road (0 = face the viewer) – the cute face never turns its back on the player
    if (t.idleYaw === undefined) { t.idleYaw = this.roadYaw(tp) * 0.4; t.head.rotation.y = t.idleYaw; }
    let g: Enemy | null = t.target && !t.target.dead ? t.target : null;
    const R = Math.max(5.2, TOWER_DEFS[t.type].range + 0.3 * (t.level - 1) + 2.4);
    if (!g && t.gaze && !t.gaze.dead) { const dx = t.gaze.group.position.x - tp.x, dz = t.gaze.group.position.z - tp.z; if (dx * dx + dz * dz < R * R * 1.3) g = t.gaze; } // keep watching the orc it already follows (no jittering between neighbours)
    if (!g) {
      let bd = R * R;
      for (const e of this.enemies) { if (e.dead) continue; const dx = e.group.position.x - tp.x, dz = e.group.position.z - tp.z; const d = dx * dx + dz * dz; if (d < bd) { bd = d; g = e; } }
    }
    t.gaze = g;
    const want = g ? Math.atan2(g.group.position.x - tp.x, g.group.position.z - tp.z) : t.idleYaw + Math.sin(this.time * 0.5 + t.id) * 0.35;
    let d = want - t.head.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    t.head.rotation.y += d * Math.min(1, dt * (g ? 11 : 3));
  }
  /** Amor's mark: a pink heart floats over the orc; it takes +40% damage from EVERYTHING, pays +50% gold when it dies, and the mark jumps to a neighbour. */
  charm(e: Enemy, dur: number) {
    if (e.dead) return;
    const fresh = (e.charmT ?? 0) <= 0; e.charmT = Math.max(e.charmT ?? 0, dur);
    if (!e.charmMark) { const h = makeHeart(0xf472b6, 0.8); h.name = 'charm'; e.charmMark = h; e.group.add(h); }
    if (fresh) { const c = this.enemyCenter(e); this.float('💘 +40% DMG', c.setY(c.y + 0.9), '#f9a8d4'); this.sfx.heart(); }
  }
  /** Lumi's beam: a wide soft halo + six rainbow stripes side by side + a white-hot core, fading out in about 0.3s. */
  rainbowBeam(a: THREE.Vector3, b: THREE.Vector3, life = 0.3) {
    const d = b.clone().sub(a); const len = d.length(); d.normalize();
    const g = new THREE.Group(); g.position.copy(a).add(b).multiplyScalar(0.5); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
    const mk = (color: number, w: number, h: number, ox: number, k: number) => {
      const m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: k, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.material.userData.k = k; m.scale.set(w, h, len); m.position.set(ox, 0, 0); g.add(m);
    };
    mk(0xfff3b0, 0.55, 0.3, 0, 0.3);
    [0xff7aa8, 0xffb347, 0xffe066, 0x7ee787, 0x60a5fa, 0xc084fc].forEach((c, i) => mk(c, 0.075, 0.075, (i - 2.5) * 0.07, 0.85));
    mk(0xffffff, 0.07, 0.07, 0, 1);
    this.scene.add(g); this.fx.push({ mesh: g, life, max: life, s0: 1, s1: 1, fixed: true });
  }
  /** Golem stomp: a shockwave that hurts and stuns every ground orc around it. */
  stomp(t: Tower, st: { dmg: number; range: number }) {
    const tp = t.group.position; const at = tp.clone().setY(tp.y + 0.06);
    this.ring(at, 0xe7d9bd, 0.3, st.range, 0.5, RING, 0.9); this.ring(at.clone().setY(at.y + 0.03), 0xffffff, 0.2, st.range * 0.7, 0.35, RING, 0.7);
    this.particles.emit(at, 0xcdb98a, 22, 3.2, 0.12, 0.7, 3.2); this.particles.emit(at, 0x8a6a4b, 10, 2.6, 0.1, 0.8, 2.6);
    this.particles.emit(at, 0x9ca3af, 8, 1.4, 0.2, 1.1, 1.0, -0.8);
    this.flash(at.clone().setY(0.6), 0xffe0a0, 3, 4); this.shake = Math.max(this.shake, 0.22); this.sfx.stomp();
    this.curSrc = tp;
    for (const e of [...this.enemies]) {
      if (e.flying || e.dead) continue; const d = Math.hypot(e.group.position.x - tp.x, e.group.position.z - tp.z); if (d > st.range) continue;
      this.damage(e, Math.round(st.dmg * (1 - 0.4 * (d / st.range))), { hitPos: this.enemyCenter(e) });
      if (!e.dead && e.type !== 'boss') e.stunT = Math.max(e.stunT, 0.7 + 0.2 * t.level);
    }
  }

  fire(t: Tower, target: Enemy, st: { dmg: number; rate: number; range: number }) {
    const def = TOWER_DEFS[t.type]; const tp = t.group.position; const ang = t.head.rotation.y;
    const fwd = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
    t.cooldown = st.rate; t.recoil = 1; const goal = this.enemyCenter(target); this.curSrc = tp;
    if (t.type === 'mind') { // Hipno: picks the enemy standing in the thickest crowd that is not hallucinating yet and sends a psychic wave at it
      let best: Enemy | null = null, bs = -1;
      for (const e of this.enemies) {
        if (e.dead || (e.mindT ?? 0) > 0.5 || !(e.flying ? def.air : def.ground)) continue;
        const dx = e.group.position.x - tp.x, dz = e.group.position.z - tp.z; if (dx * dx + dz * dz > st.range * st.range) continue;
        let n = 0; for (const o of this.enemies) if (o !== e && !o.dead && o.group.position.distanceTo(e.group.position) < 2.4) n++;
        const sc = n * 100 + e.s * 0.01 - (e.type === 'boss' ? 50 : 0); if (sc > bs) { bs = sc; best = e; }
      }
      if (!best) { t.cooldown = 0.35; t.recoil = 0; return; } // nobody worth hypnotising right now
      t.target = best; t.cooldown = 4; // ONE laser, then the tower recharges for exactly 4 seconds (at every level)
      const from = this.muzzleWorld(t); // hallucination length / blow strength come from the MINDC table (Lv1 4 s x1.0 · Lv2 6 s x1.8 · Lv3 8 s x2.5)
      // the beam keeps going: Lv1 hypnotises 1 orc, Lv2 2, Lv3 3 (the others standing in the same line)
      const to0 = this.enemyCenter(best); const dir = to0.clone().sub(from).normalize(); const reach = st.range + 1.2; const kMain = to0.clone().sub(from).length();
      const extra: { e: Enemy; k: number }[] = [];
      if (t.level > 1) {
        for (const e of this.enemies) {
          if (e === best || e.dead || (e.mindT ?? 0) > 0.5 || !(e.flying ? def.air : def.ground)) continue;
          const rel = this.enemyCenter(e).sub(from); const k = rel.dot(dir); if (k < 0.3 || k > reach) continue;
          if (rel.addScaledVector(dir, -k).length() < 0.6 + e.size * 0.4) extra.push({ e, k });
        }
        extra.sort((a, b) => Math.abs(a.k - kMain) - Math.abs(b.k - kMain)); extra.length = Math.min(extra.length, t.level - 1);
      }
      const victims = [{ e: best, k: kMain }, ...extra]; const far = victims.reduce((m, v) => (v.k > m.k ? v : m), victims[0]);
      const to = this.enemyCenter(far.e); this.mindLaser(from, to); this.mindWave(from, to);
      for (const v of victims) this.mind(v.e, t.level); // every orc hit by the laser now fights its own friends
      this.particles.emit(this.muzzleWorld(t), 0xf0abfc, 8, 1.6, 0.06, 0.5, 2, 0); this.flash(this.muzzleWorld(t), 0xe879f9, 3, 3); this.sfx.mind(); return;
    }
    if (t.type === 'prism') { // Lumi: ONE wide rainbow beam through the whole line – every enemy on it is hit, +20% damage for each one already passed
      const start = this.muzzleWorld(t); const d = goal.clone().sub(start).normalize(); const len = st.range + 1.1;
      const end = start.clone().addScaledVector(d, len); const hits: { e: Enemy; k: number }[] = [];
      for (const e of this.enemies) {
        if (e.dead || !(e.flying ? def.air : def.ground)) continue;
        const rel = this.enemyCenter(e).sub(start); const k = rel.dot(d); if (k < 0.2 || k > len) continue;
        if (rel.addScaledVector(d, -k).length() < 0.5 + e.size * 0.4) hits.push({ e, k });
      }
      hits.sort((a, b) => a.k - b.k);
      this.rainbowBeam(start, end, 0.3); this.kick(t, 1.2); this.flash(start, 0xfff3b0, 4, 4);
      this.ring(start.clone().setY(start.y - 0.02), 0xfff3b0, 0.1, 0.9, 0.25, RING, 0.9);
      hits.forEach((h, i) => {
        const ec = this.enemyCenter(h.e);
        this.damage(h.e, Math.round(st.dmg * (1 + Math.min(1, 0.2 * i))), { hitPos: ec });
        this.particles.emit(ec, 0xfff3a0, 4, 2, 0.05, 0.3, 2, 0); this.ring(ec, 0xffffff, 0.1, 0.7, 0.2, RING, 0.8);
      });
      if (hits.length >= 3) this.float(`🌈 ×${hits.length} TEMBUS!`, goal.clone().setY(goal.y + 1.0), '#fde047');
      this.shake = Math.max(this.shake, 0.08); this.sfx.prism(); return;
    }
    if (t.type === 'cupid') { // Amor: a heart arrow that MARKS – it prefers an enemy that isn't marked yet, so the marks spread
      const pool = this.enemies.filter(e => !e.dead && (e.flying ? def.air : def.ground) && e.group.position.distanceTo(tp) <= st.range && (e.charmT ?? 0) <= 0.8);
      let tg = target; if (pool.length) { pool.sort((a, b) => b.s - a.s); tg = pool[0]; } t.target = tg;
      const start = this.muzzleWorld(t); const arrow = makeHeartArrow(); arrow.position.copy(start); arrow.lookAt(this.enemyCenter(tg)); this.scene.add(arrow);
      this.projectiles.push({ kind: 'heart', pos: start.clone(), start: start.clone(), t: 0, target: tg, speed: 11, dmg: st.dmg, mesh: arrow, level: t.level });
      const ap = t.head.getObjectByName('cArrow'); if (ap) ap.visible = false;
      this.particles.emit(start, 0xf9a8d4, 4, 1.2, 0.05, 0.3, 1.5, 0); this.sfx.heart(); return;
    }
    if (t.type === 'hook') { // Froggy: casts the hook at the FRONT-MOST orc; the update loop reels it back along the road
      if (target.hooked || (target.type === 'jumper' && target.jumpState === 'flying')) { t.cooldown = 0.4; return; }
      const tipO = t.head.getObjectByName('rodTip'); const tip = tipO ? tipO.getWorldPosition(new THREE.Vector3()) : this.muzzleWorld(t);
      const hookM = makeHook(); hookM.position.copy(tip); this.scene.add(hookM);
      const line = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0xf0f9ff })); this.scene.add(line);
      const resist = target.type === 'boss' ? 0.3 : target.type === 'dragon' ? 0.6 : target.type === 'log' ? 0.5 : target.type === 'tank' ? 0.7 : 1;
      this.hooks.push({ owner: t.id, e: target, phase: 'fly', t: 0, mesh: hookM, line, pullFrom: 0, pullTo: 0, dur: 0.6, dmg: st.dmg, resist, pull: 2.6 + 0.9 * (t.level - 1) });
      this.particles.emit(tip, 0xffffff, 3, 1, 0.04, 0.25, 1, 0); this.sfx.cast(); return;
    }
    if (t.type === 'bowl') { // Pino: lobs the ball onto the road just AHEAD of the front-most orc, then it rolls back through them all
      const dropS = Math.min(this.pathLen - 0.4, target.s + 1.4); const to = new THREE.Vector3(); this.posAt(dropS, to); to.y = (this.world?.heightAt(to.x, to.z) ?? 0) + 0.22;
      const from = this.muzzleWorld(t); const ball = makeBowlingBall(0x3b82f6); ball.position.copy(from); this.scene.add(ball);
      this.rolls.push({ owner: t.id, mesh: ball, phase: 'fly', t: 0, from: from.clone(), to, s: dropS, travelled: 0, maxDist: 4.2 + 1.2 * (t.level - 1), hit: new Set<number>(), dmg: st.dmg, strike: 0, last: from.clone() });
      const bp = t.head.getObjectByName('ballProp'); if (bp) bp.visible = false;
      this.sfx.toss(); return;
    }
    if (t.type === 'cactus') { // Spiky: rapid white needles (the projectile loop makes them 3x as strong against flying enemies)
      const start = this.muzzleWorld(t); const needle = makeNeedle(); needle.position.copy(start); needle.lookAt(goal); this.scene.add(needle);
      this.projectiles.push({ kind: 'needle', pos: start.clone(), start: start.clone(), t: 0, target, speed: 17, dmg: st.dmg, mesh: needle, level: t.level });
      this.particles.emit(start, 0xf0fdf4, 3, 1.2, 0.04, 0.2, 0.6, 0); this.sfx.needle(); return;
    }
    if (t.type === 'hive') { // Buzzy: a swarm of homing bees, spread over the 3 most advanced enemies in range
      const start = this.muzzleWorld(t); const n = 2 + t.level; const pool: Enemy[] = [];
      for (const e of this.enemies) { if (e.dead || !(e.flying ? def.air : def.ground)) continue; const dx = e.group.position.x - tp.x, dz = e.group.position.z - tp.z; if (dx * dx + dz * dz <= st.range * st.range) pool.push(e); }
      pool.sort((a, b) => b.s - a.s);
      for (let i = 0; i < n; i++) {
        const tg = pool.length ? pool[i % Math.min(pool.length, 3)] : target;
        const bee = makeBee(); bee.position.copy(start).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.2, (Math.random() - 0.5) * 0.3)); this.scene.add(bee);
        this.projectiles.push({ kind: 'bee', pos: bee.position.clone(), start: start.clone(), t: 0, target: tg, speed: 5.5 + Math.random() * 1.5, dmg: st.dmg, mesh: bee, level: t.level, seed: Math.random() * 6.28 });
      }
      this.particles.emit(start, 0xfde047, 6, 1.4, 0.05, 0.4, 1.4, 0); this.sfx.buzz(); return;
    }
    if (t.type === 'boomer') { // Bumi: the boomerang flies out in a wide loop and comes back, hurting every orc it touches on the way out AND on the way back
      const to = new THREE.Vector3(goal.x - tp.x, 0, goal.z - tp.z); const dd = Math.max(0.5, to.length()); to.normalize();
      const dist = Math.min(st.range * 1.15, Math.max(2.2, dd * 1.3));
      const from = this.muzzleWorld(t); from.y = tp.y + 0.95;
      const mesh = makeBoomerang(0xf59e0b, 0x2563eb); mesh.scale.setScalar(1 + 0.18 * (t.level - 1)); mesh.position.copy(from); this.scene.add(mesh);
      this.booms.push({ mesh, from: from.clone(), dir: to, side: new THREE.Vector3(-to.z, 0, to.x), dist, u: 0, hit: new Set<number>(), owner: t.id, dmg: st.dmg, back: false });
      const prop = t.head.userData.prop as THREE.Object3D | undefined; if (prop) prop.visible = false;
      this.particles.emit(from, 0xfde68a, 5, 1.2, 0.06, 0.3, 1.5); this.sfx.boomerang(); return;
    }
    if (t.type === 'plasma') {
      // continuous plasma lightning: damage ticks while the arc (drawn in updatePlasma) stays locked on; ignores armor,
      // and the longer it stays on one target the harder it hits (overcharge up to +80%)
      const ramp = 1 + Math.min(0.8, ((t.lockT ?? 0) / 3) * 0.8);
      t.recoil = 0.4 + Math.random() * 0.35;
      this.damage(target, st.dmg * ramp, { pierce: true, silent: true, noFlash: true });
      target.shockT = 0.2;
      this.particles.emit(goal, 0xfff3a0, 2, 2.4, 0.05, 0.3, 2.6); this.particles.emit(goal, 0x38bdf8, 1, 1.8, 0.05, 0.28, 2);
      if (Math.random() < 0.3) { this.ring(goal.clone().setY(0.08), 0x38bdf8, 0.1, 0.8, 0.22, RING, 0.85); this.flash(goal, 0x7dd3fc, 1.6, 2.5); }
      if (Math.random() < 0.18) this.particles.emit(this.muzzleWorld(t), 0xfff3a0, 2, 1.2, 0.04, 0.25, 1.4, 2);
      this.sfx.zap(); return;
    }
    if (t.type === 'flame') {
      const start = this.muzzleWorld(t);
      const cone = Math.PI / 5;
      for (const e of this.enemies) {
        if (e.flying || e.dead) continue; const d = e.group.position.clone().sub(tp); d.y = 0; const dist = d.length(); if (dist > st.range) continue;
        const a = Math.atan2(d.x, d.z); let diff = a - ang; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) < cone) this.damage(e, st.dmg, { silent: true, hitPos: this.enemyCenter(e) });
      }
      for (let i = 0; i < 3; i++) { const sp = 0.3 + Math.random() * 0.7; const p = start.clone().addScaledVector(fwd, sp * st.range * 0.9).add(new THREE.Vector3((Math.random() - 0.5) * sp * 0.9, Math.random() * 0.3, (Math.random() - 0.5) * sp * 0.9)); this.particles.emit(p, sp < 0.5 ? 0xffe066 : sp < 0.8 ? 0xf97316 : 0x6b7280, 1, 0.4, 0.14 * (0.5 + sp), 0.35, 1.2, -3); }
      this.kick(t, 0.75 + Math.random() * 0.45);
      this.flash(start.clone().addScaledVector(fwd, 0.6), 0xff8a3c, 2.5, 3); this.sfx.flame(); return;
    }
    if (t.type === 'trap') {
      const jawL = t.head.getObjectByName('jawL'), jawR = t.head.getObjectByName('jawR'); if (jawL && jawR) { jawL.rotation.z = -1.45; jawR.rotation.z = 1.45; }
      this.particles.emit(goal, 0xd6d3d1, 8, 2, 0.06, 0.3, 2); this.ring(goal.clone().setY(0.08), 0xffffff, 0.2, 1.2, 0.25, RING, 0.9);
      this.damage(target, st.dmg, { hitPos: goal, pierce: true }); if (!target.dead && target.type !== 'boss') { target.stunT = 1.2 + 0.3 * t.level; this.float('JEPIT!', goal.clone().setY(goal.y + 0.5), '#fde68a'); }
      this.shake = Math.max(this.shake, 0.1); this.sfx.trap(); return;
    }
    if (t.type === 'frost') {
      this.damage(target, st.dmg, { slow: true, hitPos: goal });
      this.particles.emit(goal, 0xcffcff, 4, 1.2, 0.08, 0.5, 1.5, 4);
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), mat(0xbff7ff, 0x3fc9e8, 0.3)); shard.position.copy(goal); this.scene.add(shard);
      this.addDebris(shard, new THREE.Vector3((Math.random() - 0.5) * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2), 0.9);
      this.sfx.shoot('frost'); return;
    }
    if (t.type === 'cannon') {
      const start = this.muzzleWorld(t);
      const tracer = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0xbfe0ff })); tracer.scale.set(0.09, 0.09, 0.55); tracer.position.copy(start); this.scene.add(tracer);
      const core = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0x4f8cff, transparent: true, opacity: 0.5 })); core.scale.set(1.8, 1.8, 0.8); tracer.add(core);
      this.projectiles.push({ kind: 'tracer', pos: start.clone(), start, t: 0, target, speed: 18, dmg: st.dmg, mesh: tracer, level: t.level });
      this.kick(t, 1);
      this.flash(start, 0xffe08a, 3, 3); this.particles.emit(start, 0xffe08a, 4, 1.5, 0.06, 0.2, 0.5, 0); this.sfx.shoot('cannon'); return;
    }
    if (t.type === 'blaster' || t.type === 'poison') {
      const isP = t.type === 'poison';
      const start = this.muzzleWorld(t);
      const shell = new THREE.Group();
      if (isP) { shell.add(mkSphere(0.16, 0xa3e635, 0, 0, 0, 0x65a30d)); shell.add(mkSphere(0.08, 0xd9f99d, 0.1, 0.08, 0)); }
      else { shell.add(mkBox(0.22, 0.22, 0.34, 0x2b2b35)); shell.add(mkBox(0.26, 0.26, 0.12, def.accent, 0, 0, -0.12)); shell.add(mkBox(0.12, 0.12, 0.12, 0xffb347, 0, 0, 0.2, 0xff8a4c)); }
      shell.position.copy(start); this.scene.add(shell);
      this.projectiles.push({ kind: isP ? 'glob' : 'mortar', pos: start.clone(), start, t: 0, target, speed: isP ? 1.3 : 1.1, dmg: st.dmg, mesh: shell, splash: isP ? 1.0 : 1.3, arc: (isP ? 1.6 : 2.2) + Math.random() * 0.6, level: t.level });
      this.kick(t, 1);
      if (isP) { this.particles.emit(start, 0xa3e635, 6, 1, 0.07, 0.4, 2); this.sfx.shoot('poison'); }
      else { this.flash(start, 0xffa64d, 3, 3); this.particles.emit(start, 0x777777, 8, 1, 0.12, 0.6, 1.5, -1); this.shake = Math.max(this.shake, 0.08); this.sfx.shoot('blaster'); }
      return;
    }
    if (t.type === 'sniper') {
      const start = this.muzzleWorld(t);
      this.bolt(start, goal, 0xccffee, 0.05, 0.25, 0); this.bolt(start, goal, 0x34d399, 0.12, 0.12, 0);
      this.kick(t, 1.15);
      this.flash(start, 0xccffee, 4, 3); this.flash(goal, 0x34d399, 3, 3);
      this.particles.emit(goal, 0xccffee, 10, 2.5, 0.06, 0.35, 2); this.ring(goal, 0x34d399, 0.1, 0.9, 0.25, RING, 0.9);
      const isBig = target.type === 'boss' || target.type === 'dragon';
      this.damage(target, st.dmg * (target.armor > 0 ? 1.4 : 1), { pierce: true, hitPos: goal });
      if (!target.dead && !isBig) { target.s = Math.max(0, target.s - 0.5); this.float('KNOCK!', goal.clone().setY(goal.y + 0.5), '#6ee7b7'); }
      this.shake = Math.max(this.shake, 0.1); this.sfx.shoot('sniper'); return;
    }
    if (t.type === 'tesla') {
      const tipObj = t.head.getObjectByName('tip' + (Math.random() < 0.5 ? 0 : 1));
      const start = tipObj ? tipObj.getWorldPosition(new THREE.Vector3()) : this.muzzleWorld(t);
      const chain = 2 + t.level; let cur: Enemy = target; let from = start; const hit = new Set<number>(); let dmg = st.dmg;
      for (let i = 0; i < chain && cur; i++) {
        const to = this.enemyCenter(cur); this.zap(from, to, TESLA_STYLE, 0.32);
        this.particles.emit(to, 0xe9d5ff, 6, 2, 0.05, 0.3, 2, 0); this.flash(to, 0xa855f7, 2.5, 3);
        this.damage(cur, dmg, { hitPos: to }); hit.add(cur.id); dmg = Math.round(dmg * 0.8); from = to;
        let next: Enemy | null = null; let bd = 2.2;
        for (const e of this.enemies) { if (hit.has(e.id) || e.dead) continue; const dd = e.group.position.distanceTo(cur.group.position); if (dd < bd) { bd = dd; next = e; } }
        if (!next) break; cur = next;
      }
      this.sfx.shoot('tesla'); return;
    }
    if (t.type === 'naga') {
      const start = this.muzzleWorld(t);
      const dropS = Math.min(this.pathLen - 0.4, target.s + 0.5);
      const s0 = Math.max(0, dropS - 2.0), s1 = Math.min(this.pathLen, dropS + 2.0);
      const meshes: THREE.Object3D[] = [];
      const pts = 5;
      for (let i = 0; i < pts; i++) {
        const sp = s0 + (s1 - s0) * (i / (pts - 1));
        const p = new THREE.Vector3(); this.posAt(sp, p); p.y = (this.world?.heightAt(p.x, p.z) ?? 0) + 0.05;
        const rock = mkBox(0.5, 0.04, 0.5, 0x1c1917);
        rock.rotation.y = (i * 1.3) % 3.14;
        rock.position.copy(p);
        const lava = mkBox(0.4, 0.06, 0.18, 0xff5722);
        lava.rotation.y = 0.5;
        rock.add(lava);
        this.scene.add(rock);
        meshes.push(rock);
      }
      this.fissures.push({ id: this.nextId++, owner: t.id, s0, s1, dps: st.dmg * 0.9, life: 4.5 + t.level * 0.5, maxLife: 4.5 + t.level * 0.5, meshes });
      this.kick(t, 1.2);
      this.flash(start, 0xff7a1a, 5, 4);
      this.bolt(start, goal, 0xff7a1a, 0.12, 0.35, 0.1);
      this.particles.emit(start, 0xff7a1a, 10, 2.0, 0.08, 0.4, 2);
      this.particles.emit(goal, 0xff5722, 16, 2.8, 0.1, 0.5, 2.5);
      this.ring(goal.clone().setY(0.08), 0xff5722, 0.2, 1.8, 0.35, RING, 0.9);
      this.float('RETAKAN LAHAR! 🔥', goal.clone().setY(goal.y + 0.8), '#ff7a1a');
      this.sfx.dragonShot();
      for (const e of this.enemies) {
        if (e.dead || e.type === 'boss') continue;
        if (e.group.position.distanceTo(tp) <= st.range * 0.6) {
          e.s = Math.max(0, e.s - 0.4);
        }
      }
      return;
    }
    if (t.type === 'storm') {
      const cyGroup = new THREE.Group();
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 }));
      ring1.rotation.x = Math.PI / 2; ring1.position.y = 0.2; cyGroup.add(ring1);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 6, 16), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7 }));
      ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.6; cyGroup.add(ring2);
      const ring3 = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 6, 16), new THREE.MeshBasicMaterial({ color: 0xf0f9ff, transparent: true, opacity: 0.8 }));
      ring3.rotation.x = Math.PI / 2; ring3.position.y = 1.1; cyGroup.add(ring3);
      const startS = target.s;
      const startP = new THREE.Vector3(); this.posAt(startS, startP);
      cyGroup.position.copy(startP); this.scene.add(cyGroup);
      this.cyclones.push({ id: this.nextId++, owner: t.id, s: startS, dir: -1, range: 5.5 + t.level, travelled: 0, dps: st.dmg * 0.85, life: 3.5, maxLife: 3.5, mesh: cyGroup, level: t.level });
      this.kick(t, 1.1);
      const start = this.muzzleWorld(t);
      this.flash(start, 0x38bdf8, 4, 3);
      this.particles.emit(start, 0x38bdf8, 12, 2.2, 0.08, 0.4, 2);
      this.float('TORNADO BADAI! 🌪️', startP.clone().setY(startP.y + 1.4), '#38bdf8');
      this.sfx.cyclone();
      return;
    }
    if (t.type === 'quake') {
      const dropP = new THREE.Vector3(); this.posAt(target.s, dropP); dropP.y = (this.world?.heightAt(dropP.x, dropP.z) ?? 0);
      const spikeGroup = new THREE.Group();
      spikeGroup.add(mkBox(0.24, 0.85, 0.24, 0x334155, 0, 0.42, 0));
      spikeGroup.add(mkBox(0.32, 0.16, 0.32, 0xf97316, 0, 0.6, 0));
      spikeGroup.add(mkSphere(0.12, 0xfbbf24, 0, 0.88, 0));
      spikeGroup.position.copy(dropP); this.scene.add(spikeGroup);
      const tethers: number[] = [];
      const lineMeshes: THREE.Line[] = [];
      for (const e of this.enemies) {
        if (e.dead || e.flying) continue;
        if (Math.hypot(e.group.position.x - dropP.x, e.group.position.z - dropP.z) <= 3.5) {
          tethers.push(e.id);
          e.tetherSpikeId = t.id;
          if (e.armor > 0) e.armor = Math.max(0, e.armor - (2 + t.level));
          const geom = new THREE.BufferGeometry().setFromPoints([dropP.clone().setY(dropP.y + 0.8), this.enemyCenter(e)]);
          const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xf97316 }));
          this.scene.add(line);
          lineMeshes.push(line);
          if (tethers.length >= 2 + t.level) break;
        }
      }
      this.spikes.push({ id: this.nextId++, owner: t.id, pos: dropP.clone(), s: target.s, tethers, life: 4.2 + t.level * 0.5, maxLife: 4.2 + t.level * 0.5, mesh: spikeGroup, lineMeshes });
      this.kick(t, 1.4);
      this.shake = Math.max(this.shake, 0.24);
      this.ring(dropP.clone().setY(0.08), 0xf97316, 0.3, 1.8, 0.4, RING, 0.9);
      this.particles.emit(dropP, 0xf97316, 18, 2.5, 0.1, 0.6, 2.5);
      this.float(`RANTAI JIWA! ⛓️ ×${tethers.length}`, dropP.clone().setY(dropP.y + 1.2), '#f97316');
      this.sfx.tether();
      return;
    }
    if (t.type === 'glacier') {
      const wallS = Math.min(this.pathLen - 0.4, target.s + 0.7);
      const wallPos = new THREE.Vector3(); this.posAt(wallS, wallPos); wallPos.y = (this.world?.heightAt(wallPos.x, wallPos.z) ?? 0);
      const pNext = new THREE.Vector3(); this.posAt(wallS + 0.3, pNext);
      const roadAngle = Math.atan2(pNext.x - wallPos.x, pNext.z - wallPos.z);
      const wallGroup = new THREE.Group();
      wallGroup.position.copy(wallPos);
      wallGroup.rotation.y = roadAngle + Math.PI / 2;
      wallGroup.add(mkBox(1.5, 0.8, 0.35, 0x38bdf8, 0, 0.4, 0));
      wallGroup.add(mkBox(1.1, 0.45, 0.45, 0xa5f3fc, 0, 0.7, 0));
      const shard1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), mat(0xe0f2fe, 0x06b6d4, 0.4));
      shard1.position.set(-0.4, 0.95, 0); wallGroup.add(shard1);
      const shard2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), mat(0xe0f2fe, 0x06b6d4, 0.4));
      shard2.position.set(0.3, 1.05, 0); wallGroup.add(shard2);
      const hpBg = mkBox(1.0, 0.08, 0.04, 0x1f2937, 0, 1.35, 0);
      const hpFg = mkBox(0.96, 0.06, 0.05, 0x38bdf8, 0, 1.35, 0.01);
      wallGroup.add(hpBg); wallGroup.add(hpFg);
      this.scene.add(wallGroup);
      const maxHp = 220 + 120 * (t.level - 1);
      this.iceWalls.push({ id: this.nextId++, owner: t.id, s: wallS, pos: wallPos.clone(), hp: maxHp, maxHp, life: 5.5 + t.level * 0.5, maxLife: 5.5 + t.level * 0.5, mesh: wallGroup, hpFg, level: t.level });
      this.kick(t, 1.1);
      this.ring(wallPos.clone().setY(0.08), 0x06b6d4, 0.3, 1.8, 0.45, RING, 0.9);
      this.particles.emit(wallPos, 0xa5f3fc, 18, 2.2, 0.1, 0.6, 2.5);
      this.float('TEMBOK ES! 🧊', wallPos.clone().setY(wallPos.y + 1.5), '#7dd3fc');
      this.sfx.iceWall();
      return;
    }
    if (t.type === 'meteor') {
      const start = this.muzzleWorld(t);
      const shell = new THREE.Group();
      shell.add(mkSphere(0.24, 0x292524, 0, 0, 0, 0xef4444));
      const fl = makeFlame(0.4); fl.rotation.x = -Math.PI / 2; fl.position.z = -0.15; shell.add(fl);
      shell.position.copy(start); this.scene.add(shell);
      this.projectiles.push({ kind: 'meteor', pos: start.clone(), start, t: 0, target, speed: 1.1, dmg: st.dmg, mesh: shell, splash: 1.6, arc: 2.5 + Math.random() * 0.5, level: t.level });
      this.kick(t, 1.3);
      this.flash(start, 0xef4444, 4, 4);
      this.particles.emit(start, 0xef4444, 10, 2.2, 0.1, 0.5, 3);
      this.sfx.shoot('blaster');
      return;
    }
    if (t.type === 'vortex') {
      const center = this.enemyCenter(target);
      const start = this.muzzleWorld(t);
      this.bolt(start, center, 0x818cf8, 0.08, 0.35, 0.1);
      this.ring(center.clone().setY(0.08), 0x818cf8, 0.3, 2.2, 0.6, RING, 0.9);
      this.particles.emit(center, 0xc084fc, 16, 2.5, 0.08, 0.6, 2.5);
      this.flash(center, 0x818cf8, 4, 3);
      this.float('SINGULARITAS! 🌀', center.clone().setY(center.y + 0.8), '#a5b4fc');
      this.sfx.whoosh();
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = e.group.position.distanceTo(center);
        if (d <= 2.2) {
          e.s = Math.max(0, e.s - 0.5 * (1 - d / 2.2));
          this.damage(e, st.dmg, { hitPos: this.enemyCenter(e), silent: true });
        }
      }
      return;
    }
    if (t.type === 'orbital') {
      const ec = this.enemyCenter(target);
      const sky = ec.clone().setY(12);
      this.bolt(sky, ec, 0xfacc15, 0.16, 0.4, 0);
      this.bolt(sky, ec, 0xffffff, 0.08, 0.3, 0);
      this.ring(ec.clone().setY(0.08), 0xfacc15, 0.2, 1.2, 0.3, RING, 0.95);
      this.particles.emit(ec, 0xfacc15, 12, 2.8, 0.08, 0.4, 2.5);
      this.flash(ec, 0xfacc15, 5, 5);
      target.armor = Math.max(0, target.armor - 1);
      this.damage(target, st.dmg, { pierce: true, hitPos: ec });
      this.shake = Math.max(this.shake, 0.15);
      this.sfx.zap();
      return;
    }
    if (t.type === 'siren') {
      const ec = this.enemyCenter(target);
      const from = this.muzzleWorld(t);
      this.ring(from, 0x22d3ee, 0.2, st.range * 0.9, 0.5, RING, 0.8);
      this.particles.emit(ec, 0x67e8f9, 8, 2.0, 0.06, 0.4, 2);
      this.flash(ec, 0x22d3ee, 3, 3);
      this.sfx.heart();
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (e.group.position.distanceTo(tp) <= st.range) {
          e.sirenT = 4.0;
          this.damage(e, st.dmg, { hitPos: this.enemyCenter(e) });
        }
      }
      return;
    }
  }
  explode(at: THREE.Vector3, p: Projectile) {
    if (p.kind === 'fireball') {
      this.fireball(at, 1.25);
      this.particles.emit(at, 0xff7a1a, 20, 3.2, 0.12, 0.7, 3.2);
      this.particles.emit(at, 0xfde047, 14, 2.4, 0.09, 0.5, 2.6);
      this.ring(at.clone().setY(0.07), 0xef4444, 0.2, p.splash! * 2.2, 0.35, RING, 0.9);
      this.flash(at.clone().setY(0.6), 0xff4444, 7, 6);
      this.shake = Math.max(this.shake, 0.22);
      this.sfx.boom();
      const r = p.splash! * 1.1;
      const life = 3.5 + p.level;
      const m = new THREE.Mesh(DISC, new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.7, depthWrite: false }));
      m.position.copy(at).setY(0.05); m.scale.setScalar(r); this.scene.add(m);
      this.puddles.push({ mesh: m, pos: at.clone(), r, dps: p.dmg * 0.45, life });
      for (const e of [...this.enemies]) {
        if (e.group.position.distanceTo(at) <= p.splash!) {
          this.damage(e, e.flying ? Math.round(p.dmg * 1.25) : p.dmg, { hitPos: this.enemyCenter(e) });
          e.burnT = 3.0; e.burnDps = Math.round(p.dmg * 0.35);
        }
      }
      return;
    }
    if (p.kind === 'meteor') {
      this.fireball(at, 1.8);
      this.particles.emit(at, 0xef4444, 30, 4.2, 0.15, 0.9, 4.0);
      this.particles.emit(at, 0xfacc15, 22, 3.5, 0.12, 0.7, 3.5);
      this.ring(at.clone().setY(0.07), 0xb91c1c, 0.3, p.splash! * 2.4, 0.45, RING, 0.95);
      this.flash(at.clone().setY(0.8), 0xff3b30, 10, 8);
      this.shake = Math.max(this.shake, 0.4);
      this.float('METEORIT! ☄️', at.clone().setY(1.5), '#f87171');
      this.sfx.boom();
      const r = p.splash! * 1.25;
      const life = 4.0 + p.level;
      const m = new THREE.Mesh(DISC, new THREE.MeshBasicMaterial({ color: 0xb91c1c, transparent: true, opacity: 0.75, depthWrite: false }));
      m.position.copy(at).setY(0.05); m.scale.setScalar(r); this.scene.add(m);
      this.puddles.push({ mesh: m, pos: at.clone(), r, dps: p.dmg * 0.5, life });
      for (const e of [...this.enemies]) {
        if (!e.flying && e.group.position.distanceTo(at) <= p.splash!) {
          this.damage(e, p.dmg, { hitPos: this.enemyCenter(e), pierce: true });
          if (!e.dead && e.type !== 'boss') e.stunT = Math.max(e.stunT, 1.0);
        }
      }
      return;
    }
    if (p.kind === 'glob') {
      this.particles.emit(at, 0xa3e635, 16, 2.2, 0.1, 0.6, 2.5); this.particles.emit(at, 0x4d7c0f, 8, 1.4, 0.12, 0.8, 1.5);
      this.ring(at.clone().setY(0.07), 0xa3e635, 0.2, p.splash! * 2, 0.35, RING, 0.9);
      const r = p.splash! * (1 + 0.15 * (p.level - 1)); const life = 4 + p.level;
      const m = new THREE.Mesh(DISC, new THREE.MeshBasicMaterial({ color: 0x84cc16, transparent: true, opacity: 0.65, depthWrite: false })); m.position.copy(at).setY(0.05); m.scale.setScalar(r); this.scene.add(m);
      this.puddles.push({ mesh: m, pos: at.clone(), r, dps: p.dmg * 2.5, life });
      for (const e of this.enemies) if (!e.flying && e.group.position.distanceTo(at) <= r) { e.poisonT = 3; e.poisonDps = p.dmg * 1.5; }
      this.sfx.splat(); return;
    }
    this.particles.emit(at, 0xffd166, 18, 3.5, 0.13, 0.5, 3); this.particles.emit(at, 0xff6a2b, 14, 2.5, 0.16, 0.6, 2.5);
    this.particles.emit(at, 0x55555f, 16, 1.2, 0.2, 1.2, 1.2, -1.5); this.particles.emit(at, 0x8a6a4b, 10, 3, 0.1, 0.8, 4);
    this.ring(at.clone().setY(0.07), 0xffd166, 0.2, p.splash! * 2.2, 0.35, RING, 0.9);
    this.ring(at.clone().setY(0.04), 0x2a2420, p.splash! * 0.9, p.splash! * 1.1, 6, DISC, 0.55);
    this.ring(at.clone().setY(0.3), 0xffffff, 0.1, 1.2, 0.2, undefined, 0.8, 1.5);
    this.flash(at.clone().setY(0.6), 0xff9a3c, 8, 6); this.shake = Math.max(this.shake, 0.22); this.sfx.boom();
    for (const e of [...this.enemies]) if (!e.flying && e.group.position.distanceTo(at) <= p.splash!) this.damage(e, p.dmg);
  }

  // ---------- Loop ----------
  loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const steps = this.state.screen === 'playing' ? this.state.speed : 1;
    for (let i = 0; i < steps; i++) { this.time += dt; this.update(dt); }
    if (this.world) { this.world.pads.visible = this.state.screen === 'playing'; this.world.update(this.clock.elapsedTime); }
    if (this.state.screen !== 'select') this.render(); // the select screen is opaque and runs its own 3D horde preview, so don't draw the level behind it
    this.syncAudio();
    const now = performance.now();
    if (this.dirty || now - this.lastEmit > 120) {
      this.lastEmit = now; this.dirty = false;
      const t = this.towers.find(x => x.id === this.selectedTowerId);
      this.state.selectedTower = t ? { id: t.id, type: t.type, level: t.level, upgradeCost: this.upgradeCost(t.type, t.level), sellValue: Math.round(t.invested * 0.7), dmg: t.type === 'plasma' ? Math.round(this.towerStats(t.type, t.level, t.buff).dmg / this.towerStats(t.type, t.level).rate) : this.towerStats(t.type, t.level, t.buff).dmg, range: this.towerStats(t.type, t.level).range.toFixed(1), buff: t.buff, hp: Math.ceil(t.hp) } : null;
      this.state.enemiesLeft = this.enemies.length + this.spawnQueue.length;
      this.onState({ ...this.state });
    }
  };

  update(dt: number) {
    const s = this.state; const playing = s.screen === 'playing';
    this.curSrc = null; this.rag.update(dt);
    if (this.crystal) { this.crystal.rotation.y += dt * 1.2; this.crystal.position.y = ((this.crystal.userData.y0 as number | undefined) ?? 1) + Math.sin(this.time * 2) * 0.12; }
    if (this.crystalLight) this.crystalLight.intensity = 2.2 + Math.sin(this.time * 3) * 0.6;
    this.levelGroup.children.forEach(ch => { if (ch.userData.cloud) { ch.position.x += ch.userData.speed * dt; if (ch.position.x > 24) ch.position.x = -24; } });
    for (const t of this.towers) {
      const tg = t.group.userData.target ?? 1; if (t.group.scale.x < tg) t.group.scale.setScalar(Math.min(tg, t.group.scale.x + dt * 4));
      if (t.muzzle && t.muzzle.scale.x > 0) t.muzzle.scale.multiplyScalar(Math.max(0, 1 - dt * 14));
      const hd = t.head.userData as { sz: number; focus?: number; squint?: number; face?: THREE.Object3D; flames?: THREE.Object3D[] };
      if (playing) this.gazeTower(t, dt); // every tower turns its head toward whatever passes by (or the road when it's quiet)
      // living body: breathing, little sway, squash when shooting
      const rc = t.recoil, br = Math.sin(this.time * 2.2 + t.id) * 0.015;
      t.head.scale.set(hd.sz * (1 + rc * 0.06), hd.sz * (1 - rc * 0.08 + br), hd.sz * (1 + rc * 0.06));
      t.head.rotation.z = Math.sin(this.time * 1.6 + t.id) * 0.025;
      // face: blink, look around / at target, focus, squint when firing, worry when hurt
      if (hd.face) {
        const gz = t.target && !t.target.dead ? t.target : t.gaze; // eyes follow the shooting target, else whoever is walking past
        hd.focus = THREE.MathUtils.lerp(hd.focus ?? 0, t.target ? 1 : gz ? 0.35 : 0, Math.min(1, dt * 8));
        hd.squint = THREE.MathUtils.lerp(hd.squint ?? 0, Math.min(1, rc * 1.2), Math.min(1, dt * 14));
        let lx = Math.sin(this.time * 0.7 + t.id) * 0.7, ly = Math.sin(this.time * 0.45 + t.id * 2) * 0.35;
        if (gz && !gz.dead) {
          const tp2 = t.group.position, tg2 = gz.group.position; const want = Math.atan2(tg2.x - tp2.x, tg2.z - tp2.z);
          const diff = Math.atan2(Math.sin(want - t.head.rotation.y), Math.cos(want - t.head.rotation.y));
          lx = THREE.MathUtils.clamp(diff * 1.5, -1, 1); ly = gz.flying ? 0.7 : -0.15;
        }
        updateFace(hd.face, dt, this.time, { lookX: lx, lookY: ly, focus: hd.focus, squint: hd.squint, worry: t.hp <= 10 ? 1 - t.hp / 10 : 0 });
      }
      hd.flames?.forEach(f => flickerFlame(f, this.time + t.id));
      const ia = t.head.userData.idleArc as IdleArc | undefined;
      if (ia) {
        ia.t -= dt; if (ia.t <= 0) { ia.bolt.reseed(); ia.t = 0.06 + Math.random() * 0.1; ia.bolt.group.visible = t.target ? true : Math.random() < 0.6; }
        ia.bolt.update(ia.a, ia.b, 1);
      }
      const horn = t.head.getObjectByName('boltHorn'); if (horn) { horn.position.y = 1.04 + Math.sin(this.time * 3 + t.id) * 0.03; horn.rotation.z = Math.sin(this.time * 2.2 + t.id) * 0.08; }
      const sh = t.group.getObjectByName('shards'); if (sh) { sh.rotation.y += dt * 1.3; sh.children.forEach((c, i) => { c.position.y = Math.sin(this.time * 2.5 + i * 2) * 0.05; }); }
      const gear = t.head.getObjectByName('gear'); if (gear) gear.rotation.z += dt * (1 + rc * 8);
      const pcoin = t.head.getObjectByName('coin'); if (pcoin) { pcoin.rotation.y += dt * 2.6; pcoin.position.y = 1.18 + Math.sin(this.time * 3 + t.id) * 0.05 + rc * 0.3; pcoin.scale.setScalar(1 + rc * 0.35); }
      const wrotor = t.head.getObjectByName('rotor'); if (wrotor) wrotor.rotation.y += dt * (4 + (t.target ? 18 : 0));
      for (let i = 0; i < 2; i++) { const sw = t.head.getObjectByName('swirl' + i); if (sw) { sw.rotation.y += dt * (i ? -1 : 1) * (1.5 + (t.target ? 4 : 0)); sw.position.y = (i ? 0.58 : 0.34) + Math.sin(this.time * 2 + i) * 0.03; } }
      const bprop = t.head.getObjectByName('boomProp'); if (bprop) { bprop.rotation.y += dt * (bprop.visible ? 5 : 0); bprop.position.y = 1.02 + Math.sin(this.time * 2.4 + t.id) * 0.05; }
      const mhead = t.head.getObjectByName('moleHead'); if (mhead) mhead.position.y = 0.2 + Math.sin(this.time * 1.8 + t.id) * 0.015 + rc * 0.14;
      const spir = t.head.getObjectByName('spiral'); if (spir) spir.rotation.z -= dt * (1.2 + (t.target ? 4.5 : 0) + rc * 6); // Hipno's hypnotic spiral
      if (t.type === 'mind') { // the jewel charges up during the 4 s recharge: small + dim right after a shot, big + bright when the next laser is ready
        const jw = t.head.getObjectByName('spin') as THREE.Mesh | undefined;
        if (jw) {
          const b0 = (jw.userData.b0 ??= jw.scale.clone()) as THREE.Vector3; const ch = THREE.MathUtils.clamp(1 - t.cooldown / 4, 0, 1);
          jw.scale.copy(b0).multiplyScalar(0.7 + 0.9 * ch * ch + rc * 0.6 + Math.sin(this.time * (6 + 10 * ch)) * 0.05 * ch);
          (jw.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + 1.2 * ch;
        }
      }
      const ca0 = t.head.getObjectByName('cArm0'), ca1 = t.head.getObjectByName('cArm1');
      if (ca0 && ca1) { const sw2 = Math.sin(this.time * 3 + t.id) * 0.12 + rc * 0.7; ca0.rotation.z = sw2; ca1.rotation.z = -sw2; }
      const flw = t.head.getObjectByName('flower'); if (flw) { flw.rotation.z = Math.sin(this.time * 2 + t.id) * 0.12; flw.rotation.y += dt * 0.8; }
      for (let i = 0; i < 2; i++) { const hw = t.head.getObjectByName('hWing' + i); if (hw) hw.rotation.z = (i ? 1 : -1) * (0.25 + Math.sin(this.time * 45 + i) * 0.35); }
      for (let i = 0; i < 2; i++) {
        const dw = t.head.getObjectByName('dWing' + i);
        if (dw) dw.rotation.z = (i ? 1 : -1) * (0.25 + Math.sin(this.time * 10 + i) * 0.35 + rc * 0.5);
      }
      if (t.type === 'quake') {
        const hm = t.head.getObjectByName('hammer');
        if (hm) hm.position.y = 0.32 + Math.max(0, rc) * 0.25;
      }
      const fL = t.head.getObjectByName('fistL'), fR = t.head.getObjectByName('fistR');
      if (fL && fR) { const up = t.pulseT > 0 ? 1 - t.pulseT / 0.22 : 0; const fy = 0.3 + up * 0.65 - rc * 0.08 + Math.sin(this.time * 2 + t.id) * 0.015; fL.position.y = fy; fR.position.y = fy; }
      const cmn = t.head.getObjectByName('clockMin'), chr = t.head.getObjectByName('clockHour'); if (cmn && chr) { cmn.rotation.z = -this.time * (2.2 + rc * 6); chr.rotation.z = -this.time * 0.18; }
      const rateNow = this.towerStats(t.type, t.level).rate;
      const lampS = t.head.getObjectByName('lampSpin'); if (lampS) { lampS.rotation.y += dt * (2.5 + (t.target ? 5 : 0) + rc * 14); lampS.scale.setScalar(1 + rc * 0.35); }
      for (let i = 0; i < 2; i++) { const cw = t.head.getObjectByName('cWing' + i); if (cw) cw.rotation.z = (i ? 1 : -1) * (Math.sin(this.time * 9 + t.id) * 0.28 + rc * 0.5); }
      const haloM = t.head.getObjectByName('halo'); if (haloM) { haloM.position.y = 0.98 + Math.sin(this.time * 2.4 + t.id) * 0.025; haloM.rotation.z += dt * 1.2; }
      const arrowP = t.head.getObjectByName('cArrow'); if (arrowP) arrowP.visible = t.cooldown < Math.max(0.2, rateNow * 0.65); // a new arrow is nocked after the shot
      const ballP = t.head.getObjectByName('ballProp'); if (ballP) { ballP.visible = t.cooldown < Math.max(0.3, rateNow * 0.55); ballP.rotation.y += dt * 0.8; }
      const idleL = t.head.getObjectByName('idleLine'); if (idleL) { idleL.visible = !this.hooks.some(h => h.owner === t.id); idleL.rotation.z = Math.sin(this.time * 1.8 + t.id) * 0.08; idleL.rotation.x = Math.cos(this.time * 1.3 + t.id) * 0.06; }
      const bls = t.head.getObjectByName('bells'); if (bls) bls.rotation.z = Math.sin(this.time * 38) * 0.12 * Math.min(1, rc * 2);
      for (let i = 0; i < 2; i++) { const tip = t.head.getObjectByName('tip' + i); if (tip) { const b0 = (tip.userData.b ??= tip.scale.x) as number; tip.scale.setScalar(b0 * (1 + Math.sin(this.time * 25 + i * 3) * 0.35)); } }
      if (t.type === 'trap') {
        const jl = t.head.getObjectByName('jawL'), jr = t.head.getObjectByName('jawR');
        if (jl && jr) { const nx = Math.max(0.3, Math.abs(jr.rotation.z) - dt * 0.85); jr.rotation.z = nx; jl.rotation.z = -nx; if (hd.face) hd.face.position.y = 0.5 - ((nx - 0.3) / 1.15) * 0.3; }
      }
      const flag = t.head.getObjectByName('flag'); if (flag) flag.children.forEach((c, i) => { c.position.y = -0.21 + i * 0.02 + Math.sin(this.time * 6 - i * 0.8) * 0.04; c.rotation.y = Math.sin(this.time * 6 - i) * 0.3; });
      for (let i = 0; i < 3; i++) { const b = t.head.getObjectByName('bubble' + i); if (b) { const p = (this.time * 0.6 + i * 0.37) % 1; const b0 = (b.userData.b ??= b.scale.x) as number; b.position.y = ((b.userData.y0 as number) ?? 0.5) + p * 0.25; b.scale.setScalar(b0 * (1 - p * 0.6)); } }
      for (let i = 0; i < 4; i++) {
        const o = t.head.getObjectByName('orbit' + i); if (!o) continue;
        const u = o.userData as { r: number; y: number; n: number; spd: number; faceOut?: boolean }; const a = this.time * u.spd + (i * 2 * Math.PI) / u.n + t.id;
        o.position.set(Math.cos(a) * u.r, u.y + Math.sin(a * 2) * 0.06, Math.sin(a) * u.r); if (u.faceOut) o.rotation.y = -a + Math.PI / 2; else o.rotation.y += dt * 3;
      }
      if (t.type === 'banner') { t.pulseT -= dt; if (t.pulseT <= 0) { t.pulseT = 2.5; this.ring(t.group.position.clone().setY(0.08), 0xfbbf24, 0.3, 1.9, 0.9, RING, 0.6); } }
    }
    for (const l of this.lights) { if (l.userData.life > 0) { l.userData.life -= dt * 7; l.intensity *= Math.max(0, 1 - dt * 9); if (l.userData.life <= 0) l.intensity = 0; } }
    this.arcs = this.arcs.filter(z => {
      z.life -= dt; if (z.life <= 0) { this.releaseBolt(z.bolt); return false; }
      z.rs -= dt; if (z.rs <= 0) { z.bolt.reseed(); z.rs = 0.045; }
      const k = z.life / z.max; z.bolt.update(z.a, z.b, 0.6 + k * 0.4); z.bolt.setOpacity(Math.min(1, k * 2.4) * (0.75 + Math.random() * 0.25));
      return true;
    });
    if (!playing) for (const t of this.towers) if (t.arc) { this.releaseBolt(t.arc); t.arc = undefined; }
    this.fx = this.fx.filter(f => {
      f.life -= dt; if (f.life <= 0) { this.scene.remove(f.mesh); return false; }
      const t = 1 - f.life / f.max; const op = (f.max > 2 ? Math.min(1, f.life / 1.5) : 1 - t) * 0.9;
      if (f.fixed) {
        f.mesh.traverse(o => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined; if (m) m.opacity = op * ((m.userData.k as number | undefined) ?? 1); }); // userData.k = per-layer brightness (soft halo vs. hot core)
        if (f.mesh.name === 'flame') { if (f.rise) f.mesh.position.y += f.rise * dt; flickerFlame(f.mesh, this.time * 1.3 + f.mesh.id, 0.35 + 0.65 * (f.life / f.max)); }
        return true;
      }
      const ease = 1 - Math.pow(1 - t, 3); const sc = f.s0 + (f.s1 - f.s0) * ease;
      if (f.uniform) f.mesh.scale.setScalar(sc); else f.mesh.scale.set(sc, 1, sc);
      if (f.rise) f.mesh.position.y += f.rise * dt;
      ((f.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = op; return true;
    });
    this.debris = this.debris.filter(d => {
      d.life -= dt; if (d.life <= 0) { this.scene.remove(d.obj); return false; }
      d.vel.y -= (d.grav ?? 11) * dt; d.obj.position.addScaledVector(d.vel, dt);
      if (d.obj.position.y < d.floor + 0.12) { d.obj.position.y = d.floor + 0.12; d.vel.y *= -0.35; d.vel.x *= 0.6; d.vel.z *= 0.6; d.ang.multiplyScalar(0.5); if (Math.abs(d.vel.y) < 0.5) d.vel.y = 0; }
      d.obj.rotation.x += d.ang.x * dt; d.obj.rotation.y += d.ang.y * dt; d.obj.rotation.z += d.ang.z * dt;
      if (d.life / d.max < 0.3) d.obj.scale.multiplyScalar(Math.max(0.01, 1 - dt * 4)); return true;
    });
    this.puddles = this.puddles.filter(p => {
      p.life -= dt; if (p.life <= 0) { this.scene.remove(p.mesh); return false; }
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.65, p.life * 0.5); p.mesh.rotation.y += dt * 0.5;
      if (Math.random() < 0.15) this.particles.emit(p.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * p.r * 1.5, 0.1, (Math.random() - 0.5) * p.r * 1.5)), 0xbef264, 1, 0.1, 0.06, 0.6, 0.8, -0.5);
      return true;
    });

    if (playing) {
      if (!s.waveActive) { s.countdown -= dt; if (s.countdown <= 0) this.startWave(); }
      if (this.spawnQueue.length) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) { const type = this.spawnQueue.shift()!; this.spawnEnemy(type); this.spawnTimer = type === 'boss' || type === 'dragon' || type === 'dread' ? 1.4 : type === 'legion' ? 0.5 : Math.max(0.35, 0.75 - s.level * 0.03); }
      }
      const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
      for (const e of this.enemies) {
        // A unit killed by a tower / mine / boomerang AFTER this loop ran last frame is still in the list until the next filter.
        // Without this check it was processed once more: a dead dragon re-created its fire stream (a ghost flame that stayed forever)
        // and a dead orc standing at the finish line could even cost a life.
        if (e.dead) continue;
        e.breathActive = false;
        let mult = e.slowT > 0 ? 0.5 : 1;
        if (e.type === 'rider') { e.slowT = 0; mult = 1; }
        if ((e.shockT ?? 0) > 0) mult *= 0.75;
        if ((e.auraT ?? 0) > 0) { e.auraT! -= dt; mult *= e.auraK ?? 0.65; }
        if ((e.rallyT ?? 0) > 0) { e.rallyT! -= dt; mult *= 1.15; } // inside a war captain's rally
        if ((e.blockT ?? 0) > 0) { e.blockT! -= dt; mult *= 0.2; } // a knight is standing in its way
        if ((e.tetherSpikeId ?? 0) > 0) mult *= 0.5; // tethered to a seismic spike
        if ((e.charmT ?? 0) > 0) { // Amor's heart mark floats over the orc's head (just above its HP bar)
          e.charmT! -= dt; const cm = e.charmMark;
          if (cm) { cm.scale.setScalar((0.4 + Math.sin(this.time * 6 + e.bobOff) * 0.04) / e.size); cm.position.set(0, (e.hpBg.position.y * Math.max(0.6, e.size) + 0.55) / e.size, 0); cm.rotation.y += dt * 2.4; }
          if (e.charmT! <= 0 && cm) { e.group.remove(cm); e.charmMark = undefined; }
        } // inside a Chrono clock's aura
        if (e.type === 'berserker') mult *= 1 + (1 - e.hp / e.maxHp) * 1.3;
        if (e.type === 'baby') mult *= 1 + Math.max(0, Math.sin(this.time * 4 + e.bobOff)) * 0.5;
        if ((e.silenceT ?? 0) > 0) e.silenceT! -= dt;
        if ((e.freezeT ?? 0) > 0) {
          e.freezeT! -= dt; mult = 0;
          if (Math.random() < 0.2) this.particles.emit(this.enemyCenter(e), 0xa5f3fc, 1, 0.4, 0.05, 0.3);
        }
        if ((e.burnT ?? 0) > 0) {
          e.burnT! -= dt;
          this.damage(e, (e.burnDps ?? 12) * dt, { silent: true, pierce: true });
          if (Math.random() < 0.2) this.particles.emit(this.enemyCenter(e), 0xf97316, 1, 0.3, 0.05, 0.3);
          if (e.dead) continue;
        }
        if (e.stunT > 0) { e.stunT -= dt; mult = 0; if (Math.random() < 0.2) this.particles.emit(this.enemyCenter(e).setY(e.size * 1.5), 0xfde68a, 1, 0.5, 0.05, 0.4, 1, -1); }
        // MIND CONTROL: a hallucinating orc ignores its orders and fights its friends instead
        const dazed = (e.mindT ?? 0) > 0; if (dazed) mult *= this.mindAI(e, dt);
        // gunner & balloon: walk/fly while shooting nearest tower
        let aimAt: Tower | null = null;
        if ((e.type === 'gunner' || e.type === 'balloon') && e.stunT <= 0 && !dazed) {
          let best: Tower | null = null, bd = e.type === 'balloon' ? 4.2 : 3.6;
          for (const t of this.towers) { const d = t.group.position.distanceTo(e.group.position); if (d < bd) { bd = d; best = t; } }
          if (best) {
            aimAt = best; e.shootT -= dt; if (e.type === 'gunner') mult *= 0.55;
            if (e.shootT <= 0) {
              e.shootT = e.type === 'balloon' ? 1.0 : 1.1;
              const from = e.type === 'balloon' ? e.group.position.clone().add(new THREE.Vector3(0, 0.6 * e.size, 0)) : this.enemyCenter(e).setY(e.size * 1.3);
              const m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0xff5050 })); m.scale.set(0.07, 0.07, 0.35); m.position.copy(from); this.scene.add(m);
              const to = best.group.position.clone().setY(0.7); const vel = to.clone().sub(from).normalize().multiplyScalar(10);
              this.enemyShots.push({ pos: from.clone(), vel, target: best, mesh: m, life: 2, dmg: 1, kind: 'bullet' }); this.particles.emit(from, 0xffe08a, 3, 1, 0.05, 0.2, 0.5, 0); this.flash(from, 0xffe08a, 1.5, 2); this.sfx.enemyShot();
            }
          }
        }
        // ELITES: the archer shoots towers, the dread knight chops them down, the captain rallies the troops
        if (dazed) { /* hallucinating: no orders */ } else if (e.type === 'archer') { mult *= this.archerAI(e, dt); if (e.atkTarget && e.atkPhase && e.atkPhase !== 'walk') aimAt = e.atkTarget; }
        else if (e.type === 'dread') mult *= this.dreadAI(e, dt);
        else if (e.type === 'captain') this.captainAI(e, dt);
        // dragon rider: hover over the nearest tower and roast it with a stream of fire – 5 HP/s, so a full 20-HP tower burns down in 4 seconds
        if (e.type === 'dragon') {
          let tg: Tower | null = e.breathTarget && !e.breathTarget.dead && this.towers.includes(e.breathTarget) && e.breathTarget.group.position.distanceTo(e.group.position) <= 3.6 ? e.breathTarget : null;
          if (!tg && e.stunT <= 0 && !dazed) { let bd = 3.1; for (const t of this.towers) { const d = Math.hypot(t.group.position.x - e.group.position.x, t.group.position.z - e.group.position.z); if (d < bd) { bd = d; tg = t; } } }
          e.breathTarget = tg;
          if (tg && e.stunT <= 0 && !dazed) { mult *= 0.12; this.dragonBreath(e, tg, dt); } else this.stopBreath(e);
        }
        // cannoneer: stop, light fuse with torch, fire cannonball (-10 tower HP)
        if (e.type === 'cannoneer' && e.stunT <= 0 && !dazed) {
          const cannon = e.limbs.cannon, torch = e.limbs.torch, spark = cannon.getObjectByName('spark')!;
          const tFlame = torch.getObjectByName('flame'); if (tFlame) flickerFlame(tFlame, this.time + e.bobOff);
          // torch poses: idle in hand -> reaching back so the flame touches the fuse (flame follows the burning fuse downward)
          const P0 = new THREE.Vector3(0.45, 0.5, 0.15), q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.4, 0, 0));
          const poseTorch = (reach: number, burn: number) => {
            const F = new THREE.Vector3(0, 0.96 - burn * 0.17, -0.83);
            const dir = F.clone().sub(new THREE.Vector3(0.4, 0.62, -0.45)).normalize(); const P1 = F.clone().addScaledVector(dir, -0.56);
            torch.position.lerpVectors(P0, P1, reach); torch.quaternion.copy(q0).slerp(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), reach);
            e.limbs.armR.rotation.x = THREE.MathUtils.lerp(-0.6, 1.15, reach); e.limbs.head.rotation.y = 2.3 * reach;
          };
          if (e.cannonPhase === 'walk') {
            e.cannonT -= dt;
            if (e.cannonT <= 0) {
              let best: Tower | null = null, bd = 4.5; for (const t of this.towers) { const d = t.group.position.distanceTo(e.group.position); if (d < bd) { bd = d; best = t; } }
              if (best) { e.cannonPhase = 'lighting'; e.cannonT = 0; e.cannonTarget = best; } else e.cannonT = 0.5;
            }
            torch.position.copy(P0); torch.quaternion.copy(q0); spark.scale.setScalar(0.001);
          } else if (e.cannonPhase === 'lighting') {
            mult = 0; e.cannonT += dt; const tg = e.cannonTarget;
            if (!tg || tg.dead) { e.cannonPhase = 'walk'; e.cannonT = 1; spark.scale.setScalar(0.001); e.limbs.head.rotation.y = 0; }
            else {
              const ang = Math.atan2(tg.group.position.x - e.group.position.x, tg.group.position.z - e.group.position.z);
              // orc turns its back to the target so the towed cannon points straight at it
              let d = (ang + Math.PI) - e.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); e.group.rotation.y += d * Math.min(1, dt * 6);
              aimAt = null;
              const k = Math.min(1, e.cannonT / 1.9); const rr = Math.min(1, k / 0.45); const reach = rr * rr * (3 - 2 * rr); const burn = Math.max(0, Math.min(1, (k - 0.45) / 0.55));
              poseTorch(reach, burn);
              if (burn > 0) {
                spark.scale.setScalar(1); spark.position.y = 0.94 - burn * 0.17; flickerFlame(spark, this.time * 1.7 + e.bobOff);
                e.group.updateMatrixWorld(true); const sp = spark.getWorldPosition(new THREE.Vector3());
                this.particles.emit(sp.clone().setY(sp.y + 0.08), 0xffe066, 1, 0.9, 0.045, 0.4, 2.6, 7); if (Math.random() < 0.35) this.particles.emit(sp, 0xff7a1a, 1, 0.5, 0.05, 0.5, 1.8, 4);
                if (Math.random() < 0.12) this.flash(sp, 0xffa64d, 1.4, 2);
              }
              if (e.cannonT >= 1.9) {
                e.cannonPhase = 'fire'; e.cannonT = 0; spark.scale.setScalar(0.001);
                e.group.updateMatrixWorld(true); const mzObj = cannon.getObjectByName('cmuzzle')!; const from = mzObj.getWorldPosition(new THREE.Vector3());
                const ball = new THREE.Group(); ball.add(mkSphere(0.17, 0x111827));
                const tail = makeFlame(0.42); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.1; ball.add(tail); ball.position.copy(from); this.scene.add(ball);
                const goal = tg.group.position.clone().setY(0.4);
                this.enemyShots.push({ pos: from.clone(), vel: new THREE.Vector3(), target: tg, mesh: ball, life: 6, dmg: 10, kind: 'cannonball', start: from.clone(), goal, t: 0 });
                mzObj.scale.setScalar(1.15);
                this.fireball(from.clone().setY(from.y - 0.15), 0.5); this.ring(from.clone().setY(from.y - 0.2), 0xffc27a, 0.2, 1.6, 0.3, RING, 0.9);
                this.flash(from, 0xffa64d, 6, 5); this.shake = Math.max(this.shake, 0.18); this.sfx.boom();
              }
            }
          } else {
            mult = 0; e.cannonT += dt; const cm = cannon.getObjectByName('cmuzzle'); if (cm && cm.scale.x > 0) { cm.scale.multiplyScalar(Math.max(0, 1 - dt * 8)); if (cm.scale.x < 0.03) cm.scale.setScalar(0); }
            cannon.position.z = -0.95 + Math.max(0, 0.45 - e.cannonT) * 0.7; // recoil: the gun kicks back toward the orc
            poseTorch(Math.max(0, 1 - e.cannonT / 0.7), 1);
            if (e.cannonT > 1.1) { e.cannonPhase = 'walk'; e.cannonT = 2.5 + Math.random(); e.limbs.head.rotation.y = 0; cannon.position.z = -0.95; }
          }
        }
        // ninja: smoke bomb camouflage & dash sprint
        if (e.type === 'ninja') {
          e.stealthCd = (e.stealthCd ?? (2.5 + Math.random() * 2)) - dt;
          if ((e.stealthT ?? 0) > 0) {
            e.stealthT! -= dt;
            mult *= 1.65;
            for (const m of e.skinMats) { m.transparent = true; m.opacity = 0.28; }
            if (Math.random() < 0.25) this.particles.emit(e.group.position.clone().setY(0.2), 0x94a3b8, 1, 0.4, 0.05, 0.25);
            if (e.stealthT! <= 0) {
              for (const m of e.skinMats) { m.opacity = 1; m.transparent = false; }
            }
          } else if (e.stealthCd <= 0 && e.stunT <= 0 && !dazed && (e.silenceT ?? 0) <= 0 && e.s < this.pathLen - 2) {
            e.stealthT = 1.6;
            e.stealthCd = 4.5 + Math.random();
            const p = e.group.position.clone();
            this.particles.emit(p.clone().setY(0.3), 0x94a3b8, 12, 1.8, 0.12, 0.7, 2, -1);
            this.ring(p.clone().setY(0.06), 0x64748b, 0.15, 1.2, 0.3, RING, 0.7);
            this.float('ASAP! 🥷', p.clone().setY(1.3), '#cbd5e1');
            this.sfx.whoosh();
          }
        }
        // bomber: kamikaze run & explode near tower
        if (e.type === 'bomber' && e.stunT <= 0 && !dazed) {
          mult *= 1.15;
          if (Math.random() < 0.35) {
            const bp = e.group.position.clone().add(new THREE.Vector3(0, 0.7 * e.size, 0.25 * e.size));
            this.particles.emit(bp, 0xff7a1a, 1, 0.3, 0.04, 0.2, 1, 0);
          }
          let nearTower: Tower | null = null;
          for (const t of this.towers) {
            if (t.dead) continue;
            if (Math.hypot(t.group.position.x - e.group.position.x, t.group.position.z - e.group.position.z) <= 1.25) {
              nearTower = t;
              break;
            }
          }
          if (nearTower) {
            const at = e.group.position.clone();
            this.hurtTower(nearTower, nearTower.group.position.clone(), 8);
            this.fireball(at, 1.35);
            this.particles.emit(at, 0xef4444, 22, 3, 0.12, 0.8, 3);
            this.particles.emit(at, 0xfde047, 14, 2.5, 0.1, 0.6, 2.5);
            this.ring(at.clone().setY(0.07), 0xef4444, 0.2, 2.4, 0.35, RING, 0.9);
            this.flash(at.clone().setY(0.6), 0xff4444, 6, 6);
            this.shake = Math.max(this.shake, 0.35);
            this.float('JEGEER! 🧨 -8 HP', at.clone().setY(1.4), '#ef4444');
            this.sfx.boom();
            this.kill(e);
            continue;
          }
        }
        // magnet: magnetic pulses
        if (e.type === 'magnet' && !dazed && e.stunT <= 0 && (e.silenceT ?? 0) <= 0) {
          e.magPulseT = (e.magPulseT ?? (1.0 + Math.random())) - dt;
          if (e.magPulseT <= 0) {
            e.magPulseT = 2.2;
            const mp = e.group.position.clone().setY(0.12);
            this.ring(mp, 0x3b82f6, 0.2, 2.4, 0.45, RING, 0.75);
            this.particles.emit(mp, 0x60a5fa, 6, 1.2, 0.06, 0.4);
          }
        }
        // frost: freezes nearest tower
        if (e.type === 'frost' && !dazed && e.stunT <= 0 && (e.silenceT ?? 0) <= 0) {
          e.freezeCd = (e.freezeCd ?? (2.0 + Math.random())) - dt;
          if (e.freezeCd <= 0) {
            let targetTower: Tower | null = null, bd = 4.2;
            for (const t of this.towers) {
              if (t.dead || (t.frozenT ?? 0) > 0) continue;
              const d = Math.hypot(t.group.position.x - e.group.position.x, t.group.position.z - e.group.position.z);
              if (d < bd) { bd = d; targetTower = t; }
            }
            if (targetTower) {
              e.freezeCd = 4.5 + Math.random();
              const from = this.enemyCenter(e).setY(e.size * 1.2);
              const to = targetTower.group.position.clone().setY(0.8);
              this.bolt(from, to, 0x38bdf8, 0.08, 0.35, 0.15);
              this.ring(to.clone().setY(0.1), 0x38bdf8, 0.2, 1.6, 0.5, RING, 0.8);
              this.particles.emit(to, 0xbae6fd, 12, 2.0, 0.08, 0.5, 2);
              targetTower.frozenT = 2.5;
              this.float('BEKU! ❄️', to.clone().setY(1.5), '#7dd3fc');
              this.sfx.freeze();
            } else {
              e.freezeCd = 1.0;
            }
          }
        }
        // rider: rhino mount heavy charge
        if (e.type === 'rider') {
          e.slowT = 0;
          if (Math.random() < 0.2) {
            this.particles.emit(e.group.position.clone().setY(0.05), 0x94a3b8, 1, 0.4, 0.06, 0.3, 0.5, 0);
          }
        }
        // fatty: orc gendut dengan tongkat besar - hentakan tanah gempa
        if (e.type === 'fatty' && !dazed && e.stunT <= 0 && (e.silenceT ?? 0) <= 0) {
          e.slamCd = (e.slamCd ?? (2.0 + Math.random() * 2)) - dt;
          if (e.slamCd <= 0) {
            e.slamCd = 3.6 + Math.random();
            const gp = e.group.position.clone();
            this.ring(gp.clone().setY(0.08), 0xb45309, 0.3, 2.6, 0.5, RING, 0.85);
            this.particles.emit(gp.clone().setY(0.2), 0xd97706, 14, 2.2, 0.09, 0.6, 2.8);
            this.shake = Math.max(this.shake, 0.25);
            this.float('HENTAKAN TONGKAT! 🧌', gp.clone().setY(1.8), '#fdba74');
            this.sfx.boom();
            for (const t of this.towers) {
              if (t.dead) continue;
              if (Math.hypot(t.group.position.x - gp.x, t.group.position.z - gp.z) <= 2.2) {
                t.cooldown = Math.max(t.cooldown, 1.2);
              }
            }
          }
        }
        // punk: orc rambut merah punk dengan tombak berapi - menusuk & membakar tower
        if (e.type === 'punk' && !dazed && e.stunT <= 0 && (e.silenceT ?? 0) <= 0) {
          e.spearThrowCd = (e.spearThrowCd ?? (1.8 + Math.random() * 1.5)) - dt;
          if (e.spearThrowCd <= 0) {
            let targetTower: Tower | null = null, bd = 3.2;
            for (const t of this.towers) {
              if (t.dead) continue;
              const d = Math.hypot(t.group.position.x - e.group.position.x, t.group.position.z - e.group.position.z);
              if (d < bd) { bd = d; targetTower = t; }
            }
            if (targetTower) {
              e.spearThrowCd = 3.2 + Math.random();
              const from = this.enemyCenter(e).setY(e.size * 1.1);
              const to = targetTower.group.position.clone().setY(0.6);
              this.bolt(from, to, 0xef4444, 0.09, 0.35, 0.12);
              this.fireball(to, 0.55);
              this.hurtTower(targetTower, to, 3);
              this.float('BAKARR! 🧑‍🎤🔥 -3 HP', to.clone().setY(1.5), '#ef4444');
              this.sfx.burn();
            } else {
              e.spearThrowCd = 1.0;
            }
          }
        }
        // shield: orc perisai baja - pertahanan barikade depan
        if (e.type === 'shield' && !dazed && e.stunT <= 0) {
          if (Math.random() < 0.15) {
            this.particles.emit(e.group.position.clone().setY(0.4), 0x94a3b8, 1, 0.5, 0.05, 0.3, 0.5, 0);
          }
        }
        // toxic: orc alkemis racun - tetesan uap asam & debuff tower
        if (e.type === 'toxic' && !dazed && e.stunT <= 0 && (e.silenceT ?? 0) <= 0) {
          e.toxicDropCd = (e.toxicDropCd ?? (1.5 + Math.random())) - dt;
          if (e.toxicDropCd <= 0) {
            e.toxicDropCd = 2.4;
            const tp = e.group.position.clone().setY(0.06);
            this.ring(tp, 0x22c55e, 0.15, 1.2, 0.4, RING, 0.6);
            this.particles.emit(tp.clone().setY(0.2), 0x4ade80, 4, 0.8, 0.05, 0.3);
            for (const t of this.towers) {
              if (t.dead) continue;
              if (Math.hypot(t.group.position.x - tp.x, t.group.position.z - tp.z) <= 1.9) {
                t.cooldown = Math.max(t.cooldown, 0.8);
              }
            }
          }
        }
        // bat: orc kelelawar malam - lifesteal hisap darah pulihkan HP
        if (e.type === 'bat' && !dazed && e.stunT <= 0 && (e.silenceT ?? 0) <= 0) {
          e.batDrainCd = (e.batDrainCd ?? (2.0 + Math.random())) - dt;
          if (e.batDrainCd <= 0) {
            let targetTower: Tower | null = null, bd = 3.0;
            for (const t of this.towers) {
              if (t.dead) continue;
              const d = Math.hypot(t.group.position.x - e.group.position.x, t.group.position.z - e.group.position.z);
              if (d < bd) { bd = d; targetTower = t; }
            }
            if (targetTower && e.hp < e.maxHp) {
              e.batDrainCd = 3.0 + Math.random();
              const from = targetTower.group.position.clone().setY(0.6);
              const to = this.enemyCenter(e);
              this.bolt(from, to, 0xa855f7, 0.06, 0.3, 0.2);
              this.hurtTower(targetTower, from, 2);
              const heal = Math.min(e.maxHp - e.hp, 14);
              e.hp += heal;
              this.float(`HISAP DARAH! 🦇 +${heal} HP`, to.clone().setY(1.4), '#d8b4fe');
              this.sfx.pop('bat');
            } else {
              e.batDrainCd = 1.2;
            }
          }
        }
        // troll: troll rawa raksasa - regenerasi pasif alami konstan (kecuali dibakar/diracun)
        if (e.type === 'troll' && !dazed && e.stunT <= 0) {
          if ((e.burnT ?? 0) <= 0 && (e.poisonT ?? 0) <= 0 && e.hp < e.maxHp) {
            e.hp = Math.min(e.maxHp, e.hp + dt * 12);
            e.trollRegenT = (e.trollRegenT ?? 1.8) - dt;
            if (e.trollRegenT <= 0) {
              e.trollRegenT = 1.8;
              const c = this.enemyCenter(e);
              this.particles.emit(c, 0x22c55e, 5, 1.2, 0.06, 0.4);
              this.float('REGEN! 🌿', c.clone().setY(1.8), '#86efac');
            }
          }
        }
        // jumper: launch near finish
        if (e.type === 'jumper') {
          if (e.jumpState === 'idle' && e.s > 2.5 && e.stunT <= 0) {
            e.jumpState = 'flying'; e.jumpT = 0; e.jumpFrom.copy(e.group.position); e.jumpS = Math.max(e.s + 2, this.pathLen - 3.5 - Math.random() * 1.5); this.posAt(e.jumpS, e.jumpTo);
            this.particles.emit(e.group.position.clone().setY(0.2), 0x9ca3af, 14, 2, 0.1, 0.8, 2); this.particles.emit(e.group.position.clone().setY(0.2), 0xf59e0b, 8, 1.5, 0.08, 0.4, 3); this.flash(e.group.position.clone().setY(0.5), 0xf59e0b, 4, 4);
            this.float('WUSSH!', e.group.position.clone().setY(1.5), '#38bdf8'); this.sfx.launch();
          }
          if (e.jumpState === 'flying') {
            e.jumpT += dt * 0.55; const k = Math.min(1, e.jumpT);
            const p = e.jumpFrom.clone().lerp(e.jumpTo, k); p.y = Math.sin(k * Math.PI) * 4;
            e.group.position.copy(p); e.group.rotation.y = Math.atan2(e.jumpTo.x - e.jumpFrom.x, e.jumpTo.z - e.jumpFrom.z); e.group.rotation.x = (k - 0.5) * 1.2;
            e.limbs.armL.rotation.x = -2.5; e.limbs.armR.rotation.x = -2.5; e.limbs.legL.rotation.x = 0.3; e.limbs.legR.rotation.x = -0.3;
            if (e.limbs.jet) { e.limbs.jet.visible = true; e.limbs.jet.children.forEach(f => flickerFlame(f, this.time * 1.6 + e.bobOff)); }
            this.particles.emit(p.clone().add(new THREE.Vector3(0, -0.1, 0)), 0xd1d5db, 2, 0.3, 0.08, 0.6, -0.5, -1); if (Math.random() < 0.6) this.particles.emit(p, 0xf59e0b, 1, 0.3, 0.06, 0.2, 0, 0);
            if (k >= 1) { if (e.limbs.jet) e.limbs.jet.visible = false; e.jumpState = 'done'; e.s = e.jumpS; e.group.rotation.x = 0; e.stunT = 0.6; this.particles.emit(e.jumpTo.clone().setY(0.1), 0xcdb98a, 14, 2.5, 0.1, 0.6, 3); this.ring(e.jumpTo.clone().setY(0.07), 0xffffff, 0.2, 1.4, 0.3); this.shake = Math.max(this.shake, 0.12); }
            e.flashT -= dt; continue;
          }
        }
        const sp = e.speed * mult; e.slowT -= dt; e.flashT -= dt;
        if (e.poisonT > 0) { e.poisonT -= dt; this.damage(e, e.poisonDps * dt, { silent: true, pierce: true }); if (e.dead) continue; if (Math.random() < 0.1) this.particles.emit(this.enemyCenter(e), 0xa3e635, 1, 0.3, 0.05, 0.5, 1, -0.5); }
        for (const p of this.puddles) if (!e.flying && e.group.position.distanceTo(p.pos) <= p.r) { this.damage(e, p.dps * dt, { silent: true, pierce: true }); break; }
        if (e.dead) continue;
        if (e.type === 'shaman' && (e.silenceT ?? 0) <= 0) { e.healT -= dt; if (e.healT <= 0) { e.healT = 2.5; let healed = false; for (const o of this.enemies) if (o !== e && !o.dead && o.hp < o.maxHp && o.group.position.distanceTo(e.group.position) < 2.2) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.08); healed = true; this.particles.emit(this.enemyCenter(o), 0x6ee7b7, 4, 0.5, 0.06, 0.6, 1.5, -1); } if (healed) { this.ring(e.group.position.clone().setY(0.08), 0x6ee7b7, 0.2, 2.2, 0.6, RING, 0.7); this.sfx.heal(); } } }
        if (e.knockV) { e.s = Math.max(0, e.s - e.knockV * dt); e.knockV *= Math.exp(-dt * 5.5); if (Math.abs(e.knockV) < 0.05) e.knockV = 0; } // flung along the road by a spear poke / a friend's blow
        let blockedByWall = false;
        if (!e.flying) {
          for (const wall of this.iceWalls) {
            if (e.s < wall.s && e.s + sp * dt >= wall.s - 0.22) {
              e.s = Math.min(e.s, wall.s - 0.22);
              blockedByWall = true;
              wall.hp -= dt * (18 + (e.type === 'boss' ? 45 : e.type === 'tank' ? 28 : 10));
              if (Math.random() < 0.2) this.particles.emit(wall.pos.clone().setY(0.6), 0xa5f3fc, 2, 0.8, 0.05, 0.25);
              break;
            }
          }
          for (const fs of this.fissures) {
            if (e.s >= fs.s0 && e.s <= fs.s1) {
              this.damage(e, fs.dps * dt, { silent: true, pierce: true });
              e.burnT = Math.max(e.burnT ?? 0, 1.5);
              if (e.armor > 0 && Math.random() < dt * 1.5) {
                e.armor = Math.max(0, e.armor - 1);
                this.float('LELEH! 🔥', this.enemyCenter(e).setY(e.size + 0.5), '#ff7a1a');
              }
              if (Math.random() < 0.2) this.particles.emit(this.enemyCenter(e), 0xff5722, 1, 0.4, 0.05, 0.25);
              break;
            }
          }
        }
        if (!blockedByWall) e.s += sp * dt;
        if (e.s >= this.pathLen) { this.leak(e); continue; }
        this.posAt(e.s, tmp); this.posAt(e.s + 0.3, tmp2);
        { // lane = sideways offset from the road centre: legion soldiers march in two files, the dread knight steps up beside the tower it is about to cut down
          const ldx = tmp2.x - tmp.x, ldz = tmp2.z - tmp.z; const ll = Math.hypot(ldx, ldz) || 1; const px = -ldz / ll, pz = ldx / ll;
          if (e.type === 'dread') {
            const hit = e.atkTarget && e.atkPhase && e.atkPhase !== 'walk';
            const want = hit ? THREE.MathUtils.clamp(((e.atkTarget!.group.position.x - tmp.x) * px + (e.atkTarget!.group.position.z - tmp.z) * pz) * 0.62, -0.95, 0.95) : 0;
            e.lane = (e.lane ?? 0) + (want - (e.lane ?? 0)) * Math.min(1, dt * 4);
          }
          const ln = e.lane ?? 0; if (ln) { tmp.x += px * ln; tmp.z += pz * ln; tmp2.x += px * ln; tmp2.z += pz * ln; }
        }
        const ph = this.time * 10 * (sp / 1.2) + e.bobOff;
        if (e.type === 'balloon') {
          // damaged balloons sag, sway harder, deflate and leak smoke; every hit makes the envelope jiggle
          const rt = Math.max(0, e.hp / e.maxHp);
          e.group.position.set(tmp.x, 1.3 + Math.sin(this.time * 1.5 + e.bobOff) * 0.2 - (1 - rt) * 0.3, tmp.z);
          const jig = 1 + Math.max(0, e.flashT) * 0.9;
          e.limbs.balloon.scale.set(jig, jig * (0.8 + 0.2 * rt), jig);
          e.limbs.balloon.rotation.z = Math.sin(this.time * 1.2 + e.bobOff) * (0.04 + (1 - rt) * 0.05); e.limbs.balloon.rotation.x = Math.sin(this.time * 0.9 + e.bobOff) * 0.03;
          if (rt < 0.5 && Math.random() < 0.2) this.particles.emit(e.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 4.1 * e.size, (Math.random() - 0.5) * 0.5)), 0x9ca3af, 1, 0.4, 0.1, 0.8, 1.2, -0.5);
          const burner = e.limbs.balloon.getObjectByName('burner');
          if (burner) { const on = Math.sin(this.time * 2 + e.bobOff) > 0.3; flickerFlame(burner, this.time + e.bobOff, on ? 1.15 : 0.3); if (on && Math.random() < 0.3) this.particles.emit(e.group.position.clone().add(new THREE.Vector3(0, 1.72 * e.size, 0)), 0xffb020, 1, 0.3, 0.05, 0.3, 2, -2); }
          if (aimAt) { const wa = Math.atan2(aimAt.group.position.x - tmp.x, aimAt.group.position.z - tmp.z); e.limbs.gun.rotation.y = wa - e.group.rotation.y; e.limbs.gun.rotation.x = 0.5; e.limbs.head.rotation.y = e.limbs.gun.rotation.y; }
          else { e.limbs.gun.rotation.x = 0; e.limbs.head.rotation.y = 0; }
        } else if (e.flying) {
          e.group.position.set(tmp.x, 1.5 + Math.sin(this.time * 3 + e.bobOff) * 0.15, tmp.z);
          const fl = Math.sin(this.time * 9 + e.bobOff) * 0.6; e.limbs.wingL.rotation.z = fl; e.limbs.wingR.rotation.z = -fl; e.limbs.tail.rotation.y = Math.sin(this.time * 4) * 0.3; e.limbs.head.rotation.x = Math.sin(this.time * 2) * 0.1;
          e.group.rotation.z = Math.sin(this.time * 2 + e.bobOff) * 0.08;
        } else if (e.type === 'cannoneer' && e.cannonPhase !== 'walk') {
          e.group.position.set(tmp.x, 0, tmp.z); e.limbs.legL.rotation.x = 0; e.limbs.legR.rotation.x = 0;
        } else if (e.type === 'log') {
          e.group.position.set(tmp.x, 0, tmp.z); e.limbs.roll.rotation.x += sp * dt / (0.5 * e.size);
          if (sp > 0 && Math.random() < 0.3) this.particles.emit(tmp.clone().setY(0.05), 0xcdb98a, 1, 0.8, 0.07, 0.6, 1.2);
        } else {
          // cute hop-waddle: bouncy steps, swaying body, swinging arms, flapping ears (see poseOrc)
          e.group.position.set(tmp.x, Math.abs(Math.sin(ph)) * (e.type === 'baby' ? 0.14 : 0.08), tmp.z); e.group.rotation.z = Math.sin(ph) * 0.06;
          if (isElite(e.type)) { poseElite(e.type, e.limbs, ph, this.time); this.eliteAttackPose(e, dt); } else poseOrc(e.type as OrcKind, e.limbs, ph);
          if (e.type === 'gunner') { if (aimAt) { const wa = Math.atan2(aimAt.group.position.x - tmp.x, aimAt.group.position.z - tmp.z); e.limbs.head.rotation.y = Math.atan2(Math.sin(wa - e.group.rotation.y), Math.cos(wa - e.group.rotation.y)) * 0.8; } else e.limbs.head.rotation.y = 0; }
          if (e.type === 'cannoneer') { e.limbs.cannon.rotation.x = Math.sin(ph) * 0.03; e.limbs.cannon.position.z = -0.95; }
        }
        if (!(e.type === 'cannoneer' && e.cannonPhase !== 'walk') && !(isElite(e.type) && e.atkTarget && e.atkPhase && e.atkPhase !== 'walk')) e.group.rotation.y = Math.atan2(tmp2.x - tmp.x, tmp2.z - tmp.z) + ((e.mindT ?? 0) > 0 && e.yawFlip ? Math.PI : 0);
        if ((e.cycloneLiftT ?? 0) > 0) {
          e.cycloneLiftT! -= dt;
          e.group.position.y += Math.sin(this.time * 12 + e.id) * 0.2 + 1.4;
          e.group.rotation.y += dt * 16;
        }
        if (!e.flying) { // hit by a spear or a friend's blow: hop and lean in the direction of the push
          const hp0 = Math.max(0, e.hopT ?? 0); if (hp0 > 0) e.hopT = hp0 - dt;
          if (hp0 > 0) e.group.position.y += Math.sin(Math.min(1, hp0 / 0.4) * Math.PI) * (e.hopH ?? 0.3);
          e.group.rotation.x = -THREE.MathUtils.clamp((e.knockV ?? 0) * 0.12, -0.6, 0.6);
        }
        const base = ENEMY_DEFS[e.type].skin;
        // electrified by plasma: strobes yellow-white and trembles
        const shocked = (e.shockT ?? 0) > 0;
        if (shocked) { e.shockT! -= dt; e.group.position.x += (Math.random() - 0.5) * 0.05; e.group.position.z += (Math.random() - 0.5) * 0.05; if (Math.random() < 0.25) this.particles.emit(this.enemyCenter(e), 0xfff3a0, 1, 1.4, 0.04, 0.2, 1.5, 0); }
        for (const m of e.skinMats) { if (shocked) m.color.setHex(Math.random() < 0.5 ? 0xfff3a0 : 0xffffff); else if (e.flashT > 0) m.color.setHex(0xffffff); else if ((e.mindT ?? 0) > 0) m.color.setHex(base).lerp(new THREE.Color(0xe879f9), 0.42); else if (e.slowT > 0) m.color.setHex(base).lerp(new THREE.Color(0x8ff0ff), 0.55); else if (e.poisonT > 0) m.color.setHex(base).lerp(new THREE.Color(0xa3e635), 0.4); else if (e.type === 'berserker') m.color.setHex(base).lerp(new THREE.Color(0xff9a2a), (1 - e.hp / e.maxHp) * 0.7); else m.color.setHex(base); }
        // living face: glossy eyes blink & wander, squeeze shut with an "ouch!" when hit (+ squash & stretch), sweat when slowed/stunned/poisoned/nearly dead
        const fc = e.limbs.face as THREE.Object3D | undefined;
        if (fc) {
          e.hurtT = (e.hurtT ?? 0) - dt; const hit = Math.max(0, Math.min(1, (e.hurtT ?? 0) / 0.22));
          e.group.scale.set(e.size * (1 + hit * 0.14), e.size * (1 - hit * 0.12), e.size * (1 + hit * 0.14));
          let lx = Math.sin(this.time * 0.9 + e.bobOff) * 0.55, ly = Math.sin(this.time * 0.6 + e.bobOff * 2) * 0.22;
          if (aimAt) { const wa = Math.atan2(aimAt.group.position.x - e.group.position.x, aimAt.group.position.z - e.group.position.z); lx = THREE.MathUtils.clamp(Math.atan2(Math.sin(wa - e.group.rotation.y), Math.cos(wa - e.group.rotation.y)) * 1.2, -1, 1); ly = -0.15; }
          const wr = e.stunT > 0 ? 1 : e.slowT > 0 ? 0.7 : e.poisonT > 0 ? 0.85 : e.hp / e.maxHp < 0.25 ? 0.7 : 0;
          const burning = !!e.breathTarget && e.stunT <= 0;
          if ((e.mindT ?? 0) > 0) { lx = Math.sin(this.time * 9 + e.bobOff); ly = Math.cos(this.time * 9 + e.bobOff) * 0.8; } // dizzy, spinning eyes
          updateFace(fc, dt, this.time, { lookX: lx, lookY: ly, focus: 0, squint: hit > 0 || shocked || burning ? 1 : 0, worry: wr });
          const f2 = e.limbs.face2 as THREE.Object3D | undefined; if (f2) updateFace(f2, dt, this.time, { lookX: lx, lookY: ly, focus: 0, squint: hit > 0 || shocked ? 1 : 0, worry: wr });
          const mo = e.limbs.head.getObjectByName('mouthOpen'); if (mo) mo.visible = burning;
        }
        const ratio = e.hp / e.maxHp;
        if (ratio < 1) { e.hpBg.visible = e.hpFg.visible = true; e.hpFg.scale.x = ratio; e.hpFg.position.x = -(1 - ratio) * 0.4; (e.hpFg.material as THREE.MeshBasicMaterial).color.setHex(ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfacc15 : 0xf87171); }
        const hpg = e.group.getObjectByName('hp'); if (hpg) hpg.rotation.y = -e.group.rotation.y;
      }
      this.enemies = this.enemies.filter(e => !e.dead);
      // safety net: a fire stream is only visible on a frame in which its dragon actually fed it
      for (const e of this.enemies) if (e.breathMesh && !e.breathActive) e.breathMesh.visible = false;
      for (const t of this.towers) {
        if ((t.frozenT ?? 0) > 0) {
          t.frozenT = (t.frozenT ?? 0) - dt;
          if (!t.iceBlock) {
            const ice = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.5, roughness: 0.1, emissive: 0x38bdf8, emissiveIntensity: 0.2 }));
            ice.scale.set(1.4, 1.8, 1.4); ice.position.set(0, 0.7, 0); ice.name = 'iceBlock';
            t.group.add(ice); t.iceBlock = ice;
          }
          if (t.frozenT <= 0) {
            if (t.iceBlock) { t.group.remove(t.iceBlock); t.iceBlock = undefined; }
            this.particles.emit(tp.clone().setY(tp.y + 0.8), 0xbae6fd, 14, 2, 0.1, 0.6, 2);
            this.sfx.splat();
          }
          continue;
        }
        t.cooldown -= dt; t.recoil = Math.max(0, t.recoil - dt * 4);
        const def = TOWER_DEFS[t.type]; const st = this.towerStats(t.type, t.level, t.buff); const tp = t.group.position;
        const spin = t.head.getObjectByName('spin'); if (spin) { spin.rotation.y += dt * (t.target ? 8 : 2); }
        if (t.type === 'banner') continue;
        if (t.type === 'piggy') { // Pinky: pays gold every few seconds (more with upgrades and banners)
          if (t.cooldown <= 0) {
            t.cooldown = st.rate; t.recoil = 1; const gain = st.dmg; this.state.gold += gain; this.dirty = true;
            const p = tp.clone().setY(tp.y + 1.7);
            this.float(`+${gain} 🪙`, p, '#fde047'); this.particles.emit(p.clone().setY(p.y - 0.4), 0xfde047, 8, 1.6, 0.08, 0.6, 3.5); this.sfx.coin();
          }
          continue;
        }
        if (t.type === 'wind') { // Whirl: a constant gust that shoves every orc in range backwards along the road (bosses & heavies resist)
          const push = (0.9 + 0.5 * (t.level - 1)) * (1 + t.buff); let near: Enemy | null = null; let cnt = 0;
          for (const e of this.enemies) {
            if (e.dead || e.type === 'rider') continue; const dx = e.group.position.x - tp.x, dz = e.group.position.z - tp.z; if (dx * dx + dz * dz > st.range * st.range) continue;
            cnt++; if (!near) near = e;
            if (!(e.type === 'jumper' && e.jumpState === 'flying')) { const k = e.type === 'boss' ? 0.35 : e.type === 'log' ? 0.5 : e.type === 'tank' ? 0.7 : 1; e.s = Math.max(0, e.s - push * k * dt); }
            if (Math.random() < 0.2) this.particles.emit(this.enemyCenter(e), 0xe0e7ff, 1, 0.8, 0.05, 0.4, 0.6, 0);
          }
          t.target = near;
          if (cnt > 0) {
            t.pulseT -= dt; t.recoil = Math.max(t.recoil, 0.5);
            if (t.pulseT <= 0) { t.pulseT = 0.5; this.ring(tp.clone().setY(tp.y + 0.2), 0xc7d2fe, 0.4, st.range, 0.7, RING, 0.55); this.sfx.whoosh(); }
            for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, r = st.range * (0.35 + Math.random() * 0.65); this.particles.emit(new THREE.Vector3(tp.x + Math.cos(a) * r, tp.y + 0.15 + Math.random() * 0.6, tp.z + Math.sin(a) * r), 0xffffff, 1, 0.5, 0.045, 0.5, 0.3, 0); }
          }
          continue;
        }
        if (t.type === 'mine') { // Moli: digs landmines onto the road within its range (max 2 + level at a time)
          if (t.cooldown <= 0) {
            if (this.mines.filter(m => m.owner === t.id).length < 2 + t.level) {
              t.cooldown = st.rate; const cands: THREE.Vector3[] = []; const pp = new THREE.Vector3();
              for (let s2 = 0.8; s2 < this.pathLen - 0.5; s2 += 0.4) { this.posAt(s2, pp); const dx = pp.x - tp.x, dz = pp.z - tp.z; if (dx * dx + dz * dz <= st.range * st.range && !this.mines.some(m => m.pos.distanceTo(pp) < 0.9)) cands.push(pp.clone()); }
              if (cands.length) { this.layMine(t, cands[Math.floor(Math.random() * cands.length)], st.dmg); t.recoil = 1; }
            } else t.cooldown = 0.6;
          }
          continue;
        }
        if (t.type === 'barracks') { this.updateBarracks(t, st, dt); continue; } // Barry: the knights do the fighting
        if (t.type === 'golem') { // Rocky: when a ground orc is close it raises its fists (0.22s windup) and then slams the ground
          let near: Enemy | null = null, nd = 1e9;
          for (const e of this.enemies) { if (e.flying || e.dead) continue; const d = Math.hypot(e.group.position.x - tp.x, e.group.position.z - tp.z); if (d <= st.range && d < nd) { nd = d; near = e; } }
          t.target = near;
          if (t.pulseT > 0) { t.pulseT -= dt; if (t.pulseT <= 0) { t.pulseT = 0; t.cooldown = st.rate; t.recoil = 1; this.stomp(t, st); } }
          else if (near && t.cooldown <= 0) t.pulseT = 0.22;
          continue;
        }
        if (t.type === 'clock') { // Chrono: an aura that slows EVERY enemy inside its range (ground and air), stronger with upgrades
          const k = Math.max(0.36, 0.66 - 0.1 * (t.level - 1)); let cnt = 0; let near: Enemy | null = null;
          for (const e of this.enemies) {
            if (e.dead) continue; const dx = e.group.position.x - tp.x, dz = e.group.position.z - tp.z; if (dx * dx + dz * dz > st.range * st.range) continue;
            cnt++; if (!near) near = e;
            e.auraK = (e.auraT ?? 0) > 0.12 ? Math.min(e.auraK ?? 1, k) : k; e.auraT = 0.18;
            if (Math.random() < 0.06) this.particles.emit(this.enemyCenter(e), 0x99f6e4, 1, 0.6, 0.05, 0.5, 1.2, -0.2);
          }
          t.target = near;
          t.pulseT -= dt;
          if (t.pulseT <= 0) { t.pulseT = cnt > 0 ? 1.1 : 2.2; this.ring(tp.clone().setY(tp.y + 0.1), 0x5eead4, 0.3, st.range, 0.9, RING, cnt > 0 ? 0.6 : 0.3); if (cnt > 0) { t.recoil = 1; this.sfx.tick(); } }
          continue;
        }
        if (t.type === 'repair') {
          const arm = t.head.getObjectByName('hammer');
          if (t.cooldown <= 0) {
            t.cooldown = st.rate / (1 + 0.5 * (t.level - 1)); let best: Tower | null = null;
            for (const o of this.towers) if (o !== t && o.hp < TOWER_HP && o.group.position.distanceTo(tp) <= st.range && (!best || o.hp < best.hp)) best = o;
            if (best) { this.setTowerHp(best, best.hp + 2); const p = best.group.position.clone().setY(1.2); this.particles.emit(p, 0x6ee7b7, 5, 0.6, 0.06, 0.6, 1.5, -1); this.bolt(tp.clone().setY(0.9), p, 0xfda4af, 0.04, 0.2, 0.1); t.recoil = 1; this.sfx.repair(); }
          }
          if (arm) arm.rotation.x = -0.8 + t.recoil * 1.2;
          continue;
        }
        if (t.type === 'shield') { const dome = t.head.getObjectByName('dome') as THREE.Mesh | undefined; if (dome) (dome.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin(this.time * 3) * 0.04 + t.recoil * 0.3; t.recoil = Math.max(0, t.recoil - dt * 2); continue; }
        const can = (e: Enemy) => (e.flying ? def.air : def.ground) && ((e.stealthT ?? 0) <= 0);
        let target: Enemy | null = null;
        if (t.target && !t.target.dead && t.target.group.position.distanceTo(tp) <= st.range) target = t.target;
        else for (const e of this.enemies) { if (!can(e)) continue; const dx = e.group.position.x - tp.x, dz = e.group.position.z - tp.z; if (dx * dx + dz * dz <= st.range * st.range && (!target || e.s > target.s)) target = e; }
        t.target = target;
        if (target) {
          const ang = Math.atan2(target.group.position.x - tp.x, target.group.position.z - tp.z);
          let d = ang - t.head.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); t.head.rotation.y += d * Math.min(1, dt * 12);
          if (t.cooldown <= 0) this.fire(t, target, st);
        }
        if (t.type === 'plasma') this.updatePlasma(t, target, dt);
        if (t.beam && t.beamGlow) {
          if (target) {
            const a = this.muzzleWorld(t), b = this.enemyCenter(target);
            const mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b); const w = 0.06 + Math.sin(this.time * 40) * 0.02;
            for (const [m, k] of [[t.beam, 1], [t.beamGlow, 2.6]] as [THREE.Mesh, number][]) { m.visible = true; m.position.copy(mid); m.lookAt(b); m.scale.set(w * k, w * k, len); }
            if (Math.random() < 0.5) this.particles.emit(b, 0xcffcff, 1, 0.6, 0.05, 0.4, 1, 1);
          } else { t.beam.visible = false; t.beamGlow.visible = false; }
        }
        t.head.position.set(-t.recoil * 0.12 * Math.sin(t.head.rotation.y), 0.3 - (t.type === 'blaster' ? t.recoil * 0.08 : 0), -t.recoil * 0.12 * Math.cos(t.head.rotation.y));
      }
      // landmines: arm, blink, then explode when a ground orc steps on one
      this.mines = this.mines.filter(m => {
        m.arm -= dt; m.mesh.scale.setScalar(Math.min(1, m.mesh.scale.x + dt * 3));
        const led = m.mesh.getObjectByName('led'); if (led) led.visible = m.arm > 0 ? Math.sin(this.time * 20) > 0 : Math.sin(this.time * 7) > -0.2;
        if (m.arm > 0) return true;
        for (const e of this.enemies) { if (e.flying || e.dead) continue; if (e.group.position.distanceTo(m.pos) < 0.7) { this.mineBoom(m); return false; } }
        return true;
      });
      // boomerangs: elliptical loop out and back, damaging each orc once per pass
      this.booms = this.booms.filter(b => {
        b.u += (dt * 7) / (2.2 * b.dist);
        if (b.u >= 1) { this.scene.remove(b.mesh); const tw = this.towers.find(x => x.id === b.owner); const pr = tw?.head.userData.prop as THREE.Object3D | undefined; if (pr) pr.visible = true; return false; }
        const th = b.u * Math.PI * 2, fwd = (b.dist * (1 - Math.cos(th))) / 2, lat = b.dist * 0.34 * Math.sin(th);
        b.mesh.position.copy(b.from).addScaledVector(b.dir, fwd).addScaledVector(b.side, lat); b.mesh.rotation.y += dt * 22;
        if (b.u > 0.5 && !b.back) { b.back = true; b.hit.clear(); }
        const bp = b.mesh.position;
        for (const e of this.enemies) {
          if (e.dead || b.hit.has(e.id)) continue; const ec = this.enemyCenter(e);
          if (Math.hypot(ec.x - bp.x, ec.z - bp.z) < 0.7 && Math.abs(ec.y - bp.y) < 1.4) { b.hit.add(e.id); this.damage(e, b.dmg, { hitPos: ec }); this.particles.emit(ec, 0xfff1b0, 5, 2, 0.06, 0.3, 2); this.ring(ec, 0xfde68a, 0.1, 0.7, 0.2, RING, 0.85); this.sfx.hit(); }
        }
        if (Math.random() < 0.6) this.particles.emit(bp, 0xfde68a, 1, 0.3, 0.05, 0.25, 0.3, 0);
        return true;
      });
      // fishing hooks: the hook flies out, snags the front-most orc, reels it far back along the road, then slams it down
      this.hooks = this.hooks.filter(h => {
        const tw = this.towers.find(x => x.id === h.owner);
        const drop = () => { this.scene.remove(h.mesh); this.scene.remove(h.line); h.e.hooked = false; return false; };
        if (!tw || h.e.dead) return drop();
        const tipO = tw.head.getObjectByName('rodTip'); const tip = tipO ? tipO.getWorldPosition(new THREE.Vector3()) : this.muzzleWorld(tw);
        const ec = this.enemyCenter(h.e);
        if (h.phase === 'fly') {
          h.t += dt / 0.2; const k = Math.min(1, h.t), e2 = 1 - (1 - k) * (1 - k);
          h.mesh.position.lerpVectors(tip, ec, e2); h.mesh.lookAt(ec);
          if (k >= 1) {
            h.phase = 'pull'; h.t = 0; h.e.hooked = true; h.pullFrom = h.e.s; h.pullTo = Math.max(0, h.e.s - h.pull * h.resist);
            h.e.stunT = Math.max(h.e.stunT, h.dur + 0.45);
            this.curSrc = tw.group.position; this.damage(h.e, h.dmg, { hitPos: ec });
            if (h.e.dead) return drop();
            this.float('KENA!', ec.clone().setY(ec.y + 0.7), '#86efac'); this.ring(ec, 0xbbf7d0, 0.1, 0.7, 0.25, RING, 0.9); this.sfx.hit();
          }
        } else {
          h.t += dt / h.dur; const k = Math.min(1, h.t), ease = 1 - Math.pow(1 - k, 3);
          h.e.s = h.pullFrom + (h.pullTo - h.pullFrom) * ease; h.mesh.position.copy(ec); h.mesh.position.y += 0.05;
          if (!h.e.flying && Math.random() < 0.7) this.particles.emit(h.e.group.position.clone().setY(0.08), 0xe9dfc6, 1, 0.8, 0.08, 0.5, 0.8);
          if (k >= 1) {
            if (!h.e.flying && !h.e.dead) { // slammed down where it landed (only worth it when it was dragged a real distance)
              const far = h.pullFrom - h.pullTo > 0.8; this.curSrc = tw.group.position;
              this.damage(h.e, Math.round(h.dmg * 1.5), { hitPos: ec });
              if (far) { this.ring(h.e.group.position.clone().setY(0.08), 0xe9dfc6, 0.2, 1.3, 0.35, RING, 0.9); this.particles.emit(h.e.group.position.clone().setY(0.1), 0xe9dfc6, 8, 1.8, 0.09, 0.5, 2); this.shake = Math.max(this.shake, 0.1); if (!h.e.dead) this.float('BANTING!', ec.clone().setY(ec.y + 0.7), '#86efac'); }
            }
            return drop();
          }
        }
        const hp = h.mesh.position; const dv = hp.clone().sub(tip); const L = Math.max(0.01, dv.length()); // the fishing line, rod tip -> hook
        h.line.position.copy(tip).add(hp).multiplyScalar(0.5); h.line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dv.normalize()); h.line.scale.set(0.018, 0.018, L);
        return true;
      });
      // bowling balls: lobbed onto the road, then they roll BACK along the path bowling over every ground orc (3 or more = STRIKE!)
      this.rolls = this.rolls.filter(r => {
        if (r.phase === 'fly') {
          r.t += dt / 0.42; const k = Math.min(1, r.t);
          r.mesh.position.lerpVectors(r.from, r.to, k); r.mesh.position.y += Math.sin(k * Math.PI) * 1.5; r.mesh.rotation.x += dt * 9;
          if (k >= 1) { r.phase = 'roll'; r.last.copy(r.to); this.ring(r.to.clone().setY(r.to.y - 0.1), 0xe9dfc6, 0.15, 0.9, 0.3, RING, 0.8); this.particles.emit(r.to, 0xe9dfc6, 8, 1.6, 0.08, 0.5, 1.8); this.shake = Math.max(this.shake, 0.06); this.sfx.thud(); }
          return true;
        }
        const step = 6.4 * dt; r.s -= step; r.travelled += step;
        if (r.s <= 0.1 || r.travelled >= r.maxDist) { this.scene.remove(r.mesh); this.particles.emit(r.last, 0xfde68a, 8, 1.6, 0.07, 0.5, 2); this.ring(r.last.clone().setY(r.last.y - 0.1), 0xfde68a, 0.1, 0.8, 0.25, RING, 0.8); return false; }
        const bp = new THREE.Vector3(); this.posAt(r.s, bp); bp.y = (this.world?.heightAt(bp.x, bp.z) ?? 0) + 0.22;
        const mv = bp.clone().sub(r.last); // spin the ball around the axis perpendicular to its travel, by exactly the rolled distance
        if (mv.lengthSq() > 1e-8) { mv.normalize(); const ax = new THREE.Vector3(0, 1, 0).cross(mv); if (ax.lengthSq() > 1e-6) r.mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(ax.normalize(), step / 0.2)); }
        r.mesh.position.copy(bp); r.last.copy(bp);
        if (Math.random() < 0.6) this.particles.emit(bp.clone().setY(bp.y - 0.12), 0xe9dfc6, 1, 0.6, 0.07, 0.45, 0.6, 0);
        for (const e of this.enemies) {
          if (e.dead || e.flying || r.hit.has(e.id) || Math.abs(e.s - r.s) > 0.6 + e.size * 0.3) continue;
          r.hit.add(e.id); r.strike++; const ec = this.enemyCenter(e); this.curSrc = bp.clone();
          this.damage(e, r.dmg, { hitPos: ec });
          if (!e.dead && e.type !== 'boss') e.stunT = Math.max(e.stunT, 0.5);
          this.particles.emit(ec, 0xfff3b0, 5, 2.2, 0.06, 0.35, 2.2, 0); this.ring(ec.clone().setY(0.1), 0xffffff, 0.1, 0.8, 0.2, RING, 0.8); this.sfx.hit();
          if (r.strike === 1) this.float('BONK!', ec.clone().setY(ec.y + 0.7), '#fde68a');
          if (r.strike === 3) { this.state.gold += 12; this.dirty = true; this.float('🎳 STRIKE! +12', bp.clone().setY(bp.y + 1.2), '#fde047'); this.flash(bp, 0xfde047, 5, 5); this.shake = Math.max(this.shake, 0.18); this.sfx.coin(); }
        }
        return true;
      });
      // Naga fissures: active lava cracks on road
      this.fissures = this.fissures.filter(fs => {
        fs.life -= dt;
        for (const m of fs.meshes) {
          if (Math.random() < 0.25) this.particles.emit(m.position.clone().setY(0.08), 0xff5722, 1, 0.4, 0.05, 0.3, 1, -1);
        }
        if (fs.life <= 0) {
          for (const m of fs.meshes) this.scene.remove(m);
          return false;
        }
        return true;
      });
      // Storm cyclones: traveling 3D twisters
      this.cyclones = this.cyclones.filter(cy => {
        cy.travelled += dt * 2.8;
        cy.s += cy.dir * dt * 2.8;
        if (cy.s <= 0.2 || cy.travelled >= cy.range) {
          this.scene.remove(cy.mesh);
          this.ring(cy.mesh.position, 0x38bdf8, 0.2, 1.8, 0.4, RING, 0.8);
          this.particles.emit(cy.mesh.position, 0xbae6fd, 14, 2.4, 0.08, 0.4, 2);
          return false;
        }
        this.posAt(cy.s, cy.mesh.position);
        cy.mesh.position.y = (this.world?.heightAt(cy.mesh.position.x, cy.mesh.position.z) ?? 0) + 0.1;
        cy.mesh.rotation.y += dt * 18;
        cy.mesh.rotation.z = Math.sin(this.time * 10) * 0.12;
        if (Math.random() < 0.5) this.particles.emit(cy.mesh.position.clone().setY(0.8), 0x7dd3fc, 2, 1.2, 0.06, 0.3, 1.5, 0);
        for (const e of this.enemies) {
          if (e.dead) continue;
          const dist = Math.hypot(e.group.position.x - cy.mesh.position.x, e.group.position.z - cy.mesh.position.z);
          if (dist <= 1.4) {
            e.cycloneLiftT = 0.4;
            e.silenceT = Math.max(e.silenceT ?? 0, 2.5 + 0.5 * cy.level);
            e.s = Math.max(0, e.s - dt * 1.5);
            this.damage(e, cy.dps * dt, { silent: true });
          }
        }
        return true;
      });
      // Quake spikes: soul tether chains
      this.spikes = this.spikes.filter(sp => {
        sp.life -= dt;
        const validTethers: number[] = [];
        const validLines: THREE.Line[] = [];
        for (let i = 0; i < sp.tethers.length; i++) {
          const tid = sp.tethers[i];
          const line = sp.lineMeshes[i];
          const target = this.enemies.find(x => x.id === tid && !x.dead);
          if (target && target.group.position.distanceTo(sp.pos) <= 4.5) {
            validTethers.push(tid);
            validLines.push(line);
            const tc = this.enemyCenter(target);
            const posAttr = line.geometry.attributes.position as THREE.BufferAttribute;
            posAttr.setXYZ(0, sp.pos.x, sp.pos.y + 0.8, sp.pos.z);
            posAttr.setXYZ(1, tc.x, tc.y, tc.z);
            posAttr.needsUpdate = true;
            if (Math.random() < 0.15) this.particles.emit(tc, 0xf97316, 1, 0.8, 0.04, 0.2);
          } else {
            this.scene.remove(line);
            if (target) target.tetherSpikeId = undefined;
          }
        }
        sp.tethers = validTethers;
        sp.lineMeshes = validLines;
        if (sp.life <= 0) {
          this.scene.remove(sp.mesh);
          for (const l of sp.lineMeshes) this.scene.remove(l);
          for (const tid of sp.tethers) {
            const e = this.enemies.find(x => x.id === tid);
            if (e) e.tetherSpikeId = undefined;
          }
          this.ring(sp.pos.clone().setY(0.08), 0xf97316, 0.2, 2.2, 0.4, RING, 0.9);
          this.particles.emit(sp.pos, 0xf97316, 16, 2.4, 0.1, 0.5, 3);
          this.sfx.quake();
          return false;
        }
        return true;
      });
      // Glacier ice barricades: physical blockage
      this.iceWalls = this.iceWalls.filter(w => {
        w.life -= dt;
        w.hpFg.scale.x = Math.max(0.001, w.hp / w.maxHp);
        if (w.hp <= 0 || w.life <= 0) {
          this.scene.remove(w.mesh);
          this.ring(w.pos.clone().setY(0.08), 0x06b6d4, 0.3, 2.8, 0.5, RING, 0.95);
          this.particles.emit(w.pos, 0xa5f3fc, 24, 3.0, 0.12, 0.7, 3);
          this.sfx.shatter();
          this.float('PECAHAN ES CRYO! ❄️', w.pos.clone().setY(1.4), '#a5f3fc');
          for (const e of this.enemies) {
            if (e.dead) continue;
            if (e.group.position.distanceTo(w.pos) <= 2.8) {
              this.damage(e, 40, { hitPos: this.enemyCenter(e) });
              e.freezeT = 2.0;
              e.silenceT = 2.0;
            }
          }
          return false;
        }
        return true;
      });
      // enemy bullets vs towers / shields
      this.enemyShots = this.enemyShots.filter(sh => {
        sh.life -= dt;
        if (sh.kind === 'cannonball') {
          const total = Math.max(1.5, sh.start!.distanceTo(sh.goal!)); sh.t! += dt * 5 / total;
          const k = Math.min(1, sh.t!); sh.pos.lerpVectors(sh.start!, sh.goal!, k); sh.pos.y += Math.sin(k * Math.PI) * 2.2;
          const dirv = sh.pos.clone().sub(sh.mesh.position); sh.mesh.position.copy(sh.pos); if (dirv.lengthSq() > 1e-6) sh.mesh.lookAt(sh.pos.clone().add(dirv));
          const tl = sh.mesh.getObjectByName('flame'); if (tl) flickerFlame(tl, this.time * 1.4);
          this.particles.emit(sh.pos, 0x4b5563, 1, 0.3, 0.1, 0.8, 0.3, -0.5); if (Math.random() < 0.7) this.particles.emit(sh.pos, 0xffa11f, 1, 0.5, 0.06, 0.3, 0.3, 0);
          if (k >= 1) {
            this.scene.remove(sh.mesh); const at = sh.goal!.clone().setY(0.1);
            let blocked = false;
            for (const s2 of this.towers) if (s2.type === 'shield' && at.distanceTo(s2.group.position) <= 2.0 + 0.3 * (s2.level - 1)) { blocked = true; s2.recoil = 1; break; }
            this.fireball(at, 1.35); this.particles.emit(at, 0x8a6a4b, 14, 3.5, 0.1, 0.9, 4.5);
            this.ring(at.clone().setY(0.07), 0xffb347, 0.2, 3.2, 0.4, RING, 0.95); this.ring(at.clone().setY(0.3), 0xffffff, 0.1, 1.6, 0.25, undefined, 0.9, 2); this.ring(at.clone().setY(0.04), 0x1c1917, 0.5, 1.2, 7, DISC, 0.6);
            this.flash(at.clone().setY(0.7), 0xff7a1c, 10, 7); this.shake = Math.max(this.shake, 0.4); this.sfx.boom();
            if (blocked) { this.ring(at.clone().setY(0.5), 0x7dd3fc, 0.3, 2.4, 0.4, RING, 0.9); this.float('DIBLOKIR!', at.clone().setY(1.4), '#7dd3fc'); }
            else if (!sh.target.dead) { this.float('-10 HP', sh.target.group.position.clone().setY(1.6), '#f87171'); this.setTowerHp(sh.target, sh.target.hp - 10); if (sh.target.hp <= 0) this.destroyTower(sh.target); }
            return false;
          }
          return true;
        }
        if (sh.kind === 'arrow') { // lobbed arrow: arcs to the tower; another tower's shield dome can swallow it
          const total = Math.max(1.2, sh.start!.distanceTo(sh.goal!)); sh.t! += dt * 7.5 / total;
          const k = Math.min(1, sh.t!); const prev = sh.pos.clone();
          sh.pos.lerpVectors(sh.start!, sh.goal!, k); sh.pos.y += Math.sin(k * Math.PI) * Math.min(1.5, total * 0.34);
          sh.mesh.position.copy(sh.pos); const dv = sh.pos.clone().sub(prev); if (dv.lengthSq() > 1e-8) sh.mesh.lookAt(sh.pos.clone().add(dv));
          if (sh.target.dead || !this.towers.includes(sh.target)) { this.scene.remove(sh.mesh); return false; }
          if (k >= 1) {
            this.scene.remove(sh.mesh); let blocked = false;
            for (const s2 of this.towers) if (s2.type === 'shield' && s2 !== sh.target && sh.goal!.distanceTo(s2.group.position) <= 2.0 + 0.3 * (s2.level - 1)) { blocked = true; s2.recoil = 1; break; }
            if (blocked) { this.ring(sh.goal!, 0x7dd3fc, 0.1, 0.6, 0.2, RING, 0.9); this.particles.emit(sh.goal!, 0x7dd3fc, 5, 1.5, 0.05, 0.3, 1, 0); this.sfx.hit(); }
            else { this.hurtTower(sh.target, sh.goal!.clone(), sh.dmg); this.sfx.arrowHit(); this.float(`-${sh.dmg}`, sh.goal!.clone().setY(sh.goal!.y + 0.5), '#fca5a5'); }
            return false;
          }
          return true;
        }
        sh.pos.addScaledVector(sh.vel, dt); sh.mesh.position.copy(sh.pos); sh.mesh.lookAt(sh.pos.clone().add(sh.vel));
        if (sh.life <= 0 || sh.target.dead) { this.scene.remove(sh.mesh); return false; }
        for (const s2 of this.towers) {
          if (s2.type !== 'shield') continue; const r = 2.0 + 0.3 * (s2.level - 1);
          if (sh.pos.distanceTo(s2.group.position) <= r && sh.pos.distanceTo(sh.target.group.position) > 0.4) {
            this.scene.remove(sh.mesh); s2.recoil = 1; this.particles.emit(sh.pos, 0x7dd3fc, 6, 1.5, 0.05, 0.3, 1, 0); this.ring(sh.pos, 0x7dd3fc, 0.1, 0.6, 0.2, RING, 0.9); this.sfx.hit(); return false;
          }
        }
        if (sh.pos.distanceTo(sh.target.group.position.clone().setY(0.7)) < 0.35) { this.scene.remove(sh.mesh); this.hurtTower(sh.target, sh.pos.clone()); return false; }
        return true;
      });
      const dir = new THREE.Vector3();
      this.projectiles = this.projectiles.filter(p => {
        if (p.target.type !== 'magnet') {
          for (const m of this.enemies) {
            if (m.type === 'magnet' && !m.dead && m.group.position.distanceTo(p.pos) <= 2.2) {
              p.target = m;
              this.particles.emit(p.pos, 0x60a5fa, 2, 0.8, 0.04, 0.2);
              break;
            }
          }
        }
        const goal = this.enemyCenter(p.target);
        this.curSrc = p.start; // where the blow came from (used by the death ragdoll)
        if (p.kind === 'needle' || p.kind === 'bee' || p.kind === 'heart') {
          if (p.target.dead) { // bees look for a new victim nearby, needles just vanish
            let best: Enemy | null = null, bd = 3.5;
            if (p.kind === 'bee') for (const e of this.enemies) { if (e.dead) continue; const d = e.group.position.distanceTo(p.pos); if (d < bd) { bd = d; best = e; } }
            if (!best) { this.scene.remove(p.mesh); return false; }
            p.target = best;
          }
          const gl = this.enemyCenter(p.target); dir.subVectors(gl, p.pos); const dist2 = dir.length(); const step2 = p.speed * dt;
          if (dist2 <= step2 + 0.2) {
            this.scene.remove(p.mesh); const bee = p.kind === 'bee', heart = p.kind === 'heart';
            this.particles.emit(gl, heart ? 0xf9a8d4 : bee ? 0xfde047 : 0xf0fdf4, bee ? 5 : 4, 1.6, 0.05, 0.3, 1.6, 2); this.ring(gl, heart ? 0xf9a8d4 : bee ? 0xfde047 : 0x86efac, 0.1, 0.5, 0.18, RING, 0.8);
            this.damage(p.target, p.kind === 'needle' && p.target.flying ? p.dmg * 3 : p.dmg, { hitPos: gl });
            if (heart && !p.target.dead) this.charm(p.target, 4.5 + p.level); // marked: lasts 5.5 / 6.5 / 7.5 s by level
            if (p.kind === 'needle' && p.target.flying) this.float('x3!', gl.clone().setY(gl.y + 0.4), '#86efac');
            this.sfx.hit(); return false;
          }
          p.pos.addScaledVector(dir.normalize(), step2); p.mesh.position.copy(p.pos); p.mesh.lookAt(gl);
          if (p.kind === 'bee') { // wobbly zig-zag flight + flapping wings
            const sd = p.seed ?? 0; p.mesh.position.x += Math.sin(this.time * 9 + sd) * 0.1; p.mesh.position.y += Math.cos(this.time * 7 + sd) * 0.08;
            const wL = p.mesh.getObjectByName('wingL'), wR = p.mesh.getObjectByName('wingR'); const fl = Math.sin(this.time * 70 + sd) * 0.7; if (wL) wL.rotation.z = -0.3 - fl; if (wR) wR.rotation.z = 0.3 + fl;
          } else if (Math.random() < 0.5) this.particles.emit(p.pos, p.kind === 'heart' ? 0xfbcfe8 : 0xbbf7d0, 1, 0.2, 0.03, 0.18, 0, 0);
          return true;
        }
        if (p.kind === 'mortar' || p.kind === 'glob' || p.kind === 'fireball' || p.kind === 'meteor') {
          const total = Math.max(1.5, p.start.distanceTo(goal)); p.t += dt * p.speed * 4 / total;
          const prev = p.pos.clone(); p.pos.lerpVectors(p.start, goal, Math.min(1, p.t)); p.pos.y += Math.sin(Math.min(1, p.t) * Math.PI) * p.arc!;
          p.mesh.position.copy(p.pos); p.mesh.lookAt(p.pos.clone().add(p.pos.clone().sub(prev)));
          if (p.kind === 'fireball' || p.kind === 'meteor') {
            this.particles.emit(p.pos, 0xff7a1a, 1, 0.4, 0.08, 0.4, 0.3, 0);
            if (Math.random() < 0.5) this.particles.emit(p.pos, 0xfde047, 1, 0.3, 0.05, 0.3, 0.2, 0);
          } else if (p.kind === 'mortar') { this.particles.emit(p.pos, 0x9a9aa5, 1, 0.3, 0.09, 0.7, 0.4, -0.5); if (Math.random() < 0.6) this.particles.emit(p.pos, 0xffb347, 1, 0.5, 0.05, 0.25, 0.2, 0); }
          else if (Math.random() < 0.5) this.particles.emit(p.pos, 0xa3e635, 1, 0.2, 0.05, 0.4, 0.2, 0);
          if (p.t >= 1) { this.scene.remove(p.mesh); this.explode(goal.clone().setY(0.1), p); return false; }
          return true;
        }
        if (p.target.dead) { this.scene.remove(p.mesh); this.particles.emit(p.pos, 0x4f8cff, 3, 1, 0.06, 0.3, 1); return false; }
        dir.subVectors(goal, p.pos); const dist = dir.length(); const step = p.speed * dt;
        if (dist <= step + 0.15) {
          this.scene.remove(p.mesh);
          this.particles.emit(goal, 0xbfe0ff, 6, 2, 0.06, 0.3, 1.5); this.particles.emit(goal, 0xffe08a, 3, 1, 0.05, 0.2, 1);
          this.ring(goal, 0x9fc5ff, 0.1, 0.6, 0.18, RING, 0.8); this.damage(p.target, p.dmg, { hitPos: goal }); this.flash(goal, 0x9fc5ff, 1.5, 2); this.sfx.hit(); return false;
        }
        p.pos.addScaledVector(dir.normalize(), step); p.mesh.position.copy(p.pos); p.mesh.lookAt(goal);
        if (Math.random() < 0.7) this.particles.emit(p.pos, 0x9fc5ff, 1, 0.2, 0.04, 0.18, 0, 0); return true;
      });
      if (s.waveActive && !this.spawnQueue.length && !this.enemies.length) {
        s.waveActive = false;
        const bonus = 15 + s.wave * 5 + s.level * 5; s.gold += bonus; s.score += 100 * s.level; this.piggyInterest();
        if (s.wave >= s.wavesPerLevel) {
          s.screen = 'levelComplete'; s.score += 500 * s.level;
          for (const t of this.towers) { if (t.beam) t.beam.visible = false; if (t.beamGlow) t.beamGlow.visible = false; }
          if (s.score > s.best) { s.best = s.score; localStorage.setItem('voxeltd_best', String(s.best)); }
          this.sfx.levelUp(); const end = this.waypoints[this.waypoints.length - 1]; this.particles.emit(end.clone().setY(1), 0xf0abfc, 60, 4, 0.14, 1.2, 5);
        } else { s.countdown = 10; s.nextWaveInfo = this.previewWave(); this.float(`Wave selesai +${bonus} 💰`, this.waypoints[this.waypoints.length - 1].clone().setY(1.5), '#fde047'); this.sfx.waveClear(); }
        this.dirty = true;
      }
    }
    if (!playing) for (const e of this.enemies) if (e.breathMesh) e.breathMesh.visible = false;
    this.particles.update(dt);
    this.shake = Math.max(0, this.shake - dt * 1.5);
  }

  render() {
    const aspect = this.camera.aspect; const d = Math.max(22, 29 / aspect);
    const dir = new THREE.Vector3(0, 1.15, 0.95).normalize();
    this.camera.position.copy(this.camTarget).addScaledVector(dir, d);
    if (this.shake > 0) { const k = this.shake * this.shake * 0.6; this.camera.position.x += (Math.random() - 0.5) * k; this.camera.position.y += (Math.random() - 0.5) * k; }
    this.camera.lookAt(this.camTarget); this.renderer.render(this.scene, this.camera);
  }
  resize() {
    const p = this.canvas.parentElement!; const w = p.clientWidth, h = p.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  destroy() { cancelAnimationFrame(this.raf); this.ro?.disconnect(); this.sfx.dispose(); this.renderer.dispose(); }
}
