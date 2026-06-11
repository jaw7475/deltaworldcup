import { computeStandings } from "@/lib/scoring/engine"
import { MEMBERS } from "@/lib/config/members"
import type { Match, StandingsSnapshot } from "@/lib/scoring/types"

export function buildSnapshot(
  matches: Match[],
  prev?: StandingsSnapshot,
  now: Date = new Date()
): StandingsSnapshot {
  const rows = computeStandings(matches, MEMBERS, prev)
  return {
    computedAt: now.toISOString(),
    rows,
  }
}
