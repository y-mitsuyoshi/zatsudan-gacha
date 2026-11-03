"use client";

import React from 'react';
import { Job } from '@/types/sugoroku';
import { JOB_PROFILES } from '@/lib/sugoroku-logic';
import { JobIcon } from './SugorokuIcons';

interface PlayerTokenProps {
  playerName: string;
  job?: Job | string;
  isMoving?: boolean;
  rankName?: string;
  rankIndex?: number;
  assetsCount?: number;
}

const PEG_COLORS = ['#f5ca5c', '#2dd4bf', '#f472b6', '#60a5fa', '#a78bfa'];

export const PlayerToken: React.FC<PlayerTokenProps> = ({
  playerName,
  job = '営業',
  isMoving = false,
  rankName = '新入社員',
  rankIndex = 0,
  assetsCount = 0,
}) => {
  const validJob = (job in JOB_PROFILES ? job : '営業') as Job;
  const profile = JOB_PROFILES[validJob];
  const companionPegs = Math.min(5, Math.max(0, rankIndex + assetsCount));

  return (
    <div
      className={`group relative flex flex-col items-center select-none ${
        isMoving ? 'animate-bounce' : 'transition-transform duration-300'
      }`}
      title={`${playerName}（${validJob} / ${rankName} / ${profile.vehicleName}）`}
      aria-label={`${playerName}（${validJob}）のキャリア・クルーザー`}
      role="img"
    >
      {/* 上部ネーム＆役職ナンバープレート */}
      <div className="pointer-events-none mb-1 flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-[#12100d] bg-[#12100d] px-2 py-0.5 text-[9px] font-black tracking-tight text-[#fffaf0] shadow-[0_3px_8px_rgba(0,0,0,0.45)]">
        <span
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: profile.accentColor }}
        >
          <JobIcon job={validJob} size={9} />
        </span>
        <span className="max-w-[68px] truncate">{playerName}</span>
        {rankName && (
          <span className="rounded-sm bg-[#f5ca5c] px-1 py-px text-[8px] font-black leading-none text-[#12100d]">
            {rankName}
          </span>
        )}
      </div>

      {/* 3Dキャリア・クルーザー（ピン乗車式ボードゲームミニカー） */}
      <div className="relative flex flex-col items-center">
        {/* 着地・現在地パルスリング＆パーティクル */}
        <span
          className="pointer-events-none absolute -inset-1.5 rounded-full opacity-50 animate-ping"
          style={{ backgroundColor: profile.accentColor, animationDuration: '2.2s' }}
          aria-hidden="true"
        />

        <svg
          width="68"
          height="46"
          viewBox="0 0 68 46"
          fill="none"
          className="relative z-10 overflow-visible drop-shadow-[0_5px_6px_rgba(0,0,0,0.45)]"
          aria-hidden="true"
        >
          {/* 地面ドロップシャドウ */}
          <ellipse cx="34" cy="42" rx="27" ry="4" fill="#12100d" fillOpacity="0.45" />

          {/* 着地キラキラ・エフェクトバースト */}
          <g className={isMoving ? 'opacity-100' : 'opacity-80'}>
            <circle cx="6" cy="18" r="2" fill="#f5ca5c" />
            <circle cx="62" cy="16" r="2" fill="#f5ca5c" />
            <path d="M60 6 L62 10 L66 11 L62 12 L60 16 L58 12 L54 11 L58 10 Z" fill="#f5ca5c" />
          </g>

          {/* 後部座席のキャリア＆資産ペグピン（昇進や資産獲得でピンが増える！） */}
          {Array.from({ length: companionPegs }).map((_, idx) => {
            const pegX = 20 + idx * 6.2;
            const pegY = 14 - (idx % 2) * 2;
            const pegColor = PEG_COLORS[idx % PEG_COLORS.length];
            return (
              <g key={idx}>
                <path
                  d={`M${pegX - 2.2} ${pegY + 9} L${pegX - 1.2} ${pegY + 2} L${pegX + 1.2} ${pegY + 2} L${pegX + 2.2} ${pegY + 9} Z`}
                  fill={pegColor}
                  stroke="#12100d"
                  strokeWidth="1.2"
                />
                <circle
                  cx={pegX}
                  cy={pegY}
                  r="3.2"
                  fill={pegColor}
                  stroke="#12100d"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}

          {/* メインプレイヤー・ドライバーペグピン */}
          <g>
            <path
              d="M39 24 L41 11 L47 11 L49 24 Z"
              fill={profile.accentColor}
              stroke="#12100d"
              strokeWidth="1.5"
            />
            <circle
              cx="44"
              cy="8.5"
              r="5"
              fill="#fffaf0"
              stroke="#12100d"
              strokeWidth="1.6"
            />
            <circle cx="44" cy="8.5" r="2.6" fill={profile.accentColor} />
            {rankIndex >= 3 && (
              <polygon
                points="40,3 42,0 44,2.5 46,0 48,3"
                fill="#f5ca5c"
                stroke="#12100d"
                strokeWidth="0.9"
              />
            )}
          </g>

          {/* 3Dミニカー：フロントガラス */}
          <path
            d="M42 15 L51 15 L55 23 L39 23 Z"
            fill="#bae6fd"
            fillOpacity="0.85"
            stroke="#12100d"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* 3Dミニカー：立体ボディ下部ベース（木製・真鍮シャーシ） */}
          <path
            d="M8 29 C8 25, 12 22, 17 22 L53 22 C58 22, 62 25, 62 29 L62 34 C62 36, 60 37, 57 37 L12 37 C9 37, 8 36, 8 34 Z"
            fill={profile.accentColor}
            stroke="#12100d"
            strokeWidth="1.8"
          />

          {/* ボディ上面ハイライト＆サイドゴールドストライプ */}
          <path
            d="M12 24 L54 24 C57 24, 59 25.5, 59 27.5 L11 27.5 C11 25.5, 11.5 24, 12 24 Z"
            fill="#ffffff"
            fillOpacity="0.28"
          />
          <rect x="11" y="29.5" width="48" height="2.6" rx="1.3" fill="#f5ca5c" stroke="#12100d" strokeWidth="0.8" />

          {/* ヘッドライト＆テールランプ */}
          <rect x="58" y="25.5" width="4" height="5" rx="2" fill="#fef08a" stroke="#12100d" strokeWidth="1.2" />
          <rect x="7" y="26" width="3.5" height="4.5" rx="1.5" fill="#ef4444" stroke="#12100d" strokeWidth="1.2" />

          {/* 前後ホイール（ゴールドリム付き立体タイヤ） */}
          <g>
            <circle cx="20" cy="36.5" r="6" fill="#1e1b18" stroke="#12100d" strokeWidth="1.6" />
            <circle cx="20" cy="36.5" r="2.8" fill="#f5ca5c" stroke="#12100d" strokeWidth="1" />
            <circle cx="49" cy="36.5" r="6" fill="#1e1b18" stroke="#12100d" strokeWidth="1.6" />
            <circle cx="49" cy="36.5" r="2.8" fill="#f5ca5c" stroke="#12100d" strokeWidth="1" />
          </g>
        </svg>
      </div>
    </div>
  );
};
