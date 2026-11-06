import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import TotemBluffGame from '@/components/board/totem-bluff/TotemBluffGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/totem-bluff',
  name: '仮面の円卓（Totem Bluff：太陽の黄金盤と災厄の仮面を重ねる心理ブラフ＆度胸試し盤ゲーム）',
  h1: '仮面の円卓（Totem Bluff）無料ブラウザボードゲーム｜太陽の黄金盤と災厄の仮面をめぐる心理ブラフ＆チキンレース入札ゲーム',
  description:
    '手元の「太陽の黄金盤（セーフ：3枚）」と「災厄の仮面（アウト：1枚）」を祭壇マットに裏向きで重ね、何枚連続で安全に発掘できるかを競り合う心理ブラフ＆度胸試し無料ブラウザボードゲーム。3タイプの個性派AIと戦う3〜4人円卓モード、1台で2〜4人パス＆プレイ、リアルタイム安全発掘確率アナライザーを搭載しています。',
  image: '/ogp.png',
  genre: [
    'ボードゲーム',
    'ブラフゲーム',
    '心理戦ゲーム',
    'チキンレース',
    'テーブルゲーム',
  ],
  features: [
    {
      title: '「太陽の黄金盤（3枚）」と「災厄の仮面（1枚）」のシンプルな4枚構成が生む究極の心理戦',
      text: '各プレイヤーが持つのは、安全な「☀️ 太陽の黄金盤」3枚と、めくった瞬間に爆発する「🎭 災厄の仮面」1枚の計4枚だけ。どれを自分の祭壇マットに伏せるかで、幾重ものハッタリと読み合いが生まれます。',
    },
    {
      title: '「自分の山を必ず最初にすべてめくる」鉄則が引き起こすブラフと自爆のジレンマ',
      text: '発掘枚数ビッド（挑戦宣言）の競りに競り勝った挑戦者は、他人の山をめくる前に必ず自分自身の祭壇の山を一番上からすべてめくらなければなりません。自分の山に災厄の仮面を仕込んで相手を誘い込むには、自分が最高ビッドで取り残されない絶妙なチキンレース感覚が求められます。',
    },
    {
      title: '太陽の王冠（2ポイント先取）か、全員脱落によるサバイバル勝利か',
      text: '宣言した枚数の太陽盤を無傷で発掘し切れば「👑 太陽の王冠」を1つ獲得し、2ポイント先取で即座に勝利。逆に災厄の仮面を踏むと所持石盤をランダムに1枚永久ロストするため、相手を罠にはめて脱落させるサバイバル戦術も有効です。',
    },
    {
      title: '個性豊かな3人の円卓AI（罠師ゾルタン・強気の発掘家エレナ・慎重派の学者セオドア）',
      text: '初手から仮面を仕掛けて誘う「罠師ゾルタン」、太陽盤を厚く積んで高ビッドを狙う「強気の発掘家エレナ」、盤面の枚数と確率を計算して立ち回る「慎重派の学者セオドア」の3名が表情豊かなセリフとともに円卓を盛り上げます。',
    },
    {
      title: 'リアルタイム安全発掘確率＆相手の手札残数メーターを搭載',
      text: '各プレイヤーの現在の総所持枚数・場に伏せられた枚数・行動傾向から、それぞれの祭壇の最上段が太陽盤である推定確率と目標ビッド達成率をリアルタイム算出。初心者でも確率に基づいた高度な駆け引きが楽しめます。',
    },
    {
      title: 'Web Audio APIによる古代マリンバBGM＆石盤・黄金チャイム効果音と1台2〜4人対戦',
      text: '重厚な古代石盤の配置音、太陽盤をめくった瞬間の黄金チャイム、災厄の仮面の轟音ゴング、トライバルマリンバBGMをプロシージャル音源で実装。手札の覗き見を防ぐプライバシー画面付きで1台の端末での2〜4人対戦にも対応しています。',
    },
  ],
  steps: [
    {
      title: '対戦モード（CPU 3〜4人円卓 または 1台で2〜4人対戦）を選択',
      text: '1人でじっくり心理戦を楽しむなら「CPU 4人円卓 / 3人円卓」、友人や家族と囲むなら「1台で2〜4人対戦」を選びます。',
    },
    {
      title: '祭壇マットに石盤を伏せ、さらに重ねるか「発掘枚数ビッド」を宣言',
      text: 'まずは全員が1枚ずつ石盤を裏向きで配置します。手番が来たら「手札からさらに1枚重ねる」か、「場の石盤から何枚連続で太陽盤をめくれるか（発掘枚数ビッド）」を宣言します。',
    },
    {
      title: '発掘枚数の競り上げ（レイズ）またはパスで挑戦者を決定',
      text: '誰かが発掘宣言を行ったら、以降のプレイヤーは「より多い枚数を宣言して競り上げる」か「パスして降りる」かを選びます。最後まで残った最高宣言者が挑戦者となります。',
    },
    {
      title: '自分の山から順番にめくり、太陽の王冠2つ先取で勝利！',
      text: '挑戦者はまず自分の祭壇の山を上からすべてめくり、続けて相手の山の一番上を1枚ずつ選んでめくります。災厄の仮面を1枚も踏まずに宣言枚数を達成すれば王冠+1、2つ獲得で勝利です！',
    },
  ],
  faqs: [
    {
      q: '『仮面の円卓（Totem Bluff）』は無料で遊べますか？',
      a: 'はい。PC・スマートフォン・タブレットのブラウザから完全無料で何度でも遊べます。アプリのダウンロードや会員登録は不要です。',
    },
    {
      q: '自分の祭壇に「災厄の仮面」を伏せた状態で発掘宣言（ビッド）してもいいですか？',
      a: 'はい、可能です！自分の山に災厄の仮面がある状態でわざと低い枚数を宣言し、相手にさらに高い枚数を競り上げさせて自爆を誘うのは非常に強力なブラフ戦術です。ただし、他の全員にパスされて自分が挑戦者になってしまうと、自分の山をめくって自爆するため注意してください。',
    },
    {
      q: '発掘失敗で失う石盤はどれになりますか？',
      a: '挑戦者が「災厄の仮面」をめくってしまった場合、挑戦者が現在所有しているすべての石盤（手札＋祭壇の石盤）の中からランダムに1枚がゲームから永久に除外されます。失った石盤が太陽盤だったか仮面だったかは他プレイヤーには公開されません。',
    },
    {
      q: '相手の祭壇に複数の石盤が重なっている場合、好きな段をめくれますか？',
      a: 'いいえ。石盤は必ず「そのプレイヤーの山の一番上（最後に重ねられた石盤）」から順番にしかめくることができません。そのため、1段目に仮面を伏せて2段目に太陽盤を重ねるなど、積む順番も重要な戦略になります。',
    },
    {
      q: '1台のスマホやPCで複数人で遊ぶときに手札が見えてしまいませんか？',
      a: '「1台で2〜4人対戦」モードでは、手番が切り替わるたびにプライバシー保護画面（手番確認カーテン）が表示されるため、他のプレイヤーに手札や伏せた石盤の中身を見られずに安心して対戦できます。',
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

const pageTitle = `${game.name}｜AI対戦＆2〜4人対戦対応の無料ブラウザボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    '仮面の円卓',
    'Totem Bluff',
    'ブラフ ボードゲーム 無料',
    '心理戦 ボードゲーム ブラウザ',
    'チキンレース ゲーム 無料',
    'AI対戦 ボードゲーム',
    'テーブルゲーム 無料',
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

export default function TotemBluffPage() {
  return (
    <main className="bg-[#0b0908]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <TotemBluffGame />
      <SeoContentSection
        variant="dark"
        eyebrow="PSYCHOLOGICAL BLUFFING BOARD GAME GUIDE"
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
