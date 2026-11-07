/**
 * ROYAL FLUSH NIGHT — real-time synthesized audio engine.
 *
 * Everything (BGM, SE) is generated with the Web Audio API; voice lines use
 * the browser SpeechSynthesis API (ja-JP). SSR-safe: nothing touches `window`
 * until a method is called in the browser.
 *
 * Graph:
 *   voices → [track fader] → bgmBus ─┐
 *   voices → [track wet]   → bgmRev ─┼→ reverb (convolver) ─┐
 *   SE     → seBus ──────────────────┤                      │
 *   SE     → seRev ──────────────────┘                      │
 *   bgmBus / seBus / reverb return → master → compressor → limiter → out
 */

import { resolveVoiceClipUrl, type CharId, type VoiceEvent } from './characters';

export type BgmTrack = 'title' | 'lobby' | 'table' | 'tension' | 'victory';
export type SeName =
  | 'click' | 'hover' | 'open' | 'close' | 'deal' | 'flip' | 'chip' | 'chips' | 'potSweep'
  | 'check' | 'fold' | 'bet' | 'allin' | 'cutin' | 'win' | 'bigWin' | 'lose' | 'rankUp'
  | 'tick' | 'shuffle' | 'stamp' | 'reveal' | 'levelUp';

interface Volumes { master: number; bgm: number; se: number; voice: number }
interface Bus { dry: AudioNode; wet: AudioNode; trem: AudioNode }

const LOOKAHEAD = 0.12;
const TICK_MS = 25;
const XFADE = 1.2;
const MAX_VOICES = 190;
const DUCK = 0.65;

// ───────────────────────────── engine state ─────────────────────────────
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmBus: GainNode | null = null;
let bgmRev: GainNode | null = null;
let seBusNode: GainNode | null = null;
let seRevNode: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let metalBuf: AudioBuffer | null = null;
let seBus: Bus | null = null;
let activeVoices = 0;
let ducked = false;
const vols: Volumes = { master: 0.8, bgm: 0.55, se: 0.8, voice: 1 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
/** humanize timing / velocity */
const hum = (t: number, amt = 0.006) => t + (Math.random() - 0.5) * 2 * amt;
const hv = (v: number) => v * rnd(0.88, 1.08);

function makeNoise(c: AudioContext): AudioBuffer {
  const len = Math.floor(c.sampleRate * 2);
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** 808-style metallic source: six detuned square partials + a little noise */
function makeMetal(c: AudioContext): AudioBuffer {
  const len = Math.floor(c.sampleRate * 1.5);
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  const fr = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 2.6);
  const ph = fr.map(() => Math.random());
  for (let i = 0; i < len; i++) {
    let s = 0;
    for (let k = 0; k < fr.length; k++) {
      const p = (ph[k] + (fr[k] * i) / c.sampleRate) % 1;
      s += p < 0.5 ? 1 : -1;
    }
    d[i] = (s / fr.length) * 0.7 + (Math.random() * 2 - 1) * 0.3;
  }
  return b;
}

/** procedural stereo hall impulse response (~2.2 s), darkening over time */
function makeImpulse(c: AudioContext): AudioBuffer {
  const dur = 2.2;
  const len = Math.floor(c.sampleRate * dur);
  const b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    const pre = Math.floor(c.sampleRate * 0.012);
    for (let i = 0; i < len; i++) {
      if (i < pre) { d[i] = 0; continue; }
      const x = (i - pre) / (len - pre);
      const decay = Math.pow(1 - x, 2.4) * Math.exp(-x * 2.5);
      const coef = 0.15 + 0.8 * x; // more smoothing later = darker tail
      lp = lp * coef + (Math.random() * 2 - 1) * (1 - coef);
      d[i] = lp * decay * (1.6 - x);
    }
  }
  return b;
}

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  const c = new Ctor();
  ctx = c;
  noiseBuf = makeNoise(c);
  metalBuf = makeMetal(c);

  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.25;
  const lim = c.createDynamicsCompressor();
  lim.threshold.value = -2.5;
  lim.knee.value = 0;
  lim.ratio.value = 20;
  lim.attack.value = 0.001;
  lim.release.value = 0.1;
  masterGain = c.createGain();
  masterGain.connect(comp);
  comp.connect(lim);
  lim.connect(c.destination);

  const conv = c.createConvolver();
  conv.buffer = makeImpulse(c);
  const revOut = c.createGain();
  revOut.gain.value = 0.8;
  conv.connect(revOut);
  revOut.connect(masterGain);

  bgmBus = c.createGain();
  bgmRev = c.createGain();
  seBusNode = c.createGain();
  seRevNode = c.createGain();
  bgmBus.connect(masterGain);
  bgmRev.connect(conv);
  seBusNode.connect(masterGain);
  seRevNode.connect(conv);
  seBus = { dry: seBusNode, wet: seRevNode, trem: seBusNode };
  applyVolumes(0);
  c.onstatechange = () => {
    if (c.state === 'running' && pendingTrack) {
      const tr = pendingTrack;
      pendingTrack = null;
      startTrack(tr);
    }
  };
  return c;
}

function ramp(p: AudioParam, v: number, time: number) {
  if (!ctx) return;
  const now = ctx.currentTime;
  p.cancelScheduledValues(now);
  p.setValueAtTime(p.value, now);
  if (time <= 0) p.setValueAtTime(v, now);
  else p.linearRampToValueAtTime(v, now + time);
}

function applyVolumes(time = 0.08) {
  if (!ctx || !masterGain || !bgmBus || !bgmRev || !seBusNode || !seRevNode) return;
  const b = vols.bgm * (ducked ? DUCK : 1);
  ramp(masterGain.gain, vols.master, time);
  ramp(bgmBus.gain, b, time);
  ramp(bgmRev.gain, b, time);
  ramp(seBusNode.gain, vols.se, time);
  ramp(seRevNode.gain, vols.se, time);
}

// ───────────────────────────── voice helpers ─────────────────────────────
function begin(): AudioContext | null {
  if (!ctx || activeVoices >= MAX_VOICES) return null;
  return ctx;
}

/** registers a voice; disconnects every node once `src` has ended */
function finish(src: AudioScheduledSourceNode, nodes: AudioNode[]) {
  activeVoices++;
  src.onended = () => {
    activeVoices--;
    for (const n of nodes) {
      try { n.disconnect(); } catch { /* already disconnected */ }
    }
  };
}

function route(c: AudioContext, src: AudioNode, bus: Bus, nodes: AudioNode[], pan: number, wet: number, target?: AudioNode) {
  let last: AudioNode = src;
  if (pan !== 0 && typeof c.createStereoPanner === 'function') {
    const p = c.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    src.connect(p);
    nodes.push(p);
    last = p;
  }
  last.connect(target ?? bus.dry);
  if (wet > 0) {
    const w = c.createGain();
    w.gain.value = wet;
    last.connect(w);
    w.connect(bus.wet);
    nodes.push(w);
  }
}

/** attack / decay-to-sustain / release envelope. returns end time */
function adsr(p: AudioParam, t: number, a: number, peak: number, d: number, sus: number, dur: number, rel: number): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.setTargetAtTime(peak * sus, t + a, Math.max(0.001, d / 3));
  const off = t + Math.max(dur, a + 0.005);
  p.setTargetAtTime(0, off, Math.max(0.001, rel / 4));
  return off + rel;
}

function osc(c: AudioContext, type: OscillatorType, f: number, t: number, end: number, nodes: AudioNode[], detune = 0): OscillatorNode {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (detune) o.detune.value = detune;
  o.start(t);
  o.stop(end);
  nodes.push(o);
  return o;
}

function filt(c: AudioContext, type: BiquadFilterType, f: number, q: number, nodes: AudioNode[]): BiquadFilterNode {
  const b = c.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  nodes.push(b);
  return b;
}

function gainNode(c: AudioContext, nodes: AudioNode[], v = 0): GainNode {
  const g = c.createGain();
  g.gain.value = v;
  nodes.push(g);
  return g;
}

function bufSrc(c: AudioContext, buf: AudioBuffer, t: number, end: number, nodes: AudioNode[], rate = 1, loop = true): AudioBufferSourceNode {
  const s = c.createBufferSource();
  s.buffer = buf;
  s.loop = loop;
  s.playbackRate.value = rate;
  s.start(t, loop ? Math.random() * Math.max(0, buf.duration - 0.6) : 0);
  s.stop(end);
  nodes.push(s);
  return s;
}

interface NoiseOpts { dur: number; gain: number; type: BiquadFilterType; f: number; f2?: number; q?: number; attack?: number; pan?: number; wet?: number; rate?: number }
function noise(bus: Bus, t: number, o: NoiseOpts) {
  const c = begin();
  if (!c || !noiseBuf) return;
  const nodes: AudioNode[] = [];
  const end = t + o.dur + 0.03;
  const s = bufSrc(c, noiseBuf, t, end, nodes, o.rate ?? 1);
  const f = filt(c, o.type, o.f, o.q ?? 1, nodes);
  f.frequency.setValueAtTime(o.f, t);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
  const g = gainNode(c, nodes);
  const a = o.attack ?? 0.002;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(o.dur, a + 0.01));
  s.connect(f);
  f.connect(g);
  route(c, g, bus, nodes, o.pan ?? 0, o.wet ?? 0.1);
  finish(s, nodes);
}

interface ToneOpts { type: OscillatorType; f: number; f2?: number; glide?: number; dur: number; gain: number; attack?: number; pan?: number; wet?: number; detune?: number }
function tone(bus: Bus, t: number, o: ToneOpts) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const end = t + o.dur + 0.03;
  const s = osc(c, o.type, o.f, t, end, nodes, o.detune ?? 0);
  if (o.f2) s.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide ?? o.dur));
  const g = gainNode(c, nodes);
  const a = o.attack ?? 0.003;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(o.dur, a + 0.01));
  s.connect(g);
  route(c, g, bus, nodes, o.pan ?? 0, o.wet ?? 0.1);
  finish(s, nodes);
}

interface MetalOpts { dur: number; gain: number; hp: number; bp?: number; q?: number; rate?: number; pan?: number; wet?: number; attack?: number }
function metal(bus: Bus, t: number, o: MetalOpts) {
  const c = begin();
  if (!c || !metalBuf) return;
  const nodes: AudioNode[] = [];
  const end = t + o.dur + 0.03;
  const s = bufSrc(c, metalBuf, t, end, nodes, o.rate ?? 1);
  const h = filt(c, 'highpass', o.hp, 0.7, nodes);
  let last: AudioNode = h;
  s.connect(h);
  if (o.bp) {
    const b = filt(c, 'bandpass', o.bp, o.q ?? 0.8, nodes);
    h.connect(b);
    last = b;
  }
  const g = gainNode(c, nodes);
  const a = o.attack ?? 0.001;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(o.dur, a + 0.01));
  last.connect(g);
  route(c, g, bus, nodes, o.pan ?? 0, o.wet ?? 0.12);
  finish(s, nodes);
}

// ───────────────────────────── instruments ─────────────────────────────
/** FM Rhodes: sine carrier + ratio-1 modulator with decaying index, tine click */
function rhodes(bus: Bus, t: number, midi: number, dur: number, vel: number, pan = 0) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const f = mtof(midi);
  const end = t + dur + 0.6;
  const car = osc(c, 'sine', f, t, end, nodes);
  const mod = osc(c, 'sine', f, t, end, nodes);
  const mg = gainNode(c, nodes);
  mg.gain.setValueAtTime(f * (1.4 + vel * 1.4), t);
  mg.gain.setTargetAtTime(f * 0.25, t, 0.09);
  mod.connect(mg);
  mg.connect(car.frequency);
  const amp = gainNode(c, nodes);
  adsr(amp.gain, t, 0.004, 0.11 * vel, 1.4, 0.4, dur, 0.45);
  car.connect(amp);
  const tine = osc(c, 'sine', f * 7.02, t, t + 0.08, nodes);
  const tg = gainNode(c, nodes);
  tg.gain.setValueAtTime(0.03 * vel, t);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  tine.connect(tg);
  tg.connect(amp);
  route(c, amp, bus, nodes, pan, 0.22, bus.trem);
  finish(car, nodes);
}

/** upright-ish bass: sine + triangle through plucked lowpass */
function bass(bus: Bus, t: number, midi: number, dur: number, vel: number, bright = 1) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const f = mtof(midi);
  const end = t + dur + 0.15;
  const a = osc(c, 'sine', f, t, end, nodes);
  const b = osc(c, 'triangle', f, t, end, nodes, 4);
  const lp = filt(c, 'lowpass', 900 * bright, 2, nodes);
  lp.frequency.setValueAtTime(1100 * bright, t);
  lp.frequency.setTargetAtTime(260 * bright, t, 0.07);
  const g = gainNode(c, nodes);
  adsr(g.gain, t, 0.006, 0.42 * vel, 0.3, 0.5, dur, 0.1);
  a.connect(lp);
  b.connect(lp);
  lp.connect(g);
  route(c, g, bus, nodes, 0, 0.04);
  finish(a, nodes);
}

/** synth ostinato bass (tension) */
function synthBass(bus: Bus, t: number, midi: number, dur: number, vel: number, cutoff: number) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const f = mtof(midi);
  const end = t + dur + 0.08;
  const a = osc(c, 'sawtooth', f, t, end, nodes);
  const b = osc(c, 'square', f / 2, t, end, nodes);
  const bg = gainNode(c, nodes, 0.5);
  const lp = filt(c, 'lowpass', cutoff, 6, nodes);
  lp.frequency.setValueAtTime(cutoff * 2.2, t);
  lp.frequency.setTargetAtTime(cutoff, t, 0.04);
  const g = gainNode(c, nodes);
  adsr(g.gain, t, 0.003, 0.22 * vel, 0.12, 0.3, dur, 0.05);
  a.connect(lp);
  b.connect(bg);
  bg.connect(lp);
  lp.connect(g);
  route(c, g, bus, nodes, 0, 0.03);
  finish(a, nodes);
}

function kick(bus: Bus, t: number, vel: number, low = 45) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const end = t + 0.45;
  const o = osc(c, 'sine', 150, t, end, nodes);
  o.frequency.exponentialRampToValueAtTime(low, t + 0.11);
  const g = gainNode(c, nodes);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.85 * vel, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(g);
  route(c, g, bus, nodes, 0, 0.02);
  finish(o, nodes);
  noise(bus, t, { dur: 0.012, gain: 0.12 * vel, type: 'lowpass', f: 3000, wet: 0 });
}

function timpani(bus: Bus, t: number, midi: number, vel: number) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const f = mtof(midi);
  const end = t + 1.8;
  const a = osc(c, 'sine', f * 1.04, t, end, nodes);
  a.frequency.exponentialRampToValueAtTime(f, t + 0.15);
  const b = osc(c, 'sine', f * 1.51, t, end, nodes);
  const bg = gainNode(c, nodes, 0.35);
  const g = gainNode(c, nodes);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.6 * vel, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
  a.connect(g);
  b.connect(bg);
  bg.connect(g);
  route(c, g, bus, nodes, 0, 0.3);
  finish(a, nodes);
  noise(bus, t, { dur: 0.25, gain: 0.25 * vel, type: 'lowpass', f: 500, wet: 0.3 });
}

const brush = (bus: Bus, t: number, vel: number, len = 0.16, pan = 0) =>
  noise(bus, t, { dur: len, gain: 0.07 * vel, type: 'bandpass', f: 3800, f2: 2600, q: 0.6, attack: len * 0.35, pan, wet: 0.12 });
const brushTap = (bus: Bus, t: number, vel: number, pan = 0) =>
  noise(bus, t, { dur: 0.09, gain: 0.14 * vel, type: 'bandpass', f: 2400, q: 0.7, pan, wet: 0.15 });
const ride = (bus: Bus, t: number, vel: number) => {
  metal(bus, t, { dur: 0.55, gain: 0.06 * vel, hp: 4200, bp: 7000, q: 0.6, pan: 0.35, wet: 0.18 });
  tone(bus, t, { type: 'sine', f: 5120, dur: 0.25, gain: 0.006 * vel, pan: 0.35, wet: 0.1 });
};
const hat = (bus: Bus, t: number, vel: number, open = false, pan = -0.25) =>
  metal(bus, t, { dur: open ? 0.28 : 0.045, gain: 0.07 * vel, hp: 7500, pan, wet: 0.06, rate: 1.1 });
const crash = (bus: Bus, t: number, vel: number) => {
  metal(bus, t, { dur: 2.2, gain: 0.1 * vel, hp: 3500, rate: 0.9, pan: -0.3, wet: 0.35 });
  noise(bus, t, { dur: 1.8, gain: 0.08 * vel, type: 'highpass', f: 6000, pan: 0.3, wet: 0.35 });
};
const snap = (bus: Bus, t: number, vel: number, pan = 0.2) => {
  noise(bus, t, { dur: 0.06, gain: 0.25 * vel, type: 'bandpass', f: 2300, q: 3, pan, wet: 0.25 });
  tone(bus, t, { type: 'sine', f: 1700, dur: 0.03, gain: 0.04 * vel, pan, wet: 0.1 });
};
const clap = (bus: Bus, t: number, vel: number) => {
  for (let i = 0; i < 3; i++) noise(bus, t + i * 0.011, { dur: 0.02, gain: 0.2 * vel, type: 'bandpass', f: 1300, q: 1.2, wet: 0.1 });
  noise(bus, t + 0.033, { dur: 0.18, gain: 0.18 * vel, type: 'bandpass', f: 1200, q: 1, wet: 0.3 });
};
const rim = (bus: Bus, t: number, vel: number) => {
  noise(bus, t, { dur: 0.03, gain: 0.15 * vel, type: 'bandpass', f: 1900, q: 4, pan: -0.15, wet: 0.15 });
  tone(bus, t, { type: 'triangle', f: 820, dur: 0.035, gain: 0.08 * vel, pan: -0.15, wet: 0.1 });
};

/** vibraphone ('vibe') or glockenspiel-like ('glock') bell */
function bell(bus: Bus, t: number, midi: number, dur: number, vel: number, pan = 0, kind: 'vibe' | 'glock' = 'vibe', wet = 0.35) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const f = mtof(midi);
  const end = t + dur + 0.05;
  const a = osc(c, 'sine', f, t, end, nodes);
  const a2 = osc(c, 'sine', f, t, end, nodes, kind === 'vibe' ? 4 : 2);
  const p1 = osc(c, 'sine', f * (kind === 'vibe' ? 4 : 2.76), t, end, nodes);
  const p2 = osc(c, 'sine', f * (kind === 'vibe' ? 10 : 5.4), t, end, nodes);
  const g = gainNode(c, nodes);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.09 * vel, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const g1 = gainNode(c, nodes);
  g1.gain.setValueAtTime(0.3, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.35);
  const g2 = gainNode(c, nodes);
  g2.gain.setValueAtTime(0.12, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  a.connect(g);
  a2.connect(g);
  p1.connect(g1);
  g1.connect(g);
  p2.connect(g2);
  g2.connect(g);
  route(c, g, bus, nodes, pan, wet);
  finish(a, nodes);
}

/** detuned-saw string pad through slowly opening lowpass */
function pad(bus: Bus, t: number, notes: readonly number[], dur: number, vel: number, cutoff = 1800, attack = 0.8, wet = 0.5) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const end = t + dur + 1.6;
  const lp = filt(c, 'lowpass', cutoff * 0.5, 0.8, nodes);
  lp.frequency.setValueAtTime(cutoff * 0.45, t);
  lp.frequency.linearRampToValueAtTime(cutoff, t + attack + dur * 0.4);
  const g = gainNode(c, nodes);
  adsr(g.gain, t, attack, (0.11 * vel) / Math.sqrt(notes.length), 1, 1, dur, 1.4);
  let first: OscillatorNode | null = null;
  for (const n of notes) {
    for (const d of [-9, 8]) {
      const o = osc(c, 'sawtooth', mtof(n), t, end, nodes, d + rnd(-2, 2));
      o.connect(lp);
      first ??= o;
    }
  }
  lp.connect(g);
  route(c, g, bus, nodes, 0, wet);
  if (first) finish(first, nodes);
}

/** short staccato strings / brass stabs (envelope-filtered detuned saws) */
function stab(bus: Bus, t: number, notes: readonly number[], dur: number, vel: number, o: { cutoff: number; brass?: boolean; pan?: number; wet?: number }) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const end = t + dur + 0.4;
  const lp = filt(c, 'lowpass', o.cutoff, o.brass ? 1.5 : 0.9, nodes);
  if (o.brass) {
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.linearRampToValueAtTime(o.cutoff * (0.7 + vel * 0.6), t + 0.05);
    lp.frequency.setTargetAtTime(o.cutoff * 0.55, t + 0.06, 0.15);
  }
  const g = gainNode(c, nodes);
  const peak = ((o.brass ? 0.16 : 0.1) * vel) / Math.sqrt(notes.length);
  adsr(g.gain, t, o.brass ? 0.018 : 0.006, peak, o.brass ? 0.3 : 0.1, o.brass ? 0.7 : 0.25, dur, o.brass ? 0.25 : 0.12);
  let first: OscillatorNode | null = null;
  for (const n of notes) {
    for (const d of o.brass ? [-11, 0, 10] : [-7, 7]) {
      const s = osc(c, 'sawtooth', mtof(n), t, end, nodes, d);
      s.connect(lp);
      first ??= s;
    }
  }
  lp.connect(g);
  route(c, g, bus, nodes, o.pan ?? 0, o.wet ?? 0.3);
  if (first) finish(first, nodes);
}

/** harmon-muted trumpet: saw → wah bandpass, delayed vibrato */
function trumpet(bus: Bus, t: number, midi: number, dur: number, vel: number) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const f = mtof(midi);
  const end = t + dur + 0.2;
  const s = osc(c, 'sawtooth', f, t, end, nodes);
  const s2 = osc(c, 'sawtooth', f, t, end, nodes, 6);
  const lfo = osc(c, 'sine', 5.4, t, end, nodes);
  const lg = gainNode(c, nodes);
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(dur, 0.5));
  lfo.connect(lg);
  lg.connect(s.frequency);
  lg.connect(s2.frequency);
  s.frequency.setValueAtTime(f * 0.97, t);
  s.frequency.linearRampToValueAtTime(f, t + 0.04);
  const bp = filt(c, 'bandpass', 900, 3.5, nodes);
  bp.frequency.setValueAtTime(700, t);
  bp.frequency.linearRampToValueAtTime(1700, t + 0.06);
  bp.frequency.setTargetAtTime(1150, t + 0.08, 0.2);
  const hp = filt(c, 'highpass', 350, 0.7, nodes);
  const g = gainNode(c, nodes);
  adsr(g.gain, t, 0.03, 0.2 * vel, 0.2, 0.75, dur, 0.12);
  s.connect(bp);
  s2.connect(bp);
  bp.connect(hp);
  hp.connect(g);
  route(c, g, bus, nodes, -0.2, 0.35);
  finish(s, nodes);
}

/** airy choir: saws with vibrato through 'ah' formants */
function choir(bus: Bus, t: number, notes: readonly number[], dur: number, vel: number) {
  const c = begin();
  if (!c) return;
  const nodes: AudioNode[] = [];
  const end = t + dur + 1.2;
  const lfo = osc(c, 'sine', 5, t, end, nodes);
  const lg = gainNode(c, nodes, 7);
  lfo.connect(lg);
  const f1 = filt(c, 'bandpass', 800, 5, nodes);
  const f2 = filt(c, 'bandpass', 1200, 6, nodes);
  const f3 = filt(c, 'bandpass', 2600, 8, nodes);
  const g = gainNode(c, nodes);
  adsr(g.gain, t, 0.35, (0.5 * vel) / Math.sqrt(notes.length), 1, 1, dur, 1);
  for (const n of notes) {
    for (const d of [-6, 6]) {
      const o = osc(c, 'sawtooth', mtof(n), t, end, nodes, d);
      lg.connect(o.detune);
      o.connect(f1);
      o.connect(f2);
      o.connect(f3);
    }
  }
  f1.connect(g);
  f2.connect(g);
  f3.connect(g);
  route(c, g, bus, nodes, 0, 0.6);
  finish(lfo, nodes);
}

// ───────────────────────────── music data ─────────────────────────────
interface Ch { b: number; n: readonly number[] }
type Note = readonly [pos: number, midi: number, dur: number];
const ch = (b: number, ...n: number[]): Ch => ({ b, n });

interface StepInfo {
  t: number; bar: number; absBar: number; beat: number; sub: number;
  beatDur: number; stepDur: number; bus: Bus; loop: number;
}
interface TrackDef { bpm: number; spb: number; introBars: number; loopBars: number; level: number; onStep(s: StepInfo): void }

/** schedule a list of (beatPos, midi, durBeats) notes from a bar start */
function playNotes(s: StepInfo, notes: readonly Note[], fn: (t: number, m: number, d: number) => void) {
  for (const [p, m, d] of notes) fn(hum(s.t + p * s.beatDur, 0.008), m, d * s.beatDur);
}

// TITLE — Db major, lush & glamorous
const TITLE_CH: readonly Ch[] = [
  ch(37, 53, 60, 63, 68), ch(34, 56, 60, 61, 65), ch(30, 53, 58, 61, 65), ch(32, 54, 58, 61, 65),
  ch(37, 53, 60, 63, 68), ch(34, 56, 60, 61, 65), ch(30, 53, 58, 61, 68), ch(32, 54, 58, 60, 63),
];
const TITLE_MEL: readonly (readonly Note[])[] = [
  [[0, 68, 0.5], [0.5, 73, 0.5], [1, 75, 1], [2, 77, 2]],
  [[0, 80, 1.5], [1.5, 77, 0.5], [2, 75, 2]],
  [[0, 73, 1], [1, 75, 0.5], [1.5, 77, 0.5], [2, 77, 1], [3, 80, 1]],
  [[0, 82, 3], [3, 80, 1]],
  [[0, 68, 0.5], [0.5, 73, 0.5], [1, 75, 1], [2, 77, 1], [3, 80, 1]],
  [[0, 85, 2], [2, 84, 1], [3, 80, 1]],
  [[0, 82, 1.5], [1.5, 80, 0.5], [2, 77, 2]],
  [[0, 75, 2], [2, 73, 2]],
];
const ARP = [0, 1, 2, 3, 4, 3, 2, 1];
const titleDef: TrackDef = {
  bpm: 80, spb: 4, introBars: 0, loopBars: 8, level: 0.9,
  onStep(s) {
    const c = TITLE_CH[s.bar];
    const step = s.beat * 4 + s.sub;
    if (step === 0) {
      pad(s.bus, s.t, c.n, s.beatDur * 4 + 0.2, 0.9, 2200, 1.0);
      pad(s.bus, s.t, [c.n[0] + 12, c.n[2] + 12], s.beatDur * 4, 0.35, 3000, 1.5, 0.7);
      playNotes(s, TITLE_MEL[s.bar], (t, m, d) => bell(s.bus, t, m, Math.max(1.6, d * 1.6), hv(0.75), 0.1, 'vibe', 0.45));
      kick(s.bus, s.t, 0.35, 40);
      if (s.bar === 0) crash(s.bus, s.t, s.loop === 0 ? 0.5 : 0.35);
      if (s.bar === 7) noise(s.bus, s.t + s.beatDur * 2, { dur: s.beatDur * 2, gain: 0.08, type: 'bandpass', f: 500, f2: 7000, q: 1, attack: s.beatDur * 1.9, wet: 0.5 });
    }
    if (s.sub === 0 && (s.beat === 0 || s.beat === 2)) bass(s.bus, hum(s.t), s.beat === 0 ? c.b : c.b + 7, s.beatDur * 1.8, 0.7, 0.8);
    if (s.sub === 0 && (s.beat === 1 || s.beat === 3)) brush(s.bus, hum(s.t), 0.8, 0.25, 0.3);
    // bell arpeggio: 8ths, 16th ornaments on later loops
    if (s.sub % 2 === 0 || (s.loop % 2 === 1 && Math.random() < 0.3)) {
      const tones = [...c.n.map((n) => n + 12), c.n[0] + 24];
      const idx = ARP[(step >> 1) % ARP.length];
      bell(s.bus, hum(s.t), tones[idx], 1.2, hv(0.28), idx % 2 ? 0.45 : -0.45, 'glock', 0.55);
    }
  },
};

// LOBBY — bossa lounge in C/F
const LOBBY_CH: readonly (readonly Ch[])[] = (() => {
  const Fmaj7 = ch(41, 53, 57, 60, 64), Em7b5 = ch(40, 50, 55, 58, 62), A7 = ch(45, 55, 61, 64, 69);
  const A7b9 = ch(45, 55, 58, 61, 64), Dm9 = ch(38, 53, 57, 60, 64), G13 = ch(43, 53, 57, 59, 64);
  const Cmaj9 = ch(36, 52, 55, 59, 62), Am7 = ch(45, 55, 60, 64, 67), D9 = ch(38, 54, 57, 60, 64);
  const Gm9 = ch(43, 53, 57, 58, 62), C13 = ch(36, 52, 57, 58, 62), Fmaj9 = ch(41, 55, 57, 60, 64);
  return [[Fmaj7], [Fmaj7], [Em7b5], [A7], [Dm9], [G13], [Cmaj9], [Cmaj9],
    [Am7], [D9], [Gm9], [C13], [Fmaj9], [Em7b5, A7b9], [Dm9, G13], [Cmaj9]];
})();
const LOBBY_MEL: readonly (readonly Note[])[] = [
  [[0, 76, 1.5], [1.5, 77, 0.5], [2, 79, 1], [3, 81, 1]],
  [[0, 79, 2.5], [3, 76, 1]],
  [[0, 74, 1], [1, 77, 0.5], [1.5, 74, 0.5], [2, 70, 2]],
  [[0, 73, 1.5], [1.5, 76, 0.5], [2, 79, 1], [3, 77, 1]],
  [[0, 76, 3], [3, 74, 0.5], [3.5, 72, 0.5]],
  [[0, 71, 1], [1, 74, 1], [2, 77, 1], [3, 76, 1]],
  [[0, 74, 1.5], [1.5, 71, 0.5], [2, 67, 2]],
  [[0, 72, 1], [1, 76, 1], [2, 79, 1.5], [3.5, 81, 0.5]],
  [[0, 84, 1.5], [1.5, 81, 0.5], [2, 79, 1], [3, 76, 1]],
  [[0, 78, 2], [2, 76, 1], [3, 74, 1]],
  [[0, 77, 1.5], [1.5, 74, 0.5], [2, 70, 1], [3, 69, 1]],
  [[0, 70, 1], [1, 72, 0.5], [1.5, 76, 0.5], [2, 81, 2]],
  [[0, 79, 3], [3, 77, 0.5], [3.5, 76, 0.5]],
  [[0, 74, 1], [1, 70, 1], [2, 73, 1], [3, 70, 1]],
  [[0, 69, 1], [1, 72, 1], [2, 77, 1], [3, 76, 1]],
  [[0, 76, 2], [2, 74, 0.5], [2.5, 72, 1.5]],
];
const CLAVE = new Set([0, 6, 12, 20, 26]);
const lobbyDef: TrackDef = {
  bpm: 100, spb: 4, introBars: 0, loopBars: 16, level: 0.85,
  onStep(s) {
    const bc = LOBBY_CH[s.bar];
    const c = bc.length > 1 && s.beat >= 2 ? bc[1] : bc[0];
    const step = s.beat * 4 + s.sub;
    const t = hum(s.t);
    const fill = (s.bar === 7 || s.bar === 15) && s.beat === 3;
    // bossa bass: root . . 5th | 5th . . root
    if (s.sub === 0 && (s.beat === 0 || s.beat === 2)) bass(s.bus, t, s.beat === 0 || bc.length > 1 ? c.b : c.b + 7, s.beatDur * 1.4, hv(0.85));
    if (s.sub === 2 && (s.beat === 1 || s.beat === 3)) bass(s.bus, t, s.beat === 1 ? c.b + 7 : c.b + (bc.length > 1 ? 7 : 12), s.beatDur * 0.45, hv(0.7));
    // rhodes comping
    const comp = s.bar % 2 === 0 ? [0, 6, 12] : [2, 6, 10];
    if (comp.includes(step)) {
      const len = step === 0 ? 1.2 : 0.45;
      c.n.forEach((n, i) => rhodes(s.bus, t + i * 0.006, n, s.beatDur * len, hv(0.55), (i - 1.5) * 0.2));
    }
    // brushes & percussion
    brush(s.bus, t, [1, 0.45, 0.65, 0.45][s.sub] * (s.beat % 2 ? 1.15 : 0.9), 0.12, -0.3);
    if (CLAVE.has((s.bar % 2) * 16 + step)) rim(s.bus, t, hv(0.75));
    if (step === 0 || step === 8) kick(s.bus, t, 0.45);
    if (step === 7 || step === 15) kick(s.bus, t, 0.2);
    if (fill) brushTap(s.bus, t, 0.4 + s.sub * 0.2, rnd(-0.3, 0.3));
    // melody (vibes); on odd loops a variation with ornaments + strings
    if (step === 0) {
      const varied = s.loop % 2 === 1;
      playNotes(s, LOBBY_MEL[s.bar], (tt, m, d) => {
        bell(s.bus, tt, m, Math.max(1.2, d * 1.3), hv(0.8), 0.25);
        if (varied && Math.random() < 0.3) bell(s.bus, tt - 0.06, m + 2, 0.4, 0.35, 0.25);
      });
      if (varied) pad(s.bus, s.t, c.n.map((n) => n + 12), s.beatDur * 4, 0.45, 1600, 1.2);
    }
  },
};

// TABLE — medium-swing noir in C minor (triplet grid)
const TABLE_CH: readonly Ch[] = (() => {
  const Cm9 = ch(36, 51, 55, 58, 62), Fm9 = ch(41, 51, 55, 56, 60), Dm7b5 = ch(38, 50, 53, 56, 60);
  const G7alt = ch(43, 53, 56, 59, 63), Ab = ch(44, 55, 60, 63, 67), Eb = ch(39, 50, 55, 58, 62);
  return [Cm9, Cm9, Fm9, Fm9, Dm7b5, G7alt, Cm9, G7alt, Eb, Ab, Dm7b5, G7alt, Cm9, Fm9, Dm7b5, G7alt];
})();
const T3 = 2 / 3;
const TRUMPET: readonly (readonly Note[])[] = [
  [[0, 67, T3], [T3, 70, 1 / 3], [1, 72, 1], [2, 70, T3], [2 + T3, 67, 1 / 3], [3, 65, 1.5], [5, 63, T3], [5 + T3, 65, 1 / 3], [6, 67, 2]],
  [[0, 74, T3], [T3, 72, 1 / 3], [1, 71, 1], [2, 68, T3], [2 + T3, 67, 1.33], [4 + T3, 63, 1 / 3], [5, 62, 1], [6, 60, 2]],
  [[0, 70, 1.33], [1 + T3, 72, 1 / 3], [2, 75, 1], [3, 74, T3], [3 + T3, 72, 1 / 3], [4, 70, 2], [6 + T3, 67, 1 / 3], [7, 68, 1]],
  [[0, 67, T3], [T3, 68, 1 / 3], [1, 71, T3], [1 + T3, 74, 1 / 3], [2, 77, 1], [3, 75, T3], [3 + T3, 74, 1 / 3], [4, 72, 3]],
];
const fold = (m: number) => { let x = m; while (x > 50) x -= 12; while (x < 34) x += 12; return x; };
let walk: number[] = [];
const tableDef: TrackDef = {
  bpm: 112, spb: 3, introBars: 0, loopBars: 16, level: 0.85,
  onStep(s) {
    const c = TABLE_CH[s.bar];
    const t = hum(s.t);
    if (s.beat === 0 && s.sub === 0) {
      const next = TABLE_CH[(s.bar + 1) % TABLE_CH.length].b;
      const tones = c.n.map(fold);
      walk = [c.b, pick([...tones, c.b + 7]), pick([c.b + 7, ...tones]), next + pick([-1, 1, -2])];
      if (s.bar % 2 === 0) pad(s.bus, s.t, c.n.map((n) => n - 12 > 40 ? n - 12 : n), s.beatDur * 8, 0.35, 700, 1.5, 0.6);
      if (s.bar % 4 === 1) playNotes(s, TRUMPET[(s.bar >> 2) % 4], (tt, m, d) => trumpet(s.bus, tt, m + (s.loop % 2 && m < 70 ? 12 : 0), d * 0.92, hv(0.85)));
      if (s.loop % 2 === 1 && s.bar % 4 === 3) playNotes(s, [[2, c.n[3] + 12, 1], [2 + T3 + 1, c.n[2] + 12, 1]], (tt, m, d) => bell(s.bus, tt, m, d * 2, 0.6, 0.4));
      if (s.bar === 0 && s.loop > 0) crash(s.bus, t, 0.4);
    }
    if (s.sub === 0) {
      bass(s.bus, t, fold(walk[s.beat] ?? c.b), s.beatDur * 0.92, hv(s.beat === 0 ? 0.95 : 0.8));
      ride(s.bus, t, s.beat % 2 ? 1 : 0.75);
      brush(s.bus, t, 0.6, s.beatDur * 0.8, s.beat % 2 ? 0.3 : -0.3);
      kick(s.bus, t, 0.14, 42);
      if (s.beat % 2) hat(s.bus, t + 0.005, 0.7);
    }
    if (s.sub === 2) {
      if (s.beat % 2) ride(s.bus, t, 0.55);
      if (Math.random() < 0.15) brushTap(s.bus, t, 0.35, 0.2);
      const fillBar = (s.bar === 7 || s.bar === 15) && s.beat >= 2;
      if (fillBar) brushTap(s.bus, t, 0.9);
    }
    if ((s.bar === 7 || s.bar === 15) && s.beat === 3 && s.sub === 1) brushTap(s.bus, t, 0.6);
    // sparse piano stabs
    const stabs = s.bar % 2 === 0 ? [[1, 2], [3, 0]] : [[0, 2], [2, 2]];
    if (stabs.some(([b, u]) => b === s.beat && u === s.sub) && Math.random() < 0.7) {
      c.n.forEach((n, i) => rhodes(s.bus, t + i * 0.004, n, s.beatDur * 0.35, hv(0.6), (i - 1.5) * 0.25));
    }
  },
};

// TENSION — driving D minor, 132 bpm
const TENSION_CH: readonly Ch[] = (() => {
  const Dm = ch(38, 62, 65, 69), Bb = ch(34, 62, 65, 70), Gm = ch(31, 62, 67, 70), A = ch(33, 61, 64, 69);
  return [Dm, Dm, Bb, Bb, Gm, Gm, A, A];
})();
const HOOK: readonly (readonly Note[])[] = [
  [[0, 74, 0.5], [0.5, 77, 0.5], [1, 81, 0.5], [1.5, 79, 1.5], [3.5, 77, 0.5]],
  [[0, 74, 0.5], [0.5, 77, 0.5], [1, 82, 0.5], [1.5, 81, 1.5], [3.5, 77, 0.5]],
  [[0, 74, 0.5], [0.5, 79, 0.5], [1, 82, 0.5], [1.5, 81, 1], [2.5, 79, 1]],
  [[0, 76, 0.5], [0.5, 79, 0.5], [1, 81, 0.5], [1.5, 85, 2.5]],
];
const tensionDef: TrackDef = {
  bpm: 132, spb: 4, introBars: 0, loopBars: 8, level: 0.8,
  onStep(s) {
    const c = TENSION_CH[s.bar];
    const step = s.beat * 4 + s.sub;
    const prog = (s.bar * 16 + step) / 128;
    const cutoff = 260 + 1600 * prog;
    const t = hum(s.t, 0.002);
    hat(s.bus, t, [0.9, 0.35, 0.6, 0.35][s.sub] * 0.9, s.beat === 3 && s.sub === 2, 0.25);
    synthBass(s.bus, t, c.b + [0, 0, 12, 0][s.sub], s.stepDur * 0.8, s.sub === 0 ? 1 : 0.7, cutoff);
    if (step === 0 || step === 8 || step === 7 || (s.bar === 7 && s.sub === 0)) kick(s.bus, t, step === 7 ? 0.6 : 0.95);
    if (s.sub === 0 && s.beat % 2 === 1) clap(s.bus, t, 0.8);
    if (s.sub === 2) stab(s.bus, t, c.n, s.stepDur * 0.9, 0.8, { cutoff: 900 + 3000 * prog, pan: s.beat % 2 ? 0.3 : -0.3 });
    if (step === 0) {
      if (s.bar === 0) {
        timpani(s.bus, s.t, 38, 0.9);
        crash(s.bus, s.t, 0.55);
      }
      if (s.bar === 4) noise(s.bus, s.t, { dur: s.beatDur * 16, gain: 0.07, type: 'bandpass', f: 400, f2: 6000, q: 2, attack: s.beatDur * 15.5, wet: 0.4 });
      if (s.bar % 2 === 0) playNotes(s, HOOK[s.bar >> 1], (tt, m, d) => bell(s.bus, tt, m, Math.max(0.6, d * 1.2), hv(0.7), -0.2, 'glock', 0.4));
      pad(s.bus, s.t, c.n.map((n) => n - 12), s.beatDur * 4, 0.4, 600 + 1200 * prog, 0.5, 0.4);
    }
    if (s.bar === 7 && s.beat >= 2) tone(s.bus, t, { type: 'sine', f: 180 - step * 6, f2: 70, dur: 0.18, gain: 0.35 * (0.6 + step / 40), wet: 0.2 });
  },
};

// VICTORY — big-band fanfare, then a gentle loop
const VIC_LOOP: readonly Ch[] = [ch(36, 52, 55, 59, 62), ch(45, 55, 59, 60, 64), ch(41, 55, 57, 60, 64), ch(43, 53, 57, 60, 64)];
function fanfare(bus: Bus, t0: number, bd: number) {
  const at = (b: number) => t0 + b * bd;
  const C = [55, 60, 64, 67];
  stab(bus, at(0), C, bd * 0.3, 1, { cutoff: 3200, brass: true });
  stab(bus, at(0.75), C, bd * 0.2, 0.8, { cutoff: 3000, brass: true });
  stab(bus, at(1), C, bd * 0.9, 1, { cutoff: 3200, brass: true });
  timpani(bus, at(0), 36, 1);
  crash(bus, at(0), 0.7);
  kick(bus, at(0), 0.9);
  for (let i = 0; i < 8; i++) timpani(bus, at(2 + i * 0.25), i < 4 ? 31 : 36, 0.3 + i * 0.07);
  const lead: Note[] = [[0, 67, 0.5], [0.5, 67, 0.25], [0.75, 67, 0.25], [1, 72, 1], [2, 76, 0.5], [2.5, 74, 0.5], [3, 76, 0.5], [3.5, 79, 0.5],
    [4, 80, 1.5], [5.5, 79, 0.5], [6, 82, 1.5], [7.5, 86, 0.5], [8, 84, 3.5]];
  for (const [p, m, d] of lead) stab(bus, at(p), [m], d * bd * 0.95, 1, { cutoff: 4200, brass: true, pan: 0.15, wet: 0.4 });
  stab(bus, at(4), [56, 60, 63, 68], bd * 1.4, 1, { cutoff: 3000, brass: true });
  stab(bus, at(6), [58, 62, 65, 70], bd * 1.4, 1, { cutoff: 3200, brass: true });
  timpani(bus, at(4), 32, 0.9);
  timpani(bus, at(6), 34, 0.9);
  for (let i = 0; i < 8; i++) brushTap(bus, at(7 + i * 0.125), 0.4 + i * 0.09);
  stab(bus, at(8), [48, 55, 60, 64, 67, 72], bd * 3.5, 1, { cutoff: 3600, brass: true, wet: 0.5 });
  pad(bus, at(8), [60, 64, 67, 72, 76], bd * 3.5, 0.8, 3000, 0.3);
  timpani(bus, at(8), 36, 1);
  crash(bus, at(8), 0.9);
  kick(bus, at(8), 1);
  bass(bus, at(8), 36, bd * 3, 1);
  [84, 88, 91, 96, 100, 103, 108].forEach((m, i) => bell(bus, at(8.5 + i * 0.25), m, 1.4, 0.5, i % 2 ? 0.5 : -0.5, 'glock', 0.6));
}
const victoryDef: TrackDef = {
  bpm: 120, spb: 4, introBars: 3, loopBars: 4, level: 0.9,
  onStep(s) {
    if (s.absBar < 3) {
      if (s.absBar === 0 && s.beat === 0 && s.sub === 0) fanfare(s.bus, s.t, s.beatDur);
      return;
    }
    const c = VIC_LOOP[s.bar - 3];
    const step = s.beat * 4 + s.sub;
    const t = hum(s.t);
    if (step === 0) {
      pad(s.bus, s.t, c.n, s.beatDur * 4, 0.6, 1800, 1);
      bass(s.bus, t, c.b, s.beatDur * 3.5, 0.6, 0.8);
      if (s.bar === 3) bell(s.bus, t, 79, 2.5, 0.5, 0.2);
    }
    if (s.sub === 0 || s.sub === 2) {
      const tones = [...c.n, c.n[0] + 12];
      rhodes(s.bus, t, tones[(step >> 1) % tones.length] + 12, s.beatDur * 0.6, hv(0.4), ((step >> 1) % 2) ? 0.4 : -0.4);
      noise(s.bus, t, { dur: 0.06, gain: 0.03, type: 'highpass', f: 7000, pan: 0.3, wet: 0.05 });
    }
  },
};

const TRACKS: Record<BgmTrack, TrackDef> = { title: titleDef, lobby: lobbyDef, table: tableDef, tension: tensionDef, victory: victoryDef };

// ───────────────────────────── scheduler ─────────────────────────────
interface Player {
  name: BgmTrack; def: TrackDef; fader: GainNode; wetFader: GainNode; bus: Bus;
  nodes: AudioNode[]; lfo: OscillatorNode; step: number; nextTime: number; stopAt: number | null;
}
let players: Player[] = [];
let current: Player | null = null;
let pendingTrack: BgmTrack | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function createPlayer(c: AudioContext, name: BgmTrack): Player | null {
  if (!bgmBus || !bgmRev) return null;
  const def = TRACKS[name];
  const nodes: AudioNode[] = [];
  const fader = gainNode(c, nodes, 0);
  const wetFader = gainNode(c, nodes, 0);
  fader.connect(bgmBus);
  wetFader.connect(bgmRev);
  const trem = gainNode(c, nodes, 0.85);
  trem.connect(fader);
  const lfo = c.createOscillator();
  lfo.frequency.value = 4.6;
  const lg = gainNode(c, nodes, 0.15);
  lfo.connect(lg);
  lg.connect(trem.gain);
  lfo.start();
  nodes.push(lfo);
  return { name, def, fader, wetFader, bus: { dry: fader, wet: wetFader, trem }, nodes, lfo, step: 0, nextTime: c.currentTime + 0.08, stopAt: null };
}

function scheduleStep(p: Player) {
  const { def } = p;
  const beatDur = 60 / def.bpm;
  const stepDur = beatDur / def.spb;
  const perBar = def.spb * 4;
  const absBar = Math.floor(p.step / perBar);
  const inBar = p.step % perBar;
  const loopIdx = absBar < def.introBars ? 0 : Math.floor((absBar - def.introBars) / def.loopBars);
  const bar = absBar < def.introBars ? absBar : def.introBars + ((absBar - def.introBars) % def.loopBars);
  try {
    def.onStep({ t: p.nextTime, bar, absBar, beat: Math.floor(inBar / def.spb), sub: inBar % def.spb, beatDur, stepDur, bus: p.bus, loop: loopIdx });
  } catch {
    /* never let a scheduling glitch kill the loop */
  }
  p.step++;
  p.nextTime += stepDur;
}

function killPlayer(p: Player) {
  try { p.lfo.stop(); } catch { /* not started */ }
  for (const n of p.nodes) {
    try { n.disconnect(); } catch { /* ignore */ }
  }
}

function pump() {
  timer = null;
  const c = ctx;
  if (!c) return;
  const now = c.currentTime;
  for (const p of players) {
    // recover after tab throttling: skip missed steps instead of bursting them
    if (p.nextTime < now - 0.25) {
      const stepDur = 60 / p.def.bpm / p.def.spb;
      const missed = Math.ceil((now - p.nextTime) / stepDur);
      p.step += missed;
      p.nextTime += missed * stepDur;
    }
    while (p.nextTime < now + LOOKAHEAD && (p.stopAt === null || p.nextTime < p.stopAt)) scheduleStep(p);
  }
  players = players.filter((p) => {
    if (p.stopAt !== null && now > p.stopAt + 0.3) { killPlayer(p); return false; }
    return true;
  });
  if (players.length) timer = setTimeout(pump, TICK_MS);
}

function startTrack(name: BgmTrack) {
  const c = ctx;
  if (!c || c.state !== 'running') { pendingTrack = name; return; }
  if (current?.name === name && current.stopAt === null) return;
  fadeOutCurrent(XFADE);
  const p = createPlayer(c, name);
  if (!p) return;
  const now = c.currentTime;
  for (const g of [p.fader, p.wetFader]) {
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(p.def.level, now + XFADE);
  }
  players.push(p);
  current = p;
  if (!timer) pump();
}

function fadeOutCurrent(time: number) {
  const c = ctx;
  const p = current;
  current = null;
  if (!c || !p) return;
  const now = c.currentTime;
  for (const g of [p.fader, p.wetFader]) {
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + time);
  }
  p.stopAt = now + time;
}

// ───────────────────────────── sound effects ─────────────────────────────
function chip(b: Bus, t: number, vel = 1, pitch = 1, pan = 0) {
  noise(b, t, { dur: 0.018, gain: 0.45 * vel, type: 'bandpass', f: 2600 * pitch, q: 4, pan, wet: 0.08 });
  noise(b, t + rnd(0.012, 0.03), { dur: 0.016, gain: 0.32 * vel, type: 'bandpass', f: 3900 * pitch, q: 5, pan, wet: 0.08 });
  noise(b, t, { dur: 0.012, gain: 0.2 * vel, type: 'bandpass', f: 1200, q: 2, pan, wet: 0 });
  tone(b, t + 0.002, { type: 'sine', f: 3400 * pitch, dur: 0.09, gain: 0.06 * vel, pan, wet: 0.15 });
}
function chipCascade(b: Bus, t: number, n: number, span: number, vel = 1) {
  for (let i = 0; i < n; i++) {
    const x = i / Math.max(1, n - 1);
    chip(b, t + span * Math.pow(x, 0.8) + rnd(0, 0.02), vel * (1 - x * 0.55) * rnd(0.7, 1), rnd(0.88, 1.15), rnd(-0.5, 0.5));
  }
}
function knock(b: Bus, t: number, vel = 1) {
  tone(b, t, { type: 'sine', f: 190, f2: 120, dur: 0.09, gain: 0.5 * vel, wet: 0.1 });
  noise(b, t, { dur: 0.035, gain: 0.3 * vel, type: 'bandpass', f: 850, q: 3, wet: 0.1 });
  tone(b, t, { type: 'triangle', f: 430, dur: 0.045, gain: 0.1 * vel, wet: 0.1 });
}
function sparkle(b: Bus, t: number, n: number, span: number, vel = 1) {
  for (let i = 0; i < n; i++) {
    bell(b, t + rnd(0, span), Math.round(rnd(88, 108)), rnd(0.3, 0.8), rnd(0.25, 0.6) * vel, rnd(-0.8, 0.8), 'glock', 0.5);
  }
}

const SE: Record<SeName, (b: Bus, t: number) => void> = {
  click: (b, t) => {
    tone(b, t, { type: 'sine', f: 1800, f2: 1150, dur: 0.05, gain: 0.22, wet: 0.05 });
    noise(b, t, { dur: 0.015, gain: 0.1, type: 'highpass', f: 4000, wet: 0 });
  },
  hover: (b, t) => tone(b, t, { type: 'sine', f: 2500, f2: 2800, dur: 0.035, gain: 0.05, wet: 0.05 }),
  open: (b, t) => {
    noise(b, t, { dur: 0.3, gain: 0.22, type: 'bandpass', f: 500, f2: 4500, q: 1.2, attack: 0.18, wet: 0.3 });
    tone(b, t, { type: 'sine', f: 600, f2: 1300, dur: 0.22, gain: 0.07, attack: 0.05, wet: 0.3 });
  },
  close: (b, t) => {
    noise(b, t, { dur: 0.25, gain: 0.2, type: 'bandpass', f: 4000, f2: 500, q: 1.2, attack: 0.06, wet: 0.25 });
    tone(b, t, { type: 'sine', f: 1100, f2: 500, dur: 0.2, gain: 0.06, wet: 0.25 });
  },
  deal: (b, t) => {
    const p = rnd(-0.3, 0.3);
    noise(b, t, { dur: 0.12, gain: 0.32, type: 'bandpass', f: 1200, f2: 3600, q: 1.2, attack: 0.08, pan: p, wet: 0.05 });
    noise(b, t + 0.1, { dur: 0.025, gain: 0.3, type: 'highpass', f: 2500, pan: p, wet: 0.08 });
    tone(b, t + 0.1, { type: 'triangle', f: 320, dur: 0.035, gain: 0.08, pan: p, wet: 0 });
  },
  flip: (b, t) => {
    noise(b, t, { dur: 0.05, gain: 0.42, type: 'bandpass', f: 3000, q: 0.8, attack: 0.005, wet: 0.1 });
    noise(b, t, { dur: 0.04, gain: 0.22, type: 'lowpass', f: 900, wet: 0 });
    tone(b, t, { type: 'sine', f: 950, f2: 500, dur: 0.045, gain: 0.07, wet: 0.05 });
  },
  chip: (b, t) => chip(b, t, 1, rnd(0.95, 1.05)),
  chips: (b, t) => chipCascade(b, t, Math.floor(rnd(5, 9)), 0.25),
  potSweep: (b, t) => {
    noise(b, t, { dur: 0.65, gain: 0.2, type: 'bandpass', f: 1400, f2: 3200, q: 0.9, attack: 0.3, wet: 0.15 });
    chipCascade(b, t + 0.05, 14, 0.6, 0.8);
  },
  check: (b, t) => { knock(b, t); knock(b, t + 0.13, 0.85); },
  fold: (b, t) => {
    noise(b, t, { dur: 0.26, gain: 0.22, type: 'lowpass', f: 2400, f2: 600, attack: 0.05, wet: 0.1 });
    tone(b, t, { type: 'sine', f: 420, f2: 200, dur: 0.2, gain: 0.05, wet: 0.1 });
  },
  bet: (b, t) => {
    chipCascade(b, t, 3, 0.12);
    tone(b, t, { type: 'sine', f: 140, f2: 90, dur: 0.08, gain: 0.25, wet: 0 });
  },
  allin: (b, t) => {
    noise(b, t, { dur: 0.72, gain: 0.3, type: 'bandpass', f: 300, f2: 5500, q: 1.5, attack: 0.68, wet: 0.4 });
    tone(b, t, { type: 'sawtooth', f: 110, f2: 440, dur: 0.7, gain: 0.05, attack: 0.65, wet: 0.3 });
    const h = t + 0.7;
    tone(b, h, { type: 'sine', f: 95, f2: 32, glide: 0.5, dur: 1.3, gain: 0.9, wet: 0.3 });
    noise(b, h, { dur: 0.9, gain: 0.5, type: 'lowpass', f: 350, wet: 0.4 });
    crash(b, h, 1);
    timpani(b, h, 31, 1);
    chipCascade(b, h + 0.05, 20, 0.85, 0.9);
  },
  cutin: (b, t) => {
    noise(b, t, { dur: 0.35, gain: 0.35, type: 'bandpass', f: 400, f2: 6500, q: 1.3, attack: 0.3, wet: 0.35 });
    const h = t + 0.3;
    metal(b, h, { dur: 1.1, gain: 0.3, hp: 3000, rate: 1.3, wet: 0.5 });
    [2637, 3520, 4186, 5274].forEach((f, i) => tone(b, h, { type: 'sine', f, dur: 1.1 - i * 0.15, gain: 0.05, detune: rnd(-8, 8), pan: (i - 1.5) * 0.4, wet: 0.5 }));
    tone(b, h, { type: 'sine', f: 70, f2: 40, dur: 0.5, gain: 0.5, wet: 0.2 });
  },
  win: (b, t) => {
    [84, 88, 91, 96].forEach((m, i) => bell(b, t + i * 0.07, m, 1 + i * 0.2, 0.9, (i - 1.5) * 0.3, 'glock', 0.5));
    sparkle(b, t + 0.25, 6, 0.5, 0.6);
    chipCascade(b, t + 0.3, 6, 0.3, 0.7);
  },
  bigWin: (b, t) => {
    const bd = 0.15;
    [[0, 67], [1, 72], [2, 76], [3, 79]].forEach(([p, m]) => stab(b, t + p * bd, [m], bd * 0.9, 1, { cutoff: 4200, brass: true, wet: 0.4 }));
    stab(b, t + 4 * bd, [55, 60, 64, 67, 72, 76], 1.4, 1, { cutoff: 3800, brass: true, wet: 0.5 });
    timpani(b, t + 4 * bd, 36, 1);
    crash(b, t + 4 * bd, 0.9);
    sparkle(b, t + 0.6, 30, 1.6, 0.8);
    chipCascade(b, t + 0.7, 18, 1.2, 0.75);
  },
  lose: (b, t) => {
    [69, 65, 62, 57].forEach((m, i) => bell(b, t + i * 0.18, m, 1.1, 0.7, 0, 'vibe', 0.45));
    pad(b, t + 0.2, [50, 53, 57], 0.9, 0.5, 900, 0.3, 0.5);
  },
  rankUp: (b, t) => {
    const scale = [0, 2, 4, 7, 9];
    for (let i = 0; i < 16; i++) bell(b, t + i * 0.04, 72 + scale[i % 5] + 12 * Math.floor(i / 5), 0.9, 0.55 + i * 0.02, (i / 15 - 0.5) * 1.2, 'glock', 0.55);
    choir(b, t + 0.6, [60, 64, 67, 72, 76], 1.6, 0.9);
    pad(b, t + 0.6, [48, 55, 64], 1.6, 0.5, 2400, 0.3);
    sparkle(b, t + 0.7, 10, 1.2, 0.5);
  },
  tick: (b, t) => {
    tone(b, t, { type: 'sine', f: 1450, dur: 0.03, gain: 0.14, wet: 0.03 });
    noise(b, t, { dur: 0.01, gain: 0.08, type: 'highpass', f: 5000, wet: 0 });
  },
  shuffle: (b, t) => {
    let x = t;
    for (let i = 0; i < 36; i++) {
      noise(b, x, { dur: 0.014, gain: rnd(0.08, 0.22), type: 'highpass', f: rnd(2200, 3600), pan: (i / 35 - 0.5) * 0.8, wet: 0.04 });
      x += 0.024 - i * 0.0003;
    }
    noise(b, x, { dur: 0.3, gain: 0.2, type: 'bandpass', f: 1500, f2: 900, q: 0.8, attack: 0.12, wet: 0.1 });
  },
  stamp: (b, t) => {
    tone(b, t, { type: 'sine', f: 320, f2: 950, glide: 0.06, dur: 0.1, gain: 0.35, wet: 0.1 });
    tone(b, t + 0.03, { type: 'sine', f: 1400, dur: 0.06, gain: 0.06, wet: 0.2 });
  },
  reveal: (b, t) => {
    noise(b, t, { dur: 0.6, gain: 0.22, type: 'bandpass', f: 1000, f2: 7500, q: 1.5, attack: 0.4, wet: 0.45 });
    tone(b, t, { type: 'sine', f: 880, f2: 1760, dur: 0.5, gain: 0.05, attack: 0.3, wet: 0.4 });
    sparkle(b, t + 0.35, 6, 0.4, 0.6);
  },
  levelUp: (b, t) => {
    [79, 84, 88].forEach((m, i) => {
      bell(b, t + i * 0.1, m, i === 2 ? 1.4 : 0.6, 0.9, 0, 'glock', 0.45);
      tone(b, t + i * 0.1, { type: 'square', f: mtof(m), dur: i === 2 ? 0.4 : 0.09, gain: 0.035, wet: 0.2 });
    });
    sparkle(b, t + 0.3, 5, 0.4, 0.5);
  },
};

// ───────────────────────────── studio anime voice player ─────────────────────────────
let currentVoiceAudio: HTMLAudioElement | null = null;
let currentVoiceSource: AudioBufferSourceNode | null = null;
let currentVoiceGain: GainNode | null = null;
const voiceBufCache = new Map<string, AudioBuffer>();

function setDuck(on: boolean) {
  if (ducked === on) return;
  ducked = on;
  applyVolumes(on ? 0.2 : 0.55);
}

function stopCurrentVoiceClip() {
  if (currentVoiceSource) {
    try {
      currentVoiceSource.onended = null;
      currentVoiceSource.stop();
      currentVoiceSource.disconnect();
    } catch {
      /* ignore */
    }
    currentVoiceSource = null;
  }
  if (currentVoiceGain) {
    try {
      currentVoiceGain.disconnect();
    } catch {
      /* ignore */
    }
    currentVoiceGain = null;
  }
  if (currentVoiceAudio) {
    try {
      currentVoiceAudio.pause();
      currentVoiceAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
    currentVoiceAudio = null;
  }
  setDuck(false);
}

function playDecodedVoiceBuffer(c: AudioContext, buf: AudioBuffer) {
  if (!masterGain) return;
  stopCurrentVoiceClip();
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = clamp(vols.master * vols.voice * 1.15, 0, 1.5);
  src.connect(g);
  g.connect(masterGain);
  currentVoiceSource = src;
  currentVoiceGain = g;
  setDuck(true);
  src.onended = () => {
    if (currentVoiceSource === src) {
      currentVoiceSource = null;
      currentVoiceGain = null;
      setDuck(false);
    }
    try {
      src.disconnect();
      g.disconnect();
    } catch {
      /* ignore */
    }
  };
  src.start(0);
}

// ───────────────────────────── public API ─────────────────────────────
export const holdemAudio = {
  unlock(): void {
    const c = ensureCtx();
    if (!c) return;
    const go = () => {
      if (c.state === 'running' && pendingTrack) {
        const tr = pendingTrack;
        pendingTrack = null;
        startTrack(tr);
      }
    };
    if (c.state !== 'running') c.resume().then(go).catch(() => { /* still locked */ });
    else go();
  },
  setVolumes(v: Volumes): void {
    vols.master = clamp(v.master, 0, 1);
    vols.bgm = clamp(v.bgm, 0, 1);
    vols.se = clamp(v.se, 0, 1);
    vols.voice = clamp(v.voice, 0, 1);
    applyVolumes();
    if (currentVoiceGain) {
      currentVoiceGain.gain.value = clamp(vols.master * vols.voice * 1.15, 0, 1.5);
    }
    if (currentVoiceAudio) {
      currentVoiceAudio.volume = clamp(vols.master * vols.voice, 0, 1);
    }
  },
  playBgm(track: BgmTrack): void {
    if (typeof window === 'undefined') return;
    if (!ctx || ctx.state !== 'running') {
      pendingTrack = track;
      return;
    }
    startTrack(track);
  },
  stopBgm(): void {
    pendingTrack = null;
    fadeOutCurrent(1.0);
  },
  se(name: SeName): void {
    const c = ensureCtx();
    if (!c || !seBus) return;
    if (c.state !== 'running') {
      c.resume().catch(() => { /* locked until gesture */ });
      return;
    }
    const fn = SE[name];
    try { fn(seBus, c.currentTime + 0.005); } catch { /* ignore */ }
  },
  speak(
    text: string,
    opts: {
      pitch?: number;
      rate?: number;
      gender?: 'female' | 'male';
      enabled: boolean;
      charId?: CharId;
      event?: VoiceEvent;
    },
  ): void {
    if (typeof window === 'undefined' || !opts.enabled || !text) return;
    const rawUrl = resolveVoiceClipUrl(text, {
      charId: opts.charId,
      event: opts.event,
      gender: opts.gender,
    });
    const url = `${rawUrl}?v=3`;
    stopCurrentVoiceClip();

    const c = ensureCtx();
    if (c && c.state === 'running' && voiceBufCache.has(url)) {
      playDecodedVoiceBuffer(c, voiceBufCache.get(url)!);
      return;
    }

    // Play immediately with HTMLAudioElement and warm cache for Web Audio
    try {
      const audio = new Audio(url);
      audio.volume = clamp(vols.master * vols.voice, 0, 1);
      currentVoiceAudio = audio;
      setDuck(true);
      const done = () => {
        if (currentVoiceAudio === audio) {
          currentVoiceAudio = null;
          setDuck(false);
        }
      };
      audio.onended = done;
      audio.onerror = done;
      void audio.play().catch(done);

      if (c && !voiceBufCache.has(url)) {
        void fetch(url)
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .then((ab) => (ab ? c.decodeAudioData(ab) : null))
          .then((decoded) => {
            if (decoded) voiceBufCache.set(url, decoded);
          })
          .catch(() => {
            /* ignore */
          });
      }
    } catch {
      setDuck(false);
    }
  },
  stopVoice(): void {
    stopCurrentVoiceClip();
  },
  dispose(): void {
    holdemAudio.stopVoice();
    if (timer) clearTimeout(timer);
    timer = null;
    for (const p of players) killPlayer(p);
    players = [];
    current = null;
    pendingTrack = null;
    const c = ctx;
    ctx = null;
    masterGain = bgmBus = bgmRev = seBusNode = seRevNode = null;
    seBus = null;
    noiseBuf = metalBuf = null;
    activeVoices = 0;
    ducked = false;
    if (c) c.close().catch(() => { /* ignore */ });
  },
};
