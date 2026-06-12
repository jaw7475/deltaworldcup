import { NextResponse } from "next/server"
import { readCurrentPowerRankings } from "@/lib/powerRankings/store"

export const dynamic = "force-dynamic"

export async function GET() {
  const snapshot = await readCurrentPowerRankings()
  if (!snapshot) {
    return NextResponse.json({ snapshot: null }, { status: 200 })
  }
  return NextResponse.json({ snapshot })
}
