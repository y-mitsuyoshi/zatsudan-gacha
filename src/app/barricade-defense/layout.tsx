import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜ディフェンス',
  description: '定時退社を守る防衛シューティング。差し入れ・同期救出・定時の壁防衛の無料ブラウザゲーム。',
};

export default function BarricadeDefenseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
