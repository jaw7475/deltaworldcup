import type { Match } from "@/lib/scoring/types"
import type { FootballDataProvider } from "./types"
import { SCHEDULE } from "@/lib/config/schedule"

/**
 * In-memory mock provider for local dev and pre-tournament smoke tests.
 * Default behavior: every scheduled match is SCHEDULED (no results yet).
 *
 * Override via MOCK_FIXTURES=name to use a built-in fake tournament state.
 */
export class MockProvider implements FootballDataProvider {
  constructor(private readonly fixtureSet: string = "scheduled") {}

  async fetchAllMatches(): Promise<Match[]> {
    if (this.fixtureSet === "midGroupStage") return midGroupStage()
    if (this.fixtureSet === "liveDemo") return liveDemo()
    return scheduledOnly()
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
  // First scheduled match finished, second still scheduled.
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
