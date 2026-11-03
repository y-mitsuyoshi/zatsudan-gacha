"use client";

import { useEffect, useMemo, useState } from 'react';
import { ProfileForm } from '@/components/profile-maker/ProfileForm';
import { ProfileCardPreview } from '@/components/profile-maker/ProfileCardPreview';
import { ActionButtons } from '@/components/profile-maker/ActionButtons';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { ProfileState, Template } from '@/types';
import {
  DEFAULT_PROFILE,
  SAMPLE_PROFILE,
  clearProfileDraft,
  loadProfileDraft,
  saveProfileDraft,
} from '@/lib/profile-draft';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { TOOL_SEO_DATA, buildToolJsonLd } from '@/lib/toolSeoData';

const tool = TOOL_SEO_DATA.profile;

const TEMPLATES: { key: Template; label: string; swatch: string }[] = [
  { key: 'simple', label: 'シンプル', swatch: 'bg-white border-gray-300' },
  { key: 'pop', label: 'ポップ', swatch: 'bg-yellow-200 border-black' },
  { key: 'cool', label: 'クール', swatch: 'bg-gray-900 border-cyan-400' },
  { key: 'elegant', label: 'エレガント', swatch: 'bg-gradient-to-br from-purple-100 to-pink-100 border-purple-300' },
  { key: 'kawaii', label: 'かわいい', swatch: 'bg-pink-100 border-pink-300' },
  { key: 'vintage', label: 'ヴィンテージ', swatch: 'bg-amber-100 border-amber-300' },
  { key: 'neon', label: 'ネオン', swatch: 'bg-black border-green-400' },
  { key: 'dreamy', label: 'ドリーミー', swatch: 'bg-gradient-to-br from-blue-100 to-purple-100 border-purple-300' },
  { key: 'retro', label: 'レトロ', swatch: 'bg-orange-100 border-orange-400' },
  { key: 'minimal', label: 'ミニマル', swatch: 'bg-white border-gray-200' },
];

export default function ProfileMakerPage() {
  const [profile, setProfile] = useState<ProfileState>(DEFAULT_PROFILE);
  const [template, setTemplate] = useState<Template>('simple');
  const [draftRestored, setDraftRestored] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const draft = loadProfileDraft();
    if (draft) {
      setProfile(draft.profile);
      setTemplate(draft.template);
      setDraftRestored(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => saveProfileDraft(profile, template), 350);
    return () => window.clearTimeout(timer);
  }, [profile, template]);

  useEffect(() => {
    if (!isPreviewOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPreviewOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isPreviewOpen]);

  const profileText = useMemo(() => {
    const name = profile.name.trim() || '推し';
    return [
      `【${name}】`,
      profile.group ? `所属: ${profile.group}` : '',
      '',
      `好きなところ: ${profile.likes.join(' / ') || '未入力'}`,
      `出会い: ${profile.episode || '未入力'}`,
      `好きなビジュアル: ${profile.favoriteVisual || '未入力'}`,
      `好きな言葉: ${profile.favoriteQuote || '未入力'}`,
      `ファン歴: ${profile.fanHistory || '未入力'}`,
      `称号: ${profile.title || '未入力'}`,
      profile.customTags.length > 0 ? profile.customTags.join(' ') : '',
    ].filter(Boolean).join('\n');
  }, [profile]);

  const handleSample = () => {
    setProfile(SAMPLE_PROFILE);
    setDraftRestored(false);
  };

  const handleReset = () => {
    clearProfileDraft();
    setProfile(DEFAULT_PROFILE);
    setTemplate('simple');
    setDraftRestored(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans transition-colors duration-300 dark:bg-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/80 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-fuchsia-600 dark:text-fuchsia-400">OSHI KATSU CARD</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900 dark:text-gray-100 md:text-4xl">
              推し活プロフィールメーカー
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
              君の「好き」をカードにのせて、世界に届けよう。
            </p>
          </div>
          <ThemeToggleButton />
        </header>

        <main className="grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-8">
          <section className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">プロフィールを入力</h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    入力内容はこのブラウザに自動保存されます
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={handleSample}
                    className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1.5 text-[11px] font-bold text-fuchsia-700 transition hover:bg-fuchsia-100 dark:border-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-200"
                  >
                    サンプル
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-500 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    リセット
                  </button>
                </div>
              </div>

              {draftRestored && (
                <div className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" role="status">
                  <span>前回の下書きを復元しました</span>
                  <button type="button" onClick={() => setDraftRestored(false)} className="underline underline-offset-2">
                    閉じる
                  </button>
                </div>
              )}

              <ProfileForm profile={profile} setProfile={setProfile} />
            </div>
          </section>

          <section className="lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">プレビュー</h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">テンプレートを選んで雰囲気を変えられます</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:border-fuchsia-300 hover:text-fuchsia-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-fuchsia-500"
                >
                  <span aria-hidden="true">⛶</span> 拡大表示
                </button>
              </div>

              <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="プロフィールカードのテンプレート">
                {TEMPLATES.map(({ key, label, swatch }) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={template === key}
                    onClick={() => setTemplate(key)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                      template === key
                        ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 shadow-sm dark:border-fuchsia-400 dark:bg-fuchsia-900/30 dark:text-fuchsia-200'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-fuchsia-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full border ${swatch}`} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>

              <ProfileCardPreview profile={profile} template={template} />
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-6">
              <h2 className="mb-1 text-xl font-black text-gray-900 dark:text-gray-100">完成したら…</h2>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">画像保存・テキストコピー・Xシェアができます</p>
              <ActionButtons profileName={profile.name} profileText={profileText} />
            </div>
          </section>
        </main>

        <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-labelledby="profile-howto-heading">
          <h2 id="profile-howto-heading" className="sr-only">推し活プロフィールメーカーの使い方</h2>
          {[
            { step: '01', icon: '✍️', title: '推しの情報を入力', text: '名前・好きなところ・出会いのきっかけなどを自由に入力。入力内容はこのブラウザに自動保存されます。' },
            { step: '02', icon: '🎨', title: 'テンプレートを選ぶ', text: '10種類のデザインから、推しの雰囲気に合うカードを選べます。拡大表示で細部まで確認できます。' },
            { step: '03', icon: '📸', title: '保存してシェア', text: 'PNG画像として保存したり、テキストをコピーしたり、Xでシェアできます。' },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">{item.icon}</span>
                <span className="text-[10px] font-black tracking-widest text-fuchsia-600 dark:text-fuchsia-400">{item.step}</span>
              </div>
              <h3 className="mt-2 text-sm font-black text-gray-900 dark:text-gray-100">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{item.text}</p>
            </div>
          ))}
        </section>
      </div>

      <SeoContentSection
        variant="light"
        eyebrow="TOOL GUIDE"
        title={`${tool.name}の使い方とFAQ`}
        intro={tool.description}
        faqs={tool.faqs}
        related={tool.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ツール一覧', href: '/tools' },
          { label: tool.name },
        ]}
        jsonLd={buildToolJsonLd(tool)}
      />

      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="プロフィールカードの拡大プレビュー"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setIsPreviewOpen(false)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-lg transition hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  閉じる ✕
                </button>
              </div>
              <ProfileCardPreview profile={profile} template={template} cardId="profile-card-modal" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
