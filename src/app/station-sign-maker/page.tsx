"use client";

import { useState } from 'react';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { StationSignForm } from '@/components/station-sign-maker/StationSignForm';
import { StationSignPreview } from '@/components/station-sign-maker/StationSignPreview';
import { ActionButtons } from '@/components/station-sign-maker/ActionButtons';
import { StationSignState, StationTemplate } from '@/types';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { TOOL_SEO_DATA, buildToolJsonLd } from '@/lib/toolSeoData';

const tool = TOOL_SEO_DATA.station;

const TEMPLATE_CARDS: { key: StationTemplate; label: string; description: string; preview: React.ReactNode }[] = [
 {
  key: 'classic',
  label: '定番ボード',
  description: '横長の駅名看板',
  preview: <span className="block h-2 w-full rounded-full bg-[var(--accent)]" />,
 },
 {
  key: 'circle',
  label: 'サークルライン',
  description: '丸い路線記号つき',
  preview: <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-[9px] font-black text-white">SK</span>,
 },
 {
  key: 'minimal',
  label: 'ミニマル',
  description: '黒背景のシンプル看板',
  preview: <span className="block h-7 w-full rounded-md bg-stone-900" />,
 },
];

export default function StationSignMakerPage() {
 const [stationState, setStationState] = useState<StationSignState>({
  station: '駅名看板',
  prevStation: '前の駅',
  nextStation: '次の駅',
  lineColor: '#009b40',
  roman: 'EKIMEIKANBAN',
  lineSymbol: 'SK',
  stationNumber: '01',
 });

 const [template, setTemplate] = useState<StationTemplate>('classic');

 return (
  <div className="paper-page min-h-screen p-4 font-sans sm:p-8">
   <div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-col gap-4 rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-5   sm:flex-row sm:items-center sm:justify-between">
     <div>
      <p className="text-xs font-black tracking-[0.25em] text-[var(--accent)] ">STATION SIGN STUDIO</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--ink)] md:text-4xl">
       自分だけの駅名看板メーカー
      </h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)] ">
       駅名・路線記号・カラーを自由に組み合わせて、オリジナルの駅名標を作ろう。
      </p>
     </div>
     <ThemeToggleButton />
    </header>

    <main className="grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-8">
     <section className="h-fit lg:col-span-2">
      <div className="rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-5  sm:p-6">
       <div className="mb-5">
        <h2 className="text-xl font-black text-[var(--ink)] ">看板の情報を入力</h2>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
         ローマ字は駅名から自動入力。あとから編集できます。
        </p>
       </div>
       <StationSignForm stationState={stationState} setStationState={setStationState} />
      </div>
     </section>

     <section className="lg:col-span-3">
      <div className="rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-5  sm:p-6">
       <div className="mb-5">
        <h2 className="text-xl font-black text-[var(--ink)] ">プレビュー</h2>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">テンプレートを選んで看板の雰囲気を変えられます</p>
       </div>

       <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="駅名標テンプレート">
        {TEMPLATE_CARDS.map((card) => (
         <button
          key={card.key}
          type="button"
          aria-pressed={template === card.key}
          onClick={() => setTemplate(card.key)}
          className={`rounded-sm border-2 p-3 text-left transition-all ${
           template === card.key
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--line)] bg-[var(--paper-strong)] hover:border-[var(--accent)]'
          }`}
         >
          <div className="mb-2 flex h-8 items-center justify-center rounded-md bg-[var(--paper-muted)] px-2 ">
           {card.preview}
          </div>
          <p className={`text-xs font-black ${template === card.key ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>
           {card.label}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--ink-soft)]">{card.description}</p>
         </button>
        ))}
       </div>

       <div className="rounded-none border border-[var(--line)] bg-[var(--paper-muted)] p-3  sm:p-5">
        <StationSignPreview stationState={stationState} template={template} />
       </div>
       <p className="mt-3 text-center text-[10px] font-medium text-[var(--ink-soft)]">
        プレビューは画像として保存できます。入力内容はサーバーに送信されません。
       </p>
      </div>

      <div className="mt-5 rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-5  sm:p-6">
       <h2 className="mb-1 text-xl font-black text-[var(--ink)] ">完成したら…</h2>
       <p className="mb-4 text-xs text-[var(--ink-soft)]">PNG画像として保存して、SNSでシェアできます</p>
       <ActionButtons stationName={stationState.station} />
      </div>
     </section>
    </main>
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
  </div>
 );
}
