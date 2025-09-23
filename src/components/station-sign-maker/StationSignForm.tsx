"use client";

import { StationSignState } from '@/types';
import React from 'react';
import { toRomaji } from 'wanakana';

interface StationSignFormProps {
  stationState: StationSignState;
  setStationState: React.Dispatch<React.SetStateAction<StationSignState>>;
}

export const StationSignForm: React.FC<StationSignFormProps> = ({ stationState, setStationState }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'station') {
      const roman = toRomaji(value, { uppercase: true });
      setStationState(prevState => ({
        ...prevState,
        [name]: value,
        roman: roman,
      }));
    } else {
      setStationState(prevState => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  return (
    <form className="space-y-6">
      <div>
        <label htmlFor="station" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          駅名（中央）
        </label>
        <input
          type="text"
          name="station"
          id="station"
          maxLength={10}
          value={stationState.station}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100"
          placeholder="例: 東京"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ローマ字は自動で入力されます。</p>
      </div>

      <div>
        <label htmlFor="prevStation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          前の駅 (任意)
        </label>
        <input
          type="text"
          name="prevStation"
          id="prevStation"
          maxLength={10}
          value={stationState.prevStation}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100"
          placeholder="例: 神田"
        />
      </div>

      <div>
        <label htmlFor="nextStation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          次の駅 (任意)
        </label>
        <input
          type="text"
          name="nextStation"
          id="nextStation"
          maxLength={10}
          value={stationState.nextStation}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100"
          placeholder="例: 有楽町"
        />
      </div>

      <div>
        <label htmlFor="lineColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          路線カラー
        </label>
        <div className="flex items-center space-x-2">
           <input
            type="color"
            name="lineColor"
            id="lineColor"
            value={stationState.lineColor}
            onChange={handleChange}
            className="w-10 h-10 p-0 border-none rounded-md cursor-pointer"
          />
          <input
            type="text"
            value={stationState.lineColor}
            onChange={handleChange}
            name="lineColor"
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100"
            placeholder="#009b40"
          />
        </div>
      </div>
    </form>
  );
};
