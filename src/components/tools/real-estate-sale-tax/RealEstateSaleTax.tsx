'use client';

import { useState } from 'react';

type HoldingPeriod = 'long' | 'short';
type DeductionChoice = 'yes' | 'no';

type FieldResult = {
  value: number | null;
  error: string | null;
};

type SaleTaxResult = {
  salePrice: number;
  acquisitionCost: number;
  transferCost: number;
  remainingDebt: number;
  grossGain: number;
  specialDeduction: number;
  otherDeduction: number;
  transferIncome: number;
  taxableIncome: number;
  incomeTax: number;
  reconstructionTax: number;
  residentTax: number;
  taxTotal: number;
  netProceeds: number;
  afterDebt: number;
  effectiveRate: number;
};

const MAX_AMOUNT_YEN = 1_000_000_000_000;
const SPECIAL_DEDUCTION_YEN = 30_000_000;
const numberFormatter = new Intl.NumberFormat('ja-JP');
const percentFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 3,
});
const GROUPED_DECIMAL_PATTERN =
  /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

const HOLDING_OPTIONS: {
  value: HoldingPeriod;
  label: string;
  description: string;
}[] = [
  {
    value: 'long',
    label: '5年超',
    description: '長期譲渡所得として計算',
  },
  {
    value: 'short',
    label: '5年以下',
    description: '短期譲渡所得として計算',
  },
];

const DEDUCTION_OPTIONS: {
  value: DeductionChoice;
  label: string;
  description: string;
}[] = [
  {
    value: 'yes',
    label: 'あり',
    description: '最大3000万円を控除',
  },
  {
    value: 'no',
    label: 'なし',
    description: '控除を適用しない',
  },
];

const LONG_TERM_RATES = {
  income: '15',
  reconstruction: '0.315',
  resident: '5',
};

const SHORT_TERM_RATES = {
  income: '30',
  reconstruction: '0.63',
  resident: '9',
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

function toYen(value: number): number | null {
  const rounded = Math.round(value);
  return Number.isSafeInteger(rounded) ? rounded : null;
}

function validateRequiredAmount(raw: string, label: string): FieldResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized, true);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed <= 0) {
    return { value: null, error: `${label}は1円以上で入力してください。` };
  }

  if (parsed > MAX_AMOUNT_YEN) {
    return { value: null, error: `${label}は1兆円以下で入力してください。` };
  }

  const yen = toYen(parsed);
  if (yen === null || yen < 1) {
    return { value: null, error: `${label}は1円以上で入力してください。` };
  }

  return { value: yen, error: null };
}

function validateOptionalAmount(raw: string, label: string): FieldResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: 0, error: null };
  }

  const parsed = parseDecimal(normalized, true);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < 0) {
    return { value: null, error: `${label}は0円以上で入力してください。` };
  }

  if (parsed > MAX_AMOUNT_YEN) {
    return { value: null, error: `${label}は1兆円以下で入力してください。` };
  }

  const yen = toYen(parsed);
  if (yen === null || yen < 0) {
    return { value: null, error: `${label}は0円以上で入力してください。` };
  }

  return { value: yen, error: null };
}

function validateRate(raw: string, label: string): FieldResult {
  const normalized = normalizeNumberText(raw);
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

function formatYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${numberFormatter.format(Math.round(value))}円`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${percentFormatter.format(value)}%`;
}

function roundRateAmount(amountYen: number, ratePercent: number): number {
  const scaled = (amountYen * ratePercent) / 100;
  return Math.round(scaled + Number.EPSILON * Math.abs(scaled));
}

function calculateSaleTax(
  salePrice: number,
  acquisitionCost: number,
  transferCost: number,
  otherDeductionInput: number,
  remainingDebt: number,
  useSpecialDeduction: boolean,
  incomeRate: number,
  reconstructionRate: number,
  residentRate: number,
): SaleTaxResult {
  const grossGain = salePrice - acquisitionCost - transferCost;
  const specialDeduction = useSpecialDeduction
    ? Math.min(SPECIAL_DEDUCTION_YEN, Math.max(0, grossGain))
    : 0;
  const gainAfterSpecial = Math.max(0, grossGain - specialDeduction);
  const otherDeduction = Math.min(
    Math.max(0, otherDeductionInput),
    gainAfterSpecial,
  );
  const transferIncome = grossGain - specialDeduction - otherDeduction;
  const taxableIncome = Math.max(0, transferIncome);

  const incomeTax = roundRateAmount(taxableIncome, incomeRate);
  const reconstructionTax = roundRateAmount(
    taxableIncome,
    reconstructionRate,
  );
  const residentTax = roundRateAmount(taxableIncome, residentRate);
  const taxTotal = incomeTax + reconstructionTax + residentTax;
  const netProceeds = salePrice - transferCost - taxTotal;
  const afterDebt = netProceeds - remainingDebt;
  const effectiveRate =
    taxableIncome > 0 ? (taxTotal / taxableIncome) * 100 : 0;

  return {
    salePrice,
    acquisitionCost,
    transferCost,
    remainingDebt,
    grossGain,
    specialDeduction,
    otherDeduction,
    transferIncome,
    taxableIncome,
    incomeTax,
    reconstructionTax,
    residentTax,
    taxTotal,
    netProceeds,
    afterDebt,
    effectiveRate,
  };
}

type AmountFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  placeholder: string;
  help: string;
  field: FieldResult;
  onChange: (value: string) => void;
};

function AmountField({
  id,
  name,
  label,
  value,
  placeholder,
  help,
  field,
  onChange,
}: AmountFieldProps) {
  const describedBy = field.error ? `${id}-error` : `${id}-help`;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold text-[var(--ink)]">
          {label}
        </label>
        <span className="font-label text-[9px] text-[var(--ink-soft)]">
          円
        </span>
      </div>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={field.error !== null}
        aria-describedby={describedBy}
        className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
      />
      {field.error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
        >
          {field.error}
        </p>
      ) : (
        <p
          id={`${id}-help`}
          className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
        >
          {help}
        </p>
      )}
    </div>
  );
}

type RateFieldProps = {
  id: string;
  label: string;
  value: string;
  help: string;
  field: FieldResult;
  onChange: (value: string) => void;
};

function RateField({
  id,
  label,
  value,
  help,
  field,
  onChange,
}: RateFieldProps) {
  const describedBy = field.error ? `${id}-error` : `${id}-help`;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold text-[var(--ink)]">
          {label}
        </label>
        <span className="font-label text-[9px] text-[var(--ink-soft)]">
          %
        </span>
      </div>
      <input
        id={id}
        name={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step="0.001"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={field.error !== null}
        aria-describedby={describedBy}
        className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
      />
      {field.error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
        >
          {field.error}
        </p>
      ) : (
        <p
          id={`${id}-help`}
          className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
        >
          {help}
        </p>
      )}
    </div>
  );
}

export function RealEstateSaleTax() {
  const [salePrice, setSalePrice] = useState('68000000');
  const [acquisitionCost, setAcquisitionCost] = useState('32000000');
  const [transferCost, setTransferCost] = useState('2200000');
  const [otherDeduction, setOtherDeduction] = useState('0');
  const [remainingDebt, setRemainingDebt] = useState('15000000');
  const [holdingPeriod, setHoldingPeriod] = useState<HoldingPeriod>('long');
  const [specialDeduction, setSpecialDeduction] =
    useState<DeductionChoice>('yes');
  const [incomeRate, setIncomeRate] = useState(LONG_TERM_RATES.income);
  const [reconstructionRate, setReconstructionRate] = useState(
    LONG_TERM_RATES.reconstruction,
  );
  const [residentRate, setResidentRate] = useState(LONG_TERM_RATES.resident);

  const salePriceField = validateRequiredAmount(salePrice, '売却価格');
  const acquisitionCostField = validateOptionalAmount(
    acquisitionCost,
    '取得費',
  );
  const transferCostField = validateOptionalAmount(transferCost, '譲渡費用');
  const otherDeductionField = validateOptionalAmount(
    otherDeduction,
    'その他控除',
  );
  const remainingDebtField = validateOptionalAmount(
    remainingDebt,
    '売却時残債',
  );
  const incomeRateField = validateRate(incomeRate, '所得税率');
  const reconstructionRateField = validateRate(
    reconstructionRate,
    '復興税率',
  );
  const residentRateField = validateRate(residentRate, '住民税率');

  const result =
    salePriceField.value !== null &&
    acquisitionCostField.value !== null &&
    transferCostField.value !== null &&
    otherDeductionField.value !== null &&
    remainingDebtField.value !== null &&
    incomeRateField.value !== null &&
    reconstructionRateField.value !== null &&
    residentRateField.value !== null
      ? calculateSaleTax(
          salePriceField.value,
          acquisitionCostField.value,
          transferCostField.value,
          otherDeductionField.value,
          remainingDebtField.value,
          specialDeduction === 'yes',
          incomeRateField.value,
          reconstructionRateField.value,
          residentRateField.value,
        )
      : null;

  const isLongTerm = holdingPeriod === 'long';
  const usesSpecialDeduction = specialDeduction === 'yes';
  const combinedIncomeRate =
    (incomeRateField.value ?? 0) + (reconstructionRateField.value ?? 0);

  const statusMessage = result
    ? `譲渡所得は${formatYen(result.transferIncome)}、課税所得は${formatYen(result.taxableIncome)}、所得税・復興税は${formatYen(result.incomeTax + result.reconstructionTax)}、住民税は${formatYen(result.residentTax)}、税金合計は${formatYen(result.taxTotal)}です。売却手取りは${formatYen(result.netProceeds)}、残債返済後手残りは${formatYen(result.afterDebt)}です。`
    : '入力内容を確認すると試算結果を表示します。';

  const applyStandardRates = (period: HoldingPeriod) => {
    const rates = period === 'long' ? LONG_TERM_RATES : SHORT_TERM_RATES;
    setIncomeRate(rates.income);
    setReconstructionRate(rates.reconstruction);
    setResidentRate(rates.resident);
  };

  const handleHoldingChange = (period: HoldingPeriod) => {
    setHoldingPeriod(period);
    applyStandardRates(period);
  };

  const resetForm = () => {
    setSalePrice('68000000');
    setAcquisitionCost('32000000');
    setTransferCost('2200000');
    setOtherDeduction('0');
    setRemainingDebt('15000000');
    setHoldingPeriod('long');
    setSpecialDeduction('yes');
    applyStandardRates('long');
  };

  const resultCards = result
    ? [
        { label: '譲渡所得', value: result.transferIncome },
        { label: '課税所得', value: result.taxableIncome },
        { label: '税金合計', value: result.taxTotal },
        { label: '売却手取り', value: result.netProceeds },
      ]
    : [];

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]"
        aria-label="不動産売却の税金・手取りシミュレーター"
      >
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="real-estate-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2
                id="real-estate-form-heading"
                className="font-editorial mt-1 text-xl"
              >
                売却条件を入力
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              01 / 02
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            金額は円単位で入力します。カンマ区切りも使えます。入力内容は保存・送信されません。
          </p>

          <div className="mt-5">
            <AmountField
              id="real-estate-sale-price"
              name="salePrice"
              label="売却価格"
              value={salePrice}
              placeholder="例: 68000000"
              help="不動産を売却した金額です。1円〜1兆円で入力できます。"
              field={salePriceField}
              onChange={setSalePrice}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AmountField
              id="real-estate-acquisition-cost"
              name="acquisitionCost"
              label="取得費"
              value={acquisitionCost}
              placeholder="例: 32000000"
              help="購入代金や建築費など。空欄は0円として計算します。"
              field={acquisitionCostField}
              onChange={setAcquisitionCost}
            />
            <AmountField
              id="real-estate-transfer-cost"
              name="transferCost"
              label="譲渡費用"
              value={transferCost}
              placeholder="例: 2200000"
              help="仲介手数料や印紙税など。空欄は0円です。"
              field={transferCostField}
              onChange={setTransferCost}
            />
            <AmountField
              id="real-estate-other-deduction"
              name="otherDeduction"
              label="その他控除"
              value={otherDeduction}
              placeholder="例: 0"
              help="特別控除以外の控除額。空欄は0円です。"
              field={otherDeductionField}
              onChange={setOtherDeduction}
            />
            <AmountField
              id="real-estate-remaining-debt"
              name="remainingDebt"
              label="売却時残債"
              value={remainingDebt}
              placeholder="例: 15000000"
              help="売却時に返済するローン残高。税金計算には使いません。"
              field={remainingDebtField}
              onChange={setRemainingDebt}
            />
          </div>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">
              所有期間
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {HOLDING_OPTIONS.map((option) => {
                const isSelected = holdingPeriod === option.value;
                return (
                  <label
                    key={option.value}
                    className={`paper-chip min-w-0 cursor-pointer rounded-sm px-3 py-3 text-left focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                      isSelected ? 'paper-chip-active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="holding-period"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => handleHoldingChange(option.value)}
                      className="sr-only"
                    />
                    <span className="block text-xs font-bold">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-5 opacity-80">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]">
              切り替えると、長期・短期それぞれの標準税率を税率欄へ入力します。税率は編集できます。
            </p>
          </fieldset>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">
              居住用財産の3000万円特別控除
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DEDUCTION_OPTIONS.map((option) => {
                const isSelected = specialDeduction === option.value;
                return (
                  <label
                    key={option.value}
                    className={`paper-chip min-w-0 cursor-pointer rounded-sm px-3 py-3 text-left focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                      isSelected ? 'paper-chip-active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="special-deduction"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setSpecialDeduction(option.value)}
                      className="sr-only"
                    />
                    <span className="block text-xs font-bold">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-5 opacity-80">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]">
              適用要件を満たす場合のみ「あり」を選んでください。控除額は最大3000万円です。
            </p>
          </fieldset>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">
              税率（編集できます）
            </legend>
            <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
              長期の標準は所得税15%＋復興0.315%（合計15.315%）、住民税5%です。短期は所得税30%＋復興0.63%、住民税9%が目安です。
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <RateField
                id="real-estate-income-rate"
                label="所得税率"
                value={incomeRate}
                help="課税所得に掛かる所得税の率。"
                field={incomeRateField}
                onChange={setIncomeRate}
              />
              <RateField
                id="real-estate-reconstruction-rate"
                label="復興税率"
                value={reconstructionRate}
                help="復興特別所得税の率。"
                field={reconstructionRateField}
                onChange={setReconstructionRate}
              />
              <RateField
                id="real-estate-resident-rate"
                label="住民税率"
                value={residentRate}
                help="課税所得に掛かる住民税の率。"
                field={residentRateField}
                onChange={setResidentRate}
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
              入力内容はブラウザ内だけで処理されます。
            </p>
          </div>
        </form>

        <section
          aria-labelledby="real-estate-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="real-estate-result-heading"
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
                {isLongTerm ? '5年超（長期譲渡）' : '5年以下（短期譲渡）'} /
                3000万円特別控除{usesSpecialDeduction ? 'あり' : 'なし'} /
                所得税＋復興 {formatPercent(combinedIncomeRate)}・住民税{' '}
                {formatPercent(residentRateField.value ?? 0)}
              </p>

              <div className="mt-3 space-y-3">
                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    残債返済後手残り
                  </p>
                  <p
                    className={`font-editorial mt-1 break-words text-3xl leading-tight tabular-nums ${
                      result.afterDebt < 0 ? 'text-[var(--accent)]' : ''
                    }`}
                  >
                    {formatYen(result.afterDebt)}
                  </p>
                  <p className="mt-2 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    売却手取りから売却時残債 {formatYen(result.remainingDebt)}{' '}
                    を差し引いた額です。
                  </p>
                  {result.afterDebt < 0 && (
                    <p className="mt-1 text-[11px] font-bold leading-5 text-[var(--accent)]">
                      残債が売却手取りを上回っています。追加の返済資金が必要になる可能性があります。
                    </p>
                  )}
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {resultCards.map((card) => (
                    <div
                      key={card.label}
                      className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4"
                    >
                      <p className="font-label text-[9px] text-[var(--ink-soft)]">
                        {card.label}
                      </p>
                      <p
                        className={`font-editorial mt-1 break-words text-xl leading-tight tabular-nums ${
                          card.label === '譲渡所得' && card.value < 0
                            ? 'text-[var(--accent)]'
                            : ''
                        }`}
                      >
                        {formatYen(card.value)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      税金の内訳
                    </p>
                    <span className="font-label text-[9px] text-[var(--ink-soft)]">
                      実効税率 {formatPercent(result.effectiveRate)}
                    </span>
                  </div>
                  <dl className="mt-2 divide-y divide-[var(--line)] text-sm">
                    <div className="flex items-baseline justify-between gap-4 py-2">
                      <dt className="text-[var(--ink)]">所得税・復興税</dt>
                      <dd className="break-words text-right font-bold tabular-nums">
                        {formatYen(result.incomeTax + result.reconstructionTax)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 py-2">
                      <dt className="text-[var(--ink)]">住民税</dt>
                      <dd className="break-words text-right font-bold tabular-nums">
                        {formatYen(result.residentTax)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    所得税 {formatYen(result.incomeTax)} ＋ 復興税{' '}
                    {formatYen(result.reconstructionTax)} の合計です。
                  </p>
                </div>
              </div>

              <details className="mt-4 min-w-0 border border-[var(--line)] bg-[var(--paper)]">
                <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
                  計算の内訳を見る
                </summary>
                <dl className="space-y-2 border-t border-[var(--line)] px-4 py-3 text-xs">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[var(--ink-soft)]">売却価格</dt>
                    <dd className="break-words text-right tabular-nums">
                      {formatYen(result.salePrice)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[var(--ink-soft)]">取得費</dt>
                    <dd className="break-words text-right tabular-nums">
                      {formatYen(result.acquisitionCost)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[var(--ink-soft)]">譲渡費用</dt>
                    <dd className="break-words text-right tabular-nums">
                      {formatYen(result.transferCost)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[var(--ink-soft)]">控除前の譲渡益</dt>
                    <dd className="break-words text-right tabular-nums">
                      {formatYen(result.grossGain)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[var(--ink-soft)]">
                      3000万円特別控除（適用額）
                    </dt>
                    <dd className="break-words text-right tabular-nums">
                      {formatYen(result.specialDeduction)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[var(--ink-soft)]">
                      その他控除（適用額）
                    </dt>
                    <dd className="break-words text-right tabular-nums">
                      {formatYen(result.otherDeduction)}
                    </dd>
                  </div>
                </dl>
                <p className="border-t border-[var(--line)] px-4 py-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                  譲渡所得＝控除前の譲渡益−特別控除−その他控除。売却手取り＝売却価格−譲渡費用−税金合計。残債返済後手残り＝売却手取り−売却時残債。
                </p>
              </details>
            </>
          ) : (
            <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="text-sm font-bold text-[var(--ink)]">
                入力内容を確認してください
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                売却価格と各税率を正しく入力すると、ここに試算結果が表示されます。任意の金額欄は空欄でも計算できます。
              </p>
            </div>
          )}

          <div
            role="note"
            className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              税務判断は専門家へ。制度改正に注意
            </p>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
              この試算は簡易計算による概算です。実際の譲渡所得や税額は、取得費の範囲、譲渡費用、各種特例、所有期間の判定、端数処理などにより異なります。申告や特例の適用可否は、税務署または税理士などの専門家へご確認ください。
            </p>
          </div>
        </section>
      </section>
    </div>
  );
}
