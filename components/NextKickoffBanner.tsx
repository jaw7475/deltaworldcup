"use client"

import { useEffect, useState } from "react"

interface NextKickoffBannerProps {
  nextKickoff: string | null
  inWindow: boolean
}

interface StandingsLite {
  inWindow: boolean
  nextKickoff: string | null
}

function format(diffMs: number): string {
  if (diffMs <= 0) return "now"
  const totalMin = Math.floor(diffMs / 60_000)
  const d = Math.floor(totalMin / (24 * 60))
  const h = Math.floor((totalMin % (24 * 60)) / 60)
  const m = totalMin % 60
  const parts = [
    d > 0 ? `${d}d` : null,
    h > 0 || d > 0 ? `${h}h` : null,
    `${m}m`,
  ].filter(Boolean)
  return parts.join(" ")
}

export function NextKickoffBanner({
  nextKickoff: initialNextKickoff,
  inWindow: initialInWindow,
}: NextKickoffBannerProps) {
  const [nextKickoff, setNextKickoff] = useState(initialNextKickoff)
  const [inWindow, setInWindow] = useState(initialInWindow)
  const [, force] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchOnce() {
      try {
        const res = await fetch("/api/standings", { cache: "no-store" })
        if (!res.ok) return
        const json = (await res.json()) as StandingsLite
        if (cancelled) return
        setNextKickoff(json.nextKickoff)
        setInWindow(json.inWindow)
      } catch {
        // Swallow — retry on the next tick.
      }
    }

    // Correct any stale SSR data right away, then keep state and the
    // countdown ticking together every 20s.
    fetchOnce()
    const t = setInterval(() => {
      force((x) => x + 1)
      fetchOnce()
    }, 20_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  if (inWindow) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-neon-magenta/10 px-3 sm:px-4 py-1.5 ring-1 ring-neon-magenta/40 text-neon-magenta font-display tracking-wider sm:tracking-widest uppercase text-[10px] sm:text-xs">
        <span className="inline-block size-2 rounded-full bg-neon-magenta animate-live-pulse" />
        Match in progress
      </div>
    )
  }

  if (!nextKickoff) {
    return (
      <div className="inline-block rounded-full bg-white/5 px-3 sm:px-4 py-1.5 ring-1 ring-white/10 text-white/60 font-display tracking-wider sm:tracking-widest uppercase text-[10px] sm:text-xs">
        Tournament complete
      </div>
    )
  }

  const diff = new Date(nextKickoff).getTime() - Date.now()
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-neon-cyan/10 px-3 sm:px-4 py-1.5 ring-1 ring-neon-cyan/40 text-neon-cyan font-display tracking-wider sm:tracking-widest uppercase text-[10px] sm:text-xs">
      Next kickoff in {format(diff)}
    </div>
  )
}
