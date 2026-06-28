import type { Match, TeamCode } from "@/lib/scoring/types"
import { getElo, eloWinProb } from "@/lib/config/elo"

/**
 * Knockout-round projection. Given P(reach R32) per team, we cascade through
 * each round computing P(reach next round) by estimating the average Elo of
 * teams remaining at that round (weighted by P(reach round)) and applying the
 * Elo win formula.
 *
 * This is an analytical approximation — it doesn't model the actual bracket
 * pairing, which means a team that draws an easy opponent in round R will look
 * underrated by this model and vice-versa. Across thousands of brackets the
 * average opponent quality does converge to the weighted average though, so
 * for aggregate xPts the approximation is reasonable.
 *
 * Finished KO matches (passed via `matches`) lock in deterministic outcomes:
 * losers' downstream pReach drops to 0, winners propagate with pWin = 1. The
 * already-played round is also marked in `knownRounds` so `koExpectedPoints`
 * can skip it — those points are already in the team's banked total.
 */

export const KO_ROUNDS = ["R32", "R16", "QF", "SF", "FINAL"] as const
export type KoRound = (typeof KO_ROUNDS)[number]

export interface KoTeamProjection {
  /** P(team plays in round R) for R in KO_ROUNDS. */
  pReach: Record<KoRound, number>
  /** P(team plays in the third-place playoff). */
  pThirdPlace: number
  /** P(team wins each round | they reached it). */
  pWinGiven: Record<KoRound, number>
  /** P(team wins third-place | they're in it). */
  pWinThirdGiven: number
  /** Rounds whose outcome is already FINISHED (and so already in banked pts). */
  knownRounds: Set<KoRound>
  /** True if this team's third-place match outcome is already FINISHED. */
  knownThirdPlace: boolean
}

export interface KoProjectionInput {
  /** P(team advances to R32) — from the group-stage simulator. */
  pReachR32: Map<TeamCode, number>
  /**
   * All matches (any stage, any status). Finished KO + THIRD_PLACE matches are
   * used to lock in deterministic outcomes. Optional — omit for pure-projection
   * use cases (tests, what-if scenarios).
   */
  matches?: Match[]
}

type Outcome = "won" | "lost"

interface KnownKoOutcomes {
  byRound: Map<KoRound, Map<TeamCode, Outcome>>
  thirdPlace: Map<TeamCode, Outcome>
}

function buildKnownKoOutcomes(matches: Match[]): KnownKoOutcomes {
  const byRound = new Map<KoRound, Map<TeamCode, Outcome>>()
  for (const r of KO_ROUNDS) byRound.set(r, new Map())
  const thirdPlace = new Map<TeamCode, Outcome>()
  for (const m of matches) {
    if (m.status !== "FINISHED") continue
    if (!m.winner) continue
    const loser = m.winner === m.home ? m.away : m.home
    if (m.stage === "THIRD_PLACE") {
      thirdPlace.set(m.winner, "won")
      thirdPlace.set(loser, "lost")
    } else if ((KO_ROUNDS as readonly string[]).includes(m.stage)) {
      const round = m.stage as KoRound
      byRound.get(round)!.set(m.winner, "won")
      byRound.get(round)!.set(loser, "lost")
    }
  }
  return { byRound, thirdPlace }
}

function weightedAverageElo(
  weights: Map<TeamCode, number>
): number {
  let wSum = 0
  let eloSum = 0
  for (const [team, w] of weights) {
    if (w <= 0) continue
    wSum += w
    eloSum += w * getElo(team)
  }
  return wSum > 0 ? eloSum / wSum : 1500
}

export function projectKnockouts(
  input: KoProjectionInput
): Map<TeamCode, KoTeamProjection> {
  const known = buildKnownKoOutcomes(input.matches ?? [])
  const out = new Map<TeamCode, KoTeamProjection>()
  // Init: P(reach R32) given
  const reachByRound: Record<KoRound, Map<TeamCode, number>> = {
    R32: new Map(input.pReachR32),
    R16: new Map(),
    QF: new Map(),
    SF: new Map(),
    FINAL: new Map(),
  }
  const pWinByRound: Record<KoRound, Map<TeamCode, number>> = {
    R32: new Map(),
    R16: new Map(),
    QF: new Map(),
    SF: new Map(),
    FINAL: new Map(),
  }

  const orderedRounds: KoRound[] = ["R32", "R16", "QF", "SF", "FINAL"]
  for (let i = 0; i < orderedRounds.length; i++) {
    const round = orderedRounds[i]
    const teamsThisRound = reachByRound[round]
    const roundKnown = known.byRound.get(round)!
    // Lock pReach = 1 for any team known to have played this round — they
    // were definitely there regardless of what the cascade said.
    for (const team of roundKnown.keys()) {
      teamsThisRound.set(team, 1)
    }
    const avgElo = weightedAverageElo(teamsThisRound)
    for (const [team, pReach] of teamsThisRound) {
      const outcome = roundKnown.get(team)
      const pWin =
        outcome === "won"
          ? 1
          : outcome === "lost"
            ? 0
            : eloWinProb(getElo(team), avgElo)
      pWinByRound[round].set(team, pWin)
      if (i + 1 < orderedRounds.length) {
        const next = orderedRounds[i + 1]
        reachByRound[next].set(team, pReach * pWin)
      }
    }
  }

  // P(third-place match) = P(reach SF) × P(lose SF), then locked to 1 for any
  // team whose third-place match is already finished.
  const pThirdMap = new Map<TeamCode, number>()
  for (const [team, pReachSF] of reachByRound.SF) {
    const pWinSF = pWinByRound.SF.get(team) ?? 0
    pThirdMap.set(team, pReachSF * (1 - pWinSF))
  }
  for (const team of known.thirdPlace.keys()) {
    pThirdMap.set(team, 1)
  }
  const avgThirdElo = weightedAverageElo(pThirdMap)
  const pWinThirdMap = new Map<TeamCode, number>()
  for (const [team] of pThirdMap) {
    const outcome = known.thirdPlace.get(team)
    const pWin =
      outcome === "won"
        ? 1
        : outcome === "lost"
          ? 0
          : eloWinProb(getElo(team), avgThirdElo)
    pWinThirdMap.set(team, pWin)
  }

  // Assemble per-team projection
  const allTeams = new Set<TeamCode>(input.pReachR32.keys())
  for (const team of allTeams) {
    const knownRounds = new Set<KoRound>()
    for (const r of KO_ROUNDS) {
      if (known.byRound.get(r)!.has(team)) knownRounds.add(r)
    }
    out.set(team, {
      pReach: {
        R32: reachByRound.R32.get(team) ?? 0,
        R16: reachByRound.R16.get(team) ?? 0,
        QF: reachByRound.QF.get(team) ?? 0,
        SF: reachByRound.SF.get(team) ?? 0,
        FINAL: reachByRound.FINAL.get(team) ?? 0,
      },
      pThirdPlace: pThirdMap.get(team) ?? 0,
      pWinGiven: {
        R32: pWinByRound.R32.get(team) ?? 0,
        R16: pWinByRound.R16.get(team) ?? 0,
        QF: pWinByRound.QF.get(team) ?? 0,
        SF: pWinByRound.SF.get(team) ?? 0,
        FINAL: pWinByRound.FINAL.get(team) ?? 0,
      },
      pWinThirdGiven: pWinThirdMap.get(team) ?? 0,
      knownRounds,
      knownThirdPlace: known.thirdPlace.has(team),
    })
  }
  return out
}

/**
 * xPts contribution from KO rounds for a team. Future-only — rounds the team
 * has already played (knownRounds / knownThirdPlace) are skipped because their
 * actual points are already in the team's banked total.
 *
 * Per future round: 3 · P(win) + 0.15 · P(loss). The 0.15 reflects the
 * empirical share of KO losses that go to ET or pens (which score 1pt under
 * our rules). Weighted by P(reach round).
 */
export function koExpectedPoints(p: KoTeamProjection): number {
  let total = 0
  for (const round of KO_ROUNDS) {
    if (p.knownRounds.has(round)) continue
    const pReach = p.pReach[round]
    const pWin = p.pWinGiven[round]
    const pLoss = 1 - pWin
    total += pReach * (3 * pWin + 0.15 * pLoss)
  }
  if (!p.knownThirdPlace) {
    total += p.pThirdPlace * (3 * p.pWinThirdGiven + 0.15 * (1 - p.pWinThirdGiven))
  }
  return total
}
