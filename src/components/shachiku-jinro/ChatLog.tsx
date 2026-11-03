'use client';

import { GameLog, Player, Claim, getRoleName } from '@/types/shachiku-jinro';
import { useEffect, useRef } from 'react';
import { EmployeePortrait } from './AvatarSvg';

interface ChatLogProps {
  logs: GameLog[];
  players: Record<string, Player>;
  claims: Claim[];
  myId?: string;
  pendingCount?: number;
  onFlushNext?: () => void;
}

function getTagBadge(tag?: GameLog['tag']): { label: string; style: string } | null {
  switch (tag) {
    case 'CLAIM':
      return {
        label: '役職CO',
        style: 'border-[#dfb15b] bg-[#302514] text-[#f5d98e]',
      };
    case 'REPORT':
      return {
        label: '調査報告',
        style: 'border-[#c97a3d] bg-[#2e1c10] text-[#f7be8f]',
      };
    case 'ACCUSE':
      return {
        label: '追及',
        style: 'border-[#b23a2a] bg-[#2f1512] text-[#f49d8a]',
      };
    case 'TRUST':
      return {
        label: '信頼',
        style: 'border-[#35635a] bg-[#142824] text-[#9de0d1]',
      };
    case 'DEFEND':
      return {
        label: '弁明',
        style: 'border-[#635644] bg-[#231e18] text-[#d8cbb5]',
      };
    default:
      return null;
  }
}

export default function ChatLog({
  logs,
  players,
  claims,
  myId,
  pendingCount = 0,
  onFlushNext,
}: ChatLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chatLogs = logs.filter((l) => l.type === 'CHAT');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatLogs.length]);

  let lastRenderedDay: number | undefined;

  return (
    <div className="flex flex-col bg-[#14110d]">
      <div
        ref={containerRef}
        className="custom-scrollbar h-72 space-y-3 overflow-y-auto p-3.5 sm:h-80"
      >
        {chatLogs.length === 0 && (
          <div className="flex h-full items-center justify-center py-10 text-center text-xs text-[#756957]">
            定例会議の発言ログがここに記録されます...
          </div>
        )}

        {chatLogs.map((log) => {
          const player = log.playerId ? players[log.playerId] : undefined;
          if (!player) return null;

          const isSelf = player.id === myId;
          const badge = getTagBadge(log.tag);
          const playerClaim = claims.find((c) => c.playerId === player.id);
          const showDayDivider =
            log.day !== undefined && log.day !== lastRenderedDay;
          if (log.day !== undefined) {
            lastRenderedDay = log.day;
          }

          const bubbleStyle =
            log.tag === 'CLAIM' || log.tag === 'REPORT'
              ? 'border-[#8a6d38] bg-[#261e12] text-[#f7efe0]'
              : log.tag === 'ACCUSE'
                ? 'border-[#6e3026] bg-[#241412] text-[#f3dfd9]'
                : isSelf
                  ? 'border-[#635139] bg-[#282017] text-[#f2e9d8]'
                  : 'border-[#383025] bg-[#1c1813] text-[#ded2be]';

          return (
            <div key={log.id} className="space-y-2">
              {showDayDivider && (
                <div className="my-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-[#2e271e]" />
                  <span className="font-mono text-[10px] font-bold tracking-wider text-[#8a7d69]">
                    {`DAY ${log.day} / 議事録`}
                  </span>
                  <div className="h-px flex-1 bg-[#2e271e]" />
                </div>
              )}

              <div
                className={`flex items-start gap-2.5 ${
                  isSelf ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className="shrink-0 overflow-hidden border border-[#463b2d]">
                  <EmployeePortrait
                    personaIndex={player.personaIndex}
                    isDead={!player.isAlive}
                    size={36}
                  />
                </div>

                <div
                  className={`max-w-[82%] flex-1 ${
                    isSelf ? 'items-end text-right' : 'items-start text-left'
                  }`}
                >
                  <div
                    className={`mb-1 flex flex-wrap items-center gap-1.5 ${
                      isSelf ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span className="text-xs font-bold text-[#e6dac4]">
                      {player.name}
                    </span>
                    {isSelf && (
                      <span className="font-mono text-[9px] font-bold text-[#dfb15b]">
                        [あなた]
                      </span>
                    )}
                    {playerClaim && (
                      <span className="border border-[#5a472a] bg-[#251d12] px-1 py-0.5 text-[9px] font-bold text-[#dfb15b]">
                        {getRoleName(playerClaim.role)}CO
                      </span>
                    )}
                    {badge && (
                      <span
                        className={`border px-1.5 py-0.5 text-[9px] font-bold ${badge.style}`}
                      >
                        {badge.label}
                      </span>
                    )}
                    {!player.isAlive && (
                      <span className="text-[10px] text-[#c76a56]">(解雇済)</span>
                    )}
                  </div>

                  <div
                    className={`inline-block border px-3 py-2 text-left text-xs leading-relaxed sm:text-sm ${bubbleStyle}`}
                  >
                    {log.message}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pendingCount > 0 && onFlushNext && (
        <div className="flex items-center justify-between border-t border-[#2e271e] bg-[#1b1712] px-3.5 py-2">
          <span className="font-mono text-[11px] text-[#9e907a]">
            社員が発言準備中...（残り {pendingCount} 件）
          </span>
          <button
            type="button"
            onClick={onFlushNext}
            className="min-h-[36px] border border-[#5a4b38] bg-[#282118] px-3 py-1 text-xs font-bold text-[#f2e9d8] transition hover:border-[#dfb15b] hover:bg-[#332a1e]"
          >
            次の発言へ進める →
          </button>
        </div>
      )}
    </div>
  );
}
