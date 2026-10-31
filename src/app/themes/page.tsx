import type { Metadata } from 'next';
import Link from 'next/link';
import { CategoryGrid } from '@/components/CategoryGrid';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { themeCategories, totalThemeCount } from '@/lib/themeCategories';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: `雑談お題のカテゴリ一覧｜${themeCategories.length}カテゴリ・${totalThemeCount}問`,
  description: `趣味・旅行・仕事・食べ物・音楽・ゲームなど${themeCategories.length}カテゴリ、${totalThemeCount}以上の雑談お題を一覧で紹介。会議のアイスブレイク、1on1、リモートワークの雑談に合ったカテゴリを選べます。`,
  alternates: {
    canonical: '/themes',
  },
  openGraph: {
    title: `雑談お題のカテゴリ一覧｜${themeCategories.length}カテゴリ・${totalThemeCount}問`,
    description: `会議のアイスブレイクや雑談に使える${totalThemeCount}以上のお題を、${themeCategories.length}カテゴリから選べます。`,
    url: `${APP_URL}/themes`,
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '雑談テーマガチャのカテゴリ一覧',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `雑談お題のカテゴリ一覧｜${themeCategories.length}カテゴリ・${totalThemeCount}問`,
    description: `会議のアイスブレイクや雑談に使える${totalThemeCount}以上のお題を、${themeCategories.length}カテゴリから選べます。`,
    images: [`${APP_URL}/ogp.png`],
  },
};

const categoryTips = [
  {
    title: '初対面・アイスブレイクなら',
    text: '「食べ物」「旅行」「休日・ライフスタイル」は答えやすく、相手の好みを知るきっかけになります。',
    categories: ['食べ物', '旅行', '休日・ライフスタイル'],
  },
  {
    title: 'チームの交流・1on1なら',
    text: '「価値観・性格」「仕事」「家族・友達」は、普段の会話では聞けない一面を知るのに向いています。',
    categories: ['価値観・性格', '仕事', '家族・友達'],
  },
  {
    title: '盛り上がり重視なら',
    text: '「もしも・空想」「ゲーム・アニメ」「音楽」は、答えが自由で話が広がりやすいカテゴリです。',
    categories: ['もしも・空想', 'ゲーム・アニメ', '音楽'],
  },
];

function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function ThemesIndexPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '雑談テーマガチャ',
        item: `${APP_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'カテゴリ一覧',
        item: `${APP_URL}/themes`,
      },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `雑談お題のカテゴリ一覧（${themeCategories.length}カテゴリ）`,
    description: `会議のアイスブレイクやリモートワークの雑談に使える${totalThemeCount}以上のお題をカテゴリ別に紹介しています。`,
    url: `${APP_URL}/themes`,
    inLanguage: 'ja',
    isPartOf: {
      '@type': 'WebApplication',
      name: '雑談テーマガチャ',
      url: `${APP_URL}/`,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: themeCategories.length,
      itemListElement: themeCategories.map((category, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${category.name}の雑談お題`,
        url: `${APP_URL}/themes/${category.slug}`,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
      />

      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex justify-end">
          <ThemeToggleButton />
        </div>
        <nav aria-label="パンくずリスト" className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">カテゴリ一覧</li>
          </ol>
        </nav>

        <header className="max-w-3xl mb-10">
          <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">ALL CATEGORIES</p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-3">
            雑談お題のカテゴリ一覧
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            {themeCategories.length}カテゴリ・{totalThemeCount}以上のお題から、会議や雑談に合った話題を選べます。カテゴリページでは、そのカテゴリのお題を一覧で確認でき、ガチャを回したり、気になるお題をコピーしたりできます。
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              href="/#gacha"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl transition-colors"
            >
              <span aria-hidden="true">🎲</span>
              ガチャを回す
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-indigo-400 text-gray-700 dark:text-gray-200 font-bold px-5 py-3 rounded-xl transition-colors"
            >
              ホームに戻る
            </Link>
          </div>
        </header>

        <CategoryGrid exampleCount={3} />

        <section aria-labelledby="tips-heading" className="mt-14">
          <h2 id="tips-heading" className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            シーン別・カテゴリの選び方
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            会話の目的に合わせてカテゴリを選ぶと、お題がより活きやすくなります。
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {categoryTips.map((tip) => (
              <div key={tip.title} className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-base mb-2">{tip.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{tip.text}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tip.categories.map((name) => {
                    const category = themeCategories.find((item) => item.name === name);
                    return category ? (
                      <Link
                        key={name}
                        href={`/themes/${category.slug}`}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-full px-2.5 py-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        {category.emoji} {name}
                      </Link>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
