import Link from "next/link"
import type { StandingsRow, TeamCode, TeamRecord } from "@/lib/scoring/types"
import type { TeamStatus } from "@/lib/standings/teamStatus"
import { getMember } from "@/lib/config/members"
import { Flag } from "./Flag"
import { LiveDot } from "./LiveDot"
import { NumberTicker } from "./NumberTicker"

interface LeaderboardRowProps {
  row: StandingsRow
  statusByTeam: Map<TeamCode, TeamStatus>
}

function rankStyle(rank: number): {
  color: string
  label: string
  accentHex: string
} {
  if (rank === 1)
    return { color: "neon-text-yellow", label: "1ST", accentHex: "#fee440" }
  if (rank === 2)
    return { color: "neon-text-cyan", label: "2ND", accentHex: "#00f5d4" }
  if (rank === 3)
    return { color: "neon-text-magenta", label: "3RD", accentHex: "#ff006e" }
  return {
    color: "text-white/60",
    label: `${rank}TH`,
    accentHex: "#ffffff",
  }
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
  widthClass?: string
}

function Stat({ label, children, widthClass }: StatProps) {
  return (
    <div
      className={`flex flex-col items-end leading-tight shrink-0 ${widthClass ?? ""}`}
    >
      <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
        {label}
      </span>
      <span className="mt-1 font-display text-lg sm:text-xl tabular-nums text-white/85">
        {children}
      </span>
    </div>
  )
}

export function LeaderboardRow({ row, statusByTeam }: LeaderboardRowProps) {
  const member = getMember(row.memberId)
  const { color, label, accentHex } = rankStyle(row.rank)
  const isPodium = row.rank <= 3
  // Podium positions get a colored neon border matching their rank label.
  // Everyone else gets a subtle neutral ring so the table reads as one set.
  const ringInset = isPodium ? `${accentHex}55` : "rgba(255,255,255,0.08)"
  const ambientGlow = isPodium ? `${accentHex}55` : "rgba(255,255,255,0.05)"
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
        className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-3 sm:gap-5 rounded-xl bg-bg-row/80 px-4 sm:px-5 py-4 ring-1 ring-white/5 transition hover:bg-bg-row hover:ring-2 hover:-translate-y-px"
        style={{
          boxShadow: `inset 0 0 0 1px ${ringInset}, 0 0 24px -10px ${ambientGlow}`,
        }}
      >
        <div className={`font-display text-2xl tracking-widest w-[4.5rem] sm:w-16 shrink-0 ${color}`}>
          {label}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-display text-base sm:text-lg tracking-wide truncate">
            {member?.displayName ?? row.memberId}
          </div>
          <div className="mt-2 flex gap-2.5 sm:gap-3">
            {member?.teams.map((t) => {
              const status = statusByTeam.get(t) ?? "active"
              const isAlive = status === "alive"
              const isEliminated = status === "eliminated"
              const flagWrapperClass = isAlive
                ? "rounded-sm ring-1 ring-neon-green/70 shadow-[0_0_8px_-2px_rgba(155,255,102,0.6)]"
                : isEliminated
                  ? "opacity-40 grayscale"
                  : ""
              const codeClass = isEliminated
                ? "text-white/30 line-through"
                : isAlive
                  ? "text-neon-green/80"
                  : "text-white/55"
              return (
                <div key={t} className="flex flex-col items-center gap-1">
                  <span className={`inline-flex ${flagWrapperClass}`}>
                    <Flag team={t} size={22} />
                  </span>
                  <span
                    className={`font-display text-[10px] tracking-[0.15em] ${codeClass}`}
                  >
                    {t}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="basis-full sm:basis-auto flex items-end justify-end gap-4 sm:gap-6 shrink-0">
          <Stat label="W-D-L" widthClass="w-[4.25rem]">
            <span className="tabular-nums">
              {record.w}<span className="text-white/30 mx-0.5">-</span>{record.d}<span className="text-white/30 mx-0.5">-</span>{record.l}
            </span>
          </Stat>

          <Stat label="GF" widthClass="w-[2.25rem]">
            <NumberTicker value={row.goalsFor} />
          </Stat>

          <div
            className="flex flex-col items-end leading-none pl-1 shrink-0 w-[4.5rem] sm:w-[5rem]"
            title={liveMatchTitle}
          >
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
              Pts
            </span>
            <div className="mt-1 flex items-center gap-2 justify-end w-full">
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
