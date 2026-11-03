/**
 * 社畜ゲーム共通 — 合成BGMシーケンサー (WebAudio, 外部アセット不要)。
 *
 * 楽曲データは ./bgmTracks.ts に定義する (BgmTrack 形式)。
 * - 1ステップ = 16分音符。パターンは空白区切りのトークン列。
 *   音符: "C4" "F#3" "Bb5"、休符: "."、直前の音を伸ばす: "-"、"|" は小節区切り(無視)。
 * - ドラムは 'x' = 鳴らす / 'o' = アクセント弱 / '.' = 休み の文字列 (1文字=1ステップ, '|' と空白は無視)。
 *
 * 使い方:
 *   bgm.play('spiral-battle');   // 同じ曲なら何もしない。設定でBGM OFFなら鳴らさない
 *   bgm.stop();                  // フェードアウト停止
 *   bgm.pause() / bgm.resume();  // ゲームのポーズ連動
 * 設定 (audioSettings) の変更には自動追従する。
 */

import { getAudioSettings, subscribeAudioSettings } from './audioSettings';
import { BGM_TRACKS } from './bgmTracks';

export type Wave = 'square' | 'triangle' | 'sawtooth' | 'sine';

export interface BgmVoice {
  id: string;
  wave: Wave;
  /** 0..1 相対音量 (目安 0.05〜0.25) */
  gain: number;
  /** 秒 */
  attack?: number;
  /** 秒 (ノート終了後のリリース) */
  release?: number;
  /** ローパスのカットオフHz (省略で無効) */
  cutoff?: number;
  /** デチューン(cent)した2本目のオシレーターを重ねる */
  detune?: number;
  /** -1..1 */
  pan?: number;
  /** ビブラート深さ(cent) */
  vibrato?: number;
}

export interface BgmDrums {
  kick?: string;
  snare?: string;
  hat?: string;
  /** オープンハット/シンバル */
  crash?: string;
}

export interface BgmSection {
  /** 小節数 (4/4 前提: 1小節 = 16ステップ) */
  bars: number;
  /** voice.id → パターン文字列 (bars*16 トークン。短い場合はループして埋める) */
  voices: Record<string, string>;
  drums?: BgmDrums;
}

export interface BgmTrack {
  id: string;
  title: string;
  bpm: number;
  /** 0..0.5 シャッフル量 (裏の16分を遅らせる) */
  swing?: number;
  /** 0..1 トラック全体の音量補正 */
  master?: number;
  voices: BgmVoice[];
  /** 先頭から順に再生し、末尾まで来たら loopFrom (既定0) に戻る */
  sections: BgmSection[];
  loopFrom?: number;
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteToMidi(tok: string): number | null {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(tok);
  if (!m) return null;
  let n = NOTE_INDEX[m[1].toUpperCase()];
  if (m[2] === '#') n += 1;
  if (m[2] === 'b') n -= 1;
  return (parseInt(m[3], 10) + 1) * 12 + n;
}

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** パターン文字列 → ステップ配列 (number=発音, 'hold'=伸ばす, null=休符) */
export function parsePattern(p: string): Array<number | 'hold' | null> {
  const out: Array<number | 'hold' | null> = [];
  for (const tok of p.trim().split(/\s+/)) {
    if (!tok || tok === '|') continue;
    if (tok === '.') out.push(null);
    else if (tok === '-') out.push('hold');
    else {
      const m = noteToMidi(tok);
      out.push(m);
    }
  }
  return out;
}

export function parseDrum(p: string): Array<0 | 1 | 2> {
  const out: Array<0 | 1 | 2> = [];
  for (const ch of p) {
    if (ch === 'x' || ch === 'X') out.push(2);
    else if (ch === 'o') out.push(1);
    else if (ch === '.' || ch === '-') out.push(0);
  }
  return out;
}

interface CompiledSection {
  steps: number;
  voices: Map<string, Array<number | 'hold' | null>>;
  drums: Partial<Record<keyof BgmDrums, Array<0 | 1 | 2>>>;
}

function compile(track: BgmTrack): CompiledSection[] {
  return track.sections.map((s) => {
    const steps = s.bars * 16;
    const fill = <T,>(arr: T[], empty: T): T[] => {
      if (arr.length === 0) return new Array(steps).fill(empty);
      const res: T[] = [];
      for (let i = 0; i < steps; i++) res.push(arr[i % arr.length]);
      return res;
    };
    const voices = new Map<string, Array<number | 'hold' | null>>();
    for (const [id, pat] of Object.entries(s.voices)) voices.set(id, fill(parsePattern(pat), null));
    const drums: CompiledSection['drums'] = {};
    if (s.drums) {
      for (const k of ['kick', 'snare', 'hat', 'crash'] as const) {
        const d = s.drums[k];
        if (d) drums[k] = fill(parseDrum(d), 0);
      }
    }
    return { steps, voices, drums };
  });
}

class BgmPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private trackGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private trackId: string | null = null;
  private track: BgmTrack | null = null;
  private compiled: CompiledSection[] = [];
  private section = 0;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private paused = false;
  private wanted: string | null = null;
  private unsub: (() => void) | null = null;
  private unlockBound = false;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.ratio.value = 4;
        this.master = this.ctx.createGain();
        this.master.gain.value = getAudioSettings().bgmVolume * 0.5;
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch {
        this.ctx = null;
        return null;
      }
    }
    if (!this.unsub) {
      this.unsub = subscribeAudioSettings((s) => {
        if (this.master && this.ctx) this.master.gain.setTargetAtTime(s.bgmVolume * 0.5, this.ctx.currentTime, 0.05);
        if (!s.bgm) this.halt(0.3);
        else if (this.wanted && !this.trackId) this.start(this.wanted);
      });
    }
    this.bindUnlock();
    return this.ctx;
  }

  /** 自動再生ポリシー対策: 最初のユーザー操作で AudioContext を resume する */
  private bindUnlock(): void {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended' && !this.paused) void this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  /** 再生リクエスト。BGMがOFFでも「再生したい曲」として記憶し、ONにした時点で鳴らす。 */
  play(id: string): void {
    this.wanted = id;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (!getAudioSettings().bgm) return;
    if (this.trackId === id && this.timer) return;
    this.start(id);
  }

  private start(id: string): void {
    const ctx = this.ctx;
    const track = BGM_TRACKS[id];
    if (!ctx || !this.master || !track) return;
    this.halt(0.25);
    this.track = track;
    this.trackId = id;
    this.compiled = compile(track);
    this.section = 0;
    this.step = 0;
    this.trackGain = ctx.createGain();
    this.trackGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.trackGain.gain.exponentialRampToValueAtTime(Math.max(0.001, track.master ?? 0.8), ctx.currentTime + 0.6);
    this.trackGain.connect(this.master);
    if (ctx.state === 'suspended' && !this.paused) void ctx.resume();
    this.nextTime = ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  /** フェードアウトして停止 (wanted は消す) */
  stop(fade = 0.5): void {
    this.wanted = null;
    this.halt(fade);
  }

  private halt(fade: number): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const g = this.trackGain;
    const ctx = this.ctx;
    if (g && ctx) {
      try {
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + Math.max(0.02, fade));
        setTimeout(() => {
          try {
            g.disconnect();
          } catch {
            /* noop */
          }
        }, fade * 1000 + 200);
      } catch {
        /* noop */
      }
    }
    this.trackGain = null;
    this.trackId = null;
    this.track = null;
  }

  pause(): void {
    this.paused = true;
    try {
      void this.ctx?.suspend();
    } catch {
      /* noop */
    }
  }

  resume(): void {
    this.paused = false;
    try {
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
    } catch {
      /* noop */
    }
  }

  get current(): string | null {
    return this.trackId;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const track = this.track;
    if (!ctx || !track || !this.trackGain) return;
    if (ctx.state !== 'running') {
      // keep the clock aligned while suspended so we don't burst-schedule on resume
      this.nextTime = Math.max(this.nextTime, ctx.currentTime + 0.05);
      return;
    }
    const stepDur = 60 / track.bpm / 4;
    // if the tab was throttled, skip ahead instead of firing a backlog
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const sec = this.compiled[this.section];
      if (!sec) return;
      const swing = track.swing && this.step % 2 === 1 ? stepDur * track.swing : 0;
      this.playStep(sec, this.step, this.nextTime + swing, stepDur);
      this.nextTime += stepDur;
      this.step++;
      if (this.step >= sec.steps) {
        this.step = 0;
        this.section++;
        if (this.section >= this.compiled.length) this.section = Math.min(track.loopFrom ?? 0, this.compiled.length - 1);
      }
    }
  }

  private playStep(sec: CompiledSection, step: number, t: number, stepDur: number): void {
    const track = this.track;
    if (!track) return;
    for (const v of track.voices) {
      const pat = sec.voices.get(v.id);
      if (!pat) continue;
      const n = pat[step];
      if (typeof n !== 'number') continue;
      let len = 1;
      while (step + len < pat.length && pat[step + len] === 'hold') len++;
      this.note(v, n, t, len * stepDur);
    }
    const d = sec.drums;
    if (d.kick?.[step]) this.kick(t, d.kick[step] === 2 ? 1 : 0.6);
    if (d.snare?.[step]) this.snare(t, d.snare[step] === 2 ? 1 : 0.5);
    if (d.hat?.[step]) this.hat(t, d.hat[step] === 2 ? 1 : 0.55, 0.04);
    if (d.crash?.[step]) this.hat(t, d.crash[step] === 2 ? 0.9 : 0.5, 0.45);
  }

  private note(v: BgmVoice, midi: number, t: number, dur: number): void {
    const ctx = this.ctx;
    const out = this.trackGain;
    if (!ctx || !out) return;
    const atk = v.attack ?? 0.005;
    const rel = v.release ?? 0.08;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v.gain), t + atk);
    g.gain.setValueAtTime(Math.max(0.0002, v.gain), t + Math.max(atk, dur - 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    let node: AudioNode = g;
    if (v.cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = v.cutoff;
      f.Q.value = 0.8;
      g.connect(f);
      node = f;
    }
    if (v.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = v.pan;
      node.connect(p);
      node = p;
    }
    node.connect(out);
    const freq = midiToFreq(midi);
    const oscs: OscillatorNode[] = [];
    const mk = (cents: number) => {
      const o = ctx.createOscillator();
      o.type = v.wave;
      o.frequency.setValueAtTime(freq, t);
      o.detune.setValueAtTime(cents, t);
      o.connect(g);
      oscs.push(o);
    };
    mk(0);
    if (v.detune) mk(v.detune);
    if (v.vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = v.vibrato;
      lfo.connect(lg);
      oscs.forEach((o) => lg.connect(o.detune));
      lfo.start(t);
      lfo.stop(t + dur + rel + 0.05);
    }
    oscs.forEach((o) => {
      o.start(t);
      o.stop(t + dur + rel + 0.05);
    });
  }

  private kick(t: number, vel: number): void {
    const ctx = this.ctx;
    const out = this.trackGain;
    if (!ctx || !out) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.55 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.25);
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, vol: number, dur: number): void {
    const ctx = this.ctx;
    const out = this.trackGain;
    if (!ctx || !out || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private snare(t: number, vel: number): void {
    this.noiseHit(t, 'bandpass', 1800, 0.32 * vel, 0.16);
    const ctx = this.ctx;
    const out = this.trackGain;
    if (!ctx || !out) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    g.gain.setValueAtTime(0.18 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.12);
  }

  private hat(t: number, vel: number, dur: number): void {
    this.noiseHit(t, 'highpass', 7500, 0.12 * vel, dur);
  }
}

/** アプリ全体で1つのBGMプレイヤー */
export const bgm = new BgmPlayer();
