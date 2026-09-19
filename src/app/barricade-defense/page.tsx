import dynamic from 'next/dynamic';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'バリケードディフェンス | 前方大群を撃退する防衛シューティング',
  description:
    '前方から襲い来る敵の大群を銃で撃退せよ！転がるドラム缶で武器チェンジ・誘爆、HELPカプセルで仲間救出、バリケードと拠点を守り抜く全3コース×3難易度の無料ブラウザ防衛ゲーム。スコア・解放・貯金は自動セーブ。',
  openGraph: {
    title: 'バリケードディフェンス | 前方大群を撃退する防衛シューティング',
    description:
      'ドラム缶で武器チェンジ、仲間を救出、バリケード防衛！全3コース×3難易度＋エンドレスの無料ブラウザゲーム。',
    images: ['/ogp.png'],
  },
};

const BarricadeDefenseGame = dynamic(() => import('@/components/defense/BarricadeDefenseGame'), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-[#05070f] text-white">戦場へ移動中…</div>
  ),
});

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#05070f]">
      <BarricadeDefenseGame />
    </main>
  );
}
