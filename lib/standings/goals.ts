import { getKv } from "@/lib/kv/client"
import { KV_KEYS } from "@/lib/kv/keys"
import { getProvider } from "@/lib/providers"
import type { GoalEvent } from "@/lib/providers/types"
import type { Match, TeamCode } from "@/lib/scoring/types"

export type GoalsByMatch = Record<string, GoalEvent[]>

// Cap per-cron-run fetches so a cold-start backfill can't blow the
// football-data rate limit (10 req/min on the free tier).
const MAX_FETCHES_PER_RUN = 18

export async function readGoalsByMatch(): Promise<GoalsByMatch> {
  return (await getKv().get<GoalsByMatch>(KV_KEYS.goalsByMatch)) ?? {}
}

export async function writeGoalsByMatch(data: GoalsByMatch): Promise<void> {
  await getKv().set(KV_KEYS.goalsByMatch, data)
}

/**
 * Fetches box-score detail for every FINISHED match not already in the goals
 * store, up to MAX_FETCHES_PER_RUN. Backlogs drain over successive cron ticks.
 * Returns the merged store (whether or not anything new was written).
 */
export async function ensureBoxScores(matches: Match[]): Promise<GoalsByMatch> {
  const current = await readGoalsByMatch()
  const missing = matches
    .filter((m) => m.status === "FINISHED")
    .filter((m) => !(m.id in current))
    .sort((a, b) => a.utcKickoff.localeCompare(b.utcKickoff))
    .slice(0, MAX_FETCHES_PER_RUN)

  if (missing.length === 0) return current

  const provider = getProvider()
  const next: GoalsByMatch = { ...current }
  let wrote = false
  for (const m of missing) {
    try {
      const detail = await provider.fetchMatchDetail(m.id)
      next[m.id] = detail.goals
      wrote = true
    } catch (err) {
      console.warn(
        `[goals] fetch failed for match ${m.id}:`,
        err instanceof Error ? err.message : err
      )
    }
  }
  if (wrote) await writeGoalsByMatch(next)
  return next
}

export interface TopScorerRow {
  name: string
  team: TeamCode
  goals: number
}

/**
 * Aggregate goals across a set of teams. Own goals are excluded (they belong
 * to the opposing team's column on the scoreboard but aren't *their* striker's
 * goal). Penalties count.
 */
export function aggregateTopScorers(
  goalsByMatch: GoalsByMatch,
  teams: readonly TeamCode[]
): TopScorerRow[] {
  const teamSet = new Set(teams)
  const tally = new Map<string, TopScorerRow>()
  for (const goals of Object.values(goalsByMatch)) {
    for (const g of goals) {
      if (g.isOwnGoal) continue
      if (!teamSet.has(g.team)) continue
      if (!g.scorer || g.scorer === "(unknown)") continue
      const key = `${g.team}::${g.scorer}`
      const existing = tally.get(key)
      if (existing) {
        existing.goals += 1
      } else {
        tally.set(key, { name: g.scorer, team: g.team, goals: 1 })
      }
    }
  }
  return Array.from(tally.values()).sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals
    return a.name.localeCompare(b.name)
  })
}
