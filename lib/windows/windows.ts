import type { ScheduledMatch } from "@/lib/config/schedule"
import type { Match } from "@/lib/scoring/types"

export const MATCH_WINDOW_MIN = 170
const PRE_ROLL_MIN = 5
const MS_PER_MIN = 60 * 1000

const LA_HOUR_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hour12: false,
  timeZone: "America/Los_Angeles",
})

/**
 * True when `now` is between 09:00 (inclusive) and 01:00 (exclusive) Pacific time.
 * DST-aware: uses Intl with `America/Los_Angeles` so PST/PDT shifts are handled.
 */
export function isPacificActiveHours(now: Date): boolean {
  // Intl returns "0".."23"; "24" is documented behavior at midnight in some
  // engines, so we normalize.
  const raw = LA_HOUR_FMT.format(now)
  const hour = (parseInt(raw, 10) % 24 + 24) % 24
  return hour >= 9 || hour < 1
}

/**
 * True when `now` falls inside any scheduled match's window.
 * A window is [kickoff − 5min, kickoff + 170min). Note the end is exclusive so
 * we don't double-cover the boundary minute.
 */
export function isInWindow(
  now: Date,
  schedule: readonly ScheduledMatch[]
): boolean {
  const nowMs = now.getTime()
  for (const m of schedule) {
    const kickoff = new Date(m.utcKickoff).getTime()
    const start = kickoff - PRE_ROLL_MIN * MS_PER_MIN
    const end = kickoff + MATCH_WINDOW_MIN * MS_PER_MIN
    if (nowMs >= start && nowMs < end) return true
  }
  return false
}

/**
 * Earliest upcoming kickoff strictly after `now`, or null if none scheduled.
 * Useful for the "Next kickoff in X" banner.
 */
export function nextKickoff(
  now: Date,
  schedule: readonly ScheduledMatch[]
): ScheduledMatch | null {
  const nowMs = now.getTime()
  let best: ScheduledMatch | null = null
  let bestMs = Infinity
  for (const m of schedule) {
    const t = new Date(m.utcKickoff).getTime()
    if (t > nowMs && t < bestMs) {
      best = m
      bestMs = t
    }
  }
  return best
}

/**
 * Next SCHEDULED match kickoff strictly after `now`, drawn from the live
 * fixture list. Prefer this over `nextKickoff(_, SCHEDULE)` for UI — SCHEDULE
 * is a hardcoded stub, `matches` is the real list the cron loads from upstream.
 * Returns null if no future scheduled match is present.
 */
export function nextKickoffFromMatches(
  now: Date,
  matches: readonly Match[]
): Match | null {
  const nowMs = now.getTime()
  let best: Match | null = null
  let bestMs = Infinity
  for (const m of matches) {
    if (m.status !== "SCHEDULED") continue
    const t = new Date(m.utcKickoff).getTime()
    if (t > nowMs && t < bestMs) {
      best = m
      bestMs = t
    }
  }
  return best
}

/**
 * True when any match in the live fixture list is LIVE or in its pre-roll /
 * 170-min window. Mirrors `isInWindow` but consults real match data.
 */
export function inWindowFromMatches(
  now: Date,
  matches: readonly Match[]
): boolean {
  const nowMs = now.getTime()
  for (const m of matches) {
    if (m.status === "LIVE") return true
    if (m.status !== "SCHEDULED") continue
    const kickoff = new Date(m.utcKickoff).getTime()
    const start = kickoff - PRE_ROLL_MIN * MS_PER_MIN
    const end = kickoff + MATCH_WINDOW_MIN * MS_PER_MIN
    if (nowMs >= start && nowMs < end) return true
  }
  return false
}
