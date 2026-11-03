import { getAudioSettings, setAudioSettings, subscribeAudioSettings, type AudioSettings } from '../common/audioSettings';

/**
 * Lazy WebAudio synth for the shmup's sound effects. No AudioContext is
 * created until the first user gesture (unlock), fixing autoplay warnings and
 * SSR crashes.
 *
 * ON/OFF and volume follow the shared 社畜ゲーム audio settings (効果音 toggle);
 * music is handled by the shared BGM player (`src/game/common/bgm.ts`), so
 * this class no longer runs its own BGM loop.
 */
const BASE_GAIN = 0.22;

export class ShmupSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private seOn = true;
  private seVolume = 0.8;
  private unsub: (() => void) | null = null;
  private lastPlay: Record<string, number> = {};

  constructor() {
    if (typeof window === 'undefined') return;
    this.apply(getAudioSettings());
    this.unsub = subscribeAudioSettings((s) => this.apply(s));
  }

  private apply(s: AudioSettings): void {
    this.seOn = s.se;
    this.seVolume = s.seVolume;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.seOn ? BASE_GAIN * this.seVolume : 0, this.ctx.currentTime, 0.02);
    }
  }

  /** true when the shared 効果音 setting is OFF */
  get isMuted(): boolean {
    return !this.seOn;
  }

  /** Sync with shared 効果音 setting */
  setMuted(muted: boolean): void {
    setAudioSettings({ se: !muted });
  }

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend();
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.seOn ? BASE_GAIN * this.seVolume : 0;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.3);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
      this.master = null;
    }
    return this.ctx;
  }

  private gate(key: string, ms: number): boolean {
    const now = performance.now();
    if (now - (this.lastPlay[key] ?? -1e9) < ms) return false;
    this.lastPlay[key] = now;
    return true;
  }

  private tone(
    freqFrom: number,
    freqTo: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0,
  ): void {
    if (!this.seOn) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (ctx.state === 'suspended') return; // paused / not yet unlocked
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(this.master);
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqFrom), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number): void {
    if (!this.seOn) return;
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuf) return;
    if (ctx.state === 'suspended') return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shoot(): void {
    if (!this.gate('shoot', 90)) return;
    this.tone(1200, 420, 0.05, 'square', 0.035);
  }

  enemyShoot(): void {
    if (!this.gate('eshoot', 240)) return;
    this.tone(330, 160, 0.12, 'sawtooth', 0.05);
  }

  boom(): void {
    if (!this.gate('boom', 60)) return;
    this.noise(0.25, 0.45, 900);
    this.tone(160, 40, 0.22, 'sawtooth', 0.2);
  }

  bigBoom(): void {
    this.noise(0.6, 0.7, 600);
    this.tone(120, 28, 0.5, 'sawtooth', 0.35);
  }

  hit(): void {
    if (!this.gate('hit', 120)) return;
    this.tone(220, 90, 0.15, 'triangle', 0.4);
    this.noise(0.12, 0.3, 1400);
  }

  graze(): void {
    if (!this.gate('graze', 90)) return;
    this.tone(1800, 2400, 0.05, 'sine', 0.08);
  }

  pickup(): void {
    if (!this.gate('pickup', 45)) return;
    this.tone(990, 1480, 0.07, 'sine', 0.16);
  }

  power(): void {
    this.tone(440, 880, 0.1, 'sine', 0.25);
    this.tone(880, 1760, 0.14, 'sine', 0.22, 0.08);
  }

  bomb(): void {
    this.noise(0.5, 0.6, 2400);
    this.tone(100, 800, 0.4, 'sawtooth', 0.25);
  }

  warn(): void {
    this.tone(440, 440, 0.12, 'square', 0.2);
    this.tone(440, 440, 0.12, 'square', 0.2, 0.18);
    this.tone(660, 660, 0.2, 'square', 0.22, 0.36);
  }

  /** boss phase break / spell card declaration */
  phaseBreak(): void {
    this.noise(0.35, 0.45, 1800);
    this.tone(260, 1040, 0.3, 'sawtooth', 0.18);
  }

  /** spell card captured */
  capture(): void {
    this.tone(784, 784, 0.09, 'square', 0.16);
    this.tone(988, 988, 0.09, 'square', 0.16, 0.09);
    this.tone(1319, 1319, 0.22, 'square', 0.18, 0.18);
  }

  /** stage clear fanfare */
  clear(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, f, 0.16, 'triangle', 0.26, i * 0.11));
    this.tone(1047, 1047, 0.5, 'square', 0.12, 0.44);
  }

  ui(): void {
    if (!this.gate('ui', 50)) return;
    this.tone(700, 990, 0.07, 'sine', 0.18);
  }

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
      this.master = null;
    }
  }
}

export const shmupSound = new ShmupSound();
