export type TeamCode = string

export type GroupLetter =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"

export type Stage =
  | "GROUP"
  | "R32"
  | "R16"
  | "QF"
  | "SF"
  | "THIRD_PLACE"
  | "FINAL"

export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED"

export interface Score {
  home: number
  away: number
}

export interface Match {
  id: string
  stage: Stage
  utcKickoff: string
  status: MatchStatus
  /** Provider-reported clock for LIVE matches (1-based, includes added minutes if reported). */
  minute?: number
  home: TeamCode
  away: TeamCode
  /**
   * Score right now (LIVE) or final score (FINISHED).
   * Excludes shootout goals. For LIVE this is what's on the screen.
   */
  currentScore: Score
  /**
   * Final score at end of ET-if-played-else-90. Only set when status === "FINISHED".
   * Excludes shootout goals. This feeds the GF tiebreaker.
   */
  fullTime?: Score
  /** Shootout score, only set when the match went to penalties. */
  penalties?: Score
  wentToExtraTime: boolean
  wentToPenalties: boolean
  /** Winner once known (FINISHED KO match). Null in group draws or pre-decision. */
  winner: TeamCode | null
}

export type Reason =
  | "GROUP_WIN"
  | "GROUP_DRAW"
  | "GROUP_LOSS"
  | "KO_WIN"
  | "KO_LOSS_REG"
  | "KO_LOSS_ET"
  | "KO_LOSS_PENS"
  | "LIVE_KO_TIED"

export interface PointEvent {
  matchId: string
  team: TeamCode
  stage: Stage
  utcKickoff: string
  points: 0 | 1 | 3
  goalsFor: number
  reason: Reason
  isLive: boolean
}

export interface TeamRecord {
  team: TeamCode
  w: number
  d: number
  l: number
  goalsFor: number
  events: PointEvent[]
}

export interface StandingsRow {
  rank: number
  memberId: string
  points: number
  goalsFor: number
  teamRecords: TeamRecord[]
  hasLiveMatch: boolean
  delta?: { ranks: number }
}

export interface StandingsSnapshot {
  computedAt: string
  rows: StandingsRow[]
}
