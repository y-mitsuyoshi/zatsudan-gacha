'use client';

import dynamic from 'next/dynamic';

const DanmakuGame = dynamic(() => import('./DanmakuGame'), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-black text-white">出社準備中…</div>
  ),
});

export default function DanmakuGameClient() {
  return <DanmakuGame />;
}
