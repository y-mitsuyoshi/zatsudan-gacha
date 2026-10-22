"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { PlusIcon, MinusIcon, PlayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { trackEvent } from '@/lib/firebase';

interface RouletteItem {
  id: string;
  name: string;
  weight: number;
  color: string;
}

const DEFAULT_COLORS = [
  '#667EEA', '#764BA2', '#F093FB', '#F5576C', 
  '#4FACFE', '#00F2FE', '#43E97B', '#38F9D7',
  '#FFECD2', '#FCB69F', '#A8EDEA', '#FED6E3'
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
    const radius = Math.min(centerX, centerY) - 15;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景の影を描画
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // 項目がない場合の表示
    if (items.length === 0) {
      // 外枠
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 中央のメッセージ
      ctx.font = '600 16px "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748b';
      ctx.fillText('項目を追加してください', centerX, centerY);
      return;
    }

    // 合計重みを計算
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    
    let currentAngle = rotation * Math.PI / 180;
    
    // セクションを描画
    items.forEach((item) => {
      const sectionAngle = (item.weight / totalWeight) * 2 * Math.PI;
      
      // セクションのグラデーションを作成
      const startAngle = currentAngle;
      const endAngle = currentAngle + sectionAngle;
      const midAngle = startAngle + sectionAngle / 2;
      
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, item.color);
      gradient.addColorStop(1, item.color + '80'); // 透明度を追加
      
      // セクションを描画
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sectionAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // 美しい境界線
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 内側の影効果
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius - 5, currentAngle, currentAngle + sectionAngle);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

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
      ctx.font = '700 15px "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // テキストの影
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      // テキストの塗りつぶし
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(item.name, 0, 0);
      ctx.restore();

      currentAngle += sectionAngle;
    });

    // 中心の装飾的な円を描画
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 25);
    centerGradient.addColorStop(0, '#ffffff');
    centerGradient.addColorStop(1, '#f1f5f9');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = centerGradient;
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 中心の小さな円
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#64748b';
    ctx.fill();

    // ピン（指針）を描画（真上に固定、より美しく）
    ctx.save();
    ctx.translate(centerX, centerY - radius - 20);
    
    // 指針の影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    
    // 指針のグラデーション
    const arrowGradient = ctx.createLinearGradient(0, -30, 0, 20);
    arrowGradient.addColorStop(0, '#ef4444');
    arrowGradient.addColorStop(1, '#dc2626');
    
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(-15, -12);
    ctx.lineTo(0, -30);
    ctx.lineTo(15, -12);
    ctx.closePath();
    
    ctx.fillStyle = arrowGradient;
    ctx.fill();
    
    // 指針の縁取り
    ctx.strokeStyle = '#ffffff';
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
      
      // Google Analytics イベント送信
      trackEvent('roulette_item_added', {
        item_name: newItem.name,
        item_count: items.length + 1,
        color: newItem.color
      });
    }
  };

  const removeItem = (id: string) => {
    const itemToRemove = items.find(item => item.id === id);
    setItems(items.filter(item => item.id !== id));
    
    // Google Analytics イベント送信
    if (itemToRemove) {
      trackEvent('roulette_item_removed', {
        item_name: itemToRemove.name,
        item_count: items.length - 1,
        color: itemToRemove.color
      });
    }
  };

  const updateWeight = (id: string, newWeight: number) => {
    if (newWeight >= 1 && newWeight <= 10) {
      const oldItem = items.find(item => item.id === id);
      setItems(items.map(item => 
        item.id === id ? { ...item, weight: newWeight } : item
      ));
      
      // Google Analytics イベント送信
      if (oldItem) {
        trackEvent('roulette_weight_changed', {
          item_name: oldItem.name,
          old_weight: oldItem.weight,
          new_weight: newWeight,
          weight_change: newWeight - oldItem.weight
        });
      }
    }
  };

  const spinRoulette = () => {
    if (isSpinning || items.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    // Google Analytics イベント送信 - スピン開始
    trackEvent('roulette_spin_started', {
      item_count: items.length,
      total_weight: items.reduce((sum, item) => sum + item.weight, 0),
      items: items.map(item => ({ name: item.name, weight: item.weight }))
    });

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
    let winnerItem: RouletteItem | null = null;
    
    for (const item of items) {
      const sectionAngle = (item.weight / totalWeight) * 360;
      const endAngle = currentAngle + sectionAngle;
      
      if (arrowAngle >= currentAngle && arrowAngle < endAngle) {
        winnerItem = item;
        setWinner(item);
        break;
      }
      
      currentAngle = endAngle;
    }
    
    // フォールバック
    if (!winnerItem && items.length > 0) {
      winnerItem = items[0];
      setWinner(items[0]);
    }
    
    // Google Analytics イベント送信 - 結果確定
    if (winnerItem) {
      trackEvent('roulette_result', {
        winner_name: winnerItem.name,
        winner_weight: winnerItem.weight,
        winner_color: winnerItem.color,
        total_items: items.length,
        total_weight: totalWeight,
        final_rotation: finalRotation,
        arrow_angle: arrowAngle
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ルーレット描画エリア */}
      <div className="relative bg-gradient-to-br from-white via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-3xl"></div>
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-indigo-200/20 to-pink-200/20 rounded-full blur-xl"></div>
        
        <div className="relative flex justify-center mb-8">
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="rounded-full shadow-2xl ring-4 ring-white/50 dark:ring-gray-800/50 w-full h-auto max-w-[280px] sm:max-w-[320px] md:max-w-[340px] mx-auto"
              style={{
                filter: isSpinning ? 'blur(0.5px) brightness(1.1)' : 'none',
                transition: 'filter 0.3s ease, transform 0.3s ease',
                transform: isSpinning ? 'scale(1.02)' : 'scale(1)',
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
            <div 
              className="text-3xl font-black tracking-wide"
              style={{ color: winner.color }}
            >
              {winner.name}
            </div>
          </div>
        )}
      </div>

      {/* アイテム管理エリア */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">項目の設定</h3>
        
        {/* 新しいアイテム追加 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
            placeholder="新しい項目を入力（最大20文字）"
            className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-base"
            maxLength={20}
          />
          <button
            onClick={addItem}
            disabled={!newItemName.trim() || items.length >= 12}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none font-semibold whitespace-nowrap min-w-[120px] sm:min-w-0"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {/* アイテムリスト */}
        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-lg font-medium">項目がありません</p>
              <p className="text-sm mt-2">上の入力フィールドから項目を追加してください</p>
            </div>
          ) : (
            items.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-6 h-6 rounded-full shadow-lg border-2 border-white flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg truncate">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-gray-700 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-600">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                    重み
                  </span>
                  <button
                    onClick={() => updateWeight(item.id, item.weight - 1)}
                    disabled={item.weight <= 1}
                    className="p-2 sm:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <MinusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <span className="w-6 sm:w-8 text-center text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    {item.weight}
                  </span>
                  <button
                    onClick={() => updateWeight(item.id, item.weight + 1)}
                    disabled={item.weight >= 10}
                    className="p-2 sm:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:scale-110 flex-shrink-0"
                  title="削除"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="text-sm sm:text-base text-blue-800 dark:text-blue-200 space-y-2 font-medium">
            <p>💡 最大12項目まで追加できます</p>
            <p>⚖️ 重みが大きいほど当選確率が高くなります（1-10）</p>
            <p>🎯 項目が0個の場合はルーレットを回せません</p>
            <p>🗑️ 項目右側のゴミ箱アイコンで削除できます</p>
          </div>
        </div>
      </div>
    </div>
  );
}
