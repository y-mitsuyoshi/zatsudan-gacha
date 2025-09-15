"use client";

import { useState, useMemo } from 'react';
import { IsekaiStatusForm } from '@/components/isekai-status/IsekaiStatusForm';
import { IsekaiStatusCard } from '@/components/isekai-status/IsekaiStatusCard';
import { ActionButtons } from '@/components/isekai-status/ActionButtons';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { IsekaiFormState } from '@/types';
import { generateIsekaiStatus } from '@/lib/isekai-logic';

export default function IsekaiStatusPage() {
  const [formState, setFormState] = useState<IsekaiFormState>({
    name: 'ユウシャ',
    birthDate: '2000-01-01',
    gender: 'none',
    q1: 'A',
    q2: 'A',
    q3: 'A',
    q4: 'A',
    q5: 'A',
  });

  // Re-generate status only when formState changes
  const status = useMemo(() => generateIsekaiStatus(formState), [formState]);

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
          </div>

          {/* Right: Preview & Control Area */}
          <div className="lg:col-span-3">
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
              <ActionButtons profileName={formState.name} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
