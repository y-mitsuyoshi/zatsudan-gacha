'use client';

import { useState } from 'react';
import {
  mean,
  parseNumberList,
  quantile,
  standardDeviation,
  variance,
} from '@/lib/statsCore';

type Distribution = 'normal' | 'exponential' | 'poisson';

type DistributionOption = {
  value: Distribution;
  label: string;
  note: string;
};

type HistogramBin = {
  min: number;
  max: number;
  count: number;
};

type CurvePoint = {
  x: number;
  y: number;
};

type ParameterEstimate = {
  key: string;
  label: string;
  estimate: number;
  standardError: number;
  lower: number;
  upper: number;
};

type ChartData = {
  min: number;
  max: number;
  mode: 'density' | 'probability';
  bins: HistogramBin[];
  curve: CurvePoint[];
};

type Estimation = {
  n: number;
  k: number;
  logLikelihood: number;
  aic: number;
  bic: number;
  parameters: ParameterEstimate[];
  sampleMean: number;
  sampleMedian: number;
  minimum: number;
  maximum: number;
  chart: ChartData;
};

const DISTRIBUTION_OPTIONS: DistributionOption[] = [
  { value: 'normal', label: '正規分布', note: '連続・左右対称' },
  { value: 'exponential', label: '指数分布', note: '連続・正の値' },
  { value: 'poisson', label: 'ポアソン分布', note: '離散・回数' },
];

const DISTRIBUTION_LABELS: Record<Distribution, string> = {
  normal: '正規分布',
  exponential: '指数分布',
  poisson: 'ポアソン分布',
};

const SAMPLE_DATA: Record<Distribution, string> = {
  normal:
    '12.4, 11.8, 13.1, 12.9, 12.2, 13.4, 11.5, 12.7, 12.0, 13.0, 12.6, 11.9',
  exponential:
    '0.5, 1.2, 0.8, 2.1, 0.4, 1.7, 0.9, 1.1, 0.6, 1.4, 0.7, 1.0',
  poisson: '2, 4, 3, 5, 2, 6, 3, 1, 4, 3, 2, 4',
};

const Z_95 = 1.96;

const integerFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 4,
});
const compactFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 4,
});

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  const absolute = Math.abs(normalized);
  if (absolute > 0 && absolute < 0.0001) {
    return compactFormatter.format(normalized);
  }
  if (absolute >= 1_000_000) {
    return compactFormatter.format(normalized);
  }
  return decimalFormatter.format(normalized);
}

function buildHistogram(
  values: number[],
  min: number,
  max: number,
): HistogramBin[] {
  if (!(max > min)) {
    return [{ min, max, count: values.length }];
  }
  const binCount = Math.min(
    10,
    Math.max(4, Math.ceil(Math.sqrt(values.length))),
  );
  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    min: min + width * index,
    max: index === binCount - 1 ? max : min + width * (index + 1),
    count: 0,
  }));

  for (const value of values) {
    let index = Math.floor((value - min) / width);
    if (index < 0) {
      index = 0;
    }
    if (index >= binCount) {
      index = binCount - 1;
    }
    bins[index].count += 1;
  }

  return bins;
}

function logGamma(value: number): number {
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = value;
  let y = value;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let series = 1.000000000190015;
  for (const coefficient of coefficients) {
    y += 1;
    series += coefficient / y;
  }
  return -tmp + Math.log((2.5066282746310005 * series) / x);
}

function normalCurve(
  mu: number,
  sigma: number,
  min: number,
  max: number,
): CurvePoint[] {
  if (!(sigma > 0) || !(max > min)) {
    return [];
  }
  const pointCount = 60;
  return Array.from({ length: pointCount + 1 }, (_, index) => {
    const x = min + ((max - min) * index) / pointCount;
    const y =
      Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2)) /
      (sigma * Math.sqrt(2 * Math.PI));
    return { x, y };
  });
}

function exponentialCurve(
  lambda: number,
  min: number,
  max: number,
): CurvePoint[] {
  if (!(lambda > 0) || !(max > min)) {
    return [];
  }
  const pointCount = 60;
  return Array.from({ length: pointCount + 1 }, (_, index) => {
    const x = min + ((max - min) * index) / pointCount;
    return { x, y: lambda * Math.exp(-lambda * x) };
  });
}

function poissonPmf(lambda: number, value: number): number {
  if (lambda === 0) {
    return value === 0 ? 1 : 0;
  }
  return Math.exp(-lambda + value * Math.log(lambda) - logGamma(value + 1));
}

function poissonCurve(lambda: number, bins: HistogramBin[]): CurvePoint[] {
  return bins.map((bin) => {
    let probability = 0;
    const start = Math.max(0, Math.ceil(bin.min));
    const end = Math.floor(bin.max);
    for (let value = start; value <= end; value += 1) {
      probability += poissonPmf(lambda, value);
    }
    return { x: (bin.min + bin.max) / 2, y: probability };
  });
}

function informationCriteria(logLikelihood: number, k: number, n: number) {
  if (!Number.isFinite(logLikelihood)) {
    return { aic: Number.POSITIVE_INFINITY, bic: Number.POSITIVE_INFINITY };
  }
  return {
    aic: 2 * k - 2 * logLikelihood,
    bic: k * Math.log(n) - 2 * logLikelihood,
  };
}

function estimate(
  values: number[],
  distribution: Distribution,
): Estimation | null {
  const n = values.length;
  if (n === 0) {
    return null;
  }
  const sampleMean = mean(values);
  const sampleMedian = quantile(values, 0.5);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);

  if (distribution === 'normal') {
    const mu = sampleMean;
    const sigmaSquared = variance(values, false);
    const sigma = standardDeviation(values, false);
    const logLikelihood =
      sigmaSquared > 0
        ? -0.5 * n * (Math.log(2 * Math.PI) + Math.log(sigmaSquared) + 1)
        : Number.NEGATIVE_INFINITY;
    const k = 2;
    const { aic, bic } = informationCriteria(logLikelihood, k, n);
    const muStandardError = sigma / Math.sqrt(n);
    const sigmaStandardError = sigma / Math.sqrt(2 * n);
    const chartMin = maximum > minimum ? minimum : minimum - 0.5;
    const chartMax = maximum > minimum ? maximum : maximum + 0.5;

    return {
      n,
      k,
      logLikelihood,
      aic,
      bic,
      sampleMean,
      sampleMedian,
      minimum,
      maximum,
      parameters: [
        {
          key: 'mu',
          label: '平均 μ',
          estimate: mu,
          standardError: muStandardError,
          lower: mu - Z_95 * muStandardError,
          upper: mu + Z_95 * muStandardError,
        },
        {
          key: 'sigma',
          label: '標準偏差 σ',
          estimate: sigma,
          standardError: sigmaStandardError,
          lower: Math.max(0, sigma - Z_95 * sigmaStandardError),
          upper: sigma + Z_95 * sigmaStandardError,
        },
      ],
      chart: {
        min: chartMin,
        max: chartMax,
        mode: 'density',
        bins: buildHistogram(values, chartMin, chartMax),
        curve: normalCurve(mu, sigma, chartMin, chartMax),
      },
    };
  }

  if (distribution === 'exponential') {
    const lambda = 1 / sampleMean;
    const logLikelihood =
      lambda > 0 && Number.isFinite(lambda)
        ? n * Math.log(lambda) - lambda * n * sampleMean
        : Number.NEGATIVE_INFINITY;
    const k = 1;
    const { aic, bic } = informationCriteria(logLikelihood, k, n);
    const standardError = lambda / Math.sqrt(n);
    const chartMin = 0;
    const chartMax = maximum;

    return {
      n,
      k,
      logLikelihood,
      aic,
      bic,
      sampleMean,
      sampleMedian,
      minimum,
      maximum,
      parameters: [
        {
          key: 'lambda',
          label: 'rate λ',
          estimate: lambda,
          standardError,
          lower: Math.max(0, lambda - Z_95 * standardError),
          upper: lambda + Z_95 * standardError,
        },
      ],
      chart: {
        min: chartMin,
        max: chartMax,
        mode: 'density',
        bins: buildHistogram(values, chartMin, chartMax),
        curve: exponentialCurve(lambda, chartMin, chartMax),
      },
    };
  }

  const lambda = sampleMean;
  let logLikelihood = 0;
  if (lambda > 0) {
    let logFactorialSum = 0;
    for (const value of values) {
      logFactorialSum += logGamma(value + 1);
    }
    logLikelihood =
      Math.log(lambda) * n * sampleMean - n * lambda - logFactorialSum;
  }
  const k = 1;
  const { aic, bic } = informationCriteria(logLikelihood, k, n);
  const standardError = Math.sqrt(lambda / n);
  const chartMin = maximum > 0 ? 0 : -0.5;
  const chartMax = maximum > 0 ? maximum : 0.5;
  const bins = buildHistogram(values, chartMin, chartMax);

  return {
    n,
    k,
    logLikelihood,
    aic,
    bic,
    sampleMean,
    sampleMedian,
    minimum,
    maximum,
    parameters: [
      {
        key: 'lambda',
        label: 'rate λ',
        estimate: lambda,
        standardError,
        lower: Math.max(0, lambda - Z_95 * standardError),
        upper: lambda + Z_95 * standardError,
      },
    ],
    chart: {
      min: chartMin,
      max: chartMax,
      mode: 'probability',
      bins,
      curve: poissonCurve(lambda, bins),
    },
  };
}

function DistributionChart({ chart }: { chart: ChartData }) {
  const bins = chart.bins;
  const total = bins.reduce((accumulator, bin) => accumulator + bin.count, 0);

  if (bins.length === 0 || total === 0) {
    return (
      <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
        ヒストグラムを描画できるデータがありません。
      </p>
    );
  }

  const width = 320;
  const height = 180;
  const paddingLeft = 10;
  const paddingRight = 10;
  const paddingTop = 18;
  const paddingBottom = 30;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const baseline = paddingTop + plotHeight;
  const range = chart.max - chart.min;
  const safeRange = range > 0 ? range : 1;
  const binWidth = range > 0 ? range / bins.length : 1;
  const barValues = bins.map((bin) =>
    chart.mode === 'density'
      ? bin.count / (total * binWidth)
      : bin.count / total,
  );
  const maxValue = Math.max(
    0.000001,
    ...barValues,
    ...chart.curve.map((point) => point.y),
  );
  const slotWidth = plotWidth / bins.length;
  const barWidth = Math.max(2, slotWidth * 0.62);
  const toX = (value: number) =>
    paddingLeft + ((value - chart.min) / safeRange) * plotWidth;
  const toY = (value: number) =>
    baseline - (Math.max(0, value) / maxValue) * plotHeight;
  const curvePoints = chart.curve
    .map((point) => `${toX(point.x)},${toY(point.y)}`)
    .join(' ');

  return (
    <figure className="mt-3 min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="観測値のヒストグラムと推定した分布の重ね描き"
      >
        <g className="text-[var(--line-strong)]" stroke="currentColor">
          <line
            x1={paddingLeft}
            y1={baseline}
            x2={width - paddingRight}
            y2={baseline}
          />
        </g>
        <g className="text-[var(--accent)]" fill="currentColor">
          {bins.map((bin, index) => {
            const barHeight = (barValues[index] / maxValue) * plotHeight;
            const x =
              paddingLeft + index * slotWidth + (slotWidth - barWidth) / 2;
            const y = baseline - barHeight;
            return (
              <rect
                key={`${bin.min}-${index}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, bin.count > 0 ? 2 : 0)}
                rx={1}
                opacity={bin.count > 0 ? 0.38 : 0.08}
              >
                <title>
                  {`${formatNumber(bin.min)}〜${formatNumber(bin.max)}: ${integerFormatter.format(bin.count)}件`}
                </title>
              </rect>
            );
          })}
        </g>
        {chart.curve.length > 1 && (
          <g
            className="text-[var(--gold)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <polyline points={curvePoints} />
          </g>
        )}
        {chart.mode === 'probability' && (
          <g className="text-[var(--gold)]" fill="currentColor">
            {chart.curve.map((point, index) => (
              <circle
                key={`point-${index}`}
                cx={toX(point.x)}
                cy={toY(point.y)}
                r={2.2}
              />
            ))}
          </g>
        )}
        <g className="text-[var(--ink-soft)]" fill="currentColor">
          <text
            x={paddingLeft}
            y={height - 9}
            fontSize="9"
            textAnchor="start"
          >
            {formatNumber(chart.min)}
          </text>
          <text
            x={width - paddingRight}
            y={height - 9}
            fontSize="9"
            textAnchor="end"
          >
            {formatNumber(chart.max)}
          </text>
        </g>
      </svg>
      <figcaption className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] leading-5 text-[var(--ink-soft)]">
        <span>
          {chart.mode === 'density'
            ? '縦軸は密度、曲線は推定した確率密度'
            : '縦軸は相対度数、線は推定した確率'}
        </span>
        <span>n = {integerFormatter.format(total)}</span>
      </figcaption>
      <ul className="sr-only">
        {bins.map((bin, index) => (
          <li key={`summary-${bin.min}-${index}`}>
            {`${formatNumber(bin.min)}から${formatNumber(bin.max)}まで: ${integerFormatter.format(bin.count)}件`}
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function MaximumLikelihood() {
  const [distribution, setDistribution] = useState<Distribution>('normal');
  const [input, setInput] = useState(SAMPLE_DATA.normal);

  const parsed = parseNumberList(input);
  let error: string | null = null;

  if (parsed.invalid.length > 0) {
    const preview = parsed.invalid
      .slice(0, 3)
      .map((token) => `「${token}」`)
      .join('、');
    const suffix = parsed.invalid.length > 3 ? 'など' : '';
    error = `${preview}${suffix}は数値として解釈できません。カンマ・スペース・改行で区切って入力してください。`;
  } else if (parsed.values.length === 0) {
    error = '観測値を1つ以上入力してください。';
  } else if (distribution === 'normal' && parsed.values.length < 2) {
    error = '正規分布の最尤推定には2つ以上の数値が必要です。';
  } else if (
    distribution === 'exponential' &&
    parsed.values.some((value) => value <= 0)
  ) {
    error = '指数分布では0より大きい正の値を入力してください。';
  } else if (
    distribution === 'poisson' &&
    parsed.values.some((value) => value < 0 || !Number.isInteger(value))
  ) {
    error = 'ポアソン分布では0以上の整数を入力してください。';
  }

  const estimation =
    error === null ? estimate(parsed.values, distribution) : null;
  const distributionLabel = DISTRIBUTION_LABELS[distribution];
  const inputHint =
    distribution === 'normal'
      ? '正規分布は2件以上、指数分布は正の値、ポアソン分布は0以上の整数を入力します。'
      : distribution === 'exponential'
        ? '指数分布は0より大きい正の値を入力します。'
        : 'ポアソン分布は0以上の整数を入力します。';

  const statusMessage = estimation
    ? `${distributionLabel}の最尤推定結果です。${estimation.parameters
        .map(
          (parameter) =>
            `${parameter.label}は${formatNumber(parameter.estimate)}`,
        )
        .join('、')}。対数尤度は${formatNumber(estimation.logLikelihood)}、AICは${formatNumber(estimation.aic)}、BICは${formatNumber(estimation.bic)}です。`
    : `入力を確認してください。${error ?? '有効な数値を入力すると結果を表示します。'}`;

  const selectDistribution = (next: Distribution) => {
    setDistribution(next);
    setInput(SAMPLE_DATA[next]);
  };

  const loadSample = () => {
    setInput(SAMPLE_DATA[distribution]);
  };

  const resetForm = () => {
    setDistribution('normal');
    setInput(SAMPLE_DATA.normal);
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
      aria-label="最尤推定"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="maximum-likelihood-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="maximum-likelihood-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              観測値と分布を入力
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            01 / 02
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          カンマ、スペース、改行のいずれかで区切って観測値を入力し、仮定する分布を選んでください。入力内容は自動で反映されます。
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="maximum-likelihood-input"
              className="text-sm font-bold text-[var(--ink)]"
            >
              観測値
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {distribution === 'normal' ? '2件以上' : '1件以上'}
            </span>
          </div>
          <textarea
            id="maximum-likelihood-input"
            name="observations"
            rows={7}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`例: ${SAMPLE_DATA[distribution]}`}
            spellCheck={false}
            aria-invalid={error !== null}
            aria-describedby={
              error
                ? 'maximum-likelihood-input-error'
                : 'maximum-likelihood-input-help'
            }
            className="field-paper mt-2 min-h-36 w-full rounded-sm px-3 py-3 text-base leading-7 tabular-nums"
          />
          {error ? (
            <p
              id="maximum-likelihood-input-error"
              role="alert"
              className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
            >
              {error}
            </p>
          ) : (
            <p
              id="maximum-likelihood-input-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              {inputHint}
            </p>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[var(--ink)]">
            仮定する分布
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {DISTRIBUTION_OPTIONS.map((option) => {
              const isSelected = distribution === option.value;
              return (
                <label
                  key={option.value}
                  className={`paper-chip flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center rounded-sm px-2 py-2.5 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="distribution"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => selectDistribution(option.value)}
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
            分布を切り替えると、その分布用のサンプルデータが入力されます。
          </p>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={loadSample}
            className="paper-button rounded-sm px-4 py-2 text-xs"
          >
            サンプルを入力
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="paper-button rounded-sm px-4 py-2 text-xs"
          >
            リセット
          </button>
          <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
            入力内容は保存・送信されません。
          </p>
        </div>
      </form>

      <section
        aria-labelledby="maximum-likelihood-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="maximum-likelihood-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              推定結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            02 / 02
          </span>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>

        {estimation !== null ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Estimated Parameters
                  </p>
                  <p className="font-editorial mt-1 text-lg">
                    {distributionLabel}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    閉形式の最尤推定量
                  </p>
                </div>
                <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-[10px] font-bold tabular-nums">
                  n = {integerFormatter.format(estimation.n)}
                </span>
              </div>
              <ul className="mt-3 space-y-3">
                {estimation.parameters.map((parameter, index) => (
                  <li
                    key={parameter.key}
                    className={`min-w-0 ${
                      index === 0
                        ? ''
                        : 'border-t border-[var(--line)] pt-3'
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-[var(--ink-soft)]">
                        {parameter.label}
                      </span>
                      <span className="font-editorial break-words text-2xl leading-tight tabular-nums">
                        {formatNumber(parameter.estimate)}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-1 gap-2 text-[11px] leading-5 sm:grid-cols-2">
                      <div className="min-w-0">
                        <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                          標準誤差
                        </dt>
                        <dd className="break-words tabular-nums">
                          {formatNumber(parameter.standardError)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                          95%信頼区間
                        </dt>
                        <dd className="break-words tabular-nums">
                          {formatNumber(parameter.lower)} 〜{' '}
                          {formatNumber(parameter.upper)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  Goodness of Fit
                </p>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  Log-Likelihood / AIC / BIC
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                {[
                  {
                    label: '対数尤度',
                    value: formatNumber(estimation.logLikelihood),
                  },
                  { label: 'AIC', value: formatNumber(estimation.aic) },
                  { label: 'BIC', value: formatNumber(estimation.bic) },
                  {
                    label: 'データ数 n',
                    value: integerFormatter.format(estimation.n),
                  },
                  {
                    label: 'パラメータ数 k',
                    value: integerFormatter.format(estimation.k),
                  },
                  {
                    label: '中央値',
                    value: formatNumber(estimation.sampleMedian),
                  },
                ].map((item) => (
                  <div key={item.label} className="min-w-0">
                    <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                平均 {formatNumber(estimation.sampleMean)}、範囲{' '}
                {formatNumber(estimation.minimum)} 〜{' '}
                {formatNumber(estimation.maximum)}
              </p>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  Histogram and Fit
                </p>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  {estimation.chart.mode === 'density'
                    ? 'Density'
                    : 'Probability'}
                </span>
              </div>
              <DistributionChart chart={estimation.chart} />
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="text-sm leading-6 text-[var(--ink-soft)]">
              有効な観測値を入力すると、最尤推定の結果とヒストグラムを表示します。
            </p>
          </div>
        )}

        <div
          role="note"
          className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            推定方法と注意事項
          </p>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            このツールは正規分布・指数分布・ポアソン分布の閉形式の最尤推定量を用いています。標準誤差と95%信頼区間は大標本の正規近似による目安で、標本が小さい場合や分布の仮定が崩れる場合は精度が下がります。
          </p>
          <p className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
            信頼区間の下限は0で打ち切る場合があります。表示は小数第4位までの目安です。
          </p>
        </div>
      </section>
    </section>
  );
}
