// "Highlighter S" mark + wordmark. Master artwork: art/logo/c-highlight-s.svg.
const S_PATH = "M31.5 15c-2.5-3-12.5-3.5-13 2.5 -.5 6 13.5 4.5 13 11.5 -.5 6.5-11.5 7-15 2.5";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true">
        {/* Faint ring so the tile still reads on the cobalt nav. */}
        <rect x="1" y="1" width="46" height="46" rx="11" fill="var(--panel)" stroke="var(--panel-line)" strokeWidth="2" />
        {/* The highlighter swipes across once on load (.logo-line in globals.css). */}
        <path
          className="logo-line"
          d="M13.2 32.9 34.8 29.1"
          pathLength={1}
          stroke="var(--hl)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path d={S_PATH} fill="none" stroke="var(--receipt-ink)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d={S_PATH} fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-xl font-semibold">
        Sen<span className="ml-px rounded-[5px] bg-hl px-1 text-receipt-ink">bud</span>
      </span>
    </span>
  );
}
