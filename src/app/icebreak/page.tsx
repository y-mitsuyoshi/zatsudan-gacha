import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeGacha } from '@/components/ThemeGacha';
import { ThemeList } from '@/components/ThemeList';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { ShareButtons } from '@/components/ShareButtons';
import { themeCategories, totalThemeCount } from '@/lib/themeCategories';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '会議のアイスブレイクにおすすめの雑談お題30選',
  description: '会議の冒頭やリモートワークの雑談で使えるアイスブレイクのお題を30個厳選。初対面・チーム・1on1向けの質問例と、ランダムに選べる無料の雑談テーマガチャを紹介します。',
  alternates: {
    canonical: '/icebreak',
  },
  openGraph: {
    title: '会議のアイスブレイクにおすすめの雑談お題30選｜雑談テーマガチャ',
    description: '会議の冒頭やリモートワークの雑談で使えるアイスブレイクのお題を30個厳選。初対面・チーム・1on1向けの質問例を紹介します。',
    url: `${APP_URL}/icebreak`,
    type: 'article',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '会議のアイスブレイクにおすすめの雑談お題30選',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '会議のアイスブレイクにおすすめの雑談お題30選｜雑談テーマガチャ',
    description: '会議の冒頭やリモートワークの雑談で使えるアイスブレイクのお題を30個厳選。初対面・チーム・1on1向けの質問例を紹介します。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const icebreakGroups = [
  {
    id: 'first-meeting',
    title: '初対面・オンライン会議向けのお題10選',
    description: '答えやすく、相手の好みや人柄が自然と見えてくるお題です。会議の冒頭やブレイクアウトルームの最初の話題に向いています。',
    themes: [
      '最近始めた新しい趣味は？',
      '今までで一番良かった旅行先は？',
      '休日の過ごし方の定番は？',
      '最後の晩餐に何を食べたい？',
      '好きな季節は？',
      '最近よく聴いているアーティストは？',
      'ペットを飼ったことある？',
      '学生時代の一番の思い出は？',
      '好きなバラエティ番組は？',
      '好きなスポーツは？',
    ],
  },
  {
    id: 'team-1on1',
    title: 'チーム・1on1向けのお題10選',
    description: '仕事の価値観や最近の変化を知ることで、チームの相互理解や1on1の会話につなげるお題です。',
    themes: [
      '仕事のやりがいを感じる瞬間は？',
      '仕事で大事にしている価値観は？',
      '1on1で話したいことは？',
      '理想の働き方は？',
      'チームで助かった経験は？',
      '大事にしている価値観は？',
      '最近成長したと感じることは？',
      '休日の朝は何時に起きる？',
      '最近の小さな楽しみは？',
      '10年後の自分はどうなってると思う？',
    ],
  },
  {
    id: 'deep-talk',
    title: '盛り上がる・深掘りしたいお題10選',
    description: '正解のない話題だからこそ、会話が広がりやすいお題です。飲み会やチームの雑談タイムにもおすすめです。',
    themes: [
      'もし宝くじで1億円当たったら？',
      'もし魔法が使えたら何をする？',
      '人生で一番泣いた映画は？',
      '人生を変えた一冊は？',
      '家族との思い出といえば？',
      '忘れられない恋の思い出は？',
      '好きなゲームのジャンルは？',
      '未来に欲しいテクノロジーは？',
      'お金で買えないと思うものは？',
      '10年後も大切にしていたいことは？',
    ],
  },
];

const tips = [
  {
    emoji: '⏱️',
    title: '1人1分以内で答える',
    text: 'アイスブレイクは長引かせすぎないのがコツ。1人1分以内を目安にすると、本題への切り替えがスムーズです。',
  },
  {
    emoji: '🗣️',
    title: '答えやすいお題から始める',
    text: '最初は「好きな食べ物」など、誰でも答えられるお題を選ぶと、参加者の緊張がほぐれます。',
  },
  {
    emoji: '❓',
    title: 'ひとつ質問を重ねる',
    text: '「それで？」「最近だと？」と質問を重ねると、会話が自然に広がります。',
  },
  {
    emoji: '👥',
    title: '全員が話す機会をつくる',
    text: 'お題を出す前に「一人ずつお願いします」と伝えておくと、発言しやすくなります。',
  },
  {
    emoji: '🎲',
    title: 'お題選びはランダムに任せる',
    text: '偏りを避けたいときは、ガチャでお題を決めるのがおすすめ。盛り上がるきっかけになります。',
  },
];

const faqs = [
  {
    question: '会議のアイスブレイクとは何ですか？',
    answer: '会議や研修の冒頭で、参加者の緊張をほぐし、会話を始めやすくするための短い雑談や質問のことです。1〜3分程度で終わる話題が向いています。',
  },
  {
    question: 'アイスブレイクにはどんなお題がおすすめですか？',
    answer: '「最近始めた新しい趣味は？」「休日の過ごし方の定番は？」「最後の晩餐に何を食べたい？」など、答えやすく、相手の人柄が見えるお題がおすすめです。',
  },
  {
    question: 'オンライン会議でも使えますか？',
    answer: 'はい。画面越しでも答えやすいお題を選べば、オンライン会議やリモートワークの雑談でも活用できます。',
  },
  {
    question: '初対面の相手にも使えますか？',
    answer: 'はい。「食べ物」「旅行」「休日」など、プライベートすぎないカテゴリから選ぶと答えやすくなります。',
  },
  {
    question: 'お題はどこから選べばいいですか？',
    answer: `このページで紹介している30選のほか、雑談テーマガチャのトップページで${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題からランダムに選べます。`,
  },
];

function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function IcebreakPage() {
  const allThemes = icebreakGroups.flatMap((group) => group.themes);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '会議のアイスブレイクにおすすめの雑談お題30選',
    numberOfItems: allThemes.length,
    itemListElement: allThemes.map((theme, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: theme,
    })),
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

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '雑談テーマガチャ',
        item: `${APP_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '会議のアイスブレイクにおすすめの雑談お題30選',
        item: `${APP_URL}/icebreak`,
      },
    ],
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: '会議のアイスブレイクにおすすめの雑談お題30選',
    description: '会議の冒頭やリモートワークの雑談で使えるアイスブレイクのお題を30個厳選。初対面・チーム・1on1向けの質問例を紹介します。',
    mainEntityOfPage: `${APP_URL}/icebreak`,
    image: `${APP_URL}/ogp.png`,
    inLanguage: 'ja-JP',
    datePublished: '2026-10-31',
    dateModified: '2026-11-03',
    author: { '@id': `${APP_URL}/#organization` },
    publisher: { '@id': `${APP_URL}/#organization` },
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
      />

      <div className="max-w-5xl mx-auto px-4 pt-6 pb-12">
        <div className="flex justify-end">
          <ThemeToggleButton />
        </div>

        <nav aria-label="パンくずリスト" className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">会議のアイスブレイク</li>
          </ol>
        </nav>

        <header className="max-w-3xl mb-10">
          <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">ICEBREAK GUIDE</p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-3">
            会議のアイスブレイクにおすすめの雑談お題30選
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            会議の冒頭で「何を話そう？」と迷っていませんか。このページでは、オンライン会議・1on1・チームの雑談で使いやすいアイスブレイクのお題を30個厳選しました。答えやすい質問から、思わず話が広がる深掘りネタまで、シーン別に紹介します。
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              href="/#gacha"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl transition-colors"
            >
              <span aria-hidden="true">🎲</span>
              ランダムにお題を選ぶ
            </Link>
            <Link
              href="/themes"
              className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-indigo-400 text-gray-700 dark:text-gray-200 font-bold px-5 py-3 rounded-xl transition-colors"
            >
              カテゴリから探す
            </Link>
          </div>
        </header>

        <section aria-labelledby="why-heading" className="mb-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
          <h2 id="why-heading" className="text-xl font-black text-gray-900 dark:text-white mb-3">
            なぜ会議にアイスブレイクが必要なのか
          </h2>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p>
              会議の冒頭に短い雑談を挟むと、参加者の緊張がほぐれ、発言しやすい雰囲気づくりにつながります。特にオンライン会議では、沈黙が生まれやすいため、アイスブレイクが有効です。
            </p>
            <p>
              大切なのは、正解のある議論ではなく、気軽に答えられる話題を選ぶこと。このページのお題は、初対面の相手でも答えやすく、会話を広げやすいものを中心に選んでいます。
            </p>
          </div>
        </section>

        {icebreakGroups.map((group, groupIndex) => (
          <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} className="mb-12 scroll-mt-6">
            <h2 id={`${group.id}-heading`} className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              {group.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              {group.description}
            </p>
            <ThemeList themes={group.themes} showHint={groupIndex === 0} />
          </section>
        ))}

        <section aria-labelledby="tips-heading" className="mb-12">
          <h2 id="tips-heading" className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            アイスブレイクを成功させる5つのコツ
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            お題だけでなく、進め方を少し工夫するだけで、会話がより自然に広がります。
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tips.map((tip) => (
              <div key={tip.title} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-xl" aria-hidden="true">{tip.emoji}</span>
                <h3 className="font-bold text-sm mt-2 mb-1.5">{tip.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="gacha-heading" className="mb-12">
          <div className="text-center mb-5">
            <p className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">RANDOM GACHA</p>
            <h2 id="gacha-heading" className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              お題選びに迷ったら、ガチャに任せる
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {themeCategories.length}カテゴリ・{totalThemeCount}以上のお題から、会話のきっかけになる1問をランダムに選べます。
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <ThemeGacha />
          </div>
        </section>

        <section aria-labelledby="categories-heading" className="mb-12">
          <h2 id="categories-heading" className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            シーン別・おすすめカテゴリ
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            会議の目的に合わせて、カテゴリページからお題を探すこともできます。
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {['趣味', '食べ物', '休日・ライフスタイル', '仕事', '価値観・性格', 'もしも・空想'].map((name) => {
              const category = themeCategories.find((item) => item.name === name);
              if (!category) {
                return null;
              }
              return (
                <Link
                  key={category.slug}
                  href={`/themes/${category.slug}`}
                  className="group flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all"
                >
                  <span className="text-2xl" aria-hidden="true">{category.emoji}</span>
                  <span>
                    <span className="block text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {category.name}の雑談お題
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{category.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="mb-12">
          <h2 id="faq-heading" className="text-2xl font-black text-gray-900 dark:text-white mb-4">
            会議のアイスブレイクに関するよくある質問
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

        <ShareButtons
          shareText="会議のアイスブレイクにおすすめの雑談お題30選"
          heading="この記事をシェアする"
        />
      </div>
    </main>
  );
}
