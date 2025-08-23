"use client";

import { useState, useEffect, useCallback } from 'react';
import { themeData } from '@/lib/themeData';
import { useHistory } from '@/lib/hooks';

type GameStatus = 'waiting' | 'running' | 'finished';

export const TimeAttackMode = () => {
    const [status, setStatus] = useState<GameStatus>('waiting');
    const [currentTheme, setCurrentTheme] = useState('');
    const [timerDuration, setTimerDuration] = useState(60);
    const [timeLeft, setTimeLeft] = useState(timerDuration);
    const { addHistory } = useHistory();

    const getRandomTheme = useCallback(() => {
        const allThemes = Object.values(themeData).flat();
        const randomIndex = Math.floor(Math.random() * allThemes.length);
        const newTheme = allThemes[randomIndex];
        setCurrentTheme(newTheme);
        addHistory(newTheme);
        return newTheme;
    }, [addHistory]);

    useEffect(() => {
        if (status !== 'running') {
            return;
        }

        if (timeLeft <= 0) {
            setStatus('finished');
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [status, timeLeft]);

    const startGame = () => {
        setStatus('running');
        setTimeLeft(timerDuration);
        getRandomTheme();
    };

    const nextTheme = () => {
        setStatus('running');
        setTimeLeft(timerDuration);
        getRandomTheme();
    };

    const renderGameState = () => {
        switch (status) {
            case 'running':
                return (
                    <div className="text-center">
                        <p className="text-5xl md:text-6xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">{timeLeft}</p>
                        <p className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-200">{currentTheme}</p>
                    </div>
                );
            case 'finished':
                return (
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">終了！</p>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">お題: {currentTheme}</p>
                        <button
                            onClick={nextTheme}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all duration-200"
                        >
                            次のテーマへ
                        </button>
                    </div>
                );
            case 'waiting':
            default:
                return (
                    <div className="text-center">
                        <div className="mb-4">
                            <label htmlFor="timer-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">タイマー設定（秒）:</label>
                            <input
                                type="number"
                                id="timer-duration"
                                value={timerDuration}
                                onChange={(e) => setTimerDuration(Math.max(10, Number(e.target.value)))}
                                className="w-32 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500"
                                min="10"
                            />
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">ボタンを押してスピーチを開始！</p>
                        <button
                            onClick={startGame}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-200"
                        >
                            スタート
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 min-h-[250px] flex items-center justify-center border border-gray-200 dark:border-gray-700">
            {renderGameState()}
        </div>
    );
};
