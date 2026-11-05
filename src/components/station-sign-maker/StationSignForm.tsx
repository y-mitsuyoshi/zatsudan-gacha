"use client";

import { StationSignState } from '@/types';
import React from 'react';
import { toRomaji } from 'wanakana';

interface StationSignFormProps {
 stationState: StationSignState;
 setStationState: React.Dispatch<React.SetStateAction<StationSignState>>;
}

const COLOR_PRESETS = [
 { name: 'フォレストグリーン', color: '#009b40' },
 { name: 'オーシャンブルー', color: '#1e88e5' },
 { name: 'サンライズ', color: '#f97316' },
 { name: 'ローズ', color: '#e11d48' },
 { name: 'パープル', color: '#7c3aed' },
 { name: 'モノクロ', color: '#1f2937' },
];

export const StationSignForm: React.FC<StationSignFormProps> = ({ stationState, setStationState }) => {
 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;

  if (name === 'station') {
   const roman = toRomaji(value).toUpperCase();
   setStationState(prevState => ({ ...prevState, station: value, roman }));
   return;
  }

  if (name === 'lineSymbol') {
   setStationState(prevState => ({ ...prevState, lineSymbol: value.toUpperCase().slice(0, 3) }));
   return;
  }

  if (name === 'stationNumber') {
   setStationState(prevState => ({ ...prevState, stationNumber: value.slice(0, 4) }));
   return;
  }

  setStationState(prevState => ({ ...prevState, [name]: value }));
 };

 return (
  <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
   <div>
    <label htmlFor="station" className="mb-1 block text-sm font-bold text-[var(--ink)]">
     駅名（中央）
    </label>
    <input
     type="text"
     name="station"
     id="station"
     maxLength={10}
     value={stationState.station}
     onChange={handleChange}
     className="w-full rounded-sm border border-[var(--line-strong)] bg-[var(--paper-strong)] px-3 py-2.5 text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30  "
     placeholder="例: 東京"
    />
    <div className="mt-1 flex items-center justify-between text-[10px] font-medium">
     <span className="text-[var(--ink-soft)]">中央に大きく表示されます</span>
     <span className="text-[var(--ink-soft)]">{stationState.station.length}/10</span>
    </div>
   </div>

   <div>
    <label htmlFor="roman" className="mb-1 block text-sm font-bold text-[var(--ink)]">
     ローマ字
    </label>
    <input
     type="text"
     name="roman"
     id="roman"
     maxLength={30}
     value={stationState.roman}
     onChange={handleChange}
     className="w-full rounded-sm border border-[var(--line-strong)] bg-[var(--paper-strong)] px-3 py-2.5 font-mono text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30  "
     placeholder="例: TOKYO"
    />
   </div>

   <div className="grid grid-cols-2 gap-3">
    <div>
     <label htmlFor="prevStation" className="mb-1 block text-sm font-bold text-[var(--ink)]">
      前の駅
     </label>
     <input
      type="text"
      name="prevStation"
      id="prevStation"
      maxLength={10}
      value={stationState.prevStation}
      onChange={handleChange}
      className="w-full rounded-sm border border-[var(--line-strong)] bg-[var(--paper-strong)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30  "
      placeholder="例: 神田"
     />
    </div>
    <div>
     <label htmlFor="nextStation" className="mb-1 block text-sm font-bold text-[var(--ink)]">
      次の駅
     </label>
     <input
      type="text"
      name="nextStation"
      id="nextStation"
      maxLength={10}
      value={stationState.nextStation}
      onChange={handleChange}
      className="w-full rounded-sm border border-[var(--line-strong)] bg-[var(--paper-strong)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30  "
      placeholder="例: 有楽町"
     />
    </div>
   </div>

   <div className="rounded-sm border border-dashed border-[var(--line-strong)] bg-[var(--paper-muted)] p-3 ">
    <p className="mb-2 text-xs font-black tracking-widest text-[var(--ink-soft)]">駅ナンバリング</p>
    <div className="grid grid-cols-2 gap-3">
     <div>
      <label htmlFor="lineSymbol" className="mb-1 block text-[11px] font-bold text-[var(--ink-soft)]">
       路線記号
      </label>
      <input
       type="text"
       name="lineSymbol"
       id="lineSymbol"
       maxLength={3}
       value={stationState.lineSymbol}
       onChange={handleChange}
       className="w-full rounded-sm border border-[var(--line-strong)] bg-[var(--paper-strong)] px-3 py-2 text-center font-mono text-lg font-black uppercase text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30  "
       placeholder="SK"
      />
     </div>
     <div>
      <label htmlFor="stationNumber" className="mb-1 block text-[11px] font-bold text-[var(--ink-soft)]">
       駅番号
      </label>
      <input
       type="text"
       name="stationNumber"
       id="stationNumber"
       maxLength={4}
       value={stationState.stationNumber}
       onChange={handleChange}
       className="w-full rounded-sm border border-[var(--line-strong)] bg-[var(--paper-strong)] px-3 py-2 text-center font-mono text-lg font-black text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30  "
       placeholder="01"
      />
     </div>
    </div>
   </div>

   <div>
    <label htmlFor="lineColor" className="mb-1 block text-sm font-bold text-[var(--ink)]">
     路線カラー
    </label>
    <div className="flex items-center gap-2">
     <input
      type="color"
      name="lineColor"
      id="lineColor"
      value={stationState.lineColor}
      onChange={handleChange}
      className="h-10 w-10 cursor-pointer rounded-md border-none p-0"
     />
     <input
      type="text"
      value={stationState.lineColor}
      onChange={handleChange}
      onBlur={() => {
       if (!/^#[0-9a-f]{6}$/i.test(stationState.lineColor)) {
        setStationState(prev => ({ ...prev, lineColor: '#009b40' }));
       }
      }}
      name="lineColor"
      id="lineColorText"
      aria-label="路線カラー（16進数）"
      maxLength={7}
      className="min-w-0 flex-1 rounded-sm border border-[var(--line-strong)] bg-[var(--paper-strong)] px-3 py-2 font-mono text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30  "
      placeholder="#009b40"
     />
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">
     {COLOR_PRESETS.map((preset) => (
      <button
       key={preset.color}
       type="button"
       onClick={() => setStationState(prev => ({ ...prev, lineColor: preset.color }))}
       className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
        stationState.lineColor.toLowerCase() === preset.color.toLowerCase()
         ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
         : 'border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink-soft)] hover:border-[var(--accent)]'
       }`}
      >
       <span className="h-2.5 w-2.5 rounded-full border border-white " style={{ backgroundColor: preset.color }} aria-hidden="true" />
       {preset.name}
      </button>
     ))}
    </div>
   </div>
  </form>
 );
};
