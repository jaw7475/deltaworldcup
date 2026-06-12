"use client"

import { useState } from "react"
import { getTeam } from "@/lib/config/teams"
import type { TopScorerRow } from "@/lib/standings/goals"
import {
  PLAYERS_TO_WATCH,
  type PlayerToWatch,
} from "@/lib/config/playersToWatch"
import { Flag } from "./Flag"

function ScorerRow({ scorer }: { scorer: TopScorerRow }) {
  const t = getTeam(scorer.team)
  const meta = lookupPlayerMeta(scorer.name, scorer.team)
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bg-row/60 px-3 py-2 ring-1 ring-white/5">
      <Flag team={scorer.team} size={22} />
      <div className="min-w-0">
        <div className="text-sm text-white/85 truncate">{scorer.name}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
          {t?.name ?? scorer.team}
          {meta?.position ? ` · ${meta.position}` : ""}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <span className="font-display text-lg tabular-nums text-white/85">
          {scorer.goals}
        </span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
          G
        </span>
      </div>
    </div>
  )
}

function lookupPlayerMeta(name: string, team: string): PlayerToWatch | null {
  const normalized = name.toLowerCase()
  return (
    PLAYERS_TO_WATCH.find(
      (p) => p.team === team && p.name.toLowerCase() === normalized
    ) ?? null
  )
}

const COLLAPSED_COUNT = 3

interface TopScorersListProps {
  scorers: TopScorerRow[]
}

export function TopScorersList({ scorers }: TopScorersListProps) {
  const [expanded, setExpanded] = useState(false)

  if (scorers.length === 0) {
    return <div className="text-sm text-white/50">No goals yet.</div>
  }

  const hiddenCount = Math.max(0, scorers.length - COLLAPSED_COUNT)
  const visible = expanded ? scorers : scorers.slice(0, COLLAPSED_COUNT)

  return (
    <div>
      <div className="space-y-2">
        {visible.map((s) => (
          <ScorerRow key={`${s.team}-${s.name}`} scorer={s} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 w-full rounded-lg bg-bg-row/40 ring-1 ring-white/10 hover:bg-bg-row/70 hover:ring-white/20 transition px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/65 hover:text-white font-display"
        >
          {expanded ? "Show fewer" : `Show all (${scorers.length})`}
        </button>
      )}
    </div>
  )
}
