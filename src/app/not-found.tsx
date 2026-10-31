import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ページが見つかりません',
  description: 'お探しのページは見つかりませんでした。',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-[70vh] bg-slate-100 dark:bg-slate-900 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl p-8">
        <p className="text-6xl font-black text-indigo-500 dark:text-indigo-400 mb-3">404</p>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
          ページが見つかりません
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
          お探しのページは移動または削除された可能性があります。URLをご確認いただくか、トップページから目的のページをお探しください。
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
          >
            トップページへ
          </Link>
          <Link
            href="/themes"
            className="px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            お題カテゴリ一覧へ
          </Link>
        </div>
      </div>
    </main>
  );
}
