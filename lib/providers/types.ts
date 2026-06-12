import type { Match, TeamCode } from "@/lib/scoring/types"

export interface FootballDataProvider {
  /** Returns all 2026 World Cup matches, mapped into our normalized Match shape. */
  fetchAllMatches(): Promise<Match[]>
  /** Detailed boxscore for a single match (goals + scorers + minutes). */
  fetchMatchDetail(matchId: string): Promise<MatchDetail>
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
