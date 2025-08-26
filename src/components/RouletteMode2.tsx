"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { PlusIcon, MinusIcon, PlayIcon, TrashIcon } from '@heroicons/react/24/outline';

interface RouletteItem {
  id: string;
  name: string;
  weight: number;
  color: string;
}

const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#14B8A6', '#22C55E'
];

export function RouletteMode() {
  const [items, setItems] = useState<RouletteItem[]>([
    { id: '1', name: '田中さん', weight: 1, color: DEFAULT_COLORS[0] },
    { id: '2', name: '佐藤さん', weight: 1, color: DEFAULT_COLORS[1] }
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<RouletteItem | null>(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const drawRoulette = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 合計重みを計算
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    
    let currentAngle = rotation * Math.PI / 180;
    
    // セクションを描画
    items.forEach((item) => {
      const sectionAngle = (item.weight / totalWeight) * 2 * Math.PI;
      
      // セクションを描画
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sectionAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // テキストを描画
      const textAngle = currentAngle + sectionAngle / 2;
      const textRadius = radius * 0.65;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      
      // テキストの角度を調整
      let rotationAngle = textAngle + Math.PI / 2;
      if (rotationAngle > Math.PI / 2 && rotationAngle < 3 * Math.PI / 2) {
        rotationAngle += Math.PI;
      }
      ctx.rotate(rotationAngle);
      
      // モダンで読みやすいフォント
      ctx.font = '600 14px "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // テキストの縁取り
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(item.name, 0, 0);
      
      // テキストの塗りつぶし
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(item.name, 0, 0);
      ctx.restore();

      currentAngle += sectionAngle;
    });

    // 中心の円を描画
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ピン（指針）を描画（真上に固定、より大きく）
    ctx.save();
    ctx.translate(centerX, centerY - radius - 15);
    
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(-18, -15);
    ctx.lineTo(0, -30);
    ctx.lineTo(18, -15);
    ctx.closePath();
    
    ctx.fillStyle = '#EF4444';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }, [items, rotation]);

  useEffect(() => {
    drawRoulette();
  }, [drawRoulette]);

  const addItem = () => {
    if (newItemName.trim() && items.length < 12) {
      const newItem: RouletteItem = {
        id: Date.now().toString(),
        name: newItemName.trim(),
        weight: 1,
        color: DEFAULT_COLORS[items.length % DEFAULT_COLORS.length]
      };
      setItems([...items, newItem]);
      setNewItemName('');
    }
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateWeight = (id: string, newWeight: number) => {
    if (newWeight >= 1 && newWeight <= 10) {
      setItems(items.map(item => 
        item.id === id ? { ...item, weight: newWeight } : item
      ));
    }
  };

  const spinRoulette = () => {
    if (isSpinning || items.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    // ランダムな回転角度を計算（最低5回転 + ランダム）
    const minSpins = 5;
    const maxSpins = 8;
    const spins = minSpins + Math.random() * (maxSpins - minSpins);
    const finalRotation = spins * 360 + Math.random() * 360;

    // イージング関数
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    
    const startTime = Date.now();
    const duration = 3000 + Math.random() * 2000; // 3-5秒
    const startRotation = rotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      
      const currentRotation = startRotation + finalRotation * easedProgress;
      setRotation(currentRotation % 360);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        determineWinner(currentRotation % 360);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const determineWinner = (finalRotation: number) => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    
    // 矢印は真上（12時方向）にあるので、正確な当選判定
    const normalizedRotation = ((finalRotation % 360) + 360) % 360;
    const arrowAngle = (270 - normalizedRotation + 360) % 360;
    
    let currentAngle = 0;
    
    for (const item of items) {
      const sectionAngle = (item.weight / totalWeight) * 360;
      const endAngle = currentAngle + sectionAngle;
      
      if (arrowAngle >= currentAngle && arrowAngle < endAngle) {
        setWinner(item);
        return;
      }
      
      currentAngle = endAngle;
    }
    
    // フォールバック
    if (items.length > 0) {
      setWinner(items[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* ルーレット描画エリア */}
      <div className="relative bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-lg">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className="rounded-full shadow-xl"
              style={{
                filter: isSpinning ? 'blur(0.5px)' : 'none',
                transition: 'filter 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* スピンボタン */}
        <div className="text-center">
          <button
            onClick={spinRoulette}
            disabled={isSpinning || items.length === 0}
            className={`px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg ${
              isSpinning
                ? 'bg-gray-400 text-white cursor-not-allowed scale-95'
                : items.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white hover:shadow-xl transform hover:scale-105 active:scale-95'
            }`}
          >
            <PlayIcon className="w-6 h-6 inline mr-2" />
            {isSpinning ? 'スピン中...' : items.length === 0 ? '項目を追加してください' : 'スタート'}
          </button>
          
          {items.length === 0 && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              ルーレットを回すには、少なくとも1つの項目を追加してください
            </p>
          )}
        </div>

        {/* 結果表示 */}
        {winner && !isSpinning && (
          <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-200 dark:border-green-700 text-center">
            <div className="text-5xl mb-4 animate-bounce">🎉</div>
            <div className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              当選者
            </div>
            <div 
              className="text-3xl font-black tracking-wide"
              style={{ color: winner.color }}
            >
              {winner.name}
            </div>
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              おめでとうございます！
            </div>
          </div>
        )}
      </div>

      {/* アイテム管理エリア */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">項目の設定</h3>
        
        {/* 新しいアイテム追加 */}
        <div className="flex gap-3">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
            placeholder="新しい項目を入力"
            className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
            maxLength={20}
          />
          <button
            onClick={addItem}
            disabled={!newItemName.trim() || items.length >= 12}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none font-semibold"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {/* アイテムリスト */}
        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div
                className="w-6 h-6 rounded-full shadow-lg border-2 border-white"
                style={{ backgroundColor: item.color }}
              />
              
              <div className="flex-1 min-w-0">
                <span className="text-gray-900 dark:text-white font-semibold text-lg truncate block">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white dark:bg-gray-700 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  重み
                </span>
                <button
                  onClick={() => updateWeight(item.id, item.weight - 1)}
                  disabled={item.weight <= 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  <MinusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="w-8 text-center text-lg font-bold text-gray-900 dark:text-white">
                  {item.weight}
                </span>
                <button
                  onClick={() => updateWeight(item.id, item.weight + 1)}
                  disabled={item.weight >= 10}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              {items.length > 1 && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:scale-110"
                  title="削除"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2 font-medium">
            <p>💡 最大12項目まで追加できます</p>
            <p>⚖️ 重みが大きいほど当選確率が高くなります（1-10）</p>
            <p>🔒 最低1項目は必要です</p>
            <p>🗑️ 項目右側のゴミ箱アイコンで削除できます</p>
          </div>
        </div>
      </div>
    </div>
  );
}
