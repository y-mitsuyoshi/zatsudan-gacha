'use client';

import dynamic from 'next/dynamic';

const DanmakuGame = dynamic(() => import('./DanmakuGame'), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-2 bg-[#0c0a08] text-[#f2e9d8]">
      <div className="font-mono text-xs tracking-[0.3em] text-[#dfb15b]">
        SYSTEM INITIALIZING // SHACHIKU-STG NEO
      </div>
      <div className="text-sm font-bold text-[#b7a992]">出社準備中...</div>
    </div>
  ),
});

export default function DanmakuGameClient() {
  return <DanmakuGame />;
}
