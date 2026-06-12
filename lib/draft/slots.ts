import type { StandingsSnapshot } from "@/lib/scoring/types"
import { MEMBERS } from "@/lib/config/members"
import { DRAFT_SLOTS } from "@/lib/config/sleeper"

/**
 * Given a standings snapshot, return an ordered array of memberIds where
 * index 0 = slot 1 (owner of pick 1.01). Order follows the leaderboard:
 * standings rank 1 → slot 1 (most points wins #1; rank already encodes the
 * goals-for tiebreaker).
 *
 * When no snapshot is available yet (pre-tournament) we fall back to the
 * declared MEMBERS order so the board can still render placeholder slots.
 */
export function getSlotOrder(snapshot: StandingsSnapshot | null): string[] {
  if (!snapshot || snapshot.rows.length === 0) {
    return MEMBERS.slice(0, DRAFT_SLOTS).map((m) => m.id)
  }
  return [...snapshot.rows]
    .sort((a, b) => a.rank - b.rank)
    .map((r) => r.memberId)
    .slice(0, DRAFT_SLOTS)
}
