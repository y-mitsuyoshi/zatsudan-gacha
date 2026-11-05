import Link from 'next/link';
import { JsonLd } from './JsonLd';

export type SeoFaq = {
  q: string;
  a: string;
};

export type SeoFeature = {
  title: string;
  text: string;
};

export type SeoStep = {
  title: string;
  text: string;
};

export type SeoRelated = {
  href: string;
  label: string;
  description?: string;
};

export type SeoBreadcrumb = {
  label: string;
  href?: string;
};

type SeoContentSectionProps = {
  variant?: 'light' | 'dark';
  eyebrow: string;
  title: string;
  intro: string;
  features?: SeoFeature[];
  steps?: SeoStep[];
  faqs: SeoFaq[];
  related?: SeoRelated[];
  breadcrumbs?: SeoBreadcrumb[];
  jsonLd?: unknown[];
  children?: React.ReactNode;
  className?: string;
};

const BASE_URL = 'https://zatsudan-gacha.app';

export function SeoContentSection({
  variant = 'light',
  eyebrow,
  title,
  intro,
  features = [],
  steps = [],
  faqs,
  related = [],
  breadcrumbs,
  jsonLd = [],
  children,
  className = '',
}: SeoContentSectionProps) {
  const isDark = variant === 'dark';

  const breadcrumbJsonLd = breadcrumbs && breadcrumbs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
          ...(item.href ? { item: new URL(item.href, BASE_URL).toString() } : {}),
        })),
      }
    : null;

  const sectionClass = isDark
    ? 'bg-[#12100d] text-[#f2e9d8]'
    : 'bg-[var(--paper)] text-[var(--ink)]';
  const cardClass = isDark
    ? 'border border-[#3b3328] bg-[#1d1914]'
    : 'border border-[var(--line)] bg-[var(--paper-strong)]';
  const mutedClass = isDark ? 'text-[#b7a992]' : 'text-[var(--ink-soft)]';
  const eyebrowClass = isDark ? 'text-[#dfb15b]' : 'text-[var(--accent)]';
  const headingClass = isDark ? 'text-[#f2e9d8]' : 'text-[var(--ink)]';
  const ruleClass = isDark ? 'border-[#3b3328]' : 'border-[var(--line)]';

  return (
    <section className={`${sectionClass} ${className}`} aria-labelledby="seo-content-heading">
      <JsonLd data={breadcrumbJsonLd ? [breadcrumbJsonLd, ...jsonLd] : jsonLd} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="SEOコンテンツのパンくずリスト" className={`mb-7 border-b ${ruleClass} pb-3 text-[11px] ${mutedClass}`}>
            <ol className="flex flex-wrap items-center gap-1.5">
              {breadcrumbs.map((item, index) => (
                <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden="true">/</span>}
                  {item.href ? (
                    <Link href={item.href} className="hover:text-[var(--accent)] hover:underline">
                      {item.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="max-w-3xl">
          <p className={`font-label text-[10px] font-bold ${eyebrowClass}`}>{eyebrow}</p>
          <h2 id="seo-content-heading" className={`font-editorial mt-2 text-2xl sm:text-3xl ${headingClass}`}>
            {title}
          </h2>
          <p className={`mt-3 text-sm leading-7 ${mutedClass}`}>
            {intro}
          </p>
        </div>

        {features.length > 0 && (
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div key={feature.title} className={`${cardClass} p-4`}>
                <span className={`font-label text-[10px] ${eyebrowClass}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className={`mt-2 text-sm font-black ${headingClass}`}>{feature.title}</h3>
                <p className={`mt-1.5 text-xs leading-6 ${mutedClass}`}>{feature.text}</p>
              </div>
            ))}
          </div>
        )}

        {steps.length > 0 && (
          <div className="mt-10">
            <div className={`flex items-end justify-between border-b ${ruleClass} pb-2`}>
              <h3 className={`font-editorial text-xl ${headingClass}`}>遊び方・使い方</h3>
              <span className={`font-label text-[10px] ${mutedClass}`}>Steps</span>
            </div>
            <ol className="mt-3 space-y-2">
              {steps.map((step, index) => (
                <li key={step.title} className={`${cardClass} flex gap-3 p-4`}>
                  <span className={`font-label flex h-7 w-7 shrink-0 items-center justify-center border text-[10px] font-bold ${isDark ? 'border-[#5a4b38] bg-[#26211a] text-[#dfb15b]' : 'border-[var(--line-strong)] bg-[var(--paper-muted)] text-[var(--ink)]'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className={`text-sm font-bold ${headingClass}`}>{step.title}</p>
                    <p className={`mt-0.5 text-xs leading-6 ${mutedClass}`}>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {children && <div className="mt-10">{children}</div>}

        <div className="mt-10">
          <div className={`flex items-end justify-between border-b ${ruleClass} pb-2`}>
            <h3 className={`font-editorial text-xl ${headingClass}`}>よくある質問</h3>
            <span className={`font-label text-[10px] ${mutedClass}`}>FAQ</span>
          </div>
          <div className="mt-3 space-y-2">
            {faqs.map((faq) => (
              <details key={faq.q} className={`${cardClass} group`}>
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-bold ${headingClass}`}>
                  <span>{faq.q}</span>
                  <span className={`shrink-0 text-lg transition-transform group-open:rotate-45 ${eyebrowClass}`} aria-hidden="true">＋</span>
                </summary>
                <p className={`border-t ${ruleClass} px-4 py-3 text-xs leading-6 ${mutedClass}`}>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-10">
            <div className={`flex items-end justify-between border-b ${ruleClass} pb-2`}>
              <h3 className={`font-editorial text-xl ${headingClass}`}>関連ページ</h3>
              <span className={`font-label text-[10px] ${mutedClass}`}>Related</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${cardClass} group flex items-center justify-between gap-4 p-4 transition-colors hover:border-[var(--accent)]`}
                >
                  <span>
                    <span className={`block text-sm font-bold group-hover:text-[var(--accent)] ${headingClass}`}>{item.label}</span>
                    {item.description && <span className={`mt-0.5 block text-xs ${mutedClass}`}>{item.description}</span>}
                  </span>
                  <span className={`font-label text-xs ${eyebrowClass}`} aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
