'use client';

import { useState } from 'react';

type PerformanceType = 'general' | 'energySaving' | 'zeh' | 'longTerm';

type PerformanceOption = {
  value: PerformanceType;
  label: string;
  limitMan: number;
  description: string;
};

type FieldResult = {
  value: number | null;
  error: string | null;
};

type CalculationInput = {
  balanceMan: number;
  balanceCapMan: number;
  moveInYear: number;
  deductionRate: number;
  deductionPeriod: number;
  incomeTaxMan: number;
  residenceTaxLevyMan: number;
  taxableIncomeMan: number;
  residenceTaxRate: number;
  residenceTaxCapMan: number;
};

type DeductionResult = {
  balanceYen: number;
  eligibleBalanceYen: number;
  annualDeduction: number;
  incomeTaxDeduction: number;
  residenceTaxCap: number;
  residenceTaxDeduction: number;
  effectiveDeduction: number;
  unusedDeduction: number;
  totalDeduction: number;
  moveInYear: number;
  deductionRate: number;
  deductionPeriod: number;
};

const PERFORMANCE_OPTIONS: PerformanceOption[] = [
  {
    value: 'general',
    label: '一般住宅',
    limitMan: 2_000,
    description: '省エネ基準を満たさない住宅などの区分',
  },
  {
    value: 'energySaving',
    label: '省エネ基準適合住宅',
    limitMan: 3_000,
    description: '省エネ基準に適合する住宅の区分',
  },
  {
    value: 'zeh',
    label: 'ZEH水準省エネ住宅',
    limitMan: 3_500,
    description: 'ZEH水準の省エネ性能を持つ住宅の区分',
  },
  {
    value: 'longTerm',
    label: '長期優良住宅・低炭素住宅',
    limitMan: 4_500,
    description: '認定長期優良住宅や低炭素住宅の区分',
  },
];

const DEFAULT_INPUTS = {
  balance: '3,000',
  moveInYear: '2025',
  performance: 'energySaving' as PerformanceType,
  balanceCap: '3,000',
  deductionRate: '0.7',
  deductionPeriod: '13',
  incomeTax: '18',
  residenceTaxLevy: '35',
  taxableIncome: '300',
  residenceTaxRate: '5',
  residenceTaxCap: '9.75',
};

const MAX_MONEY_MAN = 1_000_000;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MIN_PERIOD = 1;
const MAX_PERIOD = 20;
const YEN_PER_MAN = 10_000;
const numberFormatter = new Intl.NumberFormat('ja-JP');
const GROUPED_DECIMAL_PATTERN =
  /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

function parseDecimal(raw: string, allowGrouping: boolean): number | null {
  const normalized = raw.normalize('NFKC').trim();
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

function validateMoneyMan(raw: string, label: string): FieldResult {
  const normalized = raw.normalize('NFKC').trim();
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized, true);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < 0) {
    return { value: null, error: `${label}は0以上で入力してください。` };
  }

  if (parsed > MAX_MONEY_MAN) {
    return {
      value: null,
      error: `${label}は100億円以下で入力してください。`,
    };
  }

  const yen = Math.round(parsed * YEN_PER_MAN);
  if (!Number.isSafeInteger(yen)) {
    return { value: null, error: `${label}の金額が大きすぎます。` };
  }

  return { value: parsed, error: null };
}

function validateYear(raw: string): FieldResult {
  const normalized = raw.normalize('NFKC').trim();
  if (normalized === '') {
    return { value: null, error: '入居年を入力してください。' };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null || !Number.isInteger(parsed)) {
    return {
      value: null,
      error: `入居年は${MIN_YEAR}〜${MAX_YEAR}年の整数で入力してください。`,
    };
  }

  if (parsed < MIN_YEAR || parsed > MAX_YEAR) {
    return {
      value: null,
      error: `入居年は${MIN_YEAR}〜${MAX_YEAR}年の範囲で入力してください。`,
    };
  }

  return { value: parsed, error: null };
}

function validatePercentage(raw: string, label: string): FieldResult {
  const normalized = raw.normalize('NFKC').trim();
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < 0 || parsed > 100) {
    return {
      value: null,
      error: `${label}は0〜100%の範囲で入力してください。`,
    };
  }

  return { value: parsed, error: null };
}

function validatePeriod(raw: string): FieldResult {
  const normalized = raw.normalize('NFKC').trim();
  if (normalized === '') {
    return { value: null, error: '控除期間を入力してください。' };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null || !Number.isInteger(parsed)) {
    return {
      value: null,
      error: `控除期間は${MIN_PERIOD}〜${MAX_PERIOD}年の整数で入力してください。`,
    };
  }

  if (parsed < MIN_PERIOD || parsed > MAX_PERIOD) {
    return {
      value: null,
      error: `控除期間は${MIN_PERIOD}〜${MAX_PERIOD}年の範囲で入力してください。`,
    };
  }

  return { value: parsed, error: null };
}

function formatYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${numberFormatter.format(Math.round(value))}円`;
}

function floorRateAmount(amountYen: number, ratePercent: number): number {
  const scaled = (amountYen * ratePercent) / 100;
  return Math.floor(scaled + Number.EPSILON * Math.abs(scaled));
}

function calculateDeduction(input: CalculationInput): DeductionResult {
  const balanceYen = Math.round(input.balanceMan * YEN_PER_MAN);
  const balanceCapYen = Math.round(input.balanceCapMan * YEN_PER_MAN);
  const eligibleBalanceYen = Math.min(balanceYen, balanceCapYen);
  const annualDeduction = floorRateAmount(
    eligibleBalanceYen,
    input.deductionRate,
  );
  const incomeTaxYen = Math.round(input.incomeTaxMan * YEN_PER_MAN);
  const residenceTaxLevyYen = Math.round(
    input.residenceTaxLevyMan * YEN_PER_MAN,
  );
  const taxableIncomeYen = Math.round(
    input.taxableIncomeMan * YEN_PER_MAN,
  );
  const incomeTaxDeduction = Math.min(annualDeduction, incomeTaxYen);
  const remainingAfterIncomeTax = Math.max(
    0,
    annualDeduction - incomeTaxDeduction,
  );
  const residenceTaxRateCap = floorRateAmount(
    taxableIncomeYen,
    input.residenceTaxRate,
  );
  const residenceTaxAmountCap = Math.round(
    input.residenceTaxCapMan * YEN_PER_MAN,
  );
  const residenceTaxCap = Math.min(
    residenceTaxRateCap,
    residenceTaxAmountCap,
    residenceTaxLevyYen,
  );
  const residenceTaxDeduction = Math.min(
    remainingAfterIncomeTax,
    residenceTaxCap,
  );
  const effectiveDeduction = incomeTaxDeduction + residenceTaxDeduction;
  const unusedDeduction = Math.max(0, annualDeduction - effectiveDeduction);

  return {
    balanceYen,
    eligibleBalanceYen,
    annualDeduction,
    incomeTaxDeduction,
    residenceTaxCap,
    residenceTaxDeduction,
    effectiveDeduction,
    unusedDeduction,
    totalDeduction: effectiveDeduction * input.deductionPeriod,
    moveInYear: input.moveInYear,
    deductionRate: input.deductionRate,
    deductionPeriod: input.deductionPeriod,
  };
}

export function HousingLoanDeduction() {
  const [balance, setBalance] = useState(DEFAULT_INPUTS.balance);
  const [moveInYear, setMoveInYear] = useState(DEFAULT_INPUTS.moveInYear);
  const [performance, setPerformance] = useState<PerformanceType>(
    DEFAULT_INPUTS.performance,
  );
  const [balanceCap, setBalanceCap] = useState(DEFAULT_INPUTS.balanceCap);
  const [deductionRate, setDeductionRate] = useState(
    DEFAULT_INPUTS.deductionRate,
  );
  const [deductionPeriod, setDeductionPeriod] = useState(
    DEFAULT_INPUTS.deductionPeriod,
  );
  const [incomeTax, setIncomeTax] = useState(DEFAULT_INPUTS.incomeTax);
  const [residenceTaxLevy, setResidenceTaxLevy] = useState(
    DEFAULT_INPUTS.residenceTaxLevy,
  );
  const [taxableIncome, setTaxableIncome] = useState(
    DEFAULT_INPUTS.taxableIncome,
  );
  const [residenceTaxRate, setResidenceTaxRate] = useState(
    DEFAULT_INPUTS.residenceTaxRate,
  );
  const [residenceTaxCap, setResidenceTaxCap] = useState(
    DEFAULT_INPUTS.residenceTaxCap,
  );

  const balanceField = validateMoneyMan(balance, '年末ローン残高');
  const yearField = validateYear(moveInYear);
  const balanceCapField = validateMoneyMan(
    balanceCap,
    '控除対象残高の上限',
  );
  const rateField = validatePercentage(deductionRate, '控除率');
  const periodField = validatePeriod(deductionPeriod);
  const incomeTaxField = validateMoneyMan(incomeTax, '所得税額');
  const residenceLevyField = validateMoneyMan(
    residenceTaxLevy,
    '住民税所得割額',
  );
  const taxableIncomeField = validateMoneyMan(taxableIncome, '課税所得');
  const residenceRateField = validatePercentage(
    residenceTaxRate,
    '住民税控除の上限率',
  );
  const residenceCapField = validateMoneyMan(
    residenceTaxCap,
    '住民税控除の上限額',
  );

  const selectedPerformance =
    PERFORMANCE_OPTIONS.find((option) => option.value === performance) ??
    PERFORMANCE_OPTIONS[0];

  const result =
    balanceField.value !== null &&
    yearField.value !== null &&
    balanceCapField.value !== null &&
    rateField.value !== null &&
    periodField.value !== null &&
    incomeTaxField.value !== null &&
    residenceLevyField.value !== null &&
    taxableIncomeField.value !== null &&
    residenceRateField.value !== null &&
    residenceCapField.value !== null
      ? calculateDeduction({
          balanceMan: balanceField.value,
          balanceCapMan: balanceCapField.value,
          moveInYear: yearField.value,
          deductionRate: rateField.value,
          deductionPeriod: periodField.value,
          incomeTaxMan: incomeTaxField.value,
          residenceTaxLevyMan: residenceLevyField.value,
          taxableIncomeMan: taxableIncomeField.value,
          residenceTaxRate: residenceRateField.value,
          residenceTaxCapMan: residenceCapField.value,
        })
      : null;

  const isReferenceYear =
    yearField.value !== null &&
    yearField.value >= 2024 &&
    yearField.value <= 2025;

  const capHint = isReferenceYear
    ? '2024〜2025年入居の新築住宅を想定した参考上限です。実際の制度に合わせて自由に編集できます。'
    : '参考上限は2024〜2025年入居の新築住宅を想定しています。入居年や住宅要件に合わせて編集してください。';

  const statusMessage = result
    ? `年間控除可能額は約${formatYen(result.annualDeduction)}です。所得税から約${formatYen(result.incomeTaxDeduction)}、住民税から約${formatYen(result.residenceTaxDeduction)}を控除し、実質控除額は約${formatYen(result.effectiveDeduction)}。${result.deductionPeriod}年間の合計は残高一定の概算で約${formatYen(result.totalDeduction)}です。`
    : '入力内容を確認すると試算結果を表示します。';

  const handlePerformanceChange = (nextValue: string) => {
    const nextPerformance = nextValue as PerformanceType;
    setPerformance(nextPerformance);
    const option = PERFORMANCE_OPTIONS.find(
      (item) => item.value === nextPerformance,
    );
    if (option) {
      setBalanceCap(numberFormatter.format(option.limitMan));
    }
  };

  const resetForm = () => {
    setBalance(DEFAULT_INPUTS.balance);
    setMoveInYear(DEFAULT_INPUTS.moveInYear);
    setPerformance(DEFAULT_INPUTS.performance);
    setBalanceCap(DEFAULT_INPUTS.balanceCap);
    setDeductionRate(DEFAULT_INPUTS.deductionRate);
    setDeductionPeriod(DEFAULT_INPUTS.deductionPeriod);
    setIncomeTax(DEFAULT_INPUTS.incomeTax);
    setResidenceTaxLevy(DEFAULT_INPUTS.residenceTaxLevy);
    setTaxableIncome(DEFAULT_INPUTS.taxableIncome);
    setResidenceTaxRate(DEFAULT_INPUTS.residenceTaxRate);
    setResidenceTaxCap(DEFAULT_INPUTS.residenceTaxCap);
  };

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
        aria-label="住宅ローン控除 計算シミュレーター"
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
                住宅ローンと税額を入力
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
            年末残高と税額から控除額の目安を計算します。控除率・期間・上限は編集できるため、ご自身の条件や最新の制度に合わせて調整してください。
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="housing-loan-balance"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  年末ローン残高{' '}
                  <span className="text-xs font-normal">万円</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0–100億円
                </span>
              </div>
              <input
                id="housing-loan-balance"
                name="balance"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
                placeholder="例: 3,000"
                aria-invalid={balanceField.error !== null}
                aria-describedby={
                  balanceField.error
                    ? 'housing-loan-balance-error'
                    : 'housing-loan-balance-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {balanceField.error ? (
                <p
                  id="housing-loan-balance-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {balanceField.error}
                </p>
              ) : (
                <p
                  id="housing-loan-balance-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  万円単位で入力します。カンマ区切りも使えます。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="housing-loan-year"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  入居年 <span className="text-xs font-normal">年</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  2000–2100
                </span>
              </div>
              <input
                id="housing-loan-year"
                name="moveInYear"
                type="number"
                inputMode="numeric"
                min={MIN_YEAR}
                max={MAX_YEAR}
                step="1"
                value={moveInYear}
                onChange={(event) => setMoveInYear(event.target.value)}
                placeholder="例: 2025"
                aria-invalid={yearField.error !== null}
                aria-describedby={
                  yearField.error
                    ? 'housing-loan-year-error'
                    : 'housing-loan-year-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {yearField.error ? (
                <p
                  id="housing-loan-year-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {yearField.error}
                </p>
              ) : (
                <p
                  id="housing-loan-year-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  西暦4桁で入力します。参考上限の案内に使用します。
                </p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="housing-loan-performance"
                className="text-sm font-bold text-[var(--ink)]"
              >
                住宅性能区分
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                Reference
              </span>
            </div>
            <select
              id="housing-loan-performance"
              name="performance"
              value={performance}
              onChange={(event) =>
                handlePerformanceChange(event.target.value)
              }
              aria-describedby="housing-loan-performance-help"
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base"
            >
              {PERFORMANCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}（参考上限{' '}
                  {numberFormatter.format(option.limitMan)}万円）
                </option>
              ))}
            </select>
            <p
              id="housing-loan-performance-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              {selectedPerformance.description}
              。選択すると下の控除対象残高の上限に参考値が入ります。
            </p>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="housing-loan-balance-cap"
                className="text-sm font-bold text-[var(--ink)]"
              >
                控除対象残高の上限{' '}
                <span className="text-xs font-normal">万円（編集可）</span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                0–100億円
              </span>
            </div>
            <input
              id="housing-loan-balance-cap"
              name="balanceCap"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={balanceCap}
              onChange={(event) => setBalanceCap(event.target.value)}
              placeholder="例: 3,000"
              aria-invalid={balanceCapField.error !== null}
              aria-describedby={
                balanceCapField.error
                  ? 'housing-loan-balance-cap-error'
                  : 'housing-loan-balance-cap-help'
              }
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {balanceCapField.error ? (
              <p
                id="housing-loan-balance-cap-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {balanceCapField.error}
              </p>
            ) : (
              <p
                id="housing-loan-balance-cap-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                {capHint}
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="housing-loan-rate"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  控除率 <span className="text-xs font-normal">%</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  0–100
                </span>
              </div>
              <input
                id="housing-loan-rate"
                name="deductionRate"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={deductionRate}
                onChange={(event) => setDeductionRate(event.target.value)}
                placeholder="例: 0.7"
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
                  初期値は0.7%です。最新の制度に合わせて編集できます。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="housing-loan-period"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  控除期間 <span className="text-xs font-normal">年</span>
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  1–20
                </span>
              </div>
              <input
                id="housing-loan-period"
                name="deductionPeriod"
                type="number"
                inputMode="numeric"
                min={MIN_PERIOD}
                max={MAX_PERIOD}
                step="1"
                value={deductionPeriod}
                onChange={(event) => setDeductionPeriod(event.target.value)}
                placeholder="例: 13"
                aria-invalid={periodField.error !== null}
                aria-describedby={
                  periodField.error
                    ? 'housing-loan-period-error'
                    : 'housing-loan-period-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeductionPeriod('10')}
                  aria-pressed={deductionPeriod === '10'}
                  className="paper-chip min-h-10 rounded-sm px-3 py-1.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  10年
                </button>
                <button
                  type="button"
                  onClick={() => setDeductionPeriod('13')}
                  aria-pressed={deductionPeriod === '13'}
                  className="paper-chip min-h-10 rounded-sm px-3 py-1.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  13年
                </button>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  参考
                </span>
              </div>
              {periodField.error ? (
                <p
                  id="housing-loan-period-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {periodField.error}
                </p>
              ) : (
                <p
                  id="housing-loan-period-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  新築13年・既存10年が一般的な参考値です。直接入力もできます。
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-[var(--line)] pt-5">
            <p className="paper-kicker text-[9px]">Tax &amp; Cap</p>
            <h3 className="font-editorial mt-1 text-lg">
              税額と控除上限
            </h3>
            <p className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]">
              金額は万円単位です。所得税で控除しきれない分を住民税から控除する簡易計算を行います。
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="housing-loan-income-tax"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    所得税額{' '}
                    <span className="text-xs font-normal">万円</span>
                  </label>
                  <span className="font-label text-[9px] text-[var(--ink-soft)]">
                    0–100億円
                  </span>
                </div>
                <input
                  id="housing-loan-income-tax"
                  name="incomeTax"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={incomeTax}
                  onChange={(event) => setIncomeTax(event.target.value)}
                  placeholder="例: 18"
                  aria-invalid={incomeTaxField.error !== null}
                  aria-describedby={
                    incomeTaxField.error
                      ? 'housing-loan-income-tax-error'
                      : 'housing-loan-income-tax-help'
                  }
                  className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
                />
                {incomeTaxField.error ? (
                  <p
                    id="housing-loan-income-tax-error"
                    role="alert"
                    className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                  >
                    {incomeTaxField.error}
                  </p>
                ) : (
                  <p
                    id="housing-loan-income-tax-help"
                    className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                  >
                    1年分の所得税額の目安を入力します。
                  </p>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="housing-loan-residence-levy"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    住民税所得割額{' '}
                    <span className="text-xs font-normal">万円</span>
                  </label>
                  <span className="font-label text-[9px] text-[var(--ink-soft)]">
                    0–100億円
                  </span>
                </div>
                <input
                  id="housing-loan-residence-levy"
                  name="residenceTaxLevy"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={residenceTaxLevy}
                  onChange={(event) =>
                    setResidenceTaxLevy(event.target.value)
                  }
                  placeholder="例: 35"
                  aria-invalid={residenceLevyField.error !== null}
                  aria-describedby={
                    residenceLevyField.error
                      ? 'housing-loan-residence-levy-error'
                      : 'housing-loan-residence-levy-help'
                  }
                  className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
                />
                {residenceLevyField.error ? (
                  <p
                    id="housing-loan-residence-levy-error"
                    role="alert"
                    className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                  >
                    {residenceLevyField.error}
                  </p>
                ) : (
                  <p
                    id="housing-loan-residence-levy-help"
                    className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                  >
                    住民税からの控除総額の上限にもなります。
                  </p>
                )}
              </div>

              <div className="min-w-0 sm:col-span-2">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="housing-loan-taxable-income"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    課税所得{' '}
                    <span className="text-xs font-normal">万円</span>
                  </label>
                  <span className="font-label text-[9px] text-[var(--ink-soft)]">
                    0–100億円
                  </span>
                </div>
                <input
                  id="housing-loan-taxable-income"
                  name="taxableIncome"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={taxableIncome}
                  onChange={(event) => setTaxableIncome(event.target.value)}
                  placeholder="例: 300"
                  aria-invalid={taxableIncomeField.error !== null}
                  aria-describedby={
                    taxableIncomeField.error
                      ? 'housing-loan-taxable-income-error'
                      : 'housing-loan-taxable-income-help'
                  }
                  className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
                />
                {taxableIncomeField.error ? (
                  <p
                    id="housing-loan-taxable-income-error"
                    role="alert"
                    className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                  >
                    {taxableIncomeField.error}
                  </p>
                ) : (
                  <p
                    id="housing-loan-taxable-income-help"
                    className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                  >
                    住民税の控除上限（課税所得×上限率）に使用します。
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="housing-loan-residence-rate"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    住民税控除の上限率{' '}
                    <span className="text-xs font-normal">%</span>
                  </label>
                  <span className="font-label text-[9px] text-[var(--ink-soft)]">
                    0–100
                  </span>
                </div>
                <input
                  id="housing-loan-residence-rate"
                  name="residenceTaxRate"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.01"
                  value={residenceTaxRate}
                  onChange={(event) =>
                    setResidenceTaxRate(event.target.value)
                  }
                  placeholder="例: 5"
                  aria-invalid={residenceRateField.error !== null}
                  aria-describedby={
                    residenceRateField.error
                      ? 'housing-loan-residence-rate-error'
                      : 'housing-loan-residence-rate-help'
                  }
                  className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
                />
                {residenceRateField.error ? (
                  <p
                    id="housing-loan-residence-rate-error"
                    role="alert"
                    className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                  >
                    {residenceRateField.error}
                  </p>
                ) : (
                  <p
                    id="housing-loan-residence-rate-help"
                    className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                  >
                    初期値は5%です。自治体の制度に合わせて編集できます。
                  </p>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="housing-loan-residence-cap"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    住民税控除の上限額{' '}
                    <span className="text-xs font-normal">万円</span>
                  </label>
                  <span className="font-label text-[9px] text-[var(--ink-soft)]">
                    0–100億円
                  </span>
                </div>
                <input
                  id="housing-loan-residence-cap"
                  name="residenceTaxCap"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={residenceTaxCap}
                  onChange={(event) =>
                    setResidenceTaxCap(event.target.value)
                  }
                  placeholder="例: 9.75"
                  aria-invalid={residenceCapField.error !== null}
                  aria-describedby={
                    residenceCapField.error
                      ? 'housing-loan-residence-cap-error'
                      : 'housing-loan-residence-cap-help'
                  }
                  className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
                />
                {residenceCapField.error ? (
                  <p
                    id="housing-loan-residence-cap-error"
                    role="alert"
                    className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                  >
                    {residenceCapField.error}
                  </p>
                ) : (
                  <p
                    id="housing-loan-residence-cap-help"
                    className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                  >
                    初期値は9.75万円（97,500円）です。編集できます。
                  </p>
                )}
              </div>
            </div>

            <p className="mt-3 border-l-2 border-[var(--line-strong)] pl-3 text-[11px] leading-5 text-[var(--ink-soft)]">
              住民税からの控除は、所得税から引き切れない額を対象に、課税所得×上限率、上限額、住民税所得割額のうち最も小さい額までとしています。
            </p>
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

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {statusMessage}
          </p>

          {result ? (
            <>
              <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                {result.moveInYear}年入居 / {selectedPerformance.label} /
                控除率 {result.deductionRate}% / 控除期間{' '}
                {result.deductionPeriod}年
              </p>

              <div className="mt-3 space-y-3">
                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    年間控除可能額
                  </p>
                  <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums">
                    {formatYen(result.annualDeduction)}
                  </p>
                  <p className="mt-2 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    控除対象残高 {formatYen(result.eligibleBalanceYen)} ×{' '}
                    {result.deductionRate}% の概算です。
                  </p>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      所得税からの控除
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.incomeTaxDeduction)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      所得税額の範囲内
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      住民税からの控除（上限目安）
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.residenceTaxDeduction)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      控除上限 {formatYen(result.residenceTaxCap)}
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] border-l-2 border-l-[var(--accent)] bg-[var(--accent-soft)] p-4">
                    <p className="font-label text-[9px] text-[var(--accent)]">
                      実質控除額
                    </p>
                    <p className="font-editorial mt-1 break-words text-2xl leading-tight tabular-nums">
                      {formatYen(result.effectiveDeduction)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      所得税と住民税の控除合計
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      期間合計の概算
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.totalDeduction)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      {result.deductionPeriod}年間・残高一定の単純計算
                    </p>
                  </div>
                </div>
              </div>

              <dl className="mt-3 divide-y divide-[var(--line)] border border-[var(--line)] bg-[var(--paper)] text-xs">
                <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <dt className="text-[var(--ink-soft)]">
                    控除対象の年末残高
                  </dt>
                  <dd className="text-right font-bold tabular-nums">
                    {formatYen(result.eligibleBalanceYen)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <dt className="text-[var(--ink-soft)]">
                    住民税控除の上限（適用後）
                  </dt>
                  <dd className="text-right font-bold tabular-nums">
                    {formatYen(result.residenceTaxCap)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <dt className="text-[var(--ink-soft)]">控除期間</dt>
                  <dd className="text-right font-bold tabular-nums">
                    {result.deductionPeriod}年
                  </dd>
                </div>
                {result.unusedDeduction > 0 && (
                  <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <dt className="text-[var(--ink-soft)]">
                      控除しきれない額
                    </dt>
                    <dd className="text-right font-bold tabular-nums">
                      {formatYen(result.unusedDeduction)}
                    </dd>
                  </div>
                )}
              </dl>

              {result.balanceYen > result.eligibleBalanceYen && (
                <p className="mt-2 border-l-2 border-[var(--line-strong)] pl-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                  年末残高のうち
                  {formatYen(result.balanceYen - result.eligibleBalanceYen)}
                  は控除対象残高の上限を超えるため、計算に含めていません。
                </p>
              )}

              {result.unusedDeduction > 0 && (
                <p className="mt-2 border-l-2 border-[var(--line-strong)] pl-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                  所得税・住民税の控除上限により
                  {formatYen(result.unusedDeduction)}
                  は控除しきれません。この簡易計算では翌年への持ち越しを考慮していません。
                </p>
              )}

              {result.annualDeduction > 0 &&
                result.unusedDeduction === 0 &&
                result.residenceTaxDeduction === 0 && (
                  <p className="mt-2 border-l-2 border-[var(--line-strong)] pl-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                    所得税額が控除可能額以上あるため、住民税からの控除は発生していません。
                  </p>
                )}

              <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                期間合計は、毎年同じ控除額が続くと仮定した単純概算です。実際は年末残高の減少に伴い控除額も変わるため、合計額はこの概算より小さくなりやすいです。
              </p>
            </>
          ) : (
            <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="text-sm font-bold text-[var(--ink)]">
                入力内容を確認してください
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                年末残高・入居年・控除率・控除期間・税額などを正しく入力すると、ここに試算結果が表示されます。
              </p>
            </div>
          )}

          <div
            role="note"
            className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              制度は改正されるため、最新の公式情報を確認してください
            </p>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
              この試算は、入力した控除率・控除期間・残高上限・住民税上限を前提にした簡略計算です。実際の控除額は入居年、住宅の要件、所得や課税状況、自治体の制度などで異なります。国税庁や自治体の最新情報、税務署・税理士などの専門家でご確認ください。
            </p>
          </div>
        </section>
      </section>

      <section
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="housing-loan-premise-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Premise</p>
            <h2
              id="housing-loan-premise-heading"
              className="font-editorial mt-1 text-xl"
            >
              計算の前提と編集できる上限
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            Notes
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="paper-panel-flat min-w-0 p-4">
            <p className="font-label text-[9px] text-[var(--accent)]">
              01 / Balance
            </p>
            <h3 className="mt-1 text-sm font-black">控除対象残高</h3>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink-soft)]">
              年間控除可能額は、年末ローン残高と「控除対象残高の上限」の小さい方に控除率を掛けて計算します。性能区分を選ぶと参考上限が入り、いつでも編集できます。
            </p>
          </div>

          <div className="paper-panel-flat min-w-0 p-4">
            <p className="font-label text-[9px] text-[var(--accent)]">
              02 / Residence Tax
            </p>
            <h3 className="mt-1 text-sm font-black">住民税の上限</h3>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink-soft)]">
              所得税から引き切れない額を、課税所得×住民税上限率（初期値5%）、住民税上限額（初期値97,500円）、住民税所得割額の範囲で控除します。率と上限額は編集できます。
            </p>
          </div>

          <div className="paper-panel-flat min-w-0 p-4">
            <p className="font-label text-[9px] text-[var(--accent)]">
              03 / Period
            </p>
            <h3 className="mt-1 text-sm font-black">期間合計</h3>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink-soft)]">
              実質控除額×控除期間の単純概算です。残高一定を仮定しているため、実際の合計とは異なります。控除しきれない額の翌年への持ち越しも考慮しません。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
