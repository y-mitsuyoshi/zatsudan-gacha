'use client';

import { useState } from 'react';
import {
  mean,
  parseNumberList,
  pFromT,
  standardDeviation,
  tCdf,
  variance,
} from '@/lib/statsCore';

type TestMode = 'one-sample' | 'two-sample' | 'paired';

type VarianceMode = 'student' | 'welch';

type ParsedSeries = {
  values: number[];
  error: string | null;
};

type ParsedMean = {
  value: number | null;
  error: string | null;
};

type TestResult = {
  mode: TestMode;
  methodLabel: string;
  nA: number;
  nB: number | null;
  meanA: number;
  meanB: number | null;
  sdA: number;
  sdB: number | null;
  referenceMean: number | null;
  difference: number;
  t: number;
  df: number;
  pValue: number;
  ciLower: number;
  ciUpper: number;
  cohensD: number;
};

type AnalysisAttempt = {
  result: TestResult | null;
  errors: string[];
};

const SAMPLE_ONE = '168, 172, 165, 175, 170, 169, 174, 171';
const SAMPLE_ONE_MEAN = '170';
const SAMPLE_GROUP_A = '72, 68, 75, 70, 74, 71, 73, 69';
const SAMPLE_GROUP_B = '65, 62, 68, 64, 66, 63, 67, 61';
const SAMPLE_PAIRED_A = '82, 76, 88, 79, 85, 80, 84, 78';
const SAMPLE_PAIRED_B = '78, 73, 83, 75, 80, 76, 81, 74';

const MODE_OPTIONS: { value: TestMode; label: string; note: string }[] = [
  { value: 'one-sample', label: '1標本', note: '1組のデータ' },
  { value: 'two-sample', label: '2標本', note: '独立した2群' },
  { value: 'paired', label: '対応あり', note: '同じ対象の前後' },
];

const VARIANCE_OPTIONS: {
  value: VarianceMode;
  label: string;
  note: string;
}[] = [
  { value: 'student', label: 'Student', note: '等分散を仮定' },
  { value: 'welch', label: 'Welch', note: '等分散を仮定しない' },
];

const integerFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 4,
});
const compactNumberFormatter = new Intl.NumberFormat('ja-JP', {
  maximumSignificantDigits: 4,
});
const pValueFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  const absolute = Math.abs(normalized);
  if (absolute > 0 && absolute < 0.0001) {
    return compactNumberFormatter.format(normalized);
  }
  if (absolute >= 1_000_000_000) {
    return compactNumberFormatter.format(normalized);
  }
  return decimalFormatter.format(normalized);
}

function formatPValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '算出不可';
  }
  if (value < 0.0001) {
    return '< 0.0001';
  }
  if (value > 1) {
    return '> 1';
  }
  return pValueFormatter.format(value);
}

function formatInterval(lower: number, upper: number): string {
  return `${formatNumber(lower)} 〜 ${formatNumber(upper)}`;
}

function parseSeries(raw: string, label: string): ParsedSeries {
  const normalized = raw
    .normalize('NFKC')
    .replace(/[−–—]/gu, '-')
    .trim();

  if (normalized === '') {
    return { values: [], error: `${label}を入力してください。` };
  }

  const parsed = parseNumberList(normalized);

  if (parsed.invalid.length > 0) {
    const preview = parsed.invalid
      .slice(0, 3)
      .map((token) => `「${token}」`)
      .join('、');
    const suffix = parsed.invalid.length > 3 ? 'など' : '';
    return {
      values: [],
      error: `${label}に数値として解釈できない値（${preview}${suffix}）があります。カンマ・スペース・改行で区切って入力してください。`,
    };
  }

  if (parsed.values.length < 2) {
    return {
      values: [],
      error: `${label}は2件以上の数値を入力してください。`,
    };
  }

  return { values: parsed.values, error: null };
}

function parseHypothesizedMean(raw: string): ParsedMean {
  const normalized = raw
    .normalize('NFKC')
    .replace(/[−–—]/gu, '-')
    .trim();

  if (normalized === '') {
    return {
      value: null,
      error: '帰無仮説の平均値を入力してください。',
    };
  }

  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return {
      value: null,
      error: '帰無仮説の平均値は数値で入力してください。',
    };
  }

  return { value, error: null };
}

function inverseStudentT(probability: number, df: number): number {
  let lower = 0;
  let upper = 1;
  while (tCdf(upper, df) < probability && upper < 1e6) {
    upper *= 2;
  }
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (tCdf(middle, df) < probability) {
      lower = middle;
    } else {
      upper = middle;
    }
  }
  return (lower + upper) / 2;
}

function finalizeResult(result: TestResult): AnalysisAttempt {
  const values = [
    result.meanA,
    result.sdA,
    result.difference,
    result.t,
    result.df,
    result.pValue,
    result.ciLower,
    result.ciUpper,
    result.cohensD,
    ...(result.meanB === null ? [] : [result.meanB]),
    ...(result.sdB === null ? [] : [result.sdB]),
    ...(result.referenceMean === null ? [] : [result.referenceMean]),
  ];

  if (values.some((value) => !Number.isFinite(value))) {
    return {
      result: null,
      errors: [
        '数値が極端に大きいか小さいため、計算結果が安定しませんでした。データの値を確認してください。',
      ],
    };
  }

  return { result, errors: [] };
}

function analyzeTest(
  mode: TestMode,
  varianceMode: VarianceMode,
  oneData: ParsedSeries,
  oneHypothesizedMean: ParsedMean,
  groupA: ParsedSeries,
  groupB: ParsedSeries,
  pairedA: ParsedSeries,
  pairedB: ParsedSeries,
): AnalysisAttempt {
  if (mode === 'one-sample') {
    if (oneData.error !== null) {
      return { result: null, errors: [oneData.error] };
    }
    if (
      oneHypothesizedMean.error !== null ||
      oneHypothesizedMean.value === null
    ) {
      return {
        result: null,
        errors: [
          oneHypothesizedMean.error ??
            '帰無仮説の平均値を入力してください。',
        ],
      };
    }

    const values = oneData.values;
    const n = values.length;
    const average = mean(values);
    const sd = standardDeviation(values);

    if (!(sd > 0) || !Number.isFinite(sd)) {
      return {
        result: null,
        errors: [
          'データの値がすべて同じため、標準偏差が0になりt検定を計算できません。異なる値を入力してください。',
        ],
      };
    }

    const standardError = sd / Math.sqrt(n);
    const difference = average - oneHypothesizedMean.value;
    const t = difference / standardError;
    const df = n - 1;
    const pValue = pFromT(t, df);
    const criticalValue = inverseStudentT(0.975, df);

    return finalizeResult({
      mode,
      methodLabel: '1標本t検定',
      nA: n,
      nB: null,
      meanA: average,
      meanB: null,
      sdA: sd,
      sdB: null,
      referenceMean: oneHypothesizedMean.value,
      difference,
      t,
      df,
      pValue,
      ciLower: difference - criticalValue * standardError,
      ciUpper: difference + criticalValue * standardError,
      cohensD: difference / sd,
    });
  }

  if (mode === 'two-sample') {
    const errors: string[] = [];
    if (groupA.error !== null) {
      errors.push(groupA.error);
    }
    if (groupB.error !== null) {
      errors.push(groupB.error);
    }
    if (errors.length > 0) {
      return { result: null, errors };
    }

    const nA = groupA.values.length;
    const nB = groupB.values.length;
    const meanA = mean(groupA.values);
    const meanB = mean(groupB.values);
    const varA = variance(groupA.values);
    const varB = variance(groupB.values);
    const sdA = Math.sqrt(varA);
    const sdB = Math.sqrt(varB);
    const difference = meanA - meanB;
    const pooledVariance =
      ((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2);

    let standardError: number;
    let df: number;

    if (varianceMode === 'student') {
      if (!(pooledVariance > 0) || !Number.isFinite(pooledVariance)) {
        return {
          result: null,
          errors: [
            '両方のグループで値がすべて同じため、プールした分散が0になりStudentのt検定を計算できません。異なる値を入力してください。',
          ],
        };
      }
      standardError = Math.sqrt(
        pooledVariance * (1 / nA + 1 / nB),
      );
      df = nA + nB - 2;
    } else {
      const standardErrorSquared = varA / nA + varB / nB;

      if (
        !(standardErrorSquared > 0) ||
        !Number.isFinite(standardErrorSquared)
      ) {
        return {
          result: null,
          errors: [
            '両方のグループで値がすべて同じため、標準誤差が0になりWelchのt検定を計算できません。異なる値を入力してください。',
          ],
        };
      }

      standardError = Math.sqrt(standardErrorSquared);
      const numerator = standardErrorSquared ** 2;
      const denominator =
        (varA / nA) ** 2 / (nA - 1) + (varB / nB) ** 2 / (nB - 1);

      if (!(denominator > 0) || !Number.isFinite(denominator)) {
        return {
          result: null,
          errors: [
            'Welchの自由度を計算できませんでした。グループごとのばらつきを確認してください。',
          ],
        };
      }

      df = numerator / denominator;
    }

    if (
      !(standardError > 0) ||
      !Number.isFinite(standardError) ||
      !Number.isFinite(df) ||
      df <= 0
    ) {
      return {
        result: null,
        errors: [
          '標準誤差または自由度を計算できませんでした。データの値を確認してください。',
        ],
      };
    }

    const t = difference / standardError;
    const pValue = pFromT(t, df);
    const criticalValue = inverseStudentT(0.975, df);
    const pooledSd = Math.sqrt(pooledVariance);
    const cohensD = pooledSd > 0 ? difference / pooledSd : 0;

    return finalizeResult({
      mode,
      methodLabel:
        varianceMode === 'student'
          ? '2標本t検定（Student）'
          : '2標本t検定（Welch）',
      nA,
      nB,
      meanA,
      meanB,
      sdA,
      sdB,
      referenceMean: null,
      difference,
      t,
      df,
      pValue,
      ciLower: difference - criticalValue * standardError,
      ciUpper: difference + criticalValue * standardError,
      cohensD,
    });
  }

  const errors: string[] = [];
  if (pairedA.error !== null) {
    errors.push(pairedA.error);
  }
  if (pairedB.error !== null) {
    errors.push(pairedB.error);
  }
  if (errors.length > 0) {
    return { result: null, errors };
  }

  if (pairedA.values.length !== pairedB.values.length) {
    return {
      result: null,
      errors: [
        `対応のある2組のデータは同じ件数にしてください（1回目: ${integerFormatter.format(
          pairedA.values.length,
        )}件、2回目: ${integerFormatter.format(
          pairedB.values.length,
        )}件）。`,
      ],
    };
  }

  const n = pairedA.values.length;
  const differences = pairedA.values.map(
    (value, index) => value - pairedB.values[index],
  );
  const difference = mean(differences);
  const sdDifference = standardDeviation(differences);

  if (!(sdDifference > 0) || !Number.isFinite(sdDifference)) {
    return {
      result: null,
      errors: [
        '差の値がすべて同じため、差の標準偏差が0になり対応のあるt検定を計算できません。異なる値を入力してください。',
      ],
    };
  }

  const standardError = sdDifference / Math.sqrt(n);
  const t = difference / standardError;
  const df = n - 1;
  const pValue = pFromT(t, df);
  const criticalValue = inverseStudentT(0.975, df);
  const meanA = mean(pairedA.values);
  const meanB = mean(pairedB.values);
  const sdA = standardDeviation(pairedA.values);
  const sdB = standardDeviation(pairedB.values);

  return finalizeResult({
    mode,
    methodLabel: '対応のあるt検定',
    nA: n,
    nB: null,
    meanA,
    meanB,
    sdA,
    sdB,
    referenceMean: null,
    difference,
    t,
    df,
    pValue,
    ciLower: difference - criticalValue * standardError,
    ciUpper: difference + criticalValue * standardError,
    cohensD: difference / sdDifference,
  });
}

export function TTest() {
  const [mode, setMode] = useState<TestMode>('one-sample');
  const [varianceMode, setVarianceMode] =
    useState<VarianceMode>('welch');
  const [oneInput, setOneInput] = useState(SAMPLE_ONE);
  const [oneMeanInput, setOneMeanInput] = useState(SAMPLE_ONE_MEAN);
  const [groupAInput, setGroupAInput] = useState(SAMPLE_GROUP_A);
  const [groupBInput, setGroupBInput] = useState(SAMPLE_GROUP_B);
  const [pairedAInput, setPairedAInput] = useState(SAMPLE_PAIRED_A);
  const [pairedBInput, setPairedBInput] = useState(SAMPLE_PAIRED_B);

  const oneData = parseSeries(oneInput, '1標本のデータ');
  const oneHypothesizedMean = parseHypothesizedMean(oneMeanInput);
  const groupA = parseSeries(groupAInput, 'グループAのデータ');
  const groupB = parseSeries(groupBInput, 'グループBのデータ');
  const pairedA = parseSeries(pairedAInput, '1回目のデータ');
  const pairedB = parseSeries(pairedBInput, '2回目のデータ');

  const attempt = analyzeTest(
    mode,
    varianceMode,
    oneData,
    oneHypothesizedMean,
    groupA,
    groupB,
    pairedA,
    pairedB,
  );
  const result = attempt.result;

  const modeNote =
    mode === 'one-sample'
      ? '1組のデータの平均が、指定した基準値と異なるかを検定します。'
      : mode === 'two-sample'
        ? '独立した2つのグループの平均に差があるかを検定します。'
        : '同じ対象の前後など、対応する2組の差を検定します。';

  const basicItems =
    result === null
      ? []
      : result.mode === 'one-sample'
        ? [
            {
              label: 'サンプル数 n',
              value: integerFormatter.format(result.nA),
            },
            { label: '標本平均', value: formatNumber(result.meanA) },
            { label: '標準偏差 s', value: formatNumber(result.sdA) },
            {
              label: '帰無仮説の平均 μ0',
              value:
                result.referenceMean !== null
                  ? formatNumber(result.referenceMean)
                  : '未設定',
            },
          ]
        : result.mode === 'two-sample'
          ? [
              {
                label: 'グループA n',
                value: integerFormatter.format(result.nA),
              },
              {
                label: 'グループA 平均',
                value: formatNumber(result.meanA),
              },
              {
                label: 'グループA 標準偏差',
                value: formatNumber(result.sdA),
              },
              {
                label: 'グループB n',
                value:
                  result.nB !== null
                    ? integerFormatter.format(result.nB)
                    : '未設定',
              },
              {
                label: 'グループB 平均',
                value:
                  result.meanB !== null
                    ? formatNumber(result.meanB)
                    : '未設定',
              },
              {
                label: 'グループB 標準偏差',
                value:
                  result.sdB !== null
                    ? formatNumber(result.sdB)
                    : '未設定',
              },
            ]
          : [
              {
                label: 'ペア数 n',
                value: integerFormatter.format(result.nA),
              },
              {
                label: '1回目 平均',
                value: formatNumber(result.meanA),
              },
              {
                label: '1回目 標準偏差',
                value: formatNumber(result.sdA),
              },
              {
                label: '2回目 平均',
                value:
                  result.meanB !== null
                    ? formatNumber(result.meanB)
                    : '未設定',
              },
              {
                label: '2回目 標準偏差',
                value:
                  result.sdB !== null
                    ? formatNumber(result.sdB)
                    : '未設定',
              },
            ];

  const testItems =
    result === null
      ? []
      : [
          { label: 't値', value: formatNumber(result.t) },
          { label: '自由度 df', value: formatNumber(result.df) },
          { label: '両側p値', value: formatPValue(result.pValue) },
          { label: '平均差', value: formatNumber(result.difference) },
          {
            label: '95%信頼区間',
            value: formatInterval(result.ciLower, result.ciUpper),
          },
          { label: "Cohen's d", value: formatNumber(result.cohensD) },
        ];

  const formulaLines =
    mode === 'one-sample'
      ? [
          't = (x̄ − μ0) / (s / √n)',
          '自由度 df = n − 1',
          '平均差の95%信頼区間 = (x̄ − μ0) ± t(0.975, df) × s / √n',
          "Cohen's d = (x̄ − μ0) / s",
        ]
      : mode === 'two-sample'
        ? varianceMode === 'student'
          ? [
              't = (x̄A − x̄B) / √(sp² × (1 / nA + 1 / nB))',
              'sp² = ((nA − 1)sA² + (nB − 1)sB²) / (nA + nB − 2)',
              '自由度 df = nA + nB − 2',
              '平均差の95%信頼区間 = (x̄A − x̄B) ± t(0.975, df) × √(sp² × (1 / nA + 1 / nB))',
              "Cohen's d = (x̄A − x̄B) / sp",
            ]
          : [
              't = (x̄A − x̄B) / √(sA² / nA + sB² / nB)',
              '自由度 df = (sA² / nA + sB² / nB)² / ((sA² / nA)² / (nA − 1) + (sB² / nB)² / (nB − 1))',
              '平均差の95%信頼区間 = (x̄A − x̄B) ± t(0.975, df) × √(sA² / nA + sB² / nB)',
              "Cohen's d = (x̄A − x̄B) / sp（プールした標準偏差）",
            ]
        : [
            '差 di = xi − yi（i = 1, …, n）',
            't = d̄ / (sd / √n)',
            '自由度 df = n − 1',
            '平均差の95%信頼区間 = d̄ ± t(0.975, df) × sd / √n',
            "Cohen's d = d̄ / sd",
          ];

  const assumptionLines =
    mode === 'one-sample'
      ? [
          'データが無作為に抽出され、母集団が正規分布に従うことを仮定します。',
          'サンプルサイズが小さい場合は正規性の影響が大きくなります。',
        ]
      : mode === 'two-sample'
        ? [
            '2つのグループは互いに独立であることを仮定します。',
            varianceMode === 'student'
              ? 'Studentは2群の母分散が等しいと仮定し、プールした分散を使います。'
              : 'Welchは等分散を仮定せず、Welch-Satterthwaiteの式で自由度を近似します。',
            '各群の母集団が正規分布に近いことを仮定します。',
          ]
        : [
            '同じ対象から得た対応のあるデータ（前後など）であることを仮定します。',
            '差が互いに独立で、正規分布に近いことを仮定します。',
            '2組のデータは同じ件数である必要があります。',
          ];

  const statusMessage =
    result !== null
      ? `${result.methodLabel}の結果です。平均差は${formatNumber(
          result.difference,
        )}、t値は${formatNumber(result.t)}、自由度は${formatNumber(
          result.df,
        )}、両側p値は${formatPValue(
          result.pValue,
        )}、95%信頼区間は${formatInterval(
          result.ciLower,
          result.ciUpper,
        )}、Cohen's dは${formatNumber(result.cohensD)}です。`
      : attempt.errors.length > 0
        ? attempt.errors.join(' ')
        : '有効なデータを入力するとt検定の結果を表示します。';

  const loadSample = () => {
    if (mode === 'one-sample') {
      setOneInput(SAMPLE_ONE);
      setOneMeanInput(SAMPLE_ONE_MEAN);
      return;
    }
    if (mode === 'two-sample') {
      setGroupAInput(SAMPLE_GROUP_A);
      setGroupBInput(SAMPLE_GROUP_B);
      return;
    }
    setPairedAInput(SAMPLE_PAIRED_A);
    setPairedBInput(SAMPLE_PAIRED_B);
  };

  const resetForm = () => {
    setOneInput('');
    setOneMeanInput('');
    setGroupAInput('');
    setGroupBInput('');
    setPairedAInput('');
    setPairedBInput('');
    setVarianceMode('welch');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]"
      aria-label="t検定"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="t-test-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2 id="t-test-form-heading" className="font-editorial mt-1 text-xl">
              データと検定方法を入力
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
          カンマ、スペース、改行のいずれかで区切って数値を入力してください。検定の種類を選ぶと入力欄と結果が切り替わり、入力内容は自動で反映されます。
        </p>

        <fieldset className="mt-5 min-w-0">
          <legend className="text-sm font-bold text-[var(--ink)]">
            検定の種類
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map((option) => {
              const isSelected = mode === option.value;
              return (
                <label
                  key={option.value}
                  className={`paper-chip flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center rounded-sm px-1.5 py-2.5 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="test-mode"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setMode(option.value)}
                    className="sr-only"
                  />
                  <span className="text-[11px] font-bold">{option.label}</span>
                  <span className="mt-0.5 text-[9px] font-normal opacity-80">
                    {option.note}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            {modeNote}
          </p>
        </fieldset>

        {mode === 'one-sample' && (
          <>
            <div className="mt-5 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="t-test-one-data"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  1標本のデータ
                </label>
                <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
                  2件以上
                </span>
              </div>
              <textarea
                id="t-test-one-data"
                name="oneSampleData"
                rows={7}
                value={oneInput}
                onChange={(event) => setOneInput(event.target.value)}
                placeholder="例: 168, 172, 165, 175, 170, 169, 174, 171"
                spellCheck={false}
                aria-invalid={attempt.errors.length > 0}
                aria-describedby={
                  attempt.errors.length > 0
                    ? 't-test-one-data-help t-test-error'
                    : 't-test-one-data-help'
                }
                className="field-paper mt-2 min-h-40 w-full min-w-0 rounded-sm px-3 py-3 text-base leading-7 tabular-nums"
              />
              <p
                id="t-test-one-data-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                平均を比較したい1組の数値を入力します。小数や負の数にも対応しています。
              </p>
            </div>

            <div className="mt-4 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="t-test-one-mean"
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  帰無仮説の平均 <span className="text-xs font-normal">μ0</span>
                </label>
                <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
                  数値
                </span>
              </div>
              <input
                id="t-test-one-mean"
                name="hypothesizedMean"
                type="number"
                inputMode="decimal"
                step="any"
                value={oneMeanInput}
                onChange={(event) => setOneMeanInput(event.target.value)}
                placeholder="例: 170"
                aria-invalid={attempt.errors.length > 0}
                aria-describedby={
                  attempt.errors.length > 0
                    ? 't-test-one-mean-help t-test-error'
                    : 't-test-one-mean-help'
                }
                className="field-paper mt-2 w-full rounded-sm px-3 py-3 text-base tabular-nums"
              />
              <p
                id="t-test-one-mean-help"
                className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
              >
                標本平均と比較する基準値（母平均）を入力します。
              </p>
            </div>
          </>
        )}

        {mode === 'two-sample' && (
          <>
            <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="t-test-two-a"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    グループAのデータ
                  </label>
                  <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
                    2件以上
                  </span>
                </div>
                <textarea
                  id="t-test-two-a"
                  name="groupAData"
                  rows={7}
                  value={groupAInput}
                  onChange={(event) => setGroupAInput(event.target.value)}
                  placeholder="例: 72, 68, 75, 70, 74, 71, 73, 69"
                  spellCheck={false}
                  aria-invalid={attempt.errors.length > 0}
                  aria-describedby={
                    attempt.errors.length > 0
                      ? 't-test-two-a-help t-test-error'
                      : 't-test-two-a-help'
                  }
                  className="field-paper mt-2 min-h-40 w-full min-w-0 rounded-sm px-3 py-3 text-base leading-7 tabular-nums"
                />
                <p
                  id="t-test-two-a-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  比較元のグループの数値を入力します。
                </p>
              </div>

              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="t-test-two-b"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    グループBのデータ
                  </label>
                  <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
                    2件以上
                  </span>
                </div>
                <textarea
                  id="t-test-two-b"
                  name="groupBData"
                  rows={7}
                  value={groupBInput}
                  onChange={(event) => setGroupBInput(event.target.value)}
                  placeholder="例: 65, 62, 68, 64, 66, 63, 67, 61"
                  spellCheck={false}
                  aria-invalid={attempt.errors.length > 0}
                  aria-describedby={
                    attempt.errors.length > 0
                      ? 't-test-two-b-help t-test-error'
                      : 't-test-two-b-help'
                  }
                  className="field-paper mt-2 min-h-40 w-full min-w-0 rounded-sm px-3 py-3 text-base leading-7 tabular-nums"
                />
                <p
                  id="t-test-two-b-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  比較対象のグループの数値を入力します。
                </p>
              </div>
            </div>

            <fieldset className="mt-5 min-w-0">
              <legend className="text-sm font-bold text-[var(--ink)]">
                分散の扱い
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {VARIANCE_OPTIONS.map((option) => {
                  const isSelected = varianceMode === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`paper-chip flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center rounded-sm px-2 py-2.5 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                        isSelected ? 'paper-chip-active' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="variance-mode"
                        value={option.value}
                        checked={isSelected}
                        onChange={() => setVarianceMode(option.value)}
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
              <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                {varianceMode === 'student'
                  ? 'Studentは2群の母分散が等しいと仮定し、プールした分散で標準誤差を計算します。'
                  : 'Welchは等分散を仮定せず、群ごとの分散とWelch-Satterthwaiteの自由度を使います。'}
              </p>
            </fieldset>
          </>
        )}

        {mode === 'paired' && (
          <>
            <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="t-test-paired-a"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    1回目のデータ
                  </label>
                  <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
                    2件以上
                  </span>
                </div>
                <textarea
                  id="t-test-paired-a"
                  name="pairedFirstData"
                  rows={7}
                  value={pairedAInput}
                  onChange={(event) => setPairedAInput(event.target.value)}
                  placeholder="例: 82, 76, 88, 79, 85, 80, 84, 78"
                  spellCheck={false}
                  aria-invalid={attempt.errors.length > 0}
                  aria-describedby={
                    attempt.errors.length > 0
                      ? 't-test-paired-a-help t-test-error'
                      : 't-test-paired-a-help'
                  }
                  className="field-paper mt-2 min-h-40 w-full min-w-0 rounded-sm px-3 py-3 text-base leading-7 tabular-nums"
                />
                <p
                  id="t-test-paired-a-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  変化の前など、1回目の数値を入力します。
                </p>
              </div>

              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="t-test-paired-b"
                    className="text-sm font-bold text-[var(--ink)]"
                  >
                    2回目のデータ
                  </label>
                  <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
                    1回目と同じ件数
                  </span>
                </div>
                <textarea
                  id="t-test-paired-b"
                  name="pairedSecondData"
                  rows={7}
                  value={pairedBInput}
                  onChange={(event) => setPairedBInput(event.target.value)}
                  placeholder="例: 78, 73, 83, 75, 80, 76, 81, 74"
                  spellCheck={false}
                  aria-invalid={attempt.errors.length > 0}
                  aria-describedby={
                    attempt.errors.length > 0
                      ? 't-test-paired-b-help t-test-error'
                      : 't-test-paired-b-help'
                  }
                  className="field-paper mt-2 min-h-40 w-full min-w-0 rounded-sm px-3 py-3 text-base leading-7 tabular-nums"
                />
                <p
                  id="t-test-paired-b-help"
                  className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
                >
                  変化の後など、1回目と対応する数値を同じ順番で入力します。
                </p>
              </div>
            </div>
          </>
        )}

        {attempt.errors.length > 0 && (
          <div
            id="t-test-error"
            role="alert"
            className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              入力内容を確認してください
            </p>
            <ul className="mt-1 space-y-1 text-[11px] leading-5 text-[var(--ink)]">
              {attempt.errors.map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}

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
        aria-labelledby="t-test-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="t-test-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              検定結果
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

        {result !== null ? (
          <div className="mt-4 space-y-3">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    t statistic
                  </p>
                  <p className="font-editorial mt-1 break-words text-4xl leading-none tabular-nums">
                    {formatNumber(result.t)}
                  </p>
                  <p className="mt-3 inline-block border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-xs font-bold tabular-nums">
                    両側 p = {formatPValue(result.pValue)}
                  </p>
                </div>
                <p className="font-label max-w-[45%] shrink-0 break-words text-right text-[9px] leading-4 text-[var(--ink-soft)]">
                  {result.methodLabel}
                </p>
              </div>
              <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    平均差
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatNumber(result.difference)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">
                    95%信頼区間
                  </p>
                  <p className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                    {formatInterval(result.ciLower, result.ciUpper)}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                基本統計
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                {basicItems.map((item) => (
                  <div key={item.label} className="min-w-0">
                    <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                検定結果の詳細
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                {testItems.map((item) => (
                  <div key={item.label} className="min-w-0">
                    <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 break-words text-sm font-bold tabular-nums">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="text-sm leading-6 text-[var(--ink-soft)]">
              {attempt.errors.length > 0
                ? '入力内容を確認すると検定結果を表示します。'
                : '有効なデータを入力すると、平均・標準偏差・t値・自由度・p値・95%信頼区間・効果量を表示します。'}
            </p>
          </div>
        )}

        <div
          role="note"
          className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            {mode === 'one-sample'
              ? '1標本t検定の計算式と前提'
              : mode === 'two-sample'
                ? `2標本t検定（${varianceMode === 'student' ? 'Student' : 'Welch'}）の計算式と前提`
                : '対応のあるt検定の計算式と前提'}
          </p>
          <div className="mt-2 space-y-1 text-[11px] leading-6 text-[var(--ink)]">
            {formulaLines.map((line) => (
              <p key={line} className="break-words">
                {line}
              </p>
            ))}
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-6 text-[var(--ink)]">
            {assumptionLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
             p値は両側検定の値です。結果は統計的な目安であり、因果関係や実務上の重要性を単独で示すものではありません。
          </p>
        </div>
      </section>
    </section>
  );
}
