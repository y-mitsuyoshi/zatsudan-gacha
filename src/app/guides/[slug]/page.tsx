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
    alternates: {
      canonical: `/guides/${guide.slug}`,
    },
    openGraph: {
      title: `${guide.title}｜雑談テーマガチャ`,
      description: guide.description,
      url: `${APP_URL}/guides/${guide.slug}`,
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
    headline: guide.h1,
    description: guide.description,
    mainEntityOfPage: `${APP_URL}/guides/${guide.slug}`,
    image: `${APP_URL}/ogp.png`,
    inLanguage: 'ja-JP',
    datePublished: '2026-11-03',
    dateModified: '2026-11-03',
    author: { '@id': `${APP_URL}/#organization` },
    publisher: { '@id': `${APP_URL}/#organization` },
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
    mainEntity: guide.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="mx-auto max-w-3xl px-4 pt-5 pb-10">
        <div className="flex justify-end">
          <ThemeToggleButton />
        </div>
        <nav aria-label="パンくずリスト" className="mb-5 text-xs text-gray-500 dark:text-gray-400">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:underline">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/guides" className="hover:underline">シーン別ガイド</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{guide.h1}</li>
          </ol>
        </nav>

        <header>
          <span className="text-4xl" aria-hidden="true">{guide.emoji}</span>
          <p className="mt-3 text-xs font-black tracking-[0.25em] text-indigo-600 dark:text-indigo-400">SCENE GUIDE</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-gray-900 dark:text-white sm:text-4xl">
            {guide.h1}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
            {guide.intro}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
              質問 {allThemes.length}選
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              コピーして使える
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              無料
            </span>
          </div>
        </header>

        <div className="mt-9 space-y-10">
          {guide.sections.map((section, index) => (
            <section key={section.title} aria-labelledby={`section-${index}`}>
              <h2 id={`section-${index}`} className="text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {section.description}
              </p>
              <div className="mt-4">
                <ThemeList themes={section.themes} showHint={index === 0} />
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10" aria-labelledby="tips-heading">
          <h2 id="tips-heading" className="text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
            会話を広げるコツ
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {guide.tips.map((tip) => (
              <div key={tip.title} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-sm font-black text-gray-900 dark:text-white">{tip.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{tip.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-indigo-800 dark:from-indigo-950/30 dark:to-gray-800" aria-labelledby="gacha-cta-heading">
          <h2 id="gacha-cta-heading" className="text-xl font-black text-gray-900 dark:text-white">
            このガイドのお題でガチャを回す
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            気になるお題をコピーするだけでなく、ガチャでランダムに選ぶこともできます。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/#gacha" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">
              ガチャを回す
            </Link>
            <Link href="/themes" className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:border-indigo-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
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
