"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FLOORS, GAME_BOARD, RANKS } from '@/lib/sugoroku-logic';
import { BoardSquare, Effect, Job, SquareType, Stance } from '@/types/sugoroku';
import { PlayerToken } from './PlayerToken';
import { GateArchIcon, SquareTypeIcon } from './SugorokuIcons';

interface GameBoardProps {
  position: number;
  playerName: string;
  job?: Job | string;
  previousPosition?: number;
  isMoving?: boolean;
  visited?: number[];
  stance?: Stance;
  diceBoost?: number;
  slowNextTurn?: boolean;
  rankIndex?: number;
  career?: number;
}

interface TypeVisual {
  label: string;
  topBg: string;
  lipBorder: string;
  iconBg: string;
  iconColor: string;
  badgeClass: string;
}

const TYPE_VISUALS: Record<SquareType, TypeVisual> = {
  start: {
    label: '出社ゲート',
    topBg: 'bg-gradient-to-b from-[#e4f3ee] to-[#cde7de] dark:from-[#16332c] dark:to-[#112621]',
    lipBorder: 'border-[#1f6f5c] border-b-[#124539]',
    iconBg: 'bg-[#1f6f5c] text-[#fffaf0]',
    iconColor: 'text-[#1f6f5c] dark:text-[#7adbc2]',
    badgeClass: 'bg-[#1f6f5c] text-white',
  },
  goal: {
    label: '決算ゴール',
    topBg: 'bg-gradient-to-b from-[#fff3cf] via-[#fde396] to-[#f5ca5c] dark:from-[#4a3710] dark:via-[#3b2b0c] dark:to-[#2b1f08]',
    lipBorder: 'border-[#b57c1e] border-b-[#784f0d]',
    iconBg: 'bg-[#b57c1e] text-[#fffaf0]',
    iconColor: 'text-[#8c5d0f] dark:text-[#f7cf68]',
    badgeClass: 'bg-[#b57c1e] text-white',
  },
  salary: {
    label: '給料・賞与',
    topBg: 'bg-gradient-to-b from-[#fef7e2] to-[#f8e7b8] dark:from-[#362b14] dark:to-[#271e0d]',
    lipBorder: 'border-[#c9922e] border-b-[#8a6116]',
    iconBg: 'bg-[#c9922e] text-[#12100d]',
    iconColor: 'text-[#9c6d16] dark:text-[#f2c464]',
    badgeClass: 'bg-[#c9922e] text-[#12100d]',
  },
  item: {
    label: '支給・発見',
    topBg: 'bg-gradient-to-b from-[#e9f5ec] to-[#d2ead8] dark:from-[#183024] dark:to-[#12241b]',
    lipBorder: 'border-[#2d7a4f] border-b-[#1c5233]',
    iconBg: 'bg-[#2d7a4f] text-white',
    iconColor: 'text-[#23633f] dark:text-[#84dfb0]',
    badgeClass: 'bg-[#2d7a4f] text-white',
  },
  decision: {
    label: '重要決断',
    topBg: 'bg-gradient-to-b from-[#e6f0fa] to-[#cfe2f5] dark:from-[#172a3d] dark:to-[#112030]',
    lipBorder: 'border-[#1d5e96] border-b-[#123d63]',
    iconBg: 'bg-[#1d5e96] text-white',
    iconColor: 'text-[#1d5e96] dark:text-[#82bef5]',
    badgeClass: 'bg-[#1d5e96] text-white',
  },
  'job-specific': {
    label: '職種イベント',
    topBg: 'bg-gradient-to-b from-[#f3ecf9] to-[#e4d6f2] dark:from-[#291d38] dark:to-[#1e1529]',
    lipBorder: 'border-[#6b4696] border-b-[#462b66]',
    iconBg: 'bg-[#6b4696] text-white',
    iconColor: 'text-[#5b3884] dark:text-[#c9a9f0]',
    badgeClass: 'bg-[#6b4696] text-white',
  },
  chance: {
    label: '運命抽選',
    topBg: 'bg-gradient-to-b from-[#fff0e0] to-[#f9dec0] dark:from-[#382313] dark:to-[#29190d]',
    lipBorder: 'border-[#c96a22] border-b-[#874310]',
    iconBg: 'bg-[#c96a22] text-white',
    iconColor: 'text-[#b05816] dark:text-[#f5aa6e]',
    badgeClass: 'bg-[#c96a22] text-white',
  },
  event: {
    label: '業務イベント',
    topBg: 'bg-gradient-to-b from-[#fbede9] to-[#f5d8d0] dark:from-[#331a17] dark:to-[#241210]',
    lipBorder: 'border-[#b23a2a] border-b-[#782216]',
    iconBg: 'bg-[#b23a2a] text-white',
    iconColor: 'text-[#9e2f20] dark:text-[#f29b8f]',
    badgeClass: 'bg-[#b23a2a] text-white',
  },
  normal: {
    label: '休憩・日常',
    topBg: 'bg-gradient-to-b from-[#faf6ee] to-[#efe6d5] dark:from-[#26221c] dark:to-[#1c1914]',
    lipBorder: 'border-[#8a7d69] border-b-[#594f40]',
    iconBg: 'bg-[#6e6250] text-white',
    iconColor: 'text-[#5c5141] dark:text-[#cfc2ad]',
    badgeClass: 'bg-[#6e6250] text-white',
  },
};

function summarizeSquareEffect(square: BoardSquare, playerJob?: Job): { text: string; positive: boolean } | null {
  if (square.type === 'decision') {
    return { text: '3択の決断', positive: true };
  }
  if (square.type === 'goal') {
    return { text: '完走ボーナス', positive: true };
  }
  if (square.type === 'chance') {
    return { text: `当たり${Math.round((square.random?.chance ?? 0.5) * 100)}%`, positive: true };
  }

  const jobOutcome = playerJob && square.jobOutcomes?.[playerJob];
  const eff: Effect | undefined = jobOutcome?.effect ?? square.outcome?.effect;
  if (!eff) return null;

  const parts: string[] = [];
  if (eff.move) parts.push(eff.move > 0 ? `+${eff.move}進` : `${eff.move}戻`);
  if (eff.career) parts.push(`評${eff.career > 0 ? '+' : ''}${eff.career}`);
  if (eff.money) parts.push(`+${eff.money}万`);
  if (eff.yaruki) parts.push(`気${eff.yaruki > 0 ? '+' : ''}${eff.yaruki}`);
  if (eff.rest) parts.push(`${eff.rest}休`);
  if (eff.item) parts.push('支給品');

  if (parts.length === 0) return null;
  const positive =
    (eff.move ?? 0) > 0 ||
    (eff.yaruki ?? 0) > 0 ||
    (eff.money ?? 0) > 0 ||
    (eff.career ?? 0) > 0 ||
    Boolean(eff.item);

  return { text: parts.slice(0, 2).join('・'), positive };
}

function buildSerpentineRows(squares: BoardSquare[], cols: number): { rowSquares: BoardSquare[]; reversed: boolean }[] {
  const rows: { rowSquares: BoardSquare[]; reversed: boolean }[] = [];
  for (let i = 0; i < squares.length; i += cols) {
    const chunk = squares.slice(i, i + cols);
    const rowIndex = Math.floor(i / cols);
    const reversed = rowIndex % 2 === 1;
    rows.push({
      rowSquares: reversed ? [...chunk].reverse() : chunk,
      reversed,
    });
  }
  return rows;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  position,
  playerName,
  job = '営業',
  isMoving = false,
  visited = [],
  stance = 'teiji',
  diceBoost = 0,
  slowNextTurn = false,
  rankIndex = 0,
  career = 0,
}) => {
  const validJob = (job in {
    '営業': 1,
    'エンジニア': 1,
    'デザイナー': 1,
    '企画・マーケティング': 1,
    '人事・総務': 1,
    '経理・財務': 1,
    '法務・コンプラ': 1,
    '広報・PR': 1,
    '品質保証': 1,
    '総合職': 1,
  }
    ? job
    : '営業') as Job;

  const [viewMode, setViewMode] = useState<'floor' | 'overview'>('floor');
  const [autoFollow, setAutoFollow] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<number>(position);

  const visitedSet = useMemo(() => new Set([...visited, position]), [position, visited]);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef(position);

  // プレイヤー位置が変わったら選択中マスも現在地に同期
  useEffect(() => {
    setSelectedPosition(position);
    if (lastPositionRef.current === position) return;
    lastPositionRef.current = position;
    if (!autoFollow) return;

    const activeTiles = boardContainerRef.current?.querySelectorAll('[data-active="true"]') ?? [];
    const activeTile = Array.from(activeTiles).find(
      (tile) => tile instanceof HTMLElement && tile.offsetParent !== null,
    );
    activeTile?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [position, autoFollow]);

  const scrollToCurrentPosition = () => {
    setSelectedPosition(position);
    const activeTiles = boardContainerRef.current?.querySelectorAll('[data-active="true"]') ?? [];
    const activeTile = Array.from(activeTiles).find(
      (tile) => tile instanceof HTMLElement && tile.offsetParent !== null,
    );
    activeTile?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // 次の1ターンで到達しうるマスと必要ダイス目
  const reachableMap = useMemo(() => {
    const map = new Map<number, string>();
    if (position >= 60) return map;
    if (slowNextTurn) {
      map.set(Math.min(60, position + 1), '1');
      return map;
    }
    const minRoll = stance === 'zangyo' ? 2 : 1;
    const maxRoll = stance === 'zangyo' ? 12 : 6;
    for (let r = minRoll; r <= maxRoll; r++) {
      const target = Math.min(60, position + r + diceBoost);
      if (!map.has(target)) {
        map.set(target, `${r}`);
      }
    }
    return map;
  }, [position, stance, diceBoost, slowNextTurn]);

  const inspectedSquare = useMemo(
    () => GAME_BOARD.find((s) => s.position === selectedPosition) ?? GAME_BOARD[0],
    [selectedPosition],
  );
  const inspectedVisual = TYPE_VISUALS[inspectedSquare.type];
  const inspectedGate = RANKS.find((r) => r.gatePosition > 0 && r.gatePosition === inspectedSquare.position);
  const inspectedJobBonus = inspectedSquare.jobOutcomes?.[validJob];
  const currentRank = RANKS[rankIndex] ?? RANKS[0];

  const renderTile = (square: BoardSquare, nextPosInRow: number | null, rowReversed: boolean) => {
    const visual = TYPE_VISUALS[square.type];
    const isActive = square.position === position;
    const isSelected = square.position === selectedPosition;
    const isVisited = visitedSet.has(square.position);
    const reachRoll = reachableMap.get(square.position);
    const gateRank = RANKS.find((r) => r.gatePosition > 0 && r.gatePosition === square.position);
    const hasMyJobBonus = Boolean(square.jobOutcomes?.[validJob]);
    const summary = summarizeSquareEffect(square, validJob);
    const isConnectedRight =
      nextPosInRow !== null && Math.abs(nextPosInRow - square.position) === 1;

    return (
      <li
        key={square.position}
        className="relative flex items-stretch"
        aria-current={isActive ? 'step' : undefined}
        data-active={isActive ? 'true' : undefined}
      >
        {/* 横方向の線路・通路コネクタ */}
        {isConnectedRight && (
          <div
            className="pointer-events-none absolute -right-2.5 top-1/2 z-0 flex h-3 w-4 -translate-y-1/2 items-center justify-center"
            aria-hidden="true"
          >
            <div
              className={`h-1.5 w-full rounded-full ${
                visitedSet.has(square.position) && visitedSet.has(nextPosInRow)
                  ? 'bg-[#c9922e]'
                  : 'bg-[#8a7d69]/45'
              }`}
            />
            <span className="absolute text-[9px] font-black text-[#5c5141] dark:text-[#d8c8aa]">
              {rowReversed ? '◀' : '▶'}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSelectedPosition(square.position)}
          title={`${square.position}マス目: ${square.title} — ${square.description}`}
          className={`group relative z-10 flex min-h-[92px] w-full min-w-0 flex-col justify-between rounded-lg border-2 border-b-[5px] p-2 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9922e] sm:min-h-[108px] sm:p-2.5 ${visual.topBg} ${visual.lipBorder} ${
            isActive
              ? 'z-20 -translate-y-1 ring-2 ring-[#12100d] shadow-[0_8px_18px_rgba(0,0,0,0.32)] dark:ring-[#f5ca5c]'
              : isSelected
                ? '-translate-y-0.5 ring-2 ring-[#c9922e] shadow-md'
                : reachRoll
                  ? 'hover:-translate-y-0.5 ring-1 ring-[#c9922e]/70 shadow-sm'
                  : isVisited
                    ? 'opacity-90 hover:opacity-100'
                    : 'hover:-translate-y-0.5 hover:shadow-md'
          }`}
        >
          {/* 昇進査定ゲートアーチ */}
          {gateRank && (
            <div className="mb-1 flex items-center justify-between gap-1 rounded bg-[#12100d] px-1.5 py-0.5 text-[8px] font-black tracking-tight text-[#f5ca5c]">
              <span className="inline-flex items-center gap-0.5 truncate">
                <GateArchIcon size={10} />
                {gateRank.name}査定
              </span>
              <span className="shrink-0">評{gateRank.requiredCareer}+</span>
            </div>
          )}

          {/* 上段: マス番号 + アイコン + 出目予測バッジ */}
          <div className="flex items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1">
              <span className="rounded bg-[#12100d]/85 px-1.5 py-0.5 font-mono text-[10px] font-black leading-none text-[#fffaf0]">
                {String(square.position).padStart(2, '0')}
              </span>
              {hasMyJobBonus && (
                <span
                  className="rounded bg-[#6b4696] px-1 py-0.5 text-[8px] font-black leading-none text-white"
                  title={`${validJob}の特効イベントマス`}
                >
                  特効
                </span>
              )}
            </span>

            <div className="flex items-center gap-1">
              {reachRoll && !isActive && (
                <span
                  className="rounded-full border border-[#12100d] bg-[#f5ca5c] px-1.5 py-0.5 font-mono text-[8px] font-black leading-none text-[#12100d] shadow-xs"
                  title={`出目 ${reachRoll} で到達`}
                >
                  出目{reachRoll}
                </span>
              )}
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md shadow-xs ${visual.iconBg}`}
              >
                <SquareTypeIcon type={square.type} size={14} />
              </span>
            </div>
          </div>

          {/* 中段: マス短縮名・タイトル */}
          <div className="my-1">
            <p className="line-clamp-1 text-[11px] font-black leading-tight text-[#12100d] sm:text-xs dark:text-[#fffaf0]">
              {square.short || square.title}
            </p>
            <p className="mt-0.5 hidden line-clamp-1 text-[9px] font-bold text-[#5c5141] sm:block dark:text-[#cfc2ad]">
              {square.title}
            </p>
          </div>

          {/* 下段: 効果サマリピル + 通過済マーク */}
          <div className="flex items-center justify-between gap-1">
            {summary ? (
              <span
                className={`inline-flex max-w-full truncate rounded px-1.5 py-0.5 text-[9px] font-black leading-none ${
                  summary.positive
                    ? 'bg-[#1f6f5c]/15 text-[#175445] dark:bg-[#1f6f5c]/35 dark:text-[#9ef0d8]'
                    : 'bg-[#b23a2a]/15 text-[#96291b] dark:bg-[#b23a2a]/35 dark:text-[#f7b1a6]'
                }`}
              >
                {summary.text}
              </span>
            ) : (
              <span className="text-[8px] font-bold text-[#6e6250] dark:text-[#b5a790]">
                {visual.label}
              </span>
            )}

            {isVisited && !isActive && (
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1f6f5c] text-[8px] font-black text-white"
                aria-label="通過済み"
              >
                済
              </span>
            )}
          </div>

          {/* プレイヤーの立体コマ */}
          {isActive && (
            <div className="pointer-events-none absolute -top-11 left-1/2 z-30 -translate-x-1/2">
              <PlayerToken
                playerName={playerName}
                job={validJob}
                isMoving={isMoving}
                rankName={currentRank.name}
              />
            </div>
          )}
        </button>
      </li>
    );
  };

  return (
    <div
      ref={boardContainerRef}
      className="relative overflow-hidden rounded-xl border-2 border-[#3b3022] bg-[#f4ece0] p-3 shadow-[0_10px_0_#261e14,0_16px_32px_rgba(0,0,0,0.28)] sm:p-5 dark:border-[#6e5a3e] dark:bg-[#181511]"
    >
      {/* 盤面背景の方眼・設計図テクスチャ */}
      <div
        className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,#8a7d6928_1px,transparent_1px),linear-gradient(to_bottom,#8a7d6928_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden="true"
      />

      {/* 盤面ヘッダー＆ビュー切替コントロール */}
      <div className="relative z-10 mb-4 flex flex-col gap-3 border-b-2 border-[#d4c4a8] pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#3b3226]">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#12100d] px-2 py-0.5 font-mono text-[10px] font-black tracking-widest text-[#f5ca5c]">
              TOWER ROUTE 60
            </span>
            <span className="text-xs font-bold text-[#6e6250] dark:text-[#b5a790]">
              現在地: {position} / 60マス（{currentRank.name}）
            </span>
          </div>
          <h2 className="font-editorial mt-1 text-xl font-black tracking-tight text-[#12100d] sm:text-2xl dark:text-[#fffaf0]">
            社畜キャリアタワー盤面図
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-[#8a7d69] bg-[#e6dac6] p-0.5 dark:border-[#4d4132] dark:bg-[#26211a]"
            role="group"
            aria-label="盤面表示モード切替"
          >
            <button
              type="button"
              onClick={() => setViewMode('floor')}
              className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-black transition ${
                viewMode === 'floor'
                  ? 'bg-[#12100d] text-[#fffaf0] shadow-xs dark:bg-[#f5ca5c] dark:text-[#12100d]'
                  : 'text-[#5c5141] hover:text-[#12100d] dark:text-[#cfc2ad]'
              }`}
            >
              立体フロア盤面
            </button>
            <button
              type="button"
              onClick={() => setViewMode('overview')}
              className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-black transition ${
                viewMode === 'overview'
                  ? 'bg-[#12100d] text-[#fffaf0] shadow-xs dark:bg-[#f5ca5c] dark:text-[#12100d]'
                  : 'text-[#5c5141] hover:text-[#12100d] dark:text-[#cfc2ad]'
              }`}
            >
              全60マス鳥瞰図
            </button>
          </div>

          <button
            type="button"
            onClick={scrollToCurrentPosition}
            className="min-h-[38px] rounded-lg border border-[#8a7d69] bg-[#fffaf0] px-3 py-1.5 text-xs font-black text-[#12100d] shadow-xs transition hover:bg-[#e8dcc8] dark:border-[#594d3b] dark:bg-[#2a241c] dark:text-[#fffaf0]"
          >
            現在地へフォーカス
          </button>

          <button
            type="button"
            onClick={() => setAutoFollow((prev) => !prev)}
            aria-pressed={autoFollow}
            className={`min-h-[38px] rounded-lg border px-2.5 py-1.5 text-xs font-black transition ${
              autoFollow
                ? 'border-[#1f6f5c] bg-[#1f6f5c]/15 text-[#1f6f5c] dark:text-[#7adbc2]'
                : 'border-[#8a7d69] bg-transparent text-[#6e6250]'
            }`}
          >
            追従 {autoFollow ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* マス詳細インスペクター（任意のマスをタップで詳細確認可能） */}
      <div
        className="relative z-10 mb-4 rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-3 shadow-sm dark:border-[#594b38] dark:bg-[#221d17]"
        aria-live="polite"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/15 shadow-xs ${inspectedVisual.iconBg}`}
            >
              <SquareTypeIcon type={inspectedSquare.type} size={22} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-[#12100d] px-2 py-0.5 font-mono text-[10px] font-black text-[#f5ca5c]">
                  #{String(inspectedSquare.position).padStart(2, '0')}
                </span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-black ${inspectedVisual.badgeClass}`}>
                  {inspectedVisual.label}
                </span>
                {inspectedSquare.position === position ? (
                  <span className="rounded bg-[#1f6f5c] px-2 py-0.5 text-[10px] font-black text-white">
                    現在地
                  </span>
                ) : inspectedSquare.position > position ? (
                  <span className="rounded border border-[#8a7d69] px-2 py-0.5 text-[10px] font-bold text-[#5c5141] dark:text-[#cfc2ad]">
                    現在地から +{inspectedSquare.position - position} マス
                  </span>
                ) : (
                  <span className="rounded border border-[#8a7d69] px-2 py-0.5 text-[10px] font-bold text-[#6e6250]">
                    通過エリア
                  </span>
                )}
                {inspectedGate && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#b57c1e] px-2 py-0.5 text-[10px] font-black text-white">
                    <GateArchIcon size={12} />
                    昇進査定ゲート：{inspectedGate.name}（必要評価 {inspectedGate.requiredCareer}pt）
                  </span>
                )}
              </div>
              <h3 className="mt-1 text-sm font-black text-[#12100d] sm:text-base dark:text-[#fffaf0]">
                {inspectedSquare.title}
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-[#5c5141] dark:text-[#cfc2ad]">
                {inspectedSquare.description}
              </p>
              {inspectedJobBonus && (
                <p className="mt-1 inline-block rounded border border-[#6b4696]/40 bg-[#6b4696]/10 px-2 py-0.5 text-[11px] font-black text-[#5b3884] dark:text-[#d7bcf7]">
                  ★ あなたの職種（{validJob}）特効：{inspectedJobBonus.text}
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right text-[10px] font-bold text-[#6e6250] dark:text-[#b5a790]">
            盤面のマスをクリックで詳細表示
          </div>
        </div>
      </div>

      {/* メイン盤面描画: 立体フロア盤面 or 全60マス鳥瞰図 */}
      {viewMode === 'floor' ? (
        <div className="relative z-10 space-y-4">
          {FLOORS.map((floor, floorIdx) => {
            const floorSquares = GAME_BOARD.filter(
              (s) => s.position >= floor.range[0] && s.position <= floor.range[1],
            );
            const isPlayerInFloor = position >= floor.range[0] && position <= floor.range[1];
            const visitedCount = floorSquares.filter((s) => visitedSet.has(s.position)).length;
            const floorProgress = Math.round((visitedCount / floorSquares.length) * 100);

            // デスクトップは5列の折り返し(蛇行)ルート、モバイルは3列の折り返しルート
            const desktopRows = buildSerpentineRows(floorSquares, 5);
            const mobileRows = buildSerpentineRows(floorSquares, 3);

            const gateInfo = floor.gatePos
              ? RANKS.find((r) => r.gatePosition === floor.gatePos)
              : undefined;

            return (
              <React.Fragment key={floor.id}>
                <section
                  aria-label={`${floor.floorCode} ${floor.title}`}
                  className={`relative rounded-xl border-2 p-3 transition-all sm:p-4 ${
                    isPlayerInFloor
                      ? 'border-[#12100d] bg-[#fffaf2] shadow-[0_6px_0_#12100d] dark:border-[#f5ca5c] dark:bg-[#221d17]'
                      : 'border-[#c9b99b] bg-[#faf4e8]/90 dark:border-[#3b3226] dark:bg-[#1c1813]/90'
                  }`}
                >
                  {/* フロアヘッダー */}
                  <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#dcd0b8] pb-2.5 dark:border-[#3b3226]">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-[#12100d] font-mono text-sm font-black text-white shadow-xs"
                        style={{ backgroundColor: floor.themeColor }}
                      >
                        {floor.floorCode}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-editorial text-base font-black text-[#12100d] sm:text-lg dark:text-[#fffaf0]">
                            {floor.title}
                          </h3>
                          {isPlayerInFloor && (
                            <span className="rounded-full bg-[#b23a2a] px-2 py-0.5 text-[9px] font-black text-white">
                              現在プレイ中フロア
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-[#6e6250] dark:text-[#b5a790]">
                          {floor.subtitle}（{floor.range[0]}〜{floor.range[1]}マス）
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {gateInfo && (
                        <div
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black ${
                            career >= gateInfo.requiredCareer
                              ? 'border-[#1f6f5c] bg-[#1f6f5c]/15 text-[#175445] dark:text-[#84dfb0]'
                              : 'border-[#b57c1e] bg-[#b57c1e]/15 text-[#8a5b0f] dark:text-[#f5ca5c]'
                          }`}
                        >
                          <GateArchIcon size={13} />
                          <span>
                            #{gateInfo.gatePosition} {gateInfo.name}査定（必要評価 {gateInfo.requiredCareer}pt / 現在 {career}pt）
                          </span>
                        </div>
                      )}
                      <div className="hidden w-24 text-right sm:block">
                        <span className="font-mono text-[10px] font-black text-[#5c5141] dark:text-[#cfc2ad]">
                          踏破 {visitedCount}/{floorSquares.length}
                        </span>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#dfd3bc] dark:bg-[#383024]">
                          <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${floorProgress}%`, backgroundColor: floor.themeColor }}
                          />
                        </div>
                      </div>
                    </div>
                  </header>

                  {/* デスクトップ用: 5列蛇行トラック */}
                  <div className="hidden space-y-3 sm:block">
                    {desktopRows.map((row, rIdx) => (
                      <div key={rIdx} className="relative">
                        <ol className="grid grid-cols-5 gap-2.5">
                          {row.rowSquares.map((sq, idx) => {
                            const nextInRow = row.rowSquares[idx + 1]?.position ?? null;
                            return renderTile(sq, nextInRow, row.reversed);
                          })}
                        </ol>
                        {rIdx < desktopRows.length - 1 && (
                          <div
                            className={`my-1 flex items-center ${
                              row.reversed ? 'justify-start pl-8' : 'justify-end pr-8'
                            }`}
                            aria-hidden="true"
                          >
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#8a7d69] bg-[#e6dac6] px-2.5 py-0.5 text-[9px] font-black text-[#473e30] dark:bg-[#2c251d] dark:text-[#dfd3bc]">
                              ▼ 折り返し通路 ▼
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* モバイル用: 3列蛇行トラック */}
                  <div className="space-y-2.5 sm:hidden">
                    {mobileRows.map((row, rIdx) => (
                      <div key={rIdx} className="relative">
                        <ol className="grid grid-cols-3 gap-2">
                          {row.rowSquares.map((sq, idx) => {
                            const nextInRow = row.rowSquares[idx + 1]?.position ?? null;
                            return renderTile(sq, nextInRow, row.reversed);
                          })}
                        </ol>
                        {rIdx < mobileRows.length - 1 && (
                          <div
                            className={`my-0.5 flex items-center ${
                              row.reversed ? 'justify-start pl-4' : 'justify-end pr-4'
                            }`}
                            aria-hidden="true"
                          >
                            <span className="rounded bg-[#e6dac6] px-2 py-0.5 text-[8px] font-black text-[#473e30] dark:bg-[#2c251d] dark:text-[#dfd3bc]">
                              ▼ 折り返し
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* フロア間エレベーター接続演出 */}
                {floorIdx < FLOORS.length - 1 && (
                  <div className="relative flex items-center justify-center py-1" aria-hidden="true">
                    <div className="h-5 w-1 bg-[#8a7d69]" />
                    <span className="mx-2 inline-flex items-center gap-1.5 rounded-full border-2 border-[#3b3022] bg-[#12100d] px-3 py-1 font-mono text-[10px] font-black tracking-wider text-[#f5ca5c] shadow-sm">
                      ▼ ELEVATOR TO {FLOORS[floorIdx + 1].floorCode}（{FLOORS[floorIdx + 1].title}） ▼
                    </span>
                    <div className="h-5 w-1 bg-[#8a7d69]" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        /* 全60マス鳥瞰マップモード */
        <div className="relative z-10 space-y-3">
          {FLOORS.map((floor) => {
            const floorSquares = GAME_BOARD.filter(
              (s) => s.position >= floor.range[0] && s.position <= floor.range[1],
            );
            return (
              <div
                key={floor.id}
                className="rounded-lg border border-[#c9b99b] bg-[#fffaf0]/95 p-2.5 dark:border-[#3b3226] dark:bg-[#211c16]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-black text-[#12100d] dark:text-[#fffaf0]">
                    <span
                      className="mr-1.5 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] text-white"
                      style={{ backgroundColor: floor.themeColor }}
                    >
                      {floor.floorCode}
                    </span>
                    {floor.title}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[#6e6250]">
                    #{floor.range[0]}–#{floor.range[1]}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                  {floorSquares.map((sq) => {
                    const vis = TYPE_VISUALS[sq.type];
                    const isActive = sq.position === position;
                    const isSelected = sq.position === selectedPosition;
                    const reach = reachableMap.get(sq.position);
                    return (
                      <button
                        key={sq.position}
                        type="button"
                        onClick={() => setSelectedPosition(sq.position)}
                        data-active={isActive ? 'true' : undefined}
                        className={`relative flex flex-col items-center justify-between rounded border p-1.5 text-center transition ${vis.topBg} ${
                          isActive
                            ? 'ring-2 ring-[#12100d] font-black shadow-md dark:ring-[#f5ca5c]'
                            : isSelected
                              ? 'ring-2 ring-[#c9922e]'
                              : reach
                                ? 'ring-1 ring-[#c9922e]'
                                : ''
                        }`}
                      >
                        <span className="font-mono text-[9px] font-black text-[#5c5141] dark:text-[#cfc2ad]">
                          {String(sq.position).padStart(2, '0')}
                        </span>
                        <span className="my-0.5 line-clamp-1 text-[10px] font-black text-[#12100d] dark:text-[#fffaf0]">
                          {sq.short}
                        </span>
                        {isActive ? (
                          <span className="rounded bg-[#b23a2a] px-1 text-[8px] font-black text-white">
                            現在地
                          </span>
                        ) : reach ? (
                          <span className="rounded bg-[#f5ca5c] px-1 text-[8px] font-black text-[#12100d]">
                            出目{reach}
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold text-[#6e6250]">{vis.label.slice(0, 2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 盤面フッター凡例 */}
      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#d4c4a8] pt-3 text-[10px] font-bold text-[#5c5141] dark:border-[#3b3226] dark:text-[#cfc2ad]">
        <div className="flex flex-wrap items-center gap-2">
          {(
            ['salary', 'decision', 'job-specific', 'chance', 'item', 'event', 'goal'] as SquareType[]
          ).map((type) => (
            <span key={type} className="inline-flex items-center gap-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-xs ${TYPE_VISUALS[type].iconBg}`} />
              <span>{TYPE_VISUALS[type].label}</span>
            </span>
          ))}
        </div>
        <span className="font-mono">
          {playerName}（{validJob} / {currentRank.name}）
        </span>
      </div>
    </div>
  );
};
