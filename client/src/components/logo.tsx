export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-label="Bouwmateriaal AI Lab logo"
      role="img"
    >
      {/* stacked building blocks */}
      <rect x="3" y="17" width="12" height="12" rx="1.5" fill="currentColor" />
      <rect x="17" y="17" width="12" height="12" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="10" y="3" width="12" height="12" rx="1.5" fill="hsl(22 90% 55%)" />
    </svg>
  );
}
