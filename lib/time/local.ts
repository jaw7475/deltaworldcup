"use client"

import { useEffect, useState } from "react"

/**
 * "YYYY-MM-DD" for a UTC ISO instant in the given IANA timezone. Falls back to
 * the UTC date when no zone is supplied (used during SSR / before mount so
 * the server and the first client render agree).
 */
export function localDateKey(utcIso: string, timeZone?: string): string {
  const d = new Date(utcIso)
  if (!timeZone) return d.toISOString().slice(0, 10)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/** "YYYY-MM-DD" for "right now" in the given IANA timezone (UTC if omitted). */
export function todayLocalDateKey(timeZone?: string, now: Date = new Date()): string {
  return localDateKey(now.toISOString(), timeZone)
}

/** Format a UTC ISO instant for display in the given IANA timezone. */
export function formatLocal(
  utcIso: string,
  opts: Intl.DateTimeFormatOptions,
  timeZone?: string
): string {
  return new Date(utcIso).toLocaleString(undefined, {
    ...opts,
    // Default to UTC so SSR (which runs in UTC) and the first client render
    // produce identical strings, avoiding hydration mismatches.
    timeZone: timeZone ?? "UTC",
  })
}

/**
 * Returns the browser's IANA timezone after mount. During SSR and the first
 * client render this is `undefined`; switching to the resolved zone happens in
 * `useEffect`, so callers should treat `undefined` as "use UTC fallback".
 */
export function useUserTimeZone(): string | undefined {
  const [tz, setTz] = useState<string | undefined>(undefined)
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      // Some legacy environments don't expose the resolved zone — stay on UTC.
    }
  }, [])
  return tz
}
