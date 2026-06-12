import { NextResponse } from "next/server"
import { computePowerRankings } from "@/lib/powerRankings/compute"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET
  if (expected) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }
  }

  const now = new Date()
  try {
    const { snapshot, diagnostics } = await computePowerRankings(now)
    return NextResponse.json({
      ok: true,
      computedAt: snapshot.computedAt,
      ...diagnostics,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[power-rankings cron] failed:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
