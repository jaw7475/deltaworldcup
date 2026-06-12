import type { Match, MatchStatus, Score, TeamCode } from "@/lib/scoring/types"
import type { FootballDataProvider, MatchDetail } from "./types"
import { SCHEDULE } from "@/lib/config/schedule"
import { TEAMS } from "@/lib/config/teams"

/**
 * In-memory mock provider for local dev and pre-tournament smoke tests.
 *
 * Available fixture sets via MOCK_FIXTURES env var:
 *  - "scheduled" (default): every match in SCHEDULE marked SCHEDULED.
 *  - "midGroupStage": first SCHEDULE entry FINISHED, rest SCHEDULED.
 *  - "liveDemo": old 3-match demo with one FINISHED + one LIVE.
 *  - "fullDemo": 72 deterministic group-stage matches across all 48 teams,
 *    with a fixed pretend-now of 2026-06-15T18:00:00Z producing a mix of
 *    FINISHED, LIVE, and SCHEDULED entries.
 */
export class MockProvider implements FootballDataProvider {
  constructor(private readonly fixtureSet: string = "scheduled") {}

  async fetchAllMatches(): Promise<Match[]> {
    if (this.fixtureSet === "midGroupStage") return midGroupStage()
    if (this.fixtureSet === "liveDemo") return liveDemo()
    if (this.fixtureSet === "fullDemo") return fullDemo()
    return scheduledOnly()
  }

  async fetchMatchDetail(matchId: string): Promise<MatchDetail> {
    return { matchId, goals: [] }
  }
}

function scheduledOnly(): Match[] {
  return SCHEDULE.map((s) => ({
    id: s.id,
    stage: s.stage,
    utcKickoff: s.utcKickoff,
    status: "SCHEDULED",
    home: s.home,
    away: s.away,
    currentScore: { home: 0, away: 0 },
    wentToExtraTime: false,
    wentToPenalties: false,
    winner: null,
  }))
}

function midGroupStage(): Match[] {
  const [first, ...rest] = SCHEDULE
  if (!first) return []
  const finished: Match = {
    id: first.id,
    stage: first.stage,
    utcKickoff: first.utcKickoff,
    status: "FINISHED",
    home: first.home,
    away: first.away,
    currentScore: { home: 2, away: 1 },
    fullTime: { home: 2, away: 1 },
    wentToExtraTime: false,
    wentToPenalties: false,
    winner: first.home,
  }
  return [
    finished,
    ...rest.map((s) => ({
      id: s.id,
      stage: s.stage,
      utcKickoff: s.utcKickoff,
      status: "SCHEDULED" as const,
      home: s.home,
      away: s.away,
      currentScore: { home: 0, away: 0 },
      wentToExtraTime: false,
      wentToPenalties: false,
      winner: null,
    })),
  ]
}

function liveDemo(): Match[] {
  const [first, second, ...rest] = SCHEDULE
  if (!first || !second) return scheduledOnly()
  return [
    {
      id: first.id,
      stage: first.stage,
      utcKickoff: first.utcKickoff,
      status: "FINISHED",
      home: first.home,
      away: first.away,
      currentScore: { home: 3, away: 0 },
      fullTime: { home: 3, away: 0 },
      wentToExtraTime: false,
      wentToPenalties: false,
      winner: first.home,
    },
    {
      id: second.id,
      stage: second.stage,
      utcKickoff: second.utcKickoff,
      status: "LIVE",
      minute: 62,
      home: second.home,
      away: second.away,
      currentScore: { home: 1, away: 1 },
      wentToExtraTime: false,
      wentToPenalties: false,
      winner: null,
    },
    ...rest.map((s) => ({
      id: s.id,
      stage: s.stage,
      utcKickoff: s.utcKickoff,
      status: "SCHEDULED" as const,
      home: s.home,
      away: s.away,
      currentScore: { home: 0, away: 0 },
      wentToExtraTime: false,
      wentToPenalties: false,
      winner: null,
    })),
  ]
}

// ---------------------------------------------------------------------------
// fullDemo: deterministic 72-match synthetic group stage
// ---------------------------------------------------------------------------

const MOCK_NOW_ISO = "2026-06-15T18:00:00Z"

function fullDemo(): Match[] {
  const now = new Date(MOCK_NOW_ISO)
  const teamCodes = TEAMS.map((t) => t.code)
  // Interleave teams into 12 synthetic groups so each group mixes teams from
  // multiple league members (TEAMS is listed in member order, blocks of 4).
  const groups: TeamCode[][] = Array.from({ length: 12 }, (_, g) => [
    teamCodes[g],
    teamCodes[g + 12],
    teamCodes[g + 24],
    teamCodes[g + 36],
  ])

  const pairings: [number, number][] = [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3],
    [0, 3],
    [1, 2],
  ]

  const matches: Match[] = []
  let id = 1
  groups.forEach((group, gIdx) => {
    pairings.forEach((pair, mIdx) => {
      const matchday = Math.floor(mIdx / 2) // 0, 0, 1, 1, 2, 2
      const home = group[pair[0]]
      const away = group[pair[1]]
      const kickoff = computeKickoff(gIdx, matchday, mIdx)
      const status = decideStatus(kickoff, now)
      const score = deterministicScore(home, away, id)

      const m: Match = {
        id: `mock-${id}`,
        stage: "GROUP",
        utcKickoff: kickoff.toISOString(),
        status,
        home,
        away,
        currentScore: score,
        wentToExtraTime: false,
        wentToPenalties: false,
        winner: null,
      }
      if (status === "FINISHED") {
        m.fullTime = score
        m.winner =
          score.home > score.away ? home : score.home < score.away ? away : null
      } else if (status === "LIVE") {
        m.minute = 30 + ((id * 7) % 55) // varies 30..84
      }
      matches.push(m)
      id++
    })
  })
  return matches
}

/**
 * Deterministic kickoff: spreads matchday 1 across June 11–13, matchday 2
 * across June 14–16, matchday 3 across June 17–19, with kickoffs varying
 * between 15:00 and 21:00 UTC.
 */
function computeKickoff(
  groupIdx: number,
  matchday: number,
  mIdx: number
): Date {
  const dayBase = 11 + matchday * 3
  const day = dayBase + (groupIdx % 3)
  const hour = 15 + ((mIdx + groupIdx) % 4) * 2
  return new Date(Date.UTC(2026, 5, day, hour, 0, 0))
}

function decideStatus(kickoff: Date, now: Date): MatchStatus {
  const elapsedMs = now.getTime() - kickoff.getTime()
  const elapsedH = elapsedMs / 3_600_000
  if (elapsedH >= 2) return "FINISHED"
  if (elapsedH >= -0.5 && elapsedH < 2) return "LIVE"
  return "SCHEDULED"
}

function deterministicScore(home: TeamCode, away: TeamCode, seed: number): Score {
  const h =
    Math.abs(seed * 13 + home.charCodeAt(0) + home.charCodeAt(home.length - 1)) %
    5
  const a =
    Math.abs(seed * 17 + away.charCodeAt(0) + away.charCodeAt(away.length - 1)) %
    4
  return { home: h, away: a }
}
