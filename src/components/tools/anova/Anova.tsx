'use client';

import { useState } from 'react';
import {
  fCdf,
  mean,
  parseDelimitedTable,
  pFromF,
  variance,
} from '@/lib/statsCore';

const SAMPLE_CSV = `group,value
A,12.1
A,13.4
A,11.8
A,12.9
A,13.1
B,15.2
B,16.8
B,14.9
B,15.7
B,16.1
C,10.4
C,11.2
C,9.8
C,10.9
C,11.5`;

const integerFormatter = new Intl.NumberFormat('ja-JP');
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 4,
});
const significantFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 6,
});
const pValueFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const effectFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 4,
});
const axisFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 4,
});

const CHART_WIDTH = 340;
const CHART_HEIGHT = 210;
const CHART_PADDING = { top: 18, right: 12, bottom: 56, left: 48 };
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

type GroupSummary = {
  name: string;
  values: number[];
  count: number;
  mean: number;
  standardDeviation: number;
};

type PairwiseComparison = {
  first: string;
  second: string;
  meanDifference: number;
  tValue: number | null;
  degreesOfFreedom: number | null;
  pValue: number;
  adjustedPValue: number;
  significant: boolean;
};

type AnovaResult = {
  groups: GroupSummary[];
  groupCount: number;
  observationCount: number;
  grandMean: number;
  betweenSumOfSquares: number;
  withinSumOfSquares: number;
  totalSumOfSquares: number;
  dfBetween: number;
  dfWithin: number;
  dfTotal: number;
  meanSquareBetween: number;
  meanSquareWithin: number;
  fValue: number;
  pValue: number;
  etaSquared: number;
  omegaSquared: number;
  pairwise: PairwiseComparison[];
  pairCount: number;
  bonferroniAlpha: number;
};

type AnalysisAttempt = {
  result: AnovaResult | null;
  errors: string[];
  rowCount: number;
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  const absolute = Math.abs(normalized);
  if (absolute > 0 && absolute < 0.0001) {
    return significantFormatter.format(normalized);
  }
  return decimalFormatter.format(normalized);
}

function formatPValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = Math.min(1, Math.max(0, value));
  if (normalized < 0.0001) {
    return '< 0.0001';
  }
  if (normalized > 0.9999) {
    return '> 0.9999';
  }
  return pValueFormatter.format(normalized);
}

function formatEffect(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = Math.abs(value) < 1e-12 ? 0 : value;
  if (normalized > 0 && normalized < 0.0001) {
    return '< 0.0001';
  }
  return effectFormatter.format(normalized);
}

function shortenLabel(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, maxLength)}...`
    : value;
}

function limitErrors(errors: string[]): string[] {
  if (errors.length <= 6) {
    return errors;
  }
  return [
    ...errors.slice(0, 5),
    `ほか${integerFormatter.format(errors.length - 5)}件のエラーがあります。`,
  ];
}

function analyzeCsv(raw: string): AnalysisAttempt {
  const table = parseDelimitedTable(raw.replace(/^\uFEFF/, ''));
  const headers = table.headers.map((header) => header.trim());
  const rowCount = table.rows.length;
  const errors: string[] = [...table.errors];

  if (headers.length === 0) {
    return { result: null, errors: limitErrors(errors), rowCount };
  }

  if (headers.length !== 2) {
    errors.push('ヘッダーは group,value の2列にしてください。');
  }
  if ((headers[0] ?? '').toLowerCase() !== 'group') {
    errors.push('1列目のヘッダーは group にしてください。');
  }
  if ((headers[1] ?? '').toLowerCase() !== 'value') {
    errors.push('2列目のヘッダーは value にしてください。');
  }
  if (rowCount === 0) {
    errors.push('データ行を1行以上入力してください。');
  }

  if (errors.length > 0) {
    return { result: null, errors: limitErrors(errors), rowCount };
  }

  const valueMap = new Map<string, number[]>();
  const rowErrors: string[] = [];
  let invalidRowCount = 0;

  table.rows.forEach((row, rowIndex) => {
    const group = (row[0] ?? '').trim();
    const rawValue = (row[1] ?? '').trim();

    if (group === '') {
      invalidRowCount += 1;
      if (rowErrors.length < 5) {
        rowErrors.push(`${rowIndex + 2}行目のgroupが空です。`);
      }
      return;
    }

    const value = Number(rawValue);
    if (rawValue === '' || !Number.isFinite(value)) {
      invalidRowCount += 1;
      if (rowErrors.length < 5) {
        rowErrors.push(
          `${rowIndex + 2}行目のvalueは数値で入力してください。`,
        );
      }
      return;
    }

    const values = valueMap.get(group) ?? [];
    values.push(value);
    valueMap.set(group, values);
  });

  if (invalidRowCount > 0) {
    if (invalidRowCount > rowErrors.length) {
      rowErrors.push(
        `ほか${integerFormatter.format(
          invalidRowCount - rowErrors.length,
        )}件の行に問題があります。`,
      );
    }
    return { result: null, errors: rowErrors, rowCount };
  }

  const groupEntries = Array.from(valueMap.entries());
  if (groupEntries.length < 2) {
    errors.push('グループは2つ以上必要です。');
  }

  const smallGroups = groupEntries
    .filter(([, values]) => values.length < 2)
    .map(([group]) => group);
  if (smallGroups.length > 0) {
    const names = smallGroups.slice(0, 5).join('、');
    const suffix = smallGroups.length > 5 ? ' など' : '';
    errors.push(
      `各グループ2件以上必要です。件数が足りないグループ: ${names}${suffix}`,
    );
  }

  if (errors.length > 0) {
    return { result: null, errors: limitErrors(errors), rowCount };
  }

  const groups: GroupSummary[] = groupEntries.map(([name, values]) => ({
    name,
    values,
    count: values.length,
    mean: mean(values),
    standardDeviation: Math.sqrt(variance(values)),
  }));
  const observationCount = groups.reduce(
    (total, group) => total + group.count,
    0,
  );
  const grandMean = mean(groups.flatMap((group) => group.values));

  let betweenSumOfSquares = 0;
  let withinSumOfSquares = 0;
  groups.forEach((group) => {
    betweenSumOfSquares +=
      group.count * (group.mean - grandMean) ** 2;
    withinSumOfSquares +=
      variance(group.values) * (group.count - 1);
  });

  const totalSumOfSquares = betweenSumOfSquares + withinSumOfSquares;
  const dfBetween = groups.length - 1;
  const dfWithin = observationCount - groups.length;
  const dfTotal = observationCount - 1;

  if (!(withinSumOfSquares > 0) || dfWithin <= 0) {
    errors.push(
      '群内のばらつきが0のため、F値とp値を算出できません。各群の値にばらつきを持たせてください。',
    );
    return { result: null, errors: limitErrors(errors), rowCount };
  }

  const meanSquareBetween = betweenSumOfSquares / dfBetween;
  const meanSquareWithin = withinSumOfSquares / dfWithin;
  const fValue = meanSquareBetween / meanSquareWithin;
  const pValue = Math.min(
    1,
    Math.max(0, pFromF(fValue, dfBetween, dfWithin)),
  );
  const etaSquared =
    totalSumOfSquares > 0
      ? betweenSumOfSquares / totalSumOfSquares
      : 0;
  const omegaSquared = Math.min(
    1,
    Math.max(
      0,
      (betweenSumOfSquares - dfBetween * meanSquareWithin) /
        (totalSumOfSquares + meanSquareWithin),
    ),
  );

  const pairCount = (groups.length * (groups.length - 1)) / 2;
  const bonferroniAlpha = 0.05 / pairCount;
  const pairwise: PairwiseComparison[] = [];

  for (let firstIndex = 0; firstIndex < groups.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < groups.length;
      secondIndex += 1
    ) {
      const first = groups[firstIndex];
      const second = groups[secondIndex];
      const meanDifference = first.mean - second.mean;
      const firstTerm = variance(first.values) / first.count;
      const secondTerm = variance(second.values) / second.count;
      const standardError = Math.sqrt(firstTerm + secondTerm);
      let tValue: number | null = null;
      let degreesOfFreedom: number | null = null;
      let pairPValue: number;

      if (standardError > 0) {
        tValue = meanDifference / standardError;
        const denominator =
          firstTerm ** 2 / (first.count - 1) +
          secondTerm ** 2 / (second.count - 1);
        degreesOfFreedom =
          denominator > 0
            ? (firstTerm + secondTerm) ** 2 / denominator
            : null;
        pairPValue =
          degreesOfFreedom !== null &&
          Number.isFinite(degreesOfFreedom)
            ? Math.min(
                1,
                Math.max(0, 1 - fCdf(tValue * tValue, 1, degreesOfFreedom)),
              )
            : Number.NaN;
      } else {
        tValue = meanDifference === 0 ? 0 : null;
        pairPValue = meanDifference === 0 ? 1 : 0;
      }

      const adjustedPValue = Number.isFinite(pairPValue)
        ? Math.min(1, pairPValue * pairCount)
        : Number.NaN;

      pairwise.push({
        first: first.name,
        second: second.name,
        meanDifference,
        tValue,
        degreesOfFreedom,
        pValue: pairPValue,
        adjustedPValue,
        significant:
          Number.isFinite(adjustedPValue) && adjustedPValue < 0.05,
      });
    }
  }

  return {
    result: {
      groups,
      groupCount: groups.length,
      observationCount,
      grandMean,
      betweenSumOfSquares,
      withinSumOfSquares,
      totalSumOfSquares,
      dfBetween,
      dfWithin,
      dfTotal,
      meanSquareBetween,
      meanSquareWithin,
      fValue,
      pValue,
      etaSquared,
      omegaSquared,
      pairwise,
      pairCount,
      bonferroniAlpha,
    },
    errors: [],
    rowCount,
  };
}

function MeansChart({
  groups,
  grandMean,
}: {
  groups: GroupSummary[];
  grandMean: number;
}) {
  const lowerValues = groups.map(
    (group) => group.mean - group.standardDeviation,
  );
  const upperValues = groups.map(
    (group) => group.mean + group.standardDeviation,
  );
  const minimum = Math.min(...lowerValues, grandMean);
  const maximum = Math.max(...upperValues, grandMean);
  const padding =
    minimum === maximum
      ? Math.abs(minimum) > 0
        ? Math.abs(minimum) * 0.1
        : 1
      : (maximum - minimum) * 0.12;
  const yMin = minimum - padding;
  const yMax = maximum + padding;
  const yRange = yMax - yMin;
  const baseline = CHART_PADDING.top + PLOT_HEIGHT;
  const slotWidth = PLOT_WIDTH / groups.length;
  const yScale = (value: number) =>
    CHART_PADDING.top +
    PLOT_HEIGHT -
    ((value - yMin) / yRange) * PLOT_HEIGHT;
  const ticks = Array.from(
    { length: 4 },
    (_, index) => yMin + (yRange * index) / 3,
  );
  const capWidth = Math.min(16, Math.max(6, slotWidth * 0.2));
  const chartSummary = `群ごとの平均値と標準偏差を示すエラーバー付きグラフです。${groups
    .map(
      (group) =>
        `${group.name}の平均は${formatNumber(
          group.mean,
        )}、標準偏差は${formatNumber(group.standardDeviation)}`,
    )
    .join('。')}。`;

  return (
    <figure className="mt-4 min-w-0">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby="anova-chart-title"
        aria-describedby="anova-chart-desc"
      >
        <title id="anova-chart-title">
          群ごとの平均値と標準偏差のエラーバー
        </title>
        <desc id="anova-chart-desc">{chartSummary}</desc>
        <g>
          {ticks.map((tick, index) => {
            const y = yScale(tick);
            return (
              <g key={`tick-${index}`}>
                <line
                  x1={CHART_PADDING.left}
                  y1={y}
                  x2={CHART_PADDING.left + PLOT_WIDTH}
                  y2={y}
                  stroke="var(--line)"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                <text
                  x={CHART_PADDING.left - 6}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="var(--ink-soft)"
                  fontSize="9"
                >
                  {axisFormatter.format(tick)}
                </text>
              </g>
            );
          })}
        </g>
        <line
          x1={CHART_PADDING.left}
          y1={baseline}
          x2={CHART_PADDING.left + PLOT_WIDTH}
          y2={baseline}
          stroke="var(--line-strong)"
          strokeWidth={1}
        />
        <line
          x1={CHART_PADDING.left}
          y1={yScale(grandMean)}
          x2={CHART_PADDING.left + PLOT_WIDTH}
          y2={yScale(grandMean)}
          stroke="var(--gold)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <g>
          {groups.map((group, index) => {
            const center =
              CHART_PADDING.left + slotWidth * index + slotWidth / 2;
            const meanY = yScale(group.mean);
            const upperY = yScale(
              group.mean + group.standardDeviation,
            );
            const lowerY = yScale(
              group.mean - group.standardDeviation,
            );

            return (
              <g key={`${group.name}-${index}`}>
                <title>{`${group.name}: 平均 ${formatNumber(
                  group.mean,
                )}、標準偏差 ${formatNumber(
                  group.standardDeviation,
                )}`}</title>
                <line
                  x1={center}
                  y1={upperY}
                  x2={center}
                  y2={lowerY}
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                />
                <line
                  x1={center - capWidth / 2}
                  y1={upperY}
                  x2={center + capWidth / 2}
                  y2={upperY}
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                />
                <line
                  x1={center - capWidth / 2}
                  y1={lowerY}
                  x2={center + capWidth / 2}
                  y2={lowerY}
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                />
                <circle
                  cx={center}
                  cy={meanY}
                  r={3.5}
                  fill="var(--accent)"
                  stroke="var(--paper)"
                  strokeWidth={1.5}
                />
                <text
                  x={center}
                  y={baseline + 12}
                  textAnchor="end"
                  fill="var(--ink-soft)"
                  fontSize="9"
                  transform={`rotate(-35 ${center} ${baseline + 12})`}
                >
                  {shortenLabel(group.name, 8)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <figcaption className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
        点は群の平均値、ひげは平均±標準偏差（標本標準偏差）、破線は全体平均です。
      </figcaption>
    </figure>
  );
}

export function Anova() {
  const [input, setInput] = useState(SAMPLE_CSV);

  const attempt = analyzeCsv(input);
  const result = attempt.result;
  const errors = attempt.errors;

  const statusMessage =
    result !== null
      ? `群数${integerFormatter.format(
          result.groupCount,
        )}、観測数${integerFormatter.format(
          result.observationCount,
        )}、F値は${formatNumber(result.fValue)}、p値は${formatPValue(
          result.pValue,
        )}、η²は${formatEffect(result.etaSquared)}です。`
      : errors.length > 0
        ? `入力内容を確認してください。${errors[0]}`
        : '有効なCSVを入力すると分散分析の結果を表示します。';

  const loadSample = () => {
    setInput(SAMPLE_CSV);
  };

  const resetForm = () => {
    setInput('');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.96fr)]"
      aria-label="分散分析（ANOVA）"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="anova-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2 id="anova-form-heading" className="font-editorial mt-1 text-xl">
              CSVデータを入力
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
          1行目をgroup,valueのヘッダーにし、群名と数値を1行1観測で貼り付けてください。カンマ区切りとタブ区切りに対応しています。入力内容は自動で反映されます。
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="anova-input"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              2列
            </span>
          </div>
          <textarea
            id="anova-input"
            name="table"
            rows={12}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={'group,value\nA,12.1\nA,13.4\nB,15.2'}
            spellCheck={false}
            aria-invalid={errors.length > 0}
            aria-describedby={
              errors.length > 0
                ? 'anova-input-help anova-input-error'
                : 'anova-input-help'
            }
            className="field-paper mt-2 min-h-64 w-full min-w-0 resize-y rounded-sm px-3 py-3 text-base leading-7 tabular-nums"
          />
          <p
            id="anova-input-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            必須のヘッダーは group と value です。群は2つ以上、各群2件以上必要です。欠測値は扱いません。
          </p>
        </div>

        {errors.length > 0 && (
          <div
            id="anova-input-error"
            role="alert"
            className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              入力内容を確認してください
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-5 text-[var(--ink)]">
              {errors.map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}

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
        aria-labelledby="anova-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="anova-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              分散分析の結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
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

        {result !== null ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    F Statistic
                  </p>
                  <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums">
                    F = {formatNumber(result.fValue)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    F({result.dfBetween}, {result.dfWithin})
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="inline-block border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-xs font-bold tabular-nums">
                      p値: {formatPValue(result.pValue)}
                    </p>
                    <p
                      className={`inline-block border bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] font-bold ${
                        result.pValue < 0.05
                          ? 'border-[var(--accent)] text-[var(--accent)]'
                          : 'border-[var(--line-strong)] text-[var(--ink-soft)]'
                      }`}
                    >
                      {result.pValue < 0.05
                        ? '5%水準で有意'
                        : '5%水準で有意ではない'}
                    </p>
                  </div>
                </div>
                <p className="font-label shrink-0 text-right text-[9px] leading-4 text-[var(--ink-soft)]">
                  One-way
                  <br />
                  ANOVA
                </p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--line)] pt-3 sm:grid-cols-4">
                <div className="min-w-0">
                  <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                    η²
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {formatEffect(result.etaSquared)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                    ω²
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {formatEffect(result.omegaSquared)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                    群数
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {integerFormatter.format(result.groupCount)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                    観測数
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {integerFormatter.format(result.observationCount)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    ANOVA Table
                  </p>
                  <h3 className="font-editorial mt-1 text-lg">分散分析表</h3>
                </div>
                <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-[10px] font-bold tabular-nums">
                  {integerFormatter.format(result.groupCount)}群 / n=
                  {integerFormatter.format(result.observationCount)}
                </span>
              </div>
              <div className="mt-3">
                <table className="w-full table-fixed border-collapse text-left text-[10px] sm:text-xs">
                  <caption className="sr-only">
                    一元配置分散分析の分散分析表
                  </caption>
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th
                        scope="col"
                        className="w-[24%] py-2 pr-1 font-normal text-[var(--ink-soft)]"
                      >
                        変動因
                      </th>
                      <th
                        scope="col"
                        className="w-[20%] px-1 py-2 text-right font-normal text-[var(--ink-soft)]"
                      >
                        平方和
                      </th>
                      <th
                        scope="col"
                        className="w-[11%] px-1 py-2 text-right font-normal text-[var(--ink-soft)]"
                      >
                        df
                      </th>
                      <th
                        scope="col"
                        className="w-[20%] px-1 py-2 text-right font-normal text-[var(--ink-soft)]"
                      >
                        平均平方
                      </th>
                      <th
                        scope="col"
                        className="w-[12%] px-1 py-2 text-right font-normal text-[var(--ink-soft)]"
                      >
                        F
                      </th>
                      <th
                        scope="col"
                        className="w-[13%] py-2 pl-1 text-right font-normal text-[var(--ink-soft)]"
                      >
                        p
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--line)]">
                      <th
                        scope="row"
                        className="break-all py-2 pr-1 font-normal text-[var(--ink)]"
                      >
                        群間
                      </th>
                      <td className="break-words px-1 py-2 text-right tabular-nums">
                        {formatNumber(result.betweenSumOfSquares)}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {integerFormatter.format(result.dfBetween)}
                      </td>
                      <td className="break-words px-1 py-2 text-right tabular-nums">
                        {formatNumber(result.meanSquareBetween)}
                      </td>
                      <td className="break-words px-1 py-2 text-right tabular-nums">
                        {formatNumber(result.fValue)}
                      </td>
                      <td className="break-words py-2 pl-1 text-right tabular-nums">
                        {formatPValue(result.pValue)}
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--line)]">
                      <th
                        scope="row"
                        className="break-all py-2 pr-1 font-normal text-[var(--ink)]"
                      >
                        群内
                      </th>
                      <td className="break-words px-1 py-2 text-right tabular-nums">
                        {formatNumber(result.withinSumOfSquares)}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {integerFormatter.format(result.dfWithin)}
                      </td>
                      <td className="break-words px-1 py-2 text-right tabular-nums">
                        {formatNumber(result.meanSquareWithin)}
                      </td>
                      <td className="break-words px-1 py-2 text-right text-[var(--ink-soft)]">
                        -
                      </td>
                      <td className="break-words py-2 pl-1 text-right text-[var(--ink-soft)]">
                        -
                      </td>
                    </tr>
                    <tr>
                      <th
                        scope="row"
                        className="break-all py-2 pr-1 font-normal text-[var(--ink)]"
                      >
                        全体
                      </th>
                      <td className="break-words px-1 py-2 text-right tabular-nums">
                        {formatNumber(result.totalSumOfSquares)}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {integerFormatter.format(result.dfTotal)}
                      </td>
                      <td className="break-words px-1 py-2 text-right text-[var(--ink-soft)]">
                        -
                      </td>
                      <td className="break-words px-1 py-2 text-right text-[var(--ink-soft)]">
                        -
                      </td>
                      <td className="break-words py-2 pl-1 text-right text-[var(--ink-soft)]">
                        -
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                η² = 群間平方和 ÷ 全体平方和、ω²は自由度と平均平方を用いた効果量です。ω²が負になる場合は0として表示します。
              </p>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Group Summary
                  </p>
                  <h3 className="font-editorial mt-1 text-lg">
                    群ごとの要約
                  </h3>
                </div>
                <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-[10px] font-bold tabular-nums">
                  {integerFormatter.format(result.groupCount)}群
                </span>
              </div>
              <div className="mt-3">
                <table className="w-full table-fixed border-collapse text-left text-[11px] sm:text-xs">
                  <caption className="sr-only">
                    群ごとの件数、平均値、標準偏差
                  </caption>
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th
                        scope="col"
                        className="w-[40%] py-2 pr-1 font-normal text-[var(--ink-soft)]"
                      >
                        グループ
                      </th>
                      <th
                        scope="col"
                        className="w-[12%] px-1 py-2 text-right font-normal text-[var(--ink-soft)]"
                      >
                        n
                      </th>
                      <th
                        scope="col"
                        className="w-[24%] px-1 py-2 text-right font-normal text-[var(--ink-soft)]"
                      >
                        平均
                      </th>
                      <th
                        scope="col"
                        className="w-[24%] py-2 pl-1 text-right font-normal text-[var(--ink-soft)]"
                      >
                        標準偏差
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.groups.map((group) => (
                      <tr
                        key={group.name}
                        className="border-b border-[var(--line)] last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="break-all py-2 pr-1 font-normal text-[var(--ink)]"
                        >
                          {group.name}
                        </th>
                        <td className="px-1 py-2 text-right tabular-nums">
                          {integerFormatter.format(group.count)}
                        </td>
                        <td className="break-words px-1 py-2 text-right tabular-nums">
                          {formatNumber(group.mean)}
                        </td>
                        <td className="break-words py-2 pl-1 text-right tabular-nums">
                          {formatNumber(group.standardDeviation)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                標準偏差は標本標準偏差（n-1で割る）です。
              </p>
              <MeansChart
                groups={result.groups}
                grandMean={result.grandMean}
              />
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Pairwise Comparisons
                  </p>
                  <h3 className="font-editorial mt-1 text-lg">
                    群間の多重比較
                  </h3>
                </div>
                <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-[10px] font-bold">
                  Welchのt検定
                </span>
              </div>
              <div className="mt-3 divide-y divide-[var(--line)]">
                {result.pairwise.map((comparison) => (
                  <div
                    key={`${comparison.first}-${comparison.second}`}
                    className="min-w-0 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 break-all text-xs font-bold text-[var(--ink)]">
                        {comparison.first} と {comparison.second}
                      </p>
                      <span
                        className={`inline-block border bg-[var(--paper-strong)] px-2 py-0.5 text-[10px] font-bold ${
                          comparison.significant
                            ? 'border-[var(--accent)] text-[var(--accent)]'
                            : 'border-[var(--line-strong)] text-[var(--ink-soft)]'
                        }`}
                      >
                        {comparison.significant ? '有意差あり' : '有意差なし'}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] leading-5 sm:grid-cols-4">
                      <div className="min-w-0">
                        <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                          平均差
                        </dt>
                        <dd className="break-words font-bold tabular-nums">
                          {formatNumber(comparison.meanDifference)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                          t値 / 自由度
                        </dt>
                        <dd className="break-words font-bold tabular-nums">
                          {comparison.tValue === null
                            ? '算出不可'
                            : `${formatNumber(
                                comparison.tValue,
                              )} / ${
                                comparison.degreesOfFreedom === null
                                  ? '算出不可'
                                  : formatNumber(
                                      comparison.degreesOfFreedom,
                                    )
                              }`}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                          p値
                        </dt>
                        <dd className="break-words font-bold tabular-nums">
                          {formatPValue(comparison.pValue)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                          調整後p値
                        </dt>
                        <dd className="break-words font-bold tabular-nums">
                          {formatPValue(comparison.adjustedPValue)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
              <p className="mt-3 border-t border-[var(--line)] pt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                Bonferroni補正後の有意水準は
                {formatEffect(result.bonferroniAlpha)}（比較回数
                {integerFormatter.format(result.pairCount)}
                回）です。調整後p値が0.05未満の場合に「有意差あり」と表示します。p値は各比較のWelchのt検定による両側p値です。
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="text-sm leading-6 text-[var(--ink-soft)]">
              有効なCSVを入力すると、分散分析表、群ごとの平均と標準偏差、効果量、Welchのt検定による多重比較を表示します。
            </p>
          </div>
        )}

        <div
          role="note"
          className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            分散分析の前提条件
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-6 text-[var(--ink)]">
            <li>
              独立性: 各観測値が互いに独立していること。同じ対象の反復測定や対応のあるデータには向きません。
            </li>
            <li>
              正規性: 各群の値がおおむね正規分布に従うこと。極端な外れ値や強い歪みがある場合は結果が不安定になります。
            </li>
            <li>
              等分散性: 各群の分散がおおむね等しいこと。分散が大きく異なる場合はWelchの分散分析などを検討してください。
            </li>
          </ul>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            ANOVAは「すべての群の平均が等しい」という帰無仮説を検定するもので、どの群とどの群に差があるかまでは示しません。有意な差がある場合でも、結果は因果関係を証明するものではありません。
          </p>
          <p className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
            表示は小数第4位までの目安です。グループ名は入力した文字列をそのまま表示します。
          </p>
        </div>
      </section>
    </section>
  );
}
