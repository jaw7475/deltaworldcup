import { NextResponse } from "next/server"
import { readTopScorers, refreshTopScorers } from "@/lib/standings/goals"

export const dynamic = "force-dynamic"

// Temporary diagnostic — surfaces the cached scorer list plus a forced refresh.
// Remove once top scorers are verified working in prod.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const refresh = url.searchParams.get("refresh") === "1"

  let refreshResult: { count: number } | { error: string } | null = null
  if (refresh) {
    try {
      const scorers = await refreshTopScorers()
      refreshResult = { count: scorers.length }
    } catch (err) {
      refreshResult = {
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  const cached = await readTopScorers()
  return NextResponse.json({
    cachedCount: cached.length,
    cachedSample: cached.slice(0, 10),
    refreshResult,
  })
}
