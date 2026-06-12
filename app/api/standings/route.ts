import { NextResponse } from "next/server"
import {
  readCurrentStandings,
  readMatches,
  readSyncStatus,
} from "@/lib/standings/snapshot"
import {
  inWindowFromMatches,
  isInWindow,
  nextKickoff,
  nextKickoffFromMatches,
} from "@/lib/windows/windows"
import { SCHEDULE } from "@/lib/config/schedule"

// Always serve fresh — KV reads are cheap, content changes during matches.
export const dynamic = "force-dynamic"

export async function GET() {
  const now = new Date()
  const [snap, sync, matches] = await Promise.all([
    readCurrentStandings(),
    readSyncStatus(),
    readMatches(),
  ])
  // Prefer the live fixture list (real upstream data). Fall back to the
  // hardcoded SCHEDULE stub only when matches haven't been synced yet.
  const hasMatches = !!matches && matches.length > 0
  const next = hasMatches
    ? nextKickoffFromMatches(now, matches!)
    : nextKickoff(now, SCHEDULE)
  const inWindow = hasMatches
    ? inWindowFromMatches(now, matches!)
    : isInWindow(now, SCHEDULE)
  return NextResponse.json({
    snapshot: snap,
    sync,
    inWindow,
    nextKickoff: next?.utcKickoff ?? null,
    now: now.toISOString(),
  })
}
