import type { TowerType } from './engine';

/** short, player-facing description of every enemy: icon, what makes it dangerous, and the colours of its card */
export interface EnemyInfo { icon: string; note: string; bg: [string, string] }
export const ENEMY_INFO: Record<string, EnemyInfo> = {
  normal: { icon: '👹', note: 'Pasukan biasa, jumlahnya banyak', bg: ['#bbf7d0', '#22a05a'] },
  fast: { icon: '👺', note: 'Cepat, tapi HP kecil', bg: ['#fef08a', '#d99a06'] },
  baby: { icon: '👶', note: 'Sprint kilat, kecil dan lincah', bg: ['#fbcfe8', '#ec4899'] },
  tank: { icon: '🛡️', note: 'Armor tebal, peluru lemah mental', bg: ['#ddd6fe', '#7c3aed'] },
  shaman: { icon: '🔮', note: 'Menyembuhkan orc lain: habisi dulu!', bg: ['#a5f3fc', '#0891b2'] },
  berserker: { icon: '🔥', note: 'Makin cepat saat terluka', bg: ['#fed7aa', '#ea580c'] },
  gunner: { icon: '🔫', note: 'Menembaki tower dari jauh', bg: ['#d9f99d', '#65a30d'] },
  archer: { icon: '🏹', note: 'Memanah tower (−2 HP per panah)', bg: ['#bbf7d0', '#15803d'] },
  jumper: { icon: '🚀', note: 'Melompat langsung ke dekat kristal', bg: ['#bae6fd', '#0284c7'] },
  cannoneer: { icon: '💣', note: 'Meriam: −10 HP tower sekali tembak', bg: ['#fde68a', '#b45309'] },
  log: { icon: '🪵', note: 'Hancurkan: 5 orc keluar dari dalamnya', bg: ['#e7c9a0', '#8b5a2b'] },
  balloon: { icon: '🎈', note: 'Terbang & menembaki tower', bg: ['#fecaca', '#dc2626'] },
  dragon: { icon: '🐉', note: 'Terbang & membakar tower dalam 4 detik', bg: ['#fed7aa', '#c2410c'] },
  captain: { icon: '🚩', note: 'Panglima: pasukan di dekatnya +15% cepat', bg: ['#fecaca', '#b91c1c'] },
  legion: { icon: '🪖', note: 'Prajurit baja berperisai, berbaris rapi', bg: ['#cbd5e1', '#475569'] },
  dread: { icon: '⚔️', note: 'Setiap tebasan = satu tower hancur!', bg: ['#86efac', '#14532d'] },
  boss: { icon: '👑', note: 'Raja Orc: HP dan armor sangat tebal', bg: ['#fde047', '#a16207'] },
  ninja: { icon: '🥷', note: 'Orc Ninja: Menghilang berkamuflase & dash kilat hindari tembakan!', bg: ['#cbd5e1', '#1e293b'] },
  bomber: { icon: '🧨', note: 'Orc Dinamit: Lari kencang & meledakkan diri ke tower (−8 HP)!', bg: ['#fecaca', '#ef4444'] },
  magnet: { icon: '🧲', note: 'Orc Magnet: Menyedot proyektil tower ke dirinya demi lindungi kawanan', bg: ['#bfdbfe', '#1d4ed8'] },
  frost: { icon: '❄️', note: 'Dukun Es: Membekukan tower 2.5 detik sehingga tak bisa menembak!', bg: ['#cffafe', '#0284c7'] },
  rider: { icon: '🦏', note: 'Penunggang Badak: Lari seruduk kencang, kebal slow & stun menerobos garis depan!', bg: ['#e2e8f0', '#475569'] },
  punk: { icon: '🧑‍🎤', note: 'Orc Punk Berapi: Helm tempur mohawk berduri api & tombak berapi menyala, membakar tower!', bg: ['#fecaca', '#dc2626'] },
  shield: { icon: '🛡️', note: 'Orc Perisai Baja: Perisai menara kokoh, menangkis 75% damage serangan frontal!', bg: ['#e2e8f0', '#334155'] },
  toxic: { icon: '🧪', note: 'Orc Alkemis Racun: Tabung asam korosif, melarutkan armor & melemahkan damage tower!', bg: ['#bbf7d0', '#16a34a'] },
  bat: { icon: '🦇', note: 'Orc Kelelawar: Kostum jubah drakula & sayap membran elegan, hisap darah pulihkan HP!', bg: ['#e9d5ff', '#7e22ce'] },
  troll: { icon: '🧟', note: 'Troll Rawa Raksasa: Tubuh lumut kekar, regenerasi HP konstan kecuali jika dibakar!', bg: ['#dcfce7', '#15803d'] },
  gargantuar: { icon: '👹', note: 'Orc Gendong Imp (Gargantuar): Raksasa bawa tiang listrik gendong keranjang Imp; saat HP ≤ 50% melempar Imp terbang!', bg: ['#fde68a', '#b45309'] },
  imp: { icon: '👺', note: 'Imp Orc: Orc kecil lincah yang dilempar terbang oleh Gargantuar ke dekat Kristal!', bg: ['#fef08a', '#ca8a04'] },
  bungee: { icon: '🪂', note: 'Orc Terjun Payung (Bungee): Turun dari langit ke tengah jalur & mengikat tower 4 detik jika tak ditembak anti-udara!', bg: ['#fed7aa', '#ea580c'] },
  miner: { icon: '⛏️', note: 'Orc Penambang (Miner): Menggali di bawah tanah (kebal tembakan lurus biasa) & muncul di tengah jalur! Counter: Ranjau, Golem, Mortir, Perangkap.', bg: ['#fef08a', '#a16207'] },
};

export interface RosterEntry {
  type: string; name: string; icon: string; note: string; bg: [string, string];
  /** about how many of them walk in over the whole level */
  count: number;
  /** the wave in which they show up for the first time */
  first: number;
  /** first appearance in this level (never seen in an earlier level) */
  isNew: boolean;
  flying: boolean; armor: number; hp: number; boss: boolean;
}

/** how many towers can be brought along: 6 at the start, one more every two levels, max 10 */
export const slotsFor = (level: number) => Math.min(10, 6 + Math.floor((level - 1) / 2));
/** the first level that has more slots than `level` does (null = already at the maximum) */
export const nextSlotLevel = (level: number): number | null => { const now = slotsFor(level); if (now >= 10) return null; let l = level + 1; while (slotsFor(l) <= now) l++; return l; };

/** a balanced all-round line-up, best first (damage, slow, area, airborne bounty barracks, income, stun, chain, aura, buff) */
export const SUGGESTED: TowerType[] = ['cannon', 'frost', 'blaster', 'aero', 'cactus', 'piggy', 'trap', 'tesla', 'clock', 'golem'];
