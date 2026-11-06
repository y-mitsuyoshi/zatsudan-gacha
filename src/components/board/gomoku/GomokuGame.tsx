'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

type Stone = 0 | 1 | 2; // 0: Empty, 1: Black (先手), 2: White (後手)
type GameMode = 'cpu' | 'pvp';
type Difficulty = 'easy' | 'normal' | 'hard';

interface MoveRecord {
  r: number;
  c: number;
  player: 1 | 2;
  moveNum: number;
}

const SIZE = 15;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
const STAR_POINTS: [number, number][] = [
  [3, 3],
  [3, 7],
  [3, 11],
  [7, 3],
  [7, 7],
  [7, 11],
  [11, 3],
  [11, 7],
  [11, 11],
];

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function createEmptyBoard(): Stone[][] {
  return Array.from({ length: SIZE }, () => Array<Stone>(SIZE).fill(0));
}

function cloneBoard(board: Stone[][]): Stone[][] {
  return board.map((row) => [...row]);
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function checkFiveWinner(
  board: Stone[][]
): { winner: 1 | 2; line: [number, number][] } | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (p === 0) continue;
      for (const [dr, dc] of DIRS) {
        const prevR = r - dr;
        const prevC = c - dc;
        if (inBounds(prevR, prevC) && board[prevR][prevC] === p) continue;

        const coords: [number, number][] = [[r, c]];
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc) && board[nr][nc] === p) {
          coords.push([nr, nc]);
          nr += dr;
          nc += dc;
        }
        if (coords.length >= 5) {
          return { winner: p, line: coords.slice(0, 5) };
        }
      }
    }
  }
  return null;
}

interface PatternAnalysis {
  openFours: number; // 活四
  halfFours: number; // 止め四 (達四・片側空き4連)
  openThrees: number; // 活三
  halfThrees: number;
  openTwos: number;
  score: number;
  alerts: string[];
}

function analyzeBoardPatterns(board: Stone[][], player: 1 | 2): PatternAnalysis {
  let openFours = 0;
  let halfFours = 0;
  let openThrees = 0;
  let halfThrees = 0;
  let openTwos = 0;
  const alerts: string[] = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== player) continue;

      for (const [dr, dc] of DIRS) {
        const pr = r - dr;
        const pc = c - dc;
        if (inBounds(pr, pc) && board[pr][pc] === player) continue; // only start of run

        let len = 0;
        let nr = r;
        let nc = c;
        while (inBounds(nr, nc) && board[nr][nc] === player) {
          len++;
          nr += dr;
          nc += dc;
        }

        const openBefore = inBounds(pr, pc) && board[pr][pc] === 0;
        const openAfter = inBounds(nr, nc) && board[nr][nc] === 0;
        const openEnds = (openBefore ? 1 : 0) + (openAfter ? 1 : 0);

        if (len === 4) {
          if (openEnds === 2) {
            openFours++;
            alerts.push(`${COL_LABELS[c]}${r + 1}付近に活四（両側空き4連）`);
          } else if (openEnds === 1) {
            halfFours++;
            alerts.push(`${COL_LABELS[c]}${r + 1}付近に四（リーチ）`);
          }
        } else if (len === 3) {
          if (openEnds === 2) {
            openThrees++;
            alerts.push(`${COL_LABELS[c]}${r + 1}付近に活三`);
          } else if (openEnds === 1) {
            halfThrees++;
          }
        } else if (len === 2) {
          if (openEnds === 2) openTwos++;
        }
      }
    }
  }

  const score =
    openFours * 18000 +
    halfFours * 4200 +
    openThrees * 1600 +
    (openThrees >= 2 ? 2800 : 0) + // 三々 bonus
    halfThrees * 180 +
    openTwos * 45;

  return { openFours, halfFours, openThrees, halfThrees, openTwos, score, alerts };
}

// Evaluate placing `player` stone at (r, c)
function scoreCandidateSpot(board: Stone[][], r: number, c: number, player: 1 | 2): number {
  let total = 0;
  let openThreeCount = 0;
  let fourCount = 0;

  for (const [dr, dc] of DIRS) {
    let forward = 0;
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc) && board[nr][nc] === player) {
      forward++;
      nr += dr;
      nc += dc;
    }
    const openF = inBounds(nr, nc) && board[nr][nc] === 0;

    let backward = 0;
    let br = r - dr;
    let bc = c - dc;
    while (inBounds(br, bc) && board[br][bc] === player) {
      backward++;
      br -= dr;
      bc -= dc;
    }
    const openB = inBounds(br, bc) && board[br][bc] === 0;

    const span = 1 + forward + backward;
    const openEnds = (openF ? 1 : 0) + (openB ? 1 : 0);

    if (span >= 5) {
      total += 500000;
    } else if (span === 4) {
      if (openEnds === 2) {
        total += 45000;
        fourCount++;
      } else if (openEnds === 1) {
        total += 8500;
        fourCount++;
      }
    } else if (span === 3) {
      if (openEnds === 2) {
        total += 3600;
        openThreeCount++;
      } else if (openEnds === 1) {
        total += 320;
      }
    } else if (span === 2) {
      if (openEnds === 2) {
        total += 160;
      } else if (openEnds === 1) {
        total += 25;
      }
    }
  }

  // Double-three (三々) or Four-Three (四三) fork bonus
  if (fourCount >= 1 && openThreeCount >= 1) total += 25000;
  else if (openThreeCount >= 2) total += 11000;

  // Center control preference (Tengen = 7,7)
  const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
  total += Math.max(0, 18 - centerDist * 2);

  return total;
}

function pickGomokuMove(
  board: Stone[][],
  player: 1 | 2,
  difficulty: Difficulty
): [number, number] {
  const opp: 1 | 2 = player === 1 ? 2 : 1;

  // Check if board is empty -> play Tengen (7,7)
  let anyStone = false;
  const candidates: [number, number][] = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) {
        anyStone = true;
        continue;
      }
      // Only consider spots within Manhattan/Chebyshev distance <= 2 of existing stones
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) {
        for (let dc = -2; dc <= 2 && !near; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(nr, nc) && board[nr][nc] !== 0) {
            near = true;
          }
        }
      }
      if (near) candidates.push([r, c]);
    }
  }

  if (!anyStone) return [7, 7];
  if (candidates.length === 0) return [7, 7];

  // Score each candidate for offense + defense
  const scored = candidates.map(([r, c]) => {
    const attack = scoreCandidateSpot(board, r, c, player);
    const defend = scoreCandidateSpot(board, r, c, opp);

    // Must-win or must-block priority
    let combined = attack + defend * 1.08;
    if (attack >= 500000) combined = 2000000 + attack;
    else if (defend >= 500000) combined = 1500000 + defend;
    else if (attack >= 40000) combined = 800000 + attack;
    else if (defend >= 40000) combined = 600000 + defend;

    if (difficulty === 'easy') {
      combined = attack * 0.7 + defend * 0.55 + (Math.random() - 0.5) * 900;
    } else if (difficulty === 'normal') {
      combined += (Math.random() - 0.5) * 140;
    }

    return { r, c, score: combined };
  });

  scored.sort((a, b) => b.score - a.score);

  if (difficulty !== 'hard' || scored[0].score >= 500000) {
    return [scored[0].r, scored[0].c];
  }

  // Hard: 2-ply lookahead on top 8 candidates
  const topCandidates = scored.slice(0, Math.min(8, scored.length));
  let bestMove: [number, number] = [topCandidates[0].r, topCandidates[0].c];
  let bestVal = -Infinity;

  for (const cand of topCandidates) {
    board[cand.r][cand.c] = player;
    // Find opponent's strongest reply
    let maxOppReply = 0;
    for (const oppCand of topCandidates) {
      if (oppCand.r === cand.r && oppCand.c === cand.c) continue;
      const oppAttack = scoreCandidateSpot(board, oppCand.r, oppCand.c, opp);
      const oppDefend = scoreCandidateSpot(board, oppCand.r, oppCand.c, player);
      const replyScore = oppAttack * 1.1 + oppDefend * 0.9;
      if (replyScore > maxOppReply) maxOppReply = replyScore;
    }
    board[cand.r][cand.c] = 0;

    const netVal = cand.score - maxOppReply * 0.45;
    if (netVal > bestVal) {
      bestVal = netVal;
      bestMove = [cand.r, cand.c];
    }
  }

  return bestMove;
}

export default function GomokuGame() {
  const [board, setBoard] = useState<Stone[][]>(() => createEmptyBoard());
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [mode, setMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [humanSide, setHumanSide] = useState<1 | 2>(1);
  const [showMoveNumbers, setShowMoveNumbers] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [hoveredCoord, setHoveredCoord] = useState<[number, number] | null>(null);
  const [hintSpot, setHintSpot] = useState<[number, number] | null>(null);
  const [rippleSpot, setRippleSpot] = useState<{ r: number; c: number; key: number } | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playStoneSound = useCallback(
    (freq = 360, dur = 0.07) => {
      if (!soundOn || typeof window === 'undefined') return;
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(0.11, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      } catch {
        // Ignore audio errors
      }
    },
    [soundOn]
  );

  const winInfo = useMemo(() => checkFiveWinner(board), [board]);
  const isDraw = !winInfo && moves.length >= SIZE * SIZE;
  const gameOver = Boolean(winInfo) || isDraw;
  const isCpuTurn = mode === 'cpu' && turn !== humanSide && !gameOver;

  const blackAnalysis = useMemo(() => analyzeBoardPatterns(board, 1), [board]);
  const whiteAnalysis = useMemo(() => analyzeBoardPatterns(board, 2), [board]);

  const advantagePercent = useMemo(() => {
    if (winInfo) return winInfo.winner === 1 ? 100 : 0;
    const diff = blackAnalysis.score - whiteAnalysis.score;
    const clamped = Math.max(-6000, Math.min(6000, diff));
    return Math.round(50 + (clamped / 6000) * 45);
  }, [blackAnalysis.score, whiteAnalysis.score, winInfo]);

  const moveNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of moves) {
      map.set(`${m.r}-${m.c}`, m.moveNum);
    }
    return map;
  }, [moves]);

  const winCellSet = useMemo(() => {
    const s = new Set<string>();
    if (winInfo) {
      for (const [r, c] of winInfo.line) {
        s.add(`${r}-${c}`);
      }
    }
    return s;
  }, [winInfo]);

  const placeStone = useCallback(
    (r: number, c: number) => {
      if (gameOver || board[r][c] !== 0) return;

      const nextBoard = cloneBoard(board);
      nextBoard[r][c] = turn;
      const nextMoveNum = moves.length + 1;

      setBoard(nextBoard);
      setMoves((prev) => [...prev, { r, c, player: turn, moveNum: nextMoveNum }]);
      setHintSpot(null);
      setRippleSpot({ r, c, key: Date.now() });
      playStoneSound(turn === 1 ? 330 : 410, 0.08);

      const w = checkFiveWinner(nextBoard);
      if (w) {
        window.setTimeout(() => playStoneSound(680, 0.24), 100);
      } else {
        setTurn(turn === 1 ? 2 : 1);
      }
    },
    [board, gameOver, moves.length, playStoneSound, turn]
  );

  // CPU Turn Effect
  useEffect(() => {
    if (!isCpuTurn) return;
    const timer = window.setTimeout(() => {
      const [r, c] = pickGomokuMove(board, turn, difficulty);
      placeStone(r, c);
    }, 440);
    return () => window.clearTimeout(timer);
  }, [board, difficulty, isCpuTurn, placeStone, turn]);

  const handleIntersectionClick = useCallback(
    (r: number, c: number) => {
      if (gameOver || isCpuTurn || board[r][c] !== 0) return;
      placeStone(r, c);
    },
    [board, gameOver, isCpuTurn, placeStone]
  );

  const handleUndo = useCallback(() => {
    if (moves.length === 0 || isCpuTurn) return;
    const popCount = mode === 'cpu' && moves.length >= 2 ? 2 : 1;
    const nextMoves = moves.slice(0, moves.length - popCount);
    const nextBoard = createEmptyBoard();
    for (const m of nextMoves) {
      nextBoard[m.r][m.c] = m.player;
    }
    setBoard(nextBoard);
    setMoves(nextMoves);
    setTurn(nextMoves.length % 2 === 0 ? 1 : 2);
    setHintSpot(null);
  }, [isCpuTurn, mode, moves]);

  const handleHint = useCallback(() => {
    if (gameOver || isCpuTurn) return;
    const spot = pickGomokuMove(board, turn, 'hard');
    setHintSpot(spot);
    playStoneSound(560, 0.07);
  }, [board, gameOver, isCpuTurn, playStoneSound, turn]);

  const resetGame = useCallback(
    (newMode = mode, newDifficulty = difficulty, newHumanSide = humanSide) => {
      setMode(newMode);
      setDifficulty(newDifficulty);
      setHumanSide(newHumanSide);
      setBoard(createEmptyBoard());
      setMoves([]);
      setTurn(1);
      setHintSpot(null);
      setRippleSpot(null);
    },
    [difficulty, humanSide, mode]
  );

  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;
  const activeAlerts = [...blackAnalysis.alerts.map((a) => `●黒: ${a}`), ...whiteAnalysis.alerts.map((a) => `○白: ${a}`)];

  // SVG Coordinate Helper (15x15 intersections mapped to 40..600 in a 640x640 viewBox)
  const PADDING = 42;
  const STEP = 39.7;
  const toPos = (idx: number) => PADDING + idx * STEP;

  return (
    <div className="tabletop-page min-h-screen select-none overflow-x-hidden">
      {/* Header */}
      <header className="tabletop-header">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-2 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games"
              className="tabletop-button inline-flex min-h-11 shrink-0 items-center px-3 text-xs sm:text-sm"
            >
              ← ゲーム一覧
            </Link>
            <div className="min-w-0">
              <p className="tabletop-kicker truncate">Classic Strategy · 15×15 Gomoku</p>
              <h2 className="tabletop-title truncate text-base sm:text-xl">
                五目並べ
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowMoveNumbers((v) => !v)}
              aria-pressed={showMoveNumbers}
              className={`tabletop-chip inline-flex min-h-11 items-center px-3 text-xs font-semibold ${
                showMoveNumbers ? 'tabletop-chip-active' : ''
              }`}
            >
              手数表示 {showMoveNumbers ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              aria-pressed={soundOn}
              className={`tabletop-chip inline-flex min-h-11 items-center px-3 text-xs font-semibold ${
                soundOn ? 'tabletop-chip-active' : ''
              }`}
            >
              碁石音 {soundOn ? 'ON' : 'OFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-2 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        {/* Left: Evaluation + Board */}
        <div className="flex min-w-0 flex-col gap-3">
          <section className="tabletop-panel p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="tabletop-stat flex min-w-0 items-center gap-2.5 px-2.5 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#7d7468] bg-gradient-to-br from-[#45413a] to-[#0d0c0a] text-[10px] font-black text-[#f4ead8]">
                  ●
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#d8cbb8]">
                    黒（先手）{mode === 'cpu' ? (humanSide === 1 ? '・あなた' : '・CPU') : '・P1'}
                  </p>
                  <p className="font-mono text-[11px] text-[#dfb06d]">
                    活四 {blackAnalysis.openFours} / 四 {blackAnalysis.halfFours} / 活三{' '}
                    {blackAnalysis.openThrees}
                  </p>
                </div>
              </div>

              <div className="order-last w-full sm:order-none sm:w-auto">
                <div
                  className={`mx-auto w-fit rounded-md border px-3 py-1.5 text-center text-xs font-semibold ${
                    winInfo
                      ? 'border-[#8a5b36] bg-[#2c2118] text-[#e6c48f]'
                      : 'border-[#4d3d2d] bg-[#211a15] text-[#d8cbb8]'
                  }`}
                >
                  {winInfo ? (
                    <>
                      {winInfo.winner === 1 ? '黒（先手）' : '白（後手）'}の五連達成・勝利（
                      {moves.length}手）
                    </>
                  ) : isDraw ? (
                    <>満局・引き分け</>
                  ) : isCpuTurn ? (
                    <span className="text-[#dfb06d]">CPU が筋を読んでいます...</span>
                  ) : (
                    <>
                      第{moves.length + 1}手: {turn === 1 ? '● 黒（先手）' : '○ 白（後手）'}
                    </>
                  )}
                </div>
              </div>

              <div className="tabletop-stat flex min-w-0 items-center gap-2.5 px-2.5 py-2">
                <div className="min-w-0 text-right">
                  <p className="truncate text-[11px] font-semibold text-[#d8cbb8]">
                    白（後手）{mode === 'cpu' ? (humanSide === 2 ? '・あなた' : '・CPU') : '・P2'}
                  </p>
                  <p className="font-mono text-[11px] text-[#9db8cd]">
                    活四 {whiteAnalysis.openFours} / 四 {whiteAnalysis.halfFours} / 活三{' '}
                    {whiteAnalysis.openThrees}
                  </p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e5dccb] bg-gradient-to-br from-[#fffaf0] to-[#d8c8ad] text-[10px] font-black text-[#2a241d]">
                  ○
                </span>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-medium text-[#b9a88f]">
                <span>形勢: 黒 {advantagePercent}%</span>
                <span>総手数 {moves.length}</span>
                <span>白 {100 - advantagePercent}%</span>
              </div>
              <div className="mt-1.5 flex h-2 overflow-hidden rounded-full border border-[#5a4a37] bg-[#e9ddc8]">
                <div
                  className="bg-[#1b1712] transition-all duration-300"
                  style={{ width: `${advantagePercent}%` }}
                />
              </div>
            </div>

            {!gameOver && activeAlerts.length > 0 && (
              <div className="mt-2.5 rounded-md border border-[#8a5b36] bg-[#2c2118] px-3 py-2 text-xs font-medium text-[#e6c48f]">
                <span className="font-semibold">リーチ・急所検知:</span>{' '}
                {activeAlerts.slice(0, 3).join(' ／ ')}
              </div>
            )}
          </section>

          {/* Kaya Wood Board */}
          <div className="tabletop-board-frame mx-auto w-full max-w-[620px] p-1.5 sm:p-3">
            <div className="overflow-hidden rounded-md border border-[#6b4a26] bg-gradient-to-br from-[#e2b46d] via-[#d5a153] to-[#c48d3f] p-1 shadow-inner sm:p-2">
              <svg
                viewBox="0 0 640 640"
                className="aspect-square w-full touch-manipulation select-none"
                role="img"
                aria-label="五目並べ 15×15 碁盤"
              >
                <defs>
                  <radialGradient id="blackStoneGrad" cx="32%" cy="30%" r="68%">
                    <stop offset="0%" stopColor="#4b5563" />
                    <stop offset="45%" stopColor="#1f2937" />
                    <stop offset="100%" stopColor="#030712" />
                  </radialGradient>
                  <radialGradient id="whiteStoneGrad" cx="32%" cy="30%" r="68%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="65%" stopColor="#f1f5f9" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                  </radialGradient>
                  <filter id="stoneShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="1.5" dy="2.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.42" />
                  </filter>
                </defs>

                {COL_LABELS.map((lbl, idx) => (
                  <g key={`col-${lbl}`}>
                    <text x={toPos(idx)} y={19} textAnchor="middle" fontSize="12" fontWeight="800" fill="#3b230d">
                      {lbl}
                    </text>
                    <text x={toPos(idx)} y={630} textAnchor="middle" fontSize="12" fontWeight="800" fill="#3b230d">
                      {lbl}
                    </text>
                  </g>
                ))}
                {Array.from({ length: SIZE }, (_, idx) => (
                  <g key={`row-${idx}`}>
                    <text x={16} y={toPos(idx) + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#3b230d">
                      {idx + 1}
                    </text>
                    <text x={623} y={toPos(idx) + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#3b230d">
                      {idx + 1}
                    </text>
                  </g>
                ))}

                {Array.from({ length: SIZE }, (_, idx) => (
                  <g key={`line-${idx}`}>
                    <line
                      x1={toPos(0)}
                      y1={toPos(idx)}
                      x2={toPos(SIZE - 1)}
                      y2={toPos(idx)}
                      stroke="#2e1a08"
                      strokeWidth={idx === 0 || idx === SIZE - 1 ? 2.2 : 1.25}
                    />
                    <line
                      x1={toPos(idx)}
                      y1={toPos(0)}
                      x2={toPos(idx)}
                      y2={toPos(SIZE - 1)}
                      stroke="#2e1a08"
                      strokeWidth={idx === 0 || idx === SIZE - 1 ? 2.2 : 1.25}
                    />
                  </g>
                ))}

                {STAR_POINTS.map(([sr, sc]) => (
                  <circle
                    key={`star-${sr}-${sc}`}
                    cx={toPos(sc)}
                    cy={toPos(sr)}
                    r={sr === 7 && sc === 7 ? 4.8 : 4.0}
                    fill="#231305"
                  />
                ))}

                {winInfo && (
                  <line
                    x1={toPos(winInfo.line[0][1])}
                    y1={toPos(winInfo.line[0][0])}
                    x2={toPos(winInfo.line[winInfo.line.length - 1][1])}
                    y2={toPos(winInfo.line[winInfo.line.length - 1][0])}
                    stroke="#a9443c"
                    strokeWidth="6"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                )}

                {hintSpot && !gameOver && (
                  <g>
                    <circle
                      cx={toPos(hintSpot[1])}
                      cy={toPos(hintSpot[0])}
                      r={16}
                      fill="none"
                      stroke="#c99555"
                      strokeWidth="3.5"
                      strokeDasharray="5 3"
                    />
                    <circle cx={toPos(hintSpot[1])} cy={toPos(hintSpot[0])} r={6} fill="#dfb06d" />
                  </g>
                )}

                {hoveredCoord &&
                  !gameOver &&
                  !isCpuTurn &&
                  board[hoveredCoord[0]][hoveredCoord[1]] === 0 && (
                    <circle
                      cx={toPos(hoveredCoord[1])}
                      cy={toPos(hoveredCoord[0])}
                      r={16.5}
                      fill={turn === 1 ? '#111827' : '#f8fafc'}
                      opacity={0.42}
                    />
                  )}

                {board.map((row, r) =>
                  row.map((cell, c) => {
                    if (cell === 0) return null;
                    const key = `${r}-${c}`;
                    const isLast = lastMove?.r === r && lastMove?.c === c;
                    const isWinStone = winCellSet.has(key);
                    const mNum = moveNumberMap.get(key);

                    return (
                      <g key={`stone-${key}`}>
                        {isWinStone && (
                          <circle
                            cx={toPos(c)}
                            cy={toPos(r)}
                            r={19.5}
                            fill="none"
                            stroke="#dfb06d"
                            strokeWidth="3.5"
                          />
                        )}
                        <circle
                          cx={toPos(c)}
                          cy={toPos(r)}
                          r={17.2}
                          fill={cell === 1 ? 'url(#blackStoneGrad)' : 'url(#whiteStoneGrad)'}
                          filter="url(#stoneShadow)"
                        />
                        {showMoveNumbers && mNum !== undefined ? (
                          <text
                            x={toPos(c)}
                            y={toPos(r) + 4}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="800"
                            fill={cell === 1 ? '#f8fafc' : '#0f172a'}
                          >
                            {mNum}
                          </text>
                        ) : (
                          isLast && (
                            <circle cx={toPos(c)} cy={toPos(r)} r={4.5} fill="#a9443c" />
                          )
                        )}
                      </g>
                    );
                  })
                )}

                {rippleSpot && (
                  <circle
                    key={rippleSpot.key}
                    cx={toPos(rippleSpot.c)}
                    cy={toPos(rippleSpot.r)}
                    r={22}
                    fill="none"
                    stroke="#dfb06d"
                    strokeWidth="2"
                    opacity="0.7"
                  />
                )}

                {board.map((row, r) =>
                  row.map((_, c) => (
                    <rect
                      key={`hit-${r}-${c}`}
                      x={toPos(c) - STEP / 2}
                      y={toPos(r) - STEP / 2}
                      width={STEP}
                      height={STEP}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredCoord([r, c])}
                      onMouseLeave={() => setHoveredCoord(null)}
                      onClick={() => handleIntersectionClick(r, c)}
                    >
                      <title>{`${COL_LABELS[c]}${r + 1}`}</title>
                    </rect>
                  ))
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <aside className="flex min-w-0 flex-col gap-3">
          <div className="tabletop-panel p-3.5">
            <p className="tabletop-kicker">Match Actions</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={moves.length === 0 || isCpuTurn}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-2 text-xs disabled:cursor-not-allowed disabled:opacity-45"
              >
                待った
              </button>
              <button
                type="button"
                onClick={handleHint}
                disabled={gameOver || isCpuTurn}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-2 text-xs text-[#dfb06d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                AI推奨手
              </button>
              <button
                type="button"
                onClick={() => resetGame()}
                className="tabletop-button-primary inline-flex min-h-11 items-center justify-center px-2 text-xs"
              >
                新規対局
              </button>
            </div>
            {hintSpot && (
              <p className="tabletop-panel-soft mt-2 px-2.5 py-1.5 text-xs font-medium text-[#e6c48f]">
                AI推奨手: 交点{' '}
                <span className="font-mono">
                  {COL_LABELS[hintSpot[1]]}
                  {hintSpot[0] + 1}
                </span>
              </p>
            )}
          </div>

          <div className="tabletop-panel p-3.5">
            <p className="tabletop-kicker">Game Mode / 対局設定</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => resetGame('cpu', difficulty, humanSide)}
                aria-pressed={mode === 'cpu'}
                className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                  mode === 'cpu' ? 'tabletop-chip-active' : ''
                }`}
              >
                CPU対戦
              </button>
              <button
                type="button"
                onClick={() => resetGame('pvp', difficulty, humanSide)}
                aria-pressed={mode === 'pvp'}
                className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                  mode === 'pvp' ? 'tabletop-chip-active' : ''
                }`}
              >
                1台で2人対戦
              </button>
            </div>

            {mode === 'cpu' && (
              <>
                <p className="mt-3 text-[11px] font-semibold text-[#b9a88f]">
                  CPUの強さ（活四・活三・四三評価）
                </p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['easy', '初級'],
                      ['normal', '中級'],
                      ['hard', '上級'],
                    ] as const
                  ).map(([lv, label]) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => resetGame('cpu', lv, humanSide)}
                      aria-pressed={difficulty === lv}
                      className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-1.5 text-xs font-semibold ${
                        difficulty === lv ? 'tabletop-chip-active' : ''
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-[11px] font-semibold text-[#b9a88f]">あなたの手番</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => resetGame('cpu', difficulty, 1)}
                    aria-pressed={humanSide === 1}
                    className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                      humanSide === 1 ? 'tabletop-chip-active' : ''
                    }`}
                  >
                    ● 黒（先手）
                  </button>
                  <button
                    type="button"
                    onClick={() => resetGame('cpu', difficulty, 2)}
                    aria-pressed={humanSide === 2}
                    className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                      humanSide === 2 ? 'tabletop-chip-active' : ''
                    }`}
                  >
                    ○ 白（後手）
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Move Record */}
          <div className="tabletop-panel p-3.5">
            <div className="flex items-center justify-between">
              <p className="tabletop-kicker">Move Record / 棋譜</p>
              <span className="font-mono text-[11px] text-[#b9a88f]">{moves.length} 手</span>
            </div>
            <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1 text-[11px]">
              {moves.length === 0 ? (
                <span className="text-[#8f806d]">
                  まだ着手されていません（中央 H8 天元が定石です）
                </span>
              ) : (
                moves.map((m) => (
                  <span
                    key={m.moveNum}
                    className={`rounded border px-2 py-0.5 font-mono ${
                      m.player === 1
                        ? 'border-[#5a4a37] bg-[#2a211a] text-[#f4ead8]'
                        : 'border-[#d8c7a8] bg-[#efe4cf] text-[#211d18]'
                    }`}
                  >
                    {m.moveNum}.{m.player === 1 ? '●' : '○'}
                    {COL_LABELS[m.c]}
                    {m.r + 1}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Tactics */}
          <div className="tabletop-panel-soft p-3.5 text-xs leading-relaxed">
            <p className="tabletop-kicker">Gomoku Tactics</p>
            <ul className="mt-2 space-y-2 text-[11px] text-[#b9a88f]">
              <li>
                <strong className="font-semibold text-[#dfb06d]">活四（両側空き4連）：</strong>
                片方を止められても反対側で5連になるため、作った時点で必勝です。
              </li>
              <li>
                <strong className="font-semibold text-[#dfb06d]">活三（両側空き3連）：</strong>
                放置すると活四になるため、相手は必ず受けなければなりません。
              </li>
              <li>
                <strong className="font-semibold text-[#dfb06d]">四三・三々：</strong>
                1手で2方向の狙いを同時に作る決め手です。相手は片方しか防げません。
              </li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
