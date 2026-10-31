"use client";

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { GameState } from '@/types/sugoroku';
import { GAME_BOARD, ENDINGS, ACHIEVEMENT_LIST, JOB_PROFILES } from '@/lib/sugoroku-logic';

const CHAPTERS = [
  { start: 0, end: 9, label: '第1章 入社' },
  { start: 10, end: 19, label: '第2章 新人' },
  { start: 20, end: 29, label: '第3章 若手' },
  { start: 30, end: 39, label: '第4章 中堅' },
  { start: 40, end: 49, label: '第5章 管理職' },
  { start: 50, end: 60, label: '第6章 役員' },
];

const PathGameBoard = ({ path }: { path: number[] }) => {
  const pathSet = React.useMemo(() => new Set(path), [path]);

  return (
    <div className="space-y-2">
      {CHAPTERS.map((chapter) => {
        const squares = GAME_BOARD.filter((square) => square.position >= chapter.start && square.position <= chapter.end);
        const visited = squares.filter((square) => pathSet.has(square.position)).length;
        return (
          <div key={chapter.label} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-[9px] font-black text-[#9a8464] dark:text-stone-400">{chapter.label}</span>
            <div className="flex flex-1 flex-wrap gap-1">
              {squares.map((square) => {
                const isVisited = pathSet.has(square.position);
                const isGoal = square.type === 'goal';
                return (
                  <span
                    key={square.position}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      isGoal
                        ? 'bg-amber-500 ring-2 ring-amber-300'
                        : isVisited
                          ? 'bg-amber-400'
                          : 'bg-[#e3d3b3] dark:bg-[#4c3f2c]'
                    }`}
                    title={`${square.position}: ${square.title}`}
                  />
                );
              })}
            </div>
            <span className="w-8 shrink-0 text-right text-[9px] font-bold text-[#a58c66] dark:text-stone-500">{visited}/{squares.length}</span>
          </div>
        );
      })}
    </div>
  );
};

interface ResultCardProps {
  gameState: GameState;
  onRestart: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ gameState, onRestart }) => {
  const resultCardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { playerName, job, turn, yaruki, ending, newlyUnlockedAchievements, path } = gameState;
  const career = gameState.career ?? 0;
  const uniqueVisited = new Set(path).size;
  const profile = JOB_PROFILES[job];

  const sRankEndings = ['legendary', 'executive', 'promotion', 'mentor', 'specialist', 'innovator', 'ace', 'creator', 'leader'];
  const isGoodEnding = ending != null && sRankEndings.includes(ending);

  const getEndingData = () => {
    const endingKey = ending as keyof typeof ENDINGS;
    const endingInfo = ENDINGS[endingKey] || { title: '不明なエンディング', description: 'データが見つかりません' };

    let rank = 'C';
    let gradient = 'from-stone-500 to-slate-600';
    let icon = '🍵';
    let subtitle = 'お疲れ様でした';

    const aRank = ['stable', 'balanced', 'diligent', 'team-player', 'steady'];
    const bRank = ['consistent', 'reliable', 'average', 'survivor', 'mediocre', 'freelance', 'entrepreneur', 'global', 'investor', 'influencer', 'farmer', 'writer'];
    const cRank = ['routine', 'ordinary'];
    const dRank = ['burnout', 'dropout', 'overwork', 'mental-break', 'stress-victim', 'exhausted', 'breakdown', 'resignation', 'collapse', 'defeat'];

    if (sRankEndings.includes(endingKey)) {
      rank = 'S';
      gradient = 'from-amber-500 via-orange-500 to-rose-500';
      icon = '🏆';
      subtitle = '最高のキャリア！';
    } else if (aRank.includes(endingKey)) {
      rank = 'A';
      gradient = 'from-sky-600 via-cyan-500 to-teal-500';
      icon = '✨';
      subtitle = '素晴らしいキャリア！';
    } else if (bRank.includes(endingKey)) {
      rank = 'B';
      gradient = 'from-emerald-600 to-teal-500';
      icon = '👍';
      subtitle = 'ナイスキャリア！';
    } else if (cRank.includes(endingKey)) {
      rank = 'C';
      gradient = 'from-stone-500 to-slate-600';
      icon = '🍵';
      subtitle = '平凡こそが幸せ？';
    } else if (dRank.includes(endingKey)) {
      rank = 'D';
      gradient = 'from-purple-600 to-indigo-600';
      icon = '🛌';
      subtitle = '少し休みましょう…';
    }

    return { title: endingInfo.title, subtitle, rank, description: endingInfo.description, gradient, icon };
  };

  const endingData = getEndingData();

  const handleDownloadImage = async () => {
    if (!resultCardRef.current) return;

    setIsSaving(true);
    setSaveError('');
    try {
      const canvas = await html2canvas(resultCardRef.current, {
        useCORS: true,
        backgroundColor: '#fffaf0',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `shachiku-career-result-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to save result image:', error);
      setSaveError('画像の保存に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `社畜すごろくで「${endingData.title}」(RANK ${endingData.rank})になった！ ${playerName}(${job}) ${turn}ターン やる気${yaruki} 評価${career}`
  )}&url=${encodeURIComponent('https://zatsudan-gacha.app/shachiku-sugoroku')}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl animate-[zoom-in_0.3s_ease-out_1]">
        <div
          ref={resultCardRef}
          className="relative overflow-hidden rounded-[2rem] border-4 border-[#e7d8b5] bg-[#fffaf0] shadow-2xl dark:border-[#5a4a33] dark:bg-[#211e19]"
        >
          <div className={`relative overflow-hidden bg-gradient-to-r ${endingData.gradient} px-6 py-8 text-center text-white`}>
            <div className="absolute -right-8 -top-10 text-[130px] opacity-15" aria-hidden="true">{endingData.icon}</div>
            <div className="relative">
              <p className="text-[10px] font-black tracking-[0.35em] text-white/80">FINAL RESULT</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-black">
                <span>RANK {endingData.rank}</span>
                <span className="h-3 w-px bg-white/40" />
                <span>{profile.icon} {job}</span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight drop-shadow-md sm:text-4xl">{endingData.title}</h1>
              <p className="mt-1 text-sm font-bold text-white/90">{endingData.subtitle}</p>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="mb-5 text-center">
              <h2 className="text-xl font-black text-[#3b2f1e] dark:text-amber-50">
                {playerName} <span className="text-sm font-bold text-[#8a7557] dark:text-stone-400">({job})</span>
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#6f5d42] dark:text-stone-300">
                {endingData.description}
              </p>
            </div>

            {isGoodEnding && (
              <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                ✨ ハイランク到達！あなたのキャリアは輝いています。
              </div>
            )}

            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'TURN', value: turn, color: 'text-sky-600 dark:text-sky-300' },
                { label: 'やる気', value: yaruki, color: 'text-emerald-600 dark:text-emerald-300' },
                { label: '評価', value: career, color: 'text-amber-600 dark:text-amber-300' },
                { label: '到達', value: `${uniqueVisited}/61`, color: 'text-violet-600 dark:text-violet-300' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-[#e2d4b8] bg-white/70 p-2.5 text-center dark:border-[#4c3f2c] dark:bg-[#2b2720]">
                  <p className="text-[9px] font-black tracking-widest text-[#9a8464] dark:text-stone-400">{stat.label}</p>
                  <p className={`mt-0.5 text-xl font-black tabular-nums ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {newlyUnlockedAchievements.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-center text-[10px] font-black tracking-widest text-[#9a8464] dark:text-stone-400">UNLOCKED ACHIEVEMENTS</h3>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {newlyUnlockedAchievements.map((achievement) => {
                    const info = (ACHIEVEMENT_LIST as Record<string, { name: string; description: string }>)[achievement];
                    return (
                      <span key={achievement} title={info?.description ?? achievement} className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                        <span aria-hidden="true">🏆</span> {info?.name ?? achievement}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-black tracking-widest text-[#9a8464] dark:text-stone-400">CAREER PATH</h3>
                <span className="text-[10px] font-bold text-[#a58c66] dark:text-stone-500">通ったマス {uniqueVisited} / 61</span>
              </div>
              <PathGameBoard path={path} />
            </div>

            {gameState.decisionHistory && gameState.decisionHistory.length > 0 && (
              <div className="rounded-xl border border-dashed border-[#d8c6a2] bg-[#f8efdd]/60 p-3 dark:border-[#4c3f2c] dark:bg-[#2a251d]">
                <p className="mb-2 text-[10px] font-black tracking-widest text-[#9a8464] dark:text-stone-400">YOUR CHOICES</p>
                <ul className="space-y-1">
                  {gameState.decisionHistory.map((decision, index) => (
                    <li key={`${decision.title}-${index}`} className="flex items-start gap-1.5 text-[11px] font-bold text-[#6f5d42] dark:text-stone-300">
                      <span className="text-amber-500" aria-hidden="true">•</span>
                      {decision.title} → {decision.choice}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-xl border border-[#d8c6a2] bg-[#fffaf0] px-5 py-3 text-sm font-black text-[#3b2f1e] shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-[#5c4a32] dark:bg-[#211e19] dark:text-amber-50"
          >
            🔄 もう一度
          </button>
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isSaving}
            className={`rounded-xl bg-gradient-to-r ${endingData.gradient} px-5 py-3 text-sm font-black text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60`}
          >
            📸 {isSaving ? '保存中…' : '結果を保存'}
          </button>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-black text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg dark:bg-amber-300 dark:text-stone-900"
          >
            𝕏 結果を共有
          </a>
        </div>
        {saveError && <p className="mt-3 text-center text-xs font-bold text-rose-600 dark:text-rose-400" role="alert">{saveError}</p>}
      </div>
    </div>
  );
};
