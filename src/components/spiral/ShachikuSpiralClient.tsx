'use client';

import dynamic from 'next/dynamic';

const ShachikuSpiralGame = dynamic(() => import('./ShachikuSpiralGame'), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-[#12100d] text-[#f2e9d8]">出勤準備中…</div>
  ),
});

export default function ShachikuSpiralClient() {
  return <ShachikuSpiralGame />;
}
