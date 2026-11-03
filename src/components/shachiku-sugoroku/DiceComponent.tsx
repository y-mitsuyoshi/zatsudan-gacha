"use client";

import React, { useEffect, useRef, useState } from 'react';
import { audioManager } from '@/utils/audio';

interface DiceComponentProps {
  isRolling: boolean;
  finalValue: number;
  finalValues?: number[];
  diceCount?: 1 | 2;
  boost?: number;
  onRollComplete?: () => void;
  onTriggerRoll?: () => void;
  disabled?: boolean;
}

const WHEEL_SEGMENTS = [
  { num: 1, color: '#e63946', textColor: '#fffaf0' },
  { num: 2, color: '#f4a261', textColor: '#12100d' },
  { num: 3, color: '#e9c46a', textColor: '#12100d' },
  { num: 4, color: '#2a9d8f', textColor: '#fffaf0' },
  { num: 5, color: '#264653', textColor: '#fffaf0' },
  { num: 6, color: '#8338ec', textColor: '#fffaf0' },
  { num: 1, color: '#d62828', textColor: '#fffaf0' },
  { num: 2, color: '#f77f00', textColor: '#12100d' },
  { num: 3, color: '#fcbf49', textColor: '#12100d' },
  { num: 4, color: '#1f6f5c', textColor: '#fffaf0' },
  { num: 5, color: '#1d5e96', textColor: '#fffaf0' },
  { num: 6, color: '#6b4696', textColor: '#fffaf0' },
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function createWedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export const DiceComponent: React.FC<DiceComponentProps> = ({
  isRolling,
  finalValue,
  finalValues,
  diceCount = 1,
  boost = 0,
  onRollComplete,
  onTriggerRoll,
  disabled = false,
}) => {
  const targetValues =
    finalValues && finalValues.length > 0
      ? finalValues
      : diceCount === 2
        ? [finalValue || 1, 1]
        : [finalValue || 1];

  const [currentValues, setCurrentValues] = useState<number[]>(targetValues);
  const [showFinal, setShowFinal] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [flapperDeflect, setFlapperDeflect] = useState(false);

  const callbackRef = useRef(onRollComplete);
  callbackRef.current = onRollComplete;
  const targetsRef = useRef(targetValues);
  targetsRef.current = targetValues;
  const baseRotationRef = useRef(0);

  useEffect(() => {
    if (!isRolling) {
      setCurrentValues(targetsRef.current);
      return;
    }

    setShowFinal(false);

    // 目標となる1投目の値 (1..6) が真上 (0度) に来る角度を計算
    const primaryTarget = Math.max(1, Math.min(6, targetsRef.current[0] || 1));
    // WHEEL_SEGMENTS で num === primaryTarget のインデックス (0..5 または 6..11)
    const segIdx = primaryTarget - 1; // 0..5, 各セグメントは30度幅、中心は segIdx * 30 + 15 度
    const segCenterAngle = segIdx * 30 + 15;
    const targetMod = (360 - segCenterAngle) % 360;
    const currentMod = ((baseRotationRef.current % 360) + 360) % 360;
    const deltaToTarget = (targetMod - currentMod + 360) % 360;
    const nextTotalRotation = baseRotationRef.current + 360 * 4 + deltaToTarget;
    baseRotationRef.current = nextTotalRotation;
    setWheelRotation(nextTotalRotation);

    let tickCount = 0;
    const interval = window.setInterval(() => {
      tickCount += 1;
      setFlapperDeflect((prev) => !prev);
      setCurrentValues(
        targetsRef.current.map(() => Math.floor(Math.random() * 6) + 1),
      );
      if (tickCount % 2 === 0) {
        audioManager.playSe('click');
      }
    }, 75);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setFlapperDeflect(false);
      setCurrentValues(targetsRef.current);
      setShowFinal(true);
      audioManager.playSe('dice-hit');
      callbackRef.current?.();
    }, 820);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [isRolling, diceCount]);

  const rawSum = currentValues.reduce((a, b) => a + b, 0);
  const totalWithBoost = rawSum + (boost > 0 ? boost : 0);

  return (
    <div className="flex flex-col items-center">
      {/* メカニカル・テーブルトップ・キャリア・ルーレット */}
      <div className="relative flex flex-col items-center justify-center">
        {/* 上部フラッパーポインター（回転中にカチカチ揺れる赤い爪） */}
        <div
          className={`pointer-events-none relative z-30 -mb-3.5 transition-transform duration-75 origin-top ${
            flapperDeflect ? '-rotate-25 scale-105' : 'rotate-0'
          }`}
          aria-hidden="true"
        >
          <svg width="32" height="30" viewBox="0 0 32 30" fill="none">
            <circle cx="16" cy="7" r="6" fill="#f5ca5c" stroke="#12100d" strokeWidth="2" />
            <path
              d="M11 9 L21 9 L16 28 Z"
              fill="#e63946"
              stroke="#12100d"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="7" r="2.2" fill="#12100d" />
          </svg>
        </div>

        {/* ルーレット外枠ベゼル＆回転ホイール盤 */}
        <button
          type="button"
          onClick={() => {
            if (!disabled && !isRolling && onTriggerRoll) {
              onTriggerRoll();
            }
          }}
          disabled={disabled || isRolling}
          aria-label={`キャリア・ルーレットを回す（現在の出目: ${totalWithBoost}）`}
          className="group relative flex h-44 w-44 items-center justify-center rounded-full border-4 border-[#12100d] bg-gradient-to-b from-[#f5ca5c] via-[#c9922e] to-[#8a5b0f] p-2 shadow-[0_8px_0_#12100d,0_14px_28px_rgba(0,0,0,0.4)] transition-transform hover:scale-[1.02] active:translate-y-0.5 disabled:cursor-default sm:h-48 sm:w-48"
        >
          {/* 回転する12分割ルーレット盤 */}
          <div
            className="h-full w-full rounded-full shadow-inner"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              transition: isRolling
                ? 'transform 800ms cubic-bezier(0.16, 1, 0.3, 1)'
                : 'none',
            }}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
              <circle cx="100" cy="100" r="96" fill="#12100d" />
              {WHEEL_SEGMENTS.map((seg, i) => {
                const startAngle = i * 30;
                const endAngle = (i + 1) * 30;
                const midAngle = startAngle + 15;
                const labelPos = polarToCartesian(100, 100, 67, midAngle);
                const pegPos = polarToCartesian(100, 100, 91, startAngle);
                return (
                  <g key={i}>
                    <path
                      d={createWedgePath(100, 100, 92, startAngle, endAngle)}
                      fill={seg.color}
                      stroke="#12100d"
                      strokeWidth="1.8"
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      fill={seg.textColor}
                      fontSize="18"
                      fontWeight="900"
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${midAngle}, ${labelPos.x}, ${labelPos.y})`}
                    >
                      {seg.num}
                    </text>
                    {/* 金属ピン（フラッパーを弾く突起） */}
                    <circle
                      cx={pegPos.x}
                      cy={pegPos.y}
                      r="3"
                      fill="#fffaf0"
                      stroke="#12100d"
                      strokeWidth="1.4"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 中央のメカニカル・スピナーダイヤル（出目デジタル表示） */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-3 border-[#12100d] bg-gradient-to-b from-[#fffaf0] to-[#e6dac6] text-[#12100d] shadow-[0_4px_10px_rgba(0,0,0,0.45)]">
              <span className="font-mono text-[8px] font-black tracking-tighter text-[#6e6250]">
                {diceCount === 2 ? 'W-SPIN' : 'ROULETTE'}
              </span>
              <span className="font-mono text-2xl font-black leading-none text-[#12100d]">
                {totalWithBoost}
              </span>
              {diceCount === 2 && (
                <span className="font-mono text-[8px] font-black text-[#b23a2a]">
                  {currentValues[0]}+{currentValues[1]}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* ルーレット状態・出目内訳バッジ */}
      <div className="mt-2.5 min-h-[26px] text-center" aria-live="polite">
        {isRolling ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#b23a2a] px-3 py-0.5 text-[11px] font-black text-white shadow-xs">
            キャリア・ルーレット回転中…
          </span>
        ) : showFinal ? (
          <span className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-[#3b3022] bg-[#12100d] px-3.5 py-0.5 text-xs font-black text-[#fffaf0]">
            <span>ルーレット確定</span>
            <span className="font-mono text-base text-[#f5ca5c]">{totalWithBoost}マス</span>
            {diceCount === 2 && (
              <span className="font-mono text-[10px] text-[#f5aa6e]">
                （{currentValues[0]}+{currentValues[1]}）
              </span>
            )}
            {boost > 0 && (
              <span className="text-[10px] text-[#7adbc2]">（+{boost}ブースト込）</span>
            )}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-[#6e6250] dark:text-[#b5a790]">
            {diceCount === 2
              ? '全力残業モード：Wスピン（2〜12マス / Spaceでも回転）'
              : '定時モード：通常スピン（1〜6マス / Spaceでも回転）'}
          </span>
        )}
      </div>
    </div>
  );
};
