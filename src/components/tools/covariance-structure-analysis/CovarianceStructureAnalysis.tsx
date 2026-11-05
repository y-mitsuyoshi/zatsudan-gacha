'use client';

import { useState } from 'react';
import { mean, normalCdf, ols, parseDelimitedTable } from '@/lib/statsCore';

const SAMPLE_CSV = `x,m,y
1,2.1,3.4
2,3.0,4.4
3,3.9,5.6
4,5.1,7.1
5,5.9,8.0
6,7.2,9.5
7,8.0,10.9
8,9.1,12.2
9,9.8,13.0
10,11.2,14.8
11,11.9,15.7
12,13.1,17.0`;

const numberFormatter = new Intl.NumberFormat('ja-JP');
const valueFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 6,
});
const coefficientFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const pFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 3,
});
const percentFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Observation = {
  x: number;
  m: number;
  y: number;
};

type ParsedCsv = {
  observations: Observation[];
  errors: string[];
};

type OlsModel = NonNullable<ReturnType<typeof ols>>;

type MediationResult = {
  n: number;
  meanX: number;
  meanM: number;
  meanY: number;
  modelM: OlsModel;
  modelTotal: OlsModel;
  modelDirect: OlsModel;
  a: number;
  b: number;
  c: number;
  cPrime: number;
  indirect: number;
  sobelSe: number;
  sobelZ: number;
  sobelP: number;
  proportionMediated: number | null;
};

type EquationTerm = {
  coefficient: number;
  variable: string;
};

function parseCsv(raw: string): ParsedCsv {
  if (raw.trim() === '') {
    return { observations: [], errors: ['CSVデータを入力してください。'] };
  }

  const table = parseDelimitedTable(raw);
  const errors = [...table.errors];
  const headers = table.headers.map((header) =>
    header.trim().toLowerCase().replace(/^\uFEFF/, ''),
  );

  if (headers.length !== 3) {
    return {
      observations: [],
      errors: [...errors, 'ヘッダーは x, m, y の3列で入力してください。'],
    };
  }

  const xIndex = headers.indexOf('x');
  const mIndex = headers.indexOf('m');
  const yIndex = headers.indexOf('y');

  if (
    xIndex < 0 ||
    mIndex < 0 ||
    yIndex < 0 ||
    new Set(headers).size !== 3
  ) {
    return {
      observations: [],
      errors: [...errors, 'ヘッダーは x, m, y の3列で入力してください。'],
    };
  }

  const observations: Observation[] = [];

  for (let index = 0; index < table.rows.length; index += 1) {
    const row = table.rows[index];

    if (row.length !== headers.length) {
      continue;
    }

    const xText = row[xIndex].trim();
    const mText = row[mIndex].trim();
    const yText = row[yIndex].trim();

    if (xText === '' || mText === '' || yText === '') {
      errors.push(
        `${index + 2}行目: x, m, y のすべてに数値を入力してください。`,
      );
      continue;
    }

    const x = Number(xText);
    const m = Number(mText);
    const y = Number(yText);

    if (!Number.isFinite(x) || !Number.isFinite(m) || !Number.isFinite(y)) {
      errors.push(`${index + 2}行目: x, m, y は数値で入力してください。`);
      continue;
    }

    observations.push({ x, m, y });
  }

  if (observations.length < 8) {
    errors.push(
      `媒介分析には8行以上の完全なデータが必要です（現在${numberFormatter.format(
        observations.length,
      )}行）。`,
    );
  }

  return { observations, errors };
}

function buildResult(observations: Observation[]): MediationResult | null {
  const xValues = observations.map((observation) => observation.x);
  const mValues = observations.map((observation) => observation.m);
  const yValues = observations.map((observation) => observation.y);
  const modelM = ols(
    xValues.map((value) => [value]),
    mValues,
  );
  const modelTotal = ols(
    xValues.map((value) => [value]),
    yValues,
  );
  const modelDirect = ols(
    observations.map((observation) => [observation.x, observation.m]),
    yValues,
  );

  if (modelM === null || modelTotal === null || modelDirect === null) {
    return null;
  }

  const a = modelM.coefficients[1];
  const aSe = modelM.standardErrors[1];
  const b = modelDirect.coefficients[2];
  const bSe = modelDirect.standardErrors[2];
  const c = modelTotal.coefficients[1];
  const cPrime = modelDirect.coefficients[1];
  const indirect = a * b;
  const sobelSe = Math.sqrt(a * a * bSe * bSe + b * b * aSe * aSe);
  const sobelZ = sobelSe > 0 ? indirect / sobelSe : 0;
  const sobelP = 2 * (1 - normalCdf(Math.abs(sobelZ)));
  const proportionMediated = Math.abs(c) > 1e-9 ? indirect / c : null;

  return {
    n: observations.length,
    meanX: mean(xValues),
    meanM: mean(mValues),
    meanY: mean(yValues),
    modelM,
    modelTotal,
    modelDirect,
    a,
    b,
    c,
    cPrime,
    indirect,
    sobelSe,
    sobelZ,
    sobelP,
    proportionMediated,
  };
}

function formatValue(value: number): string {
  return valueFormatter.format(value);
}

function formatCoefficient(value: number): string {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return coefficientFormatter.format(normalized);
}

function formatPValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  if (value < 0.0001) {
    return '< 0.0001';
  }
  return pFormatter.format(value);
}

function formatEquation(
  outcome: string,
  intercept: number,
  terms: EquationTerm[],
): string {
  const body = terms
    .map(
      (term) =>
        `${term.coefficient < 0 ? '-' : '+'} ${formatValue(
          Math.abs(term.coefficient),
        )} × ${term.variable}`,
    )
    .join(' ');

  return `${outcome} = ${formatValue(intercept)} ${body}`;
}

function ModelTable({
  title,
  model,
  labels,
}: {
  title: string;
  model: OlsModel;
  labels: string[];
}) {
  return (
    <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
        <p className="font-label text-[9px] text-[var(--ink-soft)]">
          n = {numberFormatter.format(model.n)}
        </p>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[300px] border-collapse text-left text-[11px] tabular-nums">
          <caption className="sr-only">{title}の係数推定</caption>
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
                係数
              </th>
              <th
                scope="col"
                className="font-label px-2 py-1.5 text-right text-[9px] text-[var(--ink-soft)]"
              >
                標準誤差
              </th>
              <th
                scope="col"
                className="font-label px-2 py-1.5 text-right text-[9px] text-[var(--ink-soft)]"
              >
                t値
              </th>
              <th
                scope="col"
                className="font-label py-1.5 pl-2 text-right text-[9px] text-[var(--ink-soft)]"
              >
                p値
              </th>
            </tr>
          </thead>
          <tbody>
            {model.coefficients.map((coefficient, index) => (
              <tr
                key={labels[index] ?? `coefficient-${index}`}
                className="border-b border-[var(--line)] last:border-b-0"
              >
                <th
                  scope="row"
                  className="py-1.5 pr-2 text-left font-bold text-[var(--ink)]"
                >
                  {labels[index] ?? `係数${index + 1}`}
                </th>
                <td className="px-2 py-1.5 text-right">
                  {formatValue(coefficient)}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {formatValue(model.standardErrors[index])}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {formatValue(model.tValues[index])}
                </td>
                <td className="py-1.5 pl-2 text-right">
                  {formatPValue(model.pValues[index])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
        R² = {formatValue(model.rSquared)}（自由度調整済み R² ={' '}
        {formatValue(model.adjustedRSquared)}）
      </p>
    </div>
  );
}

export function CovarianceStructureAnalysis() {
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV);

  const parsed = parseCsv(csvInput);
  const canAnalyze = parsed.errors.length === 0;
  const result = canAnalyze ? buildResult(parsed.observations) : null;
  const calculationError =
    canAnalyze && result === null
      ? 'モデルを推定できませんでした。XまたはMの値がすべて同じでないか確認してください。'
      : null;
  const errors =
    calculationError !== null ? [...parsed.errors, calculationError] : parsed.errors;

  const statusMessage =
    result !== null
      ? `データ数${numberFormatter.format(
          result.n,
        )}。間接効果a×bは${formatValue(
          result.indirect,
        )}、Sobel zは${formatValue(result.sobelZ)}、p値は${formatPValue(
          result.sobelP,
        )}です。媒介率は${
          result.proportionMediated !== null
            ? percentFormatter.format(result.proportionMediated)
            : '総効果が0に近いため算出できません'
        }です。`
      : errors[0] ?? 'CSVデータを入力すると媒介分析の結果を表示します。';

  const pathDescription =
    result !== null
      ? `XからMへのaは${formatCoefficient(
          result.a,
        )}、MからYへのbは${formatCoefficient(
          result.b,
        )}、XからYへの直接効果c′は${formatCoefficient(
          result.cPrime,
        )}、総効果cは${formatCoefficient(
          result.c,
        )}、間接効果a×bは${formatCoefficient(result.indirect)}です。`
      : '';

  const resetForm = () => {
    setCsvInput('');
  };

  const loadSample = () => {
    setCsvInput(SAMPLE_CSV);
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="共分散構造分析（媒介分析）"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="covariance-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="covariance-form-heading"
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
          1行目にx,m,yのヘッダー、2行目以降に数値3列を入力します。カンマ・タブ・セミコロン区切りに対応し、8行以上の完全なデータが必要です。入力内容は自動で反映されます。
        </p>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="covariance-csv"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {numberFormatter.format(parsed.observations.length)}行
            </span>
          </div>
          <textarea
            id="covariance-csv"
            name="csv"
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            rows={12}
            placeholder={`x,m,y\n1,2.1,3.4\n2,3.0,4.4`}
            spellCheck={false}
            aria-invalid={errors.length > 0}
            aria-describedby={
              errors.length > 0
                ? 'covariance-csv-help covariance-csv-error'
                : 'covariance-csv-help'
            }
            className="field-paper mt-2 h-64 w-full resize-y rounded-sm px-3 py-3 text-sm leading-6 tabular-nums"
          />
          <p
            id="covariance-csv-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            例: x,m,y のヘッダーに続けて、x・m・yの順に数値を入力します。
          </p>
        </div>

        {errors.length > 0 && (
          <div
            id="covariance-csv-error"
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
        aria-labelledby="covariance-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="covariance-result-heading"
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
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Indirect Effect
                  </p>
                  <p className="font-editorial mt-1 break-words text-4xl leading-none tabular-nums">
                    {formatCoefficient(result.indirect)}
                  </p>
                  <p className="mt-3 inline-block border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-xs font-bold">
                    a × b = {formatCoefficient(result.a)} ×{' '}
                    {formatCoefficient(result.b)}
                  </p>
                </div>
                <p className="font-label shrink-0 text-right text-[9px] text-[var(--ink-soft)]">
                  間接効果
                  <br />
                  a × b
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2">
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  直接効果 c′
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatValue(result.cPrime)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  総効果 c
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatValue(result.c)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  Sobel z
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatValue(result.sobelZ)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  Sobel p値
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatPValue(result.sobelP)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  Sobel標準誤差
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatValue(result.sobelSe)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  媒介率
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {result.proportionMediated !== null
                    ? percentFormatter.format(result.proportionMediated)
                    : '算出不可'}
                </dd>
              </div>
            </dl>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                記述統計
              </p>
              <dl className="mt-1 grid grid-cols-3 gap-2 text-[11px]">
                <div className="min-w-0">
                  <dt className="text-[var(--ink-soft)]">Xの平均</dt>
                  <dd className="mt-0.5 break-words font-bold tabular-nums">
                    {formatValue(result.meanX)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[var(--ink-soft)]">Mの平均</dt>
                  <dd className="mt-0.5 break-words font-bold tabular-nums">
                    {formatValue(result.meanM)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[var(--ink-soft)]">Yの平均</dt>
                  <dd className="mt-0.5 break-words font-bold tabular-nums">
                    {formatValue(result.meanY)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 border-t border-[var(--line)] pt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                データ数: {numberFormatter.format(result.n)}行
              </p>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                モデル別 R²
              </p>
              <dl className="mt-1 grid grid-cols-3 gap-2 text-[11px]">
                <div className="min-w-0">
                  <dt className="text-[var(--ink-soft)]">M ~ X</dt>
                  <dd className="mt-0.5 break-words font-bold tabular-nums">
                    {formatValue(result.modelM.rSquared)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[var(--ink-soft)]">Y ~ X</dt>
                  <dd className="mt-0.5 break-words font-bold tabular-nums">
                    {formatValue(result.modelTotal.rSquared)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[var(--ink-soft)]">Y ~ X + M</dt>
                  <dd className="mt-0.5 break-words font-bold tabular-nums">
                    {formatValue(result.modelDirect.rSquared)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                推定式
              </p>
              <ul className="mt-2 space-y-1.5 break-words text-[11px] leading-6 tabular-nums">
                <li>
                  {formatEquation('M', result.modelM.coefficients[0], [
                    { coefficient: result.a, variable: 'X' },
                  ])}
                </li>
                <li>
                  {formatEquation('Y', result.modelTotal.coefficients[0], [
                    { coefficient: result.c, variable: 'X' },
                  ])}
                </li>
                <li>
                  {formatEquation('Y', result.modelDirect.coefficients[0], [
                    { coefficient: result.cPrime, variable: 'X' },
                    { coefficient: result.b, variable: 'M' },
                  ])}
                </li>
              </ul>
            </div>

            <div
              role="note"
              className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                媒介モデルの解釈
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                間接効果a×bは{formatValue(result.indirect)}、総効果cは
                {formatValue(result.c)}です。
                {result.proportionMediated !== null
                  ? `媒介率は${percentFormatter.format(
                      result.proportionMediated,
                    )}で、総効果のうちMを経由する経路として推定される割合を示します。`
                  : '総効果が0に近いため、媒介率は安定して計算できません。'}
                Sobel検定のp値は{formatPValue(result.sobelP)}
                です。この結果は観測変数X・M・Yを用いた媒介分析であり、潜在変数を組み込んだ完全な共分散構造分析（SEM）ではありません。
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            有効なCSVデータを入力すると、間接効果、Sobel検定、媒介率、決定係数、推定式を表示します。
          </p>
        )}

        <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          Sobel検定は間接効果a×bを正規近似で検定する方法です。信頼区間や因果効果そのものを保証するものではありません。
        </p>
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="covariance-path-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Path Diagram</p>
            <h2
              id="covariance-path-heading"
              className="font-editorial mt-1 text-xl"
            >
              媒介経路のパス図
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
          <figure className="mt-4 min-w-0">
            <svg
              viewBox="0 0 640 320"
              role="img"
              aria-labelledby="covariance-path-title"
              aria-describedby="covariance-path-desc"
              className="h-auto w-full"
            >
              <title id="covariance-path-title">媒介分析のパス図</title>
              <desc id="covariance-path-desc">{pathDescription}</desc>
              <defs>
                <marker
                  id="covariance-arrowhead"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--accent)" />
                </marker>
              </defs>

              <line
                x1="140"
                y1="190"
                x2="500"
                y2="190"
                stroke="var(--accent)"
                strokeWidth="2.5"
                markerEnd="url(#covariance-arrowhead)"
              />
              <text
                x="320"
                y="176"
                textAnchor="middle"
                fill="var(--accent)"
                fontSize="15"
                fontWeight="700"
              >
                直接効果 c′ = {formatCoefficient(result.cPrime)}
              </text>
              <text
                x="320"
                y="214"
                textAnchor="middle"
                fill="var(--ink-soft)"
                fontSize="12"
              >
                総効果 c = {formatCoefficient(result.c)}
              </text>

              <line
                x1="130"
                y1="168"
                x2="285"
                y2="105"
                stroke="var(--accent)"
                strokeWidth="2.5"
                markerEnd="url(#covariance-arrowhead)"
              />
              <text
                x="195"
                y="122"
                textAnchor="middle"
                fill="var(--accent)"
                fontSize="14"
                fontWeight="700"
              >
                a = {formatCoefficient(result.a)}
              </text>

              <line
                x1="355"
                y1="105"
                x2="510"
                y2="168"
                stroke="var(--accent)"
                strokeWidth="2.5"
                markerEnd="url(#covariance-arrowhead)"
              />
              <text
                x="445"
                y="122"
                textAnchor="middle"
                fill="var(--accent)"
                fontSize="14"
                fontWeight="700"
              >
                b = {formatCoefficient(result.b)}
              </text>

              <g>
                <rect
                  x="40"
                  y="165"
                  width="100"
                  height="50"
                  rx="4"
                  fill="var(--paper-strong)"
                  stroke="var(--line-strong)"
                  strokeWidth="1.5"
                />
                <text
                  x="90"
                  y="197"
                  textAnchor="middle"
                  fill="var(--ink)"
                  fontSize="22"
                  fontWeight="700"
                  className="font-editorial"
                >
                  X
                </text>
              </g>
              <g>
                <rect
                  x="270"
                  y="55"
                  width="100"
                  height="50"
                  rx="4"
                  fill="var(--paper-strong)"
                  stroke="var(--line-strong)"
                  strokeWidth="1.5"
                />
                <text
                  x="320"
                  y="87"
                  textAnchor="middle"
                  fill="var(--ink)"
                  fontSize="22"
                  fontWeight="700"
                  className="font-editorial"
                >
                  M
                </text>
              </g>
              <g>
                <rect
                  x="500"
                  y="165"
                  width="100"
                  height="50"
                  rx="4"
                  fill="var(--paper-strong)"
                  stroke="var(--line-strong)"
                  strokeWidth="1.5"
                />
                <text
                  x="550"
                  y="197"
                  textAnchor="middle"
                  fill="var(--ink)"
                  fontSize="22"
                  fontWeight="700"
                  className="font-editorial"
                >
                  Y
                </text>
              </g>
              <text
                x="90"
                y="240"
                textAnchor="middle"
                fill="var(--ink-soft)"
                fontSize="11"
              >
                説明変数
              </text>
              <text
                x="320"
                y="130"
                textAnchor="middle"
                fill="var(--ink-soft)"
                fontSize="11"
              >
                媒介変数
              </text>
              <text
                x="550"
                y="240"
                textAnchor="middle"
                fill="var(--ink-soft)"
                fontSize="11"
              >
                結果変数
              </text>
            </svg>
            <figcaption className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              矢印は推定された経路、数値は非標準化係数です。XからYへの直接経路c′と、XからMを経由する間接経路a×bをあわせて確認します。
            </figcaption>
            <p className="sr-only">{pathDescription}</p>
          </figure>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なデータを入力すると、X・M・Yの媒介経路と係数をパス図で表示します。
          </p>
        )}
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="covariance-models-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Models</p>
            <h2
              id="covariance-models-heading"
              className="font-editorial mt-1 text-xl"
            >
              3つの回帰モデル
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
          <div className="mt-4 grid min-w-0 gap-3 xl:grid-cols-3">
            <ModelTable
              title="M ~ X（a経路）"
              model={result.modelM}
              labels={['切片', 'X']}
            />
            <ModelTable
              title="Y ~ X（総効果c）"
              model={result.modelTotal}
              labels={['切片', 'X']}
            />
            <ModelTable
              title="Y ~ X + M（c′とb）"
              model={result.modelDirect}
              labels={['切片', 'X', 'M']}
            />
          </div>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なデータを入力すると、M ~ X、Y ~ X、Y ~ X + Mの係数表を表示します。
          </p>
        )}

        <div
          role="note"
          className="mt-4 border border-[var(--line-strong)] bg-[var(--paper-strong)] p-4"
        >
          <p className="text-xs font-bold text-[var(--ink)]">前提と限界</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-6 text-[var(--ink-soft)]">
            <li>
              回帰モデルの線形性、誤差の独立性・等分散性、説明変数の測定誤差が小さいことを仮定しています。
            </li>
            <li>
              XからM、MからYへの時間的順序と、未測定の交絡要因がないことを前提とした観測変数の媒介分析です。
            </li>
            <li>
              Sobel検定は正規近似に基づく検定で、間接効果の信頼区間ではありません。標本が小さい場合は解釈に注意してください。
            </li>
            <li>
              潜在変数を含む完全な共分散構造分析（SEM）ではなく、観測変数X・M・Yだけを用いたパス解析です。
            </li>
          </ul>
        </div>
      </section>
    </section>
  );
}
