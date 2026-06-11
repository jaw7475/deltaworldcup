import { NextResponse } from "next/server"
import { readCurrentStandings, readSyncStatus } from "@/lib/standings/snapshot"
import { isInWindow } from "@/lib/windows/windows"
import { SCHEDULE } from "@/lib/config/schedule"
import { nextKickoff } from "@/lib/windows/windows"

// Always serve fresh — KV reads are cheap, content changes during matches.
export const dynamic = "force-dynamic"

export async function GET() {
  const now = new Date()
  const [snap, sync] = await Promise.all([
    readCurrentStandings(),
    readSyncStatus(),
  ])
  const next = nextKickoff(now, SCHEDULE)
  return NextResponse.json({
    snapshot: snap,
    sync,
    inWindow: isInWindow(now, SCHEDULE),
    nextKickoff: next?.utcKickoff ?? null,
    now: now.toISOString(),
  })
}
