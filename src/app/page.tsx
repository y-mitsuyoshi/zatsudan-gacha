import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeGacha } from '@/components/ThemeGacha';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { CategoryGrid } from '@/components/CategoryGrid';
import { ShareButtons } from '@/components/ShareButtons';
import {
  getCategoryForTheme,
  themeCategories,
  totalThemeCount,
} from '@/lib/themeCategories';
import { guides } from '@/lib/guideData';

export const metadata: Metadata = {
  title: '雑談テーマガチャ｜会議のアイスブレイクに使えるお題を無料で抽選',
  description: `会議のアイスブレイクやリモートワークの雑談に困ったら「雑談テーマガチャ」。${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題から、ボタンひとつで会話のきっかけをランダム提案。無料・登録不要で使えます。`,
  alternates: {
    canonical: '/',
  },
};

const APP_URL = 'https://zatsudan-gacha.app';

const useCases = [
  {
    emoji: '💻',
    title: 'オンライン会議の冒頭に',
    description: 'いきなり本題に入る前のアイスブレイクに。1問選ぶだけで、参加者の緊張がほぐれます。',
  },
  {
    emoji: '🤝',
    title: '1on1や面談のきっかけに',
    description: '仕事の話だけでは見えない、相手の人柄や価値観を知る入口になります。',
  },
  {
    emoji: '🏢',
    title: 'チームの交流・雑談タイムに',
    description: 'リモートワークで減りがちな何気ない会話を、手軽に増やせます。',
  },
  {
    emoji: '🎓',
    title: '研修・ワークショップに',
    description: 'グループワークのウォームアップや、ブレイクアウトルームの話題提供に。',
  },
  {
    emoji: '🍻',
    title: '飲み会・パーティーに',
    description: '初対面の人が多い場でも、会話が止まらないお題をランダムに選べます。',
  },
  {
    emoji: '🏠',
    title: '家族・友達との団らんに',
    description: '食事の席や休日の会話に。いつもと少し違う話題で盛り上がれます。',
  },
  {
    emoji: '🎤',
    title: 'スピーチ・朝礼の練習に',
    description: 'タイムアタックモードで、与えられたお題について話す練習ができます。',
  },
  {
    emoji: '🎲',
    title: '誰が話すか決めたいときに',
    description: 'ルーレットモードなら、項目と重みを設定して公平に順番を決められます。',
  },
];

const popularThemeNames = [
  '最近始めた新しい趣味は？',
  '今までで一番良かった旅行先は？',
  '最近観て面白かった映画は？',
  '最後の晩餐に何を食べたい？',
  '仕事のやりがいを感じる瞬間は？',
  'もし宝くじで1億円当たったら？',
  '最近よく聴いているアーティストは？',
  '学生時代の一番の思い出は？',
  '休日の朝は何時に起きる？',
  '大事にしている価値観は？',
  '好きな季節は？',
  'ペットとの忘れられない思い出は？',
];

const faqs = [
  {
    question: '雑談テーマガチャとは何ですか？',
    answer: `ボタンひとつで雑談のお題をランダムに表示する、無料のWebアプリです。${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題を収録しており、会議のアイスブレイク、リモートワークの雑談、1on1、チーム交流などに利用できます。`,
  },
  {
    question: '会議のアイスブレイクには、どのお題がおすすめですか？',
    answer: '「最近始めた新しい趣味は？」「休日の朝は何時に起きる？」「学生時代の一番の思い出は？」など、答えやすく会話が広がるお題がおすすめです。カテゴリを「趣味」「休日・ライフスタイル」「学校・学生時代」に絞ると選びやすくなります。',
  },
  {
    question: '無料で使えますか？',
    answer: 'はい。ログインや会員登録は不要で、すべてのカテゴリ・お題・モードを無料で利用できます。',
  },
  {
    question: 'オフラインでも使えますか？',
    answer: 'お題の抽選はページ内のデータで動作するため、一度ページを読み込めばオフラインでも利用できます。AI深掘り質問の生成のみ、インターネット接続が必要です。',
  },
  {
    question: 'AI深掘り機能とは何ですか？',
    answer: '選んだお題について、会話をさらに広げる質問をAIが3つ提案する機能です。「その話をもう少し聞きたい」というときに便利です。',
  },
  {
    question: 'カテゴリはどれくらいありますか？',
    answer: `現在${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題を収録しています。趣味、旅行、仕事、恋愛、食べ物、音楽、ゲーム・アニメなど、幅広い話題から選べます。`,
  },
  {
    question: 'タイムアタックやルーレットも使えますか？',
    answer: 'はい。制限時間内にお題について話す「タイムアタック」、項目と重みを設定して抽選する「ルーレット」も利用できます。',
  },
  {
    question: 'お気に入りや履歴は保存されますか？',
    answer: 'お気に入りと履歴は、お使いのブラウザのlocalStorageに保存されます。ログインは不要です。ブラウザのデータを削除すると保存内容も消去されます。',
  },
  {
    question: 'チームビルディングや研修で使えますか？',
    answer: 'はい。会議の冒頭、ブレイクアウトルーム、研修のウォームアップ、社内イベントなどで活用できます。同じお題が連続しにくい抽選ロジックも取り入れています。',
  },
  {
    question: '子どもや家族と一緒に使えますか？',
    answer: 'はい。家族・友達、動物・ペット、季節・イベントなど、幅広い年代で楽しめるカテゴリを用意しています。',
  },
];

const otherTools = [
  { title: '社畜人狼', description: '会社を舞台にした人狼ゲーム', href: '/shachiku-jinro', emoji: '🐺' },
  { title: '社畜すごろく', description: '定時退社を目指すすごろく', href: '/shachiku-sugoroku', emoji: '🏢' },
  { title: '異世界ステータス', description: '異世界での自分を診断', href: '/isekai-status', emoji: '⚔️' },
  { title: 'プロフィールメーカー', description: '推し活プロフィールカード', href: '/profile-maker', emoji: '💖' },
  { title: '社畜通勤サバイバー', description: '満員電車を突破する3Dゲーム', href: '/barricade-defense', emoji: '🚃' },
  { title: '社畜サバイバー', description: '18時まで生き残るサバイバル', href: '/shachiku-survivor', emoji: '🏃' },
  { title: '社畜スパイラル', description: '渦巻く業務からコアを守る', href: '/shachiku-spiral', emoji: '🌀' },
  { title: '言い訳ジェネレーター', description: 'AIが考える究極の言い逃れ', href: '/excuse-generator', emoji: '🙇‍♂️' },
  { title: '駅名標メーカー', description: 'オリジナル駅名標を作成', href: '/station-sign-maker', emoji: '🚉' },
];

function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function Home() {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '雑談テーマガチャ',
    alternateName: ['雑談ガチャ', 'お題ガチャ', '雑談お題ジェネレーター'],
    url: `${APP_URL}/`,
    description: `会議のアイスブレイクやリモートワークの雑談に使える、${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題をランダムに提案する無料Webアプリ。`,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    inLanguage: 'ja',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
    featureList: [
      '雑談お題のランダム抽選',
      `${themeCategories.length}カテゴリから選べるお題フィルター`,
      '履歴とお気に入りの保存',
      'タイムアタックモード',
      'ルーレットモード',
      'AIによる深掘り質問の提案',
      '会議・1on1・飲み会などシーン別ガイド',
    ],
    publisher: {
      '@type': 'Organization',
      name: '雑談テーマガチャ',
      url: APP_URL,
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const categoryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '雑談テーマガチャのカテゴリ一覧',
    numberOfItems: themeCategories.length,
    itemListElement: themeCategories.map((category, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `${category.name}の雑談お題`,
      url: `${APP_URL}/themes/${category.slug}`,
    })),
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(categoryJsonLd) }}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-100 via-white to-purple-100 dark:from-indigo-950/60 dark:via-slate-900 dark:to-purple-950/50 border-b border-white/60 dark:border-gray-800">
        <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-indigo-300/30 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-purple-300/30 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-10 sm:pt-8 sm:pb-14">
          <div className="flex justify-end">
            <ThemeToggleButton />
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <p className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-white/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800 rounded-full px-4 py-1.5 mb-5">
              <span>無料・登録不要</span>
              <span aria-hidden="true">｜</span>
              <span>{themeCategories.length}カテゴリ</span>
              <span aria-hidden="true">｜</span>
              <span>{totalThemeCount}以上のお題</span>
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              雑談テーマガチャ
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              「何を話そう？」を、ボタンひとつで解決。<br className="hidden sm:block" />
              会議のアイスブレイクも、リモートワークの雑談も、これひとつで会話がはずみます。
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
              {[
                { label: '会議のアイスブレイク', href: '/icebreak' },
                { label: '1on1', href: '/guides/one-on-one' },
                { label: 'リモートワーク', href: '/guides/remote-work' },
                { label: 'チーム交流', href: '/guides/team-building' },
                { label: '飲み会', href: '/guides/nomikai' },
                { label: '会話が続かない', href: '/guides/conversation' },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="rounded-full bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 px-3 py-1.5 font-semibold text-gray-600 dark:text-gray-300 transition hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-300">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="gacha" className="relative z-10 max-w-2xl mx-auto px-4 -mt-5 sm:-mt-7 scroll-mt-6">
        <ThemeGacha />
        <div className="mt-6 rounded-2xl bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 px-4 py-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            お題は随時追加中。気に入ったお題は☆で保存して、いつでも見返せます。
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 space-y-16 sm:space-y-20">
        <section aria-labelledby="scene-guides-heading">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">SCENE GUIDE</p>
              <h2 id="scene-guides-heading" className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                シーン別・雑談お題ガイド
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                会議、1on1、リモートワーク、飲み会など、目的に合わせた質問例をまとめました。
              </p>
            </div>
            <Link href="/guides" className="shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              ガイド一覧を見る →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500"
              >
                <span className="text-2xl" aria-hidden="true">{guide.emoji}</span>
                <h3 className="mt-1.5 text-sm font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {guide.h1}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
                  {guide.description}
                </p>
              </Link>
            ))}
            <Link
              href="/icebreak"
              className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500"
            >
              <span className="text-2xl" aria-hidden="true">🗣️</span>
              <h3 className="mt-1.5 text-sm font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                会議のアイスブレイクにおすすめの雑談お題30選
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
                会議の冒頭で使えるアイスブレイクのお題を30個厳選。初対面・チーム・1on1向けの質問例を紹介します。
              </p>
            </Link>
          </div>
        </section>

        <section aria-labelledby="about-heading" className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-start">
          <div>
            <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">ABOUT</p>
            <h2 id="about-heading" className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-4">
              雑談テーマガチャとは
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                「雑談テーマガチャ」は、会議やオンライン飲み会、1on1の冒頭で使える<strong>雑談のお題をランダムに表示する無料ツール</strong>です。ボタンを押すだけで、その場に合った会話のきっかけを提案します。
              </p>
              <p>
                収録しているのは、趣味・旅行・食べ物・仕事・恋愛・音楽・ゲームなど{themeCategories.length}カテゴリ、{totalThemeCount}以上のお題。カテゴリを絞れば、初対面の相手でも答えやすい話題を選べます。履歴とお気に入りはブラウザに保存されるので、定番のお題をすぐに呼び出せます。
              </p>
              <p>
                さらに、選んだお題についてAIが深掘り質問を3つ提案する機能や、制限時間内に話す「タイムアタック」、項目と重みを設定できる「ルーレット」も搭載。会議のアイスブレイクから研修のワークショップまで、幅広い場面で活用できます。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { emoji: '🎲', title: 'ワンタップ抽選', text: 'ボタンひとつでお題をランダム表示' },
              { emoji: '🗂️', title: `${themeCategories.length}カテゴリ`, text: '話題に合わせてフィルターできる' },
              { emoji: '⭐', title: '履歴・お気に入り', text: 'ブラウザに自動保存。登録不要' },
              { emoji: '✨', title: 'AI深掘り', text: '会話が広がる質問を3つ提案' },
            ].map((feature) => (
              <div key={feature.title} className="p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <span className="text-2xl" aria-hidden="true">{feature.emoji}</span>
                <h3 className="font-bold text-sm sm:text-base mt-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="categories" aria-labelledby="categories-heading" className="scroll-mt-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">CATEGORY</p>
              <h2 id="categories-heading" className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                {themeCategories.length}カテゴリから選べる雑談お題
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                気になるカテゴリを選ぶと、そのカテゴリのお題を一覧で見られます。
              </p>
            </div>
            <Link
              href="/themes"
              className="shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              カテゴリ一覧をすべて見る →
            </Link>
          </div>
          <CategoryGrid exampleCount={2} />
        </section>

        <section aria-labelledby="howto-heading">
          <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">HOW TO</p>
          <h2 id="howto-heading" className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-6">
            雑談テーマガチャの使い方
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'カテゴリを選ぶ', text: '「すべてのテーマ」でもOK。会議なら趣味や休日、初対面なら食べ物や旅行がおすすめです。' },
              { step: '02', title: 'ガチャを回す', text: 'ボタンを押すとお題がランダムに表示されます。連続で同じお題が出にくい仕組みです。' },
              { step: '03', title: '会話を広げる', text: 'お題をコピーして共有したり、AIに深掘り質問を考えてもらったりできます。' },
            ].map((item) => (
              <div key={item.step} className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <span className="text-sm font-black text-indigo-500 dark:text-indigo-400">{item.step}</span>
                <h3 className="text-lg font-bold mt-2 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="usecases-heading">
          <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">USE CASE</p>
          <h2 id="usecases-heading" className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3">
            会議・1on1・チーム交流など、こんな場面で
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            雑談のお題は、会話を始めるきっかけづくりに役立ちます。相手の答えに「それで？」と質問を重ねると、自然に会話が広がります。
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <span className="text-2xl" aria-hidden="true">{useCase.emoji}</span>
                <h3 className="font-bold text-sm sm:text-base mt-2 mb-1.5">{useCase.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Link
              href="/icebreak"
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              会議のアイスブレイクにおすすめのお題30選を見る
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section aria-labelledby="popular-heading">
          <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">PICK UP</p>
          <h2 id="popular-heading" className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3">
            人気の雑談お題ピックアップ
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            会議のアイスブレイクや飲み会でも使いやすい、定番のお題です。
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularThemeNames.map((theme) => {
              const category = getCategoryForTheme(theme);
              return (
                <Link
                  key={theme}
                  href={category ? `/themes/${category.slug}` : '/themes'}
                  className="group p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all"
                >
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {category ? `${category.emoji} ${category.name}` : 'お題'}
                  </span>
                  <p className="mt-1.5 text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {theme}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="ai-heading" className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 sm:p-10 overflow-hidden relative">
          <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-bold tracking-widest text-indigo-200 mb-2">AI DEEP DIVE</p>
            <h2 id="ai-heading" className="text-2xl sm:text-3xl font-black mb-3">
              AIに深掘り質問を考えてもらう
            </h2>
            <p className="text-sm sm:text-base text-indigo-100 leading-relaxed mb-5">
              お題に答えたあと「もう少し話を広げたい」と思ったら、AI深掘り機能を使ってみてください。選んだお題について、会話がはずむ質問を3つ提案します。会議のアイスブレイクや1on1で、会話が続かないときのサポートに便利です。
            </p>
            <a
              href="#gacha"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-5 py-3 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <span aria-hidden="true">✨</span>
              ガチャを回して試す
            </a>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-6">
          <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">FAQ</p>
          <h2 id="faq-heading" className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-6">
            よくある質問
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5 font-bold text-sm sm:text-base">
                  <span>{faq.question}</span>
                  <span className="shrink-0 text-indigo-500 dark:text-indigo-400 transition-transform group-open:rotate-45 text-xl" aria-hidden="true">＋</span>
                </summary>
                <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="other-tools-heading">
          <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">OTHER TOOLS</p>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="other-tools-heading" className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3">
                他のツールでも遊ぶ
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                雑談だけじゃない、コミュニケーションを楽しむための無料ツールを用意しています。
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1">
              <Link href="/tools" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                無料ツール一覧を見る →
              </Link>
              <Link href="/games" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                無料ゲーム一覧を見る →
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all"
              >
                <span className="text-2xl" aria-hidden="true">{tool.emoji}</span>
                <span>
                  <span className="block text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {tool.title}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tool.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <ShareButtons heading="雑談テーマガチャをシェアする" />
      </div>
    </main>
  );
}
