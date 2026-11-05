'use client';

import { useState } from 'react';
import {
  invert,
  mean,
  multiplyMatrices,
  multiplyMatrixVector,
  normalCdf,
  parseDelimitedTable,
  transpose,
  type Matrix,
} from '@/lib/statsCore';

const EXAMPLE_CSV = `購入,年齢,訪問回数
1,59,4
1,24,3
1,24,3
1,44,5
0,26,2
1,40,2
1,58,4
0,24,4
1,48,3
1,36,4
1,38,2
1,51,5
1,21,2
1,42,2
1,55,3
1,55,2
1,22,4
1,32,4
0,22,0
1,58,4
0,38,3
1,47,2
1,47,2
1,30,4
0,27,2
1,41,0
1,27,4
0,33,1
1,30,2
1,31,1
0,46,1
0,25,2`;

const integerFormatter = new Intl.NumberFormat('ja-JP');
const fixedThreeFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const fixedFourFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const percentFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const probabilityFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type ParsedLogisticData = {
  outcomeName: string;
  predictorNames: string[];
  y: number[];
  predictors: Matrix;
};

type ParseOutcome = {
  data: ParsedLogisticData | null;
  errors: string[];
};

type ConfusionMatrix = {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
};

type LogisticFit = {
  coefficients: number[];
  standardErrors: number[];
  zValues: number[];
  pValues: number[];
  oddsRatios: number[];
  oddsRatioLow: number[];
  oddsRatioHigh: number[];
  logLikelihood: number;
  nullLogLikelihood: number;
  pseudoRSquared: number;
  accuracy: number;
  confusion: ConfusionMatrix;
  probabilities: number[];
  iterations: number;
  converged: boolean;
  separation: boolean;
  n: number;
  parameterCount: number;
};

type FitOutcome = {
  fit: LogisticFit | null;
  error: string | null;
};

function parseLogisticData(raw: string): ParseOutcome {
  const table = parseDelimitedTable(raw);
  const errors = [...table.errors];

  if (table.headers.length === 0) {
    return { data: null, errors };
  }

  const headers = table.headers.map((header) => header.trim());

  if (headers.length < 3 || headers.length > 7) {
    errors.push(
      '列数は、結果1列と予測変数2〜6列の合計3〜7列にしてください。',
    );
  }

  if (headers.some((header) => header === '')) {
    errors.push('ヘッダーに空の列名があります。すべての列に名前を付けてください。');
  }

  if (new Set(headers).size !== headers.length) {
    errors.push('ヘッダーの列名が重複しています。列ごとに異なる名前を付けてください。');
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  const predictorCount = headers.length - 1;
  const y: number[] = [];
  const predictors: Matrix = [];

  table.rows.forEach((row, rowIndex) => {
    if (row.length !== headers.length) {
      return;
    }

    const outcomeToken = row[0].trim();
    const outcome = Number(outcomeToken);

    if (
      outcomeToken === '' ||
      !Number.isFinite(outcome) ||
      (outcome !== 0 && outcome !== 1)
    ) {
      errors.push(
        `${rowIndex + 2}行目の結果「${
          outcomeToken === '' ? '空欄' : outcomeToken
        }」は0または1で入力してください。`,
      );
      return;
    }

    const values: number[] = [];

    for (let column = 1; column < headers.length; column += 1) {
      const token = row[column].trim();
      const value = Number(token);

      if (token === '' || !Number.isFinite(value)) {
        errors.push(
          `${rowIndex + 2}行目の「${headers[column]}」は数値で入力してください。`,
        );
        return;
      }

      values.push(value);
    }

    y.push(outcome);
    predictors.push(values);
  });

  if (errors.length > 0) {
    return { data: null, errors };
  }

  if (y.length === 0) {
    errors.push('ヘッダーの下にデータ行を入力してください。');
    return { data: null, errors };
  }

  if (y.length <= predictorCount + 1) {
    errors.push(
      `データ行数は予測変数の数（${predictorCount}）より2行以上多くしてください。`,
    );
  }

  const positiveCount = y.filter((value) => value === 1).length;

  if (positiveCount === 0 || positiveCount === y.length) {
    errors.push('結果の列には0と1の両方を含めてください。');
  }

  for (let column = 0; column < predictorCount; column += 1) {
    const firstValue = predictors[0][column];
    const isConstant = predictors.every((row) => row[column] === firstValue);

    if (isConstant) {
      errors.push(
        `予測変数「${headers[column + 1]}」の値がすべて同じため、係数を推定できません。`,
      );
    }
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  return {
    data: {
      outcomeName: headers[0],
      predictorNames: headers.slice(1),
      y,
      predictors,
    },
    errors,
  };
}

function sigmoid(value: number): number {
  if (value >= 0) {
    return 1 / (1 + Math.exp(-value));
  }

  const exponential = Math.exp(value);
  return exponential / (1 + exponential);
}

function fitLogisticRegression(
  predictors: Matrix,
  y: number[],
): FitOutcome {
  const design = predictors.map((row) => [1, ...row]);
  const n = y.length;
  const parameterCount = design[0].length;
  let coefficients = Array.from({ length: parameterCount }, () => 0);
  let inverseInformation: Matrix | null = null;
  let converged = false;
  let iterations = 0;

  for (let iteration = 0; iteration < 60; iteration += 1) {
    iterations = iteration + 1;
    const linear = multiplyMatrixVector(design, coefficients);
    const probabilities = linear.map(sigmoid);
    const weights = probabilities.map((probability) =>
      Math.max(probability * (1 - probability), 1e-10),
    );
    const squareRootWeights = weights.map(Math.sqrt);
    const weightedDesign = design.map((row, rowIndex) =>
      row.map((value) => value * squareRootWeights[rowIndex]),
    );
    const information = multiplyMatrices(
      transpose(weightedDesign),
      weightedDesign,
    );
    const inverse = invert(information);

    if (!inverse) {
      break;
    }

    inverseInformation = inverse;
    const residual = y.map((value, index) => value - probabilities[index]);
    const gradient = multiplyMatrixVector(transpose(design), residual);
    const step = multiplyMatrixVector(inverse, gradient);
    const nextCoefficients = coefficients.map(
      (value, index) => value + step[index],
    );

    if (!nextCoefficients.every((value) => Number.isFinite(value))) {
      break;
    }

    const difference = nextCoefficients.reduce(
      (maximum, value, index) =>
        Math.max(maximum, Math.abs(value - coefficients[index])),
      0,
    );
    coefficients = nextCoefficients;

    if (difference < 1e-8) {
      converged = true;
      break;
    }
  }

  if (!inverseInformation) {
    return {
      fit: null,
      error:
        '係数を推定できませんでした。予測変数が定数であるか、予測変数間に強い相関がある可能性があります。',
    };
  }

  const linear = multiplyMatrixVector(design, coefficients);
  const probabilities = linear.map(sigmoid);
  const clippedProbabilities = probabilities.map((probability) =>
    Math.min(1 - 1e-12, Math.max(1e-12, probability)),
  );
  const logLikelihood = y.reduce(
    (total, value, index) =>
      total +
      value * Math.log(clippedProbabilities[index]) +
      (1 - value) * Math.log(1 - clippedProbabilities[index]),
    0,
  );
  const averageOutcome = mean(y);
  const nullLogLikelihood = y.reduce(
    (total, value) =>
      total +
      (value === 1
        ? Math.log(averageOutcome)
        : Math.log(1 - averageOutcome)),
    0,
  );
  const pseudoRSquared =
    nullLogLikelihood === 0 ? 0 : 1 - logLikelihood / nullLogLikelihood;
  const standardErrors = coefficients.map((_, index) =>
    Math.sqrt(Math.max(0, inverseInformation[index][index])),
  );
  const zValues = coefficients.map((value, index) =>
    standardErrors[index] > 0 ? value / standardErrors[index] : Number.NaN,
  );
  const pValues = zValues.map((value) =>
    Number.isFinite(value)
      ? 2 * (1 - normalCdf(Math.abs(value)))
      : Number.NaN,
  );
  const oddsRatios = coefficients.map((value) => Math.exp(value));
  const oddsRatioLow = coefficients.map((value, index) =>
    Math.exp(value - 1.959963984540054 * standardErrors[index]),
  );
  const oddsRatioHigh = coefficients.map((value, index) =>
    Math.exp(value + 1.959963984540054 * standardErrors[index]),
  );
  const confusion: ConfusionMatrix = {
    truePositive: 0,
    falsePositive: 0,
    falseNegative: 0,
    trueNegative: 0,
  };

  probabilities.forEach((probability, index) => {
    const predicted = probability >= 0.5 ? 1 : 0;

    if (y[index] === 1) {
      if (predicted === 1) {
        confusion.truePositive += 1;
      } else {
        confusion.falseNegative += 1;
      }
    } else if (predicted === 1) {
      confusion.falsePositive += 1;
    } else {
      confusion.trueNegative += 1;
    }
  });

  const accuracy =
    (confusion.truePositive + confusion.trueNegative) / n;
  const maxAbsoluteCoefficient = coefficients.reduce(
    (maximum, value) => Math.max(maximum, Math.abs(value)),
    0,
  );
  const hasExtremeProbability = probabilities.some(
    (probability) => probability < 1e-8 || probability > 1 - 1e-8,
  );
  const isPerfectlyClassified =
    confusion.falsePositive === 0 && confusion.falseNegative === 0;
  const separation =
    (isPerfectlyClassified && hasExtremeProbability) ||
    maxAbsoluteCoefficient > 12;

  return {
    fit: {
      coefficients,
      standardErrors,
      zValues,
      pValues,
      oddsRatios,
      oddsRatioLow,
      oddsRatioHigh,
      logLikelihood,
      nullLogLikelihood,
      pseudoRSquared,
      accuracy,
      confusion,
      probabilities,
      iterations,
      converged,
      separation,
      n,
      parameterCount,
    },
    error: null,
  };
}

function formatFixed(value: number, useFourDigits = false): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return (useFourDigits ? fixedFourFormatter : fixedThreeFormatter).format(
    value,
  );
}

function formatPValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  if (value < 0.0001) {
    return '< 0.0001';
  }

  return fixedFourFormatter.format(value);
}

function getCoefficientLabel(index: number, predictorNames: string[]): string {
  return index === 0 ? '切片（定数項）' : predictorNames[index - 1];
}

export function LogisticRegression() {
  const [csvInput, setCsvInput] = useState(EXAMPLE_CSV);
  const parsed = parseLogisticData(csvInput);
  const errors = parsed.errors;
  const fitOutcome =
    parsed.data !== null && errors.length === 0
      ? fitLogisticRegression(parsed.data.predictors, parsed.data.y)
      : null;
  const fit = fitOutcome?.fit ?? null;
  const fitError = fitOutcome?.error ?? null;
  const warningMessages: string[] = [];

  if (fit !== null && !fit.converged) {
    warningMessages.push(
      'IRLSが60回の反復で収束しませんでした。係数と標準誤差が不安定な可能性があります。',
    );
  }

  if (fit !== null && fit.separation) {
    warningMessages.push(
      '完全分離または準完全分離の可能性があります。係数が非常に大きくなり、オッズ比と信頼区間は解釈できません。',
    );
  }

  const statusMessage =
    fit !== null
      ? `推定が完了しました。データ数は${integerFormatter.format(
          fit.n,
        )}件、正解率は${percentFormatter.format(
          fit.accuracy,
        )}、McFaddenの疑似R²は${formatFixed(
          fit.pseudoRSquared,
        )}です。${
          warningMessages.length > 0
            ? `注意: ${warningMessages.join(' ')}`
            : ''
        }`
      : fitError !== null
        ? `計算エラー: ${fitError}`
        : errors.length > 0
          ? `入力エラーが${integerFormatter.format(
              errors.length,
            )}件あります。${errors[0]}`
          : 'CSVを入力するとロジスティック回帰の結果を表示します。';

  const loadExample = () => {
    setCsvInput(EXAMPLE_CSV);
  };

  const resetForm = () => {
    setCsvInput('');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="ロジスティック回帰分析"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="logistic-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="logistic-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              CSVデータを入力
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]"
          >
            01 / 03
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          1行目をヘッダー、1列目を0/1の結果、2列目以降を2〜6個の数値予測変数にしたCSVを貼り付けます。カンマ、タブ、セミコロンで区切れます。
        </p>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="logistic-csv"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {parsed.data !== null
                ? `${integerFormatter.format(
                    parsed.data.predictorNames.length + 1,
                  )}列 / ${integerFormatter.format(
                    parsed.data.y.length,
                  )}行`
                : '要確認'}
            </span>
          </div>
          <textarea
            id="logistic-csv"
            name="csv"
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            rows={12}
            placeholder={'結果,予測変数1,予測変数2\n1,10,2\n0,8,1\n1,12,3'}
            spellCheck={false}
            aria-invalid={errors.length > 0}
            aria-describedby={
              errors.length > 0
                ? 'logistic-csv-help logistic-csv-error'
                : 'logistic-csv-help'
            }
            className="field-paper mt-2 h-64 w-full resize-y rounded-sm px-3 py-3 text-sm leading-6 tabular-nums"
          />
          <p
            id="logistic-csv-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            結果は0または1、予測変数は数値で入力します。空行は無視されます。
          </p>
          {errors.length > 0 && (
            <div
              id="logistic-csv-error"
              role="alert"
              className="mt-2 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2"
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
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={loadExample}
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
        aria-labelledby="logistic-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="logistic-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              推定結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]"
          >
            02 / 03
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

        {fitError !== null && (
          <div
            role="alert"
            className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              計算できませんでした
            </p>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
              {fitError}
            </p>
          </div>
        )}

        {fit !== null ? (
          <div className="mt-4 min-w-0 space-y-4">
            {warningMessages.length > 0 && (
              <div
                role="alert"
                className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
              >
                <p className="text-xs font-bold text-[var(--accent)]">
                  結果の解釈に注意してください
                </p>
                {warningMessages.map((message) => (
                  <p
                    key={message}
                    className="mt-1 text-[11px] leading-6 text-[var(--ink)]"
                  >
                    {message}
                  </p>
                ))}
              </div>
            )}

            <dl className="grid grid-cols-2 gap-2">
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  McFadden 疑似R²
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatFixed(fit.pseudoRSquared)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  対数尤度
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatFixed(fit.logLikelihood)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  正解率（閾値0.5）
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {percentFormatter.format(fit.accuracy)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  データ数 / 反復回数
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {integerFormatter.format(fit.n)} /{' '}
                  {integerFormatter.format(fit.iterations)}
                </dd>
              </div>
            </dl>

            <p className="text-[10px] leading-5 text-[var(--ink-soft)]">
              反復回数はIRLSの実行回数です。収束:{' '}
              {fit.converged ? 'はい' : 'いいえ'}。パラメータ数:{' '}
              {integerFormatter.format(fit.parameterCount)}。
            </p>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  係数とオッズ比
                </p>
                <p className="text-[10px] text-[var(--ink-soft)]">
                  オッズ比の95%信頼区間
                </p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {fit.coefficients.map((coefficient, index) => (
                  <div
                    key={`${getCoefficientLabel(
                      index,
                      parsed.data?.predictorNames ?? [],
                    )}-${index}`}
                    className="min-w-0 border border-[var(--line)] px-3 py-2"
                  >
                    <p className="break-words text-xs font-bold text-[var(--ink)]">
                      {getCoefficientLabel(
                        index,
                        parsed.data?.predictorNames ?? [],
                      )}
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-5">
                      <div>
                        <dt className="text-[var(--ink-soft)]">係数</dt>
                        <dd className="break-words font-bold tabular-nums">
                          {formatFixed(coefficient)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--ink-soft)]">標準誤差</dt>
                        <dd className="break-words font-bold tabular-nums">
                          {formatFixed(fit.standardErrors[index])}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--ink-soft)]">z値</dt>
                        <dd className="break-words font-bold tabular-nums">
                          {formatFixed(fit.zValues[index])}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--ink-soft)]">p値</dt>
                        <dd className="break-words font-bold tabular-nums">
                          {formatPValue(fit.pValues[index])}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--ink-soft)]">オッズ比</dt>
                        <dd className="break-words font-bold tabular-nums">
                          {formatFixed(fit.oddsRatios[index])}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[var(--ink-soft)]">95%信頼区間</dt>
                        <dd className="break-words font-bold tabular-nums">
                          {formatFixed(fit.oddsRatioLow[index])} 〜{' '}
                          {formatFixed(fit.oddsRatioHigh[index])}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                2×2 混同行列（閾値0.5）
              </p>
              <table className="mt-2 w-full border-collapse text-center text-xs">
                <caption className="sr-only">
                  実測値と予測値の2×2混同行列
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="px-2 py-1.5" />
                    <th
                      scope="col"
                      className="border border-[var(--line)] px-2 py-1.5 font-label text-[9px] text-[var(--ink-soft)]"
                    >
                      予測 1
                    </th>
                    <th
                      scope="col"
                      className="border border-[var(--line)] px-2 py-1.5 font-label text-[9px] text-[var(--ink-soft)]"
                    >
                      予測 0
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th
                      scope="row"
                      className="border border-[var(--line)] px-2 py-1.5 font-label text-[9px] text-[var(--ink-soft)]"
                    >
                      実測 1
                    </th>
                    <td className="border border-[var(--line)] px-2 py-1.5 font-editorial tabular-nums">
                      {integerFormatter.format(fit.confusion.truePositive)}
                    </td>
                    <td className="border border-[var(--line)] px-2 py-1.5 font-editorial tabular-nums">
                      {integerFormatter.format(fit.confusion.falseNegative)}
                    </td>
                  </tr>
                  <tr>
                    <th
                      scope="row"
                      className="border border-[var(--line)] px-2 py-1.5 font-label text-[9px] text-[var(--ink-soft)]"
                    >
                      実測 0
                    </th>
                    <td className="border border-[var(--line)] px-2 py-1.5 font-editorial tabular-nums">
                      {integerFormatter.format(fit.confusion.falsePositive)}
                    </td>
                    <td className="border border-[var(--line)] px-2 py-1.5 font-editorial tabular-nums">
                      {integerFormatter.format(fit.confusion.trueNegative)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-5">
                <div>
                  <dt className="text-[var(--ink-soft)]">真陽性（TP）</dt>
                  <dd className="font-bold tabular-nums">
                    {integerFormatter.format(fit.confusion.truePositive)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--ink-soft)]">偽陽性（FP）</dt>
                  <dd className="font-bold tabular-nums">
                    {integerFormatter.format(fit.confusion.falsePositive)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--ink-soft)]">偽陰性（FN）</dt>
                  <dd className="font-bold tabular-nums">
                    {integerFormatter.format(fit.confusion.falseNegative)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--ink-soft)]">真陰性（TN）</dt>
                  <dd className="font-bold tabular-nums">
                    {integerFormatter.format(fit.confusion.trueNegative)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          fitError === null && (
            <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
              有効なCSVを入力すると、係数・標準誤差・z値・p値・オッズ比・信頼区間・疑似R²・正解率・混同行列を表示します。
            </p>
          )
        )}

        <div
          role="note"
          className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            仮定と限界
          </p>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            この結果は、各観測が独立で、結果がベルヌーイ分布に従い、予測変数と結果の対数オッズが線形であるという仮定に基づきます。サンプルサイズが小さい場合や予測変数が多い場合は推定が不安定になります。分離・欠測・外れ値・多重共線性・モデル選択の影響もあり、因果関係を示すものではありません。p値は正規近似、信頼区間は1.96×標準誤差による目安です。
          </p>
        </div>
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="logistic-probability-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Probability</p>
            <h2
              id="logistic-probability-heading"
              className="font-editorial mt-1 text-xl"
            >
              予測確率
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            03 / 03
          </span>
        </div>

        {fit !== null ? (
          <div className="mt-4 min-w-0">
            <div className="grid grid-cols-[2rem_2.2rem_minmax(0,1fr)_3.4rem_2.2rem] items-center gap-2 border-b border-[var(--line)] pb-1.5 font-label text-[8px] text-[var(--ink-soft)]">
              <span>No.</span>
              <span>実測</span>
              <span>予測確率</span>
              <span className="text-right">確率</span>
              <span className="text-center">判定</span>
            </div>
            <div className="max-h-80 overflow-y-auto pr-1">
              {fit.probabilities.map((probability, index) => (
                <div
                  key={`probability-${index}`}
                  className="grid grid-cols-[2rem_2.2rem_minmax(0,1fr)_3.4rem_2.2rem] items-center gap-2 border-b border-[var(--line)] py-1.5 text-[10px] leading-5"
                >
                  <span className="tabular-nums text-[var(--ink-soft)]">
                    {integerFormatter.format(index + 1)}
                  </span>
                  <span className="font-bold tabular-nums">
                    {integerFormatter.format(parsed.data?.y[index] ?? 0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block h-2.5 w-full border border-[var(--line)] bg-[var(--paper-strong)]">
                      <span
                        className="block h-full bg-[var(--accent)]"
                        style={{
                          width: `${Math.round(
                            Math.min(100, Math.max(0, probability * 100)) * 1000,
                          ) / 1000}%`,
                        }}
                      />
                    </span>
                  </span>
                  <span className="text-right font-bold tabular-nums">
                    {probabilityFormatter.format(probability)}
                  </span>
                  <span className="text-center font-bold tabular-nums">
                    {probability >= 0.5 ? '1' : '0'}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
              予測確率が0.5以上のとき判定を1としています。棒の長さは確率を表します。
            </p>
          </div>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なCSVを入力すると、各データ行の予測確率と判定を表示します。
          </p>
        )}
      </section>
    </section>
  );
}
