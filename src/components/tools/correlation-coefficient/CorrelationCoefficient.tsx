'use client';

import { useState } from 'react';

const EXAMPLE_X = '1, 2, 3, 4, 5, 6, 7, 8';
const EXAMPLE_Y = '2, 4, 5, 4, 7, 9, 8, 11';

const numberFormatter = new Intl.NumberFormat('ja-JP');
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 6,
});
const coefficientFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const axisFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 3,
});

const CHART_WIDTH = 620;
const CHART_HEIGHT = 420;
const CHART_PADDING = { top: 24, right: 24, bottom: 56, left: 64 };
const PLOT_WIDTH =
  CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT =
  CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

type ParsedSeries = {
  values: number[];
  error: string | null;
};

type Statistics = {
  count: number;
  meanX: number;
  meanY: number;
  sampleSdX: number;
  sampleSdY: number;
  covariance: number;
  r: number | null;
  rSquared: number | null;
  slope: number | null;
  intercept: number | null;
  zeroVarianceX: boolean;
  zeroVarianceY: boolean;
  interpretation: string | null;
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

const CORRELATION_BANDS = [
  { range: 'r ≥ 0.7', label: '強い正の相関' },
  { range: '0.4 ≤ r < 0.7', label: '中程度の正の相関' },
  { range: '0 < r < 0.4', label: '弱い正の相関' },
  { range: 'r = 0', label: '相関なし' },
  { range: '-0.4 < r < 0', label: '弱い負の相関' },
  { range: '-0.7 < r ≤ -0.4', label: '中程度の負の相関' },
  { range: 'r ≤ -0.7', label: '強い負の相関' },
] as const;

function parseSeries(rawValue: string, label: string): ParsedSeries {
  const normalized = rawValue.replace(/、/g, ',').replace(/，/g, ',');
  const tokens = normalized
    .split(/[\s,]+/)
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return { values: [], error: `${label}の値を入力してください。` };
  }

  const values: number[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const value = Number(token);

    if (!Number.isFinite(value)) {
      return {
        values: [],
        error: `${label}の${index + 1}番目「${token}」は数値ではありません。カンマ・スペース・改行で区切って入力してください。`,
      };
    }

    values.push(value);
  }

  return { values, error: null };
}

function hasZeroVariance(values: number[]): boolean {
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

  return (
    maximum - minimum <=
    Number.EPSILON * Math.max(1, Math.abs(minimum), Math.abs(maximum)) * 16
  );
}

function getCorrelationInterpretation(r: number): string {
  const absolute = Math.abs(r);

  if (absolute === 0) {
    return '相関なし';
  }

  const strength =
    absolute >= 0.7 ? '強い' : absolute >= 0.4 ? '中程度の' : '弱い';
  const direction = r > 0 ? '正' : '負';

  return `${strength}${direction}の相関`;
}

function buildStatistics(
  xValues: number[],
  yValues: number[],
): Statistics {
  const count = xValues.length;
  let sumX = 0;
  let sumY = 0;

  for (let index = 0; index < count; index += 1) {
    sumX += xValues[index];
    sumY += yValues[index];
  }

  const meanX = sumX / count;
  const meanY = sumY / count;
  let sumSquaredX = 0;
  let sumSquaredY = 0;
  let sumProduct = 0;

  for (let index = 0; index < count; index += 1) {
    const deviationX = xValues[index] - meanX;
    const deviationY = yValues[index] - meanY;
    sumSquaredX += deviationX * deviationX;
    sumSquaredY += deviationY * deviationY;
    sumProduct += deviationX * deviationY;
  }

  const zeroVarianceX = hasZeroVariance(xValues);
  const zeroVarianceY = hasZeroVariance(yValues);
  const covariance = sumProduct / (count - 1);
  const sampleSdX = Math.sqrt(sumSquaredX / (count - 1));
  const sampleSdY = Math.sqrt(sumSquaredY / (count - 1));
  let r: number | null = null;

  if (!zeroVarianceX && !zeroVarianceY) {
    const denominator = Math.sqrt(sumSquaredX * sumSquaredY);

    if (denominator > 0) {
      r = Math.max(-1, Math.min(1, sumProduct / denominator));
    }
  }

  const rSquared = r !== null ? r * r : null;
  let slope: number | null = null;
  let intercept: number | null = null;

  if (!zeroVarianceX && sumSquaredX > 0) {
    slope = sumProduct / sumSquaredX;
    intercept = meanY - slope * meanX;
  }

  return {
    count,
    meanX,
    meanY,
    sampleSdX,
    sampleSdY,
    covariance,
    r,
    rSquared,
    slope,
    intercept,
    zeroVarianceX,
    zeroVarianceY,
    interpretation: r !== null ? getCorrelationInterpretation(r) : null,
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

function formatCoefficient(value: number): string {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return coefficientFormatter.format(normalized);
}

function formatRegressionEquation(
  slope: number,
  intercept: number,
): string {
  const interceptText = decimalFormatter.format(Math.abs(intercept));
  return `y = ${decimalFormatter.format(slope)}x ${
    intercept < 0 ? '-' : '+'
  } ${interceptText}`;
}

export function CorrelationCoefficient() {
  const [xInput, setXInput] = useState(EXAMPLE_X);
  const [yInput, setYInput] = useState(EXAMPLE_Y);

  const xSeries = parseSeries(xInput, 'X');
  const ySeries = parseSeries(yInput, 'Y');
  let pairError: string | null = null;

  if (xSeries.error === null && ySeries.error === null) {
    if (xSeries.values.length !== ySeries.values.length) {
      pairError = `XとYのデータ数が一致しません（X: ${numberFormatter.format(
        xSeries.values.length,
      )}件、Y: ${numberFormatter.format(
        ySeries.values.length,
      )}件）。同じ数だけ入力してください。`;
    } else if (xSeries.values.length < 2) {
      pairError =
        '相関係数を計算するには、XとYを2組以上入力してください。';
    }
  }

  const canCalculate =
    xSeries.error === null &&
    ySeries.error === null &&
    pairError === null;
  const statistics = canCalculate
    ? buildStatistics(xSeries.values, ySeries.values)
    : null;
  const zeroVarianceLabels =
    statistics === null
      ? []
      : [
          ...(statistics.zeroVarianceX ? ['X'] : []),
          ...(statistics.zeroVarianceY ? ['Y'] : []),
        ];
  const zeroVarianceWarning =
    zeroVarianceLabels.length > 0
      ? `${zeroVarianceLabels.join(
          'と',
        )}の値がすべて同じため、相関係数と決定係数は計算できません。それぞれの系列に異なる値を含めてください。`
      : null;
  const equation =
    statistics !== null &&
    statistics.slope !== null &&
    statistics.intercept !== null
      ? formatRegressionEquation(statistics.slope, statistics.intercept)
      : null;
  const statusMessage =
    statistics !== null
      ? statistics.r !== null &&
        statistics.rSquared !== null &&
        statistics.interpretation !== null
        ? `データ数${numberFormatter.format(
            statistics.count,
          )}、相関係数rは${formatCoefficient(
            statistics.r,
          )}、決定係数R²は${formatCoefficient(
            statistics.rSquared,
          )}、${statistics.interpretation}です。${
            equation !== null ? `回帰直線は${equation}です。` : ''
          }`
        : zeroVarianceWarning ?? '相関係数は計算できません。'
      : pairError ??
        xSeries.error ??
        ySeries.error ??
        'XとYの値を入力すると相関係数と散布図を表示します。';
  const chart =
    statistics !== null
      ? buildChartGeometry(xSeries.values, ySeries.values)
      : null;
  const regressionLine =
    chart !== null &&
    statistics !== null &&
    statistics.slope !== null &&
    statistics.intercept !== null
      ? {
          x1: chart.xScale(chart.xMin),
          y1: chart.yScale(
            statistics.slope * chart.xMin + statistics.intercept,
          ),
          x2: chart.xScale(chart.xMax),
          y2: chart.yScale(
            statistics.slope * chart.xMax + statistics.intercept,
          ),
        }
      : null;
  const chartSummary =
    statistics !== null
      ? [
          `データ数は${numberFormatter.format(statistics.count)}組です。`,
          `Xの平均は${decimalFormatter.format(
            statistics.meanX,
          )}、Yの平均は${decimalFormatter.format(
            statistics.meanY,
          )}です。`,
          statistics.r !== null &&
          statistics.rSquared !== null &&
          statistics.interpretation !== null
            ? `相関係数rは${formatCoefficient(
                statistics.r,
              )}、決定係数R²は${formatCoefficient(
                statistics.rSquared,
              )}、${statistics.interpretation}です。`
            : '相関係数は計算できません。',
          equation !== null
            ? `回帰直線は${equation}です。`
            : '回帰直線は計算できません。',
        ].join('')
      : '';

  const loadExample = () => {
    setXInput(EXAMPLE_X);
    setYInput(EXAMPLE_Y);
  };

  const resetForm = () => {
    setXInput('');
    setYInput('');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="相関係数・散布図"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="correlation-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="correlation-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              データを入力
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
          XとYに同じ件数の数値を入力します。値はカンマ、スペース、改行のいずれかで区切ってください。入力内容は自動で反映されます。
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="correlation-x"
                className="text-sm font-bold text-[var(--ink)]"
              >
                Xの値
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                {xSeries.error === null
                  ? `${numberFormatter.format(
                      xSeries.values.length,
                    )}件`
                  : '要確認'}
              </span>
            </div>
            <textarea
              id="correlation-x"
              name="xValues"
              value={xInput}
              onChange={(event) => setXInput(event.target.value)}
              rows={5}
              placeholder="例: 1, 2, 3, 4, 5"
              spellCheck={false}
              aria-invalid={xSeries.error !== null}
              aria-describedby={
                xSeries.error
                  ? 'correlation-x-help correlation-x-error'
                  : 'correlation-x-help'
              }
              className="field-paper mt-2 h-32 w-full resize-y rounded-sm px-3 py-3 text-sm leading-6 tabular-nums"
            />
            <p
              id="correlation-x-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              カンマ・スペース・改行で区切ります。例: 1, 2, 3, 4
            </p>
            {xSeries.error && (
              <p
                id="correlation-x-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {xSeries.error}
              </p>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="correlation-y"
                className="text-sm font-bold text-[var(--ink)]"
              >
                Yの値
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                {ySeries.error === null
                  ? `${numberFormatter.format(
                      ySeries.values.length,
                    )}件`
                  : '要確認'}
              </span>
            </div>
            <textarea
              id="correlation-y"
              name="yValues"
              value={yInput}
              onChange={(event) => setYInput(event.target.value)}
              rows={5}
              placeholder="例: 2, 4, 5, 4, 7"
              spellCheck={false}
              aria-invalid={ySeries.error !== null}
              aria-describedby={
                ySeries.error
                  ? 'correlation-y-help correlation-y-error'
                  : 'correlation-y-help'
              }
              className="field-paper mt-2 h-32 w-full resize-y rounded-sm px-3 py-3 text-sm leading-6 tabular-nums"
            />
            <p
              id="correlation-y-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              カンマ・スペース・改行で区切ります。例: 2, 4, 5, 4, 7
            </p>
            {ySeries.error && (
              <p
                id="correlation-y-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {ySeries.error}
              </p>
            )}
          </div>
        </div>

        {pairError && (
          <p
            role="alert"
            className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--accent)]"
          >
            {pairError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={loadExample}
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
        aria-labelledby="correlation-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="correlation-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              計算結果
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

        {statistics !== null ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Pearson r
                  </p>
                  {statistics.r !== null &&
                  statistics.interpretation !== null ? (
                    <>
                      <p className="font-editorial mt-1 text-4xl leading-none tabular-nums">
                        {formatCoefficient(statistics.r)}
                      </p>
                      <p className="mt-3 inline-block border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-xs font-bold">
                        {statistics.interpretation}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                      相関係数は計算できません。
                    </p>
                  )}
                </div>
                <p className="font-label shrink-0 text-right text-[9px] text-[var(--ink-soft)]">
                  相関係数
                  <br />
                  r
                </p>
              </div>
              {statistics.rSquared !== null && (
                <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                  決定係数 R² ={' '}
                  {formatCoefficient(statistics.rSquared)}（rを2乗した値）
                </p>
              )}
            </div>

            {zeroVarianceWarning && (
              <div
                role="alert"
                className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
              >
                <p className="text-xs font-bold text-[var(--accent)]">
                  標準偏差が0です
                </p>
                <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                  {zeroVarianceWarning}
                </p>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  データ数
                </dt>
                <dd className="font-editorial mt-1 text-xl leading-tight tabular-nums">
                  {numberFormatter.format(statistics.count)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  Xの平均
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {decimalFormatter.format(statistics.meanX)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  Yの平均
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {decimalFormatter.format(statistics.meanY)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  Xの標準偏差
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {decimalFormatter.format(statistics.sampleSdX)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  Yの標準偏差
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {decimalFormatter.format(statistics.sampleSdY)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  共分散
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {decimalFormatter.format(statistics.covariance)}
                </dd>
              </div>
            </dl>

            <p className="text-[10px] leading-5 text-[var(--ink-soft)]">
              標準偏差と共分散は標本（n-1）で計算しています。
            </p>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                最小二乗回帰直線
              </p>
              {statistics.slope !== null &&
              statistics.intercept !== null ? (
                <>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatRegressionEquation(
                      statistics.slope,
                      statistics.intercept,
                    )}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <dt className="text-[var(--ink-soft)]">傾き</dt>
                      <dd className="mt-0.5 font-bold tabular-nums">
                        {decimalFormatter.format(statistics.slope)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--ink-soft)]">切片</dt>
                      <dd className="mt-0.5 font-bold tabular-nums">
                        {decimalFormatter.format(statistics.intercept)}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  Xの値がすべて同じため、回帰直線は計算できません。
                </p>
              )}
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                rの目安
              </p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {CORRELATION_BANDS.map((band) => {
                  const isActive =
                    statistics.interpretation === band.label;

                  return (
                    <li
                      key={band.label}
                      className={`flex items-center justify-between gap-2 border px-2.5 py-1.5 text-[11px] ${
                        isActive
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-bold text-[var(--accent)]'
                          : 'border-[var(--line)] text-[var(--ink-soft)]'
                      }`}
                    >
                      <span>{band.label}</span>
                      <span className="font-label text-[9px] tabular-nums">
                        {band.range}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                rは-1〜1の範囲で、絶対値が1に近いほど直線的な関係が強いことを示します。相関は因果関係を意味しません。
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            有効なXとYのデータを入力すると、平均・標準偏差・共分散・相関係数・決定係数・回帰直線を表示します。
          </p>
        )}

        <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          ピアソンの相関係数は2変数の直線的な関係を測ります。外れ値や非線形な関係はrに反映されない場合があります。
        </p>
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="correlation-chart-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Chart</p>
            <h2
              id="correlation-chart-heading"
              className="font-editorial mt-1 text-xl"
            >
              散布図と回帰直線
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            03 / 03
          </span>
        </div>

        {statistics !== null && chart !== null ? (
          <figure className="mt-4 min-w-0">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-labelledby="correlation-scatter-title"
              aria-describedby="correlation-scatter-desc"
              className="h-auto w-full"
            >
              <title id="correlation-scatter-title">
                XとYの散布図
              </title>
              <desc id="correlation-scatter-desc">
                {`${chartSummary}点は観測値、直線は最小二乗回帰直線を示します。`}
              </desc>
              <defs>
                <clipPath id="correlation-plot-clip">
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
                X
              </text>
              <text
                x={CHART_PADDING.left - 46}
                y={CHART_PADDING.top + 4}
                fill="var(--ink)"
                fontSize={16}
              >
                Y
              </text>
              <g clipPath="url(#correlation-plot-clip)">
                {regressionLine !== null && (
                  <line
                    x1={regressionLine.x1}
                    y1={regressionLine.y1}
                    x2={regressionLine.x2}
                    y2={regressionLine.y2}
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                )}
                {xSeries.values.map((xValue, index) => (
                  <circle
                    key={`point-${index}`}
                    cx={chart.xScale(xValue)}
                    cy={chart.yScale(ySeries.values[index])}
                    r={4.5}
                    fill="var(--accent)"
                    stroke="var(--paper)"
                    strokeWidth={1.5}
                  />
                ))}
              </g>
            </svg>
            <figcaption className="mt-2 flex flex-col gap-1 text-[11px] leading-5 text-[var(--ink-soft)] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span>点は入力した観測値、直線は最小二乗回帰直線です。</span>
              {equation !== null && (
                <span className="font-label text-[10px] tabular-nums">
                  {equation}
                </span>
              )}
            </figcaption>
            <p className="sr-only">{chartSummary}</p>
          </figure>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            XとYに同じ件数で2組以上の有効な数値を入力すると、散布図と回帰直線を表示します。
          </p>
        )}
      </section>
    </section>
  );
}
