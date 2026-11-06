'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import {
  CardItem,
  createStandardDeck,
  formatRank,
  playCardSound,
  PlayingCardView,
  shuffleWithRng,
  SUIT_LABEL_JA,
  SUIT_SYMBOL,
} from '@/components/cards/shared/cardUtils';

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

interface PlayerState {
  id: number;
  name: string;
  persona: string;
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

export default function DaifugoGame() {
  const [rules, setRules] = useState<DaifugoRules>({
    revolution: true,
    eightCut: true,
    sequence: true,
    spade3Return: true,
    miyakoOchi: true,
  });

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

  const dealRound = useCallback(
    (nextRound: number, prevRanks?: SocialRank[]) => {
      const deck = create54CardDeck();
      const hands: CardItem[][] = [[], [], [], []];
      deck.forEach((card, idx) => {
        hands[idx % 4].push(card);
      });

      const personas = [
        { name: 'あなた', persona: 'プレイヤー', isHuman: true },
        { name: 'AI タクミ', persona: '堅実温存タイプ', isHuman: false },
        { name: 'AI レイナ', persona: '積極革命タイプ', isHuman: false },
        { name: 'AI ハヤト', persona: '速攻あがりタイプ', isHuman: false },
      ];

      const initialPlayers: PlayerState[] = personas.map((p, idx) => ({
        id: idx,
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
            // AI Daifugo picks 2 weakest cards from its initial hand BEFORE merging tributed cards
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
            // AI Fugo picks 1 weakest card from its initial hand BEFORE merging tributed card
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
    []
  );

  useEffect(() => {
    dealRound(1);
  }, [dealRound]);

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

      // Check if actor finished hand
      if (actor.hand.length === 0) {
        const usedOrders = new Set(
          updatedPlayers.map((p) => p.finishedOrder).filter((n): n is number => n !== null)
        );
        const myOrder = [1, 2, 3, 4].find((ord) => !usedOrders.has(ord)) ?? 4;
        actor.finishedOrder = myOrder;
        addLog(`🎉 ${actor.name} が ${myOrder}位であがりました！`);

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

      const activeUnpassed = updatedPlayers.filter(
        (p) => p.finishedOrder === null && !p.passed
      );

      if (activeUnpassed.length === 0 || (activeUnpassed.length === 1 && tablePlay && activeUnpassed[0].id === tablePlay.playerId)) {
        // Table clears!
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
    }, 650);

    return () => window.clearTimeout(timer);
  }, [phase, players, turnIndex, tablePlay, rules, isRevolution, executePass, executePlay]);

  const humanPlayer = players[0];
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-950 via-slate-950 to-black text-slate-100 select-none">
      {/* Header */}
      <header className="border-b border-rose-400/20 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/games"
              className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-200 transition hover:border-rose-300 hover:bg-rose-500/20"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                JAPANESE CLASSIC MILLIONAIRE
              </p>
              <h2 className="text-sm font-black sm:text-lg">
                大富豪（大貧民・AI 4人対戦）
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-black text-amber-200">
              第{roundNumber}ラウンド {isRevolution ? '【⚡革命中：3最強】' : '【通常：2最強】'}
            </span>
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

      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_310px]">
        {/* Main Table */}
        <div className="flex flex-col justify-between rounded-2xl border border-rose-400/25 bg-gradient-to-b from-rose-950/45 via-slate-900/80 to-slate-950 p-3 shadow-2xl sm:p-5">
          {/* 3 AI Opponents Row */}
          <div className="grid grid-cols-3 gap-2">
            {players.slice(1).map((ai) => {
              const isTurn = phase === 'playing' && turnIndex === ai.id;
              return (
                <div
                  key={ai.id}
                  className={`rounded-xl border p-2.5 transition ${
                    isTurn
                      ? 'border-amber-400 bg-amber-400/15 shadow-[0_0_16px_rgba(251,191,36,0.25)]'
                      : 'border-white/10 bg-black/35'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-black text-white">{ai.name}</span>
                    <span className="rounded bg-rose-500/25 px-1.5 py-0.5 text-[10px] font-bold text-rose-200">
                      {ai.socialRank}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">{ai.persona}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    {ai.finishedOrder !== null ? (
                      <span className="font-black text-amber-300">
                        🏆 {ai.finishedOrder}位あがり
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-emerald-300">
                        残り {ai.hand.length}枚
                      </span>
                    )}
                    {ai.passed && ai.finishedOrder === null && (
                      <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                        PASS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Field / Table Play */}
          <div className="my-5 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-4 sm:min-h-[195px]">
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span
                className={`rounded-full px-3 py-0.5 font-black ${
                  isRevolution
                    ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                    : 'bg-emerald-500/20 text-emerald-200'
                }`}
              >
                {isRevolution ? '⚡ 革命状態（3が最強 / 2が最弱）' : '通常状態（2・Aが強く 3が最弱）'}
              </span>
            </div>

            {tablePlay ? (
              <div className="flex flex-col items-center">
                <p className="mb-2 text-xs font-bold text-amber-200">
                  場のカード（出した人: {tablePlay.playerName}）
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {tablePlay.cards.map((c) => (
                    <PlayingCardView key={c.id} card={c} size="md" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-slate-400">
                <p className="text-sm font-black text-slate-300">場にカードはありません（親の自由出し）</p>
                <p className="mt-1 text-xs">単騎・ペア・3枚組・4枚革命・同スート3枚以上の階段を出せます</p>
              </div>
            )}
          </div>

          {/* Status Banner */}
          <div className="mb-3 rounded-xl border border-amber-400/25 bg-black/50 px-3.5 py-2 text-center text-xs font-bold text-amber-100 sm:text-sm">
            {banner}
          </div>

          {/* Dedicated Round 2+ Card Exchange Panel */}
          {phase === 'exchange' && exchangeInfo && isHumanLowerRank && (
            <div className="mb-3 rounded-2xl border border-rose-400/40 bg-rose-950/60 p-3.5 shadow-lg">
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
            <div className="mb-3 rounded-2xl border border-amber-400/40 bg-amber-950/40 p-3.5 shadow-lg">
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

          {/* Human Player Hand & Action Bar */}
          {humanPlayer && (
            <div className="rounded-2xl border border-white/15 bg-black/35 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">あなたの手札</span>
                  <span className="rounded bg-amber-400/20 px-2 py-0.5 text-xs font-black text-amber-300">
                    階級: {humanPlayer.socialRank}
                  </span>
                  <span className="text-xs text-slate-400">
                    {phase === 'exchange'
                      ? isHumanUpperRank
                        ? `（渡す不要なカードをあと${Math.max(0, exchangeRequiredCount - selectedCards.length)}枚選択）`
                        : '（下位階級のためカードの選択はできません・自動交換済み）'
                      : phase === 'roundEnd'
                        ? '（ラウンド終了・カード選択不可）'
                        : turnIndex === 0 && humanPlayer.finishedOrder === null
                          ? '（緑枠＝現在場に出せるカード）'
                          : '（相手の手番中・カード選択不可）'}
                  </span>
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
                          players.map((p) => p.socialRank)
                        )
                      }
                      className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow hover:bg-amber-300 sm:text-sm"
                    >
                      階級を引き継いで第{roundNumber + 1}ラウンドへ →
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
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
                      className="rounded-xl bg-emerald-400 px-4 py-1.5 text-xs font-black text-slate-950 shadow transition hover:bg-emerald-300 disabled:opacity-35 sm:text-sm"
                    >
                      カードを出す ({selectedCards.length}枚)
                    </button>
                  </div>
                )}
              </div>

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

        {/* Right Sidebar: Local Rules Toggles & Play Log */}
        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl border border-rose-400/25 bg-slate-900/90 p-4">
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
              onClick={() => dealRound(1)}
              className="mt-3 w-full rounded-xl border border-white/15 bg-white/10 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              🔄 第1ラウンドから新規リセット
            </button>
          </div>

          {/* Play Log */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
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
