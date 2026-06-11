"use client"

import { useEffect, useRef, useState } from "react"
import { Reorder } from "framer-motion"
import confetti from "canvas-confetti"
import type { StandingsSnapshot, StandingsRow } from "@/lib/scoring/types"
import { LeaderboardRow } from "./LeaderboardRow"

interface LeaderboardProps {
  initialSnapshot: StandingsSnapshot | null
  initialInWindow: boolean
}

interface StandingsResponse {
  snapshot: StandingsSnapshot | null
  inWindow: boolean
  nextKickoff: string | null
  now: string
  sync: { lastRunAt: string | null; lastSuccessAt: string | null; lastError: string | null }
}

export function Leaderboard({ initialSnapshot, initialInWindow }: LeaderboardProps) {
  const [snapshot, setSnapshot] = useState<StandingsSnapshot | null>(initialSnapshot)
  const [inWindow, setInWindow] = useState(initialInWindow)
  const previousComputedAtRef = useRef<string | null>(
    initialSnapshot?.computedAt ?? null
  )

  // Fire confetti for any row whose rank improved on a snapshot update.
  useEffect(() => {
    if (!snapshot) return
    if (snapshot.computedAt === previousComputedAtRef.current) return
    previousComputedAtRef.current = snapshot.computedAt

    const climbers = snapshot.rows.filter(
      (r) => (r.delta?.ranks ?? 0) > 0
    )
    if (climbers.length === 0) return
    // Aim from a random spot near the top of the leaderboard.
    for (const climber of climbers) {
      const x = 0.4 + Math.random() * 0.2
      const y = 0.1 + (climber.rank / 16)
      confetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 35,
        origin: { x, y: Math.min(0.8, y) },
        colors: ["#00f5d4", "#ff006e", "#fee440", "#9bff66", "#b16cff"],
        scalar: 0.9,
      })
    }
  }, [snapshot])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function fetchOnce() {
      try {
        const res = await fetch("/api/standings", { cache: "no-store" })
        if (!res.ok) return
        const json = (await res.json()) as StandingsResponse
        if (cancelled) return
        setSnapshot(json.snapshot)
        setInWindow(json.inWindow)
      } catch {
        // Swallow — we'll retry on the next tick.
      }
    }

    function scheduleNext() {
      const delayMs = inWindow ? 30_000 : 5 * 60_000
      timer = setTimeout(async () => {
        await fetchOnce()
        if (!cancelled) scheduleNext()
      }, delayMs)
    }

    scheduleNext()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [inWindow])

  const rows: StandingsRow[] = snapshot?.rows ?? []

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-bg-raised/50 p-8 text-center text-white/60 font-display tracking-wider uppercase text-sm">
        Standings will appear once the cron has synced.
      </div>
    )
  }

  return (
    <Reorder.Group
      axis="y"
      values={rows}
      onReorder={() => {
        /* read-only — reorder is animation-driven via the values prop */
      }}
      className="flex flex-col gap-3"
    >
      {rows.map((row) => (
        <Reorder.Item
          key={row.memberId}
          value={row}
          drag={false}
          layout
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        >
          <LeaderboardRow row={row} />
        </Reorder.Item>
      ))}
    </Reorder.Group>
  )
}
