import { getTeam } from "@/lib/config/teams"
import type {
  PointEvent,
  Reason,
  Stage,
  TeamRecord,
} from "@/lib/scoring/types"
import type { MemberDetail as MemberDetailData, UpcomingFixture } from "@/lib/standings/member"
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

function TeamCard({ record }: { record: TeamRecord }) {
  const t = getTeam(record.team)
  return (
    <div className="rounded-lg bg-bg-row p-4 ring-1 ring-white/5 flex items-center gap-3">
      <Flag team={record.team} size={36} />
      <div className="min-w-0 flex-1">
        <div className="font-display tracking-wide truncate">
          {t?.name ?? record.team}
        </div>
        <div className="mt-0.5 text-xs uppercase tracking-widest text-white/50">
          {record.w}W · {record.d}D · {record.l}L · {record.goalsFor} GF
        </div>
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
        <div className="text-xs uppercase tracking-[0.4em] text-white/40 font-display">
          Member
        </div>
        <h2 className="mt-2 font-display text-3xl neon-text-cyan tracking-widest uppercase flex items-center gap-3">
          {detail.displayName}
          {detail.hasLiveMatch && <LiveDot />}
        </h2>
        <div className="mt-2 text-white/60 text-sm">
          {detail.totalPoints} pts · {detail.totalGoalsFor} GF
        </div>
      </header>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Teams
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {detail.teamRecords.map((tr) => (
            <TeamCard key={tr.team} record={tr} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Upcoming
        </h3>
        {detail.upcoming.length === 0 ? (
          <div className="text-sm text-white/50">No more scheduled matches.</div>
        ) : (
          <div className="space-y-2">
            {detail.upcoming.slice(0, 8).map((f) => (
              <FixtureRow key={f.matchId + f.team} fix={f} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Point log
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
