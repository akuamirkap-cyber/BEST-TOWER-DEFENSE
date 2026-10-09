import { TOWER_DEFS } from '../game/engine';
import type { TowerType } from '../game/engine';
import { CARD_INFO, levelRows } from './cards';
import { NICK, Portrait, Tag, fs } from './shared';
import { useDragScroll } from './useDragScroll';

interface Props { type: TowerType; src?: string; chosen: boolean; full: boolean; onToggle: () => void; onClose: () => void }

const BAR_COL = ['#fb923c', '#38bdf8', '#a3e635'];

/** the popup you get when you tap a card: what it does, how strong it is, who it is good / bad against, and the numbers of every level */
export default function CardInfo({ type, src, chosen, full, onToggle, onClose }: Props) {
  const d = TOWER_DEFS[type]; const info = CARD_INFO[type]; const rows = levelRows(type);
  const blocked = !chosen && full;
  const bodyRef = useDragScroll('y'); // the popup text can also be dragged up/down
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center sm:items-center" style={{ background: 'rgba(20,8,40,0.78)', padding: 'calc(var(--u) * 0.6)' }} onClick={onClose}>
      <div className="panel-pop relative flex max-h-full flex-col overflow-hidden" style={{ width: 'min(calc(var(--u) * 54), 100%)', background: 'linear-gradient(180deg,#fff7ed,#fed7aa)' }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="flex shrink-0 items-center" style={{ gap: 'calc(var(--u) * 0.9)', padding: 'calc(var(--u) * 0.8)', background: 'linear-gradient(180deg,#fde68a,#fbbf24)', borderBottom: '3px solid #281430' }}>
          <div className="shrink-0" style={{ width: 'calc(var(--u) * 8.5)' }}><Portrait type={type} src={src} h="calc(var(--u) * 8.5)" /></div>
          <div className="min-w-0 flex-1 text-[#281430]">
            <div className="font-display leading-none" style={fs(2.4)}>{d.name}</div>
            <div className="font-bold opacity-70" style={{ ...fs(1.05), marginTop: 'calc(var(--u) * 0.2)' }}>“{NICK[type]}” · {info.role}</div>
            <div className="flex flex-wrap items-center" style={{ gap: 'calc(var(--u) * 0.4)', marginTop: 'calc(var(--u) * 0.5)' }}>
              <Tag bg={d.air ? '#7dd3fc' : d.ground ? '#bef264' : '#f9a8d4'} fg={d.air ? '#082f49' : d.ground ? '#1a2e05' : '#500724'}>{d.air ? 'UDARA + DARAT' : d.ground ? 'HANYA DARAT' : 'SUPPORT'}</Tag>
              <span className="price-tag font-display" style={{ ...fs(1.3), background: 'linear-gradient(180deg,#fde68a,#f59e0b)', padding: 'calc(var(--u) * 0.1) calc(var(--u) * 0.7)', color: '#3b1d00' }}>🪙 {d.cost}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-candy shrink-0 text-[#281430]" style={{ width: 'calc(var(--u) * 2.6)', height: 'calc(var(--u) * 2.6)', ...fs(1.5), background: 'linear-gradient(180deg,#f1f5f9,#cbd5e1)', ['--shadow' as string]: '#281430' }}>✕</button>
        </div>

        {/* body */}
        <div ref={bodyRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto text-[#281430]" style={{ padding: 'calc(var(--u) * 0.9)' }}>
          {/* strength bars */}
          <div className="flex flex-col" style={{ gap: 'calc(var(--u) * 0.45)' }}>
            {info.bars.map((b, i) => (
              <div key={b.label} className="flex items-center" style={{ gap: 'calc(var(--u) * 0.7)' }}>
                <div className="font-display" style={{ ...fs(1.2), width: 'calc(var(--u) * 7.2)' }}>{b.label}</div>
                <div className="flex" style={{ gap: 'calc(var(--u) * 0.3)' }}>
                  {[1, 2, 3, 4, 5].map(n => <span key={n} className="rounded-md border-2 border-[#281430]" style={{ width: 'calc(var(--u) * 2.1)', height: 'calc(var(--u) * 1.3)', background: n <= b.v ? BAR_COL[i % 3] : 'rgba(40,20,60,0.12)' }} />)}
                </div>
              </div>
            ))}
          </div>

          {/* skills */}
          <div className="font-display" style={{ ...fs(1.5), marginTop: 'calc(var(--u) * 1)' }}>✨ Skill</div>
          <div className="flex flex-col" style={{ gap: 'calc(var(--u) * 0.5)', marginTop: 'calc(var(--u) * 0.4)' }}>
            {info.skills.map(s => (
              <div key={s.title} className="flex items-start rounded-2xl border-[3px] border-[#281430]" style={{ gap: 'calc(var(--u) * 0.7)', padding: 'calc(var(--u) * 0.6)', background: 'linear-gradient(180deg,#ffffff,#fff1dc)' }}>
                <div className="flex shrink-0 items-center justify-center rounded-xl border-2 border-[#281430] bg-amber-200" style={{ width: 'calc(var(--u) * 3)', height: 'calc(var(--u) * 3)', ...fs(1.8) }}>{s.icon}</div>
                <div className="min-w-0">
                  <div className="font-display leading-tight" style={fs(1.3)}>{s.title}</div>
                  <div className="font-semibold leading-snug opacity-80" style={{ ...fs(1.0), marginTop: 'calc(var(--u) * 0.15)' }}>{s.text}</div>
                </div>
              </div>
            ))}
          </div>

          {/* good / weak */}
          <div className="grid sm:grid-cols-2" style={{ gap: 'calc(var(--u) * 0.6)', marginTop: 'calc(var(--u) * 0.9)' }}>
            <div className="rounded-2xl border-[3px] border-[#281430]" style={{ padding: 'calc(var(--u) * 0.6)', background: 'linear-gradient(180deg,#dcfce7,#86efac)' }}>
              <div className="font-display" style={fs(1.2)}>👍 Bagus melawan</div>
              <div className="font-bold leading-snug" style={{ ...fs(1.0), marginTop: 'calc(var(--u) * 0.2)' }}>{info.good.join(' · ')}</div>
            </div>
            <div className="rounded-2xl border-[3px] border-[#281430]" style={{ padding: 'calc(var(--u) * 0.6)', background: 'linear-gradient(180deg,#fee2e2,#fca5a5)' }}>
              <div className="font-display" style={fs(1.2)}>👎 Lemah melawan</div>
              <div className="font-bold leading-snug" style={{ ...fs(1.0), marginTop: 'calc(var(--u) * 0.2)' }}>{info.weak.join(' · ')}</div>
            </div>
          </div>
          <div className="rounded-2xl border-[3px] border-dashed border-[#281430]/50 font-bold leading-snug" style={{ ...fs(1.0), marginTop: 'calc(var(--u) * 0.6)', padding: 'calc(var(--u) * 0.6)', background: 'rgba(255,255,255,0.6)' }}>💡 {info.tip}</div>

          {/* levels */}
          <div className="font-display" style={{ ...fs(1.5), marginTop: 'calc(var(--u) * 1)' }}>📈 Level</div>
          <div className="overflow-hidden rounded-2xl border-[3px] border-[#281430]" style={{ marginTop: 'calc(var(--u) * 0.4)', background: '#fffaf0' }}>
            <div className="grid grid-cols-[1.35fr_1fr_1fr_1fr] bg-[#281430] font-display text-yellow-200" style={{ ...fs(1.0), padding: 'calc(var(--u) * 0.45) calc(var(--u) * 0.6)' }}>
              <div /><div className="text-center">Lv 1 ★</div><div className="text-center">Lv 2 ★★</div><div className="text-center">Lv 3 ★★★</div>
            </div>
            {rows.map((r, i) => (
              <div key={r.label} className="grid grid-cols-[1.35fr_1fr_1fr_1fr] items-center" style={{ ...fs(0.98), padding: 'calc(var(--u) * 0.45) calc(var(--u) * 0.6)', background: i % 2 ? 'rgba(251,191,36,0.14)' : 'transparent', borderTop: i ? '2px solid rgba(40,20,60,0.12)' : undefined }}>
                <div className="font-bold leading-tight opacity-80">{r.label}</div>
                {r.vals.map((v, k) => <div key={k} className="text-center font-display leading-tight">{v}</div>)}
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="flex shrink-0 items-center" style={{ gap: 'calc(var(--u) * 0.7)', padding: 'calc(var(--u) * 0.8)', background: 'linear-gradient(180deg,#fed7aa,#fdba74)', borderTop: '3px solid #281430' }}>
          <button onClick={onClose} className="btn-candy text-[#281430]" style={{ ...fs(1.3), padding: 'calc(var(--u) * 0.6) calc(var(--u) * 1.3)', background: 'linear-gradient(180deg,#f1f5f9,#cbd5e1)', ['--shadow' as string]: '#281430' }}>TUTUP</button>
          <button onClick={onToggle} disabled={blocked} className="btn-candy flex-1 text-white" style={{ ...fs(1.7), padding: 'calc(var(--u) * 0.6) calc(var(--u) * 0.8)', background: chosen ? 'linear-gradient(180deg,#fda4af,#e11d48)' : 'linear-gradient(180deg,#86efac,#16a34a)', ['--shadow' as string]: chosen ? '#881337' : '#14532d' }}>
            {chosen ? '✖ LEPAS' : blocked ? '🔒 SLOT PENUH' : '✔ BAWA TOWER INI'}
          </button>
        </div>
      </div>
    </div>
  );
}
