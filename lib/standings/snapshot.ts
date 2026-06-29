import { getKv } from "@/lib/kv/client"
import { KV_KEYS, HISTORY_CAP } from "@/lib/kv/keys"
import type {
  HistoryEntry,
  HistoryRow,
  Match,
  StandingsSnapshot,
} from "@/lib/scoring/types"

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

export async function readHistory(): Promise<HistoryEntry[]> {
  // Tolerant of the pre-slim shape: pre-2026-06-29 snapshots stored full
  // StandingsRow[] with PointEvents per team, which ballooned past the KV
  // request-size limit. Old entries still satisfy { memberId, rank } so this
  // reader keeps working through the cutover; the next maybeAppendHistory
  // write overwrites the blob with the slim shape and the migration is done.
  let raw: unknown
  try {
    raw = await getKv().get<unknown>(KV_KEYS.standingsHistory)
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  const out: HistoryEntry[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as { computedAt?: unknown; rows?: unknown }
    if (typeof e.computedAt !== "string" || !Array.isArray(e.rows)) continue
    const rows: HistoryRow[] = []
    for (const r of e.rows) {
      if (!r || typeof r !== "object") continue
      const row = r as { memberId?: unknown; rank?: unknown }
      if (typeof row.memberId === "string" && typeof row.rank === "number") {
        rows.push({ memberId: row.memberId, rank: row.rank })
      }
    }
    out.push({ computedAt: e.computedAt, rows })
  }
  return out
}

/**
 * Append a slim snapshot to history if no row has a live match. Caps at
 * HISTORY_CAP entries (FIFO). Returns whether a snapshot was actually written.
 */
export async function maybeAppendHistory(
  snap: StandingsSnapshot
): Promise<boolean> {
  const anyLive = snap.rows.some((r) => r.hasLiveMatch)
  if (anyLive) return false
  const history = await readHistory()
  const slim: HistoryEntry = {
    computedAt: snap.computedAt,
    rows: snap.rows.map((r) => ({ memberId: r.memberId, rank: r.rank })),
  }
  const next = [...history, slim].slice(-HISTORY_CAP)
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
