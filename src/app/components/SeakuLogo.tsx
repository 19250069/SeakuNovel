export function SeakuLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Book base */}
      <rect x="10" y="32" width="44" height="28" rx="3" fill="#7c3aed" opacity="0.9" />
      <rect x="12" y="34" width="40" height="24" rx="2" fill="#1e1535" />
      {/* Book spine */}
      <line x1="32" y1="32" x2="32" y2="60" stroke="#a855f7" strokeWidth="1.5" />
      {/* Book pages */}
      <rect x="14" y="36" width="16" height="2" rx="1" fill="#a855f7" opacity="0.4" />
      <rect x="14" y="40" width="12" height="2" rx="1" fill="#a855f7" opacity="0.3" />
      <rect x="14" y="44" width="14" height="2" rx="1" fill="#a855f7" opacity="0.4" />
      <rect x="34" y="36" width="16" height="2" rx="1" fill="#a855f7" opacity="0.4" />
      <rect x="34" y="40" width="12" height="2" rx="1" fill="#a855f7" opacity="0.3" />
      <rect x="34" y="44" width="14" height="2" rx="1" fill="#a855f7" opacity="0.4" />
      {/* Magic star on book */}
      <polygon points="32,48 34,52 38,52 35,55 36,59 32,56 28,59 29,55 26,52 30,52" fill="#c084fc" />
      {/* Wizard hat */}
      <path d="M20 34 L32 4 L44 34" fill="#7c3aed" />
      <path d="M22 34 L32 8 L42 34" fill="#a855f7" />
      {/* Hat brim */}
      <ellipse cx="32" cy="34" rx="16" ry="4" fill="#7c3aed" />
      {/* Hat band */}
      <rect x="24" y="28" width="16" height="3" rx="1.5" fill="#c084fc" />
      {/* Hat star */}
      <circle cx="32" cy="18" r="2.5" fill="#fbbf24" />
      <circle cx="32" cy="18" r="1.5" fill="#fef3c7" />
      {/* Sparkles */}
      <circle cx="18" cy="14" r="1" fill="#c084fc" opacity="0.7" />
      <circle cx="46" cy="10" r="1.2" fill="#fbbf24" opacity="0.6" />
      <circle cx="50" cy="20" r="0.8" fill="#c084fc" opacity="0.5" />
      <circle cx="14" cy="24" r="0.8" fill="#fbbf24" opacity="0.5" />
    </svg>
  );
}
