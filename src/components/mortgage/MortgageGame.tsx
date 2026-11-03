"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ARCHETYPES,
  BANKS,
  DANSHIN_PLANS,
  EMPLOYMENT_LABELS,
  FAMILY_PLANS,
  MACRO_REGIMES,
  PROPERTIES,
  advanceOneYear,
  createMortgageGame,
  executePrepayment,
  executeRefinance,
  executeSellProperty,
  generateRandomHouseholdSetup,
  resolveMortgageDecision,
  runBankUnderwriting,
} from '@/lib/mortgage-logic';
import {
  BankId,
  ContractType,
  DanshinType,
  FamilyPlanType,
  LoanTermYears,
  MacroRegimeId,
  MortgageGameState,
  MortgageSetupConfig,
  PropertyCategory,
  RepaymentMethod,
  YearlySnapshot,
} from '@/types/mortgage';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';
import { audioManager } from '@/utils/audio';

const ENERGY_CERT_LABELS = {
  'long-term-excellent': '長期優良住宅（控除最大・固定資産税優遇）',
  zeh: 'ZEH水準省エネ住宅（控除優遇）',
  standard: '一般省エネ基準適合',
  'non-compliant': '旧省エネ・基準未満（新築控除0円注意）',
} as const;

/**
 * 残債・自宅時価・手元金融資産の推移を描画するSVGチャート
 */
const BalanceHistoryChart: React.FC<{
  history: YearlySnapshot[];
  initialLoanMan: number;
  initialPropMan: number;
  initialCashMan: number;
  termYears: number;
}> = ({ history, initialLoanMan, initialPropMan, initialCashMan, termYears }) => {
  const width = 680;
  const height = 210;
  const padL = 48;
  const padR = 18;
  const padT = 18;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const points = useMemo(() => {
    const base = [
      {
        y: 0,
        loan: initialLoanMan,
        prop: initialPropMan,
        cash: initialCashMan,
      },
      ...history.map((h) => ({
        y: h.yearIndex,
        loan: h.remainingBalanceMan + h.unpaidInterestMan,
        prop: h.propertyValueMan,
        cash: h.liquidSavingsMan,
      })),
    ];
    return base;
  }, [history, initialLoanMan, initialPropMan, initialCashMan]);

  const maxVal = useMemo(() => {
    let m = Math.max(initialLoanMan, initialPropMan, 3000);
    for (const p of points) {
      m = Math.max(m, p.loan, p.prop, p.cash);
    }
    return Math.ceil(m / 1000) * 1000;
  }, [points, initialLoanMan, initialPropMan]);

  const minVal = useMemo(() => {
    let m = 0;
    for (const p of points) {
      m = Math.min(m, p.cash);
    }
    return Math.floor(m / 500) * 500;
  }, [points]);

  const maxYears = Math.max(termYears, points[points.length - 1]?.y ?? 35, 35);
  const toX = (yr: number) => padL + (yr / maxYears) * innerW;
  const toY = (val: number) =>
    padT + innerH - ((val - minVal) / Math.max(100, maxVal - minVal)) * innerH;

  const buildPath = (key: 'loan' | 'prop' | 'cash') =>
    points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.y).toFixed(1)} ${toY(pt[key]).toFixed(1)}`)
      .join(' ');

  const zeroY = toY(0);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/90 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
        <span className="font-mono tracking-wider text-slate-400">
          BALANCE SHEET TRAJECTORY (単位: 万円 / {maxYears}年推移)
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 text-rose-400">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
            ローン残債(+未払利息)
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
            自宅推定時価
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
            手元金融資産
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full select-none overflow-visible">
        {/* 水平グリッド */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const val = Math.round(minVal + (maxVal - minVal) * ratio);
          const yPos = toY(val);
          return (
            <g key={idx}>
              <line
                x1={padL}
                y1={yPos}
                x2={width - padR}
                y2={yPos}
                stroke="#1e293b"
                strokeDasharray="4 4"
              />
              <text
                x={padL - 6}
                y={yPos + 3}
                textAnchor="end"
                fill="#64748b"
                fontSize="9.5"
                fontFamily="monospace"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* 0円ライン */}
        <line x1={padL} y1={zeroY} x2={width - padR} y2={zeroY} stroke="#475569" strokeWidth="1.2" />

        {/* 年数メモリ */}
        {[0, 10, 20, 30, 35, 50]
          .filter((yr) => yr <= maxYears)
          .map((yr) => (
            <text
              key={yr}
              x={toX(yr)}
              y={height - 6}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9.5"
              fontFamily="monospace"
            >
              {yr}年
            </text>
          ))}

        {/* 自宅時価ライン */}
        <path
          d={buildPath('prop')}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 手元金融資産ライン */}
        <path
          d={buildPath('cash')}
          fill="none"
          stroke="#34d399"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* ローン残債ライン */}
        <path
          d={buildPath('loan')}
          fill="none"
          stroke="#f43f5e"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export const MortgageGame: React.FC = () => {
  const [setupConfig, setSetupConfig] = useState<MortgageSetupConfig>(() =>
    generateRandomHouseholdSetup(() => 0.18),
  );
  const [gameState, setGameState] = useState<MortgageGameState | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 4>(1);
  const [gachaFlash, setGachaFlash] = useState<boolean>(false);

  useBgm(
    gameState
      ? gameState.status === 'playing'
        ? 'mortgage-life'
        : 'sugoroku-result'
      : 'mortgage-life',
    false,
  );

  // 審査結果のリアルタイムプレビュー
  const liveUnderwriting = useMemo(() => runBankUnderwriting(setupConfig), [setupConfig]);
  const selectedProperty = PROPERTIES[setupConfig.propertyId];
  const selectedBank = BANKS[setupConfig.bankId];
  const selectedDanshin = DANSHIN_PLANS[setupConfig.danshin];
  const selectedArchetype =
    ARCHETYPES.find((a) => a.id === setupConfig.archetypeId) ?? ARCHETYPES[0];

  // 自動進行タイマー (1in8bスタイル: 再生中は1年ずつ進み、決断イベントまたは完済・破産で自動一時停止)
  useEffect(() => {
    if (!gameState || !isPlaying || gameState.status !== 'playing' || gameState.pendingDecision) {
      return;
    }
    const intervalMs = speedMultiplier === 4 ? 380 : speedMultiplier === 2 ? 750 : 1350;
    const timer = window.setTimeout(() => {
      setGameState((prev) => {
        if (!prev || prev.status !== 'playing' || prev.pendingDecision) return prev;
        const next = advanceOneYear(prev);
        if (next.pendingDecision || next.status !== 'playing') {
          audioManager.playSe(next.status === 'cleared' ? 'fanfare' : next.status === 'bankrupt' ? 'bad' : 'card');
        } else {
          audioManager.playSe('move');
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [gameState, isPlaying, speedMultiplier]);

  // 決断イベント発生時または終了時は自動ポーズ
  useEffect(() => {
    if (gameState && (gameState.pendingDecision || gameState.status !== 'playing')) {
      setIsPlaying(false);
    }
  }, [gameState]);

  const handleRollGachaHousehold = useCallback(() => {
    audioManager.playSe('roll');
    const nextConfig = generateRandomHouseholdSetup();
    setSetupConfig(nextConfig);
    setGachaFlash(true);
    window.setTimeout(() => setGachaFlash(false), 500);
  }, []);

  const handleApplyArchetype = (archId: string) => {
    const arch = ARCHETYPES.find((a) => a.id === archId);
    if (!arch) return;
    audioManager.playSe('click');
    setSetupConfig((prev) => ({
      ...prev,
      archetypeId: arch.id,
      age: arch.age,
      employment: arch.employment,
      mainIncomeMan: arch.mainIncomeMan,
      subIncomeMan: arch.subIncomeMan,
      initialSavingsMan: arch.initialSavingsMan,
      downPaymentMan: Math.min(Math.max(0, arch.initialSavingsMan - 300), 500),
      hasCreditBlemish: arch.hasCreditBlemish,
      contractType: arch.recommendedContract,
      familyPlan: arch.recommendedFamily,
      propertyId: arch.recommendedProperty,
    }));
  };

  const handleStartSimulation = (autoPlay: boolean) => {
    audioManager.playSe('stamp');
    const initial = createMortgageGame(setupConfig);
    setGameState(initial);
    setIsPlaying(autoPlay);
  };

  const handleStepOneYear = () => {
    if (!gameState || gameState.status !== 'playing' || gameState.pendingDecision) return;
    setIsPlaying(false);
    const next = advanceOneYear(gameState);
    if (next.pendingDecision || next.status !== 'playing') {
      audioManager.playSe(next.status === 'cleared' ? 'fanfare' : next.status === 'bankrupt' ? 'bad' : 'card');
    } else {
      audioManager.playSe('move');
    }
    setGameState(next);
  };

  const handleSelectDecision = (choiceId: string) => {
    if (!gameState || !gameState.pendingDecision) return;
    audioManager.playSe('stamp');
    setGameState((prev) => (prev ? resolveMortgageDecision(prev, choiceId) : prev));
  };

  // ============================================================================
  // 画面A: 契約前の「1,300万世帯分の1ガチャ ＆ 住宅ローン本審査・設計画面」
  // ============================================================================
  if (!gameState) {
    return (
      <div className="space-y-6">
        {/* 1in8bスタイル：統計確率による「運命の住宅ローン世帯ガチャ」バナー */}
        <section
          className={`relative overflow-hidden rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 text-white shadow-2xl transition sm:p-7 ${
            gachaFlash ? 'ring-4 ring-amber-400' : ''
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-0.5 font-mono text-[11px] font-black tracking-widest text-amber-300">
                  1 IN 13,000,000 HOUSEHOLDS SIMULATION
                </span>
                <span className="rounded bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-300">
                  国土交通省・日銀・住宅金融支援機構の統計傾向を反映
                </span>
              </div>
              <h2 className="font-editorial mt-2.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
                あなたは、35年・50年後の「完済」まで生き残れるか？
              </h2>
              <p className="mt-2 text-xs font-bold leading-relaxed text-slate-300 sm:text-sm">
                『1in8b.life（80億分の1）』のように、日本の住宅ローン保有1,300万世帯の統計分布からランダムな境遇でスタートするか、物件・銀行・ペアローン・35年/50年・元利/元金均等・団信・世界情勢を自分で緻密に設計して本審査へ挑むかを選択できます。
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={handleRollGachaHousehold}
                className="cursor-pointer rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-5 py-3.5 text-sm font-black text-slate-950 shadow-[0_6px_20px_rgba(245,158,11,0.35)] transition hover:brightness-105 active:translate-y-0.5"
              >
                運命の世帯ガチャを回す（統計確率抽選）
              </button>
              <button
                type="button"
                onClick={() => handleStartSimulation(true)}
                className="cursor-pointer rounded-2xl border-2 border-emerald-400 bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-500 active:translate-y-0.5"
              >
                この条件で融資実行・人生を開始する →
              </button>
            </div>
          </div>

          {/* 現在抽選されている世帯の統計パーセンタイル表示 */}
          <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
            <div>
              <span className="font-mono text-[10px] font-bold tracking-wider text-amber-300">
                CURRENT HOUSEHOLD ARCHETYPE
              </span>
              <p className="mt-0.5 text-sm font-black text-white">{selectedArchetype.title}</p>
              <p className="text-xs font-bold text-slate-300">
                {selectedArchetype.subtitle}（{EMPLOYMENT_LABELS[setupConfig.employment]}）
              </p>
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold tracking-wider text-sky-300">
                STATISTICAL PERCENTILE
              </span>
              <p className="mt-0.5 text-xs font-black text-sky-200">
                {selectedArchetype.percentileLabel}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">{selectedArchetype.description}</p>
            </div>
            <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">初期世帯年収</span>
                <span className="font-mono text-sm font-black text-amber-300">
                  {setupConfig.mainIncomeMan +
                    (setupConfig.contractType === 'single' ? 0 : setupConfig.subIncomeMan)}{' '}
                  万円
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">初期自己資金 / 頭金投入</span>
                <span className="font-mono text-sm font-black text-emerald-300">
                  {setupConfig.initialSavingsMan}万 / 頭金{setupConfig.downPaymentMan}万
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-400">選択中の団信</span>
                <span className="text-purple-300">{selectedDanshin.shortName}</span>
              </div>
            </div>
          </div>
        </section>

        {/* メイン2カラム：左＝詳細条件カスタマイズ / 右＝銀行本審査リアルタイム判定票 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            {/* Step 1: 世帯モデル＆年齢・年収・頭金・契約方式 */}
            <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                <div>
                  <span className="font-mono text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400">
                    STEP 01 / HOUSEHOLD & CONTRACT
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    1. 世帯属性・ペアローン/単独・子育てプラン
                  </h3>
                </div>
                <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 dark:bg-slate-800">
                  契約時 {setupConfig.age}歳
                </span>
              </div>

              {/* 6種の世帯プリセット切替 */}
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ARCHETYPES.map((arch) => {
                  const active = setupConfig.archetypeId === arch.id;
                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => handleApplyArchetype(arch.id)}
                      className={`cursor-pointer rounded-xl border-2 p-2.5 text-left transition ${
                        active
                          ? 'border-amber-500 bg-amber-50/70 dark:border-amber-400 dark:bg-amber-950/30'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900 dark:text-white">
                        {arch.title}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {arch.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* 年齢・本人年収・配偶者年収・頭金スライダー */}
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-2 dark:bg-slate-950/60">
                <label className="block">
                  <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                    <span>借入時年齢</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      {setupConfig.age}歳
                    </span>
                  </div>
                  <input
                    type="range"
                    min={24}
                    max={46}
                    step={1}
                    value={setupConfig.age}
                    onChange={(e) =>
                      setSetupConfig((p) => ({ ...p, age: Number(e.target.value) }))
                    }
                    className="mt-1 w-full accent-amber-500"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                    <span>本人額面年収</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      {setupConfig.mainIncomeMan}万円
                    </span>
                  </div>
                  <input
                    type="range"
                    min={300}
                    max={1400}
                    step={20}
                    value={setupConfig.mainIncomeMan}
                    onChange={(e) =>
                      setSetupConfig((p) => ({ ...p, mainIncomeMan: Number(e.target.value) }))
                    }
                    className="mt-1 w-full accent-amber-500"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                    <span>配偶者額面年収</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      {setupConfig.subIncomeMan}万円
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1000}
                    step={20}
                    value={setupConfig.subIncomeMan}
                    onChange={(e) =>
                      setSetupConfig((p) => ({ ...p, subIncomeMan: Number(e.target.value) }))
                    }
                    className="mt-1 w-full accent-amber-500"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                    <span>頭金投入額（自己資金{setupConfig.initialSavingsMan}万中）</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {setupConfig.downPaymentMan}万円
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, setupConfig.initialSavingsMan - 150)}
                    step={50}
                    value={setupConfig.downPaymentMan}
                    onChange={(e) =>
                      setSetupConfig((p) => ({ ...p, downPaymentMan: Number(e.target.value) }))
                    }
                    className="mt-1 w-full accent-emerald-500"
                  />
                </label>
              </div>

              {/* 契約形態（単独 / ペアローン / 収入合算） */}
              <div className="mt-3.5">
                <p className="mb-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  ローン契約形態（単独 vs ペアローン vs 収入合算）
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        id: 'single',
                        title: '単独ローン',
                        desc: '本人収入のみで審査。配偶者離職に強い',
                      },
                      {
                        id: 'pair',
                        title: 'ペアローン',
                        desc: '夫婦2本契約・W控除！離婚や離職に脆弱',
                      },
                      {
                        id: 'income-merge',
                        title: '収入合算(連帯保証)',
                        desc: '配偶者年収を65%合算して借入枠拡大',
                      },
                    ] as { id: ContractType; title: string; desc: string }[]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSetupConfig((p) => ({ ...p, contractType: item.id }))}
                      className={`cursor-pointer rounded-xl border-2 p-2.5 text-left transition ${
                        setupConfig.contractType === item.id
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-amber-400 dark:bg-amber-400/15'
                          : 'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                      }`}
                    >
                      <p className="text-xs font-black">{item.title}</p>
                      <p className="mt-0.5 text-[10px] opacity-80">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 子育て・教育プラン */}
              <div className="mt-3.5">
                <p className="mb-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  家族・子育て世代プラン（中学受験・大学費用がキャッシュフローに直結）
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.keys(FAMILY_PLANS) as FamilyPlanType[]).map((fKey) => {
                    const f = FAMILY_PLANS[fKey];
                    const active = setupConfig.familyPlan === fKey;
                    return (
                      <button
                        key={fKey}
                        type="button"
                        onClick={() => setSetupConfig((p) => ({ ...p, familyPlan: fKey }))}
                        className={`cursor-pointer rounded-xl border-2 p-2 text-left transition ${
                          active
                            ? 'border-emerald-600 bg-emerald-50/80 dark:border-emerald-400 dark:bg-emerald-950/30'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <p className="text-[11px] font-black text-slate-900 dark:text-white">
                          {f.name}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500 dark:text-slate-400">
                          {f.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Step 2: 物件選択（タワマン / マンション / 一戸建て / 新築・中古 / 長期優良） */}
            <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                <div>
                  <span className="font-mono text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400">
                    STEP 02 / PROPERTY, LAND & TAX CREDIT
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    2. 購入物件の選択（タワマン・マンション・一戸建て / 新築・中古 / 長期優良）
                  </h3>
                </div>
                <span className="rounded bg-amber-500/15 px-2.5 py-0.5 font-mono text-xs font-black text-amber-700 dark:text-amber-300">
                  {selectedProperty.priceMan.toLocaleString()}万円
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(Object.keys(PROPERTIES) as PropertyCategory[]).map((propKey) => {
                  const prop = PROPERTIES[propKey];
                  const active = setupConfig.propertyId === propKey;
                  return (
                    <button
                      key={propKey}
                      type="button"
                      onClick={() => {
                        audioManager.playSe('click');
                        setSetupConfig((p) => ({ ...p, propertyId: propKey }));
                      }}
                      className={`cursor-pointer flex flex-col justify-between rounded-xl border-2 p-3 text-left transition ${
                        active
                          ? 'border-amber-500 bg-amber-50/70 shadow-xs dark:border-amber-400 dark:bg-amber-950/30'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-black text-amber-300">
                            {prop.isNew ? '新築' : `中古(築${prop.builtAge}年)`} /{' '}
                            {prop.buildingType === 'tower'
                              ? 'タワマン'
                              : prop.buildingType === 'mansion'
                                ? 'マンション'
                                : '一戸建て'}
                          </span>
                          <span className="font-mono text-xs font-black text-rose-600 dark:text-rose-400">
                            {prop.priceMan.toLocaleString()}万円
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs font-black text-slate-900 dark:text-white">
                          {prop.shortName}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {prop.locationLabel} / 土地比率 {Math.round(prop.landRatio * 100)}%
                        </p>
                      </div>
                      <div className="mt-2 border-t border-slate-200/80 pt-1.5 text-[10px] font-bold text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        維持費(管理+修繕+駐): 月
                        {(
                          prop.initialMgmtFeeMonthlyMan +
                          prop.initialRepairFeeMonthlyMan +
                          prop.parkingMonthlyMan
                        ).toFixed(1)}
                        万 / 固都税: 年{prop.annualPropertyTaxMan}万
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 選択中物件のスペック詳細＆注意点 */}
              <div className="mt-3.5 rounded-xl border border-amber-500/30 bg-amber-50/50 p-3.5 text-xs dark:bg-slate-950/70">
                <div className="flex flex-wrap items-center gap-2 font-black text-slate-900 dark:text-white">
                  <span>{selectedProperty.name}</span>
                  <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] text-white">
                    {ENERGY_CERT_LABELS[selectedProperty.energyCert]}
                  </span>
                </div>
                <p className="mt-1 font-bold text-slate-600 dark:text-slate-300">
                  {selectedProperty.description}
                </p>
                <p className="mt-1 font-bold text-rose-700 dark:text-rose-400">
                  {selectedProperty.riskNote}
                </p>
              </div>
            </section>

            {/* Step 3: 銀行・変動/固定・35年/50年・元利/元金均等・団信・世界情勢 */}
            <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                <span className="font-mono text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400">
                  STEP 03 / BANK, INTEREST RATE, TERM, DANSHIN & MACRO
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  3. 銀行・変動/固定・35年/50年・元利/元金均等・団信・日銀シナリオ
                </h3>
              </div>

              {/* 借入先銀行 */}
              <div className="mb-4">
                <p className="mb-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  借入先金融機関と金利タイプ（5年ルール・125%ルールの有無に注目）
                </p>
                <div className="space-y-2">
                  {(Object.keys(BANKS) as BankId[]).map((bKey) => {
                    const b = BANKS[bKey];
                    const active = setupConfig.bankId === bKey;
                    return (
                      <button
                        key={bKey}
                        type="button"
                        onClick={() => {
                          audioManager.playSe('click');
                          setSetupConfig((p) => ({
                            ...p,
                            bankId: bKey,
                            termYears:
                              p.termYears === 50 && !b.supports50Years ? 35 : p.termYears,
                          }));
                        }}
                        className={`cursor-pointer w-full rounded-xl border-2 p-3 text-left transition ${
                          active
                            ? 'border-sky-600 bg-sky-50/70 dark:border-sky-400 dark:bg-sky-950/30'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {b.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300">
                              基準 {b.baseRate}%
                            </span>
                            <span className="rounded bg-sky-600 px-2 py-0.5 text-[10px] font-black text-white">
                              {b.badgeText}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {b.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 借入期間 (25年 / 35年 / 50年) ＆ 返済方式 (元利均等 / 元金均等) ＆ ボーナス併用 */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs font-black text-slate-700 dark:text-slate-300">
                    借入期間（35年 vs 50年）
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([25, 35, 50] as LoanTermYears[]).map((yr) => {
                      const disabled50 = yr === 50 && !selectedBank.supports50Years;
                      const active = setupConfig.termYears === yr;
                      return (
                        <button
                          key={yr}
                          type="button"
                          disabled={disabled50}
                          onClick={() => setSetupConfig((p) => ({ ...p, termYears: yr }))}
                          className={`cursor-pointer rounded-xl border-2 py-2 text-center font-mono text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-amber-300 dark:border-amber-400'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {yr}年
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-black text-slate-700 dark:text-slate-300">
                    返済方式（元利 vs 元金）
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'equal-payment', label: '元利均等' },
                        { id: 'equal-principal', label: '元金均等' },
                      ] as { id: RepaymentMethod; label: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSetupConfig((p) => ({ ...p, repaymentMethod: m.id }))}
                        className={`cursor-pointer rounded-xl border-2 py-2 text-center text-xs font-black transition ${
                          setupConfig.repaymentMethod === m.id
                            ? 'border-slate-900 bg-slate-900 text-amber-300 dark:border-amber-400'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-black text-slate-700 dark:text-slate-300">
                    ボーナス払い併用
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { ratio: 0, label: '毎月のみ(安全)' },
                      { ratio: 0.2, label: '賞与20%併用' },
                    ].map((b) => (
                      <button
                        key={b.ratio}
                        type="button"
                        onClick={() =>
                          setSetupConfig((p) => ({ ...p, bonusRepaymentRatio: b.ratio }))
                        }
                        className={`cursor-pointer rounded-xl border-2 py-2 text-center text-xs font-black transition ${
                          setupConfig.bonusRepaymentRatio === b.ratio
                            ? 'border-slate-900 bg-slate-900 text-amber-300 dark:border-amber-400'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 団体信用生命保険（団信） */}
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  団体信用生命保険（団信：がん・3大疾病・ペア連生保障と上乗せ金利）
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(Object.keys(DANSHIN_PLANS) as DanshinType[]).map((dKey) => {
                    const d = DANSHIN_PLANS[dKey];
                    const active = setupConfig.danshin === dKey;
                    return (
                      <button
                        key={dKey}
                        type="button"
                        onClick={() => setSetupConfig((p) => ({ ...p, danshin: dKey }))}
                        className={`cursor-pointer rounded-xl border-2 p-2.5 text-left transition ${
                          active
                            ? 'border-purple-600 bg-purple-50/70 dark:border-purple-400 dark:bg-purple-950/30'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {d.shortName}
                          </span>
                          <span className="rounded bg-purple-600 px-1.5 py-0.5 font-mono text-[9px] font-black text-white">
                            金利 +{d.spreadRate}%
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {d.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* マクロ経済・日銀・世界情勢シナリオ */}
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  日銀の金融政策・世界情勢シナリオ
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(MACRO_REGIMES) as MacroRegimeId[]).map((mKey) => {
                    const m = MACRO_REGIMES[mKey];
                    const active = setupConfig.macroRegime === mKey;
                    return (
                      <button
                        key={mKey}
                        type="button"
                        onClick={() => setSetupConfig((p) => ({ ...p, macroRegime: mKey }))}
                        className={`cursor-pointer rounded-xl border-2 p-2.5 text-left transition ${
                          active
                            ? 'border-amber-500 bg-amber-50/70 dark:border-amber-400 dark:bg-amber-950/30'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <p className="text-xs font-black text-slate-900 dark:text-white">
                          {m.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {m.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* 右カラム：銀行本審査リアルタイム判定書 ＆ 融資実行ボタン */}
          <aside className="lg:col-span-5">
            <div className="sticky top-4 space-y-4 rounded-3xl border-2 border-slate-900 bg-slate-950 p-5 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="font-mono text-[10px] font-black tracking-widest text-amber-400">
                    BANK UNDERWRITING REPORT
                  </span>
                  <h3 className="font-editorial text-xl font-black">
                    住宅ローン本審査・リアルタイム判定書
                  </h3>
                </div>
                <div
                  className={`flex h-12 w-12 flex-col items-center justify-center rounded-2xl border-2 font-mono font-black ${
                    liveUnderwriting.grade === 'S' || liveUnderwriting.grade === 'A'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : liveUnderwriting.grade === 'B'
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-rose-500 bg-rose-500/20 text-rose-300'
                  }`}
                >
                  <span className="text-[8px] leading-none">審査</span>
                  <span className="text-lg leading-none">{liveUnderwriting.grade}</span>
                </div>
              </div>

              <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-bold leading-relaxed text-slate-200">
                {liveUnderwriting.bankComment}
              </p>

              {/* 融資内訳・毎月支払額・実質住居費 */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <span className="text-[10px] font-bold text-slate-400">借入元本総額</span>
                  <p className="mt-0.5 font-mono text-xl font-black text-white">
                    {liveUnderwriting.loanPrincipalMan.toLocaleString()}
                    <span className="ml-0.5 text-xs">万円</span>
                  </p>
                  <span className="text-[10px] text-slate-400">
                    諸費用 {liveUnderwriting.closingCostsMan}万 / LTV {liveUnderwriting.ltvPercent}%
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <span className="text-[10px] font-bold text-slate-400">
                    初期適用金利（団信込）
                  </span>
                  <p className="mt-0.5 font-mono text-xl font-black text-amber-300">
                    {liveUnderwriting.effectiveInitialRate}
                    <span className="ml-0.5 text-xs">%</span>
                  </p>
                  <span className="text-[10px] text-slate-400">
                    完済予定：{liveUnderwriting.maturityAge}歳
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <span className="text-[10px] font-bold text-slate-400">初年度・毎月ローン返済</span>
                  <p className="mt-0.5 font-mono text-xl font-black text-sky-300">
                    {liveUnderwriting.initialMonthlyPaymentMan}
                    <span className="ml-0.5 text-xs">万円/月</span>
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {liveUnderwriting.initialBonusPaymentMan > 0
                      ? `＋賞与時 ${liveUnderwriting.initialBonusPaymentMan}万円/回`
                      : 'ボーナス加算なし'}
                  </span>
                </div>

                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3">
                  <span className="text-[10px] font-bold text-rose-300">
                    管理修繕・税金込 実質住居費
                  </span>
                  <p className="mt-0.5 font-mono text-xl font-black text-rose-300">
                    {liveUnderwriting.initialTotalMonthlyOutflowMan}
                    <span className="ml-0.5 text-xs">万円/月</span>
                  </p>
                  <span className="text-[10px] text-rose-200/80">
                    維持費・固都税 +{liveUnderwriting.initialMonthlyRunningCostMan}万/月
                  </span>
                </div>
              </div>

              {/* 住宅ローン控除＆審査負担率 */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-3 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-emerald-300">住宅ローン減税（0.7%控除）</span>
                  <span className="font-mono font-black text-emerald-300">
                    初年度 約 +{liveUnderwriting.maxTaxDeductionAnnualMan}万円/年（{liveUnderwriting.taxDeductionYears}年間）
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between font-bold text-slate-300">
                  <span>審査金利での返済負担率 / 実行負担率</span>
                  <span className="font-mono">
                    {liveUnderwriting.stressDtiPercent}% / 実効 {liveUnderwriting.actualDtiPercent}%
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between font-bold text-slate-300">
                  <span>引渡し後の手元残キャッシュ</span>
                  <span className="font-mono text-amber-300">
                    {liveUnderwriting.cashRemainingAfterPurchaseMan}万円
                  </span>
                </div>
              </div>

              {/* 審査警告リスト */}
              {liveUnderwriting.warnings.length > 0 && (
                <div className="space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3">
                  <p className="font-mono text-[10px] font-black tracking-wider text-amber-300">
                    RISK ANALYSIS WARNINGS ({liveUnderwriting.warnings.length})
                  </p>
                  <ul className="space-y-1 text-[11px] font-bold text-amber-100/90">
                    {liveUnderwriting.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-0.5 text-amber-400">■</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleStartSimulation(true)}
                  className="cursor-pointer w-full rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-base font-black text-white shadow-lg transition hover:brightness-110 active:translate-y-0.5"
                >
                  金銭消費貸借契約を締結し、返済人生を開始する（自動進行）
                </button>
                <button
                  type="button"
                  onClick={() => handleStartSimulation(false)}
                  className="cursor-pointer w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-black text-slate-300 transition hover:bg-slate-800"
                >
                  手動ステップモード（1年ずつじっくり読む）で開始する
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 画面B: 1in8b.life スタイルの「住宅ローン年代記タイムライン・サバイバル」＆「生涯決算」
  // ============================================================================
  const activeProp = PROPERTIES[gameState.config.propertyId];
  const activeBank = BANKS[gameState.config.bankId];
  const activeDanshin = DANSHIN_PLANS[gameState.config.danshin];
  const totalDebtMan = Math.round(
    (gameState.remainingBalanceMan + gameState.unpaidInterestMan) * 10,
  ) / 10;
  const equityGapMan = Math.round((gameState.propertyValueMan - totalDebtMan) * 10) / 10;
  const isOverLoan = equityGapMan < 0 && totalDebtMan > 0;
  const latestSnap = gameState.history[gameState.history.length - 1] ?? null;

  return (
    <div className="space-y-5">
      {/* 重大決断イベントモーダル（発生時は自動一時停止） */}
      {gameState.pendingDecision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-amber-400 bg-slate-900 text-white shadow-2xl">
            <div className="border-b border-slate-800 bg-slate-950 px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-amber-500/20 px-3 py-0.5 font-mono text-xs font-black text-amber-300">
                  LIFE & MORTGAGE TURNING POINT — {gameState.age}歳（返済{gameState.yearIndex}年目）
                </span>
                <span className="font-mono text-xs font-bold text-slate-400">
                  手元資金: {Math.round(gameState.liquidSavingsMan).toLocaleString()}万円
                </span>
              </div>
              <h3 className="font-editorial mt-2 text-xl font-black text-white sm:text-2xl">
                {gameState.pendingDecision.title}
              </h3>
            </div>

            <div className="space-y-4 p-6">
              <p className="text-sm font-bold leading-relaxed text-slate-200">
                {gameState.pendingDecision.description}
              </p>

              <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-3 text-xs font-bold text-sky-200">
                {gameState.pendingDecision.statisticalContext}
              </div>

              <div className="space-y-2.5 pt-2">
                {gameState.pendingDecision.choices.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleSelectDecision(ch.id)}
                    className="cursor-pointer w-full rounded-2xl border-2 border-slate-700 bg-slate-800/90 p-4 text-left transition hover:border-amber-400 hover:bg-slate-800"
                  >
                    <p className="text-sm font-black text-amber-300">{ch.label}</p>
                    <p className="mt-1 text-xs font-bold text-slate-300">{ch.subLabel}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. 1in8bスタイル・スティッキー再生コントロール＆年齢タイムラインバー */}
      <div className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-700 bg-slate-950/95 px-4 py-3 text-white shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-14 flex-col items-center justify-center rounded-xl border border-amber-400/50 bg-amber-500/15 font-mono">
            <span className="text-[9px] font-bold text-amber-300">AGE</span>
            <span className="text-lg font-black leading-none text-white">{gameState.age}歳</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-black text-amber-300">
                {gameState.calendarYear}年（返済 {gameState.yearIndex}年目 / 残り{' '}
                {gameState.termRemainingYears}年）
              </span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                {activeProp.shortName} / {activeBank.shortName}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-48 overflow-hidden rounded-full bg-slate-800 sm:w-64">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((gameState.yearIndex / gameState.config.termYears) * 100),
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 再生・一時停止・倍速・1年送りコントロール */}
        <div className="flex flex-wrap items-center gap-2">
          {gameState.status === 'playing' && (
            <>
              <button
                type="button"
                onClick={() => {
                  audioManager.playSe('click');
                  setIsPlaying((p) => !p);
                }}
                className={`cursor-pointer rounded-xl border-2 px-4 py-2 text-xs font-black transition ${
                  isPlaying
                    ? 'border-amber-400 bg-amber-400 text-slate-950'
                    : 'border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {isPlaying ? '一時停止 (PAUSE)' : '時間を進める (PLAY)'}
              </button>

              <button
                type="button"
                onClick={handleStepOneYear}
                disabled={isPlaying}
                className="cursor-pointer rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:opacity-40"
              >
                +1年送る
              </button>

              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 p-0.5">
                {([1, 2, 4] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSpeedMultiplier(spd)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1 font-mono text-xs font-black transition ${
                      speedMultiplier === spd
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </>
          )}

          <AudioToggle variant="compact" />

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setGameState(null);
            }}
            className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            条件設定へ戻る
          </button>
        </div>
      </div>

      {/* 2. 結末到達時の『1in8bスタイル・生涯決算レポート』 */}
      {gameState.ending && (
        <section className="overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-2xl">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1 font-mono text-xs font-black text-amber-300">
                MORTGAGE CHRONICLE EPILOGUE — RANK {gameState.ending.rank}
              </span>
              <h2 className="font-editorial mt-2 text-2xl font-black text-white sm:text-3xl">
                {gameState.ending.title}
              </h2>
              <p className="mt-1 text-sm font-bold text-amber-300">{gameState.ending.subtitle}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono text-xs text-slate-400">TOTAL SURVIVAL SCORE</span>
              <span className="font-mono text-3xl font-black text-amber-400">
                {gameState.score.toLocaleString()} pt
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm font-bold leading-relaxed text-slate-200">
            {gameState.ending.epilogue}
          </p>

          <div className="mt-3 rounded-xl border border-sky-500/30 bg-sky-950/30 p-3 text-xs font-bold text-sky-200">
            【1,300万世帯の統計比較】{gameState.ending.statisticComparison}
          </div>

          {/* 生涯支払総額の内訳 */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <span className="text-[10px] font-bold text-slate-400">支払元金累計</span>
              <p className="mt-0.5 font-mono text-lg font-black text-white">
                {Math.round(gameState.totalPrincipalPaidMan + gameState.totalPrepaymentMan).toLocaleString()}万円
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <span className="text-[10px] font-bold text-slate-400">支払利息累計</span>
              <p className="mt-0.5 font-mono text-lg font-black text-rose-400">
                {Math.round(gameState.totalInterestPaidMan).toLocaleString()}万円
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <span className="text-[10px] font-bold text-slate-400">管理修繕・固都税累計</span>
              <p className="mt-0.5 font-mono text-lg font-black text-amber-300">
                {Math.round(gameState.totalRunningCostPaidMan).toLocaleString()}万円
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <span className="text-[10px] font-bold text-slate-400">住宅ローン控除還付累計</span>
              <p className="mt-0.5 font-mono text-lg font-black text-emerald-400">
                +{Math.round(gameState.totalTaxCreditReceivedMan).toLocaleString()}万円
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3">
              <span className="text-[10px] font-bold text-amber-300">最終手元金融資産</span>
              <p className="mt-0.5 font-mono text-lg font-black text-amber-300">
                {Math.round(gameState.liquidSavingsMan).toLocaleString()}万円
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setGameState(null);
                handleRollGachaHousehold();
              }}
              className="cursor-pointer rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"
            >
              別の世帯ガチャを回して新しい人生を体験する
            </button>
            <button
              type="button"
              onClick={() => setGameState(null)}
              className="cursor-pointer rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-black text-white hover:bg-slate-700"
            >
              同じ世帯で銀行・金利・物件を変えて再検証する
            </button>
          </div>
        </section>
      )}

      {/* 3. リアルタイム・バランスシート KPI 4枚 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: ローン残債 & 未払利息 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">住宅ローン残債</span>
            <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-black text-rose-300">
              {gameState.config.repaymentMethod === 'equal-principal' ? '元金均等' : '元利均等'}
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-rose-400">
            {Math.round(gameState.remainingBalanceMan).toLocaleString()}
            <span className="ml-1 text-xs text-slate-300">万円</span>
          </p>
          {gameState.unpaidInterestMan > 0 ? (
            <p className="mt-1 rounded bg-rose-900/60 px-2 py-0.5 font-mono text-[11px] font-black text-rose-200">
              警告：未払利息 +{gameState.unpaidInterestMan.toFixed(1)}万円蓄積中！
            </p>
          ) : (
            <p className="mt-1 text-[11px] font-bold text-slate-400">
              支払済利息累計：{Math.round(gameState.totalInterestPaidMan).toLocaleString()}万円
            </p>
          )}
        </div>

        {/* KPI 2: 自宅推定時価 & オーバーローン判定 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">自宅推定時価（土地＋建物）</span>
            <span
              className={`rounded px-2 py-0.5 font-mono text-[10px] font-black ${
                isOverLoan
                  ? 'bg-rose-500/25 text-rose-300'
                  : 'bg-emerald-500/25 text-emerald-300'
              }`}
            >
              {isOverLoan ? 'オーバーローン(債務超過)' : 'アンダーローン(含み益)'}
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-amber-300">
            {gameState.propertyValueMan.toLocaleString()}
            <span className="ml-1 text-xs text-slate-300">万円</span>
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            土地 {gameState.landValueMan}万 ＋ 建物 {gameState.buildingValueMan}万（差額{' '}
            {equityGapMan >= 0 ? `+${equityGapMan}` : equityGapMan}万）
          </p>
        </div>

        {/* KPI 3: 手元キャッシュ & 年間収支 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">手元キャッシュ・NISA資産</span>
            <span className="font-mono text-[10px] font-bold text-slate-400">
              メンタル {gameState.mentalScore}/100
            </span>
          </div>
          <p
            className={`mt-1 font-mono text-2xl font-black ${
              gameState.liquidSavingsMan < 150 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {Math.round(gameState.liquidSavingsMan).toLocaleString()}
            <span className="ml-1 text-xs text-slate-300">万円</span>
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            直近年間収支：
            <strong
              className={
                (latestSnap?.annualCashFlowMan ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-400'
              }
            >
              {(latestSnap?.annualCashFlowMan ?? 0) >= 0 ? '+' : ''}
              {latestSnap?.annualCashFlowMan ?? 0}万円/年
            </strong>
          </p>
        </div>

        {/* KPI 4: 日銀政策金利 & 適用金利 & 団信 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">適用金利 / 日銀政策金利</span>
            <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-black text-purple-300">
              {activeDanshin.shortName}
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-sky-300">
            {gameState.appliedInterestRate}%
            <span className="ml-2 text-xs font-bold text-slate-400">
              (日銀 {gameState.bojPolicyRate}%)
            </span>
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            世帯額面年収：{gameState.mainIncomeMan + gameState.subIncomeMan}万円 / 管理修繕：月
            {gameState.currentMgmtAndRepairMonthlyMan}万
          </p>
        </div>
      </div>

      {/* 4. メイン2カラム：左＝バランスシート推移チャート＆家計防衛コマンド / 右＝1in8b年代記フィード */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-6">
          <BalanceHistoryChart
            history={gameState.history}
            initialLoanMan={gameState.underwriting.loanPrincipalMan}
            initialPropMan={
              Math.round(activeProp.priceMan * activeProp.landRatio) +
              Math.round(
                activeProp.priceMan *
                  (1 - activeProp.landRatio) *
                  (activeProp.isNew ? 0.9 : 0.96),
              )
            }
            initialCashMan={gameState.underwriting.cashRemainingAfterPurchaseMan}
            termYears={gameState.config.termYears}
          />

          {/* いつでも発動できる「家計防衛・繰上返済・借換・売却コマンド」 */}
          {gameState.status === 'playing' && (
            <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-black tracking-wider text-slate-900 dark:text-white">
                  家計防衛・財務アクション（いつでも実行可能）
                </h3>
                <span className="font-mono text-[10px] font-bold text-slate-500">
                  ※生活防衛資金100万円を残して実行可能
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={gameState.liquidSavingsMan < 400 || gameState.remainingBalanceMan <= 0}
                  onClick={() => {
                    audioManager.playSe('coin');
                    setGameState((p) =>
                      p ? executePrepayment(p, 300, 'shorten-term') : p,
                    );
                  }}
                  className="cursor-pointer rounded-xl border-2 border-emerald-600 bg-emerald-50/80 p-2.5 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-950/30"
                >
                  <p className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                    一部繰上返済 300万円【期間短縮型】
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    元金を直接300万円削り、完済年齢を引き下げる
                  </p>
                </button>

                <button
                  type="button"
                  disabled={gameState.liquidSavingsMan < 400 || gameState.remainingBalanceMan <= 0}
                  onClick={() => {
                    audioManager.playSe('coin');
                    setGameState((p) =>
                      p ? executePrepayment(p, 300, 'reduce-payment') : p,
                    );
                  }}
                  className="cursor-pointer rounded-xl border-2 border-sky-600 bg-sky-50/80 p-2.5 text-left transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sky-950/30"
                >
                  <p className="text-xs font-black text-sky-900 dark:text-sky-300">
                    一部繰上返済 300万円【返済額軽減型】
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-400">
                    期間はそのままに、毎月の返済額を引き下げる
                  </p>
                </button>

                <button
                  type="button"
                  disabled={
                    gameState.currentRateType === 'flat-35' ||
                    gameState.liquidSavingsMan < 220 ||
                    gameState.remainingBalanceMan <= 500
                  }
                  onClick={() => {
                    audioManager.playSe('stamp');
                    setGameState((p) => (p ? executeRefinance(p, 'to-fixed') : p));
                  }}
                  className="cursor-pointer rounded-xl border-2 border-amber-600 bg-amber-50/80 p-2.5 text-left transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-950/30"
                >
                  <p className="text-xs font-black text-amber-900 dark:text-amber-300">
                    他行の「全期間固定金利」へ借り換え
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    諸費用を払い今後の日銀利上げリスクを完全遮断
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playSe('stamp');
                    setIsPlaying(false);
                    setGameState((p) => (p ? executeSellProperty(p) : p));
                  }}
                  className="cursor-pointer rounded-xl border-2 border-rose-600 bg-rose-50/80 p-2.5 text-left transition hover:bg-rose-100 dark:bg-rose-950/30"
                >
                  <p className="text-xs font-black text-rose-900 dark:text-rose-300">
                    マイホームを時価売却して一括精算する
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400">
                    時価 {gameState.propertyValueMan}万で売却し残債と相殺決着
                  </p>
                </button>
              </div>
            </section>
          )}
        </div>

        {/* 右カラム：1in8b.life スタイルのドキュメンタリー年代記フィード */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white shadow-xl lg:col-span-6">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="font-mono text-[10px] font-black tracking-widest text-amber-400">
                DOCUMENTARY LIFE & LOAN CHRONICLE
              </span>
              <h3 className="text-sm font-black text-white">
                住宅ローン返済年代記（最新順・全{gameState.chronicle.length}件の記録）
              </h3>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {gameState.age}歳 / {gameState.calendarYear}年
            </span>
          </div>

          <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
            {gameState.chronicle.map((entry) => {
              const borderClass =
                entry.tone === 'good'
                  ? 'border-l-4 border-l-emerald-400 border-slate-800 bg-emerald-950/20'
                  : entry.tone === 'bad'
                    ? 'border-l-4 border-l-rose-500 border-slate-800 bg-rose-950/25'
                    : entry.tone === 'mixed'
                      ? 'border-l-4 border-l-amber-400 border-slate-800 bg-amber-950/20'
                      : 'border-l-4 border-l-sky-400 border-slate-800 bg-slate-900/80';

              return (
                <article
                  key={entry.id}
                  className={`rounded-xl border p-3.5 transition ${borderClass}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="font-mono text-[10px] font-black text-amber-300">
                      {entry.calendarYear}年 / {entry.age}歳（返済{entry.yearIndex}年目）
                    </span>
                    {entry.financialDeltaLabel && (
                      <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] font-black text-white">
                        {entry.financialDeltaLabel}
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1 text-xs font-black text-white sm:text-sm">{entry.title}</h4>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-slate-300">
                    {entry.body}
                  </p>
                  {entry.statNote && (
                    <p className="mt-1.5 rounded bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold text-sky-300">
                      統計メモ：{entry.statNote}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
