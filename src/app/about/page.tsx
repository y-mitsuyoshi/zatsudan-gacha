import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { JsonLd } from '@/components/seo/JsonLd';
import { themeCategories, totalThemeCount } from '@/lib/themeCategories';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '運営者情報・サイトについて',
  description: '雑談テーマガチャの運営者情報、サイトの目的、コンテンツの編集方針、お問い合わせ先、免責事項についてご案内します。',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: '運営者情報・サイトについて｜雑談テーマガチャ',
    description: '雑談テーマガチャの運営者情報、サイトの目的、コンテンツの編集方針、お問い合わせ先についてご案内します。',
    url: `${APP_URL}/about`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '運営者情報・サイトについて' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '運営者情報・サイトについて｜雑談テーマガチャ',
    description: '雑談テーマガチャの運営者情報、サイトの目的、コンテンツの編集方針についてご案内します。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: '運営者情報・サイトについて',
    url: `${APP_URL}/about`,
    inLanguage: 'ja-JP',
    isPartOf: { '@id': `${APP_URL}/#website` },
    about: { '@id': `${APP_URL}/#organization` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '雑談テーマガチャ', item: `${APP_URL}/` },
      { '@type': 'ListItem', position: 2, name: '運営者情報', item: `${APP_URL}/about` },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '雑談テーマガチャ',
    serviceType: '雑談お題・アイスブレイク提案ツール',
    url: `${APP_URL}/`,
    provider: { '@id': `${APP_URL}/#organization` },
    areaServed: 'JP',
    availableLanguage: ['ja'],
    description: '会議のアイスブレイク、リモートワークの雑談、1on1、チーム交流に使えるお題をランダムに提案する無料Webサービス。',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
  },
];

const sections = [
  {
    title: 'サイトの目的',
    body: [
      '「雑談テーマガチャ」は、会議のアイスブレイクやリモートワークの雑談、1on1、チーム交流のきっかけをつくる無料のWebサービスです。',
      `現在${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題を収録しています。雑談のお題をランダムに表示するガチャ機能を中心に、カテゴリ別のお題一覧、会議のアイスブレイク特集、AIによる深掘り質問、タイムアタック、ルーレットなどを提供しています。`,
      'また、社畜をテーマにした無料ブラウザゲームや、推し活プロフィール、異世界ステータス診断、言い訳生成、駅名標作成などのツールも公開しています。',
    ],
  },
  {
    title: 'AI・メディア向けの要約',
    body: [
      `雑談テーマガチャは、会議のアイスブレイクや雑談に使えるお題をランダムに表示する無料Webサービスです。${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題を収録し、カテゴリ絞り込み、履歴・お気に入り、AI深掘り質問、タイムアタック、ルーレットを提供しています。`,
      '引用・紹介の際は https://zatsudan-gacha.app/ へのリンクを掲載してください。',
    ],
  },
  {
    title: 'コンテンツの編集方針',
    body: [
      'お題・ゲーム・ツールの説明は、実際に動作を確認したうえで掲載しています。誤りや古い情報を見つけた場合は、お問い合わせ先までご連絡ください。',
      'AIが生成する文章や診断結果はエンターテインメント目的であり、正確性・完全性を保証するものではありません。',
      '第三者の著作物や商標を尊重し、特定の商品・サービスに依存しない表現を心がけています。',
    ],
  },
  {
    title: '運営者',
    body: [
      '運営: 雑談テーマガチャ運営チーム',
      'お問い合わせ: X（旧Twitter）の @zatsudan_gacha までお願いします。',
    ],
  },
  {
    title: '免責事項',
    body: [
      '本サイトの利用により発生した損害について、運営者は責任を負いかねます。ゲームのプレイやツールの利用は自己責任でお願いします。',
      '外部サービス（Google Analytics、Google AdSense、Google Gemini APIなど）の仕様変更や停止により、一部機能が利用できなくなる場合があります。',
      '詳しくはプライバシーポリシーをご確認ください。',
    ],
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-3xl px-4 pt-5 pb-16">
        <div className="flex justify-end">
          <ThemeToggleButton />
        </div>
        <nav aria-label="パンくずリスト" className="mb-5 text-xs text-gray-500 dark:text-gray-400">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="hover:underline">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">運営者情報</li>
          </ol>
        </nav>
        <header className="mb-8">
          <p className="text-xs font-black tracking-[0.25em] text-indigo-600 dark:text-indigo-400">ABOUT</p>
          <h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">運営者情報・サイトについて</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">最終更新: 2026年11月3日</p>
        </header>

        <div className="space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">{section.title}</h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/privacy" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            プライバシーポリシー
          </Link>
          <Link href="/games" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            無料ゲーム一覧
          </Link>
          <Link href="/themes" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            お題カテゴリ一覧
          </Link>
        </div>
      </div>
    </main>
  );
}
