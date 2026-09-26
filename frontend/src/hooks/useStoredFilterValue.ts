import { useCallback, useState } from "react"

export function useStoredFilterValue<Value>(
  storageKey: string,
  fallback: Value,
  isValid: (value: unknown) => value is Value,
): [Value, (value: Value) => void] {
  const [value, setValue] = useState<Value>(() => {
    if (typeof window === "undefined") return fallback
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "null")
      return isValid(stored) ? stored : fallback
    } catch {
      return fallback
    }
  })

  const update = useCallback((next: Value) => {
    setValue(next)
    window.localStorage.setItem(storageKey, JSON.stringify(next))
  }, [storageKey])

  return [value, update]
}
