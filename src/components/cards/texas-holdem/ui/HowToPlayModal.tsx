'use client';

import React from 'react';
import { ModalShell, SUB_LABEL, stagger } from './OutGameKit';

export interface HowToPlayModalProps {
  open: boolean;
  onClose(): void;
}

type Mini = string; // e.g. "A♠", "10♥"

const RED = new Set(['♥', '♦']);

/** Tiny playing card used for the rules explanation. */
export function MiniCard({ card, dim = false }: { card: Mini; dim?: boolean }) {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  const red = RED.has(suit);
  return (
    <span
      className={`relative inline-flex h-[38px] w-[27px] shrink-0 flex-col items-center justify-center rounded-[4px] border border-slate-300 bg-gradient-to-b from-white to-slate-100 leading-none shadow-[0_2px_4px_rgba(0,0,0,0.5)] sm:h-[44px] sm:w-[31px] ${
        dim ? 'opacity-35' : ''
      }`}
      aria-hidden
    >
      <span className={`text-[11px] font-black sm:text-[13px] ${red ? 'text-rose-600' : 'text-slate-900'}`}>{rank}</span>
      <span className={`text-[12px] sm:text-[14px] ${red ? 'text-rose-600' : 'text-slate-900'}`}>{suit}</span>
    </span>
  );
}

const HANDS: { name: string; en: string; cards: Mini[]; used: number; desc: string }[] = [
  { name: 'ロイヤルフラッシュ', en: 'ROYAL FLUSH', cards: ['A♠', 'K♠', 'Q♠', 'J♠', '10♠'], used: 5, desc: '同じスートのA・K・Q・J・10' },
  { name: 'ストレートフラッシュ', en: 'STRAIGHT FLUSH', cards: ['9♥', '8♥', '7♥', '6♥', '5♥'], used: 5, desc: '同じスートで5枚連続' },
  { name: 'フォーカード', en: 'FOUR OF A KIND', cards: ['Q♣', 'Q♦', 'Q♥', 'Q♠', '3♦'], used: 4, desc: '同じ数字が4枚' },
  { name: 'フルハウス', en: 'FULL HOUSE', cards: ['K♠', 'K♥', 'K♦', '7♣', '7♠'], used: 5, desc: 'スリーカード＋ワンペア' },
  { name: 'フラッシュ', en: 'FLUSH', cards: ['A♦', 'J♦', '8♦', '6♦', '2♦'], used: 5, desc: '同じスートが5枚' },
  { name: 'ストレート', en: 'STRAIGHT', cards: ['10♣', '9♦', '8♠', '7♥', '6♣'], used: 5, desc: '数字が5枚連続（A-2-3-4-5も可）' },
  { name: 'スリーカード', en: 'THREE OF A KIND', cards: ['8♠', '8♥', '8♣', 'K♦', '4♠'], used: 3, desc: '同じ数字が3枚' },
  { name: 'ツーペア', en: 'TWO PAIR', cards: ['J♥', 'J♣', '4♠', '4♦', 'A♣'], used: 4, desc: 'ペアが2組' },
  { name: 'ワンペア', en: 'ONE PAIR', cards: ['10♥', '10♠', 'K♣', '7♦', '3♥'], used: 2, desc: '同じ数字が2枚' },
  { name: 'ハイカード', en: 'HIGH CARD', cards: ['A♣', 'Q♦', '9♠', '6♥', '2♣'], used: 1, desc: '役なし。一番強いカードで比較' },
];

const STEPS: { t: string; en: string; d: string }[] = [
  { t: 'プリフロップ', en: 'PRE-FLOP', d: '全員に手札（ホールカード）が2枚ずつ配られ、最初のベットラウンド。SB・BBが強制ベットを置きます。' },
  { t: 'フロップ', en: 'FLOP', d: '場に共通カード（ボード）が3枚開かれ、2回目のベットラウンド。' },
  { t: 'ターン', en: 'TURN', d: '4枚目のボードが開かれ、3回目のベットラウンド。' },
  { t: 'リバー', en: 'RIVER', d: '5枚目のボードが開かれ、最後のベットラウンド。' },
  { t: 'ショーダウン', en: 'SHOWDOWN', d: '残った全員が手札を公開。手札2枚＋ボード5枚の計7枚から最強の5枚で役を作り、一番強い人がポットを獲得！' },
];

const ACTIONS: { t: string; d: string }[] = [
  { t: 'チェック', d: 'ベットせずに次へ回す（誰もベットしていない時）' },
  { t: 'ベット / レイズ', d: 'チップを賭ける / 前のベットより上乗せする' },
  { t: 'コール', d: '前のベットと同額を出して勝負を続ける' },
  { t: 'フォールド', d: '手札を捨てて、このハンドから降りる' },
  { t: 'オールイン', d: '持っているチップをすべて賭ける' },
];

/** "遊び方" — Texas Hold'em basics and hand rankings with mini card visuals. */
export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} title="遊び方" titleEn="HOW TO PLAY" maxWidth="max-w-2xl" tall>
      <div className="space-y-6 px-4 py-5 sm:px-6">
        <section style={stagger(0)}>
          <p className={SUB_LABEL}>TEXAS HOLD&apos;EM</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">
            テキサスホールデムは、自分だけの手札<strong className="text-amber-200">2枚</strong>と、全員共通の場札
            <strong className="text-amber-200">5枚</strong>を組み合わせて、最も強い5枚の役を作るポーカーです。
            相手を全員降ろすか、ショーダウンで一番強い役を見せればポット（賭けられたチップ）を獲得できます。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/20 bg-emerald-950/50 p-3">
            <div>
              <p className="mb-1 text-[10px] font-bold text-amber-200/80">あなたの手札</p>
              <div className="flex gap-1">
                <MiniCard card="A♥" />
                <MiniCard card="K♥" />
              </div>
            </div>
            <span className="text-lg font-black text-amber-300">＋</span>
            <div>
              <p className="mb-1 text-[10px] font-bold text-amber-200/80">ボード（共通）</p>
              <div className="flex gap-1">
                <MiniCard card="Q♥" />
                <MiniCard card="J♥" />
                <MiniCard card="10♥" />
                <MiniCard card="4♣" dim />
                <MiniCard card="2♠" dim />
              </div>
            </div>
            <span className="text-lg font-black text-amber-300">＝</span>
            <span className="rounded-lg bg-gradient-to-b from-amber-200 to-amber-500 px-2 py-1 text-xs font-black text-slate-950">ロイヤルフラッシュ！</span>
          </div>
        </section>

        <section>
          <p className={`${SUB_LABEL} mb-2`}>GAME FLOW</p>
          <ol className="space-y-2">
            {STEPS.map((s, i) => (
              <li key={s.en} className="flex gap-3 rounded-xl border border-white/5 bg-black/30 p-2.5" style={stagger(i, 120)}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-b from-amber-200 to-amber-600 text-xs font-black text-slate-950">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-amber-50">
                    {s.t} <span className="ml-1 text-[9px] tracking-[0.25em] text-amber-200/50">{s.en}</span>
                  </p>
                  <p className="text-xs leading-relaxed text-slate-300">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <p className={`${SUB_LABEL} mb-2`}>ACTIONS</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {ACTIONS.map((a) => (
              <div key={a.t} className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
                <p className="text-sm font-black text-amber-200">{a.t}</p>
                <p className="text-[11px] text-slate-300">{a.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className={`${SUB_LABEL} mb-2`}>HAND RANKINGS（強い順）</p>
          <ol className="space-y-1.5">
            {HANDS.map((h, i) => (
              <li
                key={h.en}
                className="flex items-center gap-2 rounded-xl border border-amber-300/10 bg-gradient-to-r from-slate-900/80 to-black/40 px-2.5 py-2 sm:gap-3"
              >
                <span className={`w-5 shrink-0 text-center text-sm font-black ${i < 3 ? 'text-amber-300' : 'text-slate-500'}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black text-amber-50">{h.name}</p>
                  <p className="truncate text-[10px] text-slate-400">{h.desc}</p>
                </div>
                <div className="flex shrink-0 gap-0.5" aria-label={h.cards.join(' ')}>
                  {h.cards.map((c, ci) => (
                    <MiniCard key={c} card={c} dim={ci >= h.used} />
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[11px] text-slate-400">
            同じ役どうしは、役を構成するカードの数字が大きい方が勝ち。それでも同じならキッカー（残りのカード）で比べ、完全に同じならポットを分け合います。
          </p>
        </section>
      </div>
    </ModalShell>
  );
}
