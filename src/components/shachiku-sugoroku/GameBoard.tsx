"use client";

import React from 'react';
import { GAME_BOARD } from '@/lib/sugoroku-logic';
import { BoardSquare, SquareType } from '@/types/sugoroku';
import { PlayerToken } from './PlayerToken';

interface GameBoardProps {
  position: number;
  playerName: string;
  job?: string;
  previousPosition?: number;
  isMoving?: boolean;
  visited?: number[];
}

type StageTheme = {
  id: number;
  title: string;
  subtitle: string;
  range: [number, number];
  header: string;
  badge: string;
  line: string;
  glow: string;
};

const STAGES: StageTheme[] = [
  { id: 1, title: '入社', subtitle: '研修と初仕事', range: [0, 9], header: 'from-sky-600 to-cyan-500', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', line: 'bg-sky-200 dark:bg-sky-900/60', glow: 'shadow-sky-200/60' },
  { id: 2, title: '新人', subtitle: '現場で学ぶ日々', range: [10, 19], header: 'from-teal-600 to-emerald-500', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200', line: 'bg-teal-200 dark:bg-teal-900/60', glow: 'shadow-teal-200/60' },
  { id: 3, title: '若手', subtitle: '仕事の波に乗る', range: [20, 29], header: 'from-violet-600 to-purple-500', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200', line: 'bg-violet-200 dark:bg-violet-900/60', glow: 'shadow-violet-200/60' },
  { id: 4, title: '中堅', subtitle: '責任と忙しさの狭間', range: [30, 39], header: 'from-orange-600 to-amber-500', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200', line: 'bg-orange-200 dark:bg-orange-900/60', glow: 'shadow-orange-200/60' },
  { id: 5, title: '管理職', subtitle: 'チームを動かす', range: [40, 49], header: 'from-rose-600 to-pink-500', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200', line: 'bg-rose-200 dark:bg-rose-900/60', glow: 'shadow-rose-200/60' },
  { id: 6, title: '役員', subtitle: '最終章・ボーナス支給日へ', range: [50, 60], header: 'from-amber-600 to-yellow-500', badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200', line: 'bg-amber-200 dark:bg-amber-900/60', glow: 'shadow-amber-200/60' },
];

const SQUARE_STYLES: Record<SquareType, { tile: string; dot: string; label: string }> = {
  start: { tile: 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40', dot: 'bg-emerald-500', label: 'スタート' },
  goal: { tile: 'border-yellow-400 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-950/40', dot: 'bg-yellow-500', label: 'ゴール' },
  salary: { tile: 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30', dot: 'bg-blue-500', label: '給料日' },
  item: { tile: 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950/30', dot: 'bg-purple-500', label: 'アイテム' },
  'job-specific': { tile: 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30', dot: 'bg-indigo-500', label: '職業イベント' },
  event: { tile: 'border-pink-300 bg-pink-50 dark:border-pink-700 dark:bg-pink-950/30', dot: 'bg-pink-500', label: 'イベント' },
  decision: { tile: 'border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950/30', dot: 'bg-cyan-500', label: '選択' },
  normal: { tile: 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900/50', dot: 'bg-stone-400', label: '通常' },
};

const getSquareIcon = (square: BoardSquare): string => {
  if (square.icon) return square.icon;
  switch (square.type) {
    case 'start': return '🏁';
    case 'goal': return '🎊';
    case 'salary': return '💰';
    case 'item': return '🎁';
    case 'job-specific': return '💼';
    case 'decision': return '🧭';
    case 'event': return '⚡';
    default: return '•';
  }
};

const BoardTile = ({
  square,
  isActive,
  isVisited,
  playerName,
  job,
}: {
  square: BoardSquare;
  isActive: boolean;
  isVisited: boolean;
  playerName: string;
  job?: string;
}) => {
  const style = SQUARE_STYLES[square.type];
  const isGoal = square.type === 'goal';
  const isStart = square.type === 'start';

  return (
    <li
      className={`relative flex min-h-[66px] flex-col justify-between rounded-xl border-2 p-1.5 text-left shadow-sm transition-all duration-300 sm:min-h-[78px] ${style.tile} ${
        isActive
          ? '-translate-y-1 scale-[1.04] shadow-xl ring-4 ring-amber-400/80 dark:ring-amber-300/80 z-10'
          : isVisited
            ? 'ring-2 ring-amber-300/30 dark:ring-amber-500/20'
            : 'hover:-translate-y-0.5 hover:shadow-md'
      } ${isGoal ? 'border-4' : ''}`}
      aria-current={isActive ? 'step' : undefined}
      title={`${square.position}マス目: ${square.title} — ${square.description}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[9px] font-black ${
          isStart || isGoal
            ? 'bg-stone-800 text-white dark:bg-amber-200 dark:text-stone-900'
            : 'bg-white/80 text-stone-500 dark:bg-stone-800/80 dark:text-stone-300'
        }`}>
          {isStart ? 'START' : isGoal ? 'GOAL' : square.position}
        </span>
        <span className="text-base leading-none" aria-hidden="true">{getSquareIcon(square)}</span>
      </div>

      <p className={`mt-1 text-[9px] font-black leading-[1.25] line-clamp-2 sm:text-[10px] ${
        isStart || isGoal ? 'text-stone-800 dark:text-amber-100' : 'text-stone-700 dark:text-stone-200'
      }`}>
        {square.title}
      </p>

      <div className="mt-1 flex items-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
        <span className="text-[8px] font-bold tracking-wide text-stone-400 dark:text-stone-500">{style.label}</span>
      </div>

      {isVisited && !isActive && (
        <span className="absolute bottom-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 text-[7px] font-black text-amber-950" aria-hidden="true">
          ✓
        </span>
      )}

      {isActive && (
        <div key={square.position} className="pointer-events-none absolute -top-5 left-1/2 z-30 -translate-x-1/2 animate-[bounce_0.45s_ease-out_1]">
          <PlayerToken playerName={playerName} job={job} />
        </div>
      )}
    </li>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({
  position,
  playerName,
  job,
  visited = [],
}) => {
  const boardMap = React.useMemo(() => new Map(GAME_BOARD.map((square) => [square.position, square])), []);
  const visitedSet = React.useMemo(() => new Set([...visited, position]), [position, visited]);

  const stages = React.useMemo(
    () =>
      STAGES.map((stage) => ({
        ...stage,
        squares: GAME_BOARD.filter(
          (square) => square.position >= stage.range[0] && square.position <= stage.range[1]
        ),
      })),
    []
  );

  return (
    <div className="relative overflow-hidden rounded-[1.6rem] border-[6px] border-[#d7c19a] bg-[#fffdf8] p-2.5 shadow-[0_18px_35px_rgba(82,61,30,0.18)] dark:border-[#4b3d2b] dark:bg-[#1d1b17] sm:p-4">
      {/* board corner rivets */}
      {['left-2 top-2', 'right-2 top-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos) => (
        <span key={pos} className={`pointer-events-none absolute ${pos} h-2.5 w-2.5 rounded-full border border-amber-900/30 bg-amber-200/80 shadow-inner dark:border-amber-100/20 dark:bg-amber-900/50`} aria-hidden="true" />
      ))}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f7efdd] px-3 py-2 dark:bg-[#2a251d]">
        <div>
          <p className="text-[10px] font-black tracking-[0.25em] text-amber-700 dark:text-amber-300">CAREER BOARD</p>
          <p className="text-sm font-black text-[#3b2f1e] dark:text-amber-50">60マスのキャリアコース</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="マスの種類">
          {(['event', 'decision', 'salary', 'item', 'goal'] as SquareType[]).map((type) => (
            <span key={type} className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-bold text-stone-500 dark:bg-stone-900/50 dark:text-stone-300">
              <span className={`h-1.5 w-1.5 rounded-full ${SQUARE_STYLES[type].dot}`} aria-hidden="true" />
              {SQUARE_STYLES[type].label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const stagePosition = stage.squares.findIndex((square) => square.position === position);
          const stageVisited = stage.squares.filter((square) => visitedSet.has(square.position)).length;
          const gridCols = stage.squares.length > 10 ? 'lg:grid-cols-11' : 'lg:grid-cols-10';

          return (
            <React.Fragment key={stage.id}>
              <section aria-label={`第${stage.id}章 ${stage.title}`} className="rounded-xl border border-[#eadcc0] bg-white/60 p-2 dark:border-[#403725] dark:bg-[#24211b]/70 sm:p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md bg-gradient-to-r ${stage.header} px-2 py-1 text-[10px] font-black text-white shadow-sm`}>
                      STAGE {stage.id}
                    </span>
                    <div>
                      <h2 className="text-xs font-black text-[#3b2f1e] dark:text-amber-50">{stage.title}</h2>
                      <p className="text-[9px] font-medium text-[#9a8464] dark:text-stone-400">{stage.subtitle}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${stage.badge}`}>
                    {stageVisited}/{stage.squares.length}
                  </span>
                </div>

                <div className="relative">
                  <div className={`absolute left-1 right-1 top-1/2 h-1 -translate-y-1/2 rounded-full ${stage.line} opacity-70`} aria-hidden="true" />
                  <ol className={`relative grid grid-cols-5 gap-1.5 sm:gap-2 ${gridCols}`}>
                    {stage.squares.map((square) => (
                      <BoardTile
                        key={square.position}
                        square={square}
                        isActive={position === square.position}
                        isVisited={visitedSet.has(square.position)}
                        playerName={playerName}
                        job={job}
                      />
                    ))}
                  </ol>
                </div>

                {stagePosition >= 0 && (
                  <span className="sr-only">現在は第{stage.id}章 {stage.title}の{stagePosition + 1}マス目にいます</span>
                )}
              </section>

              {index < stages.length - 1 && (
                <div className="flex items-center justify-center gap-2 py-0.5" aria-hidden="true">
                  <span className="h-px w-8 bg-[#d7c19a] dark:bg-[#4b3d2b]" />
                  <span className="rounded-full border border-[#d7c19a] bg-[#f7efdd] px-2 py-0.5 text-[9px] font-black text-[#9a7a4a] dark:border-[#4b3d2b] dark:bg-[#2a251d] dark:text-amber-300">
                    次の章へ
                  </span>
                  <span className="h-px w-8 bg-[#d7c19a] dark:bg-[#4b3d2b]" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-dashed border-[#d7c19a] bg-[#fbf4e4]/80 px-3 py-2 dark:border-[#4b3d2b] dark:bg-[#2a251d]">
        <p className="text-[10px] font-bold text-[#8a7557] dark:text-stone-300">
          現在地 <span className="font-black text-[#3b2f1e] dark:text-amber-50">{position}</span> / 60
        </p>
        <p className="text-[10px] font-bold text-[#8a7557] dark:text-stone-300">
          {playerName} {job ? `（${job}）` : ''}
        </p>
      </div>
    </div>
  );
};
