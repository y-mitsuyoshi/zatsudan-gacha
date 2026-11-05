'use client';

import { useState } from 'react';

const YEN_PER_MAN = 10_000;
const MAX_AMOUNT_YEN = 1_000_000_000_000;
const numberFormatter = new Intl.NumberFormat('ja-JP');
const GROUPED_DECIMAL_PATTERN =
  /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

type FormValues = {
  propertyPrice: string;
  downPayment: string;
  brokerageRate: string;
  brokerageFixed: string;
  taxRate: string;
  registrationCost: string;
  loanFee: string;
  fireInsurance: string;
  movingCost: string;
  otherCost: string;
  managementFee: string;
  repairReserve: string;
  propertyTax: string;
};

type FormNumbers = {
  propertyPrice: number;
  downPayment: number;
  brokerageRate: number;
  brokerageFixed: number;
  taxRate: number;
  registrationCost: number;
  loanFee: number;
  fireInsurance: number;
  movingCost: number;
  otherCost: number;
  managementFee: number;
  repairReserve: number;
  propertyTax: number;
};

type FormErrors = Record<keyof FormValues, string | null>;

type ValidationResult = {
  value: number | null;
  error: string | null;
};

type CostBreakdownItem = {
  label: string;
  value: number;
};

type PurchaseCostResult = {
  brokerageFee: number;
  initialCosts: number;
  selfFunds: number;
  loanAmount: number;
  monthlyHousing: number;
  annualHousing: number;
  totalPurchase: number;
  initialBreakdown: CostBreakdownItem[];
  monthlyBreakdown: CostBreakdownItem[];
};

const DEFAULT_VALUES: FormValues = {
  propertyPrice: '4000',
  downPayment: '500',
  brokerageRate: '3',
  brokerageFixed: '60000',
  taxRate: '10',
  registrationCost: '200000',
  loanFee: '100000',
  fireInsurance: '200000',
  movingCost: '100000',
  otherCost: '100000',
  managementFee: '15000',
  repairReserve: '10000',
  propertyTax: '150000',
};

function formatYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${numberFormatter.format(Math.round(value))}円`;
}

function normalizeNumberText(raw: string): string {
  return raw.normalize('NFKC').trim();
}

function parseNumeric(raw: string, allowGrouping: boolean): number | null {
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

function validateManAmount(
  raw: string,
  label: string,
  allowZero: boolean,
): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseNumeric(normalized, true);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < 0) {
    return { value: null, error: `${label}は0以上で入力してください。` };
  }

  const yen = Math.round(parsed * YEN_PER_MAN);
  if (!Number.isFinite(yen) || yen > MAX_AMOUNT_YEN) {
    return { value: null, error: `${label}は1兆円以下で入力してください。` };
  }

  if (!allowZero && yen < 1) {
    return { value: null, error: `${label}は1円以上で入力してください。` };
  }

  return { value: yen, error: null };
}

function validateYenAmount(
  raw: string,
  label: string,
  allowZero: boolean,
): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseNumeric(normalized, true);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < 0) {
    return { value: null, error: `${label}は0以上で入力してください。` };
  }

  const yen = Math.round(parsed);
  if (!Number.isFinite(yen) || yen > MAX_AMOUNT_YEN) {
    return { value: null, error: `${label}は1兆円以下で入力してください。` };
  }

  if (!allowZero && yen < 1) {
    return { value: null, error: `${label}は1円以上で入力してください。` };
  }

  return { value: yen, error: null };
}

function validateRate(raw: string, label: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseNumeric(normalized, false);
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

function validateForm(values: FormValues): {
  numbers: FormNumbers | null;
  errors: FormErrors;
} {
  const propertyPrice = validateManAmount(values.propertyPrice, '物件価格', false);
  const downPayment = validateManAmount(values.downPayment, '頭金', true);
  const brokerageRate = validateRate(values.brokerageRate, '仲介手数料率');
  const brokerageFixed = validateYenAmount(
    values.brokerageFixed,
    '仲介手数料の固定加算',
    true,
  );
  const taxRate = validateRate(values.taxRate, '消費税率');
  const registrationCost = validateYenAmount(
    values.registrationCost,
    '登記・司法書士費用',
    true,
  );
  const loanFee = validateYenAmount(values.loanFee, 'ローン事務手数料', true);
  const fireInsurance = validateYenAmount(values.fireInsurance, '火災保険', true);
  const movingCost = validateYenAmount(values.movingCost, '引越し', true);
  const otherCost = validateYenAmount(values.otherCost, 'その他諸費用', true);
  const managementFee = validateYenAmount(values.managementFee, '管理費', true);
  const repairReserve = validateYenAmount(
    values.repairReserve,
    '修繕積立金',
    true,
  );
  const propertyTax = validateYenAmount(
    values.propertyTax,
    '固定資産税年額',
    true,
  );

  const downPaymentCrossError =
    downPayment.value !== null &&
    propertyPrice.value !== null &&
    downPayment.value > propertyPrice.value
      ? '頭金は物件価格以下で入力してください。'
      : null;

  const errors: FormErrors = {
    propertyPrice: propertyPrice.error,
    downPayment: downPayment.error ?? downPaymentCrossError,
    brokerageRate: brokerageRate.error,
    brokerageFixed: brokerageFixed.error,
    taxRate: taxRate.error,
    registrationCost: registrationCost.error,
    loanFee: loanFee.error,
    fireInsurance: fireInsurance.error,
    movingCost: movingCost.error,
    otherCost: otherCost.error,
    managementFee: managementFee.error,
    repairReserve: repairReserve.error,
    propertyTax: propertyTax.error,
  };

  if (
    propertyPrice.value === null ||
    downPayment.value === null ||
    downPaymentCrossError !== null ||
    brokerageRate.value === null ||
    brokerageFixed.value === null ||
    taxRate.value === null ||
    registrationCost.value === null ||
    loanFee.value === null ||
    fireInsurance.value === null ||
    movingCost.value === null ||
    otherCost.value === null ||
    managementFee.value === null ||
    repairReserve.value === null ||
    propertyTax.value === null
  ) {
    return { numbers: null, errors };
  }

  return {
    numbers: {
      propertyPrice: propertyPrice.value,
      downPayment: downPayment.value,
      brokerageRate: brokerageRate.value,
      brokerageFixed: brokerageFixed.value,
      taxRate: taxRate.value,
      registrationCost: registrationCost.value,
      loanFee: loanFee.value,
      fireInsurance: fireInsurance.value,
      movingCost: movingCost.value,
      otherCost: otherCost.value,
      managementFee: managementFee.value,
      repairReserve: repairReserve.value,
      propertyTax: propertyTax.value,
    },
    errors,
  };
}

function calculatePurchaseCost(numbers: FormNumbers): PurchaseCostResult {
  const brokerageFee = Math.round(
    (numbers.propertyPrice * (numbers.brokerageRate / 100) +
      numbers.brokerageFixed) *
      (1 + numbers.taxRate / 100),
  );

  const initialBreakdown: CostBreakdownItem[] = [
    { label: '仲介手数料（税込）', value: brokerageFee },
    { label: '登記・司法書士費用', value: numbers.registrationCost },
    { label: 'ローン事務手数料', value: numbers.loanFee },
    { label: '火災保険', value: numbers.fireInsurance },
    { label: '引越し', value: numbers.movingCost },
    { label: 'その他諸費用', value: numbers.otherCost },
  ];

  const initialCosts = initialBreakdown.reduce(
    (total, item) => total + item.value,
    0,
  );

  const monthlyBreakdown: CostBreakdownItem[] = [
    { label: '管理費', value: numbers.managementFee },
    { label: '修繕積立金', value: numbers.repairReserve },
    { label: '固定資産税の月割', value: numbers.propertyTax / 12 },
  ];

  const annualHousing =
    numbers.managementFee * 12 + numbers.repairReserve * 12 + numbers.propertyTax;
  const monthlyHousing = annualHousing / 12;

  return {
    brokerageFee,
    initialCosts,
    selfFunds: numbers.downPayment + initialCosts,
    loanAmount: Math.max(numbers.propertyPrice - numbers.downPayment, 0),
    monthlyHousing,
    annualHousing,
    totalPurchase: numbers.propertyPrice + initialCosts,
    initialBreakdown,
    monthlyBreakdown,
  };
}

type NumberFieldProps = {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  hint?: string;
  placeholder?: string;
};

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  error,
  hint,
  placeholder,
}: NumberFieldProps) {
  const describedBy = error
    ? `${id}-error`
    : hint
      ? `${id}-help`
      : undefined;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold text-[var(--ink)]">
          {label}
        </label>
        <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
          {unit}
        </span>
      </div>
      <input
        id={id}
        name={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error !== null}
        aria-describedby={describedBy}
        className="field-paper mt-2 min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-help`}
          className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function HomePurchaseCost() {
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
  const { numbers, errors } = validateForm(values);
  const result = numbers ? calculatePurchaseCost(numbers) : null;

  const setField = (key: keyof FormValues, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const resetForm = () => {
    setValues(DEFAULT_VALUES);
  };

  const statusMessage = result
    ? `概算結果です。初期費用合計は約${formatYen(result.initialCosts)}、自己資金必要額は約${formatYen(result.selfFunds)}、借入額は約${formatYen(result.loanAmount)}、ローン以外の月間住居費は約${formatYen(result.monthlyHousing)}、年間住居費は約${formatYen(result.annualHousing)}、購入総費用の目安は約${formatYen(result.totalPurchase)}です。`
    : '入力内容を確認すると試算結果を表示します。';

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
        aria-label="住宅購入費用シミュレーター"
      >
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="purchase-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2 id="purchase-form-heading" className="font-editorial mt-1 text-xl">
                購入条件を入力
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              01 / 02
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            物件価格と頭金、諸費用、維持費を入力すると、購入時に必要な資金とローン以外の住居費の目安を自動計算します。入力内容は保存・送信されません。
          </p>

          <fieldset className="mt-5 min-w-0">
            <legend className="font-label text-[10px] text-[var(--accent)]">
              01 / 物件と頭金
            </legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <NumberField
                id="purchase-property-price"
                label="物件価格"
                unit="万円"
                value={values.propertyPrice}
                onChange={(value) => setField('propertyPrice', value)}
                error={errors.propertyPrice}
                hint="万円単位で入力します。"
                placeholder="例: 4000"
              />
              <NumberField
                id="purchase-down-payment"
                label="頭金"
                unit="万円"
                value={values.downPayment}
                onChange={(value) => setField('downPayment', value)}
                error={errors.downPayment}
                hint="万円単位で入力します。物件価格以下で指定してください。"
                placeholder="例: 500"
              />
            </div>
          </fieldset>

          <fieldset className="mt-6 min-w-0 border-t border-[var(--line)] pt-5">
            <legend className="font-label px-2 text-[10px] text-[var(--accent)]">
              02 / 仲介手数料
            </legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <NumberField
                id="purchase-brokerage-rate"
                label="仲介手数料率"
                unit="%"
                value={values.brokerageRate}
                onChange={(value) => setField('brokerageRate', value)}
                error={errors.brokerageRate}
                hint="既定値は3%です。必要に応じて変更してください。"
                placeholder="例: 3"
              />
              <NumberField
                id="purchase-brokerage-fixed"
                label="固定加算"
                unit="円"
                value={values.brokerageFixed}
                onChange={(value) => setField('brokerageFixed', value)}
                error={errors.brokerageFixed}
                hint="既定値は6万円です。物件価格×率に加算します。"
                placeholder="例: 60000"
              />
              <NumberField
                id="purchase-tax-rate"
                label="消費税率"
                unit="%"
                value={values.taxRate}
                onChange={(value) => setField('taxRate', value)}
                error={errors.taxRate}
                hint="既定値は10%です。仲介手数料にかかる税率です。"
                placeholder="例: 10"
              />
            </div>
          </fieldset>

          <fieldset className="mt-6 min-w-0 border-t border-[var(--line)] pt-5">
            <legend className="font-label px-2 text-[10px] text-[var(--accent)]">
              03 / その他の諸費用
            </legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <NumberField
                id="purchase-registration"
                label="登記・司法書士費用"
                unit="円"
                value={values.registrationCost}
                onChange={(value) => setField('registrationCost', value)}
                error={errors.registrationCost}
                hint="登録免許税・司法書士報酬などの目安です。"
                placeholder="例: 200000"
              />
              <NumberField
                id="purchase-loan-fee"
                label="ローン事務手数料"
                unit="円"
                value={values.loanFee}
                onChange={(value) => setField('loanFee', value)}
                error={errors.loanFee}
                hint="金融機関の事務手数料・保証料などの目安です。"
                placeholder="例: 100000"
              />
              <NumberField
                id="purchase-fire-insurance"
                label="火災保険"
                unit="円"
                value={values.fireInsurance}
                onChange={(value) => setField('fireInsurance', value)}
                error={errors.fireInsurance}
                hint="火災保険料の一括払いなどの目安です。"
                placeholder="例: 200000"
              />
              <NumberField
                id="purchase-moving"
                label="引越し"
                unit="円"
                value={values.movingCost}
                onChange={(value) => setField('movingCost', value)}
                error={errors.movingCost}
                hint="引越し業者・各種手続きの費用などです。"
                placeholder="例: 100000"
              />
              <div className="min-w-0 sm:col-span-2">
                <NumberField
                  id="purchase-other"
                  label="その他諸費用"
                  unit="円"
                  value={values.otherCost}
                  onChange={(value) => setField('otherCost', value)}
                  error={errors.otherCost}
                  hint="家具家電・リフォーム・予備費など任意の費用を入力できます。"
                  placeholder="例: 100000"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="mt-6 min-w-0 border-t border-[var(--line)] pt-5">
            <legend className="font-label px-2 text-[10px] text-[var(--accent)]">
              04 / 毎年の維持費
            </legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <NumberField
                id="purchase-management-fee"
                label="管理費"
                unit="円 / 月"
                value={values.managementFee}
                onChange={(value) => setField('managementFee', value)}
                error={errors.managementFee}
                hint="月額。マンション管理費などの目安です。"
                placeholder="例: 15000"
              />
              <NumberField
                id="purchase-repair-reserve"
                label="修繕積立金"
                unit="円 / 月"
                value={values.repairReserve}
                onChange={(value) => setField('repairReserve', value)}
                error={errors.repairReserve}
                hint="月額。修繕積立金などの目安です。"
                placeholder="例: 10000"
              />
              <NumberField
                id="purchase-property-tax"
                label="固定資産税年額"
                unit="円 / 年"
                value={values.propertyTax}
                onChange={(value) => setField('propertyTax', value)}
                error={errors.propertyTax}
                hint="年額。固定資産税・都市計画税などの目安です。"
                placeholder="例: 150000"
              />
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
          aria-labelledby="purchase-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="purchase-result-heading"
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

          {result && numbers ? (
            <>
              <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                物件価格 {formatYen(numbers.propertyPrice)} / 頭金{' '}
                {formatYen(numbers.downPayment)} / 借入額{' '}
                {formatYen(result.loanAmount)}
              </p>

              <div className="mt-3 space-y-3">
                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    自己資金必要額
                  </p>
                  <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums">
                    {formatYen(result.selfFunds)}
                  </p>
                  <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    頭金と初期費用合計の合計です。借入額には諸費用を含めていません。
                  </p>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      初期費用合計
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.initialCosts)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      頭金を除く諸費用の合計です。
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      借入額
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.loanAmount)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      物件価格から頭金を差し引いた目安です。
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      月間住居費（ローン以外）
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.monthlyHousing)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      管理費・修繕積立金・固定資産税の月割です。
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      年間住居費（ローン以外）
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.annualHousing)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      月間住居費の12か月分です。
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4 sm:col-span-2">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      購入総費用の目安
                    </p>
                    <p className="font-editorial mt-1 break-words text-2xl leading-tight tabular-nums">
                      {formatYen(result.totalPurchase)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      物件価格と初期費用の合計です。ローン利息と維持費は含みません。
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
                各項目を正しく入力すると、ここに試算結果が表示されます。
              </p>
            </div>
          )}

          <div
            role="note"
            className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              概算・税制/手数料は条件により異なる
            </p>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
              表示金額は入力値に基づく概算です。実際の仲介手数料、登記費用、ローン事務手数料、火災保険、税金などは、物件・地域・契約条件・金融機関により異なります。契約前には不動産会社、金融機関、司法書士、税理士などの専門家へご確認ください。
            </p>
          </div>
        </section>
      </section>

      {result && numbers && (
        <section
          aria-labelledby="purchase-breakdown-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Breakdown</p>
              <h2
                id="purchase-breakdown-heading"
                className="font-editorial mt-1 text-xl"
              >
                費用の内訳
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              Estimate
            </span>
          </div>

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div className="min-w-0">
              <h3 className="font-editorial text-lg">初期費用の内訳</h3>
              <dl className="mt-2">
                {result.initialBreakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] py-2"
                  >
                    <dt className="text-xs text-[var(--ink-soft)]">{item.label}</dt>
                    <dd className="shrink-0 text-xs font-bold tabular-nums">
                      {formatYen(item.value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex items-baseline justify-between gap-3 border-t-2 border-[var(--line-strong)] pt-2">
                <p className="text-sm font-bold">初期費用合計</p>
                <p className="font-editorial text-lg tabular-nums">
                  {formatYen(result.initialCosts)}
                </p>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                仲介手数料は「物件価格 × {numbers.brokerageRate}% ＋{' '}
                {formatYen(numbers.brokerageFixed)}」に消費税{' '}
                {numbers.taxRate}%を加えた概算です。
              </p>
            </div>

            <div className="min-w-0">
              <h3 className="font-editorial text-lg">
                月間住居費の内訳（ローン以外）
              </h3>
              <dl className="mt-2">
                {result.monthlyBreakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] py-2"
                  >
                    <dt className="text-xs text-[var(--ink-soft)]">{item.label}</dt>
                    <dd className="shrink-0 text-xs font-bold tabular-nums">
                      {formatYen(item.value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex items-baseline justify-between gap-3 border-t-2 border-[var(--line-strong)] pt-2">
                <p className="text-sm font-bold">月間住居費（ローン以外）</p>
                <p className="font-editorial text-lg tabular-nums">
                  {formatYen(result.monthlyHousing)}
                </p>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <p className="text-sm font-bold">年間住居費（ローン以外）</p>
                <p className="font-editorial text-lg tabular-nums">
                  {formatYen(result.annualHousing)}
                </p>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                固定資産税は年額を12で割った月割です。住宅ローンの返済額は含みません。月額は円未満を四捨五入して表示しています。
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
