'use client';

import { useEffect, useId, useState } from 'react';

type CharClassId = 'uppercase' | 'lowercase' | 'digits' | 'symbols';

type Selection = Record<CharClassId, boolean>;

type CharacterPools = {
  pools: string[];
  combined: string;
};

type GeneratedConfig = {
  length: number;
  poolSize: number;
  signature: string;
};

type Strength = {
  label: string;
  bits: number;
  level: number;
};

type BatchCount = 1 | 5;

const MIN_LENGTH = 8;
const MAX_LENGTH = 64;
const DEFAULT_LENGTH = 16;

const CLASS_ORDER: CharClassId[] = ['uppercase', 'lowercase', 'digits', 'symbols'];

const CLASS_OPTIONS: { id: CharClassId; label: string; sample: string }[] = [
  { id: 'uppercase', label: '大文字', sample: 'A–Z' },
  { id: 'lowercase', label: '小文字', sample: 'a–z' },
  { id: 'digits', label: '数字', sample: '0–9' },
  { id: 'symbols', label: '記号', sample: '!@#$%^&*' },
];

const CHAR_SETS: Record<CharClassId, string> = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
};

const AMBIGUOUS_CHARS = new Set(['0', 'O', '1', 'l', 'I', '|']);

const INITIAL_SELECTION: Selection = {
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
};

const NO_CLASS_ERROR = '文字種を1つ以上選択してください。';
const CRYPTO_ERROR =
  'このブラウザでは安全な乱数生成を利用できません。Web Crypto APIに対応したブラウザでお試しください。';

function normalizeLength(raw: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LENGTH;
  }

  return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.round(parsed)));
}

function buildSelectionSignature(selection: Selection, excludeAmbiguous: boolean): string {
  const classKey = CLASS_ORDER.filter((id) => selection[id]).join(',');
  return `${classKey}|${excludeAmbiguous ? 'exclude' : 'include'}`;
}

function buildCharacterPools(selection: Selection, excludeAmbiguous: boolean): CharacterPools | null {
  const pools = CLASS_ORDER.filter((id) => selection[id]).map((id) => {
    const characters = CHAR_SETS[id];
    return excludeAmbiguous
      ? Array.from(characters)
          .filter((character) => !AMBIGUOUS_CHARS.has(character))
          .join('')
      : characters;
  });

  if (pools.length === 0 || pools.some((pool) => pool.length === 0)) {
    return null;
  }

  return { pools, combined: pools.join('') };
}

function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x100000000) {
    throw new Error('Invalid random range.');
  }

  if (
    typeof globalThis.crypto === 'undefined' ||
    typeof globalThis.crypto.getRandomValues !== 'function'
  ) {
    throw new Error('Web Crypto API is unavailable.');
  }

  const range = 0x100000000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const randomValues = new Uint32Array(1);

  do {
    globalThis.crypto.getRandomValues(randomValues);
  } while (randomValues[0] >= limit);

  return randomValues[0] % maxExclusive;
}

function generatePassword(length: number, pools: CharacterPools): string {
  const characters: string[] = [];

  for (const pool of pools.pools) {
    characters.push(pool[secureRandomInt(pool.length)]);
  }

  while (characters.length < length) {
    characters.push(pools.combined[secureRandomInt(pools.combined.length)]);
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1);
    const current = characters[index];
    characters[index] = characters[swapIndex];
    characters[swapIndex] = current;
  }

  return characters.join('');
}

function getStrength(length: number, poolSize: number): Strength | null {
  if (poolSize <= 0) {
    return null;
  }

  const bits = Math.round(length * Math.log2(poolSize));

  if (bits < 40) {
    return { label: '弱い', bits, level: 1 };
  }
  if (bits < 60) {
    return { label: 'やや弱い', bits, level: 2 };
  }
  if (bits < 80) {
    return { label: '強い', bits, level: 3 };
  }
  return { label: '非常に強い', bits, level: 4 };
}

async function writeToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {}
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is unavailable.');
  }

  const activeElement =
    typeof HTMLElement !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (typeof document.execCommand !== 'function' || !document.execCommand('copy')) {
      throw new Error('Copy command failed.');
    }
  } finally {
    document.body.removeChild(textarea);
    activeElement?.focus();
  }
}

export function PasswordGenerator() {
  const lengthInputId = useId();
  const lengthHelpId = useId();
  const settingsHeadingId = useId();
  const resultsHeadingId = useId();
  const strengthHeadingId = useId();
  const ambiguousHelpId = useId();
  const noteHeadingId = useId();

  const [selection, setSelection] = useState<Selection>(INITIAL_SELECTION);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [lengthInput, setLengthInput] = useState(String(DEFAULT_LENGTH));
  const [batchCount, setBatchCount] = useState<BatchCount>(1);
  const [passwords, setPasswords] = useState<string[]>([]);
  const [generatedConfig, setGeneratedConfig] = useState<GeneratedConfig | null>(null);
  const [error, setError] = useState('');
  const [liveMessage, setLiveMessage] = useState('');

  const lengthValue = normalizeLength(lengthInput);
  const currentPools = buildCharacterPools(selection, excludeAmbiguous);
  const currentSignature = buildSelectionSignature(selection, excludeAmbiguous);
  const settingsChanged =
    generatedConfig !== null &&
    (generatedConfig.length !== lengthValue ||
      currentPools === null ||
      generatedConfig.signature !== currentSignature);
  const strength =
    generatedConfig !== null ? getStrength(generatedConfig.length, generatedConfig.poolSize) : null;

  useEffect(() => {
    const pools = buildCharacterPools(INITIAL_SELECTION, true);
    if (!pools) {
      return;
    }

    try {
      setPasswords([generatePassword(DEFAULT_LENGTH, pools)]);
      setGeneratedConfig({
        length: DEFAULT_LENGTH,
        poolSize: pools.combined.length,
        signature: buildSelectionSignature(INITIAL_SELECTION, true),
      });
    } catch {
      setError(CRYPTO_ERROR);
    }
  }, []);

  const handleLengthInputChange = (rawValue: string) => {
    if (!/^\d*$/.test(rawValue)) {
      return;
    }

    if (rawValue === '') {
      setLengthInput('');
      return;
    }

    const parsed = Number(rawValue);
    setLengthInput(parsed > MAX_LENGTH ? String(MAX_LENGTH) : rawValue);
  };

  const handleToggleClass = (id: CharClassId) => {
    const nextSelection = { ...selection, [id]: !selection[id] };
    setSelection(nextSelection);

    const hasSelection = CLASS_ORDER.some((classId) => nextSelection[classId]);
    if (!hasSelection) {
      setError(NO_CLASS_ERROR);
      setPasswords([]);
      setGeneratedConfig(null);
      setLiveMessage('');
      return;
    }

    setError((currentError) => (currentError === NO_CLASS_ERROR ? '' : currentError));
  };

  const handleGenerate = (isRegenerate = false) => {
    const normalizedLength = normalizeLength(lengthInput);
    setLengthInput(String(normalizedLength));

    const pools = buildCharacterPools(selection, excludeAmbiguous);
    if (!pools) {
      setError(NO_CLASS_ERROR);
      setPasswords([]);
      setGeneratedConfig(null);
      setLiveMessage('');
      return;
    }

    try {
      const nextPasswords = Array.from({ length: batchCount }, () =>
        generatePassword(normalizedLength, pools),
      );
      setPasswords(nextPasswords);
      setGeneratedConfig({
        length: normalizedLength,
        poolSize: pools.combined.length,
        signature: buildSelectionSignature(selection, excludeAmbiguous),
      });
      setError('');
      setLiveMessage(
        isRegenerate
          ? `パスワードを${batchCount}件再生成しました。`
          : `パスワードを${batchCount}件生成しました。`,
      );
    } catch {
      setPasswords([]);
      setGeneratedConfig(null);
      setError(CRYPTO_ERROR);
      setLiveMessage('');
    }
  };

  const handleClear = () => {
    setPasswords([]);
    setGeneratedConfig(null);
    setError('');
    setLiveMessage('生成結果をクリアしました。');
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await writeToClipboard(text);
      setLiveMessage(`${label}をクリップボードにコピーしました。`);
    } catch {
      setLiveMessage('コピーできませんでした。表示欄を選択して手動でコピーしてください。');
    }
  };

  return (
    <div className="min-w-0">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-5">
        <form
          noValidate
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            handleGenerate(false);
          }}
          className="paper-panel min-w-0 p-4 sm:p-6"
          aria-labelledby={settingsHeadingId}
        >
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="font-label text-[9px] text-[var(--accent)]">Step 01</p>
              <h2 id={settingsHeadingId} className="font-editorial mt-1 text-xl">
                生成設定
              </h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">Configure</span>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label htmlFor={lengthInputId} className="text-sm font-bold text-[var(--ink)]">
                パスワードの長さ
              </label>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">8–64 chars</span>
            </div>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_4.75rem] items-center gap-3">
              <input
                type="range"
                min={MIN_LENGTH}
                max={MAX_LENGTH}
                step={1}
                value={lengthValue}
                onChange={(event) => setLengthInput(event.target.value)}
                aria-label="パスワードの長さ（スライダー）"
                aria-describedby={lengthHelpId}
                className="h-2 w-full min-w-0 cursor-pointer accent-[var(--accent)]"
              />
              <input
                id={lengthInputId}
                type="number"
                inputMode="numeric"
                min={MIN_LENGTH}
                max={MAX_LENGTH}
                step={1}
                value={lengthInput}
                onChange={(event) => handleLengthInputChange(event.target.value)}
                onBlur={() => setLengthInput(String(lengthValue))}
                autoComplete="off"
                aria-describedby={lengthHelpId}
                className="field-paper w-full min-w-0 rounded-sm px-2 py-2 text-center text-sm font-bold tabular-nums"
              />
            </div>
            <p id={lengthHelpId} className="mt-1.5 text-[10px] leading-5 text-[var(--ink-soft)]">
              スライダーまたは数値入力で8〜64文字を指定できます。
            </p>
          </div>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-sm font-bold text-[var(--ink)]">使用する文字種</legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CLASS_OPTIONS.map((option) => {
                const checked = selection[option.id];
                return (
                  <label
                    key={option.id}
                    className={`flex min-w-0 cursor-pointer items-start gap-2.5 border p-2.5 transition-colors ${
                      checked
                        ? 'border-[var(--line-strong)] bg-[var(--paper-muted)]'
                        : 'border-[var(--line)] bg-[var(--paper-strong)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleClass(option.id)}
                      aria-label={option.label}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-[var(--ink)]">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block break-all font-mono text-[10px] leading-4 text-[var(--ink-soft)]">
                        {option.sample}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="mt-3 flex min-w-0 cursor-pointer items-start gap-2.5 border border-[var(--line)] bg-[var(--paper-strong)] p-3">
            <input
              type="checkbox"
              checked={excludeAmbiguous}
              onChange={(event) => setExcludeAmbiguous(event.target.checked)}
              aria-describedby={ambiguousHelpId}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
            />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-[var(--ink)]">
                紛らわしい文字を除外
              </span>
              <span
                id={ambiguousHelpId}
                className="mt-0.5 block text-[10px] leading-5 text-[var(--ink-soft)]"
              >
                0 / O / 1 / l / I / | を使わず、見間違いにくくします。
              </span>
            </span>
          </label>

          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-[var(--ink)]">生成する数</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([1, 5] as const).map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center justify-center gap-2 border px-3 py-2.5 text-sm font-bold transition-colors ${
                    batchCount === value
                      ? 'border-[var(--ink)] bg-[var(--paper-muted)] shadow-[2px_2px_0_var(--paper-shadow)]'
                      : 'border-[var(--line)] bg-[var(--paper-strong)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="password-count"
                    value={value}
                    checked={batchCount === value}
                    onChange={() => setBatchCount(value)}
                    className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                  />
                  <span>{value}個</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
              1個ずつ確認するか、5個まとめて生成して候補を比較できます。
            </p>
          </fieldset>

          {error ? (
            <p
              role="alert"
              className="mt-3 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--ink)]"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="paper-button-primary mt-5 w-full px-4 py-3 text-sm"
          >
            パスワードを生成
          </button>

          <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
            選択した文字種がそれぞれ1文字以上含まれるように生成します。
          </p>
        </form>

        <div className="min-w-0 space-y-4">
          <section
            className="paper-panel min-w-0 p-4 sm:p-6"
            aria-labelledby={resultsHeadingId}
          >
            <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <p className="font-label text-[9px] text-[var(--accent)]">Step 02</p>
                <h2 id={resultsHeadingId} className="font-editorial mt-1 text-xl">
                  生成結果
                </h2>
              </div>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                {passwords.length > 0 ? `${passwords.length}件` : '未生成'}
              </span>
            </div>

            {passwords.length === 0 ? (
              <p className="mt-4 border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-3 py-6 text-center text-xs leading-6 text-[var(--ink-soft)]">
                まだパスワードがありません。「パスワードを生成」を押すと、ここに結果が表示されます。
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {passwords.map((password, index) => (
                  <li
                    key={index}
                    className="min-w-0 border border-[var(--line)] bg-[var(--paper)] p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        type="text"
                        value={password}
                        readOnly
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        data-1p-ignore="true"
                        data-lpignore="true"
                        aria-label={`生成されたパスワード ${index + 1}`}
                        className="field-paper min-w-0 flex-1 rounded-sm px-2.5 py-2 font-mono text-sm tracking-wide"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void handleCopy(password, `${index + 1}つ目のパスワード`);
                        }}
                        aria-label={`${index + 1}つ目のパスワードをコピー`}
                        className="paper-button shrink-0 px-2.5 py-2 text-xs"
                      >
                        コピー
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                className="paper-button min-w-0 px-3 py-2 text-xs"
              >
                再生成
              </button>
              {passwords.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleCopy(passwords.join('\n'), 'すべてのパスワード');
                  }}
                  className="paper-button min-w-0 px-3 py-2 text-xs"
                >
                  すべてコピー
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleClear}
                disabled={passwords.length === 0}
                className="paper-button min-w-0 px-3 py-2 text-xs"
              >
                クリア
              </button>
            </div>

            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mt-2 min-h-[1.25rem] text-[10px] leading-5 text-[var(--ink-soft)]"
            >
              {liveMessage}
            </p>
          </section>

          <section
            className="paper-panel-flat min-w-0 p-4 sm:p-5"
            aria-labelledby={strengthHeadingId}
          >
            <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-2">
              <div>
                <p className="font-label text-[9px] text-[var(--accent)]">Estimate</p>
                <h2 id={strengthHeadingId} className="font-editorial mt-1 text-lg">
                  強度の目安
                </h2>
              </div>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                {generatedConfig ? `${generatedConfig.length}文字` : '未生成'}
              </span>
            </div>

            {strength ? (
              <>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-editorial text-2xl text-[var(--ink)]">
                    {strength.label}
                  </span>
                  <span className="font-label text-[9px] text-[var(--ink-soft)]">
                    約 {strength.bits} bit
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={`h-2 border border-[var(--line)] ${
                        level <= strength.level
                          ? 'bg-[var(--accent)]'
                          : 'bg-[var(--paper-muted)]'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  文字数と文字種の組み合わせから計算した目安です。実際の安全性を保証するものではありません。
                </p>
                {settingsChanged ? (
                  <p className="mt-2 border-l-2 border-[var(--accent)] pl-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                    設定が変更されています。再生成すると、この表示も更新されます。
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
                パスワードを生成すると、長さと文字種から強度の目安を表示します。
              </p>
            )}
          </section>
        </div>
      </div>

      <section
        className="paper-panel-flat mt-4 min-w-0 p-4 sm:p-5"
        aria-labelledby={noteHeadingId}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="font-label mt-0.5 shrink-0 text-[9px] text-[var(--accent)]">
            Security
          </span>
          <div className="min-w-0">
            <h2 id={noteHeadingId} className="font-editorial text-lg">
              パスワードの使い回しに注意
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
              同じパスワードを複数のサービスで使い回すと、1か所の漏えいが他のアカウントにも広がります。サービスごとに異なるパスワードを生成し、パスワード管理アプリで保管してください。可能であれば二段階認証も有効にしましょう。
            </p>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
              生成したパスワードはこのページに保存・送信されません。ページを閉じると結果は消えます。コピー後のクリップボードや貼り付け先での取り扱いにも注意してください。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PasswordGenerator;
