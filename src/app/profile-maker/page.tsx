"use client";

import { useState } from 'react';
import { ProfileForm } from '@/components/profile-maker/ProfileForm';
import { ProfileCardPreview } from '@/components/profile-maker/ProfileCardPreview';
import { ActionButtons } from '@/components/profile-maker/ActionButtons';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { ProfileState, Template } from '@/types';

export default function ProfileMakerPage() {
  const [profile, setProfile] = useState<ProfileState>({
    name: 'すごい推し',
    group: '次元を超えた存在',
    color: '#a855f7', // purple-500
    likes: ['顔', '声', '全部'],
    episode: '伝説のライブでのパフォーマンスに感動した',
    favoriteVisual: 'デビュー当時の初々しいビジュアル',
    favoriteQuote: '「諦めたらそこで試合終了ですよ」',
    customTags: ['#存在が尊い', '#歩く芸術'],
    pairName: '伝説のコンビ',
    pairEpisode: '二人にしか出せない空気感が好き',
    fanHistory: 'デビュー当時から',
    title: '顔面国宝',
  });

  const [template, setTemplate] = useState<Template>('simple');

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen p-4 sm:p-8 font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
              推し活プロフィールメーカー
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              君の「好き」をカードにのせて、世界に届けよう。
            </p>
          </div>
          <ThemeToggleButton />
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Form Area */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
              プロフィールを入力
            </h2>
            <ProfileForm profile={profile} setProfile={setProfile} />
          </div>

          {/* Right: Preview & Control Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  プレビュー
                </h2>
                <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                  {(['simple', 'pop', 'cool'] as Template[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTemplate(t)}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        template === t
                          ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <ProfileCardPreview profile={profile} template={template} />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mt-8">
               <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                完成したら…
              </h2>
              <ActionButtons profileName={profile.name} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
