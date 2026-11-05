'use client';

import { useState } from 'react';
import {
  covariance,
  mean,
  parseDelimitedTable,
  pFromT,
  pearson,
  standardDeviation,
  transpose,
} from '@/lib/statsCore';

const SAMPLE_CSV = `身長,体重,年齢,歩数
170,65,34,8200
165,58,29,9100
180,78,41,6400
158,52,27,10200
175,70,38,7300
162,55,31,8800
185,82,45,5900
168,60,33,8500
172,68,36,7800
160,54,28,9600
178,75,42,6800
166,59,30,9000`;

const numberFormatter = new Intl.NumberFormat('ja-JP');
const coefficientFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const pValueFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 5,
});
const axisFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 4,
});

const CHART_WIDTH = 620;
const CHART_HEIGHT = 360;
const CHART_PADDING = { top: 24, right: 24, bottom: 52, left: 64 };
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
const MAX_PAIRS = 3;
const MAX_ERRORS = 6;

type MatrixCell = {
  r: number | null;
  n: number;
  p: number | null;
};

type PairSummary = {
  xName: string;
  yName: string;
  r: number;
  n: number;
  p: number;
};

type Analysis = {
  headers: string[];
  rowCount: number;
  completeRowCount: number;
  missingCellCount: number;
  columns: number[][];
  zeroVarianceNames: string[];
  matrix: MatrixCell[][];
  positivePairs: PairSummary[];
  negativePairs: PairSummary[];
};

type AnalysisAttempt = {
  analysis: Analysis | null;
  errors: string[];
  headers: string[];
  rowCount: number;
  completeRowCount: number;
  missingCellCount: number;
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

type ScatterPoint = {
  x: number;
  y: number;
};

type ScatterData = {
  xName: string;
  yName: string;
  points: ScatterPoint[];
  geometry: ChartGeometry;
  r: number | null;
  p: number | null;
  n: number;
  slope: number | null;
  intercept: number | null;
  hasLine: boolean;
};

function formatCount(value: number): string {
  return numberFormatter.format(value);
}

function formatCoefficient(value: number): string {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return coefficientFormatter.format(normalized);
}

function formatPValue(value: number | null): string {
  if (value === null) {
    return '計算不可';
  }
  if (value < 0.0001) {
    return '< 0.0001';
  }
  if (value > 0.9999) {
    return '> 0.9999';
  }
  return pValueFormatter.format(value);
}

function formatDecimal(value: number): string {
  return decimalFormatter.format(Math.abs(value) < 1e-12 ? 0 : value);
}

function correlationPValue(r: number, n: number): number | null {
  if (n < 3) {
    return null;
  }
  const denominator = 1 - r * r;
  if (denominator <= 0) {
    return 0;
  }
  const t = r * Math.sqrt((n - 2) / denominator);
  return pFromT(t, n - 2);
}

function getHeatColor(r: number | null): string {
  if (r === null) {
    return 'transparent';
  }
  const alpha = 0.08 + Math.min(1, Math.abs(r)) * 0.42;
  return r >= 0
    ? `rgba(185, 28, 28, ${alpha.toFixed(3)})`
    : `rgba(37, 99, 235, ${alpha.toFixed(3)})`;
}

function hasZeroVariance(values: number[]): boolean {
  if (values.length === 0) {
    return true;
  }
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
  return (
    maximum - minimum <=
    Number.EPSILON *
      Math.max(1, Math.abs(minimum), Math.abs(maximum)) *
      16
  );
}

function getDomain(values: number[]): [number, number] {
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

function buildGeometry(
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

function buildScatter(
  columns: number[][],
  headers: string[],
  xIndex: number,
  yIndex: number,
): ScatterData | null {
  const xColumn = columns[xIndex];
  const yColumn = columns[yIndex];
  if (!xColumn || !yColumn || xIndex === yIndex) {
    return null;
  }

  const xValues: number[] = [];
  const yValues: number[] = [];
  const points: ScatterPoint[] = [];
  const length = Math.min(xColumn.length, yColumn.length);

  for (let index = 0; index < length; index += 1) {
    const x = xColumn[index];
    const y = yColumn[index];
    if (Number.isFinite(x) && Number.isFinite(y)) {
      xValues.push(x);
      yValues.push(y);
      points.push({ x, y });
    }
  }

  if (points.length < 2) {
    return null;
  }

  const meanX = mean(xValues);
  const meanY = mean(yValues);
  const sdX = standardDeviation(xValues);
  const sdY = standardDeviation(yValues);
  const cov = covariance(xValues, yValues);
  const xZeroVariance = hasZeroVariance(xValues);
  const yZeroVariance = hasZeroVariance(yValues);
  const pearsonValue =
    xZeroVariance || yZeroVariance
      ? null
      : pearson(xValues, yValues);
  const r =
    pearsonValue === null
      ? null
      : Math.max(-1, Math.min(1, pearsonValue));
  const p = r !== null ? correlationPValue(r, points.length) : null;
  const hasLine =
    r !== null &&
    !xZeroVariance &&
    !yZeroVariance &&
    sdX > 0 &&
    sdY > 0 &&
    points.length >= 3;
  const slope = hasLine ? cov / (sdX * sdX) : null;
  const intercept = slope !== null ? meanY - slope * meanX : null;

  return {
    xName: headers[xIndex],
    yName: headers[yIndex],
    points,
    geometry: buildGeometry(xValues, yValues),
    r,
    p,
    n: points.length,
    slope,
    intercept,
    hasLine,
  };
}

function shortenLabel(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, maxLength)}...`
    : value;
}

function formatEquation(slope: number, intercept: number): string {
  const normalizedIntercept =
    Math.abs(intercept) < 1e-12 ? 0 : intercept;
  const sign = normalizedIntercept < 0 ? '-' : '+';
  return `y = ${formatDecimal(slope)}x ${sign} ${formatDecimal(
    Math.abs(normalizedIntercept),
  )}`;
}

function analyzeCsv(raw: string): AnalysisAttempt {
  const table = parseDelimitedTable(raw.replace(/^\uFEFF/, ''));
  const rowCount = table.rows.length;
  const tableErrors = table.errors.filter(
    (error) =>
      !error.endsWith('行目の列数がヘッダーと一致しません。'),
  );

  if (tableErrors.length > 0) {
    return {
      analysis: null,
      errors: tableErrors,
      headers: table.headers,
      rowCount,
      completeRowCount: 0,
      missingCellCount: 0,
    };
  }

  const headers = table.headers.map((header) => header.trim());
  const errors: string[] = [];

  if (headers.length < 2) {
    errors.push('数値変数を2列以上にしてください。');
  }
  if (headers.length > 8) {
    errors.push('数値変数は8列までにしてください。');
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

  if (rowCount === 0) {
    errors.push('データ行を1行以上入力してください。');
  }

  if (errors.length > 0) {
    return {
      analysis: null,
      errors,
      headers,
      rowCount,
      completeRowCount: 0,
      missingCellCount: 0,
    };
  }

  const extraCellRows: number[] = [];
  const normalizedRows = table.rows.map((row, index) => {
    if (row.length > headers.length) {
      extraCellRows.push(index + 2);
      return row.slice(0, headers.length);
    }
    if (row.length < headers.length) {
      return [
        ...row,
        ...Array.from(
          { length: headers.length - row.length },
          () => '',
        ),
      ];
    }
    return row;
  });

  if (extraCellRows.length > 0) {
    return {
      analysis: null,
      errors: [
        `${extraCellRows
          .slice(0, 3)
          .map((lineNumber) => `${lineNumber}行目`)
          .join('、')}の列数がヘッダーより多くなっています。各行の列数をヘッダーに合わせてください。`,
      ],
      headers,
      rowCount,
      completeRowCount: 0,
      missingCellCount: 0,
    };
  }

  const numericMatrix: number[][] = normalizedRows.map((row) =>
    row.map((cell) => {
      const trimmed = cell.trim();
      if (trimmed === '') {
        return Number.NaN;
      }
      const value = Number(trimmed);
      return Number.isFinite(value) ? value : Number.NaN;
    }),
  );

  let completeRowCount = 0;
  let missingCellCount = 0;

  for (const row of numericMatrix) {
    let isComplete = true;
    for (const value of row) {
      if (!Number.isFinite(value)) {
        missingCellCount += 1;
        isComplete = false;
      }
    }
    if (isComplete) {
      completeRowCount += 1;
    }
  }

  if (completeRowCount < 4) {
    return {
      analysis: null,
      errors: [
        `すべての変数が数値で揃った行が${formatCount(
          completeRowCount,
        )}行あります。欠損のない行を4行以上にしてください。`,
        ...(missingCellCount > 0
          ? [
              `空欄または数値でないセルが${formatCount(
                missingCellCount,
              )}個あります。`,
            ]
          : []),
      ],
      headers,
      rowCount,
      completeRowCount,
      missingCellCount,
    };
  }

  const columns = transpose(numericMatrix);
  const zeroVarianceIndices = headers
    .map((_, index) => index)
    .filter((index) =>
      hasZeroVariance(
        columns[index].filter((value) => Number.isFinite(value)),
      ),
    );
  const zeroVarianceSet = new Set(zeroVarianceIndices);
  const zeroVarianceNames = zeroVarianceIndices.map(
    (index) => headers[index],
  );

  const matrix: MatrixCell[][] = headers.map((_, rowIndex) =>
    headers.map((_, columnIndex) => {
      if (rowIndex === columnIndex) {
        const validCount = columns[rowIndex].filter((value) =>
          Number.isFinite(value),
        ).length;
        return {
          r: zeroVarianceSet.has(rowIndex) ? null : 1,
          n: validCount,
          p: null,
        };
      }

      const xColumn = columns[rowIndex];
      const yColumn = columns[columnIndex];
      const xValues: number[] = [];
      const yValues: number[] = [];
      const length = Math.min(xColumn.length, yColumn.length);

      for (let index = 0; index < length; index += 1) {
        const x = xColumn[index];
        const y = yColumn[index];
        if (Number.isFinite(x) && Number.isFinite(y)) {
          xValues.push(x);
          yValues.push(y);
        }
      }

      const pearsonValue =
        zeroVarianceSet.has(rowIndex) ||
        zeroVarianceSet.has(columnIndex)
          ? null
          : pearson(xValues, yValues);
      const r =
        pearsonValue === null
          ? null
          : Math.max(-1, Math.min(1, pearsonValue));

      return {
        r,
        n: xValues.length,
        p:
          r !== null
            ? correlationPValue(r, xValues.length)
            : null,
      };
    }),
  );

  const pairs: PairSummary[] = [];
  for (
    let rowIndex = 0;
    rowIndex < headers.length;
    rowIndex += 1
  ) {
    for (
      let columnIndex = rowIndex + 1;
      columnIndex < headers.length;
      columnIndex += 1
    ) {
      const cell = matrix[rowIndex][columnIndex];
      if (cell.r !== null && cell.p !== null) {
        pairs.push({
          xName: headers[rowIndex],
          yName: headers[columnIndex],
          r: cell.r,
          n: cell.n,
          p: cell.p,
        });
      }
    }
  }

  const positivePairs = pairs
    .filter((pair) => pair.r > 0)
    .sort((a, b) => b.r - a.r)
    .slice(0, MAX_PAIRS);
  const negativePairs = pairs
    .filter((pair) => pair.r < 0)
    .sort((a, b) => a.r - b.r)
    .slice(0, MAX_PAIRS);

  return {
    analysis: {
      headers,
      rowCount,
      completeRowCount,
      missingCellCount,
      columns,
      zeroVarianceNames,
      matrix,
      positivePairs,
      negativePairs,
    },
    errors: [],
    headers,
    rowCount,
    completeRowCount,
    missingCellCount,
  };
}

function PairTable({
  pairs,
  caption,
}: {
  pairs: PairSummary[];
  caption: string;
}) {
  return (
    <table className="mt-2 w-full table-fixed border-collapse text-left text-[10px] sm:text-[11px]">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
          <th
            scope="col"
            className="w-[42%] py-1.5 pr-1 text-left font-bold"
          >
            ペア
          </th>
          <th
            scope="col"
            className="w-[18%] py-1.5 pr-1 text-right font-bold"
          >
            r
          </th>
          <th
            scope="col"
            className="w-[14%] py-1.5 pr-1 text-right font-bold"
          >
            n
          </th>
          <th
            scope="col"
            className="w-[26%] py-1.5 text-right font-bold"
          >
            p
          </th>
        </tr>
      </thead>
      <tbody>
        {pairs.map((pair) => (
          <tr
            key={`${pair.xName}-${pair.yName}`}
            className="border-b border-[var(--line)] last:border-b-0"
          >
            <th
              scope="row"
              className="min-w-0 break-words py-1.5 pr-1 text-left font-bold"
            >
              {pair.xName} × {pair.yName}
            </th>
            <td className="py-1.5 pr-1 text-right tabular-nums">
              {formatCoefficient(pair.r)}
            </td>
            <td className="py-1.5 pr-1 text-right tabular-nums">
              {formatCount(pair.n)}
            </td>
            <td className="py-1.5 text-right tabular-nums">
              {formatPValue(pair.p)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CorrelationAnalysis() {
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV);
  const [pairX, setPairX] = useState(0);
  const [pairY, setPairY] = useState(1);

  const attempt = analyzeCsv(csvInput);
  const analysis = attempt.analysis;
  const headerCount = analysis?.headers.length ?? 0;
  const selectedX =
    headerCount > 0 ? Math.min(pairX, headerCount - 1) : 0;
  const fallbackY =
    headerCount > 1 ? Math.min(pairY, headerCount - 1) : 0;
  const selectedY =
    headerCount > 1 && fallbackY === selectedX
      ? (selectedX + 1) % headerCount
      : fallbackY;
  const scatter =
    analysis !== null && headerCount > 1
      ? buildScatter(
          analysis.columns,
          analysis.headers,
          selectedX,
          selectedY,
        )
      : null;
  const equation =
    scatter !== null &&
    scatter.slope !== null &&
    scatter.intercept !== null
      ? formatEquation(scatter.slope, scatter.intercept)
      : null;
  const scatterSummary =
    scatter !== null
      ? `${scatter.xName}と${scatter.yName}の散布図です。データ数は${formatCount(
          scatter.n,
        )}組、相関係数rは${
          scatter.r !== null
            ? formatCoefficient(scatter.r)
            : '計算不可'
        }、p値は${formatPValue(scatter.p)}です。${
          equation !== null
            ? `回帰直線は${equation}です。`
            : '分散が0の変数を含むため回帰直線は表示していません。'
        }`
      : '';

  const statusMessage =
    analysis !== null
      ? `相関行列を表示しています。変数は${formatCount(
          analysis.headers.length,
        )}個、完全な行は${formatCount(
          analysis.completeRowCount,
        )}行です。${
          analysis.positivePairs.length > 0
            ? `最も強い正の相関は${analysis.positivePairs[0].xName}と${analysis.positivePairs[0].yName}のr=${formatCoefficient(analysis.positivePairs[0].r)}です。`
            : '正の相関があるペアはありません。'
        }${
          analysis.negativePairs.length > 0
            ? `最も強い負の相関は${analysis.negativePairs[0].xName}と${analysis.negativePairs[0].yName}のr=${formatCoefficient(analysis.negativePairs[0].r)}です。`
            : '負の相関があるペアはありません。'
        }`
      : attempt.errors.length > 0
        ? `入力エラーが${formatCount(
            attempt.errors.length,
          )}件あります。${attempt.errors[0]}`
        : 'CSVを入力すると相関行列と散布図を表示します。';

  const loadSample = () => {
    setCsvInput(SAMPLE_CSV);
    setPairX(0);
    setPairY(1);
  };

  const resetForm = () => {
    setCsvInput('');
    setPairX(0);
    setPairY(1);
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="相関分析"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="correlation-analysis-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="correlation-analysis-form-heading"
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
          1行目にヘッダー、2〜8列に数値変数、各行に1サンプルを置きます。カンマ・タブ・セミコロン区切りに対応しています。入力内容は自動で反映されます。
        </p>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="correlation-analysis-csv"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
              {attempt.headers.length > 0
                ? `${formatCount(attempt.headers.length)}列 / ${formatCount(
                    attempt.rowCount,
                  )}行`
                : '未入力'}
            </span>
          </div>
          <textarea
            id="correlation-analysis-csv"
            name="csvData"
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            rows={12}
            placeholder={`例:\n身長,体重,年齢,歩数\n170,65,34,8200`}
            spellCheck={false}
            aria-invalid={attempt.errors.length > 0}
            aria-describedby={
              attempt.errors.length > 0
                ? 'correlation-analysis-help correlation-analysis-error'
                : 'correlation-analysis-help'
            }
            className="field-paper mt-2 h-64 w-full resize-y rounded-sm px-3 py-3 text-xs leading-6 tabular-nums sm:text-sm"
          />
          <p
            id="correlation-analysis-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            空欄や数値でないセルは欠損として扱い、各ペアの計算では両方の値が揃った行だけを使用します。欠損のない行が4行以上必要です。
          </p>
          {attempt.errors.length > 0 && (
            <div
              id="correlation-analysis-error"
              role="alert"
              className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                入力内容を確認してください
              </p>
              <ul className="mt-1 list-disc space-y-1 break-words pl-4 text-[11px] leading-5 text-[var(--ink)]">
                {attempt.errors
                  .slice(0, MAX_ERRORS)
                  .map((error, index) => (
                    <li key={`${index}-${error}`}>{error}</li>
                  ))}
              </ul>
              {attempt.errors.length > MAX_ERRORS && (
                <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                  ほか
                  {formatCount(
                    attempt.errors.length - MAX_ERRORS,
                  )}
                  件のエラーがあります。
                </p>
              )}
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
        aria-labelledby="correlation-analysis-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="correlation-analysis-result-heading"
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
                  変数
                </dt>
                <dd className="font-editorial mt-1 text-xl leading-tight tabular-nums">
                  {formatCount(analysis.headers.length)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  完全な行
                </dt>
                <dd className="font-editorial mt-1 text-xl leading-tight tabular-nums">
                  {formatCount(analysis.completeRowCount)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  欠損セル
                </dt>
                <dd className="font-editorial mt-1 text-xl leading-tight tabular-nums">
                  {formatCount(analysis.missingCellCount)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  ペア数
                </dt>
                <dd className="font-editorial mt-1 text-xl leading-tight tabular-nums">
                  {formatCount(
                    (analysis.headers.length *
                      (analysis.headers.length - 1)) /
                      2,
                  )}
                </dd>
              </div>
            </dl>

            {analysis.zeroVarianceNames.length > 0 && (
              <div
                role="note"
                className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
              >
                <p className="text-xs font-bold text-[var(--accent)]">
                  分散が0の変数があります
                </p>
                <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                  {analysis.zeroVarianceNames
                    .map((name) => `「${name}」`)
                    .join('、')}
                  は値がすべて同じため、これらの変数を含むペアの相関係数とp値は計算できません。散布図では点のみ表示されます。
                </p>
              </div>
            )}

            {analysis.missingCellCount > 0 && (
              <p className="text-[10px] leading-5 text-[var(--ink-soft)]">
                空欄または数値でないセルが
                {formatCount(analysis.missingCellCount)}
                個あります。相関係数は、各ペアで両方の値が揃っている行だけを使って計算しています（ペアワイズ削除）。
              </p>
            )}

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                Strongest positive
              </p>
              <h3 className="font-editorial mt-1 text-base">
                正の相関が強いペア
              </h3>
              {analysis.positivePairs.length > 0 ? (
                <PairTable
                  pairs={analysis.positivePairs}
                  caption="正の相関が強いペアの一覧"
                />
              ) : (
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  正の相関があるペアは見つかりませんでした。
                </p>
              )}
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                Strongest negative
              </p>
              <h3 className="font-editorial mt-1 text-base">
                負の相関が強いペア
              </h3>
              {analysis.negativePairs.length > 0 ? (
                <PairTable
                  pairs={analysis.negativePairs}
                  caption="負の相関が強いペアの一覧"
                />
              ) : (
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  負の相関があるペアは見つかりませんでした。
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            {attempt.errors.length > 0
              ? '入力内容を確認すると分析結果を表示します。'
              : '有効なCSVを入力すると相関行列と散布図を表示します。'}
          </p>
        )}

        <div
          role="note"
          className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            結果の読み方
          </p>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            相関は2変数の直線的な関係の強さを示すもので、因果関係があることは意味しません。また、欠損値を含む場合はペアごとに使う行が異なるため、ペア間でサンプル数が変わり比較に影響することがあります。
          </p>
        </div>
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="correlation-analysis-matrix-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Matrix</p>
            <h2
              id="correlation-analysis-matrix-heading"
              className="font-editorial mt-1 text-xl"
            >
              相関行列
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
              aria-label="相関行列の表"
              tabIndex={0}
            >
              <table className="w-full min-w-max border-collapse text-center text-[10px] tabular-nums">
                <caption className="sr-only">
                  ピアソンの相関係数行列。各セルの上段は相関係数、中段はペアごとのサンプル数、下段は両側p値です。
                </caption>
                <thead>
                  <tr className="bg-[var(--paper-muted)]">
                    <th
                      scope="col"
                      className="sticky left-0 z-10 border-b border-r border-[var(--line)] bg-[var(--paper-muted)] px-2 py-2 text-left font-bold"
                    >
                      変数
                    </th>
                    {analysis.headers.map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="min-w-[74px] border-b border-[var(--line)] px-2 py-2 font-bold"
                      >
                        <span className="block max-w-[92px] break-words">
                          {header}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.headers.map((header, rowIndex) => (
                    <tr key={header}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-b border-r border-[var(--line)] bg-[var(--paper-strong)] px-2 py-2 text-left font-bold"
                      >
                        <span className="block max-w-[110px] break-words">
                          {header}
                        </span>
                      </th>
                      {analysis.matrix[rowIndex].map(
                        (cell, columnIndex) => (
                          <td
                            key={`${header}-${analysis.headers[columnIndex]}`}
                            className="border-b border-l border-[var(--line)] px-1.5 py-1.5 align-middle"
                            style={{
                              backgroundColor:
                                cell.r !== null
                                  ? getHeatColor(cell.r)
                                  : 'var(--paper-muted)',
                            }}
                          >
                            <span className="block text-[11px] font-bold leading-5">
                              {cell.r !== null
                                ? formatCoefficient(cell.r)
                                : '—'}
                            </span>
                            <span className="block text-[9px] leading-4 text-[var(--ink-soft)]">
                              n={formatCount(cell.n)}
                            </span>
                            <span className="block text-[9px] leading-4 text-[var(--ink-soft)]">
                              p={formatPValue(cell.p)}
                            </span>
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] leading-5 text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: getHeatColor(0.8) }}
                />
                正の相関
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: getHeatColor(-0.8) }}
                />
                負の相関
              </span>
              <span>色が濃いほど相関の絶対値が大きいことを示します。</span>
              <span className="sm:hidden">
                表は横にスクロールできます。
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
              セル内のnはそのペアで欠損値を除いたサンプル数、pは両側検定のp値です。分散が0の変数を含むペアは「—」と表示します。
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            有効なCSVを入力すると相関行列を表示します。
          </p>
        )}
      </section>

      <section
        className="paper-panel min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="correlation-analysis-scatter-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Chart</p>
            <h2
              id="correlation-analysis-scatter-heading"
              className="font-editorial mt-1 text-xl"
            >
              散布図と回帰直線
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            04 / 04
          </span>
        </div>

        {analysis !== null ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="correlation-analysis-pair-x"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  X軸の変数
                </label>
                <select
                  id="correlation-analysis-pair-x"
                  name="pairX"
                  value={selectedX}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (next === selectedY) {
                      setPairY(selectedX);
                    }
                    setPairX(next);
                  }}
                  className="field-paper mt-2 w-full min-w-0 rounded-sm px-3 py-3 text-base"
                >
                  {analysis.headers.map((header, index) => (
                    <option key={header} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="correlation-analysis-pair-y"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  Y軸の変数
                </label>
                <select
                  id="correlation-analysis-pair-y"
                  name="pairY"
                  value={selectedY}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (next === selectedX) {
                      setPairX(selectedY);
                    }
                    setPairY(next);
                  }}
                  className="field-paper mt-2 w-full min-w-0 rounded-sm px-3 py-3 text-base"
                >
                  {analysis.headers.map((header, index) => (
                    <option key={header} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {scatter !== null ? (
              <>
                <dl className="mt-4 grid grid-cols-3 gap-2">
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                    <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                      データ数 n
                    </dt>
                    <dd className="font-editorial mt-1 text-lg leading-tight tabular-nums">
                      {formatCount(scatter.n)}
                    </dd>
                  </div>
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                    <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                      相関係数 r
                    </dt>
                    <dd className="font-editorial mt-1 break-words text-lg leading-tight tabular-nums">
                      {scatter.r !== null
                        ? formatCoefficient(scatter.r)
                        : '計算不可'}
                    </dd>
                  </div>
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                    <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                      p値
                    </dt>
                    <dd className="font-editorial mt-1 break-words text-lg leading-tight tabular-nums">
                      {formatPValue(scatter.p)}
                    </dd>
                  </div>
                </dl>

                {scatter.hasLine && equation !== null ? (
                  <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    回帰直線：
                    <span className="font-bold tabular-nums">
                      {equation}
                    </span>
                  </p>
                ) : (
                  <p className="mt-2 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-[11px] leading-5 text-[var(--ink)]">
                    選択したペアに分散が0の変数が含まれるため、相関係数と回帰直線は計算できません。散布図の点のみ表示しています。
                  </p>
                )}

                <figure className="mt-4 min-w-0">
                  <svg
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                    role="img"
                    aria-labelledby="correlation-analysis-scatter-title"
                    aria-describedby="correlation-analysis-scatter-desc"
                    className="h-auto w-full max-w-full"
                  >
                    <title id="correlation-analysis-scatter-title">
                      {`${scatter.xName}と${scatter.yName}の散布図`}
                    </title>
                    <desc id="correlation-analysis-scatter-desc">
                      {scatterSummary}
                    </desc>
                    <defs>
                      <clipPath id="correlation-analysis-scatter-clip">
                        <rect
                          x={CHART_PADDING.left}
                          y={CHART_PADDING.top}
                          width={PLOT_WIDTH}
                          height={PLOT_HEIGHT}
                        />
                      </clipPath>
                    </defs>
                    <g>
                      {scatter.geometry.yTicks.map((tick, index) => {
                        const y = scatter.geometry.yScale(tick);
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
                              fontSize={12}
                            >
                              {axisFormatter.format(tick)}
                            </text>
                          </g>
                        );
                      })}
                      {scatter.geometry.xTicks.map((tick, index) => {
                        const x = scatter.geometry.xScale(tick);
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
                    <text
                      x={CHART_PADDING.left + PLOT_WIDTH}
                      y={CHART_PADDING.top + PLOT_HEIGHT + 42}
                      textAnchor="end"
                      fill="var(--ink)"
                      fontSize={13}
                    >
                      {shortenLabel(scatter.xName, 20)}
                    </text>
                    <text
                      x={CHART_PADDING.left - 46}
                      y={CHART_PADDING.top + 4}
                      fill="var(--ink)"
                      fontSize={13}
                    >
                      {shortenLabel(scatter.yName, 20)}
                    </text>
                    <g clipPath="url(#correlation-analysis-scatter-clip)">
                      {scatter.hasLine &&
                        scatter.slope !== null &&
                        scatter.intercept !== null && (
                          <line
                            x1={scatter.geometry.xScale(
                              scatter.geometry.xMin,
                            )}
                            y1={scatter.geometry.yScale(
                              scatter.slope * scatter.geometry.xMin +
                                scatter.intercept,
                            )}
                            x2={scatter.geometry.xScale(
                              scatter.geometry.xMax,
                            )}
                            y2={scatter.geometry.yScale(
                              scatter.slope * scatter.geometry.xMax +
                                scatter.intercept,
                            )}
                            stroke="var(--accent)"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                          />
                        )}
                      {scatter.points.map((point, index) => (
                        <circle
                          key={`point-${index}`}
                          cx={scatter.geometry.xScale(point.x)}
                          cy={scatter.geometry.yScale(point.y)}
                          r={4.2}
                          fill="var(--accent)"
                          stroke="var(--paper)"
                          strokeWidth={1.5}
                        />
                      ))}
                    </g>
                  </svg>
                  <figcaption className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    点は観測値、直線は最小二乗回帰直線です。点が多い場合は重なって見えることがあります。
                  </figcaption>
                </figure>
              </>
            ) : (
              <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
                選択したペアの有効なデータが不足しているため、散布図を表示できません。
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            有効なCSVを入力すると散布図を表示します。
          </p>
        )}
      </section>
    </section>
  );
}
