import { describe, it, expect } from "vitest"
import { getTeamStatusMap } from "./teamStatus"
import type { Match } from "@/lib/scoring/types"

type GroupResult = [home: string, away: string, hGoals: number, aGoals: number]

function koMatch(opts: {
  id: string
  stage: Match["stage"]
  utcKickoff?: string
  home: string
  away: string
  hGoals: number
  aGoals: number
  pensWinner?: "home" | "away"
  etOnly?: boolean
}): Match {
  const score = { home: opts.hGoals, away: opts.aGoals }
  const winner =
    opts.pensWinner === "home"
      ? opts.home
      : opts.pensWinner === "away"
        ? opts.away
        : opts.hGoals > opts.aGoals
          ? opts.home
          : opts.aGoals > opts.hGoals
            ? opts.away
            : null
  return {
    id: opts.id,
    stage: opts.stage,
    utcKickoff: opts.utcKickoff ?? "2026-07-01T00:00:00Z",
    status: "FINISHED",
    home: opts.home,
    away: opts.away,
    currentScore: score,
    fullTime: score,
    penalties: opts.pensWinner
      ? { home: opts.pensWinner === "home" ? 5 : 3, away: opts.pensWinner === "away" ? 5 : 3 }
      : undefined,
    wentToExtraTime: opts.pensWinner !== undefined || opts.etOnly === true,
    wentToPenalties: opts.pensWinner !== undefined,
    winner,
  }
}

/**
 * Build a complete 4-team round-robin group from explicit results. All 6
 * matches are emitted as FINISHED. Each entry is [home, away, hGoals, aGoals].
 */
function fullGroup(letter: string, results: GroupResult[]): Match[] {
  if (results.length !== 6) {
    throw new Error(`fullGroup ${letter} needs 6 results, got ${results.length}`)
  }
  return results.map(([home, away, hGoals, aGoals], i) => {
    const score = { home: hGoals, away: aGoals }
    return {
      id: `${letter}-${i}`,
      stage: "GROUP",
      utcKickoff: "2026-06-15T00:00:00Z",
      status: "FINISHED",
      home,
      away,
      currentScore: score,
      fullTime: score,
      wentToExtraTime: false,
      wentToPenalties: false,
      winner:
        hGoals > aGoals ? home : aGoals > hGoals ? away : null,
    }
  })
}

/**
 * Build a 4-team group where each team plays 3 matches but only some are
 * FINISHED. Useful for "group still in progress" cases.
 */
function partialGroup(letter: string, finished: GroupResult[], scheduled: Array<[string, string]>): Match[] {
  const matches: Match[] = finished.map(([home, away, hGoals, aGoals], i) => {
    const score = { home: hGoals, away: aGoals }
    return {
      id: `${letter}-f${i}`,
      stage: "GROUP",
      utcKickoff: "2026-06-15T00:00:00Z",
      status: "FINISHED",
      home,
      away,
      currentScore: score,
      fullTime: score,
      wentToExtraTime: false,
      wentToPenalties: false,
      winner: hGoals > aGoals ? home : aGoals > hGoals ? away : null,
    }
  })
  scheduled.forEach(([home, away], i) => {
    matches.push({
      id: `${letter}-s${i}`,
      stage: "GROUP",
      utcKickoff: "2026-06-20T00:00:00Z",
      status: "SCHEDULED",
      home,
      away,
      currentScore: { home: 0, away: 0 },
      wentToExtraTime: false,
      wentToPenalties: false,
      winner: null,
    })
  })
  return matches
}

describe("getTeamStatusMap", () => {
  it("marks a team that lost a KO match in regulation as eliminated", () => {
    const matches = [
      koMatch({ id: "ko1", stage: "R32", home: "ARG", away: "MEX", hGoals: 2, aGoals: 1 }),
    ]
    const status = getTeamStatusMap(matches)
    expect(status.get("MEX")).toBe("eliminated")
    expect(status.get("ARG")).toBe("alive")
  })

  it("marks a team that lost in ET as eliminated", () => {
    const matches = [
      koMatch({
        id: "ko1",
        stage: "R16",
        home: "BRA",
        away: "POR",
        hGoals: 2,
        aGoals: 1,
        etOnly: true,
      }),
    ]
    expect(getTeamStatusMap(matches).get("POR")).toBe("eliminated")
  })

  it("marks a team that lost on penalties as eliminated", () => {
    const matches = [
      koMatch({
        id: "ko1",
        stage: "QF",
        home: "ITA",
        away: "GER",
        hGoals: 1,
        aGoals: 1,
        pensWinner: "home",
      }),
    ]
    expect(getTeamStatusMap(matches).get("GER")).toBe("eliminated")
    expect(getTeamStatusMap(matches).get("ITA")).toBe("alive")
  })

  it("treats most recent KO win as alive even with no upcoming match", () => {
    const matches = [
      koMatch({ id: "ko1", stage: "R32", home: "ARG", away: "MEX", hGoals: 2, aGoals: 0 }),
    ]
    expect(getTeamStatusMap(matches).get("ARG")).toBe("alive")
  })

  it("flags a team that won R32 then lost R16 as eliminated", () => {
    const matches = [
      koMatch({
        id: "ko1",
        stage: "R32",
        utcKickoff: "2026-07-01T00:00:00Z",
        home: "ARG",
        away: "MEX",
        hGoals: 2,
        aGoals: 1,
      }),
      koMatch({
        id: "ko2",
        stage: "R16",
        utcKickoff: "2026-07-05T00:00:00Z",
        home: "ESP",
        away: "ARG",
        hGoals: 3,
        aGoals: 1,
      }),
    ]
    const status = getTeamStatusMap(matches)
    expect(status.get("ARG")).toBe("eliminated")
    expect(status.get("ESP")).toBe("alive")
  })

  it("marks 4th-in-group as eliminated and 1st/2nd as alive once the group is fully FINISHED", () => {
    // ARG 7, MEX 7, PAR 3, NZL 0
    const matches = fullGroup("A", [
      ["ARG", "MEX", 1, 1],
      ["PAR", "NZL", 2, 0],
      ["ARG", "PAR", 2, 0],
      ["MEX", "NZL", 3, 0],
      ["ARG", "NZL", 4, 0],
      ["MEX", "PAR", 2, 1],
    ])
    const status = getTeamStatusMap(matches)
    expect(status.get("ARG")).toBe("alive")
    expect(status.get("MEX")).toBe("alive")
    expect(status.get("NZL")).toBe("eliminated")
  })

  it("leaves 3rd-place team as active when not all groups have finished", () => {
    // Group A complete, group B partially played → some groups still ongoing
    const matches = [
      ...fullGroup("A", [
        ["ARG", "MEX", 1, 1],
        ["PAR", "NZL", 2, 0],
        ["ARG", "PAR", 2, 0],
        ["MEX", "NZL", 3, 0],
        ["ARG", "NZL", 4, 0],
        ["MEX", "PAR", 2, 1],
      ]),
      ...partialGroup(
        "B",
        [["FRA", "DEN", 2, 0]],
        [
          ["AUS", "TUN", 1, 0] as [string, string],
          ["FRA", "AUS", 0, 0] as [string, string],
          ["DEN", "TUN", 0, 0] as [string, string],
          ["FRA", "TUN", 0, 0] as [string, string],
          ["DEN", "AUS", 0, 0] as [string, string],
        ]
      ),
    ]
    expect(getTeamStatusMap(matches).get("PAR")).toBe("active")
  })

  it("ranks 3rd-place teams globally once all groups are FINISHED — top 8 alive, rest eliminated", () => {
    // Build 9 groups (so 9 third-place teams). In each group:
    //   A beats B, C, D (9 pts, GD=3, GF=3)
    //   B beats C, D   (6 pts, GD=1, GF=2)
    //   C beats D N-0  (3 pts, GD=N-2, GF=N)
    //   D last         (0 pts, GD=-(2+N), GF=0)
    // Vary N from 9 down to 1 so each group's 3rd-place team (C) has distinct GF.
    // Top 8 thirds (N=9..2) → alive; worst (N=1) → eliminated.
    const matches: Match[] = []
    for (let i = 0; i < 9; i++) {
      const N = 9 - i // 9, 8, ..., 1
      const A = `${i}A`
      const B = `${i}B`
      const C = `${i}C`
      const D = `${i}D`
      matches.push(
        ...fullGroup(`G${i}`, [
          [A, B, 1, 0],
          [A, C, 1, 0],
          [A, D, 1, 0],
          [B, C, 1, 0],
          [B, D, 1, 0],
          [C, D, N, 0],
        ])
      )
    }
    const status = getTeamStatusMap(matches)
    // Worst third-place team (N=1, i=8): "8C"
    expect(status.get("8C")).toBe("eliminated")
    // Best 8 third-place teams (i=0..7): all alive
    for (let i = 0; i < 8; i++) expect(status.get(`${i}C`)).toBe("alive")
    // 4th-place teams (all D teams) always eliminated
    for (let i = 0; i < 9; i++) expect(status.get(`${i}D`)).toBe("eliminated")
    // 1st/2nd in each group alive
    for (let i = 0; i < 9; i++) {
      expect(status.get(`${i}A`)).toBe("alive")
      expect(status.get(`${i}B`)).toBe("alive")
    }
  })

  it("treats a team mid-group-stage with no decisive results as active", () => {
    const matches = partialGroup(
      "A",
      [["ARG", "MEX", 1, 1]],
      [
        ["PAR", "NZL", 0, 0] as [string, string],
        ["ARG", "PAR", 0, 0] as [string, string],
        ["MEX", "NZL", 0, 0] as [string, string],
        ["ARG", "NZL", 0, 0] as [string, string],
        ["MEX", "PAR", 0, 0] as [string, string],
      ]
    )
    const status = getTeamStatusMap(matches)
    expect(status.get("ARG")).toBe("active")
    expect(status.get("MEX")).toBe("active")
    expect(status.get("PAR")).toBe("active")
    expect(status.get("NZL")).toBe("active")
  })
})
