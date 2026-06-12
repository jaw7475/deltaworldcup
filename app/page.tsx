import { readCurrentStandings, readMatches, readSyncStatus } from "@/lib/standings/snapshot"
import { readCurrentPowerRankings } from "@/lib/powerRankings/store"
import {
  inWindowFromMatches,
  isInWindow,
  nextKickoff,
  nextKickoffFromMatches,
} from "@/lib/windows/windows"
import { SCHEDULE } from "@/lib/config/schedule"
import { MEMBERS } from "@/lib/config/members"
import { loadDraftBoardData } from "@/lib/draft/load"
import { Leaderboard } from "@/components/Leaderboard"
import { NextKickoffBanner } from "@/components/NextKickoffBanner"
import { StaleBadge } from "@/components/StaleBadge"
import { RulesCard } from "@/components/RulesCard"
import { Tabs } from "@/components/Tabs"
import { LiveLegend } from "@/components/LiveLegend"
import { FixturesGrid } from "@/components/FixturesGrid"
import { PowerRankings } from "@/components/PowerRankings"
import { DraftBoard } from "@/components/DraftBoard"

export const dynamic = "force-dynamic"

export default async function Home() {
  const now = new Date()
  const [snapshot, sync, matches, draftBoardData, powerRankings] = await Promise.all([
    readCurrentStandings(),
    readSyncStatus(),
    readMatches(),
    loadDraftBoardData(),
    readCurrentPowerRankings(),
  ])
  // Prefer real match data; fall back to SCHEDULE stub if KV hasn't synced yet.
  const hasMatches = !!matches && matches.length > 0
  const inWindow = hasMatches
    ? inWindowFromMatches(now, matches!)
    : isInWindow(now, SCHEDULE)
  const next = hasMatches
    ? nextKickoffFromMatches(now, matches!)
    : nextKickoff(now, SCHEDULE)

  return (
    <main className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <header className="mb-6 sm:mb-8">
        <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white/40 font-display">
          2026 Delta Fantasy Football League
        </div>
        <h1 className="mt-3 font-display text-3xl sm:text-5xl md:text-6xl neon-text-cyan tracking-wider sm:tracking-widest uppercase">
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
          { id: "draft", label: "Draft Board" },
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
          draft: <DraftBoard initialData={draftBoardData} />,
          power: <PowerRankings snapshot={powerRankings} />,
        }}
      />
    </main>
  )
}
