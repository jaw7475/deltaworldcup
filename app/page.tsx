import { readCurrentStandings, readMatches, readSyncStatus } from "@/lib/standings/snapshot"
import { isInWindow, nextKickoff } from "@/lib/windows/windows"
import { SCHEDULE } from "@/lib/config/schedule"
import { MEMBERS } from "@/lib/config/members"
import { Leaderboard } from "@/components/Leaderboard"
import { NextKickoffBanner } from "@/components/NextKickoffBanner"
import { StaleBadge } from "@/components/StaleBadge"
import { RulesCard } from "@/components/RulesCard"
import { Tabs } from "@/components/Tabs"
import { LiveLegend } from "@/components/LiveLegend"
import { FixturesGrid } from "@/components/FixturesGrid"
import { PowerRankings } from "@/components/PowerRankings"

export const dynamic = "force-dynamic"

export default async function Home() {
  const now = new Date()
  const [snapshot, sync, matches] = await Promise.all([
    readCurrentStandings(),
    readSyncStatus(),
    readMatches(),
  ])
  const inWindow = isInWindow(now, SCHEDULE)
  const next = nextKickoff(now, SCHEDULE)

  return (
    <main className="relative z-10 mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.4em] text-white/40 font-display">
          2026 Delta Fantasy Football League
        </div>
        <h1 className="mt-3 font-display text-5xl md:text-6xl neon-text-cyan tracking-widest uppercase">
          Delta World Cup
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <NextKickoffBanner
            nextKickoff={next?.utcKickoff ?? null}
            inWindow={inWindow}
          />
          <StaleBadge lastSuccessAt={sync.lastSuccessAt} />
        </div>
      </header>

      <Tabs
        defaultActive="table"
        tabs={[
          { id: "rules", label: "Rules" },
          { id: "table", label: "Table" },
          { id: "fixtures", label: "Fixtures" },
          { id: "power", label: "Power Rankings" },
        ]}
        panels={{
          rules: <RulesCard />,
          table: (
            <>
              <Leaderboard
                initialSnapshot={snapshot}
                initialInWindow={inWindow}
              />
              <LiveLegend />
            </>
          ),
          fixtures: (
            <FixturesGrid members={MEMBERS} matches={matches ?? []} />
          ),
          power: <PowerRankings />,
        }}
      />
    </main>
  )
}
