'use client';

import { useState } from 'react';
import { parseDelimitedTable } from '@/lib/statsCore';

const EXAMPLE_CSV = `ケース,結果,若年層,都市部,高関心
C01,1,1,1,1
C02,1,1,1,0
C03,1,1,0,1
C04,1,0,1,1
C05,1,1,1,1
C06,1,1,0,1
C07,0,0,0,0
C08,0,0,0,1
C09,0,0,1,0
C10,0,1,0,0
C11,1,1,1,0
C12,1,1,1,0
C13,1,1,1,0
C14,0,1,1,0`;

const integerFormatter = new Intl.NumberFormat('ja-JP');
const fixedFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

type QcaCase = {
  label: string;
  outcome: number;
  conditions: number[];
};

type ParsedQcaData = {
  conditionNames: string[];
  cases: QcaCase[];
};

type ParseOutcome = {
  data: ParsedQcaData | null;
  errors: string[];
};

type ThresholdField = {
  value: number | null;
  error: string | null;
};

type TruthTableRow = {
  pattern: number;
  count: number;
  positive: number;
  consistency: number;
  coverage: number;
  sufficient: boolean;
};

type Implicant = {
  values: (0 | 1 | null)[];
  literals: number;
  cover: number[];
};

type Candidate = {
  term: Implicant;
  indices: number[];
};

type NecessityMetrics = {
  consistency: number;
  coverage: number | null;
};

type NecessityRow = {
  letter: string;
  name: string;
  presence: NecessityMetrics;
  absence: NecessityMetrics;
};

type Solution = {
  terms: Implicant[];
  expression: string;
  consistency: number;
  coverage: number;
};

function parseThreshold(raw: string): ThresholdField {
  const token = raw.trim();

  if (token === '') {
    return { value: null, error: '整合性の閾値を入力してください。' };
  }

  const value = Number(token);

  if (!Number.isFinite(value)) {
    return { value: null, error: '整合性の閾値は数値で入力してください。' };
  }

  if (value < 0 || value > 1) {
    return {
      value: null,
      error: '整合性の閾値は0〜1の範囲で入力してください。',
    };
  }

  return { value, error: null };
}

function parseQcaData(raw: string): ParseOutcome {
  const table = parseDelimitedTable(raw);
  const errors = [...table.errors];

  if (table.headers.length === 0) {
    return { data: null, errors };
  }

  const headers = table.headers.map((header) => header.trim());

  if (headers.length < 4 || headers.length > 7) {
    errors.push(
      '列数は、ケース名1列・結果1列・条件2〜5列の合計4〜7列にしてください。',
    );
  }

  if (headers.some((header) => header === '')) {
    errors.push(
      'ヘッダーに空の列名があります。すべての列に名前を付けてください。',
    );
  }

  if (new Set(headers).size !== headers.length) {
    errors.push(
      'ヘッダーの列名が重複しています。列ごとに異なる名前を付けてください。',
    );
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  const conditionCount = headers.length - 2;
  const cases: QcaCase[] = [];
  const labels = new Set<string>();

  table.rows.forEach((row, rowIndex) => {
    if (row.length !== headers.length) {
      return;
    }

    const label = row[0].trim();

    if (label === '') {
      errors.push(`${rowIndex + 2}行目のケース名を入力してください。`);
      return;
    }

    if (labels.has(label)) {
      errors.push(
        `${rowIndex + 2}行目のケース名「${label}」が重複しています。`,
      );
      return;
    }

    labels.add(label);

    const outcomeToken = row[1].trim();
    const outcome = Number(outcomeToken);

    if (
      outcomeToken === '' ||
      !Number.isFinite(outcome) ||
      (outcome !== 0 && outcome !== 1)
    ) {
      errors.push(
        `${rowIndex + 2}行目の結果「${
          outcomeToken === '' ? '空欄' : outcomeToken
        }」は0または1で入力してください。`,
      );
      return;
    }

    const conditions: number[] = [];

    for (let column = 2; column < headers.length; column += 1) {
      const token = row[column].trim();
      const value = Number(token);

      if (
        token === '' ||
        !Number.isFinite(value) ||
        (value !== 0 && value !== 1)
      ) {
        errors.push(
          `${rowIndex + 2}行目の「${headers[column]}」は0または1で入力してください。`,
        );
        return;
      }

      conditions.push(value);
    }

    cases.push({ label, outcome, conditions });
  });

  if (errors.length > 0) {
    return { data: null, errors };
  }

  if (cases.length === 0) {
    errors.push('ヘッダーの下にデータ行を入力してください。');
    return { data: null, errors };
  }

  const positiveCount = cases.filter(
    (qcaCase) => qcaCase.outcome === 1,
  ).length;

  if (positiveCount === 0 || positiveCount === cases.length) {
    errors.push('結果の列には0と1の両方を含めてください。');
  }

  for (let column = 0; column < conditionCount; column += 1) {
    const firstValue = cases[0].conditions[column];
    const isConstant = cases.every(
      (qcaCase) => qcaCase.conditions[column] === firstValue,
    );

    if (isConstant) {
      errors.push(
        `条件「${headers[column + 2]}」の値がすべて${firstValue}です。0と1の両方を含めてください。`,
      );
    }
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  return {
    data: {
      conditionNames: headers.slice(2),
      cases,
    },
    errors,
  };
}

function buildTruthTable(
  data: ParsedQcaData,
  threshold: number,
): TruthTableRow[] {
  const conditionCount = data.conditionNames.length;
  const totalPositive = data.cases.filter(
    (qcaCase) => qcaCase.outcome === 1,
  ).length;
  const groups = new Map<number, { count: number; positive: number }>();

  for (const qcaCase of data.cases) {
    let pattern = 0;

    for (let index = 0; index < conditionCount; index += 1) {
      if (qcaCase.conditions[index] === 1) {
        pattern += 2 ** index;
      }
    }

    const current = groups.get(pattern) ?? { count: 0, positive: 0 };
    current.count += 1;

    if (qcaCase.outcome === 1) {
      current.positive += 1;
    }

    groups.set(pattern, current);
  }

  return [...groups.entries()]
    .map(([pattern, group]) => {
      const consistency = group.positive / group.count;

      return {
        pattern,
        count: group.count,
        positive: group.positive,
        consistency,
        coverage: totalPositive === 0 ? 0 : group.positive / totalPositive,
        sufficient: group.positive > 0 && consistency + 1e-12 >= threshold,
      };
    })
    .sort((a, b) => a.pattern - b.pattern);
}

function coverPatterns(
  values: (0 | 1 | null)[],
  conditionCount: number,
): number[] {
  const totalPatterns = 2 ** conditionCount;
  const covered: number[] = [];

  for (let pattern = 0; pattern < totalPatterns; pattern += 1) {
    let matches = true;

    for (let index = 0; index < conditionCount; index += 1) {
      const value = values[index];

      if (value === null) {
        continue;
      }

      const actual = Math.floor(pattern / 2 ** index) % 2;

      if (actual !== value) {
        matches = false;
        break;
      }
    }

    if (matches) {
      covered.push(pattern);
    }
  }

  return covered;
}

function minimizeRows(
  rows: TruthTableRow[],
  conditionCount: number,
): Implicant[] | null {
  const includedRows = rows.filter((row) => row.sufficient);

  if (includedRows.length === 0) {
    return null;
  }

  const includedPatterns = includedRows.map((row) => row.pattern);
  const includedSet = new Set(includedPatterns);
  const excludedSet = new Set(
    rows.filter((row) => !row.sufficient).map((row) => row.pattern),
  );
  const totalSignatures = 3 ** conditionCount;
  const valid: Implicant[] = [];

  for (let signature = 0; signature < totalSignatures; signature += 1) {
    let remainder = signature;
    const values: (0 | 1 | null)[] = [];

    for (let index = 0; index < conditionCount; index += 1) {
      const digit = remainder % 3;
      remainder = Math.floor(remainder / 3);
      values.push(digit === 0 ? 0 : digit === 1 ? 1 : null);
    }

    const covered = coverPatterns(values, conditionCount);

    if (covered.some((pattern) => excludedSet.has(pattern))) {
      continue;
    }

    const includedCover = covered.filter((pattern) =>
      includedSet.has(pattern),
    );

    if (includedCover.length === 0) {
      continue;
    }

    valid.push({
      values,
      literals: values.filter((value) => value !== null).length,
      cover: includedCover,
    });
  }

  const prime = valid.filter((implicant) => {
    for (let index = 0; index < conditionCount; index += 1) {
      if (implicant.values[index] === null) {
        continue;
      }

      const relaxed = [...implicant.values];
      relaxed[index] = null;
      const relaxedCovered = coverPatterns(relaxed, conditionCount);

      if (!relaxedCovered.some((pattern) => excludedSet.has(pattern))) {
        return false;
      }
    }

    return true;
  });

  const unique: Implicant[] = [];
  const seen = new Set<string>();

  prime
    .sort((a, b) => a.literals - b.literals)
    .forEach((implicant) => {
      const key = [...implicant.cover].sort((a, b) => a - b).join(',');

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      unique.push(implicant);
    });

  const patternIndex = new Map<number, number>(
    includedPatterns.map((pattern, index) => [pattern, index] as const),
  );
  const candidates: Candidate[] = unique.map((term) => ({
    term,
    indices: term.cover
      .map((pattern) => patternIndex.get(pattern))
      .filter((index): index is number => index !== undefined),
  }));

  if (candidates.length === 0) {
    return null;
  }

  const mintermCandidates = includedPatterns.map((_, index) =>
    candidates.filter((candidate) => candidate.indices.includes(index)),
  );

  let bestTerms: Implicant[] | null = null;
  let bestTermCount = Number.POSITIVE_INFINITY;
  let bestLiterals = Number.POSITIVE_INFINITY;
  const memo = new Map<string, { termCount: number; literals: number }>();

  const search = (
    uncovered: Set<number>,
    chosen: Implicant[],
    literalCount: number,
  ) => {
    if (uncovered.size === 0) {
      if (
        chosen.length < bestTermCount ||
        (chosen.length === bestTermCount && literalCount < bestLiterals)
      ) {
        bestTerms = [...chosen];
        bestTermCount = chosen.length;
        bestLiterals = literalCount;
      }

      return;
    }

    if (chosen.length >= bestTermCount) {
      return;
    }

    const key = [...uncovered].sort((a, b) => a - b).join(',');
    const previous = memo.get(key);

    if (
      previous !== undefined &&
      chosen.length >= previous.termCount &&
      literalCount >= previous.literals
    ) {
      return;
    }

    memo.set(key, { termCount: chosen.length, literals: literalCount });

    let options: Candidate[] = [];

    for (const index of uncovered) {
      const currentOptions = mintermCandidates[index];

      if (currentOptions.length === 0) {
        return;
      }

      if (options.length === 0 || currentOptions.length < options.length) {
        options = currentOptions;
      }
    }

    const ordered = [...options].sort(
      (a, b) =>
        b.indices.length - a.indices.length ||
        a.term.literals - b.term.literals,
    );

    for (const candidate of ordered) {
      const next = new Set(uncovered);

      for (const index of candidate.indices) {
        next.delete(index);
      }

      search(
        next,
        [...chosen, candidate.term],
        literalCount + candidate.term.literals,
      );
    }
  };

  search(
    new Set(includedPatterns.map((_, index) => index)),
    [],
    0,
  );

  return bestTerms;
}

function evaluateSolution(
  cases: QcaCase[],
  terms: Implicant[],
  totalPositive: number,
): { consistency: number; coverage: number } {
  let coveredCount = 0;
  let coveredPositive = 0;

  for (const qcaCase of cases) {
    const matches = terms.some((term) =>
      term.values.every(
        (value, index) =>
          value === null || value === qcaCase.conditions[index],
      ),
    );

    if (matches) {
      coveredCount += 1;

      if (qcaCase.outcome === 1) {
        coveredPositive += 1;
      }
    }
  }

  return {
    consistency: coveredCount === 0 ? 0 : coveredPositive / coveredCount,
    coverage: totalPositive === 0 ? 0 : coveredPositive / totalPositive,
  };
}

function buildNecessityRows(data: ParsedQcaData): NecessityRow[] {
  const totalPositive = data.cases.filter(
    (qcaCase) => qcaCase.outcome === 1,
  ).length;

  return data.conditionNames.map((name, index) => {
    let presentTotal = 0;
    let presentPositive = 0;
    let absentTotal = 0;
    let absentPositive = 0;

    for (const qcaCase of data.cases) {
      if (qcaCase.conditions[index] === 1) {
        presentTotal += 1;

        if (qcaCase.outcome === 1) {
          presentPositive += 1;
        }
      } else {
        absentTotal += 1;

        if (qcaCase.outcome === 1) {
          absentPositive += 1;
        }
      }
    }

    return {
      letter: String.fromCharCode(65 + index),
      name,
      presence: {
        consistency:
          totalPositive === 0 ? 0 : presentPositive / totalPositive,
        coverage: presentTotal === 0 ? null : presentPositive / presentTotal,
      },
      absence: {
        consistency: totalPositive === 0 ? 0 : absentPositive / totalPositive,
        coverage: absentTotal === 0 ? null : absentPositive / absentTotal,
      },
    };
  });
}

function formatFixed(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }

  return fixedFormatter.format(value);
}

function formatPattern(pattern: number, conditionCount: number): string {
  const parts: string[] = [];

  for (let index = 0; index < conditionCount; index += 1) {
    const letter = String.fromCharCode(65 + index);
    const value = Math.floor(pattern / 2 ** index) % 2;
    parts.push(`${letter}=${value}`);
  }

  return parts.join('・');
}

function formatTerm(term: Implicant): string {
  const literals: string[] = [];

  term.values.forEach((value, index) => {
    if (value === null) {
      return;
    }

    const letter = String.fromCharCode(65 + index);
    literals.push(value === 1 ? letter : `~${letter}`);
  });

  return literals.length === 0 ? '1' : literals.join('*');
}

function sortImplicants(terms: Implicant[]): Implicant[] {
  return [...terms].sort((a, b) => {
    const keyA = a.values.map((value) => (value === null ? 2 : value)).join('');
    const keyB = b.values.map((value) => (value === null ? 2 : value)).join('');

    if (keyA < keyB) {
      return -1;
    }

    if (keyA > keyB) {
      return 1;
    }

    return 0;
  });
}

export function BooleanAnalysis() {
  const [csvInput, setCsvInput] = useState(EXAMPLE_CSV);
  const [thresholdInput, setThresholdInput] = useState('0.8');

  const parsed = parseQcaData(csvInput);
  const thresholdField = parseThreshold(thresholdInput);
  const errorCount =
    parsed.errors.length + (thresholdField.error !== null ? 1 : 0);
  const data = errorCount === 0 ? parsed.data : null;
  const threshold = errorCount === 0 ? thresholdField.value : null;

  const totalPositive =
    data === null
      ? 0
      : data.cases.filter((qcaCase) => qcaCase.outcome === 1).length;

  const truthRows =
    data !== null && threshold !== null
      ? buildTruthTable(data, threshold)
      : [];

  const terms =
    data !== null && threshold !== null
      ? minimizeRows(truthRows, data.conditionNames.length)
      : null;

  const solution: Solution | null =
    data !== null && threshold !== null && terms !== null
      ? (() => {
          const sortedTerms = sortImplicants(terms);
          const metrics = evaluateSolution(
            data.cases,
            sortedTerms,
            totalPositive,
          );

          return {
            terms: sortedTerms,
            expression: sortedTerms.map(formatTerm).join(' + '),
            consistency: metrics.consistency,
            coverage: metrics.coverage,
          };
        })()
      : null;

  const necessityRows = data !== null ? buildNecessityRows(data) : [];
  const sufficientRowCount = truthRows.filter((row) => row.sufficient).length;
  const thresholdDisplay = threshold !== null ? formatFixed(threshold) : '—';

  const statusMessage =
    data !== null
      ? solution !== null
        ? `分析が完了しました。ケース数は${integerFormatter.format(
            data.cases.length,
          )}件、真理表は${integerFormatter.format(
            truthRows.length,
          )}行、解の整合性は${formatFixed(
            solution.consistency,
          )}、解の被覆度は${formatFixed(solution.coverage)}です。`
        : '整合性閾値を満たす十分条件の行がないため、最小化式を表示できませんでした。'
      : errorCount > 0
        ? `入力エラーが${integerFormatter.format(errorCount)}件あります。${
            parsed.errors[0] ?? thresholdField.error ?? ''
          }`
        : 'CSVと整合性閾値を入力すると分析結果を表示します。';

  const loadExample = () => {
    setCsvInput(EXAMPLE_CSV);
    setThresholdInput('0.8');
  };

  const resetForm = () => {
    setCsvInput('');
    setThresholdInput('0.8');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="ブール代数分析（QCA）"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="qca-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="qca-form-heading"
              className="font-editorial mt-1 text-xl"
            >
              CSVデータを入力
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]"
          >
            01 / 03
          </span>
        </div>

        <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
          1行目をヘッダー、1列目をケース名、2列目を0/1の結果、3列目以降を2〜5個の0/1条件にしたCSVを貼り付けます。カンマ、タブ、セミコロンで区切れます。
        </p>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="qca-csv"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
              {data !== null
                ? `${integerFormatter.format(
                    data.conditionNames.length + 2,
                  )}列 / ${integerFormatter.format(data.cases.length)}行`
                : '要確認'}
            </span>
          </div>
          <textarea
            id="qca-csv"
            name="csv"
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            rows={12}
            placeholder={'ケース,結果,条件1,条件2\nC01,1,1,1\nC02,0,0,1'}
            spellCheck={false}
            aria-invalid={parsed.errors.length > 0}
            aria-describedby={
              parsed.errors.length > 0
                ? 'qca-csv-help qca-csv-error'
                : 'qca-csv-help'
            }
            className="field-paper mt-2 h-64 w-full resize-y rounded-sm px-3 py-3 text-sm leading-6 tabular-nums"
          />
          <p
            id="qca-csv-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            結果と条件は0または1、ケース名は重複しないように入力します。空行は無視されます。
          </p>
          {parsed.errors.length > 0 && (
            <div
              id="qca-csv-error"
              role="alert"
              className="mt-2 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                入力内容を確認してください
              </p>
              <ul className="mt-1 list-disc space-y-1 break-words pl-4 text-[11px] leading-5 text-[var(--ink)]">
                {parsed.errors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="qca-threshold"
              className="text-sm font-bold text-[var(--ink)]"
            >
              整合性閾値
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              0〜1
            </span>
          </div>
          <input
            id="qca-threshold"
            name="threshold"
            type="number"
            inputMode="decimal"
            min={0}
            max={1}
            step="0.01"
            value={thresholdInput}
            onChange={(event) => setThresholdInput(event.target.value)}
            aria-invalid={thresholdField.error !== null}
            aria-describedby={
              thresholdField.error
                ? 'qca-threshold-error'
                : 'qca-threshold-help'
            }
            className="field-paper mt-2 w-full rounded-sm px-3 py-3 text-base tabular-nums sm:max-w-48"
          />
          {thresholdField.error ? (
            <p
              id="qca-threshold-error"
              role="alert"
              className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
            >
              {thresholdField.error}
            </p>
          ) : (
            <p
              id="qca-threshold-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              この値以上の整合性を持つ真理表の行を十分条件として採用します。初期値は0.8です。
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={loadExample}
            className="paper-button rounded-sm px-4 py-2 text-xs"
          >
            サンプルCSVを入力
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
        aria-labelledby="qca-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="qca-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              分析結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]"
          >
            02 / 03
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
          <div className="mt-4 min-w-0 space-y-4">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  ケース数
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {integerFormatter.format(data.cases.length)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  結果1
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {integerFormatter.format(totalPositive)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  条件数
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {integerFormatter.format(data.conditionNames.length)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  真理表行数
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {integerFormatter.format(truthRows.length)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  解の整合性
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {solution !== null
                    ? formatFixed(solution.consistency)
                    : '—'}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                  解の被覆度
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {solution !== null ? formatFixed(solution.coverage) : '—'}
                </dd>
              </div>
            </dl>

            <p className="text-[10px] leading-5 text-[var(--ink-soft)]">
              {`真理表の${integerFormatter.format(
                sufficientRowCount,
              )}行を十分条件として採用しています。閾値は${thresholdDisplay}です。`}
            </p>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  最小十分条件（DNF）
                </p>
                <p className="text-[10px] text-[var(--ink-soft)]">
                  閾値 {thresholdDisplay}
                </p>
              </div>
              {solution !== null ? (
                <>
                  <p className="font-editorial mt-2 break-words text-lg leading-relaxed">
                    {solution.expression}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    * は論理積（AND）、+ は論理和（OR）、~ は否定（NOT）を表します。
                  </p>
                  <dl className="mt-3 grid gap-x-3 gap-y-1 text-[11px] leading-5 sm:grid-cols-2">
                    {data.conditionNames.map((name, index) => (
                      <div
                        key={`${name}-${index}`}
                        className="flex min-w-0 items-baseline gap-2"
                      >
                        <dt className="font-bold">
                          {String.fromCharCode(65 + index)}
                        </dt>
                        <dd className="min-w-0 break-words text-[var(--ink-soft)]">
                          {name}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-[10px] leading-5 text-[var(--ink-soft)]">
                    {`解は${integerFormatter.format(
                      solution.terms.length,
                    )}項で構成されています。未観測の組み合わせは論理残余として最小化に利用しています。同程度に最小な解が複数ある場合は、そのうち1つを表示します。`}
                  </p>
                </>
              ) : (
                <p
                  role="alert"
                  className="mt-2 text-xs leading-6 text-[var(--ink-soft)]"
                >
                  整合性閾値を満たす結果1の真理表行がないため、最小十分条件を導出できません。閾値を下げるか、データを見直してください。
                </p>
              )}
            </div>

            <div
              role="note"
              className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                QCAの結果は探索的なものです
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                条件の較正、整合性閾値、真理表の行の扱い、未観測の組み合わせによって解は変わります。ここで得られる組み合わせは因果関係を証明するものではなく、事例の比較から得られた暫定的な説明として解釈してください。
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            有効なCSVと整合性閾値を入力すると、ケース数、真理表、解の整合性・被覆度、最小十分条件を表示します。
          </p>
        )}
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="qca-truth-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Truth Table</p>
            <h2
              id="qca-truth-heading"
              className="font-editorial mt-1 text-xl"
            >
              真理表と必要条件
            </h2>
          </div>
          <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
            03 / 03
          </span>
        </div>

        {data !== null ? (
          <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  真理表（観測された組み合わせ）
                </p>
                <p className="text-[10px] text-[var(--ink-soft)]">
                  {integerFormatter.format(sufficientRowCount)}行を採用
                </p>
              </div>
              <table className="mt-2 w-full table-fixed border-collapse text-left text-[10px]">
                <caption className="sr-only">
                  条件パターンごとのケース数、結果1の件数、整合性、被覆度
                </caption>
                <colgroup>
                  <col className="w-[40%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                  <col className="w-[17%]" />
                  <col className="w-[17%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--line-strong)]">
                    <th
                      scope="col"
                      className="px-1 py-1.5 font-label text-[9px] font-normal text-[var(--ink-soft)]"
                    >
                      条件
                    </th>
                    <th
                      scope="col"
                      className="px-1 py-1.5 text-right font-label text-[9px] font-normal text-[var(--ink-soft)]"
                    >
                      件数
                    </th>
                    <th
                      scope="col"
                      className="px-1 py-1.5 text-right font-label text-[9px] font-normal text-[var(--ink-soft)]"
                    >
                      結果1
                    </th>
                    <th
                      scope="col"
                      className="px-1 py-1.5 text-right font-label text-[9px] font-normal text-[var(--ink-soft)]"
                    >
                      整合性
                    </th>
                    <th
                      scope="col"
                      className="px-1 py-1.5 text-right font-label text-[9px] font-normal text-[var(--ink-soft)]"
                    >
                      被覆度
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {truthRows.map((row) => (
                    <tr
                      key={row.pattern}
                      className={`border-b border-[var(--line)] ${
                        row.sufficient ? 'bg-[var(--accent-soft)]' : ''
                      }`}
                    >
                      <th
                        scope="row"
                        className="min-w-0 px-1 py-2 text-left font-normal"
                      >
                        <span className="block break-words text-[10px] leading-5">
                          {formatPattern(
                            row.pattern,
                            data.conditionNames.length,
                          )}
                        </span>
                        {row.sufficient && (
                          <span className="font-label text-[8px] text-[var(--accent)]">
                            十分条件
                          </span>
                        )}
                      </th>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {integerFormatter.format(row.count)}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {integerFormatter.format(row.positive)}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {formatFixed(row.consistency)}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {formatFixed(row.coverage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                整合性は行内の結果1の割合、被覆度は結果1全体に占める行内の結果1の割合です。背景色付きの行は閾値以上かつ結果1を含む行です。A、B、C…はCSVの条件列の順に対応します。
              </p>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                必要条件の整合性と被覆度
              </p>
              <table className="mt-2 w-full table-fixed border-collapse text-left text-[10px]">
                <caption className="sr-only">
                  各条件の存在と非存在についての必要性の整合性と被覆度
                </caption>
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--line-strong)]">
                    <th
                      scope="col"
                      className="px-1 py-1.5 font-label text-[9px] font-normal text-[var(--ink-soft)]"
                    >
                      条件
                    </th>
                    <th
                      scope="col"
                      className="px-1 py-1.5 text-right font-label text-[8px] font-normal leading-3 text-[var(--ink-soft)]"
                    >
                      X=1
                      <br />
                      整合性
                    </th>
                    <th
                      scope="col"
                      className="px-1 py-1.5 text-right font-label text-[8px] font-normal leading-3 text-[var(--ink-soft)]"
                    >
                      X=1
                      <br />
                      被覆度
                    </th>
                    <th
                      scope="col"
                      className="px-1 py-1.5 text-right font-label text-[8px] font-normal leading-3 text-[var(--ink-soft)]"
                    >
                      X=0
                      <br />
                      整合性
                    </th>
                    <th
                      scope="col"
                      className="px-1 py-1.5 text-right font-label text-[8px] font-normal leading-3 text-[var(--ink-soft)]"
                    >
                      X=0
                      <br />
                      被覆度
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {necessityRows.map((row) => (
                    <tr
                      key={`${row.letter}-${row.name}`}
                      className="border-b border-[var(--line)]"
                    >
                      <th
                        scope="row"
                        className="min-w-0 px-1 py-2 text-left font-normal"
                      >
                        <span className="block text-[10px] font-bold">
                          {row.letter}
                        </span>
                        <span className="block break-words text-[9px] leading-4 text-[var(--ink-soft)]">
                          {row.name}
                        </span>
                      </th>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {formatFixed(row.presence.consistency)}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {formatFixed(row.presence.coverage)}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {formatFixed(row.absence.consistency)}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {formatFixed(row.absence.coverage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                X=1の整合性は結果1のケースのうち条件が1の割合、X=1の被覆度は条件が1のケースのうち結果1の割合です。X=0は否定条件について同じ計算です。
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なCSVを入力すると、真理表と各条件の必要性を表示します。
          </p>
        )}
      </section>
    </section>
  );
}
