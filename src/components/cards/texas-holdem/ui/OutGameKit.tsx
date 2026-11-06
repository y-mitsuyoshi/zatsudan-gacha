'use client';

/**
 * Shared building blocks for the out-of-game screens (title / lobby / modals):
 * inline SVG icons, gold buttons, glass panels, modal shell and keyframes.
 */

import React, { useEffect, useRef } from 'react';
import { holdemAudio } from '../audio';
import { CHARACTERS, type CharId, type VoiceEvent } from '../characters';

// ---------------------------------------------------------------------------
// Keyframes (injected once per screen; duplicate <style> tags are harmless)
// ---------------------------------------------------------------------------

export const OUTGAME_KEYFRAMES = `
@keyframes rfn-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes rfn-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes rfn-scale-in { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes rfn-slide-left { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: none; } }
@keyframes rfn-slide-right { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: none; } }
@keyframes rfn-kenburns { 0% { transform: scale(1.04) translate(0, 0); } 50% { transform: scale(1.14) translate(-1.5%, -1%); } 100% { transform: scale(1.04) translate(0, 0); } }
@keyframes rfn-float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-10px) scale(1.012); } }
@keyframes rfn-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.97); } }
@keyframes rfn-shine { 0% { transform: translateX(-120%) skewX(-20deg); } 55%, 100% { transform: translateX(220%) skewX(-20deg); } }
@keyframes rfn-rays { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes rfn-sparkle { 0%, 100% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1); } }
@keyframes rfn-rise { 0% { opacity: 0; transform: translateY(0); } 15% { opacity: 1; } 100% { opacity: 0; transform: translateY(-60vh); } }
@keyframes rfn-bubble { 0% { opacity: 0; transform: translateY(8px) scale(0.9); } 12% { opacity: 1; transform: none; } 88% { opacity: 1; } 100% { opacity: 0; transform: translateY(-4px); } }
@keyframes rfn-glow { 0%, 100% { box-shadow: 0 0 18px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.45); } 50% { box-shadow: 0 0 36px rgba(251,191,36,0.7), inset 0 1px 0 rgba(255,255,255,0.45); } }
@keyframes rfn-bar { from { transform: scaleX(0); } }
.rfn-reduced *, .rfn-reduced *::before, .rfn-reduced *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
@media (prefers-reduced-motion: reduce) {
  .rfn-motion { animation: none !important; }
}
`;

export function OutGameStyles() {
  return <style>{OUTGAME_KEYFRAMES}</style>;
}

/** staggered entrance style helper */
export function stagger(i: number, base = 60, anim = 'rfn-fade-up'): React.CSSProperties {
  return { animation: `${anim} 420ms cubic-bezier(.2,.8,.2,1) ${base + i * 70}ms both` };
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

type IconProps = { className?: string };
const svgBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const IconGear = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...svgBase} className={className}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.25.4-1.51 1Z" />
  </svg>
);
export const IconUser = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...svgBase} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </svg>
);
export const IconCards = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...svgBase} className={className}>
    <rect x="3" y="5" width="11" height="15" rx="2" transform="rotate(-8 8.5 12.5)" />
    <rect x="10" y="4" width="11" height="15" rx="2" transform="rotate(8 15.5 11.5)" />
    <path d="M15.6 9.5c-1 1.2-2.2 1.9-2.2 3a1.3 1.3 0 0 0 2.2.9 1.3 1.3 0 0 0 2.2-.9c0-1.1-1.2-1.8-2.2-3Z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconBack = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...svgBase} className={className}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const IconClose = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...svgBase} className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconCrown = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...svgBase} className={className}>
    <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z" fill="currentColor" fillOpacity={0.2} />
  </svg>
);
export const IconCoin = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <circle cx="12" cy="12" r="10" fill="#f59e0b" />
    <circle cx="12" cy="12" r="7.5" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
    <path d="M12 7.5l1.3 2.8 3 .3-2.3 2 .7 3-2.7-1.6-2.7 1.6.7-3-2.3-2 3-.3L12 7.5Z" fill="#b45309" />
  </svg>
);
export const IconBook = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...svgBase} className={className}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" />
    <path d="M4 19a2 2 0 0 1 2-2h13" />
  </svg>
);
export const IconSpeaker = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg {...svgBase} className={className}>
    <path d="M11 5L6 9H3v6h3l5 4V5Z" fill="currentColor" fillOpacity={0.25} />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
export const IconHeart = ({ className = 'h-4 w-4', filled = true }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path
      d="M12 20.5s-7.5-4.6-9.4-9.3C1.3 7.9 3.5 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.7 3.4 4.4 6.7-1.9 4.7-9.4 9.3-9.4 9.3Z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);
export const IconPencil = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg {...svgBase} className={className}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
);
export const IconPlay = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" />
  </svg>
);

// ---------------------------------------------------------------------------
// Buttons / panels
// ---------------------------------------------------------------------------

export const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b14]';

export const BTN_SHADOW = 'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_20px_rgba(0,0,0,0.45)]';

export const GOLD_TEXT =
  'bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-transparent';

export const SUB_LABEL = 'text-[10px] tracking-[0.3em] uppercase text-amber-200/70';

export const GLASS = 'bg-slate-950/70 backdrop-blur-md border border-amber-300/30';

type Variant = 'gold' | 'dark' | 'ghost' | 'rose';
const VARIANT: Record<Variant, string> = {
  gold: 'bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 text-slate-950 border border-amber-100/70',
  dark: 'bg-gradient-to-b from-slate-700/90 to-slate-900/95 text-amber-100 border border-amber-300/30',
  ghost: 'bg-slate-950/50 text-amber-100 border border-amber-300/25 backdrop-blur-sm',
  rose: 'bg-gradient-to-b from-rose-400 via-rose-500 to-rose-700 text-white border border-rose-200/60',
};

export interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** play click SE (default true) */
  sound?: boolean;
}

export function GameButton({
  variant = 'dark',
  sound = true,
  className = '',
  onClick,
  children,
  type = 'button',
  ...rest
}: GameButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      onClick={(e) => {
        if (sound) holdemAudio.se('click');
        onClick?.(e);
      }}
      className={`relative inline-flex select-none items-center justify-center gap-1.5 rounded-xl font-bold transition duration-150 ease-out hover:brightness-110 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 ${BTN_SHADOW} ${VARIANT[variant]} ${FOCUS_RING} ${className}`}
    >
      {children}
    </button>
  );
}

/** Heading with gold gradient + small caps English sub-label. */
export function GoldHeading({ ja, en, className = '' }: { ja: string; en?: string; className?: string }) {
  return (
    <div className={className}>
      {en && <p className={SUB_LABEL}>{en}</p>}
      <h2 className={`font-black tracking-wide ${GOLD_TEXT}`}>{ja}</h2>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

export interface ModalShellProps {
  open: boolean;
  onClose(): void;
  title: string;
  titleEn?: string;
  children: React.ReactNode;
  /** tailwind max-width class */
  maxWidth?: string;
  /** full-screen on mobile */
  tall?: boolean;
}

let scrollLocks = 0;

/** Fade+scale modal with ESC/backdrop close, body scroll lock and open/close SE. */
export function ModalShell({ open, onClose, title, titleEn, children, maxWidth = 'max-w-lg', tall = false }: ModalShellProps) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    holdemAudio.se('open');
    scrollLocks += 1;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        holdemAudio.se('close');
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) document.body.style.overflow = prevOverflow === 'hidden' ? '' : prevOverflow;
    };
  }, [open]);

  if (!open) return null;
  const close = () => {
    holdemAudio.se('close');
    onClose();
  };
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <OutGameStyles />
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        style={{ animation: 'rfn-fade-in 220ms ease-out both' }}
        onClick={close}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative flex w-full ${maxWidth} flex-col overflow-hidden rounded-t-3xl border border-amber-300/30 bg-gradient-to-b from-slate-900/95 via-[#0a0f1d]/95 to-[#070b14]/95 shadow-[0_30px_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(253,230,138,0.25)] outline-none sm:rounded-3xl ${
          tall ? 'h-[100dvh] sm:h-[min(90dvh,860px)]' : 'max-h-[92dvh]'
        }`}
        style={{ animation: 'rfn-scale-in 280ms cubic-bezier(.2,.8,.2,1) both' }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-300/15 px-5 py-3.5">
          <GoldHeading ja={title} en={titleEn} className="[&_h2]:text-lg sm:[&_h2]:text-xl" />
          <button
            type="button"
            onClick={close}
            aria-label="閉じる"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-slate-900/80 text-amber-100 transition hover:bg-slate-800 active:scale-95 ${FOCUS_RING}`}
          >
            <IconClose />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice helper
// ---------------------------------------------------------------------------

export function speakLine(id: CharId, text: string, enabled: boolean) {
  const ch = CHARACTERS[id];
  holdemAudio.speak(text, { pitch: ch.voicePitch, rate: ch.voiceRate, gender: ch.voiceGender, enabled });
}

export function randomLine(id: CharId, events: VoiceEvent[]): string {
  const ev = events[Math.floor(Math.random() * events.length)];
  const arr = CHARACTERS[id].lines[ev];
  return arr[Math.floor(Math.random() * arr.length)];
}

/** CSS mask that fades the dark square bg of the bust-up illustrations into the scene. */
export const PORTRAIT_MASK: React.CSSProperties = {
  WebkitMaskImage:
    'radial-gradient(ellipse 62% 70% at 50% 42%, #000 55%, transparent 100%), linear-gradient(to bottom, #000 70%, transparent 100%)',
  maskImage:
    'radial-gradient(ellipse 62% 70% at 50% 42%, #000 55%, transparent 100%), linear-gradient(to bottom, #000 70%, transparent 100%)',
  WebkitMaskComposite: 'source-in',
  maskComposite: 'intersect',
};

/** Formats numbers with thousands separators. */
export function fmt(n: number): string {
  return n.toLocaleString('ja-JP');
}
