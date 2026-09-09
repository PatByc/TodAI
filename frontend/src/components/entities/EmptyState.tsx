/**
 * Reusable empty state component for entity lists.
 * Used when a list view has no items to display.
 */

interface EmptyStateProps {
  heading: string
  body: string
}

export function EmptyState({ heading, body }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        textAlign: "center",
      }}
    >
      {/* Icon placeholder area */}
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          backgroundColor: "var(--muted)",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.5,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--muted-foreground)" }}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>

      <h3
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "15px",
          fontWeight: 400,
          color: "var(--foreground)",
          marginBottom: "6px",
          lineHeight: 1.5,
        }}
      >
        {heading}
      </h3>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          fontWeight: 400,
          color: "var(--muted-foreground)",
          lineHeight: 1.5,
          maxWidth: "320px",
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  )
}
