'use client';

import {
  Player,
  Phase,
  WinnerType,
  Claim,
  ClaimedResult,
  getRoleName,
  getRoleTeam,
} from '@/types/shachiku-jinro';
import { EmployeePortrait, RoleEmblem } from './AvatarSvg';

interface PlayerCardProps {
  player: Player;
  index: number;
  isSelf: boolean;
  viewerRole?: Player['role'];
  gamePhase: Phase;
  winner: WinnerType;
  claim?: Claim;
  reportsOnPlayer?: ClaimedResult[];
  wasExecuted?: boolean;
  wasAttacked?: boolean;
}

export default function PlayerCard({
  player,
  index,
  isSelf,
  viewerRole,
  gamePhase,
  claim,
  reportsOnPlayer = [],
  wasExecuted,
  wasAttacked,
}: PlayerCardProps) {
  const isDead = !player.isAlive;
  const isKnownTeammate =
    !isSelf &&
    ((viewerRole === 'SPY' && player.role === 'SPY') ||
      (viewerRole === 'ENGINEER' && player.role === 'ENGINEER'));
  const shouldShowRole = isSelf || isKnownTeammate || gamePhase === 'GAME_OVER';
  const isHighlighted = Boolean(wasExecuted || wasAttacked);

  const hasBlackReport = reportsOnPlayer.some((r) => r.isSpy);
  const hasWhiteReport = !hasBlackReport && reportsOnPlayer.some((r) => !r.isSpy);

  const team = getRoleTeam(player.role);
  const roleBadgeColor =
    team === 'spy'
      ? 'border-[#7c2d23] bg-[#2a1411] text-[#f4a28e]'
      : team === 'third'
        ? 'border-[#2f5d54] bg-[#132622] text-[#95d8c9]'
        : 'border-[#5a4b38] bg-[#241e16] text-[#e8ca86]';

  return (
    <div
      className={`relative overflow-hidden border transition-all duration-300 ${
        isDead
          ? 'border-[#2c251d] bg-[#14110e] opacity-70'
          : isSelf
            ? 'border-[#dfb15b] bg-[#221c15] shadow-[3px_3px_0_#0b0907]'
            : 'border-[#3e3529] bg-[#1a1612]'
      } ${isHighlighted ? 'ring-2 ring-[#e07054]' : ''}`}
    >
      {/* Top ID Lanyard Bar */}
      <div
        className={`flex items-center justify-between border-b px-2.5 py-1 font-mono text-[9px] ${
          isDead
            ? 'border-[#27211a] bg-[#110e0b] text-[#6e6250]'
            : isSelf
              ? 'border-[#5a472a] bg-[#2f2518] text-[#dfb15b]'
              : 'border-[#2e271e] bg-[#15120e] text-[#8a7d69]'
        }`}
      >
        <span>ID-{String(index + 1).padStart(2, '0')}</span>
        {isSelf ? (
          <span className="font-bold tracking-wider text-[#dfb15b]">YOU</span>
        ) : isKnownTeammate ? (
          <span className="font-bold text-[#e07054]">仲間</span>
        ) : (
          <span>{ isDead ? 'INACTIVE' : 'ACTIVE' }</span>
        )}
      </div>

      <div className="p-2.5">
        {/* Portrait + Status */}
        <div className="relative mx-auto flex items-center justify-center">
          <div className="relative overflow-hidden border border-[#463b2d]">
            <EmployeePortrait
              personaIndex={player.personaIndex}
              isDead={isDead}
              size={58}
            />
            {isDead && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                <span className="-rotate-12 border-2 border-[#e07054] bg-[#2b1410]/90 px-1.5 py-0.5 font-mono text-[10px] font-black tracking-widest text-[#f39c88]">
                  {player.deathCause === 'EXECUTED' ? '懲戒解雇' : '深夜退職'}
                </span>
              </div>
            )}
          </div>

          {/* Public CO Badge Floating Top-Right */}
          {claim && (
            <span
              className="absolute -right-1 -top-1 flex items-center gap-0.5 border border-[#dfb15b] bg-[#2a2114] px-1.5 py-0.5 text-[9px] font-bold text-[#f5d98e] shadow"
              title={`${claim.day}日目に${getRoleName(claim.role)}をCO`}
            >
              <RoleEmblem role={claim.role} size={11} />
              <span>{getRoleName(claim.role)}CO</span>
            </span>
          )}

          {/* Reported Verdict Floating Bottom-Left */}
          {!isDead && (hasBlackReport || hasWhiteReport) && (
            <span
              className={`absolute -bottom-1 -left-1 border px-1.5 py-0.5 text-[9px] font-bold ${
                hasBlackReport
                  ? 'border-[#b23a2a] bg-[#361612] text-[#f7a492]'
                  : 'border-[#35635a] bg-[#152925] text-[#9de0d1]'
              }`}
            >
              {hasBlackReport ? '黒報告あり' : '白報告あり'}
            </span>
          )}
        </div>

        {/* Name */}
        <div className="mt-2 text-center">
          <p
            className={`truncate text-xs font-bold ${
              isDead ? 'text-[#7b6f5d] line-through' : 'text-[#f2e9d8]'
            }`}
          >
            {player.name}
          </p>
          {isDead && player.deathDay && (
            <p className="font-mono text-[9px] text-[#9e6255]">
              {player.deathDay}日目・{player.deathCause === 'EXECUTED' ? '会議解雇' : '夜襲撃'}
            </p>
          )}
        </div>

        {/* Role Slot */}
        <div className="mt-2">
          {shouldShowRole ? (
            <div
              className={`flex items-center justify-center gap-1 border px-1.5 py-1 text-center ${roleBadgeColor}`}
            >
              <RoleEmblem role={player.role} size={12} />
              <span className="truncate text-[10px] font-bold">
                {getRoleName(player.role)}
              </span>
            </div>
          ) : (
            <div className="border border-[#2e271e] bg-[#12100d] px-1.5 py-1 text-center">
              <span className="font-mono text-[10px] text-[#756957]">
                {claim ? `自称: ${getRoleName(claim.role)}` : '役職不明'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
