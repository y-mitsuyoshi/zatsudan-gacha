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
            <li aria-current="page">無料ゲーム一覧</li>
          </ol>
        </nav>

        <section className="grid gap-8 py-10 lg:grid-cols-[1fr_0.45fr] lg:items-end">
          <div>
            <p className="paper-kicker">Game Archive / 6 Titles</p>
            <h1 className="font-editorial mt-3 text-4xl leading-tight sm:text-5xl">
              無料で遊べる<br className="sm:hidden" />社畜ゲーム一覧
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              通勤ラッシュ、残業、人狼、すごろく。会社という名の戦場を舞台にしたブラウザゲームをまとめました。
              インストール不要、スマートフォンでも遊べます。
            </p>
          </div>
          <div className="border-l border-[var(--line)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-label text-[9px] text-[var(--accent)]">Play Note</p>
            <p className="mt-2">
              すきま時間に遊ぶならすごろく・人狼。長めに遊ぶなら通勤サバイバー・サバイバー・スパイラル・シューティング。
            </p>
          </div>
        </section>

        <section aria-labelledby="game-list-heading">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <h2 id="game-list-heading" className="font-editorial text-2xl">ゲーム一覧</h2>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 06</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game, index) => (
              <Link
                key={game.href}
                href={game.href}
                className="group flex flex-col border border-[var(--line)] bg-[var(--paper-strong)] transition-colors hover:border-[var(--accent)]"
              >
                <div className="relative aspect-[16/9] overflow-hidden border-b border-[var(--line)] bg-[#1d1914]">
                  <Image
                    src={game.image}
                    alt={`${game.name}のカバー画像`}
                    width={800}
                    height={447}
                    className="h-full w-full object-cover grayscale-[0.15] saturate-75 transition duration-500 group-hover:scale-[1.03] group-hover:saturate-100"
                  />
                  <span className="font-label absolute left-3 top-3 bg-[#12100d]/85 px-2 py-1 text-[9px] text-[#f2e9d8]">
                    {String(index + 1).padStart(2, '0')} / {game.genre}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-label text-[9px] text-[var(--accent)]">{game.tagline}</p>
                  <h3 className="font-editorial mt-2 text-xl leading-snug">{game.name}</h3>
                  <p className="mt-2 flex-1 text-xs leading-6 text-[var(--ink-soft)]">{game.description}</p>
                  <span className="font-label mt-4 inline-flex items-center gap-2 text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]">
                    Play <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-[var(--line)] pt-6" aria-labelledby="tools-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="paper-kicker">Other Tools</p>
              <h2 id="tools-heading" className="font-editorial mt-2 text-2xl">ゲーム以外の無料ツール</h2>
            </div>
            <Link href="/tools" className="font-label text-[9px] text-[var(--accent)] hover:underline">
              ツール一覧を見る →
            </Link>
          </div>
          <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
            {tools.map((tool, index) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex items-baseline gap-3 border-b border-dashed border-[var(--line)] py-3"
              >
                <span className="font-label w-5 text-[9px] text-[var(--ink-soft)]">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold transition-colors group-hover:text-[var(--accent)]">{tool.name}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--ink-soft)]">{tool.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <SeoContentSection
          eyebrow="GAME GUIDE"
          title="6つの無料ブラウザゲーム"
          intro="短時間で遊べるものから、やりこみ要素のあるものまで。気になるゲームを選んでください。"
          faqs={faqs}
          related={[
            { href: '/tools', label: '無料ツール一覧', description: 'プロフィール・診断・駅名標' },
            { href: '/guides', label: 'シーン別・雑談ガイド', description: '会議や1on1の話題を探す' },
          ]}
        />
      </div>
    </main>
  );
}
