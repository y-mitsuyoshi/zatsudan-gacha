"use client";

import React, { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { GameState, SquareType } from '@/types/sugoroku';
import { GAME_BOARD, ENDINGS, ACHIEVEMENT_LIST } from '@/lib/sugoroku-logic';

// Simplified Path Board
const PathGameBoard = ({ path }: { path: number[], playerName: string }) => {
    const pathSet = React.useMemo(() => new Set(path), [path]);
    const getSquareColor = (type: SquareType, position: number): string => {
        if (pathSet.has(position)) {
            if (position === 0) return 'bg-green-400 ring-2 ring-green-200';
            if (position === 60) return 'bg-yellow-400 ring-2 ring-yellow-200';
            return 'bg-blue-400'; // Path color
        }
        return 'bg-gray-200 opacity-30';
    };

    return (
        <div className="flex flex-wrap gap-1 justify-center p-4 bg-white/50 rounded-xl">
            {GAME_BOARD.map((square) => (
                <div 
                  key={square.position} 
                  className={`
                    w-3 h-3 rounded-full transition-all duration-500
                    ${getSquareColor(square.type, square.position)}
                    ${pathSet.has(square.position) ? 'scale-110' : 'scale-90'}
                  `}
                  title={`Square ${square.position}: ${square.title}`}
                />
            ))}
        </div>
    );
};


interface ResultCardProps {
  gameState: GameState;
}

export const ResultCard: React.FC<ResultCardProps> = ({ gameState }) => {
  const resultCardRef = useRef<HTMLDivElement>(null);
  const { playerName, job, turn, yaruki, ending, newlyUnlockedAchievements, path } = gameState;

  const sRankEndings = ['legendary', 'promotion', 'mentor', 'specialist', 'innovator', 'ace', 'creator', 'leader'];
  const isGoodEnding = ending != null && sRankEndings.includes(ending);

  // Confetti effect on mount for S-rank
  useEffect(() => {
    if (!isGoodEnding) return;
    // 軽量紙吹雪: CSSアニメのドットを一定時間表示
    const id = setTimeout(() => {}, 0);
    return () => clearTimeout(id);
  }, [isGoodEnding]);

  const handleDownloadImage = () => {
    if (resultCardRef.current) {
      html2canvas(resultCardRef.current, {
          useCORS: true,
          backgroundColor: null,
          scale: 2, // Higher quality
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `shachiku-result-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
  };

  const handleRestart = () => {
      window.location.reload();
  }

  const getEndingData = () => {
    const endingKey = ending as keyof typeof ENDINGS;
    const endingInfo = ENDINGS[endingKey] || { title: '不明なエンディング', description: 'データが見つかりません' };

    // Rank Logic
    let rank = 'C';
    let gradient = 'from-gray-400 to-slate-500';
    let icon = '🤔';
    let bgPattern = 'bg-gray-100';
    let subtitle = 'お疲れ様でした';

    const sRank = ['legendary', 'promotion', 'mentor', 'specialist', 'innovator', 'ace', 'creator', 'leader'];
    const aRank = ['stable', 'balanced', 'diligent', 'team-player', 'steady'];
    const bRank = ['consistent', 'reliable', 'average', 'survivor', 'mediocre', 'freelance', 'entrepreneur', 'global', 'investor', 'influencer', 'farmer', 'writer'];
    const cRank = ['routine', 'ordinary'];
    // D Rank (Bad endings)
    const dRank = ['burnout', 'dropout', 'overwork', 'mental-break', 'stress-victim', 'exhausted', 'breakdown', 'resignation', 'collapse', 'defeat'];

    if (sRank.includes(endingKey)) {
        rank = 'S';
        gradient = 'from-yellow-300 via-orange-400 to-red-400';
        icon = '👑';
        bgPattern = 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-100 via-orange-50 to-white';
        subtitle = '最高のエンディング！';
    } else if (aRank.includes(endingKey)) {
        rank = 'A';
        gradient = 'from-blue-400 via-cyan-400 to-teal-400';
        icon = '✨';
        bgPattern = 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-100 via-cyan-50 to-white';
        subtitle = '素晴らしいキャリア！';
    } else if (bRank.includes(endingKey)) {
        rank = 'B';
        gradient = 'from-green-400 to-emerald-500';
        icon = '👍';
        bgPattern = 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-100 via-emerald-50 to-white';
        subtitle = 'ナイス社畜ライフ！';
    } else if (cRank.includes(endingKey)) {
        rank = 'C';
        gradient = 'from-gray-400 to-slate-500';
        icon = '🍵';
        bgPattern = 'bg-gray-50';
        subtitle = '平凡こそが幸せ？';
    } else if (dRank.includes(endingKey)) {
        rank = 'D';
        gradient = 'from-purple-500 to-indigo-600';
        icon = '🚑';
        bgPattern = 'bg-purple-50';
        subtitle = '少し休みましょう...';
    }

    return {
      title: endingInfo.title,
      subtitle: subtitle,
      rank: rank,
      description: endingInfo.description,
      gradient: gradient,
      icon: icon,
      bgPattern: bgPattern
    };
  };

  const endingData = getEndingData();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black/5 backdrop-blur-sm">
      <div className="max-w-2xl w-full animate-in zoom-in-95 duration-300">
        
        <div ref={resultCardRef} className={`relative rounded-[2rem] overflow-hidden shadow-2xl bg-white ${endingData.bgPattern}`}>
          {/* Decorative Circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-white/40 to-transparent rounded-full blur-3xl"></div>
          
          {/* Header */}
          <div className={`relative p-8 text-center text-white bg-gradient-to-r ${endingData.gradient}`}>
            <div className="text-6xl mb-4 animate-bounce filter drop-shadow-lg">{endingData.icon}</div>
            <div className="inline-block bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-sm font-bold mb-4 border border-white/30">
              RANK {endingData.rank}
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight drop-shadow-md">{endingData.title}</h1>
            <p className="text-lg opacity-90 font-medium">{endingData.subtitle}</p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {playerName} <span className="text-sm font-normal text-gray-500">({job})</span>
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {endingData.description}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                <div className="text-xs text-blue-400 font-bold uppercase mb-1">TURN</div>
                <div className="text-2xl font-black text-blue-600">{turn}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-2xl text-center border border-green-100">
                <div className="text-xs text-green-400 font-bold uppercase mb-1">YARUKI</div>
                <div className="text-2xl font-black text-green-600">{yaruki}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-2xl text-center border border-purple-100">
                <div className="text-xs text-purple-400 font-bold uppercase mb-1">GOAL</div>
                <div className="text-2xl font-black text-purple-600">{gameState.position}</div>
              </div>
            </div>

            {/* Achievements */}
            {newlyUnlockedAchievements.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Unlocked Achievements</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {newlyUnlockedAchievements.map(ach => {
                    const info = (ACHIEVEMENT_LIST as Record<string, { name: string; description: string }>)[ach];
                    return (
                      <span key={ach} title={info?.description ?? ach} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200 flex items-center gap-1">
                        <span>🏆</span> {info?.name ?? ach}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Path */}
            <div className="mb-2">
               <p className="text-xs text-gray-400 font-bold text-center mb-2">通ったマス: {path.length} / 61</p>
               <PathGameBoard path={path} playerName={playerName} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4 justify-center flex-wrap">
          <button
            onClick={handleRestart}
            className="bg-white text-gray-800 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 flex items-center gap-2"
          >
            <span>🔄</span> もう一度
          </button>
          <button
            onClick={handleDownloadImage}
            className={`font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all text-white flex items-center gap-2 bg-gradient-to-r ${endingData.gradient}`}
          >
            <span>📸</span> 保存する
          </button>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`社畜すごろくで「${endingData.title}」(RANK ${endingData.rank})になった！ ${playerName}(${job}) ${turn}ターン やる気${yaruki}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2"
          >
            <span>𝕏</span> 結果を共有
          </a>
        </div>
      </div>
    </div>
  );
};
