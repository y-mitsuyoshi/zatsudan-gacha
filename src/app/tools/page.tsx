import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '無料で使える便利ツール一覧｜文字数・JSON・画像圧縮など全14ツール',
  description: '文字数カウンター、JSON整形、URLエンコード、ハッシュ生成、パスワード生成、単位変換、BMI計算、ローン返済、画像圧縮、カラー変換など、登録不要で使える無料Webツール全14種類を紹介。スマホ対応。',
  keywords: [
    '無料 Webツール',
    '文字数カウンター',
    'JSON整形',
    'URLエンコード',
    'ハッシュ生成',
    'パスワード生成',
    '単位変換',
    'BMI 計算',
    'ローン返済 計算',
    '画像圧縮',
    'カラーコード変換',
    'プロフィールメーカー',
    '異世界転生 診断',
    '言い訳ジェネレーター',
    '駅名標メーカー',
    '画像作成 無料',
    'SNS シェア',
    'スマホ ツール',
  ],
  alternates: {
    canonical: '/tools',
  },
  openGraph: {
    title: '無料で使える便利ツール一覧',
    description: '文字数カウント、JSON整形、画像圧縮、パスワード生成など、毎日使える実用ツールとクリエイティブツール全14種類。登録不要・スマホ対応。',
    url: `${APP_URL}/tools`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '無料で使える便利ツール一覧' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '無料で使える便利ツール一覧',
    description: '文字数カウント、JSON整形、画像圧縮、パスワード生成など、毎日使える実用ツールとクリエイティブツール全14種類。登録不要・スマホ対応。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const creativeTools = [
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

const utilityTools = [
  {
    name: '文字数カウンター',
    href: '/character-counter',
    tagline: '文字・行・単語・バイト数を集計',
    description: '入力したテキストの文字数、UTF-16、行数、単語数、UTF-8バイト数、読了時間をリアルタイムで集計。SNS投稿や原稿の長さ確認に便利です。',
  },
  {
    name: 'JSON整形・検証',
    href: '/json-formatter',
    tagline: 'JSONを見やすく整形・圧縮',
    description: 'JSONを2/4スペースまたはタブで整形し、最小化も可能。構文エラーの位置を確認できるため、APIレスポンスや設定ファイルのチェックに使えます。',
  },
  {
    name: 'URLエンコード・デコード',
    href: '/url-encoder',
    tagline: 'URLの文字列を安全に変換',
    description: '日本語や記号を含むURLをencodeURIComponent/encodeURIで変換し、デコードも可能。不正なパーセントエンコードも安全に検出します。',
  },
  {
    name: 'ハッシュ生成',
    href: '/hash-generator',
    tagline: 'SHA-256/384/512を生成',
    description: 'Web Crypto APIでテキストのSHA-256・SHA-384・SHA-512ハッシュを生成。入力はブラウザ内だけで処理され、サーバーへ送信されません。',
  },
  {
    name: 'パスワード生成',
    href: '/password-generator',
    tagline: '安全なランダムパスワードを作成',
    description: 'crypto.getRandomValuesを使い、長さ・文字種・記号・紛らわしい文字の除外を指定してパスワードを生成。強度の目安とコピー機能を備えています。',
  },
  {
    name: '単位変換',
    href: '/unit-converter',
    tagline: '長さ・重さ・温度などを変換',
    description: '長さ、重さ、温度、面積、体積、速度、データ容量を相互変換。日常生活や仕事の計算に使える無料の単位変換ツールです。',
  },
  {
    name: 'BMI・健康計算',
    href: '/bmi-calculator',
    tagline: 'BMI・基礎代謝・消費カロリー',
    description: '身長・体重・年齢・性別・活動量からBMI、標準体重、基礎代謝、推定消費カロリーを計算。健康管理の目安に使えます。',
  },
  {
    name: 'ローン返済シミュレーター',
    href: '/loan-calculator',
    tagline: '月額返済と利息を試算',
    description: '借入額・金利・返済期間・元利均等/元金均等から、月額返済、総利息、総返済額、年次返済表を試算。住宅ローンや事業ローンの検討に。',
  },
  {
    name: '画像リサイズ・圧縮',
    href: '/image-resizer',
    tagline: 'ブラウザ内で画像を軽量化',
    description: 'JPEG・PNG・WebP画像を指定サイズにリサイズし、品質を調整して圧縮。画像はアップロードされず、端末内だけで処理されます。',
  },
  {
    name: 'カラーコード変換・配色',
    href: '/color-converter',
    tagline: 'HEX・RGB・HSLと配色を確認',
    description: 'HEX・RGB・HSLを相互変換し、補色・類似色・トライアドなどの配色を生成。WCAGコントラスト比も確認できるデザインツールです。',
  },
];

const allTools = [...creativeTools, ...utilityTools];

const faqs = [
  { q: '紹介している14のツールは無料ですか？', a: 'はい。クリエイティブツール4種類、実用ツール10種類のすべてを無料で利用できます。会員登録やログインは不要です。' },
  { q: 'スマートフォンでも使えますか？', a: 'はい。各ツールはスマートフォンのブラウザに対応しています。' },
  { q: '入力した内容はサーバーに送信されますか？', a: '実用ツール10種類はすべてブラウザ内で処理され、入力内容をサーバーへ送信しません。プロフィールと駅名標もブラウザ内処理です。言い訳ジェネレーターのみ、文章生成のため入力内容がOpenCode Go APIに送信されます。' },
  { q: '作成した画像はSNSで使えますか？', a: 'はい。プロフィールメーカー・駅名標メーカー・画像リサイズツールで作成した画像は、SNSの投稿やプロフィールに利用できます。' },
  { q: 'オフラインでも使えますか？', a: '実用ツールはページを読み込んだ後、ブラウザ内で計算・変換が完結します。AI言い訳生成のみインターネット接続が必要です。' },
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
      numberOfItems: allTools.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: allTools.map((tool, index) => ({
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
            <p className="paper-kicker">Tool Archive / 14 Titles</p>
            <h1 className="font-editorial mt-3 text-4xl leading-tight sm:text-5xl">
              無料で使える<br className="sm:hidden" />便利ツール
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              文字数カウント、JSON整形、画像圧縮、パスワード生成など、毎日使える実用ツール10種類。
              さらにプロフィール作成・診断・言い訳・駅名標のクリエイティブツール4種類を収録しています。
            </p>
          </div>
          <div className="border-l border-[var(--line)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-label text-[9px] text-[var(--accent)]">Privacy Note</p>
            <p className="mt-2">
              実用ツール10種類はすべてブラウザ内で処理。入力内容をサーバーへ送信しません。言い訳ジェネレーターのみ、文章生成のため入力を外部AI APIへ送信します。
            </p>
          </div>
        </section>

        <section aria-labelledby="utility-tools-heading" id="utility-tools">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker">Everyday Utilities</p>
              <h2 id="utility-tools-heading" className="font-editorial mt-2 text-2xl">毎日使える実用ツール（10種類）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 10</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {utilityTools.map((tool, index) => (
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

        <section aria-labelledby="creative-tools-heading" className="mt-14" id="creative-tools">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker">Creative Tools</p>
              <h2 id="creative-tools-heading" className="font-editorial mt-2 text-2xl">作って遊べるクリエイティブツール（4種類）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 04</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {creativeTools.map((tool, index) => (
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
          title="14の無料Webツール"
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
