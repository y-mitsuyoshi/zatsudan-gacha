'use client';

import { useState } from 'react';

type AmountUnit = 'man' | 'yen';
type RepaymentType = 'equalPayment' | 'equalPrincipal';

type FieldResult = {
  value: number | null;
  error: string | null;
};

type Simulation = {
  principal: number;
  downPayment: number;
  annualRate: number;
  years: number;
  months: number;
  repaymentType: RepaymentType;
  bonusPayment: number;
  bonusCount: number;
  bonusPrincipal: number;
  monthlyPrincipalPortion: number;
  monthlyPayment: number;
  firstMonthlyPayment: number;
  lastMonthlyPayment: number;
  monthlyInterest: number;
  bonusInterest: number;
  monthlyRepaymentTotal: number;
  bonusRepaymentTotal: number;
  totalInterest: number;
  totalRepayment: number;
  totalWithDownPayment: number;
  annualPayment: number;
};

type CalculationInput = {
  principal: number;
  downPayment: number;
  annualRate: number;
  years: number;
  repaymentType: RepaymentType;
  bonusPayment: number;
  bonusPrincipal: number;
};

const YEN_PER_MAN = 10_000;
const MAX_AMOUNT_YEN = 1_000_000_000_000;
const MIN_RATE = 0;
const MAX_RATE = 100;
const MIN_YEARS = 1;
const MAX_YEARS = 50;
const BONUS_PAYMENTS_PER_YEAR = 2;

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
    description: '毎月の返済額が一定。家計の見通しを立てやすい方式です。',
  },
  {
    value: 'equalPrincipal',
    label: '元金均等返済',
    description: '初回の返済額が最も高く、以降は毎月少しずつ減る方式です。',
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

function formatInputAmount(valueInYen: number, unit: AmountUnit): string {
  if (!Number.isFinite(valueInYen) || valueInYen < 0) {
    return '';
  }
  if (unit === 'yen') {
    return String(Math.round(valueInYen));
  }
  return String(Math.round((valueInYen / YEN_PER_MAN) * 10_000) / 10_000);
}

function toYen(value: number, unit: AmountUnit): number {
  return Math.round(value * (unit === 'man' ? YEN_PER_MAN : 1));
}

function validatePrincipal(raw: string, unit: AmountUnit): FieldResult {
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

  const yen = toYen(parsed, unit);
  if (!Number.isFinite(yen) || !Number.isSafeInteger(yen) || yen > MAX_AMOUNT_YEN) {
    return { value: null, error: '借入額は1兆円以下で入力してください。' };
  }

  if (yen < 1) {
    return { value: null, error: '借入額は1円以上で入力してください。' };
  }

  return { value: yen, error: null };
}

function validateDownPayment(raw: string, unit: AmountUnit): FieldResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return {
      value: null,
      error: '頭金を入力してください。0円の場合は0を入力してください。',
    };
  }

  const parsed = parseDecimal(normalized, true);
  if (parsed === null) {
    return { value: null, error: '頭金は数値で入力してください。' };
  }

  if (parsed < 0) {
    return { value: null, error: '頭金は0円以上で入力してください。' };
  }

  const yen = toYen(parsed, unit);
  if (!Number.isFinite(yen) || !Number.isSafeInteger(yen) || yen > MAX_AMOUNT_YEN) {
    return { value: null, error: '頭金は1兆円以下で入力してください。' };
  }

  if (parsed > 0 && yen < 1) {
    return { value: null, error: '頭金は1円以上で入力してください。' };
  }

  return { value: yen, error: null };
}

function validateRate(raw: string): FieldResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: '年利を入力してください。' };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null) {
    return { value: null, error: '年利は数値で入力してください。' };
  }

  if (parsed < MIN_RATE || parsed > MAX_RATE) {
    return {
      value: null,
      error: '年利は0〜100%の範囲で入力してください。',
    };
  }

  return { value: parsed, error: null };
}

function validateYears(raw: string): FieldResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: '返済期間を入力してください。' };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null || !Number.isInteger(parsed)) {
    return {
      value: null,
      error: '返済期間は1〜50年の整数で入力してください。',
    };
  }

  if (parsed < MIN_YEARS || parsed > MAX_YEARS) {
    return {
      value: null,
      error: '返済期間は1〜50年の範囲で入力してください。',
    };
  }

  return { value: parsed, error: null };
}

function validateBonusPayment(raw: string, unit: AmountUnit): FieldResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: 0, error: null };
  }

  const parsed = parseDecimal(normalized, true);
  if (parsed === null) {
    return {
      value: null,
      error: 'ボーナス月加算額は数値で入力してください。',
    };
  }

  if (parsed < 0) {
    return {
      value: null,
      error: 'ボーナス月加算額は0円以上で入力してください。',
    };
  }

  const yen = toYen(parsed, unit);
  if (!Number.isFinite(yen) || !Number.isSafeInteger(yen) || yen > MAX_AMOUNT_YEN) {
    return {
      value: null,
      error: 'ボーナス月加算額は1兆円以下で入力してください。',
    };
  }

  if (parsed > 0 && yen < 1) {
    return {
      value: null,
      error: 'ボーナス月加算額は1円以上で入力してください。',
    };
  }

  return { value: yen, error: null };
}

function computeBonusPresentValue(
  bonusPayment: number,
  annualRate: number,
  years: number,
): number {
  if (bonusPayment <= 0) {
    return 0;
  }

  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) {
    return bonusPayment * years * BONUS_PAYMENTS_PER_YEAR;
  }

  const logGrowth = Math.log1p(monthlyRate);
  return (
    (bonusPayment * -Math.expm1(-logGrowth * months)) /
    Math.expm1(logGrowth * 6)
  );
}

function calculateHousingLoan(input: CalculationInput): Simulation {
  const {
    principal,
    downPayment,
    annualRate,
    years,
    repaymentType,
    bonusPayment,
    bonusPrincipal,
  } = input;

  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  const isZeroRate = monthlyRate === 0;
  const logGrowth = isZeroRate ? 0 : Math.log1p(monthlyRate);
  const bonusCount = years * BONUS_PAYMENTS_PER_YEAR;
  const monthlyPrincipalPortion = Math.max(0, principal - bonusPrincipal);

  let monthlyPayment = 0;
  let firstMonthlyPayment = 0;
  let lastMonthlyPayment = 0;
  let monthlyInterest = 0;
  let monthlyRepaymentTotal = 0;
  let annualPayment = 0;

  if (repaymentType === 'equalPayment') {
    if (monthlyPrincipalPortion > 0) {
      monthlyPayment = isZeroRate
        ? monthlyPrincipalPortion / months
        : (monthlyPrincipalPortion * monthlyRate) /
          -Math.expm1(-logGrowth * months);
    }

    firstMonthlyPayment = monthlyPayment;
    lastMonthlyPayment = monthlyPayment;
    monthlyInterest = isZeroRate
      ? 0
      : monthlyPayment * months - monthlyPrincipalPortion;
    monthlyRepaymentTotal = isZeroRate
      ? monthlyPrincipalPortion
      : monthlyPayment * months;
    annualPayment =
      monthlyPayment * 12 + bonusPayment * BONUS_PAYMENTS_PER_YEAR;
  } else {
    const monthlyPrincipalPayment = monthlyPrincipalPortion / months;
    firstMonthlyPayment =
      monthlyPrincipalPayment + monthlyPrincipalPortion * monthlyRate;
    lastMonthlyPayment =
      monthlyPrincipalPayment + monthlyPrincipalPayment * monthlyRate;
    monthlyInterest = isZeroRate
      ? 0
      : (monthlyPrincipalPortion * monthlyRate * (months + 1)) / 2;
    monthlyRepaymentTotal = monthlyPrincipalPortion + monthlyInterest;
    annualPayment =
      monthlyPrincipalPayment * 12 +
      monthlyPrincipalPortion * monthlyRate * (12 - 66 / months) +
      bonusPayment * BONUS_PAYMENTS_PER_YEAR;
  }

  const bonusRepaymentTotal = bonusPayment * bonusCount;
  const bonusInterest = bonusRepaymentTotal - bonusPrincipal;
  const totalRepayment = monthlyRepaymentTotal + bonusRepaymentTotal;
  const totalInterest = totalRepayment - principal;

  return {
    principal,
    downPayment,
    annualRate,
    years,
    months,
    repaymentType,
    bonusPayment,
    bonusCount,
    bonusPrincipal,
    monthlyPrincipalPortion,
    monthlyPayment,
    firstMonthlyPayment,
    lastMonthlyPayment,
    monthlyInterest,
    bonusInterest,
    monthlyRepaymentTotal,
    bonusRepaymentTotal,
    totalInterest,
    totalRepayment,
    totalWithDownPayment: downPayment + totalRepayment,
    annualPayment,
  };
}

export function HousingLoanCalculator() {
  const [amount, setAmount] = useState('3000');
  const [unit, setUnit] = useState<AmountUnit>('man');
  const [downPayment, setDownPayment] = useState('500');
  const [rate, setRate] = useState('1.5');
  const [years, setYears] = useState('35');
  const [repaymentType, setRepaymentType] =
    useState<RepaymentType>('equalPayment');
  const [bonusPayment, setBonusPayment] = useState('');

  const amountField = validatePrincipal(amount, unit);
  const downPaymentField = validateDownPayment(downPayment, unit);
  const rateField = validateRate(rate);
  const yearsField = validateYears(years);
  const bonusField = validateBonusPayment(bonusPayment, unit);

  const principal = amountField.value;
  const down = downPaymentField.value;
  const rateValue = rateField.value;
  const yearsValue = yearsField.value;
  const bonusValue = bonusField.value;

  let bonusPrincipal = 0;
  let bonusPlanError: string | null = null;

  if (
    principal !== null &&
    rateValue !== null &&
    yearsValue !== null &&
    bonusValue !== null &&
    bonusValue > 0
  ) {
    const bonusPresentValue = computeBonusPresentValue(
      bonusValue,
      rateValue,
      yearsValue,
    );
    if (bonusPresentValue > principal + 0.5) {
      bonusPlanError =
        'ボーナス月加算額が大きすぎます。ボーナス返済だけで借入額を超えない金額にしてください。';
    } else {
      bonusPrincipal = Math.min(bonusPresentValue, principal);
    }
  }

  const result =
    principal !== null &&
    down !== null &&
    rateValue !== null &&
    yearsValue !== null &&
    bonusValue !== null &&
    bonusPlanError === null
      ? calculateHousingLoan({
          principal,
          downPayment: down,
          annualRate: rateValue,
          years: yearsValue,
          repaymentType,
          bonusPayment: bonusValue,
          bonusPrincipal,
        })
      : null;

  const display = result
    ? (() => {
        const totalRepayment = Math.round(result.totalRepayment);
        return {
          monthly: Math.round(result.monthlyPayment),
          first: Math.round(result.firstMonthlyPayment),
          last: Math.round(result.lastMonthlyPayment),
          bonus: Math.round(result.bonusPayment),
          monthlyTotal: Math.round(result.monthlyRepaymentTotal),
          bonusTotal: Math.round(result.bonusRepaymentTotal),
          annual: Math.round(result.annualPayment),
          totalRepayment,
          totalInterest: totalRepayment - result.principal,
          totalWithDown: result.downPayment + totalRepayment,
        };
      })()
    : null;

  const isEqualPayment = repaymentType === 'equalPayment';
  const repaymentLabel = isEqualPayment ? '元利均等返済' : '元金均等返済';
  const unitLabel = unit === 'man' ? '万円' : '円';

  const firstError =
    amountField.error ??
    downPaymentField.error ??
    rateField.error ??
    yearsField.error ??
    bonusField.error ??
    bonusPlanError;

  const statusMessage =
    result && display
      ? `試算結果です。${
          isEqualPayment
            ? `毎月返済額は約${formatYen(display.monthly)}`
            : `毎月返済額の初回は約${formatYen(display.first)}、最終回は約${formatYen(display.last)}`
        }、ボーナス月加算は${
          result.bonusPayment > 0 ? `約${formatYen(display.bonus)}` : 'なし'
        }、年間返済額は約${formatYen(display.annual)}、総返済額は約${formatYen(display.totalRepayment)}、総利息は約${formatYen(display.totalInterest)}、頭金込み総支払額は約${formatYen(display.totalWithDown)}です。概算です。`
      : `入力内容を確認してください。${firstError ?? ''}`;

  const handleUnitChange = (nextUnit: AmountUnit) => {
    if (nextUnit === unit) {
      return;
    }

    const convert = (raw: string): string => {
      const parsed = parseDecimal(raw, true);
      if (parsed === null || parsed < 0) {
        return raw;
      }
      const yen = unit === 'man' ? parsed * YEN_PER_MAN : parsed;
      return formatInputAmount(yen, nextUnit);
    };

    setAmount((current) => convert(current));
    setDownPayment((current) => convert(current));
    setBonusPayment((current) =>
      normalizeNumberText(current) === '' ? '' : convert(current),
    );
    setUnit(nextUnit);
  };

  const resetForm = () => {
    setAmount('3000');
    setUnit('man');
    setDownPayment('500');
    setRate('1.5');
    setYears('35');
    setRepaymentType('equalPayment');
    setBonusPayment('');
  };

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]"
        aria-label="住宅ローン返済シミュレーター"
      >
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="housing-loan-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2
                id="housing-loan-form-heading"
                className="font-editorial mt-1 text-xl"
              >
                借入条件を入力
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
            借入額・頭金・年利・返済期間を入力すると、毎月とボーナス月の返済額を自動で試算します。入力内容は送信・保存されません。
          </p>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">
              金額の入力単位
            </legend>
            <div className="mt-2 grid w-full grid-cols-2 gap-1 sm:w-44">
              {UNIT_OPTIONS.map((option) => {
                const isSelected = unit === option.value;
                return (
                  <label
                    key={option.value}
                    className={`paper-chip flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-sm px-3 py-2.5 text-xs font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                      isSelected ? 'paper-chip-active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="housing-loan-unit"
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
            <p className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]">
              借入額・頭金・ボーナス加算額に共通の単位です。
            </p>
          </fieldset>

          <div className="mt-5 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="housing-loan-amount"
                className="text-sm font-bold text-[var(--ink)]"
              >
                借入額{' '}
                <span className="text-xs font-normal">（{unitLabel}）</span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                1兆円まで
              </span>
            </div>
            <input
              id="housing-loan-amount"
              name="principal"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={unit === 'man' ? '例: 3000' : '例: 30000000'}
              aria-invalid={amountField.error !== null}
              aria-describedby={
                amountField.error
                  ? 'housing-loan-amount-error'
                  : 'housing-loan-amount-help'
              }
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {amountField.error ? (
              <p
                id="housing-loan-amount-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {amountField.error}
              </p>
            ) : (
              <p
                id="housing-loan-amount-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                {unit === 'man'
                  ? '万円単位で入力します。小数も入力できます。'
                  : '円単位で入力します。円未満は四捨五入します。'}
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor="housing-loan-down-payment"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  頭金{' '}
                  <span className="text-xs font-normal">（{unitLabel}）</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0円以上
                </span>
              </div>
              <input
                id="housing-loan-down-payment"
                name="downPayment"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={downPayment}
                onChange={(event) => setDownPayment(event.target.value)}
                placeholder={unit === 'man' ? '例: 500' : '例: 5000000'}
                aria-invalid={downPaymentField.error !== null}
                aria-describedby={
                  downPaymentField.error
                    ? 'housing-loan-down-payment-error'
                    : 'housing-loan-down-payment-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {downPaymentField.error ? (
                <p
                  id="housing-loan-down-payment-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {downPaymentField.error}
                </p>
              ) : (
                <p
                  id="housing-loan-down-payment-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  頭金は借入額に含めません。0円の場合は0を入力します。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor="housing-loan-rate"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  年利{' '}
                  <span className="text-xs font-normal">（%）</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0〜100
                </span>
              </div>
              <input
                id="housing-loan-rate"
                name="annualRate"
                type="number"
                inputMode="decimal"
                min={MIN_RATE}
                max={MAX_RATE}
                step="0.001"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder="例: 1.5"
                aria-invalid={rateField.error !== null}
                aria-describedby={
                  rateField.error
                    ? 'housing-loan-rate-error'
                    : 'housing-loan-rate-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {rateField.error ? (
                <p
                  id="housing-loan-rate-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {rateField.error}
                </p>
              ) : (
                <p
                  id="housing-loan-rate-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  0%を入力すると無利息で試算します。
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="housing-loan-years"
                className="text-sm font-bold text-[var(--ink)]"
              >
                返済期間{' '}
                <span className="text-xs font-normal">（年）</span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                1〜50
              </span>
            </div>
            <input
              id="housing-loan-years"
              name="years"
              type="number"
              inputMode="numeric"
              min={MIN_YEARS}
              max={MAX_YEARS}
              step="1"
              value={years}
              onChange={(event) => setYears(event.target.value)}
              placeholder="例: 35"
              aria-invalid={yearsField.error !== null}
              aria-describedby={
                yearsField.error
                  ? 'housing-loan-years-error'
                  : 'housing-loan-years-help'
              }
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {yearsField.error ? (
              <p
                id="housing-loan-years-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {yearsField.error}
              </p>
            ) : (
              <p
                id="housing-loan-years-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                1〜50年の整数で入力してください。
              </p>
            )}
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
                      name="housing-loan-repayment-type"
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

          <div className="mt-5 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="housing-loan-bonus"
                className="text-sm font-bold text-[var(--ink)]"
              >
                ボーナス月加算額{' '}
                <span className="text-xs font-normal">
                  （{unitLabel}・任意）
                </span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                年2回
              </span>
            </div>
            <input
              id="housing-loan-bonus"
              name="bonusPayment"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={bonusPayment}
              onChange={(event) => setBonusPayment(event.target.value)}
              placeholder={
                unit === 'man'
                  ? '例: 10（空欄でも可）'
                  : '例: 100000（空欄でも可）'
              }
              aria-invalid={
                bonusField.error !== null || bonusPlanError !== null
              }
              aria-describedby={
                bonusField.error
                  ? 'housing-loan-bonus-error'
                  : bonusPlanError
                    ? 'housing-loan-bonus-plan-error'
                    : 'housing-loan-bonus-help'
              }
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {bonusField.error ? (
              <p
                id="housing-loan-bonus-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {bonusField.error}
              </p>
            ) : bonusPlanError ? (
              <p
                id="housing-loan-bonus-plan-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {bonusPlanError}
              </p>
            ) : (
              <p
                id="housing-loan-bonus-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                6月・12月を想定した加算額です。空欄または0でボーナス返済なしとして計算します。
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
          aria-labelledby="housing-loan-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="housing-loan-result-heading"
                className="font-editorial mt-1 text-xl"
              >
                試算結果
              </h2>
            </div>
            <span
              aria-hidden="true"
              className="font-label text-[9px] text-[var(--ink-soft)]"
            >
              02 / 02
            </span>
          </div>

          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {statusMessage}
          </p>

          {result && display ? (
            <>
              <p className="mt-3 break-words text-[11px] leading-5 text-[var(--ink-soft)]">
                借入 {formatYen(result.principal)} / 頭金{' '}
                {formatYen(result.downPayment)} / 年利 {result.annualRate}% /
                返済期間 {result.years}年 / {repaymentLabel}
                {result.bonusPayment > 0
                  ? ` / ボーナス加算 ${formatYen(result.bonusPayment)}`
                  : ''}
              </p>

              <div className="mt-3 space-y-3">
                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-label text-[9px] text-[var(--ink-soft)]">
                        {isEqualPayment
                          ? '毎月返済額'
                          : '毎月返済額（初回）'}
                      </p>
                      <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums">
                        {formatYen(
                          isEqualPayment ? display.monthly : display.first,
                        )}
                      </p>
                    </div>
                    <p className="font-label shrink-0 text-right text-[9px] text-[var(--ink-soft)]">
                      Monthly
                      <br />
                      Payment
                    </p>
                  </div>
                  <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    {isEqualPayment
                      ? result.bonusPayment > 0
                        ? `ボーナス月はこれに${formatYen(display.bonus)}を加算します。`
                        : '毎月一定の返済額です。ボーナス返済は設定されていません。'
                      : `最終回の目安は${formatYen(display.last)}です。${
                          display.first === display.last
                            ? '毎月の返済額は一定です。'
                            : '元金均等では毎月の返済額が少しずつ減少します。'
                        }`}
                  </p>
                </div>

                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    ボーナス月加算
                  </p>
                  <p className="font-editorial mt-1 break-words text-2xl leading-tight tabular-nums">
                    {formatYen(display.bonus)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    {result.bonusPayment > 0
                      ? `年2回（6月・12月）・返済期間中に計${result.bonusCount}回。毎月返済額に上乗せします。`
                      : 'ボーナス返済は設定されていません。空欄または0円で計算しています。'}
                  </p>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      総返済額
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(display.totalRepayment)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      毎月返済とボーナス返済の合計（頭金を除く）
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      総利息
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(display.totalInterest)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      借入額に対して支払う利息の概算
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      頭金込み総支払額
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(display.totalWithDown)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      頭金と総返済額の合計
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      年間返済額（初年度）
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(display.annual)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      ボーナス2回分を含む初年度の合計
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                内訳：毎月返済分 約{formatYen(display.monthlyTotal)} /
                ボーナス返済分 約{formatYen(display.bonusTotal)}。表示は円未満を四捨五入しています。
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                ボーナス加算額を年2回（6月・12月）の固定支払いとみなし、その分の借入元金を分けて計算しています。返済方式は毎月返済分に適用します。
              </p>
            </>
          ) : (
            <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="text-sm font-bold text-[var(--ink)]">
                入力内容を確認してください
              </p>
              <p className="mt-1 break-words text-xs leading-6 text-[var(--ink-soft)]">
                借入額・頭金・年利・返済期間を正しく入力すると、ここに試算結果が表示されます。ボーナス返済は任意です。
              </p>
              {firstError && (
                <p className="mt-2 break-words text-xs font-bold leading-5 text-[var(--accent)]">
                  {firstError}
                </p>
              )}
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
              表示される金額は入力条件に基づく概算であり、金融機関の審査結果や実際の融資条件を保証するものではありません。金利の変動、各種手数料、団体信用生命保険、繰上返済、金融機関独自の端数処理などにより実際の金額は異なります。契約や借り換えの判断は、金融機関やファイナンシャルプランナーなどの専門家にご確認ください。
            </p>
          </div>
        </section>
      </section>
    </div>
  );
}
