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
  SUIT_SYMBOL,
} from '@/components/cards/shared/cardUtils';

type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface EvaluatedHand {
  category: number; // 9=RoyalFlush, 8=StraightFlush, 7=FourKind, 6=FullHouse, 5=Flush, 4=Straight, 3=ThreeKind, 2=TwoPair, 1=OnePair, 0=HighCard
  nameJa: string;
  score: number; // lexicographical numeric score for tie-breaking
  bestFiveIds: string[];
}

interface HoldemPlayer {
  id: number;
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
}

const SMALL_BLIND = 10;
const BIG_BLIND = 20;

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
    // Pre-flop 2-card quick evaluation
    const r1 = toPokerRank(cards[0]?.rank ?? 2);
    const r2 = toPokerRank(cards[1]?.rank ?? 3);
    const high = Math.max(r1, r2);
    const low = Math.min(r1, r2);
    if (r1 === r2) {
      return {
        category: 1,
        nameJa: `ポケットペア (${formatRank(cards[0].rank)})`,
        score: 1 * 1e7 + high * 20,
        bestFiveIds: cards.map((c) => c.id),
      };
    }
    return {
      category: 0,
      nameJa: `${formatRank(cards[0].rank)}-${formatRank(cards[1].rank)} ハイ`,
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
  const remainingDeck = createStandardDeck(true, 1).filter((c) => !knownIds.has(c.id));
  const neededBoard = Math.max(0, 5 - communityCards.length);

  let equityPoints = 0;
  for (let sim = 0; sim < iterations; sim += 1) {
    // Partial Fisher-Yates draw
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

export default function TexasHoldemGame() {
  const [players, setPlayers] = useState<HoldemPlayer[]>(() => [
    {
      id: 0,
      name: 'あなた',
      styleName: 'プレイヤー',
      isHuman: true,
      chips: 1000,
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      folded: false,
      allIn: false,
      actedThisStreet: false,
      lastActionLabel: '待機中',
    },
    {
      id: 1,
      name: 'AI アレックス',
      styleName: 'タイト・アグレッシブ',
      isHuman: false,
      chips: 1000,
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      folded: false,
      allIn: false,
      actedThisStreet: false,
      lastActionLabel: '待機中',
    },
    {
      id: 2,
      name: 'AI ベラ',
      styleName: 'ルーズ・コーラー',
      isHuman: false,
      chips: 1000,
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      folded: false,
      allIn: false,
      actedThisStreet: false,
      lastActionLabel: '待機中',
    },
    {
      id: 3,
      name: 'AI カイ',
      styleName: 'ブラフ・バランサー',
      isHuman: false,
      chips: 1000,
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      folded: false,
      allIn: false,
      actedThisStreet: false,
      lastActionLabel: '待機中',
    },
  ]);

  const [dealerIdx, setDealerIdx] = useState<number>(0);
  const [deck, setDeck] = useState<CardItem[]>([]);
  const [communityCards, setCommunityCards] = useState<CardItem[]>([]);
  const [street, setStreet] = useState<Street>('preflop');
  const [pot, setPot] = useState<number>(0);
  const [highestBet, setHighestBet] = useState<number>(0);
  const [turnIdx, setTurnIdx] = useState<number>(0);
  const [handNumber, setHandNumber] = useState<number>(0);
  const [showEquityMeter, setShowEquityMeter] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [banner, setBanner] = useState<string>('ハンドを開始しています...');
  const [winnerIds, setWinnerIds] = useState<number[]>([]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [msg, ...prev.slice(0, 14)]);
  }, []);

  const startNewHand = useCallback(
    (currentPlayers: HoldemPlayer[], nextDealer: number, nextHandNum: number) => {
      const freshDeck = shuffleWithRng(createStandardDeck(true, 1));
      let cursor = 0;

      // Refill busted players so 4-player table stays active
      const prepared: HoldemPlayer[] = currentPlayers.map((p) => {
        const refilledChips = p.chips < BIG_BLIND * 2 ? 1000 : p.chips;
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
        };
      });

      const sbIdx = (nextDealer + 1) % 4;
      const bbIdx = (nextDealer + 2) % 4;
      const utgIdx = (nextDealer + 3) % 4;

      const sbAmt = Math.min(SMALL_BLIND, prepared[sbIdx].chips);
      prepared[sbIdx].chips -= sbAmt;
      prepared[sbIdx].currentBet = sbAmt;
      prepared[sbIdx].totalCommitted = sbAmt;
      prepared[sbIdx].lastActionLabel = `SB ${sbAmt}`;

      const bbAmt = Math.min(BIG_BLIND, prepared[bbIdx].chips);
      prepared[bbIdx].chips -= bbAmt;
      prepared[bbIdx].currentBet = bbAmt;
      prepared[bbIdx].totalCommitted = bbAmt;
      prepared[bbIdx].lastActionLabel = `BB ${bbAmt}`;

      setPlayers(prepared);
      setDealerIdx(nextDealer);
      setDeck(freshDeck.slice(cursor));
      setCommunityCards([]);
      setStreet('preflop');
      setPot(sbAmt + bbAmt);
      setHighestBet(bbAmt);
      setTurnIdx(utgIdx);
      setHandNumber(nextHandNum);
      setWinnerIds([]);
      setBanner(
        `ハンド #${nextHandNum} 開始（SB:${prepared[sbIdx].name} / BB:${prepared[bbIdx].name}）`
      );
      setLogs([
        `ハンド #${nextHandNum}: プリフロップ開始（SB ${sbAmt} / BB ${bbAmt}）`,
      ]);
      playCardSound('flip', soundOn);
    },
    [soundOn]
  );

  useEffect(() => {
    startNewHand(players, 0, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveShowdown = useCallback(
    (
      finalPlayers: HoldemPlayer[],
      finalBoard: CardItem[],
      finalPot: number
    ) => {
      const revealed = finalPlayers.map((p) => ({
        ...p,
        holeCards: p.holeCards.map((c) => ({ ...c, faceUp: true })),
      }));

      const contenders = revealed.filter((p) => !p.folded);
      let bestScore = -1;
      let winners: HoldemPlayer[] = [];
      let winningHandName = '';

      for (const p of contenders) {
        const evalRes = evaluateBest7CardHand([...p.holeCards, ...finalBoard]);
        if (evalRes.score > bestScore) {
          bestScore = evalRes.score;
          winners = [p];
          winningHandName = evalRes.nameJa;
        } else if (evalRes.score === bestScore) {
          winners.push(p);
        }
      }

      const share = Math.floor(finalPot / Math.max(1, winners.length));
      const winIdSet = new Set(winners.map((w) => w.id));
      const updated = revealed.map((p) =>
        winIdSet.has(p.id)
          ? {
              ...p,
              chips: p.chips + share,
              lastActionLabel: `🏆 勝者 (+${share})`,
            }
          : p
      );

      const winnerNames = winners.map((w) => w.name).join(' & ');
      setPlayers(updated);
      setCommunityCards(finalBoard);
      setStreet('showdown');
      setWinnerIds(Array.from(winIdSet));
      const msg =
        contenders.length === 1
          ? `🏆 全員フォールドにより ${winnerNames} がポット ${finalPot} を獲得しました！`
          : `🏆 ショーダウン！ ${winnerNames} が「${winningHandName}」でポット ${finalPot} を獲得！`;
      setBanner(msg);
      appendLog(msg);
      playCardSound('win', soundOn);
    },
    [appendLog, soundOn]
  );

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
        (p) => p.allIn || (p.actedThisStreet && p.currentBet === nextHighestBet)
      );

      if (everyoneMatched || canActPlayers.length === 0) {
        // Move to next street
        const workingDeck = [...deck];
        const resetPlayers = nextPlayers.map((p) => ({
          ...p,
          currentBet: 0,
          actedThisStreet: false,
        }));

        if (canActPlayers.length <= 1) {
          // Run out remaining community cards to showdown
          const needed = 5 - communityCards.length;
          const drawn = workingDeck.splice(0, needed).map((c) => ({ ...c, faceUp: true }));
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
          appendLog('--- フロップ（コミュニティカード3枚公開） ---');
        } else if (street === 'flop') {
          nextStreet = 'turn';
          nextBoard = [
            ...communityCards,
            ...workingDeck.splice(0, 1).map((c) => ({ ...c, faceUp: true })),
          ];
          appendLog('--- ターン（4枚目公開） ---');
        } else if (street === 'turn') {
          nextStreet = 'river';
          nextBoard = [
            ...communityCards,
            ...workingDeck.splice(0, 1).map((c) => ({ ...c, faceUp: true })),
          ];
          appendLog('--- リバー（5枚目公開） ---');
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
        setBanner(`${nextStreet.toUpperCase()} ラウンド → ${resetPlayers[firstActor].name}のアクション`);
        playCardSound('flip', soundOn);
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
      resolveShowdown,
      appendLog,
      soundOn,
    ]
  );

  const performAction = useCallback(
    (
      actorIdx: number,
      actionType: 'fold' | 'call' | 'raise',
      raiseTotalBet = 0
    ) => {
      if (street === 'showdown') return;
      const nextPlayers = players.map((p) => ({ ...p }));
      const actor = nextPlayers[actorIdx];
      const toCall = Math.max(0, highestBet - actor.currentBet);

      if (actionType === 'fold') {
        actor.folded = true;
        actor.actedThisStreet = true;
        actor.lastActionLabel = 'フォールド';
        appendLog(`${actor.name}: フォールド`);
        playCardSound('pass', soundOn);
        advanceStreetOrTurn(nextPlayers, actorIdx, pot, highestBet);
        return;
      }

      if (actionType === 'call') {
        const paid = Math.min(actor.chips, toCall);
        actor.chips -= paid;
        actor.currentBet += paid;
        actor.totalCommitted += paid;
        actor.actedThisStreet = true;
        if (actor.chips === 0) actor.allIn = true;
        const label =
          paid === 0
            ? 'チェック'
            : actor.allIn
              ? `オールイン (${paid})`
              : `コール (${paid})`;
        actor.lastActionLabel = label;
        appendLog(`${actor.name}: ${label}`);
        playCardSound('chip', soundOn);
        advanceStreetOrTurn(nextPlayers, actorIdx, pot + paid, highestBet);
        return;
      }

      // Raise
      const desiredTotalBet = Math.max(highestBet + BIG_BLIND, raiseTotalBet);
      const additionalNeeded = Math.max(toCall, desiredTotalBet - actor.currentBet);
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
      appendLog(`${actor.name}: ${label}`);
      playCardSound('chip', soundOn);
      advanceStreetOrTurn(nextPlayers, actorIdx, pot + actualPaid, newHigh);
    },
    [street, players, highestBet, appendLog, soundOn, advanceStreetOrTurn, pot]
  );

  // AI Action Effect
  useEffect(() => {
    if (street === 'showdown' || players.length === 0) return;
    const actor = players[turnIdx];
    if (!actor || actor.isHuman || actor.folded || actor.allIn) return;

    const timer = window.setTimeout(() => {
      const toCall = Math.max(0, highestBet - actor.currentBet);
      const evalHand = evaluateBest7CardHand([...actor.holeCards, ...communityCards]);

      // Normalize hand strength 0..100
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

      if (actor.styleName === 'タイト・アグレッシブ') {
        if (strengthScore >= 32 && actor.chips > toCall + BIG_BLIND) {
          performAction(turnIdx, 'raise', highestBet + BIG_BLIND * 2);
        } else if (toCall === 0 || strengthScore >= 22 || toCall <= BIG_BLIND) {
          performAction(turnIdx, 'call');
        } else {
          performAction(turnIdx, 'fold');
        }
      } else if (actor.styleName === 'ルーズ・コーラー') {
        if (strengthScore >= 48 && actor.chips > toCall + BIG_BLIND) {
          performAction(turnIdx, 'raise', highestBet + BIG_BLIND * 2);
        } else if (toCall <= actor.chips * 0.45 || strengthScore >= 20) {
          performAction(turnIdx, 'call');
        } else {
          performAction(turnIdx, 'fold');
        }
      } else {
        // ブラフ・バランサー
        const bluffRoll = (handNumber * 17 + turnIdx * 31 + communityCards.length * 13) % 10;
        if ((strengthScore >= 36 || bluffRoll === 0) && actor.chips > toCall + BIG_BLIND) {
          performAction(turnIdx, 'raise', highestBet + Math.max(BIG_BLIND * 2, Math.floor(pot * 0.5)));
        } else if (toCall === 0 || strengthScore >= 20 || toCall <= BIG_BLIND * 2) {
          performAction(turnIdx, 'call');
        } else {
          performAction(turnIdx, 'fold');
        }
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [street, players, turnIdx, highestBet, communityCards, handNumber, pot, performAction]);

  const human = players[0];
  const humanToCall = human ? Math.max(0, highestBet - human.currentBet) : 0;

  const humanHandAnalysis = useMemo(() => {
    if (!human || human.holeCards.length < 2) {
      return { handName: '—', equity: 0, potOdds: 0, bestIds: new Set<string>() };
    }
    const best = evaluateBest7CardHand([...human.holeCards, ...communityCards]);
    const activeOpps = players.slice(1).filter((p) => !p.folded).length;
    const equity = human.folded
      ? 0
      : estimateMonteCarloEquity(human.holeCards, communityCards, activeOpps, 120);
    const potOdds =
      humanToCall > 0 ? Math.round((humanToCall / (pot + humanToCall)) * 100) : 0;

    return {
      handName: best.nameJa,
      equity,
      potOdds,
      bestIds: new Set(best.bestFiveIds),
    };
  }, [human, communityCards, players, humanToCall, pot]);

  const isHumanTurn =
    street !== 'showdown' &&
    turnIdx === 0 &&
    Boolean(human && !human.folded && !human.allIn);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-950 to-black text-slate-100 select-none">
      {/* Header */}
      <header className="border-b border-emerald-400/20 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/games"
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                NO-LIMIT TEXAS HOLD&apos;EM POKER
              </p>
              <h2 className="text-sm font-black sm:text-lg">
                テキサスホールデム・ポーカー
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEquityMeter((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-black transition ${
                showEquityMeter
                  ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                  : 'border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              📈 リアルタイム勝率解析: {showEquityMeter ? 'ON' : 'OFF'}
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
        {/* Left Poker Table */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-400/25 bg-gradient-to-b from-emerald-900/50 via-emerald-950/70 to-slate-950 p-3 shadow-2xl sm:p-5">
          {/* AI Opponents Row */}
          <div className="grid grid-cols-3 gap-2">
            {players.slice(1).map((ai) => {
              const isTurn = street !== 'showdown' && turnIdx === ai.id;
              const isWinner = winnerIds.includes(ai.id);
              const aiBest =
                street === 'showdown' && !ai.folded
                  ? evaluateBest7CardHand([...ai.holeCards, ...communityCards]).nameJa
                  : null;

              return (
                <div
                  key={ai.id}
                  className={`flex flex-col justify-between rounded-xl border p-2.5 transition ${
                    isWinner
                      ? 'border-amber-400 bg-amber-400/20 ring-2 ring-amber-400'
                      : isTurn
                        ? 'border-cyan-400 bg-cyan-400/15'
                        : ai.folded
                          ? 'border-white/5 bg-black/25 opacity-55'
                          : 'border-white/10 bg-black/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-black text-white">
                        {ai.name}
                      </span>
                      {dealerIdx === ai.id && (
                        <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-black text-slate-950">
                          D
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">{ai.styleName}</p>
                    <p className="mt-1 font-mono text-xs font-black text-amber-300">
                      🪙 {ai.chips.toLocaleString()}
                    </p>
                  </div>

                  {/* AI Hole Cards */}
                  <div className="my-2 flex justify-center gap-1">
                    {ai.holeCards.map((c) => (
                      <PlayingCardView key={c.id} card={c} size="xs" />
                    ))}
                  </div>

                  <div className="text-center">
                    <span className="inline-block rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                      {aiBest ?? ai.lastActionLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Pot & Community Cards */}
          <div className="my-5 flex flex-col items-center justify-center rounded-2xl border border-emerald-300/25 bg-black/45 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black tracking-wider text-emerald-200 uppercase">
                STREET: {street.toUpperCase()}
              </span>
              <span className="rounded-full border border-amber-400/40 bg-amber-400/15 px-4 py-1 font-mono text-sm font-black text-amber-300">
                TOTAL POT: 🪙 {pot.toLocaleString()}
              </span>
            </div>

            <div className="flex min-h-[96px] flex-wrap items-center justify-center gap-1.5 sm:gap-2.5">
              {Array.from({ length: 5 }).map((_, idx) => {
                const card = communityCards[idx];
                if (!card) {
                  return (
                    <div
                      key={`empty-comm-${idx}`}
                      className="flex h-22 w-15 items-center justify-center rounded-xl border border-dashed border-emerald-400/30 bg-emerald-950/30 text-[10px] font-bold text-emerald-300/40 sm:h-26 sm:w-18"
                    >
                      BOARD {idx + 1}
                    </div>
                  );
                }
                return (
                  <PlayingCardView
                    key={card.id}
                    card={card}
                    size="md"
                    highlighted={humanHandAnalysis.bestIds.has(card.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* Status Banner */}
          <div className="mb-3 rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-center text-xs font-bold text-emerald-100 sm:text-sm">
            {banner}
          </div>

          {/* Human Player Zone & Action Controls */}
          {human && (
            <div className="rounded-2xl border border-white/15 bg-black/40 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-white">あなた</span>
                  {dealerIdx === 0 && (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-slate-950">
                      DEALER (D)
                    </span>
                  )}
                  <span className="rounded-lg bg-amber-400/15 px-2.5 py-1 font-mono text-xs font-black text-amber-300">
                    所持: 🪙 {human.chips.toLocaleString()}
                  </span>
                  <span className="rounded-lg bg-cyan-400/15 px-2.5 py-1 text-xs font-black text-cyan-200">
                    現在役: {humanHandAnalysis.handName}
                  </span>
                </div>

                {street === 'showdown' && (
                  <button
                    type="button"
                    onClick={() =>
                      startNewHand(players, (dealerIdx + 1) % 4, handNumber + 1)
                    }
                    className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-black text-slate-950 shadow-lg hover:bg-amber-300 sm:text-sm"
                  >
                    次のハンドを配る (#{handNumber + 1}) →
                  </button>
                )}
              </div>

              <div className="my-3 flex items-center justify-center gap-3">
                {human.holeCards.map((c) => (
                  <PlayingCardView
                    key={c.id}
                    card={c}
                    size="lg"
                    highlighted={humanHandAnalysis.bestIds.has(c.id)}
                  />
                ))}
              </div>

              {street !== 'showdown' && (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-6">
                  <button
                    type="button"
                    disabled={!isHumanTurn}
                    onClick={() => performAction(0, 'fold')}
                    className="rounded-xl border border-rose-400/40 bg-rose-500/20 py-2.5 text-xs font-black text-rose-200 hover:bg-rose-500/30 disabled:opacity-35"
                  >
                    フォールド
                  </button>
                  <button
                    type="button"
                    disabled={!isHumanTurn}
                    onClick={() => performAction(0, 'call')}
                    className="rounded-xl bg-emerald-400 py-2.5 text-xs font-black text-slate-950 shadow hover:bg-emerald-300 disabled:opacity-35"
                  >
                    {humanToCall === 0 ? 'チェック (0)' : `コール (${humanToCall})`}
                  </button>
                  <button
                    type="button"
                    disabled={!isHumanTurn || human.chips <= humanToCall}
                    onClick={() =>
                      performAction(0, 'raise', highestBet + BIG_BLIND * 2)
                    }
                    className="rounded-xl bg-cyan-400 py-2.5 text-xs font-black text-slate-950 shadow hover:bg-cyan-300 disabled:opacity-35"
                  >
                    レイズ 2xBB
                  </button>
                  <button
                    type="button"
                    disabled={!isHumanTurn || human.chips <= humanToCall}
                    onClick={() =>
                      performAction(
                        0,
                        'raise',
                        highestBet + Math.max(BIG_BLIND, Math.floor(pot * 0.5))
                      )
                    }
                    className="rounded-xl bg-amber-300 py-2.5 text-xs font-black text-slate-950 shadow hover:bg-amber-200 disabled:opacity-35"
                  >
                    1/2 POTレイズ
                  </button>
                  <button
                    type="button"
                    disabled={!isHumanTurn || human.chips <= humanToCall}
                    onClick={() =>
                      performAction(0, 'raise', highestBet + Math.max(BIG_BLIND, pot))
                    }
                    className="rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 shadow hover:bg-amber-300 disabled:opacity-35"
                  >
                    POTレイズ
                  </button>
                  <button
                    type="button"
                    disabled={!isHumanTurn || human.chips <= 0}
                    onClick={() =>
                      performAction(0, 'raise', human.currentBet + human.chips)
                    }
                    className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-xs font-black text-white shadow hover:brightness-110 disabled:opacity-35"
                  >
                    ALL-IN ({human.chips})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Live Equity & Pot Odds Meter + Action Log */}
        <aside className="flex flex-col gap-3">
          {showEquityMeter && (
            <div className="rounded-2xl border border-amber-400/30 bg-slate-900/90 p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-black tracking-wider text-amber-300">
                  📈 リアルタイム勝率・オッズ解析
                </span>
                <span className="rounded bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                  Monte Carlo
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">現在の推定勝率 (Equity)</span>
                  <span className="font-mono text-lg font-black text-emerald-300">
                    {humanHandAnalysis.equity}%
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all duration-300"
                    style={{ width: `${humanHandAnalysis.equity}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                  <span className="text-[10px] text-slate-400">必要勝率 (Pot Odds)</span>
                  <p className="mt-0.5 font-mono text-base font-black text-amber-300">
                    {humanToCall > 0 ? `${humanHandAnalysis.potOdds}%` : '0% (Check可)'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                  <span className="text-[10px] text-slate-400">期待値判定 (EV)</span>
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
                        ? '＋EV（コール以上有利）'
                        : '－EV（フォールド推奨）'}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                現在のホールカード（{human?.holeCards.map((c) => `${SUIT_SYMBOL[c.suit]}${formatRank(c.rank)}`).join(' ')}）とボードからモンテカルロ法で残りの組み合わせを高速試行し、勝率とポットオッズを比較しています。
              </p>
            </div>
          )}

          {/* Hand Ranking Quick Reference */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
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
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
            <h3 className="text-xs font-black tracking-wider text-cyan-300 uppercase">
              📜 アクション履歴
            </h3>
            <div className="mt-2 max-h-[200px] space-y-1 overflow-y-auto pr-1 text-xs">
              {logs.map((item, idx) => (
                <div
                  key={`${idx}-${item}`}
                  className="rounded border border-white/5 bg-black/30 px-2.5 py-1 text-slate-200"
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
