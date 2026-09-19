import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜通勤サバイバー',
  description: '満員ラッシュを突破する3Dシューティング。ゲート選択・同期救出・満員電車突破の無料ブラウザゲーム。',
};

export default function BarricadeDefenseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
