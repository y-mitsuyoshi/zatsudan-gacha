"use client";

import Link from 'next/link';

const gameLinks = [
  { label: '無料ゲーム一覧', href: '/games', note: '全16作品' },
  { label: '社畜すごろくNEO', href: '/shachiku-sugoroku', note: 'キャリアボード' },
  { label: '社畜人狼', href: '/shachiku-jinro', note: 'ソロ人狼' },
  { label: '定時退社カタパルト', href: '/shachiku-catapult', note: '飛距離アクション' },
  { label: '社畜ワイヤー疾走', href: '/shachiku-wire', note: 'スイングアクション' },
  { label: 'パーティーゲーム', href: '/games#party-games', note: 'みんなで遊ぶ' },
];

const toolLinks = [
  { label: '無料ツール一覧', href: '/tools', note: '全24ツール' },
  { label: '文字数カウンター', href: '/character-counter', note: 'テキスト計測' },
  { label: '画像リサイズ・圧縮', href: '/image-resizer', note: '画像を軽量化' },
  { label: '住宅ローン計算', href: '/housing-loan-calculator', note: '返済を試算' },
  { label: '賃貸vs購入', href: '/rent-vs-buy', note: '住まいを比較' },
  { label: '複利・積立', href: '/compound-interest-calculator', note: '資産形成' },
];

const guideLinks = [
  { label: 'シーン別ガイド', href: '/guides', note: '会議・1on1・飲み会' },
  { label: '会議のアイスブレイク', href: '/icebreak', note: 'お題30選' },
  { label: 'お題カテゴリ一覧', href: '/themes', note: '25カテゴリ' },
  { label: '運営者情報', href: '/about', note: 'サイトについて' },
  { label: 'プライバシーポリシー', href: '/privacy', note: '情報の取り扱い' },
  { label: 'サイトマップ', href: '/sitemap.xml', note: '全ページ一覧' },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string; note: string }[] }) {
  return (
    <nav aria-label={title}>
      <div className="flex items-end justify-between border-b border-[var(--line)] pb-2">
        <h3 className="font-label text-[10px] text-[var(--ink-soft)]">{title}</h3>
        <span className="font-label text-[9px] text-[var(--ink-soft)]">Index</span>
      </div>
      <ul className="mt-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex items-baseline justify-between gap-3 border-b border-dashed border-[var(--line)] py-2 text-sm transition-colors hover:text-[var(--accent)]"
            >
              <span className="font-bold">{link.label}</span>
              <span className="shrink-0 text-[10px] text-[var(--ink-soft)]">{link.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.6fr] lg:gap-14">
          <div>
            <p className="paper-kicker">Zatsudan Theme Gacha</p>
            <h2 className="font-editorial mt-2 text-2xl sm:text-3xl">雑談テーマガチャ</h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--ink-soft)]">
              会議のアイスブレイク、1on1、リモートワークの雑談に。
              お題・ガイド・ゲーム・ツールを、ひとつの場所にまとめています。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/#gacha" className="paper-button-primary px-4 py-2 text-xs">ガチャを回す</Link>
              <Link href="/games" className="paper-button px-4 py-2 text-xs">ゲームで遊ぶ</Link>
              <Link href="/tools" className="paper-button px-4 py-2 text-xs">ツールを使う</Link>
            </div>
            <p className="mt-6 text-xs text-[var(--ink-soft)]">© 2026 雑談テーマガチャ</p>
          </div>

          <div className="grid gap-7 sm:grid-cols-3">
            <FooterColumn title="遊ぶ" links={gameLinks} />
            <FooterColumn title="使う" links={toolLinks} />
            <FooterColumn title="読む・調べる" links={guideLinks} />
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="フッター補助ナビゲーション" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-soft)]">
            <Link href="/" className="hover:text-[var(--accent)]">トップ</Link>
            <Link href="/themes" className="hover:text-[var(--accent)]">お題カテゴリ</Link>
            <Link href="/guides" className="hover:text-[var(--accent)]">シーン別ガイド</Link>
            <Link href="/about" className="hover:text-[var(--accent)]">運営者情報</Link>
            <Link href="/privacy" className="hover:text-[var(--accent)]">プライバシー</Link>
          </nav>
          <p className="font-label text-[9px] text-[var(--ink-soft)]">Free / No sign-up / PC & Mobile</p>
        </div>
      </div>
    </footer>
  );
};
