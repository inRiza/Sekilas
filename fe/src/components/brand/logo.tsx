import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

/**
 * Sekilas Official Logo (from Figma Logo Page: `image 8 [Vectorized]`)
 * S-curved ribbon with opposing arrows in royal blue gradient.
 */
export function SekilasLogoIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Sekilas"
    >
      <defs>
        <linearGradient id="sekilasLogoGradient" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="35%" stopColor="#2563eb" />
          <stop offset="70%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="sekilasArrowTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="sekilasArrowBottom" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>

      {/* S-Ribbon Main Body */}
      {/* Top arrow pointing North-East */}
      <path
        d="M 44 26 L 68 18 L 62 42 L 53 33 C 40 46 36 54 36 62 C 36 68 39 74 44 78 C 36 78 28 72 26 62 C 24 50 32 38 44 26 Z"
        fill="url(#sekilasLogoGradient)"
      />

      {/* Flowing connector ribbon */}
      <path
        d="M 52 32 C 64 44 68 52 68 60 C 68 68 63 74 54 78 L 34 84 L 40 60 L 49 69 C 58 60 60 52 56 42 L 52 32 Z"
        fill="url(#sekilasLogoGradient)"
        opacity="0.95"
      />

      {/* Top arrowhead */}
      <path
        d="M 68 18 L 74 36 L 58 31 Z"
        fill="url(#sekilasArrowTop)"
      />

      {/* Bottom arrowhead */}
      <path
        d="M 32 84 L 26 66 L 42 71 Z"
        fill="url(#sekilasArrowBottom)"
      />
    </svg>
  );
}

export function SekilasLogo({
  size = 26,
  showText = true,
  className = '',
  textClassName = 'text-[17px] font-semibold tracking-[-0.02em] text-ink',
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <SekilasLogoIcon size={size} />
      {showText && <span className={textClassName}>Sekilas</span>}
    </div>
  );
}
