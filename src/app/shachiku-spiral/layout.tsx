import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜スパイラル | 渦巻く業務の列からコアを守る15ウェーブ',
  description:
    '中央の社畜コアを守れ！渦巻きながら迫る業務の列（未読メール・資料・クレーム・上司・役員・社長）を迎撃する無料ブラウザ・タワーディフェンス。10種の強化・全15ウェーブ＋エンドレス・実績つき。',
  openGraph: {
    title: '社畜スパイラル | 渦巻く業務の列からコアを守る15ウェーブ',
    description:
      '広告で見たあの渦巻きサバイバーが社畜版で登場！列の先頭を狙って切り崩せ。無料ブラウザゲーム。',
    images: ['/ogp.png'],
  },
};

export default function ShachikuSpiralLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
