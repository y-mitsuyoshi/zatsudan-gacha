'use client';

import { useState } from 'react';

type AmountUnit = 'man' | 'yen';
type RepaymentType = 'equalPayment' | 'equalPrincipal';

type ValidationResult = {
  value: number | null;
  error: string | null;
};

type YearRow = {
  year: number;
  principal: number;
  interest: number;
  balance: number;
};

type Simulation = {
  principal: number;
  years: number;
  type: RepaymentType;
  monthlyPayment: number;
  firstPayment: number;
  lastPayment: number;
  totalInterest: number;
  totalRepayment: number;
  rows: YearRow[];
};

const MAX_PRINCIPAL_YEN = 1_000_000_000_000;
const YEN_PER_MAN = 10_000;
const numberFormatter = new Intl.NumberFormat('ja-JP');
const GROUPED_DECIMAL_PATTERN =
  /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

const UNIT_OPTIONS: { value: AmountUnit; label: string }[] = [
  { value: 'man', label: '万円' },
  { value: 'yen', label: '円' },
];

const REPAYMENT_OPTIONS: {
  value: RepaymentType;
  label: string;
  description: string;
}[] = [
  {
    value: 'equalPayment',
    label: '元利均等返済',
    description: '毎月の返済額が一定。返済計画を立てやすい方式です。',
  },
  {
    value: 'equalPrincipal',
    label: '元金均等返済',
    description: '元金を均等に返済。初回の負担は重いが利息を抑えやすい方式です。',
  },
];

function formatYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${numberFormatter.format(Math.round(value))}円`;
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

function formatInputNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  const rounded = Math.round(value * 10_000) / 10_000;
  return String(rounded);
}

function validateAmount(raw: string, unit: AmountUnit): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: '借入額を入力してください。' };
  }

  const parsed = parseDecimal(normalized, true);
  if (parsed === null) {
    return { value: null, error: '借入額は数値で入力してください。' };
  }

  if (parsed <= 0) {
    return { value: null, error: '借入額は1円以上で入力してください。' };
  }

  const multiplier = unit === 'man' ? YEN_PER_MAN : 1;
  const yen = Math.round(parsed * multiplier);

  if (!Number.isFinite(yen) || !Number.isSafeInteger(yen) || yen > MAX_PRINCIPAL_YEN) {
    return { value: null, error: '借入額は1兆円以下で入力してください。' };
  }

  if (yen < 1) {
    return { value: null, error: '借入額は1円以上で入力してください。' };
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

  if (parsed < 0 || parsed > 100) {
    return { value: null, error: '年利は0〜100%の範囲で入力してください。' };
  }

  return { value: parsed, error: null };
}

function validateYears(raw: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: '返済期間を入力してください。' };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null || !Number.isInteger(parsed)) {
    return { value: null, error: '返済期間は1〜50年の整数で入力してください。' };
  }

  if (parsed < 1 || parsed > 50) {
    return { value: null, error: '返済期間は1〜50年の範囲で入力してください。' };
  }

  return { value: parsed, error: null };
}

function calculateLoan(
  principal: number,
  annualRate: number,
  years: number,
  type: RepaymentType,
): Simulation {
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  const isZeroRate = monthlyRate === 0;
  const logGrowth = isZeroRate ? 0 : Math.log1p(monthlyRate);
  const growth = isZeroRate ? 1 : Math.exp(logGrowth * months);
  const growthMinusOne = isZeroRate ? months : Math.expm1(logGrowth * months);
  const paymentExact = isZeroRate
    ? principal / months
    : (principal * monthlyRate * growth) / growthMinusOne;
  const monthlyPrincipal = principal / months;

  const rows: YearRow[] = [];
  let previousInterestRounded = 0;
  let previousPrincipalRounded = 0;

  for (let year = 1; year <= years; year += 1) {
    const paidMonths = year * 12;
    let cumulativePrincipalExact: number;
    let cumulativeInterestExact: number;

    if (type === 'equalPayment') {
      if (isZeroRate) {
        cumulativePrincipalExact =
          paidMonths >= months ? principal : (principal * paidMonths) / months;
        cumulativeInterestExact = 0;
      } else if (paidMonths >= months) {
        cumulativePrincipalExact = principal;
        cumulativeInterestExact = months * paymentExact - principal;
      } else {
        cumulativePrincipalExact =
          (principal * Math.expm1(logGrowth * paidMonths)) / growthMinusOne;
        cumulativeInterestExact =
          paidMonths * paymentExact - cumulativePrincipalExact;
      }
    } else {
      cumulativePrincipalExact =
        paidMonths >= months ? principal : (principal * paidMonths) / months;
      cumulativeInterestExact = isZeroRate
        ? 0
        : principal *
          monthlyRate *
          (paidMonths - ((paidMonths - 1) * paidMonths) / (2 * months));
    }

    const roundedInterest = Math.round(cumulativeInterestExact);
    const roundedPrincipal = Math.round(cumulativePrincipalExact);

    rows.push({
      year,
      principal: roundedPrincipal - previousPrincipalRounded,
      interest: roundedInterest - previousInterestRounded,
      balance: principal - roundedPrincipal,
    });

    previousInterestRounded = roundedInterest;
    previousPrincipalRounded = roundedPrincipal;
  }

  const firstPayment =
    type === 'equalPayment'
      ? Math.round(paymentExact)
      : Math.round(monthlyPrincipal + principal * monthlyRate);
  const monthlyPayment = firstPayment;
  const finalPrincipal = months === 1 ? principal : monthlyPrincipal;
  const lastPayment =
    type === 'equalPayment'
      ? firstPayment
      : Math.round(finalPrincipal + finalPrincipal * monthlyRate);

  return {
    principal,
    years,
    type,
    monthlyPayment,
    firstPayment,
    lastPayment,
    totalInterest: previousInterestRounded,
    totalRepayment: principal + previousInterestRounded,
    rows,
  };
}

export function LoanCalculator() {
  const [amount, setAmount] = useState('3000');
  const [unit, setUnit] = useState<AmountUnit>('man');
  const [rate, setRate] = useState('1.5');
  const [years, setYears] = useState('35');
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('equalPayment');

  const amountField = validateAmount(amount, unit);
  const rateField = validateRate(rate);
  const yearsField = validateYears(years);

  const result =
    amountField.value !== null &&
    rateField.value !== null &&
    yearsField.value !== null
      ? calculateLoan(
          amountField.value,
          rateField.value,
          yearsField.value,
          repaymentType,
        )
      : null;

  const isEqualPayment = repaymentType === 'equalPayment';

  const statusMessage = result
    ? isEqualPayment
      ? `元利均等返済の試算です。毎月の返済額は約${formatYen(result.monthlyPayment)}、利息合計は約${formatYen(result.totalInterest)}、返済総額は約${formatYen(result.totalRepayment)}です。`
      : `元金均等返済の試算です。初回の返済額は約${formatYen(result.firstPayment)}、最終回は約${formatYen(result.lastPayment)}、利息合計は約${formatYen(result.totalInterest)}、返済総額は約${formatYen(result.totalRepayment)}です。`
    : '入力内容を確認すると試算結果を表示します。';

  const handleUnitChange = (nextUnit: AmountUnit) => {
    if (nextUnit === unit) {
      return;
    }

    const parsed = parseDecimal(amount, true);
    if (parsed !== null && parsed > 0) {
      const yen = unit === 'man' ? parsed * YEN_PER_MAN : parsed;
      const converted = nextUnit === 'man' ? yen / YEN_PER_MAN : yen;
      setAmount(formatInputNumber(converted));
    }

    setUnit(nextUnit);
  };

  const resetForm = () => {
    setAmount('3000');
    setUnit('man');
    setRate('1.5');
    setYears('35');
    setRepaymentType('equalPayment');
  };

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
        aria-label="ローン返済シミュレーター"
      >
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="loan-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2 id="loan-form-heading" className="font-editorial mt-1 text-xl">
                借入条件を入力
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              01 / 02
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            借入額・年利・返済期間を入力すると、返済額の目安を自動で計算します。入力内容は保存・送信されません。
          </p>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="loan-amount"
                className="text-sm font-bold text-[var(--ink)]"
              >
                借入額
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                1円〜1兆円
              </span>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                id="loan-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={unit === 'man' ? '例: 3000' : '例: 30000000'}
                aria-invalid={amountField.error !== null}
                aria-describedby={
                  amountField.error ? 'loan-amount-error' : 'loan-amount-help'
                }
                className="field-paper min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
              />

              <fieldset className="min-w-0">
                <legend className="sr-only">借入額の単位</legend>
                <div className="grid grid-cols-2 gap-1 sm:w-32">
                  {UNIT_OPTIONS.map((option) => {
                    const isSelected = unit === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`paper-chip flex min-w-0 cursor-pointer items-center justify-center rounded-sm px-3 py-3 text-xs font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                          isSelected ? 'paper-chip-active' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="amount-unit"
                          value={option.value}
                          checked={isSelected}
                          onChange={() => handleUnitChange(option.value)}
                          className="sr-only"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            {amountField.error ? (
              <p
                id="loan-amount-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {amountField.error}
              </p>
            ) : (
              <p
                id="loan-amount-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                {unit === 'man'
                  ? '万円単位で入力します。小数も入力できます。'
                  : '円単位で入力します。小数は円未満を四捨五入します。'}
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="loan-rate"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  年利 <span className="text-xs font-normal">%</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0–100
                </span>
              </div>
              <input
                id="loan-rate"
                name="rate"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.001"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder="例: 1.5"
                aria-invalid={rateField.error !== null}
                aria-describedby={
                  rateField.error ? 'loan-rate-error' : 'loan-rate-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {rateField.error ? (
                <p
                  id="loan-rate-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {rateField.error}
                </p>
              ) : (
                <p
                  id="loan-rate-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  0%を入力すると無利息で計算します。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="loan-years"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  返済期間 <span className="text-xs font-normal">年</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  1–50
                </span>
              </div>
              <input
                id="loan-years"
                name="years"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                step="1"
                value={years}
                onChange={(event) => setYears(event.target.value)}
                placeholder="例: 35"
                aria-invalid={yearsField.error !== null}
                aria-describedby={
                  yearsField.error ? 'loan-years-error' : 'loan-years-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {yearsField.error ? (
                <p
                  id="loan-years-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {yearsField.error}
                </p>
              ) : (
                <p
                  id="loan-years-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  1〜50年の整数で入力してください。
                </p>
              )}
            </div>
          </div>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">
              返済方式
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {REPAYMENT_OPTIONS.map((option) => {
                const isSelected = repaymentType === option.value;
                return (
                  <label
                    key={option.value}
                    className={`paper-chip min-w-0 cursor-pointer rounded-sm px-3 py-3 text-left focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                      isSelected ? 'paper-chip-active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="repayment-type"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setRepaymentType(option.value)}
                      className="sr-only"
                    />
                    <span className="block text-xs font-bold">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-[11px] leading-5 opacity-80">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
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
          aria-labelledby="loan-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="loan-result-heading"
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
                借入 {formatYen(result.principal)} / 年利 {rateField.value}% /
                返済期間 {result.years}年 /{' '}
                {isEqualPayment ? '元利均等返済' : '元金均等返済'}
              </p>

              <div className="mt-3 space-y-3">
                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    {isEqualPayment
                      ? '毎月の返済額'
                      : '毎月の返済額（初回・最終回）'}
                  </p>

                  {isEqualPayment ? (
                    <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums">
                      {formatYen(result.monthlyPayment)}
                    </p>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[var(--ink-soft)]">
                          初回
                        </p>
                        <p className="font-editorial mt-0.5 break-words text-xl leading-tight tabular-nums">
                          {formatYen(result.firstPayment)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[var(--ink-soft)]">
                          最終回
                        </p>
                        <p className="font-editorial mt-0.5 break-words text-xl leading-tight tabular-nums">
                          {formatYen(result.lastPayment)}
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    {isEqualPayment
                      ? '毎月一定の目安です。最終回は端数調整で前後することがあります。'
                      : `返済額は約${formatYen(result.lastPayment)}〜${formatYen(result.firstPayment)}の範囲で毎月減少します。`}
                  </p>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      借入元金
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.principal)}
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      利息合計
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.totalInterest)}
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4 sm:col-span-2">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      返済総額
                    </p>
                    <p className="font-editorial mt-1 break-words text-2xl leading-tight tabular-nums">
                      {formatYen(result.totalRepayment)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      借入元金と利息合計の合計です。
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="text-sm font-bold text-[var(--ink)]">
                入力内容を確認してください
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                借入額・年利・返済期間を正しく入力すると、ここに試算結果が表示されます。
              </p>
            </div>
          )}

          <div
            role="note"
            className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              この試算は概算です
            </p>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
              実際のローンでは、金利の変動、各種手数料、団体信用生命保険、繰上返済、金融機関独自の端数処理などにより金額が異なります。特定の金融商品の勧誘や個別の金融助言ではありません。契約前に金融機関や専門家へご確認ください。
            </p>
          </div>
        </section>
      </section>

      {result && (
        <section
          aria-labelledby="loan-schedule-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Schedule</p>
              <h2
                id="loan-schedule-heading"
                className="font-editorial mt-1 text-xl"
              >
                年次返済内訳
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {result.years} Years
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            1年ごとの元金返済額・利息・年末残高です。金額は円単位に丸めています。
          </p>

          <div
            role="region"
            aria-label="年次返済内訳。横にスクロールできます。"
            tabIndex={0}
            className="mt-3 max-h-[26rem] overflow-auto border border-[var(--line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <table className="w-full min-w-[38rem] border-collapse text-right text-xs tabular-nums">
              <caption className="sr-only">
                {result.years}年間の年次返済内訳
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
                    元金
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    利息
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    年末残高
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
                    <td className="whitespace-nowrap px-3 py-2">{formatYen(row.principal)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatYen(row.interest)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatYen(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            表の中を横にスクロールすると、スマートフォンでも残りの列を確認できます。
          </p>
        </section>
      )}
    </div>
  );
}
