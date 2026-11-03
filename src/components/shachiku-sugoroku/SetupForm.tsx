"use client";

import React from 'react';
import { Job, SetupFormState } from '@/types/sugoroku';
import { ITEMS, JOBS, JOB_PROFILES } from '@/lib/sugoroku-logic';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';
import { audioManager } from '@/utils/audio';
import { HankoStamp, ItemIcon, JobIcon } from './SugorokuIcons';

interface SetupFormProps {
  formState: SetupFormState;
  setFormState: React.Dispatch<React.SetStateAction<SetupFormState>>;
  onSubmit: () => void;
}

const SAMPLE_NAMES = [
  '田中 太郎',
  '佐藤 健太',
  '鈴木 誠一',
  '高橋 葵',
  '渡辺 翔太',
  '伊藤 遥',
  '山本 徹',
  '中村 彩乃',
];

export const SetupForm: React.FC<SetupFormProps> = ({ formState, setFormState, onSubmit }) => {
  useBgm('shachiku-menu');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prevState) => ({
      ...prevState,
      [name]: value.slice(0, 20),
    }));
  };

  const selectJob = (job: Job) => {
    audioManager.playSe('click');
    setFormState((prevState) => ({ ...prevState, job }));
  };

  const fillRandomName = () => {
    audioManager.playSe('click');
    const nextName = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
    setFormState((prev) => ({ ...prev, name: nextName }));
  };

  const trimmedName = formState.name.trim();
  const isSubmitDisabled = trimmedName.length === 0;
  const selectedProfile = JOB_PROFILES[formState.job];
  const startItem = ITEMS[selectedProfile.startItem];

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#3b3022] bg-[#f4ece0] shadow-[0_10px_0_#261e14,0_18px_36px_rgba(0,0,0,0.28)] dark:border-[#6e5a3e] dark:bg-[#1b1712]">
      {/* 上部バー：人事部配属＆キャリア・クルーザー登録 */}
      <div className="border-b-2 border-[#3b3022] bg-[#12100d] px-5 py-4 text-[#fffaf0] sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] font-black tracking-[0.25em] text-[#f5ca5c]">
              SHACHIKU LIFE ROAD ENTRY / 社員証＆キャリア・クルーザー登録
            </p>
            <h2 className="font-editorial mt-1 text-2xl font-black sm:text-3xl">
              社員証の発行と配属部門の選択
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <AudioToggle variant="compact" />
            <HankoStamp text="人事" variant="red" className="bg-[#fffaf0] shadow-md" />
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isSubmitDisabled) {
            audioManager.playSe('stamp');
            setFormState((prev) => ({ ...prev, name: prev.name.trim() }));
            onSubmit();
          }
        }}
        className="space-y-6 p-5 sm:p-8"
      >
        {/* ステップ1：氏名入力 + 社員証＆専用車両プレビュー */}
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-4 dark:border-[#594b38] dark:bg-[#241f18]">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="name"
                className="text-xs font-black tracking-wide text-[#12100d] dark:text-[#fffaf0]"
              >
                STEP 1. 社員氏名を入力
              </label>
              <button
                type="button"
                onClick={fillRandomName}
                className="rounded-md border border-[#8a7d69] bg-[#f4ece0] px-2.5 py-1 text-[11px] font-black text-[#12100d] transition hover:bg-[#e4d5bc] dark:border-[#594b38] dark:bg-[#332b21] dark:text-[#fffaf0]"
              >
                候補名を自動入力
              </button>
            </div>
            <input
              type="text"
              id="name"
              name="name"
              value={formState.name}
              onChange={handleInputChange}
              placeholder="例: 山田 太郎"
              maxLength={20}
              autoComplete="nickname"
              className="w-full rounded-lg border-2 border-[#3b3022] bg-white px-4 py-3 text-lg font-black text-[#12100d] placeholder:text-[#9c8f7a] focus:border-[#1f6f5c] focus:outline-none dark:border-[#6e5a3e] dark:bg-[#14110d] dark:text-[#fffaf0]"
              required
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold text-[#6e6250] dark:text-[#b5a790]">
              <span>キャリア・クルーザーのナンバープレートと最終決算書に刻印されます</span>
              <span className="font-mono">{formState.name.length}/20</span>
            </div>
          </div>

          {/* 社員証＆専用クルーザープレビュー */}
          <div className="relative overflow-hidden rounded-xl border-2 border-[#3b3022] bg-gradient-to-br from-[#231f1a] to-[#12100d] p-4 text-[#fffaf0] shadow-md">
            <div className="flex items-start justify-between border-b border-white/15 pb-2.5">
              <div>
                <p className="font-mono text-[9px] font-black tracking-widest text-[#f5ca5c]">
                  CORPORATE ID & CRUISER LICENSE
                </p>
                <p className="mt-0.5 text-base font-black">
                  {trimmedName || '（氏名未入力）'}
                </p>
                <p className="text-xs font-bold text-white/75">
                  配属：{formState.job}（{selectedProfile.code}） / {selectedProfile.vehicleName}
                </p>
              </div>
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 text-white shadow-inner"
                style={{ backgroundColor: selectedProfile.accentColor }}
              >
                <JobIcon job={formState.job} size={22} />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white/10 px-2 py-1.5">
                <p className="text-[9px] font-bold text-white/70">初期評価</p>
                <p className="font-mono text-sm font-black text-[#f5ca5c]">
                  {selectedProfile.startCareer}pt
                </p>
              </div>
              <div className="rounded-lg bg-white/10 px-2 py-1.5">
                <p className="text-[9px] font-bold text-white/70">初期資金</p>
                <p className="font-mono text-sm font-black text-[#7adbc2]">
                  {selectedProfile.startMoney}万
                </p>
              </div>
              <div className="rounded-lg bg-white/10 px-2 py-1.5">
                <p className="text-[9px] font-bold text-white/70">初期支給品</p>
                <p className="truncate text-[11px] font-black text-white">
                  {startItem.name.replace('承認済・', '').replace('高麗人参', '').replace('極秘の', '')}
                </p>
              </div>
            </div>

            <p className="mt-2.5 text-[11px] font-bold leading-snug text-[#f5ca5c]">
              特性：{selectedProfile.strength}
            </p>
          </div>
        </div>

        {/* ステップ2：職業（配属部門）選択 */}
        <fieldset>
          <legend className="mb-2.5 block text-xs font-black tracking-wide text-[#12100d] dark:text-[#fffaf0]">
            STEP 2. 配属部門（全10職種）を選択 — 職種ごとに専用特効マス・初期資金・支給品が変化
          </legend>
          <div
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
            role="radiogroup"
            aria-label="職業を選ぶ"
          >
            {JOBS.map((job) => {
              const profile = JOB_PROFILES[job];
              const selected = formState.job === job;
              const item = ITEMS[profile.startItem];
              return (
                <button
                  key={job}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectJob(job)}
                  className={`group relative flex flex-col justify-between rounded-xl border-2 border-b-[4px] p-3.5 text-left transition-all ${
                    selected
                      ? 'border-[#12100d] bg-[#fffaf0] ring-2 ring-[#c9922e] shadow-md dark:border-[#f5ca5c] dark:bg-[#2a231a]'
                      : 'border-[#c9b99b] bg-[#faf4e8] hover:-translate-y-0.5 hover:border-[#8a7d69] dark:border-[#3b3226] dark:bg-[#221d17]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: profile.accentColor }}
                    >
                      <JobIcon job={job} size={22} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-black text-[#12100d] sm:text-base dark:text-[#fffaf0]">
                          {job}
                        </span>
                        <span className="font-mono text-[10px] font-black text-[#6e6250] dark:text-[#b5a790]">
                          {profile.code} / {profile.vehicleName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-bold text-[#5c5141] dark:text-[#cfc2ad]">
                        {profile.tagline}
                      </p>
                      <p className="mt-1 text-[11px] font-bold leading-snug text-[#1f6f5c] dark:text-[#7adbc2]">
                        {profile.strength}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 border-t border-[#e0d4be] pt-2 text-[10px] font-bold text-[#5c5141] dark:border-[#3b3226] dark:text-[#cfc2ad]">
                    <span className="inline-flex items-center gap-1">
                      <ItemIcon itemId={profile.startItem} size={12} />
                      <span>初期品: {item.name}</span>
                    </span>
                    <span className="font-mono">
                      評価+{profile.startCareer} / 資金{profile.startMoney}万円
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ゲームルール要約 */}
        <div className="grid gap-2.5 sm:grid-cols-3">
          {[
            {
              step: 'RULE 01',
              title: 'キャリア・ルーレット＆走行モード',
              text: '毎ターン「定時スピン(1〜6・気力回復)」か「全力残業Wスピン(2〜12・評価&残業代UP・気力消費)」を選択してルーレットを回そう！',
            },
            {
              step: 'RULE 02',
              title: '給料日ゲート通過で自動支給',
              text: '盤面4ヶ所の黄金「給料日ゲート」は、止まらなくても通過するだけで役職給与＋保有ライフ資産の配当が自動支給される！',
            },
            {
              step: 'RULE 03',
              title: 'ライフ資産を集めて億り人へ',
              text: '投資信託・都心マンション・副業SaaS・リゾート別荘などの資産カードを集め、ゴールで最終生涯総資産を競おう！',
            },
          ].map((rule) => (
            <div
              key={rule.step}
              className="rounded-xl border border-[#c9b99b] bg-[#fffaf0] p-3 dark:border-[#3b3226] dark:bg-[#221d17]"
            >
              <span className="font-mono text-[10px] font-black text-[#b23a2a] dark:text-[#f5ca5c]">
                {rule.step}
              </span>
              <p className="mt-0.5 text-xs font-black text-[#12100d] dark:text-[#fffaf0]">
                {rule.title}
              </p>
              <p className="mt-1 text-[11px] font-bold leading-relaxed text-[#5c5141] dark:text-[#cfc2ad]">
                {rule.text}
              </p>
            </div>
          ))}
        </div>

        {/* 出社打刻ボタン */}
        <div className="border-t-2 border-[#d4c4a8] pt-5 dark:border-[#3b3226]">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="flex min-h-[54px] w-full items-center justify-center gap-3 rounded-xl border-2 border-[#12100d] border-b-[6px] bg-[#b23a2a] px-6 py-4 text-lg font-black text-white shadow-md transition hover:bg-[#992f20] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span>キャリア・クルーザーに乗り込んで出発する（ゲーム開始）</span>
          </button>
          {isSubmitDisabled && (
            <p
              className="mt-2 text-center text-xs font-black text-[#b23a2a] dark:text-[#f59385]"
              role="status"
            >
              ※社員氏名を入力（または「候補名を自動入力」をクリック）すると開始できます
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
