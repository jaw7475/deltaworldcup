"use client"

import { useState } from "react"
import type { PointEvent, Reason, Stage } from "@/lib/scoring/types"
import { Flag } from "./Flag"
import { LiveDot } from "./LiveDot"
import { LocalDateTime } from "./LocalDateTime"

const STAGE_LABEL: Record<Stage, string> = {
  GROUP: "Group",
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  THIRD_PLACE: "3rd",
  FINAL: "Final",
}

const REASON_LABEL: Record<Reason, string> = {
  GROUP_WIN: "Win",
  GROUP_DRAW: "Draw",
  GROUP_LOSS: "Loss",
  KO_WIN: "Win",
  KO_LOSS_REG: "Loss",
  KO_LOSS_ET: "Loss (ET)",
  KO_LOSS_PENS: "Loss (pens)",
  LIVE_KO_TIED: "Tied — live",
}

function PointsBadge({ event }: { event: PointEvent }) {
  const tone =
    event.points === 3
      ? "bg-neon-green/15 text-neon-green ring-neon-green/30"
      : event.points === 1
        ? "bg-neon-yellow/15 text-neon-yellow ring-neon-yellow/30"
        : "bg-white/5 text-white/50 ring-white/15"
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-display tracking-wider ring-1 ${tone}`}
    >
      {event.points} pt{event.points === 1 ? "" : "s"}
    </span>
  )
}

function PointLogRow({ event }: { event: PointEvent }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bg-row/60 px-3 py-2 ring-1 ring-white/5">
      <Flag team={event.team} size={22} />
      <div className="min-w-0">
        <div className="text-sm flex items-center gap-2 flex-wrap">
          <span className="font-display tracking-wide">
            {REASON_LABEL[event.reason]} vs {event.opponent}
          </span>
          <span className="text-white/40">—</span>
          <span className="font-display tracking-wide text-white/65">
            {STAGE_LABEL[event.stage]}
          </span>
          {event.isLive && <LiveDot title="Live — provisional" />}
        </div>
        <div className="mt-0.5 text-xs uppercase tracking-widest text-white/40">
          <LocalDateTime
            utcIso={event.utcKickoff}
            options={{
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }}
          />{" "}
          · {event.goalsFor} GF
        </div>
      </div>
      <div className="ml-auto">
        <PointsBadge event={event} />
      </div>
    </div>
  )
}

const COLLAPSED_COUNT = 3

interface CompletedListProps {
  events: PointEvent[]
}

export function CompletedList({ events }: CompletedListProps) {
  const [expanded, setExpanded] = useState(false)

  if (events.length === 0) {
    return <div className="text-sm text-white/50">No matches played yet.</div>
  }

  // Most recent first.
  const sorted = [...events].sort((a, b) =>
    b.utcKickoff.localeCompare(a.utcKickoff)
  )
  const hiddenCount = Math.max(0, sorted.length - COLLAPSED_COUNT)
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT)

  return (
    <div>
      <div className="space-y-2">
        {visible.map((e, i) => (
          <PointLogRow key={`${e.matchId}-${e.team}-${i}`} event={e} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 w-full rounded-lg bg-bg-row/40 ring-1 ring-white/10 hover:bg-bg-row/70 hover:ring-white/20 transition px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/65 hover:text-white font-display"
        >
          {expanded ? "Show fewer" : `Show all (${sorted.length})`}
        </button>
      )}
    </div>
  )
}
