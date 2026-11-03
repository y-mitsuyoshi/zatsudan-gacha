"use client";

import React, { useEffect } from 'react';
import { BoardSquare, Effect, EventCardData, SquareType } from '@/types/sugoroku';
import { HankoStamp, SquareTypeIcon } from './SugorokuIcons';

const TYPE_META: Record<
  SquareType,
  { label: string; headerBg: string; stampText: string; stampVariant: 'red' | 'teal' | 'gold' }
> = {
  start: {
    label: '出社ゲート',
    headerBg: 'bg-gradient-to-r from-[#1f6f5c] to-[#154d3f] text-white',
    stampText: '出社',
    stampVariant: 'teal',
  },
  goal: {
    label: '決算ボーナス支給日',
    headerBg: 'bg-gradient-to-r from-[#b57c1e] via-[#d49b35] to-[#9c6712] text-[#12100d]',
    stampText: '完走',
    stampVariant: 'gold',
  },
  salary: {
    label: '給与・賞与支給',
    headerBg: 'bg-gradient-to-r from-[#b57c1e] to-[#8f5f10] text-white',
    stampText: '支給',
    stampVariant: 'gold',
  },
  item: {
    label: '備品・アイテム獲得',
    headerBg: 'bg-gradient-to-r from-[#2d7a4f] to-[#1e5436] text-white',
    stampText: '支給',
    stampVariant: 'teal',
  },
  'job-specific': {
    label: '職種特化イベント',
    headerBg: 'bg-gradient-to-r from-[#5b3884] to-[#3f255e] text-white',
    stampText: '専門',
    stampVariant: 'gold',
  },
  chance: {
    label: '運命抽選イベント',
    headerBg: 'bg-gradient-to-r from-[#c96a22] to-[#964b12] text-white',
    stampText: '抽選',
    stampVariant: 'gold',
  },
  decision: {
    label: '決断結果通知',
    headerBg: 'bg-gradient-to-r from-[#1d5e96] to-[#134069] text-white',
    stampText: '決裁',
    stampVariant: 'teal',
  },
  event: {
    label: '業務イベント',
    headerBg: 'bg-gradient-to-r from-[#9e2f20] to-[#6e1e13] text-white',
    stampText: '通達',
    stampVariant: 'red',
  },
  normal: {
    label: '日常・リフレッシュ',
    headerBg: 'bg-gradient-to-r from-[#5c5141] to-[#3d352a] text-white',
    stampText: '確認',
    stampVariant: 'teal',
  },
};

interface EventCardProps {
  card?: EventCardData;
  square?: BoardSquare;
  message?: string;
  remainingCount?: number;
  onContinue: () => void;
}

function renderEffectBadges(effect?: Effect) {
  if (!effect) return null;
  const badges: { label: string; val: string; positive: boolean }[] = [];

  if (typeof effect.yaruki === 'number' && effect.yaruki !== 0) {
    badges.push({
      label: 'やる気',
      val: `${effect.yaruki > 0 ? '+' : ''}${effect.yaruki}`,
      positive: effect.yaruki > 0,
    });
  }
  if (typeof effect.career === 'number' && effect.career !== 0) {
    badges.push({
      label: '社内評価',
      val: `${effect.career > 0 ? '+' : ''}${effect.career}pt`,
      positive: effect.career > 0,
    });
  }
  if (typeof effect.money === 'number' && effect.money !== 0) {
    badges.push({
      label: '貯金',
      val: `${effect.money > 0 ? '+' : ''}${effect.money}万円`,
      positive: effect.money > 0,
    });
  }
  if (typeof effect.move === 'number' && effect.move !== 0) {
    badges.push({
      label: '盤面移動',
      val: effect.move > 0 ? `${effect.move}マス前進` : `${Math.abs(effect.move)}マス後退`,
      positive: effect.move > 0,
    });
  }
  if (typeof effect.rest === 'number' && effect.rest > 0) {
    badges.push({
      label: '休養発生',
      val: `${effect.rest}ターン休み`,
      positive: false,
    });
  }
  if (effect.slow) {
    badges.push({
      label: '二日酔い',
      val: '次ターン1マス固定',
      positive: false,
    });
  }
  if (effect.item) {
    badges.push({
      label: '支給品獲得',
      val: effect.item === 'energy-drink' ? 'エナドリ' : effect.item === 'paid-leave' ? '有給休暇届' : '根回し資料',
      positive: true,
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="ステータス変動">
      {badges.map((b, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1 text-xs font-black shadow-xs ${
            b.positive
              ? 'border-[#1f6f5c] bg-[#e6f5f0] text-[#144d3f] dark:bg-[#14332b] dark:text-[#84dfb0]'
              : 'border-[#b23a2a] bg-[#fbede9] text-[#8f2416] dark:bg-[#361714] dark:text-[#f7a89c]'
          }`}
        >
          <span className="opacity-80">{b.label}</span>
          <span className="font-mono text-sm">{b.val}</span>
        </span>
      ))}
    </div>
  );
}

export function EventCard({
  card,
  square,
  message,
  remainingCount = 1,
  onContinue,
}: EventCardProps) {
  const sqType: SquareType = card?.squareType ?? square?.type ?? 'event';
  const meta = TYPE_META[sqType] ?? TYPE_META.event;
  const title = card?.title ?? square?.title ?? 'イベント発生';
  const bodyText = card?.text ?? message ?? square?.description ?? '';
  const pos = card?.squarePosition ?? square?.position ?? 0;
  const effect = card?.effect ?? square?.outcome?.effect;

  const isPromotion = card?.kind === 'promotion';
  const isBurnout = card?.kind === 'burnout' || card?.kind === 'gameover';
  const headerClass = isPromotion
    ? 'bg-gradient-to-r from-[#b57c1e] via-[#d89e32] to-[#8f5f10] text-white'
    : isBurnout
      ? 'bg-gradient-to-r from-[#781d14] to-[#4a100a] text-white'
      : meta.headerBg;

  const stampLabel = isPromotion
    ? '昇進'
    : isBurnout
      ? '休養'
      : card?.tone === 'good'
        ? '好調'
        : meta.stampText;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onContinue]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#12100d]/75 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-card-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#261e14] bg-[#fffaf0] text-[#12100d] shadow-[0_12px_0_#12100d,0_20px_40px_rgba(0,0,0,0.5)] animate-[zoom-in_0.2s_ease-out_1] dark:border-[#6e5a3e] dark:bg-[#221d17] dark:text-[#fffaf0]">
        {/* カード上部ヘッダー */}
        <div className={`relative px-5 py-4 ${headerClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-black/25">
                  <SquareTypeIcon type={sqType} size={15} />
                </span>
                <span className="font-mono text-[10px] font-black tracking-widest uppercase opacity-90">
                  {isPromotion ? 'PROMOTION GATE' : isBurnout ? 'MENTAL ALERT' : meta.label} / #{String(pos).padStart(2, '0')}
                </span>
              </div>
              <h2 id="event-card-title" className="font-editorial mt-1.5 text-xl font-black leading-snug sm:text-2xl">
                {title}
              </h2>
            </div>

            <HankoStamp
              text={stampLabel}
              variant={isPromotion || card?.tone === 'good' ? 'gold' : isBurnout || card?.tone === 'bad' ? 'red' : meta.stampVariant}
              className="bg-white/90 shadow-md"
            />
          </div>
        </div>

        {/* カード本文とステータス増減ポップ */}
        <div className="space-y-4 p-5">
          {square?.description && card && square.description !== bodyText && (
            <p className="text-xs font-bold leading-relaxed text-[#6e6250] dark:text-[#b5a790]">
              {square.description}
            </p>
          )}

          <div
            className="rounded-xl border-2 border-[#d8c7a6] bg-[#f7efe0] p-4 text-sm font-bold leading-relaxed text-[#12100d] whitespace-pre-line dark:border-[#4a3f30] dark:bg-[#181410] dark:text-[#fffaf0]"
            aria-live="polite"
          >
            {bodyText}
          </div>

          {renderEffectBadges(effect)}

          <div className="pt-1">
            <button
              type="button"
              onClick={onContinue}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#12100d] border-b-[5px] bg-[#1f6f5c] px-5 py-3 text-base font-black text-white shadow-sm transition hover:bg-[#185949] active:translate-y-0.5"
            >
              <span>
                {card?.kind === 'goal' || card?.kind === 'gameover'
                  ? '最終査定リザルトへ進む'
                  : remainingCount > 1
                    ? `確認して次へ（残り${remainingCount - 1}件）`
                    : '確認して盤面へ戻る'}
              </span>
              <span className="font-mono text-xs opacity-80">[Enter]</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
