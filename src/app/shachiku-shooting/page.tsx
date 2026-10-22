'use client';

import dynamic from 'next/dynamic';

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
