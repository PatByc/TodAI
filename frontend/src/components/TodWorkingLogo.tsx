interface TodWorkingLogoProps {
  size?: number
  working: boolean
}

/** Tod's original mascot with a run-state-driven reading animation. */
export function TodWorkingLogo({ size = 48, working }: TodWorkingLogoProps) {
  return (
    <svg
      className={`tod-working-logo${working ? " is-working" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={working ? "Tod is reading while he works" : "Tod"}
    >
      <g className="tod-working-head">
        <path d="M32 17V10" className="tod-working-outline" />
        <circle cx="32" cy="7" r="3.5" className="tod-working-antenna" />
        <path d="M10 29H7.5A3.5 3.5 0 0 0 4 32.5v4A3.5 3.5 0 0 0 7.5 40H10" className="tod-working-outline" />
        <path d="M54 29h2.5a3.5 3.5 0 0 1 3.5 3.5v4a3.5 3.5 0 0 1-3.5 3.5H54" className="tod-working-outline" />
        <rect x="10" y="17" width="44" height="36" rx="11" className="tod-working-face" />
        <g className="tod-working-eyes">
          <ellipse className="tod-working-eye tod-working-eye-left" cx="24" cy="33" rx="2.8" ry="2.8" />
          <ellipse className="tod-working-eye tod-working-eye-right" cx="40" cy="33" rx="2.8" ry="2.8" />
        </g>
        <path d="M25.5 41c1.8 2.2 3.9 3.2 6.5 3.2s4.7-1 6.5-3.2" className="tod-working-outline tod-working-smile" />
      </g>

      <g className="tod-working-book" aria-hidden="true">
        <path className="tod-working-book-cover" d="M11.5 41.5c7.2-2.2 14.2-.9 20.5 3.8v16.2c-6.1-4-13-5.1-20.5-3.1Z" />
        <path className="tod-working-book-cover" d="M52.5 41.5c-7.2-2.2-14.2-.9-20.5 3.8v16.2c6.1-4 13-5.1 20.5-3.1Z" />
        <path className="tod-working-book-page" d="M14 39.5c6.6-1.6 12.6-.2 18 4.2v15.1c-5.5-3.7-11.5-4.7-18-3Z" />
        <path className="tod-working-book-page" d="M50 39.5c-6.6-1.6-12.6-.2-18 4.2v15.1c5.5-3.7 11.5-4.7 18-3Z" />
        <path className="tod-working-book-spine" d="M32 43.7v15.1" />
        <path className="tod-working-page-line" d="M18 44.1c3.5-.3 6.6.4 9.5 2.1M18 48.2c3.5-.3 6.6.4 9.5 2.1M46 44.1c-3.5-.3-6.6.4-9.5 2.1M46 48.2c-3.5-.3-6.6.4-9.5 2.1" />
      </g>
    </svg>
  )
}
