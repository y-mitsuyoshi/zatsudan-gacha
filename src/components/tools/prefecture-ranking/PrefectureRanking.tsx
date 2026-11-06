'use client';

import { useMemo, useState } from 'react';
import { PREFECTURE_DATA_NOTE } from '@/lib/statsData';
import {
  COMPARE_PRESETS,
  FULL_PREFECTURE_STATS,
  GENRE_META,
  METRIC_DEFINITIONS,
  METRIC_MAP,
  SCATTER_PRESETS,
  type FullPrefectureRecord,
  type MetricDefinition,
  type MetricGenreId,
  type MetricKey,
} from '@/lib/prefectureStatsCatalog';

type SortDirection = 'desc' | 'asc';
type ViewMode = 'bars' | 'map' | 'scatter' | 'table';

type RankedPrefecture = FullPrefectureRecord & {
  rank: number;
  deviation: number;
};

type MetricStatsSummary = {
  mean: number;
  stdDev: number;
  sum: number;
  median: number;
  maxPref: FullPrefectureRecord;
  minPref: FullPrefectureRecord;
  medianPref: FullPrefectureRecord;
};

const REGION_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  北海道: { bg: 'bg-sky-500/15', text: 'text-sky-800 dark:text-sky-300', border: 'border-sky-500/40', hex: '#0284c7' },
  東北: { bg: 'bg-cyan-500/15', text: 'text-cyan-800 dark:text-cyan-300', border: 'border-cyan-500/40', hex: '#0891b2' },
  関東: { bg: 'bg-blue-500/15', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-500/40', hex: '#2563eb' },
  中部: { bg: 'bg-emerald-500/15', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-500/40', hex: '#059669' },
  近畿: { bg: 'bg-amber-500/15', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-500/40', hex: '#d97706' },
  中国: { bg: 'bg-orange-500/15', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-500/40', hex: '#ea580c' },
  四国: { bg: 'bg-purple-500/15', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-500/40', hex: '#9333ea' },
  九州: { bg: 'bg-rose-500/15', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-500/40', hex: '#e11d48' },
  沖縄: { bg: 'bg-pink-500/15', text: 'text-pink-800 dark:text-pink-300', border: 'border-pink-500/40', hex: '#db2777' },
};

const COMPARE_PALETTE = ['#b4552d', '#2563eb', '#059669', '#9333ea'];

const intFormatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 });
const dec1Formatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const dec2Formatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMetricValue(value: number, decimals: number): string {
  if (decimals === 0) return intFormatter.format(Math.round(value));
  if (decimals === 1) return dec1Formatter.format(value);
  return dec2Formatter.format(value);
}

function formatMetricByKey(value: number, key: MetricKey): string {
  const def = METRIC_MAP[key];
  return formatMetricValue(value, def ? def.decimals : 1);
}

function compareByMetric(
  a: FullPrefectureRecord,
  b: FullPrefectureRecord,
  key: MetricKey,
  direction: SortDirection,
): number {
  const primary = direction === 'desc' ? b[key] - a[key] : a[key] - b[key];
  return primary || a.code - b.code;
}

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(rows: RankedPrefecture[], metrics: MetricDefinition[]): string {
  const header = [
    '選択指標の全国順位',
    '都道府県コード',
    '都道府県',
    '県庁所在地',
    '地域',
    ...metrics.map((m) => `${m.label}（${m.unit}）`),
  ];
  const body = rows.map((pref) => [
    pref.rank,
    pref.code,
    pref.name,
    pref.capital,
    pref.region,
    ...metrics.map((m) =>
      m.decimals === 0 ? Math.round(pref[m.key]) : pref[m.key].toFixed(m.decimals),
    ),
  ]);

  return [header, ...body].map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
}

function getHeatColor(ratio: number): { bg: string; text: string; border: string } {
  if (ratio >= 0.8) {
    return {
      bg: 'bg-[#9e2a2b] text-white',
      text: 'text-white',
      border: 'border-[#7a1c1d]',
    };
  }
  if (ratio >= 0.6) {
    return {
      bg: 'bg-[#d96b43] text-white',
      text: 'text-white',
      border: 'border-[#b8522d]',
    };
  }
  if (ratio >= 0.4) {
    return {
      bg: 'bg-[#e9b872] text-[#1c1917]',
      text: 'text-[#1c1917]',
      border: 'border-[#c8964e]',
    };
  }
  if (ratio >= 0.2) {
    return {
      bg: 'bg-[#8ab17d] text-[#1c1917]',
      text: 'text-[#1c1917]',
      border: 'border-[#688f5b]',
    };
  }
  return {
    bg: 'bg-[#457b9d] text-white',
    text: 'text-white',
    border: 'border-[#2d5d7b]',
  };
}

function RadarChartSvg({
  items,
}: {
  items: { name: string; color: string; genreScores: Record<Exclude<MetricGenreId, 'all'>, number> }[];
}) {
  const cx = 140;
  const cy = 135;
  const maxR = 92;
  const genres = GENRE_META;
  const levels = [30, 40, 50, 60, 70];

  const pointAt = (index: number, score: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / genres.length;
    const clamped = Math.max(25, Math.min(75, score));
    const r = ((clamped - 25) / 50) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  return (
    <svg
      viewBox="0 0 280 270"
      className="mx-auto h-auto w-full max-w-[280px] select-none"
      role="img"
      aria-label="6ジャンル別の偏差値バランスレーダーチャート"
    >
      {levels.map((lv) => {
        const pts = genres
          .map((_, idx) => {
            const p = pointAt(idx, lv);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(' ');
        return (
          <polygon
            key={lv}
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeOpacity={lv === 50 ? 0.45 : 0.16}
            strokeDasharray={lv === 50 ? '3 2' : undefined}
            strokeWidth={lv === 50 ? 1.4 : 0.8}
          />
        );
      })}

      {genres.map((g, idx) => {
        const end = pointAt(idx, 75);
        const labelPos = pointAt(idx, 88);
        return (
          <g key={g.id}>
            <line
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={0.8}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[var(--ink)] text-[10px] font-bold"
            >
              {g.shortLabel}
            </text>
          </g>
        );
      })}

      {items.map((item) => {
        const pts = genres
          .map((g, idx) => {
            const p = pointAt(idx, item.genreScores[g.id] ?? 50);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(' ');
        return (
          <g key={item.name}>
            <polygon
              points={pts}
              fill={item.color}
              fillOpacity={0.18}
              stroke={item.color}
              strokeWidth={2}
            />
            {genres.map((g, idx) => {
              const p = pointAt(idx, item.genreScores[g.id] ?? 50);
              return (
                <circle
                  key={g.id}
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill={item.color}
                  stroke="#fff"
                  strokeWidth={1}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function PrefectureRanking() {
  const [activeGenre, setActiveGenre] = useState<MetricGenreId>('all');
  const [sortKey, setSortKey] = useState<MetricKey>('population');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('bars');
  const [region, setRegion] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [compareNames, setCompareNames] = useState<string[]>(['東京都', '大阪府', '愛知県']);
  const [dossierPrefName, setDossierPrefName] = useState<string>('東京都');
  const [scatterX, setScatterX] = useState<MetricKey>('density');
  const [scatterY, setScatterY] = useState<MetricKey>('homeOwnershipRate');
  const [csvScope, setCsvScope] = useState<'genre' | 'all'>('genre');
  const [csvNotice, setCsvNotice] = useState<string>('');

  const prefectures = FULL_PREFECTURE_STATS;

  const regions = useMemo(
    () => Array.from(new Set(prefectures.map((p) => p.region))),
    [prefectures],
  );

  // Precompute rank map, mean, stdDev, and deviation score for every metric
  const { rankMaps, deviationMaps, metricSummaries } = useMemo(() => {
    const rMaps = new Map<MetricKey, Map<string, number>>();
    const dMaps = new Map<MetricKey, Map<string, number>>();
    const summaries = new Map<MetricKey, MetricStatsSummary>();

    for (const def of METRIC_DEFINITIONS) {
      const key = def.key;
      const sortedDesc = [...prefectures].sort((a, b) => compareByMetric(a, b, key, 'desc'));
      rMaps.set(
        key,
        new Map(sortedDesc.map((pref, idx) => [pref.name, idx + 1] as const)),
      );

      const values = prefectures.map((p) => p[key]);
      const sum = values.reduce((acc, v) => acc + v, 0);
      const mean = sum / values.length;
      const variance =
        values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
      const stdDev = Math.sqrt(variance) || 1;

      const devMap = new Map<string, number>();
      for (const pref of prefectures) {
        const z = (pref[key] - mean) / stdDev;
        devMap.set(pref.name, 50 + z * 10);
      }
      dMaps.set(key, devMap);

      const medianPref = sortedDesc[23];
      summaries.set(key, {
        mean,
        stdDev,
        sum,
        median: medianPref[key],
        maxPref: sortedDesc[0],
        minPref: sortedDesc[sortedDesc.length - 1],
        medianPref,
      });
    }

    return { rankMaps: rMaps, deviationMaps: dMaps, metricSummaries: summaries };
  }, [prefectures]);

  // Precompute 6-genre average deviation score per prefecture for Radar Chart
  const prefectureGenreScores = useMemo(() => {
    const map = new Map<string, Record<Exclude<MetricGenreId, 'all'>, number>>();
    for (const pref of prefectures) {
      const scores = {} as Record<Exclude<MetricGenreId, 'all'>, number>;
      for (const g of GENRE_META) {
        const genreMetrics = METRIC_DEFINITIONS.filter((m) => m.genre === g.id);
        const avgDev =
          genreMetrics.reduce(
            (sum, m) => sum + (deviationMaps.get(m.key)?.get(pref.name) ?? 50),
            0,
          ) / genreMetrics.length;
        scores[g.id] = avgDev;
      }
      map.set(pref.name, scores);
    }
    return map;
  }, [deviationMaps, prefectures]);

  const visibleMetricDefs = useMemo(() => {
    if (activeGenre === 'all') return METRIC_DEFINITIONS;
    return METRIC_DEFINITIONS.filter((m) => m.genre === activeGenre);
  }, [activeGenre]);

  const activeMetric = METRIC_MAP[sortKey];
  const activeSummary = metricSummaries.get(sortKey)!;

  const filteredPrefectures = useMemo<RankedPrefecture[]>(() => {
    const keyword = query.trim();
    const activeRankMap = rankMaps.get(sortKey);
    const activeDevMap = deviationMaps.get(sortKey);

    return prefectures
      .filter((pref) => region === 'all' || pref.region === region)
      .filter(
        (pref) =>
          keyword === '' ||
          pref.name.includes(keyword) ||
          pref.shortName.includes(keyword) ||
          pref.capital.includes(keyword) ||
          pref.region.includes(keyword),
      )
      .sort((a, b) => compareByMetric(a, b, sortKey, sortDirection))
      .map((pref) => ({
        ...pref,
        rank: activeRankMap?.get(pref.name) ?? 0,
        deviation: activeDevMap?.get(pref.name) ?? 50,
      }));
  }, [deviationMaps, prefectures, query, rankMaps, region, sortDirection, sortKey]);

  const comparedPrefectures = useMemo<RankedPrefecture[]>(() => {
    const activeRankMap = rankMaps.get(sortKey);
    const activeDevMap = deviationMaps.get(sortKey);
    return compareNames
      .map((name) => {
        const pref = prefectures.find((item) => item.name === name);
        if (!pref) return undefined;
        return {
          ...pref,
          rank: activeRankMap?.get(pref.name) ?? 0,
          deviation: activeDevMap?.get(pref.name) ?? 50,
        };
      })
      .filter((item): item is RankedPrefecture => item !== undefined);
  }, [compareNames, deviationMaps, prefectures, rankMaps, sortKey]);

  const dossierPref = useMemo(() => {
    return prefectures.find((p) => p.name === dossierPrefName) ?? prefectures[12];
  }, [dossierPrefName, prefectures]);

  const dossierTopAndBottom = useMemo(() => {
    const items = METRIC_DEFINITIONS.map((def) => ({
      def,
      value: dossierPref[def.key],
      rank: rankMaps.get(def.key)?.get(dossierPref.name) ?? 24,
      deviation: deviationMaps.get(def.key)?.get(dossierPref.name) ?? 50,
    }));
    const sortedByRankAsc = [...items].sort((a, b) => a.rank - b.rank || b.deviation - a.deviation);
    const sortedByRankDesc = [...items].sort((a, b) => b.rank - a.rank || a.deviation - b.deviation);
    return {
      top5: sortedByRankAsc.slice(0, 5),
      bottom5: sortedByRankDesc.slice(0, 5),
      all: items,
    };
  }, [deviationMaps, dossierPref, rankMaps]);

  // Correlation calculation for Scatter view
  const scatterAnalysis = useMemo(() => {
    const xDef = METRIC_MAP[scatterX];
    const yDef = METRIC_MAP[scatterY];
    const xs = prefectures.map((p) => p[scatterX]);
    const ys = prefectures.map((p) => p[scatterY]);
    const n = prefectures.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const r = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
    const slope = denX > 0 ? num / denX : 0;
    const intercept = meanY - slope * meanX;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      xDef,
      yDef,
      r,
      slope,
      intercept,
      minX,
      maxX,
      minY,
      maxY,
      meanX,
      meanY,
    };
  }, [prefectures, scatterX, scatterY]);

  // Regional summary including active metric
  const regionalSummary = useMemo(() => {
    const nationalPop = prefectures.reduce((s, p) => s + p.population, 0);
    const nationalArea = prefectures.reduce((s, p) => s + p.area, 0);

    return regions.map((regionName) => {
      const members = prefectures.filter((p) => p.region === regionName);
      const totalPopulation = members.reduce((s, p) => s + p.population, 0);
      const totalArea = members.reduce((s, p) => s + p.area, 0);
      const metricValues = members.map((p) => p[sortKey]);
      const metricSum = metricValues.reduce((a, b) => a + b, 0);
      const metricMean = metricSum / members.length;
      const topMember = [...members].sort((a, b) => b[sortKey] - a[sortKey])[0];

      return {
        region: regionName,
        count: members.length,
        totalPopulation,
        totalArea,
        averageDensity: totalPopulation / totalArea,
        populationShare: (totalPopulation / nationalPop) * 100,
        areaShare: (totalArea / nationalArea) * 100,
        metricSum,
        metricMean,
        topMember,
      };
    });
  }, [prefectures, regions, sortKey]);

  const handleSelectGenre = (genreId: MetricGenreId) => {
    setActiveGenre(genreId);
    if (genreId !== 'all') {
      const currentDef = METRIC_MAP[sortKey];
      if (currentDef.genre !== genreId) {
        const firstInGenre = METRIC_DEFINITIONS.find((m) => m.genre === genreId);
        if (firstInGenre) {
          setSortKey(firstInGenre.key);
        }
      }
    }
    setCsvNotice('');
  };

  const toggleCompare = (name: string) => {
    setCompareNames((current) => {
      if (current.includes(name)) {
        return current.filter((item) => item !== name);
      }
      if (current.length >= 4) {
        return current;
      }
      return [...current, name];
    });
    setCsvNotice('');
  };

  const resetConditions = () => {
    setActiveGenre('all');
    setSortKey('population');
    setSortDirection('desc');
    setRegion('all');
    setQuery('');
    setCsvNotice('');
  };

  const csvMetrics = useMemo(() => {
    if (csvScope === 'all' || activeGenre === 'all') return METRIC_DEFINITIONS;
    return visibleMetricDefs;
  }, [activeGenre, csvScope, visibleMetricDefs]);

  const copyCsv = async () => {
    if (filteredPrefectures.length === 0) return;
    const csv = buildCsv(filteredPrefectures, csvMetrics);
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
        if (!copied) throw new Error('copy failed');
      }
      setCsvNotice(`表示中${filteredPrefectures.length}件（${csvMetrics.length}指標）のCSVをコピーしました。`);
    } catch {
      setCsvNotice('コピーできませんでした。CSVダウンロードをお試しください。');
    }
  };

  const downloadCsv = () => {
    if (filteredPrefectures.length === 0) return;
    const csv = buildCsv(filteredPrefectures, csvMetrics);
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prefecture-ranking-${sortKey}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setCsvNotice(`表示中${filteredPrefectures.length}件（${csvMetrics.length}指標）のCSVをダウンロードしました。`);
  };

  const directionLabel =
    sortDirection === 'desc' ? activeMetric.descendingLabel : activeMetric.ascendingLabel;

  const minVal = activeSummary.minPref[sortKey];
  const maxVal = activeSummary.maxPref[sortKey];
  const valSpan = Math.max(0.0001, maxVal - minVal);
  const absMax = Math.max(Math.abs(maxVal), Math.abs(minVal), 0.0001);

  return (
    <div className="grid min-w-0 gap-6">
      {/* SECTION 1: GENRE TABS & METRIC SELECTOR */}
      <section
        aria-labelledby="prefecture-controls-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">6 Genres / 36 Statistical Indicators</p>
            <h2 id="prefecture-controls-heading" className="font-editorial mt-1 text-xl sm:text-2xl">
              統計ジャンルとランキング指標を選択
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            全47都道府県・{METRIC_DEFINITIONS.length}指標収録
          </span>
        </div>

        {/* Genre Bar */}
        <div className="mt-4">
          <p className="text-xs font-bold text-[var(--ink)]">1. ジャンルで絞り込む</p>
          <div
            role="tablist"
            aria-label="統計ジャンル"
            className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeGenre === 'all'}
              onClick={() => handleSelectGenre('all')}
              className={`flex flex-col items-start justify-between rounded-sm border p-2.5 text-left transition-colors ${
                activeGenre === 'all'
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-bold text-[var(--ink)]'
                  : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--line-strong)]'
              }`}
            >
              <span className="font-label text-[9px] uppercase tracking-wider opacity-75">
                ALL GENRES
              </span>
              <span className="mt-1 text-xs font-bold text-[var(--ink)]">
                すべて表示
              </span>
              <span className="mt-1 text-[10px] opacity-80">
                全{METRIC_DEFINITIONS.length}指標
              </span>
            </button>

            {GENRE_META.map((g) => {
              const count = METRIC_DEFINITIONS.filter((m) => m.genre === g.id).length;
              const isSelected = activeGenre === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectGenre(g.id)}
                  className={`flex flex-col items-start justify-between rounded-sm border p-2.5 text-left transition-colors ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-bold text-[var(--ink)]'
                      : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--line-strong)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: g.accentColor }}
                    />
                    <span className="truncate">{g.shortLabel}</span>
                  </span>
                  <span className="mt-1 line-clamp-1 text-[11px] text-[var(--ink)]">
                    {g.label}
                  </span>
                  <span className="mt-1 text-[10px] opacity-80">{count}指標</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Metric Chips */}
        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-[var(--ink)]">
              2. 比較・ランキングする指標を選ぶ（現在：{activeMetric.label}）
            </p>
            <span className="text-[11px] text-[var(--ink-soft)]">
              チップを押すと即座にランキング・地図・統計サマリーが切り替わります
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {visibleMetricDefs.map((def) => {
              const isSelected = sortKey === def.key;
              const genreInfo = GENRE_META.find((g) => g.id === def.genre);
              return (
                <button
                  key={def.key}
                  type="button"
                  onClick={() => {
                    setSortKey(def.key);
                    setCsvNotice('');
                  }}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs transition-all ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent)] font-bold text-white shadow-xs'
                      : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--accent)]'
                  }`}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: isSelected
                        ? '#ffffff'
                        : (genreInfo?.accentColor ?? '#666'),
                    }}
                  />
                  <span>{def.label}</span>
                  <span
                    className={`text-[10px] ${
                      isSelected ? 'text-white/85' : 'text-[var(--ink-soft)]'
                    }`}
                  >
                    ({def.unit})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Metric Hero KPI Banner */}
        <div className="mt-5 rounded-sm border border-[var(--line-strong)] bg-[var(--paper)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xs bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                  {GENRE_META.find((g) => g.id === activeMetric.genre)?.label}
                </span>
                <span className="font-label text-[10px] text-[var(--ink-soft)]">
                  出典: {activeMetric.source}
                </span>
              </div>
              <h3 className="font-editorial mt-1.5 text-lg sm:text-xl">
                {activeMetric.label}（単位：{activeMetric.unit}）
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
                {activeMetric.description}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSortDirection('desc')}
                aria-pressed={sortDirection === 'desc'}
                className="paper-chip rounded-sm px-3 py-1.5 text-xs"
              >
                降順（大きい順）
              </button>
              <button
                type="button"
                onClick={() => setSortDirection('asc')}
                aria-pressed={sortDirection === 'asc'}
                className="paper-chip rounded-sm px-3 py-1.5 text-xs"
              >
                昇順（小さい順）
              </button>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <div className="border border-[var(--line)] bg-[var(--paper-strong)] p-2.5">
              <dt className="text-[10px] font-bold text-[var(--accent)]">全国 1位（最高値）</dt>
              <dd className="font-editorial mt-1 text-base font-bold text-[var(--ink)]">
                {activeSummary.maxPref.name}
              </dd>
              <dd className="mt-0.5 text-xs font-bold tabular-nums text-[var(--ink)]">
                {formatMetricByKey(activeSummary.maxPref[sortKey], sortKey)}{' '}
                <span className="text-[10px] font-normal text-[var(--ink-soft)]">
                  {activeMetric.unit}
                </span>
              </dd>
            </div>

            <div className="border border-[var(--line)] bg-[var(--paper-strong)] p-2.5">
              <dt className="text-[10px] text-[var(--ink-soft)]">全国 24位（中央値）</dt>
              <dd className="font-editorial mt-1 text-base font-bold text-[var(--ink)]">
                {activeSummary.medianPref.name}
              </dd>
              <dd className="mt-0.5 text-xs font-bold tabular-nums text-[var(--ink)]">
                {formatMetricByKey(activeSummary.median, sortKey)}{' '}
                <span className="text-[10px] font-normal text-[var(--ink-soft)]">
                  {activeMetric.unit}
                </span>
              </dd>
            </div>

            <div className="border border-[var(--line)] bg-[var(--paper-strong)] p-2.5">
              <dt className="text-[10px] text-[var(--ink-soft)]">全国 47位（最小値）</dt>
              <dd className="font-editorial mt-1 text-base font-bold text-[var(--ink)]">
                {activeSummary.minPref.name}
              </dd>
              <dd className="mt-0.5 text-xs font-bold tabular-nums text-[var(--ink)]">
                {formatMetricByKey(activeSummary.minPref[sortKey], sortKey)}{' '}
                <span className="text-[10px] font-normal text-[var(--ink-soft)]">
                  {activeMetric.unit}
                </span>
              </dd>
            </div>

            <div className="border border-[var(--line)] bg-[var(--paper-strong)] p-2.5">
              <dt className="text-[10px] text-[var(--ink-soft)]">47都道府県 平均</dt>
              <dd className="font-editorial mt-1 text-base font-bold tabular-nums text-[var(--ink)]">
                {formatMetricByKey(activeSummary.mean, sortKey)}{' '}
                <span className="text-xs font-normal">{activeMetric.unit}</span>
              </dd>
              <dd className="mt-0.5 text-[10px] tabular-nums text-[var(--ink-soft)]">
                {activeMetric.summaryType === 'sum'
                  ? `全国合計: ${formatMetricByKey(activeSummary.sum, sortKey)} ${activeMetric.unit}`
                  : `標準偏差: ±${formatMetricByKey(activeSummary.stdDev, sortKey)}`}
              </dd>
            </div>

            <div className="col-span-2 border border-[var(--line)] bg-[var(--paper-strong)] p-2.5 sm:col-span-1">
              <dt className="text-[10px] text-[var(--ink-soft)]">1位と47位の差・倍率</dt>
              <dd className="font-editorial mt-1 text-base font-bold tabular-nums text-[var(--ink)]">
                {minVal > 0
                  ? `${(maxVal / minVal).toFixed(1)} 倍`
                  : `差 ${formatMetricByKey(maxVal - minVal, sortKey)}`}
              </dd>
              <dd className="mt-0.5 text-[10px] tabular-nums text-[var(--ink-soft)]">
                レンジ: {formatMetricByKey(maxVal - minVal, sortKey)} {activeMetric.unit}
              </dd>
            </div>
          </dl>
        </div>

        {/* Region Filter Pills + Search */}
        <div className="mt-4 grid gap-4 border-t border-[var(--line)] pt-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <span className="text-xs font-bold text-[var(--ink)]">
              3. 地域ブロックで絞り込み
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setRegion('all')}
                aria-pressed={region === 'all'}
                className="paper-chip rounded-sm px-2.5 py-1 text-xs"
              >
                全国（47）
              </button>
              {regions.map((r) => {
                const count = prefectures.filter((p) => p.region === r).length;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(r)}
                    aria-pressed={region === r}
                    className="paper-chip rounded-sm px-2.5 py-1 text-xs"
                  >
                    {r}（{count}）
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="prefecture-search"
              className="text-xs font-bold text-[var(--ink)]"
            >
              4. 都道府県・県庁所在地・地域で検索
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="prefecture-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="例: 東京、札幌、北陸、九州..."
                className="field-paper min-w-0 flex-1 rounded-sm px-3 py-1.5 text-sm"
              />
              {(query !== '' || region !== 'all') && (
                <button
                  type="button"
                  onClick={resetConditions}
                  className="paper-button shrink-0 rounded-sm px-3 py-1.5 text-xs"
                >
                  条件リセット
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: VIEW MODE SWITCHER & MAIN VISUALIZATION */}
      <section
        aria-labelledby="prefecture-ranking-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div>
            <p className="paper-kicker text-[9px]">Interactive Visualization</p>
            <h2 id="prefecture-ranking-heading" className="font-editorial mt-1 text-xl sm:text-2xl">
              {activeMetric.label}ランキング（{directionLabel}）
            </h2>
            <p role="status" aria-live="polite" className="mt-1 text-xs text-[var(--ink-soft)]">
              表示中 {filteredPrefectures.length} / 47 都道府県（順位は全国47都道府県での降順順位・偏差値は平均50）
            </p>
          </div>

          {/* 4 View Switcher Tabs */}
          <div
            role="tablist"
            aria-label="表示モード切替"
            className="flex flex-wrap gap-1.5"
          >
            {(
              [
                { id: 'bars', label: '棒グラフ順位' },
                { id: 'map', label: '日本地図ヒートマップ' },
                { id: 'scatter', label: '2指標クロス散布図' },
                { id: 'table', label: '全指標テーブル' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={viewMode === mode.id}
                onClick={() => setViewMode(mode.id)}
                className="paper-chip rounded-sm px-3 py-2 text-xs font-bold"
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* CSV Export Toolbar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[var(--ink-soft)]">CSV出力項目:</span>
            <button
              type="button"
              onClick={() => setCsvScope('genre')}
              aria-pressed={csvScope === 'genre'}
              className="paper-chip rounded-sm px-2.5 py-1 text-[11px]"
            >
              選択中ジャンル（{visibleMetricDefs.length}指標）
            </button>
            <button
              type="button"
              onClick={() => setCsvScope('all')}
              aria-pressed={csvScope === 'all'}
              className="paper-chip rounded-sm px-2.5 py-1 text-[11px]"
            >
              全36指標フル出力
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCsv}
              disabled={filteredPrefectures.length === 0}
              className="paper-button rounded-sm px-3 py-1.5 text-xs"
            >
              CSVをコピー
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={filteredPrefectures.length === 0}
              className="paper-button rounded-sm px-3 py-1.5 text-xs"
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

        {/* VIEW 1: VISUAL BAR RANKING */}
        {viewMode === 'bars' && (
          <div className="mt-4">
            {filteredPrefectures.length === 0 ? (
              <div className="border border-[var(--line)] bg-[var(--paper)] p-6 text-center">
                <p className="text-sm font-bold">条件に一致する都道府県がありません</p>
                <button
                  type="button"
                  onClick={resetConditions}
                  className="paper-button mt-3 rounded-sm px-4 py-2 text-xs"
                >
                  条件をリセット
                </button>
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredPrefectures.map((pref) => {
                  const val = pref[sortKey];
                  const isNegativeCapable = minVal < 0;
                  const barWidthPct = isNegativeCapable
                    ? Math.min(100, Math.max(4, ((val - minVal) / valSpan) * 100))
                    : Math.min(100, Math.max(3, (Math.max(0, val) / absMax) * 100));
                  const avgPosPct = isNegativeCapable
                    ? Math.min(100, Math.max(0, ((activeSummary.mean - minVal) / valSpan) * 100))
                    : Math.min(100, Math.max(0, (activeSummary.mean / absMax) * 100));

                  const isCompared = compareNames.includes(pref.name);
                  const isDossier = dossierPrefName === pref.name;
                  const regionStyle = REGION_COLORS[pref.region] ?? REGION_COLORS['関東'];

                  const rankBadgeStyle =
                    pref.rank === 1
                      ? 'bg-amber-500 text-white font-bold'
                      : pref.rank === 2
                        ? 'bg-slate-400 text-white font-bold'
                        : pref.rank === 3
                          ? 'bg-amber-700 text-white font-bold'
                          : 'bg-[var(--paper-muted)] text-[var(--ink)] font-bold';

                  return (
                    <div
                      key={pref.name}
                      className={`grid items-center gap-2 rounded-sm border p-2.5 transition-colors sm:grid-cols-[11rem_1fr_9.5rem_8.5rem] sm:gap-3 ${
                        isDossier
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]/35'
                          : 'border-[var(--line)] bg-[var(--paper-strong)] hover:border-[var(--line-strong)]'
                      }`}
                    >
                      {/* Col 1: Rank + Name + Region */}
                      <div className="flex items-center justify-between gap-2 sm:justify-start">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-6 min-w-8 items-center justify-center rounded-xs px-1.5 text-xs tabular-nums ${rankBadgeStyle}`}
                          >
                            {pref.rank}位
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => setDossierPrefName(pref.name)}
                              className="font-editorial text-left text-base font-bold text-[var(--ink)] hover:text-[var(--accent)] hover:underline"
                            >
                              {pref.name}
                            </button>
                            <span className="ml-1.5 text-[10px] text-[var(--ink-soft)]">
                              ({pref.capital})
                            </span>
                          </div>
                        </div>
                        <span
                          className={`rounded-xs border px-1.5 py-0.5 text-[10px] font-bold ${regionStyle.bg} ${regionStyle.text} ${regionStyle.border}`}
                        >
                          {pref.region}
                        </span>
                      </div>

                      {/* Col 2: Visual Bar + Average Marker */}
                      <div className="relative flex h-6 items-center overflow-hidden rounded-xs border border-[var(--line)] bg-[var(--paper)] px-1">
                        <div
                          className="h-3.5 rounded-xs transition-all duration-300"
                          style={{
                            width: `${barWidthPct}%`,
                            backgroundColor: regionStyle.hex,
                            opacity: 0.82,
                          }}
                        />
                        <div
                          title={`全国平均: ${formatMetricByKey(activeSummary.mean, sortKey)} ${activeMetric.unit}`}
                          className="pointer-events-none absolute top-0 bottom-0 border-r-2 border-dashed border-[var(--ink)]/55"
                          style={{ left: `${avgPosPct}%` }}
                        />
                      </div>

                      {/* Col 3: Value + Deviation Score */}
                      <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-end sm:justify-center">
                        <span className="font-editorial text-base font-bold tabular-nums text-[var(--ink)]">
                          {formatMetricByKey(val, sortKey)}{' '}
                          <span className="font-sans text-[10px] font-normal text-[var(--ink-soft)]">
                            {activeMetric.unit}
                          </span>
                        </span>
                        <span className="text-[10px] tabular-nums text-[var(--ink-soft)]">
                          偏差値{' '}
                          <strong
                            className={
                              pref.deviation >= 60
                                ? 'text-[var(--accent)]'
                                : pref.deviation <= 40
                                  ? 'text-sky-700 dark:text-sky-300'
                                  : 'text-[var(--ink)]'
                            }
                          >
                            {pref.deviation.toFixed(1)}
                          </strong>
                        </span>
                      </div>

                      {/* Col 4: Action Buttons */}
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDossierPrefName(pref.name)}
                          aria-pressed={isDossier}
                          className="paper-chip rounded-sm px-2 py-1 text-[10px]"
                        >
                          {isDossier ? 'カルテ表示中' : 'カルテ'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCompare(pref.name)}
                          aria-pressed={isCompared}
                          disabled={!isCompared && compareNames.length >= 4}
                          className="paper-chip rounded-sm px-2 py-1 text-[10px]"
                        >
                          {isCompared ? '比較中' : '+比較'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-[11px] text-[var(--ink-soft)]">
              棒グラフ内の破線は全国平均（{formatMetricByKey(activeSummary.mean, sortKey)}{' '}
              {activeMetric.unit}）の位置を示します。都道府県名または「カルテ」を押すと下部の詳細レーダーカルテが開きます。
            </p>
          </div>
        )}

        {/* VIEW 2: JAPAN TILE MAP HEATMAP */}
        {viewMode === 'map' && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[var(--line)] bg-[var(--paper)] p-3 text-xs">
              <div>
                <p className="font-bold text-[var(--ink)]">
                  日本地図カルトグラム・ヒートマップ（{activeMetric.label}）
                </p>
                <p className="text-[11px] text-[var(--ink-soft)]">
                  タイルをクリックすると都道府県カルテが切り替わります。色は全国最小〜最大を5段階で表しています。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="rounded-xs bg-[#457b9d] px-2 py-0.5 text-white">低い</span>
                <span className="rounded-xs bg-[#8ab17d] px-2 py-0.5 text-[#1c1917]">やや低い</span>
                <span className="rounded-xs bg-[#e9b872] px-2 py-0.5 text-[#1c1917]">中位</span>
                <span className="rounded-xs bg-[#d96b43] px-2 py-0.5 text-white">やや高い</span>
                <span className="rounded-xs bg-[#9e2a2b] px-2 py-0.5 text-white">高い</span>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto rounded-sm border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-5">
              <div
                className="mx-auto grid min-w-[680px] gap-1.5"
                style={{
                  gridTemplateColumns: 'repeat(12, minmax(52px, 1fr))',
                  gridTemplateRows: 'repeat(11, minmax(54px, auto))',
                }}
              >
                {prefectures.map((pref) => {
                  const val = pref[sortKey];
                  const rank = rankMaps.get(sortKey)?.get(pref.name) ?? 0;
                  const ratio = (val - minVal) / valSpan;
                  const heat = getHeatColor(ratio);
                  const isFilteredIn =
                    (region === 'all' || pref.region === region) &&
                    (query.trim() === '' ||
                      pref.name.includes(query.trim()) ||
                      pref.region.includes(query.trim()));
                  const isSelected = dossierPrefName === pref.name;

                  return (
                    <button
                      key={pref.name}
                      type="button"
                      onClick={() => setDossierPrefName(pref.name)}
                      style={{
                        gridColumnStart: pref.mapCol + 1,
                        gridRowStart: pref.mapRow + 1,
                      }}
                      className={`flex flex-col items-center justify-center rounded-xs border p-1 text-center transition-transform hover:scale-105 ${heat.bg} ${heat.border} ${
                        !isFilteredIn ? 'opacity-25' : ''
                      } ${isSelected ? 'ring-2 ring-[var(--ink)] ring-offset-1' : ''}`}
                      title={`${pref.name}（全国${rank}位）: ${formatMetricByKey(val, sortKey)} ${activeMetric.unit}`}
                    >
                      <span className="text-[9px] leading-tight opacity-85">#{rank}</span>
                      <span className="text-xs font-bold leading-tight">{pref.shortName}</span>
                      <span className="mt-0.5 text-[9px] leading-tight tabular-nums">
                        {formatMetricByKey(val, sortKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: 2-METRIC SCATTER & CORRELATION EXPLORER */}
        {viewMode === 'scatter' && (
          <div className="mt-4 grid gap-4">
            <div className="rounded-sm border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="text-xs font-bold text-[var(--ink)]">
                おすすめ2指標クロス分析プリセット（ワンタップでX軸・Y軸を設定）
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SCATTER_PRESETS.map((preset) => {
                  const active = scatterX === preset.xKey && scatterY === preset.yKey;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setScatterX(preset.xKey);
                        setScatterY(preset.yKey);
                      }}
                      aria-pressed={active}
                      className="paper-chip rounded-sm px-2.5 py-1.5 text-xs"
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="scatter-x-select" className="text-xs font-bold text-[var(--ink)]">
                    横軸（X軸）の指標
                  </label>
                  <select
                    id="scatter-x-select"
                    value={scatterX}
                    onChange={(e) => setScatterX(e.target.value as MetricKey)}
                    className="field-paper mt-1 w-full rounded-sm px-3 py-2 text-sm"
                  >
                    {METRIC_DEFINITIONS.map((m) => (
                      <option key={m.key} value={m.key}>
                        [{GENRE_META.find((g) => g.id === m.genre)?.shortLabel}] {m.label}（{m.unit}）
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="scatter-y-select" className="text-xs font-bold text-[var(--ink)]">
                    縦軸（Y軸）の指標
                  </label>
                  <select
                    id="scatter-y-select"
                    value={scatterY}
                    onChange={(e) => setScatterY(e.target.value as MetricKey)}
                    className="field-paper mt-1 w-full rounded-sm px-3 py-2 text-sm"
                  >
                    {METRIC_DEFINITIONS.map((m) => (
                      <option key={m.key} value={m.key}>
                        [{GENRE_META.find((g) => g.id === m.genre)?.shortLabel}] {m.label}（{m.unit}）
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-xs">
                <div>
                  <span className="font-bold text-[var(--ink)]">
                    相関係数 r = {scatterAnalysis.r.toFixed(3)}
                  </span>
                  <span className="ml-2 text-[var(--ink-soft)]">
                    （
                    {Math.abs(scatterAnalysis.r) >= 0.7
                      ? '強い相関'
                      : Math.abs(scatterAnalysis.r) >= 0.4
                        ? '中程度の相関'
                        : Math.abs(scatterAnalysis.r) >= 0.2
                          ? '弱い相関'
                          : 'ほぼ無相関'}
                    ）
                  </span>
                </div>
                <span className="text-[11px] text-[var(--ink-soft)]">
                  プロット点を押すとその都道府県のカルテを表示します
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-sm border border-[var(--line)] bg-[var(--paper-strong)] p-3">
              <svg
                viewBox="0 0 720 420"
                className="mx-auto h-auto w-full min-w-[560px] select-none"
                role="img"
                aria-label={`${scatterAnalysis.xDef.label}と${scatterAnalysis.yDef.label}の47都道府県散布図`}
              >
                {/* Plot Area: x=70..680, y=30..360 */}
                <rect
                  x={70}
                  y={30}
                  width={610}
                  height={330}
                  fill="var(--paper)"
                  stroke="var(--line-strong)"
                  strokeWidth={1}
                />

                {/* Mean Crosshairs */}
                {(() => {
                  const xSpan = Math.max(0.0001, scatterAnalysis.maxX - scatterAnalysis.minX);
                  const ySpan = Math.max(0.0001, scatterAnalysis.maxY - scatterAnalysis.minY);
                  const meanPxX =
                    70 + ((scatterAnalysis.meanX - scatterAnalysis.minX) / xSpan) * 610;
                  const meanPxY =
                    360 - ((scatterAnalysis.meanY - scatterAnalysis.minY) / ySpan) * 330;

                  // Regression line endpoints
                  const yAtMinX =
                    scatterAnalysis.slope * scatterAnalysis.minX + scatterAnalysis.intercept;
                  const yAtMaxX =
                    scatterAnalysis.slope * scatterAnalysis.maxX + scatterAnalysis.intercept;
                  const regY1 =
                    360 -
                    Math.max(0, Math.min(1, (yAtMinX - scatterAnalysis.minY) / ySpan)) * 330;
                  const regY2 =
                    360 -
                    Math.max(0, Math.min(1, (yAtMaxX - scatterAnalysis.minY) / ySpan)) * 330;

                  return (
                    <>
                      <line
                        x1={meanPxX}
                        y1={30}
                        x2={meanPxX}
                        y2={360}
                        stroke="currentColor"
                        strokeOpacity={0.22}
                        strokeDasharray="4 4"
                      />
                      <line
                        x1={70}
                        y1={meanPxY}
                        x2={680}
                        y2={meanPxY}
                        stroke="currentColor"
                        strokeOpacity={0.22}
                        strokeDasharray="4 4"
                      />
                      <line
                        x1={70}
                        y1={regY1}
                        x2={680}
                        y2={regY2}
                        stroke="var(--accent)"
                        strokeWidth={1.8}
                        strokeOpacity={0.65}
                      />
                    </>
                  );
                })()}

                {/* Points */}
                {prefectures.map((pref) => {
                  const xSpan = Math.max(0.0001, scatterAnalysis.maxX - scatterAnalysis.minX);
                  const ySpan = Math.max(0.0001, scatterAnalysis.maxY - scatterAnalysis.minY);
                  const cx = 70 + ((pref[scatterX] - scatterAnalysis.minX) / xSpan) * 610;
                  const cy = 360 - ((pref[scatterY] - scatterAnalysis.minY) / ySpan) * 330;
                  const color = REGION_COLORS[pref.region]?.hex ?? '#2563eb';
                  const isSelected = dossierPrefName === pref.name;

                  return (
                    <g
                      key={pref.name}
                      onClick={() => setDossierPrefName(pref.name)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 7 : 5}
                        fill={color}
                        fillOpacity={0.85}
                        stroke={isSelected ? '#111' : '#fff'}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <text
                        x={cx}
                        y={cy - 8}
                        textAnchor="middle"
                        className="fill-[var(--ink)] text-[9px] font-bold"
                      >
                        {pref.shortName}
                      </text>
                    </g>
                  );
                })}

                {/* Axis Labels */}
                <text
                  x={375}
                  y={400}
                  textAnchor="middle"
                  className="fill-[var(--ink)] text-xs font-bold"
                >
                  X軸: {scatterAnalysis.xDef.label}（{scatterAnalysis.xDef.unit}）
                </text>
                <text
                  x={20}
                  y={195}
                  textAnchor="middle"
                  transform="rotate(-90 20 195)"
                  className="fill-[var(--ink)] text-xs font-bold"
                >
                  Y軸: {scatterAnalysis.yDef.label}（{scatterAnalysis.yDef.unit}）
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* VIEW 4: STICKY MULTI-COLUMN DATA TABLE */}
        {viewMode === 'table' && (
          <div
            role="region"
            aria-label="都道府県ランキングの全指標一覧表。列ヘッダーをクリックして並び替えできます。"
            tabIndex={0}
            className="mt-4 max-h-[42rem] overflow-auto border border-[var(--line)]"
          >
            <table className="w-full min-w-[64rem] border-collapse text-right text-xs tabular-nums">
              <thead className="sticky top-0 z-10 bg-[var(--paper-muted)]">
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-20 border-b border-r border-[var(--line-strong)] bg-[var(--paper-muted)] px-3 py-2.5 text-left font-bold text-[var(--ink)]"
                  >
                    順位 / 都道府県
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2.5 text-left font-bold text-[var(--ink)]"
                  >
                    地域
                  </th>
                  {visibleMetricDefs.map((def) => {
                    const isSorted = sortKey === def.key;
                    return (
                      <th
                        key={def.key}
                        scope="col"
                        className={`border-b border-[var(--line-strong)] px-2.5 py-2 font-bold text-[var(--ink)] ${
                          isSorted ? 'bg-[var(--accent-soft)]' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (sortKey === def.key) {
                              setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
                            } else {
                              setSortKey(def.key);
                              setSortDirection('desc');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-right font-bold hover:text-[var(--accent)]"
                        >
                          <span>
                            {def.shortLabel}（{def.unit}）
                          </span>
                          {isSorted && <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>}
                        </button>
                      </th>
                    );
                  })}
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2.5 text-center font-bold text-[var(--ink)]"
                  >
                    比較
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPrefectures.map((pref) => {
                  const isCompared = compareNames.includes(pref.name);
                  return (
                    <tr
                      key={pref.name}
                      className="border-b border-[var(--line)] hover:bg-[var(--paper)]"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-r border-[var(--line)] bg-[var(--paper-strong)] px-3 py-2 text-left font-bold text-[var(--ink)]"
                      >
                        <span className="font-label mr-1.5 text-[10px] text-[var(--ink-soft)]">
                          {pref.rank}位
                        </span>
                        <button
                          type="button"
                          onClick={() => setDossierPrefName(pref.name)}
                          className="hover:text-[var(--accent)] hover:underline"
                        >
                          {pref.name}
                        </button>
                      </th>
                      <td className="whitespace-nowrap px-3 py-2 text-left">{pref.region}</td>
                      {visibleMetricDefs.map((def) => (
                        <td
                          key={def.key}
                          className={`whitespace-nowrap px-2.5 py-2 ${
                            def.key === sortKey ? 'bg-[var(--accent-soft)] font-bold' : ''
                          }`}
                        >
                          {formatMetricByKey(pref[def.key], def.key)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCompare(pref.name)}
                          aria-pressed={isCompared}
                          disabled={!isCompared && compareNames.length >= 4}
                          className="paper-chip rounded-sm px-2 py-0.5 text-[10px]"
                        >
                          {isCompared ? '比較中' : '+比較'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 3: PREFECTURE DOSSIER & RADAR CHART */}
      <section
        aria-labelledby="prefecture-dossier-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Prefecture Dossier &amp; Deviation Radar</p>
            <h2 id="prefecture-dossier-heading" className="font-editorial mt-1 text-xl sm:text-2xl">
              {dossierPref.name}（県庁所在地：{dossierPref.capital}）の統計カルテ
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="dossier-select" className="text-xs font-bold text-[var(--ink-soft)]">
              都道府県を切替:
            </label>
            <select
              id="dossier-select"
              value={dossierPrefName}
              onChange={(e) => setDossierPrefName(e.target.value)}
              className="field-paper rounded-sm px-3 py-1.5 text-sm font-bold"
            >
              {prefectures.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.code}. {p.name}（{p.region}）
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[290px_1fr]">
          {/* Radar + Genre Scores */}
          <div className="flex flex-col justify-between rounded-sm border border-[var(--line)] bg-[var(--paper)] p-4">
            <div>
              <p className="text-center text-xs font-bold text-[var(--ink)]">
                6ジャンル別・平均偏差値レーダー
              </p>
              <p className="mt-0.5 text-center text-[10px] text-[var(--ink-soft)]">
                破線が全国平均（偏差値50）
              </p>
              <div className="mt-2">
                <RadarChartSvg
                  items={[
                    {
                      name: dossierPref.name,
                      color: '#b4552d',
                      genreScores: prefectureGenreScores.get(dossierPref.name)!,
                    },
                  ]}
                />
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-1.5 border-t border-[var(--line)] pt-3 text-xs">
              {GENRE_META.map((g) => {
                const score = prefectureGenreScores.get(dossierPref.name)?.[g.id] ?? 50;
                return (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-xs bg-[var(--paper-strong)] px-2 py-1"
                  >
                    <dt className="text-[10px] text-[var(--ink-soft)]">{g.shortLabel}</dt>
                    <dd className="font-bold tabular-nums text-[var(--ink)]">
                      {score.toFixed(1)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Top 5 Strengths & Bottom 5 Characteristics */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--accent)]">TOP 5 RANKINGS</p>
              <h3 className="font-editorial mt-1 text-base font-bold">
                全国上位の指標トップ5（強み・特徴）
              </h3>
              <ul className="mt-3 grid gap-2">
                {dossierTopAndBottom.top5.map((item) => (
                  <li
                    key={item.def.key}
                    className="flex items-center justify-between gap-2 border-b border-dashed border-[var(--line)] pb-1.5 text-xs last:border-b-0"
                  >
                    <div>
                      <span className="inline-block min-w-12 rounded-xs bg-[var(--accent-soft)] px-1.5 py-0.5 text-center text-[10px] font-bold text-[var(--accent)]">
                        全国 {item.rank}位
                      </span>
                      <button
                        type="button"
                        onClick={() => setSortKey(item.def.key)}
                        className="ml-2 font-bold text-[var(--ink)] hover:text-[var(--accent)] hover:underline"
                      >
                        {item.def.label}
                      </button>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums text-[var(--ink)]">
                      {formatMetricByKey(item.value, item.def.key)}{' '}
                      <span className="text-[10px] font-normal text-[var(--ink-soft)]">
                        {item.def.unit}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-sm border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">LOWEST 5 RANKINGS</p>
              <h3 className="font-editorial mt-1 text-base font-bold">
                全国下位の指標5項目（逆方向の特徴）
              </h3>
              <ul className="mt-3 grid gap-2">
                {dossierTopAndBottom.bottom5.map((item) => (
                  <li
                    key={item.def.key}
                    className="flex items-center justify-between gap-2 border-b border-dashed border-[var(--line)] pb-1.5 text-xs last:border-b-0"
                  >
                    <div>
                      <span className="inline-block min-w-12 rounded-xs bg-[var(--paper-muted)] px-1.5 py-0.5 text-center text-[10px] font-bold text-[var(--ink-soft)]">
                        全国 {item.rank}位
                      </span>
                      <button
                        type="button"
                        onClick={() => setSortKey(item.def.key)}
                        className="ml-2 font-bold text-[var(--ink)] hover:text-[var(--accent)] hover:underline"
                      >
                        {item.def.label}
                      </button>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums text-[var(--ink)]">
                      {formatMetricByKey(item.value, item.def.key)}{' '}
                      <span className="text-[10px] font-normal text-[var(--ink-soft)]">
                        {item.def.unit}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick All-Metrics Mini Grid for Selected Prefecture */}
            <div className="rounded-sm border border-[var(--line)] bg-[var(--paper)] p-3 sm:col-span-2">
              <p className="text-xs font-bold text-[var(--ink)]">
                {dossierPref.name}の選択中ジャンル指標一覧（クリックでランキング指標を切替）
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {visibleMetricDefs.map((def) => {
                  const r = rankMaps.get(def.key)?.get(dossierPref.name) ?? 0;
                  const dev = deviationMaps.get(def.key)?.get(dossierPref.name) ?? 50;
                  return (
                    <button
                      key={def.key}
                      type="button"
                      onClick={() => setSortKey(def.key)}
                      className={`flex flex-col justify-between rounded-xs border p-2 text-left transition-colors ${
                        sortKey === def.key
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--line)] bg-[var(--paper-strong)] hover:border-[var(--line-strong)]'
                      }`}
                    >
                      <span className="text-[10px] text-[var(--ink-soft)]">{def.shortLabel}</span>
                      <span className="mt-0.5 text-xs font-bold tabular-nums text-[var(--ink)]">
                        {formatMetricByKey(dossierPref[def.key], def.key)}{' '}
                        <span className="text-[9px] font-normal">{def.unit}</span>
                      </span>
                      <span className="mt-1 text-[10px] text-[var(--ink-soft)]">
                        全国 <strong>{r}位</strong> / 偏差値 {dev.toFixed(0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: PIN-UP MULTI-PREFECTURE COMPARE */}
      <section
        aria-labelledby="prefecture-compare-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Pin-up Multi-Compare (Max 4)</p>
            <h2 id="prefecture-compare-heading" className="font-editorial mt-1 text-xl sm:text-2xl">
              都道府県のピンアップ徹底比較（{comparedPrefectures.length} / 4 件）
            </h2>
          </div>
          {comparedPrefectures.length > 0 && (
            <button
              type="button"
              onClick={() => setCompareNames([])}
              className="paper-button rounded-sm px-3 py-1.5 text-xs"
            >
              すべて解除
            </button>
          )}
        </div>

        {/* Presets */}
        <div className="mt-3">
          <p className="text-xs font-bold text-[var(--ink)]">
            定番の比較プリセット（ワンタップで読込）:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COMPARE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCompareNames(preset.names)}
                className="paper-chip rounded-sm px-2.5 py-1.5 text-xs"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {comparedPrefectures.length === 0 ? (
          <p className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4 text-xs text-[var(--ink-soft)]">
            ランキング一覧の「+比較」ボタンを押すか、上の比較プリセットを選ぶと最大4都道府県を並べてレーダーチャート＆全指標で比較できます。
          </p>
        ) : (
          <div className="mt-4 grid gap-5 lg:grid-cols-[280px_1fr]">
            {/* Overlaid Radar */}
            <div className="rounded-sm border border-[var(--line)] bg-[var(--paper)] p-3">
              <p className="text-center text-xs font-bold text-[var(--ink)]">
                重ね合わせ偏差値レーダー
              </p>
              <RadarChartSvg
                items={comparedPrefectures.map((p, idx) => ({
                  name: p.name,
                  color: COMPARE_PALETTE[idx % COMPARE_PALETTE.length],
                  genreScores: prefectureGenreScores.get(p.name)!,
                }))}
              />
              <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
                {comparedPrefectures.map((p, idx) => (
                  <span key={p.name} className="inline-flex items-center gap-1 font-bold">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COMPARE_PALETTE[idx % COMPARE_PALETTE.length] }}
                    />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {comparedPrefectures.map((pref, idx) => (
                <article
                  key={pref.name}
                  className="border border-[var(--line)] bg-[var(--paper-strong)] p-3"
                  style={{
                    borderTopWidth: '3px',
                    borderTopColor: COMPARE_PALETTE[idx % COMPARE_PALETTE.length],
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-editorial text-lg font-bold">{pref.name}</h3>
                      <p className="text-[11px] text-[var(--ink-soft)]">
                        {pref.region}（{pref.capital}） / {activeMetric.shortLabel} 全国{pref.rank}位
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCompare(pref.name)}
                      className="paper-button rounded-sm px-2 py-1 text-[10px]"
                    >
                      解除
                    </button>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
                    {visibleMetricDefs.slice(0, 10).map((def) => {
                      const r = rankMaps.get(def.key)?.get(pref.name) ?? 0;
                      return (
                        <div
                          key={def.key}
                          className={`rounded-xs px-2 py-1 ${
                            def.key === sortKey ? 'bg-[var(--accent-soft)] font-bold' : 'bg-[var(--paper)]'
                          }`}
                        >
                          <dt className="truncate text-[10px] text-[var(--ink-soft)]">
                            {def.shortLabel}
                          </dt>
                          <dd className="mt-0.5 font-bold tabular-nums text-[var(--ink)]">
                            {formatMetricByKey(pref[def.key], def.key)}{' '}
                            <span className="text-[9px] font-normal">{def.unit}</span>
                            <span className="ml-1 text-[9px] font-normal text-[var(--ink-soft)]">
                              ({r}位)
                            </span>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 5: REGIONAL SUMMARY & METRIC GUIDE */}
      <details className="paper-panel group min-w-0" open>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 sm:p-6 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="paper-kicker text-[9px]">Regional Breakdown</p>
            <h2 className="font-editorial mt-1 text-xl">
              地域ブロック別の集計（{activeMetric.label} ほか）
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              地域名をクリックするとその地域でランキングを絞り込めます。
            </p>
          </div>
          <span className="flex h-7 w-7 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper)] text-sm font-bold transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="overflow-auto border border-[var(--line)]">
            <table className="w-full min-w-[54rem] border-collapse text-right text-xs tabular-nums">
              <thead className="bg-[var(--paper-muted)]">
                <tr>
                  <th className="border-b border-[var(--line-strong)] px-3 py-2 text-left font-bold">
                    地域ブロック
                  </th>
                  <th className="border-b border-[var(--line-strong)] px-3 py-2 font-bold">
                    都道府県数
                  </th>
                  <th className="border-b border-[var(--line-strong)] bg-[var(--accent-soft)] px-3 py-2 font-bold">
                    {activeMetric.shortLabel} 地域平均（{activeMetric.unit}）
                  </th>
                  <th className="border-b border-[var(--line-strong)] px-3 py-2 font-bold">
                    地域内1位
                  </th>
                  <th className="border-b border-[var(--line-strong)] px-3 py-2 font-bold">
                    合計人口（人）
                  </th>
                  <th className="border-b border-[var(--line-strong)] px-3 py-2 font-bold">
                    全国人口シェア（%）
                  </th>
                  <th className="border-b border-[var(--line-strong)] px-3 py-2 font-bold">
                    合計面積（km²）
                  </th>
                </tr>
              </thead>
              <tbody>
                {regionalSummary.map((item) => {
                  const isActive = region === item.region;
                  return (
                    <tr
                      key={item.region}
                      className={`border-b border-[var(--line)] last:border-b-0 ${
                        isActive ? 'bg-[var(--accent-soft)]/50 font-bold' : ''
                      }`}
                    >
                      <th className="px-3 py-2 text-left font-bold">
                        <button
                          type="button"
                          onClick={() => setRegion(isActive ? 'all' : item.region)}
                          className="hover:text-[var(--accent)] hover:underline"
                        >
                          {item.region}
                        </button>
                      </th>
                      <td className="px-3 py-2">{item.count}</td>
                      <td className="bg-[var(--accent-soft)]/40 px-3 py-2 font-bold">
                        {formatMetricByKey(item.metricMean, sortKey)}
                      </td>
                      <td className="px-3 py-2">
                        {item.topMember.name}（
                        {formatMetricByKey(item.topMember[sortKey], sortKey)} {activeMetric.unit}）
                      </td>
                      <td className="px-3 py-2">{intFormatter.format(item.totalPopulation)}</td>
                      <td className="px-3 py-2">{dec2Formatter.format(item.populationShare)}%</td>
                      <td className="px-3 py-2">{intFormatter.format(item.totalArea)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
            ※ {PREFECTURE_DATA_NOTE}{' '}
            各ジャンル指標は総務省「統計でみる都道府県のすがた（社会生活統計指標）」・国勢調査・県民経済計算・住宅土地統計調査等の公表統計に基づく代表値・参考値です。
          </p>
        </div>
      </details>
    </div>
  );
}
