import type { Match, TeamCode } from "@/lib/scoring/types"
import { getElo, eloThreeWay } from "@/lib/config/elo"

/**
 * Group-stage Monte Carlo. Infers groups from the GROUP-stage match list
 * (two teams that play each other in a GROUP match share a group), simulates
 * remaining matches per trial, then computes P(reach R32) per team using the
 * 2026 format: top-2 from each group + 8 best 3rd-place teams across the 12
 * groups advance.
 */

export interface GroupAdvanceProbs {
  [team: string]: number
}

interface GroupTeamStanding {
  team: TeamCode
  points: number
  gd: number
  gf: number
}

interface GroupState {
  letter: string
  teams: TeamCode[]
  standings: Map<TeamCode, GroupTeamStanding>
  remaining: Match[]
}

function inferGroups(matches: Match[]): GroupState[] {
  // Each team's group is the set of teams it plays in GROUP-stage matches.
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
    // Validate group is a clique
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
    // Seed standings with already-finished GROUP matches
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

function applyResult(
  standings: Map<TeamCode, GroupTeamStanding>,
  home: TeamCode,
  away: TeamCode,
  hGoals: number,
  aGoals: number
) {
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

function cloneStandings(
  src: Map<TeamCode, GroupTeamStanding>
): Map<TeamCode, GroupTeamStanding> {
  const out = new Map<TeamCode, GroupTeamStanding>()
  for (const [k, v] of src) out.set(k, { ...v })
  return out
}

interface Rng {
  (): number
}

function mulberry32(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Sample from Poisson with mean `lambda` via Knuth's algorithm. */
function samplePoisson(lambda: number, rng: Rng): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

function sampleMatch(
  match: Match,
  rng: Rng
): { hGoals: number; aGoals: number } {
  const eloH = getElo(match.home)
  const eloA = getElo(match.away)
  const { pHomeWin, pDraw } = eloThreeWay(eloH, eloA)
  const r = rng()
  let outcome: "H" | "D" | "A"
  if (r < pHomeWin) outcome = "H"
  else if (r < pHomeWin + pDraw) outcome = "D"
  else outcome = "A"

  // Sample scores via Poisson with Elo-adjusted means
  const delta = (eloH - eloA) / 400
  const lambdaH = Math.max(0.3, Math.min(4, 1.4 + 0.5 * delta))
  const lambdaA = Math.max(0.3, Math.min(4, 1.4 - 0.5 * delta))
  let hGoals = samplePoisson(lambdaH, rng)
  let aGoals = samplePoisson(lambdaA, rng)
  // Force the score to be consistent with the sampled outcome
  if (outcome === "H" && hGoals <= aGoals) hGoals = aGoals + 1
  if (outcome === "A" && aGoals <= hGoals) aGoals = hGoals + 1
  if (outcome === "D") {
    const tie = Math.min(hGoals, aGoals)
    hGoals = tie
    aGoals = tie
  }
  return { hGoals, aGoals }
}

function sortStandings(
  standings: Map<TeamCode, GroupTeamStanding>
): GroupTeamStanding[] {
  return [...standings.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.gd !== a.gd) return b.gd - a.gd
    return b.gf - a.gf
  })
}

export interface GroupSimResult {
  /** P(team finishes 1st in its group). */
  pFirst: Map<TeamCode, number>
  /** P(team finishes 2nd in its group). */
  pSecond: Map<TeamCode, number>
  /** P(team finishes 3rd in its group). */
  pThird: Map<TeamCode, number>
  /** P(team advances to R32) — top 2 + best 8 third-place finishers. */
  pAdvance: Map<TeamCode, number>
  /** Inferred groups (used downstream). */
  groups: GroupState[]
}

export function simulateGroupStage(
  matches: Match[],
  trials: number = 10_000,
  seed: number = 0xc0ffee
): GroupSimResult {
  const groups = inferGroups(matches)
  const rng = mulberry32(seed)

  const firstCount = new Map<TeamCode, number>()
  const secondCount = new Map<TeamCode, number>()
  const thirdCount = new Map<TeamCode, number>()
  const advanceCount = new Map<TeamCode, number>()

  for (const g of groups) {
    for (const t of g.teams) {
      firstCount.set(t, 0)
      secondCount.set(t, 0)
      thirdCount.set(t, 0)
      advanceCount.set(t, 0)
    }
  }

  // Skip degenerate groups (would indicate upstream data issue — e.g. a KO
  // match mis-tagged as GROUP). Better than crashing the whole projection.
  const validGroups = groups.filter((g) => g.teams.length === 4)
  if (validGroups.length !== groups.length) {
    console.warn(
      `[montecarlo] ${groups.length - validGroups.length} degenerate group(s) skipped:`,
      groups.filter((g) => g.teams.length !== 4).map((g) => ({
        size: g.teams.length,
        teams: g.teams,
      }))
    )
  }

  for (let trial = 0; trial < trials; trial++) {
    const thirdPlaceTeams: GroupTeamStanding[] = []
    for (const g of validGroups) {
      const standings = cloneStandings(g.standings)
      for (const m of g.remaining) {
        const { hGoals, aGoals } = sampleMatch(m, rng)
        applyResult(standings, m.home, m.away, hGoals, aGoals)
      }
      const sorted = sortStandings(standings)
      if (sorted.length < 4) continue
      firstCount.set(sorted[0].team, (firstCount.get(sorted[0].team) ?? 0) + 1)
      secondCount.set(sorted[1].team, (secondCount.get(sorted[1].team) ?? 0) + 1)
      thirdCount.set(sorted[2].team, (thirdCount.get(sorted[2].team) ?? 0) + 1)
      thirdPlaceTeams.push(sorted[2])
      // Top-2 always advance
      advanceCount.set(sorted[0].team, (advanceCount.get(sorted[0].team) ?? 0) + 1)
      advanceCount.set(sorted[1].team, (advanceCount.get(sorted[1].team) ?? 0) + 1)
    }
    // Best 8 of 12 third-place teams advance
    thirdPlaceTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })
    for (let i = 0; i < 8 && i < thirdPlaceTeams.length; i++) {
      const t = thirdPlaceTeams[i].team
      advanceCount.set(t, (advanceCount.get(t) ?? 0) + 1)
    }
  }

  const toProb = (m: Map<TeamCode, number>) => {
    const out = new Map<TeamCode, number>()
    for (const [k, v] of m) out.set(k, v / trials)
    return out
  }

  return {
    pFirst: toProb(firstCount),
    pSecond: toProb(secondCount),
    pThird: toProb(thirdCount),
    pAdvance: toProb(advanceCount),
    groups,
  }
}
