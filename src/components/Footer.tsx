import Link from 'next/link';
import { themeCategories } from '@/lib/themeCategories';
import { SITE_COUNTS } from '@/lib/siteCounts';

interface FooterLink {
  label: string;
  href: string;
  note: string;
}

const gameLinks: FooterLink[] = [
  { label: 'ゲーム一覧', href: '/games', note: `全${SITE_COUNTS.games}作品` },
  { label: '社畜ゲーム', href: '/games#game-list-heading', note: '10作品' },
  { label: 'パーティーゲーム', href: '/games#party-games', note: `${SITE_COUNTS.partyGames}作品` },
  { label: 'シミュレーションゲーム', href: '/games#simulation-games', note: `${SITE_COUNTS.simulationGames}作品` },
  { label: '定時退社カタパルト', href: '/shachiku-catapult', note: '飛距離アクション' },
  { label: '社畜ワイヤー疾走', href: '/shachiku-wire', note: 'スイングアクション' },
  { label: 'マイホーム完済記', href: '/mortgage-life', note: '家計シミュレーション' },
];

const toolLinks: FooterLink[] = [
  { label: 'ツール一覧', href: '/tools', note: `全${SITE_COUNTS.tools}ツール` },
  { label: '実用ツール', href: '/tools#utility-tools', note: '10種類' },
  { label: '住まい・お金', href: '/tools#finance-tools', note: '10種類' },
  { label: '統計・データ分析', href: '/tools#stats-tools', note: `${SITE_COUNTS.statisticsTools}種類` },
  { label: '回帰・時系列', href: '/tools#regression-stats', note: `${SITE_COUNTS.regressionStatsTools}種類` },
  { label: '多変量・検定', href: '/tools#multivariate-stats', note: `${SITE_COUNTS.multivariateStatsTools}種類` },
  { label: '地図・距離・時差', href: '/tools#map-tools', note: `${SITE_COUNTS.mapTools}種類` },
  { label: '都道府県ランキング', href: '/prefecture-ranking', note: '47都道府県' },
  { label: '主要都市間距離', href: '/city-distance', note: '簡易マップ' },
  { label: '世界時差クロック', href: '/world-timezone', note: '主要都市' },
];

const readLinks: FooterLink[] = [
  { label: 'シーン別ガイド', href: '/guides', note: '会議・1on1・飲み会' },
  { label: 'アイスブレイク30選', href: '/icebreak', note: '会議のお題' },
  { label: 'お題カテゴリ一覧', href: '/themes', note: `${themeCategories.length}カテゴリ` },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title}>
      <div className="flex items-end justify-between border-b border-[var(--line)] pb-2">
        <h3 className="font-label text-[10px] text-[var(--ink-soft)]">{title}</h3>
        <span className="font-label text-[9px] text-[var(--ink-soft)]">Index</span>
      </div>
      <ul className="mt-2">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
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

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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
              <Link href="/games" className="paper-button px-4 py-2 text-xs">ゲーム一覧</Link>
              <Link href="/tools" className="paper-button px-4 py-2 text-xs">ツール一覧</Link>
            </div>
            <p className="mt-6 text-xs text-[var(--ink-soft)]">
              © {new Date().getFullYear()} 雑談テーマガチャ
            </p>
          </div>

          <div className="grid gap-7 sm:grid-cols-3">
            <FooterColumn title="遊ぶ" links={gameLinks} />
            <FooterColumn title="使う" links={toolLinks} />
            <FooterColumn title="読む・調べる" links={readLinks} />
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="サイト情報" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-soft)]">
            <Link href="/" className="hover:text-[var(--accent)]">トップ</Link>
            <Link href="/about" className="hover:text-[var(--accent)]">運営者情報</Link>
            <Link href="/privacy" className="hover:text-[var(--accent)]">プライバシーポリシー</Link>
            <Link href="/sitemap.xml" className="hover:text-[var(--accent)]">XMLサイトマップ</Link>
          </nav>
          <p className="font-label text-[9px] text-[var(--ink-soft)]">Free / No sign-up / PC &amp; Mobile</p>
        </div>
      </div>
    </footer>
  );
}
