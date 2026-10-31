"use client";

import { useState } from 'react';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SetupForm } from '@/components/shachiku-sugoroku/SetupForm';
import { GameContainer } from '@/components/shachiku-sugoroku/GameContainer';
import { GameState, SetupFormState } from '@/types/sugoroku';
import { createNewGame } from '@/lib/sugoroku-logic';

export default function ShachikuSugorokuPage() {
  const [formState, setFormState] = useState<SetupFormState>({
    name: '',
    job: '営業',
  });
  const [gameState, setGameState] = useState<GameState | null>(null);

  const handleGameStart = () => {
    setGameState(createNewGame(formState));
  };

  const handleRestart = () => {
    setGameState(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3e8d0] p-3 font-sans transition-colors duration-300 dark:bg-[#171512] sm:p-8">
      {/* tabletop texture */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#c9b38a_0.7px,transparent_0.7px)] [background-size:18px_18px] opacity-40 dark:opacity-20" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-100/40 via-transparent to-orange-200/30 dark:from-amber-950/20 dark:to-orange-950/20" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-6 overflow-hidden rounded-[1.75rem] border-4 border-[#ddc9a3] bg-[#fffaf0]/95 shadow-[0_16px_35px_rgba(82,61,30,0.15)] backdrop-blur-sm dark:border-[#51422e] dark:bg-[#211e19]/95">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-700/30 bg-gradient-to-br from-amber-300 to-orange-500 text-3xl shadow-[0_5px_0_0_#9a3412] sm:h-16 sm:w-16 sm:text-4xl">
                🎲
              </div>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h1 className="text-2xl font-black tracking-tight text-[#3b2f1e] dark:text-amber-50 sm:text-4xl">
                    社畜すごろく
                  </h1>
                  <span className="rounded-md bg-[#3b2f1e] px-2 py-0.5 text-xs font-black tracking-[0.2em] text-amber-200 dark:bg-amber-300 dark:text-[#3b2f1e]">
                    NEO
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold tracking-wide text-[#8a7557] dark:text-stone-300 sm:text-sm">
                  選択で変わる、あなたのキャリアボード
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-[#d8c6a2] bg-white/60 px-3 py-1.5 text-xs font-bold text-[#7a684e] dark:border-[#5c4a32] dark:bg-[#2a251c] dark:text-stone-300 sm:inline-flex">
                60マス / 全10職業
              </span>
              <ThemeToggleButton />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t-2 border-dashed border-[#e3d3b3] px-4 py-3 dark:border-[#4c3f2c] sm:px-6">
            {['サイコロで進む', '選択イベント', '評価ポイント', '全10職業'].map((item) => (
              <span key={item} className="rounded-full bg-[#f6ecd6] px-3 py-1 text-[11px] font-black text-[#7a5b2b] dark:bg-[#342d22] dark:text-amber-200">
                {item}
              </span>
            ))}
          </div>
        </header>

        {!gameState && (
          <section className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="relative overflow-hidden rounded-2xl border-2 border-[#e2d4b8] bg-[#fffaf0]/90 p-5 shadow-lg dark:border-[#4c3f2c] dark:bg-[#211e19]/90 sm:p-6">
              <div className="absolute -right-8 -top-10 text-[120px] opacity-10" aria-hidden="true">🏢</div>
              <p className="text-xs font-black tracking-[0.25em] text-amber-700 dark:text-amber-300">STORY</p>
              <h2 className="mt-1 text-xl font-black text-[#3b2f1e] dark:text-amber-50 sm:text-2xl">
                今日も、定時の鐘は遠い。
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6f5d42] dark:text-stone-300">
                月曜の朝から始まる、社畜のキャリアすごろく。サイコロを振ってマスを進み、仕事のイベントを乗り越えよう。
                途中で訪れる選択イベントでは「評価」と「やる気」のバランスを考えて、自分だけの結末を目指そう。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🎯', title: '60マス', text: '6つの章をめぐる' },
                { icon: '🧭', title: '選択イベント', text: '評価とやる気を選ぶ' },
                { icon: '🎒', title: 'アイテム', text: 'ピンチをチャンスに' },
                { icon: '🏆', title: 'ランク判定', text: 'S〜Dで結果発表' },
              ].map((feature) => (
                <div key={feature.title} className="rounded-xl border-2 border-[#e2d4b8] bg-[#fffaf0]/80 p-3 dark:border-[#4c3f2c] dark:bg-[#211e19]/80">
                  <span className="text-xl" aria-hidden="true">{feature.icon}</span>
                  <p className="mt-1 text-xs font-black text-[#3b2f1e] dark:text-amber-50">{feature.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#8a7557] dark:text-stone-400">{feature.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <main role="main">
          {!gameState ? (
            <div className="mx-auto max-w-3xl">
              <SetupForm
                formState={formState}
                setFormState={setFormState}
                onSubmit={handleGameStart}
              />
            </div>
          ) : (
            <GameContainer initialState={gameState} onRestart={handleRestart} />
          )}
        </main>
      </div>
    </div>
  );
}
