"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowsPointingOutIcon,
    CheckIcon,
    ClipboardIcon,
    ExclamationCircleIcon,
    SpeakerWaveIcon,
    StarIcon as StarIconOutline,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { callGeminiAPI } from '@/lib/api-config';
import { copyToClipboard } from '@/lib/clipboard';
import { themeData } from '@/lib/themeData';
import {
    getCategoryForTheme,
    themeCategories,
    themeCategoryByName,
    totalThemeCount,
} from '@/lib/themeCategories';
import { useFavorites, useHistory } from '@/lib/hooks';
import { HistoryList } from '@/components/HistoryList';
import { FavoritesList } from '@/components/FavoritesList';
import { Tabs } from '@/components/Tabs';
import { TimeAttackMode } from '@/components/TimeAttackMode';
import { RouletteMode } from '@/components/RouletteMode2';
import { ShareButtons } from '@/components/ShareButtons';
import { trackEvent } from '@/lib/firebase';

type GameMode = 'normal' | 'timeAttack' | 'roulette';

type ThemeGachaProps = {
    initialCategory?: string;
    className?: string;
};

const GAME_MODES: { id: GameMode; label: string }[] = [
    { id: 'normal', label: 'ノーマル' },
    { id: 'timeAttack', label: 'タイムアタック' },
    { id: 'roulette', label: 'ルーレット' },
];

const MODE_HINTS: Record<GameMode, string> = {
    normal: 'ボタンひとつで、会話のきっかけになるお題を抽選します。',
    timeAttack: '制限時間内に、選ばれたお題について語りきろう！',
    roulette: '項目と重みを自由に設定して、ルーレットで決めよう！',
};

function pickRandomTheme(pool: string[], avoid?: string): string {
    if (pool.length === 0) {
        return '';
    }
    if (pool.length === 1) {
        return pool[0];
    }

    const candidates = avoid ? pool.filter((theme) => theme !== avoid) : pool;
    const targetPool = candidates.length > 0 ? candidates : pool;
    return targetPool[Math.floor(Math.random() * targetPool.length)];
}

export const ThemeGacha = ({ initialCategory, className = '' }: ThemeGachaProps) => {
    const normalizedInitialCategory = initialCategory && themeData[initialCategory]
        ? initialCategory
        : 'all';

    const [gameMode, setGameMode] = useState<GameMode>('normal');
    const [selectedCategory, setSelectedCategory] = useState(normalizedInitialCategory);
    const [currentTheme, setCurrentTheme] = useState('');
    const [previewTheme, setPreviewTheme] = useState('');
    const [isSpinning, setIsSpinning] = useState(false);
    const [showGeminiArea, setShowGeminiArea] = useState(false);
    const [isDiggingDeeper, setIsDiggingDeeper] = useState(false);
    const [digDeeperQuestions, setDigDeeperQuestions] = useState<string[] | null>(null);
    const [digDeeperError, setDigDeeperError] = useState('');
    const [copyMessage, setCopyMessage] = useState('');
    const [copyStatus, setCopyStatus] = useState<'success' | 'error'>('success');
    const [isPresentationOpen, setIsPresentationOpen] = useState(false);
    const { history, addHistory, clearHistory } = useHistory();
    const { favorites, toggleFavorite, clearFavorites } = useFavorites();

    const spinIntervalRef = useRef<number | null>(null);
    const copyTimerRef = useRef<number | null>(null);
    const digRequestIdRef = useRef(0);
    const mountedRef = useRef(true);
    const gachaRef = useRef<HTMLDivElement>(null);

    const themePool = useMemo(
        () => selectedCategory === 'all'
            ? Object.values(themeData).flat()
            : themeData[selectedCategory] ?? [],
        [selectedCategory]
    );

    const selectedCategoryMeta = selectedCategory === 'all'
        ? undefined
        : themeCategoryByName.get(selectedCategory);
    const currentCategoryMeta = currentTheme ? getCategoryForTheme(currentTheme) : undefined;
    const isFavorite = currentTheme ? favorites.includes(currentTheme) : false;
    const gachaButtonText = isSpinning
        ? '抽選中...'
        : currentTheme
            ? 'もう一度回す'
            : 'ガチャを回す';

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (spinIntervalRef.current !== null) {
                window.clearInterval(spinIntervalRef.current);
            }
            if (copyTimerRef.current !== null) {
                window.clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return;
        }
        window.speechSynthesis.cancel();
    }, [currentTheme]);

    useEffect(() => {
        if (!isPresentationOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsPresentationOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isPresentationOpen]);

    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const resetGeminiFeatures = useCallback(() => {
        digRequestIdRef.current += 1;
        setDigDeeperQuestions(null);
        setDigDeeperError('');
        setIsDiggingDeeper(false);
    }, []);

    const stopSpin = useCallback(() => {
        if (spinIntervalRef.current !== null) {
            window.clearInterval(spinIntervalRef.current);
            spinIntervalRef.current = null;
        }
        setIsSpinning(false);
        setPreviewTheme('');
    }, []);

    const updateTheme = useCallback((theme: string) => {
        setCurrentTheme(theme);
        setPreviewTheme('');
        setShowGeminiArea(true);
        setCopyMessage('');
        resetGeminiFeatures();
    }, [resetGeminiFeatures]);

    useEffect(() => {
        if (!initialCategory || !themeData[initialCategory]) {
            return;
        }

        stopSpin();
        setSelectedCategory(initialCategory);
        setCurrentTheme('');
        setShowGeminiArea(false);
        setCopyMessage('');
        resetGeminiFeatures();
    }, [initialCategory, resetGeminiFeatures, stopSpin]);

    const handleModeChange = (mode: GameMode) => {
        if (mode === gameMode) {
            return;
        }
        stopSpin();
        setGameMode(mode);
        trackEvent('game_mode_changed', { mode });
    };

    const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newCategory = event.target.value;
        stopSpin();
        setSelectedCategory(newCategory);
        setCurrentTheme('');
        setPreviewTheme('');
        setShowGeminiArea(false);
        setCopyMessage('');
        resetGeminiFeatures();
        trackEvent('category_changed', {
            category: newCategory,
            previous_category: selectedCategory,
        });
    };

    const copyText = useCallback(async (text: string, message: string) => {
        if (!text) {
            return;
        }

        try {
            await copyToClipboard(text);
            setCopyStatus('success');
            setCopyMessage(message);
        } catch (error) {
            console.error('Failed to copy text:', error);
            setCopyStatus('error');
            setCopyMessage('コピーできませんでした。長押しで選択してコピーしてください。');
        }

        if (copyTimerRef.current !== null) {
            window.clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = window.setTimeout(() => setCopyMessage(''), 2500);
    }, []);

    const speakTheme = useCallback(() => {
        if (!currentTheme || typeof window === 'undefined' || !('speechSynthesis' in window)) {
            setCopyStatus('error');
            setCopyMessage('このブラウザでは読み上げに対応していません。');
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentTheme);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
        trackEvent('theme_spoken');
    }, [currentTheme]);

    const spinGacha = useCallback(() => {
        if (isSpinning) {
            return;
        }

        if (themePool.length === 0) {
            setCurrentTheme('');
            setPreviewTheme('');
            setShowGeminiArea(false);
            setCopyStatus('error');
            setCopyMessage('このカテゴリにはお題がありません。別のカテゴリを選んでください。');
            return;
        }

        if (spinIntervalRef.current !== null) {
            window.clearInterval(spinIntervalRef.current);
        }

        setIsSpinning(true);
        setPreviewTheme(themePool[Math.floor(Math.random() * themePool.length)]);
        setCurrentTheme('');
        setShowGeminiArea(false);
        setCopyMessage('');
        resetGeminiFeatures();

        trackEvent('gacha_spin', {
            category: selectedCategory,
            game_mode: gameMode,
            theme_count: themePool.length,
        });

        let shuffleCount = 0;
        spinIntervalRef.current = window.setInterval(() => {
            const randomTheme = themePool[Math.floor(Math.random() * themePool.length)];
            setPreviewTheme(randomTheme);
            shuffleCount += 1;

            if (shuffleCount < 12) {
                return;
            }

            if (spinIntervalRef.current !== null) {
                window.clearInterval(spinIntervalRef.current);
                spinIntervalRef.current = null;
            }

            const finalTheme = pickRandomTheme(themePool, currentTheme);
            if (!finalTheme) {
                setIsSpinning(false);
                return;
            }

            updateTheme(finalTheme);
            addHistory(finalTheme);
            setIsSpinning(false);

            trackEvent('gacha_result', {
                theme: finalTheme,
                category: selectedCategory,
                game_mode: gameMode,
            });
        }, 80);
    }, [
        addHistory,
        currentTheme,
        gameMode,
        isSpinning,
        resetGeminiFeatures,
        selectedCategory,
        themePool,
        updateTheme,
    ]);

    const handleSelectTheme = (theme: string) => {
        stopSpin();
        setGameMode('normal');
        updateTheme(theme);
        trackEvent('theme_selected_from_list', { theme });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getDeeperQuestions = async () => {
        if (!currentTheme || isDiggingDeeper) {
            return;
        }

        const requestId = digRequestIdRef.current + 1;
        digRequestIdRef.current = requestId;
        setIsDiggingDeeper(true);
        setDigDeeperError('');
        setDigDeeperQuestions(null);

        trackEvent('ai_dig_deeper_requested', {
            theme: currentTheme,
            category: selectedCategory,
        });

        try {
            const result = await callGeminiAPI(currentTheme);
            if (!mountedRef.current || requestId !== digRequestIdRef.current) {
                return;
            }

            const parsedLines = result.text
                .split('\n')
                .map((line) => line.replace(/^[\s•\-\*\d\.\)\(]+/, '').replace(/\*\*/g, '').trim())
                .filter((line) => line.length > 0);
            const questionLines = parsedLines.filter((line) => /[？?]$/.test(line));
            const questions = questionLines.length > 0 ? questionLines : parsedLines;

            if (questions.length === 0) {
                throw new Error('AIから質問を受け取れませんでした');
            }

            setDigDeeperQuestions(questions);
            trackEvent('ai_dig_deeper_success', {
                theme: currentTheme,
                questions_count: questions.length,
            });
        } catch (error) {
            if (!mountedRef.current || requestId !== digRequestIdRef.current) {
                return;
            }
            console.error('API call failed:', error);
            setDigDeeperError('質問を生成できませんでした。少し時間をおいて、もう一度お試しください。');
            trackEvent('ai_dig_deeper_error', {
                theme: currentTheme,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            if (mountedRef.current && requestId === digRequestIdRef.current) {
                setIsDiggingDeeper(false);
            }
        }
    };

    const copyAllQuestions = () => {
        if (!digDeeperQuestions || digDeeperQuestions.length === 0) {
            return;
        }
        const text = digDeeperQuestions
            .map((question, index) => `${index + 1}. ${question}`)
            .join('\n');
        copyText(text, '質問をすべてコピーしました');
        trackEvent('ai_questions_copied', { theme: currentTheme });
    };

    return (
        <div
            ref={gachaRef}
            className={`relative bg-white dark:bg-gray-800 p-5 sm:p-7 md:p-8 rounded-3xl shadow-xl border border-white/60 dark:border-gray-700 text-center w-full transition-colors duration-300 ${className}`}
        >
            <div className="flex items-center justify-between gap-3 mb-5">
                <div className="text-left">
                    <p className="text-xs font-bold tracking-widest text-indigo-500 dark:text-indigo-400">ZATSUDAN GACHA</p>
                    <h2 className="text-xl font-black text-gray-800 dark:text-gray-100">お題ガチャ</h2>
                </div>
                <span className="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1.5">
                    全{totalThemeCount}問
                </span>
            </div>

            <div className="mb-5">
                <div className="flex justify-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-3" role="group" aria-label="遊び方">
                    {GAME_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            type="button"
                            aria-pressed={gameMode === mode.id}
                            onClick={() => handleModeChange(mode.id)}
                            className={`w-1/3 py-2 px-2 rounded-lg text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                gameMode === mode.id
                                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60'
                            }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 min-h-[1rem]">{MODE_HINTS[gameMode]}</p>
            </div>

            {gameMode !== 'roulette' && (
                <div className="mb-5">
                    <label htmlFor="category-select" className="block text-left text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        カテゴリを選ぶ
                    </label>
                    <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    >
                        <option value="all">すべてのテーマ（{totalThemeCount}問）</option>
                        {themeCategories.map((category) => (
                            <option key={category.name} value={category.name}>
                                {category.emoji} {category.name}（{themeData[category.name]?.length ?? 0}問）
                            </option>
                        ))}
                    </select>
                    <div className="flex items-center justify-between mt-2 px-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {selectedCategoryMeta
                                ? `${selectedCategoryMeta.emoji} ${selectedCategoryMeta.name}・${themePool.length}問から抽選`
                                : `全${themePool.length}問から抽選`}
                        </p>
                        {selectedCategoryMeta && (
                            <Link
                                href={`/themes/${selectedCategoryMeta.slug}`}
                                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                お題一覧を見る
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {gameMode === 'normal' ? (
                <>
                    <div
                        id="theme-display"
                        aria-busy={isSpinning}
                        className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-700/60 dark:via-gray-800 dark:to-gray-700/60 rounded-2xl p-5 sm:p-6 min-h-[170px] flex flex-col items-center justify-center mb-5 border border-indigo-100 dark:border-gray-700 transition-all duration-300"
                    >
                        <p className="sr-only" aria-live="polite">
                            {isSpinning
                                ? 'お題を抽選中です'
                                : currentTheme
                                    ? `選ばれたお題は「${currentTheme}」です`
                                    : 'カテゴリを選んでガチャを回してください'}
                        </p>
                        {isSpinning ? (
                            <p className="text-2xl md:text-3xl font-black text-gray-700 dark:text-gray-200 animate-pulse leading-relaxed">
                                {previewTheme}
                            </p>
                        ) : currentTheme ? (
                            <div className="w-full">
                                <span className="inline-block bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 text-xs font-bold px-3 py-1 rounded-full mb-3">
                                    {currentCategoryMeta
                                        ? `${currentCategoryMeta.emoji} ${currentCategoryMeta.name}`
                                        : 'お題'}
                                </span>
                                <p className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-relaxed">
                                    {currentTheme}
                                </p>
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            copyText(currentTheme, 'お題をコピーしました');
                                            trackEvent('theme_copied', { theme: currentTheme });
                                        }}
                                        className="p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                        aria-label="お題をコピー"
                                        title="お題をコピー"
                                    >
                                        <ClipboardIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            toggleFavorite(currentTheme);
                                            trackEvent('favorite_toggled', {
                                                theme: currentTheme,
                                                action: isFavorite ? 'removed' : 'added',
                                            });
                                        }}
                                        className="p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                                        aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                                        title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                                    >
                                        {isFavorite ? (
                                            <StarIconSolid className="h-5 w-5 text-yellow-400" />
                                        ) : (
                                            <StarIconOutline className="h-5 w-5" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPresentationOpen(true);
                                            trackEvent('presentation_opened');
                                        }}
                                        className="p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                        aria-label="お題を大きく表示"
                                        title="お題を大きく表示"
                                    >
                                        <ArrowsPointingOutIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={speakTheme}
                                        className="p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                        aria-label="お題を読み上げる"
                                        title="お題を読み上げる"
                                    >
                                        <SpeakerWaveIcon className="h-5 w-5" />
                                    </button>
                                    <ShareButtons
                                        compact
                                        shareText={currentTheme}
                                        className="ml-1 pl-3 border-l border-gray-200 dark:border-gray-600"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                    会話のきっかけを、ガチャで。
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    カテゴリを選んでボタンを押してね！
                                </p>
                            </div>
                        )}
                    </div>

                    {copyMessage && (
                        <p
                            className={`text-sm rounded-lg px-3 py-2 mb-4 ${
                                copyStatus === 'success'
                                    ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                                    : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                            }`}
                            role={copyStatus === 'error' ? 'alert' : 'status'}
                            aria-live="polite"
                        >
                            {copyStatus === 'success' ? (
                                <CheckIcon className="inline h-4 w-4 mr-1" />
                            ) : (
                                <ExclamationCircleIcon className="inline h-4 w-4 mr-1" />
                            )}
                            {copyMessage}
                        </p>
                    )}

                    {showGeminiArea && currentTheme && (
                        <div id="gemini-feature-area" className="mb-5">
                            <button
                                id="dig-deeper-button"
                                type="button"
                                onClick={getDeeperQuestions}
                                disabled={isDiggingDeeper}
                                className="w-full bg-white dark:bg-gray-700 border border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-600 font-bold py-3 px-6 rounded-xl text-base transition-all duration-200 shadow-sm hover:shadow-md btn-active-effect flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="mr-2" aria-hidden="true">✨</span>
                                {isDiggingDeeper ? 'AIが考えています...' : 'AIに深掘り質問を考えてもらう'}
                            </button>

                            {isDiggingDeeper && (
                                <div className="flex items-center justify-center p-4 mt-3" role="status">
                                    <div className="loader"></div>
                                    <p className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                                        会話が広がる質問を考えています...
                                    </p>
                                </div>
                            )}

                            {digDeeperError && (
                                <div className="mt-3 p-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg" role="alert">
                                    {digDeeperError}
                                </div>
                            )}

                            {digDeeperQuestions && digDeeperQuestions.length > 0 && (
                                <div id="dig-deeper-results" className="mt-4 text-left bg-indigo-50 dark:bg-gray-900/50 p-4 rounded-xl border border-indigo-100 dark:border-gray-700">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <h4 className="font-bold text-base text-gray-800 dark:text-gray-200">
                                            💭 こんな話題で深掘りしてみては？
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={copyAllQuestions}
                                            className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            すべてコピー
                                        </button>
                                    </div>
                                    <div className="space-y-2.5">
                                        {digDeeperQuestions.map((question, index) => (
                                            <button
                                                key={`${question}-${index}`}
                                                type="button"
                                                className="w-full text-left p-3.5 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                                onClick={() => {
                                                    copyText(question, '質問をコピーしました');
                                                    trackEvent('ai_question_copied', {
                                                        question,
                                                        theme: currentTheme,
                                                    });
                                                }}
                                            >
                                                <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                                                    {question}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                                        質問をクリックするとコピーできます
                                    </p>
                                </div>
                            )}

                            <div className="mt-4 text-center">
                                <Link
                                    href={`/excuse-generator?situation=${encodeURIComponent('雑談テーマが難しすぎて話せない')}&details=${encodeURIComponent('テーマは「' + currentTheme + '」でした')}`}
                                    className="text-xs text-gray-400 hover:text-indigo-500 transition-colors inline-flex items-center justify-center gap-1"
                                >
                                    <span aria-hidden="true">🙇‍♂️</span>
                                    このテーマで話すのは無理...（言い訳を作る）
                                </Link>
                            </div>
                        </div>
                    )}

                    <button
                        id="gacha-button"
                        type="button"
                        onClick={spinGacha}
                        disabled={isSpinning}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white font-black py-4 px-6 rounded-xl text-xl transition-all duration-200 shadow-md hover:shadow-lg btn-active-effect disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
                    >
                        {gachaButtonText}
                    </button>
                </>
            ) : gameMode === 'timeAttack' ? (
                <div className="mb-6 text-left">
                    <TimeAttackMode key={selectedCategory} themes={themePool} />
                </div>
            ) : (
                <div className="mb-6 text-left">
                    <RouletteMode />
                </div>
            )}

            {gameMode !== 'roulette' && (
                <div className="mt-8">
                    <Tabs tabs={[
                        {
                            label: `履歴${history.length > 0 ? `（${history.length}）` : ''}`,
                            content: (
                                <HistoryList
                                    history={history}
                                    favorites={favorites}
                                    onToggleFavorite={toggleFavorite}
                                    onSelectTheme={handleSelectTheme}
                                    onClear={clearHistory}
                                />
                            ),
                        },
                        {
                            label: `お気に入り${favorites.length > 0 ? `（${favorites.length}）` : ''}`,
                            content: (
                                <FavoritesList
                                    favorites={favorites}
                                    onToggleFavorite={toggleFavorite}
                                    onSelectTheme={handleSelectTheme}
                                    onClear={clearFavorites}
                                />
                            ),
                        },
                    ]} />
                </div>
            )}

            {isPresentationOpen && currentTheme && (
                <div
                    className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="お題の拡大表示"
                    onClick={() => setIsPresentationOpen(false)}
                >
                    <div className="flex min-h-full items-center justify-center">
                        <div
                            className="relative w-full max-w-4xl rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 text-center shadow-2xl dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 sm:p-10"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setIsPresentationOpen(false)}
                                className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                                aria-label="拡大表示を閉じる"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                            <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                                {currentCategoryMeta ? `${currentCategoryMeta.emoji} ${currentCategoryMeta.name}` : 'お題'}
                            </span>
                            <p className="mt-5 text-3xl font-black leading-tight text-indigo-700 dark:text-indigo-300 sm:text-5xl">
                                {currentTheme}
                            </p>
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        copyText(currentTheme, 'お題をコピーしました');
                                        trackEvent('theme_copied', { theme: currentTheme });
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                                >
                                    <ClipboardIcon className="h-4 w-4" />
                                    コピー
                                </button>
                                <button
                                    type="button"
                                    onClick={speakTheme}
                                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-200"
                                >
                                    <SpeakerWaveIcon className="h-4 w-4" />
                                    読み上げ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPresentationOpen(false)}
                                    className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
