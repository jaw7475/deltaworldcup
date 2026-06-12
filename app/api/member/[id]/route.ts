import { NextResponse } from "next/server"
import { buildMemberDetail } from "@/lib/standings/member"
import { readMatches, readHistory } from "@/lib/standings/snapshot"
import { readGoalsByMatch } from "@/lib/standings/goals"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const [matches, history, goals] = await Promise.all([
    readMatches(),
    readHistory(),
    readGoalsByMatch(),
  ])
  const detail = buildMemberDetail(id, matches ?? [], history, goals)
  if (!detail) {
    return NextResponse.json({ error: "Unknown member" }, { status: 404 })
  }
  return NextResponse.json(detail)
}
