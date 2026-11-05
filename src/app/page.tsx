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

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '雑談テーマガチャ｜会議のアイスブレイクに使えるお題を無料で抽選',
  description: `会議のアイスブレイクやリモートワークの雑談に困ったら「雑談テーマガチャ」。${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題から、ボタンひとつで会話のきっかけをランダム提案。無料・登録不要で使えます。`,
  keywords: [
    '雑談テーマガチャ',
    '雑談 お題',
    'アイスブレイク',
    '会議 雑談',
    '1on1 質問',
    'リモートワーク 雑談',
    'チームビルディング',
    '飲み会 話題',
    '会話のネタ',
    '無料 お題ガチャ',
  ],
  authors: [{ name: '雑談テーマガチャ運営チーム' }],
  creator: '雑談テーマガチャ',
  publisher: '雑談テーマガチャ',
  category: 'entertainment',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '雑談テーマガチャ｜会議のアイスブレイクに使えるお題を無料で抽選',
    description: `${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題から、会議・1on1・リモートワーク・飲み会に使える雑談ネタをランダム提案。登録不要・完全無料。`,
    url: `${APP_URL}/`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '雑談テーマガチャ - 会議のアイスブレイクお題アプリ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '雑談テーマガチャ｜会議のアイスブレイクに使えるお題を無料で抽選',
    description: `${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題から、会議・1on1・リモートワークの雑談ネタをランダム提案。`,
    images: [`${APP_URL}/ogp.png`],
  },
};

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

const partyGameLinks = [
  { title: '少数派ワード', href: '/minority-word', description: '少数派の言葉を見抜く会話ゲーム', mark: 'MINOR' },
  { title: '以心伝心ゲーム', href: '/ishin-denshin', description: '同じ答えを狙うチームビルディング', mark: 'SYNC' },
  { title: 'NGワード会議', href: '/ng-word', description: '禁句を言わず会議を乗り切る', mark: 'NG' },
  { title: '禁句トーク', href: '/kinku-talk', description: '禁句なしでお題を説明するチーム対戦', mark: 'KINKU' },
  { title: '社長の頭の中', href: '/rank-guess', description: '社長のランキングを予想するチームゲーム', mark: 'RANK' },
  { title: '連想リレー', href: '/word-chain', description: '言葉をつないで高得点を狙う連想ゲーム', mark: 'CHAIN' },
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
    '@id': `${APP_URL}/#webapp`,
    name: '雑談テーマガチャ',
    alternateName: ['雑談ガチャ', 'お題ガチャ', '雑談お題ジェネレーター'],
    url: `${APP_URL}/`,
    image: `${APP_URL}/ogp.png`,
    screenshot: `${APP_URL}/ogp.png`,
    description: `会議のアイスブレイクやリモートワークの雑談に使える、${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題をランダムに提案する無料Webアプリ。`,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    inLanguage: 'ja-JP',
    isAccessibleForFree: true,
    isPartOf: { '@id': `${APP_URL}/#website` },
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
    publisher: { '@id': `${APP_URL}/#organization` },
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
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: themeCategories.map((category, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `${category.name}の雑談お題`,
      url: `${APP_URL}/themes/${category.slug}`,
    })),
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '雑談テーマガチャの使い方',
    description: 'カテゴリを選び、ガチャを回して、表示されたお題で会話を始めるまでの3ステップ。',
    inLanguage: 'ja-JP',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'カテゴリを選ぶ', text: '会議、1on1、飲み会など、場面に合ったカテゴリを選びます。すべてのテーマからランダムに選ぶこともできます。' },
      { '@type': 'HowToStep', position: 2, name: 'ガチャを回す', text: 'ボタンを押すと、会話のきっかけになる雑談お題がランダムに表示されます。' },
      { '@type': 'HowToStep', position: 3, name: '会話を広げる', text: 'お題をコピーして共有したり、AI深掘り質問で会話をさらに広げたりできます。' },
    ],
  };

  const partyItemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'みんなで遊ぶパーティーゲーム',
    numberOfItems: partyGameLinks.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: partyGameLinks.map((game, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: game.title,
      url: `${APP_URL}${game.href}`,
    })),
  };

  return (
    <main className="paper-page min-h-screen text-[var(--ink)] transition-colors duration-300">
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(partyItemListJsonLd) }}
      />

      <header className="border-b border-[var(--line)] bg-[var(--paper-strong)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="font-editorial text-lg text-[var(--ink)]">雑談テーマガチャ</Link>
          <nav aria-label="メインナビゲーション" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-soft)]">
            <Link href="/games" className="hover:text-[var(--accent)]">ゲーム</Link>
            <Link href="/tools" className="hover:text-[var(--accent)]">ツール</Link>
            <Link href="/guides" className="hover:text-[var(--accent)]">ガイド</Link>
            <Link href="/themes" className="hover:text-[var(--accent)]">お題カテゴリ</Link>
            <Link href="/icebreak" className="hover:text-[var(--accent)]">アイスブレイク</Link>
          </nav>
          <ThemeToggleButton />
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--paper-muted)]">
        <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-10 sm:pt-8 sm:pb-14">
          <div className="max-w-3xl mx-auto text-center">
            <p className="paper-chip inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-1.5 mb-5 text-xs font-bold sm:text-sm">
              <span>無料・登録不要</span>
              <span aria-hidden="true">｜</span>
              <span>{themeCategories.length}カテゴリ</span>
              <span aria-hidden="true">｜</span>
              <span>{totalThemeCount}以上のお題</span>
            </p>
            <h1 className="font-editorial text-4xl leading-tight tracking-tight text-[var(--ink)] mb-4 sm:text-5xl md:text-6xl">
              雑談テーマガチャ
            </h1>
            <p className="text-base sm:text-lg text-[var(--ink-soft)] leading-relaxed mb-6">
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
                <Link key={item.label} href={item.href} className="paper-chip px-3 py-1.5 text-xs font-semibold">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="gacha" className="relative z-10 max-w-2xl mx-auto px-4 -mt-5 sm:-mt-7 scroll-mt-6">
        <ThemeGacha />
        <div className="mt-6 border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3 text-center">
          <p className="text-xs text-[var(--ink-soft)]">
            お題は随時追加中。気に入ったお題は☆で保存して、いつでも見返せます。
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 space-y-16 sm:space-y-20">
        <section aria-labelledby="scene-guides-heading">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="paper-kicker mb-2">SCENE GUIDE</p>
              <h2 id="scene-guides-heading" className="font-editorial text-2xl sm:text-3xl text-[var(--ink)]">
                シーン別・雑談お題ガイド
              </h2>
              <p className="text-sm text-[var(--ink-soft)] mt-2">
                会議、1on1、リモートワーク、飲み会など、目的に合わせた質問例をまとめました。
              </p>
            </div>
            <Link href="/guides" className="shrink-0 text-sm font-bold text-[var(--accent)] hover:underline">
              ガイド一覧を見る →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group border border-[var(--line)] bg-[var(--paper-strong)] p-4 transition-colors hover:border-[var(--accent)]"
              >
                <span className="font-label text-[9px] text-[var(--accent)]">Guide</span>
                <h3 className="mt-1.5 text-sm font-black text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                  {guide.h1}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)] line-clamp-2">
                  {guide.description}
                </p>
              </Link>
            ))}
            <Link
              href="/icebreak"
              className="group border border-[var(--line)] bg-[var(--paper-strong)] p-4 transition-colors hover:border-[var(--accent)]"
            >
              <span className="font-label text-[9px] text-[var(--accent)]">Guide</span>
              <h3 className="mt-1.5 text-sm font-black text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                会議のアイスブレイクにおすすめの雑談お題30選
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)] line-clamp-2">
                会議の冒頭で使えるアイスブレイクのお題を30個厳選。初対面・チーム・1on1向けの質問例を紹介します。
              </p>
            </Link>
          </div>
        </section>

        <section aria-labelledby="about-heading" className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-start">
          <div>
            <p className="paper-kicker mb-2">ABOUT</p>
            <h2 id="about-heading" className="font-editorial text-2xl sm:text-3xl text-[var(--ink)] mb-4">
              雑談テーマガチャとは
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-[var(--ink-soft)] leading-relaxed">
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
            ].map((feature, index) => (
              <div key={feature.title} className="border border-[var(--line)] bg-[var(--paper-strong)] p-4 sm:p-5">
                <span className="font-label text-[9px] text-[var(--accent)]">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-2 text-sm font-bold sm:text-base">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-[var(--ink-soft)] mt-1 leading-relaxed">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="categories" aria-labelledby="categories-heading" className="scroll-mt-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <p className="paper-kicker mb-2">CATEGORY</p>
              <h2 id="categories-heading" className="font-editorial text-2xl sm:text-3xl text-[var(--ink)]">
                {themeCategories.length}カテゴリから選べる雑談お題
              </h2>
              <p className="text-sm text-[var(--ink-soft)] mt-2">
                気になるカテゴリを選ぶと、そのカテゴリのお題を一覧で見られます。
              </p>
            </div>
            <Link
              href="/themes"
              className="shrink-0 text-sm font-bold text-[var(--accent)] hover:underline"
            >
              カテゴリ一覧をすべて見る →
            </Link>
          </div>
          <CategoryGrid exampleCount={2} />
        </section>

        <section aria-labelledby="howto-heading">
          <p className="paper-kicker mb-2">HOW TO</p>
          <h2 id="howto-heading" className="font-editorial text-2xl sm:text-3xl text-[var(--ink)] mb-6">
            雑談テーマガチャの使い方
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'カテゴリを選ぶ', text: '「すべてのテーマ」でもOK。会議なら趣味や休日、初対面なら食べ物や旅行がおすすめです。' },
              { step: '02', title: 'ガチャを回す', text: 'ボタンを押すとお題がランダムに表示されます。連続で同じお題が出にくい仕組みです。' },
              { step: '03', title: '会話を広げる', text: 'お題をコピーして共有したり、AIに深掘り質問を考えてもらったりできます。' },
            ].map((item) => (
              <div key={item.step} className="p-6 bg-[var(--paper-strong)] rounded-none border border-[var(--line)]">
                <span className="text-sm font-black text-[var(--accent)]">{item.step}</span>
                <h3 className="text-lg font-bold mt-2 mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="usecases-heading">
          <p className="paper-kicker mb-2">USE CASE</p>
          <h2 id="usecases-heading" className="font-editorial text-2xl sm:text-3xl text-[var(--ink)] mb-3">
            会議・1on1・チーム交流など、こんな場面で
          </h2>
          <p className="text-sm text-[var(--ink-soft)] mb-6">
            雑談のお題は、会話を始めるきっかけづくりに役立ちます。相手の答えに「それで？」と質問を重ねると、自然に会話が広がります。
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {useCases.map((useCase, index) => (
              <div key={useCase.title} className="border border-[var(--line)] bg-[var(--paper-strong)] p-5">
                <span className="font-label text-[9px] text-[var(--accent)]">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-2 text-sm font-bold sm:text-base">{useCase.title}</h3>
                <p className="text-xs sm:text-sm text-[var(--ink-soft)] leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Link
              href="/icebreak"
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)] hover:underline"
            >
              会議のアイスブレイクにおすすめのお題30選を見る
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section aria-labelledby="popular-heading">
          <p className="paper-kicker mb-2">PICK UP</p>
          <h2 id="popular-heading" className="font-editorial text-2xl sm:text-3xl text-[var(--ink)] mb-3">
            人気の雑談お題ピックアップ
          </h2>
          <p className="text-sm text-[var(--ink-soft)] mb-6">
            会議のアイスブレイクや飲み会でも使いやすい、定番のお題です。
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularThemeNames.map((theme) => {
              const category = getCategoryForTheme(theme);
              return (
                <Link
                  key={theme}
                  href={category ? `/themes/${category.slug}` : '/themes'}
                  className="group p-4 bg-[var(--paper-strong)] rounded-sm border border-[var(--line)] hover:border-[var(--accent)] hover:shadow-md transition-all"
                >
                  <span className="text-xs font-semibold text-[var(--accent)]">
                    {category ? category.name : 'お題'}
                  </span>
                  <p className="mt-1.5 text-sm font-bold text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                    {theme}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="ai-heading" className="relative overflow-hidden border border-[var(--line-strong)] bg-[var(--ink)] p-6 text-[var(--paper-strong)] sm:p-10">
          <div className="relative max-w-3xl">
            <p className="font-label text-[9px] opacity-70 mb-2">AI Deep Dive</p>
            <h2 id="ai-heading" className="font-editorial text-2xl mb-3 sm:text-3xl">
              AIに深掘り質問を考えてもらう
            </h2>
            <p className="max-w-2xl text-sm leading-7 opacity-80 sm:text-base">
              お題に答えたあと「もう少し話を広げたい」と思ったら、AI深掘り機能を使ってみてください。選んだお題について、会話がはずむ質問を3つ提案します。会議のアイスブレイクや1on1で、会話が続かないときのサポートに便利です。
            </p>
            <a
              href="#gacha"
              className="paper-button mt-5 px-5 py-3 text-sm"
            >
              ガチャを回して試す
            </a>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-6">
          <p className="paper-kicker mb-2">FAQ</p>
          <h2 id="faq-heading" className="font-editorial text-2xl sm:text-3xl text-[var(--ink)] mb-6">
            よくある質問
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group bg-[var(--paper-strong)] rounded-none border border-[var(--line)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5 font-bold text-sm sm:text-base">
                  <span>{faq.question}</span>
                  <span className="shrink-0 text-[var(--accent)] transition-transform group-open:rotate-45 text-xl" aria-hidden="true">＋</span>
                </summary>
                <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-[var(--ink-soft)] leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="party-games-heading">
          <p className="paper-kicker mb-2">PLAY TOGETHER</p>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="party-games-heading" className="font-editorial text-2xl sm:text-3xl text-[var(--ink)] mb-3">
                みんなで遊ぶパーティーゲーム
              </h2>
              <p className="text-sm text-[var(--ink-soft)]">
                会社のオンサイト・オフサイト、懇親会、研修のアイスブレイクに。1台の端末を回して遊べる会話ゲームです。
              </p>
            </div>
            <Link href="/games#party-games" className="shrink-0 text-sm font-bold text-[var(--accent)] hover:underline">
              パーティーゲーム一覧を見る →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {partyGameLinks.map((game) => (
              <Link
                key={game.href}
                href={game.href}
                className="group flex items-center gap-3 p-4 bg-[var(--paper-strong)] rounded-sm border border-[var(--line)] hover:border-[var(--accent)] hover:shadow-md transition-all"
              >
                <span className="font-label flex h-10 w-14 shrink-0 items-center justify-center border border-[var(--line)] bg-[var(--paper-muted)] text-[8px] font-bold tracking-tight text-[var(--accent)]">
                  {game.mark}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">{game.title}</span>
                  <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">{game.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="other-tools-heading">
          <p className="paper-kicker mb-2">OTHER TOOLS</p>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="other-tools-heading" className="font-editorial text-2xl sm:text-3xl text-[var(--ink)] mb-3">
                他のツールでも遊ぶ
              </h2>
              <p className="text-sm text-[var(--ink-soft)]">
                雑談だけじゃない、コミュニケーションを楽しむための無料ツールを用意しています。
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1">
              <Link href="/tools" className="text-sm font-bold text-[var(--accent)] hover:underline">
                無料ツール一覧を見る →
              </Link>
              <Link href="/games" className="text-sm font-bold text-[var(--accent)] hover:underline">
                無料ゲーム一覧を見る →
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex items-center gap-3 p-4 bg-[var(--paper-strong)] rounded-sm border border-[var(--line)] hover:border-[var(--accent)] hover:shadow-md transition-all"
              >
                <span className="font-label text-[9px] text-[var(--accent)]" aria-hidden="true">Tool</span>
                <span>
                  <span className="block text-sm font-bold text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                    {tool.title}
                  </span>
                  <span className="block text-xs text-[var(--ink-soft)] mt-0.5">{tool.description}</span>
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
