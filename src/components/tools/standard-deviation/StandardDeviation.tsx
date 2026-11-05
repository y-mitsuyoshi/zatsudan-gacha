'use client';

import { useState } from 'react';

type StatsMode = 'population' | 'sample';

type HistogramBin = {
  min: number;
  max: number;
  count: number;
};

type Statistics = {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  populationVariance: number;
  populationStandardDeviation: number;
  sampleVariance: number;
  sampleStandardDeviation: number;
  populationCoefficientOfVariation: number | null;
  sampleCoefficientOfVariation: number | null;
};

const SAMPLE_INPUT = '12, 15, 18, 20, 22, 25, 28';

const MODE_OPTIONS: { value: StatsMode; label: string; note: string }[] = [
  { value: 'population', label: '母集団', note: 'データ全体' },
  { value: 'sample', label: '標本', note: 'データの一部' },
];

const integerFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 4,
});
const compactNumberFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 4,
});
const percentFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 2,
});

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  const absolute = Math.abs(normalized);
  if (absolute > 0 && absolute < 0.0001) {
    return compactNumberFormatter.format(normalized);
  }
  if (absolute >= 1_000_000_000) {
    return compactNumberFormatter.format(normalized);
  }
  return decimalFormatter.format(normalized);
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  return `${percentFormatter.format(normalized)}%`;
}

function parseValues(raw: string): { values: number[]; error: string | null } {
  const normalized = raw
    .normalize('NFKC')
    .replace(/[−–—]/gu, '-')
    .trim();

  if (normalized === '') {
    return { values: [], error: '数値を入力してください。' };
  }

  const tokens = normalized
    .split(/[\s,、，;；]+/u)
    .filter((token) => token !== '');

  if (tokens.length === 0) {
    return { values: [], error: '数値を入力してください。' };
  }

  const values: number[] = [];
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/u.test(token)) {
      invalidTokens.push(token);
      continue;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      invalidTokens.push(token);
      continue;
    }
    values.push(value);
  }

  if (invalidTokens.length > 0) {
    const preview = invalidTokens
      .slice(0, 3)
      .map((token) => `「${token}」`)
      .join('、');
    const suffix = invalidTokens.length > 3 ? 'など' : '';
    return {
      values: [],
      error: `${preview}${suffix}は数値として解釈できません。カンマ・スペース・改行で区切って入力してください。`,
    };
  }

  if (values.length < 2) {
    return { values: [], error: '2つ以上の数値を入力してください。' };
  }

  return { values, error: null };
}

function calculateStatistics(values: number[]): Statistics {
  const count = values.length;
  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  const mean = sum / count;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(count / 2);
  const median =
    count % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  const min = sorted[0];
  const max = sorted[count - 1];
  const squaredDeviationSum = values.reduce((accumulator, value) => {
    const difference = value - mean;
    return accumulator + difference * difference;
  }, 0);
  const populationVariance = squaredDeviationSum / count;
  const populationStandardDeviation = Math.sqrt(populationVariance);
  const sampleVariance = squaredDeviationSum / (count - 1);
  const sampleStandardDeviation = Math.sqrt(sampleVariance);
  const coefficientOfVariation = (standardDeviation: number) =>
    mean === 0 ? null : (standardDeviation / Math.abs(mean)) * 100;

  return {
    count,
    sum,
    mean,
    median,
    min,
    max,
    range: max - min,
    populationVariance,
    populationStandardDeviation,
    sampleVariance,
    sampleStandardDeviation,
    populationCoefficientOfVariation: coefficientOfVariation(
      populationStandardDeviation,
    ),
    sampleCoefficientOfVariation: coefficientOfVariation(
      sampleStandardDeviation,
    ),
  };
}

function getModeResult(stats: Statistics, mode: StatsMode) {
  if (mode === 'population') {
    return {
      variance: stats.populationVariance,
      standardDeviation: stats.populationStandardDeviation,
      coefficientOfVariation: stats.populationCoefficientOfVariation,
    };
  }
  return {
    variance: stats.sampleVariance,
    standardDeviation: stats.sampleStandardDeviation,
    coefficientOfVariation: stats.sampleCoefficientOfVariation,
  };
}

function buildHistogram(
  values: number[],
  min: number,
  max: number,
): HistogramBin[] {
  if (min === max) {
    return [{ min, max, count: values.length }];
  }

  const binCount = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(values.length))));
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

function DistributionChart({
  bins,
  min,
  max,
  mean,
}: {
  bins: HistogramBin[];
  min: number;
  max: number;
  mean: number;
}) {
  const width = 320;
  const height = 168;
  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 18;
  const paddingBottom = 30;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const maxCount = Math.max(1, ...bins.map((bin) => bin.count));
  const slotWidth = plotWidth / bins.length;
  const barWidth = Math.max(2, slotWidth * 0.62);
  const baseline = paddingTop + plotHeight;
  const meanX =
    max === min
      ? paddingLeft + plotWidth / 2
      : paddingLeft + ((mean - min) / (max - min)) * plotWidth;

  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="値の分布を示すヒストグラム"
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
            const barHeight = (bin.count / maxCount) * plotHeight;
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
                opacity={bin.count > 0 ? 0.9 : 0.2}
              >
                <title>
                  {`${formatNumber(bin.min)}〜${formatNumber(bin.max)}: ${integerFormatter.format(bin.count)}件`}
                </title>
              </rect>
            );
          })}
        </g>
        {max > min && (
          <g className="text-[var(--gold)]" stroke="currentColor">
            <line
              x1={meanX}
              y1={paddingTop}
              x2={meanX}
              y2={baseline}
              strokeDasharray="3 3"
            >
              <title>平均</title>
            </line>
          </g>
        )}
        <g className="text-[var(--ink-soft)]" fill="currentColor">
          {bins.map((bin, index) => {
            if (bin.count === 0) {
              return null;
            }
            const x = paddingLeft + index * slotWidth + slotWidth / 2;
            const barHeight = (bin.count / maxCount) * plotHeight;
            return (
              <text
                key={`count-${bin.min}-${index}`}
                x={x}
                y={baseline - barHeight - 4}
                textAnchor="middle"
                fontSize="9"
              >
                {integerFormatter.format(bin.count)}
              </text>
            );
          })}
        </g>
        <g className="text-[var(--ink-soft)]" fill="currentColor">
          <text x={paddingLeft} y={height - 9} fontSize="9" textAnchor="start">
            {formatNumber(min)}
          </text>
          <text
            x={width - paddingRight}
            y={height - 9}
            fontSize="9"
            textAnchor="end"
          >
            {formatNumber(max)}
          </text>
        </g>
      </svg>
      <figcaption className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] leading-5 text-[var(--ink-soft)]">
        <span>横軸は値、縦軸は件数</span>
        <span>点線は平均</span>
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

export function StandardDeviation() {
  const [input, setInput] = useState(SAMPLE_INPUT);
  const [mode, setMode] = useState<StatsMode>('population');

  const parsed = parseValues(input);
  const stats =
    parsed.error === null ? calculateStatistics(parsed.values) : null;
  const bins =
    stats !== null ? buildHistogram(parsed.values, stats.min, stats.max) : [];
  const selectedModeLabel = mode === 'population' ? '母集団' : '標本';
  const selectedResult = stats !== null ? getModeResult(stats, mode) : null;

  const basicItems =
    stats !== null
      ? [
          {
            label: 'データ数',
            value: `${integerFormatter.format(stats.count)}件`,
          },
          { label: '合計', value: formatNumber(stats.sum) },
          { label: '中央値', value: formatNumber(stats.median) },
          { label: '最小値', value: formatNumber(stats.min) },
          { label: '最大値', value: formatNumber(stats.max) },
          { label: '範囲', value: formatNumber(stats.range) },
        ]
      : [];

  const comparisonRows =
    stats !== null
      ? [
          {
            label: '分散',
            population: formatNumber(stats.populationVariance),
            sample: formatNumber(stats.sampleVariance),
          },
          {
            label: '標準偏差',
            population: formatNumber(stats.populationStandardDeviation),
            sample: formatNumber(stats.sampleStandardDeviation),
          },
          {
            label: '変動係数',
            population: formatPercent(stats.populationCoefficientOfVariation),
            sample: formatPercent(stats.sampleCoefficientOfVariation),
          },
        ]
      : [];

  const statusMessage =
    stats !== null && selectedResult !== null
      ? `データ数は${integerFormatter.format(stats.count)}件、平均は${formatNumber(stats.mean)}、${selectedModeLabel}の標準偏差は${formatNumber(selectedResult.standardDeviation)}、変動係数は${formatPercent(selectedResult.coefficientOfVariation)}です。`
      : '2つ以上の有効な数値を入力すると結果を表示します。';

  const resetForm = () => {
    setInput(SAMPLE_INPUT);
    setMode('population');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
      aria-label="標準偏差・分散計算"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="standard-deviation-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="standard-deviation-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              数値データを入力
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
          カンマ、スペース、改行のいずれかで区切って2つ以上の数値を入力してください。入力内容は自動で反映されます。
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="standard-deviation-input"
              className="text-sm font-bold text-[var(--ink)]"
            >
              数値データ
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              2件以上
            </span>
          </div>
          <textarea
            id="standard-deviation-input"
            name="values"
            rows={7}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例: 12, 15, 18, 20, 22, 25, 28"
            spellCheck={false}
            aria-invalid={parsed.error !== null}
            aria-describedby={
              parsed.error
                ? 'standard-deviation-input-error'
                : 'standard-deviation-input-help'
            }
            className="field-paper mt-2 min-h-40 w-full rounded-sm px-3 py-3 text-base leading-7 tabular-nums"
          />
          {parsed.error ? (
            <p
              id="standard-deviation-input-error"
              role="alert"
              className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
            >
              {parsed.error}
            </p>
          ) : (
            <p
              id="standard-deviation-input-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              入力例: 12, 15, 18, 20, 22, 25, 28
              <br />
              小数や負の数、指数表記（1e3）にも対応しています。
            </p>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[var(--ink)]">
            計算に使う分散{' '}
            <span className="text-xs font-normal">
              （表示と説明が切り替わります）
            </span>
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {MODE_OPTIONS.map((option) => {
              const isSelected = mode === option.value;
              return (
                <label
                  key={option.value}
                  className={`paper-chip flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center rounded-sm px-2 py-2.5 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="stats-mode"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setMode(option.value)}
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
            {mode === 'population'
              ? '母集団の分散はデータ数 n で割り、入力したデータ全体のばらつきを表します。'
              : '標本の分散は n − 1 で割る不偏分散を使い、データが全体の一部である場合のばらつきを推定します。'}
          </p>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
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
        aria-labelledby="standard-deviation-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="standard-deviation-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              計算結果
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

        {stats !== null && selectedResult !== null ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    平均
                  </p>
                  <p className="font-editorial mt-1 break-words text-4xl leading-none tabular-nums">
                    {formatNumber(stats.mean)}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    合計をデータ数で割った値
                  </p>
                </div>
                <p className="font-label shrink-0 text-right text-[9px] text-[var(--ink-soft)]">
                  Mean
                  <br />
                  Value
                </p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--line)] pt-3 sm:grid-cols-3">
                {basicItems.map((item) => (
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
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Selected Mode
                  </p>
                  <p className="font-editorial mt-1 text-lg">
                    {selectedModeLabel}として計算
                  </p>
                </div>
                <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-[10px] font-bold tabular-nums">
                  n = {integerFormatter.format(stats.count)}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="min-w-0 border-t border-[var(--line)] pt-2">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    分散
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatNumber(selectedResult.variance)}
                  </p>
                </div>
                <div className="min-w-0 border-t border-[var(--line)] pt-2">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    標準偏差
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatNumber(selectedResult.standardDeviation)}
                  </p>
                </div>
                <div className="min-w-0 border-t border-[var(--line)] pt-2">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    変動係数
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatPercent(selectedResult.coefficientOfVariation)}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  母集団と標本の比較
                </p>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  Comparison
                </span>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[280px] border-collapse text-left text-xs">
                  <caption className="sr-only">
                    母集団と標本それぞれの分散、標準偏差、変動係数
                  </caption>
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th
                        scope="col"
                        className="py-2 pr-2 font-normal text-[var(--ink-soft)]"
                      >
                        指標
                      </th>
                      <th
                        scope="col"
                        className={`py-2 px-2 text-right ${
                          mode === 'population'
                            ? 'font-bold text-[var(--accent)]'
                            : 'font-normal text-[var(--ink-soft)]'
                        }`}
                      >
                        母集団
                      </th>
                      <th
                        scope="col"
                        className={`py-2 px-2 text-right ${
                          mode === 'sample'
                            ? 'font-bold text-[var(--accent)]'
                            : 'font-normal text-[var(--ink-soft)]'
                        }`}
                      >
                        標本
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-[var(--line)] last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="py-2 pr-2 font-normal text-[var(--ink-soft)]"
                        >
                          {row.label}
                        </th>
                        <td
                          className={`py-2 px-2 text-right tabular-nums ${
                            mode === 'population'
                              ? 'bg-[var(--accent-soft)] font-bold text-[var(--accent)]'
                              : ''
                          }`}
                        >
                          {row.population}
                        </td>
                        <td
                          className={`py-2 px-2 text-right tabular-nums ${
                            mode === 'sample'
                              ? 'bg-[var(--accent-soft)] font-bold text-[var(--accent)]'
                              : ''
                          }`}
                        >
                          {row.sample}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  値の分布
                </p>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  Histogram
                </span>
              </div>
              <DistributionChart
                bins={bins}
                min={stats.min}
                max={stats.max}
                mean={stats.mean}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="text-sm leading-6 text-[var(--ink-soft)]">
              2つ以上の有効な数値を入力すると、基本統計量と値の分布を表示します。
            </p>
          </div>
        )}

        <div
          role="note"
          className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            計算式と母集団・標本の違い
          </p>
          <div className="mt-2 space-y-1 text-[11px] leading-6 text-[var(--ink)]">
            <p>平均 = 合計 ÷ データ数</p>
            <p>
              分散 = Σ(各値 − 平均)² ÷{' '}
              {mode === 'population' ? 'n（母集団）' : 'n − 1（標本）'}
            </p>
            <p>標準偏差 = √分散</p>
            <p>変動係数 = 標準偏差 ÷ |平均| × 100</p>
          </div>
          <p className="mt-2 text-[11px] leading-6 text-[var(--ink)]">
            {mode === 'population'
              ? '母集団の分散はデータ数 n で割り、手元のデータ全体のばらつきを表します。'
              : '標本の分散は n − 1 で割る不偏分散を使い、データが全体の一部である場合に全体のばらつきを推定します。'}
          </p>
          <p className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
            平均が0の場合は変動係数を算出しません。表示は小数第4位までの目安です。
          </p>
        </div>
      </section>
    </section>
  );
}
