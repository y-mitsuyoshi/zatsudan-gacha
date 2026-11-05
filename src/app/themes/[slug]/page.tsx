import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThemeGacha } from '@/components/ThemeGacha';
import { ThemeList } from '@/components/ThemeList';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { FaqList } from '@/components/FaqList';
import { ShareButtons } from '@/components/ShareButtons';
import { themeData } from '@/lib/themeData';
import { themeCategories, themeCategoryBySlug } from '@/lib/themeCategories';
import { guides } from '@/lib/guideData';

const APP_URL = 'https://zatsudan-gacha.app';

type CategoryPageProps = {
 params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
 return themeCategories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
 const { slug } = await params;
 const category = themeCategoryBySlug.get(slug);

 if (!category) {
 return {
  title: 'カテゴリが見つかりません',
 };
 }

 const themeCount = themeData[category.name]?.length ?? 0;
 const title = `「${category.name}」の雑談お題まとめ（${themeCount}問）`;
 const description = `${category.description} 会議のアイスブレイク、1on1、リモートワークの雑談に使える${themeCount}問のお題を一覧で紹介。気になるお題はタップしてコピーできます。`;
 const url = `${APP_URL}/themes/${category.slug}`;

 return {
 title,
 description,
 keywords: [
  `${category.name} 雑談`,
  `${category.name} お題`,
  `${category.name} アイスブレイク`,
  '雑談テーマ',
  '会議 雑談',
  '1on1 質問',
 ],
 alternates: {
  canonical: `/themes/${category.slug}`,
 },
 openGraph: {
  title: `${title}｜雑談テーマガチャ`,
  description,
  url,
  siteName: '雑談テーマガチャ',
  locale: 'ja_JP',
  type: 'website',
  images: [
  {
   url: `${APP_URL}/ogp.png`,
   width: 1200,
   height: 630,
   alt: `「${category.name}」の雑談お題 - 雑談テーマガチャ`,
  },
  ],
 },
 twitter: {
  card: 'summary_large_image',
  title: `${title}｜雑談テーマガチャ`,
  description,
  images: [`${APP_URL}/ogp.png`],
 },
 };
}

function serializeJsonLd(data: unknown): string {
 return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default async function CategoryPage({ params }: CategoryPageProps) {
 const { slug } = await params;
 const category = themeCategoryBySlug.get(slug);

 if (!category) {
 notFound();
 }

 const themes = themeData[category.name] ?? [];
 const currentIndex = themeCategories.findIndex((item) => item.slug === category.slug);
 const relatedCategories = [
 ...themeCategories.slice(currentIndex + 1),
 ...themeCategories.slice(0, currentIndex),
 ].slice(0, 6);

 const categoryFaqs = [
 {
  q: `「${category.name}」の雑談お題はいくつありますか？`,
  a: `現在「${category.name}」カテゴリには${themes.length}問のお題を収録しています。会議のアイスブレイク、1on1、リモートワークの雑談などにご利用ください。`,
 },
 {
  q: `「${category.name}」のお題はどんな場面で使えますか？`,
  a: `${category.description} 会議の冒頭、チームの交流、研修のワークショップ、飲み会の話題づくりなど、会話のきっかけが必要な場面で使えます。`,
 },
 {
  q: `「${category.name}」のお題は無料で使えますか？`,
  a: 'はい。すべてのお題を無料で利用できます。ログインや会員登録は不要です。お題はタップしてコピーできます。',
 },
 {
  q: 'スマートフォンでも使えますか？',
  a: 'はい。スマートフォン・タブレット・PCのブラウザに対応しています。ガチャの抽選やお題のコピーもそのまま利用できます。',
 },
 ];

 const faqJsonLd = {
 '@context': 'https://schema.org',
 '@type': 'FAQPage',
 mainEntity: categoryFaqs.map((faq) => ({
  '@type': 'Question',
  name: faq.q,
  acceptedAnswer: { '@type': 'Answer', text: faq.a },
 })),
 };

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
  {
  '@type': 'ListItem',
  position: 3,
  name: `${category.name}の雑談お題`,
  item: `${APP_URL}/themes/${category.slug}`,
  },
 ],
 };

 const itemListJsonLd = {
 '@context': 'https://schema.org',
 '@type': 'ItemList',
 name: `${category.name}の雑談お題`,
 description: category.description,
 numberOfItems: themes.length,
 itemListOrder: 'https://schema.org/ItemListOrderAscending',
 itemListElement: themes.map((theme, index) => ({
  '@type': 'ListItem',
  position: index + 1,
  name: theme,
 })),
 };

 const collectionJsonLd = {
 '@context': 'https://schema.org',
 '@type': 'CollectionPage',
 '@id': `${APP_URL}/themes/${category.slug}#collection`,
 name: `「${category.name}」の雑談お題`,
 description: category.description,
 url: `${APP_URL}/themes/${category.slug}`,
 inLanguage: 'ja-JP',
 isPartOf: { '@id': `${APP_URL}/#website` },
 mainEntity: itemListJsonLd,
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

  <div className="max-w-4xl mx-auto px-4 pt-6 pb-12">
  <div className="flex justify-end">
   <ThemeToggleButton />
  </div>

  <nav aria-label="パンくずリスト" className="text-xs text-[var(--ink-soft)] mb-5">
   <ol className="flex flex-wrap items-center gap-1.5">
   <li><Link href="/" className="hover:text-[var(--accent)] hover:underline">雑談テーマガチャ</Link></li>
   <li aria-hidden="true">/</li>
   <li><Link href="/themes" className="hover:text-[var(--accent)] hover:underline">カテゴリ一覧</Link></li>
   <li aria-hidden="true">/</li>
   <li aria-current="page">{category.name}</li>
   </ol>
  </nav>

  <header className="mb-8">
   <div className="flex items-center gap-3 mb-3">
   <span className="font-label text-[10px] text-[var(--accent)]">Category</span>
   <span className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent-soft)] rounded-full px-3 py-1.5">
    {themes.length}問収録
   </span>
   </div>
   <h1 className="font-editorial text-3xl sm:text-4xl text-[var(--ink)] mb-3">
   「{category.name}」の雑談お題
   </h1>
   <p className="text-sm sm:text-base text-[var(--ink-soft)] leading-relaxed">
   {category.description} 会議のアイスブレイク、1on1、リモートワークの雑談、飲み会の話題づくりにご利用ください。気になるお題をタップするとコピーできます。
   </p>
   <div className="flex flex-wrap gap-3 mt-5">
   <Link
    href="/#gacha"
    className="paper-button-primary px-5 py-3 text-sm"
   >
        全カテゴリでガチャを回す
   </Link>
   <Link
    href="/themes"
    className="paper-button px-5 py-3 text-sm"
   >
    他のカテゴリを見る
   </Link>
   </div>
   <p className="mt-3 text-sm">
   <Link href="/icebreak" className="font-semibold text-[var(--accent)] hover:underline">
    会議のアイスブレイク向けお題30選も見る →
   </Link>
   </p>
  </header>

  <section className="mb-12" aria-label={`${category.name}カテゴリのガチャ`}>
   <ThemeGacha initialCategory={category.name} />
  </section>

  <section aria-labelledby="theme-list-heading" className="mb-14">
   <div className="mb-4">
   <p className="paper-kicker mb-2">THEME LIST</p>
   <h2 id="theme-list-heading" className="font-editorial text-2xl text-[var(--ink)]">
    {category.name}のお題一覧
   </h2>
   </div>
   <ThemeList themes={themes} categoryName={category.name} />
  </section>

  <section aria-labelledby="tips-heading" className="mb-14">
   <h2 id="tips-heading" className="font-editorial text-2xl text-[var(--ink)] mb-4">
   {category.name}のお題で会話を広げるコツ
   </h2>
   <div className="grid sm:grid-cols-3 gap-3">
   {[
    {
    title: '答えやすいお題から',
    text: '最初は「好きな食べ物」など答えやすいお題を選ぶと、会話が始まりやすくなります。',
    },
    {
    title: 'ひとつ質問を重ねる',
    text: '相手の答えに対して「それはなぜ？」「最近だと？」と聞くと、自然に話が広がります。',
    },
    {
    title: 'AI深掘りも活用',
    text: '会話が止まりそうなときは、ガチャのAI深掘り機能で質問のヒントをもらうのもおすすめです。',
    },
   ].map((tip) => (
    <div key={tip.title} className="p-4 bg-[var(--paper-strong)] rounded-sm border border-[var(--line)]">

    <h3 className="font-bold text-sm mt-2 mb-1.5">{tip.title}</h3>
    <p className="text-xs text-[var(--ink-soft)] leading-relaxed">{tip.text}</p>
    </div>
   ))}
   </div>
  </section>

  <section aria-labelledby="category-faq-heading" className="mb-14">
   <p className="paper-kicker mb-2">FAQ</p>
   <h2 id="category-faq-heading" className="font-editorial text-2xl text-[var(--ink)] mb-4">
   「{category.name}」のお題についてよくある質問
   </h2>
   <FaqList items={categoryFaqs.map((faq) => ({ question: faq.q, answer: faq.a }))} />
  </section>

  <section aria-labelledby="related-guides-heading" className="mb-14">
   <div className="mb-4 flex items-end justify-between gap-3">
   <h2 id="related-guides-heading" className="font-editorial text-2xl text-[var(--ink)]">
    あわせて読みたいシーン別ガイド
   </h2>
   <Link href="/guides" className="text-sm font-bold text-[var(--accent)] hover:underline">
    ガイド一覧 →
   </Link>
   </div>
   <div className="grid gap-3 sm:grid-cols-3">
   {guides.slice(0, 3).map((guide) => (
    <Link key={guide.slug} href={`/guides/${guide.slug}`} className="rounded-sm border border-[var(--line)] bg-[var(--paper-strong)] p-4 transition hover:border-[var(--accent)] ">
    <p className="text-xs font-bold text-[var(--accent)]">{guide.title}</p>
    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)] line-clamp-2">{guide.description}</p>
    </Link>
   ))}
   </div>
  </section>

  <section aria-labelledby="related-heading">
   <div className="flex items-end justify-between gap-3 mb-4">
   <h2 id="related-heading" className="font-editorial text-2xl text-[var(--ink)]">
    他のカテゴリのお題
   </h2>
   <Link href="/themes" className="text-sm font-bold text-[var(--accent)] hover:underline">
    すべて見る →
   </Link>
   </div>
   <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
   {relatedCategories.map((related) => (
    <Link
    key={related.slug}
    href={`/themes/${related.slug}`}
    className="group flex items-center gap-3 p-4 bg-[var(--paper-strong)] rounded-sm border border-[var(--line)] hover:border-[var(--accent)] transition-all"
    >

    <span>
     <span className="block text-sm font-bold text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
     {related.name}の雑談お題
     </span>
     <span className="block text-xs text-[var(--ink-soft)] mt-0.5">
     {themeData[related.name]?.length ?? 0}問
     </span>
    </span>
    </Link>
   ))}
   </div>
  </section>

  <ShareButtons
   shareText={`${category.name}の雑談お題`}
   heading={`「${category.name}」のお題をシェアする`}
  />
  </div>
 </main>
 );
}
