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
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen p-4 sm:p-8 font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
              社畜すごろくNEO
            </h1>
          </div>
          <ThemeToggleButton />
        </header>

        <section className="mb-8">
          <div className="bg-gradient-to-r from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 p-6 rounded-2xl border border-blue-200 dark:border-green-700">
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              これは、現代社会の荒波を乗り越える、すべての社会人に贈る壮大な物語（すごろく）である。
              職業を選び、アイテムを駆使して、無事にゴール（ボーナス支給日）にたどり着けるか？
              さあ、サイコロを振ってあなたの社畜ランクを確かめよう！
            </p>
          </div>
        </section>

        <main role="main">
          {!gameState ? (
            <SetupForm
              formState={formState}
              setFormState={setFormState}
              onSubmit={handleGameStart}
            />
          ) : (
            <GameContainer initialState={gameState} />
          )}
        </main>
      </div>
    </div>
  );
}
