'use client';

import { AI_PERSONAS, Persona, Role } from '@/types/shachiku-jinro';

const HUMAN_LOOK: Persona['look'] = {
  skin: '#eed0b2',
  hair: '#231f1d',
  hairStyle: 'side',
  suit: '#1f2937',
  accent: '#d4a24c',
  glasses: false,
  age: 'young',
};

export function EmployeePortrait({
  personaIndex,
  isDead = false,
  size = 56,
  className = '',
}: {
  personaIndex: number;
  isDead?: boolean;
  size?: number;
  className?: string;
}) {
  const look =
    personaIndex >= 0 && personaIndex < AI_PERSONAS.length
      ? AI_PERSONAS[personaIndex].look
      : HUMAN_LOOK;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={` select-none ${isDead ? 'grayscale contrast-125' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* ID Photo backdrop */}
      <rect x="0" y="0" width="64" height="64" fill={isDead ? '#1c1815' : '#25211b'} />
      <line x1="0" y1="16" x2="64" y2="16" stroke="#332c23" strokeWidth="0.75" />
      <line x1="0" y1="32" x2="64" y2="32" stroke="#332c23" strokeWidth="0.75" />
      <line x1="0" y1="48" x2="64" y2="48" stroke="#332c23" strokeWidth="0.75" />

      {/* Back hair for long/bob/bun */}
      {look.hairStyle === 'long' && (
        <path d="M16 24 C14 38 15 52 18 58 L46 58 C49 52 50 38 48 24 Z" fill={look.hair} />
      )}
      {look.hairStyle === 'bob' && (
        <path d="M17 24 C15 34 16 44 20 46 L44 46 C48 44 49 34 47 24 Z" fill={look.hair} />
      )}
      {look.hairStyle === 'bun' && (
        <circle cx="32" cy="10" r="7" fill={look.hair} />
      )}

      {/* Suit & Shirt & Tie */}
      <path d="M10 64 C11 49 20 45 32 45 C44 45 53 49 54 64 Z" fill={look.suit} />
      <polygon points="25,45 39,45 32,59" fill="#f3eee4" />
      <polygon points="30,47 34,47 35,61 32,64 29,61" fill={look.accent} />
      {/* Lapel lines */}
      <path d="M25 45 L21 56 L28 57" fill="none" stroke="#151412" strokeWidth="1.2" opacity="0.55" />
      <path d="M39 45 L43 56 L36 57" fill="none" stroke="#151412" strokeWidth="1.2" opacity="0.55" />

      {/* Neck & Head */}
      <rect x="27" y="38" width="10" height="9" rx="3" fill={look.skin} />
      <ellipse cx="32" cy="27" rx="13" ry="15" fill={look.skin} />

      {/* Ears */}
      <circle cx="19" cy="28" r="2.6" fill={look.skin} />
      <circle cx="45" cy="28" r="2.6" fill={look.skin} />

      {/* Hair top */}
      {look.hairStyle === 'side' && (
        <path d="M18 25 C18 14 25 11 33 11 C41 11 46 15 46 25 C42 19 35 18 27 20 C23 21 20 23 18 25 Z" fill={look.hair} />
      )}
      {look.hairStyle === 'bald' && (
        <>
          <path d="M18 25 C18 21 19 19 21 18 L21 25 Z" fill={look.hair} />
          <path d="M46 25 C46 21 45 19 43 18 L43 25 Z" fill={look.hair} />
          <path d="M26 16 Q32 14.5 38 16" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.25" />
        </>
      )}
      {look.hairStyle === 'bob' && (
        <path d="M18 26 C18 13 24 11 32 11 C40 11 46 13 46 26 C42 20 38 19 32 19 C26 19 22 20 18 26 Z" fill={look.hair} />
      )}
      {look.hairStyle === 'long' && (
        <path d="M18 26 C18 13 24 11 32 11 C40 11 46 13 46 26 C41 19 34 18 26 20 C22 21 20 23 18 26 Z" fill={look.hair} />
      )}
      {look.hairStyle === 'spiky' && (
        <path d="M18 25 L20 14 L25 17 L29 10 L33 16 L38 10 L41 17 L46 14 L46 25 C41 20 23 20 18 25 Z" fill={look.hair} />
      )}
      {look.hairStyle === 'bun' && (
        <path d="M18 25 C18 14 24 12 32 12 C40 12 46 14 46 25 C41 19 23 19 18 25 Z" fill={look.hair} />
      )}
      {look.hairStyle === 'buzz' && (
        <path d="M19 24 C19 14 25 12 32 12 C39 12 45 14 45 24 C41 19 23 19 19 24 Z" fill={look.hair} opacity="0.88" />
      )}
      {look.hairStyle === 'wave' && (
        <path d="M18 25 C17 14 25 11 32 12 C39 11 47 14 46 25 C43 21 38 19 33 21 C28 23 22 20 18 25 Z" fill={look.hair} />
      )}

      {/* Eyebrows & Eyes */}
      <line x1="24" y1="24" x2="29" y2="24.5" stroke="#221d1a" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="35" y1="24.5" x2="40" y2="24" stroke="#221d1a" strokeWidth="1.4" strokeLinecap="round" />
      {isDead ? (
        <>
          <line x1="25" y1="26.5" x2="28.5" y2="29.5" stroke="#221d1a" strokeWidth="1.4" />
          <line x1="28.5" y1="26.5" x2="25" y2="29.5" stroke="#221d1a" strokeWidth="1.4" />
          <line x1="35.5" y1="26.5" x2="39" y2="29.5" stroke="#221d1a" strokeWidth="1.4" />
          <line x1="39" y1="26.5" x2="35.5" y2="29.5" stroke="#221d1a" strokeWidth="1.4" />
        </>
      ) : (
        <>
          <circle cx="26.8" cy="28" r="1.6" fill="#1b1815" />
          <circle cx="37.2" cy="28" r="1.6" fill="#1b1815" />
        </>
      )}

      {/* Glasses */}
      {look.glasses && (
        <g stroke="#2c2520" strokeWidth="1.2" fill="none">
          <rect x="23" y="25.5" width="7.5" height="5" rx="1" />
          <rect x="33.5" y="25.5" width="7.5" height="5" rx="1" />
          <line x1="30.5" y1="28" x2="33.5" y2="28" />
        </g>
      )}

      {/* Age lines & Mouth */}
      {look.age === 'old' && (
        <>
          <line x1="24" y1="32" x2="26" y2="35" stroke="#8a6b52" strokeWidth="0.9" opacity="0.6" />
          <line x1="40" y1="32" x2="38" y2="35" stroke="#8a6b52" strokeWidth="0.9" opacity="0.6" />
        </>
      )}
      <path
        d={isDead ? 'M29 36 Q32 34 35 36' : 'M28.5 35.5 Q32 37 35.5 35.5'}
        fill="none"
        stroke="#5a3e2e"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* Photo border */}
      <rect x="0.5" y="0.5" width="63" height="63" fill="none" stroke="#4a3f31" strokeWidth="1" />
    </svg>
  );
}

export function RoleEmblem({
  role,
  size = 20,
  className = '',
}: {
  role: Role;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {role === 'SPY' && (
        <>
          {/* Fedora / Briefcase Spy icon */}
          <path d="M3 11h18" />
          <path d="M6 11l2-6 4 1.5L16 5l2 6" />
          <circle cx="8.5" cy="15.5" r="2.5" />
          <circle cx="15.5" cy="15.5" r="2.5" />
          <path d="M11 15.5h2" />
        </>
      )}
      {role === 'DRONE' && (
        <>
          {/* Necktie / Briefcase icon */}
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </>
      )}
      {role === 'HR' && (
        <>
          {/* Magnifying glass over personnel file */}
          <circle cx="10.5" cy="10.5" r="5.5" />
          <line x1="14.5" y1="14.5" x2="20" y2="20" />
          <circle cx="10.5" cy="9.5" r="1.8" />
          <path d="M7.8 13.5c.6-1.2 1.6-1.8 2.7-1.8s2.1.6 2.7 1.8" />
        </>
      )}
      {role === 'GA' && (
        <>
          {/* Shield emblem */}
          <path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6l7-3z" />
          <path d="M9.5 12l2 2 3.5-3.5" />
        </>
      )}
      {role === 'GOSSIP' && (
        <>
          {/* Broadcast / Whisper waves */}
          <path d="M4 11a8 8 0 0 1 16 0" />
          <path d="M7 14a5 5 0 0 1 10 0" />
          <circle cx="12" cy="17" r="2" />
        </>
      )}
      {role === 'YESMAN' && (
        <>
          {/* Theatrical double mask / megaphone */}
          <path d="M3 11l11-5v12L3 13v-2z" />
          <path d="M14 9a4 4 0 0 1 0 6" />
          <path d="M6 14l1.5 5h2.5L9 14" />
        </>
      )}
      {role === 'ENGINEER' && (
        <>
          {/* Connected dual terminal nodes */}
          <rect x="2" y="4" width="8" height="7" rx="1" />
          <rect x="14" y="13" width="8" height="7" rx="1" />
          <path d="M10 7.5h4v9h-4" />
        </>
      )}
      {role === 'CONSULTANT' && (
        <>
          {/* Fox / Diamond crown crest */}
          <polygon points="12,3 20,9 17,20 7,20 4,9" />
          <polyline points="8,13 11,10 13,13 16,9" />
        </>
      )}
    </svg>
  );
}
