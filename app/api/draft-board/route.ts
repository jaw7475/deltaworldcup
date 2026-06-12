import { NextResponse } from "next/server"
import { loadDraftBoardData } from "@/lib/draft/load"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = await loadDraftBoardData()
  return NextResponse.json(data)
}
