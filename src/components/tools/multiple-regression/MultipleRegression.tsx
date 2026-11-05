'use client';

import { useState } from 'react';
import {
  mean,
  ols,
  parseDelimitedTable,
  quantile,
  standardDeviation,
  tCdf,
  variance,
} from '@/lib/statsCore';
import type { OlsResult } from '@/lib/statsCore';

const SAMPLE_CSV = `売上,広告費,販促費,客数
114.2,10,3,62
112.0,11,4,55
133.4,12,5,74
133.8,13,6,58
147.6,14,7,81
135.6,15,3,66
130.2,16,4,52
155.8,17,5,78
160.0,18,6,70
169.0,19,7,85
152.0,20,3,60
165.6,21,4,76
172.8,22,5,68
187.0,23,6,90`;

const numberFormatter = new Intl.NumberFormat('ja-JP');
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 6,
});
const metricFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 4,
});
const pValueFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const vifFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 4,
});
const axisFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 3,
});

const CHART_WIDTH = 620;
const CHART_HEIGHT = 360;
const CHART_PADDING = { top: 20, right: 20, bottom: 48, left: 60 };
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

type ConfidenceInterval = {
  lower: number;
  upper: number;
};

type VifEntry = {
  name: string;
  value: number | null;
};

type RegressionAnalysis = {
  outcomeName: string;
  predictorNames: string[];
  sampleSize: number;
  result: OlsResult;
  confidenceIntervals: ConfidenceInterval[];
  vifs: VifEntry[];
  residualStandardError: number;
  residualMean: number;
  residualMedian: number;
  residualStandardDeviation: number;
};

type AnalysisAttempt = {
  analysis: RegressionAnalysis | null;
  errors: string[];
  headers: string[];
  rowCount: number;
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

function formatDecimal(value: number): string {
  return decimalFormatter.format(Math.abs(value) < 1e-12 ? 0 : value);
}

function formatPValue(value: number): string {
  if (value < 0.0001) {
    return '< 0.0001';
  }
  if (value > 0.9999) {
    return '> 0.9999';
  }
  return pValueFormatter.format(value);
}

function formatInterval(interval: ConfidenceInterval): string {
  return `[${formatDecimal(interval.lower)}, ${formatDecimal(interval.upper)}]`;
}

function formatVif(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '計算不能';
  }
  return vifFormatter.format(value);
}

function inverseStudentT(probability: number, df: number): number {
  let lower = 0;
  let upper = 1;
  while (tCdf(upper, df) < probability && upper < 1e6) {
    upper *= 2;
  }
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (tCdf(middle, df) < probability) {
      lower = middle;
    } else {
      upper = middle;
    }
  }
  return (lower + upper) / 2;
}

function computeVifs(predictors: number[][], names: string[]): VifEntry[] {
  return names.map((name, index) => {
    const target = predictors.map((row) => row[index]);
    const others = predictors.map((row) =>
      row.filter((_, otherIndex) => otherIndex !== index),
    );
    const auxiliary = ols(others, target, { intercept: true });
    if (!auxiliary) {
      return { name, value: null };
    }
    const rSquared = Math.min(1, Math.max(0, auxiliary.rSquared));
    const remaining = 1 - rSquared;
    return {
      name,
      value:
        remaining <= 1e-12 ? Number.POSITIVE_INFINITY : 1 / remaining,
    };
  });
}

function buildEquation(
  outcomeName: string,
  predictorNames: string[],
  coefficients: number[],
): string {
  const terms = predictorNames.map((name, index) => {
    const coefficient = coefficients[index + 1];
    const sign = coefficient < 0 ? '-' : '+';
    return `${sign} ${formatDecimal(Math.abs(coefficient))} × ${name}`;
  });
  return `${outcomeName} = ${formatDecimal(coefficients[0])} ${terms.join(
    ' ',
  )}`;
}

function getDomain(values: number[], includeZero = false): [number, number] {
  let minimum = values[0];
  let maximum = values[0];
  for (const value of values) {
    if (value < minimum) {
      minimum = value;
    }
    if (value > maximum) {
      maximum = value;
    }
  }
  if (includeZero) {
    minimum = Math.min(minimum, 0);
    maximum = Math.max(maximum, 0);
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
  predictions: number[],
  residuals: number[],
): ChartGeometry {
  const [xMin, xMax] = getDomain(predictions);
  const [yMin, yMax] = getDomain(residuals, true);
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

function analyzeCsv(raw: string): AnalysisAttempt {
  const table = parseDelimitedTable(raw);

  if (table.errors.length > 0) {
    return {
      analysis: null,
      errors: table.errors,
      headers: table.headers,
      rowCount: table.rows.length,
    };
  }

  const headers = table.headers.map((header) => header.trim());
  const errors: string[] = [];

  if (headers.length < 3) {
    errors.push(
      '列が足りません。1列目を目的変数、続く2〜8列を説明変数にしてください。',
    );
  }
  if (headers.length > 9) {
    errors.push(
      '列が多すぎます。目的変数1列と説明変数2〜8列（合計3〜9列）にしてください。',
    );
  }
  if (headers.some((header) => header === '')) {
    errors.push(
      '空のヘッダーがあります。すべての列に名前を付けてください。',
    );
  }

  const seenHeaders = new Set<string>();
  for (const header of headers) {
    if (seenHeaders.has(header)) {
      errors.push(
        `ヘッダー「${header}」が重複しています。列名は一意にしてください。`,
      );
      break;
    }
    seenHeaders.add(header);
  }

  if (table.rows.length === 0) {
    errors.push('データ行を1行以上入力してください。');
  }

  if (errors.length > 0) {
    return {
      analysis: null,
      errors,
      headers,
      rowCount: table.rows.length,
    };
  }

  const invalidMessages: string[] = [];
  let invalidCount = 0;

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex];
    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      const cell = row[columnIndex] ?? '';
      if (cell === '' || !Number.isFinite(Number(cell))) {
        invalidCount += 1;
        if (invalidMessages.length < 5) {
          invalidMessages.push(
            `${rowIndex + 2}行目「${
              headers[columnIndex]
            }」の値「${cell}」は数値ではありません。`,
          );
        }
      }
    }
  }

  if (invalidCount > 0) {
    if (invalidCount > invalidMessages.length) {
      invalidMessages.push(
        'ほかにも数値でない値があります。すべてのセルを数値で入力してください。',
      );
    }
    return {
      analysis: null,
      errors: invalidMessages,
      headers,
      rowCount: table.rows.length,
    };
  }

  const columns = headers.map((_, columnIndex) =>
    table.rows.map((row) => Number(row[columnIndex])),
  );
  const outcome = columns[0];
  const predictors = table.rows.map((row) =>
    row.slice(1).map((cell) => Number(cell)),
  );
  const predictorNames = headers.slice(1);
  const predictorCount = predictorNames.length;
  const parameterCount = predictorCount + 1;
  const sampleSize = outcome.length;

  if (sampleSize <= parameterCount) {
    return {
      analysis: null,
      errors: [
        `サンプル数（${numberFormatter.format(
          sampleSize,
        )}）が推定する係数の数（${numberFormatter.format(
          parameterCount,
        )}）以下です。データ行を${numberFormatter.format(
          parameterCount + 1,
        )}行以上にしてください。`,
      ],
      headers,
      rowCount: sampleSize,
    };
  }

  const zeroVarianceColumns = headers.filter(
    (_, columnIndex) => variance(columns[columnIndex]) === 0,
  );

  if (zeroVarianceColumns.length > 0) {
    return {
      analysis: null,
      errors: [
        `次の列は値がすべて同じため、回帰分析を実行できません：${zeroVarianceColumns
          .map((name) => `「${name}」`)
          .join('、')}。各列に異なる値を含めてください。`,
      ],
      headers,
      rowCount: sampleSize,
    };
  }

  const result = ols(predictors, outcome, { intercept: true });

  if (!result) {
    return {
      analysis: null,
      errors: [
        '説明変数どうしが完全に共線（他の列の一次結合）であるため、行列が特異になり係数を推定できません。重複または線形従属の列を除いてください。',
      ],
      headers,
      rowCount: sampleSize,
    };
  }

  if (
    result.coefficients.some((value) => !Number.isFinite(value)) ||
    result.standardErrors.some((value) => !Number.isFinite(value)) ||
    !Number.isFinite(result.rSquared) ||
    !Number.isFinite(result.adjustedRSquared)
  ) {
    return {
      analysis: null,
      errors: [
        '数値が極端に大きいか小さく、計算結果が安定しませんでした。データの桁や列の組み合わせを確認してください。',
      ],
      headers,
      rowCount: sampleSize,
    };
  }

  const criticalT = inverseStudentT(0.975, result.df);
  const confidenceIntervals = result.coefficients.map(
    (coefficient, index) => ({
      lower: coefficient - criticalT * result.standardErrors[index],
      upper: coefficient + criticalT * result.standardErrors[index],
    }),
  );
  const vifs = computeVifs(predictors, predictorNames);
  const residuals = result.residuals;

  return {
    analysis: {
      outcomeName: headers[0],
      predictorNames,
      sampleSize,
      result,
      confidenceIntervals,
      vifs,
      residualStandardError: Math.sqrt(result.sse / result.df),
      residualMean: mean(residuals),
      residualMedian: quantile(residuals, 0.5),
      residualStandardDeviation: standardDeviation(residuals),
    },
    errors: [],
    headers,
    rowCount: sampleSize,
  };
}

export function MultipleRegression() {
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV);
  const attempt = analyzeCsv(csvInput);
  const analysis = attempt.analysis;
  const equation =
    analysis !== null
      ? buildEquation(
          analysis.outcomeName,
          analysis.predictorNames,
          analysis.result.coefficients,
        )
      : null;
  const chart =
    analysis !== null
      ? buildChartGeometry(
          analysis.result.predictions,
          analysis.result.residuals,
        )
      : null;
  const chartSummary =
    analysis !== null
      ? `サンプル数は${numberFormatter.format(
          analysis.sampleSize,
        )}、残差の平均は${formatDecimal(
          analysis.residualMean,
        )}、残差の中央値は${formatDecimal(
          analysis.residualMedian,
        )}、残差の標準偏差は${formatDecimal(
          analysis.residualStandardDeviation,
        )}です。`
      : '';
  const statusMessage =
    analysis !== null && equation !== null
      ? `サンプル数${numberFormatter.format(
          analysis.sampleSize,
        )}、R²は${metricFormatter.format(
          analysis.result.rSquared,
        )}、調整済みR²は${metricFormatter.format(
          analysis.result.adjustedRSquared,
        )}です。推定された回帰式は${equation}です。`
      : attempt.errors.length > 0
        ? attempt.errors.join(' ')
        : '有効なCSVを入力すると重回帰分析の結果を表示します。';

  const loadSample = () => {
    setCsvInput(SAMPLE_CSV);
  };

  const resetForm = () => {
    setCsvInput('');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]"
      aria-label="重回帰分析"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="multiple-regression-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="multiple-regression-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              CSVデータを入力
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            01 / 04
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          1行目はヘッダーです。1列目を目的変数、2〜8列目を説明変数として読み取ります。セルはすべて数値で入力してください。入力内容は自動で反映されます。
        </p>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="multiple-regression-csv"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
              {attempt.headers.length > 0
                ? `${numberFormatter.format(
                    attempt.headers.length,
                  )}列 / ${numberFormatter.format(attempt.rowCount)}行`
                : '未入力'}
            </span>
          </div>
          <textarea
            id="multiple-regression-csv"
            name="csvData"
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            rows={12}
            placeholder="例:\n売上,広告費,販促費,客数\n114.2,10,3,62"
            spellCheck={false}
            aria-invalid={attempt.errors.length > 0}
            aria-describedby={
              attempt.errors.length > 0
                ? 'multiple-regression-help multiple-regression-error'
                : 'multiple-regression-help'
            }
            className="field-paper mt-2 h-64 w-full resize-y rounded-sm px-3 py-3 text-xs leading-6 tabular-nums sm:text-sm"
          />
          <p
            id="multiple-regression-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            カンマ・タブ・セミコロン区切りに対応しています。サンプル数は説明変数の数+1より多くしてください。
          </p>
          {attempt.errors.length > 0 && (
            <div
              id="multiple-regression-error"
              role="alert"
              className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                入力内容を確認してください
              </p>
              <ul className="mt-1 space-y-1 text-[11px] leading-5 text-[var(--ink)]">
                {attempt.errors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}
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
        aria-labelledby="multiple-regression-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="multiple-regression-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              分析結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            02 / 04
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
            <dl className="grid grid-cols-2 gap-2">
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  サンプル数 n
                </dt>
                <dd className="font-editorial mt-1 text-xl leading-tight tabular-nums">
                  {numberFormatter.format(analysis.sampleSize)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  R²
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {metricFormatter.format(analysis.result.rSquared)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  調整済みR²
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {metricFormatter.format(analysis.result.adjustedRSquared)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  残差標準誤差
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatDecimal(analysis.residualStandardError)}
                </dd>
              </div>
            </dl>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                推定された回帰式
              </p>
              <p className="font-editorial mt-1 break-words text-base leading-7 tabular-nums sm:text-lg">
                {equation}
              </p>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                VIF（分散膨張係数）
              </p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {analysis.vifs.map((vif) => (
                  <li
                    key={vif.name}
                    className="flex min-w-0 items-center justify-between gap-3 border border-[var(--line)] px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="min-w-0 break-words">{vif.name}</span>
                    <span className="font-editorial shrink-0 tabular-nums">
                      {formatVif(vif.value)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                VIFが10を超えると多重共線性の影響が大きい目安です。
              </p>
            </div>

          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            {attempt.errors.length > 0
              ? '入力内容を確認すると分析結果を表示します。'
              : '有効なCSVを入力すると、回帰係数、R²、VIF、残差プロットなどを表示します。'}
          </p>
        )}

        <div
          role="note"
          className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            重回帰分析の前提
          </p>
          <ul className="mt-1 space-y-1 text-[11px] leading-6 text-[var(--ink)]">
            <li>
              線形性：目的変数と説明変数の関係が線形であることを仮定します。
            </li>
            <li>
              独立性：観測値どうしが互いに独立であることを仮定します。
            </li>
            <li>
              等分散性：残差の分散が予測値によらず一定であることを仮定します。
            </li>
            <li>
              正規性：残差が正規分布に従うことを仮定します。
            </li>
          </ul>
        </div>
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="multiple-regression-table-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Coefficients</p>
            <h2
              id="multiple-regression-table-heading"
              className="font-editorial mt-1 text-xl"
            >
              回帰係数と信頼区間
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            03 / 04
          </span>
        </div>

        {analysis !== null ? (
          <>
            <div
              className="mt-4 max-w-full overflow-x-auto border border-[var(--line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              role="region"
              aria-label="回帰係数の表"
              tabIndex={0}
            >
              <table className="w-full min-w-[620px] border-collapse text-left text-[11px] sm:text-xs">
                <caption className="sr-only">
                  回帰係数、標準誤差、t値、p値、95%信頼区間の一覧
                </caption>
                <thead>
                  <tr className="bg-[var(--paper-muted)]">
                    <th scope="col" className="px-3 py-2 font-bold">
                      変数
                    </th>
                    <th scope="col" className="px-3 py-2 font-bold">
                      係数
                    </th>
                    <th scope="col" className="px-3 py-2 font-bold">
                      標準誤差
                    </th>
                    <th scope="col" className="px-3 py-2 font-bold">
                      t値
                    </th>
                    <th scope="col" className="px-3 py-2 font-bold">
                      p値
                    </th>
                    <th scope="col" className="px-3 py-2 font-bold">
                      95%信頼区間
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[var(--line)]">
                    <th
                      scope="row"
                      className="px-3 py-2 font-bold text-[var(--ink)]"
                    >
                      切片
                    </th>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {formatDecimal(analysis.result.coefficients[0])}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {formatDecimal(analysis.result.standardErrors[0])}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {formatDecimal(analysis.result.tValues[0])}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {formatPValue(analysis.result.pValues[0])}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {formatInterval(analysis.confidenceIntervals[0])}
                    </td>
                  </tr>
                  {analysis.predictorNames.map((name, index) => {
                    const coefficientIndex = index + 1;
                    return (
                      <tr
                        key={name}
                        className="border-t border-[var(--line)]"
                      >
                        <th
                          scope="row"
                          className="min-w-0 px-3 py-2 font-bold text-[var(--ink)]"
                        >
                          {name}
                        </th>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                          {formatDecimal(
                            analysis.result.coefficients[coefficientIndex],
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                          {formatDecimal(
                            analysis.result.standardErrors[coefficientIndex],
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                          {formatDecimal(
                            analysis.result.tValues[coefficientIndex],
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                          {formatPValue(
                            analysis.result.pValues[coefficientIndex],
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                          {formatInterval(
                            analysis.confidenceIntervals[coefficientIndex],
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
              95%信頼区間は自由度
              {numberFormatter.format(analysis.result.df)}
              のt分布に基づいて計算しています。
            </p>
          </>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なCSVを入力すると、切片と各説明変数の係数・標準誤差・t値・p値・95%信頼区間を表示します。
          </p>
        )}
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="multiple-regression-chart-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Residuals</p>
            <h2
              id="multiple-regression-chart-heading"
              className="font-editorial mt-1 text-xl"
            >
              残差プロット
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            04 / 04
          </span>
        </div>

        {analysis !== null && chart !== null ? (
          <figure className="mt-4 min-w-0">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-labelledby="multiple-regression-chart-title"
              aria-describedby="multiple-regression-chart-desc"
              className="h-auto w-full"
            >
              <title id="multiple-regression-chart-title">
                予測値と残差の散布図
              </title>
              <desc id="multiple-regression-chart-desc">
                {`${chartSummary}横軸は予測値、縦軸は残差です。点線は残差0の位置を示します。`}
              </desc>
              <defs>
                <clipPath id="multiple-regression-chart-clip">
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
                        fontSize={12}
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
                        y={CHART_PADDING.top + PLOT_HEIGHT + 20}
                        textAnchor="middle"
                        fill="var(--ink-soft)"
                        fontSize={12}
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
              <line
                x1={CHART_PADDING.left}
                y1={chart.yScale(0)}
                x2={CHART_PADDING.left + PLOT_WIDTH}
                y2={chart.yScale(0)}
                stroke="var(--line-strong)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              <text
                x={CHART_PADDING.left + PLOT_WIDTH}
                y={CHART_PADDING.top + PLOT_HEIGHT + 38}
                textAnchor="end"
                fill="var(--ink)"
                fontSize={14}
              >
                予測値
              </text>
              <text
                x={CHART_PADDING.left - 48}
                y={CHART_PADDING.top + 4}
                fill="var(--ink)"
                fontSize={14}
              >
                残差
              </text>
              <g clipPath="url(#multiple-regression-chart-clip)">
                {analysis.result.predictions.map((predicted, index) => (
                  <circle
                    key={`residual-point-${index}`}
                    cx={chart.xScale(predicted)}
                    cy={chart.yScale(analysis.result.residuals[index])}
                    r={3.5}
                    fill="var(--accent)"
                    stroke="var(--paper)"
                    strokeWidth={1.2}
                  />
                ))}
              </g>
            </svg>
            <figcaption className="mt-2 flex flex-col gap-1 text-[11px] leading-5 text-[var(--ink-soft)] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span>
                横軸は予測値、縦軸は残差です。点線は残差0の位置を示します。
              </span>
              <span className="font-label text-[10px] tabular-nums">
                残差の平均 {formatDecimal(analysis.residualMean)} / 中央値{' '}
                {formatDecimal(analysis.residualMedian)} / 標準偏差{' '}
                {formatDecimal(analysis.residualStandardDeviation)}
              </span>
            </figcaption>
            <p className="sr-only">{chartSummary}</p>
          </figure>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なCSVを入力すると、予測値に対する残差の散布図を表示します。
          </p>
        )}
      </section>
    </section>
  );
}
