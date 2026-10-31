"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { callExcuseGeneratorAPI } from '@/lib/api-config';
import { copyToClipboard } from '@/lib/clipboard';
import { ClockIcon, ClipboardIcon, CheckIcon, ShareIcon, TrashIcon } from '@heroicons/react/24/outline';

const SITUATIONS = [
    '遅刻・寝坊',
    '納期遅れ',
    '飲み会の断り',
    '宿題・課題忘れ',
    '既読スルー',
    '自炊をサボった',
    '約束をすっぽかした',
    'その他',
];

const TONES = [
    '真面目・ビジネス用',
    'ユーモア・社畜風',
    '異世界転生風',
    'マッチョ風',
    'ツンデレ風',
    '文豪風',
    '猫風',
    'ラップ風',
    'ギャル風',
    'ランダム（ガチャ）',
];

const HISTORY_STORAGE_KEY = 'excuse_history';
const MAX_HISTORY_ITEMS = 20;

interface ExcuseHistory {
    id: string;
    situation: string;
    tone: string;
    excuse: string;
    timestamp: number;
}

function createHistoryId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadHistory(): ExcuseHistory[] {
    try {
        const saved = window.localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!saved) {
            return [];
        }
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .filter((item): item is ExcuseHistory =>
                Boolean(item) &&
                typeof item === 'object' &&
                typeof (item as ExcuseHistory).id === 'string' &&
                typeof (item as ExcuseHistory).situation === 'string' &&
                typeof (item as ExcuseHistory).tone === 'string' &&
                typeof (item as ExcuseHistory).excuse === 'string' &&
                typeof (item as ExcuseHistory).timestamp === 'number'
            )
            .slice(0, MAX_HISTORY_ITEMS);
    } catch {
        return [];
    }
}

function ExcuseGeneratorContent() {
    const searchParams = useSearchParams();

    const [situation, setSituation] = useState('遅刻・寝坊');
    const [customSituation, setCustomSituation] = useState('');
    const [tone, setTone] = useState('ランダム（ガチャ）');
    const [selectedToneDisplay, setSelectedToneDisplay] = useState('');
    const [details, setDetails] = useState('');
    const [excuse, setExcuse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [history, setHistory] = useState<ExcuseHistory[]>([]);
    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const copyTimerRef = useRef<number | null>(null);

    // Initialize from search params
    useEffect(() => {
        const initialSituation = searchParams?.get('situation');
        const initialDetails = searchParams?.get('details');

        if (initialSituation) {
            if (SITUATIONS.includes(initialSituation)) {
                setSituation(initialSituation);
            } else {
                setSituation('その他');
                setCustomSituation(initialSituation.slice(0, 100));
            }
        }
        if (initialDetails) {
            setDetails(initialDetails.slice(0, 500));
        }
    }, [searchParams]);

    // Load history from localStorage after hydration.
    useEffect(() => {
        setHistory(loadHistory());
        setIsHistoryLoaded(true);
    }, []);

    // Save only after the initial load has completed, so stored history is not wiped.
    useEffect(() => {
        if (!isHistoryLoaded) {
            return;
        }
        try {
            window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        } catch (error) {
            console.error('Failed to save history', error);
        }
    }, [history, isHistoryLoaded]);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current !== null) {
                window.clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    const generateExcuse = async () => {
        const finalSituation = situation === 'その他' ? customSituation.trim() : situation;

        if (!finalSituation) {
            setErrorMessage('具体的なシチュエーションを入力してください。');
            return;
        }

        setIsLoading(true);
        setExcuse('');
        setSelectedToneDisplay('');
        setErrorMessage('');

        let finalTone = tone;
        if (tone === 'ランダム（ガチャ）') {
            const availableTones = TONES.filter(t => t !== 'ランダム（ガチャ）');
            finalTone = availableTones[Math.floor(Math.random() * availableTones.length)];
        }
        setSelectedToneDisplay(finalTone);

        try {
            const data = await callExcuseGeneratorAPI(finalSituation, finalTone, details.trim());
            const newExcuse = data.excuse;
            setExcuse(newExcuse);

            const historyEntry: ExcuseHistory = {
                id: createHistoryId(),
                situation: finalSituation,
                tone: finalTone,
                excuse: newExcuse,
                timestamp: Date.now(),
            };
            setHistory(prev => [historyEntry, ...prev].slice(0, MAX_HISTORY_ITEMS));
        } catch (error) {
            console.error(error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : '言い訳の生成に失敗しました。今回は潔く自力で謝りましょう…。'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async (text: string, id: string) => {
        try {
            await copyToClipboard(text);
            setCopiedId(id);
            setErrorMessage('');
            if (copyTimerRef.current !== null) {
                window.clearTimeout(copyTimerRef.current);
            }
            copyTimerRef.current = window.setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error('Failed to copy', error);
            setErrorMessage('コピーできませんでした。テキストを長押ししてコピーしてください。');
        }
    };

    const shareOnX = (text: string) => {
        const trimmed = text.length > 140 ? `${text.substring(0, 140)}...` : text;
        const shareText = `究極の言い訳を生成しました！\n\n「${trimmed}」\n\n#言い訳ジェネレーター #雑談ガチャ`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent('https://zatsudan-gacha.app/excuse-generator')}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const deleteHistoryItem = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    const clearHistory = () => {
        if (confirm('履歴をすべて削除しますか？')) {
            setHistory([]);
        }
    };

    const canGenerate = !isLoading && (situation !== 'その他' || customSituation.trim().length > 0);

    return (
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen p-4 font-sans transition-colors duration-300">
            <div className="max-w-2xl mx-auto pt-8 pb-16">
                <div className="flex justify-between items-center mb-8">
                    <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center">
                        <span className="mr-1">←</span> トップへ戻る
                    </Link>
                    <div className="flex items-center space-x-4">
                        <button
                            type="button"
                            onClick={() => setShowHistory(!showHistory)}
                            className="p-2 rounded-full hover:bg-white/50 dark:hover:bg-gray-800 transition-colors"
                            title={showHistory ? '入力画面に戻る' : '履歴を表示'}
                            aria-label={showHistory ? '入力画面に戻る' : '生成履歴を表示'}
                            aria-expanded={showHistory}
                        >
                            <ClockIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </button>
                        <ThemeToggleButton />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full pointer-events-none" aria-hidden="true"></div>

                    <div className="text-center mb-8 relative">
                        <span className="text-5xl mb-4 block animate-bounce" aria-hidden="true">🙇‍♂️</span>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">究極の言い訳ジェネレーター</h1>
                        <p className="text-gray-500 dark:text-gray-400">ピンチを切り抜ける（かもしれない）最高の言い訳をAIが生成します</p>
                    </div>

                    {!showHistory ? (
                        <div className="space-y-6">
                            <div>
                                <p className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">シチュエーション</p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="シチュエーション">
                                    {SITUATIONS.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            aria-pressed={situation === s}
                                            onClick={() => setSituation(s)}
                                            className={`p-2 text-sm rounded-lg border transition-all ${
                                                situation === s
                                                    ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-md'
                                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {situation === 'その他' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label htmlFor="custom-situation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        具体的なシチュエーション
                                    </label>
                                    <input
                                        id="custom-situation"
                                        type="text"
                                        value={customSituation}
                                        onChange={(e) => setCustomSituation(e.target.value)}
                                        placeholder="例：ペットの猫がキーボードから退いてくれない"
                                        maxLength={100}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            )}

                            <div>
                                <label htmlFor="excuse-tone" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    トーン（文体）
                                </label>
                                <select
                                    id="excuse-tone"
                                    value={tone}
                                    onChange={(e) => setTone(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="excuse-details" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    詳細情報（任意）
                                </label>
                                <textarea
                                    id="excuse-details"
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="例：相手は厳しい上司、本当は寝坊したけど電車遅延にしたい"
                                    maxLength={500}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-24 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{details.length}/500</p>
                            </div>

                            {errorMessage && (
                                <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg p-3" role="alert">
                                    {errorMessage}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={generateExcuse}
                                disabled={!canGenerate}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        AIが必死に考えています...
                                    </>
                                ) : '言い訳を生成する'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">生成履歴</h2>
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={clearHistory}
                                        className="text-sm text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        すべて削除
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowHistory(false)}
                                        className="text-sm text-indigo-600 dark:text-indigo-400 font-medium px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                    >
                                        戻る
                                    </button>
                                </div>
                            </div>

                            {history.length === 0 ? (
                                <p className="text-center py-12 text-gray-500 dark:text-gray-400">履歴がありません</p>
                            ) : (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {history.map((item) => (
                                        <div key={item.id} className="p-4 bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mr-2">{item.situation}</span>
                                                    <span className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteHistoryItem(item.id)}
                                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                                    aria-label="この履歴を削除"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">{item.excuse}</p>
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(item.excuse, item.id)}
                                                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                                >
                                                    {copiedId === item.id ? <CheckIcon className="w-3 h-3 text-green-500" /> : <ClipboardIcon className="w-3 h-3" />}
                                                    <span>{copiedId === item.id ? 'コピー済み' : 'コピー'}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => shareOnX(item.excuse)}
                                                    className="flex items-center justify-center p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:text-sky-500 transition-colors"
                                                    aria-label="この言い訳をXでシェア"
                                                >
                                                    <ShareIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {errorMessage && showHistory && (
                        <p className="mt-4 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg p-3" role="alert">
                            {errorMessage}
                        </p>
                    )}

                    {excuse && !showHistory && (
                        <div className="mt-8 p-6 bg-indigo-50 dark:bg-gray-900/50 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl animate-in zoom-in-95 duration-500 relative" aria-live="polite">
                            <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-lg">
                                生成結果
                            </div>

                            <div className="flex justify-between items-center mb-4 mt-2">
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">言い訳メッセージ</h3>
                                {selectedToneDisplay && (
                                    <span className="text-[10px] font-bold bg-white dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800 shadow-sm">
                                        トーン：{selectedToneDisplay}
                                    </span>
                                )}
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-inner border border-indigo-100/50 dark:border-gray-700 mb-6">
                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{excuse}</p>
                            </div>

                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    type="button"
                                    onClick={() => handleCopy(excuse, 'result')}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-md active:scale-95"
                                >
                                    {copiedId === 'result' ? (
                                        <>
                                            <CheckIcon className="w-5 h-5" />
                                            <span>コピーしました！</span>
                                        </>
                                    ) : (
                                        <>
                                            <ClipboardIcon className="w-5 h-5" />
                                            <span>テキストをコピー</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => shareOnX(excuse)}
                                    className="sm:w-14 bg-white dark:bg-gray-800 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold py-3 rounded-xl transition-all hover:bg-indigo-50 dark:hover:bg-gray-700 flex items-center justify-center shadow-sm active:scale-95"
                                    title="Xでシェア"
                                    aria-label="この言い訳をXでシェア"
                                >
                                    <ShareIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
                    <p>※AIが生成する言い訳は自己責任でご利用ください。人間関係の悪化について責任は負いかねます。</p>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                }
            `}</style>
        </div>
    );
}

export default function ExcuseGeneratorPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen bg-slate-100 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" aria-label="読み込み中"></div>
            </div>
        }>
            <ExcuseGeneratorContent />
        </Suspense>
    );
}
