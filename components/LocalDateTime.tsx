"use client"

import { formatLocal, useUserTimeZone } from "@/lib/time/local"

interface LocalDateTimeProps {
  utcIso: string
  options: Intl.DateTimeFormatOptions
  className?: string
}

/**
 * Renders a UTC ISO instant in the viewer's local timezone. SSR and the first
 * client render use UTC so hydration matches; after mount the component
 * re-renders in the browser's IANA zone.
 */
export function LocalDateTime({ utcIso, options, className }: LocalDateTimeProps) {
  const tz = useUserTimeZone()
  return (
    <span className={className} suppressHydrationWarning>
      {formatLocal(utcIso, options, tz)}
    </span>
  )
}
