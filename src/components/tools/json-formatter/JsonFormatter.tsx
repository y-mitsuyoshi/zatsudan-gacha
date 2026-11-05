"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";

const MAX_INPUT_BYTES = 1_000_000;
const LIVE_VALIDATION_DELAY_MS = 350;
const COPY_NOTICE_DURATION_MS = 3_500;
const MAX_FORMAT_DEPTH = 128;
const MAX_FORMATTED_CHARS = 12_000_000;

type IndentStyle = "2" | "4" | "tab";
type StatusKind = "idle" | "valid" | "invalid" | "limit";

type JsonStatus = {
  kind: StatusKind;
  label: string;
  message: string;
  detail?: string;
};

type ParseResult =
  | { ok: true; value: unknown; status: JsonStatus }
  | { ok: false; status: JsonStatus };

type FormatResult =
  | { ok: true; output: string }
  | { ok: false; reason: "depth" | "size" };

type ErrorLocation = {
  position?: number;
  line?: number;
  column?: number;
};

const IDLE_STATUS: JsonStatus = {
  kind: "idle",
  label: "入力待ち",
  message: "JSONを入力すると、ここに検証結果が表示されます。",
};

const SAMPLE_JSON = `{
  "tool": "JSON整形・検証",
  "slug": "/json-formatter",
  "features": ["整形", "圧縮", "検証"],
  "unicode": "日本語やUnicodeもそのまま扱えます",
  "nested": {
    "enabled": true,
    "limitBytes": 1000000,
    "ratio": 0.75
  },
  "items": [
    { "id": 1, "name": "りんご" },
    { "id": 2, "name": "みかん" }
  ]
}`;

const INDENT_OPTIONS: { value: IndentStyle; label: string }[] = [
  { value: "2", label: "2スペース" },
  { value: "4", label: "4スペース" },
  { value: "tab", label: "タブ" },
];

function getUtf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function countCodePoints(text: string): number {
  let count = 0;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        index += 1;
      }
    }
    count += 1;
  }

  return count;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function getIndentUnit(style: IndentStyle): string {
  if (style === "tab") {
    return "\t";
  }
  return " ".repeat(style === "2" ? 2 : 4);
}

function tokenizeJson(text: string): string[] {
  const tokens: string[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      index += 1;
      continue;
    }

    if (char === '"') {
      const start = index;
      index += 1;

      while (index < text.length) {
        if (text[index] === "\\") {
          index += 2;
        } else if (text[index] === '"') {
          index += 1;
          break;
        } else {
          index += 1;
        }
      }

      tokens.push(text.slice(start, index));
      continue;
    }

    if (
      char === "{" ||
      char === "}" ||
      char === "[" ||
      char === "]" ||
      char === ":" ||
      char === ","
    ) {
      tokens.push(char);
      index += 1;
      continue;
    }

    const start = index;

    while (index < text.length) {
      const next = text[index];
      if (
        next === " " ||
        next === "\t" ||
        next === "\n" ||
        next === "\r" ||
        next === "{" ||
        next === "}" ||
        next === "[" ||
        next === "]" ||
        next === ":" ||
        next === ","
      ) {
        break;
      }
      index += 1;
    }

    tokens.push(text.slice(start, index));
  }

  return tokens;
}

function formatJsonText(text: string, style: IndentStyle): FormatResult {
  const tokens = tokenizeJson(text);
  const indentUnit = getIndentUnit(style);
  const parts: string[] = [];
  let length = 0;
  let depth = 0;

  const append = (chunk: string): boolean => {
    length += chunk.length;
    if (length > MAX_FORMATTED_CHARS) {
      return false;
    }
    parts.push(chunk);
    return true;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previous = index > 0 ? tokens[index - 1] : "";
    const next = index + 1 < tokens.length ? tokens[index + 1] : "";
    let chunk: string;

    if (token === "{" || token === "[") {
      depth += 1;
      if (depth > MAX_FORMAT_DEPTH) {
        return { ok: false, reason: "depth" };
      }
      chunk = next === "}" || next === "]" ? token : `${token}\n${indentUnit.repeat(depth)}`;
    } else if (token === "}" || token === "]") {
      depth = Math.max(0, depth - 1);
      chunk = previous === "{" || previous === "[" ? token : `\n${indentUnit.repeat(depth)}${token}`;
    } else if (token === ",") {
      chunk = `,\n${indentUnit.repeat(depth)}`;
    } else if (token === ":") {
      chunk = ": ";
    } else {
      chunk = token;
    }

    if (!append(chunk)) {
      return { ok: false, reason: "size" };
    }
  }

  return { ok: true, output: parts.join("") };
}

function minifyJsonText(text: string): string {
  return tokenizeJson(text).join("");
}

function describeJsonValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `配列（${value.length}件）`;
  }
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "object":
      return `オブジェクト（${Object.keys(value).length}個のキー）`;
    case "string":
      return `文字列（${countCodePoints(value)}文字）`;
    case "number":
      return Number.isFinite(value) ? `数値（${String(value)}）` : "数値（範囲外）";
    case "boolean":
      return `真偽値（${String(value)}）`;
    default:
      return typeof value;
  }
}

function getLineColumn(text: string, position: number): { line: number; column: number } {
  const before = text.slice(0, Math.max(0, position));
  const lines = before.split(/\r\n|\r|\n/);
  return {
    line: lines.length,
    column: countCodePoints(lines[lines.length - 1] ?? "") + 1,
  };
}

function extractErrorLocation(message: string, text: string): ErrorLocation {
  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  const positionMatch = message.match(/position\s+(\d+)/i);

  if (positionMatch) {
    const position = Number.parseInt(positionMatch[1], 10);
    if (Number.isFinite(position)) {
      const computed = getLineColumn(text, position);
      return {
        position,
        line: computed.line,
        column: computed.column,
      };
    }
  }

  if (lineColumnMatch) {
    const line = Number.parseInt(lineColumnMatch[1], 10);
    const column = Number.parseInt(lineColumnMatch[2], 10);
    if (Number.isFinite(line) && Number.isFinite(column)) {
      return { line, column };
    }
  }

  return {};
}

function formatErrorLocation(location: ErrorLocation, text: string): string {
  if (location.line !== undefined && location.column !== undefined) {
    return `${location.line}行目 ${location.column}文字目付近`;
  }
  if (location.position !== undefined) {
    return `${countCodePoints(text.slice(0, location.position)) + 1}文字目付近`;
  }
  return "位置不明";
}

function explainJsonError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("unexpected end") || normalized.includes("unexpected eof")) {
    return "JSONが途中で終わっています。波括弧・角括弧・引用符の閉じ忘れを確認してください。";
  }
  if (normalized.includes("unexpected non-whitespace character after json")) {
    return "JSONの後ろに余分な文字があります。値の後にコメントや別のデータが続いていないか確認してください。";
  }
  if (normalized.includes("expected property name") || normalized.includes("double-quoted property name")) {
    return "オブジェクトのキー名が必要です。キーはダブルクォートで囲んでください。";
  }
  if (normalized.includes("expected ':'") || normalized.includes("expected colon")) {
    return "キーと値の間にコロン（:）が必要です。";
  }
  if (normalized.includes("expected ',' or '}'")) {
    return "オブジェクトの区切りにカンマが必要か、閉じ波括弧が不足しています。";
  }
  if (normalized.includes("expected ',' or ']'")) {
    return "配列の区切りにカンマが必要か、閉じ角括弧が不足しています。";
  }
  if (normalized.includes("bad control character")) {
    return "文字列の中に改行などの制御文字が含まれています。制御文字はエスケープしてください。";
  }
  if (normalized.includes("bad escaped character") || normalized.includes("invalid escape")) {
    return "文字列内のエスケープが正しくありません。バックスラッシュの使い方を確認してください。";
  }
  if (normalized.includes("unterminated string")) {
    return "文字列が閉じられていません。ダブルクォートの対応を確認してください。";
  }
  if (normalized.includes("unexpected number")) {
    return "数値の形式が正しくありません。先頭の0や小数点、指数の位置を確認してください。";
  }
  if (normalized.includes("unexpected token '}'")) {
    return "オブジェクトの値が不足しているか、余分なカンマがあります。閉じ波括弧の前を確認してください。";
  }
  if (normalized.includes("unexpected token ']'")) {
    return "配列の要素が不足しているか、余分なカンマがあります。閉じ角括弧の前を確認してください。";
  }
  if (
    normalized.includes("unexpected token") ||
    normalized.includes("unexpected character") ||
    normalized.includes("unexpected identifier")
  ) {
    return "JSONとして解釈できない文字があります。ダブルクォート、カンマ、括弧の位置を確認してください。";
  }

  return "JSONを解析できませんでした。構文を確認してください。";
}

function analyzeJson(text: string): ParseResult {
  if (text.trim() === "") {
    return { ok: false, status: IDLE_STATUS };
  }

  try {
    const value: unknown = JSON.parse(text);
    return {
      ok: true,
      value,
      status: {
        kind: "valid",
        label: "有効なJSON",
        message: "JSONとして正しく解析できました。",
        detail: `トップレベル: ${describeJsonValue(value)}`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const location = extractErrorLocation(message, text);
    const locationText = formatErrorLocation(location, text);
    const explanation = explainJsonError(message);

    return {
      ok: false,
      status: {
        kind: "invalid",
        label: "無効なJSON",
        message:
          locationText === "位置不明"
            ? explanation
            : `${locationText}に構文エラーがあります。${explanation}`,
        detail: `ブラウザからのエラー: ${message}`,
      },
    };
  }
}

function statusPanelClass(kind: StatusKind): string {
  switch (kind) {
    case "valid":
      return "border-[var(--teal)] bg-[var(--paper-strong)]";
    case "invalid":
    case "limit":
      return "border-[var(--accent)] bg-[var(--paper-strong)]";
    default:
      return "border-[var(--line)] bg-[var(--paper)]";
  }
}

function statusBadgeClass(kind: StatusKind): string {
  switch (kind) {
    case "valid":
      return "border-[var(--teal)] text-[var(--teal)]";
    case "invalid":
    case "limit":
      return "border-[var(--accent)] text-[var(--accent)]";
    default:
      return "border-[var(--line-strong)] text-[var(--ink-soft)]";
  }
}

function formatFailureStatus(reason: "depth" | "size"): JsonStatus {
  if (reason === "depth") {
    return {
      kind: "limit",
      label: "整形できません",
      message: `JSONの階層が深すぎるため整形できません（上限${MAX_FORMAT_DEPTH}階層）。`,
      detail: "「圧縮する」を使うか、JSONを分割してから整形してください。",
    };
  }

  return {
    kind: "limit",
    label: "出力が大きすぎます",
    message: "整形後の文字数が上限を超えるため表示できません。",
    detail: "「圧縮する」を使うか、JSONを分割してから整形してください。",
  };
}

export function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState<IndentStyle>("2");
  const [status, setStatus] = useState<JsonStatus>(IDLE_STATUS);
  const [copyNotice, setCopyNotice] = useState("");
  const [oversizeBytes, setOversizeBytes] = useState<number | null>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const outputRef = useRef<HTMLTextAreaElement | null>(null);
  const validationTimerRef = useRef<number | null>(null);

  const titleId = useId();
  const inputId = useId();
  const outputId = useId();
  const sizeHelpId = useId();
  const outputHelpId = useId();
  const statusId = useId();
  const indentGroupName = useId();

  const inputBytes = useMemo(() => getUtf8ByteLength(input), [input]);

  const cancelPendingValidation = () => {
    if (validationTimerRef.current !== null) {
      window.clearTimeout(validationTimerRef.current);
      validationTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (oversizeBytes !== null) {
      return;
    }

    if (input.trim() === "") {
      setStatus(IDLE_STATUS);
      return;
    }

    const timer = window.setTimeout(() => {
      if (validationTimerRef.current === timer) {
        validationTimerRef.current = null;
      }
      setStatus(analyzeJson(input).status);
    }, LIVE_VALIDATION_DELAY_MS);

    validationTimerRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (validationTimerRef.current === timer) {
        validationTimerRef.current = null;
      }
    };
  }, [input, oversizeBytes]);

  useEffect(() => {
    if (!copyNotice) {
      return;
    }

    const timer = window.setTimeout(() => setCopyNotice(""), COPY_NOTICE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [copyNotice]);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    const nextBytes = getUtf8ByteLength(nextValue);

    if (nextBytes > MAX_INPUT_BYTES) {
      cancelPendingValidation();
      setOversizeBytes(nextBytes);
      setStatus({
        kind: "limit",
        label: "サイズ超過",
        message: `入力が上限（1,000,000バイト）を超えています。現在は${formatBytes(nextBytes)}です。`,
        detail: "入力内容は反映していません。JSONを分割するか、不要な空白を削除してから貼り付けてください。",
      });
      setCopyNotice("");
      return;
    }

    setOversizeBytes(null);
    setInput(nextValue);
    setOutput("");
    setCopyNotice("");
  };

  const handleFormat = () => {
    cancelPendingValidation();
    const result = analyzeJson(input);
    setCopyNotice("");

    if (!result.ok) {
      setStatus(result.status);
      setOutput("");
      return;
    }

    const formatted = formatJsonText(input, indent);

    if (!formatted.ok) {
      setStatus(formatFailureStatus(formatted.reason));
      setOutput("");
      return;
    }

    setStatus(result.status);
    setOutput(formatted.output);
  };

  const handleMinify = () => {
    cancelPendingValidation();
    const result = analyzeJson(input);
    setCopyNotice("");

    if (!result.ok) {
      setStatus(result.status);
      setOutput("");
      return;
    }

    setStatus(result.status);
    setOutput(minifyJsonText(input));
  };

  const handleValidate = () => {
    cancelPendingValidation();
    const result = analyzeJson(input);
    setStatus(result.status);
    setCopyNotice("");
  };

  const handleSample = () => {
    cancelPendingValidation();
    setOversizeBytes(null);
    setInput(SAMPLE_JSON);
    setOutput("");
    setStatus(IDLE_STATUS);
    setCopyNotice("");
    inputRef.current?.focus();
  };

  const handleClear = () => {
    cancelPendingValidation();
    setOversizeBytes(null);
    setInput("");
    setOutput("");
    setStatus(IDLE_STATUS);
    setCopyNotice("");
    inputRef.current?.focus();
  };

  const handleCopy = async () => {
    if (!output) {
      return;
    }

    let copied = false;

    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(output);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      const node = outputRef.current;
      if (node) {
        try {
          node.focus();
          node.select();
          copied = document.execCommand("copy");
          node.setSelectionRange(0, 0);
        } catch {
          copied = false;
        }
      }
    }

    setCopyNotice(
      copied
        ? "コピーしました。"
        : "コピーできませんでした。出力欄を選択して手動でコピーしてください。",
    );
  };

  return (
    <section className="paper-panel min-w-0 p-4 sm:p-5" aria-labelledby={titleId}>
      <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="paper-kicker">JSON Workbench</p>
          <h2 id={titleId} className="font-editorial mt-1 text-2xl leading-tight">
            整形・圧縮・検証
          </h2>
          <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
            入力はブラウザ内だけで処理します。サーバーへの送信や保存はありません。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSample}
            className="paper-button min-h-9 px-3 py-2 text-[11px]"
          >
            サンプル
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="paper-button min-h-9 px-3 py-2 text-[11px]"
          >
            クリア
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label htmlFor={inputId} className="font-label text-[10px] text-[var(--ink)]">
              JSON入力
            </label>
            <span
              className={`font-label text-[9px] ${
                inputBytes > MAX_INPUT_BYTES * 0.9
                  ? "text-[var(--accent)]"
                  : "text-[var(--ink-soft)]"
              }`}
            >
              {formatBytes(inputBytes)} / 1.00 MB
            </span>
          </div>
          <textarea
            id={inputId}
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            rows={14}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={'{"hello": "world"}'}
            aria-invalid={status.kind === "invalid" || status.kind === "limit" ? true : undefined}
            aria-describedby={`${sizeHelpId} ${statusId}`}
            className="field-paper mt-2 block min-h-56 w-full min-w-0 resize-y p-3 font-mono text-xs leading-6"
          />
          <p id={sizeHelpId} className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
            上限はUTF-8換算で1,000,000バイト（約1MB）。超えた入力は反映しません。
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label htmlFor={outputId} className="font-label text-[10px] text-[var(--ink)]">
              出力（読み取り専用）
            </label>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!output}
              className="paper-button min-h-8 px-3 py-1.5 text-[11px]"
            >
              結果をコピー
            </button>
          </div>
          <textarea
            id={outputId}
            ref={outputRef}
            value={output}
            readOnly
            rows={14}
            spellCheck={false}
            placeholder="整形または圧縮したJSONがここに表示されます。"
            aria-describedby={outputHelpId}
            className="field-paper mt-2 block min-h-56 w-full min-w-0 resize-y bg-[var(--paper)] p-3 font-mono text-xs leading-6"
          />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p id={outputHelpId} className="text-[11px] leading-5 text-[var(--ink-soft)]">
              結果は読み取り専用です。元の入力は変更されません。
            </p>
            <p role="status" aria-live="polite" className="text-[11px] leading-5 text-[var(--ink-soft)]">
              {copyNotice}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <fieldset className="min-w-0">
          <legend className="font-label text-[10px] text-[var(--ink)]">インデント</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {INDENT_OPTIONS.map((option) => (
              <label key={option.value} className="inline-flex cursor-pointer">
                <input
                  type="radio"
                  name={indentGroupName}
                  value={option.value}
                  checked={indent === option.value}
                  onChange={() => setIndent(option.value)}
                  className="peer sr-only"
                />
                <span
                  className={`paper-chip inline-flex min-h-9 items-center px-3 py-2 text-xs font-bold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] ${
                    indent === option.value ? "paper-chip-active" : ""
                  }`}
                >
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleFormat}
            className="paper-button-primary min-h-10 px-4 py-2 text-xs"
          >
            整形する
          </button>
          <button
            type="button"
            onClick={handleMinify}
            className="paper-button min-h-10 px-4 py-2 text-xs"
          >
            圧縮する
          </button>
          <button
            type="button"
            onClick={handleValidate}
            className="paper-button min-h-10 px-4 py-2 text-xs"
          >
            検証する
          </button>
        </div>
      </div>

      <div
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`mt-4 min-w-0 border p-3 ${statusPanelClass(status.kind)}`}
      >
        <div className="flex flex-wrap items-start gap-2">
          <span
            className={`font-label shrink-0 border px-2 py-1 text-[9px] ${statusBadgeClass(status.kind)}`}
          >
            {status.label}
          </span>
          <p className="min-w-0 flex-1 break-words text-xs leading-6 text-[var(--ink)]">
            {status.message}
          </p>
        </div>
        {status.detail ? (
          <p className="mt-2 break-words whitespace-pre-wrap font-mono text-[11px] leading-5 text-[var(--ink-soft)]">
            {status.detail}
          </p>
        ) : null}
      </div>
    </section>
  );
}
