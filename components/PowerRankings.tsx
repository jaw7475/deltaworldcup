import type { PowerRanking, PowerRankingsSnapshot } from "@/lib/powerRankings/types"
import { getMember } from "@/lib/config/members"
import { Flag } from "./Flag"
import { LocalDateTime } from "./LocalDateTime"

function rankStyle(rank: number): { color: string; label: string; accentHex: string } {
  if (rank === 1) return { color: "neon-text-yellow", label: "1ST", accentHex: "#fee440" }
  if (rank === 2) return { color: "neon-text-cyan", label: "2ND", accentHex: "#00f5d4" }
  if (rank === 3) return { color: "neon-text-magenta", label: "3RD", accentHex: "#ff006e" }
  return { color: "text-white/60", label: `${rank}TH`, accentHex: "#ffffff" }
}

function DeltaPill({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-display tracking-widest uppercase ring-1 bg-white/5 text-white/45 ring-white/10">
        <span aria-hidden="true">—</span>
        <span className="sr-only">No change</span>
      </span>
    )
  }
  const up = delta > 0
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-display tracking-widest uppercase ring-1 ${
        up
          ? "bg-neon-green/10 text-neon-green ring-neon-green/30"
          : "bg-neon-magenta/10 text-neon-magenta ring-neon-magenta/30"
      }`}
      title={up ? `Up ${delta} from yesterday` : `Down ${Math.abs(delta)} from yesterday`}
    >
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {Math.abs(delta)}
    </span>
  )
}

function RankingCard({ ranking }: { ranking: PowerRanking }) {
  const member = getMember(ranking.memberId)
  const { color, label, accentHex } = rankStyle(ranking.rank)
  const isPodium = ranking.rank <= 3
  const ringInset = isPodium ? `${accentHex}55` : "rgba(255,255,255,0.08)"
  const ambientGlow = isPodium ? `${accentHex}55` : "rgba(255,255,255,0.05)"

  return (
    <article
      className="rounded-xl bg-bg-row/80 px-4 sm:px-5 py-4 ring-1 ring-white/5"
      style={{
        boxShadow: `inset 0 0 0 1px ${ringInset}, 0 0 24px -10px ${ambientGlow}`,
      }}
    >
      <div className="flex items-start gap-3 sm:gap-5">
        <div className={`font-display text-2xl tracking-widest w-[4.5rem] sm:w-16 shrink-0 ${color}`}>
          {label}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="font-display text-base sm:text-lg tracking-wide leading-tight whitespace-pre-line">
              {(member?.displayName ?? ranking.memberId).replace(" / ", " /\n")}
            </div>
            <DeltaPill delta={ranking.delta} />
          </div>
          <div className="mt-2 flex gap-2.5 sm:gap-3 flex-wrap">
            {member?.teams.map((t) => (
              <div key={t} className="flex flex-col items-center gap-1">
                <Flag team={t} size={22} />
                <span className="font-display text-[10px] tracking-[0.15em] text-white/55">
                  {t}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end leading-none shrink-0 w-16 sm:w-[5.5rem]">
          <span className="font-display text-3xl sm:text-4xl tabular-nums tracking-tight neon-text-cyan">
            {ranking.expectedPoints.toFixed(1)}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
            xPts
          </span>
        </div>
      </div>

      {ranking.blurb && (
        <p className="mt-4 text-sm text-white/80 leading-relaxed">
          {ranking.blurb}
        </p>
      )}

      {ranking.resultsSinceLast && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
            Results since last ranking
          </span>
          <div className="mt-1 text-xs text-white/65 tabular-nums">
            {ranking.resultsSinceLast}
          </div>
        </div>
      )}
    </article>
  )
}

function UpdatedAtLine({ when }: { when: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/45 font-display">
      <span className="inline-block size-1.5 rounded-full bg-neon-cyan shadow-neon-cyan" />
      Updated{" "}
      <LocalDateTime
        utcIso={when}
        options={{
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }}
      />{" "}
      · refreshes daily at 9am ET
    </div>
  )
}

function EmptyState() {
  return (
    <section aria-label="Power Rankings">
      <div className="mb-5">
        <h2 className="font-display text-xl sm:text-2xl uppercase tracking-widest neon-text-magenta">
          Power Rankings
        </h2>
      </div>
      <div className="rounded-xl bg-bg-row/60 px-5 py-8 ring-1 ring-white/5 text-center text-sm text-white/60">
        Power rankings haven&apos;t been generated yet — the daily job will run tomorrow morning.
      </div>
    </section>
  )
}

export function PowerRankings({ snapshot }: { snapshot: PowerRankingsSnapshot | null }) {
  if (!snapshot || snapshot.rankings.length === 0) return <EmptyState />
  const sorted = [...snapshot.rankings].sort((a, b) => a.rank - b.rank)
  return (
    <section aria-label="Power Rankings">
      <div className="mb-5">
        <h2 className="font-display text-xl sm:text-2xl uppercase tracking-widest neon-text-magenta">
          Power Rankings
        </h2>
        <div className="mt-2">
          <UpdatedAtLine when={snapshot.computedAt} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((r) => (
          <RankingCard key={r.memberId} ranking={r} />
        ))}
      </div>
    </section>
  )
}
