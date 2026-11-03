"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameState, Stance } from '@/types/sugoroku';
import {
  FLOORS,
  GAME_BOARD,
  JOB_PROFILES,
  RANKS,
  consumeItem,
  dismissCard,
  moveOneStep,
  resolveDecision,
  rollDice,
  takeTurn,
} from '@/lib/sugoroku-logic';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';
import { audioManager } from '@/utils/audio';
import { GameBoard } from './GameBoard';
import { YarukiGauge } from './YarukiGauge';
import { ResultCard } from './ResultCard';
import { DiceComponent } from './DiceComponent';
import { EventCard } from './EventCard';
import { DecisionCard } from './DecisionCard';
import { GateArchIcon, ItemIcon, JobIcon } from './SugorokuIcons';

interface GameContainerProps {
  initialState: GameState;
  onRestart: () => void;
}

interface StatDeltaPop {
  id: number;
  label: string;
  positive: boolean;
}

function getFloorLabel(position: number): string {
  const f = FLOORS.find((floor) => position >= floor.range[0] && position <= floor.range[1]) ?? FLOORS[0];
  return `${f.floorCode} ${f.title}`;
}

export const GameContainer: React.FC<GameContainerProps> = ({ initialState, onRestart }) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [stance, setStance] = useState<Stance>('teiji');
  const [isRolling, setIsRolling] = useState(false);
  const [pendingRolls, setPendingRolls] = useState<number[]>([1]);
  const [isMoving, setIsMoving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [statPops, setStatPops] = useState<StatDeltaPop[]>([]);
  const [shakeHud, setShakeHud] = useState(false);

  const activeCard = gameState.cards?.[0] ?? null;
  const showResultScreen = gameState.isFinished && !activeCard;

  // BGM統合: プレイ中は 'sugoroku-board' (ポーズ中は一時停止)、リザルト画面では ResultCard 側とも同期
  useBgm(showResultScreen ? 'sugoroku-result' : 'sugoroku-board', isPaused);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // ステータス増減のポップ演出＆ダメージシェイク検出
  const prevStatsRef = useRef({
    yaruki: initialState.yaruki,
    career: initialState.career ?? 0,
    money: initialState.money ?? 0,
  });

  useEffect(() => {
    const prev = prevStatsRef.current;
    const dy = gameState.yaruki - prev.yaruki;
    const dc = (gameState.career ?? 0) - prev.career;
    const dm = (gameState.money ?? 0) - prev.money;

    prevStatsRef.current = {
      yaruki: gameState.yaruki,
      career: gameState.career ?? 0,
      money: gameState.money ?? 0,
    };

    const newPops: StatDeltaPop[] = [];
    const baseId = Date.now();
    if (dy !== 0) {
      newPops.push({ id: baseId + 1, label: `やる気 ${dy > 0 ? '+' : ''}${dy}`, positive: dy > 0 });
    }
    if (dc !== 0) {
      newPops.push({ id: baseId + 2, label: `評価 ${dc > 0 ? '+' : ''}${dc}pt`, positive: dc > 0 });
    }
    if (dm !== 0) {
      newPops.push({ id: baseId + 3, label: `貯金 ${dm > 0 ? '+' : ''}${dm}万`, positive: dm > 0 });
    }

    if (newPops.length > 0) {
      setStatPops((curr) => [...curr, ...newPops].slice(-5));
      const timer = window.setTimeout(() => {
        setStatPops((curr) => curr.filter((p) => !newPops.some((n) => n.id === p.id)));
      }, 1700);
      if (dy <= -10) {
        setShakeHud(true);
        window.setTimeout(() => setShakeHud(false), 420);
      }
      return () => window.clearTimeout(timer);
    }
  }, [gameState.yaruki, gameState.career, gameState.money]);

  const boardMap = useMemo(
    () => new Map(GAME_BOARD.map((square) => [square.position, square])),
    [],
  );
  const currentSquare = boardMap.get(gameState.position);
  const career = gameState.career ?? 0;
  const money = gameState.money ?? 0;
  const rankInfo = RANKS[gameState.rank ?? 0] ?? RANKS[0];
  const nextRankInfo = RANKS.find((r) => r.index > (gameState.rank ?? 0) && r.gatePosition > gameState.position);
  const profile = JOB_PROFILES[gameState.job];
  const stageLabel = getFloorLabel(gameState.position);
  const progress = Math.max(0, Math.min(100, (gameState.position / 60) * 100));
  const remaining = Math.max(0, 60 - gameState.position);

  // 1歩ずつのホップ移動タイマー（カード表示中・決断中・ポーズ中は停止）
  useEffect(() => {
    if (isPaused || Boolean(activeCard) || Boolean(gameState.pendingDecision) || gameState.isFinished) {
      return;
    }

    const pending = gameState.pendingMoves || 0;
    if (pending !== 0) {
      if (!isMoving) setIsMoving(true);
      const moveTimer = window.setTimeout(() => {
        setGameState((prevState) => moveOneStep(prevState));
      }, 310);
      return () => window.clearTimeout(moveTimer);
    }

    if (isMoving) {
      const finishTimer = window.setTimeout(() => setIsMoving(false), 260);
      return () => window.clearTimeout(finishTimer);
    }
  }, [
    gameState.pendingMoves,
    gameState.position,
    gameState.pendingDecision,
    gameState.isFinished,
    activeCard,
    isMoving,
    isPaused,
  ]);

  const isRollingRef = useRef(false);
  const pendingRollsRef = useRef(pendingRolls);
  const stanceRef = useRef(stance);
  useEffect(() => {
    pendingRollsRef.current = pendingRolls;
  }, [pendingRolls]);
  useEffect(() => {
    stanceRef.current = stance;
  }, [stance]);

  const handleDiceRollComplete = useCallback(() => {
    const currentGameState = gameStateRef.current;
    if (!isRollingRef.current) return;
    isRollingRef.current = false;

    const newState = takeTurn(currentGameState, stanceRef.current, pendingRollsRef.current);
    setGameState(newState);
    setIsRolling(false);

    if (newState.pendingMoves && newState.pendingMoves !== 0) {
      setIsMoving(true);
    }
  }, []);

  const handleTakeTurn = useCallback(() => {
    if (
      isRolling ||
      isMoving ||
      isPaused ||
      gameState.isFinished ||
      Boolean(activeCard) ||
      Boolean(gameState.pendingDecision)
    ) {
      return;
    }
    if ((gameState.pendingMoves || 0) !== 0) return;

    // 休みターンの場合はダイスを振らず即時消化
    if (gameState.isResting > 0) {
      audioManager.playSe('click');
      setGameState((prev) => takeTurn(prev, stance));
      return;
    }

    isRollingRef.current = true;
    setIsRolling(true);
    audioManager.playSe('roll');
    const rolls = stance === 'zangyo' ? [rollDice(), rollDice()] : [rollDice()];
    setPendingRolls(rolls);
  }, [
    activeCard,
    gameState.isFinished,
    gameState.isResting,
    gameState.pendingDecision,
    gameState.pendingMoves,
    isMoving,
    isPaused,
    isRolling,
    stance,
  ]);

  const handleUseItem = (itemId: string) => {
    if (
      isRolling ||
      isMoving ||
      isPaused ||
      gameState.isFinished ||
      Boolean(activeCard) ||
      Boolean(gameState.pendingDecision)
    ) {
      return;
    }
    if ((gameState.pendingMoves || 0) !== 0) return;
    audioManager.playSe('good');
    setGameState((prev) => consumeItem(prev, itemId));
  };

  const handleContinueEvent = useCallback(() => {
    audioManager.playSe('click');
    setGameState((prev) => dismissCard(prev));
  }, []);

  const handleChooseDecision = (optionId: string) => {
    audioManager.playSe('stamp');
    setGameState((prev) => resolveDecision(prev, optionId));
  };

  const isBusy =
    isRolling ||
    isMoving ||
    (gameState.pendingMoves || 0) !== 0 ||
    Boolean(activeCard) ||
    Boolean(gameState.pendingDecision);

  if (showResultScreen) {
    return <ResultCard gameState={gameState} onRestart={onRestart} />;
  }

  return (
    <>
      {activeCard && (
        <EventCard
          card={activeCard}
          square={boardMap.get(activeCard.squarePosition) ?? currentSquare}
          remainingCount={gameState.cards.length}
          onContinue={handleContinueEvent}
        />
      )}

      {!activeCard && gameState.pendingDecision && (
        <DecisionCard decision={gameState.pendingDecision} onChoose={handleChooseDecision} />
      )}

      {/* ポーズ・キャリア規定モーダル */}
      {isPaused && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#12100d]/75 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-[#261e14] bg-[#f4ece0] text-[#12100d] shadow-[0_12px_0_#12100d] dark:border-[#6e5a3e] dark:bg-[#221d17] dark:text-[#fffaf0]">
            <div className="flex items-center justify-between border-b-2 border-[#261e14] bg-[#12100d] px-5 py-4 text-[#fffaf0]">
              <div>
                <p className="font-mono text-[10px] font-black tracking-widest text-[#f5ca5c]">
                  PAUSE & HANDBOOK
                </p>
                <h2 id="pause-modal-title" className="font-editorial text-xl font-black">
                  就業規則・ポーズメニュー
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioManager.playSe('click');
                  setIsPaused(false);
                }}
                className="min-h-[40px] rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/20"
              >
                閉じる ✕
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-xl border border-[#c9b99b] bg-[#fffaf0] p-3 dark:border-[#3b3226] dark:bg-[#181410]">
                <span className="text-xs font-black">サウンド設定（BGM / 効果音）</span>
                <AudioToggle variant="full" />
              </div>

              <div className="rounded-xl border border-[#c9b99b] bg-[#fffaf0] p-3.5 dark:border-[#3b3226] dark:bg-[#181410]">
                <h3 className="mb-2 text-xs font-black tracking-wider text-[#12100d] dark:text-[#fffaf0]">
                  昇進査定ゲート一覧（通過時に社内評価を満たせば昇進＆賞与UP）
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {RANKS.filter((r) => r.gatePosition > 0).map((r) => {
                    const achieved = (gameState.rank ?? 0) >= r.index;
                    return (
                      <div
                        key={r.index}
                        className={`rounded-lg border p-2 text-xs ${
                          achieved
                            ? 'border-[#1f6f5c] bg-[#e6f5f0] text-[#144d3f] dark:bg-[#16332c] dark:text-[#84dfb0]'
                            : 'border-[#d4c4a8] bg-[#f4ece0] text-[#5c5141] dark:border-[#3b3226] dark:bg-[#221d17] dark:text-[#cfc2ad]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] font-black">
                          <span>#{r.gatePosition}マス</span>
                          <span>必要評価 {r.requiredCareer}pt</span>
                        </div>
                        <p className="mt-0.5 font-black">{r.name}</p>
                        <p className="text-[10px] font-bold opacity-80">給与加算 +{r.salaryBonus}万</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playSe('click');
                    setIsPaused(false);
                  }}
                  className="min-h-[46px] flex-1 rounded-xl border-2 border-[#12100d] border-b-[4px] bg-[#1f6f5c] px-4 py-2.5 text-sm font-black text-white"
                >
                  業務を再開する
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playSe('click');
                    setIsPaused(false);
                    onRestart();
                  }}
                  className="min-h-[46px] rounded-xl border-2 border-[#12100d] border-b-[4px] bg-[#fffaf0] px-4 py-2.5 text-sm font-black text-[#b23a2a]"
                >
                  退職して社員登録へ戻る
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 上部ステータスHUDバー */}
      <div
        className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#3b3022] bg-[#12100d] px-3.5 py-2.5 text-[#fffaf0] shadow-md transition-transform ${
          shakeHud ? ' translate-x-1 -translate-y-0.5' : ''
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 text-white"
            style={{ backgroundColor: profile.accentColor }}
          >
            <JobIcon job={gameState.job} size={18} />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black">{gameState.playerName}</span>
              <span className="rounded bg-[#f5ca5c] px-1.5 py-0.5 text-[10px] font-black text-[#12100d]">
                {rankInfo.name}
              </span>
              <span className="hidden text-xs font-bold text-white/75 sm:inline">
                （{gameState.job}）
              </span>
            </div>
            <p className="text-[10px] font-bold text-white/70">
              {stageLabel} — 残り {remaining} マス
            </p>
          </div>
        </div>

        {/* フローティング増減ポップ */}
        {statPops.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
            {statPops.map((pop) => (
              <span
                key={pop.id}
                className={`animate-bounce rounded-full px-2.5 py-0.5 font-mono text-xs font-black shadow-xs ${
                  pop.positive ? 'bg-[#1f6f5c] text-white' : 'bg-[#b23a2a] text-white'
                }`}
              >
                {pop.label}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 rounded-lg bg-white/10 px-3 py-1 text-xs sm:flex">
            <span>
              TURN <strong className="font-mono text-[#f5ca5c]">{gameState.turn}</strong>
            </span>
            <span className="opacity-40">|</span>
            <span>
              評価 <strong className="font-mono text-[#f5ca5c]">{career}pt</strong>
            </span>
            <span className="opacity-40">|</span>
            <span>
              貯金 <strong className="font-mono text-[#7adbc2]">{money}万</strong>
            </span>
          </div>

          <AudioToggle variant="compact" />

          <button
            type="button"
            onClick={() => {
              audioManager.playSe('click');
              setIsPaused(true);
            }}
            className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-black text-white transition hover:bg-white/20"
            aria-label="ポーズ・就業規則を開く"
          >
            <span>規則・一時停止</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 左カラム：立体キャリアボード */}
        <section className="order-1 lg:col-span-8" aria-label="キャリアボード">
          <GameBoard
            position={gameState.position}
            playerName={gameState.playerName}
            job={gameState.job}
            isMoving={isMoving}
            visited={gameState.path}
            stance={stance}
            diceBoost={gameState.diceBoost ?? 0}
            slowNextTurn={gameState.slowNextTurn ?? false}
            rankIndex={gameState.rank ?? 0}
            career={career}
          />
        </section>

        {/* 右カラム：社員ダッシュボード＆サイコロ司令室 */}
        <aside className="order-2 space-y-4 lg:col-span-4" aria-label="社員ステータスとダイス操作">
          {/* ダイス＆働き方スタンス指令パネル（最上部に配置して操作しやすくする） */}
          <section className="overflow-hidden rounded-xl border-2 border-[#3b3022] bg-[#f4ece0] shadow-[0_8px_0_#261e14] dark:border-[#6e5a3e] dark:bg-[#1e1913]">
            <div className="border-b-2 border-[#3b3022] bg-[#12100d] px-4 py-2.5 text-[#fffaf0]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-black tracking-widest text-[#f5ca5c]">
                  TURN ACTION / 勤務スタンス選択
                </span>
                <span className="font-mono text-xs font-black">
                  TURN {gameState.turn}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 p-4">
              {/* 定時 vs 全力残業 スタンス切替 */}
              <div>
                <p className="mb-1.5 text-[11px] font-black text-[#5c5141] dark:text-[#cfc2ad]">
                  1. 今ターンの働き方を選択（盤面の到達予測が変化）
                </p>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="働き方スタンス">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={stance === 'teiji'}
                    disabled={isBusy}
                    onClick={() => {
                      audioManager.playSe('click');
                      setStance('teiji');
                    }}
                    className={`rounded-xl border-2 p-2.5 text-left transition ${
                      stance === 'teiji'
                        ? 'border-[#1f6f5c] bg-[#e6f5f0] shadow-xs dark:bg-[#16332c]'
                        : 'border-[#c9b99b] bg-[#fffaf0] opacity-75 hover:opacity-100 dark:border-[#3b3226] dark:bg-[#262019]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#12100d] dark:text-[#fffaf0]">
                        定時退社
                      </span>
                      <span className="rounded bg-[#1f6f5c] px-1.5 py-0.5 font-mono text-[9px] font-black text-white">
                        1D6
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-[#175445] dark:text-[#84dfb0]">
                      1〜6マス / やる気+2
                    </p>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={stance === 'zangyo'}
                    disabled={isBusy}
                    onClick={() => {
                      audioManager.playSe('click');
                      setStance('zangyo');
                    }}
                    className={`rounded-xl border-2 p-2.5 text-left transition ${
                      stance === 'zangyo'
                        ? 'border-[#b23a2a] bg-[#fbede9] shadow-xs dark:bg-[#381915]'
                        : 'border-[#c9b99b] bg-[#fffaf0] opacity-75 hover:opacity-100 dark:border-[#3b3226] dark:bg-[#262019]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#12100d] dark:text-[#fffaf0]">
                        全力残業
                      </span>
                      <span className="rounded bg-[#b23a2a] px-1.5 py-0.5 font-mono text-[9px] font-black text-white">
                        2D6
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-[#9e2f20] dark:text-[#f7a89c]">
                      2〜12マス / 評+1・+10万・気-8
                    </p>
                  </button>
                </div>
              </div>

              {/* 状態バフ・デバフ通知 */}
              {((gameState.diceBoost || 0) > 0 || gameState.slowNextTurn || gameState.isResting > 0) && (
                <div className="space-y-1.5">
                  {(gameState.diceBoost || 0) > 0 && (
                    <div className="rounded-lg border border-[#b57c1e] bg-[#fff3cf] px-3 py-1.5 text-xs font-black text-[#8a5b0f] dark:bg-[#382b10] dark:text-[#f5ca5c]">
                      エナドリ効果発動中：次の出目合計 +{gameState.diceBoost} マス！
                    </div>
                  )}
                  {gameState.slowNextTurn && (
                    <div className="rounded-lg border border-[#b23a2a] bg-[#fbede9] px-3 py-1.5 text-xs font-black text-[#9e2f20] dark:bg-[#361714] dark:text-[#f7a89c]">
                      二日酔い状態：次の移動は「1マス固定」（有給届で解除可）
                    </div>
                  )}
                  {gameState.isResting > 0 && (
                    <div className="rounded-lg border border-[#b23a2a] bg-[#fbede9] px-3 py-1.5 text-xs font-black text-[#9e2f20] dark:bg-[#361714] dark:text-[#f7a89c]">
                      休養中：あと {gameState.isResting} ターン休み（有給休暇届で即時復帰可）
                    </div>
                  )}
                </div>
              )}

              {/* 3Dサイコロとロールボタン */}
              <div className="rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-3.5 dark:border-[#594b38] dark:bg-[#14110d]">
                <DiceComponent
                  isRolling={isRolling}
                  finalValue={pendingRolls[0] ?? 1}
                  finalValues={pendingRolls}
                  diceCount={stance === 'zangyo' ? 2 : 1}
                  boost={gameState.diceBoost ?? 0}
                  onRollComplete={handleDiceRollComplete}
                />

                <button
                  type="button"
                  onClick={handleTakeTurn}
                  disabled={isBusy || gameState.isFinished}
                  className={`mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#12100d] border-b-[5px] px-4 py-3 text-base font-black text-white shadow-sm transition active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                    gameState.isResting > 0
                      ? 'bg-[#5c5141] hover:bg-[#4a4033]'
                      : stance === 'zangyo'
                        ? 'bg-[#b23a2a] hover:bg-[#962d1f]'
                        : 'bg-[#1f6f5c] hover:bg-[#175445]'
                  }`}
                >
                  {isRolling
                    ? 'ダイス抽選中…'
                    : isMoving || (gameState.pendingMoves || 0) !== 0
                      ? `盤面を移動中…（残り${Math.abs(gameState.pendingMoves || 0)}マス）`
                      : activeCard
                        ? 'イベントカード確認中…'
                        : gameState.isResting > 0
                          ? `休養ターンを消化する（残り${gameState.isResting}回）`
                          : stance === 'zangyo'
                            ? '全力残業で2ダイスを振る！'
                            : 'サイコロを振って進む'}
                </button>
              </div>
            </div>
          </section>

          {/* 社員ステータス・評価・進捗パネル */}
          <section className="space-y-3 rounded-xl border-2 border-[#3b3022] bg-[#f4ece0] p-4 shadow-[0_8px_0_#261e14] dark:border-[#6e5a3e] dark:bg-[#1e1913]">
            <YarukiGauge value={gameState.yaruki} strikes={gameState.strikes ?? 0} />

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-3 dark:border-[#594b38] dark:bg-[#14110d]">
                <p className="text-[10px] font-black text-[#6e6250] dark:text-[#b5a790]">
                  社内評価ポイント
                </p>
                <p className="mt-0.5 font-mono text-2xl font-black text-[#b57c1e] dark:text-[#f5ca5c]">
                  {career}
                  <span className="ml-0.5 text-xs font-bold">pt</span>
                </p>
                <p className="mt-0.5 text-[10px] font-bold text-[#5c5141] dark:text-[#cfc2ad]">
                  {nextRankInfo
                    ? `次査定(#${nextRankInfo.gatePosition}): ${nextRankInfo.requiredCareer}pt`
                    : '最高査定ライン到達'}
                </p>
              </div>

              <div className="rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-3 dark:border-[#594b38] dark:bg-[#14110d]">
                <p className="text-[10px] font-black text-[#6e6250] dark:text-[#b5a790]">
                  貯金・ボーナス累計
                </p>
                <p className="mt-0.5 font-mono text-2xl font-black text-[#1f6f5c] dark:text-[#7adbc2]">
                  {money}
                  <span className="ml-0.5 text-xs font-bold">万円</span>
                </p>
                <p className="mt-0.5 text-[10px] font-bold text-[#5c5141] dark:text-[#cfc2ad]">
                  役職加算 +{rankInfo.salaryBonus}万/給料日
                </p>
              </div>
            </div>

            {/* 全体進行度バー */}
            <div className="rounded-xl border border-[#c9b99b] bg-[#fffaf0] p-3 dark:border-[#3b3226] dark:bg-[#14110d]">
              <div className="mb-1 flex items-center justify-between text-[11px] font-black text-[#12100d] dark:text-[#fffaf0]">
                <span>ゴールまでの進捗</span>
                <span className="font-mono">{gameState.position} / 60 マス</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full border border-[#3b3022] bg-[#e6dac6] dark:bg-[#2a241c]">
                <div
                  className="h-full bg-gradient-to-r from-[#1f6f5c] via-[#c9922e] to-[#b23a2a] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {nextRankInfo && (
                <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#6e6250] dark:text-[#b5a790]">
                  <GateArchIcon size={12} />
                  <span>
                    あと {nextRankInfo.gatePosition - gameState.position} マスで「{nextRankInfo.name}」昇進査定ゲート
                  </span>
                </p>
              )}
            </div>
          </section>

          {/* 所持アイテム（支給品）パネル */}
          <section className="rounded-xl border-2 border-[#3b3022] bg-[#f4ece0] p-4 shadow-[0_8px_0_#261e14] dark:border-[#6e5a3e] dark:bg-[#1e1913]">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-black tracking-wider text-[#12100d] dark:text-[#fffaf0]">
                ビジネスバッグ（所持品）
              </h2>
              <span className="rounded bg-[#12100d] px-2 py-0.5 font-mono text-[10px] font-black text-[#f5ca5c]">
                {gameState.items.length} 個
              </span>
            </div>

            {gameState.items.length > 0 ? (
              <div className="space-y-2">
                {gameState.items.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex items-center gap-2.5 rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-2.5 dark:border-[#594b38] dark:bg-[#14110d]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1f6f5c] text-white">
                      <ItemIcon itemId={item.id} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-[#12100d] dark:text-[#fffaf0]">
                        {item.name}
                      </p>
                      <p className="text-[10px] font-bold leading-snug text-[#5c5141] dark:text-[#cfc2ad]">
                        {item.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUseItem(item.id)}
                      disabled={isBusy}
                      className="min-h-[38px] shrink-0 rounded-lg border-2 border-[#12100d] border-b-[3px] bg-[#c9922e] px-3 py-1.5 text-xs font-black text-[#12100d] transition hover:bg-[#dfb15b] disabled:opacity-45"
                    >
                      使用する
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[#8a7d69] bg-[#fffaf0]/60 p-3 text-center text-xs font-bold text-[#6e6250] dark:bg-[#14110d]">
                所持品はありません（緑色の支給マスで入手可能）
              </p>
            )}
          </section>

          {/* 業務日報ログ */}
          <section className="rounded-xl border-2 border-[#3b3022] bg-[#f4ece0] p-4 shadow-[0_8px_0_#261e14] dark:border-[#6e5a3e] dark:bg-[#1e1913]">
            <h2 className="mb-2 text-xs font-black tracking-wider text-[#12100d] dark:text-[#fffaf0]">
              業務日報（直近の出来事）
            </h2>
            <p
              className="mb-3 rounded-lg border border-[#8a7d69] bg-[#fffaf0] p-2.5 text-xs font-bold leading-relaxed text-[#12100d] whitespace-pre-line dark:border-[#594b38] dark:bg-[#14110d] dark:text-[#fffaf0]"
              role="status"
              aria-live="polite"
            >
              {gameState.gameMessage}
            </p>

            <ol className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {(gameState.log || []).slice(0, 8).map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-2 rounded-lg border border-[#d4c4a8] bg-[#fffaf0] px-2.5 py-1.5 text-[11px] dark:border-[#3b3226] dark:bg-[#14110d]"
                >
                  <span className="shrink-0 rounded bg-[#12100d] px-1.5 py-0.5 font-mono text-[9px] font-black text-[#f5ca5c]">
                    T{entry.turn}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-[#12100d] dark:text-[#fffaf0]">
                      {entry.title}
                    </p>
                    <p className="line-clamp-1 text-[10px] font-bold text-[#6e6250] dark:text-[#b5a790]">
                      {entry.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {/* モバイル用フローティングダイスボタン */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={handleTakeTurn}
          disabled={isBusy || gameState.isFinished}
          className={`flex min-h-[50px] items-center gap-2 rounded-full border-2 border-[#12100d] border-b-[5px] px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50 ${
            stance === 'zangyo' ? 'bg-[#b23a2a]' : 'bg-[#1f6f5c]'
          }`}
          aria-label="サイコロを振る"
        >
          <span>
            {isRolling
              ? '抽選中…'
              : isMoving
                ? '移動中…'
                : gameState.isResting > 0
                  ? `休養消化(${gameState.isResting})`
                  : stance === 'zangyo'
                    ? '残業2ダイス'
                    : '定時1ダイス'}
          </span>
        </button>
      </div>
    </>
  );
};
