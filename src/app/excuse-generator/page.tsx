"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

export default function ExcuseGeneratorPage() {
    const [situation, setSituation] = useState('遅刻・寝坊');
    const [customSituation, setCustomSituation] = useState('');
    const [tone, setTone] = useState('ユーモア・社畜風');
    const [details, setDetails] = useState('');
    const [excuse, setExcuse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const situations = ['遅刻・寝坊', '納期遅れ', '飲み会の断り', 'その他'];
    const tones = ['ユーモア・社畜風', '真面目・ビジネス用', '異世界転生風', 'ランダム（ガチャ）'];

    const generateExcuse = async () => {
        setIsLoading(true);
        setExcuse('');
        
        const finalSituation = situation === 'その他' ? customSituation : situation;
        const finalTone = tone === 'ランダム（ガチャ）' 
            ? tones[Math.floor(Math.random() * (tones.length - 1))] 
            : tone;

        try {
            const res = await fetch('/api/excuse-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    situation: finalSituation,
                    tone: finalTone,
                    details
                })
            });

            if (!res.ok) throw new Error('API Error');
            
            const data = await res.json();
            setExcuse(data.excuse);
        } catch (error) {
            console.error(error);
            setExcuse('言い訳の生成に失敗しました。今回は潔く自力で謝りましょう…。');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(excuse).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen p-4 font-sans transition-colors duration-300">
            <div className="max-w-2xl mx-auto pt-8">
                <div className="flex justify-between items-center mb-8">
                    <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">
                        ← トップへ戻る
                    </Link>
                    <ThemeToggleButton />
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-xl transition-colors duration-300">
                    <div className="text-center mb-8">
                        <span className="text-4xl mb-4 block">🙇‍♂️</span>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">究極の言い訳ジェネレーター</h1>
                        <p className="text-gray-500 dark:text-gray-400">ピンチを切り抜ける（かもしれない）言い訳をAIが生成します</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">シチュエーション</label>
                            <select 
                                value={situation} 
                                onChange={(e) => setSituation(e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {situations.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {situation === 'その他' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">具体的なシチュエーション</label>
                                <input 
                                    type="text" 
                                    value={customSituation}
                                    onChange={(e) => setCustomSituation(e.target.value)}
                                    placeholder="例：ペットの猫がキーボードから退いてくれない"
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">トーン（文体）</label>
                            <select 
                                value={tone} 
                                onChange={(e) => setTone(e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {tones.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">詳細情報（任意）</label>
                            <textarea 
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="例：相手は厳しい上司、本当は寝坊したけど電車遅延にしたい"
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-24"
                            />
                        </div>

                        <button
                            onClick={generateExcuse}
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-all duration-200 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'AIが必死に考えています...' : '言い訳を生成する'}
                        </button>
                    </div>

                    {excuse && (
                        <div className="mt-8 p-6 bg-indigo-50 dark:bg-gray-900/50 border border-indigo-200 dark:border-gray-700 rounded-xl">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">生成された言い訳：</h3>
                            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-4">{excuse}</p>
                            <button
                                onClick={handleCopy}
                                className="w-full bg-white dark:bg-gray-800 border border-indigo-200 dark:border-gray-600 text-indigo-600 dark:text-indigo-400 font-bold py-2 px-4 rounded-lg transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700"
                            >
                                {isCopied ? 'コピーしました！' : 'テキストをコピーする'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
