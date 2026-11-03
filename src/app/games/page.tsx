import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '無料ブラウザゲーム一覧｜社畜ゲーム・診断ツール',
  description: '社畜通勤サバイバー、社畜サバイバー、社畜スパイラル、社畜シューティング、社畜すごろく、社畜人狼など、無料で遊べるブラウザゲームを一覧で紹介。スマホ・PC対応、インストール不要。',
  alternates: {
    canonical: '/games',
  },
  openGraph: {
    title: '無料ブラウザゲーム一覧｜社畜ゲーム・診断ツール',
    description: '社畜通勤サバイバー、社畜サバイバー、社畜スパイラルなど、無料で遊べるブラウザゲームをまとめて紹介。',
    url: `${APP_URL}/games`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '無料ブラウザゲーム一覧' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '無料ブラウザゲーム一覧｜社畜ゲーム・診断ツール',
    description: '社畜通勤サバイバー、社畜サバイバー、社畜スパイラルなど、無料で遊べるブラウザゲームをまとめて紹介。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const games = [
  {
    name: '社畜通勤サバイバー',
    href: '/barricade-defense',
    image: '/assets/defense_cover.jpg',
    genre: '3Dシューティング',
    tagline: '満員ラッシュを突破して会社へ',
    description: '自動前進＆自動射撃の3D通勤シューティング。緑ゲートで強化し、段ボールで武器チェンジ。同期を救出して満員電車ボスを突破しよう。全5路線×3難易度＋エンドレス。',
  },
  {
    name: '社畜サバイバー',
    href: '/shachiku-survivor',
    image: '/assets/survivor_cover.jpg',
    genre: '10分サバイバル',
    tagline: '18時まで生き残れ',
    description: '迫りくる業務をかわしながら10分間を生き残るサバイバル。8武器＋6パッシブ、武器進化、4ステージ、図鑑・実績・日課を搭載。',
  },
  {
    name: '社畜スパイラル',
    href: '/shachiku-spiral',
    image: '/assets/spiral_cover.jpg',
    genre: '防衛シューティング',
    tagline: '渦巻く業務からコアを守れ',
    description: '中央のコアを守りながら、渦巻き状に迫る業務の列を迎撃するタワーディフェンス。10種の強化、全15ウェーブ＋エンドレス。',
  },
  {
    name: '社畜シューティングNEO',
    href: '/shachiku-shooting',
    image: '/assets/shooting_cover.jpg',
    genre: '弾幕シューティング',
    tagline: '定時退社を目指す弾幕STG',
    description: '4武器とコンボ・グレイズで高スコアを狙う弾幕シューティング。全6ステージのボス戦＋無限残業ループを収録。',
  },
  {
    name: '社畜すごろくNEO',
    href: '/shachiku-sugoroku',
    image: '/shachiku-sugoroku-ogp.png',
    genre: 'ボードゲーム',
    tagline: '選択で変わるキャリアボード',
    description: 'サイコロで60マスを進み、10種の職業と選択イベントで自分だけのキャリアを描くボードゲーム。評価とやる気のバランスが結末を変えます。',
  },
  {
    name: '社畜人狼',
    href: '/shachiku-jinro',
    image: '/assets/jinro_cover.jpg',
    genre: '人狼ゲーム',
    tagline: 'AIと遊べる会社員人狼',
    description: 'スパイ・人事・総務・イエスマンなど会社ならではの役職が入り乱れる、ひとりでも遊べるソロ人狼ゲーム。',
  },
];

const tools = [
  { name: '推し活プロフィールメーカー', href: '/profile-maker', description: '推し紹介カードを無料作成' },
  { name: '異世界転生ステータスカード', href: '/isekai-status', description: '5つの質問で異世界キャラ診断' },
  { name: '究極の言い訳ジェネレーター', href: '/excuse-generator', description: 'AIが面白い言い訳を生成' },
  { name: '駅名標メーカー', href: '/station-sign-maker', description: 'オリジナル駅名看板を作成' },
];

const faqs = [
  { q: '紹介しているゲームは無料ですか？', a: 'はい。すべてブラウザで遊べる無料ゲームです。インストールや会員登録は不要です。' },
  { q: 'スマートフォンでも遊べますか？', a: 'はい。各ゲームはスマートフォンのブラウザに対応しています。PCではキーボードやマウスでも操作できます。' },
  { q: 'ゲームの進行状況は保存されますか？', a: 'ゲームによって異なります。スコア、実績、解放状況などはブラウザのlocalStorageに保存される場合があります。' },
  { q: 'ゲームはどれから遊べばいいですか？', a: '短時間で遊ぶなら社畜すごろくや社畜人狼、アクションが好きなら社畜通勤サバイバーや社畜サバイバーがおすすめです。' },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '無料ブラウザゲーム一覧',
    description: '社畜ゲームを中心とした無料ブラウザゲームの一覧。',
    url: `${APP_URL}/games`,
    inLanguage: 'ja-JP',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: games.length,
      itemListElement: games.map((game, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: game.name,
        url: `${APP_URL}${game.href}`,
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
      { '@type': 'ListItem', position: 2, name: '無料ゲーム一覧', item: `${APP_URL}/games` },
    ],
  },
];

export default function GamesPage() {
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
            <li aria-current="page">無料ゲーム一覧</li>
          </ol>
        </nav>
        <header className="mb-8 max-w-3xl">
          <p className="text-xs font-black tracking-[0.25em] text-indigo-600 dark:text-indigo-400">GAME LIBRARY</p>
          <h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
            無料で遊べる社畜ゲーム一覧
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
            通勤ラッシュ、残業、人狼、すごろく。会社という名の戦場を舞台にした無料ブラウザゲームをまとめました。
            スマートフォン・PCのどちらでも、インストール不要で遊べます。
          </p>
        </header>
      </div>

      <SeoContentSection
        eyebrow="PICK A GAME"
        title="6つの無料ブラウザゲーム"
        intro="短時間で遊べるものから、やりこみ要素のあるものまで。気になるゲームを選んでください。"
        faqs={faqs}
        related={[]}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500"
            >
              <div className="relative h-40 overflow-hidden bg-gray-900">
                <Image
                  src={game.image}
                  alt={`${game.name}のカバー画像`}
                  width={800}
                  height={447}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white">
                  {game.genre}
                </span>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400">{game.tagline}</p>
                <h3 className="mt-1 text-base font-black text-gray-900 dark:text-white">{game.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{game.description}</p>
                <span className="mt-3 inline-flex text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  無料で遊ぶ →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">ゲーム以外の無料ツール</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">会議のアイスブレイクやプロフィール作成に使えるツールも用意しています。</p>
            </div>
            <Link href="/tools" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              ツール一覧を見る →
            </Link>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {tools.map((tool) => (
              <Link key={tool.href} href={tool.href} className="rounded-xl border border-gray-200 p-3 transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-gray-700 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/10">
                <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">{tool.name}</span>
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{tool.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </SeoContentSection>
    </main>
  );
}
