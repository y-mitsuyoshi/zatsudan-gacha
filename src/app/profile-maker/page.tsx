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
 { key: 'simple', label: 'シンプル', swatch: 'bg-[var(--paper-strong)] border-[var(--line-strong)]' },
 { key: 'pop', label: 'ポップ', swatch: 'bg-yellow-200 border-black' },
 { key: 'cool', label: 'クール', swatch: 'bg-gray-900 border-cyan-400' },
 { key: 'elegant', label: 'エレガント', swatch: 'bg-gradient-to-br from-purple-100 to-pink-100 border-purple-300' },
 { key: 'kawaii', label: 'かわいい', swatch: 'bg-pink-100 border-pink-300' },
 { key: 'vintage', label: 'ヴィンテージ', swatch: 'bg-amber-100 border-amber-300' },
 { key: 'neon', label: 'ネオン', swatch: 'bg-black border-green-400' },
 { key: 'dreamy', label: 'ドリーミー', swatch: 'bg-gradient-to-br from-blue-100 to-purple-100 border-purple-300' },
 { key: 'retro', label: 'レトロ', swatch: 'bg-orange-100 border-orange-400' },
 { key: 'minimal', label: 'ミニマル', swatch: 'bg-[var(--paper-strong)] border-[var(--line)]' },
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
  <div className="paper-page min-h-screen p-4 font-sans sm:p-8">
   <div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-col gap-4 rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-5   sm:flex-row sm:items-center sm:justify-between">
     <div>
      <p className="text-xs font-black tracking-[0.25em] text-[var(--accent)] ">OSHI KATSU CARD</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--ink)] md:text-4xl">
       推し活プロフィールメーカー
      </h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)] ">
       君の「好き」をカードにのせて、世界に届けよう。
      </p>
     </div>
     <ThemeToggleButton />
    </header>

    <main className="grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-8">
     <section className="lg:col-span-2">
      <div className="rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-5  sm:p-6">
       <div className="mb-5 flex items-start justify-between gap-3">
        <div>
         <h2 className="text-xl font-black text-[var(--ink)] ">プロフィールを入力</h2>
         <p className="mt-1 text-xs text-[var(--ink-soft)]">
          入力内容はこのブラウザに自動保存されます
         </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
         <button
          type="button"
          onClick={handleSample}
          className="rounded-sm border border-[var(--line-strong)] bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--accent)] transition hover:bg-[var(--paper-muted)]  "
         >
          サンプル
         </button>
         <button
          type="button"
          onClick={handleReset}
          className="rounded-sm border border-[var(--line)] bg-[var(--paper-strong)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--ink-soft)] transition hover:bg-[var(--paper-muted)]  "
         >
          リセット
         </button>
        </div>
       </div>

       {draftRestored && (
        <div className="mb-5 flex items-center justify-between gap-2 rounded-sm border border-[#b8cdc8] bg-[#edf5f2] px-3 py-2 text-xs font-bold text-[#2f5d57]  " role="status">
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
      <div className="rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-5  sm:p-6">
       <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
         <h2 className="text-xl font-black text-[var(--ink)] ">プレビュー</h2>
         <p className="mt-1 text-xs text-[var(--ink-soft)]">テンプレートを選んで雰囲気を変えられます</p>
        </div>
        <button
         type="button"
         onClick={() => setIsPreviewOpen(true)}
         className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-[var(--line)] bg-[var(--paper-strong)] px-3 py-2 text-xs font-bold text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]  "
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
          className={`flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[11px] font-bold transition ${
           template === key
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink-soft)] hover:border-[var(--accent)]'
          }`}
         >
          <span className={`h-3.5 w-3.5 rounded-full border ${swatch}`} aria-hidden="true" />
          {label}
         </button>
        ))}
       </div>

       <ProfileCardPreview profile={profile} template={template} />
      </div>

      <div className="mt-5 rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-5  sm:p-6">
       <h2 className="mb-1 text-xl font-black text-[var(--ink)] ">完成したら…</h2>
       <p className="mb-4 text-xs text-[var(--ink-soft)]">画像保存・テキストコピー・Xシェアができます</p>
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
      <div key={item.step} className="rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-4  ">
       <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{item.icon}</span>
        <span className="text-[10px] font-black tracking-widest text-[var(--accent)] ">{item.step}</span>
       </div>
       <h3 className="mt-2 text-sm font-black text-[var(--ink)] ">{item.title}</h3>
       <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">{item.text}</p>
      </div>
     ))}
    </section>
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

   {isPreviewOpen && (
    <div
     className="fixed inset-0 z-50 overflow-y-auto bg-[#12100d]/70 p-4"
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
         className="rounded-full bg-[var(--paper-strong)] px-4 py-2 text-sm font-black text-[var(--ink)] transition hover:bg-[var(--paper-muted)]  "
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
