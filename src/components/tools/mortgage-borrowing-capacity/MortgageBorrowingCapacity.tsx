'use client';

import { useState } from 'react';

const YEN_PER_MAN = 10_000;
const MAX_MAN = 1_000_000;
const MAX_RATE = 100;
const MAX_YEARS = 50;
const COMFORTABLE_BURDEN_RATE = 20;
const PRESET_BURDEN_RATES = [20, 25, 30, 35] as const;

const numberFormatter = new Intl.NumberFormat('ja-JP');
const GROUPED_DECIMAL_PATTERN =
  /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

type ValidationResult = {
  value: number | null;
  error: string | null;
};

type SimulationInput = {
  incomeYen: number;
  burdenRate: number;
  annualRate: number;
  years: number;
  downPaymentYen: number;
  purchaseCostRate: number;
  existingDebtYen: number;
  bonusYen: number;
};

type Simulation = {
  annualCapacity: number;
  monthlyCapacity: number;
  bonusAnnual: number;
  borrowingCapacity: number;
  purchaseCapacity: number;
  purchaseCosts: number;
  comfortableMonthly: number;
};

type MoneyOptions = {
  optional?: boolean;
  minMan: number;
  maxMan: number;
};

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

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${numberFormatter.format(Math.round(value))}円`;
}

function validateMoney(
  raw: string,
  label: string,
  options: MoneyOptions,
): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    if (options.optional) {
      return { value: 0, error: null };
    }
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized, true);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < options.minMan) {
    return {
      value: null,
      error: `${label}は${formatNumber(options.minMan)}万円以上で入力してください。`,
    };
  }

  if (parsed > options.maxMan) {
    return {
      value: null,
      error: `${label}は${formatNumber(options.maxMan)}万円（100億円）以下で入力してください。`,
    };
  }

  const yen = Math.round(parsed * YEN_PER_MAN);
  if (!Number.isFinite(yen) || !Number.isSafeInteger(yen)) {
    return {
      value: null,
      error: `${label}が大きすぎます。金額を小さくしてください。`,
    };
  }

  return { value: yen, error: null };
}

function validatePercent(raw: string, label: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < 0 || parsed > MAX_RATE) {
    return {
      value: null,
      error: `${label}は0〜${MAX_RATE}%の範囲で入力してください。`,
    };
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
    return {
      value: null,
      error: '返済期間は1〜50年の整数で入力してください。',
    };
  }

  if (parsed < 1 || parsed > MAX_YEARS) {
    return {
      value: null,
      error: '返済期間は1〜50年の範囲で入力してください。',
    };
  }

  return { value: parsed, error: null };
}

function monthlyAnnuityPresentValue(
  payment: number,
  monthlyRate: number,
  months: number,
): number {
  if (payment === 0 || months <= 0) {
    return 0;
  }
  if (monthlyRate === 0) {
    return payment * months;
  }

  const logGrowth = Math.log1p(monthlyRate);
  return (payment * -Math.expm1(-logGrowth * months)) / monthlyRate;
}

function bonusAnnuityPresentValue(
  annualPayment: number,
  monthlyRate: number,
  months: number,
): number {
  if (annualPayment === 0 || months <= 0) {
    return 0;
  }
  if (monthlyRate === 0) {
    return annualPayment * (months / 12);
  }

  const logGrowth = Math.log1p(monthlyRate);
  const discountFactor = -Math.expm1(-logGrowth * months);
  const annualGrowth = Math.expm1(logGrowth * 12);
  return (annualPayment * discountFactor) / annualGrowth;
}

function calculateSimulation(input: SimulationInput): Simulation {
  const annualCapacity = Math.max(
    0,
    input.incomeYen * (input.burdenRate / 100) - input.existingDebtYen,
  );
  const bonusAnnual = Math.min(input.bonusYen, annualCapacity);
  const monthlyCapacity = (annualCapacity - bonusAnnual) / 12;
  const months = input.years * 12;
  const monthlyRate = input.annualRate / 100 / 12;

  const borrowingCapacity =
    monthlyAnnuityPresentValue(monthlyCapacity, monthlyRate, months) +
    bonusAnnuityPresentValue(bonusAnnual, monthlyRate, months);
  const purchaseCapacity =
    (borrowingCapacity + input.downPaymentYen) /
    (1 + input.purchaseCostRate / 100);
  const purchaseCosts =
    purchaseCapacity * (input.purchaseCostRate / 100);
  const comfortableAnnual = Math.max(
    0,
    input.incomeYen * (COMFORTABLE_BURDEN_RATE / 100) - input.existingDebtYen,
  );

  return {
    annualCapacity,
    monthlyCapacity,
    bonusAnnual,
    borrowingCapacity,
    purchaseCapacity,
    purchaseCosts,
    comfortableMonthly: comfortableAnnual / 12,
  };
}

export function MortgageBorrowingCapacity() {
  const [income, setIncome] = useState('600');
  const [burdenRate, setBurdenRate] = useState('25');
  const [annualRate, setAnnualRate] = useState('1.5');
  const [years, setYears] = useState('35');
  const [downPayment, setDownPayment] = useState('500');
  const [purchaseCostRate, setPurchaseCostRate] = useState('5');
  const [existingDebt, setExistingDebt] = useState('0');
  const [bonus, setBonus] = useState('');

  const incomeField = validateMoney(income, '年収', {
    minMan: 1,
    maxMan: MAX_MAN,
  });
  const burdenField = validatePercent(burdenRate, '返済負担率');
  const annualRateField = validatePercent(annualRate, '金利');
  const yearsField = validateYears(years);
  const downPaymentField = validateMoney(downPayment, '頭金', {
    optional: true,
    minMan: 0,
    maxMan: MAX_MAN,
  });
  const purchaseCostField = validatePercent(
    purchaseCostRate,
    '購入諸費用率',
  );
  const existingDebtField = validateMoney(existingDebt, '既存借入の年間返済額', {
    optional: true,
    minMan: 0,
    maxMan: MAX_MAN,
  });
  const bonusBaseField = validateMoney(bonus, 'ボーナス返済額', {
    optional: true,
    minMan: 0,
    maxMan: MAX_MAN,
  });

  const annualCapacityForValidation =
    incomeField.value !== null &&
    burdenField.value !== null &&
    existingDebtField.value !== null
      ? Math.max(
          0,
          incomeField.value * (burdenField.value / 100) -
            existingDebtField.value,
        )
      : null;

  const bonusField =
    bonusBaseField.error === null &&
    bonusBaseField.value !== null &&
    annualCapacityForValidation !== null &&
    bonusBaseField.value > annualCapacityForValidation
      ? {
          value: null,
          error: `ボーナス返済額は年間返済可能額（${formatYen(
            annualCapacityForValidation,
          )}）以下で入力してください。`,
        }
      : bonusBaseField;

  const incomeYen = incomeField.value;
  const burdenPercent = burdenField.value;
  const annualRatePercent = annualRateField.value;
  const repaymentYears = yearsField.value;
  const downPaymentYen = downPaymentField.value;
  const purchaseCostPercent = purchaseCostField.value;
  const existingDebtYen = existingDebtField.value;
  const bonusYen = bonusField.value;

  const result =
    incomeYen !== null &&
    burdenPercent !== null &&
    annualRatePercent !== null &&
    repaymentYears !== null &&
    downPaymentYen !== null &&
    purchaseCostPercent !== null &&
    existingDebtYen !== null &&
    bonusYen !== null
      ? calculateSimulation({
          incomeYen,
          burdenRate: burdenPercent,
          annualRate: annualRatePercent,
          years: repaymentYears,
          downPaymentYen,
          purchaseCostRate: purchaseCostPercent,
          existingDebtYen,
          bonusYen,
        })
      : null;

  const statusMessage = result
    ? `年間返済可能額は約${formatYen(
        result.annualCapacity,
      )}、月額返済可能額は約${formatYen(
        result.monthlyCapacity,
      )}、借入可能額の概算は約${formatYen(
        result.borrowingCapacity,
      )}、物件購入可能額は約${formatYen(
        result.purchaseCapacity,
      )}です。無理のない返済額の目安は月額約${formatYen(
        result.comfortableMonthly,
      )}です。`
    : '入力内容を確認すると試算結果を表示します。';

  const resetForm = () => {
    setIncome('600');
    setBurdenRate('25');
    setAnnualRate('1.5');
    setYears('35');
    setDownPayment('500');
    setPurchaseCostRate('5');
    setExistingDebt('0');
    setBonus('');
  };

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]"
        aria-label="住宅ローン借入可能額シミュレーター"
      >
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="mortgage-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2
                id="mortgage-form-heading"
                className="font-editorial mt-1 text-xl"
              >
                年収と返済条件を入力
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
            金額は万円単位で入力します。入力内容はその場で計算に反映され、サーバーへ送信・保存されません。
          </p>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="mortgage-income"
                className="text-sm font-bold text-[var(--ink)]"
              >
                年収 <span className="text-xs font-normal">（税込）</span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                1万円〜100億円
              </span>
            </div>
            <div className="relative mt-2">
              <input
                id="mortgage-income"
                name="income"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={income}
                onChange={(event) => setIncome(event.target.value)}
                placeholder="例: 600"
                aria-invalid={incomeField.error !== null}
                aria-describedby={
                  incomeField.error
                    ? 'mortgage-income-error'
                    : 'mortgage-income-help'
                }
                className="field-paper rounded-sm px-3 py-3 pr-12 text-base tabular-nums"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--ink-soft)]"
              >
                万円
              </span>
            </div>
            {incomeField.error ? (
              <p
                id="mortgage-income-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {incomeField.error}
              </p>
            ) : (
              <p
                id="mortgage-income-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                社会保険料や税金を差し引く前の年収を入力してください。
              </p>
            )}
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="mortgage-burden-rate"
                className="text-sm font-bold text-[var(--ink)]"
              >
                返済負担率
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                0–100%
              </span>
            </div>
            <div className="relative mt-2">
              <input
                id="mortgage-burden-rate"
                name="burden-rate"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={burdenRate}
                onChange={(event) => setBurdenRate(event.target.value)}
                placeholder="例: 25"
                aria-invalid={burdenField.error !== null}
                aria-describedby={
                  burdenField.error
                    ? 'mortgage-burden-rate-error'
                    : 'mortgage-burden-rate-help'
                }
                className="field-paper rounded-sm px-3 py-3 pr-10 text-base tabular-nums"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--ink-soft)]"
              >
                %
              </span>
            </div>

            <div
              role="group"
              aria-label="返済負担率のプリセット"
              className="mt-2 grid grid-cols-4 gap-1.5"
            >
              {PRESET_BURDEN_RATES.map((preset) => {
                const isSelected = burdenField.value === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setBurdenRate(String(preset))}
                    className={`paper-chip min-h-11 rounded-sm px-2 py-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                      isSelected ? 'paper-chip-active' : ''
                    }`}
                  >
                    {preset}%
                  </button>
                );
              })}
            </div>

            {burdenField.error ? (
              <p
                id="mortgage-burden-rate-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {burdenField.error}
              </p>
            ) : (
              <p
                id="mortgage-burden-rate-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                年収に占める年間返済額の割合です。20〜35%が一般的な目安で、数値を自由に変更できます。
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor="mortgage-annual-rate"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  金利 <span className="text-xs font-normal">（年利）</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0–100%
                </span>
              </div>
              <div className="relative mt-2">
                <input
                  id="mortgage-annual-rate"
                  name="annual-rate"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={annualRate}
                  onChange={(event) => setAnnualRate(event.target.value)}
                  placeholder="例: 1.5"
                  aria-invalid={annualRateField.error !== null}
                  aria-describedby={
                    annualRateField.error
                      ? 'mortgage-annual-rate-error'
                      : 'mortgage-annual-rate-help'
                  }
                  className="field-paper rounded-sm px-3 py-3 pr-10 text-base tabular-nums"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--ink-soft)]"
                >
                  %
                </span>
              </div>
              {annualRateField.error ? (
                <p
                  id="mortgage-annual-rate-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {annualRateField.error}
                </p>
              ) : (
                <p
                  id="mortgage-annual-rate-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  0%を入力すると無利息として計算します。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor="mortgage-years"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  返済期間
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  1–50年
                </span>
              </div>
              <div className="relative mt-2">
                <input
                  id="mortgage-years"
                  name="years"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={years}
                  onChange={(event) => setYears(event.target.value)}
                  placeholder="例: 35"
                  aria-invalid={yearsField.error !== null}
                  aria-describedby={
                    yearsField.error
                      ? 'mortgage-years-error'
                      : 'mortgage-years-help'
                  }
                  className="field-paper rounded-sm px-3 py-3 pr-10 text-base tabular-nums"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--ink-soft)]"
                >
                  年
                </span>
              </div>
              {yearsField.error ? (
                <p
                  id="mortgage-years-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {yearsField.error}
                </p>
              ) : (
                <p
                  id="mortgage-years-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  1〜50年の整数で入力してください。
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor="mortgage-down-payment"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  頭金
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0円〜
                </span>
              </div>
              <div className="relative mt-2">
                <input
                  id="mortgage-down-payment"
                  name="down-payment"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={downPayment}
                  onChange={(event) => setDownPayment(event.target.value)}
                  placeholder="例: 500"
                  aria-invalid={downPaymentField.error !== null}
                  aria-describedby={
                    downPaymentField.error
                      ? 'mortgage-down-payment-error'
                      : 'mortgage-down-payment-help'
                  }
                  className="field-paper rounded-sm px-3 py-3 pr-12 text-base tabular-nums"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--ink-soft)]"
                >
                  万円
                </span>
              </div>
              {downPaymentField.error ? (
                <p
                  id="mortgage-down-payment-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {downPaymentField.error}
                </p>
              ) : (
                <p
                  id="mortgage-down-payment-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  自己資金のうち物件購入に充てる金額です。空欄は0円として扱います。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor="mortgage-purchase-cost"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  購入諸費用率
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0–100%
                </span>
              </div>
              <div className="relative mt-2">
                <input
                  id="mortgage-purchase-cost"
                  name="purchase-cost-rate"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={purchaseCostRate}
                  onChange={(event) =>
                    setPurchaseCostRate(event.target.value)
                  }
                  placeholder="例: 5"
                  aria-invalid={purchaseCostField.error !== null}
                  aria-describedby={
                    purchaseCostField.error
                      ? 'mortgage-purchase-cost-error'
                      : 'mortgage-purchase-cost-help'
                  }
                  className="field-paper rounded-sm px-3 py-3 pr-10 text-base tabular-nums"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--ink-soft)]"
                >
                  %
                </span>
              </div>
              {purchaseCostField.error ? (
                <p
                  id="mortgage-purchase-cost-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {purchaseCostField.error}
                </p>
              ) : (
                <p
                  id="mortgage-purchase-cost-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  仲介手数料・登記・融資手数料などの目安です。物件価格に対する割合で入力します。
                </p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="mortgage-existing-debt"
                className="text-sm font-bold text-[var(--ink)]"
              >
                既存借入の年間返済額
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                任意
              </span>
            </div>
            <div className="relative mt-2">
              <input
                id="mortgage-existing-debt"
                name="existing-debt"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={existingDebt}
                onChange={(event) => setExistingDebt(event.target.value)}
                placeholder="例: 0"
                aria-invalid={existingDebtField.error !== null}
                aria-describedby={
                  existingDebtField.error
                    ? 'mortgage-existing-debt-error'
                    : 'mortgage-existing-debt-help'
                }
                className="field-paper rounded-sm px-3 py-3 pr-12 text-base tabular-nums"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--ink-soft)]"
              >
                万円
              </span>
            </div>
            {existingDebtField.error ? (
              <p
                id="mortgage-existing-debt-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {existingDebtField.error}
              </p>
            ) : (
              <p
                id="mortgage-existing-debt-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                自動車ローンやカードローンなど、すでにある借入の年間返済額を入力します。空欄は0円です。
              </p>
            )}
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="mortgage-bonus"
                className="text-sm font-bold text-[var(--ink)]"
              >
                ボーナス返済額 <span className="text-xs font-normal">（年間・任意）</span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                任意
              </span>
            </div>
            <div className="relative mt-2">
              <input
                id="mortgage-bonus"
                name="bonus-payment"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={bonus}
                onChange={(event) => setBonus(event.target.value)}
                placeholder="例: 20（未入力なら0円）"
                aria-invalid={bonusField.error !== null}
                aria-describedby={
                  bonusField.error
                    ? 'mortgage-bonus-error'
                    : 'mortgage-bonus-help'
                }
                className="field-paper rounded-sm px-3 py-3 pr-12 text-base tabular-nums"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--ink-soft)]"
              >
                万円
              </span>
            </div>
            {bonusField.error ? (
              <p
                id="mortgage-bonus-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {bonusField.error}
              </p>
            ) : (
              <p
                id="mortgage-bonus-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                ボーナス月に追加で返す年間金額です。入力すると月々の返済可能額から差し引いて試算します。
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
          aria-labelledby="mortgage-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="mortgage-result-heading"
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

          {result ? (
            <>
              <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                年収 {formatYen(incomeYen ?? 0)} / 返済負担率{' '}
                {burdenPercent}% / 年利 {annualRatePercent}% / 返済期間{' '}
                {repaymentYears}年
                {result.bonusAnnual > 0
                  ? ` / ボーナス返済 ${formatYen(result.bonusAnnual)}（年額）`
                  : ''}
              </p>

              <div className="mt-3 space-y-3">
                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    借入可能額の概算
                  </p>
                  <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums">
                    {formatYen(result.borrowingCapacity)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    元利均等返済で、返済可能額を現在価値に換算した概算です。
                  </p>
                </div>

                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    物件購入可能額
                  </p>
                  <p className="font-editorial mt-1 break-words text-2xl leading-tight tabular-nums">
                    {formatYen(result.purchaseCapacity)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    頭金と借入可能額で賄える物件価格の目安です。購入諸費用の目安は約
                    {formatYen(result.purchaseCosts)}です。
                  </p>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      年間返済可能額
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.annualCapacity)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      返済負担率の上限から既存借入を差し引いた額です。
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      月額返済可能額
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.monthlyCapacity)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      {result.bonusAnnual > 0
                        ? 'ボーナス返済を除いた月々の上限です。'
                        : '年間返済可能額を12か月で割った金額です。'}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 border border-[var(--line-strong)] bg-[var(--paper-muted)] p-4">
                  <div className="flex items-end justify-between gap-3">
                    <p className="font-label text-[9px] text-[var(--accent-hover)]">
                      無理のない返済額の目安
                    </p>
                    <span className="font-label text-[9px] text-[var(--ink-soft)]">
                      返済負担率20%
                    </span>
                  </div>
                  <p className="font-editorial mt-1 break-words text-2xl leading-tight tabular-nums">
                    月額 {formatYen(result.comfortableMonthly)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    年収の20%を返済に充てると仮定した場合の目安です。ボーナス返済は別に考えてください。
                  </p>
                </div>
              </div>

              {result.annualCapacity === 0 && existingDebtYen !== null && existingDebtYen > 0 && (
                <p className="mt-3 border border-[var(--line)] bg-[var(--paper-muted)] px-4 py-3 text-[11px] leading-6 text-[var(--ink)]">
                  既存借入の年間返済額が返済負担率の上限に達しているため、新規借入の余力は0円と試算されます。
                </p>
              )}
            </>
          ) : (
            <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="text-sm font-bold text-[var(--ink)]">
                入力内容を確認してください
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                年収・返済負担率・金利・返済期間などの入力がすべて有効になると、ここに試算結果が表示されます。
              </p>
            </div>
          )}

          <div
            role="note"
            className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              金融機関の審査を保証しない概算です
            </p>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
              実際に借入できる金額は、金融機関が年齢・勤務状況・信用情報・担保評価などを審査して決定します。金利の変動、税・保険・手数料、繰上返済なども結果に影響します。契約前に必ず金融機関や専門家へご確認ください。
            </p>
          </div>
        </section>
      </section>

      <section
        aria-labelledby="mortgage-formula-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Assumptions</p>
            <h2
              id="mortgage-formula-heading"
              className="font-editorial mt-1 text-xl"
            >
              計算式と前提
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            Formula
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <dl className="space-y-3">
            <div className="border border-[var(--line)] bg-[var(--paper)] p-4">
              <dt className="text-xs font-bold text-[var(--ink)]">
                年間返済可能額
              </dt>
              <dd className="mt-1 text-[11px] leading-6 text-[var(--ink-soft)]">
                年収 ×（返済負担率 ÷ 100）− 既存借入の年間返済額。0円未満の場合は0円として扱います。
              </dd>
            </div>

            <div className="border border-[var(--line)] bg-[var(--paper)] p-4">
              <dt className="text-xs font-bold text-[var(--ink)]">
                月額返済可能額
              </dt>
              <dd className="mt-1 text-[11px] leading-6 text-[var(--ink-soft)]">
                （年間返済可能額 − ボーナス返済額（年間））÷ 12。ボーナス返済を入力しない場合は年間返済可能額 ÷ 12です。
              </dd>
            </div>

            <div className="border border-[var(--line)] bg-[var(--paper)] p-4">
              <dt className="text-xs font-bold text-[var(--ink)]">
                借入可能額の概算
              </dt>
              <dd className="mt-1 text-[11px] leading-6 text-[var(--ink-soft)]">
                月額返済可能額 × 年金現価係数 + ボーナス返済額（年間） × ボーナス現価係数。元利均等返済を前提としています。
              </dd>
            </div>

            <div className="border border-[var(--line)] bg-[var(--paper)] p-4">
              <dt className="text-xs font-bold text-[var(--ink)]">
                物件購入可能額
              </dt>
              <dd className="mt-1 text-[11px] leading-6 text-[var(--ink-soft)]">
                （借入可能額 + 頭金）÷（1 + 購入諸費用率 ÷ 100）。購入諸費用が物件価格に連動すると仮定した概算です。
              </dd>
            </div>

            <div className="border border-[var(--line)] bg-[var(--paper)] p-4">
              <dt className="text-xs font-bold text-[var(--ink)]">
                無理のない返済額の目安
              </dt>
              <dd className="mt-1 text-[11px] leading-6 text-[var(--ink-soft)]">
                （年収 × 20% − 既存借入の年間返済額）÷ 12。返済負担率20%を安全側の目安として計算しています。
              </dd>
            </div>
          </dl>

          <div className="min-w-0 border border-[var(--line)] bg-[var(--paper-muted)] p-4">
            <p className="text-xs font-bold text-[var(--ink)]">主な前提</p>
            <ul className="mt-2 space-y-2 text-[11px] leading-6 text-[var(--ink-soft)]">
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-[var(--accent)]">
                  ・
                </span>
                <span>
                  月利は年利 ÷ 12、返済回数は返済期間 × 12か月で計算します。金利0%の場合は単純な分割計算です。
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-[var(--accent)]">
                  ・
                </span>
                <span>
                  ボーナス返済は毎年の年末に支払うものとして現在価値に換算し、月々の返済とは別に扱います。
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-[var(--accent)]">
                  ・
                </span>
                <span>
                  団体信用生命保険、火災保険、固定資産税、登記費用、繰上返済、金利の変動は考慮していません。
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-[var(--accent)]">
                  ・
                </span>
                <span>
                  金額は円未満を四捨五入して表示します。端数処理や金融機関独自の計算方法により、実際の金額とは異なる場合があります。
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-[var(--accent)]">
                  ・
                </span>
                <span>
                  このツールは一般的な計算による目安を表示するものであり、金融機関の審査を保証しないほか、個別の金融助言でもありません。
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
