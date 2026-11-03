import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '無料で使える便利ツール一覧｜プロフィール・診断・言い訳・駅名標',
  description: '推し活プロフィールメーカー、異世界転生ステータスカード、究極の言い訳ジェネレーター、駅名標メーカーなど、登録不要で使える無料Webツールを一覧で紹介します。スマホ対応。',
  alternates: {
    canonical: '/tools',
  },
  openGraph: {
    title: '無料で使える便利ツール一覧',
    description: 'プロフィール作成、異世界診断、AI言い訳生成、駅名標作成。登録不要で使える無料Webツールをまとめました。',
    url: `${APP_URL}/tools`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '無料で使える便利ツール一覧' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '無料で使える便利ツール一覧',
    description: 'プロフィール作成、異世界診断、AI言い訳生成、駅名標作成。登録不要で使える無料Webツールをまとめました。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const tools = [
  {
    name: '推し活プロフィールメーカー',
    href: '/profile-maker',
    icon: '💖',
    tagline: '推しの「好き」をカードに',
    description: '名前・好きなところ・出会いのきっかけ・名言を入力して、オリジナルの推し紹介カードを作成。10種類のテンプレート、自動保存、画像保存、テキストコピー、Xシェアに対応。',
    color: 'from-fuchsia-500 to-pink-500',
  },
  {
    name: '異世界転生ステータスカード',
    href: '/isekai-status',
    icon: '⚔️',
    tagline: '異世界での自分を診断',
    description: '5つの質問に答えるだけで、職業・能力値・固有スキル・装備・レアリティを診断。N/R/SR/SSRのレアリティ判定と画像保存に対応。',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    name: '究極の言い訳ジェネレーター',
    href: '/excuse-generator',
    icon: '🙇‍♂️',
    tagline: 'AIが言い訳を考えます',
    description: '遅刻・納期遅れ・飲み会の断りなど、シチュエーションと10種類のトーンからAIが言い訳を生成。生成履歴はブラウザに保存されます。',
    color: 'from-sky-500 to-cyan-500',
  },
  {
    name: '駅名標メーカー',
    href: '/station-sign-maker',
    icon: '🚉',
    tagline: 'オリジナル駅名標を作成',
    description: '駅名・ローマ字・路線記号・駅番号・路線カラーを入力して、自分だけの駅名標を作成。3種類のテンプレート、画像保存、Xシェアに対応。',
    color: 'from-emerald-500 to-teal-500',
  },
];

const faqs = [
  { q: '紹介しているツールは無料ですか？', a: 'はい。すべて無料で利用できます。会員登録やログインは不要です。' },
  { q: 'スマートフォンでも使えますか？', a: 'はい。各ツールはスマートフォンのブラウザに対応しています。' },
  { q: '入力した内容はサーバーに送信されますか？', a: 'ツールによって異なります。プロフィールと駅名標はブラウザ内で処理され、サーバーには送信されません。言い訳ジェネレーターはAI生成のため、入力内容がGoogle Gemini APIに送信されます。' },
  { q: '作成した画像はSNSで使えますか？', a: 'はい。画像として保存できるツールは、SNSの投稿やプロフィールに利用できます。' },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '無料で使える便利ツール一覧',
    description: '登録不要で使える無料Webツールの一覧。',
    url: `${APP_URL}/tools`,
    inLanguage: 'ja-JP',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: tools.length,
      itemListElement: tools.map((tool, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: tool.name,
        url: `${APP_URL}${tool.href}`,
      })),
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
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
    ],
  },
];

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-5xl px-4 pt-5">
        <div className="flex justify-end">
          <ThemeToggleButton />
        </div>
        <nav aria-label="パンくずリスト" className="mb-5 text-xs text-gray-500 dark:text-gray-400">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="hover:underline">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">無料ツール一覧</li>
          </ol>
        </nav>
        <header className="mb-8 max-w-3xl">
          <p className="text-xs font-black tracking-[0.25em] text-indigo-600 dark:text-indigo-400">FREE TOOLS</p>
          <h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
            無料で使える便利ツール
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
            推し活プロフィール、異世界キャラ診断、AI言い訳、駅名標作成。登録不要で今すぐ使える無料Webツールをまとめました。
            スマートフォン・PCのどちらでも利用できます。
          </p>
        </header>
      </div>

      <SeoContentSection
        eyebrow="PICK A TOOL"
        title="4つの無料Webツール"
        intro="用途に合わせて、気になるツールを選んでください。"
        faqs={faqs}
        related={[
          { href: '/games', label: '無料ブラウザゲーム一覧', description: '社畜ゲームをまとめて探す' },
          { href: '/themes', label: '雑談お題カテゴリ一覧', description: '会話のネタを探す' },
        ]}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500"
            >
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} text-2xl shadow-sm`} aria-hidden="true">
                {tool.icon}
              </div>
              <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400">{tool.tagline}</p>
              <h3 className="mt-1 text-base font-black text-gray-900 dark:text-white">{tool.name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{tool.description}</p>
              <span className="mt-3 inline-flex text-xs font-bold text-indigo-600 dark:text-indigo-400">無料で使う →</span>
            </Link>
          ))}
        </div>
      </SeoContentSection>
    </main>
  );
}
