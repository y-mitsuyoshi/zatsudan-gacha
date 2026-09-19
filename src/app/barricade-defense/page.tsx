import dynamic from 'next/dynamic';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜ディフェンス | 定時退社を守る防衛シューティング',
  description:
    '定時退社を阻む残業の大群を撃退せよ！差し入れ段ボールで武器チェンジ（スタンプ連打・書類・ド正論・退職届・冷たい視線）、SOSカプセルで同期救出、定時の壁と自宅を守り抜く全3勤務地×3働き方の無料ブラウザ防衛ゲーム。図鑑・実績・恒久強化のやりこみ要素つき。スコア・へそくり・実績は自動セーブ。',
  openGraph: {
    title: '社畜ディフェンス | 定時退社を守る防衛シューティング',
    description:
      '差し入れで武器チェンジ、同期を救出、定時の壁防衛！全3勤務地×3働き方＋エンドレス残業＋実績12種の無料ブラウザゲーム。',
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
