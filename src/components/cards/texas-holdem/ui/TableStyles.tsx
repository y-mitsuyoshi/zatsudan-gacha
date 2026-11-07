'use client';

import React from 'react';

/** Shared keyframes for the in-game table. Rendered once by TableScreen. */
export function TableStyles() {
  return (
    <style>{`
@keyframes rf-deal {
  0% { transform: translate(var(--dx), var(--dy)) rotate(-160deg) scale(0.45); opacity: 0; }
  25% { opacity: 1; }
  100% { transform: translate(0, 0) rotate(0) scale(1); opacity: 1; }
}
@keyframes rf-chip-in {
  0% { transform: translate(var(--fx), var(--fy)) scale(0.7); opacity: 0.2; }
  70% { opacity: 1; }
  100% { transform: translate(0, 0) scale(1); opacity: 1; }
}
@keyframes rf-fly {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0.75); opacity: 0; }
}
@keyframes rf-pop {
  0% { transform: translate(-50%, 0) scale(0.3) rotate(-8deg); opacity: 0; }
  55% { transform: translate(-50%, 0) scale(1.18) rotate(2deg); opacity: 1; }
  100% { transform: translate(-50%, 0) scale(1) rotate(0); opacity: 1; }
}
@keyframes rf-bubble {
  0% { transform: translateY(6px) scale(0.85); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes rf-rays { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes rf-breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.012); }
}
@keyframes rf-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(253, 224, 71, 0.55); }
  50% { box-shadow: 0 0 0 10px rgba(253, 224, 71, 0); }
}
@keyframes rf-toast {
  0% { transform: translateX(120%); opacity: 0; }
  12% { transform: translateX(0); opacity: 1; }
  88% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(120%); opacity: 0; }
}
@keyframes rf-cardglow {
  0%, 100% { box-shadow: 0 0 0 2px #fde047, 0 0 14px 3px rgba(253, 224, 71, 0.6); }
  50% { box-shadow: 0 0 0 2px #fff7ae, 0 0 26px 8px rgba(253, 224, 71, 0.95); }
}
@keyframes rf-shine {
  0% { left: -40%; }
  60%, 100% { left: 130%; }
}
@keyframes rf-banner {
  0% { transform: scale(2.4); opacity: 0; letter-spacing: 0.6em; }
  40% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1); opacity: 1; letter-spacing: 0.12em; }
}
@keyframes rf-fadeup {
  0% { transform: translateY(16px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes rf-dots {
  0%, 20% { opacity: 0.2; }
  50% { opacity: 1; }
  100% { opacity: 0.2; }
}
@keyframes rf-glowbtn {
  0%, 100% { filter: brightness(1); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.0), inset 0 1px 0 rgba(255,255,255,0.35); }
  50% { filter: brightness(1.12); box-shadow: 0 0 22px 2px rgba(251, 191, 36, 0.55), inset 0 1px 0 rgba(255,255,255,0.35); }
}
@keyframes rf-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes rf-hand-ribbon {
  0% { transform: translateX(-50%) scale(0.4) skewX(-10deg); opacity: 0; }
  65% { transform: translateX(-50%) scale(1.12) skewX(-10deg); opacity: 1; }
  100% { transform: translateX(-50%) scale(1) skewX(-10deg); opacity: 1; }
}
@keyframes rf-payout-float {
  0% { transform: translate(-50%, 10px) scale(0.6); opacity: 0; }
  25% { transform: translate(-50%, -2px) scale(1.08); opacity: 1; }
  100% { transform: translate(-50%, -6px) scale(1); opacity: 1; }
}
@keyframes rf-crown-bounce {
  0%, 100% { transform: translate(-50%, 0) scale(1); }
  50% { transform: translate(-50%, -4px) scale(1.08); }
}
@keyframes rf-street-sweep {
  0% { transform: translateX(-120%) skewX(-20deg); }
  100% { transform: translateX(220%) skewX(-20deg); }
}
@media (prefers-reduced-motion: reduce) {
  .rf-motion { animation: none !important; transition: none !important; }
}
`}</style>
  );
}

export default TableStyles;
