'use client';

import { useEffect, useRef, useState } from 'react';
import { RANK_PROMPTS, type RankPrompt } from './rankGuessData';

type Phase = 'secretHandoff' | 'secret' | 'guessHandoff' | 'guess' | 'reveal' | 'scoreboard';

type Player = {
  id: number;
  name: string;
  score: number;
};

type RoundResult = {
  matches: number;
  matchPositions: boolean[];
  bossPoints: number;
  teamPoints: number;
  trueOrder: number[];
  guessedOrder: number[];
};

type GameState = {
  phase: Phase;
  round: number;
  players: Player[];
  deck: RankPrompt[];
  secretOrder: number[];
  bossOrder: number[] | null;
  guessOrder: number[];
  result: RoundResult | null;
};

type RankedPlayer = Player & {
  rank: number;
};

const ROUNDS = 3;
const MAX_PLAYERS = 8;
const PLAYER_COUNTS = [3, 4, 5, 6, 7, 8] as const;
const INITIAL_ORDER = [0, 1, 2, 3] as const;
const DEFAULT_NAMES = Array.from({ length: MAX_PLAYERS }, (_, index) => `プレイヤー${index + 1}`);
const MAX_NAME_LENGTH = 16;

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

function createGame(names: string[]): GameState {
  return {
    phase: 'secretHandoff',
    round: 0,
    players: names.map((name, index) => ({ id: index + 1, name, score: 0 })),
    deck: shuffle(RANK_PROMPTS).slice(0, ROUNDS),
    secretOrder: [...INITIAL_ORDER],
    bossOrder: null,
    guessOrder: [...INITIAL_ORDER],
    result: null,
  };
}

function moveOrder(order: number[], index: number, direction: -1 | 1): number[] {
  const target = index + direction;
  if (target < 0 || target >= order.length) {
    return order;
  }
  const next = [...order];
  const current = next[index];
  next[index] = next[target];
  next[target] = current;
  return next;
}

function rankPlayers(players: Player[]): RankedPlayer[] {
  const sorted = [...players].sort((left, right) => right.score - left.score || left.id - right.id);
  let previousScore: number | null = null;
  let currentRank = 0;

  return sorted.map((player, index) => {
    if (player.score !== previousScore) {
      currentRank = index + 1;
      previousScore = player.score;
    }
    return { ...player, rank: currentRank };
  });
}

function getBoss(game: GameState): Player {
  return game.players[game.round % game.players.length];
}

function getLiveMessage(game: GameState | null): string {
  if (!game) {
    return 'ゲーム設定です。プレイヤー人数と名前を決めて、ゲームを始めてください。';
  }

  const boss = getBoss(game);
  const roundLabel = `第${game.round + 1}ラウンド`;

  switch (game.phase) {
    case 'secretHandoff':
      return `${roundLabel}。社長は${boss.name}さんです。端末を社長に渡してください。`;
    case 'secret':
      return `${roundLabel}、社長専用の順位入力画面です。`;
    case 'guessHandoff':
      return `${roundLabel}。社長の順位が確定しました。端末をグループに渡してください。`;
    case 'guess':
      return `${roundLabel}、みんなの予想入力画面です。`;
    case 'reveal':
      return game.result
        ? `${roundLabel}の結果発表。一致は${game.result.matches}か所。予想チームの各メンバーに${game.result.teamPoints}点、社長に${game.result.bossPoints}点が入りました。`
        : `${roundLabel}の結果発表です。`;
    case 'scoreboard': {
      const ranked = rankPlayers(game.players);
      const scores = ranked.map((player) => `${player.name}${player.score}点`).join('、');
      if (game.round >= ROUNDS - 1) {
        const topScore = ranked[0]?.score ?? 0;
        const winners = ranked.filter((player) => player.score === topScore);
        const winnerNames = winners.map((player) => `${player.name}さん`).join('、');
        const winnerLabel = winners.length > 1 ? '同率優勝' : '優勝';
        return `最終結果。${winnerLabel}は${winnerNames}。得点は${scores}です。`;
      }
      return `${roundLabel}終了。現在の得点は${scores}です。`;
    }
    default:
      return '';
  }
}

function RankingEditor({
  prompt,
  order,
  label,
  onMove,
}: {
  prompt: RankPrompt;
  order: number[];
  label: string;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <ol className="mt-4 space-y-2" aria-label={label}>
      {order.map((optionIndex, position) => {
        const option = prompt.options[optionIndex];
        return (
          <li
            key={optionIndex}
            className="flex items-center gap-2 border border-[var(--line)] bg-[var(--paper-strong)] p-2 sm:gap-3 sm:p-3"
          >
            <span
              className={`font-label flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--line-strong)] text-[11px] font-bold ${
                position === 0
                  ? 'bg-[var(--accent)] text-[var(--paper-strong)]'
                  : 'bg-[var(--ink)] text-[var(--paper)]'
              }`}
            >
              {position + 1}
            </span>
            <span className="min-w-0 flex-1 break-words text-sm font-bold leading-6">{option}</span>
            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onMove(position, -1)}
                disabled={position === 0}
                className="paper-button h-11 w-11 text-base"
                aria-label={`${option}を上へ移動`}
              >
                <span aria-hidden="true">↑</span>
              </button>
              <button
                type="button"
                onClick={() => onMove(position, 1)}
                disabled={position === order.length - 1}
                className="paper-button h-11 w-11 text-base"
                aria-label={`${option}を下へ移動`}
              >
                <span aria-hidden="true">↓</span>
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ResultOrder({
  heading,
  subheading,
  prompt,
  order,
  matchPositions,
}: {
  heading: string;
  subheading: string;
  prompt: RankPrompt;
  order: number[];
  matchPositions: boolean[];
}) {
  return (
    <section className="border border-[var(--line)] bg-[var(--paper-strong)] p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] pb-2">
        <h3 className="font-editorial text-lg">{heading}</h3>
        <span className="font-label text-[9px] text-[var(--ink-soft)]">{subheading}</span>
      </div>
      <ol className="mt-2 space-y-1.5">
        {order.map((optionIndex, position) => {
          const matched = matchPositions[position] === true;
          return (
            <li
              key={`${optionIndex}-${position}`}
              className={`flex items-start gap-2 border p-2 ${
                matched
                  ? 'border-[var(--teal)] bg-[var(--paper-muted)]'
                  : 'border-transparent'
              }`}
            >
              <span
                className={`font-label flex h-8 w-8 shrink-0 items-center justify-center border text-[10px] font-bold ${
                  matched
                    ? 'border-[var(--teal)] bg-[var(--teal)] text-[var(--paper-strong)]'
                    : 'border-[var(--line-strong)] bg-[var(--ink)] text-[var(--paper)]'
                }`}
              >
                {position + 1}
              </span>
              <span className="min-w-0 flex-1 break-words text-sm leading-6">{prompt.options[optionIndex]}</span>
              {matched && (
                <span className="font-label shrink-0 pt-1 text-[9px] text-[var(--teal)]">一致</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function RoundHeader({ game, boss }: { game: GameState; boss: Player }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
      <div className="min-w-0">
        <p className="paper-kicker">
          Round {padNumber(game.round + 1)} / {ROUNDS}
        </p>
        <p className="font-editorial mt-1 break-words text-xl leading-tight">
          社長は {boss.name} さん
        </p>
      </div>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: ROUNDS }, (_, index) => (
          <span
            key={index}
            className={`h-2.5 w-9 border ${
              index <= game.round
                ? 'border-[var(--accent)] bg-[var(--accent)]'
                : 'border-[var(--line-strong)] bg-[var(--paper-muted)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function RankGuessGame() {
  const [playerCount, setPlayerCount] = useState(4);
  const [setupNames, setSetupNames] = useState<string[]>([...DEFAULT_NAMES]);
  const [setupError, setSetupError] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const gamePanelRef = useRef<HTMLElement>(null);
  const setupHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasStartedRef = useRef(false);
  const phase = game?.phase;
  const round = game?.round;

  useEffect(() => {
    if (!phase || round === undefined) {
      if (hasStartedRef.current) {
        setupHeadingRef.current?.focus();
      }
      return;
    }
    hasStartedRef.current = true;
    const heading = gamePanelRef.current?.querySelector<HTMLHeadingElement>('h2');
    heading?.focus();
  }, [phase, round]);

  function handlePlayerCountChange(count: number) {
    setPlayerCount(count);
    setSetupError('');
  }

  function handleNameChange(index: number, value: string) {
    setSetupNames((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
    setSetupError('');
  }

  function handleStart() {
    const names = Array.from({ length: playerCount }, (_, index) => {
      const trimmed = (setupNames[index] ?? '').trim().slice(0, MAX_NAME_LENGTH);
      return trimmed || DEFAULT_NAMES[index];
    });

    if (new Set(names).size !== names.length) {
      setSetupError('同じ名前のプレイヤーがいます。区別できる名前にしてください。');
      return;
    }

    setSetupError('');
    setGame(createGame(names));
  }

  function openSecret() {
    setGame((previous) =>
      previous?.phase === 'secretHandoff'
        ? { ...previous, phase: 'secret', secretOrder: [...INITIAL_ORDER] }
        : previous,
    );
  }

  function moveSecret(index: number, direction: -1 | 1) {
    setGame((previous) =>
      previous?.phase === 'secret'
        ? { ...previous, secretOrder: moveOrder(previous.secretOrder, index, direction) }
        : previous,
    );
  }

  function confirmSecret() {
    setGame((previous) =>
      previous?.phase === 'secret'
        ? {
            ...previous,
            phase: 'guessHandoff',
            bossOrder: [...previous.secretOrder],
            secretOrder: [...INITIAL_ORDER],
          }
        : previous,
    );
  }

  function openGuess() {
    setGame((previous) =>
      previous?.phase === 'guessHandoff'
        ? { ...previous, phase: 'guess', guessOrder: [...INITIAL_ORDER] }
        : previous,
    );
  }

  function moveGuess(index: number, direction: -1 | 1) {
    setGame((previous) =>
      previous?.phase === 'guess'
        ? { ...previous, guessOrder: moveOrder(previous.guessOrder, index, direction) }
        : previous,
    );
  }

  function confirmGuess() {
    setGame((previous) => {
      if (!previous || previous.phase !== 'guess' || !previous.bossOrder) {
        return previous;
      }

      const bossOrder = previous.bossOrder;
      const boss = getBoss(previous);
      const matchPositions = previous.guessOrder.map(
        (optionIndex, position) => optionIndex === bossOrder[position],
      );
      const matches = matchPositions.filter(Boolean).length;
      const bossPoints = 4 - matches;
      const teamPoints = matches;
      const players = previous.players.map((player) => ({
        ...player,
        score: player.score + (player.id === boss.id ? bossPoints : teamPoints),
      }));

      return {
        ...previous,
        phase: 'reveal',
        players,
        secretOrder: [...INITIAL_ORDER],
        bossOrder: null,
        guessOrder: [...INITIAL_ORDER],
        result: {
          matches,
          matchPositions,
          bossPoints,
          teamPoints,
          trueOrder: [...bossOrder],
          guessedOrder: [...previous.guessOrder],
        },
      };
    });
  }

  function showScoreboard() {
    setGame((previous) =>
      previous?.phase === 'reveal'
        ? { ...previous, phase: 'scoreboard' }
        : previous,
    );
  }

  function startNextRound() {
    setGame((previous) =>
      previous?.phase === 'scoreboard' && previous.round < ROUNDS - 1
        ? {
            ...previous,
            phase: 'secretHandoff',
            round: previous.round + 1,
            secretOrder: [...INITIAL_ORDER],
            bossOrder: null,
            guessOrder: [...INITIAL_ORDER],
            result: null,
          }
        : previous,
    );
  }

  function replay() {
    if (!game || game.phase !== 'scoreboard' || game.round < ROUNDS - 1) {
      return;
    }
    setGame(createGame(game.players.map((player) => player.name)));
  }

  function backToSetup() {
    if (!game || game.phase !== 'scoreboard' || game.round < ROUNDS - 1) {
      return;
    }
    const names = game.players.map((player) => player.name);
    setPlayerCount(game.players.length);
    setSetupNames(Array.from({ length: MAX_PLAYERS }, (_, index) => names[index] ?? DEFAULT_NAMES[index]));
    setSetupError('');
    setGame(null);
  }

  if (!game) {
    return (
      <div>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {getLiveMessage(null)}
        </div>
        <form
          className="paper-panel p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            handleStart();
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="paper-kicker">Setup / 3-8 players</p>
              <h2 ref={setupHeadingRef} tabIndex={-1} className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl">
                メンバーを決める
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
                4つの選択肢を社長がこっそりランキング。グループで相談して順位を予想し、ぴったり合った席を競います。
              </p>
            </div>
            <span className="paper-chip shrink-0 px-3 py-1.5 font-label text-[9px]">
              全3ラウンド
            </span>
          </div>

          <div className="mt-5 space-y-5">
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
                      value={setupNames[index] ?? ''}
                      onChange={(event) => handleNameChange(index, event.target.value)}
                      placeholder={DEFAULT_NAMES[index]}
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

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                {
                  label: 'ROTATION',
                  title: '社長は毎回交代',
                  text: '全3ラウンド、社長役が順番にバトンを受け取ります。',
                },
                {
                  label: 'RANKING',
                  title: '4つを並べ替え',
                  text: '社長と予想チームが、それぞれ上から順位を決めます。',
                },
                {
                  label: 'SCORE',
                  title: '一致した席に得点',
                  text: '予想チームは一致した席、社長は外れた席に1点ずつ。',
                },
              ].map((rule) => (
                <div key={rule.label} className="border border-[var(--line)] bg-[var(--paper-strong)] p-3">
                  <p className="font-label text-[9px] text-[var(--accent)]">{rule.label}</p>
                  <p className="mt-1.5 text-sm font-bold">{rule.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--ink-soft)]">{rule.text}</p>
                </div>
              ))}
            </div>

            {setupError && (
              <p role="alert" className="border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-bold leading-6">
                {setupError}
              </p>
            )}

            <button type="submit" className="paper-button-primary min-h-12 w-full px-5 py-4 text-base">
              ゲームを始める
              <span className="font-label text-[9px] opacity-80">Start</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  const boss = getBoss(game);
  const prompt = game.deck[game.round];
  const isFinal = game.round >= ROUNDS - 1;
  const ranked = rankPlayers(game.players);
  const topScore = ranked[0]?.score ?? 0;
  const winners = ranked.filter((player) => player.score === topScore);
  const liveMessage = getLiveMessage(game);

  return (
    <div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      <section ref={gamePanelRef} className="paper-panel p-4 sm:p-6">
        <RoundHeader game={game} boss={boss} />

        <div className="mt-4">
          {game.phase === 'secretHandoff' && (
            <div>
              <p className="paper-kicker">Secret Ranking</p>
              <h2 tabIndex={-1} className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl">
                社長にバトンタッチ
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                端末を {boss.name} さんだけが操作してください。ほかのメンバーは画面を見ないようにしましょう。
              </p>
              <div className="mt-5 border-l-4 border-[var(--accent)] bg-[var(--paper-muted)] p-4">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">Predictor</p>
                <p className="font-editorial mt-1 break-words text-3xl leading-tight">
                  {boss.name}
                  <span className="ml-2 font-sans text-base">さん</span>
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  このラウンドのお題を見て、4つの選択肢を自分好みの順位に並べ替えます。
                </p>
              </div>
              <button
                type="button"
                onClick={openSecret}
                className="paper-button-primary mt-5 min-h-12 w-full px-5 py-3 text-base"
              >
                社長の画面を開く
              </button>
            </div>
          )}

          {game.phase === 'secret' && (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="paper-kicker">Secret Ranking</p>
                  <h2 tabIndex={-1} className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl">
                    社長の頭の中
                  </h2>
                </div>
                <span className="paper-chip shrink-0 px-3 py-1.5 font-label text-[9px]">
                  社長: {boss.name}
                </span>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                この画面は {boss.name} さんだけが見てください。上から1位、2位、3位、4位になるように並べ替えます。
              </p>
              <div className="mt-5 border border-[var(--line)] bg-[var(--paper-muted)] p-4">
                <p className="paper-kicker">Question</p>
                <p className="font-editorial mt-2 break-words text-lg leading-7 sm:text-xl">
                  {prompt.title}
                </p>
              </div>
              <RankingEditor
                prompt={prompt}
                order={game.secretOrder}
                label="社長の順位"
                onMove={moveSecret}
              />
              <div className="mt-5 flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
                  確定すると順位は隠れ、グループに端末を渡す画面に切り替わります。
                </p>
                <button
                  type="button"
                  onClick={confirmSecret}
                  className="paper-button-primary min-h-12 w-full px-5 py-3 text-sm sm:w-auto"
                >
                  この順位で確定する
                </button>
              </div>
            </div>
          )}

          {game.phase === 'guessHandoff' && (
            <div>
              <p className="paper-kicker">Team Prediction</p>
              <h2 tabIndex={-1} className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl">
                グループに端末を渡してください
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                社長の順位は確定しました。{boss.name} さんは答えを言わず、グループの相談を聞きましょう。
              </p>
              <div className="mt-5 border-l-4 border-[var(--teal)] bg-[var(--paper-muted)] p-4">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">Discuss &amp; rank</p>
                <p className="mt-1 text-sm font-bold leading-6">
                  4つの選択肢を、社長が選んだと思う順に並べ替えます。
                </p>
              </div>
              <button
                type="button"
                onClick={openGuess}
                className="paper-button-primary mt-5 min-h-12 w-full px-5 py-3 text-base"
              >
                みんなの予想を入力する
              </button>
            </div>
          )}

          {game.phase === 'guess' && (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="paper-kicker">Team Prediction</p>
                  <h2 tabIndex={-1} className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl">
                    みんなの予想
                  </h2>
                </div>
                <span className="paper-chip shrink-0 px-3 py-1.5 font-label text-[9px]">
                  社長: {boss.name}
                </span>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                グループで相談して、社長の順位だと思う順に並べ替えてください。社長は答えを言わずに見守ります。
              </p>
              <div className="mt-5 border border-[var(--line)] bg-[var(--paper-muted)] p-4">
                <p className="paper-kicker">Question</p>
                <p className="font-editorial mt-2 break-words text-lg leading-7 sm:text-xl">
                  {prompt.title}
                </p>
              </div>
              <RankingEditor
                prompt={prompt}
                order={game.guessOrder}
                label="みんなの予想"
                onMove={moveGuess}
              />
              <button
                type="button"
                onClick={confirmGuess}
                className="paper-button-primary mt-5 min-h-12 w-full px-5 py-3 text-base"
              >
                この予想で回答する
              </button>
            </div>
          )}

          {game.phase === 'reveal' && game.result && (
            <div>
              <p className="paper-kicker">Answer Reveal</p>
              <h2 tabIndex={-1} className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl">
                運命の答え合わせ
              </h2>
              <p className="font-editorial mt-3 break-words text-lg leading-7">{prompt.title}</p>

              <div className="mt-4 border-l-4 border-[var(--accent)] bg-[var(--paper-muted)] p-4">
                <p className="font-label text-[9px] text-[var(--ink-soft)]">Match</p>
                <p className="font-editorial mt-1 text-3xl leading-none">
                  {game.result.matches}
                  <span className="ml-2 text-sm">か所一致</span>
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  4つの席のうち、社長の順位と予想がぴったり合った数です。
                </p>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <ResultOrder
                  heading="社長の頭の中"
                  subheading="True Order"
                  prompt={prompt}
                  order={game.result.trueOrder}
                  matchPositions={game.result.matchPositions}
                />
                <ResultOrder
                  heading="みんなの予想"
                  subheading="Team Guess"
                  prompt={prompt}
                  order={game.result.guessedOrder}
                  matchPositions={game.result.matchPositions}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="border border-[var(--teal)] bg-[var(--paper-strong)] p-4">
                  <p className="font-label text-[9px] text-[var(--teal)]">予想チーム全員</p>
                  <p className="font-editorial mt-1 text-3xl leading-none">
                    +{game.result.teamPoints}
                    <span className="ml-1 text-sm">点</span>
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    一致した席1つにつき1点。社長以外のメンバーに入ります。
                  </p>
                </div>
                <div className="border border-[var(--gold)] bg-[var(--paper-strong)] p-4">
                  <p className="font-label text-[9px] text-[var(--accent)]">社長 {boss.name}</p>
                  <p className="font-editorial mt-1 text-3xl leading-none">
                    +{game.result.bossPoints}
                    <span className="ml-1 text-sm">点</span>
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
                    予想が外れた席1つにつき1点。読まれにくさがそのまま得点になります。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={showScoreboard}
                className="paper-button-primary mt-5 min-h-12 w-full px-5 py-3 text-base"
              >
                スコアボードを見る
              </button>
            </div>
          )}

          {game.phase === 'scoreboard' && (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="paper-kicker">{isFinal ? 'Final Result' : 'Scoreboard'}</p>
                  <h2 tabIndex={-1} className="font-editorial mt-2 text-2xl leading-tight outline-none sm:text-3xl">
                    {isFinal ? '最終順位' : `第${game.round + 1}ラウンド終了`}
                  </h2>
                </div>
                <span className="paper-chip shrink-0 px-3 py-1.5 font-label text-[9px]">
                  {isFinal ? '全3ラウンド終了' : `残り ${ROUNDS - game.round - 1} ラウンド`}
                </span>
              </div>

              {isFinal && (
                <div className="mt-5 border-2 border-[var(--gold)] bg-[var(--paper-muted)] p-4">
                  <p className="font-label text-[10px] text-[var(--accent)]">Winner</p>
                  <p className="font-editorial mt-1 break-words text-2xl leading-tight sm:text-3xl">
                    {winners.length > 1 ? '同率優勝 ' : '優勝 '}
                    {winners.map((winner) => `${winner.name}さん`).join('、')}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                    スコア {topScore}点
                  </p>
                </div>
              )}

              <ol className="mt-4 divide-y divide-[var(--line)] border border-[var(--line)] bg-[var(--paper-strong)]">
                {ranked.map((player) => (
                  <li key={player.id} className="flex items-center gap-3 p-3">
                    <span
                      className={`font-label flex h-9 w-9 shrink-0 items-center justify-center text-[10px] font-bold ${
                        player.rank === 1
                          ? 'border-2 border-[var(--gold)] bg-[var(--paper-strong)] text-[var(--accent)]'
                          : 'border border-[var(--line-strong)] bg-[var(--paper-muted)] text-[var(--ink-soft)]'
                      }`}
                    >
                      {player.rank}位
                    </span>
                    <span className="min-w-0 flex-1 break-words text-sm font-bold">{player.name}</span>
                    <span className="font-editorial shrink-0 text-2xl leading-none">
                      {player.score}
                      <span className="ml-1 text-xs">pt</span>
                    </span>
                  </li>
                ))}
              </ol>

              {!isFinal && game.result && (
                <p className="mt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                  今回の配点: 予想チーム +{game.result.teamPoints}点 / 社長 {boss.name} +{game.result.bossPoints}点
                </p>
              )}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {isFinal ? (
                  <>
                    <button
                      type="button"
                      onClick={backToSetup}
                      className="paper-button min-h-11 px-4 py-2 text-sm"
                    >
                      メンバーを変える
                    </button>
                    <button
                      type="button"
                      onClick={replay}
                      className="paper-button-primary min-h-12 px-5 py-3 text-base"
                    >
                      もう一度遊ぶ
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startNextRound}
                    className="paper-button-primary min-h-12 w-full px-5 py-3 text-base sm:w-auto"
                  >
                    第{game.round + 2}ラウンドを始める
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
