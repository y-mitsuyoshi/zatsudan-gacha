'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import {
  CardItem,
  createStandardDeck,
  playCardSound,
  PlayingCardView,
  shuffleWithRng,
  useCardTableBgm,
} from '@/components/cards/shared/cardUtils';

const SHOE_DECKS = 6;
const RESHUFFLE_THRESHOLD = 65;

interface PlayerHand {
  id: string;
  cards: CardItem[];
  bet: number;
  status: 'playing' | 'stood' | 'busted' | 'blackjack' | 'surrendered' | 'doubled';
  outcome?: 'win' | 'lose' | 'push' | 'blackjack' | 'surrender';
  payout?: number;
}

interface HistoryEntry {
  id: number;
  dealerTotal: string;
  handSummaries: string[];
  netChange: number;
}

export function evaluateBlackjackHand(cards: CardItem[]): {
  total: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
   isPair: boolean;
} {
  let sum = 0;
  let aces = 0;
  for (const c of cards) {
    if (!c.faceUp) continue;
    if (c.rank === 1) {
      aces += 1;
      sum += 11;
    } else if (c.rank >= 10) {
      sum += 10;
    } else {
      sum += c.rank;
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces -= 1;
  }
  const faceUpCards = cards.filter((c) => c.faceUp);
  const isBlackjack = faceUpCards.length === 2 && sum === 21;
  const bjVal = (r: number) => (r >= 10 ? 10 : r);
  const isPair =
    faceUpCards.length === 2 && bjVal(faceUpCards[0].rank) === bjVal(faceUpCards[1].rank);

  return {
    total: sum,
    isSoft: aces > 0 && sum <= 21,
    isBlackjack,
    isBust: sum > 21,
    isPair,
  };
}

function createSixDeckShoe(): CardItem[] {
  const all: CardItem[] = [];
  for (let d = 0; d < SHOE_DECKS; d += 1) {
    all.push(...createStandardDeck(true, d + 1));
  }
  return shuffleWithRng(all);
}

function getHiLoValue(rank: number): number {
  if (rank >= 2 && rank <= 6) return 1;
  if (rank >= 7 && rank <= 9) return 0;
  return -1; // 10, J, Q, K, A
}

function getBasicStrategyRecommendation(
  hand: PlayerHand,
  dealerUpCard: CardItem | undefined,
  canSplit: boolean,
  canDouble: boolean,
  canSurrender: boolean
): {
  action: string;
  reason: string;
  badgeColor: string;
} {
  if (!dealerUpCard) {
    return {
      action: 'ベットしてディール',
      reason: 'チップを賭けて「DEAL（配る）」を押してください。',
      badgeColor: 'bg-emerald-500 text-slate-950',
    };
  }

  const evalRes = evaluateBlackjackHand(hand.cards);
  const dVal = dealerUpCard.rank === 1 ? 11 : Math.min(10, dealerUpCard.rank);

  if (evalRes.isBlackjack) {
    return {
      action: 'ブラックジャック！',
      reason: 'ナチュラル21達成！ディーラーがBJでなければ1.5倍配当が確定します。',
      badgeColor: 'bg-amber-400 text-slate-950',
    };
  }

  // Surrender check on hard 16 vs 9,10,A or hard 15 vs 10
  if (canSurrender && !evalRes.isSoft && !evalRes.isPair) {
    if (evalRes.total === 16 && (dVal === 9 || dVal === 10 || dVal === 11)) {
      return {
        action: 'サレンダー (Surrender)',
        reason: `ハード16 対 ディーラーの強いアップカード(${dVal === 11 ? 'A' : dVal})は期待値マイナスが大きく、半額返却のサレンダーが最善です。`,
        badgeColor: 'bg-rose-400 text-slate-950',
      };
    }
    if (evalRes.total === 15 && dVal === 10) {
      return {
        action: 'サレンダー (Surrender)',
        reason: 'ハード15 対 ディーラー10はサレンダーで損失を-0.5unitに抑えるのが数学的最適解です。',
        badgeColor: 'bg-rose-400 text-slate-950',
      };
    }
  }

  // Pair splitting strategy
  if (canSplit && evalRes.isPair) {
    const pairRank = hand.cards[0].rank === 1 ? 11 : Math.min(10, hand.cards[0].rank);
    if (pairRank === 11 || pairRank === 8) {
      return {
        action: 'スプリット (Split)',
        reason: 'Aのペアと8のペアはディーラーのカードに関わらず常にスプリットが鉄則です。',
        badgeColor: 'bg-purple-400 text-slate-950',
      };
    }
    if (pairRank === 9 && dVal !== 7 && dVal !== 10 && dVal !== 11) {
      return {
        action: 'スプリット (Split)',
        reason: '9のペアはディーラーが7・10・A以外のときはスプリットして有利を広げます。',
        badgeColor: 'bg-purple-400 text-slate-950',
      };
    }
    if ((pairRank === 2 || pairRank === 3 || pairRank === 7) && dVal >= 2 && dVal <= 7) {
      return {
        action: 'スプリット (Split)',
        reason: `ディーラーのアップカード(${dVal})が弱いため、スプリットして攻めるのが期待値最大です。`,
        badgeColor: 'bg-purple-400 text-slate-950',
      };
    }
    if (pairRank === 6 && dVal >= 2 && dVal <= 6) {
      return {
        action: 'スプリット (Split)',
        reason: '6のペアはディーラーが2〜6のバーストしやすいカードのときスプリットします。',
        badgeColor: 'bg-purple-400 text-slate-950',
      };
    }
  }

  // Soft Totals
  if (evalRes.isSoft) {
    if (evalRes.total >= 19) {
      return {
        action: 'スタンド (Stand)',
        reason: `ソフト${evalRes.total}は十分に強い完成手のためスタンドが最善です。`,
        badgeColor: 'bg-amber-400 text-slate-950',
      };
    }
    if (evalRes.total === 18) {
      if (canDouble && dVal >= 3 && dVal <= 6) {
        return {
          action: 'ダブルダウン (Double)',
          reason: 'ソフト18 対 ディーラー3〜6はバーストの危険がなくダブルダウンで利益を最大化できます。',
          badgeColor: 'bg-cyan-400 text-slate-950',
        };
      }
      if (dVal >= 9 || dVal === 11) {
        return {
          action: 'ヒット (Hit)',
          reason: 'ディーラーが9・10・Aのとき、18では負け越しやすいためヒットして19以上を狙います。',
          badgeColor: 'bg-emerald-400 text-slate-950',
        };
      }
      return {
        action: 'スタンド (Stand)',
        reason: 'ソフト18 対 ディーラー2・7・8はスタンドで手堅く勝ち越せます。',
        badgeColor: 'bg-amber-400 text-slate-950',
      };
    }
    if (canDouble && dVal >= 4 && dVal <= 6) {
      return {
        action: 'ダブルダウン (Double)',
        reason: `ソフト${evalRes.total} 対 ディーラーのローカード(${dVal})は1枚引いてもバーストしないためダブルが有利です。`,
        badgeColor: 'bg-cyan-400 text-slate-950',
      };
    }
    return {
      action: 'ヒット (Hit)',
      reason: `ソフト${evalRes.total}は1枚引いても絶対にバーストしないためヒットして手を伸ばします。`,
      badgeColor: 'bg-emerald-400 text-slate-950',
    };
  }

  // Hard Totals
  if (evalRes.total >= 17) {
    return {
      action: 'スタンド (Stand)',
      reason: `ハード${evalRes.total}以上でのヒットはバースト確率が極めて高いため必ずスタンドします。`,
      badgeColor: 'bg-amber-400 text-slate-950',
    };
  }
  if (evalRes.total >= 13 && evalRes.total <= 16) {
    if (dVal >= 2 && dVal <= 6) {
      return {
        action: 'スタンド (Stand)',
        reason: `ディーラーのアップカード(${dVal})はバースト率が高いため、無理に引かずスタンドが定石です。`,
        badgeColor: 'bg-amber-400 text-slate-950',
      };
    }
    return {
      action: 'ヒット (Hit)',
      reason: `ディーラーのアップカード(${dVal === 11 ? 'A' : dVal})が強く、このままでは勝率が低いためヒットします。`,
      badgeColor: 'bg-emerald-400 text-slate-950',
    };
  }
  if (evalRes.total === 12) {
    if (dVal >= 4 && dVal <= 6) {
      return {
        action: 'スタンド (Stand)',
        reason: 'ハード12 対 ディーラー4〜6はディーラーのバースト待ちスタンドが期待値プラスです。',
        badgeColor: 'bg-amber-400 text-slate-950',
      };
    }
    return {
      action: 'ヒット (Hit)',
      reason: 'ハード12 対 2・3または7〜Aは10系以外ならバーストしないためヒットが最善です。',
      badgeColor: 'bg-emerald-400 text-slate-950',
    };
  }
  if (evalRes.total === 11) {
    if (canDouble && dVal !== 11) {
      return {
        action: 'ダブルダウン (Double)',
        reason: '合計11は10点札を引けば21になる最強のチャンス手！ダブルダウンが圧倒的に有利です。',
        badgeColor: 'bg-cyan-400 text-slate-950',
      };
    }
    return {
      action: 'ヒット (Hit)',
      reason: '合計11はバースト率0%で21を狙えるため積極的にヒットします。',
      badgeColor: 'bg-emerald-400 text-slate-950',
    };
  }
  if (evalRes.total === 10) {
    if (canDouble && dVal >= 2 && dVal <= 9) {
      return {
        action: 'ダブルダウン (Double)',
        reason: '合計10 対 ディーラー2〜9は20を作れる確率が高くダブルダウンが定石です。',
        badgeColor: 'bg-cyan-400 text-slate-950',
      };
    }
    return {
      action: 'ヒット (Hit)',
      reason: 'バーストの危険がないためヒットして強い役を作ります。',
      badgeColor: 'bg-emerald-400 text-slate-950',
    };
  }
  if (evalRes.total === 9 && canDouble && dVal >= 3 && dVal <= 6) {
    return {
      action: 'ダブルダウン (Double)',
      reason: '合計9 対 ディーラー3〜6はダブルダウンで期待値を伸ばせます。',
      badgeColor: 'bg-cyan-400 text-slate-950',
    };
  }

  return {
    action: 'ヒット (Hit)',
    reason: `合計${evalRes.total}はバースト率0%のためヒットして17以上を目指します。`,
    badgeColor: 'bg-emerald-400 text-slate-950',
  };
}

export default function BlackjackGame() {
  const [shoe, setShoe] = useState<CardItem[]>(() => createSixDeckShoe());
  const [runningCount, setRunningCount] = useState<number>(0);
  const [chips, setChips] = useState<number>(1000);
  const [betInput, setBetInput] = useState<number>(100);
  const [phase, setPhase] = useState<'betting' | 'insurance' | 'player' | 'settled'>('betting');
  const [dealerCards, setDealerCards] = useState<CardItem[]>([]);
  const [playerHands, setPlayerHands] = useState<PlayerHand[]>([]);
  const [activeHandIndex, setActiveHandIndex] = useState<number>(0);
  const [insuranceBet, setInsuranceBet] = useState<number>(0);
  const [showStrategyNav, setShowStrategyNav] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);
  useCardTableBgm(bgmOn, 'jazz');
  const [bannerText, setBannerText] = useState<string>(
    'ベット額を決めて「DEAL（カードを配る）」をタップしてください'
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, pushes: 0, blackjacks: 0 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('zatsudan_blackjack_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as {
          chips?: number;
          stats?: { wins: number; losses: number; pushes: number; blackjacks: number };
        };
        if (typeof parsed.chips === 'number' && parsed.chips > 0) setChips(parsed.chips);
        if (parsed.stats) setStats(parsed.stats);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveProgress = useCallback(
    (nextChips: number, nextStats: typeof stats) => {
      try {
        localStorage.setItem(
          'zatsudan_blackjack_v1',
          JSON.stringify({ chips: nextChips, stats: nextStats })
        );
      } catch {
        // ignore
      }
    },
    []
  );

  const activeHand = playerHands[activeHandIndex] as PlayerHand | undefined;

  // Live Bust Probability & Shoe True Count calculation
  const liveAnalytics = useMemo(() => {
    const decksRemaining = Math.max(0.5, shoe.length / 52);
    const trueCount = Number((runningCount / decksRemaining).toFixed(1));
    const highCardsLeft = shoe.filter((c) => c.rank === 1 || c.rank >= 10).length;
    const highCardRatio = shoe.length > 0 ? Math.round((highCardsLeft / shoe.length) * 100) : 38;

    let bustProb = 0;
    if (activeHand && phase === 'player') {
      const evalRes = evaluateBlackjackHand(activeHand.cards);
      if (!evalRes.isSoft && evalRes.total >= 12 && shoe.length > 0) {
        const maxSafeRank = 21 - evalRes.total;
        const bustingCards = shoe.filter((c) => {
          const val = c.rank === 1 ? 1 : Math.min(10, c.rank);
          return val > maxSafeRank;
        }).length;
        bustProb = Math.round((bustingCards / shoe.length) * 100);
      }
    }
    return {
      trueCount,
      highCardRatio,
      bustProb,
      cardsRemaining: shoe.length,
    };
  }, [shoe, runningCount, activeHand, phase]);

  const settleAllHands = useCallback(
    (
      currentShoe: CardItem[],
      currentDealer: CardItem[],
      handsToSettle: PlayerHand[],
      insBet: number,
      currentChips: number,
      currentCount: number
    ) => {
      const workingShoe = [...currentShoe];
      let nextCount = currentCount;

      // Reveal dealer hole card
      const revealedDealer = currentDealer.map((c) => {
        if (!c.faceUp) {
          nextCount += getHiLoValue(c.rank);
        }
        return { ...c, faceUp: true };
      });

      const anyLiveHand = handsToSettle.some(
        (h) => h.status !== 'busted' && h.status !== 'surrendered' && h.status !== 'blackjack'
      );

      // Dealer draws until 17+ (stands on all 17s)
      while (anyLiveHand) {
        const dEval = evaluateBlackjackHand(revealedDealer);
        if (dEval.total >= 17) break;
        const nextCard = workingShoe.shift();
        if (!nextCard) break;
        const faceUpCard = { ...nextCard, faceUp: true };
        nextCount += getHiLoValue(faceUpCard.rank);
        revealedDealer.push(faceUpCard);
      }

      const dFinal = evaluateBlackjackHand(revealedDealer);
      let chipDelta = 0;

      // Insurance payout if dealer has Blackjack
      if (insBet > 0 && dFinal.isBlackjack) {
        chipDelta += insBet * 3; // returns insBet + 2:1 profit
      }

      let winInc = 0;
      let lossInc = 0;
      let pushInc = 0;
      let bjInc = 0;

      const settledHands: PlayerHand[] = handsToSettle.map((h) => {
        const pEval = evaluateBlackjackHand(h.cards);
        if (h.status === 'surrendered') {
          const returned = Math.floor(h.bet / 2);
          chipDelta += returned;
          lossInc += 1;
          return { ...h, outcome: 'surrender', payout: returned };
        }
        if (pEval.isBust) {
          lossInc += 1;
          return { ...h, outcome: 'lose', payout: 0 };
        }
        if (pEval.isBlackjack && handsToSettle.length === 1) {
          if (dFinal.isBlackjack) {
            chipDelta += h.bet;
            pushInc += 1;
            return { ...h, outcome: 'push', payout: h.bet };
          }
          const bjReturn = Math.floor(h.bet * 2.5);
          chipDelta += bjReturn;
          winInc += 1;
          bjInc += 1;
          return { ...h, outcome: 'blackjack', payout: bjReturn };
        }
        if (dFinal.isBlackjack) {
          lossInc += 1;
          return { ...h, outcome: 'lose', payout: 0 };
        }
        if (dFinal.isBust || pEval.total > dFinal.total) {
          const winReturn = h.bet * 2;
          chipDelta += winReturn;
          winInc += 1;
          return { ...h, outcome: 'win', payout: winReturn };
        }
        if (pEval.total === dFinal.total) {
          chipDelta += h.bet;
          pushInc += 1;
          return { ...h, outcome: 'push', payout: h.bet };
        }
        lossInc += 1;
        return { ...h, outcome: 'lose', payout: 0 };
      });

      const totalStaked =
        handsToSettle.reduce((acc, h) => acc + h.bet, 0) + insBet;
      const netProfit = chipDelta - totalStaked;
      const updatedChips = currentChips + chipDelta;

      const nextStats = {
        wins: stats.wins + winInc,
        losses: stats.losses + lossInc,
        pushes: stats.pushes + pushInc,
        blackjacks: stats.blackjacks + bjInc,
      };

      setShoe(workingShoe);
      setRunningCount(nextCount);
      setDealerCards(revealedDealer);
      setPlayerHands(settledHands);
      setChips(updatedChips);
      if (updatedChips >= 10) {
        setBetInput((prev) => Math.min(prev, updatedChips));
      }
      setStats(nextStats);
      setPhase('settled');
      saveProgress(updatedChips, nextStats);

      const summaryLabels = settledHands.map((h) => {
        const ev = evaluateBlackjackHand(h.cards);
        const tag =
          h.outcome === 'blackjack'
            ? 'BJ勝'
            : h.outcome === 'win'
              ? '勝ち'
              : h.outcome === 'push'
                ? '引分'
                : h.outcome === 'surrender'
                  ? '降参'
                  : '負け';
        return `${ev.total}(${tag})`;
      });

      setHistory((prev) => [
        {
          id: Date.now(),
          dealerTotal: dFinal.isBlackjack ? 'BJ(21)' : dFinal.isBust ? `BUST(${dFinal.total})` : String(dFinal.total),
          handSummaries: summaryLabels,
          netChange: netProfit,
        },
        ...prev.slice(0, 7),
      ]);

      if (netProfit > 0) {
        playCardSound('win', soundOn);
        setBannerText(`🎉 勝利！ +${netProfit.toLocaleString()} チップ獲得しました！`);
      } else if (netProfit === 0) {
        playCardSound('card', soundOn);
        setBannerText('🤝 プッシュ（引き分け）！ ベット額がそのまま返却されました。');
      } else {
        playCardSound('error', soundOn);
        setBannerText(
          `ディーラー ${dFinal.isBust ? 'バースト' : dFinal.total} / 収支 ${netProfit.toLocaleString()} チップ`
        );
      }
    },
    [stats, saveProgress, soundOn]
  );

  const handleDeal = useCallback(() => {
    const validBet = Math.min(chips, Math.max(10, betInput));
    if (validBet <= 0 || chips < 10) return;

    let workingShoe = [...shoe];
    let nextCount = runningCount;
    if (workingShoe.length < RESHUFFLE_THRESHOLD) {
      workingShoe = createSixDeckShoe();
      nextCount = 0;
    }

    const p1 = { ...workingShoe.shift()!, faceUp: true };
    const d1 = { ...workingShoe.shift()!, faceUp: true };
    const p2 = { ...workingShoe.shift()!, faceUp: true };
    const d2 = { ...workingShoe.shift()!, faceUp: false }; // Hole card face down

    nextCount += getHiLoValue(p1.rank) + getHiLoValue(d1.rank) + getHiLoValue(p2.rank);

    const initialHand: PlayerHand = {
      id: 'hand-0',
      cards: [p1, p2],
      bet: validBet,
      status: 'playing',
    };
    const pEval = evaluateBlackjackHand(initialHand.cards);
    if (pEval.isBlackjack) {
      initialHand.status = 'blackjack';
    }

    const remainingChips = chips - validBet;
    setChips(remainingChips);
    setShoe(workingShoe);
    setRunningCount(nextCount);
    setDealerCards([d1, d2]);
    setPlayerHands([initialHand]);
    setActiveHandIndex(0);
    setInsuranceBet(0);
    playCardSound('card', soundOn);

    // If dealer upcard is Ace, offer Insurance
    if (d1.rank === 1 && !pEval.isBlackjack) {
      setPhase('insurance');
      setBannerText('ディーラーの表カードがAです！インシュランス（保険ベット）をかけますか？');
      return;
    }

    // Dealer 10-value upcard peek for natural Blackjack
    const dealerHasTenUp = d1.rank >= 10;
    const dealerNaturalBj = dealerHasTenUp && d2.rank === 1;

    if (pEval.isBlackjack || dealerNaturalBj) {
      settleAllHands(workingShoe, [d1, d2], [initialHand], 0, remainingChips, nextCount);
      return;
    }

    setPhase('player');
    setBannerText('アクションを選択してください（ナビ推奨手を参考にできます）');
  }, [chips, betInput, shoe, runningCount, soundOn, settleAllHands]);

  const handleInsuranceDecision = useCallback(
    (buyInsurance: boolean) => {
      if (phase !== 'insurance' || playerHands.length === 0) return;
      const hand = playerHands[0];
      const insAmount = buyInsurance ? Math.floor(hand.bet / 2) : 0;
      const nextChips = chips - insAmount;
      setInsuranceBet(insAmount);
      setChips(nextChips);

      // Peek dealer blackjack
      const dPeekEval = evaluateBlackjackHand(
        dealerCards.map((c) => ({ ...c, faceUp: true }))
      );
      if (dPeekEval.isBlackjack) {
        settleAllHands(shoe, dealerCards, playerHands, insAmount, nextChips, runningCount);
        return;
      }

      setPhase('player');
      setBannerText(
        buyInsurance
          ? 'インシュランスを掛けました。ディーラーはBJではありません。手番を続行します。'
          : 'ディーラーはブラックジャックではありません。アクションを選択してください。'
      );
      playCardSound('chip', soundOn);
    },
    [phase, playerHands, chips, dealerCards, settleAllHands, shoe, runningCount, soundOn]
  );

  const advanceOrSettle = useCallback(
    (
      nextShoe: CardItem[],
      nextHands: PlayerHand[],
      currentIdx: number,
      currentChips: number,
      nextCount: number
    ) => {
      if (currentIdx + 1 < nextHands.length) {
        setActiveHandIndex(currentIdx + 1);
        setPlayerHands(nextHands);
        setShoe(nextShoe);
        setRunningCount(nextCount);
        setChips(currentChips);
        setBannerText(`スプリット ハンド #${currentIdx + 2} のアクションを選択してください`);
        return;
      }
      settleAllHands(nextShoe, dealerCards, nextHands, insuranceBet, currentChips, nextCount);
    },
    [dealerCards, insuranceBet, settleAllHands]
  );

  const handleHit = useCallback(() => {
    if (phase !== 'player' || !activeHand) return;
    const workingShoe = [...shoe];
    const drawn = workingShoe.shift();
    if (!drawn) return;
    const card = { ...drawn, faceUp: true };
    const nextCount = runningCount + getHiLoValue(card.rank);

    const updatedCards = [...activeHand.cards, card];
    const evalRes = evaluateBlackjackHand(updatedCards);

    const updatedHand: PlayerHand = {
      ...activeHand,
      cards: updatedCards,
      status: evalRes.isBust ? 'busted' : evalRes.total === 21 ? 'stood' : 'playing',
    };

    const nextHands = playerHands.map((h, i) => (i === activeHandIndex ? updatedHand : h));
    playCardSound('card', soundOn);

    if (updatedHand.status !== 'playing') {
      advanceOrSettle(workingShoe, nextHands, activeHandIndex, chips, nextCount);
    } else {
      setShoe(workingShoe);
      setRunningCount(nextCount);
      setPlayerHands(nextHands);
    }
  }, [
    phase,
    activeHand,
    shoe,
    runningCount,
    playerHands,
    activeHandIndex,
    soundOn,
    advanceOrSettle,
    chips,
  ]);

  const handleStand = useCallback(() => {
    if (phase !== 'player' || !activeHand) return;
    const updatedHand: PlayerHand = { ...activeHand, status: 'stood' };
    const nextHands = playerHands.map((h, i) => (i === activeHandIndex ? updatedHand : h));
    playCardSound('card', soundOn);
    advanceOrSettle(shoe, nextHands, activeHandIndex, chips, runningCount);
  }, [phase, activeHand, playerHands, activeHandIndex, soundOn, advanceOrSettle, shoe, chips, runningCount]);

  const handleDoubleDown = useCallback(() => {
    if (phase !== 'player' || !activeHand) return;
    if (activeHand.cards.length !== 2 || chips < activeHand.bet) return;

    const workingShoe = [...shoe];
    const drawn = workingShoe.shift();
    if (!drawn) return;
    const card = { ...drawn, faceUp: true };
    const nextCount = runningCount + getHiLoValue(card.rank);

    const nextChips = chips - activeHand.bet;
    const updatedCards = [...activeHand.cards, card];
    const evalRes = evaluateBlackjackHand(updatedCards);

    const updatedHand: PlayerHand = {
      ...activeHand,
      cards: updatedCards,
      bet: activeHand.bet * 2,
      status: evalRes.isBust ? 'busted' : 'doubled',
    };

    const nextHands = playerHands.map((h, i) => (i === activeHandIndex ? updatedHand : h));
    playCardSound('chip', soundOn);
    advanceOrSettle(workingShoe, nextHands, activeHandIndex, nextChips, nextCount);
  }, [
    phase,
    activeHand,
    chips,
    shoe,
    runningCount,
    playerHands,
    activeHandIndex,
    soundOn,
    advanceOrSettle,
  ]);

  const handleSplit = useCallback(() => {
    if (phase !== 'player' || !activeHand) return;
    const evalRes = evaluateBlackjackHand(activeHand.cards);
    if (!evalRes.isPair || playerHands.length >= 2 || chips < activeHand.bet) return;

    const workingShoe = [...shoe];
    const c1 = { ...workingShoe.shift()!, faceUp: true };
    const c2 = { ...workingShoe.shift()!, faceUp: true };
    const nextCount = runningCount + getHiLoValue(c1.rank) + getHiLoValue(c2.rank);
    const nextChips = chips - activeHand.bet;

    const handA: PlayerHand = {
      id: 'hand-0',
      cards: [activeHand.cards[0], c1],
      bet: activeHand.bet,
      status: 'playing',
    };
    const handB: PlayerHand = {
      id: 'hand-1',
      cards: [activeHand.cards[1], c2],
      bet: activeHand.bet,
      status: 'playing',
    };

    setShoe(workingShoe);
    setRunningCount(nextCount);
    setChips(nextChips);
    setPlayerHands([handA, handB]);
    setActiveHandIndex(0);
    setBannerText('スプリットしました！まずハンド #1 をプレイしてください。');
    playCardSound('chip', soundOn);
  }, [phase, activeHand, playerHands.length, chips, shoe, runningCount, soundOn]);

  const handleSurrender = useCallback(() => {
    if (phase !== 'player' || !activeHand) return;
    if (activeHand.cards.length !== 2 || playerHands.length > 1) return;

    const updatedHand: PlayerHand = {
      ...activeHand,
      status: 'surrendered',
    };
    const nextHands = [updatedHand];
    playCardSound('pass', soundOn);
    advanceOrSettle(shoe, nextHands, activeHandIndex, chips, runningCount);
  }, [phase, activeHand, playerHands.length, soundOn, advanceOrSettle, shoe, activeHandIndex, chips, runningCount]);

  const canDouble =
    phase === 'player' &&
    Boolean(activeHand && activeHand.cards.length === 2 && chips >= activeHand.bet);
  const canSplit =
    phase === 'player' &&
    Boolean(
      activeHand &&
        evaluateBlackjackHand(activeHand.cards).isPair &&
        playerHands.length === 1 &&
        chips >= activeHand.bet
    );
  const canSurrender =
    phase === 'player' &&
    Boolean(activeHand && activeHand.cards.length === 2 && playerHands.length === 1);

  const strategyAdvice = useMemo(() => {
    if (!activeHand) return null;
    return getBasicStrategyRecommendation(
      activeHand,
      dealerCards[0],
      canSplit,
      canDouble,
      canSurrender
    );
  }, [activeHand, dealerCards, canSplit, canDouble, canSurrender]);

  const dealerEval = evaluateBlackjackHand(dealerCards);
  const totalGames = stats.wins + stats.losses + stats.pushes;
  const winRate =
    stats.wins + stats.losses > 0
      ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-950 to-black text-slate-100 select-none">
      {/* Top Header */}
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
                6-DECK CASINO BLACKJACK 21
              </p>
              <h2 className="text-sm font-black sm:text-lg">
                ブラックジャック（期待値ナビ付）
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowStrategyNav((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-black transition ${
                showStrategyNav
                  ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                  : 'border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              📊 期待値ナビ: {showStrategyNav ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setBgmOn((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                bgmOn
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
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

      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_330px]">
        {/* Left Casino Table */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-400/25 bg-gradient-to-b from-emerald-900/50 via-emerald-950/65 to-slate-950/90 p-3 shadow-2xl sm:p-5">
          {/* Bankroll & Shoe Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-1.5">
                <span className="text-[11px] text-amber-200/80">所持チップ</span>
                <p className="font-mono text-base font-black text-amber-300 sm:text-lg">
                  🪙 {chips.toLocaleString()}
                </p>
              </div>
              {chips < 10 && phase !== 'player' && (
                <button
                  type="button"
                  onClick={() => {
                    setChips(1000);
                    saveProgress(1000, stats);
                    playCardSound('chip', soundOn);
                  }}
                  className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-950 shadow hover:bg-amber-300"
                >
                  +1,000 無料補充
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span>
                シュー残数:{' '}
                <strong className="font-mono text-emerald-300">
                  {liveAnalytics.cardsRemaining}/312枚
                </strong>
              </span>
              <span>
                勝率:{' '}
                <strong className="font-mono text-cyan-300">
                  {winRate}% ({stats.wins}勝{stats.losses}敗)
                </strong>
              </span>
            </div>
          </div>

          {/* Dealer Zone */}
          <div className="my-4 flex flex-col items-center">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-white/15 bg-black/40 px-3 py-0.5 text-xs font-bold text-slate-300">
                DEALER（17以上スタンド / BJ配当1.5倍）
              </span>
              {dealerCards.length > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-xs font-black text-emerald-200">
                  合計: {dealerEval.total}
                  {dealerEval.isSoft ? ' (ソフト)' : ''}
                </span>
              )}
            </div>

            <div className="flex min-h-[96px] flex-wrap items-center justify-center gap-2 sm:min-h-[112px]">
              {dealerCards.length === 0 ? (
                <div className="flex h-22 w-15 items-center justify-center rounded-xl border border-dashed border-emerald-400/30 bg-black/20 text-xs text-emerald-300/50 sm:h-26 sm:w-18">
                  DEALER
                </div>
              ) : (
                dealerCards.map((c) => <PlayingCardView key={c.id} card={c} size="md" />)
              )}
            </div>
          </div>

          {/* Center Status Banner */}
          <div className="my-2 rounded-xl border border-emerald-300/25 bg-black/45 px-3.5 py-2.5 text-center text-xs font-bold text-emerald-100 sm:text-sm">
            {bannerText}
          </div>

          {/* Player Hands Zone */}
          <div className="my-4 flex flex-wrap items-start justify-center gap-4">
            {playerHands.length === 0 ? (
              <div className="flex flex-col items-center">
                <div className="flex h-22 w-15 items-center justify-center rounded-xl border border-dashed border-emerald-400/30 bg-black/20 text-xs text-emerald-300/50 sm:h-26 sm:w-18">
                  YOU
                </div>
                <span className="mt-2 text-xs text-slate-400">
                  ベット額を設定してディールを開始してください
                </span>
              </div>
            ) : (
              playerHands.map((hand, idx) => {
                const ev = evaluateBlackjackHand(hand.cards);
                const isCurrent = phase === 'player' && idx === activeHandIndex;
                return (
                  <div
                    key={hand.id}
                    className={`flex flex-col items-center rounded-2xl border p-3 transition ${
                      isCurrent
                        ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                        : 'border-white/10 bg-black/25'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs">
                      <span className="font-black text-white">
                        あなたの手札 {playerHands.length > 1 ? `#${idx + 1}` : ''}
                      </span>
                      <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono font-bold text-amber-300">
                        BET: {hand.bet}
                      </span>
                      <span className="rounded bg-cyan-400/20 px-2 py-0.5 font-mono font-black text-cyan-200">
                        {ev.isBlackjack
                          ? 'BLACKJACK 21!'
                          : `${ev.isSoft ? 'ソフト ' : ''}${ev.total}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                      {hand.cards.map((card) => (
                        <PlayingCardView
                          key={card.id}
                          card={card}
                          size="md"
                          highlighted={isCurrent}
                        />
                      ))}
                    </div>

                    {hand.outcome && (
                      <div className="mt-2.5 rounded-full bg-white/10 px-3 py-1 text-xs font-black">
                        {hand.outcome === 'blackjack' && (
                          <span className="text-amber-300">
                            ★ BLACKJACK! (+{hand.payout} 払戻)
                          </span>
                        )}
                        {hand.outcome === 'win' && (
                          <span className="text-emerald-300">
                            WIN! 勝利 (+{hand.payout} 払戻)
                          </span>
                        )}
                        {hand.outcome === 'push' && (
                          <span className="text-slate-200">PUSH 引き分け (返却)</span>
                        )}
                        {hand.outcome === 'surrender' && (
                          <span className="text-rose-300">
                            SURRENDER 半額返却 (+{hand.payout})
                          </span>
                        )}
                        {hand.outcome === 'lose' && (
                          <span className="text-rose-400">LOSE 敗北</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Controls Area */}
          <div className="mt-2 border-t border-white/10 pt-3">
            {phase === 'betting' || phase === 'settled' ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">ベット額:</span>
                    <span className="font-mono text-lg font-black text-amber-300">
                      🪙 {betInput.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[10, 50, 100, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setBetInput((prev) => Math.min(chips, prev + amt));
                          playCardSound('chip', soundOn);
                        }}
                        className="rounded-lg border border-amber-300/40 bg-amber-400/15 px-2.5 py-1.5 font-mono text-xs font-black text-amber-200 hover:bg-amber-400/25"
                      >
                        +{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setBetInput((prev) => Math.min(chips, prev * 2));
                        playCardSound('chip', soundOn);
                      }}
                      className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-black text-cyan-200 hover:bg-cyan-500/25"
                    >
                      2x倍
                    </button>
                    <button
                      type="button"
                      onClick={() => setBetInput(Math.min(chips, 50))}
                      className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10"
                    >
                      リセット
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDeal}
                  disabled={chips < 10}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 py-3 text-base font-black text-slate-950 shadow-lg transition hover:brightness-105 disabled:opacity-40"
                >
                  🃏 DEAL（カードを配る）
                </button>
              </div>
            ) : phase === 'insurance' ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleInsuranceDecision(true)}
                  disabled={chips < Math.floor((playerHands[0]?.bet ?? 0) / 2)}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 shadow hover:bg-amber-300 disabled:opacity-40"
                >
                  インシュランスを掛ける ({Math.floor((playerHands[0]?.bet ?? 0) / 2)} チップ)
                </button>
                <button
                  type="button"
                  onClick={() => handleInsuranceDecision(false)}
                  className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20"
                >
                  掛けずに続行（推奨）
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <button
                  type="button"
                  onClick={handleHit}
                  className="rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-emerald-400 sm:text-sm"
                >
                  ヒット (Hit)
                </button>
                <button
                  type="button"
                  onClick={handleStand}
                  className="rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-amber-300 sm:text-sm"
                >
                  スタンド (Stand)
                </button>
                <button
                  type="button"
                  onClick={handleDoubleDown}
                  disabled={!canDouble}
                  className="rounded-xl bg-cyan-400 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-cyan-300 disabled:opacity-35 sm:text-sm"
                >
                  ダブル (2x)
                </button>
                <button
                  type="button"
                  onClick={handleSplit}
                  disabled={!canSplit}
                  className="rounded-xl bg-purple-400 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-purple-300 disabled:opacity-35 sm:text-sm"
                >
                  スプリット
                </button>
                <button
                  type="button"
                  onClick={handleSurrender}
                  disabled={!canSurrender}
                  className="col-span-2 rounded-xl border border-rose-400/50 bg-rose-500/20 py-2.5 text-xs font-black text-rose-200 transition hover:bg-rose-500/30 disabled:opacity-35 sm:col-span-1 sm:text-sm"
                >
                  サレンダー
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Basic Strategy & Probability Nav + History */}
        <aside className="flex flex-col gap-3">
          {showStrategyNav && (
            <div className="rounded-2xl border border-amber-400/30 bg-slate-900/90 p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-black tracking-wider text-amber-300">
                  📊 ベーシックストラテジー＆確率ナビ
                </span>
                <span className="rounded bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                  数学的最適解
                </span>
              </div>

              {phase === 'player' && strategyAdvice ? (
                <div className="mt-3">
                  <p className="text-[11px] text-slate-400">現在の局面の推奨アクション:</p>
                  <div
                    className={`mt-1.5 inline-block rounded-lg px-3 py-1 text-sm font-black shadow ${strategyAdvice.badgeColor}`}
                  >
                    推奨: {strategyAdvice.action}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-200">
                    {strategyAdvice.reason}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">
                  カードを配ると、あなたの手札（ハード・ソフト・ペア）とディーラーの表カードから最も期待値の高いアクションをリアルタイム表示します。
                </p>
              )}

              {/* Live Probability Gauges */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                  <span className="text-[10px] text-slate-400">次ヒット時のバースト率</span>
                  <p
                    className={`mt-0.5 font-mono text-lg font-black ${
                      liveAnalytics.bustProb >= 50
                        ? 'text-rose-400'
                        : liveAnalytics.bustProb > 0
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                    }`}
                  >
                    {phase === 'player' ? `${liveAnalytics.bustProb}%` : '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                  <span className="text-[10px] text-slate-400">10・A比率 (True Count)</span>
                  <p className="mt-0.5 font-mono text-lg font-black text-cyan-300">
                    {liveAnalytics.highCardRatio}%{' '}
                    <span className="text-xs text-slate-400">
                      ({liveAnalytics.trueCount >= 0 ? `+${liveAnalytics.trueCount}` : liveAnalytics.trueCount})
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Session Stats & Recent Hands */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-4">
            <h3 className="text-xs font-black tracking-wider text-emerald-300 uppercase">
              戦績＆ハンド履歴 (全{totalGames}戦)
            </h3>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-xs">
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-[10px] text-slate-400">勝利</p>
                <p className="font-mono font-black text-emerald-300">{stats.wins}</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-[10px] text-slate-400">BJ達成</p>
                <p className="font-mono font-black text-amber-300">{stats.blackjacks}</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-[10px] text-slate-400">引分</p>
                <p className="font-mono font-black text-slate-200">{stats.pushes}</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-[10px] text-slate-400">敗北</p>
                <p className="font-mono font-black text-rose-400">{stats.losses}</p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {history.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-500">
                  まだハンド履歴がありません
                </p>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5 text-xs"
                  >
                    <div className="truncate">
                      <span className="text-slate-400">D:{h.dealerTotal}</span>{' '}
                      <span className="font-bold text-slate-200">
                        / P:{h.handSummaries.join(', ')}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-black ${
                        h.netChange > 0
                          ? 'text-emerald-300'
                          : h.netChange < 0
                            ? 'text-rose-400'
                            : 'text-slate-300'
                      }`}
                    >
                      {h.netChange > 0 ? `+${h.netChange}` : h.netChange}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
