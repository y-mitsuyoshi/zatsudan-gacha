import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import TexasHoldemGame from '@/components/cards/texas-holdem/TexasHoldemGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/texas-holdem',
  name: 'ロイヤル・ナイト・ポーカー（テキサスホールデム）',
  h1: 'ロイヤル・ナイト・ポーカー｜一ノ瀬カレンたち個性派12キャラ＆オンライン対戦できる無料テキサスホールデム（フルボイス・トーナメント・ランク戦）',
  description:
    '夜景を見下ろすスカイラウンジで、強気な令嬢・一ノ瀬カレンをはじめ個性豊かな12人のアニメキャラクターや全国のプレイヤー・友人と本格ノーリミット・テキサスホールデムを無料対戦。描き下ろしイラスト、オールイン時のカットイン演出、キャラクターボイス、ジャズBGM、オンライン対戦＆友人プライベートルーム、ナイト・トーナメントや1on1デュエル、ランク戦、モンテカルロ勝率HUDを搭載したブラウザポーカーです。',
  image: '/og/texas-holdem.png',
  genre: ['トランプ', 'ポーカー', 'カードゲーム', 'カジノ'],
  features: [
    {
      title: '描き下ろしイラストの個性派キャラクター6人',
      text: '強気な令嬢・一ノ瀬カレン、数理アナリスト・九条レイ、白猫ディーラー・天宮コハル、黄金の女帝・ヴァレンティナ、伝説の勝負師・黒崎ジン、占星術師・星野ルナ。それぞれ打ち筋（ルース／タイト／ブラフ／ドロー志向）が異なるAIとして卓を囲みます。',
    },
    {
      title: 'オールイン・カットインとショーダウン演出',
      text: 'オールインや大きなポット獲得の瞬間に、キャラクターの勝利イラストが斜めに差し込むカットイン演出が発動。ランアウト中は全員の勝率を表示し、リバーまで手に汗握る展開を楽しめます。',
    },
    {
      title: 'キャラクターボイス・ジャズBGM・カジノ効果音',
      text: 'ブラウザ上でリアルタイム合成するラウンジジャズ／緊迫のオールインBGM、チップやカードの効果音、キャラクターごとに声色を変えた音声読み上げで、本物のカジノの空気感を再現しています。',
    },
    {
      title: 'ラウンジ・トーナメント・1on1デュエルの3モード',
      text: '自動リバイで気軽に遊べる「ラウンジ・テーブル（4人／6人）」、ブラインドが上がり続ける6人シット＆ゴー「ナイト・トーナメント」、好きなキャラクターと一騎打ちする「1on1デュエル」を収録しています。',
    },
    {
      title: 'ランク戦・親密度・プロフィール',
      text: '対局結果に応じてブロンズ→シルバー→ゴールド→プラチナ→ダイヤモンド→ロイヤル→レジェンドとランクが上昇。パートナーキャラとの親密度や、勝率・最大ポット・最高役などの戦績も自動で記録されます。',
    },
    {
      title: '勝率（エクイティ）・ポットオッズ・アウツを表示するHUD',
      text: 'モンテカルロ法による推定勝率、必要勝率（ポットオッズ）、フラッシュドローやストレートドローのアウツ数を表示。初心者の練習にも、中級者の検討にも使えます。',
    },
  ],
  steps: [
    {
      title: 'パートナーとモードを選ぶ',
      text: 'ロビーでパートナーキャラクター、対局モード、テーブルのフェルトを選んで「対局開始」をタップします。',
    },
    {
      title: 'プリフロップ：配られた2枚で参加を判断',
      text: 'スモールブラインド・ビッグブラインドの後、手札2枚とポジションを見てフォールド／コール／レイズを選びます。スライダーやポット比率ボタンでベット額を調整できます。',
    },
    {
      title: 'フロップ・ターン・リバーで駆け引き',
      text: '場に共通カードが3枚・1枚・1枚と開かれます。勝率HUDやキャラクターの表情・セリフを手がかりに、チェック・ベット・オールインを使い分けましょう。',
    },
    {
      title: 'ショーダウンで最強の5枚を比べる',
      text: '最後まで残ったプレイヤーで手札を公開し、自分の2枚と場の5枚から作れる最も強い5枚の役でポットを獲得します。サイドポットも自動で精算されます。',
    },
  ],
  faqs: [
    {
      q: 'ロイヤル・ナイト・ポーカーは無料で遊べますか？',
      a: 'はい。ブラウザ上で登録不要・完全無料で遊べます。課金要素や実際のお金を賭ける要素は一切ありません。',
    },
    {
      q: 'スマートフォンでも遊べますか？',
      a: 'はい。スマートフォンの縦画面、タブレット、PCのいずれにも対応したレイアウトです。PCではF（フォールド）・C（チェック／コール）・R（レイズ）・A（オールイン）のキーボード操作も使えます。',
    },
    {
      q: 'ランクや戦績は保存されますか？',
      a: 'ランクポイント、親密度、戦績、設定はお使いのブラウザ（ローカルストレージ）に保存されます。別の端末やブラウザとは共有されません。',
    },
    {
      q: 'BGMやボイスは消せますか？',
      a: 'はい。設定画面からマスター・BGM・効果音・ボイスの音量を個別に調整でき、ボイスのみOFFにすることもできます。演出を軽くする「エフェクト軽量モード」も用意しています。',
    },
    {
      q: '勝率（エクイティ）はどのように計算していますか？',
      a: '残りの山札からランダムにカードを配り切る試行を繰り返すモンテカルロ法で、現在の手札が最終的に勝つ確率を推定しています。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番トランプ・ボードゲーム・パズルをまとめて探す' },
    { href: '/blackjack', label: 'ブラックジャック（21）', description: 'ベーシックストラテジー＆確率ナビ付きのカジノカードゲーム' },
    { href: '/daifugo', label: '大富豪（大貧民）', description: '革命・8切り・階段・都落ち対応のAI 4人対戦トランプ' },
    { href: '/freecell', label: 'フリーセル', description: '全カード表向きから始まる完全情報ソリティアパズル' },
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

const pageTitle = `${game.name}｜アニメキャラと対戦できる無料ポーカーゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'ロイヤル・ナイト・ポーカー',
    'テキサスホールデム 無料',
    'ポーカー アニメ キャラ',
    'ポーカー 無料 ブラウザ',
    'テキサスホールデム AI対戦',
    'ポーカー 勝率計算',
    'トランプ ポーカー 無料',
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

export default function TexasHoldemPage() {
  return (
    <main className="bg-[#070b14]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <TexasHoldemGame />
      <SeoContentSection
        variant="dark"
        eyebrow="ROYAL FLUSH NIGHT — NO-LIMIT HOLD'EM GUIDE"
        title={`${game.name}の特徴とルール・遊び方`}
        intro={game.description}
        features={game.features}
        steps={game.steps}
        faqs={game.faqs}
        related={game.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ブラウザゲーム一覧', href: '/games' },
          { label: game.name },
        ]}
        jsonLd={buildGameJsonLd(game)}
      />
    </main>
  );
}
