import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'バリケードディフェンス',
  description: '前方大群を撃退する防衛シューティング。ドラム缶・仲間救出・バリケード防衛の無料ブラウザゲーム。',
};

export default function BarricadeDefenseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
