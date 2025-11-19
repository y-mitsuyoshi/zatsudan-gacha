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
    const newGame = createNewGame(formState);
    setGameState(newGame);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 font-sans transition-colors duration-300 bg-[#FFF8E1] dark:bg-[#1a1a2e] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-4 rounded-3xl shadow-sm border border-white/20">
          <div className="flex items-center gap-3">
            <span className="text-4xl animate-bounce">🎲</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">社畜</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">すごろく</span>
                <span className="text-yellow-400 ml-2">NEO</span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">
                〜目指せ！定時退社＆ボーナス支給〜
              </p>
            </div>
          </div>
          <ThemeToggleButton />
        </header>

        {!gameState && (
          <section className="mb-8 transform hover:scale-[1.01] transition-transform duration-300">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border-4 border-blue-100 dark:border-blue-900 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-yellow-100 dark:bg-yellow-900/30 rounded-full blur-3xl opacity-50"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-3xl opacity-50"></div>
              
              <div className="relative z-10">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span>🏢</span> ストーリー
                </h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  これは、現代社会の荒波を乗り越える、すべての社会人に贈る壮大な物語（すごろく）である。<br/>
                  職業を選び、アイテムを駆使して、無事にゴール（ボーナス支給日）にたどり着けるか？<br/>
                  さあ、サイコロを振ってあなたの<span className="text-orange-500 font-bold">社畜ランク</span>を確かめよう！
                </p>
              </div>
            </div>
          </section>
        )}

        <main role="main">
          {!gameState ? (
            <div className="max-w-2xl mx-auto">
              <SetupForm
                formState={formState}
                setFormState={setFormState}
                onSubmit={handleGameStart}
              />
            </div>
          ) : (
            <GameContainer initialState={gameState} />
          )}
        </main>
      </div>
    </div>
  );
}
