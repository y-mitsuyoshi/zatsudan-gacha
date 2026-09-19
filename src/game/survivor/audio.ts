/**
 * 社畜サバイバー — WebAudio SFX (no assets, all synthesized).
 */

export class SurvivorSound {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastPlay: Record<string, number> = {};

  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      /* audio unavailable */
    }
  }

  suspend(): void {
    try {
      void this.ctx?.suspend();
    } catch {
      /* noop */
    }
  }

  resume(): void {
    try {
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
    } catch {
      /* noop */
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }

  private throttle(key: string, ms: number): boolean {
    const now = performance.now();
    if (now - (this.lastPlay[key] ?? 0) < ms) return true;
    this.lastPlay[key] = now;
    return false;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0): void {
    if (this.muted) return;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      /* noop */
    }
  }

  shoot(): void {
    if (this.throttle('shoot', 90)) return;
    this.tone(720 + Math.random() * 200, 0.07, 'square', 0.03, -300);
  }

  hit(): void {
    if (this.throttle('hit', 70)) return;
    this.tone(220 + Math.random() * 80, 0.06, 'sawtooth', 0.035, -80);
  }

  kill(): void {
    if (this.throttle('kill', 80)) return;
    this.tone(520, 0.09, 'triangle', 0.05, 260);
  }

  pickup(): void {
    if (this.throttle('pickup', 60)) return;
    this.tone(880 + Math.random() * 240, 0.08, 'sine', 0.05, 320);
  }

  coin(): void {
    if (this.throttle('coin', 90)) return;
    this.tone(1320, 0.08, 'sine', 0.045, 440);
  }

  hurt(): void {
    if (this.throttle('hurt', 200)) return;
    this.tone(180, 0.18, 'sawtooth', 0.09, -100);
  }

  dash(): void {
    if (this.throttle('dash', 300)) return;
    this.tone(280, 0.14, 'sine', 0.07, 620);
  }

  levelup(): void {
    this.tone(523, 0.12, 'triangle', 0.08);
    window.setTimeout(() => this.tone(659, 0.12, 'triangle', 0.08), 90);
    window.setTimeout(() => this.tone(784, 0.18, 'triangle', 0.09), 180);
  }

  select(): void {
    this.tone(660, 0.1, 'triangle', 0.07, 220);
  }

  chest(): void {
    this.tone(392, 0.12, 'triangle', 0.08);
    window.setTimeout(() => this.tone(523, 0.12, 'triangle', 0.08), 100);
    window.setTimeout(() => this.tone(659, 0.12, 'triangle', 0.08), 200);
    window.setTimeout(() => this.tone(1046, 0.25, 'triangle', 0.09), 300);
  }

  boss(): void {
    this.tone(110, 0.5, 'sawtooth', 0.1, -40);
    window.setTimeout(() => this.tone(110, 0.5, 'sawtooth', 0.1, -40), 350);
  }

  heal(): void {
    this.tone(440, 0.15, 'sine', 0.06, 440);
  }

  victory(): void {
    const seq = [523, 659, 784, 1046, 784, 1046];
    seq.forEach((f, i) => window.setTimeout(() => this.tone(f, 0.18, 'triangle', 0.09), i * 130));
  }

  defeat(): void {
    const seq = [392, 349, 311, 262];
    seq.forEach((f, i) => window.setTimeout(() => this.tone(f, 0.25, 'sawtooth', 0.07), i * 170));
  }
}
