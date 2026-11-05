'use client';

import { useEffect, useRef, useState } from 'react';
import { MEETING_TOPICS, NG_WORDS, type MeetingTopic } from './ngWordData';

type Phase = 'setup' | 'pass' | 'reveal' | 'meeting' | 'results';

type Player = {
  id: number;
  name: string;
  ngWord: string;
  penalized: boolean;
};

const PLAYER_COUNTS = [3, 4, 5, 6, 7, 8] as const;
const DURATION_OPTIONS = [3, 5, 8] as const;

type PlayerCount = (typeof PLAYER_COUNTS)[number];
type DurationMinutes = (typeof DURATION_OPTIONS)[number];

const DEFAULT_DURATION_MINUTES: DurationMinutes = 5;

const PHASE_LABELS: Record<Phase, string> = {
  setup: 'SETUP',
  pass: 'DISTRIBUTION',
  reveal: 'SECRET CHECK',
  meeting: 'IN SESSION',
  results: 'FINAL REPORT',
};

const PHASE_ANNOUNCEMENTS: Record<Phase, string> = {
  setup: '会議の設定画面です。',
  pass: '次の人に端末を渡してください。',
  reveal: 'あなたのNGワードを表示しています。',
  meeting: '会議が始まりました。',
  results: '会議結果を表示しています。',
};

const PLAYER_TONE_CLASSES = [
  'border-l-[var(--accent)]',
  'border-l-[var(--teal)]',
  'border-l-[var(--gold)]',
] as const;

function randomIndex(max: number): number {
  if (max <= 0) return 0;
  if (typeof window !== 'undefined' && typeof window.crypto?.getRandomValues === 'function') {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffleTake<T>(source: readonly T[], count: number): T[] {
  const pool = [...source];
  const limit = Math.min(count, pool.length);
  for (let index = 0; index < limit; index += 1) {
    const swapIndex = index + randomIndex(pool.length - index);
    const current = pool[index];
    pool[index] = pool[swapIndex];
    pool[swapIndex] = current;
  }
  return pool.slice(0, limit);
}

function pickTopic(previousTitle?: string): MeetingTopic {
  const filtered = previousTitle
    ? MEETING_TOPICS.filter((topic) => topic.title !== previousTitle)
    : MEETING_TOPICS;
  const pool = filtered.length > 0 ? filtered : MEETING_TOPICS;
  return pool[randomIndex(pool.length)];
}

function buildPlayers(count: number, excludedWords: readonly string[] = []): Player[] {
  const excluded = new Set(excludedWords);
  const available = NG_WORDS.filter((word) => !excluded.has(word));
  const source = available.length >= count ? available : NG_WORDS;
  const words = shuffleTake(source, count);

  if (words.length < count) {
    throw new Error(`NG_WORDS must contain at least ${count} unique words.`);
  }

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: `プレイヤー ${index + 1}`,
    ngWord: words[index],
    penalized: false,
  }));
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatPlayerNumber(value: number): string {
  return String(value).padStart(2, '0');
}

function getScoreCopy(score: number, total: number, survivors: number): string {
  if (total === 0) return '';
  if (survivors === total) return '全員がNGワードを守り切りました';
  if (score >= 80) return 'あと少しで全員生存の好会議';
  if (score >= 60) return 'NGワードが飛び交う、まずまずの会議';
  if (score >= 40) return 'ハプニング続きの波乱の会議';
  return 'NGワードだらけの大荒れ会議';
}

function ResultCard({ player }: { player: Player }) {
  return (
    <article
      className={`border border-[var(--line)] border-l-4 bg-[var(--paper-strong)] p-3.5 ${
        player.penalized ? 'border-l-[var(--accent)]' : 'border-l-[var(--teal)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-label text-[9px] text-[var(--ink-soft)]">
            PLAYER {formatPlayerNumber(player.id + 1)}
          </p>
          <h4 className="mt-1 text-sm font-black">{player.name}</h4>
        </div>
        <span
          className={`shrink-0 border px-2 py-1 font-label text-[8px] ${
            player.penalized
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'border-[var(--teal)] bg-[var(--paper-muted)] text-[var(--teal)]'
          }`}
        >
          {player.penalized ? 'PENALTY' : 'SURVIVED'}
        </span>
      </div>
      <div className="mt-3 border-t border-[var(--line)] pt-2">
        <p className="font-label text-[9px] text-[var(--ink-soft)]">NG WORD</p>
        <p className="font-editorial mt-1 break-words text-2xl">{player.ngWord}</p>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
        {player.penalized
          ? '言ってしまった（自己申告または周囲の指摘）'
          : '一度も言わずに会議を乗り切った'}
      </p>
    </article>
  );
}

export function NgWordGame() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [playerCount, setPlayerCount] = useState<PlayerCount>(5);
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(DEFAULT_DURATION_MINUTES);
  const [topic, setTopic] = useState<MeetingTopic>(MEETING_TOPICS[0]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_DURATION_MINUTES * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasTimerStarted, setHasTimerStarted] = useState(false);
  const [penaltyAnnouncement, setPenaltyAnnouncement] = useState('');
  const deadlineRef = useRef<number | null>(null);
  const remainingMsRef = useRef(DEFAULT_DURATION_MINUTES * 60 * 1000);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastFocusKeyRef = useRef('setup:0');

  useEffect(() => {
    setTopic(pickTopic());
  }, []);

  useEffect(() => {
    const focusKey = `${phase}:${currentPlayerIndex}`;
    if (focusKey === lastFocusKeyRef.current) return;

    lastFocusKeyRef.current = focusKey;
    headingRef.current?.focus();
  }, [phase, currentPlayerIndex]);

  useEffect(() => {
    if (!isTimerRunning) return;

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) {
        setIsTimerRunning(false);
        return;
      }
      const remainingMs = Math.max(0, deadline - Date.now());
      remainingMsRef.current = remainingMs;
      const next = Math.ceil(remainingMs / 1000);
      setRemainingSeconds(next);
      if (next <= 0) {
        deadlineRef.current = null;
        setIsTimerRunning(false);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [isTimerRunning]);

  const activePlayer = players[currentPlayerIndex];
  const survivors = players.filter((player) => !player.penalized);
  const penalizedPlayers = players.filter((player) => player.penalized);
  const totalDurationSeconds = durationMinutes * 60;
  const score = players.length > 0 ? Math.round((survivors.length / players.length) * 100) : 0;
  const progressPercent =
    totalDurationSeconds > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / totalDurationSeconds) * 100))
      : 0;
  const timerMilestone =
    remainingSeconds === 60
      ? '残り1分です。'
      : remainingSeconds === 30
        ? '残り30秒です。'
        : remainingSeconds === 10
          ? '残り10秒です。'
          : '';

  let timerStatusCopy = '';
  if (isTimerRunning) {
    timerStatusCopy = 'タイマー進行中。会議を続けてください。';
  } else if (remainingSeconds === 0) {
    timerStatusCopy = '時間になりました。会議を終了して結果を確認できます。';
  } else if (!hasTimerStarted) {
    timerStatusCopy = 'スタートを押すとカウントダウンが始まります。';
  } else {
    timerStatusCopy = '一時停止中です。再開するか、会議を終了してください。';
  }

  const handleRerollTopic = () => {
    setTopic(pickTopic(topic.title));
  };

  const handleStartGame = () => {
    const nextPlayers = buildPlayers(playerCount);
    deadlineRef.current = null;
    remainingMsRef.current = durationMinutes * 60 * 1000;
    setIsTimerRunning(false);
    setHasTimerStarted(false);
    setPenaltyAnnouncement('');
    setPlayers(nextPlayers);
    setCurrentPlayerIndex(0);
    setRemainingSeconds(durationMinutes * 60);
    setPhase('pass');
  };

  const handleRevealWord = () => {
    setPhase('reveal');
  };

  const handleHideWord = () => {
    if (currentPlayerIndex >= players.length - 1) {
      setPhase('meeting');
      return;
    }
    setCurrentPlayerIndex((index) => index + 1);
    setPhase('pass');
  };

  const handlePenalty = (playerId: number) => {
    const target = players.find((player) => player.id === playerId);
    if (!target || target.penalized) return;

    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId ? { ...player, penalized: true } : player,
      ),
    );
    setPenaltyAnnouncement(`${target.name}のペナルティを記録しました。`);
  };

  const handleTimerToggle = () => {
    if (isTimerRunning) {
      const deadline = deadlineRef.current;
      if (deadline !== null) {
        const remainingMs = Math.max(0, deadline - Date.now());
        remainingMsRef.current = remainingMs;
        setRemainingSeconds(Math.ceil(remainingMs / 1000));
      }
      deadlineRef.current = null;
      setIsTimerRunning(false);
      return;
    }

    const remainingMs =
      remainingMsRef.current > 0 ? remainingMsRef.current : durationMinutes * 60 * 1000;
    remainingMsRef.current = remainingMs;
    deadlineRef.current = Date.now() + remainingMs;
    setRemainingSeconds(Math.ceil(remainingMs / 1000));
    setHasTimerStarted(true);
    setIsTimerRunning(true);
  };

  const handleResetTimer = () => {
    const durationMs = durationMinutes * 60 * 1000;
    deadlineRef.current = null;
    remainingMsRef.current = durationMs;
    setIsTimerRunning(false);
    setHasTimerStarted(false);
    setRemainingSeconds(durationMinutes * 60);
  };

  const handleFinishMeeting = () => {
    deadlineRef.current = null;
    setIsTimerRunning(false);
    setPenaltyAnnouncement('');
    setPhase('results');
  };

  const handleReplay = () => {
    const previousWords = players.map((player) => player.ngWord);
    const nextPlayers = buildPlayers(playerCount, previousWords);
    const nextTopic = pickTopic(topic.title);
    deadlineRef.current = null;
    remainingMsRef.current = durationMinutes * 60 * 1000;
    setIsTimerRunning(false);
    setHasTimerStarted(false);
    setPenaltyAnnouncement('');
    setPlayers(nextPlayers);
    setCurrentPlayerIndex(0);
    setRemainingSeconds(durationMinutes * 60);
    setTopic(nextTopic);
    setPhase('pass');
  };

  const handleBackToSetup = () => {
    deadlineRef.current = null;
    remainingMsRef.current = durationMinutes * 60 * 1000;
    setIsTimerRunning(false);
    setHasTimerStarted(false);
    setPenaltyAnnouncement('');
    setPlayers([]);
    setCurrentPlayerIndex(0);
    setRemainingSeconds(durationMinutes * 60);
    setPhase('setup');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {PHASE_ANNOUNCEMENTS[phase]}
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {penaltyAnnouncement}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div>
          <p className="paper-kicker">NG Word Meeting</p>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            言ってはいけない言葉で乗り切る、1台の会議サバイバル。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="border border-[var(--line-strong)] bg-[var(--paper-strong)] px-2 py-1 font-label text-[9px] text-[var(--accent)]">
            {PHASE_LABELS[phase]}
          </span>
          <span className="border border-[var(--line)] px-2 py-1 font-label text-[9px] text-[var(--ink-soft)]">
            {playerCount} PLAYERS
          </span>
          <span className="border border-[var(--line)] px-2 py-1 font-label text-[9px] text-[var(--ink-soft)]">
            {durationMinutes} MIN
          </span>
        </div>
      </div>

      {phase === 'setup' && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="paper-panel p-4 sm:p-6" aria-labelledby="ng-setup-heading">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="paper-kicker">Meeting Setup</p>
                <h2
                  id="ng-setup-heading"
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-editorial mt-2 text-2xl outline-none sm:text-3xl"
                >
                  会議の設定
                </h2>
              </div>
              <span className="shrink-0 border border-[var(--line-strong)] px-2 py-1 font-label text-[9px] text-[var(--ink-soft)]">
                STEP 01
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
              人数・制限時間・議題を決めて、全員に秘密のNGワードを配ります。
            </p>

            <fieldset className="mt-5">
              <legend className="font-label text-[10px] font-bold">参加人数</legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PLAYER_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={playerCount === count}
                    onClick={() => setPlayerCount(count)}
                    className="paper-chip min-h-11 min-w-11 flex-1 px-2 text-sm font-black"
                  >
                    {count}人
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="font-label text-[10px] font-bold">会議時間</legend>
              <div className="mt-2 flex gap-2">
                {DURATION_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    aria-pressed={durationMinutes === minutes}
                    onClick={() => setDurationMinutes(minutes)}
                    className="paper-chip min-h-11 flex-1 px-3 text-sm font-black"
                  >
                    {minutes}分
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-label text-[10px] font-bold">今回の議題</p>
                <span className="font-label text-[9px] text-[var(--ink-soft)]">RANDOM AGENDA</span>
              </div>
              <div className="mt-2 border border-[var(--line)] border-l-4 border-l-[var(--teal)] bg-[var(--paper-muted)] p-4">
                <p className="font-editorial text-lg leading-snug break-words">{topic.title}</p>
                <p className="mt-2 text-xs leading-6 break-words text-[var(--ink-soft)]">{topic.hint}</p>
              </div>
              <button
                type="button"
                onClick={handleRerollTopic}
                className="paper-button mt-2 min-h-11 w-full px-4 text-xs"
              >
                別の議題にする
              </button>
            </div>

            <button
              type="button"
              onClick={handleStartGame}
              className="paper-button-primary mt-5 min-h-12 w-full px-5 text-sm"
            >
              会議をはじめる
            </button>
            <p className="mt-2 text-center text-[11px] leading-5 text-[var(--ink-soft)]">
              登録不要・通信なし。端末1台をみんなで回して遊びます。
            </p>
          </section>

          <aside className="paper-panel-flat h-fit border-t-4 border-t-[var(--teal)] p-4 sm:p-6">
            <p className="paper-kicker">Rule Book</p>
            <h2 className="font-editorial mt-2 text-xl">会議のルール</h2>
            <ol className="mt-4 space-y-3">
              <li className="flex gap-3">
                <span className="font-label flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] text-[10px] font-bold text-[var(--accent)]">
                  01
                </span>
                <div>
                  <p className="text-sm font-bold">NGワードは自分だけ見る</p>
                  <p className="mt-0.5 text-xs leading-6 text-[var(--ink-soft)]">
                    端末を回して、自分のNGワードだけをこっそり確認します。
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-label flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] text-[10px] font-bold text-[var(--accent)]">
                  02
                </span>
                <div>
                  <p className="text-sm font-bold">議題に沿って会議する</p>
                  <p className="mt-0.5 text-xs leading-6 text-[var(--ink-soft)]">
                    制限時間内に結論を出しながら、自分のNGワードを避けます。
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-label flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] text-[10px] font-bold text-[var(--accent)]">
                  03
                </span>
                <div>
                  <p className="text-sm font-bold">言ったら申告する</p>
                  <p className="mt-0.5 text-xs leading-6 text-[var(--ink-soft)]">
                    NGワードを口にしたら、自分のカードを押して1回だけ記録します。
                  </p>
                </div>
              </li>
            </ol>
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <p className="font-label text-[9px] text-[var(--accent)]">Honor System</p>
              <p className="mt-1.5 text-xs leading-6 text-[var(--ink-soft)]">
                ペナルティは自己申告が基本。本人が言い出せないときは、周囲が代わりにカードを押してもかまいません。記録は1人1回だけです。
              </p>
            </div>
            <div className="mt-4 border border-dashed border-[var(--line-strong)] bg-[var(--paper-strong)] p-3">
              <p className="text-xs font-bold">プライバシー</p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                NGワードは結果画面まで本人だけの秘密。名前・NGワードは保存されず、ページを閉じると消えます。
              </p>
            </div>
          </aside>
        </div>
      )}

      {phase === 'pass' && activePlayer && (
        <section className="paper-panel p-5 text-center sm:p-9" aria-labelledby="ng-pass-heading">
          <div className="mx-auto max-w-xl">
            <p className="paper-kicker">Secret Distribution</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5" aria-hidden="true">
              {players.map((player, index) => (
                <span
                  key={player.id}
                  className={`h-1.5 w-7 ${
                    index < currentPlayerIndex
                      ? 'bg-[var(--teal)]'
                      : index === currentPlayerIndex
                        ? 'bg-[var(--accent)]'
                        : 'bg-[var(--line)]'
                  }`}
                />
              ))}
            </div>
            <p className="mt-4 font-label text-[10px] text-[var(--ink-soft)]">
              PLAYER {formatPlayerNumber(currentPlayerIndex + 1)} / {formatPlayerNumber(players.length)}
            </p>
            <div className="mx-auto mt-5 flex h-20 w-20 items-center justify-center border-2 border-[var(--ink)] bg-[var(--paper-muted)]">
              <span className="font-editorial text-3xl">{currentPlayerIndex + 1}</span>
            </div>
            <h2
              id="ng-pass-heading"
              ref={headingRef}
              tabIndex={-1}
              className="font-editorial mt-5 text-2xl leading-tight outline-none sm:text-3xl"
            >
              {activePlayer.name} さんに端末を渡してください
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              画面をのぞかれないよう、端末をしっかり持ってから進んでください。
            </p>
            <button
              type="button"
              onClick={handleRevealWord}
              className="paper-button-primary mt-6 min-h-12 w-full px-6 text-sm sm:w-auto"
            >
              自分のNGワードを見る
            </button>
            <p className="mt-3 font-label text-[9px] text-[var(--ink-soft)]">KEEP THE SCREEN PRIVATE</p>
          </div>
        </section>
      )}

      {phase === 'reveal' && activePlayer && (
        <section className="paper-panel p-5 text-center sm:p-9" aria-labelledby="ng-reveal-heading">
          <div className="mx-auto max-w-xl">
            <p className="paper-kicker">Your Secret Word</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5" aria-hidden="true">
              {players.map((player, index) => (
                <span
                  key={player.id}
                  className={`h-1.5 w-7 ${
                    index < currentPlayerIndex
                      ? 'bg-[var(--teal)]'
                      : index === currentPlayerIndex
                        ? 'bg-[var(--accent)]'
                        : 'bg-[var(--line)]'
                  }`}
                />
              ))}
            </div>
            <p className="mt-4 font-label text-[10px] text-[var(--ink-soft)]">
              PLAYER {formatPlayerNumber(currentPlayerIndex + 1)} / {formatPlayerNumber(players.length)}
            </p>
            <h2
              id="ng-reveal-heading"
              ref={headingRef}
              tabIndex={-1}
              className="font-editorial mt-2 text-2xl outline-none"
            >
              あなたのNGワード
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              この言葉を言わずに会議を乗り切ってください。
            </p>
            <div className="mt-5 border-2 border-[var(--ink)] bg-[var(--paper-muted)] px-4 py-6 shadow-[4px_4px_0_var(--paper-shadow)]">
              <p className="font-label text-[9px] text-[var(--accent)]">NG WORD</p>
              <p className="font-editorial mt-2 break-words text-3xl leading-tight sm:text-5xl">
                {activePlayer.ngWord}
              </p>
            </div>
            <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
              覚えたらすぐに隠してください。次の人はこの画面を見られません。
            </p>
            <button
              type="button"
              onClick={handleHideWord}
              className="paper-button-primary mt-6 min-h-12 w-full px-6 text-sm sm:w-auto"
            >
              {currentPlayerIndex >= players.length - 1 ? '隠して会議を始める' : '隠して次の人へ'}
            </button>
            <p className="mt-3 font-label text-[9px] text-[var(--ink-soft)]">DO NOT SHOW OTHERS</p>
          </div>
        </section>
      )}

      {phase === 'meeting' && (
        <div className="space-y-3 sm:space-y-4">
          <section className="paper-panel p-4 sm:p-5" aria-labelledby="ng-agenda-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="paper-kicker">Today&apos;s Agenda</p>
                <h2
                  id="ng-agenda-heading"
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-editorial mt-1.5 text-xl leading-snug break-words outline-none sm:text-2xl"
                >
                  {topic.title}
                </h2>
              </div>
              <span className="shrink-0 border border-[var(--line-strong)] bg-[var(--paper-muted)] px-2 py-1 font-label text-[9px] text-[var(--ink-soft)]">
                MEETING IN SESSION
              </span>
            </div>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{topic.hint}</p>
          </section>

          <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
            <section className="paper-panel p-4 sm:p-5" aria-labelledby="ng-timer-heading">
              <p id="ng-timer-heading" className="font-label text-[10px] text-[var(--ink-soft)]">
                TIME REMAINING
              </p>
              <p
                role="timer"
                aria-label={`残り時間 ${formatClock(remainingSeconds)}`}
                className={`font-editorial mt-1 text-5xl leading-none tabular-nums sm:text-6xl ${
                  remainingSeconds <= 10 ? 'text-[var(--accent)]' : 'text-[var(--ink)]'
                }`}
              >
                {formatClock(remainingSeconds)}
              </p>
              <div
                className="mt-3 h-2 border border-[var(--line-strong)] bg-[var(--paper-muted)]"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-[var(--accent)] transition-[width] duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleTimerToggle}
                  className="paper-button-primary min-h-12 flex-1 px-4 text-sm"
                >
                  {isTimerRunning
                    ? '一時停止'
                    : remainingSeconds === 0
                      ? 'もう一度'
                      : hasTimerStarted
                        ? '再開'
                        : 'スタート'}
                </button>
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="paper-button min-h-12 px-4 text-sm"
                >
                  リセット
                </button>
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--ink-soft)]" aria-live="polite">
                {timerStatusCopy}
              </p>
              <div className="sr-only" aria-live="polite" aria-atomic="true">
                {timerMilestone}
              </div>
            </section>

            <section className="paper-panel-flat border-l-4 border-l-[var(--gold)] p-4 sm:p-5">
              <p className="paper-kicker">Your Mission</p>
              <h2 className="font-editorial mt-1.5 text-lg leading-snug sm:text-xl">
                自分のNGワードを言わずに会議を乗り切る
              </h2>
              <div className="mt-3 space-y-3 text-xs leading-6 text-[var(--ink-soft)]">
                <p>
                  NGワードは結果画面まで秘密。会話の中でうっかり口にしないように注意してください。
                </p>
                <div className="border-t border-[var(--line)] pt-3">
                  <p className="font-bold text-[var(--ink)]">ペナルティは自己申告制</p>
                  <p className="mt-1">
                    言ってしまったら、本人が自分のカードの「言ってしまった」を押します。周囲が気づいた場合は代わりに押してもOKです。
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="paper-panel p-4 sm:p-5" aria-labelledby="ng-players-heading">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="paper-kicker">Participants</p>
                <h2 id="ng-players-heading" className="font-editorial mt-1 text-xl">
                  参加者
                </h2>
              </div>
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                申告済み {penalizedPlayers.length} / {players.length}
              </p>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
              本人の自己申告でも、周囲の「言ったかも」でも、その人のカードをタップ。NGワードは表示されません。
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {players.map((player, index) => (
                <article
                  key={player.id}
                  className={`paper-panel-flat border-l-4 p-3.5 ${
                    PLAYER_TONE_CLASSES[index % PLAYER_TONE_CLASSES.length]
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-label text-[9px] text-[var(--ink-soft)]">
                        PLAYER {formatPlayerNumber(index + 1)}
                      </p>
                      <h3 className="mt-1 text-sm font-black">{player.name}</h3>
                    </div>
                    <span
                      className={`shrink-0 border px-2 py-1 font-label text-[8px] ${
                        player.penalized
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--teal)] bg-[var(--paper-strong)] text-[var(--teal)]'
                      }`}
                    >
                      {player.penalized ? 'PENALTY' : 'IN MEETING'}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    {player.penalized
                      ? 'ペナルティを記録しました。結果画面でNGワードを公開します。'
                      : 'NGワードは結果まで非公開です。'}
                  </p>
                  <button
                    type="button"
                    onClick={() => handlePenalty(player.id)}
                    disabled={player.penalized}
                    aria-label={
                      player.penalized
                        ? `${player.name}のペナルティは記録済みです`
                        : `${player.name}がNGワードを言ってしまったと記録する`
                    }
                    className={`mt-3 min-h-11 w-full border px-3 text-xs font-bold transition-colors ${
                      player.penalized
                        ? 'cursor-not-allowed border-[var(--line)] bg-[var(--paper-muted)] text-[var(--ink-soft)] opacity-70'
                        : 'border-[var(--accent)] bg-[var(--paper-strong)] text-[var(--accent)] shadow-[2px_2px_0_var(--paper-shadow)] hover:bg-[var(--accent-soft)]'
                    }`}
                  >
                    {player.penalized ? '記録済み' : '言ってしまった'}
                  </button>
                </article>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
                時間が来たら、または会議が終わったら結果を確認できます。
              </p>
              <button
                type="button"
                onClick={handleFinishMeeting}
                className="paper-button-primary min-h-12 w-full px-5 text-sm sm:w-auto"
              >
                会議を終了して結果を見る
              </button>
            </div>
          </section>
        </div>
      )}

      {phase === 'results' && players.length > 0 && (
        <div className="space-y-4 sm:space-y-5">
          <section className="paper-panel p-4 sm:p-6" aria-labelledby="ng-result-heading">
            <div className="grid gap-5 md:grid-cols-[1fr_0.8fr] md:items-center">
              <div>
                <p className="paper-kicker">Final Report</p>
                <h2
                  id="ng-result-heading"
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-editorial mt-2 text-2xl outline-none sm:text-3xl"
                >
                  会議結果
                </h2>
                <p className="mt-2 text-sm leading-6 break-words text-[var(--ink-soft)]">
                  議題: {topic.title}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="border border-[var(--teal)] bg-[var(--paper-strong)] px-2 py-1 font-label text-[9px] text-[var(--teal)]">
                    SURVIVORS {survivors.length}
                  </span>
                  <span className="border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-1 font-label text-[9px] text-[var(--accent)]">
                    PENALTIES {penalizedPlayers.length}
                  </span>
                </div>
              </div>
              <div
                className="border-t border-[var(--line)] pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="font-label text-[10px] text-[var(--ink-soft)]">会議スコア</p>
                <p className="font-editorial mt-1 text-5xl leading-none sm:text-6xl">
                  {score}
                  <span className="ml-1 font-label text-sm text-[var(--ink-soft)]">/ 100</span>
                </p>
                <p className="mt-2 text-sm font-bold">
                  {getScoreCopy(score, players.length, survivors.length)}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                  生存者 {survivors.length} / {players.length} 人
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="ng-survivors-heading">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--line)] pb-2">
              <h3 id="ng-survivors-heading" className="font-editorial text-xl">
                生存者
              </h3>
              <span className="font-label text-[9px] text-[var(--teal)]">NO PENALTY</span>
            </div>
            {survivors.length > 0 ? (
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {survivors.map((player) => (
                  <ResultCard key={player.id} player={player} />
                ))}
              </div>
            ) : (
              <p className="mt-2 border border-dashed border-[var(--line-strong)] bg-[var(--paper-strong)] p-4 text-sm text-[var(--ink-soft)]">
                生存者はいませんでした。次は全員生存を目指しましょう。
              </p>
            )}
          </section>

          {penalizedPlayers.length > 0 && (
            <section aria-labelledby="ng-penalty-heading">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--line)] pb-2">
                <h3 id="ng-penalty-heading" className="font-editorial text-xl">
                  NGワードを言ってしまった人
                </h3>
                <span className="font-label text-[9px] text-[var(--accent)]">PENALTY</span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {penalizedPlayers.map((player) => (
                  <ResultCard key={player.id} player={player} />
                ))}
              </div>
            </section>
          )}

          <div className="paper-panel-flat flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[var(--ink-soft)]">
              結果は保存されません。同じメンバーで、新しいNGワードと議題に再挑戦できます。
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleReplay}
                className="paper-button-primary min-h-12 px-5 text-sm"
              >
                もう一度会議
              </button>
              <button
                type="button"
                onClick={handleBackToSetup}
                className="paper-button min-h-12 px-5 text-sm"
              >
                設定に戻る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
