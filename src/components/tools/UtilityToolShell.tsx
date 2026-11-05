import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection, type SeoFaq, type SeoFeature, type SeoRelated, type SeoStep } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

export type UtilityToolSeo = {
  slug: string;
  name: string;
  h1: string;
  description: string;
  category: string;
  features: SeoFeature[];
  steps: SeoStep[];
  faqs: SeoFaq[];
  related: SeoRelated[];
};

const APP_URL = 'https://zatsudan-gacha.app';

export function UtilityToolShell({ seo, children }: { seo: UtilityToolSeo; children: React.ReactNode }) {
  const url = `${APP_URL}${seo.slug}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${url}#webapp`,
      name: seo.name,
      headline: seo.h1,
      description: seo.description,
      url,
      image: `${APP_URL}/ogp.png`,
      screenshot: `${APP_URL}/ogp.png`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      inLanguage: 'ja-JP',
      isAccessibleForFree: true,
      isPartOf: { '@id': `${APP_URL}/#website` },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      publisher: { '@id': `${APP_URL}/#organization` },
      featureList: seo.features.map((feature) => feature.title),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: `${seo.name}の使い方`,
      description: seo.description,
      inLanguage: 'ja-JP',
      step: seo.steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.title,
        text: step.text,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: seo.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '雑談テーマガチャ', item: `${APP_URL}/` },
        { '@type': 'ListItem', position: 2, name: '無料ツール一覧', item: `${APP_URL}/tools` },
        { '@type': 'ListItem', position: 3, name: seo.name, item: url },
      ],
    },
  ];

  return (
    <main className="paper-page min-h-screen">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <Link href="/tools" className="font-label text-[10px] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]">
            ← ツール一覧
          </Link>
          <ThemeToggleButton />
        </header>

        <nav aria-label="パンくずリスト" className="mt-4 font-label text-[9px] text-[var(--ink-soft)]">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-[var(--accent)]">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/tools" className="hover:text-[var(--accent)]">無料ツール一覧</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{seo.name}</li>
          </ol>
        </nav>

        <section className="grid gap-7 py-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
          <div>
            <p className="paper-kicker">Utility Tool / {seo.category}</p>
            <h1 className="font-editorial mt-3 text-3xl leading-tight text-balance sm:text-4xl">
              {seo.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              {seo.description}
            </p>
          </div>
          <div className="border-l border-[var(--line)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-label text-[9px] text-[var(--accent)]">Privacy First</p>
            <p className="mt-2">入力内容は原則ブラウザ内で処理。登録不要、PC・スマホ対応。サーバーへ送信されるツールはありません。</p>
          </div>
        </section>

        <div className="pb-12">{children}</div>
      </div>

      <SeoContentSection
        eyebrow="TOOL GUIDE"
        title={`${seo.name}の使い方とFAQ`}
        intro={seo.description}
        features={seo.features}
        steps={seo.steps}
        faqs={seo.faqs}
        related={seo.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ツール一覧', href: '/tools' },
          { label: seo.name },
        ]}
      />
    </main>
  );
}
