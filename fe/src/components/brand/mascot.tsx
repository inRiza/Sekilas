import React from 'react';
import { SekilasLogoIcon } from './logo';

interface MascotProps {
  size?: number;
  className?: string;
  pose?: 'default' | 'waving' | 'happy';
  showBadge?: boolean;
}

/**
 * Sekilas Official Mascot (`mascot 3` from Figma Logo Page)
 * Friendly robot with curved screen face, pill eyes, floating round hands, and chest logo badge.
 */
export function SekilasMascot({
  size = 80,
  className = '',
  pose = 'default',
  showBadge = true,
}: MascotProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      aria-label="Maskot Sekilas"
    >
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        <defs>
          {/* Head & Body Soft Gradient */}
          <linearGradient id="mascotBodyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="85%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Side Headphone Pads */}
          <linearGradient id="mascotPadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#bfdbfe" />
          </linearGradient>

          {/* Screen Visor Gradient */}
          <linearGradient id="mascotScreenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>

          {/* Floating Hands Gradient */}
          <linearGradient id="mascotHandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>

          {/* Subtle Outer Shadow for Robot Base */}
          <radialGradient id="mascotBaseShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Ground Shadow */}
        <ellipse cx="80" cy="148" rx="42" ry="7" fill="url(#mascotBaseShadow)" />

        {/* Side Ear/Headphone Pads (Left & Right) */}
        <rect x="22" y="52" width="14" height="34" rx="7" fill="url(#mascotPadGrad)" stroke="#cbd5e1" strokeWidth="1" />
        <rect x="124" y="52" width="14" height="34" rx="7" fill="url(#mascotPadGrad)" stroke="#cbd5e1" strokeWidth="1" />

        {/* Main Body Capsule */}
        <rect
          x="30"
          y="24"
          width="100"
          height="112"
          rx="50"
          fill="url(#mascotBodyGrad)"
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />

        {/* Visor Screen Outer Rim */}
        <rect
          x="42"
          y="38"
          width="76"
          height="54"
          rx="22"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Visor Screen Face */}
        <rect
          x="44"
          y="40"
          width="72"
          height="50"
          rx="20"
          fill="url(#mascotScreenGrad)"
        />

        {/* Screen Top-Left Subtle Sheen Reflection */}
        <path
          d="M 52 44 Q 80 44 104 47 Q 80 49 52 46 Z"
          fill="#ffffff"
          opacity="0.15"
        />

        {/* Glowing Pill Eyes */}
        {/* Left Eye */}
        <rect
          x="58"
          y="52"
          width="11"
          height="20"
          rx="5.5"
          fill="#ffffff"
          filter="drop-shadow(0px 0px 3px rgba(255,255,255,0.8))"
        />
        {/* Right Eye */}
        <rect
          x="91"
          y="52"
          width="11"
          height="20"
          rx="5.5"
          fill="#ffffff"
          filter="drop-shadow(0px 0px 3px rgba(255,255,255,0.8))"
        />

        {/* Chest S-Logo Badge */}
        {showBadge && (
          <g transform="translate(68, 102) scale(0.24)">
            {/* S-Shape Icon on Chest */}
            <path
              d="M 44 26 L 68 18 L 62 42 L 53 33 C 40 46 36 54 36 62 C 36 68 39 74 44 78 C 36 78 28 72 26 62 C 24 50 32 38 44 26 Z"
              fill="#2563eb"
            />
            <path
              d="M 52 32 C 64 44 68 52 68 60 C 68 68 63 74 54 78 L 34 84 L 40 60 L 49 69 C 58 60 60 52 56 42 L 52 32 Z"
              fill="#3b82f6"
            />
            <path d="M 68 18 L 74 36 L 58 31 Z" fill="#60a5fa" />
            <path d="M 32 84 L 26 66 L 42 71 Z" fill="#1d4ed8" />
          </g>
        )}

        {/* Floating Round Cute Hands (Paws) */}
        {/* Left Hand */}
        <circle
          cx={pose === 'waving' ? 22 : 36}
          cy={pose === 'waving' ? 56 : 120}
          r="14"
          fill="url(#mascotHandGrad)"
          stroke="#bfdbfe"
          strokeWidth="1.5"
        />

        {/* Right Hand */}
        <circle
          cx={pose === 'waving' ? 128 : 124}
          cy="120"
          r="14"
          fill="url(#mascotHandGrad)"
          stroke="#bfdbfe"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
