"use client";

import React, { useState, useEffect } from 'react';
import { GameState } from '@/types/sugoroku';
import { takeTurn, moveOneStep } from '@/lib/sugoroku-logic';
import { GameBoard } from './GameBoard';
import { YarukiGauge } from './YarukiGauge';
import { ResultCard } from './ResultCard';
import { DiceComponent } from './DiceComponent';

interface GameContainerProps {
  initialState: GameState;
}

export const GameContainer: React.FC<GameContainerProps> = ({ initialState }) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [showDice, setShowDice] = useState(false);
  const [previousPosition, setPreviousPosition] = useState(initialState.position);
  const [isMoving, setIsMoving] = useState(false);

  const handleTakeTurn = () => {
    if (isRolling || gameState.isFinished) return;

    setIsRolling(true);
    setShowDice(true);
    
    // Generate dice value (1-6)
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(roll);
  };

  const handleDiceRollComplete = () => {
    // Calculate new game state after dice animation completes
    setTimeout(() => {
      setPreviousPosition(gameState.position);
      
      const newState = takeTurn(gameState, diceValue);
      setGameState(newState);
      setIsRolling(false);
      
      // Start step-by-step movement if there are pending moves
      if (newState.pendingMoves && newState.pendingMoves > 0) {
        setIsMoving(true);
        setTimeout(() => {
          handleStepMovement(newState);
        }, 800);
      } else {
        // No movement needed, hide dice
        setTimeout(() => setShowDice(false), 1500);
      }
    }, 600);
  };

  const handleStepMovement = (currentState: GameState) => {
    if (!currentState.pendingMoves || currentState.pendingMoves <= 0) {
      setIsMoving(false);
      return;
    }
    
    const moveStep = () => {
      setGameState(prevState => {
        const newState = moveOneStep(prevState);
        
        // Continue moving if there are more pending moves
        if (newState.pendingMoves && newState.pendingMoves > 0) {
          setTimeout(moveStep, 1200); // ゆっくりとした移動
        } else {
          // 移動完了時の処理
          setTimeout(() => {
            setIsMoving(false);
            setShowDice(false);
          }, 800);
        }
        
        return newState;
      });
    };

    // Start the first move
    moveStep();
  };



  if (gameState.isFinished) {
    return <ResultCard gameState={gameState} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
            🎯 社畜すごろく盤
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
            ターン {gameState.turn}
          </div>
        </div>
        <GameBoard 
          position={gameState.position} 
          playerName={gameState.playerName} 
          previousPosition={previousPosition}
          isMoving={isMoving}
          diceValue={showDice ? diceValue : null}
        />
      </div>

      <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-fit">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
          📊 ステータス
        </h2>
        
        {/* Player Info */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">プレイヤー</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{gameState.playerName}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">職業</span>
            <span className="font-bold text-green-600 dark:text-green-400">{gameState.job}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">現在位置</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">{gameState.position} / 50</span>
          </div>
        </div>

        {/* Turn and Progress */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">ターン数</span>
            <span className="font-bold text-lg">{gameState.turn}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((gameState.position / 50) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            進捗: {Math.round((gameState.position / 50) * 100)}%
          </div>
        </div>

        {/* Yaruki Gauge */}
        <YarukiGauge value={gameState.yaruki} />
        
        {/* Rest Status */}
        {gameState.isResting > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-4">
            <div className="flex items-center">
              <span className="text-red-600 dark:text-red-400 mr-2">😴</span>
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                休み: あと{gameState.isResting}ターン
              </span>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="mt-6">
            <h3 className="font-bold mb-3 flex items-center">
              🎒 アイテム
              <span className="ml-2 bg-gray-200 dark:bg-gray-700 text-xs px-2 py-1 rounded-full">
                {gameState.items.length}
              </span>
            </h3>
            {gameState.items.length > 0 ? (
                <div className="space-y-2">
                    {gameState.items.map((item, index) => (
                      <div key={index} className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                          📦 {item.name}
                        </div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          {item.description}
                        </div>
                      </div>
                    ))}
                </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">アイテムがありません</p>
            )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            {/* Game Message */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/30 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  💬 ゲーム状況
                </h4>
                <div className="h-20 overflow-y-auto">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {gameState.gameMessage}
                  </p>
                </div>
            </div>
            
            {/* Dice Component */}
            {showDice && (
              <div className="mb-6 py-6 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-600">
                <DiceComponent 
                  isRolling={isRolling} 
                  finalValue={diceValue} 
                  onRollComplete={handleDiceRollComplete}
                />
              </div>
            )}
            
            {/* Action Button */}
            <button
                onClick={handleTakeTurn}
                disabled={isRolling || gameState.isFinished || isMoving || Boolean(gameState.pendingMoves && gameState.pendingMoves > 0)}
                className={`
                  w-full font-bold py-4 px-4 rounded-lg text-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed
                  ${isRolling || isMoving || (gameState.pendingMoves && gameState.pendingMoves > 0)
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-wait' 
                    : 'bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700 text-white transform hover:scale-105 active:scale-95'
                  }
                `}
            >
                {isRolling ? '🎲 ローリング中...' : 
                 isMoving ? '🏃‍♂️ 移動中...' : 
                 (gameState.pendingMoves && gameState.pendingMoves > 0) ? `⏳ 移動待機中（あと${gameState.pendingMoves}マス）` :
                 gameState.isResting > 0 ? '😴 休み中（ターン消費）' :
                 '🎯 サイコロを振る'}
            </button>
            
            {/* Step Movement Info */}
            {gameState.pendingMoves && gameState.pendingMoves > 0 && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                  🚶‍♂️ 一マスずつ移動中... あと{gameState.pendingMoves}マス進みます
                </p>
              </div>
            )}
            
            {/* Help text */}
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {gameState.isResting > 0 
                  ? `あと${gameState.isResting}ターン休む必要があります` 
                  : (gameState.pendingMoves && gameState.pendingMoves > 0)
                  ? '移動が完了するまでお待ちください'
                  : 'サイコロを振って進みましょう！'
                }
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};
