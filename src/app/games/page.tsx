import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '無料ブラウザゲーム一覧｜社畜ゲーム・ミニゲーム全9作品',
  description:
    '社畜通勤サバイバー、社畜サバイバー、社畜スパイラル、社畜シューティングNEO、社畜すごろくNEO、社畜人狼、定時退社カタパルト、社畜ワイヤー疾走、社畜グラグラ決済タワーの全9作品を完全無料で公開中。スマホ・PC対応、インストール・登録不要。',
  alternates: {
    canonical: '/games',
  },
  openGraph: {
    title: '無料ブラウザゲーム一覧｜社畜ゲーム・ミニゲーム全9作品',
    description:
      '通勤ラッシュ、残業サバイバル、ぶっとばし飛距離アクション、ワイヤースイング、ビル建設など無料で遊べるブラウザゲーム全9作品をまとめて紹介。',
    url: `${APP_URL}/games`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '無料ブラウザゲーム一覧' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '無料ブラウザゲーム一覧｜社畜ゲーム・ミニゲーム全9作品',
    description:
      '通勤ラッシュ、残業サバイバル、ぶっとばし飛距離アクション、ワイヤースイング、ビル建設など無料で遊べるブラウザゲーム全9作品をまとめて紹介。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const games = [
  {
    name: '社畜通勤サバイバー',
    href: '/barricade-defense',
    image: '/assets/defense_cover.jpg',
    genre: '3Dゲートシューティング',
    tagline: '満員ラッシュを突破して会社へ',
    description:
      '自動前進＆自動一斉射撃の3D通勤ゲートシューティング。撃って数値を育てる倍率ゲートや段ボール武器チェンジ、同期救出ケージで分隊を強化し、満員電車ボスを突破しよう。全5路線×3難易度＋エンドレス。',
  },
  {
    name: '社畜サバイバー',
    href: '/shachiku-survivor',
    image: '/assets/survivor_cover.jpg',
    genre: '10分ホードサバイバル',
    tagline: '18時まで生き残れ',
    description:
      '迫りくる業務の大群をかわしながら9:00から18:00までの10分間を生き残るホードサバイバル。8武器＋6パッシブ、進化グリモワールによる8種の伝説進化、4ステージ、図鑑・実績・日課を搭載。',
  },
  {
    name: '社畜スパイラル',
    href: '/shachiku-spiral',
    image: '/assets/spiral_cover.jpg',
    genre: 'ナンバー撃破スパイラル防衛',
    tagline: '渦巻く業務列を分断せよ',
    description:
      '中央のコアを守りながら、渦巻き状に迫るHPナンバー付き業務セグメントの列を迎撃・分断する防衛シューティング。弱点節コンボ、属性シナジー強化、全15ウェーブ＋エンドレス。',
  },
  {
    name: '社畜シューティングNEO',
    href: '/shachiku-shooting',
    image: '/assets/shooting_cover.jpg',
    genre: '弾幕シューティング',
    tagline: '定時退社を目指す弾幕STG',
    description:
      '4種のメイン武器＋オプション編隊とハイパーオーバードライブ、コンボ・グレイズで高スコアを狙う本格弾幕シューティング。全6ステージのボス戦＋無限残業ループを収録。',
  },
  {
    name: '社畜すごろくNEO',
    href: '/shachiku-sugoroku',
    image: '/shachiku-sugoroku-ogp.png',
    genre: 'ジオラマ人生ボードゲーム',
    tagline: '選択で変わるキャリアボード',
    description:
      'ルーレットを回して立体ジオラマ風の60マスを進み、10種の職業と選択イベントで自分だけのキャリアを描くボードゲーム。評価ポイントとやる気のバランスが結末を変えます。',
  },
  {
    name: '社畜人狼',
    href: '/shachiku-jinro',
    image: '/assets/jinro_cover.jpg',
    genre: 'AI会社員人狼',
    tagline: 'AI社員と遊べるソロ人狼',
    description:
      '産業スパイ・人事・総務・イエスマンなど会社ならではの役職が入り乱れる、ひとりでもすぐ遊べるAI対戦ソロ人狼ゲーム。会議ログと投票からスパイを見抜こう。',
  },
  {
    name: '社畜ぶっとばし！定時退社カタパルト',
    href: '/shachiku-catapult',
    image: '/assets/defense_cover.jpg',
    genre: 'ぶっとばし飛距離アクション',
    tagline: '18時ジャストの屋上から大空へ',
    description:
      '角度とパワーを決めて本社屋上から定時退社発射！有給ジェットパックと急降下スタンプ、地上のボーナス支給車やエナドリ砲台で加速し、5系統の恒久強化で10,000m先の南国リゾートを目指そう。',
  },
  {
    name: '社畜ワイヤー疾走：終電スイングアクション',
    href: '/shachiku-wire',
    image: '/assets/shooting_cover.jpg',
    genre: 'ワイヤースイング疾走',
    tagline: '振り子スイングで終電に飛び乗れ',
    description:
      '光回線グラップルワイヤーを頭上のアンカーに撃ち込み、振り子物理の遠心力で深夜のビル群を疾走するワンボタンアクション。上昇角で離すPERFECT RELEASEと空中ダッシュで終電を掴め。',
  },
  {
    name: '社畜グラグラ決済タワー：限界ビル建設',
    href: '/shachiku-stack',
    image: '/assets/spiral_cover.jpg',
    genre: 'タイミング高層ビル建設',
    tagline: '揺れるクレーンから100階を目指せ',
    description:
      'クレーンからオフィスフロアをタイミングよく落として超高層ビルを建設！はみ出し部分が切断される「精密スライスモード」と、重心の揺れに挑む「物理バランスモード」の2モードを収録。',
  },
];

const tools = [
  { name: '推し活プロフィールメーカー', href: '/profile-maker', description: '推し紹介カードを無料作成' },
  { name: '異世界転生ステータスカード', href: '/isekai-status', description: '5つの質問で異世界キャラ診断' },
  { name: '究極の言い訳ジェネレーター', href: '/excuse-generator', description: 'AIが面白い言い訳を生成' },
  { name: '駅名標メーカー', href: '/station-sign-maker', description: 'オリジナル駅名看板を作成' },
];

const faqs = [
  { q: '紹介している9つのゲームはすべて無料ですか？', a: 'はい。全9タイトルすべてブラウザで開くだけで完全無料で遊べます。インストールや会員登録、課金は一切不要です。' },
  { q: 'スマートフォンでもPCでも遊べますか？', a: 'はい。各ゲームはスマートフォンのタッチ操作と、PCのマウス・キーボード操作の両方に最適化されています。' },
  { q: '短時間でサクッと遊べるミニゲームはどれですか？', a: '1回1〜3分で遊べる物理ミニゲームなら「定時退社カタパルト」「社畜ワイヤー疾走」「社畜グラグラ決済タワー」がおすすめです。じっくりやりこむなら「社畜サバイバー」や「社畜通勤サバイバー」も人気です。' },
  { q: 'ゲームの進行状況やハイスコアは保存されますか？', a: 'はい。ハイスコア、獲得した資金、恒久アップグレード、実績、解放状況はお使いのブラウザのlocalStorageに自動保存されます。' },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '無料ブラウザゲーム一覧｜社畜ゲーム・ミニゲーム全9作品',
    description: '社畜ゲーム・懐かしの物理アクションミニゲームを中心とした無料ブラウザゲーム全9作品の一覧。',
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
            <p className="paper-kicker">Game Archive / 9 Titles</p>
            <h1 className="font-editorial mt-3 text-4xl leading-tight sm:text-5xl">
              無料で遊べる<br className="sm:hidden" />社畜ゲーム一覧
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              通勤ラッシュ、残業サバイバル、人狼、すごろくに加え、定時退社カタパルト・終電ワイヤースイング・限界ビル建設まで全9作品を収録。
              すべて完全オリジナル制作・インストール不要で、PCでもスマートフォンでも今すぐ遊べます。
            </p>
          </div>
          <div className="border-l border-[var(--line)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-label text-[9px] text-[var(--accent)]">Play Note</p>
            <p className="mt-2">
              1分〜数分のワンボタン爽快プレイならカタパルト・ワイヤー・決済タワー。じっくりビルドや推理を楽しむならサバイバー・スパイラル・すごろく・人狼がおすすめです。
            </p>
          </div>
        </section>

        <section aria-labelledby="game-list-heading">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <h2 id="game-list-heading" className="font-editorial text-2xl">ゲーム一覧（全9作品）</h2>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 09</span>
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
          title="9つの無料ブラウザゲーム"
          intro="1分で遊べる爽快物理アクションから、じっくり戦略を練るローグライク・ボードゲームまで。気になるタイトルを選んでください。"
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
