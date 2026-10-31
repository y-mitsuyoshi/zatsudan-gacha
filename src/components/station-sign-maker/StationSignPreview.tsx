"use client";

import { StationSignState, StationTemplate } from '@/types';
import React from 'react';

interface StationSignPreviewProps {
  stationState: StationSignState;
  template: StationTemplate;
}

const safeLineColor = (color: string) => /^#[0-9a-f]{6}$/i.test(color) ? color : '#009b40';

const JREastTemplate: React.FC<{ s: StationSignState }> = ({ s }) => (
  <div id="station-sign-card" className="font-sans bg-white p-2 rounded-lg shadow-md aspect-[4/1] w-full flex flex-col justify-between">
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
    <div className="flex-grow flex flex-col items-center justify-center -mt-4">
      <p className="text-xs tracking-wider">{s.roman}</p>
      <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-gray-900 -my-2 break-words max-w-full" style={{fontFamily: "'M PLUS Rounded 1c', sans-serif"}}>{s.station}</h2>
    </div>
    <div className="h-4 rounded-full" style={{ backgroundColor: safeLineColor(s.lineColor) }}></div>
  </div>
);

const TokyoMetroTemplate: React.FC<{ s: StationSignState }> = ({ s }) => (
  <div id="station-sign-card" className="font-sans bg-white p-2 rounded-lg shadow-md aspect-[4/1] w-full flex items-center">
    <div className="w-24 h-24 rounded-full flex flex-col justify-center items-center text-white" style={{ backgroundColor: safeLineColor(s.lineColor) }}>
      <span className="text-2xl font-bold -mb-1">T</span>
      <span className="text-4xl font-bold">12</span>
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

const SimpleTemplate: React.FC<{ s: StationSignState }> = ({ s }) => (
  <div id="station-sign-card" className="font-sans bg-black text-white p-4 rounded-lg shadow-md aspect-[4/1] w-full flex flex-col justify-center items-center">
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
      case 'jr-east':
        return <JREastTemplate s={stationState} />;
      case 'tokyo-metro':
        // Note: Metro template has a placeholder station number (T12)
        return <TokyoMetroTemplate s={stationState} />;
      case 'simple':
        return <SimpleTemplate s={stationState} />;
      default:
        return <JREastTemplate s={stationState} />;
    }
  };

  return <div className="w-full">{renderTemplate()}</div>;
};
