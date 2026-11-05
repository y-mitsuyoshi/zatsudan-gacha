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

const CANVAS_SIZE = 340;

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
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const drawRoulette = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 高DPIディスプレイでもぼやけないよう、描画解像度を調整
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const pixelSize = Math.round(CANVAS_SIZE * dpr);
    if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
      canvas.width = pixelSize;
      canvas.height = pixelSize;
    }
    const scale = canvas.width / CANVAS_SIZE;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const radius = CANVAS_SIZE / 2 - 15;

    // キャンバスをクリア
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

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

    // ピン（指針）を描画（真上に固定）
    ctx.save();
    ctx.translate(centerX, centerY - radius - 10);

    // 指針の影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 3;

    // 指針のグラデーション
    const arrowGradient = ctx.createLinearGradient(0, -6, 0, 20);
    arrowGradient.addColorStop(0, '#ef4444');
    arrowGradient.addColorStop(1, '#dc2626');

    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(-13, -6);
    ctx.lineTo(13, -6);
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

  useEffect(() => {
    return () => {
      if (animationRef.current !== undefined) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const addItem = () => {
    const trimmedName = newItemName.trim();

    if (!trimmedName || items.length >= 12 || isSpinning) {
      return;
    }

    if (items.some(item => item.name === trimmedName)) {
      setError('同じ名前の項目がすでにあります');
      return;
    }

    const newItem: RouletteItem = {
      id: Date.now().toString(),
      name: trimmedName,
      weight: 1,
      color: DEFAULT_COLORS[items.length % DEFAULT_COLORS.length]
    };
    setItems([...items, newItem]);
    setNewItemName('');
    setError('');

    // Google Analytics イベント送信
    trackEvent('roulette_item_added', {
      item_count: items.length + 1
    });
  };

  const removeItem = (id: string) => {
    if (isSpinning) return;
    const itemToRemove = items.find(item => item.id === id);
    setItems(items.filter(item => item.id !== id));
    setError('');
    if (winner?.id === id) {
      setWinner(null);
    }

    // Google Analytics イベント送信
    if (itemToRemove) {
      trackEvent('roulette_item_removed', {
        item_count: items.length - 1
      });
    }
  };

  const updateWeight = (id: string, newWeight: number) => {
    if (isSpinning) return;
    if (newWeight >= 1 && newWeight <= 10) {
      const oldItem = items.find(item => item.id === id);
      setItems(items.map(item =>
        item.id === id ? { ...item, weight: newWeight } : item
      ));
      setError('');

      // Google Analytics イベント送信
      if (oldItem) {
        trackEvent('roulette_weight_changed', {
          old_weight: oldItem.weight,
          new_weight: newWeight,
          weight_change: newWeight - oldItem.weight
        });
      }
    }
  };

  const spinRoulette = () => {
    if (isSpinning || items.length === 0) return;

    if (animationRef.current !== undefined) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsSpinning(true);
    setWinner(null);
    setError('');

    // Google Analytics イベント送信 - スピン開始
    trackEvent('roulette_spin_started', {
      item_count: items.length,
      total_weight: items.reduce((sum, item) => sum + item.weight, 0)
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
        animationRef.current = undefined;
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
        winner_weight: winnerItem.weight,
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
      <div className="relative bg-[var(--paper-strong)] p-8 rounded-none border border-[var(--line)]  overflow-hidden">
        {/* 背景装飾 */}

        <div className="relative flex justify-center mb-8">
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              role="img"
              aria-label="ルーレットの盤面"
              className="rounded-full  ring-4 ring-[var(--line)] w-full h-auto max-w-[280px] sm:max-w-[320px] md:max-w-[340px] mx-auto"
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
            type="button"
            onClick={spinRoulette}
            disabled={isSpinning || items.length === 0}
            className={`px-8 py-4 rounded-none font-semibold text-lg transition-all duration-300  ${
              isSpinning
                ? 'bg-[var(--paper-muted)] text-[var(--ink-soft)] cursor-not-allowed scale-95'
                : items.length === 0
                ? 'bg-[var(--paper-muted)] text-[var(--ink-soft)] cursor-not-allowed'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transform hover:scale-105 active:scale-95'
            }`}
          >
            <PlayIcon className="w-6 h-6 inline mr-2" />
            {isSpinning ? 'スピン中...' : items.length === 0 ? '項目を追加してください' : 'スタート'}
          </button>

          {items.length === 0 && (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              ルーレットを回すには、少なくとも1つの項目を追加してください
            </p>
          )}
        </div>

        {/* 結果表示 */}
        {winner && !isSpinning && (
          <div
            className="mt-8 p-6 bg-[var(--paper-muted)] rounded-none border-2 border-[var(--line-strong)] text-center"
            role="status"
            aria-live="polite"
          >
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
        <h3 className="text-2xl font-bold text-[var(--ink)]">項目の設定</h3>

        {/* 新しいアイテム追加 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => {
              setNewItemName(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="新しい項目を入力（最大20文字）"
            aria-label="ルーレットに追加する項目"
            className="flex-1 px-4 py-3 border-2 border-[var(--line)] rounded-sm bg-[var(--paper-strong)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all font-medium text-base disabled:opacity-60"
            maxLength={20}
            disabled={isSpinning}
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!newItemName.trim() || items.length >= 12 || isSpinning}
            aria-label="項目を追加"
            className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--paper-muted)] text-white rounded-sm transition-all duration-200  transform hover:scale-105 disabled:transform-none font-semibold whitespace-nowrap min-w-[120px] sm:min-w-0"
          >
            <PlusIcon className="w-5 h-5 mx-auto" />
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
        )}

        {/* アイテムリスト */}
        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="text-center py-12 text-[var(--ink-soft)]">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-lg font-medium">項目がありません</p>
              <p className="text-sm mt-2">上の入力フィールドから項目を追加してください</p>
            </div>
          ) : (
            items.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-[var(--paper-muted)] rounded-none border-2 border-[var(--line)] transition-colors hover:border-[var(--accent)]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-6 h-6 rounded-full  border-2 border-white flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[var(--ink)] font-semibold text-base sm:text-lg truncate">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="flex items-center gap-2 sm:gap-3 bg-[var(--paper-strong)] rounded-sm px-3 py-2 border border-[var(--line)]">
                  <span className="text-xs sm:text-sm text-[var(--ink-soft)] font-medium whitespace-nowrap">
                    重み
                  </span>
                  <button
                    type="button"
                    onClick={() => updateWeight(item.id, item.weight - 1)}
                    disabled={isSpinning || item.weight <= 1}
                    aria-label={`${item.name}の重みを減らす`}
                    className="p-2 sm:p-1.5 rounded-sm hover:bg-[var(--paper-muted)] disabled:opacity-50 transition-colors"
                  >
                    <MinusIcon className="w-4 h-4 text-[var(--ink-soft)]" />
                  </button>
                  <span className="w-6 sm:w-8 text-center text-base sm:text-lg font-bold text-[var(--ink)]">
                    {item.weight}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateWeight(item.id, item.weight + 1)}
                    disabled={isSpinning || item.weight >= 10}
                    aria-label={`${item.name}の重みを増やす`}
                    className="p-2 sm:p-1.5 rounded-sm hover:bg-[var(--paper-muted)] disabled:opacity-50 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4 text-[var(--ink-soft)]" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={isSpinning}
                  className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0"
                  title="削除"
                  aria-label={`${item.name}を削除`}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm p-4">
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
