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
    ? 'bg-[#05070f] text-gray-200'
    : 'bg-slate-100 text-gray-800 dark:bg-slate-900 dark:text-gray-100';
  const cardClass = isDark
    ? 'rounded-2xl border border-white/10 bg-white/5'
    : 'rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400';
  const eyebrowClass = isDark ? 'text-cyan-400' : 'text-indigo-600 dark:text-indigo-400';
  const headingClass = isDark ? 'text-white' : 'text-gray-900 dark:text-white';

  return (
    <section className={`${sectionClass} ${className}`} aria-labelledby="seo-content-heading">
      <JsonLd data={breadcrumbJsonLd ? [breadcrumbJsonLd, ...jsonLd] : jsonLd} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="パンくずリスト" className={`mb-6 text-xs ${mutedClass}`}>
            <ol className="flex flex-wrap items-center gap-1.5">
              {breadcrumbs.map((item, index) => (
                <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden="true">/</span>}
                  {item.href ? (
                    <Link href={item.href} className="hover:underline hover:text-indigo-500">
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
          <p className={`text-xs font-black tracking-[0.25em] ${eyebrowClass}`}>{eyebrow}</p>
          <h2 id="seo-content-heading" className={`mt-2 text-2xl font-black sm:text-3xl ${headingClass}`}>
            {title}
          </h2>
          <p className={`mt-3 text-sm leading-relaxed sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-300'}`}>
            {intro}
          </p>
        </div>

        {features.length > 0 && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className={`${cardClass} p-4`}>
                <h3 className={`text-sm font-black ${headingClass}`}>{feature.title}</h3>
                <p className={`mt-1.5 text-xs leading-relaxed ${mutedClass}`}>{feature.text}</p>
              </div>
            ))}
          </div>
        )}

        {steps.length > 0 && (
          <div className="mt-8">
            <h3 className={`text-lg font-black ${headingClass}`}>遊び方・使い方</h3>
            <ol className="mt-3 space-y-2.5">
              {steps.map((step, index) => (
                <li key={step.title} className={`${cardClass} flex gap-3 p-4`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${isDark ? 'bg-cyan-400/15 text-cyan-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className={`text-sm font-bold ${headingClass}`}>{step.title}</p>
                    <p className={`mt-0.5 text-xs leading-relaxed ${mutedClass}`}>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {children && <div className="mt-8">{children}</div>}

        <div className="mt-10">
          <h3 className={`text-lg font-black ${headingClass}`}>よくある質問</h3>
          <div className="mt-3 space-y-2">
            {faqs.map((faq) => (
              <details key={faq.q} className={`${cardClass} group`}>
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-bold ${headingClass}`}>
                  <span>{faq.q}</span>
                  <span className={`shrink-0 text-lg transition-transform group-open:rotate-45 ${eyebrowClass}`} aria-hidden="true">＋</span>
                </summary>
                <p className={`px-4 pb-4 text-xs leading-relaxed ${mutedClass}`}>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-10">
            <h3 className={`text-lg font-black ${headingClass}`}>関連ページ</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${cardClass} group p-4 transition hover:-translate-y-0.5 hover:border-indigo-400`}
                >
                  <span className={`block text-sm font-bold group-hover:text-indigo-500 ${headingClass}`}>{item.label}</span>
                  {item.description && <span className={`mt-0.5 block text-xs ${mutedClass}`}>{item.description}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
