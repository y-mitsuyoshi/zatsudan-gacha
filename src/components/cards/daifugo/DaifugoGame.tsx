'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import {
  CardItem,
  createStandardDeck,
  formatRank,
  playCardSound,
  PlayingCardView,
  shuffleWithRng,
  SUIT_SYMBOL,
} from '@/components/cards/shared/cardUtils';
import {
  CHARACTERS,
  CHAR_IDS,
  FELTS,
  HOLDEM_ASSETS,
  charImage,
  type CharId,
  type FeltId,
} from '@/components/cards/texas-holdem/characters';
import { holdemAudio } from '@/components/cards/texas-holdem/audio';

export type SocialRank = '大富豪' | '富豪' | '平民' | '貧民' | '大貧民';

export interface DaifugoRules {
  revolution: boolean;
  eightCut: boolean;
  sequence: boolean;
  spade3Return: boolean;
  miyakoOchi: boolean;
}

export type PlayKind = 'single' | 'group' | 'sequence';

export interface TablePlay {
  playerId: number;
  playerName: string;
  cards: CardItem[];
  kind: PlayKind;
  count: number;
  baseRank: number; // 1..13 or 14(Joker)
  isSingleJoker: boolean;
  isSpade3Counter: boolean;
}

type AiPersona = 'プレイヤー' | '堅実温存タイプ' | '積極革命タイプ' | '速攻あがりタイプ';

interface PlayerState {
  id: number;
  charId: CharId;
  name: string;
  persona: AiPersona;
  isHuman: boolean;
  hand: CardItem[];
  socialRank: SocialRank;
  passed: boolean;
  finishedOrder: number | null; // 1..4
}

interface ExchangeSummaryInfo {
  humanRank: SocialRank;
  partnerRank: SocialRank;
  partnerName: string;
  cardCount: number;
  tributedCards: CardItem[];
  receivedFromUpperCards: CardItem[];
}

type DaifugoVoiceKey =
  | 'play'
  | 'pass'
  | 'eightCut'
  | 'revolution'
  | 'spade3'
  | 'win'
  | 'finish';

interface CutInBannerState {
  id: number;
  charId: CharId;
  eyebrow: string;
  title: string;
  subtitle: string;
  line: string;
  isWin?: boolean;
}

const DAIFUGO_LINES: Record<CharId, Record<DaifugoVoiceKey, string>> = {
  karen: {
    play: 'ふふん、このカードで主導権は私のものよ！',
    pass: '…ここは様子見してあげるわ。パス！',
    eightCut: '8切りよ！場は全部流させてもらうわ！',
    revolution: '革命発動！今日から私がルールよ！',
    spade3: 'スペードの3よ！ジョーカーなんて一刀両断ね！',
    win: '当然の結果ね！大富豪の玉座は私のものよ♪',
    finish: 'お先に上がらせてもらうわ！',
  },
  rei: {
    play: '確率的にこの一手だ。受けてみろ。',
    pass: '温存が合理的判断だ。パスする。',
    eightCut: '8切り成立。ターンの主導権を回収する。',
    revolution: '革命発動。強弱の序列を完全に反転させる。',
    spade3: 'スペ3返しだ。ジョーカーの優位はここで潰える。',
    win: '計算通りだ。大富豪の座は頂いた。',
    finish: '計画通りあがりだ。',
  },
  koharu: {
    play: 'これ出すにゃーっ！どうかにゃ？',
    pass: 'うにゃ〜、ここはパスしてお昼寝にゃ…',
    eightCut: '8切りにゃっ！ぜんぶ流してコハルの番にゃ♪',
    revolution: 'にゃにゃっ！革命おこしちゃうにゃーっ！',
    spade3: 'スペ3返しにゃ！ジョーカー捕まえたにゃ！',
    win: 'やったにゃーっ！大富豪いちばんのりにゃ♪',
    finish: 'あがりにゃ〜！お先に失礼するにゃ♪',
  },
  valentina: {
    play: 'さあ、このカードを超えられるかしら？',
    pass: 'ふふ、ここは優雅に譲ってあげるわ。パスよ。',
    eightCut: '8切りよ。テーブルを綺麗に掃除しましょう。',
    revolution: '革命よ！世界がひっくり返る瞬間を味わいなさい！',
    spade3: 'スペードの3…女帝の前にジョーカーは無力よ。',
    win: 'さあ跪きなさい。大富豪の栄冠は私のものよ♪',
    finish: '優雅に上がらせてもらうわね。',
  },
  jin: {
    play: 'こいつを置いていくぜ。出せるもんなら出してみな。',
    pass: '…パスだ。勝負所はここじゃねえ。',
    eightCut: '8切りだ。場を流してもう一発いくぜ。',
    revolution: '革命発動だ…！下剋上の味はどうだ？',
    spade3: 'スペ3返しだ。切り札のジョーカーもここまでだな。',
    win: '最後に笑うのは俺だ。大富豪、いただいていくぜ。',
    finish: '悪く思うな、先に抜けるぜ。',
  },
  luna: {
    play: '星の巡りがこのカードを示しています。',
    pass: '今は星が沈黙しています…パスです。',
    eightCut: '8切りです。運命の潮流をリセットしますね。',
    revolution: '革命発動…！天体の運行が逆転しました！',
    spade3: 'スペードの3…星の導きでジョーカーを討ち取ります。',
    win: '星導の通り…大富豪の輝きを頂きますね。',
    finish: '星の導きであがりです。',
  },
  sakura: {
    play: '桜花一閃！このカードで参りますわ！',
    pass: 'ここは一旦退いて好機を待ちますわ。パスです。',
    eightCut: '8切りですわ！場を清めて我が手番といたします！',
    revolution: '革命発動！桜吹雪とともに序列を覆しますわ！',
    spade3: 'スペードの3！切り札のジョーカー、ここで断ち切りますわ！',
    win: '天晴れな一局でしたわ。大富豪の座、謹んで頂戴いたします♪',
    finish: 'お先に上がらせていただきますわね。',
  },
  alice: {
    play: 'えへへ、このカードで魔法をかけちゃうわよ♪',
    pass: 'うーん、ここはパスしてティータイムにするわね♪',
    eightCut: '8切りよ〜っ！テーブルをぜんぶお片付けしちゃうわ♪',
    revolution: '革命スタート！不思議の国みたいに全部あべこべよ♪',
    spade3: 'スペードの3よ♪ ジョーカーさんを捕まえちゃった！',
    win: 'わーいっ！アリスが大富豪の女王様よ〜♪',
    finish: 'お先にゴールしちゃうわね♪',
  },
  leon: {
    play: '王者の威光だ！このカードを超えられるか！',
    pass: '…パスだ。小競り合いはくれてやろう。',
    eightCut: '8切りだ！場を制圧し、再び俺が立つ！',
    revolution: '革命発動！！王者が自ら時代を塗り替えてやろう！',
    spade3: 'スペードの3だ！ジョーカーとて王の前には跪く！',
    win: 'ハッハッハ！大富豪の王座は俺のためにある！',
    finish: '一足先に王座へ着かせてもらうぞ！',
  },
  chloe: {
    play: '残り枚数のカウンティングから導いた最適手よ。',
    pass: 'ここはパスね。手札効率を優先するわ。',
    eightCut: '8切り成立。手番を強制回収させてもらうわよ。',
    revolution: '革命発動。全カードの強弱テーブルを反転させるわ。',
    spade3: 'スペ3返しよ。ジョーカーを切る確率も織り込み済みだわ。',
    win: '完全な情報制御ね。大富豪のタイトルは頂いたわ。',
    finish: '予定通りあがらせてもらうわ。',
  },
  hibiki: {
    play: 'いくわよっ！このカードでビートを刻みなさい！',
    pass: 'パスね！次のサビまでパワーを溜めておくわ！',
    eightCut: '8切りよっ！ステージをまるごとジャックするわ！',
    revolution: '革命発動ーっ！！会場ごとひっくり返してあげるわよ！',
    spade3: 'スペ3返しよ！ジョーカーなんて一発でぶち抜くわ！',
    win: 'イェーイ！！大富豪のトップステージは私のものよ♪',
    finish: 'お先にフィニッシュ決めるわよーっ！',
  },
  suou: {
    play: '静かにこの札を置かせていただきましょう。',
    pass: '…パスです。今は風を見送るとしましょう。',
    eightCut: '8切りです。一度場の流れを鎮めましょうか。',
    revolution: '革命発動…天地が返る瞬間というのは美しいですね。',
    spade3: 'スペードの3です。ジョーカーの威光もここまでですね。',
    win: 'ふふ、良い勝負でした。大富豪の座を頂戴いたします。',
    finish: 'お先に失礼いたしますよ。',
  },
};

const RANK_BADGE_META: Record<
  SocialRank,
  { label: string; badgeClass: string }
> = {
  大富豪: {
    label: '👑 大富豪',
    badgeClass: 'border-amber-300/60 bg-gradient-to-r from-amber-500/30 to-yellow-400/20 text-amber-200',
  },
  富豪: {
    label: '✨ 富豪',
    badgeClass: 'border-sky-300/50 bg-sky-500/20 text-sky-200',
  },
  平民: {
    label: '🎴 平民',
    badgeClass: 'border-slate-400/35 bg-slate-700/40 text-slate-200',
  },
  貧民: {
    label: '🍂 貧民',
    badgeClass: 'border-orange-400/40 bg-orange-900/35 text-orange-200',
  },
  大貧民: {
    label: '⛓️ 大貧民',
    badgeClass: 'border-rose-400/50 bg-rose-950/65 text-rose-200',
  },
};

const RANK_ORDER_NORMAL: Record<number, number> = {
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
  9: 7,
  10: 8,
  11: 9,
  12: 10,
  13: 11,
  1: 12,
  2: 13,
  14: 99,
  15: 99,
};

export function getCardStrength(rank: number, isRevolution: boolean): number {
  if (rank === 14 || rank === 15) return 99;
  const base = RANK_ORDER_NORMAL[rank] ?? 1;
  return isRevolution ? 14 - base : base;
}

function sortHand(cards: CardItem[], isRevolution: boolean): CardItem[] {
  return [...cards].sort((a, b) => {
    const sa = getCardStrength(a.rank, isRevolution);
    const sb = getCardStrength(b.rank, isRevolution);
    if (sa !== sb) return sa - sb;
    return a.suit.localeCompare(b.suit);
  });
}

function create54CardDeck(): CardItem[] {
  const deck = createStandardDeck(true, 1);
  deck.push(
    { id: 'joker-black', suit: 'joker', rank: 14, faceUp: true },
    { id: 'joker-red', suit: 'joker', rank: 15, faceUp: true }
  );
  return shuffleWithRng(deck);
}

export function analyzeCombo(
  selectedCards: CardItem[],
  rules: DaifugoRules,
  isRevolution: boolean
): {
  valid: boolean;
  kind: PlayKind;
  baseRank: number;
  containsEight: boolean;
  triggersRevolution: boolean;
  isSingleJoker: boolean;
  isSpade3: boolean;
} | null {
  if (selectedCards.length === 0) return null;
  const count = selectedCards.length;
  const jokers = selectedCards.filter((c) => c.suit === 'joker');
  const normals = selectedCards.filter((c) => c.suit !== 'joker');

  if (count === 1) {
    const c = selectedCards[0];
    const isJoker = c.suit === 'joker';
    const isSpade3 = c.suit === 'spades' && c.rank === 3;
    return {
      valid: true,
      kind: 'single',
      baseRank: isJoker ? 14 : c.rank,
      containsEight: c.rank === 8,
      triggersRevolution: false,
      isSingleJoker: isJoker,
      isSpade3,
    };
  }

  // All jokers (2 jokers)
  if (normals.length === 0) {
    return {
      valid: true,
      kind: 'group',
      baseRank: 14,
      containsEight: false,
      triggersRevolution: false,
      isSingleJoker: false,
      isSpade3: false,
    };
  }

  // Check same-rank group (with optional jokers)
  const firstRank = normals[0].rank;
  const allSameRank = normals.every((c) => c.rank === firstRank);
  if (allSameRank && count <= 4) {
    return {
      valid: true,
      kind: 'group',
      baseRank: firstRank,
      containsEight: firstRank === 8,
      triggersRevolution: rules.revolution && count >= 4,
      isSingleJoker: false,
      isSpade3: false,
    };
  }

  // Check sequence (階段: same suit, 3+ consecutive in Daifugo rank order)
  if (rules.sequence && count >= 3) {
    const firstSuit = normals[0].suit;
    if (normals.every((c) => c.suit === firstSuit)) {
      const normalOrders = normals
        .map((c) => RANK_ORDER_NORMAL[c.rank])
        .sort((a, b) => a - b);
      // Ensure no duplicate ranks
      const hasDup = normalOrders.some((v, idx) => idx > 0 && v === normalOrders[idx - 1]);
      if (!hasDup) {
        let gaps = 0;
        for (let i = 0; i < normalOrders.length - 1; i += 1) {
          gaps += normalOrders[i + 1] - normalOrders[i] - 1;
        }
        if (gaps <= jokers.length) {
          // Strongest or weakest rank in sequence acts as base comparison
          const anchorRank = isRevolution
            ? normals.reduce((minC, c) =>
                RANK_ORDER_NORMAL[c.rank] < RANK_ORDER_NORMAL[minC.rank] ? c : minC
              ).rank
            : normals.reduce((maxC, c) =>
                RANK_ORDER_NORMAL[c.rank] > RANK_ORDER_NORMAL[maxC.rank] ? c : maxC
              ).rank;
          const hasEight = normals.some((c) => c.rank === 8);
          return {
            valid: true,
            kind: 'sequence',
            baseRank: anchorRank,
            containsEight: hasEight,
            triggersRevolution: rules.revolution && count >= 4,
            isSingleJoker: false,
            isSpade3: false,
          };
        }
      }
    }
  }

  return null;
}

export function canBeatTable(
  candidateCards: CardItem[],
  tablePlay: TablePlay | null,
  rules: DaifugoRules,
  isRevolution: boolean
): boolean {
  const combo = analyzeCombo(candidateCards, rules, isRevolution);
  if (!combo || !combo.valid) return false;

  if (!tablePlay) return true;

  // Special case: Spade 3 return against a single Joker
  if (
    rules.spade3Return &&
    tablePlay.isSingleJoker &&
    candidateCards.length === 1 &&
    combo.isSpade3
  ) {
    return true;
  }

  if (tablePlay.kind !== combo.kind || tablePlay.count !== candidateCards.length) {
    return false;
  }

  const tableStrength = getCardStrength(tablePlay.baseRank, isRevolution);
  const candidateStrength = getCardStrength(combo.baseRank, isRevolution);
  return candidateStrength > tableStrength;
}

export const canBeatTablePlay = canBeatTable;

function generateAllValidPlays(
  hand: CardItem[],
  tablePlay: TablePlay | null,
  rules: DaifugoRules,
  isRevolution: boolean
): CardItem[][] {
  const results: CardItem[][] = [];

  // 1. Single cards
  for (const c of hand) {
    if (canBeatTable([c], tablePlay, rules, isRevolution)) {
      results.push([c]);
    }
  }

  // 2. Groups by rank (pairs, triples, quads)
  const byRank = new Map<number, CardItem[]>();
  const jokers = hand.filter((c) => c.suit === 'joker');
  for (const c of hand) {
    if (c.suit === 'joker') continue;
    const list = byRank.get(c.rank) ?? [];
    list.push(c);
    byRank.set(c.rank, list);
  }

  byRank.forEach((cardsOfRank) => {
    for (let size = 2; size <= 4; size += 1) {
      if (cardsOfRank.length >= size) {
        const subset = cardsOfRank.slice(0, size);
        if (canBeatTable(subset, tablePlay, rules, isRevolution)) {
          results.push(subset);
        }
      } else if (cardsOfRank.length + jokers.length >= size && cardsOfRank.length >= 1) {
        const neededJokers = size - cardsOfRank.length;
        const subset = [...cardsOfRank, ...jokers.slice(0, neededJokers)];
        if (canBeatTable(subset, tablePlay, rules, isRevolution)) {
          results.push(subset);
        }
      }
    }
  });

  // 3. Sequences (階段)
  if (rules.sequence) {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
    for (const s of suits) {
      const suitCards = hand
        .filter((c) => c.suit === s)
        .sort((a, b) => RANK_ORDER_NORMAL[a.rank] - RANK_ORDER_NORMAL[b.rank]);
      for (let i = 0; i < suitCards.length; i += 1) {
        const seq: CardItem[] = [suitCards[i]];
        for (let j = i + 1; j < suitCards.length; j += 1) {
          if (RANK_ORDER_NORMAL[suitCards[j].rank] === RANK_ORDER_NORMAL[seq[seq.length - 1].rank] + 1) {
            seq.push(suitCards[j]);
            if (seq.length >= 3 && canBeatTable(seq, tablePlay, rules, isRevolution)) {
              results.push([...seq]);
            }
          } else {
            break;
          }
        }
      }
    }
  }

  return results;
}

function getRivalCharIds(partnerId: CharId): [CharId, CharId, CharId] {
  const preferred: CharId[] = ['karen', 'rei', 'jin', 'valentina', 'luna', 'koharu'];
  const picked = preferred.filter((id) => id !== partnerId).slice(0, 3);
  return [picked[0], picked[1], picked[2]];
}

export function DaifugoGame() {
  const [rules, setRules] = useState<DaifugoRules>({
    revolution: true,
    eightCut: true,
    sequence: true,
    spade3Return: true,
    miyakoOchi: true,
  });

  const [felt, setFelt] = useState<FeltId>('crimson');
  const [partnerId, setPartnerId] = useState<CharId>('koharu');
  const [voiceOn, setVoiceOn] = useState<boolean>(true);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [isRevolution, setIsRevolution] = useState<boolean>(false);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [tablePlay, setTablePlay] = useState<TablePlay | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<'exchange' | 'playing' | 'roundEnd'>('playing');
  const [exchangeRequiredCount, setExchangeRequiredCount] = useState<number>(0);
  const [exchangeInfo, setExchangeInfo] = useState<ExchangeSummaryInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);
  const [banner, setBanner] = useState<string>('');
  const [speechBubbles, setSpeechBubbles] = useState<Record<number, string>>({});
  const [cutIn, setCutIn] = useState<CutInBannerState | null>(null);
  const cutInTimerRef = useRef<number | null>(null);

  const speakCharacterLine = useCallback(
    (charId: CharId, text: string) => {
      if (!voiceOn || typeof window === 'undefined') return;
      const def = CHARACTERS[charId];
      holdemAudio.speak(text, {
        charId,
        gender: def.voiceGender,
        pitch: def.voicePitch,
        rate: def.voiceRate,
        enabled: voiceOn,
      });
    },
    [voiceOn]
  );

  const triggerCutIn = useCallback(
    (
      charId: CharId,
      eyebrow: string,
      title: string,
      subtitle: string,
      line: string,
      isWin = false
    ) => {
      if (cutInTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(cutInTimerRef.current);
      }
      setCutIn({
        id: Date.now() + Math.floor(Math.random() * 1000),
        charId,
        eyebrow,
        title,
        subtitle,
        line,
        isWin,
      });
      speakCharacterLine(charId, line);
      if (typeof window !== 'undefined') {
        cutInTimerRef.current = window.setTimeout(() => {
          setCutIn(null);
        }, 1600);
      }
    },
    [speakCharacterLine]
  );

  useEffect(() => {
    return () => {
      if (cutInTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(cutInTimerRef.current);
      }
    };
  }, []);

  // Procedural Web Audio BGM loop
  useEffect(() => {
    if (!bgmOn || typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    // Upbeat salón / card-table pentatonic progression (shifts in revolution)
    const normalNotes = [261.63, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63];
    const revNotes = [293.66, 349.23, 440.0, 466.16, 587.33, 466.16, 440.0, 349.23];
    const bassNotes = [130.81, 164.81, 146.83, 196.0];
    let step = 0;

    const tick = () => {
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const melodyList = isRevolution ? revNotes : normalNotes;
      const freq = melodyList[step % melodyList.length];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isRevolution ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.018, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);

      if (step % 2 === 0) {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(bassNotes[(step / 2) % bassNotes.length], now);
        bassGain.gain.setValueAtTime(0.022, now);
        bassGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.45);
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.46);
      }

      step += 1;
    };

    tick();
    const intervalId = window.setInterval(tick, 280);

    return () => {
      window.clearInterval(intervalId);
      void ctx.close().catch(() => {});
    };
  }, [bgmOn, isRevolution]);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [msg, ...prev.slice(0, 14)]);
  }, []);

  const handleSelectPartner = useCallback(
    (nextPartner: CharId) => {
      setPartnerId(nextPartner);
      const [r1, r2, r3] = getRivalCharIds(nextPartner);
      setPlayers((prev) => {
        if (prev.length < 4) return prev;
        const rivalIds = [r1, r2, r3];
        return prev.map((p, idx) => {
          if (idx === 0) {
            return {
              ...p,
              charId: nextPartner,
            };
          }
          const newCharId = rivalIds[idx - 1];
          return {
            ...p,
            charId: newCharId,
            name: CHARACTERS[newCharId].name,
          };
        });
      });
      speakCharacterLine(nextPartner, CHARACTERS[nextPartner].lines.select[0]);
    },
    [speakCharacterLine]
  );

  const dealRound = useCallback(
    (nextRound: number, prevRanks?: SocialRank[], currentPartner: CharId = partnerId) => {
      const deck = create54CardDeck();
      const hands: CardItem[][] = [[], [], [], []];
      deck.forEach((card, idx) => {
        hands[idx % 4].push(card);
      });

      const [r1, r2, r3] = getRivalCharIds(currentPartner);
      const personas: { charId: CharId; name: string; persona: AiPersona; isHuman: boolean }[] = [
        { charId: currentPartner, name: 'あなた', persona: 'プレイヤー', isHuman: true },
        { charId: r1, name: CHARACTERS[r1].name, persona: '積極革命タイプ', isHuman: false },
        { charId: r2, name: CHARACTERS[r2].name, persona: '堅実温存タイプ', isHuman: false },
        { charId: r3, name: CHARACTERS[r3].name, persona: '速攻あがりタイプ', isHuman: false },
      ];

      const initialPlayers: PlayerState[] = personas.map((p, idx) => ({
        id: idx,
        charId: p.charId,
        name: p.name,
        persona: p.persona,
        isHuman: p.isHuman,
        hand: sortHand(hands[idx], false),
        socialRank: prevRanks ? prevRanks[idx] : '平民',
        passed: false,
        finishedOrder: null,
      }));

      setIsRevolution(false);
      setTablePlay(null);
      setSelectedIds([]);
      setExchangeInfo(null);
      setExchangeRequiredCount(0);
      setSpeechBubbles({
        1: CHARACTERS[r1].lines.greet[0],
        2: CHARACTERS[r2].lines.greet[0],
        3: CHARACTERS[r3].lines.greet[0],
      });

      // Perform Round 2+ card exchange if rankings exist
      if (nextRound > 1 && prevRanks) {
        const daifugoIdx = initialPlayers.findIndex((p) => p.socialRank === '大富豪');
        const daihinminIdx = initialPlayers.findIndex((p) => p.socialRank === '大貧民');
        const fugoIdx = initialPlayers.findIndex((p) => p.socialRank === '富豪');
        const hinminIdx = initialPlayers.findIndex((p) => p.socialRank === '貧民');

        let daihinminTributed: CardItem[] = [];
        let daifugoGivenBack: CardItem[] = [];
        let hinminTributed: CardItem[] = [];
        let fugoGivenBack: CardItem[] = [];

        // Daihinmin gives 2 strongest cards to Daifugo automatically
        if (daifugoIdx !== -1 && daihinminIdx !== -1) {
          const sortedLow = sortHand(initialPlayers[daihinminIdx].hand, false);
          const bestTwo = sortedLow.slice(-2);
          const lowRemaining = sortedLow.slice(0, -2);
          daihinminTributed = bestTwo;

          if (!initialPlayers[daifugoIdx].isHuman) {
            const aiInitialSorted = sortHand(initialPlayers[daifugoIdx].hand, false);
            const giveBack = aiInitialSorted.slice(0, 2);
            const aiRemaining = aiInitialSorted.slice(2);
            daifugoGivenBack = giveBack;
            initialPlayers[daifugoIdx].hand = sortHand([...aiRemaining, ...bestTwo], false);
            initialPlayers[daihinminIdx].hand = sortHand([...lowRemaining, ...giveBack], false);
          } else {
            initialPlayers[daihinminIdx].hand = lowRemaining;
            initialPlayers[daifugoIdx].hand = sortHand(
              [...initialPlayers[daifugoIdx].hand, ...bestTwo],
              false
            );
          }
        }

        // Hinmin gives 1 strongest card to Fugo automatically
        if (fugoIdx !== -1 && hinminIdx !== -1) {
          const sortedLow = sortHand(initialPlayers[hinminIdx].hand, false);
          const bestOne = sortedLow.slice(-1);
          const lowRemaining = sortedLow.slice(0, -1);
          hinminTributed = bestOne;

          if (!initialPlayers[fugoIdx].isHuman) {
            const aiInitialSorted = sortHand(initialPlayers[fugoIdx].hand, false);
            const giveBack = aiInitialSorted.slice(0, 1);
            const aiRemaining = aiInitialSorted.slice(1);
            fugoGivenBack = giveBack;
            initialPlayers[fugoIdx].hand = sortHand([...aiRemaining, ...bestOne], false);
            initialPlayers[hinminIdx].hand = sortHand([...lowRemaining, ...giveBack], false);
          } else {
            initialPlayers[hinminIdx].hand = lowRemaining;
            initialPlayers[fugoIdx].hand = sortHand(
              [...initialPlayers[fugoIdx].hand, ...bestOne],
              false
            );
          }
        }

        const humanRank = initialPlayers[0].socialRank;

        // Upper rank (大富豪 / 富豪): Human freely selects 2 or 1 unneeded cards to give down
        if (humanRank === '大富豪' || humanRank === '富豪') {
          const req = humanRank === '大富豪' ? 2 : 1;
          const partnerRank: SocialRank = humanRank === '大富豪' ? '大貧民' : '貧民';
          const partnerPlayer = initialPlayers.find((p) => p.socialRank === partnerRank);
          const tributed = humanRank === '大富豪' ? daihinminTributed : hinminTributed;

          setPlayers(initialPlayers);
          setRoundNumber(nextRound);
          setExchangeRequiredCount(req);
          setExchangeInfo({
            humanRank,
            partnerRank,
            partnerName: partnerPlayer?.name ?? partnerRank,
            cardCount: req,
            tributedCards: tributed,
            receivedFromUpperCards: [],
          });
          setPhase('exchange');
          setBanner(
            `👑 階級カード交換：あなたは「${humanRank}」です！「${partnerRank}（${partnerPlayer?.name ?? ''}）」から最強カード${req}枚を受け取りました。渡す不要なカードを${req}枚選んでください。`
          );
          setLogs([
            `第${nextRound}ラウンド配牌完了。階級カード交換フェーズです（あなた：${humanRank}）。`,
          ]);
          return;
        }

        // Lower rank (貧民 / 大貧民): Automatic tribute of strongest card(s); human CANNOT choose cards!
        if (humanRank === '大貧民' || humanRank === '貧民') {
          const count = humanRank === '大貧民' ? 2 : 1;
          const partnerRank: SocialRank = humanRank === '大貧民' ? '大富豪' : '富豪';
          const partnerPlayer = initialPlayers.find((p) => p.socialRank === partnerRank);
          const tributed = humanRank === '大貧民' ? daihinminTributed : hinminTributed;
          const received = humanRank === '大貧民' ? daifugoGivenBack : fugoGivenBack;

          setPlayers(initialPlayers);
          setRoundNumber(nextRound);
          setExchangeRequiredCount(0);
          setSelectedIds([]);
          setExchangeInfo({
            humanRank,
            partnerRank,
            partnerName: partnerPlayer?.name ?? partnerRank,
            cardCount: count,
            tributedCards: tributed,
            receivedFromUpperCards: received,
          });
          setPhase('exchange');
          setBanner(
            `⛓️ 階級カード交換：あなたは「${humanRank}」のため交換カードは選べません。最強カード${count}枚が「${partnerRank}（${partnerPlayer?.name ?? ''}）」へ自動献上されました。`
          );
          setLogs([
            `第${nextRound}ラウンド配牌完了。あなたは「${humanRank}」のため最強カード${count}枚が自動献上されました（手動選択不可）。`,
          ]);
          return;
        }
      }

      setPlayers(initialPlayers);
      setRoundNumber(nextRound);
      setTurnIndex(0);
      setPhase('playing');
      setBanner(`第${nextRound}ラウンド開始！あなたの手番からスタートします。`);
      setLogs([`第${nextRound}ラウンドが開始されました（54枚配牌完了）。`]);
    },
    [partnerId]
  );

  useEffect(() => {
    dealRound(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findNextActivePlayer = useCallback(
    (currentIdx: number, plist: PlayerState[], ignorePass = false): number => {
      for (let step = 1; step <= 4; step += 1) {
        const idx = (currentIdx + step) % 4;
        const p = plist[idx];
        if (p.finishedOrder === null && (ignorePass || !p.passed)) {
          return idx;
        }
      }
      return currentIdx;
    },
    []
  );

  const finalizeRoundIfComplete = useCallback(
    (plist: PlayerState[], currentRev: boolean): boolean => {
      const remaining = plist.filter((p) => p.finishedOrder === null);
      if (remaining.length <= 1) {
        const updated = plist.map((p) => ({
          ...p,
          hand: sortHand(p.hand, currentRev),
        }));
        if (remaining.length === 1) {
          const lastPlayer = updated.find((p) => p.id === remaining[0].id)!;
          const usedOrders = updated
            .map((p) => p.finishedOrder)
            .filter((n): n is number => n !== null);
          for (let ord = 1; ord <= 4; ord += 1) {
            if (!usedOrders.includes(ord)) {
              lastPlayer.finishedOrder = ord;
              break;
            }
          }
        }
        const rankMap: Record<number, SocialRank> = {
          1: '大富豪',
          2: '富豪',
          3: '貧民',
          4: '大貧民',
        };
        updated.forEach((p) => {
          p.socialRank = rankMap[p.finishedOrder ?? 4] ?? '平民';
        });

        setPlayers(updated);
        setSelectedIds([]);
        setPhase('roundEnd');
        playCardSound('win', soundOn);
        setBanner(
          `🏁 第${roundNumber}ラウンド終了！あなたの階級は「${updated[0].socialRank}（${updated[0].finishedOrder}位）」になりました！`
        );
        return true;
      }
      return false;
    },
    [roundNumber, soundOn]
  );

  const executePlay = useCallback(
    (playerIdx: number, cardsToPlay: CardItem[]) => {
      const combo = analyzeCombo(cardsToPlay, rules, isRevolution);
      if (!combo) return;

      let nextRev = isRevolution;
      if (combo.triggersRevolution) {
        nextRev = !isRevolution;
      }

      const isSpade3Counter =
        Boolean(
          rules.spade3Return &&
            tablePlay?.isSingleJoker &&
            cardsToPlay.length === 1 &&
            combo.isSpade3
        );
      const isEightCut = rules.eightCut && combo.containsEight;
      const clearsTable = isEightCut || isSpade3Counter;

      const updatedPlayers = players.map((p) => ({
        ...p,
        hand: [...p.hand],
      }));
      const actor = updatedPlayers[playerIdx];
      const playedIds = new Set(cardsToPlay.map((c) => c.id));
      actor.hand = sortHand(
        actor.hand.filter((c) => !playedIds.has(c.id)),
        nextRev
      );

      // Resort everyone's hand if revolution toggled
      if (nextRev !== isRevolution) {
        updatedPlayers.forEach((p) => {
          p.hand = sortHand(p.hand, nextRev);
        });
      }

      const cardNames = cardsToPlay
        .map((c) => (c.suit === 'joker' ? 'JOKER' : `${SUIT_SYMBOL[c.suit]}${formatRank(c.rank)}`))
        .join(' ');

      let eventTags = '';
      if (combo.triggersRevolution) eventTags += ' 【⚡革命発生！】';
      if (isEightCut) eventTags += ' 【✂️8切り！】';
      if (isSpade3Counter) eventTags += ' 【🗡️スペ3返し！】';

      addLog(`${actor.name}: ${cardNames} を出しました${eventTags}`);

      const charLines = DAIFUGO_LINES[actor.charId];
      let bubbleLine = charLines.play;
      if (combo.triggersRevolution) bubbleLine = charLines.revolution;
      else if (isSpade3Counter) bubbleLine = charLines.spade3;
      else if (isEightCut) bubbleLine = charLines.eightCut;

      // Check if actor finished hand
      let finishedFirst = false;
      if (actor.hand.length === 0) {
        const usedOrders = new Set(
          updatedPlayers.map((p) => p.finishedOrder).filter((n): n is number => n !== null)
        );
        const myOrder = [1, 2, 3, 4].find((ord) => !usedOrders.has(ord)) ?? 4;
        actor.finishedOrder = myOrder;
        addLog(`🎉 ${actor.name} が ${myOrder}位であがりました！`);
        if (myOrder === 1) {
          finishedFirst = true;
          bubbleLine = charLines.win;
        } else {
          bubbleLine = charLines.finish;
        }

        // Check Miyako-ochi (都落ち): if Round 2+, someone else finished 1st, and previous Daifugo hasn't finished
        if (rules.miyakoOchi && roundNumber > 1 && myOrder === 1 && actor.socialRank !== '大富豪') {
          const prevDaifugo = updatedPlayers.find(
            (p) => p.socialRank === '大富豪' && p.finishedOrder === null
          );
          if (prevDaifugo) {
            prevDaifugo.finishedOrder = 4;
            prevDaifugo.hand = [];
            addLog(`💥 都落ち発生！前ラウンド大富豪の ${prevDaifugo.name} が大貧民へ転落しました！`);
          }
        }
      }

      if (actor.id !== 0) {
        setSpeechBubbles((prev) => ({ ...prev, [actor.id]: bubbleLine }));
      }

      // Dramatic diagonal anime cut-in on big events!
      if (combo.triggersRevolution) {
        triggerCutIn(
          actor.charId,
          'ROYAL FLUSH NIGHT — REVOLUTION',
          '⚡ 革命発動 — REVOLUTION!!',
          `${actor.name} が ${cardNames} で強弱を完全逆転！`,
          charLines.revolution,
          false
        );
      } else if (isSpade3Counter) {
        triggerCutIn(
          actor.charId,
          'MIRACLE COUNTER — SPADE 3',
          '⚔️ スペ3返し!!',
          `${actor.name} が最強ジョーカーを ♠3 単騎で討ち取った！`,
          charLines.spade3,
          false
        );
      } else if (isEightCut) {
        triggerCutIn(
          actor.charId,
          'TABLE SWEEP — EIGHT CUT',
          '✂️ 8切り — EIGHT CUT!!',
          `${actor.name}（${cardNames}）が場を強制リセット！`,
          charLines.eightCut,
          false
        );
      } else if (finishedFirst) {
        triggerCutIn(
          actor.charId,
          'DAIFUGO CROWNED — 1ST PLACE',
          '👑 大富豪勝利!!',
          `${actor.name} が第${roundNumber}ラウンド1位あがり！`,
          charLines.win,
          true
        );
      } else if (!actor.isHuman) {
        speakCharacterLine(actor.charId, bubbleLine);
      }

      setIsRevolution(nextRev);
      setSelectedIds([]);

      if (finalizeRoundIfComplete(updatedPlayers, nextRev)) {
        return;
      }

      const otherActiveUnpassed = updatedPlayers.filter(
        (p) => p.id !== actor.id && p.finishedOrder === null && !p.passed
      );

      if (clearsTable || otherActiveUnpassed.length === 0) {
        updatedPlayers.forEach((p) => {
          p.passed = false;
        });
        setTablePlay(null);
        const nextLead =
          actor.finishedOrder === null
            ? playerIdx
            : findNextActivePlayer(playerIdx, updatedPlayers, true);
        setPlayers(updatedPlayers);
        setTurnIndex(nextLead);
        setBanner(
          clearsTable
            ? `${actor.name}の${isSpade3Counter ? 'スペ3返し' : '8切り'}で場が流れました！${updatedPlayers[nextLead].name}が親になります。`
            : `他プレイヤー全員パス済みの為、場が流れて${updatedPlayers[nextLead].name}が親になります。`
        );
        playCardSound('win', soundOn);
        return;
      }

      const newTablePlay: TablePlay = {
        playerId: actor.id,
        playerName: actor.name,
        cards: cardsToPlay,
        kind: combo.kind,
        count: cardsToPlay.length,
        baseRank: combo.baseRank,
        isSingleJoker: combo.isSingleJoker,
        isSpade3Counter,
      };

      const nextTurn = findNextActivePlayer(playerIdx, updatedPlayers, false);
      setPlayers(updatedPlayers);
      setTablePlay(newTablePlay);
      setTurnIndex(nextTurn);
      setBanner(
        `${actor.name}が「${cardNames}」を出しました${eventTags} → 次は${updatedPlayers[nextTurn].name}の手番`
      );
      playCardSound('card', soundOn);
    },
    [
      rules,
      isRevolution,
      tablePlay,
      players,
      addLog,
      roundNumber,
      finalizeRoundIfComplete,
      findNextActivePlayer,
      soundOn,
      triggerCutIn,
      speakCharacterLine,
    ]
  );

  const executePass = useCallback(
    (playerIdx: number) => {
      if (playerIdx === 0) {
        setSelectedIds([]);
      }
      const updatedPlayers = players.map((p) => ({ ...p }));
      const actor = updatedPlayers[playerIdx];
      actor.passed = true;
      addLog(`${actor.name}: パス`);

      if (actor.id !== 0) {
        const passLine = DAIFUGO_LINES[actor.charId].pass;
        setSpeechBubbles((prev) => ({ ...prev, [actor.id]: passLine }));
      }

      const activeUnpassed = updatedPlayers.filter(
        (p) => p.finishedOrder === null && !p.passed
      );

      if (
        activeUnpassed.length === 0 ||
        (activeUnpassed.length === 1 && tablePlay && activeUnpassed[0].id === tablePlay.playerId)
      ) {
        const nextOwner =
          activeUnpassed.length === 1
            ? activeUnpassed[0].id
            : findNextActivePlayer(tablePlay?.playerId ?? playerIdx, updatedPlayers, true);
        updatedPlayers.forEach((p) => {
          p.passed = false;
        });
        setPlayers(updatedPlayers);
        setTablePlay(null);
        setTurnIndex(nextOwner);
        setBanner(`全員パスのため場が流れました！${updatedPlayers[nextOwner].name}の親から再開します。`);
        playCardSound('flip', soundOn);
        return;
      }

      const nextTurn = findNextActivePlayer(playerIdx, updatedPlayers, false);
      setPlayers(updatedPlayers);
      setTurnIndex(nextTurn);
      setBanner(`${actor.name}がパスしました → 次は${updatedPlayers[nextTurn].name}の手番`);
      playCardSound('pass', soundOn);
    },
    [players, addLog, tablePlay, findNextActivePlayer, soundOn]
  );

  // AI Turn Effect
  useEffect(() => {
    if (phase !== 'playing' || players.length === 0) return;
    const current = players[turnIndex];
    if (!current || current.isHuman || current.finishedOrder !== null) return;

    const timer = window.setTimeout(() => {
      const candidates = generateAllValidPlays(
        current.hand,
        tablePlay,
        rules,
        isRevolution
      );

      if (candidates.length === 0) {
        executePass(turnIndex);
        return;
      }

      // Sort candidate plays by persona preference
      candidates.sort((a, b) => {
        const comboA = analyzeCombo(a, rules, isRevolution)!;
        const comboB = analyzeCombo(b, rules, isRevolution)!;
        const strA = getCardStrength(comboA.baseRank, isRevolution);
        const strB = getCardStrength(comboB.baseRank, isRevolution);

        if (current.persona === '積極革命タイプ') {
          if (comboA.triggersRevolution !== comboB.triggersRevolution) {
            return comboA.triggersRevolution ? -1 : 1;
          }
          if (a.length !== b.length) return b.length - a.length;
        } else if (current.persona === '速攻あがりタイプ') {
          if (a.length !== b.length) return b.length - a.length;
          if (comboA.containsEight !== comboB.containsEight) {
            return comboA.containsEight ? -1 : 1;
          }
        }
        // Default: play weakest valid cards first to conserve strong cards
        return strA - strB;
      });

      const chosen = candidates[0];
      const chosenCombo = analyzeCombo(chosen, rules, isRevolution)!;
      const chosenStr = getCardStrength(chosenCombo.baseRank, isRevolution);

      // Conservative AI may pass instead of burning a Joker or 2 early when hand still has 6+ cards
      if (
        tablePlay !== null &&
        current.persona === '堅実温存タイプ' &&
        current.hand.length >= 6 &&
        chosenStr >= 13 &&
        !chosenCombo.isSpade3
      ) {
        executePass(turnIndex);
        return;
      }

      executePlay(turnIndex, chosen);
    }, 680);

    return () => window.clearTimeout(timer);
  }, [phase, players, turnIndex, tablePlay, rules, isRevolution, executePass, executePlay]);

  const humanPlayer = players[0];
  const partnerDef = CHARACTERS[partnerId];
  const isHumanUpperRank =
    humanPlayer?.socialRank === '大富豪' || humanPlayer?.socialRank === '富豪';
  const isHumanLowerRank =
    humanPlayer?.socialRank === '貧民' || humanPlayer?.socialRank === '大貧民';

  const tributedCardIdSet = useMemo(() => {
    if (!exchangeInfo) return new Set<string>();
    return new Set(exchangeInfo.tributedCards.map((c) => c.id));
  }, [exchangeInfo]);

  const receivedFromUpperIdSet = useMemo(() => {
    if (!exchangeInfo) return new Set<string>();
    return new Set(exchangeInfo.receivedFromUpperCards.map((c) => c.id));
  }, [exchangeInfo]);

  // Strict card selection gating:
  // ONLY allowed when:
  // 1) phase === 'playing' && turnIndex === 0 && humanPlayer.finishedOrder === null
  // 2) phase === 'exchange' && (humanPlayer.socialRank === '大富豪' || humanPlayer.socialRank === '富豪')
  const canHumanSelectCardsInHand = Boolean(
    humanPlayer &&
      ((phase === 'playing' && turnIndex === 0 && humanPlayer.finishedOrder === null) ||
        (phase === 'exchange' && isHumanUpperRank))
  );

  const selectedCards = useMemo(() => {
    if (!humanPlayer || !canHumanSelectCardsInHand) return [];
    return humanPlayer.hand.filter((c) => selectedIds.includes(c.id));
  }, [humanPlayer, canHumanSelectCardsInHand, selectedIds]);

  const selectedComboPreview = useMemo(() => {
    if (selectedCards.length === 0) return null;
    const combo = analyzeCombo(selectedCards, rules, isRevolution);
    if (!combo || !combo.valid) {
      return {
        valid: false,
        beatsTable: false,
        label: '❌ 役として成立していません',
        tags: [] as string[],
      };
    }
    const beatsTable = canBeatTable(selectedCards, tablePlay, rules, isRevolution);
    let kindLabel = '単騎';
    if (combo.kind === 'sequence') {
      kindLabel = `${selectedCards.length}枚階段`;
    } else if (combo.kind === 'group') {
      if (selectedCards.length === 2) kindLabel = 'ペア';
      else if (selectedCards.length === 3) kindLabel = '3枚組';
      else if (selectedCards.length >= 4) kindLabel = '4枚組';
    }
    const tags: string[] = [kindLabel];
    if (combo.triggersRevolution) tags.push('⚡4枚革命!');
    if (rules.eightCut && combo.containsEight) tags.push('✂️8切り!');
    if (
      rules.spade3Return &&
      tablePlay?.isSingleJoker &&
      selectedCards.length === 1 &&
      combo.isSpade3
    ) {
      tags.push('⚔️スペ3返し!');
    }
    return {
      valid: true,
      beatsTable,
      label: beatsTable ? '✅ 場に出せます' : '⚠️ 現在の場のカードより弱いか枚数・役が異なります',
      tags,
    };
  }, [selectedCards, rules, isRevolution, tablePlay]);

  const canHumanPlaySelected = useMemo(() => {
    if (phase !== 'playing' || turnIndex !== 0 || selectedCards.length === 0) return false;
    return canBeatTable(selectedCards, tablePlay, rules, isRevolution);
  }, [phase, turnIndex, selectedCards, tablePlay, rules, isRevolution]);

  const playableCardIdsInHand = useMemo(() => {
    if (!humanPlayer || phase !== 'playing' || turnIndex !== 0 || humanPlayer.finishedOrder !== null) {
      return new Set<string>();
    }
    const validCombos = generateAllValidPlays(
      humanPlayer.hand,
      tablePlay,
      rules,
      isRevolution
    );
    const idSet = new Set<string>();
    validCombos.forEach((combo) => combo.forEach((c) => idSet.add(c.id)));
    return idSet;
  }, [humanPlayer, phase, turnIndex, tablePlay, rules, isRevolution]);

  const handleAutoSelectWeakest = useCallback(() => {
    if (phase !== 'exchange' || !humanPlayer || !isHumanUpperRank || exchangeRequiredCount <= 0) {
      return;
    }
    const selectable = sortHand(
      humanPlayer.hand.filter((c) => !tributedCardIdSet.has(c.id)),
      false
    );
    const picked = selectable.slice(0, exchangeRequiredCount).map((c) => c.id);
    setSelectedIds(picked);
    playCardSound('card', soundOn);
  }, [phase, humanPlayer, isHumanUpperRank, exchangeRequiredCount, tributedCardIdSet, soundOn]);

  const handleConfirmExchange = useCallback(() => {
    if (
      phase !== 'exchange' ||
      !isHumanUpperRank ||
      selectedCards.length !== exchangeRequiredCount
    ) {
      return;
    }
    const updated = players.map((p) => ({ ...p, hand: [...p.hand] }));
    const human = updated[0];
    const targetRank: SocialRank = human.socialRank === '大富豪' ? '大貧民' : '貧民';
    const receiver = updated.find((p) => p.socialRank === targetRank);

    if (receiver) {
      const giveIds = new Set(selectedIds);
      const given = human.hand.filter((c) => giveIds.has(c.id));
      human.hand = sortHand(
        human.hand.filter((c) => !giveIds.has(c.id)),
        false
      );
      receiver.hand = sortHand([...receiver.hand, ...given], false);
      const givenNames = given
        .map((c) => (c.suit === 'joker' ? 'JOKER' : `${SUIT_SYMBOL[c.suit]}${formatRank(c.rank)}`))
        .join('・');
      addLog(`👑 階級交換：あなたが「${targetRank}（${receiver.name}）」へ ${givenNames} を渡しました。`);
    }

    setPlayers(updated);
    setSelectedIds([]);
    setExchangeInfo(null);
    setPhase('playing');
    setTurnIndex(0);
    setBanner(`カード交換が完了しました！第${roundNumber}ラウンド開始です。あなたの手番からスタートします。`);
    playCardSound('card', soundOn);
  }, [
    phase,
    isHumanUpperRank,
    selectedCards.length,
    exchangeRequiredCount,
    players,
    selectedIds,
    addLog,
    roundNumber,
    soundOn,
  ]);

  const handleAcknowledgeLowerExchange = useCallback(() => {
    if (phase !== 'exchange' || !isHumanLowerRank) return;
    if (exchangeInfo) {
      const tributedNames = exchangeInfo.tributedCards
        .map((c) => (c.suit === 'joker' ? 'JOKER' : `${SUIT_SYMBOL[c.suit]}${formatRank(c.rank)}`))
        .join('・');
      addLog(
        `⛓️ 階級交換（自動献上）：「${exchangeInfo.humanRank}」のあなたから最強カード（${tributedNames}）が「${exchangeInfo.partnerRank}（${exchangeInfo.partnerName}）」へ自動献上されました。`
      );
    }
    setSelectedIds([]);
    setExchangeInfo(null);
    setPhase('playing');
    setTurnIndex(0);
    setBanner(`第${roundNumber}ラウンド開始！あなたの手番からスタートします。`);
    playCardSound('card', soundOn);
  }, [phase, isHumanLowerRank, exchangeInfo, addLog, roundNumber, soundOn]);

  const toggleCardSelection = (cardId: string) => {
    if (!canHumanSelectCardsInHand) return;
    if (phase === 'exchange') {
      // Upper rank cannot return the just-tributed strongest cards
      if (tributedCardIdSet.has(cardId)) return;
      setSelectedIds((prev) => {
        if (prev.includes(cardId)) {
          return prev.filter((id) => id !== cardId);
        }
        if (prev.length >= exchangeRequiredCount) {
          return [...prev.slice(1), cardId];
        }
        return [...prev, cardId];
      });
      playCardSound('card', soundOn);
      return;
    }

    setSelectedIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
    playCardSound('card', soundOn);
  };

  const currentFeltObj = FELTS.find((f) => f.id === felt) ?? FELTS[1];

  return (
    <div
      className="relative min-h-screen bg-slate-950 text-slate-100 select-none"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(10,6,18,0.78), rgba(6,8,18,0.92)), url(${HOLDEM_ASSETS.bgLounge})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dramatic Diagonal Anime Cut-In Overlay */}
      {cutIn && (
        <div
          key={cutIn.id}
          role="dialog"
          aria-label={cutIn.title}
          onClick={() => setCutIn(null)}
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden bg-black/65 backdrop-blur-[2px]"
        >
          <div
            className="relative flex w-[115%] -rotate-6 items-center justify-between border-y-4 px-6 py-5 shadow-[0_0_70px_rgba(251,191,36,0.55)] sm:px-16 sm:py-7"
            style={{
              borderColor: CHARACTERS[cutIn.charId].color2,
              background: `linear-gradient(100deg, ${CHARACTERS[cutIn.charId].color}ee 0%, #090d1a 58%, ${CHARACTERS[cutIn.charId].color2}dd 100%)`,
            }}
          >
            <div className="z-10 max-w-xl">
              <p className="text-[10px] font-black tracking-[0.35em] text-amber-200 uppercase sm:text-xs">
                {cutIn.eyebrow} — {CHARACTERS[cutIn.charId].nameEn}
              </p>
              <p className="mt-1 bg-gradient-to-b from-white via-amber-100 to-amber-400 bg-clip-text text-2xl font-black italic tracking-tight text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] sm:text-5xl">
                {cutIn.title}
              </p>
              <p className="mt-1.5 inline-block rounded-md bg-black/60 px-2.5 py-0.5 text-xs font-bold text-amber-100 sm:text-sm">
                {cutIn.subtitle}
              </p>
              <p className="mt-2 rounded-xl border border-white/30 bg-white/95 px-3 py-1.5 text-xs font-black text-slate-900 shadow-lg sm:text-sm">
                「{cutIn.line}」
              </p>
            </div>
            <div className="relative -my-10 h-36 w-36 shrink-0 overflow-hidden rounded-full border-4 border-amber-300 bg-slate-900 shadow-2xl sm:h-48 sm:w-48">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={charImage(cutIn.charId, cutIn.isWin ? 'win' : 'normal')}
                alt={CHARACTERS[cutIn.charId].name}
                className="h-full w-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-amber-400/25 bg-slate-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/games"
              className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition hover:border-amber-300 hover:bg-amber-500/20"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-black tracking-[0.22em] text-amber-400 uppercase">
                ROYAL FLUSH NIGHT — MILLIONAIRE LOUNGE
              </p>
              <h2 className="text-sm font-black tracking-tight text-white sm:text-lg">
                大富豪（ロイヤル・ナイト・大貧民）
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-2.5 py-1 text-xs font-black text-amber-200">
              第{roundNumber}R {isRevolution ? '【⚡革命中：3最強】' : '【通常：2最強】'}
            </span>
            <button
              type="button"
              onClick={() => setVoiceOn((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                voiceOn
                  ? 'border-rose-400/60 bg-rose-500/20 text-rose-200'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {voiceOn ? '🗣 ボイス ON' : '🗣 ボイス OFF'}
            </button>
            <button
              type="button"
              onClick={() => setBgmOn((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                bgmOn
                  ? 'border-amber-400/50 bg-amber-400/20 text-amber-200'
                  : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              {bgmOn ? '🎵 BGM ON' : '🎵 BGM OFF'}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((prev) => !prev)}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              {soundOn ? '🔊 音ON' : '🔇 音OFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_320px]">
        {/* Main Luxury Felt Table */}
        <div
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.85)] sm:p-5"
          style={{
            borderColor: `${currentFeltObj.accent}55`,
            backgroundImage: `radial-gradient(ellipse at center, rgba(15,23,42,0.22) 0%, rgba(2,6,23,0.78) 100%), url(${HOLDEM_ASSETS.felt[felt]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* 3 Anime Character AI Rivals Row */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {players.slice(1).map((ai) => {
              const isTurn = phase === 'playing' && turnIndex === ai.id;
              const charDef = CHARACTERS[ai.charId];
              const rankBadge = RANK_BADGE_META[ai.socialRank];
              const bubble = speechBubbles[ai.id];
              return (
                <div
                  key={ai.id}
                  className={`relative rounded-2xl border p-2.5 backdrop-blur-md transition ${
                    isTurn
                      ? 'border-amber-300 bg-slate-950/85 shadow-[0_0_24px_rgba(251,191,36,0.35)]'
                      : 'border-white/15 bg-slate-950/70'
                  }`}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: charDef.color,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 bg-slate-900 shadow-md"
                      style={{ borderColor: charDef.color }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={charImage(ai.charId, ai.finishedOrder === 1 ? 'win' : 'normal')}
                        alt={ai.name}
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-black text-white">{ai.name}</span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${rankBadge.badgeClass}`}
                        >
                          {rankBadge.label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] font-semibold text-amber-200/80">
                        {charDef.title} ・ {ai.persona}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        {ai.finishedOrder !== null ? (
                          <span className="font-black text-amber-300">
                            🏆 {ai.finishedOrder}位あがり
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] font-black text-emerald-300">
                            🎴 残り {ai.hand.length}枚
                          </span>
                        )}
                        {ai.passed && ai.finishedOrder === null && (
                          <span className="rounded bg-rose-500/30 px-1.5 py-0.5 text-[10px] font-black text-rose-200">
                            PASS
                          </span>
                        )}
                        {isTurn && ai.finishedOrder === null && (
                          <span className="animate-pulse rounded bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-black text-amber-200">
                            思考中…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {bubble && (
                    <div className="mt-2 rounded-xl border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                      💬 「{bubble}」
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Center Field / Table Play */}
          <div className="my-4 flex flex-col items-center justify-center rounded-2xl border border-amber-300/25 bg-slate-950/65 p-4 backdrop-blur-sm sm:min-h-[205px]">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span
                className={`rounded-full px-3.5 py-1 font-black tracking-wide ${
                  isRevolution
                    ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-amber-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.75)]'
                    : 'border border-emerald-400/30 bg-emerald-500/20 text-emerald-200'
                }`}
              >
                {isRevolution ? '⚡ 革命状態（3が最強 / 2が最弱）' : '👑 通常状態（2・Aが強く 3が最弱）'}
              </span>
            </div>

            {tablePlay ? (
              <div className="flex flex-col items-center">
                <p className="mb-2 text-xs font-bold text-amber-200">
                  場のカード（出したプレイヤー: <span className="text-white">{tablePlay.playerName}</span>）
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {tablePlay.cards.map((c) => (
                    <PlayingCardView key={c.id} card={c} size="md" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-slate-300">
                <p className="text-sm font-black text-amber-100">場にカードはありません（親の自由出し）</p>
                <p className="mt-1 text-xs text-slate-300">
                  単騎・ペア・3枚組・4枚革命・同スート3枚以上の階段を出せます
                </p>
              </div>
            )}
          </div>

          {/* Status Banner */}
          <div className="mb-3 rounded-xl border border-amber-400/30 bg-slate-950/80 px-3.5 py-2 text-center text-xs font-bold text-amber-100 shadow-inner sm:text-sm">
            {banner}
          </div>

          {/* Dedicated Round 2+ Card Exchange Panel */}
          {phase === 'exchange' && exchangeInfo && isHumanLowerRank && (
            <div className="mb-3 rounded-2xl border border-rose-400/40 bg-rose-950/75 p-3.5 shadow-lg backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-rose-200 sm:text-sm">
                    ⛓️ 階級カード交換（下位階級：最強カード自動献上・選択不可）
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">
                    あなたは「<span className="font-black text-amber-300">{exchangeInfo.humanRank}</span>
                    」のため、交換するカードを自分で選ぶことはできません。大富豪ルールにより、配られた手札の中で最も強いカード（
                    {exchangeInfo.cardCount}枚）が自動的に「
                    <span className="font-black text-amber-300">
                      {exchangeInfo.partnerRank}（{exchangeInfo.partnerName}）
                    </span>
                    」へ強制献上され、相手が選んだカード（{exchangeInfo.cardCount}枚）を受け取りました。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAcknowledgeLowerExchange}
                  className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow hover:bg-amber-300 sm:text-sm"
                >
                  強制交換を確認して第{roundNumber}ラウンド開始 →
                </button>
              </div>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-rose-400/30 bg-black/40 p-2.5">
                  <p className="mb-1.5 text-[11px] font-bold text-rose-300">
                    📤 自動献上された最強カード（{exchangeInfo.cardCount}枚・選択不可）
                  </p>
                  <div className="flex items-center gap-2">
                    {exchangeInfo.tributedCards.map((c) => (
                      <PlayingCardView key={c.id} card={c} size="xs" badgeText="強制献上" />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-400/30 bg-black/40 p-2.5">
                  <p className="mb-1.5 text-[11px] font-bold text-emerald-300">
                    📥 {exchangeInfo.partnerRank}から渡されたカード（{exchangeInfo.cardCount}枚）
                  </p>
                  <div className="flex items-center gap-2">
                    {exchangeInfo.receivedFromUpperCards.map((c) => (
                      <PlayingCardView key={c.id} card={c} size="xs" badgeText="受取" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {phase === 'exchange' && exchangeInfo && isHumanUpperRank && (
            <div className="mb-3 rounded-2xl border border-amber-400/40 bg-amber-950/60 p-3.5 shadow-lg backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-amber-200 sm:text-sm">
                    👑 階級カード交換（上位階級：渡すカードを任意選択）
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">
                    あなたは「<span className="font-black text-amber-300">{exchangeInfo.humanRank}</span>
                    」です！「
                    <span className="font-black text-amber-300">
                      {exchangeInfo.partnerRank}（{exchangeInfo.partnerName}）
                    </span>
                    」から最強カード{exchangeInfo.cardCount}
                    枚が自動献上されました。下の手札から相手に渡す不要なカードを
                    <span className="font-black text-amber-300">{exchangeRequiredCount}枚</span>
                    選んでください（献上されたカードは返却できません）。
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoSelectWeakest}
                    className="rounded-xl border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/25"
                  >
                    弱い順から{exchangeRequiredCount}枚を自動選択
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExchange}
                    disabled={selectedCards.length !== exchangeRequiredCount}
                    className="rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-black text-slate-950 shadow hover:bg-amber-300 disabled:opacity-40 sm:text-sm"
                  >
                    選択した{exchangeRequiredCount}枚を渡して第{roundNumber}ラウンド開始 →
                  </button>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/25 bg-black/35 px-3 py-2">
                <span className="text-[11px] font-bold text-amber-300">
                  🎁 {exchangeInfo.partnerRank}からの自動献上カード：
                </span>
                <div className="flex items-center gap-1.5">
                  {exchangeInfo.tributedCards.map((c) => (
                    <PlayingCardView key={c.id} card={c} size="xs" badgeText="献上受取" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Human Player Hand & Partner Console */}
          {humanPlayer && (
            <div className="rounded-2xl border border-white/15 bg-slate-950/80 p-3 backdrop-blur-md">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div
                    className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 bg-slate-900 shadow"
                    style={{ borderColor: partnerDef.color }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={charImage(partnerId, humanPlayer.finishedOrder === 1 ? 'win' : 'normal')}
                      alt={partnerDef.name}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-white">
                        あなた（相棒: {partnerDef.name}）
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-black ${
                          RANK_BADGE_META[humanPlayer.socialRank].badgeClass
                        }`}
                      >
                        {RANK_BADGE_META[humanPlayer.socialRank].label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {phase === 'exchange'
                        ? isHumanUpperRank
                          ? `渡す不要なカードをあと${Math.max(0, exchangeRequiredCount - selectedCards.length)}枚選択してください`
                          : '下位階級のためカードの選択はできません（自動交換済み）'
                        : phase === 'roundEnd'
                          ? 'ラウンド終了（次ラウンドへ進めます）'
                          : turnIndex === 0 && humanPlayer.finishedOrder === null
                            ? 'あなたの手番です（緑枠＝現在場に出せるカード）'
                            : '相手プレイヤーの手番中です'}
                    </p>
                  </div>
                </div>

                {phase === 'exchange' ? (
                  isHumanUpperRank ? (
                    <button
                      type="button"
                      onClick={handleConfirmExchange}
                      disabled={selectedCards.length !== exchangeRequiredCount}
                      className="rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-black text-slate-950 shadow hover:bg-amber-300 disabled:opacity-40"
                    >
                      選択した{exchangeRequiredCount}枚を渡して開始 ({selectedCards.length}/
                      {exchangeRequiredCount})
                    </button>
                  ) : (
                    <span className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-200">
                      🔒 下位階級のため手札選択不可（自動献上）
                    </span>
                  )
                ) : phase === 'roundEnd' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        dealRound(
                          roundNumber + 1,
                          players.map((p) => p.socialRank),
                          partnerId
                        )
                      }
                      className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow hover:bg-amber-300 sm:text-sm"
                    >
                      階級を引き継いで第{roundNumber + 1}ラウンドへ →
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      disabled={!canHumanSelectCardsInHand || selectedIds.length === 0}
                      className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-40"
                    >
                      選択解除
                    </button>
                    <button
                      type="button"
                      onClick={() => executePass(0)}
                      disabled={turnIndex !== 0 || tablePlay === null}
                      className="rounded-lg border border-rose-400/40 bg-rose-500/20 px-3.5 py-1.5 text-xs font-black text-rose-200 hover:bg-rose-500/30 disabled:opacity-35"
                    >
                      パス (Pass)
                    </button>
                    <button
                      type="button"
                      onClick={() => executePlay(0, selectedCards)}
                      disabled={!canHumanPlaySelected}
                      className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-1.5 text-xs font-black text-slate-950 shadow-lg transition hover:brightness-110 disabled:opacity-35 sm:text-sm"
                    >
                      カードを出す ({selectedCards.length}枚)
                    </button>
                  </div>
                )}
              </div>

              {/* Live Selected Combo Helper Badge */}
              {phase === 'playing' && selectedComboPreview && (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-xs">
                  <span className="font-bold text-slate-300">選択中の役:</span>
                  {selectedComboPreview.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-amber-400/20 px-2 py-0.5 font-black text-amber-200"
                    >
                      {tag}
                    </span>
                  ))}
                  <span
                    className={`font-bold ${
                      selectedComboPreview.beatsTable ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {selectedComboPreview.label}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-1 pt-2 sm:gap-1.5">
                {humanPlayer.hand.map((card) => {
                  const isSelected = canHumanSelectCardsInHand && selectedIds.includes(card.id);
                  const isPlayable = playableCardIdsInHand.has(card.id);
                  const isTributedReceived =
                    phase === 'exchange' && isHumanUpperRank && tributedCardIdSet.has(card.id);
                  const isLowerReceived =
                    phase === 'exchange' && isHumanLowerRank && receivedFromUpperIdSet.has(card.id);
                  const canClickThisCard =
                    canHumanSelectCardsInHand && !isTributedReceived;

                  return (
                    <PlayingCardView
                      key={card.id}
                      card={card}
                      size="sm"
                      selected={isSelected}
                      highlighted={!isSelected && isPlayable}
                      badgeText={
                        isTributedReceived
                          ? '献上受取'
                          : isLowerReceived
                            ? '受取'
                            : undefined
                      }
                      onClick={canClickThisCard ? () => toggleCardSelection(card.id) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Partner Avatar, Felt Selector, Local Rules Toggles & Play Log */}
        <aside className="flex flex-col gap-3">
          {/* Partner Character & Luxury Felt Selector */}
          <div className="rounded-2xl border border-amber-400/25 bg-slate-900/90 p-4 backdrop-blur-md">
            <h3 className="text-xs font-black tracking-wider text-amber-300 uppercase">
              👑 パートナー＆テーブル装飾
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              ロイヤル・ナイト・ラウンジの相棒キャラとテーブルフェルトを切り替えられます。
            </p>

            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {CHAR_IDS.map((cid) => {
                const c = CHARACTERS[cid];
                const active = cid === partnerId;
                return (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => handleSelectPartner(cid)}
                    className={`flex items-center gap-1.5 rounded-xl border p-1.5 text-left transition ${
                      active
                        ? 'border-amber-300 bg-amber-400/20 text-white shadow'
                        : 'border-white/10 bg-black/35 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={charImage(cid, 'normal')}
                      alt={c.name}
                      className="h-7 w-7 shrink-0 rounded-full object-cover object-top"
                    />
                    <span className="truncate text-[10px] font-black">{c.name.split(' ').pop()}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              {FELTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFelt(f.id)}
                  className={`flex-1 rounded-lg border px-2 py-1 text-[10px] font-black transition ${
                    felt === f.id
                      ? 'border-amber-300 bg-amber-400/20 text-amber-200'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.name.split('・')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-400/25 bg-slate-900/90 p-4 backdrop-blur-md">
            <h3 className="text-xs font-black tracking-wider text-amber-300 uppercase">
              ⚙️ ローカルルール設定（ON/OFF）
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              対戦中でもリアルタイムにローカルルールの有効/無効を切り替えられます。
            </p>
            <div className="mt-3 space-y-2 text-xs">
              {(
                [
                  {
                    key: 'revolution',
                    label: '革命（4枚出しで強さ逆転）',
                    desc: '4枚同時出しで3が最強・2が最弱に逆転',
                  },
                  {
                    key: 'eightCut',
                    label: '8切り（8で場を流す）',
                    desc: '8を含む役を出すと強制的に場を流して親継続',
                  },
                  {
                    key: 'sequence',
                    label: '階段（同スート3枚以上連番）',
                    desc: '同じマークの連番3枚以上をまとめて出せる',
                  },
                  {
                    key: 'spade3Return',
                    label: 'スペ3返し（対ジョーカー）',
                    desc: '単体ジョーカーを♠3の1枚で討ち取って流せる',
                  },
                  {
                    key: 'miyakoOchi',
                    label: '都落ち（大富豪の1位義務）',
                    desc: '前ラウンド大富豪が1位を逃すと大貧民へ転落',
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                >
                  <div>
                    <p className="font-bold text-slate-100">{item.label}</p>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setRules((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                    }
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                      rules[item.key]
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {rules[item.key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => dealRound(1, undefined, partnerId)}
              className="mt-3 w-full rounded-xl border border-white/15 bg-white/10 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              🔄 第1ラウンドから新規リセット
            </button>
          </div>

          {/* Play Log */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-md">
            <h3 className="text-xs font-black tracking-wider text-rose-300 uppercase">
              📜 場札・進行ログ
            </h3>
            <div className="mt-2.5 max-h-[250px] space-y-1.5 overflow-y-auto pr-1 text-xs">
              {logs.map((entry, idx) => (
                <div
                  key={`${idx}-${entry}`}
                  className="rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5 text-slate-200"
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default DaifugoGame;
