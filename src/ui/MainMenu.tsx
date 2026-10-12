import { useEffect, useMemo, useState } from 'react';
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

/** The hero mascot's battle tips shown inside the comic speech bubble */
const TIPS = [
  '“Siap tempur, Komandan! Kuasai setiap menara! Kemenangan menanti!”',
  '“Bawa minimal satu tower UDARA+ — kapal udara & naga mengintai dari langit!”',
  '“Tower Api dan Meriam paling ampuh dipasang di tikungan jalan!”',
  '“Upgrade tower ke Lv3 untuk membuka serangan pamungkas area!”',
  '“Banner menambah +25% damage semua tower di sekitarnya!”',
];

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export default function MainMenu({ s, g, portraits, enemyPortraits }: MainMenuProps) {
  const [modal, setModal] = useState<ModalId>('none');
  const [encTab, setEncTab] = useState<'towers' | 'orcs'>('towers');
  const [search, setSearch] = useState('');
  const [art, setArt] = useState<MenuArt | null>(null);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    let on = true;
    loadMenuArt().then(a => { if (on) setArt(a); });
    return () => { on = false; };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setTip(i => (i + 1) % TIPS.length), 6500);
    return () => window.clearInterval(t);
  }, []);

  const towerKeys = useMemo(() => Object.keys(TOWER_DEFS) as TowerType[], []);
  const enemyKeys = useMemo(() => Object.keys(ENEMY_INFO), []);
  const q = search.trim().toLowerCase();
  const filteredTowers = towerKeys.filter(t =>
    !q ||
    TOWER_DEFS[t].name.toLowerCase().includes(q) ||
    (NICK[t] || '').toLowerCase().includes(q) ||
    TOWER_DEFS[t].tag.toLowerCase().includes(q)
  );
  const filteredEnemies = enemyKeys.filter(k =>
    !q ||
    k.toLowerCase().includes(q) ||
    ENEMY_INFO[k].note.toLowerCase().includes(q)
  );

  const avatar = enemyPortraits['legion'] || enemyPortraits['captain'] || enemyPortraits['normal'] || enemyPortraits['boss'];
  const bestScore = s.best > 0 ? s.best : 3050;
  const totalTreasury = s.best > 0 ? 12450 + s.best : 12450;

  const play = () => { g.sfx.resume(); g.sfx.click(); };
  const open = (m: ModalId) => { play(); setModal(m); };
  const toggleFullscreen = () => {
    play();
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  return (
    <div className="absolute inset-0 z-20 overflow-hidden select-none">
      {/* ================= 1. 3D Voxel Kingdom Backdrop & Floating Airship ================= */}
      <div className="absolute inset-0">
        {art?.backdrop ? (
          <img src={art.backdrop} alt="Voxel Kingdom" draggable={false} className="menu-bg" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a7bf0] via-[#68c5ff] to-[#bfefff]" />
        )}

        {!art?.backdrop && (
          <>
            <div className="absolute top-12 left-10 cloud-drift-slow opacity-90"><Cloud size="w-44 h-16" /></div>
            <div className="absolute top-24 right-16 cloud-drift-fast opacity-90"><Cloud size="w-56 h-20" /></div>
          </>
        )}

        {/* Red Pirate/Orc Blimp Airship in upper-left sky (rendered from game 3D assets, 1.6x larger) */}
        {art?.airship && (
          <img
            src={art.airship}
            alt=""
            draggable={false}
            className="menu-float pointer-events-none absolute left-[4%] top-[10%] w-[28vmin] min-w-[175px] max-w-[390px] drop-shadow-[0_16px_16px_rgba(0,0,0,0.34)] sm:left-[7%] sm:top-[11%]"
            style={{ animationDuration: '6s' }}
          />
        )}

        <div className="menu-vignette" />
      </div>

      {/* ================= 2. Top Bar: Left Player Pill ("AirshipVoxels") & Right Currency + Settings ================= */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 px-3 pt-3 sm:px-6 sm:pt-5">
        {/* Top-Left Player Badge */}
        <button
          onClick={() => open('scores')}
          className="pointer-events-auto group flex items-center transition-transform hover:scale-[1.02] active:translate-y-0.5"
        >
          {/* Rounded-square gold-framed orc avatar */}
          <div className="relative z-10 shrink-0">
            <div className="menu-avatar grid h-12 w-12 place-items-center sm:h-16 sm:w-16">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  draggable={false}
                  className="h-full w-full translate-y-[10%] scale-[1.55] object-contain"
                />
              ) : (
                <ArtIcon name="tower" className="h-7 w-7" />
              )}
            </div>
            {/* Overlapping orange-gold crown shield badge at bottom-right of avatar */}
            <span className="absolute -bottom-1.5 -right-2 z-20 grid h-6 w-6 place-items-center rounded-full border-[2.5px] border-[#1c1208] bg-gradient-to-b from-[#fde047] via-[#f97316] to-[#b45309] shadow-[0_2px_0_#1c1208] sm:h-7 sm:w-7">
              <ArtIcon name="miniCrown" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
          </div>

          {/* Attached cream horizontal name pill */}
          <div className="-ml-3 flex items-center rounded-r-full border-[3.5px] border-[#1c1208] bg-gradient-to-b from-[#fffef9] via-[#fdf4e1] to-[#eed7b1] py-1.5 pl-5 pr-4 shadow-[0_5px_0_#1c1208,inset_0_0_0_2.5px_#d97706] sm:py-2 sm:pl-6 sm:pr-6">
            <span className="font-display text-sm tracking-wide text-[#24160b] sm:text-xl">
              AirshipVoxels
            </span>
          </div>
        </button>

        {/* Top-Right Gold Pill + Settings Gear Button */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          {/* Gold Counter Capsule */}
          <div
            onClick={() => open('encyclopedia')}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') open('encyclopedia'); }}
            className="group flex cursor-pointer items-center transition-transform hover:scale-[1.02] active:translate-y-0.5"
          >
            {/* Big overlapping gold star coin */}
            <div className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border-[3.5px] border-[#1c1208] bg-gradient-to-b from-[#fff7b2] via-[#fbbf24] to-[#d97706] shadow-[0_5px_0_#1c1208,inset_0_2px_0_#ffffff] sm:h-14 sm:w-14">
              <div className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#b45309] bg-gradient-to-b from-[#fde047] to-[#ca8a04] sm:h-10 sm:w-10">
                <ArtIcon name="coinStar" className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>

            {/* Golden horizontal bar with dark recessed number track + plus button */}
            <div className="-ml-5 flex items-center gap-2 rounded-full border-[3.5px] border-[#1c1208] bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309] py-1 pl-6 pr-1.5 shadow-[0_5px_0_#1c1208,inset_0_2px_0_rgba(255,255,255,0.75)] sm:py-1.5 sm:pl-7 sm:pr-2">
              <div className="rounded-full bg-[#461f04]/90 px-3 py-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] sm:px-4">
                <span className="font-display text-sm tracking-wider text-white text-outline-sm sm:text-xl tabular-nums">
                  {totalTreasury.toLocaleString('en-US')}
                </span>
              </div>
              <span className="grid h-6 w-6 place-items-center rounded-full border-[2.5px] border-[#261102] bg-gradient-to-b from-[#fffbeb] via-[#fde047] to-[#eab308] font-display text-base leading-none text-[#261102] shadow-[0_2px_0_#261102] sm:h-8 sm:w-8 sm:text-xl">
                +
              </span>
            </div>
          </div>

          {/* Settings Gear Button */}
          <button
            onClick={() => open('audio')}
            title="Pengaturan Audio & Info"
            className="grid h-11 w-11 place-items-center rounded-2xl border-[3.5px] border-[#1c1208] bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#c26d07] shadow-[0_5px_0_#1c1208,inset_0_2px_0_rgba(255,255,255,0.8)] transition-transform hover:brightness-105 active:translate-y-1 sm:h-14 sm:w-14"
          >
            <ArtIcon name="gear" className="h-7 w-7 sm:h-9 sm:w-9" />
          </button>
        </div>
      </div>

      {/* ================= 3. Center Top Castle Crest & "TOWER MASTER" 3D Logo ================= */}
      <div className="pointer-events-none absolute inset-x-0 top-[4%] z-30 flex flex-col items-center px-3 sm:top-[2.5%]">
        <div className="relative flex flex-col items-center">
          {/* Castle battlements crest + waving red flags + royal gold crown SVG backdrop */}
          <CastleLogoBackdrop />

          {/* "TOWER" 3D Sky-Blue Extruded Block Letters */}
          <div className="relative z-10 -mt-1 select-none text-center">
            <div
              className="font-display uppercase tracking-wide"
              style={{
                fontSize: 'clamp(36px, 7.6vmin, 78px)',
                lineHeight: 0.86,
                WebkitTextStroke: '4.5px #0b1829',
                paintOrder: 'stroke fill',
                background: 'linear-gradient(180deg, #ffffff 8%, #9be2ff 38%, #2894f6 75%, #1261c4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter:
                  'drop-shadow(0 2px 0 #0b1829) drop-shadow(0 5px 0 #091321) drop-shadow(0 8px 0 #070e1a) drop-shadow(0 12px 14px rgba(0,0,0,0.45))',
              }}
            >
              TOWER
            </div>

            {/* "MASTER" 3D Golden-Orange Extruded Block Letters */}
            <div
              className="font-display uppercase tracking-wide -mt-1"
              style={{
                fontSize: 'clamp(44px, 9.5vmin, 98px)',
                lineHeight: 0.85,
                WebkitTextStroke: '5px #1e0b04',
                paintOrder: 'stroke fill',
                background: 'linear-gradient(180deg, #fffde7 5%, #fde047 28%, #f97316 68%, #c2410c 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter:
                  'drop-shadow(0 2px 0 #1e0b04) drop-shadow(0 5px 0 #180802) drop-shadow(0 9px 0 #120501) drop-shadow(0 14px 16px rgba(0,0,0,0.5))',
              }}
            >
              MASTER
            </div>
          </div>

          {/* Carved Wooden Ribbon Banner: "Epic 3D Voxel Tower Defense" */}
          <div className="relative z-20 -mt-1.5 flex items-center justify-center">
            {/* Left notched wood ribbon tail */}
            <div className="-mr-2 h-7 w-4 -rotate-6 rounded-l-md border-[3px] border-[#1c1108] bg-[#6e3b14] shadow-[0_4px_0_#1c1108] sm:h-9 sm:w-6" />
            <div className="menu-wood relative px-5 py-1 sm:px-8 sm:py-1.5">
              {/* Decorative wood rivets */}
              <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#3b1d08] shadow-[0_1px_0_rgba(255,255,255,0.3)]" />
              <span className="absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#3b1d08] shadow-[0_1px_0_rgba(255,255,255,0.3)]" />
              <span
                className="font-display text-xs tracking-wide text-[#fffbeb] sm:text-lg"
                style={{
                  WebkitTextStroke: '1.5px #241104',
                  paintOrder: 'stroke fill',
                  textShadow: '0 2px 0 #241104',
                }}
              >
                Epic 3D Voxel Tower Defense
              </span>
            </div>
            {/* Right notched wood ribbon tail */}
            <div className="-ml-2 h-7 w-4 rotate-6 rounded-r-md border-[3px] border-[#1c1108] bg-[#6e3b14] shadow-[0_4px_0_#1c1108] sm:h-9 sm:w-6" />
          </div>
        </div>
      </div>

      {/* ================= 4. Center 4 Glossy Battle Pill Buttons ================= */}
      <div className="absolute inset-x-0 top-[60%] z-30 -translate-y-1/2 px-3 sm:top-[61%] sm:px-6">
        <div className="mx-auto flex w-full max-w-[min(92vw,490px)] flex-col gap-2 sm:gap-3">
          <MenuButton
            icon="swords"
            label="QUICK BATTLE"
            sub="Mulai Pertempuran Sekarang!"
            from="#fff068"
            via="#fbbf24"
            to="#ea580c"
            shadow="#9a3412"
            medalBg="linear-gradient(180deg,#f59e0b 0%,#d97706 100%)"
            medalBorder="#92400e"
            chevronColor="#7c2d12"
            large
            pulse
            onClick={() => { play(); g.startGame(); }}
          />
          <MenuButton
            icon="trophy"
            label="HIGH SCORES"
            sub={
              <span className="inline-flex items-center gap-1">
                Rekor Terbaik: <b className="text-[#fde047]">{bestScore}</b>
                <ArtIcon name="miniCrown" className="inline h-3.5 w-3.5 -translate-y-0.5" />
              </span>
            }
            from="#67e8f9"
            via="#2589f5"
            to="#0d47a1"
            shadow="#0a2e73"
            medalBg="linear-gradient(180deg,#1d76db 0%,#0f4596 100%)"
            medalBorder="#0b316e"
            chevronColor="#0b2e6b"
            onClick={() => open('scores')}
          />
          <MenuButton
            icon="tower"
            label="TOWERS & ORCS"
            sub={`${towerKeys.length} Tower · ${enemyKeys.length} Jenis Orc`}
            from="#86efac"
            via="#2fd048"
            to="#15803d"
            shadow="#0d4f24"
            medalBg="linear-gradient(180deg,#1fa339 0%,#116324 100%)"
            medalBorder="#0b4619"
            chevronColor="#0c4a1b"
            onClick={() => open('encyclopedia')}
          />
          <MenuButton
            icon="note"
            label="AUDIO & INFO"
            sub={`Musik · ${s.musicOn ? 'ON' : 'OFF'} · Efek · ${s.muted ? 'MUTE' : 'ID'}`}
            from="#e0bdfc"
            via="#9333ea"
            to="#581c87"
            shadow="#3b0764"
            medalBg="linear-gradient(180deg,#7e22ce 0%,#4c1d95 100%)"
            medalBorder="#3b0764"
            chevronColor="#3b0764"
            onClick={() => open('audio')}
          />
        </div>
      </div>

      {/* ================= 5. Left Hero Mascot + Comic Speech Bubble ================= */}
      <div className="pointer-events-none absolute bottom-[10%] left-[1%] z-30 hidden flex-col items-center md:flex lg:left-[2.5%]">
        {/* Curved Comic Speech Bubble */}
        <div className="relative mb-1 ml-6 max-w-[235px] rounded-[26px] border-[3.5px] border-[#1c1433] bg-white px-4 py-2.5 text-center shadow-[0_5px_0_#1c1433,inset_0_0_0_2.5px_#c4b5fd]">
          <p
            key={tip}
            className="pop-in font-display leading-snug text-[#1c1433]"
            style={{ fontSize: 'clamp(11px, 1.02vw, 14px)' }}
          >
            {TIPS[tip]}
          </p>
          {/* Speech bubble pointer tail pointing down to the hero */}
          <svg
            viewBox="0 0 36 28"
            className="absolute -bottom-[22px] right-9 h-6 w-8 overflow-visible"
            aria-hidden="true"
          >
            <path
              d="M4 0 C8 12, 6 20, 0 25 C14 22, 22 14, 24 0 Z"
              fill="#ffffff"
              stroke="#1c1433"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* 3D Rendered Hero Goblin/Orc Legionnaire with Red-Crested Helmet, Spear & Wooden Skull Shield */}
        {art?.hero && (
          <img
            src={art.hero}
            alt="Komandan Orc"
            draggable={false}
            className="menu-hero -mt-2 w-[26vmin] min-w-[175px] max-w-[320px] drop-shadow-[0_14px_14px_rgba(0,0,0,0.38)]"
          />
        )}
      </div>

      {/* ================= 6. Right Foreground Horned Orc Warrior ================= */}
      {art?.brute && (
        <img
          src={art.brute}
          alt="Kapten Orc"
          draggable={false}
          className="menu-float pointer-events-none absolute bottom-[10%] right-[1%] z-30 hidden w-[23vmin] min-w-[155px] max-w-[290px] drop-shadow-[0_16px_14px_rgba(0,0,0,0.4)] lg:block"
        />
      )}

      {/* ================= 7. Footer Wooden Plaques (Left Studio Sign & Right Action Tray) ================= */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 p-2.5 sm:p-4">
        {/* Bottom-Left Angled Wooden Studio Plaque */}
        <div className="menu-wood-plank pointer-events-auto flex -rotate-1 items-center gap-2.5 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
          {/* Red-and-Gold Shield Emblem with Crown */}
          <div className="-my-1 -ml-1 shrink-0 -rotate-6 drop-shadow-[0_4px_0_#1c1108]">
            <ArtIcon name="studioShield" className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <div className="leading-tight">
            <div
              className="font-display text-xs tracking-wide text-white sm:text-base"
              style={{ WebkitTextStroke: '1.2px #241104', paintOrder: 'stroke fill', textShadow: '0 2px 0 #241104' }}
            >
              TOWERMASTER STUDIOS
            </div>
            <div
              className="font-display text-[10px] tracking-wider text-[#fef08a] sm:text-xs"
              style={{ WebkitTextStroke: '1px #241104', paintOrder: 'stroke fill', textShadow: '0 1.5px 0 #241104' }}
            >
              v1.0.0 - RELEASE 2026
            </div>
          </div>
        </div>

        {/* Bottom-Right Wooden Sign with 3 Rounded-Square Action Buttons */}
        <div className="menu-wood-plank pointer-events-auto flex items-center gap-2 px-3 py-2 sm:gap-2.5 sm:px-4 sm:py-2.5">
          {/* Button 1: Indigo Community / Encyclopedia Button */}
          <button
            onClick={() => open('encyclopedia')}
            title="Ensiklopedia & Komunitas"
            aria-label="Ensiklopedia & Komunitas"
            className="menu-sq h-10 w-10 bg-gradient-to-b from-[#7289da] via-[#5865f2] to-[#3c45a5] text-white sm:h-12 sm:w-12"
          >
            <ArtIcon name="community" className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>

          {/* Button 2: Dark Slate Music/Sound Toggle Button */}
          <button
            onClick={() => { play(); g.toggleMusic(); }}
            title={s.musicOn ? 'Musik: ON' : 'Musik: OFF'}
            aria-label="Toggle Musik"
            className="menu-sq relative h-10 w-10 bg-gradient-to-b from-[#334155] via-[#1e293b] to-[#0f172a] text-white sm:h-12 sm:w-12"
          >
            <ArtIcon name={s.musicOn ? 'noteWhite' : 'muteWhite'} className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Button 3: Dark Slate Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Layar Penuh"
            aria-label="Layar Penuh"
            className="menu-sq h-10 w-10 bg-gradient-to-b from-[#334155] via-[#1e293b] to-[#0f172a] text-white sm:h-12 sm:w-12"
          >
            <ArtIcon name="expandWhite" className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>

      {/* ================= 8. Modals (High Scores, Encyclopedia, Audio & Info) ================= */}
      {modal !== 'none' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-5"
          onClick={() => setModal('none')}
        >
          <div
            className="pop-in relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#17202e] bg-gradient-to-b from-[#2a173b] to-[#120a1c] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-[#17202e] bg-gradient-to-r from-purple-800 to-indigo-900 px-3 py-2.5 sm:px-6 sm:py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <ArtIcon
                  name={modal === 'scores' ? 'trophy' : modal === 'audio' ? 'note' : 'tower'}
                  className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
                />
                <h3 className="truncate font-display text-lg text-yellow-300 text-outline-sm sm:text-2xl">
                  {modal === 'scores'
                    ? 'SKOR TERTINGGI'
                    : modal === 'audio'
                    ? 'SUARA & INFORMASI'
                    : 'ENSIKLOPEDIA TOWERMASTER'}
                </h3>
              </div>
              <button
                onClick={() => { play(); setModal('none'); }}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-[3px] border-[#17202e] bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-[0_4px_0_#4c0519] active:translate-y-0.5"
              >
                <ArtIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            {/* High Scores Modal Body */}
            {modal === 'scores' && (
              <div className="no-scrollbar overflow-y-auto p-4 text-center sm:p-8">
                <div className="wiggle inline-block">
                  <ArtIcon name="trophy" className="h-16 w-16 drop-shadow-[0_4px_0_rgba(0,0,0,0.4)]" />
                </div>
                <p className="mt-1 text-xs font-semibold text-purple-200">
                  Pencapaian terbaik pertahanan kristalmu
                </p>
                <div className="mx-auto mt-4 max-w-sm rounded-2xl border-2 border-amber-400/40 bg-black/30 p-4">
                  <div className="text-[11px] font-bold uppercase text-amber-300">Skor Terbaik</div>
                  <div className="font-display text-4xl text-white text-outline tabular-nums">
                    {bestScore}
                  </div>
                </div>
                <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <Stat label="Tower" value={`${towerKeys.length}`} />
                  <Stat label="Jenis Orc" value={`${enemyKeys.length}`} />
                  <Stat label="Slot" value={`${s.slots}`} />
                  <Stat label="Level" value={`${s.level}`} />
                </div>
              </div>
            )}

            {/* Encyclopedia Modal Body */}
            {modal === 'encyclopedia' && (
              <>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-purple-950/60 bg-[#1e0f2b] px-3 py-2.5 sm:px-6">
                  <div className="flex gap-2">
                    {([['towers', `${towerKeys.length} TOWER`], ['orcs', `${enemyKeys.length} ORC`]] as const).map(
                      ([id, label]) => (
                        <button
                          key={id}
                          onClick={() => { play(); setEncTab(id); }}
                          className={`rounded-full border-2 px-3.5 py-1 font-display text-xs transition-all sm:text-sm ${
                            encTab === id
                              ? 'border-[#17202e] bg-amber-400 text-[#17202e] shadow'
                              : 'border-purple-800 bg-purple-900/60 text-purple-200 hover:bg-purple-800'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                  <div className="relative w-full sm:w-56">
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Cari nama / tipe..."
                      className="w-full rounded-full border-2 border-purple-700 bg-purple-950/80 px-3.5 py-1 text-xs text-white placeholder-purple-300/60 focus:border-amber-400 focus:outline-none"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1.5 text-purple-200"
                      >
                        <ArtIcon name="close" className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="no-scrollbar flex-1 overflow-y-auto p-3 sm:p-6">
                  {encTab === 'towers' ? (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                      {filteredTowers.map(t => {
                        const d = TOWER_DEFS[t];
                        return (
                          <div
                            key={t}
                            className="flex flex-col rounded-2xl border-2 p-2 shadow"
                            style={{
                              borderColor: '#17202e',
                              borderTop: `5px solid ${hex(d.accent)}`,
                              background: 'linear-gradient(180deg,#ffffff 0%,#eef3f9 100%)',
                            }}
                          >
                            <div className="mx-auto w-full">
                              <Portrait type={t} src={portraits[t]} h="calc(58px + 3vmin)" />
                            </div>
                            <div className="mt-1.5 font-display text-sm leading-tight text-[#17202e] sm:text-base">
                              {d.name}{' '}
                              <span className="text-[11px] opacity-70">“{NICK[t]}”</span>
                            </div>
                            <div className="mt-0.5 text-[10px] font-bold leading-tight text-[#17202e]/80 sm:text-[11px]">
                              {d.desc}
                            </div>
                            <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-1.5 text-[10px] font-black text-[#17202e] sm:text-[11px]">
                              <span className="flex items-center gap-0.5">💰 {d.cost}</span>
                              <span className="flex items-center gap-0.5">⚔️ {d.dmg}</span>
                              <span className="flex items-center gap-0.5">📏 {d.range}</span>
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
                          <div
                            key={k}
                            className="flex items-center gap-3 rounded-2xl border-2 p-2.5 shadow"
                            style={{
                              borderColor: '#17202e',
                              borderLeft: `6px solid ${e.bg[1]}`,
                              background: 'linear-gradient(180deg,#ffffff 0%,#f1f5f9 100%)',
                            }}
                          >
                            <div
                              className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-[#17202e]"
                              style={{ background: `linear-gradient(180deg, ${e.bg[0]} 0%, #ffffff 100%)` }}
                            >
                              {enemyPortraits[k] ? (
                                <img src={enemyPortraits[k]} alt={k} className="h-full w-full object-contain" />
                              ) : (
                                <span className="text-2xl">{e.icon}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-display text-sm capitalize leading-tight text-[#17202e]">
                                {k}
                              </div>
                              <div className="mt-0.5 text-[10px] font-bold leading-snug text-[#17202e]/85 sm:text-[11px]">
                                {e.note}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Audio & Info Modal Body */}
            {modal === 'audio' && (
              <div className="no-scrollbar overflow-y-auto p-4 sm:p-6">
                <div className="mx-auto flex max-w-md flex-col gap-3">
                  <ToggleRow
                    title="Musik Latar"
                    hint="5 biome adaptif"
                    on={s.musicOn}
                    onLabel="AKTIF"
                    offLabel="MATI"
                    onClick={() => { play(); g.toggleMusic(); }}
                  />
                  <ToggleRow
                    title="Efek Suara"
                    hint="Tembakan, ledakan & sorakan"
                    on={!s.muted}
                    onLabel="AKTIF"
                    offLabel="BISU"
                    onClick={() => { play(); g.toggleMute(); }}
                  />
                  <div className="rounded-2xl border-2 border-purple-700 bg-purple-900/40 p-3 text-xs font-semibold leading-relaxed text-purple-100">
                    <b>Cara main:</b> pilih tower inti → ketuk rumput untuk memasang → upgrade tower yang paling sibuk.
                    Orc datang menuju kastil kristal kerajaan; jangan sampai kristalnya pecah!
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
        </div>
      )}
    </div>
  );
}

/** One of the 4 chunky glossy battle buttons in the center stack */
function MenuButton({
  icon,
  label,
  sub,
  from,
  via,
  to,
  shadow,
  medalBg,
  medalBorder,
  chevronColor,
  onClick,
  large,
  pulse,
}: {
  icon: ArtIconName;
  label: string;
  sub: React.ReactNode;
  from: string;
  via: string;
  to: string;
  shadow: string;
  medalBg: string;
  medalBorder: string;
  chevronColor: string;
  onClick: () => void;
  large?: boolean;
  pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`menu-btn group ${
        large ? 'py-2 pl-2.5 pr-4 sm:py-2.5 sm:pl-3.5 sm:pr-5' : 'py-1.5 pl-2 pr-3.5 sm:py-2 sm:pl-3 sm:pr-4'
      } ${pulse ? 'menu-pulse' : ''}`}
      style={{
        ['--sh' as string]: shadow,
        background: `linear-gradient(180deg, ${from} 0%, ${via} 48%, ${to} 100%)`,
      }}
    >
      {/* Left Recessed Medallion with Illustrated SVG Icon */}
      <span
        className={`menu-medal transition-transform group-hover:scale-105 ${
          large ? 'h-12 w-12 sm:h-16 sm:w-16' : 'h-11 w-11 sm:h-14 sm:w-14'
        }`}
        style={{
          ['--med-bg' as string]: medalBg,
          ['--med-border' as string]: medalBorder,
        }}
      >
        <ArtIcon name={icon} className={large ? 'h-8 w-8 sm:h-11 sm:w-11' : 'h-7 w-7 sm:h-9 sm:w-9'} />
      </span>

      {/* Centered Title + Subtitle */}
      <span className="min-w-0 flex-1 px-2 text-center">
        <span
          className="block font-display uppercase leading-none tracking-wide text-white"
          style={{
            fontSize: large ? 'clamp(19px, 3.6vmin, 32px)' : 'clamp(17px, 3.1vmin, 27px)',
            WebkitTextStroke: '2.2px #141923',
            paintOrder: 'stroke fill',
            textShadow: '0 3px 0 #141923',
          }}
        >
          {label}
        </span>
        <span
          className="mt-0.5 block truncate text-[11px] font-bold text-white sm:text-sm"
          style={{
            WebkitTextStroke: '0.8px rgba(15,23,42,0.85)',
            paintOrder: 'stroke fill',
            textShadow: '0 1.5px 0 rgba(15,23,42,0.8)',
          }}
        >
          {sub}
        </span>
      </span>

      {/* Right Bold Chevron */}
      <span className="shrink-0 pl-1 transition-transform group-hover:translate-x-0.5" style={{ color: chevronColor }}>
        <ArtIcon name="chevron" className="h-5 w-5 sm:h-7 sm:w-7" />
      </span>
    </button>
  );
}

/**
 * Curved 3D Stone Castle Battlements + Waving Red Pennant Flags + Royal Golden Crown
 * behind the "TOWER MASTER" logo, matching the reference illustration.
 */
function CastleLogoBackdrop() {
  return (
    <div className="pointer-events-none absolute -top-5 left-1/2 -z-10 w-[112%] max-w-[490px] -translate-x-1/2 sm:-top-7">
      <svg viewBox="0 0 460 220" className="h-auto w-full overflow-visible drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]">
        <defs>
          <linearGradient id="stoneWall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d6dde8" />
            <stop offset="45%" stopColor="#9aa6ba" />
            <stop offset="100%" stopColor="#5d687d" />
          </linearGradient>
          <linearGradient id="stoneShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8592a8" />
            <stop offset="100%" stopColor="#465063" />
          </linearGradient>
          <linearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff7b2" />
            <stop offset="45%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="flagRed" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* Left Waving Red Pennant Flag */}
        <g transform="translate(56, 12) rotate(-14)">
          <line x1="0" y1="0" x2="0" y2="54" stroke="#5c3415" strokeWidth="5" strokeLinecap="round" />
          <path
            d="M0 4 C -16 2, -32 10, -48 6 L -38 18 L -46 30 C -28 28, -14 22, 0 26 Z"
            fill="url(#flagRed)"
            stroke="#1e140c"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>

        {/* Right Waving Red Pennant Flag */}
        <g transform="translate(404, 12) rotate(14)">
          <line x1="0" y1="0" x2="0" y2="54" stroke="#5c3415" strokeWidth="5" strokeLinecap="round" />
          <path
            d="M0 4 C 16 2, 32 10, 48 6 L 38 18 L 46 30 C 28 28, 14 22, 0 26 Z"
            fill="url(#flagRed)"
            stroke="#1e140c"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>

        {/* Outer Stone Castle Rampart Shield Body */}
        <path
          d="M 42 58
             L 68 54 L 68 72 L 88 68 L 88 46
             L 124 40 L 124 60 L 146 58 L 146 34
             L 192 30 L 192 50 L 268 50 L 268 30
             L 314 34 L 314 58 L 336 60 L 336 40
             L 372 46 L 372 68 L 392 72 L 392 54
             L 418 58
             L 396 175
             Q 230 198 64 175 Z"
          fill="url(#stoneWall)"
          stroke="#182030"
          strokeWidth="6"
          strokeLinejoin="round"
        />

        {/* Stone Brick Seam Lines & Highlight Bevels */}
        <path
          d="M 54 96 Q 230 78 406 96 M 60 136 Q 230 120 400 136"
          fill="none"
          stroke="#465063"
          strokeWidth="3.5"
          opacity="0.7"
        />
        <rect x="66" y="72" width="44" height="36" rx="4" fill="url(#stoneShade)" opacity="0.45" />
        <rect x="350" y="72" width="44" height="36" rx="4" fill="url(#stoneShade)" opacity="0.45" />

        {/* Center Royal Golden Crown perched atop the Battlements */}
        <g transform="translate(230, 32) rotate(-3)">
          <path
            d="M -32 18 L -38 -14 L -15 4 L 0 -22 L 15 4 L 38 -14 L 32 18 Z"
            fill="url(#crownGold)"
            stroke="#1c1108"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <rect
            x="-32"
            y="14"
            width="64"
            height="10"
            rx="4"
            fill="#d97706"
            stroke="#1c1108"
            strokeWidth="4"
          />
          {/* Crown highlight */}
          <path d="M -26 8 L -30 -6 L -15 6 L 0 -13" fill="none" stroke="#fef9c3" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-purple-700 bg-purple-900/50 p-2.5 text-left">
      <div className="text-[10px] font-bold uppercase leading-tight text-purple-300">{label}</div>
      <div className="font-display text-lg text-yellow-300 tabular-nums">{value}</div>
    </div>
  );
}

function ToggleRow({
  title,
  hint,
  on,
  onLabel,
  offLabel,
  onClick,
}: {
  title: string;
  hint: string;
  on: boolean;
  onLabel: string;
  offLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-purple-700 bg-purple-900/40 p-3">
      <div className="min-w-0 text-left">
        <div className="whitespace-nowrap font-display text-sm text-white">{title}</div>
        <div className="text-[10px] font-semibold text-purple-300">{hint}</div>
      </div>
      <button
        onClick={onClick}
        className="menu-btn shrink-0 px-4 py-1.5 text-xs font-black text-white"
        style={{
          width: 'auto',
          ['--sh' as string]: on ? '#065f46' : '#334155',
          background: on
            ? 'linear-gradient(180deg,#6ee7b7,#059669)'
            : 'linear-gradient(180deg,#cbd5e1,#64748b)',
        }}
      >
        {on ? onLabel : offLabel}
      </button>
    </div>
  );
}

/* ================= Full-Color Illustrated Game Icons ================= */
type ArtIconName =
  | 'swords'
  | 'trophy'
  | 'tower'
  | 'note'
  | 'gear'
  | 'coinStar'
  | 'miniCrown'
  | 'studioShield'
  | 'community'
  | 'noteWhite'
  | 'muteWhite'
  | 'expandWhite'
  | 'chevron'
  | 'close';

function ArtIcon({ name, className = '' }: { name: ArtIconName; className?: string }) {
  switch (name) {
    case 'swords':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          {/* Sword 1 (bottom-left to top-right) */}
          <g transform="rotate(42 32 32)">
            <path d="M26 8 L32 2 L38 8 L36 42 L28 42 Z" fill="#e2e8f0" stroke="#141923" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M32 4 L32 40" stroke="#94a3b8" strokeWidth="2.5" />
            <rect x="20" y="40" width="24" height="6" rx="3" fill="#fbbf24" stroke="#141923" strokeWidth="3.2" />
            <rect x="29" y="46" width="6" height="10" rx="2" fill="#9a3412" stroke="#141923" strokeWidth="3" />
            <circle cx="32" cy="58" r="4" fill="#fbbf24" stroke="#141923" strokeWidth="3" />
          </g>
          {/* Sword 2 (bottom-right to top-left) */}
          <g transform="rotate(-42 32 32)">
            <path d="M26 8 L32 2 L38 8 L36 42 L28 42 Z" fill="#f8fafc" stroke="#141923" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M32 4 L32 40" stroke="#cbd5e1" strokeWidth="2.5" />
            <rect x="20" y="40" width="24" height="6" rx="3" fill="#fbbf24" stroke="#141923" strokeWidth="3.2" />
            <rect x="29" y="46" width="6" height="10" rx="2" fill="#9a3412" stroke="#141923" strokeWidth="3" />
            <circle cx="32" cy="58" r="4" fill="#fbbf24" stroke="#141923" strokeWidth="3" />
          </g>
        </svg>
      );

    case 'trophy':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          {/* Handles */}
          <path
            d="M18 18 H10 C10 30 16 34 22 34 M46 18 H54 C54 30 48 34 42 34"
            fill="none"
            stroke="#141923"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M18 18 H10 C10 30 16 34 22 34 M46 18 H54 C54 30 48 34 42 34"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Cup body */}
          <path
            d="M16 12 H48 V26 C48 37 41 43 32 43 C23 43 16 37 16 26 Z"
            fill="#facc15"
            stroke="#141923"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
          {/* Stem & Base */}
          <rect x="28" y="42" width="8" height="9" fill="#eab308" stroke="#141923" strokeWidth="3.5" />
          <rect x="19" y="50" width="26" height="7" rx="3" fill="#d97706" stroke="#141923" strokeWidth="3.5" />
          {/* Shine */}
          <path d="M22 17 V26 C22 31 24 34 26 36" fill="none" stroke="#fef9c3" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'tower':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          {/* Rook Tower Base & Shaft */}
          <path
            d="M16 54 L20 24 H44 L48 54 Z"
            fill="#e2e8f0"
            stroke="#141923"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
          {/* Crenellations */}
          <path
            d="M15 24 V13 H23 V18 H28 V13 H36 V18 H41 V13 H49 V24 Z"
            fill="#f1f5f9"
            stroke="#141923"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
          {/* Arched Window */}
          <path
            d="M28 40 V31 A4 4 0 0 1 36 31 V40 Z"
            fill="#1e293b"
          />
          {/* Base Plinth */}
          <rect x="13" y="51" width="38" height="6" rx="2.5" fill="#cbd5e1" stroke="#141923" strokeWidth="3.5" />
        </svg>
      );

    case 'note':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M24 46 V16 L48 12 V42"
            fill="none"
            stroke="#141923"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M24 22 L48 18"
            fill="none"
            stroke="#141923"
            strokeWidth="9"
          />
          <circle cx="19" cy="47" r="8.5" fill="#f3e8ff" stroke="#141923" strokeWidth="3.8" />
          <circle cx="43" cy="43" r="8.5" fill="#f3e8ff" stroke="#141923" strokeWidth="3.8" />
          <path
            d="M24 46 V16 L48 12 V42"
            fill="none"
            stroke="#f3e8ff"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M24 22 L48 18" fill="none" stroke="#e9d5ff" strokeWidth="5" />
        </svg>
      );

    case 'gear':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M27 8 H37 L39 15 L45 18 L52 14 L57 20 L53 27 L56 33 L62 35 V43 L55 45 L52 51 L56 57 L50 62 L43 58 L37 60 L35 64 H27 L25 58 L19 56 L13 60 L8 54 L12 47 L9 41 L3 39 V31 L10 29 L13 23 L9 17 L15 12 L22 16 L26 14 Z"
            fill="#94a3b8"
            stroke="#1c1208"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="36" r="16" fill="#cbd5e1" stroke="#1c1208" strokeWidth="3.5" />
          <circle cx="32" cy="36" r="7.5" fill="#475569" stroke="#1c1208" strokeWidth="3.5" />
        </svg>
      );

    case 'coinStar':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path
            d="M16 4 L19.5 11.2 L27.5 12.3 L21.7 17.9 L23.1 25.8 L16 22.1 L8.9 25.8 L10.3 17.9 L4.5 12.3 L12.5 11.2 Z"
            fill="#fef08a"
            stroke="#92400e"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'miniCrown':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M3 18 L2 7 L7.5 11.5 L12 4 L16.5 11.5 L22 7 L21 18 Z"
            fill="#fde047"
            stroke="#1c1208"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'studioShield':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M10 10 H54 V32 C54 46 32 56 32 56 C32 56 10 46 10 32 Z"
            fill="#fbbf24"
            stroke="#1c1108"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M16 15 H48 V31 C48 41 32 49 32 49 C32 49 16 41 16 31 Z"
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M21 36 L19 23 L26 28 L32 19 L38 28 L45 23 L43 36 Z"
            fill="#fde047"
            stroke="#1c1108"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'community':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.02.06.03.09.01 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
        </svg>
      );

    case 'noteWhite':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      );

    case 'muteWhite':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-1.73L19.73 21 21 19.73 4.27 3zM14 7h4V3h-6v5.18l2 2z" />
        </svg>
      );

    case 'expandWhite':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M4 9V4h5v2.4H6.4V9H4zm16 0h-2.4V6.4H15V4h5v5zM9 20H4v-5h2.4v2.6H9V20zm6 0v-2.4h2.6V15H20v5h-5z" />
        </svg>
      );

    case 'chevron':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      );

    case 'close':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M5.6 4.2l14.2 14.2-1.4 1.4L4.2 5.6z M18.4 4.2l1.4 1.4L5.6 19.8 4.2 18.4z" />
        </svg>
      );
  }
}

function Cloud({ size }: { size: string }) {
  return (
    <div className={`relative ${size}`}>
      <div className="absolute inset-0 rounded-full bg-white opacity-90 shadow-sm" />
      <div className="absolute -top-3 left-4 h-12 w-12 rounded-full bg-white opacity-90" />
      <div className="absolute -top-5 left-10 h-16 w-16 rounded-full bg-white opacity-90" />
    </div>
  );
}
