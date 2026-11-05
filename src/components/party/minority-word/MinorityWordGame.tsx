'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  PLAYER_COUNTS,
  TIMER_OPTIONS,
  WORD_PAIRS,
  getMinorityCount,
  type TimerMinutes,
} from './minorityWordData';

type Phase = 'setup' | 'handoff' | 'discussion' | 'vote' | 'result';

type HeadingRef = RefObject<HTMLHeadingElement | null>;

type DealtRound = {
  pairId: string;
  majorityWord: string;
  minorityWord: string;
  minorityIndices: number[];
};

type Score = {
  majority: number;
  minority: number;
};

type GameHeaderProps = {
  playerCount: number;
  minorityCount: number;
  roundNumber: number;
  scores: Score;
};

type SetupScreenProps = {
  playerCount: number;
  minorityCount: number;
  timerMinutes: TimerMinutes;
  headingRef: HeadingRef;
  onPlayerCountChange: (count: number) => void;
  onTimerChange: (minutes: TimerMinutes) => void;
  onStart: () => void;
};

type HandoffScreenProps = {
  playerCount: number;
  playerIndex: number;
  isRevealed: boolean;
  word: string;
  headingRef: HeadingRef;
  onReveal: () => void;
  onAdvance: () => void;
};

type DiscussionScreenProps = {
  playerCount: number;
  timerMinutes: TimerMinutes;
  remainingSeconds: number;
  isTimerRunning: boolean;
  headingRef: HeadingRef;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onGoToVote: () => void;
  onFinishEarly: () => void;
};

type VoteScreenProps = {
  playerCount: number;
  selectedVote: number | null;
  headingRef: HeadingRef;
  onSelect: (index: number) => void;
  onConfirm: () => void;
};

type ResultScreenProps = {
  round: DealtRound;
  resultVote: number;
  majorityWon: boolean;
  scores: Score;
  headingRef: HeadingRef;
  onNewRound: () => void;
  onBackToSetup: () => void;
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function dealRound(playerCount: number, previousPairId: string | null): DealtRound {
  const availablePairs = previousPairId
    ? WORD_PAIRS.filter((pair) => pair.id !== previousPairId)
    : [...WORD_PAIRS];
  const selectedPair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
  const [firstWord, secondWord] = selectedPair.words;
  const shouldFlip = Math.random() < 0.5;
  const majorityWord = shouldFlip ? secondWord : firstWord;
  const minorityWord = shouldFlip ? firstWord : secondWord;
  const playerIndices = Array.from({ length: playerCount }, (_, index) => index);
  const minorityIndices = shuffle(playerIndices)
    .slice(0, getMinorityCount(playerCount))
    .sort((left, right) => left - right);

  return {
    pairId: selectedPair.id,
    majorityWord,
    minorityWord,
    minorityIndices,
  };
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function playerLabel(index: number): string {
  return `プレイヤー ${index + 1}`;
}

export function MinorityWordGame() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [playerCount, setPlayerCount] = useState(6);
  const [timerMinutes, setTimerMinutes] = useState<TimerMinutes>(3);
  const [roundNumber, setRoundNumber] = useState(1);
  const [scores, setScores] = useState<Score>({ majority: 0, minority: 0 });
  const [round, setRound] = useState<DealtRound | null>(null);
  const [handoffIndex, setHandoffIndex] = useState(0);
  const [isCardRevealed, setIsCardRevealed] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(3 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [resultVote, setResultVote] = useState<number | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timerDeadlineRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);

  const minorityCount = getMinorityCount(playerCount);
  const showSetup = phase === 'setup' || round === null;
  const currentPlayerWord = round
    ? round.minorityIndices.includes(handoffIndex)
      ? round.minorityWord
      : round.majorityWord
    : '';
  const majorityWon =
    resultVote !== null && round !== null && round.minorityIndices.includes(resultVote);

  useEffect(() => {
    if (phase !== 'discussion' || !isTimerRunning) {
      return;
    }

    const tick = () => {
      const deadline = timerDeadlineRef.current;
      if (deadline === null) {
        return;
      }

      const nextSeconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      setRemainingSeconds(nextSeconds);

      if (nextSeconds === 0) {
        timerDeadlineRef.current = null;
        setIsTimerRunning(false);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);

    return () => window.clearInterval(intervalId);
  }, [phase, isTimerRunning]);

  useEffect(() => {
    if (phase === 'setup' && !hasStartedRef.current) {
      return;
    }
    headingRef.current?.focus();
  }, [phase, handoffIndex, isCardRevealed]);

  const dealNewRound = (nextRoundNumber: number, previousPairId: string | null) => {
    timerDeadlineRef.current = null;
    setRound(dealRound(playerCount, previousPairId));
    setRoundNumber(nextRoundNumber);
    setHandoffIndex(0);
    setIsCardRevealed(false);
    setSelectedVote(null);
    setResultVote(null);
    setRemainingSeconds(timerMinutes * 60);
    setIsTimerRunning(false);
    setPhase('handoff');
  };

  const handleStartGame = () => {
    hasStartedRef.current = true;
    setScores({ majority: 0, minority: 0 });
    dealNewRound(1, null);
    setLiveMessage(
      `${playerCount}人、少数派${minorityCount}人でゲームを開始します。${playerLabel(0)}に端末を渡してください。`,
    );
  };

  const handleNewRound = () => {
    dealNewRound(roundNumber + 1, round?.pairId ?? null);
    setLiveMessage(
      `新しいお題でラウンド${roundNumber + 1}を開始します。${playerLabel(0)}に端末を渡してください。`,
    );
  };

  const handleBackToSetup = () => {
    timerDeadlineRef.current = null;
    setPhase('setup');
    setRound(null);
    setRoundNumber(1);
    setScores({ majority: 0, minority: 0 });
    setHandoffIndex(0);
    setIsCardRevealed(false);
    setSelectedVote(null);
    setResultVote(null);
    setIsTimerRunning(false);
    setRemainingSeconds(timerMinutes * 60);
    setLiveMessage('設定画面に戻りました。人数と議論タイムを選んでゲームを始めてください。');
  };

  const handleRevealCard = () => {
    setIsCardRevealed(true);
    setLiveMessage(
      `あなたの言葉は「${currentPlayerWord}」です。確認したら、次の人へ端末を渡してください。`,
    );
  };

  const handleAdvanceHandoff = () => {
    setIsCardRevealed(false);

    if (handoffIndex >= playerCount - 1) {
      timerDeadlineRef.current = null;
      setRemainingSeconds(timerMinutes * 60);
      setIsTimerRunning(false);
      setLiveMessage('全員の確認が終わりました。議論を始めてください。');
      setPhase('discussion');
      return;
    }

    setHandoffIndex(handoffIndex + 1);
    setLiveMessage(
      `${playerLabel(handoffIndex + 1)}に端末を渡してください。前の人の言葉は表示されません。`,
    );
  };

  const handleTimerToggle = () => {
    if (isTimerRunning) {
      timerDeadlineRef.current = null;
      setIsTimerRunning(false);
      return;
    }

    if (remainingSeconds <= 0) {
      return;
    }

    timerDeadlineRef.current = performance.now() + remainingSeconds * 1000;
    setIsTimerRunning(true);
  };

  const handleTimerReset = () => {
    timerDeadlineRef.current = null;
    setIsTimerRunning(false);
    setRemainingSeconds(timerMinutes * 60);
  };

  const handleGoToVote = () => {
    timerDeadlineRef.current = null;
    setIsTimerRunning(false);
    setIsCardRevealed(false);
    setSelectedVote(null);
    setLiveMessage('議論を終了しました。少数派だと思う人を1人選んで投票してください。');
    setPhase('vote');
  };

  const handleFinishEarly = () => {
    timerDeadlineRef.current = null;
    setIsTimerRunning(false);
    setIsCardRevealed(false);
    setRemainingSeconds(0);
    setSelectedVote(null);
    setLiveMessage('議論を終了しました。少数派だと思う人を1人選んで投票してください。');
    setPhase('vote');
  };

  const handleConfirmVote = () => {
    if (selectedVote === null || round === null) {
      return;
    }

    const majorityWon = round.minorityIndices.includes(selectedVote);
    const minorityNames = round.minorityIndices.map((index) => playerLabel(index)).join('、');
    timerDeadlineRef.current = null;
    setIsTimerRunning(false);
    setIsCardRevealed(false);
    setResultVote(selectedVote);
    setScores((previous) =>
      majorityWon
        ? { ...previous, majority: previous.majority + 1 }
        : { ...previous, minority: previous.minority + 1 },
    );
    setSelectedVote(null);
    setLiveMessage(
      `${playerLabel(selectedVote)}に投票しました。少数派は${minorityNames}でした。${
        majorityWon ? '多数派の勝ちです。' : '少数派の勝ちです。'
      }`,
    );
    setPhase('result');
  };

  return (
    <section className="paper-panel overflow-hidden" aria-label="少数派ワード">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      <GameHeader
        playerCount={playerCount}
        minorityCount={minorityCount}
        roundNumber={roundNumber}
        scores={scores}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {showSetup ? (
          <SetupScreen
            playerCount={playerCount}
            minorityCount={minorityCount}
            timerMinutes={timerMinutes}
            headingRef={headingRef}
            onPlayerCountChange={setPlayerCount}
            onTimerChange={(minutes) => {
              setTimerMinutes(minutes);
              setRemainingSeconds(minutes * 60);
            }}
            onStart={handleStartGame}
          />
        ) : phase === 'handoff' ? (
          <HandoffScreen
            playerCount={playerCount}
            playerIndex={handoffIndex}
            isRevealed={isCardRevealed}
            word={isCardRevealed ? currentPlayerWord : ''}
            headingRef={headingRef}
            onReveal={handleRevealCard}
            onAdvance={handleAdvanceHandoff}
          />
        ) : phase === 'discussion' ? (
          <DiscussionScreen
            playerCount={playerCount}
            timerMinutes={timerMinutes}
            remainingSeconds={remainingSeconds}
            isTimerRunning={isTimerRunning}
            headingRef={headingRef}
            onToggleTimer={handleTimerToggle}
            onResetTimer={handleTimerReset}
            onGoToVote={handleGoToVote}
            onFinishEarly={handleFinishEarly}
          />
        ) : phase === 'vote' ? (
          <VoteScreen
            playerCount={playerCount}
            selectedVote={selectedVote}
            headingRef={headingRef}
            onSelect={setSelectedVote}
            onConfirm={handleConfirmVote}
          />
        ) : resultVote !== null && round !== null ? (
          <ResultScreen
            round={round}
            resultVote={resultVote}
            majorityWon={majorityWon}
            scores={scores}
            headingRef={headingRef}
            onNewRound={handleNewRound}
            onBackToSetup={handleBackToSetup}
          />
        ) : null}
      </div>
    </section>
  );
}

function GameHeader({ playerCount, minorityCount, roundNumber, scores }: GameHeaderProps) {
  return (
    <header className="border-b border-[#3b3328] bg-[#211d18] px-4 py-3 text-[#f2e9d8] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="font-label text-[10px] font-bold text-[#dfb15b]">Minority Word</span>
          <span className="font-label border border-[#5a4b38] px-2 py-1 text-[9px]">
            Round {String(roundNumber).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-bold tracking-wider text-[#b7a992]">
            {playerCount}人 / 少数派{minorityCount}人
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-wider">
          <span className="inline-flex items-center gap-1.5 text-[#b7e0d5]">
            <span className="h-1.5 w-1.5 bg-[#83b8ac]" aria-hidden="true" />
            多数派 {scores.majority}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#eeb4a4]">
            <span className="h-1.5 w-1.5 bg-[#e07054]" aria-hidden="true" />
            少数派 {scores.minority}
          </span>
        </div>
      </div>
    </header>
  );
}

function SetupScreen({
  playerCount,
  minorityCount,
  timerMinutes,
  headingRef,
  onPlayerCountChange,
  onTimerChange,
  onStart,
}: SetupScreenProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
      <div>
        <p className="paper-kicker">Setup / Game Settings</p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-editorial mt-2 text-2xl leading-tight text-balance outline-none sm:text-3xl"
        >
          会話だけで、正体を見抜く。
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
          全員に似た言葉が配られますが、少数派だけは少し違う言葉を受け取ります。自分の言葉を直接言わずに説明し、議論で少数派を探しましょう。
        </p>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
            <h3 className="text-sm font-black">プレイヤー人数</h3>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">4–12 Players</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5" role="group" aria-label="プレイヤー人数">
            {PLAYER_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                aria-pressed={playerCount === count}
                onClick={() => onPlayerCountChange(count)}
                className="paper-chip min-h-[48px] px-2 py-2 text-sm font-bold"
              >
                {count}人
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            {minorityCount === 1
              ? 'この人数では少数派は1人です。'
              : `この人数では少数派は${minorityCount}人です。正体は最後まで伏せられます。`}
          </p>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
            <h3 className="text-sm font-black">議論タイム</h3>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">Discussion Timer</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="議論タイム">
            {TIMER_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={timerMinutes === minutes}
                onClick={() => onTimerChange(minutes)}
                className="paper-chip min-h-[48px] px-2 py-2 text-sm font-bold"
              >
                {minutes}分
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-l-4 border-[var(--gold)] bg-[var(--paper-muted)] px-4 py-3">
          <p className="text-xs font-bold leading-6">
            このゲームは1台の端末を回して遊びます。カードを確認したら、次の人へ渡す前に必ず画面を閉じてください。
          </p>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="paper-button-primary mt-5 min-h-[52px] w-full px-5 py-3 text-base"
        >
          この設定でゲームを始める
        </button>
      </div>

      <aside className="paper-panel-flat flex flex-col p-5 sm:p-6">
        <p className="paper-kicker">How to Play</p>
        <h3 className="font-editorial mt-2 text-xl">3つのルール</h3>
        <ol className="mt-4 space-y-3">
          {[
            '全員に似た言葉を配布。少数派だけが少し違う言葉を持つ',
            '自分の言葉を直接言わず、特徴や使う場面を説明する',
            '議論後に最も怪しい人を1人選び、投票する',
          ].map((rule, index) => (
            <li key={rule} className="flex gap-3">
              <span className="font-label flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] text-[9px] text-[var(--accent)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-xs font-bold leading-6">{rule}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 border border-[var(--line-strong)] bg-[var(--paper-muted)] p-4 text-center">
          <p className="font-label text-[9px] text-[var(--accent)]">Confidential</p>
          <p className="font-editorial mt-4 text-4xl text-[var(--line-strong)]">? ? ?</p>
          <p className="font-label mt-4 text-[9px] text-[var(--ink-soft)]">Your Secret Word</p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-3">
          <span className="text-[11px] font-bold text-[var(--ink-soft)]">配布される少数派の人数</span>
          <span className="font-editorial text-xl">{minorityCount}人</span>
        </div>
      </aside>
    </div>
  );
}

function HandoffScreen({
  playerCount,
  playerIndex,
  isRevealed,
  word,
  headingRef,
  onReveal,
  onAdvance,
}: HandoffScreenProps) {
  const playerNumber = playerIndex + 1;
  const isLastPlayer = playerIndex >= playerCount - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="paper-kicker">
            Secret Card / {String(playerNumber).padStart(2, '0')} of{' '}
            {String(playerCount).padStart(2, '0')}
          </p>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl"
          >
            {isRevealed ? 'あなたの言葉を確認してください' : '次の人に端末を渡してください'}
          </h2>
        </div>
        <span className="font-label border border-[var(--line-strong)] bg-[var(--paper-muted)] px-2 py-1 text-[9px] text-[var(--ink-soft)]">
          Player {String(playerNumber).padStart(2, '0')}
        </span>
      </div>

      <div className="mt-4 flex gap-1" aria-hidden="true">
        {Array.from({ length: playerCount }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 ${
              index < playerIndex
                ? 'bg-[var(--teal)]'
                : index === playerIndex
                  ? 'bg-[var(--accent)]'
                  : 'bg-[var(--line)]'
            }`}
          />
        ))}
      </div>

      <div className="mt-5">
        {isRevealed ? (
          <div className="flex min-h-[280px] flex-col justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] p-6 text-center sm:p-8">
            <p className="font-label text-[9px] text-[var(--accent)]">Your Word</p>
            <p className="font-editorial mx-auto mt-5 max-w-full break-words text-4xl leading-tight sm:text-5xl">
              {word}
            </p>
            <p className="mx-auto mt-5 max-w-md text-xs leading-6 text-[var(--ink-soft)]">
              この言葉が多数派か少数派かは分かりません。言葉そのものを口にせず、特徴や使う場面を説明してください。
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onReveal}
            aria-label={`${playerLabel(playerIndex)}のカードをめくる`}
            className="flex min-h-[280px] w-full flex-col items-center justify-center gap-4 border border-[var(--line-strong)] bg-[var(--paper-muted)] px-6 py-8 text-center transition-colors hover:bg-[var(--paper-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <span className="font-label text-[9px] text-[var(--accent)]">Secret Card</span>
            <span className="font-editorial flex h-24 w-24 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-strong)] text-5xl text-[var(--ink)]">
              ?
            </span>
            <span className="text-sm font-black">カードをめくる</span>
            <span className="text-[11px] leading-5 text-[var(--ink-soft)]">
              タップして、自分に配られた言葉だけを確認します。
            </span>
          </button>
        )}
      </div>

      <div className="mt-4">
        {isRevealed ? (
          <>
            <button
              type="button"
              onClick={onAdvance}
              className="paper-button-primary min-h-[52px] w-full px-5 py-3 text-sm sm:text-base"
            >
              {isLastPlayer ? '全員の確認を終えて議論を始める' : '次の人へ'}
            </button>
            <p className="mt-2 text-center text-[11px] leading-5 text-[var(--ink-soft)]">
              確認が終わったら画面を閉じ、端末を次の人へ渡してください。
            </p>
          </>
        ) : (
          <p className="text-center text-[11px] leading-5 text-[var(--ink-soft)]">
            カードをめくるまで、言葉は表示されません。
          </p>
        )}
      </div>
    </div>
  );
}

function DiscussionScreen({
  playerCount,
  timerMinutes,
  remainingSeconds,
  isTimerRunning,
  headingRef,
  onToggleTimer,
  onResetTimer,
  onGoToVote,
  onFinishEarly,
}: DiscussionScreenProps) {
  const totalSeconds = timerMinutes * 60;
  const progressPercent = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
  const isTimeUp = remainingSeconds === 0;
  const statusClass = isTimeUp
    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
    : isTimerRunning
      ? 'border-[var(--teal)] text-[var(--teal)]'
      : 'border-[var(--line-strong)] text-[var(--ink-soft)]';

  return (
    <div className="mx-auto max-w-3xl">
      <p className="paper-kicker">Discussion / Round Progress</p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl"
      >
        言葉を隠して、正体を探れ。
      </h2>

      <div className="mt-4 border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3">
        <p className="text-sm font-bold leading-6">自分の言葉を直接言わずに説明してください</p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
          1人ずつ順番に説明し、怪しいと思う人を絞り込みます。少数派は言葉のズレを悟られないように紛れ込みましょう。
        </p>
      </div>

      <div className="paper-panel-flat mt-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-label text-[9px] text-[var(--accent)]">Discussion Timer</p>
            <div
              role="timer"
              aria-label={`残り時間 ${formatTime(remainingSeconds)}`}
              className="font-editorial mt-2 text-5xl tabular-nums tracking-tight sm:text-6xl"
            >
              {formatTime(remainingSeconds)}
            </div>
          </div>
          <span className={`font-label border px-2 py-1 text-[9px] ${statusClass}`}>
            {isTimeUp ? 'Time Up' : isTimerRunning ? 'Running' : 'Ready'}
          </span>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden bg-[var(--paper-muted)]">
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {isTimeUp
            ? '議論時間が終了しました。投票に進んでください。'
            : isTimerRunning
              ? `残り時間は約${Math.ceil(remainingSeconds / 60)}分です。`
              : `タイマーは停止中です。残り時間は約${Math.ceil(remainingSeconds / 60)}分です。`}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onToggleTimer}
            disabled={isTimeUp}
            className="paper-button-primary min-h-[48px] flex-1 px-4 py-2.5 text-sm"
          >
            {isTimerRunning ? '一時停止' : 'タイマー開始'}
          </button>
          <button
            type="button"
            onClick={onResetTimer}
            className="paper-button min-h-[48px] px-4 py-2.5 text-sm sm:w-32"
          >
            リセット
          </button>
        </div>
      </div>

      <div className="mt-4 border border-[var(--line)] bg-[var(--paper-strong)] p-4">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
          <p className="text-xs font-black">参加者</p>
          <span className="font-label text-[9px] text-[var(--ink-soft)]">{playerCount} Players</span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: playerCount }, (_, index) => (
            <li
              key={index}
              className="border border-[var(--line)] px-2.5 py-1 text-[11px] font-bold text-[var(--ink-soft)]"
            >
              {playerLabel(index)}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onGoToVote}
          disabled={!isTimeUp}
          className="paper-button-primary min-h-[50px] w-full px-4 py-3 text-sm"
        >
          投票へ進む
        </button>
        {!isTimeUp && (
          <button
            type="button"
            onClick={onFinishEarly}
            className="mt-2 min-h-[44px] w-full px-4 py-2 text-xs font-bold text-[var(--ink-soft)] underline decoration-[var(--line-strong)] underline-offset-4 transition-colors hover:text-[var(--accent)]"
          >
            時間を待たずに投票へ進む
          </button>
        )}
        <p className="mt-2 text-center text-[11px] leading-5 text-[var(--ink-soft)]">
          {isTimeUp
            ? '全員の説明が終わったら、グループで最も怪しい人を選びます。'
            : 'タイマー終了後に投票できます。'}
        </p>
      </div>
    </div>
  );
}

function VoteScreen({
  playerCount,
  selectedVote,
  headingRef,
  onSelect,
  onConfirm,
}: VoteScreenProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="paper-kicker">Final Vote / One Choice</p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl"
      >
        最も怪しい人を選んでください
      </h2>
      <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
        グループで話し合い、少数派だと思う人を1人だけ選びます。投票は1回きりです。
      </p>

      <div
        className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
        role="group"
        aria-label="投票先"
      >
        {Array.from({ length: playerCount }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={selectedVote === index}
            onClick={() => onSelect(index)}
            className="paper-chip flex min-h-[64px] flex-col items-start justify-between px-3 py-2.5 text-left"
          >
            <span className="font-label text-[9px] opacity-70">
              Player {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-sm font-bold">{playerLabel(index)}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2 border-t border-[var(--line)] pt-4">
        <button
          type="button"
          onClick={onConfirm}
          disabled={selectedVote === null}
          className="paper-button-primary min-h-[52px] w-full px-4 py-3 text-sm sm:text-base"
        >
          {selectedVote === null
            ? '投票先を選んでください'
            : `${playerLabel(selectedVote)}に投票する`}
        </button>
        <p className="text-center text-[11px] leading-5 text-[var(--ink-soft)]">
          投票後、少数派全員と両方の言葉が公開されます。
        </p>
      </div>
    </div>
  );
}

function ResultScreen({
  round,
  resultVote,
  majorityWon,
  scores,
  headingRef,
  onNewRound,
  onBackToSetup,
}: ResultScreenProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="paper-kicker">Result / Round Complete</p>

      <div
        className={`mt-3 border p-5 sm:p-6 ${
          majorityWon
            ? 'border-[var(--teal)] bg-[var(--paper-muted)]'
            : 'border-[var(--accent)] bg-[var(--accent-soft)]'
        }`}
      >
        <p
          className={`font-label text-[9px] ${
            majorityWon ? 'text-[var(--teal)]' : 'text-[var(--accent)]'
          }`}
        >
          {majorityWon ? 'Villagers Win' : 'Wolves Win'}
        </p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className={`font-editorial mt-2 text-3xl outline-none sm:text-4xl ${
            majorityWon ? 'text-[var(--teal)]' : 'text-[var(--accent)]'
          }`}
        >
          {majorityWon ? '多数派の勝ち' : '少数派の勝ち'}
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
          {majorityWon
            ? `${playerLabel(resultVote)}は少数派でした。グループの推理が的中しました。`
            : `${playerLabel(resultVote)}は少数派ではありませんでした。少数派は正体を隠し切りました。`}
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="paper-panel-flat p-4">
          <p className="font-label text-[9px] text-[var(--teal)]">Majority Word</p>
          <p className="font-editorial mt-2 break-words text-2xl">{round.majorityWord}</p>
          <p className="mt-1 text-[11px] text-[var(--ink-soft)]">多数派に配られた言葉</p>
        </div>
        <div className="paper-panel-flat p-4">
          <p className="font-label text-[9px] text-[var(--accent)]">Minority Word</p>
          <p className="font-editorial mt-2 break-words text-2xl">{round.minorityWord}</p>
          <p className="mt-1 text-[11px] text-[var(--ink-soft)]">少数派に配られた言葉</p>
        </div>
      </div>

      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="border border-[var(--line)] bg-[var(--paper-strong)] p-4">
          <dt className="font-label text-[9px] text-[var(--ink-soft)]">Wolves</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {round.minorityIndices.map((index) => (
              <span
                key={index}
                className="border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-black text-[var(--accent)]"
              >
                {playerLabel(index)}
              </span>
            ))}
          </dd>
        </div>
        <div className="border border-[var(--line)] bg-[var(--paper-strong)] p-4">
          <dt className="font-label text-[9px] text-[var(--ink-soft)]">Voted Player</dt>
          <dd className="mt-2 text-sm font-black">{playerLabel(resultVote)}</dd>
        </div>
        <div className="border border-[var(--line)] bg-[var(--paper-strong)] p-4">
          <dt className="font-label text-[9px] text-[var(--ink-soft)]">Judgement</dt>
          <dd className="mt-2 text-sm font-black">
            {majorityWon ? '少数派を当てました' : '少数派を逃しました'}
          </dd>
        </div>
        <div className="border border-[var(--line)] bg-[var(--paper-strong)] p-4">
          <dt className="font-label text-[9px] text-[var(--ink-soft)]">Score</dt>
          <dd className="mt-2 text-sm font-black">
            多数派 {scores.majority} / 少数派 {scores.minority}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onNewRound}
          className="paper-button-primary min-h-[52px] flex-1 px-4 py-3 text-sm sm:text-base"
        >
          新しいお題でもう一回
        </button>
        <button
          type="button"
          onClick={onBackToSetup}
          className="paper-button min-h-[52px] px-4 py-3 text-sm sm:w-40"
        >
          設定に戻る
        </button>
      </div>
    </div>
  );
}
