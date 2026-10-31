import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThemeGacha } from '@/components/ThemeGacha';
import { ThemeList } from '@/components/ThemeList';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { ShareButtons } from '@/components/ShareButtons';
import { themeData } from '@/lib/themeData';
import { themeCategories, themeCategoryBySlug } from '@/lib/themeCategories';

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
    alternates: {
      canonical: `/themes/${category.slug}`,
    },
    openGraph: {
      title: `${title}｜雑談テーマガチャ`,
      description,
      url,
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
    itemListElement: themes.map((theme, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: theme,
    })),
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }}
      />

      <div className="max-w-4xl mx-auto px-4 pt-6 pb-12">
        <div className="flex justify-end">
          <ThemeToggleButton />
        </div>

        <nav aria-label="パンくずリスト" className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/themes" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">カテゴリ一覧</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{category.name}</li>
          </ol>
        </nav>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl sm:text-5xl" aria-hidden="true">{category.emoji}</span>
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 rounded-full px-3 py-1.5">
              {themes.length}問収録
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-3">
            「{category.name}」の雑談お題
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            {category.description} 会議のアイスブレイク、1on1、リモートワークの雑談、飲み会の話題づくりにご利用ください。気になるお題をタップするとコピーできます。
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              href="/#gacha"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl transition-colors"
            >
              <span aria-hidden="true">🎲</span>
              全カテゴリでガチャを回す
            </Link>
            <Link
              href="/themes"
              className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-indigo-400 text-gray-700 dark:text-gray-200 font-bold px-5 py-3 rounded-xl transition-colors"
            >
              他のカテゴリを見る
            </Link>
          </div>
          <p className="mt-3 text-sm">
            <Link href="/icebreak" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              会議のアイスブレイク向けお題30選も見る →
            </Link>
          </p>
        </header>

        <section className="mb-12" aria-label={`${category.name}カテゴリのガチャ`}>
          <ThemeGacha initialCategory={category.name} />
        </section>

        <section aria-labelledby="theme-list-heading" className="mb-14">
          <div className="mb-4">
            <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">THEME LIST</p>
            <h2 id="theme-list-heading" className="text-2xl font-black text-gray-900 dark:text-white">
              {category.name}のお題一覧
            </h2>
          </div>
          <ThemeList themes={themes} categoryName={category.name} />
        </section>

        <section aria-labelledby="tips-heading" className="mb-14">
          <h2 id="tips-heading" className="text-2xl font-black text-gray-900 dark:text-white mb-4">
            {category.name}のお題で会話を広げるコツ
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                emoji: '🗣️',
                title: '答えやすいお題から',
                text: '最初は「好きな食べ物」など答えやすいお題を選ぶと、会話が始まりやすくなります。',
              },
              {
                emoji: '❓',
                title: 'ひとつ質問を重ねる',
                text: '相手の答えに対して「それはなぜ？」「最近だと？」と聞くと、自然に話が広がります。',
              },
              {
                emoji: '✨',
                title: 'AI深掘りも活用',
                text: '会話が止まりそうなときは、ガチャのAI深掘り機能で質問のヒントをもらうのもおすすめです。',
              },
            ].map((tip) => (
              <div key={tip.title} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-xl" aria-hidden="true">{tip.emoji}</span>
                <h3 className="font-bold text-sm mt-2 mb-1.5">{tip.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="related-heading">
          <div className="flex items-end justify-between gap-3 mb-4">
            <h2 id="related-heading" className="text-2xl font-black text-gray-900 dark:text-white">
              他のカテゴリのお題
            </h2>
            <Link href="/themes" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              すべて見る →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {relatedCategories.map((related) => (
              <Link
                key={related.slug}
                href={`/themes/${related.slug}`}
                className="group flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all"
              >
                <span className="text-2xl" aria-hidden="true">{related.emoji}</span>
                <span>
                  <span className="block text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {related.name}の雑談お題
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
