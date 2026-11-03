import {
  BankId,
  BankSpec,
  ChronicleEntry,
  CompanionHousehold,
  ContractType,
  DanshinSpec,
  DanshinType,
  EmploymentType,
  FamilyPlanType,
  FocusModeId,
  HouseholdArchetype,
  LoanTermYears,
  MacroRegimeId,
  MortgageDecisionEvent,
  MortgageEnding,
  MortgageGameState,
  MortgageSetupConfig,
  OutcomeFactor,
  PropertyCategory,
  PropertySpec,
  RateType,
  RepaymentMethod,
  UnderwritingResult,
  YearlySnapshot,
} from '@/types/mortgage';

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
    subtitle: '34歳・正社員×正社員（世帯年収 920万円）',
    percentileLabel: '分譲マンション購入世帯の標準モデル（構成比 16.4%）',
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
    subtitle: '32歳・外資/IT×総合職（世帯年収 1,380万円）',
    percentileLabel: '首都圏タワマン購入層（構成比 3.2%）',
    age: 32,
    employment: 'mega-venture',
    mainIncomeMan: 820,
    subIncomeMan: 560,
    initialSavingsMan: 1450,
    hasCreditBlemish: false,
    recommendedContract: 'pair',
    recommendedFamily: 'child-1-private',
    recommendedProperty: 'tower-mansion-new',
    description:
      '夫婦ともに高収入でペアローンフル活用＆W住宅ローン控除を狙う都心タワマン世帯。ただし片方の休職・離婚・中学受験課金・タワマン修繕費高騰が重なると一気に綱渡りに。',
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
    locationLabel: '都心3区エリア・駅徒歩2分',
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
      '都心一等地の1億円超えプレミアム物件。インフレ局面では国内外の需要で値上がり益（キャピタルゲイン）も狙える最高峰物件。',
    riskNote:
      'ペアローンで限度額ギリギリまで借りると、金利が1.5%上がっただけで年間返済額が120万円以上急増するハイリスク・ハイリターン領域。',
  },
  'compact-mansion-new': {
    id: 'compact-mansion-new',
    name: '都心近接・駅徒歩3分 新築コンパクト2LDKマンション（ZEH）',
    shortName: '都心コンパクト2LDK',
    buildingType: 'mansion',
    isNew: true,
    builtAge: 0,
    locationLabel: '都心乗換駅 徒歩3分（54㎡・2LDK）',
    priceMan: 4980,
    landRatio: 0.34,
    energyCert: 'zeh',
    initialMgmtFeeMonthlyMan: 1.5,
    initialRepairFeeMonthlyMan: 1.1,
    parkingMonthlyMan: 0.3,
    annualPropertyTaxMan: 16,
    landAnnualTrendRate: 0.008,
    utilityMonthlyDiffMan: -0.4,
    description:
      '単身キャリアやDINKsに人気の駅近コンパクトレジデンス。車を持たずに暮らせるため駐車場負担がなく、賃貸に出すにも売却するにも流動性が高い。',
    riskNote:
      '家族が増えて手狭になった場合は住み替えが必要になるほか、単身購入の場合は病気・休職リスクに備えた就業不能・がん団信の選択が重要。',
  },
  'detached-semi-order-zeh': {
    id: 'detached-semi-order-zeh',
    name: '都市近郊・駅徒歩10分 ZEHセミオーダー3階建て戸建て',
    shortName: '都市型ZEH3階建戸建',
    buildingType: 'detached',
    isNew: true,
    builtAge: 0,
    locationLabel: '都市近郊・急行駅徒歩10分（ビルトイン車庫付）',
    priceMan: 5280,
    landRatio: 0.56,
    energyCert: 'zeh',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 17,
    landAnnualTrendRate: 0.003,
    utilityMonthlyDiffMan: -0.6,
    description:
      '駅徒歩圏の利便性と「管理費・駐車場代0円の4LDK」を両立した都市型3階建て住宅。土地比率が高く資産価値が崩れにくい。',
    riskNote:
      '3階建ては外壁塗装・屋根修繕時の足場費用が2階建てより割高になりやすく、老後の階段昇降やホームエレベーター改修も論点になる。',
  },
  'detached-regional-spacious': {
    id: 'detached-regional-spacious',
    name: '地方中核都市・敷地60坪 太陽光＋駐車場3台付 長期優良戸建て',
    shortName: '地方60坪太陽光戸建',
    buildingType: 'detached',
    isNew: true,
    builtAge: 0,
    locationLabel: '地方中核都市・郊外開発分譲地（敷地60坪）',
    priceMan: 3480,
    landRatio: 0.38,
    energyCert: 'long-term-excellent',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 12,
    landAnnualTrendRate: -0.005,
    utilityMonthlyDiffMan: -1.2,
    description:
      '広い庭と駐車場3台、大容量太陽光パネルを備えたゆとりの長期優良住宅。借入額を3,000万円台に抑えつつ光熱費も大幅に黒字化できる。',
    riskNote:
      '夫婦それぞれマイカー2台を維持する地域のため、7〜9年ごとの車両買い替え費用と将来の外壁・防蟻メンテナンス費を計画的に積み立てる必要がある。',
  },
  'detached-kominka-reno': {
    id: 'detached-kominka-reno',
    name: '海街・文教エリア 築22年フル断熱リノベ木造一戸建て（ZEH改修）',
    shortName: '築22年断熱リノベ戸建',
    buildingType: 'detached',
    isNew: false,
    builtAge: 22,
    locationLabel: '湘南・文教住宅街エリア 駅徒歩11分',
    priceMan: 3680,
    landRatio: 0.68,
    energyCert: 'zeh',
    initialMgmtFeeMonthlyMan: 0,
    initialRepairFeeMonthlyMan: 0,
    parkingMonthlyMan: 0,
    annualPropertyTaxMan: 11,
    landAnnualTrendRate: 0.002,
    utilityMonthlyDiffMan: -0.3,
    description:
      '人気の文教・海街エリアの中古戸建てを耐震・高断熱フルリノベーションした物件。価格の約7割が底堅い土地資産で構成され、建物減価リスクが極めて小さい。',
    riskNote:
      '中古住宅のため住宅ローン控除期間は10年間。築35年（返済13年目頃）で屋根葺き替えや給排水管の更新工事が到来する。',
  },
};

export const BANKS: Record<BankId, BankSpec> = {
  'net-bank': {
    id: 'net-bank',
    name: 'あおぞらダイレクトネット銀行',
    shortName: 'ネット銀行(変動0.68%)',
    categoryLabel: 'ネット専業・低金利変動（5年/125%ルールなし）',
    rateType: 'variable',
    baseRate: 0.68,
    screeningRate: 3.5,
    maxDtiPercent: 35,
    supports50Years: true,
    has5Year125Rule: false,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 1,
    description:
      '日銀の相次ぐ利上げに伴い、かつての0.3%台から年0.68%へ改定されたネット専業の変動プラン。5年ルール・125%ルールがないため、今後の追加利上げ時は半年ごとに返済額が直撃上昇する。',
    badgeText: 'ネット銀最安級 / 5年ルールなし',
  },
  'mega-bank': {
    id: 'mega-bank',
    name: 'メトロポリタン第一銀行（メガバンク）',
    shortName: 'メガバンク(変動0.88%)',
    categoryLabel: '都市銀行・王道変動（5年ルール・125%ルール付）',
    rateType: 'variable',
    baseRate: 0.875,
    screeningRate: 3.4,
    maxDtiPercent: 35,
    supports50Years: false,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 3,
    description:
      '短期プライムレート引き上げを反映し年0.875%となった王道メガバンク変動金利。5年ルール・125%ルール完備で5年間は毎月返済額が変わらないが、追加利上げ時には裏で「未払利息」が蓄積するリスクも。',
    badgeText: '5年・125%ルール有 / 35年迄',
  },
  'regional-bank': {
    id: 'regional-bank',
    name: 'ふるさと共栄地方銀行',
    shortName: '地方銀行(50年対応1.05%)',
    categoryLabel: '地方銀行・柔軟審査＆50年ローン積極対応',
    rateType: 'variable',
    baseRate: 1.05,
    screeningRate: 3.2,
    maxDtiPercent: 38,
    supports50Years: true,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 3,
    description:
      '50年超長期ローンや個人事業主・転職直後・高倍率ローンにも柔軟に対応する地銀（年1.05%）。初期金利は1%台に乗っているが、家計困窮時のリスケ相談に最も親身。',
    badgeText: '審査柔軟 / 50年ローン対応',
  },
  'flat35-agency': {
    id: 'flat35-agency',
    name: '住宅金融支援公庫【フラット35S / 全期間固定】',
    shortName: 'フラット35(全期間固定2.24%)',
    categoryLabel: '全期間完全固定金利（子育て・長期優良優遇あり）',
    rateType: 'flat-35',
    baseRate: 2.24,
    screeningRate: 2.24,
    maxDtiPercent: 35,
    supports50Years: false,
    has5Year125Rule: false,
    upfrontFeeRate: 0.011,
    rescheduleFlexibility: 2,
    description:
      '長期金利（10年国債利回り）の上昇により年2.24%水準となったが、完済まで35年間、世界情勢や日銀の追加利上げがどうなろうと返済額が1円も上がらない絶対防衛ライン！長期優良・子育て世帯は当初5年間▲0.5%優遇！',
    badgeText: '金利上昇リスク完全ゼロ',
  },
  'neo-mix-bank': {
    id: 'neo-mix-bank',
    name: 'ネオ・トラスト信託銀行【変動50%＋固定50%ミックス】',
    shortName: '信託ミックス(1.58%)',
    categoryLabel: '変動金利と全期間固定の50:50ハイブリッド契約',
    rateType: 'mix',
    baseRate: 1.58,
    screeningRate: 3.0,
    maxDtiPercent: 36,
    supports50Years: true,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 2,
    description:
      '借入額の半分を変動金利、残り半分を固定金利で組むリスク分散プラン（合成金利 年1.58%）。今後の日銀追加利上げ時のダメージを半分に抑えつつ、全期間固定よりも初期返済額を軽減できる。',
    badgeText: '変動＋固定 50:50分散',
  },
  'fixed10-step-bank': {
    id: 'fixed10-step-bank',
    name: 'あさひ信託銀行【当初10年固定・段階特約プラン】',
    shortName: '当初10年固定(1.75%)',
    categoryLabel: '住宅ローン控除期間（当初10年）の金利を完全固定',
    rateType: 'fixed-10',
    baseRate: 1.75,
    screeningRate: 3.1,
    maxDtiPercent: 36,
    supports50Years: true,
    has5Year125Rule: true,
    upfrontFeeRate: 0.022,
    rescheduleFlexibility: 2,
    description:
      '長期金利上昇を反映し、残債が最も多い最初の10年間を年1.75%で完全固定するプラン。住宅ローン控除期間中の家計を安定させるが、11年目の特約満了時に優遇幅が縮小し金利が再改定される点に注意。',
    badgeText: '10年間固定 / 11年目改定',
  },
  'coop-welfare-bank': {
    id: 'coop-welfare-bank',
    name: '中央勤労者福祉バンク（ろうきん・共済連係）',
    shortName: '勤労福祉バンク(変動0.84%)',
    categoryLabel: '事務手数料低廉・繰上返済＆条件変更サポート充実',
    rateType: 'variable',
    baseRate: 0.84,
    screeningRate: 3.1,
    maxDtiPercent: 36,
    supports50Years: false,
    has5Year125Rule: true,
    upfrontFeeRate: 0.008,
    rescheduleFlexibility: 3,
    description:
      '融資事務手数料が一般的な銀行（2.2%）の半分以下（0.8%）で済み、初期諸費用を100万円近く節約できる勤労者向け金融機関（変動年0.84%）。5年・125%ルール付きで安定感が高い。',
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
  const baseRate = config.customBaseRate ?? base.baseRate;
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
          : '50:50ミックス金利';

  const hasCustom =
    config.customRateType !== undefined ||
    config.customBaseRate !== undefined ||
    config.customHas5Year125Rule !== undefined;

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
 * 世帯属性（年齢・雇用・年収・頭金・家族構成・契約方式）のみを多彩にランダム生成する
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

  const contractChoices: ContractType[] = ['single', 'pair', 'income-merge'];
  const contractType =
    rng() < 0.65
      ? arch.recommendedContract
      : (contractChoices[Math.floor(rng() * contractChoices.length)] ?? 'single');

  const subIncomeMan =
    contractType === 'single'
      ? rng() < 0.45
        ? 0
        : Math.round((80 + rng() * 180) / 10) * 10
      : Math.round((200 + rng() * 640) / 10) * 10;

  const initialSavingsMan =
    Math.round(Math.max(200, Math.min(2800, arch.initialSavingsMan * (0.7 + rng() * 0.65))) / 50) * 50;

  const maxSafeDown = Math.max(0, initialSavingsMan - 250);
  const downPaymentMan =
    rng() < 0.32
      ? 0
      : Math.min(maxSafeDown, Math.round((rng() * maxSafeDown * 0.85) / 50) * 50);

  const familyKeys = Object.keys(FAMILY_PLANS) as FamilyPlanType[];
  const familyPlan =
    rng() < 0.6
      ? arch.recommendedFamily
      : (familyKeys[Math.floor(rng() * familyKeys.length)] ?? 'child-1-public');

  const recProp = PROPERTIES[arch.recommendedProperty] ?? PROPERTIES['station-mansion-new'];

  return {
    ...prev,
    archetypeId: arch.id,
    age,
    employment,
    mainIncomeMan,
    subIncomeMan,
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
  const rateJitter = (rng() - 0.35) * 0.36;
  const customBaseRate =
    Math.round(Math.max(0.5, Math.min(3.8, baseBank.baseRate + rateJitter)) * 100) / 100;
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
    termYears,
    repaymentMethod,
    bonusRepaymentRatio,
    danshin,
    customDanshinSpread,
  };
}

/**
 * 抽選プロファイルおよび現在の契約条件サマリー文字列（年齢・世帯年収・自己資金・頭金・購入後の手元資金・物件・借入額・期間・金利・団信・毎月支払額）を生成する
 */
export function formatSetupProfileSummary(config: MortgageSetupConfig): string {
  const prop = resolveEffectiveProperty(config);
  const bank = resolveEffectiveBank(config);
  const danshin = resolveEffectiveDanshin(config);
  const family = FAMILY_PLANS[config.familyPlan];
  const uw = runBankUnderwriting(config);

  const householdGross =
    config.mainIncomeMan + (config.contractType === 'single' ? 0 : config.subIncomeMan);
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
  const rateTypeShort =
    bank.rateType === 'variable'
      ? '変動'
      : bank.rateType === 'fixed-10'
        ? '10年固定'
        : bank.rateType === 'flat-35'
          ? '全期間固定'
          : 'ミックス';
  const methodShort = config.repaymentMethod === 'equal-principal' ? '元金均等' : '元利均等';

  return `${config.age}歳・世帯年収${householdGross.toLocaleString()}万円（${contractLabel}・${family.name}） / 自己資金${config.initialSavingsMan.toLocaleString()}万円（頭金${config.downPaymentMan.toLocaleString()}万・諸費用${uw.closingCostsMan.toLocaleString()}万 → 購入後の手元資金${uw.cashRemainingAfterPurchaseMan.toLocaleString()}万円） / ${newUsedLabel}${bTypeLabel} ${prop.priceMan.toLocaleString()}万円（借入元本${uw.loanPrincipalMan.toLocaleString()}万円） / ${config.termYears}年ローン・${uw.maturityAge}歳完済（${rateTypeShort} 金利${uw.effectiveInitialRate.toFixed(2)}%・${methodShort}・${danshin.shortName}） / 初年度 毎月返済${uw.initialMonthlyPaymentMan}万円（維持費・税込 実質月${uw.initialTotalMonthlyOutflowMan}万円）`;
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

  // 世帯収入と物件価格が極端に乖離しすぎないようリアルな範囲に自動調整（かつフルローンや背伸び購入のスリルも残す）
  const householdGross =
    withLoan.mainIncomeMan + (withLoan.contractType === 'single' ? 0 : withLoan.subIncomeMan);
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
  const effectiveTermYears: LoanTermYears = Math.max(10, Math.min(50, Math.round(config.termYears)));
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
    subIncomeMan: normalizedConfig.contractType === 'single' ? 0 : normalizedConfig.subIncomeMan,
    currentMgmtAndRepairMonthlyMan:
      property.initialMgmtFeeMonthlyMan +
      property.initialRepairFeeMonthlyMan +
      property.parkingMonthlyMan,
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
 * 国立がん研究センター「がん統計」・厚生労働省「患者調査」に基づく年齢階級別・年間疾病発症確率の算出
 * - がん（悪性新生物）：30代は年0.1〜0.2%、40代で0.4〜0.6%、50代で0.9〜1.3%、60代で1.8〜2.3%（35年間の累積で約20〜24%・約4〜5人に1人）
 * - 心筋梗塞・脳卒中（3大疾病の血管疾患）：30代0.05%、40代0.18%、50代0.42%、60代0.75%（35年間累積で約8〜10%）
 * - 一般疾病・長期入院（椎間板ヘルニア・消化器疾患・適応障害等、がん/3大疾病以外）：年0.65〜1.3%（35年間累積で約25〜28%）
 */
export function calcAnnualHealthRiskProbabilities(
  age: number,
  focusMode: FocusModeId = 'balanced',
  healthScore = 85,
): {
  cancerProb: number;
  vascularProb: number;
  generalIllnessProb: number;
} {
  let baseCancer = 0.0012;
  if (age >= 70) baseCancer = 0.027;
  else if (age >= 65) baseCancer = 0.023;
  else if (age >= 60) baseCancer = 0.0185;
  else if (age >= 55) baseCancer = 0.0135;
  else if (age >= 50) baseCancer = 0.0095;
  else if (age >= 45) baseCancer = 0.006;
  else if (age >= 40) baseCancer = 0.0038;
  else if (age >= 35) baseCancer = 0.0022;

  let baseVascular = 0.0005;
  if (age >= 70) baseVascular = 0.011;
  else if (age >= 60) baseVascular = 0.0075;
  else if (age >= 50) baseVascular = 0.0042;
  else if (age >= 40) baseVascular = 0.0018;

  let baseGeneral = 0.0065;
  if (age >= 60) baseGeneral = 0.0135;
  else if (age >= 50) baseGeneral = 0.0105;
  else if (age >= 40) baseGeneral = 0.0085;

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

  return {
    cancerProb: Math.round(baseCancer * lifestyleMult * 100000) / 100000,
    vascularProb: Math.round(baseVascular * lifestyleMult * 100000) / 100000,
    generalIllnessProb: Math.round(baseGeneral * lifestyleMult * 100000) / 100000,
  };
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
          '金利変動、修繕費高騰、教育費ピークのすべてを完璧な資金計画と住宅ローン控除・資産価値維持で乗り切った！無借金のマイホームと潤沢な老後資金を両手に、ゆとりあるセカンドライフを迎えるハッピーエンド。',
        statisticComparison:
          '日本の住宅ローン完済世帯のうち、完済時点で金融資産3,000万円以上＋無借金マイホームを両立できるのは上位約8.5%の健全家計。',
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

  // 金利タイプに応じた適用金利の更新（初期政策金利0.75%を基準として短期プライムレート連動）
  const prevAppliedRate = state.appliedInterestRate;
  if (state.currentRateType === 'variable') {
    const targetVarRate = Math.max(
      0.45,
      Math.round((bank.baseRate + danshin.spreadRate + (state.bojPolicyRate - 0.75) * 0.95) * 1000) / 1000,
    );
    state.appliedInterestRate = targetVarRate;
  } else if (state.currentRateType === 'mix') {
    const targetMixRate = Math.max(
      1.1,
      Math.round((bank.baseRate + danshin.spreadRate + (state.bojPolicyRate - 0.75) * 0.48) * 1000) / 1000,
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

  // 手元金融資産の運用利回り（黒字貯蓄分の一部を新NISA等で運用）
  const investmentReturnMan =
    state.liquidSavingsMan > 300 ? Math.round((state.liquidSavingsMan - 200) * focusInvestBonusRate) : 0;

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

  // === 8. 人生とローンの重大決断イベント発火判定（タイムライン自動一時停止） ===
  // (C) ペアローン世帯の試練（4年目：配偶者の働き方・キャリアと夫婦関係）
  if (
    state.config.contractType === 'pair' &&
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
        'ペアローンで2人とも住宅ローンを抱えるプレッシャーの中、仕事と家事・育児の両立で配偶者が心身ともに疲弊。「働き方をセーブしたい」と切り出されたが、収入が減ればペアローンの返済負担率が一気に跳ね上がる！',
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
          label: '配偶者が時短・マイルド勤務へ転換するのを容認する',
          subLabel: '配偶者年収 -35% / 幸福度 +5（配偶者名義のローン返済はそのまま残る）',
          outcomeSummary:
            '配偶者が働き方をセーブし家庭は落ち着いたが、配偶者名義のローン返済は減らないため世帯の貯蓄ペースが低下した。',
          subIncomeMultiplierDelta: -0.35,
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
          mentalDelta: -28,
        },
      ],
    };
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

  // (A1) 子育て世帯10年目：子どもの進学ルート・教育資金と住宅ローン返済のバランス決断
  if (
    state.childrenAges.length > 0 &&
    y === 10 &&
    !state.triggeredEventIds.includes('education-crossroad-10')
  ) {
    state.triggeredEventIds.push('education-crossroad-10');
    state.pendingDecision = {
      id: 'education-crossroad-10',
      yearIndex: y,
      age,
      category: 'education',
      title: '【教育費とローンの岐路】子どもの進学塾・習い事拡大と大学資金の準備方針',
      description:
        '子どもが高学年・進学準備期を迎え、周囲で進学塾や習い事の話題が急増している。一方、数年後には住宅ローン控除の終了や修繕イベントも控えている。教育投資と家計防衛のバランスをどう取るか？',
      statisticalContext:
        '文部科学省「子供の学習費調査」：小学校高学年から大学卒業までの教育資金は、進路選択によって1人あたり800万〜2,200万円の差が生じる。',
      choices: [
        {
          id: 'full-prep-school',
          label: '希望通りの進学塾・夏期講習・英語教育にしっかり投資する（一時費用 95万円）',
          subLabel: '手元資金 -95万円 / 家族の満足度・進学充実度 +10',
          outcomeSummary:
            '子どもの意欲を尊重して教育環境へ投資！出費は重なったが、家族の絆とモチベーションが大きく高まった。',
          cashDeltaMan: -95,
          mentalDelta: 10,
        },
        {
          id: 'balanced-public-scholarship',
          label: '通信教育と地域の公立トップ校ルートを軸にし、浮いた資金でローン元金を120万円繰上返済する',
          subLabel: '手元資金 -120万円 → ローン残債 -120万円削減・将来利息カット',
          outcomeSummary:
            '見栄に流されず堅実な学習スタイルを選択し、温存した資金120万円で住宅ローン元金を直接削減！大学進学前の固定費圧縮に成功した。',
          cashDeltaMan: -120,
          principalDeltaMan: -120,
          mentalDelta: 3,
        },
        {
          id: 'parent-upskill-income',
          label: '親自身が資格取得・キャリア転職に挑戦し、世帯年収そのものを引き上げる',
          subLabel: '自己投資 -35万円 / 本人年収 +8%アップ・幸福度 +4',
          outcomeSummary:
            '教育費ピークに備えて親自身のキャリアアップを決断！年収が8%上昇し、教育費と住宅ローンの両立基盤が強化された。',
          cashDeltaMan: -35,
          incomeMultiplierDelta: 0.08,
          mentalDelta: 4,
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

  // (D4) 60歳定年退職時（残債600万円以上ある場合）：退職金で一括・大幅繰上返済するか温存するか
  if (
    age === 60 &&
    state.remainingBalanceMan >= 600 &&
    state.liquidSavingsMan >= 900 &&
    !state.triggeredEventIds.includes('retirement-lump-sum-60')
  ) {
    state.triggeredEventIds.push('retirement-lump-sum-60');
    const payoffTarget = Math.min(Math.round(state.remainingBalanceMan), 1200);
    state.pendingDecision = {
      id: 'retirement-lump-sum-60',
      yearIndex: y,
      age,
      category: 'retirement',
      title: `【60歳定年・退職金の決断】残債 ${Math.round(state.remainingBalanceMan).toLocaleString()}万円に退職金を投入するか？`,
      description:
        '60歳定年を迎え退職金を受け取ったが、まだ住宅ローン残債が残っている。退職金を使って残債を大きく減らすか、それとも老後の生活防衛資金として手元に現金を残すか、60代最大の決断！',
      statisticalContext:
        '60歳定年時に退職金で住宅ローンを一括返済した結果、手元の老後資金が枯渇してしまう「退職金一括返済の罠」と「老後毎月返済の重圧」のどちらを取るかが問われる。',
      choices: [
        {
          id: 'retire-major-prepay',
          label: `退職金から ${payoffTarget.toLocaleString()}万円を投入し、住宅ローン残債を一気に削る`,
          subLabel: `手元資金 -${payoffTarget}万円 / ローン残債 -${payoffTarget}万円（老後の毎月返済を大幅軽減）`,
          outcomeSummary: `退職金から${payoffTarget.toLocaleString()}万円を繰上返済に充当！年金生活に入る前に残債を大幅に圧縮し、老後の固定費を引き下げた。`,
          cashDeltaMan: -payoffTarget,
          principalDeltaMan: -payoffTarget,
          mentalDelta: 8,
        },
        {
          id: 'retire-keep-cash-nisa',
          label: '退職金は手元資金・配当運用として温存し、毎月返済をこのまま継続する',
          subLabel: '手元キャッシュ温存（流動性確保） / 60代以降も毎月返済は継続',
          outcomeSummary:
            '「現金が手元にあればいつでも返せる」と判断し、退職金を老後キャッシュとして温存。運用益を得ながら計画的に返済を続ける道を選んだ。',
          mentalDelta: 3,
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

  // (D6) 子ども18歳・大学進学時の入学金＆仕送り・奨学金選択イベント
  if (
    state.childrenAges.includes(18) &&
    !state.triggeredEventIds.includes('university-scholarship-choice')
  ) {
    state.triggeredEventIds.push('university-scholarship-choice');
    state.pendingDecision = {
      id: 'university-scholarship-choice',
      yearIndex: y,
      age,
      category: 'education',
      title: '【子ども18歳・大学進学の転機】大学入学金・前期授業料と4年間の学費分担',
      description:
        'ついに子どもが18歳を迎え大学進学が決定！合格発表と同時に入学金・前期授業料・新生活準備のまとまった振込期限が迫る。住宅ローン返済と並行してどう工面するか？',
      statisticalContext:
        '日本政策金融公庫「教育費負担の実態調査」：大学入学初年度にかかる費用平均は約160万〜230万円、学生の約2.7人に1人が奨学金を利用している。',
      choices: [
        {
          id: 'univ-parent-full-support',
          label: '親の貯蓄から入学・進学初期費用（135万円）を全額出し、子どもには学業に専念させる',
          subLabel: '手元資金 -135万円 / 家族の絆・子どもの安心感 +9',
          outcomeSummary:
            'これまで積み立ててきた資金から135万円を拠出し、子どもに借金を背負わせず大学へ送り出した！親としての大きな責任を果たした達成感に包まれた。',
          cashDeltaMan: -135,
          mentalDelta: 9,
        },
        {
          id: 'univ-jasso-scholarship',
          label: 'JASSO奨学金と子どものアルバイトを併用してもらい、親の初期負担を60万円に抑える',
          subLabel: '手元資金 -60万円 / 家計のキャッシュ防衛を優先（メンタル+2）',
          outcomeSummary:
            '親子でしっかり話し合い、奨学金とアルバイトを組み合わせる堅実プランを選択。住宅ローン破綻を防ぎながら大学進学を実現した。',
          cashDeltaMan: -60,
          mentalDelta: 2,
        },
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

  // (D9) 全世帯共通・キャリア＆転勤のランダム転機イベント（現実的な確率で発火）
  if (isCooldownClear) {
    const careerRoll = rng();

    // 1. 急な遠方転勤辞令（単身赴任 vs リロケーション賃貸 vs 転職定住：5〜13年目、年率5%）
    if (
      state.config.employment !== 'freelance' &&
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
          'マイホームでの生活が軌道に乗った矢先、会社から3〜4年間の遠方赴任辞令が下った！家族全員で引っ越して自宅を期間限定賃貸（リロケーション）に出すか、単身赴任か、それとも転職して定住するか？',
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
    nextApplied = Math.max(
      1.1,
      Math.round((bank.baseRate + danshin.spreadRate + (nextBoj - 0.75) * 0.48) * 100) / 100,
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
