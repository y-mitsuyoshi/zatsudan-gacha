"use client";

import React from 'react';
import { SetupFormState, Job } from '@/types/sugoroku';
import { JOBS, JOB_PROFILES } from '@/lib/sugoroku-logic';

interface SetupFormProps {
  formState: SetupFormState;
  setFormState: React.Dispatch<React.SetStateAction<SetupFormState>>;
  onSubmit: () => void;
}

export const SetupForm: React.FC<SetupFormProps> = ({ formState, setFormState, onSubmit }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({
      ...prevState,
      [name]: value.slice(0, 20),
    }));
  };

  const selectJob = (job: Job) => {
    setFormState(prevState => ({ ...prevState, job }));
  };

  const trimmedName = formState.name.trim();
  const isSubmitDisabled = trimmedName.length === 0;
  const selectedProfile = JOB_PROFILES[formState.job];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border-4 border-[#e7d8b5] bg-[#fffaf0] p-5 shadow-[0_18px_40px_rgba(83,63,31,0.16)] dark:border-[#4b3d2b] dark:bg-[#211f1a] sm:p-8">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-500/10" aria-hidden="true" />
      <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" aria-hidden="true" />

      <div className="relative">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-amber-700 dark:text-amber-300">CHARACTER SETUP</p>
            <h2 className="mt-1 text-2xl font-black text-[#3b2f1e] dark:text-amber-50 sm:text-3xl">
              キャリアの主人公をつくる
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#7a684e] dark:text-stone-300">
              名前と職業を選んで、あなただけの社畜ライフを盤上に描こう。
            </p>
          </div>
          <span className="text-4xl" aria-hidden="true">🎲</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isSubmitDisabled) {
              setFormState(prev => ({ ...prev, name: prev.name.trim() }));
              onSubmit();
            }
          }}
          className="space-y-7"
        >
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-black text-[#5f4b2f] dark:text-amber-100">
              プレイヤー名
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formState.name}
              onChange={handleInputChange}
              placeholder="例: 山田 太郎"
              maxLength={20}
              autoComplete="nickname"
              className="w-full rounded-xl border-2 border-[#dcc9a4] bg-white px-4 py-3 text-lg font-bold text-[#3b2f1e] shadow-inner outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-200/60 dark:border-[#5c4a32] dark:bg-[#2c2820] dark:text-amber-50 dark:focus:ring-amber-500/20"
              required
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-[#9a8464] dark:text-stone-400">ゲーム内で表示されます</span>
              <span className="font-bold text-[#9a8464] dark:text-stone-400">{formState.name.length}/20</span>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-black text-[#5f4b2f] dark:text-amber-100">
              職業を選ぶ
            </legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="職業を選ぶ">
              {JOBS.map((job) => {
                const profile = JOB_PROFILES[job];
                const selected = formState.job === job;
                return (
                  <button
                    key={job}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectJob(job)}
                    className={`group relative overflow-hidden rounded-xl border-2 p-3 text-left transition-all ${
                      selected
                        ? 'border-amber-500 bg-amber-50 shadow-[0_5px_0_0_#d97706] dark:border-amber-400 dark:bg-amber-900/30'
                        : 'border-[#e2d4b8] bg-white/80 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-[#4c3f2c] dark:bg-[#2b2720]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${profile.accent} text-xl shadow-sm`}>
                        {profile.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-[#3b2f1e] dark:text-amber-50">{job}</span>
                        <span className="mt-0.5 block text-xs text-[#8a7557] dark:text-stone-300">{profile.tagline}</span>
                        <span className="mt-1 block text-[11px] font-medium text-[#a58c66] dark:text-stone-400">{profile.strength}</span>
                      </span>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black ${
                        selected
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-[#cdbb9b] text-transparent dark:border-[#6b5a40]'
                      }`} aria-hidden="true">
                        ✓
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="rounded-xl border border-dashed border-[#d8c6a2] bg-[#f8efd9]/70 p-4 dark:border-[#5c4a32] dark:bg-[#2a251c]">
            <p className="text-xs font-black tracking-widest text-amber-700 dark:text-amber-300">SELECTED</p>
            <p className="mt-1 text-sm font-black text-[#3b2f1e] dark:text-amber-50">
              {selectedProfile.icon} {formState.job}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#7a684e] dark:text-stone-300">
              初期やる気100・評価0でスタート。途中の選択イベントで、評価とやる気のバランスを考えよう。
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-black text-[#5f4b2f] dark:text-amber-100">ゲームの流れ</p>
            <ol className="grid gap-2 sm:grid-cols-3">
              {[
                { step: '01', title: 'サイコロを振る', text: 'マスを進んでイベントを体験' },
                { step: '02', title: '選択する', text: '評価とやる気のバランスを選ぶ' },
                { step: '03', title: 'ゴールを目指す', text: '60マス先のボーナス支給日へ' },
              ].map((item) => (
                <li key={item.step} className="rounded-lg bg-white/70 p-2.5 dark:bg-[#2b2720]">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-300">{item.step}</span>
                  <p className="text-xs font-black text-[#3b2f1e] dark:text-amber-50">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#8a7557] dark:text-stone-400">{item.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="border-t-2 border-dashed border-[#e2d4b8] pt-5 dark:border-[#4c3f2c]">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="group flex w-full items-center justify-center gap-2 rounded-xl border-b-4 border-amber-800 bg-gradient-to-b from-amber-500 to-amber-600 px-6 py-4 text-xl font-black text-white shadow-lg transition-all hover:from-amber-400 hover:to-amber-500 active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:border-stone-500 disabled:from-stone-400 disabled:to-stone-500 disabled:opacity-70"
            >
              <span className="text-2xl" aria-hidden="true">🎲</span>
              すごろくを開始する
            </button>
            {isSubmitDisabled && (
              <p className="mt-2 text-center text-xs font-bold text-amber-700 dark:text-amber-300" role="status">
                プレイヤー名を入力すると開始できます
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
