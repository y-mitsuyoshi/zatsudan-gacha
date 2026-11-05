'use client';

import { useState } from 'react';

type CoordinateField = {
  value: number | null;
  error: string | null;
};

type Point = {
  lat: number;
  lon: number;
};

type MapView = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  pointBLongitude: number;
  latLines: number[];
  lonLines: number[];
  project: (lat: number, lon: number) => { x: number; y: number };
};

const EARTH_RADIUS_KM = 6371.0088;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const DEFAULT_POINT_A = { lat: '35.681236', lon: '139.767125' };
const DEFAULT_POINT_B = { lat: '34.693725', lon: '135.502254' };
const EXAMPLE_POINT_A = { lat: '43.068661', lon: '141.350755' };
const EXAMPLE_POINT_B = { lat: '26.212401', lon: '127.680932' };

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

const MAP_WIDTH = 480;
const MAP_HEIGHT = 360;
const MAP_PADDING = 52;
const MAP_INNER_WIDTH = MAP_WIDTH - MAP_PADDING * 2;
const MAP_INNER_HEIGHT = MAP_HEIGHT - MAP_PADDING * 2;

const numberFormatter = new Intl.NumberFormat('ja-JP');
const distanceFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 2,
});
const bearingFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 1,
});
const coordinateFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 5,
});
const gridCoordinateFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 4,
});

function toRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

function formatInteger(value: number): string {
  return numberFormatter.format(Math.round(value));
}

function normalizeLongitude(value: number): number {
  return ((value + 540) % 360) - 180;
}

function formatLatitudeLabel(value: number): string {
  const hemisphere = value < 0 ? '南緯' : '北緯';
  return `${hemisphere} ${coordinateFormatter.format(Math.abs(value))}°`;
}

function formatLongitudeLabel(value: number): string {
  const hemisphere = value < 0 ? '西経' : '東経';
  return `${hemisphere} ${coordinateFormatter.format(Math.abs(value))}°`;
}

function validateCoordinate(
  rawValue: string,
  label: string,
  min: number,
  max: number,
): CoordinateField {
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
      error: `${label}は${min}〜${max}°の範囲で入力してください。`,
    };
  }

  return { value: parsed, error: null };
}

function isSamePoint(from: Point, to: Point): boolean {
  return from.lat === to.lat && from.lon === to.lon;
}

function calculateDistanceKm(from: Point, to: Point): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function calculateInitialBearing(from: Point, to: Point): number | null {
  if (isSamePoint(from, to)) {
    return null;
  }

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

function calculateMidpoint(from: Point, to: Point): Point | null {
  if (isSamePoint(from, to)) {
    return { lat: from.lat, lon: from.lon };
  }

  const lat1 = toRadians(from.lat);
  const lon1 = toRadians(from.lon);
  const lat2 = toRadians(to.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const bx = Math.cos(lat2) * Math.cos(deltaLon);
  const by = Math.cos(lat2) * Math.sin(deltaLon);
  const denominator = Math.sqrt(
    (Math.cos(lat1) + bx) ** 2 + by ** 2,
  );

  if (denominator < 1e-12) {
    return null;
  }

  const lat = Math.atan2(Math.sin(lat1) + Math.sin(lat2), denominator);
  const lon = lon1 + Math.atan2(by, Math.cos(lat1) + bx);

  return {
    lat: lat * RAD_TO_DEG,
    lon: normalizeLongitude(lon * RAD_TO_DEG),
  };
}

function getNiceStep(span: number): number {
  const rough = span / 4;
  const power = Math.floor(Math.log10(rough));
  const base = 10 ** power;
  const normalized = rough / base;
  const multiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * base;
}

function getGridValues(min: number, max: number, step: number): number[] {
  const start = Math.ceil(min / step - 1e-9) * step;
  const values: number[] = [];

  for (let index = 0; index < 100; index += 1) {
    const value = start + index * step;
    if (value > max + 1e-9) {
      break;
    }
    values.push(Object.is(value, -0) ? 0 : value);
  }

  return values;
}

function formatGridLabel(value: number, axis: 'lat' | 'lon'): string {
  if (axis === 'lat') {
    const hemisphere = value < 0 ? 'S' : 'N';
    return `${gridCoordinateFormatter.format(Math.abs(value))}°${hemisphere}`;
  }

  const normalized = normalizeLongitude(value);
  const hemisphere = normalized < 0 ? 'W' : 'E';
  return `${gridCoordinateFormatter.format(Math.abs(normalized))}°${hemisphere}`;
}

function buildMapView(from: Point, to: Point): MapView {
  const deltaLon = normalizeLongitude(to.lon - from.lon);
  const pointBLongitude = from.lon + deltaLon;
  const rawMinLat = Math.min(from.lat, to.lat);
  const rawMaxLat = Math.max(from.lat, to.lat);
  const rawMinLon = Math.min(from.lon, pointBLongitude);
  const rawMaxLon = Math.max(from.lon, pointBLongitude);
  let latSpan = Math.max(rawMaxLat - rawMinLat, 0.05) * 1.6;
  let lonSpan = Math.max(rawMaxLon - rawMinLon, 0.05) * 1.6;
  const aspect = MAP_INNER_WIDTH / MAP_INNER_HEIGHT;

  if (lonSpan / latSpan < aspect) {
    lonSpan = latSpan * aspect;
  } else {
    latSpan = lonSpan / aspect;
  }

  if (latSpan > 180) {
    latSpan = 180;
  }
  if (lonSpan > 360) {
    lonSpan = 360;
  }

  const centerLat = (rawMinLat + rawMaxLat) / 2;
  let minLat = centerLat - latSpan / 2;
  let maxLat = centerLat + latSpan / 2;

  if (minLat < -90) {
    maxLat += -90 - minLat;
    minLat = -90;
  }
  if (maxLat > 90) {
    minLat -= maxLat - 90;
    maxLat = 90;
  }

  const centerLon = (rawMinLon + rawMaxLon) / 2;
  const minLon = centerLon - lonSpan / 2;
  const maxLon = centerLon + lonSpan / 2;
  const project = (lat: number, lon: number) => ({
    x:
      MAP_PADDING +
      ((lon - minLon) / (maxLon - minLon)) * MAP_INNER_WIDTH,
    y:
      MAP_PADDING +
      ((maxLat - lat) / (maxLat - minLat)) * MAP_INNER_HEIGHT,
  });

  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    pointBLongitude,
    latLines: getGridValues(minLat, maxLat, getNiceStep(maxLat - minLat)),
    lonLines: getGridValues(minLon, maxLon, getNiceStep(maxLon - minLon)),
    project,
  };
}

type CoordinateInputProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  min: number;
  max: number;
  placeholder: string;
  error: string | null;
  onChange: (value: string) => void;
};

function CoordinateInput({
  id,
  name,
  label,
  value,
  min,
  max,
  placeholder,
  error,
  onChange,
}: CoordinateInputProps) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold text-[var(--ink)]">
          {label} <span className="text-xs font-normal">°</span>
        </label>
        <span className="font-label text-[9px] text-[var(--ink-soft)]">
          {min}〜{max}
        </span>
      </div>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : undefined}
        className="field-paper mt-2 rounded-sm px-3 py-3 text-base tabular-nums"
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-bold leading-5 text-[var(--accent)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

type CoordinateMapProps = {
  pointA: Point;
  pointB: Point;
  midpoint: Point | null;
  samePoint: boolean;
};

function CoordinateMap({
  pointA,
  pointB,
  midpoint,
  samePoint,
}: CoordinateMapProps) {
  const view = buildMapView(pointA, pointB);
  const projectedA = view.project(pointA.lat, pointA.lon);
  const projectedB = view.project(pointB.lat, view.pointBLongitude);
  const midpointLongitude =
    midpoint !== null
      ? pointA.lon + normalizeLongitude(midpoint.lon - pointA.lon)
      : null;
  const projectedMidpoint =
    midpoint !== null && midpointLongitude !== null && !samePoint
      ? view.project(midpoint.lat, midpointLongitude)
      : null;
  const mapDescriptionId = 'coordinate-distance-map-description';
  const mapLabel = samePoint
    ? '地点Aと地点Bの座標グリッド'
    : '地点Aと地点B、中点を示す座標グリッド';
  const mapDescription = samePoint
    ? `地点Aと地点Bを正距円筒図法の簡易グリッドに配置しています。2地点は同じ座標（${formatLatitudeLabel(pointA.lat)}、${formatLongitudeLabel(pointA.lon)}）のため、点は重なっています。背景の緯度・経度線は位置確認用の目安です。`
    : `地点A（${formatLatitudeLabel(pointA.lat)}、${formatLongitudeLabel(pointA.lon)}）と地点B（${formatLatitudeLabel(pointB.lat)}、${formatLongitudeLabel(pointB.lon)}）を正距円筒図法の簡易グリッドに配置し、2点を直線で結んでいます。中点も小さな円で示しています。背景の緯度・経度線は位置確認用の目安であり、地形や実際の経路を表すものではありません。`;
  const labelAOffsetY = projectedA.y <= projectedB.y ? -14 : 22;
  const labelBOffsetY = projectedA.y <= projectedB.y ? 22 : -14;
  const labelAX =
    projectedA.x + (projectedA.x > MAP_WIDTH / 2 ? -12 : 12);
  const labelBX =
    projectedB.x + (projectedB.x > MAP_WIDTH / 2 ? -12 : 12);

  return (
    <>
      <p id={mapDescriptionId} className="sr-only">
        {mapDescription}
      </p>

      <div className="mt-4 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4">
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="mx-auto h-auto w-full max-w-[440px]"
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
              {view.lonLines.map((longitude) => {
                const { x } = view.project(view.minLat, longitude);
                return (
                  <line
                    key={`longitude-${longitude}`}
                    x1={x}
                    y1={MAP_PADDING}
                    x2={x}
                    y2={MAP_HEIGHT - MAP_PADDING}
                  />
                );
              })}
              {view.latLines.map((latitude) => {
                const { y } = view.project(latitude, view.minLon);
                return (
                  <line
                    key={`latitude-${latitude}`}
                    x1={MAP_PADDING}
                    y1={y}
                    x2={MAP_WIDTH - MAP_PADDING}
                    y2={y}
                  />
                );
              })}
            </g>

            <rect
              x={MAP_PADDING}
              y={MAP_PADDING}
              width={MAP_INNER_WIDTH}
              height={MAP_INNER_HEIGHT}
              fill="none"
              className="stroke-[var(--line-strong)]"
              strokeWidth={1}
            />

            <g
              aria-hidden="true"
              className="fill-[var(--ink-soft)]"
              fontSize={9}
            >
              {view.lonLines.map((longitude) => {
                const { x } = view.project(view.minLat, longitude);
                return (
                  <text
                    key={`longitude-label-${longitude}`}
                    x={x}
                    y={MAP_HEIGHT - MAP_PADDING + 16}
                    textAnchor="middle"
                  >
                    {formatGridLabel(longitude, 'lon')}
                  </text>
                );
              })}
              {view.latLines.map((latitude) => {
                const { y } = view.project(latitude, view.minLon);
                return (
                  <text
                    key={`latitude-label-${latitude}`}
                    x={MAP_PADDING - 6}
                    y={y + 3}
                    textAnchor="end"
                  >
                    {formatGridLabel(latitude, 'lat')}
                  </text>
                );
              })}
            </g>

            <g
              aria-hidden="true"
              className="stroke-[var(--ink-soft)] fill-[var(--ink-soft)]"
            >
              <line
                x1={MAP_WIDTH - 36}
                y1={MAP_PADDING + 34}
                x2={MAP_WIDTH - 36}
                y2={MAP_PADDING + 14}
                strokeWidth={1.5}
              />
              <path
                d={`M${MAP_WIDTH - 36} ${MAP_PADDING + 6} L${MAP_WIDTH - 40.5} ${MAP_PADDING + 15} L${MAP_WIDTH - 36} ${MAP_PADDING + 11.5} L${MAP_WIDTH - 31.5} ${MAP_PADDING + 15} Z`}
              />
              <text
                x={MAP_WIDTH - 36}
                y={MAP_PADDING + 46}
                textAnchor="middle"
                fontSize={10}
                stroke="none"
                className="font-label"
              >
                N
              </text>
            </g>

            {!samePoint && (
              <g aria-hidden="true">
                <line
                  x1={projectedA.x}
                  y1={projectedA.y}
                  x2={projectedB.x}
                  y2={projectedB.y}
                  className="stroke-[var(--accent)] opacity-20"
                  strokeWidth={9}
                  strokeLinecap="round"
                />
                <line
                  x1={projectedA.x}
                  y1={projectedA.y}
                  x2={projectedB.x}
                  y2={projectedB.y}
                  className="stroke-[var(--accent)]"
                  strokeWidth={2.5}
                  strokeDasharray="8 5"
                  strokeLinecap="round"
                />
              </g>
            )}

            {projectedMidpoint && (
              <g aria-hidden="true">
                <circle
                  cx={projectedMidpoint.x}
                  cy={projectedMidpoint.y}
                  r={5}
                  className="fill-[var(--paper-strong)] stroke-[var(--accent)]"
                  strokeWidth={2}
                />
              </g>
            )}

            <g aria-hidden="true">
              <circle
                cx={projectedA.x}
                cy={projectedA.y}
                r={11}
                className="fill-[var(--accent)] opacity-15"
              />
              <circle
                cx={projectedA.x}
                cy={projectedA.y}
                r={5.5}
                className="fill-[var(--accent)] stroke-[var(--paper-strong)]"
                strokeWidth={2}
              />
              <text
                x={labelAX}
                y={projectedA.y + labelAOffsetY}
                textAnchor={projectedA.x > MAP_WIDTH / 2 ? 'end' : 'start'}
                fontSize={12}
                stroke="var(--paper-strong)"
                strokeWidth={3.5}
                paintOrder="stroke"
                className="fill-[var(--ink)] font-editorial font-bold"
              >
                A 出発地
              </text>

              <circle
                cx={projectedB.x}
                cy={projectedB.y}
                r={11}
                className="fill-[var(--ink)] opacity-15"
              />
              <circle
                cx={projectedB.x}
                cy={projectedB.y}
                r={5.5}
                className="fill-[var(--ink)] stroke-[var(--paper-strong)]"
                strokeWidth={2}
              />
              <text
                x={labelBX}
                y={projectedB.y + labelBOffsetY}
                textAnchor={projectedB.x > MAP_WIDTH / 2 ? 'end' : 'start'}
                fontSize={12}
                stroke="var(--paper-strong)"
                strokeWidth={3.5}
                paintOrder="stroke"
                className="fill-[var(--ink)] font-editorial font-bold"
              >
                B 目的地
              </text>
            </g>
          </svg>

          <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] leading-5 text-[var(--ink-soft)]">
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]"
              />
              地点A
            </li>
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--ink)]"
              />
              地点B
            </li>
            {!samePoint && (
              <li className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full border-2 border-[var(--accent)] bg-[var(--paper)]"
                />
                中点
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-px w-5 border-t-2 border-dashed border-[var(--accent)]"
              />
              2地点を結ぶ線
            </li>
          </ul>
        </div>

        <div className="min-w-0">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                地点A
              </dt>
              <dd className="font-editorial mt-1 text-lg">出発地</dd>
              <dd className="mt-2 text-[11px] leading-5 tabular-nums text-[var(--ink-soft)]">
                {formatLatitudeLabel(pointA.lat)}
              </dd>
              <dd className="text-[11px] leading-5 tabular-nums text-[var(--ink-soft)]">
                {formatLongitudeLabel(pointA.lon)}
              </dd>
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <dt className="font-label text-[9px] text-[var(--ink-soft)]">
                地点B
              </dt>
              <dd className="font-editorial mt-1 text-lg">目的地</dd>
              <dd className="mt-2 text-[11px] leading-5 tabular-nums text-[var(--ink-soft)]">
                {formatLatitudeLabel(pointB.lat)}
              </dd>
              <dd className="text-[11px] leading-5 tabular-nums text-[var(--ink-soft)]">
                {formatLongitudeLabel(pointB.lon)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
            グリッドは緯度・経度を正距円筒図法で平面上に割り当てた簡易表示です。地形、海岸線、道路、実際の移動経路は反映していません。
          </p>
        </div>
      </div>
    </>
  );
}

export function CoordinateDistance() {
  const [latA, setLatA] = useState(DEFAULT_POINT_A.lat);
  const [lonA, setLonA] = useState(DEFAULT_POINT_A.lon);
  const [latB, setLatB] = useState(DEFAULT_POINT_B.lat);
  const [lonB, setLonB] = useState(DEFAULT_POINT_B.lon);

  const latAField = validateCoordinate(latA, '地点Aの緯度', -90, 90);
  const lonAField = validateCoordinate(lonA, '地点Aの経度', -180, 180);
  const latBField = validateCoordinate(latB, '地点Bの緯度', -90, 90);
  const lonBField = validateCoordinate(lonB, '地点Bの経度', -180, 180);

  const pointA: Point | null =
    latAField.value !== null && lonAField.value !== null
      ? { lat: latAField.value, lon: lonAField.value }
      : null;
  const pointB: Point | null =
    latBField.value !== null && lonBField.value !== null
      ? { lat: latBField.value, lon: lonBField.value }
      : null;
  const samePoint =
    pointA !== null && pointB !== null && isSamePoint(pointA, pointB);
  const distanceKm =
    pointA !== null && pointB !== null
      ? calculateDistanceKm(pointA, pointB)
      : null;
  const distanceMeters = distanceKm !== null ? distanceKm * 1000 : null;
  const initialBearing =
    pointA !== null && pointB !== null
      ? calculateInitialBearing(pointA, pointB)
      : null;
  const direction =
    initialBearing !== null ? bearingToDirection(initialBearing) : null;
  const midpoint =
    pointA !== null && pointB !== null
      ? calculateMidpoint(pointA, pointB)
      : null;

  const distanceDisplay =
    distanceKm !== null ? distanceFormatter.format(distanceKm) : null;
  const distanceMetersDisplay =
    distanceMeters !== null ? formatInteger(distanceMeters) : null;
  const bearingDisplay =
    initialBearing !== null ? bearingFormatter.format(initialBearing) : null;
  const midpointLatDisplay =
    midpoint !== null ? formatLatitudeLabel(midpoint.lat) : null;
  const midpointLonDisplay =
    midpoint !== null ? formatLongitudeLabel(midpoint.lon) : null;

  let statusMessage =
    'すべての緯度と経度に有効な数値を入力すると、距離・方位・中点を表示します。';

  if (distanceDisplay !== null && distanceMetersDisplay !== null) {
    if (initialBearing === null || direction === null) {
      statusMessage = `地点Aと地点Bは同一の座標です。距離は0メートル、中点も同じ座標です。`;
    } else if (
      midpointLatDisplay !== null &&
      midpointLonDisplay !== null &&
      bearingDisplay !== null
    ) {
      statusMessage = `地点Aから地点Bまでの距離は約${distanceDisplay}キロメートル、初期方位は${direction}で約${bearingDisplay}度です。中点は${midpointLatDisplay}、${midpointLonDisplay}です。`;
    } else {
      statusMessage = `地点Aから地点Bまでの距離は約${distanceDisplay}キロメートル、初期方位は${direction}で約${bearingDisplay}度です。中点は算出できませんでした。`;
    }
  }

  const swapPoints = () => {
    setLatA(latB);
    setLonA(lonB);
    setLatB(latA);
    setLonB(lonA);
  };

  const fillExample = () => {
    setLatA(EXAMPLE_POINT_A.lat);
    setLonA(EXAMPLE_POINT_A.lon);
    setLatB(EXAMPLE_POINT_B.lat);
    setLonB(EXAMPLE_POINT_B.lon);
  };

  const resetForm = () => {
    setLatA(DEFAULT_POINT_A.lat);
    setLonA(DEFAULT_POINT_A.lon);
    setLatB(DEFAULT_POINT_B.lat);
    setLonB(DEFAULT_POINT_B.lon);
  };

  return (
    <section className="grid min-w-0 gap-5" aria-label="緯度経度距離・方位計算">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby="coordinate-distance-form-heading"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Input</p>
              <h2
                id="coordinate-distance-form-heading"
                className="font-editorial mt-1 text-xl"
              >
                2地点の座標を入力
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
            地点Aと地点Bの緯度・経度を入力します。北緯・東経を正、南緯・西経を負の値で指定してください。入力内容は自動で反映されます。
          </p>

          <fieldset className="mt-5 min-w-0">
            <legend className="w-full">
              <span className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2">
                <span className="font-editorial flex items-center gap-2 text-base">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-strong)] font-label text-[10px]"
                  >
                    A
                  </span>
                  地点A（出発地）
                </span>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  Lat / Lon
                </span>
              </span>
            </legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <CoordinateInput
                id="coordinate-distance-lat-a"
                name="latitude-a"
                label="緯度"
                value={latA}
                min={-90}
                max={90}
                placeholder="例: 35.681236"
                error={latAField.error}
                onChange={setLatA}
              />
              <CoordinateInput
                id="coordinate-distance-lon-a"
                name="longitude-a"
                label="経度"
                value={lonA}
                min={-180}
                max={180}
                placeholder="例: 139.767125"
                error={lonAField.error}
                onChange={setLonA}
              />
            </div>
          </fieldset>

          <div className="mt-5 flex items-center gap-3">
            <span aria-hidden="true" className="h-px flex-1 bg-[var(--line)]" />
            <button
              type="button"
              onClick={swapPoints}
              className="paper-button rounded-sm px-4 py-2 text-xs"
            >
              地点Aと地点Bを入れ替える
            </button>
            <span aria-hidden="true" className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <fieldset className="mt-5 min-w-0">
            <legend className="w-full">
              <span className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2">
                <span className="font-editorial flex items-center gap-2 text-base">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-strong)] font-label text-[10px]"
                  >
                    B
                  </span>
                  地点B（目的地）
                </span>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">
                  Lat / Lon
                </span>
              </span>
            </legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <CoordinateInput
                id="coordinate-distance-lat-b"
                name="latitude-b"
                label="緯度"
                value={latB}
                min={-90}
                max={90}
                placeholder="例: 34.693725"
                error={latBField.error}
                onChange={setLatB}
              />
              <CoordinateInput
                id="coordinate-distance-lon-b"
                name="longitude-b"
                label="経度"
                value={lonB}
                min={-180}
                max={180}
                placeholder="例: 135.502254"
                error={lonBField.error}
                onChange={setLonB}
              />
            </div>
          </fieldset>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={fillExample}
              className="paper-button rounded-sm px-4 py-2 text-xs"
            >
              例（札幌から那覇）を入力
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="paper-button rounded-sm px-4 py-2 text-xs"
            >
              リセット
            </button>
            <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
              入力内容は保存・送信されません。
            </p>
          </div>
        </form>

        <section
          aria-labelledby="coordinate-distance-result-heading"
          className="paper-panel min-w-0 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker text-[9px]">Result</p>
              <h2
                id="coordinate-distance-result-heading"
                className="font-editorial mt-1 text-xl"
              >
                距離・方位・中点
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
                  2地点間の距離
                </p>
                {distanceDisplay !== null ? (
                  <>
                    <p className="font-editorial mt-1 text-4xl leading-none tabular-nums">
                      {distanceDisplay}{' '}
                      <span className="text-base">km</span>
                    </p>
                    <p className="mt-2 text-sm tabular-nums text-[var(--ink-soft)]">
                      {distanceMetersDisplay} m
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                    4つの座標を入力すると距離を表示します。
                  </p>
                )}
              </div>
              <p className="font-label shrink-0 text-right text-[9px] text-[var(--ink-soft)]">
                Haversine
                <br />
                Distance
              </p>
            </div>
            <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              {pointA !== null && pointB !== null
                ? `地点A（${formatLatitudeLabel(pointA.lat)}、${formatLongitudeLabel(pointA.lon)}）から地点B（${formatLatitudeLabel(pointB.lat)}、${formatLongitudeLabel(pointB.lon)}）まで`
                : '地点Aから地点Bまでの距離'}
            </p>
          </div>

          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                初期方位（16方位）
              </p>
              {direction !== null && bearingDisplay !== null ? (
                <>
                  <p className="font-editorial mt-1 text-2xl leading-tight">
                    {direction}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                    約 {bearingDisplay}°（北を0°として時計回り）
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  {samePoint
                    ? '同一地点のため方位はありません。'
                    : '4つの座標を入力すると表示されます。'}
                </p>
              )}
            </div>

            <div className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-4">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                中点の緯度・経度
              </p>
              {midpointLatDisplay !== null &&
              midpointLonDisplay !== null ? (
                <>
                  <p className="font-editorial mt-1 text-lg leading-tight tabular-nums">
                    {midpointLatDisplay}
                  </p>
                  <p className="font-editorial text-lg leading-tight tabular-nums">
                    {midpointLonDisplay}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  4つの座標を入力すると表示されます。
                </p>
              )}
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
            距離はハバーサイン式、地球半径6,371.0088kmの球体として計算しています。方位は地点Aから地点Bへ向かう初期方位の目安です。
          </p>

          <div
            role="note"
            className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3"
          >
            <p className="text-xs font-bold text-[var(--accent)]">
              近似計算について
            </p>
            <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
              表示される距離は地球を球体とみなした近似値です。測地系の違い、標高、地形、地球の楕円体としての扁平は反映しません。航海・航空・測量・法的な境界の判断には使用しないでください。
            </p>
          </div>
        </section>
      </div>

      <section
        aria-labelledby="coordinate-distance-map-heading"
        className="paper-panel min-w-0 p-4 sm:p-6"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Map</p>
            <h2
              id="coordinate-distance-map-heading"
              className="font-editorial mt-1 text-xl"
            >
              座標グリッド
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            03 / 03
          </span>
        </div>

        {pointA !== null && pointB !== null ? (
          <CoordinateMap
            pointA={pointA}
            pointB={pointB}
            midpoint={midpoint}
            samePoint={samePoint}
          />
        ) : (
          <div className="mt-4 border border-[var(--line)] bg-[var(--paper)] p-6 text-center">
            <p className="text-sm leading-6 text-[var(--ink-soft)]">
              有効な緯度と経度を入力すると、2地点と中点を座標グリッドに表示します。
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
