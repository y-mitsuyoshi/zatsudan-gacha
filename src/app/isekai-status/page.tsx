"use client";

import { useEffect, useRef, useState } from 'react';
import { IsekaiStatusForm } from '@/components/isekai-status/IsekaiStatusForm';
import { IsekaiStatusCard } from '@/components/isekai-status/IsekaiStatusCard';
import { ActionButtons } from '@/components/isekai-status/ActionButtons';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { IsekaiFormState, IsekaiStatus } from '@/types';
import { generateIsekaiStatus } from '@/lib/isekai-logic';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { TOOL_SEO_DATA, buildToolJsonLd } from '@/lib/toolSeoData';

const tool = TOOL_SEO_DATA.isekai;

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
 const resultRef = useRef<HTMLDivElement>(null);

 const handleGenerateStatus = () => {
  if (formState.name && formState.birthDate && formState.q1 && formState.q2 && formState.q3 && formState.q4 && formState.q5) {
   const newStatus = generateIsekaiStatus(formState);
   setStatus(newStatus);
  }
 };

 const handleRandomizeAnswers = () => {
  const answers = ['A', 'B', 'C'] as const;
  const pick = () => answers[Math.floor(Math.random() * answers.length)];
  setStatus(null);
  setFormState(prev => ({ ...prev, q1: pick(), q2: pick(), q3: pick(), q4: pick(), q5: pick() }));
 };

 useEffect(() => {
  if (status) {
   resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
 }, [status]);

 const statusText = status ? [
  `【${status.name}】${status.epithet}（${status.rarity}）`,
  `職業: ${status.job} / Lv.${status.level} / 総合力 ${status.totalStats}`,
  `ちから ${status.params.strength} / まりょく ${status.params.magic} / すばやさ ${status.params.agility} / きようさ ${status.params.dexterity} / うんのよさ ${status.params.luck}`,
  `固有スキル: ${status.uniqueSkill}`,
  `パーティスキル: ${status.partySkill}`,
  `装備: ${status.equipment.join('、')}`,
  '#異世界転生ステータスカード',
 ].join('\n') : undefined;

 return (
  <>
   <div className="paper-page min-h-screen p-4 pb-0 font-sans sm:p-8">
    <div className="max-w-7xl mx-auto">
     <header className="mb-8 flex flex-col gap-4 rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
       <h1 className="text-3xl md:text-4xl font-bold text-[var(--ink)]">
        異世界転生ステータスカード
       </h1>
       <p className="text-[var(--ink-soft)] mt-2">
        キミの本当の姿、知りたくない？
       </p>
      </div>
      <ThemeToggleButton />
     </header>

     <section className="mb-8">
      <div className="bg-[var(--paper-muted)] p-6 rounded-none border border-[var(--line)]">
       <h2 className="text-xl font-bold text-[var(--accent)] mb-3">
        異世界転生ステータスカードとは？
       </h2>
       <p className="text-[var(--ink)] leading-relaxed">
        あなたが異世界に転生したらどんなキャラクターになるか診断できるエンターテイメントツールです。
        5つの簡単な質問に答えるだけで、<strong>職業、能力値、固有スキル、装備</strong>などが決まり、
        あなただけのオリジナルステータスカードが完成します。
        作成したカードは画像としてダウンロードでき、SNSでの共有も簡単です。
       </p>
      </div>
     </section>

     <main className="grid grid-cols-1 lg:grid-cols-5 gap-8" role="main">
     {/* Left: Form Area */}
     <div className="h-fit rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-6">
      <h2 className="text-2xl font-bold mb-6 text-[var(--ink)] ">
       あなたの情報を入力
      </h2>
      <IsekaiStatusForm formState={formState} setFormState={setFormState} onRandomize={handleRandomizeAnswers} />

      <div className="mt-8 pt-6 border-t border-[var(--line)] ">
       <button
        onClick={handleGenerateStatus}
        disabled={!formState.name || !formState.birthDate || !formState.q1 || !formState.q2 || !formState.q3 || !formState.q4 || !formState.q5}
        className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold py-4 px-6 rounded-sm text-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
       >
        ステータスカードを生成
       </button>
      </div>
     </div>

     {/* Right: Preview & Control Area */}
     <div className="lg:col-span-3" ref={resultRef}>
      {status ? (
       <>
        <div className="rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-6" aria-live="polite">
         <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
           <h2 className="text-2xl font-bold text-[var(--ink)] ">
            あなたのステータス
           </h2>
           <p className="mt-1 text-xs font-bold text-[var(--accent)] ">
            レアリティ {status.rarity} / 総合力 {status.totalStats}
           </p>
          </div>
          <button
           type="button"
           onClick={() => setStatus(null)}
           className="rounded-sm border border-[var(--line-strong)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--paper-muted)]"
          >
           回答を変えて再診断
          </button>
         </div>
         <IsekaiStatusCard status={status} />
        </div>

        <div className="mt-8 rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-6">
         <h2 className="text-2xl font-bold mb-6 text-[var(--ink)] ">
          完成したら…
         </h2>
         <ActionButtons
          profileName={formState.name}
          shareText={statusText}
          copyText={statusText}
         />
        </div>
       </>
      ) : (
       <div className="rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-6">
        <h2 className="text-2xl font-bold mb-6 text-[var(--ink)] ">
         あなたのステータス
        </h2>
        <div className="flex items-center justify-center h-64 text-[var(--ink-soft)]">
         <div className="text-center">
          <p className="text-lg">左のフォームを入力して<br/>「ステータスカードを生成」ボタンを押してください</p>
         </div>
        </div>
       </div>
      )}
     </div>
     </main>

     <section className="mt-16 rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-8">
      <h2 className="text-2xl font-bold text-[var(--ink)] mb-6">
       使い方
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       <div className="text-center">
        <div className="font-editorial mb-3 text-4xl text-[var(--accent)]">01</div>
        <h3 className="font-bold text-lg mb-2 text-[var(--ink)] ">
         情報入力
        </h3>
        <p className="text-[var(--ink-soft)] ">
         あなたの名前、生年月日、性別を入力し、5つの質問に答えてください。
        </p>
       </div>
       <div className="text-center">
        <div className="font-editorial mb-3 text-4xl text-[var(--accent)]">02</div>
        <h3 className="font-bold text-lg mb-2 text-[var(--ink)] ">
         カード生成
        </h3>
        <p className="text-[var(--ink-soft)] ">
         「ステータスカードを生成」ボタンを押すと、あなただけのカードが完成します。
        </p>
       </div>
       <div className="text-center">
        <div className="font-editorial mb-3 text-4xl text-[var(--accent)]">03</div>
        <h3 className="font-bold text-lg mb-2 text-[var(--ink)] ">
         シェア
        </h3>
        <p className="text-[var(--ink-soft)] ">
         完成したカードを画像でダウンロードして、SNSでシェアしよう！
        </p>
       </div>
      </div>
     </section>

     <section className="mt-8 bg-[var(--paper-muted)]  p-6 rounded-none border border-[var(--line)] ">
      <h2 className="text-xl font-bold text-[var(--accent)] mb-3">
       こんな人におすすめ
      </h2>
      <ul className="list-disc list-inside text-[var(--ink-soft)] space-y-2">
       <li>ファンタジーやRPGが好きな方</li>
       <li>自分の異世界での姿を想像してみたい方</li>
       <li>面白い診断結果をSNSでシェアしたい方</li>
       <li>キャラクター設定やストーリー作りの参考にしたい方</li>
       <li>友達と一緒に楽しめるエンターテイメントを探している方</li>
      </ul>
     </section>
    </div>
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
  </>
 );
}
