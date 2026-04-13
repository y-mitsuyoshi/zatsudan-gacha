"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { callGeminiAPI } from '@/lib/api-config';
import { themeData } from '@/lib/themeData';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { useHistory, useFavorites } from '@/lib/hooks';
import { HistoryList } from '@/components/HistoryList';
import { FavoritesList } from '@/components/FavoritesList';
import { Tabs } from '@/components/Tabs';
import { TimeAttackMode } from '@/components/TimeAttackMode';
import { RouletteMode } from '@/components/RouletteMode2';
import { ShareButtons } from '@/components/ShareButtons';
import { trackEvent } from '@/lib/firebase';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { ClockIcon, StarIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';


export default function Home() {
    type GameMode = 'normal' | 'timeAttack' | 'roulette';

    const [gameMode, setGameMode] = useState<GameMode>('normal');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [currentTheme, setCurrentTheme] = useState('');
    const [themeDisplay, setThemeDisplay] = useState<React.ReactNode>(<p className="text-lg text-gray-600 dark:text-gray-400">カテゴリを選んでボタンを押してね！</p>);
    const [gachaButtonText, setGachaButtonText] = useState('ガチャを回す');
    const [isGachaSpinning, setIsGachaSpinning] = useState(false);
    const [showGeminiArea, setShowGeminiArea] = useState(false);
    const [isDiggingDeeper, setIsDiggingDeeper] = useState(false);
    const [digDeeperResults, setDigDeeperResults] = useState<React.ReactNode>(null);
    const { history, addHistory } = useHistory();
    const { favorites, toggleFavorite } = useFavorites();
    const [isCopied, setIsCopied] = useState(false);

    const resetGeminiFeatures = useCallback(() => {
        setDigDeeperResults(null);
        setIsDiggingDeeper(false);
    }, []);

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCategory = e.target.value;
        setSelectedCategory(newCategory);
        setShowGeminiArea(false);
        resetGeminiFeatures();
        
        // カテゴリ変更をトラッキング
        trackEvent('category_changed', {
            category: newCategory,
            previous_category: selectedCategory
        });
    };

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }, []);

    const updateTheme = useCallback((theme: string) => {
        setCurrentTheme(theme);

        const categoryName = Object.keys(themeData).find(key => themeData[key].includes(theme)) || '色々';

        setThemeDisplay(
            <div className="text-center">
                <span className="inline-block bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 text-sm font-semibold px-3 py-1 rounded-full mb-3">{categoryName}</span>
                <p className="text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{theme}</p>
            </div>
        );
        setShowGeminiArea(true);
        resetGeminiFeatures();
    }, [resetGeminiFeatures]);

    useEffect(() => {
        if (currentTheme) {
            updateTheme(currentTheme);
        }
    }, [currentTheme, updateTheme]);

    const themePool = (selectedCategory === 'all')
        ? Object.values(themeData).flat()
        : themeData[selectedCategory] || [];

    const spinGacha = () => {
        setIsGachaSpinning(true);
        setGachaButtonText('抽選中...');
        setThemeDisplay(null);
        resetGeminiFeatures();

        // ガチャ実行をトラッキング
        trackEvent('gacha_spin', {
            category: selectedCategory,
            game_mode: gameMode
        });

        let shuffleCount = 0;
        const shuffleInterval = setInterval(() => {
            if (!themePool || themePool.length === 0) {
                clearInterval(shuffleInterval);
                updateTheme("テーマが見つかりません。");
                setIsGachaSpinning(false);
                setGachaButtonText('ガチャを回す');
                return;
            }
            const randomIndex = Math.floor(Math.random() * themePool.length);
            const tempTheme = themePool[randomIndex];
            setThemeDisplay(<p className="text-2xl font-bold text-gray-700 dark:text-gray-300 animate-pulse">{tempTheme}</p>);
            shuffleCount++;

            if (shuffleCount >= 10) {
                clearInterval(shuffleInterval);
                const finalThemeIndex = Math.floor(Math.random() * themePool.length);
                const finalTheme = themePool[finalThemeIndex];
                updateTheme(finalTheme);
                // ノーマルモードの場合のみ履歴に追加
                if (gameMode === 'normal') {
                    addHistory(finalTheme);
                }
                setIsGachaSpinning(false);
                setGachaButtonText('もう一度回す');

                // ガチャ結果をトラッキング
                trackEvent('gacha_result', {
                    theme: finalTheme,
                    category: selectedCategory,
                    game_mode: gameMode
                });
            }
        }, 100);
    };

    const handleSelectTheme = (theme: string) => {
        updateTheme(theme);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getDeeperQuestions = async () => {
        if (!currentTheme) return;

        setIsDiggingDeeper(true);
        setDigDeeperResults(
            <div className="flex items-center justify-center p-4">
                <div className="loader"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-400">AIが質問を考えています...</p>
            </div>
        );

        // AI深掘り機能使用をトラッキング
        trackEvent('ai_dig_deeper_requested', {
            theme: currentTheme,
            category: selectedCategory
        });

        try {
            const result = await callGeminiAPI(currentTheme);
            
            const questions = result.text.split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^[•\-\*\d\.]\s*/, '').trim())
                .filter(line => line);

            // AI深掘り成功をトラッキング
            trackEvent('ai_dig_deeper_success', {
                theme: currentTheme,
                questions_count: questions.length
            });

            setDigDeeperResults(
                <div className="space-y-3">
                    <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-4">
                        💭 こんな話題で深掘りしてみては？
                    </h4>
                    {questions.map((question, index) => (
                        <div 
                            key={index}
                            className="p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-200 cursor-pointer"
                            onClick={() => {
                                handleCopy(question);
                                // 質問コピーをトラッキング
                                trackEvent('ai_question_copied', {
                                    question: question,
                                    theme: currentTheme
                                });
                            }}
                        >
                            <p className="text-gray-700 dark:text-gray-300 font-medium">
                                {question}
                            </p>
                        </div>
                    ))}
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        ✨ 質問をクリックするとコピーできます
                    </p>
                </div>
            );
        } catch (error) {
            console.error("API call failed:", error);
            
            // AI深掘り失敗をトラッキング
            trackEvent('ai_dig_deeper_error', {
                theme: currentTheme,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            setDigDeeperResults(<p className="text-red-600">エラーが発生しました。少し時間をおいてから、もう一度お試しください。</p>);
        } finally {
            setIsDiggingDeeper(false);
        }
    };


    return (
        <div className="bg-slate-100 dark:bg-slate-900 flex items-center justify-center min-h-screen p-4 font-sans transition-colors duration-300">
            <div className="relative bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-xl text-center w-full max-w-lg mx-auto transition-colors duration-300">
                <div className="absolute top-4 right-4">
                    <ThemeToggleButton />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">雑談テーマガチャ</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-6">リモートでも、雑談でつながろう。</p>

                <div className="mb-6">
                    <div className="flex justify-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1 mb-6">
                        <button
                            onClick={() => {
                                setGameMode('normal');
                                trackEvent('game_mode_changed', { mode: 'normal' });
                            }}
                            className={`w-1/3 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                gameMode === 'normal'
                                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
                            }`}
                        >
                            ノーマル
                        </button>
                        <button
                            onClick={() => {
                                setGameMode('timeAttack');
                                trackEvent('game_mode_changed', { mode: 'timeAttack' });
                            }}
                            className={`w-1/3 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                gameMode === 'timeAttack'
                                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
                            }`}
                        >
                            タイムアタック
                        </button>
                        <button
                            onClick={() => {
                                setGameMode('roulette');
                                trackEvent('game_mode_changed', { mode: 'roulette' });
                            }}
                            className={`w-1/3 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                gameMode === 'roulette'
                                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
                            }`}
                        >
                            ルーレット
                        </button>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="category-select" className="block text-left text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">カテゴリを選ぶ:</label>
                        <select
                            id="category-select"
                            value={selectedCategory}
                            onChange={handleCategoryChange}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            style={{ display: gameMode === 'roulette' ? 'none' : 'block' }}
                        >
                            <option value="all">すべてのテーマ</option>
                            {Object.keys(themeData).map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    {gameMode === 'timeAttack' && (
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">制限時間内にテーマについて語りきろう！</p>
                    )}
                    
                    {gameMode === 'roulette' && (
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">ルーレットで抽選しよう！項目と重みを設定できます。</p>
                    )}
                </div>


                {gameMode === 'normal' ? (
                    <>
                        <div id="theme-display" className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 min-h-[150px] flex items-center justify-center mb-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
                            {themeDisplay}
                        </div>

                        {currentTheme && (
                            <div className="mb-6">
                                <div className="flex justify-center items-center space-x-4">
                                    <button
                                        onClick={() => {
                                            handleCopy(currentTheme);
                                            trackEvent('theme_copied', { theme: currentTheme });
                                        }}
                                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                                        aria-label="コピーする"
                                    >
                                        {isCopied ? (
                                            <CheckIcon className="h-6 w-6 text-green-500" />
                                        ) : (
                                            <ClipboardIcon className="h-6 w-6 text-gray-400" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            toggleFavorite(currentTheme);
                                            trackEvent('favorite_toggled', { 
                                                theme: currentTheme,
                                                action: favorites.includes(currentTheme) ? 'removed' : 'added'
                                            });
                                        }}
                                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                                        aria-label="お気に入りに追加/削除"
                                    >
                                        {favorites.includes(currentTheme) ? (
                                            <StarIconSolid className="h-6 w-6 text-yellow-400" />
                                        ) : (
                                            <StarIconOutline className="h-6 w-6 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                                {isCopied && <p className="text-sm text-green-600 dark:text-green-400 mt-2">コピーしました！</p>}
                            </div>
                        )}

                        {showGeminiArea && (
                            <div id="gemini-feature-area" className="mb-6">
                                <button
                                    id="dig-deeper-button"
                                    onClick={getDeeperQuestions}
                                    disabled={isDiggingDeeper}
                                    className="w-full bg-white dark:bg-gray-700 border border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-600 font-bold py-3 px-6 rounded-lg text-lg transition-all duration-200 shadow-sm hover:shadow-md btn-active-effect flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="mr-2">✨</span> AIに深掘り質問を考えてもらう
                                </button>
                                {digDeeperResults && (
                                    <div id="dig-deeper-results" className="mt-4 text-left bg-indigo-50 dark:bg-gray-900/50 p-4 rounded-lg border border-indigo-200 dark:border-gray-700">
                                        {digDeeperResults}
                                    </div>
                                )}
                                
                                <div className="mt-4 text-center">
                                    <Link 
                                        href={`/excuse-generator?situation=${encodeURIComponent('雑談テーマが難しすぎて話せない')}&details=${encodeURIComponent('テーマは「' + currentTheme + '」でした')}`}
                                        className="text-xs text-gray-400 hover:text-indigo-500 transition-colors flex items-center justify-center space-x-1"
                                    >
                                        <span>🙇‍♂️ このテーマで話すのは無理...（言い訳を作る）</span>
                                    </Link>
                                </div>
                            </div>
                        )}

                        <button
                            id="gacha-button"
                            onClick={spinGacha}
                            disabled={isGachaSpinning}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-200 shadow-md hover:shadow-lg btn-active-effect disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {gachaButtonText}
                        </button>
                    </>
                ) : gameMode === 'timeAttack' ? (
                    <div className="mb-6">
                        <TimeAttackMode themes={themePool} />
                    </div>
                ) : (
                    <div className="mb-6">
                        <RouletteMode />
                    </div>
                )}

                {gameMode !== 'roulette' && (
                    <div className="mt-8">
                        <Tabs tabs={[
                            {
                                label: '履歴',
                                content: <HistoryList history={history} favorites={favorites} onToggleFavorite={toggleFavorite} onSelectTheme={handleSelectTheme} />
                            },
                            {
                                label: 'お気に入り',
                                content: <FavoritesList favorites={favorites} onToggleFavorite={toggleFavorite} onSelectTheme={handleSelectTheme} />
                            }
                        ]} />
                    </div>
                )}

                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">🎮 他のゲームで遊ぶ</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/shachiku-jinro" className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 transition-all text-center group">
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">🐺</span>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">社畜人狼</span>
                        </Link>
                        <Link href="/shachiku-sugoroku" className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 transition-all text-center group">
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">🏢</span>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">社畜すごろく</span>
                        </Link>
                        <Link href="/isekai-status" className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 transition-all text-center group">
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">⚔️</span>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">異世界ステータス</span>
                        </Link>
                        <Link href="/profile-maker" className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 transition-all text-center group">
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">💖</span>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">プロフメーカー</span>
                        </Link>
                        <Link href="/excuse-generator" className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 transition-all text-center group">
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">🙇‍♂️</span>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">言い訳ジェネレーター</span>
                        </Link>
                    </div>
                </div>

                <ShareButtons />
            </div>
        </div>
    );
}
