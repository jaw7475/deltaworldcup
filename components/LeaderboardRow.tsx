import Link from "next/link"
import type { StandingsRow } from "@/lib/scoring/types"
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

export function LeaderboardRow({ row }: LeaderboardRowProps) {
  const member = getMember(row.memberId)
  const { color, label } = rankStyle(row.rank)
  const accent = member?.accentColor ?? "#00f5d4"

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
        className="flex items-center gap-4 rounded-xl bg-bg-row/80 px-5 py-4 ring-1 ring-white/5 transition hover:bg-bg-row hover:ring-2 hover:-translate-y-px"
        style={{
          boxShadow: `inset 0 0 0 1px ${accent}22, 0 0 24px -10px ${accent}55`,
        }}
      >
        <div className={`font-display text-2xl tracking-widest w-16 ${color}`}>
          {label}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-display text-lg tracking-wide truncate">
            {member?.displayName ?? row.memberId}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {member?.teams.map((t) => <Flag key={t} team={t} size={26} />)}
          </div>
        </div>

        <div className="text-right">
          <div
            className="flex items-baseline justify-end gap-2 font-display"
            title={liveMatchTitle}
          >
            {row.hasLiveMatch && <LiveDot />}
            <NumberTicker
              value={row.points}
              className="text-3xl tracking-tight neon-text-cyan"
            />
            <span className="text-xs uppercase tracking-widest text-white/50">
              pts
            </span>
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-white/50">
            <NumberTicker value={row.goalsFor} className="text-white/80" /> GF
          </div>
        </div>
      </div>
    </Link>
  )
}
