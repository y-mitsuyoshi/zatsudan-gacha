'use client';

import dynamic from 'next/dynamic';

const ShachikuSurvivorGame = dynamic(() => import('./ShachikuSurvivorGame'), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-[#12100d] text-[#f2e9d8]">出社準備中…</div>
  ),
});

export default function ShachikuSurvivorClient() {
  return <ShachikuSurvivorGame />;
}
