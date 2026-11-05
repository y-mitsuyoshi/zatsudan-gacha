"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { callExcuseGeneratorAPI } from '@/lib/api-config';
import { copyToClipboard } from '@/lib/clipboard';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { TOOL_SEO_DATA, buildToolJsonLd } from '@/lib/toolSeoData';
import { ClockIcon, ClipboardIcon, CheckIcon, ShareIcon, TrashIcon } from '@heroicons/react/24/outline';

const SITUATIONS = [
    { value: '遅刻・寝坊' },
    { value: '納期遅れ' },
    { value: '飲み会の断り' },
    { value: '宿題・課題忘れ' },
    { value: '既読スルー' },
    { value: '自炊をサボった' },
    { value: '約束をすっぽかした' },
    { value: 'その他' },
] as const;

const TONES = [
    { value: '真面目・ビジネス用', hint: '誠実そうに見える' },
    { value: 'ユーモア・社畜風', hint: '自虐で笑いを取る' },
    { value: '異世界転生風', hint: '世界観で逃げ切る' },
    { value: 'マッチョ風', hint: '筋肉で押し切る' },
    { value: 'ツンデレ風', hint: '照れ隠しで謝る' },
    { value: '文豪風', hint: '文学的に語る' },
    { value: '猫風', hint: 'にゃんで誤魔化す' },
    { value: 'ラップ風', hint: '韻で謝罪する' },
    { value: 'ギャル風', hint: '軽やかに乗り切る' },
    { value: 'ランダム（ガチャ）', hint: 'おまかせ' },
] as const;

const TONE_VALUES = TONES.map((item) => item.value);
const SITUATION_VALUES = SITUATIONS.map((item) => item.value);

const tool = TOOL_SEO_DATA.excuse;

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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const initialSituation = params.get('situation');
        const initialDetails = params.get('details');

        if (initialSituation) {
            if (SITUATION_VALUES.includes(initialSituation as (typeof SITUATION_VALUES)[number])) {
                setSituation(initialSituation);
            } else {
                setSituation('その他');
                setCustomSituation(initialSituation.slice(0, 100));
            }
        }
        if (initialDetails) {
            setDetails(initialDetails.slice(0, 500));
        }
    }, []);

    useEffect(() => {
        setHistory(loadHistory());
        setIsHistoryLoaded(true);
    }, []);

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
            const availableTones = TONE_VALUES.filter(t => t !== 'ランダム（ガチャ）');
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
        const shareText = `究極の言い訳を生成しました。\n\n「${trimmed}」\n\n#言い訳ジェネレーター #雑談ガチャ`;
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
        <div className="paper-page min-h-screen px-4 py-6 font-sans transition-colors duration-300 sm:px-6">
            <div className="mx-auto max-w-3xl pt-2 pb-16">
                <header className="mb-8 flex items-center justify-between border-b border-[var(--line)] pb-4">
                    <Link href="/" className="font-label text-[10px] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]">
                        ← 雑談テーマガチャ
                    </Link>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowHistory(!showHistory)}
                            className="paper-button px-3 py-2 text-xs"
                            aria-expanded={showHistory}
                        >
                            <ClockIcon className="h-4 w-4" />
                            {showHistory ? '入力に戻る' : '履歴'}
                        </button>
                        <ThemeToggleButton />
                    </div>
                </header>

                <div className="mb-8">
                    <p className="paper-kicker">Tool 03 / Excuse Generator</p>
                    <h1 className="font-editorial mt-2 text-[1.6rem] leading-tight text-balance sm:text-4xl">
                        究極の言い訳ジェネレーター
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
                        シチュエーションと文体を選ぶだけ。ピンチを切り抜ける、もっともらしい一文を組み立てます。
                        使いどころは自己責任で。
                    </p>
                </div>

                <div className="paper-panel p-5 sm:p-7">
                    {!showHistory ? (
                        <div className="space-y-8">
                            <section>
                                <div className="mb-3 flex items-baseline justify-between border-b border-[var(--line)] pb-2">
                                    <h2 className="flex items-baseline gap-3 text-sm font-black">
                                        <span className="font-label text-[10px] text-[var(--accent)]">01</span>
                                        シチュエーション
                                    </h2>
                                    <span className="font-label text-[9px] text-[var(--ink-soft)]">Select one</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="シチュエーション">
                                    {SITUATIONS.map((option, index) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            aria-pressed={situation === option.value}
                                            onClick={() => setSituation(option.value)}
                                            className="paper-chip flex min-h-[58px] flex-col items-start justify-between px-3 py-2 text-left"
                                        >
                                            <span className="font-label text-[9px] opacity-60">{String(index + 1).padStart(2, '0')}</span>
                                            <span className="text-xs font-bold leading-4">{option.value}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {situation === 'その他' && (
                                <section>
                                    <label htmlFor="custom-situation" className="mb-2 block text-xs font-bold text-[var(--ink-soft)]">
                                        具体的なシチュエーション
                                    </label>
                                    <input
                                        id="custom-situation"
                                        type="text"
                                        value={customSituation}
                                        onChange={(e) => setCustomSituation(e.target.value)}
                                        placeholder="例：ペットの猫がキーボードから退いてくれない"
                                        maxLength={100}
                                        className="field-paper px-3 py-3 text-sm"
                                    />
                                </section>
                            )}

                            <section>
                                <div className="mb-3 flex items-baseline justify-between border-b border-[var(--line)] pb-2">
                                    <h2 className="flex items-baseline gap-3 text-sm font-black">
                                        <span className="font-label text-[10px] text-[var(--accent)]">02</span>
                                        トーン（文体）
                                    </h2>
                                    <span className="font-label text-[9px] text-[var(--ink-soft)]">Select one</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="トーン（文体）">
                                    {TONES.map((option, index) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={tone === option.value}
                                            onClick={() => setTone(option.value)}
                                            className="paper-chip px-3 py-2.5 text-left"
                                        >
                                            <span className="font-label block text-[9px] opacity-60">{String(index + 1).padStart(2, '0')}</span>
                                            <span className="mt-0.5 block text-xs font-bold leading-4">{option.value}</span>
                                            <span className="mt-0.5 block text-[10px] opacity-70">{option.hint}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <div className="mb-3 flex items-baseline justify-between border-b border-[var(--line)] pb-2">
                                    <h2 className="flex items-baseline gap-3 text-sm font-black">
                                        <span className="font-label text-[10px] text-[var(--accent)]">03</span>
                                        詳細情報
                                    </h2>
                                    <span className="font-label text-[9px] text-[var(--ink-soft)]">Optional</span>
                                </div>
                                <label htmlFor="excuse-details" className="sr-only">
                                    詳細情報（任意）
                                </label>
                                <textarea
                                    id="excuse-details"
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="例：相手は厳しい上司。本当は寝坊したけど、電車遅延にしたい。"
                                    maxLength={500}
                                    className="field-paper h-28 px-3 py-3 text-sm"
                                />
                                <p className="mt-1 text-right font-label text-[9px] text-[var(--ink-soft)]">{details.length}/500</p>
                            </section>

                            {errorMessage && (
                                <p className="border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent)]" role="alert">
                                    {errorMessage}
                                </p>
                            )}

                            <div>
                                <button
                                    type="button"
                                    onClick={generateExcuse}
                                    disabled={!canGenerate}
                                    className="paper-button-primary w-full px-5 py-4 text-base"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="loader" style={{ width: 18, height: 18, borderWidth: 3 }} aria-hidden="true" />
                                            言い訳を組み立てています…
                                        </>
                                    ) : (
                                        <>
                                            言い訳を組み立てる
                                            <span className="font-label text-[9px] opacity-80">Generate</span>
                                        </>
                                    )}
                                </button>
                                <p className="mt-3 text-center text-[11px] leading-5 text-[var(--ink-soft)]">
                                    生成した言い訳はブラウザ内の履歴にのみ保存されます。個人情報や機密情報は入力しないでください。
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
                                <div>
                                    <p className="paper-kicker">Archive</p>
                                    <h2 className="font-editorial mt-1 text-2xl">生成履歴</h2>
                                    <p className="mt-1 text-[11px] text-[var(--ink-soft)]">このブラウザに最大20件保存されます</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={clearHistory}
                                        className="paper-button px-3 py-2 text-xs text-[var(--accent)]"
                                    >
                                        すべて削除
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowHistory(false)}
                                        className="paper-button px-3 py-2 text-xs"
                                    >
                                        戻る
                                    </button>
                                </div>
                            </div>

                            {history.length === 0 ? (
                                <p className="py-16 text-center text-sm text-[var(--ink-soft)]">まだ履歴はありません。</p>
                            ) : (
                                <div className="custom-scrollbar mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-2">
                                    {history.map((item, index) => (
                                        <article key={item.id} className="border border-[var(--line)] bg-[var(--paper-strong)] p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-label text-[9px] text-[var(--accent)]">
                                                        No.{String(history.length - index).padStart(2, '0')} / {item.tone}
                                                    </p>
                                                    <p className="mt-1 text-xs font-bold">{item.situation}</p>
                                                    <p className="font-label text-[9px] text-[var(--ink-soft)]">
                                                        {new Date(item.timestamp).toLocaleString('ja-JP')}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteHistoryItem(item.id)}
                                                    className="shrink-0 p-1 text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]"
                                                    aria-label="この履歴を削除"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="mt-3 whitespace-pre-wrap border-t border-dashed border-[var(--line)] pt-3 text-sm leading-6">
                                                {item.excuse}
                                            </p>
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(item.excuse, item.id)}
                                                    className="paper-button flex-1 px-3 py-2 text-xs"
                                                >
                                                    {copiedId === item.id ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardIcon className="h-3.5 w-3.5" />}
                                                    {copiedId === item.id ? 'コピー済み' : 'コピー'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => shareOnX(item.excuse)}
                                                    className="paper-button px-3 py-2 text-xs"
                                                    aria-label="この言い訳をXでシェア"
                                                >
                                                    <ShareIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {errorMessage && showHistory && (
                    <p className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent)]" role="alert">
                        {errorMessage}
                    </p>
                )}

                {excuse && !showHistory && (
                    <section className="paper-panel-flat mt-6 p-5 sm:p-7" aria-live="polite">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
                            <div>
                                <p className="paper-kicker">Output</p>
                                <h2 className="font-editorial mt-1 text-2xl">生成結果</h2>
                            </div>
                            {selectedToneDisplay && (
                                <span className="font-label border border-[var(--line-strong)] bg-[var(--paper-muted)] px-2 py-1 text-[9px] text-[var(--ink-soft)]">
                                    Tone: {selectedToneDisplay}
                                </span>
                            )}
                        </div>
                        <p className="mt-5 whitespace-pre-wrap text-base leading-8">{excuse}</p>
                        <div className="mt-6 flex flex-col gap-2 border-t border-[var(--line)] pt-4 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => handleCopy(excuse, 'result')}
                                className="paper-button-primary flex-1 px-4 py-3 text-sm"
                            >
                                {copiedId === 'result' ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                                {copiedId === 'result' ? 'コピーしました' : 'テキストをコピー'}
                            </button>
                            <button
                                type="button"
                                onClick={() => shareOnX(excuse)}
                                className="paper-button px-4 py-3 text-sm sm:w-14"
                                aria-label="この言い訳をXでシェア"
                            >
                                <ShareIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={generateExcuse}
                            disabled={!canGenerate}
                            className="paper-button mt-2 w-full px-4 py-3 text-sm"
                        >
                            {isLoading ? '組み立て直しています…' : '別の言い訳を組み立てる'}
                        </button>
                    </section>
                )}

                <p className="mt-6 text-center text-[11px] leading-5 text-[var(--ink-soft)]">
                    生成される言い訳はフィクションです。実際の人間関係は、ほどほどに。
                </p>
            </div>

            <SeoContentSection
                variant="light"
                eyebrow="TOOL GUIDE"
                title={`${tool.name}の使い方とFAQ`}
                intro={tool.description}
                steps={tool.steps}
                faqs={tool.faqs}
                related={tool.related}
                breadcrumbs={[
                    { label: '雑談テーマガチャ', href: '/' },
                    { label: '無料ツール一覧', href: '/tools' },
                    { label: tool.name },
                ]}
                jsonLd={buildToolJsonLd(tool)}
            />
        </div>
    );
}

export default function ExcuseGeneratorPage() {
    return <ExcuseGeneratorContent />;
}
