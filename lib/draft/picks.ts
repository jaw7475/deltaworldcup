import type { SleeperTradedPick } from "@/lib/providers/sleeper"
import { DRAFT_ROUNDS, DRAFT_SLOTS } from "@/lib/config/sleeper"

export interface DraftCell {
  round: number
  /** Slot index, 1-based. Slot 1 = #1 overall (1.01) anchor column. */
  slot: number
  /** Pick position within the round in draft order (1..12). */
  position: number
  /** Display label, e.g. "1.01" or "2.12". */
  pickLabel: string
  /** memberId that owns the slot column (the original owner of every pick in the column). */
  slotOwnerMemberId: string
  /** memberId currently holding this specific pick (after applying trades). */
  currentOwnerMemberId: string
  /** True when the slot owner traded this pick away. */
  traded: boolean
}

/**
 * Snake position for a given (round, slot). Slot 1 picks first in round 1,
 * last in round 2, first again in round 3.
 */
export function positionForSlot(round: number, slot: number): number {
  return round % 2 === 1 ? slot : DRAFT_SLOTS - slot + 1
}

export function formatPickLabel(round: number, position: number): string {
  return `${round}.${position.toString().padStart(2, "0")}`
}

export interface ComputeDraftBoardOpts {
  /** memberIds in slot order — index 0 = slot 1. */
  slotOrder: string[]
  /** Sleeper roster_id → memberId. When absent, trades are ignored. */
  rosterToMember?: Map<number, string>
  tradedPicks?: SleeperTradedPick[]
  /** Season filter applied to traded picks (e.g. "2026"). */
  season: string
}

/**
 * Build the full 192-cell draft board. Cells are returned in slot-major order
 * (round 1 slot 1..12, then round 2 slot 1..12, …) so the UI can iterate by
 * (round, slot) without recomputing.
 *
 * Trade overlay rule: every cell defaults to its slot owner. A Sleeper traded-
 * picks entry whose (season, round, roster_id) matches one of our slots
 * reassigns *only that one cell* to the trade's current `owner_id`. The slot
 * owner keeps every other cell in their column — matching how snake draft
 * trades work in Sleeper.
 */
export function computeDraftBoard(opts: ComputeDraftBoardOpts): DraftCell[] {
  const { slotOrder, rosterToMember, tradedPicks = [], season } = opts

  const overrides = new Map<string, string>()
  if (rosterToMember) {
    for (const tp of tradedPicks) {
      if (tp.season !== season) continue
      const slotMember = rosterToMember.get(tp.roster_id)
      const ownerMember = rosterToMember.get(tp.owner_id)
      if (!slotMember || !ownerMember) continue
      const slotIdx = slotOrder.indexOf(slotMember)
      if (slotIdx < 0) continue
      overrides.set(overrideKey(tp.round, slotIdx + 1), ownerMember)
    }
  }

  const cells: DraftCell[] = []
  for (let round = 1; round <= DRAFT_ROUNDS; round++) {
    for (let slot = 1; slot <= DRAFT_SLOTS; slot++) {
      const slotOwnerMemberId = slotOrder[slot - 1]
      const currentOwnerMemberId =
        overrides.get(overrideKey(round, slot)) ?? slotOwnerMemberId
      const position = positionForSlot(round, slot)
      cells.push({
        round,
        slot,
        position,
        pickLabel: formatPickLabel(round, position),
        slotOwnerMemberId,
        currentOwnerMemberId,
        traded: currentOwnerMemberId !== slotOwnerMemberId,
      })
    }
  }
  return cells
}

function overrideKey(round: number, slot: number): string {
  return `${round}:${slot}`
}

export function getPicksOwnedBy(
  cells: readonly DraftCell[],
  memberId: string
): DraftCell[] {
  return cells.filter((c) => c.currentOwnerMemberId === memberId)
}

export function getPicksTradedAwayBy(
  cells: readonly DraftCell[],
  memberId: string
): DraftCell[] {
  return cells.filter(
    (c) => c.slotOwnerMemberId === memberId && c.currentOwnerMemberId !== memberId
  )
}
