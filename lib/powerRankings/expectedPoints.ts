import type { Match, TeamCode } from "@/lib/scoring/types"
import { MEMBERS } from "@/lib/config/members"
import { getElo, eloThreeWay } from "@/lib/config/elo"
import { simulateGroupStage } from "./montecarlo"
import { projectKnockouts, koExpectedPoints } from "./koProjection"

/**
 * Full-tournament expected points per member.
 *
 *   banked          — points already earned from finished matches
 *   remainingGroup  — Σ over team's remaining GROUP matches of (3·P(W)+1·P(D))
 *                     using Elo-derived 3-way probabilities
 *   ko              — analytical KO projection: cascades P(reach round R)
 *                     starting from group-stage Monte Carlo P(reach R32)
 *
 *   expectedPoints  — sum of the three
 */
export interface MemberXPts {
  memberId: string
  bankedPoints: number
  remainingGroupXPts: number
  koXPts: number
  expectedPoints: number
  perTeam: TeamXPts[]
}

export interface TeamXPts {
  team: TeamCode
  bankedPoints: number
  remainingGroupXPts: number
  pReachR32: number
  pReachR16: number
  pReachQF: number
  pReachSF: number
  pReachFinal: number
  koXPts: number
  total: number
}

export interface BankedByMember {
  [memberId: string]: number
}

export interface BankedByTeam {
  [team: string]: number
}

function remainingGroupXPtsForTeam(team: TeamCode, matches: Match[]): number {
  let total = 0
  for (const m of matches) {
    if (m.stage !== "GROUP") continue
    if (m.status === "FINISHED") continue
    if (m.home !== team && m.away !== team) continue
    const eloH = getElo(m.home)
    const eloA = getElo(m.away)
    const { pHomeWin, pDraw, pAwayWin } = eloThreeWay(eloH, eloA)
    const pTeamWin = m.home === team ? pHomeWin : pAwayWin
    total += 3 * pTeamWin + 1 * pDraw
  }
  return total
}

export function computeMemberXPts(args: {
  matches: Match[]
  bankedByMember: BankedByMember
  bankedByTeam: BankedByTeam
  trials?: number
}): MemberXPts[] {
  const groupSim = simulateGroupStage(args.matches, args.trials ?? 10_000)
  const koProj = projectKnockouts({ pReachR32: groupSim.pAdvance })

  const out: MemberXPts[] = []
  for (const member of MEMBERS) {
    const perTeam: TeamXPts[] = []
    let memberBanked = args.bankedByMember[member.id] ?? 0
    let memberGroupX = 0
    let memberKoX = 0

    for (const team of member.teams) {
      const banked = args.bankedByTeam[team] ?? 0
      const groupX = remainingGroupXPtsForTeam(team, args.matches)
      const koP = koProj.get(team)
      const koX = koP ? koExpectedPoints(koP) : 0
      perTeam.push({
        team,
        bankedPoints: banked,
        remainingGroupXPts: groupX,
        pReachR32: koP?.pReach.R32 ?? 0,
        pReachR16: koP?.pReach.R16 ?? 0,
        pReachQF: koP?.pReach.QF ?? 0,
        pReachSF: koP?.pReach.SF ?? 0,
        pReachFinal: koP?.pReach.FINAL ?? 0,
        koXPts: koX,
        total: banked + groupX + koX,
      })
      memberGroupX += groupX
      memberKoX += koX
    }

    out.push({
      memberId: member.id,
      bankedPoints: memberBanked,
      remainingGroupXPts: memberGroupX,
      koXPts: memberKoX,
      expectedPoints: memberBanked + memberGroupX + memberKoX,
      perTeam,
    })
  }
  return out
}

export function rankByXPts(
  xpts: MemberXPts[]
): { memberId: string; rank: number; expectedPoints: number }[] {
  const sorted = [...xpts].sort((a, b) => b.expectedPoints - a.expectedPoints)
  return sorted.map((m, i) => ({
    memberId: m.memberId,
    rank: i + 1,
    expectedPoints: m.expectedPoints,
  }))
}
