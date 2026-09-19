import * as React from 'react';

export function SpiralLogoIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10" stroke="#38bdf8" />
      <path d="M12 6a6 6 0 1 0 6 6" stroke="#fbbf24" />
      <path d="M12 9a3 3 0 1 0 3 3" stroke="#f43f5e" />
      <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
    </svg>
  );
}

export function CreditIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" stroke="#fbbf24" fill="#78350f" fillOpacity="0.4" />
      <path d="M12 6v12M9 9h6a2 2 0 0 1 0 4H9h6a2 2 0 0 1 0 4H9" stroke="#fde047" />
    </svg>
  );
}

export function HpIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#22c55e" stroke="#86efac" />
    </svg>
  );
}

export function WaveIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12c3-4 6-4 8 0s5 4 8 0 4-4 4-4" stroke="#38bdf8" />
      <path d="M2 16c3-4 6-4 8 0s5 4 8 0 4-4 4-4" stroke="#0284c7" strokeOpacity="0.6" />
    </svg>
  );
}

export function BurstIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#f472b6" />
      <circle cx="12" cy="12" r="3" fill="#f472b6" />
    </svg>
  );
}

export function BlasterIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 14h6l4-8h8l-3 8h-4l-1 5H6l-3-5z" stroke="#38bdf8" fill="#0284c7" fillOpacity="0.3" />
    </svg>
  );
}

export function DroneIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 8-8 8-8-8 8-8z" stroke="#38bdf8" fill="#0f172a" />
      <circle cx="12" cy="10" r="3" fill="#38bdf8" />
      <path d="M4 18l4-4M20 18l-4-4" stroke="#f59e0b" />
    </svg>
  );
}

export function EnergyDrinkIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="7" y="4" width="10" height="16" rx="3" stroke="#fb923c" fill="#7c2d12" fillOpacity="0.4" />
      <path d="M13 8l-3 4h4l-3 4" stroke="#fde047" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LaserBeamIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20L20 4M8 20L20 8M4 16L16 4" stroke="#facc15" strokeLinecap="round" />
      <circle cx="18" cy="6" r="3" fill="#fef08a" />
    </svg>
  );
}

export function BriefcaseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" stroke="#38bdf8" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="#38bdf8" />
      <line x1="12" y1="12" x2="12" y2="12.01" stroke="#38bdf8" strokeWidth="3" />
    </svg>
  );
}

export function ChipIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="5" width="14" height="14" rx="2" stroke="#22c55e" />
      <rect x="9" y="9" width="6" height="6" fill="#22c55e" fillOpacity="0.4" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" stroke="#22c55e" />
    </svg>
  );
}

export function DatabaseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" stroke="#38bdf8" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#38bdf8" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#38bdf8" />
    </svg>
  );
}

export function CalendarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#f59e0b" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="#f59e0b" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="#f59e0b" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="#f59e0b" />
    </svg>
  );
}

export function TrophyIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M18 9h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3" stroke="#fbbf24" />
      <path d="M4 3h16v7a8 8 0 0 1-16 0V3z" stroke="#fbbf24" fill="#78350f" fillOpacity="0.3" />
      <path d="M12 18v3M8 21h8" stroke="#fbbf24" />
    </svg>
  );
}

export function VolumeOnIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#38bdf8" stroke="#38bdf8" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke="#38bdf8" />
    </svg>
  );
}

export function VolumeMuteIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#64748b" stroke="#64748b" />
      <line x1="23" y1="9" x2="17" y2="15" stroke="#ef4444" strokeWidth="2.5" />
      <line x1="17" y1="9" x2="23" y2="15" stroke="#ef4444" strokeWidth="2.5" />
    </svg>
  );
}

export function PauseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="8" y1="5" x2="8" y2="19" stroke="#38bdf8" />
      <line x1="16" y1="5" x2="16" y2="19" stroke="#38bdf8" />
    </svg>
  );
}

export function PlayIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" fill="#22c55e" stroke="#22c55e" />
    </svg>
  );
}

export function RefreshIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" stroke="#fbbf24" />
      <polyline points="1 20 1 14 7 14" stroke="#fbbf24" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="#fbbf24" />
    </svg>
  );
}

export function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" stroke="#22c55e" />
    </svg>
  );
}

export function LockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="#64748b" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#64748b" />
    </svg>
  );
}

/**
 * Returns a high-contrast vector icon for upgrade cards and HUD items without any emojis.
 */
export function TechUpgradeIcon({ id, className = 'w-6 h-6' }: { id: string; className?: string }) {
  switch (id) {
    case 'dmg':
      // Documents / Laser Contract
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#38bdf8" />
          <polyline points="14 2 14 8 20 8" stroke="#38bdf8" />
          <line x1="16" y1="13" x2="8" y2="13" stroke="#f59e0b" />
          <line x1="16" y1="17" x2="8" y2="17" stroke="#f59e0b" />
        </svg>
      );
    case 'rate':
      // High-Speed Copier / Overclock
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="8" width="16" height="12" rx="2" stroke="#38bdf8" />
          <path d="M8 4h8v4H8z" stroke="#38bdf8" />
          <path d="M12 12l2 2-4 2" stroke="#22c55e" strokeLinecap="round" />
        </svg>
      );
    case 'multi':
      // CC Extra / Dual Blasters
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#38bdf8" />
          <polyline points="22,6 12,13 2,6" stroke="#38bdf8" />
        </svg>
      );
    case 'pierce':
      // Stapler / Armor Piercing Needles
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="#06b6d4" />
        </svg>
      );
    case 'crit':
      // Hanko Seal / Critical Execution
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" stroke="#ef4444" />
          <path d="M9 12l2 2 4-4" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'orb':
      return <DroneIcon className={className} />;
    case 'blast':
      return <EnergyDrinkIcon className={className} />;
    case 'beam':
      return <LaserBeamIcon className={className} />;
    case 'hp':
      // Bento energy pack
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="3" stroke="#10b981" fill="#064e3b" fillOpacity="0.4" />
          <path d="M12 9v6M9 12h6" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'regen':
      // Sleep / Thermal Sleep Capacitor
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="#a78bfa" fill="#4c1d95" fillOpacity="0.3" />
        </svg>
      );
    case 'atk':
      return <ChipIcon className={className} />;
    case 'rate_meta':
      return <RefreshIcon className={className} />;
    default:
      return <CreditIcon className={className} />;
  }
}
