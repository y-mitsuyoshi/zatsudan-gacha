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

## 収録ブラウザゲーム一覧（全16作品・無料・登録不要）

- 社畜通勤サバイバー (${BASE_URL}/barricade-defense): 満員ラッシュを突破する3Dゲートシューティング
- 社畜サバイバー (${BASE_URL}/shachiku-survivor): 18時まで生き残る10分ホードサバイバル
- 社畜スパイラル (${BASE_URL}/shachiku-spiral): 渦巻くナンバー業務列を分断する防衛シューティング
- 社畜シューティングNEO (${BASE_URL}/shachiku-shooting): 定時退社を目指す本格弾幕シューティング
- 社畜すごろくNEO (${BASE_URL}/shachiku-sugoroku): ルーレットで進むジオラマ会社員ボードゲーム
- 社畜人狼 (${BASE_URL}/shachiku-jinro): AI社員と心理戦を楽しめる会社員ソロ人狼ゲーム
- 社畜ぶっとばし！定時退社カタパルト (${BASE_URL}/shachiku-catapult): 屋上から大空へ飛び出す飛距離アップグレードアクション
- 社畜ワイヤー疾走：終電スイングアクション (${BASE_URL}/shachiku-wire): 振り子物理でビル群を飛ぶワンボタンワイヤーアクション
- 社畜グラグラ決済タワー：限界ビル建設 (${BASE_URL}/shachiku-stack): クレーンからフロアを積むタイミング高層ビル建設ゲーム
- マイホーム完済記：35年・50年ローンの家計と暮らし (${BASE_URL}/mortgage-life): 銀行審査・タワマンvs戸建て・ペアローン・35年/50年・元利/元金均等・団信・住宅ローン控除・日銀利上げを生き抜くリアル人生シミュレーション
- 少数派ワード (${BASE_URL}/minority-word): 1台の端末で遊ぶ少数派ワード推理ゲーム
- 以心伝心ゲーム (${BASE_URL}/ishin-denshin): 同じ答えを狙うチームビルディングゲーム
- NGワード会議 (${BASE_URL}/ng-word): 禁句を言わずに会議を乗り切る会話ゲーム
- 禁句トーク (${BASE_URL}/kinku-talk): 禁句なしでお題を説明するチーム対戦ゲーム
- 社長の頭の中（ランキング予想） (${BASE_URL}/rank-guess): 社長のランキングを予想するチームゲーム
- 連想リレー (${BASE_URL}/word-chain): 言葉をつないで高得点を狙う連想ゲーム

## 収録Webツール一覧（全14種類・無料・登録不要）

- 文字数カウンター (${BASE_URL}/character-counter): 文字・行・単語・UTF-8バイト数を集計
- JSON整形・検証 (${BASE_URL}/json-formatter): JSONの整形・圧縮・構文チェック
- URLエンコード・デコード (${BASE_URL}/url-encoder): URL文字列の安全な変換
- ハッシュ生成 (${BASE_URL}/hash-generator): SHA-256/384/512ハッシュをブラウザ内で生成
- パスワード生成 (${BASE_URL}/password-generator): 安全なランダムパスワードを生成
- 単位変換 (${BASE_URL}/unit-converter): 長さ・重さ・温度・面積・体積・速度・データ容量
- BMI・健康計算 (${BASE_URL}/bmi-calculator): BMI・標準体重・基礎代謝・推定消費カロリー
- ローン返済シミュレーター (${BASE_URL}/loan-calculator): 月額返済・総利息・年次返済表
- 画像リサイズ・圧縮 (${BASE_URL}/image-resizer): 画像をブラウザ内でリサイズ・圧縮
- カラーコード変換・配色 (${BASE_URL}/color-converter): HEX/RGB/HSL変換・配色・コントラスト比
- 推し活プロフィールメーカー (${BASE_URL}/profile-maker): 推し紹介カードを作成
- 異世界転生ステータスカード (${BASE_URL}/isekai-status): 異世界キャラクター診断
- 究極の言い訳ジェネレーター (${BASE_URL}/excuse-generator): AIによる言い訳生成
- 駅名標メーカー (${BASE_URL}/station-sign-maker): オリジナル駅名標を作成

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
