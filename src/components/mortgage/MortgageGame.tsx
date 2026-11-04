"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ARCHETYPES,
  BANKS,
  CRAM_SCHOOL_SPECS,
  DANSHIN_PLANS,
  EMPLOYMENT_LABELS,
  FAMILY_PLANS,
  FOCUS_MODES,
  HIGHER_ED_SPECS,
  INSURANCE_PLAN_SPECS,
  JUNIOR_HIGH_SPECS,
  LEISURE_STYLE_SPECS,
  MACRO_REGIMES,
  POST_RETIREMENT_SPECS,
  PROPERTIES,
  SALARY_CURVE_SPECS,
  SCHOLARSHIP_SPECS,
  SPOUSE_WORK_SPECS,
  advanceOneYear,
  analyzeOutcomeFactors,
  calcAnnualHealthRiskProbabilities,
  calcDynamicFamilyComposition,
  createMortgageGame,
  executeMidTermRateHike,
  executePrepayment,
  executePropertySpecificAction,
  executeRefinance,
  executeRelocateProperty,
  executeSellProperty,
  formatConsistentHouseholdTitle,
  formatSetupProfileSummary,
  generateCertShareText,
  generateRandomHouseholdSetup,
  generateViralXShareText,
  getChildIndependenceAge,
  getDefaultRetirementAllowanceMan,
  parseShareChallengeParams,
  randomizeBankLoanParams,
  randomizeHouseholdParams,
  randomizePropertyParams,
  resolveEffectiveBank,
  resolveEffectiveDanshin,
  resolveEffectiveHouseholdCareerAndEdu,
  resolveEffectiveProperty,
  resolveMortgageDecision,
  runBankUnderwriting,
  setFocusMode,
  setPostRetirementWorkThisYear,
  setSpouseWorkStyleThisYear,
} from '@/lib/mortgage-logic';
import {
  BankId,
  ContractType,
  CramSchoolPolicyType,
  DanshinType,
  EmploymentType,
  EnergyCertType,
  FamilyPlanType,
  FireEarthquakeInsuranceType,
  FocusModeId,
  HigherEdPathType,
  JuniorHighPathType,
  LeisureStyleType,
  LoanTermYears,
  MacroRegimeId,
  MortgageGameState,
  MortgageSetupConfig,
  PostRetirementWorkType,
  PropertyCategory,
  RateType,
  RepaymentMethod,
  SalaryCurveType,
  ScholarshipType,
  SpouseWorkPatternType,
} from '@/types/mortgage';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';
import { audioManager } from '@/utils/audio';
import {
  AnnualCashFlowBreakdownDiagram,
  FamilyPortraitSvg,
  JapanMortgageMapIllustration,
  LifeMapGrid,
  LifeScenePanoramaSvg,
  LoanStructureVisualSvg,
  MultiPerspectiveCharts,
  PropertyArchitecturalIllustration,
} from './MortgageVisuals';

type SpeedSetting = 0 | 0.5 | 1 | 2 | 4 | 8;

const ENERGY_CERT_LABELS: Record<EnergyCertType, string> = {
  'long-term-excellent': '長期優良住宅（控除最大・固定資産税5年軽減）',
  zeh: 'ZEH水準省エネ住宅（控除優遇）',
  standard: '一般省エネ基準適合',
  'non-compliant': '旧省エネ基準（新築は住宅ローン控除0円）',
};

const RATE_TYPE_LABELS: Record<RateType, string> = {
  variable: '変動金利（日銀利上げに連動）',
  'fixed-10': '当初10年固定金利（11年目から変動）',
  'flat-35': '全期間固定金利（完済まで金利不変）',
  mix: 'ミックス返済（変動50%＋固定50%）',
};

const CONTRACT_LABELS: Record<ContractType, string> = {
  single: '単独ローン（1馬力契約）',
  pair: 'ペアローン（夫婦2本契約・W控除）',
  'income-merge': '収入合算（連帯保証・1本契約）',
};

const REPAYMENT_LABELS: Record<RepaymentMethod, string> = {
  'equal-payment': '元利均等返済（毎月一定額・初期は利息多め）',
  'equal-principal': '元金均等返済（元金を定額返済・総利息が少ない）',
};

function XLogoIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function clipCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) {
    s = s.slice(0, -1);
  }
  return `${s}…`;
}

function renderMortgageResultShareCardDataUrl(state: MortgageGameState): string {
  if (typeof document === 'undefined' || !state.ending) return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const prop = resolveEffectiveProperty(state.config);
  const bank = resolveEffectiveBank(state.config);
  const careerEdu = resolveEffectiveHouseholdCareerAndEdu(state.config);
  const famComp = calcDynamicFamilyComposition(state);
  const ending = state.ending;

  const netWorthMan = Math.round(
    state.liquidSavingsMan +
      (state.status === 'sold-escaped' ? 0 : state.propertyValueMan) -
      state.remainingBalanceMan -
      state.unpaidInterestMan,
  );
  const netWorthSign = netWorthMan >= 0 ? '+' : '';
  const pPaid = Math.round(state.totalPrincipalPaidMan);
  const iPaid = Math.round(state.totalInterestPaidMan);
  const rPaid = Math.round(state.totalRunningCostPaidMan);
  const taxBack = Math.round(state.totalTaxCreditReceivedMan);
  const totalOutflow = pPaid + iPaid + rPaid;
  const extraOverPrice = iPaid + rPaid;
  const initialGross = state.config.mainIncomeMan + careerEdu.initialSubIncomeMan;

  // 背景紙面 (#F7FAF8)
  ctx.fillStyle = '#F7FAF8';
  ctx.fillRect(0, 0, 1200, 630);

  // 外枠二重線（公文書・精算書風）
  ctx.strokeStyle = '#C7D2CE';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 1176, 606);

  // 1. ヘッダー帯 (#13212A)
  ctx.fillStyle = '#13212A';
  ctx.fillRect(12, 12, 1176, 48);

  ctx.fillStyle = '#D9AF59';
  ctx.font = 'bold 14px monospace, sans-serif';
  ctx.fillText(
    'LIFE & MORTGAGE OFFICIAL SETTLEMENT CARD  ·  マイホーム完済記 公式最終精算認定証',
    32,
    41,
  );

  ctx.fillStyle = '#E1E9E6';
  ctx.textAlign = 'right';
  ctx.font = '13px monospace, sans-serif';
  ctx.fillText(
    `証書 JP-${state.config.age}0${state.config.termYears}-${state.underwriting.loanPrincipalMan}  |  zatsudan-gacha.app/mortgage-life`,
    1168,
    41,
  );
  ctx.textAlign = 'left';

  // アクセントライン
  ctx.fillStyle = ending.rank === 'BANKRUPT' ? '#B0362B' : '#0F6E68';
  ctx.fillRect(12, 60, 1176, 4);

  // 2. ヒーロー判定セクション (y: 78..226)
  const isBankrupt = ending.rank === 'BANKRUPT';
  const stampX = 32;
  const stampY = 78;
  const stampW = 142;
  const stampH = 142;

  drawRoundedBox(ctx, stampX, stampY, stampW, stampH, 6);
  ctx.fillStyle = isBankrupt ? '#F9E8E6' : '#DCEDEA';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = isBankrupt ? '#B0362B' : '#0F6E68';
  ctx.stroke();

  drawRoundedBox(ctx, stampX + 6, stampY + 6, stampW - 12, stampH - 12, 4);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = isBankrupt ? '#B0362B' : '#0F6E68';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px monospace, sans-serif';
  ctx.fillText('最終判定 RANK', stampX + stampW / 2, stampY + 28);

  ctx.font = isBankrupt ? '900 38px sans-serif' : '900 58px monospace, sans-serif';
  ctx.fillText(isBankrupt ? '破綻' : ending.rank, stampX + stampW / 2, stampY + 88);

  ctx.font = 'bold 12px monospace, sans-serif';
  ctx.fillText(
    `${state.age}歳到達 (${state.yearIndex}年)`,
    stampX + stampW / 2,
    stampY + 122,
  );
  ctx.textAlign = 'left';

  // 中央：世帯・物件タグ＆結末タイトル
  const midX = 192;
  const bTypeLabel =
    prop.buildingType === 'tower'
      ? 'タワマン'
      : prop.buildingType === 'mansion'
        ? 'マンション'
        : '一戸建て';
  const newUsed = prop.isNew ? '新築' : `中古築${prop.builtAge}年`;
  const rateShort =
    bank.rateType === 'variable'
      ? '変動'
      : bank.rateType === 'fixed-10'
        ? '10年固定'
        : bank.rateType === 'flat-35'
          ? '全期間固定'
          : `ミックス(固定${state.config.mixFixedRatioPercent ?? 50}%)`;

  ctx.fillStyle = '#0F6E68';
  ctx.font = 'bold 14px sans-serif';
  const profileLine = `${state.config.age}歳購入・世帯年収${initialGross.toLocaleString()}万（貯蓄${state.config.initialSavingsMan.toLocaleString()}万） / ${newUsed}${bTypeLabel} ${prop.priceMan.toLocaleString()}万円`;
  ctx.fillText(clipCanvasText(ctx, profileLine, 610), midX, 98);

  ctx.fillStyle = '#13212A';
  ctx.font = 'bold 28px serif, sans-serif';
  ctx.fillText(clipCanvasText(ctx, ending.title, 610), midX, 136);

  ctx.fillStyle = '#8C1D3C';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(clipCanvasText(ctx, ending.subtitle, 610), midX, 164);

  ctx.fillStyle = '#4A5A61';
  ctx.font = '13px sans-serif';
  ctx.fillText(clipCanvasText(ctx, ending.epilogue, 610), midX, 190);

  ctx.fillStyle = '#5F6E72';
  ctx.font = 'bold 12px monospace, sans-serif';
  const loanSpecLine = `借入 ${state.underwriting.loanPrincipalMan.toLocaleString()}万 (${state.config.termYears}年・${rateShort}・現在金利${state.appliedInterestRate.toFixed(2)}%)  |  家族：${famComp.compositionLabel}`;
  ctx.fillText(clipCanvasText(ctx, loanSpecLine, 610), midX, 214);

  // 右：最終純資産ボックス (x: 820..1168, y: 78..220)
  drawRoundedBox(ctx, 820, 78, 348, 142, 6);
  ctx.fillStyle = '#F0F4F2';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = netWorthMan >= 0 ? '#0F6E68' : '#B0362B';
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#5F6E72';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('最終純資産（手元資金＋自宅時価−残債）', 1150, 104);

  ctx.fillStyle = netWorthMan >= 0 ? '#0F6E68' : '#B0362B';
  ctx.font = '900 40px monospace, sans-serif';
  ctx.fillText(`${netWorthSign}${netWorthMan.toLocaleString()}万円`, 1150, 152);

  ctx.fillStyle = '#13212A';
  ctx.font = 'bold 13px monospace, sans-serif';
  ctx.fillText(
    `手元資金 ${Math.round(state.liquidSavingsMan).toLocaleString()}万 / 自宅時価 ${state.status === 'sold-escaped' ? 0 : Math.round(state.propertyValueMan).toLocaleString()}万`,
    1150,
    182,
  );
  ctx.fillStyle = '#8C1D3C';
  ctx.fillText(
    `最終残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円（団信：${state.danshinTriggered ? '発動免除済' : '未発動'}）`,
    1150,
    204,
  );
  ctx.textAlign = 'left';

  // 3. 4ボックス精算グリッド (y: 236..356)
  const boxes = [
    {
      label: '① 物件購入価格 / 借入元本',
      main: `${prop.priceMan.toLocaleString()}万円`,
      sub: `借入 ${state.underwriting.loanPrincipalMan.toLocaleString()}万 / 頭金 ${state.config.downPaymentMan.toLocaleString()}万`,
      color: '#13212A',
    },
    {
      label: '② 銀行へ支払った総利息',
      main: `${iPaid.toLocaleString()}万円`,
      sub: `元金返済累計 ${pPaid.toLocaleString()}万円`,
      color: '#B0362B',
    },
    {
      label: '③ 管理修繕・固定資産税・保険累計',
      main: `${rPaid.toLocaleString()}万円`,
      sub: `住宅ローン控除還付 +${taxBack.toLocaleString()}万円`,
      color: '#A8730F',
    },
    {
      label: '④ 住居に払った生涯総額（①+②+③）',
      main: `${totalOutflow.toLocaleString()}万円`,
      sub: `物件価格＋利息・維持費税金 ${extraOverPrice.toLocaleString()}万円`,
      color: '#8C1D3C',
    },
  ];

  boxes.forEach((b, idx) => {
    const bx = 32 + idx * 286;
    const by = 236;
    const bw = 274;
    const bh = 112;
    drawRoundedBox(ctx, bx, by, bw, bh, 5);
    ctx.fillStyle = '#EBF0ED';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#C7D2CE';
    ctx.stroke();

    ctx.fillStyle = '#4A5A61';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(b.label, bx + 14, by + 26);

    ctx.fillStyle = b.color;
    ctx.font = '900 28px monospace, sans-serif';
    ctx.fillText(b.main, bx + 14, by + 66);

    ctx.fillStyle = '#5F6E72';
    ctx.font = 'bold 12px monospace, sans-serif';
    ctx.fillText(clipCanvasText(ctx, b.sub, bw - 24), bx + 14, by + 94);
  });

  // 4. 生涯住居コスト比率スタックバー (y: 364..414)
  const barX = 32;
  const barY = 366;
  const barW = 1136;
  const barH = 22;
  const safeTotal = Math.max(1, totalOutflow);
  const pW = Math.round((pPaid / safeTotal) * barW);
  const iW = Math.round((iPaid / safeTotal) * barW);
  const rW = Math.max(0, barW - pW - iW);

  ctx.fillStyle = '#2B7A4E';
  ctx.fillRect(barX, barY, pW, barH);
  ctx.fillStyle = '#B0362B';
  ctx.fillRect(barX + pW, barY, iW, barH);
  ctx.fillStyle = '#A8730F';
  ctx.fillRect(barX + pW + iW, barY, rW, barH);

  ctx.font = 'bold 12px monospace, sans-serif';
  ctx.fillStyle = '#2B7A4E';
  ctx.fillText(
    `■ 元金返済 ${pPaid.toLocaleString()}万 (${Math.round((pPaid / safeTotal) * 100)}%)`,
    32,
    408,
  );
  ctx.fillStyle = '#B0362B';
  ctx.fillText(
    `■ 銀行支払利息 ${iPaid.toLocaleString()}万 (${Math.round((iPaid / safeTotal) * 100)}%)`,
    410,
    408,
  );
  ctx.fillStyle = '#A8730F';
  ctx.fillText(
    `■ 管理修繕・固定資産税・保険 ${rPaid.toLocaleString()}万 (${Math.round((rPaid / safeTotal) * 100)}%)`,
    800,
    408,
  );

  // 5. 下段2カラム：人生の転機ハイライト ＆ 勝因・敗因診断 (y: 424..566)
  drawRoundedBox(ctx, 32, 424, 616, 142, 5);
  ctx.fillStyle = '#F0F4F2';
  ctx.fill();
  ctx.strokeStyle = '#C7D2CE';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#13212A';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('■ この返済人生の主な転機・年代記ハイライト', 48, 448);

  const highlights = state.chronicle
    .filter(
      (c) =>
        c.yearIndex > 0 &&
        (c.category === 'action' ||
          c.category === 'danshin' ||
          c.category === 'milestone' ||
          c.category === 'crisis'),
    )
    .slice(0, 3);

  if (highlights.length === 0) {
    ctx.fillStyle = '#4A5A61';
    ctx.font = '13px sans-serif';
    ctx.fillText(
      `・${state.config.age}歳から${state.age}歳まで${state.yearIndex}年間、マイホームと家計を守り抜いた記録`,
      48,
      478,
    );
  } else {
    highlights.forEach((h, idx) => {
      const hy = 476 + idx * 28;
      ctx.fillStyle = h.tone === 'bad' ? '#B0362B' : '#0F6E68';
      ctx.font = 'bold 12px monospace, sans-serif';
      ctx.fillText(`${h.age}歳(${h.yearIndex}年目)`, 48, hy);

      ctx.fillStyle = '#13212A';
      ctx.font = 'bold 13px sans-serif';
      const cleanTitle = h.title.replace(/^【決断】/, '');
      ctx.fillText(clipCanvasText(ctx, cleanTitle, 500), 152, hy);
    });
  }

  // 右下：勝因・敗因の自動分析
  drawRoundedBox(ctx, 664, 424, 504, 142, 5);
  ctx.fillStyle = '#F0F4F2';
  ctx.fill();
  ctx.strokeStyle = '#C7D2CE';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#13212A';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('■ 勝因・敗因の自動分析レポート', 680, 448);

  const factors = analyzeOutcomeFactors(state).slice(0, 3);
  factors.forEach((f, idx) => {
    const fy = 476 + idx * 28;
    ctx.fillStyle = f.type === 'positive' ? '#2B7A4E' : '#B0362B';
    ctx.font = 'bold 13px sans-serif';
    const prefix = f.type === 'positive' ? '◎' : '▲';
    ctx.fillText(
      clipCanvasText(ctx, `${prefix} ${f.title}（${f.impactLabel}）`, 472),
      680,
      fy,
    );
  });

  // 6. フッター帯 (y: 576..618)
  ctx.fillStyle = '#EBF0ED';
  ctx.fillRect(14, 576, 1172, 40);
  ctx.fillStyle = '#0F6E68';
  ctx.font = 'bold 13px monospace, sans-serif';
  ctx.fillText(
    '#マイホーム完済記  #住宅ローンシミュレーション  — 35年・50年ローンの家計と暮らし',
    32,
    601,
  );
  ctx.fillStyle = '#8C1D3C';
  ctx.textAlign = 'right';
  ctx.fillText('同じ世帯・物件条件での挑戦は zatsudan-gacha.app/mortgage-life', 1168, 601);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

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

  // 画面フェーズ: 'intro' (トップ) -> 'rolling' (抽選中) -> 'cert' (契約証書) -> 'life' (本編・結末)
  const [viewStage, setViewStage] = useState<'intro' | 'rolling' | 'cert' | 'life'>('intro');
  const [spawnMode, setSpawnMode] = useState<'random' | 'custom'>('custom');
  const [setupStepTab, setSetupStepTab] = useState<'step1' | 'step2' | 'step3' | 'all'>('all');
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

  // X（旧Twitter）シェア機能用ステート
  const [shareCardDataUrl, setShareCardDataUrl] = useState<string>('');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [sharedChallengeBanner, setSharedChallengeBanner] = useState<string | null>(null);

  // URLクエリパラメータから「同じ条件で挑戦する」設定を自動復元
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parsed = parseShareChallengeParams(window.location.search, setupConfig);
    if (parsed) {
      setSetupConfig(parsed);
      setSpawnMode('custom');
      setSharedChallengeBanner(formatSetupProfileSummary(parsed));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 結末到達時に1200×630の公式精算認定証カード画像を自動生成
  useEffect(() => {
    if (gameState && gameState.status !== 'playing' && gameState.ending) {
      const dataUrl = renderMortgageResultShareCardDataUrl(gameState);
      setShareCardDataUrl(dataUrl);
    }
  }, [gameState]);

  const showTempShareFeedback = useCallback((msg: string) => {
    setShareFeedback(msg);
    window.setTimeout(() => {
      setShareFeedback((cur) => (cur === msg ? null : cur));
    }, 3200);
  }, []);

  const handleOpenXIntent = useCallback((intentUrl: string) => {
    audioManager.playSe('click');
    if (typeof window !== 'undefined') {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleCopyShareText = useCallback(
    async (fullText: string, label = 'シェア文面と挑戦URLをコピーしました！') => {
      audioManager.playSe('click');
      try {
        await navigator.clipboard.writeText(fullText);
        showTempShareFeedback(label);
      } catch {
        showTempShareFeedback('クリップボードへのコピーに失敗しました');
      }
    },
    [showTempShareFeedback],
  );

  const handleDownloadShareCard = useCallback(() => {
    if (!shareCardDataUrl || !gameState) return;
    audioManager.playSe('stamp');
    const a = document.createElement('a');
    a.href = shareCardDataUrl;
    a.download = `myhome-kansai-${gameState.age}yo-${gameState.ending?.rank ?? 'result'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showTempShareFeedback('結果認定証カード画像（PNG）を保存しました！X投稿に添付できます');
  }, [shareCardDataUrl, gameState, showTempShareFeedback]);

  const handleCopyShareCardImage = useCallback(async () => {
    if (!shareCardDataUrl) return;
    audioManager.playSe('stamp');
    try {
      const res = await fetch(shareCardDataUrl);
      const blob = await res.blob();
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showTempShareFeedback(
          '認定証画像をクリップボードにコピーしました！Xの投稿画面で貼り付け（ペースト）できます',
        );
      } else {
        handleDownloadShareCard();
      }
    } catch {
      handleDownloadShareCard();
    }
  }, [shareCardDataUrl, handleDownloadShareCard, showTempShareFeedback]);

  const handleNativeShareWithImage = useCallback(
    async (text: string, url: string) => {
      audioManager.playSe('click');
      if (typeof navigator === 'undefined' || !navigator.share) {
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        handleOpenXIntent(intentUrl);
        return;
      }
      try {
        if (shareCardDataUrl && navigator.canShare) {
          const res = await fetch(shareCardDataUrl);
          const blob = await res.blob();
          const file = new File([blob], 'myhome-kansai-result.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'マイホーム完済記｜住宅ローン返済シミュレーション結果',
              text: `${text}\n${url}`,
              files: [file],
            });
            showTempShareFeedback('画像付きでシェアシートを開きました！');
            return;
          }
        }
        await navigator.share({
          title: 'マイホーム完済記｜住宅ローン返済シミュレーション結果',
          text,
          url,
        });
      } catch {
        // ユーザーがキャンセルした場合などは何もしない
      }
    },
    [shareCardDataUrl, handleOpenXIntent, showTempShareFeedback],
  );

  useBgm(
    viewStage === 'life' && gameState
      ? gameState.status === 'playing'
        ? 'mortgage-life'
        : 'sugoroku-result'
      : 'mortgage-life',
    false,
  );

  // イントロ画面のリアルタイム統計カウンター
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
  const selectedProperty = useMemo(() => resolveEffectiveProperty(setupConfig), [setupConfig]);
  const selectedBank = useMemo(() => resolveEffectiveBank(setupConfig), [setupConfig]);
  const selectedDanshin = useMemo(() => resolveEffectiveDanshin(setupConfig), [setupConfig]);
  const effectiveCareerAndEdu = useMemo(
    () => resolveEffectiveHouseholdCareerAndEdu(setupConfig),
    [setupConfig],
  );
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
    const prop = PROPERTIES[arch.recommendedProperty];
    const defaultTermYears =
      arch.id === 'young-50yr-challenger'
        ? 50
        : arch.id === 'forty-something-cash-used'
          ? 25
          : 35;
    audioManager.playSe('click');
    setSetupConfig((prev) => ({
      ...prev,
      archetypeId: arch.id,
      age: arch.age,
      termYears: defaultTermYears,
      employment: arch.employment,
      mainIncomeMan: arch.mainIncomeMan,
      subIncomeMan: arch.subIncomeMan,
      initialSavingsMan: arch.initialSavingsMan,
      downPaymentMan: Math.min(Math.max(0, arch.initialSavingsMan - 300), 600),
      hasCreditBlemish: arch.hasCreditBlemish,
      contractType: arch.recommendedContract,
      familyPlan: arch.recommendedFamily,
      propertyId: arch.recommendedProperty,
      customPropertyPriceMan: prop.priceMan,
      customLandRatio: prop.landRatio,
      customBuildingType: prop.buildingType,
      customIsNew: prop.isNew,
      customBuiltAge: prop.builtAge,
      customEnergyCert: prop.energyCert,
      customMgmtAndRepairMonthlyMan:
        prop.buildingType === 'detached'
          ? 0
          : Number((prop.initialMgmtFeeMonthlyMan + prop.initialRepairFeeMonthlyMan).toFixed(1)),
      salaryCurve: undefined,
      retirementAllowanceMan: undefined,
      postRetirementWork: undefined,
      spouseWorkPattern: undefined,
      juniorHighPath: undefined,
      higherEdPath: undefined,
      hasGakushiHoken: undefined,
      scholarshipType: undefined,
      randomRollSummary: undefined,
    }));
  }, []);

  const handleShuffleAllSetup = useCallback(() => {
    audioManager.playSe('roll');
    const randomCfg = generateRandomHouseholdSetup();
    setSetupConfig((prev) => ({
      ...randomCfg,
      macroRegime: prev.macroRegime,
    }));
    setSpawnMode('custom');
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

  const handleStartRandomImmediately = () => {
    const randomCfg = generateRandomHouseholdSetup();
    setSetupConfig({
      ...randomCfg,
      macroRegime: setupConfig.macroRegime,
    });
    setRollingStep(0);
    setViewStage('rolling');
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
  // フェーズ 1: イントロ・条件設計画面
  // ============================================================================
  if (viewStage === 'intro') {
    const newLoansCount = Math.max(1, Math.floor(introSecondTick * 1.4));
    const troubleCount = Math.floor(introSecondTick * 0.25);

    const oddsRows = [
      { id: 'steady-couple-station', label: '31歳・首都圏の共働きマンション世帯', pct: 16.5 },
      { id: 'civil-servant-single', label: '34歳・公務員＆パートの郊外戸建て世帯', pct: 15.2 },
      { id: 'late-marriage-42', label: '38歳・晩婚子育て＆73歳完済予定世帯', pct: 12.4 },
      { id: 'young-50yr-challenger', label: '25歳・新卒3年目×50年超長期ローン世帯', pct: 10.8 },
      { id: 'regional-dual-car-detached', label: '29歳・地方都市の敷地60坪＆太陽光戸建て世帯', pct: 9.6 },
      { id: 'parent-gift-custom-house', label: '32歳・親からの贈与1,000万×注文住宅世帯', pct: 8.2 },
      { id: 'freelance-creator', label: '35歳・独立フリーランス＆中古リノベ世帯', pct: 6.8 },
      { id: 'single-solo-compact', label: '30歳・単身キャリアの駅近コンパクトマンション世帯', pct: 6.1 },
      { id: 'child3-suburban-4ldk', label: '33歳・子ども3人×郊外4LDK戸建て大家族世帯', pct: 5.2 },
      { id: 'power-couple-tower', label: '33歳・都心タワマン背伸びペアローン世帯', pct: 4.1 },
      { id: 'forty-something-cash-used', label: '42歳・頭金1,200万＆中古リノベ堅実世帯', pct: 3.1 },
      { id: 'specialist-high-income-private', label: '36歳・高収入専門職×私立中学受験＆都心戸建て世帯', pct: 2.0 },
    ];

    return (
      <div className="text-[#13212A] dark:text-[#E1E9E6]">
        {sharedChallengeBanner && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border-2 border-[#0F6E68] bg-[#DCEDEA] p-4 shadow-sm dark:border-[#4CC0AF] dark:bg-[#12302D]">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                <XLogoIcon className="h-3.5 w-3.5" />
                <span>X（旧Twitter）のシェアリンクから「同じ世帯・物件・ローン条件」を読み込みました！</span>
              </div>
              <p className="mt-1 font-mono text-xs font-bold text-[#13212A] dark:text-[#E1E9E6]">
                挑戦条件：{sharedChallengeBanner}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                audioManager.playSe('stamp');
                setViewStage('cert');
              }}
              className="shrink-0 rounded-[4px] bg-[#8C1D3C] px-4 py-2.5 text-xs font-bold text-white shadow transition hover:brightness-110 dark:bg-[#E2678A] dark:text-[#1B0910]"
            >
              このシェア条件で今すぐ挑戦する →
            </button>
          </div>
        )}

        {/* ヒーロー2カラム */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* 左：タイトル・リード文・リアルタイムカウンター */}
          <div className="lg:col-span-6">
            <p className="font-mono text-xs font-semibold tracking-wide text-[#0F6E68] dark:text-[#4CC0AF]">
              無料の住宅ローン人生シミュレーション · 国土交通省・日銀・住宅金融支援機構の統計にもとづく
            </p>
            <h1 className="font-editorial mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              マイホーム<em className="not-italic text-[#8C1D3C] dark:text-[#E2678A]">完済記</em>
              <span className="mt-2 block text-xl font-semibold text-[#4A5A61] sm:text-2xl dark:text-[#A3B2AF]">
                35年・50年ローンの家計と暮らし
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#4A5A61] sm:text-lg dark:text-[#A3B2AF]">
              いまこの瞬間にも、日本のどこかで誰かがマイホームの鍵を受け取り、35年・50年の返済を始めています。全12世帯モデル・全12物件・7銀行プランからひとつの家族になって、完済の日までの家計と暮らしを体験します。
            </p>

            {/* リアルタイムカウンター */}
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

          {/* 右：日本列島統計マップ ＆ 「いま鍵を受け取る世帯だったら」全12パターン確率バー表 */}
          <div className="space-y-3 lg:col-span-6">
            <JapanMortgageMapIllustration activeTick={introSecondTick} />

            <div className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-sm sm:p-5 dark:border-[#2A383D] dark:bg-[#141D21]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-editorial text-lg font-semibold">いま鍵を受け取る世帯だったら（全12パターン）</h2>
                <span className="font-mono text-[11px] text-[#0F6E68] dark:text-[#4CC0AF]">
                  タップでその世帯を選択
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                日本の住宅市場統計における主な世帯モデルの割合（文字切れなし・全12世帯から自由に選択可能）
              </p>
              <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
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
                      className={`flex flex-col gap-1 rounded border px-2.5 py-2 text-left text-xs transition ${
                        isSelected
                          ? 'border-[#0F6E68] bg-[#DCEDEA] font-bold text-[#13212A] dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-white'
                          : 'border-[#DCE4E1] bg-[#F0F4F2]/60 hover:bg-[#F0F4F2] dark:border-[#1D282C] dark:bg-[#1A2428]/60 dark:hover:bg-[#1A2428]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="break-words leading-snug">{row.label}</span>
                        <span className="shrink-0 font-mono text-[11px] text-[#4A5A61] dark:text-[#A3B2AF]">
                          {row.pct}%
                        </span>
                      </div>
                      <span className="block h-1.5 w-full overflow-hidden rounded-[1px] bg-[#DCE4E1] dark:bg-[#1D282C]">
                        <i
                          style={{ width: `${Math.min(100, row.pct * 5.2)}%` }}
                          className="block h-full bg-[#0F6E68] dark:bg-[#4CC0AF]"
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* セグメント設定バー (.opts) ＆ 常時カスタマイズ可能な詳細設計シート */}
        <div className="mt-10 rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-sm sm:p-6 dark:border-[#2A383D] dark:bg-[#141D21]">
          {/* クイックアクション＆スタートボタン帯（スマホでも一番上で即開始・即シャッフル可能） */}
          <div className="flex flex-col gap-3 rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED]/80 p-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-4 dark:border-[#2A383D] dark:bg-[#0D1316]/80">
            <div>
              <div className="text-xs font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                ランダムでも、自分の年齢・物件・金利・期間を細かく選んでもすぐ始められます
              </div>
              <p className="mt-0.5 text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
                テンプレを選ぶだけでも、数値スライダーを動かすだけでも、完全ランダム生成でもOKです。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleStartRandomImmediately}
                className="rounded-[4px] border border-[#0F6E68] bg-[#DCEDEA] px-3.5 py-2.5 text-xs font-bold text-[#0F6E68] shadow-xs transition hover:brightness-95 dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]"
              >
                完全ランダム抽選で今すぐ始める →
              </button>
              <button
                type="button"
                onClick={handleShuffleAllSetup}
                className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] px-3.5 py-2.5 text-xs font-bold text-[#13212A] transition hover:bg-[#F0F4F2] dark:border-[#2A383D] dark:bg-[#141D21] dark:text-[#E1E9E6]"
              >
                全条件をランダムシャッフル
              </button>
              <button
                type="button"
                onClick={() => {
                  audioManager.playSe('stamp');
                  setViewStage('cert');
                }}
                className="rounded-[4px] bg-[#8C1D3C] px-4 py-2.5 text-xs font-bold text-white shadow transition hover:brightness-110 dark:bg-[#E2678A] dark:text-[#1B0910]"
              >
                現在の条件で本審査証書を発行 →
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-[4px] border border-[#0F6E68]/50 bg-[#DCEDEA]/60 p-3.5 text-xs text-[#0F6E68] dark:border-[#4CC0AF]/40 dark:bg-[#12302D]/60 dark:text-[#4CC0AF]">
            <div className="font-mono font-bold">
              {setupConfig.randomRollSummary ? '抽選プロファイル：' : '現在の設定プロファイル：'}
              {formatSetupProfileSummary(setupConfig)}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded bg-[#F7FAF8]/90 px-2.5 py-1.5 text-[#13212A] dark:bg-[#141D21]/90 dark:text-[#E1E9E6]">
                <span className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">開始年齢・世帯年収</span>
                <b>
                  {setupConfig.age}歳・年収
                  {(
                    setupConfig.mainIncomeMan +
                    (setupConfig.contractType === 'single' ? 0 : setupConfig.subIncomeMan)
                  ).toLocaleString()}
                  万
                </b>
              </div>
              <div className="rounded bg-[#F7FAF8]/90 px-2.5 py-1.5 text-[#13212A] dark:bg-[#141D21]/90 dark:text-[#E1E9E6]">
                <span className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">自己資金・頭金・諸費用</span>
                <b>
                  貯蓄{setupConfig.initialSavingsMan.toLocaleString()}万（頭金{setupConfig.downPaymentMan}万/諸費用
                  {liveUnderwriting.closingCostsMan}万）
                </b>
              </div>
              <div className="rounded bg-[#F7FAF8]/90 px-2.5 py-1.5 text-[#13212A] dark:bg-[#141D21]/90 dark:text-[#E1E9E6]">
                <span className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">購入後の手元資金</span>
                <b className="text-[#0F6E68] dark:text-[#4CC0AF]">
                  手元資金 {liveUnderwriting.cashRemainingAfterPurchaseMan.toLocaleString()}万円
                </b>
              </div>
              <div className="rounded bg-[#F7FAF8]/90 px-2.5 py-1.5 text-[#13212A] dark:bg-[#141D21]/90 dark:text-[#E1E9E6]">
                <span className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">物件価格・借入元本</span>
                <b>
                  {selectedProperty.priceMan.toLocaleString()}万 / 借入
                  {liveUnderwriting.loanPrincipalMan.toLocaleString()}万
                </b>
              </div>
              <div className="rounded bg-[#F7FAF8]/90 px-2.5 py-1.5 text-[#13212A] dark:bg-[#141D21]/90 dark:text-[#E1E9E6]">
                <span className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">返済期間・金利・団信</span>
                <b>
                  {setupConfig.termYears}年（{liveUnderwriting.effectiveInitialRate.toFixed(2)}%・
                  {selectedDanshin.shortName}）
                </b>
              </div>
              <div className="rounded bg-[#F7FAF8]/90 px-2.5 py-1.5 text-[#13212A] dark:bg-[#141D21]/90 dark:text-[#E1E9E6]">
                <span className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">初年度 毎月支払額</span>
                <b className="text-[#8C1D3C] dark:text-[#E2678A]">
                  ローン{liveUnderwriting.initialMonthlyPaymentMan}万（計{liveUnderwriting.initialTotalMonthlyOutflowMan}万/月）
                </b>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-start gap-6">
            {/* 1. スタート時のモード */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wider text-[#5F6E72] dark:text-[#8A9A96]">
                「鍵を受け取る」ボタンを押したときの動作
              </span>
              <div className="inline-flex flex-wrap overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED] dark:border-[#2A383D] dark:bg-[#0D1316]">
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
                  統計＋ランダム数値で抽選して始める
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
                  下の設計シートの条件で始める
                </button>
              </div>
            </div>

            {/* 2. これからの世界（金利・経済情勢・途中利上げ） */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wider text-[#5F6E72] dark:text-[#8A9A96]">
                これからの世界（日銀・金利情勢・途中利上げシナリオ）
              </span>
              <div className="inline-flex flex-wrap overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED] dark:border-[#2A383D] dark:bg-[#0D1316]">
                {(
                  [
                    { id: 'gradual-hike', label: '段階利上げ（途中利上げあり）' },
                    { id: 'stagflation-shock', label: '円安スタグフレーション（急激利上げ）' },
                    { id: 'asset-bubble', label: '好景気・資産バブル（賃金も金利も上昇）' },
                    { id: 'deflation-return', label: 'デフレ回帰（一時利上げ後に低下）' },
                    { id: 'dynamic-random', label: 'おまかせ（波乱ランダム）' },
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
              <span className="max-w-xl text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                {MACRO_REGIMES[setupConfig.macroRegime].description}
              </span>
            </div>

            {/* 3. ひとつの返済人生のペース */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wider text-[#5F6E72] dark:text-[#8A9A96]">
                時間の進むペース（プレイ中も変更可能）
              </span>
              <div className="inline-flex flex-wrap overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED] dark:border-[#2A383D] dark:bg-[#0D1316]">
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
            </div>
          </div>

          {/* 常時表示：イラスト＆図解付き「住宅ローン・世帯・物件・金利」カスタマイズ設計シート */}
          <div className="mt-7 border-t border-[#C7D2CE] pt-6 dark:border-[#2A383D]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-editorial text-lg font-bold">
                  世帯・マイホーム・銀行ローンの自由設計＆ランダム生成シート
                </h3>
                <p className="text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                  自分の年齢（20〜55歳）・年収・物件価格・新築/中古・省エネ性能・金利・返済期間（10〜50年）・団信を自由に選べます。
                </p>
              </div>

              {/* スマホ・タブレットでも見やすいステップ切替タブ */}
              <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED] p-1 text-xs font-bold sm:inline-flex dark:border-[#2A383D] dark:bg-[#0D1316]">
                {(
                  [
                    { id: 'all', label: 'すべて表示' },
                    { id: 'step1', label: '① 世帯・年齢・年収' },
                    { id: 'step2', label: '② 物件・価格・性能' },
                    { id: 'step3', label: '③ 銀行・金利・期間' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSetupStepTab(tab.id)}
                    className={`rounded px-2.5 py-1.5 text-center transition ${
                      setupStepTab === tab.id
                        ? 'bg-[#13212A] text-white dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                        : 'text-[#4A5A61] hover:text-[#13212A] dark:text-[#A3B2AF]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* 左7列：世帯・物件・銀行・金利・団信の詳細カスタマイズ */}
              <div className="space-y-6 lg:col-span-7">
                {/* ============================================================ */}
                {/* STEP 1. 世帯モデル・自分の年齢・年収・自己資金・契約方式 */}
                {/* ============================================================ */}
                {(setupStepTab === 'all' || setupStepTab === 'step1') && (
                  <div className="rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED]/60 p-4 dark:border-[#2A383D] dark:bg-[#0D1316]/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold">
                        1. 世帯モデル・自分の年齢（20〜55歳）・年収・契約方式
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playSe('roll');
                          setSetupConfig((prev) => randomizeHouseholdParams(prev));
                          setSpawnMode('custom');
                        }}
                        className="rounded border border-[#0F6E68] bg-[#DCEDEA] px-2.5 py-1 text-xs font-bold text-[#0F6E68] transition hover:brightness-95 dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]"
                      >
                        世帯・年齢・年収をランダム生成
                      </button>
                    </div>

                    <p className="mt-1 text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                      テンプレートをベースに選ぶか、下の年齢・年収スライダーで自分の条件に合わせられます。
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {ARCHETYPES.map((arch) => (
                        <button
                          key={arch.id}
                          type="button"
                          onClick={() => {
                            handleApplyArchetype(arch.id);
                            setSpawnMode('custom');
                          }}
                          className={`rounded-[4px] border p-2.5 text-left text-xs transition ${
                            setupConfig.archetypeId === arch.id
                              ? 'border-[#8C1D3C] bg-[#F3E3E8]/70 font-bold dark:border-[#E2678A] dark:bg-[#3A1C26]/50'
                              : 'border-[#C7D2CE] bg-[#F7FAF8] dark:border-[#2A383D] dark:bg-[#141D21]'
                          }`}
                        >
                          <div className="break-words">{arch.title}</div>
                          <div className="mt-0.5 break-words text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                            {arch.subtitle}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* 自分の年齢のクイック選択＆1歳刻み調整 */}
                    <div className="mt-4 rounded border border-[#C7D2CE] bg-[#F7FAF8] p-3 dark:border-[#2A383D] dark:bg-[#141D21]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold">
                          自分の年齢（住宅ローン契約開始年齢）
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSetupConfig((p) => {
                                setSpawnMode('custom');
                                return { ...p, age: Math.max(20, p.age - 1) };
                              })
                            }
                            className="rounded border border-[#C7D2CE] bg-[#EBF0ED] px-2 py-0.5 font-mono text-xs font-bold dark:border-[#2A383D] dark:bg-[#1A2428]"
                          >
                            -1歳
                          </button>
                          <span className="min-w-[64px] text-center font-mono text-base font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                            {setupConfig.age}歳
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSetupConfig((p) => {
                                setSpawnMode('custom');
                                return { ...p, age: Math.min(55, p.age + 1) };
                              })
                            }
                            className="rounded border border-[#C7D2CE] bg-[#EBF0ED] px-2 py-0.5 font-mono text-xs font-bold dark:border-[#2A383D] dark:bg-[#1A2428]"
                          >
                            +1歳
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={55}
                        step={1}
                        value={setupConfig.age}
                        onChange={(e) => {
                          setSpawnMode('custom');
                          setSetupConfig((p) => ({ ...p, age: Number(e.target.value) }));
                        }}
                        className="mt-2 w-full accent-[#8C1D3C]"
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[22, 25, 28, 30, 32, 35, 38, 40, 45, 50].map((quickAge) => (
                          <button
                            key={quickAge}
                            type="button"
                            onClick={() => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({ ...p, age: quickAge }));
                            }}
                            className={`rounded border px-2 py-1 font-mono text-[11px] font-semibold ${
                              setupConfig.age === quickAge
                                ? 'border-[#8C1D3C] bg-[#8C1D3C] text-white dark:border-[#E2678A] dark:bg-[#E2678A] dark:text-[#1B0910]'
                                : 'border-[#C7D2CE] bg-[#EBF0ED] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                            }`}
                          >
                            {quickAge}歳
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 font-mono text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                        現在の設定での完済予定年齢：{setupConfig.age + setupConfig.termYears}歳（銀行の完済上限目安：80歳）
                      </p>
                    </div>

                    {/* 年収・自己資金・頭金スライダー */}
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block rounded border border-[#C7D2CE] bg-[#F7FAF8] p-3 text-xs dark:border-[#2A383D] dark:bg-[#141D21]">
                        <div className="flex justify-between font-semibold">
                          <span>本人額面年収</span>
                          <span className="font-mono text-sm font-bold">
                            {setupConfig.mainIncomeMan}万円
                          </span>
                        </div>
                        <input
                          type="range"
                          min={250}
                          max={2000}
                          step={10}
                          value={setupConfig.mainIncomeMan}
                          onChange={(e) => {
                            setSpawnMode('custom');
                            setSetupConfig((p) => ({
                              ...p,
                              mainIncomeMan: Number(e.target.value),
                            }));
                          }}
                          className="mt-2 w-full accent-[#8C1D3C]"
                        />
                      </label>

                      <label className="block rounded border border-[#C7D2CE] bg-[#F7FAF8] p-3 text-xs dark:border-[#2A383D] dark:bg-[#141D21]">
                        <div className="flex justify-between font-semibold">
                          <span>配偶者額面年収（0万＝単身/片働き）</span>
                          <span className="font-mono text-sm font-bold">
                            {setupConfig.subIncomeMan}万円
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1500}
                          step={10}
                          value={setupConfig.subIncomeMan}
                          onChange={(e) => {
                            setSpawnMode('custom');
                            const val = Number(e.target.value);
                            setSetupConfig((p) => ({
                              ...p,
                              subIncomeMan: val,
                              contractType: val === 0 ? 'single' : p.contractType,
                            }));
                          }}
                          className="mt-2 w-full accent-[#8C1D3C]"
                        />
                      </label>

                      <label className="block rounded border border-[#C7D2CE] bg-[#F7FAF8] p-3 text-xs dark:border-[#2A383D] dark:bg-[#141D21]">
                        <div className="flex justify-between font-semibold">
                          <span>現在の自己資金（貯蓄総額）</span>
                          <span className="font-mono text-sm font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                            {setupConfig.initialSavingsMan}万円
                          </span>
                        </div>
                        <input
                          type="range"
                          min={150}
                          max={5000}
                          step={50}
                          value={setupConfig.initialSavingsMan}
                          onChange={(e) => {
                            setSpawnMode('custom');
                            const nextSav = Number(e.target.value);
                            setSetupConfig((p) => ({
                              ...p,
                              initialSavingsMan: nextSav,
                              downPaymentMan: Math.min(p.downPaymentMan, Math.max(0, nextSav - 100)),
                            }));
                          }}
                          className="mt-2 w-full accent-[#0F6E68]"
                        />
                      </label>

                      <label className="block rounded border border-[#C7D2CE] bg-[#F7FAF8] p-3 text-xs dark:border-[#2A383D] dark:bg-[#141D21]">
                        <div className="flex justify-between font-semibold">
                          <span>頭金投入額（残りは手元予備資金）</span>
                          <span className="font-mono text-sm font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                            {setupConfig.downPaymentMan}万円
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(100, setupConfig.initialSavingsMan - 100)}
                          step={50}
                          value={setupConfig.downPaymentMan}
                          onChange={(e) => {
                            setSpawnMode('custom');
                            setSetupConfig((p) => ({
                              ...p,
                              downPaymentMan: Number(e.target.value),
                            }));
                          }}
                          className="mt-2 w-full accent-[#0F6E68]"
                        />
                      </label>
                    </div>

                    {/* 雇用形態・契約方式・家族計画・信用情報 */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <span className="block text-xs font-semibold">本人の職業・雇用形態</span>
                        <select
                          value={setupConfig.employment}
                          onChange={(e) => {
                            setSpawnMode('custom');
                            const nextEmp = e.target.value as EmploymentType;
                            setSetupConfig((p) => ({
                              ...p,
                              employment: nextEmp,
                              retirementAllowanceMan: getDefaultRetirementAllowanceMan(nextEmp),
                            }));
                          }}
                          className="mt-1 w-full rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] px-2.5 py-2 text-xs dark:border-[#2A383D] dark:bg-[#141D21]"
                        >
                          {(Object.keys(EMPLOYMENT_LABELS) as EmploymentType[]).map((emp) => (
                            <option key={emp} value={emp}>
                              {EMPLOYMENT_LABELS[emp]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="block text-xs font-semibold">契約方式（単独 / ペアローン / 収入合算）</span>
                        <select
                          value={setupConfig.contractType}
                          onChange={(e) => {
                            setSpawnMode('custom');
                            setSetupConfig((p) => ({
                              ...p,
                              contractType: e.target.value as ContractType,
                            }));
                          }}
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
                          onChange={(e) => {
                            setSpawnMode('custom');
                            const nextFp = e.target.value as FamilyPlanType;
                            setSetupConfig((p) => ({
                              ...p,
                              familyPlan: nextFp,
                              higherEdPath: undefined,
                            }));
                          }}
                          className="mt-1 w-full rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] px-2.5 py-2 text-xs dark:border-[#2A383D] dark:bg-[#141D21]"
                        >
                          {Object.values(FAMILY_PLANS).map((fp) => (
                            <option key={fp.id} value={fp.id}>
                              {fp.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="block text-xs font-semibold">信用情報（CIC・クレカ延滞歴）</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSpawnMode('custom');
                            setSetupConfig((p) => ({
                              ...p,
                              hasCreditBlemish: !p.hasCreditBlemish,
                            }));
                          }}
                          className={`mt-1 w-full rounded-[4px] border px-2.5 py-2 text-left text-xs font-semibold transition ${
                            setupConfig.hasCreditBlemish
                              ? 'border-[#B0362B] bg-[#F3E3E8] text-[#B0362B] dark:border-[#F07B6B] dark:bg-[#3A1C26] dark:text-[#F07B6B]'
                              : 'border-[#C7D2CE] bg-[#F7FAF8] text-[#2B7A4E] dark:border-[#2A383D] dark:bg-[#141D21] dark:text-[#5CC38B]'
                          }`}
                        >
                          {setupConfig.hasCreditBlemish
                            ? '過去の携帯分割・カード延滞あり（審査減点）'
                            : 'クリーン（延滞歴なし・優良）'}
                        </button>
                      </div>
                    </div>

                    {/* 昇給カーブ・退職金・定年後の働き方・配偶者の働き方（バイト等） */}
                    <div className="mt-4 rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-3.5 dark:border-[#2A383D] dark:bg-[#141D21]">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE4E1] pb-2 dark:border-[#1D282C]">
                        <span className="text-xs font-bold text-[#13212A] dark:text-[#E1E9E6]">
                          キャリア・昇給カーブ・退職金・定年後＆配偶者の働き方
                        </span>
                        <span className="font-mono text-[11px] text-[#0F6E68] dark:text-[#4CC0AF]">
                          {setupConfig.age}歳時点の年間がん罹患確率：約
                          {(calcAnnualHealthRiskProbabilities(setupConfig.age).cancerProb * 100).toFixed(2)}%/年（年齢とともに上昇）
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* 給与カーブ */}
                        <div>
                          <span className="block text-xs font-semibold">
                            今後の昇給・給与カーブ（上がる人 / 横ばい / 下がる人）
                          </span>
                          <select
                            value={effectiveCareerAndEdu.salaryCurve}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                salaryCurve: e.target.value as SalaryCurveType,
                              }));
                            }}
                            className="mt-1 w-full rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] px-2.5 py-2 text-xs dark:border-[#2A383D] dark:bg-[#1A2428]"
                          >
                            {Object.values(SALARY_CURVE_SPECS).map((sc) => (
                              <option key={sc.id} value={sc.id}>
                                {sc.label}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                            {SALARY_CURVE_SPECS[effectiveCareerAndEdu.salaryCurve].description}
                          </p>
                        </div>

                        {/* 定年退職金 */}
                        <div>
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>60歳定年時の退職金見込額（制度有無）</span>
                            <span className="font-mono text-sm font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                              {effectiveCareerAndEdu.retirementAllowanceMan === 0
                                ? '0万円（退職金制度なし）'
                                : `${effectiveCareerAndEdu.retirementAllowanceMan.toLocaleString()}万円`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={2800}
                            step={50}
                            value={effectiveCareerAndEdu.retirementAllowanceMan}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                retirementAllowanceMan: Number(e.target.value),
                              }));
                            }}
                            className="mt-1.5 w-full accent-[#0F6E68]"
                          />
                          <div className="mt-1 flex flex-wrap gap-1">
                            {[
                              { label: '制度なし(0万)', val: 0 },
                              { label: '中小標準(500万)', val: 500 },
                              { label: '中堅(1,000万)', val: 1000 },
                              { label: '大企業(1,750万)', val: 1750 },
                              { label: '公務員等(2,100万)', val: 2100 },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => {
                                  setSpawnMode('custom');
                                  setSetupConfig((p) => ({
                                    ...p,
                                    retirementAllowanceMan: preset.val,
                                  }));
                                }}
                                className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition ${
                                  effectiveCareerAndEdu.retirementAllowanceMan === preset.val
                                    ? 'border-[#0F6E68] bg-[#0F6E68] text-white'
                                    : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 購入時点の配偶者（奥さん・パートナー）の働き方（※途中の職場復帰・パート転換や毎年の就労選択はプレイ中に自由変更可） */}
                        <div className="sm:col-span-2">
                          <span className="block text-xs font-semibold">
                            購入時点の配偶者（奥さん・パートナー）の就労状況（※職場復帰・パート転換・毎年働くかどうかは途中で選択可）
                          </span>
                          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            {(
                              [
                                {
                                  id: 'fulltime-keep' as SpouseWorkPatternType,
                                  label: '正社員・フルタイム共働き',
                                  sub: '購入時：正社員勤務',
                                },
                                {
                                  id: 'part-time' as SpouseWorkPatternType,
                                  label: 'パート・アルバイト勤務',
                                  sub: '購入時：パート勤務',
                                },
                                {
                                  id: 'homemaker' as SpouseWorkPatternType,
                                  label: '専業主婦（夫）（0円）',
                                  sub: '途中で職場復帰・パート可',
                                },
                                {
                                  id: 'no-spouse' as SpouseWorkPatternType,
                                  label: '独身（配偶者なし）',
                                  sub: '途中で結婚イベントあり',
                                },
                              ] as const
                            ).map((sw) => {
                              const currentNorm =
                                effectiveCareerAndEdu.spouseWorkPattern === 'shift-to-part'
                                  ? 'fulltime-keep'
                                  : effectiveCareerAndEdu.spouseWorkPattern === 'homemaker-to-part'
                                    ? 'homemaker'
                                    : effectiveCareerAndEdu.spouseWorkPattern;
                              const isAct = currentNorm === sw.id;
                              return (
                                <button
                                  key={sw.id}
                                  type="button"
                                  onClick={() => {
                                    setSpawnMode('custom');
                                    setSetupConfig((p) => {
                                      let nextSub = p.subIncomeMan;
                                      if (sw.id === 'no-spouse' || sw.id === 'homemaker') {
                                        nextSub = 0;
                                      } else if (sw.id === 'part-time' && (nextSub > 180 || nextSub === 0)) {
                                        nextSub = 115;
                                      } else if (sw.id === 'fulltime-keep' && nextSub < 200) {
                                        nextSub = 360;
                                      }
                                      return {
                                        ...p,
                                        spouseWorkPattern: sw.id,
                                        subIncomeMan: nextSub,
                                        contractType: nextSub === 0 ? 'single' : p.contractType,
                                      };
                                    });
                                  }}
                                  className={`rounded-[4px] border p-2 text-left text-xs transition ${
                                    isAct
                                      ? 'border-[#0F6E68] bg-[#DCEDEA] font-bold text-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]'
                                      : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                                  }`}
                                >
                                  <div>{sw.label}</div>
                                  <div className="mt-0.5 text-[10px] opacity-80">{sw.sub}</div>
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-1.5 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                            ※ 初めから将来の働き方を固定する必要はありません。専業主婦（夫）からの職場復帰・パート開始や、正社員からパートへの転換、60歳定年後の働き方（再雇用 / 別職種 / バイト / 引退・いつまで働くか）は、返済途中の選択肢および毎年の画面で自由に選べます。
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 子どもの購入時設定（学資保険の有無のみ。将来の受験・進学・塾・奨学金は成長時のイベントで選択！） */}
                    {FAMILY_PLANS[setupConfig.familyPlan].childrenCount > 0 && (
                      <div className="mt-4 rounded-[4px] border border-[#0F6E68]/50 bg-[#DCEDEA]/35 p-3.5 dark:border-[#4CC0AF]/40 dark:bg-[#12302D]/35">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0F6E68]/25 pb-2">
                          <span className="text-xs font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                            子どもの出生時・購入時設定（学資保険の加入有無）
                          </span>
                          <span className="font-mono text-[11px] text-[#4A5A61] dark:text-[#A3B2AF]">
                            購入時の子ども {FAMILY_PLANS[setupConfig.familyPlan].childrenCount}人
                          </span>
                        </div>

                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                hasGakushiHoken: !effectiveCareerAndEdu.hasGakushiHoken,
                              }));
                            }}
                            className={`w-full rounded-[4px] border px-3 py-2 text-left text-xs font-semibold transition ${
                              effectiveCareerAndEdu.hasGakushiHoken
                                ? 'border-[#0F6E68] bg-[#DCEDEA] text-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]'
                                : 'border-[#C7D2CE] bg-[#F7FAF8] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#141D21] dark:text-[#A3B2AF]'
                            }`}
                          >
                            {effectiveCareerAndEdu.hasGakushiHoken
                              ? '学資保険 あり（0〜17歳まで年11万積立 → 18歳進学時に満期金200万円受取）'
                              : '学資保険 なし（手元貯蓄・毎年の家計から教育費を捻出）'}
                          </button>
                          <p className="mt-1.5 text-[11px] text-[#5F6E68] dark:text-[#8A9A96]">
                            ※ 子どもの入塾（7歳・13歳）、中学受験か公立中か（10歳）、大学・専門・高卒就職の進路（16歳）、予備校や奨学金の利用（17歳）は、初めから決めずに子どもの成長に合わせた途中の選択肢でその都度選べます。また子どもの成長・独立に伴い毎年の家族構成と生活費も動的に変化します。
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 家族旅行・レジャー・外食・娯楽費スタイル */}
                    <div className="mt-4 rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-3.5 dark:border-[#2A383D] dark:bg-[#141D21]">
                      <span className="block text-xs font-bold text-[#13212A] dark:text-[#E1E9E6]">
                        家族旅行・レジャー・外食・娯楽費スタイル（物価上昇・幸福度に連動）
                      </span>
                      <select
                        value={effectiveCareerAndEdu.leisureStyle}
                        onChange={(e) => {
                          setSpawnMode('custom');
                          setSetupConfig((p) => ({
                            ...p,
                            leisureStyle: e.target.value as LeisureStyleType,
                          }));
                        }}
                        className="mt-1.5 w-full rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] px-2.5 py-2 text-xs font-semibold dark:border-[#2A383D] dark:bg-[#1A2428]"
                      >
                        {Object.values(LEISURE_STYLE_SPECS).map((ls) => (
                          <option key={ls.id} value={ls.id}>
                            {ls.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                        {LEISURE_STYLE_SPECS[effectiveCareerAndEdu.leisureStyle].description}
                      </p>
                    </div>
                  </div>
                )}

                {/* ============================================================ */}
                {/* STEP 2. 購入するマイホーム（物件種別・価格・新築/中古・長期優良） */}
                {/* ============================================================ */}
                {(setupStepTab === 'all' || setupStepTab === 'step2') && (
                  <div className="rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED]/60 p-4 dark:border-[#2A383D] dark:bg-[#0D1316]/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold">
                        2. 購入するマイホーム（タワマン / マンション / 一戸建て / 新築・中古・価格）
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playSe('roll');
                          setSetupConfig((prev) => randomizePropertyParams(prev));
                          setSpawnMode('custom');
                        }}
                        className="rounded border border-[#0F6E68] bg-[#DCEDEA] px-2.5 py-1 text-xs font-bold text-[#0F6E68] transition hover:brightness-95 dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]"
                      >
                        物件・価格・スペックをランダム生成
                      </button>
                    </div>

                    <p className="mt-1 text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                      全12物件テンプレートから選ぶだけでなく、物件価格・土地比率・建物種別・新築/中古・省エネ認定も自由にカスタマイズできます。
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {Object.values(PROPERTIES).map((prop) => {
                        const active = setupConfig.propertyId === prop.id;
                        return (
                          <button
                            key={prop.id}
                            type="button"
                            onClick={() => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                propertyId: prop.id,
                                customPropertyPriceMan: prop.priceMan,
                                customLandRatio: prop.landRatio,
                                customBuildingType: prop.buildingType,
                                customIsNew: prop.isNew,
                                customBuiltAge: prop.builtAge,
                                customEnergyCert: prop.energyCert,
                                customMgmtAndRepairMonthlyMan: Number(
                                  (prop.initialMgmtFeeMonthlyMan + prop.initialRepairFeeMonthlyMan).toFixed(1),
                                ),
                              }));
                            }}
                            className={`rounded-[4px] border p-2.5 text-left transition ${
                              active
                                ? 'border-[#0F6E68] bg-[#DCEDEA]/70 ring-1 ring-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D]/60'
                                : 'border-[#C7D2CE] bg-[#F7FAF8] dark:border-[#2A383D] dark:bg-[#141D21]'
                            }`}
                          >
                            <PropertyArchitecturalIllustration
                              propertyId={prop.id}
                              overrideSpec={active ? selectedProperty : prop}
                              className="h-24 w-full"
                            />
                            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-1">
                              <span className="break-words text-xs font-bold">{prop.shortName}</span>
                              <span className="font-mono text-xs font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                                {(active ? selectedProperty.priceMan : prop.priceMan).toLocaleString()}万円
                              </span>
                            </div>
                            <p className="mt-0.5 break-words text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                              {ENERGY_CERT_LABELS[active ? selectedProperty.energyCert : prop.energyCert]}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* 物件条件・数値の自由カスタマイズパネル */}
                    <div className="mt-4 space-y-4 rounded border border-[#C7D2CE] bg-[#F7FAF8] p-3.5 dark:border-[#2A383D] dark:bg-[#141D21]">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE4E1] pb-2 dark:border-[#1D282C]">
                        <span className="text-xs font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                          物件スペック・価格・新築/中古・省エネ認定の自由調整
                        </span>
                        <span className="font-mono text-[11px] text-[#5F6E72]">
                          土地 {Math.round(selectedProperty.priceMan * selectedProperty.landRatio).toLocaleString()}万 / 建物{' '}
                          {Math.round(selectedProperty.priceMan * (1 - selectedProperty.landRatio)).toLocaleString()}万
                        </span>
                      </div>

                      {/* 建物種別・新築/中古・省エネ認定ボタン群 */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <span className="block text-xs font-semibold">建物種別</span>
                          <div className="mt-1 grid grid-cols-3 overflow-hidden rounded border border-[#C7D2CE] text-xs font-bold dark:border-[#2A383D]">
                            {(
                              [
                                { id: 'tower', label: 'タワマン' },
                                { id: 'mansion', label: 'マンション' },
                                { id: 'detached', label: '一戸建て' },
                              ] as const
                            ).map((bt, idx) => (
                              <button
                                key={bt.id}
                                type="button"
                                onClick={() => {
                                  setSpawnMode('custom');
                                  const defaultPropForType: PropertyCategory =
                                    bt.id === 'detached'
                                      ? 'detached-semi-order-zeh'
                                      : bt.id === 'tower'
                                        ? 'tower-mansion-new'
                                        : 'station-mansion-new';
                                  const nextProp = PROPERTIES[defaultPropForType];
                                  setSetupConfig((p) => ({
                                    ...p,
                                    propertyId:
                                      PROPERTIES[p.propertyId]?.buildingType === bt.id
                                        ? p.propertyId
                                        : defaultPropForType,
                                    customBuildingType: bt.id,
                                    customMgmtAndRepairMonthlyMan:
                                      bt.id === 'detached'
                                        ? 0
                                        : Number(
                                            (
                                              nextProp.initialMgmtFeeMonthlyMan +
                                              nextProp.initialRepairFeeMonthlyMan
                                            ).toFixed(1),
                                          ),
                                  }));
                                }}
                                className={`${idx > 0 ? 'border-l border-[#C7D2CE] dark:border-[#2A383D]' : ''} py-1.5 ${
                                  selectedProperty.buildingType === bt.id
                                    ? 'bg-[#13212A] text-white dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                                    : 'bg-[#EBF0ED] text-[#4A5A61] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                                }`}
                              >
                                {bt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold">新築 / 中古</span>
                          <div className="mt-1 grid grid-cols-2 overflow-hidden rounded border border-[#C7D2CE] text-xs font-bold dark:border-[#2A383D]">
                            <button
                              type="button"
                              onClick={() => {
                                setSpawnMode('custom');
                                setSetupConfig((p) => ({
                                  ...p,
                                  customIsNew: true,
                                  customBuiltAge: 0,
                                }));
                              }}
                              className={`py-1.5 ${
                                selectedProperty.isNew
                                  ? 'bg-[#0F6E68] text-white dark:bg-[#4CC0AF] dark:text-[#0D1316]'
                                  : 'bg-[#EBF0ED] text-[#4A5A61] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                              }`}
                            >
                              新築物件
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSpawnMode('custom');
                                setSetupConfig((p) => ({
                                  ...p,
                                  customIsNew: false,
                                  customBuiltAge: p.customBuiltAge && p.customBuiltAge > 0 ? p.customBuiltAge : 12,
                                }));
                              }}
                              className={`border-l border-[#C7D2CE] py-1.5 dark:border-[#2A383D] ${
                                !selectedProperty.isNew
                                  ? 'bg-[#9C7020] text-white dark:bg-[#D9AF59] dark:text-[#0D1316]'
                                  : 'bg-[#EBF0ED] text-[#4A5A61] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                              }`}
                            >
                              中古（築{selectedProperty.isNew ? 12 : selectedProperty.builtAge}年）
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold">省エネ・住宅性能認定</span>
                          <select
                            value={selectedProperty.energyCert}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                customEnergyCert: e.target.value as EnergyCertType,
                              }));
                            }}
                            className="mt-1 w-full rounded border border-[#C7D2CE] bg-[#EBF0ED] px-2 py-1.5 text-xs font-semibold dark:border-[#2A383D] dark:bg-[#1A2428]"
                          >
                            <option value="long-term-excellent">長期優良住宅（控除最大）</option>
                            <option value="zeh">ZEH水準省エネ住宅</option>
                            <option value="standard">一般省エネ基準適合</option>
                            <option value="non-compliant">旧省エネ基準（新築は控除0円）</option>
                          </select>
                        </div>
                      </div>

                      {!selectedProperty.isNew && (
                        <label className="block text-xs">
                          <div className="flex justify-between font-semibold">
                            <span>中古物件の築年数（住宅ローン控除＆修繕時期に影響）</span>
                            <span className="font-mono font-bold">築{selectedProperty.builtAge}年</span>
                          </div>
                          <input
                            type="range"
                            min={2}
                            max={35}
                            step={1}
                            value={selectedProperty.builtAge}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                customIsNew: false,
                                customBuiltAge: Number(e.target.value),
                              }));
                            }}
                            className="mt-1 w-full accent-[#9C7020]"
                          />
                        </label>
                      )}

                      {/* 物件価格スライダー＆クイック価格ボタン */}
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-bold">物件購入価格</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSpawnMode('custom');
                                setSetupConfig((p) => ({
                                  ...p,
                                  customPropertyPriceMan: Math.max(1500, selectedProperty.priceMan - 100),
                                }));
                              }}
                              className="rounded border border-[#C7D2CE] bg-[#EBF0ED] px-2 py-0.5 font-mono text-xs font-bold dark:border-[#2A383D] dark:bg-[#1A2428]"
                            >
                              -100万
                            </button>
                            <span className="font-mono text-base font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                              {selectedProperty.priceMan.toLocaleString()}万円
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSpawnMode('custom');
                                setSetupConfig((p) => ({
                                  ...p,
                                  customPropertyPriceMan: Math.min(16000, selectedProperty.priceMan + 100),
                                }));
                              }}
                              className="rounded border border-[#C7D2CE] bg-[#EBF0ED] px-2 py-0.5 font-mono text-xs font-bold dark:border-[#2A383D] dark:bg-[#1A2428]"
                            >
                              +100万
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={1500}
                          max={16000}
                          step={100}
                          value={selectedProperty.priceMan}
                          onChange={(e) => {
                            setSpawnMode('custom');
                            setSetupConfig((p) => ({
                              ...p,
                              customPropertyPriceMan: Number(e.target.value),
                            }));
                          }}
                          className="mt-1.5 w-full accent-[#8C1D3C]"
                        />
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {[2800, 3800, 4800, 5800, 6800, 8200, 9800, 12500].map((priceVal) => (
                            <button
                              key={priceVal}
                              type="button"
                              onClick={() => {
                                setSpawnMode('custom');
                                setSetupConfig((p) => ({
                                  ...p,
                                  customPropertyPriceMan: priceVal,
                                }));
                              }}
                              className={`rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                                selectedProperty.priceMan === priceVal
                                  ? 'border-[#8C1D3C] bg-[#8C1D3C] text-white dark:border-[#E2678A] dark:bg-[#E2678A] dark:text-[#1B0910]'
                                  : 'border-[#C7D2CE] bg-[#EBF0ED] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                              }`}
                            >
                              {priceVal.toLocaleString()}万
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 土地価格比率 ＆ 管理費・修繕積立金 */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block text-xs">
                          <div className="flex justify-between font-semibold">
                            <span>土地価格比率（資産価値の下支え）</span>
                            <span className="font-mono font-bold">
                              {Math.round(selectedProperty.landRatio * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={15}
                            max={80}
                            step={5}
                            value={Math.round(selectedProperty.landRatio * 100)}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                customLandRatio: Number(e.target.value) / 100,
                              }));
                            }}
                            className="mt-1 w-full accent-[#0F6E68]"
                          />
                        </label>

                        {selectedProperty.buildingType === 'detached' ? (
                          <div className="rounded border border-[#C7D2CE] bg-[#EBF0ED]/70 p-2.5 text-xs dark:border-[#2A383D] dark:bg-[#1A2428]">
                            <div className="flex justify-between font-semibold">
                              <span>管理費・修繕積立金（一戸建て）</span>
                              <span className="font-mono font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                                月 0.0万円（管理組合なし）
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                              一戸建ては毎月の管理費・修繕積立金が0円の代わりに、10〜15年ごとの外壁・屋根・給湯器メンテナンスを自己資金で行います。
                            </p>
                          </div>
                        ) : (
                          <label className="block text-xs">
                            <div className="flex justify-between font-semibold">
                              <span>初期の管理費・修繕積立金（月額）</span>
                              <span className="font-mono font-bold">
                                月{' '}
                                {(
                                  selectedProperty.initialMgmtFeeMonthlyMan +
                                  selectedProperty.initialRepairFeeMonthlyMan
                                ).toFixed(1)}
                                万円
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0.5}
                              max={8.0}
                              step={0.2}
                              value={Number(
                                (
                                  selectedProperty.initialMgmtFeeMonthlyMan +
                                  selectedProperty.initialRepairFeeMonthlyMan
                                ).toFixed(1),
                              )}
                              onChange={(e) => {
                                setSpawnMode('custom');
                                setSetupConfig((p) => ({
                                  ...p,
                                  customMgmtAndRepairMonthlyMan: Number(e.target.value),
                                }));
                              }}
                              className="mt-1 w-full accent-[#0F6E68]"
                            />
                          </label>
                        )}
                      </div>

                      {/* 固定資産税・都市計画税（年額見込） ＆ 火災保険・地震保険プラン選択 */}
                      <div className="grid grid-cols-1 gap-4 border-t border-[#C7D2CE] pt-3 sm:grid-cols-2 dark:border-[#2A383D]">
                        <div className="rounded border border-[#C7D2CE] bg-[#EBF0ED]/70 p-2.5 text-xs dark:border-[#2A383D] dark:bg-[#1A2428]">
                          <div className="flex justify-between font-semibold">
                            <span>固定資産税・都市計画税（年額目安）</span>
                            <span className="font-mono font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                              年 {selectedProperty.annualPropertyTaxMan}万円
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                            {selectedProperty.isNew
                              ? `新築軽減により当初${selectedProperty.energyCert === 'long-term-excellent' ? (selectedProperty.buildingType === 'detached' ? 5 : 7) : selectedProperty.buildingType === 'detached' ? 3 : 5}年間は家屋分が半額軽減されますが、期間満了の翌年から本来の税額へ上がります。`
                              : '3年ごとの固定資産評価替えと建物の経年減価補正が毎年のキャッシュフローに反映されます。'}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold">
                            火災保険・地震保険・水災特約プラン（5年更新）
                          </label>
                          <select
                            value={effectiveCareerAndEdu.insurancePlan}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                insurancePlan: e.target.value as FireEarthquakeInsuranceType,
                              }));
                            }}
                            className="mt-1 w-full rounded border border-[#C7D2CE] bg-[#EBF0ED] px-2.5 py-2 text-xs font-semibold dark:border-[#2A383D] dark:bg-[#1A2428]"
                          >
                            {Object.values(INSURANCE_PLAN_SPECS).map((ins) => {
                              const fiveYrCost =
                                selectedProperty.buildingType === 'detached'
                                  ? ins.fiveYearCostDetachedMan
                                  : selectedProperty.buildingType === 'tower'
                                    ? ins.fiveYearCostTowerMan
                                    : ins.fiveYearCostMansionMan;
                              return (
                                <option key={ins.id} value={ins.id}>
                                  {ins.label}（5年一括 約{fiveYrCost}万円）
                                </option>
                              );
                            })}
                          </select>
                          <p className="mt-1 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                            {INSURANCE_PLAN_SPECS[effectiveCareerAndEdu.insurancePlan].description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================ */}
                {/* STEP 3. 借入銀行・変動/固定・金利・返済期間（10〜50年）・団信 */}
                {/* ============================================================ */}
                {(setupStepTab === 'all' || setupStepTab === 'step3') && (
                  <div className="rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED]/60 p-4 dark:border-[#2A383D] dark:bg-[#0D1316]/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold">
                        3. 借入銀行・金利方式・適用金利・返済期間（10〜50年）・元利/元金・団信
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playSe('roll');
                          setSetupConfig((prev) => randomizeBankLoanParams(prev));
                          setSpawnMode('custom');
                        }}
                        className="rounded border border-[#0F6E68] bg-[#DCEDEA] px-2.5 py-1 text-xs font-bold text-[#0F6E68] transition hover:brightness-95 dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]"
                      >
                        銀行・金利・期間・団信をランダム生成
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {Object.values(BANKS).map((bank) => {
                        const active = setupConfig.bankId === bank.id;
                        return (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                bankId: bank.id as BankId,
                                customRateType: bank.rateType,
                                customBaseRate: bank.baseRate,
                                customHas5Year125Rule: bank.has5Year125Rule,
                              }));
                            }}
                            className={`flex items-center justify-between rounded-[4px] border p-3 text-left text-xs transition ${
                              active
                                ? 'border-[#8C1D3C] bg-[#F3E3E8]/70 font-bold dark:border-[#E2678A] dark:bg-[#3A1C26]/50'
                                : 'border-[#C7D2CE] bg-[#F7FAF8] dark:border-[#2A383D] dark:bg-[#141D21]'
                            }`}
                          >
                            <div className="pr-2">
                              <div className="break-words font-bold">{bank.name}</div>
                              <div className="mt-0.5 break-words text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                                {bank.categoryLabel}
                              </div>
                            </div>
                            <div className="shrink-0 text-right font-mono">
                              <span className="text-sm font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                                年 {(active ? selectedBank.baseRate : bank.baseRate).toFixed(2)}%
                              </span>
                              <span className="block text-[10px] text-[#5F6E72]">
                                審査金利 {bank.screeningRate}%
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* 金利方式・初期ベース金利・返済期間・団信の自由調整パネル */}
                    <div className="mt-4 space-y-4 rounded border border-[#C7D2CE] bg-[#F7FAF8] p-3.5 dark:border-[#2A383D] dark:bg-[#141D21]">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <span className="block text-xs font-semibold">
                            金利タイプ（変動・固定・ミックス）
                          </span>
                          <select
                            value={selectedBank.rateType}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              const rt = e.target.value as RateType;
                              setSetupConfig((p) => {
                                const ratio = p.mixFixedRatioPercent ?? 50;
                                const nextBase =
                                  rt === 'mix'
                                    ? Math.round(((2.18 * ratio + 0.82 * (100 - ratio)) / 100) * 100) / 100
                                    : p.customBaseRate;
                                return {
                                  ...p,
                                  customRateType: rt,
                                  mixFixedRatioPercent: rt === 'mix' ? ratio : p.mixFixedRatioPercent,
                                  customBaseRate: nextBase,
                                };
                              });
                            }}
                            className="mt-1 w-full rounded border border-[#C7D2CE] bg-[#EBF0ED] px-2.5 py-2 text-xs font-semibold dark:border-[#2A383D] dark:bg-[#1A2428]"
                          >
                            {(Object.keys(RATE_TYPE_LABELS) as RateType[]).map((rt) => (
                              <option key={rt} value={rt}>
                                {RATE_TYPE_LABELS[rt]}
                              </option>
                            ))}
                          </select>
                          {selectedBank.rateType === 'mix' && (
                            <div className="mt-2 rounded border border-[#0F6E68]/50 bg-[#DCEDEA]/40 p-2.5 dark:border-[#4CC0AF]/40 dark:bg-[#12302D]/40">
                              <div className="flex items-center justify-between text-[11px] font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                                <span>ミックス金利の「固定：変動」割合選択</span>
                                <span className="font-mono">
                                  固定 {setupConfig.mixFixedRatioPercent ?? 50}% ： 変動{' '}
                                  {100 - (setupConfig.mixFixedRatioPercent ?? 50)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={10}
                                max={90}
                                step={10}
                                value={setupConfig.mixFixedRatioPercent ?? 50}
                                onChange={(e) => {
                                  const ratio = Number(e.target.value);
                                  const calcMixBase =
                                    Math.round(((2.18 * ratio + 0.82 * (100 - ratio)) / 100) * 100) / 100;
                                  setSpawnMode('custom');
                                  setSetupConfig((p) => ({
                                    ...p,
                                    customRateType: 'mix',
                                    mixFixedRatioPercent: ratio,
                                    customBaseRate: calcMixBase,
                                  }));
                                }}
                                className="mt-1.5 w-full accent-[#0F6E68]"
                              />
                              <div className="mt-1 flex flex-wrap gap-1">
                                {[20, 30, 50, 70, 80].map((pct) => {
                                  const activeRatio = (setupConfig.mixFixedRatioPercent ?? 50) === pct;
                                  return (
                                    <button
                                      key={pct}
                                      type="button"
                                      onClick={() => {
                                        const calcMixBase =
                                          Math.round(((2.18 * pct + 0.82 * (100 - pct)) / 100) * 100) / 100;
                                        setSpawnMode('custom');
                                        setSetupConfig((p) => ({
                                          ...p,
                                          customRateType: 'mix',
                                          mixFixedRatioPercent: pct,
                                          customBaseRate: calcMixBase,
                                        }));
                                      }}
                                      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold transition ${
                                        activeRatio
                                          ? 'border-[#0F6E68] bg-[#0F6E68] text-white'
                                          : 'border-[#C7D2CE] bg-[#F7FAF8] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#141D21] dark:text-[#A3B2AF]'
                                      }`}
                                    >
                                      固定{pct}%:変動{100 - pct}%
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {selectedBank.rateType !== 'flat-35' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSpawnMode('custom');
                                setSetupConfig((p) => ({
                                  ...p,
                                  customHas5Year125Rule: !selectedBank.has5Year125Rule,
                                }));
                              }}
                              className="mt-1.5 w-full rounded border border-[#C7D2CE] bg-[#EBF0ED] px-2 py-1 text-left font-mono text-[11px] font-semibold dark:border-[#2A383D] dark:bg-[#1A2428]"
                            >
                              5年・125%ルール：
                              {selectedBank.has5Year125Rule
                                ? 'あり（5年間返済額据置・未払利息リスクあり）'
                                : 'なし（利上げ時に即座に毎月返済額が増額）'}
                            </button>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>初期ベース金利（銀行基準金利）</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSpawnMode('custom');
                                  setSetupConfig((p) => ({
                                    ...p,
                                    customBaseRate: Math.max(
                                      0.35,
                                      Number((selectedBank.baseRate - 0.05).toFixed(2)),
                                    ),
                                  }));
                                }}
                                className="rounded border border-[#C7D2CE] bg-[#EBF0ED] px-1.5 py-0.5 font-mono text-[11px] dark:border-[#2A383D] dark:bg-[#1A2428]"
                              >
                                -0.05%
                              </button>
                              <span className="font-mono text-sm font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                                {selectedBank.baseRate.toFixed(2)}%
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSpawnMode('custom');
                                  setSetupConfig((p) => ({
                                    ...p,
                                    customBaseRate: Math.min(
                                      4.5,
                                      Number((selectedBank.baseRate + 0.05).toFixed(2)),
                                    ),
                                  }));
                                }}
                                className="rounded border border-[#C7D2CE] bg-[#EBF0ED] px-1.5 py-0.5 font-mono text-[11px] dark:border-[#2A383D] dark:bg-[#1A2428]"
                              >
                                +0.05%
                              </button>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0.4}
                            max={4.5}
                            step={0.05}
                            value={selectedBank.baseRate}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                customBaseRate: Number(e.target.value),
                              }));
                            }}
                            className="mt-1.5 w-full accent-[#0F6E68]"
                          />
                          <div className="mt-1 flex flex-wrap gap-1">
                            {[0.68, 0.88, 1.05, 1.35, 1.58, 1.75, 2.24, 2.85].map((rVal) => (
                              <button
                                key={rVal}
                                type="button"
                                onClick={() => {
                                  setSpawnMode('custom');
                                  setSetupConfig((p) => ({ ...p, customBaseRate: rVal }));
                                }}
                                className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                                  Math.abs(selectedBank.baseRate - rVal) < 0.01
                                    ? 'border-[#0F6E68] bg-[#0F6E68] text-white'
                                    : 'border-[#C7D2CE] bg-[#EBF0ED] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                                }`}
                              >
                                {rVal.toFixed(2)}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 返済期間（20/25/30/35/40/45/50年ボタン＋10〜50年スライダー） */}
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-bold">
                            返済期間（20年〜50年・1年刻みで選択可能）
                          </span>
                          <span className="font-mono text-sm font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                            {setupConfig.termYears}年ローン（{setupConfig.age + setupConfig.termYears}歳完済）
                          </span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-4 gap-1 sm:grid-cols-7">
                          {([20, 25, 30, 35, 40, 45, 50] as LoanTermYears[]).map((yr) => (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => {
                                setSpawnMode('custom');
                                setSetupConfig((p) => ({ ...p, termYears: yr }));
                              }}
                              className={`rounded border py-1.5 font-mono text-xs font-bold ${
                                setupConfig.termYears === yr
                                  ? 'border-[#13212A] bg-[#13212A] text-white dark:border-[#E1E9E6] dark:bg-[#E1E9E6] dark:text-[#0D1316]'
                                  : 'border-[#C7D2CE] bg-[#EBF0ED] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                              }`}
                            >
                              {yr}年
                            </button>
                          ))}
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={50}
                          step={1}
                          value={setupConfig.termYears}
                          onChange={(e) => {
                            setSpawnMode('custom');
                            setSetupConfig((p) => ({ ...p, termYears: Number(e.target.value) }));
                          }}
                          className="mt-2 w-full accent-[#13212A]"
                        />
                      </div>

                      {/* 返済方式（元利均等/元金均等）・ボーナス返済・団信プラン＆上乗せ金利 */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <span className="block text-xs font-semibold">返済方式（元利均等 / 元金均等）</span>
                          <select
                            value={setupConfig.repaymentMethod}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                repaymentMethod: e.target.value as RepaymentMethod,
                              }));
                            }}
                            className="mt-1 w-full rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED] px-2.5 py-2 text-xs font-semibold dark:border-[#2A383D] dark:bg-[#1A2428]"
                          >
                            <option value="equal-payment">
                              元利均等返済（毎月の返済額が一定）
                            </option>
                            <option value="equal-principal">
                              元金均等返済（元金を定額返済・総利息が少ない）
                            </option>
                          </select>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold">
                            ボーナス併用返済の割合（0%＝毎月払いのみ推奨）
                          </span>
                          <div className="mt-1 grid grid-cols-4 gap-1">
                            {([0, 0.1, 0.2, 0.3] as const).map((br) => (
                              <button
                                key={br}
                                type="button"
                                onClick={() => {
                                  setSpawnMode('custom');
                                  setSetupConfig((p) => ({ ...p, bonusRepaymentRatio: br }));
                                }}
                                className={`rounded border py-1.5 font-mono text-xs font-bold ${
                                  setupConfig.bonusRepaymentRatio === br
                                    ? 'border-[#8C1D3C] bg-[#8C1D3C] text-white dark:border-[#E2678A] dark:bg-[#E2678A] dark:text-[#1B0910]'
                                    : 'border-[#C7D2CE] bg-[#EBF0ED] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                                }`}
                              >
                                {Math.round(br * 100)}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold">団体信用生命保険（団信プラン）</span>
                          <select
                            value={setupConfig.danshin}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              const dId = e.target.value as DanshinType;
                              setSetupConfig((p) => ({
                                ...p,
                                danshin: dId,
                                customDanshinSpread: DANSHIN_PLANS[dId].spreadRate,
                              }));
                            }}
                            className="mt-1 w-full rounded-[4px] border border-[#C7D2CE] bg-[#EBF0ED] px-2.5 py-2 text-xs font-semibold dark:border-[#2A383D] dark:bg-[#1A2428]"
                          >
                            {Object.values(DANSHIN_PLANS).map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#4A5A61] dark:text-[#A3B2AF]">
                            統計目安（35年返済中）：がん罹患 約20〜24% / 心筋梗塞・脳卒中 約8〜10% / 一般疾病療養 約25%
                          </p>
                        </div>

                        <label className="block text-xs">
                          <div className="flex justify-between font-semibold">
                            <span>団信の上乗せ金利（キャンペーン等で変更可）</span>
                            <span className="font-mono font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                              +{selectedDanshin.spreadRate.toFixed(2)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.5}
                            step={0.05}
                            value={selectedDanshin.spreadRate}
                            onChange={(e) => {
                              setSpawnMode('custom');
                              setSetupConfig((p) => ({
                                ...p,
                                customDanshinSpread: Number(e.target.value),
                              }));
                            }}
                            className="mt-2 w-full accent-[#0F6E68]"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 右5列：リアルタイム銀行本審査プレビュー票 ＆ 契約構造ビジュアル図解 */}
              <div className="lg:col-span-5">
                <div className="sticky top-6 space-y-4 rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 shadow-md sm:p-5 dark:border-[#2A383D] dark:bg-[#141D21]">
                  <div className="flex items-center justify-between border-b border-[#C7D2CE] pb-3 dark:border-[#2A383D]">
                    <div>
                      <span className="font-mono text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                        銀行融資審査部 · リアルタイム事前審査票
                      </span>
                      <h4 className="font-editorial text-lg font-bold">住宅ローン本審査プレビュー</h4>
                    </div>
                    <div className="rounded border-2 border-[#8C1D3C] px-3 py-1 text-center font-mono text-sm font-bold text-[#8C1D3C] dark:border-[#E2678A] dark:text-[#E2678A]">
                      判定 {liveUnderwriting.grade}
                    </div>
                  </div>

                  {/* 物件建築イラスト（選択中の価格・新築/中古・長期優良バッジ付） */}
                  <PropertyArchitecturalIllustration
                    propertyId={setupConfig.propertyId}
                    overrideSpec={selectedProperty}
                  />

                  {/* ローン契約構造・金利・団信の図解イラスト */}
                  <LoanStructureVisualSvg
                    config={setupConfig}
                    underwriting={liveUnderwriting}
                  />

                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-[#DCE4E1] pb-1.5 dark:border-[#1D282C]">
                      <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">契約年齢 → 完済予定年齢</dt>
                      <dd className="font-mono text-sm font-bold">
                        {setupConfig.age}歳 → {liveUnderwriting.maturityAge}歳（{setupConfig.termYears}年）
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-[#DCE4E1] pb-1.5 dark:border-[#1D282C]">
                      <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">自己資金 / 頭金・諸費用</dt>
                      <dd className="font-mono text-sm font-bold">
                        貯蓄{setupConfig.initialSavingsMan.toLocaleString()}万（頭金
                        {setupConfig.downPaymentMan}万・諸費用{liveUnderwriting.closingCostsMan}万）
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-[#DCE4E1] pb-1.5 dark:border-[#1D282C]">
                      <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">購入後の手元資金（スタート時キャッシュ）</dt>
                      <dd className="font-mono text-sm font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                        手元資金 {liveUnderwriting.cashRemainingAfterPurchaseMan.toLocaleString()}万円
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-[#DCE4E1] pb-1.5 dark:border-[#1D282C]">
                      <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">物件価格 / 借入元本（諸費用込）</dt>
                      <dd className="font-mono text-sm font-bold">
                        {selectedProperty.priceMan.toLocaleString()}万 / 借入
                        {liveUnderwriting.loanPrincipalMan.toLocaleString()}万円
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-[#DCE4E1] pb-1.5 dark:border-[#1D282C]">
                      <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">
                        適用金利（基準{selectedBank.baseRate.toFixed(2)}%＋団信{selectedDanshin.spreadRate.toFixed(2)}%）
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
                    <div className="flex justify-between">
                      <dt className="text-[#4A5A61] dark:text-[#A3B2AF]">住宅ローン控除（初年度目安）</dt>
                      <dd className="font-mono font-bold text-[#2B7A4E] dark:text-[#5CC38B]">
                        年 +{liveUnderwriting.maxTaxDeductionAnnualMan}万円 ×{' '}
                        {liveUnderwriting.taxDeductionYears}年
                      </dd>
                    </div>
                  </dl>

                  {liveUnderwriting.warnings.length > 0 && (
                    <div className="rounded bg-[#F3E2B3]/40 p-2.5 text-[11px] text-[#4A5A61] dark:bg-[#2A2212] dark:text-[#E2B04C]">
                      <div className="font-bold">審査部からの留意事項（全{liveUnderwriting.warnings.length}件）：</div>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {liveUnderwriting.warnings.map((w, i) => (
                          <li key={i} className="break-words">{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* メインCTA行 (.ctarow) */}
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#C7D2CE] pt-6 dark:border-[#2A383D]">
            <button
              type="button"
              onClick={handlePressBornButton}
              className="inline-flex items-center gap-3 rounded-[4px] bg-[#8C1D3C] px-8 py-4 text-lg font-semibold text-white shadow transition hover:brightness-110 dark:bg-[#E2678A] dark:text-[#1B0910]"
            >
              <span>
                {spawnMode === 'random'
                  ? 'ランダムに鍵を受け取る（抽選して始める）'
                  : 'この条件で鍵を受け取る（人生を始める）'}
              </span>
              <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              onClick={handleShuffleAllSetup}
              className="rounded-[4px] border border-[#0F6E68] bg-[#DCEDEA] px-5 py-4 text-sm font-bold text-[#0F6E68] transition hover:brightness-95 dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]"
            >
              条件をランダム再生成して確認する
            </button>
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
            全国12世帯モデル×12物件タイプ×ランダム条件からあなたの境遇とマイホームを抽選しています
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
  // フェーズ 2B: 「住宅ローン契約証書・本審査承認票」画面 (#cert)
  // ============================================================================
  if (viewStage === 'cert') {
    return (
      <div className="mx-auto max-w-3xl py-4">
        <div className="overflow-hidden rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] shadow-lg dark:border-[#2A383D] dark:bg-[#141D21]">
          {/* 証書ヘッダー帯 */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#13212A] px-6 py-3 text-white dark:bg-[#1A2428]">
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
            <div className="mb-5 rounded border border-[#0F6E68]/50 bg-[#DCEDEA]/60 p-3.5 text-xs text-[#0F6E68] dark:border-[#4CC0AF]/40 dark:bg-[#12302D]/60 dark:text-[#4CC0AF]">
              <div className="font-mono font-bold leading-relaxed">
                抽選プロファイル：{formatSetupProfileSummary(setupConfig)}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
                <div className="rounded bg-[#F7FAF8]/90 px-2.5 py-1.5 text-[#13212A] dark:bg-[#141D21]/90 dark:text-[#E1E9E6]">
                  <span className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">自己資金（購入前貯蓄）</span>
                  <b>{setupConfig.initialSavingsMan.toLocaleString()}万円</b>
                </div>
                <div className="rounded bg-[#F7FAF8]/90 px-2.5 py-1.5 text-[#13212A] dark:bg-[#141D21]/90 dark:text-[#E1E9E6]">
                  <span className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">頭金 / 諸費用</span>
                  <b>
                    頭金 {setupConfig.downPaymentMan.toLocaleString()}万 / 諸費用{' '}
                    {liveUnderwriting.closingCostsMan.toLocaleString()}万
                  </b>
                </div>
                <div className="rounded bg-[#F7FAF8]/90 px-2.5 py-1.5 text-[#13212A] dark:bg-[#141D21]/90 dark:text-[#E1E9E6]">
                  <span className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">購入後の手元資金（初期キャッシュ）</span>
                  <b className="text-[#0F6E68] dark:text-[#4CC0AF]">
                    手元資金 {liveUnderwriting.cashRemainingAfterPurchaseMan.toLocaleString()}万円
                  </b>
                </div>
                <div className="rounded bg-[#F7FAF8]/90 px-2.5 py-1.5 text-[#13212A] dark:bg-[#141D21]/90 dark:text-[#E1E9E6]">
                  <span className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">初年度 毎月返済額（実質住居費）</span>
                  <b className="text-[#8C1D3C] dark:text-[#E2678A]">
                    月 {liveUnderwriting.initialMonthlyPaymentMan}万（実質 月{liveUnderwriting.initialTotalMonthlyOutflowMan}万）
                  </b>
                </div>
              </div>
            </div>

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
                    {formatConsistentHouseholdTitle(setupConfig)}
                  </h2>
                  <p className="mt-1 text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
                    {EMPLOYMENT_LABELS[setupConfig.employment]} · 本人年収{setupConfig.mainIncomeMan}万
                    {setupConfig.subIncomeMan > 0 ? `＋配偶者${setupConfig.subIncomeMan}万` : ''} ·{' '}
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
                  overrideSpec={selectedProperty}
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

            <div className="mt-5">
              <LoanStructureVisualSvg
                config={setupConfig}
                underwriting={liveUnderwriting}
              />
            </div>

            {/* 契約主要数値フィールド */}
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-b border-[#C7D2CE] py-4 sm:grid-cols-3 dark:border-[#2A383D]">
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
                  自己資金 / 頭金・諸費用
                </span>
                <strong className="font-mono text-sm font-bold">
                  貯蓄{setupConfig.initialSavingsMan.toLocaleString()}万（頭金{setupConfig.downPaymentMan}万・諸費用{liveUnderwriting.closingCostsMan}万）
                </strong>
              </div>
              <div>
                <span className="block text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                  購入後の手元資金（スタート時キャッシュ）
                </span>
                <strong className="font-mono text-sm font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                  手元資金 {liveUnderwriting.cashRemainingAfterPurchaseMan.toLocaleString()}万円
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
                  返済期間・完済予定年齢・返済方式
                </span>
                <strong className="font-mono text-sm font-bold">
                  {setupConfig.termYears}年（{liveUnderwriting.maturityAge}歳完済・
                  {setupConfig.repaymentMethod === 'equal-principal' ? '元金均等' : '元利均等'}）
                </strong>
              </div>
              <div>
                <span className="block text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                  初年度 毎月返済額（実質住居費）
                </span>
                <strong className="font-mono text-sm font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                  ローン月{liveUnderwriting.initialMonthlyPaymentMan}万（実質 月{liveUnderwriting.initialTotalMonthlyOutflowMan}万円）
                </strong>
              </div>
              <div>
                <span className="block text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                  昇給カーブ / 退職金見込 / 60歳定年後
                </span>
                <strong className="font-mono text-xs font-bold">
                  {SALARY_CURVE_SPECS[effectiveCareerAndEdu.salaryCurve].shortLabel} /{' '}
                  {effectiveCareerAndEdu.retirementAllowanceMan === 0
                    ? '退職金なし(0万)'
                    : `退職金${effectiveCareerAndEdu.retirementAllowanceMan}万`}{' '}
                  / {POST_RETIREMENT_SPECS[effectiveCareerAndEdu.postRetirementWork].shortLabel}
                </strong>
              </div>
              <div>
                <span className="block text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                  配偶者の働き方・バイト転換
                </span>
                <strong className="font-mono text-xs font-bold">
                  {SPOUSE_WORK_SPECS[effectiveCareerAndEdu.spouseWorkPattern].shortLabel}（初期年収
                  {setupConfig.subIncomeMan}万）
                </strong>
              </div>
              <div>
                <span className="block text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                  子どもの教育進路・学資保険・奨学金
                </span>
                <strong className="font-mono text-xs font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                  {FAMILY_PLANS[setupConfig.familyPlan].childrenCount === 0
                    ? '子どもなし（DINKS・単身）'
                    : `${JUNIOR_HIGH_SPECS[effectiveCareerAndEdu.juniorHighPath].shortLabel}→${HIGHER_ED_SPECS[effectiveCareerAndEdu.higherEdPath].shortLabel} / 学資保険${effectiveCareerAndEdu.hasGakushiHoken ? 'あり' : 'なし'} / ${SCHOLARSHIP_SPECS[effectiveCareerAndEdu.scholarshipType].shortLabel}`}
                </strong>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
              <span>団信保障：{selectedDanshin.name}（+{selectedDanshin.spreadRate.toFixed(2)}%）</span>
              <span>
                火災・地震保険：{INSURANCE_PLAN_SPECS[effectiveCareerAndEdu.insurancePlan].shortLabel} / 固定資産税：基準年{selectedProperty.annualPropertyTaxMan}万円
              </span>
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
                別のランダム条件を抽選する
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpawnMode('custom');
                  setViewStage('intro');
                }}
                className="rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] px-4 py-2.5 text-xs font-semibold transition hover:border-[#5F6E72] dark:border-[#2A383D] dark:bg-[#141D21]"
              >
                年齢・物件・金利・期間を細かく設計し直す
              </button>
              <button
                type="button"
                onClick={() => {
                  const certShare = generateCertShareText(setupConfig);
                  handleOpenXIntent(certShare.intentUrl);
                }}
                className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#13212A] bg-[#13212A] px-3.5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 dark:border-[#E1E9E6] dark:bg-[#E1E9E6] dark:text-[#0D1316]"
              >
                <XLogoIcon className="h-3.5 w-3.5" />
                <span>本審査通過証書をXでシェア</span>
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
  // フェーズ 3 & 4: 本編3カラム ＆ 結末回顧録ビュー
  // ============================================================================
  const currentProperty = resolveEffectiveProperty(gameState.config);
  const currentBank = resolveEffectiveBank(gameState.config);
  const isMansionOrTower =
    currentProperty.buildingType === 'mansion' || currentProperty.buildingType === 'tower';

  return (
    <div className="space-y-5 pb-20 text-[#13212A] lg:pb-4 dark:text-[#E1E9E6]">
      {/* スティッキートップバー (.topbar) */}
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
                onClick={() => {
                  const liveShare = generateViralXShareText(gameState, 'standard');
                  handleOpenXIntent(liveShare.intentUrl);
                }}
                className="inline-flex items-center gap-1 rounded-[4px] border border-[#13212A] bg-[#13212A] px-2.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 dark:border-[#E1E9E6] dark:bg-[#E1E9E6] dark:text-[#0D1316]"
                title="現在の年齢・残債・手元資金をXで実況ポストします"
              >
                <XLogoIcon className="h-3 w-3" />
                <span>Xで実況</span>
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

            {/* 4. X（旧Twitter）結果シェア：公式最終精算認定証カード画像 × 同じ条件で挑戦URL */}
            {(() => {
              const currentShare = generateViralXShareText(gameState, 'standard');

              return (
                <div className="mt-6 rounded-[4px] border-2 border-[#13212A] bg-[#F0F4F2] p-5 shadow-md dark:border-[#4CC0AF] dark:bg-[#1A2428]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C7D2CE] pb-3.5 dark:border-[#2A383D]">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#13212A] text-white dark:bg-[#E1E9E6] dark:text-[#0D1316]">
                        <XLogoIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="font-editorial text-lg font-bold">
                          X（旧Twitter）で返済人生の結果をシェアする
                        </h3>
                        <p className="text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
                          シェアURLには「同じ世帯・物件・ローン条件で挑戦できる引き継ぎパラメータ」が自動付与されます
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenXIntent(currentShare.intentUrl)}
                      className="inline-flex items-center gap-2 rounded-[4px] bg-[#13212A] px-5 py-3 text-sm font-bold text-white shadow transition hover:opacity-90 dark:bg-[#E1E9E6] dark:text-[#0D1316]"
                    >
                      <XLogoIcon className="h-4 w-4" />
                      <span>結果をXにポストする →</span>
                    </button>
                  </div>

                  {/* プレビュー2カラム：左＝投稿テキスト＆アクションボタン / 右＝1200×630公式精算認定証カード画像 */}
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="flex flex-col justify-between rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 lg:col-span-6 dark:border-[#2A383D] dark:bg-[#141D21]">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#DCE4E1] pb-2 dark:border-[#1D282C]">
                          <span className="font-mono text-xs font-bold text-[#4A5A61] dark:text-[#A3B2AF]">
                            ポスト文面プレビュー（同じ条件での挑戦リンク付）
                          </span>
                          <span className="font-mono text-[11px] text-[#0F6E68] dark:text-[#4CC0AF]">
                            {currentShare.text.length}文字
                          </span>
                        </div>
                        <pre className="mt-2.5 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-[#13212A] dark:text-[#E1E9E6]">
                          {currentShare.text}
                        </pre>
                        <div className="mt-2 break-all rounded bg-[#EBF0ED] px-2.5 py-1.5 font-mono text-[10px] text-[#0F6E68] dark:bg-[#0D1316] dark:text-[#4CC0AF]">
                          挑戦URL: {currentShare.url}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#DCE4E1] pt-3 dark:border-[#1D282C]">
                        <button
                          type="button"
                          onClick={() => handleOpenXIntent(currentShare.intentUrl)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-[4px] bg-[#8C1D3C] px-4 py-2.5 text-xs font-bold text-white shadow transition hover:brightness-110 dark:bg-[#E2678A] dark:text-[#1B0910]"
                        >
                          <XLogoIcon className="h-3.5 w-3.5" />
                          <span>X（旧Twitter）でポストする</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyShareText(
                              `${currentShare.text}\n${currentShare.url}`,
                              '投稿文面と「同じ条件で挑戦するURL」をコピーしました！',
                            )
                          }
                          className="rounded-[4px] border border-[#0F6E68] bg-[#DCEDEA] px-3.5 py-2.5 text-xs font-bold text-[#0F6E68] transition hover:brightness-95 dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]"
                        >
                          文面＋挑戦URLをコピー
                        </button>
                      </div>
                    </div>

                    {/* 右：1200×630 公式最終精算認定証カード画像プレビュー＆ワンクリックコピー・保存 */}
                    <div className="flex flex-col justify-between rounded-[4px] border border-[#C7D2CE] bg-[#F7FAF8] p-4 lg:col-span-6 dark:border-[#2A383D] dark:bg-[#141D21]">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#DCE4E1] pb-2 dark:border-[#1D282C]">
                          <span className="font-mono text-xs font-bold text-[#4A5A61] dark:text-[#A3B2AF]">
                            公式最終精算認定証カード画像（1200×630）
                          </span>
                          <span className="font-mono text-[10px] font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                            コピーしてX投稿欄に貼付可能
                          </span>
                        </div>

                        {shareCardDataUrl ? (
                          <div className="mt-2.5 overflow-hidden rounded border border-[#C7D2CE] bg-[#13212A] shadow-sm dark:border-[#2A383D]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={shareCardDataUrl}
                              alt="マイホーム完済記 公式最終精算認定証カード"
                              className="h-auto w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="mt-2.5 flex h-44 items-center justify-center rounded border border-dashed border-[#C7D2CE] font-mono text-xs text-[#5F6E72]">
                            認定証カード画像を生成中...
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#DCE4E1] pt-3 dark:border-[#1D282C]">
                        <button
                          type="button"
                          onClick={handleCopyShareCardImage}
                          className="flex-1 rounded-[4px] border border-[#13212A] bg-[#13212A] px-3 py-2.5 text-xs font-bold text-white transition hover:opacity-90 dark:border-[#E1E9E6] dark:bg-[#E1E9E6] dark:text-[#0D1316]"
                        >
                          認定証画像をコピー（X投稿欄にそのまま貼付可）
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadShareCard}
                          className="rounded-[4px] border border-[#C7D2CE] bg-[#F0F4F2] px-3 py-2.5 text-xs font-bold text-[#13212A] transition hover:border-[#5F6E72] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#E1E9E6]"
                        >
                          PNG画像を保存
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleNativeShareWithImage(currentShare.text, currentShare.url)
                          }
                          className="rounded-[4px] border border-[#0F6E68] bg-[#DCEDEA] px-3 py-2.5 text-xs font-bold text-[#0F6E68] transition hover:brightness-95 dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]"
                        >
                          スマホで画像付きシェア
                        </button>
                      </div>
                    </div>
                  </div>

                  {shareFeedback && (
                    <div className="mt-3 rounded border border-[#0F6E68] bg-[#DCEDEA] px-3.5 py-2 text-center font-mono text-xs font-bold text-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]">
                      {shareFeedback}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* ========================================================================== */}
      {/* 重大決断モーダル（発生時は画面中央に決断カードを提示） */}
      {/* ========================================================================== */}
      {gameState.pendingDecision && (
        <section className="rounded-[4px] border-2 border-[#8C1D3C] bg-[#F7FAF8] p-4 shadow-2xl sm:p-6 dark:border-[#E2678A] dark:bg-[#141D21]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C7D2CE] pb-3 dark:border-[#2A383D]">
            <span className="font-mono text-xs font-bold text-[#8C1D3C] dark:text-[#E2678A]">
              人生の転機 · 決断が待っています（{gameState.age}歳 · 返済{gameState.yearIndex}年目）
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[#5F6E72] dark:text-[#8A9A96]">
                手元資金：{Math.round(gameState.liquidSavingsMan).toLocaleString()}万円 / 残債：
                {Math.round(gameState.remainingBalanceMan).toLocaleString()}万円
              </span>
              <button
                type="button"
                onClick={() => {
                  const decisionShare = generateViralXShareText(gameState, 'standard');
                  handleOpenXIntent(decisionShare.intentUrl);
                }}
                className="inline-flex items-center gap-1 rounded border border-[#13212A] bg-[#13212A] px-2.5 py-1 text-[11px] font-bold text-white transition hover:opacity-90 dark:border-[#E1E9E6] dark:bg-[#E1E9E6] dark:text-[#0D1316]"
              >
                <XLogoIcon className="h-3 w-3" />
                <span>この転機をXで実況</span>
              </button>
            </div>
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
      {/* メイン3カラムレイアウト (.wrap.life) */}
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
              <span>{currentBank.shortName}</span>
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
                  <div className="break-words text-sm font-bold leading-snug">
                    {formatConsistentHouseholdTitle(gameState.config)}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-[#0F6E68] dark:text-[#4CC0AF]">
                    借入開始 {gameState.config.age}歳 → 現在 {gameState.age}歳（返済{gameState.yearIndex}年目）
                  </div>
                  <div className="mt-0.5 break-words text-xs text-[#4A5A61] dark:text-[#A3B2AF]">
                    {currentProperty.shortName}（{currentProperty.priceMan.toLocaleString()}万円）
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
              <div className="flex justify-between">
                <span className="text-[#4A5A61] dark:text-[#A3B2AF]">固定資産税（年額）/ 保険</span>
                <b className="text-[11px]">
                  年{gameState.annualPropertyTaxCurrentMan ?? currentProperty.annualPropertyTaxMan}万 /{' '}
                  {INSURANCE_PLAN_SPECS[resolveEffectiveHouseholdCareerAndEdu(gameState.config).insurancePlan].shortLabel}
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
              家族と暮らし・キャリア＆教育進路
            </h3>
            {(() => {
              const careerEdu = resolveEffectiveHouseholdCareerAndEdu(gameState.config);
              const indepAge = getChildIndependenceAge(careerEdu.higherEdPath);
              const healthProbs = calcAnnualHealthRiskProbabilities(gameState.age);
              const dynamicFam = calcDynamicFamilyComposition(gameState);
              return (
                <>
                  <div className="mt-2.5 rounded border border-[#0F6E68]/40 bg-[#DCEDEA]/50 px-2.5 py-2 text-xs dark:border-[#4CC0AF]/40 dark:bg-[#12302D]/50">
                    <div className="flex items-center justify-between font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
                      <span>現在の家族構成（年とともに変化）</span>
                      <span className="font-mono">{dynamicFam.totalHouseholdMembers}人同居</span>
                    </div>
                    <div className="mt-0.5 font-semibold text-[#13212A] dark:text-[#E1E9E6]">
                      {dynamicFam.compositionLabel}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[#4A5A61] dark:text-[#A3B2AF]">
                      家族構成に応じた今年の基礎生活費：年{dynamicFam.annualBaseLivingCostMan}万円（結婚・出産・子の成長・独立で変動）
                    </div>
                  </div>
                  <ul className="mt-2.5 space-y-2 text-xs">
                    <li className="rounded bg-[#F0F4F2] p-2 dark:bg-[#1A2428]">
                      <div className="flex justify-between">
                        <span className="font-bold">本人（{gameState.age}歳）</span>
                        <span className="font-mono font-semibold text-[#0F6E68] dark:text-[#4CC0AF]">
                          年収 {gameState.mainIncomeMan}万円
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                        {gameState.currentJobLabel ?? EMPLOYMENT_LABELS[gameState.config.employment]}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-[#4A5A61] dark:text-[#A3B2AF]">
                        {SALARY_CURVE_SPECS[careerEdu.salaryCurve].shortLabel} ·{' '}
                        {careerEdu.retirementAllowanceMan === 0
                          ? '退職金制度なし(0万)'
                          : `60歳退職金見込 ${careerEdu.retirementAllowanceMan}万`}
                      </div>
                    </li>

                    {careerEdu.spouseWorkPattern !== 'no-spouse' && !gameState.isDivorced && (
                      <li className="rounded bg-[#F0F4F2] p-2 dark:bg-[#1A2428]">
                        <div className="flex justify-between">
                          <span className="font-bold">
                            配偶者（{Math.max(24, gameState.age - 1)}歳）
                          </span>
                          <span className="font-mono font-semibold">
                            年収 {gameState.subIncomeMan}万円
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
                          {gameState.currentSpouseJobLabel ??
                            SPOUSE_WORK_SPECS[careerEdu.spouseWorkPattern].shortLabel}
                        </div>
                      </li>
                    )}

                    {gameState.childrenAges.map((cAge, idx) => {
                      const stage =
                        cAge < 6
                          ? '未就学・保育'
                          : cAge < 10
                            ? '小学生（低〜中学年）'
                            : cAge < 12
                              ? careerEdu.juniorHighPath === 'private-exam-jhs'
                                ? '小4〜小6（中学受験・進学塾）'
                                : '小学生（高学年）'
                              : cAge < 15
                                ? careerEdu.juniorHighPath === 'private-exam-jhs'
                                  ? '私立中高一貫（中学課程）'
                                  : '公立中学生（部活・高校受験塾）'
                                : cAge < 18
                                  ? careerEdu.juniorHighPath === 'private-exam-jhs'
                                    ? '私立中高一貫（高校課程）'
                                    : '高校生（受験準備期）'
                                  : cAge < indepAge
                                    ? `${HIGHER_ED_SPECS[careerEdu.higherEdPath].shortLabel}在学中`
                                    : '独立・社会人';
                      return (
                        <li
                          key={idx}
                          className="flex items-center justify-between rounded bg-[#F0F4F2]/70 px-2 py-1.5 text-[#4A5A61] dark:bg-[#1A2428]/70 dark:text-[#A3B2AF]"
                        >
                          <span>
                            第{idx + 1}子（{cAge}歳）
                          </span>
                          <span className="font-mono text-[11px] font-semibold">{stage}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {gameState.childrenAges.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1 border-t border-[#DCE4E1] pt-2 font-mono text-[10px] text-[#4A5A61] dark:border-[#1D282C] dark:text-[#A3B2AF]">
                      <span className="rounded bg-[#DCEDEA] px-1.5 py-0.5 text-[#0F6E68] dark:bg-[#12302D] dark:text-[#4CC0AF]">
                        進路：{HIGHER_ED_SPECS[careerEdu.higherEdPath].shortLabel}
                      </span>
                      <span className="rounded bg-[#F0F4F2] px-1.5 py-0.5 dark:bg-[#1A2428]">
                        塾・予備校：{CRAM_SCHOOL_SPECS[careerEdu.cramSchoolPolicy].shortLabel}
                      </span>
                      <span className="rounded bg-[#F0F4F2] px-1.5 py-0.5 dark:bg-[#1A2428]">
                        学資保険：{careerEdu.hasGakushiHoken ? '加入(18歳+200万)' : '未加入'}
                      </span>
                      {careerEdu.higherEdPath !== 'high-school-job' && (
                        <span className="rounded bg-[#F0F4F2] px-1.5 py-0.5 dark:bg-[#1A2428]">
                          {SCHOLARSHIP_SPECS[careerEdu.scholarshipType].shortLabel}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-2.5 flex flex-wrap gap-1 border-t border-[#DCE4E1] pt-2 font-mono text-[10px] text-[#4A5A61] dark:border-[#1D282C] dark:text-[#A3B2AF]">
                    <span className="rounded bg-[#F0F4F2] px-1.5 py-0.5 dark:bg-[#1A2428]">
                      旅行・娯楽：{LEISURE_STYLE_SPECS[careerEdu.leisureStyle].shortLabel}
                    </span>
                    <span className="rounded bg-[#F3E3E8]/60 px-1.5 py-0.5 text-[#8C1D3C] dark:bg-[#3A1C26]/50 dark:text-[#E2678A]">
                      物価指数 {(gameState.cumulativePriceIndex ?? 100).toFixed(1)}（購入時=100）
                    </span>
                    <span className="rounded bg-[#F0F4F2] px-1.5 py-0.5 dark:bg-[#1A2428]">
                      修繕単価倍率 ×{(gameState.repairCostInflationMult ?? 1.0).toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-2.5 border-t border-[#DCE4E1] pt-2 font-mono text-[10px] text-[#5F6E72] dark:border-[#1D282C] dark:text-[#8A9A96]">
                    {gameState.age}歳時点の健康統計：がん罹患率 {(healthProbs.cancerProb * 100).toFixed(2)}%/年 ·
                    三大疾病 {(healthProbs.threeMajorProb * 100).toFixed(2)}%/年
                  </div>
                </>
              );
            })()}
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

              {/* 配偶者（奥さん・パートナー）が今年働くかどうかの毎年選択（配偶者あり・65歳未満の世帯で毎年いつでも選択可能） */}
              {resolveEffectiveHouseholdCareerAndEdu(gameState.config).hasSpouse &&
                !gameState.isDivorced &&
                gameState.age < 65 && (
                  <div className="mt-3.5 border-t border-[#DCE4E1] pt-3 dark:border-[#1D282C]">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold">
                        配偶者（奥さん・パートナー）の今年の働き方（毎年選択可能）
                      </span>
                      <span className="font-mono text-[10px] text-[#0F6E68] dark:text-[#4CC0AF]">
                        現在：{gameState.currentSpouseJobLabel}（年収{gameState.subIncomeMan}万円）
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playSe('click');
                          triggerVisualBadge('配偶者：正社員・職場復帰へ変更');
                          setGameState((prev) =>
                            prev ? setSpouseWorkStyleThisYear(prev, 'fulltime') : prev,
                          );
                        }}
                        className={`rounded-[4px] border px-2.5 py-2 text-left text-xs font-semibold transition ${
                          gameState.subIncomeMan >= 180
                            ? 'border-[#0F6E68] bg-[#DCEDEA] text-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]'
                            : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                        }`}
                      >
                        <div>正社員・フルタイム（職場復帰）</div>
                        <small className="block text-[10px] opacity-80">
                          専業・パートからの正社員復帰も可
                        </small>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playSe('click');
                          triggerVisualBadge('配偶者：パート・アルバイト勤務へ変更');
                          setGameState((prev) =>
                            prev ? setSpouseWorkStyleThisYear(prev, 'part-time') : prev,
                          );
                        }}
                        className={`rounded-[4px] border px-2.5 py-2 text-left text-xs font-semibold transition ${
                          gameState.subIncomeMan > 0 && gameState.subIncomeMan < 180
                            ? 'border-[#0F6E68] bg-[#DCEDEA] text-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]'
                            : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                        }`}
                      >
                        <div>パート・アルバイト勤務（年115万）</div>
                        <small className="block text-[10px] opacity-80">
                          正社員からパート転換・専業から開始
                        </small>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playSe('click');
                          triggerVisualBadge('配偶者：今年は働かない（専業主婦・夫）');
                          setGameState((prev) =>
                            prev ? setSpouseWorkStyleThisYear(prev, 'homemaker') : prev,
                          );
                        }}
                        className={`rounded-[4px] border px-2.5 py-2 text-left text-xs font-semibold transition ${
                          gameState.subIncomeMan === 0
                            ? 'border-[#8C1D3C] bg-[#F3E3E8]/70 text-[#8C1D3C] dark:border-[#E2678A] dark:bg-[#3A1C26]/50 dark:text-[#E2678A]'
                            : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                        }`}
                      >
                        <div>今年は働かない（専業・年収0円）</div>
                        <small className="block text-[10px] opacity-80">
                          家庭・育児・健康に専念する
                        </small>
                      </button>
                    </div>
                  </div>
                )}

              {/* 60歳定年後の今年の働き方・職種・「いつまで働くか」の毎年選択（60歳以降、毎年いつでも選択可能） */}
              {gameState.age >= 60 && (
                <div className="mt-3.5 border-t border-[#DCE4E1] pt-3 dark:border-[#1D282C]">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#8C1D3C] dark:text-[#E2678A]">
                      60歳以降の今年の働き方・いつまで働くか（毎年選択・いつでも引退可）
                    </span>
                    <span className="font-mono text-[10px] text-[#4A5A61] dark:text-[#A3B2AF]">
                      現在：{gameState.currentJobLabel}（年収{gameState.mainIncomeMan}万円）
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playSe('click');
                        triggerVisualBadge('60歳以降：嘱託再雇用・現職継続');
                        setGameState((prev) =>
                          prev ? setPostRetirementWorkThisYear(prev, 'reemploy-same') : prev,
                        );
                      }}
                      className={`rounded-[4px] border px-2.5 py-2 text-left text-xs font-semibold transition ${
                        gameState.config.postRetirementWork === 'reemploy-same'
                          ? 'border-[#0F6E68] bg-[#DCEDEA] text-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]'
                          : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                      }`}
                    >
                      <div>今年も嘱託再雇用・現職で働く</div>
                      <small className="block text-[10px] opacity-80">
                        これまでのキャリアを活かしてしっかり稼ぐ
                      </small>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playSe('click');
                        triggerVisualBadge('60歳以降：別職種（管理・事務・実務職）');
                        setGameState((prev) =>
                          prev ? setPostRetirementWorkThisYear(prev, 'reemploy-light-job') : prev,
                        );
                      }}
                      className={`rounded-[4px] border px-2.5 py-2 text-left text-xs font-semibold transition ${
                        gameState.config.postRetirementWork === 'reemploy-light-job'
                          ? 'border-[#0F6E68] bg-[#DCEDEA] text-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]'
                          : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                      }`}
                    >
                      <div>今年は別職種（管理・事務等）で働く</div>
                      <small className="block text-[10px] opacity-80">
                        責任の軽いシニア実務職へシフト
                      </small>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playSe('click');
                        triggerVisualBadge('60歳以降：週3〜4日アルバイト勤務');
                        setGameState((prev) =>
                          prev ? setPostRetirementWorkThisYear(prev, 'part-time-arubaito') : prev,
                        );
                      }}
                      className={`rounded-[4px] border px-2.5 py-2 text-left text-xs font-semibold transition ${
                        gameState.config.postRetirementWork === 'part-time-arubaito'
                          ? 'border-[#0F6E68] bg-[#DCEDEA] text-[#0F6E68] dark:border-[#4CC0AF] dark:bg-[#12302D] dark:text-[#4CC0AF]'
                          : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                      }`}
                    >
                      <div>今年は週3〜4日アルバイトで働く</div>
                      <small className="block text-[10px] opacity-80">
                        体力を守りながら短時間バイトで収入確保
                      </small>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playSe('stamp');
                        triggerVisualBadge(`${gameState.age}歳で仕事を辞めて完全引退！`);
                        setGameState((prev) =>
                          prev ? setPostRetirementWorkThisYear(prev, 'retire-now') : prev,
                        );
                      }}
                      className={`rounded-[4px] border px-2.5 py-2 text-left text-xs font-semibold transition ${
                        gameState.config.postRetirementWork === 'full-retire-60' ||
                        gameState.config.postRetirementWork === 'retire-65-pension-only'
                          ? 'border-[#8C1D3C] bg-[#F3E3E8] text-[#8C1D3C] dark:border-[#E2678A] dark:bg-[#3A1C26] dark:text-[#E2678A]'
                          : 'border-[#C7D2CE] bg-[#F0F4F2] text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]'
                      }`}
                    >
                      <div>今年で仕事を辞めて完全引退（働かない）</div>
                      <small className="block text-[10px] opacity-80">
                        {gameState.age >= 65
                          ? '今年からアルバイトも辞めて公的年金のみで暮らす'
                          : '今年から無職・完全リタイアして貯蓄で暮らす'}
                      </small>
                    </button>
                  </div>
                </div>
              )}

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
                      disabled={
                        gameState.currentMgmtAndRepairMonthlyMan <= 2.2 ||
                        gameState.triggeredEventIds.includes('prop-act-mansion-board-reform')
                      }
                      onClick={() => {
                        audioManager.playSe('stamp');
                        triggerVisualBadge('理事会改革：管理委託費見直し -0.6万/月');
                        setGameState((prev) =>
                          prev ? executePropertySpecificAction(prev, 'mansion-board-reform') : prev,
                        );
                      }}
                      className="rounded-[4px] border border-[#0F6E68]/60 bg-[#F0F4F2] px-2.5 py-2 text-left text-xs font-semibold transition hover:border-[#0F6E68] disabled:opacity-40 dark:border-[#4CC0AF]/50 dark:bg-[#1A2428]"
                    >
                      <div>
                        管理組合の理事会改革・管理委託見直し
                        {gameState.triggeredEventIds.includes('prop-act-mansion-board-reform')
                          ? '（実行済）'
                          : ''}
                      </div>
                      <small className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">
                        相見積もりで管理費等 -0.6万/月・資産価値+80万
                      </small>
                    </button>
                    <button
                      type="button"
                      disabled={
                        gameState.currentMgmtAndRepairMonthlyMan <= 2.0 ||
                        gameState.triggeredEventIds.includes('prop-act-mansion-release-parking')
                      }
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
                      <div>
                        マイカー手放し・機械式駐車場解約
                        {gameState.triggeredEventIds.includes('prop-act-mansion-release-parking')
                          ? '（実行済）'
                          : ''}
                      </div>
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
                        gameState.triggeredEventIds.includes('prop-act-detached-solar-battery')
                      }
                      onClick={() => {
                        audioManager.playSe('stamp');
                        triggerVisualBadge('屋根太陽光＋蓄電池設置 -130万円');
                        setGameState((prev) =>
                          prev
                            ? executePropertySpecificAction(prev, 'detached-solar-battery')
                            : prev,
                        );
                      }}
                      className="rounded-[4px] border border-[#0F6E68]/60 bg-[#F0F4F2] px-2.5 py-2 text-left text-xs font-semibold transition hover:border-[#0F6E68] disabled:opacity-40 dark:border-[#4CC0AF]/50 dark:bg-[#1A2428]"
                    >
                      <div>
                        屋根太陽光＋蓄電池の後付け設置（-130万）
                        {gameState.triggeredEventIds.includes('prop-act-detached-solar-battery')
                          ? '（実行済）'
                          : ''}
                      </div>
                      <small className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">
                        戸建て特権で光熱費・売電収支 -1.3万/月・価値+100万
                      </small>
                    </button>
                    <button
                      type="button"
                      disabled={
                        gameState.liquidSavingsMan < 60 ||
                        gameState.triggeredEventIds.includes('prop-act-detached-diy-maint')
                      }
                      onClick={() => {
                        audioManager.playSe('stamp');
                        triggerVisualBadge('自主防蟻・外壁コーキング補修 -35万円');
                        setGameState((prev) =>
                          prev ? executePropertySpecificAction(prev, 'detached-diy-maint') : prev,
                        );
                      }}
                      className="rounded-[4px] border border-[#0F6E68]/60 bg-[#F0F4F2] px-2.5 py-2 text-left text-xs font-semibold transition hover:border-[#0F6E68] disabled:opacity-40 dark:border-[#4CC0AF]/50 dark:bg-[#1A2428]"
                    >
                      <div>
                        自主防蟻・外壁コーキング予防メンテ（-35万）
                        {gameState.triggeredEventIds.includes('prop-act-detached-diy-maint')
                          ? '（実行済）'
                          : ''}
                      </div>
                      <small className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">
                        躯体劣化を防ぎ建物評価額+75万・維持費抑制
                      </small>
                    </button>
                  </div>
                )}
              </div>

              {/* いつでも実行できる繰上返済・借換・住み替え・売却ボタン */}
              <div className="mt-3.5 border-t border-[#DCE4E1] pt-3 dark:border-[#1D282C]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold">
                    お金を使う · 住宅ローン防衛＆マイホーム住み替え手続き
                  </span>
                  {gameState.currentHomeLabel && (
                    <span className="rounded bg-[#DCEDEA] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#0F6E68] dark:bg-[#12302D] dark:text-[#4CC0AF]">
                      現在：{gameState.currentHomeLabel}
                    </span>
                  )}
                </div>
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
                    disabled={(gameState.relocationCount ?? 0) >= 2 || gameState.remainingBalanceMan <= 0}
                    onClick={() => {
                      audioManager.playSe('stamp');
                      triggerVisualBadge('ステップアップ住み替え：広い新居へ買い替え');
                      setGameState((prev) =>
                        prev ? executeRelocateProperty(prev, 'upgrade-wider') : prev,
                      );
                    }}
                    className="rounded-[4px] border border-[#0F6E68]/80 bg-[#F0F4F2] px-2.5 py-2 text-left text-xs font-semibold transition hover:border-[#0F6E68] disabled:opacity-40 dark:border-[#4CC0AF]/60 dark:bg-[#1A2428]"
                  >
                    <div>
                      広い新居へステップアップ住み替え
                      {(gameState.relocationCount ?? 0) >= 2 ? '（上限）' : ''}
                    </div>
                    <small className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">
                      現居を売却し上位物件へ買い替え（物件価値+1,150万・幸福度+12）
                    </small>
                  </button>
                  <button
                    type="button"
                    disabled={(gameState.relocationCount ?? 0) >= 2 || gameState.remainingBalanceMan <= 0}
                    onClick={() => {
                      audioManager.playSe('stamp');
                      triggerVisualBadge('コンパクト住み替え：売却差益で残債大幅圧縮！');
                      setGameState((prev) =>
                        prev ? executeRelocateProperty(prev, 'downsize-compact') : prev,
                      );
                    }}
                    className="rounded-[4px] border border-[#0F6E68]/80 bg-[#F0F4F2] px-2.5 py-2 text-left text-xs font-semibold transition hover:border-[#0F6E68] disabled:opacity-40 dark:border-[#4CC0AF]/60 dark:bg-[#1A2428]"
                  >
                    <div>
                      コンパクト住み替え（残債＆維持費圧縮）
                      {(gameState.relocationCount ?? 0) >= 2 ? '（上限）' : ''}
                    </div>
                    <small className="block text-[10px] text-[#5F6E72] dark:text-[#8A9A96]">
                      現居売却→手頃な新居へ買い替え、差益で残債を約900万円削減！
                    </small>
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
                    <div>自宅を時価（{gameState.propertyValueMan}万）で売却して終了</div>
                    <small className="block text-[10px] opacity-80">ローンを一括精算し賃貸へ移る</small>
                  </button>
                  <button
                    type="button"
                    disabled={gameState.remainingBalanceMan <= 0}
                    onClick={() => {
                      audioManager.playSe('card');
                      triggerVisualBadge('日銀の途中利上げ（政策金利 +0.50%）発生');
                      setGameState((prev) =>
                        prev ? executeMidTermRateHike(prev, 0.5) : prev,
                      );
                    }}
                    className="rounded-[4px] border border-[#B0362B]/60 bg-[#F3E3E8]/40 px-2.5 py-2 text-left text-xs font-semibold text-[#B0362B] transition hover:bg-[#F3E3E8] disabled:opacity-40 sm:col-span-2 dark:border-[#F07B6B]/60 dark:bg-[#3A1C26]/40 dark:text-[#F07B6B]"
                  >
                    <div>日銀の途中利上げ（政策金利 +0.50%）を今すぐ発生させて耐久テスト</div>
                    <small className="block text-[10px] opacity-80">
                      返済途中の急な利上げで変動金利・5年125%ルール・家計収支がどう変化するか即座に検証できます（自動でも途中利上げが入ります）
                    </small>
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
