export type Matrix = number[][];

export interface OlsResult {
  coefficients: number[];
  standardErrors: number[];
  tValues: number[];
  pValues: number[];
  rSquared: number;
  adjustedRSquared: number;
  residuals: number[];
  predictions: number[];
  sse: number;
  sst: number;
  df: number;
  n: number;
  k: number;
  design: Matrix;
}

export function parseNumberList(raw: string): { values: number[]; invalid: string[] } {
  const tokens = raw
    .split(/[\s,、，]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const values: number[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    const value = Number(token);
    if (Number.isFinite(value)) values.push(value);
    else invalid.push(token);
  }
  return { values, invalid };
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function mean(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

export function variance(values: number[], sample = true): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  const squared = values.reduce((total, value) => total + (value - average) ** 2, 0);
  return squared / (sample ? values.length - 1 : values.length);
}

export function standardDeviation(values: number[], sample = true): number {
  return Math.sqrt(Math.max(0, variance(values, sample)));
}

export function covariance(x: number[], y: number[], sample = true): number {
  const length = Math.min(x.length, y.length);
  if (length < 2) return 0;
  const meanX = mean(x.slice(0, length));
  const meanY = mean(y.slice(0, length));
  let total = 0;
  for (let index = 0; index < length; index += 1) total += (x[index] - meanX) * (y[index] - meanY);
  return total / (sample ? length - 1 : length);
}

export function pearson(x: number[], y: number[]): number | null {
  const length = Math.min(x.length, y.length);
  if (length < 2) return null;
  const sx = standardDeviation(x.slice(0, length));
  const sy = standardDeviation(y.slice(0, length));
  if (sx === 0 || sy === 0) return null;
  return covariance(x, y) / (sx * sy);
}

export function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

export function quantile(values: number[], probability: number): number {
  if (values.length === 0) return Number.NaN;
  const ordered = sorted(values);
  const p = Math.min(1, Math.max(0, probability));
  const position = (ordered.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return ordered[lower];
  const weight = position - lower;
  return ordered[lower] * (1 - weight) + ordered[upper] * weight;
}

export function median(values: number[]): number {
  return quantile(values, 0.5);
}

export function transpose(matrix: Matrix): Matrix {
  if (matrix.length === 0) return [];
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

export function multiplyMatrices(a: Matrix, b: Matrix): Matrix {
  if (a.length === 0 || b.length === 0) return [];
  if (a[0].length !== b.length) throw new Error('Matrix dimensions do not match');
  return a.map((row) =>
    b[0].map((_, column) => row.reduce((total, value, index) => total + value * b[index][column], 0))
  );
}

export function multiplyMatrixVector(matrix: Matrix, vector: number[]): number[] {
  return matrix.map((row) => row.reduce((total, value, index) => total + value * vector[index], 0));
}

export function identity(size: number): Matrix {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => (row === column ? 1 : 0))
  );
}

export function invert(matrix: Matrix): Matrix | null {
  const size = matrix.length;
  if (size === 0 || matrix.some((row) => row.length !== size)) return null;
  const augmented = matrix.map((row, index) => [...row, ...identity(size)[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) return null;
    if (pivot !== column) [augmented[pivot], augmented[column]] = [augmented[column], augmented[pivot]];

    const pivotValue = augmented[column][column];
    for (let j = 0; j < size * 2; j += 1) augmented[column][j] /= pivotValue;

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      if (factor === 0) continue;
      for (let j = 0; j < size * 2; j += 1) augmented[row][j] -= factor * augmented[column][j];
    }
  }

  return augmented.map((row) => row.slice(size));
}

export function ols(
  predictors: Matrix,
  outcome: number[],
  options: { intercept?: boolean } = {}
): OlsResult | null {
  const intercept = options.intercept ?? true;
  const n = outcome.length;
  if (n === 0 || predictors.length !== n) return null;
  const design = intercept ? predictors.map((row) => [1, ...row]) : predictors;
  const k = design[0]?.length ?? 0;
  if (k === 0 || n <= k) return null;

  const xt = transpose(design);
  const xtx = multiplyMatrices(xt, design);
  const xty = multiplyMatrixVector(xt, outcome);
  const inverse = invert(xtx);
  if (!inverse) return null;
  const coefficients = multiplyMatrixVector(inverse, xty);
  const predictions = multiplyMatrixVector(design, coefficients);
  const residuals = outcome.map((value, index) => value - predictions[index]);
  const average = mean(outcome);
  const sse = residuals.reduce((total, value) => total + value ** 2, 0);
  const sst = outcome.reduce((total, value) => total + (value - average) ** 2, 0);
  const df = n - k;
  const mse = sse / df;
  const standardErrors = coefficients.map((_, index) => Math.sqrt(Math.max(0, mse * inverse[index][index])));
  const tValues = coefficients.map((value, index) => (standardErrors[index] === 0 ? 0 : value / standardErrors[index]));
  const pValues = tValues.map((value) => 2 * (1 - tCdf(Math.abs(value), df)));

  return {
    coefficients,
    standardErrors,
    tValues,
    pValues,
    rSquared: sst === 0 ? 0 : 1 - sse / sst,
    adjustedRSquared: sst === 0 ? 0 : 1 - (sse / sst) * ((n - 1) / df),
    residuals,
    predictions,
    sse,
    sst,
    df,
    n,
    k,
    design,
  };
}

function logGamma(value: number): number {
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = value;
  let y = value;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let series = 1.000000000190015;
  for (const coefficient of coefficients) {
    y += 1;
    series += coefficient / y;
  }
  return -tmp + Math.log((2.5066282746310005 * series) / x);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 200;
  const epsilon = 3e-12;
  const tiny = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const m2 = 2 * iteration;
    let aa = (iteration * (b - iteration) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + iteration) * (qab + iteration) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return h;
}

export function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (front * betaContinuedFraction(a, b, x)) / a;
  return 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

function regularizedGammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let term = 1 / a;
    let total = term;
    for (let iteration = 1; iteration < 200; iteration += 1) {
      term *= x / (a + iteration);
      total += term;
      if (Math.abs(term) < Math.abs(total) * 1e-12) break;
    }
    return total * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }

  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let iteration = 1; iteration < 200; iteration += 1) {
    const an = -iteration * (iteration - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const polynomial =
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t);
  const erf = 1 - polynomial * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

export function tCdf(t: number, df: number): number {
  if (df <= 0) return Number.NaN;
  const x = df / (df + t * t);
  const ib = regularizedIncompleteBeta(df / 2, 0.5, x);
  return t > 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

export function fCdf(f: number, df1: number, df2: number): number {
  if (f <= 0) return 0;
  if (df1 <= 0 || df2 <= 0) return Number.NaN;
  return regularizedIncompleteBeta(df1 / 2, df2 / 2, (df1 * f) / (df1 * f + df2));
}

export function chiSquareCdf(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df <= 0) return Number.NaN;
  return regularizedGammaP(df / 2, x / 2);
}

export function pFromT(t: number, df: number): number {
  return 2 * (1 - tCdf(Math.abs(t), df));
}

export function pFromF(f: number, df1: number, df2: number): number {
  return 1 - fCdf(f, df1, df2);
}

export function pFromChiSquare(x: number, df: number): number {
  return 1 - chiSquareCdf(x, df);
}

export function jacobiEigen(matrix: Matrix, tolerance = 1e-10, maxIterations = 100): { values: number[]; vectors: Matrix } | null {
  const n = matrix.length;
  if (n === 0 || matrix.some((row) => row.length !== n)) return null;
  const a = matrix.map((row) => [...row]);
  const vectors = identity(n);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let p = 0;
    let q = 1;
    let max = 0;
    for (let row = 0; row < n; row += 1) {
      for (let column = row + 1; column < n; column += 1) {
        if (Math.abs(a[row][column]) > max) {
          max = Math.abs(a[row][column]);
          p = row;
          q = column;
        }
      }
    }
    if (max < tolerance) break;
    const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    for (let index = 0; index < n; index += 1) {
      const aip = a[index][p];
      const aiq = a[index][q];
      a[index][p] = cosine * aip - sine * aiq;
      a[index][q] = sine * aip + cosine * aiq;
    }
    for (let index = 0; index < n; index += 1) {
      const api = a[p][index];
      const aqi = a[q][index];
      a[p][index] = cosine * api - sine * aqi;
      a[q][index] = sine * api + cosine * aqi;
    }
    for (let index = 0; index < n; index += 1) {
      const vip = vectors[index][p];
      const viq = vectors[index][q];
      vectors[index][p] = cosine * vip - sine * viq;
      vectors[index][q] = sine * vip + cosine * viq;
    }
  }

  return { values: a.map((row, index) => row[index]), vectors };
}

export function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  errors: string[];
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseDelimitedTable(raw: string): ParsedTable {
  const lines = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const errors: string[] = [];
  if (lines.length === 0) return { headers: [], rows: [], errors: ['データを入力してください。'] };

  const candidates = [',', '\t', ';'];
  const firstLine = lines[0];
  const delimiter = candidates
    .map((candidate) => ({ candidate, count: firstLine.split(candidate).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.candidate ?? ',';

  const headers = parseDelimitedLine(firstLine, delimiter);
  if (headers.length < 2) errors.push('ヘッダーは2列以上で入力してください。');
  const rows: string[][] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const row = parseDelimitedLine(lines[index], delimiter);
    if (row.length !== headers.length) {
      errors.push(`${index + 1}行目の列数がヘッダーと一致しません。`);
    }
    rows.push(row);
  }
  return { headers, rows, errors };
}
