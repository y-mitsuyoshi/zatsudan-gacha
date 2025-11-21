import dynamic from 'next/dynamic';

const ShachikuGame = dynamic(() => import('@/components/game/ShachikuGame'), {
  ssr: false,
  loading: () => <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">出社準備中...</div>,
});

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      <ShachikuGame />
    </main>
  );
}
