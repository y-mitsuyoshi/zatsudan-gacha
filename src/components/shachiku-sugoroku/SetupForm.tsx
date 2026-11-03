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
    <div className="paper-panel p-5 sm:p-8">
      <div className="relative">
        <div className="mb-6">
          <p className="paper-kicker">Character Setup</p>
          <h2 className="font-editorial mt-2 text-2xl text-[var(--ink)] sm:text-3xl">
            キャリアの主人公をつくる
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            名前と職業を選んで、あなただけの社畜ライフを盤上に描こう。
          </p>
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
            <label htmlFor="name" className="mb-2 block text-xs font-black text-[var(--ink-soft)]">
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
              className="field-paper px-4 py-3 text-lg font-bold"
              required
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-[var(--ink-soft)]">ゲーム内で表示されます</span>
              <span className="font-label text-[10px] text-[var(--ink-soft)]">{formState.name.length}/20</span>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 block text-xs font-black text-[var(--ink-soft)]">
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
                    className={`group relative border p-3 text-left transition-all ${
                      selected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[2px_2px_0_var(--ink)]'
                        : 'border-[var(--line)] bg-[var(--paper-strong)] hover:border-[var(--line-strong)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`font-editorial flex h-10 w-10 shrink-0 items-center justify-center border text-base ${selected ? 'border-[var(--accent)] bg-[var(--paper-strong)] text-[var(--accent)]' : 'border-[var(--line)] bg-[var(--paper-muted)] text-[var(--ink-soft)]'}`}>
                        {job.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-[var(--ink)]">{job}</span>
                        <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">{profile.tagline}</span>
                        <span className="mt-1 block text-[11px] text-[var(--ink-soft)]">{profile.strength}</span>
                      </span>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] font-black ${
                        selected
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                          : 'border-[var(--line-strong)] text-transparent'
                      }`} aria-hidden="true">
                        ✓
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="border border-dashed border-[var(--line-strong)] bg-[var(--paper-muted)] p-4">
            <p className="paper-kicker">Selected</p>
            <p className="mt-1 text-sm font-black text-[var(--ink)]">{formState.job}</p>
            <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
              初期やる気100・評価0でスタート。途中の選択イベントで、評価とやる気のバランスを考えよう。
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-black text-[var(--ink-soft)]">ゲームの流れ</p>
            <ol className="grid gap-2 sm:grid-cols-3">
              {[
                { step: '01', title: 'サイコロを振る', text: 'マスを進んでイベントを体験' },
                { step: '02', title: '選択する', text: '評価とやる気のバランスを選ぶ' },
                { step: '03', title: 'ゴールを目指す', text: '60マス先のボーナス支給日へ' },
              ].map((item) => (
                <li key={item.step} className="border border-[var(--line)] bg-[var(--paper-strong)] p-2.5">
                  <span className="font-label text-[9px] text-[var(--accent)]">{item.step}</span>
                  <p className="text-xs font-black text-[var(--ink)]">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[var(--ink-soft)]">{item.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="border-t border-[var(--line)] pt-5">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="paper-button-primary w-full px-6 py-4 text-lg"
            >
              すごろくを開始する
            </button>
            {isSubmitDisabled && (
              <p className="mt-2 text-center text-xs font-bold text-[var(--accent)]" role="status">
                プレイヤー名を入力すると開始できます
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
