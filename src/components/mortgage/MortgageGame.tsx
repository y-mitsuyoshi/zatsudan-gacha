"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ARCHETYPES,
  BANKS,
  DANSHIN_PLANS,
  EMPLOYMENT_LABELS,
  FAMILY_PLANS,
  FOCUS_MODES,
  MACRO_REGIMES,
  PROPERTIES,
  advanceOneYear,
  analyzeOutcomeFactors,
  createMortgageGame,
  executePrepayment,
  executePropertySpecificAction,
  executeRefinance,
  executeSellProperty,
  generateRandomHouseholdSetup,
  resolveMortgageDecision,
  runBankUnderwriting,
  setFocusMode,
} from '@/lib/mortgage-logic';
import {
  BankId,
  ContractType,
  DanshinType,
  FamilyPlanType,
  FocusModeId,
  LoanTermYears,
  MacroRegimeId,
  MortgageGameState,
  MortgageSetupConfig,
  PropertyCategory,
  RepaymentMethod,
} from '@/types/mortgage';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';
import { audioManager } from '@/utils/audio';
import {
  AnnualCashFlowBreakdownDiagram,
  FamilyPortraitSvg,
  JapanMortgageMapIllustration,
  LifeMapGrid,
  LifeScenePanoramaSvg,
  MultiPerspectiveCharts,
  PropertyArchitecturalIllustration,
} from './MortgageVisuals';

type SpeedSetting = 0 | 0.5 | 1 | 2 | 4 | 8;

const ENERGY_CERT_LABELS = {
  'long-term-excellent': '長期優良住宅（控除最大・固定資産税5年軽減）',
  zeh: 'ZEH水準省エネ住宅（控除優遇）',
  standard: '一般省エネ基準適合',
  'non-compliant': '旧省エネ基準（新築は住宅ローン控除0円）',
} as const;

const CONTRACT_LABELS: Record<ContractType, string> = {
  single: '単独ローン（1馬力契約）',
  pair: 'ペアローン（夫婦2本契約・W控除）',
  'income-merge': '収入合算（連帯保証・1本契約）',
};

const REPAYMENT_LABELS: Record<RepaymentMethod, string> = {
  'equal-payment': '元利均等返済（毎月一定額・初期は利息多め）',
  'equal-principal': '元金均等返済（元金を定額返済・総利息が少ない）',
};

export function MortgageGame() {
  const [setupConfig, setSetupConfig] = useState<MortgageSetupConfig>(() => ({
    archetypeId: ARCHETYPES[0].id,
    age: ARCHETYPES[0].age,
    employment: ARCHETYPES[0].employment,
    mainIncomeMan: ARCHETYPES[0].mainIncomeMan,
    subIncomeMan: ARCHETYPES[0].subIncomeMan,
    initialSavingsMan: ARCHETYPES[0].initialSavingsMan,
    downPaymentMan: 600,
    hasCreditBlemish: ARCHETYPES[0].hasCreditBlemish,
    contractType: ARCHETYPES[0].recommendedContract,
    familyPlan: ARCHETYPES[0].recommendedFamily,
    propertyId: ARCHETYPES[0].recommendedProperty,
    bankId: 'mega-bank',
    termYears: 35,
    repaymentMethod: 'equal-payment',
    bonusRepaymentRatio: 0,
    danshin: 'cancer-50',
    macroRegime: 'gradual-hike',
  }));

  // 画面フェーズ: 'intro' (1in8bトップ) -> 'rolling' (抽選中) -> 'cert' (契約証書・誕生カード) -> 'life' (本編・結末)
  const [viewStage, setViewStage] = useState<'intro' | 'rolling' | 'cert' | 'life'>('intro');
  const [spawnMode, setSpawnMode] = useState<'random' | 'custom'>('random');
  const [speedSetting, setSpeedSetting] = useState<SpeedSetting>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoResolveDecisions, setAutoResolveDecisions] = useState<boolean>(false);
  const [fastForwardToDecision, setFastForwardToDecision] = useState<boolean>(false);

  const [gameState, setGameState] = useState<MortgageGameState | null>(null);
  const [starredEntryIds, setStarredEntryIds] = useState<number[]>([]);
  const [recentBadge, setRecentBadge] = useState<string | null>(null);
  const [rollingStep, setRollingStep] = useState<number>(0);
  const [introSecondTick, setIntroSecondTick] = useState<number>(0);
  const [mobileTab, setMobileTab] = useState<'main' | 'charts' | 'status' | 'all'>('main');

  useBgm(
    viewStage === 'life' && gameState
      ? gameState.status === 'playing'
        ? 'mortgage-life'
        : 'sugoroku-result'
      : 'mortgage-life',
    false,
  );

  // イントロ画面のリアルタイム統計カウンター（1in8bの出生/死亡カウンターと同様の演出）
  useEffect(() => {
    if (viewStage !== 'intro') return;
    const t = window.setInterval(() => {
      setIntroSecondTick((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [viewStage]);

  // 抽選ルーレット演出 (rolling -> cert)
  useEffect(() => {
    if (viewStage !== 'rolling') return;
    if (rollingStep < 6) {
      const timer = window.setTimeout(() => {
        audioManager.playSe('roll');
        setRollingStep((s) => s + 1);
      }, 150);
      return () => window.clearTimeout(timer);
    }
    const doneTimer = window.setTimeout(() => {
      audioManager.playSe('stamp');
      setViewStage('cert');
    }, 220);
    return () => window.clearTimeout(doneTimer);
  }, [viewStage, rollingStep]);

  const liveUnderwriting = useMemo(() => runBankUnderwriting(setupConfig), [setupConfig]);
  const selectedProperty = PROPERTIES[setupConfig.propertyId];
  const selectedBank = BANKS[setupConfig.bankId];
  const selectedDanshin = DANSHIN_PLANS[setupConfig.danshin];
  const selectedArchetype =
    ARCHETYPES.find((a) => a.id === setupConfig.archetypeId) ?? ARCHETYPES[0];

  const triggerVisualBadge = useCallback((label: string) => {
    setRecentBadge(label);
    window.setTimeout(() => {
      setRecentBadge((cur) => (cur === label ? null : cur));
    }, 2200);
  }, []);

  // 本編の年次自動進行ループ
  useEffect(() => {
    if (viewStage !== 'life' || !gameState || gameState.status !== 'playing') {
      return;
    }

    // 決断イベント発生中
    if (gameState.pendingDecision) {
      setFastForwardToDecision(false);
      if (autoResolveDecisions) {
        const autoTimer = window.setTimeout(() => {
          setGameState((prev) => {
            if (!prev || !prev.pendingDecision) return prev;
            const choice = prev.pendingDecision.choices[0];
            audioManager.playSe('stamp');
            triggerVisualBadge(`おまかせ決断：${choice.label}`);
            return resolveMortgageDecision(prev, choice.id);
          });
        }, 650);
        return () => window.clearTimeout(autoTimer);
      }
      return;
    }

    if (isPaused || (speedSetting === 0 && !fastForwardToDecision)) {
      return;
    }

    const effectiveSpeed = fastForwardToDecision ? 8 : speedSetting;
    const intervalMs =
      effectiveSpeed === 8
        ? 180
        : effectiveSpeed === 4
          ? 380
          : effectiveSpeed === 2
            ? 720
            : effectiveSpeed === 1
              ? 1350
              : 2400;

    const timer = window.setTimeout(() => {
      setGameState((prev) => {
        if (!prev || prev.status !== 'playing' || prev.pendingDecision) return prev;
        const next = advanceOneYear(prev);
        const latestChron = next.chronicle[0];
        if (latestChron?.financialDeltaLabel) {
          triggerVisualBadge(`${next.age}歳：${latestChron.financialDeltaLabel}`);
        }
        if (next.pendingDecision || next.status !== 'playing') {
          setFastForwardToDecision(false);
          audioManager.playSe(
            next.status === 'cleared' ? 'fanfare' : next.status === 'bankrupt' ? 'bad' : 'card',
          );
        } else {
          audioManager.playSe('move');
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [
    viewStage,
    gameState,
    isPaused,
    speedSetting,
    autoResolveDecisions,
    fastForwardToDecision,
    triggerVisualBadge,
  ]);

  const handleApplyArchetype = useCallback((archId: string) => {
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
      downPaymentMan: Math.min(Math.max(0, arch.initialSavingsMan - 300), 600),
      hasCreditBlemish: arch.hasCreditBlemish,
      contractType: arch.recommendedContract,
      familyPlan: arch.recommendedFamily,
      propertyId: arch.recommendedProperty,
    }));
  }, []);

  const handlePressBornButton = () => {
    if (spawnMode === 'random') {
      const randomCfg = generateRandomHouseholdSetup();
      setSetupConfig({
        ...randomCfg,
        macroRegime: setupConfig.macroRegime,
      });
      setRollingStep(0);
      setViewStage('rolling');
    } else {
      audioManager.playSe('stamp');
      setViewStage('cert');
    }
  };

  const handleRerollCert = () => {
    const randomCfg = generateRandomHouseholdSetup();
    setSetupConfig({
      ...randomCfg,
      macroRegime: setupConfig.macroRegime,
    });
    setRollingStep(0);
    setViewStage('rolling');
  };

  const handleBeginLifeFromCert = () => {
    audioManager.playSe('fanfare');
    const initial = createMortgageGame(setupConfig);
    setGameState(initial);
    setIsPaused(speedSetting === 0);
    setFastForwardToDecision(false);
    setViewStage('life');
  };

  const handleStepOneYearManual = () => {
    if (!gameState || gameState.status !== 'playing' || gameState.pendingDecision) return;
    setIsPaused(true);
    setFastForwardToDecision(false);
    const next = advanceOneYear(gameState);
    const latestChron = next.chronicle[0];
    if (latestChron?.financialDeltaLabel) {
      triggerVisualBadge(`${next.age}歳：${latestChron.financialDeltaLabel}`);
    }
    if (next.pendingDecision || next.status !== 'playing') {
      audioManager.playSe(
        next.status === 'cleared' ? 'fanfare' : next.status === 'bankrupt' ? 'bad' : 'card',
      );
    } else {
      audioManager.playSe('move');
    }
    setGameState(next);
  };

  const handleSelectDecision = (choiceId: string) => {
    if (!gameState || !gameState.pendingDecision) return;
    const choice = gameState.pendingDecision.choices.find((c) => c.id === choiceId);
    audioManager.playSe('stamp');
    if (choice) {
      triggerVisualBadge(`決断：${choice.label}`);
    }
    setGameState((prev) => (prev ? resolveMortgageDecision(prev, choiceId) : prev));
  };

  const toggleStarEntry = (id: number) => {
    setStarredEntryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // ============================================================================
  // フェーズ 1: 1in8b.life/ja/ スタイルのイントロ画面
  // ============================================================================
  if (viewStage === 'intro') {
    const newLoansCount = Math.max(1, Math.floor(introSecondTick * 1.4));
    const troubleCount = Math.floor(introSecondTick * 0.25);

    const oddsRows = [
      { id: 'steady-couple-station', label: '首都圏・共働きマンション', pct: 22.4 },
      { id: 'civil-servant-single', label: '郊外・新築戸建て安定世帯', pct: 24.8 },
      { id: 'late-30s-family-late-loan', label: '30代後半・74歳完済世帯', pct: 19.5 },
      { id: 'young-50yr-challenger', label: '20代・50年超長期ローン', pct: 15.3 },
      { id: 'freelance-creator', label: 'フリーランス・中古リノベ', pct: 11.2 },
      { id: 'power-couple-tower', label: '都心・湾岸タワマン世帯', pct: 6.8 },
    ];

    return (
      <div className="text-[#13212A] dark:text-[#E1E9E6]">
        {/* ヒーロー2カラム（1in8b.life/ja/ と同じ構成） */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* 左：タイトル・リード文・リアルタイムカウンター */}
          <div className="lg:col-span-7">
            <p className="font-mono text-xs font-semibold tracking-wide text-[#0F6E68] dark:text-[#4CC0AF]">
              無料の住宅ローン人生シミュレーション · 国土交通省・日銀・住宅金融支援機構の統計にもとづく
            </p>
            <h1 className="font-editorial mt-3 text-6xl font-bold leading-[0.94] tracking-tight sm:text-8xl">
              1,300万
              <span className="whitespace-nowrap">
                分の<em className="not-italic text-[#8C1D3C] dark:text-[#E2678A]">1</em>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#4A5A61] sm:text-lg dark:text-[#A3B2AF]">
              いまこの瞬間にも、日本のどこかで誰かがマイホームの鍵を受け取り、35年・50年の返済を始めています。そのひとりになって、完済の日までの一度きりの家計と暮らしを最後まで生きてみます。
            </p>

            {/* 1in8bスタイルのリアルタイムカウンター */}
            <div className="mt-7 flex flex-wrap gap-8 border-t border-[#C7D2CE] pt-5 dark:border-[#2A383D]">
              <div>
                <strong className="font-editorial block text-3xl font-semibold tabular-nums text-[#13212A] dark:text-[#E1E9E6]">
                  {newLoansCount.toLocaleString()}
                </strong>
                <span className="text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                  このページを開いてから実行された住宅ローン融資（推計）
                </span>
              </div>
              <div>
                <strong className="font-editorial block text-3xl font-semibold tabular-nums text-[#8C1D3C] dark:text-[#E2678A]">
                  {troubleCount.toLocaleString()}
                </strong>
                <span className="text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                  同じ時間に返済困難・条件変更・任意売却に至った世帯
                </span>
              </div>
            </div>
          </div>

          {/* 右：日本列島統計マップ ＆ 「いま鍵を受け取る世帯だったら」確率バー表 */}
          <div className="space-y-3 lg:col-span-5">
            <JapanMortgageMapIllustration activeTick={introSecondTick} />

            <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-5 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
              <h2 className="font-editorial text-lg font-semibold">いま鍵を受け取る世帯だったら</h2>
              <p className="mt-0.5 text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                日本の住宅市場統計における主な世帯タイプの割合（行をクリックでその境遇を選択）
              </p>
              <div className="mt-3.5 space-y-2">
                {oddsRows.map((row) => {
                  const isSelected = setupConfig.archetypeId === row.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        handleApplyArchetype(row.id);
                        setSpawnMode('custom');
                      }}
                      className={`grid w-full grid-cols-[9.5em_1fr_3em] items-center gap-2 rounded px-1.5 py-1 text-left text-xs transition sm:grid-cols-[11em_1fr_3.4em] sm:gap-2.5 ${
                        isSelected
                          ? 'bg-[#DCEDEA] font-bold text-[#13212A] dark:bg-[#12302D] dark:text-white'
                          : 'hover:bg-[#F0F4F2] dark:hover:bg-[#1A2428]'
                      }`}
                    >
                      <span className="truncate">{row.label}</span>
                      <span className="h-2 overflow-hidden rounded-[1px] bg-[#DCE4E1] dark:bg-[#1D282C]">
                        <i
                          style={{ width: `${Math.min(100, row.pct * 3.6)}%` }}
                          className="block h-full bg-[#0F6E68] dark:bg-[#4CC0AF]"
                        />
                      </span>
                      <span className="text-right font-mono text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
                        {row.pct}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 1in8bスタイルのセグメント設定バー (.opts) */}
        <div className="mt-10 rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-6 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
          <div className="flex flex-wrap items-start gap-8">
            {/* 1. 境遇の決め方 */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wider text-[#5F6E72] dark:text-[#8A9A96]">
                境遇と物件の決め方
              </span>
              <div className="inline-flex overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED] dark:border-[#2A383D] dark:bg-[#0D1316]">
                <button
                  type="button"
                  onClick={() => setSpawnMode('random')}
                  aria-pressed={spawnMode === 'random'}
                  className={`px-3.5 py-2 text-xs font-semibold transition ${
                    spawnMode === 'random'
                      ? 'bg-[#13212A] text-[#EBF0ED] dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                      : 'text-[#4A5A61] dark:text-[#A3B2AF]'
                  }`}
                >
                  統計どおりランダムに決める
                </button>
                <button
                  type="button"
                  onClick={() => setSpawnMode('custom')}
                  aria-pressed={spawnMode === 'custom'}
                  className={`border-l border-[#C7D2CE] px-3.5 py-2 text-xs font-semibold transition dark:border-[#2A383D] ${
                    spawnMode === 'custom'
                      ? 'bg-[#13212A] text-[#EBF0ED] dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                      : 'text-[#4A5A61] dark:text-[#A3B2AF]'
                  }`}
                >
                  自分で物件・銀行・ペアローン等を設計する
                </button>
              </div>
              <span className="max-w-xs text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                ランダムなら統計確率に応じて世帯・物件・ローン条件が抽選されます。「自分で設計」ならタワマンや50年ローン等を自由に選べます。
              </span>
            </div>

            {/* 2. これからの世界（金利・経済情勢） */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wider text-[#5F6E72] dark:text-[#8A9A96]">
                これからの世界（日銀・金利情勢）
              </span>
              <div className="inline-flex flex-wrap overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED] dark:border-[#2A383D] dark:bg-[#0D1316]">
                {(
                  [
                    { id: 'gradual-hike', label: 'いまの日本（段階利上げ）' },
                    { id: 'stagflation-shock', label: '円安スタグフレーション' },
                    { id: 'asset-bubble', label: '好景気・資産バブル' },
                    { id: 'deflation-return', label: 'デフレ回帰' },
                    { id: 'dynamic-random', label: 'どの世界でも（ランダム）' },
                  ] as { id: MacroRegimeId; label: string }[]
                ).map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSetupConfig((p) => ({ ...p, macroRegime: m.id }))}
                    aria-pressed={setupConfig.macroRegime === m.id}
                    className={`${idx > 0 ? 'border-l border-[#C7D2CE] dark:border-[#2A383D]' : ''} px-3 py-2 text-xs font-semibold transition ${
                      setupConfig.macroRegime === m.id
                        ? 'bg-[#13212A] text-[#EBF0ED] dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                        : 'text-[#4A5A61] dark:text-[#A3B2AF]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <span className="max-w-md text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                {MACRO_REGIMES[setupConfig.macroRegime].description}
              </span>
            </div>

            {/* 3. ひとつの返済人生のペース */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wider text-[#5F6E72] dark:text-[#8A9A96]">
                時間の進むペース（プレイ中も変更可能）
              </span>
              <div className="inline-flex overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED] dark:border-[#2A383D] dark:bg-[#0D1316]">
                {(
                  [
                    { spd: 0.5, label: 'じっくり (0.5×)' },
                    { spd: 1, label: '標準 (1×)' },
                    { spd: 2, label: '速め (2×)' },
                    { spd: 4, label: '高速 (4×)' },
                    { spd: 0, label: '手動で1年ずつ' },
                  ] as { spd: SpeedSetting; label: string }[]
                ).map((item, idx) => (
                  <button
                    key={item.spd}
                    type="button"
                    onClick={() => setSpeedSetting(item.spd)}
                    aria-pressed={speedSetting === item.spd}
                    className={`${idx > 0 ? 'border-l border-[#C7D2CE] dark:border-[#2A383D]' : ''} px-3 py-2 text-xs font-semibold transition ${
                      speedSetting === item.spd
                        ? 'bg-[#13212A] text-[#EBF0ED] dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                        : 'text-[#4A5A61] dark:text-[#A3B2AF]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className="max-w-sm text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                返済が始まったあとも、画面上部のバーでいつでも一時停止・倍速変更・1年送り・早送りができます。
              </span>
            </div>
          </div>

          {/* カスタム設計モード展開時のイラスト付き詳細設計＆銀行本審査シート */}
          {spawnMode === 'custom' && (
            <div className="mt-8 border-t border-[#C7D2CE] pt-7 dark:border-[#2A383D]">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* 左7列：物件・銀行・ペアローン・団信の選択 */}
                <div className="space-y-6 lg:col-span-7">
                  {/* A. 世帯プリセット＆年収スライダー */}
                  <div className="rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED]/60 p-4 dark:border-[#2A383D] dark:bg-[#0D1316]/60">
                    <h3 className="text-sm font-bold">1. 世帯モデル・年齢・年収・契約方式</h3>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {ARCHETYPES.map((arch) => (
                        <button
                          key={arch.id}
                          type="button"
                          onClick={() => handleApplyArchetype(arch.id)}
                          className={`rounded-[4px] border p-2.5 text-left text-xs transition ${
                            setupConfig.archetypeId === arch.id
                              ? 'border-[#8C1D3C] bg-[#F3E3E8]/70 font-bold dark:border-[#E2678A] dark:bg-[#3A1C26]/50'
                              : 'border-[#C7D2CE] bg-[#F7FAF8] dark:border-[#2A383D] dark:bg-[#141D21]'
                          }`}
                        >
                          <div>{arch.title}</div>
                          <div className="mt-0.5 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                            {arch.subtitle}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block text-xs">
                        <div className="flex justify-between font-semibold">
                          <span>契約時年齢</span>
                          <span className="font-mono">{setupConfig.age}歳</span>
                        </div>
                        <input
                          type="range"
                          min={24}
                          max={46}
                          value={setupConfig.age}
                          onChange={(e) =>
                            setSetupConfig((p) => ({ ...p, age: Number(e.target.value) }))
                          }
                          className="mt-1 w-full accent-[#8C1D3C]"
                        />
                      </label>
                      <label className="block text-xs">
                        <div className="flex justify-between font-semibold">
                          <span>本人額面年収</span>
                          <span className="font-mono">{setupConfig.mainIncomeMan}万円</span>
                        </div>
                        <input
                          type="range"
                          min={300}
                          max={1400}
                          step={20}
                          value={setupConfig.mainIncomeMan}
                          onChange={(e) =>
                            setSetupConfig((p) => ({
                              ...p,
                              mainIncomeMan: Number(e.target.value),
                            }))
                          }
                          className="mt-1 w-full accent-[#8C1D3C]"
                        />
                      </label>
                      <label className="block text-xs">
                        <div className="flex justify-between font-semibold">
                          <span>配偶者額面年収</span>
                          <span className="font-mono">{setupConfig.subIncomeMan}万円</span>
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
                          className="mt-1 w-full accent-[#8C1D3C]"
                        />
                      </label>
                      <label className="block text-xs">
                        <div className="flex justify-between font-semibold">
                          <span>頭金投入額（自己資金{setupConfig.initialSavingsMan}万中）</span>
                          <span className="font-mono">{setupConfig.downPaymentMan}万円</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(100, setupConfig.initialSavingsMan - 100)}
                          step={50}
                          value={setupConfig.downPaymentMan}
                          onChange={(e) =>
                            setSetupConfig((p) => ({
                              ...p,
                              downPaymentMan: Number(e.target.value),
                            }))
                          }
                          className="mt-1 w-full accent-[#0F6E68]"
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <span className="block text-xs font-semibold">契約方式（単独 / ペアローン）</span>
                        <select
                          value={setupConfig.contractType}
                          onChange={(e) =>
                            setSetupConfig((p) => ({
                              ...p,
                              contractType: e.target.value as ContractType,
                            }))
                          }
                          className="mt-1 w-full rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] px-2.5 py-2 text-xs dark:border-[#2A383D] dark:bg-[#141D21]"
                        >
                          {(['single', 'pair', 'income-merge'] as ContractType[]).map((ct) => (
                            <option key={ct} value={ct}>
                              {CONTRACT_LABELS[ct]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold">家族・子ども・進学プラン</span>
                        <select
                          value={setupConfig.familyPlan}
                          onChange={(e) =>
                            setSetupConfig((p) => ({
                              ...p,
                              familyPlan: e.target.value as FamilyPlanType,
                            }))
                          }
                          className="mt-1 w-full rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] px-2.5 py-2 text-xs dark:border-[#2A383D] dark:bg-[#141D21]"
                        >
                          {Object.values(FAMILY_PLANS).map((fp) => (
                            <option key={fp.id} value={fp.id}>
                              {fp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* B. 購入物件（建築イラスト付きカード） */}
                  <div className="rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED]/60 p-4 dark:border-[#2A383D] dark:bg-[#0D1316]/60">
                    <h3 className="text-sm font-bold">
                      2. 購入するマイホーム（タワマン / マンション / 一戸建て / 新築・中古・長期優良）
                    </h3>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {Object.values(PROPERTIES).map((prop) => {
                        const active = setupConfig.propertyId === prop.id;
                        return (
                          <button
                            key={prop.id}
                            type="button"
                            onClick={() =>
                              setSetupConfig((p) => ({ ...p, propertyId: prop.id }))
                            }
                            className={`rounded-[4px] border p-2.5 text-left transition ${
                              active
                                ? 'border-[#0F6E68] bg-[#DCEDEA]/70 ring-1 ring-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D]/60'
                                : 'border-[#C7D2CE] bg-[#F7FAF8] dark:border-[#2A383D] dark:bg-[#141D21]'
                            }`}
                          >
                            <PropertyArchitecturalIllustration
                              propertyId={prop.id}
                              className="h-24 w-full"
                            />
                            <div className="mt-2 flex items-baseline justify-between">
                              <span className="text-xs font-bold">{prop.shortName}</span>
                              <span className="font-mono text-xs font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                                {prop.priceMan.toLocaleString()}万円
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                              {ENERGY_CERT_LABELS[prop.energyCert]}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* C. 銀行・金利・35年/50年・元利/元金・団信 */}
                  <div className="rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED]/60 p-4 dark:border-[#2A383D] dark:bg-[#0D1316]/60">
                    <h3 className="text-sm font-bold">
                      3. 借入銀行・変動/固定・返済期間（25/35/50年）・元利/元金均等・団信
                    </h3>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {Object.values(BANKS).map((bank) => {
                        const active = setupConfig.bankId === bank.id;
                        return (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() =>
                              setSetupConfig((p) => ({
                                ...p,
                                bankId: bank.id as BankId,
                                termYears:
                                  p.termYears === 50 && !bank.supports50Years ? 35 : p.termYears,
                              }))
                            }
                            className={`flex items-center justify-between rounded-[4px] border p-3 text-left text-xs transition ${
                              active
                                ? 'border-[#8C1D3C] bg-[#F3E3E8]/70 font-bold dark:border-[#E2678A] dark:bg-[#3A1C26]/50'
                                : 'border-[#C7D2CE] bg-[#F7FAF8] dark:border-[#2A383D] dark:bg-[#141D21]'
                            }`}
                          >
                            <div>
                              <div className="font-bold">{bank.name}</div>
                              <div className="mt-0.5 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                                {bank.categoryLabel}
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <span className="text-sm font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                                年 {bank.baseRate.toFixed(2)}%
                              </span>
                              <span className="block text-[10px] text-[#5F6E72]">
                                審査金利 {bank.screeningRate}%
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <span className="block text-xs font-semibold">返済期間</span>
                        <div className="mt-1 flex overflow-hidden rounded-[4px] border border-[#C7D2CE] dark:border-[#2A383D]">
                          {([25, 35, 50] as LoanTermYears[]).map((yr) => {
                            const disabled = yr === 50 && !selectedBank.supports50Years;
                            return (
                              <button
                                key={yr}
                                type="button"
                                disabled={disabled}
                                onClick={() => setSetupConfig((p) => ({ ...p, termYears: yr }))}
                                className={`flex-1 py-2 font-mono text-xs font-bold ${
                                  setupConfig.termYears === yr
                                    ? 'bg-[#13212A] text-white dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                                    : disabled
                                      ? 'opacity-35'
                                      : 'bg-[#F7FAF8] dark:bg-[#141D21]'
                                }`}
                              >
                                {yr}年
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-semibold">返済方式</span>
                        <select
                          value={setupConfig.repaymentMethod}
                          onChange={(e) =>
                            setSetupConfig((p) => ({
                              ...p,
                              repaymentMethod: e.target.value as RepaymentMethod,
                            }))
                          }
                          className="mt-1 w-full rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] px-2 py-2 text-xs dark:border-[#2A383D] dark:bg-[#141D21]"
                        >
                          <option value="equal-payment">元利均等返済</option>
                          <option value="equal-principal">元金均等返済</option>
                        </select>
                      </div>

                      <div>
                        <span className="block text-xs font-semibold">団体信用生命保険（団信）</span>
                        <select
                          value={setupConfig.danshin}
                          onChange={(e) =>
                            setSetupConfig((p) => ({
                              ...p,
                              danshin: e.target.value as DanshinType,
                            }))
                          }
                          className="mt-1 w-full rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] px-2 py-2 text-xs dark:border-[#2A383D] dark:bg-[#141D21]"
                        >
                          {Object.values(DANSHIN_PLANS).map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.shortName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右5列：リアルタイム銀行本審査プレビュー票 */}
                <div className="lg:col-span-5">
                  <div className="sticky top-6 rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-5 shadow-md dark:border-[#2A383D] dark:bg-[#141D21]">
                    <div className="flex items-center justify-between border-b border-[#C7D2CE] pb-3 dark:border-[#2A383D]">
                      <div>
                        <span className="font-mono text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                          銀行融資審査部 · 事前審査票
                        </span>
                        <h4 className="font-editorial text-lg font-bold">住宅ローン本審査プレビュー</h4>
                      </div>
                      <div className="rounded border-2 border-[#8C1D3C] px-3 py-1 text-center font-mono text-sm font-bold text-[#8C1D3C] dark:border-[#E2678A] dark:text-[#E2678A]">
                        判定 {liveUnderwriting.grade}
                      </div>
                    </div>

                    <div className="mt-4">
                      <PropertyArchitecturalIllustration propertyId={setupConfig.propertyId} />
                    </div>

                    <dl className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between border-b border-[#DCE4E1] pb-1.5 dark:border-[#1D282C]">
                        <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">借入元本（諸費用込）</dt>
                        <dd className="font-mono text-sm font-bold">
                          {liveUnderwriting.loanPrincipalMan.toLocaleString()}万円
                        </dd>
                      </div>
                      <div className="flex justify-between border-b border-[#DCE4E1] pb-1.5 dark:border-[#1D282C]">
                        <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">
                          適用金利（団信+{selectedDanshin.spreadRate}%込）
                        </dt>
                        <dd className="font-mono text-sm font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                          年 {liveUnderwriting.effectiveInitialRate.toFixed(2)}%
                        </dd>
                      </div>
                      <div className="flex justify-between border-b border-[#DCE4E1] pb-1.5 dark:border-[#1D282C]">
                        <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">
                          初年度 毎月返済額＋維持費・税金
                        </dt>
                        <dd className="font-mono text-sm font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                          月 {liveUnderwriting.initialTotalMonthlyOutflowMan}万円
                        </dd>
                      </div>
                      <div className="flex justify-between border-b border-[#DCE4E1] pb-1.5 dark:border-[#1D282C]">
                        <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">
                          審査金利での返済負担率（DTI）
                        </dt>
                        <dd className="font-mono font-bold">{liveUnderwriting.stressDtiPercent}%</dd>
                      </div>
                      <div className="flex justify-between border-b border-[#DCE4E1] pb-1.5 dark:border-[#1D282C]">
                        <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">住宅ローン控除（初年度目安）</dt>
                        <dd className="font-mono font-bold text-[#2B7A4E] dark:text-[#5CC38B]">
                          年 +{liveUnderwriting.maxTaxDeductionAnnualMan}万円 ×{' '}
                          {liveUnderwriting.taxDeductionYears}年
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">完済予定年齢</dt>
                        <dd className="font-mono font-bold">{liveUnderwriting.maturityAge}歳</dd>
                      </div>
                    </dl>

                    {liveUnderwriting.warnings.length > 0 && (
                      <div className="mt-3 rounded bg-[#F3E2B3]/40 p-2.5 text-[11px] text-[#4A5A61] dark:bg-[#2A2212] dark:text-[#E2B04C]">
                        <div className="font-bold">審査部からの留意事項：</div>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {liveUnderwriting.warnings.slice(0, 3).map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1in8bスタイルのメインCTA行 (.ctarow) */}
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#C7D2CE] pt-6 dark:border-[#2A383D]">
            <button
              type="button"
              onClick={handlePressBornButton}
              className="inline-flex items-center gap-3 rounded-[4px] bg-[#8C1D3C] px-8 py-4 text-lg font-semibold text-white shadow transition hover:brightness-110 dark:bg-[#E2678A] dark:text-[#1B0910]"
            >
              <span>鍵を受け取る（人生を始める）</span>
              <span aria-hidden="true">→</span>
            </button>
            <span className="text-xs text-[#5F6E72] dark:text-[#8A9A96]">
              設定はそのままで、すぐに鍵を受け取って始めてもかまいません。
            </span>
            <div className="ml-auto">
              <AudioToggle variant="full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // フェーズ 2A: 統計抽選ルーレット演出 (#roll)
  // ============================================================================
  if (viewStage === 'rolling') {
    const sampleArch = ARCHETYPES[rollingStep % ARCHETYPES.length];
    const sampleProp = Object.values(PROPERTIES)[rollingStep % Object.values(PROPERTIES).length];
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-8 shadow-md dark:border-[#2A383D] dark:bg-[#141D21]">
          <div className="font-mono text-xs font-semibold tracking-widest text-[#0F6E68] dark:text-[#4CC0AF]">
            1,300万世帯の統計からあなたの境遇とマイホームを抽選しています...
          </div>
          <div className="font-editorial mt-4 text-2xl font-bold text-[#13212A] dark:text-[#E1E9E6]">
            {sampleArch.title}
          </div>
          <div className="mt-2 font-mono text-sm text-[#8C1D3C] dark:text-[#E2678A]">
            {sampleProp.name}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // フェーズ 2B: 1in8bスタイルの「住宅ローン契約証書（出生届スタイル）」画面 (#cert)
  // ============================================================================
  if (viewStage === 'cert') {
    return (
      <div className="mx-auto max-w-3xl py-4">
        <div className="overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] shadow-lg dark:border-[#2A383D] dark:bg-[#141D21]">
          {/* 証書ヘッダー帯 */}
          <div className="flex items-center justify-between bg-[#13212A] px-6 py-3 text-white dark:bg-[#1A2428]">
            <b className="font-editorial text-sm tracking-widest">
              金銭消費貸借契約証書 · 住宅ローン本審査通知書
            </b>
            <span className="font-mono text-xs text-[#D9AF59]">
              証書番号 JP-{setupConfig.age}0{setupConfig.termYears}-{liveUnderwriting.loanPrincipalMan}
            </span>
          </div>

          {/* ギョーシェ飾り波線 */}
          <svg viewBox="0 0 600 14" className="h-3.5 w-full bg-[#F0F4F2] dark:bg-[#1A2428]" aria-hidden="true">
            <path
              d="M0,7 Q15,0 30,7 T60,7 T90,7 T120,7 T150,7 T180,7 T210,7 T240,7 T270,7 T300,7 T330,7 T360,7 T390,7 T420,7 T450,7 T480,7 T510,7 T540,7 T570,7 T600,7"
              fill="none"
              stroke="#0F6E68"
              strokeWidth="1"
              opacity="0.45"
            />
          </svg>

          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <FamilyPortraitSvg
                  age={setupConfig.age}
                  hasSpouse={setupConfig.subIncomeMan > 0 || setupConfig.contractType !== 'single'}
                  childrenCount={FAMILY_PLANS[setupConfig.familyPlan].childrenCount}
                  mentalScore={85}
                  employment={setupConfig.employment}
                />
                <div>
                  <span className="font-mono text-xs text-[#0F6E68] dark:text-[#4CC0AF]">
                    {selectedArchetype.percentileLabel}
                  </span>
                  <h2 className="font-editorial mt-0.5 text-2xl font-bold text-[#13212A] dark:text-[#E1E9E6]">
                    {selectedArchetype.title}（{setupConfig.age}歳）
                  </h2>
                  <p className="mt-1 text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
                    {EMPLOYMENT_LABELS[setupConfig.employment]} ·{' '}
                    {CONTRACT_LABELS[setupConfig.contractType]} ·{' '}
                    {FAMILY_PLANS[setupConfig.familyPlan].name}
                  </p>
                </div>
              </div>

              {/* 朱肉ハンコ風の本審査承認印 */}
              <div className="shrink-0 self-start rounded border-2 border-[#8C1D3C] bg-[#F3E3E8]/50 px-3.5 py-2 text-center font-mono text-[#8C1D3C] dark:border-[#E2678A] dark:bg-[#3A1C26]/40 dark:text-[#E2678A]">
                <div className="text-[10px] font-bold">融資審査判定</div>
                <div className="text-lg font-black leading-tight">
                  本審査承認 ({liveUnderwriting.grade})
                </div>
              </div>
            </div>

            {/* 物件イラスト＆ストーリー */}
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <PropertyArchitecturalIllustration
                  propertyId={setupConfig.propertyId}
                  className="h-36 w-full"
                />
              </div>
              <div className="flex flex-col justify-between sm:col-span-7">
                <div>
                  <h3 className="font-editorial text-base font-bold">{selectedProperty.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#4A5A61] dark:text-[#A3B2AF]">
                    {selectedProperty.description}
                  </p>
                  <p className="mt-2 rounded bg-[#F0F4F2] p-2 text-[11px] text-[#8C1D3C] dark:bg-[#1A2428] dark:text-[#F07B6B]">
                    {selectedProperty.riskNote}
                  </p>
                </div>
              </div>
            </div>

            {/* 契約主要数値フィールド */}
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-b border-[#C7D2CE] py-4 sm:grid-cols-4 dark:border-[#2A383D]">
              <div>
                <span className="block text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                  物件価格 / 借入元本
                </span>
                <strong className="font-mono text-sm font-bold">
                  {selectedProperty.priceMan.toLocaleString()}万 / 借入
                  {liveUnderwriting.loanPrincipalMan.toLocaleString()}万
                </strong>
              </div>
              <div>
                <span className="block text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                  借入銀行・初期適用金利
                </span>
                <strong className="font-mono text-sm font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                  {selectedBank.shortName}（{liveUnderwriting.effectiveInitialRate.toFixed(2)}%）
                </strong>
              </div>
              <div>
                <span className="block text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                  返済期間・完済予定年齢
                </span>
                <strong className="font-mono text-sm font-bold">
                  {setupConfig.termYears}年ローン（{liveUnderwriting.maturityAge}歳完済）
                </strong>
              </div>
              <div>
                <span className="block text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                  実質住居費（ローン＋管理税）
                </span>
                <strong className="font-mono text-sm font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                  月 {liveUnderwriting.initialTotalMonthlyOutflowMan}万円
                </strong>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
              <span>団信保障：{selectedDanshin.name}</span>
              <span>
                住宅ローン控除：最大 年{liveUnderwriting.maxTaxDeductionAnnualMan}万円 ×{' '}
                {liveUnderwriting.taxDeductionYears}年間
              </span>
            </div>
          </div>

          {/* フッターボタン */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#C7D2CE] bg-[#F0F4F2] px-6 py-4 dark:border-[#2A383D] dark:bg-[#1A2428]">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRerollCert}
                className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] px-4 py-2.5 text-xs font-semibold transition hover:border-[#5F6E72] dark:border-[#2A383D] dark:bg-[#141D21]"
              >
                別の世帯を抽選する
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpawnMode('custom');
                  setViewStage('intro');
                }}
                className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] px-4 py-2.5 text-xs font-semibold transition hover:border-[#5F6E72] dark:border-[#2A383D] dark:bg-[#141D21]"
              >
                条件を細かく設計し直す
              </button>
            </div>
            <button
              type="button"
              onClick={handleBeginLifeFromCert}
              className="rounded-[4px] bg-[#8C1D3C] px-7 py-3 text-base font-semibold text-white shadow transition hover:brightness-110 dark:bg-[#E2678A] dark:text-[#1B0910]"
            >
              融資を実行し、1年目の暮らしを始める →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const isFinished = gameState.status !== 'playing';
  const progressPct = Math.min(
    100,
    Math.round((gameState.yearIndex / Math.max(1, gameState.config.termYears)) * 100),
  );
  const currentFocus = gameState.focusMode ?? 'balanced';

  // 状態バー (0-100) の計算
  const cashSafetyScore = Math.max(
    0,
    Math.min(100, Math.round((gameState.liquidSavingsMan / 1500) * 100)),
  );
  const equityHealthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        50 + ((gameState.propertyValueMan - gameState.remainingBalanceMan) / 3500) * 50,
      ),
    ),
  );
  const healthScore = gameState.healthScore ?? 85;
  const mentalScore = gameState.mentalScore;

  // ============================================================================
  // フェーズ 3 & 4: 1in8b.life/ja/ スタイルの本編3カラム ＆ 結末回顧録ビュー
  // ============================================================================
  const currentProperty = PROPERTIES[gameState.config.propertyId];
  const isMansionOrTower =
    currentProperty.buildingType === 'mansion' || currentProperty.buildingType === 'tower';

  return (
    <div className="space-y-5 pb-20 text-[#13212A] lg:pb-4 dark:text-[#E1E9E6]">
      {/* 1in8bスタイルのスティッキートップバー (.topbar) */}
      <div className="sticky top-2 z-30 rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8]/95 px-3.5 py-2.5 shadow-md backdrop-blur sm:px-4 sm:py-3 dark:border-[#2A383D] dark:bg-[#141D21]/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 年齢＆プログレスバー */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="font-editorial text-3xl font-bold tabular-nums leading-none sm:text-4xl">
              {gameState.age}
              <small className="ml-0.5 text-base font-normal text-[#5F6E72] dark:text-[#8A9A96]">
                歳
              </small>
            </div>
            <div className="min-w-[155px] sm:min-w-[240px]">
              <div className="flex justify-between font-mono text-[11px] text-[#4A5A61] sm:text-xs dark:text-[#A3B2AF]">
                <span>
                  {gameState.calendarYear}年 · 返済{gameState.yearIndex}年目
                </span>
                <span>残り {gameState.termRemainingYears}年</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-[2px] bg-[#DCE4E1] dark:bg-[#1D282C]">
                <div
                  style={{ width: `${progressPct}%` }}
                  className="h-full bg-[#0F6E68] transition-all duration-300 dark:bg-[#4CC0AF]"
                />
              </div>
            </div>
          </div>

          {/* 自分のペースで操作できる時間コントロール群 */}
          {!isFinished ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {/* 一時停止 / 再生ボタン */}
              <button
                type="button"
                onClick={() => {
                  audioManager.playSe('click');
                  if (speedSetting === 0) setSpeedSetting(1);
                  setIsPaused((p) => !p);
                  setFastForwardToDecision(false);
                }}
                className={`rounded-[4px] border px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
                  !isPaused && speedSetting > 0
                    ? 'border-[#13212A] bg-[#13212A] text-white dark:border-[#E1E9E6] dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                    : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#13212A] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#E1E9E6]'
                }`}
              >
                {!isPaused && speedSetting > 0 ? 'II 一時停止' : '＞ 自動再生'}
              </button>

              {/* 倍速切替ボタン群 */}
              <div className="inline-flex overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] dark:border-[#2A383D] dark:bg-[#1A2428]">
                {([0.5, 1, 2, 4, 8] as SpeedSetting[]).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      audioManager.playSe('click');
                      setSpeedSetting(spd);
                      setIsPaused(false);
                      setFastForwardToDecision(false);
                    }}
                    className={`px-2 py-1.5 font-mono text-xs font-semibold transition sm:px-2.5 ${
                      !isPaused && speedSetting === spd && !fastForwardToDecision
                        ? 'bg-[#0F6E68] text-white dark:bg-[#4CC0AF] dark:text-[#0D1316]'
                        : 'text-[#4A5A61] hover:text-[#13212A] dark:text-[#A3B2AF]'
                    }`}
                  >
                    {spd}×
                  </button>
                ))}
              </div>

              {/* 自分のペースで+1年送るボタン */}
              <button
                type="button"
                disabled={Boolean(gameState.pendingDecision)}
                onClick={handleStepOneYearManual}
                className="rounded-[4px] border border-[#0F6E68] bg-[#DCEDEA] px-2.5 py-1.5 text-xs font-bold text-[#0F6E68] transition hover:brightness-95 disabled:opacity-40 sm:px-3 dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]"
              >
                +1年送る ›
              </button>

              {/* 次の決断まで早送り */}
              <button
                type="button"
                disabled={Boolean(gameState.pendingDecision)}
                onClick={() => {
                  audioManager.playSe('click');
                  setIsPaused(false);
                  setFastForwardToDecision((f) => !f);
                }}
                className={`rounded-[4px] border px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
                  fastForwardToDecision
                    ? 'border-[#8C1D3C] bg-[#8C1D3C] text-white dark:border-[#E2678A] dark:bg-[#E2678A] dark:text-[#1B0910]'
                    : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#13212A] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#E1E9E6]'
                }`}
              >
                次の決断まで »
              </button>

              {/* おまかせモード */}
              <button
                type="button"
                onClick={() => setAutoResolveDecisions((a) => !a)}
                aria-pressed={autoResolveDecisions}
                className={`rounded-[4px] border px-2.5 py-1.5 text-xs font-semibold transition ${
                  autoResolveDecisions
                    ? 'border-[#9C7020] bg-[#F3E2B3] text-[#13212A]'
                    : 'border-[#C7D2CE] bg-transparent text-[#5F6E72] dark:border-[#2A383D] dark:text-[#8A9A96]'
                }`}
                title="決断イベントを自動選択して見守ります"
              >
                おまかせ {autoResolveDecisions ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() => setViewStage('intro')}
                className="rounded-[4px] border border-[#C7D2CE] px-2.5 py-1.5 text-xs text-[#5F6E72] hover:text-[#13212A] dark:border-[#2A383D] dark:text-[#8A9A96]"
              >
                最初から
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRerollCert}
                className="rounded-[4px] bg-[#8C1D3C] px-4 py-2 text-xs font-semibold text-white dark:bg-[#E2678A] dark:text-[#1B0910]"
              >
                別の世帯で新しく生きる
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpawnMode('custom');
                  setViewStage('intro');
                }}
                className="rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] px-4 py-2 text-xs font-semibold dark:border-[#2A383D] dark:bg-[#1A2428]"
              >
                条件を変えて検証する
              </button>
            </div>
          )}
        </div>

        {/* スマホ・タブレット向け：残債・手元資産・時価のミニステータス帯 ＆ 画面切替タブ */}
        <div className="mt-2.5 border-t border-[#DCE4E1] pt-2 lg:hidden dark:border-[#1D282C]">
          <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[11px]">
            <div className="rounded bg-[#F0F4F2] px-1.5 py-1 dark:bg-[#1A2428]">
              <span className="block text-[9px] text-[#5F6E72] dark:text-[#8A9A96]">手元資金</span>
              <b className="text-[#0F6E68] dark:text-[#4CC0AF]">
                {Math.round(gameState.liquidSavingsMan)}万
              </b>
            </div>
            <div className="rounded bg-[#F0F4F2] px-1.5 py-1 dark:bg-[#1A2428]">
              <span className="block text-[9px] text-[#5F6E72] dark:text-[#8A9A96]">ローン残債</span>
              <b className="text-[#B0362B] dark:text-[#F07B6B]">
                {Math.round(gameState.remainingBalanceMan)}万
              </b>
            </div>
            <div className="rounded bg-[#F0F4F2] px-1.5 py-1 dark:bg-[#1A2428]">
              <span className="block text-[9px] text-[#5F6E72] dark:text-[#8A9A96]">自宅時価</span>
              <b className="text-[#2B7A4E] dark:text-[#5CC38B]">
                {Math.round(gameState.propertyValueMan)}万
              </b>
            </div>
            <div className="rounded bg-[#F0F4F2] px-1.5 py-1 dark:bg-[#1A2428]">
              <span className="block text-[9px] text-[#5F6E72] dark:text-[#8A9A96]">適用金利</span>
              <b>{gameState.appliedInterestRate.toFixed(2)}%</b>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-4 overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED] text-[11px] font-semibold dark:border-[#2A383D] dark:bg-[#0D1316]">
            {(
              [
                { id: 'main', label: '暮らし・記録' },
                { id: 'charts', label: 'グラフ・地図' },
                { id: 'status', label: '状態・家族' },
                { id: 'all', label: 'すべて表示' },
              ] as const
            ).map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMobileTab(t.id)}
                className={`${i > 0 ? 'border-l border-[#C7D2CE] dark:border-[#2A383D]' : ''} py-1.5 text-center transition ${
                  mobileTab === t.id
                    ? 'bg-[#13212A] text-white dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                    : 'text-[#4A5A61] dark:text-[#A3B2AF]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================== */}
      {/* 結末到達時：一目でわかる「住宅ローン完済・人生回顧録シート」 (#dead/epilogue) */}
      {/* ========================================================================== */}
      {isFinished && gameState.ending && (
        <section className="overflow-hidden rounded-[4px] border-2 border-[#8C1D3C] bg-[#F7FAF8] shadow-xl dark:border-[#E2678A] dark:bg-[#141D21]">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#13212A] px-6 py-3 text-white dark:bg-[#1A2428]">
            <span className="font-mono text-xs tracking-widest text-[#D9AF59]">
              LIFE & MORTGAGE RECORD · 返済人生の最終結末と資産精算書
            </span>
            <span className="font-mono text-xs">
              最終到達年齢：{gameState.age}歳（返済{gameState.yearIndex}年間）
            </span>
          </div>

          <div className="p-6 sm:p-8">
            {/* 1. 結末ヘッドライン＆ランクスタンプ */}
            <div className="flex flex-col gap-6 border-b border-[#C7D2CE] pb-6 lg:flex-row lg:items-center lg:justify-between dark:border-[#2A383D]">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-[4px] border-2 font-mono ${
                    gameState.ending.rank === 'BANKRUPT'
                      ? 'border-[#B0362B] bg-[#B0362B]/10 text-[#B0362B] dark:border-[#F07B6B] dark:text-[#F07B6B]'
                      : 'border-[#0F6E68] bg-[#DCEDEA] text-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]'
                  }`}
                >
                  <span className="text-[10px] font-bold">最終判定</span>
                  <span className="text-2xl font-black">{gameState.ending.rank}</span>
                </div>
                <div>
                  <h2 className="font-editorial text-2xl font-bold sm:text-3xl">
                    {gameState.ending.title}
                  </h2>
                  <p className="mt-1 font-mono text-sm font-semibold text-[#8C1D3C] dark:text-[#E2678A]">
                    {gameState.ending.subtitle}
                  </p>
                  <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-[#4A5A61] dark:text-[#A3B2AF]">
                    {gameState.ending.epilogue}
                  </p>
                </div>
              </div>

              {/* 最終純資産サマリーボックス */}
              <div className="shrink-0 rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] p-4 text-right font-mono dark:border-[#2A383D] dark:bg-[#1A2428]">
                <div className="text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                  最終純資産（手元資金＋自宅時価−残債）
                </div>
                <div className="mt-1 text-3xl font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                  {Math.round(
                    gameState.liquidSavingsMan +
                      (gameState.status === 'sold-escaped' ? 0 : gameState.propertyValueMan) -
                      gameState.remainingBalanceMan -
                      gameState.unpaidInterestMan,
                  ).toLocaleString()}
                  万円
                </div>
                <div className="mt-1 text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
                  手元金融資産：{Math.round(gameState.liquidSavingsMan).toLocaleString()}万円 / 残債：
                  {Math.round(gameState.remainingBalanceMan).toLocaleString()}万円
                </div>
              </div>
            </div>

            {/* 2. 生涯で支払ったお金の視覚的内訳バー（元金 vs 利息 vs 維持費・税金 vs 減税還付） */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] p-5 lg:col-span-6 dark:border-[#2A383D] dark:bg-[#1A2428]">
                <h3 className="font-editorial text-base font-bold">
                  生涯でマイホームに支払った総額の内訳図
                </h3>
                <p className="mt-0.5 text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                  「物件価格」以外に、銀行利息や管理修繕費・固定資産税がどれだけかかったかの最終集計です。
                </p>

                {(() => {
                  const p = Math.round(gameState.totalPrincipalPaidMan);
                  const i = Math.round(gameState.totalInterestPaidMan);
                  const r = Math.round(gameState.totalRunningCostPaidMan);
                  const totalOut = Math.max(1, p + i + r);
                  return (
                    <div className="mt-4 space-y-3">
                      <div className="flex h-6 w-full overflow-hidden rounded-[2px] bg-[#DCE4E1] dark:bg-[#1D282C]">
                        <div
                          style={{ width: `${Math.round((p / totalOut) * 100)}%` }}
                          className="bg-[#2B7A4E]"
                          title={`元金返済累計 ${p.toLocaleString()}万円`}
                        />
                        <div
                          style={{ width: `${Math.round((i / totalOut) * 100)}%` }}
                          className="bg-[#B0362B]"
                          title={`銀行支払利息累計 ${i.toLocaleString()}万円`}
                        />
                        <div
                          style={{ width: `${Math.round((r / totalOut) * 100)}%` }}
                          className="bg-[#A8730F]"
                          title={`管理費・修繕積立・固定資産税累計 ${r.toLocaleString()}万円`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 font-mono text-xs sm:grid-cols-4">
                        <div className="rounded bg-[#F7FAF8] p-2.5 dark:bg-[#141D21]">
                          <span className="block text-[10px] text-[#5F6E72]">① 元金返済累計</span>
                          <b className="text-sm text-[#2B7A4E] dark:text-[#5CC38B]">
                            {p.toLocaleString()}万円
                          </b>
                        </div>
                        <div className="rounded bg-[#F7FAF8] p-2.5 dark:bg-[#141D21]">
                          <span className="block text-[10px] text-[#5F6E72]">② 銀行への総利息</span>
                          <b className="text-sm text-[#B0362B] dark:text-[#F07B6B]">
                            {i.toLocaleString()}万円
                          </b>
                        </div>
                        <div className="rounded bg-[#F7FAF8] p-2.5 dark:bg-[#141D21]">
                          <span className="block text-[10px] text-[#5F6E72]">③ 管理修繕・税金</span>
                          <b className="text-sm text-[#A8730F] dark:text-[#E2B04C]">
                            {r.toLocaleString()}万円
                          </b>
                        </div>
                        <div className="rounded bg-[#F7FAF8] p-2.5 dark:bg-[#141D21]">
                          <span className="block text-[10px] text-[#5F6E72]">④ 住宅ローン控除還付</span>
                          <b className="text-sm text-[#0F6E68] dark:text-[#4CC0AF]">
                            +{Math.round(gameState.totalTaxCreditReceivedMan).toLocaleString()}万円
                          </b>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 3. 勝因・敗因の自動診断カード */}
              <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] p-5 lg:col-span-6 dark:border-[#2A383D] dark:bg-[#1A2428]">
                <h3 className="font-editorial text-base font-bold">
                  なぜこの結果になったのか？（勝因・敗因の自動分析）
                </h3>
                <div className="mt-3 space-y-2.5">
                  {analyzeOutcomeFactors(gameState).map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 rounded bg-[#F7FAF8] p-3 text-xs dark:bg-[#141D21]"
                    >
                      <div>
                        <div className="font-bold">
                          <span
                            className={`mr-1.5 font-mono ${
                              f.type === 'positive'
                                ? 'text-[#2B7A4E] dark:text-[#5CC38B]'
                                : 'text-[#B0362B] dark:text-[#F07B6B]'
                            }`}
                          >
                            {f.type === 'positive' ? '◎' : '▲'}
                          </span>
                          {f.title}
                        </div>
                        <p className="mt-1 text-[11px] text-[#4A5A61] dark:text-[#A3B2AF]">
                          {f.detail}
                        </p>
                      </div>
                      <span className="shrink-0 rounded border border-[#C7D2CE] px-2 py-0.5 font-mono text-[11px] font-bold dark:border-[#2A383D]">
                        {f.impactLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================== */}
      {/* 重大決断モーダル（発生時は画面中央に1in8bスタイルの決断カードを提示） */}
      {/* ========================================================================== */}
      {gameState.pendingDecision && (
        <section className="rounded-[4px] border-2 border-[#8C1D3C] bg-[#F7FAF8] p-4 shadow-2xl sm:p-6 dark:border-[#E2678A] dark:bg-[#141D21]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C7D2CE] pb-3 dark:border-[#2A383D]">
            <span className="font-mono text-xs font-bold text-[#8C1D3C] dark:text-[#E2678A]">
              人生の転機 · 決断が待っています（{gameState.age}歳 · 返済{gameState.yearIndex}年目）
            </span>
            <span className="font-mono text-xs text-[#5F6E72] dark:text-[#8A9A96]">
              手元資金：{Math.round(gameState.liquidSavingsMan).toLocaleString()}万円 / 残債：
              {Math.round(gameState.remainingBalanceMan).toLocaleString()}万円
            </span>
          </div>

          <h3 className="font-editorial mt-3 text-xl font-bold sm:text-2xl">
            {gameState.pendingDecision.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#4A5A61] dark:text-[#A3B2AF]">
            {gameState.pendingDecision.description}
          </p>
          <p className="mt-2 border-l-2 border-[#0F6E68] pl-3 font-mono text-xs text-[#0F6E68] dark:border-[#4CC0AF] dark:text-[#4CC0AF]">
            統計データ背景：{gameState.pendingDecision.statisticalContext}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {gameState.pendingDecision.choices.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleSelectDecision(ch.id)}
                className="flex flex-col justify-between rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] p-4 text-left transition hover:border-[#8C1D3C] hover:bg-[#F3E3E8]/40 dark:border-[#2A383D] dark:bg-[#1A2428] dark:hover:border-[#E2678A]"
              >
                <div>
                  <div className="text-sm font-bold text-[#13212A] dark:text-[#E1E9E6]">
                    {ch.label}
                  </div>
                  <div className="mt-1 font-mono text-xs font-semibold text-[#8C1D3C] dark:text-[#E2678A]">
                    {ch.subLabel}
                  </div>
                  <p className="mt-2 text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
                    {ch.outcomeSummary}
                  </p>
                </div>
                <div className="mt-3 text-right font-mono text-xs font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                  この選択をする →
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================== */}
      {/* 1in8b.life/ja/ スタイルのメイン3カラムレイアウト (.wrap.life) */}
      {/* ========================================================================== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* ---------------------------------------------------------------------- */}
        {/* 左カラム (3列): 世帯IDカード・状態バー (0-100)・今年の収支内訳図・家族一覧 */}
        {/* ---------------------------------------------------------------------- */}
        <div
          className={`space-y-4 lg:col-span-3 ${
            mobileTab === 'status' || mobileTab === 'all' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* 1. 世帯IDカード (.idcard) */}
          <div className="overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
            <div className="flex items-center justify-between bg-[#F0F4F2] px-3.5 py-2 font-mono text-[11px] font-semibold text-[#4A5A61] dark:bg-[#1A2428] dark:text-[#A3B2AF]">
              <span>HOUSEHOLD ID · 登記識別票</span>
              <span>{BANKS[gameState.config.bankId].shortName}</span>
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-3">
                <FamilyPortraitSvg
                  age={gameState.age}
                  hasSpouse={gameState.subIncomeMan > 0 && !gameState.isDivorced}
                  childrenCount={gameState.childrenAges.length}
                  childrenAges={gameState.childrenAges}
                  mentalScore={gameState.mentalScore}
                  employment={gameState.config.employment}
                  status={gameState.status}
                  danshinTriggered={gameState.danshinTriggered}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{selectedArchetype.title}</div>
                  <div className="mt-0.5 text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
                    {PROPERTIES[gameState.config.propertyId].shortName}
                  </div>
                  <div className="mt-1 inline-block rounded bg-[#DCEDEA] px-2 py-0.5 font-mono text-[10px] font-bold text-[#0F6E68] dark:bg-[#12302D] dark:text-[#4CC0AF]">
                    {CONTRACT_LABELS[gameState.config.contractType]}
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-dashed border-[#C7D2CE] pt-2 font-mono text-[10px] tracking-wider text-[#5F6E72] dark:border-[#2A383D] dark:text-[#8A9A96]">
                ID&lt;&lt;JP{gameState.calendarYear}&lt;{gameState.config.termYears}YR&lt;&lt;
                {Math.round(gameState.remainingBalanceMan)}MAN
              </div>
            </div>
          </div>

          {/* 2. 状態 (0-100 メーターバー 4本) */}
          <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
            <div className="flex items-center justify-between border-b border-[#DCE4E1] pb-2 dark:border-[#1D282C]">
              <h3 className="text-sm font-bold">状態</h3>
              <span className="font-mono text-xs text-[#5F6E72] dark:text-[#8A9A96]">0–100</span>
            </div>
            <div className="mt-3 space-y-2.5 text-xs">
              {[
                { label: '家計余裕度', val: cashSafetyScore, color: 'bg-[#0F6E68] dark:bg-[#4CC0AF]' },
                { label: '純資産健全度', val: equityHealthScore, color: 'bg-[#2B7A4E] dark:bg-[#5CC38B]' },
                { label: '心身の健康', val: healthScore, color: 'bg-[#9C7020] dark:bg-[#D9AF59]' },
                { label: '家族の幸福', val: mentalScore, color: 'bg-[#8C1D3C] dark:bg-[#E2678A]' },
              ].map((st) => (
                <div key={st.label}>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>{st.label}</span>
                    <b>{st.val}</b>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-[1px] bg-[#DCE4E1] dark:bg-[#1D282C]">
                    <div style={{ width: `${st.val}%` }} className={`h-full ${st.color}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* 主要資産数値 */}
            <div className="mt-4 space-y-1.5 border-t border-[#DCE4E1] pt-3 font-mono text-xs dark:border-[#1D282C]">
              <div className="flex justify-between">
                <span className="text-[#4A5A61] dark:text-[#A3B2AF]">手元金融資産</span>
                <b
                  className={
                    gameState.liquidSavingsMan < 150
                      ? 'text-[#B0362B] dark:text-[#F07B6B]'
                      : 'text-[#0F6E68] dark:text-[#4CC0AF]'
                  }
                >
                  {Math.round(gameState.liquidSavingsMan).toLocaleString()}万円
                </b>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A5A61] dark:text-[#A3B2AF]">住宅ローン残債</span>
                <b className="text-[#B0362B] dark:text-[#F07B6B]">
                  {Math.round(gameState.remainingBalanceMan).toLocaleString()}万円
                </b>
              </div>
              {gameState.unpaidInterestMan > 0 && (
                <div className="flex justify-between text-[#B0362B] dark:text-[#F07B6B]">
                  <span>うち未払利息累積</span>
                  <b>+{gameState.unpaidInterestMan.toFixed(1)}万円</b>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#4A5A61] dark:text-[#A3B2AF]">自宅売却時価</span>
                <b className="text-[#2B7A4E] dark:text-[#5CC38B]">
                  {gameState.propertyValueMan.toLocaleString()}万円
                </b>
              </div>
            </div>
          </div>

          {/* 3. 今年の家計収支内訳図 */}
          <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
            <div className="mb-2.5 flex items-center justify-between border-b border-[#DCE4E1] pb-2 dark:border-[#1D282C]">
              <h3 className="text-sm font-bold">今年の収支内訳図</h3>
              <span className="font-mono text-[11px] text-[#5F6E72]">収入 vs 支出</span>
            </div>
            <AnnualCashFlowBreakdownDiagram state={gameState} />
          </div>

          {/* 4. 家族と暮らし (.p-fam) */}
          <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
            <h3 className="border-b border-[#DCE4E1] pb-2 text-sm font-bold dark:border-[#1D282C]">
              家族と暮らし
            </h3>
            <ul className="mt-2.5 space-y-2 text-xs">
              <li className="flex justify-between">
                <span>本人（{gameState.age}歳）</span>
                <span className="font-mono font-semibold">年収 {gameState.mainIncomeMan}万円</span>
              </li>
              {gameState.subIncomeMan > 0 && !gameState.isDivorced && (
                <li className="flex justify-between">
                  <span>配偶者（{Math.max(24, gameState.age - 1)}歳）</span>
                  <span className="font-mono font-semibold">年収 {gameState.subIncomeMan}万円</span>
                </li>
              )}
              {gameState.childrenAges.map((cAge, idx) => {
                const stage =
                  cAge < 6
                    ? '未就学・保育'
                    : cAge < 12
                      ? '小学生（ランドセル期）'
                      : cAge < 15
                        ? '中学生（部活・通塾）'
                        : cAge < 18
                          ? '高校生（受験期）'
                          : cAge < 22
                            ? '大学生（教育費ピーク）'
                            : '独立・社会人';
                return (
                  <li key={idx} className="flex justify-between text-[#4A5A61] dark:text-[#A3B2AF]">
                    <span>第{idx + 1}子（{cAge}歳）</span>
                    <span className="font-mono">{stage}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ---------------------------------------------------------------------- */}
        {/* 中央カラム (5列): マイホーム情景ジオラマ・今年の重点・物件別選択・人生の記録 */}
        {/* ---------------------------------------------------------------------- */}
        <div
          className={`space-y-4 lg:col-span-5 ${
            mobileTab === 'main' || mobileTab === 'all' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* 1. マイホームと暮らしの情景ジオラマパネル (.p-scene) */}
          <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-3.5 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
            <LifeScenePanoramaSvg state={gameState} recentBadge={recentBadge} />
            <p className="mt-2 text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
              {gameState.chronicle[0]?.title ?? 'マイホームでの新しい暮らしが始まりました。'}
            </p>
          </div>

          {/* 2. 今年の重点 ＆ お金を使う（繰上返済・借換・物件別アクション・売却）パネル (.p-focus) */}
          {!isFinished && (
            <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">今年の重点（家計スタイル）</h3>
                <span className="text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                  いつでも変えられます
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {Object.values(FOCUS_MODES).map((fm) => {
                  const active = currentFocus === fm.id;
                  return (
                    <button
                      key={fm.id}
                      type="button"
                      onClick={() => {
                        audioManager.playSe('click');
                        setGameState((prev) =>
                          prev ? setFocusMode(prev, fm.id as FocusModeId) : prev,
                        );
                        triggerVisualBadge(`方針変更：${fm.label}`);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        active
                          ? 'border-[#13212A] bg-[#13212A] text-white dark:border-[#E1E9E6] dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                          : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#4A5A61] hover:text-[#13212A] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                      }`}
                    >
                      {fm.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                {FOCUS_MODES[currentFocus].effectHint}
              </p>

              {/* マンション・タワマン vs 一戸建て で異なる物件固有の選択アクション */}
              <div className="mt-3.5 border-t border-[#DCE4E1] pt-3 dark:border-[#1D282C]">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-bold">
                    {isMansionOrTower
                      ? 'マンション・タワマン固有の選択（管理組合・駐車場）'
                      : '一戸建て固有の選択（屋根太陽光・自主修繕メンテ）'}
                  </span>
                  <span className="font-mono text-[10px] text-[#0F6E68] dark:text-[#4CC0AF]">
                    {currentProperty.shortName}専用
                  </span>
                </div>
                {isMansionOrTower ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={gameState.currentMgmtAndRepairMonthlyMan <= 2.2}
                      onClick={() => {
                        audioManager.playSe('stamp');
                        triggerVisualBadge('理事会改革：管理委託費見直し -0.6万/月');
                        setGameState((prev) =>
                          prev ? executePropertySpecificAction(prev, 'mansion-board-reform') : prev,
                        );
                      }}
                      className="rounded-[4px] border border-[#0F6E68]/60 bg-[#F0F4F2] px-2.5 py-2 text-left text-xs font-semibold transition hover:border-[#0F6E68] disabled:opacity-40 dark:border-[#4CC0AF]/50 dark:bg-[#1A2428]"
                    >
                      <div>管理組合の理事会改革・管理委託見直し</div>
                      <small className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">
                        相見積もりで管理費等 -0.6万/月・資産価値+80万
                      </small>
                    </button>
                    <button
                      type="button"
                      disabled={gameState.currentMgmtAndRepairMonthlyMan <= 2.0}
                      onClick={() => {
                        audioManager.playSe('coin');
                        triggerVisualBadge('機械式駐車場解約＋マイカー売却 +120万円');
                        setGameState((prev) =>
                          prev
                            ? executePropertySpecificAction(prev, 'mansion-release-parking')
                            : prev,
                        );
                      }}
                      className="rounded-[4px] border border-[#0F6E68]/60 bg-[#F0F4F2] px-2.5 py-2 text-left text-xs font-semibold transition hover:border-[#0F6E68] disabled:opacity-40 dark:border-[#4CC0AF]/50 dark:bg-[#1A2428]"
                    >
                      <div>マイカー手放し・機械式駐車場解約</div>
                      <small className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">
                        売却益+120万・駐車場＆維持費 -0.8万/月
                      </small>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={
                        gameState.liquidSavingsMan < 180 ||
                        gameState.currentMgmtAndRepairMonthlyMan <= 0.6
                      }
                      onClick={() => {
                        audioManager.playSe('stamp');
                        triggerVisualBadge('屋根太陽光＋蓄電池設置 -140万円');
                        setGameState((prev) =>
                          prev
                            ? executePropertySpecificAction(prev, 'detached-solar-battery')
                            : prev,
                        );
                      }}
                      className="rounded-[4px] border border-[#0F6E68]/60 bg-[#F0F4F2] px-2.5 py-2 text-left text-xs font-semibold transition hover:border-[#0F6E68] disabled:opacity-40 dark:border-[#4CC0AF]/50 dark:bg-[#1A2428]"
                    >
                      <div>屋根太陽光＋蓄電池の後付け設置（-140万）</div>
                      <small className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">
                        戸建て特権で光熱・修繕積立負担 -0.9万/月・価値+110万
                      </small>
                    </button>
                    <button
                      type="button"
                      disabled={gameState.liquidSavingsMan < 60}
                      onClick={() => {
                        audioManager.playSe('stamp');
                        triggerVisualBadge('自主防蟻・外壁コーキング補修 -35万円');
                        setGameState((prev) =>
                          prev ? executePropertySpecificAction(prev, 'detached-diy-maint') : prev,
                        );
                      }}
                      className="rounded-[4px] border border-[#0F6E68]/60 bg-[#F0F4F2] px-2.5 py-2 text-left text-xs font-semibold transition hover:border-[#0F6E68] disabled:opacity-40 dark:border-[#4CC0AF]/50 dark:bg-[#1A2428]"
                    >
                      <div>自主防蟻・外壁コーキング予防メンテ（-35万）</div>
                      <small className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">
                        躯体劣化を防ぎ建物評価額+75万・維持費抑制
                      </small>
                    </button>
                  </div>
                )}
              </div>

              {/* いつでも実行できる繰上返済・借換・売却ボタン */}
              <div className="mt-3.5 border-t border-[#DCE4E1] pt-3 dark:border-[#1D282C]">
                <div className="mb-2 text-xs font-bold">お金を使う · 住宅ローン防衛手続き</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={gameState.liquidSavingsMan < 250 || gameState.remainingBalanceMan <= 0}
                    onClick={() => {
                      audioManager.playSe('coin');
                      triggerVisualBadge('期間短縮繰上返済 -200万円');
                      setGameState((prev) =>
                        prev ? executePrepayment(prev, 200, 'shorten-term') : prev,
                      );
                    }}
                    className="rounded-[4px] border border-[#0F6E68] bg-[#DCEDEA]/60 px-2.5 py-2 text-left text-xs font-semibold text-[#0F6E68] transition hover:bg-[#DCEDEA] disabled:opacity-40 dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]"
                  >
                    <div>200万円 繰上返済（期間短縮）</div>
                    <small className="block text-[10px] opacity-80">元金を直接削り完済年齢を短縮</small>
                  </button>
                  <button
                    type="button"
                    disabled={gameState.liquidSavingsMan < 250 || gameState.remainingBalanceMan <= 0}
                    onClick={() => {
                      audioManager.playSe('coin');
                      triggerVisualBadge('返済額軽減繰上返済 -200万円');
                      setGameState((prev) =>
                        prev ? executePrepayment(prev, 200, 'reduce-payment') : prev,
                      );
                    }}
                    className="rounded-[4px] border border-[#0F6E68] bg-[#DCEDEA]/60 px-2.5 py-2 text-left text-xs font-semibold text-[#0F6E68] transition hover:bg-[#DCEDEA] disabled:opacity-40 dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]"
                  >
                    <div>200万円 繰上返済（月返済軽減）</div>
                    <small className="block text-[10px] opacity-80">毎月の返済引き落とし額を圧縮</small>
                  </button>
                  <button
                    type="button"
                    disabled={
                      gameState.currentRateType === 'flat-35' ||
                      gameState.liquidSavingsMan < 180 ||
                      gameState.remainingBalanceMan <= 300
                    }
                    onClick={() => {
                      audioManager.playSe('stamp');
                      triggerVisualBadge('全期間固定金利へ借り換え実行');
                      setGameState((prev) => (prev ? executeRefinance(prev, 'to-fixed') : prev));
                    }}
                    className="rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] px-2.5 py-2 text-left text-xs font-semibold transition hover:border-[#13212A] disabled:opacity-40 dark:border-[#2A383D] dark:bg-[#1A2428]"
                  >
                    <div>全期間固定金利へ借り換え</div>
                    <small className="block text-[10px] text-[#5F6E72]">今後の利上げリスクを完全遮断</small>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playSe('stamp');
                      setGameState((prev) => (prev ? executeSellProperty(prev) : prev));
                    }}
                    className="rounded-[4px] border border-[#8C1D3C]/60 bg-[#F3E3E8]/40 px-2.5 py-2 text-left text-xs font-semibold text-[#8C1D3C] transition hover:bg-[#F3E3E8] dark:border-[#E2678A]/60 dark:bg-[#3A1C26]/40 dark:text-[#E2678A]"
                  >
                    <div>自宅を時価（{gameState.propertyValueMan}万）で売却精算</div>
                    <small className="block text-[10px] opacity-80">ローンを一括精算し賃貸へ移る</small>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. 人生の記録フィード (.p-feed) */}
          <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
            <div className="flex items-center justify-between border-b border-[#DCE4E1] pb-2 dark:border-[#1D282C]">
              <h3 className="text-sm font-bold">人生の記録</h3>
              <span className="text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                新しい順 · 行をタップで★保存
              </span>
            </div>
            <ul className="mt-3 max-h-[440px] space-y-2.5 overflow-y-auto pr-1">
              {gameState.chronicle.map((entry) => {
                const isStarred = starredEntryIds.includes(entry.id);
                const borderColor =
                  entry.tone === 'good'
                    ? 'border-l-[#2B7A4E]'
                    : entry.tone === 'bad'
                      ? 'border-l-[#B0362B]'
                      : 'border-l-[#C7D2CE] dark:border-l-[#2A383D]';
                return (
                  <li
                    key={entry.id}
                    onClick={() => toggleStarEntry(entry.id)}
                    className={`cursor-pointer border-l-3 ${borderColor} rounded-r bg-[#F0F4F2]/70 pl-3 pr-2.5 py-2 text-xs transition hover:bg-[#F0F4F2] dark:bg-[#1A2428]/70 dark:hover:bg-[#1A2428]`}
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                      <span>
                        {entry.age}歳 · 返済{entry.yearIndex}年目（{entry.calendarYear}年）
                      </span>
                      <div className="flex items-center gap-2">
                        {entry.financialDeltaLabel && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              entry.tone === 'good'
                                ? 'bg-[#DCEDEA] text-[#0F6E68] dark:bg-[#12302D] dark:text-[#4CC0AF]'
                                : 'bg-[#F3E3E8] text-[#8C1D3C] dark:bg-[#3A1C26] dark:text-[#E2678A]'
                            }`}
                          >
                            {entry.financialDeltaLabel}
                          </span>
                        )}
                        <span className="text-sm text-[#D9AF59]">{isStarred ? '★' : '☆'}</span>
                      </div>
                    </div>
                    <div className="mt-1 font-bold text-[#13212A] dark:text-[#E1E9E6]">
                      {entry.title}
                    </div>
                    <p className="mt-0.5 leading-relaxed text-[#4A5A61] dark:text-[#A3B2AF]">
                      {entry.body}
                    </p>
                    {entry.statNote && (
                      <p className="mt-1 font-mono text-[10px] text-[#0F6E68] dark:text-[#4CC0AF]">
                        統計補足：{entry.statNote}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ---------------------------------------------------------------------- */}
        {/* 右カラム (4列): 人生地図 (1マス=1年)・3種切替グラフ・同じ日に鍵を受け取った4世帯 */}
        {/* ---------------------------------------------------------------------- */}
        <div
          className={`space-y-4 lg:col-span-4 ${
            mobileTab === 'charts' || mobileTab === 'all' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* 1. 人生地図 (1マス = 1年) (.p-grid) */}
          <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
            <div className="mb-2.5 flex items-center justify-between border-b border-[#DCE4E1] pb-2 dark:border-[#1D282C]">
              <h3 className="text-sm font-bold">人生地図</h3>
              <span className="font-mono text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                1マス = 1年（数字は年齢・タップで詳細）
              </span>
            </div>
            <LifeMapGrid
              history={gameState.history}
              termYears={gameState.config.termYears}
              startAge={gameState.config.age}
            />
          </div>

          {/* 2. マルチ視点グラフ＆図解 (.p-chart) */}
          <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
            <div className="mb-2.5 flex items-center justify-between border-b border-[#DCE4E1] pb-2 dark:border-[#1D282C]">
              <h3 className="text-sm font-bold">推移グラフ・統計曲線</h3>
              <span className="font-mono text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                3視点切替
              </span>
            </div>
            <MultiPerspectiveCharts state={gameState} />
          </div>

          {/* 3. 同じ日に鍵を受け取った4世帯 (.p-comps) */}
          <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-sm dark:border-[#2A383D] dark:bg-[#141D21]">
            <div className="mb-2.5 flex items-center justify-between border-b border-[#DCE4E1] pb-2 dark:border-[#1D282C]">
              <h3 className="text-sm font-bold">同じ日に鍵を受け取った人たち</h3>
              <span className="font-mono text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                同じ経済情勢下で進行中
              </span>
            </div>
            <ul className="space-y-2.5 text-xs">
              {(gameState.companions ?? []).map((comp) => (
                <li
                  key={comp.id}
                  className="rounded border border-[#DCE4E1] bg-[#F0F4F2] p-2.5 dark:border-[#1D282C] dark:bg-[#1A2428]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {comp.familyName} · いま{comp.age}歳
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                        comp.status === 'paid-off'
                          ? 'bg-[#DCEDEA] text-[#0F6E68]'
                          : comp.status === 'bankrupt'
                            ? 'bg-[#F3E3E8] text-[#8C1D3C]'
                            : 'bg-[#DCE4E1] text-[#4A5A61] dark:bg-[#2A383D] dark:text-[#A3B2AF]'
                      }`}
                    >
                      {comp.status === 'paid-off'
                        ? '完済'
                        : comp.status === 'bankrupt'
                          ? '破綻'
                          : comp.status === 'sold'
                            ? '売却'
                            : '返済中'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                    {comp.propertyShort} / {comp.loanSetupLabel}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[11px]">
                    <span>残債 {comp.remainingBalanceMan.toLocaleString()}万</span>
                    <span>貯蓄 {comp.liquidSavingsMan.toLocaleString()}万</span>
                    <span className="text-[#0F6E68] dark:text-[#4CC0AF]">{comp.statusText}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* スマホ向け：親指で片手操作できる下部固定ペースバー */}
      {!isFinished && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#C7D2CE] bg-[#F7FAF8]/95 px-3 py-2 shadow-lg backdrop-blur lg:hidden dark:border-[#2A383D] dark:bg-[#141D21]/95">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                audioManager.playSe('click');
                if (speedSetting === 0) setSpeedSetting(1);
                setIsPaused((p) => !p);
                setFastForwardToDecision(false);
              }}
              className={`rounded-[4px] border px-3 py-2 text-xs font-bold ${
                !isPaused && speedSetting > 0
                  ? 'border-[#13212A] bg-[#13212A] text-white dark:border-[#E1E9E6] dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                  : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#13212A] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#E1E9E6]'
              }`}
            >
              {!isPaused && speedSetting > 0 ? 'II 停止' : '＞ 再生'}
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.playSe('click');
                const cycle: SpeedSetting[] = [1, 2, 4, 8, 0.5];
                const nextSpd = cycle[(cycle.indexOf(speedSetting) + 1) % cycle.length] ?? 1;
                setSpeedSetting(nextSpd);
                setIsPaused(false);
              }}
              className="rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] px-2.5 py-2 font-mono text-xs font-bold dark:border-[#2A383D] dark:bg-[#1A2428]"
            >
              速度 {speedSetting === 0 ? '手動' : `${speedSetting}×`}
            </button>

            <button
              type="button"
              disabled={Boolean(gameState.pendingDecision)}
              onClick={handleStepOneYearManual}
              className="flex-1 rounded-[4px] bg-[#0F6E68] py-2 text-center text-xs font-bold text-white shadow disabled:opacity-40 dark:bg-[#4CC0AF] dark:text-[#0D1316]"
            >
              +1年送る（{gameState.age + 1}歳へ） ›
            </button>

            <button
              type="button"
              disabled={Boolean(gameState.pendingDecision)}
              onClick={() => {
                audioManager.playSe('click');
                setIsPaused(false);
                setFastForwardToDecision((f) => !f);
              }}
              className={`rounded-[4px] border px-2.5 py-2 text-xs font-bold ${
                fastForwardToDecision
                  ? 'border-[#8C1D3C] bg-[#8C1D3C] text-white'
                  : 'border-[#C7D2CE] bg-[#F0F4F2] dark:border-[#2A383D] dark:bg-[#1A2428]'
              }`}
            >
              次へ »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
