'use client';

import { useState } from 'react';
import { CITY_DATA_NOTE, JAPAN_CITIES } from '@/lib/statsData';

type City = (typeof JAPAN_CITIES)[number];

const numberFormatter = new Intl.NumberFormat('ja-JP');
const distanceFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 1,
});
const bearingFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 1,
});

const EARTH_RADIUS_KM = 6371.0088;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const DIRECTIONS_16 = [
  '北',
  '北北東',
  '北東',
  '東北東',
  '東',
  '東南東',
  '南東',
  '南南東',
  '南',
  '南南西',
  '南西',
  '西南西',
  '西',
  '西北西',
  '北西',
  '北北西',
] as const;

const MAP_WIDTH = 420;
const MAP_HEIGHT = 520;
const MAP_PADDING = 28;

const MAP_MIN_LON = Math.min(...JAPAN_CITIES.map((city) => city.lon));
const MAP_MAX_LON = Math.max(...JAPAN_CITIES.map((city) => city.lon));
const MAP_MIN_LAT = Math.min(...JAPAN_CITIES.map((city) => city.lat));
const MAP_MAX_LAT = Math.max(...JAPAN_CITIES.map((city) => city.lat));

function toRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

function formatInteger(value: number): string {
  return numberFormatter.format(Math.round(value));
}

function calculateDistanceKm(from: City, to: City): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function calculateInitialBearing(from: City, to: City): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
}

function bearingToDirection(bearing: number): string {
  const index = Math.round(bearing / 22.5) % DIRECTIONS_16.length;
  return DIRECTIONS_16[index];
}

function projectLongitude(longitude: number): number {
  return (
    MAP_PADDING +
    ((longitude - MAP_MIN_LON) / (MAP_MAX_LON - MAP_MIN_LON)) *
      (MAP_WIDTH - MAP_PADDING * 2)
  );
}

function projectLatitude(latitude: number): number {
  return (
    MAP_PADDING +
    ((MAP_MAX_LAT - latitude) / (MAP_MAX_LAT - MAP_MIN_LAT)) *
      (MAP_HEIGHT - MAP_PADDING * 2)
  );
}

type ProjectedCity = City & {
  x: number;
  y: number;
};

const PROJECTED_CITIES: ProjectedCity[] = JAPAN_CITIES.map((city) => ({
  ...city,
  x: projectLongitude(city.lon),
  y: projectLatitude(city.lat),
}));

type CityPickerProps = {
  idPrefix: string;
  label: string;
  value: string;
  query: string;
  onValueChange: (value: string) => void;
  onQueryChange: (value: string) => void;
};

function CityPicker({
  idPrefix,
  label,
  value,
  query,
  onValueChange,
  onQueryChange,
}: CityPickerProps) {
  const selectId = `${idPrefix}-select`;
  const searchId = `${idPrefix}-search`;
  const helpId = `${idPrefix}-help`;
  const selectedCity = JAPAN_CITIES.find((city) => city.name === value) ?? JAPAN_CITIES[0];
  const keyword = query.trim();
  const matches =
    keyword === ''
      ? JAPAN_CITIES
      : JAPAN_CITIES.filter(
          (city) =>
            city.name.includes(keyword) || city.prefecture.includes(keyword),
        );
  const options = matches.some((city) => city.name === selectedCity.name)
    ? matches
    : [selectedCity, ...matches];

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={selectId} className="text-sm font-bold text-[var(--ink)]">
          {label}
        </label>
        <span
          aria-hidden="true"
          className="font-label text-[9px] text-[var(--ink-soft)]"
        >
          {keyword === ''
            ? `${numberFormatter.format(JAPAN_CITIES.length)}都市`
            : `${numberFormatter.format(matches.length)}件`}
        </span>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <input
          id={searchId}
          name={`${idPrefix}-query`}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="都市名・都道府県で検索"
          aria-label={`${label}の都市を検索`}
          aria-controls={selectId}
          aria-describedby={helpId}
          className="field-paper h-12 rounded-sm px-3 text-sm"
        />
        <select
          id={selectId}
          name={idPrefix}
          value={selectedCity.name}
          onChange={(event) => {
            onValueChange(event.target.value);
            onQueryChange('');
          }}
          aria-describedby={helpId}
          className="field-paper h-12 rounded-sm px-3 text-base"
        >
          {options.map((city) => (
            <option key={city.name} value={city.name}>
              {city.name}（{city.prefecture}）
            </option>
          ))}
        </select>
      </div>

      <p id={helpId} className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]">
        {keyword !== '' && matches.length === 0
          ? '一致する都市がありません。検索語を変えるか、選択中の都市のまま計算できます。'
          : '都市名または都道府県名の一部で絞り込めます。選択すると検索欄はクリアされます。'}
      </p>
    </div>
  );
}

export function CityDistance() {
  const [fromCityName, setFromCityName] = useState('東京');
  const [toCityName, setToCityName] = useState('大阪');
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');

  const fromCity =
    JAPAN_CITIES.find((city) => city.name === fromCityName) ?? JAPAN_CITIES[0];
  const toCity =
    JAPAN_CITIES.find((city) => city.name === toCityName) ?? JAPAN_CITIES[0];

  const sameCity = fromCity.name === toCity.name;
  const distanceKm = calculateDistanceKm(fromCity, toCity);
  const distanceMeters = Math.round(distanceKm * 1000);
  const initialBearing = sameCity ? null : calculateInitialBearing(fromCity, toCity);
  const direction = initialBearing === null ? null : bearingToDirection(initialBearing);

  const fromPoint = {
    x: projectLongitude(fromCity.lon),
    y: projectLatitude(fromCity.lat),
  };
  const toPoint = {
    x: projectLongitude(toCity.lon),
    y: projectLatitude(toCity.lat),
  };

  const mapDescriptionId = 'city-distance-map-description';
  const mapLabel = sameCity
    ? `簡易マップ：${fromCity.name}の位置`
    : `簡易マップ：${fromCity.name}と${toCity.name}の位置と直線距離`;
  const mapDescription = sameCity
    ? `日本全国の主要都市を緯度経度に基づいて配置した簡易マップです。${fromCity.name}（${fromCity.prefecture}）を強調しています。出発地と目的地が同一のため、2地点を結ぶ直線は表示していません。実際の道路や鉄道の経路を示すものではありません。`
    : `日本全国の主要都市を緯度経度に基づいて配置した簡易マップです。${fromCity.name}（${fromCity.prefecture}）と${toCity.name}（${toCity.prefecture}）を強調し、2地点を直線で結んでいます。地図上の位置関係を示すもので、実際の道路や鉄道の経路ではありません。`;

  const statusMessage = sameCity
    ? `${fromCity.name}と${toCity.name}は同一地点です。直線距離は0キロメートルです。`
    : `${fromCity.name}から${toCity.name}までの直線距離は約${distanceFormatter.format(distanceKm)}キロメートル、方角は${direction}、初期方位は約${initialBearing === null ? 0 : bearingFormatter.format(initialBearing)}度です。`;

  const swapCities = () => {
    setFromCityName(toCity.name);
    setToCityName(fromCity.name);
    setFromQuery('');
    setToQuery('');
  };

  const resetSelection = () => {
    setFromCityName('東京');
    setToCityName('大阪');
    setFromQuery('');
    setToQuery('');
  };

  const selectedMarkers = sameCity
    ? [
        {
          city: fromCity,
          point: fromPoint,
          label: `選択中 ${fromCity.name}`,
          offsetY: -14,
        },
      ]
    : [
        {
          city: fromCity,
          point: fromPoint,
          label: `出発地 ${fromCity.name}`,
          offsetY: -14,
        },
        {
          city: toCity,
          point: toPoint,
          label: `目的地 ${toCity.name}`,
          offsetY: 22,
        },
      ];

  return (
    <section className="grid min-w-0 gap-5" aria-label="主要都市間距離計算">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="city-distance-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2 id="city-distance-form-heading" className="font-editorial mt-1 text-xl">
                都市を選択
              </h2>
            </div>
            <span
              aria-hidden="true"
              className="font-label text-[9px] text-[var(--ink-soft)]"
            >
              01 / 03
            </span>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
            出発地と目的地をそれぞれ検索して選択します。都市を選ぶと、直線距離と方角が自動で更新されます。
          </p>

          <div className="mt-5 grid gap-4">
            <CityPicker
              idPrefix="city-distance-from"
              label="出発地"
              value={fromCityName}
              query={fromQuery}
              onValueChange={setFromCityName}
              onQueryChange={setFromQuery}
            />

            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-px flex-1 bg-[var(--line)]" />
              <button
                type="button"
                onClick={swapCities}
                className="paper-button rounded-sm px-4 py-2 text-xs"
              >
                出発地と目的地を入れ替える
              </button>
              <span aria-hidden="true" className="h-px flex-1 bg-[var(--line)]" />
            </div>

            <CityPicker
              idPrefix="city-distance-to"
              label="目的地"
              value={toCityName}
              query={toQuery}
              onValueChange={setToCityName}
              onQueryChange={setToQuery}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={resetSelection}
              className="paper-button rounded-sm px-4 py-2 text-xs"
            >
              選択をリセット
            </button>
            <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
              選択内容は保存・送信されません。
            </p>
          </div>
        </form>

        <section
          aria-labelledby="city-distance-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="city-distance-result-heading"
                className="font-editorial mt-1 text-xl"
              >
                距離と方角
              </h2>
            </div>
            <span
              aria-hidden="true"
              className="font-label text-[9px] text-[var(--ink-soft)]"
            >
              02 / 03
            </span>
          </div>

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {statusMessage}
          </p>

          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  直線距離
                </p>
                <p className="font-editorial mt-1 text-4xl leading-none tabular-nums">
                  {distanceFormatter.format(distanceKm)}{' '}
                  <span className="text-base">km</span>
                </p>
                <p className="mt-2 text-sm tabular-nums text-[var(--ink-soft)]">
                  {formatInteger(distanceMeters)} m
                </p>
              </div>
              <p className="font-label shrink-0 text-right text-[9px] text-[var(--ink-soft)]">
                Great
                <br />
                Circle
                <br />
                Distance
              </p>
            </div>
            <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              {fromCity.name}（{fromCity.prefecture}）から{toCity.name}（
              {toCity.prefecture}）まで
            </p>
          </div>

          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                方角（16方位）
              </p>
              {direction !== null && initialBearing !== null ? (
                <>
                  <p className="font-editorial mt-1 text-2xl leading-tight">
                    {direction}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    初期方位 約 {bearingFormatter.format(initialBearing)}°
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  同一地点が選択されています。
                </p>
              )}
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                距離の計算
              </p>
              <p className="font-editorial mt-1 text-2xl leading-tight">
                ハバーサイン式
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                地球を半径約6,371kmの球体として計算
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
            方角は出発地から目的地へ向かう初期方位の目安です。北を0°として時計回りに16方位へ丸めています。
          </p>
        </section>
      </div>

      <section
        aria-labelledby="city-distance-map-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Map</p>
            <h2 id="city-distance-map-heading" className="font-editorial mt-1 text-xl">
              簡易マップ
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            03 / 03
          </span>
        </div>

        <p id={mapDescriptionId} className="sr-only">
          {mapDescription}
        </p>

        <div className="mt-4 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4">
            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              className="mx-auto h-auto w-full max-w-[320px]"
              role="img"
              aria-label={mapLabel}
              aria-describedby={mapDescriptionId}
            >
              <rect
                x={0}
                y={0}
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                rx={8}
                className="fill-[var(--paper-strong)]"
              />

              <g
                aria-hidden="true"
                className="stroke-[var(--line)]"
                strokeWidth={0.8}
                strokeDasharray="3 5"
              >
                {[130, 135, 140].map((longitude) => (
                  <line
                    key={`longitude-${longitude}`}
                    x1={projectLongitude(longitude)}
                    y1={MAP_PADDING}
                    x2={projectLongitude(longitude)}
                    y2={MAP_HEIGHT - MAP_PADDING}
                  />
                ))}
                {[30, 35, 40].map((latitude) => (
                  <line
                    key={`latitude-${latitude}`}
                    x1={MAP_PADDING}
                    y1={projectLatitude(latitude)}
                    x2={MAP_WIDTH - MAP_PADDING}
                    y2={projectLatitude(latitude)}
                  />
                ))}
              </g>

              <g aria-hidden="true" className="stroke-[var(--ink-soft)] fill-[var(--ink-soft)]">
                <line x1={26} y1={44} x2={26} y2={26} strokeWidth={1.5} />
                <path d="M26 18 L21.5 27 L26 23.5 L30.5 27 Z" />
                <text
                  x={26}
                  y={58}
                  textAnchor="middle"
                  fontSize={10}
                  stroke="none"
                  className="font-label"
                >
                  N
                </text>
              </g>

              <g aria-hidden="true">
                {PROJECTED_CITIES.filter(
                  (city) =>
                    city.name !== fromCity.name && city.name !== toCity.name,
                ).map((city) => (
                  <circle
                    key={city.name}
                    cx={city.x}
                    cy={city.y}
                    r={2.4}
                    className="fill-[var(--ink-soft)] opacity-60"
                  />
                ))}
              </g>

              {!sameCity && (
                <g aria-hidden="true">
                  <line
                    x1={fromPoint.x}
                    y1={fromPoint.y}
                    x2={toPoint.x}
                    y2={toPoint.y}
                    className="stroke-[var(--accent)] opacity-20"
                    strokeWidth={9}
                    strokeLinecap="round"
                  />
                  <line
                    x1={fromPoint.x}
                    y1={fromPoint.y}
                    x2={toPoint.x}
                    y2={toPoint.y}
                    className="stroke-[var(--accent)]"
                    strokeWidth={2.5}
                    strokeDasharray="8 5"
                    strokeLinecap="round"
                  />
                </g>
              )}

              <g aria-hidden="true">
                {selectedMarkers.map((marker) => {
                  const isRightSide = marker.point.x > MAP_WIDTH / 2;
                  const labelX = marker.point.x + (isRightSide ? -12 : 12);
                  return (
                    <g key={`${marker.label}-${marker.city.name}`}>
                      <circle
                        cx={marker.point.x}
                        cy={marker.point.y}
                        r={11}
                        className="fill-[var(--accent)] opacity-15"
                      />
                      <circle
                        cx={marker.point.x}
                        cy={marker.point.y}
                        r={5.5}
                        className="fill-[var(--accent)] stroke-[var(--paper-strong)]"
                        strokeWidth={2}
                      />
                      <text
                        x={labelX}
                        y={marker.point.y + marker.offsetY}
                        textAnchor={isRightSide ? 'end' : 'start'}
                        fontSize={13}
                        stroke="var(--paper-strong)"
                        strokeWidth={3.5}
                        paintOrder="stroke"
                        className="fill-[var(--ink)] font-editorial font-bold"
                      >
                        {marker.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] leading-5 text-[var(--ink-soft)]">
              <li className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full bg-[var(--ink-soft)]"
                />
                主要都市
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]"
                />
                選択中の都市
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-px w-5 border-t-2 border-dashed border-[var(--accent)]"
                />
                直線距離
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                  出発地
                </dt>
                <dd className="font-editorial mt-1 text-lg">{fromCity.name}</dd>
                <dd className="text-[11px] leading-5 text-[var(--ink-soft)]">
                  {fromCity.prefecture}
                </dd>
                <dd className="mt-2 text-[11px] leading-5 tabular-nums text-[var(--ink-soft)]">
                  北緯 {fromCity.lat.toFixed(4)}° / 東経 {fromCity.lon.toFixed(4)}°
                </dd>
              </div>

              <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
                <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                  目的地
                </dt>
                <dd className="font-editorial mt-1 text-lg">{toCity.name}</dd>
                <dd className="text-[11px] leading-5 text-[var(--ink-soft)]">
                  {toCity.prefecture}
                </dd>
                <dd className="mt-2 text-[11px] leading-5 tabular-nums text-[var(--ink-soft)]">
                  北緯 {toCity.lat.toFixed(4)}° / 東経 {toCity.lon.toFixed(4)}°
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
              マップは緯度経度をSVGの表示領域に線形に割り当てた簡易表示です。地形や実際の海岸線、道路、鉄道は反映していません。
            </p>

            <div
              role="note"
              className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                直線距離について
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                表示される距離は緯度経度から計算した直線距離（大円距離）であり、実際の道路距離・鉄道距離ではありません。
              </p>
              <p className="mt-2 text-[11px] leading-6 text-[var(--ink)]">
                {CITY_DATA_NOTE}
              </p>
              <p className="mt-2 text-[11px] leading-6 text-[var(--ink)]">
                移動時間や運賃の検討には、実際の道路・鉄道の距離や各交通機関の案内をご確認ください。
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
