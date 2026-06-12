import Link from "next/link"
import { notFound } from "next/navigation"
import { buildMemberDetail } from "@/lib/standings/member"
import { readMatches, readHistory } from "@/lib/standings/snapshot"
import { readTopScorers } from "@/lib/standings/goals"
import { MemberDetailView } from "@/components/MemberDetail"

export const dynamic = "force-dynamic"

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [matches, history, scorers] = await Promise.all([
    readMatches(),
    readHistory(),
    readTopScorers(),
  ])
  const detail = buildMemberDetail(id, matches ?? [], history, scorers)
  if (!detail) notFound()

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-neon-cyan/80 hover:text-neon-cyan"
        >
          ← Back to leaderboard
        </Link>
      </div>
      <MemberDetailView detail={detail} />
    </main>
  )
}
