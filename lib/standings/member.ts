import { getMember } from "@/lib/config/members"
import { buildTeamRecord } from "@/lib/scoring/engine"
import type {
  Match,
  PointEvent,
  StandingsRow,
  StandingsSnapshot,
  TeamCode,
  TeamRecord,
} from "@/lib/scoring/types"

export interface UpcomingFixture {
  matchId: string
  utcKickoff: string
  stage: Match["stage"]
  team: TeamCode
  opponent: TeamCode
  homeAway: "home" | "away"
}

export interface MemberDetail {
  memberId: string
  displayName: string
  teams: TeamCode[]
  totalPoints: number
  totalGoalsFor: number
  hasLiveMatch: boolean
  teamRecords: TeamRecord[]
  upcoming: UpcomingFixture[]
  pointLog: PointEvent[]
  positionHistory: { computedAt: string; rank: number }[]
}

export function buildMemberDetail(
  memberId: string,
  matches: Match[],
  history: StandingsSnapshot[]
): MemberDetail | null {
  const member = getMember(memberId)
  if (!member) return null

  const teamRecords = member.teams.map((t) => buildTeamRecord(matches, t))
  const totalPoints = teamRecords.reduce(
    (acc, tr) => acc + tr.events.reduce((s, e) => s + e.points, 0),
    0
  )
  const totalGoalsFor = teamRecords.reduce((acc, tr) => acc + tr.goalsFor, 0)
  const hasLiveMatch = teamRecords.some((tr) =>
    tr.events.some((e) => e.isLive)
  )

  const upcoming: UpcomingFixture[] = []
  for (const m of matches) {
    if (m.status !== "SCHEDULED") continue
    for (const t of member.teams) {
      if (m.home === t) {
        upcoming.push({
          matchId: m.id,
          utcKickoff: m.utcKickoff,
          stage: m.stage,
          team: t,
          opponent: m.away,
          homeAway: "home",
        })
      } else if (m.away === t) {
        upcoming.push({
          matchId: m.id,
          utcKickoff: m.utcKickoff,
          stage: m.stage,
          team: t,
          opponent: m.home,
          homeAway: "away",
        })
      }
    }
  }
  upcoming.sort((a, b) => a.utcKickoff.localeCompare(b.utcKickoff))

  const pointLog = teamRecords
    .flatMap((tr) => tr.events)
    .sort((a, b) => a.utcKickoff.localeCompare(b.utcKickoff))

  const positionHistory: { computedAt: string; rank: number }[] = []
  for (const snap of history) {
    const row = snap.rows.find((r: StandingsRow) => r.memberId === memberId)
    if (row) {
      positionHistory.push({ computedAt: snap.computedAt, rank: row.rank })
    }
  }

  return {
    memberId,
    displayName: member.displayName,
    teams: [...member.teams],
    totalPoints,
    totalGoalsFor,
    hasLiveMatch,
    teamRecords,
    upcoming,
    pointLog,
    positionHistory,
  }
}
