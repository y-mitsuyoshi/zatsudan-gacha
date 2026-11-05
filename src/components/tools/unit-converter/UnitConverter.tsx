"use client";

import { useEffect, useRef, useState } from 'react';

type UnitDefinition = {
  id: string;
  label: string;
  symbol: string;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
};

type CategoryDefinition = {
  id: string;
  label: string;
  description: string;
  defaultFrom: string;
  defaultTo: string;
  units: UnitDefinition[];
  isTemperature?: boolean;
  note?: string;
};

function linearUnit(id: string, label: string, symbol: string, factor: number): UnitDefinition {
  return {
    id,
    label,
    symbol,
    toBase: (value) => value * factor,
    fromBase: (value) => value / factor,
  };
}

const TEMPERATURE_UNITS: UnitDefinition[] = [
  {
    id: 'celsius',
    label: '摂氏',
    symbol: '°C',
    toBase: (value) => value,
    fromBase: (value) => value,
  },
  {
    id: 'fahrenheit',
    label: '華氏',
    symbol: '°F',
    toBase: (value) => ((value - 32) * 5) / 9,
    fromBase: (value) => (value * 9) / 5 + 32,
  },
  {
    id: 'kelvin',
    label: 'ケルビン',
    symbol: 'K',
    toBase: (value) => value - 273.15,
    fromBase: (value) => value + 273.15,
  },
  {
    id: 'rankine',
    label: 'ランキン',
    symbol: '°R',
    toBase: (value) => ((value - 491.67) * 5) / 9,
    fromBase: (value) => ((value + 273.15) * 9) / 5,
  },
  {
    id: 'reaumur',
    label: 'レオミュール',
    symbol: '°Ré',
    toBase: (value) => (value * 5) / 4,
    fromBase: (value) => (value * 4) / 5,
  },
];

const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'length',
    label: '長さ',
    description: 'ミリメートルからマイルまで、日常的な長さの単位を換算します。',
    defaultFrom: 'm',
    defaultTo: 'cm',
    units: [
      linearUnit('mm', 'ミリメートル', 'mm', 0.001),
      linearUnit('cm', 'センチメートル', 'cm', 0.01),
      linearUnit('m', 'メートル', 'm', 1),
      linearUnit('km', 'キロメートル', 'km', 1000),
      linearUnit('in', 'インチ', 'in', 0.0254),
      linearUnit('ft', 'フィート', 'ft', 0.3048),
      linearUnit('mi', 'マイル', 'mi', 1609.344),
    ],
  },
  {
    id: 'weight',
    label: '重さ',
    description: 'ミリグラムからトン、オンス、ポンドまで幅広く対応します。',
    defaultFrom: 'kg',
    defaultTo: 'g',
    units: [
      linearUnit('mg', 'ミリグラム', 'mg', 0.000001),
      linearUnit('g', 'グラム', 'g', 0.001),
      linearUnit('kg', 'キログラム', 'kg', 1),
      linearUnit('t', 'トン', 't', 1000),
      linearUnit('oz', 'オンス', 'oz', 0.028349523125),
      linearUnit('lb', 'ポンド', 'lb', 0.45359237),
    ],
  },
  {
    id: 'temperature',
    label: '温度',
    description: '摂氏・華氏・ケルビンに加え、ランキンとレオミュールも換算できます。',
    defaultFrom: 'celsius',
    defaultTo: 'fahrenheit',
    units: TEMPERATURE_UNITS,
    isTemperature: true,
    note: '絶対零度（摂氏 -273.15度、華氏 -459.67度、ケルビン0）を下回る値は、物理的に存在しない値として注意を表示します。',
  },
  {
    id: 'area',
    label: '面積',
    description: '平方メートルや坪、ヘクタール、エーカーなどの面積を換算します。',
    defaultFrom: 'm2',
    defaultTo: 'tsubo',
    units: [
      linearUnit('mm2', '平方ミリメートル', 'mm²', 0.000001),
      linearUnit('cm2', '平方センチメートル', 'cm²', 0.0001),
      linearUnit('m2', '平方メートル', 'm²', 1),
      linearUnit('km2', '平方キロメートル', 'km²', 1000000),
      linearUnit('ha', 'ヘクタール', 'ha', 10000),
      linearUnit('tsubo', '坪', '坪', 400 / 121),
      linearUnit('ft2', '平方フィート', 'ft²', 0.09290304),
      linearUnit('acre', 'エーカー', 'ac', 4046.8564224),
    ],
  },
  {
    id: 'volume',
    label: '体積',
    description: 'ミリリットルやリットル、立方メートル、料理用の計量単位を換算します。',
    defaultFrom: 'l',
    defaultTo: 'ml',
    units: [
      linearUnit('ml', 'ミリリットル', 'mL', 0.001),
      linearUnit('l', 'リットル', 'L', 1),
      linearUnit('m3', '立方メートル', 'm³', 1000),
      linearUnit('tsp', '小さじ（米）', 'tsp', 0.00492892159375),
      linearUnit('tbsp', '大さじ（米）', 'tbsp', 0.01478676478125),
      linearUnit('cup', 'カップ（米）', 'cup', 0.2365882365),
      linearUnit('gal', 'ガロン（米）', 'gal', 3.785411784),
      linearUnit('go', '合（日本）', '合', 2401 / 13310),
    ],
  },
  {
    id: 'speed',
    label: '速度',
    description: 'メートル毎秒、キロメートル毎時、マイル毎時、ノットなどを換算します。',
    defaultFrom: 'kmh',
    defaultTo: 'ms',
    units: [
      linearUnit('ms', 'メートル毎秒', 'm/s', 1),
      linearUnit('kmh', 'キロメートル毎時', 'km/h', 1000 / 3600),
      linearUnit('mph', 'マイル毎時', 'mph', 0.44704),
      linearUnit('knot', 'ノット', 'kn', 1852 / 3600),
      linearUnit('fts', 'フィート毎秒', 'ft/s', 0.3048),
    ],
  },
  {
    id: 'data',
    label: 'データ容量',
    description: 'バイト、キロバイト、ギガバイトなどの容量を10進表記と2進表記の両方で換算します。',
    defaultFrom: 'gb',
    defaultTo: 'mb',
    units: [
      linearUnit('b', 'バイト', 'B', 1),
      linearUnit('kb', 'キロバイト', 'KB', 1000),
      linearUnit('mb', 'メガバイト', 'MB', 1000000),
      linearUnit('gb', 'ギガバイト', 'GB', 1000000000),
      linearUnit('tb', 'テラバイト', 'TB', 1000000000000),
      linearUnit('kib', 'キビバイト', 'KiB', 1024),
      linearUnit('mib', 'メビバイト', 'MiB', 1048576),
      linearUnit('gib', 'ギビバイト', 'GiB', 1073741824),
      linearUnit('tib', 'テビバイト', 'TiB', 1099511627776),
    ],
    note: 'データ容量は 1 KB = 1,000 B の10進表記と、1 KiB = 1,024 B の2進表記を区別して計算します。',
  },
];

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';

  const absolute = Math.abs(value);
  if (absolute >= 1e12 || absolute < 1e-6) {
    return value
      .toExponential(6)
      .replace(/\.?0+e/, 'e');
  }

  let maximumFractionDigits: number;
  if (absolute >= 1000) {
    maximumFractionDigits = 3;
  } else if (absolute >= 1) {
    maximumFractionDigits = 6;
  } else if (absolute >= 0.001) {
    maximumFractionDigits = 8;
  } else {
    maximumFractionDigits = 10;
  }

  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits,
    useGrouping: true,
  }).format(value);
}

async function writeToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand('copy')) {
      throw new Error('copy failed');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

export function UnitConverter() {
  const [categoryId, setCategoryId] = useState('length');
  const [fromUnitId, setFromUnitId] = useState('m');
  const [toUnitId, setToUnitId] = useState('cm');
  const [inputValue, setInputValue] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const activeCategory = CATEGORIES.find((category) => category.id === categoryId) ?? CATEGORIES[0];
  const fromUnit = activeCategory.units.find((unit) => unit.id === fromUnitId) ?? activeCategory.units[0];
  const toUnit = activeCategory.units.find((unit) => unit.id === toUnitId) ?? activeCategory.units[0];

  const trimmedInput = inputValue.trim();
  const parsedValue = trimmedInput === '' ? null : Number(trimmedInput);
  const numericValue = parsedValue !== null && Number.isFinite(parsedValue) ? parsedValue : null;
  const convertedValue = numericValue === null ? null : toUnit.fromBase(fromUnit.toBase(numericValue));
  const resultValue = convertedValue !== null && Number.isFinite(convertedValue) ? convertedValue : null;
  const resultText = resultValue === null ? '' : formatValue(resultValue);
  const copyText = resultText === '' ? '' : `${resultText} ${toUnit.symbol}`;
  const inputError = trimmedInput !== '' && numericValue === null;
  const inputDescribedBy = inputError ? 'unit-value-hint unit-value-error' : 'unit-value-hint';

  const kelvinValue = activeCategory.isTemperature && numericValue !== null
    ? fromUnit.toBase(numericValue) + 273.15
    : null;
  const isBelowAbsoluteZero = kelvinValue !== null && kelvinValue < -1e-9;

  const showCopyStatus = (message: string) => {
    setCopyStatus(message);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopyStatus('');
      copyTimerRef.current = null;
    }, 2400);
  };

  const handleCategoryChange = (category: CategoryDefinition) => {
    if (category.id === categoryId) return;
    setCategoryId(category.id);
    setFromUnitId(category.defaultFrom);
    setToUnitId(category.defaultTo);
    setCopyStatus('');
  };

  const handleFromChange = (unitId: string) => {
    setFromUnitId(unitId);
    setCopyStatus('');
  };

  const handleToChange = (unitId: string) => {
    setToUnitId(unitId);
    setCopyStatus('');
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setCopyStatus('');
  };

  const handleSwap = () => {
    const previousFrom = fromUnitId;
    setFromUnitId(toUnitId);
    setToUnitId(previousFrom);
    setCopyStatus('');
  };

  const handleClear = () => {
    setInputValue('');
    setCopyStatus('');
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  };

  const handleCopy = async () => {
    if (copyText === '') return;

    try {
      await writeToClipboard(copyText);
      showCopyStatus('結果をコピーしました。');
    } catch {
      showCopyStatus('コピーできませんでした。結果を選択してコピーしてください。');
    }
  };

  let resultContent: React.ReactNode;
  if (trimmedInput === '') {
    resultContent = (
      <p className="text-sm leading-6 text-[var(--ink-soft)]">
        数値を入力すると、換算結果がここに表示されます。
      </p>
    );
  } else if (numericValue === null) {
    resultContent = (
      <p id="unit-value-error" className="text-sm leading-6 text-[var(--accent)]">
        数値を確認してください。半角の数字・小数・負の数が入力できます。
      </p>
    );
  } else if (resultValue === null) {
    resultContent = (
      <p className="text-sm leading-6 text-[var(--accent)]">
        計算結果が表せる範囲を超えました。入力値を小さくしてお試しください。
      </p>
    );
  } else {
    resultContent = (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <output
          role="none"
          className="font-editorial min-w-0 break-words text-3xl leading-tight [overflow-wrap:anywhere] sm:text-4xl"
        >
          {resultText}
        </output>
        <span className="font-mono text-[11px] tracking-[0.16em] text-[var(--accent)]">{toUnit.symbol}</span>
      </div>
    );
  }

  return (
    <section aria-labelledby="unit-converter-heading" className="paper-panel p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <p className="font-label text-[9px] text-[var(--accent)]">Converter</p>
          <h2 id="unit-converter-heading" className="font-editorial mt-1 text-2xl">
            単位を換算する
          </h2>
        </div>
        <p className="max-w-xs text-[11px] leading-5 text-[var(--ink-soft)]">
          入力した数値はブラウザ内だけで処理されます。
        </p>
      </div>

      <div className="mt-5">
        <p id="unit-category-label" className="font-label text-[10px] text-[var(--ink-soft)]">
          カテゴリ
        </p>
        <div
          role="group"
          aria-labelledby="unit-category-label"
          className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={category.id === categoryId}
              onClick={() => handleCategoryChange(category)}
              className="paper-chip min-h-11 px-3 py-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              {category.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
          {activeCategory.description}
        </p>
      </div>

      <div className="mt-6">
        <label htmlFor="unit-value" className="font-label text-[10px] text-[var(--ink-soft)]">
          数値
        </label>
        <input
          id="unit-value"
          type="number"
          inputMode="decimal"
          step="any"
          autoComplete="off"
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder="例: 100"
          aria-describedby={inputDescribedBy}
          aria-invalid={inputError ? true : undefined}
          className="field-paper mt-2 h-12 px-3 text-base font-bold"
        />
        <p id="unit-value-hint" className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]">
          小数や負の数も入力できます。空欄のあいだは結果を表示しません。
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
        <div className="min-w-0">
          <label htmlFor="unit-from" className="font-label text-[10px] text-[var(--ink-soft)]">
            変換元
          </label>
          <select
            id="unit-from"
            value={fromUnit.id}
            onChange={(event) => handleFromChange(event.target.value)}
            className="field-paper mt-2 h-12 min-w-0 px-3 pr-10 text-sm font-bold"
          >
            {activeCategory.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label} ({unit.symbol})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleSwap}
          className="paper-button min-h-11 w-full px-4 py-2.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-auto"
        >
          入れ替え
        </button>

        <div className="min-w-0">
          <label htmlFor="unit-to" className="font-label text-[10px] text-[var(--ink-soft)]">
            変換先
          </label>
          <select
            id="unit-to"
            value={toUnit.id}
            onChange={(event) => handleToChange(event.target.value)}
            className="field-paper mt-2 h-12 min-w-0 px-3 pr-10 text-sm font-bold"
          >
            {activeCategory.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label} ({unit.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="paper-panel-flat mt-6 bg-[var(--paper-muted)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p id="unit-result-label" className="font-label text-[9px] text-[var(--ink-soft)]">
              変換結果
            </p>
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-labelledby="unit-result-label"
              className="mt-2 min-h-10"
            >
              {resultContent}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              {fromUnit.label} から {toUnit.label} へ
            </p>
          </div>

          <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              disabled={copyText === ''}
              className="paper-button min-h-11 flex-1 px-4 py-2.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:flex-none"
            >
              コピー
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={inputValue === ''}
              className="paper-button min-h-11 flex-1 px-4 py-2.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:flex-none"
            >
              クリア
            </button>
          </div>
        </div>

        {copyStatus !== '' && (
          <p aria-live="polite" className="mt-3 border-t border-[var(--line)] pt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
            {copyStatus}
          </p>
        )}

        {isBelowAbsoluteZero && (
          <p
            aria-live="polite"
            aria-atomic="true"
            className="mt-3 border-t border-[var(--line)] pt-3 text-[11px] leading-5 text-[var(--accent)]"
          >
            絶対零度を下回る温度です。計算式どおりに換算していますが、物理的には存在しない値です。
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-[var(--line)] pt-3">
        {activeCategory.note && (
          <p className="text-[11px] leading-5 text-[var(--ink-soft)]">{activeCategory.note}</p>
        )}
        <p className={`text-[11px] leading-5 text-[var(--ink-soft)] ${activeCategory.note ? 'mt-1' : ''}`}>
          表示は読みやすさを優先して丸めています。厳密な計算が必要な場合は、換算係数と丸め誤差をご確認ください。
        </p>
      </div>
    </section>
  );
}
