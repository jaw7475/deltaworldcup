import Link from "next/link"
import type { StandingsRow, TeamRecord } from "@/lib/scoring/types"
import { getMember } from "@/lib/config/members"
import { Flag } from "./Flag"
import { LiveDot } from "./LiveDot"
import { NumberTicker } from "./NumberTicker"

interface LeaderboardRowProps {
  row: StandingsRow
}

function rankStyle(rank: number): { color: string; label: string } {
  if (rank === 1) return { color: "neon-text-yellow", label: "1ST" }
  if (rank === 2) return { color: "neon-text-cyan", label: "2ND" }
  if (rank === 3) return { color: "neon-text-magenta", label: "3RD" }
  return { color: "text-white/60", label: `${rank}TH` }
}

function aggregateRecord(records: TeamRecord[]): { w: number; d: number; l: number } {
  return records.reduce(
    (acc, r) => ({ w: acc.w + r.w, d: acc.d + r.d, l: acc.l + r.l }),
    { w: 0, d: 0, l: 0 }
  )
}

interface StatProps {
  label: string
  children: React.ReactNode
}

function Stat({ label, children }: StatProps) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
        {label}
      </span>
      <span className="mt-1 font-display text-lg sm:text-xl tabular-nums text-white/85">
        {children}
      </span>
    </div>
  )
}

export function LeaderboardRow({ row }: LeaderboardRowProps) {
  const member = getMember(row.memberId)
  const { color, label } = rankStyle(row.rank)
  const accent = member?.accentColor ?? "#00f5d4"
  const record = aggregateRecord(row.teamRecords)

  const liveMatchTitle = row.hasLiveMatch
    ? "Includes a live match — points are provisional"
    : undefined

  return (
    <Link
      href={`/members/${row.memberId}`}
      className="group block"
      aria-label={`${member?.displayName ?? row.memberId} detail`}
    >
      <div
        className="flex items-center gap-3 sm:gap-5 rounded-xl bg-bg-row/80 px-4 sm:px-5 py-4 ring-1 ring-white/5 transition hover:bg-bg-row hover:ring-2 hover:-translate-y-px"
        style={{
          boxShadow: `inset 0 0 0 1px ${accent}22, 0 0 24px -10px ${accent}55`,
        }}
      >
        <div className={`font-display text-2xl tracking-widest w-14 sm:w-16 shrink-0 ${color}`}>
          {label}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-display text-base sm:text-lg tracking-wide truncate">
            {member?.displayName ?? row.memberId}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {member?.teams.map((t) => <Flag key={t} team={t} size={24} />)}
          </div>
        </div>

        <div className="flex items-end gap-4 sm:gap-6">
          <Stat label="W-D-L">
            <span className="tabular-nums">
              {record.w}<span className="text-white/30 mx-0.5">-</span>{record.d}<span className="text-white/30 mx-0.5">-</span>{record.l}
            </span>
          </Stat>

          <Stat label="GF">
            <NumberTicker value={row.goalsFor} />
          </Stat>

          <div
            className="flex flex-col items-end leading-none pl-1"
            title={liveMatchTitle}
          >
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
              Pts
            </span>
            <div className="mt-1 flex items-center gap-2">
              {row.hasLiveMatch && <LiveDot />}
              <NumberTicker
                value={row.points}
                className="font-display text-4xl sm:text-5xl tabular-nums tracking-tight neon-text-cyan"
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
