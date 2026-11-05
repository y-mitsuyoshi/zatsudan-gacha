'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };
type FieldKey = 'hex' | 'rgb' | 'hsl';
type FieldErrors = Partial<Record<FieldKey, string>>;

type PaletteSwatch = {
  key: string;
  label: string;
  sublabel: string;
  hsl: Hsl;
  hex: string;
};

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const DEFAULT_RGB: Rgb = { r: 178, g: 58, b: 42 };
const DEFAULT_HEX = '#b23a2a';

const FIELD_MESSAGES: Record<FieldKey, string> = {
  hex: 'HEXは3桁または6桁の16進数（アルファ値なし）で入力してください。例: #b23a2a',
  rgb: 'RGBは0〜255の整数を3つ入力してください。例: rgb(178, 58, 42)',
  hsl: 'HSLは色相0〜360、彩度・明度0〜100%で入力してください。例: hsl(7, 62%, 43%)',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseHex(input: string): Rgb | null {
  const match = input.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;

  const value =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((character) => character + character)
          .join('')
      : match[1];

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function parseRgbInput(input: string): Rgb | null {
  let value = input.trim().toLowerCase();

  if (value.startsWith('rgb(') && value.endsWith(')')) {
    value = value.slice(4, -1).trim();
  } else if (value.includes('rgb')) {
    return null;
  }

  const parts = value.includes(',')
    ? value.split(',').map((part) => part.trim())
    : value.split(/\s+/);
  if (parts.length !== 3 || parts.some((part) => part === '')) return null;

  const channels = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : Number.NaN));
  if (channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
    return null;
  }

  return { r: channels[0], g: channels[1], b: channels[2] };
}

function parseHslInput(input: string): Hsl | null {
  let value = input.trim().toLowerCase();

  if (value.startsWith('hsl(') && value.endsWith(')')) {
    value = value.slice(4, -1).trim();
  } else if (value.includes('hsl')) {
    return null;
  }

  const parts = value.includes(',')
    ? value.split(',').map((part) => part.trim())
    : value.split(/\s+/);
  if (parts.length !== 3 || parts.some((part) => part === '')) return null;

  const hueMatch = parts[0].match(/^(-?\d+(?:\.\d+)?)$/);
  const saturationMatch = parts[1].match(/^(\d+(?:\.\d+)?)%$/);
  const lightnessMatch = parts[2].match(/^(\d+(?:\.\d+)?)%$/);
  if (!hueMatch || !saturationMatch || !lightnessMatch) return null;

  const h = Number(hueMatch[1]);
  const s = Number(saturationMatch[1]);
  const l = Number(lightnessMatch[1]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;

  return { h: h % 360, s, l };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === red) {
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }

    hue *= 60;
  }

  return {
    h: Math.round(hue * 10) / 10,
    s: Math.round(saturation * 1000) / 10,
    l: Math.round(lightness * 1000) / 10,
  };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = (((h % 360) + 360) % 360) / 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;

  if (saturation === 0) {
    const value = Math.round(lightness * 255);
    return { r: value, g: value, b: value };
  }

  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  const hueToChannel = (input: number): number => {
    let t = input;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return {
    r: Math.round(hueToChannel(hue + 1 / 3) * 255),
    g: Math.round(hueToChannel(hue) * 255),
    b: Math.round(hueToChannel(hue - 1 / 3) * 255),
  };
}

function formatRgb(rgb: Rgb): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function formatHsl(hsl: Hsl): string {
  const hue = ((Math.round(hsl.h) % 360) + 360) % 360;
  return `hsl(${hue}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const toLinear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function getPalette(base: Hsl): PaletteSwatch[] {
  const candidates: Omit<PaletteSwatch, 'hex'>[] = [
    {
      key: 'complementary',
      label: '補色',
      sublabel: '+180°',
      hsl: { ...base, h: (base.h + 180) % 360 },
    },
    {
      key: 'analogous-left',
      label: '類似色',
      sublabel: '−30°',
      hsl: { ...base, h: (base.h + 330) % 360 },
    },
    {
      key: 'analogous-right',
      label: '類似色',
      sublabel: '+30°',
      hsl: { ...base, h: (base.h + 30) % 360 },
    },
    {
      key: 'triadic',
      label: 'トライアド',
      sublabel: '+120°',
      hsl: { ...base, h: (base.h + 120) % 360 },
    },
    {
      key: 'tint',
      label: '明るいトーン',
      sublabel: '白を混ぜる',
      hsl: { h: base.h, s: base.s, l: base.l + (100 - base.l) * 0.25 },
    },
    {
      key: 'shade',
      label: '暗いトーン',
      sublabel: '黒を混ぜる',
      hsl: { h: base.h, s: base.s, l: base.l * 0.75 },
    },
  ];

  return candidates.map((swatch) => ({
    ...swatch,
    hex: rgbToHex(hslToRgb(swatch.hsl)),
  }));
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    const copiedWithClipboard = await navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => false);
    if (copiedWithClipboard) return true;
  }

  try {
    if (typeof document === 'undefined') return false;

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';

    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    activeElement?.focus();
    return copied;
  } catch {
    return false;
  }
}

type ColorFieldProps = {
  id: string;
  label: string;
  hint: string;
  value: string;
  error?: string;
  copied: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onCopy: () => void;
};

function ColorField({
  id,
  label,
  hint,
  value,
  error,
  copied,
  onChange,
  onBlur,
  onKeyDown,
  onCopy,
}: ColorFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="font-label text-[10px] font-bold text-[var(--ink)]">
        {label}
      </label>
      <div className="mt-1.5 flex items-stretch gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          className={`field-paper h-11 min-w-0 flex-1 px-3 font-mono text-sm ${
            error ? 'border-[var(--accent)]' : ''
          }`}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onCopy}
          aria-label={`${label}の現在の値をコピー`}
          className="paper-button h-11 shrink-0 whitespace-nowrap px-3 text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {copied ? 'コピー済' : 'コピー'}
        </button>
      </div>
      <p id={hintId} className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
        {hint}
      </p>
      {error ? (
        <p id={errorId} className="mt-1 text-[11px] leading-5 text-[var(--accent)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ColorConverter() {
  const baseId = useId();
  const hexId = `${baseId}-hex`;
  const rgbId = `${baseId}-rgb`;
  const hslId = `${baseId}-hsl`;
  const pickerId = `${baseId}-picker`;
  const pickerHintId = `${baseId}-picker-hint`;
  const inputHeadingId = `${baseId}-input-heading`;
  const paletteHeadingId = `${baseId}-palette-heading`;
  const contrastHeadingId = `${baseId}-contrast-heading`;

  const [rgb, setRgb] = useState<Rgb>(DEFAULT_RGB);
  const [hexInput, setHexInput] = useState(DEFAULT_HEX);
  const [rgbInput, setRgbInput] = useState(formatRgb(DEFAULT_RGB));
  const [hslInput, setHslInput] = useState(formatHsl(rgbToHsl(DEFAULT_RGB)));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [announcement, setAnnouncement] = useState('');
  const [copiedKey, setCopiedKey] = useState<FieldKey | null>(null);
  const copyTimer = useRef<number | null>(null);

  const currentHex = rgbToHex(rgb);
  const currentHsl = rgbToHsl(rgb);
  const palette = getPalette(currentHsl);
  const blackContrast = contrastRatio(rgb, BLACK);
  const whiteContrast = contrastRatio(rgb, WHITE);
  const previewTextColor = whiteContrast >= blackContrast ? '#ffffff' : '#000000';

  const contrastSamples = [
    {
      key: 'black',
      label: '黒背景',
      background: '#000000',
      text: '#ffffff',
      divider: 'border-white/25',
      ratio: blackContrast,
    },
    {
      key: 'white',
      label: '白背景',
      background: '#ffffff',
      text: '#000000',
      divider: 'border-black/15',
      ratio: whiteContrast,
    },
  ];

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
    };
  }, []);

  function clearFieldError(key: FieldKey) {
    setErrors((previous) => {
      if (!previous[key]) return previous;
      return { ...previous, [key]: undefined };
    });
  }

  function applyRgb(next: Rgb, preserve?: FieldKey) {
    const normalized: Rgb = {
      r: clamp(Math.round(next.r), 0, 255),
      g: clamp(Math.round(next.g), 0, 255),
      b: clamp(Math.round(next.b), 0, 255),
    };

    setRgb(normalized);
    if (preserve !== 'hex') setHexInput(rgbToHex(normalized));
    if (preserve !== 'rgb') setRgbInput(formatRgb(normalized));
    if (preserve !== 'hsl') setHslInput(formatHsl(rgbToHsl(normalized)));
    setErrors({});
  }

  function handleHexChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setHexInput(value);
    clearFieldError('hex');
    const parsed = parseHex(value);
    if (parsed) applyRgb(parsed, 'hex');
  }

  function handleRgbChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setRgbInput(value);
    clearFieldError('rgb');
    const parsed = parseRgbInput(value);
    if (parsed) applyRgb(parsed, 'rgb');
  }

  function handleHslChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setHslInput(value);
    clearFieldError('hsl');
    const parsed = parseHslInput(value);
    if (parsed) applyRgb(hslToRgb(parsed), 'hsl');
  }

  function handleHexBlur() {
    const parsed = parseHex(hexInput);
    if (parsed) {
      applyRgb(parsed);
      return;
    }

    setHexInput(currentHex);
    setErrors((previous) => ({ ...previous, hex: `${FIELD_MESSAGES.hex} 現在の色に戻しました。` }));
    setAnnouncement('HEXの入力が無効だったため、現在の色に戻しました。');
  }

  function handleRgbBlur() {
    const parsed = parseRgbInput(rgbInput);
    if (parsed) {
      applyRgb(parsed);
      return;
    }

    setRgbInput(formatRgb(rgb));
    setErrors((previous) => ({ ...previous, rgb: `${FIELD_MESSAGES.rgb} 現在の色に戻しました。` }));
    setAnnouncement('RGBの入力が無効だったため、現在の色に戻しました。');
  }

  function handleHslBlur() {
    const parsed = parseHslInput(hslInput);
    if (parsed) {
      const displayedHsl = formatHsl(currentHsl);
      if (hslInput.trim() === displayedHsl) {
        clearFieldError('hsl');
        setHslInput(displayedHsl);
      } else {
        applyRgb(hslToRgb(parsed));
      }
      return;
    }

    setHslInput(formatHsl(currentHsl));
    setErrors((previous) => ({ ...previous, hsl: `${FIELD_MESSAGES.hsl} 現在の色に戻しました。` }));
    setAnnouncement('HSLの入力が無効だったため、現在の色に戻しました。');
  }

  function handleFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  function handlePickerChange(event: ChangeEvent<HTMLInputElement>) {
    const parsed = parseHex(event.target.value);
    if (parsed) applyRgb(parsed);
  }

  function handlePaletteSelect(swatch: PaletteSwatch) {
    applyRgb(hslToRgb(swatch.hsl));
    setAnnouncement(`${swatch.label}（${swatch.hex}）を選択しました。`);
  }

  async function handleCopy(key: FieldKey) {
    const labels: Record<FieldKey, string> = { hex: 'HEX', rgb: 'RGB', hsl: 'HSL' };
    const values: Record<FieldKey, string> = {
      hex: currentHex,
      rgb: formatRgb(rgb),
      hsl: formatHsl(currentHsl),
    };

    const copied = await copyToClipboard(values[key]);
    if (!copied) {
      setCopiedKey(null);
      setAnnouncement('クリップボードにコピーできませんでした。入力欄の値を選択してコピーしてください。');
      return;
    }

    setCopiedKey(key);
    setAnnouncement(`${labels[key]}の値をコピーしました。`);
    if (copyTimer.current !== null) {
      window.clearTimeout(copyTimer.current);
    }
    copyTimer.current = window.setTimeout(() => {
      setCopiedKey(null);
      copyTimer.current = null;
    }, 1800);
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby={inputHeadingId} className="paper-panel p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div>
            <p className="font-label text-[9px] text-[var(--accent)]">Color Input</p>
            <h2 id={inputHeadingId} className="font-editorial mt-1 text-2xl">
              色を入力する
            </h2>
          </div>
          <p className="max-w-xs text-[11px] leading-5 text-[var(--ink-soft)]">
            入力した値はブラウザ内だけで処理されます。
          </p>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div className="min-w-0 space-y-3">
            <div
              role="img"
              aria-label={`現在の色 ${currentHex}、RGB ${formatRgb(rgb)}、HSL ${formatHsl(currentHsl)}`}
              className="flex min-h-44 flex-col justify-between overflow-hidden border border-[var(--line-strong)] p-4"
              style={{ backgroundColor: currentHex, color: previewTextColor }}
            >
              <span className="font-label text-[9px]">Preview</span>
              <p className="font-editorial break-all text-3xl leading-tight">{currentHex}</p>
            </div>

            <div>
              <label htmlFor={pickerId} className="font-label text-[10px] font-bold text-[var(--ink)]">
                カラーピッカー
              </label>
              <input
                id={pickerId}
                type="color"
                value={currentHex}
                onChange={handlePickerChange}
                aria-describedby={pickerHintId}
                className="mt-1.5 h-12 w-full cursor-pointer border border-[var(--line-strong)] bg-[var(--paper-strong)] p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              />
              <p id={pickerHintId} className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
                タップして選んだ色は、HEX・RGB・HSLに同時に反映されます。
              </p>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <ColorField
              id={hexId}
              label="HEX"
              hint="3桁または6桁の16進数。例: #b23a2a"
              value={hexInput}
              error={errors.hex}
              copied={copiedKey === 'hex'}
              onChange={handleHexChange}
              onBlur={handleHexBlur}
              onKeyDown={handleFieldKeyDown}
              onCopy={() => void handleCopy('hex')}
            />
            <ColorField
              id={rgbId}
              label="RGB"
              hint="0〜255の整数を3つ。例: rgb(178, 58, 42)"
              value={rgbInput}
              error={errors.rgb}
              copied={copiedKey === 'rgb'}
              onChange={handleRgbChange}
              onBlur={handleRgbBlur}
              onKeyDown={handleFieldKeyDown}
              onCopy={() => void handleCopy('rgb')}
            />
            <ColorField
              id={hslId}
              label="HSL"
              hint="色相0〜360、彩度・明度0〜100%。例: hsl(7, 62%, 43%)"
              value={hslInput}
              error={errors.hsl}
              copied={copiedKey === 'hsl'}
              onChange={handleHslChange}
              onBlur={handleHslBlur}
              onKeyDown={handleFieldKeyDown}
              onCopy={() => void handleCopy('hsl')}
            />
          </div>
        </div>

        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-4 min-h-[1.25rem] border-t border-[var(--line)] pt-3 text-[11px] leading-5 text-[var(--ink-soft)]"
        >
          {announcement}
        </p>
      </section>

      <section aria-labelledby={paletteHeadingId} className="paper-panel p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div>
            <p className="font-label text-[9px] text-[var(--accent)]">Palette</p>
            <h2 id={paletteHeadingId} className="font-editorial mt-1 text-2xl">
              配色パレット
            </h2>
          </div>
          <p className="font-label text-[9px] text-[var(--ink-soft)]">6 Swatches</p>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          補色・類似色・トライアドと、明るい/暗いトーンを自動計算します。スウォッチを押すと、その色を新しいベースカラーとして編集できます。
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {palette.map((swatch) => (
            <button
              key={swatch.key}
              type="button"
              onClick={() => handlePaletteSelect(swatch)}
              aria-label={`${swatch.label} ${swatch.sublabel} ${swatch.hex} を選択`}
              className="min-w-0 border border-[var(--line)] bg-[var(--paper-strong)] p-1.5 text-left transition-colors hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <span
                aria-hidden="true"
                className="block h-16 w-full border border-[var(--line)]"
                style={{ backgroundColor: swatch.hex }}
              />
              <span className="mt-2 block font-label text-[9px] leading-4 text-[var(--accent)]">
                {swatch.label}
              </span>
              <span className="block text-[10px] leading-4 text-[var(--ink-soft)]">{swatch.sublabel}</span>
              <span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--ink)]">{swatch.hex}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby={contrastHeadingId} className="paper-panel p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div>
            <p className="font-label text-[9px] text-[var(--accent)]">Contrast</p>
            <h2 id={contrastHeadingId} className="font-editorial mt-1 text-2xl">
              コントラスト比
            </h2>
          </div>
          <p className="font-label text-[9px] text-[var(--ink-soft)]">WCAG AA / AAA</p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {contrastSamples.map((sample) => {
            const meetsAa = sample.ratio >= 4.5;
            const meetsAaa = sample.ratio >= 7;

            return (
              <div
                key={sample.key}
                className="border border-[var(--line-strong)] p-4"
                style={{ backgroundColor: sample.background, color: sample.text }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-label text-[9px] font-bold">{sample.label}</p>
                  <p className="font-mono text-xl leading-none">
                    {sample.ratio.toFixed(2)}
                    <span className="text-[10px]">:1</span>
                  </p>
                </div>
                <p
                  aria-hidden="true"
                  className="font-editorial mt-3 text-4xl leading-none"
                  style={{ color: currentHex }}
                >
                  Aa
                </p>
                <ul className={`mt-3 space-y-1 border-t pt-2 text-[10px] leading-5 ${sample.divider}`}>
                  <li>
                    <span className="font-label text-[9px] font-bold">AA</span>
                    <span className="ml-1.5">通常文字 4.5:1以上</span>
                    <span className={`ml-1.5 font-bold ${meetsAa ? '' : 'opacity-60'}`}>
                      {meetsAa ? '適合' : '未達'}
                    </span>
                  </li>
                  <li>
                    <span className="font-label text-[9px] font-bold">AAA</span>
                    <span className="ml-1.5">通常文字 7:1以上</span>
                    <span className={`ml-1.5 font-bold ${meetsAaa ? '' : 'opacity-60'}`}>
                      {meetsAaa ? '適合' : '未達'}
                    </span>
                  </li>
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
          コントラスト比は、前景色と背景色の明るさの差を1:1〜21:1の数値で表したものです。通常サイズの文字は4.5:1以上でWCAG
          AA、7:1以上でAAAの目安を満たします。大きな文字や太字は3:1以上がAAの目安です。
        </p>
      </section>
    </div>
  );
}
