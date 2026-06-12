import type { Match, TeamCode } from "@/lib/scoring/types"
import type { MatchProbabilities } from "./types"
import { MEMBERS } from "@/lib/config/members"

/**
 * Expected-points breakdown per member. We pair every UNFINISHED match in
 * the schedule with an Odds API probability set, then sum:
 *   - 3 · P(team wins) + 1 · P(draw)              for GROUP
 *   - 3 · P(team wins) + 0.15 · P(team loses)     for KO  (the 0.15 is a
 *     rough probability that a loss happens in ET or pens, worth 1 KO point)
 *
 * Banked points come from completed matches and are computed elsewhere (the
 * standings engine). We just add `bankedPoints` for the final total.
 *
 * Matches without odds (typical for KO rounds whose teams aren't known yet)
 * are skipped — xPts is conservative and will rise as more odds appear.
 */
export interface MemberXPts {
  memberId: string
  bankedPoints: number
  remainingXPts: number
  expectedPoints: number
  /** Per-team breakdown for debugging / blurb context. */
  perTeam: {
    team: TeamCode
    matchesPriced: number
    matchesUnpriced: number
    xPtsRemaining: number
  }[]
}

function makeProbsKey(home: TeamCode, away: TeamCode): string {
  return `${home}__${away}`
}

function buildProbsIndex(probs: MatchProbabilities[]): Map<string, MatchProbabilities> {
  // Index by both orderings so we can look up regardless of home/away.
  const map = new Map<string, MatchProbabilities>()
  for (const p of probs) {
    map.set(makeProbsKey(p.homeTeam, p.awayTeam), p)
    map.set(makeProbsKey(p.awayTeam, p.homeTeam), p)
  }
  return map
}

function matchXPtsForTeam(
  match: Match,
  team: TeamCode,
  probs: MatchProbabilities
): number {
  const isHome = match.home === team
  const teamIsProbHome = probs.homeTeam === team
  const pTeamWins = teamIsProbHome ? probs.pHome : probs.pAway
  const pTeamLoses = teamIsProbHome ? probs.pAway : probs.pHome
  const pDraw = probs.pDraw

  if (match.stage === "GROUP") {
    return 3 * pTeamWins + 1 * pDraw
  }
  // KO: any win 3pts; ET/pens loss ~1pt (estimate ~15% of losses go past 90)
  return 3 * pTeamWins + 0.15 * pTeamLoses
  // (isHome unused; left for future home-advantage tweaks)
  void isHome
}

export interface BankedByMember {
  [memberId: string]: number
}

export function computeMemberXPts(args: {
  matches: Match[]
  probs: MatchProbabilities[]
  bankedByMember: BankedByMember
}): MemberXPts[] {
  const probsIndex = buildProbsIndex(args.probs)
  const out: MemberXPts[] = []

  for (const member of MEMBERS) {
    const banked = args.bankedByMember[member.id] ?? 0
    let remainingTotal = 0
    const perTeam: MemberXPts["perTeam"] = []

    for (const team of member.teams) {
      let priced = 0
      let unpriced = 0
      let xPts = 0
      for (const match of args.matches) {
        if (match.status === "FINISHED") continue
        if (match.home !== team && match.away !== team) continue
        const p = probsIndex.get(makeProbsKey(match.home, match.away))
        if (!p) {
          unpriced++
          continue
        }
        priced++
        xPts += matchXPtsForTeam(match, team, p)
      }
      perTeam.push({ team, matchesPriced: priced, matchesUnpriced: unpriced, xPtsRemaining: xPts })
      remainingTotal += xPts
    }

    out.push({
      memberId: member.id,
      bankedPoints: banked,
      remainingXPts: remainingTotal,
      expectedPoints: banked + remainingTotal,
      perTeam,
    })
  }

  return out
}

export function rankByXPts(xpts: MemberXPts[]): { memberId: string; rank: number; expectedPoints: number }[] {
  const sorted = [...xpts].sort((a, b) => b.expectedPoints - a.expectedPoints)
  return sorted.map((m, i) => ({
    memberId: m.memberId,
    rank: i + 1,
    expectedPoints: m.expectedPoints,
  }))
}
