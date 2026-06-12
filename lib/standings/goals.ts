import { getKv } from "@/lib/kv/client"
import { KV_KEYS } from "@/lib/kv/keys"
import { getProvider } from "@/lib/providers"
import type { ScorerEntry } from "@/lib/providers/types"
import type { TeamCode } from "@/lib/scoring/types"

export type TopScorers = ScorerEntry[]

export async function readTopScorers(): Promise<TopScorers> {
  return (await getKv().get<TopScorers>(KV_KEYS.topScorers)) ?? []
}

export async function writeTopScorers(data: TopScorers): Promise<void> {
  await getKv().set(KV_KEYS.topScorers, data)
}

/**
 * Refresh the cached tournament top-scorer list from the provider. The
 * football-data free tier exposes this at /competitions/WC/scorers — there's
 * no per-match goal feed at this tier, so this single call is the only source
 * of scorer-level data.
 */
export async function refreshTopScorers(): Promise<TopScorers> {
  const scorers = await getProvider().fetchTopScorers()
  await writeTopScorers(scorers)
  return scorers
}

export interface TopScorerRow {
  name: string
  team: TeamCode
  goals: number
}

export function aggregateTopScorers(
  scorers: TopScorers,
  teams: readonly TeamCode[]
): TopScorerRow[] {
  const teamSet = new Set(teams)
  return scorers
    .filter((s) => teamSet.has(s.team))
    .filter((s) => s.goals > 0)
    .map((s) => ({ name: s.name, team: s.team, goals: s.goals }))
}
