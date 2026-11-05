'use client';

import { useState } from 'react';

type HeaderMode = 'auto' | 'include' | 'exclude';
type NormalizeMode = 'table' | 'row';
type Rgb = readonly [number, number, number];

const MAX_ROWS = 12;
const MAX_COLUMNS = 12;
const MAX_ERRORS = 6;

const SAMPLE_CSV = [
  ',月,火,水,木,金',
  '東京,28,31,26,24,29',
  '大阪,30,33,29,27,32',
  '札幌,22,25,21,19,23',
  '福岡,31,34,30,28,33',
  '那覇,33,35,32,30,34',
].join('\n');

const COLOR_SCHEMES = [
  {
    id: 'blue',
    label: '青',
    stops: [
      [239, 246, 255],
      [191, 219, 254],
      [96, 165, 250],
      [37, 99, 235],
      [30, 58, 138],
    ],
  },
  {
    id: 'red',
    label: '赤',
    stops: [
      [254, 242, 242],
      [254, 202, 202],
      [248, 113, 113],
      [220, 38, 38],
      [127, 29, 29],
    ],
  },
  {
    id: 'green',
    label: '緑',
    stops: [
      [240, 253, 244],
      [187, 247, 208],
      [74, 222, 128],
      [22, 163, 74],
      [20, 83, 45],
    ],
  },
] as const;

const NORMALIZE_OPTIONS: {
  value: NormalizeMode;
  label: string;
  note: string;
}[] = [
  { value: 'table', label: '表全体', note: '全体で比較' },
  { value: 'row', label: '行ごと', note: '行内で比較' },
];

type ColorSchemeId = (typeof COLOR_SCHEMES)[number]['id'];

type HeatmapRow = {
  label: string;
  values: number[];
  min: number;
  max: number;
};

type HeatmapData = {
  columns: string[];
  rows: HeatmapRow[];
  min: number;
  max: number;
};

type ParseResult = {
  data: HeatmapData | null;
  errors: string[];
};

const integerFormatter = new Intl.NumberFormat('ja-JP');
const valueFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 6,
});
const axisFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 4,
});

const DARK_TEXT: Rgb = [0, 0, 0];
const LIGHT_TEXT: Rgb = [255, 255, 255];

function formatValue(value: number): string {
  return Number.isInteger(value)
    ? integerFormatter.format(value)
    : valueFormatter.format(value);
}

function toCssColor(color: Rgb): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function mixStops(stops: readonly Rgb[], ratio: number): Rgb {
  const clamped = Math.min(1, Math.max(0, ratio));
  const position = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const local = position - index;
  const start = stops[index];
  const end = stops[index + 1];

  return [
    Math.round(start[0] + (end[0] - start[0]) * local),
    Math.round(start[1] + (end[1] - start[1]) * local),
    Math.round(start[2] + (end[2] - start[2]) * local),
  ];
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * channelToLinear(color[0]) +
    0.7152 * channelToLinear(color[1]) +
    0.0722 * channelToLinear(color[2])
  );
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function getCellTextColor(background: Rgb): string {
  const darkContrast = contrastRatio(background, DARK_TEXT);
  const lightContrast = contrastRatio(background, LIGHT_TEXT);

  return toCssColor(lightContrast > darkContrast ? LIGHT_TEXT : DARK_TEXT);
}

function normalizeRatio(value: number, min: number, max: number): number {
  if (max === min) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function detectDelimiter(line: string): string {
  if (line.includes('\t')) {
    return '\t';
  }
  if (line.includes(',')) {
    return ',';
  }
  if (line.includes(';')) {
    return ';';
  }

  return ',';
}

function isNumericToken(token: string): boolean {
  const value = token.trim();
  return value !== '' && Number.isFinite(Number(value));
}

function looksLikeHeader(cells: string[]): boolean {
  const candidates = cells.filter((cell) => cell.trim() !== '');

  return (
    candidates.length > 0 &&
    candidates.every((cell) => !isNumericToken(cell))
  );
}

function detectRowLabels(
  headerCells: string[] | null,
  dataRows: string[][],
): boolean {
  if (dataRows.length === 0) {
    return false;
  }

  if (headerCells !== null && headerCells[0]?.trim() === '') {
    return dataRows.every((cells) => cells.length > 1);
  }

  return dataRows.every(
    (cells) =>
      cells.length > 1 &&
      cells[0].trim() !== '' &&
      !isNumericToken(cells[0]),
  );
}

function parseHeatmap(rawInput: string, headerMode: HeaderMode): ParseResult {
  const normalized = rawInput
    .replace(/\uFEFF/g, '')
    .replace(/[，、]/g, ',')
    .replace(/\r\n?/g, '\n');

  const lines = normalized
    .split('\n')
    .map((text, index) => ({ text: text.trim(), lineNumber: index + 1 }))
    .filter((line) => line.text !== '');

  if (lines.length === 0) {
    return { data: null, errors: [] };
  }

  const delimiter = detectDelimiter(lines[0].text);
  const rowsWithCells = lines.map((line) => ({
    lineNumber: line.lineNumber,
    cells: line.text.split(delimiter).map((cell) => cell.trim()),
  }));

  const firstCells = rowsWithCells[0].cells;
  const hasHeader =
    headerMode === 'include'
      ? true
      : headerMode === 'exclude'
        ? false
        : looksLikeHeader(firstCells);
  const headerCells = hasHeader ? firstCells : null;
  const dataLineRows = hasHeader ? rowsWithCells.slice(1) : rowsWithCells;

  if (dataLineRows.length === 0) {
    return {
      data: null,
      errors: ['ヘッダー行に続くデータ行を入力してください。'],
    };
  }

  const dataRows = dataLineRows.map((row) => row.cells);
  const hasRowLabels = detectRowLabels(headerCells, dataRows);
  const expectedWidth = hasHeader ? firstCells.length : dataRows[0].length;
  const labelColumns = hasRowLabels ? 1 : 0;
  const columnCount = expectedWidth - labelColumns;
  const errors: string[] = [];

  if (dataRows.length > MAX_ROWS) {
    errors.push(
      `データ行は最大${integerFormatter.format(
        MAX_ROWS,
      )}行までです（現在${integerFormatter.format(
        dataRows.length,
      )}行）。行数を減らしてください。`,
    );
  }

  if (columnCount > MAX_COLUMNS) {
    errors.push(
      `データ列は最大${integerFormatter.format(
        MAX_COLUMNS,
      )}列までです（現在${integerFormatter.format(
        columnCount,
      )}列）。列数を減らしてください。`,
    );
  }

  if (columnCount < 1) {
    errors.push(
      '数値データの列がありません。行ラベルの右側に、カンマ区切りで数値を入力してください。',
    );
  }

  dataLineRows.forEach((row) => {
    if (row.cells.length !== expectedWidth) {
      errors.push(
        `${integerFormatter.format(
          row.lineNumber,
        )}行目の列数が一致しません（${integerFormatter.format(
          row.cells.length,
        )}列 / 期待${integerFormatter.format(
          expectedWidth,
        )}列）。カンマの位置を確認してください。`,
      );
    }
  });

  if (errors.length > 0) {
    return { data: null, errors };
  }

  const columns = Array.from({ length: columnCount }, (_, index) => {
    const headerLabel = headerCells
      ? headerCells[index + labelColumns]
      : '';

    return headerLabel.trim() !== '' ? headerLabel : `列${index + 1}`;
  });

  const parsedRows: HeatmapRow[] = [];
  const cellErrors: string[] = [];

  for (let rowIndex = 0; rowIndex < dataLineRows.length; rowIndex += 1) {
    const line = dataLineRows[rowIndex];
    const label = hasRowLabels
      ? line.cells[0].trim() !== ''
        ? line.cells[0]
        : `行${rowIndex + 1}`
      : `行${rowIndex + 1}`;
    const valueTokens = hasRowLabels
      ? line.cells.slice(1)
      : line.cells;
    const values: number[] = [];

    for (
      let columnIndex = 0;
      columnIndex < valueTokens.length;
      columnIndex += 1
    ) {
      const token = valueTokens[columnIndex];
      const columnLabel = columns[columnIndex];

      if (token === '') {
        cellErrors.push(
          `${integerFormatter.format(
            line.lineNumber,
          )}行目「${columnLabel}」が空欄です。数値を入力してください。`,
        );
        continue;
      }

      const value = Number(token);

      if (!Number.isFinite(value)) {
        cellErrors.push(
          `${integerFormatter.format(
            line.lineNumber,
          )}行目「${columnLabel}」の「${token}」は数値ではありません。`,
        );
        continue;
      }

      values.push(value);
    }

    parsedRows.push({
      label,
      values,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    });
  }

  if (cellErrors.length > 0) {
    return { data: null, errors: cellErrors };
  }

  const allValues = parsedRows.flatMap((row) => row.values);

  return {
    data: {
      columns,
      rows: parsedRows,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
    },
    errors: [],
  };
}

export function HeatmapMaker() {
  const [input, setInput] = useState(SAMPLE_CSV);
  const [headerMode, setHeaderMode] = useState<HeaderMode>('auto');
  const [colorScheme, setColorScheme] = useState<ColorSchemeId>('blue');
  const [normalizeMode, setNormalizeMode] =
    useState<NormalizeMode>('table');

  const parsed = parseHeatmap(input, headerMode);
  const data = parsed.data;
  const selectedScheme =
    COLOR_SCHEMES.find((scheme) => scheme.id === colorScheme) ??
    COLOR_SCHEMES[0];
  const gradient = `linear-gradient(90deg, ${selectedScheme.stops
    .map((stop) => toCssColor(stop))
    .join(', ')})`;

  const statusMessage =
    data !== null
      ? `ヒートマップを表示しています。${integerFormatter.format(
          data.rows.length,
        )}行、${integerFormatter.format(
          data.columns.length,
        )}列。最小値は${axisFormatter.format(
          data.min,
        )}、最大値は${axisFormatter.format(
          data.max,
        )}です。カラースキームは${selectedScheme.label}、正規化は${
          normalizeMode === 'row' ? '行ごと' : '表全体'
        }です。`
      : parsed.errors.length > 0
        ? `入力エラーが${integerFormatter.format(
            parsed.errors.length,
          )}件あります。${parsed.errors[0]}`
        : 'CSVを入力するとヒートマップを表示します。';

  const loadSample = () => {
    setInput(SAMPLE_CSV);
    setHeaderMode('auto');
  };

  const resetForm = () => {
    setInput('');
    setHeaderMode('auto');
    setColorScheme('blue');
    setNormalizeMode('table');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="ヒートマップメーカー"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="heatmap-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="heatmap-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              CSVデータを入力
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
          1行目にヘッダー、1列目に行ラベルを置けます。セルはカンマ・タブ・セミコロンで区切り、最大12行×12列まで処理します。
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="heatmap-input"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVグリッド
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              12 × 12
            </span>
          </div>
          <textarea
            id="heatmap-input"
            name="heatmap-input"
            rows={8}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={SAMPLE_CSV}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-invalid={parsed.errors.length > 0}
            aria-describedby={
              parsed.errors.length > 0
                ? 'heatmap-help heatmap-errors'
                : 'heatmap-help'
            }
            className="field-paper mt-2 min-h-44 w-full rounded-sm px-3 py-3 font-mono text-sm leading-6"
          />
          <p
            id="heatmap-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            例: 「,月,火,水」の次の行に「東京,10,20,30」。数値はカンマ区切りで、空欄や文字列はエラーになります。
          </p>
        </div>

        {parsed.errors.length > 0 && (
          <div
            id="heatmap-errors"
            role="alert"
            className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              入力内容を確認してください
            </p>
            <ul className="mt-1 list-disc space-y-1 break-words pl-4 text-[11px] leading-5 text-[var(--ink)]">
              {parsed.errors.slice(0, MAX_ERRORS).map((error, index) => (
                <li key={`${index}-${error}`}>{error}</li>
              ))}
            </ul>
            {parsed.errors.length > MAX_ERRORS && (
              <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                ほか
                {integerFormatter.format(
                  parsed.errors.length - MAX_ERRORS,
                )}
                件のエラーがあります。
              </p>
            )}
          </div>
        )}

        <div className="mt-5">
          <label
            htmlFor="heatmap-header-mode"
            className="text-sm font-bold text-[var(--ink)]"
          >
            1行目の扱い
          </label>
          <select
            id="heatmap-header-mode"
            name="heatmap-header-mode"
            value={headerMode}
            onChange={(event) =>
              setHeaderMode(event.target.value as HeaderMode)
            }
            aria-describedby="heatmap-header-help"
            className="field-paper mt-2 rounded-sm px-3 py-3 text-base"
          >
            <option value="auto">自動判定</option>
            <option value="include">ヘッダー行として使う</option>
            <option value="exclude">データ行として使う</option>
          </select>
          <p
            id="heatmap-header-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            自動判定では、1行目に数値が含まれない場合に列名のヘッダーとして扱います。行ラベルは1列目の文字列から自動で判定します。
          </p>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[var(--ink)]">
            カラースキーム
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {COLOR_SCHEMES.map((scheme) => {
              const isSelected = colorScheme === scheme.id;
              const schemeGradient = `linear-gradient(90deg, ${scheme.stops
                .map((stop) => toCssColor(stop))
                .join(', ')})`;

              return (
                <label
                  key={scheme.id}
                  className={`paper-chip flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center rounded-sm px-2 py-2.5 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="heatmap-color-scheme"
                    value={scheme.id}
                    checked={isSelected}
                    onChange={() => setColorScheme(scheme.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="h-2 w-full rounded-full border border-black/10"
                    style={{ background: schemeGradient }}
                  />
                  <span className="mt-1.5 text-xs font-bold">
                    {scheme.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[var(--ink)]">
            正規化の単位
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {NORMALIZE_OPTIONS.map((option) => {
              const isSelected = normalizeMode === option.value;

              return (
                <label
                  key={option.value}
                  className={`paper-chip flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center rounded-sm px-2 py-2.5 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="heatmap-normalize-mode"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setNormalizeMode(option.value)}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold">
                    {option.label}
                  </span>
                  <span className="mt-0.5 text-[10px] font-normal opacity-80">
                    {option.note}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            {normalizeMode === 'row'
              ? '各行の最小値を最も薄い色、最大値を最も濃い色として、行ごとに色を割り当てます。'
              : '表全体の最小値を最も薄い色、最大値を最も濃い色として、すべてのセルを同じ基準で色分けします。'}
          </p>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={loadSample}
            className="paper-button rounded-sm px-4 py-2 text-xs"
          >
            サンプルデータを入力
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="paper-button rounded-sm px-4 py-2 text-xs"
          >
            入力をリセット
          </button>
          <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
            入力内容は保存・送信されません。
          </p>
        </div>
      </form>

      <section
        aria-labelledby="heatmap-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="heatmap-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              ヒートマップ
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

        {data !== null ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Grid
                  </p>
                  <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                    {integerFormatter.format(data.rows.length)}行 ×{' '}
                    {integerFormatter.format(data.columns.length)}列
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Range
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums">
                    {axisFormatter.format(data.min)} 〜{' '}
                    {axisFormatter.format(data.max)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-label text-[9px] text-[var(--ink-soft)]">
                    Color Scale
                  </span>
                  <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                    {normalizeMode === 'row'
                      ? '行ごとに正規化'
                      : '表全体で正規化'}{' '}
                    / {selectedScheme.label}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="shrink-0 text-[10px] font-bold tabular-nums text-[var(--ink-soft)]">
                    {normalizeMode === 'row'
                      ? '行内 最小'
                      : `最小 ${axisFormatter.format(data.min)}`}
                  </span>
                  <div
                    role="img"
                    aria-label={`${selectedScheme.label}のカラースケール。${
                      normalizeMode === 'row'
                        ? '各行の最小値から最大値'
                        : `最小値${axisFormatter.format(
                            data.min,
                          )}から最大値${axisFormatter.format(data.max)}`
                    }`}
                    className="h-3 min-w-0 flex-1 border border-[var(--line)]"
                    style={{ background: gradient }}
                  />
                  <span className="shrink-0 text-[10px] font-bold tabular-nums text-[var(--ink-soft)]">
                    {normalizeMode === 'row'
                      ? '行内 最大'
                      : `最大 ${axisFormatter.format(data.max)}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  Heatmap Table
                </p>
                <p className="text-[10px] text-[var(--ink-soft)]">
                  横にスクロールできます
                </p>
              </div>
              <div
                role="region"
                aria-label="ヒートマップ表"
                tabIndex={0}
                className="mt-2 max-w-full overflow-x-auto border border-[var(--line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <table className="w-full min-w-max border-collapse text-center text-xs tabular-nums">
                  <caption className="sr-only">
                    CSVから作成したヒートマップ。
                    {integerFormatter.format(data.rows.length)}行、
                    {integerFormatter.format(data.columns.length)}
                    列。セルには元の数値を表示しています。
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="sticky left-0 z-20 border border-[var(--line)] bg-[var(--paper-muted)] px-3 py-2 text-left text-[10px] font-bold text-[var(--ink-soft)] shadow-[2px_0_0_var(--line)]"
                      >
                        項目
                      </th>
                      {data.columns.map((column, index) => (
                        <th
                          key={`${column}-${index}`}
                          scope="col"
                          className="min-w-[3.25rem] border border-[var(--line)] bg-[var(--paper-muted)] px-2 py-2 text-[10px] font-bold text-[var(--ink-soft)]"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, rowIndex) => (
                      <tr key={`${row.label}-${rowIndex}`}>
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border border-[var(--line)] bg-[var(--paper-strong)] px-3 py-2 text-left text-[11px] font-bold shadow-[2px_0_0_var(--line)]"
                        >
                          <span className="block whitespace-nowrap">
                            {row.label}
                          </span>
                          {normalizeMode === 'row' && (
                            <span className="mt-0.5 block whitespace-nowrap text-[9px] font-normal text-[var(--ink-soft)]">
                              {axisFormatter.format(row.min)} 〜{' '}
                              {axisFormatter.format(row.max)}
                            </span>
                          )}
                        </th>
                        {row.values.map((value, columnIndex) => {
                          const rangeMin =
                            normalizeMode === 'row'
                              ? row.min
                              : data.min;
                          const rangeMax =
                            normalizeMode === 'row'
                              ? row.max
                              : data.max;
                          const ratio = normalizeRatio(
                            value,
                            rangeMin,
                            rangeMax,
                          );
                          const background = mixStops(
                            selectedScheme.stops,
                            ratio,
                          );

                          return (
                            <td
                              key={`${rowIndex}-${columnIndex}`}
                              title={`${row.label} / ${
                                data.columns[columnIndex]
                              }: ${formatValue(value)}`}
                              className="min-w-[3.25rem] border border-[var(--line)] px-2 py-3 font-bold"
                              style={{
                                backgroundColor: toCssColor(background),
                                color: getCellTextColor(background),
                              }}
                            >
                              {formatValue(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              role="note"
              className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                使い方とデータについて
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                色は正規化した相対値で、選択した範囲内での大小関係を表します。行ごとの正規化では、各行の最小値が最も薄く、最大値が最も濃くなります。最小値と最大値が同じ場合は中間色で表示します。
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                データソースは貼り付けたCSVのみです。外部APIや外部の集計サービスは利用せず、入力内容を送信・保存しません。
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="font-editorial text-lg">
              CSVを入力してください
            </p>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
              {parsed.errors.length > 0
                ? '入力内容にエラーがあります。左のエラーメッセージを確認してください。'
                : '1行目にヘッダー、1列目に行ラベルを置いたCSVを貼り付けると、色分けした表を表示します。'}
            </p>
            <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              例: 「,月,火,水」の次の行に「東京,10,20,30」。サンプルデータを入力すると、すぐに表示を確認できます。
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
