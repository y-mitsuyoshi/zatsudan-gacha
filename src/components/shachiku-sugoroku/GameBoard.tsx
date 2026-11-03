"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BOARD_SIZE, FLOORS, GAME_BOARD, LIFE_ASSETS, RANKS } from '@/lib/sugoroku-logic';
import { BoardSquare, Effect, Job, SquareType, Stance } from '@/types/sugoroku';
import { PlayerToken } from './PlayerToken';
import { AssetIcon, GateArchIcon, SquareTypeIcon } from './SugorokuIcons';

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
  assetsCount?: number;
  selectedRoute?: 'elite' | 'venture' | null;
}

interface TypeVisual {
  label: string;
  padBg: string;
  padBorder: string;
  iconBg: string;
  badgeClass: string;
  pillClass: string;
}

const TYPE_VISUALS: Record<SquareType, TypeVisual> = {
  start: {
    label: '出発ゲート',
    padBg: 'bg-gradient-to-b from-[#d8f7ee] via-[#b5ebd9] to-[#8ddbc2]',
    padBorder: 'border-[#0f5242] border-b-[#083328]',
    iconBg: 'bg-[#0f5242] text-[#fffaf0]',
    badgeClass: 'bg-[#0f5242] text-white',
    pillClass: 'bg-[#0f5242] text-white',
  },
  goal: {
    label: '大決済GOAL',
    padBg: 'bg-gradient-to-b from-[#fff6cc] via-[#fde073] to-[#f5b82e]',
    padBorder: 'border-[#9c5a08] border-b-[#5e3403]',
    iconBg: 'bg-[#9c5a08] text-[#fffaf0]',
    badgeClass: 'bg-[#9c5a08] text-white',
    pillClass: 'bg-[#12100d] text-[#fde073]',
  },
  salary: {
    label: '給料日 PAYDAY',
    padBg: 'bg-gradient-to-b from-[#fff8d6] via-[#fce488] to-[#eab834]',
    padBorder: 'border-[#9e690c] border-b-[#634005]',
    iconBg: 'bg-[#12100d] text-[#fde073]',
    badgeClass: 'bg-[#12100d] text-[#fde073]',
    pillClass: 'bg-[#8f5b06] text-white',
  },
  decision: {
    label: 'STOP! 重要決断',
    padBg: 'bg-gradient-to-b from-[#dbeafe] via-[#bfdbfe] to-[#93c5fd]',
    padBorder: 'border-[#1e40af] border-b-[#172554]',
    iconBg: 'bg-[#1e40af] text-white',
    badgeClass: 'bg-[#1e40af] text-white',
    pillClass: 'bg-[#1e3a8a] text-white',
  },
  'job-specific': {
    label: '職種イベント',
    padBg: 'bg-gradient-to-b from-[#f3e8ff] via-[#e9d5ff] to-[#d8b4fe]',
    padBorder: 'border-[#6b21a8] border-b-[#3b0764]',
    iconBg: 'bg-[#6b21a8] text-white',
    badgeClass: 'bg-[#6b21a8] text-white',
    pillClass: 'bg-[#581c87] text-white',
  },
  chance: {
    label: 'ルーレット抽選',
    padBg: 'bg-gradient-to-b from-[#ffedd5] via-[#fed7aa] to-[#fdba74]',
    padBorder: 'border-[#c2410c] border-b-[#7c2d12]',
    iconBg: 'bg-[#c2410c] text-white',
    badgeClass: 'bg-[#c2410c] text-white',
    pillClass: 'bg-[#9a3412] text-white',
  },
  item: {
    label: 'ライフ資産・支給',
    padBg: 'bg-gradient-to-b from-[#d1fae5] via-[#a7f3d0] to-[#6ee7b7]',
    padBorder: 'border-[#047857] border-b-[#064e3b]',
    iconBg: 'bg-[#047857] text-white',
    badgeClass: 'bg-[#047857] text-white',
    pillClass: 'bg-[#065f46] text-white',
  },
  event: {
    label: 'アクシデント・業務',
    padBg: 'bg-gradient-to-b from-[#ffe4e6] via-[#fecdd3] to-[#fda4af]',
    padBorder: 'border-[#be123c] border-b-[#881337]',
    iconBg: 'bg-[#be123c] text-white',
    badgeClass: 'bg-[#be123c] text-white',
    pillClass: 'bg-[#9f1239] text-white',
  },
  normal: {
    label: 'リフレッシュ',
    padBg: 'bg-gradient-to-b from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc]',
    padBorder: 'border-[#0369a1] border-b-[#0c4a6e]',
    iconBg: 'bg-[#0369a1] text-white',
    badgeClass: 'bg-[#0369a1] text-white',
    pillClass: 'bg-[#075985] text-white',
  },
};

function summarizeSquareEffect(
  square: BoardSquare,
  playerJob: Job,
  salaryBonus: number,
): { text: string; positive: boolean } {
  if (square.type === 'start') {
    return { text: 'START', positive: true };
  }
  if (square.type === 'goal') {
    return { text: '+80万・大決済', positive: true };
  }
  if (square.type === 'salary') {
    return { text: `給料+${salaryBonus}万`, positive: true };
  }
  if (square.type === 'decision') {
    return { text: 'STOP! 決断', positive: true };
  }
  if (square.type === 'chance') {
    const hitEff = square.random?.hit.effect;
    if (hitEff?.asset) {
      return { text: '抽選:資産獲得', positive: true };
    }
    if (hitEff?.money) {
      return { text: `抽選:+${hitEff.money}万`, positive: true };
    }
    return { text: `当選${Math.round((square.random?.chance ?? 0.65) * 100)}%`, positive: true };
  }

  const jobOutcome = square.jobOutcomes?.[playerJob];
  const eff: Effect | undefined = jobOutcome?.effect ?? square.outcome?.effect;
  if (!eff) return { text: TYPE_VISUALS[square.type].label, positive: true };

  const parts: string[] = [];
  if (eff.asset && LIFE_ASSETS[eff.asset]) {
    parts.push(`資産:${LIFE_ASSETS[eff.asset].name.slice(0, 4)}`);
  }
  if (eff.money) parts.push(`${eff.money > 0 ? '+' : ''}${eff.money}万`);
  if (eff.career) parts.push(`評${eff.career > 0 ? '+' : ''}${eff.career}`);
  if (eff.move) parts.push(eff.move > 0 ? `+${eff.move}進` : `${eff.move}戻`);
  if (eff.yaruki) parts.push(`気${eff.yaruki > 0 ? '+' : ''}${eff.yaruki}`);
  if (eff.rest) parts.push(`${eff.rest}休`);
  if (eff.item) parts.push('支給品');

  const positive =
    Boolean(eff.asset) ||
    Boolean(eff.item) ||
    (eff.money ?? 0) > 0 ||
    (eff.career ?? 0) >= 2 ||
    (eff.yaruki ?? 0) > 0;

  return { text: parts.slice(0, 2).join('・') || 'イベント', positive };
}

/** SVG (1200x960) 座標変換ヘルパー */
const W = 1200;
const H = 960;
const sx = (pct: number) => Math.round((pct / 100) * W);
const sy = (pct: number) => Math.round((pct / 100) * H);

function buildSmoothRoadPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const coords = points.map((p) => ({ x: sx(p.x), y: sy(p.y) }));
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    d += ` Q ${curr.x} ${curr.y}, ${midX} ${midY}`;
  }
  const last = coords[coords.length - 1];
  d += ` T ${last.x} ${last.y}`;
  return d;
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
  assetsCount = 0,
  selectedRoute = null,
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

  // 2つのビューモード: 'diorama' (全景マップ表示) / 'follow' (拡大フォロー表示)
  const [viewMode, setViewMode] = useState<'diorama' | 'follow'>('diorama');
  const [selectedPosition, setSelectedPosition] = useState<number>(position);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);

  const visitedSet = useMemo(() => new Set([...visited, position]), [position, visited]);
  const boardScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedPosition(position);
  }, [position]);

  // 次の1ターンで到達しうるマスと必要ルーレット出目
  const reachableMap = useMemo(() => {
    const map = new Map<number, string>();
    if (position >= BOARD_SIZE) return map;
    if (slowNextTurn) {
      map.set(Math.min(BOARD_SIZE, position + 1), '1');
      return map;
    }
    const minRoll = stance === 'zangyo' ? 2 : 1;
    const maxRoll = stance === 'zangyo' ? 12 : 6;
    for (let r = minRoll; r <= maxRoll; r++) {
      const target = Math.min(BOARD_SIZE, position + r + diceBoost);
      if (!map.has(target)) {
        map.set(target, `${r}`);
      }
    }
    return map;
  }, [position, stance, diceBoost, slowNextTurn]);

  const activeSquare = useMemo(
    () => GAME_BOARD.find((s) => s.position === position) ?? GAME_BOARD[0],
    [position],
  );

  const inspectedSquare = useMemo(
    () => GAME_BOARD.find((s) => s.position === selectedPosition) ?? GAME_BOARD[0],
    [selectedPosition],
  );
  const inspectedVisual = TYPE_VISUALS[inspectedSquare.type];
  const inspectedGate = RANKS.find((r) => r.gatePosition > 0 && r.gatePosition === inspectedSquare.position);
  const inspectedJobBonus = inspectedSquare.jobOutcomes?.[validJob];
  const currentRank = RANKS[rankIndex] ?? RANKS[0];
  const currentDistrict =
    FLOORS.find((f) => position >= f.range[0] && position <= f.range[1]) ?? FLOORS[0];

  const inspectedAsset = useMemo(() => {
    const assetId =
      inspectedJobBonus?.effect.asset ??
      inspectedSquare.outcome?.effect.asset ??
      inspectedSquare.random?.hit.effect.asset;
    return assetId ? LIFE_ASSETS[assetId] : null;
  }, [inspectedJobBonus, inspectedSquare]);

  // メインの連続ワインディングロードパス & District 2 の分岐バイパスパス
  const mainRoadPath = useMemo(() => buildSmoothRoadPath(GAME_BOARD), []);
  const upperForkPath = useMemo(() => {
    const pts = [8, 9, 10, 13].map((idx) => GAME_BOARD[idx]);
    return buildSmoothRoadPath(pts);
  }, []);
  const lowerForkPath = useMemo(() => {
    const pts = [8, 11, 12, 13].map((idx) => GAME_BOARD[idx]);
    return buildSmoothRoadPath(pts);
  }, []);

  // 拡大フォロー表示のカメラトランスフォーム算出
  const cameraTransform = useMemo(() => {
    if (viewMode !== 'follow') {
      return 'scale(1) translate(0%, 0%)';
    }
    const clampedX = Math.max(20, Math.min(80, activeSquare.x));
    const clampedY = Math.max(18, Math.min(82, activeSquare.y));
    const tx = 50 - clampedX;
    const ty = 50 - clampedY;
    return `scale(1.38) translate(${tx * 0.68}%, ${ty * 0.68}%)`;
  }, [viewMode, activeSquare.x, activeSquare.y]);

  const handleSelectSquare = (pos: number) => {
    setSelectedPosition(pos);
    setPopoverOpen(true);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border-3 border-[#261e14] bg-[#f4ece0] p-3 shadow-[0_12px_0_#1a140d,0_20px_40px_rgba(0,0,0,0.32)] sm:p-4 dark:border-[#6e5a3e] dark:bg-[#181511]">
      {/* 盤面ヘッダー＆ビュー切替（全景マップ表示 / 拡大フォロー表示） */}
      <div className="relative z-20 mb-3 flex flex-col gap-2.5 border-b-2 border-[#d4c4a8] pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#3b3226]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#f5ca5c] bg-[#12100d] px-2.5 py-0.5 font-mono text-[10px] font-black tracking-widest text-[#f5ca5c]">
              SHACHIKU LIFE ROAD 35
            </span>
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-black text-white"
              style={{ backgroundColor: currentDistrict.themeColor }}
            >
              {currentDistrict.floorCode}: {currentDistrict.title}
            </span>
            <span className="font-mono text-xs font-black text-[#5c5141] dark:text-[#cfc2ad]">
              現在地: #{String(position).padStart(2, '0')} / {BOARD_SIZE}（{currentRank.name}・給料日+{currentRank.salaryBonus}万）
            </span>
          </div>
          <h2 className="font-editorial mt-1 text-lg font-black tracking-tight text-[#12100d] sm:text-2xl dark:text-[#fffaf0]">
            社畜ライフロード 立体ジオラマ盤面マップ
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-xl border-2 border-[#3b3022] bg-[#e6dac6] p-0.5 dark:border-[#594b38] dark:bg-[#26211a]"
            role="group"
            aria-label="盤面カメラモード切替"
          >
            <button
              type="button"
              onClick={() => setViewMode('diorama')}
              className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-black transition ${
                viewMode === 'diorama'
                  ? 'bg-[#12100d] text-[#f5ca5c] shadow-xs'
                  : 'text-[#5c5141] hover:text-[#12100d] dark:text-[#cfc2ad]'
              }`}
            >
              全景マップ表示
            </button>
            <button
              type="button"
              onClick={() => setViewMode('follow')}
              className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-black transition ${
                viewMode === 'follow'
                  ? 'bg-[#12100d] text-[#f5ca5c] shadow-xs'
                  : 'text-[#5c5141] hover:text-[#12100d] dark:text-[#cfc2ad]'
              }`}
            >
              拡大フォロー表示
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedPosition(position);
              setPopoverOpen(true);
            }}
            className="min-h-[36px] rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] px-3 py-1 text-xs font-black text-[#12100d] shadow-xs transition hover:bg-[#e8dcc8] dark:border-[#594d3b] dark:bg-[#2a241c] dark:text-[#fffaf0]"
          >
            現在地詳細
          </button>
        </div>
      </div>

      {/* 5つのジオラマ地区クイックナビゲーションバー */}
      <div className="relative z-20 mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {FLOORS.map((district) => {
          const isCurrent = position >= district.range[0] && position <= district.range[1];
          return (
            <button
              key={district.id}
              type="button"
              onClick={() => handleSelectSquare(district.range[0])}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition ${
                isCurrent
                  ? 'border-[#12100d] bg-[#12100d] text-[#fffaf0] shadow-xs dark:border-[#f5ca5c]'
                  : 'border-[#c9b99b] bg-[#fffaf0]/90 text-[#12100d] hover:bg-[#fffaf0] dark:border-[#3b3226] dark:bg-[#221d17] dark:text-[#fffaf0]'
              }`}
            >
              <span
                className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-black text-white"
                style={{ backgroundColor: district.themeColor }}
              >
                {district.floorCode}
              </span>
              <span className="truncate text-[10px] font-black">
                {district.title.split('（')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* === 2.5D イラスト・テーブルトップ・ジオラマワールドマップ === */}
      <div
        ref={boardScrollRef}
        className="relative overflow-x-auto overflow-y-hidden rounded-2xl border-3 border-[#261e14] bg-[#cbe7f5] shadow-inner"
      >
        <div
          className="relative min-w-[880px] w-full aspect-[1200/960] select-none overflow-hidden transition-transform duration-500 ease-out origin-center"
          style={{ transform: cameraTransform }}
        >
          {/* 1. 背景ジオラマ＆ハイウェイ道路レイヤー (SVG 1200x960) */}
          <svg
            viewBox="0 0 1200 960"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="harborWater" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="district1Grass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d9f5d6" />
                <stop offset="100%" stopColor="#b7e6b5" />
              </linearGradient>
              <linearGradient id="district2Metro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d8e3f0" />
                <stop offset="100%" stopColor="#c2d3e8" />
              </linearGradient>
              <linearGradient id="district3Canyon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f3e5c8" />
                <stop offset="100%" stopColor="#e2cba0" />
              </linearGradient>
              <linearGradient id="district4Hills" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e6dcf5" />
                <stop offset="100%" stopColor="#d2c2ec" />
              </linearGradient>
              <linearGradient id="district5Ocean" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="55%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <linearGradient id="resortIslandSand" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="100%" stopColor="#fde68a" />
              </linearGradient>
              <linearGradient id="goldBridge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f5ca5c" />
                <stop offset="50%" stopColor="#fff3b0" />
                <stop offset="100%" stopColor="#c9922e" />
              </linearGradient>
            </defs>

            {/* === 5つのディストリクト地形ベース === */}
            {/* District 1: フレッシュマン・ハーバー (y: 0..195) */}
            <rect x="0" y="0" width="1200" height="195" fill="url(#district1Grass)" />
            <path d="M0 0 L220 0 Q190 110 120 195 L0 195 Z" fill="url(#harborWater)" />
            {/* 白波ライン＆ヨット */}
            <path d="M15 45 Q45 35 75 45 T135 45" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.65" />
            <polygon points="55,65 75,30 80,65" fill="#ffffff" stroke="#12100d" strokeWidth="1.5" />
            <rect x="50" y="65" width="35" height="8" rx="4" fill="#b23a2a" stroke="#12100d" strokeWidth="1.5" />

            {/* District 2: メトロ・ビジネス街 (y: 195..390) */}
            <rect x="0" y="195" width="1200" height="195" fill="url(#district2Metro)" />
            {/* 都市グリッド装飾 */}
            <line x1="0" y1="195" x2="1200" y2="195" stroke="#8a7d69" strokeWidth="3" strokeDasharray="12 6" />

            {/* District 3: マネジメント・キャニオン＆エメラルド川 (y: 390..585) */}
            <rect x="0" y="390" width="1200" height="195" fill="url(#district3Canyon)" />
            {/* 渓谷を流れるエメラルド川 */}
            <path
              d="M 960 390 C 920 450, 960 520, 910 585 L 1040 585 C 1080 520, 1030 450, 1070 390 Z"
              fill="#2dd4bf"
              stroke="#0f766e"
              strokeWidth="3"
            />
            <line x1="0" y1="390" x2="1200" y2="390" stroke="#8a7d69" strokeWidth="3" strokeDasharray="12 6" />

            {/* District 4: エグゼクティブ・ベイ＆投資ヒルズ (y: 585..775) */}
            <rect x="0" y="585" width="1200" height="190" fill="url(#district4Hills)" />
            <path d="M980 585 L1200 585 L1200 775 L940 775 Q990 680 980 585 Z" fill="url(#harborWater)" />
            <line x1="0" y1="585" x2="1200" y2="585" stroke="#8a7d69" strokeWidth="3" strokeDasharray="12 6" />

            {/* District 5: ドリーム・リゾートアイランド (y: 775..960) */}
            <rect x="0" y="775" width="1200" height="185" fill="url(#district5Ocean)" />
            {/* リゾートアイランドの砂浜と緑地 */}
            <path
              d="M 210 865 Q 260 790, 520 795 T 920 790 Q 1160 795, 1185 875 Q 1170 950, 890 952 T 310 948 Q 195 940, 210 865 Z"
              fill="url(#resortIslandSand)"
              stroke="#d97706"
              strokeWidth="4"
            />
            <path
              d="M 270 870 Q 340 815, 580 818 T 940 815 Q 1120 820, 1140 875 Q 1110 930, 860 932 T 350 928 Z"
              fill="#bbf7d0"
            />
            <line x1="0" y1="775" x2="1200" y2="775" stroke="#0284c7" strokeWidth="3" />

            {/* === ディストリクト背景看板ラベル === */}
            <g opacity="0.88">
              <rect x="16" y="14" width="310" height="26" rx="6" fill="#12100d" />
              <text x="28" y="31" fill="#f5ca5c" fontSize="12" fontWeight="900" fontFamily="monospace">
                AREA 1: フレッシュマン・ハーバー (00-07)
              </text>

              <rect x="16" y="206" width="375" height="26" rx="6" fill="#12100d" />
              <text x="28" y="223" fill="#82bef5" fontSize="12" fontWeight="900" fontFamily="monospace">
                AREA 2: メトロ・ビジネス街＆分岐ジャンクション (08-14)
              </text>

              <rect x="16" y="400" width="380" height="26" rx="6" fill="#12100d" />
              <text x="28" y="417" fill="#f5ca5c" fontSize="12" fontWeight="900" fontFamily="monospace">
                AREA 3: マネジメント渓谷＆黄金給料日橋 (15-21)
              </text>

              <rect x="16" y="596" width="340" height="26" rx="6" fill="#12100d" />
              <text x="28" y="613" fill="#d8b4fe" fontSize="12" fontWeight="900" fontFamily="monospace">
                AREA 4: エグゼクティブ・ベイ＆投資ヒルズ (22-28)
              </text>

              <rect x="16" y="786" width="365" height="26" rx="6" fill="#12100d" />
              <text x="28" y="803" fill="#fde073" fontSize="12" fontWeight="900" fontFamily="monospace">
                AREA 5: ドリーム・リゾートアイランド (29-35)
              </text>
            </g>

            {/* === 2.5D ミニチュアランドマーク群 (立体ベクターイラスト) === */}
            {/* Area 1: 桜並木・臨海駅・研修ホール・カフェパラソル */}
            <g>
              {/* 桜の木 */}
              <circle cx="155" cy="42" r="18" fill="#f9a8d4" stroke="#12100d" strokeWidth="2" />
              <circle cx="172" cy="48" r="14" fill="#fbcfe8" stroke="#12100d" strokeWidth="1.5" />
              <rect x="160" y="54" width="6" height="16" fill="#78350f" />
              {/* カフェテラス */}
              <polygon points="365,36 395,36 380,18" fill="#ef4444" stroke="#12100d" strokeWidth="1.8" />
              <line x1="380" y1="36" x2="380" y2="52" stroke="#12100d" strokeWidth="2" />
              {/* 研修センタービル */}
              <rect x="495" y="18" width="54" height="44" rx="4" fill="#fffaf0" stroke="#12100d" strokeWidth="2" />
              <rect x="502" y="25" width="40" height="10" fill="#38bdf8" />
              <rect x="502" y="40" width="40" height="10" fill="#38bdf8" />
            </g>

            {/* Area 2: メトロ摩天楼スカイライン＆分岐ジャンクション標識 */}
            <g>
              {/* 摩天楼タワー群 */}
              <rect x="1025" y="198" width="42" height="65" fill="#1e3a8a" stroke="#12100d" strokeWidth="2" />
              <rect x="1072" y="210" width="34" height="53" fill="#1d4ed8" stroke="#12100d" strokeWidth="2" />
              {/* エリート出世ハイウェイ標識 (Upper Route) */}
              <rect x="785" y="198" width="195" height="22" rx="5" fill="#1e40af" stroke="#f5ca5c" strokeWidth="2" />
              <text x="882" y="213" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">
                ▲ エリート出世ハイウェイ
              </text>
              {/* ベンチャー挑戦バイパス標識 (Lower Route) */}
              <rect x="465" y="362" width="195" height="22" rx="5" fill="#9a3412" stroke="#f5ca5c" strokeWidth="2" />
              <text x="562" y="377" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">
                ▼ ベンチャー挑戦バイパス
              </text>
            </g>

            {/* Area 3: マネジメント・キャニオンの山岳＆トンネル＆黄金吊り橋 */}
            <g>
              {/* 渓谷の山々 */}
              <polygon points="260,445 305,392 350,445" fill="#9a7b56" stroke="#12100d" strokeWidth="2" />
              <polygon points="290,410 305,392 320,410" fill="#fffaf0" />
              <polygon points="665,442 715,388 765,442" fill="#8c6d46" stroke="#12100d" strokeWidth="2" />
              <polygon points="698,406 715,388 732,406" fill="#fffaf0" />
              {/* ゴールデン給料日吊り橋の主塔とケーブル */}
              <rect x="955" y="425" width="12" height="110" fill="#b91c1c" stroke="#12100d" strokeWidth="2" />
              <rect x="1045" y="425" width="12" height="110" fill="#b91c1c" stroke="#12100d" strokeWidth="2" />
              <path d="M 930 480 Q 1006 420 1085 480" stroke="#f5ca5c" strokeWidth="3" fill="none" />
            </g>

            {/* Area 4: 証券取引所スパイア＆都心タワーマンション */}
            <g>
              {/* 証券取引所スパイア */}
              <rect x="820" y="592" width="46" height="68" fill="#4c1d95" stroke="#12100d" strokeWidth="2" />
              <polygon points="820,592 843,568 866,592" fill="#f5ca5c" stroke="#12100d" strokeWidth="2" />
              <text x="843" y="630" fill="#fde073" fontSize="9" fontWeight="900" textAnchor="middle">
                STOCK
              </text>
              {/* 都心デザイナーズマンション */}
              <rect x="670" y="590" width="44" height="62" rx="3" fill="#0f766e" stroke="#12100d" strokeWidth="2" />
              <text x="692" y="625" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle">
                CONDO
              </text>
            </g>

            {/* Area 5: 海上連絡橋・ヤシの木・リゾート別荘・ヨットハーバー・大決済モニュメント */}
            <g>
              {/* 海上連絡橋 (Square 29 -> 30) */}
              <rect x="90" y="838" width="185" height="36" rx="6" fill="url(#goldBridge)" stroke="#12100d" strokeWidth="2" />
              {/* ヤシの木 */}
              <path d="M 410 825 Q 415 795 405 785" stroke="#78350f" strokeWidth="5" fill="none" />
              <ellipse cx="395" cy="785" rx="14" ry="5" fill="#16a34a" />
              <ellipse cx="418" cy="785" rx="14" ry="5" fill="#15803d" />
              {/* リゾート別荘ヴィラ */}
              <polygon points="485,815 520,790 555,815" fill="#e11d48" stroke="#12100d" strokeWidth="2" />
              <rect x="493" y="815" width="54" height="32" fill="#fffaf0" stroke="#12100d" strokeWidth="2" />
              {/* ゴール・ヘリポート＆ヨット */}
              <circle cx="1025" cy="825" r="20" fill="#fde073" stroke="#12100d" strokeWidth="2" />
              <text x="1025" y="830" fill="#12100d" fontSize="14" fontWeight="900" textAnchor="middle">
                H
              </text>
            </g>

            {/* === District 2 分岐バイパス道路 (Upper Elite vs Lower Venture) === */}
            <path
              d={upperForkPath}
              stroke={selectedRoute === 'elite' ? '#f5ca5c' : '#1e3a8a'}
              strokeWidth="36"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.85"
            />
            <path
              d={lowerForkPath}
              stroke={selectedRoute === 'venture' ? '#f5ca5c' : '#7c2d12'}
              strokeWidth="36"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.85"
            />

            {/* === メイン立体ワインディング・ハイウェイ道路 === */}
            {/* 道路の3Dエッジ（影・路肩） */}
            <path
              d={mainRoadPath}
              stroke="#12100d"
              strokeWidth="44"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* アスファルト路面 */}
            <path
              d={mainRoadPath}
              stroke="#334155"
              strokeWidth="34"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* センターライン（白破線） */}
            <path
              d={mainRoadPath}
              stroke="#fffaf0"
              strokeWidth="3"
              strokeDasharray="10 10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.9"
            />

            {/* 各マス間の進行方向シェブロン矢印 */}
            {GAME_BOARD.slice(0, -1).map((sq, idx) => {
              const next = GAME_BOARD[idx + 1];
              const mx = (sx(sq.x) + sx(next.x)) / 2;
              const my = (sy(sq.y) + sy(next.y)) / 2;
              const angle = (Math.atan2(sy(next.y) - sy(sq.y), sx(next.x) - sx(sq.x)) * 180) / Math.PI;
              const passed = visitedSet.has(sq.position) && visitedSet.has(next.position);
              return (
                <g key={`arrow-${idx}`} transform={`translate(${mx}, ${my}) rotate(${angle})`}>
                  <circle r="8" fill={passed ? '#f5ca5c' : '#1e293b'} stroke="#12100d" strokeWidth="1.5" />
                  <path
                    d="M -3 -3.5 L 4 0 L -3 3.5 Z"
                    fill={passed ? '#12100d' : '#f5ca5c'}
                  />
                </g>
              );
            })}

            {/* 給料日ゲート（PAYDAY GATE）の黄金アーチ装飾 (Squares 5, 13, 21, 29) */}
            {[5, 13, 21, 29].map((payPos) => {
              const sq = GAME_BOARD[payPos];
              const cx = sx(sq.x);
              const cy = sy(sq.y);
              return (
                <g key={`payday-arch-${payPos}`} transform={`translate(${cx}, ${cy})`}>
                  <ellipse cx="0" cy="0" rx="58" ry="42" fill="#f5ca5c" fillOpacity="0.28" />
                  <path
                    d="M -48 -28 Q 0 -54 48 -28"
                    stroke="#f5ca5c"
                    strokeWidth="6"
                    fill="none"
                  />
                </g>
              );
            })}
          </svg>

          {/* 2. 36マスのインタラクティブ 3D テーブルトップ・スペースパッド */}
          <ol className="relative z-10 h-full w-full list-none m-0 p-0">
            {GAME_BOARD.map((square) => {
              const visual = TYPE_VISUALS[square.type];
              const isActive = square.position === position;
              const isSelected = square.position === selectedPosition;
              const isVisited = visitedSet.has(square.position);
              const reachRoll = reachableMap.get(square.position);
              const gateRank = RANKS.find((r) => r.gatePosition > 0 && r.gatePosition === square.position);
              const hasMyJobBonus = Boolean(square.jobOutcomes?.[validJob]);
              const summary = summarizeSquareEffect(square, validJob, currentRank.salaryBonus);

              return (
                <li
                  key={square.position}
                  style={{ left: `${square.x}%`, top: `${square.y}%` }}
                  className="
                    absolute -translate-x-1/2 -translate-y-1/2
                    w-[100px] sm:w-[108px]
                  "
                  aria-current={isActive ? 'step' : undefined}
                  data-active={isActive ? 'true' : undefined}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectSquare(square.position)}
                    title={`#${square.position} ${square.title}: ${square.description}`}
                    className={`group relative flex w-full flex-col justify-between rounded-xl border-2 border-b-[5px] p-1.5 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5ca5c] ${visual.padBg} ${visual.padBorder} ${
                      isActive
                        ? 'z-30 -translate-y-1.5 scale-105 ring-3 ring-[#12100d] shadow-[0_10px_22px_rgba(0,0,0,0.45)]'
                        : isSelected
                          ? 'z-20 -translate-y-1 ring-2 ring-[#f5ca5c] shadow-lg'
                          : reachRoll
                            ? 'z-20 hover:-translate-y-1 ring-2 ring-[#f5ca5c]/90 shadow-md'
                            : 'z-10 hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    {/* 給料日 PAYDAY / 昇進ゲート / STOP! バッジ（上部リボン） */}
                    {square.type === 'salary' ? (
                      <div className="-mt-3 mb-0.5 flex items-center justify-between rounded-full border border-[#12100d] bg-[#12100d] px-1.5 py-0.5 text-[8px] font-black text-[#fde073] shadow-xs">
                        <span>PAYDAY 給料日</span>
                        {gateRank && <span>{gateRank.name}査定</span>}
                      </div>
                    ) : square.type === 'decision' ? (
                      <div className="-mt-3 mb-0.5 flex items-center justify-between rounded-full border border-[#12100d] bg-[#1e3a8a] px-1.5 py-0.5 text-[8px] font-black text-white shadow-xs">
                        <span>STOP! 決断</span>
                        {gateRank && <span className="text-[#fde073]">{gateRank.name}査定</span>}
                      </div>
                    ) : square.type === 'goal' ? (
                      <div className="-mt-3 mb-0.5 flex items-center justify-center rounded-full border border-[#12100d] bg-[#b23a2a] px-1.5 py-0.5 text-[8px] font-black text-white shadow-xs">
                        <span>GRAND GOAL</span>
                      </div>
                    ) : null}

                    {/* 上段: マス番号 + 特効 / 到達予測出目 + アイコン */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-0.5">
                        <span className="rounded bg-[#12100d] px-1 py-0.5 font-mono text-[9px] font-black leading-none text-[#fffaf0]">
                          {String(square.position).padStart(2, '0')}
                        </span>
                        {hasMyJobBonus && (
                          <span className="rounded bg-[#6b21a8] px-1 py-0.5 text-[7px] font-black leading-none text-white">
                            特効
                          </span>
                        )}
                      </span>

                      <div className="flex items-center gap-0.5">
                        {reachRoll && !isActive && (
                          <span className="rounded-full border border-[#12100d] bg-[#fde073] px-1 py-0.5 font-mono text-[8px] font-black leading-none text-[#12100d]">
                            出目{reachRoll}
                          </span>
                        )}
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md shadow-xs ${visual.iconBg}`}
                        >
                          <SquareTypeIcon type={square.type} size={11} />
                        </span>
                      </div>
                    </div>

                    {/* 中段: マス見出し */}
                    <p className="my-0.5 truncate text-[10px] font-black leading-tight text-[#12100d]">
                      {square.short || square.title}
                    </p>

                    {/* 下段: 効果ピル + 通過済チェック */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`inline-block max-w-full truncate rounded px-1 py-0.5 text-[8px] font-black leading-none ${visual.pillClass}`}
                      >
                        {summary.text}
                      </span>
                      {isVisited && !isActive && (
                        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#12100d] text-[7px] font-black text-[#fde073]">
                          済
                        </span>
                      )}
                    </div>

                    {/* アクティブプレイヤーの3Dキャリア・クルーザーコマ */}
                    {isActive && (
                      <div className="pointer-events-none absolute -top-12 left-1/2 z-40 -translate-x-1/2">
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
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* 拡大フォローモード時のミニマップ・レーダーインジケーター */}
        {viewMode === 'follow' && (
          <div
            className="pointer-events-none absolute bottom-3 right-3 z-30 w-48 rounded-xl border-2 border-[#12100d] bg-[#12100d]/90 p-2 text-[#fffaf0] shadow-lg"
            aria-label="ミニマップレーダー"
          >
            <div className="mb-1 flex items-center justify-between font-mono text-[9px] font-black text-[#f5ca5c]">
              <span>MINI-MAP RADAR</span>
              <span>#{String(position).padStart(2, '0')}/35</span>
            </div>
            <svg viewBox="0 0 120 96" className="h-24 w-full rounded bg-[#1e293b]">
              <path
                d="M 9 11 L 110 14 L 110 27 L 10 30 L 10 46 L 108 47 L 108 65 L 11 66 L 11 83 L 111 84"
                stroke="#64748b"
                strokeWidth="2.5"
                fill="none"
              />
              {GAME_BOARD.map((sq) => (
                <circle
                  key={sq.position}
                  cx={(sq.x / 100) * 120}
                  cy={(sq.y / 100) * 96}
                  r={sq.position === position ? 4 : sq.type === 'salary' ? 2.5 : 1.5}
                  fill={
                    sq.position === position
                      ? '#ef4444'
                      : sq.type === 'salary'
                        ? '#f5ca5c'
                        : visitedSet.has(sq.position)
                          ? '#2dd4bf'
                          : '#94a3b8'
                  }
                />
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* マス詳細ポップオーバー＆インスペクターパネル */}
      <div
        className="relative z-20 mt-3 rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-3.5 shadow-sm dark:border-[#594b38] dark:bg-[#221d17]"
        aria-live="polite"
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#12100d] shadow-xs ${inspectedVisual.iconBg}`}
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
                    通過済エリア
                  </span>
                )}
                {inspectedGate && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#b57c1e] px-2 py-0.5 text-[10px] font-black text-white">
                    <GateArchIcon size={12} />
                    昇進査定ゲート：{inspectedGate.name}（必要評価 {inspectedGate.requiredCareer}pt / 給料日+{inspectedGate.salaryBonus}万）
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
                <p className="mt-1.5 inline-block rounded-lg border border-[#6b21a8]/40 bg-[#6b21a8]/10 px-2.5 py-1 text-[11px] font-black text-[#581c87] dark:text-[#e9d5ff]">
                  ★ あなたの職種（{validJob}）特効：{inspectedJobBonus.text}
                </p>
              )}
              {inspectedAsset && (
                <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-[#047857]/40 bg-[#047857]/10 px-2.5 py-1 text-[11px] font-black text-[#065f46] dark:text-[#6ee7b7]">
                  <AssetIcon assetId={inspectedAsset.id} size={14} />
                  <span>
                    獲得可能ライフ資産：{inspectedAsset.name}（評価額 {inspectedAsset.value}万円 / 給料日配当 +{inspectedAsset.dividend}万円）
                  </span>
                </div>
              )}
            </div>
          </div>

          {popoverOpen && (
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="self-end rounded-lg border border-[#8a7d69] px-2.5 py-1 text-[10px] font-black text-[#5c5141] hover:bg-[#e6dac6] sm:self-center dark:text-[#cfc2ad]"
            >
              詳細を閉じる
            </button>
          )}
        </div>
      </div>

      {/* 盤面フッター凡例 */}
      <div className="relative z-20 mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#d4c4a8] pt-2.5 text-[10px] font-bold text-[#5c5141] dark:border-[#3b3226] dark:text-[#cfc2ad]">
        <div className="flex flex-wrap items-center gap-2">
          {(
            ['salary', 'decision', 'job-specific', 'chance', 'item', 'event', 'normal', 'goal'] as SquareType[]
          ).map((type) => (
            <span key={type} className="inline-flex items-center gap-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-xs ${TYPE_VISUALS[type].iconBg}`} />
              <span>{TYPE_VISUALS[type].label}</span>
            </span>
          ))}
        </div>
        <span className="font-mono">
          給料日ゲート（#05・#13・#21・#29）は通過するだけで給与＆資産配当が支給されます
        </span>
      </div>
    </div>
  );
};
