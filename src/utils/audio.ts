// 社畜すごろく — Web Audio API 効果音シンセサイザー
// 共通オーディオ設定 (src/game/common/audioSettings.ts) の se / seVolume に完全連動する。

import {
  getAudioSettings,
  setAudioSettings,
  subscribeAudioSettings,
} from '@/game/common/audioSettings';

export type SeType =
  | 'roll'
  | 'dice-hit'
  | 'move'
  | 'good'
  | 'bad'
  | 'fanfare'
  | 'click'
  | 'card'
  | 'coin'
  | 'stamp';

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private seEnabled = true;
  private seVolume = 0.8;

  constructor() {
    if (typeof window !== 'undefined') {
      const sync = () => {
        const s = getAudioSettings();
        this.seEnabled = s.se;
        this.seVolume = s.seVolume;
      };
      sync();
      subscribeAudioSettings((s) => {
        this.seEnabled = s.se;
        this.seVolume = s.seVolume;
      });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const w = window as WebkitWindow;
      const Ctor = window.AudioContext || w.webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    const current = getAudioSettings();
    const nextSe = !current.se;
    setAudioSettings({ se: nextSe, bgm: nextSe });
    return !nextSe;
  }

  public get muted(): boolean {
    return !getAudioSettings().se;
  }

  public playSe(type: SeType): void {
    const settings = getAudioSettings();
    if (!settings.se || settings.seVolume <= 0) return;

    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const vol = Math.max(0.05, Math.min(1, settings.seVolume));

    switch (type) {
      case 'click': {
        this.tone(ctx, 920, 1380, now, 0.055, 'triangle', 0.12 * vol);
        break;
      }

      case 'card': {
        this.tone(ctx, 320, 780, now, 0.08, 'sine', 0.1 * vol);
        this.tone(ctx, 640, 960, now + 0.03, 0.06, 'triangle', 0.08 * vol);
        break;
      }

      case 'roll': {
        for (let i = 0; i < 4; i++) {
          const t = now + i * 0.055;
          const base = 260 + ((i * 97) % 240);
          this.tone(ctx, base, base * 1.45, t, 0.04, 'square', 0.09 * vol);
        }
        break;
      }

      case 'dice-hit': {
        this.tone(ctx, 180, 95, now, 0.09, 'triangle', 0.22 * vol);
        this.tone(ctx, 720, 1080, now + 0.02, 0.08, 'sine', 0.14 * vol);
        break;
      }

      case 'move': {
        // コマが盤面を跳ねる木製タップ音
        this.tone(ctx, 440, 680, now, 0.065, 'triangle', 0.15 * vol);
        this.tone(ctx, 220, 140, now + 0.04, 0.045, 'sine', 0.1 * vol);
        break;
      }

      case 'coin': {
        this.note(ctx, 987.77, now, 0.08, 'sine', 0.15 * vol); // B5
        this.note(ctx, 1318.51, now + 0.075, 0.26, 'triangle', 0.18 * vol); // E6
        break;
      }

      case 'stamp': {
        // 決裁印「ドン！」
        this.tone(ctx, 150, 55, now, 0.16, 'sawtooth', 0.24 * vol);
        this.tone(ctx, 520, 260, now + 0.015, 0.09, 'square', 0.12 * vol);
        break;
      }

      case 'good': {
        this.note(ctx, 523.25, now, 0.09, 'triangle', 0.15 * vol); // C5
        this.note(ctx, 659.25, now + 0.08, 0.09, 'triangle', 0.15 * vol); // E5
        this.note(ctx, 783.99, now + 0.16, 0.11, 'triangle', 0.16 * vol); // G5
        this.note(ctx, 1046.5, now + 0.25, 0.28, 'triangle', 0.18 * vol); // C6
        break;
      }

      case 'bad': {
        this.tone(ctx, 310, 195, now, 0.18, 'sawtooth', 0.14 * vol);
        this.tone(ctx, 233, 130, now + 0.15, 0.28, 'sawtooth', 0.16 * vol);
        break;
      }

      case 'fanfare': {
        const notes: [number, number, number][] = [
          [523.25, 0, 0.12],
          [523.25, 0.13, 0.12],
          [523.25, 0.26, 0.12],
          [659.25, 0.4, 0.28],
          [587.33, 0.7, 0.22],
          [659.25, 0.94, 0.22],
          [783.99, 1.18, 0.55],
          [1046.5, 1.22, 0.55],
        ];
        for (const [freq, offset, dur] of notes) {
          this.note(ctx, freq, now + offset, dur, 'triangle', 0.15 * vol);
        }
        break;
      }
    }
  }

  private tone(
    ctx: AudioContext,
    startFreq: number,
    endFreq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.012, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private note(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  public playBgm(): void {
    // BGMは共通シーケンサー (useBgm / src/game/common/bgm.ts) で管理
  }

  public stopBgm(): void {
    // BGMは共通シーケンサー (useBgm / src/game/common/bgm.ts) で管理
  }
}

export const audioManager = new AudioManager();
