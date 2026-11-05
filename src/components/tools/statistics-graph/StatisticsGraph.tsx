'use client';

import { useState } from 'react';

type ChartType = 'bar' | 'line';
type SortOrder = 'input' | 'desc' | 'asc';

type DataRow = {
  label: string;
  value: number;
};

type ParseResult = {
  rows: DataRow[] | null;
  errors: string[];
};

type ChartScale = {
  min: number;
  max: number;
  ticks: number[];
};

const MAX_ROWS = 12;
const MAX_ERRORS = 6;

const SAMPLE_DATA = [
  'りんご,120',
  'みかん,80',
  'バナナ,100',
  'ぶどう,240',
  'もも,180',
  'いちご,300',
  'メロン,450',
  'すいか,380',
].join('\n');

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; note: string }[] =
  [
    { value: 'bar', label: '棒グラフ', note: '値を棒で比較' },
    { value: 'line', label: '折れ線グラフ', note: '変化を線で表示' },
  ];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'input', label: '入力順' },
  { value: 'desc', label: '値の大きい順（降順）' },
  { value: 'asc', label: '値の小さい順（昇順）' },
];

const countFormatter = new Intl.NumberFormat('ja-JP');
const integerFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 6,
});
const axisFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 5,
});

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function formatNumber(value: number): string {
  const normalized = normalizeZero(value);
  return Number.isInteger(normalized)
    ? integerFormatter.format(normalized)
    : decimalFormatter.format(normalized);
}

function formatAxis(value: number): string {
  return axisFormatter.format(normalizeZero(value));
}

function normalizeInput(raw: string): string {
  return raw
    .replace(/\uFEFF/g, '')
    .normalize('NFKC')
    .replace(/[、，]/g, ',')
    .replace(/[−–—]/g, '-')
    .replace(/\r\n?/g, '\n');
}

function splitLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map((cell) => cell.trim());
  }
  return line.split(',').map((cell) => cell.trim());
}

function parseGraphData(rawInput: string): ParseResult {
  const normalized = normalizeInput(rawInput);
  const lines = normalized
    .split('\n')
    .map((text, index) => ({ text: text.trim(), lineNumber: index + 1 }))
    .filter((line) => line.text !== '');

  if (lines.length === 0) {
    return {
      rows: null,
      errors: [
        'ラベルと値を入力してください。例えば「りんご,120」のように1行ずつ入力します。',
      ],
    };
  }

  const errors: string[] = [];

  if (lines.length > MAX_ROWS) {
    errors.push(
      `データは最大${countFormatter.format(MAX_ROWS)}行までです（現在${countFormatter.format(lines.length)}行）。行数を減らしてください。`,
    );
  }

  const rows: DataRow[] = [];

  for (const line of lines) {
    const cells = splitLine(line.text);

    if (cells.length < 2) {
      errors.push(
        `${countFormatter.format(line.lineNumber)}行目は「ラベル,値」の形式で入力してください。`,
      );
      continue;
    }

    const label = cells.slice(0, -1).join(',').trim();
    const valueToken = cells[cells.length - 1].trim();

    if (label === '') {
      errors.push(
        `${countFormatter.format(line.lineNumber)}行目のラベルが空欄です。`,
      );
      continue;
    }

    if (valueToken === '') {
      errors.push(
        `${countFormatter.format(line.lineNumber)}行目の値が空欄です。`,
      );
      continue;
    }

    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/u.test(valueToken)) {
      errors.push(
        `${countFormatter.format(line.lineNumber)}行目の値「${valueToken}」は数値ではありません。`,
      );
      continue;
    }

    const value = Number(valueToken);

    if (!Number.isFinite(value)) {
      errors.push(
        `${countFormatter.format(line.lineNumber)}行目の値「${valueToken}」は数値ではありません。`,
      );
      continue;
    }

    rows.push({ label, value });
  }

  if (errors.length > 0) {
    return { rows: null, errors };
  }

  return { rows, errors: [] };
}

function sortRows(rows: DataRow[], sortOrder: SortOrder): DataRow[] {
  if (sortOrder === 'input') {
    return rows;
  }

  return [...rows].sort((left, right) =>
    sortOrder === 'desc' ? right.value - left.value : left.value - right.value,
  );
}

function createScale(values: number[], includeZero: boolean): ChartScale {
  const valueMin = Math.min(...values);
  const valueMax = Math.max(...values);
  let min = includeZero ? Math.min(0, valueMin) : valueMin;
  let max = includeZero ? Math.max(0, valueMax) : valueMax;

  if (min === max) {
    const padding = Math.abs(min) * 0.1 || 1;
    min -= padding;
    max += padding;
  }

  const range = max - min;
  const roughStep = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  let niceNormalized = 10;

  if (normalized <= 1) {
    niceNormalized = 1;
  } else if (normalized <= 2) {
    niceNormalized = 2;
  } else if (normalized <= 2.5) {
    niceNormalized = 2.5;
  } else if (normalized <= 5) {
    niceNormalized = 5;
  }

  const step = niceNormalized * magnitude;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const tickCount = Math.max(
    1,
    Math.min(12, Math.round((niceMax - niceMin) / step)),
  );
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) =>
    normalizeZero(
      Number(
        (niceMin + ((niceMax - niceMin) * index) / tickCount).toPrecision(12),
      ),
    ),
  );

  return {
    min: normalizeZero(Number(niceMin.toPrecision(12))),
    max: normalizeZero(Number(niceMax.toPrecision(12))),
    ticks,
  };
}

function truncateLabel(label: string): string {
  const trimmed = label.trim();
  return trimmed.length > 10 ? `${trimmed.slice(0, 10)}…` : trimmed;
}

function GraphChart({
  rows,
  chartType,
  unit,
  title,
}: {
  rows: DataRow[];
  chartType: ChartType;
  unit: string;
  title: string;
}) {
  const width = 640;
  const height = 360;
  const marginTop = 28;
  const marginRight = 24;
  const marginBottom = 80;
  const marginLeft = 68;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const plotBottom = marginTop + plotHeight;
  const values = rows.map((row) => row.value);
  const scale = createScale(values, chartType === 'bar');
  const yFor = (value: number) =>
    marginTop + ((scale.max - value) / (scale.max - scale.min)) * plotHeight;
  const zeroY = yFor(0);
  const showZeroLine = scale.min <= 0 && scale.max >= 0;
  const rowCount = rows.length;
  const slotWidth = plotWidth / rowCount;
  const barWidth = Math.max(4, Math.min(44, slotWidth * 0.62));
  const xFor = (index: number) =>
    chartType === 'bar'
      ? marginLeft + slotWidth * (index + 0.5)
      : rowCount === 1
        ? marginLeft + plotWidth / 2
        : marginLeft + (index / (rowCount - 1)) * plotWidth;
  const chartLabel = `${title !== '' ? `${title}。` : ''}${
    chartType === 'bar' ? '棒グラフ' : '折れ線グラフ'
  }。${rows
    .map(
      (row) =>
        `${row.label}は${formatNumber(row.value)}${unit !== '' ? unit : ''}`,
    )
    .join('、')}。`;

  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={chartLabel}
      >
        <title>{chartLabel}</title>
        <g className="text-[var(--line)]" stroke="currentColor">
          {scale.ticks.map((tick, index) => {
            const y = yFor(tick);
            return (
              <line
                key={`grid-${index}`}
                x1={marginLeft}
                y1={y}
                x2={width - marginRight}
                y2={y}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            );
          })}
        </g>
        <g className="text-[var(--line-strong)]" stroke="currentColor">
          <line
            x1={marginLeft}
            y1={marginTop}
            x2={marginLeft}
            y2={plotBottom}
            strokeWidth={1}
          />
          <line
            x1={marginLeft}
            y1={plotBottom}
            x2={width - marginRight}
            y2={plotBottom}
            strokeWidth={1}
          />
          {showZeroLine && (
            <line
              x1={marginLeft}
              y1={zeroY}
              x2={width - marginRight}
              y2={zeroY}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
        </g>
        <g className="text-[var(--ink-soft)]" fill="currentColor">
          {scale.ticks.map((tick, index) => (
            <text
              key={`tick-${index}`}
              x={marginLeft - 8}
              y={yFor(tick) + 3}
              textAnchor="end"
              fontSize="9"
            >
              {formatAxis(tick)}
            </text>
          ))}
        </g>
        <g className="text-[var(--ink-soft)]" fill="currentColor">
          <text x={marginLeft} y={height - 8} fontSize="9" textAnchor="start">
            項目
          </text>
          <text
            x={16}
            y={marginTop + plotHeight / 2}
            fontSize="9"
            textAnchor="middle"
            transform={`rotate(-90 16 ${marginTop + plotHeight / 2})`}
          >
            {unit !== '' ? `値（${unit}）` : '値'}
          </text>
        </g>
        {chartType === 'bar' ? (
          <g>
            {rows.map((row, index) => {
              const x = xFor(index);
              const valueY = yFor(row.value);
              const barTop = Math.min(valueY, zeroY);
              const barHeight = Math.max(1, Math.abs(valueY - zeroY));
              return (
                <g key={`bar-${index}`}>
                  <rect
                    x={x - barWidth / 2}
                    y={barTop}
                    width={barWidth}
                    height={barHeight}
                    rx={1}
                    fill="currentColor"
                    opacity={0.9}
                    className="text-[var(--accent)]"
                  >
                    <title>
                      {`${row.label}: ${formatNumber(row.value)}${
                        unit !== '' ? ` ${unit}` : ''
                      }`}
                    </title>
                  </rect>
                  <text
                    x={x}
                    y={row.value < 0 ? valueY + 13 : valueY - 5}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="currentColor"
                    className="text-[var(--ink)]"
                  >
                    {formatNumber(row.value)}
                  </text>
                </g>
              );
            })}
          </g>
        ) : (
          <g>
            {rowCount > 1 && (
              <polyline
                points={rows
                  .map((row, index) => `${xFor(index)},${yFor(row.value)}`)
                  .join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--accent)]"
              />
            )}
            {rows.map((row, index) => {
              const x = xFor(index);
              const y = yFor(row.value);
              return (
                <g key={`point-${index}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={3.5}
                    fill="currentColor"
                    stroke="var(--paper-strong)"
                    strokeWidth={1.5}
                    className="text-[var(--accent)]"
                  >
                    <title>
                      {`${row.label}: ${formatNumber(row.value)}${
                        unit !== '' ? ` ${unit}` : ''
                      }`}
                    </title>
                  </circle>
                  <text
                    x={x}
                    y={row.value < 0 ? y + 14 : y - 7}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="currentColor"
                    className="text-[var(--ink)]"
                  >
                    {formatNumber(row.value)}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        <g className="text-[var(--ink-soft)]" fill="currentColor">
          {rows.map((row, index) => {
            const x = xFor(index);
            const labelY = plotBottom + 14;
            return (
              <text
                key={`label-${index}`}
                x={x}
                y={labelY}
                textAnchor="end"
                fontSize="9"
                transform={`rotate(-35 ${x} ${labelY})`}
              >
                <title>{row.label}</title>
                {truncateLabel(row.label)}
              </text>
            );
          })}
        </g>
      </svg>
      <figcaption className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] leading-5 text-[var(--ink-soft)]">
        <span>横軸は項目、縦軸は値{unit !== '' ? `（${unit}）` : ''}</span>
        <span>{countFormatter.format(rows.length)}件</span>
      </figcaption>
      <ul className="sr-only">
        {rows.map((row, index) => (
          <li key={`summary-${index}`}>
            {`${row.label}: ${formatNumber(row.value)}${
              unit !== '' ? ` ${unit}` : ''
            }`}
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function StatisticsGraph() {
  const [input, setInput] = useState(SAMPLE_DATA);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [sortOrder, setSortOrder] = useState<SortOrder>('input');
  const [title, setTitle] = useState('フルーツの価格');
  const [unit, setUnit] = useState('円');

  const parsed = parseGraphData(input);
  const rows = parsed.rows;
  const displayRows = rows !== null ? sortRows(rows, sortOrder) : [];
  const chartTypeLabel = chartType === 'bar' ? '棒グラフ' : '折れ線グラフ';
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sortOrder)?.label ??
    SORT_OPTIONS[0].label;
  const trimmedTitle = title.trim();
  const trimmedUnit = unit.trim();
  const maxValue =
    displayRows.length > 0
      ? Math.max(...displayRows.map((row) => row.value))
      : null;
  const minValue =
    displayRows.length > 0
      ? Math.min(...displayRows.map((row) => row.value))
      : null;

  const statusMessage =
    rows !== null
      ? `統計グラフを表示しています。${countFormatter.format(
          rows.length,
        )}件、${chartTypeLabel}、並び順は${sortLabel}です。最大値は${formatNumber(
          maxValue ?? 0,
        )}${trimmedUnit !== '' ? trimmedUnit : ''}、最小値は${formatNumber(
          minValue ?? 0,
        )}${trimmedUnit !== '' ? trimmedUnit : ''}です。`
      : parsed.errors.length > 0
        ? `入力エラーが${countFormatter.format(
            parsed.errors.length,
          )}件あります。${parsed.errors[0]}`
        : 'ラベルと値を入力するとグラフを表示します。';

  const loadSample = () => {
    setInput(SAMPLE_DATA);
    setChartType('bar');
    setSortOrder('input');
    setTitle('フルーツの価格');
    setUnit('円');
  };

  const resetForm = () => {
    setInput('');
    setChartType('bar');
    setSortOrder('input');
    setTitle('');
    setUnit('');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="統計グラフメーカー"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="statistics-graph-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="statistics-graph-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              データと表示を設定
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
          1行につき「ラベル,値」を入力してください。区切りはカンマ・タブ・全角カンマに対応し、最大12行までグラフにできます。入力内容は自動で反映されます。
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="statistics-graph-input"
              className="text-sm font-bold text-[var(--ink)]"
            >
              データ
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              最大12行
            </span>
          </div>
          <textarea
            id="statistics-graph-input"
            name="statistics-graph-input"
            rows={8}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={SAMPLE_DATA}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-invalid={parsed.errors.length > 0}
            aria-describedby={
              parsed.errors.length > 0
                ? 'statistics-graph-help statistics-graph-errors'
                : 'statistics-graph-help'
            }
            className="field-paper mt-2 min-h-44 w-full rounded-sm px-3 py-3 font-mono text-sm leading-6"
          />
          <p
            id="statistics-graph-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            例: 「りんご,120」のように1行1件で入力します。タブ区切りや全角カンマにも対応しています。
          </p>
          {parsed.errors.length > 0 && (
            <div
              id="statistics-graph-errors"
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
                  {countFormatter.format(parsed.errors.length - MAX_ERRORS)}
                  件のエラーがあります。
                </p>
              )}
            </div>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[var(--ink)]">
            グラフの種類
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CHART_TYPE_OPTIONS.map((option) => {
              const isSelected = chartType === option.value;
              return (
                <label
                  key={option.value}
                  className={`paper-chip flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center rounded-sm px-2 py-2.5 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="statistics-graph-chart-type"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setChartType(option.value)}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold">{option.label}</span>
                  <span className="mt-0.5 text-[10px] font-normal opacity-80">
                    {option.note}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5">
          <label
            htmlFor="statistics-graph-sort"
            className="text-sm font-bold text-[var(--ink)]"
          >
            並び順
          </label>
          <select
            id="statistics-graph-sort"
            name="statistics-graph-sort"
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(event.target.value as SortOrder)
            }
            aria-describedby="statistics-graph-sort-help"
            className="field-paper mt-2 rounded-sm px-3 py-3 text-base"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p
            id="statistics-graph-sort-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            入力順は入力した行のまま、降順・昇順は値の大小で並べ替えます。
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <label
              htmlFor="statistics-graph-title"
              className="text-sm font-bold text-[var(--ink)]"
            >
              タイトル <span className="text-xs font-normal">任意</span>
            </label>
            <input
              id="statistics-graph-title"
              name="statistics-graph-title"
              type="text"
              maxLength={60}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例: フルーツの価格"
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base"
            />
          </div>
          <div className="min-w-0">
            <label
              htmlFor="statistics-graph-unit"
              className="text-sm font-bold text-[var(--ink)]"
            >
              単位 <span className="text-xs font-normal">任意</span>
            </label>
            <input
              id="statistics-graph-unit"
              name="statistics-graph-unit"
              type="text"
              maxLength={12}
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="例: 円"
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base"
            />
          </div>
        </div>

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
        aria-labelledby="statistics-graph-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="statistics-graph-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              統計グラフ
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

        {rows !== null ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    Chart
                  </p>
                  <p className="font-editorial mt-1 text-lg">
                    {trimmedTitle !== '' ? trimmedTitle : '統計グラフ'}
                  </p>
                </div>
                <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-[10px] font-bold">
                  {chartTypeLabel}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                {countFormatter.format(rows.length)}件 / {sortLabel} / 最大{' '}
                {formatNumber(maxValue ?? 0)}
                {trimmedUnit !== '' ? ` ${trimmedUnit}` : ''} / 最小{' '}
                {formatNumber(minValue ?? 0)}
                {trimmedUnit !== '' ? ` ${trimmedUnit}` : ''}
              </p>
              <GraphChart
                rows={displayRows}
                chartType={chartType}
                unit={trimmedUnit}
                title={trimmedTitle}
              />
            </div>

            <div
              role="note"
              className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                グラフの見方
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                棒グラフは値の大小、折れ線グラフは値の変化を表します。目盛りはデータに合わせて自動で調整され、負の値にも対応しています。
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                並び順を変えるとグラフの表示順も変わります。入力内容は保存・送信されません。
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="font-editorial text-lg">
              {parsed.errors.length > 0
                ? '入力内容を確認してください'
                : 'データを入力してください'}
            </p>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
              {parsed.errors.length > 0
                ? '入力内容にエラーがあります。左のエラーメッセージを確認してください。'
                : 'ラベルと値を入力すると、棒グラフまたは折れ線グラフを表示します。'}
            </p>
            <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              例: 「りんご,120」のように1行1件で入力します。サンプルデータを入力すると、すぐに表示を確認できます。
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
