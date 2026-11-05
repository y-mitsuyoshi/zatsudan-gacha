'use client';

import { useState } from 'react';
import {
  invert,
  mean,
  median,
  multiplyMatrices,
  multiplyMatrixVector,
  parseDelimitedTable,
  quantile,
} from '@/lib/statsCore';

type Dataset = {
  x: number[];
  y: number[];
  errors: string[];
};

type QuantileRegressionResult = {
  intercept: number;
  slope: number;
  pseudoR1: number | null;
  iterations: number;
  converged: boolean;
};

type OlsReference = {
  intercept: number;
  slope: number;
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

const SAMPLE_CSV = [
  'x,y',
  '1,2.4',
  '2,3.1',
  '3,5.8',
  '4,6.2',
  '5,8.9',
  '6,9.4',
  '7,12.1',
  '8,13.8',
  '9,14.2',
  '10,17.6',
  '11,18.3',
  '12,21.5',
  '13,22.1',
  '14,25.4',
  '15,26.8',
  '16,29.1',
  '17,30.2',
  '18,33.8',
  '19,34.1',
  '20,50',
].join('\n');

const QUANTILE_VALUES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const MAX_ERRORS = 6;
const MAX_ITERATIONS = 50;
const TOLERANCE = 1e-7;
const RESIDUAL_FLOOR = 1e-8;
const CHART_WIDTH = 620;
const CHART_HEIGHT = 380;
const CHART_PADDING = { top: 24, right: 24, bottom: 52, left: 64 };
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

const integerFormatter = new Intl.NumberFormat('ja-JP');
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 6,
});
const compactNumberFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 4,
});
const coefficientFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const quantileFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const axisFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 4,
});

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = normalizeZero(value);
  const absolute = Math.abs(normalized);
  if (absolute > 0 && absolute < 0.0001) {
    return compactNumberFormatter.format(normalized);
  }
  if (absolute >= 1_000_000_000) {
    return compactNumberFormatter.format(normalized);
  }
  return decimalFormatter.format(normalized);
}

function formatPseudoR1(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = Math.abs(value) < 0.0005 ? 0 : normalizeZero(value);
  return coefficientFormatter.format(normalized);
}

function formatQuantile(value: number): string {
  return quantileFormatter.format(value);
}

function formatAxis(value: number): string {
  return axisFormatter.format(normalizeZero(value));
}

function parseDataset(raw: string): Dataset {
  const normalized = raw
    .replace(/\uFEFF/g, '')
    .normalize('NFKC')
    .replace(/[、，]/g, ',')
    .replace(/[−–—]/g, '-')
    .replace(/\r\n?/g, '\n');

  const table = parseDelimitedTable(normalized);

  if (table.errors.length > 0) {
    return { x: [], y: [], errors: table.errors };
  }

  const errors: string[] = [];
  const headers = table.headers.map((header) => header.trim().toLowerCase());

  if (headers.length !== 2) {
    errors.push('ヘッダーは x,y の2列で入力してください。');
  } else if (headers[0] !== 'x' || headers[1] !== 'y') {
    errors.push('ヘッダーの1列目は x、2列目は y にしてください。');
  }

  if (table.rows.length === 0) {
    errors.push('ヘッダーの下にデータ行を入力してください。');
  }

  const xValues: number[] = [];
  const yValues: number[] = [];

  for (let index = 0; index < table.rows.length; index += 1) {
    const row = table.rows[index];
    const lineNumber = index + 2;

    if (row.length !== 2) {
      errors.push(
        `${integerFormatter.format(lineNumber)}行目は x と y の2列で入力してください。`,
      );
      continue;
    }

    const xToken = row[0].trim();
    const yToken = row[1].trim();

    if (xToken === '' || yToken === '') {
      errors.push(
        `${integerFormatter.format(lineNumber)}行目の x または y が空欄です。`,
      );
      continue;
    }

    const xValue = Number(xToken);
    const yValue = Number(yToken);

    if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) {
      errors.push(
        `${integerFormatter.format(lineNumber)}行目に数値でない値があります。x と y は数値で入力してください。`,
      );
      continue;
    }

    xValues.push(xValue);
    yValues.push(yValue);
  }

  if (xValues.length > 0 && xValues.length < 3) {
    errors.push('有効なデータを3組以上入力してください。');
  }

  if (errors.length === 0) {
    const xAverage = mean(xValues);
    const sumSquaredX = xValues.reduce(
      (total, value) => total + (value - xAverage) ** 2,
      0,
    );
    if (sumSquaredX <= 0) {
      errors.push('xの値がすべて同じため、回帰直線を推定できません。');
    }
  }

  if (errors.length > 0) {
    return { x: [], y: [], errors };
  }

  return { x: xValues, y: yValues, errors: [] };
}

function fitWeightedLeastSquares(
  xValues: number[],
  yValues: number[],
  weights: number[],
): [number, number] | null {
  const design = xValues.map((value) => [1, value]);
  const rootWeights = weights.map((weight) => Math.sqrt(Math.max(weight, 0)));
  const weightedDesign = design.map((row, index) =>
    row.map((value) => value * rootWeights[index]),
  );
  const weightedOutcome = yValues.map(
    (value, index) => value * rootWeights[index],
  );
  const transposed = [0, 1].map((column) =>
    weightedDesign.map((row) => row[column]),
  );
  const xtwx = multiplyMatrices(transposed, weightedDesign);
  const xtwy = multiplyMatrixVector(transposed, weightedOutcome);
  const inverse = invert(xtwx);

  if (!inverse) {
    return null;
  }

  const coefficients = multiplyMatrixVector(inverse, xtwy);

  if (
    coefficients.length !== 2 ||
    coefficients.some((value) => !Number.isFinite(value))
  ) {
    return null;
  }

  return [coefficients[0], coefficients[1]];
}

function calculateCheckObjective(residuals: number[], tau: number): number {
  return residuals.reduce(
    (total, residual) =>
      total + (residual >= 0 ? tau * residual : (tau - 1) * residual),
    0,
  );
}

function fitQuantileRegression(
  xValues: number[],
  yValues: number[],
  tau: number,
): QuantileRegressionResult | null {
  const initialOls = fitWeightedLeastSquares(
    xValues,
    yValues,
    xValues.map(() => 1),
  );
  const initialSlope = initialOls?.[1] ?? 0;
  const initialIntercept = median(
    yValues.map((value, index) => value - initialSlope * xValues[index]),
  );
  let intercept = initialIntercept;
  let slope = initialSlope;
  let converged = false;
  let iterations = 0;

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration += 1) {
    iterations = iteration;
    const residuals = yValues.map(
      (value, index) => value - (intercept + slope * xValues[index]),
    );
    const weights = residuals.map((residual) => {
      const denominator = Math.max(Math.abs(residual), RESIDUAL_FLOOR);
      return (residual >= 0 ? tau : 1 - tau) / denominator;
    });
    const coefficients = fitWeightedLeastSquares(xValues, yValues, weights);

    if (!coefficients) {
      return null;
    }

    const change = Math.max(
      Math.abs(coefficients[0] - intercept),
      Math.abs(coefficients[1] - slope),
    );
    intercept = coefficients[0];
    slope = coefficients[1];

    if (change < TOLERANCE) {
      converged = true;
      break;
    }
  }

  const residuals = yValues.map(
    (value, index) => value - (intercept + slope * xValues[index]),
  );
  const objective = calculateCheckObjective(residuals, tau);
  const baseline = quantile(yValues, tau);
  const baselineObjective = calculateCheckObjective(
    yValues.map((value) => value - baseline),
    tau,
  );
  const pseudoR1 =
    baselineObjective > 0 ? 1 - objective / baselineObjective : null;

  return { intercept, slope, pseudoR1, iterations, converged };
}

function calculateOlsReference(
  xValues: number[],
  yValues: number[],
): OlsReference | null {
  const meanX = mean(xValues);
  const meanY = mean(yValues);
  let sumSquaredX = 0;
  let sumProduct = 0;

  for (let index = 0; index < xValues.length; index += 1) {
    const deviationX = xValues[index] - meanX;
    sumSquaredX += deviationX * deviationX;
    sumProduct += deviationX * (yValues[index] - meanY);
  }

  if (sumSquaredX <= 0) {
    return null;
  }

  const slope = sumProduct / sumSquaredX;

  return { intercept: meanY - slope * meanX, slope };
}

function getDomain(values: number[]): [number, number] {
  if (values.length === 0) {
    return [-1, 1];
  }

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

  const padding = (maximum - minimum) * 0.08;
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
  result: QuantileRegressionResult,
  ols: OlsReference,
): ChartGeometry {
  const [xMin, xMax] = getDomain(xValues);
  const lineValues = [
    result.intercept + result.slope * xMin,
    result.intercept + result.slope * xMax,
    ols.intercept + ols.slope * xMin,
    ols.intercept + ols.slope * xMax,
  ];
  const [yMin, yMax] = getDomain([...yValues, ...lineValues]);
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

function RegressionChart({
  xValues,
  yValues,
  result,
  ols,
  tau,
}: {
  xValues: number[];
  yValues: number[];
  result: QuantileRegressionResult;
  ols: OlsReference;
  tau: number;
}) {
  const chart = buildChartGeometry(xValues, yValues, result, ols);
  const quantileLine = {
    x1: chart.xScale(chart.xMin),
    y1: chart.yScale(result.intercept + result.slope * chart.xMin),
    x2: chart.xScale(chart.xMax),
    y2: chart.yScale(result.intercept + result.slope * chart.xMax),
  };
  const olsLine = {
    x1: chart.xScale(chart.xMin),
    y1: chart.yScale(ols.intercept + ols.slope * chart.xMin),
    x2: chart.xScale(chart.xMax),
    y2: chart.yScale(ols.intercept + ols.slope * chart.xMax),
  };
  const chartSummary = `観測値${integerFormatter.format(
    xValues.length,
  )}組の散布図です。実線は分位点${formatQuantile(
    tau,
  )}の回帰直線、破線は最小二乗回帰の参考線です。`;

  return (
    <figure className="mt-4 min-w-0">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-labelledby="quantile-regression-chart-title"
        aria-describedby="quantile-regression-chart-desc"
        className="h-auto w-full"
      >
        <title id="quantile-regression-chart-title">
          分位点回帰の散布図
        </title>
        <desc id="quantile-regression-chart-desc">{chartSummary}</desc>
        <defs>
          <clipPath id="quantile-regression-chart-clip">
            <rect
              x={CHART_PADDING.left}
              y={CHART_PADDING.top}
              width={PLOT_WIDTH}
              height={PLOT_HEIGHT}
            />
          </clipPath>
        </defs>
        <g>
          {chart.yTicks.map((tick, index) => {
            const y = chart.yScale(tick);

            return (
              <g key={`y-tick-${index}`}>
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
                  {formatAxis(tick)}
                </text>
              </g>
            );
          })}
          {chart.xTicks.map((tick, index) => {
            const x = chart.xScale(tick);

            return (
              <g key={`x-tick-${index}`}>
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
                  {formatAxis(tick)}
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
          x
        </text>
        <text
          x={CHART_PADDING.left - 46}
          y={CHART_PADDING.top + 4}
          fill="var(--ink)"
          fontSize={16}
        >
          y
        </text>
        <g clipPath="url(#quantile-regression-chart-clip)">
          <line
            x1={olsLine.x1}
            y1={olsLine.y1}
            x2={olsLine.x2}
            y2={olsLine.y2}
            stroke="var(--gold)"
            strokeWidth={2}
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
          <line
            x1={quantileLine.x1}
            y1={quantileLine.y1}
            x2={quantileLine.x2}
            y2={quantileLine.y2}
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {xValues.map((xValue, index) => (
            <circle
              key={`point-${index}`}
              cx={chart.xScale(xValue)}
              cy={chart.yScale(yValues[index])}
              r={4.5}
              fill="var(--accent)"
              stroke="var(--paper)"
              strokeWidth={1.5}
            >
              <title>
                {`x=${formatNumber(xValue)}, y=${formatNumber(yValues[index])}`}
              </title>
            </circle>
          ))}
        </g>
      </svg>
      <figcaption className="mt-2 flex flex-col gap-1 text-[11px] leading-5 text-[var(--ink-soft)] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <span>点は観測値、実線は分位点回帰、破線はOLS参考線です。</span>
        <span className="font-label shrink-0 text-[10px] tabular-nums">
          τ = {formatQuantile(tau)}
        </span>
      </figcaption>
      <p className="sr-only">{chartSummary}</p>
    </figure>
  );
}

export function QuantileRegression() {
  const [input, setInput] = useState(SAMPLE_CSV);
  const [tau, setTau] = useState(0.5);

  const dataset = parseDataset(input);
  const hasErrors = dataset.errors.length > 0;
  const result = hasErrors
    ? null
    : fitQuantileRegression(dataset.x, dataset.y, tau);
  const ols = hasErrors ? null : calculateOlsReference(dataset.x, dataset.y);

  const statusMessage =
    result !== null
      ? `分位点${formatQuantile(tau)}の回帰結果は、切片${formatNumber(
          result.intercept,
        )}、傾き${formatNumber(result.slope)}、疑似R1${formatPseudoR1(
          result.pseudoR1,
        )}、サンプルサイズ${integerFormatter.format(
          dataset.x.length,
        )}組です。${
          result.converged
            ? ''
            : `IRLSが${integerFormatter.format(
                result.iterations,
              )}回の反復で収束しませんでした。推定値は参考値として確認してください。`
        }`
      : hasErrors
        ? `入力エラーが${integerFormatter.format(
            dataset.errors.length,
          )}件あります。${dataset.errors[0]}`
        : 'x,yのCSVと分位点を入力すると推定結果を表示します。';

  const loadSample = () => {
    setInput(SAMPLE_CSV);
    setTau(0.5);
  };

  const resetForm = () => {
    setInput('');
    setTau(0.5);
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="分位点回帰分析"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="quantile-regression-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="quantile-regression-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              CSVと分位点を入力
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
          1行目を x,y のヘッダー、2行目以降を数値の組にしてください。カンマ・タブ区切りに対応しています。入力内容は自動で反映されます。
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="quantile-regression-input"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {hasErrors
                ? '要確認'
                : `${integerFormatter.format(dataset.x.length)}組`}
            </span>
          </div>
          <textarea
            id="quantile-regression-input"
            name="quantile-regression-input"
            rows={9}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={'x,y\n1,2.4\n2,3.1\n3,5.8'}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-invalid={hasErrors}
            aria-describedby={
              hasErrors
                ? 'quantile-regression-help quantile-regression-errors'
                : 'quantile-regression-help'
            }
            className="field-paper mt-2 min-h-44 w-full rounded-sm px-3 py-3 font-mono text-sm leading-6"
          />
          <p
            id="quantile-regression-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            例: 「x,y」のヘッダーに続けて「1,2.4」のように1行1組で入力します。全角カンマやタブ区切りにも対応しています。
          </p>
          {hasErrors && (
            <div
              id="quantile-regression-errors"
              role="alert"
              className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                入力内容を確認してください
              </p>
              <ul className="mt-1 list-disc space-y-1 break-words pl-4 text-[11px] leading-5 text-[var(--ink)]">
                {dataset.errors.slice(0, MAX_ERRORS).map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
              {dataset.errors.length > MAX_ERRORS && (
                <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                  ほか
                  {integerFormatter.format(dataset.errors.length - MAX_ERRORS)}
                  件のエラーがあります。
                </p>
              )}
            </div>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[var(--ink)]">
            分位点 τ{' '}
            <span className="text-xs font-normal">（0.1〜0.9）</span>
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {QUANTILE_VALUES.map((value) => {
              const isSelected = tau === value;

              return (
                <label
                  key={value}
                  className={`paper-chip flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-sm px-2 py-2.5 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="quantile"
                    value={value}
                    checked={isSelected}
                    onChange={() => setTau(value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-bold tabular-nums">
                    {formatQuantile(value)}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            0.5を選ぶと中央値回帰になります。値が小さいほど分布の下側、大きいほど上側の関係を推定します。
          </p>
        </fieldset>

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
        aria-labelledby="quantile-regression-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="quantile-regression-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              推定結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            02 / 03
          </span>
        </div>

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>

        {result !== null && ols !== null ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    分位点回帰の切片
                  </p>
                  <p className="font-editorial mt-1 break-words text-3xl leading-none tabular-nums sm:text-4xl">
                    {formatNumber(result.intercept)}
                  </p>
                  <p className="mt-3 inline-block border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-xs font-bold tabular-nums">
                    τ = {formatQuantile(tau)}
                  </p>
                </div>
                <p className="font-label shrink-0 text-right text-[9px] text-[var(--ink-soft)]">
                  Quantile
                  <br />
                  Regression
                </p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--line)] pt-3 sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                    傾き
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {formatNumber(result.slope)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                    疑似R1
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {formatPseudoR1(result.pseudoR1)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                    サンプルサイズ
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {integerFormatter.format(dataset.x.length)} 組
                  </dd>
                </div>
              </dl>
            </div>

            {!result.converged && (
              <div
                role="alert"
                className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
              >
                <p className="text-xs font-bold text-[var(--accent)]">
                  IRLSが収束しませんでした
                </p>
                <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                  {integerFormatter.format(result.iterations)}
                  回の反復で係数の変化が1e-7未満にならなかったため、推定値は参考値です。データの分布や外れ値を確認してください。
                </p>
              </div>
            )}

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  係数の要約
                </p>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  Coefficients
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div className="min-w-0">
                  <dt className="text-[var(--ink-soft)]">
                    分位点回帰の切片
                  </dt>
                  <dd className="mt-0.5 break-words font-bold tabular-nums">
                    {formatNumber(result.intercept)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[var(--ink-soft)]">
                    分位点回帰の傾き
                  </dt>
                  <dd className="mt-0.5 break-words font-bold tabular-nums">
                    {formatNumber(result.slope)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[var(--ink-soft)]">
                    OLSの切片（参考）
                  </dt>
                  <dd className="mt-0.5 break-words font-bold tabular-nums">
                    {formatNumber(ols.intercept)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[var(--ink-soft)]">
                    OLSの傾き（参考）
                  </dt>
                  <dd className="mt-0.5 break-words font-bold tabular-nums">
                    {formatNumber(ols.slope)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                疑似R1 = 1 − 分位点回帰のチェック関数損失 ÷
                τ分位点のみの損失。1に近いほど、選んだ分位点での当てはまりが良い目安です。
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="text-sm leading-6 text-[var(--ink-soft)]">
              {hasErrors
                ? '入力内容を確認してください。'
                : '有効なCSVを入力すると推定結果を表示します。'}
            </p>
          </div>
        )}

        <div
          role="note"
          className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            分位点回帰の仮定と限界
          </p>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            分位点回帰は外れ値の影響を受けにくい方法ですが、選択した分位点においてxとyの関係が線形であると仮定します。分布の形状や説明変数の範囲外への外挿には注意し、結果は因果関係を示すものではありません。
          </p>
        </div>
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="quantile-regression-chart-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Chart</p>
            <h2
              id="quantile-regression-chart-heading"
              className="font-editorial mt-1 text-xl"
            >
              散布図と回帰直線
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            03 / 03
          </span>
        </div>

        {result !== null && ols !== null ? (
          <RegressionChart
            xValues={dataset.x}
            yValues={dataset.y}
            result={result}
            ols={ols}
            tau={tau}
          />
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なデータと推定結果があると、散布図と回帰直線を表示します。
          </p>
        )}
      </section>
    </section>
  );
}
