"use client"

import { useEffect, useRef, useState } from "react"

interface NumberTickerProps {
  value: number
  /** Animation duration in ms. */
  durationMs?: number
  className?: string
}

/**
 * Interpolates the displayed integer from previous value to new value over
 * durationMs using requestAnimationFrame. Renders the current value as text.
 */
export function NumberTicker({
  value,
  durationMs = 800,
  className,
}: NumberTickerProps) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(from + (to - from) * eased)
      setDisplay(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prevRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, durationMs])

  return <span className={className}>{display}</span>
}
