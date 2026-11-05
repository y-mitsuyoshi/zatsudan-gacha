import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { ThemeList } from '@/components/ThemeList';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { ShareButtons } from '@/components/ShareButtons';
import { guides, getGuideBySlug } from '@/lib/guideData';

const APP_URL = 'https://zatsudan-gacha.app';

type GuidePageProps = {
 params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
 return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
 const { slug } = await params;
 const guide = getGuideBySlug(slug);
 if (!guide) {
 return { title: 'ガイドが見つかりません' };
 }

 return {
 title: guide.title,
 description: guide.description,
 keywords: [
  guide.title,
  '雑談 お題',
  'アイスブレイク',
  '会議 雑談',
  '1on1 質問',
  'チームビルディング',
 ],
 alternates: {
  canonical: `/guides/${guide.slug}`,
 },
 openGraph: {
  title: `${guide.title}｜雑談テーマガチャ`,
  description: guide.description,
  url: `${APP_URL}/guides/${guide.slug}`,
  siteName: '雑談テーマガチャ',
  locale: 'ja_JP',
  type: 'article',
  images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: guide.title }],
 },
 twitter: {
  card: 'summary_large_image',
  title: `${guide.title}｜雑談テーマガチャ`,
  description: guide.description,
  images: [`${APP_URL}/ogp.png`],
 },
 };
}

export default async function GuidePage({ params }: GuidePageProps) {
 const { slug } = await params;
 const guide = getGuideBySlug(slug);
 if (!guide) {
 notFound();
 }

 const allThemes = guide.sections.flatMap((section) => section.themes);

 const articleJsonLd = {
 '@context': 'https://schema.org',
 '@type': 'Article',
 '@id': `${APP_URL}/guides/${guide.slug}#article`,
 headline: guide.h1,
 description: guide.description,
 mainEntityOfPage: { '@type': 'WebPage', '@id': `${APP_URL}/guides/${guide.slug}` },
 image: `${APP_URL}/ogp.png`,
 inLanguage: 'ja-JP',
 datePublished: '2026-11-03',
 dateModified: '2026-11-05',
 articleSection: 'シーン別・雑談お題ガイド',
 keywords: ['雑談', 'アイスブレイク', '会議', '1on1', guide.title],
 author: { '@type': 'Organization', '@id': `${APP_URL}/#organization`, name: '雑談テーマガチャ運営チーム' },
 publisher: { '@type': 'Organization', '@id': `${APP_URL}/#organization`, name: '雑談テーマガチャ', logo: { '@type': 'ImageObject', url: `${APP_URL}/favicon.png` } },
 isPartOf: { '@id': `${APP_URL}/#website` },
 };

 const howToJsonLd = {
 '@context': 'https://schema.org',
 '@type': 'HowTo',
 name: guide.h1,
 description: guide.description,
 inLanguage: 'ja-JP',
 step: guide.howToSteps.map((step, index) => ({
  '@type': 'HowToStep',
  position: index + 1,
  name: step.title,
  text: step.text,
 })),
 };

 const itemListJsonLd = {
 '@context': 'https://schema.org',
 '@type': 'ItemList',
 name: guide.h1,
 numberOfItems: allThemes.length,
 itemListElement: allThemes.map((theme, index) => ({
  '@type': 'ListItem',
  position: index + 1,
  name: theme,
 })),
 };

 const faqJsonLd = {
 '@context': 'https://schema.org',
 '@type': 'FAQPage',
 '@id': `${APP_URL}/guides/${guide.slug}#faq`,
 mainEntity: guide.faqs.map((faq) => ({
  '@type': 'Question',
  name: faq.q,
  acceptedAnswer: { '@type': 'Answer', text: faq.a },
 })),
 };

 return (
 <main className="paper-page min-h-screen text-[var(--ink)]">
  <div className="mx-auto max-w-3xl px-4 pt-5 pb-10">
  <div className="flex justify-end">
   <ThemeToggleButton />
  </div>
  <nav aria-label="パンくずリスト" className="mb-5 text-xs text-[var(--ink-soft)]">
   <ol className="flex flex-wrap items-center gap-1.5">
   <li><Link href="/" className="hover:underline">雑談テーマガチャ</Link></li>
   <li aria-hidden="true">/</li>
   <li><Link href="/guides" className="hover:underline">シーン別ガイド</Link></li>
   <li aria-hidden="true">/</li>
   <li aria-current="page">{guide.h1}</li>
   </ol>
  </nav>

  <header>
   <span className="font-label text-[9px] text-[var(--accent)]">Guide</span>
   <p className="mt-3 paper-kicker">SCENE GUIDE</p>
   <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--ink)] sm:text-4xl">
   {guide.h1}
   </h1>
   <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)] sm:text-base">
   {guide.intro}
   </p>
   <div className="mt-4 flex flex-wrap gap-2">
   <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent)] ">
    質問 {allThemes.length}選
   </span>
   <span className="rounded-full bg-[var(--paper-strong)] px-3 py-1 text-xs font-bold text-[var(--ink-soft)] ">
    コピーして使える
   </span>
   <span className="rounded-full bg-[var(--paper-strong)] px-3 py-1 text-xs font-bold text-[var(--ink-soft)] ">
    無料
   </span>
   </div>
  </header>

  <div className="mt-9 space-y-10">
   {guide.sections.map((section, index) => (
   <section key={section.title} aria-labelledby={`section-${index}`}>
    <h2 id={`section-${index}`} className="font-editorial text-xl text-[var(--ink)] sm:text-2xl">
    {section.title}
    </h2>
    <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
    {section.description}
    </p>
    <div className="mt-4">
    <ThemeList themes={section.themes} showHint={index === 0} />
    </div>
   </section>
   ))}
  </div>

  <section className="mt-10" aria-labelledby="tips-heading">
   <h2 id="tips-heading" className="font-editorial text-xl text-[var(--ink)] sm:text-2xl">
   会話を広げるコツ
   </h2>
   <div className="mt-3 grid gap-3 sm:grid-cols-3">
   {guide.tips.map((tip) => (
    <div key={tip.title} className="rounded-sm border border-[var(--line)] bg-[var(--paper-strong)] p-4 ">
    <h3 className="text-sm font-black text-[var(--ink)]">{tip.title}</h3>
    <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-soft)]">{tip.text}</p>
    </div>
   ))}
   </div>
  </section>

  <section className="mt-10 rounded-none border border-[var(--line-strong)] bg-[var(--paper-muted)] p-5 " aria-labelledby="gacha-cta-heading">
   <h2 id="gacha-cta-heading" className="font-editorial text-xl text-[var(--ink)]">
   このガイドのお題でガチャを回す
   </h2>
   <p className="mt-1 text-sm text-[var(--ink-soft)]">
   気になるお題をコピーするだけでなく、ガチャでランダムに選ぶこともできます。
   </p>
   <div className="mt-4 flex flex-wrap gap-2">
   <Link href="/#gacha" className="paper-button-primary px-4 py-2.5 text-sm">
    ガチャを回す
   </Link>
   <Link href="/themes" className="paper-button px-4 py-2.5 text-sm ">
    カテゴリから探す
   </Link>
   </div>
  </section>

  <div className="mt-8">
   <ShareButtons shareText={guide.h1} heading="このガイドをシェアする" />
  </div>
  </div>

  <SeoContentSection
  variant="light"
  eyebrow="FAQ"
  title={`${guide.title}のよくある質問`}
  intro="ガイドの内容や使い方について、よくある質問をまとめました。"
  faqs={guide.faqs}
  related={guide.related}
  breadcrumbs={[
   { label: '雑談テーマガチャ', href: '/' },
   { label: 'シーン別ガイド', href: '/guides' },
   { label: guide.h1 },
  ]}
  jsonLd={[articleJsonLd, howToJsonLd, itemListJsonLd, faqJsonLd]}
  />
 </main>
 );
}
