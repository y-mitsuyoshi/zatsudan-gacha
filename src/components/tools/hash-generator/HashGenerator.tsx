'use client';

import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { copyToClipboard } from '@/lib/clipboard';

type Algorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';
type CopyStatus = 'idle' | 'copied' | 'error';

const ALGORITHMS: { value: Algorithm; bits: number; hint: string }[] = [
  {
    value: 'SHA-256',
    bits: 256,
    hint: '一般的な用途向けの標準的な選択肢です。16進数64文字で出力されます。',
  },
  {
    value: 'SHA-384',
    bits: 384,
    hint: 'SHA-512系の長いダイジェストを、より短い出力で利用します。16進数96文字で出力されます。',
  },
  {
    value: 'SHA-512',
    bits: 512,
    hint: 'より長いダイジェストが必要な場合に選びます。16進数128文字で出力されます。',
  },
];

const UNSUPPORTED_MESSAGE =
  'この環境ではWeb Crypto APIを利用できないため、ハッシュを計算できません。HTTPSまたはlocalhostの対応ブラウザでお試しください。';

const COMPUTE_ERROR_MESSAGE =
  'ハッシュの計算中にエラーが発生しました。入力内容を確認し、対応ブラウザで再度お試しください。';

const numberFormatter = new Intl.NumberFormat('ja-JP');

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';

  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }

  return hex;
}

function isAlgorithm(value: string): value is Algorithm {
  return ALGORITHMS.some((algorithm) => algorithm.value === value);
}

export function HashGenerator() {
  const inputId = useId();
  const inputHelpId = useId();
  const inputSectionId = useId();
  const algorithmId = useId();
  const algorithmHelpId = useId();
  const resultSectionId = useId();
  const outputLabelId = useId();
  const errorId = useId();
  const noteHeadingId = useId();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const requestIdRef = useRef(0);

  const [input, setInput] = useState('');
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA-256');
  const [digest, setDigest] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (input.length === 0) {
      setDigest('');
      setError(null);
      setIsComputing(false);
      return;
    }

    let cancelled = false;

    setDigest('');
    setError(null);
    setCopyStatus('idle');
    setIsComputing(true);

    const compute = async () => {
      try {
        const subtle = globalThis.crypto?.subtle;
        if (!subtle || typeof subtle.digest !== 'function' || typeof TextEncoder === 'undefined') {
          if (!cancelled && requestIdRef.current === requestId) {
            setError(UNSUPPORTED_MESSAGE);
          }
          return;
        }

        const encoded = new TextEncoder().encode(input);
        const buffer = await subtle.digest(algorithm, encoded);

        if (!cancelled && requestIdRef.current === requestId) {
          setDigest(toHex(buffer));
        }
      } catch {
        if (!cancelled && requestIdRef.current === requestId) {
          setError(COMPUTE_ERROR_MESSAGE);
        }
      } finally {
        if (!cancelled && requestIdRef.current === requestId) {
          setIsComputing(false);
        }
      }
    };

    void compute();

    return () => {
      cancelled = true;
    };
  }, [input, algorithm]);

  const selectedAlgorithm =
    ALGORITHMS.find((item) => item.value === algorithm) ?? ALGORITHMS[0];

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextInput = event.target.value;
    if (nextInput === input) {
      return;
    }

    requestIdRef.current += 1;
    setInput(nextInput);
    setDigest('');
    setError(null);
    setIsComputing(nextInput.length > 0);
    setCopyStatus('idle');
  };

  const handleAlgorithmChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextAlgorithm = event.target.value;
    if (!isAlgorithm(nextAlgorithm) || nextAlgorithm === algorithm) {
      return;
    }

    requestIdRef.current += 1;
    setAlgorithm(nextAlgorithm);
    setDigest('');
    setError(null);
    setIsComputing(input.length > 0);
    setCopyStatus('idle');
  };

  const handleCopy = async () => {
    if (!digest || isComputing) {
      return;
    }

    const requestId = requestIdRef.current;

    try {
      await copyToClipboard(digest);
      if (requestIdRef.current === requestId) {
        setCopyStatus('copied');
      }
    } catch {
      if (requestIdRef.current === requestId) {
        setCopyStatus('error');
      }
    }
  };

  const handleClear = () => {
    requestIdRef.current += 1;
    setInput('');
    setDigest('');
    setError(null);
    setCopyStatus('idle');
    setIsComputing(false);
    inputRef.current?.focus();
  };

  const hasContent = input.length > 0 || digest.length > 0 || error !== null;

  return (
    <div className="min-w-0">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-5">
        <section className="paper-panel min-w-0 p-4 sm:p-5" aria-labelledby={inputSectionId}>
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-2">
            <div>
              <p className="font-label text-[9px] text-[var(--accent)]">Step 01</p>
              <h2 id={inputSectionId} className="font-editorial mt-1 text-xl">
                テキストとアルゴリズム
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">Input</span>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label htmlFor={inputId} className="font-label text-[10px] font-bold text-[var(--ink-soft)]">
                ハッシュ化するテキスト
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                {numberFormatter.format(input.length)} 文字
              </span>
            </div>
            <textarea
              id={inputId}
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              rows={8}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              placeholder="例: こんにちは、世界"
              aria-describedby={error ? `${inputHelpId} ${errorId}` : inputHelpId}
              className="field-paper mt-2 block w-full min-w-0 resize-y px-3 py-2.5 font-mono text-sm leading-6"
            />
            <p id={inputHelpId} className="mt-1.5 text-[10px] leading-5 text-[var(--ink-soft)]">
              入力と同時にブラウザ内で計算します。改行やスペースも含めて、入力した文字列そのものが対象です。
            </p>
          </div>

          <div className="mt-4">
            <label htmlFor={algorithmId} className="font-label text-[10px] font-bold text-[var(--ink-soft)]">
              アルゴリズム
            </label>
            <select
              id={algorithmId}
              value={algorithm}
              onChange={handleAlgorithmChange}
              aria-describedby={algorithmHelpId}
              className="field-paper mt-2 block w-full min-w-0 rounded-sm px-3 py-3 text-sm"
            >
              {ALGORITHMS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value}（{item.bits}ビット）
                </option>
              ))}
            </select>
            <p id={algorithmHelpId} className="mt-1.5 text-[10px] leading-5 text-[var(--ink-soft)]">
              {selectedAlgorithm.hint}
            </p>
          </div>
        </section>

        <section
          className="paper-panel min-w-0 p-4 sm:p-5"
          aria-labelledby={resultSectionId}
          aria-busy={isComputing}
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-2">
            <div>
              <p className="font-label text-[9px] text-[var(--accent)]">Step 02</p>
              <h2 id={resultSectionId} className="font-editorial mt-1 text-xl">
                ハッシュ値
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              {isComputing ? '計算中' : 'Hex'}
            </span>
          </div>

          {error ? (
            <p
              id={errorId}
              role="alert"
              className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--ink)]"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <span id={outputLabelId} className="font-label text-[10px] font-bold text-[var(--ink-soft)]">
                16進数のダイジェスト
              </span>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                {algorithm} / {digest ? `${digest.length}文字` : '—'}
              </span>
            </div>
            <div className="mt-2 min-h-24 min-w-0 overflow-hidden border border-[var(--line)] bg-[var(--paper-muted)] p-3">
              {isComputing ? (
                <p className="text-xs leading-6 text-[var(--ink-soft)]">計算しています…</p>
              ) : digest ? (
                <output
                  aria-labelledby={outputLabelId}
                  className="block min-w-0 select-all break-all font-mono text-[11px] leading-6 text-[var(--ink)]"
                >
                  {digest}
                </output>
              ) : error ? (
                <p className="text-xs leading-6 text-[var(--ink-soft)]">
                  エラーを解消すると結果が表示されます。
                </p>
              ) : (
                <p className="text-xs leading-6 text-[var(--ink-soft)]">
                  テキストを入力すると、ここにハッシュ値が表示されます。
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isComputing || !digest}
              className="paper-button-primary w-full px-3 py-2.5 text-xs"
            >
              コピー
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={isComputing || !hasContent}
              className="paper-button w-full px-3 py-2.5 text-xs"
            >
              クリア
            </button>
          </div>

          <p
            role="status"
            aria-live="polite"
            className="mt-2 min-h-[1.25rem] text-[10px] leading-5 text-[var(--ink-soft)]"
          >
            {copyStatus === 'copied'
              ? 'ハッシュ値をクリップボードにコピーしました。'
              : copyStatus === 'error'
                ? 'コピーできませんでした。表示された値を選択して手動でコピーしてください。'
                : '生成した値は入力の変更に合わせて自動で更新されます。'}
          </p>
        </section>
      </div>

      <section className="paper-panel-flat mt-4 min-w-0 p-4 sm:p-5" aria-labelledby={noteHeadingId}>
        <div className="flex min-w-0 items-start gap-3">
          <span className="font-label mt-0.5 shrink-0 text-[9px] text-[var(--accent)]">Note</span>
          <div className="min-w-0">
            <h2 id={noteHeadingId} className="font-editorial text-lg">
              ハッシュの注意点
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
              ハッシュは一方向の変換で、元のテキストに戻すことはできません。ただし、パスワードの保存には適していません。パスワードにはユーザーごとに異なるソルトを付け、Argon2・bcrypt・scryptなどのKDF（鍵導出関数）を使ってください。SHA-1は衝突攻撃が現実的になっているため、このツールでは選択肢に含めていません。短い文字列や推測しやすい文字列は、総当たり攻撃や辞書攻撃で元の値を特定できる場合があります。ハッシュ値は暗号化ではないため秘密の隠蔽には使わず、改ざん検知にはHMACなど用途に合った方式を選んでください。
            </p>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
              入力内容はこのページ内だけで処理し、サーバーへ送信したりlocalStorageへ保存したりしません。ページを閉じると入力は破棄されます。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HashGenerator;
