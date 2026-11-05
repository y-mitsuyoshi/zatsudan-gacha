import { themeData } from '@/lib/themeData';
import { themeCategories, totalThemeCount } from '@/lib/themeCategories';
import { guides } from '@/lib/guideData';

export const dynamic = 'force-static';

const BASE_URL = 'https://zatsudan-gacha.app';

export function GET() {
  const categoryLines = themeCategories
    .map((category) => {
      const count = themeData[category.name]?.length ?? 0;
      return `- [${category.name}](${BASE_URL}/themes/${category.slug}): ${category.description}（${count}問）`;
    })
    .join('\n');

  const body = `# 雑談テーマガチャ

> 会議のアイスブレイク、リモートワークの雑談、1on1、チーム交流に使える無料の雑談お題ガチャ。${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題を収録しています。

- URL: ${BASE_URL}/
- カテゴリ一覧: ${BASE_URL}/themes
- 料金: 無料（ログイン・会員登録不要）
- 言語: 日本語
- 主な機能: お題のランダム抽選、カテゴリ絞り込み、履歴・お気に入り、タイムアタック、ルーレット、AI深掘り質問
- 全お題データ: ${BASE_URL}/llms-full.txt

## 概要

「雑談テーマガチャ」は、ボタンひとつで雑談のお題をランダムに表示する日本語のWebアプリです。「何を話せばいいかわからない」「会議の冒頭が気まずい」という場面で、会話のきっかけを提供します。お題はすべて日本語で、カテゴリ別に選べます。履歴とお気に入りはブラウザのlocalStorageに保存され、ログインは不要です。会議・1on1・リモートワーク・飲み会などシーン別のガイド、無料ブラウザゲーム、プロフィール作成などのツールも提供しています。

## カテゴリ

${categoryLines}

## 使い方

1. トップページ（${BASE_URL}/）でカテゴリを選ぶ
2. 「ガチャを回す」ボタンを押してお題を抽選する
3. 選ばれたお題について話す。必要に応じてコピーやシェア、AI深掘り質問を利用する

タイムアタックモードでは制限時間内にお題について話し、ルーレットモードでは項目と重みを設定して抽選できます。

## よくある質問

### 雑談テーマガチャとは何ですか？
ボタンひとつで雑談のお題をランダムに表示する無料のWebアプリです。${themeCategories.length}カテゴリ・${totalThemeCount}以上のお題を収録し、会議のアイスブレイクやリモートワークの雑談、1on1、チーム交流に利用できます。

### 会議のアイスブレイクにはどのお題がおすすめですか？
「最近始めた新しい趣味は？」「休日の朝は何時に起きる？」「学生時代の一番の思い出は？」など、答えやすく会話が広がるお題がおすすめです。「趣味」「休日・ライフスタイル」「学校・学生時代」カテゴリも参考にしてください。

### 無料で使えますか？
はい。ログインや会員登録は不要で、すべて無料で利用できます。

### オフラインでも使えますか？
お題の抽選はページ内のデータで動作するため、一度読み込めばオフラインでも利用できます。AI深掘り質問の生成のみ通信が必要です。

### AI深掘り機能とは何ですか？
選んだお題について、会話を広げる質問をAIが3つ提案する機能です。会議や1on1で会話が止まりそうなときに役立ちます。

## 引用・紹介について

雑談テーマガチャの紹介や引用は歓迎します。Webサイトや記事で紹介する場合は、${BASE_URL}/ へのリンクを掲載してください。お題をそのまま大量転載するのではなく、カテゴリページへのリンクを利用いただけると助かります。

## 主要ページ

- [トップページ・お題ガチャ](${BASE_URL}/)
- [シーン別・雑談お題ガイド](${BASE_URL}/guides)
${guides.map((guide) => `- [${guide.title}](${BASE_URL}/guides/${guide.slug})`).join('\n')}
- [会議のアイスブレイクにおすすめの雑談お題30選](${BASE_URL}/icebreak)
- [カテゴリ一覧](${BASE_URL}/themes)
- [無料ブラウザゲーム一覧](${BASE_URL}/games)
- [無料ツール一覧](${BASE_URL}/tools)
- [運営者情報・サイトについて](${BASE_URL}/about)
- [プライバシーポリシー](${BASE_URL}/privacy)
- [言い訳ジェネレーター](${BASE_URL}/excuse-generator)
- [駅名標メーカー](${BASE_URL}/station-sign-maker)
- [文字数カウンター](${BASE_URL}/character-counter)
- [JSON整形・検証](${BASE_URL}/json-formatter)
- [URLエンコード・デコード](${BASE_URL}/url-encoder)
- [ハッシュ生成](${BASE_URL}/hash-generator)
- [パスワード生成](${BASE_URL}/password-generator)
- [単位変換](${BASE_URL}/unit-converter)
- [BMI・健康計算](${BASE_URL}/bmi-calculator)
- [ローン返済シミュレーター](${BASE_URL}/loan-calculator)
- [画像リサイズ・圧縮](${BASE_URL}/image-resizer)
- [カラーコード変換・配色](${BASE_URL}/color-converter)
- [住宅ローン返済シミュレーター](${BASE_URL}/housing-loan-calculator)
- [住宅購入費用シミュレーター](${BASE_URL}/home-purchase-cost)
- [賃貸vs購入 比較](${BASE_URL}/rent-vs-buy)
- [住宅ローン控除 計算](${BASE_URL}/housing-loan-deduction)
- [固定資産税・都市計画税](${BASE_URL}/property-tax-calculator)
- [不動産売却の税金・手取り](${BASE_URL}/real-estate-sale-tax)
- [坪・㎡・畳 変換](${BASE_URL}/tsubo-converter)
- [住宅ローン借入可能額](${BASE_URL}/mortgage-borrowing-capacity)
- [繰上返済効果](${BASE_URL}/prepayment-simulator)
- [複利・積立 資産形成](${BASE_URL}/compound-interest-calculator)
- [都道府県統計ランキング](${BASE_URL}/prefecture-ranking)
- [都道府県統計クイズ](${BASE_URL}/prefecture-quiz)
- [標準偏差・分散計算](${BASE_URL}/standard-deviation)
- [相関係数・散布図](${BASE_URL}/correlation-coefficient)
- [偏差値計算](${BASE_URL}/deviation-score)
- [統計グラフメーカー](${BASE_URL}/statistics-graph)
- [ヒートマップメーカー](${BASE_URL}/heatmap-maker)
- [主要都市間距離計算](${BASE_URL}/city-distance)
- [緯度経度距離・方位計算](${BASE_URL}/coordinate-distance)
- [世界時差クロック](${BASE_URL}/world-timezone)
- [異世界転生ステータスカード](${BASE_URL}/isekai-status)
- [推し活プロフィールメーカー](${BASE_URL}/profile-maker)
- [社畜すごろく](${BASE_URL}/shachiku-sugoroku)
- [社畜人狼](${BASE_URL}/shachiku-jinro)
- [社畜サバイバー](${BASE_URL}/shachiku-survivor)
- [社畜スパイラル](${BASE_URL}/shachiku-spiral)
- [社畜通勤サバイバー](${BASE_URL}/barricade-defense)
- [社畜シューティング](${BASE_URL}/shachiku-shooting)
- [社畜ぶっとばし！定時退社カタパルト](${BASE_URL}/shachiku-catapult)
- [社畜ワイヤー疾走：終電スイングアクション](${BASE_URL}/shachiku-wire)
- [社畜グラグラ決済タワー：限界ビル建設](${BASE_URL}/shachiku-stack)
- [マイホーム完済記：35年・50年ローンの家計と暮らし](${BASE_URL}/mortgage-life)
- [少数派ワード](${BASE_URL}/minority-word)
- [以心伝心ゲーム](${BASE_URL}/ishin-denshin)
- [NGワード会議](${BASE_URL}/ng-word)
- [禁句トーク](${BASE_URL}/kinku-talk)
- [社長の頭の中（ランキング予想）](${BASE_URL}/rank-guess)
- [連想リレー](${BASE_URL}/word-chain)
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
