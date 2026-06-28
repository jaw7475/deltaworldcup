import type { Match, TeamCode } from "@/lib/scoring/types"

export interface GroupTeamStanding {
  team: TeamCode
  points: number
  gd: number
  gf: number
}

export interface GroupState {
  letter: string
  teams: TeamCode[]
  /** Standings reflecting only FINISHED group matches. */
  standings: Map<TeamCode, GroupTeamStanding>
  /** GROUP-stage matches in this group that are not yet FINISHED. */
  remaining: Match[]
}

/**
 * Build group state from a match list. Each team's group is the set of teams
 * it plays in GROUP-stage matches. Standings are seeded from FINISHED group
 * matches; non-FINISHED group matches end up in `remaining`.
 *
 * Group letters are assigned in iteration order (A, B, C...) and are NOT
 * stable across input permutations — use them only as opaque identifiers.
 */
export function inferGroups(matches: Match[]): GroupState[] {
  const opponents = new Map<TeamCode, Set<TeamCode>>()
  for (const m of matches) {
    if (m.stage !== "GROUP") continue
    if (!opponents.has(m.home)) opponents.set(m.home, new Set())
    if (!opponents.has(m.away)) opponents.set(m.away, new Set())
    opponents.get(m.home)!.add(m.away)
    opponents.get(m.away)!.add(m.home)
  }
  const seen = new Set<TeamCode>()
  const groups: GroupState[] = []
  let letterCode = "A".charCodeAt(0)
  for (const [team, opps] of opponents) {
    if (seen.has(team)) continue
    const group = new Set<TeamCode>([team, ...opps])
    for (const t of group) seen.add(t)
    const teams = [...group]
    const remaining = matches.filter(
      (m) =>
        m.stage === "GROUP" &&
        m.status !== "FINISHED" &&
        group.has(m.home) &&
        group.has(m.away)
    )
    const standings = new Map<TeamCode, GroupTeamStanding>()
    for (const t of teams) {
      standings.set(t, { team: t, points: 0, gd: 0, gf: 0 })
    }
    for (const m of matches) {
      if (m.stage !== "GROUP" || m.status !== "FINISHED") continue
      if (!group.has(m.home) || !group.has(m.away)) continue
      const ft = m.fullTime ?? m.currentScore
      applyResult(standings, m.home, m.away, ft.home, ft.away)
    }
    groups.push({
      letter: String.fromCharCode(letterCode++),
      teams,
      standings,
      remaining,
    })
  }
  return groups
}

export function applyResult(
  standings: Map<TeamCode, GroupTeamStanding>,
  home: TeamCode,
  away: TeamCode,
  hGoals: number,
  aGoals: number
): void {
  const h = standings.get(home)!
  const a = standings.get(away)!
  h.gf += hGoals
  a.gf += aGoals
  h.gd += hGoals - aGoals
  a.gd += aGoals - hGoals
  if (hGoals > aGoals) h.points += 3
  else if (aGoals > hGoals) a.points += 3
  else {
    h.points += 1
    a.points += 1
  }
}

/** FIFA tiebreaker comparator: points → goal difference → goals for. */
export function sortByPointsGdGf(
  standings: Map<TeamCode, GroupTeamStanding> | GroupTeamStanding[]
): GroupTeamStanding[] {
  const arr = Array.isArray(standings)
    ? [...standings]
    : [...standings.values()]
  return arr.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.gd !== a.gd) return b.gd - a.gd
    return b.gf - a.gf
  })
}
