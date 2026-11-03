import {
  BankId,
  BankSpec,
  ChronicleEntry,
  ContractType,
  DanshinSpec,
  DanshinType,
  EmploymentType,
  FamilyPlanType,
  HouseholdArchetype,
  LoanTermYears,
  MacroRegimeId,
  MortgageDecisionEvent,
  MortgageEnding,
  MortgageGameState,
  MortgageSetupConfig,
  PropertyCategory,
  PropertySpec,
  RateType,
  RepaymentMethod,
  UnderwritingResult,
  YearlySnapshot,
} from '@/types/mortgage';

export const ARCHETYPES: HouseholdArchetype[] = [
  {
    id: 'power-couple-tower',
    title: '都心IT×商社 パワーカップル世帯',
    subtitle: '32歳・上場企業共働き（世帯年収 1,380万円）',
    percentileLabel: '日本の住宅購入世帯の上位 6.8%（首都圏タワマン層）',
    age: 32,
    employment: 'listed-corp',
    mainIncomeMan: 820,
    subIncomeMan: 560,
    initialSavingsMan: 1450,
    hasCreditBlemish: false,
    recommendedContract: 'pair',
    recommendedFamily: 'child-1-private',
    recommendedProperty: 'tower-mansion-new',
    description:
      '夫婦ともに高収入でペアローンフル活用＆W住宅ローン控除を狙う現代の象徴的パワーカップル。ただし片方の休職・離婚・中学受験課金・タワマン修繕費高騰が重なると一気に綱渡りに。',
  },
  {
    id: 'steady-couple-station',
    title: '首都圏・堅実共働きメーカー世帯',
    subtitle: '34歳・正社員×正社員（世帯年収 920万円）',
    percentileLabel: '日本の分譲マンション購入世帯の中央値上位（上位 22.4%）',
    age: 34,
    employment: 'listed-corp',
    mainIncomeMan: 580,
    subIncomeMan: 340,
    initialSavingsMan: 950,
    hasCreditBlemish: false,
    recommendedContract: 'pair',
    recommendedFamily: 'child-2-public',
    recommendedProperty: 'station-mansion-new',
    description:
      '長期優良認定の駅近マンションをペアローンで購入する王道モデル。子ども2人の教育費ピーク（48〜54歳）と変動金利上昇をどう乗り切るかが勝負。',
  },
  {
    id: 'young-50yr-challenger',
    title: '28歳・50年超長期ローン背伸びマイホーム世帯',
    subtitle: '28歳・若手会社員＋パート（世帯年収 610万円）',
    percentileLabel: '20代住宅購入層の急増トレンド（50年ローン選択率 約24%）',
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
    id: 'civil-servant-single',
    title: '地方公務員・単独ローン安定世帯',
    subtitle: '31歳・公務員単独（世帯年収 580万円）',
    percentileLabel: '日本の戸建て購入世帯の代表的ボリュームゾーン（上位 46.0%）',
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
      '銀行審査の信用力は抜群でリストラリスクもほぼゼロ。ただし1馬力のためインフレ局面での実質賃金目減りや郊外地価の下落（オーバーローン化）に注意が必要。',
  },
  {
    id: 'late-30s-family-late-loan',
    title: '39歳・晩婚子育てスタート＆74歳完済世帯',
    subtitle: '39歳・中堅管理職×時短勤務（世帯年収 840万円）',
    percentileLabel: '第1子誕生を機に30代後半で購入する層（約 29.5%）',
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
    id: 'freelance-creator',
    title: '36歳・フリーランス＆個人事業主世帯',
    subtitle: '36歳・ITフリーランス×会社員（世帯年収 960万円）',
    percentileLabel: '確定申告3期分で審査に挑む自営業層（全体の約 11.2%）',
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
];

export const PROPERTIES: Record<PropertyCategory, PropertySpec> = {
  'tower-mansion-new': {
    id: 'tower-mansion-new',
    name: '湾岸・都心タワーマンション高層階（新築・長期優良）',
    shortName: '都心新築タワマン',
    buildingType: 'tower',
    isNew: true,
    builtAge: 0,
    locationLabel: '都心湾岸エリア・駅徒歩3分（38階）',
    priceMan: 8480,
    landRatio: 0.22,
    energyCert: 'long-term-excellent',
    initialMgmtFeeMonthlyMan: 2.9,
    initialRepairFeeMonthlyMan: 1.9,
    parkingMonthlyMan: 3.2,
    annualPropertyTaxMan: 28,
    landAnnualTrendRate: 0.012,
    utilityMonthlyDiffMan: -0.3,
    description:
      '圧倒的な眺望と共用施設、高い資産流動性を誇る都心タワマン。長期優良住宅認定で住宅ローン控除枠は最大級。',
    riskNote:
      '【タワマンの罠】初期の修繕積立金は安く設定されているが、6年目・12年目・18年目の段階増額で月5万円超へ急騰し、大規模修繕時には一時金徴収リスクがある。',
  },
  'station-mansion-new': {
    id: 'station-mansion-new',
    name: '人気急行停車駅・新築分譲マンション（長期優良）',
    shortName: '駅近新築マンション',
    buildingType: 'mansion',
    isNew: true,
    builtAge: 0,
    locationLabel: '都市近郊・急行停車駅 徒歩6分',
    priceMan: 6180,
    landRatio: 0.32,
    energyCert: 'long-term-excellent',
    initialMgmtFeeMonthlyMan: 1.8,
    initialRepairFeeMonthlyMan: 1.3,
    parkingMonthlyMan: 1.8,
    annualPropertyTaxMan: 21,
    landAnnualTrendRate: 0.004,
    utilityMonthlyDiffMan: -0.4,
    description:
      '通勤利便性と資産価値のバランスに優れた王道ファミリーマンション。長期優良住宅認定で子育て世帯なら最大5,000万円まで0.7%×13年の税額控除対象。',
    riskNote:
      '修繕積立金は5年ごとに段階的に引き上げられる長期修繕計画となっており、管理費・駐車場・固定資産税を含めた実質住居費の管理が重要。',
  },
  'suburban-mansion-used': {
    id: 'suburban-mansion-used',
    name: '準都心・築20年リノベ済み中古マンション（ZEH断熱改修）',
    shortName: '築20年中古マンション',
    buildingType: 'mansion',
    isNew: false,
    builtAge: 20,
    locationLabel: '準都心エリア・駅徒歩8分',
    priceMan: 3880,
    landRatio: 0.38,
    energyCert: 'zeh',
    initialMgmtFeeMonthlyMan: 1.6,
    initialRepairFeeMonthlyMan: 2.6,
    parkingMonthlyMan: 1.5,
    annualPropertyTaxMan: 14,
    landAnnualTrendRate: -0.002,
    utilityMonthlyDiffMan: -0.2,
    description:
      '新築より2,000万円以上安く購入でき、建物価格の初期下落が落ち着いている賢い選択肢。',
    riskNote:
      '【中古マンションの注意点】住宅ローン控除期間は10年（借入限度額3,000万円）に短縮され、すでに修繕積立金が高めなほか、築30〜35年目に給排水管更生工事イベントが到来する。',
  },
  'detached-custom-new': {
    id: 'detached-custom-new',
    name: '都市近郊・新築注文住宅一戸建て（長期優良・太陽光ZEH）',
    shortName: '新築注文一戸建て',
    buildingType: 'detached',
    isNew: true,
    builtAge: 0,
    locationLabel: '都市近郊・閑静な第一種低層住居専用地域',
    priceMan: 5680,
    landRatio: 0.52,
    energyCert: 'long-term-excellent',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 18,
    landAnnualTrendRate: 0.001,
    utilityMonthlyDiffMan: -1.1,
    description:
      '管理費・駐車場代が一生0円！太陽光発電＋高気密高断熱で毎月の光熱費も約1.1万円削減でき、資産の半分以上が「土地」として残る。',
    riskNote:
      '【戸建ての自己責任】マンションのような強制積立がない代わり、12〜15年ごとに外壁塗装・屋根防水・シロアリ防除・エコキュート交換（計160〜220万円）が自己負担で発生する。',
  },
  'detached-powerbuilder-new': {
    id: 'detached-powerbuilder-new',
    name: '郊外ニュータウン・新築建売一戸建て（一般省エネ）',
    shortName: '郊外新築建売戸建て',
    buildingType: 'detached',
    isNew: true,
    builtAge: 0,
    locationLabel: '郊外ベッドタウン・バス12分（カースペース2台付）',
    priceMan: 4180,
    landRatio: 0.45,
    energyCert: 'standard',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 14,
    landAnnualTrendRate: -0.016,
    utilityMonthlyDiffMan: 0.2,
    description:
      '4,000万円台前半で4LDK＋駐車場2台が手に入るコスパ抜群のパワービルダー建売住宅。月々の返済負担率を低く抑えられる。',
    riskNote:
      '【郊外バス便の罠】少子高齢化で郊外ニュータウンの路線価が年率-1.6%ペースで下落しやすく、10〜15年後に売却しようとしても買い手がつきにくい（オーバーローンリスク）。',
  },
  'detached-used': {
    id: 'detached-used',
    name: '郊外・築26年木造中古一戸建て（旧省エネ基準）',
    shortName: '築26年中古戸建て',
    buildingType: 'detached',
    isNew: false,
    builtAge: 26,
    locationLabel: '郊外住宅街・駅徒歩14分',
    priceMan: 2580,
    landRatio: 0.74,
    energyCert: 'non-compliant',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 9,
    landAnnualTrendRate: -0.012,
    utilityMonthlyDiffMan: 0.9,
    description:
      '物件価格の約74%が土地値のため、これ以上の資産価値下落が小さく、借入額を最小限に抑えて早期完済を狙える。',
    riskNote:
      '【旧基準中古の罠】省エネ基準未満のため住宅ローン控除は少なく、断熱性が低いため冬・夏の光熱費が高い。入居後の水回り改修・耐震補強・雨漏り修繕費に備える必要がある。',
  },
  'regional-mansion-new': {
    id: 'regional-mansion-new',
    name: '地方中核都市・駅直結新築マンション（ZEH省エネ）',
    shortName: '地方駅直結マンション',
    buildingType: 'mansion',
    isNew: true,
    builtAge: 0,
    locationLabel: '地方政令指定都市・ターミナル駅徒歩4分',
    priceMan: 4380,
    landRatio: 0.28,
    energyCert: 'zeh',
    initialMgmtFeeMonthlyMan: 1.5,
    initialRepairFeeMonthlyMan: 1.2,
    parkingMonthlyMan: 1.1,
    annualPropertyTaxMan: 16,
    landAnnualTrendRate: 0.0,
    utilityMonthlyDiffMan: -0.5,
    description:
      '地方中核都市のランドマークマンション。無理のない価格帯でZEH水準の断熱性と高い生活利便性を両立。',
    riskNote:
      '段階的な修繕積立金の増額と、機械式駐車場の維持更新費が将来的に管理組合の議題となりやすい。',
  },
  'luxury-penthouse-new': {
    id: 'luxury-penthouse-new',
    name: '都心一等地・プレミアムタワー最上階（新築・長期優良）',
    shortName: '都心1.15億タワマン',
    buildingType: 'tower',
    isNew: true,
    builtAge: 0,
    locationLabel: '港区・都心3区エリア 駅徒歩2分',
    priceMan: 11500,
    landRatio: 0.26,
    energyCert: 'long-term-excellent',
    initialMgmtFeeMonthlyMan: 3.8,
    initialRepairFeeMonthlyMan: 2.5,
    parkingMonthlyMan: 4.2,
    annualPropertyTaxMan: 38,
    landAnnualTrendRate: 0.018,
    utilityMonthlyDiffMan: -0.2,
    description:
      '都心一等地の1億円超えプレミアム物件。インフレ局面では海外マネー流入で値上がり益（キャピタルゲイン）も狙える最高峰物件。',
    riskNote:
      'ペアローンで限度額ギリギリまで借りると、金利が1.5%上がっただけで年間返済額が120万円以上急増するハイリスク・ハイリターン領域。',
  },
};

export const BANKS: Record<BankId, BankSpec> = {
  'net-bank': {
    id: 'net-bank',
    name: 'あおぞらダイレクトネット銀行',
    shortName: 'ネット銀行(変動0.38%)',
    categoryLabel: 'ネット専業・超低金利（5年/125%ルールなし）',
    rateType: 'variable',
    baseRate: 0.38,
    screeningRate: 3.3,
    maxDtiPercent: 35,
    supports50Years: true,
    has5Year125Rule: false,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 1,
    description:
      '日本最低水準の変動金利0.38%！日銀が利上げしなければ最強だが、5年ルール・125%ルールがないため利上げ時は半年ごとに返済額が直撃上昇する。本審査も厳格。',
    badgeText: '最安金利 / 5年ルールなし',
  },
  'mega-bank': {
    id: 'mega-bank',
    name: 'メトロポリタン第一銀行（メガバンク）',
    shortName: 'メガバンク(変動0.52%)',
    categoryLabel: '都市銀行・王道変動（5年ルール・125%ルール付）',
    rateType: 'variable',
    baseRate: 0.525,
    screeningRate: 3.2,
    maxDtiPercent: 35,
    supports50Years: false,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 3,
    description:
      '5年ルール・125%ルール完備の王道メガバンク。利上げが起きても5年間は毎月返済額が変わらないが、急激な利上げ時には裏で「未払利息」が蓄積する罠も。',
    badgeText: '5年・125%ルール有 / 35年迄',
  },
  'regional-bank': {
    id: 'regional-bank',
    name: 'ふるさと共栄地方銀行',
    shortName: '地方銀行(50年対応0.72%)',
    categoryLabel: '地方銀行・柔軟審査＆50年ローン積極対応',
    rateType: 'variable',
    baseRate: 0.725,
    screeningRate: 3.0,
    maxDtiPercent: 38,
    supports50Years: true,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 3,
    description:
      '50年超長期ローンや個人事業主・転職直後・高倍率ローンにも柔軟に対応する地銀。初期金利はネット銀より少し高いが、困窮時のリスケ相談に最も親身。',
    badgeText: '審査柔軟 / 50年ローン対応',
  },
  'flat35-agency': {
    id: 'flat35-agency',
    name: '住宅金融支援公庫【フラット35S / 全期間固定】',
    shortName: 'フラット35(全期間固定)',
    categoryLabel: '全期間完全固定金利（子育て・長期優良優遇あり）',
    rateType: 'flat-35',
    baseRate: 1.86,
    screeningRate: 1.86,
    maxDtiPercent: 35,
    supports50Years: false,
    has5Year125Rule: false,
    upfrontFeeRate: 0.011,
    rescheduleFlexibility: 2,
    description:
      '借入時から完済まで35年間、世界情勢や日銀利上げがどうなろうと金利と返済額が1円も上がらない絶対防衛ライン！長期優良・子育て世帯は当初5年間▲0.5%優遇！',
    badgeText: '金利上昇リスク完全ゼロ',
  },
  'neo-mix-bank': {
    id: 'neo-mix-bank',
    name: 'ネオ・トラスト信託銀行【変動50%＋固定50%ミックス】',
    shortName: '信託ミックス(1.10%)',
    categoryLabel: '変動金利と全期間固定の50:50ハイブリッド契約',
    rateType: 'mix',
    baseRate: 1.1,
    screeningRate: 2.6,
    maxDtiPercent: 36,
    supports50Years: true,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 2,
    description:
      '借入額の半分を変動金利、残り半分を固定金利で組むリスク分散プラン。日銀利上げ時のダメージを半分に抑えつつ、全期間固定よりも初期返済額を軽減できる。',
    badgeText: '変動＋固定 50:50分散',
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
    name: '標準シナリオ：日銀の段階的利上げ＆マイルドインフレ',
    subtitle: '政策金利 0.25% → 1.75% へ段階上昇 / 賃金も年+1.8%成長',
    description:
      '日銀が数年に一度利上げを実施し、変動金利が0.5%台から2.0%台へと緩やかに上昇する現実的な標準シナリオ。春闘による賃上げも一定程度追随する。',
  },
  'stagflation-shock': {
    id: 'stagflation-shock',
    name: 'ハードシナリオ：円安180円＆悪性スタグフレーション',
    subtitle: '輸入物価急騰で日銀が緊急利上げ（変動金利3.2%突破）・実質賃金停滞',
    description:
      '世界的インフレと歴史的円安が直撃！物価と修繕費と金利だけが跳ね上がり、会社の賞与や昇給が追いつかない住宅ローン最大の試練モード。',
  },
  'asset-bubble': {
    id: 'asset-bubble',
    name: 'バブルシナリオ：AI好景気＆都心マンション価格高騰',
    subtitle: '金利も上がるが年収・株価・都心不動産価格も大幅上昇',
    description:
      '金利は上昇するものの、昇給と不動産価格の上昇がそれを上回る好景気シナリオ。都心物件や注文住宅は「含み益（アンダーローン）」が拡大しやすい。',
  },
  'deflation-return': {
    id: 'deflation-return',
    name: 'デフレ回帰シナリオ：世界金融危機＆ゼロ金利長期化',
    subtitle: '変動金利は超低水準を維持するが、賞与カット・地価下落が進行',
    description:
      '世界的リセッションにより日銀が利上げを凍結。変動金利組は金利面で勝利するが、会社の業績悪化（ボーナス半減）と郊外物件の資産価値下落が襲いかかる。',
  },
  'dynamic-random': {
    id: 'dynamic-random',
    name: '1in8b カオス世界情勢（毎年ランダムに世界情勢・日銀総裁方針が変動）',
    subtitle: '何が起きるか予測不能なドキュメンタリー・リアルモード',
    description:
      '好景気、パンデミック、資源ショック、金融緩和、緊急利上げが歴史のサイコロによって動的に発生する1in8b.lifeスタイルの完全予測不能モード。',
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
 * 銀行本審査シミュレーション
 */
export function runBankUnderwriting(config: MortgageSetupConfig): UnderwritingResult {
  const property = PROPERTIES[config.propertyId];
  const bank = BANKS[config.bankId];
  const danshin = DANSHIN_PLANS[config.danshin];
  const family = FAMILY_PLANS[config.familyPlan];
  const isChildHousehold = family.childrenCount > 0;

  // 諸費用計算（銀行融資事務手数料 + 登記・司法書士・印紙税 + 火災地震保険10年 + 引越家具）
  const rawLoanNeeded = Math.max(500, property.priceMan - config.downPaymentMan);
  const bankFeeMan = Math.round(rawLoanNeeded * bank.upfrontFeeRate);
  const registrationAndTaxMan = Math.round(property.priceMan * 0.025);
  const insuranceAndMovingMan = property.buildingType === 'detached' ? 115 : 95;
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

  // 完済予定年齢
  const effectiveTermYears: LoanTermYears =
    config.termYears === 50 && !bank.supports50Years ? 35 : config.termYears;
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

  const bonusRatio = config.bonusRepaymentRatio || 0;
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

  if (config.termYears === 50 && !bank.supports50Years) {
    warnings.push(
      `${bank.name}は50年超長期ローン非対応のため、35年ローン（完済${config.age + 35}歳）として審査されました。`,
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
 * 1in8bスタイル：「1,300万世帯分の1」統計確率にもとづくランダム世帯ガチャ生成
 */
export function generateRandomHouseholdSetup(rng: () => number = Math.random): MortgageSetupConfig {
  const arch = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)] ?? ARCHETYPES[0];
  const banks: BankId[] = ['net-bank', 'mega-bank', 'regional-bank', 'flat35-agency', 'neo-mix-bank'];
  // 日本の実態統計：変動金利が約74%、固定・ミックスが約26%
  const rollBank = rng();
  const bankId: BankId =
    rollBank < 0.36
      ? 'net-bank'
      : rollBank < 0.68
        ? 'mega-bank'
        : rollBank < 0.8
          ? 'regional-bank'
          : rollBank < 0.92
            ? 'flat35-agency'
            : 'neo-mix-bank';

  const termRoll = rng();
  const termYears: LoanTermYears =
    arch.id === 'young-50yr-challenger' || (termRoll < 0.25 && BANKS[bankId].supports50Years)
      ? 50
      : termRoll > 0.9
        ? 25
        : 35;

  const repaymentMethod: RepaymentMethod = rng() < 0.88 ? 'equal-payment' : 'equal-principal';
  const bonusRepaymentRatio = rng() < 0.3 ? 0.2 : 0;

  const danshinRoll = rng();
  const danshin: DanshinType =
    danshinRoll < 0.35
      ? 'basic'
      : danshinRoll < 0.65
        ? 'cancer-50'
        : danshinRoll < 0.88
          ? 'three-major-100'
          : 'all-disease-pair';

  const regimes: MacroRegimeId[] = [
    'gradual-hike',
    'stagflation-shock',
    'asset-bubble',
    'deflation-return',
    'dynamic-random',
  ];
  const macroRegime = regimes[Math.floor(rng() * regimes.length)] ?? 'dynamic-random';

  const prop = PROPERTIES[arch.recommendedProperty];
  const maxSafeDown = Math.max(0, arch.initialSavingsMan - 350);
  const downPaymentMan =
    rng() < 0.4
      ? 0 // 40%は頭金ゼロのフルローン
      : Math.min(maxSafeDown, Math.round((prop.priceMan * 0.1) / 50) * 50);

  return {
    archetypeId: arch.id,
    age: arch.age,
    employment: arch.employment,
    mainIncomeMan: arch.mainIncomeMan,
    subIncomeMan: arch.subIncomeMan,
    initialSavingsMan: arch.initialSavingsMan,
    downPaymentMan,
    hasCreditBlemish: arch.hasCreditBlemish,
    contractType: arch.recommendedContract,
    familyPlan: arch.recommendedFamily,
    propertyId: arch.recommendedProperty,
    bankId,
    termYears,
    repaymentMethod,
    bonusRepaymentRatio,
    danshin,
    macroRegime,
  };
}

/**
 * ゲーム初期状態の生成（融資実行・鍵引き渡し時点）
 */
export function createMortgageGame(config: MortgageSetupConfig): MortgageGameState {
  const bank = BANKS[config.bankId];
  const property = PROPERTIES[config.propertyId];
  const family = FAMILY_PLANS[config.familyPlan];
  const effectiveTermYears: LoanTermYears =
    config.termYears === 50 && !bank.supports50Years ? 35 : config.termYears;
  const normalizedConfig: MortgageSetupConfig = {
    ...config,
    termYears: effectiveTermYears,
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

  const initialChronicle: ChronicleEntry = {
    id: 1,
    yearIndex: 0,
    calendarYear: 2026,
    age: normalizedConfig.age,
    category: 'milestone',
    tone: 'neutral',
    title: `【融資実行・鍵引き渡し】借入 ${underwriting.loanPrincipalMan.toLocaleString()}万円（${effectiveTermYears}年ローン・${bank.shortName}）`,
    body: `${property.name}（物件価格 ${property.priceMan.toLocaleString()}万円）の引渡しが完了。頭金 ${normalizedConfig.downPaymentMan}万円・諸費用 ${underwriting.closingCostsMan}万円を精算し、手元キャッシュ ${underwriting.cashRemainingAfterPurchaseMan}万円で${effectiveTermYears}年間の返済サバイバルが始まった。`,
    statNote: `完済予定年齢：${underwriting.maturityAge}歳 / 実質住居費（管理費・税金込）：月${underwriting.initialTotalMonthlyOutflowMan}万円`,
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
    bojPolicyRate: 0.25,
    appliedInterestRate: underwriting.effectiveInitialRate,
    last5YearRulePaymentMan: initialMonthlyBase,
    yearsSinceLast5YearRevision: 0,
    currentRateType: bank.rateType,
    has5Year125Rule: bank.has5Year125Rule,
    mainIncomeMan: normalizedConfig.mainIncomeMan,
    subIncomeMan: normalizedConfig.contractType === 'single' ? 0 : normalizedConfig.subIncomeMan,
    currentMgmtAndRepairMonthlyMan:
      property.initialMgmtFeeMonthlyMan +
      property.initialRepairFeeMonthlyMan +
      property.parkingMonthlyMan,
    mentalScore: 82,
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
 * 子ども1人あたりの年間教育費(万円)を年齢と公立/私立ルートから算出
 */
function calcChildAnnualEduCostMan(childAge: number, isPrivate: boolean): number {
  if (childAge < 3) return 24;
  if (childAge < 6) return isPrivate ? 48 : 30; // 幼稚園・保育園
  if (childAge < 10) return isPrivate ? 55 : 32; // 小学校低学年
  if (childAge < 12) return isPrivate ? 125 : 42; // 小4〜小6（中学受験SAPIX等の塾代ピーク！）
  if (childAge < 15) return isPrivate ? 140 : 52; // 中学校
  if (childAge < 18) return isPrivate ? 135 : 62; // 高校
  if (childAge < 22) return isPrivate ? 175 : 115; // 大学4年間（学費＋仕送り等）
  return 0; // 22歳で独立
}

/**
 * 結末・エンディング判定とスコア計算
 */
export function evaluateEnding(
  state: MortgageGameState,
  reason: 'paid-off' | 'sold' | 'bankrupt' | 'divorce-deadlock',
): { ending: MortgageEnding; score: number } {
  const netEquity = Math.round(
    state.liquidSavingsMan + state.propertyValueMan - state.remainingBalanceMan - state.unpaidInterestMan,
  );

  if (reason === 'bankrupt') {
    return {
      ending: {
        id: 'foreclosure-bankruptcy',
        rank: 'BANKRUPT',
        title: '【住宅ローン破産】期限の利益喪失・競売＆自己破産',
        subtitle: `${state.age}歳（返済${state.yearIndex}年目）で資金ショート・代位弁済`,
        epilogue:
          '度重なる金利上昇、修繕積立金・教育費の重圧、そして手元キャッシュの枯渇により6ヶ月間の延滞が発生。保証会社による代位弁済が行われ、マイホームは競売にかけられた。売却代金でも残債を消しきれず、苦渋の自己破産手続きへと進んだ。',
        statisticComparison:
          '日本の住宅ローン利用者のうち、条件変更（リスケ）や任意売却・代位弁済に至るケースは景気変動期に年間数万件規模で発生する。',
      },
      score: Math.max(100, state.yearIndex * 35),
    };
  }

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

  if (reason === 'sold') {
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
    return {
      ending: {
        id: 'narrow-escape-sale',
        rank: 'B',
        title: '【任意売却・ソフトランディング】競売寸前でマイホームを手放し生還',
        subtitle: `${state.age}歳で自宅を売却精算・手元資金 ${state.liquidSavingsMan.toLocaleString()}万円で再出発`,
        epilogue:
          'このまま返済を続ければ破産するという瀬戸際で、プライドを捨てて自宅の売却を決断。自己資金の持ち出しで残債を完済し、賃貸住宅へ移り住むことで最悪の自己破産を回避した。',
        statisticComparison:
          '競売（市場価格の6〜7割で強制処分）になる前に任意売却・住み替えを決断できた世帯は、その後の生活再建率が大幅に高い。',
      },
      score: 1650 + Math.round(state.liquidSavingsMan * 0.3) + state.mentalScore * 8,
    };
  }

  // 完済到達 (paid-off)
  if (state.danshinTriggered && netEquity >= 4500) {
    return {
      ending: {
        id: 'danshin-miracle-payoff',
        rank: 'A',
        title: '【団信発動・残債ゼロの奇跡】手厚い保障が家族と資産を守り抜いた',
        subtitle: `団信により残債免除完済・最終純資産 ${netEquity.toLocaleString()}万円`,
        epilogue:
          '人生の途中で大病に見舞われたものの、契約時に選んでいた団体信用生命保険（団信）が発動し、数千万円のローン残債が一瞬でゼロに！住居費負担が消滅したことで治療と家族の生活に専念でき、豊かな老後資産を築き上げた。',
        statisticComparison:
          '住宅ローン返済期間（35〜50年）の間にがんや3大疾病に罹患する確率は40代後半以降で急上昇し、特約団信が家計の命綱となるケースは多い。',
      },
      score: 3100 + Math.round(netEquity * 0.25) + state.mentalScore * 10,
    };
  }

  if (netEquity >= 7500 && state.liquidSavingsMan >= 3000) {
    return {
      ending: {
        id: 'legendary-asset-master',
        rank: 'S',
        title: '【伝説の住宅ローン勝者】完全完済＆純資産7,500万円超の黄金老後！',
        subtitle: `${state.age}歳で完済達成・最終純資産 ${netEquity.toLocaleString()}万円（金融資産 ${state.liquidSavingsMan.toLocaleString()}万円）`,
        epilogue:
          '金利変動、修繕費高騰、教育費ピークのすべてを完璧な資金計画と住宅ローン控除・資産価値維持で乗り切った！無借金のマイホームと潤沢な老後資金を両手に、1,300万世帯の頂点に立つハッピーエンド。',
        statisticComparison:
          '日本の住宅ローン完済世帯のうち、完済時点で金融資産3,000万円以上＋無借金マイホームを両立できるのは上位約8.5%のエリート家計。',
      },
      score: 3800 + Math.round(netEquity * 0.3) + state.mentalScore * 12,
    };
  }

  if (state.liquidSavingsMan >= 1500 && state.age <= 72) {
    return {
      ending: {
        id: 'steady-happy-payoff',
        rank: 'A',
        title: '【堅実マイホーム完済】嵐を乗り越え、安心の我が家と老後資金を確保',
        subtitle: `${state.age}歳で完済・最終純資産 ${netEquity.toLocaleString()}万円（手元資金 ${state.liquidSavingsMan.toLocaleString()}万円）`,
        epilogue:
          '日銀の利上げや教育費の波に揺られながらも、堅実な繰上返済と家計防衛でついに「抵当権抹消登記」の日を迎えた。ここからは家賃もローンもいらない自分の城で、穏やかなセカンドライフが始まる。',
        statisticComparison:
          '日本の住宅ローン利用者の理想モデル。定年前後に完済し老後資金1,500万円以上を残せた世帯は老後破産リスクが極めて低い。',
      },
      score: 2800 + Math.round(netEquity * 0.25) + state.mentalScore * 10,
    };
  }

  if (state.age >= 76 || state.config.termYears === 50) {
    return {
      ending: {
        id: 'ultra-long-80s-survivor',
        rank: 'C',
        title: '【80歳前後の執念完済】超長期ローンの果てに辿り着いた抵当権抹消',
        subtitle: `${state.age}歳で完済・手元老後資金 ${state.liquidSavingsMan.toLocaleString()}万円`,
        epilogue:
          '年金生活に入ってからも毎月続いた住宅ローン引き落とし。退職金の大半を注ぎ込み、シルバー人材として働き続けながら、ついに70代後半〜80代で完済を果たした。家は守ったが、老後の現預金はギリギリの戦いに。',
        statisticComparison:
          '近年急増している50年ローンや30代後半以降の35年ローンでは、65歳定年後の15年間をどう生き抜くかが最大の課題となる。',
      },
      score: 1850 + Math.round(netEquity * 0.2) + state.mentalScore * 8,
    };
  }

  return {
    ending: {
      id: 'barely-paid-off-house-poor',
      rank: 'B',
      title: '【ギリギリ完済・ハウスプア生還】退職金を投入し、なんとか我が死守',
      subtitle: `${state.age}歳で完済・手元資金 ${state.liquidSavingsMan.toLocaleString()}万円 / 自宅時価 ${state.propertyValueMan.toLocaleString()}万円`,
      epilogue:
        '長年にわたる利息と維持費の支払いで手元の預貯金は大きく削られたものの、延滞破産することなく最後までローンを返しきった。必要であれば今後リバースモーゲージや住み替えで老後資金を補える状態だ。',
      statisticComparison:
        '日本のマイホーム世帯でよく見られる「資産は家だけ（ハウスプア）」状態だが、無借金の住居があることは老後の大きなセーフティネットとなる。',
    },
    score: 2100 + Math.round(netEquity * 0.2) + state.mentalScore * 8,
  };
}

/**
 * 1年進行エンジン（1in8bスタイルの年代記・マクロ経済・償却・ライフイベント処理）
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

  const property = PROPERTIES[state.config.propertyId];
  const bank = BANKS[state.config.bankId];
  const danshin = DANSHIN_PLANS[state.config.danshin];
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

  // === 1. マクロ経済・日銀政策金利・インフレ率の動的更新 ===
  let inflationRate = 0.015;
  let wageGrowthRate = 0.012;
  let bojDelta = 0;

  if (state.config.macroRegime === 'gradual-hike') {
    inflationRate = 0.018;
    wageGrowthRate = 0.016;
    if (y === 2 || y === 5 || y === 9 || y === 14) {
      bojDelta = 0.35;
    }
  } else if (state.config.macroRegime === 'stagflation-shock') {
    inflationRate = 0.032;
    wageGrowthRate = 0.006;
    if (y === 2 || y === 4 || y === 7 || y === 11 || y === 15) {
      bojDelta = 0.55;
    }
  } else if (state.config.macroRegime === 'asset-bubble') {
    inflationRate = 0.025;
    wageGrowthRate = 0.028;
    if (y === 3 || y === 6 || y === 10 || y === 15) {
      bojDelta = 0.4;
    }
  } else if (state.config.macroRegime === 'deflation-return') {
    inflationRate = -0.003;
    wageGrowthRate = -0.004;
    if (y === 3) {
      bojDelta = -0.15;
    }
  } else {
    // dynamic-random (1in8b カオス世界情勢)
    const macroRoll = rng();
    if (macroRoll < 0.22) {
      bojDelta = 0.4;
      inflationRate = 0.028;
      wageGrowthRate = 0.012;
    } else if (macroRoll < 0.35) {
      bojDelta = -0.2;
      inflationRate = 0.004;
      wageGrowthRate = 0.005;
    } else {
      inflationRate = 0.016;
      wageGrowthRate = 0.015;
    }
  }

  state.bojPolicyRate = Math.max(0.0, Math.min(4.25, Math.round((state.bojPolicyRate + bojDelta) * 100) / 100));

  // 金利タイプに応じた適用金利の更新
  const prevAppliedRate = state.appliedInterestRate;
  if (state.currentRateType === 'variable') {
    const targetVarRate = Math.max(
      0.35,
      Math.round((bank.baseRate + danshin.spreadRate + (state.bojPolicyRate - 0.25) * 0.95) * 1000) / 1000,
    );
    state.appliedInterestRate = targetVarRate;
  } else if (state.currentRateType === 'mix') {
    const targetMixRate = Math.max(
      0.85,
      Math.round((bank.baseRate + danshin.spreadRate + (state.bojPolicyRate - 0.25) * 0.48) * 1000) / 1000,
    );
    state.appliedInterestRate = targetMixRate;
  } else if (state.currentRateType === 'fixed-10' && y === 11) {
    // 10年固定終了後の金利再設定ショック
    const post10Rate = Math.round((1.55 + danshin.spreadRate + state.bojPolicyRate * 0.8) * 100) / 100;
    state.appliedInterestRate = post10Rate;
    pushEntry(
      'rate-revision',
      'bad',
      `【10年固定特約期間終了】11年目より適用金利が ${prevAppliedRate}% → ${post10Rate}% へ改定`,
      '当初10年間の固定金利優遇期間が満了し、基準金利からの引下げ幅が縮小。今月から新金利での返済が始まる。',
      '当初10年固定プラン利用者が11年目に直面する「段階金利ステップアップ」現象。',
    );
  } else if (state.currentRateType === 'flat-35' && y === 6) {
    // フラット35Sの当初5年▲0.45%優遇終了
    const normalFlatRate = Math.round((bank.baseRate + danshin.spreadRate) * 100) / 100;
    if (state.appliedInterestRate < normalFlatRate) {
      state.appliedInterestRate = normalFlatRate;
      pushEntry(
        'rate-revision',
        'neutral',
        `【フラット35S 当初優遇期間満了】6年目より本則固定金利 ${normalFlatRate}% へ移行`,
        '長期優良・子育てプラスによる当初5年間の金利引き下げ期間が終了。今後は完済まで完全に一定の固定金利となる。',
      );
    }
  }

  if (bojDelta >= 0.35 && state.currentRateType !== 'flat-35') {
    pushEntry(
      'macro',
      'bad',
      `【日銀利上げ決定】政策金利 ${state.bojPolicyRate}% へ上昇（適用金利 ${prevAppliedRate}% → ${state.appliedInterestRate}%）`,
      state.has5Year125Rule
        ? '短期プライムレートが引き上げられた。5年ルールにより毎月の引き落とし額はすぐには変わらないが、返済額に占める「利息の割合」が急増し、元金の減りが鈍化する！'
        : '5年ルールがないネット銀行契約のため、翌月から毎月の返済引き落とし額が即座に増額改定された！',
      '変動金利を選択した日本の約74%の世帯が最も注視する金融政策決定会合の瞬間。',
    );
  }

  // === 2. 年収・役職定年・定年再雇用の更新 ===
  if (age < 55) {
    if (state.config.employment === 'civil-servant') {
      state.mainIncomeMan = Math.round(state.mainIncomeMan * 1.015);
    } else {
      state.mainIncomeMan = Math.round(state.mainIncomeMan * (1 + wageGrowthRate));
    }
    if (state.subIncomeMan > 0 && !state.isDivorced) {
      state.subIncomeMan = Math.round(state.subIncomeMan * (1 + wageGrowthRate * 0.8));
    }
  } else if (age === 55 && state.config.employment !== 'freelance') {
    state.mainIncomeMan = Math.round(state.mainIncomeMan * 0.78);
    pushEntry(
      'life',
      'bad',
      `【55歳・役職定年】管理職手当が外れ、本人年収が ${state.mainIncomeMan}万円（▲22%）に減少`,
      '日本企業特有の「55歳役職定年」が到来。子どもの大学費用や住宅ローン返済が続く中での手取り減少が家計を圧迫し始める。',
      '50代後半の住宅ローン破綻原因の第2位が「役職定年・定年再雇用による収入崖」。',
      '本人年収 -22%',
    );
  } else if (age === 60) {
    const retirementAllowanceMan =
      state.config.employment === 'listed-corp'
        ? 1850
        : state.config.employment === 'civil-servant'
          ? 2100
          : state.config.employment === 'sme'
            ? 850
            : 400;
    state.liquidSavingsMan += retirementAllowanceMan;
    state.mainIncomeMan = Math.round(state.mainIncomeMan * 0.62);
    if (state.subIncomeMan > 0) {
      state.subIncomeMan = Math.round(state.subIncomeMan * 0.6);
    }
    pushEntry(
      'milestone',
      'mixed',
      `【60歳・定年退職＆再雇用】退職金 +${retirementAllowanceMan.toLocaleString()}万円受領 / 再雇用で収入4割減`,
      `定年を迎え退職金 ${retirementAllowanceMan.toLocaleString()}万円が振り込まれた。一方、嘱託再雇用により世帯年収は大きく減少。残債（${Math.round(state.remainingBalanceMan)}万円）を一括返済するか老後資金として温存するかが問われる。`,
      '60歳時点で住宅ローン残債がある世帯の割合は年々上昇し、退職金枯渇の主因となっている。',
      `退職金 +${retirementAllowanceMan}万`,
    );
  } else if (age === 65) {
    // 年金生活へ移行
    state.mainIncomeMan = state.config.employment === 'freelance' ? 160 : 250;
    state.subIncomeMan = state.subIncomeMan > 0 && !state.isDivorced ? 110 : 0;
    pushEntry(
      'milestone',
      'mixed',
      `【65歳・完全リタイア＆年金生活突入】世帯年金収入 年${state.mainIncomeMan + state.subIncomeMan}万円へ`,
      state.remainingBalanceMan > 0
        ? `65歳を迎え公的年金受給生活に入ったが、まだ住宅ローン残債が ${Math.round(state.remainingBalanceMan).toLocaleString()}万円残っている！貯蓄を取り崩しながらの老後返済が続く。`
        : 'すでに住宅ローンを完済しているため、年金収入の範囲内で穏やかな老後生活を送ることができる！',
    );
  }

  // === 3. マンション修繕積立金の段階増額 / 戸建てメンテナンス ===
  if (property.buildingType !== 'detached' && (y === 6 || y === 12 || y === 18 || y === 25)) {
    const hikeMan = property.buildingType === 'tower' ? 1.4 : 0.85;
    state.currentMgmtAndRepairMonthlyMan =
      Math.round((state.currentMgmtAndRepairMonthlyMan + hikeMan) * 10) / 10;
    pushEntry(
      'property',
      'bad',
      `【管理組合総会・修繕積立金値上げ】月額維持費が +${hikeMan}万円/月（計 ${state.currentMgmtAndRepairMonthlyMan}万円/月）に増額`,
      property.buildingType === 'tower'
        ? 'タワーマンションの段階増額計画＋建築資材・人件費高騰により修繕積立金が大幅改定！ローン返済とは別に毎月出ていく固定費が重くのしかかる。'
        : '長期修繕計画に基づき、マンションの修繕積立金が引き上げられた。',
      '分譲マンションの約85%が「段階増額積立方式」を採用しており、入居時より15年後は2〜3倍になるケースが多い。',
      `維持費 +${Math.round(hikeMan * 12)}万/年`,
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

  // 固定資産税（新築の当初3年/5年/7年軽減措置反映）
  const propTaxDiscount =
    property.isNew && y <= (property.energyCert === 'long-term-excellent' ? 5 : 3) ? 0.65 : 1.0;
  const annualRunningCostMan =
    Math.round(
      (state.currentMgmtAndRepairMonthlyMan * 12 +
        property.annualPropertyTaxMan * propTaxDiscount +
        property.utilityMonthlyDiffMan * 12) *
        10,
    ) / 10;

  // 教育費＋基本生活費（インフレ連動）
  const childrenEduCostMan = state.childrenAges.reduce(
    (sum, cAge) => sum + calcChildAnnualEduCostMan(cAge, family.isPrivateSchool),
    0,
  );
  const baseLivingCostMan = Math.round(
    (225 + state.childrenAges.filter((a) => a < 22).length * 32) * Math.pow(1 + inflationRate * 0.5, Math.min(25, y)),
  );
  const annualLivingAndEduCostMan = baseLivingCostMan + childrenEduCostMan;

  // 住宅ローン控除（年0.7%）
  const taxInfo = calcAnnualTaxDeductionMan(
    state.remainingBalanceMan,
    y,
    property,
    state.config.contractType,
    family.childrenCount > 0,
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
        annualTaxCreditMan -
        annualLoanPaymentMan -
        annualRunningCostMan -
        annualLivingAndEduCostMan) *
        10,
    ) / 10;

  // 手元金融資産の運用利回り（黒字貯蓄分の一部を新NISA年3%で運用）
  const investmentReturnMan =
    state.liquidSavingsMan > 300 ? Math.round((state.liquidSavingsMan - 200) * 0.025) : 0;

  state.liquidSavingsMan = Math.round((state.liquidSavingsMan + annualCashFlowMan + investmentReturnMan) * 10) / 10;
  state.totalPrincipalPaidMan = Math.round((state.totalPrincipalPaidMan + annualPrincipalPaidMan) * 10) / 10;
  state.totalInterestPaidMan = Math.round((state.totalInterestPaidMan + annualInterestPaidMan) * 10) / 10;
  state.totalRunningCostPaidMan = Math.round((state.totalRunningCostPaidMan + annualRunningCostMan) * 10) / 10;
  state.totalTaxCreditReceivedMan = Math.round((state.totalTaxCreditReceivedMan + annualTaxCreditMan) * 10) / 10;

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

  // === 8. 人生とローンの重大決断イベント発火判定（タイムライン自動一時停止） ===
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

  // (C) ペアローン世帯の試練（7年目：配偶者の働き方・キャリアと夫婦関係）
  if (
    state.config.contractType === 'pair' &&
    y === 7 &&
    !state.triggeredEventIds.includes('pair-loan-crossroad-7')
  ) {
    state.triggeredEventIds.push('pair-loan-crossroad-7');
    state.pendingDecision = {
      id: 'pair-loan-crossroad-7',
      yearIndex: y,
      age,
      category: 'pair-crisis',
      title: '【ペアローンの正念場】共働きフルタイム限界＆夫婦のすれ違い危機',
      description:
        'ペアローンで2人とも住宅ローンを抱えるプレッシャーの中、仕事と家事・育児の両立で配偶者が心身ともに疲弊。「働き方をセーブしたい」と切り出されたが、収入が減ればペアローンの返済負担率が一気に跳ね上がる！',
      statisticalContext:
        '住宅金融支援機構調査：20代・30代のペアローン利用率は3割超に達する一方、出産・転職・離婚時の返済計画変更が最大のリスク要因となる。',
      choices: [
        {
          id: 'support-short-time',
          label: '家事代行や時短家電に投資（年50万円）し、夫婦で支え合って共働きを継続',
          subLabel: '手元資金 -80万円 / 配偶者収入維持・夫婦メンタル+12',
          outcomeSummary:
            '80万円を投じて徹底的に家事外注・時短化！夫婦の会話と余裕が戻り、ペアローンの2馬力収入とW住宅ローン控除を堅持できた！',
          cashDeltaMan: -80,
          mentalDelta: 12,
        },
        {
          id: 'spouse-downshift',
          label: '配偶者がパート・時短勤務へ転換するのを容認する',
          subLabel: '配偶者年収 -45% / メンタル+5（自分のローン枠はそのまま残る）',
          outcomeSummary:
            '配偶者が働き方をセーブし家庭は落ち着いたが、配偶者名義のローン返済は減らないため世帯の貯蓄ペースが大きく低下した。',
          subIncomeMultiplierDelta: -0.45,
          mentalDelta: 5,
        },
        {
          id: 'divorce-conflict',
          label: '「ペアローンがあるから絶対フルで働け」と強く突き放す',
          subLabel: '離婚危機発生！共有名義トラブルでメンタル-30・資産半減リスク',
          outcomeSummary:
            '激しい口論の末に夫婦関係が決定的に破綻…。ペアローン共有名義のため簡単に売却も名義変更もできず、慰謝料・別居費用で350万円が流出し1馬力となった。',
          cashDeltaMan: -350,
          subIncomeMultiplierDelta: -1.0,
          mentalDelta: -30,
        },
      ],
    };
    return state;
  }

  // (D) 40代後半（返済16年目または47歳時点）：健康診断・大病と「団信（団体信用生命保険）」運命の審判！
  if (
    (y === 16 || age === 48) &&
    !state.triggeredEventIds.includes('danshin-health-judgment')
  ) {
    state.triggeredEventIds.push('danshin-health-judgment');
    const canTriggerDanshin =
      state.config.danshin === 'three-major-100' ||
      state.config.danshin === 'all-disease-pair' ||
      state.config.danshin === 'cancer-50';

    state.pendingDecision = {
      id: 'danshin-health-judgment',
      yearIndex: y,
      age,
      category: 'health-danshin',
      title: `【${age}歳・人間ドック精密検査】初期がん（ステージI）の診断確定と「団信」判定！`,
      description: `人間ドックの再検査で早期の悪性新生物（がん）が見つかった。幸い早期発見で手術により社会復帰可能だが、ここで契約時に選んだ「${danshin.name}」の保障内容が運命を分ける！`,
      statisticalContext:
        '国立がん研究センター統計：40代後半から60代にかけてがん罹患率は急上昇する。がん団信加入者の多くがこの年代で残債免除を受けている。',
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
                  ? `特約団信が発動し、残っていた住宅ローン ${Math.round(state.remainingBalanceMan).toLocaleString()}万円が全額免除（完済）された！治療費60万円を払っても、これからの住居費は管理費と税金のみになる劇的救済！`
                  : `がん50%保障団信が発動し、住宅ローン残債が半減！毎月の返済負担が劇的に軽くなり、安心して治療と仕事の両立に向かえるようになった。`,
              principalDeltaMan: -Math.round(state.remainingBalanceMan * danshin.cancerCoverage),
              cashDeltaMan: -60,
              mentalDelta: 15,
            },
          ]
        : [
            {
              id: 'basic-danshin-endure',
              label: '一般団信（死亡・高度障害のみ）のため保障対象外…医療費と減収に耐えながら返済を続ける',
              subLabel: '残債免除 0円 / 手術・休職による減収で手元資金 -180万円・メンタル-15',
              outcomeSummary:
                '「金利+0.1%〜0.2%をケチらずがん団信に入っておけば…」と悔やんでも後の祭り。手術と3ヶ月の休職による減収（180万円）を抱えながら、来月も変わらず住宅ローンの引き落としがやってくる。',
              cashDeltaMan: -180,
              mentalDelta: -15,
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
    state.mainIncomeMan = Math.max(200, Math.round(state.mainIncomeMan * (1 + choice.incomeMultiplierDelta)));
  }
  if (typeof choice.subIncomeMultiplierDelta === 'number') {
    state.subIncomeMan = Math.max(0, Math.round(state.subIncomeMan * (1 + choice.subIncomeMultiplierDelta)));
    if (choice.subIncomeMultiplierDelta <= -0.99) {
      state.isDivorced = true;
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

  // 団信100%発動で残債0になった場合は即座に完済クリア判定
  if (state.remainingBalanceMan <= 0 && state.unpaidInterestMan <= 0) {
    state.status = 'cleared';
    const res = evaluateEnding(state, 'paid-off');
    state.ending = res.ending;
    state.score = res.score;
  }

  return state;
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
      ? Math.round((1.65 + currentState.bojPolicyRate * 0.35) * 100) / 100
      : Math.max(0.42, Math.round((0.38 + (currentState.bojPolicyRate - 0.25) * 0.9) * 100) / 100);

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
