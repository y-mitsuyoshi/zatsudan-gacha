import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection, type SeoFaq, type SeoFeature, type SeoRelated, type SeoStep } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

export type PartyGameSeo = {
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

export function PartyGameShell({ seo, children }: { seo: PartyGameSeo; children: React.ReactNode }) {
  const url = `${APP_URL}${seo.slug}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      '@id': `${url}#videogame`,
      name: seo.name,
      headline: seo.h1,
      description: seo.description,
      url,
      image: `${APP_URL}/og${seo.slug}.png`,
      screenshot: `${APP_URL}/og${seo.slug}.png`,
      genre: [seo.category, 'パーティーゲーム'],
      playMode: 'MultiPlayer',
      gamePlatform: ['Web browser', 'Desktop Web browser', 'Mobile Web browser'],
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      inLanguage: 'ja-JP',
      isAccessibleForFree: true,
      publisher: { '@id': `${APP_URL}/#organization` },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${url}#webapp`,
      name: seo.name,
      headline: seo.h1,
      description: seo.description,
      url,
      image: `${APP_URL}/og${seo.slug}.png`,
      screenshot: `${APP_URL}/og${seo.slug}.png`,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      inLanguage: 'ja-JP',
      isAccessibleForFree: true,
      isPartOf: { '@id': `${APP_URL}/#website` },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      publisher: { '@id': `${APP_URL}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: `${seo.name}の遊び方`,
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
  ];

  return (
    <main className="paper-page min-h-screen">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <Link href="/games" className="font-label text-[10px] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]">
            ← ゲーム一覧
          </Link>
          <ThemeToggleButton />
        </header>

        <nav aria-label="パンくずリスト" className="mt-4 font-label text-[9px] text-[var(--ink-soft)]">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-[var(--accent)]">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/games" className="hover:text-[var(--accent)]">無料ゲーム一覧</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{seo.name}</li>
          </ol>
        </nav>

        <section className="grid gap-7 py-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
          <div>
            <p className="paper-kicker">Party Game / {seo.category}</p>
            <h1 className="font-editorial mt-3 text-3xl leading-tight text-balance sm:text-4xl">
              {seo.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              {seo.description}
            </p>
          </div>
          <div className="border-l border-[var(--line)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-label text-[9px] text-[var(--accent)]">Play Style</p>
            <p className="mt-2">1台の端末を回して遊ぶ、オンサイト・オフサイト向けパーティーゲーム。登録不要、PC・スマホ対応。</p>
          </div>
        </section>

        <div className="pb-12">{children}</div>
      </div>

      <SeoContentSection
        eyebrow="PARTY GAME GUIDE"
        title={`${seo.name}の遊び方とFAQ`}
        intro={seo.description}
        features={seo.features}
        steps={seo.steps}
        faqs={seo.faqs}
        related={seo.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ゲーム一覧', href: '/games' },
          { label: seo.name },
        ]}
      />
    </main>
  );
}
