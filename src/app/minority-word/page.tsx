import type { Metadata } from 'next';
import { PartyGameShell, type PartyGameSeo } from '@/components/party/PartyGameShell';
import { MinorityWordGame } from '@/components/party/minority-word/MinorityWordGame';

const APP_URL = 'https://zatsudan-gacha.app';

const metadataTitle = '少数派ワード｜1台で遊べる4〜12人の会話ゲーム';
const metadataDescription =
  '似た言葉を配られた仲間から、少数派の言葉を見つけ出す無料の会話ゲーム。4〜12人・1台の端末で、秘密カードの配布と2〜5分の討論タイマー、投票と結果発表まで楽しめます。';

export const metadata: Metadata = {
  title: metadataTitle,
  description: metadataDescription,
  keywords: [
    '少数派ワード',
    '会話ゲーム',
    'パーティーゲーム',
    '言葉当て',
    '人狼',
    'アイスブレイク',
    'オフサイト',
    '無料ブラウザゲーム',
    'スマホ対応',
  ],
  alternates: {
    canonical: '/minority-word',
  },
  openGraph: {
    title: metadataTitle,
    description: metadataDescription,
    url: `${APP_URL}/minority-word`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '少数派ワード',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: metadataTitle,
    description: metadataDescription,
    images: [`${APP_URL}/ogp.png`],
  },
};

const seo: PartyGameSeo = {
  slug: '/minority-word',
  name: '少数派ワード',
  h1: '少数派ワード：言葉のズレで正体を見抜く会話ゲーム',
  description:
    '1台の端末を回して、全員に配られた言葉をこっそり確認。少数派の言葉を会話と推理で見つけ出す、4〜12人向けの無料パーティーゲームです。',
  category: '少数派ワード / 会話ゲーム',
  features: [
    {
      title: '秘密の言葉を1人ずつ配布',
      text: '端末を次の人へ渡すたびにカードが閉じ、自分の言葉だけを確認できます。',
    },
    {
      title: '2〜5分の討論タイマー',
      text: '2分・3分・5分から選べるタイマーで、オフィスや合宿でも時間を区切って遊べます。',
    },
    {
      title: '人数に応じて少数派を自動設定',
      text: '4〜6人は1人、7〜12人は2人の少数派が自動で決まり、正体は最後まで伏せられます。',
    },
    {
      title: '1台の端末で全員が参加',
      text: 'インストールも登録も不要。スマートフォンやタブレットを回しながら、その場で始められます。',
    },
    {
      title: '投票と結果発表までワンストップ',
      text: '議論後にグループで最も怪しい人を選び、両方の言葉と少数派の正体をまとめて確認できます。',
    },
    {
      title: 'サーバーに送信しない安心設計',
      text: '言葉や投票内容はブラウザ内だけで扱い、外部への送信や保存は行いません。',
    },
  ],
  steps: [
    {
      title: '人数とタイマーを選ぶ',
      text: '4〜12人からプレイヤー数を選び、2分・3分・5分の議論タイムを決めます。',
    },
    {
      title: '端末を回して言葉を確認',
      text: '「次の人に端末を渡してください」の案内に従い、1人ずつカードをめくって自分の言葉を確認します。',
    },
    {
      title: '言葉を直接言わずに説明する',
      text: '自分の言葉をそのまま口にせず、特徴や使いどころを説明します。少数派は言葉のズレを悟られないように紛れ込みます。',
    },
    {
      title: '投票して結果を確認',
      text: '議論後に最も怪しい人を1人選んで投票します。少数派を当てれば多数派の勝ち、外せば少数派の勝ちです。',
    },
  ],
  faqs: [
    {
      q: '少数派ワードは無料で遊べますか？',
      a: 'はい。このページを開くだけで完全無料で遊べます。会員登録、インストール、課金は必要ありません。',
    },
    {
      q: '何人から遊べますか？',
      a: '4人から12人まで対応しています。4〜6人は少数派1人、7〜12人は少数派2人で自動的に始まります。',
    },
    {
      q: 'スマートフォンだけで遊べますか？',
      a: 'はい。1台のスマートフォンやタブレットを次の人へ渡しながら遊べるよう、モバイル向けの画面と大きなタップ領域を用意しています。',
    },
    {
      q: '言葉やプレイヤー情報はサーバーに送られますか？',
      a: 'いいえ。言葉の生成、配布、投票はすべてブラウザ内で処理され、外部への送信やlocalStorageへの保存は行いません。',
    },
    {
      q: '勝敗はどうやって決まりますか？',
      a: '議論後の投票で少数派を選べば多数派の勝ち、少数派以外を選んでしまえば少数派の勝ちです。結果画面で少数派全員と両方の言葉が公開されます。',
    },
  ],
  related: [
    {
      href: '/games',
      label: '無料ゲーム一覧',
      description: 'ブラウザで遊べるパーティーゲームをまとめてチェック。',
    },
    {
      href: '/ishin-denshin',
      label: '以心伝心',
      description: '言葉を交わさず、お題の答えをどこまで合わせられるか。',
    },
    {
      href: '/ng-word',
      label: 'NGワードゲーム',
      description: '禁止された言葉を言わずに会話を続ける心理戦。',
    },
    {
      href: '/kinku-talk',
      label: '禁句トーク',
      description: 'お題の言葉を使わずに、相手に伝えきれるか。',
    },
  ],
};

export default function MinorityWordPage() {
  return (
    <PartyGameShell seo={seo}>
      <MinorityWordGame />
    </PartyGameShell>
  );
}
