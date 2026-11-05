'use client';

import { useState } from 'react';

type PrepaymentMethod = 'shortenTerm' | 'reducePayment';

type ValidationResult = {
  value: number | null;
  error: string | null;
};

type ScheduleResult = {
  months: number;
  totalInterest: number;
  totalPaid: number;
  finalPayment: number;
};

type SimulationInput = {
  balance: number;
  annualRate: number;
  years: number;
  manualPayment: number | null;
  prepayment: number;
  fee: number;
  method: PrepaymentMethod;
};

type SimulationResult = {
  balance: number;
  annualRate: number;
  years: number;
  manualPayment: number | null;
  prepayment: number;
  fee: number;
  method: PrepaymentMethod;
  remainingBalance: number;
  basePayment: number;
  newPayment: number;
  baseline: ScheduleResult;
  after: ScheduleResult;
  interestSaved: number;
  netBenefit: number;
  termReductionMonths: number;
  monthlyReduction: number;
};

const MAX_AMOUNT_YEN = 1_000_000_000_000;
const MAX_RATE_PERCENT = 100;
const MAX_YEARS = 50;
const MAX_TERM_MONTHS = 1200;
const YEN_PER_MONTH = 12;
const numberFormatter = new Intl.NumberFormat('ja-JP');
const GROUPED_DECIMAL_PATTERN =
  /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

const METHOD_OPTIONS: {
  value: PrepaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    value: 'shortenTerm',
    label: '期間短縮型',
    description: '毎月の返済額を変えず、完済までの期間を短くします。',
  },
  {
    value: 'reducePayment',
    label: '返済額軽減型',
    description: '残りの返済期間を変えず、毎月の返済額を下げます。',
  },
];

const DEFAULTS = {
  balance: '30000000',
  rate: '1.5',
  years: '30',
  monthlyPayment: '',
  prepayment: '1000000',
  fee: '0',
};

function formatYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const rounded = Math.round(value);
  return `${numberFormatter.format(rounded === 0 ? 0 : rounded)}円`;
}

function formatMonths(months: number): string {
  const safeMonths = Math.max(0, Math.round(months));
  const years = Math.floor(safeMonths / YEN_PER_MONTH);
  const rest = safeMonths % YEN_PER_MONTH;

  if (years > 0 && rest > 0) {
    return `${years}年${rest}か月`;
  }
  if (years > 0) {
    return `${years}年`;
  }
  return `${rest}か月`;
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

function parseYen(raw: string): number | null {
  const parsed = parseDecimal(raw, true);
  if (parsed === null) {
    return null;
  }

  const rounded = Math.round(parsed);
  if (!Number.isSafeInteger(rounded)) {
    return null;
  }
  return rounded;
}

function validateBalance(raw: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: '現在のローン残高を入力してください。' };
  }

  const parsed = parseYen(normalized);
  if (parsed === null) {
    return {
      value: null,
      error: '現在のローン残高は数値で入力してください。',
    };
  }

  if (parsed < 1) {
    return {
      value: null,
      error: '現在のローン残高は1円以上で入力してください。',
    };
  }

  if (parsed > MAX_AMOUNT_YEN) {
    return {
      value: null,
      error: '現在のローン残高は1兆円以下で入力してください。',
    };
  }

  return { value: parsed, error: null };
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
    return { value: null, error: '残り返済期間を入力してください。' };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null || !Number.isInteger(parsed)) {
    return {
      value: null,
      error: `残り返済期間は1〜${MAX_YEARS}年の整数で入力してください。`,
    };
  }

  if (parsed < 1 || parsed > MAX_YEARS) {
    return {
      value: null,
      error: `残り返済期間は1〜${MAX_YEARS}年の範囲で入力してください。`,
    };
  }

  return { value: parsed, error: null };
}

function validateMonthlyPayment(raw: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: null };
  }

  const parsed = parseYen(normalized);
  if (parsed === null) {
    return {
      value: null,
      error: '毎月返済額は数値で入力してください。',
    };
  }

  if (parsed < 1) {
    return {
      value: null,
      error: '毎月返済額は1円以上で入力してください。',
    };
  }

  if (parsed > MAX_AMOUNT_YEN) {
    return {
      value: null,
      error: '毎月返済額は1兆円以下で入力してください。',
    };
  }

  return { value: parsed, error: null };
}

function validatePrepayment(
  raw: string,
  balance: number | null,
): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: '繰上返済額を入力してください。' };
  }

  const parsed = parseYen(normalized);
  if (parsed === null) {
    return {
      value: null,
      error: '繰上返済額は数値で入力してください。',
    };
  }

  if (parsed < 0) {
    return {
      value: null,
      error: '繰上返済額は0円以上で入力してください。',
    };
  }

  if (parsed > MAX_AMOUNT_YEN) {
    return {
      value: null,
      error: '繰上返済額は1兆円以下で入力してください。',
    };
  }

  if (balance !== null && parsed > balance) {
    return {
      value: null,
      error: '繰上返済額は現在のローン残高以下で入力してください。',
    };
  }

  return { value: parsed, error: null };
}

function validateFee(raw: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: 0, error: null };
  }

  const parsed = parseYen(normalized);
  if (parsed === null) {
    return { value: null, error: '繰上返済手数料は数値で入力してください。' };
  }

  if (parsed < 0) {
    return {
      value: null,
      error: '繰上返済手数料は0円以上で入力してください。',
    };
  }

  if (parsed > MAX_AMOUNT_YEN) {
    return {
      value: null,
      error: '繰上返済手数料は1兆円以下で入力してください。',
    };
  }

  return { value: parsed, error: null };
}

function calculateEqualPayment(
  principal: number,
  monthlyRate: number,
  months: number,
): number {
  if (principal <= 0 || months <= 0) {
    return 0;
  }

  if (monthlyRate === 0) {
    return principal / months;
  }

  const growthMinusOne = Math.expm1(Math.log1p(monthlyRate) * months);
  if (!Number.isFinite(growthMinusOne) || growthMinusOne <= 0) {
    return 0;
  }

  return (principal * monthlyRate * (1 + growthMinusOne)) / growthMinusOne;
}

function calculateSchedule(
  principal: number,
  monthlyRate: number,
  payment: number,
  survivalFactor?: number,
): ScheduleResult | null {
  if (principal <= 0) {
    return { months: 0, totalInterest: 0, totalPaid: 0, finalPayment: 0 };
  }

  if (!Number.isFinite(payment) || payment <= 0) {
    return null;
  }

  if (monthlyRate === 0) {
    const exactMonths = principal / payment;
    const months = Math.max(1, Math.ceil(exactMonths - 1e-9));

    if (!Number.isFinite(months) || months > MAX_TERM_MONTHS) {
      return null;
    }

    const finalPayment = principal - payment * (months - 1);

    return {
      months,
      totalInterest: 0,
      totalPaid: principal,
      finalPayment,
    };
  }

  const factor =
    survivalFactor ?? 1 - (principal * monthlyRate) / payment;

  if (!Number.isFinite(factor) || factor <= 0 || factor >= 1) {
    return null;
  }

  const logGrowth = Math.log1p(monthlyRate);
  const exactMonths = -Math.log(factor) / logGrowth;

  if (!Number.isFinite(exactMonths)) {
    return null;
  }

  const months = Math.max(1, Math.ceil(exactMonths - 1e-9));

  if (months > MAX_TERM_MONTHS) {
    return null;
  }

  const fullPayments = months - 1;
  const remainingBeforeFinal =
    (payment * -Math.expm1(Math.log(factor) + logGrowth * fullPayments)) /
    monthlyRate;
  const finalPayment = remainingBeforeFinal * (1 + monthlyRate);
  const totalPaid = payment * fullPayments + finalPayment;
  const totalInterest = totalPaid - principal;

  if (
    !Number.isFinite(finalPayment) ||
    !Number.isFinite(totalPaid) ||
    !Number.isFinite(totalInterest) ||
    totalInterest < -0.01
  ) {
    return null;
  }

  return {
    months,
    totalInterest: Math.max(0, totalInterest),
    totalPaid,
    finalPayment,
  };
}

function calculateSimulation(input: SimulationInput): SimulationResult | null {
  const months = input.years * YEN_PER_MONTH;
  const monthlyRate = input.annualRate / 100 / YEN_PER_MONTH;
  const logGrowth = monthlyRate === 0 ? 0 : Math.log1p(monthlyRate);
  const autoPayment = calculateEqualPayment(
    input.balance,
    monthlyRate,
    months,
  );
  const basePayment = input.manualPayment ?? autoPayment;

  if (!Number.isFinite(basePayment) || basePayment <= 0) {
    return null;
  }

  if (
    input.manualPayment !== null &&
    monthlyRate > 0 &&
    basePayment <= input.balance * monthlyRate
  ) {
    return null;
  }

  const baseSurvival =
    monthlyRate === 0
      ? undefined
      : input.manualPayment === null
        ? Math.exp(-logGrowth * months)
        : 1 - (input.balance * monthlyRate) / basePayment;
  const baseline = calculateSchedule(
    input.balance,
    monthlyRate,
    basePayment,
    baseSurvival,
  );

  if (baseline === null) {
    return null;
  }

  const remainingBalance = Math.max(0, input.balance - input.prepayment);
  const prepaymentRatio =
    input.balance > 0 ? remainingBalance / input.balance : 0;
  let after: ScheduleResult | null;
  let newPayment: number;

  if (remainingBalance <= 0) {
    after = { months: 0, totalInterest: 0, totalPaid: 0, finalPayment: 0 };
    newPayment = 0;
  } else if (input.prepayment === 0) {
    after = baseline;
    newPayment = basePayment;
  } else if (input.method === 'shortenTerm') {
    const afterSurvival =
      baseSurvival === undefined
        ? undefined
        : prepaymentRatio * baseSurvival + 1 - prepaymentRatio;
    after = calculateSchedule(
      remainingBalance,
      monthlyRate,
      basePayment,
      afterSurvival,
    );
    newPayment = basePayment;
  } else {
    newPayment = calculateEqualPayment(
      remainingBalance,
      monthlyRate,
      baseline.months,
    );
    const afterSurvival =
      monthlyRate === 0
        ? undefined
        : Math.exp(-logGrowth * baseline.months);
    after = calculateSchedule(
      remainingBalance,
      monthlyRate,
      newPayment,
      afterSurvival,
    );
  }

  if (after === null) {
    return null;
  }

  const interestSaved = Math.max(
    0,
    baseline.totalInterest - after.totalInterest,
  );
  const effectiveFee = input.prepayment > 0 ? input.fee : 0;
  const netBenefit = interestSaved - effectiveFee;
  const termReductionMonths = Math.max(
    0,
    baseline.months - after.months,
  );
  const monthlyReduction = Math.max(0, basePayment - newPayment);

  return {
    balance: input.balance,
    annualRate: input.annualRate,
    years: input.years,
    manualPayment: input.manualPayment,
    prepayment: input.prepayment,
    fee: effectiveFee,
    method: input.method,
    remainingBalance,
    basePayment,
    newPayment,
    baseline,
    after,
    interestSaved,
    netBenefit,
    termReductionMonths,
    monthlyReduction,
  };
}

export function PrepaymentSimulator() {
  const [balance, setBalance] = useState(DEFAULTS.balance);
  const [rate, setRate] = useState(DEFAULTS.rate);
  const [years, setYears] = useState(DEFAULTS.years);
  const [monthlyPayment, setMonthlyPayment] = useState(
    DEFAULTS.monthlyPayment,
  );
  const [prepayment, setPrepayment] = useState(DEFAULTS.prepayment);
  const [method, setMethod] = useState<PrepaymentMethod>('shortenTerm');
  const [fee, setFee] = useState(DEFAULTS.fee);

  const balanceField = validateBalance(balance);
  const rateField = validateRate(rate);
  const yearsField = validateYears(years);
  const monthlyField = validateMonthlyPayment(monthlyPayment);
  const prepaymentField = validatePrepayment(
    prepayment,
    balanceField.value,
  );
  const feeField = validateFee(fee);

  const balanceValue = balanceField.value;
  const rateValue = rateField.value;
  const yearsValue = yearsField.value;
  const prepaymentValue = prepaymentField.value;
  const feeValue = feeField.value;
  const monthlyRate =
    rateValue !== null ? rateValue / 100 / YEN_PER_MONTH : null;
  const totalMonths =
    yearsValue !== null ? yearsValue * YEN_PER_MONTH : null;
  const autoPayment =
    balanceValue !== null &&
    monthlyRate !== null &&
    totalMonths !== null
      ? calculateEqualPayment(balanceValue, monthlyRate, totalMonths)
      : null;
  const basePayment = monthlyField.value ?? autoPayment;
  const monthlyInterest =
    balanceValue !== null && monthlyRate !== null
      ? balanceValue * monthlyRate
      : null;
  const paymentTooLow =
    monthlyField.value !== null &&
    monthlyRate !== null &&
    monthlyRate > 0 &&
    monthlyInterest !== null &&
    monthlyField.value <= monthlyInterest;
  const monthlyError =
    monthlyField.error ??
    (paymentTooLow && monthlyInterest !== null
      ? `毎月返済額は毎月の利息（約${formatYen(
          monthlyInterest,
        )}）を上回る金額にしてください。`
      : null);
  const firstInputError =
    balanceField.error ??
    rateField.error ??
    yearsField.error ??
    monthlyError ??
    prepaymentField.error ??
    feeField.error;

  const simulationInput =
    balanceValue !== null &&
    rateValue !== null &&
    yearsValue !== null &&
    prepaymentValue !== null &&
    feeValue !== null &&
    monthlyError === null &&
    basePayment !== null
      ? {
          balance: balanceValue,
          annualRate: rateValue,
          years: yearsValue,
          manualPayment: monthlyField.value,
          prepayment: prepaymentValue,
          fee: feeValue,
          method,
        }
      : null;
  const simulation = simulationInput
    ? calculateSimulation(simulationInput)
    : null;
  const simulationError =
    simulationInput !== null && simulation === null
      ? 'この条件では100年以内に完済できないため試算できません。毎月返済額を増やすか、返済期間を見直してください。'
      : null;

  const statusMessage = (() => {
    if (simulation) {
      if (simulation.method === 'shortenTerm') {
        return `期間短縮型の試算です。繰上返済後の残高は約${formatYen(
          simulation.remainingBalance,
        )}、短縮される期間は約${formatMonths(
          simulation.termReductionMonths,
        )}、軽減される利息は約${formatYen(
          simulation.interestSaved,
        )}、手数料込みの効果は約${formatYen(
          simulation.netBenefit,
        )}です。`;
      }

      return `返済額軽減型の試算です。繰上返済後の残高は約${formatYen(
        simulation.remainingBalance,
      )}、新しい毎月返済額は約${formatYen(
        simulation.newPayment,
      )}、軽減される利息は約${formatYen(
        simulation.interestSaved,
      )}、手数料込みの効果は約${formatYen(
        simulation.netBenefit,
      )}です。`;
    }

    if (simulationError) {
      return simulationError;
    }

    if (firstInputError) {
      return firstInputError;
    }

    return '入力内容を確認すると試算結果を表示します。';
  })();

  const resetForm = () => {
    setBalance(DEFAULTS.balance);
    setRate(DEFAULTS.rate);
    setYears(DEFAULTS.years);
    setMonthlyPayment(DEFAULTS.monthlyPayment);
    setPrepayment(DEFAULTS.prepayment);
    setMethod('shortenTerm');
    setFee(DEFAULTS.fee);
  };

  const manualTermChanged =
    simulation !== null &&
    simulation.manualPayment !== null &&
    simulation.baseline.months !== simulation.years * YEN_PER_MONTH;

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
        aria-label="繰上返済効果シミュレーター"
      >
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="prepayment-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2
                id="prepayment-form-heading"
                className="font-editorial mt-1 text-xl"
              >
                返済条件と繰上返済を入力
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              01 / 02
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            元利均等返済のローンを前提に、今すぐ繰上返済した場合の効果を概算します。入力内容は保存・送信されません。
          </p>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="prepayment-balance"
                className="text-sm font-bold text-[var(--ink)]"
              >
                現在のローン残高
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                1円〜1兆円
              </span>
            </div>
            <input
              id="prepayment-balance"
              name="balance"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
              placeholder="例: 30,000,000"
              aria-invalid={balanceField.error !== null}
              aria-describedby={
                balanceField.error
                  ? 'prepayment-balance-error'
                  : 'prepayment-balance-help'
              }
              className="field-paper mt-2 min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {balanceField.error ? (
              <p
                id="prepayment-balance-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {balanceField.error}
              </p>
            ) : (
              <p
                id="prepayment-balance-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                現在の残高を円単位で入力します。カンマ区切りも使えます。
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="prepayment-rate"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  年利 <span className="text-xs font-normal">%</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0–100
                </span>
              </div>
              <input
                id="prepayment-rate"
                name="rate"
                type="number"
                inputMode="decimal"
                min={0}
                max={MAX_RATE_PERCENT}
                step="0.001"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder="例: 1.5"
                aria-invalid={rateField.error !== null}
                aria-describedby={
                  rateField.error
                    ? 'prepayment-rate-error'
                    : 'prepayment-rate-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {rateField.error ? (
                <p
                  id="prepayment-rate-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {rateField.error}
                </p>
              ) : (
                <p
                  id="prepayment-rate-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  0%を入力すると無利息で計算します。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="prepayment-years"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  残り返済期間 <span className="text-xs font-normal">年</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  1–50
                </span>
              </div>
              <input
                id="prepayment-years"
                name="years"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_YEARS}
                step="1"
                value={years}
                onChange={(event) => setYears(event.target.value)}
                placeholder="例: 30"
                aria-invalid={yearsField.error !== null}
                aria-describedby={
                  yearsField.error
                    ? 'prepayment-years-error'
                    : 'prepayment-years-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {yearsField.error ? (
                <p
                  id="prepayment-years-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {yearsField.error}
                </p>
              ) : (
                <p
                  id="prepayment-years-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  1〜50年の整数で入力してください。
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="prepayment-monthly"
                className="text-sm font-bold text-[var(--ink)]"
              >
                毎月返済額{' '}
                <span className="text-xs font-normal">円（任意）</span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                空欄で自動
              </span>
            </div>
            <input
              id="prepayment-monthly"
              name="monthlyPayment"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={monthlyPayment}
              onChange={(event) => setMonthlyPayment(event.target.value)}
              placeholder="例: 103,536"
              aria-invalid={monthlyError !== null}
              aria-describedby={
                monthlyError
                  ? 'prepayment-monthly-error'
                  : 'prepayment-monthly-help'
              }
              className="field-paper mt-2 min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {monthlyError ? (
              <p
                id="prepayment-monthly-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {monthlyError}
              </p>
            ) : (
              <p
                id="prepayment-monthly-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                {monthlyField.value === null
                  ? autoPayment !== null
                    ? `未入力のため、元利均等で約${formatYen(
                        autoPayment,
                      )}/月を自動計算しています。`
                    : '未入力の場合、他の条件が正しければ元利均等の月額を自動計算します。'
                  : '入力した毎月返済額を固定して試算します。'}
              </p>
            )}
          </div>

          <div className="mt-5 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="prepayment-amount"
                className="text-sm font-bold text-[var(--ink)]"
              >
                繰上返済額 <span className="text-xs font-normal">円</span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                0〜残高
              </span>
            </div>
            <input
              id="prepayment-amount"
              name="prepayment"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={prepayment}
              onChange={(event) => setPrepayment(event.target.value)}
              placeholder="例: 1,000,000"
              aria-invalid={prepaymentField.error !== null}
              aria-describedby={
                prepaymentField.error
                  ? 'prepayment-amount-error'
                  : 'prepayment-amount-help'
              }
              className="field-paper mt-2 min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {prepaymentField.error ? (
              <p
                id="prepayment-amount-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {prepaymentField.error}
              </p>
            ) : (
              <p
                id="prepayment-amount-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                {balanceValue !== null
                  ? `現在の残高（約${formatYen(
                      balanceValue,
                    )}）以下で指定します。0円も入力できます。`
                  : '現在のローン残高以下で指定します。0円も入力できます。'}
              </p>
            )}
          </div>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">
              繰上返済の方式
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {METHOD_OPTIONS.map((option) => {
                const isSelected = method === option.value;
                return (
                  <label
                    key={option.value}
                    className={`paper-chip min-w-0 cursor-pointer rounded-sm px-3 py-3 text-left focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                      isSelected ? 'paper-chip-active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="prepayment-method"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setMethod(option.value)}
                      className="sr-only"
                    />
                    <span className="block text-xs font-bold">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-[11px] leading-5">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="prepayment-fee"
                className="text-sm font-bold text-[var(--ink)]"
              >
                繰上返済手数料{' '}
                <span className="text-xs font-normal">円</span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                0円も可
              </span>
            </div>
            <input
              id="prepayment-fee"
              name="fee"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={fee}
              onChange={(event) => setFee(event.target.value)}
              placeholder="例: 0"
              aria-invalid={feeField.error !== null}
              aria-describedby={
                feeField.error
                  ? 'prepayment-fee-error'
                  : 'prepayment-fee-help'
              }
              className="field-paper mt-2 min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {feeField.error ? (
              <p
                id="prepayment-fee-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {feeField.error}
              </p>
            ) : (
              <p
                id="prepayment-fee-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                未入力・0円、または繰上返済額が0円の場合は手数料なしとして計算します。
              </p>
            )}
          </div>

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
          aria-labelledby="prepayment-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="prepayment-result-heading"
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

          {simulation ? (
            <>
              <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                残高 {formatYen(simulation.balance)} / 年利{' '}
                {simulation.annualRate}% / 残り返済期間 {simulation.years}年 /
                元利均等前提
              </p>

              <div className="mt-3 min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  {simulation.method === 'shortenTerm'
                    ? '短縮される返済期間'
                    : '新しい毎月返済額'}
                </p>

                {simulation.method === 'shortenTerm' ? (
                  <>
                    <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums">
                      {formatMonths(simulation.termReductionMonths)}
                    </p>
                    <p className="mt-2 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                      {simulation.prepayment === 0
                        ? '繰上返済額が0円のため、期間短縮はありません。'
                        : simulation.termReductionMonths > 0
                          ? simulation.after.months > 0
                            ? `返済期間は${formatMonths(
                                simulation.baseline.months,
                              )}から${formatMonths(
                                simulation.after.months,
                              )}へ。${simulation.termReductionMonths}か月分の短縮です。`
                            : `返済期間は${formatMonths(
                                simulation.baseline.months,
                              )}から即時完済へ。${simulation.termReductionMonths}か月分の短縮です。`
                          : '期間短縮は1か月未満です。最終回の返済額が軽減されます。毎月返済額は変わりません。'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums">
                      {simulation.remainingBalance > 0
                        ? formatYen(simulation.newPayment)
                        : '完済'}
                    </p>
                    <p className="mt-2 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                      {simulation.remainingBalance > 0
                        ? `毎月約${formatYen(
                            simulation.monthlyReduction,
                          )}の軽減。返済期間は${formatMonths(
                            simulation.after.months,
                          )}のままです。`
                        : '繰上返済で残高がなくなり、完済となります。'}
                    </p>
                  </>
                )}
              </div>

              <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    繰上返済後の残高
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatYen(simulation.remainingBalance)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    現在の残高から繰上返済額を差し引いた金額です。
                  </p>
                </div>

                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    軽減される利息
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatYen(simulation.interestSaved)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    繰上返済なしと比べた利息合計の差です。
                  </p>
                </div>

                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4 sm:col-span-2">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    手数料込みの効果
                  </p>
                  <p
                    className={`font-editorial mt-1 break-words text-2xl leading-tight tabular-nums ${
                      simulation.netBenefit < 0
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--ink)]'
                    }`}
                  >
                    {formatYen(simulation.netBenefit)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    軽減される利息から繰上返済手数料を差し引いた金額です。繰上返済額（元金の前払い）は含みません。
                  </p>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-[var(--ink)]">
                    {simulation.prepayment === 0
                      ? '繰上返済額が0円のため、手数料は発生しません。'
                      : simulation.netBenefit > 0
                        ? '軽減利息が手数料を上回っています。'
                        : simulation.netBenefit < 0
                          ? '手数料が軽減利息を上回っています。'
                          : simulation.interestSaved === 0 &&
                              simulation.fee === 0
                            ? '軽減利息も手数料も0円です。'
                            : '軽減利息と手数料が同額です。'}
                  </p>
                </div>
              </div>

              {simulation.prepayment === 0 && (
                <p className="mt-3 border-l-2 border-[var(--line-strong)] px-3 py-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                  繰上返済額が0円のため、軽減利息や期間短縮はありません。
                </p>
              )}

              {simulation.annualRate === 0 && (
                <p className="mt-3 border-l-2 border-[var(--line-strong)] px-3 py-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                  年利0%のため、利息の軽減は0円です。期間短縮型では期間、返済額軽減型では毎月返済額の変化を確認してください。
                </p>
              )}

              {manualTermChanged && (
                <p className="mt-3 border-l-2 border-[var(--line-strong)] px-3 py-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                  毎月返済額を手入力したため、繰上返済なしの完済期間は入力上の残り期間ではなく、その返済額で計算した
                  {formatMonths(simulation.baseline.months)}
                  になっています。
                </p>
              )}
            </>
          ) : (
            <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="text-sm font-bold text-[var(--ink)]">
                入力内容を確認してください
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                {simulationError ??
                  firstInputError ??
                  '残高・年利・残り返済期間・繰上返済額を正しく入力すると、ここに試算結果が表示されます。'}
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
              元利均等返済を前提とし、繰上返済は現在の残高に対してすぐに行うものとして計算しています。金融機関の計算方法と異なる場合があるため、実際の繰上返済額・軽減利息・手数料は金融機関の試算をご確認ください。金利変動、日割り利息、端数処理、繰上返済のタイミングなどによって結果は変わります。
            </p>
          </div>
        </section>
      </section>

      {simulation && (
        <section
          aria-labelledby="prepayment-compare-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Comparison</p>
              <h2
                id="prepayment-compare-heading"
                className="font-editorial mt-1 text-xl"
              >
                繰上返済なしとありの比較
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {simulation.method === 'shortenTerm'
                ? '期間短縮型'
                : '返済額軽減型'}
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            同じ残高・金利・毎月返済額を前提に、繰上返済をしない場合と、今すぐ繰上返済する場合を並べています。
          </p>

          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <h3 className="font-label text-[9px] text-[var(--ink-soft)]">
                繰上返済しない場合
              </h3>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <dt className="text-[var(--ink-soft)]">現在の残高</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {formatYen(simulation.balance)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <dt className="text-[var(--ink-soft)]">毎月返済額</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {formatYen(simulation.basePayment)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <dt className="text-[var(--ink-soft)]">残り返済期間</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {formatMonths(simulation.baseline.months)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <dt className="text-[var(--ink-soft)]">利息合計</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {formatYen(simulation.baseline.totalInterest)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <dt className="text-[var(--ink-soft)]">手数料</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {formatYen(0)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[var(--ink-soft)]">利息＋手数料</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {formatYen(simulation.baseline.totalInterest)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="min-w-0 border border-[var(--ink)] bg-[var(--paper)] p-4 shadow-[3px_3px_0_var(--paper-shadow)]">
              <h3 className="font-label text-[9px] text-[var(--accent)]">
                今すぐ繰上返済する場合
              </h3>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <dt className="text-[var(--ink-soft)]">繰上返済後の残高</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {formatYen(simulation.remainingBalance)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <dt className="text-[var(--ink-soft)]">毎月返済額</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {simulation.remainingBalance > 0
                      ? formatYen(
                          simulation.method === 'shortenTerm'
                            ? simulation.basePayment
                            : simulation.newPayment,
                        )
                      : '完済'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <dt className="text-[var(--ink-soft)]">残り返済期間</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {simulation.after.months > 0
                      ? formatMonths(simulation.after.months)
                      : '完済'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <dt className="text-[var(--ink-soft)]">利息合計</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {formatYen(simulation.after.totalInterest)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <dt className="text-[var(--ink-soft)]">手数料</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {formatYen(simulation.fee)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[var(--ink-soft)]">利息＋手数料</dt>
                  <dd className="min-w-0 break-words text-right font-bold tabular-nums">
                    {formatYen(simulation.after.totalInterest + simulation.fee)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="mt-3 border-l-2 border-[var(--accent)] px-3 py-1 text-[11px] leading-6 text-[var(--ink)]">
            「利息＋手数料」の差は
            {formatYen(
              simulation.baseline.totalInterest -
                simulation.after.totalInterest -
                simulation.fee,
            )}
            です。繰上返済額は元金の前払いのため、比較には含めていません。プラスなら手数料を考慮しても軽減効果があります。
          </p>
        </section>
      )}
    </div>
  );
}
