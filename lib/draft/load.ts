import { readCurrentStandings } from "@/lib/standings/snapshot"
import { getKv } from "@/lib/kv/client"
import {
  getRosters,
  getTradedPicks,
  type SleeperTradedPick,
} from "@/lib/providers/sleeper"
import {
  SLEEPER_LEAGUE_ID,
  DRAFT_SEASON,
} from "@/lib/config/sleeper"
import { MEMBERS } from "@/lib/config/members"
import { getSlotOrder } from "@/lib/draft/slots"
import { computeDraftBoard, type DraftCell } from "@/lib/draft/picks"

const SLEEPER_TTL_MS = 5 * 60 * 1000
const KV_KEY_TRADED = "sleeper:traded_picks"
const KV_KEY_ROSTER_MAP = "sleeper:roster_map"
const KV_KEY_FETCHED_AT = "sleeper:fetched_at"

export type SleeperStatus = "ok" | "stale" | "unavailable"

export interface DraftBoardData {
  slotOrder: string[]
  cells: DraftCell[]
  hasLiveMatch: boolean
  computedAt: string | null
  sleeperStatus: SleeperStatus
  sleeperFetchedAt: string | null
  sleeperError: string | null
  tradedPicksCount: number
}

interface SleeperLoadResult {
  rosterMap: Map<number, string> | undefined
  tradedPicks: SleeperTradedPick[]
  status: SleeperStatus
  fetchedAt: string | null
  error?: string
}

async function loadSleeperData(): Promise<SleeperLoadResult> {
  const kv = getKv()
  const cachedAt = await kv.get<string>(KV_KEY_FETCHED_AT)
  const cachedFresh =
    !!cachedAt &&
    Date.now() - new Date(cachedAt).getTime() < SLEEPER_TTL_MS

  if (cachedFresh) {
    const [tradedPicks, rosterMapObj] = await Promise.all([
      kv.get<SleeperTradedPick[]>(KV_KEY_TRADED),
      kv.get<Record<string, string>>(KV_KEY_ROSTER_MAP),
    ])
    if (tradedPicks && rosterMapObj) {
      return {
        rosterMap: objToRosterMap(rosterMapObj),
        tradedPicks,
        status: "ok",
        fetchedAt: cachedAt,
      }
    }
  }

  if (SLEEPER_LEAGUE_ID === "REPLACE_WITH_SLEEPER_LEAGUE_ID") {
    return {
      rosterMap: undefined,
      tradedPicks: [],
      status: "unavailable",
      fetchedAt: null,
      error: "Sleeper league ID not configured",
    }
  }

  try {
    const [rosters, tradedPicks] = await Promise.all([
      getRosters(SLEEPER_LEAGUE_ID),
      getTradedPicks(SLEEPER_LEAGUE_ID),
    ])

    const userIdToMemberId = new Map<string, string>()
    for (const m of MEMBERS) {
      if (m.sleeperUserId) userIdToMemberId.set(m.sleeperUserId, m.id)
    }

    const rosterMap = new Map<number, string>()
    const rosterMapObj: Record<string, string> = {}
    for (const r of rosters) {
      if (r.owner_id == null) continue
      const memberId = userIdToMemberId.get(r.owner_id)
      if (!memberId) continue
      rosterMap.set(r.roster_id, memberId)
      rosterMapObj[r.roster_id.toString()] = memberId
    }

    const now = new Date().toISOString()
    await Promise.all([
      kv.set(KV_KEY_TRADED, tradedPicks),
      kv.set(KV_KEY_ROSTER_MAP, rosterMapObj),
      kv.set(KV_KEY_FETCHED_AT, now),
    ])

    return { rosterMap, tradedPicks, status: "ok", fetchedAt: now }
  } catch (err) {
    const [tradedPicks, rosterMapObj] = await Promise.all([
      kv.get<SleeperTradedPick[]>(KV_KEY_TRADED),
      kv.get<Record<string, string>>(KV_KEY_ROSTER_MAP),
    ])
    if (tradedPicks && rosterMapObj) {
      return {
        rosterMap: objToRosterMap(rosterMapObj),
        tradedPicks,
        status: "stale",
        fetchedAt: cachedAt ?? null,
        error: err instanceof Error ? err.message : String(err),
      }
    }
    return {
      rosterMap: undefined,
      tradedPicks: [],
      status: "unavailable",
      fetchedAt: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function objToRosterMap(obj: Record<string, string>): Map<number, string> {
  const m = new Map<number, string>()
  for (const [k, v] of Object.entries(obj)) m.set(Number(k), v)
  return m
}

export async function loadDraftBoardData(): Promise<DraftBoardData> {
  const snapshot = await readCurrentStandings()
  const slotOrder = getSlotOrder(snapshot)
  const sleeper = await loadSleeperData()

  const cells = computeDraftBoard({
    slotOrder,
    rosterToMember: sleeper.rosterMap,
    tradedPicks: sleeper.tradedPicks,
    season: DRAFT_SEASON,
  })

  return {
    slotOrder,
    cells,
    hasLiveMatch: snapshot?.rows.some((r) => r.hasLiveMatch) ?? false,
    computedAt: snapshot?.computedAt ?? null,
    sleeperStatus: sleeper.status,
    sleeperFetchedAt: sleeper.fetchedAt,
    sleeperError: sleeper.error ?? null,
    tradedPicksCount: sleeper.tradedPicks.filter(
      (tp) => tp.season === DRAFT_SEASON
    ).length,
  }
}
