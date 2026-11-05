'use client';

import { useState } from 'react';

type Sex = 'male' | 'female' | 'unspecified';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'unspecified', label: '未指定' },
];

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: 'ほぼ運動しない', multiplier: 1.2 },
  { id: 'light', label: '軽い運動（週1〜3回）', multiplier: 1.375 },
  { id: 'moderate', label: '中等度の運動（週3〜5回）', multiplier: 1.55 },
  { id: 'active', label: '活発な運動（週6〜7回）', multiplier: 1.725 },
  { id: 'veryActive', label: '非常に活発（毎日高強度）', multiplier: 1.9 },
] as const;

type ActivityLevel = (typeof ACTIVITY_OPTIONS)[number]['id'];

type FieldResult = {
  value: number | null;
  error: string | null;
};

type BmiCategory = {
  label: string;
  range: string;
};

const numberFormatter = new Intl.NumberFormat('ja-JP');

function formatInteger(value: number): string {
  return numberFormatter.format(Math.round(value));
}

function validateRange(
  rawValue: string,
  label: string,
  min: number,
  max: number,
  unit: string,
): FieldResult {
  const value = rawValue.trim();
  if (value === '') {
    return { value: null, error: `${label}を入力してください。` };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { value: null, error: `${label}は数値で入力してください。` };
  }

  if (parsed < min || parsed > max) {
    return {
      value: null,
      error: `${label}は${min}〜${max}${unit}の範囲で入力してください。`,
    };
  }

  return { value: parsed, error: null };
}

function validateAge(rawValue: string): FieldResult {
  const value = rawValue.trim();
  if (value === '') {
    return { value: null, error: null };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { value: null, error: '年齢は数値で入力してください。' };
  }

  if (!Number.isInteger(parsed)) {
    return { value: null, error: '年齢は整数で入力してください。' };
  }

  if (parsed < 18 || parsed > 120) {
    return {
      value: null,
      error: '年齢は18〜120歳の範囲で入力してください。',
    };
  }

  return { value: parsed, error: null };
}

function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) {
    return { label: '低体重', range: 'BMI 18.5未満' };
  }
  if (bmi < 25) {
    return { label: '普通', range: 'BMI 18.5〜24.9' };
  }
  if (bmi < 30) {
    return { label: '肥満1', range: 'BMI 25.0〜29.9' };
  }
  if (bmi < 35) {
    return { label: '肥満2', range: 'BMI 30.0〜34.9' };
  }
  if (bmi < 40) {
    return { label: '肥満3', range: 'BMI 35.0〜39.9' };
  }
  return { label: '肥満4', range: 'BMI 40.0以上' };
}

function getBmrHint(
  sex: Sex,
  ageYears: number | null,
  heightCm: number | null,
  weightKg: number | null,
): string {
  if (heightCm === null || weightKg === null) {
    return '有効な身長と体重を入力すると表示されます。';
  }
  if (sex === 'unspecified') {
    return ageYears === null
      ? '性別（男性・女性）と年齢を入力すると表示されます。'
      : '性別（男性・女性）を選ぶと表示されます。';
  }
  if (ageYears === null) {
    return '年齢（18〜120歳）を入力すると表示されます。';
  }
  return '基礎代謝量を計算できませんでした。';
}

export function BmiCalculator() {
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('65');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('unspecified');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');

  const heightField = validateRange(height, '身長', 100, 250, 'cm');
  const weightField = validateRange(weight, '体重', 20, 300, 'kg');
  const ageField = validateAge(age);

  const heightCm = heightField.value;
  const weightKg = weightField.value;
  const ageYears = ageField.value;

  const bmi =
    heightCm !== null && weightKg !== null
      ? weightKg / (heightCm / 100) ** 2
      : null;
  const bmiRounded = bmi !== null ? Math.round(bmi * 10) / 10 : null;
  const bmiDisplay = bmiRounded !== null ? bmiRounded.toFixed(1) : null;
  const bmiCategory =
    bmiRounded !== null ? getBmiCategory(bmiRounded) : null;

  const standardWeight =
    heightCm !== null
      ? {
          min: 18.5 * (heightCm / 100) ** 2,
          max: 24.9 * (heightCm / 100) ** 2,
        }
      : null;

  const bmr =
    heightCm !== null &&
    weightKg !== null &&
    ageYears !== null &&
    sex !== 'unspecified'
      ? 10 * weightKg +
        6.25 * heightCm -
        5 * ageYears +
        (sex === 'male' ? 5 : -161)
      : null;

  const selectedActivity =
    ACTIVITY_OPTIONS.find((option) => option.id === activity) ??
    ACTIVITY_OPTIONS[2];
  const dailyCalories =
    bmr !== null ? bmr * selectedActivity.multiplier : null;
  const bmrHint = getBmrHint(sex, ageYears, heightCm, weightKg);

  const statusMessage =
    bmiDisplay !== null && bmiCategory !== null
      ? `BMIは${bmiDisplay}、カテゴリは${bmiCategory.label}です。${
          bmr !== null
            ? `基礎代謝量は約${formatInteger(bmr)}キロカロリーです。`
            : bmrHint
        }`
      : '有効な身長と体重を入力するとBMIを表示します。';

  const resetForm = () => {
    setHeight('170');
    setWeight('65');
    setAge('');
    setSex('unspecified');
    setActivity('moderate');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
      aria-label="BMI・健康計算"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="bmi-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Input</p>
            <h2 id="bmi-form-heading" className="font-editorial mt-1 text-xl">
              身体情報を入力
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
          身長と体重は必須です。年齢と性別を入力すると、基礎代謝量と推定消費カロリーも計算します。入力内容は自動で反映されます。
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="bmi-height"
                className="text-sm font-bold text-[var(--ink)]"
              >
                身長 <span className="text-xs font-normal">cm</span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                100–250
              </span>
            </div>
            <input
              id="bmi-height"
              name="height"
              type="number"
              inputMode="decimal"
              min={100}
              max={250}
              step="0.1"
              value={height}
              onChange={(event) => setHeight(event.target.value)}
              placeholder="例: 170"
              aria-invalid={heightField.error !== null}
              aria-describedby={
                heightField.error ? 'bmi-height-error' : undefined
              }
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {heightField.error && (
              <p
                id="bmi-height-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {heightField.error}
              </p>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="bmi-weight"
                className="text-sm font-bold text-[var(--ink)]"
              >
                体重 <span className="text-xs font-normal">kg</span>
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                20–300
              </span>
            </div>
            <input
              id="bmi-weight"
              name="weight"
              type="number"
              inputMode="decimal"
              min={20}
              max={300}
              step="0.1"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="例: 65"
              aria-invalid={weightField.error !== null}
              aria-describedby={
                weightField.error ? 'bmi-weight-error' : undefined
              }
              className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
            />
            {weightField.error && (
              <p
                id="bmi-weight-error"
                role="alert"
                className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
              >
                {weightField.error}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="bmi-age"
              className="text-sm font-bold text-[var(--ink)]"
            >
              年齢 <span className="text-xs font-normal">歳（任意）</span>
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              18–120
            </span>
          </div>
          <input
            id="bmi-age"
            name="age"
            type="number"
            inputMode="numeric"
            min={18}
            max={120}
            step="1"
            value={age}
            onChange={(event) => setAge(event.target.value)}
            placeholder="未入力でも計算できます"
            aria-invalid={ageField.error !== null}
            aria-describedby={ageField.error ? 'bmi-age-error' : 'bmi-age-help'}
            className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
          />
          {ageField.error ? (
            <p
              id="bmi-age-error"
              role="alert"
              className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
            >
              {ageField.error}
            </p>
          ) : (
            <p
              id="bmi-age-help"
              className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
            >
              空欄の場合はBMIと標準体重のみ表示します。基礎代謝は18歳以上が対象です。
            </p>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[var(--ink)]">
            性別{' '}
            <span className="text-xs font-normal">
              （基礎代謝の計算に使用・任意）
            </span>
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SEX_OPTIONS.map((option) => {
              const isSelected = sex === option.value;
              return (
                <label
                  key={option.value}
                  className={`paper-chip flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-sm px-2 py-2.5 text-center text-xs font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    isSelected ? 'paper-chip-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="sex"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setSex(option.value)}
                    className="sr-only"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5">
          <label
            htmlFor="bmi-activity"
            className="text-sm font-bold text-[var(--ink)]"
          >
            活動量
          </label>
          <select
            id="bmi-activity"
            name="activity"
            value={activity}
            onChange={(event) =>
              setActivity(event.target.value as ActivityLevel)
            }
            aria-describedby="bmi-activity-help"
            className="field-paper mt-2 rounded-sm px-3 py-3 text-base"
          >
            {ACTIVITY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}（×{option.multiplier}）
              </option>
            ))}
          </select>
          <p
            id="bmi-activity-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            推定消費カロリーは、基礎代謝量に活動量の係数を掛けた目安です。
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
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
        aria-labelledby="bmi-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="bmi-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              計算結果
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            02 / 02
          </span>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>

        <div className="mt-4 space-y-3">
          <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  BMI
                </p>
                {bmiDisplay !== null && bmiCategory !== null ? (
                  <>
                    <p className="font-editorial mt-1 text-4xl leading-none tabular-nums">
                      {bmiDisplay}
                    </p>
                    <p className="mt-3 inline-block border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2.5 py-1 text-xs font-bold">
                      {bmiCategory.label}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                    有効な身長と体重を入力してください。
                  </p>
                )}
              </div>
              <p className="font-label shrink-0 text-right text-[9px] text-[var(--ink-soft)]">
                Body Mass
                <br />
                Index
              </p>
            </div>
            {bmiCategory && (
              <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                日本肥満学会の基準：{bmiCategory.range}
              </p>
            )}
          </div>

          <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="font-label text-[9px] text-[var(--ink-soft)]">
              標準体重の目安
            </p>
            {standardWeight !== null ? (
              <>
                <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                  {standardWeight.min.toFixed(1)}〜
                  {standardWeight.max.toFixed(1)}{' '}
                  <span className="text-sm">kg</span>
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                  身長 {heightCm} cm でBMI 18.5〜24.9に相当する体重です。
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                身長を入力すると標準体重の範囲を表示します。
              </p>
            )}
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                基礎代謝量（目安）
              </p>
              {bmr !== null ? (
                <>
                  <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                    約 {formatInteger(bmr)}{' '}
                    <span className="text-sm">kcal/日</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    Mifflin-St Jeor式で算出
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  {bmrHint}
                </p>
              )}
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                推定消費カロリー
              </p>
              {dailyCalories !== null ? (
                <>
                  <p className="font-editorial mt-1 text-2xl leading-tight tabular-nums">
                    約 {formatInteger(dailyCalories)}{' '}
                    <span className="text-sm">kcal/日</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    {selectedActivity.label}（×{selectedActivity.multiplier}）
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  基礎代謝量が計算できると表示されます。
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          BMIの計算式：体重kg ÷（身長m）²。表示は小数第1位までの目安です。
        </p>

        <div
          role="note"
          className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            医療上のアドバイスではありません
          </p>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            このツールの結果は一般的な計算式による目安です。BMIは筋肉量・体脂肪率・年齢・妊娠などの影響を反映しません。健康状態の判断や食事・運動の計画は、医師・管理栄養士などの専門家にご相談ください。
          </p>
        </div>
      </section>
    </section>
  );
}
