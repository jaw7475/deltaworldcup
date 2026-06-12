import type { Match, TeamCode } from "@/lib/scoring/types"
import type { GoalEvent, MatchDetail } from "@/lib/providers/types"
import { getProvider } from "@/lib/providers"

/**
 * Collects boxscore detail (goalscorers + minutes) for every match that
 * finished since the previous power-rankings snapshot. Designed to be cheap:
 * one HTTP call per match, hard-capped by MAX_FETCHES (so a backlog after a
 * long outage can't blow the football-data rate limit in one tick).
 */
const MAX_FETCHES = 20

export interface MatchBoxScore {
  matchId: string
  home: TeamCode
  away: TeamCode
  homeGoals: number
  awayGoals: number
  utcKickoff: string
  goals: GoalEvent[]
}

export async function collectBoxScores(args: {
  matches: Match[]
  since: string | null
}): Promise<MatchBoxScore[]> {
  const sinceMs = args.since ? new Date(args.since).getTime() : 0
  const candidates = args.matches
    .filter((m) => m.status === "FINISHED")
    .filter((m) => {
      // Approximate finish time as kickoff + 2h. Matches the resultsSinceLast cutoff.
      const finishedMs = new Date(m.utcKickoff).getTime() + 2 * 60 * 60 * 1000
      return sinceMs === 0 || finishedMs > sinceMs
    })
    .sort((a, b) => a.utcKickoff.localeCompare(b.utcKickoff))
    .slice(-MAX_FETCHES)

  if (candidates.length === 0) return []

  const provider = getProvider()
  const out: MatchBoxScore[] = []
  for (const match of candidates) {
    try {
      const detail: MatchDetail = await provider.fetchMatchDetail(match.id)
      const ft = match.fullTime ?? match.currentScore
      out.push({
        matchId: match.id,
        home: match.home,
        away: match.away,
        homeGoals: ft.home,
        awayGoals: ft.away,
        utcKickoff: match.utcKickoff,
        goals: detail.goals,
      })
    } catch (err) {
      // Don't let one failed fetch poison the batch — log and move on.
      console.warn(
        `[boxScores] fetch failed for match ${match.id}:`,
        err instanceof Error ? err.message : err
      )
    }
  }
  return out
}

export function formatBoxScore(b: MatchBoxScore): string {
  // "KOR 2-1 CZE — Son Heung-min 23' (pen), 67'; Schick 41'"
  const head = `${b.home} ${b.homeGoals}-${b.awayGoals} ${b.away}`
  if (b.goals.length === 0) return head
  const byScorer = new Map<string, { team: TeamCode; minutes: string[] }>()
  for (const g of b.goals) {
    const tags: string[] = [`${g.minute}'`]
    if (g.isPenalty) tags.push("pen")
    if (g.isOwnGoal) tags.push("OG")
    const tag = tags.length > 1 ? `${tags[0]} (${tags.slice(1).join(", ")})` : tags[0]
    const key = `${g.scorer}::${g.team}`
    if (!byScorer.has(key)) byScorer.set(key, { team: g.team, minutes: [] })
    byScorer.get(key)!.minutes.push(tag)
  }
  // Order goals by team (home first then away)
  const homeGoals: string[] = []
  const awayGoals: string[] = []
  for (const [key, info] of byScorer) {
    const [name] = key.split("::")
    const line = `${name} ${info.minutes.join(", ")}`
    if (info.team === b.home) homeGoals.push(line)
    else awayGoals.push(line)
  }
  const parts = [...homeGoals, ...awayGoals]
  return `${head} — ${parts.join("; ")}`
}
