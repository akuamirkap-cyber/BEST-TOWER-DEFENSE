import { useState } from 'react';
import { Game, GameState, TOWER_DEFS, TowerType } from '../game/engine';
import { ENEMY_INFO } from '../game/roster';
import { NICK, Portrait, TOWER_BG } from './shared';

interface MainMenuProps {
  s: GameState;
  g: Game;
  portraits: Partial<Record<TowerType, string>>;
  enemyPortraits: Record<string, string>;
}

export default function MainMenu({ s, g, portraits, enemyPortraits }: MainMenuProps) {
  const [modal, setModal] = useState<'none' | 'scores' | 'encyclopedia' | 'audio'>('none');
  const [encTab, setEncTab] = useState<'towers' | 'orcs'>('towers');
  const [search, setSearch] = useState('');

  const towerKeys = Object.keys(TOWER_DEFS) as TowerType[];
  const enemyKeys = Object.keys(ENEMY_INFO);

  const filteredTowers = towerKeys.filter(t => {
    const d = TOWER_DEFS[t];
    const n = NICK[t] || '';
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || n.toLowerCase().includes(q) || d.tag.toLowerCase().includes(q);
  });

  const filteredEnemies = enemyKeys.filter(k => {
    const e = ENEMY_INFO[k];
    const q = search.toLowerCase();
    return k.toLowerCase().includes(q) || e.note.toLowerCase().includes(q);
  });

  const playClick = () => {
    g.sfx.resume();
    g.sfx.click();
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between overflow-hidden select-none">
      {/* Red outer border matching Bloons TD Battles frame */}
      <div className="pointer-events-none absolute inset-0 z-40 border-[6px] sm:border-[10px] border-red-600 shadow-inner">
        {/* Corner rivets */}
        <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-yellow-300 border-2 border-red-900 shadow" />
        <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-yellow-300 border-2 border-red-900 shadow" />
        <div className="absolute bottom-1 left-1 w-3 h-3 rounded-full bg-yellow-300 border-2 border-red-900 shadow" />
        <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-yellow-300 border-2 border-red-900 shadow" />
      </div>

      {/* Sky & Environment Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-gradient-to-b from-[#189ce8] via-[#46bcfc] to-[#99e2ff]">
        {/* Soft Sunrays */}
        <div
          className="sunray absolute -top-40 -left-40 w-[180vmax] h-[180vmax] opacity-25"
          style={{ background: 'repeating-conic-gradient(from 0deg, #ffffff 0deg 10deg, transparent 10deg 20deg)' }}
        />

        {/* Drifting Clouds */}
        <div className="absolute top-6 left-8 cloud-drift-slow opacity-85">
          <Cloud size="w-36 h-14" />
        </div>
        <div className="absolute top-16 right-16 cloud-drift-fast opacity-90">
          <Cloud size="w-48 h-18" />
        </div>
        <div className="absolute top-36 left-1/4 cloud-drift-slow opacity-60">
          <Cloud size="w-28 h-10" />
        </div>

        {/* Floating Airship / Dragon in the sky (like Bloons Battles top-left / top-right) */}
        <div className="absolute top-12 left-10 sm:left-24 balloon-float hidden sm:flex items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/90 border-2 border-[#1a0f26] p-1 shadow-lg transform -rotate-6">
            {portraits['naga'] ? (
              <img src={portraits['naga']} alt="Draco Airship" className="w-full h-full object-contain filter drop-shadow" />
            ) : (
              <span className="text-3xl">🐉</span>
            )}
          </div>
          <div className="bg-white/90 border-2 border-[#1a0f26] px-2 py-0.5 rounded-full text-[10px] font-bold text-[#1a0f26] shadow">
            Airship Voxel
          </div>
        </div>

        {/* Floating Shark / Golden Dragon on right sky (like Bloons MOAB / ZOMG) */}
        <div className="absolute top-14 right-10 sm:right-28 bob-float hidden sm:flex items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 border-3 border-[#1a0f26] p-1.5 shadow-xl transform rotate-6">
            {enemyPortraits['dragon'] ? (
              <img src={enemyPortraits['dragon']} alt="Dragon Boss" className="w-full h-full object-contain filter drop-shadow" />
            ) : (
              <span className="text-3xl">🐲</span>
            )}
          </div>
          <div className="bg-yellow-100 border-2 border-[#1a0f26] px-2 py-0.5 rounded-full text-[10px] font-black text-amber-950 shadow">
            🔥 BOSS ZOMG
          </div>
        </div>

        {/* Rolling Cartoon Grassy Hills & Sandy Slopes (Bottom layer) */}
        <div className="absolute bottom-0 left-0 right-0 h-64 sm:h-80">
          {/* Back dark green rolling hill */}
          <div
            className="absolute -bottom-10 -left-20 w-[120%] h-60 rounded-[100%] bg-[#389123] border-t-4 border-[#1e5212]"
            style={{ transform: 'rotate(-4deg)' }}
          />
          {/* Front bright green rolling hill with pathway */}
          <div
            className="absolute -bottom-16 -right-16 w-[120%] h-64 rounded-[100%] bg-[#5bc235] border-t-4 border-[#246914]"
            style={{ transform: 'rotate(3deg)' }}
          />
          {/* Sandy shore slope on the center-right */}
          <div
            className="absolute -bottom-24 right-0 w-[65%] h-52 rounded-[100%] bg-[#f0cc78] border-t-4 border-[#a87f2e] opacity-95"
            style={{ transform: 'rotate(-2deg)' }}
          />
        </div>
      </div>

      {/* =========================================================================
          TOP CENTER: 3 MASCOTS PEEKING OVER THE "TOWERMASTER" TITLE BANNER
         ========================================================================= */}
      <div className="relative z-30 pt-4 sm:pt-6 px-3 flex flex-col items-center">
        {/* Trio of Voxel characters peeking over the title sign */}
        <div className="relative flex items-end justify-center -mb-5 sm:-mb-6 gap-6 sm:gap-14 z-10 pointer-events-none">
          {/* Left Peeking Character: Voxel Sniper / Scout (like green hair monkey in Image 2) */}
          <div className="relative gentle-bob transform -rotate-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-emerald-400 to-teal-600 border-3 border-[#1a0f26] shadow-md p-1 overflow-hidden">
              {portraits['sniper'] ? (
                <img src={portraits['sniper']} alt="Sniper" className="w-full h-full object-contain filter drop-shadow" />
              ) : (
                <div className="text-3xl text-center mt-2">🎯</div>
              )}
            </div>
            {/* Sniper Goggles / weapon badge */}
            <div className="absolute -bottom-2 -left-2 bg-yellow-400 border-2 border-[#1a0f26] rounded-full px-1.5 py-0.5 text-[9px] font-black text-slate-900 shadow">
              SNIPER
            </div>
          </div>

          {/* Center Peeking Hero: Commander with Golden Crest (like center monkey with goggles in Image 2) */}
          <div className="relative gentle-bob-alt transform translate-y-1">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 border-4 border-[#1a0f26] shadow-xl p-1.5 overflow-hidden">
              {portraits['barracks'] ? (
                <img src={portraits['barracks']} alt="Commander" className="w-full h-full object-contain filter drop-shadow" />
              ) : (
                <div className="text-4xl text-center mt-2">🛡️</div>
              )}
            </div>
            {/* Circular Center Red Crest (like "B" emblem in Image 2) */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-red-600 border-3 border-amber-300 outline outline-2 outline-[#1a0f26] shadow-lg flex items-center justify-center text-white font-display text-xl z-20">
              T
            </div>
          </div>

          {/* Right Peeking Hero: Red / Fire Warrior (like red masked ninja monkey in Image 2) */}
          <div className="relative gentle-bob transform rotate-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-rose-500 to-red-700 border-3 border-[#1a0f26] shadow-md p-1 overflow-hidden">
              {portraits['flame'] ? (
                <img src={portraits['flame']} alt="Fire Knight" className="w-full h-full object-contain filter drop-shadow" />
              ) : (
                <div className="text-3xl text-center mt-2">🔥</div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-red-500 border-2 border-[#1a0f26] rounded-full px-1.5 py-0.5 text-[9px] font-black text-white shadow">
              BLAZE
            </div>
          </div>
        </div>

        {/* THE GIANT "TOWERMASTER" BANNER */}
        <div className="relative battles-banner px-6 sm:px-12 py-3 sm:py-4 bg-gradient-to-b from-[#2a173b] via-[#43184d] to-[#1e0a29] text-center max-w-xl w-full shadow-2xl">
          {/* Beveled wooden/metal borders effect */}
          <div className="absolute inset-1 rounded-2xl border-2 border-amber-400/30 pointer-events-none" />

          {/* Title Line 1: TOWER (Electric cyan / icy blue comic style) */}
          <div className="leading-none tracking-tight">
            <span
              className="font-display text-4xl sm:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-white via-[#7dd3fc] to-[#0284c7] inline-block uppercase"
              style={{
                WebkitTextStroke: '2.5px #071529',
                paintOrder: 'stroke fill',
                filter: 'drop-shadow(0 4px 0 #050f1a) drop-shadow(0 6px 12px rgba(0,0,0,0.6))',
              }}
            >
              TOWER
            </span>
          </div>

          {/* Title Line 2: MASTER (Massive Fiery Orange-Red 3D block letters like BATTLES in Image 2) */}
          <div className="-mt-1 sm:-mt-2 leading-none tracking-wider">
            <span
              className="font-display text-5xl sm:text-7xl text-transparent bg-clip-text bg-gradient-to-b from-[#fffbeb] via-[#fb923c] to-[#dc2626] inline-block uppercase"
              style={{
                WebkitTextStroke: '3px #2b0505',
                paintOrder: 'stroke fill',
                filter: 'drop-shadow(0 5px 0 #3d0707) drop-shadow(0 8px 16px rgba(0,0,0,0.7))',
              }}
            >
              MASTER
            </span>
          </div>

          {/* Subtitle Tagline (like "Multiplayer Bloons Tower Defense" in Image 2) */}
          <div className="mt-1 sm:mt-1.5">
            <span
              className="font-display text-sm sm:text-lg text-white tracking-wide"
              style={{
                WebkitTextStroke: '1.5px #11071c',
                paintOrder: 'stroke fill',
                textShadow: '0 2px 0 #11071c',
              }}
            >
              Epic 3D Voxel Tower Defense
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN CENTER AREA:
          - LEFT: Pirate Defender Mascot + Speech Bubble + Ninja Kiwi style mark
          - CENTER-RIGHT: The 4 Bloons TD Battles style Menu Buttons
          - RIGHT: Enemy Orcs Invasion (Punk Berapi, Fatty Tongkat, Flying Dragon)
         ========================================================================= */}
      <div className="relative z-30 flex-1 flex flex-col md:flex-row items-center justify-between px-4 sm:px-10 lg:px-16 py-2 gap-4">
        {/* LEFT SIDE: Pirate / Hero Mascot standing on hill (like Pirate Monkey in Image 2) */}
        <div className="relative hidden md:flex flex-col items-center max-w-[240px] pointer-events-auto">
          {/* Comic Speech Bubble */}
          <div className="relative mb-2 bg-white/95 border-3 border-[#1a0f26] rounded-2xl px-3.5 py-2 shadow-lg text-center">
            <p className="font-display text-xs text-[#1a0f26] leading-tight">
              &quot;Siap tempur, Komandan! Kristal kerajaan dalam bahaya!&quot;
            </p>
            {/* Bubble pointer downward */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-[#1a0f26]" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
          </div>

          {/* Big Pirate Mascot Frame with Bicorne Hat badge */}
          <div className="relative gentle-bob cursor-pointer" onClick={() => setModal('encyclopedia')}>
            <div className="w-36 h-36 rounded-3xl bg-gradient-to-b from-[#fed7aa] via-[#f97316] to-[#c2410c] border-4 border-[#1a0f26] shadow-2xl p-2 overflow-hidden flex items-center justify-center">
              {enemyPortraits['captain'] || portraits['cannon'] ? (
                <img
                  src={enemyPortraits['captain'] || portraits['cannon']}
                  alt="Captain Mascot"
                  className="w-full h-full object-contain filter drop-shadow-lg"
                />
              ) : (
                <div className="text-6xl">🏴‍☠️</div>
              )}
            </div>
            {/* Pirate Captain Hat & Flintlock Badge */}
            <div className="absolute -top-3 -left-3 bg-slate-900 border-2 border-amber-400 rounded-xl px-2 py-1 text-[11px] font-black text-amber-300 shadow">
              ⚔️ PANGLIMA
            </div>
          </div>
        </div>

        {/* CENTER / CENTER-RIGHT: THE 4 MENU BUTTONS (Bloons TD Battles Style) */}
        <div className="flex flex-col gap-3.5 sm:gap-4.5 w-full max-w-sm sm:max-w-md mx-auto pointer-events-auto">
          {/* BUTTON 1: QUICK BATTLE (Play / Main Sekarang) */}
          <button
            onClick={() => {
              playClick();
              g.startGame();
            }}
            className="btn-battles group w-full py-2.5 sm:py-3 px-3 sm:px-4"
          >
            {/* Circular Medal Badge on Left: Crossed Swords ⚔️ */}
            <div className="battles-medal -ml-5 sm:-ml-7 group-hover:scale-105 transition-transform">
              <span className="text-3xl sm:text-4xl filter drop-shadow">⚔️</span>
            </div>
            {/* Button Label & Subtext */}
            <div className="flex-1 text-center pr-2 sm:pr-4">
              <div
                className="font-display text-2xl sm:text-3xl text-[#fef08a] uppercase leading-none tracking-wider"
                style={{
                  WebkitTextStroke: '2px #111d2e',
                  paintOrder: 'stroke fill',
                  textShadow: '0 3px 0 #0d1724',
                }}
              >
                QUICK BATTLE
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-sky-100 drop-shadow mt-0.5">
                Mulai Pertempuran Voxel ▶
              </div>
            </div>
          </button>

          {/* BUTTON 2: HIGH SCORES (Skor Tertinggi) */}
          <button
            onClick={() => {
              playClick();
              setModal('scores');
            }}
            className="btn-battles group w-full py-2.5 sm:py-3 px-3 sm:px-4"
          >
            {/* Circular Medal Badge on Left: Golden Trophy 🏆 */}
            <div className="battles-medal -ml-5 sm:-ml-7 group-hover:scale-105 transition-transform">
              <span className="text-3xl sm:text-4xl filter drop-shadow">🏆</span>
            </div>
            <div className="flex-1 text-center pr-2 sm:pr-4">
              <div
                className="font-display text-2xl sm:text-3xl text-[#fef08a] uppercase leading-none tracking-wider"
                style={{
                  WebkitTextStroke: '2px #111d2e',
                  paintOrder: 'stroke fill',
                  textShadow: '0 3px 0 #0d1724',
                }}
              >
                HIGH SCORES
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-sky-100 drop-shadow mt-0.5">
                Rekor Terbaik: <span className="text-yellow-300 font-black">{s.best > 0 ? `${s.best} 💰` : 'Belum Ada'}</span>
              </div>
            </div>
          </button>

          {/* BUTTON 3: TOWERS & BLOONS / ORCS (Ensiklopedia) */}
          <button
            onClick={() => {
              playClick();
              setModal('encyclopedia');
            }}
            className="btn-battles group w-full py-2.5 sm:py-3 px-3 sm:px-4"
          >
            {/* Circular Medal Badge on Left: Tower & Orc 🏰 */}
            <div className="battles-medal -ml-5 sm:-ml-7 group-hover:scale-105 transition-transform">
              <span className="text-3xl sm:text-4xl filter drop-shadow">🏰</span>
            </div>
            <div className="flex-1 text-center pr-2 sm:pr-4">
              <div
                className="font-display text-2xl sm:text-3xl text-[#fef08a] uppercase leading-none tracking-wider"
                style={{
                  WebkitTextStroke: '2px #111d2e',
                  paintOrder: 'stroke fill',
                  textShadow: '0 3px 0 #0d1724',
                }}
              >
                TOWERS & ORCS
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-sky-100 drop-shadow mt-0.5">
                34 Tower · 28 Jenis Orc
              </div>
            </div>
          </button>

          {/* BUTTON 4: AUDIO & STORE (Pengaturan Suara) */}
          <button
            onClick={() => {
              playClick();
              setModal('audio');
            }}
            className="btn-battles group w-full py-2.5 sm:py-3 px-3 sm:px-4"
          >
            {/* Circular Medal Badge on Left: Music Ribbon 🎵 */}
            <div className="battles-medal -ml-5 sm:-ml-7 group-hover:scale-105 transition-transform">
              <span className="text-3xl sm:text-4xl filter drop-shadow">🎵</span>
            </div>
            <div className="flex-1 text-center pr-2 sm:pr-4">
              <div
                className="font-display text-2xl sm:text-3xl text-[#fef08a] uppercase leading-none tracking-wider"
                style={{
                  WebkitTextStroke: '2px #111d2e',
                  paintOrder: 'stroke fill',
                  textShadow: '0 3px 0 #0d1724',
                }}
              >
                AUDIO & INFO
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-sky-100 drop-shadow mt-0.5">
                Musik {s.musicOn ? '🔊 ON' : '🔇 OFF'} · Efek {s.muted ? '🔇 MUTE' : '🔊 ON'}
              </div>
            </div>
          </button>
        </div>

        {/* RIGHT SIDE: Enemy Invaders (Orc Punk Tombak Berapi & Gendut Tongkat) */}
        <div className="relative hidden lg:flex flex-col items-center max-w-[220px] pointer-events-auto">
          {/* Flying Bloon / Projectile cluster */}
          <div className="flex gap-2 mb-2 balloon-float">
            <span className="text-2xl filter drop-shadow">🎈</span>
            <span className="text-3xl filter drop-shadow">🧨</span>
            <span className="text-2xl filter drop-shadow">💎</span>
          </div>

          {/* Orc Punk Berapi & Fatty Tongkat Showcase */}
          <div className="relative gentle-bob-alt cursor-pointer" onClick={() => { setEncTab('orcs'); setModal('encyclopedia'); }}>
            <div className="w-36 h-36 rounded-3xl bg-gradient-to-b from-rose-400 via-red-600 to-amber-800 border-4 border-[#1a0f26] shadow-2xl p-2 overflow-hidden flex items-center justify-center">
              {enemyPortraits['punk'] || enemyPortraits['fatty'] ? (
                <img
                  src={enemyPortraits['punk'] || enemyPortraits['fatty']}
                  alt="Enemy Punk"
                  className="w-full h-full object-contain filter drop-shadow-lg"
                />
              ) : (
                <div className="text-6xl">🧑‍🎤</div>
              )}
            </div>
            <div className="absolute -bottom-3 -right-2 bg-red-600 border-2 border-yellow-300 rounded-xl px-2 py-0.5 text-[10px] font-black text-white shadow">
              🔥 ORC PUNK
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM FOOTER: Ninja Kiwi / Kaiparasoft style developer credits
         ========================================================================= */}
      <div className="relative z-30 pb-3 sm:pb-4 px-4 sm:px-8 flex items-center justify-between text-white drop-shadow pointer-events-none">
        {/* Left: Studio Branding (Like Kaiparasoft 2012 in Image 2) */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-red-600 border-2 border-white shadow flex items-center justify-center font-black text-xs">
            TM
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-white/90 leading-tight">
            <span className="font-black text-yellow-300">TOWERMASTER</span> STUDIOS<br />
            <span className="text-white/70">© VOXEL DEFENSE 2026</span>
          </div>
        </div>

        {/* Right: Quick Audio controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => {
              playClick();
              g.toggleMusic();
            }}
            title="Toggle Music"
            className="w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 border-2 border-white text-white flex items-center justify-center text-sm shadow transition-transform active:scale-90"
          >
            {s.musicOn ? '🎵' : '🔇'}
          </button>
          <button
            onClick={() => {
              playClick();
              g.toggleMute();
            }}
            title="Toggle SFX"
            className="w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 border-2 border-white text-white flex items-center justify-center text-sm shadow transition-transform active:scale-90"
          >
            {s.muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: TOWERS & ORCS ENCYCLOPEDIA (Catalog of 34 Towers & 28 Orcs)
         ========================================================================= */}
      {modal === 'encyclopedia' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border-4 border-[#1a0f26] bg-gradient-to-b from-[#2a173b] to-[#120a1c] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-purple-800 to-indigo-900 border-b-3 border-[#1a0f26]">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">🏰</span>
                <h3 className="font-display text-xl sm:text-2xl text-yellow-300 text-outline-sm">
                  ENSIKLOPEDIA TOWERMASTER
                </h3>
              </div>
              <button
                onClick={() => setModal('none')}
                className="btn-candy w-9 h-9 text-[#1a0f26] text-base flex items-center justify-center"
                style={{ background: 'linear-gradient(180deg,#f87171,#dc2626)' }}
              >
                ✕
              </button>
            </div>

            {/* Tabs & Search */}
            <div className="px-4 sm:px-6 py-3 bg-[#1e0f2b] border-b-2 border-purple-950/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setEncTab('towers')}
                  className={`px-4 py-1.5 rounded-full font-display text-sm border-2 transition-all ${
                    encTab === 'towers'
                      ? 'bg-amber-400 text-[#1a0f26] border-[#1a0f26] shadow'
                      : 'bg-purple-900/60 text-purple-200 border-purple-800 hover:bg-purple-800'
                  }`}
                >
                  🏹 34 TOWER ({towerKeys.length})
                </button>
                <button
                  onClick={() => setEncTab('orcs')}
                  className={`px-4 py-1.5 rounded-full font-display text-sm border-2 transition-all ${
                    encTab === 'orcs'
                      ? 'bg-amber-400 text-[#1a0f26] border-[#1a0f26] shadow'
                      : 'bg-purple-900/60 text-purple-200 border-purple-800 hover:bg-purple-800'
                  }`}
                >
                  🧌 28 MUSUH ORC ({enemyKeys.length})
                </button>
              </div>
              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  placeholder="Cari nama / tipe..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-purple-950/80 border-2 border-purple-700 rounded-full px-3.5 py-1 text-xs text-white placeholder-purple-300/60 focus:outline-none focus:border-amber-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1 text-xs text-purple-300">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Cards List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
              {encTab === 'towers' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredTowers.map(t => {
                    const d = TOWER_DEFS[t];
                    return (
                      <div
                        key={t}
                        className="rounded-2xl border-2 border-[#1a0f26] p-2.5 flex flex-col justify-between text-[#1a0f26] shadow"
                        style={{ background: TOWER_BG[t] }}
                      >
                        <div>
                          <div className="w-full h-24 mb-1.5 flex items-center justify-center">
                            <Portrait type={t} src={portraits[t]} h={90} />
                          </div>
                          <div className="font-display text-base leading-tight">
                            {d.name} <span className="opacity-75 text-xs">“{NICK[t]}”</span>
                          </div>
                          <div className="text-[11px] font-bold opacity-90 mt-0.5 leading-tight">
                            {d.desc}
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-black/15 flex items-center justify-between text-[11px] font-black">
                          <span>💰 {d.cost}</span>
                          <span>⚔️ {d.dmg}</span>
                          <span>📏 {d.range}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredEnemies.map(k => {
                    const e = ENEMY_INFO[k];
                    return (
                      <div
                        key={k}
                        className="rounded-2xl border-2 border-[#1a0f26] p-3 flex gap-3 items-center text-[#1a0f26] shadow"
                        style={{ background: `linear-gradient(180deg, ${e.bg[0]}, ${e.bg[1]})` }}
                      >
                        <div className="w-16 h-16 rounded-xl bg-black/15 border border-[#1a0f26] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {enemyPortraits[k] ? (
                            <img src={enemyPortraits[k]} alt={k} className="w-full h-full object-contain filter drop-shadow" />
                          ) : (
                            <span className="text-3xl">{e.icon}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display text-base capitalize leading-tight flex items-center gap-1.5">
                            <span>{e.icon}</span>
                            <span className="truncate">{k}</span>
                          </div>
                          <div className="text-[11px] font-bold opacity-90 leading-snug mt-1">
                            {e.note}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-purple-950/80 border-t-2 border-[#1a0f26] text-center text-xs text-purple-200 font-bold">
              Tip: Pasang tower berjarak strategis untuk menghadapi Orc berarmor tebal dan terbang!
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: HIGH SCORES (Skor Tertinggi & Statistik)
         ========================================================================= */}
      {modal === 'scores' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl border-4 border-[#1a0f26] bg-gradient-to-b from-[#2a173b] to-[#120a1c] p-6 text-center shadow-2xl">
            <div className="text-5xl mb-2 wiggle inline-block">🏆</div>
            <h3 className="font-display text-3xl text-yellow-300 text-outline-sm">
              SKOR TERTINGGI
            </h3>
            <p className="text-purple-200 text-xs font-semibold mt-1">
              Pencapaian rekor terbaik pertahanan kristalmu
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-black/30 border-2 border-amber-400/40">
              <div className="text-xs uppercase font-bold text-amber-300">Skor Terbaik Saat Ini</div>
              <div className="font-display text-4xl text-white text-outline mt-1">
                {s.best > 0 ? `${s.best} POIN` : '0 POIN'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="p-3 rounded-xl bg-purple-900/50 border border-purple-700 text-left">
                <div className="text-[10px] text-purple-300 font-bold uppercase">Tower Tersedia</div>
                <div className="font-display text-xl text-yellow-300">34 Varian</div>
              </div>
              <div className="p-3 rounded-xl bg-purple-900/50 border border-purple-700 text-left">
                <div className="text-[10px] text-purple-300 font-bold uppercase">Musuh Orc</div>
                <div className="font-display text-xl text-rose-300">28 Jenis</div>
              </div>
            </div>

            <button
              onClick={() => setModal('none')}
              className="btn-candy mt-6 px-8 py-2.5 text-white text-lg"
              style={{ background: 'linear-gradient(180deg,#facc15,#eab308)', ['--shadow' as string]: '#854d0e' }}
            >
              KEMBALI KE MENU
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: AUDIO & PENGATURAN
         ========================================================================= */}
      {modal === 'audio' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-3xl border-4 border-[#1a0f26] bg-gradient-to-b from-[#2a173b] to-[#120a1c] p-6 text-center shadow-2xl">
            <div className="text-5xl mb-2 inline-block">🎵</div>
            <h3 className="font-display text-2xl text-yellow-300 text-outline-sm">
              SUARA & MUSIK
            </h3>
            <p className="text-purple-200 text-xs font-semibold mt-1">
              Atur audio procedural WebAudio real-time
            </p>

            <div className="flex flex-col gap-3 mt-5">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-900/40 border border-purple-700">
                <div className="text-left font-display text-white text-sm">
                  Musik Latar (BGM)
                  <div className="text-[10px] font-normal text-purple-300">5 Biome adaptif</div>
                </div>
                <button
                  onClick={() => {
                    playClick();
                    g.toggleMusic();
                  }}
                  className={`btn-candy px-4 py-1.5 text-xs text-white ${s.musicOn ? 'bg-emerald-600' : 'bg-slate-600'}`}
                  style={{
                    background: s.musicOn ? 'linear-gradient(180deg,#34d399,#059669)' : 'linear-gradient(180deg,#94a3b8,#475569)',
                  }}
                >
                  {s.musicOn ? 'AKTIF 🔊' : 'MATI 🔇'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-900/40 border border-purple-700">
                <div className="text-left font-display text-white text-sm">
                  Efek Suara (SFX)
                  <div className="text-[10px] font-normal text-purple-300">Tembakan & ledakan</div>
                </div>
                <button
                  onClick={() => {
                    playClick();
                    g.toggleMute();
                  }}
                  className={`btn-candy px-4 py-1.5 text-xs text-white`}
                  style={{
                    background: !s.muted ? 'linear-gradient(180deg,#38bdf8,#0284c7)' : 'linear-gradient(180deg,#94a3b8,#475569)',
                  }}
                >
                  {!s.muted ? 'AKTIF 🔊' : 'BISU 🔇'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setModal('none')}
              className="btn-candy mt-6 px-8 py-2 text-white text-base"
              style={{ background: 'linear-gradient(180deg,#facc15,#eab308)', ['--shadow' as string]: '#854d0e' }}
            >
              SIMPAN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Cloud({ size }: { size: string }) {
  return (
    <div className={`relative ${size}`}>
      <div className="absolute inset-0 bg-white rounded-full opacity-90 shadow-sm" />
      <div className="absolute -top-3 left-4 w-12 h-12 bg-white rounded-full opacity-90" />
      <div className="absolute -top-5 left-10 w-16 h-16 bg-white rounded-full opacity-90" />
    </div>
  );
}
