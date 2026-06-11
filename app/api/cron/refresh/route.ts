import { NextResponse } from "next/server"
import { getProvider } from "@/lib/providers"
import { SCHEDULE } from "@/lib/config/schedule"
import { isInWindow, isPacificActiveHours } from "@/lib/windows/windows"
import { buildSnapshot } from "@/lib/standings/compute"
import {
  readCurrentStandings,
  writeCurrentStandings,
  writeMatches,
  maybeAppendHistory,
  recordSyncRun,
  recordSyncSuccess,
  recordSyncError,
} from "@/lib/standings/snapshot"

const HOURLY_OUTSIDE_WINDOW_MS = 60 * 60 * 1000

export async function GET(request: Request) {
  const now = new Date()
  await recordSyncRun(now)

  const url = new URL(request.url)
  const force = url.searchParams.get("force") === "1"

  // 1. Pacific active hours gate — skip overnight unless forced.
  if (!force && !isPacificActiveHours(now)) {
    return NextResponse.json({
      ok: true,
      skipped: "outside-pacific-active-hours",
      now: now.toISOString(),
    })
  }

  // 2. If outside a match window, do a lightweight hourly sync to catch
  //    postponements / corrections.
  const inWindow = isInWindow(now, SCHEDULE)
  if (!force && !inWindow) {
    const current = await readCurrentStandings()
    if (current) {
      const ageMs = now.getTime() - new Date(current.computedAt).getTime()
      if (ageMs < HOURLY_OUTSIDE_WINDOW_MS) {
        return NextResponse.json({
          ok: true,
          skipped: "outside-window-recent-sync",
          ageMs,
          now: now.toISOString(),
        })
      }
    }
  }

  try {
    const provider = getProvider()
    const matches = await provider.fetchAllMatches()
    await writeMatches(matches)

    const prev = await readCurrentStandings()
    const snap = buildSnapshot(matches, prev ?? undefined, now)
    await writeCurrentStandings(snap)
    const appended = await maybeAppendHistory(snap)
    await recordSyncSuccess(now)

    return NextResponse.json({
      ok: true,
      computedAt: snap.computedAt,
      inWindow,
      matchesCount: matches.length,
      historyAppended: appended,
      anyLive: snap.rows.some((r) => r.hasLiveMatch),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await recordSyncError(message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
