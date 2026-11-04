import {
  BankId,
  BankSpec,
  ChronicleEntry,
  CompanionHousehold,
  ContractType,
  CramSchoolPolicyType,
  DanshinSpec,
  DanshinType,
  EmploymentType,
  FamilyPlanType,
  FireEarthquakeInsuranceType,
  FocusModeId,
  HigherEdPathType,
  HouseholdArchetype,
  JuniorHighPathType,
  LeisureStyleType,
  LoanTermYears,
  MacroRegimeId,
  MortgageDecisionEvent,
  MortgageEnding,
  MortgageGameState,
  MortgageSetupConfig,
  OutcomeFactor,
  PostRetirementWorkType,
  PropertyCategory,
  PropertySpec,
  RateType,
  RelocationPlanType,
  RepaymentMethod,
  SalaryCurveType,
  ScholarshipType,
  SpouseWorkPatternType,
  UnderwritingResult,
  YearlySnapshot,
} from '@/types/mortgage';

export const SALARY_CURVE_SPECS: Record<
  SalaryCurveType,
  { id: SalaryCurveType; label: string; shortLabel: string; description: string }
> = {
  'steady-up': {
    id: 'steady-up',
    label: '順調昇給・昇進型（右肩上がり）',
    shortLabel: '順調昇給型',
    description: '年功＋昇進で50代前半まで着実に年収が伸び、役職定年の影響も軽微なキャリア。',
  },
  'standard-plateau': {
    id: 'standard-plateau',
    label: '標準・40代後半頭打ち＋55歳役職定年型',
    shortLabel: '標準頭打ち型',
    description: '40代半ばまで緩やかに昇給した後に頭打ちとなり、55歳役職定年で収入が約2割下がる標準モデル。',
  },
  'flat-stagnant': {
    id: 'flat-stagnant',
    label: '昇給なし・横ばい型（物価高に弱い）',
    shortLabel: '昇給なし横ばい',
    description: 'インフレや年齢上昇があっても基本給がほとんど上がらず、実質購買力が目減りしやすい給与体系。',
  },
  'performance-volatile': {
    id: 'performance-volatile',
    label: '成果主義・業績変動型（上がる年も下がる年も）',
    shortLabel: '業績変動型',
    description: '好業績の年は大きく跳ねる一方、不調時は賞与カットや年俸減額で年収が下がる実力主義型。',
  },
  'downward-pressure': {
    id: 'downward-pressure',
    label: '業績低迷・減収リスク型（徐々に下がる）',
    shortLabel: '減収リスク型',
    description: '業界縮小や手当廃止により、年齢を重ねても給与が上がらずむしろ下がりやすい厳しい環境。',
  },
};

export const POST_RETIREMENT_SPECS: Record<
  PostRetirementWorkType,
  { id: PostRetirementWorkType; label: string; shortLabel: string; jobTitle: string; description: string }
> = {
  'reemploy-same': {
    id: 'reemploy-same',
    label: '60歳以降も嘱託再雇用・専門職で継続（現役時の約60%収入）',
    shortLabel: '60歳嘱託再雇用',
    jobTitle: '嘱託再雇用・シニア社員',
    description: '60歳定年後も同じ職場・同職種で再雇用契約を結び、65歳まで現役時の約6割の年収を確保。',
  },
  'reemploy-light-job': {
    id: 'reemploy-light-job',
    label: '60歳以降は別職種へ転身（管理員・事務・軽作業等：年250万）',
    shortLabel: '60歳別職種へ転身',
    jobTitle: '別職種シニア社員（管理・事務職）',
    description: '定年を機にプレッシャーの少ない別職種（ビル管理・施設事務・送迎等）へ転身して働く。',
  },
  'part-time-arubaito': {
    id: 'part-time-arubaito',
    label: '60歳以降は週3〜4日アルバイト・パート勤務（年140万）',
    shortLabel: '60歳以降アルバイト',
    jobTitle: 'シニアアルバイト・パート勤務',
    description: '定年後はフルタイムを退き、健康維持を兼ねて週3〜4日のアルバイト・パート（年約140万円）で働く。',
  },
  'retire-65-pension-only': {
    id: 'retire-65-pension-only',
    label: '65歳定年後は働かない（60〜64歳は再雇用 → 65歳から完全引退・年金のみ）',
    shortLabel: '65歳から働かない（年金のみ）',
    jobTitle: '60〜64歳再雇用 → 65歳完全引退',
    description:
      '60〜64歳までは再雇用で働くが、65歳以降はアルバイト等も一切せず完全リタイアし、公的年金と貯蓄のみで悠々自適に暮らす。',
  },
  'full-retire-60': {
    id: 'full-retire-60',
    label: '60歳定年後は一切働かない（60歳で完全リタイア・無職 / 貯蓄と年金のみ）',
    shortLabel: '60歳から働かない（完全引退）',
    jobTitle: '完全リタイア（定年後働かない・無職）',
    description:
      '60歳定年で仕事を完全に辞め、定年後は一切働かない（勤労収入0円）。65歳の年金開始までは退職金と貯蓄を取り崩し、65歳以降も年金のみで暮らす。',
  },
};

export const SPOUSE_WORK_SPECS: Record<
  SpouseWorkPatternType,
  { id: SpouseWorkPatternType; label: string; shortLabel: string; initialJobTitle: string; description: string }
> = {
  'fulltime-keep': {
    id: 'fulltime-keep',
    label: '正社員・フルタイム共働き継続（退職金・厚生年金あり）',
    shortLabel: '配偶者：正社員継続',
    initialJobTitle: '正社員フルタイム',
    description: '配偶者も正社員として定年までフルタイム勤務を継続し、世帯の2馬力エンジンを維持します。',
  },
  'shift-to-part': {
    id: 'shift-to-part',
    label: '当初は社員 → 途中でパート・アルバイトへ転換（年120万へ）',
    shortLabel: '配偶者：途中バイト・パート化',
    initialJobTitle: '正社員（後にパート転換予定）',
    description: '購入当初は社員として働くが、育児や生活変化により途中でパート・アルバイト勤務（年約120万円）へシフト。',
  },
  'part-time': {
    id: 'part-time',
    label: 'パート・アルバイト勤務（年100〜140万円前後）',
    shortLabel: '配偶者：パート・バイト',
    initialJobTitle: 'パート・アルバイト勤務',
    description: '家事・子育てと両立しやすいパート・アルバイト（接客・事務・軽作業等）で毎年100〜140万円を稼ぐ。',
  },
  'homemaker-to-part': {
    id: 'homemaker-to-part',
    label: '当初は専業主婦(夫) → 子育て後にパート・バイト開始（年108万）',
    shortLabel: '配偶者：専業→後にバイト開始',
    initialJobTitle: '専業主婦（夫）',
    description: '購入時は収入0円だが、子どもが成長したタイミング（または返済5年目）からパート・アルバイトを始める。',
  },
  homemaker: {
    id: 'homemaker',
    label: '専業主婦(夫)を継続（配偶者収入 0円・家事育児専念）',
    shortLabel: '配偶者：専業主婦(夫)',
    initialJobTitle: '専業主婦（夫）',
    description: '配偶者は就労せず家庭を支える1馬力モデル。本人の収入変動や病気リスクへの備えが重要。',
  },
  'no-spouse': {
    id: 'no-spouse',
    label: '独身・単身世帯（配偶者なし・完全1人暮らし）',
    shortLabel: '単身・配偶者なし',
    initialJobTitle: '単身世帯（配偶者なし）',
    description: '配偶者や子どものいない単身購入モデル。夫婦・子育てイベントは発生せず、自身のキャリアと老後資金が軸。',
  },
};

export const JUNIOR_HIGH_SPECS: Record<
  JuniorHighPathType,
  { id: JuniorHighPathType; label: string; shortLabel: string; description: string }
> = {
  'public-jhs': {
    id: 'public-jhs',
    label: '公立中学校ルート（中学受験なし・地域の公立中へ進学）',
    shortLabel: '公立中（中受なし）',
    description: '小学校高学年の過熱する中学受験塾代（年120万）を回避し、高校・大学資金に向けて貯蓄を温存します。',
  },
  'private-exam-jhs': {
    id: 'private-exam-jhs',
    label: '中学受験・私立中高一貫ルート（小4〜小6塾代＋私立中高学費）',
    shortLabel: '中学受験・私立中高',
    description: '小4〜小6の進学塾費用（年約118万）と私立中高6年間の学費（年105〜142万）が重くのしかかります。',
  },
};

export const HIGHER_ED_SPECS: Record<
  HigherEdPathType,
  { id: HigherEdPathType; label: string; shortLabel: string; description: string }
> = {
  'national-univ': {
    id: 'national-univ',
    label: '国公立大学（4年制：学費＋生活費 年約98万円）',
    shortLabel: '国公立大学',
    description: '授業料が年約54万円と標準的で、4年間の学費・教育関連費は1人あたり約430万円規模。',
  },
  'private-arts-univ': {
    id: 'private-arts-univ',
    label: '私立大学・文系（4年制：学費＋生活費 年約138万円）',
    shortLabel: '私立大学（文系）',
    description: '日本の大学生で最も多いボリュームゾーン。入学金＋4年間で1人あたり約600万円規模。',
  },
  'private-science-univ': {
    id: 'private-science-univ',
    label: '私立大学・理系/医療系（4年制：学費＋実験実習費 年約182万円）',
    shortLabel: '私立大学（理系）',
    description: '実験・設備費が高く、入学金＋4年間で1人あたり約790万円規模の大型教育支出となります。',
  },
  'vocational-2yr': {
    id: 'vocational-2yr',
    label: '専門学校・短期大学（2年制：18〜19歳のみ年132万 → 20歳で就職独立）',
    shortLabel: '専門学校・短大(2年)',
    description: '実務資格を取得する2年制。18〜19歳の2年間で完結し、20歳からは社会人として独立するため総額を抑えられます。',
  },
  'high-school-job': {
    id: 'high-school-job',
    label: '高校卒業後に就職・独立（大学・専門への進学なし：18歳で独立）',
    shortLabel: '高卒就職（18歳独立）',
    description: '18歳の高校卒業と同時に就職して独立。18歳以降の大学・専門学費がかからないため家計余力が大きく向上します。',
  },
};

export const SCHOLARSHIP_SPECS: Record<
  ScholarshipType,
  { id: ScholarshipType; label: string; shortLabel: string; annualReliefMan: number; description: string }
> = {
  none: {
    id: 'none',
    label: '奨学金は借りない（親が学費・進学費用を全額負担）',
    shortLabel: '奨学金なし(親全額)',
    annualReliefMan: 0,
    description: '子どもに借金を背負わせず親の貯蓄と収入から全額を出しますが、50代の家計キャッシュフローは厳しくなります。',
  },
  'jasso-loan': {
    id: 'jasso-loan',
    label: '貸与型奨学金（JASSO月5万）を利用（親の負担を年▲60万円軽減）',
    shortLabel: '貸与型奨学金(年-60万)',
    annualReliefMan: 60,
    description: '大学生の約3人に1人が利用する貸与型奨学金を活用し、在学中の親の学費持ち出しを年間60万円軽減します。',
  },
  'grant-workstudy': {
    id: 'grant-workstudy',
    label: '給付型奨学金・授業料減免＋学生バイト併用（親の負担を年▲90万円軽減）',
    shortLabel: '給付奨学金＋学生バイト',
    annualReliefMan: 90,
    description: '成績基準や多子世帯減免、子ども自身の学生アルバイトを組み合わせ、親の年間負担を90万円圧縮します。',
  },
};

export const CRAM_SCHOOL_SPECS: Record<
  CramSchoolPolicyType,
  {
    id: CramSchoolPolicyType;
    label: string;
    shortLabel: string;
    elementaryExtraMan: number; // 小学生期の習い事・進学塾上乗せ(万円/年)
    jhsCramAnnualMan: number; // 中1〜中3の高校受験塾・季節講習(万円/年)
    hsYobikoAnnualMan: number; // 高1〜高3の大学受験予備校・講習(万円/年)
    description: string;
  }
> = {
  'intensive-cram': {
    id: 'intensive-cram',
    label: '早期入塾・進学塾＋夏期講習・大学受験予備校フル活用',
    shortLabel: '進学塾・予備校フル',
    elementaryExtraMan: 24,
    jhsCramAnnualMan: 46,
    hsYobikoAnnualMan: 68,
    description:
      '小学生からの英語・プログラミング・進学塾に加え、中学の高校受験塾・夏期冬期講習、高校の大手予備校まで惜しまず投資します（教育費負担は大）。',
  },
  'standard-cram': {
    id: 'standard-cram',
    label: '標準（小中は習い事・中2〜中3通塾＋高2〜高3で受験塾）',
    shortLabel: '標準通塾（中2〜・高2〜）',
    elementaryExtraMan: 8,
    jhsCramAnnualMan: 26,
    hsYobikoAnnualMan: 34,
    description:
      '文部科学省「子供の学習費調査」の平均水準。中学後半と高校後半の受験期を中心に通塾・季節講習を利用します。',
  },
  'minimal-self-study': {
    id: 'minimal-self-study',
    label: '通信教育・オンライン教材・自習中心（塾代・講習費を最小化）',
    shortLabel: '通信教育・自習中心',
    elementaryExtraMan: 0,
    jhsCramAnnualMan: 6,
    hsYobikoAnnualMan: 10,
    description:
      '高額な対面進学塾や夏期講習は控え、月数千円のオンライン学習サービスと学校の補習・自習室を活用して教育費を抑えます。',
  },
};

export const LEISURE_STYLE_SPECS: Record<
  LeisureStyleType,
  {
    id: LeisureStyleType;
    label: string;
    shortLabel: string;
    baseAnnualCostSingleMan: number;
    baseAnnualCostCoupleMan: number;
    perChildExtraMan: number;
    annualMentalDelta: number;
    description: string;
  }
> = {
  'active-travel': {
    id: 'active-travel',
    label: '毎年しっかり家族旅行・レジャー満喫（年48万〜＋物価連動）',
    shortLabel: '毎年旅行・レジャー充実',
    baseAnnualCostSingleMan: 36,
    baseAnnualCostCoupleMan: 48,
    perChildExtraMan: 14,
    annualMentalDelta: 2,
    description:
      '年に1〜2回の国内温泉・沖縄/北海道旅行やテーマパーク、週末のレジャー・外食をしっかり楽しみ、家族の思い出と幸福度を高めます（宿泊・レジャー物価高の影響大）。',
  },
  'moderate-leisure': {
    id: 'moderate-leisure',
    label: '標準バランス（年1回の近場旅行・帰省＋月1〜2回の外食：年24万〜）',
    shortLabel: '標準（近場旅行・外食）',
    baseAnnualCostSingleMan: 18,
    baseAnnualCostCoupleMan: 24,
    perChildExtraMan: 8,
    annualMentalDelta: 1,
    description:
      'オフシーズンやふるさと納税宿泊券を活用して年1回の旅行と週末ドライブを楽しみ、家計と娯楽のバランスを取ります。',
  },
  'frugal-staycation': {
    id: 'frugal-staycation',
    label: '節約・おうち時間＆近隣公園中心（旅行は控えめ：年10万〜）',
    shortLabel: '節約・おうち時間中心',
    baseAnnualCostSingleMan: 8,
    baseAnnualCostCoupleMan: 10,
    perChildExtraMan: 4,
    annualMentalDelta: -1,
    description:
      'ホテル代が高騰する旅行やテーマパークは控え、マイホームでのBBQ・動画配信・市立施設やデイキャンプで娯楽費を最小限に抑えます。',
  },
};

export const INSURANCE_PLAN_SPECS: Record<
  FireEarthquakeInsuranceType,
  {
    id: FireEarthquakeInsuranceType;
    label: string;
    shortLabel: string;
    fiveYearCostDetachedMan: number; // 戸建て5年更新保険料目安(万円)
    fiveYearCostMansionMan: number; // マンション(RC耐火)5年更新保険料目安(万円)
    fiveYearCostTowerMan: number; // タワマン5年更新保険料目安(万円)
    hasEarthquake: boolean;
    hasWaterFlood: boolean;
    description: string;
  }
> = {
  'full-fire-earthquake-water': {
    id: 'full-fire-earthquake-water',
    label: 'フル補償（火災・風災・水災・破損汚損 ＋ 地震保険 ＋ 個人賠償特約）',
    shortLabel: '火災＋水災＋地震フル補償',
    fiveYearCostDetachedMan: 26,
    fiveYearCostMansionMan: 15,
    fiveYearCostTowerMan: 18,
    hasEarthquake: true,
    hasWaterFlood: true,
    description:
      '5年ごとの更新保険料は高めですが、大型台風・ゲリラ豪雨浸水・震度6強の大地震・給排水管水漏れ賠償までほぼ全額カバーされる万全の盾。',
  },
  'standard-fire-earthquake': {
    id: 'standard-fire-earthquake',
    label: '標準プラン（火災・風災 ＋ 地震保険付帯 / 水災補償なし）',
    shortLabel: '火災＋地震保険（水災なし）',
    fiveYearCostDetachedMan: 18,
    fiveYearCostMansionMan: 11,
    fiveYearCostTowerMan: 13,
    hasEarthquake: true,
    hasWaterFlood: false,
    description:
      'ハザードマップで浸水リスクが低い地域やマンション中高層階で選ばれる標準プラン。大地震には備えつつ水災を外して保険料を抑えます。',
  },
  'minimal-fire-only': {
    id: 'minimal-fire-only',
    label: '最安プラン（火災・風災のみ / 地震保険なし・水災なし）',
    shortLabel: '火災のみ最安（地震・水災なし）',
    fiveYearCostDetachedMan: 9,
    fiveYearCostMansionMan: 5,
    fiveYearCostTowerMan: 6,
    hasEarthquake: false,
    hasWaterFlood: false,
    description:
      '銀行融資の最低条件である火災保険のみ加入し5年更新費を最安に抑えますが、大地震や豪雨水害が起きた際は保険金が下りず全額自己負担となります。',
  },
};

/**
 * 固定資産税・都市計画税の年次実効額（万円/年）を算出する
 * - 新築住宅の建物部分は軽減措置（一般戸建て3年、長期優良戸建て5年、一般マンション5年、長期優良マンション7年）により当初半額
 * - 軽減期間終了の翌年（4年目・6年目・8年目）に建物分の固定資産税が2倍に跳ね上がる「新築軽減終了の崖」を再現
 * - 3年ごとの固定資産税評価替え（地価変動と建物経年減点補正）も反映
 */
export function calcEffectiveAnnualPropertyTaxMan(
  property: PropertySpec,
  yearIndex: number,
  currentLandValueMan: number,
  initialLandValueMan: number,
): {
  annualTaxMan: number;
  reductionEndYear: number;
  isReductionJustExpired: boolean;
} {
  const reductionEndYear = !property.isNew
    ? 0
    : property.buildingType === 'detached'
      ? property.energyCert === 'long-term-excellent'
        ? 5
        : 3
      : property.energyCert === 'long-term-excellent'
        ? 7
        : 5;

  const isReductionJustExpired = reductionEndYear > 0 && yearIndex === reductionEndYear + 1;

  // 初期基準額のうち約42%が土地分、約58%が建物分（新築軽減適用中）
  const baseLandTax = property.annualPropertyTaxMan * 0.42;
  const baseBuildingTaxReduced = property.annualPropertyTaxMan * 0.58;

  // 3年ごとの評価替えタイミングで土地路線価トレンドを反映
  const revalStep = Math.floor(yearIndex / 3) * 3;
  const landRatioChange =
    initialLandValueMan > 0 ? Math.max(0.65, Math.min(1.65, currentLandValueMan / initialLandValueMan)) : 1;
  const effectiveLandTax =
    revalStep > 0 ? baseLandTax * (0.3 + 0.7 * landRatioChange) : baseLandTax;

  // 建物評価額は経年減点補正率で徐々に下がる（RCマンションは45年かけて緩やかに減価、木造戸建ては25年で下限20%へ）
  const ageYears = property.builtAge + yearIndex;
  const buildingAgeDecay =
    property.buildingType === 'detached'
      ? Math.max(0.35, 1 - ageYears * 0.022)
      : Math.max(0.48, 1 - ageYears * 0.012);

  // 新築軽減期間終了後は建物分の軽減（1/2）が外れて約1.85倍に跳ね上がる
  const postReductionMult =
    reductionEndYear > 0 && yearIndex > reductionEndYear ? 1.85 : 1.0;

  const effectiveBuildingTax = baseBuildingTaxReduced * postReductionMult * buildingAgeDecay;
  const annualTaxMan = Math.max(6, Math.round((effectiveLandTax + effectiveBuildingTax) * 10) / 10);

  return {
    annualTaxMan,
    reductionEndYear,
    isReductionJustExpired,
  };
}


export const FOCUS_MODES: Record<
  FocusModeId,
  { id: FocusModeId; label: string; effectHint: string }
> = {
  balanced: {
    id: 'balanced',
    label: '標準バランス',
    effectHint: '生活と貯蓄のバランスを保ちながら無理なく返済します。',
  },
  'frugal-prepay': {
    id: 'frugal-prepay',
    label: '徹底節約・貯蓄優先',
    effectHint: '外食・娯楽を控え、年間支出を約35万円圧縮して手元資金を厚くします（幸福度 -1/年）。',
  },
  'nisa-invest': {
    id: 'nisa-invest',
    label: '新NISA・積極運用',
    effectHint: '余剰資金をインデックス投資へ回し、運用利回りを高めます（好景気で+5%、不況時は変動あり）。',
  },
  'career-sidejob': {
    id: 'career-sidejob',
    label: '本業昇給・副業集中',
    effectHint: 'スキルアップと副業に注力し、年間手取り収入を+25〜40万円底上げします（健康 -1/年）。',
  },
  'family-health': {
    id: 'family-health',
    label: '家族と健康を最優先',
    effectHint: '人間ドックや家族の時間を大切にし、心身の健康と家族の幸福度を毎年回復します（年20万円）。',
  },
};

export const RELOCATION_PLAN_SPECS: Record<
  RelocationPlanType,
  {
    id: RelocationPlanType;
    label: string;
    shortLabel: string;
    priceDeltaMan: number;
    maintDeltaMonthlyMan: number;
    mentalBonus: number;
    homeLabel: string;
    description: string;
  }
> = {
  'upgrade-wider': {
    id: 'upgrade-wider',
    label: '広いファミリー向け・上位グレード新居へステップアップ住み替え（物件価値 +1,150万円）',
    shortLabel: '広い新居へステップアップ住み替え',
    priceDeltaMan: 1150,
    maintDeltaMonthlyMan: 0.4,
    mentalBonus: 12,
    homeLabel: '住み替え新居（広々ファミリー邸宅）',
    description:
      '現在の家を時価売却し、仲介手数料・登記諸費用を精算した上で、部屋数が多く快適な上位物件へ買い替えます。',
  },
  'downsize-compact': {
    id: 'downsize-compact',
    label: '駅近コンパクト・手頃な住まいへダウンサイジング住み替え（差益でローン残債を約900万円圧縮！）',
    shortLabel: 'コンパクト住み替え（残債・維持費圧縮）',
    priceDeltaMan: -1080,
    maintDeltaMonthlyMan: -0.7,
    mentalBonus: 6,
    homeLabel: '住み替え新居（駅近コンパクト住戸）',
    description:
      '現在の家を売却し、価格と維持費が抑えられたコンパクト住戸へ買い替えます。売却差額でローン残債と毎月の固定費を一気に減らせます。',
  },
  'suburban-shift': {
    id: 'suburban-shift',
    label: '郊外・準都心のゆとり住環境へ資産組み替え住み替え（差益でローン残債を約460万円圧縮）',
    shortLabel: '郊外ゆとり住み替え（広さと残債軽減を両立）',
    priceDeltaMan: -620,
    maintDeltaMonthlyMan: -0.4,
    mentalBonus: 9,
    homeLabel: '住み替え新居（郊外ゆとり邸宅）',
    description:
      '価格が高いエリアの自宅を売却し、広さと自然環境を確保しつつ価格が手頃な準都心・郊外エリアへ住み替えます。',
  },
};

function createInitialCompanions(): CompanionHousehold[] {
  return [
    {
      id: 'comp-tower',
      familyName: 'モデル世帯A（32歳・都心共働き）',
      label: '都心タワマン 8,480万',
      propertyShort: '湾岸タワマン高層階',
      loanSetupLabel: 'ネット銀変動0.68%・ペア35年',
      age: 32,
      remainingBalanceMan: 7600,
      liquidSavingsMan: 480,
      netEquityMan: 520,
      status: 'playing',
      statusText: 'Wローン控除で順調スタート',
    },
    {
      id: 'comp-detached',
      familyName: 'モデル世帯B（34歳・近郊会社員）',
      label: '注文戸建て 5,680万',
      propertyShort: '都市近郊・太陽光ZEH戸建',
      loanSetupLabel: 'フラット35S固定2.24%・単独35年',
      age: 34,
      remainingBalanceMan: 4980,
      liquidSavingsMan: 420,
      netEquityMan: 680,
      status: 'playing',
      statusText: '全期間固定で金利上昇リスク0',
    },
    {
      id: 'comp-50yr',
      familyName: 'モデル世帯C（28歳・若手共働き）',
      label: '新築建売 4,180万',
      propertyShort: '郊外ニュータウン4LDK',
      loanSetupLabel: '地銀50年変動1.05%・合算',
      age: 28,
      remainingBalanceMan: 4050,
      liquidSavingsMan: 240,
      netEquityMan: 80,
      status: 'playing',
      statusText: '50年ローンで月返済を抑え中',
    },
    {
      id: 'comp-used',
      familyName: 'モデル世帯D（37歳・堅実派）',
      label: '築20年中古マンション 3,880万',
      propertyShort: '準都心リノベ済3LDK',
      loanSetupLabel: 'メガバンク変動0.88%・単独35年',
      age: 37,
      remainingBalanceMan: 3280,
      liquidSavingsMan: 640,
      netEquityMan: 980,
      status: 'playing',
      statusText: '借入を抑え手元資金に余裕',
    },
  ];
}

export const ARCHETYPES: HouseholdArchetype[] = [
  {
    id: 'steady-couple-station',
    title: '首都圏・共働き駅近マンション世帯',
    subtitle: '34歳・正社員×正社員（世帯年収 1,020万円）',
    percentileLabel: 'SUUMO首都圏新築マンション契約者の標準共働きモデル（構成比 16.4%）',
    age: 34,
    employment: 'listed-corp',
    mainIncomeMan: 640,
    subIncomeMan: 380,
    initialSavingsMan: 1100,
    hasCreditBlemish: false,
    recommendedContract: 'pair',
    recommendedFamily: 'child-2-public',
    recommendedProperty: 'station-mansion-new',
    description:
      'SUUMO首都圏新築マンション契約者平均（約7,300万円）の駅近マンションをペアローンで購入する王道モデル。子ども2人の教育費ピークと変動金利上昇・修繕積立金増額をどう乗り切るかが勝負。',
  },
  {
    id: 'civil-servant-single',
    title: '地方公務員・単独ローン堅実戸建て世帯',
    subtitle: '31歳・公務員単独（世帯年収 580万円）',
    percentileLabel: '新築戸建て購入世帯の代表的ボリュームゾーン（構成比 15.2%）',
    age: 31,
    employment: 'civil-servant',
    mainIncomeMan: 580,
    subIncomeMan: 0,
    initialSavingsMan: 780,
    hasCreditBlemish: false,
    recommendedContract: 'single',
    recommendedFamily: 'child-2-public',
    recommendedProperty: 'detached-powerbuilder-new',
    description:
      '銀行審査の信用力は抜群で失業リスクも極めて低い。ただし1馬力のためインフレ局面での実質賃金目減りや郊外地価の下落（オーバーローン化）に注意が必要。',
  },
  {
    id: 'young-50yr-challenger',
    title: '28歳・50年超長期ローン注文住宅世帯',
    subtitle: '28歳・若手会社員＋パート（世帯年収 610万円）',
    percentileLabel: '20代購入層で急増中の50年ローン選択世帯（構成比 11.8%）',
    age: 28,
    employment: 'sme',
    mainIncomeMan: 480,
    subIncomeMan: 130,
    initialSavingsMan: 420,
    hasCreditBlemish: false,
    recommendedContract: 'income-merge',
    recommendedFamily: 'child-2-public',
    recommendedProperty: 'detached-custom-new',
    description:
      '「月々の支払いが家賃並みになるから」と50年ローン（78歳完済）で新築注文住宅を購入。最初の15年間は元金がほとんど減らず、定年時に2,000万円超の残債が残る構造に挑む。',
  },
  {
    id: 'late-30s-family-late-loan',
    title: '39歳・晩婚子育て＆74歳完済スタート世帯',
    subtitle: '39歳・中堅管理職×時短勤務（世帯年収 840万円）',
    percentileLabel: '第1子誕生を機に30代後半で購入する層（構成比 12.5%）',
    age: 39,
    employment: 'listed-corp',
    mainIncomeMan: 660,
    subIncomeMan: 180,
    initialSavingsMan: 1100,
    hasCreditBlemish: false,
    recommendedContract: 'single',
    recommendedFamily: 'child-1-private',
    recommendedProperty: 'station-mansion-new',
    description:
      '35年ローンを組むと完済予定は74歳。55歳の役職定年・60歳の定年再雇用と子どもの大学進学費用が完全に重なるため、計画的な繰上返済が命綱となる。',
  },
  {
    id: 'parent-gift-custom-house',
    title: '30歳・親からの住宅資金贈与＋注文住宅世帯',
    subtitle: '30歳・上場企業×正社員（世帯年収 860万円・頭金充実）',
    percentileLabel: '直系尊属からの住宅取得資金贈与活用層（構成比 9.4%）',
    age: 30,
    employment: 'listed-corp',
    mainIncomeMan: 540,
    subIncomeMan: 320,
    initialSavingsMan: 1650,
    hasCreditBlemish: false,
    recommendedContract: 'pair',
    recommendedFamily: 'child-2-public',
    recommendedProperty: 'detached-custom-new',
    description:
      '親からの非課税贈与と自己資金を合わせ、頭金を1,000万円近く入れて太陽光ZEH注文住宅を購入。初期LTVが低くアンダーローンを維持しやすい好スタート世帯。',
  },
  {
    id: 'regional-dual-car-detached',
    title: '29歳・地方都市の敷地60坪＆太陽光戸建て世帯',
    subtitle: '29歳・地方優良企業共働き（世帯年収 680万円）',
    percentileLabel: '地方圏の持ち家・注文住宅ボリューム層（構成比 10.6%）',
    age: 29,
    employment: 'sme',
    mainIncomeMan: 440,
    subIncomeMan: 240,
    initialSavingsMan: 620,
    hasCreditBlemish: false,
    recommendedContract: 'income-merge',
    recommendedFamily: 'child-2-public',
    recommendedProperty: 'detached-regional-spacious',
    description:
      '土地価格が手頃な地方中核都市で3,480万円の長期優良戸建てを購入。管理費・駐車場代0円と太陽光発電で住居費負担は軽いが、将来の車買い替えと外壁修繕の積立が鍵。',
  },
  {
    id: 'single-solo-compact',
    title: '33歳・おひとりさま都心コンパクトマンション世帯',
    subtitle: '33歳・単身キャリア正社員（本人年収 670万円）',
    percentileLabel: '近年増加する単身・DINKsの資産形成兼実需購入（構成比 7.2%）',
    age: 33,
    employment: 'mega-venture',
    mainIncomeMan: 670,
    subIncomeMan: 0,
    initialSavingsMan: 850,
    hasCreditBlemish: false,
    recommendedContract: 'single',
    recommendedFamily: 'dinks',
    recommendedProperty: 'compact-mansion-new',
    description:
      '「家賃を払い続けるなら資産になる駅近2LDKを」と単身で購入。教育費がかからないため新NISAや繰上返済に資金を回しやすいが、1馬力ゆえ病気や休職時の団信選びが重要。',
  },
  {
    id: 'freelance-creator',
    title: '36歳・独立フリーランス＆中古リノベ世帯',
    subtitle: '36歳・IT個人事業主×会社員（世帯年収 960万円）',
    percentileLabel: '確定申告3期分で審査に挑む自営業・自由業層（構成比 5.4%）',
    age: 36,
    employment: 'freelance',
    mainIncomeMan: 680,
    subIncomeMan: 280,
    initialSavingsMan: 1200,
    hasCreditBlemish: true,
    recommendedContract: 'income-merge',
    recommendedFamily: 'dinks',
    recommendedProperty: 'suburban-mansion-used',
    description:
      '表面年収は高いが、節税対策と過去の奨学金うっかり延滞歴によりネット銀行の審査が通りにくい。景気後退時の案件単価下落に備えたキャッシュ確保が鍵。',
  },
  {
    id: 'child3-suburban-4ldk',
    title: '33歳・子ども3人大家族の都市近郊戸建て世帯',
    subtitle: '33歳・メーカー正社員×パート（世帯年収 760万円）',
    percentileLabel: '多子世帯の4LDK戸建て購入モデル（構成比 4.1%）',
    age: 33,
    employment: 'listed-corp',
    mainIncomeMan: 620,
    subIncomeMan: 140,
    initialSavingsMan: 720,
    hasCreditBlemish: false,
    recommendedContract: 'single',
    recommendedFamily: 'child-3',
    recommendedProperty: 'detached-semi-order-zeh',
    description:
      '3人の子どもが伸び伸び育つZEH戸建てを購入。住宅ローン控除の子育て優遇は最大級だが、10年後から始まる「大学進学3連発」の教育費ピークをどう乗り切るかが最大の山場。',
  },
  {
    id: 'power-couple-tower',
    title: '32歳・都心湾岸タワマン共働きパワーカップル世帯',
    subtitle: '32歳・外資/IT×総合職（世帯年収 1,480万円）',
    percentileLabel: '東京23区新築マンション平均（約9,600万円）購入層（構成比 3.2%）',
    age: 32,
    employment: 'mega-venture',
    mainIncomeMan: 880,
    subIncomeMan: 600,
    initialSavingsMan: 1650,
    hasCreditBlemish: false,
    recommendedContract: 'pair',
    recommendedFamily: 'child-1-private',
    recommendedProperty: 'tower-mansion-new',
    description:
      '夫婦ともに高収入でペアローンフル活用＆W住宅ローン控除を狙う都心タワマン（9,580万円）世帯。ただし片方の休職・離婚・中学受験課金・タワマン修繕費高騰が重なると一気に綱渡りに。',
  },
  {
    id: 'forty-something-cash-used',
    title: '43歳・賃貸卒業の25年短縮ローン＆中古リノベ世帯',
    subtitle: '43歳・中堅企業課長×正社員（世帯年収 890万円）',
    percentileLabel: '40代で頭金を貯めて中古住宅を購入する堅実層（構成比 2.6%）',
    age: 43,
    employment: 'sme',
    mainIncomeMan: 610,
    subIncomeMan: 280,
    initialSavingsMan: 1500,
    hasCreditBlemish: false,
    recommendedContract: 'pair',
    recommendedFamily: 'child-1-public',
    recommendedProperty: 'detached-kominka-reno',
    description:
      '40代で賃貸を卒業し、フル断熱リノベ済みの中古戸建てを25年ローン（68歳完済）で購入。借入額を抑えて定年前後の完済を狙う大人の堅実プラン。',
  },
  {
    id: 'specialist-high-income-private',
    title: '37歳・専門職カップル＆私立中学受験2人世帯',
    subtitle: '37歳・専門職×専門職（世帯年収 1,680万円）',
    percentileLabel: '都心プレミアム住戸・高年収専門職層（構成比 1.6%）',
    age: 37,
    employment: 'listed-corp',
    mainIncomeMan: 1050,
    subIncomeMan: 630,
    initialSavingsMan: 2100,
    hasCreditBlemish: false,
    recommendedContract: 'pair',
    recommendedFamily: 'child-2-private',
    recommendedProperty: 'luxury-penthouse-new',
    description:
      '1億円超の都心プレミアムマンションをペアローンで購入し、子ども2人を私立中高一貫校へ通わせるハイエンド世帯。収入は圧倒的だが、金利上昇と年間300万円超の教育費が同時直撃する。',
  },
];

export const PROPERTIES: Record<PropertyCategory, PropertySpec> = {
  'tower-mansion-new': {
    id: 'tower-mansion-new',
    name: '湾岸・都心タワーマンション高層階（新築・長期優良）',
    shortName: '都心新築タワマン',
    buildingType: 'tower',
    isNew: true,
    builtAge: 0,
    locationLabel: '東京23区湾岸エリア・駅徒歩3分（38階）',
    priceMan: 9580,
    landRatio: 0.24,
    energyCert: 'long-term-excellent',
    initialMgmtFeeMonthlyMan: 3.1,
    initialRepairFeeMonthlyMan: 2.0,
    parkingMonthlyMan: 3.3,
    annualPropertyTaxMan: 29,
    landAnnualTrendRate: 0.012,
    utilityMonthlyDiffMan: -0.3,
    description:
      'SUUMO東京23区新築マンション契約者平均（約9,598万円）を反映した都心タワマン。長期優良住宅認定で住宅ローン控除枠は最大級、固定資産税も7年間半額軽減。',
    riskNote:
      '【タワマンの罠】初期の修繕積立金は低く抑えられているが、6年目・12年目・18年目の段階増額で月5万円超へ急騰し、8年目には固定資産税の新築軽減終了が到来する。',
  },
  'station-mansion-new': {
    id: 'station-mansion-new',
    name: '首都圏・急行停車駅 新築分譲マンション（長期優良）',
    shortName: '首都圏駅近マンション',
    buildingType: 'mansion',
    isNew: true,
    builtAge: 0,
    locationLabel: '首都圏・急行停車駅 徒歩6分（70㎡・3LDK）',
    priceMan: 7280,
    landRatio: 0.34,
    energyCert: 'long-term-excellent',
    initialMgmtFeeMonthlyMan: 1.9,
    initialRepairFeeMonthlyMan: 1.4,
    parkingMonthlyMan: 1.8,
    annualPropertyTaxMan: 22,
    landAnnualTrendRate: 0.004,
    utilityMonthlyDiffMan: -0.4,
    description:
      'SUUMO首都圏新築マンション契約者平均（7,324万円）に準拠した王道ファミリー3LDK。長期優良住宅認定で子育て世帯なら最大5,000万円まで0.7%×13年の税額控除対象。',
    riskNote:
      '修繕積立金は5年ごとに段階的に引き上げられ、8年目からは建物の固定資産税半額軽減も終了するため実質住居費の管理が重要。',
  },
  'suburban-mansion-used': {
    id: 'suburban-mansion-used',
    name: '準都心・築20年リノベ済み中古マンション（ZEH断熱改修）',
    shortName: '築20年中古マンション',
    buildingType: 'mansion',
    isNew: false,
    builtAge: 20,
    locationLabel: '準都心エリア・駅徒歩8分（68㎡・3LDK）',
    priceMan: 4580,
    landRatio: 0.4,
    energyCert: 'zeh',
    initialMgmtFeeMonthlyMan: 1.7,
    initialRepairFeeMonthlyMan: 2.7,
    parkingMonthlyMan: 1.5,
    annualPropertyTaxMan: 15,
    landAnnualTrendRate: -0.001,
    utilityMonthlyDiffMan: -0.2,
    description:
      '新築マンション高騰を受け実需人気が集まる準都心リノベ済中古マンション（4,580万円）。新築より約2,700万円抑えられ、建物価格の初期下落が落ち着いている。',
    riskNote:
      '【中古マンションの注意点】住宅ローン控除期間は10年（借入限度額3,000万円）に短縮され、すでに修繕積立金が高めなほか、給排水管更新や専有部設備交換が到来する。',
  },
  'detached-custom-new': {
    id: 'detached-custom-new',
    name: '都市近郊・新築注文住宅一戸建て（長期優良・太陽光ZEH）',
    shortName: '新築注文一戸建て',
    buildingType: 'detached',
    isNew: true,
    builtAge: 0,
    locationLabel: '都市近郊・閑静な第一種低層住居専用地域',
    priceMan: 5880,
    landRatio: 0.52,
    energyCert: 'long-term-excellent',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 18,
    landAnnualTrendRate: 0.001,
    utilityMonthlyDiffMan: -1.1,
    description:
      '管理費・駐車場代が一生0円！太陽光発電＋高気密高断熱で毎月の光熱費も約1.1万円削減でき、資産の半分以上が「土地」として残る注文住宅。',
    riskNote:
      '【戸建ての自己責任】6年目から固定資産税の新築軽減が終了するほか、5年ごとの火災・地震保険更新と、12〜16年ごとの外壁塗装・屋根防水・給湯器交換が自己負担で発生する。',
  },
  'detached-powerbuilder-new': {
    id: 'detached-powerbuilder-new',
    name: '郊外ベッドタウン・新築建売一戸建て（省エネ基準適合）',
    shortName: '郊外新築建売戸建て',
    buildingType: 'detached',
    isNew: true,
    builtAge: 0,
    locationLabel: '郊外ベッドタウン・バス10分（4LDK・カースペース2台付）',
    priceMan: 4380,
    landRatio: 0.46,
    energyCert: 'standard',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 14,
    landAnnualTrendRate: -0.015,
    utilityMonthlyDiffMan: 0.2,
    description:
      '省エネ基準義務化後の首都圏郊外パワービルダー建売相場（4,380万円）。4LDK＋駐車場2台が手に入り、マンションより月々の返済負担率を低く抑えられる。',
    riskNote:
      '【郊外建売の注意点】一般新築戸建てのため固定資産税の半額軽減は3年で終了（4年目から建物税額2倍）し、郊外路線価の緩やかな下落と定期外装メンテへの備えが必要。',
  },
  'detached-used': {
    id: 'detached-used',
    name: '郊外・築26年木造中古一戸建て（旧省エネ基準）',
    shortName: '築26年中古戸建て',
    buildingType: 'detached',
    isNew: false,
    builtAge: 26,
    locationLabel: '郊外住宅街・駅徒歩14分',
    priceMan: 2680,
    landRatio: 0.74,
    energyCert: 'non-compliant',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 9,
    landAnnualTrendRate: -0.012,
    utilityMonthlyDiffMan: 0.9,
    description:
      '物件価格の約74%が土地値のため、これ以上の資産価値下落が小さく、借入額を2,000万円台に抑えて早期完済を狙える。',
    riskNote:
      '【旧基準中古の罠】省エネ基準未満のため住宅ローン控除は少なく、断熱性が低いため光熱費が高い。木造築古のため火災・地震保険料が高めで、水回り・屋根改修費も早期に発生する。',
  },
  'regional-mansion-new': {
    id: 'regional-mansion-new',
    name: '地方中核都市・駅直結新築マンション（ZEH省エネ）',
    shortName: '地方駅直結マンション',
    buildingType: 'mansion',
    isNew: true,
    builtAge: 0,
    locationLabel: '地方政令指定都市・ターミナル駅徒歩4分',
    priceMan: 4680,
    landRatio: 0.28,
    energyCert: 'zeh',
    initialMgmtFeeMonthlyMan: 1.6,
    initialRepairFeeMonthlyMan: 1.3,
    parkingMonthlyMan: 1.1,
    annualPropertyTaxMan: 16,
    landAnnualTrendRate: 0.001,
    utilityMonthlyDiffMan: -0.5,
    description:
      '地方政令指定都市の駅前ランドマークマンション（4,680万円）。首都圏より抑えた価格でZEH水準の断熱性と高い生活利便性を両立。',
    riskNote:
      '6年目からの固定資産税軽減終了、段階的な修繕積立金の増額、専有部設備の15〜20年目リフォームへの備えが必要。',
  },
  'luxury-penthouse-new': {
    id: 'luxury-penthouse-new',
    name: '都心3区・プレミアムタワー高層住戸（新築・長期優良）',
    shortName: '都心1.25億タワマン',
    buildingType: 'tower',
    isNew: true,
    builtAge: 0,
    locationLabel: '都心3区エリア・駅徒歩2分（85㎡・3LDK）',
    priceMan: 12500,
    landRatio: 0.28,
    energyCert: 'long-term-excellent',
    initialMgmtFeeMonthlyMan: 4.1,
    initialRepairFeeMonthlyMan: 2.7,
    parkingMonthlyMan: 4.3,
    annualPropertyTaxMan: 40,
    landAnnualTrendRate: 0.018,
    utilityMonthlyDiffMan: -0.2,
    description:
      '東京23区の新築分譲平均（約1.2〜1.3億円）を象徴する都心一等地プレミアム住戸。インフレ局面では国内外の需要で値上がり益も狙える最高峰物件。',
    riskNote:
      'ペアローンで限度額ギリギリまで借りると、金利が1.5%上がっただけで年間返済額が130万円以上急増するハイリスク・ハイリターン領域。',
  },
  'compact-mansion-new': {
    id: 'compact-mansion-new',
    name: '都心近接・駅徒歩3分 新築コンパクト2LDKマンション（ZEH）',
    shortName: '都心コンパクト2LDK',
    buildingType: 'mansion',
    isNew: true,
    builtAge: 0,
    locationLabel: '都心乗換駅 徒歩3分（54㎡・2LDK）',
    priceMan: 5480,
    landRatio: 0.35,
    energyCert: 'zeh',
    initialMgmtFeeMonthlyMan: 1.6,
    initialRepairFeeMonthlyMan: 1.2,
    parkingMonthlyMan: 0.3,
    annualPropertyTaxMan: 17,
    landAnnualTrendRate: 0.008,
    utilityMonthlyDiffMan: -0.4,
    description:
      '単身キャリアやDINKsに人気の都心近接コンパクト2LDK（5,480万円）。車を持たずに暮らせるため駐車場負担がなく、賃貸にも売却にも流動性が高い。',
    riskNote:
      '途中で子どもが生まれて手狭になった場合の教育費・部屋割り対応や、単身購入時の病気・休職リスクに備えた団信選びが重要。',
  },
  'detached-semi-order-zeh': {
    id: 'detached-semi-order-zeh',
    name: '首都圏近郊・駅徒歩10分 ZEHセミオーダー一戸建て',
    shortName: '首都圏ZEH新築戸建',
    buildingType: 'detached',
    isNew: true,
    builtAge: 0,
    locationLabel: '首都圏近郊・急行駅徒歩10分（カースペース付）',
    priceMan: 4980,
    landRatio: 0.55,
    energyCert: 'zeh',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 16,
    landAnnualTrendRate: 0.003,
    utilityMonthlyDiffMan: -0.6,
    description:
      'SUUMO首都圏新築一戸建て平均購入価格（4,844万〜4,980万円）を反映した都市近郊ZEH戸建て。駅徒歩圏の利便性と「管理費・駐車場代0円の4LDK」を両立。',
    riskNote:
      '4年目から固定資産税の新築軽減が終了するほか、12〜15年ごとの外壁・屋根塗装と水回り設備リフォーム費を計画的に確保する必要がある。',
  },
  'detached-regional-spacious': {
    id: 'detached-regional-spacious',
    name: '地方中核都市・敷地60坪 太陽光＋駐車場3台付 長期優良戸建て',
    shortName: '地方60坪太陽光戸建',
    buildingType: 'detached',
    isNew: true,
    builtAge: 0,
    locationLabel: '地方中核都市・郊外開発分譲地（敷地60坪）',
    priceMan: 3680,
    landRatio: 0.38,
    energyCert: 'long-term-excellent',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 12,
    landAnnualTrendRate: -0.005,
    utilityMonthlyDiffMan: -1.2,
    description:
      '広い庭と駐車場3台、大容量太陽光パネルを備えたゆとりの長期優良住宅（3,680万円）。借入額を3,000万円台に抑えつつ光熱費も大幅に削減できる。',
    riskNote:
      '夫婦それぞれマイカー2台を維持する地域のため、車検・車両買い替え費用と、5年ごとの火災・地震保険更新および外壁・防蟻メンテナンス費の管理が鍵。',
  },
  'detached-kominka-reno': {
    id: 'detached-kominka-reno',
    name: '海街・文教エリア 築22年フル断熱リノベ木造一戸建て（ZEH改修）',
    shortName: '築22年断熱リノベ戸建',
    buildingType: 'detached',
    isNew: false,
    builtAge: 22,
    locationLabel: '湘南・文教住宅街エリア 駅徒歩11分',
    priceMan: 3880,
    landRatio: 0.68,
    energyCert: 'zeh',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 12,
    landAnnualTrendRate: 0.002,
    utilityMonthlyDiffMan: -0.3,
    description:
      '人気の文教・海街エリアの中古戸建てを耐震・高断熱フルリノベーションした物件（3,880万円）。価格の約7割が底堅い土地資産で構成され、建物減価リスクが極めて小さい。',
    riskNote:
      '中古住宅のため住宅ローン控除期間は10年間。築35年（返済13年目頃）で屋根カバー工法や給排水管の更新工事が到来する。',
  },
};

export const BANKS: Record<BankId, BankSpec> = {
  'net-bank': {
    id: 'net-bank',
    name: 'あおぞらダイレクトネット銀行',
    shortName: 'ネット銀行(変動0.78%)',
    categoryLabel: 'ネット専業・低金利変動（5年/125%ルールなし）',
    rateType: 'variable',
    baseRate: 0.78,
    screeningRate: 3.6,
    maxDtiPercent: 35,
    supports50Years: true,
    has5Year125Rule: false,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 1,
    description:
      '日銀の追加利上げと短期プライムレート上昇に伴い、年0.78%へ改定されたネット専業の変動プラン。5年ルール・125%ルールがないため、今後の利上げ時は半年ごとに毎月返済額が直撃上昇する。',
    badgeText: 'ネット銀変動0.78% / 5年ルールなし',
  },
  'mega-bank': {
    id: 'mega-bank',
    name: 'メトロポリタン第一銀行（メガバンク）',
    shortName: 'メガバンク(変動0.92%)',
    categoryLabel: '都市銀行・王道変動（5年ルール・125%ルール付）',
    rateType: 'variable',
    baseRate: 0.92,
    screeningRate: 3.5,
    maxDtiPercent: 35,
    supports50Years: false,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 3,
    description:
      '短期プライムレート引き上げを反映し年0.92%となった王道メガバンク変動金利。5年ルール・125%ルール完備で5年間は毎月返済額が変わらないが、追加利上げ時には裏で「未払利息」が蓄積するリスクも。',
    badgeText: '5年・125%ルール有 / 35年迄',
  },
  'regional-bank': {
    id: 'regional-bank',
    name: 'ふるさと共栄地方銀行',
    shortName: '地方銀行(50年対応1.15%)',
    categoryLabel: '地方銀行・柔軟審査＆50年ローン積極対応',
    rateType: 'variable',
    baseRate: 1.15,
    screeningRate: 3.3,
    maxDtiPercent: 38,
    supports50Years: true,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 3,
    description:
      '50年超長期ローンや個人事業主・転職直後・高倍率ローンにも柔軟に対応する地銀（年1.15%）。初期金利は1.1%台に乗っているが、家計困窮時のリスケ相談に最も親身。',
    badgeText: '審査柔軟 / 50年ローン対応',
  },
  'flat35-agency': {
    id: 'flat35-agency',
    name: '住宅金融支援公庫【フラット35S / 全期間固定】',
    shortName: 'フラット35(全期間固定2.48%)',
    categoryLabel: '全期間完全固定金利（子育て・長期優良優遇あり）',
    rateType: 'flat-35',
    baseRate: 2.48,
    screeningRate: 2.48,
    maxDtiPercent: 35,
    supports50Years: false,
    has5Year125Rule: false,
    upfrontFeeRate: 0.011,
    rescheduleFlexibility: 2,
    description:
      '長期金利（10年国債利回り）の上昇により年2.48%水準となったが、完済まで35年間、世界情勢や日銀の追加利上げがどうなろうと返済額が1円も上がらない絶対防衛ライン！長期優良・子育て世帯は当初▲0.45%優遇！',
    badgeText: '金利上昇リスク完全ゼロ',
  },
  'neo-mix-bank': {
    id: 'neo-mix-bank',
    name: 'ネオ・トラスト信託銀行【変動50%＋固定50%ミックス】',
    shortName: '信託ミックス(1.68%)',
    categoryLabel: '変動金利と全期間固定の50:50ハイブリッド契約',
    rateType: 'mix',
    baseRate: 1.68,
    screeningRate: 3.2,
    maxDtiPercent: 36,
    supports50Years: true,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 2,
    description:
      '借入額の半分を変動金利、残り半分を固定金利で組むリスク分散プラン（合成金利 年1.68%）。今後の日銀追加利上げ時のダメージを半分に抑えつつ、全期間固定よりも初期返済額を軽減できる。',
    badgeText: '変動＋固定 50:50分散',
  },
  'fixed10-step-bank': {
    id: 'fixed10-step-bank',
    name: 'あさひ信託銀行【当初10年固定・段階特約プラン】',
    shortName: '当初10年固定(1.95%)',
    categoryLabel: '住宅ローン控除期間（当初10年）の金利を完全固定',
    rateType: 'fixed-10',
    baseRate: 1.95,
    screeningRate: 3.3,
    maxDtiPercent: 36,
    supports50Years: true,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 2,
    description:
      '長期金利上昇を反映し、残債が最も多い最初の10年間を年1.95%で完全固定するプラン。住宅ローン控除期間中の家計を安定させるが、11年目の特約満了時に優遇幅が縮小し金利が再改定される点に注意。',
    badgeText: '10年間固定 / 11年目改定',
  },
  'coop-welfare-bank': {
    id: 'coop-welfare-bank',
    name: '中央勤労者福祉バンク（ろうきん・共済連係）',
    shortName: '勤労福祉バンク(変動0.88%)',
    categoryLabel: '事務手数料低廉・繰上返済＆条件変更サポート充実',
    rateType: 'variable',
    baseRate: 0.88,
    screeningRate: 3.2,
    maxDtiPercent: 36,
    supports50Years: false,
    has5Year125Rule: true,
    upfrontFeeRate: 0.008,
    rescheduleFlexibility: 3,
    description:
      '融資事務手数料が一般的な銀行（2.2%）の半分以下（0.8%）で済み、初期諸費用を100万円近く節約できる勤労者向け金融機関（変動年0.88%）。5年・125%ルール付きで安定感が高い。',
    badgeText: '諸費用最安級 / 5年ルール有',
  },
};

export const DANSHIN_PLANS: Record<DanshinType, DanshinSpec> = {
  basic: {
    id: 'basic',
    name: '一般団信（死亡・高度障害のみ保障）',
    shortName: '一般団信(+0.0%)',
    spreadRate: 0.0,
    cancerCoverage: 0,
    threeMajorCoverage: 0,
    disabilityCoverage: false,
    pairCrossCoverage: false,
    description:
      '金利上乗せ0%の基本プラン。ただし「がんステージI〜II」や「心筋梗塞・脳卒中での長期療養」ではローンが1円も免除されず、減収と医療費の中で返済が続く。',
  },
  'cancer-50': {
    id: 'cancer-50',
    name: 'がん50%保障団信（がん診断で残債半分免除）',
    shortName: 'がん50%団信(+0.1%)',
    spreadRate: 0.1,
    cancerCoverage: 0.5,
    threeMajorCoverage: 0,
    disabilityCoverage: false,
    pairCrossCoverage: false,
    description:
      '年+0.1%の上乗せで、所定のがん（悪性新生物）と診断確定された瞬間に住宅ローン残債が50%免除されるコスパ重視プラン。',
  },
  'three-major-100': {
    id: 'three-major-100',
    name: 'がん100%＋3大疾病保障団信（残債全額免除）',
    shortName: '3大疾病100%団信(+0.2%)',
    spreadRate: 0.2,
    cancerCoverage: 1.0,
    threeMajorCoverage: 1.0,
    disabilityCoverage: false,
    pairCrossCoverage: false,
    description:
      '年+0.2%の上乗せで、がん診断確定または急性心筋梗塞・脳卒中で所定の状態になった場合、住宅ローン残債が100%ゼロ（完済）になる強力保障！',
  },
  'all-disease-pair': {
    id: 'all-disease-pair',
    name: '全疾病・就業不能＋ペア連生フル保障団信（夫婦デュアル100%保障）',
    shortName: '全疾病＋ペア連生(+0.32%)',
    spreadRate: 0.32,
    cancerCoverage: 1.0,
    threeMajorCoverage: 1.0,
    disabilityCoverage: true,
    pairCrossCoverage: true,
    description:
      '3大疾病100%免除に加え、8大疾病・長期入院による就業不能、さらにペアローンで配偶者に万が一（またはがん）があった場合でも夫婦両方の残債を100%免除する最強の盾。',
  },
};

export const MACRO_REGIMES: Record<
  MacroRegimeId,
  { id: MacroRegimeId; name: string; subtitle: string; description: string }
> = {
  'gradual-hike': {
    id: 'gradual-hike',
    name: '標準シナリオ：日銀の継続利上げ＆インフレ定着',
    subtitle: '政策金利 0.75% → 2.25% へ段階上昇 / 賃金も年+1.8%成長',
    description:
      'すでに利上げが進んだ現在の金利水準（変動0.7%〜1.0%台、固定2.2%台）からスタートし、日銀が数年に一度追加利上げを実施して変動金利が2%台後半へと上昇する現実的な標準シナリオ。',
  },
  'stagflation-shock': {
    id: 'stagflation-shock',
    name: 'ハードシナリオ：円安進行＆悪性スタグフレーション',
    subtitle: '輸入物価急騰で日銀が緊急利上げ（変動金利3.8%突破）・実質賃金停滞',
    description:
      '世界的インフレと円安が直撃！物価と修繕費と住宅ローン金利だけが跳ね上がり、会社の賞与や昇給が追いつかない住宅ローン最大の試練モード。',
  },
  'asset-bubble': {
    id: 'asset-bubble',
    name: 'バブルシナリオ：好景気・賃上げ＆都心マンション高騰',
    subtitle: '金利も上がるが年収・株価・都心不動産価格も大幅上昇',
    description:
      '金利は上昇するものの、昇給と不動産価格の上昇がそれを上回る好景気シナリオ。都心物件や注文住宅は「含み益（アンダーローン）」が拡大しやすい。',
  },
  'deflation-return': {
    id: 'deflation-return',
    name: '景気後退・波乱シナリオ：一時緩和のちにインフレ再燃',
    subtitle: '一時的に利下げされるが、中盤以降に財政悪化で金利再上昇',
    description:
      '景気後退により序盤は金利上昇が止まるものの、会社の賞与抑制と郊外物件の資産価値下落が進行し、中盤以降に再びインフレ・利上げ波が到来するシナリオ。',
  },
  'dynamic-random': {
    id: 'dynamic-random',
    name: '激動シナリオ：毎年ランダムに世界情勢・金融政策が変動',
    subtitle: '何が起きるか予測不能なドキュメンタリー・リアルモード',
    description:
      '好景気、資源ショック、金融緩和、緊急利上げが歴史の巡り合わせによって動的に発生する予測不能モード。',
  },
};

export const FAMILY_PLANS: Record<
  FamilyPlanType,
  {
    id: FamilyPlanType;
    name: string;
    childrenCount: number;
    isPrivateSchool: boolean;
    description: string;
  }
> = {
  dinks: {
    id: 'dinks',
    name: 'DINKs（子どもなし・夫婦2人暮らし）',
    childrenCount: 0,
    isPrivateSchool: false,
    description: '教育費負担がなく、共働き収入を繰上返済や新NISA運用に集中できる。',
  },
  'child-1-public': {
    id: 'child-1-public',
    name: '子ども1人（小中高公立＋大学進学）',
    childrenCount: 1,
    isPrivateSchool: false,
    description: '高校まで公立中心で教育費を抑え、大学進学時の4年間に備える堅実プラン。',
  },
  'child-1-private': {
    id: 'child-1-private',
    name: '子ども1人（中学受験・私立中高一貫＋私立大）',
    childrenCount: 1,
    isPrivateSchool: true,
    description: '小4からの通塾代（年100万円）と私立中高学費が30代後半〜40代のキャッシュフローを直撃。',
  },
  'child-2-public': {
    id: 'child-2-public',
    name: '子ども2人（小中高公立＋大学進学）',
    childrenCount: 2,
    isPrivateSchool: false,
    description: '子育て世帯の標準モデル。2人の大学時期が重なる48〜54歳が教育費最大の山場。',
  },
  'child-2-private': {
    id: 'child-2-private',
    name: '子ども2人（中学受験・私立中高一貫ルート）',
    childrenCount: 2,
    isPrivateSchool: true,
    description: '2人の中学受験＋私立学費で年間240万円超が10年以上続く超高難度エデュケーション・ルート。',
  },
  'child-3': {
    id: 'child-3',
    name: '子ども3人（にぎやか大家族・公立中心）',
    childrenCount: 3,
    isPrivateSchool: false,
    description: '児童手当や子育てエコホーム支援は手厚いが、食費・光熱費・3人分の大学費用が長期にわたり続く。',
  },
};

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  'listed-corp': '上場企業・大手正社員',
  'civil-servant': '公務員・団体職員',
  'mega-venture': 'メガベンチャー・外資系',
  sme: '中小企業・中堅企業正社員',
  freelance: 'フリーランス・個人事業主',
};

/**
 * 元利均等返済の毎月返済額(万円)を計算する
 */
export function calcEqualPaymentMonthlyMan(
  principalMan: number,
  annualRatePercent: number,
  remainingYears: number,
): number {
  if (principalMan <= 0 || remainingYears <= 0) return 0;
  const months = Math.max(1, Math.round(remainingYears * 12));
  const r = Math.max(0, annualRatePercent) / 100 / 12;
  if (r < 0.000001) {
    return principalMan / months;
  }
  const factor = Math.pow(1 + r, months);
  return (principalMan * r * factor) / (factor - 1);
}

/**
 * 元金均等返済の初月返済額(万円)を計算する
 */
export function calcEqualPrincipalMonthlyMan(
  principalMan: number,
  annualRatePercent: number,
  remainingYears: number,
): number {
  if (principalMan <= 0 || remainingYears <= 0) return 0;
  const months = Math.max(1, Math.round(remainingYears * 12));
  const monthlyPrincipal = principalMan / months;
  const monthlyInterest = (principalMan * (Math.max(0, annualRatePercent) / 100)) / 12;
  return monthlyPrincipal + monthlyInterest;
}

/**
 * 額面年収から手取り年収(万円)を概算（社会保険料・所得税・住民税控除）
 */
export function estimateNetIncomeMan(grossMan: number): number {
  if (grossMan <= 0) return 0;
  if (grossMan <= 400) return Math.round(grossMan * 0.8 * 10) / 10;
  if (grossMan <= 700) return Math.round(grossMan * 0.77 * 10) / 10;
  if (grossMan <= 1000) return Math.round(grossMan * 0.73 * 10) / 10;
  return Math.round(grossMan * 0.69 * 10) / 10;
}

/**
 * 住宅ローン控除（年率0.7%・最大13年または10年）の年間控除上限額を計算
 */
export function calcAnnualTaxDeductionMan(
  remainingPrincipalMan: number,
  yearIndex: number,
  property: PropertySpec,
  contractType: ContractType,
  isChildHousehold: boolean,
  mainIncomeMan: number,
  subIncomeMan: number,
): { creditMan: number; maxYears: number; borrowingCapMan: number } {
  // 旧省エネ基準の「新築」は2024年以降の制度改正により原則控除対象外（0円）
  if (property.isNew && property.energyCert === 'non-compliant') {
    return { creditMan: 0, maxYears: 0, borrowingCapMan: 0 };
  }

  const maxYears = property.isNew ? 13 : 10;
  let baseCapMan = 3000;

  if (property.isNew) {
    if (property.energyCert === 'long-term-excellent') {
      baseCapMan = isChildHousehold ? 5000 : 4500;
    } else if (property.energyCert === 'zeh') {
      baseCapMan = isChildHousehold ? 4500 : 3500;
    } else {
      baseCapMan = isChildHousehold ? 4000 : 3000;
    }
  } else {
    // 中古住宅
    if (property.energyCert === 'long-term-excellent' || property.energyCert === 'zeh') {
      baseCapMan = 3000;
    } else {
      baseCapMan = 2000;
    }
  }

  // ペアローンの場合は夫婦それぞれが控除枠を使えるため実質上限が最大1.6倍まで拡大
  const effectiveCapMan =
    contractType === 'pair' && subIncomeMan >= 200 ? Math.round(baseCapMan * 1.5) : baseCapMan;

  if (yearIndex > maxYears || remainingPrincipalMan <= 0) {
    return { creditMan: 0, maxYears, borrowingCapMan: effectiveCapMan };
  }

  const eligibleBalance = Math.min(remainingPrincipalMan, effectiveCapMan);
  const rawCredit = eligibleBalance * 0.007;

  // 所得税＋住民税の上限キャップ（年収に応じた納税額上限）
  const totalIncomeTaxCap =
    contractType === 'pair'
      ? Math.max(8, (mainIncomeMan + subIncomeMan) * 0.042)
      : Math.max(6, mainIncomeMan * 0.042);

  const creditMan = Math.round(Math.min(rawCredit, totalIncomeTaxCap) * 10) / 10;
  return { creditMan, maxYears, borrowingCapMan: effectiveCapMan };
}

/**
 * カスタム設定またはランダム生成された数値を反映した実効物件スペックを返す
 */
export function resolveEffectiveProperty(config: MortgageSetupConfig): PropertySpec {
  const rawBase = PROPERTIES[config.propertyId] ?? PROPERTIES['station-mansion-new'];
  const buildingType = config.customBuildingType ?? rawBase.buildingType;

  // 建物種別（一戸建て vs マンション vs タワマン）がベース物件と異なる場合は、同種別の代表物件をベースにして名称や属性の矛盾を完全に防ぐ
  const fallbackByType: PropertySpec =
    buildingType === 'detached'
      ? PROPERTIES['detached-semi-order-zeh']
      : buildingType === 'tower'
        ? PROPERTIES['tower-mansion-new']
        : PROPERTIES['station-mansion-new'];
  const base = rawBase.buildingType === buildingType ? rawBase : fallbackByType;

  const priceMan = config.customPropertyPriceMan ?? base.priceMan;
  const landRatio = config.customLandRatio ?? base.landRatio;
  const isNew = config.customIsNew ?? base.isNew;
  const builtAge = config.customBuiltAge ?? (isNew ? 0 : Math.max(5, base.builtAge || 12));
  const energyCert = config.customEnergyCert ?? base.energyCert;

  // 一戸建ては管理組合の管理費・修繕積立金・機械式駐車場代がすべて 0円
  const baseMonthlyMaint =
    buildingType === 'detached'
      ? 0
      : base.initialMgmtFeeMonthlyMan + base.initialRepairFeeMonthlyMan + base.parkingMonthlyMan;
  const targetMonthlyMaint =
    buildingType === 'detached'
      ? 0
      : (config.customMgmtAndRepairMonthlyMan ?? baseMonthlyMaint);
  const maintScale = baseMonthlyMaint > 0 ? targetMonthlyMaint / baseMonthlyMaint : 1;

  const initialMgmtFeeMonthlyMan =
    buildingType === 'detached'
      ? 0
      : config.customMgmtAndRepairMonthlyMan !== undefined
        ? Math.round(targetMonthlyMaint * 0.45 * 10) / 10
        : base.initialMgmtFeeMonthlyMan;
  const initialRepairFeeMonthlyMan =
    buildingType === 'detached'
      ? 0
      : config.customMgmtAndRepairMonthlyMan !== undefined
        ? Math.round((targetMonthlyMaint - initialMgmtFeeMonthlyMan) * 10) / 10
        : base.initialRepairFeeMonthlyMan;
  const parkingMonthlyMan =
    buildingType === 'detached' || config.customMgmtAndRepairMonthlyMan !== undefined
      ? 0
      : base.parkingMonthlyMan;

  const priceScale = base.priceMan > 0 ? priceMan / base.priceMan : 1;
  const annualPropertyTaxMan = Math.max(
    8,
    Math.round(base.annualPropertyTaxMan * (0.35 + priceScale * 0.65) * 10) / 10,
  );

  const utilityMonthlyDiffMan =
    energyCert === 'long-term-excellent'
      ? -0.5
      : energyCert === 'zeh'
        ? -0.4
        : energyCert === 'standard'
          ? 0
          : 0.5;

  const hasCustomOverride =
    rawBase.buildingType !== buildingType ||
    config.customPropertyPriceMan !== undefined ||
    config.customBuildingType !== undefined ||
    config.customIsNew !== undefined ||
    config.customEnergyCert !== undefined ||
    Math.abs(maintScale - 1) > 0.05;

  const buildingLabel =
    buildingType === 'tower'
      ? 'タワーマンション'
      : buildingType === 'mansion'
        ? '分譲マンション'
        : '一戸建て';
  const conditionLabel = isNew ? '新築' : `中古・築${builtAge}年`;
  const certShort =
    energyCert === 'long-term-excellent'
      ? '長期優良'
      : energyCert === 'zeh'
        ? 'ZEH省エネ'
        : energyCert === 'standard'
          ? '一般省エネ'
          : '旧省エネ基準';

  return {
    ...base,
    buildingType,
    isNew,
    builtAge,
    priceMan,
    landRatio,
    energyCert,
    initialMgmtFeeMonthlyMan,
    initialRepairFeeMonthlyMan,
    parkingMonthlyMan,
    annualPropertyTaxMan,
    utilityMonthlyDiffMan,
    name: hasCustomOverride
      ? `${base.shortName}（${conditionLabel}・${buildingLabel}・${certShort}）`
      : base.name,
    shortName: hasCustomOverride ? `${conditionLabel}${buildingLabel}（${certShort}）` : base.shortName,
  };
}

/**
 * 世帯モデルの表示タイトルを「実際の借入開始年齢（config.age）」および「実効物件の建物種別（一戸建て/マンション/タワマン）」と100%一致させて返す
 */
export function formatConsistentHouseholdTitle(config: MortgageSetupConfig): string {
  const arch = ARCHETYPES.find((a) => a.id === config.archetypeId) ?? ARCHETYPES[0];
  const property = resolveEffectiveProperty(config);
  let coreTitle = arch.title.replace(/^\d+歳・/, '');

  if (property.buildingType === 'detached') {
    coreTitle = coreTitle
      .replace(/タワマン/g, '一戸建て')
      .replace(/コンパクトマンション/g, 'コンパクト一戸建て')
      .replace(/マンション/g, '一戸建て');
  } else if (property.buildingType === 'mansion') {
    coreTitle = coreTitle
      .replace(/タワマン/g, 'マンション')
      .replace(/敷地60坪＆太陽光戸建て/g, '広々3LDKマンション')
      .replace(/注文住宅/g, '分譲マンション')
      .replace(/一戸建て/g, 'マンション')
      .replace(/戸建て/g, 'マンション');
  } else if (property.buildingType === 'tower') {
    coreTitle = coreTitle
      .replace(/敷地60坪＆太陽光戸建て/g, '高層タワマン')
      .replace(/注文住宅/g, 'タワーマンション')
      .replace(/一戸建て/g, 'タワマン')
      .replace(/戸建て/g, 'タワマン')
      .replace(/マンション/g, 'タワマン');
  }

  return `${config.age}歳・${coreTitle}`;
}

/**
 * カスタム設定またはランダム生成された数値を反映した実効銀行スペックを返す
 */
export function resolveEffectiveBank(config: MortgageSetupConfig): BankSpec {
  const base = BANKS[config.bankId] ?? BANKS['mega-bank'];
  const rateType = config.customRateType ?? base.rateType;
  const fixedRatioPct = Math.max(10, Math.min(90, Math.round(config.mixFixedRatioPercent ?? 50)));
  const varRatioPct = 100 - fixedRatioPct;
  const defaultMixBaseRate =
    Math.round(((2.18 * fixedRatioPct + 0.82 * varRatioPct) / 100) * 100) / 100;
  const baseRate =
    config.customBaseRate ??
    (rateType === 'mix' && config.mixFixedRatioPercent !== undefined
      ? defaultMixBaseRate
      : base.baseRate);
  const has5Year125Rule =
    config.customHas5Year125Rule !== undefined
      ? config.customHas5Year125Rule
      : rateType === 'variable'
        ? base.has5Year125Rule
        : false;

  const rateLabel =
    rateType === 'variable'
      ? has5Year125Rule
        ? '変動金利（5年・125%ルール有）'
        : '変動金利（5年ルール無）'
      : rateType === 'fixed-10'
        ? '当初10年固定金利'
        : rateType === 'flat-35'
          ? '全期間固定金利'
          : `ミックス金利（固定${fixedRatioPct}%：変動${varRatioPct}%）`;

  const hasCustom =
    config.customRateType !== undefined ||
    config.customBaseRate !== undefined ||
    config.customHas5Year125Rule !== undefined ||
    config.mixFixedRatioPercent !== undefined;

  return {
    ...base,
    rateType,
    baseRate,
    has5Year125Rule,
    categoryLabel: hasCustom ? `${rateLabel}・基準${baseRate.toFixed(2)}%` : base.categoryLabel,
  };
}

/**
 * カスタム設定またはランダム生成された数値を反映した実効団信スペックを返す
 */
export function resolveEffectiveDanshin(config: MortgageSetupConfig): DanshinSpec {
  const base = DANSHIN_PLANS[config.danshin] ?? DANSHIN_PLANS['basic'];
  const spreadRate = config.customDanshinSpread ?? base.spreadRate;
  return {
    ...base,
    spreadRate,
    shortName:
      config.customDanshinSpread !== undefined
        ? `${base.name}（+${spreadRate.toFixed(2)}%）`
        : base.shortName,
  };
}

/**
 * 銀行本審査シミュレーション
 */
export function runBankUnderwriting(config: MortgageSetupConfig): UnderwritingResult {
  const property = resolveEffectiveProperty(config);
  const bank = resolveEffectiveBank(config);
  const danshin = resolveEffectiveDanshin(config);
  const family = FAMILY_PLANS[config.familyPlan];
  const isChildHousehold = family.childrenCount > 0;

  // 諸費用計算（銀行融資事務手数料 + 登記・司法書士・印紙税 + 火災地震保険初回5年分 + 引越家具）
  const rawLoanNeeded = Math.max(500, property.priceMan - config.downPaymentMan);
  const bankFeeMan = Math.round(rawLoanNeeded * bank.upfrontFeeRate);
  const registrationAndTaxMan = Math.round(property.priceMan * 0.025);
  const insurancePlan: FireEarthquakeInsuranceType =
    config.insurancePlan ??
    (property.buildingType === 'detached'
      ? 'full-fire-earthquake-water'
      : 'standard-fire-earthquake');
  const insSpec = INSURANCE_PLAN_SPECS[insurancePlan];
  const first5YrInsuranceMan =
    property.buildingType === 'detached'
      ? insSpec.fiveYearCostDetachedMan
      : property.buildingType === 'tower'
        ? insSpec.fiveYearCostTowerMan
        : insSpec.fiveYearCostMansionMan;
  const insuranceAndMovingMan = first5YrInsuranceMan + (property.buildingType === 'detached' ? 60 : 55);
  const closingCostsMan = bankFeeMan + registrationAndTaxMan + insuranceAndMovingMan;

  // 頭金＋諸費用を初期貯蓄から支払えるか（足りない分は諸費用オーバーローンとして借入に上乗せ）
  const totalUpfrontNeeded = config.downPaymentMan + closingCostsMan;
  const overLoanClosingMan = Math.max(0, totalUpfrontNeeded - config.initialSavingsMan);
  const cashRemainingAfterPurchaseMan = Math.max(
    40,
    config.initialSavingsMan - config.downPaymentMan - closingCostsMan + overLoanClosingMan,
  );
  const requestedPrincipalMan = rawLoanNeeded + overLoanClosingMan;

  // 審査対象の世帯年収（単独ローンは本人年収のみ、収入合算は配偶者50%算入、ペアローンは100%算入）
  const recognizedIncomeMan =
    config.contractType === 'single'
      ? config.mainIncomeMan
      : config.contractType === 'income-merge'
        ? config.mainIncomeMan + Math.round(config.subIncomeMan * 0.65)
        : config.mainIncomeMan + config.subIncomeMan;

  // 初期適用金利（フラット35Sの長期優良・子育て優遇▲0.5%反映）
  let baseRate = bank.baseRate + danshin.spreadRate;
  if (
    bank.id === 'flat35-agency' &&
    (property.energyCert === 'long-term-excellent' || property.energyCert === 'zeh' || isChildHousehold)
  ) {
    baseRate = Math.max(1.15, baseRate - 0.45);
  }
  if (config.hasCreditBlemish && bank.id === 'regional-bank') {
    baseRate += 0.25; // 信用傷ありの条件付き金利上乗せ
  }
  const effectiveInitialRate = Math.round(baseRate * 1000) / 1000;

  // 完済予定年齢（10年〜50年まで任意の返済期間に対応）
  const effectiveTermYears: LoanTermYears = Math.max(10, Math.min(50, Math.round(config.termYears)));
  const maturityAge = config.age + effectiveTermYears;

  // 審査金利での年間返済額と返済負担率(DTI)
  const stressMonthlyMan = calcEqualPaymentMonthlyMan(
    requestedPrincipalMan,
    bank.screeningRate + danshin.spreadRate,
    effectiveTermYears,
  );
  const stressAnnualMan = stressMonthlyMan * 12;
  const stressDtiPercent =
    Math.round((stressAnnualMan / Math.max(200, recognizedIncomeMan)) * 1000) / 10;

  // 実行金利での初年度毎月返済額
  const actualMonthlyBaseMan =
    config.repaymentMethod === 'equal-principal'
      ? calcEqualPrincipalMonthlyMan(requestedPrincipalMan, effectiveInitialRate, effectiveTermYears)
      : calcEqualPaymentMonthlyMan(requestedPrincipalMan, effectiveInitialRate, effectiveTermYears);

  const rawBonusRatio = config.bonusRepaymentRatio || 0;
  const bonusRatio = Math.max(0, Math.min(0.5, rawBonusRatio > 1 ? rawBonusRatio / 100 : rawBonusRatio));
  const initialMonthlyPaymentMan = Math.round(actualMonthlyBaseMan * (1 - bonusRatio) * 10) / 10;
  const initialBonusPaymentMan = Math.round(actualMonthlyBaseMan * bonusRatio * 6 * 10) / 10;
  const actualDtiPercent =
    Math.round(((actualMonthlyBaseMan * 12) / Math.max(200, recognizedIncomeMan)) * 1000) / 10;

  // LTV (借入額 / 物件価格)
  const ltvPercent = Math.round((requestedPrincipalMan / property.priceMan) * 1000) / 10;

  // 管理費・修繕積立金・駐車場・固定資産税月割
  const initialMonthlyRunningCostMan =
    Math.round(
      (property.initialMgmtFeeMonthlyMan +
        property.initialRepairFeeMonthlyMan +
        property.parkingMonthlyMan +
        property.annualPropertyTaxMan / 12 +
        property.utilityMonthlyDiffMan) *
        10,
    ) / 10;

  const initialTotalMonthlyOutflowMan =
    Math.round((actualMonthlyBaseMan + initialMonthlyRunningCostMan) * 10) / 10;

  const taxInfo = calcAnnualTaxDeductionMan(
    requestedPrincipalMan,
    1,
    property,
    config.contractType,
    isChildHousehold,
    config.mainIncomeMan,
    config.subIncomeMan,
  );

  const warnings: string[] = [];
  let approved = true;
  let conditionalReductionMan = 0;

  if (config.termYears >= 40 && !bank.supports50Years) {
    warnings.push(
      `${bank.name}で${effectiveTermYears}年の超長期プランを利用するため、35年超長期特約（金利上乗せ・完済${maturityAge}歳）として審査されました。`,
    );
  }
  if (maturityAge > 80) {
    warnings.push(
      `完済予定年齢が${maturityAge}歳（80歳超）に達するため、65歳定年退職後の15〜20年間も返済が続く老後破産リスクがあります。`,
    );
  }
  if (config.hasCreditBlemish && bank.id === 'net-bank') {
    warnings.push(
      '個人信用情報（CIC）の過去延滞履歴により、ネット銀行の自動スコアリング審査で厳しい判定が出ています。',
    );
  }
  if (config.employment === 'freelance' && bank.id === 'net-bank' && ltvPercent > 90) {
    warnings.push(
      '個人事業主・フリーランスで頭金1割未満のため、ネット銀行では融資額の圧縮（減額承認）が求められます。',
    );
  }
  if (stressDtiPercent > bank.maxDtiPercent) {
    const allowedPrincipal = Math.round(
      requestedPrincipalMan * (bank.maxDtiPercent / Math.max(1, stressDtiPercent)),
    );
    conditionalReductionMan = Math.max(0, requestedPrincipalMan - allowedPrincipal);
    warnings.push(
      `審査金利(${bank.screeningRate}%)での返済負担率が${stressDtiPercent}%（基準${bank.maxDtiPercent}%超）となり、返済余力が警戒水域です。`,
    );
  }
  if (ltvPercent > 100) {
    warnings.push(
      `諸費用まで借り入れるオーバーローン（LTV ${ltvPercent}%）のため、購入直後から「売却しても借金が残る状態」でスタートします。`,
    );
  }
  if (config.contractType === 'pair') {
    warnings.push(
      'ペアローン契約：夫婦双方の収入で借入枠を最大化できる一方、育休・離職・離婚時に名義変更や売却が極めて困難になります。',
    );
  }
  if (bank.rateType === 'variable' && !bank.has5Year125Rule) {
    warnings.push(
      '5年ルール・125%ルールがない変動金利のため、日銀利上げ時は翌年から毎月の引き落とし額が上限なく直撃増加します。',
    );
  }

  let grade: UnderwritingResult['grade'] = 'A';
  if (stressDtiPercent <= 24 && ltvPercent <= 90 && !config.hasCreditBlemish && maturityAge <= 75) {
    grade = 'S';
  } else if (stressDtiPercent <= 31 && ltvPercent <= 100) {
    grade = 'A';
  } else if (stressDtiPercent <= 38) {
    grade = 'B';
  } else {
    grade = 'C';
  }

  const bankComment =
    grade === 'S'
      ? '【優良承認】返済負担率・自己資金比率ともに極めて健全です。優遇金利の最下限で融資を実行します。'
      : grade === 'A'
        ? '【本審査承認】標準的な審査基準をクリアしています。今後の金利変動と修繕積立金の上昇に備えて手元資金を厚めに保ってください。'
        : grade === 'B'
          ? '【条件付承認（要注意）】審査は通過しましたが、金利上昇や教育費ピーク時に家計収支が赤字転落するリスクがあります。'
          : '【高リスク警告承認】審査金利ベースの返済負担率が限界ラインです！少しの金利上昇や賞与減額で破綻しかねないため、繰上返済や家計防衛が必須です。';

  return {
    approved,
    ConditionalReductionMan: conditionalReductionMan,
    grade,
    loanPrincipalMan: requestedPrincipalMan,
    closingCostsMan,
    cashRemainingAfterPurchaseMan,
    effectiveInitialRate,
    stressDtiPercent,
    actualDtiPercent,
    ltvPercent,
    maturityAge,
    initialMonthlyPaymentMan,
    initialBonusPaymentMan,
    initialMonthlyRunningCostMan,
    initialTotalMonthlyOutflowMan,
    maxTaxDeductionAnnualMan: taxInfo.creditMan,
    taxDeductionYears: taxInfo.maxYears,
    warnings,
    bankComment,
  };
}

/**
 * 職種（雇用形態）ごとの標準的な定年退職金目安（万円）を返す
 * メガベンチャー・外資やフリーランスは退職金制度なし（0万円）が基本
 */
export function getDefaultRetirementAllowanceMan(employment: EmploymentType): number {
  switch (employment) {
    case 'civil-servant':
      return 2100;
    case 'listed-corp':
      return 1750;
    case 'sme':
      return 550;
    case 'mega-venture':
      return 0;
    case 'freelance':
      return 0;
  }
}

/**
 * 世帯のキャリア・給与カーブ・退職金・定年後就労・配偶者就労・教育費設定の実効値を解決する
 */
export function resolveEffectiveHouseholdCareerAndEdu(config: MortgageSetupConfig): {
  salaryCurve: SalaryCurveType;
  retirementAllowanceMan: number;
  postRetirementWork: PostRetirementWorkType;
  spouseWorkPattern: SpouseWorkPatternType;
  hasSpouse: boolean;
  initialSubIncomeMan: number;
  initialJobLabel: string;
  initialSpouseJobLabel: string;
  juniorHighPath: JuniorHighPathType;
  higherEdPath: HigherEdPathType;
  cramSchoolPolicy: CramSchoolPolicyType;
  hasGakushiHoken: boolean;
  scholarshipType: ScholarshipType;
  insurancePlan: FireEarthquakeInsuranceType;
  leisureStyle: LeisureStyleType;
} {
  const family = FAMILY_PLANS[config.familyPlan] ?? FAMILY_PLANS['child-1-public'];
  const propForIns = resolveEffectiveProperty(config);

  const defaultCurve: SalaryCurveType =
    config.employment === 'civil-servant'
      ? 'steady-up'
      : config.employment === 'listed-corp'
        ? 'standard-plateau'
        : config.employment === 'mega-venture' || config.employment === 'freelance'
          ? 'performance-volatile'
          : 'flat-stagnant';
  const salaryCurve = config.salaryCurve ?? defaultCurve;

  const retirementAllowanceMan =
    typeof config.retirementAllowanceMan === 'number'
      ? Math.max(0, Math.round(config.retirementAllowanceMan))
      : getDefaultRetirementAllowanceMan(config.employment);

  const defaultPostRetire: PostRetirementWorkType =
    config.employment === 'civil-servant' || config.employment === 'listed-corp'
      ? 'reemploy-same'
      : config.employment === 'sme'
        ? 'reemploy-light-job'
        : 'part-time-arubaito';
  const postRetirementWork = config.postRetirementWork ?? defaultPostRetire;

  // 配偶者の働き方パターンの解決
  let spouseWorkPattern: SpouseWorkPatternType;
  if (config.spouseWorkPattern) {
    spouseWorkPattern = config.spouseWorkPattern;
  } else if (
    config.archetypeId === 'single-solo-compact' &&
    config.contractType === 'single' &&
    family.childrenCount === 0 &&
    config.subIncomeMan === 0
  ) {
    spouseWorkPattern = 'no-spouse';
  } else if (config.contractType === 'pair') {
    spouseWorkPattern = 'fulltime-keep';
  } else if (config.subIncomeMan >= 240) {
    spouseWorkPattern = 'fulltime-keep';
  } else if (config.subIncomeMan > 0) {
    spouseWorkPattern = 'part-time';
  } else {
    spouseWorkPattern = family.childrenCount > 0 ? 'homemaker-to-part' : 'homemaker';
  }

  // ペアローン・収入合算なのに配偶者なし/専業となっている場合は整合させる
  if (
    (config.contractType === 'pair' || config.contractType === 'income-merge') &&
    (spouseWorkPattern === 'no-spouse' || spouseWorkPattern === 'homemaker')
  ) {
    spouseWorkPattern = config.subIncomeMan >= 220 ? 'fulltime-keep' : 'part-time';
  }

  const hasSpouse = spouseWorkPattern !== 'no-spouse';

  const initialSubIncomeMan =
    !hasSpouse || spouseWorkPattern === 'homemaker' || spouseWorkPattern === 'homemaker-to-part'
      ? 0
      : spouseWorkPattern === 'part-time'
        ? config.subIncomeMan > 0
          ? Math.min(180, config.subIncomeMan)
          : 120
        : config.subIncomeMan > 0
          ? config.subIncomeMan
          : 300;

  const initialJobLabel = `${EMPLOYMENT_LABELS[config.employment]}（${SALARY_CURVE_SPECS[salaryCurve].shortLabel}）`;
  const initialSpouseJobLabel = SPOUSE_WORK_SPECS[spouseWorkPattern].initialJobTitle;

  const juniorHighPath: JuniorHighPathType =
    config.juniorHighPath ?? (family.isPrivateSchool ? 'private-exam-jhs' : 'public-jhs');
  const higherEdPath: HigherEdPathType =
    config.higherEdPath ?? (family.isPrivateSchool ? 'private-arts-univ' : 'national-univ');
  const cramSchoolPolicy: CramSchoolPolicyType =
    config.cramSchoolPolicy ??
    (juniorHighPath === 'private-exam-jhs' ? 'intensive-cram' : 'standard-cram');
  const hasGakushiHoken =
    config.hasGakushiHoken !== undefined
      ? config.hasGakushiHoken
      : family.childrenCount > 0 && config.age <= 37;
  const scholarshipType: ScholarshipType = config.scholarshipType ?? 'none';
  const insurancePlan: FireEarthquakeInsuranceType =
    config.insurancePlan ??
    (propForIns.buildingType === 'detached'
      ? 'full-fire-earthquake-water'
      : 'standard-fire-earthquake');
  const leisureStyle: LeisureStyleType = config.leisureStyle ?? 'moderate-leisure';

  return {
    salaryCurve,
    retirementAllowanceMan,
    postRetirementWork,
    spouseWorkPattern,
    hasSpouse,
    initialSubIncomeMan,
    initialJobLabel,
    initialSpouseJobLabel,
    juniorHighPath,
    higherEdPath,
    cramSchoolPolicy,
    hasGakushiHoken,
    scholarshipType,
    insurancePlan,
    leisureStyle,
  };
}

/**
 * 世帯属性（年齢・雇用・年収・給与カーブ・退職金・定年後就労・配偶者就労・教育方針・頭金・契約方式）を多彩にランダム生成する
 */
export function randomizeHouseholdParams(
  prev: MortgageSetupConfig,
  rng: () => number = Math.random,
): MortgageSetupConfig {
  const arch = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)] ?? ARCHETYPES[0];
  // 選択された世帯モデルの借入時年齢（例：29歳・地方都市の敷地60坪＆太陽光戸建て世帯なら29歳）から正確にスタートする
  const age = arch.age;
  const employments: EmploymentType[] = [
    'listed-corp',
    'civil-servant',
    'mega-venture',
    'sme',
    'freelance',
  ];
  const employment =
    rng() < 0.6 ? arch.employment : (employments[Math.floor(rng() * employments.length)] ?? 'listed-corp');

  const mainIncomeMan =
    Math.round(
      Math.max(300, Math.min(1400, arch.mainIncomeMan * (0.78 + rng() * 0.44))) / 10,
    ) * 10;

  // 給与カーブ（職種に応じた現実的な確率で上がる人・横ばいの人・下がる人を抽選）
  const curveRoll = rng();
  const salaryCurve: SalaryCurveType =
    employment === 'civil-servant'
      ? curveRoll < 0.68
        ? 'steady-up'
        : 'standard-plateau'
      : employment === 'listed-corp'
        ? curveRoll < 0.35
          ? 'steady-up'
          : curveRoll < 0.78
            ? 'standard-plateau'
            : curveRoll < 0.92
              ? 'performance-volatile'
              : 'downward-pressure'
        : employment === 'mega-venture'
          ? curveRoll < 0.35
            ? 'steady-up'
            : curveRoll < 0.78
              ? 'performance-volatile'
              : 'downward-pressure'
          : employment === 'sme'
            ? curveRoll < 0.2
              ? 'standard-plateau'
              : curveRoll < 0.62
                ? 'flat-stagnant'
                : curveRoll < 0.82
                  ? 'performance-volatile'
                  : 'downward-pressure'
            : curveRoll < 0.55
              ? 'performance-volatile'
              : curveRoll < 0.8
                ? 'flat-stagnant'
                : 'downward-pressure';

  // 退職金（職種によって「退職金制度なし(0円)」〜「2,300万円」までリアルに抽選）
  const retRoll = rng();
  const retirementAllowanceMan =
    employment === 'civil-servant'
      ? 1800 + Math.floor(rng() * 6) * 100
      : employment === 'listed-corp'
        ? retRoll < 0.14
          ? 0 // 前払い退職金制度・外資系等で退職金一時金0円のケース
          : 1100 + Math.floor(rng() * 12) * 100
        : employment === 'sme'
          ? retRoll < 0.4
            ? 0 // 中小企業の約4割は退職金制度なし
            : 300 + Math.floor(rng() * 8) * 100
          : employment === 'mega-venture'
            ? retRoll < 0.78
              ? 0
              : 400 + Math.floor(rng() * 5) * 100
            : retRoll < 0.75
              ? 0
              : 300 + Math.floor(rng() * 6) * 100;

  // 定年後の働き方（嘱託再雇用 / 別職種転身 / アルバイト・パート / 65歳から働かない / 60歳から働かない）
  const postRetireChoices: PostRetirementWorkType[] = [
    'reemploy-same',
    'reemploy-light-job',
    'part-time-arubaito',
    'retire-65-pension-only',
    'full-retire-60',
  ];
  const postRetirementWork: PostRetirementWorkType =
    employment === 'freelance'
      ? rng() < 0.65
        ? 'part-time-arubaito'
        : 'full-retire-60'
      : postRetireChoices[Math.floor(rng() * postRetireChoices.length)] ?? 'reemploy-same';

  const familyKeys = Object.keys(FAMILY_PLANS) as FamilyPlanType[];
  const familyPlan =
    rng() < 0.6
      ? arch.recommendedFamily
      : (familyKeys[Math.floor(rng() * familyKeys.length)] ?? 'child-1-public');
  const familySpec = FAMILY_PLANS[familyPlan];

  const isSoloArchetype = arch.id === 'single-solo-compact' && familyPlan === 'dinks';
  const contractChoices: ContractType[] = ['single', 'pair', 'income-merge'];
  const contractType: ContractType = isSoloArchetype
    ? 'single'
    : rng() < 0.65
      ? arch.recommendedContract
      : (contractChoices[Math.floor(rng() * contractChoices.length)] ?? 'single');

  // 配偶者（奥さん・パートナー）の働き方・バイト可能性
  let spouseWorkPattern: SpouseWorkPatternType;
  let subIncomeMan = 0;
  if (isSoloArchetype && rng() < 0.75) {
    spouseWorkPattern = 'no-spouse';
    subIncomeMan = 0;
  } else if (contractType === 'pair') {
    spouseWorkPattern = rng() < 0.72 ? 'fulltime-keep' : 'shift-to-part';
    subIncomeMan = Math.round((260 + rng() * 520) / 10) * 10;
  } else if (contractType === 'income-merge') {
    const spRoll = rng();
    spouseWorkPattern =
      spRoll < 0.45 ? 'part-time' : spRoll < 0.78 ? 'shift-to-part' : 'fulltime-keep';
    subIncomeMan =
      spouseWorkPattern === 'part-time'
        ? Math.round((100 + rng() * 60) / 10) * 10
        : Math.round((220 + rng() * 320) / 10) * 10;
  } else {
    // 単独ローンの場合：専業主婦 / 途中からパート・バイト復帰 / パート・バイト / 正社員共働き
    const spRoll = rng();
    if (spRoll < 0.25) {
      spouseWorkPattern = 'homemaker';
      subIncomeMan = 0;
    } else if (spRoll < 0.55) {
      spouseWorkPattern = 'homemaker-to-part';
      subIncomeMan = 0;
    } else if (spRoll < 0.85) {
      spouseWorkPattern = 'part-time';
      subIncomeMan = Math.round((90 + rng() * 60) / 10) * 10;
    } else {
      spouseWorkPattern = 'fulltime-keep';
      subIncomeMan = Math.round((240 + rng() * 240) / 10) * 10;
    }
  }

  // 子どもの教育プラン詳細（子どもがいる世帯のみ抽選）
  const juniorHighPath: JuniorHighPathType =
    familySpec.childrenCount === 0
      ? 'public-jhs'
      : familySpec.isPrivateSchool || rng() < 0.26
        ? 'private-exam-jhs'
        : 'public-jhs';

  const higherEdCandidates: HigherEdPathType[] = [
    'national-univ',
    'private-arts-univ',
    'private-science-univ',
    'vocational-2yr',
    'high-school-job',
  ];
  const higherEdPath: HigherEdPathType =
    familySpec.childrenCount === 0
      ? 'national-univ'
      : juniorHighPath === 'private-exam-jhs'
        ? rng() < 0.55
          ? 'private-arts-univ'
          : rng() < 0.85
            ? 'private-science-univ'
            : 'national-univ'
        : (higherEdCandidates[Math.floor(rng() * higherEdCandidates.length)] ?? 'private-arts-univ');

  const hasGakushiHoken = familySpec.childrenCount > 0 ? rng() < 0.52 : false;
  const scholarshipChoices: ScholarshipType[] = ['none', 'none', 'jasso-loan', 'grant-workstudy'];
  const scholarshipType: ScholarshipType =
    familySpec.childrenCount === 0 || higherEdPath === 'high-school-job'
      ? 'none'
      : (scholarshipChoices[Math.floor(rng() * scholarshipChoices.length)] ?? 'none');

  const cramChoices: CramSchoolPolicyType[] = [
    'intensive-cram',
    'standard-cram',
    'standard-cram',
    'minimal-self-study',
  ];
  const cramSchoolPolicy: CramSchoolPolicyType =
    familySpec.childrenCount === 0
      ? 'standard-cram'
      : juniorHighPath === 'private-exam-jhs'
        ? rng() < 0.72
          ? 'intensive-cram'
          : 'standard-cram'
        : (cramChoices[Math.floor(rng() * cramChoices.length)] ?? 'standard-cram');

  const leisureChoices: LeisureStyleType[] = [
    'active-travel',
    'moderate-leisure',
    'moderate-leisure',
    'frugal-staycation',
  ];
  const leisureStyle: LeisureStyleType =
    leisureChoices[Math.floor(rng() * leisureChoices.length)] ?? 'moderate-leisure';

  const initialSavingsMan =
    Math.round(Math.max(200, Math.min(2800, arch.initialSavingsMan * (0.7 + rng() * 0.65))) / 50) * 50;

  const maxSafeDown = Math.max(0, initialSavingsMan - 250);
  const downPaymentMan =
    rng() < 0.32
      ? 0
      : Math.min(maxSafeDown, Math.round((rng() * maxSafeDown * 0.85) / 50) * 50);

  const recProp = PROPERTIES[arch.recommendedProperty] ?? PROPERTIES['station-mansion-new'];

  return {
    ...prev,
    archetypeId: arch.id,
    age,
    employment,
    mainIncomeMan,
    subIncomeMan,
    salaryCurve,
    retirementAllowanceMan,
    postRetirementWork,
    spouseWorkPattern,
    juniorHighPath,
    higherEdPath,
    cramSchoolPolicy,
    hasGakushiHoken,
    scholarshipType,
    leisureStyle,
    initialSavingsMan,
    downPaymentMan,
    hasCreditBlemish: rng() < 0.12,
    contractType,
    familyPlan,
    propertyId: arch.recommendedProperty,
    customBuildingType: recProp.buildingType,
    customMgmtAndRepairMonthlyMan:
      recProp.buildingType === 'detached' ? 0 : prev.customMgmtAndRepairMonthlyMan,
  };
}

/**
 * マイホーム物件（種別・新築/中古・省エネ性能・物件価格・土地比率・維持費）を多彩にランダム生成する
 */
export function randomizePropertyParams(
  prev: MortgageSetupConfig,
  rng: () => number = Math.random,
  keepBuildingTypeConsistentWithHousehold = false,
): MortgageSetupConfig {
  const currentArch = ARCHETYPES.find((a) => a.id === prev.archetypeId) ?? ARCHETYPES[0];
  const archRecProp = PROPERTIES[currentArch.recommendedProperty] ?? PROPERTIES['station-mansion-new'];
  const allPropKeys = Object.keys(PROPERTIES) as PropertyCategory[];
  const matchingPropKeys = allPropKeys.filter(
    (k) => PROPERTIES[k].buildingType === archRecProp.buildingType,
  );
  const candidateKeys =
    keepBuildingTypeConsistentWithHousehold && matchingPropKeys.length > 0
      ? matchingPropKeys
      : allPropKeys;

  const propertyId = candidateKeys[Math.floor(rng() * candidateKeys.length)] ?? 'station-mansion-new';
  const baseProp = PROPERTIES[propertyId];

  // 物件プリセットの建物種別（一戸建て / マンション / タワマン）をそのまま維持し、戸建てとマンションが混ざるバグを完全に防止
  const customBuildingType = baseProp.buildingType;

  const customIsNew = rng() < 0.64;
  const customBuiltAge = customIsNew ? 0 : 4 + Math.floor(rng() * 24);

  const certs: ('long-term-excellent' | 'zeh' | 'standard' | 'non-compliant')[] = customIsNew
    ? ['long-term-excellent', 'zeh', 'standard']
    : ['long-term-excellent', 'zeh', 'standard', 'non-compliant'];
  const customEnergyCert = certs[Math.floor(rng() * certs.length)] ?? baseProp.energyCert;

  // 価格を物件タイプと新築/中古に応じてリアルかつ多彩に生成（20万円刻み）
  const usedDiscount = customIsNew ? 1.0 : Math.max(0.58, 0.92 - customBuiltAge * 0.012);
  const randomFactor = 0.78 + rng() * 0.48;
  const customPropertyPriceMan = Math.max(
    1600,
    Math.min(15800, Math.round((baseProp.priceMan * usedDiscount * randomFactor) / 20) * 20),
  );

  const customLandRatio =
    Math.round(
      Math.max(0.15, Math.min(0.75, baseProp.landRatio + (rng() - 0.5) * 0.22)) * 100,
    ) / 100;

  const baseMaint =
    baseProp.initialMgmtFeeMonthlyMan +
    baseProp.initialRepairFeeMonthlyMan +
    baseProp.parkingMonthlyMan;
  // 一戸建ては管理組合の管理費・修繕積立金が 0円
  const customMgmtAndRepairMonthlyMan =
    customBuildingType === 'detached'
      ? 0
      : customBuildingType === 'tower'
        ? Math.round((3.6 + rng() * 3.8) * 10) / 10
        : Math.round(Math.max(1.8, baseMaint * (0.8 + rng() * 0.45)) * 10) / 10;

  // 火災保険・地震保険プランの抽選（一戸建てはフル補償または標準、マンションは標準中心）
  const insRoll = rng();
  const insurancePlan: FireEarthquakeInsuranceType =
    customBuildingType === 'detached'
      ? insRoll < 0.55
        ? 'full-fire-earthquake-water'
        : insRoll < 0.88
          ? 'standard-fire-earthquake'
          : 'minimal-fire-only'
      : insRoll < 0.28
        ? 'full-fire-earthquake-water'
        : insRoll < 0.82
          ? 'standard-fire-earthquake'
          : 'minimal-fire-only';

  return {
    ...prev,
    propertyId,
    customBuildingType,
    customIsNew,
    customBuiltAge,
    customEnergyCert,
    customPropertyPriceMan,
    customLandRatio,
    customMgmtAndRepairMonthlyMan,
    insurancePlan,
  };
}

/**
 * 借入銀行・金利タイプ・初期金利・返済期間・元利/元金・団信を多彩にランダム生成する
 */
export function randomizeBankLoanParams(
  prev: MortgageSetupConfig,
  rng: () => number = Math.random,
): MortgageSetupConfig {
  const bankKeys = Object.keys(BANKS) as BankId[];
  const bankId = bankKeys[Math.floor(rng() * bankKeys.length)] ?? 'mega-bank';
  const baseBank = BANKS[bankId];

  const customRateType = baseBank.rateType;
  const rawRateRoll = rng();
  const mixRatioCandidates = [20, 30, 40, 50, 50, 60, 70, 80];
  const mixFixedRatioPercent =
    customRateType === 'mix'
      ? (mixRatioCandidates[Math.floor(rawRateRoll * mixRatioCandidates.length)] ?? 50)
      : undefined;
  const rateJitter = (rawRateRoll - 0.35) * 0.36;
  const mixWeightedBase =
    mixFixedRatioPercent !== undefined
      ? (2.18 * mixFixedRatioPercent + 0.82 * (100 - mixFixedRatioPercent)) / 100
      : baseBank.baseRate;
  const customBaseRate =
    Math.round(Math.max(0.5, Math.min(3.8, mixWeightedBase + rateJitter)) * 100) / 100;
  const customHas5Year125Rule =
    customRateType === 'variable' ? (rng() < 0.7 ? baseBank.has5Year125Rule : !baseBank.has5Year125Rule) : false;

  const termCandidates = [20, 25, 30, 35, 35, 35, 40, 45, 50];
  const rawTerm = termCandidates[Math.floor(rng() * termCandidates.length)] ?? 35;
  const termYears: LoanTermYears = prev.age + rawTerm > 85 ? Math.max(20, 80 - prev.age) : rawTerm;

  const repaymentMethod: RepaymentMethod = rng() < 0.78 ? 'equal-payment' : 'equal-principal';
  const bonusCandidates = [0, 0, 0, 0.1, 0.2, 0.3];
  const bonusRepaymentRatio =
    bonusCandidates[Math.floor(rng() * bonusCandidates.length)] ?? 0;

  const danshinKeys = Object.keys(DANSHIN_PLANS) as DanshinType[];
  const danshin = danshinKeys[Math.floor(rng() * danshinKeys.length)] ?? 'cancer-50';
  const baseSpread = DANSHIN_PLANS[danshin].spreadRate;
  const customDanshinSpread =
    danshin === 'basic'
      ? 0
      : Math.round(Math.max(0.05, Math.min(0.45, baseSpread + (rng() - 0.4) * 0.12)) * 100) / 100;

  return {
    ...prev,
    bankId,
    customRateType,
    customBaseRate,
    customHas5Year125Rule,
    mixFixedRatioPercent,
    termYears,
    repaymentMethod,
    bonusRepaymentRatio,
    danshin,
    customDanshinSpread,
  };
}

/**
 * 抽選プロファイルおよび現在の契約条件サマリー文字列（年齢・世帯年収・退職金・給与カーブ・配偶者・家族構成・自己資金・頭金・購入後の手元資金・物件・借入額・期間・金利・団信・毎月支払額）を生成する
 */
export function formatSetupProfileSummary(config: MortgageSetupConfig): string {
  const prop = resolveEffectiveProperty(config);
  const bank = resolveEffectiveBank(config);
  const danshin = resolveEffectiveDanshin(config);
  const family = FAMILY_PLANS[config.familyPlan];
  const careerEdu = resolveEffectiveHouseholdCareerAndEdu(config);
  const uw = runBankUnderwriting(config);

  const householdGross = config.mainIncomeMan + careerEdu.initialSubIncomeMan;
  const bTypeLabel =
    prop.buildingType === 'tower'
      ? 'タワマン'
      : prop.buildingType === 'mansion'
        ? 'マンション'
        : '一戸建て';
  const newUsedLabel = prop.isNew ? '新築' : `中古築${prop.builtAge}年`;
  const contractLabel =
    config.contractType === 'pair'
      ? 'ペアローン'
      : config.contractType === 'income-merge'
        ? '収入合算'
        : '単独ローン';
  const fixedRatioPct = Math.max(10, Math.min(90, Math.round(config.mixFixedRatioPercent ?? 50)));
  const rateTypeShort =
    bank.rateType === 'variable'
      ? '変動'
      : bank.rateType === 'fixed-10'
        ? '10年固定'
        : bank.rateType === 'flat-35'
          ? '全期間固定'
          : `ミックス(固定${fixedRatioPct}%:変動${100 - fixedRatioPct}%)`;
  const methodShort = config.repaymentMethod === 'equal-principal' ? '元金均等' : '元利均等';
  const retireLabel =
    careerEdu.retirementAllowanceMan > 0
      ? `退職金見込${careerEdu.retirementAllowanceMan.toLocaleString()}万円`
      : '退職金制度なし(0円)';
  const insSummary = `${INSURANCE_PLAN_SPECS[careerEdu.insurancePlan].shortLabel}・固定資産税 年${prop.annualPropertyTaxMan}万・${LEISURE_STYLE_SPECS[careerEdu.leisureStyle].shortLabel}`;

  return `${config.age}歳・世帯年収${householdGross.toLocaleString()}万円（${EMPLOYMENT_LABELS[config.employment]}・${SALARY_CURVE_SPECS[careerEdu.salaryCurve].shortLabel}・${retireLabel}・${SPOUSE_WORK_SPECS[careerEdu.spouseWorkPattern].shortLabel}・${contractLabel}・購入時：${family.name}） / 自己資金${config.initialSavingsMan.toLocaleString()}万円（頭金${config.downPaymentMan.toLocaleString()}万・諸費用${uw.closingCostsMan.toLocaleString()}万 → 購入後の手元資金${uw.cashRemainingAfterPurchaseMan.toLocaleString()}万円） / ${newUsedLabel}${bTypeLabel} ${prop.priceMan.toLocaleString()}万円（借入元本${uw.loanPrincipalMan.toLocaleString()}万円・${insSummary}） / ${config.termYears}年ローン・${uw.maturityAge}歳完済（${rateTypeShort} 金利${uw.effectiveInitialRate.toFixed(2)}%・${methodShort}・${danshin.shortName}） / 初年度 毎月返済${uw.initialMonthlyPaymentMan}万円（維持費・税込 実質月${uw.initialTotalMonthlyOutflowMan}万円）`;
}

/**
 * 統計分布とランダム変動を組み合わせた多彩な世帯・物件・ローン条件の自動生成
 */
export function generateRandomHouseholdSetup(rng: () => number = Math.random): MortgageSetupConfig {
  const baseDefault: MortgageSetupConfig = {
    archetypeId: ARCHETYPES[0].id,
    age: 32,
    employment: 'listed-corp',
    mainIncomeMan: 650,
    subIncomeMan: 400,
    initialSavingsMan: 900,
    downPaymentMan: 400,
    hasCreditBlemish: false,
    contractType: 'pair',
    familyPlan: 'child-1-public',
    propertyId: 'station-mansion-new',
    bankId: 'mega-bank',
    termYears: 35,
    repaymentMethod: 'equal-payment',
    bonusRepaymentRatio: 0,
    danshin: 'cancer-50',
    macroRegime: 'gradual-hike',
  };

  const withHouse = randomizeHouseholdParams(baseDefault, rng);
  const withProp = randomizePropertyParams(withHouse, rng, true);
  const withLoan = randomizeBankLoanParams(withProp, rng);
  const careerEdu = resolveEffectiveHouseholdCareerAndEdu(withLoan);

  // 世帯収入と物件価格が極端に乖離しすぎないようリアルな範囲に自動調整（かつフルローンや背伸び購入のスリルも残す）
  const householdGross = withLoan.mainIncomeMan + careerEdu.initialSubIncomeMan;
  const minRealisticPrice = Math.max(1680, Math.round((householdGross * 3.4) / 20) * 20);
  const maxRealisticPrice = Math.min(15800, Math.round((householdGross * 9.2) / 20) * 20);
  const adjustedPrice = Math.max(
    minRealisticPrice,
    Math.min(maxRealisticPrice, withLoan.customPropertyPriceMan ?? PROPERTIES[withLoan.propertyId].priceMan),
  );

  const regimes: MacroRegimeId[] = [
    'gradual-hike',
    'stagflation-shock',
    'asset-bubble',
    'deflation-return',
    'dynamic-random',
  ];
  const macroRegime = regimes[Math.floor(rng() * regimes.length)] ?? 'gradual-hike';

  const finalConfig: MortgageSetupConfig = {
    ...withLoan,
    subIncomeMan: careerEdu.initialSubIncomeMan,
    customPropertyPriceMan: adjustedPrice,
    macroRegime,
  };

  return {
    ...finalConfig,
    randomRollSummary: formatSetupProfileSummary(finalConfig),
  };
}

/**
 * ゲーム初期状態の生成（融資実行・鍵引き渡し時点）
 */
export function createMortgageGame(config: MortgageSetupConfig): MortgageGameState {
  const bank = resolveEffectiveBank(config);
  const property = resolveEffectiveProperty(config);
  const family = FAMILY_PLANS[config.familyPlan];
  const careerEdu = resolveEffectiveHouseholdCareerAndEdu(config);
  const effectiveTermYears: LoanTermYears = Math.max(10, Math.min(50, Math.round(config.termYears)));
  const normalizedConfig: MortgageSetupConfig = {
    ...config,
    termYears: effectiveTermYears,
    salaryCurve: careerEdu.salaryCurve,
    retirementAllowanceMan: careerEdu.retirementAllowanceMan,
    postRetirementWork: careerEdu.postRetirementWork,
    spouseWorkPattern: careerEdu.spouseWorkPattern,
    juniorHighPath: careerEdu.juniorHighPath,
    higherEdPath: careerEdu.higherEdPath,
    cramSchoolPolicy: careerEdu.cramSchoolPolicy,
    hasGakushiHoken: careerEdu.hasGakushiHoken,
    scholarshipType: careerEdu.scholarshipType,
    insurancePlan: careerEdu.insurancePlan,
    leisureStyle: careerEdu.leisureStyle,
  };
  const underwriting = runBankUnderwriting(normalizedConfig);

  const landValueMan = Math.round(property.priceMan * property.landRatio);
  // 新築は鍵を開けた瞬間に建物プレミアムが約10%剥落するリアルな市場価格特性を反映
  const initialBuildingMarketFactor = property.isNew ? 0.9 : 0.96;
  const buildingValueMan = Math.round(
    property.priceMan * (1 - property.landRatio) * initialBuildingMarketFactor,
  );
  const propertyValueMan = landValueMan + buildingValueMan;

  const initialMonthlyBase = calcEqualPaymentMonthlyMan(
    underwriting.loanPrincipalMan,
    underwriting.effectiveInitialRate,
    effectiveTermYears,
  );

  const initialChildrenAges: number[] =
    family.childrenCount === 1
      ? [2]
      : family.childrenCount === 2
        ? [3, 0]
        : family.childrenCount === 3
          ? [5, 2, 0]
          : [];

  const retireNote =
    careerEdu.retirementAllowanceMan > 0
      ? `退職金見込${careerEdu.retirementAllowanceMan.toLocaleString()}万円`
      : '退職金制度なし(0円)';

  const initialChronicle: ChronicleEntry = {
    id: 1,
    yearIndex: 0,
    calendarYear: 2026,
    age: normalizedConfig.age,
    category: 'milestone',
    tone: 'neutral',
    title: `【融資実行・鍵引き渡し】借入 ${underwriting.loanPrincipalMan.toLocaleString()}万円（${effectiveTermYears}年ローン・${bank.shortName}）`,
    body: `${property.name}（物件価格 ${property.priceMan.toLocaleString()}万円）の引渡しが完了。頭金 ${normalizedConfig.downPaymentMan}万円・諸費用 ${underwriting.closingCostsMan}万円を精算し、手元キャッシュ ${underwriting.cashRemainingAfterPurchaseMan}万円で${effectiveTermYears}年間の返済サバイバルが始まった（${careerEdu.initialJobLabel}・${retireNote}）。`,
    statNote: `完済予定年齢：${underwriting.maturityAge}歳 / 実質住居費（${property.buildingType === 'detached' ? '固定資産税・光熱費込' : '管理費・修繕積立金・税金込'}）：月${underwriting.initialTotalMonthlyOutflowMan}万円`,
  };

  return {
    config: normalizedConfig,
    underwriting,
    status: 'playing',
    yearIndex: 0,
    calendarYear: 2026,
    age: normalizedConfig.age,
    termRemainingYears: effectiveTermYears,
    remainingBalanceMan: underwriting.loanPrincipalMan,
    unpaidInterestMan: 0,
    liquidSavingsMan: underwriting.cashRemainingAfterPurchaseMan,
    propertyValueMan,
    landValueMan,
    buildingValueMan,
    bojPolicyRate: 0.75,
    appliedInterestRate: underwriting.effectiveInitialRate,
    last5YearRulePaymentMan: initialMonthlyBase,
    yearsSinceLast5YearRevision: 0,
    currentRateType: bank.rateType,
    has5Year125Rule: bank.has5Year125Rule,
    mainIncomeMan: normalizedConfig.mainIncomeMan,
    subIncomeMan: careerEdu.initialSubIncomeMan,
    currentJobLabel: careerEdu.initialJobLabel,
    currentSpouseJobLabel: careerEdu.initialSpouseJobLabel,
    currentMgmtAndRepairMonthlyMan:
      property.initialMgmtFeeMonthlyMan +
      property.initialRepairFeeMonthlyMan +
      property.parkingMonthlyMan,
    annualPropertyTaxCurrentMan: property.annualPropertyTaxMan,
    cumulativePriceIndex: 100,
    repairCostInflationMult: 1.0,
    mentalScore: 82,
    healthScore: 86,
    focusMode: 'balanced',
    companions: createInitialCompanions(),
    arrearsMonths: 0,
    rescheduleYearsLeft: 0,
    danshinTriggered: false,
    isDivorced: false,
    childrenAges: initialChildrenAges,
    totalPrincipalPaidMan: 0,
    totalInterestPaidMan: 0,
    totalRunningCostPaidMan: 0,
    totalTaxCreditReceivedMan: 0,
    totalPrepaymentMan: 0,
    history: [],
    chronicle: [initialChronicle],
    pendingDecision: null,
    triggeredEventIds: [],
    ending: null,
    score: 0,
  };
}

/**
 * 子ども1人あたりの年間教育費(万円)を「中学受験の有無」「入塾・夏期講習・大学予備校方針」「高校卒業後の進路（国公立大/私立文系/私立理系/専門学校2年/高卒就職）」「学資保険積立」「奨学金」「累積物価指数」から精密算出
 */
export function calcDetailedChildAnnualEduCostMan(
  childAge: number,
  config: MortgageSetupConfig,
  cumulativePriceIndex = 100,
): number {
  const careerEdu = resolveEffectiveHouseholdCareerAndEdu(config);
  const isExamJhs = careerEdu.juniorHighPath === 'private-exam-jhs';
  const higherEd = careerEdu.higherEdPath;
  const cramSpec = CRAM_SCHOOL_SPECS[careerEdu.cramSchoolPolicy];
  const gakushiPremium = careerEdu.hasGakushiHoken && childAge < 18 ? 11 : 0; // 学資保険積立：17歳まで年11万円（18歳時に+200万円満期受取）
  // 教育費・塾月謝・季節講習費のインフレ連動（物価上昇の約55%が授業料・塾代に転嫁される現実的なモデル）
  const eduInfMult = Math.max(0.95, Math.min(1.45, 1 + ((cumulativePriceIndex - 100) / 100) * 0.55));

  if (childAge < 3) return Math.round(22 * eduInfMult) + gakushiPremium;
  if (childAge < 6) return Math.round((isExamJhs ? 46 : 28) * eduInfMult) + gakushiPremium; // 幼稚園・保育園
  if (childAge < 9) {
    // 小1〜小3（学校費＋早期習い事・低学年塾）
    const baseElemLow = (isExamJhs ? 44 : 26) + Math.round(cramSpec.elementaryExtraMan * 0.6);
    return Math.round(baseElemLow * eduInfMult) + gakushiPremium;
  }
  if (childAge < 12) {
    // 小4〜小6（中学受験ありなら進学塾代ピーク、公立中進学でも英語・算数塾や習い事）
    const baseElemHigh = (isExamJhs ? 98 : 30) + cramSpec.elementaryExtraMan;
    return Math.round(baseElemHigh * eduInfMult) + gakushiPremium;
  }
  if (childAge < 15) {
    // 中1〜中3（私立中高一貫 or 公立中 ＋ 高校受験進学塾・夏期/冬期講習）
    const baseJhs = (isExamJhs ? 114 : 30) + cramSpec.jhsCramAnnualMan;
    return Math.round(baseJhs * eduInfMult) + gakushiPremium;
  }
  if (childAge < 18) {
    // 高1〜高3（高校学費 ＋ 大学受験予備校・季節講習・模試代）
    const hsYobiko =
      higherEd === 'high-school-job'
        ? Math.round(cramSpec.hsYobikoAnnualMan * 0.2)
        : cramSpec.hsYobikoAnnualMan;
    const baseHs = (isExamJhs ? 74 : 32) + hsYobiko;
    return Math.round(baseHs * eduInfMult) + gakushiPremium;
  }

  // 18歳以降：進路（高卒就職 / 専門学校2年 / 国公立大4年 / 私立文系4年 / 私立理系4年）と奨学金軽減を反映
  if (higherEd === 'high-school-job') {
    return 0; // 18歳で高校卒業・就職独立！大学・専門費用は0円
  }

  const scholarshipRelief = SCHOLARSHIP_SPECS[careerEdu.scholarshipType].annualReliefMan;

  if (higherEd === 'vocational-2yr') {
    // 専門学校・短大（18〜19歳の2年間のみ在学、20歳で就職独立！）
    if (childAge >= 18 && childAge < 20) {
      const firstYearAdmission = childAge === 18 ? 35 : 0;
      const grossVoc = Math.round((132 + firstYearAdmission) * eduInfMult);
      return Math.max(15, grossVoc - scholarshipRelief);
    }
    return 0;
  }

  // 4年制大学（18〜21歳）
  if (childAge >= 18 && childAge < 22) {
    const firstYearAdmission = childAge === 18 ? 42 : 0;
    const baseAnnualUniv =
      higherEd === 'national-univ'
        ? 98
        : higherEd === 'private-science-univ'
          ? 182
          : 138; // private-arts-univ
    const grossUniv = Math.round((baseAnnualUniv + firstYearAdmission) * eduInfMult);
    return Math.max(15, grossUniv - scholarshipRelief);
  }

  return 0; // 22歳で大学卒業・独立
}

/**
 * 子どもが何歳で社会人として独立（親の扶養・基本生活費加算から外れるか）を返す
 */
export function getChildIndependenceAge(configOrPath: MortgageSetupConfig | HigherEdPathType): number {
  const path =
    typeof configOrPath === 'string'
      ? configOrPath
      : resolveEffectiveHouseholdCareerAndEdu(configOrPath).higherEdPath;
  if (path === 'high-school-job') return 18;
  if (path === 'vocational-2yr') return 20;
  return 22;
}

/**
 * 年齢とともに動的に変化する家族構成（単身→結婚→出産→子どもの成長段階→子どもの独立・エンプティネスト→シニア夫婦）と、
 * 現在の家族構成・同居人数・子どもの年齢に応じた年間基礎生活費（食費・水道光熱費・通信費・日用品・被服・小遣い等、教育費とは別枠）を算出する
 */
export function calcDynamicFamilyComposition(state: MortgageGameState): {
  adultCount: number;
  cohabitingChildrenAges: number[];
  independentChildrenAges: number[];
  totalHouseholdMembers: number;
  compositionLabel: string;
  annualBaseLivingCostMan: number;
} {
  const careerEdu = resolveEffectiveHouseholdCareerAndEdu(state.config);
  const hasPartner = careerEdu.hasSpouse && !state.isDivorced;
  const adultCount = hasPartner ? 2 : 1;
  const independenceAge = getChildIndependenceAge(state.config);
  const cohabitingChildrenAges = state.childrenAges.filter((a) => a < independenceAge);
  const independentChildrenAges = state.childrenAges.filter((a) => a >= independenceAge);
  const totalHouseholdMembers = adultCount + cohabitingChildrenAges.length;

  let compositionLabel: string;
  if (cohabitingChildrenAges.length === 0) {
    if (independentChildrenAges.length > 0) {
      compositionLabel = hasPartner
        ? `夫婦2人世帯（子ども${independentChildrenAges.length}人独立・巣立ち済）`
        : `単身1人世帯（子ども${independentChildrenAges.length}人独立・巣立ち済）`;
    } else {
      compositionLabel = hasPartner
        ? '夫婦2人世帯（2人暮らし）'
        : state.isDivorced
          ? '単身1人世帯（離別）'
          : '独身1人世帯（単身暮らし）';
    }
  } else {
    const indepSuffix =
      independentChildrenAges.length > 0 ? `・独立済${independentChildrenAges.length}人` : '';
    compositionLabel = hasPartner
      ? `${totalHouseholdMembers}人家族（夫婦＋同居子${cohabitingChildrenAges.length}人${indepSuffix}）`
      : `${totalHouseholdMembers}人家族（ひとり親＋同居子${cohabitingChildrenAges.length}人${indepSuffix}）`;
  }

  // 大人基礎生活費（単身1人 vs 現役夫婦2人 vs 65歳以上シニア夫婦2人）
  const baseAdultLiving =
    adultCount === 1 ? 150 : state.age >= 65 ? 194 : 206;

  // 同居中の子どもの年齢段階に応じた生活費加算（乳幼児→小学生→食べ盛り中高生→大学生、独立後は0円！）
  const childrenLivingAdditionMan = cohabitingChildrenAges.reduce((sum, cAge) => {
    if (cAge < 6) return sum + 22; // 乳幼児・未就学児
    if (cAge < 12) return sum + 30; // 小学生
    if (cAge < 15) return sum + 40; // 中学生（食費・スマホ通信費・部活費増）
    if (cAge < 18) return sum + 48; // 高校生（食費ピーク・被服・通信・小遣い）
    return sum + 44; // 大学生・専門学生（独立前の同居・仕送り生活費）
  }, 0);

  const priceMult = Math.max(0.92, (state.cumulativePriceIndex ?? 100) / 100);
  const annualBaseLivingCostMan = Math.round(
    (baseAdultLiving + childrenLivingAdditionMan) * Math.pow(priceMult, 0.62),
  );

  return {
    adultCount,
    cohabitingChildrenAges,
    independentChildrenAges,
    totalHouseholdMembers,
    compositionLabel,
    annualBaseLivingCostMan,
  };
}

/**
 * 国立がん研究センター「がん統計」・厚生労働省「患者調査」に基づく5歳階級別・年間疾病発症確率の算出
 * - がん（悪性新生物）：20代は年0.04%、30代前半0.08%、30代後半0.15%、40代前半0.28%、40代後半0.46%、50代前半0.75%、50代後半1.18%、60代前半1.68%、60代後半2.20%、70代2.68〜3.15%
 * - 心筋梗塞・脳卒中（3大疾病の血管疾患）：20代0.02%、30代0.05%、40代0.18%、50代0.42%、60代0.75%
 * - 一般疾病・長期入院（椎間板ヘルニア・消化器疾患・適応障害等、がん/3大疾病以外）：年0.55〜1.35%
 */
export function calcAnnualHealthRiskProbabilities(
  age: number,
  focusMode: FocusModeId = 'balanced',
  healthScore = 85,
): {
  cancerProb: number;
  vascularProb: number;
  threeMajorProb: number;
  generalIllnessProb: number;
} {
  let baseCancer = 0.0004; // 20代（〜29歳）：年0.04%
  if (age >= 75) baseCancer = 0.0315;
  else if (age >= 70) baseCancer = 0.0268;
  else if (age >= 65) baseCancer = 0.022;
  else if (age >= 60) baseCancer = 0.0168;
  else if (age >= 55) baseCancer = 0.0118;
  else if (age >= 50) baseCancer = 0.0075;
  else if (age >= 45) baseCancer = 0.0046;
  else if (age >= 40) baseCancer = 0.0028;
  else if (age >= 35) baseCancer = 0.0015;
  else if (age >= 30) baseCancer = 0.0008;

  let baseVascular = 0.0002;
  if (age >= 70) baseVascular = 0.011;
  else if (age >= 65) baseVascular = 0.0088;
  else if (age >= 60) baseVascular = 0.0068;
  else if (age >= 55) baseVascular = 0.0048;
  else if (age >= 50) baseVascular = 0.0034;
  else if (age >= 45) baseVascular = 0.0021;
  else if (age >= 40) baseVascular = 0.0013;
  else if (age >= 35) baseVascular = 0.0006;
  else if (age >= 30) baseVascular = 0.0004;

  let baseGeneral = 0.0055;
  if (age >= 60) baseGeneral = 0.0135;
  else if (age >= 50) baseGeneral = 0.0105;
  else if (age >= 40) baseGeneral = 0.0082;
  else if (age >= 30) baseGeneral = 0.0065;

  let lifestyleMult = 1.0;
  if (focusMode === 'family-health') {
    lifestyleMult *= 0.75; // 人間ドック・睡眠・運動重視でリスク25%低減
  } else if (focusMode === 'career-sidejob') {
    lifestyleMult *= 1.25; // 過労・ハードワークでリスク上昇
  }
  if (healthScore < 55) {
    lifestyleMult *= 1.22;
  } else if (healthScore >= 90) {
    lifestyleMult *= 0.9;
  }

  const cancerProb = Math.round(baseCancer * lifestyleMult * 100000) / 100000;
  const vascularProb = Math.round(baseVascular * lifestyleMult * 100000) / 100000;
  return {
    cancerProb,
    vascularProb,
    threeMajorProb: Math.round((cancerProb + vascularProb) * 100000) / 100000,
    generalIllnessProb: Math.round(baseGeneral * lifestyleMult * 100000) / 100000,
  };
}

/**
 * 結末・エンディング判定とスコア計算（27種類の多彩なライフストーリー結末パターン）
 */
export function evaluateEnding(
  state: MortgageGameState,
  reason: 'paid-off' | 'sold' | 'bankrupt' | 'divorce-deadlock',
): { ending: MortgageEnding; score: number } {
  const netEquity = Math.round(
    state.liquidSavingsMan + state.propertyValueMan - state.remainingBalanceMan - state.unpaidInterestMan,
  );
  const property = resolveEffectiveProperty(state.config);
  const careerEdu = resolveEffectiveHouseholdCareerAndEdu(state.config);
  const relocations = state.relocationCount ?? 0;

  // === 1. 離婚デッドロック破綻 ===
  if (reason === 'divorce-deadlock') {
    return {
      ending: {
        id: 'pair-loan-divorce-collapse',
        rank: 'BANKRUPT',
        title: '【ペアローン破綻】離婚・共有名義デッドロック破産',
        subtitle: `${state.age}歳（返済${state.yearIndex}年目）でペアローン解消不能に`,
        epilogue:
          'ペアローンで限界まで借り入れていたため、離婚時に片方の単独ローンへ一本化することもできず、オーバーローン状態で売却もできない「共有名義の監獄」に陥り家計が崩壊した。',
        statisticComparison:
          '日本の婚姻世帯の約3組に1組が離婚する中、ペアローン契約者の離婚時トラブルは近年最も深刻な不動産問題の1つとなっている。',
      },
      score: Math.max(150, state.yearIndex * 40),
    };
  }

  // === 2. 破産・代位弁済・競売系（原因別に5パターンに分岐） ===
  if (reason === 'bankrupt') {
    if (state.unpaidInterestMan >= 30 || state.termRemainingYears === 0) {
      return {
        ending: {
          id: 'unpaid-interest-balloon-bankruptcy',
          rank: 'BANKRUPT',
          title: '【未払利息・満期一括請求破産】5年ルールの罠と最終回精算の悲劇',
          subtitle: `${state.age}歳（返済${state.yearIndex}年目）で未払利息・残債の一括請求により破綻`,
          epilogue:
            '5年ルール・125%ルールで毎月の引き落とし額が抑えられていた裏で、急騰した金利の未払利息と先送り元金が蓄積。最後に一括精算を請求され、手元資金が完全にショートして競売・破産へと至った。',
          statisticComparison:
            '変動金利の5年ルールは「支払額を5年間据え置く」だけで利息は免除されないため、高金利が続くと満期時に巨額の一括返済が発生する。',
        },
        score: Math.max(140, state.yearIndex * 38),
      };
    }

    if (state.appliedInterestRate >= 2.25 && state.currentRateType === 'variable') {
      return {
        ending: {
          id: 'variable-rate-spike-bankruptcy',
          rank: 'BANKRUPT',
          title: '【変動金利急騰破産】日銀利上げの直撃で毎月返済額が限界突破',
          subtitle: `${state.age}歳（適用金利 ${state.appliedInterestRate.toFixed(2)}%）でキャッシュフロー崩壊`,
          epilogue:
            '購入時の低金利が永続すると見込んで変動金利を選んだものの、段階的な利上げにより適用金利が2%台後半へ急騰。膨れ上がった毎月返済額と物価高のダブルパンチに耐えきれず、期限の利益を喪失した。',
          statisticComparison:
            '借入額が大きい世帯ほど、金利1.5〜2.0%の上昇で年間返済額が60万〜120万円増加し、家計の安全余裕度を直撃する。',
        },
        score: Math.max(120, state.yearIndex * 36),
      };
    }

    if (state.childrenAges.some((a) => a >= 14 && a <= 22)) {
      return {
        ending: {
          id: 'education-and-loan-double-crush',
          rank: 'BANKRUPT',
          title: '【教育費＆ローン二重苦破産】進学・塾代ピークと住宅ローンの挟み撃ち',
          subtitle: `${state.age}歳（子どもの進学ピーク期）に手元資金が枯渇し代位弁済`,
          epilogue:
            '子どもの進学塾・予備校・大学学費のピークと、住宅ローン返済・修繕費の値上げが同じ時期に重なり、年間収支が大赤字に転落。教育費を優先するあまり住宅ローンの引き落とし口座が底を突いた。',
          statisticComparison:
            '40代後半〜50代前半は「大学費用ピーク」「マンション修繕積立金増額」「役職定年」の3つが同時に重なる家計最大の危険地帯である。',
        },
        score: Math.max(130, state.yearIndex * 37),
      };
    }

    if (state.age >= 60) {
      return {
        ending: {
          id: 'post-retirement-60s-bankruptcy',
          rank: 'BANKRUPT',
          title: '【老後・定年後ローン破産】60代以降の収入激減と残債の重圧で老後破綻',
          subtitle: `${state.age}歳（定年後の返済継続中）に老後キャッシュが完全枯渇`,
          epilogue:
            '現役時代はなんとか回っていた返済も、60歳定年・65歳年金生活に入ってからの収入減少に耐えきれなかった。老後資金をすべてローン返済と維持費に吸い尽くされ、高齢期での自宅競売という過酷な結末を迎えた。',
          statisticComparison:
            '完済年齢を75〜85歳に設定したローンの最大のリスクは、60歳以降の収入減と医療・修繕費の増加による「老後住宅ローン破綻」である。',
        },
        score: Math.max(160, state.yearIndex * 40),
      };
    }

    return {
      ending: {
        id: 'foreclosure-bankruptcy',
        rank: 'BANKRUPT',
        title: '【住宅ローン破産】期限の利益喪失・競売＆自己破産',
        subtitle: `${state.age}歳（返済${state.yearIndex}年目）で資金ショート・代位弁済`,
        epilogue:
          '度重なる金利上昇、修繕積立金・生活コストの重圧、そして手元キャッシュの枯渇により6ヶ月間の延滞が発生。保証会社による代位弁済が行われ、マイホームは競売にかけられた。売却代金でも残債を消しきれず、苦渋の自己破産手続きへと進んだ。',
        statisticComparison:
          '日本の住宅ローン利用者のうち、条件変更（リスケ）や任意売却・代位弁済に至るケースは景気変動期に年間数万件規模で発生する。',
      },
      score: Math.max(100, state.yearIndex * 35),
    };
  }

  // === 3. 自宅売却・住み替え精算系（6パターンに分岐） ===
  if (reason === 'sold') {
    if (state.liquidSavingsMan >= 3000) {
      return {
        ending: {
          id: 'wealthy-fire-early-exit',
          rank: 'S',
          title: '【資産形成大成功・売却FIRE】含み益確定＆金融資産3,000万円超で完全自由へ！',
          subtitle: `${state.age}歳でマイホームを高値売却・最終手元キャッシュ ${state.liquidSavingsMan.toLocaleString()}万円`,
          epilogue:
            '資産価値の高い立地選びと堅実な元金返済が結実！マイホームを絶好のタイミングで売却し、ローン残債を一括完済した上で3,000万円を超える莫大な純キャッシュを獲得。住む場所も働き方も自由に選べる最高のセカンドライフへ旅立った！',
          statisticComparison:
            '不動産の含み益と住宅ローン控除をフル活用し、売却益で一気に金融資産を築く「不動産キャピタルゲイン完勝」の上位5%モデル。',
        },
        score: 3650 + Math.round(state.liquidSavingsMan * 0.35) + state.mentalScore * 11,
      };
    }

    if (state.age >= 60 && state.liquidSavingsMan >= 1200) {
      return {
        ending: {
          id: 'senior-happy-downsize-exit',
          rank: 'A',
          title: '【老後の賢い住み替え・悠々自適売却】維持費と管理から解放され安心のシニアライフへ',
          subtitle: `${state.age}歳で自宅を売却精算・手元老後資金 ${state.liquidSavingsMan.toLocaleString()}万円を確保`,
          epilogue:
            '子育てや現役生活を終えたタイミングで、広すぎる自宅や重くなる修繕費・固定資産税を手放す「老後のダウンサイジング売却」を決断。残債を完済してまとまった老後キャッシュを手元に残し、身軽で安心なシニアライフへ移行した。',
          statisticComparison:
            '60代以降にマイホームを売却してコンパクトな住まいや高齢者向け住宅へ移る「資産整理型住み替え」は老後資金防衛の有力な選択肢となっている。',
        },
        score: 2650 + Math.round(state.liquidSavingsMan * 0.35) + state.mentalScore * 10,
      };
    }

    if (state.liquidSavingsMan >= 1500) {
      return {
        ending: {
          id: 'strategic-exit-winner',
          rank: 'A',
          title: '【戦略的売却・住み替え勝者】含み益を確定して悠々自適へ',
          subtitle: `${state.age}歳でマイホームを高値売却・手元純資産 ${state.liquidSavingsMan.toLocaleString()}万円`,
          epilogue:
            '不動産市況と残債のバランスを見極め、アンダーローン（自宅時価＞ローン残債）の状態で鮮やかに売却！住宅ローンから完全に解放され、まとまった手元キャッシュを携えて身軽な新生活へと移行した。',
          statisticComparison:
            '都心・駅近マンションや優良立地物件を購入した世帯の上位約19%が実践する「ヤドカリ戦略（住み替え資産形成）」の成功例。',
        },
        score: 2600 + Math.round(state.liquidSavingsMan * 0.4) + state.mentalScore * 10,
      };
    }

    if (state.liquidSavingsMan >= 500) {
      return {
        ending: {
          id: 'family-lifestyle-pivot-sale',
          rank: 'B',
          title: '【ライフスタイル転換売却】ローンを綺麗サッパリ精算し、新たな暮らしへ再出発',
          subtitle: `${state.age}歳で自宅を売却・手元資金 ${state.liquidSavingsMan.toLocaleString()}万円を持って新生活へ`,
          epilogue:
            '働き方や家族のライフステージの変化に合わせ、マイホームに固執せず売却してローンをゼロにする道を選択。手元に500万円以上の生活防衛資金を残して綺麗に精算し、肩の荷を下ろして新しい暮らしをスタートさせた。',
          statisticComparison:
            '「家は一生に一度の買い物」という固定観念にとらわれず、収支が悪化する前に売却・住み替えを行うことで家計の健全性を維持できる。',
        },
        score: 1950 + Math.round(state.liquidSavingsMan * 0.35) + state.mentalScore * 9,
      };
    }

    if (state.liquidSavingsMan >= 100) {
      return {
        ending: {
          id: 'narrow-escape-sale',
          rank: 'C',
          title: '【任意売却・ソフトランディング】競売寸前でマイホームを手放し生還',
          subtitle: `${state.age}歳で自宅を売却精算・手元資金 ${state.liquidSavingsMan.toLocaleString()}万円で再出発`,
          epilogue:
            'このまま返済を続ければ破産するという瀬戸際で、プライドを捨てて自宅の売却を決断。自己資金の持ち出しで残債を完済し、賃貸住宅へ移り住むことで最悪の自己破産を回避した。',
          statisticComparison:
            '競売（市場価格の6〜7割で強制処分）になる前に任意売却・住み替えを決断できた世帯は、その後の生活再建率が大幅に高い。',
        },
        score: 1550 + Math.round(state.liquidSavingsMan * 0.3) + state.mentalScore * 8,
      };
    }

    return {
      ending: {
        id: 'bare-zero-scratch-escape',
        rank: 'D',
        title: '【薄氷のゼロ精算脱出】貯蓄のすべてを差し出して残債を消し去った背水の売却',
        subtitle: `${state.age}歳で自宅売却＆貯蓄全額投入により残債精算（最終手元資金 ${state.liquidSavingsMan.toLocaleString()}万円）`,
        epilogue:
          'オーバーローン状態の自宅を売却するため、長年貯めた手元キャッシュをほぼすべて補填に充てて辛うじて抵当権を抹消。貯蓄はほぼゼロになったものの、借金ゼロの状態で人生をやり直す権利を守り抜いた。',
        statisticComparison:
          '頭金なしのオーバーローン購入では、売却時に自己資金数百万円の持ち出しが必要になるケースが多く、手元流動性の重要性を物語る。',
      },
      score: 1200 + Math.max(0, Math.round(state.liquidSavingsMan * 0.2)) + state.mentalScore * 6,
    };
  }

  // === 4. 完済到達系（paid-off：15種類の多彩なライフストーリー結末パターン！） ===

  // (4-1) 団信発動による奇跡の完済
  if (state.danshinTriggered) {
    return {
      ending: {
        id: 'danshin-miracle-payoff',
        rank: netEquity >= 5500 ? 'S' : 'A',
        title: '【団信発動・残債ゼロの奇跡】手厚い保障が家族と資産を守り抜いた',
        subtitle: `団信により残債免除完済・最終純資産 ${netEquity.toLocaleString()}万円（手元資金 ${state.liquidSavingsMan.toLocaleString()}万円）`,
        epilogue:
          '人生の途中で大病に見舞われたものの、契約時に選んでいた団体信用生命保険（団信）が発動し、数千万円のローン残債が一瞬でゼロに！住居費負担が消滅したことで治療と家族の生活に専念でき、豊かな老後資産を築き上げた。',
        statisticComparison:
          '住宅ローン返済期間（35〜50年）の間にがんや3大疾病に罹患する確率は40代後半以降で急上昇し、特約団信が家計の命綱となるケースは多い。',
      },
      score: 3150 + Math.round(netEquity * 0.25) + state.mentalScore * 10,
    };
  }

  // (4-2) 40代での超速・早期繰上完済王
  if (state.age <= 49 && state.totalPrepaymentMan >= 800 && state.liquidSavingsMan >= 1000) {
    return {
      ending: {
        id: 'early-40s-speed-prepay-king',
        rank: 'S',
        title: '【驚異の40代・超速繰上完済王】利息を最小限に封じ込め、人生後半を完全無借金で謳歌！',
        subtitle: `${state.age}歳でスピード完済・累計繰上返済 ${Math.round(state.totalPrepaymentMan).toLocaleString()}万円 / 最終純資産 ${netEquity.toLocaleString()}万円`,
        epilogue:
          '周囲がまだ何十年もローンを抱えるなか、圧倒的な貯蓄規律と機動的な一部繰上返済を積み重ねて40代のうちに完全完済を達成！日銀の利上げリスクを完全に過去のものとし、50代以降の収入をすべて資産形成と人生の楽しみに使える最強状態へ突入した！',
        statisticComparison:
          '住宅ローン控除期間終了後に集中的な期間短縮型繰上返済を行い、40代で完済に到達するのは全借入世帯の上位約4.2%の超優良家計。',
      },
      score: 4000 + Math.round(netEquity * 0.3) + state.mentalScore * 12,
    };
  }

  // (4-3) 独身購入から結婚・住み替えや家族誕生を経て完済
  if (
    state.triggeredEventIds.includes('single-marriage-crossroad') &&
    careerEdu.hasSpouse &&
    !state.isDivorced &&
    state.liquidSavingsMan >= 1200
  ) {
    return {
      ending: {
        id: 'single-to-married-dream-home',
        rank: netEquity >= 6000 ? 'S' : 'A',
        title:
          relocations > 0
            ? '【独身購入から結婚＆住み替え完済】1人で始めた資産形成が、最高の家族の城へ結実！'
            : '【独身購入から結婚・家族の城へ完済】おひとり様で買った家が、かけがえのない家族の宝物に！',
        subtitle: `${state.age}歳で完済達成・最終純資産 ${netEquity.toLocaleString()}万円（手元資金 ${state.liquidSavingsMan.toLocaleString()}万円）`,
        epilogue:
          relocations > 0
            ? '独身時代に決断したマイホーム購入がすべての始まりだった。その後パートナーとの結婚を機に最初の家を売却して広い新居へステップアップ住み替えを果たし、2馬力で協力しながらついに完全完済！独身時代の先見の明が家族全員の幸せを作った。'
            : '独身時代に一人で契約したマイホームに、人生の途中で出会ったパートナーを迎え入れ、力を合わせて完済まで走り抜いた！1人分の資産形成として始まった家が、温かい家庭の終の棲家となった感動物語。',
        statisticComparison:
          '20〜30代の独身期に購入したマンション・住宅を「結婚後の共働き拠点」または「住み替えの種銭（含み益）」として活用する世帯は資産形成速度が非常に速い。',
      },
      score: 3450 + Math.round(netEquity * 0.28) + state.mentalScore * 11,
    };
  }

  // (4-4) 住み替え（ヤドカリ・ステップアップ／コンパクト住み替え）を活用して完済
  if (relocations >= 1 && state.liquidSavingsMan >= 1300) {
    return {
      ending: {
        id: 'relocation-stepup-master',
        rank: netEquity >= 6200 ? 'S' : 'A',
        title: '【住み替えわらしべ長者・完全完済】ライフステージに合わせた買い替えで理想の住まいと資産を両立！',
        subtitle: `${state.age}歳で完済（住み替え${relocations}回実践）・最終純資産 ${netEquity.toLocaleString()}万円`,
        epilogue:
          '「一度買った家に無理して縛られ続けない」という柔軟な発想で、家族構成や年齢の変化に合わせて住み替え（買い替え）を実践！最初の家で築いた純資産を活かして新居のローンも完全に返しきり、今の自分たちに最もフィットする無借金の我が家を手に入れた！',
        statisticComparison:
          '欧米だけでなく日本でも、子育て期と老後期で住まいを買い替える「ライフステージ別住み替え（ヤドカリ戦略）」は住居満足度と資産効率を高める王道戦略。',
      },
      score: 3400 + Math.round(netEquity * 0.28) + state.mentalScore * 11,
    };
  }

  // (4-5) 60歳定年後は一切働かない（完全リタイア）を貫いて完済＆老後資金確保
  if (
    (careerEdu.postRetirementWork === 'full-retire-60' ||
      state.currentJobLabel?.includes('定年後働かない')) &&
    state.liquidSavingsMan >= 1600
  ) {
    return {
      ending: {
        id: 'retired-60-no-work-paradise',
        rank: 'S',
        title: '【定年後は働かない！完全リタイア＆余裕の完済】60歳で仕事から完全卒業し悠々自適の黄金老後！',
        subtitle: `${state.age}歳で完済・定年後は勤労ゼロで手元資金 ${state.liquidSavingsMan.toLocaleString()}万円＆無借金マイホーム確保`,
        epilogue:
          '「定年後はもう一切働かない！」という夢を実現するため、現役時代のうちに計画的な貯蓄と残債圧縮を完遂。60歳でスパッと仕事から引退し、再雇用やアルバイトに追われることなく、趣味と旅行を楽しみながら住宅ローンも完全完済した憧れのゴール！',
        statisticComparison:
          '60歳定年後に再雇用やアルバイトをせず「完全リタイア」しながら住宅ローンを完済し老後資金1,600万円以上を残せるのは極めて計画性の高い上位世帯のみ。',
      },
      score: 3850 + Math.round(netEquity * 0.28) + state.mentalScore * 12,
    };
  }

  // (4-6) 都心タワマン・資産価値覇者
  if (property.buildingType === 'tower' && netEquity >= 7200 && state.liquidSavingsMan >= 2000) {
    return {
      ending: {
        id: 'tower-mansion-sky-winner',
        rank: 'S',
        title: '【都心タワマン・資産価値覇者】高騰する維持費を制し、圧倒的含み益の空中要塞を完全完済！',
        subtitle: `${state.age}歳でタワマン完済・自宅時価 ${state.propertyValueMan.toLocaleString()}万円 / 最終純資産 ${netEquity.toLocaleString()}万円`,
        epilogue:
          '段階的に跳ね上がるタワマンの修繕積立金や大規模修繕の荒波を、高い世帯収入と管理組合改革で乗りこなした！ローンがゼロになった今、手元には2,000万円超の金融資産と、いつでも高値で売却・賃貸化できる都心タワーマンションが丸ごと残った。',
        statisticComparison:
          'タワーマンションは維持費・修繕費負担が重い一方、都心一等地の立地価値が維持されれば完済時の純資産規模で圧倒的なリターンを生む。',
      },
      score: 3900 + Math.round(netEquity * 0.3) + state.mentalScore * 12,
    };
  }

  // (4-7) 一戸建て・大地主マイスター完済
  if (
    property.buildingType === 'detached' &&
    state.liquidSavingsMan >= 1800 &&
    state.buildingValueMan >= 850 &&
    netEquity >= 5500
  ) {
    return {
      ending: {
        id: 'detached-craftsman-castle-owner',
        rank: 'S',
        title: '【一戸建て・優良資産マイスター完済】定期修繕と省エネ化で我が家を守り抜いた城主！',
        subtitle: `${state.age}歳で一戸建て完済・土地＋建物時価 ${state.propertyValueMan.toLocaleString()}万円 / 手元資金 ${state.liquidSavingsMan.toLocaleString()}万円`,
        epilogue:
          '「一戸建てはメンテナンス次第で寿命が決まる」という鉄則通り、外壁塗装・屋根改修・防蟻・太陽光断熱を適切なタイミングで実施！管理費0円の強みを活かして1,800万円超の老後キャッシュを蓄え、築年数を重ねても快適で資産価値の高い理想の邸宅を無借金化した！',
        statisticComparison:
          '適切な周期で外装・水回り・断熱改修を行った一戸建ては、老後の住居費（管理費・駐車場代ゼロ）の安さにおいて最強の終の棲家となる。',
      },
      score: 3700 + Math.round(netEquity * 0.28) + state.mentalScore * 12,
    };
  }

  // (4-8) 伝説の住宅ローン勝者（純資産7,500万超＋金融資産3,000万超）
  if (netEquity >= 7500 && state.liquidSavingsMan >= 3000) {
    return {
      ending: {
        id: 'legendary-asset-master',
        rank: 'S',
        title: '【伝説の住宅ローン勝者】完全完済＆純資産7,500万円超の黄金老後！',
        subtitle: `${state.age}歳で完済達成・最終純資産 ${netEquity.toLocaleString()}万円（金融資産 ${state.liquidSavingsMan.toLocaleString()}万円）`,
        epilogue:
          '金利変動、修繕費高騰、教育費ピークのすべてを完璧な資金計画と住宅ローン控除・資産価値維持で乗り切った！無借金のマイホームと潤沢な老後資金を両手に、ゆとりあるセカンドライフを迎えるハッピーエンド。',
        statisticComparison:
          '日本の住宅ローン完済世帯のうち、完済時点で金融資産3,000万円以上＋無借金マイホームを両立できるのは上位約8.5%の健全家計。',
      },
      score: 3800 + Math.round(netEquity * 0.3) + state.mentalScore * 12,
    };
  }

  // (4-9) 教育費＆マイホーム二刀流完覇（子ども2人以上を独立させ老後資金も確保）
  if (state.childrenAges.length >= 2 && state.liquidSavingsMan >= 1500) {
    return {
      ending: {
        id: 'education-all-clear-champion',
        rank: 'A',
        title: '【教育費＆マイホーム二刀流完覇】子どもたちを立派に巣立たせ、住宅ローンも完全完済！',
        subtitle: `${state.age}歳で完済（子ども${state.childrenAges.length}人独立）・最終手元資金 ${state.liquidSavingsMan.toLocaleString()}万円`,
        epilogue:
          '複数人の子どもの進学塾・高校・大学費用という人生最大の山場を乗り越え、全員を社会人として送り出した上で住宅ローンも完済！さらに夫婦の老後資金もしっかり1,500万円以上残すという、親としてこれ以上ない大勝利を収めた！',
        statisticComparison:
          '子ども2人以上の教育費（1人あたり1,500万〜2,800万円）と住宅ローン完済・老後資金2,000万円問題の「人生3大資金」をすべてクリアした模範世帯。',
      },
      score: 3250 + Math.round(netEquity * 0.26) + state.mentalScore * 11,
    };
  }

  // (4-10) おひとり様貴族・終の棲家完済（独身を貫いて完済）
  if (!careerEdu.hasSpouse && state.childrenAges.length === 0 && state.liquidSavingsMan >= 1200) {
    return {
      ending: {
        id: 'solo-aristocrat-fortress',
        rank: netEquity >= 5500 ? 'S' : 'A',
        title: '【おひとり様貴族・終の棲家完済】誰にも縛られない無借金の城と潤沢な老後資金を確立！',
        subtitle: `${state.age}歳で単独完済・最終純資産 ${netEquity.toLocaleString()}万円（手元資金 ${state.liquidSavingsMan.toLocaleString()}万円）`,
        epilogue:
          '1馬力の責任を背負いながらも、自分のペースでキャリアと資産運用を積み上げ、ついに完全無借金のマイホームを手に入れた！老後の家賃不安はゼロ、手元には十分な金融資産があり、趣味も旅も自由自在のおひとり様黄金ライフが幕を開ける。',
        statisticComparison:
          '単身世帯にとって「高齢期の賃貸入居審査リスク」と「家賃負担」をゼロにする持ち家完済は、老後の安心感を劇的に高める資産防衛策となる。',
      },
      score: 3100 + Math.round(netEquity * 0.26) + state.mentalScore * 11,
    };
  }

  // (4-11) 家族の思い出＆幸福度MAX完済（旅行やレジャーも妥協せず幸福度85以上）
  if (state.mentalScore >= 85 && state.liquidSavingsMan >= 1000) {
    return {
      ending: {
        id: 'happiness-first-memories-payoff',
        rank: 'A',
        title: '【家族の思い出＆幸福度MAX完済】旅行も暮らしも全力で楽しみながら辿り着いた最高のゴール！',
        subtitle: `${state.age}歳で完済・家族幸福度 ${state.mentalScore}/100・手元資金 ${state.liquidSavingsMan.toLocaleString()}万円`,
        epilogue:
          '「返済のために今の幸せを犠牲にしすぎない」をモットーに、毎年の家族旅行や住まいの快適アップデートも楽しみながら見事に完済！お金だけでなく、リビングに飾られた数え切れないほどの家族写真と思い出こそが最大の財産となった。',
        statisticComparison:
          '過度な節約で家族関係や健康を損なう「返済ノイローゼ」に陥ることなく、QOL（生活の質）と完済を高次元で両立させた理想的なライフプラン。',
      },
      score: 3050 + Math.round(netEquity * 0.25) + state.mentalScore * 14,
    };
  }

  // (4-12) 堅実マイホーム完済（標準ハッピーエンド）
  if (state.liquidSavingsMan >= 1400 && state.age <= 73) {
    return {
      ending: {
        id: 'steady-happy-payoff',
        rank: 'A',
        title: '【堅実マイホーム完済】嵐を乗り越え、安心の我が家と老後資金を確保',
        subtitle: `${state.age}歳で完済・最終純資産 ${netEquity.toLocaleString()}万円（手元資金 ${state.liquidSavingsMan.toLocaleString()}万円）`,
        epilogue:
          '日銀の利上げや物価高、教育費や修繕の波に揺られながらも、堅実な繰上返済と家計防衛でついに「抵当権抹消登記」の日を迎えた。ここからは家賃もローンもいらない自分の城で、穏やかなセカンドライフが始まる。',
        statisticComparison:
          '日本の住宅ローン利用者の理想モデル。定年前後に完済し老後資金1,400万円以上を残せた世帯は老後破産リスクが極めて低い。',
      },
      score: 2800 + Math.round(netEquity * 0.25) + state.mentalScore * 10,
    };
  }

  // (4-13) 定年後働かない・貯蓄取り崩し完済（働かない選択を貫き、貯蓄を使って完済）
  if (
    (careerEdu.postRetirementWork === 'full-retire-60' ||
      careerEdu.postRetirementWork === 'retire-65-pension-only') &&
    state.liquidSavingsMan < 1400
  ) {
    return {
      ending: {
        id: 'no-work-retirement-tight-payoff',
        rank: 'B',
        title: '【定年後働かない・貯蓄取り崩し完済】労働からは完全解放されたが、老後資金は倹約モード',
        subtitle: `${state.age}歳で完済（定年後就労なし）・手元老後資金 ${state.liquidSavingsMan.toLocaleString()}万円`,
        epilogue:
          '定年後は働かない選択を貫き、自由な時間を手に入れた一方で、年金と貯蓄の取り崩しで住宅ローンを返済したため手元キャッシュは大きく減少した。それでもローンは完済したため、これからは年金の範囲内で穏やかに暮らしていける。',
        statisticComparison:
          '定年後に勤労収入なしで住宅ローン返済を続ける場合、60〜65歳の無収入期間と年金生活期の貯蓄取り崩しスピードの管理が鍵となる。',
      },
      score: 2200 + Math.round(netEquity * 0.22) + state.mentalScore * 9,
    };
  }

  // (4-14) 75歳〜80代の超長期ローン執念完済
  if (state.age >= 75 || state.config.termYears >= 45) {
    return {
      ending: {
        id: 'ultra-long-80s-survivor',
        rank: 'C',
        title: '【75〜80代・超長期ローンの執念完済】年金とシニア就労で繋ぎ、ついに辿り着いた抵当権抹消',
        subtitle: `${state.age}歳で完済・手元老後資金 ${state.liquidSavingsMan.toLocaleString()}万円`,
        epilogue:
          '年金生活に入ってからも毎月続いた住宅ローン引き落とし。退職金や老後資金を注ぎ込み、シニア期も粘り強く家計をやりくりしながら、ついに70代後半〜80代で完済を果たした。家は守ったが、老後の現預金はギリギリの戦いに。',
        statisticComparison:
          '近年急増している40〜50年ローンや30代後半以降の35年ローンでは、65歳定年後の10〜20年間をどう生き抜くかが最大の課題となる。',
      },
      score: 1850 + Math.round(netEquity * 0.2) + state.mentalScore * 8,
    };
  }

  // (4-15) ギリギリ完済・ハウスプア生還
  return {
    ending: {
      id: 'barely-paid-off-house-poor',
      rank: state.liquidSavingsMan >= 500 ? 'B' : 'C',
      title: '【ギリギリ完済・ハウスプア生還】預貯金は削られたが、最後まで我が家を死守！',
      subtitle: `${state.age}歳で完済・手元資金 ${state.liquidSavingsMan.toLocaleString()}万円 / 自宅時価 ${state.propertyValueMan.toLocaleString()}万円`,
      epilogue:
        '長年にわたる利息と維持費・物価高の支払いで手元の預貯金は大きく削られたものの、延滞破産することなく最後までローンを返しきった。必要であれば今後リバースモーゲージやコンパクト住み替えで老後資金を補える状態だ。',
      statisticComparison:
        '日本のマイホーム世帯でよく見られる「資産は家だけ（ハウスプア）」状態だが、無借金の住居があることは老後の大きなセーフティネットとなる。',
    },
    score: 2100 + Math.round(netEquity * 0.2) + state.mentalScore * 8,
  };
}

/**
 * 1年進行エンジン（年代記・マクロ経済・償却・ライフイベント処理）
 */
export function advanceOneYear(
  currentState: MortgageGameState,
  rng: () => number = Math.random,
): MortgageGameState {
  if (currentState.status !== 'playing' || currentState.pendingDecision) {
    return currentState;
  }

  let state: MortgageGameState = {
    ...currentState,
    yearIndex: currentState.yearIndex + 1,
    calendarYear: currentState.calendarYear + 1,
    age: currentState.age + 1,
    termRemainingYears: Math.max(0, currentState.termRemainingYears - 1),
    childrenAges: currentState.childrenAges.map((a) => a + 1),
    history: [...currentState.history],
    chronicle: [...currentState.chronicle],
    triggeredEventIds: [...currentState.triggeredEventIds],
  };

  const property = resolveEffectiveProperty(state.config);
  const bank = resolveEffectiveBank(state.config);
  const danshin = resolveEffectiveDanshin(state.config);
  const family = FAMILY_PLANS[state.config.familyPlan];
  const y = state.yearIndex;
  const age = state.age;
  let seqId = (state.chronicle[0]?.id ?? 1) + 1;

  const pushEntry = (
    category: ChronicleEntry['category'],
    tone: ChronicleEntry['tone'],
    title: string,
    body: string,
    statNote?: string,
    financialDeltaLabel?: string,
  ) => {
    state.chronicle.unshift({
      id: seqId++,
      yearIndex: y,
      calendarYear: state.calendarYear,
      age,
      category,
      tone,
      title,
      body,
      statNote,
      financialDeltaLabel,
    });
  };

  // === 1. マクロ経済・日銀政策金利・途中利上げ・インフレ率の動的更新 ===
  let inflationRate = 0.015;
  let wageGrowthRate = 0.012;
  let bojDelta = 0;

  if (state.config.macroRegime === 'gradual-hike') {
    inflationRate = 0.018;
    wageGrowthRate = 0.016;
    if (y === 2 || y === 5 || y === 8 || y === 12 || y === 17 || y === 23) {
      bojDelta = 0.35;
    } else if (y === 15) {
      bojDelta = -0.15;
    } else if (y === 28) {
      bojDelta = 0.25;
    }
  } else if (state.config.macroRegime === 'stagflation-shock') {
    inflationRate = 0.032;
    wageGrowthRate = 0.006;
    if (y === 2 || y === 4 || y === 7 || y === 11 || y === 15 || y === 20) {
      bojDelta = 0.55;
    }
  } else if (state.config.macroRegime === 'asset-bubble') {
    inflationRate = 0.025;
    wageGrowthRate = 0.028;
    if (y === 3 || y === 6 || y === 10 || y === 15 || y === 21) {
      bojDelta = 0.4;
    }
  } else if (state.config.macroRegime === 'deflation-return') {
    inflationRate = -0.003;
    wageGrowthRate = -0.004;
    if (y === 3) {
      bojDelta = -0.15;
    } else if (y === 8 || y === 14 || y === 21) {
      // 低金利局面からの途中インフレ・利上げ転換波
      bojDelta = 0.3;
      inflationRate = 0.016;
      wageGrowthRate = 0.01;
    }
  } else {
    // dynamic-random (変動世界情勢)
    const macroRoll = rng();
    if (macroRoll < 0.26 || y === 3 || y === 8) {
      bojDelta = 0.4;
      inflationRate = 0.028;
      wageGrowthRate = 0.012;
    } else if (macroRoll < 0.38) {
      bojDelta = -0.2;
      inflationRate = 0.004;
      wageGrowthRate = 0.005;
    } else {
      inflationRate = 0.016;
      wageGrowthRate = 0.015;
    }
  }

  state.bojPolicyRate = Math.max(0.0, Math.min(4.25, Math.round((state.bojPolicyRate + bojDelta) * 100) / 100));

  // 累積物価指数（食料品・光熱費・日用品・レジャー等の生活コスト上昇）と修繕・建築資材高騰倍率の年次更新
  const prevPriceIndex = state.cumulativePriceIndex ?? 100;
  state.cumulativePriceIndex = Math.max(
    92,
    Math.round(prevPriceIndex * (1 + inflationRate) * 10) / 10,
  );
  // 建築資材・設備・職人単価（2024年問題・人手不足）は一般物価よりもやや高い伸び率で上昇する現実を反映
  const repairInfRate = Math.max(0.01, inflationRate * 1.18 + 0.004);
  state.repairCostInflationMult = Math.min(
    2.35,
    Math.round((state.repairCostInflationMult ?? 1.0) * (1 + repairInfRate) * 100) / 100,
  );

  if (
    (prevPriceIndex < 115 && state.cumulativePriceIndex >= 115) ||
    (prevPriceIndex < 130 && state.cumulativePriceIndex >= 130)
  ) {
    const upPct = Math.round(state.cumulativePriceIndex - 100);
    pushEntry(
      'macro',
      'bad',
      `【物価上昇・生活コスト＆修繕単価の高騰】購入時(100)から累積物価が +${upPct}%（指数${state.cumulativePriceIndex.toFixed(1)}）に到達！`,
      `長引くインフレにより、食料品・電気ガス代・日用品・教育費・宿泊レジャー代が購入時より約${upPct}%底上げされた。さらに建築資材と職人単価の高騰（×${state.repairCostInflationMult.toFixed(2)}倍）が修繕コストを押し上げている！`,
      '名目ローン残高はインフレで目減りする一方、日々の生活費・光熱費・修繕費のキャッシュアウトは着実に膨張する。',
      `物価指数 ${state.cumulativePriceIndex.toFixed(1)}`,
    );
  }

  // 金利タイプに応じた適用金利の更新（初期政策金利0.75%を基準として短期プライムレート連動）
  const prevAppliedRate = state.appliedInterestRate;
  if (state.currentRateType === 'variable') {
    const targetVarRate = Math.max(
      0.45,
      Math.round((bank.baseRate + danshin.spreadRate + (state.bojPolicyRate - 0.75) * 0.95) * 1000) / 1000,
    );
    state.appliedInterestRate = targetVarRate;
  } else if (state.currentRateType === 'mix') {
    const fixedRatioPct = Math.max(10, Math.min(90, Math.round(state.config.mixFixedRatioPercent ?? 50)));
    const varShare = (100 - fixedRatioPct) / 100;
    const targetMixRate = Math.max(
      0.75,
      Math.round((bank.baseRate + danshin.spreadRate + (state.bojPolicyRate - 0.75) * 0.96 * varShare) * 1000) /
        1000,
    );
    state.appliedInterestRate = targetMixRate;
  } else if (state.currentRateType === 'fixed-10' && y === 11) {
    // 10年固定終了後の金利再設定ショック
    const post10Rate = Math.round((2.15 + danshin.spreadRate + Math.max(0, state.bojPolicyRate - 0.75) * 0.8) * 100) / 100;
    state.appliedInterestRate = post10Rate;
    pushEntry(
      'rate-revision',
      'bad',
      `【10年固定特約期間終了】11年目より適用金利が ${prevAppliedRate.toFixed(2)}% → ${post10Rate.toFixed(2)}% へ改定`,
      '当初10年間の固定金利優遇期間が満了し、基準金利からの引下げ幅が縮小。今月から新金利での返済が始まる。',
      '当初10年固定プラン利用者が11年目に直面する「段階金利ステップアップ」現象。',
      `金利 ${post10Rate.toFixed(2)}%`,
    );
  } else if (state.currentRateType === 'flat-35' && y === 6) {
    // フラット35Sの当初5年▲0.45%優遇終了
    const normalFlatRate = Math.round((bank.baseRate + danshin.spreadRate) * 100) / 100;
    if (state.appliedInterestRate < normalFlatRate) {
      state.appliedInterestRate = normalFlatRate;
      pushEntry(
        'rate-revision',
        'neutral',
        `【フラット35S 当初優遇期間満了】6年目より本則固定金利 ${normalFlatRate.toFixed(2)}% へ移行`,
        '長期優良・子育てプラスによる当初5年間の金利引き下げ期間が終了。今後は完済まで完全に一定の固定金利となる。',
        undefined,
        `固定 ${normalFlatRate.toFixed(2)}%`,
      );
    }
  }

  if (bojDelta >= 0.25 && state.currentRateType !== 'flat-35') {
    pushEntry(
      'macro',
      'bad',
      `【日銀の途中利上げ決定】政策金利 ${state.bojPolicyRate.toFixed(2)}% へ上昇（適用金利 ${prevAppliedRate.toFixed(2)}% → ${state.appliedInterestRate.toFixed(2)}%）`,
      state.has5Year125Rule
        ? '短期プライムレートが引き上げられた。5年ルールにより毎月の引き落とし額はすぐには変わらないが、返済額に占める「利息の割合」が急増し、元金の減りが鈍化する！'
        : '5年ルールがない変動契約または元金均等返済のため、翌月から毎月の返済引き落とし額が即座に増額改定された！',
      '変動金利を選択した世帯が返済途中に直面する金融政策決定会合の利上げ局面。',
      `適用金利 ${state.appliedInterestRate.toFixed(2)}%`,
    );
  }

  // === 2. 年収・給与カーブ・配偶者就労（パート/バイト転換）・役職定年・定年後（再雇用/別職種/バイト/リタイア）の更新 ===
  const careerEdu = resolveEffectiveHouseholdCareerAndEdu(state.config);
  const prevMainIncome = state.mainIncomeMan;

  if (age < 55) {
    if (careerEdu.salaryCurve === 'steady-up') {
      const growth = age < 48 ? Math.max(0.016, wageGrowthRate + 0.01) : 0.012;
      state.mainIncomeMan = Math.round(state.mainIncomeMan * (1 + growth));
    } else if (careerEdu.salaryCurve === 'standard-plateau') {
      const growth = age < 46 ? Math.max(0.008, wageGrowthRate) : 0.001;
      state.mainIncomeMan = Math.round(state.mainIncomeMan * (1 + growth));
    } else if (careerEdu.salaryCurve === 'flat-stagnant') {
      // 昇給なし・横ばい型：インフレでも基本給はほぼ据え置き
      const microDrift = (rng() - 0.5) * 0.006;
      state.mainIncomeMan = Math.max(260, Math.round(state.mainIncomeMan * (1 + microDrift)));
    } else if (careerEdu.salaryCurve === 'performance-volatile') {
      // 成果主義・業績変動型：上がる年もあれば下がる年もある
      const perfRoll = rng();
      const perfDelta =
        perfRoll < 0.32
          ? 0.045 + rng() * 0.035 // 好調年 +4.5〜+8.0%
          : perfRoll < 0.68
            ? 0.005
            : -(0.035 + rng() * 0.035); // 不調年 ▲3.5〜▲7.0%
      state.mainIncomeMan = Math.max(250, Math.round(state.mainIncomeMan * (1 + perfDelta)));
      if (state.mainIncomeMan - prevMainIncome >= 35 && y % 4 === 1) {
        pushEntry(
          'life',
          'good',
          `【好業績・インセンティブ昇給】成果評価により本人年収が ${prevMainIncome}万 → ${state.mainIncomeMan}万円に上昇！`,
          '実力主義の給与テーブルで高い成果を出し、年俸・業績賞与が大きく跳ね上がった。',
          undefined,
          `年収 +${state.mainIncomeMan - prevMainIncome}万`,
        );
      } else if (prevMainIncome - state.mainIncomeMan >= 30 && y % 4 === 2) {
        pushEntry(
          'life',
          'bad',
          `【業績連動・年俸ダウン】市場環境と評価見直しにより本人年収が ${prevMainIncome}万 → ${state.mainIncomeMan}万円に減少`,
          '成果主義・業績変動型の厳しさが直撃。住宅ローンの毎月返済額は変わらないまま手取り収入が減少した。',
          undefined,
          `年収 -${prevMainIncome - state.mainIncomeMan}万`,
        );
      }
    } else {
      // downward-pressure (業績低迷・減収リスク型)
      const cutRate = rng() < 0.55 ? -(0.02 + rng() * 0.02) : -0.012;
      state.mainIncomeMan = Math.max(240, Math.round(state.mainIncomeMan * (1 + cutRate)));
      if (prevMainIncome - state.mainIncomeMan >= 20 && y % 5 === 0) {
        pushEntry(
          'life',
          'bad',
          `【業績低迷・手当カット】勤務先の収益悪化で本人年収が ${prevMainIncome}万 → ${state.mainIncomeMan}万円へ低下`,
          '昇給が見込めないばかりか賞与や諸手当が削減され、住宅ローン返済比率がじわじわ上昇している。',
          undefined,
          `年収 -${prevMainIncome - state.mainIncomeMan}万`,
        );
      }
    }
  } else if (age === 55) {
    // 55歳・役職定年（上場企業・中小企業の「順調昇進型以外」のみ発生。公務員・フリーランス・順調昇進型には一律発生させない）
    if (
      (state.config.employment === 'listed-corp' || state.config.employment === 'sme') &&
      careerEdu.salaryCurve !== 'steady-up'
    ) {
      const ratio = careerEdu.salaryCurve === 'downward-pressure' ? 0.75 : 0.8;
      state.mainIncomeMan = Math.max(250, Math.round(state.mainIncomeMan * ratio));
      state.currentJobLabel = `${EMPLOYMENT_LABELS[state.config.employment]}（55歳役職定年・専任職）`;
      pushEntry(
        'life',
        'bad',
        `【55歳・役職定年】ライン管理職を離れ、本人年収が ${state.mainIncomeMan}万円（▲${Math.round((1 - ratio) * 100)}%）に減少`,
        '日本企業特有の「55歳役職定年」が到来。子どもの進学費用や住宅ローン返済が続く中での手取り減少が家計を圧迫し始める。',
        '50代後半の住宅ローン破綻原因の上位が「役職定年・定年再雇用による収入崖」。',
        `本人年収 -${Math.round((1 - ratio) * 100)}%`,
      );
    } else if (careerEdu.salaryCurve === 'steady-up' && state.config.employment !== 'freelance') {
      state.mainIncomeMan = Math.round(state.mainIncomeMan * 1.02);
      state.currentJobLabel = `${EMPLOYMENT_LABELS[state.config.employment]}（上級管理職・専門幹部継続）`;
      pushEntry(
        'life',
        'good',
        `【55歳・役職定年を回避！】幹部・高度専門職ポストを維持し年収 ${state.mainIncomeMan}万円を確保`,
        '55歳役職定年の対象外となる上位ポストを維持し、50代後半も高い収入基盤を守り抜いた。',
      );
    }
  } else if (age > 55 && age < 60) {
    if (careerEdu.salaryCurve === 'downward-pressure') {
      state.mainIncomeMan = Math.max(240, Math.round(state.mainIncomeMan * 0.985));
    }
  } else if (age === 60) {
    // 60歳定年：退職金の有無（職種・設定により0円〜2,800万円）＋ 定年後の働き方（再雇用 / 別職種 / アルバイト / 完全リタイア）
    const retirementAllowanceMan = careerEdu.retirementAllowanceMan;
    const spouseRetirementMan =
      careerEdu.hasSpouse &&
      !state.isDivorced &&
      careerEdu.spouseWorkPattern === 'fulltime-keep' &&
      state.subIncomeMan >= 200
        ? 450
        : 0;
    const totalRetireLumpMan = retirementAllowanceMan + spouseRetirementMan;
    state.liquidSavingsMan += totalRetireLumpMan;

    if (
      careerEdu.postRetirementWork === 'reemploy-same' ||
      careerEdu.postRetirementWork === 'retire-65-pension-only'
    ) {
      state.mainIncomeMan = Math.max(210, Math.round(state.mainIncomeMan * 0.62));
      state.currentJobLabel =
        careerEdu.postRetirementWork === 'retire-65-pension-only'
          ? '60〜64歳・嘱託再雇用（65歳以降は完全引退予定）'
          : '60代・嘱託再雇用（現職継続）';
    } else if (careerEdu.postRetirementWork === 'reemploy-light-job') {
      state.mainIncomeMan = 250;
      state.currentJobLabel = '60代・別職種転身（ビル管理・施設事務）';
    } else if (careerEdu.postRetirementWork === 'part-time-arubaito') {
      state.mainIncomeMan = 140;
      state.currentJobLabel = '60代・週3〜4日アルバイト/パート勤務';
    } else {
      // full-retire-60
      state.mainIncomeMan = 0;
      state.currentJobLabel = '60歳完全リタイア（定年後働かない・無職）';
    }

    if (totalRetireLumpMan > 0) {
      pushEntry(
        'milestone',
        'mixed',
        `【60歳・定年とセカンドキャリア】退職金 +${totalRetireLumpMan.toLocaleString()}万円受領 / 今後は「${state.currentJobLabel}（年収${state.mainIncomeMan}万）」へ`,
        `60歳の節目を迎え、退職金 ${totalRetireLumpMan.toLocaleString()}万円（本人${retirementAllowanceMan}万${spouseRetirementMan > 0 ? `＋配偶者${spouseRetirementMan}万` : ''}）が振り込まれた！今後の働き方は「${POST_RETIREMENT_SPECS[careerEdu.postRetirementWork].shortLabel}」へ移行。`,
        '退職金の有無と60代以降の就労形態が、老後の住宅ローン完済余力を大きく左右する。',
        `退職金 +${totalRetireLumpMan}万`,
      );
    } else {
      pushEntry(
        'milestone',
        'bad',
        `【60歳到来・退職金制度なし（0円）】退職金ゼロで60代へ突入 / 今後は「${state.currentJobLabel}（年収${state.mainIncomeMan}万）」`,
        `60歳を迎えたが、現在の職種・企業には退職金一時金制度がない（0円）。手元貯蓄と「${POST_RETIREMENT_SPECS[careerEdu.postRetirementWork].shortLabel}」の収入で残債（${Math.round(state.remainingBalanceMan).toLocaleString()}万円）に立ち向かう必要がある！`,
        '退職金制度がない企業や外資・ベンチャー・フリーランス世帯では、60歳前の繰上返済または貯蓄形成が不可欠となる。',
        '退職金 0円',
      );
    }
  } else if (age === 65) {
    // 65歳：公的年金受給開始（定年後働かない設定の場合はシルバーアルバイトも一切せず完全リタイア・年金のみ）
    const basePensionMan =
      state.config.employment === 'freelance'
        ? 150
        : state.config.employment === 'civil-servant' || state.config.employment === 'listed-corp'
          ? 250
          : 220;
    const doSilverArubaito =
      state.remainingBalanceMan > 300 &&
      careerEdu.postRetirementWork !== 'full-retire-60' &&
      careerEdu.postRetirementWork !== 'retire-65-pension-only';
    state.mainIncomeMan = basePensionMan + (doSilverArubaito ? 72 : 0);
    state.currentJobLabel = doSilverArubaito
      ? '公的年金受給 ＋ シルバー短時間アルバイト'
      : '公的年金受給のみ（定年後働かない・完全リタイア）';

    if (careerEdu.hasSpouse && !state.isDivorced) {
      state.subIncomeMan =
        careerEdu.spouseWorkPattern === 'fulltime-keep' ? 145 : 90;
      state.currentSpouseJobLabel = '公的年金受給';
    } else {
      state.subIncomeMan = 0;
    }

    pushEntry(
      'milestone',
      'mixed',
      `【65歳・公的年金受給スタート】世帯収入 年${state.mainIncomeMan + state.subIncomeMan}万円（${state.currentJobLabel}）`,
      state.remainingBalanceMan > 0
        ? `65歳を迎え年金受給が始まったが、まだ住宅ローン残債が ${Math.round(state.remainingBalanceMan).toLocaleString()}万円残っている！${doSilverArubaito ? '週3日のシルバーアルバイト収入（年72万円）を足しにして返済を続ける。' : '貯蓄を取り崩しながらの老後返済が続く。'}`
        : 'すでに住宅ローンを完済しているため、年金収入の範囲内で穏やかな老後生活を送ることができる！',
    );
  } else if (age === 72 && state.currentJobLabel?.includes('アルバイト')) {
    // 72歳でシルバーアルバイトも卒業し完全年金生活へ
    state.mainIncomeMan = Math.max(150, state.mainIncomeMan - 72);
    state.currentJobLabel = '公的年金受給生活（完全引退）';
  }

  // 配偶者（奥さん・パートナー）の働き方の年次更新（65歳未満：途中の選択肢イベントまたは毎年の働き方変更で選択された状態を維持）
  if (age < 65) {
    if (!careerEdu.hasSpouse || state.isDivorced) {
      state.subIncomeMan = 0;
      state.currentSpouseJobLabel = state.isDivorced ? '離別（単身世帯）' : '単身世帯（配偶者なし）';
    } else if (state.subIncomeMan === 0) {
      state.currentSpouseJobLabel = '専業主婦（夫）';
    } else if (state.subIncomeMan <= 165) {
      // パート・アルバイト勤務中
      if (age === 60) {
        state.subIncomeMan = Math.min(state.subIncomeMan, 96);
        state.currentSpouseJobLabel = 'シニアパート・アルバイト勤務';
      } else if (y % 4 === 0 && state.subIncomeMan > 0 && state.subIncomeMan < 155) {
        state.subIncomeMan += 4; // 最低賃金・時給改定による微増
      }
    } else {
      // 正社員・フルタイム勤務中
      if (age < 55) {
        state.subIncomeMan = Math.round(state.subIncomeMan * (1 + Math.max(0, wageGrowthRate * 0.8)));
      } else if (age === 60) {
        state.subIncomeMan = Math.round(state.subIncomeMan * 0.62);
        state.currentSpouseJobLabel = '配偶者：嘱託再雇用・パート';
      }
    }
  }

  // === 3. マンション修繕積立金の段階増額（建築資材・職人単価の高騰を反映） / 固定資産税 / 火災保険・地震保険5年更新 ===
  if (property.buildingType !== 'detached' && (y === 6 || y === 12 || y === 18 || y === 25)) {
    const baseHikeMan = property.buildingType === 'tower' ? 1.4 : 0.85;
    const repairInfScale = Math.max(1.0, Math.min(1.48, (state.repairCostInflationMult ?? 1.0) * 0.92));
    const hikeMan = Math.round(baseHikeMan * repairInfScale * 10) / 10;
    state.currentMgmtAndRepairMonthlyMan =
      Math.round((state.currentMgmtAndRepairMonthlyMan + hikeMan) * 10) / 10;
    pushEntry(
      'property',
      'bad',
      `【管理組合総会・修繕積立金値上げ（資材高騰×${(state.repairCostInflationMult ?? 1.0).toFixed(2)}倍）】月額維持費が +${hikeMan}万円/月（計 ${state.currentMgmtAndRepairMonthlyMan}万円/月）に増額`,
      property.buildingType === 'tower'
        ? `タワーマンションの段階増額計画に加え、建築資材・足場・職人単価の高騰（購入時比×${(state.repairCostInflationMult ?? 1.0).toFixed(2)}倍）により修繕積立金が大幅改定！ローン返済とは別に毎月出ていく固定費が重くのしかかる。`
        : `長期修繕計画の見直しと建築資材・工事人件費の高騰（購入時比×${(state.repairCostInflationMult ?? 1.0).toFixed(2)}倍）を受け、マンションの修繕積立金が引き上げられた。`,
      '分譲マンションの約85%が「段階増額積立方式」を採用しており、さらに近年の建築資材インフレで計画以上の値上げとなるケースが急増している。',
      `維持費 +${Math.round(hikeMan * 12)}万/年`,
    );
  }

  // 火災保険・地震保険の5年ごと契約更新（2022年以降の最長5年契約ルール・気候変動による料率上昇を反映）
  let insuranceRenewalCostThisYearMan = 0;
  if (y > 0 && y % 5 === 0) {
    const insSpec = INSURANCE_PLAN_SPECS[careerEdu.insurancePlan];
    const base5YrCost =
      property.buildingType === 'detached'
        ? insSpec.fiveYearCostDetachedMan
        : property.buildingType === 'tower'
          ? insSpec.fiveYearCostTowerMan
          : insSpec.fiveYearCostMansionMan;
    const climateRateFactor = Math.min(1.42, 1 + Math.floor(y / 5) * 0.06);
    insuranceRenewalCostThisYearMan = Math.round(base5YrCost * climateRateFactor);
    pushEntry(
      'property',
      insuranceRenewalCostThisYearMan >= 40 ? 'bad' : 'neutral',
      `【火災保険・地震保険の5年更新】「${insSpec.shortLabel}」の5年一括更新料 -${insuranceRenewalCostThisYearMan}万円を納付`,
      `5年周期の火災保険・地震保険の契約更新時期が到来（自然災害激甚化に伴う損保料率改定を反映）。マイホームの災害リスクに備えるため5年分の更新保険料 ${insuranceRenewalCostThisYearMan}万円を支払った。`,
      '2022年10月の制度改定により火災保険の最長契約期間は10年から「5年（地震保険も最長5年）」へ短縮され、5年ごとにまとまった更新費用が発生する。',
      `保険5年更新 -${insuranceRenewalCostThisYearMan}万`,
    );
  }

  // === 4. ローン償却計算（元利均等・元金均等・5年ルール・125%ルール・未払利息の厳密計算） ===
  let annualLoanPaymentMan = 0;
  let annualPrincipalPaidMan = 0;
  let annualInterestPaidMan = 0;

  if (state.remainingBalanceMan > 0 && !state.danshinTriggered) {
    const remYears = Math.max(1, state.termRemainingYears + 1);
    const annualInterestRequired = state.remainingBalanceMan * (state.appliedInterestRate / 100);

    if (state.rescheduleYearsLeft > 0) {
      // リスケ（条件変更・元金据置期間中）：利息のみ支払い
      state.rescheduleYearsLeft -= 1;
      annualInterestPaidMan = annualInterestRequired;
      annualPrincipalPaidMan = 0;
      annualLoanPaymentMan = annualInterestPaidMan;
    } else if (state.config.repaymentMethod === 'equal-principal') {
      // 元金均等返済：元金は毎年確実に減る
      annualPrincipalPaidMan = Math.min(state.remainingBalanceMan, state.remainingBalanceMan / remYears);
      annualInterestPaidMan = annualInterestRequired;
      annualLoanPaymentMan = annualPrincipalPaidMan + annualInterestPaidMan;
    } else {
      // 元利均等返済
      const theoreticalMonthly = calcEqualPaymentMonthlyMan(
        state.remainingBalanceMan,
        state.appliedInterestRate,
        remYears,
      );

      if (state.currentRateType === 'variable' && state.has5Year125Rule) {
        state.yearsSinceLast5YearRevision += 1;
        if (state.yearsSinceLast5YearRevision >= 5) {
          // 5年ごとの返済額見直し（125%ルール上限適用）
          const max125Monthly = state.last5YearRulePaymentMan * 1.25;
          const nextMonthly = Math.min(theoreticalMonthly, max125Monthly);
          if (nextMonthly > state.last5YearRulePaymentMan * 1.04) {
            pushEntry(
              'rate-revision',
              'bad',
              `【5年ルール改定＆125%ルール発動】毎月返済額が ${state.last5YearRulePaymentMan.toFixed(1)}万 → ${nextMonthly.toFixed(1)}万円/月 へ引き上げ！`,
              '5年間据え置かれていた毎月返済額の見直し時期が到来。これまでの金利上昇分が反映され、毎月の引き落とし額が一気に増加した！',
              '5年ルールは「5年間支払額が変わらない」だけで、利息が減免されるわけではない。',
            );
          }
          state.last5YearRulePaymentMan = nextMonthly;
          state.yearsSinceLast5YearRevision = 0;
        }
        annualLoanPaymentMan = state.last5YearRulePaymentMan * 12;
      } else {
        annualLoanPaymentMan = theoreticalMonthly * 12;
        state.last5YearRulePaymentMan = theoreticalMonthly;
      }

      // 未払利息チェック（年間返済額よりも年間発生利息の方が大きい場合！）
      if (annualInterestRequired > annualLoanPaymentMan) {
        const unpaidThisYear = annualInterestRequired - annualLoanPaymentMan;
        state.unpaidInterestMan = Math.round((state.unpaidInterestMan + unpaidThisYear) * 10) / 10;
        annualInterestPaidMan = annualLoanPaymentMan;
        annualPrincipalPaidMan = 0;
        pushEntry(
          'crisis',
          'bad',
          `【恐怖の未払利息発生！】1年間毎月返済したのに元金が1円も減らず、未払利息 +${unpaidThisYear.toFixed(1)}万円が蓄積！`,
          '5年ルール・125%ルールで毎月返済額が抑えられている裏で、急騰した金利の利息額が毎月返済額を突破！払いきれなかった利息が「未払利息」として水面下で積み上がっている！',
          '高金利局面×5年ルール下で発生する、変動金利最大のホラー現象「未払利息」。',
          `未払利息 +${unpaidThisYear.toFixed(1)}万`,
        );
      } else {
        annualInterestPaidMan = annualInterestRequired;
        let surplusForPrincipal = annualLoanPaymentMan - annualInterestPaidMan;
        // もし未払利息がある場合は、元金より先に未払利息の解消に充当される銀行規定
        if (state.unpaidInterestMan > 0) {
          const clearUnpaid = Math.min(state.unpaidInterestMan, surplusForPrincipal);
          state.unpaidInterestMan = Math.round((state.unpaidInterestMan - clearUnpaid) * 10) / 10;
          surplusForPrincipal -= clearUnpaid;
        }
        annualPrincipalPaidMan = Math.min(state.remainingBalanceMan, surplusForPrincipal);
        annualLoanPaymentMan = annualPrincipalPaidMan + annualInterestPaidMan;
      }
    }

    state.remainingBalanceMan = Math.max(
      0,
      Math.round((state.remainingBalanceMan - annualPrincipalPaidMan) * 10) / 10,
    );

    // 最終年（満期年）に未払利息や端数残債が残っている場合は一括精算請求！
    if (state.termRemainingYears === 0 && (state.remainingBalanceMan > 0 || state.unpaidInterestMan > 0)) {
      const balloonSettlement = state.remainingBalanceMan + state.unpaidInterestMan;
      annualLoanPaymentMan += balloonSettlement;
      annualPrincipalPaidMan += state.remainingBalanceMan;
      state.remainingBalanceMan = 0;
      state.unpaidInterestMan = 0;
      pushEntry(
        'crisis',
        'bad',
        `【最終回・残債＆未払利息の一括精算請求】満期到来につき残り ${Math.round(balloonSettlement)}万円が一括引き落とし！`,
        '5年ルール・125%ルール等で先送りされていた元金と未払利息は、ローン満期日に「一括返済」が求められる規定となっている。',
      );
    }
  }

  // === 5. 物件時価評価額（土地価格トレンド＋建物減価償却）の更新 ===
  const macroLandBonus =
    state.config.macroRegime === 'asset-bubble'
      ? 0.015
      : state.config.macroRegime === 'deflation-return'
        ? -0.012
        : 0;
  state.landValueMan = Math.max(
    400,
    Math.round(state.landValueMan * (1 + property.landAnnualTrendRate + macroLandBonus)),
  );
  // 建物は築年数に応じて減価（戸建ては減価が早く、都心タワマン・長期優良は緩やか）
  const buildingDepreciationRate =
    property.buildingType === 'detached'
      ? 0.042
      : property.buildingType === 'tower'
        ? 0.022
        : 0.028;
  state.buildingValueMan = Math.max(
    150,
    Math.round(state.buildingValueMan * (1 - buildingDepreciationRate + inflationRate * 0.35)),
  );
  state.propertyValueMan = state.landValueMan + state.buildingValueMan;

  // === 6. 年間家計キャッシュフロー（手取り収入＋住宅ローン控除 − ローン返済 − 維持費 − 生活費・教育費） ===
  const grossHouseholdIncomeMan = state.mainIncomeMan + state.subIncomeMan;
  const netHouseholdIncomeMan =
    estimateNetIncomeMan(state.mainIncomeMan) + estimateNetIncomeMan(state.subIncomeMan);

  // 固定資産税・都市計画税（新築の当初3年/5年/7年軽減措置終了の崖＋3年ごとの評価替え・経年減価を精密反映）
  const initialLandMan = Math.round(property.priceMan * property.landRatio);
  const propTaxCalc = calcEffectiveAnnualPropertyTaxMan(
    property,
    y,
    state.landValueMan,
    initialLandMan,
  );
  state.annualPropertyTaxCurrentMan = propTaxCalc.annualTaxMan;
  if (propTaxCalc.isReductionJustExpired) {
    const reductionYears =
      property.energyCert === 'long-term-excellent'
        ? property.buildingType === 'detached'
          ? 5
          : 7
        : property.buildingType === 'detached'
          ? 3
          : 5;
    pushEntry(
      'property',
      'bad',
      `【固定資産税・新築軽減措置（${reductionYears}年間）終了！】家屋分の固定資産税が本来の額に戻り年額 ${propTaxCalc.annualTaxMan}万円へ増加！`,
      `新築購入から${reductionYears}年間適用されていた「新築住宅の固定資産税（建物部分）1/2減額措置」が今年で満了！今年から毎年の固定資産税・都市計画税が年間 ${propTaxCalc.annualTaxMan}万円へ上昇した。`,
      '新築一戸建ては3年目（長期優良5年目）、新築マンションは5年目（長期優良7年目）の翌年から家屋分の固定資産税が2倍（本来の税額）に戻る「固定資産税の崖」。',
      `固定資産税 年${propTaxCalc.annualTaxMan}万`,
    );
  }

  const priceMult = Math.max(0.92, (state.cumulativePriceIndex ?? 100) / 100);
  const utilityInflationMult = property.utilityMonthlyDiffMan > 0 ? Math.pow(priceMult, 0.75) : 1.0;

  const annualRunningCostMan =
    Math.round(
      (state.currentMgmtAndRepairMonthlyMan * 12 +
        propTaxCalc.annualTaxMan +
        insuranceRenewalCostThisYearMan +
        property.utilityMonthlyDiffMan * 12 * utilityInflationMult) *
        10,
    ) / 10;

  // 学資保険の満期金受取（子どもが18歳になった年に1人あたり+200万円入金）
  const kidsTurning18Count = state.childrenAges.filter((a) => a === 18).length;
  if (careerEdu.hasGakushiHoken && kidsTurning18Count > 0) {
    const gakushiMaturityMan = kidsTurning18Count * 200;
    state.liquidSavingsMan += gakushiMaturityMan;
    pushEntry(
      'life',
      'good',
      `【学資保険・満期保険金受領！】18歳進学時に満期金 +${gakushiMaturityMan.toLocaleString()}万円が入金！`,
      `0歳から毎年コツコツ積み立ててきた学資保険が満期を迎え、大学・専門学校等の進学資金として +${gakushiMaturityMan.toLocaleString()}万円が口座に振り込まれた！`,
      undefined,
      `学資満期 +${gakushiMaturityMan}万`,
    );
  }

  // 子どもの就職・社会人独立マイルストーン（高卒就職18歳 / 専門学校20歳 / 大学22歳）＆家族構成変化
  const independenceAge = getChildIndependenceAge(state.config);
  const dynamicFamily = calcDynamicFamilyComposition(state);
  const dependentChildrenCount = dynamicFamily.cohabitingChildrenAges.length;
  const kidsGraduatingCount = state.childrenAges.filter((a) => a === independenceAge).length;
  if (kidsGraduatingCount > 0) {
    const gradPathLabel =
      careerEdu.higherEdPath === 'high-school-job'
        ? '高校卒業・就職'
        : careerEdu.higherEdPath === 'vocational-2yr'
          ? '専門学校卒業・就職'
          : '大学卒業・就職';
    const isAllIndependentNow = dependentChildrenCount === 0;
    pushEntry(
      'milestone',
      'good',
      isAllIndependentNow
        ? `【祝・子ども全員が${gradPathLabel}＆独立！家族構成が「${dynamicFamily.compositionLabel}」へ】`
        : `【祝・子どもの${gradPathLabel}＆社会人独立！】（${independenceAge}歳）同居家族が${dynamicFamily.totalHouseholdMembers}人へ変化！`,
      isAllIndependentNow
        ? `子ども全員が社会人として巣立ち、今年から家族構成が「${dynamicFamily.compositionLabel}」へ移行！教育費だけでなく食費・水道光熱費・通信費などの生活費も大きくスリム化され、完済と老後資金形成のペースが一気に上がる！`
        : `子どもが無事に${gradPathLabel}を果たし社会人として独立！今年から1人分の学費・同居生活費負担がなくなり（現在の家族構成：${dynamicFamily.compositionLabel}）、家計の貯蓄余力が大きく改善する！`,
      undefined,
      '家族構成変化・支出減',
    );
  }

  // 教育費（中学受験・入塾/夏期講習/予備校・進路・学資保険料・奨学金軽減・物価連動をすべて反映）＋家族構成＆子ども年齢に応じた動的基礎生活費＋旅行・レジャー娯楽費
  const childrenEduCostMan = state.childrenAges.reduce(
    (sum, cAge) => sum + calcDetailedChildAnnualEduCostMan(cAge, state.config, state.cumulativePriceIndex ?? 100),
    0,
  );
  // 年とともに変わる家族構成（単身1人 / 夫婦2人 / 子ども年齢別加算 / 独立後の減少）と累積物価指数を反映した基礎生活費
  const baseLivingCostMan = dynamicFamily.annualBaseLivingCostMan;

  // 今年の重点方針（focusMode）による家計・メンタル・健康補正
  const focus = state.focusMode ?? 'balanced';
  let focusCashBonusMan = 0;
  let focusInvestBonusRate = 0.025;
  if (focus === 'frugal-prepay') {
    focusCashBonusMan = 35;
    state.mentalScore = Math.max(15, state.mentalScore - 1);
  } else if (focus === 'nisa-invest') {
    focusInvestBonusRate = state.config.macroRegime === 'deflation-return' ? -0.01 : 0.048;
  } else if (focus === 'career-sidejob') {
    focusCashBonusMan = 32;
    state.healthScore = Math.max(20, (state.healthScore ?? 85) - 1);
  } else if (focus === 'family-health') {
    focusCashBonusMan = -20;
    state.mentalScore = Math.min(100, state.mentalScore + 3);
    state.healthScore = Math.min(100, (state.healthScore ?? 85) + 2);
  } else {
    state.healthScore = Math.max(25, (state.healthScore ?? 85) - (age >= 50 ? 1 : 0));
  }

  // 所得水準・手元キャッシュ余裕度に応じたリアルな生活水準上昇（ライフスタイルクリープ・交際費・被服・外食・所得制限による負担増）
  // 手元にキャッシュがたくさんある世帯（800万円超）や高所得世帯ほど、日常の生活水準・買い物グレード・交際費・親族支援が自然に膨張する現実を反映
  const incomeLifestyleExtraMan =
    netHouseholdIncomeMan > 880
      ? Math.round((netHouseholdIncomeMan - 880) * (focus === 'frugal-prepay' ? 0.16 : 0.28))
      : 0;
  const cashComfortCreepMan =
    state.liquidSavingsMan > 800
      ? Math.min(
          160,
          Math.round((state.liquidSavingsMan - 800) * (focus === 'frugal-prepay' ? 0.02 : 0.042)),
        )
      : 0;

  // 9年周期の大型耐久消費財・家電一斉寿命・マイカー/給湯空調設備の更新費用
  let durableReplacementCostMan = 0;
  if (y > 0 && y % 9 === 0) {
    durableReplacementCostMan = Math.round(
      (property.buildingType === 'detached' ? 54 : 38) * Math.pow(priceMult, 0.7),
    );
    pushEntry(
      'life',
      'bad',
      `【大型家電・空調・耐久財の一斉更新期（${y}年目）】エアコン・冷蔵庫・洗濯機・生活設備の買い替え（-${durableReplacementCostMan}万円）`,
      `入居から${y}年が経過し、毎日酷使してきた複数台のルームエアコン・大型冷蔵庫・ドラム式洗濯乾燥機・給湯/生活機器が寿命を迎え、物価上昇後の価格で一斉買い替え（-${durableReplacementCostMan}万円）が必要となった。`,
      '耐久消費財（白物家電・空調・車両等）は8〜10年周期でまとまった更新費用が発生し、長期家計の見落とされがちなキャッシュアウトとなる。',
      `耐久財更新 -${durableReplacementCostMan}万`,
    );
  }

  // 家族旅行・レジャー・外食・娯楽費（スタイル選択＋物価連動＋資金余裕度補正）
  const leisureSpec = LEISURE_STYLE_SPECS[careerEdu.leisureStyle];
  const baseLeisureMan =
    (careerEdu.hasSpouse && !state.isDivorced
      ? leisureSpec.baseAnnualCostCoupleMan
      : leisureSpec.baseAnnualCostSingleMan) +
    dependentChildrenCount * leisureSpec.perChildExtraMan;
  const leisureAffordabilityMult =
    state.liquidSavingsMan < 220
      ? 0.55
      : state.liquidSavingsMan >= 1500 && careerEdu.leisureStyle !== 'frugal-staycation'
        ? 1.25
        : age >= 65
          ? 0.8
          : 1.0;
  const annualTravelLeisureCostMan = Math.round(
    baseLeisureMan * Math.pow(priceMult, 0.78) * leisureAffordabilityMult,
  );
  state.mentalScore = Math.max(
    10,
    Math.min(100, state.mentalScore + leisureSpec.annualMentalDelta),
  );

  const annualLivingAndEduCostMan =
    baseLivingCostMan +
    incomeLifestyleExtraMan +
    cashComfortCreepMan +
    durableReplacementCostMan +
    childrenEduCostMan +
    annualTravelLeisureCostMan;

  // 住宅ローン控除（年0.7%・合計所得2,000万円超の年は対象外）
  const taxInfo =
    state.mainIncomeMan > 2000
      ? { creditMan: 0, maxYears: property.isNew ? 13 : 10, borrowingCapMan: 0 }
      : calcAnnualTaxDeductionMan(
          state.remainingBalanceMan,
          y,
          property,
          state.config.contractType,
          family.childrenCount > 0 || state.childrenAges.length > 0,
          state.mainIncomeMan,
          state.subIncomeMan,
        );
  const annualTaxCreditMan = taxInfo.creditMan;

  if (y === taxInfo.maxYears + 1 && taxInfo.maxYears > 0) {
    pushEntry(
      'life',
      'bad',
      `【住宅ローン控除（${taxInfo.maxYears}年間）終了クリフ】今年から毎年最大35万円規模の還付金がゼロに！`,
      `入居から${taxInfo.maxYears}年間家計を助けてくれた住宅ローン減税期間が満了。今年から実質的な手取りキャッシュフローがその分減少する。`,
      '11年目・14年目に突然家計が苦しくなる「控除終了の崖」。',
    );
  }

  const annualCashFlowMan =
    Math.round(
      (netHouseholdIncomeMan +
        annualTaxCreditMan +
        focusCashBonusMan -
        annualLoanPaymentMan -
        annualRunningCostMan -
        annualLivingAndEduCostMan) *
        10,
    ) / 10;

  // 手元金融資産の運用利回り（生活防衛預金450万円を除いた投資枠のみ＋新NISA生涯非課税枠1,800万円上限＋特定口座20.315%課税＋株式市場の下落相場リスクをリアルに反映）
  let investmentReturnMan = 0;
  if (state.liquidSavingsMan > 450) {
    const investableSurplusMan = state.liquidSavingsMan - 450;
    const riskAssetRatio = focus === 'nisa-invest' ? 0.68 : focus === 'frugal-prepay' ? 0.35 : 0.42;
    const investedPrincipalMan = investableSurplusMan * riskAssetRatio;
    const bankDepositMan = investableSurplusMan - investedPrincipalMan;
    const depositInterestMan = bankDepositMan * 0.002;

    // 株式・投信市場の年次リターン（約23%の確率で世界株安・円高調整によるマイナス評価損が発生）
    const marketRoll = rng();
    let effectiveMarketRate = focusInvestBonusRate;
    if (marketRoll < 0.23) {
      effectiveMarketRate = focus === 'nisa-invest' ? -0.055 : -0.032;
    }

    const rawRiskReturnMan = investedPrincipalMan * effectiveMarketRate;
    // 新NISA非課税保有限度額（1,800万円）を超える運用益には20.315%の分離課税がかかる
    const nisaTaxFreeRatio = Math.min(1.0, 1800 / Math.max(1, investedPrincipalMan));
    const afterTaxRiskReturnMan =
      rawRiskReturnMan > 0
        ? rawRiskReturnMan * (nisaTaxFreeRatio + (1 - nisaTaxFreeRatio) * (1 - 0.20315))
        : rawRiskReturnMan;

    investmentReturnMan = Math.round((depositInterestMan + afterTaxRiskReturnMan) * 10) / 10;
  }

  state.liquidSavingsMan = Math.round((state.liquidSavingsMan + annualCashFlowMan + investmentReturnMan) * 10) / 10;
  state.totalPrincipalPaidMan = Math.round((state.totalPrincipalPaidMan + annualPrincipalPaidMan) * 10) / 10;
  state.totalInterestPaidMan = Math.round((state.totalInterestPaidMan + annualInterestPaidMan) * 10) / 10;
  state.totalRunningCostPaidMan = Math.round((state.totalRunningCostPaidMan + annualRunningCostMan) * 10) / 10;
  state.totalTaxCreditReceivedMan = Math.round((state.totalTaxCreditReceivedMan + annualTaxCreditMan) * 10) / 10;

  // 同じ日に鍵を受け取った4世帯（Companions）の年次進行更新
  if (state.companions) {
    state.companions = state.companions.map((comp) => {
      if (comp.status !== 'playing') {
        return { ...comp, age: comp.age + 1 };
      }
      const nextAge = comp.age + 1;
      const isVar = comp.id !== 'comp-detached';
      const rateSpikePenalty = isVar ? Math.max(0, (state.bojPolicyRate - 0.75) * 38) : 0;
      const principalStep =
        comp.id === 'comp-50yr' ? 58 : comp.id === 'comp-tower' ? 195 : comp.id === 'comp-detached' ? 140 : 110;
      const nextRem = Math.max(0, comp.remainingBalanceMan - principalStep);
      const baseSavingDelta =
        comp.id === 'comp-tower'
          ? 75 - rateSpikePenalty * 1.4 - (y >= 12 ? 36 : 0)
          : comp.id === 'comp-detached'
            ? 45 - (y === 13 ? 165 : 0)
            : comp.id === 'comp-50yr'
              ? 28 - rateSpikePenalty * 0.9 - (nextAge >= 60 ? 110 : 0)
              : 55 - rateSpikePenalty * 0.6;
      const nextSav = Math.round(comp.liquidSavingsMan + baseSavingDelta);
      const nextEq = Math.round(comp.netEquityMan + principalStep * 0.65 + baseSavingDelta);
      if (nextRem <= 0) {
        return {
          ...comp,
          age: nextAge,
          remainingBalanceMan: 0,
          liquidSavingsMan: Math.max(100, nextSav),
          netEquityMan: nextEq,
          status: 'paid-off',
          statusText: `${nextAge}歳で完済達成！`,
        };
      }
      if (nextSav < -180) {
        if (comp.id === 'comp-tower' && state.config.macroRegime !== 'deflation-return') {
          return {
            ...comp,
            age: nextAge,
            remainingBalanceMan: 0,
            liquidSavingsMan: 680,
            netEquityMan: 680,
            status: 'sold',
            statusText: `${nextAge}歳で自宅を売却し住み替え`,
          };
        }
        return {
          ...comp,
          age: nextAge,
          remainingBalanceMan: nextRem,
          liquidSavingsMan: nextSav,
          netEquityMan: nextEq,
          status: 'bankrupt',
          statusText: `${nextAge}歳で返済不能・任意売却`,
        };
      }
      const statusText =
        baseSavingDelta < -30
          ? '利上げ・維持費増で貯蓄取り崩し中'
          : nextRem < 1500
            ? '完済まであと少し！'
            : '順調に毎月返済を継続中';
      return {
        ...comp,
        age: nextAge,
        remainingBalanceMan: nextRem,
        liquidSavingsMan: nextSav,
        netEquityMan: nextEq,
        statusText,
      };
    });
  }

  const isOverLoan = state.remainingBalanceMan + state.unpaidInterestMan > state.propertyValueMan;
  const netEquityMan = Math.round(
    state.liquidSavingsMan + state.propertyValueMan - state.remainingBalanceMan - state.unpaidInterestMan,
  );

  // メンタルスコア調整
  if (annualCashFlowMan >= 80) {
    state.mentalScore = Math.min(100, state.mentalScore + 2);
  } else if (annualCashFlowMan < -100) {
    state.mentalScore = Math.max(10, state.mentalScore - 6);
  }

  const snapshot: YearlySnapshot = {
    yearIndex: y,
    calendarYear: state.calendarYear,
    age,
    bojPolicyRate: state.bojPolicyRate,
    appliedInterestRate: state.appliedInterestRate,
    inflationRate: Math.round(inflationRate * 1000) / 10,
    householdGrossIncomeMan: grossHouseholdIncomeMan,
    householdNetIncomeMan: netHouseholdIncomeMan,
    annualLoanPaymentMan: Math.round(annualLoanPaymentMan * 10) / 10,
    annualPrincipalPaidMan: Math.round(annualPrincipalPaidMan * 10) / 10,
    annualInterestPaidMan: Math.round(annualInterestPaidMan * 10) / 10,
    unpaidInterestMan: state.unpaidInterestMan,
    annualRunningCostMan,
    annualLivingAndEduCostMan,
    annualTaxCreditMan,
    annualCashFlowMan,
    remainingBalanceMan: state.remainingBalanceMan,
    propertyValueMan: state.propertyValueMan,
    landValueMan: state.landValueMan,
    buildingValueMan: state.buildingValueMan,
    liquidSavingsMan: state.liquidSavingsMan,
    netEquityMan,
    mentalScore: state.mentalScore,
    isOverLoan,
  };
  state.history.push(snapshot);

  // 年次ランダム生活・物件イベント（マンション／戸建て別の日常エピソード：完全に分離）
  const microRoll = rng();
  if (microRoll < 0.34) {
    if (property.buildingType !== 'detached' && rng() < 0.55) {
      const mansionMicros = [
        {
          tone: 'good' as const,
          title: `【マンション共用部改善】宅配ロッカー増設と防災備蓄倉庫の整備が完了`,
          body: '管理組合の積立金から共用ロッカーが増設され、共働き世帯の荷物受け取り利便性とマンションの評価が向上した。',
          delta: 0,
          valBonus: 25,
        },
        {
          tone: 'neutral' as const,
          title: `【マンション輪番理事】今年の管理組合・輪番理事当番を担当`,
          body: '月1回の理事会に出席し、清掃品質や長期修繕計画の進捗を確認。マンション管理の裏側を知る良い機会となった。',
          delta: 0,
          valBonus: 10,
        },
        {
          tone: 'bad' as const,
          title: `【専有部設備トラブル】ディスポーザー・浴室乾燥機の修理交換（-14万円）`,
          body: 'マンション専有部の設備は自己負担。経年劣化による交換費用として14万円を支出した。',
          delta: -14,
          valBonus: 0,
        },
        {
          tone: 'good' as const,
          title: `【マンション通信費見直し】全戸一括光インターネット導入で毎月の通信費が軽減（+8万円）`,
          body: '管理組合の総会決議により高速回線の一括契約へ移行し、世帯あたりの年間通信費が8万円浮いた。',
          delta: 8,
          valBonus: 15,
        },
        {
          tone: 'good' as const,
          title: `【共用部セキュリティ更新】エントランス顔認証・防犯カメラAI化が完了`,
          body: 'マンション全体の防犯性と資産価値が向上し、中古流通市場での評価額がプラスされた。',
          delta: 0,
          valBonus: 20,
        },
        {
          tone: 'neutral' as const,
          title: `【マンション高層階防災】エレベーター閉じ込め対策と非常用電源訓練を実施`,
          body: '住民参加の防災訓練で非常用トイレや備蓄水を確認。集合住宅ならではの共助体制を確認した。',
          delta: 0,
          valBonus: 10,
        },
        {
          tone: 'bad' as const,
          title: `【専有部給湯器メンテナンス】ベランダ設置型エコジョーズの基板・循環ポンプ交換（-12万円）`,
          body: '冬場の湯張り不良によりメーカー出張修理を実施。専有部設備の維持費として12万円を支払った。',
          delta: -12,
          valBonus: 0,
        },
        {
          tone: 'good' as const,
          title: `【管理規約改正】民泊無断転貸の禁止と駐輪場整理で住環境を保全`,
          body: '管理組合の機動的な規約改定により、ファミリー層が安心して暮らせるマンション環境が守られた。',
          delta: 0,
          valBonus: 18,
        },
      ];
      const pick = mansionMicros[Math.floor(rng() * mansionMicros.length)] ?? mansionMicros[0];
      state.liquidSavingsMan = Math.round((state.liquidSavingsMan + pick.delta) * 10) / 10;
      state.buildingValueMan += pick.valBonus;
      state.propertyValueMan = state.landValueMan + state.buildingValueMan;
      pushEntry(
        'property',
        pick.tone,
        pick.title,
        pick.body,
        undefined,
        pick.delta !== 0 ? `${pick.delta >= 0 ? '+' : ''}${pick.delta}万` : `資産価値+${pick.valBonus}万`,
      );
    } else if (property.buildingType === 'detached' && rng() < 0.55) {
      const detachedMicros = [
        {
          tone: 'good' as const,
          title: `【一戸建ての暮らし】庭のウッドデッキ手入れと家庭菜園・週末BBQで家族団らん`,
          body: '階下への足音を気にせず子どもたちが走り回れる一戸建ての良さを実感。休日の充実で家族の幸福度が上がった。',
          delta: 0,
          mental: 4,
          valBonus: 0,
        },
        {
          tone: 'neutral' as const,
          title: `【台風後の外装点検】火災保険の風災補償で雨樋・カーポート補修をカバー`,
          body: '秋の大型台風で雨樋の一部が歪んだが、契約していた火災保険の風災補償が適用され自己負担ゼロで修理完了。',
          delta: 0,
          mental: 2,
          valBonus: 0,
        },
        {
          tone: 'bad' as const,
          title: `【戸建て設備メンテ】給湯配管洗浄と庭木の剪定・防草シート施工（-16万円）`,
          body: '一戸建ては敷地内の維持管理もすべて自分次第。専門業者を入れて庭木の手入れと配管メンテナンスを実施した。',
          delta: -16,
          mental: 0,
          valBonus: 10,
        },
        {
          tone: 'good' as const,
          title: `【一戸建ての駐車場メリット】敷地内駐車場（無料）と自宅充電でカーライフ維持費を大幅節約（+15万円）`,
          body: '毎月2〜3万円かかる都市部駐車場代が0円の一戸建てメリットを満喫。浮いた資金をそのまま貯蓄へ回した。',
          delta: 15,
          mental: 3,
          valBonus: 0,
        },
        {
          tone: 'good' as const,
          title: `【戸建て床下・防蟻点検】5年周期の床下湿度点検と防蟻メンテナンスを実施（-9万円・建物価値+18万）`,
          body: '木造一戸建ての寿命を左右する床下環境を点検。異常なしで構造躯体の健全性が保たれた。',
          delta: -9,
          mental: 2,
          valBonus: 18,
        },
        {
          tone: 'good' as const,
          title: `【一戸建ての静音・独立性】上下階・隣室の騒音ストレスゼロでのびのび子育て＆在宅ワーク`,
          body: '子どもの足音や楽器練習も気兼ねなくできる独立住宅ならではの快適さで、家族のメンタルが安定した。',
          delta: 0,
          mental: 5,
          valBonus: 0,
        },
        {
          tone: 'bad' as const,
          title: `【戸建て外構・防犯強化】玄関センサーライト増設と外壁高圧洗浄メンテナンス（-8万円）`,
          body: '一戸建ては自主防犯が重要。人感センサーカメラと外構のコケ高圧洗浄を行い美観と安全性を高めた。',
          delta: -8,
          mental: 2,
          valBonus: 12,
        },
        {
          tone: 'neutral' as const,
          title: `【地域自治会・町内会】ご近所との清掃活動・防災ネットワーク作りに協力`,
          body: '一戸建てエリアならではのご近所付き合いを円滑にこなし、災害時の助け合い関係を築いた。',
          delta: 0,
          mental: 2,
          valBonus: 0,
        },
      ];
      const pick = detachedMicros[Math.floor(rng() * detachedMicros.length)] ?? detachedMicros[0];
      state.liquidSavingsMan = Math.round((state.liquidSavingsMan + pick.delta) * 10) / 10;
      state.mentalScore = Math.min(100, state.mentalScore + pick.mental);
      state.buildingValueMan += pick.valBonus;
      state.propertyValueMan = state.landValueMan + state.buildingValueMan;
      pushEntry(
        'property',
        pick.tone,
        pick.title,
        pick.body,
        undefined,
        pick.delta !== 0 ? `${pick.delta >= 0 ? '+' : ''}${pick.delta}万` : '幸福度アップ',
      );
    } else {
      const lifeMicros = [
        {
          tone: 'good' as const,
          title: `【家計プラス】ふるさと納税・医療費控除と省エネ家電買替補助金の活用（+12万円）`,
          body: '制度を賢く活用して税負担と光熱費を軽減。浮いた資金をそのまま貯蓄口座へ積み増した。',
          delta: 12,
          mental: 1,
        },
        {
          tone: 'bad' as const,
          title: `【臨時支出】リビング大型エアコンとドラム式洗濯機の同時寿命買替（-38万円）`,
          body: '10年近く使った家電が相次いで故障。最新省エネモデルへの買い替えで38万円の臨時出費が発生した。',
          delta: -38,
          mental: 0,
        },
        {
          tone: 'good' as const,
          title: `【キャリア評価】業務表彰・プロジェクト達成による特別賞与（+28万円）`,
          body: '本業での成果が評価され決算賞与が上乗せ支給された！住宅ローン返済世帯にとって心強い臨時収入。',
          delta: 28,
          mental: 3,
        },
        {
          tone: 'good' as const,
          title: `【新NISA運用プラス】積立投資枠のインデックスファンドが好調で資産評価益（+24万円）`,
          body: '住宅ローンを低利で返しつつ余剰資金で続けた長期積立投資が果実を生み、家計の純資産を押し上げた。',
          delta: 24,
          mental: 2,
        },
        {
          tone: 'bad' as const,
          title: `【冠婚葬祭・帰省】親族の慶弔イベントと家族帰省が重なる（-22万円）`,
          body: '人生の節目に伴う冠婚葬祭や遠方への帰省旅費で22万円の臨時支出が発生した。',
          delta: -22,
          mental: 1,
        },
        {
          tone: 'good' as const,
          title: `【固定費ダイエット】格安SIM移行・重複保険の解約で年間家計を改善（+15万円）`,
          body: '住宅ローン以外の固定費を徹底棚卸しし、生活満足度を下げずに年間15万円のキャッシュを捻出した。',
          delta: 15,
          mental: 2,
        },
        {
          tone: 'bad' as const,
          title: `【物価・食費高騰の波】生鮮食品と日用品・光熱費の値上がりで生活費増（-18万円）`,
          body: 'インフレによる食料品・エネルギー価格の上昇が家計に直撃し、年間18万円の追加負担となった。',
          delta: -18,
          mental: -1,
        },
        {
          tone: 'good' as const,
          title: `【スキルアップ副収入】本業知見を活かしたスポット案件・資格手当で臨時収入（+20万円）`,
          body: '無理のない範囲で取り組んだスキルアップが実を結び、年間20万円のプラス収入を確保した。',
          delta: 20,
          mental: 2,
        },
      ];
      const pick = lifeMicros[Math.floor(rng() * lifeMicros.length)] ?? lifeMicros[0];
      state.liquidSavingsMan = Math.round((state.liquidSavingsMan + pick.delta) * 10) / 10;
      state.mentalScore = Math.max(10, Math.min(100, state.mentalScore + pick.mental));
      pushEntry(
        'life',
        pick.tone,
        pick.title,
        pick.body,
        undefined,
        `${pick.delta >= 0 ? '+' : ''}${pick.delta}万`,
      );
    }
  }

  // 年次サマリーログ（重大イベントがない年も年代記として記録）
  if (y % 3 === 0 || annualCashFlowMan < -80) {
    pushEntry(
      'life',
      annualCashFlowMan >= 0 ? 'neutral' : 'bad',
      `【返済${y}年目・${age}歳】年間収支 ${annualCashFlowMan >= 0 ? '+' : ''}${annualCashFlowMan}万円 / 残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円`,
      `世帯手取り ${netHouseholdIncomeMan}万円に対し、ローン返済 ${annualLoanPaymentMan.toFixed(0)}万円・維持費税 ${annualRunningCostMan.toFixed(0)}万円・生活教育費 ${annualLivingAndEduCostMan}万円。自宅推定時価は ${state.propertyValueMan.toLocaleString()}万円（${isOverLoan ? 'オーバーローン状態' : 'アンダーローン含み益'}）。`,
      undefined,
      `手元資金 ${Math.round(state.liquidSavingsMan)}万`,
    );
  }

  // === 7. 完済チェック または 破産チェック ===
  if (state.liquidSavingsMan < -180) {
    // 手元資金が底を突き6ヶ月延滞→競売破産
    state.status = 'bankrupt';
    const res = evaluateEnding(state, 'bankrupt');
    state.ending = res.ending;
    state.score = res.score;
    return state;
  }

  if (state.remainingBalanceMan <= 0 && state.unpaidInterestMan <= 0) {
    state.status = 'cleared';
    const res = evaluateEnding(state, 'paid-off');
    state.ending = res.ending;
    state.score = res.score;
    pushEntry(
      'milestone',
      'good',
      `【祝・住宅ローン完全完済！】${age}歳（返済${y}年目）で抵当権抹消登記を達成！`,
      `ついにローン残債が0円に到達！これまで支払った元金 ${Math.round(state.totalPrincipalPaidMan).toLocaleString()}万円・利息総額 ${Math.round(state.totalInterestPaidMan).toLocaleString()}万円の長い航海が完結した。`,
      undefined,
      '残債 0万円！',
    );
    return state;
  }

  // === 8. 人生とローンの重大決断イベント発火判定（世帯・雇用・配偶者・子ども・物件条件に完全一致するものだけを発火） ===
  // (D4-1) 60歳定年退職時（退職金制度ありの世帯）：定年後の働き方・職種（嘱託再雇用 / 別職種 / アルバイト / 定年後働かない）と退職金の使い道をその時の選択肢で決める！
  if (
    age === 60 &&
    careerEdu.retirementAllowanceMan >= 400 &&
    !state.triggeredEventIds.includes('retirement-lump-sum-60')
  ) {
    state.triggeredEventIds.push('retirement-lump-sum-60');
    const payoffTarget = Math.min(
      Math.round(state.remainingBalanceMan),
      Math.max(0, Math.min(1400, Math.round(state.liquidSavingsMan - 350))),
    );
    const sameReemployIncome = Math.max(220, state.mainIncomeMan > 0 ? state.mainIncomeMan : 280);
    state.pendingDecision = {
      id: 'retirement-lump-sum-60',
      yearIndex: y,
      age,
      category: 'retirement',
      title: `【60歳定年・今後の働き方＆退職金（+${careerEdu.retirementAllowanceMan.toLocaleString()}万円）の選択】60代をどう生きるか？`,
      description: `60歳定年を迎え退職金 ${careerEdu.retirementAllowanceMan.toLocaleString()}万円を受け取った（残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円）。60歳以降の働き方・職種（現職で嘱託再雇用 / 別職種へ転身 / 週3〜4日アルバイト / 定年後は一切働かない）と退職金の使い道をここで選択できる！（※60歳以降も毎年「今年の働き方・いつまで働くか」を自由に変更可能）`,
      statisticalContext:
        '60歳定年時の「働き方・職種選択（再雇用・別職種・バイト・完全引退）」と「退職金で繰上返済するか手元資金として残すか」は老後キャッシュフロー最大の分岐点。',
      choices: [
        {
          id: 'retire-major-prepay',
          label:
            payoffTarget >= 200
              ? `【嘱託再雇用＋繰上返済】同じ職場で嘱託再雇用（年収${sameReemployIncome}万円）として働き、退職金から ${payoffTarget.toLocaleString()}万円を繰上返済する`
              : `【嘱託再雇用で現職継続】慣れた職場で嘱託再雇用（年収${sameReemployIncome}万円）として60代も働き続ける`,
          subLabel:
            payoffTarget >= 200
              ? `本人年収 ${sameReemployIncome}万円（嘱託再雇用） / 手元資金 -${payoffTarget}万 → 残債 -${payoffTarget}万円圧縮`
              : `本人年収 ${sameReemployIncome}万円（嘱託再雇用） / 安定収入で着実に返済継続`,
          outcomeSummary:
            payoffTarget >= 200
              ? `現職での嘱託再雇用を選びつつ、退職金から${payoffTarget.toLocaleString()}万円を繰上返済に充当！残債を大幅に減らし、安定収入で60代をスタートした。`
              : '慣れた職場での嘱託再雇用を選択し、60代も安定した勤労収入を確保した。',
          newPostRetirementWork:
            careerEdu.postRetirementWork === 'retire-65-pension-only'
              ? 'retire-65-pension-only'
              : 'reemploy-same',
          newMainIncomeAbsoluteMan: sameReemployIncome,
          newJobLabel: '60代・嘱託再雇用（現職継続）',
          cashDeltaMan: payoffTarget >= 200 ? -payoffTarget : 0,
          principalDeltaMan: payoffTarget >= 200 ? -payoffTarget : 0,
          mentalDelta: 8,
        },
        {
          id: 'retire-keep-cash-nisa',
          label: '【嘱託再雇用＋退職金温存】現職の再雇用で働きつつ、退職金は手元資金・配当運用として温存する',
          subLabel: '手元キャッシュ温存（流動性確保） / 60代も再雇用収入で毎月返済を継続',
          outcomeSummary:
            '「現金が手元にあればいつでも返せる」と判断し、退職金を老後キャッシュとして温存。再雇用収入と運用益を得ながら計画的に返済を続ける道を選んだ。',
          mentalDelta: 3,
        },
        {
          id: 'retire-light-job-shift',
          label: '【別職種へ転身】責任の軽い別職種（施設管理・事務・実務職：年収250万円）へ移り、退職金は温存する',
          subLabel: '本人年収 250万円（別職種フルタイム） / プレッシャーを減らして安定稼働',
          outcomeSummary:
            '定年を機にプレッシャーの少ない別職種（年収250万円）へ転身し、心身の余裕を保ちながら返済を続ける道を選んだ。',
          newPostRetirementWork: 'reemploy-light-job',
          newMainIncomeAbsoluteMan: 250,
          newJobLabel: '60代・別職種転身（ビル管理・施設事務）',
          mentalDelta: 6,
        },
        {
          id: 'retire-60-arubaito-work',
          label: '【週3〜4日アルバイト勤務】体力を最優先して短時間アルバイト（清掃・受付・軽作業等：年収140万円）で無理なく働く',
          subLabel: '本人年収 140万円（短時間アルバイト） / 自分のペースで健康と自由時間を両立・幸福度 +9',
          outcomeSummary:
            'フルタイムのストレスから離れ、週3〜4日の短時間アルバイト（年収140万円）を選択！健康とプライベートの時間を大切にしながら穏やかに働く60代をスタートした。',
          newPostRetirementWork: 'part-time-arubaito',
          newMainIncomeAbsoluteMan: 140,
          newJobLabel: '60代・週3〜4日アルバイト/パート勤務',
          mentalDelta: 9,
        },
        {
          id: 'retire-60-no-work-life',
          label: '【定年後は一切働かない！】60歳で完全リタイア（無職・勤労収入0円）し、退職金と貯蓄で悠々自適の生活へ入る',
          subLabel: '60歳以降は勤労収入 0円（完全引退） / 65歳の年金開始まで退職金と貯蓄を取り崩して暮らす',
          outcomeSummary:
            '「60歳まで懸命に働いたのだから、定年後はもう働かない！」と決断。再雇用やアルバイトを一切せず完全リタイアし、退職金と手元貯蓄で悠々自適のセカンドライフへ入った！',
          newPostRetirementWork: 'full-retire-60',
          newMainIncomeAbsoluteMan: 0,
          newJobLabel: '60歳完全リタイア（定年後働かない・無職）',
          mentalDelta: 14,
        },
      ],
    };
    return state;
  }

  // (D4-2) 60歳到来時（退職金制度なし・0円〜少額の世帯専用！）：60歳以降の働き方・職種（継続雇用 / 別職種 / アルバイト / 定年後働かない）をその時の選択肢で決める！
  if (
    age === 60 &&
    careerEdu.retirementAllowanceMan < 400 &&
    !state.triggeredEventIds.includes('no-retirement-60-survival')
  ) {
    state.triggeredEventIds.push('no-retirement-60-survival');
    const sameContinueIncome = Math.max(230, state.mainIncomeMan > 0 ? state.mainIncomeMan : 280);
    const canPrepay250 = state.liquidSavingsMan >= 450 && state.remainingBalanceMan >= 250;
    state.pendingDecision = {
      id: 'no-retirement-60-survival',
      yearIndex: y,
      age,
      category: 'retirement',
      title: `【60歳・今後の働き方＆職種選択】残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円を60代でどう乗り切るか？`,
      description:
        '60歳を迎えたが、退職金一時金がない（または少額の）キャリアのため一括返済の原資がない！60歳以降の働き方・職種（現職継続 / 別職種へ転職 / 週3〜4日アルバイト / 定年後は一切働かない）をどう選ぶか？（※60歳以降も毎年「今年の働き方・いつまで働くか」を自由に変更可能）',
      statisticalContext:
        '厚生労働省「就労条件総合調査」：日本企業の約25%（中小企業やベンチャー・外資では3〜7割）には退職金制度がなく、60代以降の働き方選択または現役時の貯蓄が完済の分岐点となる。',
      choices: [
        {
          id: 'senior-reemploy-same-job',
          label: `【現職で継続雇用】これまでの専門スキルを活かし、現在の職場・取引先で継続稼働する（年収${sameContinueIncome}万円）`,
          subLabel: `本人年収 ${sameContinueIncome}万円確保 / 慣れた仕事で60代も安定収入を維持`,
          outcomeSummary: `60歳以降も現職・取引先での継続稼働（年収${sameContinueIncome}万円）を選択し、安定したキャッシュフローを守り抜いた！`,
          newPostRetirementWork:
            careerEdu.postRetirementWork === 'retire-65-pension-only'
              ? 'retire-65-pension-only'
              : 'reemploy-same',
          newMainIncomeAbsoluteMan: sameContinueIncome,
          newJobLabel: '60代・継続雇用（現職稼働）',
          mentalDelta: 4,
        },
        {
          id: 'senior-fulltime-change-job',
          label: '【別職種へフルタイム転身】定年がない別職種（ビル設備管理・施設事務・ドライバー・介護事務等：年収260万円）へ転職して稼ぐ',
          subLabel: '本人年収 260万円確保 / 70歳まで安定して働ける実務職種へシフト',
          outcomeSummary:
            'プライドを捨ててシニア需要の高い実務職種へフルタイム転身！年間260万円の安定収入を確保し、退職金なしでも毎月返済を継続できる体制を整えた！',
          newPostRetirementWork: 'reemploy-light-job',
          newMainIncomeAbsoluteMan: 260,
          newJobLabel: '60代・別職種フルタイム（管理・設備実務職）',
          mentalDelta: 4,
        },
        {
          id: 'senior-arubaito-plus-prepay',
          label: canPrepay250
            ? '【週4日アルバイト＋貯蓄繰上返済】シニアアルバイト（年収150万円）で無理なく働きつつ、手元貯蓄から250万円を繰上返済する'
            : '【週3〜4日アルバイト勤務】体を壊さないようシニアアルバイト（清掃・受付・軽作業等：年収150万円）で無理なく働く',
          subLabel: canPrepay250
            ? '本人年収 150万円 / 手元資金 -250万 → ローン残債 -250万円圧縮'
            : '本人年収 150万円 / 体力を守りながら自分のペースで就労継続',
          outcomeSummary: canPrepay250
            ? '体を壊さないよう週4日のアルバイト勤務を選び、これまで貯めた自己資金から250万円を繰上返済して毎月の負担を引き下げた。'
            : '体を壊さないよう週3〜4日のアルバイト勤務（年収150万円）を選び、健康第一で60代をスタートした。',
          newPostRetirementWork: 'part-time-arubaito',
          newMainIncomeAbsoluteMan: 150,
          newJobLabel: '60代・週4日アルバイト勤務',
          cashDeltaMan: canPrepay250 ? -250 : 0,
          principalDeltaMan: canPrepay250 ? -250 : 0,
          mentalDelta: 6,
        },
        {
          id: 'senior-no-work-full-retire',
          label: '【定年後は一切働かない！】完全リタイア（無職・勤労収入0円）を選び、手元貯蓄を取り崩して悠々自適に暮らす',
          subLabel: '本人勤労収入 0円（完全引退） / 65歳の年金開始まで手元資金を取り崩して返済・生活を維持',
          outcomeSummary:
            '「60歳からは仕事に縛られず自由に生きる！」と定年後の完全リタイア（無職）を選択。勤労収入は0円となるが、これまでの蓄えを切り崩しながら自由な時間を手に入れた。',
          newPostRetirementWork: 'full-retire-60',
          newMainIncomeAbsoluteMan: 0,
          newJobLabel: '60歳完全リタイア（定年後働かない・無職）',
          mentalDelta: 12,
        },
      ],
    };
    return state;
  }

  // (D4-3) 65歳公的年金開始時：65歳以降は一切働かない（完全引退・年金のみ）か、シルバーアルバイトをするか
  if (
    age === 65 &&
    state.remainingBalanceMan >= 200 &&
    !state.triggeredEventIds.includes('retirement-65-work-or-not')
  ) {
    state.triggeredEventIds.push('retirement-65-work-or-not');
    const basePensionMan =
      state.config.employment === 'freelance'
        ? 150
        : state.config.employment === 'civil-servant' || state.config.employment === 'listed-corp'
          ? 250
          : 220;
    state.pendingDecision = {
      id: 'retirement-65-work-or-not',
      yearIndex: y,
      age,
      category: 'retirement',
      title: `【65歳・年金受給開始と完全引退の分岐点】65歳以降は一切働かないか？残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円への向き合い方`,
      description: `65歳を迎え公的年金（年約${basePensionMan}万円）の受給がスタート！しかし住宅ローン残債はまだ ${Math.round(state.remainingBalanceMan).toLocaleString()}万円残っている。ここからは一切働かず年金と貯蓄だけで悠々自適に暮らすか、それともシルバーアルバイトで収入を補うか？`,
      statisticalContext:
        '内閣府「高齢社会白書」：65〜69歳の就業率は約52%に達する一方、半数近くは65歳を機に完全引退し公的年金と貯蓄の取り崩しによるセカンドライフへ移行している。',
      choices: [
        {
          id: 'retire-65-no-work-pension',
          label: `「65歳定年後は一切働かない！」アルバイト等もせず完全引退し、公的年金（年${basePensionMan}万円）と貯蓄だけで暮らす`,
          subLabel: `65歳以降の勤労収入 0円（年金年${basePensionMan}万円のみ） / 自由な老後時間を最大化`,
          outcomeSummary:
            '「65歳からは一切働かず、自分の時間を楽しむ！」と完全引退を決断。公的年金とこれまでの貯蓄で住宅ローンを返済していく悠々自適な年金生活へ移行した。',
          newPostRetirementWork: 'retire-65-pension-only',
          newMainIncomeAbsoluteMan: basePensionMan,
          newJobLabel: '公的年金受給のみ（定年後働かない・完全リタイア）',
          mentalDelta: 12,
        },
        {
          id: 'retire-65-no-work-and-prepay',
          label: `「定年後は働かない＋貯蓄で繰上返済！」完全引退しつつ、手元資金から300万円を繰上返済して年金生活の負担を減らす`,
          subLabel: `勤労収入 0円（年金年${basePensionMan}万円のみ） / 手元資金 -300万円 → ローン残債 -300万円`,
          outcomeSummary:
            '65歳で完全引退して働かない道を選ぶと同時に、手元貯蓄から300万円を繰上返済に充当！年金だけでも無理なく返せるよう残債を圧縮した。',
          newPostRetirementWork: 'retire-65-pension-only',
          newMainIncomeAbsoluteMan: basePensionMan,
          newJobLabel: '公的年金受給のみ（定年後働かない・完全リタイア）',
          cashDeltaMan: -300,
          principalDeltaMan: -300,
          mentalDelta: 10,
        },
        {
          id: 'retire-65-light-silver-work',
          label: `健康維持と返済の足しを兼ねて、週3日のシルバー短時間アルバイト（年金＋年72万円）を無理なく続ける`,
          subLabel: `本人収入 年${basePensionMan + 72}万円（年金${basePensionMan}万＋バイト72万） / 貯蓄の目減りを抑制`,
          outcomeSummary:
            '社会とのつながりと家計のゆとりを保つため、週3日の短時間シルバーアルバイトを継続。年金＋月6万円の副収入で貯蓄を守りながら返済を続ける。',
          newPostRetirementWork: 'part-time-arubaito',
          newMainIncomeAbsoluteMan: basePensionMan + 72,
          newJobLabel: '公的年金受給 ＋ シルバー短時間アルバイト',
          mentalDelta: 4,
        },
      ],
    };
    return state;
  }

  // (C0-0) 独身（単身）スタート世帯の「結婚の転機・同居か結婚住み替えかおひとり様継続か」イベント（3〜6年目・48歳以下）
  if (
    !careerEdu.hasSpouse &&
    !state.isDivorced &&
    age <= 48 &&
    y >= 3 &&
    (y === 4 || (y <= 7 && rng() < 0.35)) &&
    !state.triggeredEventIds.includes('single-marriage-crossroad')
  ) {
    state.triggeredEventIds.push('single-marriage-crossroad');
    state.pendingDecision = {
      id: 'single-marriage-crossroad',
      yearIndex: y,
      age,
      category: 'life',
      title: '【独身オーナーの大きな転機】パートナーとの結婚・同居か、ファミリー物件への結婚住み替えか、独身貴族を貫くか？',
      description:
        '独身（おひとり様）で購入したマイホームで暮らすなか、将来を共にしたいパートナーとの結婚話が具体化した！今の家に2人で住んで共働きで一気に資産を築くか、結婚を機に今の家を売却して広い新居へ「結婚住み替え」するか、それとも独身ライフを貫くか？',
      statisticalContext:
        '国土交通省調査・不動産流通統計：20〜30代の単身マンション購入者の約4割が数年以内に結婚等を機に「同居」または「売却してファミリー物件への住み替え」を行っている。',
      choices: [
        {
          id: 'single-marry-stay-dual',
          label: 'パートナーと結婚し、今のマイホームに2人で住んで「正社員共働き（配偶者年収+260万円）」を始める！',
          subLabel: '結婚成立（2馬力化：世帯年収+260万/年） / 挙式・新生活準備 -95万円・幸福度 +15',
          outcomeSummary:
            'パートナーと結婚し、独身時代に買ったマイホームで新婚生活をスタート！住居費はそのままで配偶者の正社員収入（+260万円/年）が加わり、家計の貯蓄力と幸福度が一気に跳ね上がった！',
          marrySpouse: 'dual-income',
          cashDeltaMan: -95,
          mentalDelta: 15,
        },
        {
          id: 'single-marry-and-relocate',
          label: '結婚を機に今の家を売却し、2人で広いファミリー向け新居へ「結婚ステップアップ住み替え」する！',
          subLabel: '結婚成立（配偶者年収+280万/年）＋広い新居へ買い替え（物件価値+1,150万） / 幸福度 +18',
          outcomeSummary:
            '結婚と同時に独身時代のマイホームを売却し、将来の家族計画も見据えた広いファミリー向け新居へ華麗に住み替え！2馬力の収入で新居のローンに挑む新たなステージが始まった！',
          marrySpouse: 'dual-income',
          relocatePlan: 'upgrade-wider',
          mentalDelta: 18,
        },
        {
          id: 'single-marry-parttime',
          label: 'パートナーと結婚し、家庭ゆとり重視の「パートタイム共働き（配偶者年収+115万円）」で今の家に暮らす',
          subLabel: '結婚成立（配偶者パート年収+115万/年） / 新生活準備 -65万円・幸福度 +13',
          outcomeSummary:
            'パートナーと結婚し、仕事と家事のバランスを大切にした穏やかな新婚生活を今のマイホームでスタートさせた！',
          marrySpouse: 'part-time',
          cashDeltaMan: -65,
          mentalDelta: 13,
        },
        {
          id: 'single-stay-solo-life',
          label: '結婚はせず（おひとり様・事実婚別居等）、誰にも縛られない独身マイホーム貴族を貫く',
          subLabel: '独身継続（1馬力） / 自分のキャリアと趣味・資産運用に集中（+30万円・幸福度+5）',
          outcomeSummary:
            '自分のペースで生きる「おひとり様オーナー」の道を選択！誰に気兼ねすることもなく、自分の城とキャリア・資産形成を極める決意を固めた。',
          cashDeltaMan: 30,
          mentalDelta: 5,
        },
      ],
    };
    return state;
  }

  // (C0-1) 子どもがいない夫婦（DINKsまたは独身から結婚した夫婦・41歳以下）の「第1子誕生・ライフプラン大転換」イベント
  if (
    careerEdu.hasSpouse &&
    !state.isDivorced &&
    state.childrenAges.length === 0 &&
    age <= 41 &&
    (y === 3 || (y >= 6 && y <= 8 && state.triggeredEventIds.includes('single-marriage-crossroad'))) &&
    !state.triggeredEventIds.includes('dinks-unexpected-childbirth')
  ) {
    state.triggeredEventIds.push('dinks-unexpected-childbirth');
    state.pendingDecision = {
      id: 'dinks-unexpected-childbirth',
      yearIndex: y,
      age,
      category: 'life',
      title: '【家族の大きな転機】夫婦2人（DINKs）世帯に新しい命の兆し・第1子誕生と家計再設計',
      description:
        '購入時は「子どもなし（DINKs）」の想定で住宅ローンを組んでいたが、夫婦の間に新しい命を授かる転機が訪れた！子どもを迎え入れれば0歳から22年間の育児・教育費が始まる一方、住宅ローン控除の子育て世帯拡充や児童手当も受けられる。どう選択するか？',
      statisticalContext:
        '国立社会保障・人口問題研究所調査：マイホーム購入後に第1子が誕生する夫婦は多く、出産を機に教育資金（学資保険または新NISA）と働き方の再設計が必要となる。',
      choices: [
        {
          id: 'welcome-first-child-gakushi',
          label: '新しい家族（第1子・0歳）を喜んで迎え入れ、将来の大学資金として学資保険も契約する（出産育児準備 -45万円）',
          subLabel: '子ども1人（0歳）誕生！ / 手元資金 -45万円・学資保険積立開始（18歳時に+200万円満期）＋幸福度+14',
          outcomeSummary:
            '待望の第1子が誕生し、夫婦2人から3人家族での新しい暮らしがスタート！将来の進学に備えて学資保険も契約し、家族の大きな喜びと張り合いが生まれた！',
          cashDeltaMan: -45,
          addNewbornChild: true,
          newHasGakushiHoken: true,
          mentalDelta: 14,
        },
        {
          id: 'welcome-first-child-flexible',
          label: '第1子（0歳）を迎え入れ、学資保険には入らず手元キャッシュと新NISAで教育費に備える（出産準備 -30万円）',
          subLabel: '子ども1人（0歳）誕生！ / 手元資金 -30万円・流動性を維持して育児スタート＋幸福度+12',
          outcomeSummary:
            '新しい家族（第1子）を迎え入れ、児童手当と手元資金の運用で柔軟に教育費を準備する体制を整えた！',
          cashDeltaMan: -30,
          addNewbornChild: true,
          newHasGakushiHoken: false,
          mentalDelta: 12,
        },
        {
          id: 'stay-dinks-career-focus',
          label: '当初のライフプラン通り夫婦2人（DINKs）の生活スタイルを貫き、キャリアとローン完済に集中する',
          subLabel: '子どもなし継続 / 教育費負担 0円のまま資産形成に集中・幸福度+4',
          outcomeSummary:
            '夫婦でじっくり話し合い、これまで通り2人での暮らしとキャリア・資産形成に集中する道を選んだ。',
          mentalDelta: 4,
        },
      ],
    };
    return state;
  }

  // (C0-2) 子ども1人世帯（配偶者あり・38歳以下）の「第2子誕生」選択イベント（5年目・確率45%）
  if (
    careerEdu.hasSpouse &&
    !state.isDivorced &&
    state.childrenAges.length === 1 &&
    age <= 38 &&
    y === 5 &&
    rng() < 0.45 &&
    !state.triggeredEventIds.includes('second-child-birth-choice')
  ) {
    state.triggeredEventIds.push('second-child-birth-choice');
    state.pendingDecision = {
      id: 'second-child-birth-choice',
      yearIndex: y,
      age,
      category: 'life',
      title: '【家族計画の岐路】2人目の子ども（第2子）を迎え入れるか、1人っ子に教育資源を集中するか？',
      description:
        '1人目の子育てが軌道に乗るなか、夫婦で「もう1人子ども（第2子）を迎えるか」の話し合いになった。マイホームの部屋数には余裕があるが、住宅ローン返済に加えて2人分の教育費（大学まで1人あたり1,000万〜1,800万円）がかかる！',
      statisticalContext:
        '出生動向基本調査：理想の子ども数（2人以上）に対し、住宅ローンと教育費の負担感から「1人っ子」にとどめるか「2人目」へ踏み出すかは30代世帯の大きな分岐点。',
      choices: [
        {
          id: 'welcome-second-baby',
          label: '第2子（0歳）を迎え入れ、4人家族でにぎやかに暮らす（出産・育児準備 -35万円）',
          subLabel: '子どもが2人に！（0歳追加） / 手元資金 -35万円・家族の幸福度 +12',
          outcomeSummary:
            '元気な第2子が誕生し4人家族に！これから2人分の教育費とローン返済が始まるが、きょうだいが育つ温かいマイホームになった！',
          cashDeltaMan: -35,
          addNewbornChild: true,
          mentalDelta: 12,
        },
        {
          id: 'keep-one-child-focus',
          label: '住宅ローン完済と1人目の進学資金を盤石にするため、子どもは1人に集中する',
          subLabel: '子ども1人継続 / 家計の安全余裕度と教育資金を温存・幸福度 +4',
          outcomeSummary:
            '家計の安全性を最優先し、現在の1人の子どもに愛情と教育資金をしっかり注ぐ方針を固めた。',
          mentalDelta: 4,
        },
      ],
    };
    return state;
  }

  // (C) ペアローン世帯の試練（4年目：ペアローンかつ配偶者が就労中の世帯のみ）
  if (
    state.config.contractType === 'pair' &&
    careerEdu.hasSpouse &&
    !state.isDivorced &&
    state.subIncomeMan > 0 &&
    y === 4 &&
    !state.triggeredEventIds.includes('pair-loan-crossroad-4')
  ) {
    state.triggeredEventIds.push('pair-loan-crossroad-4');
    state.pendingDecision = {
      id: 'pair-loan-crossroad-4',
      yearIndex: y,
      age,
      category: 'pair-crisis',
      title: '【ペアローンの正念場】共働きフルタイム限界＆夫婦の働き方見直し',
      description:
        'ペアローンで2人とも住宅ローンを抱えるプレッシャーの中、仕事と家事・育児の両立で配偶者が心身ともに疲弊。「働き方をセーブするかパートに切り替えたい」と切り出されたが、収入が減ればペアローンの返済負担率が一気に跳ね上がる！',
      statisticalContext:
        '住宅金融支援機構調査：20代・30代のペアローン利用率は3割超に達する一方、出産・転職・離婚時の返済計画変更が最大のリスク要因となる。',
      choices: [
        {
          id: 'support-short-time',
          label: '家事代行や時短家電に投資（80万円）し、夫婦で分担して共働きを継続する',
          subLabel: '手元資金 -80万円 / 配偶者収入維持・夫婦の幸福度 +12',
          outcomeSummary:
            '80万円を投じて徹底的に家事外注・時短化！夫婦の会話と余裕が戻り、ペアローンの2馬力収入とW住宅ローン控除を堅持できた！',
          cashDeltaMan: -80,
          mentalDelta: 12,
        },
        {
          id: 'spouse-downshift',
          label: '配偶者がパート・時短勤務（年収140万円）へ転換するのを容認する',
          subLabel: '配偶者年収 140万円へ減少 / 幸福度 +5（配偶者名義のローン返済はそのまま残る）',
          outcomeSummary:
            '配偶者がパート・時短勤務へセーブし家庭は落ち着いたが、配偶者名義のローン返済は減らないため世帯の貯蓄ペースが低下した。',
          newSubIncomeAbsoluteMan: 140,
          newSpouseJobLabel: 'パート・時短勤務（ペアローン返済中）',
          mentalDelta: 5,
        },
        {
          id: 'divorce-conflict',
          label: '「ペアローンがあるから絶対フルで働け」と強く突き放す',
          subLabel: '夫婦関係悪化・別居危機！慰謝料・別居費用 -320万円＆1馬力化リスク',
          outcomeSummary:
            '激しい口論の末に夫婦関係が破綻…。ペアローン共有名義のため簡単に売却も名義変更もできず、別居・調停費用で320万円が流出し実質1馬力となった。',
          cashDeltaMan: -320,
          subIncomeMultiplierDelta: -1.0,
          newSpouseJobLabel: '離別（単身化）',
          mentalDelta: -28,
        },
      ],
    };
    return state;
  }

  // (C2) 配偶者（奥さん・パートナー）の働き方選択イベント（専業主婦からの職場復帰・パート開始 / パートから正社員登用 / 正社員からパート・専業への転換を途中の選択肢で選べる！）
  if (
    careerEdu.hasSpouse &&
    !state.isDivorced &&
    age < 62 &&
    (state.config.contractType === 'pair' ? y === 9 : y === 4) &&
    !state.triggeredEventIds.includes('spouse-work-turning-point')
  ) {
    const evId = 'spouse-work-turning-point';
    state.triggeredEventIds.push(evId);
    if (state.subIncomeMan === 0) {
      state.pendingDecision = {
        id: evId,
        yearIndex: y,
        age,
        category: 'life',
        title: '【配偶者の働き方選択】専業主婦（夫）から正社員へ職場復帰するか、パート勤務を始めるか、家庭に専念するか？',
        description:
          '現在、配偶者は専業主婦（夫）として家庭を支えているが、今後の住宅ローン返済・教育費・物価上昇を見据え、「正社員・フルタイムとして職場復帰するか、週3〜4日のパート・アルバイト勤務を始めるか、このまま家庭に専念するか」を家族で話し合う時期が来た。（※毎年の画面からも配偶者が今年働くかどうかをいつでも変更できます）',
        statisticalContext:
          '総務省「労働力調査」：専業主婦（夫）世帯でも子育て等の節目にパート勤務（年100〜130万円）や正社員への職場復帰（年240万円〜）を選択することで、生涯の返済余力が大きく変わる。',
        choices: [
          {
            id: 'spouse-start-arubaito',
            label: '無理のない範囲で週3〜4日のパート・アルバイト勤務（接客・事務・軽作業：年収108万円）を始める',
            subLabel: '配偶者年収 +108万円/年 / 家庭と両立しながら毎年100万円超の安定収入確保',
            outcomeSummary:
              '近隣の職場で週3〜4日のパート・アルバイトを開始！家庭のペースを守りながら年間108万円の収入が加わり、家計の安心感が一気に高まった！',
            newSpouseWorkPattern: 'part-time',
            newSubIncomeAbsoluteMan: 108,
            newSpouseJobLabel: 'パート・アルバイト勤務（週3〜4日）',
            mentalDelta: 4,
          },
          {
            id: 'spouse-start-fulltime',
            label: 'これまでの経験・資格を活かし、正社員・フルタイム（年収250万円）として職場復帰する',
            subLabel: '配偶者年収 +250万円/年（職場復帰） / 家事分担は増えるが貯蓄・繰上返済ペースが劇的アップ！',
            outcomeSummary:
              '正社員・フルタイムでの職場復帰に成功！世帯年収が250万円一気に底上げされ、繰上返済と教育・老後資金準備が盤石になった！',
            newSpouseWorkPattern: 'fulltime-keep',
            newSubIncomeAbsoluteMan: 250,
            newSpouseJobLabel: '正社員・フルタイム（職場復帰）',
            mentalDelta: 2,
          },
          {
            id: 'spouse-keep-homemaker',
            label: '今は働きに出ず、このまま専業主婦（夫）として家事・育児に専念する',
            subLabel: '配偶者収入 0円継続 / 家庭のゆとりと幸福度 +6',
            outcomeSummary:
              '本人の収入1馬力で返済を続け、配偶者は家庭と暮らしのサポートに専念する方針を選択した。',
            newSpouseWorkPattern: 'homemaker',
            newSubIncomeAbsoluteMan: 0,
            newSpouseJobLabel: '専業主婦（夫）',
            mentalDelta: 6,
          },
        ],
      };
    } else if (state.subIncomeMan <= 165) {
      state.pendingDecision = {
        id: evId,
        yearIndex: y,
        age,
        category: 'life',
        title: '【配偶者の働き方選択】パート勤務から正社員へ職場復帰・登用か、パート継続か、家庭専念か？',
        description: `現在、配偶者はパート・アルバイト勤務（年収${state.subIncomeMan}万円）で家計を支えている。勤務先から「正社員・フルタイム（年収250万円）へステップアップしないか」と声がかかった一方、今のパートを続けるか、いったん仕事を辞めて専業主婦（夫）になる選択肢もある。`,
        statisticalContext:
          '「106万円・130万円の壁」を超えて厚生年金に加入してフルタイムで働くと、現役時の手取りだけでなく将来の公的年金受給額も生涯で数百万円増加する。',
        choices: [
          {
            id: 'part-to-regular-up',
            label: '正社員・フルタイム登用（年収250万円）へステップアップ・本格職場復帰する',
            subLabel: `配偶者年収 ${state.subIncomeMan}万 → 250万円へ増加！ / 将来の厚生年金も増額`,
            outcomeSummary:
              'パートから正社員・フルタイムへのステップアップを選択！世帯収入が大きく伸び、住宅ローンの返済余力が一段と高まった！',
            newSpouseWorkPattern: 'fulltime-keep',
            newSubIncomeAbsoluteMan: 250,
            newSpouseJobLabel: '正社員・フルタイム（パートから登用）',
            mentalDelta: 3,
          },
          {
            id: 'keep-current-part',
            label: `現在のパート・アルバイト勤務（年収${state.subIncomeMan}万円）を無理なく継続する`,
            subLabel: '仕事と家庭のバランスを維持・幸福度 +4',
            outcomeSummary:
              '今のパート・アルバイトのペースを維持し、家事と仕事のベストバランスを守った。',
            newSpouseWorkPattern: 'part-time',
            mentalDelta: 4,
          },
          {
            id: 'reduce-to-light-arubaito',
            label: 'いったんパートを辞め、専業主婦（夫）（年収0円）として家庭と健康を最優先する',
            subLabel: `配偶者年収 ${state.subIncomeMan}万 → 0円 / 家庭のゆとり回復で幸福度 +7`,
            outcomeSummary:
              'パート勤務に区切りをつけ、しばらく家庭と健康を最優先する専業主婦（夫）の暮らしを選んだ。',
            newSpouseWorkPattern: 'homemaker',
            newSubIncomeAbsoluteMan: 0,
            newSpouseJobLabel: '専業主婦（夫）',
            mentalDelta: 7,
          },
        ],
      };
    } else {
      state.pendingDecision = {
        id: evId,
        yearIndex: y,
        age,
        category: 'life',
        title: '【共働き配偶者の働き方選択】正社員継続か、パート勤務への転換か、専業主婦（夫）へ休職・退職か？',
        description: `配偶者が正社員フルタイム勤務（年収${state.subIncomeMan}万円）と家庭・育児の両立に悩んでいる。「このまま正社員を続けるか、正社員を辞めてパート勤務（年120万円）に切り替えるか、あるいはいったん専業主婦（夫）になりたい」との相談を受けた。`,
        statisticalContext:
          '共働き世帯でも、ライフステージの変化に伴い正社員からパート・アルバイトへ転換したり一時的に離職するケースは多く、その後の再復帰も含めた柔軟な選択が求められる。',
        choices: [
          {
            id: 'keep-spouse-fulltime-support',
            label: '家事分担と時短家電（-40万円）で負担を減らし、正社員フルタイムを継続する',
            subLabel: '手元資金 -40万円 / 配偶者の正社員収入と将来の退職金・厚生年金を維持！',
            outcomeSummary:
              '家事の徹底分担と時短設備導入で配偶者の負担を解消！正社員としてのキャリアと高い世帯収入を守り抜いた。',
            newSpouseWorkPattern: 'fulltime-keep',
            cashDeltaMan: -40,
            mentalDelta: 6,
          },
          {
            id: 'switch-spouse-to-arubaito',
            label: '正社員から週3〜4日のパート・アルバイト勤務（年収120万円）へ転換する',
            subLabel: `配偶者年収 ${state.subIncomeMan}万 → 120万円に減少 / 家庭のゆとり・幸福度 +8`,
            outcomeSummary:
              '配偶者が正社員を卒業し、無理のないパート・アルバイト勤務へシフト。世帯収入は減ったが、穏やかな暮らしを手に入れた。',
            newSpouseWorkPattern: 'part-time',
            newSubIncomeAbsoluteMan: 120,
            newSpouseJobLabel: 'パート・アルバイト勤務（正社員から転換）',
            mentalDelta: 8,
          },
          {
            id: 'switch-spouse-to-homemaker',
            label: 'いったん退職し、専業主婦（夫）（年収0円）として家庭・育児・健康を最優先する',
            subLabel: `配偶者年収 ${state.subIncomeMan}万 → 0円 / 1馬力になるが家族のゆとり +10`,
            outcomeSummary:
              '配偶者が正社員を退職して専業主婦（夫）へ。本人の1馬力収入でローンを返すことになるが、心身の健康と家族の時間を守った。',
            newSpouseWorkPattern: 'homemaker',
            newSubIncomeAbsoluteMan: 0,
            newSpouseJobLabel: '専業主婦（夫）（正社員から退職）',
            mentalDelta: 10,
          },
        ],
      };
    }
    return state;
  }

  // (A0-1) マンション・タワマン7年目：管理組合総会（機械式駐車場＆管理会社見直し）
  if (
    property.buildingType !== 'detached' &&
    y === 7 &&
    !state.triggeredEventIds.includes('mansion-mgmt-parking-7')
  ) {
    state.triggeredEventIds.push('mansion-mgmt-parking-7');
    state.pendingDecision = {
      id: 'mansion-mgmt-parking-7',
      yearIndex: y,
      age,
      category: 'repair-crisis',
      title:
        property.buildingType === 'tower'
          ? '【タワマン管理組合総会】コンシェルジュ・機械式駐車場の維持費見直し議案'
          : '【マンション管理組合総会】機械式駐車場の空き増加と管理会社見直し議案',
      description:
        'マンション特有の課題が浮上！共用設備や機械式駐車場のメンテナンス費が膨らむなか、理事会で「管理会社との契約見直し」「過剰サービスの削減」「マイカー駐車場契約の継続是非」が議論されている。',
      statisticalContext:
        '分譲マンションでは管理委託費の適正化や機械式駐車場の撤去・平面化によって、将来の管理費・修繕積立金の高騰を月5,000〜15,000円抑えられる事例が増えている。',
      choices: [
        {
          id: 'lead-board-reform',
          label: '理事に立候補し、管理委託費の相見積もりと共用部LED・省エネ化を断行する',
          subLabel: '毎月の管理修繕費 -0.5万円/月（年6万円削減）・マンション資産価値 +80万円',
          outcomeSummary:
            '休日の時間を割いて理事長として交渉をまとめ上げ、サービス品質を維持したまま管理委託費の削減に成功！毎月の固定費が月5,000円軽くなった。',
          repairCostMonthlyDeltaMan: -0.5,
          buildingValueBonusMan: 80,
          mentalDelta: -2,
        },
        {
          id: 'release-car-parking',
          label: 'マイカーを手放してマンション駐車場を解約し、カーシェアへ移行する',
          subLabel: '車両売却 +90万円 / 毎月の駐車場・維持費 -1.6万円/月（年19.2万円削減）',
          outcomeSummary:
            '駅近マンションの利便性を活かしてマイカーを売却し、駐車場契約を解約！売却益90万円を得て、さらに毎月の固定費が1.6万円大幅に軽くなった！',
          cashDeltaMan: 90,
          repairCostMonthlyDeltaMan: -1.6,
          mentalDelta: 2,
        },
        {
          id: 'keep-luxury-service',
          label: '現状のフルサービス・駐車場契約を維持し、管理費の値上げ（+0.4万/月）を受け入れる',
          subLabel: '毎月の管理費 +0.4万円/月 / 暮らしの快適さと満足度 +6',
          outcomeSummary:
            '共用サービスとマイカー生活をそのまま維持。毎月の管理費は少し上がったが、家族の満足度は高く保たれた。',
          repairCostMonthlyDeltaMan: 0.4,
          mentalDelta: 6,
        },
      ],
    };
    return state;
  }

  // (A0-2) 一戸建て7年目：屋根太陽光パネル＋蓄電池・断熱窓リノベの選択
  if (
    property.buildingType === 'detached' &&
    y === 7 &&
    !state.triggeredEventIds.includes('detached-solar-ev-7')
  ) {
    state.triggeredEventIds.push('detached-solar-ev-7');
    state.pendingDecision = {
      id: 'detached-solar-ev-7',
      yearIndex: y,
      age,
      category: 'repair-crisis',
      title: '【一戸建ての特権】電気代・ガス代高騰に対する「太陽光発電＋蓄電池・内窓断熱」導入判断',
      description:
        '管理組合の許可がいらない一戸建てならではの選択肢！エネルギー価格の上昇が続くなか、自治体の補助金を使って屋根への太陽光パネル＋蓄電池、または高断熱内窓リフォームを導入するかどうかの提案が届いた。',
      statisticalContext:
        '一戸建てはマンションに比べ面積あたりの光熱費が高くなりやすい一方、自家消費型太陽光＋断熱改修で年間15〜22万円の光熱費削減が可能。',
      choices: [
        {
          id: 'install-full-solar-battery',
          label: '補助金を活用し、太陽光パネル＋定置型蓄電池を導入する（自己負担 135万円）',
          subLabel: '手元資金 -135万円 / 毎月の光熱費・売電収支が月1.4万円（年16.8万円）恒久改善＋建物価値+110万',
          outcomeSummary:
            '屋根に太陽光パネルと蓄電池を設置！日中の電気代がほぼゼロになり、災害時の停電対策と年間約17万円のキャッシュフロー改善を同時に手に入れた！',
          cashDeltaMan: -135,
          repairCostMonthlyDeltaMan: -1.4,
          buildingValueBonusMan: 110,
          mentalDelta: 6,
        },
        {
          id: 'inner-window-insulation',
          label: 'コスパ重視で全室「高断熱内窓（二重窓）」リフォームのみ実施する（48万円）',
          subLabel: '手元資金 -48万円 / 冷暖房費が月0.6万円（年7.2万円）削減・健康＆快適性アップ',
          outcomeSummary:
            '先進的窓リノベ補助金を活用して48万円で内窓を設置！冬の底冷えと結露が消え、冷暖房費も年間約7万円浮くようになった。',
          cashDeltaMan: -48,
          repairCostMonthlyDeltaMan: -0.6,
          mentalDelta: 5,
        },
        {
          id: 'skip-energy-upgrade',
          label: '初期費用をかけず、今のまま手元キャッシュを温存する',
          subLabel: '初期出費 0円 / 今後のエネルギー価格上昇で光熱費が月+0.3万円増加',
          outcomeSummary:
            'まとまった出費を見送り手元資金を温存した。ただし電気・ガス代の値上がりにより毎月の光熱費負担がじわじわ増えている。',
          repairCostMonthlyDeltaMan: 0.3,
        },
      ],
    };
    return state;
  }

  // (A0-3) 8年目：日銀の途中利上げ局面・変動金利上昇への緊急対応決断
  if (
    state.currentRateType !== 'flat-35' &&
    y === 8 &&
    state.remainingBalanceMan > 1200 &&
    !state.triggeredEventIds.includes('mid-term-rate-hike-8')
  ) {
    state.triggeredEventIds.push('mid-term-rate-hike-8');
    const fixedSwitchRate = Math.round((2.05 + Math.max(0, state.bojPolicyRate - 0.75) * 0.35) * 100) / 100;
    state.pendingDecision = {
      id: 'mid-term-rate-hike-8',
      yearIndex: y,
      age,
      category: 'boj-shock',
      title: `【日銀の追加利上げ局面】適用金利が ${state.appliedInterestRate.toFixed(2)}% へ上昇！今後の金利対策は？`,
      description: `返済8年目、物価上昇と円安への対応として日本銀行が段階的な追加利上げを実施！契約時（${state.underwriting.effectiveInitialRate.toFixed(2)}%）より金利が上昇し、毎月の利息負担が膨らみ始めている。まだ残債が ${Math.round(state.remainingBalanceMan).toLocaleString()}万円あるなか、どう動くか？`,
      statisticalContext:
        '返済初期（残債が多い時期）の利上げほど利息増加ダメージが大きい。「繰上返済による元金圧縮」か「固定金利への借り換え」かが最大の分岐点となる。',
      choices: [
        {
          id: 'prepay-cut-principal',
          label: '変動金利のまま継続しつつ、手元資金から150万円を繰上返済して元金を直接削る',
          subLabel: '手元資金 -150万円 → ローン残債 -150万円（利上げの元本ベースを圧縮）',
          outcomeSummary:
            '150万円を元金へ直接充当！金利がかかる対象元本そのものを減らすことで、利上げ局面でも利息の膨張を抑え込んだ。',
          cashDeltaMan: -150,
          principalDeltaMan: -150,
          mentalDelta: 3,
        },
        {
          id: 'switch-to-fixed-rate',
          label: `今後のさらなる利上げを遮断するため、諸費用65万円を払って全期間固定（${fixedSwitchRate}%）へ借り換える`,
          subLabel: `手元資金 -65万円 / 以降完済まで金利 ${fixedSwitchRate}% 完全固定で安心確保`,
          outcomeSummary:
            '諸費用65万円を支払って全期間固定金利へ借り換え完了！今後どれだけ日銀が利上げしても返済額が変わらない安心を手に入れた。',
          cashDeltaMan: -65,
          newRateType: 'flat-35',
          newBaseRate: fixedSwitchRate,
          mentalDelta: 7,
        },
        {
          id: 'keep-variable-cut-living',
          label: '手元キャッシュは温存し、通信費・保険・サブスクの見直しで利上げ分を吸収する',
          subLabel: '初期出費 0円・家計改善 +35万円 / 今後の追加利上げリスクは継続',
          outcomeSummary:
            '手元資金を動かさず、家計の固定費削減でキャッシュフローを補強した。今後の日銀の動向を引き続き注視する。',
          cashDeltaMan: 35,
          mentalDelta: -1,
        },
      ],
    };
    return state;
  }

  // (A1) 子育て世帯10年目：中学受験の有無・進学ルートと住宅ローン返済のバランス決断（子どもがいる世帯のみ発火）
  if (
    state.childrenAges.length > 0 &&
    state.childrenAges.some((a) => a >= 8 && a <= 15) &&
    y === 10 &&
    !state.triggeredEventIds.includes('education-crossroad-10')
  ) {
    state.triggeredEventIds.push('education-crossroad-10');
    const isExamMode = careerEdu.juniorHighPath === 'private-exam-jhs';
    state.pendingDecision = {
      id: 'education-crossroad-10',
      yearIndex: y,
      age,
      category: 'education',
      title: isExamMode
        ? '【中学受験の天王山】進学塾（SAPIX・日能研等）の特別講習＆私立中進学か公立ルートか'
        : '【教育費とローンの岐路】公立中進学・高校受験塾と将来の大学・専門進学プラン',
      description: isExamMode
        ? '中学受験に向けた進学塾の夏期講習・志望校別特訓で年間120万円近い塾代ピークが到来！このまま私立中高一貫校へ進むか、学費の安い公立中高一貫校・地域の公立中へ切り替えて大学資金とローン返済余力を守るか？'
        : '子どもが進学準備期を迎え、周囲で中学受験や進学塾の話題が急増している。当初の公立中ルートを軸に堅実に大学資金を貯めるか、今から私立中学受験に参入するか？',
      statisticalContext:
        '文部科学省「子供の学習費調査」：公立中（3年間約162万円）と私立中（3年間約430万円＋小4〜6の受験塾代約280万円）では、高校進学前に1人あたり約550万円の差が生じる。',
      choices: isExamMode
        ? [
            {
              id: 'keep-private-exam-jhs',
              label: '予定通り中学受験・私立中高一貫ルートを完走する（直前講習・受験入学金 -95万円）',
              subLabel: '手元資金 -95万円・今後も私立中高学費を継続 / 進学満足度・幸福度 +10',
              outcomeSummary:
                '子どもの努力を全力で後押しして第一志望の私立中学校に見事合格！教育費はかさむが家族の誇りと満足度は大きく高まった。',
              cashDeltaMan: -95,
              newJuniorHighPath: 'private-exam-jhs',
              mentalDelta: 10,
            },
            {
              id: 'switch-to-public-jhs-prepay',
              label: '私立中受験から公立中トップ校ルートへ切り替え、浮いた資金120万円でローンを繰上返済する',
              subLabel: '手元資金 -120万円 → ローン残債 -120万円削減 ＆ 中高学費が公立水準へ大幅軽減！',
              outcomeSummary:
                '家計全体のバランスを見据えて公立中学→難関高校ルートへ転換！今後6年間の学費負担が劇的に軽くなり、浮いた資金でローン元金も120万円削った！',
              cashDeltaMan: -120,
              principalDeltaMan: -120,
              newJuniorHighPath: 'public-jhs',
              mentalDelta: 3,
            },
            {
              id: 'parent-upskill-income',
              label: '私立進学を維持するため、親自身が資格取得・昇進転職で世帯年収を引き上げる',
              subLabel: '自己投資 -35万円 / 本人年収 +8%アップ・私立中高ルート継続',
              outcomeSummary:
                '子どもの私立進学を支えるため親自身もキャリアアップを決断！年収が8%上昇し、高い教育費と住宅ローンの両立基盤を強化した。',
              cashDeltaMan: -35,
              incomeMultiplierDelta: 0.08,
              newJuniorHighPath: 'private-exam-jhs',
              mentalDelta: 5,
            },
          ]
        : [
            {
              id: 'steady-public-jhs-plan',
              label: '予定通り公立中＋地域の進学塾（-45万円）で堅実に学力を伸ばし、大学資金を温存する',
              subLabel: '手元資金 -45万円 / 公立中ルート継続・幸福度 +6',
              outcomeSummary:
                '過熱する中学受験競争には乗らず、公立中＋地元の優良塾で基礎学力を徹底強化！高校・大学進学に向けた貯蓄をしっかり守った。',
              cashDeltaMan: -45,
              newJuniorHighPath: 'public-jhs',
              mentalDelta: 6,
            },
            {
              id: 'join-private-exam-late',
              label: '周囲に触発され、今から進学塾へ通わせて私立中学受験に参入する（-110万円）',
              subLabel: '手元資金 -110万円・以降「私立中高ルート（年142万）」へ変更 / 幸福度 +8',
              outcomeSummary:
                '急遽中学受験へ参戦し私立中へ進学！子どもの学習環境は充実したが、これからの私立学費と住宅ローンの二重負担が始まる。',
              cashDeltaMan: -110,
              newJuniorHighPath: 'private-exam-jhs',
              mentalDelta: 8,
            },
            {
              id: 'public-and-prepay-100',
              label: '通信教育を活用して公立中へ進み、浮いた資金100万円を住宅ローンの繰上返済に充てる',
              subLabel: '手元資金 -100万円 → ローン残債 -100万円削減・将来利息カット',
              outcomeSummary:
                '見栄に流されず堅実な学習スタイルを選び、100万円を住宅ローン元金の直接削減へ投入！大学進学前の固定費圧縮に成功した。',
              cashDeltaMan: -100,
              principalDeltaMan: -100,
              newJuniorHighPath: 'public-jhs',
              mentalDelta: 3,
            },
          ],
    };
    return state;
  }

  // (A) 戸建て13年目：外壁塗装・屋根防水・給湯器交換の大規模修繕イベント
  if (
    property.buildingType === 'detached' &&
    y === 13 &&
    !state.triggeredEventIds.includes('detached-repair-13')
  ) {
    state.triggeredEventIds.push('detached-repair-13');
    state.pendingDecision = {
      id: 'detached-repair-13',
      yearIndex: y,
      age,
      category: 'repair-crisis',
      title: '【戸建て13年目の試練】外壁塗装・屋根防水＆給湯器交換の見積書（185万円）',
      description:
        '一戸建ては管理費・修繕積立金が0円だった分、10〜15年ごとの外装メンテナンスはすべて自己資金で行う必要がある。ハウスメーカーから「今すぐ全面施工しないと雨漏り・シロアリ被害で資産価値が急落する」と診断された！',
      statisticalContext:
        '統計データ：一戸建て保有世帯の30年間メンテナンス費用平均は約450万〜600万円。先送りすると雨漏り改修で逆に倍額かかるケースが多い。',
      choices: [
        {
          id: 'full-renovation',
          label: '185万円を一括支払いし、高耐久フッ素塗装＆給湯器交換を実施する',
          subLabel: '手元資金 -185万円 / 建物資産価値 +150万円維持・メンタル+6',
          outcomeSummary:
            '185万円を投じて外壁・屋根・給湯器を完全リフレッシュ！建物の劣化が食い止められ、資産価値と快適性が大きく回復した。',
          cashDeltaMan: -185,
          buildingValueBonusMan: 150,
          mentalDelta: 6,
        },
        {
          id: 'partial-patch',
          label: '相見積もりで最低限のコーキング補修（75万円）に抑える',
          subLabel: '手元資金 -75万円 / 建物価値は標準減価',
          outcomeSummary:
            '地元工務店に依頼し75万円で急場の防水処理を実施。出費を抑えてキャッシュを温存した。',
          cashDeltaMan: -75,
        },
        {
          id: 'ignore-repair',
          label: '手元資金が惜しいので放置・先送りする',
          subLabel: '出費 0円 / 雨漏り進行で建物評価額 -280万円・メンタル-12',
          outcomeSummary:
            '修繕を先送りした結果、台風シーズンに外壁クラックから雨漏りが発生し、建物評価額が280万円暴落してしまった…。',
          buildingValueBonusMan: -280,
          mentalDelta: -12,
        },
      ],
    };
    return state;
  }

  // (B) マンション・タワマン14年目：大規模修繕積立金不足＆一時金徴収決議
  if (
    property.buildingType !== 'detached' &&
    y === 14 &&
    !state.triggeredEventIds.includes('mansion-special-levy-14')
  ) {
    state.triggeredEventIds.push('mansion-special-levy-14');
    const levyMan = property.buildingType === 'tower' ? 95 : 55;
    state.pendingDecision = {
      id: 'mansion-special-levy-14',
      yearIndex: y,
      age,
      category: 'repair-crisis',
      title: `【管理組合・緊急臨時総会】第1回大規模修繕の資材高騰で積立金不足！`,
      description: `建築資材と足場・職人人件費の高騰により、予定していた大規模修繕工事費が予算を35%超過！管理組合から「1戸あたり一時金${levyMan}万円の徴収」または「修繕積立金のさらなる大幅値上げ」の議案が提出された。`,
      statisticalContext:
        '国土交通省調査：全国のマンションの約3割以上で長期修繕計画に対して積立金が不足しており、一時金徴収や借入が問題化している。',
      choices: [
        {
          id: 'pay-lump-levy',
          label: `一時金 ${levyMan}万円を支払い、予定通り高品位な大規模修繕を実施`,
          subLabel: `手元資金 -${levyMan}万円 / マンション資産価値 +140万円維持`,
          outcomeSummary: `一時金${levyMan}万円を拠出して大規模修繕を完遂！外観と共用部が美しく蘇り、中古市場での資産価値が維持された。`,
          cashDeltaMan: -levyMan,
          buildingValueBonusMan: 140,
          mentalDelta: 4,
        },
        {
          id: 'monthly-hike-plan',
          label: '一時金は否決し、毎月の修繕積立金を +1.5万円/月 引き上げる案に賛成',
          subLabel: '初期出費 0円 / 毎月の管理修繕費が +1.5万円（年18万円）恒久増加',
          outcomeSummary:
            '管理組合借入と月額積立金の+1.5万円増額で対応。手元資金は守られたが、毎月の固定費負担がさらに重くなった。',
          repairCostMonthlyDeltaMan: 1.5,
        },
      ],
    };
    return state;
  }

  // (D) 年齢階級別の統計確率に基づく健康リスク（がん・3大疾病・一般疾病長期療養）と「団信」審判
  if (y >= 3 && state.remainingBalanceMan > 250) {
    const healthProbs = calcAnnualHealthRiskProbabilities(
      age,
      state.focusMode ?? 'balanced',
      state.healthScore ?? 85,
    );
    const healthRoll = rng();

    // 1. がん（悪性新生物）罹患判定（国立がん研究センター年齢階級別罹患率ベース：35年間累積で約20〜24%）
    if (
      healthRoll < healthProbs.cancerProb &&
      !state.triggeredEventIds.includes('danshin-health-judgment')
    ) {
      state.triggeredEventIds.push('danshin-health-judgment');
      const canTriggerDanshin = danshin.cancerCoverage > 0;

      state.pendingDecision = {
        id: 'danshin-health-judgment',
        yearIndex: y,
        age,
        category: 'health-danshin',
        title: `【${age}歳・人間ドック精密検査】初期がん（ステージI）の診断確定と「団信」判定！`,
        description: `人間ドックの再検査で早期の悪性新生物（がん）が見つかった。幸い早期発見で手術により社会復帰可能だが、ここで契約時に選んだ「${danshin.name}」の保障内容が運命を分ける！`,
        statisticalContext: `国立がん研究センター統計：${age}歳時点の年間がん罹患率は約${(healthProbs.cancerProb * 100).toFixed(2)}%（35年返済期間中の累積罹患確率は約20〜24%・約4〜5人に1人）。`,
        choices: canTriggerDanshin
          ? [
              {
                id: 'claim-danshin',
                label: `【団信発動申請】${danshin.name}の診断給付金を申請する！（残債 ${Math.round(danshin.cancerCoverage * 100)}%免除）`,
                subLabel:
                  danshin.cancerCoverage >= 1.0
                    ? `住宅ローン残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円が全額免除（0円）に！！`
                    : `住宅ローン残債の半分（${Math.round(state.remainingBalanceMan * 0.5).toLocaleString()}万円）が免除！`,
                outcomeSummary:
                  danshin.cancerCoverage >= 1.0
                    ? `特約団信が発動し、残っていた住宅ローン ${Math.round(state.remainingBalanceMan).toLocaleString()}万円が全額免除（完済）された！高額療養費適用後の治療費50万円を払っても、今後の住居費は管理費と税金のみになる劇的救済！`
                    : `がん50%保障団信が発動し、住宅ローン残債が半減！毎月の返済負担が劇的に軽くなり、安心して治療と仕事の両立に向かえるようになった。`,
                principalDeltaMan: -Math.round(state.remainingBalanceMan * danshin.cancerCoverage),
                cashDeltaMan: -50,
                mentalDelta: 15,
              },
            ]
          : [
              {
                id: 'basic-danshin-endure',
                label: '一般団信（死亡・高度障害のみ）のため保障対象外…高額療養費制度と傷病手当金を活用して治療・返済を続ける',
                subLabel: '残債免除 0円 / 手術・休職の自己負担と減収で手元資金 -140万円・メンタル-12',
                outcomeSummary:
                  '一般団信のため住宅ローン残債は免除されず。公的な高額療養費制度と傷病手当金で最悪の事態は防いだものの、差額ベッド代や賞与減額等で140万円の持ち出しとなった。',
                cashDeltaMan: -140,
                mentalDelta: -12,
              },
              {
                id: 'basic-danshin-reschedule',
                label: '銀行へ事情を説明し、治療専念のため3年間の元金返済猶予（リスケジュール）を申請する',
                subLabel: '手元資金 -55万円・3年間は利息のみ支払いに軽減（返済期間+3年延長）',
                outcomeSummary:
                  '銀行へ診断書を提出して3年間の元金据置リスケジュールを承認してもらった。完済年齢は3年延びるが、治療期間中のキャッシュ流出を最小限に抑えた。',
                cashDeltaMan: -55,
                termDeltaYears: 3,
                mentalDelta: -5,
              },
            ],
      };
      return state;
    }

    // 2. 急性心筋梗塞・脳卒中（3大疾病の血管系疾患）発症判定（35年間累積で約8〜10%）
    if (
      healthRoll >= healthProbs.cancerProb &&
      healthRoll < healthProbs.cancerProb + healthProbs.vascularProb &&
      !state.triggeredEventIds.includes('danshin-health-judgment')
    ) {
      state.triggeredEventIds.push('danshin-health-judgment');
      const canTriggerThreeMajor = danshin.threeMajorCoverage > 0;

      state.pendingDecision = {
        id: 'danshin-health-judgment',
        yearIndex: y,
        age,
        category: 'health-danshin',
        title: `【${age}歳・救急搬送】急性心筋梗塞・脳血管疾患による入院と「3大疾病団信」判定！`,
        description: `突如の胸痛・めまいで救急搬送され、カテーテル手術とリハビリ入院（60日以上）が必要となった。「がん団信」だけではカバーされない血管系疾患に対し、契約中の「${danshin.name}」はどこまで機能するか？`,
        statisticalContext: `厚生労働省「患者調査」：${age}歳時点の心疾患・脳血管疾患の年間発症率は約${(healthProbs.vascularProb * 100).toFixed(2)}%（35年返済期間中の累積発症率は約8〜10%）。`,
        choices: canTriggerThreeMajor
          ? [
              {
                id: 'claim-three-major-danshin',
                label: `【3大疾病団信発動】${danshin.name}の所定状態要件を満たし、残債100%免除を申請する！`,
                subLabel: `住宅ローン残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円が全額免除（0円）に！！`,
                outcomeSummary: `3大疾病特約が発動！がんだけでなく心筋梗塞・脳卒中までカバーしていたおかげで、住宅ローン残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円が全額ゼロになり、リハビリに専念できた！`,
                principalDeltaMan: -Math.round(state.remainingBalanceMan * danshin.threeMajorCoverage),
                cashDeltaMan: -55,
                mentalDelta: 14,
              },
            ]
          : [
              {
                id: 'vascular-not-covered-endure',
                label: `${state.config.danshin === 'cancer-50' ? 'がん団信（がんのみ対象）のため対象外…' : '一般団信のため対象外…'}傷病手当金を受けながらリハビリと返済を続ける`,
                subLabel: '残債免除 0円 / 入院・休職減収で手元資金 -155万円・メンタル-12',
                outcomeSummary:
                  state.config.danshin === 'cancer-50'
                    ? '「がん50%団信」は悪性新生物（がん）限定のため、心筋梗塞や脳卒中は免除対象外だった…。傷病手当金を活用しつつ貯蓄155万円を取り崩して乗り切った。'
                    : '一般団信のため対象外。入院治療費と休職中の賞与減少で155万円の支出となったが、早期リハビリにより職場復帰を果たした。',
                cashDeltaMan: -155,
                mentalDelta: -12,
              },
            ],
      };
      return state;
    }

    // 3. 一般疾病・長期療養（椎間板ヘルニア・消化器疾患・自律神経不調等、がん・3大疾病以外の入院/休職：累積約25%）
    if (
      healthRoll >= healthProbs.cancerProb + healthProbs.vascularProb &&
      healthRoll < healthProbs.cancerProb + healthProbs.vascularProb + healthProbs.generalIllnessProb &&
      !state.triggeredEventIds.includes('general-illness-episode')
    ) {
      state.triggeredEventIds.push('general-illness-episode');
      const hasAllDisease = state.config.danshin === 'all-disease-pair';

      state.pendingDecision = {
        id: 'general-illness-episode',
        yearIndex: y,
        age,
        category: 'health-danshin',
        title: `【${age}歳・一般疾病療養】椎間板ヘルニア・内臓疾患による2ヶ月間の入院療養`,
        description:
          'がんや脳卒中ではないものの、手術と2ヶ月間の療養が必要となった。働き盛り世代の入院原因の約7割は「がん・3大疾病以外の一般疾病（整形外科・消化器・ストレス性疾患等）」が占めている。',
        statisticalContext:
          '生命保険文化センター調査：現役世代の長期入院・休職の多くは一般疾病によるもの。健康保険の「高額療養費制度」と「傷病手当金（標準報酬の約2/3支給）」が家計の基本防波堤となる。',
        choices: hasAllDisease
          ? [
              {
                id: 'all-disease-monthly-cover',
                label: '【全疾病保障発動】全疾病・就業不能特約により療養期間中の毎月ローン返済額を全額カバー！',
                subLabel: '自己負担 0円（就業不能給付金が毎月返済を補填）・幸福度 +6',
                outcomeSummary:
                  '全疾病団信の就業不能サポートが発動！療養中のローン引き落とし分が保険から補填され、貯蓄を1円も減らさずに完治・職場復帰できた！',
                cashDeltaMan: 0,
                mentalDelta: 6,
              },
            ]
          : [
              {
                id: 'public-insurance-recovery',
                label: '健康保険の「高額療養費制度」と「傷病手当金」を申請し、差額分（-58万円）を貯蓄でカバーする',
                subLabel: '手元資金 -58万円 / しっかり静養して元通り職場復帰',
                outcomeSummary:
                  '日本の公的医療保険（高額療養費制度＋傷病手当金）のおかげで、医療費と休業補償の大部分がカバーされ、実質58万円の持ち出しで無事に職場復帰できた。',
                cashDeltaMan: -58,
                mentalDelta: -3,
              },
              {
                id: 'pace-down-health-first',
                label: '退院を機に残業のない部署へ異動し、健康第一の働き方へシフトする',
                subLabel: '手元資金 -35万円・本人年収 -6% / メンタル・健康 +8',
                outcomeSummary:
                  '退院後、無理のないペースで働ける部署へ異動。残業代減で年収は6%下がったが、健康と家族の時間を取り戻した。',
                cashDeltaMan: -35,
                incomeMultiplierDelta: -0.06,
                mentalDelta: 8,
              },
            ],
      };
      return state;
    }
  }

  // (D1-Ins) 火災保険・地震保険・水災特約の見直し更新決断（子どもなし世帯は10年目、子育て世帯は11年目に発火）
  if (
    ((y === 10 && state.childrenAges.length === 0) ||
      (y === 11 && state.childrenAges.length > 0)) &&
    !state.triggeredEventIds.includes('fire-earthquake-insurance-renewal-10')
  ) {
    state.triggeredEventIds.push('fire-earthquake-insurance-renewal-10');
    const isDetached = property.buildingType === 'detached';
    const fullCost = isDetached
      ? INSURANCE_PLAN_SPECS['full-fire-earthquake-water'].fiveYearCostDetachedMan
      : property.buildingType === 'tower'
        ? INSURANCE_PLAN_SPECS['full-fire-earthquake-water'].fiveYearCostTowerMan
        : INSURANCE_PLAN_SPECS['full-fire-earthquake-water'].fiveYearCostMansionMan;
    const stdCost = isDetached
      ? INSURANCE_PLAN_SPECS['standard-fire-earthquake'].fiveYearCostDetachedMan
      : property.buildingType === 'tower'
        ? INSURANCE_PLAN_SPECS['standard-fire-earthquake'].fiveYearCostTowerMan
        : INSURANCE_PLAN_SPECS['standard-fire-earthquake'].fiveYearCostMansionMan;
    const minCost = isDetached
      ? INSURANCE_PLAN_SPECS['minimal-fire-only'].fiveYearCostDetachedMan
      : property.buildingType === 'tower'
        ? INSURANCE_PLAN_SPECS['minimal-fire-only'].fiveYearCostTowerMan
        : INSURANCE_PLAN_SPECS['minimal-fire-only'].fiveYearCostMansionMan;

    state.pendingDecision = {
      id: 'fire-earthquake-insurance-renewal-10',
      yearIndex: y,
      age,
      category: 'repair-crisis',
      title: isDetached
        ? '【一戸建て・火災保険＆地震保険の補償見直し】自然災害激甚化と保険料改定への備え'
        : '【区分所有・火災保険＆地震保険の補償見直し】家財・漏水個人賠償と地震特約の選択',
      description: isDetached
        ? `近年の大型台風・線状降水帯・地震リスクの高まりを受け、損害保険各社が火災保険・地震保険料率を改定！現在加入中の「${INSURANCE_PLAN_SPECS[careerEdu.insurancePlan].shortLabel}」から、今後の補償範囲をどう見直すか？`
        : `分譲住宅の火災保険・地震保険の見直し時期が到来！現在加入中の「${INSURANCE_PLAN_SPECS[careerEdu.insurancePlan].shortLabel}」について、地震保険や水濡れ・個人賠償特約を手厚くするか、保険料を節約するか？`,
      statisticalContext:
        '内閣府・損保協会統計：住宅ローン利用中に大地震や水害で自宅が被災しても「住宅ローン残債は免除されない（二重ローンの危機）」ため、火災保険・地震保険の補償設計が極めて重要となる。',
      choices: [
        {
          id: 'ins-choose-full',
          label: `火災＋地震＋水災・風災・破損汚損の「フル補償プラン（5年目安${fullCost}万円）」で万全に備える`,
          subLabel: '台風・豪雨浸水・大地震・漏水時の自己負担を最小化 / 安心感でメンタル+5',
          outcomeSummary:
            '自然災害と設備破損を全方位カバーするフル補償プランを選択！万が一の台風・豪雨・大地震でも二重ローンに陥らない盤石の備えを固めた。',
          newInsurancePlan: 'full-fire-earthquake-water',
          mentalDelta: 5,
        },
        {
          id: 'ins-choose-standard',
          label: `水災特約のみ外し、火災＋地震＋風災の基本を押さえた「標準プラン（5年目安${stdCost}万円）」にする`,
          subLabel: '保険料と地震・台風補償のバランス重視 / 差額キャッシュ温存 +12万円',
          outcomeSummary:
            'ハザードマップを確認した上で不要な特約を整理し、火災・風災・地震保険をしっかり確保する標準プランへ最適化した。',
          newInsurancePlan: 'standard-fire-earthquake',
          cashDeltaMan: 12,
          mentalDelta: 2,
        },
        {
          id: 'ins-choose-minimal',
          label: `保険料を徹底節約するため、地震保険・水災を外した「火災のみ最小プラン（5年目安${minCost}万円）」に削る`,
          subLabel: '保険料節約で手元資金 +25万円 / 大地震・豪雨被災時は全額自己負担リスク！',
          outcomeSummary:
            '目先の保険料を大幅に削って25万円を浮かせたが、今後もし大地震や豪雨被害が発生した際は保険金が下りないリスクを抱えることになった。',
          newInsurancePlan: 'minimal-fire-only',
          cashDeltaMan: 25,
          mentalDelta: -3,
        },
      ],
    };
    return state;
  }

  // (D1-Reno16) 返済16年目：定期的な水回り設備・内装リフォーム決断（一戸建て vs マンション完全分離）
  if (y === 16 && !state.triggeredEventIds.includes('periodic-renovation-year16')) {
    state.triggeredEventIds.push('periodic-renovation-year16');
    if (property.buildingType === 'detached') {
      state.pendingDecision = {
        id: 'periodic-renovation-year16',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【一戸建て16年目・定期リフォーム】システムキッチン・洗面化粧台・トイレ更新＆床下防蟻処理',
        description:
          '入居から16年が経過し、毎日使ってきたキッチン食洗機・レンジフード・温水洗浄便座・洗面台の劣化と、5年周期の床下シロアリ防蟻保証の更新時期が重なった！どこまでリフォームするか？',
        statisticalContext:
          '住宅リフォーム推進協議会調査：築15〜18年は水回り設備と内装の更新ピークであり、適切な定期改修が建物寿命と快適性を大きく左右する。',
        choices: [
          {
            id: 'detached-reno16-full',
            label: '最新システムキッチン・節水トイレ・洗面台への一新＋床下防蟻・断熱改修を実施（148万円）',
            subLabel: '手元資金 -148万円 / 建物資産価値 +135万円・水道光熱費月-0.3万・幸福度+8',
            outcomeSummary:
              '148万円で水回り3点と床下防蟻を一括リフレッシュ！最新設備で家事効率と省エネ性能が上がり、一戸建ての資産価値も135万円回復した！',
            cashDeltaMan: -148,
            buildingValueBonusMan: 135,
            repairCostMonthlyDeltaMan: -0.3,
            mentalDelta: 8,
          },
          {
            id: 'detached-reno16-standard',
            label: '必須の床下シロアリ防蟻処理とトイレ・水栓金具・コンロ交換（62万円）に絞る',
            subLabel: '手元資金 -62万円 / 建物資産価値 +45万円・堅実メンテナンス',
            outcomeSummary:
              '構造を守るシロアリ防蟻と故障しやすい水栓・コンロ・トイレの交換を62万円で堅実に実施し、手元資金とのバランスを取った。',
            cashDeltaMan: -62,
            buildingValueBonusMan: 45,
            mentalDelta: 3,
          },
          {
            id: 'detached-reno16-postpone',
            label: 'まだ使えるのでリフォームは先送りし、パッキンDIY補修（5万円）のみで凌ぐ',
            subLabel: '手元資金 -5万円 / 設備老朽化・シロアリ不安で建物価値 -75万円・メンタル-5',
            outcomeSummary:
              '5万円の応急処置で出費を抑えたが、水回りの古さと床下劣化が進み、建物評価額が75万円低下した。',
            cashDeltaMan: -5,
            buildingValueBonusMan: -75,
            mentalDelta: -5,
          },
        ],
      };
    } else {
      state.pendingDecision = {
        id: 'periodic-renovation-year16',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【マンション16年目・専有部定期リフォーム】キッチン・トイレ・洗面水回り＆全室クロス貼替',
        description:
          '共用部の修繕とは別に、自室（専有部）のシステムキッチン・トイレ・洗面化粧台・壁紙クロスが築16年で更新期を迎えた！マンションの快適性と将来の売却査定額を保つため、どのレベルで改修するか？',
        statisticalContext:
          '分譲マンションの専有部リフォームは築15〜20年が第1のピーク。水回りと内装の定期更新を行わない住戸は中古査定で大幅な減額対象となりやすい。',
        choices: [
          {
            id: 'mansion-reno16-full',
            label: '専有部のキッチン・トイレ・洗面台交換＋全室クロス＆調湿エコカラット施工を実施（138万円）',
            subLabel: '手元資金 -138万円 / マンション住戸評価額 +130万円・幸福度 +8',
            outcomeSummary:
              '138万円で専有部の水回りと内装を一新！新築モデルルームのような美しさが蘇り、住戸の査定価値も130万円アップした！',
            cashDeltaMan: -138,
            buildingValueBonusMan: 130,
            mentalDelta: 8,
          },
          {
            id: 'mansion-reno16-standard',
            label: 'トイレ・水栓金具・レンジフード交換とリビング壁紙貼替（56万円）で手堅く整える',
            subLabel: '手元資金 -56万円 / 住戸評価額 +45万円・幸福度 +3',
            outcomeSummary:
              '劣化した設備機器の交換とリビングのクロス貼替を56万円で実施し、無理のない予算で清潔感を取り戻した。',
            cashDeltaMan: -56,
            buildingValueBonusMan: 45,
            mentalDelta: 3,
          },
          {
            id: 'mansion-reno16-postpone',
            label: '専有部リフォームは見送り、換気扇掃除とコーキング補修（4万円）のみで済ませる',
            subLabel: '手元資金 -4万円 / 専有部設備の陳腐化で住戸価値 -65万円・メンタル-4',
            outcomeSummary:
              'まとまった出費を避けたが、水回りの黄ばみや設備の不調が目立ち始め、住戸の評価額が65万円下落した。',
            cashDeltaMan: -4,
            buildingValueBonusMan: -65,
            mentalDelta: -4,
          },
        ],
      };
    }
    return state;
  }

  // (D2) 返済20年目：マンションエレベーター・配管更新 vs 一戸建て水回り・屋根ガルバ改修
  if (y === 20 && !state.triggeredEventIds.includes('property-year20-major')) {
    state.triggeredEventIds.push('property-year20-major');
    if (property.buildingType !== 'detached') {
      state.pendingDecision = {
        id: 'property-year20-major',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【マンション20年目】エレベーター制御盤・給排水管更新と専有部水回りリノベ',
        description:
          '入居から20年が経過し、共用部のエレベーター・給水ポンプ更新に加え、自室のユニットバス・キッチン・給湯器の老朽化が限界に。ここでの判断が後半の住み心地と売却時価を左右する。',
        statisticalContext:
          '築20年超のマンションでは、専有部水回りを一新した住戸と未改修住戸で中古成約価格に300万円以上の差がつくことが多い。',
        choices: [
          {
            id: 'full-unit-reno-20',
            label: '専有部の浴室・キッチン・内窓をフルリノベーションする（160万円）',
            subLabel: '手元資金 -160万円 / 住戸評価額 +190万円・幸福度 +8',
            outcomeSummary:
              '水回りと断熱窓を一新！新築同様の快適さが蘇り、マンション住戸としての資産価値も190万円向上した。',
            cashDeltaMan: -160,
            buildingValueBonusMan: 190,
            mentalDelta: 8,
          },
          {
            id: 'minimum-water-heater-20',
            label: '壊れかけの給湯器と水栓交換（35万円）のみにとどめ、現金を温存する',
            subLabel: '手元資金 -35万円 / 最小限の出費で乗り切る',
            outcomeSummary: '35万円で給湯器のみ交換し、老後資金に向けて手元キャッシュを守った。',
            cashDeltaMan: -35,
          },
        ],
      };
    } else {
      state.pendingDecision = {
        id: 'property-year20-major',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【一戸建て20年目】屋根ガルバリウムカバー工法＆浴室断熱リフォームの選択',
        description:
          '築20年を超え、スレート屋根の防水寿命と在来浴室の寒さ・老朽化が目立ってきた。ここで軽量高耐久なガルバリウム鋼板屋根への改修を行うか、部分補修で凌ぐかの分岐点。',
        statisticalContext:
          '築20年の一戸建てでは、屋根の軽量カバー工法により耐震性と防水寿命を25年以上延ばす改修が主流となっている。',
        choices: [
          {
            id: 'galvalume-roof-bath-20',
            label: '屋根ガルバリウム改修＋高断熱ユニットバス交換を実施（195万円）',
            subLabel: '手元資金 -195万円 / 建物評価額 +180万円・光熱費月-0.4万・幸福度+8',
            outcomeSummary:
              '屋根と浴室を徹底改修！今後の雨漏りリスクが消滅し、ヒートショック対策も万全な安心の我が家になった。',
            cashDeltaMan: -195,
            buildingValueBonusMan: 180,
            repairCostMonthlyDeltaMan: -0.4,
            mentalDelta: 8,
          },
          {
            id: 'roof-partial-20',
            label: '屋根の棟板金・部分補修（55万円）のみで済ませる',
            subLabel: '手元資金 -55万円 / 現金を温存',
            outcomeSummary: '55万円の部分補修で急場をしのぎ、手元資金を温存した。',
            cashDeltaMan: -55,
          },
        ],
      };
    }
    return state;
  }

  // (D2-Reno28) 返済28年目：第2回大規模修繕・老後バリアフリー＆配管・外装リフォーム決断（一戸建て vs マンション完全分離）
  if (y === 28 && !state.triggeredEventIds.includes('periodic-renovation-year28')) {
    state.triggeredEventIds.push('periodic-renovation-year28');
    if (property.buildingType === 'detached') {
      state.pendingDecision = {
        id: 'periodic-renovation-year28',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【一戸建て28年目・第2回外装＆老後バリアフリー改修】外壁2回目塗装・給排水管更新と段差解消',
        description:
          '入居から28年が経過！13年目の塗装から15年が経ち「2回目の外壁・防水メンテナンス」と「給排水管の更新」、さらに老後を見据えた「手すり・段差解消・ヒートショック防止改修」が必要な時期を迎えた。',
        statisticalContext:
          '築30年前後の一戸建ては、給排水管と外装の2回目改修を行うことで築50〜60年まで快適に住み続けられる長期資産となる。',
        choices: [
          {
            id: 'detached-reno28-full',
            label: '外壁2回目塗装＋給排水管更新＋老後バリアフリー・内窓断熱改修を完遂する（210万円）',
            subLabel: '手元資金 -210万円 / 建物資産価値 +195万円・老後も安心な終の棲家へ＋幸福度+9',
            outcomeSummary:
              '210万円を投じて外装・配管・バリアフリー改修を完了！これから先20年以上安心して暮らせる理想の終の棲家に生まれ変わった！',
            cashDeltaMan: -210,
            buildingValueBonusMan: 195,
            mentalDelta: 9,
          },
          {
            id: 'detached-reno28-essential',
            label: '漏水防止の給排水管更新と防水シーリング・手すり設置（88万円）に絞って施工する',
            subLabel: '手元資金 -88万円 / 建物資産価値 +75万円・必要十分な老後対策',
            outcomeSummary:
              '88万円で給排水管と防水・手すり改修を実施。老後資金を守りながら致命的な漏水リスクを確実に潰した。',
            cashDeltaMan: -88,
            buildingValueBonusMan: 75,
            mentalDelta: 4,
          },
          {
            id: 'detached-reno28-skip',
            label: '老後キャッシュを減らしたくないため、改修を見送ってそのまま住み続ける',
            subLabel: '出費 0円 / 配管・外装の老朽化で建物価値 -140万円・メンタル-6',
            outcomeSummary:
              '現金を守るため改修を見送ったが、外壁の色あせと配管の老朽化が進み、建物評価額が140万円低下した。',
            buildingValueBonusMan: -140,
            mentalDelta: -6,
          },
        ],
      };
    } else {
      state.pendingDecision = {
        id: 'periodic-renovation-year28',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【マンション28年目・第2回大規模修繕＆専有部バリアフリー改修】配管更新と老後リノベの選択',
        description:
          '入居28年目を迎え、マンション全体の第2回大規模修繕（外壁・サッシ・共用配管更新）と合わせて、自室内の専有部給排水管更新・バリアフリー床・内窓リフォームを同時施工すると割安になると案内された！',
        statisticalContext:
          '築28〜30年のマンションでは、専有部配管（床下給水・給湯管）の更新有無が漏水事故防止と売却可能性の生命線となる。',
        choices: [
          {
            id: 'mansion-reno28-full',
            label: '専有部給排水管の全面更新＋フラットフロア・断熱内窓リノベーションを実施（165万円）',
            subLabel: '手元資金 -165万円 / 住戸資産価値 +160万円・漏水リスクゼロ＆幸福度+8',
            outcomeSummary:
              '165万円で専有部配管の全面更新とバリアフリー・内窓改修を完了！築30年を感じさせない快適で資産価値の高い住戸に仕上がった！',
            cashDeltaMan: -165,
            buildingValueBonusMan: 160,
            mentalDelta: 8,
          },
          {
            id: 'mansion-reno28-pipe-only',
            label: '階下漏水を防ぐ「専有部給排水管の更新（65万円）」のみ実施し、内装は現状維持とする',
            subLabel: '手元資金 -65万円 / 住戸価値 +55万円・漏水リスクを確実に解消',
            outcomeSummary:
              '必須の専有部配管更新のみ65万円で実施！マンションで最も怖い階下への水漏れリスクを解消しつつ手元現金を温存した。',
            cashDeltaMan: -65,
            buildingValueBonusMan: 55,
            mentalDelta: 3,
          },
          {
            id: 'mansion-reno28-skip',
            label: '共用部の修繕積立金工事だけに任せ、自室の改修は見送る（0円）',
            subLabel: '出費 0円 / 専有部配管の老朽化リスクで住戸価値 -110万円・メンタル-5',
            outcomeSummary:
              '自室の配管更新を見送ったため、いつ床下配管が漏水するか分からない不安が残り、住戸の評価額も110万円下落した。',
            buildingValueBonusMan: -110,
            mentalDelta: -5,
          },
        ],
      };
    }
    return state;
  }

  // (D3) 53歳時点：親の介護と地方実家の相続・空き家処分問題
  if (age === 53 && !state.triggeredEventIds.includes('parent-inheritance-53')) {
    state.triggeredEventIds.push('parent-inheritance-53');
    state.pendingDecision = {
      id: 'parent-inheritance-53',
      yearIndex: y,
      age,
      category: 'life',
      title: '【53歳・実家の相続と親の介護】空き家になった実家の整理と相続資金の活用',
      description:
        '親の施設入居・相続に伴い、地方にある実家（空き家）の扱いが議題となった。放置すれば毎年の固定資産税と管理費がかかるが、解体・売却して整理すればまとまった相続資金が手に入る。',
      statisticalContext:
        '日本の空き家数は約900万戸に達し、50代で自宅の住宅ローンを返済しながら実家の管理・処分に直面する世帯が急増している。',
      choices: [
        {
          id: 'sell-family-home-prepay',
          label: '実家を整理・売却し、受け取った遺産（+420万円）で自宅ローンを300万円繰上返済する',
          subLabel: '手元資金 +120万円・ローン残債 -300万円削減！',
          outcomeSummary:
            '空き家特例を活用して実家をスムーズに売却！得た420万円のうち300万円を自宅ローンの繰上返済に充て、定年前の残債を一気に圧縮した！',
          cashDeltaMan: 120,
          principalDeltaMan: -300,
          mentalDelta: 5,
        },
        {
          id: 'sell-family-home-keep-cash',
          label: '実家を売却し、受け取った420万円をすべて手元の老後防衛資金・新NISAへ入れる',
          subLabel: '手元金融資産 +420万円',
          outcomeSummary:
            '実家を売却して得た420万円をそのまま手元資金に組み入れ、55歳役職定年後のキャッシュフロー防衛力を高めた。',
          cashDeltaMan: 420,
          mentalDelta: 4,
        },
      ],
    };
    return state;
  }

  // (D5) 住宅ローン控除終了の崖（11年目・14年目：減税期間満了直後の繰上返済 vs 運用判断）
  if (
    taxInfo.maxYears > 0 &&
    y === taxInfo.maxYears + 1 &&
    state.remainingBalanceMan >= 1200 &&
    state.liquidSavingsMan >= 350 &&
    !state.triggeredEventIds.includes('tax-deduction-cliff-choice')
  ) {
    state.triggeredEventIds.push('tax-deduction-cliff-choice');
    state.pendingDecision = {
      id: 'tax-deduction-cliff-choice',
      yearIndex: y,
      age,
      category: 'life',
      title: `【住宅ローン控除（${taxInfo.maxYears}年間）満了の転機】減税メリット終了後の資金戦略は？`,
      description: `これまで毎年最大35万円規模で戻ってきていた住宅ローン減税（年0.7%控除）が今年で満了！「控除があるうちは繰上返済しない方が得」と温存してきた手元資金（${Math.round(state.liquidSavingsMan).toLocaleString()}万円）をどう動かすか？`,
      statisticalContext:
        '住宅金融支援機構調査：控除期間終了直後（11年目・14年目）は、住宅ローン利用者がまとまった一部繰上返済を実行する最大のピーク時期となっている。',
      choices: [
        {
          id: 'cliff-prepay-200',
          label: '控除終了を機に、温存していた資金から200万円を一部繰上返済して元金を削る',
          subLabel: '手元資金 -200万円 / ローン残債 -200万円削減・将来利息カット',
          outcomeSummary:
            '住宅ローン控除終了のベストタイミングで200万円を元金へ直接充当！減税をフルに受け切った上で残債を圧縮する理想的な立ち回りを実現した。',
          cashDeltaMan: -200,
          principalDeltaMan: -200,
          mentalDelta: 5,
        },
        {
          id: 'cliff-invest-nisa',
          label: '繰上返済はせず、新NISA・高配当インデックス運用に回して資産利回りで上回る',
          subLabel: '手元流動性を維持・運用果実 +45万円 / ローン残債はそのまま',
          outcomeSummary:
            '借入金利よりも投資利回りの方が高いと判断し、手元キャッシュを運用へ配分。流動性を保ちつつ資産形成を加速させた。',
          cashDeltaMan: 45,
          mentalDelta: 3,
        },
      ],
    };
    return state;
  }

  // (D6) 子ども18歳・大学／専門学校進学時の学費・奨学金・進路最終決断イベント（高卒就職以外の進学世帯のみ発火）
  if (
    state.childrenAges.includes(18) &&
    careerEdu.higherEdPath !== 'high-school-job' &&
    !state.triggeredEventIds.includes('university-scholarship-choice')
  ) {
    state.triggeredEventIds.push('university-scholarship-choice');
    const pathSpec = HIGHER_ED_SPECS[careerEdu.higherEdPath];
    const gakushiNote = careerEdu.hasGakushiHoken
      ? '（今年受け取った学資保険満期金+200万円も活用可能！）'
      : '（学資保険の満期金はないため手元貯蓄と毎年の収入で対応）';

    state.pendingDecision = {
      id: 'university-scholarship-choice',
      yearIndex: y,
      age,
      category: 'education',
      title: `【子ども18歳・${pathSpec.shortLabel}進学】入学金・学費と「奨学金・学生バイト」の最終判断`,
      description: `ついに子どもが18歳を迎え「${pathSpec.shortLabel}」への進学が決定！${gakushiNote} 住宅ローン返済と並行して、これからの学費負担と奨学金の利用をどう決めるか？`,
      statisticalContext:
        '日本政策金融公庫調査：国公立大（4年約430万）、私立文系（約600万）、私立理系（約790万）、専門学校2年（約300万）と進路で負担が大きく異なり、約2.7人に1人が奨学金を利用している。',
      choices: [
        {
          id: 'univ-parent-full-support',
          label: `奨学金は借りず、親の貯蓄${careerEdu.hasGakushiHoken ? 'と学資保険満期金' : ''}から「${pathSpec.shortLabel}」の学費を全額負担する`,
          subLabel: '一時出費 -90万円・奨学金なし（親全額負担） / 家族の絆・子どもの安心感 +10',
          outcomeSummary: `子どもに奨学金の借金を背負わせず、親の力で「${pathSpec.shortLabel}」へ送り出した！親としての大きな責任を果たし家族の絆が深まった。`,
          cashDeltaMan: -90,
          newScholarshipType: 'none',
          mentalDelta: 10,
        },
        {
          id: 'univ-jasso-scholarship',
          label: '日本学生支援機構（JASSO）の貸与型奨学金（月5万）を利用し、在学中の親負担を年▲60万円軽減する',
          subLabel: '一時出費 -40万円 / 在学中の教育費が毎年60万円軽減され住宅ローン破綻を回避',
          outcomeSummary:
            '親子でしっかり話し合い、JASSO貸与型奨学金を併用する堅実プランを選択。在学4年間の家計キャッシュフローが大きく守られた。',
          cashDeltaMan: -40,
          newScholarshipType: 'jasso-loan',
          mentalDelta: 3,
        },
        {
          id: 'univ-grant-and-arubaito',
          label: '給付型奨学金・授業料減免の申請＋子どもの学生アルバイトで、親の負担を年▲90万円圧縮する',
          subLabel: '一時出費 -25万円 / 在学中の親負担を年▲90万円大幅カット！',
          outcomeSummary:
            '授業料減免制度と子どもの学生アルバイト（塾講師・接客バイト）を組み合わせ、親の学費持ち出しを最小限に抑えて進学を実現した！',
          cashDeltaMan: -25,
          newScholarshipType: 'grant-workstudy',
          mentalDelta: 2,
        },
        ...(careerEdu.higherEdPath === 'private-science-univ' ||
        careerEdu.higherEdPath === 'private-arts-univ'
          ? [
              {
                id: 'switch-to-national-or-vocational',
                label:
                  '家計状況を率直に話し合い、学費の安い「国公立大学」または「2年制専門学校」へ進路変更してもらう',
                subLabel: '一時出費 -30万円 / 4年間の学費総額が200万〜350万円軽減！',
                outcomeSummary:
                  '家計と住宅ローンの実情を共有し、学費負担の軽い国公立ルートへ進路をシフト。50代の教育費破綻リスクを未然に回避した。',
                cashDeltaMan: -30,
                newHigherEdPath: 'national-univ' as const,
                mentalDelta: -2,
              },
            ]
          : []),
      ],
    };
    return state;
  }

  // 直近1年以内にすでに決断モーダルが出ていた場合は、緊急時以外のランダム転機イベントをクールダウン
  const lastActionYear =
    state.chronicle.find((c) => c.category === 'action' || c.category === 'danshin')?.yearIndex ?? -5;
  const isCooldownClear = y - lastActionYear >= 2;

  // (D7) 一戸建て専用の現実的なランダム転機・課題イベント群（マンションには絶対に発生しない）
  if (property.buildingType === 'detached' && isCooldownClear) {
    const detachedRoll = rng();

    // 1. 一戸建て×マイカー寿命買替＆EV充電設備（9〜12年目、確率25%）
    if (
      y >= 9 &&
      y <= 12 &&
      detachedRoll < 0.25 &&
      !state.triggeredEventIds.includes('detached-car-replace')
    ) {
      state.triggeredEventIds.push('detached-car-replace');
      state.pendingDecision = {
        id: 'detached-car-replace',
        yearIndex: y,
        age,
        category: 'life',
        title: '【一戸建て×マイカー問題】ファミリーカーの車検寿命到来と自宅EV/HV充電設備の選択',
        description:
          '一戸建て暮らしの足として活躍してきたマイカーが11年目の車検を迎え、ハイブリッドバッテリーと足回りの交換見積もりが高額に！敷地内駐車場がある一戸建ての強みを活かしてどう買い替えるか？',
        statisticalContext:
          '自工会調査：郊外・地方の一戸建て世帯では自動車保有率が9割を超え、住宅ローンと並ぶ「第2の固定費（生涯2,500万〜3,500万円）」となる。',
        choices: [
          {
            id: 'buy-hv-ev-home-charge',
            label: '自宅に200V充電コンセントを設置し、燃費の良い最新HV/EVへ買い替える（195万円）',
            subLabel: '手元資金 -195万円 / ガソリン・維持費が月0.5万円（年6万円）恒久削減・幸福度+7',
            outcomeSummary:
              '敷地内駐車場に自宅充電設備を整えて最新エコカーへ買替！ガソリンスタンド通いと燃料費が激減し、休日の家族ドライブも快適になった。',
            cashDeltaMan: -195,
            repairCostMonthlyDeltaMan: -0.5,
            mentalDelta: 7,
          },
          {
            id: 'buy-used-compact-car',
            label: '見栄を張らず、状態の良い3年落ち認定中古車（98万円）に買い替えて現金を温存する',
            subLabel: '手元資金 -98万円 / 堅実なキャッシュ防衛・幸福度+3',
            outcomeSummary:
              '新車価格の高騰を見据え、コスパ抜群の認定中古車を選択！住宅ローン返済に響かない賢い買い替えとなった。',
            cashDeltaMan: -98,
            mentalDelta: 3,
          },
          {
            id: 'keep-old-car-repair',
            label: '買い替えを見送り、38万円かけて車検・修理を通してもう4年乗り続ける',
            subLabel: '手元資金 -38万円 / 燃費悪化・故障リスクでメンタル-2',
            outcomeSummary:
              '38万円の修理費で車検を通し、まとまった現金流出を先送りした。',
            cashDeltaMan: -38,
            mentalDelta: -2,
          },
        ],
      };
      return state;
    }

    // 2. 大型台風・豪雨による一戸建ての屋根棟板金・雨樋・外構破損と火災保険申請（5〜24年目、年率5.5%）
    if (
      y >= 5 &&
      y <= 24 &&
      detachedRoll >= 0.25 &&
      detachedRoll < 0.305 &&
      !state.triggeredEventIds.includes('detached-storm-gutter')
    ) {
      state.triggeredEventIds.push('detached-storm-gutter');
      state.pendingDecision = {
        id: 'detached-storm-gutter',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【一戸建て・大型台風直撃】屋根の棟板金浮き・雨樋破損と火災保険（風災補償）の活用判断',
        description:
          '観測史上最大級の台風が通過した翌朝、自宅の屋根の棟板金とカーポート・雨樋に破損が見つかった！一戸建ては建物全体の防災・補修判断もすべてオーナー自身の責任となる。',
        statisticalContext:
          '損害保険料率算出機構統計：近年の自然災害激甚化により一戸建ての火災保険料・風災請求件数は上昇傾向にあり、早期の防災改修が建物寿命を左右する。',
        choices: [
          {
            id: 'insurance-plus-disaster-upgrade',
            label: '火災保険の風災保険金を申請しつつ、追い金45万円で防災瓦・高耐久ガルバ棟へ強化改修する',
            subLabel: '手元資金 -45万円 / 建物資産価値 +95万円・今後の台風安心感 +6',
            outcomeSummary:
              '火災保険金を賢く活用し、足場を組んだついでに屋根全体の耐風強化を実施！今後の雨漏り不安が一掃され、建物評価額も向上した。',
            cashDeltaMan: -45,
            buildingValueBonusMan: 95,
            mentalDelta: 6,
          },
          {
            id: 'insurance-exact-repair',
            label: '火災保険の認定額の範囲内（自己負担0円）で破損箇所のみ原状回復する',
            subLabel: '自己負担 0円 / 破損箇所を元通り修理',
            outcomeSummary:
              '加入していた火災保険の風災補償が全額下り、手出しゼロで雨樋と屋根板金の修理を完了した！',
            cashDeltaMan: 0,
            mentalDelta: 2,
          },
        ],
      };
      return state;
    }

    // 3. 真冬の戸建てエコキュート・給湯システム故障（11〜17年目、年率16%）
    if (
      y >= 11 &&
      y <= 17 &&
      detachedRoll >= 0.305 &&
      detachedRoll < 0.465 &&
      !state.triggeredEventIds.includes('detached-ecocute-fail')
    ) {
      state.triggeredEventIds.push('detached-ecocute-fail');
      state.pendingDecision = {
        id: 'detached-ecocute-fail',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【一戸建て・真冬の設備危機】屋外エコキュート（大型給湯器）の寿命故障と交換選択',
        description:
          '1月の厳冬期、一戸建ての犬走り（屋外）に設置されたエコキュートにエラーコードが点灯しお湯が出なくなった！設計寿命（10〜15年）を迎えており本体交換が必要だ。',
        statisticalContext:
          '経済産業省「給湯省エネ事業」：高効率エコキュートへの交換は国からの補助金（8万〜13万円）対象となり、年間電気代も旧型比で約2〜3万円削減される。',
        choices: [
          {
            id: 'latest-subsidy-ecocute',
            label: '国の給湯省エネ補助金を活用し、最新の太陽光連携・高効率エコキュートへ交換（実質48万円）',
            subLabel: '手元資金 -48万円 / 毎月の電気代 -0.3万円（年3.6万円）削減・メンタル+4',
            outcomeSummary:
              '補助金を使って最新鋭の省エネ給湯器へ交換完了！お湯の勢いも良くなり、毎月の電気代も確実に下がった。',
            cashDeltaMan: -48,
            repairCostMonthlyDeltaMan: -0.3,
            mentalDelta: 4,
          },
          {
            id: 'budget-water-heater',
            label: '在庫処分の標準型給湯器（32万円）へ最安交換して出費を抑える',
            subLabel: '手元資金 -32万円 / 最小限のコストで復旧',
            outcomeSummary:
              '32万円で標準モデルへ交換し、即日お湯が出る生活を取り戻した。',
            cashDeltaMan: -32,
          },
        ],
      };
      return state;
    }

    // 4. 一戸建ての隣地境界・ブロック塀耐震＆防草外構改修（15〜23年目、年率14%）
    if (
      y >= 15 &&
      y <= 23 &&
      detachedRoll >= 0.465 &&
      detachedRoll < 0.605 &&
      !state.triggeredEventIds.includes('detached-neighbor-boundary')
    ) {
      state.triggeredEventIds.push('detached-neighbor-boundary');
      state.pendingDecision = {
        id: 'detached-neighbor-boundary',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【一戸建ての敷地・外構課題】隣地境界の古いブロック塀改修＆庭の防草リフォーム',
        description:
          '築年数が進み、敷地境界のブロック塀の劣化と毎夏の雑草手入れ・隣地への落ち葉問題が負担になってきた。自治体のブロック塀撤去補助金を使って外構を一新するか？',
        statisticalContext:
          '一戸建てでは50代以降に庭の草むしりや外構維持が体力的な負担となりやすく、メンテナンスフリー外構への改修需要が高い。',
        choices: [
          {
            id: 'exterior-fence-low-maint',
            label: '補助金を活用し、軽量アルミ目隠しフェンス＋全面防草人工芝・タイルへ改修する（62万円）',
            subLabel: '手元資金 -62万円 / 建物・敷地評価額 +70万円・草むしり解放でメンタル+6',
            outcomeSummary:
              '古い塀を安全なアルミフェンスに変え、庭も防草仕様へ一新！毎夏の重労働だった草むしりから永久に解放され、外観も見違えるほど美しくなった。',
            cashDeltaMan: -62,
            buildingValueBonusMan: 70,
            mentalDelta: 6,
          },
          {
            id: 'diy-weed-sheet',
            label: '週末のDIYで防草シートと砂利を敷き、最小限の費用（12万円）で済ませる',
            subLabel: '手元資金 -12万円 / コスト最小化',
            outcomeSummary:
              'ホームセンターで資材を調達し12万円でDIY施工。体力を遣ったが出費を大幅に節約できた。',
            cashDeltaMan: -12,
            mentalDelta: -1,
          },
        ],
      };
      return state;
    }
  }

  // (D8) マンション・タワマン専用の現実的なランダム転機・課題イベント群（一戸建てには絶対に発生しない）
  if (property.buildingType !== 'detached' && isCooldownClear) {
    const mansionRoll = rng();

    // 1. マンション集合住宅の生活音・給排水管水漏れトラブル（5〜11年目、確率18%）
    if (
      y >= 5 &&
      y <= 11 &&
      mansionRoll < 0.18 &&
      !state.triggeredEventIds.includes('mansion-noise-water-trouble')
    ) {
      state.triggeredEventIds.push('mansion-noise-water-trouble');
      state.pendingDecision = {
        id: 'mansion-noise-water-trouble',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【マンション集合住宅の試練】上下階の生活音問題＆配管結露・水漏れ保険対応',
        description:
          '共同住宅であるマンション特有の悩みが到来！階下への生活音への気遣いに加え、洗面所下の専有部配管パッキンから微細な水漏れサインが発見された。どう対処する？',
        statisticalContext:
          '国土交通省「マンション総合調査」：マンション居住者間のトラブル原因第1位は「生活音（約38%）」、次いで「漏水・違法駐車・ペット規約問題」となっている。',
        choices: [
          {
            id: 'soundproof-and-pipe-refresh',
            label: '個人賠償責任保険を確認しつつ、防音二重床マット施工と専有部配管の予防交換を行う（32万円）',
            subLabel: '手元資金 -32万円 / 住戸評価額 +45万円・ご近所ストレス解消でメンタル+6',
            outcomeSummary:
              'プロによる防音マット施工と配管予防交換を実施！階下への漏水事故を未然に防ぎ、毎日の生活音ストレスも消え去った。',
            cashDeltaMan: -32,
            buildingValueBonusMan: 45,
            mentalDelta: 6,
          },
          {
            id: 'minimal-packing-fix',
            label: 'パッキン応急処置（6万円）のみ行い、普段はスリッパ着用と静かな生活で乗り切る',
            subLabel: '手元資金 -6万円 / 常に足音を気にするストレスでメンタル-4',
            outcomeSummary:
              '最小限の修理費で済ませたが、室内で常に足音や物音に気を使う窮屈さが残った。',
            cashDeltaMan: -6,
            mentalDelta: -4,
          },
        ],
      };
      return state;
    }

    // 2. タワマン特有の高速エレベーター・豪華共用施設維持費高騰（タワマンのみ、10〜13年目、確率35%）
    if (
      property.buildingType === 'tower' &&
      y >= 10 &&
      y <= 13 &&
      mansionRoll >= 0.18 &&
      mansionRoll < 0.53 &&
      !state.triggeredEventIds.includes('tower-highrise-elevator')
    ) {
      state.triggeredEventIds.push('tower-highrise-elevator');
      state.pendingDecision = {
        id: 'tower-highrise-elevator',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【タワマン特有の課題】高速エレベーター保守費高騰＆スカイラウンジ・ゲストルーム運営見直し',
        description:
          'タワーマンションならではの豪華共用施設（24時間有人コンシェルジュ・ゲストルーム・高速エレベーター群）の保守更新費がインフレで急騰！管理組合総会で運営方針の採決が行われる。',
        statisticalContext:
          '超高層タワーマンションでは、特殊なゴンドラ足場や高速エレベーター更新費により、一般マンションより修繕コストが約1.4〜1.8倍高くなりやすい。',
        choices: [
          {
            id: 'tower-monetize-amenities',
            label: 'ゲストルーム・パーティールームの利用料改定と夜間無人化で収支を改善する案に賛成',
            subLabel: '毎月の管理修繕費 -0.6万円/月（年7.2万円削減）・タワマン資産価値 +95万円',
            outcomeSummary:
              '受益者負担の適正化により管理組合の財政が健全化！毎月の管理費負担が軽減され、管理良好なタワマンとして市場評価も上がった。',
            repairCostMonthlyDeltaMan: -0.6,
            buildingValueBonusMan: 95,
            mentalDelta: 3,
          },
          {
            id: 'tower-accept-hike',
            label: 'ホテルライクな24時間フルサービスを維持するため、管理費値上げ（+0.8万円/月）を容認する',
            subLabel: '毎月の管理費 +0.8万円/月（年9.6万円増） / タワマン満足度 +5',
            outcomeSummary:
              '毎月の固定費は上がったが、タワマンならではのラグジュアリーな共用サービスをそのまま維持した。',
            repairCostMonthlyDeltaMan: 0.8,
            mentalDelta: 5,
          },
        ],
      };
      return state;
    }

    // 3. マンション専有部のビルトイン設備（ディスポーザー・食洗機・温水床暖房）寿命交換（11〜16年目、確率22%）
    if (
      y >= 11 &&
      y <= 16 &&
      mansionRoll >= 0.53 &&
      mansionRoll < 0.75 &&
      !state.triggeredEventIds.includes('mansion-unit-appliance')
    ) {
      state.triggeredEventIds.push('mansion-unit-appliance');
      state.pendingDecision = {
        id: 'mansion-unit-appliance',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【マンション専有部の寿命】ディスポーザー・ビルトイン食洗機・温水床暖房の同時更新期',
        description:
          '「マンションは修繕積立金を払っているから安心」と思いきや、それは共用部（外壁や廊下）だけ！室内（専有部）のビルトイン食洗機・ディスポーザー・床暖房熱源機が一斉に寿命を迎え、全額自己負担での交換が必要になった。',
        statisticalContext:
          '分譲マンション購入者の盲点となりやすいのが「専有部設備の10〜15年周期の自己負担交換（平均50万〜90万円）」。',
        choices: [
          {
            id: 'mansion-unit-full-replace',
            label: '管理会社推奨の最新省エネ熱源機・食洗機・ディスポーザー一式へ交換する（68万円）',
            subLabel: '手元資金 -68万円 / 専有部資産価値 +60万円・光熱費月-0.2万・幸福度+5',
            outcomeSummary:
              '専有部のビルトイン設備を最新モデルへ一新！静音性と省エネ性能が劇的に向上し、日々の家事効率もアップした。',
            cashDeltaMan: -68,
            buildingValueBonusMan: 60,
            repairCostMonthlyDeltaMan: -0.2,
            mentalDelta: 5,
          },
          {
            id: 'mansion-unit-minimal',
            label: '必須の給湯熱源機のみ交換（32万円）し、壊れた食洗機・ディスポーザーは手洗いで凌ぐ',
            subLabel: '手元資金 -32万円 / 家事負担増でメンタル-3',
            outcomeSummary:
              '32万円で熱源機のみ交換して現金を守ったが、便利なビルトイン設備が使えなくなり少し不便になった。',
            cashDeltaMan: -32,
            mentalDelta: -3,
          },
        ],
      };
      return state;
    }

    // 4. マンション管理組合・理事長就任と修繕積立金滞納・高齢化対策（16〜23年目、確率20%）
    if (
      y >= 16 &&
      y <= 23 &&
      mansionRoll >= 0.75 &&
      mansionRoll < 0.95 &&
      !state.triggeredEventIds.includes('mansion-board-leader')
    ) {
      state.triggeredEventIds.push('mansion-board-leader');
      state.pendingDecision = {
        id: 'mansion-board-leader',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: '【管理組合・輪番理事長】マンションの高齢化と修繕積立金滞納住戸への対応決議',
        description:
          '築年数が進み、今年ついに管理組合の「理事長」が回ってきた！帳簿を確認すると、一部住戸での管理費・修繕積立金の長期滞納と、理事のなり手不足が発覚。どう舵を切るか？',
        statisticalContext:
          '国土交通省「マンション管理計画認定制度」：管理組合の運営体制と滞納回収の有無が、築15年超マンションの資産価値（売却査定額）に直結する時代となっている。',
        choices: [
          {
            id: 'certify-management-plan',
            label: 'マンション管理士を活用して滞納金を回収し、自治体の「管理計画認定マンション」を取得する（諸経費負担 12万円）',
            subLabel: '手元資金 -12万円 / 毎月の管理修繕費 -0.4万円/月・資産価値 +115万円！',
            outcomeSummary:
              '1年間奮闘して滞納問題を解消し「管理計画認定マンション」を取得！フラット35金利優遇対象マンションとなり、自宅の市場価値が115万円跳ね上がった！',
            cashDeltaMan: -12,
            repairCostMonthlyDeltaMan: -0.4,
            buildingValueBonusMan: 115,
            mentalDelta: 5,
          },
          {
            id: 'pass-board-passively',
            label: '波風を立てず管理会社言いなりのまま1年間の任期をやり過ごす',
            subLabel: '出費 0円 / 将来の積立金不足リスクで月額維持費 +0.5万円/月',
            outcomeSummary:
              '面倒な改革を避けて任期を終えたが、未回収コストと委託費増により翌期から管理修繕費が月5,000円値上げされた。',
            repairCostMonthlyDeltaMan: 0.5,
            mentalDelta: -2,
          },
        ],
      };
      return state;
    }
  }

  // (D9) 雇用形態・給与カーブ別のキャリア＆転勤・減収対応イベント（該当条件の世帯にのみ発火）
  if (isCooldownClear) {
    const careerRoll = rng();

    // 1. 急な遠方転勤辞令（全国転勤のある上場企業・公務員 かつ 家族帯同/単身赴任の判断が生じる配偶者あり世帯のみ：5〜13年目）
    if (
      (state.config.employment === 'listed-corp' || state.config.employment === 'civil-servant') &&
      careerEdu.hasSpouse &&
      !state.isDivorced &&
      age < 55 &&
      y >= 5 &&
      y <= 13 &&
      careerRoll < 0.05 &&
      !state.triggeredEventIds.includes('sudden-job-transfer')
    ) {
      state.triggeredEventIds.push('sudden-job-transfer');
      state.pendingDecision = {
        id: 'sudden-job-transfer',
        yearIndex: y,
        age,
        category: 'life',
        title: '【突然の人事異動・転勤辞令】マイホーム購入後の地方・海外赴任命令！どうする？',
        description:
          'マイホームでの生活が軌道に乗った矢先、勤務先から3〜4年間の遠方赴任辞令が下った！家族全員で引っ越して自宅を期間限定賃貸（リロケーション）に出すか、単身赴任か、それとも転職して定住するか？',
        statisticalContext:
          '住宅ローン利用者が転勤になった場合、家族が住み続ければ住宅ローン控除は継続されるが、全員転居して賃貸に出すと原則として控除対象外・銀行への届出が必要となる。',
        choices: [
          {
            id: 'transfer-career-change-stay',
            label: 'マイホームと家族の生活基盤を最優先し、転勤のない同業他社へキャリア転職する',
            subLabel: '転職活動費 -15万円 / 本人年収 +6%アップ・家族一緒で幸福度 +7',
            outcomeSummary:
              'これまでの実績を武器に転勤なしの優良企業へ転職成功！マイホームを手放すことなく、年収も6%アップする最高の転機となった！',
            cashDeltaMan: -15,
            incomeMultiplierDelta: 0.06,
            newJobLabel: '転勤なし優良企業（キャリア転職）',
            mentalDelta: 7,
          },
          {
            id: 'transfer-solo-assign',
            label: '家族はマイホームに残して住宅ローン控除を守り、本人のみ単身赴任する',
            subLabel: '二重生活の初期費用 -55万円 / 住宅ローン控除と子どもの学区を完全維持',
            outcomeSummary:
              '会社の単身赴任手当を受けつつ二重生活を開始。出費は55万円増えたが、家族の暮らしと住宅ローン減税を守り抜いた。',
            cashDeltaMan: -55,
            mentalDelta: -3,
          },
          {
            id: 'transfer-relocation-rent',
            label: '銀行の承認を得て自宅を「リロケーション賃貸」に出し、家賃収入でローンを相殺する',
            subLabel: '家賃差益 +75万円 / 退去時の原状回復で建物価値 -30万円',
            outcomeSummary:
              '赴任期間中、マイホームを法人契約の定期借家に出して家賃収入を獲得！ローン返済を上回る75万円のプラス収支を確保した。',
            cashDeltaMan: 75,
            buildingValueBonusMan: -30,
          },
        ],
      };
      return state;
    }

    // 2. 40代・50代前半の業界再編・AI構造改革とキャリア分岐（38〜52歳、年率4.5%）
    if (
      age >= 38 &&
      age <= 52 &&
      y >= 6 &&
      careerRoll >= 0.05 &&
      careerRoll < 0.095 &&
      !state.triggeredEventIds.includes('career-restructure-chance')
    ) {
      state.triggeredEventIds.push('career-restructure-chance');
      state.pendingDecision = {
        id: 'career-restructure-chance',
        yearIndex: y,
        age,
        category: 'life',
        title: `【${age}歳・キャリアの分岐点】AI構造改革・業界再編の波と年収アップへの挑戦`,
        description:
          '勤務先でAI導入と事業再編が進み、従来のポストや賞与水準が見直されることに。同時に転職エージェントから専門スキルを活かせる好条件オファーが届いた！',
        statisticalContext:
          '40代の住宅ローン返済世帯では、インフレと金利上昇に負けない「人的資本（稼ぐ力）のアップデート」が完済余力を大きく左右する。',
        choices: [
          {
            id: 'accept-headhunt-up',
            label: 'リスキリングで磨いたスキルを活かし、好条件の成長企業へ転職する',
            subLabel: '本人年収 +11%アップ！ / 新環境への適応プレッシャーでメンタル+3',
            outcomeSummary:
              '思い切って成長企業へステップアップ転職！本人年収が11%上昇し、住宅ローンの返済負担率が一気に軽くなった！',
            incomeMultiplierDelta: 0.11,
            newJobLabel: '成長企業・専門職（ステップアップ転職）',
            mentalDelta: 3,
          },
          {
            id: 'stay-and-side-project',
            label: '現職の雇用安定と退職金枠を守りつつ、社外副業・資格手当で手堅く稼ぐ',
            subLabel: '手元資金 +45万円・本人年収 +3% / 堅実維持',
            outcomeSummary:
              '本業の勤続年数を守りながら副業と資格手当で年間収入を補強し、着実にキャッシュを積み増した。',
            cashDeltaMan: 45,
            incomeMultiplierDelta: 0.03,
          },
        ],
      };
      return state;
    }

    // 3. 給与頭打ち・業績減収リスク世帯の「賞与カット・実質賃金低下」への対抗決断（該当給与カーブの世帯のみ：6〜16年目、年率8%）
    if (
      (careerEdu.salaryCurve === 'downward-pressure' ||
        careerEdu.salaryCurve === 'flat-stagnant' ||
        careerEdu.salaryCurve === 'performance-volatile') &&
      age < 56 &&
      y >= 6 &&
      y <= 16 &&
      careerRoll >= 0.095 &&
      careerRoll < 0.175 &&
      !state.triggeredEventIds.includes('salary-decline-response')
    ) {
      state.triggeredEventIds.push('salary-decline-response');
      state.pendingDecision = {
        id: 'salary-decline-response',
        yearIndex: y,
        age,
        category: 'life',
        title: `【給与の壁・減収危機】本業の昇給停滞・賞与減額に対しどう家計を立て直すか？`,
        description: `物価や住宅ローン金利が動く一方で、本業の給与（現在${state.mainIncomeMan}万円）が上がらない・または業績悪化で賞与が削られる厳しい局面に直面！職種転換・副業バイト・家計リストラのどれで突破するか？`,
        statisticalContext:
          '厚生労働省「賃金構造基本統計調査」：業種や企業規模によって40代以降の賃金カーブは二極化しており、減収世帯では副業や職種転換がローン維持の鍵を握る。',
        choices: [
          {
            id: 'pivot-growth-industry',
            label: '成長業界（IT・インフラ・専門職）へ異業種転職し、給与水準そのものを引き上げる',
            subLabel: '本人年収 +12%アップ！ / 職種転換の勉強コスト -20万円',
            outcomeSummary:
              '減収リスクのある環境から思い切って成長分野へ異業種転職！年収が12%回復・上昇し、住宅ローン返済の危機を脱した！',
            cashDeltaMan: -20,
            incomeMultiplierDelta: 0.12,
            newJobLabel: '成長業界・キャリア転職（昇給回復）',
            mentalDelta: 4,
          },
          {
            id: 'weekend-side-arubaito',
            label: '現職を続けながら、週末の副業・スポットアルバイト（配送・実務委託等：年+48万円）で稼ぐ',
            subLabel: '手元資金 +48万円・本人収入 +6%底上げ / 休日減少でメンタル-3',
            outcomeSummary:
              '週末や夜間の時間を活かして副業・アルバイトを稼働！本業の減収分をカバーして余りある年間収入を確保した。',
            cashDeltaMan: 48,
            incomeMultiplierDelta: 0.06,
            newJobLabel: `${EMPLOYMENT_LABELS[state.config.employment]}＋週末副業バイト`,
            mentalDelta: -3,
          },
          {
            id: 'cut-fixed-living-costs',
            label: '見栄を捨てて保険・通信費・娯楽費を徹底的に削り、今の収入の範囲内で黒字化する（+35万円）',
            subLabel: '手元資金 +35万円（固定費削減） / 堅実耐乏',
            outcomeSummary:
              '住宅ローン以外の全固定費を聖域なく見直し、減収下でも貯蓄が減らない筋肉質な家計構造へ作り替えた。',
            cashDeltaMan: 35,
            mentalDelta: 1,
          },
        ],
      };
      return state;
    }

    // (D10) 現実的な確率に基づく自然災害リスク（台風・豪雨浸水 / 大地震）＆ 人生の急な入用イベント（該当世帯条件のみ発火）
    const riskAndExpenseRoll = rng();
    const isDetachedHouse = property.buildingType === 'detached';
    const insPlan = careerEdu.insurancePlan;

    // 1. 線状降水帯・大型台風による水害・風災被災（現実的な年間被災確率：一戸建て1.2%・集合住宅0.6%）
    const waterDisasterProb = isDetachedHouse ? 0.012 : 0.006;
    if (
      y >= 3 &&
      riskAndExpenseRoll < waterDisasterProb &&
      !state.triggeredEventIds.includes('disaster-typhoon-water-risk')
    ) {
      state.triggeredEventIds.push('disaster-typhoon-water-risk');
      const hasWaterCover = insPlan === 'full-fire-earthquake-water';
      const hasStandardWind = insPlan === 'standard-fire-earthquake';

      state.pendingDecision = {
        id: 'disaster-typhoon-water-risk',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: isDetachedHouse
          ? '【自然災害・線状降水帯＆猛烈台風】記録的豪雨による敷地浸水・屋根破損と「火災保険（水災・風災）」審判！'
          : '【自然災害・記録的豪雨＆暴風】ゲリラ豪雨による排水逆流・ベランダ隔て板破損と「火災保険」審判！',
        description: isDetachedHouse
          ? `記録的な線状降水帯と暴風が直撃し、一戸建ての床下・外構への泥水流入と屋根瓦・雨樋の破損が発生（復旧見積もり145万円）！ここで契約中の火災保険「${INSURANCE_PLAN_SPECS[insPlan].shortLabel}」の補償範囲が明暗を分ける！`
          : `記録的なゲリラ豪雨と暴風が直撃し、バルコニー排水口からの雨水逆流による室内水濡れと窓ガラス・隔て板の破損が発生（専有部復旧見積もり85万円）！契約中の「${INSURANCE_PLAN_SPECS[insPlan].shortLabel}」はどこまでカバーできるか？`,
        statisticalContext:
          '国土交通省「水害統計」・損保料率機構データ：近年の気候変動により水災・風災被害は全国で年間数万件発生。火災保険の「水災特約」を外していると床上・床下浸水は補償対象外となる。',
        choices: hasWaterCover
          ? [
              {
                id: 'water-disaster-full-covered',
                label: '【フル補償発動！】火災保険の水災・風災特約で復旧費用を全額カバーし、防水・止水対策も強化する',
                subLabel: '保険金で復旧自己負担 0円！ / 災害見舞金＋予防改修で建物価値 +40万円・安心感 +6',
                outcomeSummary:
                  'フル補償プラン（水災・風災・破損特約付帯）に入っていたおかげで、復旧費用がすべて保険金から支払われ自己負担ゼロで完全復旧！手元資金を1円も減らさずに乗り切った！',
                cashDeltaMan: 0,
                buildingValueBonusMan: 40,
                mentalDelta: 6,
              },
            ]
          : hasStandardWind
            ? [
                {
                  id: 'water-disaster-partial-wind',
                  label: '風災分は保険適用されたが「水災特約なし」のため浸水・排水逆流の復旧費（-68万円）を自己負担する',
                  subLabel: '手元資金 -68万円 / 今後への備えとしてフル補償プランへ切り替える',
                  outcomeSummary:
                    '暴風による破損は火災保険でカバーされたものの、水災特約を外していたため浸水部分の消毒・床張替費用68万円が自己負担となった。今後はフル補償へ見直すことを決意。',
                  cashDeltaMan: -68,
                  newInsurancePlan: 'full-fire-earthquake-water',
                  mentalDelta: -4,
                },
                {
                  id: 'water-disaster-partial-keep',
                  label: '浸水部分の最低限の乾燥・補修（-42万円）のみ自己資金で行い、出費を抑える',
                  subLabel: '手元資金 -42万円 / 湿気残りリスクで建物価値 -35万円・メンタル-5',
                  outcomeSummary:
                    '42万円の最小限補修で済ませたが、水災補償がなかった痛手により湿気ダメージが残り建物評価額が35万円下がった。',
                  cashDeltaMan: -42,
                  buildingValueBonusMan: -35,
                  mentalDelta: -5,
                },
              ]
            : [
                {
                  id: 'water-disaster-uninsured-pay',
                  label: '最小プラン（水災補償なし・免責高額）のため、復旧費用（-125万円）を全額貯蓄から支払う',
                  subLabel: '手元資金 -125万円 / 火災保険をフル補償プランへ緊急格上げ',
                  outcomeSummary:
                    '保険料をケチって最小プランにしていたツケが直撃…。125万円の修理費を全額自己資金から支払い、慌ててフル補償プランへ加入し直した。',
                  cashDeltaMan: -125,
                  newInsurancePlan: 'full-fire-earthquake-water',
                  mentalDelta: -10,
                },
              ],
      };
      return state;
    }

    // 2. 震度6弱〜6強の大地震発生と「地震保険」審判（政府地震調査委員会の30年発生確率に基づく現実的な年率0.55%）
    if (
      y >= 4 &&
      riskAndExpenseRoll >= waterDisasterProb &&
      riskAndExpenseRoll < waterDisasterProb + 0.0055 &&
      !state.triggeredEventIds.includes('disaster-major-earthquake-risk')
    ) {
      state.triggeredEventIds.push('disaster-major-earthquake-risk');
      const hasEarthquakeIns =
        insPlan === 'full-fire-earthquake-water' || insPlan === 'standard-fire-earthquake';

      state.pendingDecision = {
        id: 'disaster-major-earthquake-risk',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: isDetachedHouse
          ? '【巨大地震発生・震度6弱】一戸建ての外壁クラック・基礎ひび割れ・家財損壊と「地震保険」審判！'
          : '【巨大地震発生・震度6弱】共同住宅の室内家具転倒・内装ボード亀裂・ライフライン停止と「地震保険」審判！',
        description: isDetachedHouse
          ? `震度6弱の直下型地震が発生！新耐震・耐震等級のおかげで倒壊は免れたものの、一戸建ての外壁・基礎の一部損壊と室内家財・エコキュートの転倒被害が発生！普通の火災保険では「地震による損害は1円も出ない」が、地震保険の加入状況は！？`
          : `震度6弱の直下型地震が発生！建物の構造躯体は無事だったものの、室内の大型家電・食器棚の損壊と内装壁の亀裂、さらに共用部復旧費が発生！火災保険単体では補償されない地震被害に対し、地震保険の加入状況は！？`,
        statisticalContext:
          '損害保険料率算出機構：地震・噴火・津波による損害は通常の火災保険では免責（補償0円）。地震保険に加入していれば「一部損・小半損・大半損・全損」の認定に応じて非課税の保険金が迅速に支払われる。',
        choices: hasEarthquakeIns
          ? [
              {
                id: 'earthquake-ins-payout-repair',
                label: '【地震保険発動！】地震保険の「小半損・一部損」認定により非課税保険金を受領し、完全補修＋耐震補強を行う',
                subLabel: '地震保険金受領で実質プラス収支（+45万円） / 建物価値 +50万円・安心感 +7',
                outcomeSummary:
                  '地震保険にしっかり加入していたおかげで、損害認定に基づく非課税の地震保険金がスピーディに振り込まれた！補修費用を全額賄った上で手元に45万円の生活再建資金が残り、耐震性も強化された！',
                cashDeltaMan: 45,
                buildingValueBonusMan: 50,
                mentalDelta: 7,
              },
            ]
          : [
              {
                id: 'earthquake-no-ins-self-pay',
                label: '地震保険未加入のため保険金は0円…貯蓄から160万円を取り崩して補修と家財買い直しを行う',
                subLabel: '手元資金 -160万円 / 今後の余震・本震に備えて地震保険付帯プランへ変更',
                outcomeSummary:
                  '「火災保険だけでは地震被害に1円も出ない」という現実を痛感…。160万円を貯蓄から取り崩して修理を行い、直ちに地震保険付帯プランへ切り替えた。',
                cashDeltaMan: -160,
                newInsurancePlan: 'standard-fire-earthquake',
                mentalDelta: -11,
              },
              {
                id: 'earthquake-no-ins-minimal-patch',
                label: '現金流出を抑えるため最低限の片付け（-55万円）のみで済ませ、ひび割れは放置する',
                subLabel: '手元資金 -55万円 / 構造・外装劣化進行で資産価値 -130万円・メンタル-9',
                outcomeSummary:
                  '55万円で最低限の復旧のみ行ったが、地震によるクラックを放置したことで資産価値が130万円下落してしまった。',
                cashDeltaMan: -55,
                buildingValueBonusMan: -130,
                mentalDelta: -9,
              },
            ],
      };
      return state;
    }

    // 3. 子育て世帯の急な入用：子どもの歯列矯正＆部活遠征・PC教材費（8〜14歳の子どもがいる世帯のみ！年率6.5%）
    if (
      state.childrenAges.some((a) => a >= 8 && a <= 14) &&
      y >= 5 &&
      riskAndExpenseRoll >= 0.02 &&
      riskAndExpenseRoll < 0.085 &&
      !state.triggeredEventIds.includes('child-orthodontics-expense')
    ) {
      state.triggeredEventIds.push('child-orthodontics-expense');
      state.pendingDecision = {
        id: 'child-orthodontics-expense',
        yearIndex: y,
        age,
        category: 'education',
        title: '【子育て世帯の急な入用】子どもの小児歯列矯正（85万円）と部活・学習用PC購入の重なり',
        description:
          '学校歯科検診で子どもの歯並び・噛み合わせについて「今のうちに矯正治療（自由診療・約85万円）を始めるのが望ましい」と診断された！さらに部活動の遠征費・ユニフォーム一式・学習用タブレットPCの買い替えが同じ年に重なった！',
        statisticalContext:
          '子育て世帯の家計調査：学費や塾代以外にも「小児歯科矯正（平均70万〜100万円・医療費控除対象）」「部活・習い事遠征費」などのまとまった臨時出費が小中学生期に発生しやすい。',
        choices: [
          {
            id: 'ortho-full-and-tax-deduct',
            label: '子どもの将来のため歯列矯正と部活・PC環境をすべて整え、確定申告で「医療費控除」を申請する（実質 -72万円）',
            subLabel: '手元資金 -72万円（医療費控除還付反映） / 子どもの健康と自己肯定感アップで幸福度 +9',
            outcomeSummary:
              '子どもの健康への一生モノの投資として歯列矯正を開始！発育段階の噛み合わせ治療として医療費控除もきっちり申請し、約13万円の税還付を取り戻した！',
            cashDeltaMan: -72,
            mentalDelta: 9,
          },
          {
            id: 'ortho-dental-loan-split',
            label: '手元資金の急減を防ぐため、無金利分割払いとリユース教材活用で初期出費を -38万円に抑える',
            subLabel: '手元資金 -38万円 / 堅実にやりくりして幸福度 +4',
            outcomeSummary:
              '矯正歯科の無金利分割と先輩からの部活用品お下がりを賢く活用し、一度のキャッシュ流出を38万円に抑えて乗り切った。',
            cashDeltaMan: -38,
            mentalDelta: 4,
          },
        ],
      };
      return state;
    }

    // 4. 人生の急な入用：親族の冠婚葬祭・実家の緊急支援・親の医療介護一時金（38〜64歳、年率4.5%）
    if (
      age >= 38 &&
      age <= 64 &&
      y >= 5 &&
      riskAndExpenseRoll >= 0.085 &&
      riskAndExpenseRoll < 0.13 &&
      !state.triggeredEventIds.includes('sudden-ceremony-family-expense')
    ) {
      state.triggeredEventIds.push('sudden-ceremony-family-expense');
      state.pendingDecision = {
        id: 'sudden-ceremony-family-expense',
        yearIndex: y,
        age,
        category: 'life',
        title: '【人生の急な入用】親の入院・介護住宅改修と親族の冠婚葬祭が重なる臨時支出',
        description:
          '高齢になった親の緊急入院・介護ベッド導入と、親族の法事・冠婚葬祭が同じ時期に重なり、まとまった「入用のお金」が必要になった！住宅ローン返済中の家計からどう捻出するか？',
        statisticalContext:
          '生命保険文化センター調査：40代〜60代では、親の介護初期費用（平均約74万円）や葬儀・法要・慶弔費など、予算外の臨時支出が数年に一度発生する。',
        choices: [
          {
            id: 'use-public-care-insurance',
            label: '公的介護保険の住宅改修補助・高額介護サービス費制度をフル活用し、兄弟姉妹で分担する（自己負担 -38万円）',
            subLabel: '手元資金 -38万円 / 公的制度と家族分担で負担を最小化・メンタル +3',
            outcomeSummary:
              'ケアマネジャーに相談して介護保険の補助金（最大9割支給）と高額療養費制度をフル活用！兄弟姉妹ともしっかり話し合って分担し、38万円の持ち出しで円満に乗り切った。',
            cashDeltaMan: -38,
            mentalDelta: 3,
          },
          {
            id: 'pay-all-alone-generously',
            label: '長男・長女（代表）として自分が全面的に費用を引き受け、手厚く手配する（-92万円）',
            subLabel: '手元資金 -92万円 / 親族からの信頼と感謝でメンタル +6',
            outcomeSummary:
              '92万円を拠出して親の医療介護環境と冠婚葬祭を手厚く整えた。手元貯蓄は減ったが、親孝行と家族の絆を守り抜いた。',
            cashDeltaMan: -92,
            mentalDelta: 6,
          },
        ],
      };
      return state;
    }

    // 5. 成人した子どもの結婚資金援助・初孫誕生のお祝い金（23歳以上の子どもがいる世帯のみ！年率14%）
    if (
      state.childrenAges.some((a) => a >= 23) &&
      riskAndExpenseRoll >= 0.13 &&
      riskAndExpenseRoll < 0.27 &&
      !state.triggeredEventIds.includes('adult-child-marriage-grandchild')
    ) {
      state.triggeredEventIds.push('adult-child-marriage-grandchild');
      state.pendingDecision = {
        id: 'adult-child-marriage-grandchild',
        yearIndex: y,
        age,
        category: 'life',
        title: '【家族の慶事と入用】社会人になった子どもの結婚＆初孫誕生のお祝い・新生活援助',
        description:
          '立派に社会人として独立した子どもから「結婚が決まった（さらに新しい命も授かった）」と嬉しい報告が届いた！親として結婚・出産祝い金をどれくらい包むか、それとも自分たちの老後・住宅ローン完済資金を優先するか？',
        statisticalContext:
          'ゼクシィ結婚トレンド調査：親からの結婚・新生活資金援助の平均額は約150万〜200万円（ご祝儀・出産祝いのみの場合は30万〜50万円）となっている。',
        choices: [
          {
            id: 'gift-generous-marriage-120',
            label: '「結婚・出産資金の非課税贈与」を活用し、新生活と初孫のために120万円を援助する',
            subLabel: '手元資金 -120万円 / 家族の幸福度・人生の満足度 +15！',
            outcomeSummary:
              'マイホームで育て上げた子どもの門出と初孫誕生に120万円を贈呈！週末に孫を連れて自宅へ遊びに来てくれる最高の楽しみが増えた！',
            cashDeltaMan: -120,
            mentalDelta: 15,
          },
          {
            id: 'gift-standard-celebration-40',
            label: '無理のない範囲でご祝儀・出産祝い（40万円）を贈り、自分たちの老後資金もしっかり守る',
            subLabel: '手元資金 -40万円 / 老後資金と幸福度のバランス +9',
            outcomeSummary:
              '気持ちを込めたお祝い金40万円を贈りつつ、自分たちの住宅ローン完済と老後資金も崩さない堅実なバランスを保った！',
            cashDeltaMan: -40,
            mentalDelta: 9,
          },
        ],
      };
      return state;
    }

    // 6. 子どもの入塾・進学塾・夏期講習の選択（10〜14歳の小中学生がいる世帯のみ発火！年率22%）
    if (
      state.childrenAges.some((a) => a >= 10 && a <= 14) &&
      y >= 2 &&
      riskAndExpenseRoll >= 0.27 &&
      riskAndExpenseRoll < 0.49 &&
      !state.triggeredEventIds.includes('child-cram-school-entry')
    ) {
      state.triggeredEventIds.push('child-cram-school-entry');
      state.pendingDecision = {
        id: 'child-cram-school-entry',
        yearIndex: y,
        age,
        category: 'education',
        title: '【子どもの入塾・夏期講習の選択】周囲の通塾ラッシュと「進学塾・季節講習代」の波',
        description:
          'クラスメイトの多くが大手進学塾や個別指導塾に通い始め、子どもからも「友達と同じ塾や夏期講習に通いたい」と相談された！入塾金・毎月の授業料・夏期/冬期講習・模試代を含めると年間30万〜60万円以上の負担増になるが、どう選択する？',
        statisticalContext:
          '文部科学省「子供の学習費調査」：公立中学生の約7割が学習塾に通い、中3受験期には夏期講習・冬期講習・直前特訓で年間塾代が40万〜70万円に達する世帯も多い。',
        choices: [
          {
            id: 'cram-choice-intensive',
            label: '大手進学塾の本科コース＋夏期・冬期・直前特訓講習にフル参加させる（初期・講習費 -42万円）',
            subLabel: '手元資金 -42万円・以降「進学塾・予備校フル活用」方針へ / 学力向上と安心感で幸福度 +7',
            outcomeSummary:
              '子どもの意欲を応援し、大手進学塾の本科コースと季節講習へフル参加させた！出費は大きいが、第一志望校合格に向けて万全の学習環境が整った。',
            cashDeltaMan: -42,
            newCramSchoolPolicy: 'intensive-cram',
            mentalDelta: 7,
          },
          {
            id: 'cram-choice-standard',
            label: '苦手科目（英語・数学）に絞って標準通塾させ、季節講習は必要な講座だけ厳選する（-18万円）',
            subLabel: '手元資金 -18万円・以降「標準通塾」方針へ / 家計と学習効果のバランス +4',
            outcomeSummary:
              '塾の営業トークに流されず、本当に必要な英語・数学の2科目と厳選した講習のみを受講！無理のない予算で着実に成績を伸ばした。',
            cashDeltaMan: -18,
            newCramSchoolPolicy: 'standard-cram',
            mentalDelta: 4,
          },
          {
            id: 'cram-choice-online-self',
            label: '高額な通塾・講習は見送り、月額オンライン学習サービスと市販問題集・学校補習で自走させる（-4万円）',
            subLabel: '手元資金 -4万円・以降「通信教育・自習中心」方針へ（年間教育費を大幅圧縮）',
            outcomeSummary:
              '月数千円のオンライン映像教材とリビング学習で自走する習慣を確立！高額な塾代を節約し、浮いた資金を将来の大学進学費用と住宅ローン返済に温存した。',
            cashDeltaMan: -4,
            newCramSchoolPolicy: 'minimal-self-study',
            mentalDelta: 1,
          },
        ],
      };
      return state;
    }

    // 7. 高校生の大学受験予備校・季節講習の選択（15〜17歳の高校生がいて高卒就職以外の世帯のみ発火！年率24%）
    if (
      state.childrenAges.some((a) => a >= 15 && a <= 17) &&
      careerEdu.higherEdPath !== 'high-school-job' &&
      riskAndExpenseRoll >= 0.49 &&
      riskAndExpenseRoll < 0.73 &&
      !state.triggeredEventIds.includes('child-highschool-yobiko-entry')
    ) {
      state.triggeredEventIds.push('child-highschool-yobiko-entry');
      state.pendingDecision = {
        id: 'child-highschool-yobiko-entry',
        yearIndex: y,
        age,
        category: 'education',
        title: '【高校生の大学受験予備校】大手予備校の通年講座・夏期講習・模試ラッシュ（年60万〜100万円）への決断',
        description:
          '大学受験を見据えた高校生活が本格化！大手予備校や衛星予備校から「通年パック講座＋夏期・冬期講習＋志望校別特訓（一括約68万円）」の提案書が届いた。住宅ローン返済と大学入学金ピークが迫る中、予備校代をどうするか？',
        statisticalContext:
          '現役高校生の大学受験予備校費用は、高2〜高3の2年間で平均80万〜150万円に達し、大学初年度納入金（約100万〜180万円）と重なる「教育費クライマックス」となる。',
        choices: [
          {
            id: 'yobiko-choice-full',
            label: '志望大学合格のため、大手予備校の通年講座＋夏期・冬期直前講習をフル受講させる（-68万円）',
            subLabel: '手元資金 -68万円・高校期の予備校フル活用方針へ / 受験サポート万全で幸福度 +7',
            outcomeSummary:
              '68万円を一括納入し、予備校の通年講座・季節講習・自習室をフル活用！親としてできる限りの受験環境を整えた。',
            cashDeltaMan: -68,
            newCramSchoolPolicy: 'intensive-cram',
            mentalDelta: 7,
          },
          {
            id: 'yobiko-choice-hybrid',
            label: '高校の放課後受験補習と単科講座・オンライン映像授業を組み合わせ、費用を -26万円に抑える',
            subLabel: '手元資金 -26万円・標準通塾方針へ / 賢く抑えて大学初年度費用を温存 +4',
            outcomeSummary:
              '学校の受験補習と予備校の単科受講を賢くハイブリッド活用！予備校代を26万円に抑え、来年の大学入学金に向けたキャッシュを守った。',
            cashDeltaMan: -26,
            newCramSchoolPolicy: 'standard-cram',
            mentalDelta: 4,
          },
          {
            id: 'yobiko-choice-self-scholarship',
            label: '予備校には通わず学校自習室と参考書で受験し、進学後は奨学金も活用して家計を守る（-6万円）',
            subLabel: '手元資金 -6万円・「通信自習＋貸与奨学金」へ切り替え家計破綻を防止',
            outcomeSummary:
              '子どもと家計状況を率直に話し合い、参考書学習と学校の先生への質問で受験に挑むことに。進学後の奨学金予約採用も申し込んだ。',
            cashDeltaMan: -6,
            newCramSchoolPolicy: 'minimal-self-study',
            newScholarshipType: 'jasso-loan',
            mentalDelta: 0,
          },
        ],
      };
      return state;
    }

    // 8. 物価上昇・生活コスト高騰の直撃（累積物価指数が111以上に達した時に発火！年率18%）
    if (
      (state.cumulativePriceIndex ?? 100) >= 111 &&
      y >= 4 &&
      riskAndExpenseRoll >= 0.73 &&
      riskAndExpenseRoll < 0.85 &&
      !state.triggeredEventIds.includes('inflation-living-cost-surge')
    ) {
      state.triggeredEventIds.push('inflation-living-cost-surge');
      const infPct = Math.round((state.cumulativePriceIndex ?? 112) - 100);
      state.pendingDecision = {
        id: 'inflation-living-cost-surge',
        yearIndex: y,
        age,
        category: 'boj-shock',
        title: `【物価上昇・生活コスト高騰の直撃】購入時から物価 +${infPct}%！食費・電気ガス代・日用品の値上げラッシュ`,
        description: `スーパーの食料品、電気・ガス料金、ガソリン、日用品、外食に至るまで値上げが止まらない！マイホーム購入時と比べて物価水準が約 +${infPct}%（指数${(state.cumulativePriceIndex ?? 112).toFixed(1)}）に膨張し、同じ暮らしをしているだけで毎月数万円が余計に消えていく！`,
        statisticalContext:
          '総務省「消費者物価指数（CPI）」・家計調査：年2%前後の物価上昇でも10年で生活コストは約22%上昇し、住宅ローン返済世帯の実質可処分所得を大きく圧迫する。',
        choices: [
          {
            id: 'inflation-eco-window-fix',
            label: '内窓（二重窓）断熱改修・高効率家電導入と通信・保険の固定費大手術で光熱費・生活費を恒久削減（初期 -28万円）',
            subLabel: '手元資金 -28万円 / 毎月の光熱費・維持費が恒久的に ▲0.7万円/月（年8.4万）軽減・建物価値+30万',
            outcomeSummary:
              '国の省エネ補助金も活用して内窓断熱と省エネ化を実施し、さらに通信・サブスク・保険を徹底見直し！物価高に負けない低コスト体質を実現した！',
            cashDeltaMan: -28,
            repairCostMonthlyDeltaMan: -0.7,
            buildingValueBonusMan: 30,
            mentalDelta: 5,
          },
          {
            id: 'inflation-income-boost',
            label: '生活水準は落とさず、昇給・価格転嫁交渉や副業ワークで「インフレを上回る収入増（+6%）」を勝ち取る',
            subLabel: '本人年収 +6%アップ！ / ハードワークでメンタル -2',
            outcomeSummary:
              'インフレ局面をチャンスに変え、本業でのベースアップ・単価交渉と副業収入により年収を6%引き上げて生活コスト上昇を突破した！',
            incomeMultiplierDelta: 0.06,
            mentalDelta: -2,
          },
          {
            id: 'inflation-frugal-staycation',
            label: '外食・旅行レジャーを「節約・おうち時間中心」へ切り替え、PB商品活用で支出を圧縮する（+16万円）',
            subLabel: '手元資金 +16万円・以降「節約・おうち時間」方針へ / 我慢が増えメンタル -4',
            outcomeSummary:
              '外食や遠出のレジャーを控え、プライベートブランド食材と自炊・おうち時間を徹底することでインフレによる支出増を抑え込んだ。',
            cashDeltaMan: 16,
            newLeisureStyle: 'frugal-staycation',
            mentalDelta: -4,
          },
        ],
      };
      return state;
    }

    // 9. 修繕費・建築資材・職人単価の高騰ショック（修繕費インフレ倍率が1.15倍以上に達した時に発火！戸建て/マンション完全分離）
    if (
      (state.repairCostInflationMult ?? 1.0) >= 1.15 &&
      y >= 6 &&
      riskAndExpenseRoll >= 0.85 &&
      riskAndExpenseRoll < 0.93 &&
      !state.triggeredEventIds.includes('repair-material-cost-surge')
    ) {
      state.triggeredEventIds.push('repair-material-cost-surge');
      const repMultPct = Math.round(((state.repairCostInflationMult ?? 1.18) - 1) * 100);
      state.pendingDecision = {
        id: 'repair-material-cost-surge',
        yearIndex: y,
        age,
        category: 'repair-crisis',
        title: isDetachedHouse
          ? `【一戸建て修繕費の高騰】建築資材高・職人不足で外装・設備の修繕単価が購入時比 +${repMultPct}%に急騰！`
          : `【マンション修繕工事費の高騰】建築資材インフレ・職人不足で修繕工事見積が当初計画比 +${repMultPct}%に膨張！`,
        description: isDetachedHouse
          ? `塗料・屋根材・給湯設備のメーカー価格改定と建設業界の人手不足（職人単価上昇）により、一戸建てのメンテナンス相場が購入時より約 +${repMultPct}%（×${(state.repairCostInflationMult ?? 1.18).toFixed(2)}倍）に高騰している！今後の修繕にどう備えるか？`
          : `建設業界の人手不足（2024年問題）と資材・足場代の高騰により、マンションの修繕工事見積もりが当初計画より約 +${repMultPct}%（×${(state.repairCostInflationMult ?? 1.18).toFixed(2)}倍）に上振れし、積立金不足の懸念が浮上した！管理組合としてどう動くか？`,
        statisticalContext:
          '建設物価調査会データ：建築資材価格と建設技能労働者の人件費は近年大幅に上昇しており、戸建てリフォーム費用やマンション修繕工事費は10年前と比べ1.3〜1.6倍に高騰している。',
        choices: isDetachedHouse
          ? [
              {
                id: 'detached-early-pack-contract',
                label: 'さらに単価が上がる前に、地元直施工の工務店と早期メンテナンス契約を結び高耐久部材で予防改修する（-58万円）',
                subLabel: '手元資金 -58万円 / 建物価値 +80万円・将来の大型修繕負担を抑制',
                outcomeSummary:
                  '中間マージンのない地元優良工務店に直発注し、58万円で高耐久シーリング・外装予防メンテを実施！資材高騰リスクを先回りで封じ込めた。',
                cashDeltaMan: -58,
                buildingValueBonusMan: 80,
                mentalDelta: 4,
              },
              {
                id: 'detached-subsidy-diy-save',
                label: '自治体の省エネ・住宅改修補助金を活用しつつ、軽微なメンテナンスはDIYで行って出費を -22万円に抑える',
                subLabel: '手元資金 -22万円 / 建物価値 +30万円・堅実防衛',
                outcomeSummary:
                  '補助金制度の申請と高圧洗浄・木部塗装のDIYを組み合わせ、22万円の最小コストで一戸建てのコンディションを維持した。',
                cashDeltaMan: -22,
                buildingValueBonusMan: 30,
                mentalDelta: 2,
              },
            ]
          : [
              {
                id: 'mansion-competitive-bidding',
                label: '管理会社任せの随意契約をやめ、第三者コンサルを入れて「公募入札（相見積もり）」で工事費高騰を抑え込む',
                subLabel: '一時金徴収を回避・月額 +0.3万円の微増のみ / マンション資産価値 +55万円',
                outcomeSummary:
                  '理事会で公募入札方式を導入し複数の元請け施工会社から相見積もりを取得！資材高騰下でも適正価格での発注に成功し、一時金徴収を回避した！',
                repairCostMonthlyDeltaMan: 0.3,
                buildingValueBonusMan: 55,
                mentalDelta: 5,
              },
              {
                id: 'mansion-accept-hike-and-lump',
                label: '資材高騰を受け入れ、修繕積立金の追加引き上げ（月+0.6万円）と一時金（-32万円）を支払う',
                subLabel: '手元資金 -32万円・毎月維持費 +0.6万円 / 建物価値 +25万円',
                outcomeSummary:
                  '管理会社の提案通り、工事単価の上昇分を一時金32万円と毎月の修繕積立金増額で補填した。',
                cashDeltaMan: -32,
                repairCostMonthlyDeltaMan: 0.6,
                buildingValueBonusMan: 25,
                mentalDelta: -4,
              },
            ],
      };
      return state;
    }

    // 10. 家族旅行・レジャー・娯楽費と物価高のバランス決断（全世帯対象、年率14%）
    if (
      y >= 3 &&
      riskAndExpenseRoll >= 0.93 &&
      !state.triggeredEventIds.includes('family-travel-leisure-crossroad')
    ) {
      state.triggeredEventIds.push('family-travel-leisure-crossroad');
      const hasKidsNow = state.childrenAges.some((a) => a < 18);
      state.pendingDecision = {
        id: 'family-travel-leisure-crossroad',
        yearIndex: y,
        age,
        category: 'life',
        title: hasKidsNow
          ? '【家族旅行・レジャー・娯楽費の選択】宿泊費・テーマパーク高騰下の「子どもとの思い出作り」と家計バランス'
          : '【旅行・リフレッシュ・娯楽費の選択】ホテル代インフレ下の「人生の楽しみ」と住宅ローン返済のバランス',
        description: hasKidsNow
          ? 'インバウンド需要と物価上昇でホテル宿泊費やテーマパークチケット、航空券が大きく値上がりしている！それでも「子どもが親と一緒に旅行してくれる時期は今しかない」と大型連休の旅行を計画するか、それとも住宅ローンと教育費のために娯楽費を抑えるか？'
          : '日々の仕事と住宅ローン返済が続く中、リフレッシュのための国内温泉旅行や趣味・外食を楽しみたいが、宿泊費やレジャー代も以前より大幅に値上がりしている。今後の旅行・娯楽スタイルをどう位置づけるか？',
        statisticalContext:
          '観光庁「旅行・観光消費動向調査」：近年の宿泊料金・交通費・レジャー施設料金の上昇により、家族4人の国内2泊3日旅行費用は平均15万〜35万円へと上昇している。',
        choices: [
          {
            id: 'leisure-active-memories',
            label: hasKidsNow
              ? '「家族の思い出は一生の宝！」毎年しっかり旅行・テーマパーク・体験レジャーを楽しむ（今回旅行 -36万円 / 充実レジャー方針へ）'
              : '人生の充実度を最優先し、毎年しっかり温泉旅行や趣味・グルメを楽しむ（今回旅行 -30万円 / 充実レジャー方針へ）',
            subLabel: `手元資金 ${hasKidsNow ? '-36' : '-30'}万円・以降「毎年旅行・レジャー充実」へ / 家族の幸福度・メンタル +14！`,
            outcomeSummary:
              'プライスレスな思い出とリフレッシュを選択！最高の家族旅行で心身ともにエネルギーが満ち溢れ、仕事と返済へのモチベーションが大きく高まった！',
            cashDeltaMan: hasKidsNow ? -36 : -30,
            newLeisureStyle: 'active-travel',
            mentalDelta: 14,
          },
          {
            id: 'leisure-smart-moderate',
            label: '早期割引・ふるさと納税宿泊券・平日有休や近場グランピングを活用し、賢く年1回の旅行を楽しむ（-15万円 / 標準方針へ）',
            subLabel: '手元資金 -15万円・以降「標準（近場旅行・外食）」へ / 家計と幸福度の好バランス +8',
            outcomeSummary:
              'ピーク期の高値を避けて平日有休とふるさと納税クーポンをフル活用！15万円の予算内で大満足の旅行を実現し、家計の健全性もキープした！',
            cashDeltaMan: -15,
            newLeisureStyle: 'moderate-leisure',
            mentalDelta: 8,
          },
          {
            id: 'leisure-frugal-home-bbq',
            label: '宿泊費高騰の今は遠出を控え、マイホームでの食事会や日帰り公園・キャンプで娯楽費を最小限にする（-4万円 / 節約方針へ）',
            subLabel: '手元資金 -4万円・以降「節約・おうち時間中心」へ（年間レジャー費を大幅節約）',
            outcomeSummary:
              'せっかく買ったマイホームを最大限に楽しむ「おうちリゾート＆日帰りレジャー」へシフト！毎年の旅行・娯楽費を大幅に節約し、貯蓄ペースを加速させた。',
            cashDeltaMan: -4,
            newLeisureStyle: 'frugal-staycation',
            mentalDelta: 2,
          },
        ],
      };
      return state;
    }
  }

  // (D6) どんな家庭でも発生する「ライフステージ変化とマイホーム住み替え（買い替え）」の岐路（11年目または9〜15年目）
  if (
    y === 11 &&
    state.remainingBalanceMan >= 600 &&
    !state.triggeredEventIds.includes('household-relocation-crossroad')
  ) {
    state.triggeredEventIds.push('household-relocation-crossroad');
    const isUnderLoan = state.propertyValueMan >= state.remainingBalanceMan;
    state.pendingDecision = {
      id: 'household-relocation-crossroad',
      yearIndex: y,
      age,
      category: 'life',
      title: `【マイホーム住み替え（買い替え）の岐路】現在の自宅時価 ${state.propertyValueMan.toLocaleString()}万円 / 残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円`,
      description: `入居から11年が経過し、家族の成長・働き方・周囲の住環境の変化とともに「今の家にこのまま住み続けるか、それとも売却して新しい家へ住み替えるか」を検討するタイミングが訪れた！現在、自宅の推定時価は ${state.propertyValueMan.toLocaleString()}万円（${isUnderLoan ? `売却すれば残債を消して含み益が出るアンダーローン状態` : `残債が時価を上回る状態`}）。どう決断する？`,
      statisticalContext:
        '住宅金融支援機構・不動産流通推進センター調査：マイホーム購入者の約3割が10〜15年目を機に「より広い家へのステップアップ住み替え」または「住居費を抑える住み替え」を検討している。',
      choices: [
        {
          id: 'relocate-choice-upgrade',
          label: '今の家を売却し、より広く快適な上位グレード物件へ「ステップアップ住み替え」する！',
          subLabel: '新居へ買い替え（物件価値 +1,150万円・差額と諸費用を新ローンに組入） / 家族の満足度・幸福度 +12',
          outcomeSummary:
            '現在のマイホームを売却し、部屋数と設備がグレードアップした新居へ住み替え完了！家族全員の暮らしやすさと資産価値が一段階レベルアップした！',
          relocatePlan: 'upgrade-wider',
        },
        {
          id: 'relocate-choice-downsize',
          label: '今の家を売却し、価格と維持費が抑えられた住まいへ「コンパクト住み替え」してローン残債を一気に減らす！',
          subLabel: '新居へ買い替え（売却差益でローン残債 約-900万円圧縮・毎月維持費も軽減） / 幸福度 +6',
          outcomeSummary:
            '今の家を高値で売却し、駅近で維持費の安いコンパクトな住まいへ賢く住み替え！売却差額でローン残債を大幅に削り、家計の安全余裕度を劇的に高めた！',
          relocatePlan: 'downsize-compact',
        },
        {
          id: 'relocate-choice-stay',
          label: '住み替えの仲介手数料や引越費用がもったいないので、今の我が家を模様替え（-18万円）して大切に住み続ける',
          subLabel: '住み替えせず現居継続 / 手元資金 -18万円・愛着ある我が家で幸福度 +5',
          outcomeSummary:
            '住み替えに伴う数百万単位の仲介手数料・登記費用を節約し、18万円のインテリア模様替えで今の我が家の快適さをリフレッシュして住み続ける道を選んだ。',
          cashDeltaMan: -18,
          mentalDelta: 5,
        },
      ],
    };
    return state;
  }

  // (D7) 手元キャッシュ潤沢世帯（1,200万円以上）に忍び寄る「余剰キャッシュの罠・投資勧誘・親族介護分担・繰上返済の決断」
  if (
    state.liquidSavingsMan >= 1200 &&
    state.remainingBalanceMan >= 900 &&
    y >= 5 &&
    !state.triggeredEventIds.includes('excess-cash-temptation-trap')
  ) {
    state.triggeredEventIds.push('excess-cash-temptation-trap');
    state.pendingDecision = {
      id: 'excess-cash-temptation-trap',
      yearIndex: y,
      age,
      category: 'life',
      title: `【手元資金 ${Math.round(state.liquidSavingsMan).toLocaleString()}万円の誘惑と罠】潤沢なキャッシュを狙う営業勧誘・親族支援・生活膨張`,
      description: `口座に ${Math.round(state.liquidSavingsMan).toLocaleString()}万円という潤沢な手元資金があることで、銀行や不動産業者から「節税ワンルームマンション投資・高利回り仕組債」の甘い勧誘が届き、同時に親族からは「一番余裕があるから」と親の介護施設一時金や冠婚葬祭の分担増を頼まれ、家族からも高級車・ハイグレード家電への買い替え要望が噴出している！`,
      statisticalContext:
        '金融広報中央委員会・家計行動調査：手元に多額の現預金を置いたまま住宅ローンを残している世帯は、生活水準の緩み（ライフスタイル・クリープ）や不適切な投資勧誘で資産を失うリスクが高い。',
      choices: [
        {
          id: 'excess-cash-smart-prepay',
          label: '「余剰現金があるから誘惑される！」投資勧誘を断り、手元資金から450万円を住宅ローンの元金繰上返済に投入する',
          subLabel: '手元資金 -450万円 → ローン残債 -450万円直接削減！（将来利息の大幅カット＆財布の紐引き締め）',
          outcomeSummary:
            '甘い投資話や贅沢の誘惑をきっぱり断ち切り、450万円を住宅ローンの元金繰上返済へ充当！確実な負債圧縮で将来の利息を消し去り、家計の規律を取り戻した！',
          cashDeltaMan: -450,
          principalDeltaMan: -450,
          mentalDelta: 7,
        },
        {
          id: 'excess-cash-parent-care-and-index',
          label: '親の介護・施設支援と家電更新（-185万円）を堅実に引き受け、残りは低コストインデックス積立で厳格管理する',
          subLabel: '手元資金 -185万円 / 家族・親族の安心確保で幸福度 +6',
          outcomeSummary:
            '怪しい投資営業は門前払いしつつ、親孝行と必要な生活設備更新に185万円を有意義に使い、残りの資産はロックして守りを固めた。',
          cashDeltaMan: -185,
          mentalDelta: 6,
        },
        {
          id: 'excess-cash-luxury-and-pitch',
          label: '「これだけ現金があるなら余裕！」と節税ワンルーム投資の頭金＆ハイグレード車・高級家電購入に踏み切る（-390万円）',
          subLabel: '手元資金 -390万円 / サブリース手数料と維持費でキャッシュ流出・メンタル -4',
          outcomeSummary:
            '手元キャッシュの余裕から財布の紐が緩み、営業マンお勧めの投資物件頭金と高級車買い替えに390万円を支出。しかし想定外の諸費用と空室損で手元資金が大きく目減りしてしまった。',
          cashDeltaMan: -390,
          mentalDelta: -4,
        },
      ],
    };
    return state;
  }

  // (D8) 58歳時点（老後を見据えた「終の棲家への住み替え vs 今の家死守」の岐路：どんな家庭でも選択可能）
  if (
    age === 58 &&
    state.remainingBalanceMan >= 400 &&
    !state.triggeredEventIds.includes('senior-compact-relocation-58')
  ) {
    state.triggeredEventIds.push('senior-compact-relocation-58');
    state.pendingDecision = {
      id: 'senior-compact-relocation-58',
      yearIndex: y,
      age,
      category: 'retirement',
      title: `【58歳・老後の住まいと住み替え決断】定年前に「コンパクト住み替え」で残債を減らすか、今の家を終の棲家にするか？`,
      description: `60歳定年まであと2年！現在まだ住宅ローン残債が ${Math.round(state.remainingBalanceMan).toLocaleString()}万円残っている。老後の階段の上り下りや維持管理・修繕費を見据えて、今のうちに病院・スーパーが近い駅近コンパクト住戸や郊外平屋へ「老後住み替え」して残債を圧縮するか、それとも愛着ある今の家に最後まで住み続けるか？`,
      statisticalContext:
        '高齢期の住み替え調査：50代後半〜60代前半のまだ体力と判断力があるうちに住み替え（ダウンサイジング）を行うことで、老後のローン残債と固定資産税・修繕費を大幅に軽減できる。',
      choices: [
        {
          id: 'senior-relocate-compact',
          label: '今の家を売却し、病院・商業施設が近い「駅近バリアフリー・コンパクト住戸」へ住み替えて残債を大幅圧縮する！',
          subLabel: 'コンパクト住み替え実行（売却差益でローン残債 約-900万円圧縮・毎月の維持費も軽減）',
          outcomeSummary:
            '定年前のベストタイミングで駅近コンパクト住戸への住み替えを断行！売却差益でローン残債を一気に圧縮し、老後の医療・買い物アクセスも万全な終の棲家を確保した！',
          relocatePlan: 'downsize-compact',
        },
        {
          id: 'senior-relocate-suburban',
          label: '今の家を売却し、価格が手頃で穏やかな「郊外・準都心のゆとり平屋/低層住戸」へ住み替えて残債を減らす',
          subLabel: '郊外ゆとり住み替え実行（売却差益でローン残債 約-460万円圧縮・幸福度 +9）',
          outcomeSummary:
            '落ち着いた環境のゆとり住戸へ住み替え！売却差額でローン残債を減らしつつ、家庭菜園や趣味を楽しめる穏やかな老後の拠点を作った。',
          relocatePlan: 'suburban-shift',
        },
        {
          id: 'senior-stay-beloved-home',
          label: '住み替えはせず、長年家族の歴史を刻んできた今のマイホームを「終の棲家」として守り抜く',
          subLabel: '現居継続 / 住み慣れた地域と我が家で幸福度 +6',
          outcomeSummary:
            '「やっぱりこの家が大好きだ」と住み替えを見送り、長年暮らした我が家を最後まで守り抜いて完済を目指す決意を新たにした。',
          mentalDelta: 6,
        },
      ],
    };
    return state;
  }

  // (E) 手元資金ショート寸前の緊急警告イベント（残キャッシュが100万円未満に転落した時）
  if (
    state.liquidSavingsMan < 80 &&
    state.remainingBalanceMan > 500 &&
    !state.triggeredEventIds.includes('liquidity-crisis-warning')
  ) {
    state.triggeredEventIds.push('liquidity-crisis-warning');
    state.pendingDecision = {
      id: 'liquidity-crisis-warning',
      yearIndex: y,
      age,
      category: 'bankruptcy-brink',
      title: '【家計防衛アラート】手元キャッシュが危険水域（残り80万円未満）に突入！',
      description:
        'このまま年間収支の赤字が続くと、口座残高が不足し「住宅ローン延滞 → 期限の利益喪失 → 競売・自己破産」へ直行してしまう！今すぐ緊急の防衛策を講じなければならない。',
      statisticalContext:
        '銀行実務：延滞が始まる前に銀行へ「条件変更（リスケジュール）」を相談すれば、多くのケースで1〜3年間の元金据置や期間延長に応じてもらえる。',
      choices: [
        {
          id: 'request-bank-reschedule',
          label: '銀行の窓口へ駆け込み、3年間の「条件変更（元金返済猶予リスケ）」を申請する',
          subLabel: '3年間は利息のみの支払いに軽減され破産を回避（完済期間は+3年延長）',
          outcomeSummary:
            '銀行が事情を汲み取り、3年間の元金返済猶予（リスケジュール）を承認！毎月の支払いが利息のみに軽減され、資金ショートを間一髪で食い止めた。',
          termDeltaYears: 3,
          mentalDelta: -4,
        },
        {
          id: 'side-hustle-cut-cost',
          label: '副業開始＆保険・通信費・クルマを手放して年間110万円の緊急キャッシュを捻出',
          subLabel: '手元資金 +110万円・本人収入 +40万円/年（メンタル-8）',
          outcomeSummary:
            'マイカー売却と固定費の徹底削減、週末の副業稼働により110万円のキャッシュを確保！背水の陣で返済を継続する。',
          cashDeltaMan: 110,
          incomeMultiplierDelta: 0.08,
          mentalDelta: -8,
        },
        {
          id: 'voluntary-sale-exit',
          label: '競売になる前にマイホームを「任意売却（時価売却）」してローンを精算する',
          subLabel: `自宅を ${state.propertyValueMan.toLocaleString()}万円で売却し残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円と相殺`,
          outcomeSummary:
            '傷が浅いうちにマイホームの売却を決断！競売による買い叩きを回避し、市場価格で売却して賃貸へ住み替えた。',
          sellProperty: true,
        },
      ],
    };
    return state;
  }

  return state;
}

/**
 * 決断イベントの選択結果を反映する
 */
export function resolveMortgageDecision(
  currentState: MortgageGameState,
  choiceId: string,
): MortgageGameState {
  const decision = currentState.pendingDecision;
  if (!decision) return currentState;
  const choice = decision.choices.find((c) => c.id === choiceId) ?? decision.choices[0];
  if (!choice) return currentState;

  let state: MortgageGameState = {
    ...currentState,
    config: { ...currentState.config },
    pendingDecision: null,
    chronicle: [...currentState.chronicle],
  };

  if (choice.sellProperty) {
    return executeSellProperty(state);
  }

  if (typeof choice.cashDeltaMan === 'number') {
    state.liquidSavingsMan = Math.round((state.liquidSavingsMan + choice.cashDeltaMan) * 10) / 10;
  }
  if (typeof choice.principalDeltaMan === 'number') {
    state.remainingBalanceMan = Math.max(
      0,
      Math.round((state.remainingBalanceMan + choice.principalDeltaMan) * 10) / 10,
    );
    if (decision.category === 'health-danshin' && choice.principalDeltaMan < 0) {
      state.danshinTriggered = state.remainingBalanceMan === 0;
    }
  }
  if (typeof choice.incomeMultiplierDelta === 'number') {
    state.mainIncomeMan = Math.max(150, Math.round(state.mainIncomeMan * (1 + choice.incomeMultiplierDelta)));
  }
  if (typeof choice.newMainIncomeAbsoluteMan === 'number') {
    state.mainIncomeMan = Math.max(0, Math.round(choice.newMainIncomeAbsoluteMan));
  }
  if (typeof choice.subIncomeMultiplierDelta === 'number') {
    state.subIncomeMan = Math.max(0, Math.round(state.subIncomeMan * (1 + choice.subIncomeMultiplierDelta)));
    if (choice.subIncomeMultiplierDelta <= -0.99) {
      state.isDivorced = true;
    }
  }
  if (typeof choice.newSubIncomeAbsoluteMan === 'number') {
    state.subIncomeMan = Math.max(0, Math.round(choice.newSubIncomeAbsoluteMan));
  }
  if (choice.newJobLabel) {
    state.currentJobLabel = choice.newJobLabel;
  }
  if (choice.newSpouseJobLabel) {
    state.currentSpouseJobLabel = choice.newSpouseJobLabel;
  }
  if (choice.newJuniorHighPath) {
    state.config.juniorHighPath = choice.newJuniorHighPath;
  }
  if (choice.newHigherEdPath) {
    state.config.higherEdPath = choice.newHigherEdPath;
  }
  if (choice.newCramSchoolPolicy) {
    state.config.cramSchoolPolicy = choice.newCramSchoolPolicy;
  }
  if (choice.newScholarshipType) {
    state.config.scholarshipType = choice.newScholarshipType;
  }
  if (choice.newInsurancePlan) {
    state.config.insurancePlan = choice.newInsurancePlan;
  }
  if (choice.newLeisureStyle) {
    state.config.leisureStyle = choice.newLeisureStyle;
  }
  if (choice.newPostRetirementWork) {
    state.config.postRetirementWork = choice.newPostRetirementWork;
  }
  if (choice.newSpouseWorkPattern) {
    state.config.spouseWorkPattern = choice.newSpouseWorkPattern;
  }
  if (typeof choice.newHasGakushiHoken === 'boolean') {
    state.config.hasGakushiHoken = choice.newHasGakushiHoken;
  }
  if (choice.addNewbornChild) {
    state.childrenAges = [...state.childrenAges, 0];
  }
  if (choice.marrySpouse) {
    state.isDivorced = false;
    if (choice.marrySpouse === 'dual-income') {
      state.config.spouseWorkPattern = 'fulltime-keep';
      state.subIncomeMan = choice.relocatePlan ? 280 : 260;
      state.currentSpouseJobLabel = '結婚パートナー（正社員・共働き）';
    } else {
      state.config.spouseWorkPattern = 'part-time';
      state.subIncomeMan = 115;
      state.currentSpouseJobLabel = '結婚パートナー（パート・アルバイト勤務）';
    }
  }
  if (typeof choice.mentalDelta === 'number') {
    state.mentalScore = Math.max(5, Math.min(100, state.mentalScore + choice.mentalDelta));
  }
  if (typeof choice.repairCostMonthlyDeltaMan === 'number') {
    state.currentMgmtAndRepairMonthlyMan =
      Math.round((state.currentMgmtAndRepairMonthlyMan + choice.repairCostMonthlyDeltaMan) * 10) / 10;
  }
  if (typeof choice.buildingValueBonusMan === 'number') {
    state.buildingValueMan = Math.max(100, state.buildingValueMan + choice.buildingValueBonusMan);
    state.propertyValueMan = state.landValueMan + state.buildingValueMan;
  }
  if (typeof choice.termDeltaYears === 'number' && choice.termDeltaYears > 0) {
    state.termRemainingYears += choice.termDeltaYears;
    state.rescheduleYearsLeft = choice.termDeltaYears;
  }
  if (choice.newRateType) {
    state.currentRateType = choice.newRateType;
    if (choice.newRateType === 'flat-35') {
      state.has5Year125Rule = false;
    }
  }
  if (typeof choice.newBaseRate === 'number') {
    state.appliedInterestRate = choice.newBaseRate;
    state.last5YearRulePaymentMan = calcEqualPaymentMonthlyMan(
      state.remainingBalanceMan,
      state.appliedInterestRate,
      Math.max(1, state.termRemainingYears),
    );
  }
  if (choice.relocatePlan) {
    state = executeRelocateProperty(state, choice.relocatePlan);
  }

  const nextId = (state.chronicle[0]?.id ?? 1) + 1;
  state.chronicle.unshift({
    id: nextId,
    yearIndex: state.yearIndex,
    calendarYear: state.calendarYear,
    age: state.age,
    category: decision.category === 'health-danshin' ? 'danshin' : 'action',
    tone: (choice.principalDeltaMan ?? 0) < 0 || (choice.mentalDelta ?? 0) > 0 ? 'good' : 'mixed',
    title: `【決断】${decision.title} → 「${choice.label}」`,
    body: choice.outcomeSummary,
  });

  // 団信100%発動または住み替え差益で残債0になった場合は即座に完済クリア判定
  if (state.status === 'playing' && state.remainingBalanceMan <= 0 && state.unpaidInterestMan <= 0) {
    state.status = 'cleared';
    const res = evaluateEnding(state, 'paid-off');
    state.ending = res.ending;
    state.score = res.score;
  }

  return state;
}

/**
 * どんな家庭でも実行可能な任意アクション＆イベント処理：マイホームの住み替え（買い替え）
 * 現在の自宅を売却し、売却益・仲介手数料・新居購入諸費用を精算して新居へ住み替える
 */
export function executeRelocateProperty(
  currentState: MortgageGameState,
  planType: RelocationPlanType,
): MortgageGameState {
  if (currentState.status !== 'playing') return currentState;
  const spec = RELOCATION_PLAN_SPECS[planType];
  const property = resolveEffectiveProperty(currentState.config);

  const oldPriceMan = currentState.propertyValueMan;
  const effectivePriceDeltaMan =
    planType === 'upgrade-wider'
      ? Math.max(1150, Math.round(oldPriceMan * 0.24))
      : planType === 'downsize-compact'
        ? -Math.max(1250, Math.round(oldPriceMan * 0.28))
        : -Math.max(750, Math.round(oldPriceMan * 0.18));
  const saleBrokerageFeeMan = Math.round(oldPriceMan * 0.033);
  const targetNewPriceMan = Math.max(1280, Math.round(oldPriceMan + effectivePriceDeltaMan));
  const purchaseClosingFeeMan = Math.round(targetNewPriceMan * 0.035);
  const totalTransactionFeeMan = saleBrokerageFeeMan + purchaseClosingFeeMan;

  // 新居の評価額（土地・建物）を設定
  const nextLandMan = Math.max(450, Math.round(targetNewPriceMan * property.landRatio));
  const nextBuildingMan = Math.max(250, Math.round((targetNewPriceMan - nextLandMan) * 0.94));
  const nextPropertyValueMan = nextLandMan + nextBuildingMan;

  // 旧居売却と新居購入の差額＋諸費用をローン残債または手元資金に反映
  const rawBalanceDeltaMan = effectivePriceDeltaMan + totalTransactionFeeMan;
  let nextSavingsMan = currentState.liquidSavingsMan;
  let nextBalanceMan = currentState.remainingBalanceMan + currentState.unpaidInterestMan + rawBalanceDeltaMan;

  // ステップアップ住み替え時は手元資金に余裕があれば諸費用分（最大250万円）を自己資金から充当
  if (planType === 'upgrade-wider' && nextSavingsMan >= 500) {
    const cashPutMan = Math.min(250, totalTransactionFeeMan);
    nextSavingsMan = Math.round((nextSavingsMan - cashPutMan) * 10) / 10;
    nextBalanceMan -= cashPutMan;
  }

  // コンパクト住み替え等で売却差益が残債を上回った場合は残債0円＋余剰キャッシュが口座へ入る
  if (nextBalanceMan < 0) {
    nextSavingsMan = Math.round((nextSavingsMan + Math.abs(nextBalanceMan)) * 10) / 10;
    nextBalanceMan = 0;
  } else {
    nextBalanceMan = Math.round(nextBalanceMan * 10) / 10;
  }

  const nextMgmtMonthly =
    property.buildingType === 'detached'
      ? Math.max(0, Math.round((currentState.currentMgmtAndRepairMonthlyMan + spec.maintDeltaMonthlyMan * 0.3) * 10) / 10)
      : Math.max(1.2, Math.round((currentState.currentMgmtAndRepairMonthlyMan + spec.maintDeltaMonthlyMan) * 10) / 10);

  const nextMonthlyPayment =
    nextBalanceMan > 0
      ? calcEqualPaymentMonthlyMan(
          nextBalanceMan,
          currentState.appliedInterestRate,
          Math.max(1, currentState.termRemainingYears),
        )
      : 0;

  const nextId = (currentState.chronicle[0]?.id ?? 1) + 1;
  const balanceDiffMan = Math.round(nextBalanceMan - currentState.remainingBalanceMan);

  const nextState: MortgageGameState = {
    ...currentState,
    liquidSavingsMan: nextSavingsMan,
    remainingBalanceMan: nextBalanceMan,
    unpaidInterestMan: 0,
    landValueMan: nextLandMan,
    buildingValueMan: nextBuildingMan,
    propertyValueMan: nextPropertyValueMan,
    currentMgmtAndRepairMonthlyMan: nextMgmtMonthly,
    last5YearRulePaymentMan: nextMonthlyPayment,
    currentHomeLabel: spec.homeLabel,
    relocationCount: (currentState.relocationCount ?? 0) + 1,
    mentalScore: Math.min(100, currentState.mentalScore + spec.mentalBonus),
    chronicle: [
      {
        id: nextId,
        yearIndex: currentState.yearIndex,
        calendarYear: currentState.calendarYear,
        age: currentState.age,
        category: 'milestone',
        tone: 'good',
        title: `【マイホーム住み替え実行！】「${spec.shortLabel}」完了（新居時価 ${nextPropertyValueMan.toLocaleString()}万円 / 新ローン残債 ${nextBalanceMan.toLocaleString()}万円）`,
        body: `これまでの自宅を時価 ${oldPriceMan.toLocaleString()}万円で売却し、売買諸費用（${totalTransactionFeeMan}万円）を精算して「${spec.homeLabel}」へ住み替え完了！ローン残債は ${balanceDiffMan >= 0 ? `+${balanceDiffMan.toLocaleString()}` : `${balanceDiffMan.toLocaleString()}`}万円の ${nextBalanceMan.toLocaleString()}万円となった。`,
        financialDeltaLabel: `新残債 ${nextBalanceMan.toLocaleString()}万`,
      },
      ...currentState.chronicle,
    ],
  };

  if (nextState.remainingBalanceMan <= 0) {
    nextState.status = 'cleared';
    const res = evaluateEnding(nextState, 'paid-off');
    nextState.ending = res.ending;
    nextState.score = res.score;
  }

  return nextState;
}

/**
 * プレイヤーの任意アクション1：一部繰上返済（300万円 または 残債全額）
 */
export function executePrepayment(
  currentState: MortgageGameState,
  amountMan: number,
  mode: 'shorten-term' | 'reduce-payment',
): MortgageGameState {
  if (currentState.status !== 'playing' || currentState.remainingBalanceMan <= 0) {
    return currentState;
  }
  const actualAmount = Math.min(
    amountMan,
    Math.max(0, currentState.liquidSavingsMan - 100), // 最低100万円の生活防衛資金は残す
    currentState.remainingBalanceMan + currentState.unpaidInterestMan,
  );
  if (actualAmount < 50) return currentState;

  let state: MortgageGameState = {
    ...currentState,
    liquidSavingsMan: Math.round((currentState.liquidSavingsMan - actualAmount) * 10) / 10,
    totalPrepaymentMan: Math.round((currentState.totalPrepaymentMan + actualAmount) * 10) / 10,
    chronicle: [...currentState.chronicle],
  };

  let remainingPrepay = actualAmount;
  if (state.unpaidInterestMan > 0) {
    const clearUnpaid = Math.min(state.unpaidInterestMan, remainingPrepay);
    state.unpaidInterestMan = Math.round((state.unpaidInterestMan - clearUnpaid) * 10) / 10;
    remainingPrepay -= clearUnpaid;
  }

  const prevBalance = state.remainingBalanceMan;
  state.remainingBalanceMan = Math.max(0, Math.round((state.remainingBalanceMan - remainingPrepay) * 10) / 10);

  let yearsReduced = 0;
  if (mode === 'shorten-term' && prevBalance > 0 && state.remainingBalanceMan > 0) {
    const ratio = state.remainingBalanceMan / prevBalance;
    const newTerm = Math.max(1, Math.round(state.termRemainingYears * ratio));
    yearsReduced = Math.max(0, state.termRemainingYears - newTerm);
    state.termRemainingYears = newTerm;
  } else if (state.remainingBalanceMan > 0) {
    state.last5YearRulePaymentMan = calcEqualPaymentMonthlyMan(
      state.remainingBalanceMan,
      state.appliedInterestRate,
      Math.max(1, state.termRemainingYears),
    );
  }

  const nextId = (state.chronicle[0]?.id ?? 1) + 1;
  state.chronicle.unshift({
    id: nextId,
    yearIndex: state.yearIndex,
    calendarYear: state.calendarYear,
    age: state.age,
    category: 'action',
    tone: 'good',
    title: `【一部繰上返済を実行】${actualAmount.toLocaleString()}万円を元金へ直接充当（${mode === 'shorten-term' ? `期間短縮型：残り期間 -${yearsReduced}年` : '返済額軽減型：毎月返済額を圧縮'}）`,
    body: `手元資金から${actualAmount.toLocaleString()}万円を繰上返済！すべて元金（および未払利息）の削減に直結し、将来払うはずだった利息が大幅にカットされた。残り残債は ${state.remainingBalanceMan.toLocaleString()}万円。`,
    financialDeltaLabel: `残債 -${actualAmount}万`,
  });

  if (state.remainingBalanceMan <= 0 && state.unpaidInterestMan <= 0) {
    state.status = 'cleared';
    const res = evaluateEnding(state, 'paid-off');
    state.ending = res.ending;
    state.score = res.score;
  }

  return state;
}

/**
 * プレイヤーの任意アクション2：他行への借り換え（全期間固定 または 低金利変動へスイッチ）
 */
export function executeRefinance(
  currentState: MortgageGameState,
  targetType: 'to-fixed' | 'to-net-variable',
): MortgageGameState {
  if (currentState.status !== 'playing' || currentState.remainingBalanceMan <= 300) {
    return currentState;
  }
  const refiFeeMan = Math.max(45, Math.round(currentState.remainingBalanceMan * 0.018));
  if (currentState.liquidSavingsMan < refiFeeMan + 100) {
    return currentState;
  }

  const newRate =
    targetType === 'to-fixed'
      ? Math.round((2.05 + Math.max(0, currentState.bojPolicyRate - 0.75) * 0.35) * 100) / 100
      : Math.max(0.58, Math.round((0.68 + (currentState.bojPolicyRate - 0.75) * 0.9) * 100) / 100);

  const newRateType: RateType = targetType === 'to-fixed' ? 'flat-35' : 'variable';
  const newMonthly = calcEqualPaymentMonthlyMan(
    currentState.remainingBalanceMan,
    newRate,
    Math.max(1, currentState.termRemainingYears),
  );

  const nextId = (currentState.chronicle[0]?.id ?? 1) + 1;
  return {
    ...currentState,
    liquidSavingsMan: Math.round((currentState.liquidSavingsMan - refiFeeMan) * 10) / 10,
    currentRateType: newRateType,
    appliedInterestRate: newRate,
    has5Year125Rule: false,
    last5YearRulePaymentMan: newMonthly,
    chronicle: [
      {
        id: nextId,
        yearIndex: currentState.yearIndex,
        calendarYear: currentState.calendarYear,
        age: currentState.age,
        category: 'action',
        tone: 'mixed',
        title: `【住宅ローン借り換え実行】諸費用 ${refiFeeMan}万円を支払い「${targetType === 'to-fixed' ? `全期間固定 (${newRate}%)` : `ネット銀変動 (${newRate}%)`}」へ借り換え！`,
        body:
          targetType === 'to-fixed'
            ? `今後の日銀利上げリスクを完全に遮断するため、全期間固定金利（${newRate}%）への借り換えを断行！これ以降、完済まで金利上昇の恐怖から解放される。`
            : `より基準金利の低いネット銀行変動プラン（${newRate}%）へ借り換え、毎月の利息負担を圧縮した。`,
        financialDeltaLabel: `手数料 -${refiFeeMan}万`,
      },
      ...currentState.chronicle,
    ],
  };
}

/**
 * プレイヤーの任意アクション3：マイホーム売却・住み替え精算（いつでも実行可能）
 */
export function executeSellProperty(currentState: MortgageGameState): MortgageGameState {
  if (currentState.status !== 'playing') return currentState;

  // 売却仲介手数料（3% + 6万円＋税 ≒ 約3.3%）
  const brokerageFeeMan = Math.round(currentState.propertyValueMan * 0.033);
  const netSaleProceedsMan = currentState.propertyValueMan - brokerageFeeMan;
  const totalDebtMan = currentState.remainingBalanceMan + currentState.unpaidInterestMan;
  const netAfterPayoffMan = Math.round((netSaleProceedsMan - totalDebtMan) * 10) / 10;
  const finalCashMan = Math.round((currentState.liquidSavingsMan + netAfterPayoffMan) * 10) / 10;

  const nextId = (currentState.chronicle[0]?.id ?? 1) + 1;
  const updatedState: MortgageGameState = {
    ...currentState,
    remainingBalanceMan: 0,
    unpaidInterestMan: 0,
    liquidSavingsMan: finalCashMan,
    status: finalCashMan >= 0 ? 'sold-escaped' : 'bankrupt',
    chronicle: [
      {
        id: nextId,
        yearIndex: currentState.yearIndex,
        calendarYear: currentState.calendarYear,
        age: currentState.age,
        category: 'milestone',
        tone: netAfterPayoffMan >= 0 ? 'good' : 'bad',
        title: `【マイホーム売却決断】時価 ${currentState.propertyValueMan.toLocaleString()}万円で売却し、残債 ${Math.round(totalDebtMan).toLocaleString()}万円を一括精算！`,
        body:
          netAfterPayoffMan >= 0
            ? `仲介手数料（${brokerageFeeMan}万円）とローン残債を完済した上で、手元に +${netAfterPayoffMan.toLocaleString()}万円の売却益（手残り）が確定！最終手元資金 ${finalCashMan.toLocaleString()}万円を持って新たな人生へ踏み出した。`
            : `オーバーローンのため売却代金だけでは残債に ${Math.abs(netAfterPayoffMan).toLocaleString()}万円不足！手元貯蓄を取り崩して不足分を補填し、最終手元資金 ${finalCashMan.toLocaleString()}万円となった。`,
        financialDeltaLabel: `売却精算 ${netAfterPayoffMan >= 0 ? '+' : ''}${netAfterPayoffMan}万`,
      },
      ...currentState.chronicle,
    ],
  };

  const res = evaluateEnding(updatedState, finalCashMan >= 0 ? 'sold' : 'bankrupt');
  updatedState.ending = res.ending;
  updatedState.score = res.score;
  return updatedState;
}

/**
 * 今年の重点方針（ライフスタイルモード）を切り替える
 */
export function setFocusMode(
  currentState: MortgageGameState,
  mode: FocusModeId,
): MortgageGameState {
  return {
    ...currentState,
    focusMode: mode,
  };
}

/**
 * 配偶者（奥さん・パートナー）が「今年働くかどうか（正社員・職場復帰 / パート・アルバイト / 専業主婦（夫）・働かない）」を毎年いつでも選択・変更できるアクション
 */
export function setSpouseWorkStyleThisYear(
  currentState: MortgageGameState,
  style: 'fulltime' | 'part-time' | 'homemaker',
): MortgageGameState {
  if (currentState.status !== 'playing') return currentState;
  const careerEdu = resolveEffectiveHouseholdCareerAndEdu(currentState.config);
  if (!careerEdu.hasSpouse || currentState.isDivorced || currentState.age >= 65) {
    return currentState;
  }

  let nextSubIncome = currentState.subIncomeMan;
  let nextSpouseLabel = currentState.currentSpouseJobLabel ?? '配偶者';
  let nextPattern: SpouseWorkPatternType = currentState.config.spouseWorkPattern ?? 'fulltime-keep';
  let actionSummary = '';

  if (style === 'fulltime') {
    nextPattern = 'fulltime-keep';
    nextSubIncome = currentState.subIncomeMan >= 180 ? currentState.subIncomeMan : 260;
    nextSpouseLabel =
      currentState.subIncomeMan === 0
        ? '正社員・フルタイム（専業から職場復帰）'
        : currentState.subIncomeMan < 180
          ? '正社員・フルタイム（パートから転換）'
          : '正社員・フルタイム（共働き）';
    actionSummary = `今年から配偶者が正社員・フルタイム勤務（年収${nextSubIncome}万円）として稼働！世帯の手取りと貯蓄・返済余力が大きく向上した。`;
  } else if (style === 'part-time') {
    nextPattern = 'part-time';
    nextSubIncome = currentState.subIncomeMan >= 85 && currentState.subIncomeMan <= 160 ? currentState.subIncomeMan : 115;
    nextSpouseLabel =
      currentState.subIncomeMan >= 180
        ? 'パート・アルバイト勤務（正社員から転換）'
        : 'パート・アルバイト勤務（週3〜4日）';
    actionSummary = `今年から配偶者が週3〜4日のパート・アルバイト勤務（年収${nextSubIncome}万円）へ変更。家庭のゆとりと副収入を両立する体制に整えた。`;
  } else {
    nextPattern = 'homemaker';
    nextSubIncome = 0;
    nextSpouseLabel = '専業主婦（夫）（働かない・家庭専念）';
    actionSummary = '今年から配偶者は外で働かず専業主婦（夫）（年収0円）として家庭・育児・暮らしに専念する選択をした。';
  }

  const nextId = (currentState.chronicle[0]?.id ?? 1) + 1;
  return {
    ...currentState,
    config: {
      ...currentState.config,
      spouseWorkPattern: nextPattern,
    },
    subIncomeMan: nextSubIncome,
    currentSpouseJobLabel: nextSpouseLabel,
    chronicle: [
      {
        id: nextId,
        yearIndex: currentState.yearIndex,
        calendarYear: currentState.calendarYear,
        age: currentState.age,
        category: 'life',
        tone: style === 'fulltime' ? 'good' : 'neutral',
        title: `【配偶者の今年の働き方変更】「${nextSpouseLabel}（年収${nextSubIncome}万円）」を選択`,
        body: actionSummary,
        financialDeltaLabel: `配偶者年収 ${nextSubIncome}万`,
      },
      ...currentState.chronicle,
    ],
  };
}

/**
 * 60歳定年後の働き方・職種（嘱託再雇用 / 別職種 / アルバイト / 今年で引退・働かない）や「いつまで働くか」を60歳以降毎年いつでも選択・変更できるアクション
 */
export function setPostRetirementWorkThisYear(
  currentState: MortgageGameState,
  workStyle: 'reemploy-same' | 'reemploy-light-job' | 'part-time-arubaito' | 'retire-now',
): MortgageGameState {
  if (currentState.status !== 'playing' || currentState.age < 60) {
    return currentState;
  }

  const isPensionAge = currentState.age >= 65;
  const basePensionMan = isPensionAge
    ? currentState.config.employment === 'freelance'
      ? 150
      : currentState.config.employment === 'civil-servant' || currentState.config.employment === 'listed-corp'
        ? 250
        : 220
    : 0;

  let nextMainIncome = currentState.mainIncomeMan;
  let nextJobLabel = currentState.currentJobLabel ?? '';
  let nextPostRetireConfig: PostRetirementWorkType = 'reemploy-same';
  let summaryBody = '';

  if (workStyle === 'reemploy-same') {
    nextPostRetireConfig = 'reemploy-same';
    nextMainIncome = isPensionAge ? basePensionMan + 180 : Math.max(260, Math.round(currentState.config.mainIncomeMan * 0.62));
    nextJobLabel = isPensionAge
      ? '公的年金受給 ＋ 継続嘱託稼働'
      : '60代・嘱託再雇用（現職継続）';
    summaryBody = `${currentState.age}歳の今年も嘱託・現職継続でしっかり働くことを選択（本人収入 年${nextMainIncome}万円）。`;
  } else if (workStyle === 'reemploy-light-job') {
    nextPostRetireConfig = 'reemploy-light-job';
    nextMainIncome = isPensionAge ? basePensionMan + 150 : 250;
    nextJobLabel = isPensionAge
      ? '公的年金受給 ＋ 別職種シニア実務職'
      : '60代・別職種転身（ビル管理・施設事務）';
    summaryBody = `${currentState.age}歳の今年は責任の軽い別職種（管理・事務・実務職）で働くことを選択（本人収入 年${nextMainIncome}万円）。`;
  } else if (workStyle === 'part-time-arubaito') {
    nextPostRetireConfig = 'part-time-arubaito';
    nextMainIncome = isPensionAge ? basePensionMan + 78 : 140;
    nextJobLabel = isPensionAge
      ? '公的年金受給 ＋ シルバー短時間アルバイト'
      : '60代・週3〜4日アルバイト/パート勤務';
    summaryBody = `${currentState.age}歳の今年は体力を優先し、週3〜4日の短時間アルバイト勤務を選択（本人収入 年${nextMainIncome}万円）。`;
  } else {
    // retire-now: 今年で仕事を辞めて完全引退・働かない
    nextPostRetireConfig = isPensionAge ? 'retire-65-pension-only' : 'full-retire-60';
    nextMainIncome = basePensionMan;
    nextJobLabel = isPensionAge
      ? '公的年金受給のみ（定年後働かない・完全引退）'
      : `${currentState.age}歳で完全リタイア（定年後働かない・無職）`;
    summaryBody = `${currentState.age}歳をもって仕事から完全引退し「これ以降は働かない」ことを選択！（本人収入 年${nextMainIncome}万円${isPensionAge ? '：公的年金のみ' : '：65歳まで勤労収入0円'}）`;
  }

  const nextId = (currentState.chronicle[0]?.id ?? 1) + 1;
  return {
    ...currentState,
    config: {
      ...currentState.config,
      postRetirementWork: nextPostRetireConfig,
    },
    mainIncomeMan: nextMainIncome,
    currentJobLabel: nextJobLabel,
    chronicle: [
      {
        id: nextId,
        yearIndex: currentState.yearIndex,
        calendarYear: currentState.calendarYear,
        age: currentState.age,
        category: 'milestone',
        tone: workStyle === 'retire-now' ? 'mixed' : 'good',
        title: `【${currentState.age}歳・今年の働き方選択】「${nextJobLabel}（年収${nextMainIncome}万円）」へ変更`,
        body: summaryBody,
        financialDeltaLabel: `本人年収 ${nextMainIncome}万`,
      },
      ...currentState.chronicle,
    ],
  };
}

/**
 * 結末の勝因・敗因をわかりやすく3〜4項目で自動診断する
 */
export function analyzeOutcomeFactors(state: MortgageGameState): OutcomeFactor[] {
  const factors: OutcomeFactor[] = [];
  const property = resolveEffectiveProperty(state.config);
  const bank = resolveEffectiveBank(state.config);

  // 1. 金利・利息負担の分析
  const interestRatio =
    state.underwriting.loanPrincipalMan > 0
      ? Math.round((state.totalInterestPaidMan / state.underwriting.loanPrincipalMan) * 100)
      : 0;
  if (state.unpaidInterestMan > 50 || interestRatio >= 35) {
    factors.push({
      type: 'negative',
      title: `金利上昇による利息膨張（借入元本の約${interestRatio}%相当を利息で支払）`,
      detail: `日銀の利上げ局面で適用金利が最大${Math.max(...state.history.map((h) => h.appliedInterestRate), state.appliedInterestRate).toFixed(2)}%まで上昇し、累計${Math.round(state.totalInterestPaidMan).toLocaleString()}万円の利息負担が発生しました。`,
      impactLabel: `総利息 -${Math.round(state.totalInterestPaidMan).toLocaleString()}万円`,
    });
  } else {
    factors.push({
      type: 'positive',
      title: `金利リスクの抑制（累計支払利息 ${Math.round(state.totalInterestPaidMan).toLocaleString()}万円）`,
      detail: `${bank.shortName}・${state.config.repaymentMethod === 'equal-principal' ? '元金均等返済' : '元利均等返済'}の選択と計画的な元金圧縮により、利息負担を元本の約${interestRatio}%に抑え込みました。`,
      impactLabel: `利息比率 ${interestRatio}%`,
    });
  }

  // 2. 住宅ローン控除・繰上返済の分析
  if (state.totalPrepaymentMan >= 200) {
    factors.push({
      type: 'positive',
      title: `機動的な一部繰上返済（累計 ${Math.round(state.totalPrepaymentMan).toLocaleString()}万円を実行）`,
      detail: '余剰資金を元金の直接削減に充てたことで、後半の複利ダメージと返済期間を大幅に短縮できました。',
      impactLabel: `繰上返済 ${Math.round(state.totalPrepaymentMan).toLocaleString()}万円`,
    });
  } else if (state.totalTaxCreditReceivedMan >= 150) {
    factors.push({
      type: 'positive',
      title: `住宅ローン控除（減税還付）のフル活用`,
      detail: `${property.isNew ? '新築13年間' : '中古10年間'}の住宅ローン控除により、累計${Math.round(state.totalTaxCreditReceivedMan).toLocaleString()}万円の税金還付が家計の防衛資金となりました。`,
      impactLabel: `税還付 +${Math.round(state.totalTaxCreditReceivedMan).toLocaleString()}万円`,
    });
  }

  // 3. 物件の資産価値（土地＋建物）と維持費の分析
  const retentionRate = Math.round((state.propertyValueMan / property.priceMan) * 100);
  if (retentionRate >= 72) {
    factors.push({
      type: 'positive',
      title: `マイホームの資産価値維持（購入時の${retentionRate}%・時価${state.propertyValueMan.toLocaleString()}万円）`,
      detail: `${property.shortName}の立地・土地資産価値が底堅く推移し、純資産（バランスシート）の強力な支えとなりました。`,
      impactLabel: `残存価値 ${retentionRate}%`,
    });
  } else {
    factors.push({
      type: 'negative',
      title: `建物減価と維持費負担（累計維持費 ${Math.round(state.totalRunningCostPaidMan).toLocaleString()}万円）`,
      detail: `${property.buildingType === 'detached' ? '固定資産税・外装メンテナンス・光熱費' : '管理費・修繕積立金・固定資産税'}として累計${Math.round(state.totalRunningCostPaidMan).toLocaleString()}万円が発生し、物件時価は購入時の${retentionRate}%（${state.propertyValueMan.toLocaleString()}万円）となりました。`,
      impactLabel: `維持費 -${Math.round(state.totalRunningCostPaidMan).toLocaleString()}万円`,
    });
  }

  // 4. 団信またはライフイベントの分析
  if (state.danshinTriggered) {
    factors.push({
      type: 'positive',
      title: '団体信用生命保険（特約団信）による残債免除発動',
      detail: '健康上の重大な転機に際し、手厚い団信保障が発動して住宅ローン残債が免除され、家族の暮らしを守り抜きました。',
      impactLabel: '団信完済発動',
    });
  } else if (state.isDivorced) {
    factors.push({
      type: 'negative',
      title: 'ペアローン・世帯離別によるキャッシュフロー急減',
      detail: '2馬力前提の返済計画から1馬力へ変化したことで、住居費の返済負担率が跳ね上がりました。',
      impactLabel: '世帯収入減',
    });
  }

  return factors;
}

/**
 * マンション専用 / 一戸建て専用の任意アクション実行
 */
export function executePropertySpecificAction(
  currentState: MortgageGameState,
  actionId:
    | 'mansion-board-reform'
    | 'mansion-release-parking'
    | 'detached-solar-battery'
    | 'detached-diy-maint',
): MortgageGameState {
  if (currentState.status !== 'playing') return currentState;
  if (currentState.triggeredEventIds.includes(`prop-act-${actionId}`)) return currentState;
  const property = resolveEffectiveProperty(currentState.config);
  if (
    (actionId === 'mansion-board-reform' || actionId === 'mansion-release-parking') &&
    property.buildingType === 'detached'
  ) {
    return currentState;
  }
  if (
    (actionId === 'detached-solar-battery' || actionId === 'detached-diy-maint') &&
    property.buildingType !== 'detached'
  ) {
    return currentState;
  }

  const nextId = (currentState.chronicle[0]?.id ?? 1) + 1;
  const nextTriggered = [...currentState.triggeredEventIds, `prop-act-${actionId}`];

  if (actionId === 'mansion-board-reform') {
    return {
      ...currentState,
      triggeredEventIds: nextTriggered,
      currentMgmtAndRepairMonthlyMan: Math.max(
        1.0,
        Math.round((currentState.currentMgmtAndRepairMonthlyMan - 0.5) * 10) / 10,
      ),
      buildingValueMan: currentState.buildingValueMan + 60,
      propertyValueMan: currentState.landValueMan + currentState.buildingValueMan + 60,
      chronicle: [
        {
          id: nextId,
          yearIndex: currentState.yearIndex,
          calendarYear: currentState.calendarYear,
          age: currentState.age,
          category: 'action',
          tone: 'good',
          title: '【マンション理事会改革】管理委託費と共用部電力契約の見直しを実行（月額維持費 ▲0.5万円削減）',
          body: '管理組合の理事会に働きかけ、共用部のLED化と管理委託メニューの最適化を実現！毎月の管理費・修繕費負担が永続的に月5,000円（年6万円）軽くなった。',
          financialDeltaLabel: '維持費 -6万/年',
        },
        ...currentState.chronicle,
      ],
    };
  }

  if (actionId === 'mansion-release-parking') {
    return {
      ...currentState,
      triggeredEventIds: nextTriggered,
      liquidSavingsMan: Math.round((currentState.liquidSavingsMan + 85) * 10) / 10,
      currentMgmtAndRepairMonthlyMan: Math.max(
        1.0,
        Math.round((currentState.currentMgmtAndRepairMonthlyMan - 1.5) * 10) / 10,
      ),
      chronicle: [
        {
          id: nextId,
          yearIndex: currentState.yearIndex,
          calendarYear: currentState.calendarYear,
          age: currentState.age,
          category: 'action',
          tone: 'good',
          title: '【マンション駐車場解約＆カーシェア移行】車両売却 +85万円 ＆ 毎月固定費 ▲1.5万円削減！',
          body: '駅近マンションの立地を活かして自家用車を売却し、機械式駐車場を解約。売却益85万円が手に入り、毎月の駐車場代（年間18万円）がゼロになった！',
          financialDeltaLabel: '手元+85万 / 固定費-18万/年',
        },
        ...currentState.chronicle,
      ],
    };
  }

  if (actionId === 'detached-solar-battery') {
    if (currentState.liquidSavingsMan < 180) return currentState;
    return {
      ...currentState,
      triggeredEventIds: nextTriggered,
      liquidSavingsMan: Math.round((currentState.liquidSavingsMan - 130) * 10) / 10,
      currentMgmtAndRepairMonthlyMan:
        Math.round((currentState.currentMgmtAndRepairMonthlyMan - 1.3) * 10) / 10,
      buildingValueMan: currentState.buildingValueMan + 100,
      propertyValueMan: currentState.landValueMan + currentState.buildingValueMan + 100,
      chronicle: [
        {
          id: nextId,
          yearIndex: currentState.yearIndex,
          calendarYear: currentState.calendarYear,
          age: currentState.age,
          category: 'action',
          tone: 'good',
          title: '【一戸建て太陽光＋蓄電池設置】自己負担130万円で毎月の光熱費・売電収支が月1.3万円改善！',
          body: '戸建ての屋根をフル活用し、太陽光パネルと定置型蓄電池を設置！毎月の電気代が激減し、年間約15.6万円のキャッシュフロー改善と資産価値アップを達成した。',
          financialDeltaLabel: '光熱費 -15.6万/年',
        },
        ...currentState.chronicle,
      ],
    };
  }

  // detached-diy-maint
  if (currentState.liquidSavingsMan < 80) return currentState;
  return {
    ...currentState,
    triggeredEventIds: nextTriggered,
    liquidSavingsMan: Math.round((currentState.liquidSavingsMan - 35) * 10) / 10,
    buildingValueMan: currentState.buildingValueMan + 75,
    propertyValueMan: currentState.landValueMan + currentState.buildingValueMan + 75,
    chronicle: [
      {
        id: nextId,
        yearIndex: currentState.yearIndex,
        calendarYear: currentState.calendarYear,
        age: currentState.age,
        category: 'action',
        tone: 'good',
        title: '【一戸建て予防メンテナンス】防蟻処理・外壁シーリング補修を実施（35万円・建物価値+75万円維持）',
        body: '雨漏りやシロアリ被害が出る前に35万円で予防メンテナンスを実施！将来の高額修繕リスクを抑え、建物の資産価値を守り抜いた。',
        financialDeltaLabel: '建物価値 +75万',
      },
      ...currentState.chronicle,
    ],
  };
}

/**
 * 返済途中に「日銀の緊急利上げ（途中利上げストレステスト）」を発生させる
 */
export function executeMidTermRateHike(
  currentState: MortgageGameState,
  hikeDelta = 0.5,
): MortgageGameState {
  if (currentState.status !== 'playing') return currentState;
  const bank = resolveEffectiveBank(currentState.config);
  const danshin = resolveEffectiveDanshin(currentState.config);

  const nextBoj = Math.min(4.5, Math.round((currentState.bojPolicyRate + hikeDelta) * 100) / 100);
  const prevApplied = currentState.appliedInterestRate;
  let nextApplied = prevApplied;

  if (currentState.currentRateType === 'variable') {
    nextApplied = Math.max(
      0.45,
      Math.round((bank.baseRate + danshin.spreadRate + (nextBoj - 0.75) * 0.95) * 100) / 100,
    );
  } else if (currentState.currentRateType === 'mix') {
    const fixedRatioPct = Math.max(
      10,
      Math.min(90, Math.round(currentState.config.mixFixedRatioPercent ?? 50)),
    );
    const varShare = (100 - fixedRatioPct) / 100;
    nextApplied = Math.max(
      0.75,
      Math.round((bank.baseRate + danshin.spreadRate + (nextBoj - 0.75) * 0.96 * varShare) * 100) / 100,
    );
  } else if (currentState.currentRateType === 'fixed-10' && currentState.yearIndex >= 10) {
    nextApplied = Math.round((prevApplied + hikeDelta * 0.75) * 100) / 100;
  }

  const nextMonthly =
    currentState.currentRateType === 'flat-35' || currentState.has5Year125Rule
      ? currentState.last5YearRulePaymentMan
      : calcEqualPaymentMonthlyMan(
          currentState.remainingBalanceMan,
          nextApplied,
          Math.max(1, currentState.termRemainingYears),
        );

  const nextId = (currentState.chronicle[0]?.id ?? 1) + 1;
  return {
    ...currentState,
    bojPolicyRate: nextBoj,
    appliedInterestRate: nextApplied,
    last5YearRulePaymentMan: nextMonthly,
    chronicle: [
      {
        id: nextId,
        yearIndex: currentState.yearIndex,
        calendarYear: currentState.calendarYear,
        age: currentState.age,
        category: 'rate-revision',
        tone: currentState.currentRateType === 'flat-35' ? 'good' : 'bad',
        title:
          currentState.currentRateType === 'flat-35'
            ? `【途中利上げ発生（政策金利 +${hikeDelta.toFixed(2)}% → ${nextBoj.toFixed(2)}%）】全期間固定のため適用金利 ${nextApplied.toFixed(2)}% で影響ゼロ！`
            : `【途中利上げ発生！】日銀政策金利が ${nextBoj.toFixed(2)}% へ上昇（適用金利 ${prevApplied.toFixed(2)}% → ${nextApplied.toFixed(2)}%）`,
        body:
          currentState.currentRateType === 'flat-35'
            ? '市場金利は上昇したが、全期間固定金利契約のため毎月の返済額・利息は一切変わらない。固定金利の防波堤効果が発揮された！'
            : currentState.has5Year125Rule
              ? `途中利上げにより適用金利が ${nextApplied.toFixed(2)}% に上昇！5年ルール期間中は毎月引落額こそ据え置かれるが、内訳の利息が急増し、5年目の改定時または未払利息として跳ね返ってくる！`
              : `途中利上げにより適用金利が ${nextApplied.toFixed(2)}% に上昇し、毎月返済額が即座に ${nextMonthly.toFixed(1)}万円/月 へ引き上げられた！`,
        financialDeltaLabel: `適用金利 ${nextApplied.toFixed(2)}%`,
      },
      ...currentState.chronicle,
    ],
  };
}
