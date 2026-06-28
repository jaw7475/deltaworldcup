import type { Match, TeamCode } from "@/lib/scoring/types"
import { getElo, eloThreeWay } from "@/lib/config/elo"
import {
  inferGroups,
  applyResult,
  sortByPointsGdGf,
  type GroupTeamStanding,
  type GroupState,
} from "@/lib/standings/groupStandings"

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
      const sorted = sortByPointsGdGf(standings)
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
    const rankedThirds = sortByPointsGdGf(thirdPlaceTeams)
    for (let i = 0; i < 8 && i < rankedThirds.length; i++) {
      const t = rankedThirds[i].team
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
