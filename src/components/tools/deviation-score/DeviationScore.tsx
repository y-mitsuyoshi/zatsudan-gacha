'use client';

import { useState } from 'react';

type Mode = 'single' | 'list';

type FieldResult = {
  value: number | null;
  error: string | null;
};

type DeviationResult = {
  score: number;
  deviation: number;
  zScore: number;
  percentile: number;
};

type ParsedScoreList = {
  values: number[] | null;
  mean: number | null;
  standardDeviation: number | null;
  error: string | null;
};

const MODE_OPTIONS: { value: Mode; label: string; description: string }[] = [
  {
    value: 'single',
    label: '単一の得点',
    description: '得点・平均点・標準偏差',
  },
  {
    value: 'list',
    label: '得点リスト',
    description: '複数の得点をまとめて計算',
  },
];

const oneDecimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 1,
});
const twoDecimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 2,
});

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatOneDecimal(value: number): string {
  return oneDecimalFormatter.format(roundTo(value, 1));
}

function formatTwoDecimals(value: number): string {
  return twoDecimalFormatter.format(roundTo(value, 2));
}

function erf(value: number): number {
  if (value === 0) {
    return 0;
  }

  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absolute);
  const approximation =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-absolute * absolute));

  return sign * approximation;
}

function normalCdf(zScore: number): number {
  return 0.5 * (1 + erf(zScore / Math.SQRT2));
}

function calculatePercentile(zScore: number): number {
  const percentile = normalCdf(zScore) * 100;
  return Math.min(100, Math.max(0, percentile));
}

function calculateDeviation(
  score: number,
  mean: number,
  standardDeviation: number,
): DeviationResult {
  const zScore = (score - mean) / standardDeviation;
  return {
    score,
    deviation: 50 + 10 * zScore,
    zScore,
    percentile: calculatePercentile(zScore),
  };
}

function validateRequiredNumber(
  rawValue: string,
  label: string,
): FieldResult {
  const value = rawValue.trim();
  if (value === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  return { value: parsed, error: null };
}

function validatePositiveNumber(
  rawValue: string,
  label: string,
): FieldResult {
  const field = validateRequiredNumber(rawValue, label);
  if (field.value === null) {
    return field;
  }

  if (field.value <= 0) {
    return {
      value: null,
      error: `${label}は0より大きい値を入力してください。`,
    };
  }

  return field;
}

function parseScoreList(rawValue: string): ParsedScoreList {
  const tokens = rawValue
    .split(/[\s,，、]+/)
    .filter((token) => token !== '');

  if (tokens.length === 0) {
    return {
      values: null,
      mean: null,
      standardDeviation: null,
      error: '得点を1つ以上入力してください。',
    };
  }

  const values: number[] = [];
  for (const token of tokens) {
    const parsed = Number(token);
    if (!Number.isFinite(parsed)) {
      return {
        values: null,
        mean: null,
        standardDeviation: null,
        error: `「${token}」は数値として読み取れません。カンマ・スペース・改行で区切って入力してください。`,
      };
    }
    values.push(parsed);
  }

  if (values.length < 2) {
    return {
      values: null,
      mean: null,
      standardDeviation: null,
      error: '2つ以上の得点を入力してください。',
    };
  }

  const mean =
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  const standardDeviation = Math.sqrt(variance);

  if (!(standardDeviation > 0)) {
    return {
      values: null,
      mean: null,
      standardDeviation: null,
      error: '標準偏差が0です。異なる得点を2つ以上入力してください。',
    };
  }

  return {
    values,
    mean,
    standardDeviation,
    error: null,
  };
}

function DeviationScale({ deviationScore }: { deviationScore: number }) {
  const minimum = 20;
  const maximum = 80;
  const clamped = Math.min(maximum, Math.max(minimum, deviationScore));
  const position = ((clamped - minimum) / (maximum - minimum)) * 100;
  const ticks = [20, 30, 40, 50, 60, 70, 80];

  return (
    <div
      className="mt-3"
      role="img"
      aria-label={`偏差値${formatOneDecimal(deviationScore)}の位置。20から80のスケール上の位置を表示しています。`}
    >
      <div className="relative h-4 border border-[var(--line)] bg-[var(--paper-strong)]">
        {ticks.map((tick) => (
          <span
            key={tick}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-[var(--line)]"
            style={{
              left: `${((tick - minimum) / (maximum - minimum)) * 100}%`,
            }}
          />
        ))}
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-6 w-1.5 -translate-x-1/2 -translate-y-1/2 bg-[var(--accent)]"
          style={{ left: `${position}%` }}
        />
      </div>
      <div
        aria-hidden="true"
        className="mt-1 flex justify-between font-label text-[8px] text-[var(--ink-soft)]"
      >
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
}

export function DeviationScore() {
  const [mode, setMode] = useState<Mode>('single');
  const [score, setScore] = useState('65');
  const [average, setAverage] = useState('60');
  const [standardDeviation, setStandardDeviation] = useState('15');
  const [scoreList, setScoreList] = useState('55, 62, 70, 78, 85');

  const scoreField = validateRequiredNumber(score, '得点');
  const averageField = validateRequiredNumber(average, '平均点');
  const standardDeviationField = validatePositiveNumber(
    standardDeviation,
    '標準偏差',
  );

  const singleResult =
    scoreField.value !== null &&
    averageField.value !== null &&
    standardDeviationField.value !== null
      ? calculateDeviation(
          scoreField.value,
          averageField.value,
          standardDeviationField.value,
        )
      : null;

  const parsedList = parseScoreList(scoreList);
  const listMean = parsedList.mean;
  const listStandardDeviation = parsedList.standardDeviation;
  const listResults =
    parsedList.values !== null &&
    listMean !== null &&
    listStandardDeviation !== null
      ? parsedList.values.map((value) =>
          calculateDeviation(value, listMean, listStandardDeviation),
        )
      : [];

  const isSingle = mode === 'single';

  let statusMessage =
    '有効な得点・平均点・標準偏差を入力すると偏差値を表示します。';
  if (isSingle && singleResult !== null) {
    statusMessage = `偏差値は${formatOneDecimal(singleResult.deviation)}、zスコアは${formatTwoDecimals(singleResult.zScore)}、推定パーセンタイルは${formatOneDecimal(singleResult.percentile)}%です。`;
  } else if (
    !isSingle &&
    parsedList.error !== null
  ) {
    statusMessage = `得点リストの入力にエラーがあります。${parsedList.error}`;
  } else if (
    !isSingle &&
    parsedList.values !== null &&
    listMean !== null &&
    listStandardDeviation !== null
  ) {
    statusMessage = `平均点は${formatTwoDecimals(listMean)}、母標準偏差は${formatTwoDecimals(listStandardDeviation)}。${parsedList.values.length}件の偏差値を表示しています。`;
  }

  const resetForm = () => {
    setMode('single');
    setScore('65');
    setAverage('60');
    setStandardDeviation('15');
    setScoreList('55, 62, 70, 78, 85');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
      aria-label="偏差値計算"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="deviation-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="deviation-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              得点と基準値を入力
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
          偏差値は、得点が平均からどれだけ離れているかを標準偏差を基準に表した値です。入力内容は自動で反映されます。
        </p>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[var(--ink)]">
            計算モード
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {MODE_OPTIONS.map((option) => {
              const isSelected = mode === option.value;
              return (
                <label
                  key={option.value}
                  className={`paper-chip flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center rounded-sm px-3 py-2.5 text-center text-xs font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setMode(option.value)}
                    className="sr-only"
                  />
                  <span>{option.label}</span>
                  <span className="mt-0.5 text-[10px] font-normal opacity-80">
                    {option.description}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {isSingle ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="min-w-0">
              <label
                htmlFor="deviation-score"
                className="text-sm font-bold text-[var(--ink)]"
              >
                得点
              </label>
              <input
                id="deviation-score"
                name="score"
                type="number"
                inputMode="decimal"
                step="any"
                value={score}
                onChange={(event) => setScore(event.target.value)}
                placeholder="例: 65"
                aria-invalid={scoreField.error !== null}
                aria-describedby={
                  scoreField.error ? 'deviation-score-error' : undefined
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {scoreField.error && (
                <p
                  id="deviation-score-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {scoreField.error}
                </p>
              )}
            </div>

            <div className="min-w-0">
              <label
                htmlFor="deviation-average"
                className="text-sm font-bold text-[var(--ink)]"
              >
                平均点
              </label>
              <input
                id="deviation-average"
                name="average"
                type="number"
                inputMode="decimal"
                step="any"
                value={average}
                onChange={(event) => setAverage(event.target.value)}
                placeholder="例: 60"
                aria-invalid={averageField.error !== null}
                aria-describedby={
                  averageField.error ? 'deviation-average-error' : undefined
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {averageField.error && (
                <p
                  id="deviation-average-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {averageField.error}
                </p>
              )}
            </div>

            <div className="min-w-0">
              <label
                htmlFor="deviation-standard-deviation"
                className="text-sm font-bold text-[var(--ink)]"
              >
                標準偏差
              </label>
              <input
                id="deviation-standard-deviation"
                name="standardDeviation"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={standardDeviation}
                onChange={(event) =>
                  setStandardDeviation(event.target.value)
                }
                placeholder="例: 15"
                aria-invalid={standardDeviationField.error !== null}
                aria-describedby={
                  standardDeviationField.error
                    ? 'deviation-standard-deviation-error'
                    : undefined
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {standardDeviationField.error && (
                <p
                  id="deviation-standard-deviation-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {standardDeviationField.error}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="deviation-score-list"
                className="text-sm font-bold text-[var(--ink)]"
              >
                得点リスト
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                2件以上
              </span>
            </div>
            <textarea
              id="deviation-score-list"
              name="scoreList"
              rows={6}
              value={scoreList}
              onChange={(event) => setScoreList(event.target.value)}
              placeholder="例: 55, 62, 70, 78, 85"
              aria-invalid={parsedList.error !== null}
              aria-describedby={
                parsedList.error
                  ? 'deviation-list-error'
                  : 'deviation-list-help'
              }
              className="field-paper mt-2 w-full resize-y rounded-sm px-3 py-3 text-base leading-7 tabular-nums"
            />
            {parsedList.error ? (
              <p
                id="deviation-list-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {parsedList.error}
              </p>
            ) : (
              <p
                id="deviation-list-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                得点はカンマ・スペース・改行で区切ります。母標準偏差を使用します。例: 55, 62, 70, 78, 85
              </p>
            )}
          </div>
        )}

        <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          例：得点65、平均点60、標準偏差15の場合、偏差値は53.3、zスコアは0.33、推定パーセンタイルは約63.1%です。
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
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
        aria-labelledby="deviation-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="deviation-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              計算結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            02 / 02
          </span>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>

        {isSingle ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    偏差値
                  </p>
                  {singleResult !== null ? (
                    <>
                      <p className="font-editorial mt-1 text-4xl leading-none tabular-nums">
                        {formatOneDecimal(singleResult.deviation)}
                      </p>
                      <p className="mt-3 inline-block border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-xs font-bold">
                        得点 {formatTwoDecimals(singleResult.score)} の位置
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                      有効な得点・平均点・標準偏差を入力してください。
                    </p>
                  )}
                </div>
                <p className="font-label shrink-0 text-right text-[9px] text-[var(--ink-soft)]">
                  Deviation
                  <br />
                  Score
                </p>
              </div>
              {singleResult !== null && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-3">
                    <div className="min-w-0">
                      <p className="font-label text-[9px] text-[var(--ink-soft)]">
                        zスコア
                      </p>
                      <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                        {formatTwoDecimals(singleResult.zScore)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-label text-[9px] text-[var(--ink-soft)]">
                        推定パーセンタイル（正規分布仮定）
                      </p>
                      <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                        約 {formatOneDecimal(singleResult.percentile)}%
                      </p>
                    </div>
                  </div>
                  <DeviationScale deviationScore={singleResult.deviation} />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {parsedList.values !== null &&
            listMean !== null &&
            listStandardDeviation !== null ? (
              <>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      平均点
                    </p>
                    <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                      {formatTwoDecimals(listMean)}
                    </p>
                  </div>
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      母標準偏差
                    </p>
                    <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                      {formatTwoDecimals(listStandardDeviation)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      件数で割る母集団の標準偏差
                    </p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {listResults.map((result, index) => (
                    <li
                      key={`${index}-${result.score}`}
                      className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-label text-[9px] text-[var(--ink-soft)]">
                            得点 {index + 1}
                          </p>
                          <p className="font-editorial mt-0.5 text-lg leading-tight tabular-nums">
                            {formatTwoDecimals(result.score)}
                          </p>
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="font-label text-[9px] text-[var(--ink-soft)]">
                            偏差値
                          </p>
                          <p className="font-editorial mt-0.5 text-2xl leading-none tabular-nums">
                            {formatOneDecimal(result.deviation)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-2 text-[11px] leading-5">
                        <p className="text-[var(--ink-soft)]">
                          zスコア{' '}
                          <span className="font-bold text-[var(--ink)] tabular-nums">
                            {formatTwoDecimals(result.zScore)}
                          </span>
                        </p>
                        <p className="text-right text-[var(--ink-soft)]">
                          推定パーセンタイル{' '}
                          <span className="font-bold text-[var(--ink)] tabular-nums">
                            約 {formatOneDecimal(result.percentile)}%
                          </span>
                        </p>
                      </div>
                      <DeviationScale deviationScore={result.deviation} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                <p className="text-sm leading-6 text-[var(--ink-soft)]">
                  有効な得点リストを入力してください。カンマ・スペース・改行で区切った2件以上の数値を読み取ります。
                </p>
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          偏差値 = 50 + 10 ×（得点 − 平均点）÷ 標準偏差。zスコア =（得点 − 平均点）÷ 標準偏差。得点リストの母標準偏差は、各得点と平均点の差の二乗平均の平方根です。パーセンタイルは正規分布を仮定した近似値です。
        </p>
      </section>
    </section>
  );
}
