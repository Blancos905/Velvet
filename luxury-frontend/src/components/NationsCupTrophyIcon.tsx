/** Coppa stilizzata per Nations Cup (home e landing). */
export function NationsCupTrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="nc-trophy-cup" x1="32" y1="8" x2="32" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="0.45" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="nc-trophy-base" x1="32" y1="44" x2="32" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fcd34d" />
          <stop offset="1" stopColor="#92400e" />
        </linearGradient>
      </defs>
      <path
        d="M16 14h32l-2 26c-.6 4.8-4.6 8.5-9.5 8.5h-9c-4.9 0-8.9-3.7-9.5-8.5L16 14z"
        fill="url(#nc-trophy-cup)"
        stroke="#78350f"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 18H10c-2.2 0-4 2.4-3.4 5.2 1.2 5.8 5.4 10 10.4 11.2M48 18h6c2.2 0 4 2.4 3.4 5.2-1.2 5.8-5.4 10-10.4 11.2"
        stroke="#b45309"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M22 48.5h20v4H22v-4z" fill="url(#nc-trophy-base)" stroke="#78350f" strokeWidth="1.2" />
      <path
        d="M18 56.5h28l-3 8H21l-3-8z"
        fill="url(#nc-trophy-base)"
        stroke="#78350f"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M28 8h8v6h-8V8z"
        fill="#fff7ed"
        fillOpacity="0.35"
        stroke="#fde68a"
        strokeWidth="1"
      />
      <ellipse cx="32" cy="22" rx="10" ry="3" fill="#fff7ed" fillOpacity="0.22" />
    </svg>
  );
}
