'use client';

import { useState } from 'react';
import {
  covariance,
  jacobiEigen,
  mean,
  parseDelimitedTable,
  standardDeviation,
} from '@/lib/statsCore';

const SAMPLE_CSV = `数学,理科,化学,国語,英語
72,68,70,55,58
65,62,60,52,55
80,78,76,60,62
58,55,57,70,68
90,88,86,65,70
62,60,58,75,72
75,72,74,58,60
68,65,63,66,64
85,82,84,62,66
55,58,56,80,78
78,75,77,54,57
70,68,66,72,70
88,85,87,58,63
60,57,59,68,66
82,80,78,64,67`;

const numberFormatter = new Intl.NumberFormat('ja-JP');
const loadingFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const eigenvalueFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const percentFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type ParsedCsv = {
  headers: string[];
  columns: number[][];
  rowCount: number;
  errors: string[];
};

type FactorAnalysisResult = {
  n: number;
  headers: string[];
  factorCount: number;
  eigenvalues: number[];
  explainedVariance: number[];
  cumulativeVariance: number[];
  loadings: number[][];
  communalities: number[];
  uniquenesses: number[];
  rotatedVariance: number[];
  rotatedExplainedVariance: number[];
  retainedVariance: number;
};

function formatLoading(value: number): string {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return loadingFormatter.format(normalized);
}

function formatEigenvalue(value: number): string {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return eigenvalueFormatter.format(normalized);
}

function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

function parseCsv(raw: string): ParsedCsv {
  if (raw.trim() === '') {
    return {
      headers: [],
      columns: [],
      rowCount: 0,
      errors: ['CSVデータを入力してください。'],
    };
  }

  const table = parseDelimitedTable(raw);
  const errors = [...table.errors];
  const headers = table.headers.map((header) =>
    header.trim().replace(/^\uFEFF/, ''),
  );
  const hasInvalidHeaders =
    headers.length < 3 ||
    headers.length > 10 ||
    headers.some((header) => header === '') ||
    new Set(headers).size !== headers.length;

  if (headers.length < 3 || headers.length > 10) {
    errors.push('ヘッダーは3〜10列の数値変数で入力してください。');
  }
  if (headers.some((header) => header === '')) {
    errors.push('空のヘッダーがあります。すべての変数に名前を付けてください。');
  }
  if (new Set(headers).size !== headers.length) {
    errors.push('ヘッダー名が重複しています。それぞれ異なる名前にしてください。');
  }

  if (hasInvalidHeaders) {
    return {
      headers,
      columns: headers.map(() => []),
      rowCount: 0,
      errors,
    };
  }

  const columns = headers.map<number[]>(() => []);
  let rowCount = 0;

  for (let index = 0; index < table.rows.length; index += 1) {
    const row = table.rows[index];
    if (row.length !== headers.length) {
      continue;
    }

    const cells = row.map((cell) => cell.trim());
    if (cells.some((cell) => cell === '')) {
      errors.push(`${index + 2}行目: すべての列に数値を入力してください。`);
      continue;
    }

    const values = cells.map((cell) => Number(cell));
    if (values.some((value) => !Number.isFinite(value))) {
      errors.push(`${index + 2}行目: すべての列を数値で入力してください。`);
      continue;
    }

    values.forEach((value, columnIndex) => {
      columns[columnIndex].push(value);
    });
    rowCount += 1;
  }

  if (rowCount < 10) {
    errors.push(
      `因子分析には10行以上の完全なデータが必要です（現在${numberFormatter.format(
        rowCount,
      )}行）。`,
    );
  }

  const constantVariables = headers.filter(
    (header, index) =>
      columns[index].length > 0 &&
      standardDeviation(columns[index]) <= 1e-12,
  );
  if (constantVariables.length > 0) {
    errors.push(
      `次の変数は値が一定のため分析できません: ${constantVariables.join('、')}。`,
    );
  }

  return { headers, columns, rowCount, errors };
}

function normalizeSigns(loadings: number[][]): number[][] {
  if (loadings.length === 0) {
    return loadings;
  }
  const factorCount = loadings[0].length;

  for (let factorIndex = 0; factorIndex < factorCount; factorIndex += 1) {
    let maxAbs = 0;
    let maxRow = 0;
    for (let rowIndex = 0; rowIndex < loadings.length; rowIndex += 1) {
      const abs = Math.abs(loadings[rowIndex][factorIndex]);
      if (abs > maxAbs) {
        maxAbs = abs;
        maxRow = rowIndex;
      }
    }
    if (maxAbs > 1e-12 && loadings[maxRow][factorIndex] < 0) {
      for (let rowIndex = 0; rowIndex < loadings.length; rowIndex += 1) {
        loadings[rowIndex][factorIndex] = -loadings[rowIndex][factorIndex];
      }
    }
  }

  return loadings;
}

function varimax(
  loadings: number[][],
  maxIterations = 100,
  tolerance = 1e-8,
): number[][] {
  const rowCount = loadings.length;
  const factorCount = loadings[0]?.length ?? 0;

  if (factorCount < 2) {
    return normalizeSigns(loadings.map((row) => [...row]));
  }

  const rowNorms = loadings.map((row) =>
    Math.sqrt(row.reduce((total, value) => total + value * value, 0)),
  );
  const rotated = loadings.map((row, rowIndex) =>
    rowNorms[rowIndex] > 1e-12
      ? row.map((value) => value / rowNorms[rowIndex])
      : [...row],
  );

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let maxAngle = 0;

    for (let first = 0; first < factorCount - 1; first += 1) {
      for (let second = first + 1; second < factorCount; second += 1) {
        let sumU = 0;
        let sumV = 0;
        let sumUV = 0;
        let sumSquaredDifference = 0;

        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
          const x = rotated[rowIndex][first];
          const y = rotated[rowIndex][second];
          const u = x * x - y * y;
          const v = 2 * x * y;
          sumU += u;
          sumV += v;
          sumUV += u * v;
          sumSquaredDifference += u * u - v * v;
        }

        const numerator =
          2 * sumUV - (2 * sumU * sumV) / Math.max(1, rowCount);
        const denominator =
          sumSquaredDifference -
          (sumU * sumU - sumV * sumV) / Math.max(1, rowCount);
        const angle = 0.25 * Math.atan2(numerator, denominator);

        if (Math.abs(angle) > maxAngle) {
          maxAngle = Math.abs(angle);
        }
        if (Math.abs(angle) < 1e-12) {
          continue;
        }

        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
          const x = rotated[rowIndex][first];
          const y = rotated[rowIndex][second];
          rotated[rowIndex][first] = cosine * x + sine * y;
          rotated[rowIndex][second] = -sine * x + cosine * y;
        }
      }
    }

    if (maxAngle < tolerance) {
      break;
    }
  }

  const restored = rotated.map((row, rowIndex) =>
    rowNorms[rowIndex] > 1e-12
      ? row.map((value) => value * rowNorms[rowIndex])
      : row,
  );

  return normalizeSigns(restored);
}

function buildResult(
  parsed: ParsedCsv,
  factorCount: number,
): FactorAnalysisResult | null {
  const variableCount = parsed.headers.length;
  if (parsed.rowCount < 10 || variableCount < 3 || variableCount > 10) {
    return null;
  }
  if (factorCount < 1 || factorCount > variableCount) {
    return null;
  }

  const standardizedColumns = parsed.columns.map((column) => {
    const average = mean(column);
    const deviation = standardDeviation(column);
    if (deviation <= 1e-12) {
      return column.map(() => 0);
    }
    return column.map((value) => (value - average) / deviation);
  });

  const correlation = Array.from({ length: variableCount }, (_, rowIndex) =>
    Array.from({ length: variableCount }, (_, columnIndex) =>
      rowIndex === columnIndex
        ? 1
        : covariance(
            standardizedColumns[rowIndex],
            standardizedColumns[columnIndex],
          ),
    ),
  );

  const eigen = jacobiEigen(correlation, 1e-10, 200);
  if (eigen === null) {
    return null;
  }

  const ordered = eigen.values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value);
  const eigenvalues = ordered.map((item) => Math.max(0, item.value));
  const eigenvectors = ordered.map((item) =>
    eigen.vectors.map((row) => row[item.index]),
  );

  const unrotatedLoadings = Array.from(
    { length: variableCount },
    (_, variableIndex) =>
      Array.from({ length: factorCount }, (_, factorIndex) => {
        return (
          eigenvectors[factorIndex][variableIndex] *
          Math.sqrt(eigenvalues[factorIndex])
        );
      }),
  );

  const loadings = varimax(unrotatedLoadings);
  const communalities = loadings.map((row) => {
    const value = row.reduce((total, loading) => total + loading * loading, 0);
    return Math.min(1, Math.max(0, value));
  });
  const uniquenesses = communalities.map((value) => Math.max(0, 1 - value));
  const explainedVariance = eigenvalues.map((value) => value / variableCount);
  const cumulativeVariance = explainedVariance.map((_, index) =>
    explainedVariance
      .slice(0, index + 1)
      .reduce((total, value) => total + value, 0),
  );
  const rotatedVariance = Array.from({ length: factorCount }, (_, factorIndex) =>
    loadings.reduce(
      (total, row) => total + row[factorIndex] * row[factorIndex],
      0,
    ),
  );
  const rotatedExplainedVariance = rotatedVariance.map(
    (value) => value / variableCount,
  );
  const retainedVariance = cumulativeVariance[factorCount - 1] ?? 0;

  return {
    n: parsed.rowCount,
    headers: parsed.headers,
    factorCount,
    eigenvalues,
    explainedVariance,
    cumulativeVariance,
    loadings,
    communalities,
    uniquenesses,
    rotatedVariance,
    rotatedExplainedVariance,
    retainedVariance,
  };
}

export function FactorAnalysis() {
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV);
  const [factorCount, setFactorCount] = useState(2);

  const parsed = parseCsv(csvInput);
  const maxFactors =
    parsed.headers.length >= 3 && parsed.headers.length <= 10
      ? Math.min(4, parsed.headers.length)
      : 4;
  const effectiveFactorCount = Math.min(factorCount, maxFactors);
  const canAnalyze = parsed.errors.length === 0;
  const result = canAnalyze
    ? buildResult(parsed, effectiveFactorCount)
    : null;
  const calculationError =
    canAnalyze && result === null
      ? '因子分析を計算できませんでした。データの内容を確認してください。'
      : null;
  const errors =
    calculationError !== null
      ? [...parsed.errors, calculationError]
      : parsed.errors;

  const statusMessage =
    result !== null
      ? `因子分析の結果です。${numberFormatter.format(
          result.n,
        )}行、${numberFormatter.format(
          result.headers.length,
        )}変数から${numberFormatter.format(
          result.factorCount,
        )}因子を抽出しました。累積寄与率は${formatPercent(
          result.retainedVariance,
        )}です。`
      : errors[0] ?? 'CSVデータを入力すると因子分析の結果を表示します。';

  const resetForm = () => {
    setCsvInput('');
    setFactorCount(2);
  };

  const loadSample = () => {
    setCsvInput(SAMPLE_CSV);
    setFactorCount(2);
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="因子分析"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="factor-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2 id="factor-form-heading" className="font-editorial mt-1 text-xl">
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
          1行目に3〜10個の変数名、2行目以降に数値を入力します。カンマ・タブ・セミコロン区切りに対応し、10行以上の完全なデータが必要です。入力内容は自動で反映されます。
        </p>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="factor-csv"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {numberFormatter.format(parsed.rowCount)}行
            </span>
          </div>
          <textarea
            id="factor-csv"
            name="csv"
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            rows={12}
            placeholder={`数学,理科,国語\n72,68,55\n65,62,52`}
            spellCheck={false}
            aria-invalid={errors.length > 0}
            aria-describedby={
              errors.length > 0
                ? 'factor-csv-help factor-csv-error'
                : 'factor-csv-help'
            }
            className="field-paper mt-2 h-64 w-full resize-y rounded-sm px-3 py-3 text-sm leading-6 tabular-nums"
          />
          <p
            id="factor-csv-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            例: 数学,理科,国語 のヘッダーに続けて、各サンプルの数値を入力します。
          </p>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="factor-count"
              className="text-sm font-bold text-[var(--ink)]"
            >
              抽出する因子数
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              1–{numberFormatter.format(maxFactors)}
            </span>
          </div>
          <select
            id="factor-count"
            name="factorCount"
            value={effectiveFactorCount}
            onChange={(event) => setFactorCount(Number(event.target.value))}
            aria-describedby="factor-count-help"
            className="field-paper mt-2 rounded-sm px-3 py-3 text-base"
          >
            {Array.from({ length: maxFactors }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value}>
                  {numberFormatter.format(value)}因子
                </option>
              ),
            )}
          </select>
          <p
            id="factor-count-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            選択できる上限は変数数と4のうち小さい方です。因子数を増やすほど、より多くの分散を説明できます。
          </p>
        </div>

        {errors.length > 0 && (
          <div
            id="factor-csv-error"
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
                ほか{numberFormatter.format(errors.length - 6)}件のエラーがあります。
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
        aria-labelledby="factor-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="factor-result-heading"
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

        {result !== null ? (
          <div className="mt-4 space-y-3">
            <dl className="grid grid-cols-2 gap-2">
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  抽出因子数
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {numberFormatter.format(result.factorCount)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  累積寄与率
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatPercent(result.retainedVariance)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  サンプル数
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {numberFormatter.format(result.n)}
                  <span className="text-sm"> 行</span>
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  変数数
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {numberFormatter.format(result.headers.length)}
                  <span className="text-sm"> 個</span>
                </dd>
              </div>
            </dl>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--ink)]">
                  回転後の因子負荷量
                </h3>
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  小数第2位
                </p>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[280px] border-collapse text-left text-[11px] tabular-nums">
                  <caption className="sr-only">
                    各変数の回転後の因子負荷量
                  </caption>
                  <thead>
                    <tr className="border-b border-[var(--line-strong)]">
                      <th
                        scope="col"
                        className="font-label py-1.5 pr-2 text-[9px] text-[var(--ink-soft)]"
                      >
                        変数
                      </th>
                      {Array.from(
                        { length: result.factorCount },
                        (_, index) => index + 1,
                      ).map((factor) => (
                        <th
                          key={factor}
                          scope="col"
                          className="font-label px-1.5 py-1.5 text-right text-[9px] text-[var(--ink-soft)]"
                        >
                          第{factor}因子
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.headers.map((header, rowIndex) => (
                      <tr
                        key={header}
                        className="border-b border-[var(--line)] last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="max-w-[110px] break-words py-1.5 pr-2 text-left font-bold text-[var(--ink)]"
                        >
                          {header}
                        </th>
                        {result.loadings[rowIndex].map(
                          (loading, factorIndex) => (
                            <td
                              key={`${header}-${factorIndex}`}
                              className="px-1.5 py-1.5 text-right"
                            >
                              {formatLoading(loading)}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--line-strong)]">
                      <th
                        scope="row"
                        className="py-1.5 pr-2 text-left font-bold text-[var(--ink-soft)]"
                      >
                        寄与率
                      </th>
                      {result.rotatedExplainedVariance.map(
                        (value, factorIndex) => (
                          <td
                            key={`rotated-variance-${factorIndex}`}
                            className="px-1.5 py-1.5 text-right"
                          >
                            {formatPercent(value)}
                          </td>
                        ),
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                因子負荷量は各変数と因子の関連の強さを表します。絶対値が大きいほど関連が強く、符号は因子の向きによるものです。
              </p>
            </div>

            <div
              role="note"
              className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                計算方法について
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                このツールは、標準化した変数の相関行列から主成分を抽出し、バリマックス回転を適用するブラウザ実装です。最尤法による完全な因子分析ではなく、共通性の推定方法や因子数の決定方法も限定的です。結果は探索的な参考として利用してください。
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            有効なCSVデータを入力すると、因子負荷量、共通性、独自性、固有値、寄与率を表示します。
          </p>
        )}
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="factor-communality-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Communality</p>
            <h2
              id="factor-communality-heading"
              className="font-editorial mt-1 text-xl"
            >
              共通性と独自性
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            03 / 04
          </span>
        </div>

        {result !== null ? (
          <div className="mt-4 min-w-0 overflow-x-auto">
            <table className="w-full min-w-[300px] border-collapse text-left text-[11px] tabular-nums">
              <caption className="sr-only">
                各変数の共通性と独自性
              </caption>
              <thead>
                <tr className="border-b border-[var(--line-strong)]">
                  <th
                    scope="col"
                    className="font-label py-1.5 pr-2 text-[9px] text-[var(--ink-soft)]"
                  >
                    変数
                  </th>
                  <th
                    scope="col"
                    className="font-label px-2 py-1.5 text-right text-[9px] text-[var(--ink-soft)]"
                  >
                    共通性
                  </th>
                  <th
                    scope="col"
                    className="font-label py-1.5 pl-2 text-right text-[9px] text-[var(--ink-soft)]"
                  >
                    独自性
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.headers.map((header, index) => (
                  <tr
                    key={header}
                    className="border-b border-[var(--line)] last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="max-w-[180px] break-words py-1.5 pr-2 text-left font-bold text-[var(--ink)]"
                    >
                      {header}
                    </th>
                    <td className="px-2 py-1.5 text-right">
                      {formatLoading(result.communalities[index])}
                    </td>
                    <td className="py-1.5 pl-2 text-right">
                      {formatLoading(result.uniquenesses[index])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なデータを入力すると、各変数の共通性と独自性を表示します。
          </p>
        )}

        <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          共通性は抽出した因子で説明できる分散の割合、独自性は1から共通性を引いた値です。値は小数第2位まで表示しています。
        </p>
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="factor-eigen-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Eigenvalue</p>
            <h2 id="factor-eigen-heading" className="font-editorial mt-1 text-xl">
              固有値と寄与率
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            04 / 04
          </span>
        </div>

        {result !== null ? (
          <>
            <div className="mt-4 min-w-0 overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-left text-[11px] tabular-nums">
                <caption className="sr-only">
                  相関行列の固有値と寄与率
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
                  {result.eigenvalues.map((value, index) => (
                    <tr
                      key={`eigen-${index}`}
                      className={`border-b border-[var(--line)] last:border-b-0 ${
                        index < result.factorCount
                          ? 'bg-[var(--paper-strong)] font-bold'
                          : ''
                      }`}
                    >
                      <th
                        scope="row"
                        className="py-1.5 pr-2 text-left font-bold text-[var(--ink)]"
                      >
                        第{index + 1}成分
                      </th>
                      <td className="px-2 py-1.5 text-right">
                        {formatEigenvalue(value)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatPercent(result.explainedVariance[index])}
                      </td>
                      <td className="py-1.5 pl-2 text-right">
                        {formatPercent(result.cumulativeVariance[index])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
              上位{numberFormatter.format(result.factorCount)}
              成分を因子として抽出しています。強調した行が抽出対象です。回転後も抽出した因子が説明する分散の合計は変わりません。
            </p>
          </>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なデータを入力すると、相関行列の固有値と寄与率を表示します。
          </p>
        )}

        <div
          role="note"
          className="mt-4 border border-[var(--line-strong)] bg-[var(--paper-strong)] p-4"
        >
          <p className="text-xs font-bold text-[var(--ink)]">前提と限界</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-6 text-[var(--ink-soft)]">
            <li>
              変数間の関係を線形な相関行列で要約できること、外れ値が極端に少ないことを前提としています。
            </li>
            <li>
              因子数は利用者が指定します。10行以上という条件は計算上の最低限で、標本が小さい場合は結果が不安定になります。
            </li>
            <li>
              バリマックス回転は因子間の相関を仮定しない直交回転です。因子間に相関がある場合は斜交回転が適することがあります。
            </li>
            <li>
              因子負荷量の解釈は変数の意味や理論に基づいて行い、因果関係や統計的な有意性を保証するものではありません。
            </li>
          </ul>
        </div>
      </section>
    </section>
  );
}
