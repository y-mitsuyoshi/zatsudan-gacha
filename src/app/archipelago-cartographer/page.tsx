import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import ArchipelagoCartographerGame from '@/components/board/archipelago-cartographer/ArchipelagoCartographerGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: GameSeoData = {
  slug: '/archipelago-cartographer',
  name: '群島開拓記（Archipelago Cartographer：海域タイル配置＆航路ネットワーク盤ゲーム）',
  h1: '群島開拓記（Archipelago Cartographer）無料ブラウザゲーム｜海域タイル配置＆航路ネットワーク戦略ボードゲーム',
  description:
    '未知の群島海域に四角形の海図タイルを回転・配置し、珊瑚航路・群島陸地・古代灯台のネットワークを築く無料ブラウザ・タイル配置型ボードゲーム「群島開拓記（Archipelago Cartographer）」。5個の測量ブイ（開拓コマ）の配置と完成時の即時回収マネジメント、初級・中級・上級のCPU AI対戦、1台での2人対戦、AI最善手ヒントを搭載しています。',
  image: '/ogp.png',
  genre: ['ボードゲーム', 'タイル配置ゲーム', '陣取り・ネットワーク構築', '思考型テーブルゲーム'],
  features: [
    {
      title: '9×9海図グリッドに海域タイルを回転・配置する本格ネットワーク構築',
      text: '「外洋」「珊瑚航路」「群島陸地」の3種の辺を持つ四角形の海域タイルを引き、0°/90°/180°/270°に回転させて隣接する辺がすべて一致するマスへ配置。一手の向きと座標が海図全体の構造を左右します。',
    },
    {
      title: '5個の測量ブイ（開拓コマ）の配置と完成時の即時回収システム',
      text: 'タイルを置いた直後、まだ誰も占有していない「珊瑚航路」「群島陸地」「古代灯台」に手持ちの測量ブイを1個配置可能。エリアが完成すると即座にボーナス点を獲得し、配置していたブイが手元へ帰還します。',
    },
    {
      title: '珊瑚航路・群島陸地・交易港・古代灯台の多彩な得点ルート',
      text: '両端が閉じるか環状になった珊瑚航路（1枚2点）、全周を囲んだ群島陸地（1枚3点＋交易港ボーナス2点）、周囲8マスすべてが埋まった古代灯台（最大11点）など、短期回収と大型開拓の駆け引きが楽しめます。',
    },
    {
      title: '相乗り（合流）による多数決・同数同時得点の妙味',
      text: '別々にブイが置かれた航路や群島が後から1つに繋がった場合、より多くの測量ブイを置いているプレイヤーが得点を独占。同数の場合は双方に満額の得点が入るため、合流を狙う高度な戦術も有効です。',
    },
    {
      title: '初級・中級・上級の3段階AI対戦＆1台で2人対戦',
      text: '即時完成点・ブイ温存価値・未完成見込み点を計算する3段階の航海士AIとのソロ対戦と、スマートフォンやPC1台を交互に操作する2人対戦の両方に対応しています。',
    },
    {
      title: '配置可能マスのリアルタイムプレビュー＆AIヒント機能',
      text: '現在の回転角度で置けるすべての合法マスが緑枠でハイライト表示され、マウスオーバーでタイル接続のプレビューを確認可能。迷った時は「AIヒント」で推奨の配置座標と回転角を確認できます。',
    },
  ],
  steps: [
    {
      title: '対戦モードと先手・後手を選択',
      text: '「CPU対戦（初級・中級・上級）」または「1台で2人対戦」を選び、対局を開始します。中央E5には最初から「王立基準港」タイルが配置されています。',
    },
    {
      title: '海域タイルを90°回転して合法マスへ配置',
      text: '山札から引いた海域タイルを「90°回転」ボタン（またはRキー）で回し、上下左右に隣接するタイルの辺（外洋・珊瑚航路・群島陸地）が一致する緑枠のマスをタップして配置します。',
    },
    {
      title: '測量ブイ（開拓コマ）を配置するか温存を選択',
      text: '配置したタイル上の未占有エリア（航路・群島・灯台）に手持ちの測量ブイを1個置くか、置かずに温存するかを選択します。',
    },
    {
      title: '完成ボーナス獲得＆山札28枚終了で最終集計',
      text: '航路や群島、灯台が完成すると即座に得点が入ってブイが手元に戻ります。全28枚の山札を置き終えた時点で未完成エリアの部分点を加算し、合計得点の高い船団の勝利となります。',
    },
  ],
  faqs: [
    {
      q: '群島開拓記（Archipelago Cartographer）は無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで登録不要・完全無料で何度でもプレイできます。PC・タブレット・スマートフォンのいずれにも対応しています。',
    },
    {
      q: 'すでに相手の測量ブイがある航路や群島に、自分のブイは置けますか？',
      a: 'すでにブイが置かれているエリアに直接繋げるタイルには新しいブイを置けません。ただし、離れた場所に自分のタイルとブイを置いておき、後の手番で間を繋げて合流（相乗り）させることは可能です。',
    },
    {
      q: '測量ブイ（開拓コマ）が手元からなくなった場合はどうなりますか？',
      a: '手持ちの5個のブイをすべて盤面に出している間は、新しいブイを配置できません。すでにブイを置いている航路・群島・灯台を完成させてブイを手元に回収しましょう。',
    },
    {
      q: '引いたタイルがどの向きでも盤面に置けない場合はどうなりますか？',
      a: '現在の盤面のどこにも配置できないタイルを引いた場合は、自動的に山札の下へ送られて配置可能なタイルが引き直されるため、手詰まりにならず快適に遊べます。',
    },
    {
      q: '高得点を狙うためのコツはありますか？',
      a: '序盤は短い珊瑚航路や小さな岬を素早く完成させて測量ブイを手元に戻しながら得点を重ね、交易港（⚓）を含む大型の群島陸地や周囲が埋まりやすい中央付近の古代灯台にブイを投資するのがセオリーです。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番ボードゲームや戦略テーブルゲームをまとめて探す' },
    { href: '/reversi', label: 'リバーシ（Reversi 3D / 2D）', description: '3D/2D切替とAIヒントを搭載した8×8挟み反転ボードゲーム' },
    { href: '/mancala', label: 'マンカラ（カラハ・種まき頭脳ボードゲーム）', description: '種まきとストア回収の計算が熱い伝統頭脳ボードゲーム' },
    { href: '/gomoku', label: '五目並べ（15×15 連珠・五目戦略盤）', description: 'リーチ検知＆AIヒント付きの本格15×15五目並べ' },
  ],
};

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${APP_URL}${seo.slug}#webpage`,
  url: `${APP_URL}${seo.slug}`,
  name: seo.h1,
  description: seo.description,
  inLanguage: 'ja-JP',
  isPartOf: { '@id': `${APP_URL}/#website` },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `${APP_URL}${seo.image}`,
  },
};

const pageTitle = `${seo.name}｜AI対戦＆2人対戦対応の無料ブラウザボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: seo.description,
  category: 'game',
  keywords: [
    '群島開拓記',
    'Archipelago Cartographer',
    'タイル配置 ボードゲーム',
    'ボードゲーム 無料 ブラウザ',
    '海図 パズル ボードゲーム',
    'AI対戦 ボードゲーム',
    '2人対戦 ボードゲーム',
  ],
  alternates: {
    canonical: seo.slug,
  },
  openGraph: {
    title: pageTitle,
    description: seo.description,
    url: `${APP_URL}${seo.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${seo.image}`, width: 1200, height: 630, alt: seo.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: seo.description,
    images: [`${APP_URL}${seo.image}`],
  },
};

export default function ArchipelagoCartographerPage() {
  return (
    <main className="bg-[#06101e]">
      <JsonLd data={pageJsonLd} />
      <JsonLd data={buildGameJsonLd(seo)} />
      <h1 className="sr-only">{seo.h1}</h1>
      <ArchipelagoCartographerGame />
      <SeoContentSection
        variant="dark"
        eyebrow="BOARD GAME GUIDE"
        title={`${seo.name}の特徴と遊び方`}
        intro={seo.description}
        features={seo.features}
        steps={seo.steps}
        faqs={seo.faqs}
        related={seo.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ゲーム一覧', href: '/games' },
          { label: seo.name },
        ]}
        jsonLd={buildGameJsonLd(seo)}
      />
    </main>
  );
}
