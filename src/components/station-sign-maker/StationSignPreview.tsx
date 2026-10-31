"use client";

import { StationSignState, StationTemplate } from '@/types';
import React from 'react';

interface StationSignPreviewProps {
  stationState: StationSignState;
  template: StationTemplate;
}

const safeLineColor = (color: string) => /^#[0-9a-f]{6}$/i.test(color) ? color : '#009b40';

const ClassicBoardTemplate: React.FC<{ s: StationSignState }> = ({ s }) => (
  <div id="station-sign-card" className="font-sans bg-white p-2 rounded-lg shadow-md aspect-[16/5] w-full flex flex-col justify-between">
    <div className="flex justify-between items-center text-gray-800">
      <div className="flex items-baseline space-x-1">
        <span className="text-sm sm:text-lg font-bold break-words" style={{fontFamily: "'M PLUS Rounded 1c', sans-serif"}}>{s.prevStation}</span>
        <span className="text-xs">mae</span>
      </div>
      <div className="flex items-baseline space-x-1">
        <span className="text-sm sm:text-lg font-bold break-words" style={{fontFamily: "'M PLUS Rounded 1c', sans-serif"}}>{s.nextStation}</span>
        <span className="text-xs">tsugi</span>
      </div>
    </div>
    <div className="flex-grow flex flex-col items-center justify-center -mt-2">
      <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-stone-900 px-2 py-0.5 text-[9px] font-black tracking-wider text-white">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: safeLineColor(s.lineColor) }} aria-hidden="true" />
        {s.lineSymbol || 'SK'} {s.stationNumber || '01'}
      </div>
      <p className="text-xs tracking-wider">{s.roman}</p>
      <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-gray-900 -my-2 break-words max-w-full" style={{fontFamily: "'M PLUS Rounded 1c', sans-serif"}}>{s.station}</h2>
    </div>
    <div className="h-4 rounded-full" style={{ backgroundColor: safeLineColor(s.lineColor) }}></div>
  </div>
);

const CircleLineTemplate: React.FC<{ s: StationSignState }> = ({ s }) => (
  <div id="station-sign-card" className="font-sans bg-white p-2 rounded-lg shadow-md aspect-[16/5] w-full flex items-center">
    <div className="w-24 h-24 rounded-full flex flex-col justify-center items-center text-white" style={{ backgroundColor: safeLineColor(s.lineColor) }}>
      <span className="text-xl font-bold -mb-1">{s.lineSymbol || 'SK'}</span>
      <span className="text-2xl font-bold">{s.stationNumber || '01'}</span>
    </div>
    <div className="flex-grow flex flex-col items-center justify-center">
       <p className="text-xs tracking-wider">{s.roman}</p>
      <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 break-words max-w-full" style={{fontFamily: "'M PLUS Rounded 1c', sans-serif"}}>{s.station}</h2>
    </div>
     <div className="w-20 text-center">
        <p className="text-sm font-bold text-gray-500">{s.nextStation}</p>
        <p className="text-xs text-gray-400">tsugi</p>
    </div>
  </div>
);

const MinimalTemplate: React.FC<{ s: StationSignState }> = ({ s }) => (
  <div id="station-sign-card" className="font-sans bg-black text-white p-4 rounded-lg shadow-md aspect-[16/5] w-full flex flex-col justify-center items-center">
    <div className="mb-1 inline-flex items-center gap-1 rounded-full border border-white/30 px-2 py-0.5 text-[9px] font-black tracking-wider">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: safeLineColor(s.lineColor) }} aria-hidden="true" />
      {s.lineSymbol || 'SK'} {s.stationNumber || '01'}
    </div>
    <h2 className="text-4xl sm:text-6xl md:text-7xl font-black break-words max-w-full" style={{fontFamily: "'M PLUS Rounded 1c', sans-serif"}}>{s.station}</h2>
    <div className="w-full h-1 my-2" style={{ backgroundColor: safeLineColor(s.lineColor) }}></div>
    <div className="w-full flex justify-between">
        <span className="text-lg font-bold">{s.prevStation}</span>
        <span className="text-lg font-bold">{s.nextStation}</span>
    </div>
  </div>
);


export const StationSignPreview: React.FC<StationSignPreviewProps> = ({ stationState, template }) => {
  const renderTemplate = () => {
    switch (template) {
      case 'classic':
        return <ClassicBoardTemplate s={stationState} />;
      case 'circle':
        return <CircleLineTemplate s={stationState} />;
      case 'minimal':
        return <MinimalTemplate s={stationState} />;
      default:
        return <ClassicBoardTemplate s={stationState} />;
    }
  };

  return <div className="w-full">{renderTemplate()}</div>;
};
