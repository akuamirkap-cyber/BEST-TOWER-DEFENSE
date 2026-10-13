import { useEffect, useRef, useState } from 'react';
import type { Game } from '../game/engine';
import { HordeView } from '../game/horde';
import type { RosterEntry } from '../game/roster';
import { BIOMES } from '../game/world';
import { Tag, fs } from './shared';
import { useDragScroll } from './useDragScroll';

interface Props { g: Game; level: number; roster: RosterEntry[]; enemyPortraits: Record<string, string>; selected: string | null; onSelect: (type: string | null) => void }

const toHexStr = (n: number) => '#' + n.toString(16).padStart(6, '0');

/** the left panel of the select screen: a live 3D crowd of the orcs of this level, gathered on the staging lapangan in daylight, ready for battle */
export default function Horde({ g, level, roster, enemyPortraits, selected, onSelect }: Props) {
  const wrap = useRef<HTMLDivElement>(null); const canvas = useRef<HTMLCanvasElement>(null); const view = useRef<HordeView | null>(null);
  const selRef = useRef(selected); const pickRef = useRef(onSelect); selRef.current = selected; pickRef.current = onSelect;
  const [failed, setFailed] = useState(false);
  const legendRef = useDragScroll('x');
  const total = roster.reduce((a, r) => a + r.count, 0);
  const cur = selected ? roster.find(r => r.type === selected) : undefined;

  const biomeIdx = ((level - 1) % BIOMES.length + BIOMES.length) % BIOMES.length;
  const biome = BIOMES[biomeIdx];
  const skyTopColor = toHexStr(biome.skyTop);
  const skyBotColor = toHexStr(biome.skyBot);

  useEffect(() => {
    const cv = canvas.current, box = wrap.current; if (!cv || !box) return;
    let v: HordeView;
    try { v = new HordeView(cv, t => g.buildPreviewEnemy(t), roster.map(r => ({ type: r.type, count: r.count })), level, t => pickRef.current(t)); }
    catch { setFailed(true); return; }
    view.current = v; v.setSelected(selRef.current);
    const ro = new ResizeObserver(() => v.resize(box.clientWidth, box.clientHeight)); ro.observe(box); v.resize(box.clientWidth, box.clientHeight);
    return () => { ro.disconnect(); v.dispose(); view.current = null; };
  }, [g, level, roster]);
  useEffect(() => { view.current?.setSelected(selected); }, [selected]);

  return (
    <div className="panel-pop flex h-full min-h-0 flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg,#fed7aa,#fdba74)' }}>
      {/* title with upcoming level biome */}
      <div className="flex shrink-0 items-center justify-between" style={{ gap: 'calc(var(--u) * 0.6)', padding: 'calc(var(--u) * 0.55) calc(var(--u) * 0.8)', background: 'linear-gradient(180deg,#0284c7,#0369a1)', borderBottom: '3px solid #142232' }}>
        <div className="font-display leading-none text-white text-outline-sm flex items-center flex-wrap gap-1.5" style={fs(1.65)}>
          <span>👹 PASUKAN MUSUH</span>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-yellow-200 font-bold border border-white/30">{biome.name} · Level {level}</span>
        </div>
        <div className="text-right font-bold leading-tight text-sky-100" style={fs(0.95)}>±{total} orc<br />{roster.length} jenis</div>
      </div>

      {/* 3D crowd: bright daytime sky of the upcoming level, assembly lapangan clearing with surrounding grass and trees */}
      <div ref={wrap} className="relative min-h-0 flex-1 overflow-hidden" style={{ minHeight: 'calc(var(--u) * 7)', background: `linear-gradient(180deg, ${skyTopColor} 0%, ${skyBotColor} 65%, #c8f5d0 100%)` }}>
        {/* Sunny daylight ambient radial glow */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 12%, rgba(255,255,255,0.45), transparent 75%)' }} />
        {/* Soft drifting clouds */}
        <div className="pointer-events-none absolute top-3 left-6 h-6 w-24 rounded-full bg-white/45 blur-[1px] cloud-drift-slow" />
        <div className="pointer-events-none absolute top-8 right-10 h-5 w-20 rounded-full bg-white/35 blur-[1px] cloud-drift-fast" />

        <canvas ref={canvas} className="absolute inset-0 h-full w-full" style={{ touchAction: 'pan-y' }} />
        {failed && <div className="absolute inset-0 flex items-center justify-center p-4 text-center font-bold text-[#142232]" style={fs(1.1)}>Pratinjau 3D tidak tersedia di perangkat ini. Daftar orc ada di bawah ⬇</div>}

        <div className="pointer-events-none absolute bottom-1 left-2 right-2 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#142232]/85 bg-white/70 backdrop-blur-xs rounded-full px-3 py-0.5 border border-[#142232]/25 shadow-xs">
          <span>🌿 Lapangan: {biome.name}</span>
          <span>👆 Geser putar · Scroll/cubit zoom</span>
        </div>
      </div>

      {/* caption: what the selected orc does */}
      <div className="shrink-0" style={{ padding: 'calc(var(--u) * 0.5) calc(var(--u) * 0.8)', minHeight: 'calc(var(--u) * 4.2)', background: 'linear-gradient(180deg,#fffbeb,#fef3c7)', borderTop: '3px solid #142232' }}>
        {cur ? (
          <div className="text-[#281430]">
            <div className="flex flex-wrap items-center" style={{ gap: 'calc(var(--u) * 0.4)' }}>
              <span style={fs(1.4)}>{cur.icon}</span><span className="font-display leading-none" style={fs(1.45)}>{cur.name}</span>
              {cur.flying && <Tag bg="#7dd3fc" fg="#082f49">TERBANG</Tag>}{cur.armor > 0 && <Tag bg="#cbd5e1" fg="#1e293b">ARMOR {cur.armor}</Tag>}{cur.boss && <Tag bg="#fde047" fg="#713f12">BOS</Tag>}
              <span className="ml-auto font-display text-amber-900" style={fs(1.2)}>×{cur.count} · wave {cur.first}+</span>
            </div>
            <div className="font-bold leading-snug" style={{ ...fs(1.05), marginTop: 'calc(var(--u) * 0.2)' }}>{cur.note}</div>
          </div>
        ) : (
          <div className="flex items-center font-bold leading-snug text-[#281430]/80" style={{ ...fs(1.05), minHeight: 'calc(var(--u) * 3)' }}>Ini pasukan yang akan menyerang di terain level ini. Ketuk seorang orc, atau ikon di bawah, untuk melihat skill dan jumlahnya.</div>
        )}
      </div>

      {/* legend: one chip per type – drag it sideways, no scrollbar */}
      <div ref={legendRef} className="no-scrollbar flex shrink-0 overflow-x-auto" style={{ gap: 'calc(var(--u) * 0.5)', padding: 'calc(var(--u) * 0.7) calc(var(--u) * 0.7) calc(var(--u) * 0.5)', background: 'linear-gradient(180deg,#1e293b,#0f172a)', borderTop: '3px solid #142232' }}>
        {roster.map(r => {
          const on = selected === r.type;
          return (
            <button key={r.type} onClick={() => onSelect(on ? null : r.type)} className="relative flex shrink-0 items-center rounded-2xl border-[3px] border-[#142232] text-[#142232]" style={{ gap: 'calc(var(--u) * 0.45)', padding: 'calc(var(--u) * 0.3) calc(var(--u) * 0.7) calc(var(--u) * 0.3) calc(var(--u) * 0.3)', background: on ? 'linear-gradient(180deg,#fef08a,#f59e0b)' : 'linear-gradient(180deg,#f8fafc,#e2e8f0)', transform: on ? 'translateY(-3px)' : undefined }}>
              <span className="relative shrink-0 overflow-hidden rounded-xl border-2 border-[#142232]" style={{ width: 'calc(var(--u) * 3.6)', height: 'calc(var(--u) * 3.6)', background: `radial-gradient(circle at 50% 60%, ${r.bg[0]}, ${r.bg[1]})` }}>
                {enemyPortraits[r.type] ? <img src={enemyPortraits[r.type]} alt={r.name} draggable={false} className="absolute inset-0 h-full w-full object-contain" /> : <span className="absolute inset-0 flex items-center justify-center" style={fs(1.8)}>{r.icon}</span>}
                {r.isNew && <span className="absolute left-0 top-0 rounded-br-md bg-yellow-300 px-1 font-display leading-none text-[#142232]" style={fs(0.6)}>BARU</span>}
              </span>
              <span className="flex flex-col items-start leading-none">
                <span className="whitespace-nowrap font-bold" style={fs(0.95)}>{r.name}</span>
                <span className="font-display text-amber-700" style={{ ...fs(1.3), marginTop: 'calc(var(--u) * 0.15)' }}>×{r.count}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

