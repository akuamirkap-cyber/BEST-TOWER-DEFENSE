import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { TOWER_DEFS } from '../game/engine';
import type { Game, GameState, TowerType } from '../game/engine';
import { nextSlotLevel } from '../game/roster';
import CardInfo from './CardInfo';
import Horde from './Horde';
import { TOWER_BG, TowerCard, fs } from './shared';
import { useDragScroll } from './useDragScroll';

interface Props { s: GameState; g: Game; portraits: Partial<Record<TowerType, string>>; enemyPortraits: Record<string, string> }

const ALL = Object.keys(TOWER_DEFS) as TowerType[];
/** ONE base unit for the whole screen: every text is a multiple of it. 13px on a phone, ~15px on a laptop, up to 22px on a big screen */
const U = 'clamp(13px, 2.1vmin, 22px)';
const SLOT_W = 'min(calc(var(--u) * 5.2), 10vw)';

/**
 * The screen always fits the window exactly (nothing scrolls except the lists themselves):
 *   top bar (slots) / middle (horde + cards) / bottom bar (buttons).
 * Wide screen: horde left, cards right. Narrow screen: horde on top, cards below, half and half.
 * The card list scrolls by dragging (press, drag, let go -> it glides); the orc legend does the same sideways. No scrollbars.
 */
export default function Loadout({ s, g, portraits, enemyPortraits }: Props) {
  const roster = useMemo(() => g.getRoster(s.level), [g, s.level]);
  const [info, setInfo] = useState<TowerType | null>(null);
  const [foe, setFoe] = useState<string | null>(null);
  const gridRef = useDragScroll('y');
  const full = s.loadout.length >= s.slots;
  const flyers = roster.filter(r => r.flying);
  const needAir = flyers.length > 0 && s.loadout.length > 0 && !s.loadout.some(t => TOWER_DEFS[t].air);
  const unlock = nextSlotLevel(s.level);
  const root = { ['--u' as string]: U, background: 'linear-gradient(180deg,#4c1d95,#1e3a8a)' } as CSSProperties;

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-hidden" style={root}>
      {/* top: title + the slots of the towers you bring (like the card bar of a seed bank) */}
      <div className="shrink-0" style={{ padding: 'calc(var(--u) * 0.6) calc(var(--u) * 0.7) calc(var(--u) * 0.3)' }}>
        <div className="panel-pop flex flex-wrap items-center justify-between" style={{ gap: 'calc(var(--u) * 0.6)', padding: 'calc(var(--u) * 0.6) calc(var(--u) * 0.9)', background: 'linear-gradient(180deg,#9a5b27,#6b3d18)' }}>
          <div className="min-w-0">
            <div className="font-display leading-none text-white text-outline-sm" style={fs(2.2)}>PILIH TOWER INTI</div>
            <div className="font-bold text-amber-100" style={{ ...fs(1.1), marginTop: 'calc(var(--u) * 0.25)' }}>Level {s.level} · {s.loadout.length}/{s.slots} dipilih · 💰 {s.gold}</div>
          </div>
          <div className="flex flex-wrap items-center justify-end" style={{ gap: 'calc(var(--u) * 0.4)' }}>
            {Array.from({ length: s.slots }, (_, i) => {
              const t = s.loadout[i];
              return t ? (
                <button key={i} onClick={() => setInfo(t)} title={TOWER_DEFS[t].name} className="relative overflow-hidden rounded-xl border-[3px] border-[#281430]" style={{ width: SLOT_W, aspectRatio: '4 / 5', background: TOWER_BG[t] }}>
                  {portraits[t] ? <img src={portraits[t]} alt={TOWER_DEFS[t].name} draggable={false} className="absolute inset-0 h-full w-full object-contain" /> : <span style={fs(2)}>{TOWER_DEFS[t].icon}</span>}
                  <span className="absolute inset-x-0 bottom-0 bg-[#281430]/85 font-display leading-none text-yellow-200" style={{ ...fs(0.95), padding: '2px 0' }}>{TOWER_DEFS[t].cost}</span>
                </button>
              ) : (
                <div key={i} className="flex items-center justify-center rounded-xl border-[3px] border-dashed border-amber-200/60 bg-black/20 font-display text-amber-100/60" style={{ width: SLOT_W, aspectRatio: '4 / 5', ...fs(1.6) }}>{i + 1}</div>
              );
            })}
            {unlock && <div className="flex flex-col items-center justify-center rounded-xl border-[3px] border-dashed border-amber-200/30 bg-black/30 text-center leading-tight" style={{ width: SLOT_W, aspectRatio: '4 / 5' }} title={`Slot baru terbuka di Level ${unlock}`}><span style={fs(1.3)}>🔒</span><span className="font-black text-amber-100/80" style={fs(0.85)}>Lv {unlock}</span></div>}
          </div>
        </div>
      </div>

      {/* middle: a grid that fills exactly the space between the bars – horde on the LEFT (the orcs come from the left) + the card list */}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden md:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] md:grid-rows-1" style={{ gap: 'calc(var(--u) * 0.6)', padding: 'calc(var(--u) * 0.3) calc(var(--u) * 0.7) calc(var(--u) * 0.7)' }}>
        <div className="min-h-0 min-w-0">
          <Horde g={g} level={s.level} roster={roster} enemyPortraits={enemyPortraits} selected={foe} onSelect={setFoe} />
        </div>

        <div className="panel-pop flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg,#fff7ed,#fed7aa)' }}>
          <div className="shrink-0 text-[#281430]" style={{ padding: 'calc(var(--u) * 0.7) calc(var(--u) * 1) calc(var(--u) * 0.2)' }}>
            <div className="font-display leading-tight" style={fs(1.5)}>Ketuk kartu untuk melihat kekuatan & skill</div>
            <div className="font-bold leading-snug opacity-70" style={{ ...fs(0.95), marginTop: 'calc(var(--u) * 0.15)' }}>Tombol ➕ di pojok kartu = langsung bawa · tarik ke atas/bawah untuk melihat semua</div>
          </div>
          {/* the card list: press, drag, let go – it glides (see useDragScroll). No scrollbar. */}
          <div ref={gridRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto" style={{ padding: 'calc(var(--u) * 1.3) calc(var(--u) * 0.7) calc(var(--u) * 1)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(calc(var(--u) * 7.7), 1fr))', justifyItems: 'center', gap: 'calc(var(--u) * 0.9) calc(var(--u) * 0.5)' }}>
              {ALL.map(t => {
                const chosen = s.loadout.includes(t); const blocked = !chosen && full;
                const corner = (
                  <span role="button" onClick={e => { e.stopPropagation(); g.toggleLoadout(t); }} className="flex items-center justify-center rounded-full border-2 border-[#281430] font-black text-white" style={{ width: 'calc(var(--u) * 2.1)', height: 'calc(var(--u) * 2.1)', ...fs(1.25), background: chosen ? '#22c55e' : blocked ? '#94a3b8' : '#f59e0b' }}>{chosen ? '✓' : blocked ? '🔒' : '+'}</span>
                );
                return <TowerCard key={t} type={t} src={portraits[t]} u="var(--u)" selected={info === t} chosen={chosen} dim={blocked} corner={corner} onClick={() => setInfo(t)} />;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between" style={{ gap: 'calc(var(--u) * 0.6)', padding: 'calc(var(--u) * 0.3) calc(var(--u) * 0.7) calc(var(--u) * 0.6)' }}>
        <div className="flex min-w-0 flex-1 flex-wrap items-center" style={{ gap: 'calc(var(--u) * 0.6)' }}>
          <button onClick={() => g.suggestLoadout()} className={`btn-candy text-white ${s.loadout.length === 0 ? 'wiggle' : ''}`} style={{ ...fs(1.3), padding: 'calc(var(--u) * 0.5) calc(var(--u) * 1)', background: 'linear-gradient(180deg,#7dd3fc,#2563eb)', ['--shadow' as string]: '#1e3a8a' }}>✨ SARAN</button>
          <button onClick={() => g.clearLoadout()} className="btn-candy text-white" style={{ ...fs(1.3), padding: 'calc(var(--u) * 0.5) calc(var(--u) * 1)', background: 'linear-gradient(180deg,#fda4af,#e11d48)', ['--shadow' as string]: '#881337' }}>🗑️ KOSONG</button>
          <div className="min-w-0 flex-1 font-bold leading-snug text-white" style={{ ...fs(1.05), minWidth: 'calc(var(--u) * 12)' }}>
            {s.loadout.length === 0 && <span className="text-yellow-200">👆 Ketuk kartu untuk memilih, atau tekan SARAN untuk tim seimbang.</span>}
            {needAir && <span className="text-yellow-200">⚠️ Ada orc terbang ({flyers.map(f => f.icon).join(' ')}). Bawa minimal 1 tower UDARA+ (label biru)!</span>}
            {!needAir && s.loadout.length > 0 && full && <span className="text-emerald-200">✅ Slot penuh. Ketuk kartu untuk menukar.</span>}
            {!needAir && s.loadout.length > 0 && !full && <span className="text-white/85">Masih ada {s.slots - s.loadout.length} slot kosong.</span>}
          </div>
        </div>
        <button onClick={() => g.confirmLoadout()} disabled={s.loadout.length === 0} className="btn-candy text-white" style={{ ...fs(2.1), padding: 'calc(var(--u) * 0.45) calc(var(--u) * 2)', background: 'linear-gradient(180deg,#86efac,#16a34a)', ['--shadow' as string]: '#14532d' }}>MULAI! ▶</button>
      </div>

      {info && <CardInfo type={info} src={portraits[info]} chosen={s.loadout.includes(info)} full={full} onToggle={() => { g.toggleLoadout(info); setInfo(null); }} onClose={() => setInfo(null)} />}
    </div>
  );
}
