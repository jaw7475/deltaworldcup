import { NextResponse } from "next/server"
import { readGoalsByMatch } from "@/lib/standings/goals"
import { readMatches } from "@/lib/standings/snapshot"
import { getProvider } from "@/lib/providers"

export const dynamic = "force-dynamic"

// Temporary diagnostic — surfaces the goal store + a raw provider fetch for the
// first FINISHED match so we can see exactly what football-data is returning.
// Remove once top scorers are verified working.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const probe = url.searchParams.get("probe") === "1"

  const [goalsByMatch, matches] = await Promise.all([
    readGoalsByMatch(),
    readMatches(),
  ])
  const matchCount = matches?.length ?? 0
  const finished = (matches ?? []).filter((m) => m.status === "FINISHED")
  const storedMatchIds = Object.keys(goalsByMatch)
  const sampleStored = storedMatchIds.slice(0, 3).map((id) => ({
    matchId: id,
    goalsCount: goalsByMatch[id].length,
    goals: goalsByMatch[id].slice(0, 5),
  }))

  let probeResult: unknown = null
  if (probe && finished.length > 0) {
    const match = finished[0]
    try {
      const detail = await getProvider().fetchMatchDetail(match.id)
      probeResult = {
        matchId: match.id,
        teams: `${match.home} vs ${match.away}`,
        detail,
      }
    } catch (err) {
      probeResult = {
        matchId: match.id,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  return NextResponse.json({
    matchCount,
    finishedCount: finished.length,
    finishedIds: finished.map((m) => m.id),
    storedCount: storedMatchIds.length,
    sampleStored,
    probeResult,
  })
}
