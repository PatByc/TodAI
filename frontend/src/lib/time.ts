export function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function localTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export function parseServerTime(value: string) {
  return new Date(`${value}${/[zZ]|[+-]\d\d:\d\d$/.test(value) ? "" : "Z"}`)
}

export function durationLabel(seconds: number) {
  if (seconds > 0 && seconds < 60) return "<1m"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours && minutes) return `${hours}h ${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}
