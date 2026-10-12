import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { TOWER_DEFS } from '../game/engine';
import type { Game, GameState, TowerType } from '../game/engine';
import { ENEMY_INFO } from '../game/roster';
import { loadMenuArt } from '../game/menuArt';
import type { MenuArt } from '../game/menuArt';
import { NICK, Portrait } from './shared';

interface MainMenuProps {
  s: GameState;
  g: Game;
  portraits: Partial<Record<TowerType, string>>;
  enemyPortraits: Record<string, string>;
}

type ModalId = 'none' | 'scores' | 'encyclopedia' | 'audio';

/** the hero keeps the player company while they decide */
const TIPS = [
  'Siap tempur, Komandan! Kristal kerajaan dalam bahaya!',
  'Bawa minimal satu tower UDARA+ — naga suka menyerang dari langit!',
  'Tower Api dan Meriam paling enak ditumpuk di tikungan jalan.',
  'Naikkan tower ke Lv3: banyak yang membuka serangan area.',
  'Banner menambah +25% damage tower di sekitarnya. Jangan lupa!',
];

/** TOWER_DEFS stores colours as numbers – CSS wants a string */
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

const menuText = (size: string, stroke = '#0b1220', shadow = '#05080f'): CSSProperties => ({
  WebkitTextStroke: stroke, paintOrder: 'stroke fill', fontSize: size, lineHeight: 0.92,
  textShadow: `0 4px 0 ${shadow}, 0 9px 16px rgba(0,0,0,0.55)`,
});

/**
 * THE MAIN MENU
 * Full-bleed hero render of the island (made from the game's own 3D models – see game/menuArt.ts) with the
 * game's mascots floating on top, the stone TOWERMASTER plate, four chunky battle buttons and the panels
 * (high scores / tower & orc encyclopedia / audio).
 */
export default function MainMenu({ s, g, portraits, enemyPortraits }: MainMenuProps) {
  const [modal, setModal] = useState<ModalId>('none');
  const [encTab, setEncTab] = useState<'towers' | 'orcs'>('towers');
  const [search, setSearch] = useState('');
  const [art, setArt] = useState<MenuArt | null>(null);
  const [tip, setTip] = useState(0);

  // the artwork is rendered from the real 3D models – lazily, so the menu appears instantly (see menuArt.ts)
  useEffect(() => {
    let on = true;
    loadMenuArt().then(a => { if (on) setArt(a); });
    return () => { on = false; };
  }, []);
  useEffect(() => { const t = window.setInterval(() => setTip(i => (i + 1) % TIPS.length), 6500); return () => window.clearInterval(t); }, []);

  const towerKeys = useMemo(() => Object.keys(TOWER_DEFS) as TowerType[], []);
  const enemyKeys = useMemo(() => Object.keys(ENEMY_INFO), []);
  const q = search.trim().toLowerCase();
  const filteredTowers = towerKeys.filter(t => !q || TOWER_DEFS[t].name.toLowerCase().includes(q) || (NICK[t] || '').toLowerCase().includes(q) || TOWER_DEFS[t].tag.toLowerCase().includes(q));
  const filteredEnemies = enemyKeys.filter(k => !q || k.toLowerCase().includes(q) || ENEMY_INFO[k].note.toLowerCase().includes(q));

  const play = () => { g.sfx.resume(); g.sfx.click(); };
  const open = (m: ModalId) => { play(); setModal(m); };
  const toggleFullscreen = () => {
    play();
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => { /* blocked on some browsers */ });
    else document.exitFullscreen?.().catch(() => { /* ignore */ });
  };

  return (
    <div className="absolute inset-0 z-20 overflow-hidden select-none">
      {/* ================= background: the island hero shot (real 3D render) ================= */}
      <div className="absolute inset-0">
        {art?.backdrop
          ? <img src={art.backdrop} alt="" draggable={false} className="menu-bg" />
          : <div className="absolute inset-0 bg-gradient-to-b from-[#5fbcff] via-[#9fd8ff] to-[#dff2d2]" />}

        {/* fallback clouds while the render is being prepared */}
        {!art?.backdrop && <>
          <div className="absolute top-10 left-10 cloud-drift-slow opacity-90"><Cloud size="w-40 h-16" /></div>
          <div className="absolute top-24 right-16 cloud-drift-fast opacity-90"><Cloud size="w-52 h-20" /></div>
          <div className="absolute bottom-40 left-1/3 cloud-drift-slow opacity-70"><Cloud size="w-32 h-12" /></div>
        </>}

        {/* airborne mascots rendered from the game's models */}
        {art?.airship && (
          <img src={art.airship} alt="" draggable={false}
            className="menu-float absolute left-[2%] top-[11%] w-[11vmin] min-w-[64px] max-w-[160px] opacity-95 drop-shadow-[0_10px_10px_rgba(0,0,0,0.25)] sm:left-[4%]"
            style={{ animationDuration: '6.4s' }} />
        )}
        {art?.dragon && (
          <img src={art.dragon} alt="" draggable={false}
            className="menu-float absolute right-[3%] top-[19%] hidden w-[11vmin] min-w-[62px] max-w-[150px] opacity-95 drop-shadow-[0_10px_10px_rgba(0,0,0,0.25)] sm:block"
            style={{ animationDuration: '5.2s', animationDelay: '-1.6s', transform: 'scaleX(-1) scale(0.98)' }} />
        )}

        <div className="menu-vignette" />
      </div>

      {/* ================= top bar ================= */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-2 sm:p-4 pointer-events-none">
        {/* player chip */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border-[3px] border-[#17202e] bg-gradient-to-b from-[#fdf3dc] to-[#f0d29a] px-2 py-1.5 sm:px-3 sm:py-2 shadow-[0_5px_0_#0d1420]">
          <div className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-xl border-[3px] border-[#17202e] bg-gradient-to-b from-emerald-400 to-emerald-700 shadow-inner">
            <Icon name="tower" className="h-5 w-5 text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.5)] sm:h-6 sm:w-6" />
          </div>
          <div className="leading-tight">
            <div className="hidden font-display text-sm text-[#17202e] sm:block">KOMANDAN VOXEL</div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-black text-amber-700 sm:text-xs">
              <Icon name="trophy" className="h-3 w-3" /> Rekor: {s.best > 0 ? `${s.best}` : '—'}
            </div>
          </div>
        </div>

        {/* gold + settings */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-2xl border-[3px] border-[#17202e] bg-gradient-to-b from-[#ffe9a8] to-[#f0b429] px-2.5 py-1.5 shadow-[0_5px_0_#0d1420]">
            <Icon name="coin" className="h-4 w-4 text-amber-500 drop-shadow sm:h-6 sm:w-6" />
            <span className="font-display text-sm sm:text-xl text-[#3b1d00]">{s.gold >= 1000 ? `${(s.gold / 1000).toFixed(1)}k` : s.gold}</span>
          </div>
          <button onClick={() => open('audio')} title="Audio & Info"
            className="grid h-9 w-9 place-items-center rounded-full border-[3px] border-[#17202e] bg-gradient-to-b from-[#7dd3fc] to-[#0369a1] text-white shadow-[0_5px_0_#0d1420] transition-transform active:translate-y-1 sm:h-11 sm:w-11">
            <Icon name="gear" className="h-4 w-4 drop-shadow-[0_1px_0_rgba(0,0,0,0.45)] sm:h-6 sm:w-6" /></button>
        </div>
      </div>

      {/* ================= logo ================= */}
      <div className="pointer-events-none absolute inset-x-0 top-[12%] z-30 flex flex-col items-center px-4 sm:top-[5%]">
        <div className="relative menu-plate px-4 py-2 text-center sm:px-10 sm:py-4">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 sm:-top-8">
            <Icon name="crown" className="h-7 w-7 text-amber-300 drop-shadow-[0_3px_0_rgba(0,0,0,0.5)] sm:h-10 sm:w-10" />
          </div>
          <div className="pointer-events-none absolute inset-0">
            {([[7, 12, '0s'], [93, 18, '1.4s'], [11, 80, '2.2s'], [89, 74, '0.8s'], [50, 4, '1.9s']] as const).map(([l, t, d], i) => (
              <span key={i} className="menu-spark absolute block h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_9px_rgba(252,211,77,0.95)] sm:h-2 sm:w-2"
                style={{ left: `${l}%`, top: `${t}%`, animationDelay: d }} />
            ))}
          </div>
          <div className="font-display uppercase tracking-tight"
            style={{
              ...menuText('clamp(30px, 6.2vmin, 62px)', '3px #071529'),
              background: 'linear-gradient(180deg,#ffffff 6%,#b7e6ff 34%,#4aa8e8 66%,#0b5b9c 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>TOWER</div>
          <div className="font-display uppercase tracking-[0.05em] -mt-1"
            style={{
              ...menuText('clamp(38px, 8.4vmin, 86px)', '3.5px #2b0505'),
              background: 'linear-gradient(180deg,#fffbeb 4%,#ffd166 26%,#f97316 62%,#c2410c 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>MASTER</div>
          <div className="mx-auto mt-1 inline-block rounded-full border-[3px] border-[#17202e] bg-gradient-to-b from-[#a3703f] to-[#6b4423] px-3 py-0.5 sm:px-4 sm:py-1 shadow-[inset_0_2px_0_rgba(255,255,255,0.35)]">
            <span className="font-display text-[10px] sm:text-sm text-amber-100" style={{ textShadow: '0 2px 0 #2a1708' }}>Epic 3D Voxel Tower Defense</span>
          </div>
        </div>
      </div>

      {/* ================= centre: the four battle buttons ================= */}
      <div className="absolute inset-x-0 top-[54%] z-30 -translate-y-1/2 px-3 sm:top-1/2 sm:px-6">
        <div className="mx-auto flex w-full max-w-[min(92vw,520px)] flex-col gap-2.5 sm:gap-3.5">
          <MenuButton icon="swords" label="QUICK BATTLE" sub="Mulai Pertempuran Voxel" from="#ffe066" via="#fbbf24" to="#f97316" shadow="#9a3412" pulse
            onClick={() => { play(); g.startGame(); }} />
          <MenuButton icon="trophy" label="HIGH SCORES" sub={s.best > 0 ? `Rekor terbaik: ${s.best} poin` : 'Belum ada rekor — ayo main!'} from="#a5e8ff" via="#4aa8e8" to="#1d4ed8" shadow="#1e3a8a"
            onClick={() => open('scores')} />
          <MenuButton icon="tower" label="TOWERS & ORCS" sub={`${towerKeys.length} tower · ${enemyKeys.length} jenis orc`} from="#bbf7d0" via="#4ade80" to="#15803d" shadow="#14532d"
            onClick={() => open('encyclopedia')} />
          <MenuButton icon="note" label="AUDIO & INFO" sub={`Musik ${s.musicOn ? 'ON' : 'OFF'} · Efek ${s.muted ? 'MUTE' : 'ON'}`} from="#e9d5ff" via="#a855f7" to="#6d28d9" shadow="#3b0764"
            onClick={() => open('audio')} />
        </div>
      </div>

      {/* ================= hero mascot + speech bubble (left) ================= */}
      <div className="pointer-events-none absolute bottom-[13%] left-2 z-30 hidden items-end gap-1 md:flex lg:left-8">
        {art?.hero && <img src={art.hero} alt="" draggable={false}
          className="menu-hero w-[20vmin] min-w-[130px] max-w-[280px] drop-shadow-[0_16px_14px_rgba(0,0,0,0.3)]" />}
        <div className="relative mb-[16%] max-w-[220px] rounded-2xl border-[3px] border-[#17202e] bg-white/95 px-3 py-2 shadow-[0_5px_0_#17202e]">
          <p key={tip} className="pop-in font-display leading-snug" style={{ color: '#17202e', fontSize: 'clamp(11px, 1.05vw, 15px)' }}>{TIPS[tip]}</p>
          <div className="absolute -bottom-2.5 left-6 h-0 w-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[11px] border-t-[#17202e]" />
          <div className="absolute -bottom-1.5 left-6 h-0 w-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[9px] border-t-white" />
        </div>
      </div>

      {/* the enemy champion keeps watch on the right */}
      {art?.brute && (
        <img src={art.brute} alt="" draggable={false}
          className="menu-float pointer-events-none absolute bottom-[12%] right-1 z-30 hidden w-[17vmin] min-w-[110px] max-w-[240px] drop-shadow-[0_16px_14px_rgba(0,0,0,0.3)] lg:block" />
      )}

      {/* ================= footer ================= */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 p-2 sm:p-4">
        <div className="pointer-events-none flex items-center gap-2 rounded-2xl border-[3px] border-[#17202e] bg-gradient-to-b from-[#8a6b3d] to-[#5b4325] px-2.5 py-1.5 shadow-[0_5px_0_#0d1420]">
          <span className="grid h-7 w-7 place-items-center rounded-lg border-2 border-amber-200/70 bg-amber-400 text-[13px] shadow-inner">TM</span>
          <div className="leading-tight">
            <div className="font-display text-[10px] text-yellow-200 sm:text-xs">TOWERMASTER STUDIOS</div>
            <div className="text-[9px] font-bold text-amber-100/80 sm:text-[10px]">VOXEL DEFENSE · v1.0 · 2026</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <RoundBtn label="Musik" onClick={() => { play(); g.toggleMusic(); }}><Icon name={s.musicOn ? 'note' : 'mute'} className="h-4 w-4 sm:h-5 sm:w-5" /></RoundBtn>
          <RoundBtn label="Efek suara" onClick={() => { play(); g.toggleMute(); }}><Icon name={s.muted ? 'mute' : 'sound'} className="h-4 w-4 sm:h-5 sm:w-5" /></RoundBtn>
          <RoundBtn label="Layar penuh" onClick={toggleFullscreen}><Icon name="expand" className="h-4 w-4 sm:h-5 sm:w-5" /></RoundBtn>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      {modal !== 'none' && <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-sm" onClick={() => setModal('none')}>
        <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#17202e] bg-gradient-to-b from-[#2a173b] to-[#120a1c] shadow-2xl pop-in"
          onClick={e => e.stopPropagation()}>

          {/* header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-[#17202e] bg-gradient-to-r from-purple-800 to-indigo-900 px-3 py-2.5 sm:px-6 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <Icon name={modal === 'scores' ? 'trophy' : modal === 'audio' ? 'note' : 'tower'} className="h-6 w-6 shrink-0 text-yellow-300 sm:h-8 sm:w-8" />
              <h3 className="truncate font-display text-lg text-yellow-300 text-outline-sm sm:text-2xl">
                {modal === 'scores' ? 'SKOR TERTINGGI' : modal === 'audio' ? 'SUARA & INFORMASI' : 'ENSIKLOPEDIA TOWERMASTER'}
              </h3>
            </div>
            <button onClick={() => { play(); setModal('none'); }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-[3px] border-[#17202e] bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-[0_4px_0_#4c0519] active:translate-y-0.5">
              <Icon name="close" className="h-4 w-4" /></button>
          </div>

          {/* ---------------- scores ---------------- */}
          {modal === 'scores' && (
            <div className="overflow-y-auto p-4 text-center sm:p-8 no-scrollbar">
              <div className="wiggle inline-block"><Icon name="trophy" className="h-14 w-14 text-yellow-300 drop-shadow-[0_4px_0_rgba(0,0,0,0.4)]" /></div>
              <p className="mt-1 text-xs font-semibold text-purple-200">Pencapaian terbaik pertahanan kristalmu</p>
              <div className="mx-auto mt-4 max-w-sm rounded-2xl border-2 border-amber-400/40 bg-black/30 p-4">
                <div className="text-[11px] font-bold uppercase text-amber-300">Skor Terbaik</div>
                <div className="font-display text-4xl text-white text-outline">{s.best > 0 ? `${s.best}` : '0'}</div>
              </div>
              <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Stat label="Tower" value={`${towerKeys.length}`} />
                <Stat label="Jenis Orc" value={`${enemyKeys.length}`} />
                <Stat label="Slot" value={`${s.slots}`} />
                <Stat label="Level" value={`${s.level}`} />
              </div>
            </div>
          )}

          {/* ---------------- encyclopedia ---------------- */}
          {modal === 'encyclopedia' && <>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-purple-950/60 bg-[#1e0f2b] px-3 py-2.5 sm:px-6">
              <div className="flex gap-2">
                {([['towers', `${towerKeys.length} TOWER`], ['orcs', `${enemyKeys.length} ORC`]] as const).map(([id, label]) => (
                  <button key={id} onClick={() => { play(); setEncTab(id); }}
                    className={`rounded-full border-2 px-3 py-1 font-display text-xs transition-all sm:text-sm ${encTab === id ? 'border-[#17202e] bg-amber-400 text-[#17202e] shadow' : 'border-purple-800 bg-purple-900/60 text-purple-200 hover:bg-purple-800'}`}>{label}</button>
                ))}
              </div>
              <div className="relative w-full sm:w-56">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / tipe..."
                  className="w-full rounded-full border-2 border-purple-700 bg-purple-950/80 px-3.5 py-1 text-xs text-white placeholder-purple-300/60 focus:border-amber-400 focus:outline-none" />
                {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1.5 text-purple-200"><Icon name="close" className="h-3.5 w-3.5" /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 no-scrollbar">
              {encTab === 'towers' ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                  {filteredTowers.map(t => {
                    const d = TOWER_DEFS[t];
                    return (
                      <div key={t} className="flex flex-col rounded-2xl border-2 p-2 shadow"
                        style={{ borderColor: '#17202e', borderTop: `5px solid ${hex(d.accent)}`, background: 'linear-gradient(180deg,#ffffff 0%,#eef3f9 100%)' }}>
                        <div className="mx-auto w-full"><Portrait type={t} src={portraits[t]} h="calc(58px + 3vmin)" /></div>
                        <div className="mt-1.5 font-display text-sm leading-tight text-[#17202e] sm:text-base">{d.name} <span className="text-[11px] opacity-70">“{NICK[t]}”</span></div>
                        <div className="mt-0.5 text-[10px] font-bold leading-tight text-[#17202e]/80 sm:text-[11px]">{d.desc}</div>
                        <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-1.5 text-[10px] font-black text-[#17202e] sm:text-[11px]">
                          <span className="flex items-center gap-0.5"><Icon name="coin" className="h-3 w-3 text-amber-500" />{d.cost}</span>
                          <span className="flex items-center gap-0.5"><Icon name="swords" className="h-3 w-3 text-rose-500" />{d.dmg}</span>
                          <span className="flex items-center gap-0.5"><Icon name="expand" className="h-3 w-3 text-sky-600" />{d.range}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                  {filteredEnemies.map(k => {
                    const e = ENEMY_INFO[k];
                    return (
                      <div key={k} className="flex items-center gap-3 rounded-2xl border-2 p-2.5 shadow"
                        style={{ borderColor: '#17202e', borderLeft: `6px solid ${e.bg[1]}`, background: 'linear-gradient(180deg,#ffffff 0%,#f1f5f9 100%)' }}>
                        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-[#17202e]" style={{ background: `linear-gradient(180deg, ${e.bg[0]} 0%, #ffffff 100%)` }}>
                          {enemyPortraits[k] ? <img src={enemyPortraits[k]} alt={k} className="h-full w-full object-contain" /> : <span className="text-2xl">{e.icon}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-display text-sm capitalize leading-tight text-[#17202e]">{k}</div>
                          <div className="mt-0.5 text-[10px] font-bold leading-snug text-[#17202e]/85 sm:text-[11px]">{e.note}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>}

          {/* ---------------- audio / info ---------------- */}
          {modal === 'audio' && (
            <div className="overflow-y-auto p-4 no-scrollbar sm:p-6">
              <div className="mx-auto flex max-w-md flex-col gap-3">
                <ToggleRow title="Musik Latar" hint="5 biome adaptif" on={s.musicOn} onLabel="AKTIF" offLabel="MATI" onClick={() => { play(); g.toggleMusic(); }} />
                <ToggleRow title="Efek Suara" hint="Tembakan, ledakan & sorakan" on={!s.muted} onLabel="AKTIF" offLabel="BISU" onClick={() => { play(); g.toggleMute(); }} />
                <div className="rounded-2xl border-2 border-purple-700 bg-purple-900/40 p-3 text-xs font-semibold leading-relaxed text-purple-100">
                  <b>Cara main:</b> pilih tower inti → ketuk rumput untuk memasang → upgrade tower yang paling sibuk.
                  Orc datang dari kiri menuju kristal kerajaan; jangan sampai kristalnya pecah!
                </div>
                <div className="rounded-2xl border-2 border-purple-700 bg-purple-900/40 p-3 text-xs font-semibold leading-relaxed text-purple-100">
                  <b>Tips:</b> kombinasikan tower pelambat (Es, Jam, Beku V2) dengan tower damage besar untuk hasil maksimal.
                </div>
              </div>
            </div>
          )}

          <div className="shrink-0 border-t-2 border-[#17202e] bg-purple-950/80 px-3 py-2 text-center text-[10px] font-bold text-purple-200 sm:text-xs">
            TOWERMASTER STUDIOS · Voxel Defense 2026
          </div>
        </div>
      </div>}
    </div>
  );
}

/** one of the four chunky battle buttons */
function MenuButton({ icon, label, sub, from, via, to, shadow, onClick, pulse }: {
  icon: IconName; label: string; sub: string; from: string; via: string; to: string; shadow: string; onClick: () => void; pulse?: boolean;
}) {
  return (
    <button onClick={onClick} className={`menu-btn group py-1.5 pl-1.5 pr-3 sm:py-2 sm:pl-2 sm:pr-4 ${pulse ? 'menu-pulse' : ''}`}
      style={{
        ['--sh' as string]: shadow,
        background: `linear-gradient(180deg, ${from} 0%, ${via} 46%, ${to} 100%)`,
      }}>
      <span className="menu-medal h-11 w-11 transition-transform group-hover:scale-105 sm:h-14 sm:w-14">
        <Icon name={icon} className="h-5 w-5 text-white drop-shadow-[0_2px_0_rgba(90,50,0,0.55)] sm:h-7 sm:w-7" />
      </span>
      <span className="ml-2.5 sm:ml-4 min-w-0 flex-1 text-left">
        <span className="block font-display uppercase leading-none tracking-wide text-white sm:text-3xl"
          style={{ fontSize: 'clamp(17px, 3.4vmin, 30px)', WebkitTextStroke: '2px #17202e', paintOrder: 'stroke fill', textShadow: '0 3px 0 rgba(11,18,32,0.85)' }}>{label}</span>
        <span className="mt-0.5 block truncate text-[10px] font-bold text-white/95 sm:text-sm" style={{ textShadow: '0 2px 0 rgba(11,18,32,0.55)' }}>{sub}</span>
      </span>
      <Icon name="arrow" className="ml-1 h-4 w-4 shrink-0 text-white/95 drop-shadow-[0_2px_0_rgba(11,18,32,0.7)] sm:h-6 sm:w-6" />
    </button>
  );
}

/** round icon button used in the footer */
function RoundBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full border-[3px] border-[#17202e] bg-gradient-to-b from-slate-700 to-slate-900 text-base text-white shadow-[0_5px_0_#0d1420] transition-transform active:translate-y-1 sm:h-12 sm:w-12 sm:text-xl">
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-purple-700 bg-purple-900/50 p-2.5 text-left">
      <div className="text-[10px] font-bold uppercase leading-tight text-purple-300">{label}</div>
      <div className="font-display text-lg text-yellow-300">{value}</div>
    </div>
  );
}

function ToggleRow({ title, hint, on, onLabel, offLabel, onClick }: { title: string; hint: string; on: boolean; onLabel: string; offLabel: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-purple-700 bg-purple-900/40 p-3">
      <div className="min-w-0 text-left">
        <div className="whitespace-nowrap font-display text-sm text-white">{title}</div>
        <div className="text-[10px] font-semibold text-purple-300">{hint}</div>
      </div>
      <button onClick={onClick}
        className="menu-btn shrink-0 px-4 py-1.5 text-xs font-black text-white"
        style={{ width: 'auto', ['--sh' as string]: on ? '#065f46' : '#334155', background: on ? 'linear-gradient(180deg,#6ee7b7,#059669)' : 'linear-gradient(180deg,#cbd5e1,#64748b)' }}>
        {on ? onLabel : offLabel}
      </button>
    </div>
  );
}


/* ================= inline SVG icons (emoji fonts aren't guaranteed everywhere) ================= */
type IconName = 'swords' | 'trophy' | 'tower' | 'note' | 'gear' | 'coin' | 'sound' | 'mute' | 'expand' | 'close' | 'crown' | 'arrow' | 'book';

function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const wrap = (children: React.ReactNode) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">{children}</svg>
  );
  switch (name) {
    case 'swords':
      return wrap(<>
        <rect x="11.1" y="1.6" width="2.5" height="16" rx="1.25" transform="rotate(45 12 12)" />
        <rect x="10.4" y="1.6" width="2.5" height="16" rx="1.25" transform="rotate(-45 12 12)" />
        <rect x="4.2" y="15.6" width="7" height="2.4" rx="1.2" transform="rotate(45 12 12)" />
        <rect x="12.8" y="15.6" width="7" height="2.4" rx="1.2" transform="rotate(-45 12 12)" />
        <circle cx="19.4" cy="19.4" r="1.7" />
      </>);
    case 'trophy':
      return wrap(<>
        <path d="M6.2 3.6h11.6v4.9a5.8 5.8 0 0 1-11.6 0V3.6z" />
        <rect x="10.7" y="13.4" width="2.6" height="4.4" rx="0.9" />
        <rect x="7.6" y="17.6" width="8.8" height="2.6" rx="1.3" />
        <path d="M6.2 5.2H3.6a3.3 3.3 0 0 0 3.3 3.3zM17.8 5.2h2.6a3.3 3.3 0 0 1-3.3 3.3z" opacity=".85" />
      </>);
    case 'tower':
      return wrap(<>
        <path d="M7.4 21V10.4h9.2V21H7.4z" />
        <path d="M6 10.6 12 2.4l6 8.2H6z" />
        <rect x="10.6" y="15" width="2.8" height="6" rx="1.2" fill="#00000055" />
      </>);
    case 'note':
      return wrap(<>
        <circle cx="6.6" cy="18.2" r="3.2" />
        <rect x="8.7" y="3.4" width="2" height="14.8" rx="0.9" />
        <path d="M10.7 3.4c3.9.5 6.9 1.9 6.9 5 0 1.6-.7 2.7-1.8 3.4.6-2.9-.9-4.7-5.1-5.8z" />
      </>);
    case 'gear':
      return wrap(<>
        <rect x="3" y="5.4" width="18" height="2.2" rx="1.1" />
        <rect x="3" y="11" width="18" height="2.2" rx="1.1" />
        <rect x="3" y="16.6" width="18" height="2.2" rx="1.1" />
        <circle cx="15.8" cy="6.5" r="2.6" />
        <circle cx="9.2" cy="12.1" r="2.6" />
        <circle cx="16.4" cy="17.7" r="2.6" />
      </>);
    case 'coin':
      return wrap(<>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="6.1" fill="none" stroke="#7c2d12" strokeWidth="1.4" opacity=".55" />
        <path d="M12 7.4l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill="#7c2d12" opacity=".7" />
      </>);
    case 'sound':
      return wrap(<>
        <path d="M3.4 9.2h3.4L11.4 5v14L6.8 14.8H3.4V9.2z" />
        <path d="M14.4 8.6a4.6 4.6 0 0 1 0 6.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M17.2 6a8.2 8.2 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>);
    case 'mute':
      return wrap(<>
        <path d="M3.4 9.2h3.4L11.4 5v14L6.8 14.8H3.4V9.2z" />
        <path d="M15 9.4l5 5.2M20 9.4l-5 5.2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </>);
    case 'expand':
      return wrap(<path d="M4 9V4h5v2.2H6.2V9H4zm16 0h-2.2V6.2H15V4h5v5zM9 20H4v-5h2.2v2.8H9V20zm6 0v-2.2h2.8V15H20v5h-5z" />);
    case 'close':
      return wrap(<path d="M5.6 4.2l14.2 14.2-1.4 1.4L4.2 5.6z M18.4 4.2l1.4 1.4L5.6 19.8 4.2 18.4z" />);
    case 'crown':
      return wrap(<path d="M3 18.4 2.2 7.2l5 3.2L12 3.4l4.8 7 5-3.2-1 11.2H3z" />);
    case 'book':
      return wrap(<>
        <path d="M4 4.4h6.2c1 0 1.8.8 1.8 1.8v13c0-.9-.8-1.6-1.8-1.6H4V4.4z" />
        <path d="M20 4.4h-6.2c-1 0-1.8.8-1.8 1.8v13c0-.9.8-1.6 1.8-1.6H20V4.4z" opacity=".85" />
      </>);
    case 'arrow':
      return wrap(<path d="M8.4 3.6 18 12l-9.6 8.4-1.7-2L13.9 12 6.7 5.6z" />);
  }
}

/** soft cartoon cloud used as the placeholder while the hero render is prepared */
function Cloud({ size }: { size: string }) {
  return (
    <div className={`relative ${size}`}>
      <div className="absolute inset-0 rounded-full bg-white opacity-90 shadow-sm" />
      <div className="absolute -top-3 left-4 h-12 w-12 rounded-full bg-white opacity-90" />
      <div className="absolute -top-5 left-10 h-16 w-16 rounded-full bg-white opacity-90" />
    </div>
  );
}
