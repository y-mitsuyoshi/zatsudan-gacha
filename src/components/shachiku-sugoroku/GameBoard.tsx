"use client";

import React, { useEffect, useRef } from 'react';
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

type Chapter = {
  id: number;
  title: string;
  subtitle: string;
  range: [number, number];
  numberClass: string;
  barClass: string;
  tintClass: string;
};

const CHAPTERS: Chapter[] = [
  { id: 1, title: '入社', subtitle: '研修と初仕事', range: [0, 9], numberClass: 'bg-[#2f5d57] text-[#f2e9d8]', barClass: 'bg-[#2f5d57]', tintClass: 'bg-[#edf3f0] dark:bg-[#172622]' },
  { id: 2, title: '新人', subtitle: '現場で学ぶ日々', range: [10, 19], numberClass: 'bg-[#c9922e] text-[#12100d]', barClass: 'bg-[#c9922e]', tintClass: 'bg-[#fbf5e6] dark:bg-[#2a231b]' },
  { id: 3, title: '若手', subtitle: '仕事の波に乗る', range: [20, 29], numberClass: 'bg-[#b23a2a] text-[#fffaf0]', barClass: 'bg-[#b23a2a]', tintClass: 'bg-[#fbefeb] dark:bg-[#2b1a17]' },
  { id: 4, title: '中堅', subtitle: '責任と忙しさの狭間', range: [30, 39], numberClass: 'bg-[#4b5d73] text-[#f2e9d8]', barClass: 'bg-[#4b5d73]', tintClass: 'bg-[#eef1f4] dark:bg-[#1b222b]' },
  { id: 5, title: '管理職', subtitle: 'チームを動かす', range: [40, 49], numberClass: 'bg-[#7a5a3a] text-[#f2e9d8]', barClass: 'bg-[#7a5a3a]', tintClass: 'bg-[#f5efe7] dark:bg-[#2a231b]' },
  { id: 6, title: '役員', subtitle: '最終章・ボーナス支給日へ', range: [50, 60], numberClass: 'bg-[#2a2a2a] text-[#dfb15b]', barClass: 'bg-[#2a2a2a]', tintClass: 'bg-[#f1ede4] dark:bg-[#211e19]' },
];

const TYPE_STYLE: Record<SquareType, { label: string; glyph: string; tile: string; glyphClass: string; dot: string }> = {
  start: { label: 'スタート', glyph: '▶', tile: 'border-[#2f5d57] bg-[#e7f0ec] dark:border-[#83b8ac] dark:bg-[#172622]', glyphClass: 'text-[#2f5d57] dark:text-[#9dd4c7]', dot: 'bg-[#2f5d57]' },
  goal: { label: 'ゴール', glyph: '★', tile: 'border-[#c9922e] bg-[#fbf2dd] dark:border-[#dfb15b] dark:bg-[#2a231b]', glyphClass: 'text-[#a8751d] dark:text-[#dfb15b]', dot: 'bg-[#c9922e]' },
  salary: { label: '給料日', glyph: '¥', tile: 'border-[#d8bf85] bg-[#fbf5e6] dark:border-[#5a4b38] dark:bg-[#2a231b]', glyphClass: 'text-[#a8751d] dark:text-[#dfb15b]', dot: 'bg-[#c9922e]' },
  item: { label: 'アイテム', glyph: '+', tile: 'border-[#b8cdbd] bg-[#eef5ee] dark:border-[#355952] dark:bg-[#172622]', glyphClass: 'text-[#2f5d57] dark:text-[#9dd4c7]', dot: 'bg-[#2f5d57]' },
  'job-specific': { label: '職業', glyph: 'J', tile: 'border-[#cfc5b4] bg-[#f5f0e8] dark:border-[#5a4b38] dark:bg-[#2a231b]', glyphClass: 'text-[#6b5a45] dark:text-[#e4c989]', dot: 'bg-[#7a5a3a]' },
  event: { label: 'イベント', glyph: '!', tile: 'border-[#e0c1b7] bg-[#fbf0ec] dark:border-[#6d3027] dark:bg-[#2b1a17]', glyphClass: 'text-[#b23a2a] dark:text-[#f0a08b]', dot: 'bg-[#b23a2a]' },
  decision: { label: '選択', glyph: '?', tile: 'border-[#b8cdc8] bg-[#edf5f2] dark:border-[#355952] dark:bg-[#172622]', glyphClass: 'text-[#2f5d57] dark:text-[#9dd4c7]', dot: 'bg-[#2f5d57]' },
  normal: { label: '通常', glyph: '·', tile: 'border-[var(--line)] bg-[var(--paper-strong)]', glyphClass: 'text-[var(--ink-soft)]', dot: 'bg-[#8a7d69]' },
};

function buildTrack(squares: BoardSquare[], reverse: boolean): BoardSquare[] {
  return reverse ? [...squares].reverse() : squares;
}

function buildMobileTrack(squares: BoardSquare[], columns: number): BoardSquare[] {
  const first = squares.slice(0, columns);
  const second = squares.slice(columns).reverse();
  return [...first, ...second];
}

function TrackGrid({
  squares,
  columns,
  activePosition,
  visitedSet,
  playerName,
  job,
}: {
  squares: BoardSquare[];
  columns: number;
  activePosition: number;
  visitedSet: Set<number>;
  playerName: string;
  job?: string;
}) {
  const rows = Math.ceil(squares.length / columns);
  const logicalSquares = [...squares].sort((a, b) => a.position - b.position);
  const activeIndex = logicalSquares.findIndex((square) => square.position === activePosition);
  const points = logicalSquares.map((square) => {
    const displayIndex = squares.findIndex((item) => item.position === square.position);
    const row = Math.floor(displayIndex / columns);
    const column = displayIndex % columns;
    return `${((column + 0.5) / columns) * 100},${((row + 0.5) / rows) * 100}`;
  });
  const visitedPoints = activeIndex >= 0 ? points.slice(0, activeIndex + 1) : [];

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="0.7"
          strokeDasharray="1.6 1.6"
          vectorEffect="non-scaling-stroke"
        />
        {visitedPoints.length > 1 && (
          <polyline
            points={visitedPoints.join(' ')}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.1"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <ol
        className="relative z-10 grid gap-0 auto-rows-[64px] sm:auto-rows-[86px]"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {squares.map((square) => {
          const type = TYPE_STYLE[square.type];
          const isActive = square.position === activePosition;
          const isVisited = visitedSet.has(square.position);
          const isGoal = square.type === 'goal';
          return (
            <li
              key={square.position}
              className={`relative m-[2px] flex min-w-0 flex-col justify-between border p-1.5 transition-all duration-200 sm:p-2 ${type.tile} ${
                isActive
                  ? 'z-20 -translate-y-0.5 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] ring-1 ring-[var(--ink)]'
                  : isVisited
                    ? 'border-[var(--line-strong)]'
                    : 'hover:-translate-y-0.5 hover:border-[var(--line-strong)]'
              } ${isGoal ? 'border-[3px]' : ''}`}
              aria-current={isActive ? 'step' : undefined}
              data-active={isActive ? 'true' : undefined}
              title={`${square.position}マス目: ${square.title} — ${square.description}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-label text-[7px] leading-none text-[var(--ink-soft)] sm:text-[8px]">
                  {String(square.position).padStart(2, '0')}
                </span>
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center border border-[var(--line)] text-[9px] font-black leading-none ${type.glyphClass}`} aria-hidden="true">
                  {type.glyph}
                </span>
              </div>

              <p className={`mt-1 line-clamp-2 text-[8px] font-black leading-[1.3] sm:text-[10px] ${isActive ? 'text-[var(--ink)]' : 'text-[var(--ink)]'}`}>
                {square.title}
              </p>

              <div className="mt-1 flex items-center gap-1">
                <span className={`h-1 w-1 shrink-0 ${type.dot}`} aria-hidden="true" />
                <span className="font-label truncate text-[6px] text-[var(--ink-soft)] sm:text-[7px]">{type.label}</span>
              </div>

              {isVisited && !isActive && (
                <span className="absolute bottom-1 right-1 flex h-3 w-3 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] text-[7px] font-black text-[var(--ink-soft)]" aria-hidden="true">
                  ✓
                </span>
              )}

              {isActive && (
                <div key={square.position} className="pointer-events-none absolute -top-7 left-1/2 z-30 -translate-x-1/2">
                  <PlayerToken playerName={playerName} job={job} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ChapterConnector({ chapterIndex }: { chapterIndex: number }) {
  const fromRight = chapterIndex % 2 === 0;
  return (
    <div className="relative h-7" aria-hidden="true">
      <span className="absolute left-[2px] top-0 h-full w-px bg-[var(--line-strong)] sm:hidden" />
      <span className="absolute left-[2px] top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[var(--line-strong)] sm:hidden" />
      <span className={`absolute top-0 hidden h-full w-px bg-[var(--line-strong)] sm:block ${fromRight ? 'right-[2px]' : 'left-[2px]'}`} />
      <span className={`absolute top-1/2 hidden h-2 w-2 -translate-y-1/2 border-b border-r border-[var(--line-strong)] sm:block ${fromRight ? 'right-[2px] translate-x-1/2 -rotate-45' : 'left-[2px] -translate-x-1/2 rotate-[135deg]'}`} />
      <span className="font-label absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-[var(--line)] bg-[var(--paper-strong)] px-2 py-0.5 text-[7px] text-[var(--ink-soft)]">
        NEXT CHAPTER
      </span>
    </div>
  );
}

export const GameBoard: React.FC<GameBoardProps> = ({
  position,
  playerName,
  job,
  visited = [],
}) => {
  const visitedSet = React.useMemo(() => new Set([...visited, position]), [position, visited]);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef(position);

  useEffect(() => {
    if (lastPositionRef.current === position) {
      return;
    }
    lastPositionRef.current = position;
    const activeTiles = boardRef.current?.querySelectorAll('[data-active="true"]') ?? [];
    const activeTile = Array.from(activeTiles).find((tile) => tile instanceof HTMLElement && tile.offsetParent !== null);
    activeTile?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [position]);

  return (
    <div ref={boardRef} className="relative overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-strong)] p-2.5 shadow-[6px_6px_0_var(--paper-shadow)] sm:p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(var(--line-strong)_0.55px,transparent_0.55px)] [background-size:16px_16px]"
        aria-hidden="true"
      />
      {['left-2 top-2', 'right-2 top-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos) => (
        <span key={pos} className={`pointer-events-none absolute ${pos} z-20 h-2 w-2 border border-[var(--line-strong)] bg-[var(--paper-muted)]`} aria-hidden="true" />
      ))}

      <div className="relative z-10 mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-[var(--line)] pb-3">
        <div>
          <p className="paper-kicker">Career Board / 60 Steps</p>
          <h2 className="font-editorial mt-1 text-xl text-[var(--ink)] sm:text-2xl">社畜キャリアコース</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="マスの種類">
          {(['event', 'decision', 'salary', 'item', 'goal'] as SquareType[]).map((type) => (
            <span key={type} className="inline-flex items-center gap-1 border border-[var(--line)] bg-[var(--paper-strong)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--ink-soft)]">
              <span className={`h-1.5 w-1.5 ${TYPE_STYLE[type].dot}`} aria-hidden="true" />
              {TYPE_STYLE[type].label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 space-y-1">
        {CHAPTERS.map((chapter, chapterIndex) => {
          const chapterSquares = GAME_BOARD.filter(
            (square) => square.position >= chapter.range[0] && square.position <= chapter.range[1]
          );
          const visitedCount = chapterSquares.filter((square) => visitedSet.has(square.position)).length;
          const progress = (visitedCount / chapterSquares.length) * 100;
          const desktopSquares = buildTrack(chapterSquares, chapterIndex % 2 === 1);
          const mobileColumns = chapterSquares.length > 10 ? 6 : 5;
          const mobileSquares = buildMobileTrack(chapterSquares, mobileColumns);
          return (
            <React.Fragment key={chapter.id}>
              <section aria-label={`第${chapter.id}章 ${chapter.title}`} className={`relative border border-[var(--line)] p-2 sm:p-3 ${chapter.tintClass}`}>
                <header className="mb-2 flex items-end justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`font-label flex h-8 w-8 shrink-0 items-center justify-center text-[10px] font-bold ${chapter.numberClass}`}>
                      {String(chapter.id).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="font-label text-[7px] text-[var(--ink-soft)]">Chapter {chapter.id}</p>
                      <h3 className="font-editorial truncate text-base text-[var(--ink)] sm:text-lg">{chapter.title}</h3>
                      <p className="truncate text-[9px] text-[var(--ink-soft)]">{chapter.subtitle}</p>
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    <p className="font-label text-[7px] text-[var(--ink-soft)]">{visitedCount}/{chapterSquares.length}</p>
                    <div className="mt-1 h-1 w-full bg-[var(--line)]">
                      <div className={`h-full ${chapter.barClass} transition-all duration-500`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </header>

                <div className="hidden sm:block">
                  <TrackGrid squares={desktopSquares} columns={desktopSquares.length > 10 ? 11 : 10} activePosition={position} visitedSet={visitedSet} playerName={playerName} job={job} />
                </div>
                <div className="sm:hidden">
                  <TrackGrid squares={mobileSquares} columns={mobileColumns} activePosition={position} visitedSet={visitedSet} playerName={playerName} job={job} />
                </div>
              </section>

              {chapterIndex < CHAPTERS.length - 1 && <ChapterConnector chapterIndex={chapterIndex} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="relative z-10 mt-3 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2">
        <p className="font-label text-[8px] text-[var(--ink-soft)]">
          現在地 <span className="text-[10px] font-black text-[var(--ink)]">{position}</span> / 60
        </p>
        <p className="font-label truncate text-[8px] text-[var(--ink-soft)]">
          {playerName}{job ? ` / ${job}` : ''}
        </p>
      </div>
    </div>
  );
};
