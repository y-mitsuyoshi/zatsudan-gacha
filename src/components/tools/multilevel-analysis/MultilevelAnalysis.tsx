'use client';

import { useState } from 'react';
import {
  parseDelimitedTable,
  mean,
  variance,
  invert,
  multiplyMatrices,
  multiplyMatrixVector,
  transpose,
} from '@/lib/statsCore';

const SAMPLE_CSV = `group,y,x1,x2
A,9.5,1.0,2.0
A,10.4,1.2,2.4
A,9.8,1.4,1.8
A,11.2,1.1,2.6
B,14.8,2.0,1.5
B,15.5,2.2,1.7
B,14.4,1.9,1.3
B,16.3,2.4,1.9
C,8.3,0.5,3.0
C,9.0,0.8,2.8
C,8.7,0.7,3.2
C,9.9,1.0,2.9
D,17.7,3.0,1.0
D,18.5,3.2,1.2
D,17.2,2.8,0.9
D,18.9,3.4,1.4`;

const integerFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 4,
});
const significantFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 6,
});
const percentFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 1,
});

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

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  return `${percentFormatter.format(normalized * 100)}%`;
}

type ParsedDataset = {
  groupNames: string[];
  groups: string[];
  outcome: number[];
  predictors: number[][];
  predictorNames: string[];
  rowCount: number;
};

type ParseResult = {
  data: ParsedDataset | null;
  errors: string[];
};

type FixedEffect = {
  name: string;
  estimate: number;
  standardError: number;
};

type GroupEffect = {
  group: string;
  n: number;
  adjustedEffect: number;
  groupIntercept: number;
};

type ModelResult = {
  groupCount: number;
  rowCount: number;
  fixedEffects: FixedEffect[];
  betweenVariance: number;
  withinVariance: number;
  icc: number;
  groupEffects: GroupEffect[];
};

type FitResult = {
  result: ModelResult | null;
  error: string | null;
};

function parseDataset(raw: string): ParseResult {
  const table = parseDelimitedTable(raw);
  const errors = [...table.errors];

  if (table.headers.length === 0) {
    return { data: null, errors };
  }

  const headers = table.headers.map((header) => header.trim());

  if (headers.length < 3) {
    errors.push(
      'ヘッダーは group, y, 予測変数1〜3列の3列以上で入力してください。',
    );
  }
  if (headers.length > 5) {
    errors.push(
      '予測変数は1〜3列までです。ヘッダーは最大5列にしてください。',
    );
  }
  if ((headers[0] ?? '').toLowerCase() !== 'group') {
    errors.push('1列目のヘッダーは group にしてください。');
  }
  if ((headers[1] ?? '').toLowerCase() !== 'y') {
    errors.push('2列目のヘッダーは y にしてください。');
  }
  if (table.rows.length === 0) {
    errors.push('データ行を入力してください。');
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  const predictorNames = headers.slice(2).map((header, index) =>
    header === '' ? `x${index + 1}` : header,
  );
  const groups: string[] = [];
  const outcome: number[] = [];
  const predictors: number[][] = [];
  const rowErrors: string[] = [];

  table.rows.forEach((row, rowIndex) => {
    if (row.length !== headers.length) {
      return;
    }

    const group = (row[0] ?? '').trim();
    if (group === '') {
      if (rowErrors.length < 5) {
        rowErrors.push(`${rowIndex + 2}行目のgroupが空です。`);
      }
      return;
    }

    const values: number[] = [];
    for (let column = 1; column < headers.length; column += 1) {
      const cell = (row[column] ?? '').trim();
      const value = Number(cell);
      if (cell === '' || !Number.isFinite(value)) {
        if (rowErrors.length < 5) {
          rowErrors.push(
            `${rowIndex + 2}行目の「${headers[column]}」は数値で入力してください。`,
          );
        }
        return;
      }
      values.push(value);
    }

    groups.push(group);
    outcome.push(values[0]);
    predictors.push(values.slice(1));
  });

  if (rowErrors.length > 0) {
    return { data: null, errors: [...errors, ...rowErrors] };
  }

  const groupNames = Array.from(new Set(groups));
  if (groupNames.length < 3) {
    errors.push('グループは3つ以上必要です。');
  }
  if (groups.length <= predictorNames.length + 1) {
    errors.push('行数は予測変数の数より多く必要です。');
  }

  const groupCounts = new Map<string, number>();
  groups.forEach((group) => {
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  });
  const smallGroups = groupNames.filter(
    (group) => (groupCounts.get(group) ?? 0) < 2,
  );
  if (smallGroups.length > 0) {
    const names = smallGroups.slice(0, 5).join('、');
    const suffix = smallGroups.length > 5 ? ' など' : '';
    errors.push(
      `各グループ2件以上必要です。行数が足りないグループ: ${names}${suffix}`,
    );
  }

  predictorNames.forEach((name, index) => {
    const values = predictors.map((row) => row[index]);
    if (variance(values) <= 0) {
      errors.push(
        `予測変数「${name}」の値がすべて同じため、固定効果を推定できません。`,
      );
    }
  });

  if (variance(outcome) <= 0) {
    errors.push(
      '目的変数 y の値がすべて同じため、分散成分を推定できません。',
    );
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  return {
    data: {
      groupNames,
      groups,
      outcome,
      predictors,
      predictorNames,
      rowCount: outcome.length,
    },
    errors: [],
  };
}

function fitModel(data: ParsedDataset): FitResult {
  const { groups, outcome, predictors, predictorNames } = data;
  const rowCount = outcome.length;
  const predictorCount = predictorNames.length;
  const parameterCount = predictorCount + 1;
  const design = predictors.map((row) => [1, ...row]);

  const designTranspose = transpose(design);
  const normalMatrix = multiplyMatrices(designTranspose, design);
  const normalInverse = invert(normalMatrix);
  if (!normalInverse) {
    return {
      result: null,
      error:
        '予測変数の列が互いに強く相関しているため、固定効果を推定できません。',
    };
  }

  const normalVector = multiplyMatrixVector(designTranspose, outcome);
  const olsCoefficients = multiplyMatrixVector(normalInverse, normalVector);
  const olsPredictions = multiplyMatrixVector(design, olsCoefficients);
  const olsResiduals = outcome.map(
    (value, index) => value - olsPredictions[index],
  );

  const groupRows = new Map<string, number[]>();
  groups.forEach((group, index) => {
    const indices = groupRows.get(group) ?? [];
    indices.push(index);
    groupRows.set(group, indices);
  });

  const groupCount = groupRows.size;
  const dfBetween = groupCount - 1;
  const dfWithin = rowCount - groupCount;
  if (groupCount < 3 || dfBetween <= 0) {
    return {
      result: null,
      error: 'グループは3つ以上必要です。',
    };
  }
  if (dfWithin <= 0) {
    return {
      result: null,
      error: '群内分散を推定するには、各グループに2件以上の行が必要です。',
    };
  }

  const overallResidualMean = mean(olsResiduals);
  let betweenSumOfSquares = 0;
  let withinSumOfSquares = 0;
  let squaredGroupSizes = 0;

  groupRows.forEach((indices) => {
    const residuals = indices.map((index) => olsResiduals[index]);
    const groupResidualMean = mean(residuals);
    betweenSumOfSquares +=
      indices.length * (groupResidualMean - overallResidualMean) ** 2;
    withinSumOfSquares += variance(residuals) * (indices.length - 1);
    squaredGroupSizes += indices.length ** 2;
  });

  const meanSquareBetween = betweenSumOfSquares / dfBetween;
  const meanSquareWithin = withinSumOfSquares / dfWithin;
  const typicalGroupSize =
    (rowCount - squaredGroupSizes / rowCount) / dfBetween;

  if (!(typicalGroupSize > 0)) {
    return {
      result: null,
      error: 'グループの行数構成から分散成分を推定できません。',
    };
  }

  const withinVariance = Math.max(0, meanSquareWithin);
  const betweenVariance = Math.max(
    0,
    (meanSquareBetween - meanSquareWithin) / typicalGroupSize,
  );

  if (withinVariance + betweenVariance <= 0) {
    return {
      result: null,
      error: '群間分散と群内分散がともに0のため、モデルを推定できません。',
    };
  }

  const glsWithinVariance =
    withinVariance > 0
      ? withinVariance
      : Math.max(betweenVariance * 1e-8, 1e-12);

  const weightedNormalMatrix = Array.from(
    { length: parameterCount },
    () => Array<number>(parameterCount).fill(0),
  );
  const weightedNormalVector = Array<number>(parameterCount).fill(0);

  groupRows.forEach((indices) => {
    const groupSize = indices.length;
    const groupDesign = indices.map((index) => design[index]);
    const groupOutcome = indices.map((index) => outcome[index]);
    const groupDesignTranspose = transpose(groupDesign);
    const designBlock = multiplyMatrices(
      groupDesignTranspose,
      groupDesign,
    );
    const outcomeBlock = multiplyMatrixVector(
      groupDesignTranspose,
      groupOutcome,
    );
    const ones = Array.from({ length: groupSize }, () => 1);
    const columnSums = multiplyMatrixVector(groupDesignTranspose, ones);
    const groupOutcomeSum = groupOutcome.reduce(
      (total, value) => total + value,
      0,
    );
    const shrinkage =
      betweenVariance /
      (glsWithinVariance + groupSize * betweenVariance);

    for (let row = 0; row < parameterCount; row += 1) {
      outcomeBlock[row] -=
        shrinkage * columnSums[row] * groupOutcomeSum;
      for (let column = 0; column < parameterCount; column += 1) {
        designBlock[row][column] -=
          shrinkage * columnSums[row] * columnSums[column];
        weightedNormalMatrix[row][column] +=
          designBlock[row][column] / glsWithinVariance;
      }
      weightedNormalVector[row] += outcomeBlock[row] / glsWithinVariance;
    }
  });

  const weightedNormalInverse = invert(weightedNormalMatrix);
  if (!weightedNormalInverse) {
    return {
      result: null,
      error:
        '加重後の行列が特異なため、固定効果を推定できません。予測変数の組み合わせを見直してください。',
    };
  }

  const coefficients = multiplyMatrixVector(
    weightedNormalInverse,
    weightedNormalVector,
  );

  const fixedEffects = ['切片', ...predictorNames].map((name, index) => {
    const estimate = coefficients[index];
    const standardError = Math.sqrt(
      Math.max(0, weightedNormalInverse[index][index]),
    );
    return {
      name,
      estimate,
      standardError,
    };
  });

  const groupEffects = Array.from(groupRows.entries()).map(
    ([group, indices]) => {
      const groupSize = indices.length;
      const groupMean = mean(indices.map((index) => outcome[index]));
      const predictorMeans = Array.from(
        { length: predictorCount },
        (_, column) =>
          mean(indices.map((index) => predictors[index][column])),
      );
      const fixedPart =
        coefficients[0] +
        predictorMeans.reduce(
          (total, value, column) =>
            total + coefficients[column + 1] * value,
          0,
        );
      const rawEffect = groupMean - fixedPart;
      const shrinkage =
        (groupSize * betweenVariance) /
        (groupSize * betweenVariance + glsWithinVariance);
      const adjustedEffect = shrinkage * rawEffect;

      return {
        group,
        n: groupSize,
        adjustedEffect,
        groupIntercept: coefficients[0] + adjustedEffect,
      };
    },
  );

  const icc =
    betweenVariance + glsWithinVariance === 0
      ? 0
      : betweenVariance / (betweenVariance + glsWithinVariance);

  return {
    result: {
      groupCount,
      rowCount,
      fixedEffects,
      betweenVariance,
      withinVariance,
      icc: Math.min(1, Math.max(0, icc)),
      groupEffects,
    },
    error: null,
  };
}

export function MultilevelAnalysis() {
  const [input, setInput] = useState(SAMPLE_CSV);

  const validation = parseDataset(input);
  const fit = validation.data !== null ? fitModel(validation.data) : null;
  const result = fit?.result ?? null;
  const errors =
    validation.errors.length > 0
      ? validation.errors
      : fit?.error
        ? [fit.error]
        : [];
  const visibleErrors = errors.slice(0, 5);
  const hiddenErrorCount = errors.length - visibleErrors.length;

  const statusMessage =
    result !== null
      ? `グループ数${integerFormatter.format(
          result.groupCount,
        )}、行数${integerFormatter.format(
          result.rowCount,
        )}、ICCは${formatPercent(
          result.icc,
        )}です。固定効果は${result.fixedEffects
          .map((effect) => `${effect.name} ${formatNumber(effect.estimate)}`)
          .join('、')}です。`
      : errors.length > 0
        ? `入力内容を確認してください。${errors[0]}`
        : '有効なCSVを入力すると推定結果を表示します。';

  const loadSample = () => {
    setInput(SAMPLE_CSV);
  };

  const resetForm = () => {
    setInput('');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
      aria-label="マルチレベル分析"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="multilevel-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="multilevel-form-heading"
              className="font-editorial mt-1 text-xl"
            >
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
          1列目をgroup、2列目をy、3列目以降を1〜3個の予測変数にしたCSVを貼り付けてください。カンマ区切りとタブ区切りに対応しています。入力内容は自動で反映されます。
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="multilevel-input"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              3〜5列
            </span>
          </div>
          <textarea
            id="multilevel-input"
            name="table"
            rows={12}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={'group,y,x1\nA,9.5,1.0\nA,10.4,1.2\nB,14.8,2.0'}
            spellCheck={false}
            aria-invalid={errors.length > 0}
            aria-describedby={
              errors.length > 0
                ? 'multilevel-input-help multilevel-input-error'
                : 'multilevel-input-help'
            }
            className="field-paper mt-2 min-h-64 w-full resize-y rounded-sm px-3 py-3 text-base leading-7 tabular-nums"
          />
          <p
            id="multilevel-input-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            必須のヘッダーは group と y です。各グループ2件以上、グループは3つ以上必要です。欠測値は扱いません。
          </p>
        </div>

        {errors.length > 0 && (
          <div
            id="multilevel-input-error"
            role="alert"
            className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              入力内容を確認してください
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-5 text-[var(--ink)]">
              {visibleErrors.map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
              {hiddenErrorCount > 0 && (
                <li>
                  ほか{integerFormatter.format(hiddenErrorCount)}
                  件のエラーがあります。
                </li>
              )}
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
        aria-labelledby="multilevel-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="multilevel-result-heading"
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

        <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          近似的なランダム切片モデルとして、一元配置の分散分析分解とGLSで推定します。
        </p>

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
                    ICC
                  </p>
                  <p className="font-editorial mt-1 text-4xl leading-none tabular-nums">
                    {formatPercent(result.icc)}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    群間分散 ÷（群間分散 + 群内分散）
                  </p>
                </div>
                <p className="font-label shrink-0 text-right text-[9px] leading-4 text-[var(--ink-soft)]">
                  Intraclass
                  <br />
                  Correlation
                </p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--line)] pt-3 sm:grid-cols-4">
                <div className="min-w-0">
                  <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                    グループ数
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {integerFormatter.format(result.groupCount)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                    行数
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {integerFormatter.format(result.rowCount)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                    群間分散 τ²
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {formatNumber(result.betweenVariance)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                    群内分散 σ²
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                    {formatNumber(result.withinVariance)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Fixed Effects
                  </p>
                  <h3 className="font-editorial mt-1 text-lg">
                    固定効果の推定値
                  </h3>
                </div>
                <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-[10px] font-bold">
                  近似GLS
                </span>
              </div>
              <div className="mt-3">
                <table className="w-full table-fixed border-collapse text-left text-xs">
                  <caption className="sr-only">
                    固定効果の推定値と標準誤差
                  </caption>
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th
                        scope="col"
                        className="w-[40%] py-2 pr-2 font-normal text-[var(--ink-soft)]"
                      >
                        変数
                      </th>
                      <th
                        scope="col"
                        className="w-[30%] px-2 py-2 text-right font-normal text-[var(--ink-soft)]"
                      >
                        推定値
                      </th>
                      <th
                        scope="col"
                        className="w-[30%] py-2 pl-2 text-right font-normal text-[var(--ink-soft)]"
                      >
                        標準誤差
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.fixedEffects.map((effect, index) => (
                      <tr
                        key={`${effect.name}-${index}`}
                        className="border-b border-[var(--line)] last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="break-words py-2 pr-2 font-normal text-[var(--ink)]"
                        >
                          {effect.name}
                        </th>
                        <td className="break-words px-2 py-2 text-right tabular-nums">
                          {formatNumber(effect.estimate)}
                        </td>
                        <td className="break-words py-2 pl-2 text-right tabular-nums">
                          {formatNumber(effect.standardError)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                標準誤差は推定した分散成分を固定した近似値です。係数の有意性検定を目的としたものではありません。
              </p>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Group Effects
                  </p>
                  <h3 className="font-editorial mt-1 text-lg">
                    群ごとの調整済み効果
                  </h3>
                </div>
                <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-[10px] font-bold tabular-nums">
                  {integerFormatter.format(result.groupCount)}群
                </span>
              </div>
              <div className="mt-3">
                <table className="w-full table-fixed border-collapse text-left text-xs">
                  <caption className="sr-only">
                    群ごとの行数、調整済み効果、群切片
                  </caption>
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th
                        scope="col"
                        className="w-[34%] py-2 pr-1 font-normal text-[var(--ink-soft)]"
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
                        className="w-[27%] px-1 py-2 text-right font-normal text-[var(--ink-soft)]"
                      >
                        調整済み効果
                      </th>
                      <th
                        scope="col"
                        className="w-[27%] py-2 pl-1 text-right font-normal text-[var(--ink-soft)]"
                      >
                        群切片
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.groupEffects.map((group) => (
                      <tr
                        key={group.group}
                        className="border-b border-[var(--line)] last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="break-all py-2 pr-1 font-normal text-[var(--ink)]"
                        >
                          {group.group}
                        </th>
                        <td className="px-1 py-2 text-right tabular-nums">
                          {integerFormatter.format(group.n)}
                        </td>
                        <td className="break-words px-1 py-2 text-right tabular-nums">
                          {formatNumber(group.adjustedEffect)}
                        </td>
                        <td className="break-words py-2 pl-1 text-right tabular-nums">
                          {formatNumber(group.groupIntercept)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                調整済み効果u_jは、群平均のずれに縮小係数 n_j τ² ÷（n_j τ² + σ²）を掛けた経験ベイズ的な推定値です。群切片はb0 + u_jです。
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="text-sm leading-6 text-[var(--ink-soft)]">
              有効なCSVを入力すると、固定効果、分散成分、ICC、群ごとの調整済み効果を表示します。
            </p>
          </div>
        )}

        <div
          role="note"
          className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            近似手法と前提条件
          </p>
          <div className="mt-1 space-y-1 text-[11px] leading-6 text-[var(--ink)]">
            <p>
              このツールは、固定効果を最初にOLSで推定し、その残差を群ごとに一元配置の分散分析で分解して群間分散τ²と群内分散σ²を推定する近似的なランダム切片分析です。完全な最尤法（ML）や制限付き最尤法（REML）ではありません。
            </p>
            <p>
              モデルは y_ij = b0 + b1 x_ij + ... + u_j + e_ij
              です。群は独立で、群内誤差は等分散・独立、ランダム切片と予測変数は無相関、誤差は正規分布に従うと仮定しています。群数や各群の行数が少ない場合、分散成分・ICC・標準誤差は不安定になります。欠測値は扱いません。
            </p>
            <p>
              結果は探索的な参考値であり、因果推論や正式な統計解析の代替ではありません。
            </p>
          </div>
          <p className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
            表示は小数第4位までの目安です。グループ名は入力した文字列をそのまま表示します。
          </p>
        </div>
      </section>
    </section>
  );
}
