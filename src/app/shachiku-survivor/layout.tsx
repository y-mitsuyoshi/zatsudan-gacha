import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜サバイバー | 18時まで生き残る10分サバイバル',
  description:
    '迫りくる業務（未読メール・クレーム・上司・役員・社長）から逃げ切れ！8種の武器と6種のパッシブを育て、9:00→18:00の10分間を生き残る無料ブラウザ・サバイバーズ系ゲーム。図鑑・実績・日課・恒久強化のやりこみ要素つき。',
  openGraph: {
    title: '社畜サバイバー | 18時まで生き残る10分サバイバル',
    description:
      '武器8種×パッシブ6種×ボス4体！やる気を集めてレベルアップ、定時退社を目指す無料サバイバーズ系ブラウザゲーム。',
    images: ['/ogp.png'],
  },
};

export default function ShachikuSurvivorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
