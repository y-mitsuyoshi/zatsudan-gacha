"use client";

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { copyToClipboard } from '@/lib/clipboard';
import { trackEvent } from '@/lib/firebase';

type ThemeListProps = {
  themes: string[];
  categoryName?: string;
  showHint?: boolean;
};

export const ThemeList = ({ themes, categoryName, showHint = true }: ThemeListProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copyTheme = async (theme: string, index: number) => {
    if (!theme) {
      return;
    }

    try {
      await copyToClipboard(theme);
      setCopiedIndex(index);
      setErrorMessage('');
      trackEvent('theme_list_copied', {
        theme,
        category: categoryName ?? 'unknown',
      });

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy theme:', error);
      setErrorMessage('コピーできませんでした。お題を長押ししてコピーしてください。');
    }
  };

  if (themes.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">このカテゴリにはまだお題がありません。</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-[var(--ink-soft)]">
          {showHint ? 'お題をタップするとコピーできます' : '気になるお題をタップしてコピー'}
        </p>
        <p className="font-label text-[9px] text-[var(--ink-soft)]">{themes.length}問</p>
      </div>
      {errorMessage && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">{errorMessage}</p>
      )}
      <ol className="grid sm:grid-cols-2 gap-2.5">
        {themes.map((theme, index) => {
          const isCopied = copiedIndex === index;
          return (
            <li key={theme}>
              <button
                type="button"
                onClick={() => copyTheme(theme, index)}
                className="group w-full h-full flex items-start gap-3 p-3.5 sm:p-4 text-left bg-[var(--paper-strong)] border border-[var(--line)] hover:border-[var(--accent)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label={`${theme}をコピー`}
              >
                <span className="shrink-0 w-7 h-7 flex items-center justify-center border border-[var(--line)] bg-[var(--paper-muted)] font-label text-[9px] text-[var(--accent)]">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm font-semibold text-[var(--ink)] leading-relaxed">
                  {theme}
                </span>
                <span className="shrink-0 mt-0.5 text-[var(--ink-soft)] group-hover:text-[var(--accent)] transition-colors" aria-hidden="true">
                  {isCopied ? (
                    <CheckIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <ClipboardIcon className="w-4 h-4" />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {copiedIndex !== null ? `${themes[copiedIndex]}をコピーしました` : ''}
      </p>
    </div>
  );
};
