export type ContractType = 'single' | 'pair' | 'income-merge';
export type RepaymentMethod = 'equal-payment' | 'equal-principal';
export type LoanTermYears = number; // 10〜50年（20/25/30/35/40/50年＋1年刻み自由設定）
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
  | 'luxury-penthouse-new'
  | 'compact-mansion-new'
  | 'detached-semi-order-zeh'
  | 'detached-regional-spacious'
  | 'detached-kominka-reno';

export type EnergyCertType = 'long-term-excellent' | 'zeh' | 'standard' | 'non-compliant';
export type FamilyPlanType = 'dinks' | 'child-1-public' | 'child-1-private' | 'child-2-public' | 'child-2-private' | 'child-3';
export type MacroRegimeId = 'gradual-hike' | 'stagflation-shock' | 'asset-bubble' | 'deflation-return' | 'dynamic-random';
export type BankId =
  | 'net-bank'
  | 'mega-bank'
  | 'regional-bank'
  | 'flat35-agency'
  | 'neo-mix-bank'
  | 'fixed10-step-bank'
  | 'coop-welfare-bank';
export type EmploymentType = 'listed-corp' | 'civil-servant' | 'mega-venture' | 'sme' | 'freelance';

export type SalaryCurveType =
  | 'steady-up' // 順調昇給・昇進型（毎年昇給＋昇進あり）
  | 'standard-plateau' // 標準・40代後半頭打ち型
  | 'flat-stagnant' // 横ばい・昇給なし型（物価が上がっても給料据え置き）
  | 'performance-volatile' // 成果主義・業績変動型（上がる年も下がる年もある）
  | 'downward-pressure'; // 業績低迷・減収リスク型（手当削減や業界縮小で下がる）

export type PostRetirementWorkType =
  | 'reemploy-same' // 60歳定年後も嘱託再雇用・現職継続（現役時の約6割収入）
  | 'reemploy-light-job' // 60歳定年後は別職種へ転身（管理員・事務・軽作業等・年収260万）
  | 'part-time-arubaito' // 60歳定年後はアルバイト・パート勤務（週3〜4日・年収130万）
  | 'full-retire-60'; // 60歳で完全リタイア・定年後は働かない（65歳年金まで勤労収入0円）

export type SpouseWorkPatternType =
  | 'fulltime-keep' // 正社員フルタイム継続（定年後も再雇用/パート継続）
  | 'shift-to-part' // 途中で正社員→パート・アルバイトへ転換（年収120万円前後）
  | 'part-time' // パート・アルバイト勤務（年収100〜140万円）
  | 'homemaker-to-part' // 専業主婦（夫）→ 子育て一段落後にパート・バイト開始
  | 'homemaker' // 専業主婦（夫）・収入0円
  | 'no-spouse'; // 独身・単身世帯（配偶者なし）

export type JuniorHighPathType =
  | 'public-jhs' // 公立中学校（中学受験なし）
  | 'private-exam-jhs'; // 中学受験あり・私立中高一貫校（小4〜小6の進学塾＋私立中高）

export type HigherEdPathType =
  | 'national-univ' // 国公立大学（4年制）
  | 'private-arts-univ' // 私立大学・文系（4年制）
  | 'private-science-univ' // 私立大学・理系/医療/情報（4年制）
  | 'vocational-2yr' // 専門学校・短期大学（2年制・20歳で独立就職）
  | 'high-school-job'; // 高校卒業後に就職（大学・専門進学なし・18歳で独立）

export type ScholarshipType =
  | 'none' // 奨学金は借りない（親が全額負担）
  | 'jasso-loan' // 貸与型奨学金を利用（親の学費負担を年60万円軽減）
  | 'grant-workstudy'; // 給付型奨学金＋学生アルバイト併用（親の学費負担を年90万円軽減）

export type FireEarthquakeInsuranceType =
  | 'full-fire-earthquake-water' // フル補償（火災・風災・水災・破損汚損＋地震保険＋家財・個人賠償特約）
  | 'standard-fire-earthquake' // 標準プラン（火災・風災＋地震保険付帯・水災なし）
  | 'minimal-fire-only'; // 最安プラン（火災・風災のみ / 地震保険なし・水災なし）

export type CramSchoolPolicyType =
  | 'intensive-cram' // 積極通塾（小学生習い事・中高進学塾・季節講習・大学受験予備校フル活用）
  | 'standard-cram' // 標準通塾（高校・大学受験学年を中心に進学塾・講習を受講）
  | 'minimal-self-study'; // 通信教育・自習中心（塾代を最小限に抑え通信教材で学習）

export type LeisureStyleType =
  | 'active-travel' // 旅行・レジャー積極派（毎年の家族旅行・温泉・テーマパーク・趣味を満喫）
  | 'moderate-leisure' // 標準バランス派（年1回の国内旅行・週末の外食・レジャー）
  | 'frugal-staycation'; // 節約・近場派（旅行や外食を控え、近場レジャー・おうち娯楽で貯蓄優先）

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
  // マイホーム条件の自由カスタマイズ・ランダム数値オーバーライド
  customPropertyPriceMan?: number;
  customLandRatio?: number;
  customBuildingType?: 'mansion' | 'tower' | 'detached';
  customIsNew?: boolean;
  customBuiltAge?: number;
  customEnergyCert?: EnergyCertType;
  customMgmtAndRepairMonthlyMan?: number;
  // 銀行・金利・期間・団信の自由カスタマイズ・ランダム数値オーバーライド
  bankId: BankId;
  customRateType?: RateType;
  customBaseRate?: number;
  customHas5Year125Rule?: boolean;
  termYears: LoanTermYears;
  repaymentMethod: RepaymentMethod;
  bonusRepaymentRatio: number; // 0 (ボーナス払いなし) 〜 0.4 (40%ボーナス併用)
  danshin: DanshinType;
  customDanshinSpread?: number;
  macroRegime: MacroRegimeId;
  randomRollSummary?: string;
  // キャリア・給与カーブ・退職金・定年後・配偶者の働き方パラメータ
  salaryCurve?: SalaryCurveType;
  retirementAllowanceMan?: number; // 60歳定年時の退職金見込額(万円): 0(退職金制度なし) 〜 2800万円
  postRetirementWork?: PostRetirementWorkType;
  spouseWorkPattern?: SpouseWorkPatternType;
  // 子どもの教育詳細パラメータ（子どもがいる世帯のみ有効）
  juniorHighPath?: JuniorHighPathType;
  higherEdPath?: HigherEdPathType;
  cramSchoolPolicy?: CramSchoolPolicyType; // 入塾・習い事・予備校方針
  hasGakushiHoken?: boolean; // 学資保険の有無（0〜17歳に年11万積立→18歳時に満期200万円受取）
  scholarshipType?: ScholarshipType;
  // 火災保険・地震保険プラン ＆ 旅行・娯楽費スタイル
  insurancePlan?: FireEarthquakeInsuranceType;
  leisureStyle?: LeisureStyleType;
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
  newMainIncomeAbsoluteMan?: number;
  newSubIncomeAbsoluteMan?: number;
  newJobLabel?: string;
  newSpouseJobLabel?: string;
  newJuniorHighPath?: JuniorHighPathType;
  newHigherEdPath?: HigherEdPathType;
  newScholarshipType?: ScholarshipType;
  newInsurancePlan?: FireEarthquakeInsuranceType;
  newCramSchoolPolicy?: CramSchoolPolicyType;
  newLeisureStyle?: LeisureStyleType;
  addNewbornChild?: boolean;
  newHasGakushiHoken?: boolean;
}

export interface MortgageDecisionEvent {
  id: string;
  yearIndex: number;
  age: number;
  category:
    | 'boj-shock'
    | 'repair-crisis'
    | 'education'
    | 'career'
    | 'health-danshin'
    | 'pair-crisis'
    | 'retirement'
    | 'bankruptcy-brink'
    | 'life';
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
  currentJobLabel?: string;
  currentSpouseJobLabel?: string;
  currentMgmtAndRepairMonthlyMan: number;
  annualPropertyTaxCurrentMan?: number;
  cumulativePriceIndex?: number; // 契約時=100.0 とした累積物価指数（生活コスト上昇反映）
  repairCostInflationMult?: number; // 契約時=1.00 とした建築資材・修繕費高騰倍率
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
