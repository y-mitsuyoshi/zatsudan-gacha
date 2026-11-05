import type { Metadata } from 'next';
import { PartyGameShell, type PartyGameSeo } from '@/components/party/PartyGameShell';
import { IshinDenshinGame } from '@/components/party/ishin-denshin/IshinDenshinGame';

const APP_URL = 'https://zatsudan-gacha.app';

const description =
  '以心伝心ゲームは、1台の端末を回して4択の答えがどれだけ揃うかを楽しむ無料パーティーゲーム。3〜8人・3/5ラウンド対応。同じ答えを選んだ人数が得点になり、全員一致なら全員に+3ボーナス。ラウンドごとの順位と最後の以心伝心度で、チームの阿吽の呼吸を診断できます。';

export const metadata: Metadata = {
  title: '以心伝心ゲーム｜4択で試す無料パーティーゲーム',
  description,
  keywords: [
    '以心伝心ゲーム',
    'チームビルディング',
    '会話ゲーム',
    'アイスブレイク',
    'オンサイト ゲーム',
    'オフサイト ゲーム',
    'チーム 相性',
    '無料 パーティーゲーム',
  ],
  alternates: {
    canonical: '/ishin-denshin',
  },
  openGraph: {
    title: '以心伝心ゲーム｜4択で試す無料パーティーゲーム',
    description,
    url: `${APP_URL}/ishin-denshin`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '以心伝心ゲーム',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '以心伝心ゲーム｜4択で試す無料パーティーゲーム',
    description,
    images: [`${APP_URL}/ogp.png`],
  },
};

const seo: PartyGameSeo = {
  slug: '/ishin-denshin',
  name: '以心伝心ゲーム',
  h1: '以心伝心ゲーム：4択の答えがどこまで揃うか試すチームゲーム',
  description,
  category: '以心伝心 / チームビルディング',
  features: [
    {
      title: '3〜8人、1台で遊べる秘密投票',
      text: '名前入力は任意。番号付きプレイヤーカードの順に端末を回し、回答を見せずに次の人へ渡せます。',
    },
    {
      title: '20問以上の4択お題',
      text: '朝ごはんから仕事の価値観まで、オフィスのアイスブレイクや合宿で使いやすいお題を多数収録。',
    },
    {
      title: '直感で選ぶだけのシンプルルール',
      text: '正解はありません。お題を見て4つの短い選択肢から1つ選ぶだけなので、初対面でもすぐ遊べます。',
    },
    {
      title: '全員一致で+3ボーナス',
      text: '同じ答えを選んだ人数がそのまま得点。全員の答えが揃ったラウンドは、全員に+3ボーナスが入ります。',
    },
    {
      title: 'ラウンド順位と以心伝心度',
      text: '各ラウンド後に今回得点と累計順位を公開。最終結果ではチームの一致度を以心伝心度として診断します。',
    },
    {
      title: '端末内で完結するプライバシー',
      text: '回答も名前も送信・保存しません。1人が回答するたびに選択状態をリセットし、次の人へ渡します。',
    },
  ],
  steps: [
    {
      title: '人数とラウンドを選ぶ',
      text: '3〜8人から人数を選び、3ラウンドまたは5ラウンドを選択。プレイヤー名は空欄なら「プレイヤー1」などの番号名になります。',
    },
    {
      title: '端末を回して秘密投票',
      text: '番号付きカードの順に端末を渡します。お題と4つの選択肢から直感で1つ選び、決定したら次の人へ。前の人の回答は表示されません。',
    },
    {
      title: '全員の回答を公開',
      text: '全員が回答したら、選択肢ごとの人数と今回得点を公開。同じ答えを選んだ人数が得点になり、全員一致なら+3ボーナスです。',
    },
    {
      title: '最終順位と以心伝心度をチェック',
      text: '全ラウンド終了時の累計順位を発表。チームの一致度に応じた以心伝心度コメントを確認し、同じメンバーで再挑戦できます。',
    },
  ],
  faqs: [
    {
      q: '以心伝心ゲームは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で遊べます。インストール、会員登録、課金は一切不要です。',
    },
    {
      q: '何人で遊ぶのがおすすめですか？',
      a: '3〜8人に対応しています。3〜5人はテンポよく、6〜8人は人数ならではの盛り上がりを楽しめます。1台の端末を順番に回してください。',
    },
    {
      q: 'スマートフォンだけでも遊べますか？',
      a: 'はい。スマートフォンのタッチ操作とPCのキーボード操作に対応しています。390px幅の画面でも横スクロールなしで遊べるよう調整しています。',
    },
    {
      q: '回答やプレイヤー名は保存・送信されますか？',
      a: 'いいえ。回答と名前はネットワークに送信せず、localStorageにも保存しません。ゲームを終了・リセットすると状態は消えます。',
    },
    {
      q: '得点と以心伝心度はどう計算しますか？',
      a: '得点は「同じ答えを選んだ人数」です。全員一致のラウンドは全員に+3ボーナス。以心伝心度は、各ラウンドで最多回答を選んだ人の割合を平均して算出します。',
    },
  ],
  related: [
    {
      href: '/games',
      label: '無料ゲーム一覧',
      description: '社畜ゲームやパーティーゲームをまとめてチェック',
    },
    {
      href: '/minority-word',
      label: '少数派ワード',
      description: '言葉のズレから少数派の言葉を見抜く会話ゲーム',
    },
    {
      href: '/rank-guess',
      label: '社長の頭の中（ランキング予想）',
      description: '4つの選択肢の順位をチームで予想するパーティーゲーム',
    },
    {
      href: '/word-chain',
      label: '連想リレー',
      description: 'お題から連想する言葉をつなぐチーム連想ゲーム',
    },
  ],
};

export default function IshinDenshinPage() {
  return (
    <PartyGameShell seo={seo}>
      <IshinDenshinGame />
    </PartyGameShell>
  );
}
