'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  WORD_CHAIN_MAX_ANSWER_LENGTH,
  WORD_CHAIN_MAX_NAME_LENGTH,
  WORD_CHAIN_MAX_PLAYERS,
  WORD_CHAIN_MIN_PLAYERS,
  WORD_CHAIN_PLAYER_COUNTS,
  WORD_CHAIN_START_WORDS,
  WORD_CHAIN_TOTAL_ROUNDS,
} from './wordChainData';

type Phase = 'setup' | 'ready' | 'handoff' | 'input' | 'gather' | 'reveal' | 'final';

type Player = {
  id: string;
  name: string;
};

type AnswerGroup = {
  key: string;
  text: string;
  playerIds: string[];
  count: number;
};

type RoundResult = {
  round: number;
  startWord: string;
  groups: AnswerGroup[];
  deltas: Record<string, number>;
  nextStartWord: string | null;
  nextWordFromPopularAnswer: boolean;
};

type RankingEntry = {
  player: Player;
  score: number;
  rank: number;
};

function normalizeText(value: string): string {
  return value
    .trim()
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function countCharacters(value: string): number {
  return Array.from(value).length;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickStartWord(exclude?: string): string {
  const pool = exclude
    ? WORD_CHAIN_START_WORDS.filter((word) => word !== exclude)
    : WORD_CHAIN_START_WORDS;
  return pickRandom(pool);
}

function createZeroScores(players: readonly Player[]): Record<string, number> {
  return players.reduce<Record<string, number>>((scores, player) => {
    scores[player.id] = 0;
    return scores;
  }, {});
}

function buildGroups(answers: Record<string, string>, players: readonly Player[]): AnswerGroup[] {
  const groups = new Map<string, AnswerGroup>();

  players.forEach((player) => {
    const text = answers[player.id];
    if (!text) {
      return;
    }

    const key = normalizeText(text);
    if (!key) {
      return;
    }

    const group = groups.get(key);
    if (group) {
      group.playerIds.push(player.id);
      group.count += 1;
      return;
    }

    groups.set(key, {
      key,
      text,
      playerIds: [player.id],
      count: 1,
    });
  });

  return Array.from(groups.values());
}

function buildRanking(players: readonly Player[], scores: Record<string, number>): RankingEntry[] {
  const sorted = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  let previousScore: number | null = null;
  let previousRank = 0;

  return sorted.map((player, index) => {
    const score = scores[player.id] ?? 0;
    const rank = previousScore === score ? previousRank : index + 1;
    previousScore = score;
    previousRank = rank;

    return { player, score, rank };
  });
}

function getPlayerName(players: readonly Player[], playerId: string): string {
  return players.find((player) => player.id === playerId)?.name ?? 'プレイヤー';
}

function RoundProgress({ round }: { round: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: WORD_CHAIN_TOTAL_ROUNDS }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 w-5 ${index < round ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`}
        />
      ))}
    </div>
  );
}

function Scoreboard({
  players,
  scores,
  deltas,
}: {
  players: readonly Player[];
  scores: Record<string, number>;
  deltas?: Record<string, number>;
}) {
  const ranking = buildRanking(players, scores);

  return (
    <aside className="paper-panel-flat min-w-0 p-5" aria-label="累積スコアボード">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="paper-kicker">SCOREBOARD</p>
        <span className="font-label text-[9px] text-[var(--ink-soft)]">CUMULATIVE</span>
      </div>
      <ol className="mt-3">
        {ranking.map(({ player, score, rank }) => {
          const delta = deltas?.[player.id] ?? 0;

          return (
            <li
              key={player.id}
              className="flex min-w-0 items-center gap-2 border-b border-[var(--line)] py-2.5 last:border-b-0"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--line)] bg-[var(--paper-muted)] font-label text-[9px] text-[var(--ink-soft)]">
                {rank}
              </span>
              <span className="min-w-0 flex-1 break-words text-sm font-bold">{player.name}</span>
              <span className="flex shrink-0 items-baseline gap-1.5">
                {delta > 0 && (
                  <span className="font-label text-[9px] text-[var(--accent)]">+{delta}</span>
                )}
                <span className="font-label text-sm text-[var(--ink)]">
                  {score}
                  <span className="ml-0.5 text-[8px] text-[var(--ink-soft)]">pt</span>
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 border-t border-[var(--line)] pt-2 text-[10px] leading-5 text-[var(--ink-soft)]">
        ユニークな答えは3点、2人以上一致した答えは1点ずつ。
      </p>
    </aside>
  );
}

export function WordChainGame() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: WORD_CHAIN_MAX_PLAYERS }, (_, index) => `プレイヤー${index + 1}`),
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [round, setRound] = useState(1);
  const [startWord, setStartWord] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  const answerInputRef = useRef<HTMLInputElement>(null);
  const answerLockRef = useRef(false);
  const isComposingRef = useRef(false);
  const phaseHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousPhaseRef = useRef<Phase | null>(null);

  const currentPlayer = players[currentPlayerIndex];
  const ranking = buildRanking(players, scores);
  const winners = ranking.filter((entry) => entry.rank === 1);
  const winnerLabel = winners.map((entry) => `${entry.player.name}さん`).join('・');

  const liveMessage =
    phase === 'ready'
      ? `第${round}ラウンド。スタートワードは「${startWord}」です。`
      : phase === 'handoff' && currentPlayer
        ? `${currentPlayerIndex + 1}人目、${currentPlayer.name}さんに端末を渡してください。`
        : phase === 'input' && currentPlayer
          ? `${currentPlayer.name}さんの入力画面です。スタートワードは「${startWord}」です。`
          : phase === 'gather'
            ? '全員の回答がそろいました。答え合わせを始められます。'
            : phase === 'reveal' && roundResult
              ? `第${roundResult.round}ラウンドの答え合わせです。全員の回答を公開しました。ユニークな答えは3点、2人以上一致した答えは1点です。`
              : phase === 'final' && winners.length > 0
                ? `最終結果です。${winners.length > 1 ? '同点優勝' : '優勝'}は${winnerLabel}です。`
                : '';

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    if (phase === 'input') {
      answerLockRef.current = false;
      isComposingRef.current = false;
      answerInputRef.current?.focus();
      return;
    }

    if (previousPhase === null || previousPhase === phase) {
      return;
    }

    phaseHeadingRef.current?.focus();
  }, [phase]);

  function handleCountChange(count: number) {
    setPlayerCount(count);
    setError('');
  }

  function handleNameChange(index: number, value: string) {
    setNames((current) => current.map((name, nameIndex) => (nameIndex === index ? value : name)));
    setError('');
  }

  function handleStartGame() {
    const activeNames = names.slice(0, playerCount).map((name) => name.trim());

    if (activeNames.some((name) => normalizeText(name).length === 0)) {
      setError('すべてのプレイヤー名を入力してください。');
      return;
    }

    if (activeNames.some((name) => countCharacters(name) > WORD_CHAIN_MAX_NAME_LENGTH)) {
      setError(`プレイヤー名は${WORD_CHAIN_MAX_NAME_LENGTH}文字以内で入力してください。`);
      return;
    }

    const uniqueNames = new Set(activeNames.map((name) => normalizeText(name)));
    if (uniqueNames.size !== activeNames.length) {
      setError('同じ名前のプレイヤーがいます。別の名前にしてください。');
      return;
    }

    const nextPlayers = activeNames.map((name, index) => ({
      id: `player-${index + 1}`,
      name,
    }));

    answerLockRef.current = false;
    setPlayers(nextPlayers);
    setScores(createZeroScores(nextPlayers));
    setRound(1);
    setStartWord(pickStartWord());
    setAnswers({});
    setCurrentPlayerIndex(0);
    setRoundResult(null);
    setDraft('');
    setError('');
    setPhase('ready');
  }

  function handleBeginResponses() {
    setCurrentPlayerIndex(0);
    setDraft('');
    setError('');
    setPhase('handoff');
  }

  function handleOpenInput() {
    setDraft('');
    setError('');
    setPhase('input');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isComposingRef.current || phase !== 'input' || !currentPlayer || answerLockRef.current) {
      return;
    }

    const trimmed = draft.trim();
    const normalizedAnswer = normalizeText(trimmed);

    if (normalizedAnswer.length === 0) {
      setError('回答を入力してください。空欄は記録できません。');
      return;
    }

    if (countCharacters(trimmed) > WORD_CHAIN_MAX_ANSWER_LENGTH) {
      setError(`回答は${WORD_CHAIN_MAX_ANSWER_LENGTH}文字以内で入力してください。`);
      return;
    }

    if (normalizedAnswer === normalizeText(startWord)) {
      setError('スタートワードと同じ言葉は使えません。別の連想語を入力してください。');
      return;
    }

    if (answers[currentPlayer.id] !== undefined) {
      setError('このラウンドの回答はすでに記録されています。次の人に端末を渡してください。');
      return;
    }

    answerLockRef.current = true;
    setAnswers((current) => ({ ...current, [currentPlayer.id]: trimmed }));
    setDraft('');
    setError('');

    if (currentPlayerIndex >= players.length - 1) {
      setPhase('gather');
      return;
    }

    setCurrentPlayerIndex((index) => index + 1);
    setPhase('handoff');
  }

  function handleReveal() {
    if (players.length === 0) {
      return;
    }

    const groups = buildGroups(answers, players);
    if (groups.length === 0) {
      setError('有効な回答がありません。最初からやり直してください。');
      return;
    }

    const deltas = createZeroScores(players);
    groups.forEach((group) => {
      const points = group.count === 1 ? 3 : 1;
      group.playerIds.forEach((playerId) => {
        deltas[playerId] = (deltas[playerId] ?? 0) + points;
      });
    });

    const nextScores = { ...scores };
    players.forEach((player) => {
      nextScores[player.id] = (nextScores[player.id] ?? 0) + (deltas[player.id] ?? 0);
    });

    const maxCount = Math.max(...groups.map((group) => group.count));
    const nextWordFromPopularAnswer = maxCount >= 2;
    const nextWordCandidates = nextWordFromPopularAnswer
      ? groups.filter((group) => group.count === maxCount)
      : groups;

    setScores(nextScores);
    setRoundResult({
      round,
      startWord,
      groups,
      deltas,
      nextStartWord:
        round < WORD_CHAIN_TOTAL_ROUNDS ? pickRandom(nextWordCandidates).text : null,
      nextWordFromPopularAnswer,
    });
    setError('');
    setPhase('reveal');
  }

  function handleAdvance() {
    if (!roundResult) {
      return;
    }

    if (roundResult.round >= WORD_CHAIN_TOTAL_ROUNDS || !roundResult.nextStartWord) {
      setPhase('final');
      return;
    }

    answerLockRef.current = false;
    setStartWord(roundResult.nextStartWord);
    setRound(roundResult.round + 1);
    setAnswers({});
    setRoundResult(null);
    setCurrentPlayerIndex(0);
    setDraft('');
    setError('');
    setPhase('ready');
  }

  function handlePlayAgain() {
    if (players.length === 0) {
      return;
    }

    answerLockRef.current = false;
    setScores(createZeroScores(players));
    setRound(1);
    setStartWord(pickStartWord(startWord));
    setAnswers({});
    setCurrentPlayerIndex(0);
    setRoundResult(null);
    setDraft('');
    setError('');
    setPhase('ready');
  }

  function handleChangePlayers() {
    setNames((current) => {
      const next = [...current];
      players.forEach((player, index) => {
        if (index < next.length) {
          next[index] = player.name;
        }
      });
      return next;
    });
    answerLockRef.current = false;
    setPlayerCount(players.length || WORD_CHAIN_PLAYER_COUNTS[0]);
    setPlayers([]);
    setScores({});
    setRound(1);
    setStartWord('');
    setAnswers({});
    setCurrentPlayerIndex(0);
    setRoundResult(null);
    setDraft('');
    setError('');
    setPhase('setup');
  }

  return (
    <section aria-label="連想リレー ゲーム" className="min-w-0">
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
        <p className="paper-kicker">WORD ASSOCIATION RELAY</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="paper-chip px-2.5 py-1 font-label text-[9px]">
            {WORD_CHAIN_MIN_PLAYERS}–{WORD_CHAIN_MAX_PLAYERS} PLAYERS
          </span>
          <span className="paper-chip px-2.5 py-1 font-label text-[9px]">
            {WORD_CHAIN_TOTAL_ROUNDS} ROUNDS
          </span>
          <span className="paper-chip px-2.5 py-1 font-label text-[9px]">SECRET INPUT</span>
        </div>
      </div>

      {phase === 'setup' && (
        <div className="paper-panel min-w-0 p-5 sm:p-7">
          <p className="paper-kicker">SETUP</p>
          <h2
            ref={phaseHeadingRef}
            tabIndex={-1}
            className="font-editorial mt-2 text-2xl text-balance outline-none sm:text-3xl"
          >
            メンバーを決めて、連想をはじめよう
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            {WORD_CHAIN_MIN_PLAYERS}〜{WORD_CHAIN_MAX_PLAYERS}人で遊べます。1台の端末を回して、お題から連想する言葉を1人ずつ秘密に入力してください。
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <div className="border border-[var(--line)] bg-[var(--paper)] p-3">
              <p className="font-label text-[9px] text-[var(--teal)]">UNIQUE</p>
              <p className="font-editorial mt-1 text-xl">3点</p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                だれとも重ならない答え
              </p>
            </div>
            <div className="border border-[var(--line)] bg-[var(--paper)] p-3">
              <p className="font-label text-[9px] text-[var(--accent)]">SHARED</p>
              <p className="font-editorial mt-1 text-xl">1点</p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                2人以上が同じ答えを選んだ場合
              </p>
            </div>
            <div className="border border-[var(--line)] bg-[var(--paper)] p-3">
              <p className="font-label text-[9px] text-[var(--gold)]">RELAY</p>
              <p className="font-editorial mt-1 text-xl">
                {WORD_CHAIN_TOTAL_ROUNDS}ラウンド
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">
                人気の答えが次のお題に
              </p>
            </div>
          </div>

          <fieldset className="mt-6">
            <legend className="font-label text-[10px] text-[var(--ink-soft)]">PLAYER COUNT</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WORD_CHAIN_PLAYER_COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={playerCount === count}
                  onClick={() => handleCountChange(count)}
                  className="paper-chip inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-sm font-bold"
                >
                  {count}人
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: playerCount }, (_, index) => (
              <label key={index} className="block min-w-0">
                <span className="font-label text-[10px] text-[var(--ink-soft)]">
                  PLAYER {String(index + 1).padStart(2, '0')}
                </span>
                <input
                  type="text"
                  value={names[index] ?? ''}
                  onChange={(event) => handleNameChange(index, event.target.value)}
                  maxLength={WORD_CHAIN_MAX_NAME_LENGTH}
                  autoComplete="off"
                  className="field-paper mt-1.5 h-12 px-3 text-base"
                />
              </label>
            ))}
          </div>

          {error && (
            <p role="alert" className="mt-4 border-l-2 border-[var(--accent)] pl-3 text-sm font-bold text-[var(--accent)]">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
              名前と回答は保存・送信されません。空欄やお題と同じ言葉は無効です。
            </p>
            <button
              type="button"
              onClick={handleStartGame}
              className="paper-button-primary min-h-12 w-full px-7 text-sm sm:w-auto"
            >
              ゲームを始める
            </button>
          </div>
        </div>
      )}

      {phase === 'ready' && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="paper-panel min-w-0 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="paper-kicker">ROUND {round} / {WORD_CHAIN_TOTAL_ROUNDS}</p>
              <RoundProgress round={round} />
            </div>
            <p className="mt-6 font-label text-[9px] text-[var(--ink-soft)]">START WORD</p>
            <h2
              ref={phaseHeadingRef}
              tabIndex={-1}
              className="font-editorial mt-2 break-words text-4xl leading-tight text-[var(--accent)] outline-none sm:text-6xl"
            >
              <span className="sr-only">第{round}ラウンドのスタートワード、</span>
              {startWord}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
              この言葉から連想する言葉を、1人ずつ秘密に入力します。全員の答えがそろったら一斉公開です。
            </p>
            <div className="mt-5 border border-[var(--line)] bg-[var(--paper-muted)] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
              ユニークな答えは3点、2人以上一致した答えは1点ずつ。だれとも違う発想を狙いましょう。
            </div>
            <button
              type="button"
              onClick={handleBeginResponses}
              className="paper-button-primary mt-6 min-h-12 w-full px-6 text-sm sm:w-auto"
            >
              1人目の入力へ
            </button>
          </div>
          <Scoreboard players={players} scores={scores} />
        </div>
      )}

      {phase === 'handoff' && currentPlayer && (
        <div className="paper-panel mx-auto max-w-xl min-w-0 p-6 text-center sm:p-8">
          <p className="paper-kicker">PASS THE DEVICE</p>
          <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] font-editorial text-2xl">
            {currentPlayerIndex + 1}
          </div>
          <h2
            ref={phaseHeadingRef}
            tabIndex={-1}
            className="font-editorial mt-4 break-words text-2xl outline-none sm:text-3xl"
          >
            {currentPlayer.name}さんへ
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            端末を渡してください。前の人の回答と、ほかの人の入力内容は表示されません。
          </p>
          <div className="mt-5 border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
            お題は「{startWord}」。回答はこの端末内だけで集計されます。
          </div>
          <button
            type="button"
            onClick={handleOpenInput}
            className="paper-button-primary mt-6 min-h-12 w-full px-8 text-sm sm:w-auto"
          >
            入力画面へ
          </button>
        </div>
      )}

      {phase === 'input' && currentPlayer && (
        <div className="paper-panel mx-auto max-w-xl min-w-0 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="paper-kicker">SECRET INPUT</p>
            <span className="paper-chip px-3 py-1 font-label text-[9px]">
              {currentPlayer.name}さん
            </span>
          </div>

          <p className="mt-5 font-label text-[9px] text-[var(--ink-soft)]">START WORD</p>
          <p className="font-editorial mt-1 break-words text-3xl text-[var(--accent)]">{startWord}</p>

          <form onSubmit={handleSubmit} className="mt-6">
            <label
              htmlFor="word-chain-answer"
              className="block font-label text-[10px] text-[var(--ink-soft)]"
            >
              ASSOCIATION / 連想する言葉
            </label>
            <input
              id="word-chain-answer"
              ref={answerInputRef}
              type="text"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (error) {
                  setError('');
                }
              }}
              maxLength={WORD_CHAIN_MAX_ANSWER_LENGTH}
              autoComplete="off"
              enterKeyHint="done"
              aria-invalid={Boolean(error)}
              aria-describedby={
                error
                  ? 'word-chain-help word-chain-count word-chain-error'
                  : 'word-chain-help word-chain-count'
              }
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
              placeholder="例：ホワイトボード"
              className="field-paper mt-2 h-14 px-4 text-lg"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ink-soft)]">
              <span id="word-chain-help">空欄は無効です。お題と同じ言葉も使えません。</span>
              <span id="word-chain-count" className="font-label text-[10px]">
                {countCharacters(draft)} / {WORD_CHAIN_MAX_ANSWER_LENGTH}
              </span>
            </div>

            {error && (
              <p
                id="word-chain-error"
                role="alert"
                className="mt-3 border-l-2 border-[var(--accent)] pl-3 text-sm font-bold text-[var(--accent)]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="paper-button-primary mt-5 min-h-12 w-full px-6 text-sm"
            >
              回答を保存して次へ
            </button>
          </form>

          <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
            入力した言葉は次の人の画面には表示されません。全員が入力し終わるまで秘密です。
          </p>
        </div>
      )}

      {phase === 'gather' && (
        <div className="paper-panel mx-auto max-w-xl min-w-0 p-6 text-center sm:p-8">
          <p className="paper-kicker">ALL ANSWERS IN</p>
          <h2
            ref={phaseHeadingRef}
            tabIndex={-1}
            className="font-editorial mt-3 text-2xl text-balance outline-none sm:text-3xl"
          >
            全員の回答がそろいました
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            端末を中央に置いて、答え合わせを始めましょう。
          </p>
          {error && (
            <p
              role="alert"
              className="mt-4 border-l-2 border-[var(--accent)] pl-3 text-sm font-bold text-[var(--accent)]"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleReveal}
            className="paper-button-primary mt-6 min-h-12 w-full px-8 text-sm sm:w-auto"
          >
            全員の答えを公開する
          </button>
        </div>
      )}

      {phase === 'reveal' && roundResult && (
        <div className="space-y-4">
          <div className="paper-panel min-w-0 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="paper-kicker">
                ROUND {roundResult.round} / {WORD_CHAIN_TOTAL_ROUNDS} RESULTS
              </p>
              <span className="paper-chip px-3 py-1 text-[11px] font-bold">
                お題「{roundResult.startWord}」
              </span>
            </div>

            <h2
              ref={phaseHeadingRef}
              tabIndex={-1}
              className="font-editorial mt-4 text-2xl text-balance outline-none sm:text-3xl"
            >
              みんなの連想
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
              ユニークな答えは3点、2人以上一致した答えは1点ずつです。今回の獲得点もスコアボードに表示しています。
            </p>

            <ul className="mt-5 space-y-3">
              {roundResult.groups.map((group) => (
                <li
                  key={group.key}
                  className="border border-[var(--line)] bg-[var(--paper)] p-4"
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <p className="font-editorial min-w-0 break-words text-xl sm:text-2xl">
                      {group.text}
                    </p>
                    <span
                      className={`shrink-0 border px-2.5 py-1 font-label text-[9px] font-bold ${
                        group.count === 1
                          ? 'border-[var(--teal)] text-[var(--teal)]'
                          : 'border-[var(--gold)] text-[var(--accent)]'
                      }`}
                    >
                      {group.count === 1 ? 'ユニーク +3' : `${group.count}人一致 +1`}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group.playerIds.map((playerId) => (
                      <span
                        key={playerId}
                        className="border border-[var(--line)] bg-[var(--paper-strong)] px-2 py-1 text-[11px] text-[var(--ink-soft)]"
                      >
                        {getPlayerName(players, playerId)}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="min-w-0">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">
                  {roundResult.round >= WORD_CHAIN_TOTAL_ROUNDS ? 'FINAL' : 'NEXT START WORD'}
                </p>
                {roundResult.round < WORD_CHAIN_TOTAL_ROUNDS && roundResult.nextStartWord ? (
                  <>
                    <p className="font-editorial mt-1 break-words text-2xl text-[var(--accent)]">
                      {roundResult.nextStartWord}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
                      {roundResult.nextWordFromPopularAnswer
                        ? 'いちばん多く選ばれた答えを、次のスタートワードにします。'
                        : '全員の答えがユニークだったため、回答からランダムに選びました。'}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm font-bold">
                    全{WORD_CHAIN_TOTAL_ROUNDS}ラウンドの答え合わせが完了しました。
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleAdvance}
                className="paper-button-primary min-h-12 w-full px-6 text-sm sm:w-auto"
              >
                {roundResult.round >= WORD_CHAIN_TOTAL_ROUNDS ? '最終結果を見る' : '次のラウンドへ'}
              </button>
            </div>
          </div>

          <Scoreboard players={players} scores={scores} deltas={roundResult.deltas} />
        </div>
      )}

      {phase === 'final' && (
        <div className="space-y-4">
          <div className="paper-panel min-w-0 p-6 text-center sm:p-8">
            <p className="paper-kicker">FINAL RESULT / {WORD_CHAIN_TOTAL_ROUNDS} ROUNDS</p>
            <h2
              ref={phaseHeadingRef}
              tabIndex={-1}
              className="font-editorial mt-3 text-3xl outline-none sm:text-4xl"
            >
              {winners.length > 1 ? '同点優勝' : '優勝'}
            </h2>
            <p className="font-editorial mt-2 break-words text-2xl leading-snug text-[var(--accent)]">
              {winnerLabel}
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              全{WORD_CHAIN_TOTAL_ROUNDS}ラウンド、おつかれさまでした。ユニークな連想が光った人の勝ちです。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handlePlayAgain}
                className="paper-button-primary min-h-12 px-8 text-sm"
              >
                もう一度遊ぶ
              </button>
              <button
                type="button"
                onClick={handleChangePlayers}
                className="paper-button min-h-12 px-8 text-sm"
              >
                メンバーを変更
              </button>
            </div>
          </div>

          <div className="paper-panel-flat min-w-0 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="paper-kicker">FINAL RANKING</p>
              <span className="font-label text-[9px] text-[var(--ink-soft)]">
                {WORD_CHAIN_TOTAL_ROUNDS} ROUNDS TOTAL
              </span>
            </div>
            <ol className="mt-3 space-y-2">
              {ranking.map(({ player, score, rank }) => (
                <li
                  key={player.id}
                  className={`flex min-w-0 items-center gap-3 border px-3 py-3 ${
                    rank === 1
                      ? 'border-[var(--gold)] bg-[var(--accent-soft)]'
                      : 'border-[var(--line)] bg-[var(--paper)]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center border font-label text-xs font-bold ${
                      rank === 1
                        ? 'border-[var(--gold)] bg-[var(--paper-strong)] text-[var(--accent)]'
                        : 'border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink-soft)]'
                    }`}
                  >
                    {rank}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-sm font-bold">{player.name}</span>
                  <span className="shrink-0 font-label text-sm text-[var(--ink)]">
                    {score}
                    <span className="ml-0.5 text-[8px] text-[var(--ink-soft)]">pt</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
