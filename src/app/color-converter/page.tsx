import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { ColorConverter } from '@/components/tools/color-converter/ColorConverter';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/color-converter',
  name: 'カラーコード変換・配色',
  h1: 'カラーコード変換・配色',
  description:
    'HEX・RGB・HSLのカラーコードを相互変換し、補色・類似色・トライアドなどの配色候補と、黒・白背景に対するコントラスト比をその場で確認できる無料ツールです。カラーピッカーと3桁HEXに対応し、入力内容はブラウザ内で処理されます。',
  category: 'デザイン / カラー',
  features: [
    {
      title: 'HEX・RGB・HSLを双方向に変換',
      text: 'カラーピッカーで選んだ色も、HEX・RGB・HSLのどれかに入力した色も、残りの形式へすぐに反映します。3桁HEXの省略記法や大文字・小文字の違いも自動で整えます。',
    },
    {
      title: '配色の候補を6色で比較',
      text: '補色、類似色2色、トライアド、明るいトーン、暗いトーンを自動計算します。スウォッチを押すだけで、その色を新しいベースカラーとして編集できます。',
    },
    {
      title: '白黒背景とのコントラスト比を判定',
      text: '相対輝度からコントラスト比を算出し、WCAGの通常文字AA（4.5:1以上）とAAA（7:1以上）に適合するかを表示します。文字色と背景色の組み合わせを確認できます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '色の変換や配色の計算をサーバーへ送信しません。会員登録は不要で、入力内容をlocalStorageなどに保存することもありません。',
    },
  ],
  steps: [
    {
      title: '色を選ぶかカラーコードを入力する',
      text: 'カラーピッカーを操作するか、HEX・RGB・HSLのいずれかの欄へ値を入力します。HEXは3桁または6桁に対応しています。',
    },
    {
      title: '変換結果を確認してコピーする',
      text: 'プレビューと3形式の値が揃っていることを確認し、必要な形式のコピーボタンを押すとクリップボードへコピーできます。',
    },
    {
      title: '配色とコントラストを確認する',
      text: '配色パレットから候補色を選び、黒背景・白背景それぞれのコントラスト比とAA・AAAの判定を見て、読みやすさを確認します。',
    },
  ],
  faqs: [
    {
      q: 'カラーコード変換・配色ツールは無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。利用回数の制限もありません。',
    },
    {
      q: '入力した色コードはサーバーに送信されますか？',
      a: 'いいえ。色の変換、配色の計算、コントラスト比の算出はすべてブラウザ内で行います。入力内容をサーバーへ送信したり、localStorageなどに保存したりすることはありません。',
    },
    {
      q: 'コントラスト比はどのように判定していますか？',
      a: 'WCAGで用いられる相対輝度の計算式から、色と黒背景・白背景それぞれのコントラスト比を求めています。通常サイズの文字は4.5:1以上でAA、7:1以上でAAAの目安を満たします。大きな文字は3:1以上でAAの目安です。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。スマートフォンのブラウザでも利用できます。幅390px程度の画面では、プレビュー、入力欄、配色スウォッチが縦に並び、横スクロールなしで操作できるようにしています。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/image-resizer',
      label: '画像リサイズ・圧縮',
      description: '画像をブラウザ内で縮小・圧縮して保存できます。',
    },
    {
      href: '/character-counter',
      label: '文字数カウント',
      description: '文章の文字数や単語数をその場で確認できます。',
    },
    {
      href: '/unit-converter',
      label: '単位変換ツール',
      description: '長さ・重さ・温度などの単位をすばやく換算できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: 'カラーコード変換・配色ツール｜HEX・RGB・HSLとコントラスト比を無料チェック',
  description:
    'HEX・RGB・HSLを相互変換し、補色・類似色・トライアドなどの配色候補を確認できる無料ツールです。カラーピッカーと3桁HEXに対応し、白黒背景とのコントラスト比とWCAG AA/AAAの目安も表示します。入力はブラウザ内で処理されます。',
  keywords: [
    'カラーコード 変換',
    'HEX RGB 変換',
    'RGB HSL 変換',
    'カラーピッカー',
    '配色 ツール',
    '補色 類似色 トライアド',
    'コントラスト比 確認',
    'WCAG コントラスト',
  ],
  alternates: {
    canonical: '/color-converter',
  },
  openGraph: {
    title: 'カラーコード変換・配色ツール｜HEX・RGB・HSLとコントラスト比を無料チェック',
    description:
      'HEX・RGB・HSLの相互変換、補色・類似色・トライアドの配色候補、白黒背景とのコントラスト比とWCAG判定をブラウザ内で確認できます。',
    url: `${APP_URL}/color-converter`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'カラーコード変換・配色ツール',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'カラーコード変換・配色ツール｜HEX・RGB・HSLとコントラスト比を無料チェック',
    description:
      'HEX・RGB・HSLを相互変換し、配色候補と白黒背景とのコントラスト比を確認できる無料ツール。入力内容はブラウザ内で処理されます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function ColorConverterPage() {
  return (
    <UtilityToolShell seo={seo}>
      <ColorConverter />
    </UtilityToolShell>
  );
}
