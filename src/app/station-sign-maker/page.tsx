"use client";

import { useState } from 'react';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { StationSignForm } from '@/components/station-sign-maker/StationSignForm';
import { StationSignPreview } from '@/components/station-sign-maker/StationSignPreview';
import { ActionButtons } from '@/components/station-sign-maker/ActionButtons';
import { StationSignState, StationTemplate } from '@/types';

export default function StationSignMakerPage() {
  const [stationState, setStationState] = useState<StationSignState>({
    station: '駅名看板',
    prevStation: '前の駅',
    nextStation: '次の駅',
    lineColor: '#009b40', // JR Green
    roman: 'EKIMEIKANBAN',
  });

  const [template, setTemplate] = useState<StationTemplate>('jr-east');

  const templates: { key: StationTemplate; label: string }[] = [
    { key: 'jr-east', label: 'JR東日本風' },
    { key: 'tokyo-metro', label: 'メトロ風' },
    { key: 'simple', label: 'シンプル' },
  ];

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen p-4 sm:p-8 font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
              自分だけの駅名看板メーカー
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              SNSでシェアできる、あなただけのオリジナル駅名看板を作ろう。
            </p>
          </div>
          <ThemeToggleButton />
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Form Area */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-fit">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
              看板の情報を入力
            </h2>
            <StationSignForm stationState={stationState} setStationState={setStationState} />
          </div>

          {/* Right: Preview & Control Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  プレビュー
                </h2>
                <div className="flex flex-wrap gap-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                  {templates.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTemplate(key)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        template === key
                          ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <StationSignPreview stationState={stationState} template={template} />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mt-8">
               <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                完成したら…
              </h2>
              <ActionButtons stationName={stationState.station} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
