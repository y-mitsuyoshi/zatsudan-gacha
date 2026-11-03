'use client';

import { getAudioSettings } from '@/game/common/audioSettings';

export type JinroSoundType =
  | 'start'
  | 'reveal'
  | 'day'
  | 'chat'
  | 'claim'
  | 'votePhase'
  | 'voteCast'
  | 'executed'
  | 'night'
  | 'attacked'
  | 'peaceful'
  | 'win'
  | 'lose';

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    try {
      sharedCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number,
  freqEnd?: number,
): void {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + Math.min(0.015, duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.01);
}

export function playJinroSe(sound: JinroSoundType): void {
  const settings = getAudioSettings();
  if (!settings.se || settings.seVolume <= 0) return;
  const ctx = getCtx();
  if (!ctx) return;
  const v = Math.min(1, Math.max(0, settings.seVolume)) * 0.22;

  switch (sound) {
    case 'start': {
      playTone(ctx, 523.25, 0, 0.08, 'triangle', v);
      playTone(ctx, 659.25, 0.07, 0.09, 'triangle', v);
      playTone(ctx, 783.99, 0.14, 0.16, 'triangle', v * 1.1);
      break;
    }
    case 'reveal': {
      playTone(ctx, 220, 0, 0.35, 'sawtooth', v * 0.65);
      playTone(ctx, 277.18, 0.04, 0.35, 'triangle', v * 0.7);
      playTone(ctx, 329.63, 0.08, 0.42, 'triangle', v * 0.8);
      break;
    }
    case 'day': {
      // Japanese corporate chime motif (F4 - A4 - G4 - C4)
      playTone(ctx, 349.23, 0, 0.16, 'sine', v * 0.9);
      playTone(ctx, 440.0, 0.15, 0.16, 'sine', v * 0.9);
      playTone(ctx, 392.0, 0.3, 0.18, 'sine', v * 0.9);
      playTone(ctx, 261.63, 0.46, 0.28, 'sine', v);
      break;
    }
    case 'chat': {
      playTone(ctx, 680, 0, 0.035, 'sine', v * 0.35, 520);
      break;
    }
    case 'claim': {
      playTone(ctx, 587.33, 0, 0.07, 'square', v * 0.65);
      playTone(ctx, 880, 0.06, 0.14, 'square', v * 0.75);
      break;
    }
    case 'votePhase': {
      playTone(ctx, 196.0, 0, 0.14, 'triangle', v);
      playTone(ctx, 196.0, 0.16, 0.22, 'triangle', v * 1.1);
      break;
    }
    case 'voteCast': {
      // Hanko stamp thud
      playTone(ctx, 150, 0, 0.09, 'triangle', v * 1.2, 55);
      playTone(ctx, 420, 0.01, 0.04, 'square', v * 0.4, 180);
      break;
    }
    case 'executed': {
      playTone(ctx, 180, 0, 0.18, 'sawtooth', v * 0.9, 65);
      playTone(ctx, 110, 0.12, 0.32, 'triangle', v * 1.1, 48);
      break;
    }
    case 'night': {
      playTone(ctx, 246.94, 0, 0.22, 'sine', v * 0.7);
      playTone(ctx, 185.0, 0.18, 0.32, 'sine', v * 0.8);
      break;
    }
    case 'attacked': {
      playTone(ctx, 311.13, 0, 0.14, 'sawtooth', v * 0.8, 155.56);
      playTone(ctx, 146.83, 0.12, 0.3, 'sawtooth', v * 0.9, 73.42);
      break;
    }
    case 'peaceful': {
      playTone(ctx, 392.0, 0, 0.14, 'sine', v * 0.75);
      playTone(ctx, 493.88, 0.12, 0.14, 'sine', v * 0.75);
      playTone(ctx, 587.33, 0.24, 0.24, 'sine', v * 0.85);
      break;
    }
    case 'win': {
      playTone(ctx, 523.25, 0, 0.12, 'triangle', v);
      playTone(ctx, 659.25, 0.1, 0.12, 'triangle', v);
      playTone(ctx, 783.99, 0.2, 0.14, 'triangle', v);
      playTone(ctx, 1046.5, 0.32, 0.35, 'triangle', v * 1.1);
      break;
    }
    case 'lose': {
      playTone(ctx, 329.63, 0, 0.18, 'sawtooth', v * 0.7);
      playTone(ctx, 293.66, 0.16, 0.18, 'sawtooth', v * 0.7);
      playTone(ctx, 261.63, 0.32, 0.18, 'sawtooth', v * 0.7);
      playTone(ctx, 196.0, 0.48, 0.4, 'sawtooth', v * 0.85);
      break;
    }
  }
}
