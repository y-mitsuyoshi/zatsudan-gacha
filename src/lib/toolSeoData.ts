import type { SeoFaq, SeoRelated } from '@/components/seo/SeoContentSection';

export type ToolSeoData = {
  slug: string;
  name: string;
  description: string;
  image: string;
  steps: { title: string; text: string }[];
  faqs: SeoFaq[];
  related: SeoRelated[];
};

const APP_URL = 'https://zatsudan-gacha.app';

export const TOOL_SEO_DATA: Record<'profile' | 'isekai' | 'excuse' | 'station', ToolSeoData> = {
  profile: {
    slug: '/profile-maker',
    name: '推し活プロフィールメーカー',
    description: '推しの名前、好きなところ、出会いのきっかけ、名言などを入力して、オリジナルの推し紹介カードを作成できる無料ツールです。10種類のテンプレート、画像保存、テキストコピー、Xシェアに対応しています。',
    image: '/ogp.png',
    steps: [
      { title: 'テンプレートを選ぶ', text: '10種類のデザインから、推しの雰囲気に合うテンプレートを選びます。' },
      { title: '推しの情報を入力・調整する', text: '名前、好きなところ、出会いのきっかけ、名言などを入力し、色やレイアウトを調整します。' },
      { title: '画像保存・コピー・シェア', text: '完成したカードをPNG画像として保存するか、テキストをコピーしてSNSで共有します。' },
    ],
    faqs: [
      { q: '推し活プロフィールメーカーは無料ですか？', a: 'はい。すべてのテンプレートと機能を無料で利用できます。会員登録やログインは不要です。' },
      { q: '入力した内容や画像はサーバーに送信されますか？', a: '入力内容と画像はブラウザ内で処理され、下書きとしてlocalStorageに保存されます。画像の生成もブラウザ内で行われ、サーバーには送信されません。' },
      { q: 'スマートフォンでも作成できますか？', a: 'はい。スマートフォンでもフォーム入力・プレビュー・画像保存ができます。大きな画像は自動で縮小されます。' },
      { q: 'テンプレートは何種類ありますか？', a: 'シンプル、ポップ、クール、エレガント、かわいい、ヴィンテージ、ネオン、ドリーミー、レトロ、ミニマルの10種類です。' },
      { q: '作ったカードはどうやって使えますか？', a: 'PNG画像として保存したり、テキストをコピーしたり、Xでシェアできます。SNSのプロフィールや推し活の共有にご利用ください。' },
    ],
    related: [
      { href: '/games', label: '無料ブラウザゲーム一覧', description: '社畜ゲームをまとめて探す' },
      { href: '/isekai-status', label: '異世界転生ステータスカード', description: '異世界キャラクターを診断' },
      { href: '/station-sign-maker', label: '駅名標メーカー', description: 'オリジナル駅名看板を作成' },
    ],
  },
  isekai: {
    slug: '/isekai-status',
    name: '異世界転生ステータスカード',
    description: '5つの質問に答えるだけで、異世界での職業・能力値・固有スキル・装備・レアリティを診断できる無料ツールです。画像保存、テキストコピー、SNSシェアに対応しています。',
    image: '/ogp.png',
    steps: [
      { title: '5つの質問に答える', text: '名前や性格、好みに関する質問に回答します。' },
      { title: '異世界ステータスを診断する', text: '回答内容から職業・能力値・固有スキル・装備・レアリティが決定します。' },
      { title: '結果を保存・シェアする', text: 'ステータスカードを画像として保存したり、テキストをコピーしてSNSで共有できます。' },
    ],
    faqs: [
      { q: '異世界転生ステータスカードは無料ですか？', a: 'はい。診断・画像保存・テキストコピー・シェアをすべて無料で利用できます。' },
      { q: '診断結果は保存されますか？', a: '診断結果はページ上に表示され、画像として保存できます。サーバーには保存されません。' },
      { q: 'レアリティはどうやって決まりますか？', a: 'レベルと能力値の合計（総合力）に応じて、N・R・SR・SSRの4段階で判定されます。' },
      { q: 'スマートフォンでも診断できますか？', a: 'はい。スマートフォンでも質問への回答、結果表示、画像保存ができます。' },
      { q: '結果をXでシェアできますか？', a: 'はい。診断結果のテキストをコピーしたり、Xのシェア画面を開けます。' },
    ],
    related: [
      { href: '/games', label: '無料ブラウザゲーム一覧', description: '社畜ゲームをまとめて探す' },
      { href: '/profile-maker', label: '推し活プロフィールメーカー', description: '推し紹介カードを作成' },
      { href: '/shachiku-sugoroku', label: '社畜すごろくNEO', description: 'キャリアボードゲーム' },
    ],
  },
  excuse: {
    slug: '/excuse-generator',
    name: '究極の言い訳ジェネレーター',
    description: 'AIが、遅刻・納期遅れ・飲み会の断りなど、さまざまなシーンに合わせた言い訳を生成する無料ツールです。10種類の文体と詳細条件を選べ、生成履歴はブラウザに保存されます。',
    image: '/ogp.png',
    steps: [
      { title: 'シチュエーションを選ぶ', text: '遅刻、納期遅れ、飲み会の断りなどから、ピンチの場面を選びます。' },
      { title: 'トーンと詳細を指定する', text: '10種類の文体から選び、相手や状況などの詳細情報を必要に応じて入力します。' },
      { title: '言い訳を生成して使う', text: '生成された文章をコピーしたり、履歴に保存したりして、その場で活用します。' },
    ],
    faqs: [
      { q: '言い訳ジェネレーターは無料ですか？', a: 'はい。AIによる言い訳生成を無料で利用できます。会員登録は不要です。' },
      { q: 'どんなトーン（文体）がありますか？', a: '真面目・ビジネス用、ユーモア・社畜風、異世界転生風、マッチョ風、ツンデレ風、文豪風、猫風、ラップ風、ギャル風、ランダムの10種類です。' },
      { q: '生成した言い訳は保存されますか？', a: '生成履歴はブラウザのlocalStorageに最大20件保存されます。サーバーには保存されません。' },
      { q: '入力した内容はAIに送信されますか？', a: '生成に必要なシチュエーション・トーン・詳細情報がOpenCode Go APIに送信されます。個人情報や機密情報は入力しないでください。' },
      { q: 'AIの言い訳は正確ですか？', a: 'AIが生成する文章はエンターテインメント目的です。内容の正確性は保証されません。' },
    ],
    related: [
      { href: '/games', label: '無料ブラウザゲーム一覧', description: '社畜ゲームをまとめて探す' },
      { href: '/icebreak', label: '会議のアイスブレイクお題30選', description: '会議の話題づくりに' },
      { href: '/themes', label: '雑談お題カテゴリ一覧', description: '会話のネタを探す' },
    ],
  },
  station: {
    slug: '/station-sign-maker',
    name: '駅名標メーカー',
    description: '駅名・ローマ字・路線記号・駅番号・路線カラーを入力して、オリジナルの駅名標を作成できる無料ツールです。3種類のテンプレート、画像保存、Xシェアに対応しています。',
    image: '/ogp.png',
    steps: [
      { title: 'テンプレートを選ぶ', text: '定番ボード、サークルライン、ミニマルから好みのデザインを選びます。' },
      { title: '駅名と路線情報を入力する', text: '駅名、ローマ字、路線記号、駅番号、路線カラーを入力してプレビューを確認します。' },
      { title: '画像を保存・シェアする', text: '完成した駅名標をPNG画像として保存し、SNSや友達との共有に利用できます。' },
    ],
    faqs: [
      { q: '駅名標メーカーは無料ですか？', a: 'はい。すべてのテンプレートと機能を無料で利用できます。登録は不要です。' },
      { q: '入力した内容はサーバーに送信されますか？', a: '入力内容はブラウザ内で処理され、画像生成もブラウザ内で行われます。サーバーには送信されません。' },
      { q: '駅番号や路線記号も変更できますか？', a: 'はい。路線記号（最大3文字）と駅番号（最大4文字）を自由に変更できます。' },
      { q: 'テンプレートは何種類ありますか？', a: '定番ボード、サークルライン、ミニマルの3種類です。' },
      { q: '作った駅名標はどうやって使えますか？', a: 'PNG画像として保存したり、Xでシェアできます。SNSの投稿や友達との共有にご利用ください。' },
    ],
    related: [
      { href: '/games', label: '無料ブラウザゲーム一覧', description: '社畜ゲームをまとめて探す' },
      { href: '/profile-maker', label: '推し活プロフィールメーカー', description: '推し紹介カードを作成' },
      { href: '/isekai-status', label: '異世界転生ステータスカード', description: '異世界キャラクターを診断' },
    ],
  },
};

export function buildToolJsonLd(tool: ToolSeoData) {
  const url = `${APP_URL}${tool.slug}`;
  const image = `${APP_URL}${tool.image}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${url}#webapp`,
      name: tool.name,
      description: tool.description,
      url,
      image,
      screenshot: image,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      inLanguage: 'ja-JP',
      isAccessibleForFree: true,
      isPartOf: { '@id': `${APP_URL}/#website` },
      featureList: tool.steps.map((step) => step.title),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      publisher: { '@id': `${APP_URL}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `${tool.name}の使い方`,
      description: tool.description,
      inLanguage: 'ja-JP',
      step: tool.steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.title,
        text: step.text,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: tool.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
  ];
}
