import dynamic from 'next/dynamic';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜シューティング | 雑談テーマガチャ',
  description: '迫りくる業務（敵）を倒して定時退社を目指せ！ストレス発散系シューティングゲーム。',
  openGraph: {
    title: '社畜シューティング | 雑談テーマガチャ',
    description: '迫りくる業務（敵）を倒して定時退社を目指せ！ストレス発散系シューティングゲーム。',
    images: ['/ogp-shooting.png'], // Assuming generic or specific OGP
  },
};

const ShachikuGame = dynamic(() => import('@/components/game/ShachikuGame'), {
  ssr: false,
  loading: () => <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">出社準備中...</div>,
});

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      <ShachikuGame />
    </main>
  );
}
