"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameState, PaydayEvent, Stance } from '@/types/sugoroku';
import {
  BOARD_SIZE,
  FLOORS,
  GAME_BOARD,
  JOB_PROFILES,
  RANKS,
  calculateNetWorthBreakdown,
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
import { AssetIcon, GateArchIcon, ItemIcon, JobIcon } from './SugorokuIcons';

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
  const [paydayBanner, setPaydayBanner] = useState<PaydayEvent | null>(null);

  const activeCard = gameState.cards?.[0] ?? null;
  const showResultScreen = gameState.isFinished && !activeCard;

  useBgm(showResultScreen ? 'sugoroku-result' : 'sugoroku-board', isPaused);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // 給料日ゲート（PAYDAY）通過時の祝賀トーストバナー表示
  const lastPaydayIdRef = useRef<number | null>(initialState.lastPayday?.id ?? null);
  useEffect(() => {
    const currentPayday = gameState.lastPayday;
    if (currentPayday && currentPayday.id !== lastPaydayIdRef.current) {
      lastPaydayIdRef.current = currentPayday.id;
      setPaydayBanner(currentPayday);
      const timer = window.setTimeout(() => {
        setPaydayBanner((curr) => (curr?.id === currentPayday.id ? null : curr));
      }, 3600);
      return () => window.clearTimeout(timer);
    }
  }, [gameState.lastPayday]);

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
      newPops.push({ id: baseId + 3, label: `資金 ${dm > 0 ? '+' : ''}${dm}万`, positive: dm > 0 });
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
  const assets = gameState.assets ?? [];
  const netWorthInfo = useMemo(() => calculateNetWorthBreakdown(gameState), [gameState]);
  const rankInfo = RANKS[gameState.rank ?? 0] ?? RANKS[0];
  const nextRankInfo = RANKS.find((r) => r.index > (gameState.rank ?? 0) && r.gatePosition > gameState.position);
  const profile = JOB_PROFILES[gameState.job];
  const stageLabel = getFloorLabel(gameState.position);
  const progress = Math.max(0, Math.min(100, (gameState.position / BOARD_SIZE) * 100));
  const remaining = Math.max(0, BOARD_SIZE - gameState.position);

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
      }, 290);
      return () => window.clearTimeout(moveTimer);
    }

    if (isMoving) {
      const finishTimer = window.setTimeout(() => setIsMoving(false), 240);
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

  // キーボード Space / Enter でルーレット回転（モーダルが開いていない時）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
      ) {
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (!activeCard && !gameState.pendingDecision && !isPaused && !gameState.isFinished) {
          e.preventDefault();
          handleTakeTurn();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCard, gameState.pendingDecision, isPaused, gameState.isFinished, handleTakeTurn]);

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
      {/* 給料日ゲート（PAYDAY）通過時の祝賀フローティングバナー */}
      {paydayBanner && (
        <div
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-[bounce_0.5s_ease-out_2]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-2xl border-3 border-[#12100d] bg-gradient-to-r from-[#fff3b0] via-[#f5ca5c] to-[#eab308] px-5 py-3 text-[#12100d] shadow-[0_8px_0_#12100d,0_16px_32px_rgba(0,0,0,0.45)]">
            <span className="rounded-lg bg-[#12100d] px-2.5 py-1 font-mono text-xs font-black text-[#fde073]">
              PAYDAY!
            </span>
            <div>
              <p className="text-sm font-black sm:text-base">
                給料日ゲート通過支給 +{paydayBanner.totalPayout}万円！
              </p>
              <p className="text-[11px] font-bold text-[#3b2f1e]">
                役職（{paydayBanner.rankName}）給与 +{paydayBanner.baseSalary}万
                {paydayBanner.dividendBonus > 0 ? ` ＋ 資産配当 +${paydayBanner.dividendBonus}万` : ''}
                {' / やる気+12回復'}
              </p>
            </div>
          </div>
        </div>
      )}

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
                  社畜ライフロード規定・ポーズメニュー
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
                  昇進査定＆給料日テーブル（給料日ゲート #05・#13・#21・#29 通過時に支給）
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
                          <span>#{String(r.gatePosition).padStart(2, '0')}マス</span>
                          <span>必要評価 {r.requiredCareer}pt</span>
                        </div>
                        <p className="mt-0.5 font-black">{r.name}</p>
                        <p className="text-[10px] font-bold opacity-80">給料日 +{r.salaryBonus}万</p>
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
                  ゲームを再開する
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
                  最初からやり直す
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
                （{gameState.job} / {profile.vehicleName}）
              </span>
            </div>
            <p className="text-[10px] font-bold text-white/70">
              {stageLabel} — ゴールまで残り {remaining} マス
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
              所持金 <strong className="font-mono text-[#7adbc2]">{money}万</strong>
            </span>
            <span className="opacity-40">|</span>
            <span>
              推定総資産 <strong className="font-mono text-[#fde073]">{netWorthInfo.totalNetWorth}万</strong>
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
            aria-label="ポーズ・規定を開く"
          >
            <span>規定・一時停止</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 左カラム：2.5D ジオラマ・ライフロード盤面 */}
        <section className="order-1 lg:col-span-8" aria-label="社畜ライフロード盤面">
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
            assetsCount={assets.length}
            selectedRoute={gameState.selectedRoute}
          />
        </section>

        {/* 右カラム：キャリア・ルーレット＆資産ポートフォリオ指令室 */}
        <aside className="order-2 space-y-4 lg:col-span-4" aria-label="社員ステータスとルーレット操作">
          {/* キャリア・ルーレット＆働き方スタンス指令パネル */}
          <section className="overflow-hidden rounded-xl border-2 border-[#3b3022] bg-[#f4ece0] shadow-[0_8px_0_#261e14] dark:border-[#6e5a3e] dark:bg-[#1e1913]">
            <div className="border-b-2 border-[#3b3022] bg-[#12100d] px-4 py-2.5 text-[#fffaf0]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-black tracking-widest text-[#f5ca5c]">
                  CAREER ROULETTE / 走行モード選択
                </span>
                <span className="font-mono text-xs font-black">
                  TURN {gameState.turn}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 p-4">
              {/* 定時クルーズ vs 全力残業ブースト スタンス切替 */}
              <div>
                <p className="mb-1.5 text-[11px] font-black text-[#5c5141] dark:text-[#cfc2ad]">
                  1. 今ターンの走行スタンスを選択（盤面の到達予測が変化）
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
                        1SPIN
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
                        W-SPIN
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
                      エナドリ効果発動中：次のルーレット出目 +{gameState.diceBoost} マス！
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

              {/* メカニカル・キャリア・ルーレットとスピンボタン */}
              <div className="rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-3.5 dark:border-[#594b38] dark:bg-[#14110d]">
                <DiceComponent
                  isRolling={isRolling}
                  finalValue={pendingRolls[0] ?? 1}
                  finalValues={pendingRolls}
                  diceCount={stance === 'zangyo' ? 2 : 1}
                  boost={gameState.diceBoost ?? 0}
                  onRollComplete={handleDiceRollComplete}
                  onTriggerRoll={handleTakeTurn}
                  disabled={isBusy || gameState.isFinished}
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
                    ? 'ルーレット回転中…'
                    : isMoving || (gameState.pendingMoves || 0) !== 0
                      ? `キャリアロード走行中…（残り${Math.abs(gameState.pendingMoves || 0)}マス）`
                      : activeCard
                        ? 'イベントカード確認中…'
                        : gameState.isResting > 0
                          ? `休養ターンを消化する（残り${gameState.isResting}回）`
                          : stance === 'zangyo'
                            ? '全力残業Wルーレットを回す！'
                            : 'キャリア・ルーレットを回して進む'}
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
                    : '最高役職ライン到達'}
                </p>
              </div>

              <div className="rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-3 dark:border-[#594b38] dark:bg-[#14110d]">
                <p className="text-[10px] font-black text-[#6e6250] dark:text-[#b5a790]">
                  所持金・キャッシュ
                </p>
                <p className="mt-0.5 font-mono text-2xl font-black text-[#1f6f5c] dark:text-[#7adbc2]">
                  {money}
                  <span className="ml-0.5 text-xs font-bold">万円</span>
                </p>
                <p className="mt-0.5 text-[10px] font-bold text-[#5c5141] dark:text-[#cfc2ad]">
                  給料日基本給 +{rankInfo.salaryBonus}万
                </p>
              </div>
            </div>

            {/* 全体進行度バー */}
            <div className="rounded-xl border border-[#c9b99b] bg-[#fffaf0] p-3 dark:border-[#3b3226] dark:bg-[#14110d]">
              <div className="mb-1 flex items-center justify-between text-[11px] font-black text-[#12100d] dark:text-[#fffaf0]">
                <span>ゴールまでの進捗</span>
                <span className="font-mono">{gameState.position} / {BOARD_SIZE} マス</span>
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

          {/* ライフ資産ポートフォリオ（人生資産カード一覧） */}
          <section className="rounded-xl border-2 border-[#3b3022] bg-[#f4ece0] p-4 shadow-[0_8px_0_#261e14] dark:border-[#6e5a3e] dark:bg-[#1e1913]">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black tracking-wider text-[#12100d] dark:text-[#fffaf0]">
                  ライフ資産ポートフォリオ
                </h2>
                <p className="text-[10px] font-bold text-[#6e6250] dark:text-[#b5a790]">
                  資産評価額: +{netWorthInfo.assetValue}万円 / 推定生涯総資産: {netWorthInfo.totalNetWorth}万円
                </p>
              </div>
              <span className="rounded bg-[#12100d] px-2 py-0.5 font-mono text-[10px] font-black text-[#f5ca5c]">
                {assets.length} 資産
              </span>
            </div>

            {assets.length > 0 ? (
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-2.5 rounded-xl border-2 border-[#b57c1e] bg-gradient-to-r from-[#fffdf5] to-[#fef5d8] p-2.5 text-[#12100d]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#12100d] text-[#f5ca5c]">
                      <AssetIcon assetId={asset.id} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-xs font-black">{asset.name}</p>
                        <span className="shrink-0 rounded bg-[#1f6f5c] px-1.5 py-0.5 font-mono text-[9px] font-black text-white">
                          評価 {asset.value}万
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-[#5c5141]">
                        {asset.category} / 給料日配当 +{asset.dividend}万円
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[#8a7d69] bg-[#fffaf0]/60 p-3 text-center text-xs font-bold text-[#6e6250] dark:bg-[#14110d]">
                保有ライフ資産はまだありません（緑の資産マス・抽選・決断で獲得可能）
              </p>
            )}
          </section>

          {/* 所持アイテム（消耗支給品）パネル */}
          <section className="rounded-xl border-2 border-[#3b3022] bg-[#f4ece0] p-4 shadow-[0_8px_0_#261e14] dark:border-[#6e5a3e] dark:bg-[#1e1913]">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-black tracking-wider text-[#12100d] dark:text-[#fffaf0]">
                ビジネスバッグ（消耗支給品）
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
                支給品はありません
              </p>
            )}
          </section>

          {/* 業務日報ログ */}
          <section className="rounded-xl border-2 border-[#3b3022] bg-[#f4ece0] p-4 shadow-[0_8px_0_#261e14] dark:border-[#6e5a3e] dark:bg-[#1e1913]">
            <h2 className="mb-2 text-xs font-black tracking-wider text-[#12100d] dark:text-[#fffaf0]">
              ライフロード日報（直近の出来事）
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

      {/* モバイル用フローティング・ルーレットスピンボタン */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={handleTakeTurn}
          disabled={isBusy || gameState.isFinished}
          className={`flex min-h-[50px] items-center gap-2 rounded-full border-2 border-[#12100d] border-b-[5px] px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50 ${
            stance === 'zangyo' ? 'bg-[#b23a2a]' : 'bg-[#1f6f5c]'
          }`}
          aria-label="ルーレットを回す"
        >
          <span>
            {isRolling
              ? '回転中…'
              : isMoving
                ? '走行中…'
                : gameState.isResting > 0
                  ? `休養消化(${gameState.isResting})`
                  : stance === 'zangyo'
                    ? '残業Wスピン'
                    : '定時スピン'}
          </span>
        </button>
      </div>
    </>
  );
};
