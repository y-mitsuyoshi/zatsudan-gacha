"use client";

import { useEffect, useRef, useState, type RefObject } from 'react';
import { ISHIN_PROMPTS, type IshinPrompt } from './ishinDenshinData';

type Phase = 'setup' | 'handoff' | 'select' | 'reveal' | 'final';
type RoundCount = 3 | 5;
type Player = { id: number; name: string };
type RoundPrompt = { id: number; prompt: string; options: string[] };
type RoundResult = {
  prompt: RoundPrompt;
  answers: number[];
  counts: number[];
  scores: number[];
  allMatched: boolean;
};
type Standing = {
  player: Player;
  roundScore: number;
  total: number;
  rank: number;
};
type StartConfig = {
  names?: readonly string[];
  playerCount?: number;
  roundCount?: RoundCount;
};

const MAX_PLAYERS = 8;
const MAX_NAME_LENGTH = 16;
const ALL_MATCH_BONUS = 3;
const PLAYER_COUNTS = [3, 4, 5, 6, 7, 8] as const;
const ROUND_COUNTS = [3, 5] as const;

function defaultName(index: number): string {
  return `プレイヤー${index + 1}`;
}

function resolvePlayerName(rawName: string | undefined, index: number): string {
  const trimmed = (rawName ?? '').trim().slice(0, MAX_NAME_LENGTH);
  return trimmed || defaultName(index);
}

function padNumber(value: number): string {
  return String(value).padStart(2, '0');
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }
  return result;
}

function buildRoundPrompts(roundCount: RoundCount): RoundPrompt[] {
  return shuffle(ISHIN_PROMPTS)
    .slice(0, roundCount)
    .map((item: IshinPrompt) => ({
      id: item.id,
      prompt: item.prompt,
      options: shuffle(item.options),
    }));
}

function computeStandings(players: Player[], results: RoundResult[]): Standing[] {
  const latestResult = results[results.length - 1];
  const rows = players.map((player, index) => ({
    player,
    roundScore: latestResult?.scores[index] ?? 0,
    total: results.reduce((sum, result) => sum + (result.scores[index] ?? 0), 0),
  }));

  rows.sort((left, right) => right.total - left.total || left.player.id - right.player.id);

  let previousTotal: number | null = null;
  let currentRank = 0;

  return rows.map((row, index) => {
    if (row.total !== previousTotal) {
      currentRank = index + 1;
      previousTotal = row.total;
    }
    return { ...row, rank: currentRank };
  });
}

function computeSyncRate(results: RoundResult[], playerCount: number): number {
  if (results.length === 0 || playerCount === 0) {
    return 0;
  }

  const total = results.reduce((sum, result) => {
    const maxCount = Math.max(...result.counts);
    return sum + maxCount / playerCount;
  }, 0);

  return Math.round((total / results.length) * 100);
}

function getSyncComment(rate: number): { title: string; text: string } {
  if (rate >= 100) {
    return {
      title: '完全以心伝心',
      text: '全ラウンドでチームがひとつに。もはや説明は要りません。このまま無言で仕事が進みそうです。',
    };
  }
  if (rate >= 80) {
    return {
      title: '阿吽の呼吸',
      text: 'かなり息が合っています。新しいチームでも、安心して任せられる連携力です。',
    };
  }
  if (rate >= 60) {
    return {
      title: '息ぴったり',
      text: 'チームの共通言語ができつつあります。あと少しで、無言の連携も狙えそうです。',
    };
  }
  if (rate >= 40) {
    return {
      title: 'まずまずの連携',
      text: '意見は分かれるけれど、チームの輪郭は見えています。違いを話すと、もっと近づけそう。',
    };
  }
  return {
    title: '多様性マシマシ',
    text: '個性がはっきりしたチーム。まずは違いを楽しむのが一番です。次のラウンドに期待。',
  };
}

export function IshinDenshinGame() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [playerCount, setPlayerCount] = useState(5);
  const [roundCount, setRoundCount] = useState<RoundCount>(3);
  const [names, setNames] = useState<string[]>(() => Array.from({ length: MAX_PLAYERS }, () => ''));
  const [players, setPlayers] = useState<Player[]>([]);
  const [roundPrompts, setRoundPrompts] = useState<RoundPrompt[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [pendingOption, setPendingOption] = useState<number | null>(null);
  const [roundAnswers, setRoundAnswers] = useState<number[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [setupError, setSetupError] = useState('');
  const [liveMessage, setLiveMessage] = useState(
    'ゲーム設定です。人数とラウンド、プレイヤー名を決めてゲームを始めてください。',
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const setupHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasLeftSetupRef = useRef(false);

  useEffect(() => {
    if (phase === 'setup') {
      if (hasLeftSetupRef.current) {
        setupHeadingRef.current?.focus();
      }
      return;
    }
    hasLeftSetupRef.current = true;
    headingRef.current?.focus();
  }, [phase, roundIndex, currentPlayerIndex]);

  function startGame(config?: StartConfig) {
    const nextPlayerCount = config?.playerCount ?? playerCount;
    const nextRoundCount = config?.roundCount ?? roundCount;
    const nameSource = config?.names ?? names;

    const nextPlayers = Array.from({ length: nextPlayerCount }, (_, index) => ({
      id: index + 1,
      name: resolvePlayerName(nameSource[index], index),
    }));

    setPlayerCount(nextPlayerCount);
    setRoundCount(nextRoundCount);
    setSetupError('');
    setPlayers(nextPlayers);
    setRoundPrompts(buildRoundPrompts(nextRoundCount));
    setRoundIndex(0);
    setCurrentPlayerIndex(0);
    setPendingOption(null);
    setRoundAnswers(Array.from({ length: nextPlayerCount }, () => -1));
    setResults([]);
    setPhase('handoff');
    setLiveMessage(
      `${nextRoundCount}ラウンドのゲームを開始します。${nextPlayers[0].name}さんから回答してください。`,
    );
  }

  function handleStartGame() {
    const activeNames = Array.from({ length: playerCount }, (_, index) =>
      resolvePlayerName(names[index], index),
    );

    if (new Set(activeNames).size !== activeNames.length) {
      setSetupError('同じ名前のプレイヤーがいます。区別できる名前にしてください。');
      return;
    }

    setSetupError('');
    startGame({ names: activeNames, playerCount, roundCount });
  }

  function handlePlayerCountChange(count: number) {
    setPlayerCount(count);
    setSetupError('');
  }

  function handleRoundCountChange(count: RoundCount) {
    setRoundCount(count);
    setSetupError('');
  }

  function handleNameChange(index: number, value: string) {
    setNames((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
    setSetupError('');
  }

  function handleBeginAnswer() {
    setPendingOption(null);
    setPhase('select');
  }

  function finalizeRound(answers: number[]) {
    const currentPrompt = roundPrompts[roundIndex];
    if (!currentPrompt) {
      return;
    }

    const counts = currentPrompt.options.map(
      (_, optionIndex) => answers.filter((answer) => answer === optionIndex).length,
    );
    const allMatched = counts.some((count) => count === players.length);
    const bonus = allMatched ? ALL_MATCH_BONUS : 0;
    const scores = answers.map((answer) => (counts[answer] ?? 0) + bonus);
    const result: RoundResult = {
      prompt: currentPrompt,
      answers,
      counts,
      scores,
      allMatched,
    };
    const nextResults = [...results, result];
    const standings = computeStandings(players, nextResults);
    const topTotal = standings[0]?.total ?? 0;
    const topNames = standings
      .filter((row) => row.total === topTotal)
      .map((row) => row.player.name)
      .join('、');

    setResults(nextResults);
    setPhase('reveal');

    const countText = currentPrompt.options
      .map((option, index) => `${option}が${counts[index]}人`)
      .join('、');
    setLiveMessage(
      `ラウンド${roundIndex + 1}の結果。${countText}。${
        allMatched ? '全員一致ボーナスで各3点追加。' : ''
      }現在の1位は${topNames}さん、${topTotal}ポイントです。`,
    );
  }

  function handleConfirmAnswer() {
    if (pendingOption === null) {
      return;
    }

    const nextAnswers = [...roundAnswers];
    nextAnswers[currentPlayerIndex] = pendingOption;
    setRoundAnswers(nextAnswers);
    setPendingOption(null);

    const nextPlayerIndex = currentPlayerIndex + 1;
    if (nextPlayerIndex < players.length) {
      const nextPlayer = players[nextPlayerIndex];
      setCurrentPlayerIndex(nextPlayerIndex);
      setPhase('handoff');
      setLiveMessage(`回答を記録しました。${nextPlayer.name}さんに端末を渡してください。`);
      return;
    }

    finalizeRound(nextAnswers);
  }

  function handleNextRound() {
    const nextRoundIndex = roundIndex + 1;

    if (nextRoundIndex >= roundPrompts.length) {
      const syncRate = computeSyncRate(results, players.length);
      const standings = computeStandings(players, results);
      const comment = getSyncComment(syncRate);
      const topTotal = standings[0]?.total ?? 0;
      const topNames = standings
        .filter((row) => row.total === topTotal)
        .map((row) => row.player.name)
        .join('、');

      setPhase('final');
      setLiveMessage(
        `ゲーム終了。以心伝心度は${syncRate}パーセント、${comment.title}。1位は${topNames}さん、${topTotal}ポイントです。`,
      );
      return;
    }

    setRoundIndex(nextRoundIndex);
    setCurrentPlayerIndex(0);
    setPendingOption(null);
    setRoundAnswers(Array.from({ length: players.length }, () => -1));
    setPhase('handoff');
    setLiveMessage(`ラウンド${nextRoundIndex + 1}を開始します。${players[0].name}さんから回答してください。`);
  }

  function handleRestartSameMembers() {
    startGame({
      names: players.map((player) => player.name),
      playerCount: players.length,
      roundCount,
    });
  }

  function handleBackToSetup() {
    setNames(Array.from({ length: MAX_PLAYERS }, (_, index) => players[index]?.name ?? ''));
    setPlayerCount(players.length);
    setPendingOption(null);
    setRoundAnswers([]);
    setRoundPrompts([]);
    setResults([]);
    setRoundIndex(0);
    setCurrentPlayerIndex(0);
    setSetupError('');
    setPhase('setup');
    setLiveMessage('設定画面に戻りました。人数とラウンドを選んでください。');
  }

  const currentPrompt = roundPrompts[roundIndex];
  const currentPlayer = players[currentPlayerIndex];
  const latestResult = results[results.length - 1];

  return (
    <div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      {phase === 'setup' && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <form
            className="paper-panel p-5 sm:p-7"
            onSubmit={(event) => {
              event.preventDefault();
              handleStartGame();
            }}
          >
            <p className="paper-kicker">Game Setup</p>
            <h2
              ref={setupHeadingRef}
              tabIndex={-1}
              className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl"
            >
              メンバーとラウンドを決める
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
              1台の端末を回して、4つの選択肢から直感で1つずつ回答。チームの答えがどれだけ揃うか試します。
            </p>

            <div className="mt-6 space-y-6">
              <fieldset>
                <legend className="flex w-full items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <span className="flex items-baseline gap-3 text-sm font-black">
                    <span className="font-label text-[10px] text-[var(--accent)]">01</span>
                    プレイヤー人数
                  </span>
                  <span className="font-label text-[9px] text-[var(--ink-soft)]">3 — 8</span>
                </legend>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {PLAYER_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={playerCount === count}
                      onClick={() => handlePlayerCountChange(count)}
                      className="paper-chip min-h-11 px-2 py-2 text-sm font-bold"
                    >
                      {count}人
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="flex w-full items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <span className="flex items-baseline gap-3 text-sm font-black">
                    <span className="font-label text-[10px] text-[var(--accent)]">02</span>
                    ラウンド数
                  </span>
                  <span className="font-label text-[9px] text-[var(--ink-soft)]">Select one</span>
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {ROUND_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={roundCount === count}
                      onClick={() => handleRoundCountChange(count)}
                      className="paper-chip flex min-h-[58px] flex-col items-start justify-between px-3 py-2 text-left"
                    >
                      <span className="font-label text-[9px] opacity-60">
                        {count === 3 ? 'QUICK' : 'FULL'}
                      </span>
                      <span className="text-sm font-bold">{count}ラウンド</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="flex w-full items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <span className="flex items-baseline gap-3 text-sm font-black">
                    <span className="font-label text-[10px] text-[var(--accent)]">03</span>
                    プレイヤー名
                  </span>
                  <span className="font-label text-[9px] text-[var(--ink-soft)]">Optional</span>
                </legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: playerCount }, (_, index) => (
                    <label key={index} className="block min-w-0">
                      <span className="mb-1 flex items-center gap-2 font-label text-[9px] text-[var(--ink-soft)]">
                        <span className="flex h-5 w-5 items-center justify-center border border-[var(--line)] bg-[var(--paper-muted)] text-[8px] text-[var(--accent)]">
                          {padNumber(index + 1)}
                        </span>
                        PLAYER {index + 1}
                      </span>
                      <input
                        type="text"
                        value={names[index] ?? ''}
                        onChange={(event) => handleNameChange(index, event.target.value)}
                        placeholder={defaultName(index)}
                        maxLength={MAX_NAME_LENGTH}
                        autoComplete="off"
                        className="field-paper min-h-11 px-3 py-2.5 text-sm"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
                  空欄のままでもプレイヤー番号で遊べます。名前は端末内の状態としてのみ使用します。
                </p>
              </fieldset>

              {setupError && (
                <p
                  role="alert"
                  className="border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-bold leading-6"
                >
                  {setupError}
                </p>
              )}

              <button
                type="submit"
                className="paper-button-primary w-full px-5 py-4 text-base"
              >
                ゲームを始める
                <span className="font-label text-[9px] opacity-80">Start</span>
              </button>
            </div>
          </form>

          <aside className="space-y-3">
            <section className="paper-panel-flat p-5">
              <p className="paper-kicker">Scoring</p>
              <h3 className="font-editorial mt-1 text-xl">以心伝心の採点ルール</h3>
              <ol className="mt-3 space-y-3">
                {[
                  ['01', 'お題を見て、4つの選択肢から直感で1つ選ぶ。'],
                  ['02', '同じ答えを選んだ人数が、そのまま自分の得点に。'],
                  ['03', '全員の答えが一致したら、全員に +3 ボーナス。'],
                  ['04', '全ラウンド終了時の累計ポイントで順位が決定。'],
                ].map(([number, text]) => (
                  <li key={number} className="flex gap-3 text-xs leading-6">
                    <span className="font-label shrink-0 text-[9px] text-[var(--accent)]">{number}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 border border-[var(--gold)] bg-[var(--paper-muted)] p-3">
                <p className="text-xs font-black text-[var(--teal)]">全員一致は +3</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                  たとえば5人中3人が同じ答えなら、その3人に3点。5人全員一致なら、5点＋3点で全員8点です。
                </p>
              </div>
            </section>

            <section className="paper-panel-flat p-5">
              <p className="paper-kicker">Privacy</p>
              <h3 className="font-editorial mt-1 text-xl">秘密投票で安心</h3>
              <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                回答と名前はネットワークに送信せず、localStorageにも保存しません。
                1人が選び終えると選択画面を閉じ、次の人へ渡す前に回答をリセットします。
              </p>
            </section>
          </aside>
        </div>
      )}

      {phase === 'handoff' && currentPlayer && (
        <section className="paper-panel p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
            <p className="paper-kicker">
              Round {padNumber(roundIndex + 1)} / {roundCount}
            </p>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              回答者 {currentPlayerIndex + 1} / {players.length}
            </span>
          </div>

          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-editorial mt-5 break-words text-2xl leading-tight outline-none sm:text-3xl"
          >
            {currentPlayer.name} さんに端末を渡してください
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            前の人の回答は表示されません。選択が終わったら、端末を次の人へ渡しましょう。
          </p>

          <div className="mt-5 flex items-center gap-4 border-l-2 border-[var(--gold)] bg-[var(--paper-muted)] px-4 py-4">
            <span className="font-editorial flex h-14 w-14 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-strong)] text-2xl text-[var(--accent)]">
              {padNumber(currentPlayer.id)}
            </span>
            <div className="min-w-0">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                Player {padNumber(currentPlayer.id)}
              </p>
              <p className="break-words text-lg font-black">{currentPlayer.name}</p>
            </div>
          </div>

          <p className="mt-4 font-label text-[9px] text-[var(--ink-soft)]">
            Secret ballot / 回答は隠されます
          </p>
          <button
            type="button"
            onClick={handleBeginAnswer}
            className="paper-button-primary mt-4 w-full px-5 py-4 text-base"
          >
            回答画面を開く
          </button>
        </section>
      )}

      {phase === 'select' && currentPrompt && currentPlayer && (
        <section className="paper-panel p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
            <p className="paper-kicker">
              Round {padNumber(roundIndex + 1)} / {roundCount}
            </p>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">
              回答者 {currentPlayerIndex + 1} / {players.length}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3 border-l-2 border-[var(--teal)] pl-3">
            <span className="font-editorial flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] text-sm text-[var(--accent)]">
              {padNumber(currentPlayer.id)}
            </span>
            <div className="min-w-0">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">Answering now</p>
              <p className="break-words text-sm font-black">{currentPlayer.name}</p>
            </div>
          </div>

          <p className="paper-kicker mt-6">Question {padNumber(roundIndex + 1)}</p>
          <h2
            id="ishin-prompt-heading"
            ref={headingRef}
            tabIndex={-1}
            className="font-editorial mt-2 break-words text-2xl leading-tight outline-none sm:text-3xl"
          >
            {currentPrompt.prompt}
          </h2>
          <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
            直感で1つ。正解はありません。
          </p>

          <div
            role="radiogroup"
            aria-labelledby="ishin-prompt-heading"
            className="mt-5 grid grid-cols-2 gap-2"
          >
            {currentPrompt.options.map((option, index) => {
              const checked = pendingOption === index;
              return (
                <label
                  key={`${currentPrompt.id}-${option}`}
                  className={`flex min-h-[76px] cursor-pointer flex-col justify-between border p-3 text-left transition-colors focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--paper-strong)] ${
                    checked
                      ? 'border-[var(--ink)] bg-[var(--accent)] text-[#fffaf0] shadow-[2px_2px_0_var(--ink)] dark:text-[#12100d]'
                      : 'border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--line-strong)]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`ishin-answer-${currentPrompt.id}`}
                    value={index}
                    checked={checked}
                    onChange={() => setPendingOption(index)}
                    className="sr-only"
                  />
                  <span className="font-label text-[9px] opacity-60">{padNumber(index + 1)}</span>
                  <span className="mt-1 block break-words text-sm font-bold leading-5">{option}</span>
                </label>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleConfirmAnswer}
            disabled={pendingOption === null}
            className="paper-button-primary mt-5 w-full px-5 py-4 text-base"
          >
            この選択で決定
          </button>
          <p className="mt-2 text-center text-[11px] leading-5 text-[var(--ink-soft)]">
            決定すると選択内容は隠れ、次の人へ端末を渡す画面になります。
          </p>
        </section>
      )}

      {phase === 'reveal' && latestResult && (
        <div className="space-y-4">
          <section className="paper-panel p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
              <p className="paper-kicker">
                Round {padNumber(results.length)} / {roundCount}
              </p>
              <span className="font-label text-[9px] text-[var(--accent)]">Reveal</span>
            </div>

            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-editorial mt-4 break-words text-2xl leading-tight outline-none sm:text-3xl"
            >
              {latestResult.prompt.prompt}
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
              みんなの直感は、どこに集まった？
            </p>

            <div className="mt-5 space-y-2">
              {latestResult.prompt.options.map((option, index) => {
                const count = latestResult.counts[index];
                const percent = players.length === 0 ? 0 : Math.round((count / players.length) * 100);
                const topCount = Math.max(...latestResult.counts);
                const isTop = count === topCount && count > 0;

                return (
                  <div
                    key={option}
                    className={`border p-3 ${
                      isTop
                        ? 'border-[var(--gold)] bg-[var(--paper-muted)]'
                        : 'border-[var(--line)] bg-[var(--paper-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-label shrink-0 text-[9px] text-[var(--ink-soft)]">
                          {padNumber(index + 1)}
                        </span>
                        <span className="break-words text-sm font-bold">{option}</span>
                        {isTop && (
                          <span className="font-label shrink-0 border border-[var(--gold)] px-1.5 py-0.5 text-[8px] text-[var(--teal)]">
                            Top
                          </span>
                        )}
                      </div>
                      <span className="font-editorial shrink-0 text-xl">
                        {count}
                        <span className="font-label ml-0.5 text-[8px]">人</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-[var(--paper-muted)]" aria-hidden="true">
                      <div className="h-full bg-[var(--teal)]" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {latestResult.allMatched && (
              <p className="mt-4 border border-[var(--gold)] bg-[var(--paper-muted)] px-3 py-2 text-sm font-black text-[var(--teal)]">
                全員一致。全員に +3 ボーナス。
              </p>
            )}

            <p className="mt-4 text-[11px] leading-5 text-[var(--ink-soft)]">
              得点 = 同じ答えを選んだ人数。全員一致なら全員に +3。
            </p>
          </section>

          <section className="paper-panel-flat p-5 sm:p-6">
            <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-2">
              <h3 className="font-editorial text-xl">ラウンド {results.length} の結果と累計順位</h3>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">今回 / 合計</span>
            </div>

            <ol className="mt-3 divide-y divide-[var(--line)]">
              {computeStandings(players, results).map((row) => (
                <li
                  key={row.player.id}
                  className={`flex items-center gap-3 py-2.5 ${
                    row.rank === 1 ? 'bg-[var(--paper-muted)] px-2' : ''
                  }`}
                >
                  <span className="font-editorial w-6 shrink-0 text-center text-lg text-[var(--accent)]">
                    {row.rank}
                  </span>
                  <span className="font-label flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--line)] bg-[var(--paper-strong)] text-[9px] text-[var(--ink-soft)]">
                    {padNumber(row.player.id)}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-sm font-bold">{row.player.name}</span>
                  <span className="shrink-0 text-right">
                    <span className="font-label block text-[8px] text-[var(--ink-soft)]">
                      今回 +{row.roundScore}
                    </span>
                    <span className="block text-sm font-black">
                      {row.total}
                      <span className="font-label ml-0.5 text-[8px]">pt</span>
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <button
            type="button"
            onClick={handleNextRound}
            className="paper-button-primary w-full px-5 py-4 text-base"
          >
            {results.length < roundCount ? '次のラウンドへ' : '最終結果を見る'}
          </button>
        </div>
      )}

      {phase === 'final' && (
        <FinalResult
          players={players}
          results={results}
          roundCount={roundCount}
          headingRef={headingRef}
          onRestart={handleRestartSameMembers}
          onBackToSetup={handleBackToSetup}
        />
      )}
    </div>
  );
}

function FinalResult({
  players,
  results,
  roundCount,
  headingRef,
  onRestart,
  onBackToSetup,
}: {
  players: Player[];
  results: RoundResult[];
  roundCount: RoundCount;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onRestart: () => void;
  onBackToSetup: () => void;
}) {
  const standings = computeStandings(players, results);
  const syncRate = computeSyncRate(results, players.length);
  const comment = getSyncComment(syncRate);
  const perfectRounds = results.filter((result) => result.allMatched).length;
  const topTotal = standings[0]?.total ?? 0;
  const topNames = standings
    .filter((row) => row.total === topTotal)
    .map((row) => row.player.name)
    .join('、');

  return (
    <div className="space-y-4">
      <section className="paper-panel p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
          <p className="paper-kicker">Final Result / {roundCount} Rounds</p>
          <span className="font-label text-[9px] text-[var(--accent)]">Complete</span>
        </div>

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-editorial mt-4 text-2xl leading-tight outline-none sm:text-3xl"
        >
          以心伝心、できましたか？
        </h2>
        <p className="mt-2 break-words text-sm leading-7 text-[var(--ink-soft)]">
          1位は {topNames} さん。チーム全体の一致度も見てみましょう。
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-[var(--gold)] bg-[var(--paper-muted)] p-4 text-center">
            <p className="font-label text-[9px] text-[var(--ink-soft)]">チーム以心伝心度</p>
            <p className="font-editorial mt-1 text-5xl text-[var(--accent)]">
              {syncRate}
              <span className="ml-1 text-lg">%</span>
            </p>
            <p className="mt-2 text-sm font-black text-[var(--teal)]">{comment.title}</p>
            <p className="mt-1 text-[10px] leading-5 text-[var(--ink-soft)]">
              全員一致 {perfectRounds} / {results.length} ラウンド
            </p>
          </div>

          <div className="border border-[var(--line)] bg-[var(--paper-strong)] p-4">
            <p className="font-label text-[9px] text-[var(--accent)]">Team Comment</p>
            <p className="mt-2 text-sm leading-7">{comment.text}</p>
            <p className="mt-3 border-t border-[var(--line)] pt-3 text-[10px] leading-5 text-[var(--ink-soft)]">
              以心伝心度は、各ラウンドで最多回答を選んだ人の割合を平均したものです。
            </p>
          </div>
        </div>
      </section>

      <section className="paper-panel-flat p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-2">
          <h3 className="font-editorial text-xl">最終順位</h3>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">Ranking</span>
        </div>

        <ol className="mt-3 divide-y divide-[var(--line)]">
          {standings.map((row) => (
            <li
              key={row.player.id}
              className={`flex items-center gap-3 py-3 ${
                row.rank === 1 ? 'bg-[var(--paper-muted)] px-2' : ''
              }`}
            >
              <span className="font-editorial w-6 shrink-0 text-center text-xl text-[var(--accent)]">
                {row.rank}
              </span>
              <span
                className={`font-label flex h-8 w-8 shrink-0 items-center justify-center border text-[9px] ${
                  row.rank === 1
                    ? 'border-[var(--gold)] bg-[var(--paper-strong)] text-[var(--teal)]'
                    : 'border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink-soft)]'
                }`}
              >
                {padNumber(row.player.id)}
              </span>
              <span className="min-w-0 flex-1 break-words text-sm font-bold">{row.player.name}</span>
              <span className="shrink-0 text-right">
                <span className="block text-base font-black">
                  {row.total}
                  <span className="font-label ml-0.5 text-[8px]">pt</span>
                </span>
                <span className="font-label block text-[8px] text-[var(--ink-soft)]">
                  最終R +{row.roundScore}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onRestart} className="paper-button-primary px-5 py-4 text-sm">
          同じメンバーでもう一度
        </button>
        <button type="button" onClick={onBackToSetup} className="paper-button px-5 py-4 text-sm">
          メンバーを変える
        </button>
      </div>
    </div>
  );
}
