import dynamic from 'next/dynamic';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜通勤サバイバー | 満員ラッシュを突破する3D防衛シューティング',
  description:
    '満員ラッシュを突破して会社へ！緑ゲートで強化、差し入れ段ボールで武器チェンジ（名刺・カバン・定期・特急・冷房）、SOSケージで同期救出、全3路線×3混雑度の無料3Dブラウザゲーム。図鑑・実績・恒久強化のやりこみ要素つき。',
  openGraph: {
    title: '社畜通勤サバイバー | 満員ラッシュを突破する3D防衛シューティング',
    description:
      'ゲート選択で強化、同期を救出、満員電車を突破！全3路線×3混雑度＋エンドレス残業＋実績12種の無料3Dブラウザゲーム。',
    images: ['/ogp.png'],
  },
};

const BarricadeDefenseGame = dynamic(() => import('@/components/defense/BarricadeDefenseGame'), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-[#05070f] text-white">出社準備中…</div>
  ),
});

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#05070f]">
      <BarricadeDefenseGame />
    </main>
  );
}
