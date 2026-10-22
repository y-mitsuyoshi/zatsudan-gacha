'use client';

import dynamic from 'next/dynamic';

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
