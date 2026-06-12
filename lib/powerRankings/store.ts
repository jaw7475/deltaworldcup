import { getKv } from "@/lib/kv/client"
import { KV_KEYS } from "@/lib/kv/keys"
import type { PowerRankingsSnapshot } from "./types"

export async function readCurrentPowerRankings(): Promise<PowerRankingsSnapshot | null> {
  return getKv().get<PowerRankingsSnapshot>(KV_KEYS.powerRankingsCurrent)
}

export async function readPreviousPowerRankings(): Promise<PowerRankingsSnapshot | null> {
  return getKv().get<PowerRankingsSnapshot>(KV_KEYS.powerRankingsPrevious)
}

export async function writePowerRankings(snap: PowerRankingsSnapshot): Promise<void> {
  const kv = getKv()
  const prev = await kv.get<PowerRankingsSnapshot>(KV_KEYS.powerRankingsCurrent)
  if (prev) {
    await kv.set(KV_KEYS.powerRankingsPrevious, prev)
  }
  await kv.set(KV_KEYS.powerRankingsCurrent, snap)
}
