import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import ClockworkRailwaysGame from '@/components/board/clockwork-railways/ClockworkRailwaysGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/clockwork-railways',
  name: '蒸気機関の鉄路王（Clockwork Railways：機関士ワーカー配置＆蒸気大陸ネットワーク構築盤ゲーム）',
  h1: '蒸気機関の鉄路王（Clockwork Railways）無料ブラウザボードゲーム｜機関士ワーカー配置＆鉄路ネットワーク開拓戦略ゲーム',
  description:
    '7大ギルド施設へ「機関士ワーカー」を配置して石炭・鋼鉄・金貨を調達し、12都市・22路線の蒸気大陸マップに「鉄路リンク敷設」を進めて「蒸気機関出力（Lv.1〜5）」と「特急輸送指令書」で名声を競う本格ワーカープレイスメント＆ネットワーク構築型無料ブラウザボードゲーム。3タイプのAI対戦（2〜4人）＆1台2人パス＆プレイ対応。',
  image: '/ogp.png',
  genre: [
    'ボードゲーム',
    'ワーカープレイスメント',
    '鉄道ネットワーク構築',
    '拡大再生産ゲーム',
    'テーブルゲーム',
  ],
  features: [
    {
      title: '7大ギルド施設の「主任枠（無料）」と「残業枠（金貨1枚）」を巡るワーカー配置',
      text: '黒鉄炭鉱・高炉製鉄所・王立機関車ドック・大陸鉄道敷設局・中央貨物取引所・蒸気銀行＆総督府・万国博覧会パビリオンの7施設に機関士ワーカーを派遣。先着1名の「主任枠」は無料で高出力ボーナスが得られ、後からでも金貨1枚を追加すれば「残業枠」へ配置できるため手詰まりなく熱い駆け引きが楽しめます。',
    },
    {
      title: '12都市・22路線のインタラクティブ蒸気大陸SVGマップと「鉄路リンク敷設」',
      text: 'ギアヘイヴン王都、アイアンフォージ鉱山、スチームポート港、スターライト天文台など12のスチームパンク都市を結ぶ22路線（平原軌道・大河鉄橋・山岳隧道）を直接クリックして鉄路を敷設。新都市へ初めて鉄路をつなぐたびに初到達ボーナスも獲得できます。',
    },
    {
      title: '「蒸気機関出力（Lv.1〜5）」の強化と4人目の機関士ワーカー解放',
      text: '王立機関車ドックで蒸気機関出力をLv.1からLv.5まで段階的に強化可能。毎期の石炭・鋼鉄・金貨の定期収入が増えるだけでなく、出力Lv.3に到達すると「4人目の機関士ワーカー」が即座に解放され、手数そのものが拡大します。',
    },
    {
      title: '接続ネットワークで達成する「特急輸送指令書」と「万国博覧会・産業勲章」',
      text: '自分の鉄路リンクで指定の2都市間を結び、必要機関出力を満たして中央貨物取引所へ入ると「特急輸送指令書」を達成して大量の名声点（★）と金貨を獲得。さらに万国博覧会パビリオンでは早い者勝ちの産業勲章（+6〜+9★）を狙えます。',
    },
    {
      title: '個性豊かな3タイプAI（拡大再生産AI・幹線独占AI・契約速攻AI）＆1台2人対戦',
      text: '2〜4人でのCPU対戦では、機関出力Lv.3と万博勲章を優先する「拡大再生産AI」、要衝リンクを押さえる「幹線独占AI」、指令書ルートを最短で結ぶ「契約速攻AI」と対局可能。1台の端末での2人パス＆プレイにも対応しています。',
    },
    {
      title: 'スチームパンクBGM・汽笛＆鍛造効果音・「1手戻す」＆「AI推奨ナビ」完備',
      text: '真鍮と歯車の響きをイメージしたプロシージャルBGMや蒸気機関車の汽笛（ポーッ！）・鉄路敷設の槌音などの効果音をON/OFF切り替え可能。期待値の高い配置先と敷設区間をリアルタイムで提案する「AI推奨アクションナビ」と「1手戻す」も搭載しています。',
    },
  ],
  steps: [
    {
      title: '対戦モード（CPU 2〜4人 または 1台2人対戦）を選択',
      text: '画面上部のモード切替ボタンから参加人数を選び、全6期（6ラウンド）の蒸気産業革命対局を開始します。',
    },
    {
      title: '炭鉱・製鉄所・蒸気銀行に機関士ワーカーを配置して資材を調達',
      text: '序盤は「黒鉄炭鉱」「高炉製鉄所」「蒸気銀行＆総督府」の主任枠を狙って石炭・鋼鉄・金貨と次ラウンド先手懐中時計を確保します。',
    },
    {
      title: '蒸気大陸マップに「鉄路リンク敷設」＆「蒸気機関出力」を強化',
      text: '手元の「特急輸送指令書」に書かれた出発都市と目的都市を確認し、「大陸鉄道敷設局」で鉄路リンクをつなぎながら、「王立機関車ドック」で蒸気機関出力Lvを高めます（Lv.3で4人目の機関士ワーカー解放！）。',
    },
    {
      title: '「特急輸送指令書」と「万博産業勲章」で名声を重ね、第6期終了時に勝者決定',
      text: '開通した鉄路網で貨物輸送を達成し、万国博覧会パビリオンで産業勲章を獲得。第6期終了時に残余資材ボーナスと最大鉄路網ボーナス（+3★）を加算し、最も名声（★）が高いプレイヤーが「蒸気機関の鉄路王」となります。',
    },
  ],
  faqs: [
    {
      q: '『蒸気機関の鉄路王（Clockwork Railways）』は無料で遊べますか？',
      a: 'はい。PC・スマートフォン・タブレットのブラウザで開くだけで完全無料で何度でも遊べます。アプリのインストールや会員登録は一切不要です。',
    },
    {
      q: '狙っていた施設の「主任枠」が他プレイヤーに取られた場合はどうなりますか？',
      a: '各施設には「残業枠」が用意されており、追加コストとして金貨1枚を支払うことで同じ施設へ機関士ワーカーを配置してアクションを実行できます。',
    },
    {
      q: '4人目の機関士ワーカーはどうすれば使えるようになりますか？',
      a: '「3. 王立機関車ドック」に機関士ワーカーを配置し、「蒸気機関出力」をLv.3（王立過熱蒸気タービン）まで強化すると、その瞬間に4人目の機関士ワーカーが解放され、その期から毎ラウンド4回行動できるようになります。',
    },
    {
      q: '「特急輸送指令書」はどうすれば達成できますか？',
      a: '指令書に記載された2つの都市間が「自分自身が敷設した鉄路リンク」で途切れずにつながっており、かつ自分の「蒸気機関出力Lv」が指令書の必要出力以上になっていれば、「5. 中央貨物取引所」にワーカーを配置した際に達成して名声と金貨を獲得できます。',
    },
    {
      q: '第6期終了時に名声点が同点だった場合はどうなりますか？',
      a: '最終名声点（★）が同点の場合は、敷設した「鉄路リンクの本数」がより多いプレイヤーが上位となり、それも同じ場合は残り金貨の多いプレイヤーが勝利します。',
    },
  ],
  related: [
    {
      href: '/games',
      label: '無料ブラウザゲーム一覧',
      description: '定番ボードゲームや思考型テーブルゲームをまとめて探す',
    },
    {
      href: '/stellar-atelier',
      label: '星屑のアトリエ（Stellar Atelier）',
      description: '5属性の星片を集めて永続割引エンジンを育てる拡大再生産ボードゲーム',
    },
    {
      href: '/mancala',
      label: 'マンカラ（カラハ・種まき頭脳ボードゲーム）',
      description: '連続手番と横取りを読む種まきリソース管理ボードゲーム',
    },
    {
      href: '/reversi',
      label: 'リバーシ（Reversi 3D / 2D）',
      description: '3D/2D切替＆AI対戦対応の定番8×8挟み反転ボードゲーム',
    },
  ],
};

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${APP_URL}${game.slug}#webpage`,
  url: `${APP_URL}${game.slug}`,
  name: game.h1,
  description: game.description,
  inLanguage: 'ja-JP',
  isPartOf: { '@id': `${APP_URL}/#website` },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `${APP_URL}${game.image}`,
  },
};

const pageTitle = `${game.name}｜AI対戦＆2人対戦対応の無料ブラウザボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    '蒸気機関の鉄路王',
    'Clockwork Railways',
    'ワーカープレイスメント ボードゲーム 無料',
    '鉄道 ボードゲーム ブラウザ',
    '拡大再生産 ボードゲーム',
    'ネットワーク構築 ゲーム',
    'AI対戦 ボードゲーム',
  ],
  alternates: {
    canonical: game.slug,
  },
  openGraph: {
    title: pageTitle,
    description: game.description,
    url: `${APP_URL}${game.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${game.image}`, width: 1200, height: 630, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: game.description,
    images: [`${APP_URL}${game.image}`],
  },
};

export default function ClockworkRailwaysPage() {
  return (
    <main className="bg-[#0c0907]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <ClockworkRailwaysGame />
      <SeoContentSection
        variant="dark"
        eyebrow="WORKER PLACEMENT & RAILWAY NETWORK BOARD GAME GUIDE"
        title={`${game.name}の特徴と遊び方`}
        intro={game.description}
        features={game.features}
        steps={game.steps}
        faqs={game.faqs}
        related={game.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ゲーム一覧', href: '/games' },
          { label: game.name },
        ]}
        jsonLd={buildGameJsonLd(game)}
      />
    </main>
  );
}
