"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CheckIcon, ClipboardIcon, TrashIcon } from '@heroicons/react/24/outline';
import { copyToClipboard } from '@/lib/clipboard';

const MAX_INPUT_LENGTH = 100_000;
const numberFormatter = new Intl.NumberFormat('ja-JP');

const CJK_CHAR_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
const CJK_RUN_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu;
const LATIN_WORD_PATTERN =
  /[\p{Script=Latin}\p{N}]+(?:['’\u2010-\u2015-][\p{Script=Latin}\p{N}]+)*/gu;
const OTHER_WORD_CHAR_PATTERN = /[\p{L}\p{N}]+/gu;

const POST_TARGETS = [
  { limit: 140, label: '短い投稿・ひとこと', note: '短めのメモや返信の目安' },
  { limit: 280, label: 'SNS投稿', note: '標準的な長さの投稿の目安' },
  { limit: 400, label: '自己紹介・紹介文', note: '少し長めの文章の目安' },
  { limit: 1_000, label: '長文・記事概要', note: 'まとまった文章の目安' },
] as const;

type TextMetrics = {
  codePoints: number;
  utf16Units: number;
  lines: number;
  words: number;
  bytes: number;
  readingSeconds: number;
};

const wordSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('ja', { granularity: 'word' })
    : null;

const textEncoder = new TextEncoder();

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

function clampCodePoints(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }

  let index = 0;
  let count = 0;

  while (index < text.length && count < max) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1);
      index += next >= 0xdc00 && next <= 0xdfff ? 2 : 1;
    } else {
      index += 1;
    }
    count += 1;
  }

  return index < text.length ? text.slice(0, index) : text;
}

function countLines(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  let lines = 1;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code === 0x0a) {
      lines += 1;
    } else if (code === 0x0d) {
      if (text.charCodeAt(index + 1) === 0x0a) {
        index += 1;
      }
      lines += 1;
    }
  }

  return lines;
}

function countWords(text: string): number {
  if (text.trim().length === 0) {
    return 0;
  }

  if (wordSegmenter) {
    let words = 0;
    for (const segment of wordSegmenter.segment(text)) {
      if (segment.isWordLike) {
        words += 1;
      }
    }
    return words;
  }

  const latinWords = text.match(LATIN_WORD_PATTERN)?.length ?? 0;
  const cjkRuns = text.match(CJK_RUN_PATTERN)?.length ?? 0;
  const otherRuns =
    text
      .replace(CJK_RUN_PATTERN, ' ')
      .replace(LATIN_WORD_PATTERN, ' ')
      .match(OTHER_WORD_CHAR_PATTERN)?.length ?? 0;

  return latinWords + cjkRuns + otherRuns;
}

function getReadingSeconds(text: string, codePoints: number): number {
  if (codePoints === 0) {
    return 0;
  }

  const japaneseChars = text.match(CJK_CHAR_PATTERN)?.length ?? 0;
  const latinWords = text.match(LATIN_WORD_PATTERN)?.length ?? 0;
  const otherChars = countCodePoints(
    text.replace(
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Latin}\p{N}\s\p{P}\p{S}]/gu,
      '',
    ),
  );
  const seconds =
    (japaneseChars / 500) * 60 + (latinWords / 200) * 60 + (otherChars / 500) * 60;

  if (seconds <= 0) {
    const visibleChars = countCodePoints(text.replace(/\s+/gu, ''));
    return visibleChars > 0 ? 1 : 0;
  }

  return Math.max(1, Math.ceil(seconds));
}

function computeMetrics(text: string): TextMetrics {
  const codePoints = countCodePoints(text);

  return {
    codePoints,
    utf16Units: text.length,
    lines: countLines(text),
    words: countWords(text),
    bytes: textEncoder.encode(text).length,
    readingSeconds: getReadingSeconds(text, codePoints),
  };
}

function formatReadingTime(seconds: number): string {
  if (seconds <= 0) {
    return '0秒';
  }

  if (seconds < 60) {
    return `${seconds}秒`;
  }

  const totalMinutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${hours}時間` : `${hours}時間${minutes}分`;
  }

  return remainingSeconds === 0 ? `${totalMinutes}分` : `${totalMinutes}分${remainingSeconds}秒`;
}

function buildSummary(metrics: TextMetrics): string {
  const targetLines = POST_TARGETS.map((target) => {
    const remaining = target.limit - metrics.codePoints;
    const status =
      remaining >= 0
        ? `あと${numberFormatter.format(remaining)}字`
        : `${numberFormatter.format(Math.abs(remaining))}字超過`;
    return `${target.limit}字の目安: ${status}`;
  });

  return [
    '文字数カウンター 集計結果',
    `文字数（Unicodeコードポイント）: ${numberFormatter.format(metrics.codePoints)}`,
    `UTF-16コード単位: ${numberFormatter.format(metrics.utf16Units)}`,
    `行数: ${numberFormatter.format(metrics.lines)}`,
    `単語数（概算）: ${numberFormatter.format(metrics.words)}`,
    `UTF-8バイト数: ${numberFormatter.format(metrics.bytes)}`,
    `読了時間（概算）: ${formatReadingTime(metrics.readingSeconds)}`,
    '',
    'SNS・長文投稿の目安',
    ...targetLines,
  ].join('\n');
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="min-w-0 border border-[var(--line)] bg-[var(--paper-strong)] p-3 sm:p-4">
      <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">{label}</dt>
      <dd className="font-editorial mt-1 break-words text-xl leading-tight tabular-nums sm:text-2xl">
        {value}
      </dd>
      <dd className="mt-1 text-[10px] leading-4 text-[var(--ink-soft)]">{note}</dd>
    </div>
  );
}

export function CharacterCounter() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const deferredText = useDeferredValue(text);
  const metrics = useMemo(() => computeMetrics(deferredText), [deferredText]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopySummary = async () => {
    if (text.length === 0) {
      return;
    }

    try {
      await copyToClipboard(buildSummary(computeMetrics(text)));
      setCopyError('');
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError('コピーできませんでした。ブラウザのクリップボード許可を確認してください。');
    }
  };

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(clampCodePoints(event.target.value, MAX_INPUT_LENGTH));
    setCopied(false);
    setCopyError('');
  };

  const handleClear = () => {
    setText('');
    setCopied(false);
    setCopyError('');
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-5">
      <section className="paper-panel p-4 sm:p-7" aria-labelledby="character-counter-input-heading">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker">Input</p>
            <h2 id="character-counter-input-heading" className="font-editorial mt-1 text-2xl">
              テキストを入力
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">
            最大 {numberFormatter.format(MAX_INPUT_LENGTH)} 文字
          </span>
        </div>

        <div className="mt-4">
          <label htmlFor="character-counter-input" className="sr-only">
            カウントするテキスト
          </label>
          <textarea
            ref={textareaRef}
            id="character-counter-input"
            value={text}
            onChange={handleTextChange}
            maxLength={MAX_INPUT_LENGTH * 2}
            aria-describedby="character-counter-help"
            placeholder="ここに文章を入力するか、コピーしたテキストを貼り付けてください。"
            spellCheck={false}
            className="field-paper h-52 resize-y px-3 py-3 text-sm leading-7 sm:h-64"
          />
          <div
            id="character-counter-help"
            className="mt-2 flex flex-col gap-1 text-[11px] leading-5 text-[var(--ink-soft)] sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <p className="min-w-0">
              最大{numberFormatter.format(MAX_INPUT_LENGTH)}文字（Unicodeコードポイント）まで。内容はブラウザ内だけで集計され、送信・保存されません。
            </p>
            <p className="shrink-0 font-label text-[9px] tabular-nums">
              {numberFormatter.format(metrics.codePoints)} / {numberFormatter.format(MAX_INPUT_LENGTH)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleCopySummary}
            disabled={text.length === 0}
            className="paper-button-primary min-h-11 flex-1 px-4 py-3 text-sm"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ClipboardIcon className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? 'コピーしました' : '集計結果をコピー'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={text.length === 0}
            className="paper-button min-h-11 px-4 py-3 text-sm sm:w-44"
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
            入力をクリア
          </button>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {copied ? '集計結果をコピーしました。' : ''}
        </p>

        {copyError && (
          <p
            role="alert"
            className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent)]"
          >
            {copyError}
          </p>
        )}
      </section>

      <section className="paper-panel-flat p-4 sm:p-7" aria-labelledby="character-counter-counts-heading">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker">Live Count</p>
            <h2 id="character-counter-counts-heading" className="font-editorial mt-1 text-2xl">
              集計結果
            </h2>
          </div>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">Unicode / UTF-8</span>
        </div>

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {`文字数${numberFormatter.format(metrics.codePoints)}、UTF-16コード単位${numberFormatter.format(metrics.utf16Units)}、行数${numberFormatter.format(metrics.lines)}、単語数${numberFormatter.format(metrics.words)}、UTF-8バイト数${numberFormatter.format(metrics.bytes)}、読了時間${formatReadingTime(metrics.readingSeconds)}`}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="col-span-2 min-w-0 border border-[var(--line)] bg-[var(--paper-muted)] p-3 sm:col-span-1 sm:p-4">
            <dt className="font-label text-[9px] leading-4 text-[var(--ink-soft)]">文字数</dt>
            <dd className="font-editorial mt-1 break-words text-3xl leading-none tabular-nums sm:text-4xl">
              {numberFormatter.format(metrics.codePoints)}
            </dd>
            <dd className="mt-2 text-[10px] leading-4 text-[var(--ink-soft)]">Unicodeコードポイント</dd>
          </div>
          <StatCard
            label="UTF-16コード単位"
            value={numberFormatter.format(metrics.utf16Units)}
            note="JavaScript内部の単位"
          />
          <StatCard label="行数" value={numberFormatter.format(metrics.lines)} note="改行で区切った行" />
          <StatCard
            label="単語数（概算）"
            value={numberFormatter.format(metrics.words)}
            note="日本語・英語の目安"
          />
          <StatCard
            label="UTF-8バイト数"
            value={numberFormatter.format(metrics.bytes)}
            note="TextEncoderで算出"
          />
          <StatCard
            label="読了時間（概算）"
            value={formatReadingTime(metrics.readingSeconds)}
            note="日本語500字/分・英語200語/分で概算"
          />
        </dl>

        <p className="mt-3 text-[10px] leading-5 text-[var(--ink-soft)]">
          文字数はUnicodeコードポイント、UTF-16はJavaScript内部のコード単位、UTF-8バイト数はTextEncoderで算出しています。絵文字や結合文字は数え方が異なる場合があります。
        </p>
      </section>

      <section className="paper-panel-flat p-4 sm:p-7" aria-labelledby="character-counter-targets-heading">
        <div className="border-b border-[var(--line)] pb-3">
          <p className="paper-kicker">Post Length</p>
          <h2 id="character-counter-targets-heading" className="font-editorial mt-1 text-2xl">
            SNS・長文投稿の目安
          </h2>
          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            入力した文字数を140字・280字・400字・1000字と比較します。実際の上限や数え方はサービスごとに異なるため、目安としてお使いください。
          </p>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {POST_TARGETS.map((target) => {
            const remaining = target.limit - metrics.codePoints;
            const percent = Math.min(100, (metrics.codePoints / target.limit) * 100);
            const isOver = remaining < 0;

            return (
              <li
                key={target.limit}
                className="min-w-0 border border-[var(--line)] bg-[var(--paper-strong)] p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="paper-chip shrink-0 px-2 py-0.5 font-label text-[9px]">
                    {target.limit}字
                  </span>
                  <span
                    className={`text-right font-label text-[9px] leading-4 ${
                      isOver ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]'
                    }`}
                  >
                    {isOver
                      ? `${numberFormatter.format(Math.abs(remaining))}字超過`
                      : `あと${numberFormatter.format(remaining)}字`}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold leading-5">{target.label}</p>
                <p className="text-[10px] leading-4 text-[var(--ink-soft)]">{target.note}</p>
                <div
                  className="mt-2 h-2 w-full overflow-hidden border border-[var(--line)] bg-[var(--paper-muted)]"
                  role="progressbar"
                  aria-label={`${target.limit}字の目安に対する入力文字数`}
                  aria-valuemin={0}
                  aria-valuemax={target.limit}
                  aria-valuenow={Math.min(metrics.codePoints, target.limit)}
                  aria-valuetext={`${numberFormatter.format(metrics.codePoints)}文字 / ${target.limit}文字`}
                >
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-1.5 text-right font-label text-[9px] tabular-nums text-[var(--ink-soft)]">
                  {numberFormatter.format(metrics.codePoints)} / {target.limit}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
