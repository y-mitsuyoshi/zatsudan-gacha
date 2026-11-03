"use client";

import { useState } from 'react';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SetupForm } from '@/components/shachiku-sugoroku/SetupForm';
import { GameContainer } from '@/components/shachiku-sugoroku/GameContainer';
import { GameState, SetupFormState } from '@/types/sugoroku';
import { createNewGame } from '@/lib/sugoroku-logic';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { GAME_SEO_DATA, buildGameJsonLd } from '@/lib/gameSeoData';

const game = GAME_SEO_DATA.sugoroku;

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
    <div className="relative min-h-screen overflow-hidden bg-[var(--paper)] p-3 font-sans transition-colors duration-300 sm:p-8">
      {/* tabletop texture */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#c9b38a_0.7px,transparent_0.7px)] [background-size:20px_20px] opacity-40 dark:opacity-20" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-6 border border-[var(--line)] bg-[var(--paper-strong)] shadow-[4px_4px_0_var(--paper-shadow)]">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="font-label flex h-14 w-14 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] text-[10px] font-bold text-[var(--accent)] sm:h-16 sm:w-16">
                60<span className="sr-only">マス</span>
              </div>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h1 className="font-editorial text-2xl tracking-tight text-[var(--ink)] sm:text-4xl">
                    社畜すごろく
                  </h1>
                  <span className="font-label border border-[var(--ink)] bg-[var(--ink)] px-2 py-0.5 text-[9px] text-[var(--paper-strong)]">
                    NEO
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold tracking-wide text-[var(--ink-soft)] sm:text-sm">
                  選択で変わる、あなたのキャリアボード
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label hidden border border-[var(--line)] bg-[var(--paper-muted)] px-3 py-1.5 text-[9px] text-[var(--ink-soft)] sm:inline-flex">
                60 squares / 10 jobs
              </span>
              <ThemeToggleButton />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[var(--line)] px-4 py-3 sm:px-6">
            {['サイコロで進む', '選択イベント', '評価ポイント', '全10職業'].map((item, index) => (
              <span key={item} className="font-label border border-[var(--line)] bg-[var(--paper-muted)] px-3 py-1 text-[9px] text-[var(--ink-soft)]">
                {String(index + 1).padStart(2, '0')} {item}
              </span>
            ))}
          </div>
        </header>

        {!gameState && (
          <section className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="relative overflow-hidden border border-[var(--line)] bg-[var(--paper-strong)] p-5 shadow-[3px_3px_0_var(--paper-shadow)] sm:p-6">
              <p className="paper-kicker">Story</p>
              <h2 className="font-editorial mt-2 text-xl text-[var(--ink)] sm:text-2xl">
                今日も、定時の鐘は遠い。
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
                月曜の朝から始まる、社畜のキャリアすごろく。サイコロを振ってマスを進み、仕事のイベントを乗り越えよう。
                途中で訪れる選択イベントでは「評価」と「やる気」のバランスを考えて、自分だけの結末を目指そう。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: '60マス', text: '6つの章をめぐる' },
                { title: '選択イベント', text: '評価とやる気を選ぶ' },
                { title: 'アイテム', text: 'ピンチをチャンスに' },
                { title: 'ランク判定', text: 'S〜Dで結果発表' },
              ].map((feature, index) => (
                <div key={feature.title} className="border border-[var(--line)] bg-[var(--paper-strong)] p-3">
                  <span className="font-label text-[9px] text-[var(--accent)]">{String(index + 1).padStart(2, '0')}</span>
                  <p className="mt-1 text-xs font-black text-[var(--ink)]">{feature.title}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{feature.text}</p>
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
      <SeoContentSection
        variant="light"
        eyebrow="GAME GUIDE"
        title={`${game.name}の特徴と遊び方`}
        intro={game.description}
        features={game.features}
        steps={game.steps}
        faqs={game.faqs}
        related={game.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ゲーム一覧', href: '/games' },
          { label: game.name },
        ]}
        jsonLd={buildGameJsonLd(game)}
      />
    </div>
  );
}
