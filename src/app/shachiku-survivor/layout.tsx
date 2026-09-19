import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜サバイバー',
  description: '18時まで生き残る10分サバイバル。武器8種・パッシブ6種・ボス4体の無料ブラウザゲーム。',
};

export default function ShachikuSurvivorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
