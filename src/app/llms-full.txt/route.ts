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

## 収録ブラウザゲーム一覧（全21作品・無料・登録不要）

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
- 増殖ボール・シミュレーター (${BASE_URL}/ball-multiply): 重力・分裂確率・反発を調整する物理サンドボックス
- ドミノ・カスケード (${BASE_URL}/domino-cascade): 間隔・摩擦・押す力を調整する連鎖サンドボックス
- サンド・フロー・サンドボックス (${BASE_URL}/sand-flow): 重力・風・障害物を操る落下砂シミュレーター
- バブル・マージ・ラボ (${BASE_URL}/bubble-merge): 表面張力と合体を観察する泡の物理ラボ
- 重力オービット・サンドボックス (${BASE_URL}/gravity-orbit): 惑星質量と速度から軌道を観察するシミュレーター

## 収録Webツール一覧（全49種類・無料・登録不要）

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
- 住宅ローン返済シミュレーター (${BASE_URL}/housing-loan-calculator): 月額返済・総利息・総支払額
- 住宅購入費用シミュレーター (${BASE_URL}/home-purchase-cost): 初期費用・月間住居費
- 賃貸vs購入 比較 (${BASE_URL}/rent-vs-buy): 賃貸と購入の総コスト比較
- 住宅ローン控除 計算 (${BASE_URL}/housing-loan-deduction): 控除額の概算
- 固定資産税・都市計画税 (${BASE_URL}/property-tax-calculator): 土地・建物の年間税額
- 不動産売却の税金・手取り (${BASE_URL}/real-estate-sale-tax): 売却税・手取り・残債返済後
- 坪・㎡・畳 変換 (${BASE_URL}/tsubo-converter): 面積変換と坪単価
- 住宅ローン借入可能額 (${BASE_URL}/mortgage-borrowing-capacity): 年収からの借入可能額
- 繰上返済効果 (${BASE_URL}/prepayment-simulator): 期間短縮・返済額軽減の比較
- 複利・積立 資産形成 (${BASE_URL}/compound-interest-calculator): 複利・積立・税引後評価額
- 都道府県統計ランキング (${BASE_URL}/prefecture-ranking): 人口・面積・人口密度のランキング比較
- 都道府県統計クイズ (${BASE_URL}/prefecture-quiz): 統計データから学ぶ5問クイズ
- 標準偏差・分散計算 (${BASE_URL}/standard-deviation): 平均・分散・標準偏差・変動係数
- 相関係数・散布図 (${BASE_URL}/correlation-coefficient): 相関係数・決定係数・回帰直線
- 偏差値計算 (${BASE_URL}/deviation-score): 偏差値・zスコア・推定パーセンタイル
- 統計グラフメーカー (${BASE_URL}/statistics-graph): 棒グラフ・折れ線グラフをSVGで作成
- ヒートマップメーカー (${BASE_URL}/heatmap-maker): CSV数値のヒートマップ可視化
- 主要都市間距離計算 (${BASE_URL}/city-distance): 主要都市の大円距離と方角
- 緯度経度距離・方位計算 (${BASE_URL}/coordinate-distance): 2地点の距離・方位・中点
- 世界時差クロック (${BASE_URL}/world-timezone): 主要都市の現在時刻・時差・昼夜
- ロジスティック回帰分析 (${BASE_URL}/logistic-regression): 二値アウトカムを予測するロジスティック回帰。オッズ比・混同行列
- 主成分分析 (${BASE_URL}/principal-component-analysis): 多次元データの主成分分析。固有値・寄与率・負荷量・スコア
- 重回帰分析 (${BASE_URL}/multiple-regression): 複数の説明変数から目的変数を予測。係数・p値・VIF・残差
- 分位点回帰分析 (${BASE_URL}/quantile-regression): 外れ値に頑健な分位点回帰。切片・傾き・疑似R1
- マルチレベル分析 (${BASE_URL}/multilevel-analysis): グループ構造を考慮したランダム切片モデル。ICCと分散成分
- 因子分析 (${BASE_URL}/factor-analysis): 相関行列からの因子抽出とバリマックス回転。負荷量・共通性
- クラスター分析 (${BASE_URL}/cluster-analysis): k-meansによるクラスタリング。中心・慣性・シルエット
- ブール代数分析（QCA） (${BASE_URL}/boolean-analysis): 真理表・整合性・被覆率・最小十分条件を分析
- t検定 (${BASE_URL}/t-test): 1標本・2標本・対応ありt検定。p値・信頼区間・効果量
- 最尤推定 (${BASE_URL}/maximum-likelihood): 正規・指数・ポアソン分布の最尤推定。AIC/BIC・信頼区間
- 共分散構造分析（媒介分析） (${BASE_URL}/covariance-structure-analysis): X→M→Yの直接・間接効果を推定。Sobel検定・パス図
- 相関分析 (${BASE_URL}/correlation-analysis): 多変数の相関行列・p値・ヒートマップ・散布図
- 分散分析（ANOVA） (${BASE_URL}/anova): 一元配置ANOVA。F値・p値・効果量・多重比較
- 時系列分析 (${BASE_URL}/time-series-analysis): 移動平均・指数平滑・トレンド・ACF・予測
- 生存分析（Kaplan-Meier） (${BASE_URL}/survival-analysis): 生存曲線・中央生存時間・リスク表・ログランク検定

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
