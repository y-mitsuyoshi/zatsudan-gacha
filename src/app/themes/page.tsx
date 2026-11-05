import type { Metadata } from 'next';
import Link from 'next/link';
import { CategoryGrid } from '@/components/CategoryGrid';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { FaqList } from '@/components/FaqList';
import { themeCategories, totalThemeCount } from '@/lib/themeCategories';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
 title: `雑談お題のカテゴリ一覧｜${themeCategories.length}カテゴリ・${totalThemeCount}問`,
 description: `趣味・旅行・仕事・食べ物・音楽・ゲームなど${themeCategories.length}カテゴリ、${totalThemeCount}以上の雑談お題を一覧で紹介。会議のアイスブレイク、1on1、リモートワークの雑談に合ったカテゴリを選べます。`,
 keywords: [
 '雑談 お題 カテゴリ',
 '雑談テーマ 一覧',
 'アイスブレイク お題',
 '会議 雑談 ネタ',
 '1on1 質問',
 '飲み会 話題',
 '無料 お題',
 ],
 alternates: {
 canonical: '/themes',
 },
 openGraph: {
 title: `雑談お題のカテゴリ一覧｜${themeCategories.length}カテゴリ・${totalThemeCount}問`,
 description: `会議のアイスブレイクや雑談に使える${totalThemeCount}以上のお題を、${themeCategories.length}カテゴリから選べます。`,
  url: `${APP_URL}/themes`,
  siteName: '雑談テーマガチャ',
  locale: 'ja_JP',
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

const faqs = [
 { q: '雑談お題は全部でいくつありますか？', a: `現在${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題を収録しています。カテゴリページから一覧を確認でき、ガチャでランダムに選ぶこともできます。` },
 { q: 'どのカテゴリから選べばいいですか？', a: '初対面なら「食べ物」「旅行」「休日・ライフスタイル」、チーム交流や1on1なら「価値観・性格」「仕事」「家族・友達」がおすすめです。迷ったら「すべてのテーマ」からランダムに選べます。' },
 { q: 'カテゴリ別のお題は無料で使えますか？', a: 'はい。すべてのカテゴリ・お題を無料で利用できます。ログインや会員登録は不要で、お題はタップしてコピーできます。' },
 { q: 'スマートフォンでも使えますか？', a: 'はい。スマートフォン・タブレット・PCのブラウザに対応しています。' },
];

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
 '@id': `${APP_URL}/themes#collection`,
 url: `${APP_URL}/themes`,
 inLanguage: 'ja-JP',
 isPartOf: { '@id': `${APP_URL}/#website` },
 mainEntity: {
  '@type': 'ItemList',
  numberOfItems: themeCategories.length,
  itemListOrder: 'https://schema.org/ItemListOrderAscending',
  itemListElement: themeCategories.map((category, index) => ({
  '@type': 'ListItem',
  position: index + 1,
  name: `${category.name}の雑談お題`,
  url: `${APP_URL}/themes/${category.slug}`,
  })),
 },
 };

 const faqJsonLd = {
 '@context': 'https://schema.org',
 '@type': 'FAQPage',
 '@id': `${APP_URL}/themes#faq`,
 mainEntity: faqs.map((faq) => ({
  '@type': 'Question',
  name: faq.q,
  acceptedAnswer: { '@type': 'Answer', text: faq.a },
 })),
 };

 return (
 <main className="paper-page min-h-screen text-[var(--ink)]">
  <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
  />
  <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
  />
  <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
  />

  <div className="max-w-6xl mx-auto px-4 pt-6">
  <div className="flex justify-end">
   <ThemeToggleButton />
  </div>
  <nav aria-label="パンくずリスト" className="text-xs text-[var(--ink-soft)] mb-5">
   <ol className="flex flex-wrap items-center gap-1.5">
   <li><Link href="/" className="hover:text-[var(--accent)] hover:underline">雑談テーマガチャ</Link></li>
   <li aria-hidden="true">/</li>
   <li aria-current="page">カテゴリ一覧</li>
   </ol>
  </nav>

  <header className="max-w-3xl mb-10">
   <p className="paper-kicker mb-2">ALL CATEGORIES</p>
   <h1 className="font-editorial text-3xl sm:text-4xl text-[var(--ink)] mb-3">
   雑談お題のカテゴリ一覧
   </h1>
   <p className="text-sm sm:text-base text-[var(--ink-soft)] leading-relaxed">
   {themeCategories.length}カテゴリ・{totalThemeCount}以上のお題から、会議や雑談に合った話題を選べます。カテゴリページでは、そのカテゴリのお題を一覧で確認でき、ガチャを回したり、気になるお題をコピーしたりできます。
   </p>
   <div className="flex flex-wrap gap-3 mt-5">
   <Link
    href="/#gacha"
    className="paper-button-primary px-5 py-3 text-sm"
   >
        ガチャを回す
   </Link>
   <Link
    href="/"
    className="paper-button px-5 py-3 text-sm"
   >
    ホームに戻る
   </Link>
   </div>
  </header>

  <CategoryGrid exampleCount={3} />

  <section aria-labelledby="tips-heading" className="mt-14">
   <h2 id="tips-heading" className="font-editorial text-2xl text-[var(--ink)] mb-2">
   シーン別・カテゴリの選び方
   </h2>
   <p className="text-sm text-[var(--ink-soft)] mb-5">
   会話の目的に合わせてカテゴリを選ぶと、お題がより活きやすくなります。
   </p>
   <div className="grid md:grid-cols-3 gap-4">
   {categoryTips.map((tip) => (
    <div key={tip.title} className="p-5 bg-[var(--paper-strong)] rounded-none border border-[var(--line)]">
    <h3 className="font-bold text-base mb-2">{tip.title}</h3>
    <p className="text-sm text-[var(--ink-soft)] leading-relaxed mb-3">{tip.text}</p>
    <div className="flex flex-wrap gap-1.5">
     {tip.categories.map((name) => {
     const category = themeCategories.find((item) => item.name === name);
     return category ? (
      <Link
      key={name}
      href={`/themes/${category.slug}`}
      className="text-xs font-semibold text-[var(--accent)] bg-[var(--paper-muted)] rounded-full px-2.5 py-1 hover:bg-[var(--accent-soft)] transition-colors"
      >
      {name}
      </Link>
     ) : null;
     })}
    </div>
    </div>
   ))}
   </div>
  </section>
  <section aria-labelledby="themes-faq-heading" className="mt-14">
   <h2 id="themes-faq-heading" className="font-editorial text-2xl text-[var(--ink)] mb-4">
   雑談お題のカテゴリについてよくある質問
   </h2>
   <FaqList items={faqs.map((faq) => ({ question: faq.q, answer: faq.a }))} />
  </section>
  </div>
 </main>
 );
}
