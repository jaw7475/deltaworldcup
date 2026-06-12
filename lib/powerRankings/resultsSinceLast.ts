import type { Match, TeamCode } from "@/lib/scoring/types"
import { MEMBERS } from "@/lib/config/members"

export interface MemberResultsSinceLast {
  memberId: string
  /** Pre-formatted string for the UI, e.g. "FRA 3-1 CRO (W, +3, +3 GF)". */
  formatted: string
  /** Structured rows for the blurb prompt. */
  rows: ResultRow[]
}

export interface ResultRow {
  team: TeamCode
  opponent: TeamCode
  teamScore: number
  oppScore: number
  outcome: "W" | "D" | "L"
  points: 0 | 1 | 3
  goalsFor: number
  utcKickoff: string
  stage: string
  wentToExtraTime: boolean
  wentToPenalties: boolean
}

function classifyResult(
  match: Match,
  team: TeamCode
): { outcome: "W" | "D" | "L"; points: 0 | 1 | 3 } {
  if (match.stage === "GROUP") {
    if (match.winner === null) return { outcome: "D", points: 1 }
    if (match.winner === team) return { outcome: "W", points: 3 }
    return { outcome: "L", points: 0 }
  }
  // KO: any win = 3; ET/pens loss = 1; regulation loss = 0.
  if (match.winner === team) return { outcome: "W", points: 3 }
  if (match.wentToExtraTime || match.wentToPenalties) return { outcome: "L", points: 1 }
  return { outcome: "L", points: 0 }
}

function formatRow(row: ResultRow): string {
  // "FRA 3-1 CRO (W, +3, +3 GF)"
  // For draws use "ENG drew SEN 1-1 (D, +1)" style for variety
  const gf = row.goalsFor > 0 ? `, +${row.goalsFor} GF` : ""
  if (row.outcome === "D") {
    return `${row.team} drew ${row.opponent} ${row.teamScore}-${row.oppScore} (D, +1${gf})`
  }
  return `${row.team} ${row.teamScore}-${row.oppScore} ${row.opponent} (${row.outcome}, +${row.points}${gf})`
}

export function buildResultsSinceLast(args: {
  matches: Match[]
  /** Cutoff ISO timestamp — only matches that finished after this are included. */
  since: string | null
}): MemberResultsSinceLast[] {
  const sinceMs = args.since ? new Date(args.since).getTime() : 0
  const out: MemberResultsSinceLast[] = []

  for (const member of MEMBERS) {
    const rows: ResultRow[] = []
    for (const match of args.matches) {
      if (match.status !== "FINISHED") continue
      // Approximate finish time as kickoff + 2h to catch matches that kicked
      // off shortly before the previous run but finished after.
      const finishedMs = new Date(match.utcKickoff).getTime() + 2 * 60 * 60 * 1000
      if (sinceMs > 0 && finishedMs <= sinceMs) continue
      const team = member.teams.find((t) => t === match.home || t === match.away)
      if (!team) continue
      const opponent = team === match.home ? match.away : match.home
      const ft = match.fullTime ?? match.currentScore
      const teamScore = team === match.home ? ft.home : ft.away
      const oppScore = team === match.home ? ft.away : ft.home
      const { outcome, points } = classifyResult(match, team)
      rows.push({
        team,
        opponent,
        teamScore,
        oppScore,
        outcome,
        points,
        goalsFor: teamScore,
        utcKickoff: match.utcKickoff,
        stage: match.stage,
        wentToExtraTime: match.wentToExtraTime,
        wentToPenalties: match.wentToPenalties,
      })
    }
    rows.sort((a, b) => a.utcKickoff.localeCompare(b.utcKickoff))
    const formatted = rows.map(formatRow).join(" · ")
    out.push({ memberId: member.id, formatted, rows })
  }

  return out
}
