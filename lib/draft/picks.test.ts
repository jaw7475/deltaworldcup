import { describe, it, expect } from "vitest"
import {
  computeDraftBoard,
  positionForSlot,
  formatPickLabel,
  getPicksOwnedBy,
  getPicksTradedAwayBy,
} from "./picks"
import type { SleeperTradedPick } from "@/lib/providers/sleeper"

// 12 fake members in stable order. Index 0 = slot 1 in every test.
const SLOTS = [
  "matt",
  "zach-m",
  "josh-g-andrew-b",
  "jesse",
  "spencer",
  "jake",
  "zach-d",
  "josh-w",
  "danny",
  "zach-f",
  "dan",
  "andrew-s",
]

// Each member maps to roster_id (slot index + 1) for clarity.
const ROSTER_TO_MEMBER = new Map<number, string>(
  SLOTS.map((id, i) => [i + 1, id])
)

describe("positionForSlot (snake math)", () => {
  it("round 1 mirrors slot index", () => {
    expect(positionForSlot(1, 1)).toBe(1)
    expect(positionForSlot(1, 12)).toBe(12)
  })

  it("round 2 reverses", () => {
    expect(positionForSlot(2, 1)).toBe(12)
    expect(positionForSlot(2, 12)).toBe(1)
  })

  it("round 3 mirrors slot again", () => {
    expect(positionForSlot(3, 1)).toBe(1)
    expect(positionForSlot(3, 7)).toBe(7)
  })

  it("matches the Spencer-slot-1 example: 1.01, 2.12, 3.01", () => {
    expect(formatPickLabel(1, positionForSlot(1, 1))).toBe("1.01")
    expect(formatPickLabel(2, positionForSlot(2, 1))).toBe("2.12")
    expect(formatPickLabel(3, positionForSlot(3, 1))).toBe("3.01")
  })
})

describe("computeDraftBoard — no trades", () => {
  it("produces 192 cells (12 slots × 16 rounds)", () => {
    const board = computeDraftBoard({ slotOrder: SLOTS, season: "2026" })
    expect(board).toHaveLength(192)
  })

  it("every slot owns 16 picks when there are no trades", () => {
    const board = computeDraftBoard({ slotOrder: SLOTS, season: "2026" })
    for (const memberId of SLOTS) {
      expect(getPicksOwnedBy(board, memberId)).toHaveLength(16)
    }
  })

  it("slot 1 owns 1.01 and slot 12 owns 1.12", () => {
    const board = computeDraftBoard({ slotOrder: SLOTS, season: "2026" })
    const pick101 = board.find((c) => c.pickLabel === "1.01")!
    const pick112 = board.find((c) => c.pickLabel === "1.12")!
    expect(pick101.currentOwnerMemberId).toBe(SLOTS[0])
    expect(pick112.currentOwnerMemberId).toBe(SLOTS[11])
  })
})

describe("computeDraftBoard — with traded pick (the Spencer→Jake example)", () => {
  // Spencer is slot 1, Jake is slot 6 in this fixture.
  // Spencer (roster_id 1) traded his 2026 round-1 pick to Jake (roster_id 6).
  // Spencer should keep 2.12, 3.01, 4.12, … all the way to 16.01.
  // Jake should own his own snake column PLUS Spencer's 1.01.
  const spencerSlots = [
    "spencer",
    "matt",
    "zach-m",
    "josh-g-andrew-b",
    "jesse",
    "jake",
    "zach-d",
    "josh-w",
    "danny",
    "zach-f",
    "dan",
    "andrew-s",
  ]
  const rosterMap = new Map<number, string>(
    spencerSlots.map((id, i) => [i + 1, id])
  )

  const tradedPicks: SleeperTradedPick[] = [
    {
      season: "2026",
      round: 1,
      roster_id: 1, // Spencer's slot
      previous_owner_id: 1,
      owner_id: 6, // Jake
    },
  ]

  const board = computeDraftBoard({
    slotOrder: spencerSlots,
    rosterToMember: rosterMap,
    tradedPicks,
    season: "2026",
  })

  it("Spencer no longer owns 1.01 but still owns 2.12 and 3.01", () => {
    const spencerPicks = getPicksOwnedBy(board, "spencer")
    const labels = spencerPicks.map((c) => c.pickLabel)
    expect(labels).not.toContain("1.01")
    expect(labels).toContain("2.12")
    expect(labels).toContain("3.01")
    expect(labels).toHaveLength(15) // 16 - 1 traded away
  })

  it("Jake owns 1.01 plus his own 16 picks", () => {
    const jakePicks = getPicksOwnedBy(board, "jake")
    const labels = jakePicks.map((c) => c.pickLabel)
    expect(labels).toContain("1.01")
    expect(labels).toContain("1.06") // his own slot-6 round-1 pick
    expect(labels).toHaveLength(17) // 16 own + 1 acquired
  })

  it("marks Spencer's lost 1.01 cell as traded with Jake as owner", () => {
    const cell = board.find(
      (c) => c.round === 1 && c.slot === 1
    )!
    expect(cell.slotOwnerMemberId).toBe("spencer")
    expect(cell.currentOwnerMemberId).toBe("jake")
    expect(cell.traded).toBe(true)
  })

  it("getPicksTradedAwayBy returns Spencer's single lost pick", () => {
    const traded = getPicksTradedAwayBy(board, "spencer")
    expect(traded).toHaveLength(1)
    expect(traded[0].pickLabel).toBe("1.01")
  })
})

describe("computeDraftBoard — season filtering", () => {
  it("ignores traded picks from other seasons", () => {
    const tradedPicks: SleeperTradedPick[] = [
      {
        season: "2027",
        round: 1,
        roster_id: 1,
        previous_owner_id: 1,
        owner_id: 6,
      },
    ]
    const board = computeDraftBoard({
      slotOrder: SLOTS,
      rosterToMember: ROSTER_TO_MEMBER,
      tradedPicks,
      season: "2026",
    })
    // 2027 trade should NOT affect the 2026 board.
    const cell = board.find((c) => c.round === 1 && c.slot === 1)!
    expect(cell.currentOwnerMemberId).toBe(SLOTS[0])
    expect(cell.traded).toBe(false)
  })
})

describe("computeDraftBoard — no roster map (Sleeper unavailable)", () => {
  it("falls back to slot owner everywhere when trades cannot be resolved", () => {
    const tradedPicks: SleeperTradedPick[] = [
      {
        season: "2026",
        round: 1,
        roster_id: 1,
        previous_owner_id: 1,
        owner_id: 6,
      },
    ]
    const board = computeDraftBoard({
      slotOrder: SLOTS,
      tradedPicks,
      season: "2026",
    })
    expect(board.every((c) => !c.traded)).toBe(true)
  })
})
