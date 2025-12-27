import { Room, Player, Role, getRoleName, getRoleDescription } from '@/types/shachiku-jinro';
import { User } from 'firebase/auth';

interface PlayerCardProps {
  player: Player;
  isSelf: boolean;
  gamePhase: Room['phase'];
  winner?: Room['winner'];
}

export default function PlayerCard({ player, isSelf, gamePhase, winner }: PlayerCardProps) {
  const isDead = !player.isAlive;

  // Role should be hidden unless:
  // 1. It's the player themselves (and game started)
  // 2. The game is over
  // 3. The player is dead (usually revealed, but depends on rules. Let's reveal on death for simplicity or keep hidden if "Ghost" rules apply. Standard Jinro reveals on death? No, usually distinct. Let's reveal on Game Over mostly, or if Client logic allows checking `roleRevealed` flag if we had one from server).
  // Note: The Firestore `room` data fetched by client currently contains ALL roles because we didn't implement a separate subcollection or filtered view for security in this simplified version.
  // In a real app, we MUST filter this on backend. For this prototype, we just hide it in UI.

  // "Cheating" prevention in UI only for now:
  const shouldShowRole = isSelf || gamePhase === 'GAME_OVER';

  return (
    <div className={`
      relative p-3 rounded-lg border-2 shadow-sm transition-all duration-300
      ${isDead ? 'bg-gray-200 border-gray-300 opacity-75 grayscale' : 'bg-white border-blue-100'}
      ${isSelf ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
    `}>
      {/* Badge / Status */}
      <div className="flex justify-between items-start mb-2">
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
          ${isDead ? 'bg-gray-500 text-white' : 'bg-green-500 text-white'}
        `}>
          {isDead ? '退' : '勤'}
        </div>
        {player.isHost && (
          <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded border border-orange-200">
            主催
          </span>
        )}
      </div>

      {/* Name */}
      <div className="mb-2 text-center">
        <p className={`font-bold truncate text-sm ${isDead ? 'line-through text-gray-500' : 'text-gray-800'}`}>
          {player.name}
        </p>
        {isSelf && <p className="text-[10px] text-blue-500 font-medium">(あなた)</p>}
      </div>

      {/* Role Reveal (Self or End) */}
      {shouldShowRole && (
        <div className={`
          mt-2 p-2 rounded text-center text-xs
          ${isDead ? 'bg-gray-300' : 'bg-slate-100'}
        `}>
          <p className="font-bold text-slate-700">{getRoleName(player.role)}</p>
          {isSelf && gamePhase !== 'GAME_OVER' && (
             <p className="text-[10px] text-slate-500 mt-1 leading-tight text-left">
               {getRoleDescription(player.role)}
             </p>
          )}
        </div>
      )}

      {/* Unknown Role State */}
      {!shouldShowRole && !isDead && (
        <div className="mt-2 p-2 rounded bg-slate-50 text-center">
          <p className="text-xs text-slate-400 font-mono">???</p>
        </div>
      )}

      {/* Dead State */}
      {!shouldShowRole && isDead && (
        <div className="mt-2 p-2 rounded bg-red-50 text-center">
          <p className="text-xs text-red-400 font-bold">解雇</p>
        </div>
      )}
    </div>
  );
}
