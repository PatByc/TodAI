export function AppLogo({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/todai-classic-check.svg?v=graphite-1"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
    />
  )
}
