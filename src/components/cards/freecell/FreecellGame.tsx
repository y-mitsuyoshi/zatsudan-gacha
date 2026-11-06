'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import {
  CardItem,
  createSeededRng,
  createStandardDeck,
  formatRank,
  isAlternatingColor,
  isRedSuit,
  playCardSound,
  shuffleWithRng,
  STANDARD_SUITS,
  StandardSuit,
  SUIT_LABEL_JA,
  SUIT_SYMBOL,
  SuitVectorIcon,
  useCardTableBgm,
} from '@/components/cards/shared/cardUtils';

interface FreecellState {
  freeCells: (CardItem | null)[];
  foundations: Record<StandardSuit, CardItem[]>;
  tableau: CardItem[][];
  moves: number;
}

interface FreecellSelection {
  zone: 'freecell' | 'tableau';
  index: number; // freecell slot 0..3 or tableau col 0..7
  cardIndex?: number;
}

function cloneFreecell(state: FreecellState): FreecellState {
  return {
    freeCells: state.freeCells.map((c) => (c ? { ...c } : null)),
    foundations: {
      spades: state.foundations.spades.map((c) => ({ ...c })),
      hearts: state.foundations.hearts.map((c) => ({ ...c })),
      diamonds: state.foundations.diamonds.map((c) => ({ ...c })),
      clubs: state.foundations.clubs.map((c) => ({ ...c })),
    },
    tableau: state.tableau.map((col) => col.map((c) => ({ ...c }))),
    moves: state.moves,
  };
}

function createDealForSeed(seed: number): FreecellState {
  const rng = createSeededRng(seed);
  const deck = shuffleWithRng(createStandardDeck(true, seed), rng);
  const tableau: CardItem[][] = Array.from({ length: 8 }, () => []);
  deck.forEach((card, idx) => {
    tableau[idx % 8].push({ ...card, faceUp: true });
  });
  return {
    freeCells: [null, null, null, null],
    foundations: {
      spades: [],
      hearts: [],
      diamonds: [],
      clubs: [],
    },
    tableau,
    moves: 0,
  };
}

function isValidDescendingAlternatingSequence(cards: CardItem[]): boolean {
  for (let i = 0; i < cards.length - 1; i += 1) {
    const upper = cards[i];
    const lower = cards[i + 1];
    if (upper.suit === 'joker' || lower.suit === 'joker') return false;
    if (!isAlternatingColor(upper.suit, lower.suit)) return false;
    if (upper.rank !== lower.rank + 1) return false;
  }
  return true;
}

function computeMaxSupermove(
  freeCells: (CardItem | null)[],
  tableau: CardItem[][],
  targetIsEmptyCol = false
): number {
  const emptyFreeCells = freeCells.filter((c) => c === null).length;
  const totalEmptyCols = tableau.filter((col) => col.length === 0).length;
  const usableEmptyCols = Math.max(0, targetIsEmptyCol ? totalEmptyCols - 1 : totalEmptyCols);
  return (1 + emptyFreeCells) * Math.pow(2, usableEmptyCols);
}

function canMoveCardToFoundation(
  card: CardItem,
  foundations: Record<StandardSuit, CardItem[]>
): boolean {
  if (card.suit === 'joker') return false;
  return foundations[card.suit].length + 1 === card.rank;
}

function isSafeToAutoFoundation(
  card: CardItem,
  foundations: Record<StandardSuit, CardItem[]>
): boolean {
  if (!canMoveCardToFoundation(card, foundations)) return false;
  if (card.rank <= 2) return true;
  const red = isRedSuit(card.suit);
  const oppositeSuits: StandardSuit[] = red ? ['spades', 'clubs'] : ['hearts', 'diamonds'];
  const minOppositeRank = Math.min(...oppositeSuits.map((s) => foundations[s].length));
  return minOppositeRank >= card.rank - 1;
}

function applySafeAutoFoundations(state: FreecellState): FreecellState {
  const next = cloneFreecell(state);
  let changed = true;
  let guard = 0;
  while (changed && guard < 52) {
    changed = false;
    guard += 1;
    // Check freeCells
    for (let i = 0; i < 4; i += 1) {
      const c = next.freeCells[i];
      if (c && isSafeToAutoFoundation(c, next.foundations) && c.suit !== 'joker') {
        next.foundations[c.suit].push(c);
        next.freeCells[i] = null;
        changed = true;
      }
    }
    // Check tableau tops
    for (let col = 0; col < 8; col += 1) {
      const pile = next.tableau[col];
      if (pile.length === 0) continue;
      const top = pile[pile.length - 1];
      if (isSafeToAutoFoundation(top, next.foundations) && top.suit !== 'joker') {
        pile.pop();
        next.foundations[top.suit].push(top);
        changed = true;
      }
    }
  }
  return next;
}

export default function FreecellGame() {
  const [dealNumber, setDealNumber] = useState<number>(1);
  const [seedInput, setSeedInput] = useState<string>('1');
  const [gameState, setGameState] = useState<FreecellState>(() =>
    applySafeAutoFoundations(createDealForSeed(1))
  );
  const [history, setHistory] = useState<FreecellState[]>([]);
  const [selected, setSelected] = useState<FreecellSelection | null>(null);
  const [oneTapAuto, setOneTapAuto] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  useCardTableBgm(bgmOn, 'lounge');
  const [hintCardId, setHintCardId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    'ゲーム番号 #1：すべてのカードが最初から表向きの完全情報パズルです'
  );
  const [clearedDeals, setClearedDeals] = useState<number>(0);

  const foundationTotal =
    gameState.foundations.spades.length +
    gameState.foundations.hearts.length +
    gameState.foundations.diamonds.length +
    gameState.foundations.clubs.length;
  const remainingCards = 52 - foundationTotal;
  const isWon = remainingCards === 0;

  const currentSupermoveMax = useMemo(
    () => computeMaxSupermove(gameState.freeCells, gameState.tableau, false),
    [gameState.freeCells, gameState.tableau]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem('zatsudan_freecell_wins_v1');
      if (saved) setClearedDeals(Number(saved) || 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isWon || gameState.moves === 0) return;
    const t = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [isWon, gameState.moves]);

  const startDeal = useCallback(
    (seed: number) => {
      const normalized = Math.max(1, Math.min(99999, Math.floor(seed) || 1));
      setDealNumber(normalized);
      setSeedInput(String(normalized));
      setGameState(applySafeAutoFoundations(createDealForSeed(normalized)));
      setHistory([]);
      setSelected(null);
      setHintCardId(null);
      setElapsedSec(0);
      setStatusMessage(`ディール #${normalized} を開始しました。`);
      playCardSound('flip', soundOn);
    },
    [soundOn]
  );

  const commitState = useCallback(
    (nextRaw: FreecellState, message: string) => {
      const next = applySafeAutoFoundations(nextRaw);
      setHistory((prev) => [...prev.slice(-90), cloneFreecell(gameState)]);
      setGameState(next);
      setSelected(null);
      setHintCardId(null);
      setStatusMessage(message);

      const nextFound =
        next.foundations.spades.length +
        next.foundations.hearts.length +
        next.foundations.diamonds.length +
        next.foundations.clubs.length;
      if (nextFound === 52) {
        playCardSound('win', soundOn);
        const nextWins = clearedDeals + 1;
        setClearedDeals(nextWins);
        try {
          localStorage.setItem('zatsudan_freecell_wins_v1', String(nextWins));
        } catch {
          // ignore
        }
      } else {
        playCardSound('card', soundOn);
      }
    },
    [gameState, soundOn, clearedDeals]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setGameState(last);
    setSelected(null);
    setHintCardId(null);
    setStatusMessage('一手戻しました。');
    playCardSound('flip', soundOn);
  }, [history, soundOn]);

  const tryMoveToFoundation = useCallback(
    (src: FreecellSelection): boolean => {
      const next = cloneFreecell(gameState);
      if (src.zone === 'freecell') {
        const card = next.freeCells[src.index];
        if (!card || !canMoveCardToFoundation(card, next.foundations) || card.suit === 'joker') {
          return false;
        }
        next.freeCells[src.index] = null;
        next.foundations[card.suit].push(card);
        next.moves += 1;
        commitState(next, `${SUIT_LABEL_JA[card.suit]}${formatRank(card.rank)}を組札へ移動しました。`);
        return true;
      }
      const col = next.tableau[src.index];
      if (col.length === 0) return false;
      const cardIndex = src.cardIndex ?? col.length - 1;
      if (cardIndex !== col.length - 1) return false;
      const card = col[col.length - 1];
      if (!canMoveCardToFoundation(card, next.foundations) || card.suit === 'joker') return false;
      col.pop();
      next.foundations[card.suit].push(card);
      next.moves += 1;
      commitState(next, `${SUIT_LABEL_JA[card.suit]}${formatRank(card.rank)}を組札へ移動しました。`);
      return true;
    },
    [gameState, commitState]
  );

  const tryMoveToFreeCell = useCallback(
    (src: FreecellSelection, targetSlot?: number): boolean => {
      const next = cloneFreecell(gameState);
      const slot =
        targetSlot !== undefined
          ? targetSlot
          : next.freeCells.findIndex((c) => c === null);
      if (slot < 0 || slot > 3 || next.freeCells[slot] !== null) return false;

      if (src.zone === 'freecell') return false;
      const col = next.tableau[src.index];
      if (col.length === 0) return false;
      const cardIndex = src.cardIndex ?? col.length - 1;
      if (cardIndex !== col.length - 1) return false;
      const card = col.pop()!;
      next.freeCells[slot] = card;
      next.moves += 1;
      commitState(
        next,
        `${SUIT_LABEL_JA[card.suit]}${formatRank(card.rank)}をフリーセル#${slot + 1}へ移動しました。`
      );
      return true;
    },
    [gameState, commitState]
  );

  const tryMoveToTableauCol = useCallback(
    (src: FreecellSelection, targetColIdx: number): boolean => {
      const next = cloneFreecell(gameState);
      const dstCol = next.tableau[targetColIdx];
      const dstIsEmpty = dstCol.length === 0;

      if (src.zone === 'freecell') {
        const card = next.freeCells[src.index];
        if (!card || card.suit === 'joker') return false;
        if (!dstIsEmpty) {
          const topDst = dstCol[dstCol.length - 1];
          if (
            topDst.suit === 'joker' ||
            !isAlternatingColor(card.suit, topDst.suit) ||
            card.rank !== topDst.rank - 1
          ) {
            return false;
          }
        }
        next.freeCells[src.index] = null;
        dstCol.push(card);
        next.moves += 1;
        commitState(
          next,
          `${SUIT_LABEL_JA[card.suit]}${formatRank(card.rank)}を第${targetColIdx + 1}列へ移動しました。`
        );
        return true;
      }

      if (src.index === targetColIdx) return false;
      const srcCol = next.tableau[src.index];
      const startIdx = src.cardIndex ?? srcCol.length - 1;
      if (startIdx < 0 || startIdx >= srcCol.length) return false;

      const movingSlice = srcCol.slice(startIdx);
      if (!isValidDescendingAlternatingSequence(movingSlice)) return false;

      const maxAllowed = computeMaxSupermove(next.freeCells, next.tableau, dstIsEmpty);
      if (movingSlice.length > maxAllowed) return false;

      const head = movingSlice[0];
      if (head.suit === 'joker') return false;
      if (!dstIsEmpty) {
        const topDst = dstCol[dstCol.length - 1];
        if (
          topDst.suit === 'joker' ||
          !isAlternatingColor(head.suit, topDst.suit) ||
          head.rank !== topDst.rank - 1
        ) {
          return false;
        }
      }

      srcCol.splice(startIdx);
      dstCol.push(...movingSlice);
      next.moves += 1;
      commitState(
        next,
        `${SUIT_LABEL_JA[head.suit]}${formatRank(head.rank)}${
          movingSlice.length > 1 ? `（スーパー・ムーブ${movingSlice.length}枚）` : ''
        }を第${targetColIdx + 1}列へ移動しました。`
      );
      return true;
    },
    [gameState, commitState]
  );

  const trySmartOneTap = useCallback(
    (src: FreecellSelection): boolean => {
      if (tryMoveToFoundation(src)) return true;

      // Prefer non-empty valid tableau columns first
      for (let c = 0; c < 8; c += 1) {
        if (gameState.tableau[c].length > 0 && tryMoveToTableauCol(src, c)) {
          return true;
        }
      }
      // Then empty tableau columns (unless moving a whole tableau column from index 0 to another empty column)
      const isWholeTableauCol =
        src.zone === 'tableau' &&
        (src.cardIndex ?? gameState.tableau[src.index].length - 1) === 0;
      if (!isWholeTableauCol) {
        for (let c = 0; c < 8; c += 1) {
          if (gameState.tableau[c].length === 0 && tryMoveToTableauCol(src, c)) {
            return true;
          }
        }
      }
      // Finally freeCell if top card from tableau
      if (src.zone === 'tableau' && tryMoveToFreeCell(src)) {
        return true;
      }
      return false;
    },
    [tryMoveToFoundation, tryMoveToTableauCol, tryMoveToFreeCell, gameState.tableau]
  );

  const handleCardSelectOrMove = useCallback(
    (src: FreecellSelection) => {
      if (isWon) return;

      if (selected) {
        const isSame =
          selected.zone === src.zone &&
          selected.index === src.index &&
          selected.cardIndex === src.cardIndex;
        if (isSame) {
          if (!trySmartOneTap(src)) {
            setSelected(null);
          }
          return;
        }
        if (src.zone === 'tableau' && tryMoveToTableauCol(selected, src.index)) {
          return;
        }
      }

      if (oneTapAuto && trySmartOneTap(src)) {
        return;
      }

      // Check if sequence is valid before selecting
      if (src.zone === 'tableau' && src.cardIndex !== undefined) {
        const slice = gameState.tableau[src.index].slice(src.cardIndex);
        if (!isValidDescendingAlternatingSequence(slice)) {
          playCardSound('error', soundOn);
          setStatusMessage('赤黒交互かつ連番になっているカードの束のみまとめて動かせます。');
          return;
        }
      }

      setSelected(src);
      playCardSound('card', soundOn);
      setStatusMessage('移動先の列・フリーセル・組札をタップしてください。');
    },
    [isWon, selected, oneTapAuto, trySmartOneTap, tryMoveToTableauCol, gameState.tableau, soundOn]
  );

  const handleHint = useCallback(() => {
    // 1. Check foundation moves
    for (let i = 0; i < 4; i += 1) {
      const c = gameState.freeCells[i];
      if (c && canMoveCardToFoundation(c, gameState.foundations)) {
        setHintCardId(c.id);
        setStatusMessage(`💡 ヒント: フリーセル#${i + 1}の「${SUIT_LABEL_JA[c.suit]}${formatRank(c.rank)}」を組札へ出せます`);
        playCardSound('card', soundOn);
        return;
      }
    }
    for (let col = 0; col < 8; col += 1) {
      const pile = gameState.tableau[col];
      if (pile.length === 0) continue;
      const top = pile[pile.length - 1];
      if (canMoveCardToFoundation(top, gameState.foundations)) {
        setHintCardId(top.id);
        setStatusMessage(`💡 ヒント: 第${col + 1}列の「${SUIT_LABEL_JA[top.suit]}${formatRank(top.rank)}」を組札へ出せます`);
        playCardSound('card', soundOn);
        return;
      }
    }
    // 2. Check tableau to non-empty tableau
    for (let col = 0; col < 8; col += 1) {
      const pile = gameState.tableau[col];
      if (pile.length === 0) continue;
      const top = pile[pile.length - 1];
      if (top.suit === 'joker') continue;
      for (let dst = 0; dst < 8; dst += 1) {
        if (dst === col || gameState.tableau[dst].length === 0) continue;
        const dstTop = gameState.tableau[dst][gameState.tableau[dst].length - 1];
        if (
          dstTop.suit !== 'joker' &&
          isAlternatingColor(top.suit, dstTop.suit) &&
          top.rank === dstTop.rank - 1
        ) {
          setHintCardId(top.id);
          setStatusMessage(`💡 ヒント: 第${col + 1}列の「${SUIT_LABEL_JA[top.suit]}${formatRank(top.rank)}」を第${dst + 1}列へ重ねられます`);
          playCardSound('card', soundOn);
          return;
        }
      }
    }
    // 3. FreeCell available
    if (gameState.freeCells.some((c) => c === null)) {
      for (let col = 0; col < 8; col += 1) {
        const pile = gameState.tableau[col];
        if (pile.length > 0) {
          const top = pile[pile.length - 1];
          setHintCardId(top.id);
          setStatusMessage(`💡 ヒント: 空いているフリーセルを使って第${col + 1}列のカードを一時退避できます`);
          playCardSound('card', soundOn);
          return;
        }
      }
    }

    setStatusMessage('💡 ヒント: 「一手戻す」で別ルートを試すか、フリーセルを空けましょう');
    playCardSound('error', soundOn);
  }, [gameState, soundOn]);

  const handleAutoFinishAll = useCallback(() => {
    const next = cloneFreecell(gameState);
    let loops = 0;
    while (loops < 60) {
      loops += 1;
      let moved = false;
      for (let i = 0; i < 4; i += 1) {
        const c = next.freeCells[i];
        if (c && canMoveCardToFoundation(c, next.foundations) && c.suit !== 'joker') {
          next.foundations[c.suit].push(c);
          next.freeCells[i] = null;
          next.moves += 1;
          moved = true;
        }
      }
      for (let col = 0; col < 8; col += 1) {
        const pile = next.tableau[col];
        if (pile.length === 0) continue;
        const top = pile[pile.length - 1];
        if (canMoveCardToFoundation(top, next.foundations) && top.suit !== 'joker') {
          pile.pop();
          next.foundations[top.suit].push(top);
          next.moves += 1;
          moved = true;
        }
      }
      if (!moved) break;
    }
    commitState(next, '組札へ出せるカードをまとめて回収しました。');
  }, [gameState, commitState]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-950 via-emerald-950 to-slate-950 text-slate-100 select-none">
      {/* Header */}
      <header className="border-b border-teal-400/20 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/games"
              className="rounded-lg border border-teal-400/30 bg-teal-500/10 px-2.5 py-1.5 text-xs font-bold text-teal-200 transition hover:border-teal-300 hover:bg-teal-500/20"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-teal-300 uppercase">
                PERFECT INFORMATION SOLITAIRE
              </p>
              <h2 className="text-sm font-black sm:text-lg">
                フリーセル（FreeCell）
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Game Seed Selector */}
            <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs">
              <span className="font-bold text-teal-300">#</span>
              <input
                type="number"
                min={1}
                max={99999}
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                aria-label="ゲーム番号"
                className="w-14 bg-transparent font-mono font-bold text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => startDeal(Number(seedInput))}
                className="rounded bg-teal-500 px-2 py-0.5 text-[11px] font-black text-slate-950 hover:bg-teal-400"
              >
                開始
              </button>
              <button
                type="button"
                onClick={() => startDeal(Math.floor(Math.random() * 99999) + 1)}
                className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-200 hover:bg-white/20"
              >
                ランダム
              </button>
            </div>

            <button
              type="button"
              onClick={() => setBgmOn((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                bgmOn
                  ? 'border-teal-400/60 bg-teal-500/20 text-teal-200'
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

      <div className="mx-auto max-w-6xl px-2 py-3 sm:px-4 sm:py-5">
        {/* Metrics & Controls */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-400/20 bg-slate-950/65 p-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm">
            <div>
              <span className="text-slate-400">ディール</span>{' '}
              <span className="font-mono font-black text-teal-300">#{dealNumber}</span>
            </div>
            <div>
              <span className="text-slate-400">残りカード</span>{' '}
              <span className="font-mono font-black text-amber-300">{remainingCards}枚</span>
            </div>
            <div>
              <span className="text-slate-400">手数</span>{' '}
              <span className="font-mono font-black text-white">{gameState.moves}</span>
            </div>
            <div>
              <span className="text-slate-400">最大同時移動</span>{' '}
              <span className="font-mono font-black text-cyan-300">{currentSupermoveMax}枚</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-slate-400">タイム</span>{' '}
              <span className="font-mono font-bold text-slate-200">{formatTime(elapsedSec)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOneTapAuto((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                oneTapAuto
                  ? 'border-teal-400/60 bg-teal-500/20 text-teal-200'
                  : 'border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              ⚡ ワンタップ移動: {oneTapAuto ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 disabled:opacity-40"
            >
              ↩ 一手戻す ({history.length})
            </button>
            <button
              type="button"
              onClick={handleHint}
              className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-2.5 py-1.5 text-xs font-black text-amber-200 hover:bg-amber-400/25"
            >
              💡 ヒント
            </button>
            <button
              type="button"
              onClick={handleAutoFinishAll}
              className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-black text-emerald-200 hover:bg-emerald-500/25"
            >
              ✨ 組札回収
            </button>
          </div>
        </div>

        {/* Status Message */}
        <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs font-bold text-teal-100">
          <span>{statusMessage}</span>
          {selected && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-white/20"
            >
              選択解除
            </button>
          )}
        </div>

        {/* Top Row: 4 FreeCells (Left) + 4 Foundations (Right) */}
        <div className="mb-4 grid grid-cols-8 gap-1 sm:gap-2.5">
          {/* 4 Free Cells */}
          {gameState.freeCells.map((card, slotIdx) => {
            const isSelected = selected?.zone === 'freecell' && selected.index === slotIdx;
            const isHinted = card && hintCardId === card.id;
            const red = card ? isRedSuit(card.suit, card.rank) : false;

            return (
              <div key={`fc-${slotIdx}`} className="flex flex-col items-center">
                <span className="mb-1 text-[9px] font-bold text-teal-300/80 sm:text-[10px]">
                  FREE #{slotIdx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!card) {
                      if (selected) tryMoveToFreeCell(selected, slotIdx);
                      return;
                    }
                    handleCardSelectOrMove({ zone: 'freecell', index: slotIdx });
                  }}
                  aria-label={`フリーセル ${slotIdx + 1}`}
                  className={`flex aspect-[5/7] w-full max-w-[76px] flex-col justify-between rounded-lg border transition sm:rounded-xl ${
                    card
                      ? `bg-gradient-to-b from-white to-slate-100 p-1 shadow-md sm:p-1.5 ${
                          red ? 'text-rose-600' : 'text-slate-900'
                        }`
                      : 'items-center justify-center border-2 border-dashed border-teal-400/35 bg-teal-950/40 text-teal-300/45'
                  } ${
                    isSelected
                      ? '-translate-y-1 border-amber-400 ring-2 ring-amber-400'
                      : isHinted
                        ? 'border-emerald-400 ring-2 ring-emerald-400'
                        : 'border-slate-300 hover:border-amber-300'
                  }`}
                >
                  {card ? (
                    <>
                      <div className="flex items-center justify-between leading-none">
                        <span className="font-mono text-[11px] font-black sm:text-sm">
                          {formatRank(card.rank)}
                        </span>
                        <span className="text-[10px] sm:text-xs">{SUIT_SYMBOL[card.suit]}</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <SuitVectorIcon suit={card.suit} className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex rotate-180 items-center justify-between leading-none">
                        <span className="font-mono text-[10px] font-black sm:text-xs">
                          {formatRank(card.rank)}
                        </span>
                        <span className="text-[9px] sm:text-xs">{SUIT_SYMBOL[card.suit]}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-[9px] font-bold">空き</span>
                  )}
                </button>
              </div>
            );
          })}

          {/* 4 Foundations */}
          {STANDARD_SUITS.map((suit) => {
            const pile = gameState.foundations[suit];
            const top = pile.length > 0 ? pile[pile.length - 1] : null;
            const red = isRedSuit(suit);

            return (
              <div key={`fd-${suit}`} className="flex flex-col items-center">
                <span className="mb-1 text-[9px] font-bold text-amber-300/85 sm:text-[10px]">
                  {SUIT_SYMBOL[suit]} 組札
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selected) {
                      tryMoveToFoundation(selected);
                    }
                  }}
                  aria-label={`${SUIT_LABEL_JA[suit]}の組札`}
                  className={`flex aspect-[5/7] w-full max-w-[76px] flex-col justify-between rounded-lg border transition sm:rounded-xl ${
                    top
                      ? `border-slate-300 bg-gradient-to-b from-white to-slate-100 p-1 shadow-md sm:p-1.5 ${
                          red ? 'text-rose-600' : 'text-slate-900'
                        }`
                      : 'items-center justify-center border-2 border-dashed border-amber-400/35 bg-slate-900/50'
                  }`}
                >
                  {top ? (
                    <>
                      <div className="flex items-center justify-between leading-none">
                        <span className="font-mono text-[11px] font-black sm:text-sm">
                          {formatRank(top.rank)}
                        </span>
                        <span className="text-[10px] sm:text-xs">{SUIT_SYMBOL[suit]}</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <SuitVectorIcon suit={suit} className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex rotate-180 items-center justify-between leading-none">
                        <span className="font-mono text-[10px] font-black sm:text-xs">
                          {formatRank(top.rank)}
                        </span>
                        <span className="text-[9px] sm:text-xs">{SUIT_SYMBOL[suit]}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center opacity-50">
                      <SuitVectorIcon
                        suit={suit}
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${
                          red ? 'text-rose-400' : 'text-teal-200'
                        }`}
                      />
                      <span className="mt-0.5 font-mono text-[8px] font-bold">A→K</span>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* 8 Tableau Columns */}
        <div className="grid grid-cols-8 gap-1 sm:gap-2">
          {gameState.tableau.map((col, colIdx) => {
            const colMinHeight = Math.max(290, 90 + col.length * 25);
            return (
              <div key={`col-${colIdx}`} className="flex flex-col items-center">
                <span className="mb-1 font-mono text-[9px] font-bold text-teal-300/75 sm:text-[10px]">
                  {colIdx + 1}列
                </span>
                <div
                  className="relative w-full max-w-[76px]"
                  style={{ minHeight: `${colMinHeight}px` }}
                >
                  {col.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selected) tryMoveToTableauCol(selected, colIdx);
                      }}
                      className="flex aspect-[5/7] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-teal-400/30 bg-teal-950/30 text-[9px] font-bold text-teal-300/50 hover:border-amber-300 sm:rounded-xl"
                    >
                      空き列
                    </button>
                  )}

                  {col.map((card, cardIdx) => {
                    const topOffset = cardIdx * 23;
                    const isSelected =
                      selected?.zone === 'tableau' &&
                      selected.index === colIdx &&
                      selected.cardIndex !== undefined &&
                      cardIdx >= selected.cardIndex;
                    const isHinted = hintCardId === card.id;
                    const red = isRedSuit(card.suit, card.rank);

                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() =>
                          handleCardSelectOrMove({
                            zone: 'tableau',
                            index: colIdx,
                            cardIndex: cardIdx,
                          })
                        }
                        style={{ top: `${topOffset}px`, zIndex: cardIdx + 1 }}
                        className={`absolute inset-x-0 flex aspect-[5/7] w-full flex-col justify-between rounded-lg border bg-gradient-to-b from-white via-slate-50 to-slate-100 p-1 text-left shadow-md transition-transform sm:rounded-xl sm:p-1.5 ${
                          isSelected
                            ? '-translate-y-1 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                            : isHinted
                              ? 'border-emerald-400 ring-2 ring-emerald-400'
                              : 'border-slate-300 hover:border-amber-300'
                        } ${red ? 'text-rose-600' : 'text-slate-900'}`}
                      >
                        <div className="flex items-center justify-between leading-none">
                          <span className="font-mono text-[10px] font-black tracking-tighter sm:text-xs">
                            {formatRank(card.rank)}
                          </span>
                          <span className="text-[9px] leading-none sm:text-xs">
                            {SUIT_SYMBOL[card.suit]}
                          </span>
                        </div>
                        <div className="flex items-center justify-center">
                          <SuitVectorIcon suit={card.suit} className="h-3 w-3 sm:h-4.5 sm:w-4.5" />
                        </div>
                        <div className="flex rotate-180 items-center justify-between leading-none">
                          <span className="font-mono text-[9px] font-black tracking-tighter sm:text-xs">
                            {formatRank(card.rank)}
                          </span>
                          <span className="text-[8px] leading-none sm:text-[10px]">
                            {SUIT_SYMBOL[card.suit]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Win Celebration */}
        {isWon && (
          <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-teal-900/90 via-emerald-900/90 to-teal-900/90 p-5 text-center shadow-2xl">
            <p className="text-xs font-black tracking-widest text-amber-300 uppercase">
              FREECELL DEAL #{dealNumber} SOLVED!
            </p>
            <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              🎉 フリーセル #{dealNumber} 完全クリア！
            </h3>
            <p className="mt-2 text-sm text-teal-100">
              クリア手数: <span className="font-mono font-bold">{gameState.moves}手</span> ／ タイム:{' '}
              <span className="font-mono font-bold">{formatTime(elapsedSec)}</span> ／ 累計クリア:{' '}
              <span className="font-mono font-bold">{clearedDeals}回</span>
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => startDeal(dealNumber + 1)}
                className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg hover:bg-amber-300"
              >
                次のディール (#{dealNumber + 1}) へ進む
              </button>
              <button
                type="button"
                onClick={() => startDeal(Math.floor(Math.random() * 99999) + 1)}
                className="rounded-xl border border-amber-300 bg-amber-400/20 px-5 py-2.5 text-sm font-black text-amber-100 hover:bg-amber-400/30"
              >
                ランダムな番号で遊ぶ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
