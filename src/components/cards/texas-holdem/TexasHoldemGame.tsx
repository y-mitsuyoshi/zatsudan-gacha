'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import {
  CardItem,
  createStandardDeck,
  formatRank,
  PlayingCardView,
  shuffleWithRng,
  SUIT_SYMBOL,
} from '@/components/cards/shared/cardUtils';
import {
  AnimeSoulPortraitSvg,
  computeDanRank,
  SOUL_CHARACTERS,
  SOUL_STAMPS,
  SoulAvatarId,
  SoulCharacterModal,
  SoulCutInData,
  SoulCutInOverlay,
  SoulStampItem,
} from './HoldemSoulExtras';

type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
type GameMode = 'cash' | 'tournament';
type TableThemeId = 'emerald' | 'crimson' | 'midnight';
type CharacterId = 'player' | 'victor' | 'seraphina' | 'ryan';
type ExpressionState =
  | 'normal'
  | 'thinking'
  | 'confident'
  | 'bluffing'
  | 'shocked'
  | 'winner'
  | 'folded';

export interface EvaluatedHand {
  category: number; // 9=RoyalFlush, 8=StraightFlush, 7=FourKind, 6=FullHouse, 5=Flush, 4=Straight, 3=ThreeKind, 2=TwoPair, 1=OnePair, 0=HighCard
  nameJa: string;
  score: number; // lexicographical numeric score for tie-breaking
  bestFiveIds: string[];
}

interface CharacterProfile {
  characterId: CharacterId;
  name: string;
  nickname: string;
  title: string;
  vpip: number;
  pfr: number;
  af: number;
  voicePitch: number;
  voiceRate: number;
  accentColor: string;
  badgeClass: string;
  quotes: {
    preflop: string[];
    check: string[];
    call: string[];
    raise: string[];
    allIn: string[];
    fold: string[];
    win: string[];
    lose: string[];
  };
}

interface HoldemPlayer {
  id: number;
  characterId: CharacterId;
  name: string;
  styleName: string;
  isHuman: boolean;
  chips: number;
  holeCards: CardItem[];
  currentBet: number;
  totalCommitted: number;
  folded: boolean;
  allIn: boolean;
  actedThisStreet: boolean;
  lastActionLabel: string;
  actionBadge: 'WAIT' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL-IN!' | 'FOLD' | 'WIN!';
  expression: ExpressionState;
  speechText: string;
  wonAmount: number;
  handsPlayed: number;
  handsWon: number;
}

interface ShowdownPlayerResult {
  playerId: number;
  name: string;
  handName: string;
  bestFiveIds: string[];
  wonAmount: number;
  isWinner: boolean;
  holeCards: CardItem[];
}

const CHARACTER_PROFILES: Record<CharacterId, CharacterProfile> = {
  player: {
    characterId: 'player',
    name: 'あなた',
    nickname: 'VIP CHALLENGER',
    title: 'ハイローラー挑戦者 / 自在型',
    vpip: 28,
    pfr: 21,
    af: 2.8,
    voicePitch: 1.0,
    voiceRate: 1.05,
    accentColor: '#38bdf8',
    badgeClass: 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200',
    quotes: {
      preflop: ['さあ、勝負といこう。'],
      check: ['ここは様子見のチェックだ。'],
      call: ['コール。カードを見よう。'],
      raise: ['レイズ！プレッシャーをかける！'],
      allIn: ['オールイン！すべてを賭ける！'],
      fold: ['ここは賢くフォールドだ。'],
      win: ['よし、読み通りのポット獲得！'],
      lose: ['くっ…次は取り返す！'],
    },
  },
  victor: {
    characterId: 'victor',
    name: 'ヴィクター・クロウ',
    nickname: 'Victor "The Shark" Crowe',
    title: '元ウォール街クオンツ / TAG（タイト・アグレッシブ）',
    vpip: 22,
    pfr: 18,
    af: 3.4,
    voicePitch: 0.82,
    voiceRate: 1.02,
    accentColor: '#60a5fa',
    badgeClass: 'border-blue-400/50 bg-blue-500/15 text-blue-200',
    quotes: {
      preflop: [
        '確率は嘘をつかない。まずはレンジを絞らせてもらう。',
        'リスクとリターンの均衡点を見極めよう。',
      ],
      check: [
        'ポットコントロールだ。チェック。',
        'ここは情報収集といこう。チェックだ。',
      ],
      call: [
        '読めているぞ。オッズ計算通りコールだ。',
        'インプライドオッズ十分。コールさせてもらう。',
      ],
      raise: [
        '期待値はプラスだ。レイズさせてもらう。',
        '薄いエクイティは許さん。レイズだ。',
      ],
      allIn: [
        '計算は完了した。全チップを投入する――オールインだ！',
        '逃げ場はないぞ。オールイン！',
      ],
      fold: [
        'オッズが合わん。ここはクールにフォールドだ。',
        '期待値マイナスの勝負はしない主義でね。降りるよ。',
      ],
      win: [
        '当然の帰結だ。数学的優位は揺るがない。',
        '完璧なバリュー抽出だ。チップは頂いていく。',
      ],
      lose: [
        'なるほど、分散のいたずらか。次は修正する。',
        '見事なラインだ。データを更新しておこう。',
      ],
    },
  },
  seraphina: {
    characterId: 'seraphina',
    name: 'セラフィナ・ヴァレンティノ',
    nickname: 'Seraphina "Velvet Queen"',
    title: 'モンテカルロ社交界の女帝 / LAG（ルーズ・アグレッシブ＆ブラフ巧者）',
    vpip: 38,
    pfr: 29,
    af: 4.1,
    voicePitch: 1.28,
    voiceRate: 1.08,
    accentColor: '#fb7185',
    badgeClass: 'border-rose-400/50 bg-rose-500/15 text-rose-200',
    quotes: {
      preflop: [
        '今夜のシャンパン代、たっぷり稼がせてもらうわよ♪',
        '退屈なポーカーは嫌いよ。華やかにいきましょう！',
      ],
      check: [
        'ふふっ、まずはあなたの出方を見てあげる。チェックよ。',
        '嵐の前の静けさね。チェック。',
      ],
      call: [
        '面白いじゃない。その勝負、乗ってあげるわ。コール！',
        'まだ降りないわよ。次のカードが楽しみね♪',
      ],
      raise: [
        'ふふっ、その程度のベットで私を降ろせると思って？レイズよ！',
        'ブラフか本物か、当ててみなさい！レイズ！',
      ],
      allIn: [
        'オールイン！さあ、覚悟を見せてちょうだい！',
        'すべてを賭けるわ！女王の輝きにひれ伏しなさい！',
      ],
      fold: [
        '退屈なカードね。今回は譲ってあげるわ。',
        'レディは引き際も美しいものよ。フォールド。',
      ],
      win: [
        'あら、ごめんなさいね♪ すべて私のものよ！',
        'ふふっ、私の瞳に惑わされたかしら？',
      ],
      lose: [
        'やるじゃない…！でも本当の勝負はこれからよ。',
        'まあ！私のブラフを見抜くなんて素敵ね。',
      ],
    },
  },
  ryan: {
    characterId: 'ryan',
    name: 'ライアン・チェン',
    nickname: 'Ryan "Iron Wall" Chen',
    title: 'マカオVIPルームの重鎮 / コーリングステーション＆トラッパー',
    vpip: 46,
    pfr: 12,
    af: 1.5,
    voicePitch: 0.72,
    voiceRate: 0.96,
    accentColor: '#34d399',
    badgeClass: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
    quotes: {
      preflop: [
        '焦ることはない。波が来るのを静かに待つのさ。',
        'マカオの夜は長い。じっくり付き合うよ。',
      ],
      check: [
        '静観しよう。チェックだ。',
        '急ぐ旅じゃない。チェックで回そう。',
      ],
      call: [
        'ブラフかどうか、最後まで付き合わせてもらうよ。コール。',
        '簡単に降ろせると思わないことだ。コールするよ。',
      ],
      raise: [
        'じっくり待った甲斐があった…大きく勝負だ！レイズ！',
        'ここが勝負所だな。重い一撃をお見舞いしよう。',
      ],
      allIn: [
        '泰山鳴動してすべてを呑み込む…オールインだ！',
        '私の鉄壁を崩せるかな？全額ベット、オールイン！',
      ],
      fold: [
        'さすがにそのボードは危険だな。降りよう。',
        '深追いは禁物だ。ここはフォールドさせてもらう。',
      ],
      win: [
        '忍耐こそが最大の武器さ。ごちそうさま。',
        '罠にかかったな。ゆっくり回収させてもらうよ。',
      ],
      lose: [
        'ほう、本当に強いハンドを持っていたとはな。お見事。',
        'やられたね。だがまだチップは残っているぞ。',
      ],
    },
  },
};

const TABLE_THEMES: Record<
  TableThemeId,
  {
    nameJa: string;
    subtitle: string;
    feltGradient: string;
    rimBorder: string;
    innerLine: string;
    badgeBg: string;
  }
> = {
  emerald: {
    nameJa: 'エメラルド・ロイヤル',
    subtitle: 'Emerald VIP Lounge',
    feltGradient:
      'radial-gradient(ellipse at center, #065f46 0%, #064e3b 52%, #022c22 88%, #011814 100%)',
    rimBorder: 'border-amber-500/60 shadow-[0_0_50px_rgba(16,185,129,0.28)]',
    innerLine: 'border-amber-300/30',
    badgeBg: 'bg-emerald-950/80 border-emerald-400/40 text-emerald-200',
  },
  crimson: {
    nameJa: 'ベルベット・クリムゾン',
    subtitle: 'Monte Carlo Red',
    feltGradient:
      'radial-gradient(ellipse at center, #881337 0%, #4c0519 56%, #2e0210 88%, #160108 100%)',
    rimBorder: 'border-amber-400/65 shadow-[0_0_50px_rgba(244,63,94,0.28)]',
    innerLine: 'border-amber-200/35',
    badgeBg: 'bg-rose-950/80 border-rose-400/40 text-rose-200',
  },
  midnight: {
    nameJa: 'ミッドナイト・ゴールド',
    subtitle: 'Macau High-Roller',
    feltGradient:
      'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 55%, #090d16 88%, #020617 100%)',
    rimBorder: 'border-amber-400/80 shadow-[0_0_55px_rgba(251,191,36,0.25)]',
    innerLine: 'border-amber-400/40',
    badgeBg: 'bg-slate-900/90 border-amber-400/45 text-amber-200',
  },
};

const TOURNAMENT_BLIND_LEVELS = [
  { level: 1, sb: 10, bb: 20 },
  { level: 2, sb: 20, bb: 40 },
  { level: 3, sb: 30, bb: 60 },
  { level: 4, sb: 50, bb: 100 },
  { level: 5, sb: 100, bb: 200 },
  { level: 6, sb: 200, bb: 400 },
];

// ============================================================================
// COMMERCIAL CASINO SOUND & VOICE SYNTHESIZER (100% Web Audio API + Speech)
// ============================================================================
type CasinoSoundEffect =
  | 'shuffle'
  | 'deal'
  | 'chip'
  | 'chipSplash'
  | 'checkKnock'
  | 'foldSwoosh'
  | 'allInStinger'
  | 'winFanfare';

let casinoAudioCtx: AudioContext | null = null;

function getCasinoAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!casinoAudioCtx) {
      casinoAudioCtx = new AudioCtx();
    }
    if (casinoAudioCtx.state === 'suspended') {
      void casinoAudioCtx.resume();
    }
    return casinoAudioCtx;
  } catch {
    return null;
  }
}

function playCasinoSound(effect: CasinoSoundEffect, enabled: boolean): void {
  if (!enabled) return;
  const ctx = getCasinoAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (effect === 'shuffle') {
      // Riffle shuffle: rapid staggered noise bursts + card snaps
      for (let i = 0; i < 7; i += 1) {
        const t = now + i * 0.032;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340 + i * 55, t);
        osc.frequency.exponentialRampToValueAtTime(780 + i * 40, t + 0.025);
        gain.gain.setValueAtTime(0.055, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);
      }
      return;
    }

    if (effect === 'deal') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(790, now + 0.055);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
      return;
    }

    if (effect === 'chip' || effect === 'chipSplash') {
      // Clay/ceramic casino chip clink (high metallic/ceramic overtones)
      const count = effect === 'chipSplash' ? 4 : 2;
      for (let i = 0; i < count; i += 1) {
        const t = now + i * 0.045;
        const freqs = [1820 + i * 110, 2940 + i * 160];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(f, t);
          osc.frequency.exponentialRampToValueAtTime(f * 1.18, t + 0.055);
          gain.gain.setValueAtTime(idx === 0 ? 0.065 : 0.035, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.075);
        });
      }
      return;
    }

    if (effect === 'checkKnock') {
      // Authentic two-tap wood table knock ("コンコン")
      [0, 0.11].forEach((offset, idx) => {
        const t = now + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 0 ? 155 : 172, t);
        osc.frequency.exponentialRampToValueAtTime(68, t + 0.075);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
      });
      return;
    }

    if (effect === 'foldSwoosh') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.11);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.125);
      return;
    }

    if (effect === 'allInStinger') {
      // Dramatic sub-bass impact + brassy power chord
      const chord = [110, 220, 277.18, 329.63, 440];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.01, now + 0.45);
        gain.gain.setValueAtTime(idx === 0 ? 0.09 : 0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.52);
      });
      return;
    }

    if (effect === 'winFanfare') {
      // Cascading chip rake + jazz victory arpeggio
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    }
  } catch {
    // Ignore audio context errors
  }
}

function speakCasinoVoice(
  text: string,
  enabled: boolean,
  pitch = 1.0,
  rate = 1.05
): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    // Play a subtle expressive vocal synth chime alongside speech synthesis
    const ctx = getCasinoAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(420 * pitch, now + 0.06);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ja-JP';
      utter.pitch = pitch;
      utter.rate = rate;
      utter.volume = 0.65;
      window.speechSynthesis.speak(utter);
    }
  } catch {
    // Ignore speech synthesis restrictions in headless/SSR environments
  }
}

// ============================================================================
// POKER HAND EVALUATOR & PRO ANALYTICS (EQUITY, TIER, OUTS)
// ============================================================================
function toPokerRank(rank: number): number {
  return rank === 1 ? 14 : rank;
}

function evaluateFiveCards(five: CardItem[]): EvaluatedHand {
  const ranks = five.map((c) => toPokerRank(c.rank)).sort((a, b) => b - a);
  const suits = five.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight (including A-2-3-4-5 wheel)
  let isStraight = false;
  let straightHigh = ranks[0];
  const uniqueRanks = Array.from(new Set(ranks));
  if (uniqueRanks.length === 5) {
    if (ranks[0] - ranks[4] === 4) {
      isStraight = true;
      straightHigh = ranks[0];
    } else if (
      ranks[0] === 14 &&
      ranks[1] === 5 &&
      ranks[2] === 4 &&
      ranks[3] === 3 &&
      ranks[4] === 2
    ) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Count frequencies
  const counts = new Map<number, number>();
  for (const r of ranks) {
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const groups = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const encodeTie = (vals: number[]) =>
    vals.reduce((acc, v) => acc * 16 + v, 0);

  const ids = five.map((c) => c.id);

  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        category: 9,
        nameJa: 'ロイヤルストレートフラッシュ',
        score: 9 * 1e7 + straightHigh,
        bestFiveIds: ids,
      };
    }
    return {
      category: 8,
      nameJa: 'ストレートフラッシュ',
      score: 8 * 1e7 + straightHigh,
      bestFiveIds: ids,
    };
  }

  if (groups[0][1] === 4) {
    return {
      category: 7,
      nameJa: 'フォーカード',
      score: 7 * 1e7 + encodeTie([groups[0][0], groups[1][0]]),
      bestFiveIds: ids,
    };
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return {
      category: 6,
      nameJa: 'フルハウス',
      score: 6 * 1e7 + encodeTie([groups[0][0], groups[1][0]]),
      bestFiveIds: ids,
    };
  }

  if (isFlush) {
    return {
      category: 5,
      nameJa: 'フラッシュ',
      score: 5 * 1e7 + encodeTie(ranks),
      bestFiveIds: ids,
    };
  }

  if (isStraight) {
    return {
      category: 4,
      nameJa: 'ストレート',
      score: 4 * 1e7 + straightHigh,
      bestFiveIds: ids,
    };
  }

  if (groups[0][1] === 3) {
    return {
      category: 3,
      nameJa: 'スリーカード',
      score: 3 * 1e7 + encodeTie(groups.map((g) => g[0])),
      bestFiveIds: ids,
    };
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    return {
      category: 2,
      nameJa: 'ツーペア',
      score: 2 * 1e7 + encodeTie([groups[0][0], groups[1][0], groups[2][0]]),
      bestFiveIds: ids,
    };
  }

  if (groups[0][1] === 2) {
    return {
      category: 1,
      nameJa: 'ワンペア',
      score: 1 * 1e7 + encodeTie(groups.map((g) => g[0])),
      bestFiveIds: ids,
    };
  }

  return {
    category: 0,
    nameJa: 'ハイカード（ブタ）',
    score: encodeTie(ranks),
    bestFiveIds: ids,
  };
}

export function evaluateBest7CardHand(cards: CardItem[]): EvaluatedHand {
  if (cards.length < 5) {
    const r1 = toPokerRank(cards[0]?.rank ?? 2);
    const r2 = toPokerRank(cards[1]?.rank ?? 3);
    const high = Math.max(r1, r2);
    const low = Math.min(r1, r2);
    if (r1 === r2 && cards[0]) {
      return {
        category: 1,
        nameJa: `ポケットペア (${formatRank(cards[0].rank)})`,
        score: 1 * 1e7 + high * 20,
        bestFiveIds: cards.map((c) => c.id),
      };
    }
    return {
      category: 0,
      nameJa: `${formatRank(cards[0]?.rank ?? 2)}-${formatRank(cards[1]?.rank ?? 3)} ハイ`,
      score: high * 20 + low,
      bestFiveIds: cards.map((c) => c.id),
    };
  }

  let best: EvaluatedHand | null = null;
  const n = cards.length;
  for (let i = 0; i < n - 4; i += 1) {
    for (let j = i + 1; j < n - 3; j += 1) {
      for (let k = j + 1; k < n - 2; k += 1) {
        for (let l = k + 1; l < n - 1; l += 1) {
          for (let m = l + 1; m < n; m += 1) {
            const candidate = evaluateFiveCards([
              cards[i],
              cards[j],
              cards[k],
              cards[l],
              cards[m],
            ]);
            if (!best || candidate.score > best.score) {
              best = candidate;
            }
          }
        }
      }
    }
  }
  return best!;
}

function evaluatePreflopTier(holeCards: CardItem[]): {
  notation: string;
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  labelJa: string;
  badgeColor: string;
} {
  if (holeCards.length < 2) {
    return {
      notation: '--',
      tier: 'C',
      labelJa: '待機中',
      badgeColor: 'border-slate-500 bg-slate-800 text-slate-300',
    };
  }
  const c1 = holeCards[0];
  const c2 = holeCards[1];
  const r1 = toPokerRank(c1.rank);
  const r2 = toPokerRank(c2.rank);
  const high = Math.max(r1, r2);
  const low = Math.min(r1, r2);
  const highStr = formatRank(high === 14 ? 1 : high);
  const lowStr = formatRank(low === 14 ? 1 : low);
  const suited = c1.suit === c2.suit;
  const isPair = r1 === r2;
  const notation = isPair
    ? `${highStr}${lowStr}`
    : `${highStr}${lowStr}${suited ? 's' : 'o'}`;

  if (
    (isPair && high >= 11) ||
    (high === 14 && low === 13 && suited)
  ) {
    return {
      notation,
      tier: 'S',
      labelJa: 'プレミアム (超強力)',
      badgeColor: 'border-amber-300 bg-amber-400/25 text-amber-200',
    };
  }
  if (
    (isPair && high >= 8) ||
    (high === 14 && low >= 11) ||
    (high === 13 && low === 12 && suited)
  ) {
    return {
      notation,
      tier: 'A',
      labelJa: '強ハンド (レイズ推奨)',
      badgeColor: 'border-emerald-400 bg-emerald-500/20 text-emerald-200',
    };
  }
  if (
    isPair ||
    (suited && high >= 11 && low >= 9) ||
    (suited && high - low === 1 && low >= 6) ||
    (high === 14 && suited)
  ) {
    return {
      notation,
      tier: 'B',
      labelJa: '中堅・投機ハンド',
      badgeColor: 'border-cyan-400 bg-cyan-500/20 text-cyan-200',
    };
  }
  if (high >= 12 || (suited && high - low <= 2)) {
    return {
      notation,
      tier: 'C',
      labelJa: 'マージナル (状況次第)',
      badgeColor: 'border-slate-400 bg-slate-700/60 text-slate-200',
    };
  }
  return {
    notation,
    tier: 'D',
    labelJa: '弱ハンド (フォールド推奨)',
    badgeColor: 'border-rose-400/50 bg-rose-500/15 text-rose-200',
  };
}

function analyzeDrawsAndOuts(
  holeCards: CardItem[],
  communityCards: CardItem[]
): { outs: number; labels: string[] } {
  if (holeCards.length < 2 || communityCards.length < 3 || communityCards.length >= 5) {
    return { outs: 0, labels: [] };
  }
  const all = [...holeCards, ...communityCards];
  const currentEval = evaluateBest7CardHand(all);
  const labels: string[] = [];
  let outs = 0;

  // Flush draw check (4 of same suit)
  const suitCounts = new Map<string, number>();
  for (const c of all) {
    suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
  }
  const hasFlushDraw = Array.from(suitCounts.values()).some((cnt) => cnt === 4);
  if (hasFlushDraw && currentEval.category < 5) {
    outs += 9;
    labels.push('フラッシュドロー (9 outs)');
  }

  // Straight draw check
  if (currentEval.category < 4) {
    const uniqueRanks = new Set<number>();
    for (const c of all) {
      const r = toPokerRank(c.rank);
      uniqueRanks.add(r);
      if (r === 14) uniqueRanks.add(1);
    }
    let straightOutRanks = 0;
    for (let target = 1; target <= 14; target += 1) {
      if (uniqueRanks.has(target)) continue;
      const testSet = new Set(uniqueRanks);
      testSet.add(target);
      if (target === 14) testSet.add(1);
      let makesStraight = false;
      for (let low = 1; low <= 10; low += 1) {
        if (
          testSet.has(low) &&
          testSet.has(low + 1) &&
          testSet.has(low + 2) &&
          testSet.has(low + 3) &&
          testSet.has(low + 4)
        ) {
          makesStraight = true;
          break;
        }
      }
      if (makesStraight) {
        straightOutRanks += 1;
      }
    }
    if (straightOutRanks >= 2) {
      const added = hasFlushDraw ? 6 : 8;
      outs += added;
      labels.push('両面ストレートドロー (8 outs)');
    } else if (straightOutRanks === 1) {
      const added = hasFlushDraw ? 3 : 4;
      outs += added;
      labels.push('ガットショット (4 outs)');
    }
  }

  // Overcards when only high card
  if (currentEval.category === 0 && outs === 0) {
    const maxBoard = Math.max(...communityCards.map((c) => toPokerRank(c.rank)));
    const overcards = holeCards.filter((c) => toPokerRank(c.rank) > maxBoard).length;
    if (overcards === 2) {
      outs += 6;
      labels.push('オーバーカード2枚 (6 outs)');
    } else if (overcards === 1) {
      outs += 3;
      labels.push('オーバーカード1枚 (3 outs)');
    }
  }

  return { outs, labels };
}

function estimateMonteCarloEquity(
  holeCards: CardItem[],
  communityCards: CardItem[],
  activeOpponents: number,
  iterations = 140
): number {
  if (holeCards.length < 2) return 0;
  if (activeOpponents <= 0) return 100;

  const knownIds = new Set([
    ...holeCards.map((c) => c.id),
    ...communityCards.map((c) => c.id),
  ]);
  const remainingDeck = createStandardDeck(true, 1).filter(
    (c) => !knownIds.has(c.id)
  );
  const neededBoard = Math.max(0, 5 - communityCards.length);

  let equityPoints = 0;
  for (let sim = 0; sim < iterations; sim += 1) {
    const drawCount = neededBoard + activeOpponents * 2;
    const pool = [...remainingDeck];
    for (let i = 0; i < drawCount; i += 1) {
      const r = i + Math.floor(Math.random() * (pool.length - i));
      const tmp = pool[i];
      pool[i] = pool[r];
      pool[r] = tmp;
    }

    const simBoard = [...communityCards, ...pool.slice(0, neededBoard)];
    const myEval = evaluateBest7CardHand([...holeCards, ...simBoard]);

    let beaten = false;
    let tiedCount = 1;
    for (let opp = 0; opp < activeOpponents; opp += 1) {
      const oppHole = [
        pool[neededBoard + opp * 2],
        pool[neededBoard + opp * 2 + 1],
      ];
      const oppEval = evaluateBest7CardHand([...oppHole, ...simBoard]);
      if (oppEval.score > myEval.score) {
        beaten = true;
        break;
      }
      if (oppEval.score === myEval.score) {
        tiedCount += 1;
      }
    }
    if (!beaten) {
      equityPoints += 1 / tiedCount;
    }
  }

  return Math.round((equityPoints / iterations) * 100);
}

// ============================================================================
// CUSTOM SVG CHARACTER PORTRAITS & 3D CASINO CHIP VISUALS
// ============================================================================
function CharacterPortraitSvg({
  characterId,
  expression,
  className = 'w-14 h-14',
}: {
  characterId: CharacterId;
  expression: ExpressionState;
  className?: string;
}) {
  const isFolded = expression === 'folded';
  const isWinner = expression === 'winner';
  const isConfident = expression === 'confident' || expression === 'bluffing';
  const isShocked = expression === 'shocked';

  if (characterId === 'victor') {
    // Victor "The Shark" Crowe: Navy pinstripe suit, silver-streaked hair, gold aviator glasses
    return (
      <svg
        viewBox="0 0 80 80"
        className={`${className} rounded-full border-2 ${
          isWinner
            ? 'border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.75)]'
            : isFolded
              ? 'border-slate-600 grayscale opacity-60'
              : 'border-blue-400/80 shadow-md'
        }`}
        aria-label="ヴィクター・クロウ"
      >
        <defs>
          <radialGradient id="victorBg" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#090d16" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="39" fill="url(#victorBg)" />
        {/* Navy Pinstripe Suit & Red Power Tie */}
        <path d="M12 78 C14 58 26 54 40 54 C54 54 66 58 68 78 Z" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
        <path d="M33 54 L40 68 L47 54 Z" fill="#f8fafc" />
        <path d="M38 56 L40 74 L42 56 Z" fill="#dc2626" />
        {/* Face */}
        <ellipse cx="40" cy="36" rx="14" ry="16" fill="#f1cfa6" />
        {/* Slicked-back dark hair with silver streaks */}
        <path d="M25 32 C24 18 32 14 40 14 C49 14 56 18 55 32 C52 24 46 21 40 21 C34 21 28 24 25 32 Z" fill="#1e293b" />
        <path d="M29 22 C33 17 38 17 43 19" stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Gold Aviator Glasses */}
        <rect x="28" y="30" width="10" height="7" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.6" />
        <rect x="42" y="30" width="10" height="7" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.6" />
        <line x1="38" y1="32" x2="42" y2="32" stroke="#fbbf24" strokeWidth="1.6" />
        {/* Glint on glasses */}
        <line x1="30" y1="32" x2="34" y2="35" stroke="#93c5fd" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="44" y1="32" x2="48" y2="35" stroke="#93c5fd" strokeWidth="1.3" strokeLinecap="round" />
        {/* Dynamic Mouth */}
        {isShocked ? (
          <circle cx="40" cy="45" r="2.5" fill="#7f1d1d" />
        ) : isConfident || isWinner ? (
          <path d="M34 44 Q40 48 47 42" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : (
          <line x1="35" y1="45" x2="45" y2="44" stroke="#7c2d12" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    );
  }

  if (characterId === 'seraphina') {
    // Seraphina "Velvet Queen": Crimson gown, golden tiara, chandelier earrings, glamorous smile
    return (
      <svg
        viewBox="0 0 80 80"
        className={`${className} rounded-full border-2 ${
          isWinner
            ? 'border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.75)]'
            : isFolded
              ? 'border-slate-600 grayscale opacity-60'
              : 'border-rose-400/80 shadow-md'
        }`}
        aria-label="セラフィナ・ヴァレンティノ"
      >
        <defs>
          <radialGradient id="seraBg" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#881337" />
            <stop offset="100%" stopColor="#1f040d" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="39" fill="url(#seraBg)" />
        {/* Wavy Auburn/Gold Hair Back */}
        <path d="M20 36 C18 52 22 65 26 74 L54 74 C58 65 62 52 60 36 C59 20 50 15 40 15 C30 15 21 20 20 36 Z" fill="#451a03" />
        {/* Crimson Velvet Gown & Diamond Necklace */}
        <path d="M16 78 C20 60 29 56 40 56 C51 56 60 60 64 78 Z" fill="#be123c" stroke="#fda4af" strokeWidth="1" />
        <path d="M31 56 Q40 63 49 56" stroke="#fef08a" strokeWidth="1.8" strokeDasharray="2 2" fill="none" />
        {/* Face */}
        <ellipse cx="40" cy="37" rx="13" ry="15" fill="#fde2c8" />
        {/* Golden Tiara Crown Motif */}
        <polygon points="31,19 35,12 40,17 45,12 49,19" fill="#fbbf24" stroke="#fef08a" strokeWidth="0.8" />
        {/* Diamond Earrings */}
        <circle cx="25" cy="41" r="2.2" fill="#fef08a" />
        <circle cx="55" cy="41" r="2.2" fill="#fef08a" />
        {/* Eyes */}
        {isConfident ? (
          <>
            {/* Fearless wink */}
            <path d="M31 34 Q34 32 37 34" stroke="#1e293b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <circle cx="46" cy="34" r="2" fill="#be123c" />
          </>
        ) : (
          <>
            <circle cx="34" cy="34" r="2" fill="#be123c" />
            <circle cx="46" cy="34" r="2" fill="#be123c" />
          </>
        )}
        {/* Crimson Lipstick Smile */}
        {isShocked ? (
          <circle cx="40" cy="45" r="2.5" fill="#be123c" />
        ) : (
          <path d="M35 44 Q40 49 45 44" stroke="#e11d48" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        )}
      </svg>
    );
  }

  if (characterId === 'ryan') {
    // Ryan "Iron Wall" Chen: Emerald silk mandarin jacket, groomed beard, calm composed smile
    return (
      <svg
        viewBox="0 0 80 80"
        className={`${className} rounded-full border-2 ${
          isWinner
            ? 'border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.75)]'
            : isFolded
              ? 'border-slate-600 grayscale opacity-60'
              : 'border-emerald-400/80 shadow-md'
        }`}
        aria-label="ライアン・チェン"
      >
        <defs>
          <radialGradient id="ryanBg" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#041e17" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="39" fill="url(#ryanBg)" />
        {/* Emerald Silk Mandarin Collar Jacket with Gold Trim */}
        <path d="M13 78 C15 58 26 54 40 54 C54 54 65 58 67 78 Z" fill="#064e3b" stroke="#fbbf24" strokeWidth="1.2" />
        <line x1="40" y1="54" x2="40" y2="78" stroke="#fbbf24" strokeWidth="1.5" />
        {/* Face */}
        <ellipse cx="40" cy="36" rx="14" ry="15.5" fill="#eab68c" />
        {/* Hair & Groomed Beard */}
        <path d="M26 30 C26 18 33 15 40 15 C47 15 54 18 54 30 C50 23 30 23 26 30 Z" fill="#1f2937" />
        <path d="M32 44 Q40 52 48 44" stroke="#1f2937" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        {/* Composed Narrowed Eyes */}
        {isShocked ? (
          <>
            <circle cx="34" cy="34" r="2.1" fill="#0f172a" />
            <circle cx="46" cy="34" r="2.1" fill="#0f172a" />
          </>
        ) : (
          <>
            <path d="M31 34 Q34 32 37 34" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M43 34 Q46 32 49 34" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}
        {/* Mouth */}
        <path
          d={isWinner || isConfident ? 'M35 43 Q40 47 45 43' : 'M36 44 Q40 45 44 44'}
          stroke="#fef3c7"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Player VIP Avatar
  return (
    <svg
      viewBox="0 0 80 80"
      className={`${className} rounded-full border-2 border-cyan-400 shadow-[0_0_14px_rgba(56,189,248,0.45)]`}
      aria-label="あなた (VIP Player)"
    >
      <defs>
        <radialGradient id="playerBg" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="39" fill="url(#playerBg)" />
      <path d="M14 78 C17 59 27 54 40 54 C53 54 63 59 66 78 Z" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
      <ellipse cx="40" cy="36" rx="13.5" ry="15" fill="#f5d0b5" />
      <path d="M26 31 C26 18 33 15 40 15 C48 15 54 19 54 31 C49 23 31 23 26 31 Z" fill="#0f172a" />
      <circle cx="34" cy="34" r="2" fill="#0f172a" />
      <circle cx="46" cy="34" r="2" fill="#0f172a" />
      <path d="M35 44 Q40 48 45 44" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ChipStackVisual({
  amount,
  size = 'sm',
}: {
  amount: number;
  size?: 'sm' | 'md';
}) {
  if (amount <= 0) return null;

  // Break amount into visual chip colors ($500 purple/gold, $100 black/gold, $25 emerald, $10 blue/red)
  const chipColors: { fill: string; rim: string }[] = [];
  let rem = amount;
  const tiers = [
    { val: 500, fill: '#9333ea', rim: '#facc15' },
    { val: 100, fill: '#1e293b', rim: '#fbbf24' },
    { val: 25, fill: '#059669', rim: '#a7f3d0' },
    { val: 10, fill: '#dc2626', rim: '#fecdd3' },
  ];
  for (const t of tiers) {
    while (rem >= t.val && chipColors.length < 6) {
      chipColors.push({ fill: t.fill, rim: t.rim });
      rem -= t.val;
    }
  }
  if (chipColors.length === 0) {
    chipColors.push({ fill: '#dc2626', rim: '#fecdd3' });
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-black/75 px-2.5 py-0.5 shadow-lg">
      <svg
        viewBox="0 0 28 28"
        className={size === 'md' ? 'h-6 w-6' : 'h-4 w-4'}
        aria-hidden="true"
      >
        {chipColors.map((c, idx) => {
          const cy = 22 - idx * 3;
          return (
            <g key={idx}>
              <ellipse
                cx="14"
                cy={cy}
                rx="11"
                ry="4.2"
                fill={c.fill}
                stroke={c.rim}
                strokeWidth="1.4"
                strokeDasharray="3 1.5"
              />
            </g>
          );
        })}
      </svg>
      <span
        className={`font-mono font-black text-amber-300 ${
          size === 'md' ? 'text-xs sm:text-sm' : 'text-[11px]'
        }`}
      >
        {amount.toLocaleString()}
      </span>
    </div>
  );
}

// ============================================================================
// MAIN TEXAS HOLD'EM COMMERCIAL GAME COMPONENT
// ============================================================================
export default function TexasHoldemGame() {
  const [gameMode, setGameMode] = useState<GameMode>('cash');
  const [tableTheme, setTableTheme] = useState<TableThemeId>('emerald');
  const [players, setPlayers] = useState<HoldemPlayer[]>(() => [
    {
      id: 0,
      characterId: 'player',
      name: CHARACTER_PROFILES.player.name,
      styleName: CHARACTER_PROFILES.player.title,
      isHuman: true,
      chips: 1000,
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      folded: false,
      allIn: false,
      actedThisStreet: false,
      lastActionLabel: '待機中',
      actionBadge: 'WAIT',
      expression: 'normal',
      speechText: CHARACTER_PROFILES.player.quotes.preflop[0],
      wonAmount: 0,
      handsPlayed: 0,
      handsWon: 0,
    },
    {
      id: 1,
      characterId: 'victor',
      name: CHARACTER_PROFILES.victor.name,
      styleName: CHARACTER_PROFILES.victor.title,
      isHuman: false,
      chips: 1000,
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      folded: false,
      allIn: false,
      actedThisStreet: false,
      lastActionLabel: '待機中',
      actionBadge: 'WAIT',
      expression: 'normal',
      speechText: CHARACTER_PROFILES.victor.quotes.preflop[0],
      wonAmount: 0,
      handsPlayed: 0,
      handsWon: 0,
    },
    {
      id: 2,
      characterId: 'seraphina',
      name: CHARACTER_PROFILES.seraphina.name,
      styleName: CHARACTER_PROFILES.seraphina.title,
      isHuman: false,
      chips: 1000,
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      folded: false,
      allIn: false,
      actedThisStreet: false,
      lastActionLabel: '待機中',
      actionBadge: 'WAIT',
      expression: 'normal',
      speechText: CHARACTER_PROFILES.seraphina.quotes.preflop[0],
      wonAmount: 0,
      handsPlayed: 0,
      handsWon: 0,
    },
    {
      id: 3,
      characterId: 'ryan',
      name: CHARACTER_PROFILES.ryan.name,
      styleName: CHARACTER_PROFILES.ryan.title,
      isHuman: false,
      chips: 1000,
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      folded: false,
      allIn: false,
      actedThisStreet: false,
      lastActionLabel: '待機中',
      actionBadge: 'WAIT',
      expression: 'normal',
      speechText: CHARACTER_PROFILES.ryan.quotes.preflop[0],
      wonAmount: 0,
      handsPlayed: 0,
      handsWon: 0,
    },
  ]);

  const [dealerIdx, setDealerIdx] = useState<number>(0);
  const [deck, setDeck] = useState<CardItem[]>([]);
  const [communityCards, setCommunityCards] = useState<CardItem[]>([]);
  const [street, setStreet] = useState<Street>('preflop');
  const [pot, setPot] = useState<number>(0);
  const [highestBet, setHighestBet] = useState<number>(0);
  const [turnIdx, setTurnIdx] = useState<number>(0);
  const [handNumber, setHandNumber] = useState<number>(1);
  const [raiseSliderVal, setRaiseSliderVal] = useState<number>(40);

  // Audio & HUD Toggles
  const [showEquityMeter, setShowEquityMeter] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);
  const [voiceOn, setVoiceOn] = useState<boolean>(false);

  // Mahjong Soul (雀魂)-Style Character, Cut-In, Stamp, Dan-Rank & Squeeze State
  const [selectedAvatar, setSelectedAvatar] = useState<SoulAvatarId>('karen');
  const [showCharacterModal, setShowCharacterModal] = useState<boolean>(false);
  const [squeezeMode, setSqueezeMode] = useState<boolean>(false);
  const [squeezedRevealed, setSqueezedRevealed] = useState<boolean>(false);
  const [danXp, setDanXp] = useState<number>(80);
  const [bondPoints, setBondPoints] = useState<number>(60);
  const [activeCutIn, setActiveCutIn] = useState<SoulCutInData | null>(null);
  const [activeStamps, setActiveStamps] = useState<
    Record<number, { emoji: string; label: string } | null>
  >({});

  const danInfo = useMemo(() => computeDanRank(danXp), [danXp]);
  const bondLv = Math.min(5, 1 + Math.floor(bondPoints / 50));
  const currentSoulChar = SOUL_CHARACTERS[selectedAvatar];

  const getSeatAvatarId = useCallback(
    (characterOrSeat: CharacterId | number): SoulAvatarId => {
      if (characterOrSeat === 'player' || characterOrSeat === 0) {
        return selectedAvatar;
      }
      if (characterOrSeat === 'victor' || characterOrSeat === 1) {
        return selectedAvatar === 'rei' ? 'luna' : 'rei';
      }
      if (characterOrSeat === 'seraphina' || characterOrSeat === 2) {
        return selectedAvatar === 'valentina' ? 'koharu' : 'valentina';
      }
      return selectedAvatar === 'jin' ? 'karen' : 'jin';
    },
    [selectedAvatar]
  );

  const triggerSoulCutIn = useCallback(
    (
      seatOrAvatar: SoulAvatarId | number,
      headline: string,
      subline: string,
      quote: string,
      theme: 'allin' | 'win' | 'raise' | 'showdown'
    ) => {
      const avatarId: SoulAvatarId =
        typeof seatOrAvatar === 'number'
          ? getSeatAvatarId(seatOrAvatar)
          : seatOrAvatar;
      const charDef = SOUL_CHARACTERS[avatarId];
      setActiveCutIn({
        id: Date.now(),
        avatarId,
        characterName: charDef.name,
        headline,
        subline,
        quote,
        theme: theme === 'showdown' ? 'win' : theme,
      });
    },
    [getSeatAvatarId]
  );

  useEffect(() => {
    if (!activeCutIn) return;
    const t = window.setTimeout(() => {
      setActiveCutIn(null);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [activeCutIn]);

  const handleSendStamp = useCallback(
    (stamp: SoulStampItem) => {
      setActiveStamps((prev) => ({
        ...prev,
        0: { emoji: stamp.emoji, label: stamp.label },
      }));
      playCasinoSound('chip', soundOn);
      speakCasinoVoice(
        stamp.voiceText,
        voiceOn,
        currentSoulChar.voicePitch,
        currentSoulChar.voiceRate
      );

      // AI replies with a contextual stamp after 650ms
      window.setTimeout(() => {
        const aiSeat = 1 + (handNumber % 3);
        const replyStamp =
          SOUL_STAMPS[(handNumber * 3 + aiSeat) % SOUL_STAMPS.length];
        setActiveStamps((prev) => ({
          ...prev,
          [aiSeat]: { emoji: replyStamp.emoji, label: replyStamp.label },
        }));
      }, 650);

      window.setTimeout(() => {
        setActiveStamps({});
      }, 3200);
    },
    [soundOn, voiceOn, currentSoulChar, handNumber]
  );

  const [logs, setLogs] = useState<string[]>([]);
  const [banner, setBanner] = useState<string>('VIPテーブルへようこそ。ハンドを開始しています...');
  const [winnerIds, setWinnerIds] = useState<number[]>([]);
  const [showdownResults, setShowdownResults] = useState<ShowdownPlayerResult[]>([]);

  // Determine current blinds based on gameMode & handNumber
  const currentBlinds = useMemo(() => {
    if (gameMode === 'cash') {
      return { level: 1, sb: 10, bb: 20 };
    }
    const idx = Math.min(
      TOURNAMENT_BLIND_LEVELS.length - 1,
      Math.floor((Math.max(1, handNumber) - 1) / 3)
    );
    return TOURNAMENT_BLIND_LEVELS[idx];
  }, [gameMode, handNumber]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [msg, ...prev.slice(0, 18)]);
  }, []);

  // ============================================================================
  // LOUNGE JAZZ BGM SYNTHESIZER LOOP
  // ============================================================================
  const bgmStepRef = useRef<number>(0);
  useEffect(() => {
    if (!bgmOn) return;
    const progression = [
      // Dm9 -> G13 -> Cmaj9 -> A7alt (VIP Casino Lounge Jazz)
      { bass: 73.42, chord: [261.63, 329.63, 392.0, 440.0] },
      { bass: 98.0, chord: [246.94, 329.63, 349.23, 440.0] },
      { bass: 65.41, chord: [246.94, 293.66, 329.63, 392.0] },
      { bass: 110.0, chord: [261.63, 311.13, 370.0, 440.0] },
    ];

    const playJazzStep = () => {
      const ctx = getCasinoAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const step = bgmStepRef.current % 8;
      const bar = progression[Math.floor(step / 2) % progression.length];
      bgmStepRef.current += 1;

      try {
        // Walking mellow bass
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'sine';
        const bassFreq = step % 2 === 0 ? bar.bass : bar.bass * 1.25;
        bassOsc.frequency.setValueAtTime(bassFreq, now);
        bassGain.gain.setValueAtTime(0.032, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.58);

        // Warm electric piano chord on even beats
        if (step % 2 === 0) {
          bar.chord.forEach((f) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(f, now);
            g.gain.setValueAtTime(0.012, now);
            g.gain.exponentialRampToValueAtTime(0.0008, now + 0.95);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(now);
            o.stop(now + 1.0);
          });
        }
      } catch {
        // Ignore audio scheduling errors
      }
    };

    playJazzStep();
    const interval = window.setInterval(playJazzStep, 680);
    return () => window.clearInterval(interval);
  }, [bgmOn]);

  // ============================================================================
  // START NEW HAND
  // ============================================================================
  const startNewHand = useCallback(
    (
      currentPlayers: HoldemPlayer[],
      nextDealer: number,
      nextHandNum: number,
      modeOverride?: GameMode
    ) => {
      const activeMode = modeOverride ?? gameMode;
      const blindInfo =
        activeMode === 'cash'
          ? { level: 1, sb: 10, bb: 20 }
          : TOURNAMENT_BLIND_LEVELS[
              Math.min(
                TOURNAMENT_BLIND_LEVELS.length - 1,
                Math.floor((Math.max(1, nextHandNum) - 1) / 3)
              )
            ];

      const freshDeck = shuffleWithRng(createStandardDeck(true, 1));
      let cursor = 0;

      // In Cash Mode, auto-rebuy busted stacks; in Tournament Mode, reset all if only 1 survivor left
      const survivors = currentPlayers.filter((p) => p.chips >= blindInfo.bb);
      const resetAllStacks = activeMode === 'tournament' && survivors.length <= 1;

      const prepared: HoldemPlayer[] = currentPlayers.map((p) => {
        const prof = CHARACTER_PROFILES[p.characterId];
        const quoteIdx = nextHandNum % prof.quotes.preflop.length;
        const refilledChips =
          resetAllStacks || p.chips < blindInfo.bb * 2 ? 1000 : p.chips;
        const c1 = { ...freshDeck[cursor++], faceUp: p.isHuman };
        const c2 = { ...freshDeck[cursor++], faceUp: p.isHuman };
        return {
          ...p,
          chips: refilledChips,
          holeCards: [c1, c2],
          currentBet: 0,
          totalCommitted: 0,
          folded: false,
          allIn: false,
          actedThisStreet: false,
          lastActionLabel: '配牌完了',
          actionBadge: 'WAIT',
          expression: 'normal',
          speechText: prof.quotes.preflop[quoteIdx],
          wonAmount: 0,
          handsPlayed: p.handsPlayed + 1,
        };
      });

      const sbIdx = (nextDealer + 1) % 4;
      const bbIdx = (nextDealer + 2) % 4;
      const utgIdx = (nextDealer + 3) % 4;

      const sbAmt = Math.min(blindInfo.sb, prepared[sbIdx].chips);
      prepared[sbIdx].chips -= sbAmt;
      prepared[sbIdx].currentBet = sbAmt;
      prepared[sbIdx].totalCommitted = sbAmt;
      prepared[sbIdx].lastActionLabel = `SB ${sbAmt}`;
      if (prepared[sbIdx].chips === 0) prepared[sbIdx].allIn = true;

      const bbAmt = Math.min(blindInfo.bb, prepared[bbIdx].chips);
      prepared[bbIdx].chips -= bbAmt;
      prepared[bbIdx].currentBet = bbAmt;
      prepared[bbIdx].totalCommitted = bbAmt;
      prepared[bbIdx].lastActionLabel = `BB ${bbAmt}`;
      if (prepared[bbIdx].chips === 0) prepared[bbIdx].allIn = true;

      setPlayers(prepared);
      setDealerIdx(nextDealer);
      setDeck(freshDeck.slice(cursor));
      setCommunityCards([]);
      setStreet('preflop');
      setPot(sbAmt + bbAmt);
      setHighestBet(bbAmt);
      setTurnIdx(utgIdx);
      setHandNumber(nextHandNum);
      setRaiseSliderVal(bbAmt * 2);
      setWinnerIds([]);
      setShowdownResults([]);
      setSqueezedRevealed(false);
      setBondPoints((prev) => prev + 12);
      setBanner(
        `ハンド #${nextHandNum} 開始（SB ${sbAmt} / BB ${bbAmt}）― ${prepared[utgIdx].name}のアクション`
      );
      setLogs([
        `🃏 ハンド #${nextHandNum}: プリフロップ開始（SB:${prepared[sbIdx].name} ${sbAmt} / BB:${prepared[bbIdx].name} ${bbAmt}）`,
      ]);
      playCasinoSound('shuffle', soundOn);
      speakCasinoVoice('プリフロップ、カードが配られました', voiceOn, 1.0, 1.1);
    },
    [gameMode, soundOn, voiceOn]
  );

  useEffect(() => {
    startNewHand(players, 0, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // SHOWDOWN & SIDE-POT / UNCALLED BET RESOLUTION
  // ============================================================================
  const resolveShowdown = useCallback(
    (
      finalPlayers: HoldemPlayer[],
      finalBoard: CardItem[],
      finalPot: number
    ) => {
      const contenders = finalPlayers.filter((p) => !p.folded);

      // Case 1: Everyone else folded -> Single winner takes entire pot without needing to reveal
      if (contenders.length === 1) {
        const soleWinner = contenders[0];
        const updated = finalPlayers.map((p) => {
          const prof = CHARACTER_PROFILES[p.characterId];
          if (p.id === soleWinner.id) {
            return {
              ...p,
              chips: p.chips + finalPot,
              wonAmount: finalPot,
              handsWon: p.handsWon + 1,
              lastActionLabel: `🏆 勝者 (+${finalPot})`,
              actionBadge: 'WIN!' as const,
              expression: 'winner' as const,
              speechText: prof.quotes.win[handNumber % prof.quotes.win.length],
            };
          }
          return {
            ...p,
            wonAmount: 0,
            expression: 'folded' as const,
          };
        });

        setPlayers(updated);
        setCommunityCards(finalBoard);
        setStreet('showdown');
        setWinnerIds([soleWinner.id]);
        setShowdownResults([
          {
            playerId: soleWinner.id,
            name: soleWinner.name,
            handName: '全員フォールドによる無条件勝利',
            bestFiveIds: [],
            wonAmount: finalPot,
            isWinner: true,
            holeCards: soleWinner.holeCards,
          },
        ]);
        const msg = `🏆 全員フォールドにより ${soleWinner.name} がポット 🪙${finalPot.toLocaleString()} を獲得しました！`;
        setBanner(msg);
        appendLog(msg);
        playCasinoSound('winFanfare', soundOn);
        if (soleWinner.id === 0) {
          setDanXp((prev) => prev + 35);
          setBondPoints((prev) => prev + 25);
        }
        const winSoul = SOUL_CHARACTERS[getSeatAvatarId(soleWinner.id)];
        triggerSoulCutIn(
          soleWinner.id,
          'UNCONTESTED WIN!',
          `${soleWinner.name} (+🪙${finalPot.toLocaleString()})`,
          winSoul.cutInWin,
          'win'
        );
        speakCasinoVoice(
          `${soleWinner.name}の勝利。${winSoul.cutInWin}`,
          voiceOn,
          winSoul.voicePitch,
          winSoul.voiceRate
        );
        return;
      }

      // Case 2: Multi-player Showdown with accurate side-pot distribution
      const revealed = finalPlayers.map((p) => ({
        ...p,
        holeCards: p.holeCards.map((c) => ({ ...c, faceUp: true })),
      }));

      const evalMap = new Map<number, EvaluatedHand>();
      for (const p of revealed) {
        if (!p.folded) {
          evalMap.set(
            p.id,
            evaluateBest7CardHand([...p.holeCards, ...finalBoard])
          );
        }
      }

      // Side-pot calculation by distinct commitment levels among non-folded contenders
      const contenderLevels = Array.from(
        new Set(
          revealed
            .filter((p) => !p.folded && p.totalCommitted > 0)
            .map((p) => p.totalCommitted)
        )
      ).sort((a, b) => a - b);

      const winnings = new Map<number, number>();
      let prevLevel = 0;
      let distributedTotal = 0;

      for (const level of contenderLevels) {
        const sliceDiff = level - prevLevel;
        if (sliceDiff <= 0) continue;

        let slicePot = 0;
        for (const p of revealed) {
          const contrib = Math.max(
            0,
            Math.min(p.totalCommitted, level) - prevLevel
          );
          slicePot += contrib;
        }

        const eligible = revealed.filter(
          (p) => !p.folded && p.totalCommitted >= level
        );
        if (eligible.length > 0 && slicePot > 0) {
          let maxScore = -1;
          let sliceWinners: HoldemPlayer[] = [];
          for (const ep of eligible) {
            const sc = evalMap.get(ep.id)?.score ?? 0;
            if (sc > maxScore) {
              maxScore = sc;
              sliceWinners = [ep];
            } else if (sc === maxScore) {
              sliceWinners.push(ep);
            }
          }
          const share = Math.floor(slicePot / sliceWinners.length);
          const remainder = slicePot - share * sliceWinners.length;
          sliceWinners.forEach((w, idx) => {
            const add = share + (idx === 0 ? remainder : 0);
            winnings.set(w.id, (winnings.get(w.id) ?? 0) + add);
          });
          distributedTotal += slicePot;
        }
        prevLevel = level;
      }

      // If any uncalled excess remains (e.g. folded player committed more or rounding), return to highest committer
      if (distributedTotal < finalPot) {
        const leftover = finalPot - distributedTotal;
        const topContender = revealed
          .filter((p) => !p.folded)
          .sort((a, b) => b.totalCommitted - a.totalCommitted)[0];
        if (topContender) {
          winnings.set(
            topContender.id,
            (winnings.get(topContender.id) ?? 0) + leftover
          );
        }
      }

      const winIdList = Array.from(winnings.entries())
        .filter(([, amt]) => amt > 0)
        .map(([id]) => id);
      const winIdSet = new Set(winIdList);

      const updated = revealed.map((p) => {
        const won = winnings.get(p.id) ?? 0;
        const prof = CHARACTER_PROFILES[p.characterId];
        const handInfo = evalMap.get(p.id);
        if (winIdSet.has(p.id)) {
          return {
            ...p,
            chips: p.chips + won,
            wonAmount: won,
            handsWon: p.handsWon + 1,
            lastActionLabel: `🏆 ${handInfo?.nameJa ?? '勝者'} (+${won})`,
            actionBadge: 'WIN!' as const,
            expression: 'winner' as const,
            speechText: prof.quotes.win[handNumber % prof.quotes.win.length],
          };
        }
        return {
          ...p,
          wonAmount: 0,
          lastActionLabel: p.folded
            ? 'フォールド'
            : handInfo?.nameJa ?? p.lastActionLabel,
          expression: p.folded ? ('folded' as const) : ('shocked' as const),
          speechText: p.folded
            ? p.speechText
            : prof.quotes.lose[handNumber % prof.quotes.lose.length],
        };
      });

      const resultsList: ShowdownPlayerResult[] = updated
        .filter((p) => !p.folded)
        .map((p) => {
          const ev = evalMap.get(p.id)!;
          return {
            playerId: p.id,
            name: p.name,
            handName: ev.nameJa,
            bestFiveIds: ev.bestFiveIds,
            wonAmount: p.wonAmount,
            isWinner: winIdSet.has(p.id),
            holeCards: p.holeCards,
          };
        })
        .sort((a, b) => b.wonAmount - a.wonAmount);

      const primaryWinner = resultsList[0];
      const winnerNames = resultsList
        .filter((r) => r.isWinner)
        .map((r) => r.name)
        .join(' & ');

      setPlayers(updated);
      setCommunityCards(finalBoard);
      setStreet('showdown');
      setWinnerIds(winIdList);
      setShowdownResults(resultsList);

      const msg = `🏆 ショーダウン！ ${winnerNames} が「${primaryWinner?.handName ?? ''}」でポット 🪙${finalPot.toLocaleString()} を獲得！`;
      setBanner(msg);
      appendLog(msg);
      playCasinoSound('winFanfare', soundOn);
      if (winIdSet.has(0)) {
        setDanXp((prev) => prev + 65);
        setBondPoints((prev) => prev + 40);
      }
      if (primaryWinner) {
        const winSoul = SOUL_CHARACTERS[getSeatAvatarId(primaryWinner.playerId)];
        triggerSoulCutIn(
          primaryWinner.playerId,
          `SHOWDOWN: ${primaryWinner.handName}`,
          `${primaryWinner.name} (+🪙${primaryWinner.wonAmount.toLocaleString()})`,
          winSoul.cutInWin,
          'showdown'
        );
        speakCasinoVoice(
          `ショーダウン！${primaryWinner.name}が${primaryWinner.handName}で勝利！${winSoul.cutInWin}`,
          voiceOn,
          winSoul.voicePitch,
          winSoul.voiceRate
        );
      }
    },
    [appendLog, getSeatAvatarId, handNumber, soundOn, triggerSoulCutIn, voiceOn]
  );

  // ============================================================================
  // STREET & TURN PROGRESSION
  // ============================================================================
  const advanceStreetOrTurn = useCallback(
    (
      nextPlayers: HoldemPlayer[],
      currentActorIdx: number,
      nextPot: number,
      nextHighestBet: number
    ) => {
      const activeContenders = nextPlayers.filter((p) => !p.folded);
      if (activeContenders.length === 1) {
        resolveShowdown(nextPlayers, communityCards, nextPot);
        return;
      }

      const canActPlayers = activeContenders.filter((p) => !p.allIn);
      const everyoneMatched = activeContenders.every(
        (p) =>
          p.allIn || (p.actedThisStreet && p.currentBet === nextHighestBet)
      );

      if (everyoneMatched || canActPlayers.length === 0) {
        const workingDeck = [...deck];
        const resetPlayers = nextPlayers.map((p) => ({
          ...p,
          currentBet: 0,
          actedThisStreet: false,
          actionBadge: p.folded
            ? ('FOLD' as const)
            : p.allIn
              ? ('ALL-IN!' as const)
              : ('WAIT' as const),
        }));

        if (canActPlayers.length <= 1) {
          // Run out remaining board cards to Showdown
          const needed = 5 - communityCards.length;
          const drawn = workingDeck
            .splice(0, needed)
            .map((c) => ({ ...c, faceUp: true }));
          const fullBoard = [...communityCards, ...drawn];
          setDeck(workingDeck);
          resolveShowdown(resetPlayers, fullBoard, nextPot);
          return;
        }

        let nextStreet: Street = 'showdown';
        let nextBoard = [...communityCards];

        if (street === 'preflop') {
          nextStreet = 'flop';
          nextBoard = [
            ...communityCards,
            ...workingDeck.splice(0, 3).map((c) => ({ ...c, faceUp: true })),
          ];
          appendLog('--- 🃏 フロップ（コミュニティカード3枚公開） ---');
          speakCasinoVoice('フロップ', voiceOn, 1.0, 1.1);
        } else if (street === 'flop') {
          nextStreet = 'turn';
          nextBoard = [
            ...communityCards,
            ...workingDeck.splice(0, 1).map((c) => ({ ...c, faceUp: true })),
          ];
          appendLog('--- 🃏 ターン（4枚目公開） ---');
          speakCasinoVoice('ターン', voiceOn, 1.0, 1.1);
        } else if (street === 'turn') {
          nextStreet = 'river';
          nextBoard = [
            ...communityCards,
            ...workingDeck.splice(0, 1).map((c) => ({ ...c, faceUp: true })),
          ];
          appendLog('--- 🃏 リバー（最終5枚目公開） ---');
          speakCasinoVoice('リバー', voiceOn, 1.0, 1.1);
        } else {
          resolveShowdown(resetPlayers, communityCards, nextPot);
          return;
        }

        // First active player after dealer acts first post-flop
        let firstActor = (dealerIdx + 1) % 4;
        for (let s = 0; s < 4; s += 1) {
          const idx = (dealerIdx + 1 + s) % 4;
          if (!resetPlayers[idx].folded && !resetPlayers[idx].allIn) {
            firstActor = idx;
            break;
          }
        }

        setPlayers(resetPlayers);
        setDeck(workingDeck);
        setCommunityCards(nextBoard);
        setStreet(nextStreet);
        setPot(nextPot);
        setHighestBet(0);
        setTurnIdx(firstActor);
        setRaiseSliderVal(currentBlinds.bb * 2);
        setBanner(
          `${nextStreet.toUpperCase()} ラウンド → ${resetPlayers[firstActor].name}のアクション`
        );
        playCasinoSound('deal', soundOn);
        return;
      }

      // Otherwise find next player on current street
      let nextTurn = currentActorIdx;
      for (let step = 1; step <= 4; step += 1) {
        const candidate = (currentActorIdx + step) % 4;
        if (!nextPlayers[candidate].folded && !nextPlayers[candidate].allIn) {
          nextTurn = candidate;
          break;
        }
      }

      setPlayers(nextPlayers);
      setPot(nextPot);
      setHighestBet(nextHighestBet);
      setTurnIdx(nextTurn);
    },
    [
      communityCards,
      deck,
      street,
      dealerIdx,
      currentBlinds.bb,
      resolveShowdown,
      appendLog,
      soundOn,
      voiceOn,
    ]
  );

  // ============================================================================
  // PLAYER / AI ACTION EXECUTION
  // ============================================================================
  const performAction = useCallback(
    (
      actorIdx: number,
      actionType: 'fold' | 'call' | 'raise',
      raiseTotalBet = 0,
      isBluff = false
    ) => {
      if (street === 'showdown') return;
      const nextPlayers = players.map((p) => ({ ...p }));
      const actor = nextPlayers[actorIdx];
      const prof = CHARACTER_PROFILES[actor.characterId];
      const toCall = Math.max(0, highestBet - actor.currentBet);
      const quoteSeed = (handNumber + actorIdx + communityCards.length) % 2;

      if (actionType === 'fold') {
        actor.folded = true;
        actor.actedThisStreet = true;
        actor.lastActionLabel = 'フォールド';
        actor.actionBadge = 'FOLD';
        actor.expression = 'folded';
        actor.speechText = prof.quotes.fold[quoteSeed % prof.quotes.fold.length];
        appendLog(`${actor.name}: フォールド`);
        playCasinoSound('foldSwoosh', soundOn);
        if (!actor.isHuman) {
          speakCasinoVoice(
            actor.speechText,
            voiceOn,
            prof.voicePitch,
            prof.voiceRate
          );
        }
        advanceStreetOrTurn(nextPlayers, actorIdx, pot, highestBet);
        return;
      }

      if (actionType === 'call') {
        const paid = Math.min(actor.chips, toCall);
        actor.chips -= paid;
        actor.currentBet += paid;
        actor.totalCommitted += paid;
        actor.actedThisStreet = true;
        if (actor.chips === 0 && paid > 0) actor.allIn = true;

        const isCheck = paid === 0;
        const label = isCheck
          ? 'チェック'
          : actor.allIn
            ? `オールイン (${paid})`
            : `コール (${paid})`;

        actor.lastActionLabel = label;
        actor.actionBadge = isCheck
          ? 'CHECK'
          : actor.allIn
            ? 'ALL-IN!'
            : 'CALL';
        actor.expression = actor.allIn ? 'confident' : 'normal';
        actor.speechText = isCheck
          ? prof.quotes.check[quoteSeed % prof.quotes.check.length]
          : actor.allIn
            ? prof.quotes.allIn[quoteSeed % prof.quotes.allIn.length]
            : prof.quotes.call[quoteSeed % prof.quotes.call.length];

        appendLog(`${actor.name}: ${label}`);
        playCasinoSound(
          isCheck ? 'checkKnock' : actor.allIn ? 'allInStinger' : 'chip',
          soundOn
        );
        if (!actor.isHuman) {
          speakCasinoVoice(
            actor.speechText,
            voiceOn,
            prof.voicePitch,
            prof.voiceRate
          );
        }
        advanceStreetOrTurn(nextPlayers, actorIdx, pot + paid, highestBet);
        return;
      }

      // Raise / Bet
      const minRaiseTotal = highestBet + currentBlinds.bb;
      const desiredTotalBet = Math.max(minRaiseTotal, raiseTotalBet);
      const additionalNeeded = Math.max(
        toCall,
        desiredTotalBet - actor.currentBet
      );
      const actualPaid = Math.min(actor.chips, additionalNeeded);
      actor.chips -= actualPaid;
      actor.currentBet += actualPaid;
      actor.totalCommitted += actualPaid;
      actor.actedThisStreet = true;
      if (actor.chips === 0) actor.allIn = true;

      const newHigh = Math.max(highestBet, actor.currentBet);
      const label = actor.allIn
        ? `オールイン (${actor.currentBet})`
        : `レイズ (${actor.currentBet}まで)`;

      actor.lastActionLabel = label;
      actor.actionBadge = actor.allIn ? 'ALL-IN!' : 'RAISE';
      actor.expression = isBluff ? 'bluffing' : 'confident';
      actor.speechText = actor.allIn
        ? prof.quotes.allIn[quoteSeed % prof.quotes.allIn.length]
        : prof.quotes.raise[quoteSeed % prof.quotes.raise.length];

      appendLog(`${actor.name}: ${label}`);
      playCasinoSound(actor.allIn ? 'allInStinger' : 'chipSplash', soundOn);
      const actorSoul = SOUL_CHARACTERS[getSeatAvatarId(actorIdx)];
      const raiseSample =
        actorSoul.sampleVoices[1]?.text ?? actorSoul.cutInAllIn;
      if (actor.allIn) {
        triggerSoulCutIn(
          actorIdx,
          'ALL-IN SOUL FLASH!',
          `${actor.name} が全チップ 🪙${actor.currentBet.toLocaleString()} を投入！`,
          actorSoul.cutInAllIn,
          'allin'
        );
      } else if (actualPaid >= currentBlinds.bb * 3) {
        triggerSoulCutIn(
          actorIdx,
          `HEAVY RAISE! (${actor.currentBet})`,
          `${actor.name} が強気のレイズ！`,
          raiseSample,
          'raise'
        );
      }
      speakCasinoVoice(
        actor.allIn ? actorSoul.cutInAllIn : raiseSample,
        voiceOn,
        actorSoul.voicePitch,
        actorSoul.voiceRate
      );
      advanceStreetOrTurn(nextPlayers, actorIdx, pot + actualPaid, newHigh);
    },
    [
      street,
      players,
      highestBet,
      handNumber,
      communityCards.length,
      currentBlinds.bb,
      appendLog,
      soundOn,
      voiceOn,
      advanceStreetOrTurn,
      pot,
      getSeatAvatarId,
      triggerSoulCutIn,
    ]
  );

  // ============================================================================
  // AI CHARACTER DECISION ENGINE
  // ============================================================================
  useEffect(() => {
    if (street === 'showdown' || players.length === 0) return;
    const actor = players[turnIdx];
    if (!actor || actor.isHuman || actor.folded || actor.allIn) return;

    const timer = window.setTimeout(() => {
      const toCall = Math.max(0, highestBet - actor.currentBet);
      const evalHand = evaluateBest7CardHand([
        ...actor.holeCards,
        ...communityCards,
      ]);

      const highRank = Math.max(
        toPokerRank(actor.holeCards[0]?.rank ?? 2),
        toPokerRank(actor.holeCards[1]?.rank ?? 2)
      );
      const isPocketPair =
        actor.holeCards[0]?.rank === actor.holeCards[1]?.rank;

      let strengthScore = evalHand.category * 16 + highRank;
      if (street === 'preflop') {
        strengthScore = isPocketPair ? 40 + highRank * 2 : highRank * 2;
      }

      const bb = currentBlinds.bb;
      const bluffSeed =
        (handNumber * 19 + turnIdx * 31 + communityCards.length * 13) % 10;

      if (actor.characterId === 'victor') {
        // Victor "The Shark" Crowe: Tight-Aggressive (TAG)
        if (strengthScore >= 32 && actor.chips > toCall + bb) {
          performAction(turnIdx, 'raise', highestBet + bb * 2.5);
        } else if (toCall === 0 || strengthScore >= 22 || toCall <= bb) {
          performAction(turnIdx, 'call');
        } else {
          performAction(turnIdx, 'fold');
        }
      } else if (actor.characterId === 'seraphina') {
        // Seraphina "Velvet Queen": Loose-Aggressive (LAG) & Bluff Queen
        const wantsBluff = bluffSeed <= 2 && street !== 'preflop';
        if (
          (strengthScore >= 28 || wantsBluff) &&
          actor.chips > toCall + bb
        ) {
          const betSize =
            highestBet + Math.max(bb * 2, Math.floor(pot * 0.65));
          performAction(turnIdx, 'raise', betSize, wantsBluff);
        } else if (toCall === 0 || strengthScore >= 18 || toCall <= bb * 2) {
          performAction(turnIdx, 'call');
        } else {
          performAction(turnIdx, 'fold');
        }
      } else {
        // Ryan "Iron Wall" Chen: Calling Station & Monster Trapper
        if (strengthScore >= 46 && actor.chips > toCall + bb) {
          performAction(
            turnIdx,
            'raise',
            highestBet + Math.max(bb * 2, Math.floor(pot * 0.75))
          );
        } else if (toCall <= actor.chips * 0.45 || strengthScore >= 18) {
          performAction(turnIdx, 'call');
        } else {
          performAction(turnIdx, 'fold');
        }
      }
    }, 680);

    return () => window.clearTimeout(timer);
  }, [
    street,
    players,
    turnIdx,
    highestBet,
    communityCards,
    handNumber,
    pot,
    currentBlinds.bb,
    performAction,
  ]);

  const human = players[0];
  const humanToCall = human ? Math.max(0, highestBet - human.currentBet) : 0;
  const isHumanTurn =
    street !== 'showdown' &&
    turnIdx === 0 &&
    Boolean(human && !human.folded && !human.allIn);

  // Keep raise slider clamped to valid range
  const minLegalRaiseTotal = useMemo(() => {
    if (!human) return currentBlinds.bb * 2;
    const minTarget = highestBet + currentBlinds.bb;
    const maxTarget = human.currentBet + human.chips;
    return Math.min(minTarget, maxTarget);
  }, [human, highestBet, currentBlinds.bb]);

  const maxLegalRaiseTotal = useMemo(() => {
    if (!human) return 1000;
    return human.currentBet + human.chips;
  }, [human]);

  const effectiveRaiseTarget = Math.max(
    minLegalRaiseTotal,
    Math.min(maxLegalRaiseTotal, raiseSliderVal)
  );

  // ============================================================================
  // KEYBOARD SHORTCUTS (F = Fold, C = Check/Call, R = Raise, A = All-In, Space = Next Hand)
  // ============================================================================
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (street === 'showdown' && e.code === 'Space') {
        e.preventDefault();
        startNewHand(players, (dealerIdx + 1) % 4, handNumber + 1);
        return;
      }

      if (!isHumanTurn || !human) return;
      const key = e.key.toLowerCase();
      if (key === 'f') {
        e.preventDefault();
        performAction(0, 'fold');
      } else if (key === 'c') {
        e.preventDefault();
        performAction(0, 'call');
      } else if (key === 'r' && human.chips > humanToCall) {
        e.preventDefault();
        performAction(0, 'raise', effectiveRaiseTarget);
      } else if (key === 'a' && human.chips > 0) {
        e.preventDefault();
        performAction(0, 'raise', human.currentBet + human.chips);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    street,
    isHumanTurn,
    human,
    humanToCall,
    effectiveRaiseTarget,
    players,
    dealerIdx,
    handNumber,
    performAction,
    startNewHand,
  ]);

  // ============================================================================
  // PRO ANALYTICS HUD COMPUTATION
  // ============================================================================
  const humanHandAnalysis = useMemo(() => {
    if (!human || human.holeCards.length < 2) {
      return {
        handName: '—',
        equity: 0,
        potOdds: 0,
        bestIds: new Set<string>(),
        preflopTier: evaluatePreflopTier([]),
        draws: { outs: 0, labels: [] as string[] },
      };
    }
    const best = evaluateBest7CardHand([...human.holeCards, ...communityCards]);
    const activeOpps = players.slice(1).filter((p) => !p.folded).length;
    const equity = human.folded
      ? 0
      : estimateMonteCarloEquity(
          human.holeCards,
          communityCards,
          activeOpps,
          140
        );
    const potOdds =
      humanToCall > 0
        ? Math.round((humanToCall / (pot + humanToCall)) * 100)
        : 0;
    const preflopTier = evaluatePreflopTier(human.holeCards);
    const draws = analyzeDrawsAndOuts(human.holeCards, communityCards);

    return {
      handName: best.nameJa,
      equity,
      potOdds,
      bestIds: new Set(best.bestFiveIds),
      preflopTier,
      draws,
    };
  }, [human, communityCards, players, humanToCall, pot]);

  const getPositionBadge = (playerIdx: number) => {
    const rel = (playerIdx - dealerIdx + 4) % 4;
    if (rel === 0)
      return { label: 'BTN / D', cls: 'bg-amber-400 text-slate-950' };
    if (rel === 1)
      return { label: 'SB', cls: 'bg-cyan-500/80 text-slate-950' };
    if (rel === 2)
      return { label: 'BB', cls: 'bg-indigo-500/80 text-white' };
    return { label: 'UTG', cls: 'bg-emerald-500/80 text-slate-950' };
  };

  const activeTheme = TABLE_THEMES[tableTheme];
  const streetsOrder: Street[] = [
    'preflop',
    'flop',
    'turn',
    'river',
    'showdown',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#060b14] to-black text-slate-100 select-none">
      {/* Mahjong Soul Style Diagonal Cut-In Flash Overlay */}
      <SoulCutInOverlay
        cutIn={activeCutIn}
        onDismiss={() => setActiveCutIn(null)}
      />

      {/* Character Selection, Bond Level & Voice Gallery Modal */}
      <SoulCharacterModal
        open={showCharacterModal}
        selectedAvatar={selectedAvatar}
        bondPoints={bondPoints}
        danInfo={danInfo}
        onSelectAvatar={(id: SoulAvatarId) => {
          setSelectedAvatar(id);
          const ch = SOUL_CHARACTERS[id];
          speakCasinoVoice(
            ch.sampleVoices[0]?.text ?? ch.cutInWin,
            voiceOn,
            ch.voicePitch,
            ch.voiceRate
          );
        }}
        onTestVoice={(avatarId: SoulAvatarId, text: string) => {
          const ch = SOUL_CHARACTERS[avatarId];
          speakCasinoVoice(text, true, ch.voicePitch, ch.voiceRate);
        }}
        onClose={() => setShowCharacterModal(false)}
      />

      {/* Top VIP Casino Navigation & Audio Console */}
      <header className="border-b border-amber-400/25 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
          <div className="flex items-center gap-3">
            <Link
              href="/games"
              className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition hover:border-amber-300 hover:bg-amber-500/20"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black tracking-widest text-amber-300 uppercase">
                  VIP SOUL ROYALE EDITION
                </span>
                <span className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-200 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow">
                  🏆 {danInfo.tierBadge} (♥絆Lv.{bondLv})
                </span>
                <span className="hidden text-[11px] font-bold text-emerald-300 sm:inline">
                  HAND #{handNumber} ・ BLINDS {currentBlinds.sb}/
                  {currentBlinds.bb}
                </span>
              </div>
              <h2 className="text-sm font-black tracking-tight text-white sm:text-lg">
                テキサスホールデム・ポーカー
              </h2>
            </div>
          </div>

          {/* Audio, Voice, BGM, Character Select & HUD Toggles */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowCharacterModal(true)}
              className="rounded-lg border border-pink-400/70 bg-gradient-to-r from-pink-500/25 via-purple-500/25 to-amber-500/25 px-2.5 py-1.5 text-xs font-black text-pink-200 shadow-[0_0_12px_rgba(244,63,94,0.25)] transition hover:brightness-110"
            >
              ✨ キャラ変更＆CV図鑑 ({currentSoulChar.name})
            </button>
            <button
              type="button"
              onClick={() => {
                setSqueezeMode((prev) => !prev);
                setSqueezedRevealed(false);
              }}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-black transition ${
                squeezeMode
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                  : 'border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              🃏 スクイーズ絞り: {squeezeMode ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setShowEquityMeter((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-black transition ${
                showEquityMeter
                  ? 'border-amber-400 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                  : 'border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              📈 勝率・EV解析: {showEquityMeter ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                soundOn
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-white/5 text-slate-400'
              }`}
            >
              {soundOn ? '🔊 効果音ON' : '🔇 効果音OFF'}
            </button>
            <button
              type="button"
              onClick={() => setBgmOn((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                bgmOn
                  ? 'border-purple-400/70 bg-purple-500/25 text-purple-200'
                  : 'border-white/15 bg-white/5 text-slate-400'
              }`}
            >
              {bgmOn ? '🎵 カジノBGM ON' : '🎵 カジノBGM OFF'}
            </button>
            <button
              type="button"
              onClick={() => setVoiceOn((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                voiceOn
                  ? 'border-rose-400/70 bg-rose-500/25 text-rose-200'
                  : 'border-white/15 bg-white/5 text-slate-400'
              }`}
            >
              {voiceOn ? '🎙️ ボイスON' : '🎙️ ボイスOFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>

        {/* Sub-bar: Game Mode & Table Felt Theme Selector */}
        <div className="border-t border-white/10 bg-black/50">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs sm:px-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">
                モード:
              </span>
              <button
                type="button"
                onClick={() => {
                  setGameMode('cash');
                  startNewHand(players, 0, 1, 'cash');
                }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-black transition ${
                  gameMode === 'cash'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                💰 キャッシュゲーム (SB 10 / BB 20・自動リバイ)
              </button>
              <button
                type="button"
                onClick={() => {
                  setGameMode('tournament');
                  startNewHand(players, 0, 1, 'tournament');
                }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-black transition ${
                  gameMode === 'tournament'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                🏆 VIPトーナメント (LV{currentBlinds.level}: SB{' '}
                {currentBlinds.sb} / BB {currentBlinds.bb})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">
                テーブル装飾:
              </span>
              {(Object.keys(TABLE_THEMES) as TableThemeId[]).map((tKey) => (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => setTableTheme(tKey)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-bold transition ${
                    tableTheme === tKey
                      ? 'border-amber-300 bg-amber-400/20 text-amber-200'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {TABLE_THEMES[tKey].nameJa}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="mx-auto grid max-w-7xl gap-4 px-2.5 py-4 sm:px-5 lg:grid-cols-[1fr_340px]">
        {/* Left Column: VIP Casino Table & Betting Console */}
        <div className="flex flex-col justify-between gap-3">
          {/* AI High-Roller Characters Row (3 Distinct Personalities with SVG Portraits & Speech Bubbles) */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {players.slice(1).map((ai) => {
              const prof = CHARACTER_PROFILES[ai.characterId];
              const pos = getPositionBadge(ai.id);
              const isTurn = street !== 'showdown' && turnIdx === ai.id;
              const isWinner = winnerIds.includes(ai.id);
              const aiBest =
                street === 'showdown' && !ai.folded
                  ? evaluateBest7CardHand([...ai.holeCards, ...communityCards])
                      .nameJa
                  : null;

              return (
                <div
                  key={ai.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-3 transition-all ${
                    isWinner
                      ? 'border-amber-300 bg-gradient-to-b from-amber-500/25 via-slate-900/95 to-slate-950 ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
                      : isTurn
                        ? 'border-cyan-400 bg-gradient-to-b from-cyan-500/20 via-slate-900/95 to-slate-950 ring-2 ring-cyan-400/70'
                        : ai.folded
                          ? 'border-white/10 bg-slate-950/65 opacity-60'
                          : 'border-white/15 bg-slate-900/85'
                  }`}
                >
                  {/* Top Profile & Position Badge */}
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <AnimeSoulPortraitSvg
                        avatarId={getSeatAvatarId(ai.id)}
                        expression={
                          isTurn ? 'thinking' : ai.expression
                        }
                        className="h-14 w-14"
                      />
                      {activeStamps[ai.id] && (
                        <div className="animate-bounce absolute -top-3 -left-2 z-20 flex items-center gap-1 rounded-full border border-amber-300 bg-slate-950/95 px-2 py-0.5 text-[10px] font-black text-amber-200 shadow-lg">
                          <span>{activeStamps[ai.id]?.emoji}</span>
                          <span>{activeStamps[ai.id]?.label}</span>
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-1 -right-1 rounded-full px-1.5 py-0.5 text-[9px] font-black shadow ${pos.cls}`}
                      >
                        {pos.label}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-black text-white sm:text-sm">
                          {ai.name}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black ${
                            ai.actionBadge === 'ALL-IN!'
                              ? 'bg-gradient-to-r from-purple-500 to-rose-500 text-white'
                              : ai.actionBadge === 'RAISE'
                                ? 'bg-amber-400 text-slate-950'
                                : ai.actionBadge === 'CALL' ||
                                    ai.actionBadge === 'CHECK'
                                  ? 'bg-emerald-400 text-slate-950'
                                  : ai.actionBadge === 'WIN!'
                                    ? 'bg-amber-300 text-slate-950'
                                    : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {isTurn ? 'THINKING...' : ai.actionBadge}
                        </span>
                      </div>
                      <p className="truncate text-[10px] font-medium text-slate-400">
                        {prof.title}
                      </p>

                      {/* HUD Stats Badges */}
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-300">
                          VPIP {prof.vpip}%
                        </span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-300">
                          PFR {prof.pfr}%
                        </span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-300">
                          🪙 {ai.chips.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Character Speech Bubble (セリフ演出) */}
                  <div className="relative my-2 rounded-xl border border-white/10 bg-black/55 px-2.5 py-1.5 text-[11px] leading-snug text-slate-200">
                    <span className="mr-1 text-amber-300">💬</span>
                    <span className="italic">「{ai.speechText}」</span>
                  </div>

                  {/* AI Hole Cards & Current Street Chip Stack */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {ai.holeCards.map((c) => (
                        <PlayingCardView key={c.id} card={c} size="xs" />
                      ))}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {ai.currentBet > 0 && (
                        <ChipStackVisual amount={ai.currentBet} size="sm" />
                      )}
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                        {aiBest ?? ai.lastActionLabel}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* LUXURY OVAL CASINO TABLE CENTERPIECE */}
          <div
            className={`relative overflow-hidden rounded-[44px] border-8 p-4 transition-all sm:rounded-[68px] sm:p-6 ${activeTheme.rimBorder}`}
            style={{ background: activeTheme.feltGradient }}
          >
            {/* Inner Gold Casino Table Line */}
            <div
              className={`pointer-events-none absolute inset-2.5 rounded-[36px] border-2 sm:inset-4 sm:rounded-[56px] ${activeTheme.innerLine}`}
            />

            {/* Street Progression Bar & Total Pot Display */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2.5 py-1">
                {streetsOrder.map((st, idx) => {
                  const active = street === st;
                  return (
                    <React.Fragment key={st}>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase transition ${
                          active
                            ? 'bg-amber-400 text-slate-950 shadow'
                            : 'text-slate-400'
                        }`}
                      >
                        {st}
                      </span>
                      {idx < streetsOrder.length - 1 && (
                        <span className="text-[10px] text-slate-600">›</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-amber-200 uppercase">
                  TOTAL POT:
                </span>
                <ChipStackVisual amount={pot} size="md" />
              </div>
            </div>

            {/* Community Cards (5 Slots) */}
            <div className="relative z-10 my-5 flex min-h-[108px] flex-wrap items-center justify-center gap-2 sm:gap-3">
              {Array.from({ length: 5 }).map((_, idx) => {
                const card = communityCards[idx];
                const slotLabel =
                  idx < 3 ? `FLOP ${idx + 1}` : idx === 3 ? 'TURN' : 'RIVER';
                if (!card) {
                  return (
                    <div
                      key={`empty-comm-${idx}`}
                      className="flex h-22 w-15 flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300/30 bg-black/25 text-[10px] font-black tracking-wider text-amber-200/45 sm:h-26 sm:w-18"
                    >
                      <span>♠♥♦♣</span>
                      <span className="mt-1 text-[9px]">{slotLabel}</span>
                    </div>
                  );
                }
                return (
                  <PlayingCardView
                    key={card.id}
                    card={card}
                    size="md"
                    highlighted={humanHandAnalysis.bestIds.has(card.id)}
                    badgeText={
                      humanHandAnalysis.bestIds.has(card.id) ? 'BEST' : undefined
                    }
                  />
                );
              })}
            </div>

            {/* Showdown Results Breakdown Overlay / Card */}
            {street === 'showdown' && showdownResults.length > 0 && (
              <div className="relative z-10 mb-3 rounded-2xl border border-amber-300/50 bg-slate-950/90 p-3 shadow-2xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-black tracking-wider text-amber-300 uppercase">
                    🏆 ショーダウン結果・役判定内訳
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    Spaceキーまたはボタンで次のハンドへ
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {showdownResults.map((res) => (
                    <div
                      key={res.playerId}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                        res.isWinner
                          ? 'border-amber-400 bg-amber-400/15 text-amber-100'
                          : 'border-white/10 bg-white/5 text-slate-300'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black">
                          {res.isWinner ? '👑 ' : ''}
                          {res.name}
                        </p>
                        <p className="text-[11px] font-bold text-emerald-300">
                          {res.handName}
                        </p>
                      </div>
                      {res.wonAmount > 0 && (
                        <span className="rounded-lg bg-amber-400 px-2.5 py-1 font-mono text-xs font-black text-slate-950">
                          +🪙 {res.wonAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Dealer Status Banner */}
            <div className="relative z-10 rounded-xl border border-amber-300/25 bg-black/65 px-4 py-2 text-center text-xs font-bold text-amber-100 shadow-inner sm:text-sm">
              {banner}
            </div>
          </div>

          {/* HUMAN VIP PLAYER CONSOLE & BET SIZING SLIDER */}
          {human && (
            <div className="rounded-2xl border border-white/15 bg-slate-900/90 p-3.5 shadow-2xl sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCharacterModal(true)}
                      title="クリックしてキャラクター変更＆ボイス図鑑を開く"
                      className="group relative block rounded-2xl transition hover:scale-105"
                    >
                      <AnimeSoulPortraitSvg
                        avatarId={selectedAvatar}
                        expression={human.expression}
                        className="h-14 w-14"
                      />
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-pink-500 px-1.5 py-0.2 text-[8px] font-black text-white shadow">
                        変更
                      </span>
                    </button>
                    {activeStamps[0] && (
                      <div className="animate-bounce absolute -top-3 -right-4 z-20 flex items-center gap-1 rounded-full border border-amber-300 bg-slate-950/95 px-2 py-0.5 text-[10px] font-black text-amber-200 shadow-lg">
                        <span>{activeStamps[0].emoji}</span>
                        <span>{activeStamps[0].label}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-white">
                        {currentSoulChar.name}（あなた）
                      </span>
                      <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-bold text-pink-200">
                        {currentSoulChar.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          getPositionBadge(0).cls
                        }`}
                      >
                        {getPositionBadge(0).label}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-black ${humanHandAnalysis.preflopTier.badgeColor}`}
                      >
                        手札ランク: {humanHandAnalysis.preflopTier.notation} (Tier{' '}
                        {humanHandAnalysis.preflopTier.tier})
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-amber-400/15 px-2 py-0.5 font-mono font-black text-amber-300">
                        所持チップ: 🪙 {human.chips.toLocaleString()}
                      </span>
                      <span className="rounded bg-cyan-400/15 px-2 py-0.5 font-black text-cyan-200">
                        現在役: {humanHandAnalysis.handName}
                      </span>
                      {human.currentBet > 0 && (
                        <ChipStackVisual amount={human.currentBet} size="sm" />
                      )}
                    </div>
                  </div>
                </div>

                {street === 'showdown' && (
                  <button
                    type="button"
                    onClick={() =>
                      startNewHand(players, (dealerIdx + 1) % 4, handNumber + 1)
                    }
                    className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg transition hover:brightness-110 sm:text-sm"
                  >
                    次のハンドを配る (#{handNumber + 1}) [Space] →
                  </button>
                )}
              </div>

              {/* Player Hole Cards (with Interactive Card Squeeze Mode) */}
              <div className="my-3 flex flex-wrap items-center justify-center gap-3">
                {human.holeCards.map((c, idx) => {
                  const isHiddenBySqueeze =
                    squeezeMode &&
                    idx === 1 &&
                    !squeezedRevealed &&
                    street !== 'showdown';
                  return (
                    <div key={c.id} className="relative">
                      <PlayingCardView
                        card={{ ...c, faceUp: !isHiddenBySqueeze }}
                        size="lg"
                        highlighted={
                          !isHiddenBySqueeze &&
                          humanHandAnalysis.bestIds.has(c.id)
                        }
                        badgeText={
                          !isHiddenBySqueeze &&
                          humanHandAnalysis.bestIds.has(c.id)
                            ? 'BEST'
                            : isHiddenBySqueeze
                              ? 'SQUEEZE'
                              : undefined
                        }
                        onClick={
                          isHiddenBySqueeze
                            ? () => {
                                setSqueezedRevealed(true);
                                playCasinoSound('deal', soundOn);
                              }
                            : undefined
                        }
                      />
                      {isHiddenBySqueeze && (
                        <button
                          type="button"
                          onClick={() => {
                            setSqueezedRevealed(true);
                            playCasinoSound('deal', soundOn);
                          }}
                          className="mt-1 block w-full rounded bg-cyan-500/25 px-2 py-0.5 text-[10px] font-black text-cyan-200 hover:bg-cyan-500/40"
                        >
                          👆 絞ってめくる
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Interactive Mahjong Soul Stamp / Emote Quick Bar */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5">
                <span className="text-[10px] font-black tracking-wider text-pink-300">
                  💬 雀魂風ボイス付きスタンプ送信:
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {SOUL_STAMPS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSendStamp(st)}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-200 transition hover:scale-105 hover:border-amber-300/60 hover:bg-amber-400/15"
                    >
                      <span>{st.emoji}</span>
                      <span className="hidden sm:inline">{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Bet Sizing Slider & Action Buttons */}
              {street !== 'showdown' && (
                <div className="space-y-2.5 border-t border-white/10 pt-3">
                  {/* Raise Slider Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-300">
                        🎚️ レイズ額設定:
                      </span>
                      <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono text-xs font-black text-amber-300">
                        🪙 {effectiveRaiseTarget.toLocaleString()} まで
                      </span>
                    </div>

                    <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
                      <button
                        type="button"
                        disabled={!isHumanTurn}
                        onClick={() =>
                          setRaiseSliderVal((v) =>
                            Math.max(
                              minLegalRaiseTotal,
                              v - currentBlinds.bb
                            )
                          )
                        }
                        className="rounded border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-black text-white hover:bg-white/20 disabled:opacity-40"
                      >
                        -1BB
                      </button>
                      <input
                        type="range"
                        aria-label="レイズ額スライダー"
                        min={minLegalRaiseTotal}
                        max={Math.max(minLegalRaiseTotal, maxLegalRaiseTotal)}
                        step={currentBlinds.sb}
                        disabled={!isHumanTurn || human.chips <= humanToCall}
                        value={effectiveRaiseTarget}
                        onChange={(e) =>
                          setRaiseSliderVal(Number(e.target.value))
                        }
                        className="h-2 flex-1 cursor-pointer accent-amber-400"
                      />
                      <button
                        type="button"
                        disabled={!isHumanTurn}
                        onClick={() =>
                          setRaiseSliderVal((v) =>
                            Math.min(
                              maxLegalRaiseTotal,
                              v + currentBlinds.bb
                            )
                          )
                        }
                        className="rounded border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-black text-white hover:bg-white/20 disabled:opacity-40"
                      >
                        +1BB
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!isHumanTurn || human.chips <= humanToCall}
                      onClick={() =>
                        performAction(0, 'raise', effectiveRaiseTarget)
                      }
                      className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-black text-slate-950 shadow hover:bg-amber-300 disabled:opacity-35"
                    >
                      スライダー額でレイズ [R]
                    </button>
                  </div>

                  {/* Quick Preset Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                    <button
                      type="button"
                      disabled={!isHumanTurn}
                      onClick={() => performAction(0, 'fold')}
                      className="rounded-xl border border-rose-400/40 bg-rose-500/20 py-2.5 text-xs font-black text-rose-200 transition hover:bg-rose-500/30 disabled:opacity-35"
                    >
                      フォールド [F]
                    </button>
                    <button
                      type="button"
                      disabled={!isHumanTurn}
                      onClick={() => performAction(0, 'call')}
                      className="rounded-xl bg-emerald-400 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-emerald-300 disabled:opacity-35"
                    >
                      {humanToCall === 0
                        ? 'チェック (0) [C]'
                        : `コール (${humanToCall}) [C]`}
                    </button>
                    <button
                      type="button"
                      disabled={!isHumanTurn || human.chips <= humanToCall}
                      onClick={() =>
                        performAction(
                          0,
                          'raise',
                          highestBet + currentBlinds.bb * 2
                        )
                      }
                      className="rounded-xl bg-cyan-400 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-cyan-300 disabled:opacity-35"
                    >
                      MIN/2xBBレイズ
                    </button>
                    <button
                      type="button"
                      disabled={!isHumanTurn || human.chips <= humanToCall}
                      onClick={() =>
                        performAction(
                          0,
                          'raise',
                          highestBet +
                            Math.max(currentBlinds.bb, Math.floor(pot * 0.5))
                        )
                      }
                      className="rounded-xl bg-amber-300 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-amber-200 disabled:opacity-35"
                    >
                      1/2 POTレイズ
                    </button>
                    <button
                      type="button"
                      disabled={!isHumanTurn || human.chips <= humanToCall}
                      onClick={() =>
                        performAction(
                          0,
                          'raise',
                          highestBet + Math.max(currentBlinds.bb, pot)
                        )
                      }
                      className="rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-amber-300 disabled:opacity-35"
                    >
                      POTレイズ
                    </button>
                    <button
                      type="button"
                      disabled={!isHumanTurn || human.chips <= 0}
                      onClick={() =>
                        performAction(0, 'raise', human.currentBet + human.chips)
                      }
                      className="rounded-xl bg-gradient-to-r from-purple-500 to-rose-500 py-2.5 text-xs font-black text-white shadow transition hover:brightness-110 disabled:opacity-35"
                    >
                      ALL-IN ({human.chips}) [A]
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Pro Poker Analytics HUD, Character Guide & Action Log */}
        <aside className="flex flex-col gap-3">
          {showEquityMeter && (
            <div className="rounded-2xl border border-amber-400/35 bg-slate-900/95 p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-black tracking-wider text-amber-300">
                  📈 リアルタイム勝率・アウツ・EV解析
                </span>
                <span className="rounded bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                  PRO HUD
                </span>
              </div>

              {/* Preflop Hand Tier Badge */}
              <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs">
                <span className="text-slate-400">スターティングハンド評価</span>
                <span
                  className={`rounded border px-2 py-0.5 font-black ${humanHandAnalysis.preflopTier.badgeColor}`}
                >
                  {humanHandAnalysis.preflopTier.notation} ・ Tier{' '}
                  {humanHandAnalysis.preflopTier.tier} (
                  {humanHandAnalysis.preflopTier.labelJa})
                </span>
              </div>

              {/* Equity Meter */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    推定勝率 (Monte Carlo Equity)
                  </span>
                  <span className="font-mono text-lg font-black text-emerald-300">
                    {humanHandAnalysis.equity}%
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 transition-all duration-300"
                    style={{ width: `${humanHandAnalysis.equity}%` }}
                  />
                </div>
              </div>

              {/* Pot Odds & EV */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                  <span className="text-[10px] text-slate-400">
                    必要勝率 (Pot Odds)
                  </span>
                  <p className="mt-0.5 font-mono text-base font-black text-amber-300">
                    {humanToCall > 0
                      ? `${humanHandAnalysis.potOdds}%`
                      : '0% (Check可)'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                  <span className="text-[10px] text-slate-400">
                    期待値判定 (EV判断)
                  </span>
                  <p
                    className={`mt-0.5 text-sm font-black ${
                      humanHandAnalysis.equity >= humanHandAnalysis.potOdds
                        ? 'text-emerald-300'
                        : 'text-rose-400'
                    }`}
                  >
                    {humanToCall === 0
                      ? '無料チェック/攻め可'
                      : humanHandAnalysis.equity >= humanHandAnalysis.potOdds
                        ? '＋EV（コール/レイズ有利）'
                        : '－EV（フォールド推奨）'}
                  </p>
                </div>
              </div>

              {/* Draws & Outs Detector */}
              <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-300">
                    🎯 ドロー＆アウツ検出 (Outs)
                  </span>
                  <span className="font-mono text-xs font-black text-white">
                    {humanHandAnalysis.draws.outs} outs
                  </span>
                </div>
                {humanHandAnalysis.draws.labels.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {humanHandAnalysis.draws.labels.map((lbl) => (
                      <span
                        key={lbl}
                        className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-200"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {street === 'preflop'
                      ? 'フロップ以降でフラッシュ/ストレートのアウツを自動計算します'
                      : '現在主要なドローはありません（完成役またはハイカード勝負）'}
                  </p>
                )}
              </div>

              <p className="mt-2.5 text-[11px] leading-relaxed text-slate-400">
                ホールカード（
                {human?.holeCards
                  .map((c) => `${SUIT_SYMBOL[c.suit]}${formatRank(c.rank)}`)
                  .join(' ')}
                ）とボードからモンテカルロ法で残りの組み合わせを高速シミュレーションしています。
              </p>
            </div>
          )}

          {/* Hand Ranking Quick Reference */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/85 p-4">
            <h3 className="text-xs font-black tracking-wider text-emerald-300 uppercase">
              🃏 ポーカー役一覧（強い順）
            </h3>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
              <li>1. ロイヤルストレートフラッシュ (同柄10〜A)</li>
              <li>2. ストレートフラッシュ (同柄の連番5枚)</li>
              <li>3. フォーカード (同じ数字4枚)</li>
              <li>4. フルハウス (3枚組＋ペア)</li>
              <li>5. フラッシュ (同じマーク5枚)</li>
              <li>6. ストレート (連続する数字5枚)</li>
              <li>7. スリーカード / 8. ツーペア / 9. ワンペア</li>
            </ul>
          </div>

          {/* Action Log */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/85 p-4">
            <h3 className="text-xs font-black tracking-wider text-cyan-300 uppercase">
              📜 ライブアクション履歴
            </h3>
            <div className="mt-2 max-h-[210px] space-y-1 overflow-y-auto pr-1 text-xs">
              {logs.map((item, idx) => (
                <div
                  key={`${idx}-${item}`}
                  className="rounded border border-white/5 bg-black/35 px-2.5 py-1 text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
