import dynamic from 'next/dynamic';
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

const ShachikuSpiralGame = dynamic(() => import('@/components/spiral/ShachikuSpiralGame'), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-[#0a0e1f] text-white">出勤準備中…</div>
  ),
});

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#0a0e1f]">
      <ShachikuSpiralGame />
    </main>
  );
}
