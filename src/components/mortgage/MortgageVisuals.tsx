"use client";

import React, { useState } from 'react';
import {
  EmploymentType,
  MortgageGameState,
  MortgageSetupConfig,
  PropertyCategory,
  PropertySpec,
  UnderwritingResult,
  YearlySnapshot,
} from '@/types/mortgage';
import {
  PROPERTIES,
  resolveEffectiveBank,
  resolveEffectiveDanshin,
  resolveEffectiveProperty,
} from '@/lib/mortgage-logic';

/**
 * 1. イントロ画面用：日本の住宅市場・地域分布統計マップSVG
 */
export function JapanMortgageMapIllustration({ activeTick }: { activeTick: number }) {
  const hotspots = [
    { id: 'tokyo', label: '首都圏・湾岸', x: 238, y: 178, r: 9, share: '38.4%', alignLeft: false },
    { id: 'kansai', label: '関西・阪神間', x: 175, y: 196, r: 7, share: '18.2%', alignLeft: true },
    { id: 'chukyo', label: '名古屋・東海', x: 205, y: 188, r: 6, share: '11.5%', alignLeft: false },
    { id: 'fukuoka', label: '福岡・九州', x: 112, y: 222, r: 5.5, share: '8.7%', alignLeft: false },
    { id: 'sendai', label: '仙台・東北', x: 256, y: 126, r: 4.5, share: '5.4%', alignLeft: false },
    { id: 'sapporo', label: '札幌・北海道', x: 268, y: 58, r: 5, share: '5.8%', alignLeft: false },
    { id: 'hiroshima', label: '広島・中国', x: 142, y: 202, r: 4.5, share: '4.9%', alignLeft: true },
  ];
  const activeIdx = activeTick % hotspots.length;

  return (
    <div className="relative overflow-hidden rounded border border-[#C7D2CE] bg-[#DFE7E3] p-3 dark:border-[#2A383D] dark:bg-[#10181C]">
      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#4A5A61] dark:text-[#A3B2AF]">
        <span className="font-mono font-semibold">住宅ローン地域分布マップ（都市圏・地方圏）</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[#0F6E68] dark:text-[#4CC0AF]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#8C1D3C] dark:bg-[#E2678A]" />
          新規融資実行スポット
        </span>
      </div>
      <svg
        viewBox="0 0 380 265"
        className="mt-1 h-44 w-full select-none"
        role="img"
        aria-label="日本の住宅ローン利用世帯の地域分布図"
      >
        <g
          stroke="currentColor"
          className="text-[#B8C6C1] dark:text-[#1F2C31]"
          strokeWidth="0.6"
          strokeDasharray="2,3"
        >
          <line x1="0" y1="65" x2="380" y2="65" />
          <line x1="0" y1="130" x2="380" y2="130" />
          <line x1="0" y1="195" x2="380" y2="195" />
          <line x1="95" y1="0" x2="95" y2="265" />
          <line x1="190" y1="0" x2="190" y2="265" />
          <line x1="285" y1="0" x2="285" y2="265" />
        </g>

        <g
          className="fill-[#C5D1CC] stroke-[#8FA19A] dark:fill-[#223036] dark:stroke-[#3B4F57]"
          strokeWidth="1.2"
        >
          <path d="M265,36 L312,28 L330,52 L310,76 L278,82 L262,64 Z" />
          <path d="M268,92 L282,118 L272,158 L256,188 L228,196 L196,198 L168,208 L132,208 L124,194 L158,182 L192,174 L222,152 L246,120 L254,92 Z" />
          <path d="M150,214 L182,210 L186,226 L152,230 Z" />
          <path d="M102,212 L130,212 L128,248 L104,252 L94,230 Z" />
        </g>

        {hotspots.map((spot, idx) => {
          const isPulse = idx === activeIdx;
          return (
            <g key={spot.id}>
              {isPulse && (
                <circle
                  cx={spot.x}
                  cy={spot.y}
                  r={spot.r * 2.5}
                  className="fill-[#8C1D3C]/25 dark:fill-[#E2678A]/25"
                />
              )}
              <circle
                cx={spot.x}
                cy={spot.y}
                r={spot.r}
                className={
                  isPulse
                    ? 'fill-[#8C1D3C] stroke-white dark:fill-[#E2678A] dark:stroke-[#0D1316]'
                    : 'fill-[#0F6E68] opacity-80 dark:fill-[#4CC0AF]'
                }
                strokeWidth="1.5"
              />
              <text
                x={spot.alignLeft ? spot.x - spot.r - 4 : spot.x + spot.r + 4}
                y={spot.y + 3}
                textAnchor={spot.alignLeft ? 'end' : 'start'}
                className="fill-[#13212A] font-mono text-[8.5px] font-bold dark:fill-[#E1E9E6]"
              >
                {spot.label} ({spot.share})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * 2. 物件タイプ別の建築イラストSVG（全12物件＋カスタム/ランダム条件で外観・背景・ディテールが変化）
 */
export function PropertyArchitecturalIllustration({
  propertyId,
  overrideSpec,
  className = 'h-28 w-full',
}: {
  propertyId: PropertyCategory;
  overrideSpec?: Partial<PropertySpec>;
  className?: string;
}) {
  const baseProp = PROPERTIES[propertyId];
  const prop: PropertySpec = overrideSpec ? { ...baseProp, ...overrideSpec } : baseProp;
  const isTower = prop.buildingType === 'tower';
  const isDetached = prop.buildingType === 'detached';
  const isLuxury = propertyId === 'luxury-penthouse-new' || prop.priceMan >= 10000;
  const isRegional =
    propertyId === 'regional-mansion-new' ||
    propertyId === 'detached-regional-spacious' ||
    propertyId === 'detached-kominka-reno';
  const isUsed = !prop.isNew;

  return (
    <svg
      viewBox="0 0 280 120"
      className={`select-none overflow-hidden rounded border border-[#C7D2CE] bg-[#E5ECE9] dark:border-[#2A383D] dark:bg-[#111A1E] ${className}`}
      role="img"
      aria-label={prop.shortName}
    >
      <rect
        width="280"
        height="92"
        className={
          isLuxury
            ? 'fill-[#1B2632]'
            : isUsed
              ? 'fill-[#E6DFD5] dark:fill-[#1E2224]'
              : 'fill-[#DCE7E3] dark:fill-[#132026]'
        }
      />
      <rect y="92" width="280" height="28" className="fill-[#C5D2CD] dark:fill-[#1D2B30]" />
      <circle
        cx="242"
        cy="26"
        r="13"
        className={isLuxury ? 'fill-[#F3E2B3]' : 'fill-[#D9AF59]/75'}
      />

      {isTower && (
        <g>
          <rect
            y="82"
            width="280"
            height="14"
            className="fill-[#0F6E68]/35 dark:fill-[#4CC0AF]/25"
          />
          <path d="M8,82 Q68,62 128,82" fill="none" stroke="#5F6E72" strokeWidth="2" />
          <rect x="38" y="42" width="26" height="42" className="fill-[#94A7A0] dark:fill-[#2B3B42]" />
          <rect x="210" y="46" width="30" height="38" className="fill-[#94A7A0] dark:fill-[#2B3B42]" />
          <rect
            x={isLuxury ? '98' : '106'}
            y="8"
            width={isLuxury ? '84' : '68'}
            height="88"
            rx="2"
            className={
              isLuxury
                ? 'fill-[#13212A] stroke-[#D9AF59]'
                : 'fill-[#13212A] stroke-[#0F6E68] dark:fill-[#24363F] dark:stroke-[#4CC0AF]'
            }
            strokeWidth="1.8"
          />
          {/* ペントハウス王冠ルーフ */}
          {isLuxury && (
            <polygon points="98,8 140,1 182,8" className="fill-[#D9AF59]" />
          )}
          {[16, 26, 36, 46, 56, 66, 76].map((yPos) => (
            <g key={yPos} className="fill-[#F3E2B3] opacity-90">
              <rect x="114" y={yPos} width="10" height="5" />
              <rect x="128" y={yPos} width="10" height="5" />
              <rect x="142" y={yPos} width="10" height="5" />
              <rect x="156" y={yPos} width="10" height="5" />
            </g>
          ))}
          <circle cx="140" cy="5" r="2.5" className="fill-[#8C1D3C] dark:fill-[#E2678A]" />
        </g>
      )}

      {!isTower && !isDetached && (
        <g>
          {isRegional && (
            <path
              d="M0,78 L55,44 L105,78 L185,38 L250,78 Z"
              className="fill-[#B8C8C2] dark:fill-[#1B2A30]"
            />
          )}
          <line x1="0" y1="78" x2="280" y2="78" stroke="#8FA19A" strokeWidth="1.5" />
          <rect
            x={propertyId === 'compact-mansion-new' ? '88' : '66'}
            y={propertyId === 'compact-mansion-new' ? '14' : '22'}
            width={propertyId === 'compact-mansion-new' ? '104' : '148'}
            height={propertyId === 'compact-mansion-new' ? '78' : '70'}
            rx="2"
            className={
              isUsed
                ? 'fill-[#E2DAD0] stroke-[#5F6E72] dark:fill-[#2B2D2F] dark:stroke-[#8A9A96]'
                : propertyId === 'compact-mansion-new'
                  ? 'fill-[#22343C] stroke-[#0F6E68] dark:fill-[#1C2C33] dark:stroke-[#4CC0AF]'
                  : 'fill-[#F7FAF8] stroke-[#13212A] dark:fill-[#243238] dark:stroke-[#A3B2AF]'
            }
            strokeWidth="1.5"
          />
          {[36, 50, 64, 78].map((yPos) => (
            <g key={yPos}>
              <line
                x1={propertyId === 'compact-mansion-new' ? '92' : '70'}
                y1={yPos}
                x2={propertyId === 'compact-mansion-new' ? '188' : '210'}
                y2={yPos}
                stroke="#0F6E68"
                strokeWidth="2"
              />
              <rect
                x={propertyId === 'compact-mansion-new' ? '102' : '82'}
                y={yPos - 8}
                width="18"
                height="6"
                className="fill-[#D9AF59]/85"
              />
              <rect
                x={propertyId === 'compact-mansion-new' ? '132' : '112'}
                y={yPos - 8}
                width="18"
                height="6"
                className="fill-[#0F6E68]/55"
              />
              {propertyId !== 'compact-mansion-new' && (
                <>
                  <rect x="142" y={yPos - 8} width="18" height="6" className="fill-[#D9AF59]/75" />
                  <rect x="172" y={yPos - 8} width="18" height="6" className="fill-[#0F6E68]/45" />
                </>
              )}
              {propertyId === 'compact-mansion-new' && (
                <rect x="160" y={yPos - 8} width="18" height="6" className="fill-[#D9AF59]/85" />
              )}
            </g>
          ))}
          <circle cx="48" cy="84" r="9" className="fill-[#2B7A4E]" />
          <circle cx="232" cy="84" r="9" className="fill-[#2B7A4E]" />
        </g>
      )}

      {isDetached && (
        <g>
          <circle cx="50" cy="78" r="14" className="fill-[#2B7A4E]" />
          <rect x="48" y="86" width="4" height="10" className="fill-[#5E4630]" />
          {propertyId === 'detached-regional-spacious' && (
            <>
              <circle cx="234" cy="76" r="15" className="fill-[#2B7A4E]" />
              <rect x="232" y="85" width="4" height="10" className="fill-[#5E4630]" />
              <rect x="200" y="80" width="24" height="11" rx="2" className="fill-[#0F6E68]" />
              <rect x="22" y="80" width="24" height="11" rx="2" className="fill-[#8C1D3C]" />
            </>
          )}
          <rect
            x={propertyId === 'detached-semi-order-zeh' ? '100' : '86'}
            y={propertyId === 'detached-semi-order-zeh' ? '26' : '44'}
            width={propertyId === 'detached-semi-order-zeh' ? '80' : '108'}
            height={propertyId === 'detached-semi-order-zeh' ? '68' : '50'}
            className={
              propertyId === 'detached-kominka-reno'
                ? 'fill-[#EAE2D3] stroke-[#5E4630] dark:fill-[#332C24] dark:stroke-[#D9AF59]'
                : isUsed
                  ? 'fill-[#DED6C8] stroke-[#5E4630] dark:fill-[#2D2A26] dark:stroke-[#A3B2AF]'
                  : 'fill-[#F7FAF8] stroke-[#13212A] dark:fill-[#223036] dark:stroke-[#E1E9E6]'
            }
            strokeWidth="1.5"
          />
          <polygon
            points={
              propertyId === 'detached-semi-order-zeh'
                ? '92,28 140,8 188,28'
                : '76,46 140,14 204,46'
            }
            className={
              prop.energyCert === 'long-term-excellent'
                ? 'fill-[#13212A] stroke-[#0F6E68]'
                : propertyId === 'detached-kominka-reno'
                  ? 'fill-[#2B5B4E] stroke-[#13212A]'
                  : isUsed
                    ? 'fill-[#5E4630] stroke-[#13212A]'
                    : 'fill-[#8C1D3C] stroke-[#13212A]'
            }
            strokeWidth="1.5"
          />
          {prop.energyCert === 'long-term-excellent' && (
            <polygon
              points="142,19 190,43 142,43"
              className="fill-[#0F6E68] stroke-[#F7FAF8]"
              strokeWidth="0.8"
            />
          )}
          <rect
            x="102"
            y="54"
            width="24"
            height="18"
            className="fill-[#D9AF59]/80 stroke-[#13212A]"
            strokeWidth="1"
          />
          <rect
            x="154"
            y="54"
            width="24"
            height="18"
            className="fill-[#D9AF59]/80 stroke-[#13212A]"
            strokeWidth="1"
          />
          <rect
            x="132"
            y="68"
            width="16"
            height="26"
            className="fill-[#8C6A48] stroke-[#13212A]"
            strokeWidth="1"
          />
          <rect x="204" y="78" width="38" height="14" rx="3" className="fill-[#0F6E68]" />
          <circle cx="212" cy="93" r="4" className="fill-[#13212A]" />
          <circle cx="234" cy="93" r="4" className="fill-[#13212A]" />
        </g>
      )}

      {/* 左上バッジ：新築/中古 ＆ 省エネ住宅性能 */}
      <g transform="translate(8, 8)">
        <rect
          width="112"
          height="17"
          rx="2"
          className="fill-[#13212A]/85 dark:fill-[#0D1316]/90"
        />
        <text x="6" y="12" className="fill-[#D9AF59] font-mono text-[8.5px] font-bold">
          {prop.isNew ? '新築' : `中古(築${prop.builtAge}年)`} ·{' '}
          {prop.energyCert === 'long-term-excellent'
            ? '長期優良'
            : prop.energyCert === 'zeh'
              ? 'ZEH省エネ'
              : prop.energyCert === 'standard'
                ? '一般省エネ'
                : '旧基準'}
        </text>
      </g>

      <rect y="96" width="280" height="24" className="fill-[#13212A]/85 dark:fill-[#0D1316]/90" />
      <text x="8" y="112" className="fill-white font-mono text-[9.5px] font-bold">
        {prop.priceMan.toLocaleString()}万円（土地{Math.round(prop.landRatio * 100)}%・建物{Math.round((1 - prop.landRatio) * 100)}%）
      </text>
    </svg>
  );
}

/**
 * 2B. ローン契約構造・金利タイプ・返済方式・団信の図解イラストSVG
 */
export function LoanStructureVisualSvg({
  config,
  underwriting,
}: {
  config: MortgageSetupConfig;
  underwriting: UnderwritingResult;
}) {
  const bank = resolveEffectiveBank(config);
  const danshin = resolveEffectiveDanshin(config);
  const isPair = config.contractType === 'pair';
  const isMerge = config.contractType === 'income-merge';
  const isEqualPrincipal = config.repaymentMethod === 'equal-principal';
  const isFixed = bank.rateType === 'flat-35' || bank.rateType === 'fixed-10';

  return (
    <svg
      viewBox="0 0 360 112"
      className="h-28 w-full select-none overflow-hidden rounded border border-[#C7D2CE] bg-[#E8EFEA] dark:border-[#2A383D] dark:bg-[#11191D]"
      role="img"
      aria-label="住宅ローン契約構造と金利・返済方式の図解"
    >
      {/* 左ブロック：契約方式（単独 vs ペアローン vs 収入合算） */}
      <g transform="translate(8, 8)">
        <rect
          width="108"
          height="96"
          rx="3"
          className="fill-[#F7FAF8] stroke-[#C7D2CE] dark:fill-[#162126] dark:stroke-[#2A383D]"
        />
        <text x="8" y="15" className="fill-[#5F6E72] font-mono text-[8.5px] font-bold dark:text-[#8A9A96]">
          ① 契約・審査構造
        </text>
        {isPair ? (
          <g transform="translate(14, 24)">
            <rect x="4" y="14" width="32" height="34" rx="2" className="fill-[#0F6E68]" />
            <rect x="44" y="14" width="32" height="34" rx="2" className="fill-[#8C1D3C]" />
            <path d="M20,8 L60,8" stroke="#D9AF59" strokeWidth="2.5" />
            <text x="20" y="34" textAnchor="middle" className="fill-white font-mono text-[8px] font-bold">
              本人
            </text>
            <text x="60" y="34" textAnchor="middle" className="fill-white font-mono text-[8px] font-bold">
              配偶者
            </text>
          </g>
        ) : isMerge ? (
          <g transform="translate(14, 24)">
            <rect x="8" y="10" width="42" height="38" rx="2" className="fill-[#0F6E68]" />
            <rect x="52" y="20" width="22" height="28" rx="2" className="fill-[#2B7A4E]" />
            <text x="29" y="32" textAnchor="middle" className="fill-white font-mono text-[8px] font-bold">
              主債務
            </text>
          </g>
        ) : (
          <g transform="translate(26, 22)">
            <rect x="10" y="10" width="36" height="38" rx="2" className="fill-[#0F6E68]" />
            <text x="28" y="33" textAnchor="middle" className="fill-white font-mono text-[8px] font-bold">
              単独1本
            </text>
          </g>
        )}
        <text x="54" y="88" textAnchor="middle" className="fill-[#13212A] font-mono text-[9px] font-bold dark:fill-[#E1E9E6]">
          {isPair ? 'ペアローン(W控除)' : isMerge ? '収入合算(連帯保証)' : '単独ローン契約'}
        </text>
      </g>

      {/* 中央ブロック：金利タイプ＆返済方式 */}
      <g transform="translate(124, 8)">
        <rect
          width="112"
          height="96"
          rx="3"
          className="fill-[#F7FAF8] stroke-[#C7D2CE] dark:fill-[#162126] dark:stroke-[#2A383D]"
        />
        <text x="8" y="15" className="fill-[#5F6E72] font-mono text-[8.5px] font-bold dark:text-[#8A9A96]">
          ② 金利・{config.termYears}年返済
        </text>
        {/* 償却イメージ棒グラフ */}
        <g transform="translate(12, 24)">
          {isEqualPrincipal ? (
            <>
              <rect x="4" y="4" width="12" height="40" className="fill-[#2B7A4E]" />
              <rect x="22" y="11" width="12" height="33" className="fill-[#2B7A4E]" />
              <rect x="40" y="18" width="12" height="26" className="fill-[#2B7A4E]" />
              <rect x="58" y="25" width="12" height="19" className="fill-[#2B7A4E]" />
              <rect x="76" y="32" width="12" height="12" className="fill-[#2B7A4E]" />
            </>
          ) : (
            <>
              <rect x="4" y="10" width="12" height="34" className="fill-[#0F6E68]" />
              <rect x="22" y="10" width="12" height="34" className="fill-[#0F6E68]" />
              <rect x="40" y="10" width="12" height="34" className="fill-[#0F6E68]" />
              <rect x="58" y="10" width="12" height="34" className="fill-[#0F6E68]" />
              <rect x="76" y="10" width="12" height="34" className="fill-[#0F6E68]" />
            </>
          )}
          {!isFixed && (
            <path
              d="M2,36 Q24,18 46,28 T90,8"
              fill="none"
              stroke="#8C1D3C"
              strokeWidth="2"
            />
          )}
        </g>
        <text x="56" y="77" textAnchor="middle" className="fill-[#8C1D3C] font-mono text-[9.5px] font-bold dark:fill-[#E2678A]">
          年 {underwriting.effectiveInitialRate.toFixed(2)}% ({isEqualPrincipal ? '元金均等' : '元利均等'})
        </text>
        <text x="56" y="89" textAnchor="middle" className="fill-[#4A5A61] font-mono text-[8.5px] dark:fill-[#A3B2AF]">
          {config.age}歳 → {underwriting.maturityAge}歳完済予定
        </text>
      </g>

      {/* 右ブロック：団信シールド */}
      <g transform="translate(244, 8)">
        <rect
          width="108"
          height="96"
          rx="3"
          className="fill-[#F7FAF8] stroke-[#C7D2CE] dark:fill-[#162126] dark:stroke-[#2A383D]"
        />
        <text x="8" y="15" className="fill-[#5F6E72] font-mono text-[8.5px] font-bold dark:text-[#8A9A96]">
          ③ 団信保障 (+{danshin.spreadRate.toFixed(2)}%)
        </text>
        <g transform="translate(34, 22)">
          <path
            d="M 20 0 L 40 7 L 40 24 C 40 37 20 46 20 46 C 20 46 0 37 0 24 L 0 7 Z"
            className={
              config.danshin === 'basic'
                ? 'fill-[#5F6E72]'
                : config.danshin === 'cancer-50'
                  ? 'fill-[#0F6E68]'
                  : 'fill-[#8C1D3C]'
            }
          />
          <rect x="17" y="11" width="6" height="20" fill="#FFFFFF" />
          <rect x="10" y="18" width="20" height="6" fill="#FFFFFF" />
        </g>
        <text x="54" y="82" textAnchor="middle" className="fill-[#13212A] font-mono text-[8.5px] font-bold dark:fill-[#E1E9E6]">
          {danshin.name}
        </text>
        <text x="54" y="92" textAnchor="middle" className="fill-[#0F6E68] font-mono text-[8px] dark:fill-[#4CC0AF]">
          {config.danshin === 'basic'
            ? '死亡・高度障害100%'
            : config.danshin === 'cancer-50'
              ? 'がん診断で残債50%免除'
              : 'がん・3大疾病100%免除'}
        </text>
      </g>
    </svg>
  );
}

/**
 * 3. 世帯IDカード＆証書用：多彩な年齢・職業・表情・子ども成長段階に変化するキャラクターポートレートSVG
 */
export function FamilyPortraitSvg({
  age,
  hasSpouse,
  childrenCount,
  childrenAges = [],
  employment = 'listed-corp',
  mentalScore,
  status = 'playing',
  danshinTriggered = false,
}: {
  age: number;
  hasSpouse: boolean;
  childrenCount: number;
  childrenAges?: number[];
  employment?: EmploymentType;
  mentalScore: number;
  status?: 'playing' | 'cleared' | 'sold-escaped' | 'bankrupt';
  danshinTriggered?: boolean;
}) {
  // 7段階の年齢変化（20代・30代前半・30代後半・40代前半・40代後半・50代・60代以上）
  const isSenior = age >= 60;
  const is50s = age >= 50 && age < 60;
  const isLate40s = age >= 45 && age < 50;
  const hairColor = isSenior
    ? '#A5B2AE'
    : is50s
      ? '#5C686B'
      : isLate40s
        ? '#2F3A3D'
        : '#13212A';
  const wearsGlasses = age >= 46 || employment === 'mega-venture' || employment === 'civil-servant';

  // 職業・年代別の服装カラー
  const outfitColor = isSenior
    ? '#8C6A48'
    : employment === 'listed-corp'
      ? '#13212A'
      : employment === 'civil-servant'
        ? '#0F6E68'
        : employment === 'mega-venture'
          ? '#2B5B7A'
          : employment === 'freelance'
            ? '#6A3D7A'
            : '#3D5A45';

  // 表情のバリエーション
  const isHappy = status === 'cleared' || mentalScore >= 72;
  const isStressed = status === 'bankrupt' || mentalScore < 42;
  const mouthPath = isHappy
    ? 'M 23 34 Q 28 40 33 34'
    : isStressed
      ? 'M 23 38 Q 28 33 33 38'
      : 'M 24 35 Q 28 37 32 35';

  const activeKids =
    childrenAges.length > 0
      ? childrenAges
      : Array.from({ length: childrenCount }, (_, i) => Math.max(1, age - 29 - i * 2));

  return (
    <svg
      viewBox="0 0 112 88"
      className="h-20 w-24 shrink-0 rounded border border-[#C7D2CE] bg-[#E4ECE9] dark:border-[#2A383D] dark:bg-[#1B262B]"
      role="img"
      aria-label={`${age}歳の世帯キャラクターイラスト`}
    >
      {/* 背景の状態オーラ */}
      {status === 'cleared' && (
        <circle cx="56" cy="44" r="40" className="fill-[#D9AF59]/25" />
      )}
      {danshinTriggered && (
        <circle cx="56" cy="44" r="38" className="fill-[#0F6E68]/20" />
      )}

      {/* 本人キャラクター */}
      <g transform={hasSpouse ? 'translate(2, 4)' : 'translate(24, 4)'}>
        <path d="M 10 82 C 10 56 46 56 46 82 Z" fill={outfitColor} />
        {/* スーツのVゾーン・ネクタイ */}
        {!isSenior && employment === 'listed-corp' && (
          <polygon points="25,58 31,58 28,72" fill="#8C1D3C" />
        )}
        <circle cx="28" cy="30" r="13.5" className="fill-[#F3DFC8] stroke-[#13212A]" strokeWidth="1.3" />
        {/* 髪型 */}
        <path d="M 14 28 C 14 12 42 12 42 28 C 36 20 20 20 14 28 Z" fill={hairColor} />
        {/* 50代以降の白髪メッシュ・シワ */}
        {(is50s || isSenior) && (
          <path d="M 17 22 L 21 25 M 39 22 L 35 25" stroke="#E1E9E6" strokeWidth="1.2" />
        )}
        {/* 目と眉 */}
        {isStressed ? (
          <g stroke="#13212A" strokeWidth="1.3">
            <line x1="21" y1="26" x2="25" y2="28" />
            <line x1="35" y1="26" x2="31" y2="28" />
          </g>
        ) : null}
        <circle cx="23.5" cy="29.5" r="1.4" fill="#13212A" />
        <circle cx="32.5" cy="29.5" r="1.4" fill="#13212A" />
        {/* メガネ（46歳以上または特定職種） */}
        {wearsGlasses && (
          <g fill="none" stroke="#4A5A61" strokeWidth="1">
            <rect x="19.5" y="27" width="7" height="5" rx="1" />
            <rect x="29.5" y="27" width="7" height="5" rx="1" />
            <line x1="26.5" y1="29.5" x2="29.5" y2="29.5" />
          </g>
        )}
        {/* 口元 */}
        <path d={mouthPath} fill="none" stroke="#13212A" strokeWidth="1.4" strokeLinecap="round" />
        {/* 焦り汗エフェクト */}
        {isStressed && (
          <path
            d="M 41 24 C 43 27 43 30 41 31 C 39 30 39 27 41 24 Z"
            className="fill-[#38BDF8]"
          />
        )}
      </g>

      {/* 配偶者キャラクター */}
      {hasSpouse && (
        <g transform="translate(48, 6)">
          <path d="M 12 80 C 12 56 44 56 44 80 Z" className="fill-[#8C1D3C]" />
          <circle cx="28" cy="30" r="13" className="fill-[#F5E3CE] stroke-[#13212A]" strokeWidth="1.3" />
          <path d="M 14 31 C 13 13 43 13 42 31 C 37 21 19 21 14 31 Z" fill={hairColor} />
          <circle cx="24" cy="29.5" r="1.3" fill="#13212A" />
          <circle cx="32" cy="29.5" r="1.3" fill="#13212A" />
          <path d={mouthPath} fill="none" stroke="#13212A" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      )}

      {/* 子どもキャラクター（成長段階に応じて帽子・ランドセル・学生服・角帽に変化！） */}
      {activeKids.slice(0, 3).map((cAge, idx) => {
        if (cAge >= 22) return null; // 独立後は巣立ち
        const xOffset = 22 + idx * 24;
        const isElementary = cAge >= 6 && cAge < 12;
        const isKindergarten = cAge >= 3 && cAge < 6;
        const isUni = cAge >= 18 && cAge < 22;
        return (
          <g key={idx} transform={`translate(${xOffset}, 42)`}>
            {/* ランドセル（小学生） */}
            {isElementary && (
              <rect
                x="6"
                y="24"
                width="20"
                height="16"
                rx="2"
                fill={idx % 2 === 0 ? '#B0362B' : '#13212A'}
              />
            )}
            <path
              d="M 7 44 C 7 29 25 29 25 44 Z"
              fill={cAge >= 12 ? '#13212A' : '#2B7A4E'}
            />
            <circle cx="16" cy="21" r="8.5" className="fill-[#F5E3CE] stroke-[#13212A]" strokeWidth="1.1" />
            {/* 黄色い通学帽（園児・小学生） */}
            {(isKindergarten || isElementary) && (
              <path d="M 7 18 C 7 10 25 10 25 18 Z" fill="#D9AF59" stroke="#13212A" strokeWidth="0.9" />
            )}
            {/* 大学生の角帽 */}
            {isUni && (
              <polygon points="6,14 16,10 26,14 16,18" fill="#13212A" />
            )}
            <circle cx="13.5" cy="21" r="1" fill="#13212A" />
            <circle cx="18.5" cy="21" r="1" fill="#13212A" />
            <path d="M 13.5 24 Q 16 26.5 18.5 24" fill="none" stroke="#13212A" strokeWidth="1" />
          </g>
        );
      })}

      {/* 完済時の祝福クラウンバッジ */}
      {status === 'cleared' && (
        <g transform="translate(4, 2)">
          <polygon points="2,12 6,4 11,9 16,3 21,9 26,4 30,12" fill="#D9AF59" stroke="#13212A" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}

/**
 * 4. 人生の過程シーン（全16種の過程イラスト定義とギャラリー切替）
 */
export interface LifeSceneSpec {
  id: string;
  code: string;
  title: string;
  caption: string;
}

export function getUnlockedLifeScenes(state: MortgageGameState): LifeSceneSpec[] {
  const prop = resolveEffectiveProperty(state.config);
  const isDetached = prop.buildingType === 'detached';
  const y = state.yearIndex;
  const age = state.age;
  const scenes: LifeSceneSpec[] = [
    {
      id: 'moving-in',
      code: 'SCENE 01',
      title: '鍵引き渡し・引越しトラック到着',
      caption: '段ボール箱と新しい鍵。35年・50年の長い航海がここから始まりました。',
    },
  ];

  if (y >= 2 && state.childrenAges.some((a) => a <= 6)) {
    scenes.push({
      id: 'nursery-spring',
      code: 'SCENE 02',
      title: '桜並木と保育園送迎の朝',
      caption: '朝の光の中、ベビーカーを押して駅へと急ぐ共働き・子育ての日々。',
    });
  }
  if (y >= 3 && state.bojPolicyRate > 0.3) {
    scenes.push({
      id: 'mid-term-rate-hike',
      code: 'SCENE 02B',
      title: '日銀の途中利上げ速報と変動金利の見直し通知',
      caption: 'テレビに映る利上げ速報と銀行からの金利改定ハガキ。返済表の利息割合が変化する。',
    });
  }
  if (y >= 4 && state.config.contractType !== 'single' && state.subIncomeMan > 0) {
    scenes.push({
      id: 'pair-work-balance',
      code: 'SCENE 03B',
      title: 'ペアローン共働き・朝のキッチンと二人の出勤',
      caption: '連帯債務・ペアローンのW返済を支えるため、家事分担とキャリアの両立に挑む日々。',
    });
  }
  if (y >= 4 && state.childrenAges.some((a) => a >= 6 && a <= 12)) {
    scenes.push({
      id: 'elementary-sakura',
      code: 'SCENE 03',
      title: '小学校入学・黄色い帽子とランドセル',
      caption: '真新しいランドセルを背負ってマイホームの玄関から出発する春。',
    });
  }
  if (state.totalPrepaymentMan >= 100) {
    scenes.push({
      id: 'prepayment-milestone',
      code: 'SCENE 04B',
      title: '一部繰上返済の実行・元金圧縮と期間短縮',
      caption: 'コツコツ貯めた資金で元金を直接カット！完済年齢が近づく達成感の瞬間。',
    });
  }
  if (y >= 7) {
    scenes.push(
      isDetached
        ? {
            id: 'detached-solar',
            code: 'SCENE 04',
            title: '一戸建て・屋根太陽光＆蓄電池と省エネ生活',
            caption: '一戸建ての屋根を活かした自家発電と断熱窓で光熱費高騰に立ち向かう。',
          }
        : {
            id: 'mansion-board',
            code: 'SCENE 04',
            title: 'マンション管理組合総会・駐車場と維持費の選択',
            caption: '共用部・機械式駐車場の維持費を抑えるため、住民総会で将来計画を議論。',
          },
    );
  }
  if (state.bojPolicyRate >= 0.6) {
    scenes.push({
      id: 'boj-rate-storm',
      code: 'SCENE 05',
      title: '日銀金融政策決定会合・追加利上げの雷雲',
      caption: '相次ぐ金利引き上げのニュースが駆け巡り、変動金利の返済表に緊張が走る。',
    });
  }
  if (y >= 9 && state.childrenAges.some((a) => a >= 10 && a <= 16)) {
    scenes.push({
      id: 'cram-school-night',
      code: 'SCENE 06',
      title: '夜遅くまで灯る勉強部屋の明かりと進学塾',
      caption: '夏期講習や受験対策で教育費がピークへ。マイホームの窓に夜遅くまで明かりが灯る。',
    });
  }
  if (y >= 11) {
    scenes.push({
      id: 'tax-credit-autumn',
      code: 'SCENE 07',
      title: '住宅ローン減税（控除期間）満了の秋',
      caption: '毎年末に家計を助けてくれた住宅ローン控除が満了を迎え、真の実力が試される。',
    });
  }
  if (y >= 12 && state.liquidSavingsMan >= 1200) {
    scenes.push({
      id: 'nisa-dividend-harvest',
      code: 'SCENE 07B',
      title: '新NISA積立運用の果実と金融資産の成長',
      caption: '長期のインデックス積立と配当が育ち、住宅ローン残債に対抗できる心強い資産の柱に。',
    });
  }
  if (y >= 13) {
    scenes.push(
      isDetached
        ? {
            id: 'detached-paint-repair',
            code: 'SCENE 08',
            title: '一戸建て13年目・外壁塗装と屋根防水メンテナンス',
            caption: '自宅の周りに足場が組まれ、雨漏りとシロアリから我が家を守る外装リフレッシュ工事。',
          }
        : {
            id: 'mansion-major-repair',
            code: 'SCENE 08',
            title: 'マンション第1回大規模修繕工事・全面メッシュ足場',
            caption: '建物全体が修繕用メッシュシートとゴンドラに包まれ、資産価値を守る大工事が進行。',
          },
    );
  }
  if (state.childrenAges.some((a) => a >= 18)) {
    scenes.push({
      id: 'university-departure',
      code: 'SCENE 09',
      title: '大学進学・スーツケースと巣立ちの春',
      caption: '大きくなった子どもがスーツケースを引いて新たな世界へ。教育費の最終章。',
    });
  }
  if (age >= 47) {
    scenes.push({
      id: 'health-danshin',
      code: 'SCENE 10',
      title: '40代後半の人間ドックと団体信用生命保険の盾',
      caption: '健康の転機が訪れる年代。契約時に選んだ団信の保障内容が家族の運命を守る。',
    });
  }
  if (y >= 20) {
    scenes.push(
      isDetached
        ? {
            id: 'year20-renewal',
            code: 'SCENE 10B',
            title: '築20年・屋根カバー工法と水回り全面リノベ',
            caption: '20年選手の我が家。屋根材と給湯器・浴室を一新し、後半戦の暮らしを整える。',
          }
        : {
            id: 'year20-renewal',
            code: 'SCENE 10B',
            title: '築20年・マンション給排水管＆エレベーター更新',
            caption: '外からは見えない配管と昇降機の更新工事。マンションの寿命を延ばす重要局面。',
          },
    );
  }
  if (age >= 53) {
    scenes.push({
      id: 'parent-inheritance-home',
      code: 'SCENE 10C',
      title: '50代・実家の整理と親世代からのバトン',
      caption: '地方の実家の空き家整理や介護の節目。受け継いだ資産をどう活かすか家族で話し合う。',
    });
  }
  if (age >= 55) {
    scenes.push({
      id: 'age55-sunset-ledger',
      code: 'SCENE 11',
      title: '55歳・役職定年と夫婦の老後資金会議',
      caption: '夕暮れのダイニングで、定年までの残り年数とローン残債を見つめ直す夫婦の時間。',
    });
  }
  if (age >= 60) {
    scenes.push({
      id: 'age60-retirement',
      code: 'SCENE 12',
      title: '60歳・定年退職の花束と退職金明細',
      caption: '長年勤め上げた節目の花束。退職金で残債を消すか、老後資金に残すかの決断。',
    });
  }
  if (age >= 65) {
    scenes.push({
      id: 'senior-peaceful-walk',
      code: 'SCENE 13',
      title: '65歳からの年金生活・家庭菜園と穏やかな散歩道',
      caption: '白髪になった夫婦でマイホームの庭と街並みを歩く、セカンドライフの日々。',
    });
  }
  if (state.status === 'cleared') {
    scenes.push({
      id: 'paid-off-rainbow',
      code: 'FINAL SCENE',
      title: '祝・住宅ローン完全完済＆抵当権抹消登記の青空',
      caption: 'ついに借金ゼロの「完全な我が家」へ！青空に虹がかかる最高のフィナーレ。',
    });
  } else if (state.status === 'sold-escaped') {
    scenes.push({
      id: 'strategic-sold',
      code: 'FINAL SCENE',
      title: 'マイホーム売却精算・新しい暮らしへの引越し',
      caption: '自宅を時価で売却してローンを一括精算し、身軽になって次のステージへ。',
    });
  } else if (state.status === 'bankrupt') {
    scenes.push({
      id: 'foreclosure-rain',
      code: 'FINAL SCENE',
      title: '雨の夜・期限の利益喪失と競売通知書',
      caption: '資金ショートにより返済継続が不可能となり、マイホームを手放す結末に。',
    });
  }

  return scenes;
}

export function LifeScenePanoramaSvg({
  state,
  recentBadge,
}: {
  state: MortgageGameState;
  recentBadge: string | null;
}) {
  const prop = resolveEffectiveProperty(state.config);
  const latest = state.history[state.history.length - 1];
  const isOverLoan = latest ? latest.isOverLoan : false;
  const unlockedScenes = getUnlockedLifeScenes(state);
  const [manualSceneId, setManualSceneId] = useState<string | null>(null);

  const activeScene =
    (manualSceneId && unlockedScenes.find((s) => s.id === manualSceneId)) ||
    unlockedScenes[unlockedScenes.length - 1];

  const isNightScene =
    activeScene.id === 'cram-school-night' || activeScene.id === 'foreclosure-rain';
  const isSunsetScene =
    activeScene.id === 'age55-sunset-ledger' ||
    activeScene.id === 'age60-retirement' ||
    activeScene.id === 'tax-credit-autumn';
  const isStormScene = activeScene.id === 'boj-rate-storm';
  const isRepairScene =
    activeScene.id === 'mansion-major-repair' || activeScene.id === 'detached-paint-repair';

  return (
    <div className="space-y-2.5">
      <div className="relative overflow-hidden rounded border border-[#C7D2CE] bg-[#DFE8E4] dark:border-[#2A383D] dark:bg-[#11191D]">
        <svg
          viewBox="0 0 560 205"
          className="h-44 w-full select-none sm:h-52"
          role="img"
          aria-label={activeScene.title}
        >
          {/* 1. 背景の空（過程シーンに応じて朝・昼・夕焼け・夜・嵐・虹に変化） */}
          <rect
            width="560"
            height="145"
            className={
              isNightScene
                ? 'fill-[#15222E]'
                : isStormScene
                  ? 'fill-[#323E45]'
                  : isSunsetScene
                    ? 'fill-[#E8C5A5] dark:fill-[#38241E]'
                    : 'fill-[#DCE7E3] dark:fill-[#132128]'
            }
          />
          {/* 地面 */}
          <rect y="145" width="560" height="60" className="fill-[#C5D2CD] dark:fill-[#1B282D]" />
          {/* 道路 */}
          <rect y="168" width="560" height="24" className="fill-[#8FA19A]/50 dark:fill-[#141D21]" />

          {/* 完済時の祝福の虹 */}
          {activeScene.id === 'paid-off-rainbow' && (
            <g fill="none" strokeWidth="4" opacity="0.65">
              <path d="M 80 145 A 200 130 0 0 1 480 145" stroke="#E2678A" />
              <path d="M 88 145 A 192 122 0 0 1 472 145" stroke="#D9AF59" />
              <path d="M 96 145 A 184 114 0 0 1 464 145" stroke="#4CC0AF" />
            </g>
          )}

          {/* 太陽・月・雷雲 */}
          {isNightScene ? (
            <g>
              <circle cx="468" cy="36" r="14" className="fill-[#F3E2B3]" />
              <circle cx="474" cy="32" r="12" className="fill-[#15222E]" />
              <circle cx="120" cy="28" r="1.5" className="fill-white" />
              <circle cx="380" cy="22" r="1.5" className="fill-white" />
            </g>
          ) : isStormScene ? (
            <g>
              <ellipse cx="430" cy="36" rx="52" ry="18" className="fill-[#4A5A61]" />
              <ellipse cx="472" cy="42" rx="40" ry="15" className="fill-[#5F6E72]" />
              <polygon points="445,52 432,78 444,78 436,102 458,72 446,72" className="fill-[#F3E2B3]" />
            </g>
          ) : (
            <circle
              cx="465"
              cy="40"
              r="20"
              className={isSunsetScene ? 'fill-[#B0362B]/80' : 'fill-[#D9AF59]/85'}
            />
          )}

          {/* 遠景シルエット */}
          <g className="fill-[#B2C2BC] opacity-80 dark:fill-[#1E2E35]">
            <rect x="24" y="92" width="38" height="53" />
            <rect x="68" y="76" width="44" height="69" />
            <rect x="436" y="86" width="46" height="59" />
            <rect x="488" y="100" width="38" height="45" />
          </g>

          {/* 2. 中央のマイホーム（タワマン / マンション / 戸建て） */}
          {prop.buildingType === 'tower' ? (
            <g>
              <rect
                x="215"
                y="18"
                width="96"
                height="127"
                className="fill-[#13212A] stroke-[#0F6E68] dark:fill-[#253842] dark:stroke-[#4CC0AF]"
                strokeWidth="2"
              />
              {[30, 44, 58, 72, 86, 100, 114, 126].map((yPos) => (
                <g key={yPos} className="fill-[#F3E2B3]">
                  <rect x="227" y={yPos} width="14" height="7" />
                  <rect x="248" y={yPos} width="14" height="7" />
                  <rect x="269" y={yPos} width="14" height="7" />
                  <rect x="288" y={yPos} width="12" height="7" />
                </g>
              ))}
            </g>
          ) : prop.buildingType === 'mansion' ? (
            <g>
              <rect
                x="175"
                y="45"
                width="175"
                height="100"
                className="fill-[#F7FAF8] stroke-[#13212A] dark:fill-[#24343B] dark:stroke-[#A3B2AF]"
                strokeWidth="2"
              />
              {[63, 85, 107, 129].map((yPos) => (
                <g key={yPos}>
                  <line x1="180" y1={yPos} x2="345" y2={yPos} stroke="#0F6E68" strokeWidth="2.5" />
                  <rect x="192" y={yPos - 12} width="24" height="9" className="fill-[#D9AF59]/85" />
                  <rect x="232" y={yPos - 12} width="24" height="9" className="fill-[#0F6E68]/55" />
                  <rect x="272" y={yPos - 12} width="24" height="9" className="fill-[#D9AF59]/85" />
                  <rect x="310" y={yPos - 12} width="24" height="9" className="fill-[#0F6E68]/55" />
                </g>
              ))}
            </g>
          ) : (
            <g>
              <rect
                x="190"
                y="72"
                width="145"
                height="73"
                className="fill-[#F7FAF8] stroke-[#13212A] dark:fill-[#25343A] dark:stroke-[#E1E9E6]"
                strokeWidth="2"
              />
              <polygon
                points="176,74 262,30 348,74"
                className="fill-[#8C1D3C] stroke-[#13212A]"
                strokeWidth="2"
              />
              {/* 太陽光パネル（ZEHまたは後付け導入時） */}
              {(prop.energyCert === 'long-term-excellent' ||
                activeScene.id === 'detached-solar' ||
                state.triggeredEventIds.includes('prop-act-detached-solar-battery')) && (
                <polygon
                  points="264,35 334,71 264,71"
                  className="fill-[#0F6E68] stroke-[#F7FAF8]"
                  strokeWidth="1.2"
                />
              )}
              <rect
                x="210"
                y="88"
                width="32"
                height="24"
                className={
                  isNightScene
                    ? 'fill-[#FDE047] stroke-[#13212A]'
                    : 'fill-[#D9AF59]/85 stroke-[#13212A]'
                }
              />
              <rect
                x="284"
                y="88"
                width="32"
                height="24"
                className={
                  isNightScene
                    ? 'fill-[#FDE047] stroke-[#13212A]'
                    : 'fill-[#D9AF59]/85 stroke-[#13212A]'
                }
              />
              <rect x="252" y="103" width="22" height="42" className="fill-[#8C6A48] stroke-[#13212A]" />
            </g>
          )}

          {/* 3. 各過程シーン固有のイラスト演出（トラック・桜・足場・団信盾・犬の散歩など） */}
          {/* Scene: 引越しトラック到着 */}
          {activeScene.id === 'moving-in' && (
            <g transform="translate(362, 134)">
              <rect x="0" y="0" width="58" height="32" rx="2" className="fill-[#F7FAF8] stroke-[#13212A]" strokeWidth="1.5" />
              <rect x="58" y="10" width="22" height="22" rx="2" className="fill-[#0F6E68] stroke-[#13212A]" strokeWidth="1.5" />
              <text x="28" y="20" textAnchor="middle" className="fill-[#8C1D3C] font-mono text-[10px] font-black">
                引越便
              </text>
              <circle cx="16" cy="34" r="5" className="fill-[#13212A]" />
              <circle cx="66" cy="34" r="5" className="fill-[#13212A]" />
              {/* 段ボール箱 */}
              <rect x="-26" y="18" width="12" height="10" className="fill-[#C49A6C] stroke-[#13212A]" />
              <rect x="-12" y="14" width="10" height="14" className="fill-[#C49A6C] stroke-[#13212A]" />
            </g>
          )}

          {/* Scene: 大規模修繕・外壁塗装の足場とクレーン */}
          {isRepairScene && (
            <g>
              <rect
                x="170"
                y="34"
                width="186"
                height="111"
                className="fill-[#0F6E68]/15 stroke-[#A8730F]"
                strokeWidth="1.8"
                strokeDasharray="5,3"
              />
              <line x1="170" y1="72" x2="356" y2="72" stroke="#A8730F" strokeWidth="1.4" />
              <line x1="170" y1="110" x2="356" y2="110" stroke="#A8730F" strokeWidth="1.4" />
              <rect x="228" y="54" width="70" height="16" rx="2" className="fill-[#A8730F]" />
              <text x="263" y="65" textAnchor="middle" className="fill-white font-mono text-[9px] font-bold">
                修繕・塗装工事中
              </text>
            </g>
          )}

          {/* Scene: 団信発動・医療クロスと守護シールド */}
          {activeScene.id === 'health-danshin' && (
            <g transform="translate(368, 92)">
              <path
                d="M 28 0 L 56 10 L 56 32 C 56 50 28 62 28 62 C 28 62 0 50 0 32 L 0 10 Z"
                className="fill-[#0F6E68]/90 stroke-white"
                strokeWidth="2"
              />
              <rect x="23" y="16" width="10" height="28" fill="#FFFFFF" />
              <rect x="14" y="25" width="28" height="10" fill="#FFFFFF" />
            </g>
          )}

          {/* Scene: 途中利上げ速報・金利上昇ボード */}
          {(activeScene.id === 'mid-term-rate-hike' || activeScene.id === 'boj-rate-storm') && (
            <g transform="translate(364, 96)">
              <rect
                x="0"
                y="0"
                width="76"
                height="44"
                rx="3"
                className="fill-[#13212A] stroke-[#8C1D3C]"
                strokeWidth="1.8"
              />
              <polyline
                fill="none"
                stroke="#E2678A"
                strokeWidth="2.5"
                points="8,34 26,28 42,20 66,8"
              />
              <text x="38" y="40" textAnchor="middle" className="fill-[#F3E2B3] font-mono text-[8px] font-bold">
                利上げ速報
              </text>
            </g>
          )}

          {/* Scene: 繰上返済・新NISA資産成長バッジ */}
          {(activeScene.id === 'prepayment-milestone' ||
            activeScene.id === 'nisa-dividend-harvest') && (
            <g transform="translate(366, 98)">
              <rect
                x="0"
                y="0"
                width="74"
                height="40"
                rx="3"
                className="fill-[#0F6E68] stroke-[#D9AF59]"
                strokeWidth="1.8"
              />
              <text x="37" y="18" textAnchor="middle" className="fill-white font-mono text-[8.5px] font-bold">
                {activeScene.id === 'prepayment-milestone' ? '元金直接圧縮' : 'NISA複利成長'}
              </text>
              <text x="37" y="32" textAnchor="middle" className="fill-[#F3E2B3] font-mono text-[9px] font-bold">
                {activeScene.id === 'prepayment-milestone'
                  ? `累計-${Math.round(state.totalPrepaymentMan)}万`
                  : `貯蓄${Math.round(state.liquidSavingsMan)}万`}
              </text>
            </g>
          )}

          {/* Scene: 季節の木（桜・新緑・紅葉） */}
          <g>
            <rect x="132" y="118" width="6" height="27" className="fill-[#5E4630]" />
            <circle
              cx="135"
              cy="108"
              r="19"
              className={
                activeScene.id === 'nursery-spring' ||
                activeScene.id === 'elementary-sakura' ||
                activeScene.id === 'university-departure'
                  ? 'fill-[#E2678A]'
                  : activeScene.id === 'tax-credit-autumn' || isSunsetScene
                    ? 'fill-[#D9AF59]'
                    : 'fill-[#2B7A4E]'
              }
            />
          </g>

          {/* 庭先の家族ミニシルエット＆愛犬（シニア期・子育て期） */}
          <g transform="translate(358, 138)">
            <circle cx="12" cy="8" r="5" className="fill-[#13212A] dark:fill-[#E1E9E6]" />
            <rect x="8" y="13" width="8" height="14" rx="2" className="fill-[#0F6E68]" />
            {state.subIncomeMan > 0 && !state.isDivorced && (
              <g transform="translate(16, 1)">
                <circle cx="10" cy="8" r="4.5" className="fill-[#13212A] dark:fill-[#E1E9E6]" />
                <rect x="6" y="13" width="8" height="13" rx="2" className="fill-[#8C1D3C]" />
              </g>
            )}
            {activeScene.id === 'senior-peaceful-walk' && (
              <g transform="translate(38, 15)">
                <ellipse cx="8" cy="7" rx="7" ry="4.5" className="fill-[#C49A6C]" />
                <circle cx="14" cy="4" r="3.5" className="fill-[#C49A6C]" />
              </g>
            )}
          </g>

          {/* 左上ステータスカード */}
          <g transform="translate(12, 12)">
            <rect
              width="174"
              height="52"
              rx="3"
              className="fill-[#F7FAF8]/95 stroke-[#C7D2CE] dark:fill-[#141D21]/95 dark:stroke-[#2A383D]"
            />
            <text x="9" y="17" className="fill-[#5F6E72] font-mono text-[9px] font-bold dark:fill-[#8A9A96]">
              ローン残債 / 自宅時価
            </text>
            <text x="9" y="33" className="fill-[#13212A] font-mono text-[12px] font-bold dark:fill-[#E1E9E6]">
              残 {Math.round(state.remainingBalanceMan).toLocaleString()}万 / 価{' '}
              {state.propertyValueMan.toLocaleString()}万
            </text>
            <text
              x="9"
              y="46"
              className={`font-mono text-[9.5px] font-bold ${
                isOverLoan
                  ? 'fill-[#B0362B] dark:fill-[#F07B6B]'
                  : 'fill-[#0F6E68] dark:fill-[#4CC0AF]'
              }`}
            >
              {isOverLoan
                ? `▲ オーバーローン (-${Math.round(state.remainingBalanceMan - state.propertyValueMan)}万)`
                : `● アンダーローン (+${Math.round(state.propertyValueMan - state.remainingBalanceMan)}万)`}
            </text>
          </g>

          {/* 右上マクロ金利カード */}
          <g transform="translate(374, 12)">
            <rect
              width="174"
              height="52"
              rx="3"
              className="fill-[#F7FAF8]/95 stroke-[#C7D2CE] dark:fill-[#141D21]/95 dark:stroke-[#2A383D]"
            />
            <text x="9" y="17" className="fill-[#5F6E72] font-mono text-[9px] font-bold dark:fill-[#8A9A96]">
              日銀政策金利 / 適用金利
            </text>
            <text x="9" y="34" className="fill-[#8C1D3C] font-mono text-[12px] font-bold dark:fill-[#E2678A]">
              政策 {state.bojPolicyRate.toFixed(2)}% → 適用 {state.appliedInterestRate.toFixed(2)}%
            </text>
            <text x="9" y="46" className="fill-[#4A5A61] font-mono text-[9.5px] dark:fill-[#A3B2AF]">
              手元資金: {Math.round(state.liquidSavingsMan).toLocaleString()}万円
            </text>
          </g>

          {/* 下部シーンタイトル帯 */}
          <rect y="180" width="560" height="25" className="fill-[#13212A]/85 dark:fill-[#0D1316]/90" />
          <text x="12" y="196" className="fill-[#D9AF59] font-mono text-[10px] font-bold">
            {activeScene.code} · {activeScene.title}
          </text>
        </svg>

        {recentBadge && (
          <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded border border-[#8C1D3C] bg-[#13212A]/95 px-3.5 py-1 font-mono text-xs font-semibold text-white shadow-lg">
            {recentBadge}
          </div>
        )}
      </div>

      {/* 過程の絵ギャラリー切替チップ（歩んできた場面をタップでいつでも振り返り可能！） */}
      <div className="rounded border border-[#DCE4E1] bg-[#F0F4F2] p-2.5 dark:border-[#1D282C] dark:bg-[#1A2428]">
        <div className="flex items-center justify-between text-[11px] text-[#5F6E72] dark:text-[#8A9A96]">
          <span className="font-semibold text-[#13212A] dark:text-[#E1E9E6]">
            {activeScene.title}
          </span>
          <span className="font-mono">場面アルバム ({unlockedScenes.length}場面解放)</span>
        </div>
        <p className="mt-0.5 text-xs text-[#4A5A61] dark:text-[#A3B2AF]">{activeScene.caption}</p>
        {unlockedScenes.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unlockedScenes.map((sc, i) => {
              const isSelected = activeScene.id === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() =>
                    setManualSceneId(
                      i === unlockedScenes.length - 1 ? null : sc.id,
                    )
                  }
                  className={`rounded px-2.5 py-1 text-left font-mono text-[10.5px] font-semibold transition ${
                    isSelected
                      ? 'bg-[#0F6E68] text-white dark:bg-[#4CC0AF] dark:text-[#0D1316]'
                      : 'bg-[#F7FAF8] text-[#4A5A61] hover:text-[#13212A] dark:bg-[#141D21] dark:text-[#A3B2AF]'
                  }`}
                >
                  {i + 1}. {sc.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 5. 年齢別「人生地図（1マス＝1年）」カラーグリッド
 */
export function LifeMapGrid({
  history,
  termYears,
  startAge,
}: {
  history: YearlySnapshot[];
  termYears: number;
  startAge: number;
}) {
  const [selectedYearIdx, setSelectedYearIdx] = useState<number | null>(null);
  const totalCells = Math.max(termYears, history.length);
  const cells = Array.from({ length: totalCells }, (_, i) => i + 1);
  const activeSnap =
    selectedYearIdx !== null
      ? history.find((h) => h.yearIndex === selectedYearIdx) ?? history[history.length - 1]
      : history[history.length - 1];

  return (
    <div>
      <div className="grid grid-cols-10 gap-1.5">
        {cells.map((yr) => {
          const snap = history.find((h) => h.yearIndex === yr);
          const isCurrent = history.length === yr;
          let bgClass = 'bg-[#DCE4E1] text-[#5F6E72] dark:bg-[#1D282C] dark:text-[#8A9A96]';
          if (snap) {
            if (snap.remainingBalanceMan <= 0) {
              bgClass = 'bg-[#0F6E68] text-white dark:bg-[#4CC0AF] dark:text-[#0D1316]';
            } else if (snap.annualCashFlowMan >= 60) {
              bgClass = 'bg-[#2B7A4E] text-white dark:bg-[#5CC38B] dark:text-[#0D1316]';
            } else if (snap.annualCashFlowMan >= 0) {
              bgClass = 'bg-[#7FBF86] text-[#13212A] dark:bg-[#2A8A80] dark:text-white';
            } else if (snap.annualCashFlowMan >= -90) {
              bgClass = 'bg-[#F3E2B3] text-[#13212A] dark:bg-[#A8730F] dark:text-white';
            } else {
              bgClass = 'bg-[#B0362B] text-white dark:bg-[#F07B6B] dark:text-[#1B0910]';
            }
          }

          return (
            <button
              key={yr}
              type="button"
              onClick={() => snap && setSelectedYearIdx(yr)}
              title={
                snap
                  ? `${snap.age}歳（${yr}年目）: 収支 ${snap.annualCashFlowMan >= 0 ? '+' : ''}${snap.annualCashFlowMan}万 / 残債 ${Math.round(snap.remainingBalanceMan)}万`
                  : `${startAge + yr}歳（${yr}年目・未到達）`
              }
              className={`flex h-7 items-center justify-center rounded-[2px] font-mono text-[10px] font-semibold transition ${bgClass} ${
                isCurrent ? 'ring-2 ring-[#8C1D3C] dark:ring-[#E2678A]' : ''
              }`}
            >
              {startAge + yr}
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-[#4A5A61] dark:text-[#A3B2AF]">
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-[1px] bg-[#2B7A4E]" /> 順調黒字
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-[1px] bg-[#7FBF86]" /> 収支均衡
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-[1px] bg-[#F3E2B3]" /> 試練・小幅赤字
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-[1px] bg-[#B0362B]" /> 貯蓄取崩し危機
        </span>
      </div>

      {activeSnap && (
        <div className="mt-2.5 rounded border border-[#C7D2CE] bg-[#F0F4F2] p-2.5 text-xs dark:border-[#2A383D] dark:bg-[#1A2428]">
          <div className="flex items-center justify-between font-mono font-semibold text-[#13212A] dark:text-[#E1E9E6]">
            <span>
              {activeSnap.age}歳（返済{activeSnap.yearIndex}年目 · {activeSnap.calendarYear}年）
            </span>
            <span
              className={
                activeSnap.annualCashFlowMan >= 0
                  ? 'text-[#2B7A4E] dark:text-[#5CC38B]'
                  : 'text-[#B0362B] dark:text-[#F07B6B]'
              }
            >
              年間収支 {activeSnap.annualCashFlowMan >= 0 ? '+' : ''}
              {activeSnap.annualCashFlowMan}万円
            </span>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 font-mono text-[11px] text-[#4A5A61] dark:text-[#A3B2AF]">
            <span>残債: {Math.round(activeSnap.remainingBalanceMan).toLocaleString()}万</span>
            <span>自宅時価: {activeSnap.propertyValueMan.toLocaleString()}万</span>
            <span>手元資金: {Math.round(activeSnap.liquidSavingsMan).toLocaleString()}万</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 6. 今年の家計収支ウォーターフォール内訳バー
 */
export function AnnualCashFlowBreakdownDiagram({ state }: { state: MortgageGameState }) {
  const latest = state.history[state.history.length - 1];
  if (!latest) {
    return (
      <div className="rounded border border-[#C7D2CE] bg-[#F0F4F2] p-3 text-xs text-[#4A5A61] dark:border-[#2A383D] dark:bg-[#1A2428] dark:text-[#A3B2AF]">
        初年度の引き落とし開始前です。「+1年送る」または「自動再生」で年次収支図が表示されます。
      </div>
    );
  }

  const totalInflow = Math.max(1, latest.householdNetIncomeMan + latest.annualTaxCreditMan);
  const totalOutflow = Math.max(
    1,
    latest.annualPrincipalPaidMan +
      latest.annualInterestPaidMan +
      latest.annualRunningCostMan +
      latest.annualLivingAndEduCostMan,
  );
  const maxBar = Math.max(totalInflow, totalOutflow, 1);

  const pPrin = Math.round((latest.annualPrincipalPaidMan / maxBar) * 100);
  const pInt = Math.round((latest.annualInterestPaidMan / maxBar) * 100);
  const pRun = Math.round((latest.annualRunningCostMan / maxBar) * 100);
  const pLiv = Math.max(5, Math.round((latest.annualLivingAndEduCostMan / maxBar) * 100));

  return (
    <div className="space-y-2.5 text-xs">
      <div>
        <div className="mb-1 flex justify-between font-mono text-[11px]">
          <span className="font-semibold text-[#13212A] dark:text-[#E1E9E6]">
            手取り収入＋住宅ローン控除
          </span>
          <span className="font-bold text-[#0F6E68] dark:text-[#4CC0AF]">
            +{Math.round(totalInflow)}万円/年
          </span>
        </div>
        <div className="flex h-4 w-full overflow-hidden rounded-[2px] bg-[#DCE4E1] dark:bg-[#1D282C]">
          <div
            style={{ width: `${Math.round((latest.householdNetIncomeMan / maxBar) * 100)}%` }}
            className="bg-[#0F6E68] dark:bg-[#4CC0AF]"
            title={`手取り年収 ${latest.householdNetIncomeMan}万円`}
          />
          {latest.annualTaxCreditMan > 0 && (
            <div
              style={{
                width: `${Math.max(3, Math.round((latest.annualTaxCreditMan / maxBar) * 100))}%`,
              }}
              className="bg-[#D9AF59]"
              title={`住宅ローン控除還付 +${latest.annualTaxCreditMan}万円`}
            />
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between font-mono text-[11px]">
          <span className="font-semibold text-[#13212A] dark:text-[#E1E9E6]">
            年間総支出（ローン・維持費・生活教育）
          </span>
          <span className="font-bold text-[#8C1D3C] dark:text-[#E2678A]">
            -{Math.round(totalOutflow)}万円/年
          </span>
        </div>
        <div className="flex h-4 w-full overflow-hidden rounded-[2px] bg-[#DCE4E1] dark:bg-[#1D282C]">
          <div
            style={{ width: `${pPrin}%` }}
            className="bg-[#2B7A4E]"
            title={`ローン元金返済 ${latest.annualPrincipalPaidMan}万円`}
          />
          <div
            style={{ width: `${pInt}%` }}
            className="bg-[#B0362B]"
            title={`ローン利息支払 ${latest.annualInterestPaidMan}万円`}
          />
          <div
            style={{ width: `${pRun}%` }}
            className="bg-[#A8730F]"
            title={`管理修繕・固定資産税 ${latest.annualRunningCostMan}万円`}
          />
          <div
            style={{ width: `${pLiv}%` }}
            className="bg-[#5F6E72]"
            title={`基本生活費・教育費 ${latest.annualLivingAndEduCostMan}万円`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1 font-mono text-[11px] text-[#4A5A61] dark:text-[#A3B2AF]">
        <div className="flex items-center justify-between rounded bg-[#F0F4F2] px-2 py-1 dark:bg-[#1A2428]">
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-2 w-2 bg-[#2B7A4E]" /> 元金充当
          </span>
          <b>{latest.annualPrincipalPaidMan}万</b>
        </div>
        <div className="flex items-center justify-between rounded bg-[#F0F4F2] px-2 py-1 dark:bg-[#1A2428]">
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-2 w-2 bg-[#B0362B]" /> 銀行利息
          </span>
          <b>{latest.annualInterestPaidMan}万</b>
        </div>
        <div className="flex items-center justify-between rounded bg-[#F0F4F2] px-2 py-1 dark:bg-[#1A2428]">
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-2 w-2 bg-[#A8730F]" /> 管理修繕・税
          </span>
          <b>{latest.annualRunningCostMan}万</b>
        </div>
        <div className="flex items-center justify-between rounded bg-[#F0F4F2] px-2 py-1 dark:bg-[#1A2428]">
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-2 w-2 bg-[#5F6E72]" /> 生活・教育費
          </span>
          <b>{latest.annualLivingAndEduCostMan}万</b>
        </div>
      </div>
    </div>
  );
}

/**
 * 7. マルチ視点グラフ＆図解パネル
 */
export function MultiPerspectiveCharts({ state }: { state: MortgageGameState }) {
  const [tab, setTab] = useState<'balance' | 'payment' | 'survival'>('balance');
  const snapshots = state.history;
  const maxYears = state.config.termYears;
  const width = 520;
  const height = 195;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxVal = Math.max(
    state.underwriting.loanPrincipalMan,
    state.propertyValueMan,
    ...snapshots.map((s) =>
      Math.max(s.remainingBalanceMan, s.propertyValueMan, s.liquidSavingsMan),
    ),
    3000,
  );

  const xOf = (yr: number) => padL + (yr / Math.max(1, maxYears)) * plotW;
  const yOf = (val: number) => padT + plotH - (Math.max(-500, val) / (maxVal + 500)) * plotH;

  const debtPoints = [
    `${xOf(0)},${yOf(state.underwriting.loanPrincipalMan)}`,
    ...snapshots.map((s) => `${xOf(s.yearIndex)},${yOf(s.remainingBalanceMan + s.unpaidInterestMan)}`),
  ].join(' ');

  const effectiveProp = resolveEffectiveProperty(state.config);
  const propPoints = [
    `${xOf(0)},${yOf(effectiveProp.priceMan * 0.92)}`,
    ...snapshots.map((s) => `${xOf(s.yearIndex)},${yOf(s.propertyValueMan)}`),
  ].join(' ');

  const cashPoints = [
    `${xOf(0)},${yOf(state.underwriting.cashRemainingAfterPurchaseMan)}`,
    ...snapshots.map((s) => `${xOf(s.yearIndex)},${yOf(s.liquidSavingsMan)}`),
  ].join(' ');

  return (
    <div>
      <div className="mb-3 flex overflow-hidden rounded-[3px] border border-[#C7D2CE] bg-[#F0F4F2] text-xs dark:border-[#2A383D] dark:bg-[#1A2428]">
        <button
          type="button"
          onClick={() => setTab('balance')}
          className={`flex-1 px-2 py-1.5 font-semibold transition ${
            tab === 'balance'
              ? 'bg-[#13212A] text-white dark:bg-[#E1E9E6] dark:text-[#0D1316]'
              : 'text-[#4A5A61] hover:text-[#13212A] dark:text-[#A3B2AF]'
          }`}
        >
          残債 vs 自宅時価
        </button>
        <button
          type="button"
          onClick={() => setTab('payment')}
          className={`flex-1 border-l border-[#C7D2CE] px-2 py-1.5 font-semibold transition dark:border-[#2A383D] ${
            tab === 'payment'
              ? 'bg-[#13212A] text-white dark:bg-[#E1E9E6] dark:text-[#0D1316]'
              : 'text-[#4A5A61] hover:text-[#13212A] dark:text-[#A3B2AF]'
          }`}
        >
          元金・利息の推移
        </button>
        <button
          type="button"
          onClick={() => setTab('survival')}
          className={`flex-1 border-l border-[#C7D2CE] px-2 py-1.5 font-semibold transition dark:border-[#2A383D] ${
            tab === 'survival'
              ? 'bg-[#13212A] text-white dark:bg-[#E1E9E6] dark:text-[#0D1316]'
              : 'text-[#4A5A61] hover:text-[#13212A] dark:text-[#A3B2AF]'
          }`}
        >
          完済サバイバル曲線
        </button>
      </div>

      {tab === 'balance' && (
        <div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
            {[0, 0.25, 0.5, 0.75, 1].map((r) => {
              const val = Math.round(maxVal * r);
              const y = yOf(val);
              return (
                <g key={r}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={width - padR}
                    y2={y}
                    stroke="currentColor"
                    className="text-[#DCE4E1] dark:text-[#2A383D]"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={padL - 5}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-[#5F6E72] font-mono text-[9px] dark:fill-[#8A9A96]"
                  >
                    {val}万
                  </text>
                </g>
              );
            })}
            <polyline fill="none" stroke="#2B7A4E" strokeWidth="2.5" points={propPoints} />
            <polyline fill="none" stroke="#B0362B" strokeWidth="2.8" points={debtPoints} />
            <polyline
              fill="none"
              stroke="#0F6E68"
              strokeWidth="2.2"
              strokeDasharray="4,3"
              points={cashPoints}
            />
            {[0, 10, 20, 30, maxYears].map((yr) => (
              <text
                key={yr}
                x={xOf(yr)}
                y={height - 6}
                textAnchor="middle"
                className="fill-[#5F6E72] font-mono text-[9px] dark:fill-[#8A9A96]"
              >
                {yr}年
              </text>
            ))}
          </svg>
          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-[#4A5A61] dark:text-[#A3B2AF]">
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-2 w-3 bg-[#B0362B]" /> ローン残債
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-2 w-3 bg-[#2B7A4E]" /> 自宅売却時価
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-2 w-3 bg-[#0F6E68]" /> 手元金融資産
            </span>
          </div>
        </div>
      )}

      {tab === 'payment' && (
        <div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
            {snapshots.map((s) => {
              const barW = Math.max(4, plotW / Math.max(35, maxYears) - 2);
              const x = xOf(s.yearIndex) - barW / 2;
              const maxBarVal = 480;
              const hPrin = Math.min(plotH, (s.annualPrincipalPaidMan / maxBarVal) * plotH);
              const hInt = Math.min(plotH - hPrin, (s.annualInterestPaidMan / maxBarVal) * plotH);
              const hRun = Math.min(
                plotH - hPrin - hInt,
                (s.annualRunningCostMan / maxBarVal) * plotH,
              );
              const baseLine = padT + plotH;
              return (
                <g key={s.yearIndex}>
                  <rect
                    x={x}
                    y={baseLine - hPrin}
                    width={barW}
                    height={hPrin}
                    className="fill-[#2B7A4E]"
                  />
                  <rect
                    x={x}
                    y={baseLine - hPrin - hInt}
                    width={barW}
                    height={hInt}
                    className="fill-[#B0362B]"
                  />
                  <rect
                    x={x}
                    y={baseLine - hPrin - hInt - hRun}
                    width={barW}
                    height={hRun}
                    className="fill-[#A8730F]"
                  />
                </g>
              );
            })}
            <line
              x1={padL}
              y1={padT + plotH}
              x2={width - padR}
              y2={padT + plotH}
              stroke="#C7D2CE"
            />
          </svg>
          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-[#4A5A61] dark:text-[#A3B2AF]">
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-2 w-3 bg-[#2B7A4E]" /> 元金返済額
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-2 w-3 bg-[#B0362B]" /> 消える銀行利息
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-2 w-3 bg-[#A8730F]" /> 管理修繕・固定資産税
            </span>
          </div>
        </div>
      )}

      {tab === 'survival' && (
        <div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
            {[100, 80, 60, 40].map((pct) => {
              const y = padT + plotH - ((pct - 30) / 70) * plotH;
              return (
                <g key={pct}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={width - padR}
                    y2={y}
                    stroke="currentColor"
                    className="text-[#DCE4E1] dark:text-[#2A383D]"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={padL - 5}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-[#5F6E72] font-mono text-[9px] dark:fill-[#8A9A96]"
                  >
                    {pct}%
                  </text>
                </g>
              );
            })}
            <polyline
              fill="none"
              stroke="#0F6E68"
              strokeWidth="2.5"
              points={Array.from({ length: maxYears + 1 }, (_, yr) => {
                const survPct = Math.max(52, 100 - yr * 0.65 - (yr > 13 ? (yr - 13) * 0.45 : 0));
                const y = padT + plotH - ((survPct - 30) / 70) * plotH;
                return `${xOf(yr)},${y}`;
              }).join(' ')}
            />
            {(() => {
              const yr = state.yearIndex;
              const survPct = Math.max(52, 100 - yr * 0.65 - (yr > 13 ? (yr - 13) * 0.45 : 0));
              const y = padT + plotH - ((survPct - 30) / 70) * plotH;
              return (
                <g>
                  <circle cx={xOf(yr)} cy={y} r="5.5" className="fill-[#8C1D3C] dark:fill-[#E2678A]" />
                  <text
                    x={Math.min(width - 75, xOf(yr) + 8)}
                    y={y - 6}
                    className="fill-[#8C1D3C] font-mono text-[10px] font-bold dark:fill-[#E2678A]"
                  >
                    現在 {state.age}歳（継続率 {survPct.toFixed(1)}%）
                  </text>
                </g>
              );
            })()}
          </svg>
          <p className="mt-1 text-[11px] text-[#4A5A61] dark:text-[#A3B2AF]">
            同じ年に住宅ローンを借りた世帯のうち、リスケや任意売却・破綻に陥らず当初計画どおり返済を続けられている割合の推計曲線です。
          </p>
        </div>
      )}
    </div>
  );
}
