'use client';

import { useState } from 'react';
import {
  mean,
  parseNumberList,
  quantile,
  standardDeviation,
  variance,
} from '@/lib/statsCore';

type ForecastMethod = 'exponential' | 'trend';

type SeriesEntry = {
  token: string;
  label: string | null;
};

type ParsedSeries = {
  values: number[];
  labels: (string | null)[];
  errors: string[];
};

type MovingAveragePoint = {
  index: number;
  value: number;
};

type AcfPoint = {
  lag: number;
  value: number | null;
};

type Analysis = {
  values: number[];
  labels: (string | null)[];
  movingAverage: MovingAveragePoint[];
  smoothing: number[];
  forecast: number[];
  acf: AcfPoint[];
  strongestAcf: { lag: number; value: number } | null;
  average: number;
  sampleVariance: number;
  sampleStandardDeviation: number;
  median: number;
  firstQuartile: number;
  thirdQuartile: number;
  minimum: number;
  maximum: number;
  differences: number[];
  differenceMean: number;
  latestDifference: number;
  trendSlope: number;
  trendIntercept: number;
  latestMovingAverage: number | null;
  latestSmoothed: number;
};

const MIN_VALUES = 8;
const MAX_LAG = 12;
const MAX_ERRORS = 6;
const FORECAST_STEPS = 3;

const SAMPLE_DATA = [
  '第1週 42',
  '第2週 45',
  '第3週 44',
  '第4週 48',
  '第5週 51',
  '第6週 50',
  '第7週 54',
  '第8週 57',
  '第9週 56',
  '第10週 60',
  '第11週 63',
  '第12週 62',
  '第13週 66',
  '第14週 69',
  '第15週 68',
  '第16週 72',
].join('\n');

const WINDOW_OPTIONS = Array.from({ length: 11 }, (_, index) => index + 2);
const ALPHA_OPTIONS = Array.from({ length: 9 }, (_, index) => (index + 1) / 10);

const FORECAST_OPTIONS: {
  value: ForecastMethod;
  label: string;
  note: string;
}[] = [
  {
    value: 'exponential',
    label: '指数平滑',
    note: '直近の平滑値を延長',
  },
  {
    value: 'trend',
    label: '線形トレンド',
    note: '回帰直線を延長',
  },
];

const countFormatter = new Intl.NumberFormat('ja-JP');
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 3,
});
const compactFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 4,
});
const axisFormatter = new Intl.NumberFormat('ja-JP', {
  notation: 'compact',
  maximumFractionDigits: 2,
});
const acfFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const acfAxisFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const alphaFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatCount(value: number): string {
  return countFormatter.format(value);
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  const absolute = Math.abs(normalized);
  if (absolute > 0 && absolute < 0.001) {
    return compactFormatter.format(normalized);
  }
  if (absolute >= 100_000_000) {
    return compactFormatter.format(normalized);
  }
  return decimalFormatter.format(normalized);
}

function formatSigned(value: number): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  if (normalized > 0) {
    return `+${formatNumber(normalized)}`;
  }
  if (normalized < 0) {
    return `-${formatNumber(Math.abs(normalized))}`;
  }
  return formatNumber(0);
}

function formatAcf(value: number): string {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return acfFormatter.format(normalized);
}

function isNumericToken(token: string): boolean {
  return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/u.test(token);
}

function normalizeInput(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/[−–—]/gu, '-')
    .replace(/\r\n?/g, '\n');
}

function parseSeries(raw: string): ParsedSeries {
  const normalized = normalizeInput(raw);
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: SeriesEntry[] = [];

  for (const line of lines) {
    const tokens = line
      .split(/[\s,、，;；\t]+/u)
      .map((token) => token.trim())
      .filter(Boolean);

    if (tokens.length === 0) {
      continue;
    }

    const firstToken = tokens[0];
    const lastToken = tokens[tokens.length - 1];
    const allNumeric = tokens.every(isNumericToken);

    if (allNumeric) {
      for (const token of tokens) {
        entries.push({ token, label: null });
      }
    } else if (!isNumericToken(firstToken) && isNumericToken(lastToken)) {
      const label = tokens.slice(0, -1).join(' ').trim();
      entries.push({ token: lastToken, label: label === '' ? null : label });
    } else {
      for (const token of tokens) {
        entries.push({ token, label: null });
      }
    }
  }

  if (entries.length === 0) {
    return {
      values: [],
      labels: [],
      errors: ['時系列の数値を入力してください。'],
    };
  }

  const parsed = parseNumberList(entries.map((entry) => entry.token).join(' '));
  const labels: (string | null)[] = [];

  for (const entry of entries) {
    if (Number.isFinite(Number(entry.token))) {
      labels.push(entry.label);
    }
  }

  const errors: string[] = [];

  if (parsed.invalid.length > 0) {
    const preview = parsed.invalid
      .slice(0, 3)
      .map((token) => `「${token}」`)
      .join('、');
    const suffix = parsed.invalid.length > 3 ? 'など' : '';
    errors.push(
      `${preview}${suffix}は数値として解釈できません。各行の末尾に数値を1つ置き、必要ならその前にラベルを入力してください。`,
    );
  } else if (parsed.values.length < MIN_VALUES) {
    errors.push(
      `時系列分析には${MIN_VALUES}件以上の数値が必要です（現在${formatCount(parsed.values.length)}件）。`,
    );
  }

  return {
    values: parsed.values,
    labels,
    errors,
  };
}

function buildAnalysis(
  values: number[],
  labels: (string | null)[],
  windowSize: number,
  alpha: number,
  forecastMethod: ForecastMethod,
): Analysis {
  const count = values.length;
  const movingAverage: MovingAveragePoint[] = [];
  let runningTotal = 0;

  for (let index = 0; index < count; index += 1) {
    runningTotal += values[index];
    if (index >= windowSize) {
      runningTotal -= values[index - windowSize];
    }
    if (index >= windowSize - 1) {
      movingAverage.push({
        index,
        value: runningTotal / windowSize,
      });
    }
  }

  const smoothing: number[] = [values[0]];
  for (let index = 1; index < count; index += 1) {
    smoothing.push(
      alpha * values[index] + (1 - alpha) * smoothing[index - 1],
    );
  }

  const average = mean(values);
  const sampleVariance = variance(values);
  const sampleStandardDeviation = standardDeviation(values);
  const medianValue = quantile(values, 0.5);
  const firstQuartile = quantile(values, 0.25);
  const thirdQuartile = quantile(values, 0.75);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const differences = values
    .slice(1)
    .map((value, index) => value - values[index]);
  const differenceMean = mean(differences);
  const latestDifference = differences[differences.length - 1];
  const timeAverage = mean(values.map((_, index) => index));

  let trendNumerator = 0;
  let trendDenominator = 0;

  for (let index = 0; index < count; index += 1) {
    const deviation = index - timeAverage;
    trendNumerator += deviation * (values[index] - average);
    trendDenominator += deviation * deviation;
  }

  const trendSlope =
    trendDenominator === 0 ? 0 : trendNumerator / trendDenominator;
  const trendIntercept = average - trendSlope * timeAverage;
  const acfDenominator = sampleVariance * (count - 1);
  const acf: AcfPoint[] = Array.from({ length: MAX_LAG }, (_, index) => {
    const lag = index + 1;
    if (lag >= count) {
      return { lag, value: null };
    }
    let lagNumerator = 0;
    for (let time = lag; time < count; time += 1) {
      lagNumerator +=
        (values[time] - average) * (values[time - lag] - average);
    }
    return {
      lag,
      value: acfDenominator === 0 ? null : lagNumerator / acfDenominator,
    };
  });

  let strongestAcf: { lag: number; value: number } | null = null;

  for (const point of acf) {
    if (point.value === null) {
      continue;
    }
    if (
      strongestAcf === null ||
      Math.abs(point.value) > Math.abs(strongestAcf.value)
    ) {
      strongestAcf = { lag: point.lag, value: point.value };
    }
  }

  const latestSmoothed = smoothing[smoothing.length - 1];
  const forecast = Array.from({ length: FORECAST_STEPS }, (_, index) =>
    forecastMethod === 'trend'
      ? trendIntercept + trendSlope * (count + index)
      : latestSmoothed,
  );

  return {
    values,
    labels,
    movingAverage,
    smoothing,
    forecast,
    acf,
    strongestAcf,
    average,
    sampleVariance,
    sampleStandardDeviation,
    median: medianValue,
    firstQuartile,
    thirdQuartile,
    minimum,
    maximum,
    differences,
    differenceMean,
    latestDifference,
    trendSlope,
    trendIntercept,
    latestMovingAverage:
      movingAverage.length > 0
        ? movingAverage[movingAverage.length - 1].value
        : null,
    latestSmoothed,
  };
}

function shortenLabel(value: string, maxLength = 6): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function SeriesChart({
  analysis,
  forecastMethod,
}: {
  analysis: Analysis;
  forecastMethod: ForecastMethod;
}) {
  const { values, labels, movingAverage, smoothing, forecast } = analysis;
  const width = 640;
  const height = 340;
  const marginTop = 24;
  const marginRight = 16;
  const marginBottom = 56;
  const marginLeft = 64;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const plotBottom = marginTop + plotHeight;
  const totalPoints = values.length + forecast.length;
  const allValues = [
    ...values,
    ...movingAverage.map((point) => point.value),
    ...smoothing,
    ...forecast,
  ];
  let minimum = Math.min(...allValues);
  let maximum = Math.max(...allValues);

  if (minimum === maximum) {
    const padding = Math.abs(minimum) * 0.1 || 1;
    minimum -= padding;
    maximum += padding;
  } else {
    const padding = (maximum - minimum) * 0.08;
    minimum -= padding;
    maximum += padding;
  }

  const yFor = (value: number) =>
    marginTop + ((maximum - value) / (maximum - minimum)) * plotHeight;
  const xFor = (index: number) =>
    totalPoints <= 1
      ? marginLeft + plotWidth / 2
      : marginLeft + (index / (totalPoints - 1)) * plotWidth;
  const yTicks = Array.from(
    { length: 5 },
    (_, index) => minimum + ((maximum - minimum) * index) / 4,
  );
  const tickIndices = new Set<number>();
  const tickStep = Math.max(1, Math.ceil((values.length - 1) / 6));

  for (let index = 0; index < values.length; index += tickStep) {
    tickIndices.add(index);
  }
  tickIndices.add(values.length - 1);

  const xTickIndices = Array.from(tickIndices).sort((left, right) => left - right);
  const forecastBoundary = xFor(values.length - 0.5);
  const forecastCenter = xFor(values.length + (forecast.length - 1) / 2);
  const forecastLabel =
    forecastMethod === 'trend' ? '線形トレンド' : '指数平滑';
  const chartDescription = `実測値は${formatCount(values.length)}件です。実測値の範囲は${formatNumber(Math.min(...values))}から${formatNumber(Math.max(...values))}、${forecastLabel}による3期先の予測値は${formatNumber(forecast[forecast.length - 1])}です。右側の網掛けは予測期間を示します。`;

  return (
    <figure className="mt-3 min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="time-series-chart-title"
        aria-describedby="time-series-chart-desc"
        className="h-auto w-full max-w-full"
      >
        <title id="time-series-chart-title">系列の推移と3期先予測</title>
        <desc id="time-series-chart-desc">{chartDescription}</desc>
        <rect
          x={forecastBoundary}
          y={marginTop}
          width={Math.max(0, width - marginRight - forecastBoundary)}
          height={plotHeight}
          fill="var(--paper-muted)"
          opacity={0.45}
        />
        <g className="text-[var(--line)]" stroke="currentColor">
          {yTicks.map((tick, index) => (
            <line
              key={`grid-${index}`}
              x1={marginLeft}
              y1={yFor(tick)}
              x2={width - marginRight}
              y2={yFor(tick)}
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          ))}
        </g>
        <line
          x1={forecastBoundary}
          y1={marginTop}
          x2={forecastBoundary}
          y2={plotBottom}
          stroke="var(--line-strong)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <g className="text-[var(--line-strong)]" stroke="currentColor">
          <line
            x1={marginLeft}
            y1={marginTop}
            x2={marginLeft}
            y2={plotBottom}
            strokeWidth={1}
          />
          <line
            x1={marginLeft}
            y1={plotBottom}
            x2={width - marginRight}
            y2={plotBottom}
            strokeWidth={1}
          />
        </g>
        <g className="text-[var(--ink-soft)]" fill="currentColor">
          {yTicks.map((tick, index) => (
            <text
              key={`y-tick-${index}`}
              x={marginLeft - 8}
              y={yFor(tick) + 3}
              textAnchor="end"
              fontSize="9"
            >
              {axisFormatter.format(tick)}
            </text>
          ))}
        </g>
        <g className="text-[var(--ink-soft)]" fill="currentColor">
          {xTickIndices.map((index) => {
            const label = labels[index] ?? String(index + 1);
            return (
              <text
                key={`x-tick-${index}`}
                x={xFor(index)}
                y={plotBottom + 16}
                textAnchor={
                  index === 0
                    ? 'start'
                    : index === values.length - 1
                      ? 'end'
                      : 'middle'
                }
                fontSize="9"
              >
                {shortenLabel(label)}
              </text>
            );
          })}
          <text
            x={forecastCenter}
            y={plotBottom + 34}
            textAnchor="middle"
            fontSize="9"
          >
            予測
          </text>
        </g>
        <polyline
          points={values
            .map((value, index) => `${xFor(index)},${yFor(value)}`)
            .join(' ')}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g>
          {values.map((value, index) => (
            <circle
              key={`actual-${index}`}
              cx={xFor(index)}
              cy={yFor(value)}
              r={2.6}
              fill="var(--accent)"
              stroke="var(--paper-strong)"
              strokeWidth={1}
            >
              <title>
                {`${labels[index] ?? `${index + 1}番目`}: ${formatNumber(value)}`}
              </title>
            </circle>
          ))}
        </g>
        {movingAverage.length > 1 && (
          <polyline
            points={movingAverage
              .map((point) => `${xFor(point.index)},${yFor(point.value)}`)
              .join(' ')}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {movingAverage.length === 1 && (
          <circle
            cx={xFor(movingAverage[0].index)}
            cy={yFor(movingAverage[0].value)}
            r={3}
            fill="var(--gold)"
          >
            <title>{`移動平均: ${formatNumber(movingAverage[0].value)}`}</title>
          </circle>
        )}
        <polyline
          points={smoothing
            .map((value, index) => `${xFor(index)},${yFor(value)}`)
            .join(' ')}
          fill="none"
          stroke="var(--ink-soft)"
          strokeWidth={1.8}
          strokeDasharray="5 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={forecast
            .map(
              (value, index) =>
                `${xFor(values.length + index)},${yFor(value)}`,
            )
            .join(' ')}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g>
          {forecast.map((value, index) => (
            <circle
              key={`forecast-${index}`}
              cx={xFor(values.length + index)}
              cy={yFor(value)}
              r={3.2}
              fill="var(--paper-strong)"
              stroke="var(--accent)"
              strokeWidth={2}
            >
              <title>
                {`${index + 1}期先の予測: ${formatNumber(value)}`}
              </title>
            </circle>
          ))}
        </g>
      </svg>
      <figcaption className="mt-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] leading-5 text-[var(--ink-soft)]">
          <li className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4"
              style={{ backgroundColor: 'var(--accent)' }}
            />
            実測値
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4"
              style={{ backgroundColor: 'var(--gold)' }}
            />
            移動平均
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block w-4 border-t-2 border-dashed"
              style={{ borderColor: 'var(--ink-soft)' }}
            />
            指数平滑
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block w-4 border-t-2 border-dashed"
              style={{ borderColor: 'var(--accent)' }}
            />
            3期先予測
          </li>
        </ul>
        <p className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
          横軸は時点、縦軸は値です。右側の網掛けは予測期間を示します。
        </p>
      </figcaption>
    </figure>
  );
}

function AcfChart({ entries }: { entries: AcfPoint[] }) {
  const width = 640;
  const height = 220;
  const marginTop = 20;
  const marginRight = 16;
  const marginBottom = 34;
  const marginLeft = 40;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const zeroY = marginTop + plotHeight / 2;
  const slotWidth = plotWidth / entries.length;
  const barWidth = Math.min(26, slotWidth * 0.55);
  const ticks = [-1, -0.5, 0, 0.5, 1];
  const yFor = (value: number) => marginTop + ((1 - value) / 2) * plotHeight;

  return (
    <figure className="mt-3 min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="time-series-acf-title"
        aria-describedby="time-series-acf-desc"
        className="h-auto w-full max-w-full"
      >
        <title id="time-series-acf-title">自己相関（ACF）の棒グラフ</title>
        <desc id="time-series-acf-desc">
          ラグ1から12までの自己相関を、-1から1の範囲の棒グラフで示します。
          データ数より大きいラグは算出不可として表示します。
        </desc>
        <g className="text-[var(--line)]" stroke="currentColor">
          {ticks.map((tick) => (
            <line
              key={`acf-grid-${tick}`}
              x1={marginLeft}
              y1={yFor(tick)}
              x2={width - marginRight}
              y2={yFor(tick)}
              strokeWidth={tick === 0 ? 1.5 : 1}
              strokeDasharray={tick === 0 ? undefined : '2 4'}
              className={tick === 0 ? 'text-[var(--line-strong)]' : undefined}
            />
          ))}
        </g>
        <g className="text-[var(--ink-soft)]" fill="currentColor">
          {ticks.map((tick) => (
            <text
              key={`acf-y-tick-${tick}`}
              x={marginLeft - 6}
              y={yFor(tick) + 3}
              textAnchor="end"
              fontSize="9"
            >
              {acfAxisFormatter.format(tick)}
            </text>
          ))}
        </g>
        {entries.map((entry, index) => {
          const x = marginLeft + slotWidth * (index + 0.5);
          return (
            <g key={`acf-${entry.lag}`}>
              {entry.value === null ? (
                <line
                  x1={x - barWidth / 2}
                  y1={zeroY}
                  x2={x + barWidth / 2}
                  y2={zeroY}
                  stroke="var(--line-strong)"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                >
                  <title>{`ラグ${entry.lag}: 算出不可`}</title>
                </line>
              ) : (
                <rect
                  x={x - barWidth / 2}
                  y={Math.min(yFor(entry.value), zeroY)}
                  width={barWidth}
                  height={Math.max(1, Math.abs(yFor(entry.value) - zeroY))}
                  rx={1}
                  fill={
                    entry.value >= 0 ? 'var(--accent)' : 'var(--gold)'
                  }
                  opacity={0.85}
                >
                  <title>
                    {`ラグ${entry.lag}: ${formatAcf(entry.value)}`}
                  </title>
                </rect>
              )}
              <text
                x={x}
                y={marginTop + plotHeight + 14}
                textAnchor="middle"
                fontSize="9"
                fill="var(--ink-soft)"
              >
                {entry.lag}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
        横軸はラグ、縦軸は自己相関係数です。0より大きいと前の値と似た動き、0より小さいと逆の動きを示します。
      </figcaption>
    </figure>
  );
}

export function TimeSeriesAnalysis() {
  const [input, setInput] = useState(SAMPLE_DATA);
  const [windowSize, setWindowSize] = useState(4);
  const [alpha, setAlpha] = useState(0.4);
  const [forecastMethod, setForecastMethod] =
    useState<ForecastMethod>('exponential');

  const parsed = parseSeries(input);
  const windowError =
    parsed.errors.length === 0 && windowSize > parsed.values.length
      ? `移動平均の期間（${windowSize}期）はデータ数（${formatCount(parsed.values.length)}件）以下にしてください。`
      : null;
  const errors =
    windowError !== null ? [...parsed.errors, windowError] : parsed.errors;
  const analysis =
    errors.length === 0
      ? buildAnalysis(
          parsed.values,
          parsed.labels,
          windowSize,
          alpha,
          forecastMethod,
        )
      : null;
  const forecastMethodLabel =
    FORECAST_OPTIONS.find((option) => option.value === forecastMethod)?.label ??
    '指数平滑';
  const forecastMethodHelp =
    forecastMethod === 'exponential'
      ? '指数平滑の最終値を3期先まで繰り返します。αが大きいほど直近の値の影響が強くなります。'
      : '最小二乗で求めた直線をそのまま延長して3期先を計算します。';
  const statusMessage =
    analysis !== null
      ? `時系列分析の結果を更新しました。データ数は${formatCount(analysis.values.length)}件、移動平均の期間は${windowSize}期、指数平滑のαは${alphaFormatter.format(alpha)}、予測方法は${forecastMethodLabel}です。3期先の予測値は${formatNumber(analysis.forecast[FORECAST_STEPS - 1])}です。`
      : errors.length > 0
        ? `入力エラーが${formatCount(errors.length)}件あります。${errors[0]}`
        : '時系列データを入力すると分析結果を表示します。';
  const summaryRows =
    analysis !== null
      ? [
          {
            label: 'データ数',
            value: `${formatCount(analysis.values.length)}件`,
          },
          { label: '平均', value: formatNumber(analysis.average) },
          {
            label: '標準偏差（標本）',
            value: formatNumber(analysis.sampleStandardDeviation),
          },
          {
            label: '分散（標本）',
            value: formatNumber(analysis.sampleVariance),
          },
          { label: '中央値', value: formatNumber(analysis.median) },
          {
            label: '四分位範囲（Q1〜Q3）',
            value: `${formatNumber(analysis.firstQuartile)}〜${formatNumber(analysis.thirdQuartile)}`,
          },
          {
            label: '最小値 / 最大値',
            value: `${formatNumber(analysis.minimum)} / ${formatNumber(analysis.maximum)}`,
          },
          {
            label: '最初の差分の平均',
            value: formatSigned(analysis.differenceMean),
          },
          {
            label: '直近の差分',
            value: formatSigned(analysis.latestDifference),
          },
          {
            label: '線形トレンドの傾き',
            value: formatSigned(analysis.trendSlope),
          },
          {
            label: '線形トレンドの切片',
            value: formatNumber(analysis.trendIntercept),
          },
        ]
      : [];

  const loadSample = () => {
    setInput(SAMPLE_DATA);
    setWindowSize(4);
    setAlpha(0.4);
    setForecastMethod('exponential');
  };

  const resetForm = () => {
    setInput('');
    setWindowSize(4);
    setAlpha(0.4);
    setForecastMethod('exponential');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="時系列分析"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="time-series-analysis-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="time-series-analysis-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              時系列データを入力
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]"
          >
            01 / 02
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          数値をカンマ・スペース・改行で区切って8件以上入力してください。各行の先頭に「第1週 42」のようなラベルを付けることもできます。入力内容は自動で反映されます。
        </p>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="time-series-analysis-input"
              className="text-sm font-bold text-[var(--ink)]"
            >
              時系列データ
            </label>
            <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
              8件以上
            </span>
          </div>
          <textarea
            id="time-series-analysis-input"
            name="series"
            rows={10}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={SAMPLE_DATA}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-invalid={errors.length > 0}
            aria-describedby={
              errors.length > 0
                ? 'time-series-analysis-help time-series-analysis-errors'
                : 'time-series-analysis-help'
            }
            className="field-paper mt-2 min-h-52 w-full rounded-sm px-3 py-3 text-sm leading-6 tabular-nums sm:text-base"
          />
          <p
            id="time-series-analysis-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            各行の末尾の数値を読み取り、その前の文字列はラベルとして扱います。ラベルなしのカンマ区切りやスペース区切りにも対応しています。
          </p>
          {errors.length > 0 && (
            <div
              id="time-series-analysis-errors"
              role="alert"
              className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                入力内容を確認してください
              </p>
              <ul className="mt-1 list-disc space-y-1 break-words pl-4 text-[11px] leading-5 text-[var(--ink)]">
                {errors.slice(0, MAX_ERRORS).map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
              {errors.length > MAX_ERRORS && (
                <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                  ほか{formatCount(errors.length - MAX_ERRORS)}件のエラーがあります。
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label
              htmlFor="time-series-analysis-window"
              className="text-sm font-bold text-[var(--ink)]"
            >
              移動平均の期間
            </label>
            <select
              id="time-series-analysis-window"
              name="window"
              value={windowSize}
              onChange={(event) => setWindowSize(Number(event.target.value))}
              aria-describedby="time-series-analysis-window-help"
              className="field-paper mt-2 w-full min-w-0 rounded-sm px-3 py-3 text-base"
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}期
                </option>
              ))}
            </select>
            <p
              id="time-series-analysis-window-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              直近の何期を平均するかを2〜12期から選びます。データ数以下にしてください。
            </p>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="time-series-analysis-alpha"
              className="text-sm font-bold text-[var(--ink)]"
            >
              指数平滑のα
            </label>
            <select
              id="time-series-analysis-alpha"
              name="alpha"
              value={alpha}
              onChange={(event) => setAlpha(Number(event.target.value))}
              aria-describedby="time-series-analysis-alpha-help"
              className="field-paper mt-2 w-full min-w-0 rounded-sm px-3 py-3 text-base"
            >
              {ALPHA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {alphaFormatter.format(option)}
                </option>
              ))}
            </select>
            <p
              id="time-series-analysis-alpha-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              αが大きいほど新しい値の重みが増し、変化への反応が早くなります。
            </p>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[var(--ink)]">
            3期先予測の方法
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FORECAST_OPTIONS.map((option) => {
              const isSelected = forecastMethod === option.value;
              return (
                <label
                  key={option.value}
                  className={`paper-chip flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center rounded-sm px-2 py-2.5 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="time-series-analysis-forecast"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setForecastMethod(option.value)}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold">{option.label}</span>
                  <span className="mt-0.5 text-[10px] font-normal opacity-80">
                    {option.note}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            {forecastMethodHelp}
          </p>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={loadSample}
            className="paper-button rounded-sm px-4 py-2 text-xs"
          >
            サンプルデータを入力
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
        aria-labelledby="time-series-analysis-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="time-series-analysis-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              分析結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]"
          >
            02 / 02
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

        {analysis !== null ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Forecast
                  </p>
                  <h3 className="font-editorial mt-1 text-base">
                    3期先までの予測
                  </h3>
                </div>
                <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-[10px] font-bold">
                  {forecastMethodLabel}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                {analysis.forecast.map((value, index) => (
                  <div
                    key={`forecast-value-${index}`}
                    className="min-w-0 border-t border-[var(--line)] pt-2"
                  >
                    <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                      {index + 1}期先
                    </dt>
                    <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatNumber(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                {forecastMethodHelp}
              </p>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Chart
                  </p>
                  <h3 className="font-editorial mt-1 text-base">
                    系列の推移と予測
                  </h3>
                </div>
                <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
                  n = {formatCount(analysis.values.length)}
                </span>
              </div>
              <SeriesChart
                analysis={analysis}
                forecastMethod={forecastMethod}
              />
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    ACF
                  </p>
                  <h3 className="font-editorial mt-1 text-base">
                    自己相関（ラグ1〜12）
                  </h3>
                </div>
                <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-[10px] font-bold">
                  {analysis.strongestAcf !== null
                    ? `最大 |ACF| ${formatAcf(Math.abs(analysis.strongestAcf.value))}（ラグ${analysis.strongestAcf.lag}）`
                    : 'ACF 算出不可'}
                </span>
              </div>
              <AcfChart entries={analysis.acf} />
              <ul className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-[10px] tabular-nums sm:grid-cols-6">
                {analysis.acf.map((entry) => (
                  <li
                    key={`acf-value-${entry.lag}`}
                    className="flex min-w-0 items-baseline justify-between gap-1 border-b border-[var(--line)] py-1"
                  >
                    <span className="text-[var(--ink-soft)]">
                      lag {entry.lag}
                    </span>
                    <span className="break-words font-bold">
                      {entry.value === null ? '—' : formatAcf(entry.value)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                {analysis.strongestAcf !== null
                  ? `ラグ${analysis.strongestAcf.lag}の自己相関が最も大きく、値は${formatAcf(analysis.strongestAcf.value)}です。`
                  : '系列の値がすべて同じため、自己相関を計算できません。'}{' '}
                データ数より大きいラグは「—」と表示します。
              </p>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Summary
                  </p>
                  <h3 className="font-editorial mt-1 text-base">
                    要約統計
                  </h3>
                </div>
                <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
                  移動平均 {windowSize}期 / α {alphaFormatter.format(alpha)}
                </span>
              </div>
              <table className="mt-3 w-full table-fixed border-collapse text-left text-[11px]">
                <caption className="sr-only">
                  時系列データの要約統計量
                </caption>
                <tbody>
                  {summaryRows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-[var(--line)] last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="w-[46%] py-2 pr-2 text-left font-normal text-[var(--ink-soft)]"
                      >
                        {row.label}
                      </th>
                      <td className="break-words py-2 text-right font-bold tabular-nums">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                分散と標準偏差は標本（n−1）基準、四分位点は線形補間で算出しています。移動平均の最新値は
                {analysis.latestMovingAverage !== null
                  ? formatNumber(analysis.latestMovingAverage)
                  : '算出不可'}
                、指数平滑の最新値は{formatNumber(analysis.latestSmoothed)}です。
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="font-editorial text-lg">
              {errors.length > 0
                ? '入力内容を確認してください'
                : '時系列データを入力してください'}
            </p>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
              {errors.length > 0
                ? '入力内容にエラーがあります。左のエラーメッセージを確認してください。'
                : '8件以上の数値を入力すると、移動平均・指数平滑・予測・自己相関を表示します。'}
            </p>
            <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              サンプルデータを入力すると、すぐに分析結果を確認できます。
            </p>
          </div>
        )}

        <div
          role="note"
          className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            軽量な探索用ツールです
          </p>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            このツールは移動平均・指数平滑・線形トレンド・自己相関を確認するための探索用ツールです。ARIMAや季節分解（STL）、統計的検定、信頼区間の計算は行いません。予測は過去の数値だけを使った単純な外挿であり、将来を保証するものではありません。
          </p>
        </div>
      </section>
    </section>
  );
}
