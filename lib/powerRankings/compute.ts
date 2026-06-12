import { readMatches, readCurrentStandings } from "@/lib/standings/snapshot"
import { getOddsProvider } from "@/lib/providers/odds"
import { computeMemberXPts, rankByXPts } from "./expectedPoints"
import { buildResultsSinceLast } from "./resultsSinceLast"
import {
  getBlurbWriter,
  buildBlurbInputs,
  type BlurbInput,
} from "./blurb"
import { readCurrentPowerRankings, writePowerRankings } from "./store"
import type { PowerRanking, PowerRankingsSnapshot } from "./types"

export interface ComputeResult {
  snapshot: PowerRankingsSnapshot
  diagnostics: {
    matchesCount: number
    oddsCount: number
    pricedMatches: number
    blurbsWritten: number
  }
}

export async function computePowerRankings(now: Date): Promise<ComputeResult> {
  const matches = (await readMatches()) ?? []
  const standings = await readCurrentStandings()
  const bankedByMember: Record<string, number> = {}
  if (standings) {
    for (const row of standings.rows) {
      bankedByMember[row.memberId] = row.points
    }
  }

  const oddsProvider = getOddsProvider()
  const probs = await oddsProvider.fetchMatchProbabilities()

  const memberXPts = computeMemberXPts({ matches, probs, bankedByMember })
  const ranked = rankByXPts(memberXPts)
  const rankingsMap = new Map(ranked.map((r) => [r.memberId, r.rank]))

  const prevSnapshot = await readCurrentPowerRankings()
  const prevRankingsMap = prevSnapshot
    ? new Map(prevSnapshot.rankings.map((r) => [r.memberId, r.rank]))
    : null

  const results = buildResultsSinceLast({
    matches,
    since: prevSnapshot?.computedAt ?? null,
  })
  const resultsByMember = new Map(results.map((r) => [r.memberId, r]))

  const blurbInputs: BlurbInput[] = buildBlurbInputs({
    memberXPts,
    rankings: rankingsMap,
    previousRankings: prevRankingsMap,
    resultsByMember,
  })

  const blurbWriter = getBlurbWriter()
  let blurbs: Map<string, string>
  try {
    blurbs = await blurbWriter.writeBlurbs(blurbInputs)
  } catch (err) {
    // Don't fail the whole refresh just because the LLM call broke — preserve
    // last-known blurbs if we have them.
    console.error("[power-rankings] blurb writer failed:", err)
    blurbs = new Map(
      prevSnapshot?.rankings.map((r) => [r.memberId, r.blurb]) ?? []
    )
  }

  const rankings: PowerRanking[] = blurbInputs
    .map((input) => ({
      memberId: input.memberId,
      rank: input.rank,
      expectedPoints: round1(input.expectedPoints),
      delta: input.delta,
      blurb: blurbs.get(input.memberId) ?? "",
      resultsSinceLast: input.resultsSinceLast,
    }))
    .sort((a, b) => a.rank - b.rank)

  const snapshot: PowerRankingsSnapshot = {
    computedAt: now.toISOString(),
    rankings,
  }
  await writePowerRankings(snapshot)

  const pricedMatches = memberXPts.reduce(
    (sum, m) => sum + m.perTeam.reduce((s, t) => s + t.matchesPriced, 0),
    0
  )
  return {
    snapshot,
    diagnostics: {
      matchesCount: matches.length,
      oddsCount: probs.length,
      pricedMatches,
      blurbsWritten: blurbs.size,
    },
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
