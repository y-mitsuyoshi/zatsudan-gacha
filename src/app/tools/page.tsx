import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '無料で使える便利ツール一覧｜統計・地図・住宅・実用など全49ツール',
  description: '重回帰、ロジスティック回帰、主成分分析、因子分析、クラスター分析、t検定、ANOVA、時系列、生存分析など高度な統計ツール15種類を追加。基本統計・地図・住宅・実用・クリエイティブを含む全49ツールを無料公開中。',
  keywords: [
    '無料 Webツール',
    '住宅ローン 計算',
    '住宅購入 費用',
    '賃貸 購入 比較',
    '固定資産税 計算',
    '不動産 売却 税金',
    '坪単価 計算',
    '借入可能額',
    '繰上返済',
    '複利 計算',
    '文字数カウンター',
    'JSON整形',
    'URLエンコード',
    'ハッシュ生成',
    'パスワード生成',
    '単位変換',
    'BMI 計算',
    'ローン返済 計算',
    '画像圧縮',
    'カラーコード変換',
    'プロフィールメーカー',
    '異世界転生 診断',
    '言い訳ジェネレーター',
    '駅名標メーカー',
    '画像作成 無料',
    'SNS シェア',
    '都道府県 統計',
    '標準偏差 計算',
    '相関係数 計算',
    '偏差値 計算',
    '統計グラフ 作成',
    'ヒートマップ 作成',
    '都市間 距離',
    '緯度経度 距離',
    '世界時差',
    '重回帰分析',
    'ロジスティック回帰',
    '主成分分析',
    '因子分析',
    'クラスター分析',
    't検定',
    '分散分析',
    '時系列分析',
    '生存分析',
    'スマホ ツール',
  ],
  alternates: {
    canonical: '/tools',
  },
  openGraph: {
    title: '無料で使える便利ツール一覧',
    description: '重回帰、ロジスティック回帰、主成分分析、因子分析、クラスター分析、t検定、ANOVA、時系列、生存分析など高度な統計ツール15種類。基本統計・地図・住宅・実用・クリエイティブを含む全49ツール。登録不要・スマホ対応。',
    url: `${APP_URL}/tools`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '無料で使える便利ツール一覧' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '無料で使える便利ツール一覧',
    description: '重回帰、ロジスティック回帰、主成分分析、因子分析、クラスター分析、t検定、ANOVA、時系列、生存分析など高度な統計ツール15種類。基本統計・地図・住宅・実用・クリエイティブを含む全49ツール。登録不要・スマホ対応。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const creativeTools = [
  {
    name: '推し活プロフィールメーカー',
    href: '/profile-maker',
    tagline: '推しの「好き」をカードに',
    description: '名前・好きなところ・出会いのきっかけ・名言を入力して、オリジナルの推し紹介カードを作成。10種類のテンプレート、自動保存、画像保存、テキストコピー、Xシェアに対応。',
  },
  {
    name: '異世界転生ステータスカード',
    href: '/isekai-status',
    tagline: '異世界での自分を診断',
    description: '5つの質問に答えるだけで、職業・能力値・固有スキル・装備・レアリティを診断。N/R/SR/SSRのレアリティ判定と画像保存に対応。',
  },
  {
    name: '究極の言い訳ジェネレーター',
    href: '/excuse-generator',
    tagline: 'AIが言い訳を考えます',
    description: '遅刻・納期遅れ・飲み会の断りなど、シチュエーションと10種類のトーンからAIが言い訳を生成。生成履歴はブラウザに保存されます。',
  },
  {
    name: '駅名標メーカー',
    href: '/station-sign-maker',
    tagline: 'オリジナル駅名標を作成',
    description: '駅名・ローマ字・路線記号・駅番号・路線カラーを入力して、自分だけの駅名標を作成。3種類のテンプレート、画像保存、Xシェアに対応。',
  },
];

const utilityTools = [
  {
    name: '文字数カウンター',
    href: '/character-counter',
    tagline: '文字・行・単語・バイト数を集計',
    description: '入力したテキストの文字数、UTF-16、行数、単語数、UTF-8バイト数、読了時間をリアルタイムで集計。SNS投稿や原稿の長さ確認に便利です。',
  },
  {
    name: 'JSON整形・検証',
    href: '/json-formatter',
    tagline: 'JSONを見やすく整形・圧縮',
    description: 'JSONを2/4スペースまたはタブで整形し、最小化も可能。構文エラーの位置を確認できるため、APIレスポンスや設定ファイルのチェックに使えます。',
  },
  {
    name: 'URLエンコード・デコード',
    href: '/url-encoder',
    tagline: 'URLの文字列を安全に変換',
    description: '日本語や記号を含むURLをencodeURIComponent/encodeURIで変換し、デコードも可能。不正なパーセントエンコードも安全に検出します。',
  },
  {
    name: 'ハッシュ生成',
    href: '/hash-generator',
    tagline: 'SHA-256/384/512を生成',
    description: 'Web Crypto APIでテキストのSHA-256・SHA-384・SHA-512ハッシュを生成。入力はブラウザ内だけで処理され、サーバーへ送信されません。',
  },
  {
    name: 'パスワード生成',
    href: '/password-generator',
    tagline: '安全なランダムパスワードを作成',
    description: 'crypto.getRandomValuesを使い、長さ・文字種・記号・紛らわしい文字の除外を指定してパスワードを生成。強度の目安とコピー機能を備えています。',
  },
  {
    name: '単位変換',
    href: '/unit-converter',
    tagline: '長さ・重さ・温度などを変換',
    description: '長さ、重さ、温度、面積、体積、速度、データ容量を相互変換。日常生活や仕事の計算に使える無料の単位変換ツールです。',
  },
  {
    name: 'BMI・健康計算',
    href: '/bmi-calculator',
    tagline: 'BMI・基礎代謝・消費カロリー',
    description: '身長・体重・年齢・性別・活動量からBMI、標準体重、基礎代謝、推定消費カロリーを計算。健康管理の目安に使えます。',
  },
  {
    name: 'ローン返済シミュレーター',
    href: '/loan-calculator',
    tagline: '月額返済と利息を試算',
    description: '借入額・金利・返済期間・元利均等/元金均等から、月額返済、総利息、総返済額、年次返済表を試算。住宅ローンや事業ローンの検討に。',
  },
  {
    name: '画像リサイズ・圧縮',
    href: '/image-resizer',
    tagline: 'ブラウザ内で画像を軽量化',
    description: 'JPEG・PNG・WebP画像を指定サイズにリサイズし、品質を調整して圧縮。画像はアップロードされず、端末内だけで処理されます。',
  },
  {
    name: 'カラーコード変換・配色',
    href: '/color-converter',
    tagline: 'HEX・RGB・HSLと配色を確認',
    description: 'HEX・RGB・HSLを相互変換し、補色・類似色・トライアドなどの配色を生成。WCAGコントラスト比も確認できるデザインツールです。',
  },
];

const financeTools = [
  {
    name: '住宅ローン返済シミュレーター',
    href: '/housing-loan-calculator',
    tagline: '月額返済・利息・総支払額を試算',
    description: '借入額・頭金・金利・期間・返済方式・ボーナス返済から、毎月の返済額、総利息、頭金込みの総支払額を試算。住宅購入の資金計画に役立ちます。',
  },
  {
    name: '住宅購入費用シミュレーター',
    href: '/home-purchase-cost',
    tagline: '初期費用と月間住居費を把握',
    description: '物件価格・頭金・仲介手数料・登記費用・税金・管理費・修繕積立金から、購入時の初期費用と毎月の住居費をまとめて試算します。',
  },
  {
    name: '賃貸vs購入 比較シミュレーター',
    href: '/rent-vs-buy',
    tagline: '賃貸と購入の総コストを比較',
    description: '家賃・更新料・購入価格・ローン・管理費・修繕費・売却想定価格から、一定期間の賃貸総支払額と購入の実質コストを比較します。',
  },
  {
    name: '住宅ローン控除 計算シミュレーター',
    href: '/housing-loan-deduction',
    tagline: '年末残高から控除額を概算',
    description: '年末ローン残高・住宅性能・控除率・控除期間・所得税額から、住宅ローン控除の年間控除額と期間合計を概算します。',
  },
  {
    name: '固定資産税・都市計画税シミュレーター',
    href: '/property-tax-calculator',
    tagline: '土地・建物の年間税額を試算',
    description: '土地・建物の固定資産税評価額、住宅用地特例、新築軽減、税率から、固定資産税と都市計画税の年間合計を概算します。',
  },
  {
    name: '不動産売却の税金・手取りシミュレーター',
    href: '/real-estate-sale-tax',
    tagline: '売却時の税金と手取りを概算',
    description: '売却価格・取得費・譲渡費用・所有期間・特別控除から、譲渡所得税・住民税・売却手取り・残債返済後の手残りを試算します。',
  },
  {
    name: '坪・㎡・畳 変換＆坪単価計算',
    href: '/tsubo-converter',
    tagline: '面積と坪単価を相互変換',
    description: '坪・㎡・畳を相互変換し、総額や坪単価・㎡単価も計算。地域差のある畳サイズも変更できる不動産面積ツールです。',
  },
  {
    name: '住宅ローン借入可能額シミュレーター',
    href: '/mortgage-borrowing-capacity',
    tagline: '年収から無理のない借入額を試算',
    description: '年収・返済負担率・金利・期間・頭金・既存借入から、住宅ローンの借入可能額と物件購入可能額の目安を計算します。',
  },
  {
    name: '繰上返済効果シミュレーター',
    href: '/prepayment-simulator',
    tagline: '期間短縮・返済額軽減の効果を比較',
    description: 'ローン残高・金利・残期間・繰上返済額から、期間短縮型と返済額軽減型の利息軽減効果と手数料込みのメリットを試算します。',
  },
  {
    name: '複利・積立 資産形成シミュレーター',
    href: '/compound-interest-calculator',
    tagline: '毎月積立と複利効果を試算',
    description: '初期資金・毎月積立・年利・期間・積立タイミング・税金から、複利運用の評価額、運用益、税引後評価額、年次推移を試算します。',
  },
];

const statsTools = [
  {
    name: '都道府県統計ランキング',
    href: '/prefecture-ranking',
    tagline: '47都道府県を人口・面積・密度で比較',
    description: '47都道府県の人口・面積・人口密度を、地域やキーワードで絞り込みながらランキング形式で比較。上位10件の棒グラフと全47件の一覧表をブラウザ内で確認できます。',
  },
  {
    name: '都道府県統計クイズ',
    href: '/prefecture-quiz',
    tagline: '統計データから5問のクイズ',
    description: '人口・面積・人口密度・地域区分からランダムに5問を出題。4択で答え、正誤と解説、最終スコアを確認できる学習クイズです。',
  },
  {
    name: '標準偏差・分散計算',
    href: '/standard-deviation',
    tagline: '平均・分散・標準偏差を計算',
    description: 'カンマ・スペース・改行区切りの数値から、平均・中央値・範囲・分散・標準偏差・変動係数を計算。母集団と標本の切り替えにも対応します。',
  },
  {
    name: '相関係数・散布図',
    href: '/correlation-coefficient',
    tagline: '2つのデータの関係を可視化',
    description: 'XとYの数値データから、平均・標準偏差・共分散・相関係数r・決定係数R²・回帰直線を計算し、散布図で関係性を確認できます。',
  },
  {
    name: '偏差値計算',
    href: '/deviation-score',
    tagline: '得点から偏差値とパーセンタイル',
    description: '得点・平均点・標準偏差から偏差値・zスコア・推定パーセンタイルを計算。得点リストをまとめて入力するモードにも対応しています。',
  },
  {
    name: '統計グラフメーカー',
    href: '/statistics-graph',
    tagline: 'ラベルと値からグラフを作成',
    description: 'ラベルと値を1行ずつ入力するだけで、棒グラフ・折れ線グラフをSVGで作成。並び替え、タイトル、単位、最大12件の表示設定に対応します。',
  },
  {
    name: 'ヒートマップメーカー',
    href: '/heatmap-maker',
    tagline: 'CSVの数値を色の濃淡で可視化',
    description: 'CSV形式の数値データから、行と列の傾向がわかるヒートマップを作成。ヘッダー・行ラベル、3種類の配色、行単位/全体の正規化に対応します。',
  },
];

const advancedRegressionTools = [
  {
    name: '重回帰分析',
    href: '/multiple-regression',
    tagline: '複数の説明変数から目的変数を予測',
    description: 'CSVで目的変数と2〜8個の説明変数を入力し、回帰係数・標準誤差・t値・p値・R²・VIF・残差プロットをブラウザ内で確認できます。',
  },
  {
    name: 'ロジスティック回帰分析',
    href: '/logistic-regression',
    tagline: '0/1の結果を確率で予測',
    description: '二値の目的変数と複数の説明変数から、オッズ比・95%信頼区間・McFadden R²・混同行列を計算する分類モデルです。',
  },
  {
    name: '分位点回帰分析',
    href: '/quantile-regression',
    tagline: '中央値や上位分位点の関係を推定',
    description: '外れ値の影響を受けにくい分位点回帰で、選んだ分位点における切片・傾き・疑似R¹を推定。散布図に回帰直線を表示します。',
  },
  {
    name: 'マルチレベル分析',
    href: '/multilevel-analysis',
    tagline: 'グループ差を考慮したランダム切片モデル',
    description: '学校・店舗・チームなどのグループ構造を考慮し、ICC・グループ間分散・グループ内分散・固定効果を確認できます。',
  },
  {
    name: '共分散構造分析（媒介分析）',
    href: '/covariance-structure-analysis',
    tagline: 'X→M→Yの直接・間接効果を可視化',
    description: 'X・M・Yの3変数から媒介モデルを推定し、パス係数・間接効果・Sobel検定・媒介率をパス図とともに表示します。',
  },
  {
    name: '時系列分析',
    href: '/time-series-analysis',
    tagline: '移動平均・指数平滑・自己相関・予測',
    description: '時系列データの移動平均、指数平滑、線形トレンド、差分、ACFを計算し、次3期の予測をSVGグラフで表示します。',
  },
  {
    name: '生存分析（Kaplan-Meier）',
    href: '/survival-analysis',
    tagline: '打ち切りデータの生存曲線を推定',
    description: '時間・イベント・グループのCSVからKaplan-Meier曲線、中央生存時間、リスク表、2群のログランク検定を計算します。',
  },
];

const advancedMultivariateTools = [
  {
    name: '主成分分析',
    href: '/principal-component-analysis',
    tagline: '多次元データを少ない主成分に圧縮',
    description: '2〜8変数を標準化し、固有値・寄与率・累積寄与率・負荷量・主成分スコアを計算。PC1/PC2の散布図も表示します。',
  },
  {
    name: '因子分析',
    href: '/factor-analysis',
    tagline: '観測変数の背後にある共通因子を推定',
    description: '相関行列から因子を抽出し、バリマックス回転後の負荷量・共通性・独自性・寄与率を確認できる探索的因子分析ツールです。',
  },
  {
    name: 'クラスター分析',
    href: '/cluster-analysis',
    tagline: 'k-meansで類似サンプルをグループ化',
    description: '2〜6変数のデータを標準化し、k-meansクラスタリングを実行。クラスター中心、サイズ、慣性、シルエットスコアを表示します。',
  },
  {
    name: 'ブール代数分析（QCA）',
    href: '/boolean-analysis',
    tagline: '条件の組み合わせと結果の関係を分析',
    description: '0/1の条件と結果から真理表を作成し、整合性・被覆率・必要条件・最小十分条件をQCAの考え方で整理します。',
  },
  {
    name: 't検定',
    href: '/t-test',
    tagline: '1標本・2標本・対応ありの平均差',
    description: '1標本、Student/Welchの2標本、対応ありt検定に対応。t値・自由度・p値・信頼区間・Cohenのdを計算します。',
  },
  {
    name: '分散分析（ANOVA）',
    href: '/anova',
    tagline: '3群以上の平均差をまとめて検定',
    description: 'グループ別のCSVから一元配置ANOVAを実行し、F値・p値・η²・ω²・群平均・多重比較の目安を表示します。',
  },
  {
    name: '最尤推定',
    href: '/maximum-likelihood',
    tagline: '正規・指数・ポアソン分布のパラメータ推定',
    description: 'データから分布パラメータを最尤推定し、対数尤度・AIC・BIC・標準誤差・信頼区間・当てはめグラフを表示します。',
  },
  {
    name: '相関分析',
    href: '/correlation-analysis',
    tagline: '多変数の相関行列とp値を確認',
    description: '2〜8変数の相関行列、p値、最も強い正負のペア、選択した2変数の散布図を表示。相関と因果の違いも確認できます。',
  },
];

const mapTools = [

  {
    name: '主要都市間距離計算',
    href: '/city-distance',
    tagline: '都市間の直線距離と方角',
    description: '全国の主要都市から2地点を選び、大円距離と方角の目安を計算。緯度経度を簡易マップ上に示し、位置関係も確認できます。',
  },
  {
    name: '緯度経度距離・方位計算',
    href: '/coordinate-distance',
    tagline: '座標から距離・方位・中点を算出',
    description: '2地点の緯度経度から、ハバーサイン式による距離、初期方位、16方位、中点座標を計算。座標グリッド上に2地点と線を表示します。',
  },
  {
    name: '世界時差クロック',
    href: '/world-timezone',
    tagline: '主要都市の現在時刻と時差',
    description: '世界の主要都市の現在時刻・日付・UTCオフセット・基準都市との時差を一覧表示。昼夜の目安も確認できる世界時計ツールです。',
  },
];

const allTools = [...creativeTools, ...utilityTools, ...financeTools, ...statsTools, ...advancedRegressionTools, ...advancedMultivariateTools, ...mapTools];

function ToolSection({
  id,
  eyebrow,
  title,
  range,
  tools,
  intro,
}: {
  id: string;
  eyebrow: string;
  title: string;
  range: string;
  tools: { name: string; href: string; tagline: string; description: string }[];
  intro?: string;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} id={id} className="mt-14">
      <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
        <div>
          <p className="paper-kicker">{eyebrow}</p>
          <h2 id={`${id}-heading`} className="font-editorial mt-2 text-2xl">{title}</h2>
        </div>
        <span className="font-label text-[9px] text-[var(--ink-soft)]">{range}</span>
      </div>
      {intro && <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">{intro}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {tools.map((tool, index) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group border border-[var(--line)] bg-[var(--paper-strong)] p-5 transition-colors hover:border-[var(--accent)]"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="font-label text-[10px] text-[var(--accent)]">{String(index + 1).padStart(2, '0')}</span>
              <span className="font-label text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]" aria-hidden="true">→</span>
            </div>
            <p className="font-label mt-5 text-[9px] text-[var(--ink-soft)]">{tool.tagline}</p>
            <h3 className="font-editorial mt-2 text-2xl leading-snug">{tool.name}</h3>
            <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{tool.description}</p>
            <span className="font-label mt-5 inline-flex text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]">
              Open tool →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const faqs = [
  { q: '紹介している49のツールは無料ですか？', a: 'はい。クリエイティブツール4種類、実用ツール10種類、住まい・お金の計算ツール10種類、基本統計ツール7種類、高度な統計ツール15種類、地図・距離ツール3種類のすべてを無料で利用できます。会員登録やログインは不要です。' },
  { q: '高度な統計分析はどんなツールがありますか？', a: '重回帰、ロジスティック回帰、分位点回帰、マルチレベル分析、共分散構造分析（媒介分析）、主成分分析、因子分析、クラスター分析、QCA、t検定、ANOVA、最尤推定、相関分析、時系列分析、生存分析の15種類を収録しています。' },
  { q: 'スマートフォンでも使えますか？', a: 'はい。各ツールはスマートフォンのブラウザに対応しています。' },
  { q: '入力した内容はサーバーに送信されますか？', a: '実用ツール10種類、住まい・お金の計算ツール10種類、基本統計ツール7種類、高度な統計ツール15種類、地図・距離ツール3種類はすべてブラウザ内で処理され、入力内容をサーバーへ送信しません。プロフィールと駅名標もブラウザ内処理です。言い訳ジェネレーターのみ、文章生成のため入力内容がOpenCode Go APIに送信されます。' },
  { q: '作成した画像はSNSで使えますか？', a: 'はい。プロフィールメーカー・駅名標メーカー・画像リサイズツールで作成した画像は、SNSの投稿やプロフィールに利用できます。' },
  { q: 'オフラインでも使えますか？', a: '実用ツール、住まい・お金の計算ツール、基本統計・高度な統計ツール、地図・距離ツールは、ページを読み込んだ後、ブラウザ内で計算・変換が完結します。AI言い訳生成のみインターネット接続が必要です。' },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '無料で使える便利ツール一覧',
    description: '登録不要で使える無料Webツールの一覧。',
    url: `${APP_URL}/tools`,
    inLanguage: 'ja-JP',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: allTools.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: allTools.map((tool, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: tool.name,
        url: `${APP_URL}${tool.href}`,
      })),
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '雑談テーマガチャ', item: `${APP_URL}/` },
      { '@type': 'ListItem', position: 2, name: '無料ツール一覧', item: `${APP_URL}/tools` },
    ],
  },
];

export default function ToolsPage() {
  return (
    <main className="paper-page min-h-screen">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <Link href="/" className="font-label text-[10px] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]">
            ← 雑談テーマガチャ
          </Link>
          <ThemeToggleButton />
        </header>

        <nav aria-label="パンくずリスト" className="mt-4 font-label text-[9px] text-[var(--ink-soft)]">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="hover:text-[var(--accent)]">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">無料ツール一覧</li>
          </ol>
        </nav>

        <section className="grid gap-8 py-10 lg:grid-cols-[1fr_0.45fr] lg:items-end">
          <div>
            <p className="paper-kicker">Tool Archive / 49 Titles</p>
            <h1 className="font-editorial mt-3 text-4xl leading-tight sm:text-5xl">
              無料で使える<br className="sm:hidden" />便利ツール
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              文字数カウント、JSON整形、画像圧縮など毎日使える実用ツール10種類。
              住まい・お金の計算10種類、基本統計7種類、高度な統計15種類、地図・距離・時差3種類、クリエイティブ4種類を収録しています。
            </p>
          </div>
          <div className="border-l border-[var(--line)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-label text-[9px] text-[var(--accent)]">Privacy Note</p>
            <p className="mt-2">
              実用・住まい・お金・基本統計・高度な統計・地図ツールはすべてブラウザ内で処理。入力内容をサーバーへ送信しません。言い訳ジェネレーターのみ、文章生成のため入力を外部AI APIへ送信します。
            </p>
          </div>
        </section>

        <ToolSection
          id="utility-tools"
          eyebrow="Everyday Utilities"
          title="毎日使える実用ツール（10種類）"
          range="01 — 10"
          tools={utilityTools}
        />

        <ToolSection
          id="finance-tools"
          eyebrow="Money & Home"
          title="住まい・お金の計算ツール（10種類）"
          range="01 — 10"
          tools={financeTools}
          intro="住宅ローン、購入費用、賃貸との比較、税金、売却、借入可能額、繰上返済、資産形成まで。入力内容はブラウザ内だけで処理されます。"
        />

        <ToolSection
          id="stats-tools"
          eyebrow="Statistics & Data"
          title="統計・データ分析ツール（7種類）"
          range="01 — 07"
          tools={statsTools}
          intro="都道府県統計、標準偏差、相関、偏差値、グラフ、ヒートマップまで。データを貼り付けて、ブラウザ内で集計・可視化できます。"
        />

        <ToolSection
          id="regression-stats"
          eyebrow="Regression & Prediction"
          title="回帰・予測・時系列ツール（7種類）"
          range="01 — 07"
          tools={advancedRegressionTools}
          intro="重回帰、ロジスティック回帰、分位点回帰、マルチレベル、媒介分析、時系列、生存時間まで。目的に合わせてモデルを選べます。"
        />

        <ToolSection
          id="multivariate-stats"
          eyebrow="Multivariate & Inference"
          title="多変量・検定・分類ツール（8種類）"
          range="01 — 08"
          tools={advancedMultivariateTools}
          intro="主成分、因子、クラスター、QCA、t検定、ANOVA、最尤推定、相関行列を収録。データの構造を多角的に確認できます。"
        />

        <ToolSection
          id="map-tools"
          eyebrow="Maps & Distance"
          title="地図・距離・時差ツール（3種類）"
          range="01 — 03"
          tools={mapTools}
          intro="主要都市の直線距離、緯度経度からの距離・方位、世界の時差を確認。外部地図サービスを使わず、端末内の計算だけで表示します。"
        />

        <ToolSection
          id="creative-tools"
          eyebrow="Creative Tools"
          title="作って遊べるクリエイティブツール（4種類）"
          range="01 — 04"
          tools={creativeTools}
        />

        <SeoContentSection
          eyebrow="TOOL GUIDE"
          title="49の無料Webツール"
          intro="用途に合わせて、気になるツールを選んでください。"
          faqs={faqs}
          related={[
            { href: '/prefecture-ranking', label: '都道府県統計ランキング', description: '47都道府県を人口・面積・密度で比較' },
            { href: '/city-distance', label: '主要都市間距離計算', description: '都市間の直線距離を簡易マップで確認' },
            { href: '/games', label: '無料ブラウザゲーム一覧', description: '社畜ゲームをまとめて探す' },
            { href: '/themes', label: '雑談お題カテゴリ一覧', description: '会話のネタを探す' },
          ]}
        />
      </div>
    </main>
  );
}
