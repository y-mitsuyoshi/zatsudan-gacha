'use client';

import { useState } from 'react';
import {
  covariance,
  jacobiEigen,
  mean,
  multiplyMatrices,
  parseDelimitedTable,
  standardDeviation,
  transpose,
} from '@/lib/statsCore';

const SAMPLE_CSV = `数学,理科,国語,英語
78,82,65,70
85,88,70,74
62,60,72,68
90,92,78,82
70,68,80,76
95,96,85,88
55,58,62,60
88,84,74,80
76,80,68,72
68,72,75,70
82,78,90,86
91,89,83,87`;

const numberFormatter = new Intl.NumberFormat('ja-JP');
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 6,
});
const metricFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 4,
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
const CHART_HEIGHT = 360;
const CHART_PADDING = { top: 20, right: 20, bottom: 48, left: 64 };
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

type MatrixMode = 'correlation' | 'covariance';

const MATRIX_MODE_OPTIONS: { value: MatrixMode; label: string }[] = [
  { value: 'correlation', label: '相関行列' },
  { value: 'covariance', label: '共分散行列' },
];

type PcaComponent = {
  eigenvalue: number;
  explainedVariance: number;
  cumulativeVariance: number;
  eigenvector: number[];
  loadings: number[];
};

type PcaResult = {
  n: number;
  variableNames: string[];
  mode: MatrixMode;
  components: PcaComponent[];
  scores: number[][];
};

type AnalysisAttempt = {
  result: PcaResult | null;
  errors: string[];
  headers: string[];
  rowCount: number;
};

type Axis = {
  min: number;
  max: number;
  ticks: number[];
  scale: (value: number) => number;
};

type ScoreChart = {
  x: Axis;
  y: Axis;
};

function formatDecimal(value: number): string {
  return decimalFormatter.format(Math.abs(value) < 1e-12 ? 0 : value);
}

function formatMetric(value: number): string {
  return metricFormatter.format(Math.abs(value) < 0.00005 ? 0 : value);
}

function formatPercent(value: number): string {
  return percentFormatter.format(Math.abs(value) < 0.0005 ? 0 : value);
}

function getDomain(values: number[], includeZero: boolean): [number, number] {
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

function buildAxis(
  values: number[],
  includeZero: boolean,
  start: number,
  size: number,
): Axis {
  const [min, max] = getDomain(values, includeZero);
  const range = max - min;
  return {
    min,
    max,
    ticks: getTicks(min, max),
    scale: (value: number) => start + ((value - min) / range) * size,
  };
}

function buildScoreChart(scores: number[][]): ScoreChart | null {
  if (scores.length === 0) {
    return null;
  }
  const pc1 = scores.map((score) => score[0]);
  const pc2 = scores.map((score) => score[1] ?? 0);
  return {
    x: buildAxis(pc1, true, CHART_PADDING.left, PLOT_WIDTH),
    y: buildAxis(
      pc2,
      true,
      CHART_PADDING.top + PLOT_HEIGHT,
      -PLOT_HEIGHT,
    ),
  };
}

function analyzeCsv(raw: string, mode: MatrixMode): AnalysisAttempt {
  const table = parseDelimitedTable(raw);

  if (table.errors.length > 0) {
    return {
      result: null,
      errors: table.errors,
      headers: table.headers,
      rowCount: table.rows.length,
    };
  }

  const headers = table.headers.map((header) =>
    header.trim().replace(/^\uFEFF/, ''),
  );
  const errors: string[] = [];

  if (headers.length < 2 || headers.length > 8) {
    errors.push('ヘッダーは2〜8列で入力してください。');
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

  if (table.rows.length < 5) {
    errors.push(
      `主成分分析には5行以上のデータが必要です（現在${numberFormatter.format(
        table.rows.length,
      )}行）。`,
    );
  }

  if (errors.length > 0) {
    return {
      result: null,
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
      result: null,
      errors: invalidMessages,
      headers,
      rowCount: table.rows.length,
    };
  }

  const rowCount = table.rows.length;
  const columns = headers.map((_, columnIndex) =>
    table.rows.map((row) => Number(row[columnIndex])),
  );
  const zeroVarianceColumns = headers.filter(
    (_, columnIndex) => standardDeviation(columns[columnIndex]) <= 1e-12,
  );

  if (zeroVarianceColumns.length > 0) {
    return {
      result: null,
      errors: [
        `次の列は値がすべて同じため、主成分分析を実行できません：${zeroVarianceColumns
          .map((name) => `「${name}」`)
          .join('、')}。各列に異なる値を含めてください。`,
      ],
      headers,
      rowCount,
    };
  }

  const means = columns.map((column) => mean(column));
  const deviations = columns.map((column) => standardDeviation(column));
  const centered = columns[0].map((_, rowIndex) =>
    columns.map(
      (column, columnIndex) => column[rowIndex] - means[columnIndex],
    ),
  );
  const standardized = columns[0].map((_, rowIndex) =>
    columns.map(
      (column, columnIndex) =>
        (column[rowIndex] - means[columnIndex]) / deviations[columnIndex],
    ),
  );

  let matrix: number[][];

  if (mode === 'correlation') {
    const transposed = transpose(standardized);
    const products = multiplyMatrices(transposed, standardized);
    matrix = products.map((row) =>
      row.map((value) => value / (rowCount - 1)),
    );
  } else {
    matrix = columns.map((xValues) =>
      columns.map((yValues) => covariance(xValues, yValues)),
    );
  }

  const eigen = jacobiEigen(matrix);

  if (eigen === null || !eigen.values.every(Number.isFinite)) {
    return {
      result: null,
      errors: [
        '固有値と固有ベクトルを計算できませんでした。データの値や列の組み合わせを確認してください。',
      ],
      headers,
      rowCount,
    };
  }

  const ordered = eigen.values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value);
  const total = ordered.reduce(
    (sum, item) => sum + Math.max(0, item.value),
    0,
  );

  if (!(total > 0)) {
    return {
      result: null,
      errors: [
        '固有値の合計が0のため、寄与率を計算できません。各列に異なる値を含めてください。',
      ],
      headers,
      rowCount,
    };
  }

  let cumulative = 0;
  const components: PcaComponent[] = ordered.map(({ value, index }) => {
    const eigenvalue = Math.max(0, value);
    const explainedVariance = eigenvalue / total;
    cumulative += explainedVariance;
    let eigenvector = eigen.vectors.map((row) => row[index]);
    let largestIndex = 0;
    for (let vectorIndex = 1; vectorIndex < eigenvector.length; vectorIndex += 1) {
      if (
        Math.abs(eigenvector[vectorIndex]) >
        Math.abs(eigenvector[largestIndex])
      ) {
        largestIndex = vectorIndex;
      }
    }
    if (eigenvector[largestIndex] < 0) {
      eigenvector = eigenvector.map((value) => -value);
    }
    return {
      eigenvalue,
      explainedVariance,
      cumulativeVariance: Math.min(1, cumulative),
      eigenvector,
      loadings: eigenvector.map(
        (value) => value * Math.sqrt(eigenvalue),
      ),
    };
  });

  const scoreBase = mode === 'correlation' ? standardized : centered;
  const scores = scoreBase.map((row) =>
    components.map((component) =>
      row.reduce(
        (sum, value, index) => sum + value * component.eigenvector[index],
        0,
      ),
    ),
  );

  return {
    result: {
      n: rowCount,
      variableNames: headers,
      mode,
      components,
      scores,
    },
    errors: [],
    headers,
    rowCount,
  };
}

export function PrincipalComponentAnalysis() {
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV);
  const [matrixMode, setMatrixMode] = useState<MatrixMode>('correlation');

  const attempt = analyzeCsv(csvInput, matrixMode);
  const result = attempt.result;
  const primaryComponent = result !== null ? result.components[0] : null;
  const secondaryComponent =
    result !== null && result.components.length > 1
      ? result.components[1]
      : null;
  const chart = result !== null ? buildScoreChart(result.scores) : null;
  const modeLabel =
    result !== null && result.mode === 'covariance'
      ? '共分散行列（中心化）'
      : '相関行列（標準化）';

  const statusMessage =
    result !== null && primaryComponent !== null
      ? `サンプル数${numberFormatter.format(
          result.n,
        )}、変数${numberFormatter.format(
          result.variableNames.length,
        )}個。第1主成分の寄与率は${formatPercent(
          primaryComponent.explainedVariance,
        )}、第2主成分までの累積寄与率は${formatPercent(
          (secondaryComponent ?? primaryComponent).cumulativeVariance,
        )}です。`
      : attempt.errors.length > 0
        ? attempt.errors.join(' ')
        : '有効なCSVデータを入力すると主成分分析の結果を表示します。';

  const chartSummary =
    result !== null && primaryComponent !== null
      ? `横軸は第1主成分、縦軸は第2主成分です。第1主成分の寄与率は${formatPercent(
          primaryComponent.explainedVariance,
        )}、第2主成分までの累積寄与率は${formatPercent(
          (secondaryComponent ?? primaryComponent).cumulativeVariance,
        )}です。`
      : '';

  const loadSample = () => {
    setCsvInput(SAMPLE_CSV);
    setMatrixMode('correlation');
  };

  const resetForm = () => {
    setCsvInput('');
    setMatrixMode('correlation');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      aria-label="主成分分析"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="pca-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2 id="pca-form-heading" className="font-editorial mt-1 text-xl">
              CSVデータを入力
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            01 / 05
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          1行目はヘッダーです。2〜8列の数値変数を読み取り、5行以上のサンプルを解析します。セルはすべて数値で入力してください。入力内容は自動で反映されます。
        </p>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="pca-csv"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
              {numberFormatter.format(attempt.rowCount)}行
            </span>
          </div>
          <textarea
            id="pca-csv"
            name="csv"
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            rows={12}
            placeholder={`数学,理科,国語,英語\n78,82,65,70\n85,88,70,74`}
            spellCheck={false}
            aria-invalid={attempt.errors.length > 0}
            aria-describedby={
              attempt.errors.length > 0 ? 'pca-csv-help pca-csv-error' : 'pca-csv-help'
            }
            className="field-paper mt-2 h-64 w-full resize-y rounded-sm px-3 py-3 text-sm leading-6 tabular-nums"
          />
          <p
            id="pca-csv-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            例: 1行目に変数名、2行目以降にサンプルごとの数値を入力します。カンマ・タブ・セミコロン区切りに対応しています。
          </p>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[var(--ink)]">
            使用する行列
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {MATRIX_MODE_OPTIONS.map((option) => {
              const isSelected = matrixMode === option.value;
              return (
                <label
                  key={option.value}
                  className={`paper-chip flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-sm px-2 py-2.5 text-center text-xs font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="pca-matrix-mode"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setMatrixMode(option.value)}
                    className="sr-only"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]">
            相関行列は各変数を標準化し、共分散行列は平均のみを引いて計算します。尺度が異なる変数には相関行列がおすすめです。
          </p>
        </fieldset>

        {attempt.errors.length > 0 && (
          <div
            id="pca-csv-error"
            role="alert"
            className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              入力内容を確認してください
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-5 text-[var(--ink)]">
              {attempt.errors.slice(0, 6).map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
            {attempt.errors.length > 6 && (
              <p className="mt-1 text-[11px] leading-5 text-[var(--ink)]">
                ほか{numberFormatter.format(attempt.errors.length - 6)}件のエラーがあります。
              </p>
            )}
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
        aria-labelledby="pca-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="pca-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              分析結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            02 / 05
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

        {result !== null && primaryComponent !== null ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Explained Variance
                  </p>
                  <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums sm:text-4xl">
                    {formatPercent(primaryComponent.explainedVariance)}
                  </p>
                  <p className="mt-3 inline-block border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-xs font-bold">
                    第1主成分の寄与率
                  </p>
                </div>
                <p className="font-label shrink-0 text-right text-[9px] text-[var(--ink-soft)]">
                  PC1
                  <br />
                  PC2
                </p>
              </div>
              <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                第2主成分までの累積寄与率:{' '}
                {formatPercent(
                  (secondaryComponent ?? primaryComponent).cumulativeVariance,
                )}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-2">
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  固有値（PC1）
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatDecimal(primaryComponent.eigenvalue)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  累積寄与率（PC1〜PC2）
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatPercent(
                    (secondaryComponent ?? primaryComponent)
                      .cumulativeVariance,
                  )}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  使用した行列
                </dt>
                <dd className="mt-1 break-words text-xs font-bold leading-5">
                  {modeLabel}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  データ
                </dt>
                <dd className="mt-1 break-words text-xs font-bold leading-5 tabular-nums">
                  {numberFormatter.format(result.n)}行 /{' '}
                  {numberFormatter.format(result.variableNames.length)}変数
                </dd>
              </div>
            </dl>

            <div
              role="note"
              className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                結果の読み方
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                寄与率は各主成分がデータ全体の分散のうち何割を説明するかを示します。第1・第2主成分の累積寄与率が高い場合は、PC1とPC2の散布図でサンプル間の大まかな位置関係を把握できます。負荷量は固有ベクトルに固有値の平方根を掛けた値で、絶対値が大きい変数ほどその主成分の解釈に寄与します。主成分の符号は計算上都合のよい向きに揃えているため、正負は相対的に解釈してください。主成分分析は変数間の関連を要約する手法であり、因果関係を示すものではありません。
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            有効なCSVデータを入力すると、寄与率、固有値、負荷量、主成分得点を表示します。
          </p>
        )}

        <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          相関行列を使う場合は各変数を標準化し、共分散行列を使う場合は平均を引いた値で計算します。寄与率は選択した行列の固有値の合計に対する割合です。
        </p>
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="pca-eigen-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Scree / Eigenvalues</p>
            <h2
              id="pca-eigen-heading"
              className="font-editorial mt-1 text-xl"
            >
              固有値と寄与率
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            03 / 05
          </span>
        </div>

        {result !== null ? (
          <figure className="mt-4 min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-left text-[11px] tabular-nums">
                <caption className="sr-only">
                  各主成分の固有値・寄与率・累積寄与率
                </caption>
                <thead>
                  <tr className="border-b border-[var(--line-strong)]">
                    <th
                      scope="col"
                      className="font-label py-1.5 pr-2 text-[9px] text-[var(--ink-soft)]"
                    >
                      成分
                    </th>
                    <th
                      scope="col"
                      className="font-label px-2 py-1.5 text-right text-[9px] text-[var(--ink-soft)]"
                    >
                      固有値
                    </th>
                    <th
                      scope="col"
                      className="font-label px-2 py-1.5 text-right text-[9px] text-[var(--ink-soft)]"
                    >
                      寄与率
                    </th>
                    <th
                      scope="col"
                      className="font-label py-1.5 pl-2 text-right text-[9px] text-[var(--ink-soft)]"
                    >
                      累積寄与率
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.components.map((component, index) => (
                    <tr
                      key={`pca-component-${index}`}
                      className="border-b border-[var(--line)] last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="py-1.5 pr-2 text-left font-bold text-[var(--ink)]"
                      >
                        第{index + 1}主成分
                      </th>
                      <td className="px-2 py-1.5 text-right">
                        {formatDecimal(component.eigenvalue)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatPercent(component.explainedVariance)}
                      </td>
                      <td className="py-1.5 pl-2 text-right">
                        {formatPercent(component.cumulativeVariance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figcaption className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              固有値は各主成分が説明する分散の大きさ、寄与率は固有値の合計に対する割合です。累積寄与率は第1主成分からその主成分までの合計を示します。
            </figcaption>
          </figure>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なデータを入力すると、各主成分の固有値と寄与率を表示します。
          </p>
        )}
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="pca-loadings-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Loadings</p>
            <h2
              id="pca-loadings-heading"
              className="font-editorial mt-1 text-xl"
            >
              負荷量（第1〜3主成分）
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            04 / 05
          </span>
        </div>

        {result !== null ? (
          <div className="mt-4 min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-left text-[11px] tabular-nums">
                <caption className="sr-only">
                  第1〜3主成分の負荷量
                </caption>
                <thead>
                  <tr className="border-b border-[var(--line-strong)]">
                    <th
                      scope="col"
                      className="font-label py-1.5 pr-2 text-[9px] text-[var(--ink-soft)]"
                    >
                      変数
                    </th>
                    {result.components.slice(0, 3).map((_, index) => (
                      <th
                        key={`pca-loading-header-${index}`}
                        scope="col"
                        className="font-label px-2 py-1.5 text-right text-[9px] text-[var(--ink-soft)]"
                      >
                        第{index + 1}主成分
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.variableNames.map((variable, rowIndex) => (
                    <tr
                      key={`pca-loading-row-${rowIndex}`}
                      className="border-b border-[var(--line)] last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="max-w-[7rem] break-words py-1.5 pr-2 text-left font-bold text-[var(--ink)]"
                      >
                        {variable}
                      </th>
                      {result.components.slice(0, 3).map((component, index) => (
                        <td
                          key={`pca-loading-value-${rowIndex}-${index}`}
                          className="px-2 py-1.5 text-right"
                        >
                          {formatMetric(component.loadings[rowIndex])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              負荷量は固有ベクトルに固有値の平方根を掛けた値です。相関行列を使った場合、変数と主成分の相関に相当します。絶対値が大きい変数ほど、その主成分の解釈に寄与します。
            </p>
          </div>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なデータを入力すると、第1〜3主成分の負荷量を表示します。
          </p>
        )}
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="pca-plot-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Score Plot</p>
            <h2
              id="pca-plot-heading"
              className="font-editorial mt-1 text-xl"
            >
              主成分得点の散布図
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            05 / 05
          </span>
        </div>

        {result !== null && chart !== null && primaryComponent !== null ? (
          <figure className="mt-4 min-w-0">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-labelledby="pca-chart-title"
              aria-describedby="pca-chart-desc"
              className="h-auto w-full"
            >
              <title id="pca-chart-title">
                第1主成分と第2主成分の散布図
              </title>
              <desc id="pca-chart-desc">{chartSummary}</desc>
              <defs>
                <clipPath id="pca-chart-clip">
                  <rect
                    x={CHART_PADDING.left}
                    y={CHART_PADDING.top}
                    width={PLOT_WIDTH}
                    height={PLOT_HEIGHT}
                  />
                </clipPath>
              </defs>
              <g>
                {chart.y.ticks.map((tick) => {
                  const y = chart.y.scale(tick);
                  return (
                    <g key={`pca-y-tick-${tick}`}>
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
                {chart.x.ticks.map((tick) => {
                  const x = chart.x.scale(tick);
                  return (
                    <g key={`pca-x-tick-${tick}`}>
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
                y1={chart.y.scale(0)}
                x2={CHART_PADDING.left + PLOT_WIDTH}
                y2={chart.y.scale(0)}
                stroke="var(--line-strong)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              <line
                x1={chart.x.scale(0)}
                y1={CHART_PADDING.top}
                x2={chart.x.scale(0)}
                y2={CHART_PADDING.top + PLOT_HEIGHT}
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
                第1主成分
              </text>
              <text
                x={CHART_PADDING.left - 52}
                y={CHART_PADDING.top + 4}
                fill="var(--ink)"
                fontSize={14}
              >
                第2主成分
              </text>
              <g clipPath="url(#pca-chart-clip)">
                {result.scores.map((score, index) => (
                  <circle
                    key={`pca-score-${index}`}
                    cx={Math.round(chart.x.scale(score[0]) * 1000) / 1000}
                    cy={Math.round(chart.y.scale(score[1] ?? 0) * 1000) / 1000}
                    r={3.5}
                    fill="var(--accent)"
                    stroke="var(--paper)"
                    strokeWidth={1.2}
                  >
                    <title>
                      {`サンプル${numberFormatter.format(
                        index + 1,
                      )}: PC1 ${formatDecimal(score[0])}, PC2 ${formatDecimal(
                        score[1] ?? 0,
                      )}`}
                    </title>
                  </circle>
                ))}
              </g>
            </svg>
            <figcaption className="mt-2 flex flex-col gap-1 text-[11px] leading-5 text-[var(--ink-soft)] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span>
                横軸は第1主成分得点、縦軸は第2主成分得点です。点線は各主成分得点が0の位置を示します。
              </span>
              <span className="font-label text-[10px] tabular-nums">
                PC1 {formatPercent(primaryComponent.explainedVariance)} / PC2{' '}
                {secondaryComponent !== null
                  ? formatPercent(secondaryComponent.explainedVariance)
                  : '算出不可'}
              </span>
            </figcaption>
            <p className="sr-only">{chartSummary}</p>
          </figure>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なデータを入力すると、PC1とPC2の主成分得点を散布図で表示します。
          </p>
        )}
      </section>
    </section>
  );
}
