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
  | 'areaPerPerson'
  | 'populationVsAverage'
  | 'areaVsAverage';

type SortDirection = 'desc' | 'asc';

type PrefectureWithMetrics = PrefectureStat & {
  density: number;
  populationShare: number;
  areaShare: number;
  areaPerPerson: number;
  populationVsAverage: number;
  areaVsAverage: number;
};

type RankedPrefecture = PrefectureWithMetrics & {
  rank: number;
};

type RegionalSummary = {
  region: string;
  count: number;
  totalPopulation: number;
  totalArea: number;
  averageDensity: number;
  populationShare: number;
  areaShare: number;
  areaPerPerson: number;
};

type MetricConfig = {
  label: string;
  shortLabel: string;
  unit: string;
  descendingLabel: string;
  ascendingLabel: string;
};

const SORT_KEYS: SortKey[] = [
  'population',
  'area',
  'density',
  'populationShare',
  'areaShare',
  'areaPerPerson',
  'populationVsAverage',
  'areaVsAverage',
];

const SORT_CONFIG: Record<SortKey, MetricConfig> = {
  population: {
    label: '人口',
    shortLabel: '人口',
    unit: '人',
    descendingLabel: '人口の多い順',
    ascendingLabel: '人口の少ない順',
  },
  area: {
    label: '面積',
    shortLabel: '面積',
    unit: 'km²',
    descendingLabel: '面積の広い順',
    ascendingLabel: '面積の狭い順',
  },
  density: {
    label: '人口密度',
    shortLabel: '密度',
    unit: '人/km²',
    descendingLabel: '密度の高い順',
    ascendingLabel: '密度の低い順',
  },
  populationShare: {
    label: '全国人口シェア',
    shortLabel: '人口シェア',
    unit: '%',
    descendingLabel: '人口シェアの大きい順',
    ascendingLabel: '人口シェアの小さい順',
  },
  areaShare: {
    label: '全国面積シェア',
    shortLabel: '面積シェア',
    unit: '%',
    descendingLabel: '面積シェアの大きい順',
    ascendingLabel: '面積シェアの小さい順',
  },
  areaPerPerson: {
    label: '1人あたり面積',
    shortLabel: '1人あたり',
    unit: 'm²/人',
    descendingLabel: '1人あたり面積の広い順',
    ascendingLabel: '1人あたり面積の狭い順',
  },
  populationVsAverage: {
    label: '全国平均人口比',
    shortLabel: '平均人口比',
    unit: '%',
    descendingLabel: '全国平均人口比の大きい順',
    ascendingLabel: '全国平均人口比の小さい順',
  },
  areaVsAverage: {
    label: '全国平均面積比',
    shortLabel: '平均面積比',
    unit: '%',
    descendingLabel: '全国平均面積比の大きい順',
    ascendingLabel: '全国平均面積比の小さい順',
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
  {
    label: '全国平均人口比',
    text: '都道府県の人口 ÷ 全国平均人口（総人口 ÷ 47）× 100で求めます。100%が全国平均です。',
  },
  {
    label: '全国平均面積比',
    text: '都道府県の面積 ÷ 全国平均面積（総面積 ÷ 47）× 100で求めます。100%が全国平均です。',
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
const ratioFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
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

function formatRatio(value: number): string {
  return ratioFormatter.format(value);
}

function formatMetric(value: number, key: SortKey): string {
  if (key === 'density') {
    return formatDensity(value);
  }
  if (key === 'populationShare' || key === 'areaShare') {
    return formatPercent(value);
  }
  if (key === 'populationVsAverage' || key === 'areaVsAverage') {
    return formatRatio(value);
  }
  return formatInteger(value);
}

function compareByMetric(
  a: PrefectureWithMetrics,
  b: PrefectureWithMetrics,
  key: SortKey,
  direction: SortDirection,
): number {
  const primary =
    direction === 'desc' ? b[key] - a[key] : a[key] - b[key];
  return primary || a.name.localeCompare(b.name, 'ja');
}

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(rows: RankedPrefecture[]): string {
  const header = [
    '順位',
    '都道府県',
    '地域',
    '人口（人）',
    '面積（km²）',
    '人口密度（人/km²）',
    '全国人口シェア（%）',
    '全国面積シェア（%）',
    '1人あたり面積（m²/人）',
    '全国平均人口比（%）',
    '全国平均面積比（%）',
  ];
  const body = rows.map((prefecture) => [
    prefecture.rank,
    prefecture.name,
    prefecture.region,
    Math.round(prefecture.population),
    Math.round(prefecture.area),
    prefecture.density.toFixed(1),
    prefecture.populationShare.toFixed(2),
    prefecture.areaShare.toFixed(2),
    Math.round(prefecture.areaPerPerson),
    prefecture.populationVsAverage.toFixed(1),
    prefecture.areaVsAverage.toFixed(1),
  ]);

  return [header, ...body]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\r\n');
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
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [region, setRegion] = useState('all');
  const [query, setQuery] = useState('');
  const [compareNames, setCompareNames] = useState<string[]>([]);
  const [csvNotice, setCsvNotice] = useState('');

  const prefectures = useMemo<PrefectureWithMetrics[]>(() => {
    const totalPopulation = PREFECTURE_STATS.reduce(
      (total, prefecture) => total + prefecture.population,
      0,
    );
    const totalArea = PREFECTURE_STATS.reduce(
      (total, prefecture) => total + prefecture.area,
      0,
    );
    const averagePopulation = totalPopulation / PREFECTURE_STATS.length;
    const averageArea = totalArea / PREFECTURE_STATS.length;

    return PREFECTURE_STATS.map((prefecture) => ({
      ...prefecture,
      density: prefecture.population / prefecture.area,
      populationShare: (prefecture.population / totalPopulation) * 100,
      areaShare: (prefecture.area / totalArea) * 100,
      areaPerPerson: (prefecture.area * 1_000_000) / prefecture.population,
      populationVsAverage:
        (prefecture.population / averagePopulation) * 100,
      areaVsAverage: (prefecture.area / averageArea) * 100,
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
        compareByMetric(a, b, key, 'desc'),
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

  const filteredPrefectures = useMemo<RankedPrefecture[]>(() => {
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
      .sort((a, b) => compareByMetric(a, b, sortKey, sortDirection))
      .map((prefecture) => ({
        ...prefecture,
        rank: activeRankMap?.get(prefecture.name) ?? 0,
      }));
  }, [prefectures, query, rankMaps, region, sortDirection, sortKey]);

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
      nationalAveragePopulation: totalPopulation / prefectures.length,
      nationalAverageArea: totalArea / prefectures.length,
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
    const nationalArea = prefectures.reduce(
      (total, prefecture) => total + prefecture.area,
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
        areaShare: (totalArea / nationalArea) * 100,
        areaPerPerson: (totalArea * 1_000_000) / totalPopulation,
      };
    });
  }, [prefectures, regions]);

  const comparedPrefectures = useMemo<RankedPrefecture[]>(() => {
    const activeRankMap = rankMaps.get(sortKey);
    return compareNames
      .map((name) => {
        const prefecture = prefectures.find((item) => item.name === name);
        if (!prefecture) {
          return undefined;
        }
        return {
          ...prefecture,
          rank: activeRankMap?.get(prefecture.name) ?? 0,
        };
      })
      .filter(
        (prefecture): prefecture is RankedPrefecture =>
          prefecture !== undefined,
      );
  }, [compareNames, prefectures, rankMaps, sortKey]);

  const activeSort = SORT_CONFIG[sortKey];
  const directionLabel =
    sortDirection === 'desc'
      ? activeSort.descendingLabel
      : activeSort.ascendingLabel;
  const statusMessage = `表示中${formatInteger(
    filteredPrefectures.length,
  )}件、全${formatInteger(prefectures.length)}件。${
    activeSort.label
  }の${directionLabel}で並べています。順位は全国47都道府県を値の大きい順に並べたときの順位です。`;

  const toggleCompare = (name: string) => {
    setCompareNames((current) => {
      if (current.includes(name)) {
        return current.filter((item) => item !== name);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, name];
    });
    setCsvNotice('');
  };

  const resetConditions = () => {
    setSortKey('population');
    setSortDirection('desc');
    setRegion('all');
    setQuery('');
    setCompareNames([]);
    setCsvNotice('');
  };

  const copyCsv = async () => {
    if (filteredPrefectures.length === 0) {
      return;
    }
    const csv = buildCsv(filteredPrefectures);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(csv);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = csv;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) {
          throw new Error('copy failed');
        }
      }
      setCsvNotice('CSVをクリップボードにコピーしました。');
    } catch {
      setCsvNotice(
        'コピーできませんでした。CSVダウンロードをお試しください。',
      );
    }
  };

  const downloadCsv = () => {
    if (filteredPrefectures.length === 0) {
      return;
    }
    const csv = buildCsv(filteredPrefectures);
    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prefecture-ranking-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setCsvNotice('CSVをダウンロードしました。');
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
              条件と指標
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            01 / 05
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          8つの指標をチップで切り替え、降順・昇順を選んでください。地域やキーワードで絞り込み、結果はそのままCSVにできます。
        </p>

        <fieldset className="mt-5 min-w-0">
          <legend className="text-sm font-bold text-[var(--ink)]">
            指標を選ぶ
          </legend>
          <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
            全国平均人口比・全国平均面積比は、全国平均を100%とした比較値です。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SORT_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSortKey(key);
                  setCsvNotice('');
                }}
                aria-pressed={sortKey === key}
                aria-label={`${SORT_CONFIG[key].label}で並び替え`}
                className="paper-chip inline-flex min-h-9 items-center gap-1.5 rounded-sm px-3 py-2 text-xs"
              >
                <span>{SORT_CONFIG[key].label}</span>
                <span className="text-[10px] opacity-75">
                  {SORT_CONFIG[key].unit}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4 min-w-0 border-t border-[var(--line)] pt-4">
          <legend className="text-sm font-bold text-[var(--ink)]">
            並び順
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSortDirection('desc');
                setCsvNotice('');
              }}
              aria-pressed={sortDirection === 'desc'}
              className="paper-chip min-h-10 rounded-sm px-4 py-2 text-xs"
            >
              降順（大きい順）
            </button>
            <button
              type="button"
              onClick={() => {
                setSortDirection('asc');
                setCsvNotice('');
              }}
              aria-pressed={sortDirection === 'asc'}
              className="paper-chip min-h-10 rounded-sm px-4 py-2 text-xs"
            >
              昇順（小さい順）
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            {activeSort.label}を{directionLabel}で表示します。順位は値の大きい順の全国順位です。
          </p>
        </fieldset>

        <div className="mt-4 grid gap-4 border-t border-[var(--line)] pt-4 sm:grid-cols-2">
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
              onChange={(event) => {
                setRegion(event.target.value);
                setCsvNotice('');
              }}
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

          <div className="min-w-0">
            <label
              htmlFor="prefecture-search"
              className="text-sm font-bold text-[var(--ink)]"
            >
              キーワード検索
            </label>
            <div className="mt-2 flex min-w-0 gap-2">
              <input
                id="prefecture-search"
                name="query"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCsvNotice('');
                }}
                placeholder="例: 東京、関東"
                aria-describedby="prefecture-search-help"
                className="field-paper min-w-0 flex-1 rounded-sm px-3 py-3 text-base"
              />
              {query !== '' && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setCsvNotice('');
                  }}
                  aria-label="検索語をクリア"
                  className="paper-button shrink-0 rounded-sm px-3 py-2 text-xs"
                >
                  クリア
                </button>
              )}
            </div>
            <p
              id="prefecture-search-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              都道府県名または地域名の一部で検索できます。
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
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
        aria-labelledby="prefecture-ranking-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Ranking</p>
            <h2
              id="prefecture-ranking-heading"
              className="font-editorial mt-1 text-xl"
            >
              {activeSort.label}ランキング
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            02 / 05
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p aria-hidden="true" className="text-xs text-[var(--ink)]">
              表示中{' '}
              <span className="font-editorial text-lg tabular-nums">
                {formatInteger(filteredPrefectures.length)}
              </span>{' '}
              / {formatInteger(prefectures.length)} 件
            </p>
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              {statusMessage}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCsv}
              disabled={filteredPrefectures.length === 0}
              className="paper-button rounded-sm px-3 py-2 text-xs"
            >
              CSVをコピー
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={filteredPrefectures.length === 0}
              className="paper-button rounded-sm px-3 py-2 text-xs"
            >
              CSVをダウンロード
            </button>
          </div>
        </div>

        {csvNotice !== '' && (
          <p
            role="status"
            aria-live="polite"
            className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--ink)]"
          >
            {csvNotice}
          </p>
        )}

        <section
          aria-labelledby="prefecture-compare-heading"
          className="mt-4 min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="paper-kicker text-[9px]">Pin-up Compare</p>
              <h3
                id="prefecture-compare-heading"
                className="font-editorial mt-1 text-base"
              >
                ピンアップ比較
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                {formatInteger(comparedPrefectures.length)} / 3 件
              </span>
              {comparedPrefectures.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCompareNames([]);
                    setCsvNotice('');
                  }}
                  className="paper-button rounded-sm px-2.5 py-1.5 text-[11px]"
                >
                  すべて解除
                </button>
              )}
            </div>
          </div>

          {comparedPrefectures.length === 0 ? (
            <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              一覧の「比較」ボタンで最大3件まで選ぶと、ここに8指標を並べて表示します。
            </p>
          ) : (
            <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {comparedPrefectures.map((prefecture) => (
                <article
                  key={prefecture.name}
                  className="min-w-0 border border-[var(--line)] bg-[var(--paper-strong)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-editorial break-words text-base">
                        {prefecture.name}
                      </h4>
                      <p className="mt-0.5 text-[10px] text-[var(--ink-soft)]">
                        {prefecture.region} / 全国{prefecture.rank}位
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCompare(prefecture.name)}
                      aria-label={`${prefecture.name}の比較を解除`}
                      className="paper-button shrink-0 rounded-sm px-2 py-1 text-[10px]"
                    >
                      解除
                    </button>
                  </div>
                  <dl className="mt-2 grid min-w-0 grid-cols-2 gap-x-3 gap-y-2">
                    {SORT_KEYS.map((key) => (
                      <div
                        key={key}
                        className={`min-w-0 rounded-sm px-1.5 py-1 ${
                          key === sortKey ? 'bg-[var(--accent-soft)]' : ''
                        }`}
                      >
                        <dt className="text-[9px] leading-4 text-[var(--ink-soft)]">
                          {SORT_CONFIG[key].shortLabel}
                        </dt>
                        <dd className="break-words text-[11px] font-bold leading-5 tabular-nums text-[var(--ink)]">
                          {formatMetric(prefecture[key], key)}{' '}
                          <span className="font-normal text-[9px] text-[var(--ink-soft)]">
                            {SORT_CONFIG[key].unit}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>

        {filteredPrefectures.length > 0 ? (
          <>
            <div className="mt-4 grid min-w-0 gap-3 md:hidden">
              {filteredPrefectures.map((prefecture) => {
                const isCompared = compareNames.includes(prefecture.name);
                const compareDisabled =
                  compareNames.length >= 3 && !isCompared;

                return (
                  <article
                    key={prefecture.name}
                    className="min-w-0 border border-[var(--line)] bg-[var(--paper-strong)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-label text-[9px] text-[var(--ink-soft)]">
                          全国 {prefecture.rank} 位
                        </p>
                        <h3 className="font-editorial mt-1 break-words text-lg">
                          {prefecture.name}
                        </h3>
                        <p className="text-[11px] text-[var(--ink-soft)]">
                          {prefecture.region}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCompare(prefecture.name)}
                        aria-pressed={isCompared}
                        disabled={compareDisabled}
                        aria-label={
                          isCompared
                            ? `${prefecture.name}の比較を解除`
                            : `${prefecture.name}を比較に追加`
                        }
                        className="paper-chip shrink-0 rounded-sm px-2.5 py-1.5 text-[11px]"
                      >
                        {isCompared ? '比較中' : '比較'}
                      </button>
                    </div>
                    <div className="mt-3 border-y border-[var(--line)] bg-[var(--paper)] px-3 py-2">
                      <p className="text-[10px] text-[var(--ink-soft)]">
                        {activeSort.label}
                      </p>
                      <p className="font-editorial mt-0.5 break-words text-xl leading-tight tabular-nums">
                        {formatMetric(prefecture[sortKey], sortKey)}{' '}
                        <span className="text-xs">{activeSort.unit}</span>
                      </p>
                    </div>
                    <dl className="mt-2 grid min-w-0 grid-cols-2 gap-x-3 gap-y-2">
                      {SORT_KEYS.filter((key) => key !== sortKey).map((key) => (
                        <div key={key} className="min-w-0">
                          <dt className="text-[9px] leading-4 text-[var(--ink-soft)]">
                            {SORT_CONFIG[key].label}
                          </dt>
                          <dd className="break-words text-[11px] leading-5 tabular-nums text-[var(--ink)]">
                            {formatMetric(prefecture[key], key)}{' '}
                            <span className="text-[9px] text-[var(--ink-soft)]">
                              {SORT_CONFIG[key].unit}
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                );
              })}
            </div>

            <div
              role="region"
              aria-label="都道府県ランキングの一覧。ヘッダーと先頭列を固定し、表の中だけ横にスクロールできます。"
              tabIndex={0}
              className="mt-4 hidden max-h-[42rem] min-w-0 overflow-auto border border-[var(--line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] md:block"
            >
              <table className="w-full min-w-[72rem] border-collapse text-right text-xs tabular-nums">
                <caption className="sr-only">
                  都道府県別の全国順位、地域、人口、面積、人口密度、全国人口シェア、全国面積シェア、1人あたり面積、全国平均人口比、全国平均面積比の一覧
                </caption>
                <thead className="sticky top-0 z-10 bg-[var(--paper-muted)]">
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-20 border-b border-r border-[var(--line-strong)] bg-[var(--paper-muted)] px-3 py-2 text-left font-bold text-[var(--ink)]"
                    >
                      都道府県
                    </th>
                    <th
                      scope="col"
                      className="border-b border-[var(--line-strong)] px-3 py-2 text-left font-bold text-[var(--ink)]"
                    >
                      地域
                    </th>
                    {SORT_KEYS.map((key) => (
                      <th
                        key={key}
                        scope="col"
                        className={`border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)] ${
                          key === sortKey ? 'bg-[var(--accent-soft)]' : ''
                        }`}
                      >
                        {SORT_CONFIG[key].label}（{SORT_CONFIG[key].unit}）
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="border-b border-[var(--line-strong)] px-3 py-2 text-center font-bold text-[var(--ink)]"
                    >
                      比較
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrefectures.map((prefecture) => {
                    const isCompared = compareNames.includes(prefecture.name);
                    const compareDisabled =
                      compareNames.length >= 3 && !isCompared;

                    return (
                      <tr
                        key={prefecture.name}
                        className="border-b border-[var(--line)] last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="sticky left-0 z-20 border-r border-[var(--line)] bg-[var(--paper-strong)] px-3 py-2 text-left font-bold text-[var(--ink)]"
                        >
                          <span className="font-label mr-2 text-[9px] text-[var(--ink-soft)]">
                            {prefecture.rank}
                          </span>
                          {prefecture.name}
                        </th>
                        <td className="px-3 py-2 text-left">
                          {prefecture.region}
                        </td>
                        {SORT_KEYS.map((key) => (
                          <td
                            key={key}
                            className={`whitespace-nowrap px-3 py-2 ${
                              key === sortKey
                                ? 'bg-[var(--accent-soft)] font-bold'
                                : ''
                            }`}
                          >
                            {formatMetric(prefecture[key], key)}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCompare(prefecture.name)}
                            aria-pressed={isCompared}
                            disabled={compareDisabled}
                            aria-label={
                              isCompared
                                ? `${prefecture.name}の比較を解除`
                                : `${prefecture.name}を比較に追加`
                            }
                            className="paper-chip rounded-sm px-2 py-1 text-[10px]"
                          >
                            {isCompared ? '比較中' : '比較'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="text-sm font-bold text-[var(--ink)]">
              条件に一致する都道府県がありません
            </p>
            <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
              検索語を短くするか、地域の絞り込みを解除してください。
            </p>
            <button
              type="button"
              onClick={resetConditions}
              className="paper-button mt-3 rounded-sm px-4 py-2 text-xs"
            >
              条件をリセット
            </button>
          </div>
        )}

        <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
          スマートフォンでは各都道府県をカードで表示します。デスクトップでは表のヘッダーと先頭列を固定し、表の中だけ横にスクロールできます。順位は値の大きい順の全国順位です。
        </p>
      </section>

      <details className="paper-panel group min-w-0">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:p-6 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="paper-kicker text-[9px]">Summary</p>
            <h2 className="font-editorial mt-1 text-xl">全国の概要</h2>
            <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
              全国の合計・平均と最高・最低の値を確認します。
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="font-label text-[9px] text-[var(--ink-soft)]"
            >
              03 / 05
            </span>
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper)] text-sm font-bold text-[var(--ink)] transition-transform group-open:rotate-45"
            >
              +
            </span>
          </div>
        </summary>
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <dl className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              label="全国平均人口"
              value={formatInteger(summary.nationalAveragePopulation)}
              unit="人"
              detail="総人口 ÷ 47"
            />
            <SummaryCard
              label="全国平均面積"
              value={formatInteger(summary.nationalAverageArea)}
              unit="km²"
              detail="総面積 ÷ 47"
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
              value={formatPercent(
                summary.highestPopulationShare.populationShare,
              )}
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
        </div>
      </details>

      <details className="paper-panel group min-w-0">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:p-6 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="paper-kicker text-[9px]">Metrics Guide</p>
            <h2 className="font-editorial mt-1 text-xl">
              指標の定義と出典
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
              8指標の計算方法とデータの注意事項を確認します。
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="font-label text-[9px] text-[var(--ink-soft)]"
            >
              04 / 05
            </span>
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper)] text-sm font-bold text-[var(--ink)] transition-transform group-open:rotate-45"
            >
              +
            </span>
          </div>
        </summary>
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <ul className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
              全国人口シェア・全国面積シェア・1人あたり面積・全国平均人口比・全国平均面積比は、このデータから計算した参考値です。順位は全国47都道府県の中での位置を示します。
            </p>
          </div>
        </div>
      </details>

      <details className="paper-panel group min-w-0">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:p-6 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="paper-kicker text-[9px]">Regional Summary</p>
            <h2 className="font-editorial mt-1 text-xl">地域別の集計</h2>
            <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
              9地域の人口・面積・密度・シェアをまとめて確認します。
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="font-label text-[9px] text-[var(--ink-soft)]"
            >
              05 / 05
            </span>
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper)] text-sm font-bold text-[var(--ink)] transition-transform group-open:rotate-45"
            >
              +
            </span>
          </div>
        </summary>
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div
            role="region"
            aria-label="地域別の都道府県数・合計人口・合計面積・平均密度・人口シェア・面積シェア・1人あたり面積の一覧。横にスクロールできます。"
            tabIndex={0}
            className="overflow-auto border border-[var(--line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <table className="w-full min-w-[58rem] border-collapse text-right text-xs tabular-nums">
              <caption className="sr-only">
                地域ごとの都道府県数、合計人口、合計面積、平均密度、全国人口シェア、全国面積シェア、1人あたり面積の一覧
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
                    1人あたり面積（m²/人）
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
                      <td className="whitespace-nowrap px-3 py-2">
                        {formatPercent(item.areaShare)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {formatInteger(item.areaPerPerson)}
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
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatPercent(100)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatInteger(summary.averageAreaPerPerson)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            表は横にスクロールできます。地域フィルターを変更すると、該当する地域の行を強調表示します。集計は全47都道府県を対象に固定しています。
          </p>
        </div>
      </details>
    </div>
  );
}
