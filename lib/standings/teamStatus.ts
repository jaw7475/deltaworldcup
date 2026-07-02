import type { Match, TeamCode } from "@/lib/scoring/types"
import {
  inferGroups,
  sortByPointsGdGf,
  type GroupTeamStanding,
} from "./groupStandings"

export type TeamStatus = "alive" | "eliminated" | "active"

/** 2026 format: top 2 from each group + best 8 third-place finishers advance. */
const THIRD_PLACE_QUALIFIER_SLOTS = 8

/**
 * Map every team appearing in the match list to a deterministic qualification
 * status, derived purely from FINISHED matches and the known tournament
 * structure.
 *
 * Why no schedule-based signals: between rounds, the next-round bracket is
 * often not published until well after the previous round ends. Treating
 * "no upcoming match" as elimination would flicker every just-won team to
 * eliminated until the bracket posts, at every round boundary.
 *
 * - eliminated: lost a KO match; OR finished 4th in a fully-FINISHED group;
 *   OR finished 3rd in a fully-FINISHED group with all groups complete and
 *   ranked outside the top 8 best third-place finishers.
 * - alive: won the most recent KO match (no subsequent loss); OR finished
 *   1st/2nd in a fully-FINISHED group; OR finished 3rd in a fully-FINISHED
 *   group with all groups complete and ranked in the top 8 third-place
 *   finishers.
 * - active: default — still mid-group-stage, or finished 3rd but the global
 *   third-place comparison isn't yet decidable (some group still has games
 *   to play).
 */
export function getTeamStatusMap(matches: Match[]): Map<TeamCode, TeamStatus> {
  const result = new Map<TeamCode, TeamStatus>()

  // 1. KO outcomes win over everything else: walk FINISHED KO matches in
  //    kickoff order, recording each team's most recent KO result.
  const koMatches = matches
    .filter((m) => m.stage !== "GROUP" && m.status === "FINISHED" && m.winner)
    .sort((a, b) => a.utcKickoff.localeCompare(b.utcKickoff))

  const latestKoOutcome = new Map<TeamCode, "won" | "lost">()
  for (const m of koMatches) {
    const winner = m.winner!
    const loser = winner === m.home ? m.away : m.home
    latestKoOutcome.set(winner, "won")
    latestKoOutcome.set(loser, "lost")
  }

  for (const [team, outcome] of latestKoOutcome) {
    result.set(team, outcome === "lost" ? "eliminated" : "alive")
  }

  // 2. Group-based classification, only for groups whose 6 matches are all
  //    FINISHED. Standalone from KO data — a team in the KO bracket already
  //    has its status set above and is skipped.
  const groups = inferGroups(matches).filter((g) => g.teams.length === 4)
  const completeGroups = groups.filter((g) => g.remaining.length === 0)
  const allGroupsComplete =
    groups.length > 0 && completeGroups.length === groups.length

  const thirdPlaceStandings: GroupTeamStanding[] = []
  for (const g of completeGroups) {
    const sorted = sortByPointsGdGf(g.standings)
    sorted.forEach((s, i) => {
      const rank = i + 1
      // 3rd-place teams always enter the global comparison pool, even if
      // they've since played KO matches. Excluding qualifiers here would
      // shrink the pool below 8 entries and let non-qualifying 3rds slide
      // into a top-8 slot that never opened up.
      if (rank === 3) {
        thirdPlaceStandings.push(s)
        return
      }
      if (latestKoOutcome.has(s.team)) return
      if (rank === 1 || rank === 2) result.set(s.team, "alive")
      else if (rank === 4) result.set(s.team, "eliminated")
    })
  }

  // 3. Best-8 third-place comparison only fires once every group is decided.
  if (allGroupsComplete) {
    const rankedThirds = sortByPointsGdGf(thirdPlaceStandings)
    rankedThirds.forEach((s, i) => {
      if (latestKoOutcome.has(s.team)) return
      result.set(
        s.team,
        i < THIRD_PLACE_QUALIFIER_SLOTS ? "alive" : "eliminated"
      )
    })
  }

  // 4. Any team appearing in the data we haven't classified is still "active".
  for (const m of matches) {
    if (!result.has(m.home)) result.set(m.home, "active")
    if (!result.has(m.away)) result.set(m.away, "active")
  }

  return result
}

export function getTeamStatus(team: TeamCode, matches: Match[]): TeamStatus {
  return getTeamStatusMap(matches).get(team) ?? "active"
}
