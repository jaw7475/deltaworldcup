import type { Match, Score, TeamCode } from "@/lib/scoring/types"

export type FixtureOutcome = "scheduled" | "live" | "win" | "loss" | "draw"

export interface FixtureCellData {
  match: Match
  team: TeamCode
  side: "home" | "away"
  opponent: TeamCode
  outcome: FixtureOutcome
  /** Goals for/against from the team's perspective, when known. */
  scoreLine?: { for: number; against: number }
  /** Live match minute when status === "live". */
  liveMinute?: number
}

/** Pull "YYYY-MM-DD" out of an ISO UTC kickoff for date-bucket keys. */
export function dateKey(utcKickoff: string): string {
  return utcKickoff.slice(0, 10)
}

/** Inclusive list of YYYY-MM-DD strings from `start` to `end`. */
export function makeDateRange(start: Date, end: Date): string[] {
  const out: string[] = []
  const cur = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  )
  const stop = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  )
  while (cur <= stop) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

/** Nested map: team -> date -> match. */
export function indexFixturesByTeamAndDate(
  matches: Match[]
): Map<TeamCode, Map<string, Match>> {
  const root = new Map<TeamCode, Map<string, Match>>()
  for (const m of matches) {
    const key = dateKey(m.utcKickoff)
    for (const team of [m.home, m.away] as TeamCode[]) {
      let inner = root.get(team)
      if (!inner) {
        inner = new Map<string, Match>()
        root.set(team, inner)
      }
      inner.set(key, m)
    }
  }
  return root
}

function pickSide(match: Match, team: TeamCode): "home" | "away" {
  return match.home === team ? "home" : "away"
}

function goalsFor(score: Score, side: "home" | "away"): number {
  return side === "home" ? score.home : score.away
}

function goalsAgainst(score: Score, side: "home" | "away"): number {
  return side === "home" ? score.away : score.home
}

export function buildCellData(match: Match, team: TeamCode): FixtureCellData {
  const side = pickSide(match, team)
  const opponent = side === "home" ? match.away : match.home

  if (match.status === "SCHEDULED" || match.status === "POSTPONED") {
    return { match, team, side, opponent, outcome: "scheduled" }
  }

  if (match.status === "LIVE") {
    return {
      match,
      team,
      side,
      opponent,
      outcome: "live",
      scoreLine: {
        for: goalsFor(match.currentScore, side),
        against: goalsAgainst(match.currentScore, side),
      },
      liveMinute: match.minute,
    }
  }

  // FINISHED
  const score = match.fullTime ?? match.currentScore
  const gf = goalsFor(score, side)
  const ga = goalsAgainst(score, side)
  let outcome: FixtureOutcome
  if (match.stage === "GROUP") {
    outcome = gf > ga ? "win" : gf === ga ? "draw" : "loss"
  } else {
    outcome = match.winner === team ? "win" : "loss"
  }
  return {
    match,
    team,
    side,
    opponent,
    outcome,
    scoreLine: { for: gf, against: ga },
  }
}

/** Earliest SCHEDULED match across the given teams, or null if none. */
export function findNextFixture(
  matches: Match[],
  teams: readonly TeamCode[]
): Match | null {
  const teamSet = new Set(teams)
  const upcoming = matches.filter(
    (m) => m.status === "SCHEDULED" && (teamSet.has(m.home) || teamSet.has(m.away))
  )
  upcoming.sort((a, b) => a.utcKickoff.localeCompare(b.utcKickoff))
  return upcoming[0] ?? null
}

/** Pretty: "6/11", "6/12", … */
export function formatShortDate(isoDate: string): string {
  // isoDate = YYYY-MM-DD
  const [, m, d] = isoDate.split("-")
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`
}

/** Kickoff time formatted in the viewer's local zone: "3:00 PM". */
export function formatLocalKickoffTime(utcIso: string): string {
  return new Date(utcIso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}
