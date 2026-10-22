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
  '#F97316', '#6366F1', '#14B8A6', '#22C55E',
  '#DC2626', '#7C3AED', '#0891B2', '#65A30D'
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
  const animationRef = useRef<number | undefined>(undefined);

  const drawRoulette = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 30;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 外側の装飾リング（シンプルに）
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 15, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 合計重みを計算
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    
    let currentAngle = rotation * Math.PI / 180;
    
    // セクションを描画
    items.forEach((item) => {
      const sectionAngle = (item.weight / totalWeight) * 2 * Math.PI;
      
      // セクションを描画（シンプルな塗りつぶし）
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sectionAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      // セクション間の線
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(currentAngle + sectionAngle) * radius,
        centerY + Math.sin(currentAngle + sectionAngle) * radius
      );
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      // テキストを描画（読みやすいフォント）
      const textAngle = currentAngle + sectionAngle / 2;
      const textRadius = radius * 0.7;
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
      
      // シンプルで読みやすいフォント
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 白いテキストで視認性を確保
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(item.name, 0, 0);
      ctx.fillText(item.name, 0, 0);
      
      ctx.restore();

      currentAngle += sectionAngle;
    });

    // 中心の円（シンプル）
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 矢印（指針）を真上に描画（大きく、シンプル）
    ctx.save();
    ctx.translate(centerX, centerY - radius - 20);
    
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(-15, -20);
    ctx.lineTo(0, -35);
    ctx.lineTo(15, -20);
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
    if (items.length > 2) {
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

    // ランダムな回転角度を計算（最低4回転 + ランダム）
    const minSpins = 4;
    const maxSpins = 6;
    const spins = minSpins + Math.random() * (maxSpins - minSpins);
    const finalRotation = spins * 360 + Math.random() * 360;

    // より滑らかなイージング関数
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 4);
    
    const startTime = Date.now();
    const duration = 3500 + Math.random() * 1500; // 3.5-5秒
    const startRotation = rotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      
      const currentRotation = startRotation + finalRotation * easedProgress;
      setRotation(currentRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // アニメーション終了時に正確な角度に設定してカクつきを防ぐ
        setRotation(currentRotation);
        setIsSpinning(false);
        determineWinner(currentRotation % 360);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const determineWinner = (finalRotation: number) => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    
    // 矢印は真上（12時方向）にあるので、矢印が指す角度を正規化
    // 時計回りの回転では、矢印の角度は270度から開始（12時方向）
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
    
    // フォールバック：最初の項目を選択
    if (items.length > 0) {
      setWinner(items[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* ルーレット描画エリア */}
      <div className="relative bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex justify-center mb-8">
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg">
            <canvas
              ref={canvasRef}
              width={360}
              height={360}
              className="rounded-full shadow-sm w-full h-auto max-w-[280px] sm:max-w-[320px] md:max-w-[360px] mx-auto"
              style={{ 
                filter: isSpinning ? 'blur(0.5px)' : 'none',
                transition: 'filter 0.3s ease',
                aspectRatio: '1 / 1'
              }}
            />
          </div>
        </div>

        {/* スピンボタン */}
        <div className="text-center">
          <button
            onClick={spinRoulette}
            disabled={isSpinning || items.length === 0}
            className={`px-8 py-3 rounded-lg font-medium text-base transition-all duration-200 ${
              isSpinning
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md'
            }`}
          >
            <PlayIcon className="w-5 h-5 inline mr-2" />
            {isSpinning ? 'スピン中...' : 'スタート'}
          </button>
        </div>

        {/* 結果表示（シンプル） */}
        {winner && !isSpinning && (
          <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
            <div className="text-4xl mb-3">🎉</div>
            <div 
              className="text-2xl font-bold"
              style={{ color: winner.color }}
            >
              {winner.name}
            </div>
          </div>
        )}
      </div>

      {/* アイテム管理エリア */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">ルーレット項目の設定</h3>
        
        {/* 新しいアイテム追加 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
            placeholder="新しい項目を入力（最大20文字）"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
            maxLength={20}
          />
          <button
            onClick={addItem}
            disabled={!newItemName.trim() || items.length >= 12}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap min-w-[120px] sm:min-w-0"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {/* アイテムリスト */}
        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-900 dark:text-white font-medium text-base truncate">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    重み:
                  </span>
                  <button
                    onClick={() => updateWeight(item.id, item.weight - 1)}
                    disabled={item.weight <= 1}
                    className="p-2 sm:p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <span className="w-6 sm:w-8 text-center font-medium text-gray-900 dark:text-white">
                    {item.weight}
                  </span>
                  <button
                    onClick={() => updateWeight(item.id, item.weight + 1)}
                    disabled={item.weight >= 10}
                    className="p-2 sm:p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>

                {items.length > 2 && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
          <p>• 最大12項目まで追加できます</p>
          <p>• 重みが大きいほど当選確率が高くなります（1-10）</p>
          <p>• 最低2項目は必要です</p>
          <p>• 項目の右側にあるゴミ箱アイコンで削除できます</p>
        </div>
      </div>
    </div>
  );
}
