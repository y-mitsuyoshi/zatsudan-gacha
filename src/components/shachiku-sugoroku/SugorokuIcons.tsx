"use client";

import React from 'react';
import { ItemId, Job, LifeAssetId, SquareType } from '@/types/sugoroku';

interface IconProps {
  className?: string;
  size?: number;
}

export const SquareTypeIcon: React.FC<{ type: SquareType; className?: string; size?: number }> = ({
  type,
  className = '',
  size = 18,
}) => {
  switch (type) {
    case 'start':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M4 21V4" />
          <path d="M4 4h14l-3.5 4.5L18 13H4" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );
    case 'goal':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );
    case 'salary':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.18" />
          <path d="m9 7 3 4 3-4" />
          <path d="M8 12h8" />
          <path d="M8 15h8" />
          <path d="M12 11v7" />
        </svg>
      );
    case 'item':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="3" y="8" width="18" height="13" rx="2" fill="currentColor" fillOpacity="0.15" />
          <path d="M12 8v13" />
          <path d="M19 12H5" />
          <path d="M12 8c-2-3.5-5-3.5-5-1.5S9 8 12 8Z" />
          <path d="M12 8c2-3.5 5-3.5 5-1.5S15 8 12 8Z" />
        </svg>
      );
    case 'decision':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M12 22v-9" />
          <path d="m16 6 4 4-4 4" />
          <path d="M20 10h-5a3 3 0 0 0-3 3" />
          <path d="m8 6-4 4 4 4" />
          <path d="M4 10h5a3 3 0 0 1 3 3" />
        </svg>
      );
    case 'job-specific':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2" fill="currentColor" fillOpacity="0.15" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <path d="M2 13h20" />
          <circle cx="12" cy="13" r="1.5" />
        </svg>
      );
    case 'chance':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" fillOpacity="0.18" />
        </svg>
      );
    case 'event':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" fillOpacity="0.18" />
        </svg>
      );
    case 'normal':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" fill="currentColor" fillOpacity="0.15" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
      );
  }
};

export const JobIcon: React.FC<{ job: Job; className?: string; size?: number }> = ({
  job,
  className = '',
  size = 20,
}) => {
  switch (job) {
    case '営業':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <path d="M12 11v4" />
          <path d="M2 12h20" />
        </svg>
      );
    case 'エンジニア':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
          <line x1="14" y1="4" x2="10" y2="20" />
        </svg>
      );
    case 'デザイナー':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="m12 19 7-7 3 3-7 7-3-3z" />
          <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="m2 2 7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      );
    case '企画・マーケティング':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
          <line x1="2" y1="21" x2="22" y2="21" />
        </svg>
      );
    case '人事・総務':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case '経理・財務':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="16" y1="14" x2="16" y2="18" />
          <path d="M16 10h.01" />
          <path d="M12 10h.01" />
          <path d="M8 10h.01" />
          <path d="M12 14h.01" />
          <path d="M8 14h.01" />
          <path d="M12 18h.01" />
          <path d="M8 18h.01" />
        </svg>
      );
    case '法務・コンプラ':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case '広報・PR':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="m3 11 18-5v12L3 14v-3z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      );
    case '品質保証':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="m8.5 11 2 2 3.5-3.5" />
        </svg>
      );
    case '総合職':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01" />
          <path d="M16 6h.01" />
          <path d="M12 6h.01" />
          <path d="M12 10h.01" />
          <path d="M12 14h.01" />
          <path d="M16 10h.01" />
          <path d="M16 14h.01" />
          <path d="M8 10h.01" />
          <path d="M8 14h.01" />
        </svg>
      );
  }
};

export const ItemIcon: React.FC<{ itemId: ItemId | string; className?: string; size?: number }> = ({
  itemId,
  className = '',
  size = 18,
}) => {
  switch (itemId) {
    case 'energy-drink':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="7" y="4" width="10" height="17" rx="2" fill="currentColor" fillOpacity="0.15" />
          <line x1="9" y1="2" x2="15" y2="2" />
          <path d="M13 8 10 13h4l-1 4" />
        </svg>
      );
    case 'paid-leave':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fillOpacity="0.15" />
          <polyline points="14 2 14 8 20 8" />
          <circle cx="14.5" cy="15.5" r="2.5" />
        </svg>
      );
    case 'nemawashi':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="currentColor" fillOpacity="0.15" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      );
  }
};

export const AssetIcon: React.FC<{ assetId: LifeAssetId | string; className?: string; size?: number }> = ({
  assetId,
  className = '',
  size = 18,
}) => {
  switch (assetId) {
    case 'income-fund':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
          <circle cx="19" cy="9" r="2" fill="currentColor" />
        </svg>
      );
    case 'city-condo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="2" fill="currentColor" fillOpacity="0.15" />
          <path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2M10 22v-4h4v4" />
        </svg>
      );
    case 'side-saas':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" fill="currentColor" fillOpacity="0.15" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="m9 8 2 2 4-4" />
        </svg>
      );
    case 'patent-license':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="8" r="6" fill="currentColor" fillOpacity="0.15" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      );
    case 'resort-villa':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="m3 12 9-8 9 8" />
          <path d="M5 10v10h14V10" fill="currentColor" fillOpacity="0.15" />
          <path d="M2 20c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
        </svg>
      );
    case 'exec-network':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="5" r="3" />
          <circle cx="5" cy="19" r="3" />
          <circle cx="19" cy="19" r="3" />
          <line x1="10.5" y1="7.5" x2="6.5" y2="16.5" />
          <line x1="13.5" y1="7.5" x2="17.5" y2="16.5" />
          <line x1="8" y1="19" x2="16" y2="19" />
        </svg>
      );
  }
};

export const HankoStamp: React.FC<{ text: string; variant?: 'red' | 'teal' | 'gold'; className?: string }> = ({
  text,
  variant = 'red',
  className = '',
}) => {
  const styles =
    variant === 'teal'
      ? 'border-[#1f6f5c] text-[#1f6f5c] bg-[#1f6f5c]/10'
      : variant === 'gold'
        ? 'border-[#b57c1e] text-[#b57c1e] bg-[#b57c1e]/10'
        : 'border-[#b23a2a] text-[#b23a2a] bg-[#b23a2a]/10';

  return (
    <span
      className={`inline-flex h-12 w-12 shrink-0 -rotate-12 flex-col items-center justify-center rounded-full border-2 font-black tracking-tighter shadow-inner select-none ${styles} ${className}`}
      aria-hidden="true"
    >
      <span className="border-b border-current px-1 text-[8px] leading-none">決裁</span>
      <span className="mt-0.5 text-[11px] leading-none">{text.slice(0, 3)}</span>
    </span>
  );
};

export const GateArchIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
  </svg>
);
