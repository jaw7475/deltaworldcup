"use client"

import { useEffect, useState } from "react"
import { formatLocal, useUserTimeZone } from "@/lib/time/local"

interface StaleBadgeProps {
  lastSuccessAt: string | null
  /** Threshold in minutes before we consider data stale. */
  staleAfterMin?: number
}

export function StaleBadge({
  lastSuccessAt,
  staleAfterMin = 120,
}: StaleBadgeProps) {
  const [, force] = useState(0)
  const tz = useUserTimeZone()
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  if (!lastSuccessAt) return null
  const ageMin = (Date.now() - new Date(lastSuccessAt).getTime()) / 60_000
  if (ageMin < staleAfterMin) return null

  const ageLabel =
    ageMin < 60
      ? `${Math.round(ageMin)}m`
      : `${Math.floor(ageMin / 60)}h ${Math.round(ageMin % 60)}m`

  return (
    <div
      title={`Last successful sync ${formatLocal(lastSuccessAt, {}, tz)}`}
      className="inline-flex items-center gap-2 rounded-full bg-neon-yellow/10 px-3 py-1 ring-1 ring-neon-yellow/40 text-neon-yellow font-display tracking-widest uppercase text-[10px]"
    >
      <span className="inline-block size-1.5 rounded-full bg-neon-yellow" />
      Data may be stale · {ageLabel}
    </div>
  )
}
