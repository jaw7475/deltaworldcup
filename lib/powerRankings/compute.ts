import { readMatches, readCurrentStandings } from "@/lib/standings/snapshot"
import {
  computeMemberXPts,
  rankByXPts,
  type BankedByMember,
  type BankedByTeam,
} from "./expectedPoints"
import { buildResultsSinceLast } from "./resultsSinceLast"
import {
  getBlurbWriter,
  buildBlurbInputs,
  type BlurbInput,
} from "./blurb"
import { collectBoxScores } from "./boxScores"
import { readCurrentPowerRankings, writePowerRankings } from "./store"
import type { PowerRanking, PowerRankingsSnapshot } from "./types"

export interface ComputeResult {
  snapshot: PowerRankingsSnapshot
  diagnostics: {
    matchesCount: number
    blurbsWritten: number
    boxScoresFetched: number
    trials: number
  }
}

export async function computePowerRankings(now: Date): Promise<ComputeResult> {
  const matches = (await readMatches()) ?? []
  const standings = await readCurrentStandings()

  const bankedByMember: BankedByMember = {}
  const bankedByTeam: BankedByTeam = {}
  if (standings) {
    for (const row of standings.rows) {
      bankedByMember[row.memberId] = row.points
      for (const tr of row.teamRecords) {
        const teamPts = tr.events.reduce((s, e) => s + e.points, 0)
        bankedByTeam[tr.team] = teamPts
      }
    }
  }

  const trials = 10_000
  const memberXPts = computeMemberXPts({
    matches,
    bankedByMember,
    bankedByTeam,
    trials,
  })
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

  let boxScores: Awaited<ReturnType<typeof collectBoxScores>> = []
  try {
    boxScores = await collectBoxScores({
      matches,
      since: prevSnapshot?.computedAt ?? null,
    })
  } catch (err) {
    console.warn(
      "[power-rankings] box-score collection failed (continuing without):",
      err instanceof Error ? err.message : err
    )
  }

  const blurbInputs: BlurbInput[] = buildBlurbInputs({
    memberXPts,
    rankings: rankingsMap,
    previousRankings: prevRankingsMap,
    resultsByMember,
    boxScores,
  })

  const blurbWriter = getBlurbWriter()
  let blurbs: Map<string, string>
  try {
    blurbs = await blurbWriter.writeBlurbs(blurbInputs)
  } catch (err) {
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

  return {
    snapshot,
    diagnostics: {
      matchesCount: matches.length,
      blurbsWritten: blurbs.size,
      boxScoresFetched: boxScores.length,
      trials,
    },
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
