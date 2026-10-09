/**
 * Voxel Defense – sound engine. Everything is synthesized live with WebAudio (no audio files):
 *  • signal chain: voices -> buses (sfx / music / ambience) -> master -> compressor; one shared hall reverb gives everything space
 *  • 40+ sound effects: every tower has its own voice, orcs squeak / pop / growl, fire roars, crystals chime, balloons burst
 *  • adaptive procedural music: 5 biome themes (key, tempo, melody) x 6 moods (menu / build phase / battle / boss / victory / defeat)
 *  • living ambience: wind, birds, wind chimes and crystal glints depending on the biome
 */
export type MusicMode = 'off' | 'menu' | 'calm' | 'battle' | 'boss' | 'win' | 'lose';
type Bus = 'sfx' | 'music' | 'amb';

interface ToneOpts {
  f: number; to?: number; dur: number; type?: OscillatorType; vol?: number; attack?: number; sus?: number;
  delay?: number; at?: number; bus?: Bus; lp?: number; lpTo?: number; hp?: number; q?: number; det?: number; pan?: number; rev?: number; prio?: number;
}
interface NoiseOpts {
  dur: number; vol?: number; f?: number; to?: number; q?: number; type?: BiquadFilterType; attack?: number;
  delay?: number; at?: number; bus?: Bus; pan?: number; rev?: number; prio?: number;
}
type Inst = 'bass' | 'pluck' | 'marimba' | 'pad' | 'bell' | 'lead' | 'arp';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ---------- music data ----------
const PENT_MAJ = [0, 2, 4, 7, 9], PENT_MIN = [0, 3, 5, 7, 10];
interface Chord { r: number; m: boolean }
const PROG_MAJ: Chord[] = [{ r: 0, m: false }, { r: 7, m: false }, { r: 9, m: true }, { r: 5, m: false }]; // I  V  vi  IV
const PROG_MIN: Chord[] = [{ r: 0, m: true }, { r: 8, m: false }, { r: 3, m: false }, { r: 10, m: false }]; // i  VI  III  VII
interface BiomeMusic { root: number; min: boolean; tempo: number; motif: number[] }
/** one theme per biome: key (MIDI root), mode, tempo factor and a 4-bar melody (index into the pentatonic scale over 2 octaves, -1 = rest) */
const BM: BiomeMusic[] = [
  { root: 48, min: false, tempo: 1.0, motif: [4, -1, 5, -1, 7, -1, 5, 4, 2, -1, 4, -1, 5, -1, -1, -1, 4, -1, 5, -1, 7, -1, 8, 7, 5, -1, 4, -1, 2, -1, -1, -1] },   // Padang Ceria – C major, sunny
  { root: 45, min: true, tempo: 0.94, motif: [7, -1, 5, -1, 4, -1, 2, -1, 4, -1, 5, 4, 2, -1, 0, -1, 7, -1, 8, -1, 7, 5, 4, -1, 2, -1, 4, -1, 0, -1, -1, -1] },     // Musim Gugur – A minor, wistful
  { root: 51, min: false, tempo: 0.97, motif: [5, -1, 7, -1, 9, -1, 7, 5, 4, -1, 5, -1, 7, -1, -1, 5, 7, -1, 9, -1, 10, -1, 9, 7, 5, -1, 4, -1, 2, -1, -1, -1] },   // Salju Ceria – Eb major, twinkly
  { root: 53, min: false, tempo: 1.08, motif: [4, 5, -1, 4, 7, -1, 5, -1, 4, 5, -1, 4, 2, -1, 0, -1, 5, 7, -1, 5, 8, -1, 7, -1, 5, 4, -1, 2, 4, -1, -1, -1] },     // Negeri Permen – F major, bouncy
  { root: 50, min: true, tempo: 0.95, motif: [0, -1, 2, -1, 4, -1, 2, -1, 0, -1, -1, 2, 3, -1, 2, -1, 4, -1, 5, -1, 7, -1, 5, -1, 4, -1, 2, -1, 0, -1, -1, -1] },     // Hutan Kristal – D minor, mysterious
];
const BPM: Record<MusicMode, number> = { off: 100, menu: 90, calm: 100, battle: 130, boss: 146, win: 122, lose: 62 };

export class Sfx {
  ctx: AudioContext | null = null;
  private _muted = false; private _musicOn = true;
  private master!: GainNode; private sfxBus!: GainNode; private musicBus!: GainNode; private ambBus!: GainNode;
  private musicLP!: BiquadFilterNode; private revIn!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private voices = 0; private gates = new Map<string, number>();
  private mode: MusicMode = 'off'; private biome = 0; private step = 0; private loops = 0; private nextT = 0; private timer: number | null = null;
  private ambTimer: number | null = null; private windGain: GainNode | null = null; private started = false;

  private disposed = false; private unlock = () => this.resume();
  private onVis = () => {
    const c = this.ctx; if (!c) return;
    if (document.hidden) c.suspend().catch(() => undefined); else if (this.started) c.resume().catch(() => undefined);
  };

  constructor() {
    if (typeof window === 'undefined') return;
    // browsers only allow audio after a tap – start on the very first one (this also starts the menu music)
    window.addEventListener('pointerdown', this.unlock, { passive: true });
    window.addEventListener('keydown', this.unlock);
    document.addEventListener('visibilitychange', this.onVis);
  }

  get muted() { return this._muted; }
  set muted(v: boolean) { this._muted = v; this.applyVolumes(); }
  get musicOn() { return this._musicOn; }
  setMusicOn(v: boolean) { this._musicOn = v; this.applyVolumes(); this.syncMusic(); }

  resume() {
    if (this.disposed) return;
    if (!this.ctx) {
      try { const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; this.ctx = new AC(); } catch { this.ctx = null; return; }
      this.setup();
    }
    const c = this.ctx; if (c && c.state === 'suspended') c.resume().catch(() => undefined);
    this.started = true;
  }

  // ---------- graph ----------
  /** stops the music scheduler and the ambience timers (call when the game is torn down) */
  dispose() {
    this.disposed = true; window.removeEventListener('pointerdown', this.unlock); window.removeEventListener('keydown', this.unlock); document.removeEventListener('visibilitychange', this.onVis);
    if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; }
    if (this.ambTimer !== null) { window.clearTimeout(this.ambTimer); this.ambTimer = null; }
    this.ctx?.close().catch(() => undefined); this.ctx = null;
  }
  private setup() {
    const c = this.ctx!;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.22;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 3400; this.musicLP.connect(this.master);
    this.musicBus = c.createGain(); this.musicBus.connect(this.musicLP);
    this.ambBus = c.createGain(); this.ambBus.connect(this.master);
    const conv = c.createConvolver(); conv.buffer = this.impulse(1.9, 2.6);
    this.revIn = c.createGain(); const revOut = c.createGain(); revOut.gain.value = 0.5;
    this.revIn.connect(conv); conv.connect(revOut); revOut.connect(this.master);
    const n = Math.floor(c.sampleRate * 1.6); this.noiseBuf = c.createBuffer(1, n, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes(); this.startAmbience(); this.syncMusic();
  }
  private impulse(sec: number, decay: number) {
    const c = this.ctx!; const n = Math.floor(c.sampleRate * sec); const b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let prev = 0; for (let i = 0; i < n; i++) { const v = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); prev = prev * 0.45 + v * 0.55; d[i] = prev; } }
    return b;
  }
  private applyVolumes() {
    const c = this.ctx; if (!c || !this.sfxBus) return; const t = c.currentTime;
    this.sfxBus.gain.setTargetAtTime(this._muted ? 0 : 1, t, 0.03);
    this.ambBus.gain.setTargetAtTime(this._muted ? 0 : 0.7, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this._musicOn ? 0.62 : 0, t, 0.08);
  }
  private busNode(b: Bus) { return b === 'music' ? this.musicBus : b === 'amb' ? this.ambBus : this.sfxBus; }
  private out(n: AudioNode, bus: Bus, pan = 0, rev = 0) {
    const c = this.ctx!; let node: AudioNode = n;
    if (pan && typeof c.createStereoPanner === 'function') { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); node = p; }
    node.connect(this.busNode(bus));
    if (rev > 0) { const s = c.createGain(); s.gain.value = rev; node.connect(s); s.connect(this.revIn); }
  }
  private gate(k: string, ms: number) { const n = performance.now(); const l = this.gates.get(k) ?? -1e9; if (n - l < ms) return false; this.gates.set(k, n); return true; }
  private allowed(bus: Bus, prio: number) {
    if (bus === 'music' ? !this._musicOn : this._muted) return false;
    if (this.voices > 90) return false;
    if (prio < 2 && this.voices > 64) return false;
    if (prio < 1 && this.voices > 34) return false;
    return true;
  }

  // ---------- voices ----------
  tone(o: ToneOpts) {
    const c = this.ctx; if (!c) return; const bus = o.bus ?? 'sfx';
    if (!this.allowed(bus, o.prio ?? (bus === 'music' ? 2 : 1))) return;
    const t = o.at ?? c.currentTime + (o.delay ?? 0) + 0.005;
    const osc = c.createOscillator(); osc.type = o.type ?? 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.to && o.to !== o.f) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
    if (o.det) osc.detune.value = o.det;
    const g = c.createGain(); const peak = o.vol ?? 0.1; const a = Math.min(o.attack ?? 0.006, o.dur * 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    if (o.sus) g.gain.setValueAtTime(peak, t + Math.max(a, o.dur * o.sus));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node: AudioNode = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); if (o.lpTo) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.lpTo), t + o.dur); f.Q.value = o.q ?? 0.7; node.connect(f); node = f; }
    if (o.hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; node.connect(f); node = f; }
    node.connect(g); this.out(g, bus, o.pan, o.rev);
    osc.start(t); osc.stop(t + o.dur + 0.05); this.voices++; osc.onended = () => { this.voices--; };
  }
  noise(o: NoiseOpts) {
    const c = this.ctx; if (!c || !this.noiseBuf) return; const bus = o.bus ?? 'sfx';
    if (!this.allowed(bus, o.prio ?? (bus === 'music' ? 2 : 1))) return;
    const t = o.at ?? c.currentTime + (o.delay ?? 0) + 0.005;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type ?? 'lowpass'; f.frequency.setValueAtTime(o.f ?? 1200, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t + o.dur); f.Q.value = o.q ?? 0.7;
    const g = c.createGain(); const a = Math.min(o.attack ?? 0.004, o.dur * 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol ?? 0.1, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); this.out(g, bus, o.pan, o.rev);
    src.start(t, Math.random()); src.stop(t + o.dur + 0.05); this.voices++; src.onended = () => { this.voices--; };
  }

  // ======================= UI =======================
  click() { this.tone({ f: 740, to: 1120, dur: 0.07, type: 'triangle', vol: 0.07, prio: 2 }); }
  select() { this.tone({ f: 660, dur: 0.08, type: 'sine', vol: 0.07, prio: 2 }); this.tone({ f: 990, dur: 0.14, type: 'sine', vol: 0.06, delay: 0.06, rev: 0.25, prio: 2 }); }
  deny() { this.tone({ f: 190, to: 140, dur: 0.14, type: 'square', vol: 0.05, lp: 900 }); this.tone({ f: 170, to: 120, dur: 0.17, type: 'square', vol: 0.05, lp: 900, delay: 0.11 }); }
  build() {
    this.noise({ dur: 0.09, vol: 0.08, f: 700, to: 300 }); this.tone({ f: 210, to: 100, dur: 0.13, type: 'triangle', vol: 0.13 });
    [523, 659, 880].forEach((f, i) => this.tone({ f, dur: 0.2, type: 'triangle', vol: 0.06, delay: 0.06 + i * 0.05, rev: 0.3 }));
  }
  upgrade() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ f, dur: 0.34, type: 'triangle', vol: 0.07, delay: i * 0.07, rev: 0.35 }));
    this.tone({ f: 2093, dur: 0.7, type: 'sine', vol: 0.035, delay: 0.3, rev: 0.6 }); this.noise({ dur: 0.35, vol: 0.035, f: 7000, type: 'highpass', delay: 0.25 });
  }
  coin() {
    if (!this.gate('coin', 40)) return;
    this.tone({ f: 988, dur: 0.09, type: 'square', vol: 0.04, lp: 4000 }); this.tone({ f: 1319, dur: 0.3, type: 'square', vol: 0.04, lp: 4000, delay: 0.07, rev: 0.25 });
    this.tone({ f: 2637, dur: 0.32, type: 'sine', vol: 0.02, delay: 0.07, rev: 0.4 });
  }

  // ======================= TOWERS =======================
  shoot(type: string) {
    if (!this.gate('shoot_' + type, 45)) return; const p = rnd(-0.35, 0.35);
    switch (type) {
      case 'cannon': this.noise({ dur: 0.05, vol: 0.07, f: 2400, type: 'bandpass', q: 1, pan: p }); this.tone({ f: 520, to: 110, dur: 0.12, type: 'square', vol: 0.05, lp: 1800, pan: p }); this.tone({ f: 130, to: 60, dur: 0.14, type: 'sine', vol: 0.1 }); break;
      case 'frost': this.tone({ f: rnd(1600, 2100), to: 2900, dur: 0.1, type: 'sine', vol: 0.035, rev: 0.4, pan: p }); this.tone({ f: 2300, dur: 0.15, type: 'triangle', vol: 0.015, delay: 0.02, rev: 0.5 }); break;
      case 'sniper': this.noise({ dur: 0.1, vol: 0.12, f: 5000, type: 'highpass' }); this.tone({ f: 900, to: 90, dur: 0.38, type: 'sawtooth', vol: 0.05, lp: 3000, lpTo: 300, rev: 0.4 }); this.tone({ f: 70, to: 40, dur: 0.2, type: 'sine', vol: 0.12 }); break;
      case 'tesla': this.noise({ dur: 0.12, vol: 0.06, f: 3500, type: 'highpass', pan: p }); this.tone({ f: 110, to: 900, dur: 0.14, type: 'sawtooth', vol: 0.04, lp: 2500, pan: p }); this.tone({ f: 1800, to: 300, dur: 0.1, type: 'square', vol: 0.025, delay: 0.03 }); break;
      case 'poison': this.tone({ f: 240, to: 520, dur: 0.16, type: 'sine', vol: 0.08, pan: p }); this.tone({ f: 380, to: 760, dur: 0.12, type: 'sine', vol: 0.05, delay: 0.08, pan: p }); break;
      default: this.tone({ f: 120, to: 45, dur: 0.28, type: 'sawtooth', vol: 0.09, lp: 700 }); this.noise({ dur: 0.14, vol: 0.09, f: 900, to: 200 }); this.tone({ f: 500, to: 1300, dur: 0.4, type: 'sine', vol: 0.02, delay: 0.05, rev: 0.3 }); break; // mortar: thump + whistle
    }
  }
  hit() {
    if (!this.gate('hit', 35)) return;
    this.noise({ dur: 0.035, vol: 0.045, f: 3000, type: 'highpass', pan: rnd(-0.4, 0.4), prio: 0 }); this.tone({ f: 420, to: 210, dur: 0.06, type: 'triangle', vol: 0.04, prio: 0 });
  }
  /** plasma crackle (throttled – the plasma tower ticks 10x/sec) */
  zap() {
    if (!this.gate('zap', 130)) return;
    this.noise({ dur: 0.07, vol: 0.06, f: 4000, type: 'highpass', prio: 0 }); this.tone({ f: rnd(1400, 2300), to: 500, dur: 0.07, type: 'sawtooth', vol: 0.03, prio: 0 }); this.tone({ f: rnd(90, 130), to: 160, dur: 0.1, type: 'square', vol: 0.02, prio: 0 });
  }
  flame() {
    if (!this.gate('flame', 90)) return;
    this.noise({ dur: 0.14, vol: 0.045, f: 1100, to: 600, type: 'bandpass', q: 0.6, prio: 0 }); this.tone({ f: rnd(60, 100), dur: 0.08, type: 'sawtooth', vol: 0.02, prio: 0 });
  }
  /** the dragon's fire stream: a deeper, fuller roar than the flamethrower tower */
  breath() {
    if (!this.gate('breath', 110)) return;
    this.noise({ dur: 0.22, vol: 0.075, f: 800, to: 350, type: 'bandpass', q: 0.5, attack: 0.04, prio: 0 }); this.tone({ f: 72, to: 56, dur: 0.22, type: 'sawtooth', vol: 0.045, lp: 320, prio: 0 }); this.noise({ dur: 0.08, vol: 0.03, f: 3500, type: 'highpass', prio: 0 });
  }
  trap() {
    this.noise({ dur: 0.05, vol: 0.09, f: 3500, type: 'highpass' }); this.tone({ f: 1400, to: 300, dur: 0.08, type: 'square', vol: 0.06, lp: 3000 });
    this.tone({ f: 200, to: 80, dur: 0.16, type: 'triangle', vol: 0.1, delay: 0.03 }); this.tone({ f: 1800, dur: 0.25, type: 'sine', vol: 0.025, delay: 0.04, rev: 0.4 });
  }
  repair() { this.tone({ f: 1200, dur: 0.05, type: 'square', vol: 0.035, lp: 3000 }); this.tone({ f: 1600, dur: 0.06, type: 'square', vol: 0.035, lp: 3000, delay: 0.07 }); this.tone({ f: 2400, dur: 0.2, type: 'sine', vol: 0.02, delay: 0.07, rev: 0.4 }); }
  heal() { [880, 1175, 1568].forEach((f, i) => this.tone({ f, dur: 0.24, type: 'sine', vol: 0.04, delay: i * 0.07, rev: 0.5, prio: 0 })); }
  heart() { this.tone({ f: 880, to: 1180, dur: 0.12, type: 'sine', vol: 0.05, rev: 0.4 }); this.tone({ f: 1320, dur: 0.2, type: 'sine', vol: 0.04, delay: 0.07, rev: 0.5 }); this.tone({ f: 1760, dur: 0.25, type: 'sine', vol: 0.02, delay: 0.1, rev: 0.6 }); }
  /** Lumi's rainbow beam: a rising four-note chime with a soft whoosh */
  prism() { this.noise({ dur: 0.2, vol: 0.05, f: 800, to: 4000, type: 'bandpass', q: 0.7 }); [660, 880, 1100, 1320, 1760].forEach((f, i) => this.tone({ f, dur: 0.28, type: 'sine', vol: 0.045, delay: i * 0.035, rev: 0.55 })); }
  /** Froggy casts the line */
  cast() { this.tone({ f: 700, to: 300, dur: 0.16, type: 'triangle', vol: 0.05 }); this.noise({ dur: 0.12, vol: 0.04, f: 2500, to: 800, type: 'bandpass' }); }
  /** Pino lobs the ball */
  toss() { this.tone({ f: 260, to: 540, dur: 0.18, type: 'triangle', vol: 0.05 }); this.noise({ dur: 0.14, vol: 0.035, f: 600, to: 1800, type: 'bandpass' }); }
  /** the ball lands on the road */
  thud() { this.noise({ dur: 0.12, vol: 0.1, f: 500, to: 150 }); this.tone({ f: 115, to: 48, dur: 0.22, type: 'sine', vol: 0.15 }); }
  /** golem stomp: deep thud + gravel */
  stomp() { this.noise({ dur: 0.38, vol: 0.16, f: 650, to: 80, rev: 0.25 }); this.tone({ f: 75, to: 36, dur: 0.42, type: 'sine', vol: 0.26 }); this.tone({ f: 140, to: 60, dur: 0.2, type: 'triangle', vol: 0.08 }); this.noise({ dur: 0.2, vol: 0.05, f: 2500, to: 900, delay: 0.08, type: 'bandpass' }); }
  /** swarm of bees leaving the hive */
  buzz() { if (!this.gate('buzz', 120)) return; this.tone({ f: rnd(220, 260), to: 290, dur: 0.2, type: 'sawtooth', vol: 0.025, lp: 1400, det: 14, pan: rnd(-0.5, 0.5) }); this.tone({ f: rnd(236, 276), to: 300, dur: 0.2, type: 'sawtooth', vol: 0.02, lp: 1400, delay: 0.03 }); }
  /** cactus needle (throttled – it shoots very fast) */
  needle() { if (!this.gate('needle', 45)) return; this.tone({ f: 1500, to: 600, dur: 0.05, type: 'triangle', vol: 0.03, prio: 0 }); this.noise({ dur: 0.02, vol: 0.02, f: 6000, type: 'highpass', prio: 0 }); }
  /** clock aura tick-tock */
  tick() { this.tone({ f: 1500, dur: 0.03, type: 'square', vol: 0.03, lp: 3500, rev: 0.15 }); this.tone({ f: 1100, dur: 0.04, type: 'square', vol: 0.03, lp: 3500, delay: 0.09, rev: 0.15 }); }
  /** gust of wind (windmill tower) */
  whoosh() { if (!this.gate('whoosh', 250)) return; this.noise({ dur: 0.36, vol: 0.05, f: 400, to: 1800, type: 'bandpass', q: 0.6, attack: 0.1, prio: 0 }); }
  /** boomerang swoosh */
  boomerang() { if (!this.gate('boom_r', 120)) return; this.tone({ f: 520, to: 820, dur: 0.28, type: 'triangle', vol: 0.04, rev: 0.2 }); this.tone({ f: 820, to: 420, dur: 0.3, type: 'triangle', vol: 0.035, delay: 0.28, rev: 0.2 }); this.noise({ dur: 0.3, vol: 0.025, f: 1200, to: 600, type: 'bandpass' }); }

  // ======================= EXPLOSIONS & ENEMIES =======================
  boom() {
    this.noise({ dur: 0.75, vol: 0.2, f: 2200, to: 90, rev: 0.4 }); this.tone({ f: 95, to: 32, dur: 0.58, type: 'sine', vol: 0.3 });
    this.tone({ f: 200, to: 50, dur: 0.32, type: 'sawtooth', vol: 0.06, lp: 500 }); this.noise({ dur: 0.25, vol: 0.08, f: 6000, type: 'highpass', delay: 0.03 });
    this.noise({ dur: 0.3, vol: 0.05, f: 1800, to: 400, type: 'bandpass', delay: 0.18, rev: 0.4 }); // debris rain
  }
  splat() { this.tone({ f: 320, to: 90, dur: 0.2, type: 'sine', vol: 0.09 }); this.noise({ dur: 0.14, vol: 0.06, f: 900, to: 300 }); this.tone({ f: 500, to: 700, dur: 0.08, type: 'sine', vol: 0.04, delay: 0.12 }); }
  /** an orc pops: a squeak whose pitch and weight depend on who it was */
  pop(kind = 'normal') {
    if (!this.gate('pop', 30)) return; const j = rnd(0.9, 1.15), p = rnd(-0.4, 0.4);
    const hi = kind === 'baby' || kind === 'fast'; const lo = kind === 'tank' || kind === 'boss' || kind === 'log' || kind === 'berserker';
    const b = (hi ? 1.55 : lo ? 0.6 : 1) * j;
    this.tone({ f: 420 * b, to: 920 * b, dur: 0.09, type: 'sine', vol: 0.08, pan: p }); this.tone({ f: 920 * b, to: 520 * b, dur: 0.13, type: 'sine', vol: 0.06, delay: 0.08, pan: p });
    this.noise({ dur: 0.08, vol: lo ? 0.1 : 0.07, f: lo ? 900 : 1800, type: 'bandpass', q: 0.8 }); this.tone({ f: (lo ? 120 : 170) * j, to: 60, dur: 0.12, type: 'triangle', vol: lo ? 0.14 : 0.08 });
    if (kind === 'shaman') this.tone({ f: 1320, to: 1760, dur: 0.3, type: 'sine', vol: 0.03, delay: 0.1, rev: 0.6 });
    if (kind === 'gunner' || kind === 'cannoneer') this.tone({ f: 2200, to: 800, dur: 0.1, type: 'square', vol: 0.02, delay: 0.05, lp: 3000 });
  }
  /** balloon bursts: loud snap + gas whoosh + falling cloth + confetti glints */
  balloonPop() {
    this.noise({ dur: 0.07, vol: 0.22, f: 6000, type: 'highpass' }); this.noise({ dur: 0.45, vol: 0.09, f: 3000, to: 400, type: 'bandpass', q: 0.8, delay: 0.03, rev: 0.3 });
    this.tone({ f: 900, to: 200, dur: 0.4, type: 'triangle', vol: 0.07, delay: 0.02 }); this.tone({ f: 120, to: 50, dur: 0.45, type: 'sawtooth', vol: 0.08, lp: 600, delay: 0.04 });
    [1500, 1900, 2300, 2800].forEach((f, i) => this.tone({ f, to: f * 0.8, dur: 0.14, type: 'sine', vol: 0.025, delay: 0.14 + i * 0.07, rev: 0.5, pan: rnd(-0.7, 0.7) }));
  }
  bossDie() {
    this.boom(); this.tone({ f: 420, to: 55, dur: 1.3, type: 'sawtooth', vol: 0.12, lp: 2000, lpTo: 200, rev: 0.45 });
    [392, 330, 262, 196].forEach((f, i) => this.tone({ f, dur: 0.4, type: 'square', vol: 0.05, lp: 1800, delay: 0.25 + i * 0.16, rev: 0.4 })); this.noise({ dur: 0.9, vol: 0.08, f: 900, to: 150, delay: 0.1, rev: 0.4 });
  }
  /** the dragon / Raja Orc appears */
  roar(kind: string) {
    const big = kind === 'boss'; const f0 = big ? 118 : 205; const d = big ? 1.0 : 0.75;
    this.tone({ f: f0, to: f0 * 0.5, dur: d, type: 'sawtooth', vol: 0.1, lp: 900, lpTo: 250, attack: 0.09, rev: 0.4 });
    this.tone({ f: f0 * 1.012, to: f0 * 0.52, dur: d, type: 'square', vol: 0.05, lp: 700, lpTo: 200, attack: 0.11, det: 12 });
    this.noise({ dur: d * 0.8, vol: 0.07, f: 700, to: 200, attack: 0.1, rev: 0.3 }); if (!big) this.tone({ f: 1100, to: 400, dur: 0.3, type: 'sawtooth', vol: 0.025, lp: 2200, delay: 0.1 });
  }
  /** a soldier's spear thrust: a whoosh and a dull "bonk" */
  poke() {
    if (!this.gate('poke', 60)) return;
    this.noise({ dur: 0.1, vol: 0.06, f: 3000, to: 900, type: 'bandpass', q: 0.8, prio: 0 }); this.tone({ f: 260, to: 120, dur: 0.12, type: 'triangle', vol: 0.09, prio: 0 }); this.tone({ f: 900, to: 400, dur: 0.07, type: 'square', vol: 0.025, lp: 2500, prio: 0 });
  }
  /** mind control laser: a sharp "pew" that sweeps down, then an eerie wobbling chime */
  mind() {
    this.tone({ f: 2200, to: 260, dur: 0.3, type: 'sawtooth', vol: 0.06, lp: 4500, lpTo: 700, rev: 0.4 }); this.tone({ f: 1100, to: 140, dur: 0.32, type: 'square', vol: 0.03, lp: 2600, rev: 0.3 });
    this.noise({ dur: 0.12, vol: 0.05, f: 6000, type: 'highpass' });
    this.tone({ f: 330, to: 660, dur: 0.6, type: 'sine', vol: 0.05, attack: 0.05, rev: 0.7 }); this.tone({ f: 340, to: 690, dur: 0.6, type: 'sine', vol: 0.04, attack: 0.05, rev: 0.7, det: 25 });
    [880, 1175, 1568].forEach((f, i) => this.tone({ f, dur: 0.25, type: 'triangle', vol: 0.02, delay: 0.15 + i * 0.09, rev: 0.6 })); this.noise({ dur: 0.4, vol: 0.03, f: 600, to: 3000, type: 'bandpass', q: 1.5, rev: 0.4 });
  }
  /** Dread Knight: a low growl as it winds up */
  growl() { if (!this.gate('growl', 400)) return; this.tone({ f: 92, to: 66, dur: 0.55, type: 'sawtooth', vol: 0.07, lp: 520, attack: 0.07, rev: 0.3 }); this.noise({ dur: 0.4, vol: 0.04, f: 500, to: 200, attack: 0.1 }); }
  /** Dukun Es: freeze sound effect */
  freeze() {
    if (!this.gate('freeze', 200)) return;
    this.tone({ f: 880, to: 1400, dur: 0.22, type: 'triangle', vol: 0.06, rev: 0.4 });
    this.noise({ dur: 0.16, vol: 0.05, f: 3500, to: 1200, type: 'bandpass', q: 1.2 });
  }
  /** Naga fireball launch */
  dragonShot() {
    if (!this.gate('dshot', 90)) return;
    this.noise({ dur: 0.24, vol: 0.07, f: 1200, to: 300, type: 'bandpass', q: 0.8 });
    this.tone({ f: 180, to: 75, dur: 0.28, type: 'sawtooth', vol: 0.06, lp: 600 });
  }
  /** Badai lightning thunderclap */
  thunder() {
    if (!this.gate('thunder', 80)) return;
    this.noise({ dur: 0.08, vol: 0.15, f: 4500, type: 'highpass' });
    this.tone({ f: 220, to: 45, dur: 0.42, type: 'sawtooth', vol: 0.12, lp: 1200 });
    this.noise({ dur: 0.5, vol: 0.09, f: 1600, to: 120, type: 'bandpass', delay: 0.04, rev: 0.35 });
  }
  /** Gempa hydraulic seismic slam */
  quake() {
    if (!this.gate('quake', 100)) return;
    this.noise({ dur: 0.45, vol: 0.18, f: 550, to: 60, rev: 0.35 });
    this.tone({ f: 85, to: 28, dur: 0.5, type: 'sine', vol: 0.28 });
    this.tone({ f: 160, to: 50, dur: 0.25, type: 'triangle', vol: 0.14 });
  }
  /** Gletser cryogenic freeze shatter */
  shatter() {
    if (!this.gate('shatter', 90)) return;
    this.noise({ dur: 0.18, vol: 0.08, f: 6500, to: 2000, type: 'highpass' });
    [1760, 2200, 2640, 3100].forEach((f, i) => this.tone({ f, dur: 0.22, type: 'sine', vol: 0.04, delay: i * 0.03, rev: 0.6 }));
  }
  /** Badai roaming cyclone */
  cyclone() {
    if (!this.gate('cyclone', 120)) return;
    this.noise({ dur: 0.65, vol: 0.12, f: 800, to: 2800, type: 'bandpass', q: 1.5 });
    this.tone({ f: 120, to: 240, dur: 0.5, type: 'triangle', vol: 0.06 });
  }
  /** Gempa seismic stake tether */
  tether() {
    if (!this.gate('tether', 110)) return;
    this.tone({ f: 420, to: 160, dur: 0.25, type: 'sawtooth', vol: 0.08, lp: 800 });
    this.noise({ dur: 0.3, vol: 0.1, f: 1400, to: 350, type: 'bandpass' });
  }
  /** Gletser physical ice barricade raised */
  iceWall() {
    if (!this.gate('icewall', 150)) return;
    this.noise({ dur: 0.4, vol: 0.12, f: 4500, to: 900, type: 'bandpass', q: 0.9 });
    this.tone({ f: 600, to: 1200, dur: 0.35, type: 'sine', vol: 0.08, rev: 0.5 });
  }
  /** Portal dimensional warp */
  warpPortal() {
    if (!this.gate('warp', 100)) return;
    this.tone({ f: 300, to: 1200, dur: 0.35, type: 'sine', vol: 0.08, rev: 0.5 });
    this.tone({ f: 800, to: 200, dur: 0.4, type: 'triangle', vol: 0.07, delay: 0.08, rev: 0.4 });
    this.noise({ dur: 0.3, vol: 0.08, f: 3200, to: 800, type: 'bandpass' });
  }
  /** UFO alien tractor beam & meteor slam */
  abduction() {
    if (!this.gate('abduct', 120)) return;
    this.tone({ f: 440, to: 880, dur: 0.4, type: 'sawtooth', vol: 0.06, lp: 2400 });
    this.tone({ f: 880, to: 220, dur: 0.35, type: 'sine', vol: 0.09, delay: 0.2, rev: 0.3 });
    this.noise({ dur: 0.25, vol: 0.1, f: 1200, to: 200, delay: 0.25 });
  }
  /** Cauldron potion splash & frog ribbit */
  brewSplash() {
    if (!this.gate('brew', 90)) return;
    this.noise({ dur: 0.22, vol: 0.09, f: 1500, to: 400, type: 'bandpass', q: 1.2 });
    this.tone({ f: 160, to: 320, dur: 0.12, type: 'sine', vol: 0.08 });
    this.tone({ f: 220, to: 140, dur: 0.18, type: 'sawtooth', vol: 0.06, lp: 900, delay: 0.1 });
  }
  /** Voodoo totem curse & rattle */
  voodooHex() {
    if (!this.gate('voodoo', 100)) return;
    for (let i = 0; i < 4; i++) this.noise({ dur: 0.04, vol: 0.05, f: 2800 + i * 400, type: 'bandpass', delay: i * 0.03 });
    this.tone({ f: 380, to: 140, dur: 0.35, type: 'sawtooth', vol: 0.07, lp: 850, rev: 0.4 });
  }
  /** Phoenix dive-bomb screech & flame roar */
  phoenixRoar() {
    if (!this.gate('phoenix', 150)) return;
    this.tone({ f: 600, to: 1600, dur: 0.35, type: 'sawtooth', vol: 0.08, lp: 3000, rev: 0.4 });
    this.noise({ dur: 0.55, vol: 0.12, f: 800, to: 2400, type: 'bandpass', q: 0.8, delay: 0.05 });
    this.tone({ f: 180, to: 90, dur: 0.4, type: 'sine', vol: 0.15, delay: 0.1 });
  }
  /** Dread Knight slash: a sharp whoosh, a steel clang and the crash of a tower collapsing */
  slash() {
    this.noise({ dur: 0.22, vol: 0.12, f: 5000, to: 700, type: 'bandpass', q: 0.8, attack: 0.02 });
    this.tone({ f: 1250, to: 900, dur: 0.35, type: 'square', vol: 0.05, lp: 4000, delay: 0.1, rev: 0.4 }); this.tone({ f: 1870, dur: 0.3, type: 'sine', vol: 0.04, delay: 0.1, rev: 0.5 });
    this.tone({ f: 80, to: 34, dur: 0.5, type: 'sine', vol: 0.26, delay: 0.12 }); this.noise({ dur: 0.5, vol: 0.14, f: 1800, to: 120, delay: 0.12, rev: 0.35 });
  }
  /** archer pulls the bowstring */
  bowDraw() { if (!this.gate('bowdraw', 150)) return; this.tone({ f: 150, to: 230, dur: 0.5, type: 'sawtooth', vol: 0.02, lp: 650, attack: 0.1, prio: 0 }); }
  /** the arrow leaves the bow: twang + whistle */
  arrowShot() { if (!this.gate('arrow', 60)) return; this.tone({ f: 640, to: 260, dur: 0.1, type: 'triangle', vol: 0.05, prio: 0 }); this.noise({ dur: 0.18, vol: 0.04, f: 1500, to: 3500, type: 'bandpass', delay: 0.02, prio: 0 }); }
  /** an arrow sticks into a tower */
  arrowHit() { this.noise({ dur: 0.05, vol: 0.06, f: 1200, type: 'bandpass', q: 1.2, prio: 0 }); this.tone({ f: 210, to: 110, dur: 0.08, type: 'triangle', vol: 0.07, prio: 0 }); }
  /** the war captain's rallying horn */
  warcry() {
    if (!this.gate('warcry', 600)) return;
    this.tone({ f: 165, to: 130, dur: 0.6, type: 'sawtooth', vol: 0.07, lp: 900, attack: 0.05, rev: 0.4 }); this.tone({ f: 248, to: 196, dur: 0.6, type: 'sawtooth', vol: 0.04, lp: 900, attack: 0.07, delay: 0.02, rev: 0.4, det: 8 });
    this.noise({ dur: 0.35, vol: 0.04, f: 700, to: 300, rev: 0.3 });
  }
  /** an orc steps out of the purple portal */
  spawn() { if (!this.gate('spawn', 130)) return; this.tone({ f: rnd(190, 260), to: rnd(380, 460), dur: 0.14, type: 'sine', vol: 0.03, pan: rnd(-0.6, 0.6), prio: 0 }); }
  enemyShot() { if (!this.gate('eshot', 60)) return; this.tone({ f: 900, to: 300, dur: 0.08, type: 'square', vol: 0.03, lp: 2500, prio: 0 }); this.noise({ dur: 0.03, vol: 0.02, f: 4000, type: 'highpass', prio: 0 }); }
  launch() { this.noise({ dur: 0.5, vol: 0.07, f: 500, to: 3000, attack: 0.05, type: 'bandpass' }); this.tone({ f: 160, to: 880, dur: 0.5, type: 'sawtooth', vol: 0.05, lp: 1500, rev: 0.3 }); }
  crack() { this.noise({ dur: 0.18, vol: 0.14, f: 3000, to: 400, type: 'bandpass' }); this.tone({ f: 200, to: 90, dur: 0.22, type: 'triangle', vol: 0.1 }); this.noise({ dur: 0.3, vol: 0.06, f: 900, to: 200, delay: 0.1 }); }
  hurt() {
    this.tone({ f: 260, to: 120, dur: 0.32, type: 'sawtooth', vol: 0.09, lp: 900 }); this.noise({ dur: 0.22, vol: 0.07, f: 700, to: 200 });
    this.tone({ f: 660, to: 330, dur: 0.25, type: 'triangle', vol: 0.05, delay: 0.04, rev: 0.4 });
  }
  /** low-lives alarm */
  warn() { if (!this.gate('warn', 800)) return; this.tone({ f: 880, dur: 0.1, type: 'square', vol: 0.045, lp: 2500 }); this.tone({ f: 660, dur: 0.12, type: 'square', vol: 0.045, lp: 2500, delay: 0.14 }); this.tone({ f: 880, dur: 0.1, type: 'square', vol: 0.045, lp: 2500, delay: 0.3 }); }
  towerDown() {
    this.noise({ dur: 0.65, vol: 0.16, f: 1500, to: 100, rev: 0.35 }); this.tone({ f: 130, to: 40, dur: 0.55, type: 'sawtooth', vol: 0.09, lp: 500 });
    [0.12, 0.24, 0.38].forEach(d => this.noise({ dur: 0.06, vol: 0.06, f: rnd(1500, 3000), type: 'bandpass', delay: d, pan: rnd(-0.5, 0.5) })); // rubble clatter
  }

  // ======================= GAME FLOW =======================
  wave() {
    const horn = (f: number, d: number, delay: number) => {
      this.tone({ f, dur: d, type: 'sawtooth', vol: 0.06, lp: 1500, lpTo: 800, attack: 0.05, sus: 0.5, delay, rev: 0.35 });
      this.tone({ f: f * 1.5, dur: d, type: 'sawtooth', vol: 0.03, lp: 1300, attack: 0.06, sus: 0.5, delay, rev: 0.35, det: 6 });
    };
    horn(294, 0.24, 0); horn(392, 0.46, 0.22); this.tone({ f: 80, to: 45, dur: 0.32, type: 'sine', vol: 0.16 }); this.noise({ dur: 0.2, vol: 0.05, f: 400, to: 120 });
  }
  waveClear() { [660, 880, 1100].forEach((f, i) => this.tone({ f, dur: 0.22, type: 'triangle', vol: 0.08, delay: i * 0.08, rev: 0.35 })); this.tone({ f: 1760, dur: 0.6, type: 'sine', vol: 0.03, delay: 0.25, rev: 0.6 }); }
  levelUp() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone({ f, dur: 0.26, type: 'square', vol: 0.05, lp: 3200, delay: i * 0.1, rev: 0.3 }));
    [523, 659, 784, 1047].forEach(f => this.tone({ f, dur: 1.4, type: 'triangle', vol: 0.05, attack: 0.05, sus: 0.4, delay: 0.7, rev: 0.5 }));
    [2093, 2637, 3136].forEach((f, i) => this.tone({ f, dur: 0.9, type: 'sine', vol: 0.025, delay: 0.75 + i * 0.07, rev: 0.7 })); this.noise({ dur: 0.5, vol: 0.05, f: 6000, type: 'highpass', delay: 0.7 });
  }
  gameOver() {
    [392, 370, 330, 262].forEach((f, i) => this.tone({ f, dur: 0.5, type: 'triangle', vol: 0.08, delay: i * 0.24, rev: 0.45 }));
    this.tone({ f: 98, to: 65, dur: 1.6, type: 'sawtooth', vol: 0.07, lp: 400, attack: 0.1, sus: 0.4, delay: 0.2, rev: 0.4 });
  }

  // ======================= MUSIC =======================
  /** picks the soundtrack: mood (menu / build phase / battle / boss / victory / defeat) and the biome's key */
  setMusic(mode: MusicMode, biome: number) {
    const b = ((biome % BM.length) + BM.length) % BM.length;
    if (mode === this.mode && b === this.biome) return;
    const prev = this.mode; this.mode = mode;
    if (b !== this.biome) { this.biome = b; const c = this.ctx; if (c && this.windGain) this.windGain.gain.setTargetAtTime(b === 2 ? 0.06 : 0.035, c.currentTime, 0.8); }
    if (mode === 'win' || mode === 'lose' || prev === 'off') { this.step = 0; this.loops = 0; }
    this.syncMusic();
  }
  private syncMusic() {
    const c = this.ctx; if (!c || !this.musicLP) return;
    const want = this._musicOn && this.mode !== 'off';
    if (want && this.timer === null) { this.nextT = c.currentTime + 0.08; this.timer = window.setInterval(() => this.pump(), 25); }
    if (!want && this.timer !== null) { window.clearInterval(this.timer); this.timer = null; }
    const f = this.mode === 'battle' ? 7000 : this.mode === 'boss' ? 6000 : this.mode === 'lose' ? 1400 : this.mode === 'win' ? 6500 : 3400;
    this.musicLP.frequency.setTargetAtTime(f, c.currentTime, 0.4);
  }
  private pump() {
    const c = this.ctx; if (!c || !this._musicOn || this.mode === 'off') return;
    const eighth = 60 / (BPM[this.mode] * BM[this.biome].tempo) / 2;
    if (this.nextT < c.currentTime - 0.05) this.nextT = c.currentTime + 0.04;
    while (this.nextT < c.currentTime + 0.14) { this.playStep(this.nextT, eighth); this.nextT += eighth; this.step = (this.step + 1) % 32; if (this.step === 0) this.loops++; }
  }
  private inst(k: Inst, midi: number, at: number, dur: number, vol: number, pan = 0) {
    const f = mtof(midi);
    switch (k) {
      case 'bass': this.tone({ f, dur, type: 'triangle', vol, at, lp: 700, bus: 'music', attack: 0.012 }); this.tone({ f: f * 2, dur: dur * 0.5, type: 'sine', vol: vol * 0.35, at, bus: 'music' }); break;
      case 'pluck': this.tone({ f, dur, type: 'sawtooth', vol, at, lp: 3200, lpTo: 600, q: 1.2, bus: 'music', attack: 0.004, pan, rev: 0.2 }); break;
      case 'marimba': this.tone({ f, dur, type: 'sine', vol, at, bus: 'music', attack: 0.004, pan, rev: 0.25 }); this.tone({ f: f * 4, dur: dur * 0.25, type: 'sine', vol: vol * 0.35, at, bus: 'music', pan }); break;
      case 'pad': this.tone({ f, dur, type: 'sawtooth', vol: vol * 0.6, at, lp: 900, bus: 'music', attack: 0.35, sus: 0.6, det: -7, pan: -0.3, rev: 0.5 }); this.tone({ f, dur, type: 'sawtooth', vol: vol * 0.6, at, lp: 900, bus: 'music', attack: 0.35, sus: 0.6, det: 7, pan: 0.3, rev: 0.5 }); break;
      case 'bell': this.tone({ f, dur, type: 'sine', vol, at, bus: 'music', attack: 0.003, pan, rev: 0.6 }); this.tone({ f: f * 2.76, dur: dur * 0.5, type: 'sine', vol: vol * 0.25, at, bus: 'music', pan, rev: 0.6 }); break;
      case 'lead': this.tone({ f, dur, type: 'square', vol, at, lp: 2600, bus: 'music', attack: 0.01, pan, rev: 0.25 }); break;
      case 'arp': this.tone({ f, dur, type: 'triangle', vol, at, lp: 3500, bus: 'music', attack: 0.003, pan, rev: 0.2 }); break;
    }
  }
  private kick(at: number, v: number) { this.tone({ f: 150, to: 40, dur: 0.22, type: 'sine', vol: v, at, bus: 'music', attack: 0.002 }); this.noise({ dur: 0.02, vol: v * 0.25, f: 3000, type: 'highpass', at, bus: 'music' }); }
  private snare(at: number, v: number) { this.noise({ dur: 0.16, vol: v, f: 1900, to: 1200, q: 0.8, type: 'bandpass', at, bus: 'music' }); this.tone({ f: 200, to: 120, dur: 0.1, type: 'triangle', vol: v * 0.7, at, bus: 'music' }); }
  private clap(at: number, v: number) { for (let i = 0; i < 3; i++) this.noise({ dur: 0.05, vol: v, f: 1500, q: 0.9, type: 'bandpass', at: at + i * 0.012, bus: 'music' }); }
  private hat(at: number, v: number, open: boolean) { this.noise({ dur: open ? 0.16 : 0.04, vol: v, f: 7500, type: 'highpass', at, bus: 'music' }); }
  private shaker(at: number, v: number) { this.noise({ dur: 0.05, vol: v, f: 5200, q: 1.2, type: 'bandpass', at, bus: 'music' }); }
  private wood(at: number, v: number) { this.tone({ f: 980, to: 880, dur: 0.06, type: 'sine', vol: v, at, bus: 'music' }); }
  private tom(at: number, f: number, v: number) { this.tone({ f, to: f * 0.55, dur: 0.22, type: 'sine', vol: v, at, bus: 'music' }); }

  private playStep(t: number, e: number) {
    const m = this.mode; const step = this.step; const s = step & 7; const bar = (step >> 3) & 3;
    const B = BM[this.biome]; const ch = (B.min ? PROG_MIN : PROG_MAJ)[bar]; const root = B.root + ch.r;
    const tri = ch.m ? [0, 3, 7] : [0, 4, 7]; const pent = B.min ? PENT_MIN : PENT_MAJ;
    const mi = B.motif[step]; const mel = mi >= 0 ? B.root + 12 + 12 * Math.floor(mi / 5) + pent[mi % 5] : -1; const odd = this.loops % 2 === 1;
    if (m === 'menu' || m === 'calm') {
      const soft = m === 'menu' ? 0.85 : 1;
      if (s === 0) { for (const i of tri) this.inst('pad', root + i, t, e * 7.6, 0.05 * soft); this.inst('bass', root - 12, t, e * 3, 0.13 * soft); }
      if (s === 4) this.inst('bass', root - 5, t, e * 2.2, 0.09 * soft);
      if (mel >= 0) this.inst('marimba', mel, t, e * 1.6, (odd ? 0.06 : 0.08) * soft, ((step % 5) - 2) * 0.1);
      if (s === 2 || s === 6) this.wood(t, m === 'menu' ? 0.018 : 0.03);
      if (s % 2 === 1) this.shaker(t, 0.012);
      if (s === 0 && m === 'menu') this.kick(t, 0.07);
      if (s === 0 && bar % 2 === 1) this.inst('bell', root + 24, t + e, e * 4, 0.035, 0.2);
    } else if (m === 'battle') {
      if (s === 0 || s === 2 || s === 3 || s === 4 || s === 6) this.inst('bass', root - 12 + (s === 3 ? 12 : s === 6 ? 7 : 0), t, e * 0.9, 0.15);
      if (s === 2 || s === 5) for (const i of tri) this.inst('pluck', root + 12 + i, t, e * 0.8, 0.045, (i - 4) * 0.05);
      this.inst('arp', root + 24 + tri[s % 3], t, e * 0.6, 0.025, (s - 4) * 0.12);
      if (mel >= 0) { if (!odd) this.inst('lead', mel, t, e * 1.4, 0.055, 0.1); else this.inst('marimba', mel + 12, t, e * 1.2, 0.05, 0.15); }
      if (s === 0 || s === 4 || (s === 3 && bar % 2 === 1)) this.kick(t, 0.2);
      if (s === 2 || s === 6) this.snare(t, 0.12);
      this.hat(t, s === 7 ? 0.028 : 0.018, s === 7);
    } else if (m === 'boss') {
      this.inst('bass', root - 12 + (s % 2 ? 12 : 0), t, e * 0.85, 0.16);
      if (s === 0 || s === 3 || s === 6) for (const i of tri) this.inst('pluck', root + 12 + i, t, e * 1.1, 0.055);
      if (mel >= 0) this.inst('lead', mel, t, e * 1.4, 0.06);
      if (s === 0 || s === 3 || s === 4 || s === 7) this.kick(t, 0.22);
      if (s === 2 || s === 6) this.snare(t, 0.14);
      this.hat(t, 0.02, false);
      if (bar === 3 && s >= 5) this.tom(t, 160 - (s - 5) * 30, 0.14);
      if (s === 0 && bar % 2 === 0) this.inst('bell', root + 24, t, e * 3, 0.03, -0.2);
    } else if (m === 'win') {
      if (s === 0 || s === 4) this.kick(t, 0.12);
      if (s === 2 || s === 6) this.clap(t, 0.07);
      this.inst('arp', root + 12 + tri[s % 3] + (s > 3 ? 12 : 0), t, e * 0.9, 0.05, (s - 4) * 0.1);
      if (s === 0) { for (const i of tri) this.inst('pad', root + i, t, e * 7.6, 0.045); this.inst('bass', root - 12, t, e * 3, 0.12); }
      if (mel >= 0) this.inst('bell', mel + 12, t, e * 1.8, 0.06, 0.1);
    } else if (m === 'lose') {
      if (s === 0 && bar % 2 === 0) for (const i of [0, 3, 7]) this.inst('pad', B.root - 12 + i + (bar === 2 ? -2 : 0), t, e * 15, 0.06);
      if (s === 4 && bar % 2 === 0) this.inst('bell', B.root + 12 + (bar === 0 ? 7 : 3), t, e * 4, 0.045, 0.1);
    }
  }

  // ======================= AMBIENCE =======================
  private startAmbience() {
    const c = this.ctx!; if (!this.noiseBuf) return;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 450; bp.Q.value = 0.6;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 220; lfo.connect(lg); lg.connect(bp.frequency);
    const g = c.createGain(); g.gain.value = 0.035;
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.13; const lg2 = c.createGain(); lg2.gain.value = 0.015; lfo2.connect(lg2); lg2.connect(g.gain);
    src.connect(bp); bp.connect(g); g.connect(this.ambBus); src.start(); lfo.start(); lfo2.start(); this.windGain = g;
    const loop = () => { this.critter(); this.ambTimer = window.setTimeout(loop, 2200 + Math.random() * 4800); };
    this.ambTimer = window.setTimeout(loop, 2500);
  }
  private critter() {
    if (!this.ctx || this._muted || document.hidden) return; const b = this.biome; const pan = rnd(-0.8, 0.8);
    if (b === 0 || b === 1 || b === 3) { // birds
      const base = b === 1 ? 1900 : b === 3 ? 2600 : 2300; const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) { const f = base + rnd(-250, 350); this.tone({ f, to: f * rnd(1.15, 1.45), dur: 0.07, type: 'sine', vol: 0.022, delay: i * 0.1, bus: 'amb', pan, rev: 0.35, prio: 0 }); }
    } else if (b === 2) { // frost: a soft wind chime
      const f = [1568, 1760, 2093, 2349][Math.floor(Math.random() * 4)];
      this.tone({ f, dur: 1.4, type: 'sine', vol: 0.02, bus: 'amb', pan, rev: 0.7, prio: 0 }); this.tone({ f: f * 2.76, dur: 0.6, type: 'sine', vol: 0.006, bus: 'amb', pan, rev: 0.7, prio: 0 });
    } else { // crystal forest: sparkling glints
      const m = 84 + PENT_MAJ[Math.floor(Math.random() * 5)] + (Math.random() < 0.4 ? 12 : 0);
      this.tone({ f: mtof(m), dur: 1.1, type: 'sine', vol: 0.02, bus: 'amb', pan, rev: 0.7, prio: 0 });
    }
  }
}
