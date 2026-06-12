import { getTeam } from "@/lib/config/teams"
import type {
  PointEvent,
  Reason,
  Stage,
  TeamRecord,
} from "@/lib/scoring/types"
import type { MemberDetail as MemberDetailData, UpcomingFixture } from "@/lib/standings/member"
import {
  getPlayersForTeam,
  type PlayerTier,
  type PlayerToWatch,
} from "@/lib/config/playersToWatch"
import { Flag } from "./Flag"
import { LiveDot } from "./LiveDot"
import { PositionHistoryChart } from "./PositionHistoryChart"

interface MemberDetailProps {
  detail: MemberDetailData
}

const STAGE_LABEL: Record<Stage, string> = {
  GROUP: "Group",
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  THIRD_PLACE: "3rd",
  FINAL: "Final",
}

const REASON_LABEL: Record<Reason, string> = {
  GROUP_WIN: "Group win",
  GROUP_DRAW: "Group draw",
  GROUP_LOSS: "Group loss",
  KO_WIN: "Knockout win",
  KO_LOSS_REG: "Lost in regulation",
  KO_LOSS_ET: "Lost in extra time",
  KO_LOSS_PENS: "Lost on penalties",
  LIVE_KO_TIED: "Tied — outcome pending",
}

function PointsBadge({ event }: { event: PointEvent }) {
  const tone =
    event.points === 3
      ? "bg-neon-green/15 text-neon-green ring-neon-green/30"
      : event.points === 1
        ? "bg-neon-yellow/15 text-neon-yellow ring-neon-yellow/30"
        : "bg-white/5 text-white/50 ring-white/15"
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-display tracking-wider ring-1 ${tone}`}
    >
      {event.points} pt{event.points === 1 ? "" : "s"}
    </span>
  )
}

const TIER_LABEL: Record<PlayerTier, string> = {
  Legends: "Legend",
  Superstars: "Star",
  "Key Players": "Key",
  "Rising Stars": "Rising",
  "Unsung Heroes": "Unsung",
}

const TIER_TONE: Record<PlayerTier, string> = {
  Legends: "bg-neon-magenta/15 text-neon-magenta ring-neon-magenta/40",
  Superstars: "bg-neon-cyan/15 text-neon-cyan ring-neon-cyan/40",
  "Key Players": "bg-neon-yellow/10 text-neon-yellow ring-neon-yellow/30",
  "Rising Stars": "bg-neon-green/10 text-neon-green ring-neon-green/30",
  "Unsung Heroes": "bg-white/5 text-white/60 ring-white/15",
}

function PlayerRow({ player }: { player: PlayerToWatch }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span
        className={`shrink-0 inline-flex items-center justify-center rounded-full px-2 py-0.5 font-display tracking-widest uppercase text-[10px] ring-1 ${TIER_TONE[player.tier]}`}
      >
        {TIER_LABEL[player.tier]}
      </span>
      <span className="text-sm text-white/85 truncate">{player.name}</span>
      <span className="ml-auto text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
        {player.position}
      </span>
    </div>
  )
}

function TeamWithPlayersCard({ record }: { record: TeamRecord }) {
  const t = getTeam(record.team)
  const players = getPlayersForTeam(record.team)
  return (
    <div className="rounded-lg bg-bg-row/80 p-4 ring-1 ring-white/5">
      <div className="flex items-center gap-3">
        <Flag team={record.team} size={32} />
        <div className="min-w-0 flex-1">
          <div className="font-display tracking-wide truncate">
            {t?.name ?? record.team}
          </div>
          <div className="mt-0.5 text-xs uppercase tracking-widest text-white/50">
            {record.w}W · {record.d}D · {record.l}L · {record.goalsFor} GF
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/10">
        {players.length === 0 ? (
          <div className="text-xs text-white/40">No featured players yet.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {players.map((p) => (
              <PlayerRow key={`${p.team}-${p.name}`} player={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FixtureRow({ fix }: { fix: UpcomingFixture }) {
  const when = new Date(fix.utcKickoff).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bg-row/60 px-3 py-2 ring-1 ring-white/5">
      <Flag team={fix.team} size={22} />
      <span className="text-xs uppercase tracking-widest text-white/40">vs</span>
      <Flag team={fix.opponent} size={22} />
      <div className="ml-auto text-right">
        <div className="text-xs uppercase tracking-widest text-neon-cyan">
          {STAGE_LABEL[fix.stage]}
        </div>
        <div className="text-xs text-white/60">{when}</div>
      </div>
    </div>
  )
}

function PointLogRow({ event }: { event: PointEvent }) {
  const when = new Date(event.utcKickoff).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bg-row/60 px-3 py-2 ring-1 ring-white/5">
      <Flag team={event.team} size={22} />
      <div className="min-w-0">
        <div className="text-sm flex items-center gap-2">
          <span className="font-display tracking-wide">{REASON_LABEL[event.reason]}</span>
          {event.isLive && <LiveDot title="Live — provisional" />}
        </div>
        <div className="mt-0.5 text-xs uppercase tracking-widest text-white/40">
          {STAGE_LABEL[event.stage]} · {when} · {event.goalsFor} GF
        </div>
      </div>
      <div className="ml-auto">
        <PointsBadge event={event} />
      </div>
    </div>
  )
}

export function MemberDetailView({ detail }: MemberDetailProps) {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-3xl neon-text-cyan tracking-widest uppercase flex items-center gap-3">
          {detail.displayName}
          {detail.hasLiveMatch && <LiveDot />}
        </h2>
        <div className="mt-2 text-white/60 text-sm">
          {detail.totalPoints} pts · {detail.totalGoalsFor} GF
        </div>
      </header>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Teams + Players to Watch
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {detail.teamRecords.map((tr) => (
            <TeamWithPlayersCard key={tr.team} record={tr} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Upcoming
        </h3>
        {(() => {
          // Just the next scheduled match per team — `upcoming` is sorted by
          // kickoff, so the first occurrence of each team code wins.
          const seenTeams = new Set<string>()
          const nextPerTeam = detail.upcoming.filter((f) => {
            if (seenTeams.has(f.team)) return false
            seenTeams.add(f.team)
            return true
          })
          if (nextPerTeam.length === 0) {
            return <div className="text-sm text-white/50">No more scheduled matches.</div>
          }
          return (
            <div className="space-y-2">
              {nextPerTeam.map((f) => (
                <FixtureRow key={f.matchId + f.team} fix={f} />
              ))}
            </div>
          )
        })()}
      </section>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Completed
        </h3>
        {detail.pointLog.length === 0 ? (
          <div className="text-sm text-white/50">No matches played yet.</div>
        ) : (
          <div className="space-y-2">
            {detail.pointLog.map((e, i) => (
              <PointLogRow key={`${e.matchId}-${e.team}-${i}`} event={e} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Position history
        </h3>
        <PositionHistoryChart history={detail.positionHistory} />
      </section>
    </div>
  )
}
