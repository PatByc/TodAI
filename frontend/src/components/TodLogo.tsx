export function TodLogo({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/tod-favicon.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
    />
  )
}
