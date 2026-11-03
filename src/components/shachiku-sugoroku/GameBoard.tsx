"use client";

import React, { useMemo, useState } from 'react';
import {
   BOARD_SIZE,
  FLOORS,
  GAME_BOARD,
  PAYDAY_POSITIONS,
  RANKS,
} from '@/lib/sugoroku-logic';
import { BoardSquare, Job, Tone } from '@/types/sugoroku';
import { PlayerToken } from './PlayerToken';
import { SquareTypeIcon } from './SugorokuIcons';

interface GameBoardProps {
  position?: number;
  playerPosition?: number;
  playerName?: string;
  job?: Job | string;
  rankIndex?: number;
  career?: number;
  isMoving?: boolean;
  visited?: number[];
  stance?: 'teiji' | 'zangyo';
  diceBoost?: number;
  slowNextTurn?: boolean;
  gatesPassed?: number[];
  paydaysPassed?: number[];
  selectedRoute?: 'elite' | 'venture' | null;
  assetsCount?: number;
  isWideBoard?: boolean;
  onToggleWideBoard?: () => void;
  onQuickSpin?: () => void;
  onChangeStance?: (stance: 'teiji' | 'zangyo') => void;
  isBusy?: boolean;
  isResting?: number;
}

const TONE_ACCENT: Record<
  Tone,
  {
    topBg: string;
    border: string;
    side: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  good: {
    topBg: 'bg-gradient-to-b from-[#fffdf7] to-[#dcfce7]',
    border: 'border-[#15803d]',
    side: 'shadow-[0_4px_0_#14532d,0_6px_12px_rgba(0,0,0,0.28)]',
    badgeBg: 'bg-[#15803d]',
    badgeText: 'text-white',
    label: '好機',
  },
  bad: {
    topBg: 'bg-gradient-to-b from-[#fffdf9] to-[#ffe4e6]',
    border: 'border-[#be123c]',
    side: 'shadow-[0_4px_0_#881337,0_6px_12px_rgba(0,0,0,0.28)]',
    badgeBg: 'bg-[#be123c]',
    badgeText: 'text-white',
    label: '試練',
  },
  mixed: {
    topBg: 'bg-gradient-to-b from-[#fffdf7] to-[#fef3c7]',
    border: 'border-[#b45309]',
    side: 'shadow-[0_4px_0_#78350f,0_6px_12px_rgba(0,0,0,0.28)]',
    badgeBg: 'bg-[#b45309]',
    badgeText: 'text-white',
    label: '勝負',
  },
  neutral: {
    topBg: 'bg-gradient-to-b from-[#ffffff] to-[#e2e8f0]',
    border: 'border-[#334155]',
    side: 'shadow-[0_4px_0_#1e293b,0_6px_12px_rgba(0,0,0,0.28)]',
    badgeBg: 'bg-[#334155]',
    badgeText: 'text-white',
    label: '進行',
  },
};

function getSquareTheme(square: BoardSquare) {
  if (square.type === 'start') {
    return {
      topBg: 'bg-gradient-to-b from-[#ecfeff] via-[#cffafe] to-[#67e8f9]',
      border: 'border-[#0e7490]',
      side: 'shadow-[0_4px_0_#155e75,0_7px_14px_rgba(0,0,0,0.34)]',
      badgeBg: 'bg-[#0e7490]',
      badgeText: 'text-white',
      typeLabel: 'START',
    };
  }
  if (square.type === 'goal') {
    return {
      topBg: 'bg-gradient-to-b from-[#fef9c3] via-[#fde047] to-[#eab308]',
      border: 'border-[#854d0e]',
      side: 'shadow-[0_5px_0_#713f12,0_8px_16px_rgba(0,0,0,0.4)]',
      badgeBg: 'bg-[#12100d]',
      badgeText: 'text-[#fde047]',
      typeLabel: 'GOAL',
    };
  }
  if (square.type === 'salary') {
    return {
      topBg: 'bg-gradient-to-b from-[#fffbeb] via-[#fde68a] to-[#f59e0b]',
      border: 'border-[#92400e]',
      side: 'shadow-[0_5px_0_#78350f,0_7px_14px_rgba(0,0,0,0.34)]',
      badgeBg: 'bg-[#78350f]',
      badgeText: 'text-[#fef08a]',
      typeLabel: '給料日',
    };
  }
  if (square.type === 'decision') {
    return {
      topBg: 'bg-gradient-to-b from-[#f5f3ff] via-[#ddd6fe] to-[#c4b5fd]',
      border: 'border-[#5b21b6]',
      side: 'shadow-[0_4px_0_#4c1d95,0_6px_12px_rgba(0,0,0,0.32)]',
      badgeBg: 'bg-[#5b21b6]',
      badgeText: 'text-white',
      typeLabel: '決断',
    };
  }
  if (square.type === 'item') {
    return {
      topBg: 'bg-gradient-to-b from-[#f0fdfa] via-[#ccfbf1] to-[#5eead4]',
      border: 'border-[#0f766e]',
      side: 'shadow-[0_4px_0_#115e59,0_6px_12px_rgba(0,0,0,0.28)]',
      badgeBg: 'bg-[#0f766e]',
      badgeText: 'text-white',
      typeLabel: '資産・支給',
    };
  }
  if (square.type === 'job-specific') {
    return {
      topBg: 'bg-gradient-to-b from-[#eff6ff] via-[#dbeafe] to-[#93c5fd]',
      border: 'border-[#1d4ed8]',
      side: 'shadow-[0_4px_0_#1e3a8a,0_6px_12px_rgba(0,0,0,0.28)]',
      badgeBg: 'bg-[#1d4ed8]',
      badgeText: 'text-white',
      typeLabel: '職種特効',
    };
  }
  if (square.type === 'chance') {
    return {
      topBg: 'bg-gradient-to-b from-[#fff7ed] via-[#ffedd5] to-[#fdba74]',
      border: 'border-[#c2410c]',
      side: 'shadow-[0_4px_0_#9a3412,0_6px_12px_rgba(0,0,0,0.28)]',
      badgeBg: 'bg-[#c2410c]',
      badgeText: 'text-white',
      typeLabel: '抽選',
    };
  }
  const base = TONE_ACCENT[square.tone];
  return {
    ...base,
    typeLabel: base.label,
  };
}

/**
 * 1200 x 960 のSVG座標系で滑らかなベジェ道路パスを生成する
 */
function buildSmoothRoadPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const scaled = points.map((p) => ({
    x: (p.x / 100) * 1200,
    y: (p.y / 100) * 960,
  }));
  let d = `M ${scaled[0].x.toFixed(1)} ${scaled[0].y.toFixed(1)}`;
  for (let i = 1; i < scaled.length; i++) {
    const prev = scaled[i - 1];
    const curr = scaled[i];
    const midX = ((prev.x + curr.x) / 2).toFixed(1);
    const midY = ((prev.y + curr.y) / 2).toFixed(1);
    d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)}, ${midX} ${midY}`;
  }
  const last = scaled[scaled.length - 1];
  d += ` T ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

const DISTRICT_BANNER_COORDS: Record<
  number,
  { x: number; y: number; bg: string; border: string; label: string; dir: string }
> = {
  1: {
    x: 195,
    y: 44,
    bg: '#0c4a6e',
    border: '#38bdf8',
    label: 'AREA 01 : フレッシュマン・ハーバー (#0〜#7)',
    dir: '右方向へ進行 →',
  },
  2: {
    x: 1005,
    y: 238,
    bg: '#1e1b4b',
    border: '#818cf8',
    label: 'AREA 02 : メトロ・ビジネス街 (#8〜#14)',
    dir: '← 左方向へ進行',
  },
  3: {
    x: 205,
    y: 416,
    bg: '#451a03',
    border: '#fbbf24',
    label: 'AREA 03 : マネジメント・キャニオン (#15〜#21)',
    dir: '右方向へ進行 →',
  },
  4: {
    x: 1000,
    y: 590,
    bg: '#172554',
    border: '#f59e0b',
    label: 'AREA 04 : エグゼクティブ・ベイ (#22〜#28)',
    dir: '← 左方向へ進行',
  },
  5: {
    x: 210,
    y: 758,
    bg: '#064e3b',
    border: '#34d399',
    label: 'AREA 05 : ドリーム・リゾート (#29〜#35 GOAL)',
    dir: '右方向GOALへ →',
  },
};

export const GameBoard: React.FC<GameBoardProps> = ({
  position,
  playerPosition: playerPositionProp,
  playerName = '社員',
  job = '営業',
  rankIndex = 0,
  career = 0,
  isMoving = false,
  stance = 'teiji',
  diceBoost = 0,
  slowNextTurn = false,
  gatesPassed = [],
  paydaysPassed = [],
  selectedRoute = null,
  assetsCount = 0,
  isWideBoard = false,
  onToggleWideBoard,
  onQuickSpin,
  onChangeStance,
  isBusy = false,
  isResting = 0,
}) => {
  const playerPosition = position ?? playerPositionProp ?? 0;
  const [selectedSquarePos, setSelectedSquarePos] = useState<number | null>(null);
  const [cameraMode, setCameraMode] = useState<'overview' | 'follow'>('overview');
  const [mobileScrollMode, setMobileScrollMode] = useState<boolean>(false);
  const [focusedDistrict, setFocusedDistrict] = useState<number | null>(null);

  const validJob = job as Job;
  const currentRank = RANKS[rankIndex] ?? RANKS[0];
  const currentSquare = GAME_BOARD[playerPosition] ?? GAME_BOARD[0];
  const activeDistrict = FLOORS.find((f) => f.id === currentSquare.districtId) ?? FLOORS[0];

  // スタンス・バフに応じた到達可能ステップ範囲
  const minReachStep = slowNextTurn ? 1 : (stance === 'zangyo' ? 2 : 1) + diceBoost;
  const maxReachStep = slowNextTurn ? 1 : (stance === 'zangyo' ? 12 : 6) + diceBoost;

  // 連続S字ハイウェイパス（全36マスを順番通り一筆書きで結ぶ）
  const mainRoadPath = useMemo(() => buildSmoothRoadPath(GAME_BOARD), []);

  // エリート出世ハイウェイ区間 (#8 -> #9 -> #10) と ベンチャー挑戦バイパス区間 (#10 -> #11 -> #12 -> #13) のハイライト
  const eliteHighwayPath = useMemo(
    () => buildSmoothRoadPath([GAME_BOARD[8], GAME_BOARD[9], GAME_BOARD[10]]),
    [],
  );
  const ventureBypassPath = useMemo(
    () => buildSmoothRoadPath([GAME_BOARD[10], GAME_BOARD[11], GAME_BOARD[12], GAME_BOARD[13]]),
    [],
  );

  // 現在地から到達可能範囲の予測ルートパス
  const reachablePreviewPath = useMemo(() => {
    const slice = GAME_BOARD.slice(
      playerPosition,
      Math.min(BOARD_SIZE + 1, playerPosition + maxReachStep + 1),
    );
    return slice.length > 1 ? buildSmoothRoadPath(slice) : '';
  }, [playerPosition, maxReachStep]);

  // 次の給料日ゲートまでの残りマス数
  const nextPaydayPos = useMemo(
    () => PAYDAY_POSITIONS.find((pos) => pos > playerPosition) ?? null,
    [playerPosition],
  );
  const stepsToNextPayday = nextPaydayPos !== null ? nextPaydayPos - playerPosition : null;
  const stepsToGoal = Math.max(0, BOARD_SIZE - playerPosition);

  // フォローモード時のカメラトランスフォーム（盤面の端が絶対に見切れないよう数学的上限 12.2% でクランプ）
  const boardTransformStyle = useMemo(() => {
    if (cameraMode === 'overview') {
      return {
        transform: 'scale(1) translate(0%, 0%)',
        transformOrigin: '50% 50%',
      };
    }
    const scale = 1.28;
    const maxShift = 50 * (1 - 1 / scale); // 約 10.93%（これ以上シフトすると盤面端が内側に入り見切れる）
    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
    const tx = clamp((50 - currentSquare.x) * 0.55, -maxShift, maxShift);
    const ty = clamp((50 - currentSquare.y) * 0.55, -maxShift, maxShift);
    return {
      transform: `scale(${scale}) translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%)`,
      transformOrigin: '50% 50%',
    };
  }, [cameraMode, currentSquare.x, currentSquare.y]);

  const inspectedSquare = useMemo(() => {
    if (selectedSquarePos !== null) {
      return GAME_BOARD.find((s) => s.position === selectedSquarePos) ?? currentSquare;
    }
    return currentSquare;
  }, [selectedSquarePos, currentSquare]);

  const inspectedGateRank = useMemo(
    () => RANKS.find((r) => r.gatePosition > 0 && r.gatePosition === inspectedSquare.position) ?? null,
    [inspectedSquare.position],
  );

  return (
    <div
      className="relative overflow-hidden rounded-3xl border-3 border-[#2a2118] bg-[#e8dcc8] p-2.5 shadow-[0_12px_0_#1a140e,0_20px_40px_rgba(0,0,0,0.35)] sm:p-4 dark:border-[#594a36] dark:bg-[#1b1611]"
      aria-label="社畜ライフロード 3Dジオラマ・ゲームボード"
    >
      {/* 1. ボード上部ヘッダー：現在地区・役職・カメラ＆ワイド切替 */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#3b3022] bg-[#12100d] px-3 py-2 text-[#fffaf0] shadow-md sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-[#f5ca5c] font-mono text-[10px] font-black text-white shadow-inner sm:h-10 sm:w-10"
            style={{
              backgroundColor: activeDistrict.themeColor,
            }}
          >
            <span className="text-[7px] leading-none opacity-80">AREA</span>
            <span className="text-xs leading-none sm:text-sm">0{activeDistrict.id}</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[9px] font-black tracking-widest text-[#f5ca5c]">
                SHACHIKU LIFE ROAD DIORAMA MAP
              </span>
              <span className="rounded bg-[#f5ca5c] px-1.5 py-0.5 font-mono text-[9px] font-black text-[#12100d]">
                現在地 #{playerPosition} / {BOARD_SIZE}
              </span>
              {stepsToNextPayday !== null && (
                <span className="rounded border border-[#f59e0b]/60 bg-[#78350f] px-1.5 py-0.5 font-mono text-[9px] font-black text-[#fef08a]">
                  次の給料日(#{nextPaydayPos})まであと{stepsToNextPayday}マス
                </span>
              )}
            </div>
            <h2 className="font-editorial text-sm font-black tracking-tight text-white sm:text-base">
              {activeDistrict.title}
              <span className="ml-2 hidden text-[11px] font-bold text-white/70 md:inline">
                — {activeDistrict.subtitle}
              </span>
            </h2>
          </div>
        </div>

        {/* カメラ＆表示モード切替ツールバー */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-xl border border-white/15 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => setCameraMode('overview')}
              className={` cursor-pointer rounded-lg px-2.5 py-1 text-[10px] font-black transition ${
                cameraMode === 'overview'
                  ? 'bg-[#f5ca5c] text-[#12100d] shadow-xs'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              全体マップ (全36マス)
            </button>
            <button
              type="button"
              onClick={() => setCameraMode('follow')}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-[10px] font-black transition ${
                cameraMode === 'follow'
                  ? 'bg-[#f5ca5c] text-[#12100d] shadow-xs'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              現在地ズーム
            </button>
          </div>

          {/* モバイル向けフィット/拡大横スクロール切替 */}
          <button
            type="button"
            onClick={() => setMobileScrollMode((prev) => !prev)}
            className={`cursor-pointer rounded-xl border px-2.5 py-1 text-[10px] font-black transition sm:hidden ${
              mobileScrollMode
                ? 'border-[#38bdf8] bg-[#0284c7] text-white'
                : 'border-white/20 bg-white/10 text-white/85'
            }`}
          >
            {mobileScrollMode ? '画面幅にフィット' : '横スクロール拡大'}
          </button>

          {/* デスクトップ向けワイド盤面拡大トグル */}
          {onToggleWideBoard && (
            <button
              type="button"
              onClick={onToggleWideBoard}
              className={`hidden cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1 text-[10px] font-black transition lg:inline-flex ${
                isWideBoard
                  ? 'border-[#34d399] bg-[#065f46] text-[#ecfdf5] shadow-xs'
                  : 'border-[#f5ca5c]/50 bg-white/10 text-[#f5ca5c] hover:bg-white/15'
              }`}
              title="盤面を画面横幅いっぱいに拡大表示します"
            >
              <span>{isWideBoard ? '標準2カラムに戻す' : '盤面ワイド拡大'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. インタラクティブ5大地区ジャンプ＆フィルタバー（クリックで該当地区のマスをハイライト） */}
      <div className="mb-2.5 grid grid-cols-5 gap-1 sm:gap-1.5">
        {FLOORS.map((floor) => {
          const isCurrentDistrict = floor.id === activeDistrict.id;
          const isFocused = focusedDistrict === floor.id;
          const isCompleted = playerPosition > floor.range[1];
          return (
            <button
              key={floor.id}
              type="button"
              onClick={() => setFocusedDistrict((prev) => (prev === floor.id ? null : floor.id))}
              className={`cursor-pointer flex flex-col justify-between rounded-xl border-2 px-2 py-1 text-left transition ${
                isFocused
                  ? 'border-[#12100d] bg-[#f5ca5c] text-[#12100d] shadow-xs dark:border-white'
                  : isCurrentDistrict
                    ? 'border-[#b45309] bg-[#fffbeb] text-[#12100d] shadow-xs dark:border-[#f5ca5c] dark:bg-[#2b2113] dark:text-[#fffaf0]'
                    : isCompleted
                      ? 'border-[#15803d]/40 bg-[#f0fdf4]/80 text-[#166534] dark:border-[#15803d]/50 dark:bg-[#0f291e]/60 dark:text-[#86efac]'
                      : 'border-[#c9b99b] bg-[#fffaf0]/85 text-[#5c5141] hover:bg-[#fffaf0] dark:border-[#3b3226] dark:bg-[#231d16] dark:text-[#cfc2ad]'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[8px] font-black tracking-tighter sm:text-[9px]">
                  AREA 0{floor.id}
                </span>
                <span className="font-mono text-[8px] font-bold opacity-80">
                  #{floor.range[0]}-{floor.range[1]}
                </span>
              </div>
              <p className="truncate text-[9px] font-black leading-tight sm:text-[10px]">
                {floor.title.replace(/・/g, '')}
              </p>
            </button>
          );
        })}
      </div>

      {/* 3. 2.5D テーブルトップ・ジオラマ盤面キャンバス（見切れゼロ設計） */}
      <div
        className={`relative w-full rounded-2xl border-3 border-[#2a2118] bg-[#0c4a6e] shadow-inner ${
          mobileScrollMode ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden'
        }`}
      >
        <div
          className={`relative transition-transform duration-500 ease-out ${
            mobileScrollMode
              ? 'min-w-[780px] w-full aspect-[1200/940]'
              : 'w-full aspect-[1200/980] sm:aspect-[1200/930]'
          }`}
          style={boardTransformStyle}
        >
          {/* === 背景SVG：5大ジオラマ地区の地形・海・川・橋・ランドマーク・道路 === */}
          <svg
            viewBox="0 0 1200 960"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="oceanGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#082f49" />
                <stop offset="45%" stopColor="#0369a1" />
                <stop offset="100%" stopColor="#0f766e" />
              </linearGradient>

              <linearGradient id="meadowGrad" x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor="#ecfccb" />
                <stop offset="32%" stopColor="#bbf7d0" />
                <stop offset="68%" stopColor="#fef3c7" />
                <stop offset="100%" stopColor="#d1fae5" />
              </linearGradient>

              <linearGradient id="canyonGrad" x1="0" y1="0" x2="1" y2="0.4">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#fed7aa" />
                <stop offset="100%" stopColor="#fca5a5" />
              </linearGradient>

              <linearGradient id="metroGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e0e7ff" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>

              <linearGradient id="bayGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#dbeafe" />
                <stop offset="50%" stopColor="#e0f2fe" />
                <stop offset="100%" stopColor="#fef3c7" />
              </linearGradient>

              <linearGradient id="resortGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="45%" stopColor="#a7f3d0" />
                <stop offset="100%" stopColor="#6ee7b7" />
              </linearGradient>

              <linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="50%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>

              <filter id="landShadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#041e2e" floodOpacity="0.45" />
              </filter>
            </defs>

            {/* 1. 外洋・オーシャンベース */}
            <rect x="0" y="0" width="1200" height="960" fill="url(#oceanGrad)" />

            {/* 海面の波紋ライン */}
            <g stroke="#bae6fd" strokeOpacity="0.2" strokeWidth="2" fill="none">
              <path d="M 30 35 Q 75 25, 120 35 T 210 35" />
              <path d="M 960 32 Q 1005 22, 1050 32 T 1140 32" />
              <path d="M 40 935 Q 85 925, 130 935 T 220 935" />
              <path d="M 940 938 Q 985 928, 1030 938 T 1120 938" />
            </g>

            {/* 2. メイン大陸アイランド（全マスを余裕で包む広大なテーブルトップ大陸） */}
            <path
              d="M 18 58
                 C 18 22, 65 16, 220 18
                 L 985 18
                 C 1135 18, 1182 28, 1182 72
                 L 1182 725
                 C 1182 765, 1135 780, 1010 778
                 L 195 778
                 C 65 778, 18 762, 18 715
                 Z"
              fill="#b49b72"
              transform="translate(0, 8)"
              filter="url(#landShadow)"
            />
            <path
              d="M 18 58
                 C 18 22, 65 16, 220 18
                 L 985 18
                 C 1135 18, 1182 28, 1182 72
                 L 1182 725
                 C 1182 765, 1135 780, 1010 778
                 L 195 778
                 C 65 778, 18 762, 18 715
                 Z"
              fill="url(#meadowGrad)"
              stroke="#453723"
              strokeWidth="4"
            />

            {/* 3. 各地区のバイオーム・ゾーニング塗装（5段のレーンが視覚的にひと目で分かる設計） */}
            {/* District 2: メトロ・ビジネス街（2段目） */}
            <rect
              x="36"
              y="222"
              width="1128"
              height="168"
              rx="28"
              fill="url(#metroGrad)"
              fillOpacity="0.88"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="8 6"
            />

            {/* District 3: マネジメント・キャニオン（3段目） */}
            <rect
              x="36"
              y="404"
              width="1128"
              height="166"
              rx="28"
              fill="url(#canyonGrad)"
              fillOpacity="0.88"
              stroke="#b45309"
              strokeWidth="2"
              strokeDasharray="8 6"
            />

            {/* District 4: エグゼクティブ・ベイ（4段目） */}
            <rect
              x="36"
              y="584"
              width="1128"
              height="174"
              rx="28"
              fill="url(#bayGrad)"
              fillOpacity="0.92"
              stroke="#0284c7"
              strokeWidth="2"
            />

            {/* エメラルド海峡（4段目と5段目の間を流れる海峡） */}
            <path
              d="M 0 776 Q 300 762, 600 778 T 1200 772 L 1200 802 Q 900 812, 600 798 T 0 806 Z"
              fill="url(#riverGrad)"
            />

            {/* 4. District 5: ドリーム・リゾートアイランド（5段目・南国の黄金ゴール島） */}
            <path
              d="M 18 812
                 C 18 790, 80 784, 240 786
                 L 970 786
                 C 1130 786, 1182 794, 1182 820
                 L 1182 918
                 C 1182 942, 1130 948, 980 948
                 L 210 948
                 C 75 948, 18 940, 18 914
                 Z"
              fill="#d97706"
              transform="translate(0, 6)"
            />
            <path
              d="M 18 812
                 C 18 790, 80 784, 240 786
                 L 970 786
                 C 1130 786, 1182 794, 1182 820
                 L 1182 918
                 C 1182 942, 1130 948, 980 948
                 L 210 948
                 C 75 948, 18 940, 18 914
                 Z"
              fill="url(#resortGrad)"
              stroke="#065f46"
              strokeWidth="4"
            />

            {/* === 5. 3D ランドマーク装飾（マスの邪魔にならない背景レイヤー） === */}
            {/* District 1: ハーバー灯台＆ヨット */}
            <g transform="translate(36, 36)">
              <rect x="6" y="18" width="12" height="32" rx="2" fill="#fffaf0" stroke="#1e293b" strokeWidth="2" />
              <rect x="6" y="26" width="12" height="7" fill="#ef4444" />
              <polygon points="3,18 12,6 21,18" fill="#ef4444" stroke="#1e293b" strokeWidth="2" />
            </g>

            {/* District 2: メトロ摩天楼シルエット */}
            <g transform="translate(555, 232)" opacity="0.55">
              <rect x="0" y="18" width="26" height="48" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="2" />
              <rect x="30" y="4" width="32" height="62" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
              <rect x="66" y="22" width="24" height="44" rx="3" fill="#475569" stroke="#1e293b" strokeWidth="2" />
            </g>

            {/* District 3: マネジメント・キャニオンの山岳レリーフ */}
            <g transform="translate(535, 412)" opacity="0.55">
              <polygon points="0,58 28,12 56,58" fill="#d97706" stroke="#78350f" strokeWidth="2.5" />
              <polygon points="36,58 70,4 104,58" fill="#b45309" stroke="#78350f" strokeWidth="2.5" />
              <polygon points="59,19 70,4 81,19" fill="#fef3c7" />
            </g>

            {/* District 5: ゴール・ゴールデンピラミッド＆ヤシの木 */}
            <g transform="translate(1115, 785)">
              <polygon points="0,48 26,6 52,48" fill="#facc15" stroke="#713f12" strokeWidth="2.5" />
              <polygon points="26,6 52,48 38,52" fill="#eab308" stroke="#713f12" strokeWidth="2" />
            </g>

            {/* === 6. ワインディング・ハイウェイ道路レイヤー === */}
            {/* 道路の立体ドロップシャドウ */}
            <path
              d={mainRoadPath}
              stroke="#1e1b18"
              strokeWidth="44"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.32"
              transform="translate(0, 6)"
            />
            {/* 道路の外枠（ゴールド・カードボード縁取り） */}
            <path
              d={mainRoadPath}
              stroke="#fde68a"
              strokeWidth="40"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* アスファルト本体 */}
            <path
              d={mainRoadPath}
              stroke="#334155"
              strokeWidth="31"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* District 2: エリート出世ハイウェイ区間 (#8 -> #9 -> #10) のブルーゴールド舗装 */}
            <path
              d={eliteHighwayPath}
              stroke={selectedRoute === 'elite' ? '#2563eb' : '#3b82f6'}
              strokeWidth="26"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={selectedRoute === 'venture' ? 0.45 : 0.9}
            />

            {/* District 2: ベンチャーバイパス区間 (#10 -> #11 -> #12 -> #13) のエメラルド舗装 */}
            <path
              d={ventureBypassPath}
              stroke={selectedRoute === 'venture' ? '#059669' : '#10b981'}
              strokeWidth="26"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={selectedRoute === 'elite' ? 0.5 : 0.9}
            />

            {/* センター破線（イエロー＆ホワイト） */}
            <path
              d={mainRoadPath}
              stroke="#f8fafc"
              strokeWidth="3"
              strokeDasharray="12 12"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />

            {/* 現在地から出目1〜6の到着予測ハイライトパス */}
            {reachablePreviewPath && (
              <path
                d={reachablePreviewPath}
                stroke="#facc15"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.55"
              />
            )}

            {/* === 7. 給料日ゴールデンブリッジ支柱装飾（#5, #13, #21, #29） === */}
            {[
              { x: 811, y: 142 },
              { x: 270, y: 312 },
              { x: 1094, y: 485 },
              { x: 106, y: 818 },
            ].map((bridge, idx) => (
              <g key={idx} transform={`translate(${bridge.x}, ${bridge.y})`}>
                <rect
                  x="-54"
                  y="-30"
                  width="108"
                  height="60"
                  rx="12"
                  fill="#f59e0b"
                  fillOpacity="0.22"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeDasharray="5 4"
                />
              </g>
            ))}

            {/* === 8. 5大地区の看板バナー（マスの座標と重ならないレーン境界に配置） === */}
            {FLOORS.map((floor) => {
              const b = DISTRICT_BANNER_COORDS[floor.id];
              if (!b) return null;
              const isActive = floor.id === activeDistrict.id;
              return (
                <g key={floor.id} transform={`translate(${b.x}, ${b.y})`}>
                  <rect
                    x="-168"
                    y="-15"
                    width="336"
                    height="30"
                    rx="15"
                    fill={b.bg}
                    stroke={isActive ? '#fde047' : b.border}
                    strokeWidth={isActive ? '3' : '2'}
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11.5"
                    fontWeight="900"
                    fontFamily="monospace"
                  >
                    {b.label} ({b.dir})
                  </text>
                </g>
              );
            })}
          </svg>

          {/* === 9. 全36マスのインタラクティブ立体ボードパッド（見切れゼロ・レスポンシブ％幅） === */}
          {GAME_BOARD.map((square) => {
            const isPlayerHere = square.position === playerPosition;
            const isPassed = square.position < playerPosition;
            const isSelected = selectedSquarePos === square.position;
            const stepDistance = square.position - playerPosition;
            const isReachableNextSpin =
              stepDistance >= minReachStep && stepDistance <= maxReachStep;
            const theme = getSquareTheme(square);

            const gateRank = RANKS.find(
              (r) => r.gatePosition > 0 && r.gatePosition === square.position,
            );
            const isPayday = square.type === 'salary';
            const hasPaidOut = paydaysPassed.includes(square.position);
            const hasJobBonus = Boolean(square.jobOutcomes && square.jobOutcomes[validJob]);
            const isDimmedByDistrictFilter =
              focusedDistrict !== null && square.districtId !== focusedDistrict;

            return (
              <div
                key={square.position}
                style={{
                  left: `${square.x}%`,
                  top: `${square.y}%`,
                }}
                className={`absolute w-[10.4%] min-w-[54px] max-w-[112px] -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  isPlayerHere ? 'z-30' : isSelected ? 'z-25' : isReachableNextSpin ? 'z-20' : 'z-10'
                } ${isDimmedByDistrictFilter ? 'opacity-35 scale-95' : 'opacity-100'}`}
              >
                {/* プレイヤーの3Dキャリア・クルーザー駒（最上段でも見切れないスマート配置） */}
                {isPlayerHere && (
                  <div
                    className={`pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 ${
                      square.y < 22 ? '-top-11 scale-80 sm:scale-90' : '-top-12 scale-85 sm:scale-95'
                    }`}
                  >
                    <PlayerToken
                      playerName={playerName}
                      job={validJob}
                      isMoving={isMoving}
                      rankName={currentRank.name}
                      rankIndex={rankIndex}
                      assetsCount={assetsCount}
                    />
                  </div>
                )}

                {/* 給料日ゲート（PAYDAY）＆昇進査定アーチリボン */}
                {(isPayday || gateRank) && (
                  <div className="pointer-events-none relative z-20 -mb-1 flex flex-col items-center">
                    {isPayday && (
                      <div
                        className={`flex items-center gap-0.5 whitespace-nowrap rounded-full border border-[#12100d] px-1.5 py-px text-[7px] font-black tracking-tight shadow-xs sm:text-[8px] ${
                          hasPaidOut
                            ? 'bg-[#fef3c7] text-[#78350f]'
                            : 'bg-gradient-to-r from-[#facc15] via-[#fde047] to-[#f59e0b] text-[#12100d]'
                        }`}
                      >
                        <span>PAYDAY 給料日</span>
                      </div>
                    )}
                    {gateRank && !isPayday && (
                      <div
                        className={`whitespace-nowrap rounded-full border border-[#12100d] px-1.5 py-px text-[7px] font-black shadow-xs sm:text-[8px] ${
                          gatesPassed.includes(square.position) && rankIndex >= gateRank.index
                            ? 'bg-[#10b981] text-[#12100d]'
                            : career >= gateRank.requiredCareer
                              ? 'bg-[#f5ca5c] text-[#12100d]'
                              : 'bg-[#1e293b] text-white'
                        }`}
                      >
                        {gateRank.name}査定(評{gateRank.requiredCareer})
                      </div>
                    )}
                  </div>
                )}

                {/* 決断ストップ標識バッジ */}
                {square.type === 'decision' && !gateRank && (
                  <div className="pointer-events-none relative z-20 -mb-1 flex justify-center">
                    <span className="whitespace-nowrap rounded-full border border-[#12100d] bg-[#ef4444] px-1.5 py-px font-mono text-[7px] font-black text-white shadow-xs sm:text-[8px]">
                      STOP! 決断
                    </span>
                  </div>
                )}

                {/* マス本体（親divの10.4%幅に完全フィットし、隣マスや外枠と絶対干渉しない） */}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSquarePos((prev) =>
                      prev === square.position ? null : square.position,
                    )
                  }
                  onMouseEnter={() => setSelectedSquarePos(square.position)}
                  aria-label={`${square.position}マス目: ${square.title}`}
                  className={`group relative flex w-full cursor-pointer flex-col justify-between rounded-xl border-2 p-1 text-left transition-transform duration-200 sm:p-1.5 ${
                    theme.topBg
                  } ${theme.border} ${theme.side} ${
                    isPlayerHere
                      ? 'scale-106 ring-3 ring-[#facc15] ring-offset-1 ring-offset-[#12100d]'
                      : isSelected
                        ? 'scale-104 ring-2 ring-[#38bdf8]'
                        : isReachableNextSpin
                          ? 'hover:-translate-y-0.5 ring-2 ring-[#facc15]/80'
                          : isPassed
                            ? 'opacity-85 hover:opacity-100'
                            : 'hover:-translate-y-0.5'
                  }`}
                >
                  {/* 1〜6マスの出目予測バッジ */}
                  {isReachableNextSpin && !isPlayerHere && (
                    <span
                      className="pointer-events-none absolute -top-2 -right-1.5 z-30 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#12100d] bg-[#facc15] px-1 font-mono text-[8px] font-black text-[#12100d] shadow-xs sm:h-4.5 sm:text-[9px]"
                      title={`あと${stepDistance}マスで到着`}
                    >
                      +{stepDistance}
                    </span>
                  )}

                  {/* 上段：マス番号 ＆ 種別ラベル */}
                  <div className="flex items-center justify-between gap-0.5">
                    <span
                      className={`inline-flex items-center justify-center rounded px-1 py-px font-mono text-[8px] font-black leading-none sm:text-[9px] ${
                        isPlayerHere
                          ? 'bg-[#12100d] text-[#facc15]'
                          : 'bg-[#12100d]/85 text-white'
                      }`}
                    >
                      #{square.position}
                    </span>

                    <span
                      className={`truncate rounded px-1 py-px font-mono text-[7px] font-black leading-none sm:text-[8px] ${theme.badgeBg} ${theme.badgeText}`}
                    >
                      {theme.typeLabel}
                    </span>
                  </div>

                  {/* 中段：アイコン ＆ マス短縮タイトル */}
                  <div className="my-0.5 flex items-center gap-1">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border border-[#12100d]/15 bg-white/90 text-[#12100d] shadow-2xs sm:h-5 sm:w-5">
                      <SquareTypeIcon type={square.type} size={11} />
                    </span>
                    <span className="line-clamp-1 text-[9px] font-black leading-tight tracking-tight text-[#12100d] sm:text-[10px]">
                      {square.short}
                    </span>
                  </div>

                  {/* 下段：職種特効やルート・給料日インジケーター */}
                  <div className="flex items-center justify-between gap-0.5 border-t border-[#12100d]/10 pt-0.5 text-[7px] font-black sm:text-[8px]">
                    {hasJobBonus ? (
                      <span className="truncate rounded bg-[#1d4ed8] px-1 py-px text-white">
                        {validJob}特効
                      </span>
                    ) : square.branch === 'elite' ? (
                      <span className="truncate text-[#1e40af]">出世路線</span>
                    ) : square.branch === 'venture' ? (
                      <span className="truncate text-[#065f46]">挑戦路線</span>
                    ) : gateRank ? (
                      <span className="truncate text-[#78350f]">{gateRank.name}査定</span>
                    ) : (
                      <span className="truncate text-[#475569]">
                        {square.type === 'start'
                          ? '出発駅'
                          : square.type === 'goal'
                            ? '大決済!'
                            : `第${square.districtId}地区`}
                      </span>
                    )}

                    {isPlayerHere && (
                      <span className="rounded bg-[#b23a2a] px-1 py-px text-[7px] font-black text-white">
                        現在地
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. ボード直下の専用マス詳細インスペクター（盤面のマスを一切隠さずに詳細を常時表示） */}
      <div className="mt-2.5 rounded-2xl border-2 border-[#3b3022] bg-[#fffaf0] p-3 shadow-xs dark:border-[#594b38] dark:bg-[#14110d]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#12100d] bg-[#f5ca5c] text-[#12100d] shadow-2xs">
              <SquareTypeIcon
                type={inspectedSquare.type}
                size={18}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-[#12100d] px-2 py-0.5 font-mono text-[10px] font-black text-[#f5ca5c]">
                  {inspectedSquare.position === playerPosition
                    ? `現在地 #${inspectedSquare.position}`
                    : `選択マス #${inspectedSquare.position}（現在地から${
                        inspectedSquare.position - playerPosition > 0
                          ? `+${inspectedSquare.position - playerPosition}マス`
                          : `${inspectedSquare.position - playerPosition}マス`
                      }）`}
                </span>
                <span className="rounded border border-[#c9b99b] bg-[#f4ece0] px-2 py-0.5 font-mono text-[10px] font-black text-[#5c5141] dark:border-[#3b3226] dark:bg-[#231d16] dark:text-[#cfc2ad]">
                  第{inspectedSquare.districtId}地区
                </span>
                {inspectedGateRank && (
                  <span className="rounded bg-[#78350f] px-2 py-0.5 font-mono text-[10px] font-black text-[#fef08a]">
                    昇進査定：{inspectedGateRank.name}（必要評価 {inspectedGateRank.requiredCareer}pt / 祝金 +{inspectedGateRank.salaryBonus}万）
                  </span>
                )}
                {inspectedSquare.jobOutcomes && inspectedSquare.jobOutcomes[validJob] && (
                  <span className="rounded bg-[#1d4ed8] px-2 py-0.5 text-[10px] font-black text-white">
                    あなたの職種（{validJob}）特効ボーナス発動マス！
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-black text-[#12100d] dark:text-[#fffaf0]">
                {inspectedSquare.title}
              </p>
              <p className="mt-0.5 text-xs font-bold leading-relaxed text-[#5c5141] dark:text-[#cfc2ad]">
                {inspectedSquare.jobOutcomes && inspectedSquare.jobOutcomes[validJob]
                  ? `【${validJob}特効】${inspectedSquare.jobOutcomes[validJob]!.text}`
                  : inspectedSquare.description}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-black text-[#5c5141] dark:text-[#cfc2ad]">
              <span className="rounded-lg border border-[#c9b99b] bg-[#f4ece0] px-2 py-1 dark:border-[#3b3226] dark:bg-[#231d16]">
                ゴールまで残り <strong className="text-[#b23a2a] dark:text-[#f5ca5c]">{stepsToGoal}</strong> マス
              </span>
              {selectedSquarePos !== null && selectedSquarePos !== playerPosition && (
                <button
                  type="button"
                  onClick={() => setSelectedSquarePos(null)}
                  className="cursor-pointer rounded-lg border border-[#3b3022] bg-[#12100d] px-2.5 py-1 text-[10px] font-black text-[#f5ca5c] hover:bg-[#2a2118]"
                >
                  現在地に戻す
                </button>
              )}
            </div>

            {/* 盤面直下クイックスピンドック（ワイド表示時や盤面を見ながら即スピン可能） */}
            {onQuickSpin && (
              <div className="flex flex-wrap items-center gap-1.5">
                {onChangeStance && (
                  <div className="flex items-center rounded-xl border border-[#3b3022] bg-[#f4ece0] p-0.5 dark:border-[#594b38] dark:bg-[#231d16]">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onChangeStance('teiji')}
                      className={`cursor-pointer rounded-lg px-2 py-1 text-[10px] font-black transition ${
                        stance === 'teiji'
                          ? 'bg-[#1f6f5c] text-white'
                          : 'text-[#5c5141] hover:text-[#12100d] dark:text-[#cfc2ad]'
                      }`}
                    >
                      定時(1〜6)
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onChangeStance('zangyo')}
                      className={`cursor-pointer rounded-lg px-2 py-1 text-[10px] font-black transition ${
                        stance === 'zangyo'
                          ? 'bg-[#b23a2a] text-white'
                          : 'text-[#5c5141] hover:text-[#12100d] dark:text-[#cfc2ad]'
                      }`}
                    >
                      残業W(2〜12)
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onQuickSpin}
                  disabled={isBusy}
                  className={`cursor-pointer rounded-xl border-2 border-[#12100d] border-b-[4px] px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isResting > 0
                      ? 'bg-[#5c5141]'
                      : stance === 'zangyo'
                        ? 'bg-[#b23a2a] hover:bg-[#962d1f]'
                        : 'bg-[#1f6f5c] hover:bg-[#175445]'
                  }`}
                >
                  {isBusy
                    ? '進行中…'
                    : isResting > 0
                      ? `休養消化(残${isResting})`
                      : stance === 'zangyo'
                        ? '残業Wスピンで進む！'
                        : '定時スピンで進む！'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
