"use client";

import { useConsent } from '@/components/ConsentProvider';

export function ConsentSettingsButton() {
  const { consent, reset } = useConsent();

  return (
    <button
      type="button"
      onClick={reset}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      Cookie設定を変更する
      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
        （現在: {consent === 'accepted' ? '同意済み' : consent === 'rejected' ? '必須のみ' : '未選択'}）
      </span>
    </button>
  );
}
