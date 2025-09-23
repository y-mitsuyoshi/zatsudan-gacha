"use client";

import { useState } from 'react';
import { IsekaiStatusForm } from '@/components/isekai-status/IsekaiStatusForm';
import { IsekaiStatusCard } from '@/components/isekai-status/IsekaiStatusCard';
import { ActionButtons } from '@/components/isekai-status/ActionButtons';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { IsekaiFormState, IsekaiStatus } from '@/types';
import { generateIsekaiStatus } from '@/lib/isekai-logic';

export default function IsekaiStatusPage() {
  const [formState, setFormState] = useState<IsekaiFormState>({
    name: '',
    birthDate: '',
    gender: 'none',
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: '',
  });

  const [status, setStatus] = useState<IsekaiStatus | null>(null);

  const handleGenerateStatus = () => {
    if (formState.name && formState.birthDate && formState.q1 && formState.q2 && formState.q3 && formState.q4 && formState.q5) {
      const newStatus = generateIsekaiStatus(formState);
      setStatus(newStatus);
    }
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen p-4 sm:p-8 font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
              異世界転生ステータスカード
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              キミの本当の姿、知りたくない？
            </p>
          </div>
          <ThemeToggleButton />
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Form Area */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-fit">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
              あなたの情報を入力
            </h2>
            <IsekaiStatusForm formState={formState} setFormState={setFormState} />
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={handleGenerateStatus}
                disabled={!formState.name || !formState.birthDate || !formState.q1 || !formState.q2 || !formState.q3 || !formState.q4 || !formState.q5}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                ステータスカードを生成
              </button>
            </div>
          </div>

          {/* Right: Preview & Control Area */}
          <div className="lg:col-span-3">
            {status ? (
              <>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                  <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                    あなたのステータス
                  </h2>
                  <IsekaiStatusCard status={status} />
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mt-8">
                  <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                    完成したら…
                  </h2>
                  <ActionButtons profileName={formState.name} disabled={false} />
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                  あなたのステータス
                </h2>
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎲</div>
                    <p className="text-lg">左のフォームを入力して<br/>「ステータスカードを生成」ボタンを押してください</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
