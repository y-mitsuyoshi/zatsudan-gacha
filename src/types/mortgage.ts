export type ContractType = 'single' | 'pair' | 'income-merge';
export type RepaymentMethod = 'equal-payment' | 'equal-principal';
export type LoanTermYears = 25 | 35 | 50;
export type RateType = 'variable' | 'fixed-10' | 'flat-35' | 'mix';
export type DanshinType = 'basic' | 'cancer-50' | 'three-major-100' | 'all-disease-pair';
export type PropertyCategory =
  | 'tower-mansion-new'
  | 'station-mansion-new'
  | 'suburban-mansion-used'
  | 'detached-custom-new'
  | 'detached-powerbuilder-new'
  | 'detached-used'
  | 'regional-mansion-new'
  | 'luxury-penthouse-new';

export type EnergyCertType = 'long-term-excellent' | 'zeh' | 'standard' | 'non-compliant';
export type FamilyPlanType = 'dinks' | 'child-1-public' | 'child-1-private' | 'child-2-public' | 'child-2-private' | 'child-3';
export type MacroRegimeId = 'gradual-hike' | 'stagflation-shock' | 'asset-bubble' | 'deflation-return' | 'dynamic-random';
export type BankId = 'net-bank' | 'mega-bank' | 'regional-bank' | 'flat35-agency' | 'neo-mix-bank';
export type EmploymentType = 'listed-corp' | 'civil-servant' | 'mega-venture' | 'sme' | 'freelance';

export interface HouseholdArchetype {
  id: string;
  title: string;
  subtitle: string;
  percentileLabel: string; // 例: "日本の住宅購入世帯の上位 14.2%"
  age: number;
  employment: EmploymentType;
  mainIncomeMan: number; // 本人額面年収(万円)
  subIncomeMan: number; // 配偶者額面年収(万円)
  initialSavingsMan: number; // 初期自己資金(万円)
  hasCreditBlemish: boolean; // クレカ延滞歴・奨学金残債等
  recommendedContract: ContractType;
  recommendedFamily: FamilyPlanType;
  recommendedProperty: PropertyCategory;
  description: string;
}

export interface PropertySpec {
  id: PropertyCategory;
  name: string;
  shortName: string;
  buildingType: 'mansion' | 'tower' | 'detached';
  isNew: boolean;
  builtAge: number; // 築年数（新築は0）
  locationLabel: string;
  priceMan: number; // 物件価格(万円)
  landRatio: number; // 土地価格比率 (0.0〜1.0)
  energyCert: EnergyCertType;
  initialMgmtFeeMonthlyMan: number; // 初期管理費(万円/月)
  initialRepairFeeMonthlyMan: number; // 初期修繕積立金(万円/月)
  parkingMonthlyMan: number; // 駐車場・駐輪場(万円/月)
  annualPropertyTaxMan: number; // 固定資産税・都市計画税(万円/年・基準額)
  landAnnualTrendRate: number; // 基準地価変動率(年率)
  utilityMonthlyDiffMan: number; // 省エネ・断熱による光熱費差額(万円/月)
  description: string;
  riskNote: string;
}

export interface BankSpec {
  id: BankId;
  name: string;
  shortName: string;
  categoryLabel: string;
  rateType: RateType;
  baseRate: number; // 初期適用金利(%)
  screeningRate: number; // 審査金利(%)
  maxDtiPercent: number; // 返済負担率上限(%)
  supports50Years: boolean;
  has5Year125Rule: boolean; // 変動金利の5年ルール・125%ルール有無
  upfrontFeeRate: number; // 事務手数料率 (例: 0.022 = 2.2%)
  rescheduleFlexibility: number; // 条件変更(リスケ)柔軟度 (1〜3)
  description: string;
  badgeText: string;
}

export interface DanshinSpec {
  id: DanshinType;
  name: string;
  shortName: string;
  spreadRate: number; // 上乗せ金利(%)
  cancerCoverage: number; // がん診断時の残債免除率 (0, 0.5, 1.0)
  threeMajorCoverage: number; // 心筋梗塞・脳卒中時の免除率 (0, 1.0)
  disabilityCoverage: boolean; // 就業不能・全疾病保障
  pairCrossCoverage: boolean; // ペアローン連生保障（配偶者有事でも両方免除）
  description: string;
}

export interface MortgageSetupConfig {
  archetypeId: string;
  age: number;
  employment: EmploymentType;
  mainIncomeMan: number;
  subIncomeMan: number;
  initialSavingsMan: number;
  downPaymentMan: number; // 頭金投入額(万円)
  hasCreditBlemish: boolean;
  contractType: ContractType;
  familyPlan: FamilyPlanType;
  propertyId: PropertyCategory;
  bankId: BankId;
  termYears: LoanTermYears;
  repaymentMethod: RepaymentMethod;
  bonusRepaymentRatio: number; // 0 (ボーナス払いなし) | 0.2 (20%ボーナス併用)
  danshin: DanshinType;
  macroRegime: MacroRegimeId;
}

export interface UnderwritingResult {
  approved: boolean;
  ConditionalReductionMan: number; // 減額承認された場合の減額幅(万円)
  grade: 'S' | 'A' | 'B' | 'C' | 'REJECTED';
  loanPrincipalMan: number; // 借入元本(万円)
  closingCostsMan: number; // 諸費用合計(万円: 事務手数料・登記・火災地震保険・引越)
  cashRemainingAfterPurchaseMan: number; // 入居時の手元残キャッシュ(万円)
  effectiveInitialRate: number; // 団信・優遇込み初期実質金利(%)
  stressDtiPercent: number; // 審査金利での返済負担率(%)
  actualDtiPercent: number; // 実行金利での返済負担率(%)
  ltvPercent: number; // 担保掛目 LTV(%)
  maturityAge: number; // 完済予定年齢
  initialMonthlyPaymentMan: number; // 初年度毎月返済額(万円・ボーナス月除く)
  initialBonusPaymentMan: number; // ボーナス月加算額(万円/回・年2回)
  initialMonthlyRunningCostMan: number; // 管理費+修繕積立+駐車場+固定資産税月割(万円)
  initialTotalMonthlyOutflowMan: number; // 実質毎月住居費総額(万円)
  maxTaxDeductionAnnualMan: number; // 住宅ローン控除(初年度還付目安・万円/年)
  taxDeductionYears: number; // 控除期間 (13年 or 10年 or 0年)
  warnings: string[];
  bankComment: string;
}

export interface YearlySnapshot {
  yearIndex: number; // 1..50
  calendarYear: number; // 2026..2076
  age: number;
  bojPolicyRate: number; // 日銀政策金利(%)
  appliedInterestRate: number; // 適用住宅ローン金利(%)
  inflationRate: number; // 物価上昇率(%)
  householdGrossIncomeMan: number; // 額面世帯年収(万円)
  householdNetIncomeMan: number; // 手取り世帯年収(万円)
  annualLoanPaymentMan: number; // 年間ローン返済総額(万円)
  annualPrincipalPaidMan: number; // うち元金充当額(万円)
  annualInterestPaidMan: number; // うち利息支払額(万円)
  unpaidInterestMan: number; // 未払利息累積額(万円・5年ルール超過分)
  annualRunningCostMan: number; // 管理費・修繕積立・固定資産税・光熱費差分(万円)
  annualLivingAndEduCostMan: number; // 基本生活費＋教育費(万円)
  annualTaxCreditMan: number; // 住宅ローン控除還付額(万円)
  annualCashFlowMan: number; // 年間収支(万円)
  remainingBalanceMan: number; // 年末ローン残債(万円)
  propertyValueMan: number; // 年末自宅推定時価(万円)
  landValueMan: number; // うち土地評価額(万円)
  buildingValueMan: number; // うち建物評価額(万円)
  liquidSavingsMan: number; // 年末手元キャッシュ・NISA資産(万円)
  netEquityMan: number; // 純資産 (手元資産 + 自宅時価 - ローン残債 - 未払利息)
  mentalScore: number; // 家族・メンタル幸福度 (0..100)
  isOverLoan: boolean; // 残債 > 自宅時価
}

export interface ChronicleEntry {
  id: number;
  yearIndex: number;
  calendarYear: number;
  age: number;
  category: 'macro' | 'rate-revision' | 'life' | 'property' | 'danshin' | 'crisis' | 'action' | 'milestone';
  tone: 'good' | 'bad' | 'mixed' | 'neutral';
  title: string;
  body: string;
  statNote?: string; // 統計データ補足（例: "日本の35年ローン利用者のうち約18%が直面する局面"）
  financialDeltaLabel?: string;
}

export interface DecisionChoice {
  id: string;
  label: string;
  subLabel: string;
  outcomeSummary: string;
  cashDeltaMan?: number;
  principalDeltaMan?: number;
  incomeMultiplierDelta?: number;
  subIncomeMultiplierDelta?: number;
  mentalDelta?: number;
  newRateType?: RateType;
  newBaseRate?: number;
  termDeltaYears?: number;
  repairCostMonthlyDeltaMan?: number;
  buildingValueBonusMan?: number;
  sellProperty?: boolean;
  triggerDivorce?: boolean;
}

export interface MortgageDecisionEvent {
  id: string;
  yearIndex: number;
  age: number;
  category: 'boj-shock' | 'repair-crisis' | 'education' | 'career' | 'health-danshin' | 'pair-crisis' | 'retirement' | 'bankruptcy-brink';
  title: string;
  description: string;
  statisticalContext: string;
  choices: DecisionChoice[];
}

export type EndingRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'BANKRUPT';

export type FocusModeId =
  | 'balanced'
  | 'frugal-prepay'
  | 'nisa-invest'
  | 'career-sidejob'
  | 'family-health';

export interface CompanionHousehold {
  id: string;
  familyName: string;
  label: string;
  propertyShort: string;
  loanSetupLabel: string;
  age: number;
  remainingBalanceMan: number;
  liquidSavingsMan: number;
  netEquityMan: number;
  status: 'playing' | 'paid-off' | 'sold' | 'bankrupt';
  statusText: string;
}

export interface OutcomeFactor {
  type: 'positive' | 'negative' | 'info';
  title: string;
  detail: string;
  impactLabel: string;
}

export interface MortgageEnding {
  id: string;
  rank: EndingRank;
  title: string;
  subtitle: string;
  epilogue: string;
  statisticComparison: string;
}

export interface MortgageGameState {
  config: MortgageSetupConfig;
  underwriting: UnderwritingResult;
  status: 'playing' | 'cleared' | 'sold-escaped' | 'bankrupt';
  yearIndex: number;
  calendarYear: number;
  age: number;
  termRemainingYears: number;
  remainingBalanceMan: number;
  unpaidInterestMan: number;
  liquidSavingsMan: number;
  propertyValueMan: number;
  landValueMan: number;
  buildingValueMan: number;
  bojPolicyRate: number;
  appliedInterestRate: number;
  last5YearRulePaymentMan: number; // 5年ルール適用中の月返済上限基準
  yearsSinceLast5YearRevision: number;
  currentRateType: RateType;
  has5Year125Rule: boolean;
  mainIncomeMan: number;
  subIncomeMan: number;
  currentMgmtAndRepairMonthlyMan: number;
  mentalScore: number;
  healthScore?: number; // 心身の健康度 (0..100)
  focusMode?: FocusModeId; // 今年の重点方針
  companions?: CompanionHousehold[]; // 同じ日に鍵を受け取った4世帯
  arrearsMonths: number; // 延滞月数 (6ヶ月到達で代位弁済・競売破産)
  rescheduleYearsLeft: number; // リスケ(元金返済猶予)残り年数
  danshinTriggered: boolean;
  isDivorced: boolean;
  childrenAges: number[];
  totalPrincipalPaidMan: number;
  totalInterestPaidMan: number;
  totalRunningCostPaidMan: number;
  totalTaxCreditReceivedMan: number;
  totalPrepaymentMan: number;
  history: YearlySnapshot[];
  chronicle: ChronicleEntry[];
  pendingDecision: MortgageDecisionEvent | null;
  triggeredEventIds: string[];
  ending: MortgageEnding | null;
  score: number;
}
