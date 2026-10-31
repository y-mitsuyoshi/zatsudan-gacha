"use client";

import Link from 'next/link';
import { useConsent } from '@/components/ConsentProvider';

export function ConsentBanner() {
  const { consent, accept, reject } = useConsent();

  if (consent !== 'unknown') {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
      role="region"
      aria-label="Cookieとアクセス解析の同意"
    >
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl p-4 sm:p-5">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">
          Cookieとアクセス解析について
        </p>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          より良いサービスづくりのため、Google Analyticsと広告配信（Google AdSense）を利用しています。同意いただいた場合のみ、これらのCookieを有効にします。必須のCookieは常に利用します。
          <Link href="/privacy" className="ml-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            プライバシーポリシー
          </Link>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={reject}
            className="order-2 sm:order-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            必須のみ
          </button>
          <button
            type="button"
            onClick={accept}
            className="order-1 sm:order-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
          >
            同意して続ける
          </button>
        </div>
      </div>
    </div>
  );
}
