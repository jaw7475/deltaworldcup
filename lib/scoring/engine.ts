import type {
  Match,
  PointEvent,
  Reason,
  StandingsRow,
  StandingsSnapshot,
  TeamCode,
  TeamRecord,
  Score,
} from "./types"
import type { Member } from "@/lib/config/members"

const REGULATION_MINUTE_CAP = 90

function sideFor(match: Match, team: TeamCode): "home" | "away" | null {
  if (match.home === team) return "home"
  if (match.away === team) return "away"
  return null
}

function pickScore(score: Score, side: "home" | "away"): { gf: number; ga: number } {
  return side === "home"
    ? { gf: score.home, ga: score.away }
    : { gf: score.away, ga: score.home }
}

/**
 * Compute a single team's PointEvent for a single match.
 * Returns null when:
 *  - the team isn't in the match
 *  - the match hasn't started (SCHEDULED) or won't be played (POSTPONED)
 */
export function scoreMatchForTeam(match: Match, team: TeamCode): PointEvent | null {
  const side = sideFor(match, team)
  if (!side) return null
  if (match.status === "SCHEDULED" || match.status === "POSTPONED") return null

  if (match.status === "FINISHED") {
    return scoreFinished(match, team, side)
  }
  // LIVE
  return scoreLive(match, team, side)
}

function scoreFinished(
  match: Match,
  team: TeamCode,
  side: "home" | "away"
): PointEvent {
  // fullTime feeds GF for FINISHED. Fall back to currentScore if provider didn't
  // set fullTime (defensive — shouldn't happen for FINISHED).
  const scoreForGf = match.fullTime ?? match.currentScore
  const { gf } = pickScore(scoreForGf, side)

  if (match.stage === "GROUP") {
    const { gf: g, ga } = pickScore(scoreForGf, side)
    let points: 0 | 1 | 3
    let reason: Reason
    if (g > ga) {
      points = 3
      reason = "GROUP_WIN"
    } else if (g === ga) {
      points = 1
      reason = "GROUP_DRAW"
    } else {
      points = 0
      reason = "GROUP_LOSS"
    }
    return basePointEvent(match, team, points, gf, reason, false)
  }

  // KO finished — trust provider's winner field (it accounts for pens).
  if (match.winner === team) {
    return basePointEvent(match, team, 3, gf, "KO_WIN", false)
  }
  // Team lost. Decide reason by how the match ended.
  if (match.wentToPenalties) {
    return basePointEvent(match, team, 1, gf, "KO_LOSS_PENS", false)
  }
  if (match.wentToExtraTime) {
    return basePointEvent(match, team, 1, gf, "KO_LOSS_ET", false)
  }
  return basePointEvent(match, team, 0, gf, "KO_LOSS_REG", false)
}

function scoreLive(
  match: Match,
  team: TeamCode,
  side: "home" | "away"
): PointEvent {
  const { gf, ga } = pickScore(match.currentScore, side)
  const inExtraTime =
    match.wentToExtraTime || (match.minute ?? 0) > REGULATION_MINUTE_CAP

  if (match.stage === "GROUP") {
    let points: 0 | 1 | 3
    let reason: Reason
    if (gf > ga) {
      points = 3
      reason = "GROUP_WIN"
    } else if (gf === ga) {
      points = 1
      reason = "GROUP_DRAW"
    } else {
      points = 0
      reason = "GROUP_LOSS"
    }
    return basePointEvent(match, team, points, gf, reason, true)
  }

  // LIVE KO
  if (gf > ga) {
    return basePointEvent(match, team, 3, gf, "KO_WIN", true)
  }
  if (gf < ga) {
    // Trailing: in regulation it's an outright loss-in-progress; in ET we credit
    // the ET-loss floor.
    return inExtraTime
      ? basePointEvent(match, team, 1, gf, "KO_LOSS_ET", true)
      : basePointEvent(match, team, 0, gf, "KO_LOSS_REG", true)
  }
  // Tied during a KO — outcome unknown; no points awarded yet.
  return basePointEvent(match, team, 0, gf, "LIVE_KO_TIED", true)
}

function basePointEvent(
  match: Match,
  team: TeamCode,
  points: 0 | 1 | 3,
  goalsFor: number,
  reason: Reason,
  isLive: boolean
): PointEvent {
  return {
    matchId: match.id,
    team,
    stage: match.stage,
    utcKickoff: match.utcKickoff,
    points,
    goalsFor,
    reason,
    isLive,
  }
}

/**
 * Aggregate one team's matches into a TeamRecord.
 * W/D/L counts: any 3pt event is a W, any 1pt is a D (group draw) or close-loss
 * (KO ET/pens) — we count those as L for the W/D/L display since the team did
 * lose; only GROUP_DRAW counts as D. 0pt is always L.
 */
export function buildTeamRecord(matches: Match[], team: TeamCode): TeamRecord {
  const events: PointEvent[] = []
  let w = 0
  let d = 0
  let l = 0
  let goalsFor = 0
  for (const m of matches) {
    const evt = scoreMatchForTeam(m, team)
    if (!evt) continue
    events.push(evt)
    goalsFor += evt.goalsFor
    if (evt.reason === "GROUP_WIN" || evt.reason === "KO_WIN") {
      w += 1
    } else if (evt.reason === "GROUP_DRAW") {
      d += 1
    } else if (
      evt.reason === "GROUP_LOSS" ||
      evt.reason === "KO_LOSS_REG" ||
      evt.reason === "KO_LOSS_ET" ||
      evt.reason === "KO_LOSS_PENS"
    ) {
      l += 1
    }
    // LIVE_KO_TIED does not yet count as W/D/L — outcome unknown.
  }
  return { team, w, d, l, goalsFor, events }
}

/**
 * Compute the full league standings.
 * Sort key: (points desc, goalsFor desc, displayName asc).
 * If `prev` is provided, each row's `delta.ranks` = prev.rank - new.rank
 * (positive = climbed up).
 */
export function computeStandings(
  matches: Match[],
  members: readonly Member[],
  prev?: StandingsSnapshot
): StandingsRow[] {
  const prevRankById = new Map<string, number>()
  if (prev) {
    for (const r of prev.rows) prevRankById.set(r.memberId, r.rank)
  }

  // Build per-member raw aggregates.
  const raw = members.map((m) => {
    const teamRecords = m.teams.map((t) => buildTeamRecord(matches, t))
    const points = teamRecords.reduce(
      (acc, tr) => acc + tr.events.reduce((s, e) => s + e.points, 0),
      0
    )
    const goalsFor = teamRecords.reduce((acc, tr) => acc + tr.goalsFor, 0)
    const hasLiveMatch = teamRecords.some((tr) =>
      tr.events.some((e) => e.isLive)
    )
    return {
      memberId: m.id,
      displayName: m.displayName,
      points,
      goalsFor,
      teamRecords,
      hasLiveMatch,
    }
  })

  // Sort.
  raw.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.displayName.localeCompare(b.displayName)
  })

  // Assign ranks (1-based, dense vs competition style: use competition style —
  // ties share the same rank, next slot skips).
  const rows: StandingsRow[] = []
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]
    let rank: number
    if (
      i > 0 &&
      r.points === raw[i - 1].points &&
      r.goalsFor === raw[i - 1].goalsFor
    ) {
      rank = rows[i - 1].rank
    } else {
      rank = i + 1
    }
    const row: StandingsRow = {
      rank,
      memberId: r.memberId,
      points: r.points,
      goalsFor: r.goalsFor,
      teamRecords: r.teamRecords,
      hasLiveMatch: r.hasLiveMatch,
    }
    if (prev) {
      const prevRank = prevRankById.get(r.memberId)
      if (prevRank !== undefined) {
        row.delta = { ranks: prevRank - rank }
      }
    }
    rows.push(row)
  }
  return rows
}
