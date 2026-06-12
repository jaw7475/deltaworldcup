import { describe, it, expect } from "vitest"
import { eloWinProb, eloThreeWay } from "@/lib/config/elo"
import { projectKnockouts, koExpectedPoints } from "./koProjection"
import type { Match } from "@/lib/scoring/types"
import { simulateGroupStage } from "./montecarlo"

describe("Elo win probability", () => {
  it("returns 0.5 when ratings are equal", () => {
    expect(eloWinProb(1800, 1800)).toBeCloseTo(0.5, 5)
  })
  it("is symmetric: P(A beats B) + P(B beats A) = 1", () => {
    const p = eloWinProb(2100, 1700)
    expect(p + eloWinProb(1700, 2100)).toBeCloseTo(1, 5)
  })
  it("favours the higher-rated team", () => {
    expect(eloWinProb(2100, 1700)).toBeGreaterThan(0.8)
    expect(eloWinProb(1500, 2100)).toBeLessThan(0.1)
  })
})

describe("Elo three-way (W/D/L)", () => {
  it("probabilities sum to 1", () => {
    const { pHomeWin, pDraw, pAwayWin } = eloThreeWay(1900, 1850)
    expect(pHomeWin + pDraw + pAwayWin).toBeCloseTo(1, 5)
  })
  it("draw probability decays as Elo gap widens", () => {
    const closeDraw = eloThreeWay(1900, 1900).pDraw
    const farDraw = eloThreeWay(2100, 1500).pDraw
    expect(closeDraw).toBeGreaterThan(farDraw)
  })
})

describe("KO projection cascade", () => {
  it("a team with 0 reach prob has 0 reach in every downstream round", () => {
    const proj = projectKnockouts({
      pReachR32: new Map([
        ["ARG", 1.0],
        ["FRA", 1.0],
        ["WEAK", 0.0],
      ]),
    })
    const weak = proj.get("WEAK")!
    expect(weak.pReach.R32).toBe(0)
    expect(weak.pReach.R16).toBe(0)
    expect(weak.pReach.FINAL).toBe(0)
  })
  it("reach probability is monotone non-increasing across rounds", () => {
    const proj = projectKnockouts({
      pReachR32: new Map([
        ["ARG", 1.0],
        ["FRA", 1.0],
        ["BRA", 1.0],
        ["MEX", 0.5],
      ]),
    })
    for (const [, p] of proj) {
      expect(p.pReach.R32).toBeGreaterThanOrEqual(p.pReach.R16)
      expect(p.pReach.R16).toBeGreaterThanOrEqual(p.pReach.QF)
      expect(p.pReach.QF).toBeGreaterThanOrEqual(p.pReach.SF)
      expect(p.pReach.SF).toBeGreaterThanOrEqual(p.pReach.FINAL)
    }
  })
  it("koExpectedPoints stays within sane bounds", () => {
    const proj = projectKnockouts({
      pReachR32: new Map([["ARG", 1.0]]),
    })
    const xpts = koExpectedPoints(proj.get("ARG")!)
    // Maximum theoretical: 5 KO matches × 3pts = 15pts. Realistic <<.
    expect(xpts).toBeGreaterThan(0)
    expect(xpts).toBeLessThan(15)
  })
})

describe("Group-stage Monte Carlo", () => {
  // Build a minimal 4-team group with 3 finished and 3 remaining matches.
  function makeGroupMatches(): Match[] {
    const base = {
      stage: "GROUP" as const,
      utcKickoff: "2026-06-15T00:00:00Z",
      status: "SCHEDULED" as const,
      currentScore: { home: 0, away: 0 },
      wentToExtraTime: false,
      wentToPenalties: false,
      winner: null,
    }
    return [
      // ARG vs MEX, PAR vs NZL — all unplayed
      { ...base, id: "m1", home: "ARG", away: "MEX" },
      { ...base, id: "m2", home: "PAR", away: "NZL" },
      { ...base, id: "m3", home: "ARG", away: "PAR" },
      { ...base, id: "m4", home: "MEX", away: "NZL" },
      { ...base, id: "m5", home: "ARG", away: "NZL" },
      { ...base, id: "m6", home: "MEX", away: "PAR" },
    ]
  }

  it("infers a single 4-team group and gives every team a P(advance)", () => {
    const res = simulateGroupStage(makeGroupMatches(), 2000)
    expect(res.groups).toHaveLength(1)
    expect(res.groups[0].teams).toHaveLength(4)
    for (const team of res.groups[0].teams) {
      const p = res.pAdvance.get(team)
      expect(p).toBeDefined()
      expect(p!).toBeGreaterThanOrEqual(0)
      expect(p!).toBeLessThanOrEqual(1)
    }
  })

  it("the strongest team has the highest P(reach R32)", () => {
    const res = simulateGroupStage(makeGroupMatches(), 2000)
    const arg = res.pAdvance.get("ARG") ?? 0
    const nzl = res.pAdvance.get("NZL") ?? 0
    expect(arg).toBeGreaterThan(nzl)
  })

  it("P(first) + P(second) + P(third) per team is bounded by 1 (4th not tracked)", () => {
    const res = simulateGroupStage(makeGroupMatches(), 2000)
    for (const team of res.groups[0].teams) {
      const sum =
        (res.pFirst.get(team) ?? 0) +
        (res.pSecond.get(team) ?? 0) +
        (res.pThird.get(team) ?? 0)
      expect(sum).toBeLessThanOrEqual(1.01) // allow tiny float slack
    }
  })
})
