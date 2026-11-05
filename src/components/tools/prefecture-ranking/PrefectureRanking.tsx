'use client';

import { useMemo, useState } from 'react';
import {
  PREFECTURE_DATA_NOTE,
  PREFECTURE_STATS,
  type PrefectureStat,
} from '@/lib/statsData';

type SortKey =
  | 'population'
  | 'area'
  | 'density'
  | 'populationShare'
  | 'areaShare'
  | 'areaPerPerson';

type PrefectureWithMetrics = PrefectureStat & {
  density: number;
  populationShare: number;
  areaShare: number;
  areaPerPerson: number;
};

type RegionalSummary = {
  region: string;
  count: number;
  totalPopulation: number;
  totalArea: number;
  averageDensity: number;
  populationShare: number;
};

const SORT_KEYS: SortKey[] = [
  'population',
  'area',
  'density',
  'populationShare',
  'areaShare',
  'areaPerPerson',
];

const SORT_LABELS: Record<
  SortKey,
  { label: string; unit: string; order: string }
> = {
  population: { label: '人口', unit: '人', order: '大きい順' },
  area: { label: '面積', unit: 'km²', order: '大きい順' },
  density: { label: '人口密度', unit: '人/km²', order: '大きい順' },
  populationShare: {
    label: '全国人口シェア',
    unit: '%',
    order: '大きい順',
  },
  areaShare: { label: '全国面積シェア', unit: '%', order: '大きい順' },
  areaPerPerson: {
    label: '1人あたり面積',
    unit: 'm²/人',
    order: '広い順',
  },
};

const METRIC_GUIDE = [
  {
    label: '人口',
    text: '2020年国勢調査の人口です。',
  },
  {
    label: '面積',
    text: '国土地理院の公表値を参考にした概算です。',
  },
  {
    label: '人口密度',
    text: '人口 ÷ 面積で求めた1km²あたりの人数です。',
  },
  {
    label: '全国人口シェア',
    text: '都道府県の人口 ÷ 全国の総人口 × 100で求めます。',
  },
  {
    label: '全国面積シェア',
    text: '都道府県の面積 ÷ 全国の総面積 × 100で求めます。',
  },
  {
    label: '1人あたり面積',
    text: '面積（m²）÷ 人口で求めます。人口密度の逆数に相当し、値が大きいほど人口に対して面積が広いことを示します。',
  },
] as const;

const numberFormatter = new Intl.NumberFormat('ja-JP');
const densityFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatInteger(value: number): string {
  return numberFormatter.format(Math.round(value));
}

function formatDensity(value: number): string {
  return densityFormatter.format(value);
}

function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

function formatMetric(value: number, key: SortKey): string {
  if (key === 'density') {
    return formatDensity(value);
  }
  if (key === 'populationShare' || key === 'areaShare') {
    return formatPercent(value);
  }
  return formatInteger(value);
}

function compareByMetric(
  a: PrefectureWithMetrics,
  b: PrefectureWithMetrics,
  key: SortKey,
): number {
  return b[key] - a[key] || a.name.localeCompare(b.name, 'ja');
}

function SummaryCard({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: string;
  unit: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
      <dt className="font-label text-[9px] text-[var(--ink-soft)]">{label}</dt>
      <dd className="font-editorial mt-1 break-words text-2xl leading-tight tabular-nums">
        {value} <span className="text-sm">{unit}</span>
      </dd>
      <dd className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
        {detail}
      </dd>
    </div>
  );
}

export function PrefectureRanking() {
  const [sortKey, setSortKey] = useState<SortKey>('population');
  const [region, setRegion] = useState('all');
  const [query, setQuery] = useState('');

  const prefectures = useMemo<PrefectureWithMetrics[]>(() => {
    const totalPopulation = PREFECTURE_STATS.reduce(
      (total, prefecture) => total + prefecture.population,
      0,
    );
    const totalArea = PREFECTURE_STATS.reduce(
      (total, prefecture) => total + prefecture.area,
      0,
    );

    return PREFECTURE_STATS.map((prefecture) => ({
      ...prefecture,
      density: prefecture.population / prefecture.area,
      populationShare: (prefecture.population / totalPopulation) * 100,
      areaShare: (prefecture.area / totalArea) * 100,
      areaPerPerson: (prefecture.area * 1_000_000) / prefecture.population,
    }));
  }, []);

  const regions = useMemo(
    () =>
      Array.from(new Set(prefectures.map((prefecture) => prefecture.region))),
    [prefectures],
  );

  const rankMaps = useMemo(() => {
    const maps = new Map<SortKey, Map<string, number>>();
    SORT_KEYS.forEach((key) => {
      const sorted = [...prefectures].sort((a, b) =>
        compareByMetric(a, b, key),
      );
      maps.set(
        key,
        new Map(
          sorted.map(
            (prefecture, index) => [prefecture.name, index + 1] as const,
          ),
        ),
      );
    });
    return maps;
  }, [prefectures]);

  const filteredPrefectures = useMemo(() => {
    const keyword = query.trim();
    const activeRankMap = rankMaps.get(sortKey);
    return prefectures
      .filter((prefecture) => region === 'all' || prefecture.region === region)
      .filter(
        (prefecture) =>
          keyword === '' ||
          prefecture.name.includes(keyword) ||
          prefecture.region.includes(keyword),
      )
      .sort((a, b) => compareByMetric(a, b, sortKey))
      .map((prefecture) => ({
        ...prefecture,
        rank: activeRankMap?.get(prefecture.name) ?? 0,
      }));
  }, [prefectures, query, rankMaps, region, sortKey]);

  const summary = useMemo(() => {
    const totalPopulation = prefectures.reduce(
      (total, prefecture) => total + prefecture.population,
      0,
    );
    const totalArea = prefectures.reduce(
      (total, prefecture) => total + prefecture.area,
      0,
    );
    const highestDensity = prefectures.reduce((highest, prefecture) =>
      prefecture.density > highest.density ? prefecture : highest,
    );
    const lowestDensity = prefectures.reduce((lowest, prefecture) =>
      prefecture.density < lowest.density ? prefecture : lowest,
    );
    const highestPopulationShare = prefectures.reduce(
      (highest, prefecture) =>
        prefecture.populationShare > highest.populationShare
          ? prefecture
          : highest,
    );
    const highestAreaShare = prefectures.reduce((highest, prefecture) =>
      prefecture.areaShare > highest.areaShare ? prefecture : highest,
    );
    return {
      totalPopulation,
      totalArea,
      averageDensity: totalPopulation / totalArea,
      averageAreaPerPerson: (totalArea * 1_000_000) / totalPopulation,
      highestDensity,
      lowestDensity,
      highestPopulationShare,
      highestAreaShare,
    };
  }, [prefectures]);

  const regionalSummary = useMemo<RegionalSummary[]>(() => {
    const nationalPopulation = prefectures.reduce(
      (total, prefecture) => total + prefecture.population,
      0,
    );

    return regions.map((regionName) => {
      const members = prefectures.filter(
        (prefecture) => prefecture.region === regionName,
      );
      const totalPopulation = members.reduce(
        (total, prefecture) => total + prefecture.population,
        0,
      );
      const totalArea = members.reduce(
        (total, prefecture) => total + prefecture.area,
        0,
      );
      return {
        region: regionName,
        count: members.length,
        totalPopulation,
        totalArea,
        averageDensity: totalPopulation / totalArea,
        populationShare: (totalPopulation / nationalPopulation) * 100,
      };
    });
  }, [prefectures, regions]);

  const topTen = useMemo(
    () => filteredPrefectures.slice(0, 10),
    [filteredPrefectures],
  );

  const activeSort = SORT_LABELS[sortKey];
  const maxTopValue = topTen[0]?.[sortKey] ?? 0;
  const statusMessage = `表示中${formatInteger(
    filteredPrefectures.length,
  )}件、全${formatInteger(prefectures.length)}件。${
    activeSort.label
  }の${activeSort.order}に並べています。順位は全国47都道府県の中での順位です。`;

  const resetConditions = () => {
    setSortKey('population');
    setRegion('all');
    setQuery('');
  };

  return (
    <div className="grid min-w-0 gap-5">
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="prefecture-controls-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Controls</p>
            <h2
              id="prefecture-controls-heading"
              className="font-editorial mt-1 text-xl"
            >
              条件を指定
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            01 / 06
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          6つの指標から並び替えの基準を選び、必要に応じて地域やキーワードで絞り込みます。表示はすべてブラウザ内で更新されます。
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <label
              htmlFor="prefecture-sort"
              className="text-sm font-bold text-[var(--ink)]"
            >
              並び替え
            </label>
            <select
              id="prefecture-sort"
              name="sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              aria-describedby="prefecture-sort-help"
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base"
            >
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key].label}（{SORT_LABELS[key].order}）
                </option>
              ))}
            </select>
            <p
              id="prefecture-sort-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              人口・面積・人口密度・全国人口シェア・全国面積シェア・1人あたり面積の6指標で並び替えます。
            </p>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="prefecture-region"
              className="text-sm font-bold text-[var(--ink)]"
            >
              地域で絞り込み
            </label>
            <select
              id="prefecture-region"
              name="region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              aria-describedby="prefecture-region-help"
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base"
            >
              <option value="all">すべての地域</option>
              {regions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <p
              id="prefecture-region-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              北海道から沖縄までの地域区分で絞り込めます。
            </p>
          </div>

          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <label
              htmlFor="prefecture-search"
              className="text-sm font-bold text-[var(--ink)]"
            >
              キーワード検索
            </label>
            <input
              id="prefecture-search"
              name="query"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例: 東京、関東"
              aria-describedby="prefecture-search-help"
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base"
            />
            <p
              id="prefecture-search-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              都道府県名または地域名の一部で検索できます。
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={resetConditions}
            className="paper-button rounded-sm px-4 py-2 text-xs"
          >
            条件をリセット
          </button>
          <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
            入力内容は保存・送信されません。
          </p>
        </div>
      </form>

      <section
        aria-labelledby="prefecture-summary-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Summary</p>
            <h2
              id="prefecture-summary-heading"
              className="font-editorial mt-1 text-xl"
            >
              全国の概要
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            02 / 06
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          全47都道府県の合計と平均に加え、人口・面積が全国に占める割合を確認できます。
        </p>

        <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="総人口"
            value={formatInteger(summary.totalPopulation)}
            unit="人"
            detail="47都道府県の合計"
          />
          <SummaryCard
            label="総面積"
            value={formatInteger(summary.totalArea)}
            unit="km²"
            detail="47都道府県の合計"
          />
          <SummaryCard
            label="全国平均密度"
            value={formatDensity(summary.averageDensity)}
            unit="人/km²"
            detail="総人口 ÷ 総面積"
          />
          <SummaryCard
            label="平均1人あたり面積"
            value={formatInteger(summary.averageAreaPerPerson)}
            unit="m²/人"
            detail="総面積 ÷ 総人口"
          />
          <SummaryCard
            label="最高密度"
            value={formatDensity(summary.highestDensity.density)}
            unit="人/km²"
            detail={`${summary.highestDensity.name}（全国1位）`}
          />
          <SummaryCard
            label="最低密度"
            value={formatDensity(summary.lowestDensity.density)}
            unit="人/km²"
            detail={`${summary.lowestDensity.name}（全国47位）`}
          />
          <SummaryCard
            label="最大人口シェア"
            value={formatPercent(summary.highestPopulationShare.populationShare)}
            unit="%"
            detail={summary.highestPopulationShare.name}
          />
          <SummaryCard
            label="最大面積シェア"
            value={formatPercent(summary.highestAreaShare.areaShare)}
            unit="%"
            detail={summary.highestAreaShare.name}
          />
        </dl>
      </section>

      <section
        aria-labelledby="prefecture-guide-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Metrics Guide</p>
            <h2
              id="prefecture-guide-heading"
              className="font-editorial mt-1 text-xl"
            >
              指標の定義と出典
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            03 / 06
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          並び替えに使う6つの指標と計算方法です。人口と面積は既存データ、そのほかはブラウザ内で計算した派生指標です。
        </p>

        <ul className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {METRIC_GUIDE.map((metric) => (
            <li
              key={metric.label}
              className="paper-chip min-w-0 rounded-sm px-3 py-2"
            >
              <p className="text-xs font-bold text-[var(--ink)]">
                {metric.label}
              </p>
              <p className="mt-1 break-words text-[11px] leading-5 text-[var(--ink-soft)]">
                {metric.text}
              </p>
            </li>
          ))}
        </ul>

        <div
          role="note"
          className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            データについて
          </p>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            {PREFECTURE_DATA_NOTE}
          </p>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            全国人口シェア・全国面積シェア・1人あたり面積は、このデータから計算した参考値です。順位は全国47都道府県の中での位置を示します。
          </p>
        </div>
      </section>

      <section
        aria-labelledby="prefecture-regional-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Regional Summary</p>
            <h2
              id="prefecture-regional-heading"
              className="font-editorial mt-1 text-xl"
            >
              地域別の集計
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            04 / 06
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          全47都道府県を地域ごとに集計した表です。平均密度は地域の合計人口を合計面積で割った値、人口シェアは全国の総人口に占める割合です。
        </p>

        <div
          role="region"
          aria-label="地域別の都道府県数・合計人口・合計面積・平均密度・人口シェアの一覧。横にスクロールできます。"
          tabIndex={0}
          className="mt-3 overflow-auto border border-[var(--line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <table className="w-full min-w-[46rem] border-collapse text-right text-xs tabular-nums">
            <caption className="sr-only">
              地域ごとの都道府県数、合計人口、合計面積、平均密度、全国人口シェアの一覧
            </caption>
            <thead className="bg-[var(--paper-muted)]">
              <tr>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 text-left font-bold text-[var(--ink)]"
                >
                  地域
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  都道府県数
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  合計人口（人）
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  合計面積（km²）
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  平均密度（人/km²）
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  人口シェア（%）
                </th>
              </tr>
            </thead>
            <tbody>
              {regionalSummary.map((item) => {
                const isActiveRegion =
                  region !== 'all' && region === item.region;

                return (
                  <tr
                    key={item.region}
                    className={`border-b border-[var(--line)] last:border-b-0 ${
                      isActiveRegion ? 'bg-[var(--accent-soft)]' : ''
                    }`}
                  >
                    <th
                      scope="row"
                      className="px-3 py-2 text-left font-bold text-[var(--ink)]"
                    >
                      {item.region}
                      {isActiveRegion && (
                        <span className="font-label ml-2 text-[9px] text-[var(--accent)]">
                          表示中
                        </span>
                      )}
                    </th>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatInteger(item.count)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatInteger(item.totalPopulation)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatInteger(item.totalArea)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDensity(item.averageDensity)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatPercent(item.populationShare)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--line-strong)] bg-[var(--paper-muted)] font-bold">
                <th
                  scope="row"
                  className="px-3 py-2 text-left text-[var(--ink)]"
                >
                  全国
                </th>
                <td className="whitespace-nowrap px-3 py-2">
                  {formatInteger(prefectures.length)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {formatInteger(summary.totalPopulation)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {formatInteger(summary.totalArea)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {formatDensity(summary.averageDensity)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {formatPercent(100)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
          表は横にスクロールできます。地域フィルターを変更すると、該当する地域の行を強調表示します。集計は全47都道府県を対象に固定しています。
        </p>
      </section>

      <section
        aria-labelledby="prefecture-top-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Top 10</p>
            <h2
              id="prefecture-top-heading"
              className="font-editorial mt-1 text-xl"
            >
              {activeSort.label}の上位10件
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            05 / 06
          </span>
        </div>

        {topTen.length > 0 ? (
          <>
            <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
              表示中のデータを{activeSort.label}の{activeSort.order}に並べ、上位10件を棒の長さで示しています。棒は上位10件の最大値を100%として比較しています。
            </p>

            <ol className="mt-4 space-y-3" aria-label={`${activeSort.label}の上位10件`}>
              {topTen.map((prefecture, index) => {
                const ratio =
                  maxTopValue > 0
                    ? (prefecture[sortKey] / maxTopValue) * 100
                    : 0;

                return (
                  <li key={prefecture.name} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-xs font-bold text-[var(--ink)]">
                        <span className="font-label mr-2 text-[9px] text-[var(--ink-soft)]">
                          {index + 1}
                        </span>
                        {prefecture.name}
                        <span className="ml-2 text-[10px] font-normal text-[var(--ink-soft)]">
                          {prefecture.region}
                        </span>
                      </p>
                      <p className="shrink-0 font-label text-[10px] tabular-nums text-[var(--ink-soft)]">
                        {formatMetric(prefecture[sortKey], sortKey)}{' '}
                        {activeSort.unit}
                      </p>
                    </div>
                    <div
                      aria-hidden="true"
                      className="mt-1 h-2.5 w-full overflow-hidden border border-[var(--line)] bg-[var(--paper-muted)]"
                    >
                      <div
                        className="h-full bg-[var(--accent)]"
                        style={{
                          width: `${Math.min(100, Math.max(ratio, 2))}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="text-sm font-bold text-[var(--ink)]">
              条件に一致する都道府県がありません
            </p>
            <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
              検索語を短くするか、地域の絞り込みを解除してください。
            </p>
          </div>
        )}
      </section>

      <section
        aria-labelledby="prefecture-table-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">All Prefectures</p>
            <h2
              id="prefecture-table-heading"
              className="font-editorial mt-1 text-xl"
            >
              都道府県一覧
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            06 / 06
          </span>
        </div>

        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-3 text-xs leading-6 text-[var(--ink-soft)]"
        >
          {statusMessage}
        </p>

        <div
          role="region"
          aria-label="都道府県の人口・人口シェア・面積・面積シェア・人口密度・1人あたり面積の一覧。横にスクロールできます。"
          tabIndex={0}
          className="mt-3 max-h-[36rem] overflow-auto border border-[var(--line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <table className="w-full min-w-[64rem] border-collapse text-right text-xs tabular-nums">
            <caption className="sr-only">
              都道府県別の{activeSort.label}順位、地域、人口、人口シェア、面積、面積シェア、人口密度、1人あたり面積の一覧
            </caption>
            <thead className="sticky top-0 z-10 bg-[var(--paper-muted)]">
              <tr>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 text-center font-bold text-[var(--ink)]"
                >
                  順位
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 text-left font-bold text-[var(--ink)]"
                >
                  都道府県
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 text-left font-bold text-[var(--ink)]"
                >
                  地域
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  人口（人）
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  人口シェア（%）
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  面積（km²）
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  面積シェア（%）
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  人口密度（人/km²）
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                >
                  1人あたり面積（m²/人）
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPrefectures.map((prefecture) => (
                <tr
                  key={prefecture.name}
                  className="border-b border-[var(--line)] last:border-b-0"
                >
                  <td className="px-3 py-2 text-center font-bold">
                    {prefecture.rank}
                  </td>
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-bold text-[var(--ink)]"
                  >
                    {prefecture.name}
                  </th>
                  <td className="px-3 py-2 text-left">{prefecture.region}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatInteger(prefecture.population)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatPercent(prefecture.populationShare)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatInteger(prefecture.area)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatPercent(prefecture.areaShare)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatDensity(prefecture.density)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatInteger(prefecture.areaPerPerson)}
                  </td>
                </tr>
              ))}
              {filteredPrefectures.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-8 text-center text-xs font-bold text-[var(--ink-soft)]"
                  >
                    条件に一致する都道府県がありません。検索語や地域を変更してください。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
          表の中を横にスクロールすると、スマートフォンでもすべての列を確認できます。ヘッダーは表の先頭に固定され、順位は選択中の指標の全国順位です。
        </p>
      </section>
    </div>
  );
}
