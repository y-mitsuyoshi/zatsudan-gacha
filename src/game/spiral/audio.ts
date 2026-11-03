/**
 * 社畜スパイラルディフェンス — WebAudio SFX (all synthesized, no assets).
 * Linked with shared audioSettings (getAudioSettings().se / subscribeAudioSettings).
 */

import { getAudioSettings, subscribeAudioSettings, type AudioSettings } from '../common/audioSettings';

export class SpiralSound {
  private ctx: AudioContext | null = null;
  private muted = false;
  private seOn = true;
  private seVolume = 0.8;
  private unsub: (() => void) | null = null;
  private lastPlay: Record<string, number> = {};

  constructor() {
    if (typeof window === 'undefined') return;
    this.applySettings(getAudioSettings());
    this.unsub = subscribeAudioSettings((s) => this.applySettings(s));
  }

  private applySettings(s: AudioSettings): void {
    this.seOn = s.se;
    this.seVolume = s.seVolume;
  }

  unlock(): void {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
    } catch {
      /* audio unavailable */
    }
  }

  suspend(): void {
    try {
      if (this.ctx?.state === 'running') void this.ctx.suspend();
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

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
  }

  private throttle(key: string, ms: number): boolean {
    const now = performance.now();
    if (now - (this.lastPlay[key] ?? 0) < ms) return true;
    this.lastPlay[key] = now;
    return false;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delaySec = 0): void {
    if (this.muted || !this.seOn) return;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime + delaySec;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const gainVal = Math.max(0.0002, vol * this.seVolume);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
      g.gain.setValueAtTime(gainVal, t);
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
    this.tone(640 + Math.random() * 160, 0.07, 'square', 0.03, -260);
  }

  hit(): void {
    if (this.throttle('hit', 70)) return;
    this.tone(200 + Math.random() * 80, 0.06, 'sawtooth', 0.035, -70);
  }

  segDown(): void {
    if (this.throttle('seg', 80)) return;
    this.tone(480, 0.08, 'triangle', 0.05, 240);
  }

  coin(): void {
    if (this.throttle('coin', 70)) return;
    this.tone(1320, 0.08, 'sine', 0.045, 440);
  }

  hurt(): void {
    if (this.throttle('hurt', 220)) return;
    this.tone(170, 0.18, 'sawtooth', 0.09, -90);
  }

  upgrade(): void {
    this.tone(523, 0.1, 'triangle', 0.07, 0, 0);
    this.tone(784, 0.16, 'triangle', 0.08, 0, 0.09);
  }

  waveClear(): void {
    const seq = [523, 659, 784];
    seq.forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.08, 0, i * 0.11));
  }

  boss(): void {
    this.tone(110, 0.5, 'sawtooth', 0.1, -40, 0);
    this.tone(110, 0.5, 'sawtooth', 0.1, -40, 0.35);
  }

  heal(): void {
    this.tone(440, 0.15, 'sine', 0.06, 440);
  }

  victory(): void {
    const seq = [523, 659, 784, 1046, 784, 1046];
    seq.forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.09, 0, i * 0.13));
  }

  defeat(): void {
    const seq = [392, 349, 311, 262];
    seq.forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.07, 0, i * 0.17));
  }
}
