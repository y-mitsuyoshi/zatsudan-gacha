"use client";

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { GameState } from '@/types/sugoroku';
import {
  ACHIEVEMENT_LIST,
  BOARD_SIZE,
  ENDINGS,
  FLOORS,
  GAME_BOARD,
  RANKS,
  calculateNetWorthBreakdown,
  calculateScoreAndGrade,
} from '@/lib/sugoroku-logic';
import { AudioToggle } from '@/components/game/AudioToggle';
import { audioManager } from '@/utils/audio';
import { AssetIcon, HankoStamp, JobIcon } from './SugorokuIcons';

const PathGameBoard = ({ path }: { path: number[] }) => {
  const pathSet = React.useMemo(() => new Set(path), [path]);

  return (
    <div className="space-y-2 rounded-xl border border-[#c9b99b] bg-[#faf4e8] p-3 dark:border-[#3b3226] dark:bg-[#181410]">
      {FLOORS.map((floor) => {
        const squares = GAME_BOARD.filter(
          (square) => square.position >= floor.range[0] && square.position <= floor.range[1],
        );
        const visited = squares.filter((square) => pathSet.has(square.position)).length;
        return (
          <div key={floor.id} className="flex items-center gap-2.5">
            <span
              className="w-14 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[9px] font-black text-white"
              style={{ backgroundColor: floor.themeColor }}
            >
              {floor.floorCode}
            </span>
            <span className="hidden w-44 shrink-0 truncate text-[10px] font-black text-[#5c5141] sm:inline dark:text-[#cfc2ad]">
              {floor.title.split('（')[0]}
            </span>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {squares.map((square) => {
                const isVisited = pathSet.has(square.position);
                const isGoal = square.type === 'goal';
                const isSalary = square.type === 'salary';
                return (
                  <span
                    key={square.position}
                    className={`h-3.5 w-3.5 rounded-xs border transition-all ${
                      isGoal && isVisited
                        ? 'border-[#12100d] bg-[#f5ca5c] ring-2 ring-[#b57c1e]'
                        : isSalary && isVisited
                          ? 'border-[#12100d] bg-[#eab308]'
                          : isVisited
                            ? 'border-[#12100d] bg-[#1f6f5c]'
                            : 'border-[#c9b99b] bg-[#e6dac6] dark:border-[#3b3226] dark:bg-[#2a241c]'
                    }`}
                    title={`#${square.position}: ${square.title}`}
                  />
                );
              })}
            </div>
            <span className="w-10 shrink-0 text-right font-mono text-[10px] font-bold text-[#6e6250]">
              {visited}/{squares.length}
            </span>
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

  const {
    playerName,
    job,
    turn,
    yaruki,
    ending,
    newlyUnlockedAchievements,
    unlockedAchievements,
    path,
  } = gameState;
  const career = gameState.career ?? 0;
  const assets = gameState.assets ?? [];
  const rankInfo = RANKS[gameState.rank ?? 0] ?? RANKS[0];
  const uniqueVisited = new Set(path).size;
  const netWorth = calculateNetWorthBreakdown(gameState);
  const computed = calculateScoreAndGrade(gameState);
  const finalScore = gameState.score || computed.score;
  const finalGrade = gameState.grade || computed.grade;

  const getEndingMeta = () => {
    const endingKey = (ending || 'average') as keyof typeof ENDINGS;
    const endingInfo = ENDINGS[endingKey] || {
      title: 'キャリア完走',
      description: '波乱万丈の社畜ライフロードを走り抜いた。',
    };

    const gradeConfig: Record<
      string,
      { headerBg: string; stamp: string; stampVariant: 'gold' | 'teal' | 'red'; subtitle: string }
    > = {
      S: {
        headerBg: 'bg-gradient-to-r from-[#8f2416] via-[#b23a2a] to-[#781b10] text-[#fffaf0]',
        stamp: '特優',
        stampVariant: 'gold',
        subtitle: '最高評価・殿堂入りライフ＆キャリア達成！',
      },
      A: {
        headerBg: 'bg-gradient-to-r from-[#1f6f5c] to-[#13473b] text-[#fffaf0]',
        stamp: '優良',
        stampVariant: 'teal',
        subtitle: '模範的かつ輝かしい資産＆キャリア成果！',
      },
      B: {
        headerBg: 'bg-gradient-to-r from-[#1d5e96] to-[#123d63] text-[#fffaf0]',
        stamp: '承認',
        stampVariant: 'teal',
        subtitle: '激動の職場を生き抜いた堅実ライフキャリア！',
      },
      C: {
        headerBg: 'bg-gradient-to-r from-[#5c5141] to-[#3d352a] text-[#fffaf0]',
        stamp: '決裁',
        stampVariant: 'gold',
        subtitle: '無事に大決済を迎えた等身大の記録',
      },
      D: {
        headerBg: 'bg-gradient-to-r from-[#3b231e] to-[#211310] text-[#f5d8d0]',
        stamp: '休養',
        stampVariant: 'red',
        subtitle: 'まずは有給を取って心身をいたわりましょう',
      },
    };

    const cfg = gradeConfig[finalGrade] ?? gradeConfig.B;
    return {
      title: endingInfo.title,
      description: endingInfo.description,
      ...cfg,
    };
  };

  const endingMeta = getEndingMeta();

  const handleDownloadImage = async () => {
    if (!resultCardRef.current) return;
    audioManager.playSe('click');
    setIsSaving(true);
    setSaveError('');
    try {
      const canvas = await html2canvas(resultCardRef.current, {
        useCORS: true,
        backgroundColor: '#f4ece0',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `shachiku-life-road-result-${Date.now()}.png`;
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
    `社畜ライフロードで称号「${endingMeta.title}」(総合ランク ${finalGrade} / 最終生涯総資産 ${netWorth.totalNetWorth}万円)を獲得！\n${playerName}（${job}・${rankInfo.name}） ${turn}ターン / 資産${assets.length}件 / 評価${career}pt`,
  )}&url=${encodeURIComponent('https://zatsudan-gacha.app/shachiku-sugoroku')}`;

  return (
    <div className="mx-auto max-w-3xl py-2 sm:py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-xs font-black tracking-wider text-[#5c5141] dark:text-[#cfc2ad]">
          SHACHIKU LIFE SETTLEMENT CERTIFICATE / 社畜ライフ決算書・ランク認定証
        </span>
        <AudioToggle variant="compact" />
      </div>

      <div
        ref={resultCardRef}
        className="overflow-hidden rounded-2xl border-2 border-[#261e14] bg-[#f4ece0] shadow-[0_12px_0_#1a140d,0_20px_45px_rgba(0,0,0,0.35)] dark:border-[#6e5a3e] dark:bg-[#1e1913]"
      >
        {/* 認定証ヘッダー */}
        <div className={`relative border-b-2 border-[#261e14] px-6 py-7 ${endingMeta.headerBg}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black tracking-[0.3em] uppercase opacity-80">
                FINAL LIFE & CAREER CERTIFICATE / 社畜ライフ決算書・ランク認定証
              </p>
              <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-lg border border-white/30 bg-black/25 px-3 py-1 text-xs font-black">
                <span>総合認定 RANK {finalGrade}</span>
                <span className="opacity-50">|</span>
                <span className="font-mono text-[#f5ca5c]">SCORE {finalScore.toLocaleString()} pt</span>
                <span className="opacity-50">|</span>
                <span>最終役職：{rankInfo.name}</span>
              </div>
              <h1 className="font-editorial mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                {endingMeta.title}
              </h1>
              <p className="mt-1 text-sm font-bold opacity-90">{endingMeta.subtitle}</p>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 border-white/40 bg-black/30 text-center shadow-inner">
                <span className="font-mono text-[9px] font-bold opacity-75">GRADE</span>
                <span className="font-editorial text-4xl font-black leading-none text-[#f5ca5c]">
                  {finalGrade}
                </span>
              </div>
              <HankoStamp
                text={endingMeta.stamp}
                variant={endingMeta.stampVariant}
                className="bg-[#fffaf0] shadow-lg"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          {/* 最終生涯総資産（Total Life Net Worth）大決済サマリー */}
          <div className="overflow-hidden rounded-2xl border-2 border-[#261e14] bg-gradient-to-br from-[#1e1a15] to-[#12100d] p-5 text-[#fffaf0] shadow-md">
            <div className="flex flex-col justify-between gap-3 border-b border-white/15 pb-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[10px] font-black tracking-widest text-[#f5ca5c]">
                  TOTAL LIFE NET WORTH / 最終生涯総資産（大決済確定額）
                </p>
                <p className="mt-1 text-xs font-bold text-white/75">
                  所持金 ＋ 保有ライフ資産評価額 ＋ キャリア退職金 ＋ メンタルボーナス
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-3xl font-black tracking-tight text-[#fde073] sm:text-4xl">
                  {netWorth.totalNetWorth.toLocaleString()}
                </span>
                <span className="ml-1 text-base font-black text-[#fffaf0]">万円</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] font-bold text-white/70">1. 所持金キャッシュ</p>
                <p className="mt-1 font-mono text-lg font-black text-[#7adbc2]">
                  {netWorth.cash.toLocaleString()}万円
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] font-bold text-white/70">2. 資産ポートフォリオ</p>
                <p className="mt-1 font-mono text-lg font-black text-[#fde073]">
                  +{netWorth.assetValue.toLocaleString()}万円
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] font-bold text-white/70">3. キャリア退職金</p>
                <p className="mt-1 font-mono text-lg font-black text-[#93c5fd]">
                  +{netWorth.retirementBonus.toLocaleString()}万円
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] font-bold text-white/70">4. メンタルボーナス</p>
                <p className="mt-1 font-mono text-lg font-black text-[#f9a8d4]">
                  +{netWorth.mentalBonus.toLocaleString()}万円
                </p>
              </div>
            </div>
          </div>

          {/* プレイヤー総評 */}
          <div className="flex flex-col items-start gap-4 rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-4 sm:flex-row sm:items-center dark:border-[#594b38] dark:bg-[#262019]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[#12100d] bg-[#12100d] text-[#f5ca5c]">
              <JobIcon job={job} size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="font-editorial text-xl font-black text-[#12100d] dark:text-[#fffaf0]">
                  {playerName}
                </h2>
                <span className="rounded bg-[#12100d] px-2 py-0.5 text-xs font-black text-[#f5ca5c]">
                  {job} / {rankInfo.name}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-bold leading-relaxed text-[#5c5141] dark:text-[#cfc2ad]">
                {endingMeta.description}
              </p>
            </div>
          </div>

          {/* 保有ライフ資産ポートフォリオ一覧 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider text-[#12100d] dark:text-[#fffaf0]">
                獲得したライフ資産ポートフォリオ（全 {assets.length} 件 / 評価額合計 {netWorth.assetValue}万円）
              </h3>
            </div>
            {assets.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 rounded-xl border-2 border-[#b57c1e] bg-[#fffdf5] p-3 text-[#12100d]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#12100d] text-[#f5ca5c]">
                      <AssetIcon assetId={asset.id} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-xs font-black">{asset.name}</p>
                        <span className="font-mono text-xs font-black text-[#1f6f5c]">
                          +{asset.value}万円
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-[#6e6250]">
                        {asset.category}（給料日配当 +{asset.dividend}万）
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[#c9b99b] bg-[#fffaf0]/60 p-3 text-center text-xs font-bold text-[#6e6250] dark:bg-[#262019]">
                保有ライフ資産なし（現金と退職金のみで決済）
              </p>
            )}
          </div>

          {/* 主要スタッツ6項目 */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: '総ターン数', value: `${turn}T`, sub: 'スピード', color: 'text-[#12100d] dark:text-[#fffaf0]' },
              { label: '最終やる気', value: `${yaruki}`, sub: '/ 100', color: 'text-[#1f6f5c] dark:text-[#7adbc2]' },
              { label: '社内評価', value: `${career}pt`, sub: rankInfo.name, color: 'text-[#b57c1e] dark:text-[#f5ca5c]' },
              { label: '保有資産数', value: `${assets.length}件`, sub: `+${netWorth.assetValue}万`, color: 'text-[#1d5e96] dark:text-[#82bef5]' },
              {
                label: '働き方内訳',
                value: `${gameState.teijiCount ?? 0}:${gameState.zangyoCount ?? 0}`,
                sub: '定時 : 残業',
                color: 'text-[#6b4696] dark:text-[#c9a9f0]',
              },
              {
                label: '踏破マス数',
                value: `${uniqueVisited}/${BOARD_SIZE + 1}`,
                sub: 'ライフロード軌跡',
                color: 'text-[#9e2f20] dark:text-[#f29b8f]',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[#c9b99b] bg-[#fffaf0] p-3 text-center dark:border-[#3b3226] dark:bg-[#262019]"
              >
                <p className="text-[10px] font-black text-[#6e6250] dark:text-[#b5a790]">
                  {stat.label}
                </p>
                <p className={`mt-1 font-mono text-xl font-black tabular-nums ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[9px] font-bold text-[#8a7d69]">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* 獲得実績バッジ */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider text-[#12100d] dark:text-[#fffaf0]">
                実績コレクション（通算 {unlockedAchievements.length} / {Object.keys(ACHIEVEMENT_LIST).length} 解除）
              </h3>
              {newlyUnlockedAchievements.length > 0 && (
                <span className="rounded bg-[#b23a2a] px-2 py-0.5 text-[10px] font-black text-white">
                  今回 +{newlyUnlockedAchievements.length} 件新規達成！
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(ACHIEVEMENT_LIST).map(([id, info]) => {
                const isNew = newlyUnlockedAchievements.includes(id);
                const isUnlocked = unlockedAchievements.includes(id);
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                      isNew
                        ? 'border-[#b57c1e] bg-[#fff3cf] text-[#12100d] dark:bg-[#3b2d10] dark:text-[#fffaf0]'
                        : isUnlocked
                          ? 'border-[#1f6f5c] bg-[#e6f5f0] text-[#12100d] dark:bg-[#16332c] dark:text-[#fffaf0]'
                          : 'border-[#d4c4a8] bg-[#ece2d0]/60 text-[#8a7d69] opacity-65 dark:border-[#3b3226] dark:bg-[#181410]'
                    }`}
                  >
                    <div>
                      <p className="font-black">
                        {info.name}
                        {isNew && (
                          <span className="ml-1.5 rounded bg-[#b23a2a] px-1.5 py-0.5 text-[9px] text-white">
                            NEW
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] font-bold opacity-80">{info.description}</p>
                    </div>
                    <span className="font-mono text-[10px] font-black">
                      {isUnlocked ? '達成済' : '未達成'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ライフロード踏破ルート */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider text-[#12100d] dark:text-[#fffaf0]">
                社畜ライフロード 5大エリア踏破軌跡
              </h3>
              <span className="font-mono text-[11px] font-bold text-[#6e6250]">
                到達マス {uniqueVisited} / {BOARD_SIZE + 1}
              </span>
            </div>
            <PathGameBoard path={path} />
          </div>

          {/* 決断イベント履歴 */}
          {gameState.decisionHistory && gameState.decisionHistory.length > 0 && (
            <div className="rounded-xl border border-[#c9b99b] bg-[#fffaf0] p-4 dark:border-[#3b3226] dark:bg-[#262019]">
              <h3 className="mb-2 text-xs font-black tracking-wider text-[#12100d] dark:text-[#fffaf0]">
                キャリア分岐ジャンクション・重要決裁の記録
              </h3>
              <ul className="space-y-1.5">
                {gameState.decisionHistory.map((decision, index) => (
                  <li
                    key={`${decision.title}-${index}`}
                    className="flex items-center justify-between gap-2 border-b border-[#e6dac6] pb-1.5 text-xs font-bold last:border-b-0 last:pb-0 dark:border-[#3b3226]"
                  >
                    <span className="text-[#5c5141] dark:text-[#cfc2ad]">
                      {decision.title} → <strong className="text-[#12100d] dark:text-[#fffaf0]">{decision.choice}</strong>
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black ${
                        decision.success
                          ? 'bg-[#1f6f5c]/15 text-[#1f6f5c] dark:text-[#84dfb0]'
                          : 'bg-[#b23a2a]/15 text-[#b23a2a] dark:text-[#f59385]'
                      }`}
                    >
                      {decision.success ? '決裁成功' : '裏目'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* アクションボタン群 */}
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            audioManager.playSe('click');
            onRestart();
          }}
          className="min-h-[48px] rounded-xl border-2 border-[#12100d] border-b-[5px] bg-[#b23a2a] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#992f20]"
        >
          別の職業・ルートでもう一度挑戦する
        </button>
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={isSaving}
          className="min-h-[48px] rounded-xl border-2 border-[#12100d] border-b-[5px] bg-[#1f6f5c] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#175445] disabled:opacity-50"
        >
          {isSaving ? '決算書を出力中…' : 'ライフ決算書を画像保存'}
        </button>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-[#12100d] border-b-[5px] bg-[#fffaf0] px-6 py-3 text-sm font-black text-[#12100d] shadow-sm transition hover:bg-[#e6dac6]"
        >
          X（旧Twitter）で結果を共有
        </a>
      </div>
      {saveError && (
        <p className="mt-3 text-center text-xs font-black text-[#b23a2a]" role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
};
