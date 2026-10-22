'use client';

import dynamic from 'next/dynamic';

const ShachikuSurvivorGame = dynamic(() => import('@/components/survivor/ShachikuSurvivorGame'), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-[#0a0e1f] text-white">出社準備中…</div>
  ),
});

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#0a0e1f]">
      <ShachikuSurvivorGame />
    </main>
  );
}
