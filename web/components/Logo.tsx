export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true">
        <path
          d="M2 1h18v22l-3-2-3 2-3-2-3 2-3-2-3 2z"
          fill="var(--receipt)"
          stroke="var(--hl)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M6 7h10M6 11h7M6 15h10" stroke="var(--receipt-ink)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="font-display text-xl font-semibold">Senbud</span>
    </span>
  );
}
