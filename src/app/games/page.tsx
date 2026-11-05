import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '無料ブラウザゲーム一覧｜社畜・パーティー・シミュレーション全21作品',
  description:
    '社畜ゲーム10作品、パーティーゲーム6作品、物理シミュレーション5作品を完全無料で公開中。少数派ワード、以心伝心、NGワード会議、禁句トーク、ボール増殖、ドミノ連鎖など、スマホ・PC対応、インストール・登録不要。',
  keywords: [
    '無料ブラウザゲーム',
    '社畜ゲーム',
    'パーティーゲーム',
    'オンサイト ゲーム',
    'オフサイト ゲーム',
    'ワードゲーム',
    'チームビルディング',
    'スマホ ゲーム',
    '登録不要 ゲーム',
  ],
  alternates: {
    canonical: '/games',
  },
  openGraph: {
    title: '無料ブラウザゲーム一覧｜社畜・パーティー・シミュレーション全21作品',
    description:
      '通勤ラッシュ、残業サバイバル、ぶっとばし飛距離アクションに加え、少数派ワードやNGワード会議、ボール増殖・ドミノ連鎖などのシミュレーションまで、無料で遊べるブラウザゲーム全21作品をまとめて紹介。',
    url: `${APP_URL}/games`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '無料ブラウザゲーム一覧' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '無料ブラウザゲーム一覧｜社畜・パーティー・シミュレーション全21作品',
    description:
      '通勤ラッシュ、残業サバイバル、ぶっとばし飛距離アクションに加え、少数派ワードやNGワード会議、ボール増殖・ドミノ連鎖などのシミュレーションまで、無料で遊べるブラウザゲーム全21作品をまとめて紹介。',
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
  {
    name: 'マイホーム完済記：35年・50年ローンの家計と暮らし',
    href: '/mortgage-life',
    image: '/assets/mortgage_cover_v2.png',
    genre: '住宅ローン完済ドキュメンタリー',
    tagline: '35年・50年ローンを破産せず返せるか',
    description:
      'SUUMO実勢相場・最新金利対応！タワマン・マンション・一戸建て、単独・ペアローン、変動（5年/125%ルール・未払利息）・固定金利、固定資産税・火災保険・地震保険、定期リフォーム・修繕積立金、昇給カーブ・退職金・定年後バイト、教育費・学資保険まで網羅したリアル人生シミュレーション。',
  },
];

const partyGames = [
  {
    name: '少数派ワード',
    href: '/minority-word',
    mark: 'MINOR',
    cover: 'bg-[#2f5d57]',
    genre: '少数派ワード / 会話ゲーム',
    tagline: '少数派の言葉を見抜け',
    description:
      '全員に似た言葉が配られ、ひとりだけ違う言葉を持つ少数派ワード。1台の端末を回して秘密の言葉を確認し、会話と投票で少数派を見抜く、オンサイト・オフサイト向けの会話ゲームです。',
    party: true,
  },
  {
    name: '以心伝心ゲーム',
    href: '/ishin-denshin',
    mark: 'SYNC',
    cover: 'bg-[#b23a2a]',
    genre: '以心伝心 / チームビルディング',
    tagline: '同じ答えを狙って息を合わせろ',
    description:
      'お題に対して全員が秘密裏に回答し、同じ答えを選んだ人数がそのまま得点になるチームビルディングゲーム。3〜8人で遊べ、チームの共通言語と阿吽の呼吸を可視化します。',
    party: true,
  },
  {
    name: 'NGワード会議',
    href: '/ng-word',
    mark: 'NG',
    cover: 'bg-[#7a5a3a]',
    genre: 'NGワード / 会話ゲーム',
    tagline: '禁句を言わずに会議を乗り切れ',
    description:
      'それぞれに秘密のNGワードが配られた状態で、制限時間内の会議を進行。自分の禁句を言わずに乗り切れるか、それともうっかり口にしてしまうのか。会話の緊張感を楽しむパーティーゲームです。',
    party: true,
  },
  {
    name: '禁句トーク',
    href: '/kinku-talk',
    mark: 'KINKU',
    cover: 'bg-[#4b5d73]',
    genre: '禁句 / チーム対戦',
    tagline: '禁句なしで伝えきれ',
    description:
      'お題の言葉を、3つの禁句を使わずにチームメイトへ説明する禁句トーク。60秒の制限時間内に何枚正解できるかを競う、オンサイトでも盛り上がるチーム対戦ゲームです。',
    party: true,
  },
  {
    name: '社長の頭の中（ランキング予想）',
    href: '/rank-guess',
    mark: 'RANK',
    cover: 'bg-[#2a2a2a]',
    genre: 'ランキング予想 / チームゲーム',
    tagline: '社長の頭の中を読み切れ',
    description:
      'ラウンドごとに1人が「社長」となり、4つの選択肢を秘密裏にランキング。残りのメンバーがその順位を予想し、的中数を競うチームゲーム。社長の価値観とチームの総意を読み解きます。',
    party: true,
  },
  {
    name: '連想リレー',
    href: '/word-chain',
    mark: 'CHAIN',
    cover: 'bg-[#7f2d2d]',
    genre: '連想ゲーム / チームビルディング',
    tagline: '言葉をつないで高得点を狙え',
    description:
      'お題から連想する言葉を全員が秘密裏に回答し、ユニークな答えほど高得点になる連想リレー。みんなの発想の違いと共通点が可視化され、チームの会話が自然に広がります。',
    party: true,
  },
];

const simulationGames = [
  {
    name: '増殖ボール・シミュレーター',
    href: '/ball-multiply',
    tagline: '重力と分裂を調整して観察する',
    description: '重力・ピン段数・分裂確率・反発係数・ボール上限・速度を調整し、ボール数の成長カーブや増加速度を観察する物理サンドボックス。スコアや制限時間はありません。',
    cover: 'bg-[#072a2c]',
    genre: '物理シミュレーション / サンドボックス',
  },
  {
    name: 'ドミノ・カスケード',
    href: '/domino-cascade',
    tagline: '間隔と摩擦を変えて連鎖を観察',
    description: 'S字・ループ・ジグザグのコースにドミノを配置し、間隔・高さ・摩擦・押す力を調整。連鎖の伝わり方や停止する条件を観察できるサンドボックスです。',
    cover: 'bg-[#2b2415]',
    genre: '物理シミュレーション / サンドボックス',
  },
  {
    name: 'サンド・フロー・サンドボックス',
    href: '/sand-flow',
    tagline: '重力・風・障害物で砂の流れを設計',
    description: '4色の砂を注ぎ、重力・風向き・風速・流量・ブラシサイズ・障害物を調整。落下・堆積・混色をリアルタイムに観察する粉体サンドボックスです。',
    cover: 'bg-[#0d2017]',
    genre: '粒子シミュレーション / サンドボックス',
  },
  {
    name: 'バブル・マージ・ラボ',
    href: '/bubble-merge',
    tagline: '泡の合体と表面張力を調整',
    description: '泡を投入し、重力・表面張力・合体しきい値・サイズ範囲・反発係数・発生量を調整。泡が合体して大きくなる過程を観察する物理ラボです。',
    cover: 'bg-[#0a1a2e]',
    genre: '物理シミュレーション / サンドボックス',
  },
  {
    name: '重力オービット・サンドボックス',
    href: '/gravity-orbit',
    tagline: '惑星質量と速度から軌道を観察',
    description: '惑星質量・重力定数・発射速度・角度・軌道トレイルを調整し、探査機の軌道やスリングショットを観察。複数の探査機を比較できる軌道サンドボックスです。',
    cover: 'bg-[#0a1224]',
    genre: '軌道シミュレーション / サンドボックス',
  },
];

const creativeTools = [
  { name: '推し活プロフィールメーカー', href: '/profile-maker', description: '推し紹介カードを無料作成' },
  { name: '異世界転生ステータスカード', href: '/isekai-status', description: '5つの質問で異世界キャラ診断' },
  { name: '究極の言い訳ジェネレーター', href: '/excuse-generator', description: 'AIが面白い言い訳を生成' },
  { name: '駅名標メーカー', href: '/station-sign-maker', description: 'オリジナル駅名看板を作成' },
];

const faqs = [
  { q: '紹介している21のゲームはすべて無料ですか？', a: 'はい。社畜ゲーム10作品、パーティーゲーム6作品、シミュレーションゲーム5作品のすべてをブラウザで開くだけで完全無料で遊べます。インストールや会員登録、課金は一切不要です。' },
  { q: 'スマートフォンでもPCでも遊べますか？', a: 'はい。各ゲームはスマートフォンのタッチ操作と、PCのマウス・キーボード操作の両方に最適化されています。' },
  { q: '会社のオンサイト・オフサイトで使えるゲームはどれですか？', a: '「少数派ワード」「以心伝心ゲーム」「NGワード会議」「禁句トーク」「ランキング予想」「連想リレー」がおすすめです。1台の端末を回して遊べるため、懇親会や研修のアイスブレイクにも使えます。' },
  { q: 'ゲームの進行状況やハイスコアは保存されますか？', a: '社畜ゲームのハイスコアや解放状況はブラウザのlocalStorageに保存される場合があります。パーティーゲームの名前・回答・秘密の言葉は保存せず、ページを閉じると消えます。シミュレーション5作品は得点や進行状況を持たず、パラメータを調整して挙動を観察するツールです。' },
];

const allGames = [...games, ...partyGames, ...simulationGames];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '無料ブラウザゲーム一覧｜社畜・パーティー・シミュレーション全21作品',
    description: '社畜ゲーム10作品、パーティーゲーム6作品、物理シミュレーション5作品をまとめた無料ブラウザゲーム一覧。',
    url: `${APP_URL}/games`,
    inLanguage: 'ja-JP',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: allGames.length,
      itemListElement: allGames.map((game, index) => ({
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
            <p className="paper-kicker">Game Archive / 21 Titles</p>
            <h1 className="font-editorial mt-3 text-4xl leading-tight sm:text-5xl">
              無料で遊べる<br className="sm:hidden" />ゲーム一覧
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              通勤ラッシュ、残業サバイバル、人狼、すごろくに加え、少数派ワード・以心伝心・NGワード会議などのパーティーゲーム、ボール増殖・ドミノ連鎖・砂・泡・重力のシミュレーションまで全21作品を収録。
              すべて完全オリジナル制作・インストール不要で、PCでもスマートフォンでも今すぐ遊べます。
            </p>
          </div>
          <div className="border-l border-[var(--line)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-label text-[9px] text-[var(--accent)]">Play Note</p>
            <p className="mt-2">
              1分〜数分のワンタッチゲームから、オンサイトで盛り上がる会話ゲームまで。目的に合わせて選べます。
            </p>
          </div>
        </section>

        <section aria-labelledby="game-list-heading">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <h2 id="game-list-heading" className="font-editorial text-2xl">社畜ゲーム（10作品）</h2>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 10</span>
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

        <section id="party-games" className="mt-12 border-t border-[var(--line)] pt-6" aria-labelledby="party-games-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker">Play Together</p>
              <h2 id="party-games-heading" className="font-editorial mt-2 text-2xl">みんなで遊ぶパーティーゲーム（6作品）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 06</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            1台の端末を回して遊ぶ、オンサイト・オフサイト向けの会話ゲーム。懇親会、研修、チームビルディングのアイスブレイクに使えます。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {partyGames.map((game, index) => (
              <Link
                key={game.href}
                href={game.href}
                className="group flex flex-col border border-[var(--line)] bg-[var(--paper-strong)] transition-colors hover:border-[var(--accent)]"
              >
                <div className={`relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-[var(--line)] ${game.cover}`}>
                  <span className="font-editorial text-4xl tracking-tight text-[#fffaf0] sm:text-5xl">{game.mark}</span>
                  <span className="font-label absolute left-3 top-3 bg-[#12100d]/70 px-2 py-1 text-[9px] text-[#f2e9d8]">
                    {String(index + 1).padStart(2, '0')} / PARTY
                  </span>
                  <span className="font-label absolute bottom-3 right-3 text-[8px] text-[#fffaf0]/70">1 DEVICE</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-label text-[9px] text-[var(--accent)]">{game.genre}</p>
                  <h3 className="font-editorial mt-2 text-xl leading-snug">{game.name}</h3>
                  <p className="mt-1 text-xs font-bold text-[var(--ink)]">{game.tagline}</p>
                  <p className="mt-2 flex-1 text-xs leading-6 text-[var(--ink-soft)]">{game.description}</p>
                  <span className="font-label mt-4 inline-flex items-center gap-2 text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]">
                    Play together <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="simulation-games" className="mt-12 border-t border-[var(--line)] pt-6" aria-labelledby="simulation-games-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="paper-kicker">PHYSICS &amp; SIMULATION</p>
              <h2 id="simulation-games-heading" className="font-editorial mt-2 text-2xl">眺めて気持ちいいシミュレーションラボ（5作品）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 05</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            ボールの増殖、ドミノの連鎖、落下する砂、泡の合体、重力軌道まで。パラメータを調整して挙動を観察できる物理シミュレーションを集めました。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {simulationGames.map((game, index) => (
              <Link
                key={game.href}
                href={game.href}
                className="group overflow-hidden border border-[var(--line)] bg-[var(--paper-strong)] transition-colors hover:border-[var(--accent)]"
              >
                <div className={`relative h-28 ${game.cover} p-4 text-white`}>
                  <span className="font-label text-[9px] text-white/60">{String(index + 1).padStart(2, '0')} / SIM</span>
                  <p className="font-editorial absolute bottom-3 left-4 text-xl leading-tight">{game.name}</p>
                </div>
                <div className="p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">{game.genre}</p>
                  <p className="mt-1 text-sm font-bold">{game.tagline}</p>
                  <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{game.description}</p>
                  <span className="font-label mt-4 inline-flex text-[9px] text-[var(--accent)]">Play simulation →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-[var(--line)] pt-6" aria-labelledby="tools-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="paper-kicker">Creative Tools</p>
              <h2 id="tools-heading" className="font-editorial mt-2 text-2xl">作って遊べるクリエイティブツール</h2>
            </div>
            <Link href="/tools" className="font-label text-[9px] text-[var(--accent)] hover:underline">
              全49ツールを見る →
            </Link>
          </div>
          <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
            {creativeTools.map((tool, index) => (
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
          title="21の無料ブラウザゲーム"
          intro="1分で遊べる爽快アクションから、じっくり戦略を練るローグライク、みんなで盛り上がるパーティーゲームまで。気になるタイトルを選んでください。"
          faqs={faqs}
          related={[
            { href: '/tools', label: '無料ツール一覧', description: '実用・統計・地図・クリエイティブの全49ツール' },
            { href: '/guides', label: 'シーン別・雑談ガイド', description: '会議や1on1の話題を探す' },
          ]}
        />
      </div>
    </main>
  );
}
