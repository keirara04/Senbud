// Bud, the assistant: a receipt with a face. Copied from the bud and bud-yay symbols in
// docs/concepts/senbud-landing-mockup.html. Bud is the same in light and dark, like every receipt.
export function Bud({ size, face = "happy", className = "" }: { size: number; face?: "happy" | "yay"; className?: string }) {
  return (
    <svg className={`bud ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M14 6h36a5 5 0 0 1 5 5v41l-5.75 5-5.75-5-5.75 5-5.75-5-5.75 5-5.75-5-5.75 5-5.75-5V11a5 5 0 0 1 5-5z"
        fill="#fff"
        stroke="#1a1c2e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M18 15h20M18 20h13" stroke="#1a1c2e" strokeOpacity=".22" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="19.5" cy="39" rx="3.6" ry="2.2" fill="#ff6b5b" fillOpacity=".45" />
      <ellipse cx="44.5" cy="39" rx="3.6" ry="2.2" fill="#ff6b5b" fillOpacity=".45" />
      {face === "yay" ? (
        <>
          <path d="M21.5 33q3.5-4.5 7 0M35.5 33q3.5-4.5 7 0" fill="none" stroke="#1a1c2e" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M27 36.5h10q0 6.5-5 6.5t-5-6.5z" fill="#1a1c2e" />
        </>
      ) : (
        <>
          {/* The eyes blink every 5.5 s (.bud-eyes in landing.css). */}
          <g className="bud-eyes">
            <ellipse cx="25" cy="32" rx="3" ry="3.6" fill="#1a1c2e" />
            <ellipse cx="39" cy="32" rx="3" ry="3.6" fill="#1a1c2e" />
            <circle cx="26" cy="30.6" r="1" fill="#fff" />
            <circle cx="40" cy="30.6" r="1" fill="#fff" />
          </g>
          <path d="M28.5 38.5q3.5 3.5 7 0" fill="none" stroke="#1a1c2e" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
