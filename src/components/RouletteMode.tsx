"use client";

import { useState } from 'react';
import { Wheel } from 'react-custom-roulette';

interface RouletteItem {
  option: string;
  optionSize: number;
}

export const RouletteMode = () => {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [rouletteResult, setRouletteResult] = useState<string | null>(null);
  const [items, setItems] = useState<RouletteItem[]>([
    { option: 'ピザ', optionSize: 10 },
    { option: '寿司', optionSize: 10 },
    { option: 'カレー', optionSize: 10 },
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemWeight, setNewItemWeight] = useState(10);

  const handleAddItem = () => {
    if (newItemName.trim() === '' || newItemWeight <= 0) {
      alert('項目名と、1以上の比率を入力してください。');
      return;
    }
    setItems([...items, { option: newItemName.trim(), optionSize: newItemWeight }]);
    setNewItemName('');
    setNewItemWeight(10);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSpinClick = () => {
    if (items.length === 0) {
      alert('ルーレットに項目を追加してください。');
      return;
    }
    setRouletteResult(null); // スピン開始時に結果をリセット
    const totalWeight = items.reduce((sum, item) => sum + item.optionSize, 0);
    let random = Math.random() * totalWeight;
    let newPrizeNumber = -1;

    for (let i = 0; i < items.length; i++) {
      random -= items[i].optionSize;
      if (random < 0) {
        newPrizeNumber = i;
        break;
      }
    }

    setPrizeNumber(newPrizeNumber);
    setMustSpin(true);
  };

  const backgroundColors = ['#6366f1', '#4f46e5', '#a5b4fc'];
  const textColors = ['#ffffff'];

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="項目名"
          className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="number"
          value={newItemWeight}
          onChange={(e) => setNewItemWeight(Number(e.target.value))}
          placeholder="比率"
          min="1"
          className="w-full sm:w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleAddItem}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          追加
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">ルーレット項目</h3>
        <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
          {items.map((item, index) => (
            <li key={index} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
              <span className="text-gray-800 dark:text-gray-200">{item.option} (比率: {item.optionSize})</span>
              <button
                onClick={() => handleRemoveItem(index)}
                className="text-red-500 hover:text-red-700 font-semibold"
              >
                削除
              </button>
            </li>
          ))}
           {items.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">項目を追加してください。</p>
          )}
        </ul>
      </div>

      <div className="flex justify-center items-center flex-col space-y-4">
        <div className="relative w-full max-w-xs aspect-square flex items-center justify-center">
            <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber}
            data={items}
            onStopSpinning={() => {
                setMustSpin(false);
                setRouletteResult(items[prizeNumber]?.option || '');
            }}
            backgroundColors={backgroundColors}
            textColors={textColors}
            outerBorderColor="#e5e7eb"
            outerBorderWidth={5}
            innerBorderColor="#e5e7eb"
            innerBorderWidth={0}
            radiusLineColor="#e5e7eb"
            radiusLineWidth={2}
            fontSize={14}
            />
        </div>

        <button
          onClick={handleSpinClick}
          disabled={items.length === 0 || mustSpin}
          className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mustSpin ? '抽選中...' : 'ルーレットを回す'}
        </button>

        {rouletteResult && !mustSpin && (
          <div className="mt-4 p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg w-full max-w-xs text-center">
            <p className="text-sm text-indigo-800 dark:text-indigo-300">結果</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{rouletteResult}</p>
          </div>
        )}
      </div>
    </div>
  );
};
