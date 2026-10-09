import { useEffect, useRef, useState } from 'react';
import { Game, GameState, FloatText, TOWER_DEFS, TowerType, TOWER_HP } from './game/engine';

import { NICK, Portrait, TOWER_BG, TOWER_COL, TowerCard } from './ui/shared';
import Loadout from './ui/Loadout';
import { useDragScroll } from './ui/useDragScroll';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [s, setS] = useState<GameState | null>(null);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [portraits, setPortraits] = useState<Partial<Record<TowerType, string>>>({});
  const [enemyPortraits, setEnemyPortraits] = useState<Record<string, string>>({});
  const trayRef = useDragScroll('x'); // the tower tray in the game: drag sideways when there are more cards than fit

  useEffect(() => {
    if (!canvasRef.current) return;
    const g = new Game(canvasRef.current, setS, f => {
      setFloats(prev => [...prev.slice(-20), f]);
      setTimeout(() => setFloats(prev => prev.filter(x => x.id !== f.id)), 1100);
    });
    gameRef.current = g;
    setPortraits(g.makePortraits());
    const tm = window.setTimeout(() => setEnemyPortraits(g.makeEnemyPortraits()), 60);
    return () => { window.clearTimeout(tm); g.destroy(); };
  }, []);

  const g = gameRef.current;

  return (
    <div className="fixed inset-0 overflow-hidden bg-sky-300 select-none" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="block w-full h-full" />

      {floats.map(f => (
        <div key={f.id} className="absolute pointer-events-none font-display text-xl text-outline-sm float-up" style={{ left: f.x, top: f.y, color: f.color, transform: 'translate(-50%,-50%)' }}>{f.text}</div>
      ))}

      {s && s.screen !== 'menu' && s.screen !== 'select' && (
        <>
          {/* Top HUD */}
          <div className="absolute top-0 left-0 right-0 p-2 sm:p-3 flex items-start justify-between gap-2 pointer-events-none">
            <div className="flex flex-col gap-1.5">
              <Pill bg="linear-gradient(180deg,#c084fc,#7c3aed)"><span className="text-xs text-white/90">LEVEL</span><b className="font-display text-xl text-white text-outline-sm">{s.level}</b></Pill>
              <Pill bg="linear-gradient(180deg,#60a5fa,#2563eb)"><span className="text-xs text-white/90">WAVE</span><b className="font-display text-xl text-white text-outline-sm">{s.wave}<span className="text-sm text-white/80">/{s.wavesPerLevel}</span></b></Pill>
              <button onClick={() => g?.cycleSpeed()} className="pointer-events-auto btn-candy px-3 py-1 text-white text-base" style={{ background: s.speed === 1 ? 'linear-gradient(180deg,#94a3b8,#475569)' : s.speed === 2 ? 'linear-gradient(180deg,#38bdf8,#0284c7)' : 'linear-gradient(180deg,#f472b6,#db2777)', ['--shadow' as string]: '#281430' }}>
                ⏩ {s.speed}×
              </button>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              {!s.waveActive && s.screen === 'playing' && (
                <>
                  <button onClick={() => g?.callWave()} className="pointer-events-auto btn-candy wiggle px-5 py-2 text-white text-lg sm:text-xl" style={{ background: 'linear-gradient(180deg,#86efac,#16a34a)', ['--shadow' as string]: '#14532d' }}>
                    ▶ {s.wave === 0 ? 'MULAI!' : 'WAVE BERIKUTNYA'} <span className="text-yellow-200 text-sm">({Math.ceil(s.countdown)}s{s.wave > 0 ? ` +${Math.floor(s.countdown * 2)}💰` : ''})</span>
                  </button>
                  {s.nextWaveInfo && <Pill bg="linear-gradient(180deg,#fef3c7,#fde68a)"><span className="text-[10px] text-amber-900 font-bold">BERIKUTNYA</span><span className="text-amber-950 text-sm tracking-wide font-bold">{s.nextWaveInfo}</span></Pill>}
                </>
              )}
              {s.waveActive && <Pill bg="linear-gradient(180deg,#fda4af,#e11d48)"><span className="text-xs text-white/90">MUSUH</span><b className="font-display text-xl text-white text-outline-sm">{s.enemiesLeft}</b></Pill>}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Pill bg="linear-gradient(180deg,#fde68a,#f59e0b)"><span className="text-lg">💰</span><b className="font-display text-xl text-white text-outline-sm">{s.gold}</b></Pill>
              <Pill bg={s.lives <= 3 ? 'linear-gradient(180deg,#fca5a5,#dc2626)' : 'linear-gradient(180deg,#f9a8d4,#db2777)'}><span className="text-lg">❤️</span><b className="font-display text-xl text-white text-outline-sm">{s.lives}</b></Pill>
              <div className="flex gap-1.5">
                <button onClick={() => g?.toggleMusic()} title="Musik" className="pointer-events-auto btn-candy w-10 h-10 text-base" style={{ background: s.musicOn ? 'linear-gradient(180deg,#f0abfc,#c026d3)' : 'linear-gradient(180deg,#e2e8f0,#94a3b8)', ['--shadow' as string]: '#281430' }}>🎵{!s.musicOn && <span className="absolute left-1.5 right-1.5 top-1/2 h-[3px] -translate-y-1/2 -rotate-45 rounded-full bg-[#281430]" />}</button>
                <button onClick={() => g?.toggleMute()} title="Efek suara" className="pointer-events-auto btn-candy w-10 h-10 text-base" style={{ background: s.muted ? 'linear-gradient(180deg,#e2e8f0,#94a3b8)' : 'linear-gradient(180deg,#7dd3fc,#0284c7)', ['--shadow' as string]: '#281430' }}>{s.muted ? '🔇' : '🔊'}</button>
              </div>
            </div>
          </div>

          {/* Bottom panel */}
          <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none" style={{ background: 'linear-gradient(0deg, rgba(59,29,90,0.65), rgba(59,29,90,0.25) 55%, transparent)' }} />
          <div className="absolute bottom-0 left-0 right-0 pb-2 sm:pb-3 flex justify-center pointer-events-none">
            {s.selectedTower ? (
              <div className="pointer-events-auto mx-2 panel-pop p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3" style={{ background: 'linear-gradient(180deg,#fff7ed,#fed7aa)' }}>
                <div className="w-[72px] shrink-0"><Portrait type={s.selectedTower.type} src={portraits[s.selectedTower.type]} /></div>
                <div className="text-[#281430]">
                  <div className="font-display text-lg leading-tight">{TOWER_DEFS[s.selectedTower.type].name} <span className="text-amber-500 text-outline-sm">{'★'.repeat(s.selectedTower.level)}</span><span className="text-black/20">{'★'.repeat(3 - s.selectedTower.level)}</span></div>
                  <div className="text-[11px] font-semibold text-[#281430]/80 leading-tight">
                    {s.selectedTower.type !== 'banner' && s.selectedTower.type !== 'repair' && s.selectedTower.type !== 'shield' && s.selectedTower.type !== 'wind' && s.selectedTower.type !== 'clock' && s.selectedTower.type !== 'mind' && <>{s.selectedTower.type === 'piggy' ? '💰 gaji +' : '⚔️ '}{s.selectedTower.dmg}{s.selectedTower.type === 'plasma' ? '/dtk' : ''}{s.selectedTower.type === 'piggy' ? ' + bunga + koin' : ''}{s.selectedTower.buff > 0 && <span className="text-orange-600"> (+{Math.round(s.selectedTower.buff * 100)}%)</span>} · </>}
                    📏 {s.selectedTower.range} · {TOWER_DEFS[s.selectedTower.type].tag}
                  </div>
                  <div className="mt-1 h-3 w-36 rounded-full border-2 border-[#281430] bg-black/20 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${(s.selectedTower.hp / TOWER_HP) * 100}%`, background: s.selectedTower.hp > 10 ? 'linear-gradient(180deg,#86efac,#16a34a)' : s.selectedTower.hp > 5 ? 'linear-gradient(180deg,#fde68a,#f59e0b)' : 'linear-gradient(180deg,#fca5a5,#dc2626)' }} /></div>
                  <div className="text-[10px] font-bold text-[#281430]/70">HP {s.selectedTower.hp}/{TOWER_HP}</div>
                </div>
                {s.selectedTower.upgradeCost != null ? (
                  <button onClick={() => g?.upgradeSelected()} disabled={s.gold < s.selectedTower.upgradeCost} className="btn-candy px-3 sm:px-4 py-2 text-white text-base leading-tight" style={{ background: 'linear-gradient(180deg,#7dd3fc,#2563eb)', ['--shadow' as string]: '#1e3a8a' }}>
                    ⬆ UPGRADE<br /><span className="text-xs text-yellow-200">{s.selectedTower.upgradeCost}💰</span>
                  </button>
                ) : <div className="font-display text-amber-500 text-outline-sm text-lg px-2">MAX</div>}
                <button onClick={() => g?.sellSelected()} className="btn-candy px-3 py-2 text-white text-sm leading-tight" style={{ background: 'linear-gradient(180deg,#fda4af,#e11d48)', ['--shadow' as string]: '#881337' }}>
                  JUAL<br /><span className="text-xs text-yellow-200">+{s.selectedTower.sellValue}💰</span>
                </button>
                <button onClick={() => g?.selectTower(null)} className="btn-candy w-9 h-9 text-[#281430] text-base" style={{ background: 'linear-gradient(180deg,#f1f5f9,#cbd5e1)', ['--shadow' as string]: '#281430' }}>✕</button>
              </div>
            ) : (
              <div ref={trayRef} className="pointer-events-auto w-full overflow-x-auto px-3 pt-4 no-scrollbar">
                <div className="flex gap-2 w-max mx-auto pb-1">
                  {s.loadout.map(t => {
                    const d = TOWER_DEFS[t]; const can = s.gold >= d.cost;
                    // the very same card component as on the "pilih tower inti" screen
                    return <TowerCard key={t} type={t} src={portraits[t]} u="13px" selected={s.selectedType === t} dim={!can} costOk={can} need={d.cost - s.gold} corner={!can ? <span className="text-sm drop-shadow">🔒</span> : undefined} onClick={() => g?.setSelectedType(t)} />;
                  })}
                </div>
              </div>
            )}
          </div>
          {/* info of the tower type currently chosen in the tray */}
          {!s.selectedTower && s.screen === 'playing' && (
            <div className="absolute left-0 right-0 text-center pointer-events-none px-3" style={{ bottom: 178 }}>
              <span className="inline-flex items-center gap-2 pill-pop text-[#281430] px-3.5 py-1 text-xs sm:text-sm font-bold" style={{ background: `linear-gradient(180deg,#ffffff,${TOWER_COL[s.selectedType][0]})` }}>
                <span className="font-display text-base">{TOWER_DEFS[s.selectedType].name} <span className="opacity-70">“{NICK[s.selectedType]}”</span></span>
                <span className="opacity-80">{TOWER_DEFS[s.selectedType].desc}</span>
                <span className="opacity-60">· 📏 {TOWER_DEFS[s.selectedType].range}</span>
              </span>
            </div>
          )}
          {s.wave === 0 && !s.selectedTower && s.screen === 'playing' && (
            <div className="absolute left-0 right-0 text-center pointer-events-none px-4" style={{ bottom: 218 }}>
              <span className="inline-block pill-pop text-[#281430] text-xs sm:text-sm font-bold px-4 py-2" style={{ background: 'linear-gradient(180deg,#fffbeb,#fde68a)' }}>👆 Ketuk rumput untuk bangun tower · 🐉🎈 Musuh terbang hanya ditembak tower DARAT+UDARA · 💣 Orc Meriam -10 HP tower · 🛡️ Perisai memblokir · 🔨 Tukang memperbaiki · 🐲 Naga membakar tower dalam 4 detik!</span>
            </div>
          )}
        </>
      )}

      {s?.screen === 'select' && g && <Loadout s={s} g={g} portraits={portraits} enemyPortraits={enemyPortraits} />}

      {s?.screen === 'menu' && (
        <Overlay>
          <div className="text-7xl mb-1 wiggle inline-block">🏰</div>
          <h1 className="font-display text-5xl sm:text-6xl text-white text-outline leading-none">VOXEL<span className="text-yellow-300">DEFENSE</span></h1>
          <p className="text-white font-semibold mt-3 max-w-sm mx-auto text-sm drop-shadow">Bangun 26 tower (prajurit tombak, kendali pikiran, kaktus anti-udara, lebah, golem, jam pelambat, celengan...), hadapi 17 jenis musuh termasuk naga penunggang orc, orc pemanah, Ksatria Kelam bermata hijau & pasukan legiun: orc popok, sniper, pelontar, gelondongan, orc balon udara, orc meriam, naga & Raja Orc!</p>
          <div className="mt-3 grid grid-cols-6 gap-1.5 max-w-sm mx-auto">
            {(Object.keys(TOWER_DEFS) as TowerType[]).map(t => (
              <div key={t} className="rounded-xl p-1 text-[#281430] text-[9px] font-bold border-2 border-[#281430] leading-tight" style={{ background: TOWER_BG[t] }}><div className="text-xl">{TOWER_DEFS[t].icon}</div>{TOWER_DEFS[t].name}</div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1 max-w-sm mx-auto text-[10px] font-bold text-[#281430]">
            {[['👶', 'Popok sprint'], ['🔫', 'Sniper'], ['🚀', 'Pelontar'], ['🪵', 'Gelondongan'], ['🎈', 'Balon'], ['💣', 'Meriam'], ['🐉', 'Naga'], ['🔮', 'Dukun'], ['🏹', 'Pemanah'], ['⚔️', 'Ksatria Kelam'], ['🚩', 'Panglima']].map(([i, l]) => <span key={l} className="pill-pop px-2 py-0.5 bg-white/90">{i} {l}</span>)}
          </div>
          <BigButton onClick={() => { g?.sfx.resume(); g?.startGame(); }}>MAIN!</BigButton>
          {s.best > 0 && <div className="text-white font-bold mt-3 text-sm drop-shadow">🏆 Skor terbaik: {s.best}</div>}
        </Overlay>
      )}

      {s?.screen === 'levelComplete' && (
        <Overlay>
          <div className="text-7xl mb-1 animate-bounce inline-block">🎉</div>
          <h2 className="font-display text-4xl sm:text-5xl text-white text-outline">LEVEL {s.level} SELESAI!</h2>
          <div className="text-4xl mt-2 text-yellow-300 text-outline-sm">{'★'.repeat(s.lives >= 8 ? 3 : s.lives >= 4 ? 2 : 1)}<span className="text-white/30">{'★'.repeat(3 - (s.lives >= 8 ? 3 : s.lives >= 4 ? 2 : 1))}</span></div>
          <div className="flex gap-2 justify-center mt-4">
            <Stat label="Skor" value={s.score} bg="linear-gradient(180deg,#c084fc,#7c3aed)" /><Stat label="Kill" value={s.kills} bg="linear-gradient(180deg,#fda4af,#e11d48)" /><Stat label="Bonus" value={`+${90 + (s.level + 1) * 25}💰`} bg="linear-gradient(180deg,#fde68a,#f59e0b)" />
          </div>
          <p className="text-white font-bold text-sm mt-3 drop-shadow">Peta baru · musuh lebih kuat · +3 ❤️ · pilih tower inti lagi</p>
          <BigButton onClick={() => g?.nextLevel()}>LEVEL {s.level + 1} ▶</BigButton>
        </Overlay>
      )}

      {s?.screen === 'gameOver' && (
        <Overlay dark>
          <div className="text-7xl mb-1 inline-block">💔</div>
          <h2 className="font-display text-4xl sm:text-5xl text-white text-outline">KRISTAL HANCUR</h2>
          <p className="text-white font-bold mt-1">Bertahan sampai Level {s.level} · Wave {s.wave}</p>
          <div className="flex gap-2 justify-center mt-4">
            <Stat label="Skor" value={s.score} bg="linear-gradient(180deg,#c084fc,#7c3aed)" /><Stat label="Kill" value={s.kills} bg="linear-gradient(180deg,#fda4af,#e11d48)" /><Stat label="Terbaik" value={s.best} bg="linear-gradient(180deg,#fde68a,#f59e0b)" />
          </div>
          {s.score >= s.best && s.score > 0 && <div className="font-display text-yellow-300 text-outline-sm text-2xl mt-2 wiggle inline-block">🏆 REKOR BARU!</div>}
          <BigButton onClick={() => g?.restart()}>MAIN LAGI</BigButton>
        </Overlay>
      )}
    </div>
  );
}

function Pill({ children, bg }: { children: React.ReactNode; bg: string }) {
  return <div className="pill-pop px-3 py-1 flex items-center gap-1.5" style={{ background: bg }}>{children}</div>;
}
function Overlay({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center p-4 overflow-hidden ${dark ? 'bg-slate-900/70' : 'bg-gradient-to-b from-fuchsia-500/60 via-sky-400/50 to-emerald-300/60'} backdrop-blur-[2px]`}>
      {!dark && <div className="sunray absolute w-[200vmax] h-[200vmax] opacity-20 pointer-events-none" style={{ background: 'repeating-conic-gradient(from 0deg, #fff 0deg 10deg, transparent 10deg 20deg)' }} />}
      <div className="relative text-center max-w-md w-full panel-pop p-5 sm:p-6 pop-in" style={{ background: dark ? 'linear-gradient(180deg,#475569,#1e293b)' : 'linear-gradient(180deg,#f0abfc,#a78bfa)' }}>{children}</div>
    </div>
  );
}
function BigButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="btn-candy mt-5 text-white text-2xl sm:text-3xl px-10 py-3 text-outline-sm" style={{ background: 'linear-gradient(180deg,#fde047,#f59e0b)', ['--shadow' as string]: '#92400e' }}>{children}</button>;
}
function Stat({ label, value, bg }: { label: string; value: string | number; bg: string }) {
  return <div className="pill-pop px-4 py-1.5 min-w-20 text-white" style={{ background: bg }}><div className="text-[10px] font-bold uppercase text-white/90">{label}</div><div className="font-display text-xl text-outline-sm">{value}</div></div>;
}
