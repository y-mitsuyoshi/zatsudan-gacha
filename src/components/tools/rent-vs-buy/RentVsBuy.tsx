'use client';

import { useState } from 'react';

type RenewalMode = 'annual' | 'biennial';

type ValidationResult = {
  value: number | null;
  error: string | null;
};

type FormState = {
  holdingYears: string;
  monthlyRent: string;
  rentManagement: string;
  renewalMode: RenewalMode;
  renewalAmount: string;
  rentChange: string;
  propertyPrice: string;
  downPayment: string;
  loanRate: string;
  loanYears: string;
  buyManagement: string;
  repairReserve: string;
  propertyTax: string;
  purchaseCosts: string;
  repairCost: string;
  salePrice: string;
  saleCost: string;
  taxCredit: string;
};

type StringFieldKey = Exclude<keyof FormState, 'renewalMode'>;

type SimulationInputs = {
  holdingYears: number;
  monthlyRent: number;
  monthlyRentManagement: number;
  annualRenewal: number;
  rentChangeRate: number;
  propertyPrice: number;
  downPayment: number;
  loanRate: number;
  loanYears: number;
  monthlyBuyManagement: number;
  monthlyRepairReserve: number;
  annualPropertyTax: number;
  purchaseCosts: number;
  annualRepairCost: number;
  salePrice: number;
  saleCost: number;
  annualTaxCredit: number;
};

type SimulationRow = {
  year: number;
  rentAnnual: number;
  rentCumulative: number;
  buyAnnual: number;
  loanBalance: number;
  buyNetCost: number;
  difference: number;
  isBreakEven: boolean;
};

type Simulation = {
  holdingYears: number;
  rentTotal: number;
  buyTotalPaid: number;
  buyNetCost: number;
  difference: number;
  breakEvenYear: number | null;
  totalLoanPayment: number;
  totalInterest: number;
  totalOwnershipCost: number;
  totalTaxCredit: number;
  remainingLoan: number;
  netSaleProceeds: number;
  rows: SimulationRow[];
};

type NumberFieldProps = {
  id: string;
  label: string;
  unit: string;
  hint: string;
  error: string | null;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: 'decimal' | 'numeric';
  range?: string;
};

const MAN_YEN = 10_000;
const MAX_MONEY_YEN = 1_000_000_000_000;
const NUMBER_PATTERN =
  /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const numberFormatter = new Intl.NumberFormat('ja-JP');

const INITIAL_FORM: FormState = {
  holdingYears: '10',
  monthlyRent: '120000',
  rentManagement: '5000',
  renewalMode: 'biennial',
  renewalAmount: '120000',
  rentChange: '0',
  propertyPrice: '4000',
  downPayment: '800',
  loanRate: '1.2',
  loanYears: '35',
  buyManagement: '15000',
  repairReserve: '10000',
  propertyTax: '150000',
  purchaseCosts: '280',
  repairCost: '50000',
  salePrice: '3600',
  saleCost: '120',
  taxCredit: '',
};

const RENEWAL_OPTIONS: {
  value: RenewalMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'annual',
    label: '年換算',
    description: '毎年の更新料を年額で入力します。',
  },
  {
    value: 'biennial',
    label: '2年ごと',
    description: '2年ごとの更新料を入力し、年額に換算します。',
  },
];

function normalizeNumberText(raw: string): string {
  return raw.normalize('NFKC').trim().replace(/[−–—]/g, '-');
}

function parseDecimal(raw: string): number | null {
  const normalized = normalizeNumberText(raw);
  if (normalized === '' || !NUMBER_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function validateYen(
  raw: string,
  label: string,
  options: { optional?: boolean; positive?: boolean } = {},
): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return options.optional
      ? { value: 0, error: null }
      : { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < 0) {
    return { value: null, error: `${label}は0円以上で入力してください。` };
  }

  if (options.positive && parsed < 1) {
    return { value: null, error: `${label}は1円以上で入力してください。` };
  }

  const rounded = Math.round(parsed);
  if (!Number.isSafeInteger(rounded) || rounded > MAX_MONEY_YEN) {
    return { value: null, error: `${label}は1兆円以下で入力してください。` };
  }

  return { value: rounded, error: null };
}

function validateManYen(
  raw: string,
  label: string,
  options: { optional?: boolean; positive?: boolean } = {},
): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return options.optional
      ? { value: 0, error: null }
      : { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < 0) {
    return { value: null, error: `${label}は0万円以上で入力してください。` };
  }

  if (options.positive && parsed < 0.0001) {
    return { value: null, error: `${label}は1円以上で入力してください。` };
  }

  const yen = Math.round(parsed * MAN_YEN);
  if (!Number.isSafeInteger(yen) || yen > MAX_MONEY_YEN) {
    return { value: null, error: `${label}は1兆円以下で入力してください。` };
  }

  return { value: yen, error: null };
}

function validateRate(
  raw: string,
  label: string,
  min: number,
  max: number,
): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < min || parsed > max) {
    return {
      value: null,
      error: `${label}は${min}〜${max}%の範囲で入力してください。`,
    };
  }

  return { value: parsed, error: null };
}

function validateYears(
  raw: string,
  label: string,
  min: number,
  max: number,
): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized);
  if (parsed === null || !Number.isInteger(parsed)) {
    return {
      value: null,
      error: `${label}は${min}〜${max}年の整数で入力してください。`,
    };
  }

  if (parsed < min || parsed > max) {
    return {
      value: null,
      error: `${label}は${min}〜${max}年の範囲で入力してください。`,
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

function formatSignedYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const rounded = Math.round(value);
  return rounded > 0 ? `+${formatYen(rounded)}` : formatYen(rounded);
}

function estimateSaleValue(
  purchasePrice: number,
  selectedSalePrice: number,
  holdingYears: number,
  year: number,
): number {
  if (holdingYears <= 0) {
    return selectedSalePrice;
  }
  const progress = Math.min(1, Math.max(0, year / holdingYears));
  return Math.max(0, purchasePrice + (selectedSalePrice - purchasePrice) * progress);
}

function calculateSimulation(inputs: SimulationInputs): Simulation {
  const holdingMonths = inputs.holdingYears * 12;
  const loanMonths = inputs.loanYears * 12;
  const monthlyRate = inputs.loanRate / 100 / 12;
  const loanPrincipal = Math.max(0, inputs.propertyPrice - inputs.downPayment);
  const annualLoanPayment = new Array<number>(inputs.holdingYears + 1).fill(0);
  const annualLoanInterest = new Array<number>(inputs.holdingYears + 1).fill(0);
  const yearEndBalance = new Array<number>(inputs.holdingYears + 1).fill(0);

  let monthlyPayment = 0;
  if (loanPrincipal > 0 && loanMonths > 0) {
    if (monthlyRate === 0) {
      monthlyPayment = loanPrincipal / loanMonths;
    } else {
      const logGrowth = Math.log1p(monthlyRate);
      const growth = Math.exp(logGrowth * loanMonths);
      const growthMinusOne = Math.expm1(logGrowth * loanMonths);
      monthlyPayment = (loanPrincipal * monthlyRate * growth) / growthMinusOne;
    }
  }

  let balance = loanPrincipal;
  const monthsToSimulate = Math.min(loanMonths, holdingMonths);

  for (let month = 1; month <= monthsToSimulate; month += 1) {
    const year = Math.ceil(month / 12);
    const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
    const principalPart = Math.min(Math.max(monthlyPayment - interest, 0), balance);

    annualLoanPayment[year] += interest + principalPart;
    annualLoanInterest[year] += interest;
    balance -= principalPart;

    if (balance < 0.005 || month === loanMonths) {
      balance = 0;
    }

    yearEndBalance[year] = balance;
  }

  const rentGrowth = 1 + inputs.rentChangeRate / 100;
  const downAndClosing = inputs.downPayment + inputs.purchaseCosts;
  const annualOwnershipCost =
    (inputs.monthlyBuyManagement + inputs.monthlyRepairReserve) * 12 +
    inputs.annualPropertyTax +
    inputs.annualRepairCost;

  let rentCumulative = 0;
  let buyOutlayCumulative = 0;
  let totalLoanPayment = 0;
  let totalInterest = 0;
  let totalOwnershipCost = 0;
  let totalTaxCredit = 0;
  const rows: SimulationRow[] = [];

  for (let year = 1; year <= inputs.holdingYears; year += 1) {
    const rentAnnual =
      inputs.monthlyRent * 12 * Math.pow(rentGrowth, year - 1) +
      inputs.monthlyRentManagement * 12 +
      inputs.annualRenewal;
    rentCumulative += rentAnnual;

    const loanPayment = annualLoanPayment[year] ?? 0;
    const loanInterest = annualLoanInterest[year] ?? 0;
    const balanceAtEnd = yearEndBalance[year] ?? 0;
    const isCreditEligible =
      inputs.annualTaxCredit > 0 &&
      loanPrincipal > 0 &&
      balanceAtEnd > 0.005 &&
      year <= inputs.loanYears;
    const taxCredit = isCreditEligible ? inputs.annualTaxCredit : 0;
    const recurringBuyCash = loanPayment + annualOwnershipCost - taxCredit;
    const buyAnnual =
      recurringBuyCash + (year === 1 ? downAndClosing : 0);

    buyOutlayCumulative += buyAnnual;
    totalLoanPayment += loanPayment;
    totalInterest += loanInterest;
    totalOwnershipCost += annualOwnershipCost;
    totalTaxCredit += taxCredit;

    const saleValue = estimateSaleValue(
      inputs.propertyPrice,
      inputs.salePrice,
      inputs.holdingYears,
      year,
    );
    const netSaleProceeds = saleValue - inputs.saleCost;
    const buyNetCost = buyOutlayCumulative + balanceAtEnd - netSaleProceeds;
    const difference = rentCumulative - buyNetCost;

    rows.push({
      year,
      rentAnnual,
      rentCumulative,
      buyAnnual,
      loanBalance: balanceAtEnd,
      buyNetCost,
      difference,
      isBreakEven: false,
    });
  }

  let breakEvenYear: number | null = null;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index].difference >= 0) {
      breakEvenYear = rows[index].year;
    } else {
      break;
    }
  }

  if (breakEvenYear !== null) {
    for (const row of rows) {
      row.isBreakEven = row.year === breakEvenYear;
    }
  }

  const finalRow = rows[rows.length - 1];

  return {
    holdingYears: inputs.holdingYears,
    rentTotal: finalRow.rentCumulative,
    buyTotalPaid: buyOutlayCumulative,
    buyNetCost: finalRow.buyNetCost,
    difference: finalRow.difference,
    breakEvenYear,
    totalLoanPayment,
    totalInterest,
    totalOwnershipCost,
    totalTaxCredit,
    remainingLoan: finalRow.loanBalance,
    netSaleProceeds: inputs.salePrice - inputs.saleCost,
    rows,
  };
}

function describeDifference(result: Simulation): string {
  if (result.difference > 0) {
    return `${result.holdingYears}年保有する場合、購入の売却後実質コストは賃貸総支払額より約${formatYen(result.difference)}少ない試算です。`;
  }
  if (result.difference < 0) {
    return `${result.holdingYears}年保有する場合、購入の売却後実質コストは賃貸総支払額より約${formatYen(-result.difference)}多い試算です。`;
  }
  return `${result.holdingYears}年保有する場合、賃貸と購入の負担はほぼ同額の試算です。`;
}

function describeBreakEven(result: Simulation): string {
  if (result.breakEvenYear !== null) {
    return `${result.breakEvenYear}年目以降は購入の累計負担が賃貸を下回り続ける目安です。`;
  }
  return '選択した保有期間内では、購入の累計負担が賃貸を下回らない目安です。';
}

function NumberField({
  id,
  label,
  unit,
  hint,
  error,
  value,
  onChange,
  placeholder,
  inputMode = 'decimal',
  range,
}: NumberFieldProps) {
  const describedBy = error ? `${id}-error` : `${id}-help`;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold text-[var(--ink)]">
          {label}
          <span className="text-xs font-normal text-[var(--ink-soft)]">
            （{unit}）
          </span>
        </label>
        {range ? (
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            {range}
          </span>
        ) : null}
      </div>
      <input
        id={id}
        name={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={error !== null}
        aria-describedby={describedBy}
        className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
        >
          {error}
        </p>
      ) : (
        <p
          id={`${id}-help`}
          className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`min-w-0 border p-4 ${
        accent
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : 'border-[var(--line)] bg-[var(--paper)]'
      }`}
    >
      <p
        className={`font-label text-[9px] ${
          accent ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]'
        }`}
      >
        {label}
      </p>
      <p
        className={`font-editorial mt-1 break-words text-xl leading-tight tabular-nums ${
          accent ? 'text-[var(--accent)]' : 'text-[var(--ink)]'
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
        {note}
      </p>
    </div>
  );
}

export function RentVsBuy() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const updateField = (key: StringFieldKey, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const holdingField = validateYears(form.holdingYears, '保有期間', 5, 50);
  const rentField = validateYen(form.monthlyRent, '家賃', { positive: true });
  const rentManagementField = validateYen(
    form.rentManagement,
    '管理費/共益費',
  );
  const renewalField = validateYen(form.renewalAmount, '更新料');
  const rentChangeField = validateRate(
    form.rentChange,
    '家賃変動率',
    -20,
    20,
  );
  const priceField = validateManYen(form.propertyPrice, '物件価格', {
    positive: true,
  });
  const downPaymentBase = validateManYen(form.downPayment, '頭金');
  const downPaymentField: ValidationResult =
    downPaymentBase.value !== null &&
    priceField.value !== null &&
    downPaymentBase.value > priceField.value
      ? { value: null, error: '頭金は物件価格以下で入力してください。' }
      : downPaymentBase;
  const loanRateField = validateRate(form.loanRate, 'ローン金利', 0, 100);
  const loanYearsField = validateYears(form.loanYears, '返済期間', 1, 50);
  const buyManagementField = validateYen(form.buyManagement, '管理費');
  const repairReserveField = validateYen(form.repairReserve, '修繕積立金');
  const propertyTaxField = validateYen(form.propertyTax, '固定資産税');
  const purchaseCostsField = validateManYen(form.purchaseCosts, '購入諸費用');
  const repairCostField = validateYen(form.repairCost, '修繕費');
  const salePriceField = validateManYen(form.salePrice, '売却想定価格');
  const saleCostField = validateManYen(form.saleCost, '売却費用');
  const taxCreditField = validateYen(form.taxCredit, '住宅ローン控除', {
    optional: true,
  });

  const fields = [
    holdingField,
    rentField,
    rentManagementField,
    renewalField,
    rentChangeField,
    priceField,
    downPaymentField,
    loanRateField,
    loanYearsField,
    buyManagementField,
    repairReserveField,
    propertyTaxField,
    purchaseCostsField,
    repairCostField,
    salePriceField,
    saleCostField,
    taxCreditField,
  ];
  const firstError = fields.find((field) => field.error !== null)?.error ?? null;

  const simulationInputs: SimulationInputs | null =
    holdingField.value !== null &&
    rentField.value !== null &&
    rentManagementField.value !== null &&
    renewalField.value !== null &&
    rentChangeField.value !== null &&
    priceField.value !== null &&
    downPaymentField.value !== null &&
    loanRateField.value !== null &&
    loanYearsField.value !== null &&
    buyManagementField.value !== null &&
    repairReserveField.value !== null &&
    propertyTaxField.value !== null &&
    purchaseCostsField.value !== null &&
    repairCostField.value !== null &&
    salePriceField.value !== null &&
    saleCostField.value !== null &&
    taxCreditField.value !== null
      ? {
          holdingYears: holdingField.value,
          monthlyRent: rentField.value,
          monthlyRentManagement: rentManagementField.value,
          annualRenewal:
            form.renewalMode === 'annual'
              ? renewalField.value
              : renewalField.value / 2,
          rentChangeRate: rentChangeField.value,
          propertyPrice: priceField.value,
          downPayment: downPaymentField.value,
          loanRate: loanRateField.value,
          loanYears: loanYearsField.value,
          monthlyBuyManagement: buyManagementField.value,
          monthlyRepairReserve: repairReserveField.value,
          annualPropertyTax: propertyTaxField.value,
          purchaseCosts: purchaseCostsField.value,
          annualRepairCost: repairCostField.value,
          salePrice: salePriceField.value,
          saleCost: saleCostField.value,
          annualTaxCredit: taxCreditField.value,
        }
      : null;

  const result = simulationInputs
    ? calculateSimulation(simulationInputs)
    : null;
  const summaryText = result ? describeDifference(result) : null;
  const breakEvenText = result ? describeBreakEven(result) : null;
  const statusMessage =
    result && summaryText && breakEvenText
      ? `${summaryText}${breakEvenText}`
      : (firstError ?? '入力内容を確認すると試算結果を表示します。');

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
  };

  return (
    <div className="min-w-0 space-y-5">
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="space-y-5"
        aria-labelledby="rent-buy-form-heading"
      >
        <h2 id="rent-buy-form-heading" className="sr-only">
          賃貸と購入の比較条件
        </h2>

        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          <section
            aria-labelledby="rent-conditions-heading"
            className="paper-panel min-w-0 p-4 sm:p-6"
          >
            <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <p className="paper-kicker text-[9px]">Input 01</p>
                <h3
                  id="rent-conditions-heading"
                  className="font-editorial mt-1 text-xl"
                >
                  賃貸条件と保有期間
                </h3>
              </div>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                01 / 03
              </span>
            </div>

            <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
              比較する保有期間と、賃貸を続けた場合の家賃・更新料を入力します。入力内容は保存・送信されません。
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <NumberField
                id="holding-years"
                label="保有期間"
                unit="年"
                range="5–50"
                inputMode="numeric"
                value={form.holdingYears}
                onChange={(value) => updateField('holdingYears', value)}
                error={holdingField.error}
                hint="比較する年数です。5〜50年の整数で入力します。"
                placeholder="例: 10"
              />
              <NumberField
                id="rent-change"
                label="家賃変動率"
                unit="% / 年"
                range="-20–20"
                value={form.rentChange}
                onChange={(value) => updateField('rentChange', value)}
                error={rentChangeField.error}
                hint="毎年の家賃の変化率です。0%なら一定、マイナスも入力できます。"
                placeholder="例: 0"
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberField
                id="monthly-rent"
                label="家賃"
                unit="円 / 月"
                range="1円〜"
                value={form.monthlyRent}
                onChange={(value) => updateField('monthlyRent', value)}
                error={rentField.error}
                hint="現在の月額家賃を入力します。"
                placeholder="例: 120000"
              />
              <NumberField
                id="rent-management"
                label="管理費/共益費"
                unit="円 / 月"
                range="0円〜"
                value={form.rentManagement}
                onChange={(value) => updateField('rentManagement', value)}
                error={rentManagementField.error}
                hint="賃貸の月額管理費・共益費です。0円も入力できます。"
                placeholder="例: 5000"
              />
            </div>

            <fieldset className="mt-5 min-w-0">
              <legend className="text-sm font-bold text-[var(--ink)]">
                更新料の入力方法
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {RENEWAL_OPTIONS.map((option) => {
                  const isSelected = form.renewalMode === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`paper-chip min-w-0 cursor-pointer rounded-sm px-3 py-3 text-left focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                        isSelected ? 'paper-chip-active' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="renewal-mode"
                        value={option.value}
                        checked={isSelected}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            renewalMode: option.value,
                          }))
                        }
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

            <div className="mt-4">
              <NumberField
                id="renewal-amount"
                label="更新料"
                unit={
                  form.renewalMode === 'annual' ? '円 / 年' : '円 / 2年'
                }
                range="0円〜"
                value={form.renewalAmount}
                onChange={(value) => updateField('renewalAmount', value)}
                error={renewalField.error}
                hint={
                  form.renewalMode === 'annual'
                    ? '毎年支払う更新料の年額を入力します。'
                    : '2年ごとに支払う更新料を入力すると、年額に換算して計算します。'
                }
                placeholder="例: 120000"
              />
            </div>

            <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
              家賃変動率は家賃だけに適用し、管理費/共益費と更新料は一定として計算します。更新料は選択した方法で年額に換算します。
            </p>
          </section>

          <section
            aria-labelledby="buy-conditions-heading"
            className="paper-panel min-w-0 p-4 sm:p-6"
          >
            <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <p className="paper-kicker text-[9px]">Input 02</p>
                <h3
                  id="buy-conditions-heading"
                  className="font-editorial mt-1 text-xl"
                >
                  購入条件と売却条件
                </h3>
              </div>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                02 / 03
              </span>
            </div>

            <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
              購入時の条件と、所有中・売却時にかかる費用を入力します。金額は円単位に丸めて計算します。
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <NumberField
                id="property-price"
                label="物件価格"
                unit="万円"
                range="1円〜"
                value={form.propertyPrice}
                onChange={(value) => updateField('propertyPrice', value)}
                error={priceField.error}
                hint="購入する物件の価格です。"
                placeholder="例: 4000"
              />
              <NumberField
                id="down-payment"
                label="頭金"
                unit="万円"
                range="0円〜"
                value={form.downPayment}
                onChange={(value) => updateField('downPayment', value)}
                error={downPaymentField.error}
                hint="自己資金から出す頭金です。物件価格以下で入力します。"
                placeholder="例: 800"
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberField
                id="loan-rate"
                label="ローン金利"
                unit="% / 年"
                range="0–100"
                value={form.loanRate}
                onChange={(value) => updateField('loanRate', value)}
                error={loanRateField.error}
                hint="固定金利として計算します。0%なら無利息です。"
                placeholder="例: 1.2"
              />
              <NumberField
                id="loan-years"
                label="返済期間"
                unit="年"
                range="1–50"
                inputMode="numeric"
                value={form.loanYears}
                onChange={(value) => updateField('loanYears', value)}
                error={loanYearsField.error}
                hint="ローンを返済する年数です。保有期間より長くてもかまいません。"
                placeholder="例: 35"
              />
            </div>

            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <h4 className="font-label text-[9px] text-[var(--ink-soft)]">
                所有中にかかる費用
              </h4>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="buy-management"
                  label="管理費"
                  unit="円 / 月"
                  range="0円〜"
                  value={form.buyManagement}
                  onChange={(value) => updateField('buyManagement', value)}
                  error={buyManagementField.error}
                  hint="購入後の月額管理費です。"
                  placeholder="例: 15000"
                />
                <NumberField
                  id="repair-reserve"
                  label="修繕積立金"
                  unit="円 / 月"
                  range="0円〜"
                  value={form.repairReserve}
                  onChange={(value) => updateField('repairReserve', value)}
                  error={repairReserveField.error}
                  hint="購入後の月額修繕積立金です。"
                  placeholder="例: 10000"
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="property-tax"
                  label="固定資産税"
                  unit="円 / 年"
                  range="0円〜"
                  value={form.propertyTax}
                  onChange={(value) => updateField('propertyTax', value)}
                  error={propertyTaxField.error}
                  hint="固定資産税・都市計画税などの年額目安です。"
                  placeholder="例: 150000"
                />
                <NumberField
                  id="repair-cost"
                  label="修繕費"
                  unit="円 / 年"
                  range="0円〜"
                  value={form.repairCost}
                  onChange={(value) => updateField('repairCost', value)}
                  error={repairCostField.error}
                  hint="専有部分の修繕など、年間の修繕費目安です。"
                  placeholder="例: 50000"
                />
              </div>
            </div>

            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <h4 className="font-label text-[9px] text-[var(--ink-soft)]">
                購入時・売却時の費用
              </h4>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="purchase-costs"
                  label="購入諸費用"
                  unit="万円"
                  range="0円〜"
                  value={form.purchaseCosts}
                  onChange={(value) => updateField('purchaseCosts', value)}
                  error={purchaseCostsField.error}
                  hint="仲介手数料・登記費用・税金などの購入時費用です。"
                  placeholder="例: 280"
                />
                <NumberField
                  id="tax-credit"
                  label="住宅ローン控除"
                  unit="円 / 年"
                  range="任意"
                  value={form.taxCredit}
                  onChange={(value) => updateField('taxCredit', value)}
                  error={taxCreditField.error}
                  hint="任意。空欄は0円です。年末ローン残高がある年だけ差し引きます。"
                  placeholder="例: 200000"
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="sale-price"
                  label="売却想定価格"
                  unit="万円"
                  range="0円〜"
                  value={form.salePrice}
                  onChange={(value) => updateField('salePrice', value)}
                  error={salePriceField.error}
                  hint="保有期間の末日に売却する際の想定価格です。"
                  placeholder="例: 3600"
                />
                <NumberField
                  id="sale-cost"
                  label="売却費用"
                  unit="万円"
                  range="0円〜"
                  value={form.saleCost}
                  onChange={(value) => updateField('saleCost', value)}
                  error={saleCostField.error}
                  hint="仲介手数料や登記費用などの売却時費用です。"
                  placeholder="例: 120"
                />
              </div>
            </div>

            <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
              購入諸費用は購入時に一括、売却費用は売却時に一括で計上します。金利は固定、ボーナス返済なしとして計算します。
            </p>
          </section>
        </div>

        <div className="paper-panel-flat flex flex-wrap items-center gap-3 p-4">
          <button
            type="button"
            onClick={resetForm}
            className="paper-button rounded-sm px-4 py-2 text-xs"
          >
            初期値に戻す
          </button>
          <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
            入力内容は保存・送信されません。結果は入力に合わせて自動で更新されます。
          </p>
        </div>
      </form>

      <section
        aria-labelledby="rent-buy-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="rent-buy-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              比較結果
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            03 / 03
          </span>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>

        {result && summaryText && breakEvenText ? (
          <>
            <div className="mt-4 border border-[var(--line)] bg-[var(--paper-muted)] px-4 py-3">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                Summary
              </p>
              <p className="font-editorial mt-1 text-lg leading-snug">
                {summaryText}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                {breakEvenText}
              </p>
            </div>

            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="賃貸総支払額"
                value={formatYen(result.rentTotal)}
                note="家賃・管理費/共益費・更新料の累計です。"
              />
              <MetricCard
                label="購入総支払額"
                value={formatYen(result.buyTotalPaid)}
                note="頭金・購入諸費用・ローン返済・保有コストから控除を差し引いた額です。"
              />
              <MetricCard
                label="売却後実質コスト"
                value={formatYen(result.buyNetCost)}
                note="売却時ローン残債を加え、売却純収入を差し引いた額です。"
              />
              <MetricCard
                label="差額（賃貸−購入）"
                value={formatSignedYen(result.difference)}
                note="プラスは購入の方が負担が少ない目安です。"
                accent
              />
              <MetricCard
                label="損益分岐年数"
                value={
                  result.breakEvenYear !== null
                    ? `${result.breakEvenYear}年目`
                    : '期間内なし'
                }
                note="購入の累計負担が賃貸を下回り続ける最初の年です。"
              />
            </div>

            <div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-3 text-[11px] leading-5 text-[var(--ink-soft)] sm:grid-cols-2 xl:grid-cols-3">
              <p>
                ローン返済総額（保有期間中）:{' '}
                <span className="font-bold text-[var(--ink)]">
                  {formatYen(result.totalLoanPayment)}
                </span>
              </p>
              <p>
                うち利息:{' '}
                <span className="font-bold text-[var(--ink)]">
                  {formatYen(result.totalInterest)}
                </span>
              </p>
              <p>
                保有コスト合計:{' '}
                <span className="font-bold text-[var(--ink)]">
                  {formatYen(result.totalOwnershipCost)}
                </span>
              </p>
              <p>
                住宅ローン控除の控除合計:{' '}
                <span className="font-bold text-[var(--ink)]">
                  {formatYen(result.totalTaxCredit)}
                </span>
              </p>
              <p>
                売却時ローン残債:{' '}
                <span className="font-bold text-[var(--ink)]">
                  {formatYen(result.remainingLoan)}
                </span>
              </p>
              <p>
                売却純収入:{' '}
                <span className="font-bold text-[var(--ink)]">
                  {formatYen(result.netSaleProceeds)}
                </span>
              </p>
            </div>
          </>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="text-sm font-bold text-[var(--ink)]">
              入力内容を確認してください
            </p>
            <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
              未入力または範囲外の項目があります。各入力欄のメッセージを確認すると、ここに比較結果が表示されます。
            </p>
          </div>
        )}

        <div
          role="note"
          className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            この試算について
          </p>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            結果は概算・将来の価格/金利/税制を保証しないものです。金利変動、住宅ローン控除の適用条件、税制改正、修繕の発生時期、売却手数料、空室期間などにより実際の金額は異なります。特定の物件や金融商品を勧めるものではないため、契約前に金融機関や専門家へご確認ください。
          </p>
        </div>
      </section>

      {result && (
        <section
          aria-labelledby="rent-buy-schedule-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Schedule</p>
              <h2
                id="rent-buy-schedule-heading"
                className="font-editorial mt-1 text-xl"
              >
                年次比較表
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {result.holdingYears} Years
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            1年ごとの賃貸支払額と購入負担の比較です。購入年間の1年目には頭金と購入諸費用を含み、売却後累計は各年で売却した場合のローン残債と売却純収入を反映しています。
          </p>

          <div
            role="region"
            aria-label="年次比較表。横にスクロールできます。"
            tabIndex={0}
            className="mt-3 max-h-[28rem] overflow-auto border border-[var(--line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <table className="w-full min-w-[54rem] border-collapse text-right text-xs tabular-nums">
              <caption className="sr-only">
                {result.holdingYears}年間の賃貸と購入の年次比較
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
                    賃貸年間
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    賃貸累計
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    購入年間
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    ローン残債
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    売却後累計
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    差額
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr
                    key={row.year}
                    className={`border-b border-[var(--line)] last:border-b-0 ${
                      row.isBreakEven ? 'bg-[var(--accent-soft)]' : ''
                    }`}
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-3 py-2 text-left font-bold text-[var(--ink)]"
                    >
                      {row.year}年目
                      {row.isBreakEven && (
                        <span className="ml-1 font-label text-[8px] text-[var(--accent)]">
                          分岐
                        </span>
                      )}
                    </th>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatYen(row.rentAnnual)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatYen(row.rentCumulative)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatYen(row.buyAnnual)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatYen(row.loanBalance)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatYen(row.buyNetCost)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 font-bold ${
                        row.difference > 0 ? 'text-[var(--teal)]' : ''
                      }`}
                    >
                      {formatSignedYen(row.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            差額は「賃貸累計 − 売却後累計」です。プラスなら購入の方が負担が少ない目安です。表の中を横にスクロールすると、スマートフォンでも残りの列を確認できます。
          </p>
        </section>
      )}
    </div>
  );
}
