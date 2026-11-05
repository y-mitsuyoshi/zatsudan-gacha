'use client';

import { useState } from 'react';

type AmountUnit = 'man' | 'yen';
type LandCategory = 'small' | 'general' | 'nonResidential';
type NewBuildReduction = 'none' | 'applied';

type ValidationResult = {
  value: number | null;
  error: string | null;
};

type LandOption = {
  value: LandCategory;
  label: string;
  description: string;
  fixedFactor: number;
  cityFactor: number;
  fixedLabel: string;
  cityLabel: string;
};

type TaxInput = {
  landYen: number;
  buildingYen: number;
  landOption: LandOption;
  fixedRatePercent: number;
  cityRatePercent: number;
  reductionApplied: boolean;
  reductionRatePercent: number;
  reductionTargetPercent: number;
  adjustmentYen: number;
};

type TaxResult = {
  landFixed: number;
  landCity: number;
  buildingFixed: number;
  buildingCity: number;
  buildingFixedBeforeReduction: number;
  buildingReduction: number;
  fixedTotal: number;
  cityTotal: number;
  preAdjustmentTotal: number;
  adjustment: number;
  annualTotal: number;
  monthly: number;
  isZero: boolean;
};

const YEN_PER_MAN = 10_000;
const MAX_AMOUNT_YEN = 1_000_000_000_000;
const TAXABLE_VALUE_UNIT = 1_000;
const TAX_ROUNDING_UNIT = 100;
const numberFormatter = new Intl.NumberFormat('ja-JP');
const GROUPED_DECIMAL_PATTERN =
  /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

const UNIT_OPTIONS: { value: AmountUnit; label: string }[] = [
  { value: 'man', label: '万円' },
  { value: 'yen', label: '円' },
];

const LAND_OPTIONS: LandOption[] = [
  {
    value: 'small',
    label: '小規模住宅用地（200㎡以下）',
    description:
      '固定資産税は評価額の1/6、都市計画税は1/3を課税標準の目安とします。',
    fixedFactor: 1 / 6,
    cityFactor: 1 / 3,
    fixedLabel: '1/6',
    cityLabel: '1/3',
  },
  {
    value: 'general',
    label: '一般住宅用地（200㎡超）',
    description:
      '200㎡を超える住宅用地。固定資産税は1/3、都市計画税は2/3が目安です。',
    fixedFactor: 1 / 3,
    cityFactor: 2 / 3,
    fixedLabel: '1/3',
    cityLabel: '2/3',
  },
  {
    value: 'nonResidential',
    label: '非住宅',
    description:
      '住宅用地の特例はありません。評価額をそのまま課税標準の目安とします。',
    fixedFactor: 1,
    cityFactor: 1,
    fixedLabel: '1',
    cityLabel: '1',
  },
];

const REDUCTION_OPTIONS: {
  value: NewBuildReduction;
  label: string;
  description: string;
}[] = [
  {
    value: 'none',
    label: 'なし',
    description: '新築住宅軽減を適用せずに計算します。',
  },
  {
    value: 'applied',
    label: 'あり（編集可）',
    description: '建物の固定資産税に軽減を適用します。',
  },
];

function floorToUnit(value: number, unit: number): number {
  return Math.floor(value / unit + 1e-7) * unit;
}

function formatYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const rounded = Math.round(value);
  return `${numberFormatter.format(rounded === 0 ? 0 : rounded)}円`;
}

function formatSignedYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const rounded = Math.round(value);
  if (rounded === 0) {
    return '0円';
  }
  const sign = rounded > 0 ? '+' : '-';
  return `${sign}${numberFormatter.format(Math.abs(rounded))}円`;
}

function normalizeNumberText(raw: string): string {
  return raw.normalize('NFKC').trim().replace(/[−–—]/g, '-');
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
  if (!Number.isFinite(value)) {
    return '';
  }
  const rounded = Math.round(value * 10_000) / 10_000;
  return String(rounded);
}

function convertAmountInput(raw: string, from: AmountUnit, to: AmountUnit): string {
  if (from === to) {
    return raw;
  }
  const parsed = parseDecimal(raw, true);
  if (parsed === null) {
    return raw;
  }
  const yen = from === 'man' ? parsed * YEN_PER_MAN : parsed;
  const converted = to === 'man' ? yen / YEN_PER_MAN : yen;
  return formatInputNumber(converted);
}

function amountUnitHelp(unit: AmountUnit): string {
  return unit === 'man'
    ? '万円単位で入力します。小数も入力できます。'
    : '円単位で入力します。円未満は四捨五入します。';
}

function validateAmount(raw: string, unit: AmountUnit, label: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
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

  const yen = Math.round(parsed * (unit === 'man' ? YEN_PER_MAN : 1));
  if (!Number.isFinite(yen) || !Number.isSafeInteger(yen) || yen > MAX_AMOUNT_YEN) {
    return { value: null, error: `${label}は1兆円以下で入力してください。` };
  }

  return { value: yen, error: null };
}

function validateRate(raw: string, label: string): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = parseDecimal(normalized, false);
  if (parsed === null) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < 0 || parsed > 100) {
    return { value: null, error: `${label}は0〜100%の範囲で入力してください。` };
  }

  return { value: parsed, error: null };
}

function validateAdjustment(raw: string, unit: AmountUnit): ValidationResult {
  const normalized = normalizeNumberText(raw);
  if (normalized === '') {
    return { value: 0, error: null };
  }

  const parsed = parseDecimal(normalized, true);
  if (parsed === null) {
    return { value: null, error: 'その他調整は数値で入力してください。' };
  }

  const yen = Math.round(parsed * (unit === 'man' ? YEN_PER_MAN : 1));
  if (!Number.isFinite(yen) || !Number.isSafeInteger(yen) || Math.abs(yen) > MAX_AMOUNT_YEN) {
    return { value: null, error: 'その他調整は±1兆円以内で入力してください。' };
  }

  return { value: yen, error: null };
}

function calculateTaxes(input: TaxInput): TaxResult {
  const fixedRate = input.fixedRatePercent / 100;
  const cityRate = input.cityRatePercent / 100;

  const landTaxableFixed = floorToUnit(
    input.landYen * input.landOption.fixedFactor,
    TAXABLE_VALUE_UNIT,
  );
  const landTaxableCity = floorToUnit(
    input.landYen * input.landOption.cityFactor,
    TAXABLE_VALUE_UNIT,
  );
  const buildingTaxable = floorToUnit(input.buildingYen, TAXABLE_VALUE_UNIT);

  const landFixed = floorToUnit(landTaxableFixed * fixedRate, TAX_ROUNDING_UNIT);
  const landCity = floorToUnit(landTaxableCity * cityRate, TAX_ROUNDING_UNIT);

  const buildingFixedBeforeReduction = floorToUnit(
    buildingTaxable * fixedRate,
    TAX_ROUNDING_UNIT,
  );
  const reductionFraction = input.reductionApplied
    ? (input.reductionRatePercent / 100) * (input.reductionTargetPercent / 100)
    : 0;
  const buildingFixed = floorToUnit(
    buildingFixedBeforeReduction * (1 - reductionFraction),
    TAX_ROUNDING_UNIT,
  );
  const buildingReduction = buildingFixedBeforeReduction - buildingFixed;
  const buildingCity = floorToUnit(buildingTaxable * cityRate, TAX_ROUNDING_UNIT);

  const fixedTotal = landFixed + buildingFixed;
  const cityTotal = landCity + buildingCity;
  const preAdjustmentTotal = fixedTotal + cityTotal;
  const annualTotal = preAdjustmentTotal + input.adjustmentYen;

  return {
    landFixed,
    landCity,
    buildingFixed,
    buildingCity,
    buildingFixedBeforeReduction,
    buildingReduction,
    fixedTotal,
    cityTotal,
    preAdjustmentTotal,
    adjustment: input.adjustmentYen,
    annualTotal,
    monthly: Math.round(annualTotal / 12),
    isZero: annualTotal === 0,
  };
}

export function PropertyTaxCalculator() {
  const [unit, setUnit] = useState<AmountUnit>('man');
  const [landValue, setLandValue] = useState('3000');
  const [buildingValue, setBuildingValue] = useState('800');
  const [landCategory, setLandCategory] = useState<LandCategory>('small');
  const [reductionMode, setReductionMode] = useState<NewBuildReduction>('none');
  const [reductionRate, setReductionRate] = useState('50');
  const [reductionTarget, setReductionTarget] = useState('100');
  const [fixedRate, setFixedRate] = useState('1.4');
  const [cityRate, setCityRate] = useState('0.3');
  const [adjustment, setAdjustment] = useState('');

  const landField = validateAmount(landValue, unit, '土地の固定資産税評価額');
  const buildingField = validateAmount(
    buildingValue,
    unit,
    '建物の固定資産税評価額',
  );
  const fixedRateField = validateRate(fixedRate, '固定資産税率');
  const cityRateField = validateRate(cityRate, '都市計画税率');
  const adjustmentField = validateAdjustment(adjustment, unit);

  const reductionApplied = reductionMode === 'applied';
  const reductionRateField: ValidationResult = reductionApplied
    ? validateRate(reductionRate, '軽減割合')
    : { value: 0, error: null };
  const reductionTargetField: ValidationResult = reductionApplied
    ? validateRate(reductionTarget, '軽減対象の割合')
    : { value: 0, error: null };

  const landOption =
    LAND_OPTIONS.find((option) => option.value === landCategory) ??
    LAND_OPTIONS[0];

  let result: TaxResult | null = null;
  let adjustmentTotalError: string | null = null;

  if (
    landField.value !== null &&
    buildingField.value !== null &&
    fixedRateField.value !== null &&
    cityRateField.value !== null &&
    adjustmentField.value !== null &&
    (!reductionApplied ||
      (reductionRateField.value !== null &&
        reductionTargetField.value !== null))
  ) {
    const computed = calculateTaxes({
      landYen: landField.value,
      buildingYen: buildingField.value,
      landOption,
      fixedRatePercent: fixedRateField.value,
      cityRatePercent: cityRateField.value,
      reductionApplied,
      reductionRatePercent: reductionRateField.value ?? 0,
      reductionTargetPercent: reductionTargetField.value ?? 0,
      adjustmentYen: adjustmentField.value,
    });

    if (computed.annualTotal < 0) {
      adjustmentTotalError =
        '調整後の年間合計が0円を下回っています。その他調整の金額を見直してください。';
    } else {
      result = computed;
    }
  }

  const adjustmentDisplayError = adjustmentField.error ?? adjustmentTotalError;

  const statusMessage = result
    ? result.isZero
      ? '年間合計は0円です。評価額・税率・その他調整の入力内容を確認してください。'
      : `年間合計は約${formatYen(result.annualTotal)}、月換算は約${formatYen(result.monthly)}です。固定資産税は約${formatYen(result.fixedTotal)}、都市計画税は約${formatYen(result.cityTotal)}です。`
    : (adjustmentTotalError ??
      '入力内容を確認してください。結果はまだ表示されていません。');

  const handleUnitChange = (nextUnit: AmountUnit) => {
    if (nextUnit === unit) {
      return;
    }

    setLandValue((current) => convertAmountInput(current, unit, nextUnit));
    setBuildingValue((current) => convertAmountInput(current, unit, nextUnit));
    setAdjustment((current) => convertAmountInput(current, unit, nextUnit));
    setUnit(nextUnit);
  };

  const resetForm = () => {
    setUnit('man');
    setLandValue('3000');
    setBuildingValue('800');
    setLandCategory('small');
    setReductionMode('none');
    setReductionRate('50');
    setReductionTarget('100');
    setFixedRate('1.4');
    setCityRate('0.3');
    setAdjustment('');
  };

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
        aria-label="固定資産税・都市計画税シミュレーター"
      >
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="property-tax-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2 id="property-tax-form-heading" className="font-editorial mt-1 text-xl">
                評価額と条件を入力
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              01 / 02
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            評価額・特例・税率から年間の税額を概算します。入力内容は保存・送信されません。
          </p>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">
              金額の単位
            </legend>
            <div className="mt-2 grid w-full max-w-xs grid-cols-2 gap-1">
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
                      name="property-tax-unit"
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

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="property-tax-land-value"
                className="text-sm font-bold text-[var(--ink)]"
              >
                土地の固定資産税評価額
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                0〜1兆円
              </span>
            </div>
            <input
              id="property-tax-land-value"
              name="landValue"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={landValue}
              onChange={(event) => setLandValue(event.target.value)}
              placeholder={unit === 'man' ? '例: 3000' : '例: 30000000'}
              aria-invalid={landField.error !== null}
              aria-describedby={
                landField.error
                  ? 'property-tax-land-error'
                  : 'property-tax-land-help'
              }
              className="field-paper mt-2 min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {landField.error ? (
              <p
                id="property-tax-land-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {landField.error}
              </p>
            ) : (
              <p
                id="property-tax-land-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                {amountUnitHelp(unit)}
              </p>
            )}
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="property-tax-building-value"
                className="text-sm font-bold text-[var(--ink)]"
              >
                建物の固定資産税評価額
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                0〜1兆円
              </span>
            </div>
            <input
              id="property-tax-building-value"
              name="buildingValue"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={buildingValue}
              onChange={(event) => setBuildingValue(event.target.value)}
              placeholder={unit === 'man' ? '例: 800' : '例: 8000000'}
              aria-invalid={buildingField.error !== null}
              aria-describedby={
                buildingField.error
                  ? 'property-tax-building-error'
                  : 'property-tax-building-help'
              }
              className="field-paper mt-2 min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {buildingField.error ? (
              <p
                id="property-tax-building-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {buildingField.error}
              </p>
            ) : (
              <p
                id="property-tax-building-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                {amountUnitHelp(unit)}
              </p>
            )}
          </div>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">
              住宅用地の特例
            </legend>
            <div className="mt-2 grid gap-2">
              {LAND_OPTIONS.map((option) => {
                const isSelected = landCategory === option.value;
                return (
                  <label
                    key={option.value}
                    className={`paper-chip min-w-0 cursor-pointer rounded-sm px-3 py-3 text-left focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                      isSelected ? 'paper-chip-active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="property-tax-land-category"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setLandCategory(option.value)}
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
            <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              200㎡特例は、200㎡以下の部分を小規模住宅用地、200㎡を超える部分を一般住宅用地として扱うものです。このツールは土地全体を選んだ区分で一括計算する簡易方式で、実際は課税標準額に特例が適用されます。
            </p>
          </fieldset>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">
              新築住宅軽減
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {REDUCTION_OPTIONS.map((option) => {
                const isSelected = reductionMode === option.value;
                return (
                  <label
                    key={option.value}
                    className={`paper-chip min-w-0 cursor-pointer rounded-sm px-3 py-3 text-left focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                      isSelected ? 'paper-chip-active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="property-tax-reduction"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setReductionMode(option.value)}
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

            {reductionApplied && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <label
                    htmlFor="property-tax-reduction-rate"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    軽減割合 <span className="text-xs font-normal">%</span>
                  </label>
                  <input
                    id="property-tax-reduction-rate"
                    name="reductionRate"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="0.1"
                    value={reductionRate}
                    onChange={(event) => setReductionRate(event.target.value)}
                    aria-invalid={reductionRateField.error !== null}
                    aria-describedby={
                      reductionRateField.error
                        ? 'property-tax-reduction-rate-error'
                        : 'property-tax-reduction-rate-help'
                    }
                    className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
                  />
                  {reductionRateField.error ? (
                    <p
                      id="property-tax-reduction-rate-error"
                      role="alert"
                      className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                    >
                      {reductionRateField.error}
                    </p>
                  ) : (
                    <p
                      id="property-tax-reduction-rate-help"
                      className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                    >
                      標準的な軽減は50%です。
                    </p>
                  )}
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="property-tax-reduction-target"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    軽減対象の割合{' '}
                    <span className="text-xs font-normal">%</span>
                  </label>
                  <input
                    id="property-tax-reduction-target"
                    name="reductionTarget"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="0.1"
                    value={reductionTarget}
                    onChange={(event) => setReductionTarget(event.target.value)}
                    aria-invalid={reductionTargetField.error !== null}
                    aria-describedby={
                      reductionTargetField.error
                        ? 'property-tax-reduction-target-error'
                        : 'property-tax-reduction-target-help'
                    }
                    className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
                  />
                  {reductionTargetField.error ? (
                    <p
                      id="property-tax-reduction-target-error"
                      role="alert"
                      className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                    >
                      {reductionTargetField.error}
                    </p>
                  ) : (
                    <p
                      id="property-tax-reduction-target-help"
                      className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                    >
                      建物評価額のうち軽減対象とする割合です。120㎡上限の再現に使えます。
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              新築住宅軽減は建物の固定資産税だけが対象で、都市計画税は軽減されません。このツールでは軽減割合と対象割合を編集できる簡易計算としています。実際は床面積120㎡相当分まで、戸建て3年・耐火マンション5年などの条件があります。
            </p>
          </fieldset>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label
                htmlFor="property-tax-fixed-rate"
                className="text-sm font-bold text-[var(--ink)]"
              >
                固定資産税率 <span className="text-xs font-normal">%</span>
              </label>
              <input
                id="property-tax-fixed-rate"
                name="fixedRate"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={fixedRate}
                onChange={(event) => setFixedRate(event.target.value)}
                aria-invalid={fixedRateField.error !== null}
                aria-describedby={
                  fixedRateField.error
                    ? 'property-tax-fixed-rate-error'
                    : 'property-tax-fixed-rate-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {fixedRateField.error ? (
                <p
                  id="property-tax-fixed-rate-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {fixedRateField.error}
                </p>
              ) : (
                <p
                  id="property-tax-fixed-rate-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  標準税率は1.4%です。自治体により異なる場合があります。
                </p>
              )}
            </div>

            <div className="min-w-0">
              <label
                htmlFor="property-tax-city-rate"
                className="text-sm font-bold text-[var(--ink)]"
              >
                都市計画税率 <span className="text-xs font-normal">%</span>
              </label>
              <input
                id="property-tax-city-rate"
                name="cityRate"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={cityRate}
                onChange={(event) => setCityRate(event.target.value)}
                aria-invalid={cityRateField.error !== null}
                aria-describedby={
                  cityRateField.error
                    ? 'property-tax-city-rate-error'
                    : 'property-tax-city-rate-help'
                }
                className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              {cityRateField.error ? (
                <p
                  id="property-tax-city-rate-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {cityRateField.error}
                </p>
              ) : (
                <p
                  id="property-tax-city-rate-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  標準税率は0.3%です。課されない地域では0%にしてください。
                </p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="property-tax-adjustment"
                className="text-sm font-bold text-[var(--ink)]"
              >
                その他調整（年額）
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                {unit === 'man' ? '万円' : '円'}
              </span>
            </div>
            <input
              id="property-tax-adjustment"
              name="adjustment"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={adjustment}
              onChange={(event) => setAdjustment(event.target.value)}
              placeholder={unit === 'man' ? '例: 0' : '例: 0'}
              aria-invalid={adjustmentDisplayError !== null}
              aria-describedby={
                adjustmentDisplayError
                  ? 'property-tax-adjustment-error'
                  : 'property-tax-adjustment-help'
              }
              className="field-paper mt-2 min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {adjustmentDisplayError ? (
              <p
                id="property-tax-adjustment-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {adjustmentDisplayError}
              </p>
            ) : (
              <p
                id="property-tax-adjustment-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                自治体独自の加算・減免・端数処理などをまとめて反映する任意の調整額です。プラスは加算、マイナスは減算です。
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
          aria-labelledby="property-tax-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="property-tax-result-heading"
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
                {landOption.label} / 固定資産税率 {fixedRateField.value}% /
                都市計画税率 {cityRateField.value}%
                {reductionApplied
                  ? ` / 新築住宅軽減 ${reductionRateField.value}%（対象 ${reductionTargetField.value}%）`
                  : ''}
              </p>

              <div className="mt-3 space-y-3">
                <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    年間合計（概算）
                  </p>
                  <p className="font-editorial mt-1 break-words text-3xl leading-tight tabular-nums">
                    {formatYen(result.annualTotal)}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    月換算目安 {formatYen(result.monthly)} / 月
                  </p>
                  {result.adjustment !== 0 && (
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      その他調整 {formatSignedYen(result.adjustment)} を含みます。
                    </p>
                  )}
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      固定資産税（年額）
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.fixedTotal)}
                    </p>
                  </div>

                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      都市計画税（年額）
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {formatYen(result.cityTotal)}
                    </p>
                  </div>
                </div>

                {reductionApplied && (
                  <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                      新築住宅軽減（年額）
                    </p>
                    <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                      {result.buildingReduction === 0
                        ? '0円'
                        : `-${formatYen(result.buildingReduction)}`}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                      建物の固定資産税にのみ反映しています。都市計画税は軽減対象外です。
                    </p>
                  </div>
                )}
              </div>

              {result.isZero && (
                <p className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-[11px] leading-5 text-[var(--ink)]">
                  年間合計は0円です。評価額や税率が0の場合、税額が100円未満で切り捨てられた場合、その他調整で相殺された場合などに0円になります。
                </p>
              )}
            </>
          ) : (
            <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="text-sm font-bold text-[var(--ink)]">
                入力内容を確認してください
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                {adjustmentTotalError ??
                  '評価額・税率・特例の入力がそろうと、ここに試算結果が表示されます。'}
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
              自治体・評価額・特例で異なる概算です。実際の税額は、固定資産税評価額や課税標準額、住宅用地の特例、新築住宅軽減、自治体独自の税率・減免・端数処理などで変わります。納税額の確定には、自治体の納税通知書や公式情報をご確認ください。
            </p>
          </div>
        </section>
      </section>

      {result && (
        <section
          aria-labelledby="property-tax-breakdown-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Breakdown</p>
              <h2
                id="property-tax-breakdown-heading"
                className="font-editorial mt-1 text-xl"
              >
                土地・建物の内訳
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              Yearly
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            固定資産税と都市計画税を土地・建物に分けて表示します。税額は100円未満を切り捨てています。
          </p>

          <div
            role="region"
            aria-label="土地・建物の税額内訳。横にスクロールできます。"
            tabIndex={0}
            className="mt-3 overflow-x-auto border border-[var(--line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <table className="w-full min-w-[34rem] border-collapse text-right text-xs tabular-nums">
              <caption className="sr-only">
                土地・建物ごとの固定資産税と都市計画税の内訳
              </caption>
              <thead className="bg-[var(--paper-muted)]">
                <tr>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 text-left font-bold text-[var(--ink)]"
                  >
                    区分
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    固定資産税
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    都市計画税
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--line-strong)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    小計
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--line)]">
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-bold text-[var(--ink)]"
                  >
                    土地
                  </th>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatYen(result.landFixed)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatYen(result.landCity)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatYen(result.landFixed + result.landCity)}
                  </td>
                </tr>
                <tr className="border-b border-[var(--line)]">
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-bold text-[var(--ink)]"
                  >
                    建物
                  </th>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatYen(result.buildingFixed)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatYen(result.buildingCity)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatYen(result.buildingFixed + result.buildingCity)}
                  </td>
                </tr>
                <tr className="bg-[var(--paper-muted)]">
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-bold text-[var(--ink)]"
                  >
                    合計（調整前）
                  </th>
                  <td className="whitespace-nowrap px-3 py-2 font-bold">
                    {formatYen(result.fixedTotal)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-bold">
                    {formatYen(result.cityTotal)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-bold">
                    {formatYen(result.preAdjustmentTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="border border-[var(--line)] bg-[var(--paper)] p-3">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                その他調整（年額）
              </p>
              <p className="mt-1 break-words text-sm font-bold tabular-nums">
                {result.adjustment === 0
                  ? 'なし'
                  : formatSignedYen(result.adjustment)}
              </p>
            </div>
            <div className="border border-[var(--line)] bg-[var(--paper)] p-3">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                調整後の年間合計
              </p>
              <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                {formatYen(result.annualTotal)}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
              土地は「{landOption.label}」として、固定資産税は評価額×
              {landOption.fixedLabel}、都市計画税は評価額×
              {landOption.cityLabel}で計算しています。
            </p>
            {reductionApplied && (
              <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
                建物の固定資産税は、軽減前{' '}
                {formatYen(result.buildingFixedBeforeReduction)} から{' '}
                {formatYen(result.buildingReduction)} を差し引いた額です。
              </p>
            )}
            <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
              固定資産税・都市計画税は、課税標準の目安を1,000円未満、税額を100円未満で切り捨てた概算です。月換算は円未満を四捨五入しています。実際の課税標準額や端数処理は自治体により異なります。
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
