"use client";

import { useState } from 'react';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { AudioToggle } from '@/components/game/AudioToggle';
import { SetupForm } from '@/components/shachiku-sugoroku/SetupForm';
import { GameContainer } from '@/components/shachiku-sugoroku/GameContainer';
import { HankoStamp } from '@/components/shachiku-sugoroku/SugorokuIcons';
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
    <div className="relative min-h-screen overflow-hidden bg-[#efe6d5] p-3 font-sans transition-colors duration-300 sm:p-6 dark:bg-[#14110d]">
      {/* 盤面テーブルクロス・設計図テクスチャ */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#8a7d69_0.75px,transparent_0.75px)] [background-size:20px_20px] opacity-30 dark:opacity-15"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-5 overflow-hidden rounded-2xl border-2 border-[#3b3022] bg-[#f4ece0] shadow-[0_8px_0_#261e14] dark:border-[#6e5a3e] dark:bg-[#1e1913]">
          <div className="flex flex-col gap-4 bg-[#12100d] p-4 text-[#fffaf0] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-[#f5ca5c] bg-[#b23a2a] font-mono text-white shadow-inner sm:h-14 sm:w-14">
                <span className="text-[9px] font-black leading-none text-[#f5ca5c]">60 STEP</span>
                <span className="mt-0.5 text-lg font-black leading-none">双六</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-editorial text-2xl font-black tracking-tight text-[#fffaf0] sm:text-3xl">
                    社畜すごろく
                  </h1>
                  <span className="rounded border border-[#f5ca5c] bg-[#f5ca5c] px-2 py-0.5 font-mono text-[10px] font-black text-[#12100d]">
                    NEO / TOWER EDITION
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold tracking-wide text-white/75 sm:text-sm">
                  定時か残業か、昇進か休養か。選択と出目で駆け上がる60マスの企業タワーボードゲーム
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AudioToggle variant="compact" />
              <ThemeToggleButton />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#d4c4a8] px-4 py-2.5 text-[11px] font-black text-[#5c5141] sm:px-6 dark:border-[#3b3226] dark:text-[#cfc2ad]">
            <div className="flex flex-wrap gap-2">
              {[
                '01 全6フロア・60マス立体盤面',
                '02 定時(1D6) / 全力残業(2D6)切替',
                '03 5段階の昇進査定ゲート',
                '04 全10職種の専用特効＆38種エンディング',
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-[#c9b99b] bg-[#fffaf0] px-2.5 py-0.5 text-[10px] font-black text-[#12100d] dark:border-[#3b3226] dark:bg-[#262019] dark:text-[#fffaf0]"
                >
                  {item}
                </span>
              ))}
            </div>
            <span className="font-mono text-[10px] text-[#8a7d69]">BOARD GAME VER 2.0</span>
          </div>
        </header>

        {!gameState && (
          <section className="mb-6 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border-2 border-[#3b3022] bg-[#fffaf0] p-5 shadow-[0_6px_0_#261e14] sm:p-6 dark:border-[#594b38] dark:bg-[#1e1913]">
              <div>
                <p className="font-mono text-[10px] font-black tracking-widest text-[#b23a2a] dark:text-[#f5ca5c]">
                  CORPORATE SURVIVAL BOARD GAME
                </p>
                <h2 className="font-editorial mt-1 text-xl font-black text-[#12100d] sm:text-2xl dark:text-[#fffaf0]">
                  今日も、定時のチャイムは遠く鳴る。
                </h2>
                <p className="mt-2 max-w-2xl text-xs font-bold leading-relaxed text-[#5c5141] sm:text-sm dark:text-[#cfc2ad]">
                  1F「新人研修棟」から6F「役員フロア・決算ボーナス支給日」まで全60マス。
                  堅実に定時退社で気力を保つか、リスク覚悟の全力残業（2ダイス）で評価と残業代を稼ぐか。
                  あなたの決断次第で、伝説の執行役員から独立起業・FIREまで38通りの結末が待ち受けます。
                </p>
              </div>
              <HankoStamp text="出社" variant="teal" className="hidden sm:inline-flex" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { badge: 'STANCE', title: '定時 vs 全力残業', text: '1ダイス安全進行か2ダイス高速出世か' },
                { badge: 'PROMOTE', title: '昇進査定ゲート', text: '社内評価を貯めて新入社員から役員へ' },
                { badge: 'DECISION', title: '3択の稟議決断', text: '堅実案から一発逆転の勝負手まで選択' },
                { badge: 'GRADE', title: 'S〜Dランク査定', text: '全38エンディング＆10種の実績バッジ' },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-3 shadow-xs dark:border-[#594b38] dark:bg-[#1e1913]"
                >
                  <span className="rounded bg-[#12100d] px-1.5 py-0.5 font-mono text-[9px] font-black text-[#f5ca5c]">
                    {feature.badge}
                  </span>
                  <p className="mt-1.5 text-xs font-black text-[#12100d] dark:text-[#fffaf0]">
                    {feature.title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold leading-snug text-[#5c5141] dark:text-[#cfc2ad]">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <main role="main">
          {!gameState ? (
            <div className="mx-auto max-w-4xl">
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
