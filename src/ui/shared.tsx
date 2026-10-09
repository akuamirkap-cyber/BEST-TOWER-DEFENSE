import type { CSSProperties, ReactNode } from 'react';
import { TOWER_DEFS } from '../game/engine';
import type { TowerType } from '../game/engine';

export const TOWER_COL: Record<TowerType, [string, string]> = {
  cannon: ['#7ab8ff', '#2f6fe0'], frost: ['#c8fbff', '#3fc9e8'], blaster: ['#ffb27a', '#f0602b'],
  tesla: ['#e2c6ff', '#8b3be8'], sniper: ['#8df5c8', '#0f9b7a'], poison: ['#d6ff7a', '#6aa312'],
  banner: ['#ffe08a', '#f59e0b'], flame: ['#ffc27a', '#ea580c'], trap: ['#e7e5e4', '#78716c'],
  repair: ['#ffb4c4', '#e11d48'], shield: ['#a5e8ff', '#0ea5e9'], plasma: ['#fff3a0', '#2563eb'],
  piggy: ['#fbcfe8', '#ec4899'], wind: ['#e0e7ff', '#6366f1'], boomer: ['#f3d3a5', '#b7791f'], mine: ['#c4b5d0', '#6b5a7e'],
  cactus: ['#bbf7d0', '#16a34a'], hive: ['#fde68a', '#d97706'], golem: ['#e7e5e4', '#78716c'], clock: ['#99f6e4', '#0d9488'],
  prism: ['#bfdbfe', '#2563eb'], cupid: ['#fbcfe8', '#db2777'], hook: ['#bbf7d0', '#15803d'], bowl: ['#fecaca', '#dc2626'],
  barracks: ['#bfdbfe', '#1d4ed8'], mind: ['#f0abfc', '#9333ea'],
};
export const TOWER_BG = Object.fromEntries((Object.keys(TOWER_COL) as TowerType[]).map(k => [k, `linear-gradient(180deg,${TOWER_COL[k][0]},${TOWER_COL[k][1]})`])) as Record<TowerType, string>;
/** every tower is a "Penjaga Kristal" with its own nickname */
export const NICK: Record<TowerType, string> = {
  cannon: 'Bolo', frost: 'Pingu', blaster: 'Boomy', tesla: 'Zappy', sniper: 'Hawk-eye', poison: 'Brewy',
  banner: 'Kiko', flame: 'Blaze', trap: 'Chompy', repair: 'Mender', shield: 'Sir Bubbo', plasma: 'Volta', piggy: 'Pinky', wind: 'Whirl', boomer: 'Bumi', mine: 'Moli', cactus: 'Spiky', hive: 'Buzzy', golem: 'Rocky', clock: 'Chrono', prism: 'Lumi', cupid: 'Amor', hook: 'Froggy', bowl: 'Pino', barracks: 'Barry', mind: 'Hipno',
};
export const portraitBg = (t: TowerType) => `radial-gradient(circle at 50% 62%, ${TOWER_COL[t][0]} 0%, ${TOWER_COL[t][1]} 85%)`;

/** font size as a multiple of the screen's base unit --u (set on the select screen, so all of its text scales together) */
export const fs = (k: number): CSSProperties => ({ fontSize: `calc(var(--u) * ${k})` });

export function Portrait({ type, src, dim, h = 70 }: { type: TowerType; src?: string; dim?: boolean; h?: number | string }) {
  return (
    <div className="portrait-win w-full" style={{ background: portraitBg(type), height: h }}>
      {src
        ? <img src={src} alt={TOWER_DEFS[type].name} draggable={false} className="absolute inset-0 w-full h-full object-contain" style={dim ? { filter: 'grayscale(0.55) brightness(0.85) drop-shadow(0 3px 0 rgba(40,20,60,0.35))' } : undefined} />
        : <div className="absolute inset-0 flex items-center justify-center text-3xl z-[1]">{TOWER_DEFS[type].icon}</div>}
    </div>
  );
}

export function Tag({ children, bg, fg }: { children: ReactNode; bg: string; fg: string }) {
  return <span className="rounded-full border-2 border-[#281430] font-black leading-none" style={{ background: bg, color: fg, padding: 'calc(var(--u) * 0.14) calc(var(--u) * 0.5)', fontSize: 'calc(var(--u) * 0.8)' }}>{children}</span>;
}

export interface TowerCardProps {
  type: TowerType; src?: string;
  /** size unit: the card is 7.1 units wide and every text scales with it (the in-game tray uses 13px, the select screen a bigger one) */
  u?: string;
  selected?: boolean; chosen?: boolean; dim?: boolean;
  /** false = the player can't afford it (red price + "butuh +N") */
  costOk?: boolean; need?: number;
  corner?: ReactNode; onClick?: () => void;
}

/** THE tower card – used identically in the game's tray and on the "pilih tower inti" screen */
export function TowerCard({ type, src, u = '13px', selected, chosen, dim, costOk = true, need, corner, onClick }: TowerCardProps) {
  const d = TOWER_DEFS[type];
  const style = {
    ['--cu' as string]: u, width: 'calc(var(--cu) * 7.1)', padding: 'calc(var(--cu) * 0.46)',
    background: chosen ? 'linear-gradient(180deg,#ffffff,#bbf7d0)' : selected ? 'linear-gradient(180deg,#ffffff,#fde68a)' : 'linear-gradient(180deg,#fffaf0,#fcd9a8)',
  } as CSSProperties;
  const tag = d.air ? 'bg-sky-300 text-sky-950' : d.ground ? 'bg-lime-300 text-lime-950' : 'bg-pink-300 text-pink-950';
  return (
    <button onClick={onClick} className={`card-tower relative flex shrink-0 flex-col items-center ${selected ? 'selected' : ''}`} style={style}>
      <Portrait type={type} src={src} dim={dim} h="calc(var(--cu) * 5.4)" />
      <span className={`absolute z-[2] rounded-full border-2 border-[#281430] font-bold leading-none ${tag}`} style={{ left: 'calc(var(--cu) * 0.75)', top: 'calc(var(--cu) * 0.75)', padding: 'calc(var(--cu) * 0.12) calc(var(--cu) * 0.42)', fontSize: 'calc(var(--cu) * 0.74)' }}>{d.air ? 'UDARA+' : d.ground ? 'DARAT' : 'SUPPORT'}</span>
      {corner && <span className="absolute z-[3]" style={{ right: 'calc(var(--cu) * 0.3)', top: 'calc(var(--cu) * 0.3)' }}>{corner}</span>}
      <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center font-display leading-none text-[#281430]" style={{ marginTop: 'calc(var(--cu) * 0.42)', fontSize: 'calc(var(--cu) * 1.2)' }}>{d.name}</div>
      <div className="price-tag flex items-center font-display leading-none" style={{ marginTop: 'calc(var(--cu) * 0.36)', gap: 'calc(var(--cu) * 0.3)', padding: 'calc(var(--cu) * 0.14) calc(var(--cu) * 0.7)', fontSize: 'calc(var(--cu) * 1.2)', background: costOk ? 'linear-gradient(180deg,#fde68a,#f59e0b)' : 'linear-gradient(180deg,#fca5a5,#ef4444)', color: costOk ? '#3b1d00' : '#fff' }}>
        <span style={{ fontSize: 'calc(var(--cu) * 1)' }}>🪙</span>{d.cost}
      </div>
      <div className="font-bold leading-none text-red-700" style={{ height: 'calc(var(--cu) * 1.1)', paddingTop: 'calc(var(--cu) * 0.12)', fontSize: 'calc(var(--cu) * 0.8)' }}>{!costOk && need ? `butuh +${need}` : ''}</div>
    </button>
  );
}
