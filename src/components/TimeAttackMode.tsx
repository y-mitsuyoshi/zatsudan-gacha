"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ArrowPathIcon,
    CheckIcon,
    ClipboardIcon,
    ForwardIcon,
    PauseIcon,
    PlayIcon,
} from '@heroicons/react/24/outline';
import { useHistory } from '@/lib/hooks';
import { copyToClipboard } from '@/lib/clipboard';
import { trackEvent } from '@/lib/firebase';

type GameStatus = 'waiting' | 'running' | 'paused' | 'finished';

interface TimeAttackModeProps {
    themes: string[];
}

function clampDuration(value: number): number {
    if (!Number.isFinite(value)) {
        return 60;
    }
    return Math.min(600, Math.max(10, Math.round(value)));
}

export const TimeAttackMode = ({ themes }: TimeAttackModeProps) => {
    const [status, setStatus] = useState<GameStatus>('waiting');
    const [currentTheme, setCurrentTheme] = useState('');
    const [durationInput, setDurationInput] = useState('60');
    const [timeLeft, setTimeLeft] = useState(60);
    const [isCopied, setIsCopied] = useState(false);
    const endTimeRef = useRef<number | null>(null);
    const remainingRef = useRef(60);
    const previousThemeRef = useRef('');
    const finishedRef = useRef(false);
    const copyTimerRef = useRef<number | null>(null);
    const { addHistory } = useHistory();

    const timerDuration = clampDuration(Number(durationInput));

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) {
                window.clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (status !== 'running') {
            return;
        }

        const updateTimer = () => {
            if (!endTimeRef.current) {
                return;
            }

            const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
            remainingRef.current = remaining;
            setTimeLeft(remaining);

            if (remaining <= 0 && !finishedRef.current) {
                finishedRef.current = true;
                setStatus('finished');
                trackEvent('time_attack_finished', {
                    theme: currentTheme,
                    duration: timerDuration,
                });
            }
        };

        updateTimer();
        const timerId = window.setInterval(updateTimer, 250);
        return () => window.clearInterval(timerId);
    }, [status, currentTheme, timerDuration]);

    const getRandomTheme = useCallback(() => {
        if (themes.length === 0) {
            setCurrentTheme('このカテゴリにテーマはありません。');
            return;
        }

        const candidates = previousThemeRef.current && themes.length > 1
            ? themes.filter((theme) => theme !== previousThemeRef.current)
            : themes;
        const nextTheme = candidates[Math.floor(Math.random() * candidates.length)];

        previousThemeRef.current = nextTheme;
        setCurrentTheme(nextTheme);
        addHistory(nextTheme);
        trackEvent('time_attack_theme_selected', { theme: nextTheme });
    }, [themes, addHistory]);

    const beginRound = useCallback((withNewTheme: boolean) => {
        const duration = timerDuration;
        remainingRef.current = duration;
        setTimeLeft(duration);
        endTimeRef.current = Date.now() + duration * 1000;
        finishedRef.current = false;
        setStatus('running');

        if (withNewTheme) {
            getRandomTheme();
        }
    }, [getRandomTheme, timerDuration]);

    const startGame = () => {
        beginRound(true);
        trackEvent('time_attack_started', { duration: timerDuration, theme_count: themes.length });
    };

    const nextTheme = () => {
        beginRound(true);
        trackEvent('time_attack_next_theme', { duration: timerDuration });
    };

    const replayTheme = () => {
        beginRound(false);
        trackEvent('time_attack_replay_theme', { theme: currentTheme });
    };

    const skipTheme = () => {
        getRandomTheme();
        trackEvent('time_attack_theme_skipped');
    };

    const pauseGame = () => {
        if (status !== 'running' || !endTimeRef.current) {
            return;
        }
        remainingRef.current = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remainingRef.current);
        setStatus('paused');
        trackEvent('time_attack_paused', { remaining: remainingRef.current });
    };

    const resumeGame = () => {
        if (status !== 'paused') {
            return;
        }
        endTimeRef.current = Date.now() + remainingRef.current * 1000;
        finishedRef.current = false;
        setStatus('running');
        trackEvent('time_attack_resumed', { remaining: remainingRef.current });
    };

    const copyTheme = async () => {
        if (!currentTheme || typeof navigator === 'undefined') {
            return;
        }

        try {
            await copyToClipboard(currentTheme);
            setIsCopied(true);
            if (copyTimerRef.current) {
                window.clearTimeout(copyTimerRef.current);
            }
            copyTimerRef.current = window.setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy theme:', error);
        }
    };

    const progress = timerDuration > 0
        ? Math.min(100, Math.max(0, (timeLeft / timerDuration) * 100))
        : 0;

    const renderGameState = () => {
        switch (status) {
            case 'running':
            case 'paused':
                return (
                    <div className="w-full text-center">
                        <div className="mb-4">
                            <p className="text-xs font-semibold tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">
                                {status === 'paused' ? '一時停止中' : '残り時間'}
                            </p>
                            <p
                                className="text-5xl md:text-6xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums"
                                role="timer"
                                aria-live="off"
                            >
                                {timeLeft}
                            </p>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mb-5">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                    timeLeft <= 10 ? 'bg-red-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 leading-relaxed">
                            {currentTheme}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={status === 'paused' ? resumeGame : pauseGame}
                                className="flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 font-bold py-3 px-4 rounded-lg transition-all"
                            >
                                {status === 'paused' ? (
                                    <><PlayIcon className="w-5 h-5" />再開</>
                                ) : (
                                    <><PauseIcon className="w-5 h-5" />一時停止</>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={skipTheme}
                                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
                            >
                                <ForwardIcon className="w-5 h-5" />
                                別のお題
                            </button>
                        </div>
                    </div>
                );
            case 'finished':
                return (
                    <div className="w-full text-center">
                        <p className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">終了！</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">お題</p>
                        <p className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-6 leading-relaxed">
                            {currentTheme}
                        </p>
                        <div className="flex items-center justify-center gap-2 mb-5">
                            <button
                                type="button"
                                onClick={copyTheme}
                                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-600/60 transition-colors"
                            >
                                {isCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                                {isCopied ? 'コピーしました' : 'お題をコピー'}
                            </button>
                        </div>
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={nextTheme}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all"
                            >
                                次のテーマへ
                            </button>
                            <button
                                type="button"
                                onClick={replayTheme}
                                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 font-semibold py-3 px-6 rounded-lg transition-all"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                同じお題でもう一度
                            </button>
                        </div>
                    </div>
                );
            case 'waiting':
            default:
                return (
                    <div className="w-full text-center">
                        <div className="mb-5">
                            <label htmlFor="timer-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                タイマー設定（秒）
                            </label>
                            <div className="flex items-center justify-center gap-2">
                                <input
                                    type="number"
                                    id="timer-duration"
                                    value={durationInput}
                                    onChange={(event) => setDurationInput(event.target.value)}
                                    onBlur={() => setDurationInput(String(timerDuration))}
                                    className="w-28 p-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min="10"
                                    max="600"
                                    inputMode="numeric"
                                />
                                <span className="text-sm text-gray-500 dark:text-gray-400">秒</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-3">
                                {[30, 60, 120].map((seconds) => (
                                    <button
                                        key={seconds}
                                        type="button"
                                        onClick={() => setDurationInput(String(seconds))}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                            timerDuration === seconds
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                                        }`}
                                    >
                                        {seconds}秒
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-5">
                            制限時間内に、お題について語りきろう！
                        </p>
                        <button
                            type="button"
                            onClick={startGame}
                            disabled={themes.length === 0}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg text-xl transition-all"
                        >
                            スタート
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 min-h-[280px] flex items-center justify-center border border-gray-200 dark:border-gray-700">
            {renderGameState()}
        </div>
    );
};
