/**
 * Lazy WebAudio synth for the shmup. No AudioContext is created until the
 * first user gesture (unlock), fixing autoplay warnings and SSR crashes.
 */
export class ShmupSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private muted = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private lastPlay: Record<string, number> = {};

  setMuted(m: boolean): void {
    this.muted = m;
    if (m) this.stopBgm();
  }

  get isMuted(): boolean {
    return this.muted;
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
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
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
      this.master.gain.value = 0.22;
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
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (ctx.state === 'suspended') void ctx.resume();
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
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuf) return;
    if (ctx.state === 'suspended') void ctx.resume();
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
    if (!this.gate('shoot', 70)) return;
    this.tone(880, 220, 0.08, 'square', 0.12);
  }

  enemyShoot(): void {
    if (!this.gate('eshoot', 240)) return;
    this.tone(330, 160, 0.12, 'sawtooth', 0.05);
  }

  boom(): void {
    if (!this.gate('boom', 60)) return;
    this.noise(0.25, 0.5, 900);
    this.tone(160, 40, 0.22, 'sawtooth', 0.25);
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
    if (!this.gate('pickup', 60)) return;
    this.tone(660, 1320, 0.12, 'sine', 0.25);
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

  ui(): void {
    if (!this.gate('ui', 50)) return;
    this.tone(700, 990, 0.07, 'sine', 0.18);
  }

  startBgm(base: number): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.stopBgm();
    this.bgmStep = 0;
    const bass = [0, 0, 3, 0, 5, 0, 3, 2];
    const tick = () => {
      if (this.muted || !this.ctx || !this.master) return;
      if (this.ctx.state === 'suspended') return;
      const s = this.bgmStep % 16;
      const t0 = this.ctx.currentTime;
      const root = base;
      if (s % 2 === 0) {
        const semis = bass[(s / 2) | 0] ?? 0;
        const f = root * Math.pow(2, semis / 12);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g);
        g.connect(this.master);
        osc.type = 'triangle';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.16, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
        osc.start(t0);
        osc.stop(t0 + 0.25);
      }
      if (s % 4 === 2) {
        const arp = [12, 15, 19, 24][((s / 4) | 0) % 4] ?? 12;
        const f = root * Math.pow(2, arp / 12);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g);
        g.connect(this.master);
        osc.type = 'sine';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.07, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
        osc.start(t0);
        osc.stop(t0 + 0.2);
      }
      this.bgmStep++;
    };
    this.bgmTimer = window.setInterval(tick, 165);
  }

  stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  destroy(): void {
    this.stopBgm();
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
      this.master = null;
    }
  }
}

export const shmupSound = new ShmupSound();
