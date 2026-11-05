'use client';

import { useState } from 'react';
import {
  chiSquareCdf,
  parseDelimitedTable,
  pFromChiSquare,
} from '@/lib/statsCore';

const EXAMPLE_CSV = `time,event,group
5,1,A
6,1,A
8,0,A
9,1,A
12,1,A
14,0,A
17,1,A
20,1,A
23,0,A
28,1,A
4,1,B
7,1,B
10,1,B
11,0,B
13,1,B
16,1,B
18,1,B
22,0,B
25,1,B
30,0,B`;

const MAX_GROUPS = 4;
const DEFAULT_GROUP = '全体';
const GROUP_COLORS = ['var(--accent)', 'var(--teal)', 'var(--gold)', '#5966b3'];
const CHART_WIDTH = 360;
const CHART_HEIGHT = 260;
const CHART_LEFT = 44;
const CHART_RIGHT = 12;
const CHART_TOP = 16;
const CHART_BOTTOM = 36;

const integerFormatter = new Intl.NumberFormat('ja-JP');
const timeFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 3,
});
const percentFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const fixedThreeFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const fixedFourFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

type SurvivalEvent = 0 | 1;

type SurvivalRecord = {
  time: number;
  event: SurvivalEvent;
  groupName: string;
};

type ParseResult = {
  records: SurvivalRecord[] | null;
  groupNames: string[];
  errors: string[];
};

type SurvivalPoint = {
  time: number;
  survival: number;
  atRisk: number;
  events: number;
  censored: number;
};

type GroupCurve = {
  name: string;
  color: string;
  points: SurvivalPoint[];
  times: number[];
  n: number;
  events: number;
  censored: number;
  median: number | null;
  finalSurvival: number;
  maxTime: number;
};

type LogRankResult = {
  statistic: number;
  pValue: number;
  observed: number;
  expected: number;
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/^\uFEFF/, '');
}

function parseSurvivalData(raw: string): ParseResult {
  const table = parseDelimitedTable(raw.replace(/^\uFEFF/, ''));
  const errors = [...table.errors];

  if (table.headers.length === 0) {
    return { records: null, groupNames: [], errors };
  }

  const headers = table.headers.map(normalizeHeader);
  const timeIndex = headers.indexOf('time');
  const eventIndex = headers.indexOf('event');
  const groupIndex = headers.indexOf('group');

  if (headers.length < 2 || headers.length > 3) {
    errors.push(
      '列数はtimeとeventの2列、またはtime・event・groupの3列にしてください。',
    );
  }
  if (timeIndex === -1) {
    errors.push('ヘッダーにtime列を追加してください。');
  }
  if (eventIndex === -1) {
    errors.push('ヘッダーにevent列を追加してください。');
  }
  if (headers.length === 3 && groupIndex === -1) {
    errors.push(
      '3列目をグループにする場合は、ヘッダーをgroupにしてください。',
    );
  }
  if (new Set(headers).size !== headers.length) {
    errors.push(
      'ヘッダーの列名が重複しています。time・event・groupを1列ずつ用意してください。',
    );
  }
  if (errors.length > 0) {
    return { records: null, groupNames: [], errors };
  }
  if (table.rows.length === 0) {
    errors.push('ヘッダーの下にデータ行を入力してください。');
    return { records: null, groupNames: [], errors };
  }

  const records: SurvivalRecord[] = [];
  const groupNames: string[] = [];
  let groupLimitReported = false;

  table.rows.forEach((row, rowIndex) => {
    if (row.length !== headers.length) {
      return;
    }

    const lineNumber = rowIndex + 2;
    const timeToken = row[timeIndex].trim();
    const timeValue = Number(timeToken);

    if (timeToken === '' || !Number.isFinite(timeValue) || timeValue <= 0) {
      errors.push(
        `${lineNumber}行目のtime「${
          timeToken === '' ? '空欄' : timeToken
        }」は正の数値で入力してください。`,
      );
      return;
    }

    const eventToken = row[eventIndex].trim();
    const eventValue = Number(eventToken);

    if (
      eventToken === '' ||
      !Number.isFinite(eventValue) ||
      (eventValue !== 0 && eventValue !== 1)
    ) {
      errors.push(
        `${lineNumber}行目のevent「${
          eventToken === '' ? '空欄' : eventToken
        }」は1（イベント）または0（打ち切り）で入力してください。`,
      );
      return;
    }

    let groupName = DEFAULT_GROUP;

    if (groupIndex >= 0) {
      const groupToken = row[groupIndex].trim();
      if (groupToken === '') {
        errors.push(
          `${lineNumber}行目のgroupが空欄です。グループ名を入力するか、group列を削除してください。`,
        );
        return;
      }
      groupName = groupToken;
    }

    if (!groupNames.includes(groupName)) {
      if (groupNames.length >= MAX_GROUPS) {
        if (!groupLimitReported) {
          errors.push(
            `グループは最大${MAX_GROUPS}つまでです。group列の値を確認してください。`,
          );
          groupLimitReported = true;
        }
        return;
      }
      groupNames.push(groupName);
    }

    records.push({
      time: timeValue,
      event: eventValue === 1 ? 1 : 0,
      groupName,
    });
  });

  if (records.length === 0 && errors.length === 0) {
    errors.push(
      '有効なデータ行がありません。timeとeventの値を確認してください。',
    );
  }

  if (errors.length > 0) {
    return { records: null, groupNames: [], errors };
  }

  return { records, groupNames, errors };
}

function buildCurve(
  name: string,
  color: string,
  records: SurvivalRecord[],
): GroupCurve {
  const ordered = [...records].sort((a, b) => a.time - b.time);
  const eventTimes = Array.from(
    new Set(
      ordered
        .filter((record) => record.event === 1)
        .map((record) => record.time),
    ),
  ).sort((a, b) => a - b);
  const points: SurvivalPoint[] = [
    { time: 0, survival: 1, atRisk: ordered.length, events: 0, censored: 0 },
  ];
  let survival = 1;

  eventTimes.forEach((time) => {
    const atRisk = ordered.filter((record) => record.time >= time).length;
    const events = ordered.filter(
      (record) => record.time === time && record.event === 1,
    ).length;
    const censored = ordered.filter(
      (record) => record.time === time && record.event === 0,
    ).length;

    if (atRisk > 0 && events > 0) {
      survival *= 1 - events / atRisk;
    }

    points.push({
      time,
      survival: Math.max(0, Math.min(1, survival)),
      atRisk,
      events,
      censored,
    });
  });

  const medianPoint = points.find(
    (point) => point.time > 0 && point.survival <= 0.5,
  );
  const maxTime = ordered.length > 0 ? ordered[ordered.length - 1].time : 0;
  const lastPoint = points[points.length - 1];

  return {
    name,
    color,
    points,
    times: ordered.map((record) => record.time),
    n: ordered.length,
    events: ordered.filter((record) => record.event === 1).length,
    censored: ordered.filter((record) => record.event === 0).length,
    median: medianPoint ? medianPoint.time : null,
    finalSurvival: lastPoint ? lastPoint.survival : 1,
    maxTime,
  };
}

function chiSquareUpperTail(statistic: number): number {
  const cdf = chiSquareCdf(statistic, 1);
  if (Number.isFinite(cdf)) {
    return Math.max(0, Math.min(1, 1 - cdf));
  }
  const fallback = pFromChiSquare(statistic, 1);
  return Number.isFinite(fallback)
    ? Math.max(0, Math.min(1, fallback))
    : Number.NaN;
}

function computeLogRank(
  first: SurvivalRecord[],
  second: SurvivalRecord[],
): LogRankResult | null {
  const eventTimes = Array.from(
    new Set(
      [...first, ...second]
        .filter((record) => record.event === 1)
        .map((record) => record.time),
    ),
  ).sort((a, b) => a - b);

  let observedMinusExpected = 0;
  let varianceSum = 0;
  let observed = 0;
  let expected = 0;

  eventTimes.forEach((time) => {
    const firstAtRisk = first.filter((record) => record.time >= time).length;
    const secondAtRisk = second.filter(
      (record) => record.time >= time,
    ).length;
    const firstEvents = first.filter(
      (record) => record.time === time && record.event === 1,
    ).length;
    const secondEvents = second.filter(
      (record) => record.time === time && record.event === 1,
    ).length;
    const atRisk = firstAtRisk + secondAtRisk;
    const events = firstEvents + secondEvents;

    if (atRisk <= 1 || events === 0) {
      return;
    }

    const expectedFirst = (events * firstAtRisk) / atRisk;
    const variance =
      (firstAtRisk * secondAtRisk * events * (atRisk - events)) /
      (atRisk * atRisk * (atRisk - 1));

    observedMinusExpected += firstEvents - expectedFirst;
    varianceSum += variance;
    observed += firstEvents;
    expected += expectedFirst;
  });

  if (!Number.isFinite(varianceSum) || varianceSum <= 0) {
    return null;
  }

  const statistic = (observedMinusExpected ** 2) / varianceSum;
  const pValue = chiSquareUpperTail(statistic);

  if (!Number.isFinite(statistic) || !Number.isFinite(pValue)) {
    return null;
  }

  return { statistic, pValue, observed, expected };
}

function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

function formatTime(value: number): string {
  return timeFormatter.format(value);
}

function formatFixed(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return fixedThreeFormatter.format(value);
}

function formatPValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  if (value < 0.0001) {
    return '< 0.0001';
  }
  return fixedFourFormatter.format(value);
}

function chartX(value: number, maxTime: number): number {
  const width = CHART_WIDTH - CHART_LEFT - CHART_RIGHT;
  const safeMax = maxTime > 0 ? maxTime : 1;
  return CHART_LEFT + (value / safeMax) * width;
}

function chartY(value: number): number {
  const height = CHART_HEIGHT - CHART_TOP - CHART_BOTTOM;
  return CHART_TOP + (1 - value) * height;
}

function buildStepPath(points: SurvivalPoint[], maxTime: number): string {
  const first = points[0] ?? { time: 0, survival: 1 };
  let path = `M ${chartX(first.time, maxTime)} ${chartY(first.survival)}`;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    path += ` H ${chartX(point.time, maxTime)} V ${chartY(
      point.survival,
    )}`;
  }

  path += ` H ${chartX(maxTime, maxTime)}`;
  return path;
}

function buildRiskTimes(curves: GroupCurve[], maxTime: number): number[] {
  const eventTimes = Array.from(
    new Set(
      curves.flatMap((curve) =>
        curve.points.slice(1).map((point) => point.time),
      ),
    ),
  ).sort((a, b) => a - b);
  const candidates = Array.from(new Set([0, ...eventTimes, maxTime])).sort(
    (a, b) => a - b,
  );

  if (candidates.length <= 5) {
    return candidates;
  }

  const selected = [0];
  const stepCount = 3;

  for (let index = 1; index <= stepCount; index += 1) {
    const position = Math.round(
      ((eventTimes.length - 1) * index) / (stepCount + 1),
    );
    selected.push(eventTimes[position]);
  }

  selected.push(maxTime);
  return Array.from(new Set(selected)).sort((a, b) => a - b);
}

export function SurvivalAnalysis() {
  const [csvInput, setCsvInput] = useState(EXAMPLE_CSV);
  const parsed = parseSurvivalData(csvInput);
  const records = parsed.records;
  const groupNames = parsed.groupNames;
  const curves =
    records !== null && groupNames.length > 0
      ? groupNames.map((groupName, index) =>
          buildCurve(
            groupName,
            GROUP_COLORS[index % GROUP_COLORS.length],
            records.filter((record) => record.groupName === groupName),
          ),
        )
      : [];
  const maxTime =
    records !== null
      ? records.reduce(
          (maximum, record) => Math.max(maximum, record.time),
          0,
        )
      : 0;
  const logRank =
    records !== null && groupNames.length === 2
      ? computeLogRank(
          records.filter((record) => record.groupName === groupNames[0]),
          records.filter((record) => record.groupName === groupNames[1]),
        )
      : null;
  const riskTimes = curves.length > 0 ? buildRiskTimes(curves, maxTime) : [];
  const totalEvents = curves.reduce(
    (total, curve) => total + curve.events,
    0,
  );
  const totalCensored = curves.reduce(
    (total, curve) => total + curve.censored,
    0,
  );
  const totalRecords = records?.length ?? 0;
  const logRankStatus =
    groupNames.length === 2
      ? logRank !== null
        ? `ログランク検定のp値は${formatPValue(logRank.pValue)}です。`
        : 'ログランク検定はイベントまたはリスク人数が不足しているため計算できません。'
      : groupNames.length > 2
        ? 'ログランク検定は2群の場合にのみ計算します。'
        : '';
  const statusMessage =
    parsed.errors.length > 0
      ? `入力エラーが${formatInteger(
          parsed.errors.length,
        )}件あります。${parsed.errors[0]}`
      : curves.length > 0
        ? `Kaplan-Meier推定が完了しました。グループ数は${formatInteger(
            groupNames.length,
          )}、データ数は${formatInteger(
            totalRecords,
          )}、イベント数は${formatInteger(
            totalEvents,
          )}、打ち切り数は${formatInteger(totalCensored)}です。${logRankStatus}`
        : 'CSVを入力するとKaplan-Meier生存曲線とグループ概要を表示します。';

  const loadExample = () => {
    setCsvInput(EXAMPLE_CSV);
  };

  const resetForm = () => {
    setCsvInput('');
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      aria-label="生存分析（Kaplan-Meier）"
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="survival-form-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Input</p>
            <h2
              id="survival-form-heading"
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
          1行目をヘッダーにして、time（正の数値）、event（1または0）、必要に応じてgroup（最大4グループ）の列を用意します。カンマ、タブ、セミコロンで区切れます。
        </p>

        <div className="mt-5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="survival-csv"
              className="text-sm font-bold text-[var(--ink)]"
            >
              CSVデータ
            </label>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {records !== null
                ? `${formatInteger(groupNames.length)}群 / ${formatInteger(
                    totalRecords,
                  )}行`
                : '要確認'}
            </span>
          </div>
          <textarea
            id="survival-csv"
            name="csv"
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            rows={12}
            placeholder={
              'time,event,group\n12,1,A\n8,0,A\n15,1,B\n10,0,B'
            }
            spellCheck={false}
            aria-invalid={parsed.errors.length > 0}
            aria-describedby={
              parsed.errors.length > 0
                ? 'survival-csv-help survival-csv-error'
                : 'survival-csv-help'
            }
            className="field-paper mt-2 h-64 w-full resize-y rounded-sm px-3 py-3 text-sm leading-6 tabular-nums"
          />
          <p
            id="survival-csv-help"
            className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]"
          >
            eventは1がイベント発生、0が打ち切りです。timeは0より大きい数値を入力してください。空行は無視されます。
          </p>
          {parsed.errors.length > 0 && (
            <div
              id="survival-csv-error"
              role="alert"
              className="mt-2 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                入力内容を確認してください
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-5 text-[var(--ink)]">
                {parsed.errors.map((error, index) => (
                  <li key={`${error}-${index}`} className="break-words">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
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
        aria-labelledby="survival-result-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Result</p>
            <h2
              id="survival-result-heading"
              className="font-editorial mt-1 text-xl"
            >
              グループ概要と検定
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

        {curves.length > 0 ? (
          <div className="mt-4 min-w-0 space-y-4">
            <dl className="grid grid-cols-3 gap-2">
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[8px] leading-4 text-[var(--ink-soft)]">
                  データ数
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatInteger(totalRecords)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[8px] leading-4 text-[var(--ink-soft)]">
                  イベント
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatInteger(totalEvents)}
                </dd>
              </div>
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3">
                <dt className="font-label text-[8px] leading-4 text-[var(--ink-soft)]">
                  打ち切り
                </dt>
                <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                  {formatInteger(totalCensored)}
                </dd>
              </div>
            </dl>

            {groupNames.length === 2 && (
              <div
                className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4"
                aria-labelledby="survival-logrank-heading"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3
                    id="survival-logrank-heading"
                    className="font-label text-[9px] text-[var(--ink-soft)]"
                  >
                    Log-rank test
                  </h3>
                  <p className="text-[10px] text-[var(--ink-soft)]">
                    2群比較
                  </p>
                </div>
                {logRank !== null ? (
                  <>
                    <dl className="mt-2 grid grid-cols-2 gap-2">
                      <div className="min-w-0">
                        <dt className="font-label text-[8px] text-[var(--ink-soft)]">
                          χ²(1)
                        </dt>
                        <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                          {formatFixed(logRank.statistic)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-label text-[8px] text-[var(--ink-soft)]">
                          p値
                        </dt>
                        <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums">
                          {formatPValue(logRank.pValue)}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                      観測イベント数 {formatInteger(logRank.observed)}
                      、期待イベント数 {formatFixed(logRank.expected)}（
                      {groupNames[0]}）。
                    </p>
                    <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                      {logRank.pValue < 0.05
                        ? '有意水準5%では、2群の生存関数に差があると判断する目安です。'
                        : '有意水準5%では、2群の生存関数に明確な差があるとはいえない目安です。'}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                    イベントまたはリスク人数が不足しているため、ログランク検定を計算できませんでした。
                  </p>
                )}
              </div>
            )}

            {groupNames.length > 2 && (
              <div
                role="note"
                className="min-w-0 border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
              >
                <p className="text-xs font-bold text-[var(--ink)]">
                  ログランク検定は2群のみ
                </p>
                <p className="mt-1 text-[11px] leading-6 text-[var(--ink-soft)]">
                  グループが{formatInteger(groupNames.length)}
                  つあるため、生存曲線とグループ概要を表示します。ログランク検定は2群のときに計算します。
                </p>
              </div>
            )}

            {groupNames.length === 1 && (
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
                <p className="text-[11px] leading-6 text-[var(--ink-soft)]">
                  group列に2つ以上のラベルを設定すると、ログランク検定も計算できます。
                </p>
              </div>
            )}

            <div className="min-w-0">
              <h3 className="font-editorial text-base">グループ概要</h3>
              <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                {curves.map((curve) => (
                  <div
                    key={curve.name}
                    className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0"
                        style={{ backgroundColor: curve.color }}
                      />
                      <p className="min-w-0 break-words text-xs font-bold text-[var(--ink)]">
                        {curve.name}
                      </p>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] leading-5">
                      <div className="min-w-0">
                        <dt className="text-[var(--ink-soft)]">データ数</dt>
                        <dd className="font-bold tabular-nums">
                          {formatInteger(curve.n)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[var(--ink-soft)]">イベント</dt>
                        <dd className="font-bold tabular-nums">
                          {formatInteger(curve.events)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[var(--ink-soft)]">打ち切り</dt>
                        <dd className="font-bold tabular-nums">
                          {formatInteger(curve.censored)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[var(--ink-soft)]">
                          最終追跡時間
                        </dt>
                        <dd className="font-bold tabular-nums">
                          {formatTime(curve.maxTime)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[var(--ink-soft)]">
                          中央生存時間
                        </dt>
                        <dd className="font-bold tabular-nums">
                          {curve.median === null
                            ? '未到達'
                            : formatTime(curve.median)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[var(--ink-soft)]">
                          最終生存率
                        </dt>
                        <dd className="font-bold tabular-nums">
                          {percentFormatter.format(curve.finalSurvival)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
            有効なCSVを入力すると、グループ別の中央生存時間、リスク人数、2群の場合はログランク検定を表示します。
          </p>
        )}

        <div
          role="note"
          className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold text-[var(--accent)]">
            仮定と限界
          </p>
          <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
            このツールは、各個人の生存時間が独立であり、打ち切りが生存時間と無関係に生じる非情報的打ち切りであると仮定しています。情報的打ち切り、競合リスク、時間依存の群分けなどがある場合、Kaplan-Meier推定やログランク検定は偏る可能性があります。中央生存時間が「未到達」の場合は、追跡期間内に生存率が50%以下にならなかったことを示します。結果は目安であり、医学的な判断は専門家に相談してください。
          </p>
        </div>
      </section>

      <section
        className="paper-panel-flat min-w-0 p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="survival-chart-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="paper-kicker text-[9px]">Curve</p>
            <h2
              id="survival-chart-heading"
              className="font-editorial mt-1 text-xl"
            >
              生存曲線とリスク表
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            03 / 03
          </span>
        </div>

        {curves.length > 0 ? (
          <div className="mt-4 min-w-0">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {curves.map((curve) => (
                <span
                  key={curve.name}
                  className="inline-flex min-w-0 items-center gap-1.5 text-[10px] text-[var(--ink-soft)]"
                >
                  <span
                    aria-hidden="true"
                    className="h-0.5 w-5 shrink-0"
                    style={{ backgroundColor: curve.color }}
                  />
                  <span className="break-words">{curve.name}</span>
                </span>
              ))}
            </div>

            <div className="mt-2 min-w-0">
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="h-auto w-full max-w-full"
                role="img"
                aria-label="グループ別のKaplan-Meier生存曲線"
              >
                <title>グループ別のKaplan-Meier生存曲線</title>
                <text
                  x={CHART_LEFT}
                  y={10}
                  className="fill-[var(--ink-soft)]"
                  fontSize={9}
                >
                  生存率
                </text>
                {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                  <g key={`y-${tick}`}>
                    <line
                      x1={CHART_LEFT}
                      y1={chartY(tick)}
                      x2={CHART_WIDTH - CHART_RIGHT}
                      y2={chartY(tick)}
                      className="stroke-[var(--line)]"
                      strokeWidth={0.8}
                    />
                    <text
                      x={CHART_LEFT - 6}
                      y={chartY(tick) + 3}
                      textAnchor="end"
                      className="fill-[var(--ink-soft)]"
                      fontSize={9}
                    >
                      {Math.round(tick * 100)}%
                    </text>
                  </g>
                ))}
                {Array.from(new Set([0, maxTime / 2, maxTime])).map(
                  (tick) => (
                    <g key={`x-${tick}`}>
                      <line
                        x1={chartX(tick, maxTime)}
                        y1={CHART_TOP}
                        x2={chartX(tick, maxTime)}
                        y2={CHART_HEIGHT - CHART_BOTTOM}
                        className="stroke-[var(--line)]"
                        strokeDasharray="2 3"
                        strokeWidth={0.8}
                      />
                      <text
                        x={chartX(tick, maxTime)}
                        y={CHART_HEIGHT - CHART_BOTTOM + 14}
                        textAnchor={
                          tick === 0
                            ? 'start'
                            : tick === maxTime
                              ? 'end'
                              : 'middle'
                        }
                        className="fill-[var(--ink-soft)]"
                        fontSize={9}
                      >
                        {formatTime(tick)}
                      </text>
                    </g>
                  ),
                )}
                <line
                  x1={CHART_LEFT}
                  y1={CHART_TOP}
                  x2={CHART_LEFT}
                  y2={CHART_HEIGHT - CHART_BOTTOM}
                  className="stroke-[var(--line-strong)]"
                  strokeWidth={1}
                />
                <line
                  x1={CHART_LEFT}
                  y1={CHART_HEIGHT - CHART_BOTTOM}
                  x2={CHART_WIDTH - CHART_RIGHT}
                  y2={CHART_HEIGHT - CHART_BOTTOM}
                  className="stroke-[var(--line-strong)]"
                  strokeWidth={1}
                />
                {curves.map((curve) => (
                  <path
                    key={curve.name}
                    d={buildStepPath(curve.points, maxTime)}
                    fill="none"
                    strokeWidth={2.2}
                    style={{ stroke: curve.color }}
                  />
                ))}
                <text
                  x={CHART_WIDTH - CHART_RIGHT}
                  y={CHART_HEIGHT - 6}
                  textAnchor="end"
                  className="fill-[var(--ink-soft)]"
                  fontSize={9}
                >
                  時間
                </text>
              </svg>
            </div>

            <p className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
              横軸は追跡時間、縦軸は推定生存率です。曲線はイベント発生時に階段状に下降し、打ち切りでは下降しません。
            </p>

            <div className="mt-4 min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3
                  id="survival-risk-heading"
                  className="font-editorial text-base"
                >
                  リスク表
                </h3>
                <p className="font-label text-[8px] text-[var(--ink-soft)]">
                  At risk
                </p>
              </div>
              <div className="mt-2 min-w-0">
                <table className="w-full table-fixed border-collapse text-center text-[10px]">
                  <caption className="sr-only">
                    時点ごとのグループ別リスク人数
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="w-[32%] border border-[var(--line)] px-1 py-1.5 text-left font-bold"
                      >
                        グループ
                      </th>
                      {riskTimes.map((time) => (
                        <th
                          key={`risk-time-${time}`}
                          scope="col"
                          className="border border-[var(--line)] px-1 py-1.5 font-label text-[8px] text-[var(--ink-soft)]"
                        >
                          {formatTime(time)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {curves.map((curve) => (
                      <tr key={`risk-group-${curve.name}`}>
                        <th
                          scope="row"
                          className="border border-[var(--line)] px-1 py-1.5 text-left font-bold leading-4"
                        >
                          <span className="break-words">{curve.name}</span>
                        </th>
                        {riskTimes.map((time) => (
                          <td
                            key={`risk-${curve.name}-${time}`}
                            className="border border-[var(--line)] px-1 py-1.5 font-editorial tabular-nums"
                          >
                            {formatInteger(
                              curve.times.filter(
                                (recordTime) => recordTime >= time,
                              ).length,
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                各時点で追跡が継続している人数（at risk）です。打ち切りはその時点以降のリスク人数から外れます。列はイベント時点と最終追跡時点から最大5つを表示します。
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有効なCSVを入力すると、グループ別の生存曲線と時点ごとのリスク表を表示します。
          </p>
        )}
      </section>
    </section>
  );
}
