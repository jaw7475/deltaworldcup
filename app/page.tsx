import { readCurrentStandings, readSyncStatus } from "@/lib/standings/snapshot"
import { isInWindow, nextKickoff } from "@/lib/windows/windows"
import { SCHEDULE } from "@/lib/config/schedule"
import { Leaderboard } from "@/components/Leaderboard"
import { NextKickoffBanner } from "@/components/NextKickoffBanner"
import { StaleBadge } from "@/components/StaleBadge"

export const dynamic = "force-dynamic"

export default async function Home() {
  const now = new Date()
  const [snapshot, sync] = await Promise.all([
    readCurrentStandings(),
    readSyncStatus(),
  ])
  const inWindow = isInWindow(now, SCHEDULE)
  const next = nextKickoff(now, SCHEDULE)

  return (
    <main className="relative z-10 mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <div className="text-xs uppercase tracking-[0.4em] text-white/40 font-display">
          2026 Delta Fantasy Football League
        </div>
        <h1 className="mt-3 font-display text-5xl md:text-6xl neon-text-cyan tracking-widest uppercase">
          Delta World Cup
        </h1>
        <p className="mt-3 text-white/60 max-w-2xl">
          Live draft-order leaderboard. Most points wins the #1 overall pick.
          Tiebreaker: total goals scored (extra-time goals count, shootout goals
          don&apos;t). The
          <span className="mx-1 inline-block size-2 rounded-full bg-neon-live shadow-neon-live align-middle" />
          dot means a member has a live match factoring into their points.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <NextKickoffBanner
            nextKickoff={next?.utcKickoff ?? null}
            inWindow={inWindow}
          />
          <StaleBadge lastSuccessAt={sync.lastSuccessAt} />
        </div>
      </header>

      <Leaderboard initialSnapshot={snapshot} initialInWindow={inWindow} />
    </main>
  )
}
