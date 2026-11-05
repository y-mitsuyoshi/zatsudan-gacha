'use client';

import { useState } from 'react';

type AreaUnit = 'tsubo' | 'm2' | 'jo';
type PriceMode = 'total' | 'perTsubo';
type PriceUnit = 'man' | 'yen';

type ParsedNumber = {
  value: number | null;
  empty: boolean;
  error: string | null;
};

type ResultCardProps = {
  label: string;
  value: string;
  unit: string;
  sub?: string;
  note: string;
};

const TSUBO_IN_M2 = 400 / 121;
const DEFAULT_JO_M2 = 1.62;
const MAN_YEN = 10_000;
const MAX_AREA_M2 = 1_000_000_000_000;
const MAX_PRICE_YEN = 1_000_000_000_000_000;
const MIN_JO_M2 = 0.1;
const MAX_JO_M2 = 10;

const GROUPED_DECIMAL_PATTERN =
  /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

const AREA_UNITS: { value: AreaUnit; label: string }[] = [
  { value: 'tsubo', label: '坪' },
  { value: 'm2', label: '㎡' },
  { value: 'jo', label: '畳' },
];

const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  tsubo: '坪',
  m2: '㎡',
  jo: '畳',
};

const PRICE_MODES: { value: PriceMode; label: string }[] = [
  { value: 'total', label: '総額から計算' },
  { value: 'perTsubo', label: '坪単価から計算' },
];

const PRICE_UNITS: { value: PriceUnit; label: string }[] = [
  { value: 'man', label: '万円' },
  { value: 'yen', label: '円' },
];

const JO_PRESETS = [
  { label: '標準 1.62', size: 1.62 },
  { label: '京間 1.824', size: 1.824 },
  { label: '中京間 1.6562', size: 1.6562 },
  { label: '江戸間 1.5488', size: 1.5488 },
  { label: '団地間 1.445', size: 1.445 },
];

function parseNumber(raw: string): ParsedNumber {
  const normalized = raw.normalize('NFKC').trim();

  if (normalized === '') {
    return { value: null, empty: true, error: null };
  }

  if (!GROUPED_DECIMAL_PATTERN.test(normalized)) {
    return {
      value: null,
      empty: false,
      error: '半角の数字・小数・カンマで入力してください。',
    };
  }

  const parsed = Number(normalized.replace(/,/g, ''));

  if (!Number.isFinite(parsed)) {
    return {
      value: null,
      empty: false,
      error: '数値が大きすぎるか、計算できない値です。',
    };
  }

  return { value: parsed, empty: false, error: null };
}

function toSquareMeters(value: number, unit: AreaUnit, joSize: number): number {
  if (unit === 'tsubo') {
    return value * TSUBO_IN_M2;
  }
  if (unit === 'jo') {
    return value * joSize;
  }
  return value;
}

function fromSquareMeters(value: number, unit: AreaUnit, joSize: number): number {
  if (unit === 'tsubo') {
    return value / TSUBO_IN_M2;
  }
  if (unit === 'jo') {
    return value / joSize;
  }
  return value;
}

function formatDecimal(value: number, maximumFractionDigits: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  const absolute = Math.abs(value);
  if (absolute !== 0 && (absolute >= 1e12 || absolute < 1e-6)) {
    return value.toExponential(4).replace(/\.?0+e/, 'e');
  }

  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits,
  }).format(value);
}

function formatArea(value: number, preferredFractionDigits: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  const absolute = Math.abs(value);
  if (absolute >= 1000) {
    return formatDecimal(value, Math.min(2, preferredFractionDigits));
  }
  if (absolute > 0 && absolute < 0.001) {
    return formatDecimal(value, Math.max(preferredFractionDigits, 8));
  }
  return formatDecimal(value, preferredFractionDigits);
}

function formatYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  const rounded = Math.round(value);
  if (Math.abs(rounded) >= 1e15) {
    return `${formatDecimal(rounded, 0)}円`;
  }

  return `${new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: 0,
  }).format(rounded)}円`;
}

function formatCompactYen(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  const absolute = Math.abs(value);
  if (absolute >= 1e12) {
    return `${formatDecimal(value / 1e12, 2)}兆円`;
  }
  if (absolute >= 1e8) {
    return `${formatDecimal(value / 1e8, 2)}億円`;
  }
  if (absolute >= 1e4) {
    return `${formatDecimal(value / 1e4, 2)}万円`;
  }
  return formatYen(value);
}

function formatInputValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }

  const absolute = Math.abs(value);
  if (absolute >= 1e15 || absolute < 1e-6) {
    return value.toExponential(6).replace(/\.?0+e/, 'e');
  }

  if (absolute >= 1e12) {
    return String(Number(value.toPrecision(12)));
  }

  return String(Number(value.toFixed(6)));
}

function ResultCard({ label, value, unit, sub, note }: ResultCardProps) {
  return (
    <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
      <p className="font-label text-[9px] text-[var(--ink-soft)]">{label}</p>
      <p className="font-editorial mt-1 break-words text-2xl leading-tight tabular-nums [overflow-wrap:anywhere]">
        {value}
        {unit !== '' && (
          <span className="ml-1 font-sans text-xs font-bold tracking-normal text-[var(--ink-soft)]">
            {unit}
          </span>
        )}
      </p>
      {sub !== undefined && sub !== '' && (
        <p className="mt-1 break-words text-[11px] leading-5 text-[var(--ink-soft)] [overflow-wrap:anywhere]">
          {sub}
        </p>
      )}
      <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">{note}</p>
    </div>
  );
}

export function TsuboConverter() {
  const [areaValue, setAreaValue] = useState('100');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('m2');
  const [joSizeValue, setJoSizeValue] = useState(String(DEFAULT_JO_M2));
  const [priceValue, setPriceValue] = useState('');
  const [priceMode, setPriceMode] = useState<PriceMode>('total');
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('man');

  const areaParsed = parseNumber(areaValue);
  const joParsed = parseNumber(joSizeValue);
  const priceParsed = parseNumber(priceValue);

  let joSize: number | null = null;
  let joError: string | null = null;

  if (joParsed.empty) {
    joError = '1畳の広さを入力してください。';
  } else if (joParsed.error !== null) {
    joError = joParsed.error;
  } else if (
    joParsed.value === null ||
    joParsed.value < MIN_JO_M2 ||
    joParsed.value > MAX_JO_M2
  ) {
    joError = `1畳の広さは${MIN_JO_M2}〜${MAX_JO_M2}㎡の範囲で入力してください。`;
  } else {
    joSize = joParsed.value;
  }

  let areaError: string | null = null;
  let areaM2: number | null = null;

  if (!areaParsed.empty) {
    if (areaParsed.error !== null) {
      areaError = areaParsed.error;
    } else if (areaParsed.value === null || areaParsed.value <= 0) {
      areaError = '面積は0より大きい値を入力してください。';
    } else if (joSize !== null) {
      const squareMeters = toSquareMeters(areaParsed.value, areaUnit, joSize);

      if (!Number.isFinite(squareMeters)) {
        areaError = '面積が大きすぎて計算できません。';
      } else if (squareMeters > MAX_AREA_M2) {
        areaError = '面積は1兆㎡以下で入力してください。';
      } else {
        areaM2 = squareMeters;
      }
    }
  }

  const tsubo = areaM2 === null ? null : areaM2 / TSUBO_IN_M2;
  const joCount =
    areaM2 === null || joSize === null ? null : areaM2 / joSize;

  let priceError: string | null = null;
  let totalPriceYen: number | null = null;
  let tsuboUnitPriceYen: number | null = null;
  let m2UnitPriceYen: number | null = null;

  if (!priceParsed.empty) {
    if (priceParsed.error !== null) {
      priceError = priceParsed.error;
    } else if (priceParsed.value === null || priceParsed.value <= 0) {
      priceError = '価格は0より大きい値を入力してください。';
    } else {
      const inputYen =
        priceUnit === 'man' ? priceParsed.value * MAN_YEN : priceParsed.value;

      if (!Number.isFinite(inputYen)) {
        priceError = '価格が大きすぎて計算できません。';
      } else if (inputYen > MAX_PRICE_YEN) {
        priceError = '価格は1,000兆円以下で入力してください。';
      } else if (areaM2 !== null && tsubo !== null && tsubo > 0) {
        const calculatedTotal =
          priceMode === 'total' ? inputYen : inputYen * tsubo;

        if (!Number.isFinite(calculatedTotal)) {
          priceError = '総額が大きすぎて計算できません。';
        } else if (calculatedTotal > MAX_PRICE_YEN) {
          priceError =
            '総額が大きすぎます。価格または坪単価を下げてください。';
        } else {
          totalPriceYen = calculatedTotal;

          const calculatedTsuboUnitPrice = calculatedTotal / tsubo;
          const calculatedM2UnitPrice = calculatedTotal / areaM2;

          tsuboUnitPriceYen = Number.isFinite(calculatedTsuboUnitPrice)
            ? calculatedTsuboUnitPrice
            : null;
          m2UnitPriceYen = Number.isFinite(calculatedM2UnitPrice)
            ? calculatedM2UnitPrice
            : null;
        }
      }
    }
  }

  const areaResults =
    areaM2 !== null && tsubo !== null && joCount !== null && joSize !== null
      ? [
          {
            label: '坪',
            value: formatArea(tsubo, 6),
            unit: '坪',
            note: '1坪 = 3.305785㎡',
          },
          {
            label: '㎡',
            value: formatArea(areaM2, 6),
            unit: '㎡',
            note: '不動産登記の基本単位',
          },
          {
            label: '畳',
            value: formatArea(joCount, 4),
            unit: '畳',
            note: `1畳 = ${formatArea(joSize, 6)}㎡で計算`,
          },
        ]
      : null;

  const priceResults =
    totalPriceYen !== null
      ? [
          {
            label: '坪単価',
            value:
              tsuboUnitPriceYen === null
                ? '—'
                : formatCompactYen(tsuboUnitPriceYen),
            unit: '/坪',
            sub:
              tsuboUnitPriceYen === null
                ? undefined
                : `${formatYen(tsuboUnitPriceYen)}/坪`,
            note: '総額 ÷ 坪数',
          },
          {
            label: '㎡単価',
            value:
              m2UnitPriceYen === null
                ? '—'
                : formatCompactYen(m2UnitPriceYen),
            unit: '/㎡',
            sub:
              m2UnitPriceYen === null
                ? undefined
                : `${formatYen(m2UnitPriceYen)}/㎡`,
            note: '総額 ÷ ㎡数',
          },
          {
            label: '総額',
            value: formatCompactYen(totalPriceYen),
            unit: '',
            sub: formatYen(totalPriceYen),
            note: '坪単価 × 坪数',
          },
        ]
      : null;

  const areaInputText =
    areaParsed.value === null
      ? ''
      : `${formatArea(areaParsed.value, 6)}${AREA_UNIT_LABELS[areaUnit]}`;

  let statusMessage: string;

  if (areaResults !== null && tsubo !== null && joCount !== null) {
    const areaSummary = `${formatArea(areaM2 ?? 0, 6)}㎡、${formatArea(
      tsubo,
      6,
    )}坪、${formatArea(joCount, 4)}畳`;

    if (priceResults !== null) {
      statusMessage = `換算結果は${areaSummary}です。坪単価は${
        tsuboUnitPriceYen === null ? '—' : formatCompactYen(tsuboUnitPriceYen)
      }、㎡単価は${
        m2UnitPriceYen === null ? '—' : formatCompactYen(m2UnitPriceYen)
      }、総額は${formatCompactYen(totalPriceYen ?? 0)}です。`;
    } else if (priceError !== null) {
      statusMessage = `面積の換算結果は${areaSummary}です。価格の入力にエラーがあります。${priceError}`;
    } else {
      statusMessage = `換算結果は${areaSummary}です。価格を入力すると坪単価と総額を計算できます。`;
    }
  } else if (areaError !== null) {
    statusMessage = `面積の入力にエラーがあります。${areaError}`;
  } else if (joError !== null) {
    statusMessage = `1畳の広さの入力にエラーがあります。${joError}`;
  } else if (priceError !== null) {
    statusMessage = `価格の入力にエラーがあります。${priceError}`;
  } else {
    statusMessage =
      '面積を入力すると、坪・㎡・畳の換算結果と価格の試算を表示します。';
  }

  const handleAreaUnitChange = (nextUnit: AreaUnit) => {
    if (nextUnit === areaUnit) {
      return;
    }

    const requiresJoSize = areaUnit === 'jo' || nextUnit === 'jo';
    if (
      areaParsed.empty ||
      areaParsed.error !== null ||
      areaParsed.value === null ||
      areaParsed.value <= 0 ||
      (requiresJoSize && joSize === null)
    ) {
      setAreaUnit(nextUnit);
      return;
    }

    const joForConversion = joSize ?? DEFAULT_JO_M2;
    const squareMeters = toSquareMeters(
      areaParsed.value,
      areaUnit,
      joForConversion,
    );
    const converted = fromSquareMeters(
      squareMeters,
      nextUnit,
      joForConversion,
    );
    const formatted = formatInputValue(converted);

    if (formatted !== '') {
      setAreaValue(formatted);
    }
    setAreaUnit(nextUnit);
  };

  const handlePriceUnitChange = (nextUnit: PriceUnit) => {
    if (nextUnit === priceUnit) {
      return;
    }

    if (
      !priceParsed.empty &&
      priceParsed.error === null &&
      priceParsed.value !== null &&
      priceParsed.value > 0
    ) {
      const inputYen =
        priceUnit === 'man' ? priceParsed.value * MAN_YEN : priceParsed.value;

      if (Number.isFinite(inputYen)) {
        const converted =
          nextUnit === 'man' ? inputYen / MAN_YEN : inputYen;
        const formatted = formatInputValue(converted);

        if (formatted !== '') {
          setPriceValue(formatted);
        }
      }
    }

    setPriceUnit(nextUnit);
  };

  const handlePriceModeChange = (nextMode: PriceMode) => {
    if (nextMode === priceMode) {
      return;
    }

    if (
      !priceParsed.empty &&
      priceParsed.error === null &&
      priceParsed.value !== null &&
      priceParsed.value > 0 &&
      tsubo !== null &&
      tsubo > 0
    ) {
      const inputYen =
        priceUnit === 'man' ? priceParsed.value * MAN_YEN : priceParsed.value;

      if (Number.isFinite(inputYen)) {
        let convertedYen: number;

        if (nextMode === 'total') {
          convertedYen = priceMode === 'total' ? inputYen : inputYen * tsubo;
        } else {
          convertedYen = priceMode === 'perTsubo' ? inputYen : inputYen / tsubo;
        }

        const displayValue =
          priceUnit === 'man' ? convertedYen / MAN_YEN : convertedYen;
        const formatted = formatInputValue(displayValue);

        if (formatted !== '') {
          setPriceValue(formatted);
        }
      }
    }

    setPriceMode(nextMode);
  };

  const resetForm = () => {
    setAreaValue('100');
    setAreaUnit('m2');
    setJoSizeValue(String(DEFAULT_JO_M2));
    setPriceValue('');
    setPriceMode('total');
    setPriceUnit('man');
  };

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-2"
        aria-label="坪・㎡・畳の変換と坪単価計算"
      >
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="tsubo-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2 id="tsubo-form-heading" className="font-editorial mt-1 text-xl">
                面積と価格を入力
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
            面積を入力すると坪・㎡・畳を相互換算し、価格から単価を試算します。入力内容は保存・送信されません。
          </p>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="tsubo-area"
                className="text-sm font-bold text-[var(--ink)]"
              >
                面積
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                0より大きい値
              </span>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                id="tsubo-area"
                name="area"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
                placeholder="例: 100"
                aria-invalid={areaError !== null ? true : undefined}
                aria-describedby={
                  areaError !== null ? 'tsubo-area-error' : 'tsubo-area-help'
                }
                className="field-paper min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
              />

              <fieldset className="min-w-0">
                <legend className="sr-only">面積の単位</legend>
                <div className="grid grid-cols-3 gap-1 sm:w-48">
                  {AREA_UNITS.map((option) => {
                    const isSelected = areaUnit === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`paper-chip flex min-w-0 cursor-pointer items-center justify-center rounded-sm px-3 py-3 text-xs font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                          isSelected ? 'paper-chip-active' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="area-unit"
                          value={option.value}
                          checked={isSelected}
                          onChange={() => handleAreaUnitChange(option.value)}
                          className="sr-only"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            {areaError !== null ? (
              <p
                id="tsubo-area-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {areaError}
              </p>
            ) : (
              <p
                id="tsubo-area-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                坪・㎡・畳のいずれかで入力できます。小数やカンマも使えます。
              </p>
            )}
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="tsubo-jo-size"
                className="text-sm font-bold text-[var(--ink)]"
              >
                1畳の広さ
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                0.1–10㎡
              </span>
            </div>

            <div className="mt-2 flex min-w-0 items-center gap-2">
              <input
                id="tsubo-jo-size"
                name="jo-size"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={joSizeValue}
                onChange={(event) => setJoSizeValue(event.target.value)}
                placeholder="例: 1.62"
                aria-invalid={joError !== null ? true : undefined}
                aria-describedby={
                  joError !== null ? 'tsubo-jo-error' : 'tsubo-jo-help'
                }
                className="field-paper min-w-0 max-w-48 rounded-sm px-3 py-3 text-base tabular-nums"
              />
              <span className="text-sm font-bold text-[var(--ink-soft)]">㎡</span>
            </div>

            {joError !== null ? (
              <p
                id="tsubo-jo-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {joError}
              </p>
            ) : (
              <p
                id="tsubo-jo-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                地域や物件によって異なります。初期値は1.62㎡です。
              </p>
            )}

            <p className="mt-3 font-label text-[9px] text-[var(--ink-soft)]">
              地域別の目安
            </p>
            <div
              role="group"
              aria-label="1畳の広さの地域別プリセット"
              className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3"
            >
              {JO_PRESETS.map((preset) => {
                const isActive =
                  joParsed.value !== null &&
                  Math.abs(joParsed.value - preset.size) < 1e-9;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setJoSizeValue(String(preset.size))}
                    className={`paper-chip min-h-11 rounded-sm px-2 py-2 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                      isActive ? 'paper-chip-active' : ''
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]">
              京間・中京間・江戸間・団地間など、地域の慣習で異なります。表示は目安です。
            </p>
          </div>

          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <fieldset className="min-w-0">
              <legend className="text-sm font-bold text-[var(--ink)]">
                価格（任意）
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {PRICE_MODES.map((option) => {
                  const isSelected = priceMode === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`paper-chip flex min-w-0 cursor-pointer items-center justify-center rounded-sm px-2 py-2.5 text-xs font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                        isSelected ? 'paper-chip-active' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="price-mode"
                        value={option.value}
                        checked={isSelected}
                        onChange={() => handlePriceModeChange(option.value)}
                        className="sr-only"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor="tsubo-price"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  {priceMode === 'total' ? '総額' : '坪単価'}
                </label>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  空欄可
                </span>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  id="tsubo-price"
                  name="price"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={priceValue}
                  onChange={(event) => setPriceValue(event.target.value)}
                  placeholder={
                    priceUnit === 'man'
                      ? priceMode === 'total'
                        ? '例: 3000'
                        : '例: 100'
                      : priceMode === 'total'
                        ? '例: 30000000'
                        : '例: 1000000'
                  }
                  aria-invalid={priceError !== null ? true : undefined}
                  aria-describedby={
                    priceError !== null
                      ? 'tsubo-price-error'
                      : 'tsubo-price-help'
                  }
                  className="field-paper min-w-0 rounded-sm px-3 py-3 text-base tabular-nums"
                />

                <fieldset className="min-w-0">
                  <legend className="sr-only">価格の単位</legend>
                  <div className="grid grid-cols-2 gap-1 sm:w-32">
                    {PRICE_UNITS.map((option) => {
                      const isSelected = priceUnit === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`paper-chip flex min-w-0 cursor-pointer items-center justify-center rounded-sm px-3 py-3 text-xs font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                            isSelected ? 'paper-chip-active' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="price-unit"
                            value={option.value}
                            checked={isSelected}
                            onChange={() => handlePriceUnitChange(option.value)}
                            className="sr-only"
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              {priceError !== null ? (
                <p
                  id="tsubo-price-error"
                  role="alert"
                  className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
                >
                  {priceError}
                </p>
              ) : (
                <p
                  id="tsubo-price-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  {priceMode === 'total'
                    ? '総額を入れると坪単価と㎡単価を計算します。空欄のままでも面積換算はできます。'
                    : '坪単価を入れると総額と㎡単価を逆算します。空欄のままでも面積換算はできます。'}
                </p>
              )}
            </div>
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
              価格は任意です。入力内容は保存・送信されません。
            </p>
          </div>
        </form>

        <section
          aria-labelledby="tsubo-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="tsubo-result-heading"
                className="font-editorial mt-1 text-xl"
              >
                換算結果
              </h2>
            </div>
            <span
              aria-hidden="true"
              className="font-label text-[9px] text-[var(--ink-soft)]"
            >
              02 / 02
            </span>
          </div>

          <p
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusMessage}
          </p>

          {areaResults !== null && areaM2 !== null && tsubo !== null && joCount !== null && joSize !== null ? (
            <>
              <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                入力面積: {areaInputText} / 1畳 = {formatArea(joSize, 6)}㎡
              </p>

              <h3 className="mt-4 font-label text-[9px] text-[var(--accent)]">
                面積の換算
              </h3>
              <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-3">
                {areaResults.map((result) => (
                  <ResultCard
                    key={result.label}
                    label={result.label}
                    value={result.value}
                    unit={result.unit}
                    note={result.note}
                  />
                ))}
              </div>

              <div className="mt-5 border-t border-[var(--line)] pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-label text-[9px] text-[var(--accent)]">
                    価格の試算
                  </h3>
                  <span className="text-[11px] leading-5 text-[var(--ink-soft)]">
                    {priceMode === 'total' ? '総額から計算' : '坪単価から計算'}
                  </span>
                </div>

                {priceError !== null ? (
                  <div className="mt-2 border border-[var(--line)] bg-[var(--paper)] p-4">
                    <p className="text-sm font-bold text-[var(--accent)]">
                      価格を確認してください
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                      {priceError}
                    </p>
                  </div>
                ) : priceResults !== null ? (
                  <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-3">
                    {priceResults.map((result) => (
                      <ResultCard
                        key={result.label}
                        label={result.label}
                        value={result.value}
                        unit={result.unit}
                        sub={result.sub}
                        note={result.note}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                    価格を入力すると、坪単価・㎡単価・総額がここに表示されます。
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="text-sm font-bold text-[var(--ink)]">
                換算結果を表示できません
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                {areaError ??
                  joError ??
                  '面積を入力すると、坪・㎡・畳の換算結果がここに表示されます。'}
              </p>
            </div>
          )}

          <div
            role="note"
            className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              不動産取引では数値が異なる場合があります
            </p>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
              坪・畳は登記上の面積と一致しないことがあり、畳の大きさは地域の慣習によって異なります。契約・申告・ローン審査などでは、登記簿・図面・現地調査や不動産会社・専門家の確認を必ず行ってください。このツールの結果は概算です。
            </p>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
            換算は 1坪 = 3.305785㎡、1畳 = 入力した広さ（初期値1.62㎡）で計算しています。金額は円未満を四捨五入し、表示は読みやすさを優先して丸めています。
          </p>
        </section>
      </section>
    </div>
  );
}
