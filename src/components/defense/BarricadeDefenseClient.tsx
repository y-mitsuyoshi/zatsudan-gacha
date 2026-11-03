'use client';

import dynamic from 'next/dynamic';

const BarricadeDefenseGame = dynamic(() => import('./BarricadeDefenseGame'), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-[#05070f] text-white">出社準備中…</div>
  ),
});

export default function BarricadeDefenseClient() {
  return <BarricadeDefenseGame />;
}
