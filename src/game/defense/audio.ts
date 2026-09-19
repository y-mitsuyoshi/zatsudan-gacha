/** Minimal procedural SFX synth. No assets, lazy AudioContext. */

export class DefenseSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private muted = false;
  private last: Record<string, number> = {};

  setMuted(m: boolean): void {
    this.muted = m;
  }

  unlock(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) void this.ctx.resume();
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
      this.master.gain.value = 0.2;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.3);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
      this.master = null;
    }
    return this.ctx;
  }

  private throttle(key: string, ms: number): boolean {
    const now = performance.now();
    if (now - (this.last[key] ?? 0) < ms) return true;
    this.last[key] = now;
    return false;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slide !== 0) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ctx.currentTime + dur);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.master);
      o.start();
      o.stop(ctx.currentTime + dur + 0.02);
    } catch {
      /* ignore */
    }
  }

  private noise(dur: number, vol: number, filterFreq: number): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuf) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start();
      src.stop(ctx.currentTime + dur + 0.02);
    } catch {
      /* ignore */
    }
  }

  shoot(): void {
    if (this.throttle('shoot', 50)) return;
    this.tone(720 + Math.random() * 120, 0.07, 'square', 0.08, -320);
  }

  shotgun(): void {
    if (this.throttle('shotgun', 120)) return;
    this.noise(0.18, 0.25, 1800);
  }

  boom(): void {
    if (this.throttle('boom', 90)) return;
    this.noise(0.4, 0.4, 700);
    this.tone(90, 0.35, 'sine', 0.3, -50);
  }

  hit(): void {
    if (this.throttle('hit', 60)) return;
    this.tone(220, 0.06, 'sawtooth', 0.07, -80);
  }

  kill(): void {
    if (this.throttle('kill', 70)) return;
    this.tone(330, 0.12, 'square', 0.1, 220);
  }

  pickup(): void {
    this.tone(660, 0.1, 'sine', 0.16, 330);
    setTimeout(() => this.tone(990, 0.12, 'sine', 0.14, 0), 70);
  }

  rescue(): void {
    this.tone(520, 0.12, 'triangle', 0.18, 260);
    setTimeout(() => this.tone(780, 0.14, 'triangle', 0.18, 260), 90);
  }

  hurt(): void {
    if (this.throttle('hurt', 200)) return;
    this.tone(140, 0.25, 'sawtooth', 0.22, -60);
    this.noise(0.2, 0.2, 900);
  }

  waveClear(): void {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.16, 0), i * 100));
  }

  gameOver(victory: boolean): void {
    const seq = victory ? [523, 659, 784, 1047] : [392, 330, 262, 196];
    seq.forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.18, 0), i * 150));
  }
}
