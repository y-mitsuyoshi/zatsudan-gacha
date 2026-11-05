"use client";

import Link from 'next/link';

const services = [
  { title: '雑談テーマガチャ', href: '/', note: '会話のきっかけを抽選' },
  { title: 'シーン別ガイド', href: '/guides', note: '会議・1on1・飲み会' },
  { title: '無料ゲーム一覧', href: '/games', note: '社畜ゲームを遊ぶ' },
  { title: '無料ツール一覧', href: '/tools', note: 'プロフィール・駅名標' },
  { title: '社畜通勤サバイバー', href: '/barricade-defense', note: '満員ラッシュ突破' },
  { title: '社畜サバイバー', href: '/shachiku-survivor', note: '18時まで生き残る' },
  { title: '社畜スパイラル', href: '/shachiku-spiral', note: '渦巻く業務を迎撃' },
  { title: '社畜シューティングNEO', href: '/shachiku-shooting', note: '定時退社の弾幕STG' },
  { title: '社畜すごろくNEO', href: '/shachiku-sugoroku', note: 'キャリアボードゲーム' },
  { title: '社畜人狼', href: '/shachiku-jinro', note: '会社員ソロ人狼' },
  { title: '定時退社カタパルト', href: '/shachiku-catapult', note: 'ぶっとばし飛距離ゲーム' },
  { title: '社畜ワイヤー疾走', href: '/shachiku-wire', note: '終電スイングアクション' },
  { title: '社畜グラグラ決済タワー', href: '/shachiku-stack', note: '限界ビル建設ゲーム' },
  { title: 'マイホーム完済記', href: '/mortgage-life', note: '35年・50年ローン家計記' },
  { title: '究極の言い訳ジェネレーター', href: '/excuse-generator', note: '言い逃れ文を作成' },
  { title: '駅名標メーカー', href: '/station-sign-maker', note: 'オリジナル駅名標' },
  { title: '少数派ワード', href: '/minority-word', note: '少数派の言葉を見抜く' },
  { title: '以心伝心ゲーム', href: '/ishin-denshin', note: '同じ答えを狙う' },
  { title: 'NGワード会議', href: '/ng-word', note: '禁句を言わず会議' },
  { title: '禁句トーク', href: '/kinku-talk', note: '禁句なしで説明' },
  { title: '社長の頭の中', href: '/rank-guess', note: 'ランキング予想' },
  { title: '連想リレー', href: '/word-chain', note: '言葉をつなぐ' },
];

const siteLinks = [
  { label: '無料ゲーム一覧', href: '/games' },
  { label: '無料ツール一覧', href: '/tools' },
  { label: '文字数カウンター', href: '/character-counter' },
  { label: 'JSON整形', href: '/json-formatter' },
  { label: '画像圧縮', href: '/image-resizer' },
  { label: 'パスワード生成', href: '/password-generator' },
  { label: '単位変換', href: '/unit-converter' },
  { label: 'BMI計算', href: '/bmi-calculator' },
  { label: '住宅ローン計算', href: '/housing-loan-calculator' },
  { label: '住宅購入費用', href: '/home-purchase-cost' },
  { label: '賃貸vs購入', href: '/rent-vs-buy' },
  { label: '固定資産税計算', href: '/property-tax-calculator' },
  { label: '坪単価計算', href: '/tsubo-converter' },
  { label: '複利計算', href: '/compound-interest-calculator' },
  { label: 'シーン別ガイド', href: '/guides' },
  { label: '会議のアイスブレイク', href: '/icebreak' },
  { label: 'お題カテゴリ一覧', href: '/themes' },
  { label: 'よくある質問', href: '/#faq' },
  { label: '運営者情報', href: '/about' },
  { label: 'プライバシーポリシー', href: '/privacy' },
  { label: 'サイトマップ', href: '/sitemap.xml' },
];

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.5fr]">
          <div>
            <p className="paper-kicker">ZATSUDAN THEME GACHA</p>
            <h2 className="font-editorial mt-2 text-2xl sm:text-3xl">雑談テーマガチャ</h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--ink-soft)]">
              会議のアイスブレイク、1on1、リモートワークの雑談に。
              お題・ガイド・ゲーム・ツールを、ひとつの場所にまとめています。
            </p>
            <p className="mt-5 text-xs text-[var(--ink-soft)]">
              © 2026 雑談テーマガチャ
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-end justify-between border-b border-[var(--line)] pb-2">
              <h3 className="font-label text-xs text-[var(--ink-soft)]">Contents</h3>
              <span className="font-label text-[10px] text-[var(--ink-soft)]">{services.length} entries</span>
            </div>
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {services.map((service, index) => (
                <Link
                  key={service.href}
                  href={service.href}
                  className="group flex items-baseline gap-3 border-b border-dashed border-[var(--line)] py-2 text-sm transition-colors hover:text-[var(--accent)]"
                >
                  <span className="font-label w-5 shrink-0 text-[10px] text-[var(--ink-soft)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-5">{service.title}</span>
                    <span className="block text-[11px] text-[var(--ink-soft)]">{service.note}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="フッターナビゲーション" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--ink-soft)]">
            {siteLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-[var(--accent)]">
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="font-label text-[10px] text-[var(--ink-soft)]">Made for better small talk.</p>
        </div>
      </div>
    </footer>
  );
};
