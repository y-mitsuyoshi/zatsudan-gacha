'use client';

import { useState } from 'react';
import {
  mean,
  parseDelimitedTable,
  quantile,
  standardDeviation,
} from '@/lib/statsCore';

const SAMPLE_CSV = `x,y,z
1.8,3.1,1.2
2.2,2.9,1.0
2.5,3.4,1.4
1.6,2.7,0.9
2.0,3.0,1.1
2.8,3.2,1.3
7.9,7.1,9.2
8.4,6.8,8.8
7.6,7.5,9.5
8.2,6.9,9.0
8.8,7.3,8.6
7.4,6.6,9.4
4.8,11.8,4.2
5.3,12.4,3.8
4.6,12.9,4.5
5.5,11.5,3.6
5.1,12.2,4.0
4.9,12.6,4.7`;

const K_OPTIONS = [2, 3, 4, 5, 6] as const;

const CLUSTER_COLORS = [
  '#c0392b',
  '#2f8f83',
  '#d19a2a',
  '#4f7fc1',
  '#9b6bb3',
  '#7a9a3a',
];

const numberFormatter = new Intl.NumberFormat('ja-JP');
const valueFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 6,
});
const coefficientFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const percentFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const axisFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 3,
});

const CHART_WIDTH = 620;
const CHART_HEIGHT = 420;
const CHART_PADDING = { top: 24, right: 24, bottom: 56, left: 64 };
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

type ParsedDataset = {
  headers: string[];
  rows: number[][];
  errors: string[];
};

type AnalysisData = {
  headers: string[];
  points: number[][];
  means: number[];
  scales: number[];
};

type ClusterResult = {
  assignments: number[];
  centers: number[][];
  sizes: number[];
  within: number[];
  inertia: number;
  totalInertia: number;
  silhouette: number | null;
  iterations: number;
};

type ChartGeometry = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xTicks: number[];
  yTicks: number[];
  xScale: (value: number) => number;
  yScale: (value: number) => number;
};

function parseDataset(raw: string): ParsedDataset {
  if (raw.trim() === '') {
    return {
      headers: [],
      rows: [],
      errors: ['CSVデータを入力してください。'],
    };
  }

  const table = parseDelimitedTable(raw);
  const errors = [...table.errors];
  const headers = table.headers.map((header) =>
    header.trim().replace(/^\uFEFF/, ''),
  );

  if (headers.length > 6) {
    errors.push('数値変数は2〜6列で入力してください。');
  }

  if (headers.some((header) => header === '')) {
    errors.push('ヘッダーに空の列名があります。列名を入力してください。');
  }

  if (new Set(headers).size !== headers.length) {
    errors.push('ヘッダーは重複しない名前にしてください。');
  }

  const rows: number[][] = [];

  for (let index = 0; index < table.rows.length; index += 1) {
    const row = table.rows[index];

    if (row.length !== headers.length) {
      continue;
    }

    const values: number[] = [];
    let valid = true;

    for (let column = 0; column < headers.length; column += 1) {
      const text = row[column].trim();
      const label = headers[column] || `列${column + 1}`;

      if (text === '') {
        errors.push(`${index + 2}行目「${label}」が空欄です。`);
        valid = false;
        break;
      }

      const value = Number(text);

      if (!Number.isFinite(value)) {
        errors.push(`${index + 2}行目「${label}」は数値ではありません。`);
        valid = false;
        break;
      }

      values.push(value);
    }

    if (valid) {
      rows.push(values);
    }
  }

  if (rows.length < 8) {
    errors.push(
      `クラスター分析には8行以上のデータが必要です（現在${numberFormatter.format(
        rows.length,
      )}行）。`,
    );
  }

  return { headers, rows, errors };
}

function buildAnalysisData(
  headers: string[],
  rows: number[][],
  standardize: boolean,
): AnalysisData {
  const columnCount = headers.length;
  const means = Array.from({ length: columnCount }, (_, column) =>
    mean(rows.map((row) => row[column])),
  );
  const deviations = Array.from({ length: columnCount }, (_, column) =>
    standardDeviation(rows.map((row) => row[column])),
  );
  const scales = deviations.map((deviation) =>
    standardize && deviation > 1e-12 ? deviation : 1,
  );
  const points = rows.map((row) =>
    row.map((value, column) => {
      if (!standardize) {
        return value;
      }

      return deviations[column] > 1e-12
        ? (value - means[column]) / deviations[column]
        : 0;
    }),
  );

  return { headers, points, means, scales };
}

function countDistinctRows(points: number[][]): number {
  const seen = new Set<string>();

  for (const point of points) {
    seen.add(point.map((value) => value.toPrecision(12)).join('|'));
  }

  return seen.size;
}

function squaredDistance(a: number[], b: number[]): number {
  let total = 0;

  for (let index = 0; index < a.length; index += 1) {
    const difference = a[index] - b[index];
    total += difference * difference;
  }

  return total;
}

function nearestCenter(
  point: number[],
  centers: number[][],
): { index: number; distance: number } {
  let index = 0;
  let distance = squaredDistance(point, centers[0]);

  for (let centerIndex = 1; centerIndex < centers.length; centerIndex += 1) {
    const candidate = squaredDistance(point, centers[centerIndex]);

    if (candidate < distance) {
      distance = candidate;
      index = centerIndex;
    }
  }

  return { index, distance };
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seedDeterministically(points: number[][], k: number): number[][] {
  const centers: number[][] = [[...points[0]]];
  const distances = points.map((point) =>
    squaredDistance(point, centers[0]),
  );

  while (centers.length < k) {
    let index = 0;
    let maximum = -1;

    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      if (distances[pointIndex] > maximum) {
        maximum = distances[pointIndex];
        index = pointIndex;
      }
    }

    centers.push([...points[index]]);

    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const distance = squaredDistance(points[pointIndex], points[index]);

      if (distance < distances[pointIndex]) {
        distances[pointIndex] = distance;
      }
    }
  }

  return centers;
}

function seedRandomly(
  points: number[][],
  k: number,
  random: () => number,
): number[][] {
  const indices = points.map((_, index) => index);

  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [indices[index], indices[swapIndex]] = [
      indices[swapIndex],
      indices[index],
    ];
  }

  const centers: number[][] = [];

  for (const index of indices) {
    if (
      centers.every(
        (center) => squaredDistance(center, points[index]) > 1e-12,
      )
    ) {
      centers.push([...points[index]]);

      if (centers.length === k) {
        break;
      }
    }
  }

  return centers.length === k
    ? centers
    : seedDeterministically(points, k);
}

function computeSilhouette(
  points: number[][],
  assignments: number[],
  k: number,
): number | null {
  if (points.length < 2 || k < 2) {
    return null;
  }

  const sizes = new Array<number>(k).fill(0);

  for (const cluster of assignments) {
    sizes[cluster] += 1;
  }

  let total = 0;
  let count = 0;

  for (let index = 0; index < points.length; index += 1) {
    const cluster = assignments[index];

    if (sizes[cluster] <= 1) {
      count += 1;
      continue;
    }

    let sameClusterTotal = 0;

    for (let otherIndex = 0; otherIndex < points.length; otherIndex += 1) {
      if (otherIndex === index || assignments[otherIndex] !== cluster) {
        continue;
      }

      sameClusterTotal += Math.sqrt(
        squaredDistance(points[index], points[otherIndex]),
      );
    }

    const a = sameClusterTotal / (sizes[cluster] - 1);
    let b = Number.POSITIVE_INFINITY;

    for (let otherCluster = 0; otherCluster < k; otherCluster += 1) {
      if (otherCluster === cluster || sizes[otherCluster] === 0) {
        continue;
      }

      let otherTotal = 0;

      for (
        let otherIndex = 0;
        otherIndex < points.length;
        otherIndex += 1
      ) {
        if (assignments[otherIndex] === otherCluster) {
          otherTotal += Math.sqrt(
            squaredDistance(points[index], points[otherIndex]),
          );
        }
      }

      const candidate = otherTotal / sizes[otherCluster];

      if (candidate < b) {
        b = candidate;
      }
    }

    if (Number.isFinite(b)) {
      const denominator = Math.max(a, b);
      total += denominator > 0 ? (b - a) / denominator : 0;
    }

    count += 1;
  }

  return count > 0 ? total / count : null;
}

function runKMeans(
  points: number[][],
  k: number,
  initialCenters: number[][],
): ClusterResult {
  const dimension = points[0].length;
  let centers = initialCenters.map((center) => [...center]);
  let assignments = new Array<number>(points.length).fill(0);
  let iterations = 0;

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const nextAssignments = new Array<number>(points.length);
    let changed = false;

    for (let index = 0; index < points.length; index += 1) {
      const nearest = nearestCenter(points[index], centers);
      nextAssignments[index] = nearest.index;

      if (nearest.index !== assignments[index]) {
        changed = true;
      }
    }

    assignments = nextAssignments;

    const counts = new Array<number>(k).fill(0);
    const sums = Array.from({ length: k }, () =>
      new Array<number>(dimension).fill(0),
    );

    for (let index = 0; index < points.length; index += 1) {
      const cluster = assignments[index];
      counts[cluster] += 1;

      for (let axis = 0; axis < dimension; axis += 1) {
        sums[cluster][axis] += points[index][axis];
      }
    }

    const nextCenters = centers.map((center, cluster) =>
      counts[cluster] > 0
        ? sums[cluster].map((total) => total / counts[cluster])
        : [...center],
    );
    let repaired = false;

    for (let cluster = 0; cluster < k; cluster += 1) {
      if (counts[cluster] > 0) {
        continue;
      }

      let candidate = -1;
      let candidateDistance = -1;

      for (let index = 0; index < points.length; index += 1) {
        const currentCluster = assignments[index];

        if (counts[currentCluster] <= 1) {
          continue;
        }

        const distance = squaredDistance(
          points[index],
          centers[currentCluster],
        );

        if (distance > candidateDistance) {
          candidateDistance = distance;
          candidate = index;
        }
      }

      if (candidate >= 0) {
        const previousCluster = assignments[candidate];
        nextCenters[cluster] = [...points[candidate]];
        assignments[candidate] = cluster;
        counts[previousCluster] -= 1;
        counts[cluster] = 1;
        repaired = true;
      }
    }

    let movement = 0;

    for (let cluster = 0; cluster < k; cluster += 1) {
      const distance = squaredDistance(centers[cluster], nextCenters[cluster]);

      if (distance > movement) {
        movement = distance;
      }
    }

    centers = nextCenters;
    iterations = iteration + 1;

    if (!changed && !repaired && movement < 1e-12) {
      break;
    }
  }

  const finalAssignments = points.map(
    (point) => nearestCenter(point, centers).index,
  );
  const sizes = new Array<number>(k).fill(0);
  const within = new Array<number>(k).fill(0);
  let inertia = 0;

  for (let index = 0; index < points.length; index += 1) {
    const cluster = finalAssignments[index];
    const distance = squaredDistance(points[index], centers[cluster]);
    sizes[cluster] += 1;
    within[cluster] += distance;
    inertia += distance;
  }

  const globalMean = Array.from({ length: dimension }, (_, axis) =>
    mean(points.map((point) => point[axis])),
  );
  const totalInertia = points.reduce(
    (total, point) => total + squaredDistance(point, globalMean),
    0,
  );

  return {
    assignments: finalAssignments,
    centers,
    sizes,
    within,
    inertia,
    totalInertia,
    silhouette: null,
    iterations,
  };
}

function computeClusters(points: number[][], k: number): ClusterResult {
  const random = createRandom(0x5eed1234);
  let best: ClusterResult | null = null;

  for (let restart = 0; restart < 10; restart += 1) {
    const initialCenters =
      restart === 0
        ? seedDeterministically(points, k)
        : seedRandomly(points, k, random);
    const candidate = runKMeans(points, k, initialCenters);

    if (best === null || candidate.inertia < best.inertia - 1e-12) {
      best = candidate;
    }
  }

  if (best === null) {
    const fallback = runKMeans(points, k, seedDeterministically(points, k));
    return {
      ...fallback,
      silhouette: computeSilhouette(points, fallback.assignments, k),
    };
  }

  return {
    ...best,
    silhouette: computeSilhouette(points, best.assignments, k),
  };
}

function getDomain(values: number[]): [number, number] {
  let minimum = values[0];
  let maximum = values[0];

  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];

    if (value < minimum) {
      minimum = value;
    }

    if (value > maximum) {
      maximum = value;
    }
  }

  if (minimum === maximum) {
    const padding = Math.abs(minimum) > 0 ? Math.abs(minimum) * 0.1 : 1;
    return [minimum - padding, maximum + padding];
  }

  const interquartileRange =
    quantile(values, 0.75) - quantile(values, 0.25);
  const padding = Math.max(
    interquartileRange > 0 ? interquartileRange * 0.15 : 0,
    (maximum - minimum) * 0.08,
  );

  return [minimum - padding, maximum + padding];
}

function getTicks(minimum: number, maximum: number): number[] {
  return Array.from(
    { length: 5 },
    (_, index) => minimum + ((maximum - minimum) * index) / 4,
  );
}

function buildChartGeometry(
  xValues: number[],
  yValues: number[],
): ChartGeometry {
  const [xMin, xMax] = getDomain(xValues);
  const [yMin, yMax] = getDomain(yValues);
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const xScale = (value: number) =>
    CHART_PADDING.left + ((value - xMin) / xRange) * PLOT_WIDTH;
  const yScale = (value: number) =>
    CHART_PADDING.top +
    PLOT_HEIGHT -
    ((value - yMin) / yRange) * PLOT_HEIGHT;

  return {
    xMin,
    xMax,
    yMin,
    yMax,
    xTicks: getTicks(xMin, xMax),
    yTicks: getTicks(yMin, yMax),
    xScale,
    yScale,
  };
}

function formatValue(value: number): string {
  return valueFormatter.format(value);
}

function formatCoefficient(value: number): string {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return coefficientFormatter.format(normalized);
}

function getSilhouetteLabel(value: number): string {
  if (value >= 0.7) {
    return '強いクラスター構造';
  }

  if (value >= 0.5) {
    return '妥当なクラスター構造';
  }

  if (value >= 0.25) {
    return '弱いクラスター構造';
  }

  return '構造が不明瞭';
}

function toOriginalCenter(
  center: number[],
  means: number[],
  scales: number[],
  standardize: boolean,
): number[] {
  return center.map((value, index) =>
    standardize ? value * scales[index] + means[index] : value,
  );
}

function truncateLabel(label: string): string {
  return label.length > 14 ? `${label.slice(0, 14)}...` : label;
}

export function ClusterAnalysis() {
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV);
  const [k, setK] = useState(3);
  const [standardize, setStandardize] = useState(true);

  const parsed = parseDataset(csvInput);
  const errors = [...parsed.errors];
  let analysis: AnalysisData | null = null;
  let result: ClusterResult | null = null;

  if (parsed.errors.length === 0 && parsed.rows.length >= 8) {
    analysis = buildAnalysisData(parsed.headers, parsed.rows, standardize);

    if (countDistinctRows(analysis.points) < k) {
      errors.push(
        `k=${numberFormatter.format(
          k,
        )}に分割するには、異なるデータ行が${numberFormatter.format(
          k,
        )}行以上必要です。`,
      );
    } else {
      result = computeClusters(analysis.points, k);
    }
  }

  const clusters =
    result !== null && analysis !== null
      ? result.centers.map((center, index) => ({
          index,
          color: CLUSTER_COLORS[index % CLUSTER_COLORS.length],
          size: result.sizes[index],
          share: result.sizes[index] / analysis.points.length,
          within: result.within[index],
          center: toOriginalCenter(
            center,
            analysis.means,
            analysis.scales,
            standardize,
          ),
        }))
      : [];

  const chart =
    result !== null && analysis !== null
      ? buildChartGeometry(
          analysis.points.map((point) => point[0]),
          analysis.points.map((point) => point[1]),
        )
      : null;

  const chartSummary =
    result !== null && analysis !== null
      ? `データ${numberFormatter.format(
          analysis.points.length,
        )}件を${numberFormatter.format(k)}個のクラスターに分けた散布図です。横軸は${
          analysis.headers[0]
        }、縦軸は${analysis.headers[1]}${
          standardize ? '（標準化後）' : ''
        }です。点の色はクラスター、大きい白抜きの円はクラスター中心を示します。${result.sizes
          .map(
            (size, index) =>
              `クラスター${numberFormatter.format(
                index + 1,
              )}は${numberFormatter.format(size)}件`,
          )
          .join('、')}です。`
      : '';

  const statusMessage =
    result !== null && analysis !== null
      ? `k=${numberFormatter.format(k)}、${
          standardize ? '標準化あり' : '標準化なし'
        }でクラスター分析を実行しました。データ数は${numberFormatter.format(
          analysis.points.length,
        )}件、シルエットスコアは${
          result.silhouette !== null
            ? formatCoefficient(result.silhouette)
            : '算出不可'
        }、クラスター内慣性の合計は${formatValue(result.inertia)}です。`
      : errors[0] ??
        'CSVデータを入力するとクラスター分析の結果を表示します。';

  const xAxisLabel =
    analysis !== null
      ? `${truncateLabel(analysis.headers[0])}${standardize ? ' (z)' : ''}`
      : '';
  const yAxisLabel =
    analysis !== null
      ? `${truncateLabel(analysis.headers[1])}${standardize ? ' (z)' : ''}`
      : '';

  const loadSample = () => {
    setCsvInput(SAMPLE_CSV);
    setK(3);
    setStandardize(true);
  };

  const resetForm = () => {
    setCsvInput('');
    setK(3);
    setStandardize(true);
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="クラスター分析（k-means）"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="cluster-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="cluster-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              CSVデータと設定
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            01 / 03
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          1行目にヘッダー、2行目以降に2〜6列の数値を入力します。行がサンプルです。カンマ・タブ・セミコロン区切りに対応し、8行以上の完全なデータが必要です。入力内容は自動で反映されます。
        </p>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="cluster-csv"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {numberFormatter.format(parsed.rows.length)}行
            </span>
          </div>
          <textarea
            id="cluster-csv"
            name="csv"
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            rows={12}
            placeholder={`x,y\n1.8,3.1\n2.2,2.9\n2.5,3.4`}
            spellCheck={false}
            aria-invalid={errors.length > 0}
            aria-describedby={
              errors.length > 0
                ? 'cluster-csv-help cluster-csv-error'
                : 'cluster-csv-help'
            }
            className="field-paper mt-2 h-64 w-full resize-y rounded-sm px-3 py-3 text-sm leading-6 tabular-nums"
          />
          <p
            id="cluster-csv-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            例: x,y,z のヘッダーに続けて、各サンプルの数値を列数分入力します。
          </p>
        </div>

        {errors.length > 0 && (
          <div
            id="cluster-csv-error"
            role="alert"
            className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              入力内容を確認してください
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-5 text-[var(--ink)]">
              {errors.slice(0, 6).map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
            {errors.length > 6 && (
              <p className="mt-1 text-[11px] leading-5 text-[var(--ink)]">
                ほか{numberFormatter.format(errors.length - 6)}
                件のエラーがあります。
              </p>
            )}
          </div>
        )}

        <fieldset className="mt-5" aria-describedby="cluster-k-help">
          <legend className="text-sm font-bold text-[var(--ink)]">
            クラスタ数 k
          </legend>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {K_OPTIONS.map((option) => {
              const isSelected = k === option;

              return (
                <label
                  key={option}
                  className={`paper-chip flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-sm px-2 py-2.5 text-center text-sm font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="cluster-k"
                    value={option}
                    checked={isSelected}
                    onChange={() => setK(option)}
                    className="sr-only"
                  />
                  <span>{numberFormatter.format(option)}</span>
                </label>
              );
            })}
          </div>
          <p
            id="cluster-k-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            k=2〜6。複数のkを試し、シルエットスコアや慣性、解釈のしやすさを比較してください。
          </p>
        </fieldset>

        <div className="mt-5">
          <label
            className={`paper-chip flex min-h-11 w-full cursor-pointer items-center justify-center rounded-sm px-3 py-2.5 text-center text-sm font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
              standardize ? 'paper-chip-active' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={standardize}
              onChange={(event) => setStandardize(event.target.checked)}
              aria-describedby="cluster-standardize-help"
              className="sr-only"
            />
            <span>標準化する（zスコア）</span>
          </label>
          <p
            id="cluster-standardize-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            変数の尺度が異なる場合は標準化を有効にします。各変数を平均0・標準偏差1に変換してからk-meansを実行します。
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={loadSample}
            className="paper-button rounded-sm px-4 py-2 text-xs"
          >
            サンプルCSVを入力
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="paper-button rounded-sm px-4 py-2 text-xs"
          >
            入力をリセット
          </button>
          <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
            入力内容は保存・送信されません。
          </p>
        </div>
      </form>

      <section
        aria-labelledby="cluster-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="cluster-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              分析結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            02 / 03
          </span>
        </div>

        <p
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {statusMessage}
        </p>

        {result !== null && analysis !== null ? (
          <div className="mt-4 space-y-3">
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  データ数
                </p>
                <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                  {numberFormatter.format(analysis.points.length)}{' '}
                  <span className="text-sm">行</span>
                </p>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  クラスタ数
                </p>
                <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                  k = {numberFormatter.format(k)}
                </p>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  シルエットスコア
                </p>
                {result.silhouette !== null ? (
                  <>
                    <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                      {formatCoefficient(result.silhouette)}
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
                      {getSilhouetteLabel(result.silhouette)}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                    算出できません。
                  </p>
                )}
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  最良解の反復回数
                </p>
                <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                  {numberFormatter.format(result.iterations)}{' '}
                  <span className="text-sm">回</span>
                </p>
              </div>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                慣性
              </p>
              <dl className="mt-2 grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-[11px] leading-5 text-[var(--ink-soft)]">
                    クラスター内慣性の合計
                  </dt>
                  <dd className="font-editorial mt-0.5 break-words text-xl leading-tight tabular-nums">
                    {formatValue(result.inertia)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] leading-5 text-[var(--ink-soft)]">
                    総慣性（全体の平方和）
                  </dt>
                  <dd className="font-editorial mt-0.5 break-words text-xl leading-tight tabular-nums">
                    {formatValue(result.totalInertia)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                慣性は分析空間での平方和です。
                {standardize ? '標準化後の値' : '元の値'}に基づきます。
              </p>
            </div>

            <div>
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                クラスター中心とサイズ
              </p>
              <div className="mt-2 space-y-2">
                {clusters.map((cluster) => (
                  <div
                    key={cluster.index}
                    className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="inline-block h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: cluster.color }}
                        />
                        <h3 className="text-sm font-bold text-[var(--ink)]">
                          クラスター{' '}
                          {numberFormatter.format(cluster.index + 1)}
                        </h3>
                      </div>
                      <p className="font-label text-[9px] text-[var(--ink-soft)]">
                        {numberFormatter.format(cluster.size)}件 /{' '}
                        {percentFormatter.format(cluster.share)}
                      </p>
                    </div>
                    <dl className="mt-2 grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                      {analysis.headers.map((header, index) => (
                        <div
                          key={`${cluster.index}-${header}-${index}`}
                          className="min-w-0"
                        >
                          <dt className="break-words text-[10px] leading-4 text-[var(--ink-soft)]">
                            {header}
                          </dt>
                          <dd className="font-editorial mt-0.5 break-words text-sm tabular-nums">
                            {formatValue(cluster.center[index])}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                      クラスター内慣性: {formatValue(cluster.within)}
                    </p>
                  </div>
                ))}
              </div>
              {standardize && (
                <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                  中心は標準化後の座標を元の単位に戻して表示しています。
                </p>
              )}
            </div>

            <div
              role="note"
              className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                結果の見方
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                k-meansは初期値によって結果が変わることがあります。このツールは10回の再スタートからクラスター内慣性が最も小さい解を表示します。標準化を有効にすると尺度の異なる変数を同じ重みで扱えますが、慣性の値も標準化後の尺度になります。
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            有効なCSVと設定を入力すると、クラスター中心・サイズ・慣性・散布図を表示します。
          </p>
        )}

        <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          k-meansは距離に基づく手法です。変数の尺度が大きく異なる場合は標準化を有効にしてください。クラスタ数はシルエットスコアや慣性、結果の解釈を参考に選びます。
        </p>
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="cluster-chart-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Chart</p>
            <h2
              id="cluster-chart-heading"
              className="font-editorial mt-1 text-xl"
            >
              散布図
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            03 / 03
          </span>
        </div>

        {result !== null && analysis !== null && chart !== null ? (
          <figure className="mt-4 min-w-0">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-labelledby="cluster-scatter-title"
              aria-describedby="cluster-scatter-desc"
              className="h-auto w-full"
            >
              <title id="cluster-scatter-title">
                クラスター別の散布図
              </title>
              <desc id="cluster-scatter-desc">{chartSummary}</desc>
              <defs>
                <clipPath id="cluster-plot-clip">
                  <rect
                    x={CHART_PADDING.left}
                    y={CHART_PADDING.top}
                    width={PLOT_WIDTH}
                    height={PLOT_HEIGHT}
                  />
                </clipPath>
              </defs>
              <g>
                {chart.yTicks.map((tick) => {
                  const y = chart.yScale(tick);

                  return (
                    <g key={`y-tick-${tick}`}>
                      <line
                        x1={CHART_PADDING.left}
                        y1={y}
                        x2={CHART_PADDING.left + PLOT_WIDTH}
                        y2={y}
                        stroke="var(--line)"
                        strokeWidth={1}
                        strokeDasharray="2 4"
                      />
                      <line
                        x1={CHART_PADDING.left - 6}
                        y1={y}
                        x2={CHART_PADDING.left}
                        y2={y}
                        stroke="var(--line-strong)"
                        strokeWidth={1.5}
                      />
                      <text
                        x={CHART_PADDING.left - 10}
                        y={y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fill="var(--ink-soft)"
                        fontSize={14}
                      >
                        {axisFormatter.format(tick)}
                      </text>
                    </g>
                  );
                })}
                {chart.xTicks.map((tick) => {
                  const x = chart.xScale(tick);

                  return (
                    <g key={`x-tick-${tick}`}>
                      <line
                        x1={x}
                        y1={CHART_PADDING.top}
                        x2={x}
                        y2={CHART_PADDING.top + PLOT_HEIGHT}
                        stroke="var(--line)"
                        strokeWidth={1}
                        strokeDasharray="2 4"
                      />
                      <line
                        x1={x}
                        y1={CHART_PADDING.top + PLOT_HEIGHT}
                        x2={x}
                        y2={CHART_PADDING.top + PLOT_HEIGHT + 6}
                        stroke="var(--line-strong)"
                        strokeWidth={1.5}
                      />
                      <text
                        x={x}
                        y={CHART_PADDING.top + PLOT_HEIGHT + 22}
                        textAnchor="middle"
                        fill="var(--ink-soft)"
                        fontSize={14}
                      >
                        {axisFormatter.format(tick)}
                      </text>
                    </g>
                  );
                })}
              </g>
              <line
                x1={CHART_PADDING.left}
                y1={CHART_PADDING.top + PLOT_HEIGHT}
                x2={CHART_PADDING.left + PLOT_WIDTH}
                y2={CHART_PADDING.top + PLOT_HEIGHT}
                stroke="var(--line-strong)"
                strokeWidth={1.5}
              />
              <line
                x1={CHART_PADDING.left}
                y1={CHART_PADDING.top}
                x2={CHART_PADDING.left}
                y2={CHART_PADDING.top + PLOT_HEIGHT}
                stroke="var(--line-strong)"
                strokeWidth={1.5}
              />
              <text
                x={CHART_PADDING.left + PLOT_WIDTH}
                y={CHART_PADDING.top + PLOT_HEIGHT + 44}
                textAnchor="end"
                fill="var(--ink)"
                fontSize={16}
              >
                {xAxisLabel}
              </text>
              <text
                x={CHART_PADDING.left - 46}
                y={CHART_PADDING.top + 4}
                fill="var(--ink)"
                fontSize={16}
              >
                {yAxisLabel}
              </text>
              <g clipPath="url(#cluster-plot-clip)">
                {analysis.points.map((point, index) => {
                  const cluster = result.assignments[index];

                  return (
                    <circle
                      key={`sample-${index}`}
                      cx={chart.xScale(point[0])}
                      cy={chart.yScale(point[1])}
                      r={4.5}
                      fill={CLUSTER_COLORS[cluster % CLUSTER_COLORS.length]}
                      stroke="var(--paper)"
                      strokeWidth={1.5}
                    />
                  );
                })}
                {result.centers.map((center, index) => (
                  <circle
                    key={`center-${index}`}
                    cx={chart.xScale(center[0])}
                    cy={chart.yScale(center[1])}
                    r={7}
                    fill="var(--paper-strong)"
                    stroke={CLUSTER_COLORS[index % CLUSTER_COLORS.length]}
                    strokeWidth={2.5}
                  />
                ))}
              </g>
            </svg>
            <figcaption className="mt-2 flex flex-col gap-1 text-[11px] leading-5 text-[var(--ink-soft)] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span>
                散布図は1列目「{analysis.headers[0]}」と2列目「
                {analysis.headers[1]}」を使用
                {standardize ? '（標準化後）' : ''}。点はサンプル、白抜きの円は中心です。
              </span>
              <span className="font-label shrink-0 text-[10px] tabular-nums">
                n = {numberFormatter.format(analysis.points.length)} / k ={' '}
                {numberFormatter.format(k)}
              </span>
            </figcaption>
            <ul
              className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5"
              aria-label="クラスターの凡例"
            >
              {clusters.map((cluster) => (
                <li
                  key={cluster.index}
                  className="flex items-center gap-1.5 text-[11px] text-[var(--ink-soft)]"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cluster.color }}
                  />
                  <span>
                    クラスター {numberFormatter.format(cluster.index + 1)}（
                    {numberFormatter.format(cluster.size)}件）
                  </span>
                </li>
              ))}
            </ul>
            <p className="sr-only">{chartSummary}</p>
          </figure>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なデータで分析すると、1列目と2列目の変数を使った散布図を表示します。
          </p>
        )}
      </section>
    </section>
  );
}
