"use client";

import React from 'react';
import { Effect, GameDecision, GameDecisionOption } from '@/types/sugoroku';
import { LIFE_ASSETS } from '@/lib/sugoroku-logic';
import { HankoStamp, SquareTypeIcon } from './SugorokuIcons';

interface DecisionCardProps {
  decision: GameDecision;
  onChoose: (optionId: string) => void;
}

function renderOptionEffects(effect: Effect) {
  const chips: { label: string; value: string; positive: boolean }[] = [];
  if (effect.asset && LIFE_ASSETS[effect.asset]) {
    const asset = LIFE_ASSETS[effect.asset];
    chips.push({
      label: '資産カード',
      value: `${asset.name}（${asset.value}万）`,
      positive: true,
    });
  }
  if (typeof effect.career === 'number' && effect.career !== 0) {
    chips.push({
      label: '評価',
      value: `${effect.career > 0 ? '+' : ''}${effect.career}pt`,
      positive: effect.career > 0,
    });
  }
  if (typeof effect.yaruki === 'number' && effect.yaruki !== 0) {
    chips.push({
      label: 'やる気',
      value: `${effect.yaruki > 0 ? '+' : ''}${effect.yaruki}`,
      positive: effect.yaruki > 0,
    });
  }
  if (typeof effect.money === 'number' && effect.money !== 0) {
    chips.push({
      label: '資金',
      value: `${effect.money > 0 ? '+' : ''}${effect.money}万円`,
      positive: effect.money > 0,
    });
  }
  if (typeof effect.move === 'number' && effect.move !== 0) {
    chips.push({
      label: '移動',
      value: effect.move > 0 ? `+${effect.move}マス` : `${effect.move}マス`,
      positive: effect.move > 0,
    });
  }
  if (typeof effect.rest === 'number' && effect.rest > 0) {
    chips.push({
      label: '休み',
      value: `${effect.rest}回`,
      positive: false,
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, idx) => (
        <span
          key={idx}
          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-black ${
            c.positive
              ? 'border-[#1f6f5c] bg-[#e6f5f0] text-[#144d3f] dark:bg-[#14332b] dark:text-[#84dfb0]'
              : 'border-[#b23a2a] bg-[#fbede9] text-[#8f2416] dark:bg-[#361714] dark:text-[#f7a89c]'
          }`}
        >
          <span>{c.label}</span>
          <span className="font-mono">{c.value}</span>
        </span>
      ))}
    </div>
  );
}

function OptionButton({
  option,
  index,
  onChoose,
}: {
  option: GameDecisionOption;
  index: number;
  onChoose: (id: string) => void;
}) {
  const isRisky = Boolean(option.risk);

  return (
    <button
      type="button"
      onClick={() => onChoose(option.id)}
      className="group relative flex w-full flex-col gap-2 rounded-xl border-2 border-[#3b3022] border-b-[4px] bg-[#fffaf0] p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#1d5e96] hover:bg-[#f4f8fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9922e] dark:border-[#594b38] dark:bg-[#1b1712] dark:hover:border-[#63a4de] dark:hover:bg-[#1b2430]"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#12100d] bg-[#12100d] font-mono text-xs font-black text-[#f5ca5c]">
            {String.fromCharCode(65 + index)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-black text-[#12100d] sm:text-base dark:text-[#fffaf0]">
                {option.label}
              </p>
              {option.risk && (
                <span className="rounded bg-[#c96a22] px-1.5 py-0.5 font-mono text-[10px] font-black text-white">
                  勝負手 {Math.round(option.risk.chance * 100)}%成功
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs font-bold text-[#6e6250] dark:text-[#b5a790]">
              {option.flavor}
            </p>
          </div>
        </div>
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#8a7d69] bg-[#f4ece0] text-xs font-black text-[#12100d] transition group-hover:bg-[#1d5e96] group-hover:text-white dark:bg-[#2a241c] dark:text-[#fffaf0]"
          aria-hidden="true"
        >
          →
        </span>
      </div>

      <div className="pl-9">
        {renderOptionEffects(option.effect)}
        {isRisky && option.risk && (
          <p className="mt-1.5 text-[10px] font-bold text-[#9e2f20] dark:text-[#f29b8f]">
            ※失敗時：やる気{option.risk.fail.yaruki ?? 0}
            {option.risk.fail.rest ? `・${option.risk.fail.rest}回休み` : ''}
          </p>
        )}
      </div>
    </button>
  );
}

export function DecisionCard({ decision, onChoose }: DecisionCardProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#12100d]/75 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-card-title"
      aria-describedby="decision-card-description"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-[#261e14] bg-[#f4ece0] text-[#12100d] shadow-[0_12px_0_#12100d,0_22px_45px_rgba(0,0,0,0.5)] animate-[zoom-in_0.2s_ease-out_1] dark:border-[#6e5a3e] dark:bg-[#221d17] dark:text-[#fffaf0]">
        <div className="bg-gradient-to-r from-[#1d5e96] to-[#113a5e] px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-black/25">
                  <SquareTypeIcon type="decision" size={15} />
                </span>
                <span className="font-mono text-[10px] font-black tracking-widest uppercase">
                  STOP! CAREER JUNCTION / キャリア重要決断
                </span>
              </div>
              <h2 id="decision-card-title" className="font-editorial mt-1.5 text-xl font-black leading-snug sm:text-2xl">
                {decision.title}
              </h2>
            </div>
            <HankoStamp text="決裁" variant="gold" className="bg-white/95 shadow-md" />
          </div>
          <p id="decision-card-description" className="mt-2 text-xs font-bold leading-relaxed text-white/90 sm:text-sm">
            {decision.description}
          </p>
        </div>

        <div className="space-y-2.5 p-4 sm:p-5">
          <div className="flex items-center justify-between text-[11px] font-black text-[#5c5141] dark:text-[#cfc2ad]">
            <span>ルート・方針を1つ選択して決裁印を押してください</span>
            <span className="rounded bg-[#12100d] px-2 py-0.5 font-mono text-[10px] text-[#f5ca5c]">
              {decision.options.length} OPTIONS
            </span>
          </div>

          {decision.options.map((option, idx) => (
            <OptionButton key={option.id} index={idx} option={option} onChoose={onChoose} />
          ))}

          <p className="pt-1 text-center text-[10px] font-bold text-[#6e6250] dark:text-[#b5a790]">
            社内評価を上げて役職が上がるほど、給料日ゲートの支給額と最終退職金が大幅に増加します。
          </p>
        </div>
      </div>
    </div>
  );
}
