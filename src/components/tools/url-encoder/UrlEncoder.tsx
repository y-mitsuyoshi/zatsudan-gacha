'use client';

import { useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { copyToClipboard } from '@/lib/clipboard';

type Mode = 'encodeURIComponent' | 'decodeURIComponent' | 'encodeURI' | 'decodeURI';
type CopyStatus = 'idle' | 'copied' | 'error';

const MODE_OPTIONS: { value: Mode; label: string; hint: string }[] = [
  { value: 'encodeURIComponent', label: 'encodeURIComponent', hint: '部品をエンコード' },
  { value: 'decodeURIComponent', label: 'decodeURIComponent', hint: '部品をデコード' },
  { value: 'encodeURI', label: 'encodeURI', hint: 'URL全体をエンコード' },
  { value: 'decodeURI', label: 'decodeURI', hint: 'URL全体をデコード' },
];

const SWAP_MODE: Record<Mode, Mode> = {
  encodeURIComponent: 'decodeURIComponent',
  decodeURIComponent: 'encodeURIComponent',
  encodeURI: 'decodeURI',
  decodeURI: 'encodeURI',
};

const TRANSFORMS: Record<Mode, (value: string) => string> = {
  encodeURIComponent,
  decodeURIComponent,
  encodeURI,
  decodeURI,
};

const DECODE_ERROR =
  '不正なパーセントエンコーディングを検出しました。%の後ろが2桁の16進数になっているか、途中で切れたバイト列がないか確認してください。';
const ENCODE_ERROR =
  'URLエンコードできない文字が含まれています。単独のサロゲート文字などがないか確認してください。';

export function UrlEncoder() {
  const inputId = useId();
  const outputId = useId();
  const inputHelpId = useId();
  const outputHelpId = useId();
  const errorId = useId();
  const inputSectionId = useId();
  const outputSectionId = useId();
  const noteId = useId();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyRequestRef = useRef(0);

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('encodeURIComponent');
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const { output, error } = useMemo(() => {
    if (!input) {
      return { output: '', error: '' };
    }

    try {
      return { output: TRANSFORMS[mode](input), error: '' };
    } catch {
      const isDecode = mode === 'decodeURIComponent' || mode === 'decodeURI';
      return { output: '', error: isDecode ? DECODE_ERROR : ENCODE_ERROR };
    }
  }, [input, mode]);

  const isEncodeMode = mode === 'encodeURIComponent' || mode === 'encodeURI';

  const resetCopyStatus = () => {
    copyRequestRef.current += 1;
    setCopyStatus('idle');
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    resetCopyStatus();
  };

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    resetCopyStatus();
  };

  const handleSwap = () => {
    if (!output) return;
    setInput(output);
    setMode(SWAP_MODE[mode]);
    resetCopyStatus();
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setInput('');
    resetCopyStatus();
    inputRef.current?.focus();
  };

  const handleCopy = async () => {
    if (!output) return;

    const requestId = copyRequestRef.current + 1;
    copyRequestRef.current = requestId;

    try {
      await copyToClipboard(output);
      if (copyRequestRef.current === requestId) {
        setCopyStatus('copied');
      }
    } catch {
      if (copyRequestRef.current === requestId) {
        setCopyStatus('error');
      }
    }
  };

  return (
    <div className="min-w-0">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="paper-panel min-w-0 p-4 sm:p-5" aria-labelledby={inputSectionId}>
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-2">
            <div>
              <p className="font-label text-[9px] text-[var(--accent)]">Step 01</p>
              <h2 id={inputSectionId} className="font-editorial mt-1 text-xl">変換設定と入力</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">Input</span>
          </div>

          <fieldset className="mt-4">
            <legend className="font-label text-[10px] font-bold text-[var(--ink-soft)]">変換モード</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={mode === option.value}
                  onClick={() => handleModeChange(option.value)}
                  className="paper-chip flex min-w-0 flex-col items-start gap-1 border px-2.5 py-2 text-left"
                >
                  <span className="font-label w-full break-all text-[9px] leading-4">{option.label}</span>
                  <span className="text-[10px] leading-4">{option.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
              クエリ値やパス部品は「部品」、区切り記号を残したURL全体は「URL全体」を選びます。
            </p>
          </fieldset>

          <div className="mt-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label htmlFor={inputId} className="font-label text-[10px] font-bold text-[var(--ink-soft)]">
                入力テキスト
              </label>
              <span className="text-[10px] text-[var(--ink-soft)]">日本語OK</span>
            </div>
            <textarea
              id={inputId}
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              rows={7}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="例: 日本語の検索キーワード & 記号"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputHelpId} ${errorId}` : inputHelpId}
              className="field-paper mt-2 block w-full min-w-0 resize-y px-3 py-2.5 font-mono text-sm leading-6"
            />
            <p id={inputHelpId} className="mt-1.5 text-[10px] leading-5 text-[var(--ink-soft)]">
              {isEncodeMode
                ? '入力と同時にエンコードします。スペースは %20 になり、+ には変換されません。'
                : '入力と同時にデコードします。%20 はスペースに戻り、+ はそのまま残ります。'}
            </p>
          </div>

        </section>

        <section className="paper-panel min-w-0 p-4 sm:p-5" aria-labelledby={outputSectionId}>
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-2">
            <div>
              <p className="font-label text-[9px] text-[var(--accent)]">Step 02</p>
              <h2 id={outputSectionId} className="font-editorial mt-1 text-xl">変換結果</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">Output</span>
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
              <label htmlFor={outputId} className="font-label text-[10px] font-bold text-[var(--ink-soft)]">
                出力テキスト
              </label>
              <span className="text-[10px] text-[var(--ink-soft)]">読み取り専用</span>
            </div>
            <textarea
              id={outputId}
              value={output}
              readOnly
              rows={7}
              spellCheck={false}
              placeholder={error ? 'エラーを解消すると結果が表示されます' : '変換結果がここに表示されます'}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${outputHelpId} ${errorId}` : outputHelpId}
              className="field-paper mt-2 block w-full min-w-0 resize-y px-3 py-2.5 font-mono text-sm leading-6"
            />
            <p id={outputHelpId} className="mt-1.5 text-[10px] leading-5 text-[var(--ink-soft)]">
              出力欄は編集できません。コピーしてURLや設定ファイルに貼り付けられます。
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!output}
              className="paper-button-primary w-full px-3 py-2 text-xs"
            >
              コピー
            </button>
            <button
              type="button"
              onClick={handleSwap}
              disabled={!output}
              className="paper-button w-full px-3 py-2 text-xs"
            >
              入出力を入れ替え
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!input}
              className="paper-button w-full px-3 py-2 text-xs"
            >
              クリア
            </button>
          </div>

          <p role="status" aria-live="polite" className="mt-2 min-h-[1.25rem] text-[10px] leading-5 text-[var(--ink-soft)]">
            {copyStatus === 'copied'
              ? 'クリップボードにコピーしました。'
              : copyStatus === 'error'
                ? 'コピーできませんでした。出力欄を選択して手動でコピーしてください。'
                : '「入出力を入れ替え」は変換方向も反転します。'}
          </p>
        </section>
      </div>

      <section className="paper-panel-flat mt-4 min-w-0 p-4 sm:p-5" aria-labelledby={noteId}>
        <div className="flex min-w-0 items-start gap-3">
          <span className="font-label mt-0.5 shrink-0 text-[9px] text-[var(--accent)]">Note</span>
          <div className="min-w-0">
            <h2 id={noteId} className="font-editorial text-lg">encodeURIComponent と encodeURI の違い</h2>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
              <span className="font-bold text-[var(--ink)]">encodeURIComponent</span> はクエリ値などの部品を対象にし、
              <code className="mx-1 break-all bg-[var(--paper-muted)] px-1 py-0.5 font-mono text-[11px]">
                {'/ ? : @ & = + #'}
              </code>
              などの予約文字もパーセントエンコーディングします。一方、
              <span className="font-bold text-[var(--ink)]">encodeURI</span> はURL全体を対象にし、
              <code className="mx-1 break-all bg-[var(--paper-muted)] px-1 py-0.5 font-mono text-[11px]">
                {':// ? & = #'}
              </code>
              などURLの構造を保つ記号はそのまま残します。どちらも日本語はUTF-8のパーセントエンコーディングに変換され、デコードすると元の文字列に戻ります。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default UrlEncoder;
