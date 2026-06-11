import { describe, it, expect } from "vitest"
import {
  scoreMatchForTeam,
  buildTeamRecord,
  computeStandings,
} from "./engine"
import type { Match, StandingsSnapshot } from "./types"
import type { Member } from "@/lib/config/members"

// ---------------------------------------------------------------------------
// Fixture builder
// ---------------------------------------------------------------------------

interface MakeMatchInput {
  id?: string
  stage?: Match["stage"]
  status?: Match["status"]
  minute?: number
  home: string
  away: string
  currentScore: [number, number]
  fullTime?: [number, number]
  penalties?: [number, number]
  wentToExtraTime?: boolean
  wentToPenalties?: boolean
  winner?: string | null
  utcKickoff?: string
}

function makeMatch(input: MakeMatchInput): Match {
  return {
    id: input.id ?? "m1",
    stage: input.stage ?? "GROUP",
    utcKickoff: input.utcKickoff ?? "2026-06-12T18:00:00Z",
    status: input.status ?? "FINISHED",
    minute: input.minute,
    home: input.home,
    away: input.away,
    currentScore: { home: input.currentScore[0], away: input.currentScore[1] },
    fullTime: input.fullTime
      ? { home: input.fullTime[0], away: input.fullTime[1] }
      : undefined,
    penalties: input.penalties
      ? { home: input.penalties[0], away: input.penalties[1] }
      : undefined,
    wentToExtraTime: input.wentToExtraTime ?? false,
    wentToPenalties: input.wentToPenalties ?? false,
    winner: input.winner ?? null,
  }
}

// ---------------------------------------------------------------------------
// scoreMatchForTeam — FINISHED group
// ---------------------------------------------------------------------------

describe("scoreMatchForTeam — group stage (FINISHED)", () => {
  it("group win: 3pt GROUP_WIN, GF from fullTime", () => {
    const m = makeMatch({
      stage: "GROUP",
      home: "USA",
      away: "IRN",
      currentScore: [2, 1],
      fullTime: [2, 1],
    })
    expect(scoreMatchForTeam(m, "USA")).toMatchObject({
      points: 3,
      goalsFor: 2,
      reason: "GROUP_WIN",
      isLive: false,
    })
    expect(scoreMatchForTeam(m, "IRN")).toMatchObject({
      points: 0,
      goalsFor: 1,
      reason: "GROUP_LOSS",
      isLive: false,
    })
  })

  it("group draw: both teams 1pt GROUP_DRAW", () => {
    const m = makeMatch({
      stage: "GROUP",
      home: "ARG",
      away: "MEX",
      currentScore: [1, 1],
      fullTime: [1, 1],
    })
    expect(scoreMatchForTeam(m, "ARG")).toMatchObject({
      points: 1,
      goalsFor: 1,
      reason: "GROUP_DRAW",
    })
    expect(scoreMatchForTeam(m, "MEX")).toMatchObject({
      points: 1,
      goalsFor: 1,
      reason: "GROUP_DRAW",
    })
  })
})

// ---------------------------------------------------------------------------
// scoreMatchForTeam — FINISHED knockout (regulation, ET, pens)
// ---------------------------------------------------------------------------

describe("scoreMatchForTeam — knockout (FINISHED)", () => {
  it("KO regulation win: winner 3pt KO_WIN, loser 0pt KO_LOSS_REG", () => {
    const m = makeMatch({
      stage: "R16",
      home: "FRA",
      away: "ENG",
      currentScore: [2, 0],
      fullTime: [2, 0],
      winner: "FRA",
    })
    expect(scoreMatchForTeam(m, "FRA")).toMatchObject({
      points: 3,
      goalsFor: 2,
      reason: "KO_WIN",
    })
    expect(scoreMatchForTeam(m, "ENG")).toMatchObject({
      points: 0,
      goalsFor: 0,
      reason: "KO_LOSS_REG",
    })
  })

  it("KO ET win: 0-0 in regulation, 1-0 in ET → winner 3pt + 1 GF, loser 1pt + 0 GF", () => {
    // fullTime in our model is end-of-ET-if-played, so a 0-0 → ET 1-0 ends 1-0
    const m = makeMatch({
      stage: "QF",
      home: "BRA",
      away: "CRO",
      currentScore: [1, 0],
      fullTime: [1, 0],
      wentToExtraTime: true,
      winner: "BRA",
    })
    expect(scoreMatchForTeam(m, "BRA")).toMatchObject({
      points: 3,
      goalsFor: 1,
      reason: "KO_WIN",
    })
    expect(scoreMatchForTeam(m, "CRO")).toMatchObject({
      points: 1,
      goalsFor: 0,
      reason: "KO_LOSS_ET",
    })
  })

  it("KO pens win after 1-1: winner 3pt + 1 GF, loser 1pt + 1 GF (shootout goals excluded!)", () => {
    const m = makeMatch({
      stage: "R16",
      home: "ARG",
      away: "FRA",
      currentScore: [1, 1],
      fullTime: [1, 1],
      penalties: [4, 3],
      wentToExtraTime: true,
      wentToPenalties: true,
      winner: "ARG",
    })
    const arg = scoreMatchForTeam(m, "ARG")!
    const fra = scoreMatchForTeam(m, "FRA")!
    expect(arg.points).toBe(3)
    expect(arg.goalsFor).toBe(1) // NOT 5 (1 + 4 pens)
    expect(arg.reason).toBe("KO_WIN")
    expect(fra.points).toBe(1)
    expect(fra.goalsFor).toBe(1) // NOT 4
    expect(fra.reason).toBe("KO_LOSS_PENS")
  })

  it("KO pens after 0-0 ET: loser 1pt + 0 GF, reason KO_LOSS_PENS", () => {
    const m = makeMatch({
      stage: "SF",
      home: "GER",
      away: "ESP",
      currentScore: [0, 0],
      fullTime: [0, 0],
      penalties: [5, 4],
      wentToExtraTime: true,
      wentToPenalties: true,
      winner: "GER",
    })
    expect(scoreMatchForTeam(m, "GER")).toMatchObject({
      points: 3,
      goalsFor: 0,
      reason: "KO_WIN",
    })
    expect(scoreMatchForTeam(m, "ESP")).toMatchObject({
      points: 1,
      goalsFor: 0,
      reason: "KO_LOSS_PENS",
    })
  })

  it("provider winner is authoritative — engine does not re-derive from goals", () => {
    // Pathological provider response: winner field disagrees with goal count.
    // (Shouldn't happen in practice but we should trust the provider field.)
    const m = makeMatch({
      stage: "R16",
      home: "USA",
      away: "GER",
      currentScore: [1, 2],
      fullTime: [1, 2],
      winner: "USA", // provider says USA won — engine trusts it
    })
    expect(scoreMatchForTeam(m, "USA")?.reason).toBe("KO_WIN")
    expect(scoreMatchForTeam(m, "GER")?.reason).toBe("KO_LOSS_REG")
  })
})

// ---------------------------------------------------------------------------
// scoreMatchForTeam — non-final statuses
// ---------------------------------------------------------------------------

describe("scoreMatchForTeam — non-final statuses", () => {
  it("SCHEDULED: returns null for both teams", () => {
    const m = makeMatch({
      status: "SCHEDULED",
      home: "USA",
      away: "MEX",
      currentScore: [0, 0],
    })
    expect(scoreMatchForTeam(m, "USA")).toBeNull()
    expect(scoreMatchForTeam(m, "MEX")).toBeNull()
  })

  it("POSTPONED: contributes nothing", () => {
    const m = makeMatch({
      status: "POSTPONED",
      home: "USA",
      away: "MEX",
      currentScore: [0, 0],
    })
    expect(scoreMatchForTeam(m, "USA")).toBeNull()
    expect(scoreMatchForTeam(m, "MEX")).toBeNull()
  })

  it("team not in match: returns null", () => {
    const m = makeMatch({
      stage: "GROUP",
      home: "USA",
      away: "MEX",
      currentScore: [1, 0],
      fullTime: [1, 0],
    })
    expect(scoreMatchForTeam(m, "BRA")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// scoreMatchForTeam — LIVE matches (provisional)
// ---------------------------------------------------------------------------

describe("scoreMatchForTeam — LIVE provisional", () => {
  it("LIVE group tied 1-1 at 60': both teams 1pt + 1 GF, isLive true", () => {
    const m = makeMatch({
      status: "LIVE",
      minute: 60,
      stage: "GROUP",
      home: "USA",
      away: "ENG",
      currentScore: [1, 1],
    })
    const usa = scoreMatchForTeam(m, "USA")!
    const eng = scoreMatchForTeam(m, "ENG")!
    expect(usa).toMatchObject({
      points: 1,
      goalsFor: 1,
      reason: "GROUP_DRAW",
      isLive: true,
    })
    expect(eng).toMatchObject({
      points: 1,
      goalsFor: 1,
      reason: "GROUP_DRAW",
      isLive: true,
    })
  })

  it("LIVE group leading 2-0 at 80': leader 3pt + 2 GF; trailer 0pt + 0 GF (provisional)", () => {
    const m = makeMatch({
      status: "LIVE",
      minute: 80,
      stage: "GROUP",
      home: "BRA",
      away: "TUN",
      currentScore: [2, 0],
    })
    expect(scoreMatchForTeam(m, "BRA")).toMatchObject({
      points: 3,
      goalsFor: 2,
      reason: "GROUP_WIN",
      isLive: true,
    })
    expect(scoreMatchForTeam(m, "TUN")).toMatchObject({
      points: 0,
      goalsFor: 0,
      reason: "GROUP_LOSS",
      isLive: true,
    })
  })

  it("LIVE KO tied at 75' (regulation): both teams 0pt LIVE_KO_TIED + current GF", () => {
    const m = makeMatch({
      status: "LIVE",
      minute: 75,
      stage: "R16",
      home: "POR",
      away: "NED",
      currentScore: [1, 1],
    })
    expect(scoreMatchForTeam(m, "POR")).toMatchObject({
      points: 0,
      goalsFor: 1,
      reason: "LIVE_KO_TIED",
      isLive: true,
    })
    expect(scoreMatchForTeam(m, "NED")).toMatchObject({
      points: 0,
      goalsFor: 1,
      reason: "LIVE_KO_TIED",
      isLive: true,
    })
  })

  it("LIVE KO leading 1-0 at 75' (regulation): leader provisional KO_WIN; trailer provisional KO_LOSS_REG", () => {
    const m = makeMatch({
      status: "LIVE",
      minute: 75,
      stage: "R16",
      home: "ARG",
      away: "JPN",
      currentScore: [1, 0],
    })
    expect(scoreMatchForTeam(m, "ARG")).toMatchObject({
      points: 3,
      goalsFor: 1,
      reason: "KO_WIN",
      isLive: true,
    })
    expect(scoreMatchForTeam(m, "JPN")).toMatchObject({
      points: 0,
      goalsFor: 0,
      reason: "KO_LOSS_REG",
      isLive: true,
    })
  })

  it("LIVE KO in ET (minute 105), trailing: 1pt KO_LOSS_ET — captures ET-loss floor", () => {
    const m = makeMatch({
      status: "LIVE",
      minute: 105,
      stage: "QF",
      home: "ITA",
      away: "ESP",
      currentScore: [1, 2],
      wentToExtraTime: true,
    })
    expect(scoreMatchForTeam(m, "ITA")).toMatchObject({
      points: 1,
      goalsFor: 1,
      reason: "KO_LOSS_ET",
      isLive: true,
    })
    expect(scoreMatchForTeam(m, "ESP")).toMatchObject({
      points: 3,
      goalsFor: 2,
      reason: "KO_WIN",
      isLive: true,
    })
  })

  it("LIVE KO in ET tied at 100': both teams 0pt LIVE_KO_TIED (will head to pens)", () => {
    const m = makeMatch({
      status: "LIVE",
      minute: 100,
      stage: "FINAL",
      home: "ARG",
      away: "FRA",
      currentScore: [2, 2],
      wentToExtraTime: true,
    })
    expect(scoreMatchForTeam(m, "ARG")?.reason).toBe("LIVE_KO_TIED")
    expect(scoreMatchForTeam(m, "FRA")?.reason).toBe("LIVE_KO_TIED")
  })
})

// ---------------------------------------------------------------------------
// buildTeamRecord
// ---------------------------------------------------------------------------

describe("buildTeamRecord", () => {
  it("aggregates W/D/L and GF across group + KO matches", () => {
    const matches: Match[] = [
      makeMatch({
        id: "g1",
        stage: "GROUP",
        home: "USA",
        away: "IRN",
        currentScore: [2, 1],
        fullTime: [2, 1],
      }),
      makeMatch({
        id: "g2",
        stage: "GROUP",
        home: "USA",
        away: "WAL",
        currentScore: [1, 1],
        fullTime: [1, 1],
      }),
      makeMatch({
        id: "g3",
        stage: "GROUP",
        home: "ENG",
        away: "USA",
        currentScore: [3, 0],
        fullTime: [3, 0],
      }),
      makeMatch({
        id: "ko1",
        stage: "R16",
        home: "USA",
        away: "NED",
        currentScore: [1, 3],
        fullTime: [1, 3],
        winner: "NED",
      }),
    ]
    const rec = buildTeamRecord(matches, "USA")
    expect(rec.w).toBe(1)
    expect(rec.d).toBe(1)
    expect(rec.l).toBe(2) // 1 group loss + 1 KO regulation loss
    expect(rec.goalsFor).toBe(2 + 1 + 0 + 1)
    expect(rec.events).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// computeStandings
// ---------------------------------------------------------------------------

describe("computeStandings", () => {
  const members: Member[] = [
    {
      id: "alice",
      displayName: "Alice",
      teams: ["USA", "BRA", "ARG", "FRA"],
    },
    {
      id: "bob",
      displayName: "Bob",
      teams: ["MEX", "GER", "ENG", "ESP"],
    },
    {
      id: "carol",
      displayName: "Carol",
      teams: ["CAN", "IRN", "NED", "POR"],
    },
  ]

  it("ranks by points desc, tiebreaks by goalsFor desc", () => {
    const matches: Match[] = [
      // Alice's USA wins 3-0
      makeMatch({
        id: "1",
        stage: "GROUP",
        home: "USA",
        away: "IRN",
        currentScore: [3, 0],
        fullTime: [3, 0],
      }),
      // Bob's MEX wins 1-0 (same points as Alice if only one match, but fewer goals)
      makeMatch({
        id: "2",
        stage: "GROUP",
        home: "MEX",
        away: "CAN",
        currentScore: [1, 0],
        fullTime: [1, 0],
      }),
    ]
    const rows = computeStandings(matches, members)
    expect(rows[0].memberId).toBe("alice")
    expect(rows[0].points).toBe(3)
    expect(rows[0].goalsFor).toBe(3)
    expect(rows[1].memberId).toBe("bob")
    expect(rows[1].points).toBe(3)
    expect(rows[1].goalsFor).toBe(1)
    expect(rows[2].memberId).toBe("carol")
    expect(rows[2].points).toBe(0)
  })

  it("sets hasLiveMatch true when any of the member's teams is in a LIVE match", () => {
    const matches: Match[] = [
      makeMatch({
        id: "1",
        status: "LIVE",
        minute: 30,
        stage: "GROUP",
        home: "USA",
        away: "IRN",
        currentScore: [1, 0],
      }),
    ]
    const rows = computeStandings(matches, members)
    const alice = rows.find((r) => r.memberId === "alice")!
    const carol = rows.find((r) => r.memberId === "carol")!
    const bob = rows.find((r) => r.memberId === "bob")!
    expect(alice.hasLiveMatch).toBe(true) // owns USA
    expect(carol.hasLiveMatch).toBe(true) // owns IRN
    expect(bob.hasLiveMatch).toBe(false)
  })

  it("delta.ranks reflects rank change vs prev snapshot", () => {
    const prev: StandingsSnapshot = {
      computedAt: "2026-06-12T18:00:00Z",
      rows: [
        {
          rank: 1,
          memberId: "bob",
          points: 3,
          goalsFor: 1,
          teamRecords: [],
          hasLiveMatch: false,
        },
        {
          rank: 2,
          memberId: "alice",
          points: 0,
          goalsFor: 0,
          teamRecords: [],
          hasLiveMatch: false,
        },
        {
          rank: 3,
          memberId: "carol",
          points: 0,
          goalsFor: 0,
          teamRecords: [],
          hasLiveMatch: false,
        },
      ],
    }
    // Now Alice wins big — she should climb from #2 to #1 (delta +1)
    const matches: Match[] = [
      makeMatch({
        id: "1",
        stage: "GROUP",
        home: "USA",
        away: "IRN",
        currentScore: [5, 0],
        fullTime: [5, 0],
      }),
      makeMatch({
        id: "2",
        stage: "GROUP",
        home: "MEX",
        away: "CAN",
        currentScore: [1, 0],
        fullTime: [1, 0],
      }),
    ]
    const rows = computeStandings(matches, members, prev)
    const alice = rows.find((r) => r.memberId === "alice")!
    const bob = rows.find((r) => r.memberId === "bob")!
    expect(alice.rank).toBe(1)
    expect(alice.delta?.ranks).toBe(1) // moved up 1 spot
    expect(bob.rank).toBe(2)
    expect(bob.delta?.ranks).toBe(-1) // moved down 1 spot
  })
})
