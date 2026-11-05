import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '無料で使える便利ツール一覧｜住宅・不動産・資産形成など全24ツール',
  description: '住宅ローン、住宅購入費用、賃貸vs購入、固定資産税、売却税金、坪単価、借入可能額、繰上返済、複利積立など、住まいとお金の計算ツール10種類を追加。文字数・JSON・画像圧縮など全24ツールを無料公開中。',
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
    'スマホ ツール',
  ],
  alternates: {
    canonical: '/tools',
  },
  openGraph: {
    title: '無料で使える便利ツール一覧',
    description: '住宅ローン、住宅購入費用、固定資産税、売却税金、坪単価、繰上返済、複利積立など住まいとお金のツール10種類。文字数・JSON・画像圧縮など全24ツール。登録不要・スマホ対応。',
    url: `${APP_URL}/tools`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '無料で使える便利ツール一覧' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '無料で使える便利ツール一覧',
    description: '住宅ローン、住宅購入費用、固定資産税、売却税金、坪単価、繰上返済、複利積立など住まいとお金のツール10種類。文字数・JSON・画像圧縮など全24ツール。登録不要・スマホ対応。',
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

const allTools = [...creativeTools, ...utilityTools, ...financeTools];

const faqs = [
  { q: '紹介している24のツールは無料ですか？', a: 'はい。クリエイティブツール4種類、実用ツール10種類、住まい・お金の計算ツール10種類のすべてを無料で利用できます。会員登録やログインは不要です。' },
  { q: 'スマートフォンでも使えますか？', a: 'はい。各ツールはスマートフォンのブラウザに対応しています。' },
  { q: '入力した内容はサーバーに送信されますか？', a: '実用ツール10種類と住まい・お金の計算ツール10種類はすべてブラウザ内で処理され、入力内容をサーバーへ送信しません。プロフィールと駅名標もブラウザ内処理です。言い訳ジェネレーターのみ、文章生成のため入力内容がOpenCode Go APIに送信されます。' },
  { q: '作成した画像はSNSで使えますか？', a: 'はい。プロフィールメーカー・駅名標メーカー・画像リサイズツールで作成した画像は、SNSの投稿やプロフィールに利用できます。' },
  { q: 'オフラインでも使えますか？', a: '実用ツールと住まい・お金の計算ツールは、ページを読み込んだ後、ブラウザ内で計算・変換が完結します。AI言い訳生成のみインターネット接続が必要です。' },
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
            <p className="paper-kicker">Tool Archive / 24 Titles</p>
            <h1 className="font-editorial mt-3 text-4xl leading-tight sm:text-5xl">
              無料で使える<br className="sm:hidden" />便利ツール
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              文字数カウント、JSON整形、画像圧縮など毎日使える実用ツール10種類。
              住宅ローン・不動産・資産形成の計算ツール10種類、クリエイティブツール4種類を収録しています。
            </p>
          </div>
          <div className="border-l border-[var(--line)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-label text-[9px] text-[var(--accent)]">Privacy Note</p>
            <p className="mt-2">
              実用ツールと住まい・お金の計算ツールはすべてブラウザ内で処理。入力内容をサーバーへ送信しません。言い訳ジェネレーターのみ、文章生成のため入力を外部AI APIへ送信します。
            </p>
          </div>
        </section>

        <section aria-labelledby="utility-tools-heading" id="utility-tools">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker">Everyday Utilities</p>
              <h2 id="utility-tools-heading" className="font-editorial mt-2 text-2xl">毎日使える実用ツール（10種類）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 10</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {utilityTools.map((tool, index) => (
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

        <section aria-labelledby="finance-tools-heading" className="mt-14" id="finance-tools">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker">Money &amp; Home</p>
              <h2 id="finance-tools-heading" className="font-editorial mt-2 text-2xl">住まい・お金の計算ツール（10種類）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 10</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            住宅ローン、購入費用、賃貸との比較、税金、売却、借入可能額、繰上返済、資産形成まで。入力内容はブラウザ内だけで処理されます。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {financeTools.map((tool, index) => (
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

        <section aria-labelledby="creative-tools-heading" className="mt-14" id="creative-tools">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker">Creative Tools</p>
              <h2 id="creative-tools-heading" className="font-editorial mt-2 text-2xl">作って遊べるクリエイティブツール（4種類）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 04</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {creativeTools.map((tool, index) => (
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

        <SeoContentSection
          eyebrow="TOOL GUIDE"
          title="24の無料Webツール"
          intro="用途に合わせて、気になるツールを選んでください。"
          faqs={faqs}
          related={[
            { href: '/games', label: '無料ブラウザゲーム一覧', description: '社畜ゲームをまとめて探す' },
            { href: '/themes', label: '雑談お題カテゴリ一覧', description: '会話のネタを探す' },
          ]}
        />
      </div>
    </main>
  );
}
