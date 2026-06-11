import { getKv } from "@/lib/kv/client"
import { KV_KEYS, HISTORY_CAP } from "@/lib/kv/keys"
import type { Match, StandingsSnapshot } from "@/lib/scoring/types"

export async function readMatches(): Promise<Match[] | null> {
  return getKv().get<Match[]>(KV_KEYS.matchesAll)
}

export async function writeMatches(matches: Match[]): Promise<void> {
  await getKv().set(KV_KEYS.matchesAll, matches)
}

export async function readCurrentStandings(): Promise<StandingsSnapshot | null> {
  return getKv().get<StandingsSnapshot>(KV_KEYS.standingsCurrent)
}

export async function writeCurrentStandings(snap: StandingsSnapshot): Promise<void> {
  await getKv().set(KV_KEYS.standingsCurrent, snap)
}

export async function readHistory(): Promise<StandingsSnapshot[]> {
  return (await getKv().get<StandingsSnapshot[]>(KV_KEYS.standingsHistory)) ?? []
}

/**
 * Append a snapshot to history if no row has a live match. Caps at HISTORY_CAP
 * entries (FIFO). Returns whether a snapshot was actually written.
 */
export async function maybeAppendHistory(
  snap: StandingsSnapshot
): Promise<boolean> {
  const anyLive = snap.rows.some((r) => r.hasLiveMatch)
  if (anyLive) return false
  const history = await readHistory()
  const next = [...history, snap].slice(-HISTORY_CAP)
  await getKv().set(KV_KEYS.standingsHistory, next)
  return true
}

export async function recordSyncRun(now: Date): Promise<void> {
  await getKv().set(KV_KEYS.syncLastRunAt, now.toISOString())
}

export async function recordSyncSuccess(now: Date): Promise<void> {
  await getKv().set(KV_KEYS.syncLastSuccessAt, now.toISOString())
  await getKv().set(KV_KEYS.syncLastError, null)
}

export async function recordSyncError(message: string): Promise<void> {
  await getKv().set(KV_KEYS.syncLastError, message)
}

export async function readSyncStatus(): Promise<{
  lastRunAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
}> {
  const kv = getKv()
  const [lastRunAt, lastSuccessAt, lastError] = await Promise.all([
    kv.get<string>(KV_KEYS.syncLastRunAt),
    kv.get<string>(KV_KEYS.syncLastSuccessAt),
    kv.get<string>(KV_KEYS.syncLastError),
  ])
  return { lastRunAt, lastSuccessAt, lastError }
}
