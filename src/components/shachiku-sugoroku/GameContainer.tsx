"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { GameState } from '@/types/sugoroku';
import {
  GAME_BOARD,
  JOB_PROFILES,
  checkEndGame,
  consumeItem,
  moveOneStep,
  resolveDecision,
  takeTurn,
} from '@/lib/sugoroku-logic';
import { GameBoard } from './GameBoard';
import { YarukiGauge } from './YarukiGauge';
import { ResultCard } from './ResultCard';
import { DiceComponent } from './DiceComponent';
import { EventCard } from './EventCard';
import { DecisionCard } from './DecisionCard';
import { audioManager } from '@/utils/audio';

interface GameContainerProps {
  initialState: GameState;
  onRestart: () => void;
}

const CHAPTERS = [
  { start: 0, end: 9, label: '第1章 入社' },
  { start: 10, end: 19, label: '第2章 新人' },
  { start: 20, end: 29, label: '第3章 若手' },
  { start: 30, end: 39, label: '第4章 中堅' },
  { start: 40, end: 49, label: '第5章 管理職' },
  { start: 50, end: 60, label: '第6章 役員' },
];

function getChapterLabel(position: number): string {
  return CHAPTERS.find((chapter) => position >= chapter.start && position <= chapter.end)?.label ?? CHAPTERS[0].label;
}

export const GameContainer: React.FC<GameContainerProps> = ({ initialState, onRestart }) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [isMoving, setIsMoving] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(false);

  const gameStateRef = React.useRef(gameState);
  React.useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const boardMap = useMemo(() => new Map(GAME_BOARD.map((square) => [square.position, square])), []);
  const currentSquare = boardMap.get(gameState.position);
  const career = gameState.career ?? 0;
  const profile = JOB_PROFILES[gameState.job];
  const stageLabel = getChapterLabel(gameState.position);
  const progress = Math.max(0, Math.min(100, (gameState.position / 60) * 100));
  const remaining = Math.max(0, 60 - gameState.position);
  const recentSquares = gameState.path
    .slice(-5)
    .reverse()
    .map((position, index) => ({ position, square: boardMap.get(position), index }))
    .filter((entry) => entry.square);

  React.useEffect(() => {
    return () => {
      audioManager.stopBgm();
    };
  }, []);

  React.useEffect(() => {
    if (gameState.isFinished) {
      audioManager.stopBgm();
    }
  }, [gameState.isFinished]);

  // Step-by-step movement. Pause while an event card or decision card is open.
  React.useEffect(() => {
    if (!isMoving || gameState.isEventWait || gameState.pendingDecision) {
      return;
    }

    const pending = gameState.pendingMoves || 0;
    if (pending !== 0) {
      const moveTimer = window.setTimeout(() => {
        setGameState((prevState) => moveOneStep(prevState));
      }, 380);
      return () => window.clearTimeout(moveTimer);
    }

    const finishTimer = window.setTimeout(() => setIsMoving(false), 650);
    return () => window.clearTimeout(finishTimer);
  }, [gameState.pendingMoves, gameState.position, gameState.isEventWait, gameState.pendingDecision, isMoving]);

  const toggleSound = () => {
    const muted = audioManager.toggleMute();
    setIsSoundOn(!muted);
    if (!muted) {
      audioManager.playBgm();
    }
  };

  const isRollingRef = React.useRef(false);
  const diceValueRef = React.useRef(diceValue);
  React.useEffect(() => {
    diceValueRef.current = diceValue;
  }, [diceValue]);

  const handleDiceRollComplete = useCallback(() => {
    const currentGameState = gameStateRef.current;
    if (!isRollingRef.current) return;
    isRollingRef.current = false;

    const newState = takeTurn(currentGameState, diceValueRef.current);
    setGameState(newState);
    setIsRolling(false);

    if (newState.pendingMoves && newState.pendingMoves !== 0) {
      setIsMoving(true);
    }
  }, []);

  const handleTakeTurn = useCallback(() => {
    if (isRolling || gameState.isFinished || isMoving || gameState.isEventWait || gameState.pendingDecision) return;
    if ((gameState.pendingMoves || 0) !== 0) return;

    isRollingRef.current = true;
    setIsRolling(true);
    audioManager.playSe('roll');
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(roll);
  }, [gameState.isEventWait, gameState.isFinished, gameState.pendingDecision, gameState.pendingMoves, isMoving, isRolling]);

  const handleUseItem = (itemId: string) => {
    if (isRolling || isMoving || gameState.isFinished || gameState.isEventWait || gameState.pendingDecision) return;
    if ((gameState.pendingMoves || 0) !== 0) return;
    setGameState((prev) => consumeItem(prev, itemId));
    audioManager.playSe('good');
  };

  const handleContinueEvent = () => {
    audioManager.playSe('click');
    setGameState((prev) => {
      if (prev.position >= 60) {
        return checkEndGame({ ...prev, isEventWait: false });
      }
      return { ...prev, isEventWait: false };
    });
  };

  const handleChooseDecision = (optionId: string) => {
    audioManager.playSe('good');
    setGameState((prev) => resolveDecision(prev, optionId));
  };

  const isBusy = isRolling || isMoving || (gameState.pendingMoves || 0) !== 0 || Boolean(gameState.isEventWait) || Boolean(gameState.pendingDecision);

  if (gameState.isFinished) {
    return <ResultCard gameState={gameState} onRestart={onRestart} />;
  }

  return (
    <>
      {gameState.isEventWait && currentSquare && (
        <EventCard square={currentSquare} message={gameState.gameMessage} onContinue={handleContinueEvent} />
      )}
      {gameState.pendingDecision && (
        <DecisionCard decision={gameState.pendingDecision} onChoose={handleChooseDecision} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <section className="order-1 lg:col-span-8" aria-label="キャリアボード">
          <div className="mb-2 flex items-center justify-between border border-[var(--line)] bg-[var(--paper-strong)] px-3 py-2 lg:hidden">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[var(--ink)]">
                {gameState.playerName} <span className="text-xs font-bold text-[var(--ink-soft)]">({gameState.job})</span>
              </p>
              <p className="text-[10px] font-bold text-[var(--ink-soft)]">
                {stageLabel} / ターン {gameState.turn}
              </p>
            </div>
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-[9px] font-bold text-[var(--ink-soft)]">やる気</p>
                <p className="text-lg font-black text-[#2f5d57]">{gameState.yaruki}</p>
              </div>
              <div className="h-8 w-px bg-[var(--line)]" />
              <div>
                <p className="text-[9px] font-bold text-[var(--ink-soft)]">評価</p>
                <p className="text-lg font-black text-[#c9922e]">{career}</p>
              </div>
            </div>
          </div>

          <GameBoard
            position={gameState.position}
            playerName={gameState.playerName}
            job={gameState.job}
            visited={gameState.path}
          />
        </section>

        <aside className="order-2 space-y-4 lg:col-span-4" aria-label="プレイヤー情報と操作">
          <section className="overflow-hidden border border-[var(--line)] bg-[var(--paper-strong)] shadow-[3px_3px_0_var(--paper-shadow)]">
            <div className="border-b border-[var(--line)] bg-[var(--ink)] px-4 py-3 text-[var(--paper-strong)]">
              <div className="flex items-center gap-3">
                <span className="font-editorial flex h-11 w-11 items-center justify-center border border-[var(--paper-strong)]/40 bg-[var(--paper-strong)]/10 text-lg" aria-hidden="true">
                  {gameState.job.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="font-label text-[9px] opacity-70">Player</p>
                  <p className="truncate text-lg font-black">{gameState.playerName}</p>
                  <p className="text-[10px] font-bold opacity-80">{gameState.job}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-label text-[9px] opacity-70">Turn</p>
                  <p className="text-2xl font-black tabular-nums">{gameState.turn}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] font-black text-[var(--ink-soft)]">
                  <span>{stageLabel}</span>
                  <span>残り {remaining} マス</span>
                </div>
                <div className="h-2 overflow-hidden border border-[var(--line)] bg-[var(--paper-muted)]">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[9px] font-bold text-[var(--ink-soft)]">
                  <span>START</span>
                  <span>{gameState.position}/60</span>
                  <span>GOAL</span>
                </div>
              </div>

              <YarukiGauge value={gameState.yaruki} />

              <div className="flex items-center justify-between border border-[var(--line)] bg-[var(--paper-muted)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-label text-[9px] text-[var(--accent)]" aria-hidden="true">CAREER</span>
                  <div>
                    <p className="text-[9px] font-black tracking-widest text-[var(--ink-soft)]">評価ポイント</p>
                    <p className="text-xs font-bold text-[var(--ink-soft)]">選択でキャリアが変わる</p>
                  </div>
                </div>
                <span className="text-2xl font-black tabular-nums text-[#c9922e]">{career}</span>
              </div>

              {(gameState.diceBoost || 0) > 0 && (
                <p className="border border-[#d8bf85] bg-[#fbf5e6] px-3 py-2 text-xs font-bold text-[#7a5a3a] dark:border-[#5a4b38] dark:bg-[#2a231b] dark:text-[#e4c989]">
                  栄養ドリンク効果: 次のダイス +{gameState.diceBoost}
                </p>
              )}
              {gameState.slowNextTurn && (
                <p className="border border-[#b8cdc8] bg-[#edf5f2] px-3 py-2 text-xs font-bold text-[#2f5d57] dark:border-[#355952] dark:bg-[#172622] dark:text-[#9dd4c7]">
                  二日酔い: 次のターンは1マス固定
                </p>
              )}
            </div>
          </section>

          <section className="border border-[var(--line)] bg-[var(--paper-strong)] p-4 shadow-[3px_3px_0_var(--paper-shadow)]">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-label text-[9px] text-[var(--ink-soft)]">お知らせ</h2>
            </div>
            <p
              className="min-h-[64px] whitespace-pre-line border border-dashed border-[var(--line-strong)] bg-[var(--paper-muted)] p-3 text-sm font-medium leading-7 text-[var(--ink)]"
              role="status"
              aria-live="polite"
            >
              {gameState.gameMessage}
            </p>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-xs font-black tracking-widest text-[var(--ink-soft)]">
                  持ち物
                </h2>
                <span className="text-[10px] font-bold text-[var(--ink-soft)]">{gameState.items.length}個</span>
              </div>
              {gameState.items.length > 0 ? (
                <div className="space-y-2">
                  {gameState.items.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center gap-2 border border-[var(--line)] bg-[var(--paper-strong)] p-2">
                      <span className="font-label flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--line)] bg-[var(--paper-muted)] text-[9px] text-[var(--accent)]" aria-hidden="true">
                        {item.id === 'energy-drink' ? 'DRINK' : item.id === 'paid-leave' ? 'LEAVE' : 'ITEM'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-[var(--ink)]">{item.name}</p>
                        <p className="text-[10px] leading-snug text-[var(--ink-soft)]">{item.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseItem(item.id)}
                        disabled={isBusy}
                        className="paper-button shrink-0 px-2.5 py-1 text-[10px]"
                      >
                        使う
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="border border-dashed border-[var(--line)] bg-[var(--paper-muted)] p-3 text-center text-xs font-medium text-[var(--ink-soft)]">
                  まだ持ち物はありません
                </p>
              )}
            </div>

            <div className="mt-5 border border-[var(--line-strong)] bg-[var(--paper-muted)] p-3">
              <div className="flex items-center justify-between gap-3">
                <DiceComponent isRolling={isRolling} finalValue={diceValue} onRollComplete={handleDiceRollComplete} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={handleTakeTurn}
                    disabled={isBusy || gameState.isFinished}
                    className="paper-button-primary w-full px-3 py-3 text-sm"
                  >
                    {isRolling
                      ? '抽選中…'
                      : isMoving
                        ? '移動中…'
                        : (gameState.pendingMoves || 0) !== 0
                          ? '移動待ち…'
                          : gameState.isEventWait
                            ? 'カードを確認中…'
                            : gameState.isResting > 0
                              ? `休みを消化（あと${gameState.isResting}）`
                              : 'サイコロを振る'}
                  </button>
                  <p className="mt-1.5 text-center text-[10px] font-bold text-[var(--ink-soft)]">
                    {isBusy ? '盤面の動きを確認中' : '止まったマスでイベント発生'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-[var(--line)] bg-[var(--paper-strong)] p-4 shadow-[3px_3px_0_var(--paper-shadow)]">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-black tracking-widest text-[var(--ink-soft)]">
              足あと
            </h2>
            <ol className="space-y-1.5">
              {recentSquares.length === 0 ? (
                <li className="text-xs text-[var(--ink-soft)]">まだ歩き始めたばかりです</li>
              ) : (
                recentSquares.map((entry) => (
                  <li key={`${entry.position}-${entry.index}`} className="flex items-center gap-2 border border-[var(--line)] bg-[var(--paper-strong)] px-2 py-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--line)] bg-[var(--paper-muted)] text-sm" aria-hidden="true">
                      {entry.square?.type.slice(0, 1).toUpperCase() ?? '•'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-[var(--ink-soft)]">
                      {entry.square?.title}
                    </span>
                    <span className="shrink-0 text-[9px] font-bold text-[var(--ink-soft)]">{entry.position}</span>
                  </li>
                ))
              )}
            </ol>
            {gameState.decisionHistory && gameState.decisionHistory.length > 0 && (
              <div className="mt-3 border-t border-dashed border-[var(--line)] pt-2">
                <p className="mb-1 text-[10px] font-black tracking-widest text-[var(--ink-soft)]">最近の選択</p>
                <p className="text-[11px] font-bold text-[var(--ink-soft)]">
                  {gameState.decisionHistory[gameState.decisionHistory.length - 1].title} → {gameState.decisionHistory[gameState.decisionHistory.length - 1].choice}
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* mobile floating roll */}
      <button
        type="button"
        onClick={handleTakeTurn}
        disabled={isBusy || gameState.isFinished}
        className="paper-button-primary fixed bottom-4 right-4 z-40 flex items-center gap-2 px-5 py-3 text-sm lg:hidden"
        aria-label="サイコロを振る"
      >
        {isRolling ? '抽選中' : isMoving ? '移動中' : gameState.isResting > 0 ? `休み${gameState.isResting}` : 'サイコロ'}
      </button>

      <button
        type="button"
        onClick={toggleSound}
        className="paper-button fixed bottom-4 left-4 z-40 flex h-11 w-11 items-center justify-center text-[10px] font-bold"
        aria-label={isSoundOn ? 'サウンドをオフにする' : 'サウンドをオンにする'}
        title={isSoundOn ? 'サウンドをオフにする' : 'サウンドをオンにする'}
      >
        {isSoundOn ? 'ON' : 'OFF'}
      </button>
    </>
  );
};
