'use client';

import { useEffect, useMemo, useState } from 'react';
import { CITY_DATA_NOTE, WORLD_CITIES, type WorldCity } from '@/lib/statsData';

const REGION_ORDER = [
  'アジア',
  'ヨーロッパ',
  'アフリカ',
  '北アメリカ',
  '南アメリカ',
  'オセアニア',
] as const;

type Region = (typeof REGION_ORDER)[number];

type LocalClock = {
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: number;
  minute: number;
  second: number;
};

type CityClock = {
  city: WorldCity;
  region: Region;
  local: LocalClock;
  offsetMinutes: number;
  differenceMinutes: number;
  isDay: boolean;
  markerPercent: number;
};

type ClockGroup = {
  region: Region;
  cities: CityClock[];
};

type ClockData = {
  baseClock: CityClock;
  groups: ClockGroup[];
};

type DisplayCity = {
  city: WorldCity;
  region: Region;
  clock: CityClock | null;
  isBase: boolean;
};

type DisplayGroup = {
  region: Region;
  cities: DisplayCity[];
};

type DayPhase = 'day' | 'night';

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function getRegion(city: WorldCity): Region {
  if (city.timeZone.startsWith('Asia/')) {
    return 'アジア';
  }
  if (city.timeZone.startsWith('Europe/')) {
    return 'ヨーロッパ';
  }
  if (city.timeZone.startsWith('Africa/')) {
    return 'アフリカ';
  }
  if (city.timeZone === 'Pacific/Honolulu') {
    return '北アメリカ';
  }
  if (city.timeZone.startsWith('America/')) {
    return city.country === 'ブラジル' ? '南アメリカ' : '北アメリカ';
  }
  if (
    city.timeZone.startsWith('Australia/') ||
    city.timeZone.startsWith('Pacific/')
  ) {
    return 'オセアニア';
  }
  return 'アジア';
}

function getLocalClock(date: Date, timeZone: string): LocalClock {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = new Map<string, string>();
  for (const part of parts) {
    values.set(part.type, part.value);
  }

  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
    weekday: values.get('weekday') ?? '',
    hour: Number(values.get('hour')),
    minute: Number(values.get('minute')),
    second: Number(values.get('second')),
  };
}

function getOffsetMinutes(date: Date, local: LocalClock): number {
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );

  return Math.round((asUtc - date.getTime()) / 60000);
}

function formatTime(local: LocalClock): string {
  return `${pad2(local.hour)}:${pad2(local.minute)}`;
}

function formatDate(local: LocalClock): string {
  return `${local.month}月${local.day}日（${local.weekday}）`;
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  return `UTC${sign}${pad2(hours)}:${pad2(minutes)}`;
}

function formatDifference(differenceMinutes: number): string {
  if (differenceMinutes === 0) {
    return '±00:00';
  }

  const sign = differenceMinutes > 0 ? '+' : '-';
  const absolute = Math.abs(differenceMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  return `${sign}${pad2(hours)}:${pad2(minutes)}`;
}

function formatDifferenceText(
  differenceMinutes: number,
  baseCityName: string,
): string {
  if (differenceMinutes === 0) {
    return '基準都市と同じ時刻';
  }

  const absolute = Math.abs(differenceMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const amount = `${hours > 0 ? `${hours}時間` : ''}${
    minutes > 0 ? `${minutes}分` : ''
  }`;

  return `${baseCityName}より${amount}${differenceMinutes > 0 ? '進み' : '遅れ'}`;
}

function isDaytime(local: LocalClock): boolean {
  return local.hour >= 6 && local.hour < 18;
}

function buildCityClock(
  date: Date,
  city: WorldCity,
  baseOffsetMinutes: number,
): CityClock {
  const local = getLocalClock(date, city.timeZone);
  const offsetMinutes = getOffsetMinutes(date, local);
  const totalMinutes = local.hour * 60 + local.minute;

  return {
    city,
    region: getRegion(city),
    local,
    offsetMinutes,
    differenceMinutes: offsetMinutes - baseOffsetMinutes,
    isDay: isDaytime(local),
    markerPercent: (totalMinutes / 1440) * 100,
  };
}

function DayNightBar({
  markerPercent,
  phase,
}: {
  markerPercent: number | null;
  phase: DayPhase | null;
}) {
  const label = phase === null ? '--' : phase === 'day' ? '昼' : '夜';
  const description =
    phase === null
      ? '現在の昼夜を表示します'
      : phase === 'day'
        ? '昼（6:00〜18:00）'
        : '夜（18:00〜6:00）';
  const markerLeft =
    markerPercent === null
      ? null
      : Math.min(99.5, Math.max(0.5, markerPercent));

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="relative h-3 min-w-0 flex-1 overflow-hidden border border-[var(--line)] bg-[var(--paper-muted)]"
          aria-hidden="true"
        >
          <div className="absolute inset-y-0 left-0 w-1/4 bg-[var(--ink)] opacity-15" />
          <div className="absolute inset-y-0 left-1/4 w-1/2 bg-[var(--gold)] opacity-70" />
          <div className="absolute inset-y-0 right-0 w-1/4 bg-[var(--ink)] opacity-15" />
          {markerLeft !== null && (
            <span
              className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-[var(--accent)]"
              style={{ left: `${markerLeft}%` }}
            />
          )}
        </div>
        <span
          className={`w-7 shrink-0 text-right font-label text-[9px] ${
            phase === 'day'
              ? 'text-[var(--gold)]'
              : phase === 'night'
                ? 'text-[var(--teal)]'
                : 'text-[var(--ink-soft)]'
          }`}
        >
          {label}
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-4 text-[var(--ink-soft)]">
        {description}
      </p>
    </div>
  );
}

export function WorldTimezone() {
  const [baseTimeZone, setBaseTimeZone] = useState(WORLD_CITIES[0].timeZone);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const activeCity =
    WORLD_CITIES.find((city) => city.timeZone === baseTimeZone) ??
    WORLD_CITIES[0];

  const clockData = useMemo<ClockData | null>(() => {
    if (now === null) {
      return null;
    }

    const baseLocal = getLocalClock(now, baseTimeZone);
    const baseOffsetMinutes = getOffsetMinutes(now, baseLocal);
    const clocks = WORLD_CITIES.map((city) =>
      buildCityClock(now, city, baseOffsetMinutes),
    );
    const baseClock =
      clocks.find((clock) => clock.city.timeZone === baseTimeZone) ?? clocks[0];
    const groups = REGION_ORDER.map((region) => ({
      region,
      cities: clocks
        .filter((clock) => clock.region === region)
        .sort(
          (a, b) =>
            a.differenceMinutes - b.differenceMinutes ||
            a.city.name.localeCompare(b.city.name, 'ja'),
        ),
    })).filter((group) => group.cities.length > 0);

    return { baseClock, groups };
  }, [now, baseTimeZone]);

  const displayGroups = useMemo<DisplayGroup[]>(() => {
    if (clockData !== null) {
      return clockData.groups.map((group) => ({
        region: group.region,
        cities: group.cities.map((clock) => ({
          city: clock.city,
          region: clock.region,
          clock,
          isBase: clock.city.timeZone === baseTimeZone,
        })),
      }));
    }

    return REGION_ORDER.map((region) => ({
      region,
      cities: WORLD_CITIES.filter((city) => getRegion(city) === region).map(
        (city) => ({
          city,
          region,
          clock: null,
          isBase: city.timeZone === baseTimeZone,
        }),
      ),
    })).filter((group) => group.cities.length > 0);
  }, [clockData, baseTimeZone]);

  const baseClock = clockData?.baseClock ?? null;
  const statusMessage = baseClock
    ? `${baseClock.city.name}の現在時刻は${formatTime(
        baseClock.local,
      )}、${formatDate(
        baseClock.local,
      )}です。各都市の現在時刻と時差を更新しました。`
    : '現在時刻を読み込んでいます。';

  return (
    <section className="min-w-0 space-y-5" aria-label="世界時差クロック">
      <div className="paper-panel min-w-0 p-4 sm:p-6">
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">World Clock</p>
            <h2 className="font-editorial mt-1 text-xl">
              基準都市と現在時刻
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            Base / Local
          </span>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0">
            <div>
              <label
                htmlFor="world-timezone-base"
                className="text-sm font-bold text-[var(--ink)]"
              >
                基準にする都市
              </label>
              <select
                id="world-timezone-base"
                name="base-city"
                value={baseTimeZone}
                onChange={(event) => setBaseTimeZone(event.target.value)}
                className="field-paper mt-2 min-w-0 rounded-sm px-3 py-3 text-base"
              >
                {WORLD_CITIES.map((city) => (
                  <option key={city.timeZone} value={city.timeZone}>
                    {city.name}（{city.country}）
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                選んだ都市の現在時刻を基準に、各都市との時差を計算します。時差は選択中の時点のUTCオフセットで比較しています。
              </p>
            </div>

            <div className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-3">
              <p className="text-xs font-bold text-[var(--accent)]">
                夏時間と表示時刻について
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                夏時間（デイライトセービングタイム）はブラウザのタイムゾーンデータベースに従って自動反映されます。表示される時刻は端末の時計とブラウザのデータによる目安です。正確な時刻は各都市の公式情報をご確認ください。
              </p>
            </div>
          </div>

          <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  Selected City
                </p>
                <p className="font-editorial mt-1 truncate text-xl">
                  {activeCity.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--ink-soft)]">
                  {activeCity.country} /{' '}
                  {baseClock ? formatOffset(baseClock.offsetMinutes) : 'UTC --:--'}
                </p>
              </div>
              <span className="shrink-0 border border-[var(--accent)] bg-[var(--accent)] px-2 py-1 font-label text-[8px] text-[var(--paper-strong)]">
                基準
              </span>
            </div>

            <p className="font-editorial mt-4 text-5xl leading-none tabular-nums sm:text-6xl">
              {baseClock ? formatTime(baseClock.local) : '--:--'}
            </p>
            <p className="mt-2 text-sm font-bold">
              {baseClock
                ? formatDate(baseClock.local)
                : '日付を取得しています'}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
              {baseClock
                ? formatDifferenceText(0, activeCity.name)
                : '30秒ごとに自動更新します'}
            </p>

            <div className="mt-4">
              <DayNightBar
                markerPercent={baseClock?.markerPercent ?? null}
                phase={
                  baseClock ? (baseClock.isDay ? 'day' : 'night') : null
                }
              />
            </div>

            <p className="mt-3 text-[10px] leading-4 text-[var(--ink-soft)]">
              時刻は30秒ごとに更新されます。
            </p>
          </div>
        </div>
      </div>

      <div className="paper-panel min-w-0 p-4 sm:p-6">
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Cities</p>
            <h2 className="font-editorial mt-1 text-xl">
              都市別の現在時刻と時差
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            {WORLD_CITIES.length} Cities
          </span>
        </div>

        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </p>

        <div className="mt-5 space-y-7">
          {displayGroups.map((group) => (
            <section
              key={group.region}
              aria-labelledby={`world-timezone-region-${group.region}`}
              className="min-w-0"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2">
                <h3
                  id={`world-timezone-region-${group.region}`}
                  className="font-editorial text-base"
                >
                  {group.region}
                </h3>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  {group.cities.length} Cities
                </span>
              </div>

              <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
                {group.cities.map(({ city, clock, isBase }) => (
                  <article
                    key={city.timeZone}
                    aria-label={`${city.name}${isBase ? '、基準都市' : ''}`}
                    className={`min-w-0 border p-3 sm:p-4 ${
                      isBase
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[2px_2px_0_var(--paper-shadow)]'
                        : 'border-[var(--line)] bg-[var(--paper)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h4 className="font-editorial truncate text-lg">
                            {city.name}
                          </h4>
                          {isBase && (
                            <span className="shrink-0 border border-[var(--accent)] bg-[var(--accent)] px-1.5 py-0.5 font-label text-[8px] text-[var(--paper-strong)]">
                              基準
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--ink-soft)]">
                          {city.country} /{' '}
                          {clock
                            ? formatOffset(clock.offsetMinutes)
                            : 'UTC --:--'}
                        </p>
                      </div>
                      <p className="font-editorial shrink-0 text-2xl leading-none tabular-nums sm:text-3xl">
                        {clock ? formatTime(clock.local) : '--:--'}
                      </p>
                    </div>

                    <div className="mt-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11px]">
                      <span className="text-[var(--ink-soft)]">
                        {clock ? formatDate(clock.local) : '日付を取得中'}
                      </span>
                      <span
                        className={`font-bold ${
                          isBase
                            ? 'text-[var(--accent)]'
                            : 'text-[var(--ink)]'
                        }`}
                      >
                        {clock
                          ? `時差 ${formatDifference(clock.differenceMinutes)}`
                          : '時差 --:--'}
                      </span>
                    </div>

                    <div className="mt-3">
                      <DayNightBar
                        markerPercent={clock?.markerPercent ?? null}
                        phase={
                          clock ? (clock.isDay ? 'day' : 'night') : null
                        }
                      />
                    </div>

                    <p className="mt-1 text-[10px] leading-4 text-[var(--ink-soft)]">
                      {clock
                        ? isBase
                          ? '基準都市として選択中'
                          : formatDifferenceText(
                              clock.differenceMinutes,
                              activeCity.name,
                            )
                        : '基準都市を選ぶと時差を表示します'}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 border-t border-[var(--line)] pt-3">
          <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
            都市データについて：{CITY_DATA_NOTE}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            表示時刻は端末の時計とブラウザのタイムゾーンデータをもとにした目安です。夏時間は自動反映されますが、最新の制度変更が反映されていない場合があります。
          </p>
        </div>
      </div>
    </section>
  );
}
