import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜スパイラル',
  description: '渦巻く業務の列から中央コアを守る全15ウェーブの無料ブラウザゲーム。',
};

export default function ShachikuSpiralLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
