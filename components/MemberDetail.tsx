import { getTeam } from "@/lib/config/teams"
import type {
  Stage,
  TeamRecord,
} from "@/lib/scoring/types"
import type { MemberDetail as MemberDetailData, UpcomingFixture } from "@/lib/standings/member"
import { getMember } from "@/lib/config/members"
import {
  getPlayersForTeam,
  PLAYER_TIER_ORDER,
  type PlayerTier,
  type PlayerToWatch,
} from "@/lib/config/playersToWatch"
import { Flag } from "./Flag"
import { LiveDot } from "./LiveDot"
import { LocalDateTime } from "./LocalDateTime"
import { PositionHistoryChart } from "./PositionHistoryChart"
import { CompletedList } from "./CompletedList"

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

function NextMatchLine({ fix }: { fix: UpcomingFixture }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-display shrink-0">
        Next
      </span>
      <span className="text-xs uppercase tracking-widest text-white/40">vs</span>
      <Flag team={fix.opponent} size={20} />
      <span className="text-xs font-display tracking-wide text-white/75">
        {fix.opponent}
      </span>
      <div className="ml-auto text-right">
        <div className="text-[10px] uppercase tracking-widest text-neon-cyan">
          {STAGE_LABEL[fix.stage]}
        </div>
        <div className="text-xs text-white/60">
          <LocalDateTime
            utcIso={fix.utcKickoff}
            options={{
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }}
          />
        </div>
      </div>
    </div>
  )
}

interface TeamWithPlayersCardProps {
  record: TeamRecord
  nextMatch?: UpcomingFixture
}

function TeamWithPlayersCard({ record, nextMatch }: TeamWithPlayersCardProps) {
  const t = getTeam(record.team)
  const players = getPlayersForTeam(record.team)
  return (
    <div className="rounded-lg bg-bg-row/80 p-4 ring-1 ring-white/5 flex flex-col h-full">
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
      <div className="mt-3 pt-3 border-t border-white/10 flex-1">
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
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="min-h-[36px] flex items-center">
          {nextMatch ? (
            <div className="w-full">
              <NextMatchLine fix={nextMatch} />
            </div>
          ) : (
            <span className="text-xs text-white/40">
              No more scheduled matches.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function MemberDetailView({ detail }: MemberDetailProps) {
  // `upcoming` is sorted ascending by kickoff, so the first occurrence per
  // team is the next match for that country.
  const nextByTeam = new Map<string, UpcomingFixture>()
  for (const f of detail.upcoming) {
    if (!nextByTeam.has(f.team)) nextByTeam.set(f.team, f)
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-3xl neon-text-cyan tracking-widest uppercase flex items-center gap-3">
          {detail.displayName}
          {detail.hasLiveMatch && <LiveDot />}
        </h2>
        <div className="mt-3 flex items-center gap-4 sm:gap-5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-xl sm:text-2xl tabular-nums text-white leading-none">
              {detail.totalPoints}
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-display">
              pts
            </span>
          </div>
          <span className="h-5 w-px bg-white/15" aria-hidden />
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-xl sm:text-2xl tabular-nums text-white leading-none">
              {detail.totalGoalsFor}
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-display">
              GF
            </span>
          </div>
        </div>
      </header>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Teams + Players to Watch
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {detail.teamRecords.map((tr) => (
            <TeamWithPlayersCard
              key={tr.team}
              record={tr}
              nextMatch={nextByTeam.get(tr.team)}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Completed
        </h3>
        <CompletedList events={detail.pointLog} />
      </section>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Top scorers
        </h3>
        {(() => {
          const scorers = strawmanTopScorers(detail.memberId)
          if (scorers.length === 0) {
            return <div className="text-sm text-white/50">No goals yet.</div>
          }
          return (
            <div className="space-y-2">
              {scorers.map((s) => (
                <ScorerRow key={`${s.team}-${s.name}`} scorer={s} />
              ))}
            </div>
          )
        })()}
      </section>

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40 font-display">
          Position history
        </h3>
        <PositionHistoryChart
          history={
            detail.positionHistory.length > 0
              ? detail.positionHistory
              : strawmanPositionHistory(detail.memberId, 6)
          }
        />
      </section>
    </div>
  )
}

interface StrawmanScorer {
  name: string
  team: string
  position: PlayerToWatch["position"]
  tier: PlayerTier
  goals: number
}

function ScorerRow({ scorer }: { scorer: StrawmanScorer }) {
  const t = getTeam(scorer.team)
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bg-row/60 px-3 py-2 ring-1 ring-white/5">
      <Flag team={scorer.team} size={22} />
      <div className="min-w-0">
        <div className="text-sm text-white/85 truncate">{scorer.name}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
          {t?.name ?? scorer.team} · {scorer.position}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <span className="font-display text-lg tabular-nums text-white/85">
          {scorer.goals}
        </span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-display">
          G
        </span>
      </div>
    </div>
  )
}

// Strawman top-scorers — until the Match model carries goalscorer data, we
// fake it from the players-to-watch list. Pick up to 4 high-tier attacking
// players across the member's roster and assign deterministic goal counts.
// Replace with real aggregation over Match.goals once that lands.
function strawmanTopScorers(memberId: string): StrawmanScorer[] {
  const member = getMember(memberId)
  if (!member) return []

  const TIER_RANK: Record<PlayerTier, number> = PLAYER_TIER_ORDER.reduce(
    (acc, t, i) => {
      acc[t] = i
      return acc
    },
    {} as Record<PlayerTier, number>
  )

  // Attacking-leaning candidates from the full roster, ordered by tier.
  const candidates: PlayerToWatch[] = []
  for (const team of member.teams) {
    for (const p of getPlayersForTeam(team)) {
      if (p.position === "FW" || p.position === "MF") candidates.push(p)
    }
  }
  candidates.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier])

  const rng = mulberry32(hashString(`scorers:${memberId}`))
  const out: StrawmanScorer[] = []
  for (const p of candidates) {
    if (out.length >= 4) break
    // Higher tier → higher probability they've already scored + more goals.
    const tierRank = TIER_RANK[p.tier]
    const scoreProb = [0.9, 0.75, 0.5, 0.3, 0.15][tierRank] ?? 0.1
    if (rng() > scoreProb) continue
    const maxGoals = [3, 3, 2, 2, 1][tierRank] ?? 1
    const goals = 1 + Math.floor(rng() * maxGoals)
    out.push({
      name: p.name,
      team: p.team,
      position: p.position,
      tier: p.tier,
      goals,
    })
  }
  return out.sort((a, b) => b.goals - a.goals)
}

// Strawman position history — used while the tournament hasn't generated
// any real `standings:history` snapshots yet. Produces a deterministic 8-day
// series ending at the member's current standings rank, with small jitter.
function strawmanPositionHistory(memberId: string, endRank: number) {
  const rng = mulberry32(hashString(memberId))
  const days = 8
  const ranks: number[] = [endRank]
  for (let i = 1; i < days; i++) {
    const last = ranks[ranks.length - 1]
    const jitter = Math.round((rng() - 0.5) * 4) // ±2 per step
    const next = Math.max(1, Math.min(12, last + jitter))
    ranks.push(next)
  }
  ranks.reverse() // oldest → newest
  const endMs = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  return ranks.map((rank, i) => ({
    computedAt: new Date(endMs - (days - 1 - i) * dayMs).toISOString(),
    rank,
  }))
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
