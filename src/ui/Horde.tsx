import { useEffect, useRef, useState } from 'react';
import type { Game } from '../game/engine';
import { HordeView } from '../game/horde';
import type { RosterEntry } from '../game/roster';
import { Tag, fs } from './shared';
import { useDragScroll } from './useDragScroll';

interface Props { g: Game; level: number; roster: RosterEntry[]; enemyPortraits: Record<string, string>; selected: string | null; onSelect: (type: string | null) => void }

/** the left panel of the select screen: a live 3D crowd of the orcs of this level, getting ready for battle, plus a tappable legend */
export default function Horde({ g, level, roster, enemyPortraits, selected, onSelect }: Props) {
  const wrap = useRef<HTMLDivElement>(null); const canvas = useRef<HTMLCanvasElement>(null); const view = useRef<HordeView | null>(null);
  const selRef = useRef(selected); const pickRef = useRef(onSelect); selRef.current = selected; pickRef.current = onSelect;
  const [failed, setFailed] = useState(false);
  const legendRef = useDragScroll('x'); // the orc types at the bottom: press, drag sideways, let go -> they glide
  const total = roster.reduce((a, r) => a + r.count, 0);
  const cur = selected ? roster.find(r => r.type === selected) : undefined;

  useEffect(() => {
    const cv = canvas.current, box = wrap.current; if (!cv || !box) return;
    let v: HordeView;
    try { v = new HordeView(cv, t => g.buildPreviewEnemy(t), roster.map(r => ({ type: r.type, count: r.count })), level * 7 + 3, t => pickRef.current(t)); }
    catch { setFailed(true); return; }
    view.current = v; v.setSelected(selRef.current);
    const ro = new ResizeObserver(() => v.resize(box.clientWidth, box.clientHeight)); ro.observe(box); v.resize(box.clientWidth, box.clientHeight);
    return () => { ro.disconnect(); v.dispose(); view.current = null; };
  }, [g, level, roster]);
  useEffect(() => { view.current?.setSelected(selected); }, [selected]);

  return (
    <div className="panel-pop flex h-full min-h-0 flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg,#312e81,#4c1d95)' }}>
      {/* title */}
      <div className="flex shrink-0 items-center justify-between" style={{ gap: 'calc(var(--u) * 0.6)', padding: 'calc(var(--u) * 0.55) calc(var(--u) * 0.8)', background: 'linear-gradient(180deg,#7c3aed,#5b21b6)', borderBottom: '3px solid #281430' }}>
        <div className="font-display leading-none text-white text-outline-sm" style={fs(1.75)}>👹 ORC DARI KIRI <span className="inline-block animate-pulse">➜</span></div>
        <div className="text-right font-bold leading-tight text-violet-100" style={fs(0.95)}>±{total} orc<br />{roster.length} jenis</div>
      </div>

      {/* the 3D crowd: dusk sky, a violet glow on the left (the portal), the orcs facing right toward your towers */}
      <div ref={wrap} className="relative min-h-0 flex-1" style={{ minHeight: 'calc(var(--u) * 7)', background: 'linear-gradient(180deg,#1e1b4b 0%,#5b21b6 52%,#f59e0b 135%)' }}>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[22%]" style={{ background: 'linear-gradient(90deg, rgba(168,85,247,0.55), transparent)' }} />
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" style={{ touchAction: 'pan-y' }} />
        {failed && <div className="absolute inset-0 flex items-center justify-center p-4 text-center font-bold text-white" style={fs(1.1)}>Pratinjau 3D tidak tersedia di perangkat ini. Daftar orc ada di bawah ⬇</div>}
        <div className="pointer-events-none absolute bottom-1 left-2 right-2 text-right font-bold text-white/70" style={fs(0.8)}>👆 ketuk orc · geser untuk memutar</div>
      </div>

      {/* caption: what the selected orc does */}
      <div className="shrink-0" style={{ padding: 'calc(var(--u) * 0.5) calc(var(--u) * 0.8)', minHeight: 'calc(var(--u) * 4.2)', background: 'linear-gradient(180deg,#ede9fe,#c4b5fd)', borderTop: '3px solid #281430' }}>
        {cur ? (
          <div className="text-[#281430]">
            <div className="flex flex-wrap items-center" style={{ gap: 'calc(var(--u) * 0.4)' }}>
              <span style={fs(1.4)}>{cur.icon}</span><span className="font-display leading-none" style={fs(1.45)}>{cur.name}</span>
              {cur.flying && <Tag bg="#7dd3fc" fg="#082f49">TERBANG</Tag>}{cur.armor > 0 && <Tag bg="#cbd5e1" fg="#1e293b">ARMOR {cur.armor}</Tag>}{cur.boss && <Tag bg="#fde047" fg="#713f12">BOS</Tag>}
              <span className="ml-auto font-display text-violet-800" style={fs(1.2)}>×{cur.count} · wave {cur.first}+</span>
            </div>
            <div className="font-bold leading-snug" style={{ ...fs(1.05), marginTop: 'calc(var(--u) * 0.2)' }}>{cur.note}</div>
          </div>
        ) : (
          <div className="flex items-center font-bold leading-snug text-[#281430]/80" style={{ ...fs(1.05), minHeight: 'calc(var(--u) * 3)' }}>Ini pasukan yang akan menyerang. Ketuk seorang orc, atau ikon di bawah, untuk melihat sifat dan jumlahnya.</div>
        )}
      </div>

      {/* legend: one chip per type – drag it sideways, no scrollbar */}
      <div ref={legendRef} className="no-scrollbar flex shrink-0 overflow-x-auto" style={{ gap: 'calc(var(--u) * 0.5)', padding: 'calc(var(--u) * 0.7) calc(var(--u) * 0.7) calc(var(--u) * 0.5)', background: '#2e1065', borderTop: '3px solid #281430' }}>
        {roster.map(r => {
          const on = selected === r.type;
          return (
            <button key={r.type} onClick={() => onSelect(on ? null : r.type)} className="relative flex shrink-0 items-center rounded-2xl border-[3px] border-[#281430] text-[#281430]" style={{ gap: 'calc(var(--u) * 0.45)', padding: 'calc(var(--u) * 0.3) calc(var(--u) * 0.7) calc(var(--u) * 0.3) calc(var(--u) * 0.3)', background: on ? 'linear-gradient(180deg,#fef08a,#f59e0b)' : 'linear-gradient(180deg,#f5f3ff,#ddd6fe)', transform: on ? 'translateY(-3px)' : undefined }}>
              <span className="relative shrink-0 overflow-hidden rounded-xl border-2 border-[#281430]" style={{ width: 'calc(var(--u) * 3.6)', height: 'calc(var(--u) * 3.6)', background: `radial-gradient(circle at 50% 60%, ${r.bg[0]}, ${r.bg[1]})` }}>
                {enemyPortraits[r.type] ? <img src={enemyPortraits[r.type]} alt={r.name} draggable={false} className="absolute inset-0 h-full w-full object-contain" /> : <span className="absolute inset-0 flex items-center justify-center" style={fs(1.8)}>{r.icon}</span>}
                {r.isNew && <span className="absolute left-0 top-0 rounded-br-md bg-yellow-300 px-1 font-display leading-none text-[#281430]" style={fs(0.6)}>BARU</span>}
              </span>
              <span className="flex flex-col items-start leading-none">
                <span className="whitespace-nowrap font-bold" style={fs(0.95)}>{r.name}</span>
                <span className="font-display text-violet-800" style={{ ...fs(1.3), marginTop: 'calc(var(--u) * 0.15)' }}>×{r.count}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
