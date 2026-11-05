'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_TEAM_NAMES,
  KINKU_CARDS,
  TURNS_PER_TEAM_OPTIONS,
  TURN_SECONDS,
  type KinkuCard,
  type TurnsPerTeam,
} from './kinkuTalkData';

type TeamIndex = 0 | 1;
type Phase = 'setup' | 'handoff' | 'turn' | 'turnSummary' | 'gameOver';
type Scores = [number, number];
type ScoreTone = 'rust' | 'teal';
type ScoreAction = 'correct' | 'pass';

const MAX_TEAM_NAME_LENGTH = 12;
const ACTION_COOLDOWN_MS = 300;

function shuffleCards(excludedCardId?: string): KinkuCard[] {
  const pool = excludedCardId
    ? KINKU_CARDS.filter((card) => card.id !== excludedCardId)
    : [...KINKU_CARDS];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[target]] = [pool[target], pool[index]];
  }

  return pool;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function normalizeTeamName(value: string, fallback: string): string {
  const trimmed = value.trim().slice(0, MAX_TEAM_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : fallback;
}

function timerAnnouncement(seconds: number): string {
  if (seconds === 0) return '時間切れです。ターン結果を表示します。';
  if (seconds === 30) return '残り30秒です。';
  if (seconds === 10) return '残り10秒です。';
  if (seconds === 5) return '残り5秒です。';
  if (seconds === 3) return '残り3秒です。';
  if (seconds === 2) return '残り2秒です。';
  if (seconds === 1) return '残り1秒です。';
  return '';
}

function teamTextClass(team: TeamIndex): string {
  return team === 0 ? 'text-[var(--accent)]' : 'text-[var(--teal)]';
}

function teamBackgroundClass(team: TeamIndex): string {
  return team === 0 ? 'bg-[var(--accent)]' : 'bg-[var(--teal)]';
}

function scoreToneTextClass(tone: ScoreTone): string {
  return tone === 'rust' ? 'text-[#e07054]' : 'text-[#83b8ac]';
}

function scoreToneDotClass(tone: ScoreTone): string {
  return tone === 'rust' ? 'bg-[#e07054]' : 'bg-[#83b8ac]';
}

export function KinkuTalkGame() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [teamNames, setTeamNames] = useState<[string, string]>(() => [
    DEFAULT_TEAM_NAMES[0],
    DEFAULT_TEAM_NAMES[1],
  ]);
  const [turnsPerTeam, setTurnsPerTeam] = useState<TurnsPerTeam>(3);
  const [scores, setScores] = useState<Scores>([0, 0]);
  const [currentTeam, setCurrentTeam] = useState<TeamIndex>(0);
  const [turnNumber, setTurnNumber] = useState(1);
  const [turnCorrect, setTurnCorrect] = useState(0);
  const [turnPasses, setTurnPasses] = useState(0);
  const [deck, setDeck] = useState<KinkuCard[]>(() => [...KINKU_CARDS]);
  const [cardIndex, setCardIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(TURN_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [setupError, setSetupError] = useState('');

  const panelRef = useRef<HTMLElement>(null);
  const deadlineRef = useRef<number | null>(null);
  const lastActionRef = useRef<{ type: ScoreAction; at: number } | null>(null);
  const previousPhaseRef = useRef<Phase>('setup');

  const totalTurns = turnsPerTeam * 2;
  const currentCard = deck[cardIndex] ?? KINKU_CARDS[0];
  const currentTurnInTeam = Math.floor((turnNumber - 1) / 2) + 1;
  const isFinalTurn = turnNumber >= totalTurns;
  const nextTeam: TeamIndex = currentTeam === 0 ? 1 : 0;
  const displayTeamNames: [string, string] = [
    teamNames[0].trim() || DEFAULT_TEAM_NAMES[0],
    teamNames[1].trim() || DEFAULT_TEAM_NAMES[1],
  ];
  const currentTeamName = displayTeamNames[currentTeam];
  const nextTeamName = displayTeamNames[nextTeam];
  const isTied = scores[0] === scores[1];
  const finalWinnerIndex: TeamIndex = scores[0] > scores[1] ? 0 : 1;

  let liveMessage = '';
  if (phase === 'setup') {
    liveMessage = 'ゲーム設定です。チーム名とターン数を決めてゲームを始めてください。';
  } else if (phase === 'handoff') {
    liveMessage = `${currentTeamName}のターンです。端末を説明者に渡してください。カードはまだ表示されていません。`;
  } else if (phase === 'turn') {
    liveMessage = `${currentTeamName}のターン。カードを確認して、タイマーを開始してください。`;
  } else if (phase === 'turnSummary') {
    liveMessage = `${currentTeamName}のターンが終了しました。正解${turnCorrect}回、パス${turnPasses}回。`;
  } else if (isTied) {
    liveMessage = `ゲーム終了。${scores[0]}点で引き分けです。`;
  } else {
    liveMessage = `ゲーム終了。${displayTeamNames[finalWinnerIndex]}の勝ちです。`;
  }

  useEffect(() => {
    if (phase !== 'turn' || !isTimerRunning) {
      return;
    }

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) {
        setIsTimerRunning(false);
        return;
      }

      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(next);

      if (next <= 0) {
        setIsTimerRunning(false);
        setPhase('turnSummary');
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);

    return () => window.clearInterval(intervalId);
  }, [phase, isTimerRunning]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    if (phase === 'setup' && previousPhase === 'setup') {
      return;
    }

    const heading = panelRef.current?.querySelector<HTMLHeadingElement>('h2');
    heading?.focus();
  }, [phase, turnNumber]);

  const resetTurnState = (team: TeamIndex, nextTurnNumber: number) => {
    deadlineRef.current = null;
    lastActionRef.current = null;
    setCurrentTeam(team);
    setTurnNumber(nextTurnNumber);
    setTurnCorrect(0);
    setTurnPasses(0);
    setRemainingSeconds(TURN_SECONDS);
    setIsTimerRunning(false);
    setPhase('handoff');
  };

  const handleStartGame = () => {
    const cleanNames: [string, string] = [
      normalizeTeamName(teamNames[0], DEFAULT_TEAM_NAMES[0]),
      normalizeTeamName(teamNames[1], DEFAULT_TEAM_NAMES[1]),
    ];

    const nameKey = (value: string) => value.normalize('NFKC').toLowerCase();
    if (nameKey(cleanNames[0]) === nameKey(cleanNames[1])) {
      setSetupError('2チームの名前は別々にしてください。');
      return;
    }

    setSetupError('');
    setTeamNames(cleanNames);
    setScores([0, 0]);
    setDeck(shuffleCards());
    setCardIndex(0);
    resetTurnState(0, 1);
  };

  const handleTeamNameChange = (team: TeamIndex, value: string) => {
    setSetupError('');
    setTeamNames((previous) => {
      const nextNames: [string, string] = [previous[0], previous[1]];
      nextNames[team] = value.slice(0, MAX_TEAM_NAME_LENGTH);
      return nextNames;
    });
  };

  const handleTurnsChange = (turns: TurnsPerTeam) => {
    setSetupError('');
    setTurnsPerTeam(turns);
  };

  const handleRevealCard = () => {
    deadlineRef.current = null;
    setRemainingSeconds(TURN_SECONDS);
    setIsTimerRunning(false);
    setPhase('turn');
  };

  const handleStartTimer = () => {
    if (remainingSeconds <= 0 || deadlineRef.current !== null) {
      return;
    }
    deadlineRef.current = Date.now() + remainingSeconds * 1000;
    setIsTimerRunning(true);
  };

  const advanceCard = () => {
    const nextIndex = cardIndex + 1;

    if (nextIndex < deck.length) {
      setCardIndex(nextIndex);
      return;
    }

    const previousCardId = deck[cardIndex]?.id;
    setDeck(shuffleCards(previousCardId));
    setCardIndex(0);
  };

  const canRegisterAction = (type: ScoreAction) => {
    if (!isTimerRunning || remainingSeconds <= 0) {
      return false;
    }

    const now = Date.now();
    const lastAction = lastActionRef.current;
    if (lastAction?.type === type && now - lastAction.at < ACTION_COOLDOWN_MS) {
      return false;
    }

    const deadline = deadlineRef.current;
    if (deadline !== null && now >= deadline) {
      return false;
    }

    lastActionRef.current = { type, at: now };
    return true;
  };

  const handleCorrect = () => {
    if (!canRegisterAction('correct')) {
      return;
    }

    setScores((previous) => {
      const nextScores: Scores = [previous[0], previous[1]];
      nextScores[currentTeam] += 1;
      return nextScores;
    });
    setTurnCorrect((previous) => previous + 1);
    advanceCard();
  };

  const handlePass = () => {
    if (!canRegisterAction('pass')) {
      return;
    }

    setTurnPasses((previous) => previous + 1);
    advanceCard();
  };

  const handleNextTurn = () => {
    if (isFinalTurn) {
      setPhase('gameOver');
      return;
    }

    advanceCard();
    const nextTurnNumber = turnNumber + 1;
    const nextTeamIndex: TeamIndex = nextTurnNumber % 2 === 1 ? 0 : 1;
    resetTurnState(nextTeamIndex, nextTurnNumber);
  };

  const handleRestart = () => {
    setScores([0, 0]);
    setDeck(shuffleCards());
    setCardIndex(0);
    resetTurnState(0, 1);
  };

  const handleBackToSetup = () => {
    deadlineRef.current = null;
    lastActionRef.current = null;
    setSetupError('');
    setPhase('setup');
    setScores([0, 0]);
    setCurrentTeam(0);
    setTurnNumber(1);
    setTurnCorrect(0);
    setTurnPasses(0);
    setDeck([...KINKU_CARDS]);
    setCardIndex(0);
    setRemainingSeconds(TURN_SECONDS);
    setIsTimerRunning(false);
  };

  return (
    <section ref={panelRef} className="paper-panel overflow-hidden" aria-label="禁句トーク">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
      <GameHeader
        phase={phase}
        teamNames={displayTeamNames}
        scores={scores}
        currentTeam={currentTeam}
        turnNumber={turnNumber}
        totalTurns={totalTurns}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {phase === 'setup' ? (
          <SetupScreen
            teamNames={teamNames}
            turnsPerTeam={turnsPerTeam}
            error={setupError}
            onTeamNameChange={handleTeamNameChange}
            onTurnsChange={handleTurnsChange}
            onStart={handleStartGame}
          />
        ) : phase === 'handoff' ? (
          <HandoffScreen
            teamName={currentTeamName}
            teamIndex={currentTeam}
            score={scores[currentTeam]}
            turnNumber={turnNumber}
            totalTurns={totalTurns}
            currentTurnInTeam={currentTurnInTeam}
            turnsPerTeam={turnsPerTeam}
            onReveal={handleRevealCard}
          />
        ) : phase === 'turn' ? (
          <TurnScreen
            card={currentCard}
            teamName={currentTeamName}
            teamIndex={currentTeam}
            teamScore={scores[currentTeam]}
            turnNumber={turnNumber}
            totalTurns={totalTurns}
            currentTurnInTeam={currentTurnInTeam}
            turnsPerTeam={turnsPerTeam}
            remainingSeconds={remainingSeconds}
            isTimerRunning={isTimerRunning}
            turnCorrect={turnCorrect}
            turnPasses={turnPasses}
            onStartTimer={handleStartTimer}
            onCorrect={handleCorrect}
            onPass={handlePass}
          />
        ) : phase === 'turnSummary' ? (
          <TurnSummaryScreen
            teamName={currentTeamName}
            teamIndex={currentTeam}
            score={scores[currentTeam]}
            turnCorrect={turnCorrect}
            turnPasses={turnPasses}
            turnNumber={turnNumber}
            totalTurns={totalTurns}
            isFinalTurn={isFinalTurn}
            nextTeamName={nextTeamName}
            onNext={handleNextTurn}
          />
        ) : (
          <GameOverScreen
            teamNames={displayTeamNames}
            scores={scores}
            turnsPerTeam={turnsPerTeam}
            onRestart={handleRestart}
            onBackToSetup={handleBackToSetup}
          />
        )}
      </div>
    </section>
  );
}

type GameHeaderProps = {
  phase: Phase;
  teamNames: [string, string];
  scores: Scores;
  currentTeam: TeamIndex;
  turnNumber: number;
  totalTurns: number;
};

function GameHeader({ phase, teamNames, scores, currentTeam, turnNumber, totalTurns }: GameHeaderProps) {
  const isInPlay = phase !== 'setup' && phase !== 'gameOver';

  return (
    <header className="border-b border-[#3b3328] bg-[#211d18] px-4 py-3 text-[#f2e9d8] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-label text-[10px] font-bold text-[#dfb15b]">Kinku Talk</span>
          <span className="font-label border border-[#5a4b38] px-2 py-1 text-[9px]">
            {phase === 'setup'
              ? '2 Teams'
              : phase === 'gameOver'
                ? 'Final'
                : `Turn ${String(turnNumber).padStart(2, '0')} / ${String(totalTurns).padStart(2, '0')}`}
          </span>
          {isInPlay && (
            <span className="min-w-0 truncate text-[10px] font-bold tracking-wider text-[#b7a992]">
              {teamNames[currentTeam]}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10px] font-bold tracking-wider">
          <ScorePill
            name={teamNames[0]}
            score={scores[0]}
            active={isInPlay && currentTeam === 0}
            tone="rust"
          />
          <ScorePill
            name={teamNames[1]}
            score={scores[1]}
            active={isInPlay && currentTeam === 1}
            tone="teal"
          />
        </div>
      </div>
    </header>
  );
}

type ScorePillProps = {
  name: string;
  score: number;
  active: boolean;
  tone: ScoreTone;
};

function ScorePill({ name, score, active, tone }: ScorePillProps) {
  return (
    <span
      className={`inline-flex min-w-0 max-w-[9rem] items-center gap-1.5 border px-2 py-1 ${
        active ? 'border-[#dfb15b] bg-[#2f2a24]' : 'border-[#3b3328]'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 ${scoreToneDotClass(tone)}`}
        aria-hidden="true"
      />
      <span className="min-w-0 truncate text-[10px] font-bold text-[#f2e9d8]">{name}</span>
      <span className={`font-editorial shrink-0 text-sm ${scoreToneTextClass(tone)}`}>{score}</span>
      {active && <span className="sr-only">現在のターン</span>}
    </span>
  );
}

type SetupScreenProps = {
  teamNames: [string, string];
  turnsPerTeam: TurnsPerTeam;
  error: string;
  onTeamNameChange: (team: TeamIndex, name: string) => void;
  onTurnsChange: (turns: TurnsPerTeam) => void;
  onStart: () => void;
};

function SetupScreen({
  teamNames,
  turnsPerTeam,
  error,
  onTeamNameChange,
  onTurnsChange,
  onStart,
}: SetupScreenProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <p className="paper-kicker">Setup / Two Teams</p>
        <h2 tabIndex={-1} className="font-editorial mt-2 text-2xl leading-tight text-balance outline-none sm:text-3xl">
          禁句を避けて、伝えきれ。
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
          2チームに分かれ、1ターン60秒でお題を説明します。禁止ワードを口に出さずに伝えられたら正解。
          チームで交互に挑戦し、合計得点を競います。
        </p>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
            <h3 className="text-sm font-black">チーム名</h3>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">Team Names</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([0, 1] as const).map((team) => (
              <label
                key={team}
                className="block border border-[var(--line)] bg-[var(--paper-strong)] p-3"
              >
                <span
                  className={`font-label flex items-center gap-1.5 text-[9px] ${teamTextClass(team)}`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 ${teamBackgroundClass(team)}`}
                    aria-hidden="true"
                  />
                  Team {String(team + 1).padStart(2, '0')}
                </span>
                <input
                  type="text"
                  value={teamNames[team]}
                  onChange={(event) => onTeamNameChange(team, event.target.value)}
                  maxLength={MAX_TEAM_NAME_LENGTH}
                  className="field-paper mt-2 min-h-[48px] px-3 py-2 text-base font-bold"
                  aria-label={`チーム${team + 1}の名前`}
                  placeholder={DEFAULT_TEAM_NAMES[team]}
                />
              </label>
            ))}
          </div>
          {error && (
            <p
              role="alert"
              className="mt-2 border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-[11px] font-bold leading-5 text-[var(--accent)]"
            >
              {error}
            </p>
          )}
          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            空欄のまま始めると、赤チーム・青チームになります。入力した名前は保存されません。
          </p>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
            <h3 className="text-sm font-black">1チームあたりのターン数</h3>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">Turn Count</span>
          </div>
          <div
            className="mt-3 grid grid-cols-3 gap-2"
            role="group"
            aria-label="1チームあたりのターン数"
          >
            {TURNS_PER_TEAM_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={turnsPerTeam === option}
                onClick={() => onTurnsChange(option)}
                className="paper-chip min-h-[52px] px-2 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                {option}ターン
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            全{turnsPerTeam * 2}ターン・1ターン60秒。赤チームと青チームが交互に挑戦します。
          </p>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="paper-button-primary mt-6 min-h-[56px] w-full px-5 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          ゲームを始める
        </button>
      </div>

      <aside className="paper-panel-flat flex flex-col p-5 sm:p-6">
        <p className="paper-kicker">How to Play</p>
        <h3 className="font-editorial mt-2 text-xl">3つのルール</h3>
        <ol className="mt-4 space-y-3">
          {[
            '説明者はお題と3つの禁止ワードを確認する',
            '禁止ワードを言わず、別の言葉でお題を伝える',
            '60秒で正解を重ね、チームの合計点を競う',
          ].map((rule, index) => (
            <li key={rule} className="flex gap-3">
              <span className="font-label flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] text-[9px] text-[var(--accent)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-xs font-bold leading-6">{rule}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 border border-[var(--line-strong)] bg-[var(--paper-muted)] p-4">
          <p className="font-label text-[9px] text-[var(--accent)]">Confidential Card</p>
          <div className="mt-3 flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
            <span className="font-editorial text-xl">お題</span>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">60 sec</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[0, 1, 2].map((item) => (
              <span
                key={item}
                className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2 py-1 text-[10px] font-bold text-[var(--ink-soft)]"
              >
                禁止ワード
              </span>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
            カードを確認できるのは説明者だけです。
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-3">
          <span className="text-[11px] font-bold text-[var(--ink-soft)]">収録カード</span>
          <span className="font-editorial text-xl">{KINKU_CARDS.length}枚</span>
        </div>
      </aside>
    </div>
  );
}

type HandoffScreenProps = {
  teamName: string;
  teamIndex: TeamIndex;
  score: number;
  turnNumber: number;
  totalTurns: number;
  currentTurnInTeam: number;
  turnsPerTeam: TurnsPerTeam;
  onReveal: () => void;
};

function HandoffScreen({
  teamName,
  teamIndex,
  score,
  turnNumber,
  totalTurns,
  currentTurnInTeam,
  turnsPerTeam,
  onReveal,
}: HandoffScreenProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="paper-kicker">Handoff / Turn {String(turnNumber).padStart(2, '0')}</p>
          <h2
            tabIndex={-1}
            className={`font-editorial mt-2 break-words text-2xl leading-tight outline-none sm:text-3xl ${teamTextClass(teamIndex)}`}
          >
            {teamName}のターン
          </h2>
        </div>
        <span className="font-label border border-[var(--line-strong)] bg-[var(--paper-muted)] px-2 py-1 text-[9px] text-[var(--ink-soft)]">
          {currentTurnInTeam} / {turnsPerTeam}
        </span>
      </div>

      <div className="mt-4 flex gap-1" aria-hidden="true">
        {Array.from({ length: totalTurns }, (_, index) => {
          const segmentTurn = index + 1;
          const segmentTeam: TeamIndex = segmentTurn % 2 === 1 ? 0 : 1;
          const isCurrent = segmentTurn === turnNumber;
          const isDone = segmentTurn < turnNumber;

          return (
            <span
              key={segmentTurn}
              className={`h-1.5 flex-1 ${
                isCurrent
                  ? teamBackgroundClass(segmentTeam)
                  : isDone
                    ? 'bg-[var(--line-strong)]'
                    : 'bg-[var(--line)]'
              }`}
            />
          );
        })}
      </div>

      <div className="paper-panel-flat mt-5 p-5 text-center sm:p-7">
        <p className="font-label text-[9px] text-[var(--accent)]">Pass the Device</p>
        <h3 className="font-editorial mt-3 text-xl leading-tight sm:text-2xl">
          説明する人に端末を渡してください
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-[var(--ink-soft)]">
          画面を見るのは説明者だけです。準備ができたらカードを表示し、60秒のタイマーでお題を説明します。
        </p>

        <ul className="mx-auto mt-4 max-w-md space-y-2 text-left">
          {[
            '説明者以外の人は画面を見ない',
            'カードには禁止ワードが3つ',
            '正解は1点、パスは0点',
          ].map((rule, index) => (
            <li key={rule} className="flex items-start gap-2 text-xs font-bold leading-6">
              <span className="font-label mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] text-[9px] text-[var(--accent)]">
                {index + 1}
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-5 flex max-w-md items-center justify-between border-t border-[var(--line)] pt-3">
          <span className="text-[11px] font-bold text-[var(--ink-soft)]">現在のスコア</span>
          <span className={`font-editorial text-2xl ${teamTextClass(teamIndex)}`}>{score}点</span>
        </div>

        <button
          type="button"
          onClick={onReveal}
          className="paper-button-primary mt-5 min-h-[60px] w-full px-5 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          カードを表示する
        </button>
        <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
          カードを表示したあと、次の画面でタイマーを開始します。
        </p>
      </div>
    </div>
  );
}

type TurnScreenProps = {
  card: KinkuCard;
  teamName: string;
  teamIndex: TeamIndex;
  teamScore: number;
  turnNumber: number;
  totalTurns: number;
  currentTurnInTeam: number;
  turnsPerTeam: TurnsPerTeam;
  remainingSeconds: number;
  isTimerRunning: boolean;
  turnCorrect: number;
  turnPasses: number;
  onStartTimer: () => void;
  onCorrect: () => void;
  onPass: () => void;
};

function TurnScreen({
  card,
  teamName,
  teamIndex,
  teamScore,
  turnNumber,
  totalTurns,
  currentTurnInTeam,
  turnsPerTeam,
  remainingSeconds,
  isTimerRunning,
  turnCorrect,
  turnPasses,
  onStartTimer,
  onCorrect,
  onPass,
}: TurnScreenProps) {
  const isReady = !isTimerRunning && remainingSeconds > 0;
  const canScore = isTimerRunning && remainingSeconds > 0;
  const progressPercent = (remainingSeconds / TURN_SECONDS) * 100;
  const cardRef = useRef<HTMLDivElement>(null);
  const timerStatusClass =
    remainingSeconds <= 10
      ? 'border-[var(--accent)] text-[var(--accent)]'
      : isTimerRunning
        ? 'border-[var(--teal)] text-[var(--teal)]'
        : 'border-[var(--line-strong)] text-[var(--ink-soft)]';

  useEffect(() => {
    if (isTimerRunning) {
      cardRef.current?.focus();
    }
  }, [isTimerRunning]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="paper-kicker">
            Turn {String(turnNumber).padStart(2, '0')} / {String(totalTurns).padStart(2, '0')} ·{' '}
            {currentTurnInTeam} / {turnsPerTeam}
          </p>
          <h2
            tabIndex={-1}
            className={`font-editorial mt-2 break-words text-2xl leading-tight outline-none sm:text-3xl ${teamTextClass(teamIndex)}`}
          >
            {teamName}のターン
          </h2>
        </div>
        <div className="text-right">
          <span className="font-label text-[9px] text-[var(--ink-soft)]">This Turn</span>
          <p className="mt-1 text-xs font-bold">
            正解 {turnCorrect} / パス {turnPasses}
          </p>
        </div>
      </div>

      <div className="paper-panel-flat mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--paper-muted)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="font-label text-[9px] text-[var(--accent)]">Timer</span>
            <div
              role="timer"
              aria-label={`残り時間 ${formatTime(remainingSeconds)}`}
              className={`font-editorial text-4xl tabular-nums tracking-tight sm:text-5xl ${
                remainingSeconds <= 10 ? 'text-[var(--accent)]' : 'text-[var(--ink)]'
              }`}
            >
              {formatTime(remainingSeconds)}
            </div>
          </div>
          <span className={`font-label border px-2 py-1 text-[9px] ${timerStatusClass}`}>
            {isTimerRunning ? 'Running' : 'Ready'}
          </span>
        </div>

        <div className="h-2 w-full bg-[var(--paper-muted)]" aria-hidden="true">
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {timerAnnouncement(remainingSeconds)}
        </p>

        <div className="p-4 sm:p-5">
          <div
            ref={cardRef}
            tabIndex={-1}
            aria-live="polite"
            aria-atomic="true"
            className="border border-[var(--line-strong)] bg-[var(--paper-strong)] p-4 text-center outline-none sm:p-6"
          >
            <p className="font-label text-[9px] text-[var(--accent)]">Your Word</p>
            <p className="font-editorial mt-3 break-words text-4xl leading-tight sm:text-5xl">
              {card.word}
            </p>
            <p className="mt-2 text-[11px] font-bold text-[var(--ink-soft)]">
              この言葉を、禁止ワードを使わずに説明してください
            </p>

            <div className="mt-4 border-t border-[var(--line)] pt-3">
              <p className="font-label text-[9px] text-[var(--accent)]">Forbidden Words</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-3">
                {card.forbidden.map((word, index) => (
                  <li
                    key={word}
                    className="flex min-h-[44px] items-center justify-center gap-1.5 border border-[var(--line-strong)] bg-[var(--paper-muted)] px-2 py-2"
                  >
                    <span className="font-label text-[9px] text-[var(--accent)]" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="break-words text-sm font-black">{word}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4">
            {isReady ? (
              <>
                <button
                  type="button"
                  onClick={onStartTimer}
                  className="paper-button-primary min-h-[60px] w-full px-5 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  60秒タイマーを開始
                </button>
                <p className="mt-2 text-center text-[11px] leading-5 text-[var(--ink-soft)]">
                  開始すると、カードを切り替えながら正解とパスを選べます。
                </p>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onCorrect}
                    disabled={!canScore}
                    className="paper-button-primary min-h-[64px] px-3 py-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    正解 <span className="font-editorial text-xl">+1</span>
                  </button>
                  <button
                    type="button"
                    onClick={onPass}
                    disabled={!canScore}
                    className="paper-button min-h-[64px] px-3 py-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    パス
                  </button>
                </div>
                <p className="mt-2 text-center text-[11px] leading-5 text-[var(--ink-soft)]">
                  正解で1点。パスは0点で、どちらも次のカードへ進みます。
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3">
        <span className="text-[11px] font-bold text-[var(--ink-soft)]">チーム合計</span>
        <span className={`font-editorial text-2xl ${teamTextClass(teamIndex)}`}>{teamScore}点</span>
      </div>
    </div>
  );
}

type TurnSummaryScreenProps = {
  teamName: string;
  teamIndex: TeamIndex;
  score: number;
  turnCorrect: number;
  turnPasses: number;
  turnNumber: number;
  totalTurns: number;
  isFinalTurn: boolean;
  nextTeamName: string;
  onNext: () => void;
};

function TurnSummaryScreen({
  teamName,
  teamIndex,
  score,
  turnCorrect,
  turnPasses,
  turnNumber,
  totalTurns,
  isFinalTurn,
  nextTeamName,
  onNext,
}: TurnSummaryScreenProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="paper-kicker">
        Turn Complete / {String(turnNumber).padStart(2, '0')} of {String(totalTurns).padStart(2, '0')}
      </p>

      <div className="mt-3 border border-[var(--line-strong)] bg-[var(--paper-muted)] p-5 sm:p-6">
        <p className={`font-label text-[9px] ${teamTextClass(teamIndex)}`}>{teamName}</p>
        <h2 tabIndex={-1} className="font-editorial mt-2 text-3xl leading-tight outline-none sm:text-4xl">ターン終了</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
          カードは閉じました。結果を確認して、端末を次のチームへ渡してください。
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="border border-[var(--line-strong)] bg-[var(--paper-strong)] p-4">
            <p className="font-label text-[9px] text-[var(--teal)]">Correct</p>
            <p className="font-editorial mt-1 text-3xl">
              {turnCorrect}
              <span className="ml-1 text-sm">回</span>
            </p>
            <p className="mt-1 text-[11px] text-[var(--ink-soft)]">正解 +{turnCorrect}点</p>
          </div>
          <div className="border border-[var(--line-strong)] bg-[var(--paper-strong)] p-4">
            <p className="font-label text-[9px] text-[var(--ink-soft)]">Pass</p>
            <p className="font-editorial mt-1 text-3xl">
              {turnPasses}
              <span className="ml-1 text-sm">回</span>
            </p>
            <p className="mt-1 text-[11px] text-[var(--ink-soft)]">得点なし</p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3">
          <span className="text-xs font-bold text-[var(--ink-soft)]">{teamName}の合計</span>
          <span className={`font-editorial text-2xl ${teamTextClass(teamIndex)}`}>{score}点</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="paper-button-primary mt-4 min-h-[56px] w-full px-5 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {isFinalTurn ? '最終結果を見る' : '次のチームへ'}
      </button>
      <p className="mt-2 text-center text-[11px] leading-5 text-[var(--ink-soft)]">
        {isFinalTurn ? '全ターンが終了しました。' : `次は ${nextTeamName} のターンです。`}
      </p>
    </div>
  );
}

type GameOverScreenProps = {
  teamNames: [string, string];
  scores: Scores;
  turnsPerTeam: TurnsPerTeam;
  onRestart: () => void;
  onBackToSetup: () => void;
};

function GameOverScreen({
  teamNames,
  scores,
  turnsPerTeam,
  onRestart,
  onBackToSetup,
}: GameOverScreenProps) {
  const isTied = scores[0] === scores[1];
  const winnerIndex: TeamIndex = scores[0] > scores[1] ? 0 : 1;
  const loserIndex: TeamIndex = winnerIndex === 0 ? 1 : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="paper-kicker">Final Score / Game Set</p>

      <div
        className={`mt-3 border p-5 sm:p-6 ${
          isTied
            ? 'border-[var(--line-strong)] bg-[var(--paper-muted)]'
            : 'border-[var(--gold)] bg-[var(--paper-muted)]'
        }`}
      >
        <p className="font-label text-[9px] text-[var(--accent)]">{isTied ? 'Draw' : 'Winner'}</p>
        <h2 tabIndex={-1} className="font-editorial mt-2 break-words text-3xl leading-tight outline-none sm:text-4xl">
          {isTied ? '引き分け' : `${teamNames[winnerIndex]}の勝ち`}
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
          {isTied
            ? `両チームとも ${scores[0]}点。勝敗はつきませんでした。もう一度遊ぶと決着をつけられます。`
            : `${teamNames[winnerIndex]}が ${scores[winnerIndex]}点で勝利。${teamNames[loserIndex]}は ${scores[loserIndex]}点でした。`}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {([0, 1] as const).map((team) => {
          const isWinner = !isTied && winnerIndex === team;

          return (
            <div
              key={team}
              className={`border p-4 ${
                isWinner
                  ? 'border-[var(--gold)] bg-[var(--paper-strong)]'
                  : 'border-[var(--line)] bg-[var(--paper-strong)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-label flex min-w-0 items-center gap-1.5 text-[9px] ${teamTextClass(team)}`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 ${teamBackgroundClass(team)}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{teamNames[team]}</span>
                </span>
                {isWinner && (
                  <span className="font-label shrink-0 border border-[var(--gold)] px-1.5 py-0.5 text-[8px] text-[var(--accent)]">
                    Win
                  </span>
                )}
                {isTied && (
                  <span className="font-label shrink-0 border border-[var(--line-strong)] px-1.5 py-0.5 text-[8px] text-[var(--ink-soft)]">
                    Draw
                  </span>
                )}
              </div>
              <p className={`font-editorial mt-3 text-4xl ${teamTextClass(team)}`}>
                {scores[team]}
                <span className="ml-1 text-sm">点</span>
              </p>
              <p className="mt-1 text-[11px] text-[var(--ink-soft)]">{turnsPerTeam}ターンずつ対戦</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onRestart}
          className="paper-button-primary min-h-[56px] flex-1 px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          もう一度遊ぶ
        </button>
        <button
          type="button"
          onClick={onBackToSetup}
          className="paper-button min-h-[56px] px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-40"
        >
          設定に戻る
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] leading-5 text-[var(--ink-soft)]">
        もう一度遊ぶと、同じチーム名・ターン数でスコアをリセットして再戦します。
      </p>
    </div>
  );
}
