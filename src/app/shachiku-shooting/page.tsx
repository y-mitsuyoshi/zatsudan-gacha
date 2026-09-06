import dynamic from 'next/dynamic';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜シューティングNEO | 定時退社を目指す弾幕STG',
  description:
    '迫りくる業務（敵）を撃破して定時退社を目指せ！連射・拡散・追尾の3武器、コンボ×グレイズ稼ぎ、予告付きフェア弾幕の全6ステージボス戦＋無限残業ループ。完全無料のストレス発散シューティング。',
  openGraph: {
    title: '社畜シューティングNEO | 定時退社を目指す弾幕STG',
    description:
      '迫りくる業務（敵）を撃破して定時退社を目指せ！3武器×コンボ×グレイズ×全6ボスの弾幕シューティング。',
    images: ['/ogp.png'],
  },
};

const ShachikuGame = dynamic(() => import('@/components/game/DanmakuGame'), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-black text-white">出社準備中…</div>
  ),
});

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-black">
      <ShachikuGame />
    </main>
  );
}
