import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { guides } from '@/lib/guideData';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
 title: 'シーン別・雑談お題ガイド｜会議・1on1・飲み会・リモートワーク',
 description: '会議のアイスブレイク、1on1、リモートワーク、飲み会、会話が続かないときなど、シーン別に使える雑談お題ガイドをまとめました。質問例と会話を広げるコツを紹介します。',
 keywords: [
 '雑談 ガイド',
 'アイスブレイク 質問',
 '会議 雑談 ネタ',
 '1on1 質問',
 'リモートワーク 雑談',
 '飲み会 話題',
 'チームビルディング',
 ],
 alternates: {
 canonical: '/guides',
 },
 openGraph: {
 title: 'シーン別・雑談お題ガイド',
 description: '会議・1on1・飲み会・リモートワークなど、シーン別に使える雑談お題ガイド。',
 url: `${APP_URL}/guides`,
 siteName: '雑談テーマガチャ',
 locale: 'ja_JP',
 type: 'website',
 images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: 'シーン別・雑談お題ガイド' }],
 },
 twitter: {
 card: 'summary_large_image',
 title: 'シーン別・雑談お題ガイド',
 description: '会議・1on1・飲み会・リモートワークなど、シーン別に使える雑談お題ガイド。',
 images: [`${APP_URL}/ogp.png`],
 },
};

const guideCards = [
 ...guides.map((guide) => ({
 slug: guide.slug,
 href: `/guides/${guide.slug}`,
 emoji: guide.emoji,
 title: guide.h1,
 description: guide.description,
 })),
 {
 slug: 'icebreak',
 href: '/icebreak',
 emoji: '🗣️',
 title: '会議のアイスブレイクにおすすめの雑談お題30選',
 description: '会議の冒頭で使えるアイスブレイクのお題を30個厳選。初対面・チーム・1on1向けの質問例を紹介します。',
 },
];

const faqs = [
 { q: 'シーン別ガイドは無料で読めますか？', a: 'はい。すべて無料で読めます。ガチャやお題一覧も無料で利用できます。' },
 { q: '会議のアイスブレイクにはどのガイドがおすすめですか？', a: '「会議のアイスブレイクお題30選」と「チームビルディングのアイスブレイク質問20選」がおすすめです。' },
 { q: '1on1で使える質問はありますか？', a: '「1on1のアイスブレイク質問20選」で、仕事の価値観や最近の変化を聞く質問を紹介しています。' },
 { q: '飲み会やオンライン飲み会でも使えますか？', a: 'はい。「飲み会で盛り上がる話題20選」をご利用ください。' },
];

const jsonLd = [
 {
 '@context': 'https://schema.org',
 '@type': 'CollectionPage',
 name: 'シーン別・雑談お題ガイド',
 description: '会議・1on1・飲み会・リモートワークなど、シーン別に使える雑談お題ガイド。',
 url: `${APP_URL}/guides`,
 inLanguage: 'ja-JP',
 mainEntity: {
  '@type': 'ItemList',
  numberOfItems: guideCards.length,
  itemListElement: guideCards.map((guide, index) => ({
  '@type': 'ListItem',
  position: index + 1,
  name: guide.title,
  url: `${APP_URL}${guide.href}`,
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
  { '@type': 'ListItem', position: 2, name: 'シーン別ガイド', item: `${APP_URL}/guides` },
 ],
 },
];

export default function GuidesPage() {
 return (
 <main className="paper-page min-h-screen text-[var(--ink)]">
  <JsonLd data={jsonLd} />
  <div className="mx-auto max-w-5xl px-4 pt-5">
  <div className="flex justify-end">
   <ThemeToggleButton />
  </div>
  <nav aria-label="パンくずリスト" className="mb-5 text-xs text-[var(--ink-soft)]">
   <ol className="flex items-center gap-1.5">
   <li><Link href="/" className="hover:underline">雑談テーマガチャ</Link></li>
   <li aria-hidden="true">/</li>
   <li aria-current="page">シーン別ガイド</li>
   </ol>
  </nav>
  <header className="mb-8 max-w-3xl">
   <p className="paper-kicker">SCENE GUIDE</p>
   <h1 className="mt-2 text-3xl font-black text-[var(--ink)] sm:text-4xl">
   シーン別・雑談お題ガイド
   </h1>
   <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)] sm:text-base">
   会議の冒頭、1on1、リモートワーク、飲み会、会話が続かないとき。シーンに合わせて使える質問例と、会話を広げるコツをまとめました。
   </p>
  </header>
  </div>

  <SeoContentSection
  eyebrow="GUIDE LIBRARY"
  title="目的から探す雑談お題ガイド"
  intro="気になるシーンを選んでください。各ガイドから、そのまま使える質問をコピーできます。"
  faqs={faqs}
  related={[
   { href: '/themes', label: '雑談お題カテゴリ一覧', description: '25カテゴリから探す' },
   { href: '/', label: '雑談テーマガチャ', description: 'ランダムにお題を抽選する' },
  ]}
  >
  <div className="grid gap-4 sm:grid-cols-2">
   {guideCards.map((guide) => (
   <Link
    key={guide.href}
    href={guide.href}
    className="group rounded-none border border-[var(--line)] bg-[var(--paper-strong)] p-5 transition hover:-translate-y-1 hover:border-[var(--accent)] "
   >
    <span className="font-label text-[9px] text-[var(--accent)]">Guide</span>
    <h3 className="mt-2 text-base font-black text-[var(--ink)]">{guide.title}</h3>
    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">{guide.description}</p>
    <span className="mt-3 inline-flex text-xs font-bold text-[var(--accent)]">ガイドを読む →</span>
   </Link>
   ))}
  </div>
  </SeoContentSection>
 </main>
 );
}
