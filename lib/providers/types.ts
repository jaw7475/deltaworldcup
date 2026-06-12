import type { Match, TeamCode } from "@/lib/scoring/types"

export interface FootballDataProvider {
  /** Returns all 2026 World Cup matches, mapped into our normalized Match shape. */
  fetchAllMatches(): Promise<Match[]>
  /** Detailed boxscore for a single match (goals + scorers + minutes). */
  fetchMatchDetail(matchId: string): Promise<MatchDetail>
  /**
   * Tournament-wide top scorers, sorted by goals desc. Sourced from
   * /v4/competitions/WC/scorers — football-data maintains this directly,
   * which is the only scorer-level data exposed on the free tier.
   */
  fetchTopScorers(): Promise<ScorerEntry[]>
}

export interface GoalEvent {
  team: TeamCode
  scorer: string
  minute: number
  isOwnGoal: boolean
  isPenalty: boolean
}

export interface MatchDetail {
  matchId: string
  goals: GoalEvent[]
}

export interface ScorerEntry {
  name: string
  team: TeamCode
  goals: number
  assists: number | null
  penalties: number | null
  playedMatches: number
}
