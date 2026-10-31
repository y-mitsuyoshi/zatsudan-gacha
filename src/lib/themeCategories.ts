import { themeData } from './themeData';

export type ThemeCategoryMeta = {
  name: string;
  slug: string;
  emoji: string;
  description: string;
  keywords: string[];
};

export const themeCategories: ThemeCategoryMeta[] = [
  {
    name: '趣味',
    slug: 'hobby',
    emoji: '🎨',
    description: '休日の過ごし方やハマっていることから、相手の意外な一面が見つかるお題を集めました。',
    keywords: ['趣味 雑談', '趣味 お題', '休日 過ごし方', 'ハマっていること'],
  },
  {
    name: '旅行',
    slug: 'travel',
    emoji: '✈️',
    description: '旅行の思い出や次の旅の妄想で、初対面でも自然と盛り上がるお題を集めました。',
    keywords: ['旅行 雑談', '旅行 お題', '旅行 話 ネタ', '次の旅行'],
  },
  {
    name: 'ニュース',
    slug: 'news',
    emoji: '📰',
    description: '最近のニュースや社会の変化について、気軽に話せるお題を集めました。',
    keywords: ['ニュース 雑談', 'ニュース お題', '時事 話題', '最近のニュース'],
  },
  {
    name: '映画',
    slug: 'movies',
    emoji: '🎬',
    description: '好きな映画や忘れられないシーン、映画館の楽しみ方で会話が広がるお題です。',
    keywords: ['映画 雑談', '映画 お題', '好きな映画', '映画 話題'],
  },
  {
    name: '本',
    slug: 'books',
    emoji: '📚',
    description: '本や漫画、好きな作家の話で盛り上がるお題を集めました。',
    keywords: ['本 雑談', '読書 お題', '好きな本', '本 話題'],
  },
  {
    name: '食べ物',
    slug: 'food',
    emoji: '🍜',
    description: '食べ物の好みや思い出の味、ご当地グルメで自然と笑顔になるお題です。',
    keywords: ['食べ物 雑談', '食べ物 お題', '好きな食べ物', 'グルメ 話題'],
  },
  {
    name: '仕事',
    slug: 'work',
    emoji: '💼',
    description: '仕事の悩みややりがい、働き方をゆるく語れるお題を集めました。',
    keywords: ['仕事 雑談', '仕事 お題', '職場 話題', '働き方'],
  },
  {
    name: '恋愛',
    slug: 'love',
    emoji: '💕',
    description: '恋愛観や理想のデート、好きな人の話を少しずつ知れるお題です。',
    keywords: ['恋愛 雑談', '恋愛 お題', 'デート 話題', '好きなタイプ'],
  },
  {
    name: '健康',
    slug: 'health',
    emoji: '🌱',
    description: '睡眠・運動・ストレス解消法など、健康習慣をシェアできるお題を集めました。',
    keywords: ['健康 雑談', '健康 お題', '健康習慣', 'ストレス解消'],
  },
  {
    name: '未来',
    slug: 'future',
    emoji: '🚀',
    description: '10年後や未来の暮らしを想像して、チームで盛り上がるお題です。',
    keywords: ['未来 雑談', '未来 お題', '10年後', '未来 想像'],
  },
  {
    name: '政治',
    slug: 'politics',
    emoji: '🗳️',
    description: '社会の仕組みや住んでいる街について、前向きに話せるお題を集めました。',
    keywords: ['政治 雑談', '社会 お題', '街づくり', '選挙'],
  },
  {
    name: '音楽',
    slug: 'music',
    emoji: '🎵',
    description: '好きな音楽やライブの思い出、カラオケの話題で盛り上がるお題です。',
    keywords: ['音楽 雑談', '音楽 お題', '好きな曲', 'カラオケ 話題'],
  },
  {
    name: 'スポーツ',
    slug: 'sports',
    emoji: '⚽',
    description: '観るのもやるのもスポーツの話で盛り上がるお題を集めました。',
    keywords: ['スポーツ 雑談', 'スポーツ お題', '好きなスポーツ', '試合 話題'],
  },
  {
    name: 'テレビ・動画',
    slug: 'tv',
    emoji: '📺',
    description: 'ドラマ・バラエティ・動画配信の話題で、気軽に盛り上がるお題です。',
    keywords: ['テレビ 雑談', 'ドラマ お題', '動画配信', 'バラエティ 話題'],
  },
  {
    name: '動物・ペット',
    slug: 'pets',
    emoji: '🐾',
    description: '犬・猫などのペットや動物の思い出を語れる、癒やしのお題を集めました。',
    keywords: ['ペット 雑談', '動物 お題', '犬 猫 話題', 'ペット 思い出'],
  },
  {
    name: '学校・学生時代',
    slug: 'school',
    emoji: '🎓',
    description: '学生時代の思い出や部活、友達とのエピソードで盛り上がるお題です。',
    keywords: ['学生時代 雑談', '学校 お題', '部活 話題', '思い出'],
  },
  {
    name: 'お金・暮らし',
    slug: 'money',
    emoji: '💰',
    description: 'お金の使い方や節約、暮らしの工夫を気軽に語れるお題を集めました。',
    keywords: ['お金 雑談', '節約 お題', '暮らし 話題', '家計'],
  },
  {
    name: '休日・ライフスタイル',
    slug: 'lifestyle',
    emoji: '☕',
    description: '休日の過ごし方や毎日の小さな習慣をシェアできるお題です。',
    keywords: ['休日 雑談', 'ライフスタイル お題', '休日の過ごし方', '生活習慣'],
  },
  {
    name: '季節・イベント',
    slug: 'season',
    emoji: '🎉',
    description: '四季や行事、季節の楽しみ方を語れるお題を集めました。',
    keywords: ['季節 雑談', 'イベント お題', '行事 話題', '春夏秋冬'],
  },
  {
    name: 'もしも・空想',
    slug: 'whatif',
    emoji: '💭',
    description: 'もしもの世界を想像して、自由に盛り上がれる空想お題です。',
    keywords: ['もしも 雑談', '空想 お題', '想像 話題', '妄想'],
  },
  {
    name: '価値観・性格',
    slug: 'values',
    emoji: '🧭',
    description: '大切にしている価値観や性格を知ることで、お互いを深く理解できるお題です。',
    keywords: ['価値観 雑談', '性格 お題', '自分らしさ', '1on1'],
  },
  {
    name: 'テクノロジー',
    slug: 'tech',
    emoji: '💻',
    description: 'スマホ・AI・ガジェットなど、テクノロジーの話題で盛り上がるお題です。',
    keywords: ['テクノロジー 雑談', 'AI お題', 'ガジェット 話題', 'アプリ'],
  },
  {
    name: '家族・友達',
    slug: 'family',
    emoji: '🏠',
    description: '家族や友人とのエピソードで会話が弾む、あたたかいお題を集めました。',
    keywords: ['家族 雑談', '友達 お題', '友人 話題', '家族 思い出'],
  },
  {
    name: 'ファッション・美容',
    slug: 'fashion',
    emoji: '👗',
    description: 'ファッションや美容、自分らしさを語れるお題を集めました。',
    keywords: ['ファッション 雑談', '美容 お題', 'おしゃれ 話題', 'スキンケア'],
  },
  {
    name: 'ゲーム・アニメ',
    slug: 'games',
    emoji: '🎮',
    description: 'ゲームやアニメの好きな作品で、趣味の話に花が咲くお題です。',
    keywords: ['ゲーム 雑談', 'アニメ お題', '好きなゲーム', 'アニメ 話題'],
  },
];

export const themeCategoryByName = new Map(
  themeCategories.map((category) => [category.name, category])
);

export const themeCategoryBySlug = new Map(
  themeCategories.map((category) => [category.slug, category])
);

export const themeToCategory = new Map<string, string>(
  Object.entries(themeData).flatMap(([category, themes]) =>
    themes.map((theme) => [theme, category] as const)
  )
);

export const totalThemeCount = Object.values(themeData).reduce(
  (total, themes) => total + themes.length,
  0
);

export function getCategoryForTheme(theme: string): ThemeCategoryMeta | undefined {
  const categoryName = themeToCategory.get(theme);
  return categoryName ? themeCategoryByName.get(categoryName) : undefined;
}

export function getCategoryThemeCount(categoryName: string): number {
  return themeData[categoryName]?.length ?? 0;
}
