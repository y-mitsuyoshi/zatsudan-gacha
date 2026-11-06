'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

// ============================================================================
// Types & Constants
// ============================================================================

export type DiscType = 'sun' | 'mask';

export interface DiscItem {
  id: string;
  type: DiscType;
}

export interface StackedDisc {
  id: string;
  type: DiscType;
  revealed: boolean;
}

export type AiPersonaId = 'zoltan' | 'elena' | 'theodore';

export interface PlayerState {
  id: number;
  name: string;
  title: string;
  isAi: boolean;
  persona?: AiPersonaId;
  color: string;
  accentHex: string;
  /** Remaining total discs owned by this player (stored while in hand) */
  hand: DiscItem[];
  /** Discs placed on the Altar Mat (index 0 = bottom, last index = top of stack) */
  stack: StackedDisc[];
  /** Number of permanently lost discs */
  lostCount: number;
  /** Crowns earned (0, 1, or 2 to win) */
  crowns: number;
  /** Passed in current bidding phase */
  passed: boolean;
  /** Eliminated when all 4 discs are lost */
  eliminated: boolean;
  /** Latest dynamic speech bubble */
  speech: string;
}

export type GameMode = 'cpu_4' | 'cpu_3' | 'pass_play';

export type RoundPhase =
  | 'initial_placement' // Every active player places their 1st disc onto the Altar Mat
  | 'placing_or_bidding' // Active player chooses: Stack Another Disc OR Open Bid
  | 'bidding_auction' // Active non-passed players: Raise Bid OR Pass
  | 'revealing' // Challenger flips own discs first, then clicks opponent stacks
  | 'round_summary' // End of round banner before next round
  | 'game_over';

export interface LogEntry {
  id: string;
  round: number;
  text: string;
  tone: 'info' | 'bid' | 'safe' | 'danger' | 'crown';
}

const AI_PERSONAS: Record<
  AiPersonaId,
  {
    name: string;
    title: string;
    desc: string;
    color: string;
    accentHex: string;
    quotes: {
      start: string[];
      placeFirst: string[];
      stackMore: string[];
      openBid: (bid: number) => string[];
      raiseBid: (bid: number) => string[];
      pass: string[];
      revealOwnSafe: string[];
      revealTargetSafe: string[];
      hitMask: string[];
      trapTriggered: string[];
      winRound: string[];
    };
  }
> = {
  zoltan: {
    name: '罠師ゾルタン',
    title: '初手から仮面を仕掛けてブラフで誘う策士',
    desc: '早い段階で災厄の仮面を混ぜ、あえて強気な発掘宣言で相手を自爆へと誘導するトリックスター。',
    color: 'from-purple-500/30 to-fuchsia-900/40 border-purple-400/50',
    accentHex: '#c084fc',
    quotes: {
      start: [
        'ふふ…私の祭壇、めくってみるかい？',
        '黄金か災厄か…目利きを試させてもらおう。',
      ],
      placeFirst: [
        'まずは1枚目…これが太陽とは限らないぜ？',
        '静かに1枚伏せよう。さあ、どう出る？',
      ],
      stackMore: [
        'もう1枚重ねておこう…毒か薬か、当ててごらん。',
        'ふふ、山が高くなるほど疑心暗鬼になるだろう？',
      ],
      openBid: (bid) => [
        `ここはハッタリかもよ？ ${bid}枚発掘を宣言だ！`,
        `ふふ…${bid}枚なら傷つかずにめくれるさ！`,
      ],
      raiseBid: (bid) => [
        `甘いな！ ${bid}枚まで釣り上げさせてもらうぜ！`,
        `まだいける…？ ${bid}枚宣言でどうだ！`,
      ],
      pass: [
        'くっ、自分の仮面に自爆するわけには…パスだ！',
        'ふふ、ここは欲深い挑戦者に譲ってやろう。パス！',
      ],
      revealOwnSafe: [
        'まずは自分の山から…よし、太陽の黄金盤だ！',
        'ふふ、自分の祭壇は安全なのさ！',
      ],
      revealTargetSafe: [
        'そこは太陽盤だと読んでいたぜ！',
        'いい輝きだ…まだまだ掘れるぞ！',
      ],
      hitMask: [
        'ぐああっ！ まさかここに災厄の仮面が眠っていたとは…！',
        'しまった！ 罠を踏んでしまったか…！',
      ],
      trapTriggered: [
        'かかったな！ 私の災厄の仮面へようこそ！',
        'ふはは！ だから私の山は危険だと言っただろう！',
      ],
      winRound: [
        '鮮やかな発掘だろう？ 太陽の王冠をいただくぜ！',
        'ブラフと真実の見極め、私の勝ちだな！',
      ],
    },
  },
  elena: {
    name: '強気の発掘家エレナ',
    title: '太陽盤を重ねて一気に高ビッドを狙う勝負師',
    desc: '自分の祭壇に太陽の黄金盤を厚く積み上げ、一気に高枚数ビッドで王冠獲得を狙うアグレッシブタイプ。',
    color: 'from-amber-500/30 to-orange-900/40 border-amber-400/50',
    accentHex: '#fbbf24',
    quotes: {
      start: [
        '度胸試しなら負けないわ！ 黄金盤を掘り当ててみせる！',
        '太陽の王冠は私が一番乗りでいただくわよ！',
      ],
      placeFirst: [
        '準備完了！ さあ、熱い勝負を始めましょう！',
        'まずは1枚セット！ いつでも発掘にいけるわよ！',
      ],
      stackMore: [
        'さらに1枚重ねるわ！ 攻めの姿勢は崩さない！',
        'どんどん積むわよ！ 誰が最初に仕掛けるのかしら？',
      ],
      openBid: (bid) => [
        `いくわよ！ 一気に${bid}枚の発掘チャレンジ宣言！`,
        `ここは勝負どころ！ ${bid}枚めくってみせるわ！`,
      ],
      raiseBid: (bid) => [
        `そんな枚数じゃ譲らないわ！ ${bid}枚にレイズ！`,
        `もっと熱くいきましょう！ ${bid}枚宣言よ！`,
      ],
      pass: [
        'むむ…これ以上は危険な匂いがするわね。パス！',
        'ここは一歩引いて様子見よ。どうぞめくってみて！',
      ],
      revealOwnSafe: [
        '私の山はもちろん太陽の黄金盤よ！',
        'よしっ、まずは自分の太陽盤をクリア！',
      ],
      revealTargetSafe: [
        'やったわ！ 眩しい太陽の黄金盤ね！',
        '読み通り！ まだ太陽が輝いているわ！',
      ],
      hitMask: [
        'きゃあっ！ 災厄の仮面！？ 攻めすぎたかしら…！',
        '嘘でしょ…そこに仮面を隠していたなんて！',
      ],
      trapTriggered: [
        '残念だったわね！ たまには私も仮面を伏せるのよ！',
        '欲張りすぎよ！ 私の仮面でストップね！',
      ],
      winRound: [
        'やったー！ 太陽の王冠ゲットよ！',
        '度胸と直感の勝利ね！ 王冠が輝いているわ！',
      ],
    },
  },
  theodore: {
    name: '慎重派の学者セオドア',
    title: '相手の枚数と残りディスク数から確率を計算する分析派',
    desc: '各プレイヤーの残り枚数と積み重ねられた山の期待値を冷静に計算し、勝率の高い場面でのみ勝負する頭脳派。',
    color: 'from-cyan-500/30 to-teal-900/40 border-cyan-400/50',
    accentHex: '#38bdf8',
    quotes: {
      start: [
        '盤面の枚数と確率はすべて記録していますよ。',
        '論理的に考えれば、仮面の位置はおのずと見えてきます。',
      ],
      placeFirst: [
        '定石通りに1枚配置しました。データの収集を始めましょう。',
        'まずは1枚目。皆様の表情と手札残数を拝見します。',
      ],
      stackMore: [
        '期待値を調整するため、もう1枚重ねておきましょう。',
        '場の総枚数を増やします。これで確率が変動しましたね。',
      ],
      openBid: (bid) => [
        `計算完了。安全圏である${bid}枚の発掘を宣言します。`,
        `統計的に見て、${bid}枚なら高確率で成功するはずです。`,
      ],
      raiseBid: (bid) => [
        `まだ安全確率が上回っています。${bid}枚へ引き上げましょう。`,
        `論理的帰結として、${bid}枚までなら挑戦可能です。`,
      ],
      pass: [
        'これ以上のビッドは統計的に自滅行為です。パスします。',
        '仮面の混入確率が閾値を超えました。ここは降りましょう。',
      ],
      revealOwnSafe: [
        'まずは私の祭壇から。計算通り、太陽の黄金盤です。',
        '自身の安全盤を開示しました。ここからが本番ですね。',
      ],
      revealTargetSafe: [
        'やはり太陽盤でしたね。確率通りの結果です。',
        '素晴らしい。仮面の位置を正確に回避できています。',
      ],
      hitMask: [
        'なんと…低確率の災厄の仮面を引き当ててしまいましたか…！',
        '計算外のブラフです…！ 私の分析が裏をかかれました。',
      ],
      trapTriggered: [
        'その山をめくるリスクを計算していませんでしたか？',
        '私の防衛用の仮面が見事に機能したようですね。',
      ],
      winRound: [
        '緻密な確率計算の勝利です。太陽の王冠を拝受します。',
        'ブラフに惑わされなければ、自ずと王冠へ辿り着けますよ。',
      ],
    },
  },
};

const PASS_PLAY_COLORS = [
  { color: 'from-amber-500/30 to-yellow-900/40 border-amber-400/50', accentHex: '#f59e0b' },
  { color: 'from-purple-500/30 to-fuchsia-900/40 border-purple-400/50', accentHex: '#c084fc' },
  { color: 'from-cyan-500/30 to-teal-900/40 border-cyan-400/50', accentHex: '#38bdf8' },
  { color: 'from-emerald-500/30 to-green-900/40 border-emerald-400/50', accentHex: '#34d399' },
];

// ============================================================================
// Procedural Web Audio Synthesizer (Tribal Marimba BGM + Stone/Gold/Mask SFX)
// ============================================================================

class TotemAudioEngine {
  private ctx: AudioContext | null = null;
  public sfxEnabled = true;
  public bgmEnabled = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Heavy ancient stone disc placement thud */
  public playStonePlace() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Low stone thud oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);

    // Subtle stone scrape click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(520, now);
    clickOsc.frequency.exponentialRampToValueAtTime(190, now + 0.05);
    clickGain.gain.setValueAtTime(0.12, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.065);
  }

  /** Bidding horn / tribal drum tap */
  public playBidDeclare(level = 1) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const baseFreq = Math.min(660, 280 + level * 22);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.14);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  /** Pass sound */
  public playPass() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** Golden chime on revealing a Sun Disc */
  public playSunReveal(combo = 1) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Drumroll lead-in tap + golden harmonic chord
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const shift = Math.min(1.35, 1 + (combo - 1) * 0.05);
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * shift, now + idx * 0.045);
      gain.gain.setValueAtTime(0.16, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.4);
    });
  }

  /** Thunderous gong / explosion on revealing a Cursed Mask */
  public playMaskExplosion() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Deep ominous gong chord
    const freqs = [110, 116.54, 155.56, 207.65];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.55, now + 0.75);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.82);
    });
  }

  /** Royal fanfare on earning a Sun Crown or winning the game */
  public playCrownFanfare() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.09;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }

  public startBgm() {
    if (this.bgmTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.bgmEnabled = true;

    // Mysterious Aztec Marimba / Kalimba pentatonic groove
    const marimbaNotes = [220, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const pattern = [0, 2, 4, 3, 1, 4, 2, 5, 0, 3, 6, 4, 2, 1, 3, 0];

    this.bgmTimer = window.setInterval(() => {
      if (!this.bgmEnabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const step = this.bgmStep % pattern.length;
      this.bgmStep += 1;

      // Marimba wooden tone
      const noteFreq = marimbaNotes[pattern[step]];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, now);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);

      // Soft tribal pulse on downbeats
      if (step % 4 === 0) {
        const drum = this.ctx.createOscillator();
        const drumGain = this.ctx.createGain();
        drum.type = 'triangle';
        drum.frequency.setValueAtTime(92, now);
        drum.frequency.exponentialRampToValueAtTime(42, now + 0.12);
        drumGain.gain.setValueAtTime(0.055, now);
        drumGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.13);
        drum.connect(drumGain);
        drumGain.connect(this.ctx.destination);
        drum.start(now);
        drum.stop(now + 0.14);
      }
    }, 280);
  }

  public stopBgm() {
    this.bgmEnabled = false;
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// ============================================================================
// Custom SVG Components (Sun Disc, Cursed Mask, Portraits, Altar Mat)
// ============================================================================

function SunGoldDiscSvg({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label="太陽の黄金盤"
    >
      <defs>
        <radialGradient id="sunGoldGrad" cx="50%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#sunGoldGrad)" stroke="#fde047" strokeWidth="3.5" />
      <circle
        cx="50"
        cy="50"
        r="38"
        fill="none"
        stroke="#fef9c3"
        strokeWidth="1.5"
        strokeDasharray="5 3"
      />
      {/* Sun rays */}
      {Array.from({ length: 12 }).map((_, idx) => {
        const angle = idx * 30;
        return (
          <polygon
            key={idx}
            points="50,14 46,26 54,26"
            fill="#fef08a"
            transform={`rotate(${angle} 50 50)`}
          />
        );
      })}
      <circle cx="50" cy="50" r="19" fill="#b45309" stroke="#fef08a" strokeWidth="2.5" />
      <circle cx="44" cy="46" r="2.6" fill="#fef08a" />
      <circle cx="56" cy="46" r="2.6" fill="#fef08a" />
      <path d="M43 55 Q50 60 57 55" stroke="#fef08a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function CursedMaskDiscSvg({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label="災厄の仮面"
    >
      <defs>
        <radialGradient id="maskObsidianGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#7f1d1d" />
          <stop offset="60%" stopColor="#3b0764" />
          <stop offset="100%" stopColor="#090d16" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#maskObsidianGrad)" stroke="#f43f5e" strokeWidth="3.5" />
      <circle
        cx="50"
        cy="50"
        r="38"
        fill="none"
        stroke="#fb7185"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      {/* Ancient Totem Mask */}
      <path
        d="M30 32 L50 22 L70 32 L66 68 L50 78 L34 68 Z"
        fill="#1e1b4b"
        stroke="#f43f5e"
        strokeWidth="2.5"
      />
      {/* Glowing crimson eyes */}
      <polygon points="36,44 47,48 38,53" fill="#fb7185" />
      <polygon points="64,44 53,48 62,53" fill="#fb7185" />
      {/* Jagged ritual mouth */}
      <path
        d="M38 63 L43 59 L47 64 L50 59 L53 64 L57 59 L62 63"
        stroke="#fda4af"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Forehead rune */}
      <polygon points="50,27 46,36 54,36" fill="#f43f5e" />
    </svg>
  );
}

function StoneBackDiscSvg({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label="伏せられた古代石盤"
    >
      <defs>
        <radialGradient id="stoneBackGrad" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#57534e" />
          <stop offset="65%" stopColor="#292524" />
          <stop offset="100%" stopColor="#1c1917" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#stoneBackGrad)" stroke="#d6d3d1" strokeWidth="3" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="#a8a29e" strokeWidth="1.8" strokeDasharray="6 4" />
      <polygon
        points="50,22 63,37 78,50 63,63 50,78 37,63 22,50 37,37"
        fill="none"
        stroke="#eab308"
        strokeWidth="2"
        opacity="0.75"
      />
      <circle cx="50" cy="50" r="9" fill="#44403c" stroke="#fde047" strokeWidth="2" />
    </svg>
  );
}

function PlayerPortraitSvg({
  persona,
  isHuman,
  accentHex,
}: {
  persona?: AiPersonaId;
  isHuman?: boolean;
  accentHex: string;
}) {
  if (isHuman || !persona) {
    return (
      <svg width="42" height="42" viewBox="0 0 64 64" className="shrink-0">
        <circle cx="32" cy="32" r="30" fill="#1e293b" stroke={accentHex} strokeWidth="3" />
        <polygon points="18,26 25,14 32,22 39,14 46,26" fill={accentHex} />
        <circle cx="32" cy="37" r="12" fill="#fde68a" />
        <circle cx="28" cy="35" r="2" fill="#0f172a" />
        <circle cx="36" cy="35" r="2" fill="#0f172a" />
        <path d="M27 42 Q32 46 37 42" stroke="#0f172a" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (persona === 'zoltan') {
    return (
      <svg width="42" height="42" viewBox="0 0 64 64" className="shrink-0">
        <circle cx="32" cy="32" r="30" fill="#2e1065" stroke="#c084fc" strokeWidth="3" />
        <path d="M18 22 L32 12 L46 22 L42 48 L32 54 L22 48 Z" fill="#4c1d95" stroke="#e879f9" strokeWidth="2" />
        <polygon points="23,31 30,34 24,37" fill="#f0abfc" />
        <polygon points="41,31 34,34 40,37" fill="#f0abfc" />
        <path d="M25 44 Q32 39 39 44" stroke="#f0abfc" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (persona === 'elena') {
    return (
      <svg width="42" height="42" viewBox="0 0 64 64" className="shrink-0">
        <circle cx="32" cy="32" r="30" fill="#451a03" stroke="#fbbf24" strokeWidth="3" />
        <path d="M14 26 Q32 12 50 26 L44 30 Q32 22 20 30 Z" fill="#d97706" stroke="#fde68a" strokeWidth="1.5" />
        <circle cx="32" cy="38" r="12" fill="#fed7aa" />
        <circle cx="28" cy="36" r="2.2" fill="#451a03" />
        <circle cx="36" cy="36" r="2.2" fill="#451a03" />
        <path d="M27 43 Q32 48 37 43" stroke="#9a3412" strokeWidth="2.2" fill="none" />
      </svg>
    );
  }
  return (
    <svg width="42" height="42" viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r="30" fill="#083344" stroke="#38bdf8" strokeWidth="3" />
      <circle cx="32" cy="36" r="13" fill="#e0f2fe" />
      <circle cx="27" cy="34" r="4.5" fill="none" stroke="#0284c7" strokeWidth="2" />
      <circle cx="37" cy="34" r="4.5" fill="none" stroke="#0284c7" strokeWidth="2" />
      <line x1="31.5" y1="34" x2="32.5" y2="34" stroke="#0284c7" strokeWidth="2" />
      <path d="M27 43 L37 43" stroke="#0369a1" strokeWidth="2" />
    </svg>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function createInitialHand(playerId: number): DiscItem[] {
  return [
    { id: `p${playerId}-sun-1`, type: 'sun' },
    { id: `p${playerId}-sun-2`, type: 'sun' },
    { id: `p${playerId}-sun-3`, type: 'sun' },
    { id: `p${playerId}-mask-1`, type: 'mask' },
  ];
}

function buildPlayers(mode: GameMode, passPlayCount: number): PlayerState[] {
  if (mode === 'pass_play') {
    return Array.from({ length: passPlayCount }).map((_, idx) => ({
      id: idx,
      name: `プレイヤー ${idx + 1}`,
      title: '円卓の発掘挑戦者',
      isAi: false,
      color: PASS_PLAY_COLORS[idx % PASS_PLAY_COLORS.length].color,
      accentHex: PASS_PLAY_COLORS[idx % PASS_PLAY_COLORS.length].accentHex,
      hand: createInitialHand(idx),
      stack: [],
      lostCount: 0,
      crowns: 0,
      passed: false,
      eliminated: false,
      speech: '太陽盤か災厄の仮面か…最初の1枚を祭壇へ伏せよう。',
    }));
  }

  const aiOrder: AiPersonaId[] =
    mode === 'cpu_3' ? ['zoltan', 'elena'] : ['zoltan', 'elena', 'theodore'];

  const humanPlayer: PlayerState = {
    id: 0,
    name: 'あなた（挑戦者）',
    title: '黄金円卓の探求者',
    isAi: false,
    color: 'from-emerald-500/30 to-teal-900/40 border-emerald-400/50',
    accentHex: '#34d399',
    hand: createInitialHand(0),
    stack: [],
    lostCount: 0,
    crowns: 0,
    passed: false,
    eliminated: false,
    speech: '円卓の心理戦が始まる…最初の1枚を選ぼう！',
  };

  const aiPlayers: PlayerState[] = aiOrder.map((personaId, i) => {
    const p = AI_PERSONAS[personaId];
    return {
      id: i + 1,
      name: p.name,
      title: p.title,
      isAi: true,
      persona: personaId,
      color: p.color,
      accentHex: p.accentHex,
      hand: createInitialHand(i + 1),
      stack: [],
      lostCount: 0,
      crowns: 0,
      passed: false,
      eliminated: false,
      speech: p.quotes.start[0],
    };
  });

  return [humanPlayer, ...aiPlayers];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Estimates the probability (0..1) that an opponent's TOP unrevealed disc is a safe Sun Disc,
 * based only on public information (total discs owned = hand.length + stack.length, and how many discs stacked).
 */
export function estimateStackTopSafeProbability(player: PlayerState): number {
  const unrevealedCount = player.stack.filter((d) => !d.revealed).length;
  if (unrevealedCount === 0) return 1;

  const totalOwned = player.hand.length + player.stack.length;
  if (totalOwned <= 0) return 0;

  // Since lost discs are unknown to the public, the probability that the player still holds
  // their 1 Cursed Mask is totalOwned / 4. If they hold it, and each owned disc is equally likely,
  // the baseline chance any single unrevealed disc is the Cursed Mask is 1 / 4 = 25%
  // (or slightly higher if they placed multiple discs or have bluffing tendencies).
  let maskProbOnTop = 1 / Math.max(1, totalOwned);
  if (player.persona === 'zoltan' && player.stack.length === 1) {
    maskProbOnTop = Math.min(0.55, maskProbOnTop * 1.35);
  } else if (player.persona === 'elena' && player.stack.length >= 2) {
    maskProbOnTop = Math.max(0.15, maskProbOnTop * 0.8);
  } else if (player.persona === 'theodore') {
    maskProbOnTop = Math.min(0.45, maskProbOnTop * 1.05);
  }
  return Math.max(0.05, Math.min(0.95, 1 - maskProbOnTop));
}

// ============================================================================
// Main Component
// ============================================================================

export default function TotemBluffGame() {
  const [gameMode, setGameMode] = useState<GameMode>('cpu_4');
  const [passPlayCount, setPassPlayCount] = useState<number>(3);
  const [players, setPlayers] = useState<PlayerState[]>(() => buildPlayers('cpu_4', 3));
  const [round, setRound] = useState<number>(1);
  const [phase, setPhase] = useState<RoundPhase>('initial_placement');
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [roundStarterIndex, setRoundStarterIndex] = useState<number>(0);

  // Bidding & Reveal state
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [highestBidderId, setHighestBidderId] = useState<number | null>(null);
  const [selectedBidInput, setSelectedBidInput] = useState<number>(1);
  const [revealedSafeCount, setRevealedSafeCount] = useState<number>(0);
  const [roundOutcome, setRoundOutcome] = useState<{
    type: 'success' | 'failure';
    challengerId: number;
    maskOwnerId?: number;
    summaryText: string;
  } | null>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [winReason, setWinReason] = useState<string>('');

  // Pass & Play privacy curtain
  const [passCurtainOpen, setPassCurtainOpen] = useState<boolean>(false);

  // Audio toggles
  const audioRef = useRef<TotemAudioEngine | null>(null);
  const [sfxOn, setSfxOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);

  // Rules & Probability modal/drawer state
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-log',
      round: 1,
      text: '『仮面の円卓』が開幕！まずは各プレイヤーが祭壇マットに1枚目の石盤を伏せ配置します。',
      tone: 'info',
    },
  ]);

  useEffect(() => {
    audioRef.current = new TotemAudioEngine();
    return () => {
      audioRef.current?.stopBgm();
    };
  }, []);

  const appendLog = useCallback(
    (text: string, tone: LogEntry['tone'] = 'info', roundNum = round) => {
      setLogs((prev) => [
        { id: `${Date.now()}-${Math.random()}`, round: roundNum, text, tone },
        ...prev.slice(0, 29),
      ]);
    },
    [round]
  );

  // Total discs currently on the table across all players
  const totalDiscsOnTable = useMemo(
    () => players.reduce((acc, p) => acc + p.stack.length, 0),
    [players]
  );

  // Next active (non-eliminated) player index
  const getNextActivePlayerIndex = useCallback(
    (fromIndex: number, list: PlayerState[], skipPassed = false): number => {
      const n = list.length;
      for (let step = 1; step <= n; step++) {
        const candidate = (fromIndex + step) % n;
        const p = list[candidate];
        if (!p.eliminated && (!skipPassed || !p.passed)) {
          return candidate;
        }
      }
      return fromIndex;
    },
    []
  );

  // Keep selectedBidInput valid when currentBid or totalDiscsOnTable changes
  useEffect(() => {
    if (phase === 'placing_or_bidding') {
      setSelectedBidInput((prev) =>
        Math.max(1, Math.min(Math.max(1, totalDiscsOnTable), prev))
      );
    } else if (phase === 'bidding_auction') {
      setSelectedBidInput(Math.min(totalDiscsOnTable, currentBid + 1));
    }
  }, [phase, currentBid, totalDiscsOnTable]);

  // Toggle handlers
  const handleToggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    if (audioRef.current) {
      audioRef.current.sfxEnabled = next;
      if (next) audioRef.current.playStonePlace();
    }
  };

  const handleToggleBgm = () => {
    const next = !bgmOn;
    setBgmOn(next);
    if (audioRef.current) {
      if (next) {
        audioRef.current.startBgm();
      } else {
        audioRef.current.stopBgm();
      }
    }
  };

  // Start / Reset game
  const startNewGame = useCallback(
    (mode: GameMode = gameMode, ppCount: number = passPlayCount) => {
      const initialPlayers = buildPlayers(mode, ppCount);
      setGameMode(mode);
      setPassPlayCount(ppCount);
      setPlayers(initialPlayers);
      setRound(1);
      setPhase('initial_placement');
      setTurnIndex(0);
      setRoundStarterIndex(0);
      setCurrentBid(0);
      setHighestBidderId(null);
      setSelectedBidInput(1);
      setRevealedSafeCount(0);
      setRoundOutcome(null);
      setWinnerId(null);
      setWinReason('');
      setPassCurtainOpen(false);
      setLogs([
        {
          id: `start-${Date.now()}`,
          round: 1,
          text: '新しい円卓対局を開始しました！各プレイヤーは最初の石盤を1枚祭壇マットに伏せてください。',
          tone: 'info',
        },
      ]);
      audioRef.current?.playStonePlace();
    },
    [gameMode, passPlayCount]
  );

  // Helper: AI chooses which disc to place for initial placement
  const chooseAiInitialDisc = (ai: PlayerState): DiscItem => {
    const suns = ai.hand.filter((d) => d.type === 'sun');
    const masks = ai.hand.filter((d) => d.type === 'mask');
    if (suns.length === 0) return masks[0];
    if (masks.length === 0) return suns[0];

    let maskChance = 0.25;
    if (ai.persona === 'zoltan') maskChance = 0.52;
    if (ai.persona === 'elena') maskChance = 0.16;
    if (ai.persona === 'theodore') maskChance = 0.28;

    return Math.random() < maskChance ? masks[0] : suns[0];
  };

  // Phase 1A: Place initial disc on Altar Mat
  const handlePlaceInitialDisc = useCallback(
    (playerId: number, discId: string) => {
      if (phase !== 'initial_placement') return;
      audioRef.current?.playStonePlace();

      setPlayers((prev) => {
        const updated = prev.map((p) => {
          if (p.id !== playerId) return p;
          const chosen = p.hand.find((d) => d.id === discId) || p.hand[0];
          if (!chosen) return p;
          return {
            ...p,
            hand: p.hand.filter((d) => d.id !== chosen.id),
            stack: [{ id: chosen.id, type: chosen.type, revealed: false }],
            speech: p.persona
              ? pickRandom(AI_PERSONAS[p.persona].quotes.placeFirst)
              : '最初の1枚を祭壇マットに伏せた。',
          };
        });

        // If in CPU mode and human (id 0) just placed their initial disc, let all active AI players
        // who haven't placed their initial disc yet place 1 disc simultaneously for brisk pacing!
        if (gameMode !== 'pass_play') {
          const withAiPlaced = updated.map((p) => {
            if (p.eliminated || !p.isAi || p.stack.length > 0) return p;
            const chosen = chooseAiInitialDisc(p);
            return {
              ...p,
              hand: p.hand.filter((d) => d.id !== chosen.id),
              stack: [{ id: chosen.id, type: chosen.type, revealed: false }],
              speech: p.persona
                ? pickRandom(AI_PERSONAS[p.persona].quotes.placeFirst)
                : '1枚伏せた。',
            };
          });

          setPhase('placing_or_bidding');
          setTurnIndex(roundStarterIndex);
          appendLog(
            `ラウンド${round}：全員が祭壇マットに最初の石盤を1枚伏せました。`,
            'info'
          );
          return withAiPlaced;
        }

        // Pass & Play: rotate through active players until everyone has 1 disc on their Altar Mat
        const allPlaced = updated
          .filter((p) => !p.eliminated)
          .every((p) => p.stack.length >= 1);

        if (allPlaced) {
          setPhase('placing_or_bidding');
          setTurnIndex(roundStarterIndex);
          setPassCurtainOpen(true);
          appendLog(
            `ラウンド${round}：全員が最初の石盤を伏せました！手番順に「重ねる」か「発掘宣言」を選びます。`,
            'info'
          );
        } else {
          const nextIdx = getNextActivePlayerIndex(playerId, updated, false);
          setTurnIndex(nextIdx);
          setPassCurtainOpen(true);
        }
        return updated;
      });
    },
    [phase, gameMode, roundStarterIndex, round, appendLog, getNextActivePlayerIndex]
  );

  // Phase 1B: Stack another disc onto Altar Mat
  const handleStackDisc = useCallback(
    (playerId: number, discId: string) => {
      if (phase !== 'placing_or_bidding' || turnIndex !== playerId) return;
      const actor = players[playerId];
      if (!actor || actor.hand.length === 0) return;

      const chosen = actor.hand.find((d) => d.id === discId);
      if (!chosen) return;

      audioRef.current?.playStonePlace();

      const updated = players.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          hand: p.hand.filter((d) => d.id !== chosen.id),
          stack: [...p.stack, { id: chosen.id, type: chosen.type, revealed: false }],
          speech: p.persona
            ? pickRandom(AI_PERSONAS[p.persona].quotes.stackMore)
            : `祭壇に${p.stack.length + 1}枚目の石盤を重ねた！`,
        };
      });

      const nextIdx = getNextActivePlayerIndex(playerId, updated, false);
      setPlayers(updated);
      setTurnIndex(nextIdx);
      if (gameMode === 'pass_play') setPassCurtainOpen(true);
      appendLog(
        `${actor.name} が祭壇マットにさらに1枚石盤を重ねました（山：${actor.stack.length + 1}枚）。`,
        'info'
      );
    },
    [phase, turnIndex, players, getNextActivePlayerIndex, gameMode, appendLog]
  );

  // Transition into Phase 3: Dramatic Disc Reveal
  const beginRevealPhase = useCallback(
    (challengerId: number, targetBid: number, currentPlayers: PlayerState[]) => {
      const challenger = currentPlayers[challengerId];
      setHighestBidderId(challengerId);
      setCurrentBid(targetBid);
      setRevealedSafeCount(0);
      setPhase('revealing');
      setTurnIndex(challengerId);
      if (gameMode === 'pass_play') setPassCurtainOpen(false);
      appendLog(
        `🔥 ${challenger.name} が「${targetBid}枚発掘」の挑戦者に決定！まずは自分の祭壇の山を上からすべてめくります！`,
        'bid'
      );
    },
    [appendLog, gameMode]
  );

  // Phase 1B / Phase 2: Open or Raise Bid
  const handleDeclareOrRaiseBid = useCallback(
    (playerId: number, bidValue: number) => {
      if (
        (phase !== 'placing_or_bidding' && phase !== 'bidding_auction') ||
        turnIndex !== playerId
      ) {
        return;
      }
      const totalOnTable = players.reduce((acc, p) => acc + p.stack.length, 0);
      const minBid = phase === 'placing_or_bidding' ? 1 : currentBid + 1;
      const clampedBid = Math.max(minBid, Math.min(totalOnTable, bidValue));

      audioRef.current?.playBidDeclare(clampedBid);

      const actor = players[playerId];
      const isOpening = phase === 'placing_or_bidding';

      const updated = players.map((p) => {
        if (p.id !== playerId) return p;
        const quote = p.persona
          ? pickRandom(
              isOpening
                ? AI_PERSONAS[p.persona].quotes.openBid(clampedBid)
                : AI_PERSONAS[p.persona].quotes.raiseBid(clampedBid)
            )
          : `「${clampedBid}枚」発掘チャレンジを宣言する！`;
        return {
          ...p,
          speech: quote,
        };
      });

      setPlayers(updated);
      setCurrentBid(clampedBid);
      setHighestBidderId(playerId);

      appendLog(
        `${actor.name} が「${clampedBid}枚発掘（全${totalOnTable}枚中）」を宣言！`,
        'bid'
      );

      // If bid equals the maximum possible discs on the table, auction ends immediately!
      if (clampedBid >= totalOnTable) {
        beginRevealPhase(playerId, clampedBid, updated);
        return;
      }

      // Check how many non-passed active players remain
      const nonPassedActive = updated.filter((p) => !p.eliminated && !p.passed);
      if (nonPassedActive.length <= 1) {
        beginRevealPhase(playerId, clampedBid, updated);
        return;
      }

      const nextIdx = getNextActivePlayerIndex(playerId, updated, true);
      setPhase('bidding_auction');
      setTurnIndex(nextIdx);
      if (gameMode === 'pass_play') setPassCurtainOpen(true);
    },
    [
      phase,
      turnIndex,
      players,
      currentBid,
      appendLog,
      beginRevealPhase,
      getNextActivePlayerIndex,
      gameMode,
    ]
  );

  // Phase 2: Pass in Bidding Auction
  const handlePassBid = useCallback(
    (playerId: number) => {
      if (phase !== 'bidding_auction' || turnIndex !== playerId) return;
      audioRef.current?.playPass();

      const actor = players[playerId];
      const updated = players.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          passed: true,
          speech: p.persona
            ? pickRandom(AI_PERSONAS[p.persona].quotes.pass)
            : 'ここはパスして降りよう…。',
        };
      });

      appendLog(`${actor.name} が競りからパスしました。`, 'info');

      const remainingBidders = updated.filter((p) => !p.eliminated && !p.passed);
      if (remainingBidders.length <= 1 && highestBidderId !== null) {
        setPlayers(updated);
        beginRevealPhase(highestBidderId, currentBid, updated);
        return;
      }

      const nextIdx = getNextActivePlayerIndex(playerId, updated, true);
      setPlayers(updated);
      setTurnIndex(nextIdx);
      if (gameMode === 'pass_play') setPassCurtainOpen(true);
    },
    [
      phase,
      turnIndex,
      players,
      appendLog,
      highestBidderId,
      beginRevealPhase,
      currentBid,
      getNextActivePlayerIndex,
      gameMode,
    ]
  );

  // Phase 3: Flip top unrevealed disc of a target player's stack
  const handleRevealTopDisc = useCallback(
    (targetPlayerId: number) => {
      if (phase !== 'revealing' || highestBidderId === null) return;
      const challenger = players[highestBidderId];
      if (!challenger) return;

      // Enforce mandatory rule: Challenger MUST flip all of their own unrevealed discs first!
      const challengerHasUnrevealed = challenger.stack.some((d) => !d.revealed);
      if (challengerHasUnrevealed && targetPlayerId !== highestBidderId) {
        return;
      }

      const targetPlayer = players[targetPlayerId];
      if (!targetPlayer) return;

      // Find topmost unrevealed disc (highest index in stack that has revealed === false)
      let topUnrevealedIdx = -1;
      for (let i = targetPlayer.stack.length - 1; i >= 0; i--) {
        if (!targetPlayer.stack[i].revealed) {
          topUnrevealedIdx = i;
          break;
        }
      }
      if (topUnrevealedIdx === -1) return;

      const flippedDisc = targetPlayer.stack[topUnrevealedIdx];

      // Create updated stack with that disc revealed
      const updatedPlayers = players.map((p) => {
        if (p.id !== targetPlayerId) return p;
        const nextStack = p.stack.map((d, idx) =>
          idx === topUnrevealedIdx ? { ...d, revealed: true } : d
        );
        return { ...p, stack: nextStack };
      });

      // Case A: Hit a Cursed Mask (`🎭 災厄の仮面`) -> Immediate Round Failure!
      if (flippedDisc.type === 'mask') {
        audioRef.current?.playMaskExplosion();

        // Challenger permanently loses 1 random disc from their total pool (hand + stack)
        const cPlayer = updatedPlayers[highestBidderId];
        const allChallengerDiscs: DiscItem[] = [
          ...cPlayer.hand,
          ...cPlayer.stack.map((d) => ({ id: d.id, type: d.type })),
        ];
        const lostDisc =
          allChallengerDiscs.length > 0 ? pickRandom(allChallengerDiscs) : null;
        const remainingTotalCount = Math.max(0, allChallengerDiscs.length - 1);
        const isNowEliminated = remainingTotalCount === 0;

        const withPenalty = updatedPlayers.map((p) => {
          if (p.id === highestBidderId) {
            const nextHand = lostDisc
              ? p.hand.filter((d) => d.id !== lostDisc.id)
              : p.hand;
            const nextStack = lostDisc
              ? p.stack.filter((d) => d.id !== lostDisc.id)
              : p.stack;
            return {
              ...p,
              hand: nextHand,
              stack: nextStack,
              lostCount: p.lostCount + (lostDisc ? 1 : 0),
              eliminated: isNowEliminated,
              speech: p.persona
                ? pickRandom(AI_PERSONAS[p.persona].quotes.hitMask)
                : 'ぐっ…災厄の仮面を踏んでしまった！石盤を1枚失う…！',
            };
          }
          if (p.id === targetPlayerId && targetPlayerId !== highestBidderId) {
            return {
              ...p,
              speech: p.persona
                ? pickRandom(AI_PERSONAS[p.persona].quotes.trapTriggered)
                : 'よし！ 私の災厄の仮面が発動したぞ！',
            };
          }
          return p;
        });

        const failMsg =
          targetPlayerId === highestBidderId
            ? `💥 ${challenger.name} は自分自身の「🎭 災厄の仮面」をめくって自爆！ランダムに石盤1枚を永久ロストしました。`
            : `💥 ${challenger.name} が ${targetPlayer.name} の「🎭 災厄の仮面」を踏んで発掘失敗！ランダムに石盤1枚を永久ロストしました。`;

        appendLog(failMsg, 'danger');

        // Check if only 1 surviving player remains
        const survivors = withPenalty.filter((p) => !p.eliminated);
        if (survivors.length === 1) {
          const soleWinner = survivors[0];
          setPlayers(withPenalty);
          setWinnerId(soleWinner.id);
          setWinReason(
            `他のすべての挑戦者がすべての石盤を失い脱落したため、最後まで生き残った ${soleWinner.name} の勝利！`
          );
          setPhase('game_over');
          audioRef.current?.playCrownFanfare();
          appendLog(`👑 ${soleWinner.name} が最後の生存者として完全勝利！`, 'crown');
          return;
        }

        setPlayers(withPenalty);
        setRoundOutcome({
          type: 'failure',
          challengerId: highestBidderId,
          maskOwnerId: targetPlayerId,
          summaryText:
            failMsg +
            (isNowEliminated ? ` （${challenger.name} は全石盤を失い脱落！）` : ''),
        });
        setPhase('round_summary');
        return;
      }

      // Case B: Flipped a Sun Gold Disc (`☀️ 太陽の黄金盤`)!
      const nextSafeCount = revealedSafeCount + 1;
      audioRef.current?.playSunReveal(nextSafeCount);
      setRevealedSafeCount(nextSafeCount);

      // Check if Challenger reached their target bid!
      if (nextSafeCount >= currentBid) {
        audioRef.current?.playCrownFanfare();
        const nextCrowns = challenger.crowns + 1;

        const withCrown = updatedPlayers.map((p) => {
          if (p.id !== highestBidderId) return p;
          return {
            ...p,
            crowns: nextCrowns,
            speech: p.persona
              ? pickRandom(AI_PERSONAS[p.persona].quotes.winRound)
              : 'やった！ すべて太陽の黄金盤を発掘し、太陽の王冠を獲得！',
          };
        });

        const successMsg = `👑 発掘大成功！ ${challenger.name} が宣言通り ${currentBid}枚の「☀️ 太陽の黄金盤」をすべて発掘し、太陽の王冠（${nextCrowns}/2）を獲得！`;
        appendLog(successMsg, 'crown');

        if (nextCrowns >= 2) {
          setPlayers(withCrown);
          setWinnerId(highestBidderId);
          setWinReason(
            `${challenger.name} が2つ目の「👑 太陽の王冠」を獲得し、見事円卓の覇者となりました！`
          );
          setPhase('game_over');
          return;
        }

        setPlayers(withCrown);
        setRoundOutcome({
          type: 'success',
          challengerId: highestBidderId,
          summaryText: successMsg,
        });
        setPhase('round_summary');
        return;
      }

      // Still more discs to flip!
      const withSpeech = updatedPlayers.map((p) => {
        if (p.id !== highestBidderId) return p;
        const quote = p.persona
          ? pickRandom(
              targetPlayerId === highestBidderId
                ? AI_PERSONAS[p.persona].quotes.revealOwnSafe
                : AI_PERSONAS[p.persona].quotes.revealTargetSafe
            )
          : `よし、「☀️ 太陽の黄金盤」！（${nextSafeCount}/${currentBid}枚クリア）`;
        return { ...p, speech: quote };
      });

      setPlayers(withSpeech);
      appendLog(
        `☀️ ${challenger.name} が ${targetPlayer.name} の山から「太陽の黄金盤」を発掘！（${nextSafeCount} / ${currentBid}枚成功）`,
        'safe'
      );
    },
    [phase, highestBidderId, players, revealedSafeCount, currentBid, appendLog]
  );

  // Advance to the next round after round_summary
  const handleStartNextRound = useCallback(() => {
    if (phase !== 'round_summary' || !roundOutcome) return;

    // Collect all remaining stacked discs back into each player's hand
    const reclaimed = players.map((p) => {
      const returnedHand: DiscItem[] = [
        ...p.hand,
        ...p.stack.map((d) => ({ id: d.id, type: d.type })),
      ];
      return {
        ...p,
        hand: returnedHand,
        stack: [],
        passed: false,
        speech: p.eliminated
          ? '（脱落）円卓の行く末を見守っている…'
          : '新しいラウンドだ。最初の1枚を祭壇に伏せよう。',
      };
    });

    // Next round starter is the Challenger (if still active), else the mask owner or next active player
    let nextStarter = roundOutcome.challengerId;
    if (reclaimed[nextStarter]?.eliminated) {
      if (
        roundOutcome.maskOwnerId !== undefined &&
        !reclaimed[roundOutcome.maskOwnerId]?.eliminated
      ) {
        nextStarter = roundOutcome.maskOwnerId;
      } else {
        nextStarter = getNextActivePlayerIndex(nextStarter, reclaimed, false);
      }
    }

    const nextRoundNum = round + 1;
    setPlayers(reclaimed);
    setRound(nextRoundNum);
    setRoundStarterIndex(nextStarter);
    setTurnIndex(
      gameMode === 'pass_play'
        ? nextStarter
        : reclaimed[0].eliminated
          ? nextStarter
          : 0
    );
    setCurrentBid(0);
    setHighestBidderId(null);
    setSelectedBidInput(1);
    setRevealedSafeCount(0);
    setRoundOutcome(null);
    setPhase('initial_placement');
    if (gameMode === 'pass_play') setPassCurtainOpen(true);

    appendLog(
      `ラウンド${nextRoundNum}開始！各プレイヤーは手元に石盤を回収し、最初の1枚を伏せます（先手：${reclaimed[nextStarter].name}）。`,
      'info',
      nextRoundNum
    );
  }, [
    phase,
    roundOutcome,
    players,
    round,
    gameMode,
    getNextActivePlayerIndex,
    appendLog,
  ]);

  // ============================================================================
  // AI Decision Engine (Initial Placement, Placing/Bidding, Auction, Revealing)
  // ============================================================================

  useEffect(() => {
    if (phase === 'round_summary' || phase === 'game_over') return;

    // 1. If in initial_placement and human (id 0) is eliminated in CPU mode, auto-place for all AIs
    if (
      phase === 'initial_placement' &&
      gameMode !== 'pass_play' &&
      players[0]?.eliminated
    ) {
      const timer = window.setTimeout(() => {
        const firstAi = players.find((p) => !p.eliminated && p.isAi && p.hand.length > 0);
        if (firstAi) {
          const chosen = chooseAiInitialDisc(firstAi);
          handlePlaceInitialDisc(firstAi.id, chosen.id);
        }
      }, 650);
      return () => window.clearTimeout(timer);
    }

    // 2. If in revealing phase and Challenger is an AI, flip 1 disc every ~950ms
    if (phase === 'revealing' && highestBidderId !== null) {
      const challenger = players[highestBidderId];
      if (!challenger || !challenger.isAi) return;

      const timer = window.setTimeout(() => {
        // Must flip own unrevealed discs first
        const ownHasUnrevealed = challenger.stack.some((d) => !d.revealed);
        if (ownHasUnrevealed) {
          handleRevealTopDisc(challenger.id);
          return;
        }

        // Choose an opponent stack with unrevealed discs that has the highest estimated safe probability
        const candidates = players.filter(
          (p) =>
            p.id !== challenger.id &&
            !p.eliminated &&
            p.stack.some((d) => !d.revealed)
        );
        if (candidates.length === 0) return;

        const sorted = [...candidates].sort(
          (a, b) =>
            estimateStackTopSafeProbability(b) - estimateStackTopSafeProbability(a)
        );
        handleRevealTopDisc(sorted[0].id);
      }, 950);

      return () => window.clearTimeout(timer);
    }

    // 3. If in placing_or_bidding or bidding_auction and current turn is AI
    const activePlayer = players[turnIndex];
    if (!activePlayer || !activePlayer.isAi || activePlayer.eliminated) return;

    const timer = window.setTimeout(() => {
      const totalOnTable = players.reduce((acc, p) => acc + p.stack.length, 0);
      const ownHasMaskOnTable = activePlayer.stack.some((d) => d.type === 'mask');
      const ownSunOnTable = activePlayer.stack.filter((d) => d.type === 'sun').length;

      // Expected safe discs across opponents
      const expectedOpponentSafe = players
        .filter((p) => p.id !== activePlayer.id && !p.eliminated)
        .reduce((sum, p) => {
          const topSafe = estimateStackTopSafeProbability(p);
          return sum + p.stack.length * topSafe * 0.82;
        }, 0);

      const safeEstimate = ownHasMaskOnTable
        ? Math.max(1, Math.round(expectedOpponentSafe * 0.65))
        : Math.min(totalOnTable, Math.max(1, Math.round(ownSunOnTable + expectedOpponentSafe)));

      if (phase === 'placing_or_bidding') {
        // Must open bid if hand is empty
        if (activePlayer.hand.length === 0) {
          const bidToOpen = Math.max(1, Math.min(totalOnTable, safeEstimate));
          handleDeclareOrRaiseBid(activePlayer.id, bidToOpen);
          return;
        }

        // Personality-driven decision: Stack Another Disc vs Open Bid
        let openBidProb = totalOnTable >= players.filter((p) => !p.eliminated).length + 2 ? 0.58 : 0.28;
        if (activePlayer.persona === 'zoltan' && ownHasMaskOnTable) {
          // Zoltan loves baiting by opening a low/medium bid when he has a mask down!
          openBidProb = 0.68;
        } else if (activePlayer.persona === 'elena') {
          // Elena stacks 2 discs first, then opens a bold bid
          openBidProb = activePlayer.stack.length >= 2 ? 0.78 : 0.22;
        } else if (activePlayer.persona === 'theodore') {
          openBidProb = !ownHasMaskOnTable && totalOnTable >= 5 ? 0.65 : 0.3;
        }

        if (Math.random() < openBidProb) {
          let openingBid = Math.max(1, Math.min(totalOnTable, safeEstimate - 1));
          if (activePlayer.persona === 'zoltan' && ownHasMaskOnTable) {
            openingBid = Math.min(totalOnTable, Math.max(1, Math.min(2, totalOnTable - 1)));
          } else if (activePlayer.persona === 'elena' && !ownHasMaskOnTable) {
            openingBid = Math.min(totalOnTable, Math.max(2, safeEstimate));
          }
          handleDeclareOrRaiseBid(activePlayer.id, openingBid);
        } else {
          // Stack another disc from hand
          const suns = activePlayer.hand.filter((d) => d.type === 'sun');
          const masks = activePlayer.hand.filter((d) => d.type === 'mask');
          let chosen: DiscItem = activePlayer.hand[0];
          if (activePlayer.persona === 'zoltan' && masks.length > 0 && Math.random() < 0.55) {
            chosen = masks[0];
          } else if (suns.length > 0) {
            chosen = suns[0];
          }
          handleStackDisc(activePlayer.id, chosen.id);
        }
        return;
      }

      if (phase === 'bidding_auction') {
        const nextMinBid = currentBid + 1;
        if (nextMinBid > totalOnTable) {
          handlePassBid(activePlayer.id);
          return;
        }

        // If AI has its own Cursed Mask in its stack, it knows it would blow itself up unless it's bluffing at low bid
        if (ownHasMaskOnTable) {
          if (
            activePlayer.persona === 'zoltan' &&
            nextMinBid <= Math.min(3, totalOnTable - 1) &&
            Math.random() < 0.42
          ) {
            handleDeclareOrRaiseBid(activePlayer.id, nextMinBid);
          } else {
            handlePassBid(activePlayer.id);
          }
          return;
        }

        // Otherwise compare nextMinBid with safeEstimate
        const threshold =
          activePlayer.persona === 'elena'
            ? safeEstimate + 1
            : activePlayer.persona === 'theodore'
              ? safeEstimate
              : safeEstimate;

        if (nextMinBid <= threshold && Math.random() < 0.78) {
          handleDeclareOrRaiseBid(activePlayer.id, nextMinBid);
        } else {
          handlePassBid(activePlayer.id);
        }
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    phase,
    turnIndex,
    players,
    gameMode,
    highestBidderId,
    currentBid,
    handlePlaceInitialDisc,
    handleRevealTopDisc,
    handleDeclareOrRaiseBid,
    handleStackDisc,
    handlePassBid,
  ]);

  // ============================================================================
  // Derived UI Helpers & Probability Analytics
  // ============================================================================

  const activeTurnPlayer = players[turnIndex];
  const challengerPlayer =
    highestBidderId !== null ? players[highestBidderId] : null;

  // Whose hand should be displayed in the bottom Control Panel?
  const controlledPlayer: PlayerState = useMemo(() => {
    if (gameMode === 'pass_play') {
      if (phase === 'revealing' && challengerPlayer) return challengerPlayer;
      return activeTurnPlayer || players[0];
    }
    return players[0];
  }, [gameMode, phase, challengerPlayer, activeTurnPlayer, players]);

  const isHumanTurnToAct = useMemo(() => {
    if (phase === 'round_summary' || phase === 'game_over') return false;
    if (phase === 'initial_placement') {
      if (gameMode === 'pass_play') {
        return !activeTurnPlayer?.eliminated && activeTurnPlayer?.stack.length === 0;
      }
      return !players[0].eliminated && players[0].stack.length === 0;
    }
    if (phase === 'revealing') {
      return challengerPlayer ? !challengerPlayer.isAi : false;
    }
    return activeTurnPlayer ? !activeTurnPlayer.isAi : false;
  }, [phase, gameMode, activeTurnPlayer, players, challengerPlayer]);

  // Probability HUD summary for the human/active player
  const probabilitySummary = useMemo(() => {
    const targetBid =
      phase === 'bidding_auction' || phase === 'revealing'
        ? currentBid
        : selectedBidInput;
    const viewer = controlledPlayer;
    const ownHasUnrevealedMask = viewer.stack.some(
      (d) => !d.revealed && d.type === 'mask'
    );
    const ownUnrevealedCount = viewer.stack.filter((d) => !d.revealed).length;

    if (ownHasUnrevealedMask && phase !== 'revealing') {
      return {
        overallSafePct: 0,
        advice:
          '⚠️ あなた自身の祭壇に「🎭 災厄の仮面」が伏せられています！挑戦者になると自分の山をすべてめくるルールのため自爆します（ブラフで競り上げて相手にパスさせるのは有効ですが、自分が最高ビッドで残らないよう注意！）。',
      };
    }

    const neededFromOpponents = Math.max(0, targetBid - ownUnrevealedCount - revealedSafeCount);
    if (neededFromOpponents <= 0) {
      return {
        overallSafePct: 100,
        advice:
          '✅ 自分の祭壇の太陽盤だけで達成できる枚数です！100%安全に発掘成功できます。',
      };
    }

    // Multiply top-safe probabilities of best opponent stacks
    const opponentProbs = players
      .filter((p) => p.id !== viewer.id && !p.eliminated)
      .flatMap((p) => {
        const topP = estimateStackTopSafeProbability(p);
        const unrev = p.stack.filter((d) => !d.revealed).length;
        return Array.from({ length: unrev }).map((_, idx) =>
          Math.max(0.15, topP - idx * 0.14)
        );
      })
      .sort((a, b) => b - a);

    let combined = 1;
    for (let i = 0; i < neededFromOpponents; i++) {
      combined *= opponentProbs[i] ?? 0.2;
    }
    const pct = Math.round(combined * 100);
    const advice =
      pct >= 70
        ? `🟢 推定安全発掘率は ${pct}% と高めです。太陽盤を多く積んでいる相手の上段を狙いましょう！`
        : pct >= 40
          ? `🟡 推定安全発掘率は ${pct}% の五分五分勝負です。罠師ゾルタンや1枚しか伏せていない相手の山には要注意！`
          : `🔴 推定安全発掘率は ${pct}% と危険域です！相手がパスしそうになければ「パスして自爆を誘う」のも賢明な戦略です。`;

    return { overallSafePct: pct, advice };
  }, [
    phase,
    currentBid,
    selectedBidInput,
    controlledPlayer,
    revealedSafeCount,
    players,
  ]);

  return (
    <section
      aria-label="仮面の円卓（Totem Bluff）ゲーム盤面"
      className="relative min-h-screen bg-gradient-to-b from-[#0b0908] via-[#17120e] to-[#090706] text-stone-100 selection:bg-amber-500/30"
    >
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-[#120e0b]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/games"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-900/60"
            >
              ← ゲーム一覧
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-wide text-amber-300 sm:text-xl">
                  🎭 仮面の円卓
                </span>
                <span className="hidden rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200 sm:inline-block">
                  Totem Bluff
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                太陽の黄金盤（☀️×3）と災厄の仮面（🎭×1）を重ねる心理ブラフ＆度胸試し入札ボードゲーム
              </p>
            </div>
          </div>

          {/* Mode & Audio Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center rounded-xl border border-stone-700/80 bg-stone-900/90 p-1 text-xs">
              <button
                type="button"
                onClick={() => startNewGame('cpu_4', passPlayCount)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  gameMode === 'cpu_4'
                    ? 'bg-amber-500 text-stone-950 shadow'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                CPU 4人円卓
              </button>
              <button
                type="button"
                onClick={() => startNewGame('cpu_3', passPlayCount)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  gameMode === 'cpu_3'
                    ? 'bg-amber-500 text-stone-950 shadow'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                CPU 3人円卓
              </button>
              <button
                type="button"
                onClick={() => startNewGame('pass_play', passPlayCount)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  gameMode === 'pass_play'
                    ? 'bg-amber-500 text-stone-950 shadow'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                1台で2〜4人対戦
              </button>
            </div>

            {gameMode === 'pass_play' && (
              <div className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-stone-900/90 px-2 py-1 text-xs">
                <span className="text-stone-400">人数:</span>
                {[2, 3, 4].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => startNewGame('pass_play', cnt)}
                    className={`rounded px-2 py-0.5 font-bold ${
                      passPlayCount === cnt
                        ? 'bg-amber-400 text-stone-950'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {cnt}人
                  </button>
                ))}
              </div>
            )}

            {/* BGM Toggle */}
            <button
              type="button"
              onClick={handleToggleBgm}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                bgmOn
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                  : 'border-stone-700 bg-stone-900/80 text-stone-400 hover:text-stone-200'
              }`}
            >
              🎵 BGM {bgmOn ? 'ON' : 'OFF'}
            </button>

            {/* SFX Toggle */}
            <button
              type="button"
              onClick={handleToggleSfx}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                sfxOn
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-stone-700 bg-stone-900/80 text-stone-400 hover:text-stone-200'
              }`}
            >
              🔊 効果音 {sfxOn ? 'ON' : 'OFF'}
            </button>

            {/* Rules Modal Button */}
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20"
            >
              📖 ルール・役一覧
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => startNewGame(gameMode, passPlayCount)}
              className="rounded-xl border border-stone-700 bg-stone-800/90 px-3 py-1.5 text-xs font-semibold text-stone-200 transition hover:bg-stone-700"
            >
              🔄 最初から
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        {/* Left/Center 8 Columns: Round Table Arena + Action Controls */}
        <div className="space-y-5 lg:col-span-8">
          {/* Status Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-stone-900/95 via-amber-950/40 to-stone-900/95 p-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-amber-400/40">
                  ROUND {round}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-amber-100 sm:text-base">
                    {phase === 'initial_placement' &&
                      '① 初期配置フェーズ：祭壇マットに最初の石盤を1枚伏せます'}
                    {phase === 'placing_or_bidding' &&
                      `② 配置または挑戦宣言：${activeTurnPlayer?.name ?? ''} の手番`}
                    {phase === 'bidding_auction' &&
                      `③ 発掘枚数の競りフェーズ：現在最高宣言「${currentBid}枚」（${challengerPlayer?.name ?? ''}）`}
                    {phase === 'revealing' &&
                      `④ 運命の発掘めくりフェーズ：挑戦者 ${challengerPlayer?.name ?? ''} （${revealedSafeCount} / ${currentBid}枚成功）`}
                    {phase === 'round_summary' && 'ラウンド決着！結果を確認して次へ進みます'}
                    {phase === 'game_over' && '🏆 決着！仮面の円卓の覇者が決定しました！'}
                  </h2>
                  <p className="text-xs text-stone-300">
                    {phase === 'initial_placement' &&
                      '手元の4枚（☀️太陽の黄金盤3枚・🎭災厄の仮面1枚）から最初の1枚を選んで祭壇に伏せてください。'}
                    {phase === 'placing_or_bidding' &&
                      '「さらに1枚石盤を伏せて重ねる」か、「場の石盤から何枚連続で☀️太陽盤をめくれるか宣言（ビッド）」します。'}
                    {phase === 'bidding_auction' &&
                      '前の宣言より多い枚数を「競り上げる（レイズ）」か、「パスして降りる」かを選択します。'}
                    {phase === 'revealing' &&
                      'ルール：挑戦者は必ず「自分自身の祭壇の山」を上からすべてめくり、その後で他プレイヤーの山の一番上を1枚ずつクリックして発掘します！'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-stone-700/80 bg-stone-950/80 px-3.5 py-2 text-xs">
                <div>
                  <span className="block text-[10px] text-stone-400">場の総石盤数</span>
                  <span className="text-base font-extrabold text-amber-300">
                    {totalDiscsOnTable} 枚
                  </span>
                </div>
                <div className="h-6 w-px bg-stone-800" />
                <div>
                  <span className="block text-[10px] text-stone-400">現在の宣言枚数</span>
                  <span className="text-base font-extrabold text-rose-300">
                    {currentBid > 0 ? `${currentBid} 枚` : '未宣言'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Round Table Altar Mats Grid */}
          <div className="relative rounded-3xl border border-amber-500/25 bg-[radial-gradient(circle_at_center,#291d12_0%,#120d0a_72%)] p-5 shadow-2xl">
            {/* Decorative Ancient Sun Circle in Center */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
              <SunGoldDiscSvg size={280} />
            </div>

            <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {players.map((p) => {
                const isCurrentTurn =
                  turnIndex === p.id &&
                  phase !== 'round_summary' &&
                  phase !== 'game_over';
                const isChallenger = highestBidderId === p.id && currentBid > 0;
                const unrevealedInStack = p.stack.filter((d) => !d.revealed).length;

                // Can the Challenger click this player's stack right now during 'revealing'?
                const challengerSelfHasUnrevealed =
                  challengerPlayer?.stack.some((d) => !d.revealed) ?? false;
                const canClickToReveal =
                  phase === 'revealing' &&
                  isHumanTurnToAct &&
                  unrevealedInStack > 0 &&
                  (challengerSelfHasUnrevealed
                    ? p.id === highestBidderId
                    : p.id !== highestBidderId);

                const safeProbPct = Math.round(estimateStackTopSafeProbability(p) * 100);

                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col justify-between rounded-2xl border bg-gradient-to-br p-4 transition-all duration-300 ${
                      p.color
                    } ${
                      p.eliminated
                        ? 'opacity-45 grayscale'
                        : isCurrentTurn
                          ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.28)]'
                          : ''
                    }`}
                  >
                    {/* Player Header & Crown Badges */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <PlayerPortraitSvg
                            persona={p.persona}
                            isHuman={!p.isAi}
                            accentHex={p.accentHex}
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-extrabold text-white">
                                {p.name}
                              </span>
                              {isCurrentTurn && (
                                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-stone-950">
                                  手番
                                </span>
                              )}
                              {isChallenger && (
                                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                                  🔥 挑戦者 ({currentBid}枚)
                                </span>
                              )}
                              {p.passed && (
                                <span className="rounded-full bg-stone-700 px-2 py-0.5 text-[10px] font-bold text-stone-300">
                                  PASS
                                </span>
                              )}
                              {p.eliminated && (
                                <span className="rounded-full bg-red-900/80 px-2 py-0.5 text-[10px] font-bold text-red-200">
                                  脱落
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-300">{p.title}</p>
                          </div>
                        </div>

                        {/* Crown Status (Altar Mat Mode) */}
                        <div
                          className={`flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-extrabold ${
                            p.crowns >= 1
                              ? 'border-yellow-300 bg-yellow-400/20 text-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.35)]'
                              : 'border-stone-700 bg-stone-900/70 text-stone-400'
                          }`}
                          title="太陽の王冠（2個先取で勝利）"
                        >
                          <span>👑</span>
                          <span>{p.crowns} / 2</span>
                        </div>
                      </div>

                      {/* Speech Bubble */}
                      <div className="mt-2.5 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-xs italic text-amber-100/95">
                        「{p.speech}」
                      </div>
                    </div>

                    {/* Altar Mat & Stacked Stone Discs */}
                    <div className="my-3 flex flex-col items-center justify-center rounded-xl border border-amber-500/25 bg-black/40 p-3">
                      <div className="mb-2 flex w-full items-center justify-between text-[11px] text-stone-300">
                        <span>
                          🪨 祭壇の山：<strong>{p.stack.length}枚</strong>
                          {unrevealedInStack > 0 && `（未公開 ${unrevealedInStack}枚）`}
                        </span>
                        <span className="text-amber-300/90">
                          手札残：<strong>{p.hand.length}枚</strong> / 総所持：
                          <strong>{p.hand.length + p.stack.length}枚</strong>
                        </span>
                      </div>

                      {p.stack.length === 0 ? (
                        <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-stone-700 text-xs text-stone-500">
                          祭壇マット（まだ石盤が伏せられていません）
                        </div>
                      ) : (
                        <div className="flex min-h-[5rem] flex-wrap items-center justify-center gap-2.5 py-1">
                          {p.stack.map((disc, idx) => {
                            const isTopUnrevealed =
                              !disc.revealed &&
                              idx ===
                                p.stack.map((d) => d.revealed).lastIndexOf(false);
                            return (
                              <div
                                key={disc.id}
                                className={`relative flex flex-col items-center transition-transform ${
                                  isTopUnrevealed && canClickToReveal
                                    ? 'scale-105 animate-pulse'
                                    : ''
                                }`}
                              >
                                {disc.revealed ? (
                                  disc.type === 'sun' ? (
                                    <SunGoldDiscSvg size={54} />
                                  ) : (
                                    <CursedMaskDiscSvg size={54} />
                                  )
                                ) : (
                                  <StoneBackDiscSvg size={54} />
                                )}
                                <span className="mt-1 rounded bg-stone-900/90 px-1.5 py-0.5 text-[10px] font-bold text-stone-300">
                                  {idx + 1}段目
                                  {disc.revealed
                                    ? disc.type === 'sun'
                                      ? ' ☀️太陽'
                                      : ' 🎭仮面!'
                                    : isTopUnrevealed
                                      ? ' (最上段)'
                                      : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Reveal Button when Challenger can flip this stack */}
                      {canClickToReveal && (
                        <button
                          type="button"
                          onClick={() => handleRevealTopDisc(p.id)}
                          className="mt-2.5 w-full rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-4 py-2 text-xs font-extrabold text-stone-950 shadow-lg transition hover:brightness-110"
                        >
                          {p.id === highestBidderId
                            ? `✨ 自分の祭壇の最上段をめくる（残り${unrevealedInStack}枚）`
                            : `🔍 ${p.name} の祭壇の最上段をめくる！（推定安全率 ${safeProbPct}%）`}
                        </button>
                      )}
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center justify-between text-[11px] text-stone-400">
                      <span>
                        永久ロスト: <strong className="text-rose-400">{p.lostCount}枚</strong>
                      </span>
                      {!p.eliminated && p.stack.length > 0 && (
                        <span>
                          最上段の推定☀️安全率:{' '}
                          <strong
                            className={
                              safeProbPct >= 75
                                ? 'text-emerald-300'
                                : safeProbPct >= 50
                                  ? 'text-amber-300'
                                  : 'text-rose-300'
                            }
                          >
                            {safeProbPct}%
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pass & Play Privacy Curtain */}
          {gameMode === 'pass_play' &&
          passCurtainOpen &&
          phase !== 'revealing' &&
          phase !== 'round_summary' &&
          phase !== 'game_over' ? (
            <div className="rounded-2xl border-2 border-amber-400/60 bg-stone-950/95 p-6 text-center shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                PASS &amp; PLAY PRIVACY SHIELD
              </p>
              <h3 className="mt-1 text-lg font-extrabold text-white">
                次は「{controlledPlayer.name}」の手番です
              </h3>
              <p className="mt-1 text-xs text-stone-300">
                他のプレイヤーに手札（太陽盤・災厄の仮面）が見えない状態で下のボタンを押してください。
              </p>
              <button
                type="button"
                onClick={() => setPassCurtainOpen(false)}
                className="mt-4 rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-extrabold text-stone-950 shadow hover:bg-amber-300"
              >
                👁️ {controlledPlayer.name} の手札を表示して操作する
              </button>
            </div>
          ) : (
            /* Player Hand & Action Command Deck */
            <div className="rounded-2xl border border-amber-500/35 bg-stone-900/95 p-5 shadow-xl">
              {/* Round Summary Banner */}
              {phase === 'round_summary' && roundOutcome && (
                <div
                  className={`mb-4 rounded-2xl border p-4 ${
                    roundOutcome.type === 'success'
                      ? 'border-amber-400 bg-amber-500/15 text-amber-100'
                      : 'border-rose-500 bg-rose-950/40 text-rose-100'
                  }`}
                >
                  <h3 className="text-base font-extrabold">
                    {roundOutcome.type === 'success'
                      ? '👑 発掘チャレンジ大成功！太陽の王冠を獲得！'
                      : '💥 災厄の仮面が出現！発掘チャレンジ失敗…'}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed">
                    {roundOutcome.summaryText}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartNextRound}
                    className="mt-3 rounded-xl bg-amber-400 px-5 py-2 text-xs font-extrabold text-stone-950 shadow hover:bg-amber-300"
                  >
                    次のラウンドへ進む →
                  </button>
                </div>
              )}

              {/* Game Over Banner */}
              {phase === 'game_over' && winnerId !== null && (
                <div className="mb-4 rounded-2xl border-2 border-yellow-400 bg-gradient-to-r from-amber-950/80 via-yellow-900/40 to-amber-950/80 p-5 text-center shadow-2xl">
                  <div className="text-3xl">👑🏆👑</div>
                  <h3 className="mt-1 text-xl font-extrabold text-yellow-300">
                    {players[winnerId]?.name} の勝利！
                  </h3>
                  <p className="mt-1 text-xs text-stone-200">{winReason}</p>
                  <button
                    type="button"
                    onClick={() => startNewGame(gameMode, passPlayCount)}
                    className="mt-4 rounded-xl bg-yellow-400 px-6 py-2.5 text-sm font-extrabold text-stone-950 shadow-lg hover:bg-yellow-300"
                  >
                    🔄 もう一度『仮面の円卓』を遊ぶ
                  </button>
                </div>
              )}

              {/* Active Hand & Phase Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
                <div>
                  <span className="text-xs font-bold text-amber-300">
                    🎴 {controlledPlayer.name} の手札ディスク（残り {controlledPlayer.hand.length}{' '}
                    枚）
                  </span>
                  <p className="text-[11px] text-stone-400">
                    自分の祭壇に伏せた石盤の中身：
                    {controlledPlayer.stack.length === 0
                      ? ' なし'
                      : controlledPlayer.stack
                          .map(
                            (d, i) =>
                              ` [${i + 1}段目: ${d.type === 'sun' ? '☀️太陽盤' : '🎭災厄の仮面'}]`
                          )
                          .join('')}
                  </p>
                </div>
                {!isHumanTurnToAct &&
                  phase !== 'round_summary' &&
                  phase !== 'game_over' && (
                    <span className="animate-pulse rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                      ⏳ AIプレイヤーが思考・行動中…
                    </span>
                  )}
              </div>

              {/* Hand Disc Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {controlledPlayer.hand.map((disc) => {
                  const isSun = disc.type === 'sun';
                  const canPlace =
                    isHumanTurnToAct &&
                    (phase === 'initial_placement' || phase === 'placing_or_bidding');

                  return (
                    <button
                      key={disc.id}
                      type="button"
                      disabled={!canPlace}
                      onClick={() => {
                        if (phase === 'initial_placement') {
                          handlePlaceInitialDisc(controlledPlayer.id, disc.id);
                        } else if (phase === 'placing_or_bidding') {
                          handleStackDisc(controlledPlayer.id, disc.id);
                        }
                      }}
                      className={`group flex flex-col items-center rounded-2xl border p-3 text-center transition ${
                        isSun
                          ? 'border-amber-400/50 bg-amber-950/30 hover:border-amber-300 hover:bg-amber-900/40'
                          : 'border-rose-500/50 bg-rose-950/30 hover:border-rose-400 hover:bg-rose-900/40'
                      } ${!canPlace ? 'cursor-not-allowed opacity-50' : 'cursor-pointer shadow-md'}`}
                    >
                      {isSun ? <SunGoldDiscSvg size={56} /> : <CursedMaskDiscSvg size={56} />}
                      <span
                        className={`mt-2 text-xs font-extrabold ${
                          isSun ? 'text-amber-200' : 'text-rose-200'
                        }`}
                      >
                        {isSun ? '☀️ 太陽の黄金盤' : '🎭 災厄の仮面'}
                      </span>
                      <span className="mt-0.5 text-[10px] text-stone-400">
                        {isSun ? 'セーフ（発掘成功）' : 'アウト（踏むと爆発）'}
                      </span>
                      {canPlace && (
                        <span className="mt-2 rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white group-hover:bg-amber-400 group-hover:text-stone-950">
                          {phase === 'initial_placement'
                            ? 'この1枚を伏せる'
                            : '祭壇に重ねて伏せる'}
                        </span>
                      )}
                    </button>
                  );
                })}
                {controlledPlayer.hand.length === 0 && (
                  <div className="col-span-full rounded-xl border border-dashed border-stone-700 py-4 text-center text-xs text-stone-400">
                    手札の石盤はすべて祭壇マットに配置済みです（発掘チャレンジ宣言を行ってください）。
                  </div>
                )}
              </div>

              {/* Bidding Controls (Open Bid or Raise/Pass) */}
              {(phase === 'placing_or_bidding' || phase === 'bidding_auction') && (
                <div className="mt-5 rounded-2xl border border-amber-400/30 bg-black/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-extrabold text-amber-300">
                        📣{' '}
                        {phase === 'placing_or_bidding'
                          ? 'アクション②：発掘チャレンジを宣言する（競りを開始）'
                          : `発掘枚数の競り上げ（現在最高：${currentBid}枚 / 場：${totalDiscsOnTable}枚）`}
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        {phase === 'placing_or_bidding'
                          ? '石盤を重ねる代わりに、場の石盤のうち何枚連続で「☀️ 太陽の黄金盤」をめくれるか宣言できます。'
                          : '現在の宣言枚数より高い枚数を宣言するか、パスして競りから降ります。'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Bid Number Selector */}
                      <div className="flex items-center gap-1 rounded-xl border border-stone-700 bg-stone-900 px-2 py-1">
                        <button
                          type="button"
                          disabled={
                            !isHumanTurnToAct ||
                            selectedBidInput <=
                              (phase === 'placing_or_bidding' ? 1 : currentBid + 1)
                          }
                          onClick={() =>
                            setSelectedBidInput((v) =>
                              Math.max(
                                phase === 'placing_or_bidding' ? 1 : currentBid + 1,
                                v - 1
                              )
                            )
                          }
                          className="rounded px-2 py-1 text-xs font-bold text-stone-200 hover:bg-stone-800 disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="min-w-[4.5rem] text-center text-sm font-extrabold text-amber-300">
                          {selectedBidInput} 枚
                        </span>
                        <button
                          type="button"
                          disabled={
                            !isHumanTurnToAct || selectedBidInput >= totalDiscsOnTable
                          }
                          onClick={() =>
                            setSelectedBidInput((v) =>
                              Math.min(totalDiscsOnTable, v + 1)
                            )
                          }
                          className="rounded px-2 py-1 text-xs font-bold text-stone-200 hover:bg-stone-800 disabled:opacity-30"
                        >
                          ＋
                        </button>
                      </div>

                      {/* Declare / Raise Button */}
                      <button
                        type="button"
                        disabled={!isHumanTurnToAct}
                        onClick={() =>
                          handleDeclareOrRaiseBid(controlledPlayer.id, selectedBidInput)
                        }
                        className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-xs font-extrabold text-stone-950 shadow transition hover:brightness-110 disabled:opacity-40"
                      >
                        🔥 {selectedBidInput}枚で
                        {phase === 'placing_or_bidding' ? '発掘宣言！' : '競り上げる！'}
                      </button>

                      {/* Pass Button (only during bidding_auction) */}
                      {phase === 'bidding_auction' && (
                        <button
                          type="button"
                          disabled={!isHumanTurnToAct}
                          onClick={() => handlePassBid(controlledPlayer.id)}
                          className="rounded-xl border border-stone-600 bg-stone-800 px-4 py-2 text-xs font-bold text-stone-200 transition hover:bg-stone-700 disabled:opacity-40"
                        >
                          🛡️ パスして降りる
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 4 Columns: Live Bluff & Safe-Flip Probability HUD + Battle Log */}
        <aside className="space-y-5 lg:col-span-4">
          {/* Live Bluff & Safe-Flip Probability Analyzer */}
          <div className="rounded-2xl border border-amber-500/30 bg-stone-900/95 p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <h3 className="text-xs font-extrabold tracking-wide text-amber-300">
                📊 リアルタイム安全発掘確率＆相手の手札残数メーター
              </h3>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                確率アナライザー
              </span>
            </div>

            {/* Overall Safe Flip Meter */}
            <div className="mt-3 rounded-xl border border-stone-800 bg-stone-950/90 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">
                  目標宣言枚数（
                  {phase === 'bidding_auction' || phase === 'revealing'
                    ? `${currentBid}枚`
                    : `${selectedBidInput}枚`}
                  ）の推定安全率
                </span>
                <span
                  className={`text-base font-extrabold ${
                    probabilitySummary.overallSafePct >= 70
                      ? 'text-emerald-400'
                      : probabilitySummary.overallSafePct >= 40
                        ? 'text-amber-300'
                        : 'text-rose-400'
                  }`}
                >
                  {probabilitySummary.overallSafePct}%
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-stone-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    probabilitySummary.overallSafePct >= 70
                      ? 'bg-emerald-400'
                      : probabilitySummary.overallSafePct >= 40
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                  }`}
                  style={{ width: `${probabilitySummary.overallSafePct}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-stone-300">
                {probabilitySummary.advice}
              </p>
            </div>

            {/* Per-Player Remaining Disc & Stack Top Probability Breakdown */}
            <div className="mt-3 space-y-2">
              {players.map((p) => {
                const totalOwned = p.hand.length + p.stack.length;
                const topSafePct = Math.round(estimateStackTopSafeProbability(p) * 100);
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-stone-800/90 bg-stone-950/60 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-200">
                        {p.name} {p.crowns > 0 ? '👑' : ''}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        所持 <strong className="text-amber-300">{totalOwned}枚</strong>（手札
                        {p.hand.length} / 場{p.stack.length}）
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-stone-400">山の一番上が☀️太陽盤の確率</span>
                      <span
                        className={`font-bold ${
                          topSafePct >= 75
                            ? 'text-emerald-300'
                            : topSafePct >= 50
                              ? 'text-amber-300'
                              : 'text-rose-300'
                        }`}
                      >
                        {p.stack.length > 0 ? `${topSafePct}%` : '未配置'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Round-Table AI Personalities Guide */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-4 shadow-xl">
            <h3 className="text-xs font-extrabold text-amber-300">
              🗿 円卓のAIパーソナリティ特徴
            </h3>
            <div className="mt-2.5 space-y-2 text-[11px] text-stone-300">
              <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-2">
                <strong className="text-purple-300">罠師ゾルタン：</strong>
                初手から「🎭災厄の仮面」を伏せ、あえて2〜3枚の宣言で誘い込むブラフの名手。
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2">
                <strong className="text-amber-300">強気の発掘家エレナ：</strong>
                自分の祭壇に「☀️太陽の黄金盤」を2枚以上重ねてから高ビッドを狙う本格派。
              </div>
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-2">
                <strong className="text-cyan-300">慎重派の学者セオドア：</strong>
                場の枚数と期待値を計算し、無理な競りには即座にパスする堅実な分析家。
              </div>
            </div>
          </div>

          {/* Action Log */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-4 shadow-xl">
            <h3 className="text-xs font-extrabold text-amber-300">📜 円卓の発掘記録ログ</h3>
            <div className="mt-2.5 max-h-60 space-y-1.5 overflow-y-auto pr-1 text-xs">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-lg border px-2.5 py-1.5 leading-relaxed ${
                    entry.tone === 'crown'
                      ? 'border-yellow-400/50 bg-yellow-500/15 text-yellow-200'
                      : entry.tone === 'danger'
                        ? 'border-rose-500/50 bg-rose-950/40 text-rose-200'
                        : entry.tone === 'safe'
                          ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                          : entry.tone === 'bid'
                            ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
                            : 'border-stone-800 bg-stone-950/60 text-stone-300'
                  }`}
                >
                  <span className="mr-1.5 font-bold text-stone-400">[R{entry.round}]</span>
                  {entry.text}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-amber-400/40 bg-stone-900 p-6 text-stone-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-lg font-extrabold text-amber-300">
                📖 『仮面の円卓（Totem Bluff）』公式ルールガイド
              </h3>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="rounded-lg border border-stone-700 px-3 py-1 text-xs font-bold text-stone-300 hover:bg-stone-800"
              >
                ✕ 閉じる
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs leading-relaxed text-stone-200 sm:text-sm">
              <div>
                <h4 className="font-extrabold text-amber-300">
                  1. 勝利条件（太陽の王冠 2ポイント先取 または 最後の生存者）
                </h4>
                <p className="mt-1">
                  各プレイヤーは初期手札として<strong>「☀️ 太陽の黄金盤（セーフ）×3枚」</strong>と
                  <strong>「🎭 災厄の仮面（アウト）×1枚」</strong>の計4枚の古代石盤を持ちます。
                  発掘チャレンジに2回成功して<strong>「👑 太陽の王冠」を2つ先取</strong>するか、他の全員がすべての石盤を失い<strong>最後の1人として生き残れば勝利</strong>です。
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-amber-300">
                  2. フェーズ①：伏せ配置 または 発掘枚数ビッド（挑戦宣言）
                </h4>
                <p className="mt-1">
                  ラウンド開始時、全員が自分の祭壇マットに1枚ずつ石盤を裏向きで伏せます。その後、手番のプレイヤーは<strong>「① 手札からもう1枚石盤を自分の山の上に伏せて重ねる」</strong>か、<strong>「② 場にある石盤のうち何枚連続で☀️太陽の黄金盤をめくれるか発掘枚数を宣言する」</strong>かのどちらかを選びます。
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-amber-300">
                  3. フェーズ②：発掘枚数の競り上げ（オークション）
                </h4>
                <p className="mt-1">
                  誰かが発掘宣言を行ったら、以降は石盤を重ねることはできません。順番に<strong>「さらに多い枚数を宣言して競り上げる（レイズ）」</strong>か<strong>「パスして降りる」</strong>かを選びます。1人を除いて全員がパスするか、場の総枚数に達した時点で最高枚数を宣言したプレイヤーが<strong>「挑戦者（チャレンジャー）」</strong>となります。
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-amber-300">
                  4. フェーズ③：運命の発掘めくり（鉄則：自分の山が最優先！）
                </h4>
                <p className="mt-1">
                  挑戦者は宣言した枚数だけ石盤を1枚ずつ表向きにめくります。<strong>重要な鉄則として、挑戦者は必ず「自分自身の祭壇に積まれた石盤」を一番上からすべてめくらなければなりません！</strong>自分の山をすべてめくってもまだ宣言枚数に足りない場合、好きな相手プレイヤーの山の一番上の石盤を1枚ずつ選んでめくります。
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <strong>👑 発掘成功：</strong>1枚も「🎭 災厄の仮面」を出さずに宣言枚数の「☀️ 太陽の黄金盤」をめくり切ったら成功！太陽の王冠を+1獲得します。
                  </li>
                  <li>
                    <strong>💥 発掘失敗（自爆・罠発動）：</strong>1枚でも「🎭 災厄の仮面」が出た瞬間ラウンド終了！挑戦者はペナルティとして<strong>自分の所持石盤からランダムに1枚をゲームから永久に失います</strong>。
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
