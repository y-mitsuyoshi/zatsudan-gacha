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
      <div className="paper-panel mx-auto max-w-3xl p-4 sm:p-5">
        <p className="paper-kicker">Cookie & Analytics</p>
        <p className="mt-1 text-sm font-bold text-[var(--ink)]">
          Cookieとアクセス解析について
        </p>
        <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)] sm:text-sm">
          より良いサービスづくりのため、Google Analyticsと広告配信（Google AdSense）を利用しています。同意いただいた場合のみ、これらのCookieを有効にします。必須のCookieは常に利用します。
          <Link href="/privacy" className="ml-1 font-semibold text-[var(--accent)] hover:underline">
            プライバシーポリシー
          </Link>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={reject}
            className="paper-button order-2 px-4 py-2.5 text-sm sm:order-1"
          >
            必須のみ
          </button>
          <button
            type="button"
            onClick={accept}
            className="paper-button-primary order-1 px-4 py-2.5 text-sm sm:order-2"
          >
            同意して続ける
          </button>
        </div>
      </div>
    </div>
  );
}
