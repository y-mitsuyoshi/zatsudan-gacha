'use client';

import React from 'react';
import { CHARACTERS, charImage, type CharId, type Expression } from '../characters';

export interface CharAvatarProps {
  id: CharId;
  expr?: Expression;
  /** pixel size (square) */
  size?: number;
  /** draw an animated glowing ring (e.g. active turn) */
  active?: boolean;
  /** grayscale + dim (folded / busted) */
  dimmed?: boolean;
  /** extra gold winner glow */
  winner?: boolean;
  className?: string;
  /** shape: circle (default) or rounded square */
  shape?: 'circle' | 'rounded';
}

/** Generated-illustration avatar with ring / glow states. Shared by every screen. */
export function CharAvatar({
  id,
  expr = 'normal',
  size = 64,
  active = false,
  dimmed = false,
  winner = false,
  className = '',
  shape = 'circle',
}: CharAvatarProps) {
  const ch = CHARACTERS[id];
  const radius = shape === 'circle' ? '9999px' : '18%';
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {(active || winner) && (
        <div
          className={`absolute -inset-[3px] ${active ? 'animate-spin' : ''}`}
          style={{
            borderRadius: radius,
            animationDuration: '2.4s',
            background: winner
              ? 'conic-gradient(from 0deg, #fde047, #f59e0b, #fff7ae, #f59e0b, #fde047)'
              : `conic-gradient(from 0deg, ${ch.color}, transparent 40%, ${ch.color2}, transparent 80%, ${ch.color})`,
          }}
        />
      )}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: radius,
          boxShadow: winner
            ? '0 0 24px rgba(253,224,71,0.85)'
            : `0 0 0 2px ${ch.color}cc, 0 6px 16px rgba(0,0,0,0.55)`,
          background: `radial-gradient(circle at 50% 30%, ${ch.color}55, #0b1020 75%)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={charImage(id, expr)}
          alt={ch.name}
          draggable={false}
          loading="lazy"
          className={`h-full w-full object-cover object-top transition-all duration-300 ${
            dimmed ? 'grayscale brightness-50' : ''
          }`}
        />
      </div>
    </div>
  );
}
