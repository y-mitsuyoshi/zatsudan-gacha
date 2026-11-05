import type { Metadata } from 'next';
import { PartyGameShell, type PartyGameSeo } from '@/components/party/PartyGameShell';
import { WordChainGame } from '@/components/party/word-chain/WordChainGame';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: PartyGameSeo = {
  slug: '/word-chain',
  name: '連想リレー',
  h1: '連想リレー｜お題から言葉をつなぐチーム連想ゲーム',
  description:
    'お題から連想する言葉を1人ずつ秘密に入力し、全員の答えを一斉公開。ユニークな答えは3点、2人以上一致した答えは1点で競う、2〜8人・全5ラウンドの連想ゲームです。会議のアイスブレイクやチームビルディング、オフサイトに最適。登録不要・無料・スマホ対応。',
  category: '連想ゲーム / チームビルディング',
  features: [
    {
      title: 'ユニークな発想が高得点',
      text: 'ほかの人と重ならない答えは3点、2人以上が同じ答えを選んだ場合は1点ずつ。多数派に寄せるより、自分らしい連想を楽しめます。',
    },
    {
      title: '2〜8人・全5ラウンド',
      text: '少人数の1on1から8人のチームまで。1ラウンドごとに全員の答えを公開するので、会話のきっかけが自然に生まれます。',
    },
    {
      title: '端末1台で秘密入力',
      text: '回答中は前の人の答えを表示しないハンドオフ画面を挟み、全員の回答がそろってから一斉公開。順番待ちの間も安心です。',
    },
    {
      title: '答えが次のお題になるリレー',
      text: 'いちばん多く選ばれた答えが次のスタートワードに。全員ユニークなら回答からランダムに選ばれ、連想の流れが続きます。',
    },
    {
      title: '会議・オフサイト向けのお題35語',
      text: '会議、ランチ、出張、チームワークなど、仕事の場面から連想しやすい日本語のお題を収録。研修や懇親会にも使えます。',
    },
    {
      title: '登録不要・スマホ対応',
      text: '無料で遊べて、名前や回答は保存・送信されません。390px幅のスマートフォンでも横スクロールなしで操作できます。',
    },
  ],
  steps: [
    {
      title: '人数と名前を設定する',
      text: '2〜8人から人数を選び、プレイヤー名を入力します。名前はこの画面内だけで使われ、保存されません。',
    },
    {
      title: 'お題の連想語を秘密に入力する',
      text: '表示されたスタートワードから連想する言葉を、1人ずつ端末を回して入力。最大20文字で、空欄やお題と同じ言葉は受け付けません。',
    },
    {
      title: '全員の答えを公開して得点を確認する',
      text: '全員の入力が終わったら一斉公開。ユニークな答えは3点、2人以上一致した答えは1点ずつ入り、累積スコアが表示されます。',
    },
    {
      title: '次のお題でリレーして順位を決める',
      text: 'いちばん多く選ばれた答えを次のスタートワードにして全5ラウンド。最後に累積得点でランキングと優勝者を発表します。',
    },
  ],
  faqs: [
    {
      q: '連想リレーは無料で遊べますか？',
      a: 'はい、完全無料で遊べます。会員登録やインストールは不要で、ブラウザを開けばすぐに始められます。',
    },
    {
      q: '何人で遊べますか？',
      a: '2〜8人に対応しています。全5ラウンドで、1台の端末を回しながら全員が1つずつ回答します。',
    },
    {
      q: 'スマートフォンでも遊べますか？',
      a: 'はい。幅390px程度のスマートフォンでも横スクロールなしで遊べるよう調整しています。タップしやすいボタンとキーボード操作にも対応しています。',
    },
    {
      q: '入力した名前や回答は保存・送信されますか？',
      a: 'いいえ。名前と回答はページ内の状態としてのみ扱い、サーバー送信やlocalStorageへの保存は行いません。回答中は前の人の入力内容を表示しない画面を挟みます。',
    },
    {
      q: '得点のルールを教えてください',
      a: 'ほかの人と重ならないユニークな答えは3点、2人以上が同じ答えを選んだ場合は1点ずつです。空欄やお題と同じ言葉は受け付けないため、得点にはなりません。次のスタートワードは、いちばん多く選ばれた答えから選ばれます。',
    },
  ],
  related: [
    {
      href: '/games',
      label: '無料ゲーム一覧',
      description: 'ほかのパーティーゲームやブラウザゲームを探す',
    },
    {
      href: '/ishin-denshin',
      label: '以心伝心',
      description: 'お題に対して同じ答えを狙うチームゲーム',
    },
    {
      href: '/minority-word',
      label: '少数派ワード',
      description: '少数派の言葉を当てる会話ゲーム',
    },
    {
      href: '/rank-guess',
      label: 'ランキング当て',
      description: 'みんなの順位予想で盛り上がるゲーム',
    },
  ],
};

export const metadata: Metadata = {
  title: '連想リレー｜お題から連想する言葉をつなぐ無料パーティーゲーム',
  description: seo.description,
  keywords: [
    '連想リレー',
    '連想ゲーム 無料',
    'ワード連想 ゲーム',
    'パーティーゲーム 連想',
    'チームビルディング ゲーム',
    'アイスブレイク ゲーム',
    '会議 レクリエーション',
    'オフサイト ゲーム',
    'ブラウザゲーム 無料',
    '大人数 ゲーム',
  ],
  alternates: {
    canonical: seo.slug,
  },
  openGraph: {
    title: '連想リレー｜お題から連想する言葉をつなぐ無料パーティーゲーム',
    description: seo.description,
    url: `${APP_URL}${seo.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: '連想リレー',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@zatsudan_gacha',
    title: '連想リレー｜お題から連想する言葉をつなぐ無料パーティーゲーム',
    description: seo.description,
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function WordChainPage() {
  return (
    <PartyGameShell seo={seo}>
      <WordChainGame />
    </PartyGameShell>
  );
}
