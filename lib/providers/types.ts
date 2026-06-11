import type { Match } from "@/lib/scoring/types"

export interface FootballDataProvider {
  /** Returns all 2026 World Cup matches, mapped into our normalized Match shape. */
  fetchAllMatches(): Promise<Match[]>
}
