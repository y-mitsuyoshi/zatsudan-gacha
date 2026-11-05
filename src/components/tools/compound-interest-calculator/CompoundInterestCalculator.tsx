'use client';

import { useState } from 'react';

type ContributionTiming = 'beginning' | 'end';

type ValidationResult = {
  value: number | null;
  error: string | null;
};

type YearRow = {
  year: number;
  principal: number;
  gains: number;
  preTax: number;
  afterTax: number;
  real: number;
};

type Simulation = {
  years: number;
  principal: number;
  gains: number;
  preTax: number;
  tax: number;
  afterTax: number;
  real: number;
  rows: YearRow[];
};

const MAX_AMOUNT_YEN = 1_000_000_000_000;
const MAX_RATE_PERCENT = 100;
const MAX_YEARS = 60;
const MIN_INFLATION_PERCENT = -10;
const MAX_INFLATION_PERCENT = 100;
const DEFAULT_TAX_PERCENT = '20.315';

const numberFormatter = new Intl.NumberFormat('ja-JP');

const GROUPED_DECIMAL_PATTERN =
  /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

const TIMING_OPTIONS: {
  value: ContributionTiming;
  label: string;
  description: string;
}[] = [
  {
    value: 'end',
    label: '月末',
    description: '毎月末に積み立て、翌月から運用される想定です。',
  },
  {
    value: 'beginning',
    label: '月初',
    description: '毎月初に積み立て、その月から運用される想定です。',
  },
];

function formatYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const rounded = Math.round(value);
  return `${numberFormatter.format(rounded === 0 ? 0 : rounded)}円`;
}

function normalizeNumberText(raw: string): string {
  return raw.normalize('NFKC').trim();
}

function parseDecimal(raw: string, allowGrouping: boolean): number | null {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return null;
  }

  const pattern = allowGrouping ? GROUPED_DECIMAL_PATTERN : DECIMAL_PATTERN;
  if (!pattern.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function validateAmount(
  raw: string,
  label: string,
  maxYen: number,
): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized, true);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < 0) {
    return { value: null, error: `${label}は0円以上で入力してください。` };
  }

  const yen = Math.round(parsed);
  if (!Number.isSafeInteger(yen) || yen > maxYen) {
    return {
      value: null,
      error: `${label}は1兆円以下で入力してください。`,
    };
  }

  return { value: yen, error: null };
}

function validateRate(raw: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: '年利を入力してください。' };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null) {
    return { value: null, error: '年利は数値で入力してください。' };
  }

  if (parsed < 0 || parsed > MAX_RATE_PERCENT) {
    return {
      value: null,
      error: `年利は0〜${MAX_RATE_PERCENT}%の範囲で入力してください。`,
    };
  }

  return { value: parsed, error: null };
}

function validateYears(raw: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: '運用期間を入力してください。' };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null || !Number.isInteger(parsed)) {
    return {
      value: null,
      error: `運用期間は1〜${MAX_YEARS}年の整数で入力してください。`,
    };
  }

  if (parsed < 1 || parsed > MAX_YEARS) {
    return {
      value: null,
      error: `運用期間は1〜${MAX_YEARS}年の範囲で入力してください。`,
    };
  }

  return { value: parsed, error: null };
}

function validateTax(raw: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: '税率を入力してください。' };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null) {
    return { value: null, error: '税率は数値で入力してください。' };
  }

  if (parsed < 0 || parsed > 100) {
    return {
      value: null,
      error: '税率は0〜100%の範囲で入力してください。',
    };
  }

  return { value: parsed, error: null };
}

function validateInflation(raw: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: 0, error: null };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null) {
    return { value: null, error: 'インフレ率は数値で入力してください。' };
  }

  if (parsed < MIN_INFLATION_PERCENT || parsed > MAX_INFLATION_PERCENT) {
    return {
      value: null,
      error: `インフレ率は${MIN_INFLATION_PERCENT}〜${MAX_INFLATION_PERCENT}%の範囲で入力してください。`,
    };
  }

  return { value: parsed, error: null };
}

function calculateCompound(
  initial: number,
  monthly: number,
  annualRate: number,
  years: number,
  timing: ContributionTiming,
  taxRate: number,
  inflationRate: number,
): Simulation {
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  const isZeroRate = monthlyRate === 0;
  const logGrowth = isZeroRate ? 0 : Math.log1p(monthlyRate);
  const timingMultiplier = timing === 'beginning' ? 1 + monthlyRate : 1;

  const valueAfterMonths = (elapsedMonths: number): number => {
    if (isZeroRate) {
      return initial + monthly * elapsedMonths;
    }

    const growth = Math.exp(logGrowth * elapsedMonths);
    const annuity = Math.expm1(logGrowth * elapsedMonths) / monthlyRate;
    return initial * growth + monthly * annuity * timingMultiplier;
  };

  const principal = initial + monthly * months;
  const preTax = Math.max(principal, valueAfterMonths(months));
  const gains = preTax - principal;
  const tax = gains > 0 ? (gains * taxRate) / 100 : 0;
  const afterTax = preTax - tax;
  const real = afterTax / Math.pow(1 + inflationRate / 100, years);

  const rows: YearRow[] = [];
  for (let year = 1; year <= years; year += 1) {
    const yearMonths = year * 12;
    const yearPrincipal = initial + monthly * yearMonths;
    const yearPreTax = Math.max(
      yearPrincipal,
      valueAfterMonths(yearMonths),
    );
    const yearGains = yearPreTax - yearPrincipal;
    const yearTax = yearGains > 0 ? (yearGains * taxRate) / 100 : 0;
    const yearAfterTax = yearPreTax - yearTax;
    const yearReal =
      yearAfterTax / Math.pow(1 + inflationRate / 100, year);

    rows.push({
      year,
      principal: yearPrincipal,
      gains: yearGains,
      preTax: yearPreTax,
      afterTax: yearAfterTax,
      real: yearReal,
    });
  }

  return {
    years,
    principal,
    gains,
    preTax,
    tax,
    afterTax,
    real,
    rows,
  };
}

export function CompoundInterestCalculator() {
  const [initial, setInitial] = useState('1000000');
  const [monthly, setMonthly] = useState('30000');
  const [rate, setRate] = useState('5');
  const [years, setYears] = useState('20');
  const [timing, setTiming] = useState<ContributionTiming>('end');
  const [tax, setTax] = useState(DEFAULT_TAX_PERCENT);
  const [inflation, setInflation] = useState('');

  const initialField = validateAmount(initial, '初期資金', MAX_AMOUNT_YEN);
  const monthlyField = validateAmount(monthly, '毎月積立額', MAX_AMOUNT_YEN);
  const rateField = validateRate(rate);
  const yearsField = validateYears(years);
  const taxField = validateTax(tax);
  const inflationField = validateInflation(inflation);

  const bothAmountsZero =
    initialField.value === 0 && monthlyField.value === 0;
  const firstInputError =
    initialField.error ??
    monthlyField.error ??
    rateField.error ??
    yearsField.error ??
    taxField.error ??
    inflationField.error;

  const result =
    initialField.value !== null &&
    monthlyField.value !== null &&
    rateField.value !== null &&
    yearsField.value !== null &&
    taxField.value !== null &&
    inflationField.value !== null &&
    !bothAmountsZero
      ? calculateCompound(
          initialField.value,
          monthlyField.value,
          rateField.value,
          yearsField.value,
          timing,
          taxField.value,
          inflationField.value,
        )
      : null;

  const isZeroRate = rateField.value === 0;
  const isBeginning = timing === 'beginning';
  const inflationValue = inflationField.value ?? 0;
  const taxValue = taxField.value ?? 0;

  const statusMessage = result
    ? `試算結果です。元本合計は${formatYen(result.principal)}、税引前評価額は${formatYen(result.preTax)}、運用益は${formatYen(result.gains)}、税引後評価額は${formatYen(result.afterTax)}、インフレ調整後リアル価値は${formatYen(result.real)}です。`
    : bothAmountsZero
      ? '初期資金または毎月積立額のどちらかを1円以上にしてください。'
      : firstInputError ?? '入力内容を確認すると試算結果を表示します。';

  const resetForm = () => {
    setInitial('1000000');
    setMonthly('30000');
    setRate('5');
    setYears('20');
    setTiming('end');
    setTax(DEFAULT_TAX_PERCENT);
    setInflation('');
  };

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
        aria-label="複利・積立 資産形成シミュレーター"
      >
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="compound-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2 id="compound-form-heading" className="font-editorial mt-1 text-xl">
                運用条件を入力
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              01 / 02
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            初期資金と毎月の積立額から、複利運用した場合の評価額を試算します。入力内容は保存・送信されません。
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor="compound-initial"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  初期資金 <span className="text-xs font-normal">円</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0–1兆
                </span>
              </div>
              <input
                id="compound-initial"
                name="initial"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={initial}
                onChange={(event) => setInitial(event.target.value)}
                placeholder="例: 1000000"
                aria-invalid={initialField.error !== null}
                aria-describedby={
                  initialField.error
                    ? 'compound-initial-error'
                    : 'compound-initial-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {initialField.error ? (
                <p
                  id="compound-initial-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {initialField.error}
                </p>
              ) : (
                <p
                  id="compound-initial-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  運用を始める時点の元手です。0円からでも計算できます。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor="compound-monthly"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  毎月積立額 <span className="text-xs font-normal">円</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0–1兆
                </span>
              </div>
              <input
                id="compound-monthly"
                name="monthly"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={monthly}
                onChange={(event) => setMonthly(event.target.value)}
                placeholder="例: 30000"
                aria-invalid={monthlyField.error !== null}
                aria-describedby={
                  monthlyField.error
                    ? 'compound-monthly-error'
                    : 'compound-monthly-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {monthlyField.error ? (
                <p
                  id="compound-monthly-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {monthlyField.error}
                </p>
              ) : (
                <p
                  id="compound-monthly-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  毎月コツコツ積み立てる金額です。0円でも計算できます。
                </p>
              )}
            </div>
          </div>

          {bothAmountsZero && (
            <p
              role="alert"
              className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--accent)]"
            >
              初期資金または毎月積立額のどちらかを1円以上にしてください。
            </p>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="compound-rate"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  年利 <span className="text-xs font-normal">%</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0–100
                </span>
              </div>
              <input
                id="compound-rate"
                name="rate"
                type="number"
                inputMode="decimal"
                min={0}
                max={MAX_RATE_PERCENT}
                step="0.001"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder="例: 5"
                aria-invalid={rateField.error !== null}
                aria-describedby={
                  rateField.error
                    ? 'compound-rate-error'
                    : 'compound-rate-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {rateField.error ? (
                <p
                  id="compound-rate-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {rateField.error}
                </p>
              ) : (
                <p
                  id="compound-rate-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  0%を入力すると利息なしで計算します。年利は一定と仮定します。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="compound-years"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  運用期間 <span className="text-xs font-normal">年</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  1–{MAX_YEARS}
                </span>
              </div>
              <input
                id="compound-years"
                name="years"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_YEARS}
                step="1"
                value={years}
                onChange={(event) => setYears(event.target.value)}
                placeholder="例: 20"
                aria-invalid={yearsField.error !== null}
                aria-describedby={
                  yearsField.error
                    ? 'compound-years-error'
                    : 'compound-years-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {yearsField.error ? (
                <p
                  id="compound-years-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {yearsField.error}
                </p>
              ) : (
                <p
                  id="compound-years-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  1〜{MAX_YEARS}年の整数で入力してください。
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="compound-tax"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  税率 <span className="text-xs font-normal">%</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0–100
                </span>
              </div>
              <input
                id="compound-tax"
                name="tax"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.001"
                value={tax}
                onChange={(event) => setTax(event.target.value)}
                placeholder={`例: ${DEFAULT_TAX_PERCENT}`}
                aria-invalid={taxField.error !== null}
                aria-describedby={
                  taxField.error
                    ? 'compound-tax-error'
                    : 'compound-tax-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {taxField.error ? (
                <p
                  id="compound-tax-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {taxField.error}
                </p>
              ) : (
                <p
                  id="compound-tax-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  運用益にかかる税率です。初期値は20.315%です。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="compound-inflation"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  インフレ率 <span className="text-xs font-normal">%（任意）</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  任意
                </span>
              </div>
              <input
                id="compound-inflation"
                name="inflation"
                type="number"
                inputMode="decimal"
                min={MIN_INFLATION_PERCENT}
                max={MAX_INFLATION_PERCENT}
                step="0.01"
                value={inflation}
                onChange={(event) => setInflation(event.target.value)}
                placeholder="例: 2"
                aria-invalid={inflationField.error !== null}
                aria-describedby={
                  inflationField.error
                    ? 'compound-inflation-error'
                    : 'compound-inflation-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {inflationField.error ? (
                <p
                  id="compound-inflation-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {inflationField.error}
                </p>
              ) : (
                <p
                  id="compound-inflation-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  未入力なら0%として扱います。物価上昇を差し引いた価値を確認できます。
                </p>
              )}
            </div>
          </div>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">
              積立タイミング
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {TIMING_OPTIONS.map((option) => {
                const isSelected = timing === option.value;
                return (
                  <label
                    key={option.value}
                    className={`paper-chip min-w-0 cursor-pointer rounded-sm px-3 py-3 text-left focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                      isSelected ? 'paper-chip-active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="contribution-timing"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setTiming(option.value)}
                      className="sr-only"
                    />
                    <span className="block text-xs font-bold">{option.label}</span>
                    <span className="mt-1 block text-[11px] leading-5">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
            {isZeroRate && (
              <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                年利0%のため、積立タイミングによる評価額の差はありません。
              </p>
            )}
          </fieldset>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="paper-button rounded-sm px-4 py-2 text-xs"
            >
              初期値に戻す
            </button>
            <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
              入力内容は保存・送信されません。
            </p>
          </div>
        </form>

        <section
          aria-labelledby="compound-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="compound-result-heading"
                className="font-editorial mt-1 text-xl"
              >
                試算結果
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              02 / 02
            </span>
          </div>

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {statusMessage}
          </p>

          {result ? (
            <>
              <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                初期資金 {formatYen(initialField.value ?? 0)} / 毎月{' '}
                {formatYen(monthlyField.value ?? 0)} / 年利{' '}
                {rateField.value}% / {result.years}年 /{' '}
                {isBeginning ? '月初積立' : '月末積立'} / 税率 {taxValue}%
                {inflationValue !== 0 &&
                  ` / インフレ率 ${inflationValue}%`}
              </p>

              <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    元本合計
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatYen(result.principal)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    初期資金と積立額の合計です。
                  </p>
                </div>

                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    運用益（税引前）
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatYen(result.gains)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    税引前評価額から元本合計を引いた額です。
                  </p>
                </div>

                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    税引前評価額
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatYen(result.preTax)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    税金を差し引く前の評価額です。
                  </p>
                </div>

                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    税金（概算）
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatYen(result.tax)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    運用益 × 税率 {taxValue}% の概算です。
                  </p>
                </div>

                <div className="min-w-0 border border-[var(--accent)] bg-[var(--accent-soft)] p-4 sm:col-span-2">
                  <p className="font-label text-[9px] text-[var(--accent)]">
                    税引後評価額
                  </p>
                  <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums">
                    {formatYen(result.afterTax)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink)]">
                    運用益にかかる税金を差し引いた評価額です。
                  </p>
                </div>

                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4 sm:col-span-2">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    インフレ調整後リアル価値（税引後）
                  </p>
                  <p className="font-editorial mt-1 break-words text-2xl leading-tight tabular-nums">
                    {formatYen(result.real)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    {inflationValue === 0
                      ? 'インフレ率0%のため、税引後評価額と同じです。'
                      : `インフレ率${inflationValue}%で複利換算し、税引後評価額を現在の購買力に割り引いた目安です。`}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="text-sm font-bold text-[var(--ink)]">
                入力内容を確認してください
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                {bothAmountsZero
                  ? '初期資金または毎月積立額のどちらかを1円以上にしてください。'
                  : firstInputError ??
                    '初期資金・毎月積立額・年利・運用期間・税率を正しく入力すると、ここに試算結果が表示されます。'}
              </p>
            </div>
          )}

          <div
            role="note"
            className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              投資助言ではない。元本保証・利回り保証はない
            </p>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
              この試算は入力条件に基づく概算であり、特定の金融商品の勧誘や個別の投資助言ではありません。実際の運用では手数料、税金の課税方式、価格変動、途中解約などにより結果が異なります。元本保証・利回り保証はありません。
            </p>
          </div>
        </section>
      </section>

      {result && (
        <section
          aria-labelledby="compound-schedule-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Schedule</p>
              <h2
                id="compound-schedule-heading"
                className="font-editorial mt-1 text-xl"
              >
                年次推移
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {result.years} Years
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            1年ごとの元本合計、運用益、税引前評価額、税引後評価額、インフレ調整後のリアル価値です。金額は円単位に丸めています。
          </p>

          <div
            role="region"
            aria-label="年次推移。横にスクロールできます。"
            tabIndex={0}
            className="mt-3 max-h-[26rem] overflow-auto border border-[var(--line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <table className="w-full min-w-[46rem] border-collapse text-right text-xs tabular-nums">
              <caption className="sr-only">
                {result.years}年間の年次推移。年末時点の概算です。
              </caption>
              <thead className="sticky top-0 z-10 bg-[var(--paper-muted)]">
                <tr>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 text-left font-bold text-[var(--ink)]"
                  >
                    年
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    元本合計
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    運用益
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    税引前評価額
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    税引後評価額
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    リアル価値
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr
                    key={row.year}
                    className="border-b border-[var(--line)] last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="px-3 py-2 text-left font-bold text-[var(--ink)]"
                    >
                      {row.year}年目
                    </th>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatYen(row.principal)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatYen(row.gains)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatYen(row.preTax)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatYen(row.afterTax)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatYen(row.real)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            表の中を横にスクロールすると、スマートフォンでもすべての列を確認できます。年次表の税額・税引後評価額は、その年末に解約したと仮定した場合の概算です。
          </p>
        </section>
      )}

      {result && (
        <section
          aria-labelledby="compound-assumptions-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <p className="paper-kicker text-[9px]">Assumptions</p>
          <h2
            id="compound-assumptions-heading"
            className="font-editorial mt-1 text-xl"
          >
            複利計算の前提
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-6 text-[var(--ink-soft)]">
            <li>
              年利を12で割った月利を使い、毎月複利で運用する前提で計算します。ボーナス月の増額や途中の利率変更は考慮しません。
            </li>
            <li>
              毎月の積立は{isBeginning ? '月初' : '月末'}に行い、
              {isBeginning
                ? 'その月から運用を開始する'
                : '翌月から運用を開始する'}
              ものとしています。
              {isZeroRate && ' 年利0%のため、積立タイミングによる差はありません。'}
            </li>
            <li>
              税金は運用益に対して税率{taxValue}%を一律に適用し、最終的に運用益へ課税されると仮定しています。実際の課税額や損益通算、非課税制度の有無は口座や商品によって異なります。
            </li>
            <li>
              インフレ率は年率{inflationValue}%で複利換算し、税引後評価額を現在の購買力に割り引いています。インフレ率が未入力の場合は0%として扱います。
            </li>
            <li>
              購入手数料、信託報酬、売却時の手数料、為替変動、途中売却時の税金などを考慮しない概算です。表示金額は円未満を四捨五入しています。
            </li>
          </ul>
        </section>
      )}
    </div>
  );
}
