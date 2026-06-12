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
import { ensureBoxScores } from "@/lib/standings/goals"

const HOURLY_OUTSIDE_WINDOW_MS = 60 * 60 * 1000

export async function GET(request: Request) {
  // Auth optional so local dev (no CRON_SECRET in env) can still hit this endpoint.
  const expected = process.env.CRON_SECRET
  if (expected) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }
  }

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

    // Box-score (goalscorer) backfill — isolated from the main sync so a
    // detail-endpoint hiccup never blocks standings.
    let goalsTracked: number | null = null
    try {
      const goals = await ensureBoxScores(matches)
      goalsTracked = Object.keys(goals).length
    } catch (err) {
      console.warn(
        "[cron] box-score backfill failed (continuing):",
        err instanceof Error ? err.message : err
      )
    }

    await recordSyncSuccess(now)

    return NextResponse.json({
      ok: true,
      computedAt: snap.computedAt,
      inWindow,
      matchesCount: matches.length,
      historyAppended: appended,
      anyLive: snap.rows.some((r) => r.hasLiveMatch),
      goalsTracked,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await recordSyncError(message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
