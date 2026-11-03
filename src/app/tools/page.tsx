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
    tagline: '推しの「好き」をカードに',
    description: '名前・好きなところ・出会いのきっかけ・名言を入力して、オリジナルの推し紹介カードを作成。10種類のテンプレート、自動保存、画像保存、テキストコピー、Xシェアに対応。',
  },
  {
    name: '異世界転生ステータスカード',
    href: '/isekai-status',
    tagline: '異世界での自分を診断',
    description: '5つの質問に答えるだけで、職業・能力値・固有スキル・装備・レアリティを診断。N/R/SR/SSRのレアリティ判定と画像保存に対応。',
  },
  {
    name: '究極の言い訳ジェネレーター',
    href: '/excuse-generator',
    tagline: 'AIが言い訳を考えます',
    description: '遅刻・納期遅れ・飲み会の断りなど、シチュエーションと10種類のトーンからAIが言い訳を生成。生成履歴はブラウザに保存されます。',
  },
  {
    name: '駅名標メーカー',
    href: '/station-sign-maker',
    tagline: 'オリジナル駅名標を作成',
    description: '駅名・ローマ字・路線記号・駅番号・路線カラーを入力して、自分だけの駅名標を作成。3種類のテンプレート、画像保存、Xシェアに対応。',
  },
];

const faqs = [
  { q: '紹介しているツールは無料ですか？', a: 'はい。すべて無料で利用できます。会員登録やログインは不要です。' },
  { q: 'スマートフォンでも使えますか？', a: 'はい。各ツールはスマートフォンのブラウザに対応しています。' },
  { q: '入力した内容はサーバーに送信されますか？', a: 'ツールによって異なります。プロフィールと駅名標はブラウザ内で処理され、サーバーには送信されません。言い訳ジェネレーターはAI生成のため、入力内容がOpenCode Go APIに送信されます。' },
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
    <main className="paper-page min-h-screen">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <Link href="/" className="font-label text-[10px] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]">
            ← 雑談テーマガチャ
          </Link>
          <ThemeToggleButton />
        </header>

        <nav aria-label="パンくずリスト" className="mt-4 font-label text-[9px] text-[var(--ink-soft)]">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="hover:text-[var(--accent)]">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">無料ツール一覧</li>
          </ol>
        </nav>

        <section className="grid gap-8 py-10 lg:grid-cols-[1fr_0.45fr] lg:items-end">
          <div>
            <p className="paper-kicker">Tool Archive / 4 Titles</p>
            <h1 className="font-editorial mt-3 text-4xl leading-tight sm:text-5xl">
              無料で使える<br className="sm:hidden" />便利ツール
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              推し活プロフィール、異世界キャラ診断、言い訳作成、駅名標作成。
              登録不要で今すぐ使えるWebツールをまとめました。
            </p>
          </div>
          <div className="border-l border-[var(--line)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-label text-[9px] text-[var(--accent)]">Privacy Note</p>
            <p className="mt-2">
              プロフィールと駅名標はブラウザ内で処理。言い訳ジェネレーターのみ、文章生成のため入力を外部AI APIへ送信します。
            </p>
          </div>
        </section>

        <section aria-labelledby="tool-list-heading">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <h2 id="tool-list-heading" className="font-editorial text-2xl">ツール一覧</h2>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 04</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {tools.map((tool, index) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group border border-[var(--line)] bg-[var(--paper-strong)] p-5 transition-colors hover:border-[var(--accent)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-label text-[10px] text-[var(--accent)]">{String(index + 1).padStart(2, '0')}</span>
                  <span className="font-label text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]" aria-hidden="true">→</span>
                </div>
                <p className="font-label mt-5 text-[9px] text-[var(--ink-soft)]">{tool.tagline}</p>
                <h3 className="font-editorial mt-2 text-2xl leading-snug">{tool.name}</h3>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{tool.description}</p>
                <span className="font-label mt-5 inline-flex text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]">
                  Open tool →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <SeoContentSection
          eyebrow="TOOL GUIDE"
          title="4つの無料Webツール"
          intro="用途に合わせて、気になるツールを選んでください。"
          faqs={faqs}
          related={[
            { href: '/games', label: '無料ブラウザゲーム一覧', description: '社畜ゲームをまとめて探す' },
            { href: '/themes', label: '雑談お題カテゴリ一覧', description: '会話のネタを探す' },
          ]}
        />
      </div>
    </main>
  );
}
