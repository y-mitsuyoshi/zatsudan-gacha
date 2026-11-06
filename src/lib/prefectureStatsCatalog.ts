import { PREFECTURE_STATS, type PrefectureStat } from './statsData';

export type MetricGenreId =
  | 'all'
  | 'demographics'
  | 'geography'
  | 'economy'
  | 'living'
  | 'health'
  | 'culture';

export type MetricKey =
  // 1. 人口・世帯・年齢構造 (8)
  | 'population'
  | 'density'
  | 'populationShare'
  | 'populationVsAverage'
  | 'populationChangeRate'
  | 'agingRate'
  | 'youthRate'
  | 'singleHouseholdRate'
  // 2. 地理・自然・気候 (8)
  | 'area'
  | 'areaShare'
  | 'areaPerPerson'
  | 'areaVsAverage'
  | 'habitableAreaRatio'
  | 'forestRatio'
  | 'annualSunshineHours'
  | 'annualPrecipitation'
  | 'averageTemperature'
  // 3. 経済・所得・産業 (5)
  | 'perCapitaIncome'
  | 'prefecturalGdp'
  | 'effectiveJobOpeningRatio'
  | 'manufacturingShipment'
  | 'agriculturalOutput'
  // 4. 暮らし・住居・モビリティ (5)
  | 'homeOwnershipRate'
  | 'floorAreaPerDwelling'
  | 'averageRent'
  | 'carsPerHousehold'
  | 'commuteTimeMinutes'
  // 5. 医療・健康・長寿 (4)
  | 'lifeExpectancyMale'
  | 'lifeExpectancyFemale'
  | 'doctorsPer100k'
  | 'hospitalBedsPer100k'
  // 6. 教育・文化・観光・グルメ (5)
  | 'universityAdvancementRate'
  | 'convenienceStoresPer100k'
  | 'ramenShopsPer100k'
  | 'cafesPer100k'
  | 'hotelGuestsPerCapita';

export interface MetricGenreMeta {
  id: Exclude<MetricGenreId, 'all'>;
  label: string;
  shortLabel: string;
  description: string;
  accentColor: string;
}

export interface MetricDefinition {
  key: MetricKey;
  genre: Exclude<MetricGenreId, 'all'>;
  label: string;
  shortLabel: string;
  unit: string;
  decimals: number;
  descendingLabel: string;
  ascendingLabel: string;
  description: string;
  source: string;
  summaryType: 'sum' | 'mean' | 'weighted';
}

export interface PrefectureRawExtension {
  code: number;
  shortName: string;
  capital: string;
  mapCol: number;
  mapRow: number;
  populationChangeRate: number; // 5年人口増減率 (%)
  agingRate: number; // 65歳以上人口割合 (%)
  youthRate: number; // 15歳未満人口割合 (%)
  singleHouseholdRate: number; // 単独世帯割合 (%)
  habitableAreaRatio: number; // 可住地面積割合 (%)
  forestRatio: number; // 森林面積割合 (%)
  annualSunshineHours: number; // 年間日照時間 (時間)
  annualPrecipitation: number; // 年間降水量 (mm)
  averageTemperature: number; // 年平均気温 (℃)
  perCapitaIncome: number; // 1人あたり県民所得 (万円)
  prefecturalGdp: number; // 県内総生産 (兆円)
  effectiveJobOpeningRatio: number; // 有効求人倍率 (倍)
  manufacturingShipment: number; // 製造品出荷額等 (兆円)
  agriculturalOutput: number; // 農業産出額 (億円)
  homeOwnershipRate: number; // 持ち家住宅率 (%)
  floorAreaPerDwelling: number; // 1住宅あたり延べ面積 (m²)
  averageRent: number; // 民営借家月額家賃目安・30m²換算 (万円)
  carsPerHousehold: number; // 1世帯あたり乗用車保有台数 (台)
  commuteTimeMinutes: number; // 往復通勤・通学時間 (分)
  lifeExpectancyMale: number; // 平均寿命・男性 (歳)
  lifeExpectancyFemale: number; // 平均寿命・女性 (歳)
  doctorsPer100k: number; // 人口10万人あたり医師数 (人)
  hospitalBedsPer100k: number; // 人口10万人あたり一般病床数 (床)
  universityAdvancementRate: number; // 大学等進学率 (%)
  convenienceStoresPer100k: number; // 人口10万人あたりコンビニ数 (店)
  ramenShopsPer100k: number; // 人口10万人あたりラーメン店数 (店)
  cafesPer100k: number; // 人口10万人あたり喫茶・カフェ数 (店)
  hotelGuestsPerCapita: number; // 人口1人あたり延べ宿泊者数 (泊/人)
}

export type FullPrefectureRecord = PrefectureStat &
  PrefectureRawExtension & {
    density: number;
    populationShare: number;
    areaShare: number;
    areaPerPerson: number;
    populationVsAverage: number;
    areaVsAverage: number;
  };

export const GENRE_META: MetricGenreMeta[] = [
  {
    id: 'demographics',
    label: '人口・世帯・年齢',
    shortLabel: '人口・世帯',
    description: '総人口、人口密度、増減率、高齢化率、年少人口、一人暮らし率など人口動態の基本指標',
    accentColor: '#2563eb',
  },
  {
    id: 'geography',
    label: '地理・自然・気候',
    shortLabel: '地理・気候',
    description: '総面積、可住地割合、森林率、年間日照時間、降水量、平均気温など国土と気候の指標',
    accentColor: '#059669',
  },
  {
    id: 'economy',
    label: '経済・所得・産業',
    shortLabel: '経済・産業',
    description: '1人あたり県民所得、県内総生産（GDP）、有効求人倍率、製造業出荷額、農業産出額',
    accentColor: '#d97706',
  },
  {
    id: 'living',
    label: '暮らし・住居・車',
    shortLabel: '暮らし・住居',
    description: '持ち家率、住宅延べ面積、家賃相場、マイカー保有台数、通勤・通学時間など生活環境指標',
    accentColor: '#7c3aed',
  },
  {
    id: 'health',
    label: '医療・健康・長寿',
    shortLabel: '医療・長寿',
    description: '男女別の平均寿命、人口10万人あたり医師数、病床数など健康・医療インフラ指標',
    accentColor: '#dc2626',
  },
  {
    id: 'culture',
    label: '教育・文化・観光・食',
    shortLabel: '文化・観光・食',
    description: '大学進学率、コンビニ・ラーメン店・カフェ密度、1人あたり宿泊客数など地域文化と観光の指標',
    accentColor: '#0891b2',
  },
];

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // 1. 人口・世帯
  {
    key: 'population',
    genre: 'demographics',
    label: '総人口',
    shortLabel: '総人口',
    unit: '人',
    decimals: 0,
    descendingLabel: '人口の多い順',
    ascendingLabel: '人口の少ない順',
    description: '都道府県の総人口です。都市圏への集中度や市場規模の基本指標となります。',
    source: '総務省「国勢調査」',
    summaryType: 'sum',
  },
  {
    key: 'density',
    genre: 'demographics',
    label: '人口密度',
    shortLabel: '人口密度',
    unit: '人/km²',
    decimals: 1,
    descendingLabel: '密度の高い順',
    ascendingLabel: '密度の低い順',
    description: '総人口 ÷ 総面積で算出した1km²あたりの居住人数です。都市化の度合いを示します。',
    source: '国勢調査・国土地理院面積より算出',
    summaryType: 'weighted',
  },
  {
    key: 'populationChangeRate',
    genre: 'demographics',
    label: '人口増減率（5年間）',
    shortLabel: '人口増減率',
    unit: '%',
    decimals: 2,
    descendingLabel: '増加率の高い順',
    ascendingLabel: '減少率の大きい順',
    description: '直近5年間の人口増減率です。プラスは人口流入・自然増、マイナスは人口減少を示します。',
    source: '総務省「国勢調査」参考値',
    summaryType: 'mean',
  },
  {
    key: 'agingRate',
    genre: 'demographics',
    label: '高齢化率（65歳以上）',
    shortLabel: '高齢化率',
    unit: '%',
    decimals: 1,
    descendingLabel: '高齢化率の高い順',
    ascendingLabel: '高齢化率の低い順',
    description: '総人口に占める65歳以上人口の割合です。社会保障需要や年齢構造の特徴を表します。',
    source: '総務省「人口推計・国勢調査」参考値',
    summaryType: 'mean',
  },
  {
    key: 'youthRate',
    genre: 'demographics',
    label: '年少人口割合（15歳未満）',
    shortLabel: '年少人口率',
    unit: '%',
    decimals: 1,
    descendingLabel: '年少割合の高い順',
    ascendingLabel: '年少割合の低い順',
    description: '総人口に占める0〜14歳（15歳未満）人口の割合です。子育て世代や出生傾向を反映します。',
    source: '総務省「人口推計・国勢調査」参考値',
    summaryType: 'mean',
  },
  {
    key: 'singleHouseholdRate',
    genre: 'demographics',
    label: '単独世帯（一人暮らし）率',
    shortLabel: '単独世帯率',
    unit: '%',
    decimals: 1,
    descendingLabel: '単独世帯率の高い順',
    ascendingLabel: '単独世帯率の低い順',
    description: '一般世帯に占める1人世帯の割合です。大学・企業の集積地ほど高くなる傾向があります。',
    source: '総務省「国勢調査」参考値',
    summaryType: 'mean',
  },
  {
    key: 'populationShare',
    genre: 'demographics',
    label: '全国人口シェア',
    shortLabel: '人口シェア',
    unit: '%',
    decimals: 2,
    descendingLabel: '人口シェアの大きい順',
    ascendingLabel: '人口シェアの小さい順',
    description: '全国の総人口に対する各都道府県の人口割合（%）です。全47都道府県の合計が100%になります。',
    source: '国勢調査人口より算出',
    summaryType: 'sum',
  },
  {
    key: 'populationVsAverage',
    genre: 'demographics',
    label: '全国平均人口比',
    shortLabel: '平均人口比',
    unit: '%',
    decimals: 1,
    descendingLabel: '平均人口比の大きい順',
    ascendingLabel: '平均人口比の小さい順',
    description: '1都道府県あたりの平均人口（総人口÷47）を100%としたときの相対比率です。',
    source: '国勢調査人口より算出',
    summaryType: 'mean',
  },

  // 2. 地理・自然・気候
  {
    key: 'area',
    genre: 'geography',
    label: '総面積',
    shortLabel: '総面積',
    unit: 'km²',
    decimals: 0,
    descendingLabel: '面積の広い順',
    ascendingLabel: '面積の狭い順',
    description: '都道府県の総面積（km²）です。北海道が全国の約22%を占めています。',
    source: '国土地理院「全国都道府県市区町村別面積調」',
    summaryType: 'sum',
  },
  {
    key: 'habitableAreaRatio',
    genre: 'geography',
    label: '可住地面積割合',
    shortLabel: '可住地率',
    unit: '%',
    decimals: 1,
    descendingLabel: '可住地率の高い順',
    ascendingLabel: '可住地率の低い順',
    description: '総面積から林野面積と主要湖沼面積を除いた「可住地面積」の割合です。平野の多さを示します。',
    source: '総務省「統計でみる都道府県のすがた」参考値',
    summaryType: 'mean',
  },
  {
    key: 'forestRatio',
    genre: 'geography',
    label: '森林面積割合',
    shortLabel: '森林率',
    unit: '%',
    decimals: 1,
    descendingLabel: '森林率の高い順',
    ascendingLabel: '森林率の低い順',
    description: '県土面積に占める森林面積の割合です。山林資源や自然環境の豊かさを表します。',
    source: '林野庁「森林資源の現況」参考値',
    summaryType: 'mean',
  },
  {
    key: 'annualSunshineHours',
    genre: 'geography',
    label: '年間日照時間',
    shortLabel: '日照時間',
    unit: '時間',
    decimals: 0,
    descendingLabel: '日照時間の長い順',
    ascendingLabel: '日照時間の短い順',
    description: '県庁所在地（気象台）における年間の合計日照時間です。太平洋側や内陸盆地で長くなります。',
    source: '気象庁統計・社会生活統計指標参考値',
    summaryType: 'mean',
  },
  {
    key: 'annualPrecipitation',
    genre: 'geography',
    label: '年間降水量',
    shortLabel: '降水量',
    unit: 'mm',
    decimals: 0,
    descendingLabel: '降水量の多い順',
    ascendingLabel: '降水量の少ない順',
    description: '県庁所在地（気象台）における年間の降水量（mm）です。南四国・九州南部・北陸で多くなります。',
    source: '気象庁統計・社会生活統計指標参考値',
    summaryType: 'mean',
  },
  {
    key: 'averageTemperature',
    genre: 'geography',
    label: '年平均気温',
    shortLabel: '平均気温',
    unit: '℃',
    decimals: 1,
    descendingLabel: '気温の高い順',
    ascendingLabel: '気温の低い順',
    description: '県庁所在地（気象台）における年間の平均気温（℃）です。緯度や標高、海流の影響を反映します。',
    source: '気象庁統計・社会生活統計指標参考値',
    summaryType: 'mean',
  },
  {
    key: 'areaShare',
    genre: 'geography',
    label: '全国面積シェア',
    shortLabel: '面積シェア',
    unit: '%',
    decimals: 2,
    descendingLabel: '面積シェアの大きい順',
    ascendingLabel: '面積シェアの小さい順',
    description: '全国の総面積に対する各都道府県の面積割合（%）です。',
    source: '国土地理院面積より算出',
    summaryType: 'sum',
  },
  {
    key: 'areaPerPerson',
    genre: 'geography',
    label: '1人あたり面積',
    shortLabel: '1人あたり面積',
    unit: 'm²/人',
    decimals: 0,
    descendingLabel: '1人あたり面積の広い順',
    ascendingLabel: '1人あたり面積の狭い順',
    description: '総面積（m²）÷ 総人口で算出した1人あたりの国土面積です。人口密度の逆数に相当します。',
    source: '国勢調査・国土地理院面積より算出',
    summaryType: 'weighted',
  },
  {
    key: 'areaVsAverage',
    genre: 'geography',
    label: '全国平均面積比',
    shortLabel: '平均面積比',
    unit: '%',
    decimals: 1,
    descendingLabel: '平均面積比の大きい順',
    ascendingLabel: '平均面積比の小さい順',
    description: '1都道府県あたりの平均面積（総面積÷47）を100%としたときの相対比率です。',
    source: '国土地理院面積より算出',
    summaryType: 'mean',
  },

  // 3. 経済・所得・産業
  {
    key: 'perCapitaIncome',
    genre: 'economy',
    label: '1人あたり県民所得',
    shortLabel: '県民所得',
    unit: '万円',
    decimals: 0,
    descendingLabel: '県民所得の高い順',
    ascendingLabel: '県民所得の低い順',
    description: '雇用者報酬・財産所得・企業所得を合算した県民所得を総人口で割った1人あたり水準です。',
    source: '内閣府「県民経済計算」参考値',
    summaryType: 'mean',
  },
  {
    key: 'prefecturalGdp',
    genre: 'economy',
    label: '県内総生産（名目GDP）',
    shortLabel: '県内GDP',
    unit: '兆円',
    decimals: 1,
    descendingLabel: '県内GDPの大きい順',
    ascendingLabel: '県内GDPの小さい順',
    description: '各都道府県内で1年間に新たに生み出された財・サービスの付加価値総額（兆円）です。',
    source: '内閣府「県民経済計算」参考値',
    summaryType: 'sum',
  },
  {
    key: 'effectiveJobOpeningRatio',
    genre: 'economy',
    label: '有効求人倍率',
    shortLabel: '求人倍率',
    unit: '倍',
    decimals: 2,
    descendingLabel: '求人倍率の高い順',
    ascendingLabel: '求人倍率の低い順',
    description: '求職者1人あたり何件の求人があるかを示す雇用指標です。1.0倍を超えると求人が求職を上回ります。',
    source: '厚生労働省「一般職業紹介状況」参考値',
    summaryType: 'mean',
  },
  {
    key: 'manufacturingShipment',
    genre: 'economy',
    label: '製造品出荷額等',
    shortLabel: '製造品出荷額',
    unit: '兆円',
    decimals: 2,
    descendingLabel: '出荷額の大きい順',
    ascendingLabel: '出荷額の小さい順',
    description: '製造業事業所における年間の製造品出荷額（兆円）です。ものづくり産業の集積度を示します。',
    source: '経済センサス・工業統計調査参考値',
    summaryType: 'sum',
  },
  {
    key: 'agriculturalOutput',
    genre: 'economy',
    label: '農業産出額',
    shortLabel: '農業産出額',
    unit: '億円',
    decimals: 0,
    descendingLabel: '農業産出額の大きい順',
    ascendingLabel: '農業産出額の小さい順',
    description: '米・野菜・果実・畜産物など農業生産によって生み出された年間の産出額（億円）です。',
    source: '農林水産省「生産農業所得統計」参考値',
    summaryType: 'sum',
  },

  // 4. 暮らし・住居・モビリティ
  {
    key: 'homeOwnershipRate',
    genre: 'living',
    label: '持ち家住宅率',
    shortLabel: '持ち家率',
    unit: '%',
    decimals: 1,
    descendingLabel: '持ち家率の高い順',
    ascendingLabel: '持ち家率の低い順',
    description: '居住世帯のある住宅のうち「持ち家」が占める割合です。北陸・東北で高く、大都市圏で低くなります。',
    source: '総務省「住宅・土地統計調査」参考値',
    summaryType: 'mean',
  },
  {
    key: 'floorAreaPerDwelling',
    genre: 'living',
    label: '1住宅あたり延べ面積',
    shortLabel: '住宅延べ面積',
    unit: 'm²',
    decimals: 1,
    descendingLabel: '住宅面積の広い順',
    ascendingLabel: '住宅面積の狭い順',
    description: '1住宅あたりの平均延べ床面積（m²）です。住まいの広さや二世帯・戸建て文化を反映します。',
    source: '総務省「住宅・土地統計調査」参考値',
    summaryType: 'mean',
  },
  {
    key: 'averageRent',
    genre: 'living',
    label: '民営賃貸家賃目安（30m²換算）',
    shortLabel: '家賃相場',
    unit: '万円',
    decimals: 2,
    descendingLabel: '家賃の高い順',
    ascendingLabel: '家賃の安い順',
    description: '1畳・1m²あたり民営借家家賃をもとに30m²（一人暮らしワンルーム〜1K相当）に換算した月額目安です。',
    source: '総務省「住宅・土地統計調査」参考値',
    summaryType: 'mean',
  },
  {
    key: 'carsPerHousehold',
    genre: 'living',
    label: '1世帯あたり乗用車保有台数',
    shortLabel: '乗用車保有数',
    unit: '台',
    decimals: 2,
    descendingLabel: '保有台数の多い順',
    ascendingLabel: '保有台数の少ない順',
    description: '1世帯あたりの自家用乗用車（軽乗用車含む）の普及台数です。1.0台超は1世帯複数台保有が一般的であることを示します。',
    source: '自動車検査登録情報協会統計参考値',
    summaryType: 'mean',
  },
  {
    key: 'commuteTimeMinutes',
    genre: 'living',
    label: '平均通勤・通学時間（往復）',
    shortLabel: '通勤・通学時間',
    unit: '分',
    decimals: 0,
    descendingLabel: '時間の長い順',
    ascendingLabel: '時間の短い順',
    description: '有業者の平日の往復通勤・通学時間の平均（分）です。首都圏・近畿圏のベッドタウンで長くなります。',
    source: '総務省「社会生活基本調査」参考値',
    summaryType: 'mean',
  },

  // 5. 医療・健康・長寿
  {
    key: 'lifeExpectancyMale',
    genre: 'health',
    label: '平均寿命（男性）',
    shortLabel: '男性平均寿命',
    unit: '歳',
    decimals: 2,
    descendingLabel: '男性寿命の長い順',
    ascendingLabel: '男性寿命の短い順',
    description: '0歳児の平均余命（男性・歳）です。生活習慣・医療アクセス・気候や食文化と深く関わります。',
    source: '厚生労働省「都道府県別生命表」参考値',
    summaryType: 'mean',
  },
  {
    key: 'lifeExpectancyFemale',
    genre: 'health',
    label: '平均寿命（女性）',
    shortLabel: '女性平均寿命',
    unit: '歳',
    decimals: 2,
    descendingLabel: '女性寿命の長い順',
    ascendingLabel: '女性寿命の短い順',
    description: '0歳児の平均余命（女性・歳）です。西日本や北陸・中部内陸で高い傾向があります。',
    source: '厚生労働省「都道府県別生命表」参考値',
    summaryType: 'mean',
  },
  {
    key: 'doctorsPer100k',
    genre: 'health',
    label: '人口10万人あたり医師数',
    shortLabel: '医師数/10万人',
    unit: '人',
    decimals: 1,
    descendingLabel: '医師数の多い順',
    ascendingLabel: '医師数の少ない順',
    description: '医療施設に従事する医師の人口10万人あたり人数です。医学部・大学病院の集積する西日本で高い傾向があります。',
    source: '厚生労働省「医師・歯科医師・薬剤師統計」参考値',
    summaryType: 'mean',
  },
  {
    key: 'hospitalBedsPer100k',
    genre: 'health',
    label: '人口10万人あたり病院病床数',
    shortLabel: '病床数/10万人',
    unit: '床',
    decimals: 0,
    descendingLabel: '病床数の多い順',
    ascendingLabel: '病床数の少ない順',
    description: '人口10万人あたりの病院病床数です。高齢化率の高い地域や西日本で充実しています。',
    source: '厚生労働省「医療施設調査」参考値',
    summaryType: 'mean',
  },

  // 6. 教育・文化・観光・食
  {
    key: 'universityAdvancementRate',
    genre: 'culture',
    label: '大学等進学率',
    shortLabel: '大学進学率',
    unit: '%',
    decimals: 1,
    descendingLabel: '進学率の高い順',
    ascendingLabel: '進学率の低い順',
    description: '高校卒業者のうち大学・短期大学等へ進学した割合（過年度卒含む）です。',
    source: '文部科学省「学校基本調査」参考値',
    summaryType: 'mean',
  },
  {
    key: 'convenienceStoresPer100k',
    genre: 'culture',
    label: '人口10万人あたりコンビニ数',
    shortLabel: 'コンビニ密度',
    unit: '店',
    decimals: 1,
    descendingLabel: '店舗密度の高い順',
    ascendingLabel: '店舗密度の低い順',
    description: '人口10万人あたりのコンビニエンスストア店舗数です。北海道（セイコーマート等）や観光・ビジネス集積地で高くなります。',
    source: '経済センサス・業界統計参考値',
    summaryType: 'mean',
  },
  {
    key: 'ramenShopsPer100k',
    genre: 'culture',
    label: '人口10万人あたりラーメン店数',
    shortLabel: 'ラーメン店密度',
    unit: '店',
    decimals: 1,
    descendingLabel: 'ラーメン店密度の高い順',
    ascendingLabel: 'ラーメン店密度の低い順',
    description: '人口10万人あたりのラーメン店（中華そば店）登録店舗数です。山形県・新潟県など東北・北陸や九州で高い値を示します。',
    source: '経済センサス・外食統計参考値',
    summaryType: 'mean',
  },
  {
    key: 'cafesPer100k',
    genre: 'culture',
    label: '人口10万人あたり喫茶・カフェ数',
    shortLabel: 'カフェ密度',
    unit: '店',
    decimals: 1,
    descendingLabel: 'カフェ密度の高い順',
    ascendingLabel: 'カフェ密度の低い順',
    description: '人口10万人あたりの喫茶店・カフェ店舗数です。モーニング文化の根強い高知・岐阜・愛知や関西圏が上位を占めます。',
    source: '経済センサス・外食統計参考値',
    summaryType: 'mean',
  },
  {
    key: 'hotelGuestsPerCapita',
    genre: 'culture',
    label: '人口1人あたり延べ宿泊者数',
    shortLabel: '観光宿泊指数',
    unit: '泊/人',
    decimals: 1,
    descendingLabel: '宿泊指数の高い順',
    ascendingLabel: '宿泊指数の低い順',
    description: '年間の観光・ビジネス延べ宿泊者数を県人口で割った観光活性度指標です。沖縄・京都・北海道・山梨・石川などが上位です。',
    source: '観光庁「宿泊旅行統計調査」参考値',
    summaryType: 'mean',
  },
];

export const METRIC_MAP: Record<MetricKey, MetricDefinition> = Object.fromEntries(
  METRIC_DEFINITIONS.map((def) => [def.key, def]),
) as Record<MetricKey, MetricDefinition>;

const RAW_EXTENSIONS: Record<string, PrefectureRawExtension> = {
  北海道: {
    code: 1, shortName: '北海道', capital: '札幌市', mapCol: 11, mapRow: 0,
    populationChangeRate: -2.9, agingRate: 32.8, youthRate: 10.6, singleHouseholdRate: 41.2,
    habitableAreaRatio: 27.6, forestRatio: 70.7, annualSunshineHours: 1740, annualPrecipitation: 1146, averageTemperature: 9.5,
    perCapitaIncome: 288, prefecturalGdp: 20.5, effectiveJobOpeningRatio: 1.12, manufacturingShipment: 6.8, agriculturalOutput: 12950,
    homeOwnershipRate: 56.8, floorAreaPerDwelling: 89.2, averageRent: 4.55, carsPerHousehold: 1.08, commuteTimeMinutes: 58,
    lifeExpectancyMale: 80.98, lifeExpectancyFemale: 87.26, doctorsPer100k: 262.4, hospitalBedsPer100k: 1620,
    universityAdvancementRate: 51.2, convenienceStoresPer100k: 56.8, ramenShopsPer100k: 39.4, cafesPer100k: 34.5, hotelGuestsPerCapita: 7.4,
  },
  青森県: {
    code: 2, shortName: '青森', capital: '青森市', mapCol: 10, mapRow: 2,
    populationChangeRate: -5.3, agingRate: 34.8, youthRate: 10.3, singleHouseholdRate: 32.4,
    habitableAreaRatio: 33.7, forestRatio: 66.0, annualSunshineHours: 1589, annualPrecipitation: 1351, averageTemperature: 10.9,
    perCapitaIncome: 266, prefecturalGdp: 4.5, effectiveJobOpeningRatio: 1.18, manufacturingShipment: 1.85, agriculturalOutput: 3320,
    homeOwnershipRate: 71.2, floorAreaPerDwelling: 120.5, averageRent: 4.20, carsPerHousehold: 1.32, commuteTimeMinutes: 52,
    lifeExpectancyMale: 79.27, lifeExpectancyFemale: 86.33, doctorsPer100k: 215.8, hospitalBedsPer100k: 1365,
    universityAdvancementRate: 45.4, convenienceStoresPer100k: 47.6, ramenShopsPer100k: 38.2, cafesPer100k: 27.4, hotelGuestsPerCapita: 3.8,
  },
  岩手県: {
    code: 3, shortName: '岩手', capital: '盛岡市', mapCol: 11, mapRow: 3,
    populationChangeRate: -5.4, agingRate: 34.5, youthRate: 10.7, singleHouseholdRate: 32.8,
    habitableAreaRatio: 24.4, forestRatio: 76.9, annualSunshineHours: 1715, annualPrecipitation: 1279, averageTemperature: 10.8,
    perCapitaIncome: 278, prefecturalGdp: 4.7, effectiveJobOpeningRatio: 1.24, manufacturingShipment: 2.65, agriculturalOutput: 2780,
    homeOwnershipRate: 71.5, floorAreaPerDwelling: 119.8, averageRent: 4.35, carsPerHousehold: 1.38, commuteTimeMinutes: 54,
    lifeExpectancyMale: 80.42, lifeExpectancyFemale: 86.94, doctorsPer100k: 214.2, hospitalBedsPer100k: 1380,
    universityAdvancementRate: 45.8, convenienceStoresPer100k: 45.2, ramenShopsPer100k: 34.6, cafesPer100k: 25.8, hotelGuestsPerCapita: 4.1,
  },
  宮城県: {
    code: 4, shortName: '宮城', capital: '仙台市', mapCol: 11, mapRow: 4,
    populationChangeRate: -1.4, agingRate: 29.1, youthRate: 11.6, singleHouseholdRate: 39.5,
    habitableAreaRatio: 43.5, forestRatio: 57.2, annualSunshineHours: 1852, annualPrecipitation: 1277, averageTemperature: 13.1,
    perCapitaIncome: 298, prefecturalGdp: 9.7, effectiveJobOpeningRatio: 1.31, manufacturingShipment: 4.75, agriculturalOutput: 1890,
    homeOwnershipRate: 60.4, floorAreaPerDwelling: 96.4, averageRent: 5.05, carsPerHousehold: 1.22, commuteTimeMinutes: 64,
    lifeExpectancyMale: 81.46, lifeExpectancyFemale: 87.52, doctorsPer100k: 256.5, hospitalBedsPer100k: 1120,
    universityAdvancementRate: 53.6, convenienceStoresPer100k: 46.8, ramenShopsPer100k: 35.1, cafesPer100k: 26.2, hotelGuestsPerCapita: 4.3,
  },
  秋田県: {
    code: 5, shortName: '秋田', capital: '秋田市', mapCol: 10, mapRow: 3,
    populationChangeRate: -6.2, agingRate: 38.6, youthRate: 9.5, singleHouseholdRate: 29.8,
    habitableAreaRatio: 27.8, forestRatio: 72.1, annualSunshineHours: 1527, annualPrecipitation: 1742, averageTemperature: 12.1,
    perCapitaIncome: 268, prefecturalGdp: 3.5, effectiveJobOpeningRatio: 1.28, manufacturingShipment: 1.62, agriculturalOutput: 1680,
    homeOwnershipRate: 79.4, floorAreaPerDwelling: 134.8, averageRent: 4.15, carsPerHousehold: 1.44, commuteTimeMinutes: 51,
    lifeExpectancyMale: 80.12, lifeExpectancyFemale: 86.88, doctorsPer100k: 251.4, hospitalBedsPer100k: 1490,
    universityAdvancementRate: 46.5, convenienceStoresPer100k: 44.5, ramenShopsPer100k: 43.8, cafesPer100k: 22.9, hotelGuestsPerCapita: 3.2,
  },
  山形県: {
    code: 6, shortName: '山形', capital: '山形市', mapCol: 10, mapRow: 4,
    populationChangeRate: -4.9, agingRate: 34.9, youthRate: 10.9, singleHouseholdRate: 28.4,
    habitableAreaRatio: 30.8, forestRatio: 71.8, annualSunshineHours: 1618, annualPrecipitation: 1206, averageTemperature: 12.4,
    perCapitaIncome: 284, prefecturalGdp: 4.3, effectiveJobOpeningRatio: 1.38, manufacturingShipment: 3.12, agriculturalOutput: 2540,
    homeOwnershipRate: 76.2, floorAreaPerDwelling: 136.2, averageRent: 4.40, carsPerHousehold: 1.64, commuteTimeMinutes: 53,
    lifeExpectancyMale: 81.25, lifeExpectancyFemale: 87.38, doctorsPer100k: 238.5, hospitalBedsPer100k: 1290,
    universityAdvancementRate: 48.2, convenienceStoresPer100k: 45.9, ramenShopsPer100k: 57.5, cafesPer100k: 24.6, hotelGuestsPerCapita: 4.5,
  },
  福島県: {
    code: 7, shortName: '福島', capital: '福島市', mapCol: 10, mapRow: 5,
    populationChangeRate: -4.2, agingRate: 33.1, youthRate: 11.1, singleHouseholdRate: 33.2,
    habitableAreaRatio: 30.6, forestRatio: 70.8, annualSunshineHours: 1820, annualPrecipitation: 1205, averageTemperature: 13.6,
    perCapitaIncome: 294, prefecturalGdp: 7.8, effectiveJobOpeningRatio: 1.35, manufacturingShipment: 5.45, agriculturalOutput: 2120,
    homeOwnershipRate: 69.5, floorAreaPerDwelling: 116.4, averageRent: 4.55, carsPerHousehold: 1.54, commuteTimeMinutes: 55,
    lifeExpectancyMale: 80.54, lifeExpectancyFemale: 86.92, doctorsPer100k: 218.6, hospitalBedsPer100k: 1340,
    universityAdvancementRate: 48.9, convenienceStoresPer100k: 47.2, ramenShopsPer100k: 40.8, cafesPer100k: 25.4, hotelGuestsPerCapita: 4.6,
  },
  茨城県: {
    code: 8, shortName: '茨城', capital: '水戸市', mapCol: 11, mapRow: 6,
    populationChangeRate: -1.7, agingRate: 30.8, youthRate: 11.4, singleHouseholdRate: 32.9,
    habitableAreaRatio: 63.8, forestRatio: 30.8, annualSunshineHours: 2015, annualPrecipitation: 1368, averageTemperature: 14.3,
    perCapitaIncome: 332, prefecturalGdp: 14.2, effectiveJobOpeningRatio: 1.34, manufacturingShipment: 12.85, agriculturalOutput: 4480,
    homeOwnershipRate: 70.4, floorAreaPerDwelling: 108.5, averageRent: 4.75, carsPerHousehold: 1.62, commuteTimeMinutes: 68,
    lifeExpectancyMale: 80.89, lifeExpectancyFemale: 87.02, doctorsPer100k: 198.4, hospitalBedsPer100k: 1060,
    universityAdvancementRate: 53.8, convenienceStoresPer100k: 47.5, ramenShopsPer100k: 31.4, cafesPer100k: 26.8, hotelGuestsPerCapita: 2.2,
  },
  栃木県: {
    code: 9, shortName: '栃木', capital: '宇都宮市', mapCol: 10, mapRow: 6,
    populationChangeRate: -2.1, agingRate: 30.4, youthRate: 11.6, singleHouseholdRate: 33.5,
    habitableAreaRatio: 46.8, forestRatio: 53.4, annualSunshineHours: 2045, annualPrecipitation: 1495, averageTemperature: 14.3,
    perCapitaIncome: 344, prefecturalGdp: 9.2, effectiveJobOpeningRatio: 1.32, manufacturingShipment: 9.45, agriculturalOutput: 2790,
    homeOwnershipRate: 69.2, floorAreaPerDwelling: 107.2, averageRent: 4.70, carsPerHousehold: 1.65, commuteTimeMinutes: 61,
    lifeExpectancyMale: 80.78, lifeExpectancyFemale: 86.95, doctorsPer100k: 232.1, hospitalBedsPer100k: 1085,
    universityAdvancementRate: 54.6, convenienceStoresPer100k: 46.4, ramenShopsPer100k: 38.9, cafesPer100k: 28.5, hotelGuestsPerCapita: 4.8,
  },
  群馬県: {
    code: 10, shortName: '群馬', capital: '前橋市', mapCol: 9, mapRow: 6,
    populationChangeRate: -1.7, agingRate: 31.2, youthRate: 11.5, singleHouseholdRate: 32.8,
    habitableAreaRatio: 35.8, forestRatio: 66.4, annualSunshineHours: 2154, annualPrecipitation: 1250, averageTemperature: 15.2,
    perCapitaIncome: 328, prefecturalGdp: 9.1, effectiveJobOpeningRatio: 1.36, manufacturingShipment: 9.12, agriculturalOutput: 2620,
    homeOwnershipRate: 70.1, floorAreaPerDwelling: 108.9, averageRent: 4.55, carsPerHousehold: 1.68, commuteTimeMinutes: 57,
    lifeExpectancyMale: 81.18, lifeExpectancyFemale: 87.22, doctorsPer100k: 236.4, hospitalBedsPer100k: 1190,
    universityAdvancementRate: 54.2, convenienceStoresPer100k: 46.1, ramenShopsPer100k: 32.5, cafesPer100k: 29.2, hotelGuestsPerCapita: 4.9,
  },
  埼玉県: {
    code: 11, shortName: '埼玉', capital: 'さいたま市', mapCol: 9, mapRow: 7,
    populationChangeRate: 1.1, agingRate: 27.4, youthRate: 11.7, singleHouseholdRate: 34.8,
    habitableAreaRatio: 68.2, forestRatio: 31.8, annualSunshineHours: 2088, annualPrecipitation: 1372, averageTemperature: 15.6,
    perCapitaIncome: 312, prefecturalGdp: 23.8, effectiveJobOpeningRatio: 1.19, manufacturingShipment: 12.10, agriculturalOutput: 1690,
    homeOwnershipRate: 64.5, floorAreaPerDwelling: 87.6, averageRent: 6.15, carsPerHousehold: 0.94, commuteTimeMinutes: 93,
    lifeExpectancyMale: 81.62, lifeExpectancyFemale: 87.35, doctorsPer100k: 177.8, hospitalBedsPer100k: 865,
    universityAdvancementRate: 60.4, convenienceStoresPer100k: 39.2, ramenShopsPer100k: 22.8, cafesPer100k: 27.6, hotelGuestsPerCapita: 0.9,
  },
  千葉県: {
    code: 12, shortName: '千葉', capital: '千葉市', mapCol: 11, mapRow: 7,
    populationChangeRate: 1.0, agingRate: 28.1, youthRate: 11.6, singleHouseholdRate: 36.2,
    habitableAreaRatio: 69.1, forestRatio: 30.2, annualSunshineHours: 1995, annualPrecipitation: 1525, averageTemperature: 16.2,
    perCapitaIncome: 315, prefecturalGdp: 21.4, effectiveJobOpeningRatio: 1.16, manufacturingShipment: 12.95, agriculturalOutput: 3820,
    homeOwnershipRate: 64.2, floorAreaPerDwelling: 89.4, averageRent: 6.05, carsPerHousehold: 0.98, commuteTimeMinutes: 95,
    lifeExpectancyMale: 81.58, lifeExpectancyFemale: 87.42, doctorsPer100k: 205.2, hospitalBedsPer100k: 930,
    universityAdvancementRate: 60.8, convenienceStoresPer100k: 41.8, ramenShopsPer100k: 24.1, cafesPer100k: 28.4, hotelGuestsPerCapita: 3.9,
  },
  東京都: {
    code: 13, shortName: '東京', capital: '新宿区', mapCol: 10, mapRow: 7,
    populationChangeRate: 3.9, agingRate: 22.8, youthRate: 11.2, singleHouseholdRate: 50.2,
    habitableAreaRatio: 64.4, forestRatio: 35.8, annualSunshineHours: 2012, annualPrecipitation: 1598, averageTemperature: 16.4,
    perCapitaIncome: 542, prefecturalGdp: 115.6, effectiveJobOpeningRatio: 1.72, manufacturingShipment: 7.45, agriculturalOutput: 260,
    homeOwnershipRate: 45.2, floorAreaPerDwelling: 65.8, averageRent: 9.45, carsPerHousehold: 0.42, commuteTimeMinutes: 86,
    lifeExpectancyMale: 81.88, lifeExpectancyFemale: 87.74, doctorsPer100k: 324.5, hospitalBedsPer100k: 910,
    universityAdvancementRate: 66.8, convenienceStoresPer100k: 49.5, ramenShopsPer100k: 30.6, cafesPer100k: 54.2, hotelGuestsPerCapita: 6.8,
  },
  神奈川県: {
    code: 14, shortName: '神奈川', capital: '横浜市', mapCol: 10, mapRow: 8,
    populationChangeRate: 1.2, agingRate: 25.9, youthRate: 11.7, singleHouseholdRate: 39.8,
    habitableAreaRatio: 61.2, forestRatio: 39.1, annualSunshineHours: 2048, annualPrecipitation: 1688, averageTemperature: 16.3,
    perCapitaIncome: 336, prefecturalGdp: 35.2, effectiveJobOpeningRatio: 1.14, manufacturingShipment: 16.80, agriculturalOutput: 680,
    homeOwnershipRate: 58.6, floorAreaPerDwelling: 79.4, averageRent: 7.25, carsPerHousehold: 0.68, commuteTimeMinutes: 98,
    lifeExpectancyMale: 82.04, lifeExpectancyFemale: 87.82, doctorsPer100k: 224.6, hospitalBedsPer100k: 820,
    universityAdvancementRate: 63.9, convenienceStoresPer100k: 40.5, ramenShopsPer100k: 23.9, cafesPer100k: 36.8, hotelGuestsPerCapita: 2.8,
  },
  新潟県: {
    code: 15, shortName: '新潟', capital: '新潟市', mapCol: 9, mapRow: 4,
    populationChangeRate: -4.5, agingRate: 33.8, youthRate: 10.9, singleHouseholdRate: 31.2,
    habitableAreaRatio: 36.2, forestRatio: 68.1, annualSunshineHours: 1639, annualPrecipitation: 1845, averageTemperature: 13.9,
    perCapitaIncome: 292, prefecturalGdp: 9.0, effectiveJobOpeningRatio: 1.46, manufacturingShipment: 4.95, agriculturalOutput: 2580,
    homeOwnershipRate: 74.8, floorAreaPerDwelling: 131.6, averageRent: 4.50, carsPerHousehold: 1.48, commuteTimeMinutes: 54,
    lifeExpectancyMale: 81.36, lifeExpectancyFemale: 87.58, doctorsPer100k: 209.4, hospitalBedsPer100k: 1210,
    universityAdvancementRate: 49.8, convenienceStoresPer100k: 43.8, ramenShopsPer100k: 48.6, cafesPer100k: 28.4, hotelGuestsPerCapita: 4.4,
  },
  富山県: {
    code: 16, shortName: '富山', capital: '富山市', mapCol: 8, mapRow: 5,
    populationChangeRate: -3.0, agingRate: 33.4, youthRate: 11.1, singleHouseholdRate: 29.6,
    habitableAreaRatio: 43.6, forestRatio: 66.8, annualSunshineHours: 1647, annualPrecipitation: 2320, averageTemperature: 14.3,
    perCapitaIncome: 334, prefecturalGdp: 4.8, effectiveJobOpeningRatio: 1.52, manufacturingShipment: 3.92, agriculturalOutput: 680,
    homeOwnershipRate: 76.8, floorAreaPerDwelling: 142.4, averageRent: 4.45, carsPerHousehold: 1.71, commuteTimeMinutes: 52,
    lifeExpectancyMale: 81.52, lifeExpectancyFemale: 87.68, doctorsPer100k: 268.2, hospitalBedsPer100k: 1480,
    universityAdvancementRate: 55.4, convenienceStoresPer100k: 42.1, ramenShopsPer100k: 34.2, cafesPer100k: 36.4, hotelGuestsPerCapita: 3.6,
  },
  石川県: {
    code: 17, shortName: '石川', capital: '金沢市', mapCol: 7, mapRow: 4,
    populationChangeRate: -1.9, agingRate: 30.6, youthRate: 11.8, singleHouseholdRate: 36.4,
    habitableAreaRatio: 33.4, forestRatio: 68.5, annualSunshineHours: 1694, annualPrecipitation: 2402, averageTemperature: 14.8,
    perCapitaIncome: 314, prefecturalGdp: 4.9, effectiveJobOpeningRatio: 1.56, manufacturingShipment: 3.15, agriculturalOutput: 540,
    homeOwnershipRate: 68.4, floorAreaPerDwelling: 121.2, averageRent: 4.75, carsPerHousehold: 1.49, commuteTimeMinutes: 53,
    lifeExpectancyMale: 81.76, lifeExpectancyFemale: 87.84, doctorsPer100k: 298.5, hospitalBedsPer100k: 1520,
    universityAdvancementRate: 57.6, convenienceStoresPer100k: 44.2, ramenShopsPer100k: 31.8, cafesPer100k: 44.8, hotelGuestsPerCapita: 7.2,
  },
  福井県: {
    code: 18, shortName: '福井', capital: '福井市', mapCol: 7, mapRow: 5,
    populationChangeRate: -2.6, agingRate: 31.5, youthRate: 12.1, singleHouseholdRate: 29.2,
    habitableAreaRatio: 25.8, forestRatio: 74.8, annualSunshineHours: 1680, annualPrecipitation: 2295, averageTemperature: 14.7,
    perCapitaIncome: 338, prefecturalGdp: 3.6, effectiveJobOpeningRatio: 1.82, manufacturingShipment: 2.52, agriculturalOutput: 460,
    homeOwnershipRate: 75.4, floorAreaPerDwelling: 138.6, averageRent: 4.40, carsPerHousehold: 1.75, commuteTimeMinutes: 50,
    lifeExpectancyMale: 81.95, lifeExpectancyFemale: 87.88, doctorsPer100k: 264.8, hospitalBedsPer100k: 1440,
    universityAdvancementRate: 56.8, convenienceStoresPer100k: 41.5, ramenShopsPer100k: 29.4, cafesPer100k: 42.6, hotelGuestsPerCapita: 4.0,
  },
  山梨県: {
    code: 19, shortName: '山梨', capital: '甲府市', mapCol: 9, mapRow: 8,
    populationChangeRate: -3.0, agingRate: 31.8, youthRate: 11.3, singleHouseholdRate: 33.8,
    habitableAreaRatio: 21.4, forestRatio: 77.8, annualSunshineHours: 2226, annualPrecipitation: 1135, averageTemperature: 15.1,
    perCapitaIncome: 318, prefecturalGdp: 3.6, effectiveJobOpeningRatio: 1.38, manufacturingShipment: 2.98, agriculturalOutput: 1080,
    homeOwnershipRate: 68.8, floorAreaPerDwelling: 109.4, averageRent: 4.65, carsPerHousehold: 1.56, commuteTimeMinutes: 58,
    lifeExpectancyMale: 81.64, lifeExpectancyFemale: 87.66, doctorsPer100k: 254.2, hospitalBedsPer100k: 1260,
    universityAdvancementRate: 59.2, convenienceStoresPer100k: 51.4, ramenShopsPer100k: 31.2, cafesPer100k: 41.2, hotelGuestsPerCapita: 8.6,
  },
  長野県: {
    code: 20, shortName: '長野', capital: '長野市', mapCol: 8, mapRow: 6,
    populationChangeRate: -2.4, agingRate: 32.6, youthRate: 11.6, singleHouseholdRate: 31.5,
    habitableAreaRatio: 24.2, forestRatio: 78.4, annualSunshineHours: 2058, annualPrecipitation: 965, averageTemperature: 12.3,
    perCapitaIncome: 310, prefecturalGdp: 8.6, effectiveJobOpeningRatio: 1.44, manufacturingShipment: 6.65, agriculturalOutput: 2920,
    homeOwnershipRate: 71.8, floorAreaPerDwelling: 122.4, averageRent: 4.55, carsPerHousehold: 1.61, commuteTimeMinutes: 55,
    lifeExpectancyMale: 82.68, lifeExpectancyFemale: 88.23, doctorsPer100k: 244.6, hospitalBedsPer100k: 1150,
    universityAdvancementRate: 53.4, convenienceStoresPer100k: 43.6, ramenShopsPer100k: 33.8, cafesPer100k: 36.2, hotelGuestsPerCapita: 7.5,
  },
  岐阜県: {
    code: 21, shortName: '岐阜', capital: '岐阜市', mapCol: 7, mapRow: 6,
    populationChangeRate: -2.6, agingRate: 31.1, youthRate: 11.8, singleHouseholdRate: 30.2,
    habitableAreaRatio: 20.8, forestRatio: 81.2, annualSunshineHours: 2108, annualPrecipitation: 1860, averageTemperature: 16.2,
    perCapitaIncome: 306, prefecturalGdp: 8.1, effectiveJobOpeningRatio: 1.48, manufacturingShipment: 6.12, agriculturalOutput: 1180,
    homeOwnershipRate: 72.6, floorAreaPerDwelling: 121.8, averageRent: 4.60, carsPerHousehold: 1.60, commuteTimeMinutes: 64,
    lifeExpectancyMale: 81.68, lifeExpectancyFemale: 87.48, doctorsPer100k: 228.4, hospitalBedsPer100k: 1050,
    universityAdvancementRate: 55.8, convenienceStoresPer100k: 41.2, ramenShopsPer100k: 28.6, cafesPer100k: 88.4, hotelGuestsPerCapita: 3.4,
  },
  静岡県: {
    code: 22, shortName: '静岡', capital: '静岡市', mapCol: 8, mapRow: 8,
    populationChangeRate: -1.8, agingRate: 30.6, youthRate: 11.7, singleHouseholdRate: 33.4,
    habitableAreaRatio: 35.4, forestRatio: 64.2, annualSunshineHours: 2165, annualPrecipitation: 2328, averageTemperature: 16.9,
    perCapitaIncome: 342, prefecturalGdp: 17.8, effectiveJobOpeningRatio: 1.29, manufacturingShipment: 17.40, agriculturalOutput: 2180,
    homeOwnershipRate: 66.8, floorAreaPerDwelling: 102.6, averageRent: 5.05, carsPerHousehold: 1.42, commuteTimeMinutes: 58,
    lifeExpectancyMale: 81.72, lifeExpectancyFemale: 87.56, doctorsPer100k: 219.5, hospitalBedsPer100k: 1020,
    universityAdvancementRate: 55.2, convenienceStoresPer100k: 44.8, ramenShopsPer100k: 27.9, cafesPer100k: 33.8, hotelGuestsPerCapita: 5.9,
  },
  愛知県: {
    code: 23, shortName: '愛知', capital: '名古屋市', mapCol: 7, mapRow: 7,
    populationChangeRate: 0.8, agingRate: 25.6, youthRate: 12.6, singleHouseholdRate: 38.6,
    habitableAreaRatio: 58.2, forestRatio: 42.1, annualSunshineHours: 2142, annualPrecipitation: 1578, averageTemperature: 16.2,
    perCapitaIncome: 368, prefecturalGdp: 41.2, effectiveJobOpeningRatio: 1.41, manufacturingShipment: 48.20, agriculturalOutput: 2980,
    homeOwnershipRate: 59.4, floorAreaPerDwelling: 92.8, averageRent: 5.65, carsPerHousehold: 1.24, commuteTimeMinutes: 68,
    lifeExpectancyMale: 81.82, lifeExpectancyFemale: 87.54, doctorsPer100k: 232.8, hospitalBedsPer100k: 940,
    universityAdvancementRate: 60.2, convenienceStoresPer100k: 45.2, ramenShopsPer100k: 26.8, cafesPer100k: 76.5, hotelGuestsPerCapita: 2.9,
  },
  三重県: {
    code: 24, shortName: '三重', capital: '津市', mapCol: 6, mapRow: 8,
    populationChangeRate: -2.5, agingRate: 30.8, youthRate: 11.7, singleHouseholdRate: 32.6,
    habitableAreaRatio: 35.6, forestRatio: 64.4, annualSunshineHours: 2085, annualPrecipitation: 1654, averageTemperature: 16.3,
    perCapitaIncome: 336, prefecturalGdp: 8.4, effectiveJobOpeningRatio: 1.35, manufacturingShipment: 11.20, agriculturalOutput: 1320,
    homeOwnershipRate: 71.2, floorAreaPerDwelling: 112.4, averageRent: 4.65, carsPerHousehold: 1.52, commuteTimeMinutes: 63,
    lifeExpectancyMale: 81.66, lifeExpectancyFemale: 87.46, doctorsPer100k: 239.4, hospitalBedsPer100k: 1130,
    universityAdvancementRate: 54.8, convenienceStoresPer100k: 43.1, ramenShopsPer100k: 24.8, cafesPer100k: 48.2, hotelGuestsPerCapita: 4.7,
  },
  滋賀県: {
    code: 25, shortName: '滋賀', capital: '大津市', mapCol: 6, mapRow: 6,
    populationChangeRate: 0.1, agingRate: 26.8, youthRate: 13.4, singleHouseholdRate: 33.4,
    habitableAreaRatio: 32.8, forestRatio: 50.6, annualSunshineHours: 1892, annualPrecipitation: 1580, averageTemperature: 15.1,
    perCapitaIncome: 338, prefecturalGdp: 6.8, effectiveJobOpeningRatio: 1.24, manufacturingShipment: 8.35, agriculturalOutput: 580,
    homeOwnershipRate: 69.4, floorAreaPerDwelling: 112.8, averageRent: 5.05, carsPerHousehold: 1.38, commuteTimeMinutes: 72,
    lifeExpectancyMale: 82.73, lifeExpectancyFemale: 88.26, doctorsPer100k: 246.2, hospitalBedsPer100k: 1040,
    universityAdvancementRate: 59.6, convenienceStoresPer100k: 39.8, ramenShopsPer100k: 25.4, cafesPer100k: 36.8, hotelGuestsPerCapita: 3.3,
  },
  京都府: {
    code: 26, shortName: '京都', capital: '京都市', mapCol: 5, mapRow: 6,
    populationChangeRate: -1.2, agingRate: 29.4, youthRate: 11.3, singleHouseholdRate: 44.8,
    habitableAreaRatio: 25.4, forestRatio: 74.2, annualSunshineHours: 1865, annualPrecipitation: 1522, averageTemperature: 16.2,
    perCapitaIncome: 312, prefecturalGdp: 11.2, effectiveJobOpeningRatio: 1.32, manufacturingShipment: 5.85, agriculturalOutput: 640,
    homeOwnershipRate: 57.2, floorAreaPerDwelling: 86.4, averageRent: 6.10, carsPerHousehold: 0.84, commuteTimeMinutes: 71,
    lifeExpectancyMale: 82.24, lifeExpectancyFemale: 88.25, doctorsPer100k: 332.8, hospitalBedsPer100k: 1320,
    universityAdvancementRate: 67.2, convenienceStoresPer100k: 41.6, ramenShopsPer100k: 29.8, cafesPer100k: 58.4, hotelGuestsPerCapita: 11.4,
  },
  大阪府: {
    code: 27, shortName: '大阪', capital: '大阪市', mapCol: 5, mapRow: 7,
    populationChangeRate: 0.0, agingRate: 27.9, youthRate: 11.4, singleHouseholdRate: 44.2,
    habitableAreaRatio: 70.4, forestRatio: 30.1, annualSunshineHours: 2048, annualPrecipitation: 1338, averageTemperature: 17.1,
    perCapitaIncome: 332, prefecturalGdp: 42.4, effectiveJobOpeningRatio: 1.28, manufacturingShipment: 17.65, agriculturalOutput: 310,
    homeOwnershipRate: 52.8, floorAreaPerDwelling: 76.2, averageRent: 6.45, carsPerHousehold: 0.62, commuteTimeMinutes: 76,
    lifeExpectancyMale: 81.10, lifeExpectancyFemale: 87.32, doctorsPer100k: 298.6, hospitalBedsPer100k: 1180,
    universityAdvancementRate: 62.4, convenienceStoresPer100k: 43.4, ramenShopsPer100k: 26.2, cafesPer100k: 72.4, hotelGuestsPerCapita: 5.8,
  },
  兵庫県: {
    code: 28, shortName: '兵庫', capital: '神戸市', mapCol: 4, mapRow: 6,
    populationChangeRate: -1.3, agingRate: 29.5, youthRate: 11.9, singleHouseholdRate: 36.8,
    habitableAreaRatio: 33.2, forestRatio: 67.1, annualSunshineHours: 2064, annualPrecipitation: 1278, averageTemperature: 17.0,
    perCapitaIncome: 308, prefecturalGdp: 22.1, effectiveJobOpeningRatio: 1.12, manufacturingShipment: 15.40, agriculturalOutput: 1480,
    homeOwnershipRate: 62.8, floorAreaPerDwelling: 92.4, averageRent: 5.75, carsPerHousehold: 0.92, commuteTimeMinutes: 78,
    lifeExpectancyMale: 81.74, lifeExpectancyFemale: 87.64, doctorsPer100k: 268.4, hospitalBedsPer100k: 1160,
    universityAdvancementRate: 63.2, convenienceStoresPer100k: 38.6, ramenShopsPer100k: 23.4, cafesPer100k: 64.2, hotelGuestsPerCapita: 3.1,
  },
  奈良県: {
    code: 29, shortName: '奈良', capital: '奈良市', mapCol: 6, mapRow: 7,
    populationChangeRate: -2.9, agingRate: 32.2, youthRate: 11.5, singleHouseholdRate: 30.8,
    habitableAreaRatio: 23.1, forestRatio: 76.8, annualSunshineHours: 1924, annualPrecipitation: 1365, averageTemperature: 15.2,
    perCapitaIncome: 274, prefecturalGdp: 3.8, effectiveJobOpeningRatio: 1.18, manufacturingShipment: 2.15, agriculturalOutput: 410,
    homeOwnershipRate: 71.6, floorAreaPerDwelling: 110.2, averageRent: 4.95, carsPerHousehold: 1.12, commuteTimeMinutes: 86,
    lifeExpectancyMale: 82.40, lifeExpectancyFemale: 87.98, doctorsPer100k: 272.5, hospitalBedsPer100k: 1210,
    universityAdvancementRate: 62.8, convenienceStoresPer100k: 36.4, ramenShopsPer100k: 22.6, cafesPer100k: 46.8, hotelGuestsPerCapita: 2.4,
  },
  和歌山県: {
    code: 30, shortName: '和歌山', capital: '和歌山市', mapCol: 5, mapRow: 8,
    populationChangeRate: -4.3, agingRate: 33.8, youthRate: 11.2, singleHouseholdRate: 32.4,
    habitableAreaRatio: 23.6, forestRatio: 76.9, annualSunshineHours: 2116, annualPrecipitation: 1412, averageTemperature: 16.8,
    perCapitaIncome: 292, prefecturalGdp: 3.7, effectiveJobOpeningRatio: 1.22, manufacturingShipment: 3.25, agriculturalOutput: 1120,
    homeOwnershipRate: 70.8, floorAreaPerDwelling: 105.6, averageRent: 4.45, carsPerHousehold: 1.32, commuteTimeMinutes: 58,
    lifeExpectancyMale: 80.92, lifeExpectancyFemale: 87.18, doctorsPer100k: 316.4, hospitalBedsPer100k: 1460,
    universityAdvancementRate: 53.2, convenienceStoresPer100k: 39.2, ramenShopsPer100k: 28.4, cafesPer100k: 68.5, hotelGuestsPerCapita: 4.9,
  },
  鳥取県: {
    code: 31, shortName: '鳥取', capital: '鳥取市', mapCol: 3, mapRow: 5,
    populationChangeRate: -3.5, agingRate: 33.2, youthRate: 12.1, singleHouseholdRate: 31.8,
    habitableAreaRatio: 25.8, forestRatio: 73.6, annualSunshineHours: 1712, annualPrecipitation: 1932, averageTemperature: 15.1,
    perCapitaIncome: 264, prefecturalGdp: 1.9, effectiveJobOpeningRatio: 1.42, manufacturingShipment: 0.98, agriculturalOutput: 760,
    homeOwnershipRate: 70.2, floorAreaPerDwelling: 121.4, averageRent: 4.35, carsPerHousehold: 1.48, commuteTimeMinutes: 50,
    lifeExpectancyMale: 81.18, lifeExpectancyFemale: 87.72, doctorsPer100k: 328.4, hospitalBedsPer100k: 1580,
    universityAdvancementRate: 50.4, convenienceStoresPer100k: 42.6, ramenShopsPer100k: 31.6, cafesPer100k: 42.4, hotelGuestsPerCapita: 4.6,
  },
  島根県: {
    code: 32, shortName: '島根', capital: '松江市', mapCol: 2, mapRow: 5,
    populationChangeRate: -3.3, agingRate: 34.7, youthRate: 12.0, singleHouseholdRate: 31.6,
    habitableAreaRatio: 19.4, forestRatio: 78.6, annualSunshineHours: 1718, annualPrecipitation: 1795, averageTemperature: 15.1,
    perCapitaIncome: 272, prefecturalGdp: 2.5, effectiveJobOpeningRatio: 1.54, manufacturingShipment: 1.18, agriculturalOutput: 620,
    homeOwnershipRate: 71.4, floorAreaPerDwelling: 123.8, averageRent: 4.45, carsPerHousehold: 1.46, commuteTimeMinutes: 51,
    lifeExpectancyMale: 81.48, lifeExpectancyFemale: 88.06, doctorsPer100k: 312.6, hospitalBedsPer100k: 1590,
    universityAdvancementRate: 50.8, convenienceStoresPer100k: 41.8, ramenShopsPer100k: 26.8, cafesPer100k: 34.2, hotelGuestsPerCapita: 4.3,
  },
  岡山県: {
    code: 33, shortName: '岡山', capital: '岡山市', mapCol: 3, mapRow: 6,
    populationChangeRate: -1.7, agingRate: 30.8, youthRate: 12.3, singleHouseholdRate: 35.6,
    habitableAreaRatio: 31.2, forestRatio: 68.1, annualSunshineHours: 2095, annualPrecipitation: 1142, averageTemperature: 16.0,
    perCapitaIncome: 298, prefecturalGdp: 8.1, effectiveJobOpeningRatio: 1.52, manufacturingShipment: 8.45, agriculturalOutput: 1380,
    homeOwnershipRate: 65.4, floorAreaPerDwelling: 106.2, averageRent: 4.75, carsPerHousehold: 1.42, commuteTimeMinutes: 56,
    lifeExpectancyMale: 81.78, lifeExpectancyFemale: 88.29, doctorsPer100k: 322.4, hospitalBedsPer100k: 1450,
    universityAdvancementRate: 57.4, convenienceStoresPer100k: 43.2, ramenShopsPer100k: 28.2, cafesPer100k: 39.6, hotelGuestsPerCapita: 2.9,
  },
  広島県: {
    code: 34, shortName: '広島', capital: '広島市', mapCol: 2, mapRow: 6,
    populationChangeRate: -1.5, agingRate: 29.8, youthRate: 12.4, singleHouseholdRate: 37.8,
    habitableAreaRatio: 27.2, forestRatio: 72.1, annualSunshineHours: 2042, annualPrecipitation: 1538, averageTemperature: 16.3,
    perCapitaIncome: 316, prefecturalGdp: 11.9, effectiveJobOpeningRatio: 1.49, manufacturingShipment: 9.85, agriculturalOutput: 1090,
    homeOwnershipRate: 61.2, floorAreaPerDwelling: 94.8, averageRent: 5.25, carsPerHousehold: 1.18, commuteTimeMinutes: 61,
    lifeExpectancyMale: 81.86, lifeExpectancyFemale: 88.12, doctorsPer100k: 278.5, hospitalBedsPer100k: 1380,
    universityAdvancementRate: 60.6, convenienceStoresPer100k: 42.8, ramenShopsPer100k: 27.4, cafesPer100k: 41.8, hotelGuestsPerCapita: 3.7,
  },
  山口県: {
    code: 35, shortName: '山口', capital: '山口市', mapCol: 1, mapRow: 6,
    populationChangeRate: -4.4, agingRate: 35.1, youthRate: 11.2, singleHouseholdRate: 34.8,
    habitableAreaRatio: 28.4, forestRatio: 71.4, annualSunshineHours: 1938, annualPrecipitation: 1848, averageTemperature: 15.6,
    perCapitaIncome: 324, prefecturalGdp: 6.4, effectiveJobOpeningRatio: 1.46, manufacturingShipment: 6.85, agriculturalOutput: 680,
    homeOwnershipRate: 67.2, floorAreaPerDwelling: 106.8, averageRent: 4.50, carsPerHousehold: 1.36, commuteTimeMinutes: 53,
    lifeExpectancyMale: 81.08, lifeExpectancyFemale: 87.52, doctorsPer100k: 274.2, hospitalBedsPer100k: 1780,
    universityAdvancementRate: 51.6, convenienceStoresPer100k: 42.4, ramenShopsPer100k: 25.2, cafesPer100k: 31.4, hotelGuestsPerCapita: 3.3,
  },
  徳島県: {
    code: 36, shortName: '徳島', capital: '徳島市', mapCol: 4, mapRow: 8,
    populationChangeRate: -4.8, agingRate: 34.6, youthRate: 11.0, singleHouseholdRate: 33.4,
    habitableAreaRatio: 24.6, forestRatio: 75.4, annualSunshineHours: 2106, annualPrecipitation: 1662, averageTemperature: 16.8,
    perCapitaIncome: 308, prefecturalGdp: 3.1, effectiveJobOpeningRatio: 1.28, manufacturingShipment: 1.98, agriculturalOutput: 980,
    homeOwnershipRate: 70.4, floorAreaPerDwelling: 112.6, averageRent: 4.35, carsPerHousehold: 1.46, commuteTimeMinutes: 51,
    lifeExpectancyMale: 81.02, lifeExpectancyFemale: 87.36, doctorsPer100k: 338.4, hospitalBedsPer100k: 1820,
    universityAdvancementRate: 54.4, convenienceStoresPer100k: 41.2, ramenShopsPer100k: 33.4, cafesPer100k: 56.2, hotelGuestsPerCapita: 2.9,
  },
  香川県: {
    code: 37, shortName: '香川', capital: '高松市', mapCol: 4, mapRow: 7,
    populationChangeRate: -2.7, agingRate: 32.4, youthRate: 11.8, singleHouseholdRate: 34.2,
    habitableAreaRatio: 53.6, forestRatio: 46.4, annualSunshineHours: 2082, annualPrecipitation: 1150, averageTemperature: 16.6,
    perCapitaIncome: 304, prefecturalGdp: 3.9, effectiveJobOpeningRatio: 1.54, manufacturingShipment: 2.75, agriculturalOutput: 780,
    homeOwnershipRate: 67.8, floorAreaPerDwelling: 108.4, averageRent: 4.55, carsPerHousehold: 1.44, commuteTimeMinutes: 53,
    lifeExpectancyMale: 81.56, lifeExpectancyFemale: 87.72, doctorsPer100k: 304.6, hospitalBedsPer100k: 1560,
    universityAdvancementRate: 56.2, convenienceStoresPer100k: 42.6, ramenShopsPer100k: 21.8, cafesPer100k: 54.8, hotelGuestsPerCapita: 4.2,
  },
  愛媛県: {
    code: 38, shortName: '愛媛', capital: '松山市', mapCol: 3, mapRow: 7,
    populationChangeRate: -3.6, agingRate: 33.6, youthRate: 11.4, singleHouseholdRate: 35.8,
    habitableAreaRatio: 29.4, forestRatio: 70.6, annualSunshineHours: 2048, annualPrecipitation: 1396, averageTemperature: 16.8,
    perCapitaIncome: 278, prefecturalGdp: 5.1, effectiveJobOpeningRatio: 1.38, manufacturingShipment: 4.45, agriculturalOutput: 1240,
    homeOwnershipRate: 66.2, floorAreaPerDwelling: 102.8, averageRent: 4.40, carsPerHousehold: 1.28, commuteTimeMinutes: 52,
    lifeExpectancyMale: 81.14, lifeExpectancyFemale: 87.48, doctorsPer100k: 288.2, hospitalBedsPer100k: 1640,
    universityAdvancementRate: 54.6, convenienceStoresPer100k: 41.8, ramenShopsPer100k: 25.6, cafesPer100k: 52.4, hotelGuestsPerCapita: 3.4,
  },
  高知県: {
    code: 39, shortName: '高知', capital: '高知市', mapCol: 3, mapRow: 8,
    populationChangeRate: -5.1, agingRate: 36.2, youthRate: 10.8, singleHouseholdRate: 37.4,
    habitableAreaRatio: 16.4, forestRatio: 83.8, annualSunshineHours: 2184, annualPrecipitation: 2666, averageTemperature: 17.3,
    perCapitaIncome: 262, prefecturalGdp: 2.4, effectiveJobOpeningRatio: 1.18, manufacturingShipment: 0.62, agriculturalOutput: 1120,
    homeOwnershipRate: 65.8, floorAreaPerDwelling: 96.4, averageRent: 4.35, carsPerHousehold: 1.28, commuteTimeMinutes: 50,
    lifeExpectancyMale: 80.86, lifeExpectancyFemale: 87.58, doctorsPer100k: 334.2, hospitalBedsPer100k: 2420,
    universityAdvancementRate: 51.8, convenienceStoresPer100k: 43.4, ramenShopsPer100k: 27.8, cafesPer100k: 118.4, hotelGuestsPerCapita: 4.5,
  },
  福岡県: {
    code: 40, shortName: '福岡', capital: '福岡市', mapCol: 1, mapRow: 7,
    populationChangeRate: 0.7, agingRate: 28.2, youthRate: 13.0, singleHouseholdRate: 41.8,
    habitableAreaRatio: 55.6, forestRatio: 44.5, annualSunshineHours: 1889, annualPrecipitation: 1685, averageTemperature: 17.3,
    perCapitaIncome: 298, prefecturalGdp: 20.2, effectiveJobOpeningRatio: 1.24, manufacturingShipment: 9.85, agriculturalOutput: 2240,
    homeOwnershipRate: 53.6, floorAreaPerDwelling: 86.2, averageRent: 5.35, carsPerHousehold: 1.06, commuteTimeMinutes: 64,
    lifeExpectancyMale: 81.32, lifeExpectancyFemale: 87.74, doctorsPer100k: 318.6, hospitalBedsPer100k: 1680,
    universityAdvancementRate: 57.8, convenienceStoresPer100k: 44.6, ramenShopsPer100k: 33.2, cafesPer100k: 34.8, hotelGuestsPerCapita: 4.4,
  },
  佐賀県: {
    code: 41, shortName: '佐賀', capital: '佐賀市', mapCol: 0, mapRow: 7,
    populationChangeRate: -2.6, agingRate: 31.4, youthRate: 13.4, singleHouseholdRate: 29.8,
    habitableAreaRatio: 54.8, forestRatio: 45.2, annualSunshineHours: 1962, annualPrecipitation: 1952, averageTemperature: 16.9,
    perCapitaIncome: 278, prefecturalGdp: 3.1, effectiveJobOpeningRatio: 1.32, manufacturingShipment: 2.18, agriculturalOutput: 1380,
    homeOwnershipRate: 68.4, floorAreaPerDwelling: 114.6, averageRent: 4.45, carsPerHousehold: 1.48, commuteTimeMinutes: 54,
    lifeExpectancyMale: 81.22, lifeExpectancyFemale: 87.68, doctorsPer100k: 286.4, hospitalBedsPer100k: 1790,
    universityAdvancementRate: 49.6, convenienceStoresPer100k: 43.2, ramenShopsPer100k: 31.4, cafesPer100k: 28.6, hotelGuestsPerCapita: 3.1,
  },
  長崎県: {
    code: 42, shortName: '長崎', capital: '長崎市', mapCol: 0, mapRow: 8,
    populationChangeRate: -4.7, agingRate: 33.8, youthRate: 12.4, singleHouseholdRate: 34.2,
    habitableAreaRatio: 39.8, forestRatio: 60.1, annualSunshineHours: 1912, annualPrecipitation: 1895, averageTemperature: 17.4,
    perCapitaIncome: 266, prefecturalGdp: 4.6, effectiveJobOpeningRatio: 1.26, manufacturingShipment: 1.65, agriculturalOutput: 1460,
    homeOwnershipRate: 65.2, floorAreaPerDwelling: 98.4, averageRent: 4.55, carsPerHousehold: 1.18, commuteTimeMinutes: 55,
    lifeExpectancyMale: 81.04, lifeExpectancyFemale: 87.56, doctorsPer100k: 322.8, hospitalBedsPer100k: 1920,
    universityAdvancementRate: 50.8, convenienceStoresPer100k: 40.8, ramenShopsPer100k: 24.6, cafesPer100k: 29.4, hotelGuestsPerCapita: 5.2,
  },
  熊本県: {
    code: 43, shortName: '熊本', capital: '熊本市', mapCol: 1, mapRow: 8,
    populationChangeRate: -2.7, agingRate: 32.1, youthRate: 13.1, singleHouseholdRate: 34.6,
    habitableAreaRatio: 37.6, forestRatio: 62.8, annualSunshineHours: 2015, annualPrecipitation: 2042, averageTemperature: 17.2,
    perCapitaIncome: 282, prefecturalGdp: 6.4, effectiveJobOpeningRatio: 1.34, manufacturingShipment: 3.45, agriculturalOutput: 3480,
    homeOwnershipRate: 64.2, floorAreaPerDwelling: 102.6, averageRent: 4.55, carsPerHousehold: 1.36, commuteTimeMinutes: 56,
    lifeExpectancyMale: 81.68, lifeExpectancyFemale: 88.02, doctorsPer100k: 312.4, hospitalBedsPer100k: 1960,
    universityAdvancementRate: 51.4, convenienceStoresPer100k: 43.8, ramenShopsPer100k: 31.8, cafesPer100k: 27.8, hotelGuestsPerCapita: 4.3,
  },
  大分県: {
    code: 44, shortName: '大分', capital: '大分市', mapCol: 2, mapRow: 8,
    populationChangeRate: -3.6, agingRate: 33.8, youthRate: 11.8, singleHouseholdRate: 35.4,
    habitableAreaRatio: 28.4, forestRatio: 71.4, annualSunshineHours: 2036, annualPrecipitation: 1712, averageTemperature: 16.8,
    perCapitaIncome: 286, prefecturalGdp: 4.6, effectiveJobOpeningRatio: 1.36, manufacturingShipment: 4.65, agriculturalOutput: 1280,
    homeOwnershipRate: 64.8, floorAreaPerDwelling: 101.8, averageRent: 4.45, carsPerHousehold: 1.34, commuteTimeMinutes: 53,
    lifeExpectancyMale: 81.58, lifeExpectancyFemale: 87.84, doctorsPer100k: 294.6, hospitalBedsPer100k: 1750,
    universityAdvancementRate: 51.8, convenienceStoresPer100k: 43.4, ramenShopsPer100k: 29.6, cafesPer100k: 28.2, hotelGuestsPerCapita: 6.9,
  },
  宮崎県: {
    code: 45, shortName: '宮崎', capital: '宮崎市', mapCol: 2, mapRow: 9,
    populationChangeRate: -3.1, agingRate: 33.4, youthRate: 12.8, singleHouseholdRate: 34.2,
    habitableAreaRatio: 24.2, forestRatio: 75.8, annualSunshineHours: 2178, annualPrecipitation: 2625, averageTemperature: 17.7,
    perCapitaIncome: 262, prefecturalGdp: 3.8, effectiveJobOpeningRatio: 1.32, manufacturingShipment: 1.72, agriculturalOutput: 3460,
    homeOwnershipRate: 66.4, floorAreaPerDwelling: 99.2, averageRent: 4.25, carsPerHousehold: 1.42, commuteTimeMinutes: 50,
    lifeExpectancyMale: 81.16, lifeExpectancyFemale: 87.64, doctorsPer100k: 266.8, hospitalBedsPer100k: 1760,
    universityAdvancementRate: 46.8, convenienceStoresPer100k: 44.2, ramenShopsPer100k: 28.8, cafesPer100k: 29.6, hotelGuestsPerCapita: 3.8,
  },
  鹿児島県: {
    code: 46, shortName: '鹿児島', capital: '鹿児島市', mapCol: 1, mapRow: 9,
    populationChangeRate: -3.6, agingRate: 33.2, youthRate: 12.9, singleHouseholdRate: 37.8,
    habitableAreaRatio: 35.8, forestRatio: 64.2, annualSunshineHours: 2042, annualPrecipitation: 2435, averageTemperature: 18.8,
    perCapitaIncome: 268, prefecturalGdp: 5.7, effectiveJobOpeningRatio: 1.25, manufacturingShipment: 2.38, agriculturalOutput: 5120,
    homeOwnershipRate: 64.6, floorAreaPerDwelling: 94.8, averageRent: 4.35, carsPerHousehold: 1.32, commuteTimeMinutes: 52,
    lifeExpectancyMale: 80.88, lifeExpectancyFemale: 87.44, doctorsPer100k: 296.4, hospitalBedsPer100k: 2040,
    universityAdvancementRate: 47.6, convenienceStoresPer100k: 45.2, ramenShopsPer100k: 36.4, cafesPer100k: 26.8, hotelGuestsPerCapita: 4.6,
  },
  沖縄県: {
    code: 47, shortName: '沖縄', capital: '那覇市', mapCol: 0, mapRow: 10,
    populationChangeRate: 2.4, agingRate: 23.1, youthRate: 16.5, singleHouseholdRate: 36.8,
    habitableAreaRatio: 49.8, forestRatio: 46.2, annualSunshineHours: 1774, annualPrecipitation: 2161, averageTemperature: 23.3,
    perCapitaIncome: 246, prefecturalGdp: 4.5, effectiveJobOpeningRatio: 1.15, manufacturingShipment: 0.68, agriculturalOutput: 940,
    homeOwnershipRate: 47.8, floorAreaPerDwelling: 78.4, averageRent: 4.85, carsPerHousehold: 1.26, commuteTimeMinutes: 58,
    lifeExpectancyMale: 80.73, lifeExpectancyFemale: 87.88, doctorsPer100k: 262.8, hospitalBedsPer100k: 1260,
    universityAdvancementRate: 45.2, convenienceStoresPer100k: 47.2, ramenShopsPer100k: 22.4, cafesPer100k: 35.6, hotelGuestsPerCapita: 13.8,
  },
};

export const FULL_PREFECTURE_STATS: FullPrefectureRecord[] = (() => {
  const totalPopulation = PREFECTURE_STATS.reduce((sum, p) => sum + p.population, 0);
  const totalArea = PREFECTURE_STATS.reduce((sum, p) => sum + p.area, 0);
  const avgPopulation = totalPopulation / PREFECTURE_STATS.length;
  const avgArea = totalArea / PREFECTURE_STATS.length;

  return PREFECTURE_STATS.map((base) => {
    const ext = RAW_EXTENSIONS[base.name];
    return {
      ...base,
      ...ext,
      density: base.population / base.area,
      populationShare: (base.population / totalPopulation) * 100,
      areaShare: (base.area / totalArea) * 100,
      areaPerPerson: (base.area * 1_000_000) / base.population,
      populationVsAverage: (base.population / avgPopulation) * 100,
      areaVsAverage: (base.area / avgArea) * 100,
    };
  });
})();

export interface ComparePreset {
  id: string;
  label: string;
  names: string[];
  description: string;
}

export const COMPARE_PRESETS: ComparePreset[] = [
  {
    id: 'three-metros',
    label: '三大都市圏（東京・大阪・愛知）',
    names: ['東京都', '大阪府', '愛知県'],
    description: '日本の人口・経済・製造業を牽引する三大都市圏の比較',
  },
  {
    id: 'greater-tokyo',
    label: '首都圏1都3県（東京・神奈川・埼玉・千葉）',
    names: ['東京都', '神奈川県', '埼玉県', '千葉県'],
    description: '通勤時間・家賃・人口密度・医療インフラの首都圏比較',
  },
  {
    id: 'north-kanto',
    label: '北関東3県（茨城・栃木・群馬）',
    names: ['茨城県', '栃木県', '群馬県'],
    description: '製造品出荷額・農業産出額・マイカー保有率・県民所得の比較',
  },
  {
    id: 'hokuriku',
    label: '北陸3県（富山・石川・福井）',
    names: ['富山県', '石川県', '福井県'],
    description: '全国トップクラスの持ち家率・住宅面積・求人倍率・長寿の比較',
  },
  {
    id: 'kansai',
    label: '京阪神＋滋賀（大阪・京都・兵庫・滋賀）',
    names: ['大阪府', '京都府', '兵庫県', '滋賀県'],
    description: '進学率・観光宿泊・平均寿命・人口増減の関西比較',
  },
  {
    id: 'kyushu',
    label: '九州・沖縄（福岡・熊本・鹿児島・沖縄）',
    names: ['福岡県', '熊本県', '鹿児島県', '沖縄県'],
    description: '高い年少人口割合・農業・観光・気候の比較',
  },
];

export interface ScatterPreset {
  id: string;
  label: string;
  xKey: MetricKey;
  yKey: MetricKey;
  insight: string;
}

export const SCATTER_PRESETS: ScatterPreset[] = [
  {
    id: 'density-ownership',
    label: '人口密度 × 持ち家率',
    xKey: 'density',
    yKey: 'homeOwnershipRate',
    insight: '都市部ほど賃貸比率が高く、地方・北陸ほど持ち家率が高い負の相関が見られます。',
  },
  {
    id: 'income-university',
    label: '1人あたり県民所得 × 大学進学率',
    xKey: 'perCapitaIncome',
    yKey: 'universityAdvancementRate',
    insight: '所得水準と大学等進学率の正の相関と、京都・広島・山梨など教育重視県の特徴が分かります。',
  },
  {
    id: 'cars-commute',
    label: '乗用車保有台数 × 通勤・通学時間',
    xKey: 'carsPerHousehold',
    yKey: 'commuteTimeMinutes',
    insight: '鉄道通勤圏（1都3県・関西）は車保有が少なく通勤時間が長い一方、マイカー社会は職住近接で短時間です。',
  },
  {
    id: 'aging-beds',
    label: '高齢化率 × 病院病床数（10万人あたり）',
    xKey: 'agingRate',
    yKey: 'hospitalBedsPer100k',
    insight: '高齢化が進む地域や西日本で人口あたりの病床数が手厚い傾向を可視化します。',
  },
  {
    id: 'temp-sunshine',
    label: '年平均気温 × 年間日照時間',
    xKey: 'averageTemperature',
    yKey: 'annualSunshineHours',
    insight: '山梨・長野・群馬など「内陸で気温は中程度だが日照時間が非常に長い県」と日本海側の違いが浮き彫りになります。',
  },
  {
    id: 'dwelling-rent',
    label: '1住宅あたり延べ面積 × 賃貸家賃目安',
    xKey: 'floorAreaPerDwelling',
    yKey: 'averageRent',
    insight: '北陸・東北の「広くて家賃が手頃な住環境」と首都圏の「狭くて高家賃な住環境」の対比が明確に出ます。',
  },
];
