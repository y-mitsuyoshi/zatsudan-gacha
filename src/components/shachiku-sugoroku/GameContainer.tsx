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
          <div className="mb-2 flex items-center justify-between rounded-xl border border-[#e2d4b8] bg-[#fffaf0]/90 px-3 py-2 dark:border-[#4c3f2c] dark:bg-[#211e19]/90 lg:hidden">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#3b2f1e] dark:text-amber-50">
                {gameState.playerName} <span className="text-xs font-bold text-[#8a7557] dark:text-stone-400">({gameState.job})</span>
              </p>
              <p className="text-[10px] font-bold text-[#8a7557] dark:text-stone-400">
                {stageLabel} / ターン {gameState.turn}
              </p>
            </div>
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-[9px] font-bold text-[#8a7557] dark:text-stone-400">やる気</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{gameState.yaruki}</p>
              </div>
              <div className="h-8 w-px bg-[#e2d4b8] dark:bg-[#4c3f2c]" />
              <div>
                <p className="text-[9px] font-bold text-[#8a7557] dark:text-stone-400">評価</p>
                <p className="text-lg font-black text-amber-600 dark:text-amber-300">{career}</p>
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
          <section className="overflow-hidden rounded-2xl border-2 border-[#e2d4b8] bg-[#fffaf0] shadow-lg dark:border-[#4c3f2c] dark:bg-[#211e19]">
            <div className={`bg-gradient-to-r ${profile.accent} px-4 py-3 text-white`}>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-white/40 bg-white/20 text-2xl shadow-inner" aria-hidden="true">
                  {profile.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black tracking-[0.25em] text-white/80">PLAYER</p>
                  <p className="truncate text-lg font-black">{gameState.playerName}</p>
                  <p className="text-[10px] font-bold text-white/85">{gameState.job}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[9px] font-bold text-white/70">TURN</p>
                  <p className="text-2xl font-black tabular-nums">{gameState.turn}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] font-black text-[#8a7557] dark:text-stone-400">
                  <span>{stageLabel}</span>
                  <span>残り {remaining} マス</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-[#d8c6a2] bg-[#efe3ca] dark:border-[#5c4a32] dark:bg-[#342d22]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[9px] font-bold text-[#a58c66] dark:text-stone-500">
                  <span>START</span>
                  <span>{gameState.position}/60</span>
                  <span>GOAL</span>
                </div>
              </div>

              <YarukiGauge value={gameState.yaruki} />

              <div className="flex items-center justify-between rounded-xl border border-[#e2d4b8] bg-[#f8efdd] px-3 py-2 dark:border-[#4c3f2c] dark:bg-[#2a251d]">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">⭐</span>
                  <div>
                    <p className="text-[9px] font-black tracking-widest text-[#9a8464] dark:text-stone-400">評価ポイント</p>
                    <p className="text-xs font-bold text-[#6f5d42] dark:text-stone-300">選択でキャリアが変わる</p>
                  </div>
                </div>
                <span className="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-300">{career}</span>
              </div>

              {(gameState.diceBoost || 0) > 0 && (
                <p className="rounded-lg bg-orange-100 px-3 py-2 text-xs font-bold text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                  ⚡ 栄養ドリンク効果: 次のダイス +{gameState.diceBoost}
                </p>
              )}
              {gameState.slowNextTurn && (
                <p className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                  🍺 二日酔い: 次のターンは1マス固定
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border-2 border-[#e2d4b8] bg-[#fffaf0] p-4 shadow-lg dark:border-[#4c3f2c] dark:bg-[#211e19]">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">📢</span>
              <h2 className="text-xs font-black tracking-widest text-[#8a7557] dark:text-stone-300">お知らせ</h2>
            </div>
            <p
              className="min-h-[64px] whitespace-pre-line rounded-xl border border-dashed border-[#d8c6a2] bg-[#f8efdd]/70 p-3 text-sm font-medium leading-relaxed text-[#3b2f1e] dark:border-[#5c4a32] dark:bg-[#2a251d] dark:text-amber-50"
              role="status"
              aria-live="polite"
            >
              {gameState.gameMessage}
            </p>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-xs font-black tracking-widest text-[#8a7557] dark:text-stone-300">
                  <span aria-hidden="true">🎒</span> 持ち物
                </h2>
                <span className="text-[10px] font-bold text-[#a58c66] dark:text-stone-500">{gameState.items.length}個</span>
              </div>
              {gameState.items.length > 0 ? (
                <div className="space-y-2">
                  {gameState.items.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center gap-2 rounded-xl border border-[#e2d4b8] bg-white/80 p-2 dark:border-[#4c3f2c] dark:bg-[#2b2720]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-100 text-lg dark:bg-yellow-900/30" aria-hidden="true">
                        {item.id === 'energy-drink' ? '🥤' : item.id === 'paid-leave' ? '📝' : '📦'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-[#3b2f1e] dark:text-amber-50">{item.name}</p>
                        <p className="text-[10px] leading-snug text-[#8a7557] dark:text-stone-400">{item.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseItem(item.id)}
                        disabled={isBusy}
                        className="shrink-0 rounded-lg border border-amber-600 px-2.5 py-1 text-[10px] font-black text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-900/20"
                      >
                        使う
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-[#f8efdd]/70 p-3 text-center text-xs font-medium text-[#a58c66] dark:bg-[#2a251d] dark:text-stone-500">
                  まだ持ち物はありません
                </p>
              )}
            </div>

            <div className="mt-5 rounded-2xl border-2 border-[#d8c6a2] bg-[#f8efdd] p-3 dark:border-[#5c4a32] dark:bg-[#2a251d]">
              <div className="flex items-center justify-between gap-3">
                <DiceComponent isRolling={isRolling} finalValue={diceValue} onRollComplete={handleDiceRollComplete} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={handleTakeTurn}
                    disabled={isBusy || gameState.isFinished}
                    className="w-full rounded-xl border-b-4 border-amber-800 bg-gradient-to-b from-amber-500 to-amber-600 px-3 py-3 text-sm font-black text-white shadow-md transition-all hover:from-amber-400 hover:to-amber-500 active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:border-stone-500 disabled:from-stone-400 disabled:to-stone-500"
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
                              : '🎲 サイコロを振る'}
                  </button>
                  <p className="mt-1.5 text-center text-[10px] font-bold text-[#9a8464] dark:text-stone-400">
                    {isBusy ? '盤面の動きを確認中' : '止まったマスでイベント発生'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-[#e2d4b8] bg-[#fffaf0] p-4 shadow-lg dark:border-[#4c3f2c] dark:bg-[#211e19]">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-black tracking-widest text-[#8a7557] dark:text-stone-300">
              <span aria-hidden="true">👣</span> 足あと
            </h2>
            <ol className="space-y-1.5">
              {recentSquares.length === 0 ? (
                <li className="text-xs text-[#a58c66] dark:text-stone-500">まだ歩き始めたばかりです</li>
              ) : (
                recentSquares.map((entry) => (
                  <li key={`${entry.position}-${entry.index}`} className="flex items-center gap-2 rounded-lg bg-[#f8efdd]/70 px-2 py-1.5 dark:bg-[#2a251d]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-sm dark:bg-[#342d22]" aria-hidden="true">
                      {entry.square?.icon ?? '•'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#6f5d42] dark:text-stone-300">
                      {entry.square?.title}
                    </span>
                    <span className="shrink-0 text-[9px] font-bold text-[#a58c66] dark:text-stone-500">{entry.position}</span>
                  </li>
                ))
              )}
            </ol>
            {gameState.decisionHistory && gameState.decisionHistory.length > 0 && (
              <div className="mt-3 border-t border-dashed border-[#d8c6a2] pt-2 dark:border-[#4c3f2c]">
                <p className="mb-1 text-[10px] font-black tracking-widest text-[#9a8464] dark:text-stone-400">最近の選択</p>
                <p className="text-[11px] font-bold text-[#6f5d42] dark:text-stone-300">
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
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border-b-4 border-amber-800 bg-gradient-to-b from-amber-500 to-amber-600 px-5 py-3 text-sm font-black text-white shadow-xl transition-all active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:border-stone-500 disabled:from-stone-400 disabled:to-stone-500 lg:hidden"
        aria-label="サイコロを振る"
      >
        <span className="text-xl" aria-hidden="true">🎲</span>
        {isRolling ? '抽選中' : isMoving ? '移動中' : gameState.isResting > 0 ? `休み${gameState.isResting}` : 'サイコロ'}
      </button>

      <button
        type="button"
        onClick={toggleSound}
        className="fixed bottom-4 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#d8c6a2] bg-[#fffaf0] text-xl shadow-lg transition-transform hover:scale-105 dark:border-[#5c4a32] dark:bg-[#211e19]"
        aria-label={isSoundOn ? 'サウンドをオフにする' : 'サウンドをオンにする'}
        title={isSoundOn ? 'サウンドをオフにする' : 'サウンドをオンにする'}
      >
        {isSoundOn ? '🔊' : '🔇'}
      </button>
    </>
  );
};
