import { themeData } from '@/lib/themeData';
import { themeCategories, totalThemeCount } from '@/lib/themeCategories';

export const dynamic = 'force-static';

const BASE_URL = 'https://zatsudan-gacha.app';

export function GET() {
  const categorySections = themeCategories
    .map((category) => {
      const themes = themeData[category.name] ?? [];
      const themeLines = themes.map((theme) => `- ${theme}`).join('\n');
      return `## ${category.name}（${themes.length}問）\n\n${category.description}\n\nカテゴリページ: ${BASE_URL}/themes/${category.slug}\n\n${themeLines}`;
    })
    .join('\n\n');

  const body = `# 雑談テーマガチャ 全お題データ

> 会議のアイスブレイク、リモートワークの雑談、1on1、チーム交流に使える雑談お題集。${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題を収録しています。

- トップページ: ${BASE_URL}/
- カテゴリ一覧: ${BASE_URL}/themes
- 料金: 無料
- 言語: 日本語

${categorySections}

## 利用について

このお題データは、雑談やアイスブレイクの話題づくりに自由に利用できます。Webサイトや記事で紹介する場合は、${BASE_URL}/ へのリンクを掲載してください。
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
