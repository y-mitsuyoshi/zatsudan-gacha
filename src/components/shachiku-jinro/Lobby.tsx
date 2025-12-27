import { useState } from 'react';
import { getFirebaseFunctions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { User } from 'firebase/auth';
import { Room } from '@/types/shachiku-jinro';

interface LobbyProps {
  user: User | null;
  currentRoomId: string | null;
  setRoomId: (id: string | null) => void;
  room: Room | null;
}

export default function Lobby({ user, currentRoomId, setRoomId, room }: LobbyProps) {
  const [inputRoomId, setInputRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    const functions = getFirebaseFunctions();
    if (!functions) {
      setError('Firebase設定が見つかりません');
      return;
    }
    const createRoomFn = httpsCallable(functions, 'createRoom');

    if (!userName) {
      setError('社員名を入力してください');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await createRoomFn({ userName });
      const data = result.data as { roomId: string };
      setRoomId(data.roomId);
    } catch (e: any) {
      setError(e.message || '部屋の作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const functions = getFirebaseFunctions();
    if (!functions) {
      setError('Firebase設定が見つかりません');
      return;
    }
    const joinRoomFn = httpsCallable(functions, 'joinRoom');

    if (!userName || !inputRoomId) {
      setError('社員名とルームIDを入力してください');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await joinRoomFn({ roomId: inputRoomId.toUpperCase(), userName });
      const data = result.data as { roomId: string };
      setRoomId(data.roomId);
    } catch (e: any) {
      setError(e.message || '入室に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = async () => {
    const functions = getFirebaseFunctions();
    if (!functions) {
      setError('Firebase設定が見つかりません');
      return;
    }
    const startGameFn = httpsCallable(functions, 'startGame');

    if (!currentRoomId) return;
    setIsLoading(true);
    try {
      await startGameFn({ roomId: currentRoomId });
    } catch (e: any) {
      setError(e.message || 'ゲーム開始に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentRoomId && room) {
    // Waiting Room UI
    const players = Object.values(room.players);
    const isHost = room.hostId === user?.uid;

    return (
      <div className="max-w-md mx-auto p-6 bg-white shadow-xl rounded-lg mt-10 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-800">会議室待機中...</h2>
        <div className="bg-blue-50 p-4 rounded-md mb-6 text-center">
          <p className="text-sm text-blue-600 mb-1">ルームID</p>
          <p className="text-4xl font-mono tracking-widest font-bold text-blue-900">{room.id}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-2">
              {players.length}名
            </span>
            参加者リスト
          </h3>
          <ul className="space-y-2">
            {players.map((p) => (
              <li key={p.id} className="flex items-center p-2 bg-gray-50 rounded border border-gray-100">
                <div className={`w-2 h-2 rounded-full mr-3 ${p.isHost ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
                <span className="font-medium">{p.name}</span>
                {p.id === user?.uid && <span className="ml-2 text-xs text-gray-400">(あなた)</span>}
                {p.isHost && <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">主催者</span>}
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={players.length < 4 || isLoading}
            className={`w-full py-3 rounded-lg font-bold text-white transition-colors shadow-sm
              ${players.length < 4
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isLoading ? '処理中...' : '定例会議を始める (ゲーム開始)'}
          </button>
        ) : (
          <div className="text-center text-gray-500 py-3 bg-gray-50 rounded-lg animate-pulse">
            主催者が会議を始めるのを待っています...
          </div>
        )}

        {players.length < 4 && (
          <p className="text-xs text-center text-red-500 mt-2">
            ※開始するには最低4名の社員が必要です
          </p>
        )}
      </div>
    );
  }

  // Initial Entry UI
  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow-xl rounded-lg mt-10 border border-gray-200">
      <h1 className="text-3xl font-extrabold text-center mb-2 text-slate-800">社畜人狼</h1>
      <p className="text-center text-slate-500 mb-8">〜会社という名の戦場〜</p>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">社員名 (表示名)</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="田中 太郎"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={handleCreateRoom}
            disabled={isLoading || !userName}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            新しい会議室を作る
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">または</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none uppercase font-mono"
              placeholder="ルームID"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value)}
            />
            <button
              onClick={handleJoinRoom}
              disabled={isLoading || !userName || !inputRoomId}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg font-bold shadow hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              入室
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
