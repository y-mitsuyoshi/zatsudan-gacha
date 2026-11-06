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
    <div className="min-h-screen bg-[#0b0907] text-stone-100 select-none">
      {/* Header */}
      <header className="border-b border-amber-500/20 bg-[#14100c]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/games"
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-stone-200 transition hover:border-amber-400/50 hover:text-amber-200"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-amber-400">
                CLASSIC STRATEGY / 15×15 GOMOKU
              </p>
              <h2 className="text-sm font-black sm:text-lg">
                五目並べ（15×15 連珠・五目戦略盤）
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMoveNumbers((v) => !v)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                showMoveNumbers
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                  : 'border-white/15 bg-white/[0.05] text-stone-300'
              }`}
            >
              {showMoveNumbers ? '🔢 手数表示 ON' : '🔢 手数表示 OFF'}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-stone-200 transition hover:border-amber-400/50"
            >
              {soundOn ? '🔊 碁石音 ON' : '🔇 碁石音 OFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_350px]">
        {/* Left: Evaluation Bar + 15x15 Kaya Wood Board */}
        <div className="flex flex-col gap-3">
          {/* Real-time 形勢判断・リーチ検知バー */}
          <div className="rounded-2xl border border-amber-500/25 bg-[#17120d]/95 p-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-600 bg-stone-950 text-xs font-black text-white shadow">
                  ●
                </span>
                <div>
                  <p className="text-xs font-bold text-stone-200">
                    黒（先手）{mode === 'cpu' ? (humanSide === 1 ? '・あなた' : '・CPU') : '・P1'}
                  </p>
                  <p className="font-mono text-[11px] text-amber-300">
                    活四:{blackAnalysis.openFours} / 四:{blackAnalysis.halfFours} / 活三:{blackAnalysis.openThrees}
                  </p>
                </div>
              </div>

              <div className="rounded-full border border-amber-400/35 bg-amber-950/50 px-3.5 py-1 text-center">
                {winInfo ? (
                  <span className="text-xs font-black text-amber-300">
                    🏆 {winInfo.winner === 1 ? '黒（先手）' : '白（後手）'}の五連達成・勝利！（{moves.length}手）
                  </span>
                ) : isDraw ? (
                  <span className="text-xs font-black text-stone-200">満局・引き分け！</span>
                ) : isCpuTurn ? (
                  <span className="text-xs font-black text-amber-300">CPUが筋を読んでいます...</span>
                ) : (
                  <span className="text-xs font-black text-amber-100">
                    第{moves.length + 1}手：{turn === 1 ? '● 黒（先手）' : '○ 白（後手）'}の手番
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-right">
                <div>
                  <p className="text-xs font-bold text-stone-200">
                    白（後手）{mode === 'cpu' ? (humanSide === 2 ? '・あなた' : '・CPU') : '・P2'}
                  </p>
                  <p className="font-mono text-[11px] text-sky-300">
                    活四:{whiteAnalysis.openFours} / 四:{whiteAnalysis.halfFours} / 活三:{whiteAnalysis.openThrees}
                  </p>
                </div>
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-stone-100 text-xs font-black text-stone-900 shadow">
                  ○
                </span>
              </div>
            </div>

            {/* 形勢判断バー */}
            <div className="mt-2.5">
              <div className="flex justify-between text-[10px] font-bold text-stone-400">
                <span>形勢判断：黒 {advantagePercent}%</span>
                <span>総手数 {moves.length} 手</span>
                <span>白 {100 - advantagePercent}%</span>
              </div>
              <div className="mt-1 flex h-2.5 overflow-hidden rounded-full border border-white/15 bg-stone-200">
                <div
                  className="bg-stone-950 transition-all duration-300"
                  style={{ width: `${advantagePercent}%` }}
                />
              </div>
            </div>

            {/* リーチ・活三アラート */}
            {!gameOver && activeAlerts.length > 0 && (
              <div className="mt-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200">
                ⚡ リーチ・急所検知：{activeAlerts.slice(0, 3).join(' ／ ')}
              </div>
            )}
          </div>

          {/* 15x15 Kaya-wood SVG Board */}
          <div className="mx-auto w-full max-w-[600px] overflow-hidden rounded-2xl border-2 border-[#5c3d1e] bg-gradient-to-br from-[#e2b46d] via-[#d5a153] to-[#c48d3f] p-2 shadow-2xl sm:p-3">
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

              {/* Coordinate Labels A-O and 1-15 */}
              {COL_LABELS.map((lbl, idx) => (
                <g key={`col-${lbl}`}>
                  <text
                    x={toPos(idx)}
                    y={19}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="800"
                    fill="#3b230d"
                  >
                    {lbl}
                  </text>
                  <text
                    x={toPos(idx)}
                    y={630}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="800"
                    fill="#3b230d"
                  >
                    {lbl}
                  </text>
                </g>
              ))}
              {Array.from({ length: SIZE }, (_, idx) => (
                <g key={`row-${idx}`}>
                  <text
                    x={16}
                    y={toPos(idx) + 4}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="800"
                    fill="#3b230d"
                  >
                    {idx + 1}
                  </text>
                  <text
                    x={623}
                    y={toPos(idx) + 4}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="800"
                    fill="#3b230d"
                  >
                    {idx + 1}
                  </text>
                </g>
              ))}

              {/* Grid Lines */}
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

              {/* 9 Star Points (星・天元) */}
              {STAR_POINTS.map(([sr, sc]) => (
                <circle
                  key={`star-${sr}-${sc}`}
                  cx={toPos(sc)}
                  cy={toPos(sr)}
                  r={sr === 7 && sc === 7 ? 4.8 : 4.0}
                  fill="#231305"
                />
              ))}

              {/* Winning 5-in-a-row Highlight Line */}
              {winInfo && (
                <line
                  x1={toPos(winInfo.line[0][1])}
                  y1={toPos(winInfo.line[0][0])}
                  x2={toPos(winInfo.line[winInfo.line.length - 1][1])}
                  y2={toPos(winInfo.line[winInfo.line.length - 1][0])}
                  stroke="#ef4444"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              )}

              {/* Hint Marker */}
              {hintSpot && !gameOver && (
                <g>
                  <circle
                    cx={toPos(hintSpot[1])}
                    cy={toPos(hintSpot[0])}
                    r={16}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="3.5"
                    strokeDasharray="5 3"
                  />
                  <circle
                    cx={toPos(hintSpot[1])}
                    cy={toPos(hintSpot[0])}
                    r={6}
                    fill="#f59e0b"
                  />
                </g>
              )}

              {/* Hover Ghost Stone */}
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

              {/* Placed Stones */}
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
                          stroke="#fbbf24"
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
                          <circle
                            cx={toPos(c)}
                            cy={toPos(r)}
                            r={4.5}
                            fill="#ef4444"
                          />
                        )
                      )}
                    </g>
                  );
                })
              )}

              {/* Visual Ripple on Last Placed Stone */}
              {rippleSpot && (
                <circle
                  key={rippleSpot.key}
                  cx={toPos(rippleSpot.c)}
                  cy={toPos(rippleSpot.r)}
                  r={22}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  opacity="0.7"
                />
              )}

              {/* Interactive Clickable Intersection Targets */}
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

        {/* Right Sidebar: Controls & Strategy */}
        <aside className="flex flex-col gap-3">
          {/* Match Actions */}
          <div className="rounded-2xl border border-amber-500/25 bg-[#17120d]/95 p-3.5">
            <p className="text-[10px] font-black tracking-[0.18em] text-amber-400">
              MATCH ACTIONS
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={moves.length === 0 || isCpuTurn}
                className="rounded-xl border border-white/15 bg-white/[0.05] px-2 py-2.5 text-xs font-bold text-stone-100 transition hover:border-amber-400/50 disabled:opacity-40"
              >
                ↩ 待った
              </button>
              <button
                type="button"
                onClick={handleHint}
                disabled={gameOver || isCpuTurn}
                className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-2 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-40"
              >
                💡 AI推奨手
              </button>
              <button
                type="button"
                onClick={() => resetGame()}
                className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-2 py-2.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/25"
              >
                🔄 新規対局
              </button>
            </div>
            {hintSpot && (
              <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-200">
                AI推奨手: 交点 <span className="font-mono">{COL_LABELS[hintSpot[1]]}{hintSpot[0] + 1}</span>
              </p>
            )}
          </div>

          {/* Mode & Difficulty */}
          <div className="rounded-2xl border border-white/10 bg-[#17120d]/95 p-3.5">
            <p className="text-[10px] font-black tracking-[0.18em] text-amber-400">
              GAME MODE / 対局設定
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => resetGame('cpu', difficulty, humanSide)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  mode === 'cpu'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                    : 'border-white/10 bg-white/[0.04] text-stone-300'
                }`}
              >
                🤖 CPU対戦
              </button>
              <button
                type="button"
                onClick={() => resetGame('pvp', difficulty, humanSide)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  mode === 'pvp'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                    : 'border-white/10 bg-white/[0.04] text-stone-300'
                }`}
              >
                👥 1台で2人対戦
              </button>
            </div>

            {mode === 'cpu' && (
              <>
                <p className="mt-3 text-[10px] font-black tracking-[0.18em] text-stone-400">
                  CPU強さ（活四・活三・四三評価AI）
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
                      className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                        difficulty === lv
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-white/10 bg-white/[0.04] text-stone-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-[10px] font-black tracking-[0.18em] text-stone-400">
                  あなたの手番
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => resetGame('cpu', difficulty, 1)}
                    className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                      humanSide === 1
                        ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                        : 'border-white/10 bg-white/[0.04] text-stone-300'
                    }`}
                  >
                    ● 黒（先手）
                  </button>
                  <button
                    type="button"
                    onClick={() => resetGame('cpu', difficulty, 2)}
                    className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                      humanSide === 2
                        ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                        : 'border-white/10 bg-white/[0.04] text-stone-300'
                    }`}
                  >
                    ○ 白（後手）
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Move History Log */}
          <div className="rounded-2xl border border-white/10 bg-[#17120d]/95 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black tracking-[0.18em] text-amber-400">
                MOVE RECORD / 棋譜ログ
              </p>
              <span className="font-mono text-[11px] text-stone-400">{moves.length} 手</span>
            </div>
            <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto pr-1 text-[11px]">
              {moves.length === 0 ? (
                <span className="text-stone-500">まだ着手されていません（中央 H8 天元からの着手が定石です）</span>
              ) : (
                moves.map((m) => (
                  <span
                    key={m.moveNum}
                    className={`rounded border px-2 py-0.5 font-mono ${
                      m.player === 1
                        ? 'border-stone-700 bg-stone-900 text-stone-200'
                        : 'border-stone-400/40 bg-stone-200 text-stone-900'
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

          {/* Gomoku Tactical Guide */}
          <div className="rounded-2xl border border-white/10 bg-[#17120d]/95 p-3.5 text-xs leading-relaxed text-stone-300">
            <p className="text-[10px] font-black tracking-[0.18em] text-amber-400">
              GOMOKU TACTICS / 勝ち筋の基本
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] text-stone-400">
              <li>
                <strong className="text-amber-200">・活四（両側が空いた4連）：</strong>
                片方を止められても反対側で5連になるため、作った時点で必勝となります。
              </li>
              <li>
                <strong className="text-amber-200">・活三（両側が空いた3連）：</strong>
                次に放置すると「活四」になるため、相手は必ず受けなければなりません。
              </li>
              <li>
                <strong className="text-amber-200">・四三（しさん）・三々：</strong>
                1手で2方向の狙いを同時に作る決め手です。相手は片方しか防げません。
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
