'use client';

import { useState } from 'react';
import { PREFECTURE_STATS, type PrefectureStat } from '@/lib/statsData';

type QuizPhase = 'idle' | 'playing' | 'finished';

type QuizQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

type QuestionDirection = 'highest' | 'lowest';

const QUESTION_COUNT = 5;
const CHOICE_COUNT = 4;
const CHOICE_LABELS = ['A', 'B', 'C', 'D'];
const numberFormatter = new Intl.NumberFormat('ja-JP');

const PREFECTURES_BY_POPULATION_DESC = [...PREFECTURE_STATS].sort(
  (a, b) => b.population - a.population,
);
const PREFECTURES_BY_POPULATION_ASC = [...PREFECTURES_BY_POPULATION_DESC].reverse();
const PREFECTURES_BY_AREA_DESC = [...PREFECTURE_STATS].sort((a, b) => b.area - a.area);
const PREFECTURES_BY_AREA_ASC = [...PREFECTURES_BY_AREA_DESC].reverse();
const PREFECTURES_BY_DENSITY_DESC = [...PREFECTURE_STATS].sort(
  (a, b) => b.population / b.area - a.population / a.area,
);
const PREFECTURES_BY_DENSITY_ASC = [...PREFECTURES_BY_DENSITY_DESC].reverse();
const REGIONS = Array.from(new Set(PREFECTURE_STATS.map((prefecture) => prefecture.region)));

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[randomIndex];
    copy[randomIndex] = current;
  }
  return copy;
}

function buildChoices(
  correct: PrefectureStat,
  pool: readonly PrefectureStat[],
): { choices: string[]; correctIndex: number } {
  const distractors = shuffle(
    pool.filter((prefecture) => prefecture.name !== correct.name),
  ).slice(0, CHOICE_COUNT - 1);
  const choices = shuffle([correct, ...distractors]).map(
    (prefecture) => prefecture.name,
  );

  return { choices, correctIndex: choices.indexOf(correct.name) };
}

function createPopulationQuestion(direction: QuestionDirection): QuizQuestion {
  const target =
    direction === 'highest'
      ? PREFECTURES_BY_POPULATION_DESC[0]
      : PREFECTURES_BY_POPULATION_ASC[0];
  const { choices, correctIndex } = buildChoices(target, PREFECTURE_STATS);

  return {
    id: `population-${direction}`,
    prompt:
      direction === 'highest'
        ? '人口が最も多い都道府県はどれですか？'
        : '人口が最も少ない都道府県はどれですか？',
    choices,
    correctIndex,
    explanation: `${target.name}の人口は約${formatNumber(target.population)}人で、47都道府県の中で最も${direction === 'highest' ? '多い' : '少ない'}値です。`,
  };
}

function createAreaQuestion(direction: QuestionDirection): QuizQuestion {
  const target =
    direction === 'highest' ? PREFECTURES_BY_AREA_DESC[0] : PREFECTURES_BY_AREA_ASC[0];
  const { choices, correctIndex } = buildChoices(target, PREFECTURE_STATS);

  return {
    id: `area-${direction}`,
    prompt:
      direction === 'highest'
        ? '面積が最も大きい都道府県はどれですか？'
        : '面積が最も小さい都道府県はどれですか？',
    choices,
    correctIndex,
    explanation: `${target.name}の面積は約${formatNumber(target.area)}km²で、47都道府県の中で最も${direction === 'highest' ? '大きい' : '小さい'}値です。`,
  };
}

function createDensityQuestion(direction: QuestionDirection): QuizQuestion {
  const target =
    direction === 'highest'
      ? PREFECTURES_BY_DENSITY_DESC[0]
      : PREFECTURES_BY_DENSITY_ASC[0];
  const density = Math.round(target.population / target.area);
  const { choices, correctIndex } = buildChoices(target, PREFECTURE_STATS);

  return {
    id: `density-${direction}`,
    prompt:
      direction === 'highest'
        ? '人口密度が最も高い都道府県はどれですか？'
        : '人口密度が最も低い都道府県はどれですか？',
    choices,
    correctIndex,
    explanation: `${target.name}の人口密度は約${formatNumber(density)}人/km²で、47都道府県の中で最も${direction === 'highest' ? '高い' : '低い'}値です。人口約${formatNumber(target.population)}人を面積約${formatNumber(target.area)}km²で割って算出しています。`,
  };
}

function createRegionQuestion(): QuizQuestion {
  const region = pickRandom(REGIONS);
  const target = pickRandom(
    PREFECTURE_STATS.filter((prefecture) => prefecture.region === region),
  );
  const otherRegions = PREFECTURE_STATS.filter(
    (prefecture) => prefecture.region !== region,
  );
  const { choices, correctIndex } = buildChoices(target, otherRegions);

  return {
    id: `region-${region}`,
    prompt: `次のうち、地域区分が「${region}」に属する都道府県はどれですか？`,
    choices,
    correctIndex,
    explanation: `${target.name}は「${region}」に属する都道府県です。ほかの選択肢は別の地域に属しています。`,
  };
}

function generateQuestions(): QuizQuestion[] {
  const factories = [
    () => createPopulationQuestion('highest'),
    () => createPopulationQuestion('lowest'),
    () => createAreaQuestion('highest'),
    () => createAreaQuestion('lowest'),
    () => createDensityQuestion('highest'),
    () => createDensityQuestion('lowest'),
    () => createRegionQuestion(),
  ];

  return shuffle(factories)
    .slice(0, QUESTION_COUNT)
    .map((factory) => factory());
}

function getResultMessage(score: number, total: number): string {
  if (score === total) {
    return '満点です。都道府県の統計データをしっかり把握しています。';
  }
  if (score >= total - 1) {
    return 'あと1問で満点です。解説を確認してもう一度挑戦してみましょう。';
  }
  if (score >= Math.ceil(total * 0.6)) {
    return 'なかなかの成績です。上位と下位の都道府県を確認するとさらに伸びます。';
  }
  if (score >= Math.ceil(total * 0.4)) {
    return '基本はつかめています。人口・面積・人口密度の上位を復習してみましょう。';
  }
  if (score >= 1) {
    return '統計データを眺めると、次の挑戦では正解が増えます。';
  }
  return 'まずは都道府県の人口・面積・人口密度を確認してから再挑戦してみましょう。';
}

export function PrefectureQuiz() {
  const [phase, setPhase] = useState<QuizPhase>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const totalQuestions = questions.length > 0 ? questions.length : QUESTION_COUNT;
  const currentQuestion = questions[currentIndex] ?? null;
  const isAnswered = selectedIndex !== null;
  const isCorrect =
    isAnswered &&
    currentQuestion !== null &&
    selectedIndex === currentQuestion.correctIndex;
  const isLastQuestion = currentIndex === questions.length - 1;
  const correctChoice =
    currentQuestion !== null ? currentQuestion.choices[currentQuestion.correctIndex] : '';
  const answeredProgress =
    phase === 'idle' ? 0 : phase === 'finished' ? totalQuestions : currentIndex + 1;

  const startQuiz = () => {
    const nextQuestions = generateQuestions();
    setQuestions(nextQuestions);
    setCurrentIndex(0);
    setScore(0);
    setSelectedIndex(null);
    setAnnouncement(
      `クイズを開始しました。第1問です。${nextQuestions[0]?.prompt ?? ''}`,
    );
    setPhase('playing');
  };

  const selectChoice = (choiceIndex: number) => {
    if (selectedIndex !== null || currentQuestion === null) {
      return;
    }

    setSelectedIndex(choiceIndex);

    if (choiceIndex === currentQuestion.correctIndex) {
      setScore((previous) => previous + 1);
      setAnnouncement(`正解です。${currentQuestion.explanation}`);
      return;
    }

    setAnnouncement(
      `不正解です。正解は${currentQuestion.choices[currentQuestion.correctIndex]}です。${currentQuestion.explanation}`,
    );
  };

  const goToNextQuestion = () => {
    if (currentQuestion === null || selectedIndex === null) {
      return;
    }

    if (isLastQuestion) {
      setPhase('finished');
      setAnnouncement(`クイズが終了しました。${score}問正解です。`);
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedIndex(null);
    setAnnouncement(
      `第${nextIndex + 1}問です。${questions[nextIndex]?.prompt ?? ''}`,
    );
  };

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.78fr)]"
      aria-label="都道府県統計クイズ"
    >
      <section
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="prefecture-quiz-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Quiz</p>
            <h2 id="prefecture-quiz-heading" className="font-editorial mt-1 text-xl">
              都道府県統計クイズ
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            01 / 02
          </span>
        </div>

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>

        {phase === 'idle' && (
          <div className="mt-4">
            <div className="border border-[var(--line)] bg-[var(--paper)] p-5">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">Ready</p>
              <p className="font-editorial mt-2 text-2xl leading-tight">
                全5問・4択
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                都道府県の人口・面積・人口密度・地域区分からランダムに5問を出題します。選択肢を選ぶと正誤と短い解説が表示され、最後にスコアを確認できます。
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {['人口', '面積', '人口密度', '地域区分'].map((label) => (
                  <span
                    key={label}
                    className="border border-[var(--line)] bg-[var(--paper-strong)] px-3 py-2 text-center text-xs font-bold"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={startQuiz}
              className="paper-button-primary mt-4 min-h-12 w-full rounded-sm px-5 py-3 text-sm"
            >
              クイズを開始する
            </button>
          </div>
        )}

        {phase === 'playing' && currentQuestion && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-label text-[10px] text-[var(--ink-soft)]">
                第 {currentIndex + 1} 問 / {totalQuestions}
              </p>
              <p className="text-xs font-bold text-[var(--ink)]">
                スコア{' '}
                <span className="font-editorial text-lg tabular-nums">{score}</span>
              </p>
            </div>

            <div
              role="progressbar"
              aria-label="クイズの進捗"
              aria-valuemin={1}
              aria-valuemax={totalQuestions}
              aria-valuenow={currentIndex + 1}
              className="mt-2 h-1.5 w-full overflow-hidden border border-[var(--line)] bg-[var(--paper-muted)]"
            >
              <div
                className="h-full bg-[var(--accent)] transition-[width] duration-300"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>

            <h3 className="font-editorial mt-5 text-lg leading-8 text-[var(--ink)] sm:text-xl">
              {currentQuestion.prompt}
            </h3>

            <div className="mt-4 grid gap-2.5">
              {currentQuestion.choices.map((choice, index) => {
                const showCorrect =
                  isAnswered && index === currentQuestion.correctIndex;
                const showWrong =
                  isAnswered &&
                  index === selectedIndex &&
                  index !== currentQuestion.correctIndex;

                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => selectChoice(index)}
                    disabled={isAnswered}
                    className={`paper-chip flex min-h-12 w-full items-center justify-between gap-3 rounded-sm px-4 py-3 text-left text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-default ${
                      showCorrect ? 'paper-chip-active' : ''
                    } ${
                      showWrong
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : ''
                    }`}
                  >
                    <span className="min-w-0 leading-6">{choice}</span>
                    <span
                      aria-hidden="true"
                      className="font-label shrink-0 text-[10px]"
                    >
                      {CHOICE_LABELS[index]}
                    </span>
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div
                className={`mt-4 border-l-2 px-4 py-3 ${
                  isCorrect
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--line-strong)] bg-[var(--paper-muted)]'
                }`}
              >
                <p
                  className={`text-xs font-bold ${
                    isCorrect ? 'text-[var(--accent)]' : 'text-[var(--ink)]'
                  }`}
                >
                  {isCorrect
                    ? '正解です'
                    : `不正解です。正解は「${correctChoice}」です。`}
                </p>
                <p className="mt-1 text-[11px] leading-6 text-[var(--ink)]">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {isAnswered && (
              <button
                type="button"
                onClick={goToNextQuestion}
                className="paper-button-primary mt-4 min-h-12 w-full rounded-sm px-5 py-3 text-sm"
              >
                {isLastQuestion ? '結果を見る' : '次の問題へ'}
              </button>
            )}
          </div>
        )}

        {phase === 'finished' && (
          <div className="mt-4">
            <div className="border border-[var(--line)] bg-[var(--paper)] p-5 text-center">
              <p className="font-label text-[9px] text-[var(--ink-soft)]">
                Final Score
              </p>
              <p className="font-editorial mt-2 text-5xl leading-none tabular-nums text-[var(--ink)]">
                {score}
                <span className="text-xl"> / {totalQuestions}</span>
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                {getResultMessage(score, totalQuestions)}
              </p>
            </div>
            <button
              type="button"
              onClick={startQuiz}
              className="paper-button-primary mt-4 min-h-12 w-full rounded-sm px-5 py-3 text-sm"
            >
              もう一度挑戦する
            </button>
          </div>
        )}
      </section>

      <aside
        className="paper-panel min-w-0 p-4 sm:p-6"
        aria-labelledby="prefecture-quiz-score-heading"
      >
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="paper-kicker text-[9px]">Score</p>
            <h2
              id="prefecture-quiz-score-heading"
              className="font-editorial mt-1 text-xl"
            >
              成績と進捗
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="font-label text-[9px] text-[var(--ink-soft)]"
          >
            02 / 02
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="font-label text-[9px] text-[var(--ink-soft)]">Score</p>
            <p className="font-editorial mt-1 text-3xl leading-none tabular-nums text-[var(--ink)]">
              {score}
              <span className="text-base"> / {totalQuestions}</span>
            </p>
            <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              {phase === 'idle'
                ? '開始するとスコアが反映されます。'
                : phase === 'finished'
                  ? '全5問の結果です。'
                  : `第${currentIndex + 1}問に回答中です。`}
            </p>
          </div>

          <div className="border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="font-label text-[9px] text-[var(--ink-soft)]">
              Progress
            </p>
            <div className="mt-2 flex gap-1" aria-hidden="true">
              {Array.from({ length: totalQuestions }).map((_, index) => (
                <span
                  key={index}
                  className={`h-2 flex-1 border border-[var(--line)] ${
                    index < answeredProgress
                      ? 'bg-[var(--accent)]'
                      : 'bg-[var(--paper-muted)]'
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              {phase === 'idle'
                ? '全5問のクイズに挑戦します。'
                : phase === 'finished'
                  ? '全問終了しました。'
                  : `残り ${totalQuestions - currentIndex - 1} 問です。`}
            </p>
          </div>

          <div className="border border-[var(--line)] bg-[var(--paper)] p-4">
            <p className="font-label text-[9px] text-[var(--ink-soft)]">Rules</p>
            <ul className="mt-2 space-y-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              <li>4つの選択肢から正解を1つ選びます。</li>
              <li>回答すると正誤と短い解説が表示されます。</li>
              <li>全5問の正解数が最終スコアになります。</li>
            </ul>
          </div>
        </div>

        <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-5 text-[var(--ink-soft)]">
          出題内容はページを開くたびに変わります。統計値は2020年国勢調査や国土地理院の公表値を参考にした概算です。
        </p>
      </aside>
    </section>
  );
}
