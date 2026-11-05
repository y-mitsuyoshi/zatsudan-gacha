import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { ConsentSettingsButton } from '@/components/ConsentSettingsButton';

export const metadata: Metadata = {
 title: 'プライバシーポリシー',
 description: '雑談テーマガチャのプライバシーポリシー。取得する情報、Cookie・アクセス解析・広告の取り扱い、AI機能への入力、保存データの管理方法について説明します。',
 alternates: {
 canonical: '/privacy',
 },
 robots: {
 index: true,
 follow: true,
 },
};

const sections = [
 {
 title: '1. 基本方針',
 body: [
  '雑談テーマガチャ（以下「本サイト」）は、利用者のプライバシーを尊重し、個人情報の保護に努めます。本ポリシーは、本サイトで取得する情報とその取り扱いについて説明するものです。',
 ],
 },
 {
 title: '2. 取得する情報',
 body: [
  '本サイトでは、以下の情報を取り扱う場合があります。',
  '・利用者がフォームに入力した情報（推しの名前、駅名、診断の回答、言い訳生成の条件など）。これらは主に利用者のブラウザ内で処理され、AI機能を利用した場合に限り、生成のために外部APIへ送信されます。',
  '・アクセス解析情報（閲覧ページ、ブラウザや端末の情報、おおよその地域など）。Cookieの同意をいただいた場合のみ取得します。',
  '・広告配信に関する情報。Cookieの同意をいただいた場合のみ、Google AdSenseがCookie等を使用します。',
 ],
 },
 {
 title: '3. 利用目的',
 body: [
  '取得した情報は、本サイトの提供・改善、利用状況の把握、広告配信、不正利用の防止、お問い合わせへの対応のために利用します。',
 ],
 },
 {
 title: '4. Cookieと同意について',
 body: [
  '本サイトでは、Cookieとアクセス解析の同意バナーを表示します。同意いただくまでGoogle AnalyticsおよびGoogle AdSenseのスクリプトは読み込みません。必須のCookie（同意状態の保存など）は、サービスの提供に必要なため常に利用します。',
  'Cookieの設定は、このページ下部の「Cookie設定を変更する」ボタンから変更できます。また、ブラウザの設定でCookieを削除・拒否することも可能です。',
 ],
 },
 {
 title: '5. 外部サービス',
 body: [
  '本サイトは、以下の外部サービスを利用しています。各サービスにおける情報の取り扱いは、それぞれのプライバシーポリシーをご確認ください。',
  '・Google Analytics / Firebase（Google LLC）: アクセス解析',
  '・Google AdSense（Google LLC）: 広告配信',
  '・OpenCode Go API（OpenCode）: AIによる文章・質問の生成',
  '・Firebase Hosting / Cloud Functions（Google LLC）: サイト配信・サーバー処理',
 ],
 },
 {
 title: '6. AI機能への入力',
 body: [
  'AI深掘り質問や言い訳ジェネレーターに入力した内容は、回答生成のためにOpenCode Go APIへ送信されます。本サイトのサーバーでは、入力内容や生成結果を保存せず、他の利用者と共有しません。氏名・住所・電話番号・カード情報・機密情報など、生成に不要な個人情報は入力しないでください。AIの回答は正確性を保証するものではありません。',
 ],
 },
 {
 title: '7. ブラウザ内に保存される情報',
 body: [
  '本サイトは、利便性のために以下の情報を利用者のブラウザ（localStorage）に保存します。これらは運営者のサーバーには送信されません。',
  '・お気に入りと閲覧履歴（雑談テーマガチャ）',
  '・言い訳生成の履歴（言い訳ジェネレーター）',
  '・プロフィールメーカーの下書き（入力内容・アップロード画像を含む場合があります）',
  '・Cookieの同意状態',
  'ブラウザのデータ削除機能や設定から、いつでも消去できます。',
 ],
 },
 {
 title: '8. 保管期間と安全管理',
 body: [
  'アクセス解析情報は、Google Analyticsの保持設定に従って保管されます。AI機能への入力内容や生成結果は本サイトのサーバーに保存しません。AI機能の不正利用防止のため、IPアドレスをハッシュ化した値と利用回数のみを最大24時間保管します。本サイトは、情報の漏えい・紛失・改ざんを防ぐため、合理的な安全管理措置を講じます。',
 ],
 },
 {
 title: '9. 開示・訂正・削除等',
 body: [
  '利用者は、本サイトが保有する自身の情報について、開示・訂正・削除等を求めることができます。下記のお問い合わせ先までご連絡ください。ただし、ブラウザ内に保存された情報は運営者が直接削除できないため、利用者ご自身でブラウザのデータを削除してください。',
 ],
 },
 {
 title: '10. ポリシーの変更',
 body: [
  '本ポリシーは、法令の改正やサービス内容の変更に応じて改定することがあります。重要な変更がある場合は、本サイト上でお知らせします。',
 ],
 },
 {
 title: '11. お問い合わせ',
 body: [
  '本サイトに関するお問い合わせは、運営者のX（旧Twitter）アカウント（@zatsudan_gacha）までお願いします。',
 ],
 },
];

export default function PrivacyPage() {
 return (
 <main className="paper-page min-h-screen text-[var(--ink)]">
  <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">
  <div className="flex justify-end">
   <ThemeToggleButton />
  </div>

  <nav aria-label="パンくずリスト" className="text-xs text-[var(--ink-soft)] mb-5">
   <ol className="flex flex-wrap items-center gap-1.5">
   <li><Link href="/" className="hover:text-[var(--accent)] hover:underline">雑談テーマガチャ</Link></li>
   <li aria-hidden="true">/</li>
   <li aria-current="page">プライバシーポリシー</li>
   </ol>
  </nav>

  <header className="mb-8">
   <p className="paper-kicker mb-2">PRIVACY</p>
   <h1 className="font-editorial text-3xl sm:text-4xl text-[var(--ink)] mb-3">
   プライバシーポリシー
   </h1>
   <p className="text-sm text-[var(--ink-soft)]">
   制定日: 2026年10月31日
   </p>
  </header>

  <div className="space-y-6">
   {sections.map((section) => (
   <section key={section.title} className="bg-[var(--paper-strong)] rounded-none border border-[var(--line)] p-5 sm:p-6">
    <h2 className="text-lg font-bold text-[var(--ink)] mb-3">{section.title}</h2>
    <div className="space-y-2.5 text-sm text-[var(--ink-soft)] leading-relaxed">
    {section.body.map((paragraph) => (
     <p key={paragraph}>{paragraph}</p>
    ))}
    </div>
   </section>
   ))}
  </div>

  <div className="mt-8 p-5 bg-[var(--paper-strong)] rounded-none border border-[var(--line)]">
   <p className="text-sm font-semibold mb-3">Cookieの同意状態を変更する</p>
   <ConsentSettingsButton />
  </div>

  <div className="mt-8 text-center">
   <Link href="/" className="text-sm font-bold text-[var(--accent)] hover:underline">
   トップページに戻る
   </Link>
  </div>
  </div>
 </main>
 );
}
