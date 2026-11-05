import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { ImageResizer } from '@/components/tools/image-resizer/ImageResizer';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '画像リサイズ・圧縮ツール｜無料・ブラウザ内で安全に処理',
  description:
    'JPEG・PNG・WebP画像をブラウザ内でリサイズ・圧縮。最大20MB、縦横比を保ったまま最大幅・高さを指定し、JPEG/PNG/WebPで保存できます。画像は送信されません。',
  keywords: [
    '画像 リサイズ',
    '画像 圧縮',
    '画像 縮小',
    'JPEG 圧縮',
    'PNG 圧縮',
    'WebP 変換',
    'ブラウザ 画像編集',
    '無料 画像ツール',
  ],
  alternates: {
    canonical: '/image-resizer',
  },
  openGraph: {
    title: '画像リサイズ・圧縮ツール｜無料・ブラウザ内で安全に処理',
    description:
      'JPEG・PNG・WebP画像を縦横比そのままに縮小・圧縮。最大20MB対応、形式と品質を選んでダウンロード。画像はサーバーへ送信されません。',
    url: `${APP_URL}/image-resizer`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '画像リサイズ・圧縮ツール' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '画像リサイズ・圧縮ツール｜無料・ブラウザ内で安全に処理',
    description:
      'JPEG・PNG・WebP画像を縦横比そのままに縮小・圧縮。最大20MB対応、形式と品質を選んでダウンロード。画像はサーバーへ送信されません。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const seo: UtilityToolSeo = {
  slug: '/image-resizer',
  name: '画像リサイズ・圧縮',
  h1: '画像リサイズ・圧縮',
  description:
    'JPEG・PNG・WebP画像を、縦横比を保ったままブラウザ内で縮小・再圧縮できる無料ツールです。最大20MBの画像に対応し、出力形式と品質を選んでダウンロードできます。画像がサーバーへ送信されることはありません。',
  category: '画像 / 圧縮',
  features: [
    {
      title: 'ブラウザ内だけで完結',
      text: '選択した画像はアップロードされず、FileReader・Image・Canvasを使って端末内で処理します。サーバー通信や画像の保存は行いません。',
    },
    {
      title: '縦横比を保って縮小',
      text: '最大幅と最大高さを指定すると、元の縦横比を崩さずに収まるサイズへ自動計算します。元画像より拡大しないため、用途に合った軽量化ができます。',
    },
    {
      title: '形式と品質を選べる',
      text: 'JPEG・PNG・WebPを出力形式として選択できます。JPEGとWebPは品質スライダーで圧縮率を調整でき、PNGは可逆圧縮で保存します。',
    },
    {
      title: 'メタデータを削除して出力',
      text: 'Canvasに描き直して再エンコードするため、撮影日時やGPS位置情報、カメラ情報などのExifメタデータは出力画像に残りません。',
    },
  ],
  steps: [
    {
      title: '画像を選択する',
      text: 'JPEG・PNG・WebP形式、20MB以下の画像を選びます。読み込むと元のピクセルサイズとファイルサイズが表示されます。',
    },
    {
      title: 'サイズ・形式・品質を指定する',
      text: '最大幅と最大高さを入力し、出力形式を選びます。JPEGまたはWebPでは品質スライダーで圧縮率を調整できます。',
    },
    {
      title: '出力を確認してダウンロードする',
      text: '「リサイズ・圧縮する」を押すと、出力サイズとファイルサイズが表示されます。内容を確認してダウンロードボタンから保存します。',
    },
  ],
  faqs: [
    {
      q: '画像リサイズ・圧縮ツールは無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。回数制限もありません。',
    },
    {
      q: 'アップロードした画像はサーバーに送信されますか？',
      a: 'いいえ。画像の読み込み・縮小・再エンコードはすべてブラウザ内で行い、外部サーバーへの送信や保存は行いません。ページを閉じると選択した画像は破棄されます。',
    },
    {
      q: '入力できる画像形式を教えてください。',
      a: 'JPEG（.jpg/.jpeg）、PNG、WebPに対応しています。1ファイルあたり20MBまでです。対応外の形式やサイズ超過の場合はエラーメッセージが表示されます。',
    },
    {
      q: '出力画像からメタデータは削除されますか？',
      a: 'はい。Canvasに描き直して再エンコードするため、Exifに含まれる撮影日時・GPS位置情報・カメラ機種などは出力画像に含まれません。SNS投稿前のプライバシー対策としても利用できます。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。スマートフォンのブラウザでも利用できます。大きな画像は端末のメモリ上限に合わせて縮小される場合があります。処理できない場合は、より小さい画像でお試しください。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/character-counter',
      label: '文字数カウント',
      description: 'SNS投稿や文章の文字数をその場で数えられます。',
    },
    {
      href: '/json-formatter',
      label: 'JSONフォーマッター',
      description: 'JSONの整形や構文チェックをブラウザ内で行えます。',
    },
    {
      href: '/color-converter',
      label: 'カラーコード変換',
      description: 'HEX・RGB・HSLなどのカラーコードを相互変換できます。',
    },
  ],
};

export default function ImageResizerPage() {
  return (
    <UtilityToolShell seo={seo}>
      <ImageResizer />
    </UtilityToolShell>
  );
}
